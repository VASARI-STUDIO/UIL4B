// /api/ai counts ATTEMPTS, and nothing gives one back.
//
// The quota meter counts generations and refunds a call that produced nothing,
// so a failing call used to be free to repeat against the shared provider pool.
// api/_lib/aiLimits.js adds, in two stages:
//
//   before the meter   per account  6 a minute, 60 an hour
//   after the unit is  per address  30 a day, for accounts that are not Pro
//   reserved           site-wide    150 a day non-Pro, 180 a day Pro (two buckets)
//
// and refuses a malformed image before anything is reserved or counted.
//
// The counters shared between people (address, site) are spent only by a
// request that will reach the provider: one the quota meter refuses spends
// neither, and one they refuse after the unit is reserved gives the unit back.
//
// aiLimits.js runs for real against the in-memory Firestore in
// helpers/api-fakes.js. The handler is api/ai.js executed under node:vm with its
// imports replaced (the way ai-email-gate.test.js does it), with the REAL
// aiAccountRefusal, aiSharedRefusal, imagePayloadProblem and runMeteredTask
// wired in, so the order of the checks in the handler, and the refund of a unit,
// are what is under test, not a copy of them.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'

import { fakeDb } from './helpers/api-fakes.js'
import {
  AI_ABUSE_LIMITS, MAX_IMAGE_BASE64_CHARS, SITE_DAY_LIMIT_NON_PRO, SITE_DAY_LIMIT_PRO,
  aiAccountRefusal, aiSharedRefusal, imagePayloadProblem,
} from '../../api/_lib/aiLimits.js'
import { runMeteredTask } from '../../api/_lib/aiGeneration.js'
import { cleanKey } from '../../api/_lib/env.js'
import { planForUser, modelFor } from '../../api/_lib/plans.js'
import { usageDayKey, usageMonthKey } from '../../api/_lib/aiUsage.js'
import { emailGateBody } from '../../api/_lib/emailGate.js'
import { mailFrom, REPLY_TO, sendingDomainConfigured } from '../../api/_lib/mail.js'

const aiSource = fs.readFileSync(path.join(process.cwd(), 'api/ai.js'), 'utf8')
const MIN = AI_ABUSE_LIMITS.perUidMinute
const HOUR = AI_ABUSE_LIMITS.perUidHour
const IP_DAY = AI_ABUSE_LIMITS.perIpDay
const SITE = AI_ABUSE_LIMITS.siteDay
const SITE_PRO = AI_ABUSE_LIMITS.siteDayPro
const T0 = 1_800_000_000_000

const req = (ip = '203.0.113.7') => ({ headers: { 'x-forwarded-for': ip } })
const args = (o = {}) => ({ uid: 'u1', req: req(o.ip), planId: 'free', now: T0, ...o, ...(o.ip ? { req: req(o.ip) } : {}) })
const account = (db, o) => aiAccountRefusal(db, args(o))
const shared = (db, o) => aiSharedRefusal(db, args(o))
// One request that gets past the quota meter: the account stage, then the
// shared stage, the order the route runs them in. The first refusal wins.
const attempt = async (db, o) => (await account(db, o)) || (await shared(db, o))

// The count in a rate-limit counter ('ai-ip-day', 'ai-site-day', ...), summed
// over every document of that bucket; 0 when none was ever written.
const counted = (db, bucket) => [...db.docs.entries()]
  .filter(([k]) => k.startsWith(`rate-limits/${bucket}_`))
  .reduce((n, [, v]) => n + (v.count || 0), 0)

// Quota units currently held in the usage documents, across every meter.
const heldUnits = (db) => db.inCollection('daily-usage')
  .reduce((n, doc) => n + Object.values(doc).reduce((m, v) => m + (typeof v === 'number' ? v : 0), 0), 0)

// ── the figures ─────────────────────────────────────────────────────────────

test('the figures are the ones the abuse brief asks for', () => {
  assert.deepEqual([MIN.limit, MIN.windowMs], [6, 60_000])
  assert.deepEqual([HOUR.limit, HOUR.windowMs], [60, 3_600_000])
  assert.deepEqual([IP_DAY.limit, IP_DAY.windowMs], [30, 86_400_000])
  assert.deepEqual([SITE.limit, SITE.windowMs], [150, 86_400_000])
  assert.deepEqual([SITE_PRO.limit, SITE_PRO.windowMs], [180, 86_400_000])
})

test('the site-wide figures are the two named constants, and Pro keeps more headroom than the rest', () => {
  assert.equal(SITE.limit, SITE_DAY_LIMIT_NON_PRO)
  assert.equal(SITE_PRO.limit, SITE_DAY_LIMIT_PRO)
  assert.ok(SITE_PRO.limit > SITE.limit)
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
  const refused = await aiAccountRefusal(db, { uid: 'u1', req: { headers: {} }, planId: 'free', now: T0 })
  assert.equal(refused.status, 400)
  assert.equal(db.inCollection('rate-limits').length, 0)
  // ...and the shared stage refuses it too, should a caller ever skip the first.
  const again = await aiSharedRefusal(db, { req: { headers: {} }, planId: 'free', now: T0 })
  assert.equal(again.status, 400)
  assert.equal(db.inCollection('rate-limits').length, 0)
})

test('a Pro request with no address is not refused: the address limit is not theirs', async () => {
  const db = fakeDb()
  assert.equal(await aiAccountRefusal(db, { uid: 'p1', req: { headers: {} }, planId: 'pro', now: T0 }), null)
  assert.equal(await aiSharedRefusal(db, { req: { headers: {} }, planId: 'pro', now: T0 }), null)
})

// ── site-wide breaker ───────────────────────────────────────────────────────

test('the non-Pro site breaker trips at 150 a day across accounts and addresses', async () => {
  const db = fakeDb()
  for (let i = 0; i < SITE.limit; i += 1) {
    // One address per account, so neither the per-address cap nor an account
    // bucket cuts in first.
    assert.equal(await attempt(db, { uid: `f${i}`, ip: `192.0.2.${i + 1}` }), null, `attempt ${i + 1}`)
  }
  const refused = await attempt(db, { uid: 'f-last', ip: '198.51.100.200' })
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'site')
})

test('Pro has its own site bucket: it trips at 180 a day, and non-Pro traffic never touches it', async () => {
  const db = fakeDb()
  for (let i = 0; i < SITE.limit; i += 1) await attempt(db, { uid: `f${i}`, ip: `192.0.2.${i + 1}` })
  assert.equal((await attempt(db, { uid: 'f-last', ip: '198.51.100.200' })).body.rateLimited, 'site', 'the non-Pro bucket is spent')
  assert.equal(counted(db, 'ai-site-day-pro'), 0, 'free traffic left the Pro bucket alone')
  for (let i = 0; i < SITE_PRO.limit; i += 1) {
    assert.equal(await attempt(db, { uid: `p${i}`, planId: 'pro' }), null, `Pro attempt ${i + 1}`)
  }
  assert.equal(counted(db, 'ai-site-day'), SITE.limit, 'Pro traffic left the non-Pro bucket alone')
  const refused = await attempt(db, { uid: 'p-last', planId: 'pro' })
  assert.equal(refused.status, 429)
  assert.equal(refused.body.rateLimited, 'site')
})

test('a request refused by its own account bucket does not spend the address or site allowance', async () => {
  const db = fakeDb()
  for (let i = 0; i < 50; i += 1) await attempt(db, { uid: 'u1' })
  assert.equal(counted(db, 'ai-site-day'), MIN.limit, 'only the six admitted attempts reached the site counter')
  assert.equal(counted(db, 'ai-ip-day'), MIN.limit, 'nor the address counter')
})

// ── the two stages and their order ──────────────────────────────────────────

test('the account stage spends only the account buckets', async () => {
  const db = fakeDb()
  assert.equal(await account(db), null)
  assert.equal(counted(db, 'ai-uid-minute'), 1)
  assert.equal(counted(db, 'ai-uid-hour'), 1)
  for (const bucket of ['ai-ip-day', 'ai-site-day', 'ai-site-day-pro']) assert.equal(counted(db, bucket), 0, bucket)
})

test('the shared stage spends the address and the site, and not the account', async () => {
  const db = fakeDb()
  assert.equal(await shared(db), null)
  assert.equal(counted(db, 'ai-ip-day'), 1)
  assert.equal(counted(db, 'ai-site-day'), 1)
  for (const bucket of ['ai-uid-minute', 'ai-uid-hour', 'ai-site-day-pro']) assert.equal(counted(db, bucket), 0, bucket)
})

test('a Pro request in the shared stage spends only the Pro site bucket', async () => {
  const db = fakeDb()
  assert.equal(await shared(db, { planId: 'pro' }), null)
  assert.equal(counted(db, 'ai-site-day-pro'), 1)
  for (const bucket of ['ai-ip-day', 'ai-site-day']) assert.equal(counted(db, bucket), 0, bucket)
})

test('a request the address limit refuses does not spend the site allowance', async () => {
  const db = fakeDb()
  for (let i = 0; i < IP_DAY.limit; i += 1) await shared(db, { uid: `u${i}` })
  assert.equal(counted(db, 'ai-site-day'), IP_DAY.limit)
  for (let i = 0; i < 10; i += 1) assert.equal((await shared(db, { uid: `x${i}` })).body.rateLimited, 'ip')
  assert.equal(counted(db, 'ai-site-day'), IP_DAY.limit, 'ten refused requests left the site counter where it was')
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
  ['ai-uid-minute', 'pro'], ['ai-uid-hour', 'pro'], ['ai-ip-day', 'free'], ['ai-site-day', 'free'], ['ai-site-day-pro', 'pro'],
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
  // `reserved` counts quota units reserved (the runner was entered), `ran` the
  // provider calls. `quota.limit` is every plan's allowance on the real meter;
  // it starts out high so a test only meets the quota when it sets it low.
  const ledger = { reserved: 0, ran: 0 }
  const quota = { limit: 1000 }
  const who = { decoded }
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
    adminAuth: () => ({ verifyIdToken: async () => who.decoded }),
    credentialProblem: () => null,
    FieldValueIncrement: async () => 1,
    requireAdmin: async () => ({ ok: false, status: 401 }),
    emailGateBody, serveUsage: async () => {},
    usageDayKey, usageMonthKey,
    planForUser, modelFor,
    dailyLimitFor: () => quota.limit, monthlyLimitFor: () => quota.limit,
    classifyGeminiFinish: () => ({}), emptyReplyError: () => '', MAX_TOKENS_EMPTY_MESSAGE: '',
    BRAND_STARTER_TOOL_ID: 'brand-starter', MAX_PROMPT_CHARS: 500, MIN_PROMPT_CHARS: 12,
    PALETTE_MIN_ROLES: 5, PALETTE_MAX_ROLES: 8, BASE_MIN: 14, BASE_MAX: 20, RATIO_MIN: 1.1, RATIO_MAX: 1.7,
    fontChoiceList: () => [],
    generationBucket: () => ({ suffix: 'life', limit: quota.limit, period: 'lifetime' }),
    exhaustedError: () => 'used',
    parseStarterJson: () => ({}), sanitizeBrandStarter: () => ({}),
    // The REAL meter, over the in-memory Firestore: it reserves, refuses and
    // refunds as in production. Only the count of reservations is added.
    runMeteredTask: (options) => runMeteredTask({
      ...options,
      run: (counts, helpers) => { ledger.reserved += 1; return options.run(counts, helpers) },
    }),
    altTextGenerationConfig: () => ({}), altTextOutcome: () => ({}), altTextCutoffReply: () => ({}),
    ALT_TEXT_CUTOFF_REFUND_CAP: { field: 'x', limit: 1 },
    aiAccountRefusal, aiSharedRefusal, imagePayloadProblem,
  }
  const api = vm.runInNewContext(`(function(){\n${out}\n;return { handler, TASKS };\n})()`, sandbox, { filename: 'api/ai.js' })
  for (const [name, task] of Object.entries(api.TASKS)) {
    task.configured = () => true
    // A runner that returns nothing is a failed call: the real meter refunds it.
    task.run = async () => { ledger.ran += 1; return ledger.failRuns ? null : { ok: true, task: name } }
  }
  // `as` picks the signed-in account: { uid, user }. Default is u1 with `user`.
  const call = async (body, ip = '203.0.113.7', as = {}) => {
    const uid = as.uid || 'u1'
    who.decoded = { ...decoded, uid }
    db.docs.set(`users/${uid}`, as.user || user)
    const res = {
      statusCode: 200, headers: {}, body: undefined,
      status(c) { this.statusCode = c; return this },
      json(p) { this.body = p; return this },
      setHeader(k, v) { this.headers[k] = v },
    }
    await api.handler({ method: 'POST', headers: { authorization: 'Bearer t', 'x-forwarded-for': ip }, body, query: {} }, res)
    return res
  }
  return { call, ledger, db, quota }
}

const PRO_USER = { subscription: { status: 'active', currentPeriodEnd: Date.now() + 20 * 86_400_000 } }

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

// ── the shared counters are spent only by a request that reaches the provider ─

const ADDRESS_AND_SITE = ['ai-ip-day', 'ai-site-day', 'ai-site-day-pro']

test('handler: a request the quota meter refuses spends neither the address nor the site counter', async () => {
  const { call, ledger, db, quota } = loadAi()
  quota.limit = 0
  const res = await call(GOOD)
  assert.equal(res.statusCode, 429)
  assert.ok(res.body.usage, 'it is the quota refusal, not an attempt limit')
  assert.equal(ledger.ran, 0)
  assert.equal(counted(db, 'ai-uid-minute'), 1, 'the account counters still count it')
  for (const bucket of ADDRESS_AND_SITE) assert.equal(counted(db, bucket), 0, bucket)
})

test('handler: the brand-starter path is the same: a quota refusal spends neither shared counter', async () => {
  const { call, db, quota } = loadAi()
  quota.limit = 0
  const res = await call({ task: 'brand-starter' })
  assert.equal(res.statusCode, 429)
  for (const bucket of ADDRESS_AND_SITE) assert.equal(counted(db, bucket), 0, bucket)
})

test('handler: quota-refused retries from one address do not lock out the next person on it', async () => {
  const { call, ledger, db, quota } = loadAi()
  quota.limit = 0
  // Well past the 30 a day an address is allowed, each from a different account.
  for (let i = 0; i < IP_DAY.limit + 10; i += 1) assert.equal((await call(GOOD, '203.0.113.7', { uid: `spent${i}` })).statusCode, 429)
  quota.limit = 1000
  const res = await call(GOOD, '203.0.113.7', { uid: 'fresh' })
  assert.equal(res.statusCode, 200, 'their own first generation went ahead')
  assert.equal(ledger.ran, 1)
  assert.equal(counted(db, 'ai-ip-day'), 1, 'only the request that reached the provider was counted')
})

test('handler: quota-refused calls from many throwaway accounts do not fill the site counter against a Pro account', async () => {
  const { call, ledger, db, quota } = loadAi()
  quota.limit = 0
  for (let i = 0; i < SITE_PRO.limit + 20; i += 1) {
    assert.equal((await call(GOOD, `192.0.2.${(i % 250) + 1}`, { uid: `throwaway${i}` })).statusCode, 429)
  }
  quota.limit = 1000
  assert.equal((await call(GOOD, '198.51.100.9', { uid: 'free-fresh' })).statusCode, 200)
  assert.equal((await call(GOOD, '198.51.100.10', { uid: 'paying', user: PRO_USER })).statusCode, 200)
  assert.equal(ledger.ran, 2)
  assert.equal(counted(db, 'ai-site-day'), 1)
  assert.equal(counted(db, 'ai-site-day-pro'), 1)
})

test('handler: the shared counters are spent only after the unit is reserved (a spent quota leaves the address counter at one)', async () => {
  const { call, db, quota } = loadAi()
  quota.limit = 1
  assert.equal((await call(GOOD, '203.0.113.7', { uid: 'a' })).statusCode, 200)
  assert.equal((await call(GOOD, '203.0.113.7', { uid: 'a' })).statusCode, 429, 'the second is over the quota')
  assert.equal(counted(db, 'ai-ip-day'), 1)
  assert.equal(counted(db, 'ai-site-day'), 1)
})

test('handler: a request the address limit refuses after the unit is reserved gives the unit back', async () => {
  const { call, ledger, db } = loadAi()
  for (let i = 0; i < IP_DAY.limit; i += 1) await shared(db, { uid: `other${i}` })
  const res = await call(GOOD)
  assert.equal(res.statusCode, 429)
  assert.equal(res.body.rateLimited, 'ip')
  assert.ok(Number(res.headers['Retry-After']) > 0)
  assert.equal(ledger.reserved, 1, 'the unit was reserved first')
  assert.equal(ledger.ran, 0, 'and the provider was never called')
  assert.equal(heldUnits(db), 0, 'every reserved unit (month and day) was given back')
})

test('handler: a request the site limit refuses after the unit is reserved gives the unit back', async () => {
  const { call, ledger, db } = loadAi()
  for (let i = 0; i < SITE.limit; i += 1) await shared(db, { uid: `other${i}`, ip: `192.0.2.${i + 1}` })
  const res = await call(GOOD, '198.51.100.77')
  assert.equal(res.statusCode, 429)
  assert.equal(res.body.rateLimited, 'site')
  assert.equal(ledger.ran, 0)
  assert.equal(heldUnits(db), 0)
})

test('handler: the brand-starter path also gives its unit back when a shared limit refuses it', async () => {
  const { call, ledger, db } = loadAi()
  for (let i = 0; i < IP_DAY.limit; i += 1) await shared(db, { uid: `other${i}` })
  const res = await call({ task: 'brand-starter' })
  assert.equal(res.body.rateLimited, 'ip')
  assert.equal(ledger.ran, 0)
  assert.equal(heldUnits(db), 0)
})

test('handler: a unit that went to the provider stays spent (the refund is only for a refusal)', async () => {
  const { call, db } = loadAi()
  assert.equal((await call(GOOD)).statusCode, 200)
  assert.equal(heldUnits(db), 2, 'one for the month and one for the day')
})

test('handler: a refused request that reserved a unit keeps its account attempt (attempts are never given back)', async () => {
  const { call, db } = loadAi()
  for (let i = 0; i < IP_DAY.limit; i += 1) await shared(db, { uid: `other${i}` })
  await call(GOOD)
  assert.equal(counted(db, 'ai-uid-minute'), 1)
  assert.equal(counted(db, 'ai-uid-hour'), 1)
})

test('handler: Pro is not shut out by a full non-Pro site bucket, and keeps its own', async () => {
  const { call, ledger, db } = loadAi()
  for (let i = 0; i < SITE.limit; i += 1) await shared(db, { uid: `other${i}`, ip: `192.0.2.${i + 1}` })
  assert.equal((await call(GOOD, '198.51.100.77')).body.rateLimited, 'site', 'a free account is shut out')
  const pro = await call(GOOD, '198.51.100.78', { uid: 'paying', user: PRO_USER })
  assert.equal(pro.statusCode, 200, 'the paying account still runs')
  assert.equal(ledger.ran, 1)
  assert.equal(counted(db, 'ai-site-day-pro'), 1)
})

test('handler: a Pro account is refused by the Pro site bucket, once that one is full', async () => {
  const { call, ledger, db } = loadAi()
  for (let i = 0; i < SITE_PRO.limit; i += 1) await shared(db, { uid: `other${i}`, planId: 'pro' })
  const res = await call(GOOD, '198.51.100.78', { uid: 'paying', user: PRO_USER })
  assert.equal(res.statusCode, 429)
  assert.equal(res.body.rateLimited, 'site')
  assert.equal(ledger.ran, 0)
  assert.equal(heldUnits(db), 0)
})

test('handler: the checks run in order: input, account limits, quota, then address and site (source order)', () => {
  assert.equal((aiSource.match(/await refuseBeforeMeter\(/g) || []).length, 2, 'both metered paths call refuseBeforeMeter')
  assert.equal((aiSource.match(/await refuseSharedAttempt\(/g) || []).length, 2, 'both metered paths spend the shared counters')
  const meter = [...aiSource.matchAll(/await runMeteredTask\(\{/g)].map((m) => m.index)
  const guard = [...aiSource.matchAll(/await refuseBeforeMeter\(/g)].map((m) => m.index)
  const spend = [...aiSource.matchAll(/await refuseSharedAttempt\(/g)].map((m) => m.index)
  const runCall = [...aiSource.matchAll(/await task\.run\(/g)].map((m) => m.index)
  for (let i = 0; i < 2; i += 1) {
    assert.ok(guard[i] < meter[i], `path ${i + 1}: the account checks sit ahead of the meter`)
    assert.ok(meter[i] < spend[i], `path ${i + 1}: the shared counters are spent inside the metered run`)
    assert.ok(spend[i] < runCall[i], `path ${i + 1}: and before the provider call`)
  }
})

test('handler: the account checks never touch the shared counters', () => {
  const body = aiSource.slice(aiSource.indexOf('async function refuseBeforeMeter'), aiSource.indexOf('async function refuseSharedAttempt'))
  assert.ok(body.includes('aiAccountRefusal('))
  assert.ok(!body.includes('aiSharedRefusal('), 'refuseBeforeMeter must not spend the address or site counter')
})
