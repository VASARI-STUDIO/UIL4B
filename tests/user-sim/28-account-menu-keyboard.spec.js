// The nav popover's keyboard contract, measured in a browser.
//
// The panel behind the nav's meatball (signed out) and avatar (signed in) is a
// DISCLOSURE, not a `role="menu"` — a deliberate correction, because it holds a
// segmented theme control, links and a status line, and menu semantics promise
// assistive technology a single-tab-stop widget it is not.
//
// What the disclosure still owed a keyboard user was MOVEMENT. Escape-to-
// trigger, outside-press dismissal and focus-on-open were already in
// usePopover; Up/Down/Home/End were not, so reaching the last control of a
// fourteen-control signed-in panel meant thirteen tabs, and there was no way
// back to the top that did not tab out of the panel (which closes it).
//
// This file measures the SIGNED-OUT panel, because that is the one this suite
// can reach — the signed-in avatar needs an account the acceptance suite has no
// way to create. Both panels are the same `usePopover(..., { arrowNav: true })`
// call site in PillNav.jsx, so what holds here holds there.
//
// The pure key→index decision is asserted separately, without a DOM, in
// tests/unit/popover-keys.test.js.
import { test, expect } from './base.js'
import { restingScrollY, watch } from './helpers.js'

const PANEL = '#pnav-account-pop'
const TRIGGER = '.pnav-more'

/**
 * Which of the panel's own focusable controls currently has focus.
 *
 * Deliberately an INDEX into the live list rather than a selector match: the
 * point of the feature is relative movement, and asserting "focus is on the
 * Help centre link" would go green if the panel's contents were reordered
 * underneath it while the arrows had stopped working.
 *
 * Returns { index, total, label }; index is -1 when focus is on the panel
 * itself or has left it entirely.
 */
async function focusPosition(page) {
  return page.evaluate((panelSel) => {
    const panel = document.querySelector(panelSel)
    if (!panel) return { index: -1, total: 0, label: null, inPanel: false }
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    const controls = Array.from(panel.querySelectorAll(sel)).filter(el => el.offsetParent !== null || el === document.activeElement)
    const active = document.activeElement
    return {
      index: controls.indexOf(active),
      total: controls.length,
      label: (active?.getAttribute('aria-label') || active?.textContent || '').trim().slice(0, 40),
      inPanel: panel === active || panel.contains(active),
    }
  }, PANEL)
}

async function openPanel(page) {
  await page.goto('/')
  await page.locator(TRIGGER).click()
  await expect(page.locator(PANEL)).toBeVisible()
  // usePopover focuses on a rAF, so the first control is not focused the
  // instant the panel is in the DOM.
  await expect.poll(async () => (await focusPosition(page)).index).toBe(0)
}

test.describe('nav popover keyboard movement', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'keyboard-only visitor') })

  test('opening the panel puts focus on its first control', async ({ page }) => {
    await openPanel(page)
    const at = await focusPosition(page)
    // A panel worth arrowing through. If this ever collapses to one or two the
    // assertions below stop distinguishing anything.
    expect(at.total).toBeGreaterThan(4)
  })

  test('Down and Up step through the controls and wrap at both ends', async ({ page }) => {
    await openPanel(page)
    const { total } = await focusPosition(page)

    await page.keyboard.press('ArrowDown')
    expect((await focusPosition(page)).index).toBe(1)

    await page.keyboard.press('ArrowUp')
    expect((await focusPosition(page)).index).toBe(0)

    // Up from the top wraps to the bottom rather than escaping the panel.
    await page.keyboard.press('ArrowUp')
    expect((await focusPosition(page)).index).toBe(total - 1)

    // …and Down from the bottom comes back round to the top.
    await page.keyboard.press('ArrowDown')
    expect((await focusPosition(page)).index).toBe(0)
  })

  test('Home and End reach either end in one press', async ({ page }) => {
    await openPanel(page)
    const { total } = await focusPosition(page)

    await page.keyboard.press('End')
    expect((await focusPosition(page)).index).toBe(total - 1)

    await page.keyboard.press('Home')
    expect((await focusPosition(page)).index).toBe(0)
  })

  // The movement is layered on a disclosure, so the disclosure's own contract
  // has to survive it — arrow handling that swallowed Escape or Tab would have
  // traded one barrier for two.
  test('Escape still closes the panel and returns focus to the trigger', async ({ page }) => {
    await openPanel(page)
    await page.keyboard.press('End')
    await page.keyboard.press('Escape')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator(TRIGGER)).toBeFocused()
    await expect(page.locator(TRIGGER)).toHaveAttribute('aria-expanded', 'false')
  })

  test('Tab past the last control still closes the panel and moves on', async ({ page }) => {
    await openPanel(page)
    await page.keyboard.press('End')
    await page.keyboard.press('Tab')
    await expect(page.locator(PANEL)).toHaveCount(0)
    // Not a trap: focus left the panel rather than being pulled back into it.
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('pnav-account-pop')
  })

  // Arrow keys pressed with focus OUTSIDE the panel must be left to the page —
  // the handler is bound on the document in the capture phase, so a missing
  // containment guard would have hijacked every arrow key on the site for as
  // long as any popover was open.
  test('the panel claims arrow keys only while focus is inside it', async ({ page }) => {
    await openPanel(page)
    // At rest, so the baseline is a position and not a frame of something else's
    // animation — a baseline caught mid-scroll would let the "it moved" poll
    // below pass on the tail of THAT scroll rather than on the arrow key.
    const before = await restingScrollY(page, 'the home page before the arrow key')
    await page.locator('h1').first().click()          // focus leaves → panel closes
    await expect(page.locator(PANEL)).toHaveCount(0)
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
  })
})
