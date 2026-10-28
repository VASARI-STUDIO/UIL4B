// The save waiting on a sign-up (utils/pendingSave.js): stash the typed name
// before the account is asked for, take it back when the tool mounts signed in.
// One slot, this tab only, fresh for 30 minutes, read once.
import test from 'node:test'
import assert from 'node:assert/strict'
import { stashPendingSave, takePendingSave, clearPendingSave } from '../../src/utils/pendingSave.js'

const KEY = 'vs-pending-save'
const MIN = 60 * 1000

function session(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}
const stashedAt = (s) => JSON.parse(s.getItem(KEY)).at

test('a stashed name comes back for the same tool, once', () => {
  const s = session()
  stashPendingSave('gradient', 'Harbour dusk', s)
  assert.equal(takePendingSave('gradient', s), 'Harbour dusk')
  assert.equal(takePendingSave('gradient', s), null, 'a second read finds nothing')
  assert.equal(s.map.size, 0, 'taking it empties the slot')
})

test('a name typed as nothing comes back as an empty string, not as "no stash"', () => {
  const s = session()
  stashPendingSave('palette', '', s)
  assert.equal(takePendingSave('palette', s), '')
  stashPendingSave('palette', null, s)
  assert.equal(takePendingSave('palette', s), '')
})

test('a very long name is cut to 80 characters', () => {
  const s = session()
  stashPendingSave('gradient', 'x'.repeat(200), s)
  assert.equal(takePendingSave('gradient', s), 'x'.repeat(80))
})

test('the other tool’s stash is not taken, and is left in place for its own tool', () => {
  const s = session()
  stashPendingSave('palette', 'Brand colours', s)
  assert.equal(takePendingSave('gradient', s), null)
  assert.equal(takePendingSave('palette', s), 'Brand colours', 'the palette still finds it')
})

test('there is one slot: a second stash replaces the first', () => {
  const s = session()
  stashPendingSave('palette', 'First', s)
  stashPendingSave('gradient', 'Second', s)
  assert.equal(takePendingSave('palette', s), null)
  assert.equal(takePendingSave('gradient', s), 'Second')
})

test('a stash is honoured up to, but not including, 30 minutes', () => {
  const s = session()
  stashPendingSave('gradient', 'Fresh', s)
  const at = stashedAt(s)
  assert.equal(takePendingSave('gradient', s, at + 30 * MIN - 1), 'Fresh')

  stashPendingSave('gradient', 'Stale', s)
  const at2 = stashedAt(s)
  assert.equal(takePendingSave('gradient', s, at2 + 30 * MIN), null, 'exactly 30 minutes is stale')
  assert.equal(s.map.size, 0, 'a stale stash is removed as it is refused')
})

test('a stash dated in the future is honoured (a clock set back does not lose a name)', () => {
  const s = session()
  stashPendingSave('gradient', 'Name', s)
  assert.equal(takePendingSave('gradient', s, stashedAt(s) - 5 * MIN), 'Name')
})

test('clearing the slot drops a stash of either tool', () => {
  const s = session()
  stashPendingSave('gradient', 'A', s)
  clearPendingSave(s)
  assert.equal(takePendingSave('gradient', s), null)
  clearPendingSave(s)
})

test('a slot that is not JSON is treated as empty and does not throw', () => {
  for (const junk of ['{not json', 'undefined', '', '[', '"gradient"']) {
    const s = session({ [KEY]: junk })
    assert.equal(takePendingSave('gradient', s), null, `junk: ${JSON.stringify(junk)}`)
  }
})

test('JSON of the wrong shape is refused', () => {
  const now = Date.now()
  const cases = {
    'null': 'null',
    'a bare number': '42',
    'no tool': JSON.stringify({ name: 'x', at: now }),
    'no time': JSON.stringify({ tool: 'gradient', name: 'x' }),
    'time not a number': JSON.stringify({ tool: 'gradient', name: 'x', at: 'yesterday' }),
  }
  for (const [label, raw] of Object.entries(cases)) {
    const s = session({ [KEY]: raw })
    assert.equal(takePendingSave('gradient', s), null, label)
  }
})

test('a name that is not text comes back as an empty string rather than the wrong type', () => {
  const s = session({ [KEY]: JSON.stringify({ tool: 'gradient', name: { x: 1 }, at: Date.now() }) })
  assert.equal(takePendingSave('gradient', s), '')
})

test('storage that refuses every call (private mode) loses the stash without throwing', () => {
  const boom = () => { throw new Error('SecurityError') }
  const s = { getItem: boom, setItem: boom, removeItem: boom }
  assert.doesNotThrow(() => stashPendingSave('gradient', 'x', s))
  assert.doesNotThrow(() => clearPendingSave(s))
  assert.equal(takePendingSave('gradient', s), null)
})
