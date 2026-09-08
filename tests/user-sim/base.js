// The acceptance suite's base `test`. Every spec imports { test, expect } from
// here rather than from '@playwright/test'; `tests/unit/one-tap-stub.test.js`
// fails the build if one doesn't.
//
// WHAT WAS HAPPENING
// `src/components/GoogleOneTap.jsx` injects https://accounts.google.com/gsi/client
// on every signed-out page, and `src/utils/firebase.js` carries a hardcoded
// fallback client ID, so it loads with no secrets configured — in CI too.
// Of the 26 specs this landed on, 24 had no stub at all, so the suite made a
// live third-party round trip on every single page load — 461 of them in one
// measured run: a dependency on Google's uptime inside a suite whose whole
// point is to walk this app in isolation, hundreds of [GSI_LOGGER] FedCM errors
// in the CI log, and a One Tap card sitting over the controls being hit-tested.
//
// WHY AN EMPTY SCRIPT AND NOT AN ABORT
// An abort raises a console error the feedback loop in helpers.js then reports
// as a finding on every viewport. An empty script instead lets
// GoogleOneTap.jsx's `loadGis()` resolve normally; its own
// `if (!window.google?.accounts?.id) return` guard stops the component before it
// initialises anything. Nothing errors, and One Tap is simply absent. That is
// the same reasoning the per-spec stubs this file replaced carried. Those are
// gone rather than left in place: a page route takes precedence over a context
// route, so keeping one would have made the per-spec copy the silent winner.
//
// WHY ON THE BROWSER AND NOT ON `page`
// Several specs build their own contexts with `browser.newContext()` inside the
// test body. A stub that decorated only the default `page` fixture would
// silently miss those — and silently missing things is the failure mode this
// suite keeps being bitten by. Playwright's own `context`/`page` fixtures are
// built by `_contextFactory`, which itself calls `browser.newContext()`, so
// wrapping that one method covers the default fixtures, every hand-rolled
// context, and `browser.newPage()` (which delegates to `this.newContext()`).
import fs from 'node:fs'
import path from 'node:path'
import { test as base, expect } from '@playwright/test'
import { REPORT_DIR } from './helpers.js'
// The Iconify catalogue, served from tests/user-sim/fixtures/iconify/ on every
// context by the same wrap below. Its reasoning lives in that file; it is a
// separate module so this one keeps the properties tests/unit/one-tap-stub.test.js
// pins (an empty JavaScript body, no abort anywhere in here).
import { stubIconify } from './iconify-stub.js'

export { expect }

/** The One Tap host. Every path on it is stubbed, not just /gsi/. */
export const ONE_TAP_HOST = 'accounts.google.com'

/**
 * Stamped onto every stubbed response so an escaped one is *observed* rather
 * than inferred: a response from this host without the header reached Google.
 */
export const STUB_HEADER = 'x-uil4b-one-tap-stub'

/** Per-run ledger the global teardown asserts on. Written under report/. */
export const ONE_TAP_AUDIT_FILE = path.join(REPORT_DIR, 'one-tap-audit.jsonl')

/**
 * Per-run ledger of BUILD ASSETS that failed to load. Written under report/,
 * asserted on by the global teardown. See watchBuildAssets below.
 */
export const STALE_ASSET_AUDIT_FILE = path.join(REPORT_DIR, 'stale-asset-audit.jsonl')

/**
 * Where a context's build-asset failures hang, so `ready()` in helpers.js can
 * name the real cause in its own message without importing this file (which
 * imports helpers.js, so a real import would be a cycle).
 */
export const ASSET_TROUBLE = Symbol.for('uil4b.buildAssetTrouble')

/** True for any URL on the One Tap host. Takes a string. */
export function isOneTapUrl(url) {
  try { return new URL(url).hostname === ONE_TAP_HOST } catch { return false }
}

function appendAudit(entry) {
  // The audit is evidence, not a gate on the test itself — never let a write
  // failure turn into a spurious test failure.
  try {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.appendFileSync(ONE_TAP_AUDIT_FILE, JSON.stringify(entry) + '\n')
  } catch { /* ignore */ }
}

// Errors that prove a request actually LEFT the browser: DNS, the connection,
// a proxy or tunnel, TLS, or a timeout waiting for an answer. Everything else
// Chromium reports on a failed request — `net::ERR_ABORTED` above all — means it
// was cancelled inside the browser, which is exactly what happens to an
// in-flight fetch when a page navigates or a context closes.
const REACHED_NETWORK = /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL|ERR_PROXY|ERR_CERT|ERR_SSL|ERR_TIMED_OUT|ERR_ADDRESS|ERR_SOCKS/i

/**
 * Was a failed request dispatched, or cancelled where it stood?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT "DID THE ROUTE HANDLER RUN?"
 * ─────────────────────────────────────────────────────────────────────────────
 * It used to be. A request was called an escape if the `context.route` handler
 * had never taken charge of it — the reasoning being that an un-intercepted
 * request must have been dispatched.
 *
 * That reasoning has a race in it. Interception and the handler running are not
 * the same instant: a request can be raised, and the context torn down, before
 * the handler is invoked. The request never went anywhere — but it was never in
 * the WeakSet either, so it was reported as having reached Google, and
 * `assertOneTapNeverLeft()` failed the entire run.
 *
 * It happened on green branches, with a different spec each time, and cost two
 * separate investigations before the pattern was visible. A guard that cries
 * wolf is a guard people start ignoring, which is worse than not having it.
 *
 * The classification now comes from the failure ITSELF rather than from a
 * bookkeeping side effect. This is also STRICTER in the case that matters: a
 * network-class failure on a request the handler *had* taken charge of used to
 * be counted as an abort and hidden. It is now reported.
 *
 * The primary proof of an escape is unchanged and is not this function: a
 * RESPONSE from this host without the stub's header could only have come from
 * Google.
 */
export function classifyOneTapFailure(errorText) {
  return REACHED_NETWORK.test(errorText || '') ? 'reached-network' : 'cancelled-in-browser'
}

/**
 * Install the stub on one browser context and start auditing it.
 * Returns the same context, so it can wrap `newContext` transparently.
 */
export async function stubOneTap(context) {
  const audit = { stubbed: 0, abortedAtTeardown: 0, escaped: [] }
  // No WeakSet of intercepted requests any more: whether the handler had run was
  // the racy signal this file used to classify failures with, and keeping the
  // bookkeeping around would invite someone to reach for it again.
  await context.route((url) => url.hostname === ONE_TAP_HOST, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      headers: { [STUB_HEADER]: '1' },
      body: '',
    }).catch(() => { /* context torn down mid-flight; see requestfailed below */ })
  })

  // The hard evidence. `headers()` is synchronous, so this cannot race a closing
  // context the way an awaited `serverAddr()` would — no flaky guard. A response
  // from this host without our header is a response from Google.
  context.on('response', (res) => {
    if (!isOneTapUrl(res.url())) return
    if (res.headers()[STUB_HEADER] === '1') audit.stubbed += 1
    else audit.escaped.push(`${res.url()} [responded ${res.status()}]`)
  })

  // A failure is only evidence of an escape if it came from the NETWORK. See
  // classifyOneTapFailure — this used to key off whether the route handler had
  // already run, which is a race against context teardown and made the
  // suite-wide guard fail at random on green branches.
  context.on('requestfailed', (req) => {
    if (!isOneTapUrl(req.url())) return
    const why = req.failure()?.errorText || 'request failed'
    if (classifyOneTapFailure(why) === 'reached-network') {
      audit.escaped.push(`${req.url()} [${why}]`)
    } else {
      audit.abortedAtTeardown += 1
    }
  })

  context.on('close', () => appendAudit(audit))

  return context
}

const PATCHED = Symbol.for('uil4b.oneTapStubInstalled')

/** Runtime proof the wrap took, for the guard spec to assert on. */
export function isOneTapStubInstalled(browser) {
  return browser[PATCHED] === true
}

function appendAssetAudit(rows) {
  try {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.appendFileSync(STALE_ASSET_AUDIT_FILE, rows.map((r) => JSON.stringify(r) + '\n').join(''))
  } catch { /* evidence, never a source of failure itself */ }
}

/* ── Build assets that never arrive ──────────────────────────────────────
 *
 * WHY THIS EXISTS
 * `vite build` EMPTIES dist/ before it refills it, and `vite preview` serves
 * dist/ live. So a second `npm run build` — or a second `npm run test:users`,
 * which begins with one — against the same checkout deletes the content-hashed
 * chunks the running workers are part-way through fetching. For the second or
 * so that takes, any asset request can 404: the entry bundle, react-dom, a lazy
 * route chunk, index.html itself.
 *
 * What that looks like from inside a worker is NOT `the build is broken`. It is
 * one arbitrary assertion in one arbitrary spec failing with `element(s) not
 * found`, on a page that renders perfectly every other time — because the app
 * never finished loading. The victim is whichever worker happened to be
 * mid-fetch, so it lands on a different spec each time, passes in isolation,
 * and passes on a re-run. That is the entire signature of the flake class filed
 * as `suite-flake-class-unreproduced`, and it is measured rather than guessed:
 * the six spec files named in that item pass 130/130 against a stable dist/ and
 * fail 16 times across three of them with a rebuild loop running underneath.
 * tests/flakeprobe-a0e1/ is that experiment, kept runnable.
 *
 * ── A 4xx IS NOT THE ONLY WAY AN ASSET FAILS TO ARRIVE ──────────────────
 *
 * This started as a 4xx watch, and 4xx was only the half that the rebuild loop
 * produced. On 2026-09-06 five specs failed once each under full-suite
 * parallelism and every one passed in isolation — 09-auth-modal-accessibility,
 * 23-responsive-mid-band, 24-mobile-overhaul, 25-defect-sweep and
 * 11-palette-recovery. Two of those runs carried the cause in their own
 * feedback-loop section: `net::ERR_NO_BUFFER_SPACE` against
 * `/assets/index-*.js` and `/assets/en-*.js`. The app chunk never loaded, so
 * the spec's first locator found nothing and the failure READ AS IF THE ELEMENT
 * HAD BEEN DELETED. It correlates with several agents running suites at once
 * (40+ node processes on one machine).
 *
 * A request that fails this way produces NO HTTP RESPONSE AT ALL, so the
 * `response` listener below never saw it and the guard was silent on exactly
 * the shape it exists for. `requestfailed` is the other half.
 *
 * WHICH FAILURES COUNT, AND WHY IT IS AN ALLOWLIST
 * Chromium reports plenty of failures that are this suite doing its job:
 * `route.abort()` produces `net::ERR_FAILED` (10-home's missing-GSAP persona),
 * `route.abort('blockedbyclient')` produces `net::ERR_BLOCKED_BY_CLIENT`
 * (11-typography), `context.setOffline(true)` produces
 * `net::ERR_INTERNET_DISCONNECTED` (five specs), and a request cancelled by a
 * navigation or a closing context produces `net::ERR_ABORTED`. None of those is
 * a file that failed to arrive, and a guard that cried wolf on them would be
 * ignored — which is the reasoning `classifyOneTapFailure` above already
 * records after that guard failed at random on green branches.
 *
 * So this names the failures that mean THE MACHINE OR THE CONNECTION COULD NOT
 * DELIVER THE FILE, and nothing else. Adding to this list is adding a claim
 * about a specific error code, not widening a net.
 *
 * WHY IT FAILS THE RUN AND NOT THE TEST
 * Because a rebuilt dist/ — or a machine that could not deliver the app —
 * makes every result in the run meaningless, the passes exactly as much as the
 * failures. A run this happened in cannot be read as evidence either way, which
 * is the same reason the One Tap guard above fails a green run. It ALSO fails
 * the individual test, below, so the naming lands where the symptom did.
 */
const ASSET_NEVER_ARRIVED = new RegExp([
  'ERR_NO_BUFFER_SPACE',          // the one measured on 2026-09-06
  'ERR_INSUFFICIENT_RESOURCES',   // its sibling under the same contention
  // Ephemeral-port exhaustion. Not speculation: a full run on 2026-09-06
  // recorded it on /fonts/jetbrains-mono-latin.woff2 while this guard was being
  // written, on the same machine and for the same reason.
  'ERR_ADDRESS_IN_USE',
  'ERR_OUT_OF_MEMORY',
  'ERR_CONNECTION',               // RESET / REFUSED / CLOSED / FAILED / ABORTED
  'ERR_TIMED_OUT',
  'ERR_EMPTY_RESPONSE',
  'ERR_CONTENT_LENGTH_MISMATCH',
  'ERR_INCOMPLETE_CHUNKED_ENCODING',
  'ERR_SOCKET_NOT_CONNECTED',
  'ERR_ADDRESS_UNREACHABLE',
  'ERR_NETWORK_CHANGED',
].join('|'), 'i')

/**
 * Did this build-asset request fail because the file could not be delivered?
 *
 * Exported so the classification is assertable without a browser; the WIRING is
 * asserted in 47-lazy-route-readiness.spec.js, which breaks a real asset.
 */
export function assetNeverArrived(errorText) {
  return ASSET_NEVER_ARRIVED.test(errorText || '')
}

/**
 * Every build-asset failure seen since the CURRENT TEST started.
 *
 * Populated by the listeners themselves rather than at context close, so a
 * context a spec builds by hand and never closes is covered too — and 73 of
 * this suite's tests take `{ browser }` and build their own.
 */
let assetTroubleThisTest = []

/** Set on a context by a spec that is going to break an asset ON PURPOSE. */
export const EXPECTED_ASSET_TROUBLE = Symbol.for('uil4b.buildAssetTroubleExpected')

/**
 * Declare that this context's build-asset failures are the point of the test.
 *
 * The deliberate hole in this guard, and it has exactly ONE caller —
 * 47-lazy-route-readiness.spec.js, which aborts the entry bundle to prove the
 * guard fires and that `ready()` names it. Without this the run's own proof
 * that the guard works would fail the run, which is the guard working.
 *
 * Call it BEFORE the failure it covers: the suppression is read when a failure
 * is recorded, not when the context closes. Pinned to its one caller by
 * tests/unit/lazy-route-readiness.test.js, the same way `goRaw` is.
 */
export function expectBuildAssetFailures(context) {
  context[EXPECTED_ASSET_TROUBLE] = true
  return context
}

export function watchBuildAssets(context) {
  const bad = []
  context[ASSET_TROUBLE] = bad
  const note = (line) => {
    bad.push(line)
    // The per-test half is skipped for a context that declared it; the
    // context-scoped `bad` is not, so the spec can still read what it caused.
    if (!context[EXPECTED_ASSET_TROUBLE]) assetTroubleThisTest.push(line)
  }
  const assetPath = (url) => {
    let pathname
    try { pathname = new URL(url).pathname } catch { return null }
    // Requests the app makes under /api/ are expected to 404 under
    // `vite preview`, which runs no functions, and are deliberately NOT
    // matched here. (Written without a wildcard on purpose: a slash followed
    // by a star inside a line comment opens a block comment to every comment
    // stripper that reads this file, and tests/unit/build-asset-guard.test.js
    // reads this file.)
    return pathname.startsWith('/assets/') ? pathname : null
  }
  context.on('response', (res) => {
    if (res.status() < 400) return
    const pathname = assetPath(res.url())
    if (pathname) note(`${res.status()} ${pathname}`)
  })
  context.on('requestfailed', (req) => {
    const pathname = assetPath(req.url())
    if (!pathname) return
    const why = req.failure()?.errorText || 'request failed'
    if (assetNeverArrived(why)) note(`${why} ${pathname}`)
  })
  context.on('close', () => {
    if (bad.length && !context[EXPECTED_ASSET_TROUBLE]) appendAssetAudit(bad)
  })
  return context
}

/**
 * The per-test half of the guard, installed as an automatic fixture below.
 *
 * The run-level teardown already fails a run this happened in, and that is the
 * verdict that matters — but it arrives after 600 test results, and it does not
 * say WHICH test was the casualty. The reported symptom is a locator finding
 * nothing, and the whole point of this item is that such a run must name itself
 * rather than read as a deleted element.
 *
 * It is not a new failure CLASS: every condition it fails on already failed the
 * run. It only moves the naming to where the symptom was.
 */
function assertAssetsArrivedThisTest(seen) {
  if (!seen.length) return
  const uniq = [...new Set(seen)]
  throw new Error(
    `${seen.length} build asset request(s) never arrived during this test, on ${uniq.length} `
    + 'distinct file(s):\n  '
    + `${uniq.slice(0, 8).join('\n  ')}`
    + `${uniq.length > 8 ? `\n  ...and ${uniq.length - 8} more` : ''}`
    + '\n\nFiles under /assets/ are content-hashed build outputs. THIS TEST DID NOT MEASURE THE '
    + 'APP — whatever it asserted on was missing because the code that renders it never loaded, '
    + 'not because it was removed. A 4xx means dist/ was REBUILT under the run (`vite build` '
    + 'empties dist/ and `vite preview` serves it live). A net:: error means the machine or the '
    + 'connection could not deliver the file: ERR_NO_BUFFER_SPACE and ERR_INSUFFICIENT_'
    + 'RESOURCES are resource exhaustion, seen when several agents run suites at once. Either '
    + 'way the whole run is void and the global teardown fails it. Re-run with nothing else '
    + 'building, and give each concurrent agent its own PLAYWRIGHT_PORT *and* its own checkout: '
    + 'the port keeps the preview servers and the report directories apart '
    + '(tests/user-sim/report/<port>/), the checkout keeps the dist/ builds apart.',
  )
}

/** Every build-asset failure recorded this run, deduplicated. */
export function readStaleAssetAudit() {
  if (!fs.existsSync(STALE_ASSET_AUDIT_FILE)) return []
  return fs.readFileSync(STALE_ASSET_AUDIT_FILE, 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))
}

/**
 * Suite-wide observational guard, run from the global teardown: dist/ held
 * still for the whole run. Throws, for the reasons in watchBuildAssets.
 */
export function assertNoStaleBuildAssets() {
  const bad = readStaleAssetAudit()
  if (!bad.length) return
  const uniq = [...new Set(bad)]
  const rebuilt = uniq.filter((r) => /^\d/.test(r))
  const undelivered = uniq.filter((r) => !/^\d/.test(r))
  throw new Error(
    `${bad.length} build asset request(s) never arrived during this run, on ${uniq.length} `
    + 'distinct file(s). Files under /assets/ are content-hashed build outputs and cannot 404 '
    + 'or fail to be delivered in a healthy run:\n  '
    + `${uniq.slice(0, 12).join('\n  ')}`
    + `${uniq.length > 12 ? `\n  ...and ${uniq.length - 12} more` : ''}`
    + (rebuilt.length
      ? '\n\nThe 4xx ones mean something REBUILT dist/ while this suite was running. '
        + '`vite build` empties dist/ before refilling it and `vite preview` serves it live, so '
        + 'a concurrent `npm run build` or `npm run test:users` in this checkout deletes the '
        + 'chunks these pages were loading.'
      : '')
    + (undelivered.length
      ? '\n\nThe net:: ones mean the MACHINE OR THE CONNECTION could not deliver the file. '
        + '`ERR_NO_BUFFER_SPACE` and `ERR_INSUFFICIENT_RESOURCES` are resource exhaustion — '
        + 'measured on 2026-09-06 with several agents running suites at once (40+ node '
        + 'processes). The app chunk never loaded, so the specs that failed reported missing '
        + 'elements rather than a missing app. Run fewer suites at once.'
      : '')
    + '\n\nEvery result in this run is void — the passes as much as the failures. Re-run it with '
    + 'nothing else building, and give each concurrent agent its own PLAYWRIGHT_PORT *and* its '
    + 'own checkout: the port keeps the preview servers and the report directories apart '
    + '(tests/user-sim/report/<port>/), the checkout keeps the dist/ builds apart. See '
    + 'tests/flakeprobe-a0e1/README.md.',
  )
}

export const test = base.extend({
  browser: [async ({ browser }, use) => {
    if (!browser[PATCHED]) {
      const newContext = browser.newContext.bind(browser)
      browser.newContext = async (...args) => watchBuildAssets(await stubIconify(await stubOneTap(await newContext(...args))))
      browser[PATCHED] = true
    }
    await use(browser)
    // Deliberately not unwrapping: the base fixture closes the browser next.
  }, { scope: 'worker', timeout: 0 }],

  // AUTOMATIC, and it depends on `browser` rather than on `context` or `page`.
  // Automatic fixtures are set up before the test's own, so this is the first
  // test-scoped fixture up and the last down — it therefore reads its ledger
  // after the default context has closed, and after a hand-rolled one has done
  // whatever it was going to do. Depending on `context` would have forced a
  // default context onto the 73 tests that take `{ browser }` and build their
  // own, and STILL not covered the contexts those tests actually use.
  buildAssetsArrived: [async ({ browser }, use) => {
    void browser
    assetTroubleThisTest = []
    await use()
    const seen = assetTroubleThisTest
    assetTroubleThisTest = []
    assertAssetsArrivedThisTest(seen)
  }, { auto: true }],
})

/** Read the per-run ledger. Returns { contexts, stubbed, abortedAtTeardown, escaped }. */
export function readOneTapAudit() {
  const empty = { contexts: 0, stubbed: 0, abortedAtTeardown: 0, escaped: [] }
  if (!fs.existsSync(ONE_TAP_AUDIT_FILE)) return empty
  const rows = fs.readFileSync(ONE_TAP_AUDIT_FILE, 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))
  return {
    contexts: rows.length,
    stubbed: rows.reduce((n, r) => n + r.stubbed, 0),
    abortedAtTeardown: rows.reduce((n, r) => n + r.abortedAtTeardown, 0),
    escaped: rows.flatMap((r) => r.escaped),
  }
}

/**
 * Suite-wide observational guard, run from the global teardown: not one request
 * to accounts.google.com reached the network during this run. Throws — which
 * fails the run — rather than printing, because a stub that quietly stopped
 * covering half the suite is exactly what this file exists to prevent.
 */
export function assertOneTapNeverLeft() {
  const { contexts, stubbed, abortedAtTeardown, escaped } = readOneTapAudit()
  if (escaped.length) {
    throw new Error(
      `${escaped.length} request(s) reached ${ONE_TAP_HOST} during this run — the One Tap stub ` +
      `did not cover every browser context (see tests/user-sim/base.js):\n  ` +
      `${[...new Set(escaped)].join('\n  ')}`,
    )
  }
  if (!contexts) {
    throw new Error(
      'The One Tap audit recorded no browser contexts at all. Either no test ran, or the stub in ' +
      'tests/user-sim/base.js stopped being installed — do not read this run as evidence of anything.',
    )
  }
  console.log(
    `\n── One Tap stub ── ${contexts} context(s) audited, ${stubbed} request(s) to ` +
    `${ONE_TAP_HOST} served from the stub` +
    (abortedAtTeardown ? `, ${abortedAtTeardown} aborted at context teardown` : '') +
    ', 0 reached the network. ──',
  )
}
