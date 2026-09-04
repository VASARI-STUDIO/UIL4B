// Who owns the root scroller, and what an open popover may do to it.
//
// TWO RULES, BOTH MEASURED IN A BROWSER.
//
// 1. ONE ENGINE PER SCROLLER. Lenis drives the page whenever motion is on.
//    While it does, the browser must NOT also be animating the same scroller,
//    or a keyboard scroll and a wheel scroll are being eased by two
//    independent engines at once. global.css carries html{scroll-behavior:
//    smooth} unconditionally and an override that switches it off again; the
//    override used to be scoped `.lenis.lenis-smooth`, and lenis-smooth is a
//    class Lenis only wears while one of its OWN smooth scrolls is in flight
//    (lenis 1.3.25, dist/lenis.mjs:1027 builds the root class list from
//    `isScrolling === "smooth"`). At rest the selector did not match, so the
//    override was inert and the unconditional rule governed. It is scoped
//    `html.lenis` now, which is present for as long as the instance is
//    mounted. Backlog: lenis-scroll-behavior-override-inert.
//
//    Asserted in BOTH directions, because reduced motion on this project has
//    been found broken in both before: motion on (Lenis mounted, browser told
//    to keep off) and motion off (Lenis never instantiated, the reduced-motion
//    clamp doing the same job).
//
// 2. AN OPEN POPOVER DOES NOT QUIETLY TAX THE PAGE. usePopover keeps a
//    CAPTURE-phase scroll listener on window while a popover is open, so it
//    sees the scroll event of every element in the document and re-places the
//    panel for each one. That is a forced synchronous layout plus attribute
//    writes on every event of a gesture the user meant for the page.
//    Backlog: popover-open-scroll-suppression.
//
// WHAT THIS FILE DELIBERATELY DOES NOT ASSERT. It does not assert that an
// arrow key moves the page while the panel is open. That is the shape of the
// CI-only defect in popover-open-scroll-suppression, and
// 28-account-menu-keyboard.spec.js already decided — on three CI runs of
// evidence — to REPORT that as a finding rather than assert it, because the
// browser producing a default keyboard scroll at a given instant is not this
// app's contract to guarantee. Re-asserting it here would reintroduce exactly
// the false accusation that spec was rewritten to stop making.
//
// Every scroll number below is read once the page has come to REST, through
// helpers.js, which polls animation frames and waits on Lenis's own
// `lenis-scrolling` class. Never a fixed timeout, and never two equal pixel
// readings — both go green on a page that never moved.
import { test, expect } from './base.js'
import { go, restingScrollY, restAfterMove, watch } from './helpers.js'

const PANEL = '#pnav-account-pop'
const TRIGGER = '.pnav-more'

// The account panel hangs off the top right (measured: x 1134-1394, y 58-451
// at 1440x900). This point is well clear of it, so a wheel here is aimed at
// the PAGE and the panel's own containment is not what is under test.
const OVER_THE_PAGE = { x: 400, y: 620 }

async function rootScrollState(page) {
  return page.evaluate(() => ({
    classes: document.documentElement.className,
    lenis: document.documentElement.classList.contains('lenis'),
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    reducedMotion: document.documentElement.getAttribute('data-reduced-motion'),
  }))
}

async function openPanel(page) {
  await page.locator(TRIGGER).click()
  await expect(page.locator(PANEL)).toBeVisible()
  // usePopover moves focus on a rAF, so the panel is in the DOM a frame before
  // it is settled. Wait for that rather than measuring through it.
  await expect.poll(() => page.evaluate((sel) => {
    const panel = document.querySelector(sel)
    return !!panel && (panel === document.activeElement || panel.contains(document.activeElement))
  }, PANEL)).toBe(true)
}

test.describe('one engine per scroller', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor who scrolls') })

  test('with motion on, Lenis owns the root and the browser is told not to animate it too', async ({ page }) => {
    await go(page, '/help')
    // Lenis mounts in an effect, so wait for the engine to actually be there
    // before asking what the rules say about it.
    await expect.poll(async () => (await rootScrollState(page)).lenis, {
      message: 'Lenis never mounted, so there is no override to test',
    }).toBe(true)

    const state = await rootScrollState(page)
    expect(state.reducedMotion, 'this case is the motion-ON one').toBe('false')
    expect(
      state.scrollBehavior,
      `Lenis is driving the root (html class "${state.classes}") while the browser was also `
      + 'told to animate it. Two engines easing one scroller is the defect; the '
      + 'override must be scoped to a class Lenis wears the whole time it is mounted, '
      + 'not to lenis-smooth, which it wears only mid-scroll.',
    ).toBe('auto')
  })

  test.describe('with reduced motion', () => {
    // `test.use({ reducedMotion: 'reduce' })` is NOT used here, and that is
    // deliberate: it is inert in this suite. Measured on this branch — a spec
    // whose only reduced-motion setup was that option reported
    // `matchMedia('(prefers-reduced-motion: reduce)').matches === false` and
    // `data-reduced-motion="false"`, i.e. it ran the MOTION-ON path while
    // claiming to test the other one. `page.emulateMedia` does take, and is
    // what 04, 27 and 30 already reach for.
    test('Lenis is never instantiated and the root is still not animated', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await go(page, '/help')

      // ASSERT THE PRECONDITION. Without this the whole test passes on a
      // browser that never asked for reduced motion at all — `scroll-behavior`
      // is `auto` on the motion-ON path too now, so every assertion below
      // would go green for the wrong reason.
      expect(
        await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
        'the reduced-motion emulation did not take, so this would have tested the motion-on path',
      ).toBe(true)
      await expect.poll(async () => (await rootScrollState(page)).reducedMotion).toBe('true')

      const state = await rootScrollState(page)
      expect(
        state.lenis,
        'reduced motion must not instantiate Lenis at all, not merely slow it down',
      ).toBe(false)
      expect(
        state.scrollBehavior,
        'a visitor who asked for less motion was given an animated page scroll',
      ).toBe('auto')
    })
  })
})

test.describe('an open popover and the page behind it', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor who scrolls') })

  // A REAL wheel, not a programmatic scrollTo. Lenis intercepts the wheel
  // globally, so a scrollTo would bypass the one code path this is about.
  //
  // READ THIS BEFORE TRUSTING IT AS A REGRESSION GUARD: it is NOT one, and it
  // is labelled that way on purpose. A test is only worth what it has been
  // seen to FAIL for, and four separate attempts to break this one all left it
  // green, on a build where each mutation was confirmed to be live:
  //
  //   1. markScrollContainers(document.body) instead of the panel, putting
  //      overscroll-behavior:contain on the body and every scroller in it.
  //   2. A non-passive window wheel listener calling preventDefault on every
  //      wheel event for as long as the popover was open.
  //   3. The `lenis-stopped` class on <html>, whose global.css rule is
  //      overflow:hidden.
  //   4. An inline style.overflow = 'hidden' on <html>.
  //
  // The page scrolled anyway in all four. THAT IS THE INTERESTING PART, and it
  // belongs to popover-open-scroll-suppression rather than to this test: while
  // Lenis is live it does not use the browser's default wheel scroll at all, it
  // reads the gesture and drives the scroll itself, so preventing the default
  // prevents nothing and hiding the root's overflow hides nothing. Lenis also
  // rewrites its own lenis-* class list every frame, which strips mutation 3.
  //
  // So an open popover cannot easily suppress a WHEEL scroll on this build,
  // which points the CI defect at the KEYBOARD path instead — the one input
  // Lenis does not drive, where the browser's own default scroll is what has
  // to arrive. What this test is, then, is a live smoke check that the page
  // still scrolls with a panel open, and a record of those four mutations.
  test('a wheel aimed at the page still scrolls it while the panel is open', async ({ page }) => {
    await go(page, '/')
    await openPanel(page)

    const before = await restingScrollY(page, 'the home page before the wheel')
    await page.mouse.move(OVER_THE_PAGE.x, OVER_THE_PAGE.y)
    await page.mouse.wheel(0, 700)
    const after = await restAfterMove(page, before, 'the home page after a wheel aimed past the open panel')

    await expect(page.locator(PANEL), 'the panel must still be open, or this measured nothing').toBeVisible()
    expect(
      after,
      'an open popover swallowed a wheel gesture that was aimed at the page well clear of it. '
      + 'The containment on the panel is meant to stop the gesture at the panel BOUNDARY, not to '
      + 'take the page away from a pointer that never entered it.',
    ).toBeGreaterThan(before)
  })

  test('an open panel does not rewrite its placement on every scroll event', async ({ page }) => {
    await go(page, '/')
    await openPanel(page)

    // placePopover writes data-pop-align, data-pop-side and --pop-max-h. The
    // trigger lives in a FIXED bar, so none of the three can change while the
    // page scrolls underneath it, and every write would be rewriting the value
    // already there — each one invalidating layout that the next scroll event
    // then forces to be recomputed.
    await page.evaluate((sel) => {
      const panel = document.querySelector(sel)
      window.__placementWrites = 0
      window.__placementObserver = new MutationObserver((records) => { window.__placementWrites += records.length })
      window.__placementObserver.observe(panel, {
        attributes: true,
        attributeFilter: ['style', 'data-pop-align', 'data-pop-side'],
      })
    }, PANEL)

    const before = await restingScrollY(page, 'the home page before the wheel')
    await page.mouse.move(OVER_THE_PAGE.x, OVER_THE_PAGE.y)
    await page.mouse.wheel(0, 900)
    const after = await restAfterMove(page, before, 'the home page after the wheel')

    const writes = await page.evaluate(() => {
      window.__placementObserver.disconnect()
      return window.__placementWrites
    })

    // THE CONTROL FIRST. Zero writes is the pass condition, and zero writes is
    // also what a gesture that never happened produces. Prove the page moved
    // before reading anything into the count.
    expect(after, 'the wheel never scrolled the page, so the write count below means nothing').toBeGreaterThan(before)
    expect(
      writes,
      `the open panel rewrote its placement ${writes} times during one wheel gesture. `
      + 'Each write invalidates layout that the next scroll event forces to be recomputed, '
      + 'on every scroll event of every scroller in the document, for a panel anchored to a '
      + 'fixed bar whose placement cannot have changed.',
    ).toBe(0)
  })
})
