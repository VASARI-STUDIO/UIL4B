// The shared menu's pure rules (src/components/menu/menuModel.js): which rows take
// focus, where each key sends it, what a typed letter selects, and where the
// panel sits. Every expected number below is worked out by hand from the
// placement rules (8px gap under the trigger, 16px from the viewport's sides,
// flip above when there is not room below), not by calling the code's own
// formulas, so a wrong rule cannot agree with itself.
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { test } from 'node:test'

// menuModel.js imports ../../utils/listboxKeys without an extension (Vite resolves
// it; Node does not), so the repo's loader hook supplies the .js.
register('./helpers/stub-loader.mjs', import.meta.url, { data: {} })
const {
  LONG_PRESS_MS, MENU_EDGE, MENU_GAP, keyboardPoint, menuKeyTarget, menuOpenKey, menuTypeahead, placeMenu, reachableRows,
} = await import('../../src/components/menu/menuModel.js')

// A 1440x900 viewport with a 80px fixed header on top and nothing at the bottom.
const band = { vw: 1440, minTop: 80, maxBottom: 900 }
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })

test('the spacing constants are the spec values', () => {
  assert.equal(MENU_GAP, 8)
  assert.equal(MENU_EDGE, 16)
  assert.equal(LONG_PRESS_MS, 450)
})

// ── placement from a trigger ─────────────────────────────────────────────────

test('a menu opens below its trigger with an 8px gap and the left edges together', () => {
  const out = placeMenu({ anchor: box(100, 100, 100, 40), width: 300, height: 200, band })
  assert.equal(out.side, 'bottom')
  assert.equal(out.top, 148) // trigger bottom 140 + 8
  assert.equal(out.left, 100)
})

test('a trigger in the right half lines the right edges up instead', () => {
  const out = placeMenu({ anchor: box(1200, 100, 100, 40), width: 300, height: 200, band })
  assert.equal(out.left, 1000) // trigger right 1300 - width 300
})

test('a trigger exactly at the centre line counts as the left half', () => {
  // centre of 620..820 is 720, which is vw / 2, not past it
  const out = placeMenu({ anchor: box(620, 100, 200, 40), width: 300, height: 200, band })
  assert.equal(out.left, 620)
})

test('the menu flips above when the room below is short and there is more room above', () => {
  // vh 800. Below: 800 - 740 - 8 = 52. Above: 700 - 8 - 80 = 612. The menu needs 200 + 16.
  const out = placeMenu({ anchor: box(100, 700, 100, 40), width: 300, height: 200, band: { vw: 1440, minTop: 80, maxBottom: 800 } })
  assert.equal(out.side, 'top')
  assert.equal(out.top, 492) // trigger top 700 - 8 - menu height 200
  assert.equal(out.originY, 200)
})

test('the menu stays below when it fits with the 16px margin to spare', () => {
  // room below = 900 - 140 - 8 = 752, well over 216, so no flip even though there is room above too
  const out = placeMenu({ anchor: box(100, 100, 100, 40), width: 300, height: 200, band })
  assert.equal(out.side, 'bottom')
})

test('it needs the 16px margin as well as the height before it stays below', () => {
  // Trigger 400..440, bottom of the band 660: room below = 660 - 440 - 8 = 212. Room above = 400 - 8 - 80 = 312.
  const tight = { vw: 1440, minTop: 80, maxBottom: 660 }
  // 212 clears a 196px menu plus its 16px margin (212), so it stays below...
  assert.equal(placeMenu({ anchor: box(100, 400, 100, 40), width: 300, height: 196, band: tight }).side, 'bottom')
  // ...but a 200px menu fits the room (212) without the margin, so it flips above.
  assert.equal(placeMenu({ anchor: box(100, 400, 100, 40), width: 300, height: 200, band: tight }).side, 'top')
})

test('with no more room above than below it stays below and caps its height, never under 120px', () => {
  // Below 300 - 160 - 8 = 132 (short of 216). Above 120 - 8 - 80 = 32. So it stays below.
  const out = placeMenu({ anchor: box(100, 120, 100, 40), width: 300, height: 200, band: { vw: 1440, minTop: 80, maxBottom: 300 } })
  assert.equal(out.side, 'bottom')
  assert.equal(out.top, 168)
  assert.equal(out.maxHeight, 120) // 132 - 16 = 116, lifted to the 120 floor
})

test('a tall menu is capped to the room on its side less 16px', () => {
  const out = placeMenu({ anchor: box(100, 100, 100, 40), width: 300, height: 900, band })
  assert.equal(out.side, 'bottom')
  assert.equal(out.maxHeight, 736) // 900 - 140 - 8 = 752, less 16
})

test('a flipped menu is capped by the room above, less 16px', () => {
  const out = placeMenu({ anchor: box(100, 700, 100, 40), width: 300, height: 900, band: { vw: 1440, minTop: 80, maxBottom: 800 } })
  assert.equal(out.side, 'top')
  assert.equal(out.maxHeight, 596) // 700 - 8 - 80 = 612, less 16
  assert.equal(out.top, 96) // 700 - 8 - 596
})

test('16px always stay between the panel and the viewport sides', () => {
  // right edge: a trigger at the far right would put the panel at 1130; the limit is 1440 - 300 - 16
  const right = placeMenu({ anchor: box(1400, 100, 30, 40), width: 300, height: 200, band })
  assert.equal(right.left, 1124)
  assert.ok(right.left + 300 <= 1440 - 16)
  // left edge: a trigger 4px from the edge still leaves 16
  const left = placeMenu({ anchor: box(4, 100, 20, 40), width: 300, height: 200, band })
  assert.equal(left.left, 16)
})

test('on a narrow viewport the panel stays inside the margins', () => {
  // 320px viewport and a 288px panel: the only position that keeps 16px on both sides is 16
  const out = placeMenu({ anchor: box(10, 100, 40, 40), width: 288, height: 120, band: { vw: 320, minTop: 80, maxBottom: 600 } })
  assert.equal(out.left, 16)
})

test('the grow-from point sits under the trigger centre', () => {
  // trigger centre 150, panel left 100 -> 50px along the panel's top edge
  const out = placeMenu({ anchor: box(100, 100, 100, 40), width: 300, height: 200, band })
  assert.equal(out.originX, 50)
  assert.equal(out.originY, 0)
})

// ── placement at a pointer ───────────────────────────────────────────────────

test('a context menu opens 2px right of and below the pointer', () => {
  const out = placeMenu({ point: { x: 100, y: 200 }, width: 300, height: 200, band })
  assert.equal(out.left, 102)
  assert.equal(out.top, 202)
  assert.equal(out.side, 'bottom')
})

test('a context menu flips left when it would run past the right margin', () => {
  // 1302 + 300 > 1440 - 16, and 1298 - 300 = 998 is clear of the left margin
  const out = placeMenu({ point: { x: 1300, y: 200 }, width: 300, height: 200, band })
  assert.equal(out.left, 998)
  assert.equal(out.originX, 300)
})

test('a context menu flips up when it would run past the bottom margin', () => {
  // 802 + 200 > 900 - 16, and 798 - 200 = 598 is below the header
  const out = placeMenu({ point: { x: 100, y: 800 }, width: 300, height: 200, band })
  assert.equal(out.side, 'top')
  assert.equal(out.top, 598)
  assert.equal(out.originY, 200)
})

test('a context menu that fits on neither side is pulled inside the margins', () => {
  // viewport 400 wide: it cannot flip left (198 - 300 < 16), so it is clamped to 400 - 300 - 16 = 84
  const out = placeMenu({ point: { x: 200, y: 200 }, width: 300, height: 200, band: { vw: 400, minTop: 80, maxBottom: 900 } })
  assert.equal(out.left, 84)
})

// ── which rows take focus ────────────────────────────────────────────────────

test('only item rows take focus, and a disabled one still does', () => {
  const a = { id: 'a', label: 'Copy' }
  const b = { id: 'b', label: 'Delete', disabled: true, reason: 'Needs an account' }
  const rows = reachableRows(['sep', { type: 'section', label: 'Export' }, a, { type: 'note', text: 'Hi' }, null, { type: 'sep' }, b])
  assert.deepEqual(rows, [a, b])
})

test('an empty list has no reachable rows', () => {
  assert.deepEqual(reachableRows([]), [])
  assert.deepEqual(reachableRows(['sep', { type: 'note', text: 'Nothing here' }]), [])
})

// ── where a key sends the focus ──────────────────────────────────────────────

test('Down and Up step one row and wrap at the ends', () => {
  assert.equal(menuKeyTarget('ArrowDown', 0, 4), 1)
  assert.equal(menuKeyTarget('ArrowDown', 3, 4), 0)
  assert.equal(menuKeyTarget('ArrowUp', 2, 4), 1)
  assert.equal(menuKeyTarget('ArrowUp', 0, 4), 3)
})

test('with focus on the panel itself Down goes to the first row and Up to the last', () => {
  assert.equal(menuKeyTarget('ArrowDown', -1, 4), 0)
  assert.equal(menuKeyTarget('ArrowUp', -1, 4), 3)
})

test('Home and End jump to the first and last row', () => {
  assert.equal(menuKeyTarget('Home', 2, 5), 0)
  assert.equal(menuKeyTarget('End', 2, 5), 4)
})

test('any other key, and an empty menu, leave focus alone', () => {
  assert.equal(menuKeyTarget('a', 1, 4), -1)
  assert.equal(menuKeyTarget('Enter', 1, 4), -1)
  assert.equal(menuKeyTarget('ArrowDown', -1, 0), -1)
  assert.equal(menuKeyTarget('End', 0, 0), -1)
})

test('a single row wraps onto itself', () => {
  assert.equal(menuKeyTarget('ArrowDown', 0, 1), 0)
  assert.equal(menuKeyTarget('ArrowUp', 0, 1), 0)
})

// ── opening from the trigger by key ──────────────────────────────────────────

test('Down opens on the first row, Up on the last, Enter and Space are left to the button click', () => {
  assert.equal(menuOpenKey({ key: 'ArrowDown' }), 'first')
  assert.equal(menuOpenKey({ key: 'ArrowUp' }), 'last')
  assert.equal(menuOpenKey({ key: 'Enter' }), null)
  assert.equal(menuOpenKey({ key: ' ' }), null)
})

test('a modified arrow is not an open key', () => {
  assert.equal(menuOpenKey({ key: 'ArrowDown', altKey: true }), null)
  assert.equal(menuOpenKey({ key: 'ArrowDown', ctrlKey: true }), null)
  assert.equal(menuOpenKey({ key: 'ArrowUp', metaKey: true }), null)
})

test('the keyboard context-menu point is the focused element\'s bottom-left corner', () => {
  const el = { getBoundingClientRect: () => ({ left: 120, bottom: 340, top: 300, right: 400 }) }
  assert.deepEqual(keyboardPoint(el), { x: 120, y: 340 })
})

// ── typeahead ────────────────────────────────────────────────────────────────

const rows = [{ label: 'Copy link' }, { label: 'Copy hex' }, { label: 'Delete' }, { label: 'Duplicate' }]
const none = { text: '', time: 0 }

test('a letter jumps to the next row that starts with it', () => {
  assert.equal(menuTypeahead('d', -1, rows, none, 10_000).index, 2)
  assert.equal(menuTypeahead('c', 3, rows, none, 10_000).index, 0) // wraps past the end
})

test('typing is case-insensitive', () => {
  assert.equal(menuTypeahead('D', -1, rows, none, 10_000).index, 2)
})

test('a repeated letter inside 500ms cycles through the rows that share it', () => {
  const one = menuTypeahead('d', -1, rows, none, 10_000)
  assert.equal(one.index, 2)
  const two = menuTypeahead('d', one.index, rows, one, 10_200)
  assert.equal(two.index, 3)
  const three = menuTypeahead('d', two.index, rows, two, 10_400)
  assert.equal(three.index, 2) // back round to Delete
})

test('letters typed inside 500ms build a prefix that narrows the match', () => {
  const du = [{ label: 'Delete' }, { label: 'Duplicate' }, { label: 'Duplicate all' }]
  const d = menuTypeahead('d', -1, du, none, 5_000)
  assert.equal(d.index, 0)
  const u = menuTypeahead('u', d.index, du, d, 5_100)
  assert.equal(u.index, 1) // "du" skips Delete
})

test('after a pause the buffer starts over', () => {
  const first = menuTypeahead('c', -1, rows, none, 1_000)
  assert.equal(first.index, 0)
  // 600ms later "d" is a fresh query, not "cd"
  assert.equal(menuTypeahead('d', first.index, rows, first, 1_600).index, 2)
})

test('a prefix that matches nothing leaves focus where it was', () => {
  const first = menuTypeahead('c', -1, rows, none, 1_000)
  const miss = menuTypeahead('z', first.index, rows, first, 1_100)
  assert.equal(miss.index, 0)
  assert.equal(menuTypeahead('q', 2, rows, none, 1_000).index, 2)
})

test('a disabled row is still a typeahead target, because it can take focus to show its reason', () => {
  const list = [{ label: 'Save' }, { label: 'Share', disabled: true, reason: 'Needs an account' }]
  assert.equal(menuTypeahead('s', 0, list, none, 1_000).index, 1)
})
