// /api/ai counts ATTEMPTS, and nothing gives one back.
//
// The quota meter counts generations and refunds a call that produced nothing,
// so a failing call used to be free to repeat against the shared provider pool.
// api/_lib/aiLimits.js adds, in front of the meter:
//
//   per account  6 a minute, 60 an hour
//   per address  30 a day, for accounts that are not Pro
//   site-wide    180 a day
//
// and refuses a malformed image before anything is reserved or counted.
//
// aiLimits.js runs for real against the in-memory Firestore in
// helpers/api-fakes.js. The handler is api/ai.js executed under node:vm with its
// imports replaced (the way ai-email-gate.test.js does it), with the REAL
// aiAttemptRefusal and imagePayloadProblem wired in, so the order of the checks
// in the handler is what is under test, not a copy of it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'

import { fakeDb } from './helpers/api-fakes.js'
import {
  AI_ABUSE_LIMITS, MAX_IMAGE_BASE64_CHARS, aiAttemptRefusal, imagePayloadProblem,
} from '../../api/_lib/aiLimits.js'
import { cleanKey } from '../../api/_lib/env.js'
import { planForUser, dailyLimitFor, monthlyLimitFor, modelFor } from '../../api/_lib/plans.js'
import { usageDayKey, usageMonthKey } from '../../api/_lib/aiUsage.js'
import { emailGateBody } from '../../api/_lib/emailGate.js'
import { mailFrom, REPLY_TO, sendingDomainConfigured } from '../../api/_lib/mail.js'

const aiSource = fs.readFileSync(path.join(process.cwd(), 'api/ai.js'), 'utf8')
const MIN = AI_ABUSE_LIMITS.perUidMinute
const HOUR = AI_ABUSE_LIMITS.perUidHour
const IP_DAY = AI_ABUSE_LIMITS.perIpDay
const SITE = AI_ABUSE_LIMITS.siteDay
const T0 = 1_800_000_000_000

const req = (ip = '203.0.113.7') => ({ headers: { 'x-forwarded-for': ip } })
const attempt = (db, o = {}) => aiAttemptRefusal(db, { uid: 'u1', req: req(o.ip), planId: 'free', now: T0, ...o, ...(o.ip ? { req: req(o.ip) } : {}) })

// ── the figures ─────────────────────────────────────────────────────────────

test('the figures are the ones the abuse brief asks for', () => {
  assert.deepEqual([MIN.limit, MIN.windowMs], [6, 60_000])
  assert.deepEqual([HOUR.limit, HOUR.windowMs], [60, 3_600_000])
  assert.deepEqual([IP_DAY.limit, IP_DAY.windowMs], [30, 86_400_000])
  assert.deepEqual([SITE.limit, SITE.windowMs], [180, 86_400_000])
})

// ── bucket maths ────────────────────────────────────────────────────────────

test('an account gets 6 attempts a minute, then a 429 whose body carries the wait', async () => {
  const db = fakeDb()
  for (let i = 0; i < MIN.limit; i += 1) assert.equal(await attempt(db), null, `attempt ${i + 1}`)
  const refused = await attempt(db)
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'minute')
  assert.ok(refused.body.retryAfter >= 1 && refused.body.retryAfter <= 60)
  assert.equal(refused.retryAfter, refused.body.retryAfter)
  assert.equal(typeof refused.body.error, 'string')
})

test('the minute window rolls: the same account is let through a minute later', async () => {
  const db = fakeDb()
  for (let i = 0; i <= MIN.limit; i += 1) await attempt(db)
  assert.equal(await attempt(db, { now: T0 + MIN.windowMs }), null)
})

test('the hourly bucket stops an account that paces itself under the minute limit', async () => {
  const db = fakeDb()
  // 5 a minute for 12 minutes is 60 attempts, each minute inside its own limit.
  // A Pro account, so the free per-address daily cap (30) does not cut in first.
  for (let m = 0; m < 12; m += 1) {
    for (let i = 0; i < 5; i += 1) assert.equal(await attempt(db, { planId: 'pro', now: T0 + m * MIN.windowMs }), null)
  }
  const refused = await attempt(db, { planId: 'pro', now: T0 + 12 * MIN.windowMs })
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'hour')
})

test('only the per-minute refusal puts retryAfter in the body (the alt-text page sleeps on it)', async () => {
  const db = fakeDb()
  for (let m = 0; m < 12; m += 1) for (let i = 0; i < 5; i += 1) await attempt(db, { planId: 'pro', now: T0 + m * MIN.windowMs })
  const hourly = await attempt(db, { planId: 'pro', now: T0 + 12 * MIN.windowMs })
  assert.equal(hourly.body.rateLimited, 'hour')
  assert.equal('retryAfter' in hourly.body, false)
  assert.ok(hourly.retryAfter > 60, 'the header still carries the real wait')
})

test('a refused attempt is not counted, so the wait does not grow while an account keeps knocking', async () => {
  const db = fakeDb()
  for (let i = 0; i < MIN.limit; i += 1) await attempt(db)
  for (let i = 0; i < 20; i += 1) await attempt(db)
  assert.equal(await attempt(db, { now: T0 + MIN.windowMs }), null)
})

test('accounts are counted separately', async () => {
  const db = fakeDb()
  for (let i = 0; i <= MIN.limit; i += 1) await attempt(db, { uid: 'u1' })
  assert.equal(await attempt(db, { uid: 'u2' }), null)
})

// ── per-address cap ─────────────────────────────────────────────────────────

test('many free accounts on one address share 30 a day', async () => {
  const db = fakeDb()
  for (let i = 0; i < IP_DAY.limit; i += 1) assert.equal(await attempt(db, { uid: `u${i}` }), null, `attempt ${i + 1}`)
  const refused = await attempt(db, { uid: 'fresh-account' })
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'ip')
  assert.equal('retryAfter' in refused.body, false)
  // ...and another address is untouched.
  assert.equal(await attempt(db, { uid: 'fresh-account', ip: '198.51.100.9' }), null)
})

test('a Pro account is not held to the per-address cap', async () => {
  const db = fakeDb()
  for (let i = 0; i < IP_DAY.limit; i += 1) await attempt(db, { uid: `u${i}` })
  assert.equal(await attempt(db, { uid: 'pro-1', planId: 'pro' }), null)
})

test('a free request with no address is refused and counts for nothing', async () => {
  const db = fakeDb()
  const refused = await aiAttemptRefusal(db, { uid: 'u1', req: { headers: {} }, planId: 'free', now: T0 })
  assert.equal(refused.status, 400)
  assert.equal(db.inCollection('rate-limits').length, 0)
})

// ── site-wide breaker ───────────────────────────────────────────────────────

test('the site-wide breaker trips at 180 a day across accounts and addresses', async () => {
  const db = fakeDb()
  for (let i = 0; i < SITE.limit; i += 1) {
    // Pro accounts, so the per-address cap is out of the way; one each, so the
    // account buckets are too.
    assert.equal(await attempt(db, { uid: `p${i}`, planId: 'pro' }), null, `attempt ${i + 1}`)
  }
  const refused = await attempt(db, { uid: 'p-last', planId: 'pro' })
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'site')
})

test('a request refused by its own account bucket does not spend the site allowance', async () => {
  const db = fakeDb()
  for (let i = 0; i < 50; i += 1) await attempt(db, { uid: 'u1', planId: 'pro' })
  const siteKey = [...db.docs.keys()].find((k) => k.startsWith('rate-limits/ai-site-day_'))
  assert.equal(db.docs.get(siteKey).count, MIN.limit, 'only the six admitted attempts reached the site counter')
})

// ── failing closed ──────────────────────────────────────────────────────────

test('when Firestore is unreachable the request is refused, not let through uncounted', async () => {
  const db = fakeDb()
  db.runTransaction = async () => { throw Object.assign(new Error('down'), { code: 14 }) }
  const refused = await attempt(db)
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'busy')
  assert.ok(refused.retryAfter > 0)
})

// A database whose read fails with an outage code for ONE counter only, so a
// bucket that fails open is not hidden by the others refusing.
function dbDownFor(bucket) {
  const db = fakeDb()
  const real = db.runTransaction.bind(db)
  db.runTransaction = (fn) => real((tx) => fn({
    ...tx,
    get: (r) => {
      if (r.id.startsWith(`${bucket}_`)) throw Object.assign(new Error('down'), { code: 14 })
      return tx.get(r)
    },
  }))
  return db
}

for (const [bucket, planId] of [
  ['ai-uid-minute', 'pro'], ['ai-uid-hour', 'pro'], ['ai-ip-day', 'free'], ['ai-site-day', 'pro'],
]) {
  test(`when only the ${bucket} counter cannot be read, the request is refused`, async () => {
    const refused = await attempt(dbDownFor(bucket), { planId })
    assert.ok(refused, 'an uncounted attempt was let through')
    assert.equal(refused.status, 429)
    assert.equal(refused.body.rateLimited, 'busy')
  })
}

// ── image input ─────────────────────────────────────────────────────────────

test('imagePayloadProblem accepts padded base64 and refuses everything else', () => {
  assert.equal(imagePayloadProblem('QUJDRA=='), null)
  assert.equal(imagePayloadProblem('QUJD'), null)
  for (const bad of [undefined, null, 42, {}, '', 'data:image/png;base64,QUJD', 'QUJDRA', 'QU JD', 'QUJ*', '=QUJ']) {
    assert.ok(imagePayloadProblem(bad), `${JSON.stringify(bad)} must be refused`)
  }
})

test('imagePayloadProblem refuses an image over the size limit and accepts one at it', () => {
  assert.equal(imagePayloadProblem('A'.repeat(MAX_IMAGE_BASE64_CHARS)), null)
  assert.match(imagePayloadProblem('A'.repeat(MAX_IMAGE_BASE64_CHARS + 4)), /too large/)
})

// ── the handler's order of checks ───────────────────────────────────────────

function loadAi({ user = {}, db = fakeDb(), decoded = { uid: 'u1', email: 'a@example.com', email_verified: true } } = {}) {
  let out = aiSource
  const IMPORT = /^import\s[\s\S]*?\sfrom\s+'[^']+'\r?\n/m
  while (IMPORT.test(out)) out = out.replace(IMPORT, '')
  out = out.replace(/^export default async function handler/m, 'async function handler')
  while (/^export (const|function) /m.test(out)) out = out.replace(/^export (const|function) /m, '$1 ')

  db.docs.set('users/u1', user)
  const ledger = { reserved: 0, ran: 0 }
  const handlerDb = {
    ...db,
    doc: (p) => {
      const i = p.indexOf('/')
      return db.collection(p.slice(0, i)).doc(p.slice(i + 1))
    },
  }
  const sandbox = {
    console: { error() {}, log() {}, warn() {} },
    process: { env: { GEMINI_API_KEY: 'AIza-test0000', OPENROUTER_API_KEY: 'sk-or-v1-test0000' }, version: process.version },
    fetch: async () => { throw new Error('the limits test reached the network') },
    setTimeout, clearTimeout, AbortController, Buffer,
    cleanKey, nodeTimingSafeEqual,
    mailFrom: () => mailFrom({}), sendingDomainConfigured: () => sendingDomainConfigured({}), REPLY_TO,
    adminDb: () => handlerDb,
    adminAuth: () => ({ verifyIdToken: async () => decoded }),
    credentialProblem: () => null,
    FieldValueIncrement: async () => 1,
    requireAdmin: async () => ({ ok: false, status: 401 }),
    emailGateBody, serveUsage: async () => {},
    usageDayKey, usageMonthKey,
    planForUser, dailyLimitFor, monthlyLimitFor, modelFor,
    classifyGeminiFinish: () => ({}), emptyReplyError: () => '', MAX_TOKENS_EMPTY_MESSAGE: '',
    BRAND_STARTER_TOOL_ID: 'brand-starter', MAX_PROMPT_CHARS: 500, MIN_PROMPT_CHARS: 12,
    PALETTE_MIN_ROLES: 5, PALETTE_MAX_ROLES: 8, BASE_MIN: 14, BASE_MAX: 20, RATIO_MIN: 1.1, RATIO_MAX: 1.7,
    fontChoiceList: () => [],
    generationBucket: () => ({ suffix: 'life', limit: 1, period: 'lifetime' }),
    exhaustedError: () => 'used',
    parseStarterJson: () => ({}), sanitizeBrandStarter: () => ({}),
    runMeteredTask: async ({ meters, run }) => {
      ledger.reserved += 1
      const result = await run(meters.map(() => 0), { refundCapped: () => {} })
      return { ok: true, result, counts: meters.map(() => 0) }
    },
    altTextGenerationConfig: () => ({}), altTextOutcome: () => ({}), altTextCutoffReply: () => ({}),
    ALT_TEXT_CUTOFF_REFUND_CAP: { field: 'x', limit: 1 },
    aiAttemptRefusal, imagePayloadProblem,
  }
  const api = vm.runInNewContext(`(function(){\n${out}\n;return { handler, TASKS };\n})()`, sandbox, { filename: 'api/ai.js' })
  for (const [name, task] of Object.entries(api.TASKS)) {
    task.configured = () => true
    // A runner that returns nothing is a failed call: the real meter refunds it.
    task.run = async () => { ledger.ran += 1; return ledger.failRuns ? null : { ok: true, task: name } }
  }
  const call = async (body, ip = '203.0.113.7') => {
    const res = {
      statusCode: 200, headers: {}, body: undefined,
      status(c) { this.statusCode = c; return this },
      json(p) { this.body = p; return this },
      setHeader(k, v) { this.headers[k] = v },
    }
    await api.handler({ method: 'POST', headers: { authorization: 'Bearer t', 'x-forwarded-for': ip }, body, query: {} }, res)
    return res
  }
  return { call, ledger, db }
}

const GOOD = { task: 'alt-text', image: 'QUJDRA==', mimeType: 'image/png' }

test('handler: a good image request is counted, reserved and run', async () => {
  const { call, ledger, db } = loadAi()
  const res = await call(GOOD)
  assert.equal(res.statusCode, 200)
  assert.deepEqual([ledger.reserved, ledger.ran], [1, 1])
  assert.ok(db.inCollection('rate-limits').length >= 3, 'attempt counters were written')
})

test('handler: a bad image is refused with 400 before an attempt is counted or a unit reserved', async () => {
  const { call, ledger, db } = loadAi()
  for (const image of ['not base64!!', 'data:image/png;base64,QUJD', 'A'.repeat(MAX_IMAGE_BASE64_CHARS + 4), 42]) {
    const res = await call({ ...GOOD, image })
    assert.equal(res.statusCode, 400, JSON.stringify(image).slice(0, 30))
  }
  assert.deepEqual([ledger.reserved, ledger.ran], [0, 0])
  assert.equal(db.inCollection('rate-limits').length, 0, 'malformed requests used no allowance')
})

test('handler: scan-photo refuses a bad image and a wrong mime type the same way, and takes a good one', async () => {
  const { call, ledger, db } = loadAi()
  const scan = { task: 'scan-photo', image: 'QUJDRA==', mimeType: 'image/png' }
  for (const bad of [{ image: 'not base64!!' }, { image: 'data:image/png;base64,QUJD' }, { image: 'A'.repeat(MAX_IMAGE_BASE64_CHARS + 4) }, { mimeType: 'image/heic' }]) {
    assert.equal((await call({ ...scan, ...bad })).statusCode, 400, JSON.stringify(bad).slice(0, 40))
  }
  assert.deepEqual([ledger.reserved, ledger.ran], [0, 0])
  assert.equal(db.inCollection('rate-limits').length, 0)
  assert.equal((await call(scan)).statusCode, 200)
  assert.equal(ledger.reserved, 1)
})

test('handler: the seventh attempt in a minute is a 429 with Retry-After, and nothing is reserved for it', async () => {
  const { call, ledger } = loadAi()
  for (let i = 0; i < MIN.limit; i += 1) assert.equal((await call(GOOD)).statusCode, 200)
  const res = await call(GOOD)
  assert.equal(res.statusCode, 429)
  assert.ok(Number(res.headers['Retry-After']) >= 1)
  assert.equal(res.body.rateLimited, 'minute')
  assert.equal(ledger.reserved, MIN.limit)
})

test('handler: failed provider calls still use up attempts, so a loop of failures is stopped', async () => {
  const { call, ledger } = loadAi()
  ledger.failRuns = true
  for (let i = 0; i < MIN.limit; i += 1) await call(GOOD)
  assert.equal((await call(GOOD)).statusCode, 429)
  assert.equal(ledger.ran, MIN.limit, 'the seventh failing call never reached the provider')
})

test('handler: the brand-starter task is counted too, and is not image-checked', async () => {
  const { call, ledger } = loadAi()
  for (let i = 0; i < MIN.limit; i += 1) assert.equal((await call({ task: 'brand-starter' })).statusCode, 200)
  assert.equal((await call({ task: 'brand-starter' })).statusCode, 429)
  assert.equal(ledger.reserved, MIN.limit)
})

test('handler: both metered paths run the checks before the meter (source order)', () => {
  const guard = (aiSource.match(/await refuseBeforeMeter\(/g) || []).length
  assert.equal(guard, 2, 'both the generation path and the daily/monthly path call refuseBeforeMeter')
  const meter = [...aiSource.matchAll(/await runMeteredTask\(\{/g)].map((m) => m.index)
  const first = aiSource.indexOf('await refuseBeforeMeter(')
  const second = aiSource.indexOf('await refuseBeforeMeter(', first + 1)
  assert.ok(first < meter[0] && second < meter[1], 'each guard sits ahead of its runMeteredTask call')
})
