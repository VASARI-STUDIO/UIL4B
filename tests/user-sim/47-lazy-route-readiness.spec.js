// The suite's readiness contract, tested rather than asserted in a comment.
//
// WHAT WENT WRONG, AND WHY IT IS WORTH A SPEC OF ITS OWN.
// Nineteen routes are `lazy()`. App.jsx answers a pending chunk with
// `<div className="page-loading">` rendered INSIDE `<main id="main">`, so
// during the fallback the pill nav, the footer, a visible `main` and a
// non-empty `#root` are all still on screen. Every readiness check this suite
// owned matched that state: `main, .landing, #root > *` matches it three ways,
// and `expectRendered()`'s `document.body.innerText > 40` matched it by a
// factor of ten. So a spec that navigated and then MEASURED did not time out
// when a chunk was slow — it measured the chrome and published a confident
// number about a page that was not there. 43-state-token-contrast lost exactly
// that way in CI and blamed the branch under test.
//
// The fix lives in helpers.js. This file exists because a fix to a can't-fail
// check is itself unfalsifiable unless something reproduces the state it was
// supposed to catch. So this holds the route chunk back on purpose and reads
// the page in the moment the old check was wrong.
//
// WHY NOT CPU THROTTLING. The original diagnosis reproduced this with
// `Emulation.setCPUThrottlingRate` at 16x, which is honest but is a race
// against the machine — on a fast runner the chunk can win. Holding the chunk
// request itself is the same state arrived at deterministically, so this spec
// measures the same thing on any hardware.
import { ASSET_TROUBLE, expectBuildAssetFailures, test, expect } from './base.js'
// goRaw, not go. `go()` now waits for the route to arrive, which is the fix
// this file exists to prove works - so measuring the moment before it arrives
// has to bypass it. This is goRaw's only caller, and that is the point.
import { go, goRaw, ready, renderState, expectRendered } from './helpers.js'

// /privacy is the sharpest case in the app: 421 characters of chrome while the
// fallback is up against 6537 once it lands, and it is one of the two routes
// that measured ZERO in the CI failure this contract comes from.
const HELD_ROUTE = '/privacy'
const HELD_CHUNK = '**/assets/Privacy-*.js'

// Long enough that no scheduling accident lets the chunk land inside the
// "immediately after navigation" reading below, short enough to stay cheap.
const HOLD_MS = 3000

/** Serve the route's chunk, but not until `release` resolves. */
async function holdChunk(page, release) {
  let served = 0
  await page.route(HELD_CHUNK, async (route) => {
    served += 1
    await release
    await route.continue()
  })
  return () => served
}

test.describe('a lazy route is only "rendered" once it has actually arrived', () => {
  test('the old contract passes on a page that is not there; the new one does not', async ({ page }) => {
    let open
    const release = new Promise((r) => { open = r })
    const servedCount = await holdChunk(page, release)

    await goRaw(page, HELD_ROUTE)
    const held = await renderState(page)

    // ── The vacuity, as two numbers from one instant. ──
    // This is the whole finding. At this moment the route has not loaded, and
    // the check that was supposed to notice reads 421 rather than 0 because it
    // was reading the nav and footer that every route carries.
    expect(servedCount(), 'the chunk request must actually have been held, or this spec proves nothing')
      .toBeGreaterThan(0)
    expect(held.loading, 'the Suspense fallback must be on screen for this reading to mean anything')
      .toBe(true)
    expect(held.body, 'THE OLD CONTRACT: body.innerText > 40 is satisfied by the chrome alone')
      .toBeGreaterThan(40)
    expect(held.own, 'THE NEW CONTRACT: the route itself has rendered nothing of its own')
      .toBe(0)

    // ── And the wait is a wait for the thing, not for a clock. ──
    const started = Date.now()
    setTimeout(open, HOLD_MS)
    await ready(page, HELD_ROUTE)
    const waited = Date.now() - started

    // A `ready()` that returned on anything the fallback also satisfies would
    // come back in single-digit milliseconds. Deliberately compared against the
    // hold, which this test controls, and not against a duration guessed for a
    // dynamic import.
    expect(waited, 'ready() returned before the chunk it was waiting for was even released')
      .toBeGreaterThanOrEqual(HOLD_MS - 250)

    const arrived = await renderState(page)
    expect(arrived.loading, 'the fallback must be gone once ready() returns').toBe(false)
    expect(arrived.own, 'the route must now have rendered its own content')
      .toBeGreaterThan(held.own + 1000)
    await expectRendered(page, HELD_ROUTE)
  })

  // FOUND BY WRITING THIS SPEC, and it is the reason the contract has a third
  // clause. The first draft asserted that a dropped chunk leaves the fallback up
  // forever and times out. It does not: React hands the import failure to
  // App.jsx's ErrorBoundary, `.page-loading` unmounts, and `main` fills with
  // "Something went wrong / Reloading usually fixes it" — well over any content
  // threshold. So the FIXED readiness check passed a route that had crashed.
  //
  // Nothing under tests/ mentioned `.error-boundary` before this, so no spec in
  // the suite could distinguish a crashed route from a working one. The
  // `ErrorBoundary caught:` console error IS recorded by watch(), but findings
  // are a printed report and the global teardown gates on One Tap alone, so a
  // deploy that dropped a route chunk would have gone green.
  test('a chunk that never arrives fails as a CRASH, not as a rendered page', async ({ page }) => {
    test.setTimeout(60000)
    await page.route(HELD_CHUNK, (route) => route.abort())
    await goRaw(page, HELD_ROUTE)

    // The state a visitor is actually in: no fallback, plenty of text, and
    // none of it the page they asked for.
    await expect.poll(() => renderState(page).then((s) => s.crashed), {
      message: 'the dropped chunk should reach the ErrorBoundary',
      timeout: 20000,
    }).toBe(true)
    const crash = await renderState(page)
    expect(crash.loading, 'the fallback is GONE — waiting for it would have passed here').toBe(false)
    expect(crash.own, 'and the crash card is well over any content threshold').toBeGreaterThan(40)

    const failure = await expectRendered(page, HELD_ROUTE).then(
      () => null,
      (err) => String(err && err.message ? err.message : err),
    )
    expect(failure, 'a route that crashed must FAIL, not pass on the size of its crash card')
      .not.toBeNull()
    // The message has to name the cause. "expected 421 to be greater than 40"
    // sent a previous investigation at the branch under test rather than at the
    // wait, which cost a day.
    expect(failure).toMatch(/ErrorBoundary card, not the route/)
  })

  test('a route that never resolves at all fails with a diagnostic, not a false pass', async ({ page }) => {
    // ready()'s backstop is 20s by design — it is a backstop and not a
    // deadline — so this test needs room for it plus the navigation.
    test.setTimeout(60000)

    // Held open forever rather than aborted, which is the slow-chunk shape the
    // CI failure this contract comes from actually had. Nothing rejects, so
    // Suspense never leaves the fallback and there is no crash to catch.
    await page.route(HELD_CHUNK, () => { /* never continued, never aborted */ })
    await goRaw(page, HELD_ROUTE)

    const failure = await expectRendered(page, HELD_ROUTE).then(
      () => null,
      (err) => String(err && err.message ? err.message : err),
    )

    expect(failure, 'a route stuck in its fallback must FAIL, not pass on the chrome around it')
      .not.toBeNull()
    expect(failure).toMatch(/never got past its lazy-loading fallback/)
    expect(failure, 'the diagnostic must carry the numbers that show why').toMatch(/fallback=true/)
  })

  test('the chrome a lazy fallback leaves on screen is real, and is not the route', async ({ page }) => {
    // The size of the gap, recorded so a future change to the app shell that
    // narrowed it would be visible here rather than silently making the old
    // 40-character threshold look defensible again.
    let open
    const release = new Promise((r) => { open = r })
    await holdChunk(page, release)

    await goRaw(page, HELD_ROUTE)
    const held = await renderState(page)
    open()
    await ready(page, HELD_ROUTE)
    const arrived = await renderState(page)

    expect(held.body, 'the fallback state should be the shared chrome, a few hundred characters')
      .toBeGreaterThan(200)
    expect(arrived.body / held.body, '/privacy should be an order of magnitude more than its chrome')
      .toBeGreaterThan(5)
    // The one that matters: excluding the chrome turns "ten times bigger" into
    // "zero versus everything", which is a difference a threshold can hold.
    expect(held.own).toBe(0)
    expect(arrived.own).toBeGreaterThan(2000)
  })

  /* ── The BOOT SHELL, which `ready()` used to accept as arrival ──────────────
   *
   * Every test above holds back a ROUTE chunk, so React is running and the
   * Suspense fallback is on screen. This one holds back the ENTRY bundle, so
   * React never runs at all — and that state defeated the readiness check from
   * the OTHER side. index.html ships
   * `<div id="root"><div class="boot-shell" id="boot-shell">` and
   * scripts/prerender.mjs clones it into all 33 route shells, so
   * `root.firstElementChild` is satisfied by markup the SERVER wrote, and
   * `.page-loading` is absent because App.jsx has never rendered. Both of the
   * conditions `ready()` used to require were true of a page with no
   * application on it.
   *
   * Caught in the wild by #391: /create/semantic-color under four parallel
   * workers, h1 not found, accessibility snapshot reading
   * `status: Loading UIL4B` — the boot shell's own live region.
   */
  const ENTRY_BUNDLE = '**/assets/index-*.js'

  test('the static boot shell is not arrival, and a page stuck on it says so', async ({ page }) => {
    // ready()'s backstop is 20s by design, so this needs room for it.
    test.setTimeout(60000)

    // Held open forever rather than aborted: an abort reaches
    // `vite:preloadError`/the ErrorBoundary and is a different state. Nothing
    // rejects here, so the entry module simply never executes.
    await page.route(ENTRY_BUNDLE, () => { /* never continued, never aborted */ })
    // `waitUntil: 'commit'` for the reason 04-premium-home needs it: a module
    // script that never loads means DOMContentLoaded never fires, so the
    // default wait would hang here rather than reach the reading below.
    await goRaw(page, HELD_ROUTE, { waitUntil: 'commit' })
    await expect(page.locator('#boot-shell')).toBeVisible()

    // ── The vacuity, as four facts from one instant. ──
    const shell = await renderState(page)
    expect(shell.mounted, 'THE OLD CONTRACT: #root HAS a child — the shell index.html ships')
      .toBe(true)
    expect(shell.loading, 'THE OLD CONTRACT: no .page-loading, because App.jsx has never rendered')
      .toBe(false)
    expect(shell.booting, 'THE NEW CONTRACT: the static boot shell is still on screen')
      .toBe(true)
    expect(shell.own, 'and the route itself has rendered nothing at all')
      .toBe(0)

    // ── So the wait must fail, and must name the cause. ──
    const failure = await ready(page, HELD_ROUTE).then(
      () => null,
      (err) => String(err && err.message ? err.message : err),
    )
    expect(failure, 'a page still showing the boot shell must FAIL, not count as arrived')
      .not.toBeNull()
    // Not "the route never got past its lazy-loading fallback": there is no
    // fallback and there is no route. Sending the next investigation at a slow
    // chunk is what this message exists to prevent.
    expect(failure).toMatch(/never replaced the static boot shell/)
    expect(failure, 'the diagnostic must carry the numbers that show why').toMatch(/booting=true/)
    expect(failure, 'and must say that waiting longer cannot help').toMatch(/React has NOT RUN AT ALL/)
    // The readiness wait must report how many frames it actually examined. A
    // wait that returned without looking is indistinguishable from one that
    // looked and was satisfied, which is the shape this suite keeps paying for.
    const polls = Number((failure.match(/readiness examined (\d+) frame/) || [])[1])
    expect(polls, 'ready() must say how many frames it examined, and it must be non-zero')
      .toBeGreaterThan(0)
  })

  test('the same page arrives normally once the entry bundle is let through', async ({ page }) => {
    // The positive control for the test above. Without it, "ready() fails on
    // the boot shell" would also be satisfied by a ready() that had started
    // failing on everything.
    let open
    const release = new Promise((r) => { open = r })
    let served = 0
    await page.route(ENTRY_BUNDLE, async (route) => { served += 1; await release; await route.continue() })

    await goRaw(page, HELD_ROUTE, { waitUntil: 'commit' })
    await expect(page.locator('#boot-shell')).toBeVisible()
    expect(served, 'the entry bundle request must actually have been held, or this proves nothing')
      .toBeGreaterThan(0)

    open()
    await ready(page, HELD_ROUTE)
    const arrived = await renderState(page)
    expect(arrived.booting, 'the boot shell must be gone once ready() returns').toBe(false)
    expect(arrived.mounted, 'and React must have committed something').toBe(true)
    expect(arrived.own, 'and the route must have rendered its own content').toBeGreaterThan(2000)
  })

  /* ── An asset the machine could not DELIVER ──────────────────────────────
   *
   * Every test above holds a request open or aborts it with route.abort()'s
   * default, which Chromium reports as net::ERR_FAILED - something this suite
   * does on purpose, and deliberately NOT counted by the build-asset watch.
   *
   * This one produces the failure that is not deliberate. On 2026-09-06 five
   * specs failed once each under full-suite parallelism and every one passed in
   * isolation; two of those runs carried net::ERR_NO_BUFFER_SPACE against
   * /assets/index-*.js and /assets/en-*.js in their own feedback-loop section.
   * The app chunk never loaded, so the spec's first locator found nothing and
   * the failure read as if the element had been deleted.
   *
   * net::ERR_CONNECTION_FAILED stands in for it: it is in the same allowlist,
   * and route.abort('connectionfailed') produces it on demand. The classifier's
   * two directions are asserted without a browser in
   * tests/unit/build-asset-guard.test.js; what is asserted HERE is the wiring -
   * that a real failed request on a real asset reaches the watch, and that the
   * failure a spec actually sees names it.
   */
  test('an entry bundle that never arrives is NAMED, not reported as a missing element', async ({ page }) => {
    test.setTimeout(60000)

    // Declared BEFORE the failure, because the suppression is read when a
    // failure is RECORDED. This is the one context in the suite allowed to do
    // this, and tests/unit/build-asset-guard.test.js pins that to this file -
    // without it, the run's own proof that the guard works would fail the run,
    // which is the guard working.
    expectBuildAssetFailures(page.context())
    await page.route(ENTRY_BUNDLE, (route) => route.abort('connectionfailed'))
    await goRaw(page, HELD_ROUTE, { waitUntil: 'commit' })
    await expect(page.locator('#boot-shell')).toBeVisible()

    const failure = await ready(page, HELD_ROUTE).then(
      () => null,
      (err) => String(err && err.message ? err.message : err),
    )
    expect(failure, 'a page whose entry bundle never arrived must FAIL').not.toBeNull()

    // THE POINT OF THE ITEM. The failure must say the app could not be loaded,
    // and name the file - not describe a route that is missing something.
    expect(failure, 'the failure must say the app never started')
      .toMatch(/never replaced the static boot shell/)
    expect(failure, 'and must say a build asset never arrived')
      .toMatch(/NEVER ARRIVED in this browser context/)
    expect(failure, 'and must carry the actual network error')
      .toMatch(/ERR_CONNECTION_FAILED/)
    expect(failure, 'and must name the file')
      .toMatch(/\/assets\/index-/)

    // POSITIVE CONTROL for the ledger itself: an absence assertion above would
    // be satisfied by a watch that recorded nothing anywhere.
    const recorded = page.context()[ASSET_TROUBLE] || []
    expect(recorded.length, 'the watch must have RECORDED the failure, not merely reported it once')
      .toBeGreaterThan(0)
    expect(
      recorded.every((r) => r.includes('/assets/')),
      'every recorded entry must be a build asset',
    ).toBe(true)
  })

  test('a build asset that arrives normally records NOTHING, so the watch is not indiscriminate', async ({ page }) => {
    // The negative control for the test above, and the one that says the guard
    // is not simply on. If this ever went red the whole suite would be failing
    // every test on assets that loaded perfectly.
    await go(page, HELD_ROUTE)
    const recorded = page.context()[ASSET_TROUBLE] || []
    expect(recorded, 'a healthy page load must leave the build-asset ledger empty').toEqual([])
  })
})
