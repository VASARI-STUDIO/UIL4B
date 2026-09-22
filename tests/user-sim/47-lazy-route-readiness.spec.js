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

    // ── THERE ARE TWO BOOT SHELLS NOW, and one of them has CONTENT. That is
    //    the third way the old contract was vacuous, not a softening of this
    //    one.
    //
    // This used to assert `shell.own === 0` flat, and that was true of the one
    // skeleton index.html shipped before the route swap: grey boxes, a
    // `role="status"` reading "Loading UIL4B", and no `<main>` at all.
    // `scripts/prerender.mjs` writes TWO variants now. The plain one is
    // unchanged. `/` gets `.boot-shell-home`, which paints the REAL Spectrum
    // hero — a `<main>` holding `h1.sp-hero-h1` with the approved sentence,
    // once for a screen reader and once word by word — deliberately, so the
    // shell is the page's largest paint until hydration.
    //
    // Measured on that variant: 135 characters inside `main`, from an
    // application that has not executed a line. That is comfortably over the
    // content floor `expectRendered()` applies, so ON THE ONE PAGE EVERY
    // VISITOR LANDS ON THE CONTENT COUNT NO LONGER DISTINGUISHES THE SHELL FROM
    // AN ARRIVED ROUTE. Only the boot-shell check does.
    //
    // WHICH VARIANT THIS TEST MEETS DEPENDS ON THE SERVER, so it is read rather
    // than assumed: `vite preview` resolves a clean URL like /privacy through
    // its single-page fallback to /index.html — the HOME shell — while Vercel's
    // rewrites serve the route's own prerendered file. Both are real, and the
    // contract is the same either way; branching on the class is what keeps
    // this from being an assertion about the preview server.
    const variant = (await page.locator('#boot-shell').getAttribute('class')) || ''
    if (variant.includes('boot-shell-home')) {
      expect(
        shell.own,
        'the front-door shell prepaints h1.sp-hero-h1 and measured nothing — either the hero was'
        + ' dropped from the prerendered shell, or index.html\'s `html:not([data-hero-prepainted])`'
        + ' gate hid it, which is a visible regression in the first paint',
      ).toBeGreaterThan(0)
    } else {
      expect(shell.own, 'the plain shell is grey boxes, so the route has rendered nothing at all').toBe(0)
    }

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

  /* ── A tool that has ARRIVED, and has no data ────────────────────────────
   *
   * The third mechanism, and the one neither build-asset shape explains.
   * 51-typography-paywall failed on 2026-09-06 with "the gallery rendered no
   * rows at all / Expected: > 10 / Received: 0", in a run with ZERO occurrences
   * of ERR_NO_BUFFER_SPACE, on a PR whose diff touched no font-related file,
   * and it passed 8 of 8 in isolation.
   *
   * The route had arrived. The TOOL had not: the three typography tools render
   * <FontCatalogLoading> INSTEAD of their workbench while the catalogue is in
   * flight, and `ready()` knew only about App.jsx's `.page-loading`.
   *
   * Held by never answering /api/fonts. The hold releases itself: googleFonts.js
   * aborts each source after FONT_CATALOG_SOURCE_TIMEOUT_MS (2000) and always
   * resolves to the bundled list, so this is a wait for a state the app
   * GUARANTEES terminates rather than a widened timeout.
   */
  const FONT_GALLERY = '/create/font-gallery'

  test('a tool showing its own data-loading state is not arrival either', async ({ page }) => {
    test.setTimeout(60000)
    let served = 0
    await page.route('**/api/fonts', () => { served += 1 })

    await goRaw(page, FONT_GALLERY)
    await expect(page.locator('.typ-loading > .fg-loader')).toBeVisible()

    // ── The vacuity, as five facts from one instant. Every condition the old
    // contract required is TRUE here, and the gallery is empty. ──
    const held = await renderState(page)
    expect(served, 'the catalogue request must actually have been held, or this proves nothing')
      .toBeGreaterThan(0)
    expect(held.mounted, 'THE OLD CONTRACT: React has mounted').toBe(true)
    expect(held.booting, 'THE OLD CONTRACT: the static boot shell is gone').toBe(false)
    expect(held.loading, 'THE OLD CONTRACT: no Suspense fallback is on screen').toBe(false)
    expect(held.dataLoading, 'THE NEW CONTRACT: the tool is showing its own loading state')
      .toBe(true)
    expect(await page.locator('.fg-card').count(),
      'and this is the number a spec measuring here reads, from a gallery that works')
      .toBe(0)

    // ── So ready() must not return into that window. ──
    await ready(page, FONT_GALLERY)
    const arrived = await renderState(page)
    expect(arrived.dataLoading, 'the tool state must be gone once ready() returns').toBe(false)
    expect(await page.locator('.fg-card').count(),
      'and the gallery must have its rows — the same reading, after the wait')
      .toBeGreaterThan(10)
  })

  test('the catalogue-loading state is told apart from a tool that has FINISHED with nothing', async ({ page }) => {
    // The discriminator, asserted rather than assumed. FontMatcher renders a
    // second `.typ-loading` for "No font catalogue is available right now" -
    // a rendered ANSWER, not a wait. If ready() waited on a bare `.typ-loading`
    // it would hang 20s on a page that had already finished, so the selector
    // takes the DIRECT-CHILD spinner. This pins that the spinner is what
    // separates them.
    await go(page, FONT_GALLERY)

    // The control first: a settled gallery is not data-loading.
    expect((await renderState(page)).dataLoading, 'a settled gallery is not data-loading')
      .toBe(false)

    // Now put FontMatcher's terminal state on the page, VERBATIM, and ask the
    // helper - not a selector written here, which would assert nothing about
    // what ready() actually does.
    await page.evaluate(() => {
      const el = document.createElement('div')
      el.id = 'tidef-terminal-probe'
      el.className = 'typ-loading'
      el.setAttribute('role', 'status')
      el.innerHTML = '<strong>No font catalogue is available right now.</strong>'
      document.body.appendChild(el)
    })
    expect(await page.locator('.typ-loading').count(), 'a spinner-less .typ-loading is on screen')
      .toBe(1)
    const withTerminal = await renderState(page)
    expect(
      withTerminal.dataLoading,
      'a .typ-loading with NO spinner is a rendered answer, not a wait. If the readiness'
      + ' selector matched it, every page reaching that state would burn the 20s backstop and'
      + ' fail as though it had never arrived.',
    ).toBe(false)

    // ...and the same helper DOES see the real loading state, or the assertion
    // above is satisfied by a helper that sees nothing at all.
    await page.evaluate(() => {
      document.getElementById('tidef-terminal-probe').innerHTML = '<div class="fg-loader"></div>'
    })
    expect(
      (await renderState(page)).dataLoading,
      'the same element WITH the spinner must be seen, or this test proves only that'
      + ' renderState reports false for everything',
    ).toBe(true)

    await page.evaluate(() => document.getElementById('tidef-terminal-probe').remove())
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
