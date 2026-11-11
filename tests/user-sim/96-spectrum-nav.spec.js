// The MARKETING nav: the flat bar on the sales pages (/, /home, /tools, /mobile,
// /plans, the site map and the roadmap).
//
// WHAT IT IS. A full-width bar: the logo, three quiet links (Tools, Plans, On
// mobile) and a "Search tools" pill that carries its shortcut. Up to 767px the
// links and the pill give way to a search button and a menu button, and the
// menu is a full-screen dialog: Tools, Plans, On mobile, then a "This page"
// group of the sales page's section anchors. There is no theme control, no
// call to action and no note in it; "Open the toolkit" lives in the hero.
//
// WHAT IT GUARDS.
//   · The bar hides on the way down and returns on the way up, except inside a
//     `[data-pins]` box (the pinned tools and exports stages). Entering one
//     from below hides a bar that is showing, and it stays off screen for as
//     long as the top of the viewport is inside the box, under reduced motion
//     too, where it leaves with no transition. Keyboard focus in the bar shows
//     it at once, and it comes back when the viewport top leaves the box.
//   · The menu behaves like a dialog: focus in, focus trapped, scroll locked,
//     Escape out and back to the burger.
//   · "/" opens the nav's tool search. Control or Command K focuses the hero's
//     own command bar when the page has one.
//   · The bar is one row with no sideways scroll from 320 to 1440.
import { test, expect } from './base.js'
import { go, homeSectionsLoaded, watch } from './helpers.js'

const PHONE = { width: 390, height: 844 }

/** The sales page, with the below-fold sections mounted so their anchors exist. */
async function salesPage(page) {
  await go(page, '/')
  await expect(page.locator('.spnav')).toHaveCount(1)
}

/** The sales page at a phone width, where the menu button is drawn. */
async function phoneSalesPage(page) {
  await page.setViewportSize(PHONE)
  await salesPage(page)
}

// Shift+Tab backwards from the first focusable in main until focus is in the bar.
async function shiftTabIntoBar(page) {
  await page.evaluate(() => {
    document.querySelector('#main')
      .querySelector('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')
      .focus({ preventScroll: true })
  })
  for (let i = 0; i < 14; i++) {
    if (await page.evaluate(() => !!document.activeElement.closest('.spnav'))) return
    await page.keyboard.press('Shift+Tab')
  }
  expect(await page.evaluate(() => !!document.activeElement.closest('.spnav')), 'Shift+Tab never reached the bar').toBe(true)
}

test.describe('the marketing bar', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a first-time visitor on the sales page') })

  test('it is a flat bar across the top that owns its own band, not a pill floating over the hero', async ({ page }) => {
    await salesPage(page)
    const shape = await page.evaluate(() => {
      const nav = document.querySelector('.spnav')
      const r = nav.getBoundingClientRect()
      const bar = document.querySelector('.spnav-bar').getBoundingClientRect()
      const cs = getComputedStyle(nav)
      // A point in the bar's empty band, between the logo and the links.
      const gap = document.elementFromPoint(innerWidth / 2, bar.height / 2)
      return { left: r.left, right: innerWidth - r.right, top: r.top, height: bar.height, position: cs.position, owned: !!gap?.closest('.spnav') }
    })
    expect(shape.position, 'the bar is not fixed to the top').toBe('fixed')
    expect([shape.left, shape.right, shape.top], 'the bar does not span the viewport edge to edge').toEqual([0, 0, 0])
    // 24px above and below a 44px row.
    expect(shape.height, 'the bar is not the 92px band the pages reserve').toBe(92)
    expect(shape.owned, 'the bar\'s empty band lets clicks through to the hero').toBe(true)
  })

  test('the quiet links are Tools, Plans and On mobile, and each goes somewhere real', async ({ page }) => {
    await salesPage(page)
    await homeSectionsLoaded(page)
    const links = await page.locator('.spnav-quiet-link').evaluateAll((els) => els.map((a) => ({
      label: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current'),
    })))
    expect(links.map((l) => l.label), 'the three quiet links, in order').toEqual(['Tools', 'Plans', 'On mobile'])
    // On the sales page Tools is a section of the page; the other two are screens.
    expect(links.map((l) => l.href)).toEqual(['#try', '/plans', '/mobile'])
    await expect(page.locator('#try'), '#try is a link to nothing').toHaveCount(1)
    // The sales page is none of the three screens, so none of the links is current.
    expect(links.map((l) => l.current), '/ marks no quiet link as current').toEqual([null, null, null])
  })

  test('the search pill names the shortcut for the platform: Ctrl K, or the command key on an Apple machine', async ({ browser }) => {
    const hint = async (platform) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      // The hint reads userAgentData.platform first and navigator.platform second.
      await ctx.addInitScript((p) => Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ platform: p }) }), platform)
      const page = await ctx.newPage()
      await go(page, '/')
      const pill = page.locator('.spnav-search')
      await expect(pill).toContainText('Search tools')
      const text = (await pill.locator('kbd').textContent()).trim()
      const keys = await pill.getAttribute('aria-keyshortcuts')
      await ctx.close()
      return { text, keys }
    }
    expect(await hint('Win32'), 'a Windows or Linux visitor sees Ctrl K').toEqual({ text: 'Ctrl K', keys: 'Control+K' })
    expect(await hint('MacIntel'), 'a Mac visitor sees the command key').toEqual({ text: '⌘K', keys: 'Meta+K' })
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

  test('scrolling up inside a pinned stage does not bring the bar back, and keyboard focus does', async ({ page }) => {
    await salesPage(page)
    await homeSectionsLoaded(page)
    const stage = await page.locator('[data-pins]').first().evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top + scrollY, height: r.height }
    })
    expect(stage.height, 'POSITIVE CONTROL: the pinned stage is taller than a screen, so there is room to scroll inside it').toBeGreaterThan(900)
    const nav = page.locator('.spnav')
    // Into the stage and down: the bar hides.
    await page.evaluate((y) => window.scrollTo(0, y), stage.top + 300)
    await page.evaluate((y) => window.scrollTo(0, y), stage.top + 600)
    await expect(nav).toHaveAttribute('data-nav-hidden', '1')
    // Up, still inside the stage. The bar's return delay is 140ms, so 600ms is
    // long past when it would have come back.
    await page.evaluate((y) => window.scrollTo(0, y), stage.top + 450)
    await page.waitForTimeout(600)
    expect(await page.evaluate(() => window.scrollY), 'precondition: the viewport top is still inside the stage').toBeGreaterThan(stage.top)
    await expect(nav, 'the bar came back while the viewport top was inside a pinned stage').toHaveAttribute('data-nav-hidden', '1')
    // Keyboard focus into the bar still brings it back at once.
    await shiftTabIntoBar(page)
    await expect(nav).toHaveAttribute('data-nav-hidden', '0')
  })

  test('nothing hides when the visitor has asked for less motion', async ({ browser }) => {
    // A bar that teleports away with no transition reads as a rendering fault,
    // and asking for less motion is not asking for less navigation.
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await go(page, '/')
    await page.evaluate(() => window.scrollTo(0, 1200))
    // Wait for the state, then measure the paint: hide-on-scroll is a scroll
    // listener that sets React state, so the attribute lands a commit after the
    // scroll, not with it.
    await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '1')
    const painted = await page.locator('.spnav').evaluate((el) => ({
      hidden: el.dataset.navHidden,
      transform: getComputedStyle(el).transform,
      opacity: getComputedStyle(el).opacity,
    }))
    // The STATE still flips; the bar just does not move.
    expect(painted.hidden).toBe('1')
    expect(painted.transform, 'the bar still slid away under reduced motion').toBe('none')
    expect(Number(painted.opacity), 'the bar still faded out under reduced motion').toBe(1)
    await ctx.close()
  })
})

// The pinned stages, each as the selector for its `[data-pins]` root.
const PIN_BOXES = [
  { name: 'the tools stage', selector: '#try [data-pins]', below: false },
  { name: 'the exports stack', selector: '#exports[data-pins]', below: true },
]
const PIN_VIEWS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]
const MOTIONS = ['no-preference', 'reduce']

const scrollPage = (page, y) => page.evaluate((to) => window.scrollTo(0, to), y)
const scrollNow = (page) => page.evaluate(() => Math.round(window.scrollY))
/** Where the box sits on the page right now: its top and height in document coordinates. */
const boxSpan = (page, selector) => page.locator(selector).first().evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height) }
})
/** The bottom edge of the bar on screen: 0 or less means all of it is above the viewport. */
const barBottom = (page) => page.locator('.spnav').evaluate((el) => Math.round(el.getBoundingClientRect().bottom))

/**
 * Down to the end of the page, then back up. With `below` set, it stops just under
 * the box, where the bar has returned and is plainly on screen. The tools stage has
 * the exports stack directly under it, so for that box the way up passes through
 * the exports stack instead and the bar is already away. Returns the box's span.
 */
async function bottomUpToBelow(page, selector, below) {
  await homeSectionsLoaded(page)
  const nav = page.locator('.spnav')
  const box = await boxSpan(page, selector)
  expect(box.height, 'POSITIVE CONTROL: the box is taller than a screen, so the viewport top can sit inside it').toBeGreaterThan(page.viewportSize().height)
  await scrollPage(page, await page.evaluate(() => document.documentElement.scrollHeight))
  await expect(nav, 'the bar did not hide on the way to the page bottom').toHaveAttribute('data-nav-hidden', '1')
  if (below) {
    await scrollPage(page, box.top + box.height + 150)
    await expect(nav, 'the bar did not return on the way up below the box').toHaveAttribute('data-nav-hidden', '0')
    await expect.poll(() => barBottom(page), { message: 'the bar is not on screen below the box' }).toBeGreaterThan(0)
  }
  return boxSpan(page, selector)
}

for (const motion of MOTIONS) {
  for (const view of PIN_VIEWS) {
    for (const { name, selector, below } of PIN_BOXES) {
      test.describe(`the bar inside ${name} at ${view.width}px, motion ${motion}`, () => {
        test.use({ viewport: view, reducedMotion: motion })
        test.beforeEach(async ({ page }) => { watch(page, 'a visitor scrolling back up the sales page') })

        test('scrolling up into the box hides the bar and it stays off screen all the way up, then returns at the box top', async ({ page }) => {
          await go(page, '/')
          const nav = page.locator('.spnav')
          const box = await bottomUpToBelow(page, selector, below)
          for (const share of [0.85, 0.5, 0.15]) {
            const y = box.top + Math.round(box.height * share)
            await scrollPage(page, y)
            expect(await scrollNow(page), 'precondition: the viewport top is inside the box').toBeGreaterThan(box.top)
            await expect(nav, `the bar showed at ${share} of the way down ${name}`).toHaveAttribute('data-nav-hidden', '1')
            await expect.poll(() => barBottom(page), { message: `the bar is still on screen at ${share} of the way down ${name}` }).toBeLessThanOrEqual(0)
            // Longer than the bar's 140ms return delay: a late return would show by now.
            await page.waitForTimeout(400)
            expect(await barBottom(page), `the bar came back at ${share} of the way down ${name}`).toBeLessThanOrEqual(0)
          }
          // Past the tools stage's top edge the bar is the page's again. (Above the exports stack is the tools stage.)
          if (!below) {
            await scrollPage(page, box.top - 200)
            await expect(nav, 'the bar did not return after the box was left').toHaveAttribute('data-nav-hidden', '0')
            await expect.poll(() => barBottom(page), { message: 'the bar is not on screen above the box' }).toBeGreaterThan(0)
          }
        })

        test('keyboard focus in the bar shows it inside the box', async ({ page }) => {
          await go(page, '/')
          const nav = page.locator('.spnav')
          const box = await bottomUpToBelow(page, selector, below)
          await scrollPage(page, box.top + Math.round(box.height * 0.5))
          await expect.poll(() => barBottom(page), { message: 'precondition: the bar is off screen inside the box' }).toBeLessThanOrEqual(0)
          await shiftTabIntoBar(page)
          await expect(nav).toHaveAttribute('data-nav-hidden', '0')
          await expect.poll(() => barBottom(page), { message: 'the focused bar is still off screen' }).toBeGreaterThan(0)
          expect(await scrollNow(page), 'precondition: the viewport top is still inside the box').toBeGreaterThan(box.top)
        })
      })
    }
  }
}

test.describe('the keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor looking for a tool from the sales page') })

  test('"/" opens tool search, and the bar carries no theme control', async ({ page }) => {
    await salesPage(page)
    await expect(page.locator('.spnav [aria-label^="Theme"]'), 'the theme cycle is back on the bar').toHaveCount(0)
    await page.keyboard.press('/')
    await expect(page.locator('.cp-panel')).toBeVisible()
  })

  test('"/" typed into a field is text, not a shortcut', async ({ page }) => {
    await salesPage(page)
    await page.locator('.hcmd-input').fill('')
    await page.locator('.hcmd-input').focus()
    await page.keyboard.type('a/b')
    await expect(page.locator('.hcmd-input')).toHaveValue('a/b')
    await expect(page.locator('.cp-panel')).toHaveCount(0)
  })

  test('Control+K focuses the hero command bar and does not open the nav search', async ({ page }) => {
    await salesPage(page)
    await expect(page.locator('.hcmd-input')).not.toBeFocused()
    await page.keyboard.press('Control+k')
    await expect(page.locator('.hcmd-input'), 'the chord did not reach the hero command bar').toBeFocused()
    await expect(page.locator('.cp-panel'), 'the chord opened the nav search over the hero bar').toHaveCount(0)
  })

  test('Control+K opens the nav search on a page that has no hero command bar', async ({ page }) => {
    await go(page, '/mobile')
    await expect(page.locator('.hcmd-input')).toHaveCount(0)
    await page.keyboard.press('Control+k')
    await expect(page.locator('.cp-panel')).toBeVisible()
  })
})

test.describe('the phone menu carries what the bar drops', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor looking for a tool from the sales page on a phone') })

  test('it is a real dialog: focus in, scroll locked, Escape back to the burger', async ({ page }) => {
    await phoneSalesPage(page)
    const burger = page.locator('.spnav-burger')
    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await burger.click()

    const menu = page.locator('.spnav-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toHaveAttribute('aria-modal', 'true')
    await expect(burger).toHaveAttribute('aria-expanded', 'true')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow),
      'the page behind the menu is still scrolling').toBe('hidden')
    expect(await page.evaluate(() => document.querySelector('.spnav-menu').contains(document.activeElement)),
      'focus never moved into the menu').toBe(true)
    // The burger says "close" now, visually as well as by its label.
    await expect(page.locator('.spnav-burger-ico')).toHaveAttribute('data-burger', 'in')

    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow),
      'the scroll lock outlived the menu').not.toBe('hidden')
    await expect(burger, 'Escape closed the menu and dropped focus on the floor').toBeFocused()
  })

  // On the sales page Tools is a section of the page, so the menu link jumps
  // there: it must close the menu, release the lock, and put focus on the
  // section's heading rather than leave it on a link that has just unmounted.
  test('Tools in the menu closes it and lands on the Try the tools section', async ({ page }) => {
    await phoneSalesPage(page)
    await homeSectionsLoaded(page)
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toBeVisible()
    await menu.locator('a.spnav-mi', { hasText: 'Tools' }).first().click()
    await expect(menu).toHaveCount(0)
    await expect(page).toHaveURL(/\/#try$/)
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#try') !== null && document.activeElement?.tagName === 'H2'),
      { message: 'focus did not land on the section heading' }).toBe(true)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'the scroll lock outlived the menu').not.toBe('hidden')
  })

  test('Tab is trapped inside the menu', async ({ page }) => {
    await phoneSalesPage(page)
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toBeVisible()
    // Backwards off the first control must wrap to the last, not escape to the
    // page underneath.
    await page.keyboard.press('Shift+Tab')
    expect(await page.evaluate(() => document.querySelector('.spnav-menu').contains(document.activeElement))).toBe(true)
    // More presses than the menu has controls (Close plus eight links).
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.querySelector('.spnav-menu').contains(document.activeElement)),
      'Tab walked out of the back of the menu').toBe(true)
  })

  test('it holds Tools, Plans and On mobile, then a "This page" group of the five sections, and nothing else', async ({ page }) => {
    await phoneSalesPage(page)
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toHaveAttribute('data-menu', 'in')
    const read = (loc) => loc.evaluateAll((els) => els.map((a) => ({ label: a.textContent.trim(), href: a.getAttribute('href') })))
    expect(await read(menu.locator('.spnav-rail > a.spnav-mi'))).toEqual([
      { label: 'Tools', href: '#try' },
      { label: 'Plans', href: '/plans' },
      { label: 'On mobile', href: '/mobile' },
    ])
    await expect(menu.locator('.spnav-mi-label')).toHaveText('This page')
    const group = menu.getByRole('group', { name: 'This page' })
    expect(await read(group.locator('a'))).toEqual([
      { label: 'Bookmarks', href: '#bookmarks' },
      { label: 'Try the tools', href: '#try' },
      { label: 'Exports', href: '#exports' },
      { label: 'Examples', href: '#examples' },
      { label: 'Plans', href: '#plans' },
    ])
    // "Open the toolkit" stays in the hero; the menu has no call to action, no theme control and no note.
    await expect(menu.getByText('Open the toolkit')).toHaveCount(0)
    await expect(menu.locator('.spnav-mi-note')).toHaveCount(0)
    await expect(menu.locator('[aria-label^="Theme"]')).toHaveCount(0)
    // Close plus the three routes plus the five sections: nothing else takes focus.
    expect(await menu.locator('a[href], button').count(), 'the menu carries more than its items again').toBe(9)
  })

  test('off the sales page the menu has no "This page" group', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await go(page, '/plans')
    await page.locator('.spnav-burger').click()
    const menu = page.locator('.spnav-menu')
    await expect(menu).toHaveAttribute('data-menu', 'in')
    await expect(menu.locator('.spnav-mi-label')).toHaveCount(0)
    // The page you are on is announced as the current one.
    await expect(menu.locator('a.spnav-mi[aria-current="page"]')).toHaveText('Plans')
  })
})

test.describe('the bar at every width', () => {
  // The nav is the most common cause of horizontal overflow on this site, so
  // each band has to SHED rather than stack: links and pill up to 767px give way
  // to two 44px buttons. 430, 480 and 560 are where the hero bands sit.
  for (const w of [320, 360, 390, 414, 430, 480, 560, 768, 834, 1024, 1280, 1440]) {
    test(`no horizontal overflow and one row of bar at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await salesPage(page)
      const shape = await page.evaluate(() => {
        const bar = document.querySelector('.spnav-bar').getBoundingClientRect()
        const drawn = [...document.querySelectorAll('.spnav-mark, .spnav-quiet-link, .spnav-search, .spnav-icon')]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0)
        const centres = drawn.map((r) => r.top + r.height / 2)
        return {
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          left: bar.left, right: bar.right, vw: innerWidth, barHeight: bar.height,
          controls: drawn.length, spread: Math.max(...centres) - Math.min(...centres),
          farthest: Math.max(...drawn.map((r) => r.right)),
        }
      })
      expect(shape.over, `${w}px: the page scrolls sideways by`).toBeLessThanOrEqual(0)
      expect(shape.left, `${w}px: the bar starts off the left edge`).toBeGreaterThanOrEqual(0)
      expect(shape.right, `${w}px: the bar runs past the right edge`).toBeLessThanOrEqual(shape.vw)
      expect(shape.farthest, `${w}px: a control sits past the right edge`).toBeLessThanOrEqual(shape.vw)
      // Logo, three links and the pill from 768px; logo, search and menu buttons below.
      expect(shape.controls, `${w}px: the wrong controls are drawn`).toBe(w >= 768 ? 5 : 3)
      // One row: every control shares a centre line. A wrapped bar puts a second row 40px or more below.
      expect(shape.spread, `${w}px: the controls are not on one row`).toBeLessThan(2)
      // 24px above and below a 44px row, or a 56px band on a phone.
      expect(shape.barHeight,`${w}px: the bar's band`).toBe(w >= 768 ? 92 : 56)
    })
  }
})
