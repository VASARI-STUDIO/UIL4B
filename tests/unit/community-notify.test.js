// The owner's "email me about community submissions" feature: the threshold and
// validation rules (pure), and the two request types (`community-submission`,
// `admin-settings`) run through the real handler against a fake Firestore whose
// transactions are serialised, as Firestore's effectively are.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FRESH_MS, PENDING_KEEP, MAIL_CAP,
  parseNotifyBody, postedAtMs, isFresh, describePost, readSettings, planCount, planRestore,
  validateSettingsInput, publicSettings, buildDigest, handleCommunityNotify,
} from '../../api/_lib/communityNotify.js'
import { handleSupport } from '../../api/support.js'
import { consume } from '../../api/_lib/rateLimit.js'

const NOW = Date.parse('2026-01-15T10:00:00.000Z')
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString()

// ── Pure helpers ─────────────────────────────────────────────────────────────

test('only the two community collections and a plain document id are accepted', () => {
  assert.deepEqual(parseNotifyBody({ collection: 'community-submissions', id: 'abc_DEF-123' }), { collection: 'community-submissions', id: 'abc_DEF-123' })
  assert.deepEqual(parseNotifyBody({ collection: 'community-prompts', id: 'x' }), { collection: 'community-prompts', id: 'x' })
  for (const bad of [
    null, undefined, 'x', [], {},
    { collection: 'users', id: 'abc' },
    { collection: 'feedback', id: 'abc' },
    { collection: 'community-submissions' },
    { collection: 'community-submissions', id: '' },
    { collection: 'community-submissions', id: 'a/b' },
    { collection: 'community-submissions', id: '..' },
    { collection: 'community-submissions', id: 'x'.repeat(129) },
    { collection: 'community-submissions', id: 42 },
    { collection: ['community-submissions'], id: 'abc' },
  ]) {
    assert.equal(parseNotifyBody(bad), null, JSON.stringify(bad))
  }
})

test('a post is fresh for ten minutes and not when it is older or from the future', () => {
  assert.equal(FRESH_MS, 10 * 60 * 1000)
  assert.equal(isFresh({ createdAt: minutesAgo(1) }, NOW), true)
  assert.equal(isFresh({ createdAt: minutesAgo(9) }, NOW), true)
  assert.equal(isFresh({ createdAt: minutesAgo(11) }, NOW), false)
  assert.equal(isFresh({ createdAt: minutesAgo(-1) }, NOW), true, 'a clock a little ahead is allowed')
  assert.equal(isFresh({ createdAt: minutesAgo(-30) }, NOW), false)
  assert.equal(isFresh({ createdAt: 'not a date' }, NOW), false)
  assert.equal(isFresh({}, NOW), false)
  assert.equal(isFresh(null, NOW), false)
})

test('the server stamp wins over the browser date when there is one', () => {
  const stamp = { toMillis: () => NOW - 60_000 }
  assert.equal(postedAtMs({ submittedAt: stamp, createdAt: minutesAgo(500) }), NOW - 60_000)
  assert.equal(isFresh({ submittedAt: stamp, createdAt: minutesAgo(500) }, NOW), true)
  assert.ok(Number.isNaN(postedAtMs({ submittedAt: 'junk', createdAt: minutesAgo(1) })), 'a stamp that is not a timestamp is not trusted')
})

test('describePost keeps one clipped line per field and names a prompt by its title', () => {
  const sub = describePost('community-submissions', { kind: 'gradient', name: 'Sunset\r\nBcc: x', authorName: 'A'.repeat(200), createdAt: minutesAgo(1) })
  assert.equal(sub.kind, 'gradient')
  assert.ok(!/[\r\n]/.test(sub.name))
  assert.equal(sub.authorName.length, 60)
  const prompt = describePost('community-prompts', { title: 'A prompt', name: 'ignored', authorName: 'Sam' })
  assert.equal(prompt.kind, 'prompt')
  assert.equal(prompt.name, 'A prompt')
  assert.equal(describePost('community-submissions', { kind: 42, name: {} }).kind, 'submission')
})

test('settings read back from storage are always valid', () => {
  assert.deepEqual(readSettings(null), { enabled: true, everyN: 1, sinceLast: 0, pending: [] })
  assert.equal(readSettings({ enabled: false }).enabled, false)
  assert.equal(readSettings({ enabled: 'no' }).enabled, true, 'only an explicit false switches it off')
  for (const bad of [0, -3, 101, 2.5, '5', NaN, null]) assert.equal(readSettings({ everyN: bad }).everyN, 1, String(bad))
  assert.equal(readSettings({ everyN: 100 }).everyN, 100)
  assert.equal(readSettings({ sinceLast: -2 }).sinceLast, 0)
  const many = Array.from({ length: PENDING_KEEP + 5 }, (_, i) => ({ name: `n${i}` }))
  const kept = readSettings({ pending: many }).pending
  assert.equal(kept.length, PENDING_KEEP)
  assert.equal(kept.at(-1).name, `n${PENDING_KEEP + 4}`, 'the newest are kept')
})

test('planCount waits until the threshold, then asks for one email and resets', () => {
  const item = (n) => ({ collection: 'community-submissions', kind: 'gradient', name: `g${n}`, authorName: 'A', createdAt: '' })
  let s = { enabled: true, everyN: 3, sinceLast: 0, pending: [] }
  const first = planCount(s, item(1))
  assert.equal(first.send, null)
  assert.equal(first.next.sinceLast, 1)
  const second = planCount(first.next, item(2))
  assert.equal(second.send, null)
  const third = planCount(second.next, item(3))
  assert.equal(third.send.total, 3)
  assert.deepEqual(third.send.items.map((i) => i.name), ['g1', 'g2', 'g3'])
  assert.equal(third.next.sinceLast, 0)
  assert.deepEqual(third.next.pending, [])
  assert.equal(third.next.everyN, 3, 'the setting survives the reset')

  s = { enabled: true, everyN: 1, sinceLast: 0, pending: [] }
  assert.equal(planCount(s, item(1)).send.total, 1, '1 means every submission')
  // Lowering the threshold below the running count sends on the next post.
  assert.equal(planCount({ enabled: true, everyN: 2, sinceLast: 5, pending: [] }, item(9)).send.total, 6)
})

test('planRestore puts unsent items back in front of anything newer', () => {
  const send = { total: 2, items: [{ name: 'a' }, { name: 'b' }] }
  const back = planRestore({ enabled: true, everyN: 2, sinceLast: 1, pending: [{ name: 'c' }] }, send)
  assert.equal(back.sinceLast, 3)
  assert.deepEqual(back.pending.map((i) => i.name), ['a', 'b', 'c'])
})

test('settings input must be a boolean and a whole number from 1 to 100', () => {
  assert.deepEqual(validateSettingsInput({ enabled: true, everyN: 1 }), { value: { enabled: true, everyN: 1 } })
  assert.deepEqual(validateSettingsInput({ enabled: false, everyN: 100 }), { value: { enabled: false, everyN: 100 } })
  for (const bad of [
    null, {}, { enabled: true }, { everyN: 1 },
    { enabled: 'true', everyN: 1 }, { enabled: 1, everyN: 1 },
    { enabled: true, everyN: 0 }, { enabled: true, everyN: 101 }, { enabled: true, everyN: -1 },
    { enabled: true, everyN: 1.5 }, { enabled: true, everyN: '5' }, { enabled: true, everyN: NaN },
    { enabled: true, everyN: Infinity }, { enabled: true, everyN: [3] },
  ]) {
    assert.ok(validateSettingsInput(bad).error, JSON.stringify(bad))
  }
})

test('only the three public settings leave the server', () => {
  const out = publicSettings({ enabled: true, everyN: 4, sinceLast: 2, pending: [{ name: 'x' }], updatedBy: 'uid' })
  assert.deepEqual(out, { enabled: true, everyN: 4, sinceLast: 2 })
})

test('the email escapes what visitors wrote and keeps the subject to a count', () => {
  const { subject, html } = buildDigest({
    total: 3,
    items: [{ collection: 'community-submissions', kind: '<b>kind</b>', name: '<script>alert(1)</script>', authorName: 'A & "B"', createdAt: '2026-01-15T09:59:00.000Z' }],
  })
  assert.equal(subject, '[UIL4B community] 3 new submissions waiting')
  assert.equal(buildDigest({ total: 1, items: [] }).subject, '[UIL4B community] 1 new submission waiting')
  assert.ok(!html.includes('<script>'), 'markup from a visitor must not survive')
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('A &amp; &quot;B&quot;'))
  assert.ok(html.includes('and 2 more'), 'the listing says how many were left out')
  assert.ok(html.includes('https://uil4b.com/admin'))
})

// ── Fake Firestore ───────────────────────────────────────────────────────────

function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed))
  let chain = Promise.resolve()
  const ref = (name, id) => ({
    key: `${name}/${id}`,
    get: async () => ({ exists: docs.has(`${name}/${id}`), data: () => docs.get(`${name}/${id}`) }),
  })
  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(name, id) }),
    // Transactions run one at a time, so two claims cannot both read the old count.
    runTransaction: (fn) => {
      const run = chain.then(async () => {
        const writes = []
        const result = await fn({
          get: async (r) => { await Promise.resolve(); return r.get() },
          set: (r, value, opts) => writes.push(() => docs.set(r.key, opts?.merge ? { ...(docs.get(r.key) || {}), ...value } : value)),
          update: (r, value) => writes.push(() => {
            if (!docs.has(r.key)) throw new Error('no document to update')
            docs.set(r.key, { ...docs.get(r.key), ...value })
          }),
        })
        writes.forEach((w) => w())
        return result
      })
      chain = run.catch(() => {})
      return run
    },
  }
}

const SETTINGS_KEY = 'admin-settings/community-notify'

function withEnv(t, extra = {}) {
  const keys = ['RESEND_API' + '_KEY', 'SUPPORT_NOTIFY_EMAIL', 'ADMIN_EMAILS']
  const saved = keys.map((k) => process.env[k])
  process.env[keys[0]] = 'fake'
  process.env.SUPPORT_NOTIFY_EMAIL = 'owner@example.test'
  process.env.ADMIN_EMAILS = 'owner@example.test'
  for (const [k, v] of Object.entries(extra)) { if (v === null) delete process.env[k]; else process.env[k] = v }
  t.after(() => keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i] }))
}

function stubFetch(t, { ok = true, throws = false } = {}) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) })
    if (throws) throw new Error('network down')
    return { ok, status: ok ? 200 : 500 }
  })
  return calls
}

const tokens = {
  alice: { uid: 'alice', email: 'alice@example.test', email_verified: true },
  mallory: { uid: 'mallory', email: 'mallory@example.test', email_verified: true },
  owner: { uid: 'owner-uid', email: 'owner@example.test', email_verified: true },
  ownerUnverified: { uid: 'owner-uid', email: 'owner@example.test', email_verified: false },
}
const verifyToken = async (token) => {
  if (!tokens[token]) throw new Error('bad token')
  return tokens[token]
}

let ipCounter = 0
async function call(db, body, { token = 'alice', pending = [], now = () => NOW, ip } = {}) {
  const res = { code: 0, body: null, headers: {}, setHeader(k, v) { res.headers[k] = v }, status(c) { res.code = c; return res }, json(b) { res.body = b; return res }, end() { return res } }
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': ip || `198.51.100.${(ipCounter++ % 250) + 1}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body,
  }
  await handleCommunityNotify(req, res, { getDb: () => db, verifyToken, defer: (p) => pending.push(p), now })
  await Promise.all(pending)
  return res
}

const post = (over = {}) => ({ kind: 'gradient', name: 'Sunset', authorUid: 'alice', authorName: 'Alice', status: 'pending', createdAt: minutesAgo(1), payload: {}, ...over })
const claim = (id = 'p1', collection = 'community-submissions') => ({ type: 'community-submission', collection, id })

test('a fresh pending post by the caller is counted and emailed, once', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post() })

  const res = await call(db, claim())

  assert.equal(res.code, 200)
  assert.deepEqual(res.body, { ok: true })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, 'https://api.resend.com/emails')
  assert.deepEqual(sent[0].body.to, ['owner@example.test'])
  assert.equal(sent[0].body.subject, '[UIL4B community] 1 new submission waiting')
  assert.ok(sent[0].body.html.includes('Sunset'))
  assert.ok(db.docs.get('community-submissions/p1').notifiedAt, 'the post is marked as counted')
  assert.deepEqual(readSettings(db.docs.get(SETTINGS_KEY)), { enabled: true, everyN: 1, sinceLast: 0, pending: [] })
})

test('the same post claimed again, or in two requests at once, is counted once', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post(), [SETTINGS_KEY]: { enabled: true, everyN: 5, sinceLast: 0, pending: [] } })

  await Promise.all([call(db, claim()), call(db, claim()), call(db, claim())])
  await call(db, claim())

  assert.equal(db.docs.get(SETTINGS_KEY).sinceLast, 1)
  assert.equal(sent.length, 0)
})

test('with every-N set, nothing is sent until the Nth post, which lists them all', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({
    [SETTINGS_KEY]: { enabled: true, everyN: 3, sinceLast: 0, pending: [] },
    'community-submissions/a': post({ name: 'First' }),
    'community-prompts/b': { title: 'Second prompt', authorUid: 'alice', authorName: 'Alice', status: 'pending', createdAt: minutesAgo(1) },
    'community-submissions/c': post({ name: 'Third' }),
  })

  await call(db, claim('a'))
  await call(db, claim('b', 'community-prompts'))
  assert.equal(sent.length, 0)
  assert.equal(db.docs.get(SETTINGS_KEY).sinceLast, 2)

  await call(db, claim('c'))
  assert.equal(sent.length, 1)
  assert.equal(sent[0].body.subject, '[UIL4B community] 3 new submissions waiting')
  for (const text of ['First', 'Second prompt', 'Third']) assert.ok(sent[0].body.html.includes(text), text)
  assert.equal(db.docs.get(SETTINGS_KEY).sinceLast, 0)
})

test('a claim that does not match the stored post counts nothing and says nothing', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const cases = {
    'someone else\'s post': post({ authorUid: 'bob' }),
    'an approved post': post({ status: 'approved' }),
    'an old post': post({ createdAt: minutesAgo(30) }),
    'an already-counted post': post({ notifiedAt: minutesAgo(1) }),
  }
  for (const [label, doc] of Object.entries(cases)) {
    const db = fakeDb({ 'community-submissions/p1': doc })
    const res = await call(db, claim())
    assert.equal(res.code, 200, label)
    assert.deepEqual(res.body, { ok: true }, label)
    assert.equal(db.docs.has(SETTINGS_KEY), false, `${label} must not touch the counter`)
  }
  const missing = await call(fakeDb(), claim('nope'))
  assert.deepEqual(missing.body, { ok: true })
  assert.equal(sent.length, 0)
})

test('a signed-in caller cannot count another user\'s post', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post({ authorUid: 'alice' }) })
  await call(db, claim(), { token: 'mallory' })
  assert.equal(sent.length, 0)
  assert.equal(db.docs.get('community-submissions/p1').notifiedAt, undefined)
})

test('no token, a bad token, or a malformed body is refused without touching data', async (t) => {
  withEnv(t)
  stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post() })
  assert.equal((await call(db, claim(), { token: null })).code, 401)
  assert.equal((await call(db, claim(), { token: 'forged' })).code, 401)
  assert.equal((await call(db, { type: 'community-submission', collection: 'users', id: 'p1' })).code, 400)
  assert.equal((await call(db, { type: 'community-submission', collection: 'community-submissions', id: '../x' })).code, 400)
  assert.equal(db.docs.has(SETTINGS_KEY), false)
})

test('switched off, or with no email configured, nothing is counted', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const off = fakeDb({ 'community-submissions/p1': post(), [SETTINGS_KEY]: { enabled: false, everyN: 1, sinceLast: 0, pending: [] } })
  await call(off, claim())
  assert.equal(off.docs.get(SETTINGS_KEY).sinceLast, 0)
  assert.equal(off.docs.get('community-submissions/p1').notifiedAt, undefined)

  delete process.env.SUPPORT_NOTIFY_EMAIL
  const unconfigured = fakeDb({ 'community-submissions/p1': post() })
  const res = await call(unconfigured, claim())
  assert.equal(res.code, 200)
  assert.equal(unconfigured.docs.has(SETTINGS_KEY), false)
  assert.equal(sent.length, 0)
})

for (const [label, mode] of [['refuses it', { ok: false }], ['is unreachable', { throws: true }]]) {
  test(`an email that fails to send (the provider ${label}) is put back for the next one`, async (t) => {
    t.mock.method(console, 'error', () => {})
    withEnv(t)
    stubFetch(t, mode)
    const db = fakeDb({ 'community-submissions/p1': post() })

    const res = await call(db, claim())

    assert.equal(res.code, 200, 'the caller is never told about the email')
    const stored = readSettings(db.docs.get(SETTINGS_KEY))
    assert.equal(stored.sinceLast, 1)
    assert.equal(stored.pending[0].name, 'Sunset')
  })
}

test('past the hourly email cap the items are held, not lost', async (t) => {
  t.mock.method(console, 'warn', () => {})
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post() })
  for (let i = 0; i < MAIL_CAP.limit; i++) assert.equal((await consume(db, MAIL_CAP)).allowed, true)

  const res = await call(db, claim())

  assert.equal(res.code, 200)
  assert.equal(sent.length, 0)
  assert.equal(readSettings(db.docs.get(SETTINGS_KEY)).sinceLast, 1)
})

test('the caller is limited per account', async (t) => {
  withEnv(t)
  stubFetch(t)
  const db = fakeDb()
  let refused = 0
  for (let i = 0; i < 25; i++) {
    const res = await call(db, claim(`id${i}`), { ip: `192.0.2.${i + 1}` })
    if (res.code === 429) refused++
  }
  assert.equal(refused, 5, '20 an hour per account')
})

// ── Admin settings ───────────────────────────────────────────────────────────

test('only a verified allowlisted email can read or change the settings', async (t) => {
  withEnv(t)
  const db = fakeDb()
  for (const token of ['alice', 'ownerUnverified']) {
    const get = await call(db, { type: 'admin-settings', action: 'get' }, { token })
    assert.equal(get.code, 403, token)
    assert.equal(get.body.enabled, undefined, 'a refusal carries no settings')
    const set = await call(db, { type: 'admin-settings', action: 'set', enabled: false, everyN: 9 }, { token })
    assert.equal(set.code, 403, token)
  }
  assert.equal(db.docs.has(SETTINGS_KEY), false)
  assert.equal((await call(db, { type: 'admin-settings', action: 'get' }, { token: null })).code, 401)
})

test('with no admin list configured nobody is an administrator', async (t) => {
  withEnv(t, { ADMIN_EMAILS: null })
  const res = await call(fakeDb(), { type: 'admin-settings', action: 'get' }, { token: 'owner' })
  assert.equal(res.code, 403)
})

test('an administrator reads the defaults, saves a change, and keeps the running count', async (t) => {
  withEnv(t)
  const db = fakeDb()
  const first = await call(db, { type: 'admin-settings', action: 'get' }, { token: 'owner' })
  assert.deepEqual(first.body, { ok: true, enabled: true, everyN: 1, sinceLast: 0, emailConfigured: true })

  db.docs.set(SETTINGS_KEY, { enabled: true, everyN: 10, sinceLast: 4, pending: [{ name: 'x' }] })
  const saved = await call(db, { type: 'admin-settings', action: 'set', enabled: false, everyN: 7 }, { token: 'owner' })
  assert.deepEqual(saved.body, { ok: true, enabled: false, everyN: 7, sinceLast: 4, emailConfigured: true })
  const stored = db.docs.get(SETTINGS_KEY)
  assert.equal(stored.pending.length, 1)
  assert.equal(stored.updatedBy, 'owner-uid')
  assert.equal(stored.updatedBy.includes('@'), false, 'no address is stored')
})

test('an invalid change is refused and nothing is stored', async (t) => {
  withEnv(t)
  const db = fakeDb()
  for (const body of [
    { action: 'set', enabled: true, everyN: 0 },
    { action: 'set', enabled: true, everyN: 101 },
    { action: 'set', enabled: 'yes', everyN: 5 },
    { action: 'set', enabled: true, everyN: '5' },
    { action: 'set' },
    { action: 'delete' },
    {},
  ]) {
    const res = await call(db, { type: 'admin-settings', ...body }, { token: 'owner' })
    assert.equal(res.code, 400, JSON.stringify(body))
  }
  assert.equal(db.docs.has(SETTINGS_KEY), false)
})

test('the settings report whether email is configured, without revealing the address or key', async (t) => {
  withEnv(t, { SUPPORT_NOTIFY_EMAIL: null })
  const res = await call(fakeDb(), { type: 'admin-settings', action: 'get' }, { token: 'owner' })
  assert.equal(res.body.emailConfigured, false)
  assert.ok(!JSON.stringify(res.body).includes('example.test'))
})

// ── Counting rules, end to end ───────────────────────────────────────────────

const mailCapKey = (db) => [...db.docs.keys()].find((k) => k.startsWith('rate-limits/community-notify-mail_'))

test('with every-1, each post gets its own email and a replay of one adds none', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({
    'community-submissions/a': post({ name: 'Alpha' }),
    'community-submissions/b': post({ name: 'Bravo' }),
    'community-prompts/c': { title: 'Charlie', authorUid: 'alice', authorName: 'Alice', status: 'pending', createdAt: minutesAgo(1) },
  })

  await call(db, claim('a'))
  await call(db, claim('b'))
  await call(db, claim('c', 'community-prompts'))
  await Promise.all([call(db, claim('a')), call(db, claim('b')), call(db, claim('a'))])

  assert.equal(sent.length, 3, 'one email per post, none for the replays')
  assert.deepEqual(sent.map((s) => s.body.subject), Array(3).fill('[UIL4B community] 1 new submission waiting'))
  assert.deepEqual(['Alpha', 'Bravo', 'Charlie'].map((n, i) => sent[i].body.html.includes(n)), [true, true, true])
  assert.equal(readSettings(db.docs.get(SETTINGS_KEY)).sinceLast, 0)
})

test('a replayed id is only ever counted once towards a threshold', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({
    [SETTINGS_KEY]: { enabled: true, everyN: 2, sinceLast: 0, pending: [] },
    'community-submissions/a': post({ name: 'Alpha' }),
    'community-submissions/b': post({ name: 'Bravo' }),
  })
  for (let i = 0; i < 4; i++) await call(db, claim('a'))
  assert.equal(sent.length, 0, 'four claims of one post are not two posts')
  await call(db, claim('b'))
  assert.equal(sent.length, 1)
  assert.ok(sent[0].body.subject.includes(' 2 new '))
})

test('a claim that does not qualify gets exactly the answer a counted one gets', async (t) => {
  withEnv(t)
  stubFetch(t)
  const counted = await call(fakeDb({ 'community-submissions/p1': post() }), claim())
  const unqualified = {
    'another user': { 'community-submissions/p1': post({ authorUid: 'bob' }) },
    'not pending (approved)': { 'community-submissions/p1': post({ status: 'approved' }) },
    'not pending (rejected)': { 'community-submissions/p1': post({ status: 'rejected' }) },
    'just over ten minutes old': { 'community-submissions/p1': post({ createdAt: minutesAgo(10.5) }) },
    'dated in the future': { 'community-submissions/p1': post({ createdAt: minutesAgo(-60) }) },
    'no date at all': { 'community-submissions/p1': post({ createdAt: undefined }) },
    'a document that does not exist': {},
    'the id of a post in the other collection': { 'community-prompts/p1': post() },
  }
  for (const [label, seed] of Object.entries(unqualified)) {
    const db = fakeDb(seed)
    const res = await call(db, claim())
    assert.equal(res.code, counted.code, label)
    assert.deepEqual(res.body, counted.body, label)
    assert.equal(db.docs.has(SETTINGS_KEY), false, `${label} must not touch the counter`)
  }
  const fresh = fakeDb({ 'community-submissions/p1': post({ createdAt: minutesAgo(9.5) }) })
  await call(fresh, claim())
  assert.ok(fresh.docs.get('community-submissions/p1').notifiedAt, 'nine and a half minutes is still fresh')
})

test('an unknown collection and a malformed id are all turned away alike, and count nothing', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post(), 'users/p1': post() })
  const bad = [
    { collection: 'users', id: 'p1' },
    { collection: 'admin-settings', id: 'community-notify' },
    { collection: 'community-submissions/p1/x', id: 'p1' },
    { collection: 'community-submissions', id: '../x' },
    { collection: 'community-submissions', id: '' },
    { collection: 'community-submissions', id: 'x'.repeat(5000) },
    { collection: 'community-submissions', id: 'p1/../p1' },
    { collection: 'community-submissions', id: 'p 1' },
    { collection: 'community-submissions' },
    { id: 'p1' },
  ]
  const shapes = new Set()
  for (const body of bad) {
    const res = await call(db, { type: 'community-submission', ...body })
    assert.equal(res.code, 400, JSON.stringify(body).slice(0, 80))
    shapes.add(JSON.stringify(res.body))
  }
  assert.equal(shapes.size, 1, 'one answer for every bad request')
  assert.equal(db.docs.has(SETTINGS_KEY), false)
  assert.equal(db.docs.get('community-submissions/p1').notifiedAt, undefined)
  assert.equal(sent.length, 0)
})

test('with the setting off, no post is counted or emailed, and it stays uncounted for later', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/p1': post(), [SETTINGS_KEY]: { enabled: false, everyN: 1, sinceLast: 0, pending: [] } })
  const res = await call(db, claim())
  assert.deepEqual(res.body, { ok: true })
  assert.equal(sent.length, 0)
  assert.equal(db.docs.get('community-submissions/p1').notifiedAt, undefined)
})

test('past the email cap the items are kept and go out together in the next email', async (t) => {
  t.mock.method(console, 'warn', () => {})
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({ 'community-submissions/a': post({ name: 'Held one' }), 'community-submissions/b': post({ name: 'Next one' }) })
  for (let i = 0; i < MAIL_CAP.limit; i++) await consume(db, MAIL_CAP)

  await call(db, claim('a'))
  assert.equal(sent.length, 0)
  assert.equal(readSettings(db.docs.get(SETTINGS_KEY)).pending[0].name, 'Held one')

  db.docs.delete(mailCapKey(db)) // the hour rolls over
  await call(db, claim('b'))

  assert.equal(sent.length, 1)
  assert.equal(sent[0].body.subject, '[UIL4B community] 2 new submissions waiting')
  assert.ok(sent[0].body.html.includes('Held one') && sent[0].body.html.includes('Next one'))
  assert.deepEqual(readSettings(db.docs.get(SETTINGS_KEY)), { enabled: true, everyN: 1, sinceLast: 0, pending: [] })
})

test('after a provider failure the kept items are sent with the next post', async (t) => {
  t.mock.method(console, 'error', () => {})
  withEnv(t)
  let up = false
  const bodies = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    bodies.push(JSON.parse(init.body))
    return { ok: up, status: up ? 200 : 503 }
  })
  const db = fakeDb({ 'community-submissions/a': post({ name: 'Lost then found' }), 'community-submissions/b': post({ name: 'Later' }) })

  await call(db, claim('a'))
  assert.equal(readSettings(db.docs.get(SETTINGS_KEY)).sinceLast, 1)
  up = true
  await call(db, claim('b'))

  assert.equal(bodies.length, 2)
  assert.equal(bodies[1].subject, '[UIL4B community] 2 new submissions waiting')
  assert.ok(bodies[1].html.includes('Lost then found'))
  assert.equal(readSettings(db.docs.get(SETTINGS_KEY)).sinceLast, 0)
})

test('what a visitor typed is escaped in the email and never reaches the subject', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  const db = fakeDb({
    'community-submissions/p1': post({ name: '<script>alert(1)</script>', authorName: '<img src=x onerror=alert(2)>', kind: '<b>x</b>' }),
  })
  await call(db, claim())
  assert.equal(sent.length, 1)
  assert.match(sent[0].body.subject, /^\[UIL4B community\] \d+ new submissions? waiting$/)
  const { html } = sent[0].body
  assert.ok(!html.includes('<script') && !html.includes('<img') && !html.includes('<b>x'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
})

// ── Admin settings, end to end ───────────────────────────────────────────────

tokens.moderator = { uid: 'mod-uid', email: 'moderator@example.test', email_verified: true, moderator: true }
tokens.adminClaimOnly = { uid: 'claim-uid', email: 'claim@example.test', email_verified: true, admin: true }

test('a moderator, or a token that only claims admin, is refused for both actions', async (t) => {
  withEnv(t)
  const db = fakeDb({ [SETTINGS_KEY]: { enabled: true, everyN: 4, sinceLast: 2, pending: [] } })
  for (const token of ['moderator', 'adminClaimOnly']) {
    for (const body of [{ action: 'get' }, { action: 'set', enabled: false, everyN: 9 }]) {
      const res = await call(db, { type: 'admin-settings', ...body }, { token })
      assert.equal(res.code, 403, `${token} ${body.action}`)
      assert.deepEqual(Object.keys(res.body), ['error'])
    }
  }
  assert.deepEqual(readSettings(db.docs.get(SETTINGS_KEY)), { enabled: true, everyN: 4, sinceLast: 2, pending: [] })
})

test('an administrator can save 1 and 100 and is refused 0, 101, 2.5, "3" and a missing number', async (t) => {
  withEnv(t)
  const db = fakeDb()
  const set = (extra) => call(db, { type: 'admin-settings', action: 'set', ...extra }, { token: 'owner' })
  assert.equal((await set({ enabled: true, everyN: 1 })).body.everyN, 1)
  assert.equal((await set({ enabled: true, everyN: 100 })).body.everyN, 100)
  for (const bad of [{ everyN: 0 }, { everyN: 101 }, { everyN: 2.5 }, { everyN: '3' }, { everyN: null }, {}]) {
    const res = await set({ enabled: true, ...bad })
    assert.equal(res.code, 400, JSON.stringify(bad))
    assert.equal(typeof res.body.error, 'string')
  }
  assert.equal(db.docs.get(SETTINGS_KEY).everyN, 100, 'a refused change leaves the saved value alone')
})

test('a server fault answers 500 with a fixed message and none of the cause', async (t) => {
  t.mock.method(console, 'error', () => {})
  withEnv(t)
  const SECRET = 'projects/uil4b-prod/databases/(default) permission-denied sk_live_123'
  const faulty = (db) => ({
    ...db,
    runTransaction: (fn) => db.runTransaction((tx) => fn({
      ...tx,
      get: (r) => { if (r.key.startsWith('admin-settings/') || r.key.startsWith('community-')) throw new Error(SECRET); return tx.get(r) },
    })),
  })
  const attempts = [
    ['admin set', { type: 'admin-settings', action: 'set', enabled: true, everyN: 2 }, 'owner'],
    ['submission', claim(), 'alice'],
  ]
  for (const [label, body, token] of attempts) {
    const res = await call(faulty(fakeDb({ 'community-submissions/p1': post() })), body, { token })
    assert.equal(res.code, 500, label)
    assert.ok(!JSON.stringify(res.body).includes('uil4b-prod') && !JSON.stringify(res.body).includes('sk_live'), label)
    assert.equal(res.body.error, 'Something went wrong. Try again shortly.', label)
  }
  const res = await call(null, claim())
  assert.equal(res.code, 500)
})

// ── Dispatch from /api/support ───────────────────────────────────────────────

test('support hands both request types to this handler and stores no feedback for them', async (t) => {
  withEnv(t)
  const sent = stubFetch(t)
  // The route uses the real clock here, so the post is dated now.
  const db = fakeDb({ 'community-submissions/p1': post({ createdAt: new Date().toISOString() }) })
  const res = { code: 0, body: null, setHeader() {}, status(c) { res.code = c; return res }, json(b) { res.body = b; return res }, end() { return res } }
  const pending = []
  const req = { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.77', authorization: 'Bearer alice' }, body: claim() }

  await handleSupport(req, res, { getDb: () => db, defer: (p) => pending.push(p), verifyToken })
  await Promise.all(pending)

  assert.equal(res.code, 200)
  assert.equal([...db.docs.keys()].some((k) => k.startsWith('feedback/')), false)
  assert.equal(sent.length, 1)
})
