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

  test('the quiet links point at sections that exist on this page', async ({ page }) => {
    await salesPage(page)
    const hrefs = await page.locator('.spnav-quiet-link').evaluateAll((els) => els.map((a) => a.getAttribute('href')))
    expect(hrefs.length, 'the three quiet links').toBe(3)
    for (const href of hrefs) {
      await expect(page.locator(href), `${href} is a link to nothing`).toHaveCount(1)
    }
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

  test('every tool in the tree is reachable, with its real route and its real badge', async ({ page }) => {
    await salesPage(page)
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toBeVisible()

    const rows = await page.locator('.spnav-tool').evaluateAll((els) => els.map((a) => ({
      label: a.querySelector('.spnav-tool-label')?.textContent?.trim(),
      href: a.getAttribute('href'),
      soon: a.hasAttribute('data-soon'),
      desc: a.querySelector('.spnav-tool-desc')?.textContent?.trim() || '',
      badges: [...a.querySelectorAll('.soon-badge,.beta-badge')].map((b) => b.textContent.trim()),
    })))
    // The pill has no mega menus, so this list IS the navigation on `/`.
    expect(rows.length, 'the marketing menu is not listing the tool tree').toBeGreaterThan(25)
    for (const r of rows) {
      expect(r.href, `${r.label} has no route`).toMatch(/^\//)
      // menuDescription's first rule: describing an unbuilt tool is a sentence
      // about something that does not exist.
      if (r.soon) {
        expect(r.desc, `the Soon row "${r.label}" describes what it will do once it exists`).toBe('')
        expect(r.badges, `${r.label} is Soon and says so`).toContain('Soon')
      }
      // Soon and Beta can never both render: a Soon tool is not mounted.
      expect(r.badges.length, `${r.label} wears two badges`).toBeLessThan(2)
    }
    const beta = rows.filter((r) => r.badges.includes('Beta'))
    if (beta.length) {
      const [soonColour, betaColour] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('.spnav-tool .soon-badge')).color,
        getComputedStyle(document.querySelector('.spnav-tool .beta-badge')).color,
      ])
      expect(betaColour, 'Beta is painting as a second Soon').not.toBe(soonColour)
    }
  })

  test('search, the theme control and the auth path all survive into the menu', async ({ page }) => {
    await salesPage(page)
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toBeVisible()

    // The three-way control, not just the pill's one-press cycle: the cycle
    // cannot be READ, and /settings documents the segment.
    await expect(menu.locator('.theme-seg-btn')).toHaveCount(3)
    await expect(menu.getByRole('button', { name: /Search tools/ })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Start for Free' })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Log in' })).toBeVisible()

    // The "/" shortcut still opens the palette, and the menu gets out of its way.
    await page.keyboard.press('Escape')
    await page.keyboard.press('/')
    await expect(page.locator('.cp-panel')).toBeVisible()
  })
})

test.describe('the pill at every width', () => {
  // The nav is the most common cause of horizontal overflow on this site, and
  // this one wraps by default — so each band has to SHED rather than stack.
  for (const w of [320, 360, 390, 414, 768, 834, 1024, 1280, 1440]) {
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
