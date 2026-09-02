// The collapse rules behind the Library filter tray's multi-select.
//
// Founder request (2026-08-08): shift-click to pick more than one gradient
// type, and "selecting all three types resets to All types".
//
// Every rule here is a case somebody hits by accident rather than on purpose —
// deselecting the last lit option, working through every option one at a time,
// shift-pressing the reset option itself — so they are asserted directly rather
// than inferred from the rendered tray. The rendered proof (that a real
// Shift+Click and a real Shift+Enter both reach this function, and that the
// grid actually widens) is in tests/user-sim/31-library-filter-multi.spec.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isOn, selectionSummary, toggleSelection } from '../../src/components/library/filterSelection.js'

const OPTIONS = [
  { id: 'all', label: 'All types' },
  { id: 'Linear', label: 'Linear' },
  { id: 'Radial', label: 'Radial' },
  { id: 'Conic', label: 'Conic' },
]
const CFG = { options: OPTIONS, resetId: 'all' }
const toggle = (current, id) => toggleSelection(current, id, CFG)

test('a first additive press replaces the reset option rather than joining it', () => {
  // ['all', 'Linear'] would be a contradiction: everything, and also linear.
  assert.deepEqual(toggle(['all'], 'Linear'), ['Linear'])
})

test('a second and third build the set up', () => {
  assert.deepEqual(toggle(['Linear'], 'Radial'), ['Linear', 'Radial'])
})

test('selecting every option collapses to the reset option', () => {
  // The founder's sentence, verbatim: "selecting all three types resets to
  // All types". Three lit pills that exclude nothing claim a narrowing that is
  // not happening.
  assert.deepEqual(toggle(['Linear', 'Radial'], 'Conic'), ['all'])
})

test('deselecting the last lit option collapses to the reset option too', () => {
  // Otherwise the grid empties and the tray looks like nothing is filtered.
  assert.deepEqual(toggle(['Linear'], 'Linear'), ['all'])
})

test('deselecting one of several just removes it', () => {
  assert.deepEqual(toggle(['Linear', 'Radial'], 'Radial'), ['Linear'])
})

test('an additive press on the reset option is still a reset', () => {
  assert.deepEqual(toggle(['Linear', 'Radial'], 'all'), ['all'])
  assert.deepEqual(toggle(['all'], 'all'), ['all'])
})

// Click order must not reorder the pills under the pointer.
test('the result keeps the options own order, not the order they were pressed', () => {
  assert.deepEqual(toggle(['Conic'], 'Linear'), ['Linear', 'Conic'])
})

// The tray is driven from URL/route state on some surfaces and from a plain
// string on the single-select ones, so the function has to survive being handed
// either — and anything stale that is no longer a real option.
test('it accepts a bare string as the current value', () => {
  assert.deepEqual(toggle('Linear', 'Radial'), ['Linear', 'Radial'])
  assert.deepEqual(toggle('all', 'Radial'), ['Radial'])
})

test('an id that is no longer an option is dropped rather than carried forward', () => {
  assert.deepEqual(toggle(['Linear', 'Bezier'], 'Radial'), ['Linear', 'Radial'])
})

test('isOn reads both shapes', () => {
  assert.equal(isOn('Linear', 'Linear'), true)
  assert.equal(isOn('Linear', 'Radial'), false)
  assert.equal(isOn(['Linear', 'Conic'], 'Conic'), true)
  assert.equal(isOn(['Linear'], 'Conic'), false)
  assert.equal(isOn(['all'], 'all'), true)
})

// A tray with a single selectable option would collapse to the reset on the
// very first press — correct (one of one IS all of them), and worth pinning so
// nobody "fixes" it into a state that cannot be left.
test('a tray with one selectable option collapses immediately, and stays reachable', () => {
  const one = { options: [{ id: 'all' }, { id: 'Linear' }], resetId: 'all' }
  assert.deepEqual(toggleSelection(['all'], 'Linear', one), ['all'])
})

// ── The collapsed trigger's summary (641–980px) ──────────────────────────────
// Between 641 and 980px the tray renders as one trigger plus a menu, and this
// string is the only thing on screen saying what the group is filtering by. If
// it is wrong the collapse has hidden state rather than saved space, which is
// the failure this whole pattern is judged on — so it is asserted here rather
// than left to be noticed in a screenshot.
const MOODS = [
  { id: 'all', label: 'All' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'dark', label: 'Dark' },
]

test('the collapsed trigger names a single selection in the option’s own words', () => {
  assert.equal(selectionSummary('warm', MOODS), 'Warm')
  assert.equal(selectionSummary(['cool'], MOODS), 'Cool')
  // The reset option is a selection like any other and says its own name —
  // "All" is more informative than "Any", and it is what the tray shows lit.
  assert.equal(selectionSummary('all', MOODS), 'All')
})

test('several selections are counted rather than listed', () => {
  assert.equal(selectionSummary(['warm', 'cool'], MOODS), '2 selected')
  assert.equal(selectionSummary(['warm', 'cool', 'dark'], MOODS), '3 selected')
})

test('no selection falls back to the empty wording, which the call site may choose', () => {
  assert.equal(selectionSummary([], MOODS), 'Any')
  assert.equal(selectionSummary('', MOODS), 'Any')
  assert.equal(selectionSummary([], MOODS, 'Default'), 'Default')
})

// A value that is no longer one of the options must not be reported as a
// selection — the trigger would be naming a filter that is not applied.
test('a stale value reports as no selection rather than inventing a label', () => {
  assert.equal(selectionSummary('bezier', MOODS), 'Any')
  assert.equal(selectionSummary(['warm', 'bezier'], MOODS), 'Warm')
})
