// The shared recently-used colour list behind the picker's saved swatches.
//
// One list across every ColorPickerPop in the app: a colour you just mixed in
// the Palette Builder is one you are likely to want on a gradient stop, and
// matching it again by eye is the tedious part of building a system.
import test from 'node:test'
import assert from 'node:assert/strict'

// A minimal localStorage, because node:test has no DOM. Installed before the
// module is imported so its `try/catch` guards see a real store.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { addRecentColor, getRecentColors } = await import('../../src/utils/recentColors.js')

const KEY = 'vs-recent-colors'
const reset = () => store.clear()

test('an empty store is an empty list, not a crash', () => {
  reset()
  assert.deepEqual(getRecentColors(), [])
})

test('the newest colour comes first', () => {
  reset()
  addRecentColor('#111111')
  addRecentColor('#222222')
  assert.deepEqual(getRecentColors(), ['#222222', '#111111'])
})

test('re-picking a colour moves it to the front rather than duplicating it', () => {
  reset()
  addRecentColor('#111111')
  addRecentColor('#222222')
  addRecentColor('#111111')
  assert.deepEqual(getRecentColors(), ['#111111', '#222222'])
})

test('case is normalised, so one colour never takes two slots', () => {
  // The app is inconsistent on purpose: the gradient stops uppercase their hex,
  // the picker emits lowercase. Both are the same colour.
  reset()
  addRecentColor('#AABBCC')
  addRecentColor('#aabbcc')
  assert.deepEqual(getRecentColors(), ['#aabbcc'])
})

test('the list is capped, dropping the oldest', () => {
  reset()
  for (let i = 0; i < 30; i++) addRecentColor(`#0000${i.toString(16).padStart(2, '0')}`)
  const list = getRecentColors()
  assert.equal(list.length, 12)
  assert.equal(list[0], '#00001d')  // the last one added
})

test('anything that is not a colour is ignored', () => {
  reset()
  addRecentColor('#111111')
  for (const bad of ['', 'nonsense', '#12', null, undefined, 42, {}]) addRecentColor(bad)
  assert.deepEqual(getRecentColors(), ['#111111'])
})

// The exact fault that once white-screened the whole app from `vs-analytics`:
// `JSON.parse(...) || fallback` only catches null, so a valid-JSON value of the
// WRONG SHAPE passes straight through and throws on the next write. Reachable
// by a stale schema or by someone hand-restoring their own data export.
test('a stored value of the wrong shape is discarded, not trusted', () => {
  for (const junk of ['{"nope":true}', '"a string"', '42', 'null', 'not json at all']) {
    reset()
    store.set(KEY, junk)
    assert.deepEqual(getRecentColors(), [], junk)
    // …and writing over it still works rather than throwing.
    assert.deepEqual(addRecentColor('#123456'), ['#123456'], junk)
  }
})

test('non-colour entries inside a valid array are filtered out', () => {
  reset()
  store.set(KEY, JSON.stringify(['#111111', 'nonsense', null, '#222222']))
  assert.deepEqual(getRecentColors(), ['#111111', '#222222'])
})

test('a store that refuses to write never breaks picking a colour', () => {
  reset()
  const setItem = globalThis.localStorage.setItem
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  try {
    // Private windows and full stores both do this. The colour still gets
    // picked; only the convenience is lost.
    assert.doesNotThrow(() => addRecentColor('#123456'))
  } finally {
    globalThis.localStorage.setItem = setItem
  }
})
