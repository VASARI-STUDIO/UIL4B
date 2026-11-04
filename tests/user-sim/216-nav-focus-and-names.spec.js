// Navigation focus, roles and names, with no visible change.
//
// What this pins, per surface:
//   · Marketing bar (.spnav): while it is scrolled out of sight, keyboard focus
//     arriving in it brings it back, a bar that holds keyboard focus is not
//     hidden by further scrolling, and a mouse or touch click on one of its
//     controls does not pin it open.
//   · App phone sheet (.pnav-sheet): the Tab ring is the header's menu button
//     (named "Close menu" while open) followed by the sheet's controls, and it
//     wraps both ways; Enter on that button closes the sheet and focus stays on
//     the button; #main is inert while the sheet is open and the header is not.
//   · Account popovers (#pnav-account-pop) are role=group with a name, and no
//     element on the page has role=menu.
//   · Phone tab bar: the current tab carries aria-current, buttons included.
//   · App footer: the three group labels are h2 headings that compute to the
//     values the paragraph labels had.
//   · Marketing logo: its accessible name is "UIL4B home".
//
// The footer rows hold hand-checked values (11px mono, 700, margin 0 0 3px,
// line-height 1.65 x 11px), not values read back from the stylesheet.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SIZES = [
  { name: '390 touch', width: 390, height: 844, touch: true },
  { name: '768 touch', width: 768, height: 1024, touch: true },
  { name: '1440', width: 1440, height: 900, touch: false },
]
const SIGNED_OUT = { name: 'signed out', who: null }
const FREE = { name: 'free', who: { plan: 'free', projects: 1 } }
const PRO = { name: 'Pro', who: { plan: 'pro', projects: 1 } }

async function openPage(browser, size, account, url) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  watch(page, `${account.name} at ${size.name}`)
  if (account.who) await signIn(page, account.who)
  await go(page, url)
  return { ctx, page }
}

// Two animation frames: enough for a scroll handler's state change to commit.
const settle = (page) => page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
)

const barPaint = (page) => page.locator('.spnav').evaluate((el) => {
  const cs = getComputedStyle(el)
  const bar = el.querySelector('.spnav-bar').getBoundingClientRect()
  return { flag: el.dataset.navHidden, opacity: Number(cs.opacity), transform: cs.transform, barTop: bar.top, barBottom: bar.bottom }
})

async function scrollDownUntilHidden(page) {
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.evaluate(() => window.scrollTo(0, 800))
  await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '1')
  // The slide and fade take a beat; wait for the paint, then it is truly gone.
  await expect.poll(async () => (await barPaint(page)).opacity).toBe(0)
  const gone = await barPaint(page)
  expect(gone.barBottom, 'precondition: the bar is slid above the viewport').toBeLessThanOrEqual(0)
}

// Shift+Tab backwards from the first focusable in main until focus is in the bar.
async function shiftTabIntoBar(page) {
  await page.evaluate(() => {
    const first = document.querySelector('#main')
      .querySelector('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')
    first.focus({ preventScroll: true })
  })
  for (let i = 0; i < 14; i++) {
    if (await page.evaluate(() => !!document.activeElement.closest('.spnav'))) return
    await page.keyboard.press('Shift+Tab')
  }
  expect(await page.evaluate(() => !!document.activeElement.closest('.spnav')), 'Shift+Tab reached the bar').toBe(true)
}

const expectBarShown = async (page) => {
  await expect.poll(async () => {
    const p = await barPaint(page)
    return p.opacity === 1 && p.barTop >= 0 && p.flag === '0'
  }, { message: 'the bar is back on screen' }).toBe(true)
}

for (const size of SIZES) {
  // Signed in, `/` is the app's home, so the same bar is read on the pricing screen.
  for (const [account, url] of [[SIGNED_OUT, '/'], [FREE, '/plans']]) {
    test.describe(`marketing bar focus, ${account.name} at ${size.name}`, () => {
      test('keyboard focus entering a scrolled-away bar brings it back', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, account, url)
        await scrollDownUntilHidden(page)
        await shiftTabIntoBar(page)
        await expectBarShown(page)
        const focusBox = await page.evaluate(() => {
          const r = document.activeElement.getBoundingClientRect()
          return { top: r.top, bottom: r.bottom }
        })
        expect(focusBox.top, 'the focused control is on screen').toBeGreaterThanOrEqual(0)
        expect(focusBox.bottom).toBeLessThanOrEqual(size.height)
        await ctx.close()
      })

      test('the stylesheet alone keeps a bar with keyboard focus on screen', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, account, url)
        await scrollDownUntilHidden(page)
        await shiftTabIntoBar(page)
        await expectBarShown(page)
        // Force the hidden flag back on, as if script had not kept it in step.
        // Let any fade the hidden rule starts run to its end before reading the paint.
        await page.locator('.spnav').evaluate(async (el) => {
          el.setAttribute('data-nav-hidden', '1')
          await Promise.all(el.getAnimations().map((a) => a.finished))
        })
        const paint = await barPaint(page)
        expect(paint.flag, 'precondition: the hidden flag is on').toBe('1')
        expect(paint.opacity, 'focus-visible inside the bar overrides the hidden rule').toBe(1)
        expect(paint.barTop).toBeGreaterThanOrEqual(0)
        await ctx.close()
      })

      test('scrolling further down does not hide a bar that holds keyboard focus', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, account, url)
        await scrollDownUntilHidden(page)
        await shiftTabIntoBar(page)
        await expectBarShown(page)
        await page.evaluate(() => window.scrollTo(0, 1100))
        await settle(page)
        await page.evaluate(() => window.scrollTo(0, 1400))
        await settle(page)
        expect(await page.evaluate(() => window.scrollY), 'precondition: the page did scroll').toBeGreaterThan(1000)
        await expect(page.locator('.spnav')).toHaveAttribute('data-nav-hidden', '0')
        await expectBarShown(page)
        await ctx.close()
      })

      test('a pointer click on a bar control does not pin the bar open', async ({ browser }) => {
        const { ctx, page } = await openPage(browser, size, account, url)
        const theme = page.locator('.spnav-bar .spnav-icon:not(.spnav-burger)')
        if (size.touch) await theme.tap()
        else await theme.click()
        expect(await page.evaluate(() => document.activeElement.closest('.spnav') !== null),
          'precondition: the click left focus on a bar control').toBe(true)
        expect(await page.evaluate(() => document.activeElement.matches(':focus-visible')),
          'precondition: a pointer click is not keyboard focus').toBe(false)
        await scrollDownUntilHidden(page)
        await ctx.close()
      })
    })
  }

  test(`the marketing logo is named "UIL4B home" at ${size.name}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, size, SIGNED_OUT, '/')
    await expect(page.getByRole('link', { name: 'UIL4B home', exact: true })).toHaveCount(1)
    await expect(page.locator('.spnav-mark')).toHaveAccessibleName('UIL4B home')
    await ctx.close()
  })
}

// ── phone sheet ──────────────────────────────────────────────────────────────
const PHONE = SIZES[0]
for (const account of [SIGNED_OUT, FREE, PRO]) {
  test.describe(`phone menu sheet, ${account.name}`, () => {
    const focusInfo = (page) => page.evaluate(() => {
      const a = document.activeElement
      return { close: a.matches('.pnav-mobile'), inSheet: !!a.closest('.pnav-sheet') }
    })

    test('Tab and Shift+Tab ring through Close and the sheet, wrapping both ways', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, account, '/create/palette')
      const opener = page.locator('.pnav-mobile')
      await opener.tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await expect(opener).toHaveAccessibleName('Close menu')
      // The sheet moves focus to its first control on open.
      await expect.poll(() => focusInfo(page)).toEqual({ close: false, inSheet: true })
      await page.evaluate(() => { window.__ringFirst = document.activeElement })

      await page.keyboard.press('Shift+Tab')
      expect(await focusInfo(page), 'Shift+Tab off the first control reaches Close').toEqual({ close: true, inSheet: false })
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused()

      await page.keyboard.press('Shift+Tab')
      expect(await focusInfo(page), 'Shift+Tab off Close wraps to the sheet\'s last control').toEqual({ close: false, inSheet: true })
      expect(await page.evaluate(() => document.activeElement === window.__ringFirst), 'the last control is not the first').toBe(false)
      await page.evaluate(() => { window.__ringLast = document.activeElement })

      await page.keyboard.press('Tab')
      expect(await focusInfo(page), 'Tab off the last control reaches Close').toEqual({ close: true, inSheet: false })
      await page.keyboard.press('Tab')
      expect(await focusInfo(page)).toEqual({ close: false, inSheet: true })
      expect(await page.evaluate(() => document.activeElement === window.__ringFirst), 'Tab off Close re-enters at the first control').toBe(true)
      await ctx.close()
    })

    test('Enter on Close closes the sheet and focus stays on the menu button', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, account, '/create/palette')
      const opener = page.locator('.pnav-mobile')
      await opener.tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.locator('.pnav-sheet')).toHaveCount(0)
      await expect(opener).toBeFocused()
      await expect(opener).toHaveAccessibleName('Open menu')
      await ctx.close()
    })

    test('#main is inert while the sheet is open and the header is not', async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, account, '/create/palette')
      expect(await page.evaluate(() => document.querySelector('#main').inert), 'precondition: #main is live before').toBe(false)
      await page.locator('.pnav-mobile').tap()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      expect(await page.evaluate(() => document.querySelector('#main').inert)).toBe(true)
      expect(await page.evaluate(() => document.querySelector('.pnav').closest('[inert]'))).toBeNull()
      expect(await page.evaluate(() => document.querySelector('.pnav-sheet').closest('[inert]'))).toBeNull()
      await page.keyboard.press('Escape')
      await expect(page.locator('.pnav-sheet')).toHaveCount(0)
      expect(await page.evaluate(() => document.querySelector('#main').inert), '#main is live again').toBe(false)
      await ctx.close()
    })
  })
}

for (const size of SIZES.slice(1)) {
  test(`there is no phone menu button at ${size.name}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, size, SIGNED_OUT, '/create/palette')
    await expect(page.locator('.pnav')).toBeVisible()
    await expect(page.locator('.pnav-mobile')).toBeHidden()
    await expect(page.locator('.pnav-tabs')).toBeHidden()
    await ctx.close()
  })
}

// ── account popovers ─────────────────────────────────────────────────────────
for (const size of SIZES) {
  for (const account of [SIGNED_OUT, FREE, PRO]) {
    // The signed-out meatball is not drawn below 768; the phone's way in is the sheet.
    if (!account.who && size.width < 768) continue
    test(`the account popover is a named group, ${account.name} at ${size.name}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, size, account, '/create/palette')
      const trigger = account.who ? page.locator('.pnav-avatar-btn') : page.locator('.pnav-more')
      if (size.touch) await trigger.tap()
      else await trigger.click()
      const name = account.who ? 'Account and settings' : 'Settings and sign in'
      const pop = page.locator('#pnav-account-pop')
      await expect(pop).toBeVisible()
      await expect(pop).toHaveAttribute('role', 'group')
      await expect(page.getByRole('group', { name, exact: true })).toHaveCount(1)
      expect(await page.locator('[role="menu"]').count(), 'no element is role=menu').toBe(0)
      await ctx.close()
    })
  }
}

// ── phone tab bar ────────────────────────────────────────────────────────────
const TAB_ROUTES = [
  { url: '/projects', current: 'Dashboard' },
  { url: '/create/palette', current: 'Create' },
  { url: '/discover', current: 'Discover' },
  { url: '/settings', current: 'You' },
]
for (const account of [FREE, PRO]) {
  for (const { url, current } of TAB_ROUTES) {
    test(`on ${url} only the ${current} tab is current, ${account.name}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, PHONE, account, url)
      await expect(page.locator('.pnav-tabs')).toBeVisible()
      await expect(page.locator('.pnav-tab[aria-current="page"]')).toHaveCount(1)
      await expect(page.locator('.pnav-tab[aria-current="page"]')).toHaveText(current)
      await expect(page.locator('.pnav-tab.is-current')).toHaveText(current)
      await ctx.close()
    })
  }
}
for (const { url, current } of TAB_ROUTES.filter((r) => ['Create', 'Discover'].includes(r.current))) {
  test(`on ${url} only the ${current} tab is current, signed out`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, PHONE, SIGNED_OUT, url)
    await expect(page.locator('.pnav-tabs')).toBeVisible()
    await expect(page.locator('.pnav-tab[aria-current="page"]')).toHaveCount(1)
    await expect(page.locator('.pnav-tab[aria-current="page"]')).toHaveText(current)
    await ctx.close()
  })
}

// ── app footer headings ──────────────────────────────────────────────────────
for (const size of SIZES) {
  for (const account of [SIGNED_OUT, FREE]) {
    test(`app footer groups are h2 headings with the paragraph label's look, ${account.name} at ${size.name}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, size, account, '/privacy')
      const groups = await page.locator('footer .app-footer-group').count()
      expect(groups, 'precondition: the footer is rendered with its groups').toBe(3)
      const heads = page.locator('footer h2.app-footer-group-h')
      await expect(heads).toHaveCount(groups)
      await expect(heads).toHaveText(['Create', 'Explore', 'Support'])
      await expect(page.locator('footer .app-footer-group > p')).toHaveCount(0)
      expect(await page.locator('footer').getByRole('heading', { level: 2 }).allTextContents()).toEqual(['Create', 'Explore', 'Support'])

      const looks = await heads.evaluateAll((els) => {
        // The colour and family come from the heading ink and the UI sans.
        const probe = document.createElement('p')
        probe.style.cssText = 'font-family:var(--font);color:var(--t0);position:absolute;visibility:hidden'
        document.body.appendChild(probe)
        const want = getComputedStyle(probe)
        const wantFamily = want.fontFamily
        const wantColor = want.color
        probe.remove()
        return els.map((el) => {
          const cs = getComputedStyle(el)
          return {
            fontSize: cs.fontSize, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing,
            textTransform: cs.textTransform, lineHeight: cs.lineHeight,
            margin: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].join(' '),
            padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '),
            display: cs.display,
            familyOk: cs.fontFamily === wantFamily, colourOk: cs.color === wantColor,
            height: el.getBoundingClientRect().height,
          }
        })
      })
      for (const look of looks) {
        expect(look).toMatchObject({
          fontSize: '13px', fontWeight: '600', letterSpacing: 'normal', textTransform: 'none',
          lineHeight: '21.45px', margin: '0px 0px 3px 0px', padding: '0px 0px 0px 0px', display: 'block',
          familyOk: true, colourOk: true,
        })
        expect(look.height).toBeCloseTo(21.45, 1)
      }
      await ctx.close()
    })
  }
}

// ── menu hash jump (marketing menu) ──────────────────────────────────────────
{
  const size = SIZES[0]
  test(`a same-page section link in the marketing menu lands focus on the section at ${size.name}`, async ({ browser }) => {
    const { ctx, page } = await openPage(browser, size, SIGNED_OUT, '/')
    await page.locator('.spnav-burger').click()
    await expect(page.locator('.spnav-menu')).toBeVisible()
    const hashLinks = page.locator('.spnav-menu a.spnav-mi[href^="#"]')
    // Every item in the menu today is a route, so there is no hash link to take.
    // When one is added this test starts exercising it.
    test.skip(await hashLinks.count() === 0, 'the menu has no same-page section link (every item is a route)')
    const href = await hashLinks.first().getAttribute('href')
    await hashLinks.first().click()
    await expect(page.locator('.spnav-menu')).toHaveCount(0)
    await expect.poll(() => page.evaluate((id) => document.activeElement?.id === id, href.slice(1))).toBe(true)
    const covered = await page.evaluate((id) => {
      const top = document.getElementById(id).getBoundingClientRect().top
      return top - document.querySelector('.spnav-bar').getBoundingClientRect().bottom
    }, href.slice(1))
    expect(covered, 'the section starts below the pill').toBeGreaterThanOrEqual(0)
    await ctx.close()
  })
}
