// The generator's Back and Redo for manual edits: the two stacks, the edit steps, and
// the keyboard rules (utils/gradientHistory).
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HISTORY_DEPTH, BURST_MS, emptyHistory, recordLook, undoLook, redoLook, canUndo, canRedo,
  startsBurst, isTextEntry, historyShortcut,
} from '../../src/utils/gradientHistory.js'

const look = (angle) => ({
  stops: [{ color: '#112233', position: 0 }, { color: '#FFFFFF', position: 100 }],
  type: 'Linear', angle, space: 'oklch',
})

test('an empty history can neither undo nor redo, and undo leaves it alone', () => {
  const h = emptyHistory()
  assert.equal(canUndo(h), false)
  assert.equal(canRedo(h), false)
  const r = undoLook(h, look(90))
  assert.equal(r.look, null)
  assert.deepEqual(r.history, h)
  assert.equal(redoLook(h, look(90)).look, null)
})

test('undo returns the recorded look and puts the one it replaced on redo', () => {
  let h = recordLook(emptyHistory(), look(90))
  const now = look(120)
  const u = undoLook(h, now)
  assert.equal(u.look.angle, 90)
  assert.equal(canUndo(u.history), false)
  assert.equal(canRedo(u.history), true)
  const r = redoLook(u.history, u.look)
  assert.equal(r.look.angle, 120)
  assert.equal(canRedo(r.history), false)
  assert.equal(canUndo(r.history), true)
})

test('a new edit after an undo empties redo', () => {
  let h = recordLook(emptyHistory(), look(90))
  const u = undoLook(h, look(120))
  assert.equal(canRedo(u.history), true)
  h = recordLook(u.history, look(90))
  assert.equal(canRedo(h), false)
})

test('undo then redo then undo walks the same steps both ways', () => {
  let h = emptyHistory()
  let cur = look(0)
  for (const a of [10, 20, 30]) { h = recordLook(h, cur); cur = look(a) }
  const seen = []
  for (let i = 0; i < 3; i++) { const u = undoLook(h, cur); h = u.history; cur = u.look; seen.push(cur.angle) }
  assert.deepEqual(seen, [20, 10, 0])
  assert.equal(canUndo(h), false)
  for (let i = 0; i < 3; i++) { const r = redoLook(h, cur); h = r.history; cur = r.look; seen.push(cur.angle) }
  assert.deepEqual(seen.slice(3), [10, 20, 30])
  assert.equal(canRedo(h), false)
})

test('an entry equal to the look on screen is skipped, so undo never does nothing', () => {
  let h = recordLook(emptyHistory(), look(90))
  h = recordLook(h, look(100))
  const u = undoLook(h, look(100))
  assert.equal(u.look.angle, 90)
  const onlyNoop = undoLook(recordLook(emptyHistory(), look(90)), look(90))
  assert.equal(onlyNoop.look, null)
  assert.equal(canUndo(onlyNoop.history), false)
})

test('both stacks are capped at HISTORY_DEPTH, oldest dropped', () => {
  let h = emptyHistory()
  for (let n = 1; n <= HISTORY_DEPTH + 7; n++) h = recordLook(h, look(n))
  assert.equal(h.past.length, HISTORY_DEPTH)
  assert.equal(h.past[0].angle, 8)
  let cur = look(999)
  for (let i = 0; i < HISTORY_DEPTH; i++) { const u = undoLook(h, cur); h = u.history; cur = u.look }
  assert.equal(h.future.length, HISTORY_DEPTH)
  assert.equal(canUndo(h), false)
})

test('ten edits then ten undos return to the start, and an eleventh has nowhere to go', () => {
  let h = emptyHistory()
  let cur = look(0)
  for (let n = 1; n <= 10; n++) { h = recordLook(h, cur); cur = look(n) }
  for (let i = 0; i < 10; i++) { const u = undoLook(h, cur); h = u.history; cur = u.look }
  assert.equal(cur.angle, 0)
  assert.equal(undoLook(h, cur).look, null)
})

test('recording copies the look, so a later edit cannot reach back into the stack', () => {
  const live = look(90)
  const h = recordLook(emptyHistory(), live)
  live.stops[0].color = '#ABCDEF'
  assert.equal(h.past[0].stops[0].color, '#112233')
})

test('an edit under the same key continues its step while it is quick, and starts a new one after a pause', () => {
  const burst = { key: 'angle', at: 1000, held: false }
  assert.equal(startsBurst(burst, 'angle', 1000 + BURST_MS), false)
  assert.equal(startsBurst(burst, 'angle', 1000 + BURST_MS + 1), true)
})

test('a different key always starts a new step', () => {
  assert.equal(startsBurst({ key: 'angle', at: 1000, held: false }, 'position:1', 1001), true)
  assert.equal(startsBurst({ key: null, at: 0, held: false }, 'angle', 5), true)
})

test('while a pointer is held the step continues however long the pause', () => {
  const burst = { key: 'position:2', at: 0, held: true }
  assert.equal(startsBurst(burst, 'position:2', 60000), false)
  assert.equal(startsBurst({ ...burst, held: false }, 'position:2', 60000), true)
})

test('text fields keep Ctrl+Z; sliders, buttons and the page do not', () => {
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'text' }), true)
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'number' }), true)
  assert.equal(isTextEntry({ tagName: 'INPUT', type: '' }), true)
  assert.equal(isTextEntry({ tagName: 'TEXTAREA' }), true)
  assert.equal(isTextEntry({ tagName: 'DIV', isContentEditable: true }), true)
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'range' }), false)
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'checkbox' }), false)
  assert.equal(isTextEntry({ tagName: 'BUTTON' }), false)
  assert.equal(isTextEntry({ tagName: 'DIV', role: 'slider' }), false)
  assert.equal(isTextEntry(null), false)
})

test('Ctrl or Cmd+Z undoes, Shift with it and Ctrl+Y redo, and nothing else is claimed', () => {
  const k = (o) => historyShortcut({ key: 'z', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...o })
  assert.equal(k({ ctrlKey: true }), 'undo')
  assert.equal(k({ metaKey: true }), 'undo')
  assert.equal(k({ ctrlKey: true, key: 'Z', shiftKey: true }), 'redo')
  assert.equal(k({ metaKey: true, key: 'Z', shiftKey: true }), 'redo')
  assert.equal(k({ ctrlKey: true, key: 'y' }), 'redo')
  assert.equal(k({ metaKey: true, key: 'y' }), null)
  assert.equal(k({ ctrlKey: true, key: 'y', shiftKey: true }), null)
  assert.equal(k({ key: 'z' }), null)
  assert.equal(k({ ctrlKey: true, altKey: true }), null)
  assert.equal(k({ ctrlKey: true, key: 'c' }), null)
})
