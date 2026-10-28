// /settings on a phone: a section is a history entry, focus follows the view,
// the back bar stays put, and a free account sees Upgrade to Pro first.
// (board card 2612b30345, page-level fixes)
//
// Held here:
//   · at 390, opening a section and pressing the browser's Back lands on the
//     section list, still on /settings; Forward opens the section again;
//   · the "All settings" bar from a section opened off the list is that same
//     step back (a pop, not a second push);
//   · a deep link (Plans -> Subscription) goes back to Plans, from the browser's
//     Back and from the bar's "All settings" followed by Back;
//   · /settings?verified=1 signed in still lands on Account in its section view;
//   · focus is on the section's heading after opening, and on the row that was
//     opened after coming back; the page keeps an h1 inside a section;
//   · at 390 the Pro block comes before Free, the toggle sits over its price and
//     Upgrade to Pro is inside the first screen; at 700 (nav is a list, tiers
//     still two columns) and at 1440 Free stays first, on the left;
//   · the "All settings" bar stays under the site header after a scroll.
//
// Positions are read from the layout, in document coordinates, with no
// screenshots: the contexts here are plain viewport ones.
//
// MUTATIONS (each turns the tests named red):
//   phoneView back to useState and pickSection not navigating -> "Back from a section ...", "Forward ...", "the All settings bar ...", "focus returns ..."
//   closeSection always replacing (never navigate(-1))        -> "the All settings bar from a section opened off the list is the browser's Back"
//   closeSection always navigate(-1)                          -> "a deep link: the bar leaves the section, and Back still goes to Plans"
//   `state: user ? { section: 'account' } ...` dropped         -> "a verified link lands on Account in its section view at 390"
//   the focus effect removed, or the h2 loses tabIndex={-1}    -> "opening a section moves focus to its heading"
//   `.stg-back + .stg-title` back to display: none             -> "inside a section the page still has its h1"
//   tiersStacked always false                                  -> "at 390 Pro comes first ..."
//   tiersStacked uses (max-width: 720px)                       -> "at 700 the tiers are still two columns, Free on the left"
//   tiersStacked always true                                   -> "at 700 ...", "at 1440 ..."
//   the `.stg[data-phone-view="section"] .stg-bar` rule removed -> "the All settings bar stays under the site header after a scroll"
import { test, expect } from './base.js'
import { go, restingScrollY, signIn, watch, wheelToRest } from './helpers.js'
import { withAvailability } from './price-payload.js'

const PRICES = withAvailability({ monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } })
const stubPrices = (page) => page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRICES) }))
const SETTINGS = /\/settings\/?$/

test.describe('settings on a phone: history and focus', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Back from a section lands on the section list, still on /settings, and Forward opens the section again', async ({ page }) => {
    watch(page, 'a person on a phone using the back gesture')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    const nav = page.locator('.settings-nav')
    await expect(nav).toBeVisible()

    await page.locator('#settab-language').click()
    await expect(page.locator('#set-language')).toBeVisible()
    await expect(nav).toBeHidden()

    await page.goBack()
    await expect(page).toHaveURL(SETTINGS)
    await expect(nav, 'Back did not return to the section list').toBeVisible()
    await expect(page.locator('.settings-content')).toBeHidden()

    await page.goForward()
    await expect(page.locator('#set-language'), 'Forward did not reopen the section').toBeVisible()
    await expect(nav).toBeHidden()
  })

  test('the All settings bar from a section opened off the list is the browser\'s Back', async ({ page }) => {
    watch(page, 'a person tapping All settings')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    const lengthBefore = await page.evaluate(() => history.length)

    await page.locator('#settab-privacy').click()
    await expect(page.locator('#set-privacy')).toBeVisible()
    expect(await page.evaluate(() => history.length), 'opening a section pushed no entry').toBe(lengthBefore + 1)

    await page.getByRole('button', { name: 'All settings' }).click()
    await expect(page.locator('.settings-nav')).toBeVisible()
    await expect(page).toHaveURL(SETTINGS)
    // A pop leaves the section ahead of us; a replace or a second push would not.
    await page.goForward()
    await expect(page.locator('#set-privacy'), 'the bar did not step back through history').toBeVisible()
  })

  test('opening a section moves focus to its heading, and coming back returns it to the opened row', async ({ page }) => {
    watch(page, 'a keyboard or screen-reader user on a phone-width window')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    await page.locator('#settab-language').click()
    await expect(page.locator('#set-language h2'), 'focus did not move to the section heading').toBeFocused()

    await page.goBack()
    await expect(page.locator('.settings-nav')).toBeVisible()
    await expect(page.locator('#settab-language'), 'focus did not return to the row that was opened').toBeFocused()

    // The same through the bar.
    await page.locator('#settab-data').click()
    await expect(page.locator('#set-data h2')).toBeFocused()
    await page.getByRole('button', { name: 'All settings' }).click()
    await expect(page.locator('#settab-data')).toBeFocused()
  })

  test('inside a section the page still has its h1', async ({ page }) => {
    watch(page, 'a screen-reader user on a phone')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.locator('#settab-accessibility').click()
    await expect(page.locator('#set-accessibility')).toBeVisible()
    // The title is not drawn beside the back control, but it is still there.
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 2, name: 'Accessibility' })).toBeVisible()
  })

  test('a deep link: the bar leaves the section, and Back still goes to Plans', async ({ page }) => {
    // The deep-linked section has no list entry behind it, so the bar replaces
    // its entry with the list. Back from the list then leaves for the page that
    // linked, rather than passing through the section a second time.
    watch(page, 'a Pro subscriber following View account details on a phone')
    await signIn(page, { plan: 'pro' })
    await stubPrices(page)
    await go(page, '/plans')
    await page.getByRole('link', { name: 'View account details' }).click()
    await expect(page).toHaveURL(SETTINGS)
    await expect(page.locator('#set-support'), 'the deep link did not open Subscription').toBeVisible()
    await expect(page.locator('.settings-nav')).toBeHidden()

    await page.getByRole('button', { name: 'All settings' }).click()
    await expect(page.locator('.settings-nav')).toBeVisible()
    await expect(page).toHaveURL(SETTINGS)

    await page.goBack()
    await expect(page, 'Back from the list did not go to Plans').toHaveURL(/\/plans\/?$/)
  })

  test('a deep link: the browser\'s Back goes straight to Plans', async ({ page }) => {
    watch(page, 'a Pro subscriber using the back gesture from a deep-linked section')
    await signIn(page, { plan: 'pro' })
    await stubPrices(page)
    await go(page, '/plans')
    await page.getByRole('link', { name: 'View account details' }).click()
    await expect(page.locator('#set-support')).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/plans\/?$/)
  })

  test('a verified link lands on Account in its section view at 390', async ({ page }) => {
    // The link's landing replaces the URL to drop ?verified=1. On a phone the
    // section is the history state, so that replace has to carry it.
    watch(page, 'a person who clicked the email link on their phone')
    await signIn(page, { plan: 'free', emailVerified: true })
    await go(page, '/settings?verified=1')
    await expect(page.locator('#set-account')).toBeVisible()
    await expect(page.locator('.settings-nav')).toBeHidden()
    await expect(page).toHaveURL(SETTINGS)
  })
})

test.describe('settings on a phone: the back bar', () => {
  test.use({ viewport: { width: 390, height: 520 } })

  test('the All settings bar stays under the site header after a scroll', async ({ page }) => {
    watch(page, 'a person scrolling a long section on a phone')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.locator('#settab-language').click()
    await expect(page.locator('#set-language')).toBeVisible()

    const scrolled = await wheelToRest(page, 320, 'the Language section')
    // POSITIVE CONTROL: the page moved, so a bar that stayed put was held there.
    expect(scrolled, 'the section did not scroll, so this proves nothing').toBeGreaterThan(100)

    const where = await page.evaluate(() => {
      const bar = document.querySelector('.stg-bar')
      return {
        position: getComputedStyle(bar).position,
        barTop: Math.round(bar.getBoundingClientRect().top),
        headerBottom: Math.round(document.querySelector('.pnav').getBoundingClientRect().bottom),
      }
    })
    expect(where.position).toBe('sticky')
    expect(where.barTop, 'the bar is not pinned under the header').toBe(where.headerBottom)
    await expect(page.getByRole('button', { name: 'All settings' })).toBeInViewport()
  })
})

test.describe('settings on a phone: Subscription order', () => {
  async function openSubscription(page, width, height) {
    await page.setViewportSize({ width, height })
    await stubPrices(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    if (width <= 720) await page.locator('#settab-support').click()
    else await page.getByRole('tab', { name: /Subscription/ }).click()
    await expect(page.locator('#set-support .sub-tier-pro')).toBeVisible()
    // A live price, so the button is the real link and not the disabled stand-in.
    await expect(page.locator('#set-support').getByRole('link', { name: 'Upgrade to Pro' })).toBeVisible()
    await restingScrollY(page, 'Subscription')
  }

  const boxes = (page) => page.evaluate(() => {
    const doc = (el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, right: r.right }
    }
    const q = (s) => document.querySelector(s)
    return {
      toggle: doc(q('#set-support .sub-billing-toggle')),
      pro: doc(q('#set-support .sub-tier-pro')),
      free: doc(q('#set-support .sub-tier-free')),
      amount: doc(q('#set-support .sub-tier-pro .sub-tier-amount')),
      cta: doc(q('#set-support .sub-tier-btn')),
      tabbarTop: q('.pnav-tabs') ? q('.pnav-tabs').getBoundingClientRect().top : null,
      proFirstInDom: !!(q('#set-support .sub-tier-pro').compareDocumentPosition(q('#set-support .sub-tier-free')) & Node.DOCUMENT_POSITION_FOLLOWING),
    }
  })

  test('at 390 Pro comes first, the toggle sits over its price, and Upgrade to Pro is on the first screen', async ({ page }) => {
    watch(page, 'a free account on a phone looking for the upgrade')
    await openSubscription(page, 390, 844)
    const b = await boxes(page)

    expect(b.proFirstInDom, 'Pro is not before Free in the page order').toBe(true)
    expect(b.toggle.bottom, 'the cadence toggle is not above the Pro block').toBeLessThanOrEqual(b.pro.top + 1)
    expect(b.free.top, 'Free is not below Pro').toBeGreaterThanOrEqual(b.pro.bottom - 1)
    // The toggle controls the price right under it, not one a screen away.
    expect(b.amount.top - b.toggle.bottom, 'the toggle is far from the price it changes').toBeLessThan(120)
    // Inside the first 844px, and above the tab bar that covers the foot of it.
    expect(b.cta.bottom, 'Upgrade to Pro is below the first screen').toBeLessThanOrEqual(844)
    expect(b.tabbarTop, 'POSITIVE CONTROL: the tab bar is on the page').not.toBeNull()
    expect(b.cta.bottom, 'Upgrade to Pro is under the tab bar').toBeLessThanOrEqual(b.tabbarTop)
    // The hairline between the two blocks moved with the order.
    const borders = await page.evaluate(() => ({
      pro: getComputedStyle(document.querySelector('.sub-tier-pro')).borderTopWidth,
      free: getComputedStyle(document.querySelector('.sub-tier-free')).borderTopWidth,
    }))
    expect(borders).toEqual({ pro: '0px', free: '1px' })
  })

  test('at 700 the tiers are still two columns, Free on the left', async ({ page }) => {
    // 641 to 720 is the phone list but not yet the stacked tiers.
    watch(page, 'a free account on a large phone or small tablet')
    await openSubscription(page, 700, 900)
    const b = await boxes(page)
    expect(b.proFirstInDom, 'Free should come first in the page order').toBe(false)
    expect(b.free.left, 'Free should be the left column').toBeLessThan(b.pro.left)
    expect(Math.abs(b.free.top - b.pro.top), 'the tiers should share a row').toBeLessThan(2)
  })

  test('at 1440 Free is first, on the left, as before', async ({ page }) => {
    watch(page, 'a free account on a desktop')
    await openSubscription(page, 1440, 900)
    const b = await boxes(page)
    expect(b.proFirstInDom, 'Free should come first in the page order').toBe(false)
    expect(b.free.left).toBeLessThan(b.pro.left)
    expect(Math.abs(b.free.top - b.pro.top)).toBeLessThan(2)
    // The toggle is above both, as it always was.
    expect(b.toggle.bottom).toBeLessThanOrEqual(Math.min(b.free.top, b.pro.top) + 1)
  })
})
