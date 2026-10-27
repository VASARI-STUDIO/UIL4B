// GET /api/ai?usage=1 is the only way the dashboard learns an ACCOUNT's AI count.
// serveUsage is the whole decision, with the token, the user document and the
// usage documents injected, so it runs here without Firebase.
//
// MUTATION notes (a test is not trusted until it has been seen to fail):
//   - drop the Bearer check in serveUsage       -> the 401 tests go red
//   - key the day on local time, not UTC        -> the UTC day key tests go red on ANY host
//                                                  (they run a child node under TZ=Australia/Brisbane)
//   - read uid from the query, not the token    -> the "this account's count" test goes red
//   - return the smaller tool's figures         -> the busiest tool test goes red
//   - drop 'scan-photo' from USAGE_TOOLS        -> the scan-photo tests go red
//   - aiUsageToday ignores `server`             -> the "account has answered" tests go red
//   - aiUsageToday takes the larger of the two  -> the "higher local count does NOT override" test goes red
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { serveUsage, usageDayKey } from '../../api/_lib/aiUsage.js'
import { aiUsageToday, msToUtcMidnight, settleServerUsage, utcDay } from '../../src/components/userhome/workspace.js'
import { PLANS, dailyLimitFor } from '../../api/_lib/plans.js'

function fakeRes() {
  const res = {
    statusCode: null, body: null, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
  }
  return res
}

const NOW = new Date('2026-10-27T23:30:00Z')
const req = (authorization = 'Bearer good-token') => ({ headers: authorization === null ? {} : { authorization }, query: { usage: '1' } })

/** Serve as `uid`, with `docs` as the daily-usage collection. Records which ids were read. */
async function serve({ authorization, uid = 'u-1', users = {}, docs = {}, now = NOW } = {}) {
  const res = fakeRes()
  const read = []
  await serveUsage(req(authorization), res, {
    verifyIdToken: async (token) => {
      assert.equal(token, 'good-token')
      return { uid, email: `${uid}@example.com`, email_verified: true }
    },
    readUser: async (id) => users[id],
    readUsage: async (ids) => { read.push(...ids); return ids.map((id) => docs[id] || {}) },
    now,
  })
  return { res, read }
}

test('no token is 401 and reads nothing', async () => {
  const res = fakeRes()
  await serveUsage(req(null), res, {
    verifyIdToken: async () => assert.fail('no token, nothing to verify'),
    readUser: async () => assert.fail('no token, no user read'),
    readUsage: async () => assert.fail('no token, no usage read'),
  })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.used, undefined)
})

test('a header that is not a Bearer token is 401', async () => {
  const { res } = await serve({ authorization: 'Basic abc' })
  assert.equal(res.statusCode, 401)
})

test('a token that fails verification is 401 with no numbers', async () => {
  const res = fakeRes()
  await serveUsage(req(), res, {
    verifyIdToken: async () => { throw new Error('expired') },
    readUser: async () => assert.fail('unverified, no user read'),
    readUsage: async () => assert.fail('unverified, no usage read'),
  })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.used, undefined)
})

test('the answer is private and never cached', async () => {
  const { res } = await serve()
  assert.equal(res.headers['Cache-Control'], 'private, no-store')
  assert.equal(res.headers.Vary, 'Authorization')
})

test('it returns THIS account\'s count, read for the uid in the token', async () => {
  const { res, read } = await serve({
    uid: 'u-1',
    docs: {
      'u-1_2026-10-27': { 'alt-text': 3, 'prompts-ai': 1 },
      'u-1_m2026-10': { 'alt-text': 12 },
      'someone-else_2026-10-27': { 'alt-text': 5 },
    },
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(read, ['u-1_2026-10-27', 'u-1_m2026-10'])
  assert.equal(res.body.used, 3)
  assert.equal(res.body.limit, PLANS.free.limits['alt-text'])
  assert.equal(res.body.remaining, PLANS.free.limits['alt-text'] - 3)
  assert.equal(res.body.monthUsed, 12)
  assert.equal(res.body.monthLimit, PLANS.free.monthlyLimits['alt-text'])
  assert.equal(res.body.plan, 'free')
  assert.equal(res.body.tools['prompts-ai'].used, 1)
})

test('the headline figure is the busiest tool\'s', async () => {
  const { res } = await serve({ docs: { 'u-1_2026-10-27': { 'alt-text': 1, 'prompts-ai': 4 } } })
  assert.equal(res.body.used, 4)
})

test('an account with no usage documents reads zero, not an error', async () => {
  const { res } = await serve()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.used, 0)
  assert.equal(res.body.monthUsed, 0)
})

test('a Pro account gets the Pro limits', async () => {
  const { res } = await serve({ uid: 'pro-1', users: { 'pro-1': { lifetimeEntitlement: { active: true } } } })
  assert.equal(res.body.plan, 'pro')
  assert.equal(res.body.limit, PLANS.pro.limits['alt-text'])
})

/* ── The UTC day, proved on a host that is NOT on UTC ──────────────────────────
 * On a UTC host the local getters and the getUTC* ones agree, so an in-process
 * check cannot tell them apart. These run the real module in a child node with
 * TZ set to a zone that is ten hours ahead (Brisbane, no daylight saving), where
 * 23:30 UTC is already the next local day. The child reports its own offset so
 * the test fails loudly if the host ignores TZ instead of passing for nothing. */

const MODULE_URL = pathToFileURL(fileURLToPath(new URL('../../api/_lib/aiUsage.js', import.meta.url))).href

function inZone(tz, body) {
  const out = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { usageDayKey, usageMonthKey, serveUsage } from ${JSON.stringify(MODULE_URL)}
    const offset = new Date('2026-10-27T12:00:00Z').getTimezoneOffset()
    const result = await (async () => { ${body} })()
    console.log(JSON.stringify({ offset, result }))
  `], { env: { ...process.env, TZ: tz }, encoding: 'utf8' })
  assert.equal(out.status, 0, out.stderr)
  const parsed = JSON.parse(out.stdout.trim().split('\n').pop())
  assert.equal(parsed.offset, -600, `the child did not run in ${tz}, so this check proves nothing`)
  return parsed.result
}

test('the day key rolls at UTC midnight, not local midnight', () => {
  // Brisbane is UTC+10: both instants below fall on 28 Oct locally, one on 27 Oct UTC.
  const r = inZone('Australia/Brisbane', `
    return {
      late: usageDayKey(new Date('2026-10-27T23:30:00Z')),
      early: usageDayKey(new Date('2026-10-28T00:30:00Z')),
      lateYesterday: usageDayKey(new Date('2026-10-28T00:30:00Z'), 1),
      monthLate: usageMonthKey(new Date('2026-10-31T23:30:00Z')),
      monthEarly: usageMonthKey(new Date('2026-11-01T00:30:00Z')),
    }`)
  assert.equal(r.late, '2026-10-27')
  assert.equal(r.early, '2026-10-28')
  assert.equal(r.lateYesterday, '2026-10-27')
  assert.equal(r.monthLate, 'm2026-10')
  assert.equal(r.monthEarly, 'm2026-11')
})

test('the key the endpoint reads is the UTC day', () => {
  const r = inZone('Australia/Brisbane', `
    const read = []
    const serveAt = async (now) => {
      read.length = 0
      const res = { setHeader() {}, status() { return res }, json() { return res } }
      await serveUsage({ headers: { authorization: 'Bearer t' } }, res, {
        verifyIdToken: async () => ({ uid: 'u-1' }),
        readUser: async () => ({}),
        readUsage: async (ids) => { read.push(...ids); return ids.map(() => ({})) },
        now,
      })
      return [...read]
    }
    return {
      late: await serveAt(new Date('2026-10-27T23:30:00Z')),
      early: await serveAt(new Date('2026-10-28T00:30:00Z')),
    }`)
  assert.deepEqual(r.late, ['u-1_2026-10-27', 'u-1_m2026-10'])
  assert.deepEqual(r.early, ['u-1_2026-10-28', 'u-1_m2026-10'])
})

test('the day key matches a key built by hand from getUTC*', () => {
  // The key built by hand from getUTC*, not from the module under test.
  const byHand = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  for (const iso of ['2026-10-27T23:30:00Z', '2026-10-28T00:30:00Z', '2026-12-31T23:59:59Z', '2027-01-01T00:00:00Z']) {
    assert.equal(usageDayKey(new Date(iso)), byHand(new Date(iso)))
  }
  assert.equal(usageDayKey(new Date('2026-03-01T00:30:00Z'), 1), '2026-02-28')
})

/* ── scan-photo is metered per day in the same document, so the headline covers it ── */

test('scan-photo is one of the metered tools, against its own limit', async () => {
  const { res } = await serve({ docs: { 'u-1_2026-10-27': { 'alt-text': 1, 'scan-photo': 4, 'prompts-ai': 2 } } })
  assert.deepEqual(Object.keys(res.body.tools), ['alt-text', 'scan-photo', 'prompts-ai'])
  assert.equal(res.body.tools['scan-photo'].used, 4)
  assert.equal(res.body.tools['scan-photo'].limit, dailyLimitFor(PLANS.free, 'scan-photo'))
  assert.equal(res.body.used, 4, 'the busiest tool is scan-photo, so its figures lead')
  assert.equal(res.body.remaining, dailyLimitFor(PLANS.free, 'scan-photo') - 4)
})

test('scan-photo on a Pro account carries the Pro limit', async () => {
  const { res } = await serve({
    uid: 'pro-1',
    users: { 'pro-1': { lifetimeEntitlement: { active: true } } },
    docs: { 'pro-1_2026-10-27': { 'scan-photo': 7 } },
  })
  assert.equal(res.body.tools['scan-photo'].limit, dailyLimitFor(PLANS.pro, 'scan-photo'))
  assert.equal(res.body.used, 7)
})

/* ── The page's meter: the account's count once it has answered, else this browser's ── */

const FREE = { limits: { 'ai-default': 5 } }
const local = (n, tool = 'alt-text') => (id) => (id === tool ? n : 0)

test('with no server figure the meter is this browser\'s count, labelled as such', () => {
  const ai = aiUsageToday(local(2), FREE)
  assert.equal(ai.used, 2)
  assert.equal(ai.source, 'browser')
  assert.equal(ai.month, null)
})

test('the browser\'s busiest tool counts, scan-photo included', () => {
  assert.equal(aiUsageToday(local(3, 'scan-photo'), FREE).used, 3)
})

test('once the account has answered, its count is the one shown', () => {
  const ai = aiUsageToday(local(0), FREE, { used: 5, limit: 5, monthUsed: 12, monthLimit: 40 })
  assert.equal(ai.used, 5)
  assert.equal(ai.source, 'account')
  assert.deepEqual(ai.month, { used: 12, limit: 40 })
})

test('a higher local count does NOT override the account\'s lower one', () => {
  // The local count resets at local midnight and is shared by every account on this browser.
  const ai = aiUsageToday(local(4), FREE, { used: 1, limit: 5 })
  assert.equal(ai.used, 1)
  assert.equal(ai.source, 'account')
})

test('an account that has used nothing reads zero even if this browser counted some', () => {
  assert.equal(aiUsageToday(local(3), FREE, { used: 0, limit: 5 }).used, 0)
})

test('the count never passes the limit', () => {
  assert.equal(aiUsageToday(local(9), FREE, { used: 7, limit: 5 }).used, 5)
})

test('an answer with its limit dropped (plan changed since) uses the plan\'s limit', () => {
  const PRO = { limits: { 'ai-default': 30 } }
  const ai = aiUsageToday(local(0), PRO, { used: 5, limit: undefined, monthUsed: 12, monthLimit: undefined })
  assert.equal(ai.limit, 30)
  assert.equal(ai.used, 5)
  assert.equal(ai.month, null, 'a monthly limit from the old plan is not shown')
})

/* ── What the hook may show from its last answer ─────────────────────────── */

const answer = { used: 3, limit: 5, monthUsed: 10, monthLimit: 40, day: '2026-10-27' }
const held = { uid: 'u-1', planId: 'free', day: '2026-10-27', usage: answer }
const now = { uid: 'u-1', planId: 'free', today: '2026-10-27' }

test('a current answer for this account and plan is shown whole', () => {
  assert.equal(settleServerUsage(held, now), answer)
})

test('another account\'s answer, or none, is not shown', () => {
  assert.equal(settleServerUsage(held, { ...now, uid: 'u-2' }), null)
  assert.equal(settleServerUsage({ uid: null, planId: null, day: null, usage: null }, now), null)
})

test('an answer from an earlier UTC day is not shown', () => {
  assert.equal(settleServerUsage(held, { ...now, today: '2026-10-28' }), null)
})

test('after a plan change the old limits are dropped but the count stays', () => {
  const shown = settleServerUsage(held, { ...now, planId: 'pro' })
  assert.equal(shown.used, 3)
  assert.equal(shown.limit, undefined)
  assert.equal(shown.monthLimit, undefined)
  // and the meter then reads the new plan's limit, not the free 5
  assert.equal(aiUsageToday(local(0), { limits: { 'ai-default': 30 } }, shown).limit, 30)
})

test('the midnight timer targets the next UTC midnight, wherever the host is', () => {
  const ms = msToUtcMidnight(new Date('2026-10-27T23:30:00Z'))
  assert.equal(ms, 30 * 60 * 1000 + 1000)
  assert.equal(utcDay(new Date('2026-10-27T23:30:00Z')), '2026-10-27')
  assert.equal(msToUtcMidnight(new Date('2026-10-28T00:00:00Z')), 24 * 3600 * 1000 + 1000)
})
