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
import { createHash } from 'node:crypto'
import { clientIp, hashKey, consume } from '../../api/_lib/rateLimit.js'
import { ADMIN_EMAILS } from '../../api/_lib/admin.js'
import { stripJs } from '../helpers/strip-comments.js'

const API = path.join(process.cwd(), 'api')
const read = f => fs.readFileSync(path.join(API, f), 'utf8')

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

// ── and the same question asked of every other route ─────────────────────────
//
// support.js was fixed alone and the other seven kept `'*'` for another month.
// Written as a SWEEP rather than seven named assertions so the next route to
// grow a CORS header is covered on the day it is written: any file under /api
// that answers with an Access-Control-Allow-Origin at all has to answer with an
// allowlisted one.
//
// WHAT THIS IS AND IS NOT WORTH. None of these routes authenticates with a
// cookie — every one of them reads a bearer token the browser never attaches by
// itself — so `'*'` was not an ambient-credential CSRF hole and this closes no
// live exploit. It removes reach: with `'*'` any page on the internet could read
// these responses out of a visitor's browser, including the one that deletes an
// account and the one that lists every user. CORS is a browser protection and
// does nothing against curl, which is what the rate limiter and the bearer token
// are for; the three are not interchangeable.
test('no /api route answers every origin on the internet', () => {
  const withCors = fs.readdirSync(API)
    .filter(f => f.endsWith('.js'))
    .map(f => ({ file: f, source: stripJs(read(f)) }))
    .filter(({ source }) => source.includes('Access-Control-Allow-Origin'))

  // The sweep has to be looking at something. Eight routes set CORS headers
  // today; a walk that found one or none would report every route clean.
  assert.ok(withCors.length >= 8,
    `only ${withCors.length} /api routes set a CORS header — this sweep is reading the wrong directory`)

  const wildcards = withCors
    .filter(({ source }) => /Access-Control-Allow-Origin'\s*,\s*'\*'/.test(source))
    .map(({ file }) => file)
  assert.deepEqual(wildcards, [],
    'these routes invite every page on the internet to call them from a visitor\'s browser:\n  '
    + wildcards.join('\n  '))

  const unlisted = withCors.filter(({ source }) => !/allowedOrigins\(\)/.test(source)).map(({ file }) => file)
  assert.deepEqual(unlisted, [],
    'these routes set an Access-Control-Allow-Origin without consulting the shared allowlist in '
    + 'api/_lib/origins.js — a second mechanism is a second thing to get wrong:\n  ' + unlisted.join('\n  '))

  const unvaried = withCors.filter(({ source }) => !/'Vary',\s*'Origin'/.test(source)).map(({ file }) => file)
  assert.deepEqual(unvaried, [],
    'these routes reflect a per-origin ACAO with no Vary: Origin, so a shared cache can serve one origin\'s '
    + 'header to another:\n  ' + unvaried.join('\n  '))
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

// ── the salt ─────────────────────────────────────────────────────────────────
//
// A hash of an IP is only not-an-IP while the salt is unknown. This repository
// is public, so `process.env.RATE_LIMIT_SALT || 'uil4b-rate-limit'` — which is
// what this file used to read — published the salt with the code and made every
// stored hash reversible by 4.3 billion SHA-256s of the IPv4 space. Both halves
// are asserted: the constant must not come back, and the env var must still be
// the thing that decides.

test('an unset salt does not fall back to a constant anybody can read', () => {
  // RATE_LIMIT_SALT is unset in this process — which is the whole point, since
  // it is the misconfigured deployment that the old fallback silently served.
  assert.equal(process.env.RATE_LIMIT_SALT, undefined,
    'this test needs RATE_LIMIT_SALT unset to mean anything; something in the suite set it')

  const ip = '203.0.113.7'
  const withOldConstant = createHash('sha256').update(`uil4b-rate-limit:${ip}`).digest('hex').slice(0, 32)
  assert.notEqual(hashKey(ip), withOldConstant,
    'the limiter is hashing with the published constant again — every counter document in Firestore is a '
    + 'reversible IP address, recoverable by anybody who can read this repository')

  // Written against the CODE as well, because a future `|| 'something'` would
  // reintroduce the fault in the exact form that looks like configuration —
  // the same assertion DIAG_CODE already carries at the top of this file.
  const limiter = stripJs(fs.readFileSync(path.join(API, '_lib/rateLimit.js'), 'utf8'))
  assert.doesNotMatch(limiter, /RATE_LIMIT_SALT\s*(\|\||\?\?)\s*['"`]/,
    'RATE_LIMIT_SALT has a literal fallback again — an unset salt must mean "generate one", never "use this string"')
})

test('the salt still comes from the environment when it is set', async () => {
  // The fallback is the only thing that changed. If the env var stopped being
  // read, every instance would salt itself randomly, counters would never be
  // shared between them, and the limiter would silently become per-instance —
  // the exact defect the module header gives for not using an in-memory Map.
  const ip = '203.0.113.7'
  process.env.RATE_LIMIT_SALT = 'salt-from-the-environment'
  try {
    // A fresh module instance: the salt is read once at load, so the import
    // cache has to be stepped around with a query string.
    const { hashKey: saltedHashKey } = await import('../../api/_lib/rateLimit.js?salted')
    assert.equal(
      saltedHashKey(ip),
      createHash('sha256').update(`salt-from-the-environment:${ip}`).digest('hex').slice(0, 32),
      'RATE_LIMIT_SALT is set and the limiter is not using it',
    )
  } finally {
    delete process.env.RATE_LIMIT_SALT
  }
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

// ── /api/ai — the unauthenticated config probe ───────────────────────────────
//
// The same fault as the diagnostic at the top of this file, one level down. The
// handler used to check `task.configured()` BEFORE the Authorization header, so
// an anonymous POST distinguished "this provider key is set" (401) from "it is
// not" (500, "AI is not configured on the server: GEMINI_API_KEY is missing").
// Each task declares its own configured() — the vision tasks need Gemini,
// generate-prompt takes either — so three unauthenticated requests enumerated
// which provider keys the deployment holds. That is precisely the sentence this
// file already records as the reason the diagnostic was locked down: "the
// endpoint enumerates which of the deployment's secrets exist".
//
// These run the REAL handler rather than a description of it. The provider keys
// are deleted first because api/ai.js reads them into module constants at import
// time, and "no key configured" is the one state where the old ordering leaked
// and the new one does not — with a key present BOTH orderings answer 401 and
// the test would prove nothing.
for (const k of ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY']) {
  delete process.env[k]
}
const { default: aiHandler } = await import('../../api/ai.js')

function fakeRes() {
  const sent = { status: 0, body: null }
  return {
    sent,
    setHeader() {},
    status(code) { sent.status = code; return this },
    json(payload) { sent.body = payload; return this },
  }
}

/** POST /api/ai with no credentials of any kind. */
async function anonymousPost(task) {
  const res = fakeRes()
  await aiHandler({ method: 'POST', headers: {}, query: {}, body: { task } }, res)
  return res.sent
}

test('an anonymous POST is refused before the server says anything about its keys', async () => {
  // No provider key is configured in this process, so the OLD ordering answered
  // 500 "AI is not configured on the server: GEMINI_API_KEY is missing" here.
  const sent = await anonymousPost('alt-text')
  assert.equal(sent.status, 401, 'a stranger got something other than 401 — the response is a config oracle')
  assert.equal(sent.body.error, 'Authentication required')
  assert.doesNotMatch(JSON.stringify(sent.body), /GEMINI_API_KEY|OPENROUTER_API_KEY|not configured/i,
    'the refusal names a server env var, which is the fact an anonymous caller must not learn')
})

test('THE ONE THAT MATTERS: every task answers a stranger identically, so none can be told apart', async () => {
  // alt-text and scan-photo require the Gemini key; generate-prompt accepts
  // either. Under the old ordering those configured() answers were separately
  // observable responses. An unknown task is in here too: if the task lookup
  // still ran before auth, that one alone would come back 400 and confirm to a
  // stranger which task names the deployment knows.
  const replies = await Promise.all(
    ['alt-text', 'scan-photo', 'generate-prompt', 'no-such-task', undefined].map(anonymousPost)
  )
  const first = JSON.stringify(replies[0])
  for (const [i, r] of replies.entries()) {
    assert.equal(JSON.stringify(r), first,
      `reply #${i} differs from the others — the difference IS the enumeration`)
  }
  assert.equal(replies[0].status, 401)
})

test('a signed-in caller is still told exactly which key the server is missing', () => {
  // The fix is NOT "delete the configured() check". A signed-in user staring at
  // a broken deployment must still learn that the server is misconfigured and
  // which env var to set — that message is the only thing standing between the
  // founder and a blind redeploy. It simply has to run AFTER the token check.
  const ai = stripJs(read('ai.js'))
  const verify = ai.indexOf('verifyIdToken(')
  const configured = ai.indexOf('task.configured()')
  assert.ok(verify > -1, 'the handler no longer verifies an ID token')
  assert.ok(configured > -1,
    'the configured() guard is gone — a misconfigured server now fails deep inside a provider call instead of naming the env var')
  assert.ok(configured > verify,
    'configured() still runs before the caller is verified — an anonymous POST can tell a set key from an unset one')
  assert.match(ai, /configError:\s*'AI is not configured on the server: GEMINI_API_KEY is missing\.'/,
    'the vision tasks no longer name the env var an operator has to set')
  assert.match(ai, /configError:[^\n]*OPENROUTER_API_KEY/,
    'generate-prompt no longer names the env vars an operator has to set')
})
// A CACHED DOCUMENT MAY NOT TAKE ITS URLS FROM A REQUEST HEADER.
//
// api/share.js built `origin` from `x-forwarded-host || host` and interpolated
// it into og:url, og:image, twitter:image, the canonical and the redirect —
// while setting `Cache-Control: s-maxage=604800, immutable` on the same
// response. x-forwarded-host is client-supplied, so one crafted request to a
// /p/<code> link could fill a shared, week-long cache entry with URLs pointing
// at another host, including the image every unfurler fetches and the redirect
// a human follows.
//
// The caching header is what makes it persistent rather than a single bad
// response, which is why this is asserted about the pair rather than about the
// header alone.
test('no /api handler builds a URL out of a host header', () => {
  const files = fs.readdirSync(API).filter(f => f.endsWith('.js'))
  // POSITIVE CONTROL: an empty directory listing passes every check below.
  assert.ok(files.length > 5, `only ${files.length} handlers found, so this scan is vacuous`)

  for (const f of files) {
    // Comments quote the header they explain — share.js documents this defect
    // at length directly above the fix — so a raw search finds the explanation
    // and the test passes on a file that reinstated the bug.
    const code = stripJs(read(f))
    for (const needle of ['x-forwarded-host', 'headers.host', "headers['host']"]) {
      assert.ok(!code.includes(needle),
        `api/${f} reads ${needle}. A request header cannot decide what a response says `
        + 'about its own origin, and share.js caches that response for a week — see the '
        + 'note above `origin` there.')
    }
  }
})

test('the share card names the canonical host whatever the caller claims', async () => {
  const { default: handler } = await import('../../api/share.js')
  let body = ''
  const res = {
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    status() { return this },
    send(v) { body = String(v); return this },
    json(v) { body = JSON.stringify(v); return this },
  }
  handler({
    method: 'GET',
    query: { c: '4338E0,7C6CF0' },
    // Exactly the shape the defect took: a caller asserting someone else's host.
    headers: {
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'http',
      host: 'evil.example',
    },
  }, res)

  // POSITIVE CONTROL: an empty body satisfies every "does not contain" below.
  assert.ok(body.length > 200, 'the handler returned no document to inspect')
  assert.ok(body.includes('og:image'), 'the document is not the share card')

  assert.ok(!body.includes('evil.example'),
    'the attacker-supplied host reached the cached document')
  assert.ok(!body.includes('http://'),
    'the attacker-supplied scheme reached the cached document')
  assert.ok(body.includes('https://uil4b.com/api/share'),
    'the card no longer points its og:image at the canonical host')

  // And the caching that makes this worth guarding is still on, so the test
  // cannot quietly become about an uncached endpoint.
  assert.match(String(res.headers['cache-control'] || ''), /s-maxage=\d+/,
    'share.js stopped caching; if that is deliberate, this test needs rewriting rather '
    + 'than deleting — the header is half of why the header-derived origin mattered.')
})
