// The notation the colour picker shows is remembered on this browser, under
// `vs-colour-notation`, and shared by every picker. The store is untrusted:
// private browsing throws on access, and a stale or hand-edited value must not
// put the field in a notation it cannot print.
import test from 'node:test'
import assert from 'node:assert/strict'

// A minimal localStorage, because node:test has no DOM. Installed before the
// module is imported so its try/catch guards see a real store.
const store = new Map()
let broken = false
const guard = () => { if (broken) throw new Error('storage blocked') }
globalThis.localStorage = {
  getItem: (k) => { guard(); return store.has(k) ? store.get(k) : null },
  setItem: (k, v) => { guard(); store.set(k, String(v)) },
  removeItem: (k) => { guard(); store.delete(k) },
  clear: () => store.clear(),
}

const { NOTATION_KEY, readNotation, writeNotation } = await import('../../src/utils/colorFormats.js')

const reset = () => { store.clear(); broken = false }

test('the key is the one the sync inventory classifies', () => {
  assert.equal(NOTATION_KEY, 'vs-colour-notation')
})

test('nothing stored reads as hex', () => {
  reset()
  assert.equal(readNotation(), 'hex')
})

test('every notation survives a write and a read', () => {
  reset()
  for (const format of ['hex', 'rgb', 'hsl', 'oklch']) {
    writeNotation(format)
    assert.equal(store.get(NOTATION_KEY), format)
    assert.equal(readNotation(), format)
  }
})

test('a stale or hand-edited value falls back to hex', () => {
  reset()
  for (const bad of ['', 'cmyk', 'OKLCH', 'null', '{"a":1}']) {
    store.set(NOTATION_KEY, bad)
    assert.equal(readNotation(), 'hex', bad)
  }
})

test('writing an unknown notation stores nothing', () => {
  reset()
  writeNotation('cmyk')
  writeNotation(undefined)
  assert.equal(store.has(NOTATION_KEY), false)
})

test('a blocked store neither throws on read nor on write', () => {
  reset()
  broken = true
  assert.equal(readNotation(), 'hex')
  assert.doesNotThrow(() => writeNotation('oklch'))
  broken = false
})

test('a missing localStorage (the prerender) reads as hex', () => {
  reset()
  const saved = globalThis.localStorage
  delete globalThis.localStorage
  try {
    assert.equal(readNotation(), 'hex')
    assert.doesNotThrow(() => writeNotation('rgb'))
  } finally {
    globalThis.localStorage = saved
  }
})
