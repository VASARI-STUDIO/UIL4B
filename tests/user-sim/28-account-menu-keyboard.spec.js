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
import { keyToRest, restingScrollY, watch } from './helpers.js'

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
  // the handler is bound on the document in the CAPTURE phase, so a missing
  // containment guard hijacks every arrow key on the site for as long as any
  // popover is open.
  //
  // THIS TEST USED TO PRESS THE KEY WITH THE PANEL ALREADY CLOSED, which is the
  // one state in which the guard cannot matter: usePopover installs its
  // document listener only while the popover is open and removes it on close,
  // so after a close there is no handler left to hijack anything, guard or no
  // guard. That was not a theory — deleting the containment guard outright and
  // rebuilding left all six tests in this file GREEN. The press therefore
  // happens while the panel is open and focus has been moved out of it, which
  // is the state the paragraph above describes and the only one where the guard
  // does any work.
  //
  // Focus is moved programmatically on purpose. Every pointer route out of the
  // panel closes it — that is the disclosure contract, asserted above — so a
  // click cannot reach this state. `#main` is the skip-link target: the page's
  // own destination for "focus is on the document, not on a widget".
  test('the panel claims arrow keys only while focus is inside it', async ({ page }) => {
    await openPanel(page)
    // At rest, so the baseline is a position and not a frame of something else's
    // animation — a baseline caught mid-scroll would measure the arrow key
    // against the tail of THAT scroll rather than against a still page.
    const before = await restingScrollY(page, 'the home page before the arrow key')

    await page.evaluate(() => document.getElementById('main')?.focus())
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('main')
    await expect(page.locator(PANEL), 'the panel must still be open, or the handler is not installed').toBeVisible()
    expect((await focusPosition(page)).inPanel, 'focus never left the panel').toBe(false)

    // keyToRest, not a poll for "it has moved yet": a poll waits for the
    // movement to BEGIN and gives up on a deadline, so a keyboard scroll whose
    // take-up outlasts the deadline is recorded as no scroll at all. That is
    // what failed 2 of 4 CI runs here. See helpers.js.
    const openY = await keyToRest(page, 'ArrowDown', 'the home page after an arrow key aimed past the open panel')
    expect(openY, 'the open panel swallowed an arrow key that was not aimed at it').toBeGreaterThan(before)

    // …and it lets go completely once the panel closes, rather than leaking a
    // document listener that outlives the panel it belongs to.
    await page.locator('h1').first().click()          // focus leaves → panel closes
    await expect(page.locator(PANEL)).toHaveCount(0)
    const afterClose = await restingScrollY(page, 'the home page once the panel closed')
    const closedY = await keyToRest(page, 'ArrowDown', 'the home page after the panel closed')
    expect(closedY, 'a closed panel was still holding on to the arrow keys').toBeGreaterThan(afterClose)
  })
})
