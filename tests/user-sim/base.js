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

/**
 * Install the stub on one browser context and start auditing it.
 * Returns the same context, so it can wrap `newContext` transparently.
 */
export async function stubOneTap(context) {
  const audit = { stubbed: 0, abortedAtTeardown: 0, escaped: [] }
  // Requests this route actually took charge of. An intercepted request is held
  // at the network layer and never dispatched, so whatever happens to it after
  // that, it did not reach Google.
  const intercepted = new WeakSet()

  await context.route((url) => url.hostname === ONE_TAP_HOST, (route) => {
    intercepted.add(route.request())
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

  // A failure is only evidence of an escape if the route never had the request:
  // that means it was dispatched, and DNS or the connection is what failed.
  // A page closing while a fulfil is still in flight aborts a request we were
  // already holding — counted, so it stays visible, but it is not an escape.
  context.on('requestfailed', (req) => {
    if (!isOneTapUrl(req.url())) return
    if (intercepted.has(req)) audit.abortedAtTeardown += 1
    else audit.escaped.push(`${req.url()} [${req.failure()?.errorText || 'request failed'}, never intercepted]`)
  })

  context.on('close', () => appendAudit(audit))

  return context
}

const PATCHED = Symbol.for('uil4b.oneTapStubInstalled')

/** Runtime proof the wrap took, for the guard spec to assert on. */
export function isOneTapStubInstalled(browser) {
  return browser[PATCHED] === true
}

export const test = base.extend({
  browser: [async ({ browser }, use) => {
    if (!browser[PATCHED]) {
      const newContext = browser.newContext.bind(browser)
      browser.newContext = async (...args) => stubOneTap(await newContext(...args))
      browser[PATCHED] = true
    }
    await use(browser)
    // Deliberately not unwrapping: the base fixture closes the browser next.
  }, { scope: 'worker', timeout: 0 }],
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
