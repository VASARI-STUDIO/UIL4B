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
