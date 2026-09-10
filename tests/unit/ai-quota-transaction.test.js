// THE RACE IN THE AI QUOTA, and the proof it is closed.
//
// Filed as [ai-quota-check-not-transactional] on the 2026-09-06 engineering
// review. api/ai.js read the usage counter with a plain `get()`, compared it to
// the limit, called the provider, and only then incremented. Between the read
// and the increment sits a whole provider round trip — seconds — and every
// request that starts inside that window reads the same count. At
// `used === limit - 1`, N concurrent requests all read `limit - 1`, all pass the
// comparison, and all run.
//
// WHY IT IS WORSE THAN A PER-USER OVERSHOOT. api/_lib/plans.js derives every
// limit downward from ONE shared free-tier provider bucket. An account that
// overshoots is not spending its own allowance, it is spending everybody's. And
// the free Brand Starter allowance is ONE, so any concurrency at all doubled it.
//
// ─────────────────────────────────────────────────────────────────────────────
// HOW THIS TEST IS ABLE TO FAIL
// ─────────────────────────────────────────────────────────────────────────────
//
// A test that fires two requests at a fake store and finds one refused proves
// nothing on its own — a store that refuses everything looks identical. So this
// file carries three controls, and they are the point of it:
//
//   1. THE HARNESS CAN SEE THE BUG. The first test runs the OLD shape
//      (read → wait → compare → increment) against the same fake store and the
//      same interleaving, and asserts that BOTH callers pass and the bucket ends
//      up OVER its limit. If that test ever goes green-by-refusal, the harness
//      has stopped modelling the race and every other test here is worthless.
//   2. THE HARNESS CAN SAY YES. Two concurrent reservations against a limit of
//      two both succeed. Without this, "exactly one succeeded" is unfalsifiable.
//   3. THE WIRING. api/ai.js has to actually call the thing. Reverting one call
//      site is exactly the mutation this repo has already paid for once.
//
// The fake store models a Firestore transaction the way Firestore actually
// behaves: reads are versioned, a commit whose read set changed underneath is
// REJECTED, and the callback is retried against the new values. That is the
// single property the fix depends on.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  reserveQuotaUnit,
  refundQuotaUnit,
  runMeteredTask,
} from '../../api/_lib/aiGeneration.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'

// ─────────────────────────────────────────────────────────────────────────────
// The fake store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Releases every waiter once `parties` of them have arrived, and stays released
 * for good — a transaction that RETRIES must not block on a barrier that has
 * already been satisfied, or the retry (which is the whole mechanism) deadlocks.
 */
function barrier(parties) {
  let arrived = 0
  let release
  const gate = new Promise((r) => { release = r })
  return {
    async arrive() {
      arrived += 1
      if (arrived >= parties) release()
      return gate
    },
  }
}

function makeStore() {
  // path → { data, version }. The VERSION is what makes this a transaction test
  // rather than a map test: it is the thing Firestore checks at commit.
  const docs = new Map()
  let beforeCommit = async () => {}
  let attempts = 0

  const snapshot = (p) => {
    const rec = docs.get(p)
    const data = rec ? { ...rec.data } : undefined
    return { exists: !!rec, data: () => data }
  }

  const write = (p, patch, merge) => {
    const cur = docs.get(p)
    const base = merge && cur ? cur.data : {}
    docs.set(p, { data: { ...base, ...patch }, version: (cur ? cur.version : 0) + 1 })
  }

  const db = {
    doc(p) {
      return {
        path: p,
        async get() { return snapshot(p) },
        async set(patch, opts) { write(p, patch, !!opts?.merge) },
        // The old code incremented with FieldValue.increment — atomic, but
        // unconditional, which is precisely why it could not hold a cap.
        async increment(field, n) {
          const cur = docs.get(p)
          write(p, { [field]: ((cur?.data?.[field]) || 0) + n }, true)
        },
      }
    },
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        attempts += 1
        const reads = new Map()
        const writes = []
        const tx = {
          async get(ref) {
            if (writes.length) throw new Error('Firestore transactions cannot read after a write')
            const rec = docs.get(ref.path)
            reads.set(ref.path, rec ? rec.version : 0)
            return snapshot(ref.path)
          },
          set(ref, patch, opts) { writes.push({ p: ref.path, patch, merge: !!opts?.merge }) },
        }
        const out = await fn(tx)
        await beforeCommit(attempt)
        let stale = false
        for (const [p, version] of reads) {
          const cur = docs.get(p)
          if ((cur ? cur.version : 0) !== version) { stale = true; break }
        }
        if (stale) continue
        for (const w of writes) write(w.p, w.patch, w.merge)
        return out
      }
      throw new Error('transaction: too many retries')
    },
  }

  return {
    db,
    count: (p, field) => docs.get(p)?.data?.[field] || 0,
    seed: (p, data) => write(p, data, true),
    onBeforeCommit: (fn) => { beforeCommit = fn },
    attempts: () => attempts,
  }
}

const BUCKET = 'daily-usage/alice_life'
const TOOL = 'brand-starter'
const meter = (db, limit, period = 'lifetime') =>
  [{ ref: db.doc(BUCKET), field: TOOL, limit, period }]

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL 1 — the harness can see the bug
// ─────────────────────────────────────────────────────────────────────────────

test('CONTROL: the OLD non-transactional shape lets both callers through and overshoots', async () => {
  // This is api/ai.js as it was, transcribed: plain get, compare, provider call,
  // FieldValue.increment. If this test ever reports one refusal, the fake store
  // has stopped reproducing the race and nothing else in this file means
  // anything.
  const store = makeStore()
  const gate = barrier(2)
  const ref = store.db.doc(BUCKET)

  async function legacyRequest() {
    const used = (await ref.get()).data()?.[TOOL] || 0
    await gate.arrive() // stands in for the provider round trip
    if (used >= 1) return { ok: false, used }
    await ref.increment(TOOL, 1)
    return { ok: true, used }
  }

  const outcomes = await Promise.all([legacyRequest(), legacyRequest()])
  assert.equal(outcomes.filter((o) => o.ok).length, 2,
    'the old shape must let BOTH through — if it does not, this harness cannot detect the defect')
  assert.equal(store.count(BUCKET, TOOL), 2,
    'a limit of 1 must end up at 2 — that overshoot is the bug being fixed')
})

// ─────────────────────────────────────────────────────────────────────────────
// THE FIX — two requests, one bucket
// ─────────────────────────────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: two concurrent requests against a bucket of 1 — exactly one passes', async () => {
  const store = makeStore()
  const gate = barrier(2)
  // Both transactions complete their READS before either is allowed to commit.
  // That is the interleaving the defect needs; anything less proves nothing.
  store.onBeforeCommit(async (attempt) => { if (attempt === 0) await gate.arrive() })

  const meters = meter(store.db, 1)
  const [a, b] = await Promise.all([
    reserveQuotaUnit(store.db, meters),
    reserveQuotaUnit(store.db, meters),
  ])

  const passed = [a, b].filter((r) => r.ok)
  const refused = [a, b].filter((r) => !r.ok)
  assert.equal(passed.length, 1, 'exactly one of two concurrent requests may reserve the single unit')
  assert.equal(refused.length, 1)
  assert.equal(refused[0].blocked.period, 'lifetime', 'the refusal must name the bucket that refused it')
  assert.equal(store.count(BUCKET, TOOL), 1, 'the bucket must never exceed its limit')
  assert.ok(store.attempts() >= 3, 'the loser must have RETRIED and re-read — otherwise it was never serialised')
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL 2 — the harness can say yes
// ─────────────────────────────────────────────────────────────────────────────

test('CONTROL: two concurrent requests against a bucket of 2 BOTH pass', async () => {
  const store = makeStore()
  const gate = barrier(2)
  store.onBeforeCommit(async (attempt) => { if (attempt === 0) await gate.arrive() })

  const meters = meter(store.db, 2)
  const [a, b] = await Promise.all([
    reserveQuotaUnit(store.db, meters),
    reserveQuotaUnit(store.db, meters),
  ])
  assert.ok(a.ok && b.ok, 'a limit of 2 must admit two callers — otherwise "exactly one" above is just refusal')
  assert.equal(store.count(BUCKET, TOOL), 2)
  assert.notEqual(a.counts[0], b.counts[0], 'the two callers must be told DIFFERENT prior counts (0 and 1)')
})

test('the reported count is the one BEFORE the reservation, so `used + 1` in the payloads stays true', async () => {
  const store = makeStore()
  store.seed(BUCKET, { [TOOL]: 3 })
  const r = await reserveQuotaUnit(store.db, meter(store.db, 10))
  assert.equal(r.counts[0], 3)
  assert.equal(store.count(BUCKET, TOOL), 4)
})

test('a full bucket refuses and writes nothing at all', async () => {
  const store = makeStore()
  store.seed(BUCKET, { [TOOL]: 1 })
  const r = await reserveQuotaUnit(store.db, meter(store.db, 1))
  assert.equal(r.ok, false)
  assert.equal(r.counts[0], 1)
  assert.equal(store.count(BUCKET, TOOL), 1, 'a refusal must not touch the counter')
})

// ─────────────────────────────────────────────────────────────────────────────
// Two ceilings, one transaction
// ─────────────────────────────────────────────────────────────────────────────

const MONTH = 'daily-usage/alice_m2026-09'
const DAY = 'daily-usage/alice_2026-09-07'
const both = (db, monthLimit, dayLimit) => [
  { ref: db.doc(MONTH), field: TOOL, limit: monthLimit, period: 'month' },
  { ref: db.doc(DAY), field: TOOL, limit: dayLimit, period: 'day' },
]

test('the monthly ceiling is reported first, and a refusal leaves the DAILY bucket untouched', async () => {
  // A partial reservation would fill the monthly ceiling from requests nobody
  // ran — the same silent wrongness, pointing the other way.
  const store = makeStore()
  store.seed(MONTH, { [TOOL]: 40 })
  const r = await runMeteredTask({
    db: store.db,
    meters: both(store.db, 40, 5),
    run: async () => { throw new Error('the runner must not be reached when the meter refuses') },
  })
  assert.equal(r.ok, false)
  assert.equal(r.blocked.period, 'month')
  assert.equal(store.count(MONTH, TOOL), 40)
  assert.equal(store.count(DAY, TOOL), 0, 'the daily bucket must not move when the monthly one refused')
})

test('the daily ceiling refuses on its own, and leaves the MONTHLY bucket untouched', async () => {
  const store = makeStore()
  store.seed(DAY, { [TOOL]: 5 })
  const r = await reserveQuotaUnit(store.db, both(store.db, 40, 5))
  assert.equal(r.ok, false)
  assert.equal(r.blocked.period, 'day')
  assert.equal(store.count(MONTH, TOOL), 0)
})

test('a successful call moves BOTH buckets, or the monthly ceiling is decorative', async () => {
  const store = makeStore()
  const r = await reserveQuotaUnit(store.db, both(store.db, 40, 5))
  assert.equal(r.ok, true)
  assert.equal(store.count(MONTH, TOOL), 1)
  assert.equal(store.count(DAY, TOOL), 1)
})

// ─────────────────────────────────────────────────────────────────────────────
// Reserving before the provider means refunding after it
// ─────────────────────────────────────────────────────────────────────────────

test('the runner never runs once the meter has refused', async () => {
  const store = makeStore()
  store.seed(BUCKET, { [TOOL]: 1 })
  let ran = false
  const r = await runMeteredTask({
    db: store.db,
    meters: meter(store.db, 1),
    run: async () => { ran = true; return { ok: 1 } },
  })
  assert.equal(ran, false, 'the provider must not be called for a request the meter refused')
  assert.equal(r.ok, false)
})

test('a runner that answered for itself gets the unit REFUNDED', async () => {
  // The founder's rule: "a failed request must not consume a free user's single
  // use." Reserving before the provider call is what closes the race; the refund
  // is what keeps that rule true afterwards.
  const store = makeStore()
  const r = await runMeteredTask({
    db: store.db,
    meters: meter(store.db, 1),
    run: async () => null,
  })
  assert.equal(r.ok, true)
  assert.equal(r.result, null)
  assert.equal(store.count(BUCKET, TOOL), 0, 'a refused generation must cost nothing')
})

test('a runner that THROWS refunds the unit and rethrows the original error', async () => {
  const store = makeStore()
  await assert.rejects(
    runMeteredTask({
      db: store.db,
      meters: meter(store.db, 1),
      run: async () => { throw new Error('openrouter exploded') },
    }),
    /openrouter exploded/,
    'the refund must not swallow the failure it is compensating for',
  )
  assert.equal(store.count(BUCKET, TOOL), 0)
})

test('a runner that SUCCEEDS keeps the unit spent', async () => {
  const store = makeStore()
  const r = await runMeteredTask({
    db: store.db,
    meters: meter(store.db, 1),
    run: async ([used]) => ({ used }),
  })
  assert.deepEqual(r.result, { used: 0 })
  assert.equal(store.count(BUCKET, TOOL), 1, 'a real generation must be counted')
})

test('a refund floors at zero rather than going negative', async () => {
  const store = makeStore()
  await refundQuotaUnit(store.db, meter(store.db, 1))
  assert.equal(store.count(BUCKET, TOOL), 0)
})

test('a Firestore failure is reported as a store error, not as a quota refusal', async () => {
  // These are different responses — 500 with a diagnosable message versus 429
  // with "you have used your allowance". Telling a user they are out of quota
  // when the database is down is the kind of lie they act on.
  const broken = { async runTransaction() { throw new Error('service account lacks access') } }
  const r = await runMeteredTask({
    db: broken,
    meters: [{ ref: { path: BUCKET }, field: TOOL, limit: 1, period: 'lifetime' }],
    run: async () => ({ ok: 1 }),
  })
  assert.equal(r.ok, false)
  assert.match(String(r.storeError?.message), /service account lacks access/)
  assert.equal(r.blocked, undefined, 'a store failure must not be dressed up as a limit')
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL 3 — THE WIRING
// ─────────────────────────────────────────────────────────────────────────────
//
// Everything above tests the helper. This repo has already paid for the
// difference once: reverting a single call site left the unit suite fully green
// while the product was broken. These assertions are about api/ai.js.

const aiSrc = () => fs.readFileSync(path.join(process.cwd(), 'api', 'ai.js'), 'utf8')

test('WIRING: both metered paths in api/ai.js go through runMeteredTask', async () => {
  const src = stripComments(aiSrc())
  // `[^}]*`, not `[\s\S]*?` — the lazy any-character form matched across
  // unrelated import statements, so it would have stayed green with the symbol
  // imported from somewhere else entirely. The mutation sweep found that.
  assert.match(src, /import \{[^}]*\brunMeteredTask\b[^}]*\} from '\.\/_lib\/aiGeneration\.js'/,
    'api/ai.js no longer imports the metered runner')
  const calls = src.match(/runMeteredTask\(\{/g) || []
  assert.equal(calls.length, 2,
    `expected both quota paths (the Brand Starter bucket and the daily/monthly pair) to be metered, found ${calls.length}`)
})

test('WIRING: every provider call sits INSIDE a runMeteredTask reservation', async () => {
  // The ordering is the fix. A `task.run` reachable without a reservation above
  // it is the defect back again, whatever the helper does.
  const src = stripComments(aiSrc())
  const runs = [...src.matchAll(/await task\.run\(/g)]
  assert.equal(runs.length, 2, `expected exactly two provider call sites, found ${runs.length}`)
  for (const m of runs) {
    const before = src.slice(0, m.index)
    const reserved = before.lastIndexOf('runMeteredTask({')
    const callback = before.lastIndexOf('run: async (')
    assert.ok(reserved !== -1 && callback > reserved,
      'a task.run() call site is not inside a runMeteredTask reservation callback')
  }
})

test('WIRING: the old read-then-increment pair is gone from api/ai.js', async () => {
  const src = stripComments(aiSrc())
  assert.doesNotMatch(src, /Promise\.all\(\[usageRef\.get\(\), monthRef\.get\(\)\]\)/,
    'the plain paired read that made the race possible is back')
  assert.doesNotMatch(src, /usageRef\.set\(/, 'the daily bucket is being incremented outside the transaction again')
  assert.doesNotMatch(src, /monthRef\.set\(/, 'the monthly bucket is being incremented outside the transaction again')
  assert.doesNotMatch(src, /ref\.set\(\{ \[toolId\]/, 'the generation bucket is being incremented outside the transaction again')
})

test('WIRING: the reservation is transactional, and conditional on the value it read', async () => {
  // FieldValue.increment inside the transaction would commit regardless of the
  // count it was decided from, and the whole thing would guard nothing.
  const src = stripComments(fs.readFileSync(path.join(process.cwd(), 'api', '_lib', 'aiGeneration.js'), 'utf8'))
  assert.match(src, /db\.runTransaction\(/, 'the reservation is no longer a transaction')
  const body = src.slice(src.indexOf('export async function reserveQuotaUnit'))
  assert.match(body, /counts\[i\] \+ 1/, 'the write must be derived from the value the transaction READ')
  assert.doesNotMatch(body.slice(0, body.indexOf('export async function refundQuotaUnit')), /FieldValueIncrement|FieldValue\.increment/,
    'an unconditional increment inside the transaction cannot enforce a cap')
})
