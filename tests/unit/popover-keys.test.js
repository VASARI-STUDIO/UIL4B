// Arrow/Home/End movement inside a popover panel.
//
// The account panel is a DISCLOSURE, not a `role="menu"` — that was a
// deliberate correction, because the panel holds a segmented theme control,
// links and a status line, and menu semantics promise a single-tab-stop widget
// it is not. What the disclosure still owed its keyboard users was MOVEMENT:
// reaching "Sign out" at the bottom of a signed-in panel meant tabbing through
// every control above it, and there was no way back to the top short of
// Shift+Tabbing out of the panel entirely (which closes it).
//
// popoverArrowTarget is the whole decision, pulled out of the DOM so it can be
// asserted without a browser. The rendered proof — that the keys actually move
// focus in the shipped nav — lives in
// tests/user-sim/28-account-menu-keyboard.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { popoverArrowTarget } from '../../src/hooks/usePopover.js'

const N = 5

test('Down steps forward and wraps at the end', () => {
  assert.equal(popoverArrowTarget('ArrowDown', 0, N), 1)
  assert.equal(popoverArrowTarget('ArrowDown', 3, N), 4)
  assert.equal(popoverArrowTarget('ArrowDown', 4, N), 0)
})

test('Up steps back and wraps at the start', () => {
  assert.equal(popoverArrowTarget('ArrowUp', 4, N), 3)
  assert.equal(popoverArrowTarget('ArrowUp', 1, N), 0)
  assert.equal(popoverArrowTarget('ArrowUp', 0, N), 4)
})

// usePopover focuses the panel itself when it holds no focusable control, and
// `indexOf` returns -1 for anything not in the list. From there the two arrows
// must enter at opposite ends rather than both landing on the first control.
test('from the panel itself, Down enters at the top and Up at the bottom', () => {
  assert.equal(popoverArrowTarget('ArrowDown', -1, N), 0)
  assert.equal(popoverArrowTarget('ArrowUp', -1, N), N - 1)
})

test('Home and End jump to the ends regardless of where focus is', () => {
  for (const i of [-1, 0, 2, N - 1]) {
    assert.equal(popoverArrowTarget('Home', i, N), 0)
    assert.equal(popoverArrowTarget('End', i, N), N - 1)
  }
})

// -1 means "not ours" — the handler must fall through so Tab keeps closing the
// popover, Escape keeps returning focus to the trigger, and typing still types.
test('every other key is left alone', () => {
  for (const key of ['Tab', 'Escape', 'Enter', ' ', 'a', 'ArrowLeft', 'ArrowRight', 'PageDown']) {
    assert.equal(popoverArrowTarget(key, 2, N), -1, key)
  }
})

// An empty panel is reachable: the signed-out popover renders its theme buttons
// from state, and a panel can be measured mid-transition with nothing visible.
// Returning 0 there would focus `undefined` and throw.
test('an empty panel claims no key', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
    assert.equal(popoverArrowTarget(key, -1, 0), -1, key)
  }
})
