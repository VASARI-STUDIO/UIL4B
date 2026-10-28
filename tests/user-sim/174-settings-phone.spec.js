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
//   · the account menu's Manage plan from inside a section replaces that entry (no
//     third entry), the bar returns to the list, and Back leaves /settings;
//   · the verified-link toast's Sign in, tapped after leaving Settings, leaves the
//     URL where the person went;
//   · at 1440 the Reduced motion switch flips once on Space and once on Enter;
//   · focus is on the section's heading after opening, and on the row that was
//     opened after coming back; the page keeps an h1 inside a section;
//   · at 390 the Pro block comes before Free, the toggle sits over its price and
//     Upgrade to Pro is inside the first screen; at 700 (nav is a list, tiers
//     still two columns) and at 1440 Free stays first, on the left;
//   · the "All settings" bar stays under the site header after a scroll;
//   · Data: Export JSON, Clear data and the Confirm pair are one line each at 768
//     and 390, and the Clear data confirm takes focus (on Cancel) and gives it
//     back to the trigger;
//   · Accessibility on touch: Reduced motion is a switch (role, aria-checked), its
//     tap target is 44 high, its words flip it, the theme segments are 44 tall;
//   · Account on touch at 390: an open edit row has the field full width and Save /
//     Cancel sharing a line; the delete confirm's pair too; the avatar's camera cue
//     is drawn without a hover;
//   · Language at 390 is hairline rows in one card (no bordered tile) and "English (AU)"
//     is printed once; at 1440 the tiles and both lines are as they were;
//   · at 1440 with a mouse the switch, segments and camera cue are as they were.
//
// Positions are read from the layout, in document coordinates, with no
// screenshots: viewport contexts only. The touch cases use isMobile + hasTouch so
// `pointer: coarse` and `hover: none` are true; nothing here takes a full-page or
// element screenshot, which turns the touch media off in such a context.
//
// MUTATIONS (each turns the tests named red):
//   phoneView back to useState and pickSection not navigating -> "Back from a section ...", "Forward ...", "the All settings bar ...", "focus returns ..."
//   closeSection always replacing (never navigate(-1))        -> "the All settings bar from a section opened off the list is the browser's Back"
//   closeSection always navigate(-1)                          -> "a deep link: the bar leaves the section, and Back still goes to Plans"
//   `state: user ? { section: 'account' } ...` dropped         -> "a verified link lands on Account in its section view at 390"
//   PillNav's `replace={isPro && onSettings}` dropped          -> "the account menu from inside a section replaces the entry ..." (history grows by one; Back lands on the first section)
//   the `mountedRef.current && window.location.pathname === here.pathname` gate dropped from the toast's sign-in -> "the sign-in on the verified-link toast does nothing ..."
//   an onKeyDown toggling the Reduced motion switch beside its onClick, or the <button> made a <div role="switch"> -> "the Reduced motion switch flips once on Space and once on Enter"
//   the focus effect removed, or the h2 loses tabIndex={-1}    -> "opening a section moves focus to its heading"
//   `.stg-back + .stg-title` back to display: none             -> "inside a section the page still has its h1"
//   tiersStacked always false                                  -> "at 390 Pro comes first ..."
//   tiersStacked uses (max-width: 720px)                       -> "at 700 the tiers are still two columns, Free on the left"
//   tiersStacked always true                                   -> "at 700 ...", "at 1440 ..."
//   the `.stg[data-phone-view="section"] .stg-bar` rule removed -> "the All settings bar stays under the site header after a scroll"
//   `settings-row-main` back to a bare <div> on Export or Clear  -> "at 768 Export JSON, Clear data ..." (the text block takes the row and the button breaks)
//   `white-space: nowrap` / `flex: none` dropped from the `.settings-row > .btn` rule -> the same test, at 768
//   clearCancelRef.current?.focus() removed                    -> "the confirm opens on Cancel ..."
//   clearTriggerRef.current?.focus() removed                   -> "... and Cancel returns focus to Clear data"
//   `role="switch"` removed (back to aria-pressed)             -> "Reduced motion is a switch ..." and spec 41 "/settings offers the theme beside reduced motion"
//   the <label htmlFor="set-reduced-motion"> back to a <div>   -> "Reduced motion is a switch ..." (the tap on the words does not flip it)
//   `.stg .toggle-switch::before` (the 44px reach) removed     -> "Reduced motion is a switch ..." (target 24 high)
//   `.stg .toggle-row .theme-seg-btn { height: 44px }` removed -> "the theme segments are 44px tall on touch"
//   the 520 `.settings-edit-line > input { flex: 1 1 100% }` or `> .btn { flex: 1 1 0 }` removed -> "Account edit rows ..."
//   `.danger-confirm-actions { gap: 12px }` / its `> .btn` flex removed -> "the Delete account confirm keeps its two buttons ..."
//   the `@media (hover: none)` avatar rule removed             -> "the avatar shows it can be tapped ..."
//   the Language block in the 640 query removed                -> "at 390 the card holds hairline rows ..."
//   `.stg .lang-tile:hover, .stg .lang-tile.active { border-color }` restatement removed -> "at 390 the card holds hairline rows" (the chosen row's divider turns ink)
//   the `!tiersStacked ||` gate dropped from the code line      -> "at 1440 the tiles are unchanged ..."; `l.native !== l.label` dropped -> "at 390 the card holds hairline rows ..."
//   `.stg .settings-avatar-edit` touch band, or the 1440 opacity:0 base, changed -> "the switch has no extra reach ..."
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

  test('the account menu from inside a section replaces the entry: the bar returns to the list and Back leaves /settings', async ({ page }) => {
    // A push here stacks [list, secA, secB]; the bar then replaces secB with the
    // list and the browser's Back lands on secA, so Back loops through sections.
    watch(page, 'a Pro subscriber opening Manage plan from the avatar while in a section')
    await signIn(page, { plan: 'pro' })
    await stubPrices(page)
    await go(page, '/projects')
    await page.getByRole('button', { name: 'Account and settings' }).click()
    await page.locator('#pnav-account-pop').getByRole('link', { name: 'Account & settings' }).click()
    await expect(page).toHaveURL(SETTINGS)
    await expect(page.locator('.settings-nav')).toBeVisible()

    await page.locator('#settab-privacy').click()
    await expect(page.locator('#set-privacy')).toBeVisible()
    const lengthInSection = await page.evaluate(() => history.length)

    await page.getByRole('button', { name: 'Account and settings' }).click()
    await page.locator('#pnav-account-pop').getByRole('link', { name: 'Manage plan' }).click()
    await expect(page.locator('#set-support'), 'the menu link did not open Subscription').toBeVisible()
    expect(await page.evaluate(() => history.length), 'the deep link stacked another entry').toBe(lengthInSection)

    await page.getByRole('button', { name: 'All settings' }).click()
    await expect(page.locator('.settings-nav')).toBeVisible()
    await expect(page).toHaveURL(SETTINGS)

    await page.goBack()
    await expect(page, 'Back from the list did not leave Settings for the page before it').toHaveURL(/\/projects\/?$/)
    await expect(page.locator('#set-privacy')).toHaveCount(0)
  })

  test('the sign-in on the verified-link toast does nothing to a page the person has gone on to', async ({ page }) => {
    // The toast outlives Settings. Its Sign in action used to replace the current
    // history entry with /settings, whatever page that now was.
    watch(page, 'a person who left Settings, then tapped Sign in on its toast')
    await signIn(page, { plan: 'free', emailVerified: true, lateSignIn: true })
    await go(page, '/settings?verified=1')
    const toast = page.locator('.toast.show')
    await expect(toast).toContainText('Sign in to finish')

    await page.locator('.pnav-logo').first().click()
    await expect(page, 'the logo did not leave Settings').not.toHaveURL(SETTINGS)

    await toast.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await page.locator('#ui-login-email').fill('someone@uil4b.test')
    await page.locator('#ui-login-password').fill('a-long-password')
    await page.locator('form.auth-form button[type="submit"]').click()
    await expect(page.locator('#ui-login-title')).toBeHidden()
    // POSITIVE CONTROL: the sign-in did go through, so a URL that held was not a sign-in that failed.
    await expect(page.getByRole('button', { name: 'Account and settings' })).toBeVisible()
    // The action's own follow-up (two frames) has run by now.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))))
    await expect(page, 'the toast sign-in pulled the person back to /settings').not.toHaveURL(SETTINGS)
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

// ── Part B: Data, Accessibility, Account, Language ─────────────────────────────
// (board card 2612b30345, section-level fixes)

/** How many lines of text each button holds: the distinct tops of its text boxes. */
const textLines = (page, selector) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((btn) => {
  const range = document.createRange()
  range.selectNodeContents(btn)
  const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
  return { text: btn.textContent.trim(), lines: tops.size }
}), selector)

test.describe('settings: Data buttons stay on one line', () => {
  for (const width of [768, 390]) {
    test(`at ${width} Export JSON, Clear data, Full disclosure and the Confirm pair are one line each`, async ({ page }) => {
      watch(page, `a person on a ${width}px screen opening Your data`)
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await page.locator('#settab-data').click()
      await expect(page.locator('#set-data')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      const rest = await textLines(page, '#set-data .settings-row > .btn, #set-data .settings-card-h > .btn')
      // POSITIVE CONTROL: the three buttons were found, so "all one line" is not vacuous.
      expect(rest.map((b) => b.text).sort()).toEqual(['Clear data', 'Export JSON', 'Full disclosure'])
      for (const b of rest) expect(b.lines, `"${b.text}" broke onto ${b.lines} lines at ${width}`).toBe(1)

      await page.getByRole('button', { name: 'Clear data', exact: true }).click()
      const armed = await textLines(page, '#set-data .settings-edit-actions > .btn')
      expect(armed.map((b) => b.text)).toEqual(['Confirm clear', 'Cancel'])
      for (const b of armed) expect(b.lines, `"${b.text}" broke onto ${b.lines} lines at ${width}`).toBe(1)
    })
  }
})

test.describe('settings: Clear data hands focus to Cancel and takes it back', () => {
  for (const width of [390, 1440]) {
    test(`at ${width} the confirm opens on Cancel, and Cancel returns focus to Clear data`, async ({ page }) => {
      watch(page, `a keyboard user clearing local data at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await page.locator('#settab-data').click()
      await expect(page.locator('#set-data')).toBeVisible()

      const clear = page.getByRole('button', { name: 'Clear data', exact: true })
      const cancel = page.locator('#set-data').getByRole('button', { name: 'Cancel', exact: true })
      await expect(clear, 'opening the section must not put focus on the button').not.toBeFocused()

      await clear.click()
      await expect(cancel).toBeVisible()
      await expect(cancel, 'focus fell to the page when the confirm opened').toBeFocused()
      // Never the destructive one: Enter on it would wipe the browser's data.
      await expect(page.getByRole('button', { name: 'Confirm clear' })).not.toBeFocused()

      await page.keyboard.press('Enter')
      await expect(cancel).toHaveCount(0)
      await expect(clear, 'focus did not return to Clear data').toBeFocused()
    })
  }
})

test.describe('settings on a touch phone: Accessibility and Account', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })

  async function open(page, section) {
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.locator(`#settab-${section}`).tap()
    await expect(page.locator(`#set-${section}`)).toBeVisible()
    await restingScrollY(page, section)
  }

  /** How far a tap reaches around an element, found by hit-testing outwards from its middle. */
  const reach = (locator) => locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const hits = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && el.contains(hit) }
    const run = (dx, dy) => { let n = 0; while (n < 80 && hits(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n }
    return { drawnH: r.height, w: run(-1, 0) + run(1, 0) + 1, h: run(0, -1) + run(0, 1) + 1, cx, top: r.top }
  })

  test('Reduced motion is a switch with a 44px target, and its words flip it', async ({ page }) => {
    watch(page, 'a person turning on reduced motion with a thumb')
    await open(page, 'accessibility')
    const sw = page.getByRole('switch', { name: 'Reduced motion' })
    await expect(sw, 'no switch named Reduced motion').toBeVisible()
    await expect(sw).toBeInViewport()
    await expect(sw).toHaveAttribute('aria-checked', /^(true|false)$/)
    const start = await sw.getAttribute('aria-checked')
    const other = start === 'true' ? 'false' : 'true'

    const box = await reach(sw)
    expect(box.drawnH, 'the drawn track should keep its 24px').toBeLessThan(30)
    expect(box.h, `the target is ${box.h}px tall`).toBeGreaterThanOrEqual(44)
    expect(box.w, `the target is ${box.w}px wide`).toBeGreaterThanOrEqual(44)

    // The words are the label: tapping them flips the switch.
    await page.locator('#set-rm-label').tap()
    await expect(sw, 'a tap on the words did not flip it').toHaveAttribute('aria-checked', other)
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', other)

    // And a tap in the invisible margin above the track flips it back.
    await page.touchscreen.tap(box.cx, box.top - 8)
    await expect(sw, 'a tap just above the track missed it').toHaveAttribute('aria-checked', start)
  })

  test('the theme segments are 44px tall on touch', async ({ page }) => {
    watch(page, 'a person choosing a theme with a thumb')
    await open(page, 'accessibility')
    const heights = await page.locator('#set-accessibility .theme-seg-btn').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights.length, 'POSITIVE CONTROL: Light, Dark and System are there').toBe(3)
    for (const h of heights) expect(h, `a theme segment is ${h}px tall`).toBeGreaterThanOrEqual(44)
  })

  /** Where the buttons of one open edit row sit: grouped by line, with the field's width. */
  const editLine = (row) => row.locator('.settings-edit-line').evaluate((line) => {
    const box = line.getBoundingClientRect()
    const lines = new Map()
    const buttons = [...line.querySelectorAll(':scope > .btn')]
    for (const b of buttons) {
      const top = Math.round(b.getBoundingClientRect().top)
      lines.set(top, [...(lines.get(top) || []), b.textContent.trim()])
    }
    const field = line.querySelector(':scope > input, :scope > .settings-suggest-wrap')
    return {
      shared: [...lines.values()],
      fieldWidth: Math.round(field.getBoundingClientRect().width),
      lineWidth: Math.round(box.width),
      heights: buttons.map((b) => Math.round(b.getBoundingClientRect().height)),
      spill: buttons.some((b) => b.getBoundingClientRect().right > box.right + 1),
    }
  })

  test('Account edit rows: the field is full width and no button is alone on a line', async ({ page }) => {
    watch(page, 'a person editing their profile on a phone')
    await open(page, 'account')

    const cases = [
      { label: 'Display name', buttons: ['Save', 'Cancel'] },
      { label: 'Location', buttons: ['Save', 'Cancel'] },
      { label: 'Email address', buttons: ['Next', 'Cancel'] },
    ]
    for (const { label, buttons } of cases) {
      const row = page.locator('.settings-row', { hasText: label })
      await row.getByRole('button', { name: 'Edit' }).tap()
      await expect(row.locator('.settings-edit-line'), `${label}: the edit row did not open`).toBeVisible()
      const m = await editLine(row)
      expect(m.shared.flat(), `${label}: the buttons were not found`).toEqual(buttons)
      for (const line of m.shared) expect(line.length, `${label}: ${line.join('')} sits alone on a line`).toBeGreaterThanOrEqual(2)
      expect(m.shared.length, `${label}: the buttons are on ${m.shared.length} lines`).toBe(1)
      expect(m.fieldWidth, `${label}: the field is ${m.fieldWidth}px of ${m.lineWidth}`).toBeGreaterThanOrEqual(m.lineWidth - 1)
      expect(m.spill, `${label}: a button runs past the row`).toBe(false)
      for (const h of m.heights) expect(h, `${label}: a button is ${h}px tall`).toBeGreaterThanOrEqual(44)

      if (label === 'Email address') {
        // Step 2 of the email change: Save and Back.
        await row.locator('input').fill('new.person@uil4b.example')
        await row.getByRole('button', { name: 'Next' }).tap()
        // Step 2 relabels the row "Confirm password", so it is found as the open row.
        const open2 = page.locator('.settings-row--open')
        await expect(open2.getByRole('button', { name: 'Save' })).toBeVisible()
        const second = await editLine(open2)
        expect(second.shared.flat()).toEqual(['Save', 'Back'])
        expect(second.shared.length, 'Email step 2: Save and Back are not on one line').toBe(1)
        expect(second.fieldWidth).toBeGreaterThanOrEqual(second.lineWidth - 1)
        await open2.getByRole('button', { name: 'Back' }).tap()
      }
      await row.getByRole('button', { name: 'Cancel' }).tap()
      await expect(row.locator('.settings-edit-line')).toHaveCount(0)
    }
  })

  test('the Delete account confirm keeps its two buttons on one line, 12px apart', async ({ page }) => {
    watch(page, 'a person reading the delete confirmation on a phone')
    await open(page, 'account')
    await page.getByRole('button', { name: 'Delete account', exact: true }).tap()
    const actions = page.locator('.danger-confirm-actions')
    await expect(actions).toBeVisible()
    const m = await actions.evaluate((el) => {
      const boxes = [...el.querySelectorAll(':scope > .btn')].map((x) => x.getBoundingClientRect())
      const [a, b] = boxes
      return { n: boxes.length, sameLine: Math.abs(a.top - b.top) < 1, gap: Math.round(b.left - a.right), widthGap: Math.abs(a.width - b.width) }
    })
    expect(m.n).toBe(2)
    expect(m.sameLine, 'Permanently delete and Cancel are on different lines').toBe(true)
    expect(m.gap, 'the two buttons are too close').toBeGreaterThanOrEqual(12)
    expect(m.widthGap, 'the pair should be equal width').toBeLessThan(2)
    const clipped = await actions.evaluate((el) => [...el.querySelectorAll(':scope > .btn')].some((b) => b.scrollWidth > b.clientWidth + 1))
    expect(clipped, 'a button label is cut off').toBe(false)
  })

  test('the avatar shows it can be tapped: the camera band is drawn without a hover', async ({ page }) => {
    watch(page, 'a person who has never hovered a phone screen')
    await open(page, 'account')
    const edit = page.locator('.settings-avatar-edit')
    await expect.poll(() => edit.evaluate((el) => getComputedStyle(el).opacity), { message: 'the change-photo cue is hidden on touch' }).toBe('1')
    const m = await page.evaluate(() => {
      const avatar = document.querySelector('.settings-profile-avatar').getBoundingClientRect()
      const band = document.querySelector('.settings-avatar-edit').getBoundingClientRect()
      return { avatarH: avatar.height, bandH: band.height, bandBottom: band.bottom - avatar.bottom, bandTop: band.top - avatar.top }
    })
    expect(m.bandH, 'the cue should be a band, not the whole avatar').toBeLessThan(m.avatarH * 0.5)
    expect(m.bandH).toBeGreaterThan(12)
    expect(m.bandBottom).toBeLessThanOrEqual(1)
    expect(m.bandTop).toBeGreaterThan(m.avatarH * 0.5)
  })
})

test.describe('settings: Language is rows on a phone, tiles on a desktop', () => {
  const tiles = (page) => page.evaluate(() => [...document.querySelectorAll('#set-language .lang-tile')].map((t) => {
    const cs = getComputedStyle(t)
    const r = t.getBoundingClientRect()
    return {
      active: t.classList.contains('active'),
      sides: [cs.borderTopWidth, cs.borderRightWidth, cs.borderLeftWidth].map(parseFloat),
      foot: parseFloat(cs.borderBottomWidth),
      footColor: cs.borderBottomColor,
      radius: parseFloat(cs.borderTopLeftRadius),
      ring: cs.boxShadow,
      top: r.top, bottom: r.bottom, height: r.height,
      lines: [...t.querySelectorAll('.lang-tile-label, .lang-tile-code')].map((e) => e.textContent.trim()),
    }
  }))

  async function openLanguage(page, width) {
    await page.setViewportSize({ width, height: 900 })
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.locator('#settab-language').click()
    await expect(page.locator('#set-language .lang-tile').first()).toBeVisible()
    await restingScrollY(page, 'Language')
  }

  test('at 390 the card holds hairline rows: no bordered tile, no ring, no repeated line', async ({ page }) => {
    watch(page, 'a person choosing a language on a phone')
    await openLanguage(page, 390)
    const rows = await tiles(page)
    expect(rows.length, 'POSITIVE CONTROL: the language list is there').toBeGreaterThanOrEqual(8)
    rows.forEach((row, i) => {
      expect(row.sides, `row ${i} still has a bordered edge`).toEqual([0, 0, 0])
      expect(row.radius, `row ${i} still has rounded tile corners`).toBe(0)
      expect(row.ring, `row ${i} still has a ring`).toBe('none')
      expect(row.height, `row ${i} is under 52px`).toBeGreaterThanOrEqual(52)
      // A hairline between rows, none under the last.
      expect(row.foot, `row ${i} divider`).toBe(i === rows.length - 1 ? 0 : 1)
      // The chosen row's divider is the same hairline as the others, not ink.
      if (i < rows.length - 1) expect(row.footColor, `row ${i} divider is a different colour`).toBe(rows[rows.length - 2].footColor)
      if (i > 0) expect(Math.abs(row.top - rows[i - 1].bottom), `row ${i} has a gap above it`).toBeLessThan(1)
      expect(new Set(row.lines).size, `row ${i} prints a line twice: ${row.lines.join(' / ')}`).toBe(row.lines.length)
    })
    expect(rows.filter((r) => r.active).length).toBe(1)
    // The chosen row is marked by a tick, not by colour alone.
    await expect(page.locator('#set-language .lang-tile.active .lang-tile-check')).toHaveCount(1)
    const body = await page.locator('#set-language .settings-card-body--grid').evaluate((el) => getComputedStyle(el).padding)
    expect(body, 'the card still pads a panel inside itself').toBe('0px')
  })

  test('at 1440 the tiles are unchanged: bordered, rounded, with both lines', async ({ page }) => {
    watch(page, 'a person choosing a language on a desktop')
    await openLanguage(page, 1440)
    const grid = await tiles(page)
    expect(grid[0].sides, 'the 1440 tiles lost their border').toEqual([1, 1, 1])
    expect(grid[0].radius).toBeGreaterThan(0)
    expect(grid[0].lines, 'the English (AU) tile lost its second line at 1440').toEqual(['English (AU)', 'English (AU)'])
  })
})

test.describe('settings with a mouse at 1440: Accessibility and Account are as they were', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the switch has no extra reach, the segments are 34px, and the camera cue waits for hover', async ({ page }) => {
    watch(page, 'a person on a desktop')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.locator('#settab-accessibility').click()
    await expect(page.locator('#set-accessibility')).toBeVisible()
    await restingScrollY(page, 'Accessibility')

    const sw = page.getByRole('switch', { name: 'Reduced motion' })
    await expect(sw).toBeVisible()
    const box = await sw.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      let up = 0
      while (up < 40) { const hit = document.elementFromPoint(cx, cy - up - 1); if (!hit || !el.contains(hit)) break; up++ }
      return { w: Math.round(r.width), h: Math.round(r.height), up }
    })
    expect({ w: box.w, h: box.h }, 'the mouse switch changed size').toEqual({ w: 44, h: 24 })
    expect(box.up, 'the mouse switch grew a hidden margin').toBeLessThanOrEqual(13)

    const heights = await page.locator('#set-accessibility .theme-seg-btn').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights).toEqual([34, 34, 34])

    await page.locator('#settab-account').click()
    await expect(page.locator('#set-account')).toBeVisible()
    await expect.poll(() => page.locator('.settings-avatar-edit').evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
  })

  test('the Reduced motion switch flips once on Space and once on Enter', async ({ page }) => {
    watch(page, 'a keyboard user turning reduced motion on and off')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await page.locator('#settab-accessibility').click()
    await expect(page.locator('#set-accessibility')).toBeVisible()

    const sw = page.getByRole('switch', { name: 'Reduced motion' })
    await sw.focus()
    await expect(sw).toBeFocused()
    const start = await sw.getAttribute('aria-checked')
    const other = start === 'true' ? 'false' : 'true'
    // Count every write to aria-checked, so a second flip (a key handler beside
    // the button's own click) shows even when it lands back on the start value.
    await sw.evaluate((el) => {
      window.__flips = 0
      new MutationObserver((rows) => { window.__flips += rows.length }).observe(el, { attributes: true, attributeFilter: ['aria-checked'] })
    })
    const settle = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))

    await page.keyboard.press('Space')
    await expect(sw, 'Space did not flip the switch').toHaveAttribute('aria-checked', other)
    await settle()
    expect(await page.evaluate(() => window.__flips), 'Space flipped it more than once').toBe(1)

    await page.keyboard.press('Enter')
    await expect(sw, 'Enter did not flip the switch back').toHaveAttribute('aria-checked', start)
    await settle()
    expect(await page.evaluate(() => window.__flips), 'Enter flipped it more than once').toBe(2)
  })
})
