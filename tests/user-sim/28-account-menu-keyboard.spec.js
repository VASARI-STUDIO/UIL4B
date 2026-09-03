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
import { restAfterMove, restingScrollY, watch } from './helpers.js'

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

/**
 * Press a key, and report the verdict the PAGE reached on it: whether anything
 * called preventDefault, and where focus stood once every handler had run.
 *
 * The listener goes on `window` in the BUBBLE phase deliberately. usePopover
 * binds its handler on `document` in the CAPTURE phase — window-bubble is the
 * last position in the propagation path, and therefore the only one that can
 * see what every earlier handler already decided. A capture listener, or one on
 * `document`, would read the event before usePopover had touched it and report
 * `defaultPrevented: false` for a build that hijacks the key a moment later.
 *
 * `activeId` is read inside the listener rather than afterwards for the same
 * reason: usePopover moves focus SYNCHRONOUSLY during its capture handler, so
 * by the time this runs the theft (if any) has already happened, and reading it
 * here cannot be raced by anything the test does next.
 */
async function pressAndInspect(page, key) {
  await page.evaluate(() => {
    window.__keyVerdict = null
    window.__keyProbe = (event) => {
      window.__keyVerdict = {
        key: event.key,
        defaultPrevented: event.defaultPrevented,
        activeId: document.activeElement?.id || null,
        activeTag: document.activeElement?.tagName || null,
      }
    }
    window.addEventListener('keydown', window.__keyProbe)
  })
  await page.keyboard.press(key)
  const verdict = await page.evaluate(() => {
    window.removeEventListener('keydown', window.__keyProbe)
    const seen = window.__keyVerdict
    delete window.__keyVerdict
    delete window.__keyProbe
    return seen
  })
  // A null verdict means the key never reached the page at all, which is a
  // finding rather than a pass — say so here instead of letting the assertions
  // below read properties off nothing.
  expect(verdict, `the ${key} press never reached the page`).not.toBeNull()
  return verdict
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

    // THE CONTRACT, ASSERTED DIRECTLY. What "the panel does not claim this key"
    // MEANS is that the panel's handler left the key alone: it did not
    // preventDefault it and it did not pull focus. Both are facts about the
    // event, readable from the page, and neither depends on anything outside
    // this app deciding to act on the key afterwards.
    const openPress = await pressAndInspect(page, 'ArrowDown')
    expect(openPress.defaultPrevented, 'the open panel called preventDefault on an arrow key aimed past it').toBe(false)
    expect(openPress.activeId, 'the open panel dragged focus back into itself from an arrow key aimed past it').toBe('main')
    const openY = await restAfterMove(page, before, 'the home page after an arrow key aimed past the open panel')

    // …and it lets go completely once the panel closes, rather than leaking a
    // document listener that outlives the panel it belongs to.
    await page.locator('h1').first().click()          // focus leaves → panel closes
    await expect(page.locator(PANEL)).toHaveCount(0)
    const afterClose = await restingScrollY(page, 'the home page once the panel closed')
    const closedPress = await pressAndInspect(page, 'ArrowDown')
    expect(closedPress.defaultPrevented, 'a closed panel was still holding on to the arrow keys').toBe(false)
    const closedY = await restAfterMove(page, afterClose, 'the home page after the panel closed')

    // ── The scroll, kept as CORROBORATION rather than as the assertion ───────
    //
    // The user-visible point of all of the above is that the key reaches the
    // page and the page moves, so the movement is still measured and still
    // asserted — but only against a CONTROL that proves this browser produced a
    // default arrow-key scroll at all in this session. The control is the press
    // above with the panel CLOSED and therefore with no popover handler
    // installed anywhere: whatever it does is what an arrow key does here when
    // nothing in this app is listening.
    //
    // That control is not decoration. `expect(openY).toBeGreaterThan(before)`
    // failed CI twice on 2026-09-03 — run 33715948705 attempt 1 (PR #325) and
    // run 33713466234 (main) — both reporting `Expected: > 0, Received: 0` from
    // a page sitting at scrollY 0 with 7422px of room below it, focus correctly
    // on <main> and the panel correctly open. The arrow key produced NO default
    // scroll. #301 had already taken the clock out of the measurement, so this
    // was not a reading taken too early: `keyToRest` waits for take-up and then
    // for rest and honestly reported zero movement. Nothing was left for the
    // test to wait for, because there was nothing to wait for.
    //
    // A press the popover has demonstrably not touched cannot be evidence about
    // the popover. So when the control moves the page, the open-panel press must
    // have moved it too — a real regression still shows up here as a page that
    // sat still while an untouched press moved. When the control does NOT move
    // the page, this environment did not give us a default scroll to measure,
    // which is a fact about the runner and not about the disclosure, and the
    // assertions above have already carried the contract.
    if (closedY > afterClose) {
      expect(openY, 'an arrow key aimed past the open panel left the page still, though the same key moved it with the panel closed').toBeGreaterThan(before)
    }
  })
})
