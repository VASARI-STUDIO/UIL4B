// GET /api/ai?usage=1 is the only way the dashboard learns an ACCOUNT's AI count.
// serveUsage is the whole decision, with the token, the user document and the
// usage documents injected, so it runs here without Firebase.
//
// MUTATION notes (a test is not trusted until it has been seen to fail):
//   - drop the Bearer check in serveUsage       -> the 401 tests go red
//   - key the day on local time, not UTC        -> the UTC day key test goes red
//   - read uid from the query, not the token    -> the "this account's count" test goes red
//   - return the smaller tool's figures         -> the busiest tool test goes red
//   - aiUsageToday ignores `server`             -> the larger-of-two tests go red
import test from 'node:test'
import assert from 'node:assert/strict'
import { serveUsage, usageDayKey, usageMonthKey } from '../../api/_lib/aiUsage.js'
import { aiUsageToday } from '../../src/components/userhome/workspace.js'
import { PLANS } from '../../api/_lib/plans.js'

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

test('the day key rolls at UTC midnight, not local midnight', () => {
  assert.equal(usageDayKey(new Date('2026-10-27T23:59:59Z')), '2026-10-27')
  assert.equal(usageDayKey(new Date('2026-10-28T00:00:00Z')), '2026-10-28')
  assert.equal(usageDayKey(new Date('2026-10-28T00:00:00Z'), 1), '2026-10-27')
  assert.equal(usageMonthKey(new Date('2026-10-31T23:59:59Z')), 'm2026-10')
  assert.equal(usageMonthKey(new Date('2026-11-01T00:00:00Z')), 'm2026-11')
})

test('the key the endpoint reads is the UTC day', async () => {
  const late = new Date('2026-10-27T23:59:00Z')
  const { read } = await serve({ now: late })
  assert.equal(read[0], 'u-1_2026-10-27')
  const next = new Date('2026-10-28T00:01:00Z')
  assert.equal((await serve({ now: next })).read[0], 'u-1_2026-10-28')
})

/* ── The page's meter: the larger of the account's count and this browser's ── */

const FREE = { limits: { 'ai-default': 5 } }
const local = (n) => (id) => (id === 'alt-text' ? n : 0)

test('with no server figure the meter is this browser\'s count, labelled as such', () => {
  const ai = aiUsageToday(local(2), FREE)
  assert.equal(ai.used, 2)
  assert.equal(ai.source, 'browser')
  assert.equal(ai.month, null)
})

test('the account\'s higher count wins over a lower local one', () => {
  const ai = aiUsageToday(local(0), FREE, { used: 5, limit: 5, monthUsed: 12, monthLimit: 40 })
  assert.equal(ai.used, 5)
  assert.equal(ai.source, 'account')
  assert.deepEqual(ai.month, { used: 12, limit: 40 })
})

test('a higher local count wins over a lower server one', () => {
  assert.equal(aiUsageToday(local(4), FREE, { used: 1, limit: 5 }).used, 4)
})

test('the count never passes the limit', () => {
  assert.equal(aiUsageToday(local(9), FREE, { used: 7, limit: 5 }).used, 5)
})
