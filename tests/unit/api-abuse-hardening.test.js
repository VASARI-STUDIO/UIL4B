// Hardening the two /api surfaces that were reachable without credentials.
//
//   /api/ai?diag=…   enumerated which of the deployment's secrets exist, behind
//                    a password COMMITTED TO THIS REPOSITORY.
//   /api/support     took an unauthenticated POST from any origin and fanned it
//                    out to Firestore + a Sheets webhook + an outbound email,
//                    with no rate limit of any kind.
//
// Everything here runs against the real modules with a fake Firestore, so the
// limiter's transaction logic is exercised rather than described.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { clientIp, hashKey, consume } from '../../api/_lib/rateLimit.js'
import { ADMIN_EMAILS } from '../../api/_lib/admin.js'

const API = path.join(process.cwd(), 'api')
const read = f => fs.readFileSync(path.join(API, f), 'utf8')
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ── The committed password ───────────────────────────────────────────────────

// The point of the whole slice. Written against the CODE, not the prose: both
// files below explain the old gate at length, and an assertion that matched the
// explanation would be green forever while guarding nothing.
test('no /api handler gates anything on a committed literal admin code', () => {
  const offenders = fs.readdirSync(API)
    .filter(f => f.endsWith('.js'))
    .filter(f => /uil4b-dev-\d{4}/.test(stripJs(read(f))))
  assert.deepEqual(offenders, [],
    'a server-side gate is comparing against a string that is published in this repository:\n  ' + offenders.join('\n  '))
})

test('the diagnostic requires a verified administrator, and its break-glass has no default', () => {
  const ai = stripJs(read('ai.js'))
  assert.match(ai, /requireAdmin\(req\)/, 'the diagnostic no longer checks who is asking')
  // `process.env.DIAG_CODE || 'something'` would reintroduce exactly the fault
  // this slice removed, in a form that looks like configuration.
  assert.match(ai, /process\.env\.DIAG_CODE/, 'the break-glass is gone entirely')
  assert.doesNotMatch(ai, /process\.env\.DIAG_CODE\s*(\|\||\?\?)/,
    'DIAG_CODE has a fallback — an unset env var must mean "no break-glass", not "use this string"')
  assert.match(ai, /timingSafeEqual/, 'the break-glass is compared with ===')
})

test('the admin allowlist exists in exactly one place', () => {
  const copies = fs.readdirSync(API)
    .filter(f => f.endsWith('.js'))
    .filter(f => /ADMIN_EMAILS\s*=\s*\[/.test(read(f)))
  assert.deepEqual(copies, [], 'an /api route declares its own admin allowlist instead of importing the shared one')
  assert.ok(ADMIN_EMAILS.length > 0, 'the shared allowlist is empty')
  assert.ok(ADMIN_EMAILS.every(e => e === e.toLowerCase()),
    'an entry is not lowercase — requireAdmin lowercases the token email before comparing, so it could never match')
})

// ── /api/support ─────────────────────────────────────────────────────────────

test('support no longer answers every origin on the internet', () => {
  const support = stripJs(read('support.js'))
  assert.doesNotMatch(support, /Access-Control-Allow-Origin'\s*,\s*'\*'/, 'CORS is still wide open')
  assert.match(support, /allowedOrigins\(\)/, 'the origin allowlist is not consulted')
  assert.match(support, /'Vary',\s*'Origin'/, 'a per-origin ACAO without Vary is a cache-poisoning trap')
})

test('support rate-limits before it does any work', () => {
  const support = stripJs(read('support.js'))
  const limitAt = support.indexOf('consume(')
  const writeAt = support.indexOf("collection('feedback')")
  const mailAt = support.indexOf('api.resend.com')
  assert.ok(limitAt > -1, 'there is no rate limit')
  assert.ok(limitAt < writeAt, 'the Firestore write happens before the limit is consumed')
  assert.ok(limitAt < mailAt, 'the outbound email happens before the limit is consumed')
  assert.match(support, /status\(429\)/, 'a throttled caller is not told so')
  assert.match(support, /'Retry-After'/, 'a 429 without Retry-After tells a client nothing')
})

test('support does not report success for a message it dropped', () => {
  const support = stripJs(read('support.js'))
  assert.match(support, /status\(502\)/,
    'a message that reached neither Firestore nor email still answers 200 — the user is told a bug report landed when it did not')
})

// ── clientIp ─────────────────────────────────────────────────────────────────

test('the client IP is the leftmost x-forwarded-for entry', () => {
  // Vercel overwrites this header and puts the real client first. Reading the
  // RIGHTMOST entry — correct on some other platforms, and a common suggestion
  // — would read a value the caller supplies, letting one attacker present as
  // an unlimited number of distinct clients.
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }), '203.0.113.7')
  assert.equal(clientIp({ headers: { 'x-forwarded-for': ['198.51.100.4'] } }), '198.51.100.4')
  assert.equal(clientIp({ headers: { 'x-real-ip': '192.0.2.9' } }), '192.0.2.9')
  assert.equal(clientIp({ headers: {} }), '')
})

test('the counter key is a hash, so no IP is stored', () => {
  const ip = '203.0.113.7'
  const key = hashKey(ip)
  assert.ok(!key.includes(ip), 'the IP is recoverable from the document id')
  assert.match(key, /^[0-9a-f]{32}$/)
  assert.equal(key, hashKey(ip), 'the same IP must hash to the same bucket or the limiter counts nothing')
  assert.notEqual(key, hashKey('203.0.113.8'))
})

// ── the limiter itself ───────────────────────────────────────────────────────

/** The smallest Firestore that can run `consume` — a Map with a transaction. */
function fakeDb({ failing = false } = {}) {
  const docs = new Map()
  return {
    docs,
    collection: () => ({ doc: (id) => ({ id }) }),
    runTransaction: async (fn) => {
      if (failing) throw new Error('firestore unavailable')
      return fn({
        get: async ({ id }) => ({ exists: docs.has(id), data: () => docs.get(id) }),
        set: ({ id }, value, opts) => docs.set(id, opts?.merge ? { ...docs.get(id), ...value } : value),
      })
    },
  }
}

const WINDOW = { bucket: 'support', key: '203.0.113.7', limit: 3, windowMs: 60000 }

test('the limiter allows exactly `limit` requests, then refuses', async () => {
  const db = fakeDb()
  const verdicts = []
  for (let i = 0; i < 5; i++) verdicts.push(await consume(db, { ...WINDOW, now: 1000 }))
  assert.deepEqual(verdicts.map(v => v.allowed), [true, true, true, false, false])
  assert.deepEqual(verdicts.map(v => v.remaining), [2, 1, 0, 0, 0])
})

test('a refusal says how long to wait, and the window really rolls', async () => {
  const db = fakeDb()
  for (let i = 0; i < 3; i++) await consume(db, { ...WINDOW, now: 1000 })
  const blocked = await consume(db, { ...WINDOW, now: 1000 })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.retryAfter, 60)

  // Mid-window it is still refusing…
  assert.equal((await consume(db, { ...WINDOW, now: 1000 + 59000 })).allowed, false)
  // …and once the window has elapsed the count starts again.
  assert.equal((await consume(db, { ...WINDOW, now: 1000 + 60000 })).allowed, true)
})

test('two keys do not share a budget', async () => {
  const db = fakeDb()
  for (let i = 0; i < 3; i++) await consume(db, { ...WINDOW, now: 1000 })
  assert.equal((await consume(db, { ...WINDOW, now: 1000 })).allowed, false)
  assert.equal((await consume(db, { ...WINDOW, key: '198.51.100.4', now: 1000 })).allowed, true)
})

// A support form that stops accepting bug reports the moment the database
// wobbles turns an availability blip into total loss of the channel users
// report it on. The trade is deliberate and is asserted so it stays deliberate.
test('the limiter fails OPEN when Firestore is unreachable', async () => {
  const verdict = await consume(fakeDb({ failing: true }), { ...WINDOW, now: 1000 })
  assert.equal(verdict.allowed, true)
  assert.equal(verdict.degraded, true)
})

test('an unknown client is not silently given its own private bucket', async () => {
  // clientIp returns '' when there is no header at all. Hashing '' would give
  // every such caller one shared bucket, which is defensible — but pretending
  // to limit is worse than saying so, and the caller returns early instead.
  const verdict = await consume(fakeDb(), { ...WINDOW, key: '', now: 1000 })
  assert.equal(verdict.allowed, true)
})
