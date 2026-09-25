// The MARKETING nav — the floating pill on the sales page.
//
// ───────────────────────────────────────────────────────────────────────────
// THIS FILE SKIPS UNTIL THE NAV IS MOUNTED, AND THAT IS DELIBERATE
// ───────────────────────────────────────────────────────────────────────────
// SpectrumNav.jsx is built, rendered and verified, but `/` still serves the
// old Home page: moving Spectrum to `/` is W2's work, and swapping the nav is
// a one-line change in src/pages/Spectrum.jsx (`<PillNav variant="spectrum" />`)
// that belongs to whoever owns that file. Two OTHER specs go to `/` and read
// `.pnav-*` — 52-header-optical-alignment and 24-mobile-overhaul — so the
// mount and their re-pointing have to land together.
//
// Until they do, every test below skips with a message naming the change, and
// tests/unit/spectrum-nav-contract.test.js holds the parts that can be read
// off the source. A skipped test is honest; a test asserting against a nav
// nobody can reach is not.
//
// WHAT IT GUARDS. The founder's number-one constraint is that no functionality
// is lost, and this bar carries five controls where the app header carries
// fifteen. Everything the pill drops has to be in the full-screen menu, and
// that menu has to behave like a dialog: focus in, focus trapped, scroll
// locked, Escape out and back to the burger.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const MOUNT = 'the marketing nav is not mounted yet — Spectrum.jsx line ~354 still '
  + 'renders <PillNav />; change it to <PillNav variant="spectrum" /> and re-point '
  + '52-header-optical-alignment + 24-mobile-overhaul off `/` in the same commit.'

/** Navigates to the sales page and skips the test if the pill is not there. */
async function salesPage(page) {
  await go(page, '/')
  const mounted = await page.locator('.spnav').count()
  test.skip(mounted === 0, MOUNT)
}

test.describe('the marketing pill', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a first-time visitor on the sales page') })

  test('the pill floats over the hero without eating clicks through it', async ({ page }) => {
    await salesPage(page)
    // The wrapper spans the full width so the pill can centre itself. If it
    // took pointer events it would swallow every click on the top of the hero.
    const pe = await page.locator('.spnav').evaluate((el) => getComputedStyle(el).pointerEvents)
    const barPe = await page.locator('.spnav-bar').evaluate((el) => getComputedStyle(el).pointerEvents)
    expect(pe, 'the full-width nav band is taking clicks meant for the hero').toBe('none')
    expect(barPe, 'the pill itself has stopped taking clicks').toBe('auto')
  })

  test('the quiet links are the design\'s three, and each goes somewhere real', async ({ page }) => {
    await salesPage(page)
    const links = await page.locator('.spnav-quiet-link').evaluateAll((els) => els.map((a) => ({
      label: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current'),
    })))
    // Tools / Pricing / On mobile — `UIL4B - Spectrum.dc.html` lines 226-228.
    expect(links.map((l) => l.label), 'the design\'s three quiet links, in its order').toEqual(['Tools', 'Pricing', 'On mobile'])
    // Tools is a section of THIS page; Pricing and On mobile are screens.
    for (const { href } of links.filter((l) => l.href.startsWith('#'))) {
      await expect(page.locator(href), `${href} is a link to nothing`).toHaveCount(1)
    }
    expect(links.find((l) => l.label === 'On mobile').href).toBe('/mobile')
    // Pricing is the design's separate Pricing screen, which is /plans.
    expect(links.find((l) => l.label === 'Pricing').href).toBe('/plans')
    // The sales page is the design's "Tools" screen, so Tools is the current one.
    expect(links.map((l) => l.current)).toEqual(['page', null, null])
  })

  test('the bar hides on the way down and comes back on the way up', async ({ page }) => {
    await salesPage(page)
    await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '0')
    await page.evaluate(() => window.scrollTo(0, 1200))
    await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '1')
    await page.evaluate(() => window.scrollTo(0, 700))
    // There is a deliberate beat before it returns, so a stray wheel nudge
    // does not flash the bar.
    await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '0')
  })

  test('nothing hides when the visitor has asked for less motion', async ({ browser }) => {
    // Spectrum's own script makes this call and it is the right one: a bar that
    // teleports away with no transition reads as a rendering fault, and asking
    // for less motion is not asking for less navigation.
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await go(page, '/')
    const mounted = await page.locator('.spnav').count()
    if (!mounted) { await ctx.close(); test.skip(true, MOUNT); return }
    await page.evaluate(() => window.scrollTo(0, 1200))
    /* WAIT FOR THE STATE, THEN MEASURE THE PAINT.
     *
     * Hide-on-scroll is a scroll LISTENER that sets React state, so the
     * attribute lands a commit after the scroll, not with it. This read once,
     * synchronously, and caught the bar mid-flight — `data-nav-hidden` was
     * still '0'. The sibling test above asserts the same flip with
     * `toHaveAttribute`, which retries, and passes; that pair is what shows
     * this was the harness and not the component.
     *
     * It only surfaced now because this whole file skipped until the marketing
     * pill was actually mounted on `/`. A spec that has never run is a spec
     * whose races have never been paid for. */
    await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '1')
    const painted = await page.locator('.spnav').evaluate((el) => ({
      hidden: el.dataset.navHidden,
      transform: getComputedStyle(el).transform,
      opacity: getComputedStyle(el).opacity,
    }))
    // The STATE still flips — the bar just does not move.
    expect(painted.hidden).toBe('1')
    expect(painted.transform, 'the bar still slid away under reduced motion').toBe('none')
    expect(Number(painted.opacity), 'the bar still faded out under reduced motion').toBe(1)
    await ctx.close()
  })
})

test.describe('the full-screen menu carries what the pill drops', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor looking for a tool from the sales page') })

  test('it is a real dialog: focus in, scroll locked, Escape back to the burger', async ({ page }) => {
    await salesPage(page)
    const burger = page.locator('.spnav-burger')
    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await burger.click()

    const menu = page.locator('.spnav-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toHaveAttribute('aria-modal', 'true')
    await expect(burger).toHaveAttribute('aria-expanded', 'true')
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow),
      'the page behind the menu is still scrolling').toBe('hidden')
    expect(await page.evaluate(() => document.querySelector('.spnav-menu').contains(document.activeElement)),
      'focus never moved into the menu').toBe(true)
    // The burger says "close" now, visually as well as by its label.
    await expect(page.locator('.spnav-burger-ico')).toHaveAttribute('data-burger', 'in')

    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow),
      'the scroll lock outlived the menu').not.toBe('hidden')
    await expect(burger, 'Escape closed the menu and dropped focus on the floor').toBeFocused()
  })

  test('Tab is trapped inside the menu', async ({ page }) => {
    await salesPage(page)
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toBeVisible()
    // Backwards off the first control must wrap to the last, not escape to the
    // page underneath.
    await page.keyboard.press('Shift+Tab')
    expect(await page.evaluate(() => document.querySelector('.spnav-menu').contains(document.activeElement))).toBe(true)
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.querySelector('.spnav-menu').contains(document.activeElement)),
      'Tab walked out of the back of the menu').toBe(true)
  })

  test('it is the design\'s menu: four big items and the note, nothing else', async ({ page }) => {
    // The design is the spec and it has no mega menu. The design's menu (UIL4B - Spectrum.dc.html 248-257) is these four and the
    // note. An earlier pass hung the whole tool tree, search, the theme segment
    // and the account block underneath; this fails if any of it comes back.
    await salesPage(page)
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toHaveAttribute('data-menu', 'in')
    const items = await menu.locator('.spnav-rail .spnav-mi').evaluateAll((els) => els.map((a) => ({
      label: a.textContent.trim(), href: a.getAttribute('href'),
    })))
    expect(items).toEqual([
      { label: 'Tools', href: '#bench' },
      { label: 'Pricing', href: '/plans' },
      { label: 'On mobile', href: '/mobile' },
      { label: 'Open the toolkit ↗', href: '/projects' },
    ])
    await expect(menu.locator('.spnav-mi-note')).toHaveText('EVERY CORE TOOL IS FREE, FOREVER')
    // Nothing else that can take focus: the Close pill plus the four items.
    const focusables = await menu.locator('a[href], button').count()
    expect(focusables, 'the menu carries more than the design\'s items again').toBe(5)
  })

  test('the "/" shortcut still opens tool search, and the theme cycle is on the pill', async ({ page }) => {
    // What the old menu carried that the product still offers from the front
    // door: search on the same shortcut (it draws nothing), and the theme, as
    // the design's own one-press cycle on the bar.
    await salesPage(page)
    await expect(page.locator('.spnav-bar .spnav-icon[aria-label^="Theme:"]')).toBeVisible()
    await page.keyboard.press('/')
    await expect(page.locator('.cp-panel')).toBeVisible()
  })
})

test.describe('the pill at every width', () => {
  // The nav is the most common cause of horizontal overflow on this site, and
  // this one wraps by default — so each band has to SHED rather than stack.
  // 430, 480 and 560 are where the eyebrow and CTA bands sit; 430 caught a
  // wrap the original list could not see.
  for (const w of [320, 360, 390, 414, 430, 480, 560, 768, 834, 1024, 1280, 1440]) {
    test(`no horizontal overflow and one row of pill at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await salesPage(page)
      const shape = await page.evaluate(() => {
        const bar = document.querySelector('.spnav-bar').getBoundingClientRect()
        return {
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          left: bar.left, right: bar.right, height: bar.height, vw: innerWidth,
        }
      })
      expect(shape.over, `${w}px: the page scrolls sideways by`).toBeLessThanOrEqual(0)
      expect(shape.left, `${w}px: the pill starts off the left edge`).toBeGreaterThanOrEqual(0)
      expect(shape.right, `${w}px: the pill runs past the right edge`).toBeLessThanOrEqual(shape.vw)
      // A four-line pill parked over the hero is not a nav.
      expect(shape.height, `${w}px: the pill wrapped to more than one row`).toBeLessThan(80)
    })
  }
})
