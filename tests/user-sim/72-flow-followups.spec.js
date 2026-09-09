// THE FLOW AUDIT'S FOLLOW-UPS, 2026-09-10 — the eight defects #436 measured in
// files outside its lane, rendered again on main before anything was changed,
// then fixed and held here.
//
// ── WHAT WAS MEASURED ON MAIN, so each test has its number ──────────────────
//
//   1  Export on a phone. `.pnav-export` hidden at 390 and 768; the sheet's
//      27 controls held no Export. The style guide, the book and the
//      guidelines could not be reached below 769px at all.
//   2  Palette Builder menus at 390. elementFromPoint on the save menu's Save
//      button returned `.plb-col-tools`; on the colour-system menu's
//      "Analogous" it returned `.plb-adjust-fields`. Cause: `.plb` is
//      display:flex, and a FLEX ITEM with a z-index is a stacking context
//      even at position:static — the toolbar's z-index:30 boxed its menus and
//      the footer (30, later) painted over them; `.rail-overflow`'s mask
//      boxed the save menu a second time. Setting either z-index to auto in
//      the page changed the hit; nothing else did. At 1280 the save menu's
//      right edge was 1258 of 1280 — #434 had already clamped it.
//   3  doSave at the cap. `.toast.toast-success.show` reading "Free plan
//      saves up to 3 projects — go Pro for unlimited." for 1.8 seconds.
//   4  Toasts. Duplicate at the cap: `toast-error` shown for 1,862ms, zero
//      buttons, pointer-events:none.
//   5  /settings opened on "Subscription".
//   6  The gate's "Not now? Closing this changes nothing" line:
//      display:none at 390 on both the gate and the signup variant. The gate
//      ended at y=785 of 844; the signup dialog at 822 with "Already have an
//      account? Sign in" ending at 800.
//   7  /onboarding for an onboarded account: stayed at /onboarding, the
//      first-win screen rendered.
//   8  useModalDialog restored focus synchronously in its cleanup — the trace
//      #436 recorded (keydown@input → keypress@button → click) reaches any
//      opener that clicks on Enter, from any dialog the hook serves.
//   9  (found while rendering 4 at 390) a project card's Actions menu paints
//      under the next card: .card:hover lifts with a transform, a transform is
//      a stacking context, and the menu's z-index:130 was boxed inside it.
//      elementFromPoint on Duplicate returned the next card's .uh-card-art.
//
// ── MUTATION, at the call site, each seen red before it was trusted ─────────
//
//   M1  PillNav.jsx     sheet Export row onClick={openExport} → closeAll     1 red, 3 of 4
//   M2  global.css      the two :has() rules removed                         2 red, 2 of 3 (390 pairs)
//   M3  PaletteBuilder  setSaveError(err.message) → toast?.(err.message)     3 red, 2 of 3
//   M4  useToast.js     toastDuration(msg, kind) → 1800                      4 red, 3 of 4
//   M5  Settings.jsx    rememberedSection() || 'account' → 'support'         5 red, 2 of 3
//   M6  global.css      .ui-login-aside-foot display:block → none            6 red, 3 of 3
//   M7  Onboarding.jsx  settled !== '/onboarding' → false                    7 red, 2 of 2
//   M8  useModalDialog  requestAnimationFrame(fn) → fn() (synchronous)       8 red, 2 of 2; modal-contract.test.js red
//   M9  projects.css    .uh-card:has(.uh-menu){z-index:2} removed            4 red, 1 of 4 (the 390 case)
//
//   Each mutation rebuilt, run against this file, the file restored from git
//   and re-hashed (SHA-256) — nine restores, nine byte-exact.
//
// Everything numeric is imported from the config that enforces it; nothing
// here types a price, a cap or a route.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { COLOUR_SYSTEMS } from '../../src/config/colourSystems.js'
import { FIRST_WINS } from '../../src/utils/firstWin.js'
import { SIGNED_IN_HOME } from '../../src/utils/onboardingState.js'
import { TOAST_MIN_MS, TOAST_ERROR_MIN_MS } from '../../src/utils/toastDuration.js'

const CAP = FREE_SAVE_LIMITS.projects
const PHONE = [390, 844]
const DESK = [1280, 800]
const THEMES = ['light', 'dark']

/** A context at one width, in one theme, the way 39-accent-contrast sets it. */
async function open(browser, [w, h], theme = 'light') {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme })
  await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await context.newPage()
  return { context, page }
}

const focused = (page) => page.evaluate(() => {
  const el = document.activeElement
  return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}[${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || ''}]` : 'none'
})

/** The element the browser would hand a tap at this control's centre to, named
 *  by the nearest of the given ancestors — the audit's own measurement. */
const hitWithin = (loc, selector) => loc.evaluate((el, sel) => {
  const r = el.getBoundingClientRect()
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return { inside: !!top?.closest(sel), top: top ? `${top.tagName.toLowerCase()}.${String(top.className).split(' ')[0]}` : 'nothing' }
}, selector)

// ─────────────────────────────────────────────────────────────────────────────
// 2 — the Palette Builder's menus paint on top at 390
// ─────────────────────────────────────────────────────────────────────────────
test.describe('2 — the save menu and the colour-system menu take the tap at 390', () => {
  for (const theme of THEMES) {
    test(`390px ${theme}: Save is hittable, and a colour system can be picked over the adjust footer`, async ({ browser }) => {
      const { context, page } = await open(browser, PHONE, theme)
      watch(page, `a phone user saving and re-systemising a palette (${theme})`)
      await signIn(page, { plan: 'free', projects: CAP - 1 })
      await go(page, '/create/palette')

      await page.locator('button[aria-label="Save / export"]').click()
      const menu = page.locator('.plb-savemenu')
      await expect(menu).toBeVisible()
      const save = menu.getByRole('button', { name: 'Save', exact: true })
      await expect.poll(() => hitWithin(save, '.plb-savemenu').then((h) => h.inside),
        'a tap on Save must reach the save menu, not the swatch columns behind it').toBe(true)
      await page.keyboard.press('Escape')
      await expect(menu).toHaveCount(0)

      // The colour-system menu: a real click, no force — Playwright refuses a
      // click the footer would intercept, which is exactly how #436 found it.
      const trigger = page.locator('button.plb-harm')
      const current = (await trigger.textContent()) || ''
      const pick = COLOUR_SYSTEMS.find((s) => s.free && !current.includes(s.label))
      await trigger.click()
      const harm = page.locator('.plb-harmmenu')
      await expect(harm).toBeVisible()
      const row = harm.getByRole('menuitemradio', { name: new RegExp(`^${pick.label}`) })
      await expect.poll(() => hitWithin(row, '.plb-harmmenu').then((h) => h.inside),
        `a tap on "${pick.label}" must reach the menu, not the adjust footer`).toBe(true)
      await row.click({ timeout: 4000 })
      await expect(trigger).toContainText(pick.label)
      await context.close()
    })
  }

  test('1280px: the save menu stays inside the viewport (the #434 clamp, held)', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a desktop user opening Save / export')
    await signIn(page, { plan: 'free', projects: CAP - 1 })
    await go(page, '/create/palette')
    await page.locator('button[aria-label="Save / export"]').click()
    const menu = page.locator('.plb-savemenu')
    await expect(menu).toBeVisible()
    const box = await menu.boundingBox()
    expect(box.x + box.width, 'the menu must not run past the right edge').toBeLessThanOrEqual(DESK[0])
    expect(box.x).toBeGreaterThanOrEqual(0)
    const hit = await hitWithin(menu.getByRole('button', { name: 'Save', exact: true }), '.plb-savemenu')
    expect(hit.inside, `Save is covered by ${hit.top}`).toBe(true)
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 — the Palette Builder refuses the cap in place
// ─────────────────────────────────────────────────────────────────────────────
test.describe('3 — the palette save menu refuses the cap under the field, not in a green toast', () => {
  for (const size of [PHONE, DESK]) {
    test(`${size[0]}px: the ${CAP + 1}th save is refused in ProjectContext's words, with a way forward, and stays`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a free account at the cap saving a palette (${size[0]}px)`)
      const account = await signIn(page, { plan: 'free', projects: CAP })
      await go(page, '/create/palette')
      await page.locator('button[aria-label="Save / export"]').click()
      const menu = page.locator('.plb-savemenu')
      const field = menu.getByLabel('Project name')
      await field.fill('One Too Many')
      await page.keyboard.press('Enter')

      const refusal = page.getByTestId('palette-save-refusal')
      await expect(refusal).toBeVisible()
      await expect(refusal).toContainText(`Free plan saves up to ${CAP} projects`)
      await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
      // Not a success. The tick must not be drawn over a refusal.
      await expect(page.locator('.toast-success.show')).toHaveCount(0)
      await expect(menu, 'the menu stays open over its own refusal').toBeVisible()
      await expect(field).toHaveValue('One Too Many')
      // And it STAYS — the toast it replaced was gone in 1.8 seconds.
      await page.waitForTimeout(TOAST_MIN_MS + 700)
      await expect(refusal, 'the refusal must outlive a toast').toBeVisible()

      const stored = await page.evaluate(
        (email) => JSON.parse(localStorage.getItem('vs-projects') || '{}')[email]?.length ?? -1,
        account.email,
      )
      expect(stored, 'nothing may be written once the cap is reached').toBe(CAP)

      // Closing the menu clears it, so a stale refusal cannot greet the next attempt.
      await page.keyboard.press('Escape')
      await expect(menu).toHaveCount(0)
      await page.locator('button[aria-label="Save / export"]').click()
      await expect(page.getByTestId('palette-save-refusal')).toHaveCount(0)
      await context.close()
    })
  }

  test('one under the cap saves and says so — the control', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a free account with a slot to spare saving a palette')
    await signIn(page, { plan: 'free', projects: CAP - 1 })
    await go(page, '/create/palette')
    await page.locator('button[aria-label="Save / export"]').click()
    await page.locator('.plb-savemenu').getByLabel('Project name').fill('Room To Spare')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('palette-save-refusal')).toHaveCount(0)
    await expect(page.locator('.toast-success.show')).toContainText('Project saved')
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 — toasts: the clock follows the message, and an error can be sent away
// ─────────────────────────────────────────────────────────────────────────────
test.describe('4 — an error toast stays until it is read or dismissed; a success stays short', () => {
  const duplicateAtCap = async (page) => {
    await page.getByRole('button', { name: /^Actions for/ }).first().click()
    const dup = page.getByRole('button', { name: 'Duplicate' })
    // Rendering this at 390 found a ninth defect: the hovered card's lift is
    // a transform, so the menu was boxed inside the card and the next card's
    // art painted over Duplicate. Fixed in projects.css; held here.
    await expect.poll(() => hitWithin(dup, '.uh-menu').then((h) => h.inside),
      'a tap on Duplicate must reach the menu, not the card below it').toBe(true)
    await dup.click()
  }

  for (const size of [PHONE, DESK]) {
    test(`${size[0]}px: the refusal toast outlives the old clock, announces as an alert, and Dismiss works from the keyboard`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a free account at the cap duplicating a project (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: CAP })
      await go(page, '/projects')
      await duplicateAtCap(page)

      const toast = page.locator('.toast-error.show')
      await expect(toast).toBeVisible()
      await expect(toast).toContainText(`Free plan saves up to ${CAP} projects`)
      await expect(toast).toHaveAttribute('role', 'alert')
      // The old clock was 1.8s for everything. An error holds for at least six.
      await page.waitForTimeout(TOAST_MIN_MS + 700)
      await expect(toast, `the refusal vanished inside ${TOAST_MIN_MS + 700}ms — that is the old clock`).toBeVisible()

      // A keyboard user can send it away: a real button, reachable, that closes it.
      const dismiss = toast.getByRole('button', { name: 'Dismiss' })
      await expect(dismiss).toBeVisible()
      await dismiss.focus()
      expect(await focused(page)).toMatch(/Dismiss/)
      await page.keyboard.press('Enter')
      await expect(page.locator('.toast.show')).toHaveCount(0)
      // …and once hidden the ✕ is not a tab stop lurking inside an aria-hidden box.
      await expect(page.locator('.toast[inert]')).toHaveCount(1)
      await context.close()
    })
  }

  test('an error left alone stays at least six seconds — the floor is the contract', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a free account at the cap reading the refusal')
    await signIn(page, { plan: 'free', projects: CAP })
    await go(page, '/projects')
    await duplicateAtCap(page)
    const toast = page.locator('.toast-error.show')
    await expect(toast).toBeVisible()
    await page.waitForTimeout(TOAST_ERROR_MIN_MS - 600)
    await expect(toast).toBeVisible()
    await expect(page.locator('.toast.show')).toHaveCount(0, { timeout: 2500 })
    await context.close()
  })

  test('a success is still short — the control', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a free account with a slot to spare duplicating a project')
    await signIn(page, { plan: 'free', projects: CAP - 1 })
    await go(page, '/projects')
    await duplicateAtCap(page)
    const toast = page.locator('.toast-success.show')
    await expect(toast).toContainText('Duplicated')
    await expect(toast).toHaveAttribute('role', 'status')
    await expect(page.locator('.toast.show'), 'a short success must be gone within three seconds').toHaveCount(0, { timeout: 3200 })
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5 — /settings opens on Account
// ─────────────────────────────────────────────────────────────────────────────
test.describe('5 — settings opens on Account, and remembers the section you chose', () => {
  for (const size of [PHONE, DESK]) {
    test(`${size[0]}px: Account first; Subscription is remembered across a reload`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a free account opening its settings (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/settings')
      const selected = page.locator('.settings-nav [role="tab"][aria-selected="true"]')
      await expect(selected).toHaveText(/Account/)
      await expect(page.locator('#set-account')).toBeVisible()
      await expect(page.locator('#set-support')).toBeHidden()

      await page.getByRole('tab', { name: 'Subscription' }).click()
      await expect(page.locator('#set-support')).toBeVisible()
      await go(page, '/settings')
      await expect(selected, 'the section chosen last time is where the page opens').toHaveText(/Subscription/)
      await context.close()
    })
  }

  test('signed out there is no Account section, so the page still opens on one that exists', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a signed-out visitor at /settings')
    await go(page, '/settings')
    const selected = page.locator('.settings-nav [role="tab"][aria-selected="true"]')
    await expect(selected).toHaveCount(1)
    await expect(page.locator('.settings-section:not([hidden])')).toHaveCount(1)
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6 — the gate's way out is visible on a phone
// ─────────────────────────────────────────────────────────────────────────────
test.describe('6 — "Not now? Closing this changes nothing" is on screen at 390', () => {
  for (const theme of THEMES) {
    test(`390px ${theme}: the gate's way-out line is visible, inside the dialog, and above the fold`, async ({ browser }) => {
      const { context, page } = await open(browser, PHONE, theme)
      watch(page, `a stranger meeting the sign-in gate on a phone (${theme})`)
      await go(page, '/create/palette')
      await page.locator('button[aria-label="Save / export"]').click()
      const dialog = page.getByRole('dialog', { name: /Log in to continue/i })
      await expect(dialog).toBeVisible()
      const foot = dialog.locator('.ui-login-aside-foot')
      await expect(foot).toBeVisible()
      await expect(foot).toContainText(/Not now\? Closing this changes nothing/)
      const [footBox, dialogBox] = await Promise.all([foot.boundingBox(), dialog.boundingBox()])
      expect(footBox.y + footBox.height, 'the line must sit inside the dialog\'s visible box').toBeLessThanOrEqual(dialogBox.y + dialogBox.height + 1)
      expect(footBox.y + footBox.height, 'and above the bottom of the screen').toBeLessThanOrEqual(PHONE[1])
      await context.close()
    })
  }

  test('390px: on the signup variant "Already have an account? Sign in" is still on screen — the line paid for itself in spacing', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    watch(page, 'a first-time visitor creating an account on a phone')
    await go(page, '/create/palette')
    await page.locator('.pnav-mobile').click()
    await page.getByRole('button', { name: 'Start for Free' }).click()
    const dialog = page.locator('.ui-login')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.ui-login-aside-foot')).toBeVisible()
    const sw = dialog.getByRole('button', { name: /Already have an account/ })
    await expect(sw).toBeVisible()
    const [swBox, dialogBox] = await Promise.all([sw.boundingBox(), dialog.boundingBox()])
    expect(swBox.y + swBox.height, 'the switch control must not be pushed below the modal\'s visible box').toBeLessThanOrEqual(dialogBox.y + dialogBox.height + 1)
    expect(swBox.y + swBox.height).toBeLessThanOrEqual(PHONE[1])
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7 — /onboarding for an account that has finished
// ─────────────────────────────────────────────────────────────────────────────
test.describe('7 — an onboarded account typing /onboarding lands on its home', () => {
  for (const size of [PHONE, DESK]) {
    test(`${size[0]}px: redirected to ${SIGNED_IN_HOME}; a new account still gets the flow`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `an established account typing /onboarding (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: 1, onboarded: true })
      await go(page, '/onboarding')
      await expect(page).toHaveURL(new RegExp(`${SIGNED_IN_HOME}/?$`))
      await expect(page.getByTestId('onboarding-first-win')).toHaveCount(0)
      await context.close()

      const fresh = await open(browser, size)
      watch(fresh.page, `a brand-new account at /onboarding (${size[0]}px)`)
      await signIn(fresh.page, { plan: 'free', projects: 0, onboarded: false })
      await go(fresh.page, '/onboarding')
      await expect(fresh.page.getByTestId('onboarding-first-win')).toBeVisible()
      // Choosing a start still opens the tool, not the User Home: completion
      // is written to the profile in the same click, and that write must not
      // trip the redirect above.
      await fresh.page.locator(`[data-first-win="${FIRST_WINS[0].id}"]`).click()
      await expect(fresh.page).toHaveURL(new RegExp(`${FIRST_WINS[0].route}(\\?|$)`))
      await fresh.context.close()
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 8 — the shared dialog hook hands focus back a frame later
// ─────────────────────────────────────────────────────────────────────────────
test.describe('8 — the dialog hook hands focus back a frame after the close, not inside it', () => {
  for (const size of [PHONE, DESK]) {
    test(`${size[0]}px: when the project detail leaves the DOM focus is on nothing; a frame later it is on the card`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a keyboard user closing a project's detail (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/projects')
      const opener = page.locator('.uh-card-name').first()
      const name = (await opener.textContent())?.trim()
      await opener.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog', { name })
      await expect(dialog).toBeVisible()

      // #436's trace was keydown@input → keypress@button[opener] → click: the
      // leak needs the opener ALREADY focused when the closing key's next
      // event is dispatched, which a synchronous restore guarantees. Every
      // dialog in the app today either cancels that keydown (Projects, the
      // command palette) or closes from a button, which clicks on keypress and
      // leaves nothing of the stroke to leak — so the reopen itself cannot be
      // rendered here; the hook is what stops the next dialog from having it.
      // What CAN be rendered is where focus is at the instant the dialog
      // leaves the DOM. A MutationObserver runs as a microtask: after React's
      // commit — a discrete event flushes passive cleanups synchronously, so
      // the old restore has already run by then — and before any frame.
      await page.evaluate(() => {
        window.__focusAtClose = null
        const mo = new MutationObserver((muts) => {
          for (const m of muts) for (const n of m.removedNodes) {
            if (n.nodeType !== 1 || !(n.matches('[role="dialog"]') || n.querySelector('[role="dialog"]'))) continue
            const a = document.activeElement
            window.__focusAtClose = a === document.body ? 'body' : `${a.tagName.toLowerCase()}.${a.className}`
            mo.disconnect()
          }
        })
        mo.observe(document.body, { childList: true, subtree: true })
      })
      await dialog.locator('.fg-detail-close').focus()
      await page.keyboard.press('Enter')
      await expect(dialog).toHaveCount(0)
      const atClose = await page.evaluate(() => window.__focusAtClose)
      expect(atClose, 'the observer must have seen the dialog leave').not.toBeNull()
      expect(atClose, 'focus was already on the opener in the tick the dialog was removed — the tick in which the closing key\'s next event is still to be dispatched').not.toMatch(/uh-card-name/)

      await page.waitForTimeout(400)
      await expect(dialog).toHaveCount(0)
      expect(await focused(page), 'a frame later, focus is back on the card that opened it').toMatch(new RegExp(name.slice(0, 20)))
      await context.close()
    })
  }
})
