// The Video tab's tool rail: which groups show, how the phone's five slots are
// filled, and which groups carry the "edited" mark.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PHONE_SLOTS, RAIL_GROUPS, SIZE_DEFAULTS, activeOf, groupMarks, presentGroups, railPanelId, railTabId, splitRail,
} from '../../src/components/converter/railGroups.js'
import { EDIT_DEFAULTS } from '../../src/utils/editHistory.js'

const ids = (list) => list.map(g => g.id)
const fresh = () => ({ ...EDIT_DEFAULTS, ...SIZE_DEFAULTS })

test('the groups run in pipeline order: clip, crop, turn, time, look, add, size', () => {
  assert.deepEqual(ids(RAIL_GROUPS), ['clip', 'crop', 'turn', 'time', 'look', 'add', 'size'])
})

test('a group with no controls today is absent, not disabled', () => {
  assert.deepEqual(ids(presentGroups({ hasDuration: true })), ['clip', 'crop', 'turn', 'time', 'size'])
  assert.ok(!ids(presentGroups({ hasDuration: true })).includes('look'))
  assert.ok(!ids(presentGroups({ hasDuration: true })).includes('add'))
})

test('Clip needs a known length to trim, so it is absent without one', () => {
  assert.deepEqual(ids(presentGroups({ hasDuration: false })), ['crop', 'turn', 'time', 'size'])
  assert.deepEqual(ids(presentGroups({ hasDuration: 0 })), ['crop', 'turn', 'time', 'size'])
})

test('the phone row never holds more than five slots', () => {
  const all = presentGroups({ hasDuration: true })
  const { direct, more } = splitRail(all)
  assert.deepEqual(ids(direct), ['clip', 'crop', 'time', 'size'])
  assert.deepEqual(ids(more), ['turn'])
  assert.ok(direct.length + (more.length ? 1 : 0) <= PHONE_SLOTS)
})

test('every group lands in a slot or behind More, none twice, none lost', () => {
  for (const hasDuration of [true, false]) {
    const all = presentGroups({ hasDuration })
    const { direct, more } = splitRail(all)
    assert.deepEqual(ids([...direct, ...more]).sort(), ids(all).sort())
    assert.equal(new Set(ids([...direct, ...more])).size, all.length)
  }
})

test('with Look and Add present as well, the extras still fit behind one More', () => {
  const { direct, more } = splitRail(RAIL_GROUPS)
  assert.ok(direct.length <= PHONE_SLOTS - 1)
  assert.deepEqual(ids(more), ['turn', 'look', 'add'])
})

test('a fresh page marks nothing', () => {
  assert.deepEqual(groupMarks(fresh()), { clip: false, crop: false, turn: false, time: false, look: false, add: false, size: false })
})

test('each edit marks its own group and no other', () => {
  const only = (change, group) => {
    const marks = groupMarks({ ...fresh(), ...change })
    assert.deepEqual(Object.keys(marks).filter(k => marks[k]), [group], JSON.stringify(change))
  }
  only({ trimStart: 1 }, 'clip')
  only({ trimEnd: 3 }, 'clip')
  only({ shape: '1:1' }, 'crop')
  only({ cut: 'circle' }, 'crop')
  only({ turn: 90 }, 'turn')
  only({ flipH: true }, 'turn')
  only({ flipV: true }, 'turn')
  only({ speed: 2 }, 'time')
  only({ direction: 'reverse' }, 'time')
  only({ fps: 15 }, 'size')
  only({ width: 720 }, 'size')
  only({ quality: 'high' }, 'size')
  only({ plays: 1 }, 'size')
  only({ colours: 64 }, 'size')
  only({ dither: 'none' }, 'size')
})

test('a fit or position that does nothing yet does not mark Crop', () => {
  assert.equal(groupMarks({ ...fresh(), fit: 'fit' }).crop, false)
  assert.equal(groupMarks({ ...fresh(), anchor: 'top' }).crop, false)
})

test('the open group is the one asked for, else the first', () => {
  const groups = presentGroups({ hasDuration: false })
  assert.equal(activeOf(groups, 'time').id, 'time')
  assert.equal(activeOf(groups, 'clip').id, 'crop')
  assert.equal(activeOf([], 'clip'), null)
})

test('a button and its panel point at each other by id', () => {
  assert.equal(railTabId('fc-vid', 'crop'), 'fc-vid-tab-crop')
  assert.equal(railPanelId('fc-vid', 'crop'), 'fc-vid-panel-crop')
})

test('a sound-only output keeps just the trim and the speed', () => {
  assert.deepEqual(ids(presentGroups({ hasDuration: true, audioOnly: true })), ['clip', 'time'])
  assert.deepEqual(ids(presentGroups({ hasDuration: false, audioOnly: true })), ['time'])
  // the open group falls back to one that is still there
  assert.equal(activeOf(presentGroups({ hasDuration: true, audioOnly: true }), 'crop').id, 'clip')
})
