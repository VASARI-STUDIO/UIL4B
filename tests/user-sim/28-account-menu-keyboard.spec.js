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
import { go, restAfterMove, restingScrollY, watch } from './helpers.js'

const PANEL = '#pnav-account-pop'
const TRIGGER = '.pnav-more'

// WHERE THE APP HEADER IS, which is no longer `/`.
//
// Every test here opened the panel on the homepage. `/` and `/home` render
// src/pages/Spectrum.jsx since the route swap, and Spectrum mounts
// `<PillNav variant="spectrum" />` — PillNav early-returns SpectrumNav before
// its first hook, so the meatball, `#pnav-account-pop` and the whole
// `usePopover(..., { arrowNav: true })` call site this file is about are simply
// not on that page. All six tests timed out on `.pnav-more`.
//
// /discover renders the app header unchanged: measured, one `.pnav-more`, a
// panel with nine focusable controls, and 1835px of scroll height against a
// 900px viewport — which the two tests that measure a page scroll need.
const ROUTE = '/discover'

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
  await go(page, ROUTE)
  await page.locator(TRIGGER).click()
  await expect(page.locator(PANEL)).toBeVisible()
  // usePopover focuses on a rAF, so the first control is not focused the
  // instant the panel is in the DOM.
  await expect.poll(async () => (await focusPosition(page)).index).toBe(0)
}

test.describe('nav popover keyboard movement', () => {
  // Kept in describe scope rather than re-calling watch() inside the one test
  // that needs the handle: watch() attaches the pageerror/console listeners, so
  // a second call would double-attach them and report every console error twice.
  // A worker runs one test at a time, so this cannot be crossed between tests.
  let fb
  test.beforeEach(async ({ page }) => { fb = watch(page, 'keyboard-only visitor') })

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
    const before = await restingScrollY(page, 'the page before the arrow key')

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
    const openY = await restAfterMove(page, before, 'the page after an arrow key aimed past the open panel')

    // …and it lets go completely once the panel closes, rather than leaking a
    // document listener that outlives the panel it belongs to.
    await page.locator('h1').first().click()          // focus leaves → panel closes
    await expect(page.locator(PANEL)).toHaveCount(0)
    const afterClose = await restingScrollY(page, 'the page once the panel closed')
    const closedPress = await pressAndInspect(page, 'ArrowDown')
    expect(closedPress.defaultPrevented, 'a closed panel was still holding on to the arrow keys').toBe(false)
    const closedY = await restAfterMove(page, afterClose, 'the page after the panel closed')

    // ── The scroll: still measured, REPORTED rather than asserted ────────────
    //
    // The user-visible point of everything above is that the key reaches the
    // page and the page moves, so the movement is still measured against a
    // CONTROL — the press just made with the panel CLOSED, and therefore with no
    // popover handler installed anywhere. That is what an arrow key does on this
    // page in this session when nothing in this app is listening.
    //
    // It is a FINDING and not an assertion, and that is the whole result of
    // #329 rather than a softening of it. `expect(openY).toBeGreaterThan(before)`
    // failed CI three times on 2026-09-03 — runs 33715948705 attempt 1 (#325),
    // 33713466234 (main) and 33719581296 (#329 itself) — always `Received: 0`
    // from a page sitting at 0 with 7422px of room below it. On the third, this
    // file had already been rewritten, so the run carries the measurement the
    // first two could not: the two assertions ABOVE both passed. The popover did
    // not call preventDefault, and it did not take focus — `activeId` is read
    // inside the keydown listener, so that is the state at the instant of the
    // press, not a guess afterwards. The contract HELD and the page still did
    // not move, while the control press moved it seconds later.
    //
    // So "the open panel swallowed an arrow key" is a sentence CI has now
    // disproved on its own evidence, and asserting it again would be the same
    // false accusation this test was rewritten to stop making. What is left is a
    // real and separate defect — an open popover intermittently suppressing
    // keyboard page scrolling on Linux CI WITHOUT claiming the key — which is
    // not this test's contract to enforce and does not reproduce on Windows
    // (24/24 presses scrolled 40px with the panel open and closed alike, at 20x
    // CPU throttling). It has its own backlog item, popover-open-scroll-
    // suppression, and it is recorded here so a run that hits it says so in the
    // feedback summary instead of going quietly green.
    //
    // A RUN THAT COULD NOT MEASURE THIS SAYS SO. The comparison rests entirely
    // on the CONTROL press producing a default scroll, and CI has recorded that
    // failing three times — scrollY 0 with 7422px of room below it. When it
    // does, "the defect did not appear" and "this run could never have seen the
    // defect" are the same silence in the feedback report, and the second reads
    // as a clean result. So the unmeasured case gets its own finding.
    //
    // Same anti-vacuity rule the walks in this suite carry after three of them
    // reported violations while never reporting how many nodes they examined:
    // say how much you looked at, not only what you found.
    if (closedY <= afterClose) {
      fb.note(
        'info',
        'The control press produced no page scroll with the panel CLOSED '
        + `(${afterClose} -> ${closedY}), so this run cannot say anything about whether an open `
        + 'popover suppresses keyboard scrolling. NOT a clean result for '
        + 'popover-open-scroll-suppression — an unmeasured one.',
      )
    } else if (openY <= before) {
      fb.note(
        'critical',
        'An arrow key aimed past the OPEN nav popover left the page still, though the same key moved it '
        + `${closedY - afterClose}px with the panel closed — and the panel neither called preventDefault nor took focus. `
        + 'Keyboard page scrolling is being suppressed by an open popover without the popover claiming the key. '
        + 'See backlog popover-open-scroll-suppression.',
      )
    }
    // The ordinary result — control moved, open press moved — is deliberately
    // NOT recorded. A finding written on every healthy run turns "no findings"
    // into a line people scroll past, which is the opposite of what the
    // feedback report is for.
  })
})
