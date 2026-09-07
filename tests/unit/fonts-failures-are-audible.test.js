// /api/fonts MUST SAY WHY IT COULD NOT ANSWER.
//
// The catalogue has two sources — the Google Fonts metadata endpoint (no key,
// richer data) and the WebFonts API (keyed, thinner) — and either is allowed to
// fail, because that is the whole reason there are two. What was not allowed,
// and what shipped anyway, is failing in silence: two `catch {}` bodies and two
// bare `return null` on a non-ok response. When both sources were down the only
// thing anyone got was the handler's 502, "Unable to load font catalog", which
// does not say WHICH host refused, with WHAT status, or whether the )]}'
// anti-XSSI guard simply stopped matching and JSON.parse threw on the body.
// Those have three different fixes and the log distinguished none of them.
//
// The pattern is not hypothetical in this repository: an empty catch in the
// feedback queue hid a permissions refusal for a week this month.
//
// ── WHY THIS DRIVES THE HANDLER ────────────────────────────────────────────
//
// The recorded failure in this repo is a correct fix shipping beside a test
// that exercised a helper in isolation — the sharpest case left the unit suite
// at 1363/1363 while three browser tests failed. So nothing here asserts
// anything about a logging helper. Each test replaces global.fetch with a
// specific upstream failure, calls the REAL exported handler, and reads what
// reached console.error. Delete a catch body's logging and these go red;
// delete the call site and they go red.
//
// ── WHAT IS ASSERTED, AND WHAT IS DELIBERATELY NOT ─────────────────────────
//
// Asserted: that a line was emitted, that it names the source that failed, and
// that it carries the distinguishing fact — the status, or the thrown message.
// NOT asserted: the exact sentence. Pinning the wording would make this a
// change-detector on prose, and the point is that the operator can tell the
// cases apart, not that they are phrased any particular way.
//
// The status assertions are what make this more than "something was logged":
// a 403 (restricted key) and a 429 (quota) are different problems, and a test
// that accepted any line at all would pass while the log said neither.
//
// MUTATION-VERIFIED, each independently: restoring `catch {}` on the metadata
// source fails 'a thrown source is named, with what it threw'; restoring
// `if (!res.ok) return null` on either fetcher fails the matching status test;
// and removing the final "both sources failed" line fails the 502 test. The
// green no-op control is the unmutated tree, run first.
import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../../api/fonts.js'

/** Collect everything the handler writes to console.error while `fn` runs. */
async function capture(fn) {
  const lines = []
  const real = console.error
  console.error = (...args) => { lines.push(args.map(String).join(' ')) }
  try { return { result: await fn(), lines } } finally { console.error = real }
}

/** A minimal Vercel-shaped response that records what it was told to send. */
function fakeRes() {
  const out = { status: null, body: null, headers: {} }
  return {
    out,
    setHeader(k, v) { out.headers[k] = v },
    status(code) { out.status = code; return this },
    json(body) { out.body = body; return this },
  }
}

const GET = { method: 'GET' }

/** Run the handler with `fetch` replaced, and return what it said and logged. */
async function run(fetchImpl, { key } = {}) {
  const realFetch = global.fetch
  const realKey = process.env.GOOGLE_FONTS_API_KEY
  const realViteKey = process.env.VITE_GOOGLE_FONTS_API_KEY
  global.fetch = fetchImpl
  // The key is read at module scope, so it cannot be changed per-test. What the
  // env can still do is keep this deterministic: a machine that happens to have
  // a real key set must not make these tests reach the network.
  if (key === false) { delete process.env.GOOGLE_FONTS_API_KEY; delete process.env.VITE_GOOGLE_FONTS_API_KEY }
  const res = fakeRes()
  try {
    const { lines } = await capture(() => handler(GET, res))
    return { res: res.out, lines, log: lines.join('\n') }
  } finally {
    global.fetch = realFetch
    if (realKey === undefined) delete process.env.GOOGLE_FONTS_API_KEY; else process.env.GOOGLE_FONTS_API_KEY = realKey
    if (realViteKey === undefined) delete process.env.VITE_GOOGLE_FONTS_API_KEY; else process.env.VITE_GOOGLE_FONTS_API_KEY = realViteKey
  }
}

const httpFail = (status, statusText) => async () => ({
  ok: false, status, statusText, json: async () => ({}), text: async () => '',
})

// ── The control ─────────────────────────────────────────────────────────────

test('a working catalogue answers 200 and logs nothing — the control', async () => {
  // Without this, every assertion below could be satisfied by a handler that
  // logged on every call, including the healthy one. A log that always fires
  // is the same as a log that never does.
  const { res, log } = await run(async (url) => {
    assert.ok(String(url).includes('fonts.google.com/metadata'), 'the metadata endpoint is tried first')
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => ")]}'" + JSON.stringify({
        familyMetadataList: [{ family: 'Inter', category: 'Sans Serif', popularity: 1, fonts: { 400: {}, 700: {} } }],
      }),
    }
  })
  assert.equal(res.status, 200, 'a healthy metadata response must produce a catalogue')
  assert.ok(res.body.fonts.length > 0, 'the catalogue came back empty, so this control proves nothing')
  assert.equal(log, '', `a healthy request wrote to the error log:\n${log}`)
})

// ── Each failure names itself ───────────────────────────────────────────────

test('an HTTP refusal is reported with its status, so 403 and 429 are distinguishable', async () => {
  const forbidden = await run(httpFail(403, 'Forbidden'))
  assert.match(forbidden.log, /metadata/i,
    'a 403 from the metadata endpoint did not name that source in the log')
  assert.match(forbidden.log, /403/,
    'the status is missing — 403 (blocked) and 429 (quota) are different problems with different fixes')

  const throttled = await run(httpFail(429, 'Too Many Requests'))
  assert.match(throttled.log, /429/, 'a 429 was not reported as a 429')
  assert.notEqual(forbidden.log, throttled.log,
    'the two statuses produced an identical log line, so the log cannot tell them apart')
})

test('a thrown source is named, with what it threw — this is the empty catch', async () => {
  // The metadata source rejects outright (DNS, TLS, connection reset). This is
  // the exact path that used to be `try { ... } catch {}`.
  const { res, log } = await run(async () => { throw new Error('ECONNREFUSED 142.250.0.0:443') })
  assert.match(log, /metadata/i, 'the thrown source is not named in the log')
  assert.match(log, /ECONNREFUSED/,
    'the thrown message was swallowed — this is the empty catch that the item is about')
  assert.equal(res.status, 502, 'a total failure must still answer 502 rather than hang or throw')
})

test('a changed anti-XSSI guard is called out rather than surfacing as a parse error', async () => {
  // The metadata endpoint prefixes its JSON with )]}'. If that ever stops, the
  // generic "Unexpected token" from JSON.parse buries a specific, fixable
  // upstream change.
  const { log } = await run(async () => ({
    ok: true, status: 200, statusText: 'OK',
    text: async () => '<!doctype html><html>signin</html>',
  }))
  assert.match(log, /guard/i,
    'the anti-XSSI guard stopped matching and nothing said so')
  assert.match(log, /doctype|html/i,
    'the log does not show what the body actually started with, which is the thing that identifies it')
})

test('a 200 with nothing usable is reported as a shape change, not as an outage', async () => {
  const { log } = await run(async () => ({
    ok: true, status: 200, statusText: 'OK',
    text: async () => ")]}'" + JSON.stringify({ familyMetadataList: [{ family: 'Broken', fonts: {} }] }),
  }))
  assert.match(log, /metadata/i, 'the source that answered uselessly is not named')
  assert.match(log, /200/,
    'a successful response that yielded no fonts reads as an outage in the log, which sends the '
    + 'next operator to check the wrong thing')
})

test('the 502 says in the log that it is a 502, after both sources have spoken', async () => {
  // The handler's own line. Without it the log ends on the second source's
  // failure and never records that a client was actually refused.
  const { res, lines } = await run(httpFail(503, 'Service Unavailable'), { key: false })
  assert.equal(res.status, 502)
  assert.ok(lines.length >= 2,
    `both sources failed but only ${lines.length} line(s) were logged:\n${lines.join('\n')}`)
  assert.match(lines[lines.length - 1], /502/,
    'nothing recorded that the client was refused, so the log stops one step short of the symptom')
})

test('an unconfigured WebFonts key is described as unconfigured, not as broken', async () => {
  // A deployment with no key is the normal case, and it must not read in the
  // log as a failing fallback — that is a different investigation.
  const { log } = await run(httpFail(500, 'Internal Server Error'), { key: false })
  assert.match(log, /GOOGLE_FONTS_API_KEY/,
    'the WebFonts fallback was skipped for want of a key and the log does not say so, so an '
    + 'operator reading a 502 cannot tell "never configured" from "configured and broken"')
})
