// The Video tab's edit list: undo, redo and the words for what was done.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EDIT_DEFAULTS, GESTURE_MS, HISTORY_DEPTH, canRedo, canUndo, changedEditNames, describeEdits, record, redo, startHistory, undo,
} from '../../src/utils/editHistory.js'
import { cropPlan, videoToAnimationArgs } from '../../src/utils/mediaEncode.js'
import { historyKey, isTyping } from '../../src/components/converter/useEditHistory.js'

const base = () => ({ ...EDIT_DEFAULTS })
const edit = (h, change, now = 0) => record(h, { ...h.present, ...change }, now)

// Five edits of five kinds, the way someone would make them one after another.
const FIVE = [{ shape: '1:1' }, { turn: 90 }, { flipH: true }, { speed: 2 }, { cut: 'circle' }]
const apply = (h, list) => list.reduce((acc, change, i) => edit(acc, change, i * 10_000), h)

const argsFor = (r) => {
  const plan = cropPlan(1280, 720, { shape: r.shape, anchor: r.anchor, box: r.box, fit: r.fit })
  return videoToAnimationArgs({
    format: 'gif', input: 'input.mp4', fps: 10, width: 480, plays: 0, quality: 'medium', start: 0, length: 0,
    crop: plan.crop, pad: plan.pad, turn: r.turn, flipH: r.flipH, flipV: r.flipV, speed: r.speed, direction: r.direction,
    colours: 256, dither: 'pattern', fill: 'transparent', cut: r.cut, radius: r.radius, sheet: null, maxFrames: 500,
  })
}

test('five edits, undo three, redo one is the same file as setting the first three by hand', () => {
  let h = apply(startHistory(base()), FIVE)
  for (let i = 0; i < 3; i++) h = undo(h)
  assert.deepEqual(h.present, { ...base(), shape: '1:1', turn: 90 })
  h = redo(h)
  const byHand = { ...base(), shape: '1:1', turn: 90, flipH: true }
  assert.deepEqual(h.present, byHand)
  assert.deepEqual(argsFor(h.present), argsFor(byHand))
  assert.notDeepEqual(argsFor(h.present), argsFor({ ...byHand, cut: 'circle' }))
})

test('undo goes back to the start and redo comes forward again', () => {
  let h = apply(startHistory(base()), FIVE)
  assert.equal(h.past.length, 5)
  while (canUndo(h)) h = undo(h)
  assert.deepEqual(h.present, base())
  assert.equal(canRedo(h), true)
  while (canRedo(h)) h = redo(h)
  assert.equal(h.present.cut, 'circle')
  assert.equal(canRedo(h), false)
})

test('a new edit after an undo empties the redo line', () => {
  let h = apply(startHistory(base()), FIVE)
  h = undo(undo(h))
  assert.equal(canRedo(h), true)
  h = edit(h, { turn: 180 }, 99_000)
  assert.equal(canRedo(h), false)
  assert.equal(h.present.turn, 180)
})

test('an undo is not counted as an edit: recording the restored settings changes nothing', () => {
  let h = apply(startHistory(base()), FIVE)
  h = undo(h)
  assert.equal(record(h, h.present, 1), h)
  assert.equal(canRedo(h), true)
})

test('undo and redo with nothing to do leave the history alone', () => {
  const h = startHistory(base())
  assert.equal(undo(h), h)
  assert.equal(redo(h), h)
})

test('dragging a crop box is one step; a second drag later is another', () => {
  let h = edit(startHistory(base()), { shape: 'custom', box: { x: 10, y: 10, w: 100, h: 100 } }, 0)
  h = edit(h, { box: { x: 11, y: 10, w: 100, h: 100 } }, 1_000)
  h = edit(h, { box: { x: 12, y: 10, w: 100, h: 100 } }, 1_000 + GESTURE_MS / 5)
  h = edit(h, { box: { x: 13, y: 10, w: 100, h: 100 } }, 1_000 + GESTURE_MS / 2)
  assert.equal(h.past.length, 2)
  h = edit(h, { box: { x: 40, y: 10, w: 100, h: 100 } }, 9_000)
  assert.equal(h.past.length, 3)
  assert.equal(undo(h).present.box.x, 13)
})

test('other edits are never merged, however fast they come', () => {
  const h = apply(startHistory(base()), [{ turn: 90 }, { turn: 180 }, { turn: 270 }].map(c => c))
  assert.equal(h.past.length, 3)
})

test('only the last HISTORY_DEPTH steps are kept', () => {
  let h = startHistory(base())
  for (let i = 1; i <= HISTORY_DEPTH + 20; i++) h = edit(h, { trimStart: i }, i * 10_000)
  assert.equal(h.past.length, HISTORY_DEPTH)
})

test('a new file starts a new history', () => {
  const h = apply(startHistory(base()), FIVE)
  const fresh = startHistory({ ...h.present, shape: 'original' })
  assert.equal(canUndo(fresh), false)
  assert.equal(canRedo(fresh), false)
})

test('the edit line is plain words, in a fixed order, and empty when there are none', () => {
  assert.deepEqual(describeEdits(base()), [])
  const r = { ...base(), speed: 2, turn: 90, shape: '1:1', cut: 'circle', flipH: true, trimStart: 1, trimEnd: 4 }
  assert.deepEqual(describeEdits(r), [
    'Trimmed to 1–4 s', 'Cropped to 1:1', 'Circle cut-out', 'Turned 90° right', 'Flipped horizontally', 'Double speed',
  ])
  assert.deepEqual(describeEdits({ ...base(), shape: '16:9', fit: 'fit' }), ['Fitted to 16:9 with bars'])
  assert.deepEqual(describeEdits({ ...base(), direction: 'reverse' }), ['Plays reverse'])
})

test('the names of what an undo changed', () => {
  assert.deepEqual(changedEditNames(base(), { ...base(), turn: 90 }), ['turn'])
  assert.deepEqual(changedEditNames(base(), { ...base(), shape: '1:1', flipV: true }), ['crop', 'flip'])
})

test('Ctrl or Cmd with Z undoes, with Shift redoes, Ctrl+Y redoes, nothing else does', () => {
  const key = (o) => historyKey({ key: 'z', ...o })
  assert.equal(key({ ctrlKey: true }), 'undo')
  assert.equal(key({ metaKey: true }), 'undo')
  assert.equal(key({ ctrlKey: true, shiftKey: true, key: 'Z' }), 'redo')
  assert.equal(key({ metaKey: true, shiftKey: true, key: 'Z' }), 'redo')
  assert.equal(key({ ctrlKey: true, key: 'y' }), 'redo')
  assert.equal(key({ metaKey: true, key: 'y' }), null)
  assert.equal(key({}), null)
  assert.equal(key({ ctrlKey: true, altKey: true }), null)
  assert.equal(key({ ctrlKey: true, key: 'x' }), null)
})

test('typing in a field keeps the field its own undo', () => {
  const el = (tagName, type, extra = {}) => ({ nodeType: 1, tagName, getAttribute: () => type, ...extra })
  assert.equal(isTyping(el('INPUT', 'text')), true)
  assert.equal(isTyping(el('INPUT', null)), true)
  assert.equal(isTyping(el('INPUT', 'number')), true)
  assert.equal(isTyping(el('TEXTAREA', null)), true)
  assert.equal(isTyping(el('DIV', null, { isContentEditable: true })), true)
  assert.equal(isTyping(el('INPUT', 'checkbox')), false)
  assert.equal(isTyping(el('BUTTON', null)), false)
  assert.equal(isTyping(null), false)
})
