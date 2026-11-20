import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_NAME_PATTERN, applyNamePattern, safeBase, uniqueFileName, unknownTokens,
} from '../../src/utils/convertNaming.js'

const file = { name: 'Holiday Photo.PNG', ext: 'webp', w: 800, h: 600, n: 3 }

test('the default pattern keeps the source name', () => {
  assert.equal(applyNamePattern(DEFAULT_NAME_PATTERN, file), 'Holiday Photo')
  assert.equal(applyNamePattern('', file), 'Holiday Photo')
  assert.equal(applyNamePattern('   ', file), 'Holiday Photo')
})

test('every token is filled from the file', () => {
  assert.equal(applyNamePattern('{name}-{width}x{height}', file), 'Holiday Photo-800x600')
  assert.equal(applyNamePattern('shot-{n}.{format}', file), 'shot-3.webp')
  assert.equal(applyNamePattern('img_{n}', { ...file, n: 12 }), 'img_12')
})

test('a name that only the extension separates keeps its inner dots', () => {
  assert.equal(applyNamePattern('{name}', { ...file, name: 'a.b.c.jpeg' }), 'a.b.c')
})

test('unknown tokens come out empty and are reported', () => {
  assert.equal(applyNamePattern('{name}-{colour}', file), 'Holiday Photo-')
  assert.deepEqual(unknownTokens('{name}-{colour}-{nope}-{colour}'), ['{colour}', '{nope}'])
  assert.deepEqual(unknownTokens('{name}-{n}'), [])
  assert.deepEqual(unknownTokens(undefined), [])
})

test('path and reserved characters never reach a file name', () => {
  assert.equal(safeBase('a/b\\c:d*e?f"g<h>i|j'), 'a-b-c-d-e-f-g-h-i-j')
  assert.equal(safeBase('  ..hidden.. '), 'hidden')
  // A traversal attempt is flattened into one name: no separator survives.
  const sneaky = applyNamePattern('../../{name}', file)
  assert.equal(sneaky, '-..-Holiday Photo')
  assert.ok(!/[\x5c/]/.test(sneaky))
})

test('a pattern that comes to nothing falls back to the source name', () => {
  assert.equal(applyNamePattern('...', file), 'Holiday Photo')
  assert.equal(applyNamePattern('///', file), 'Holiday Photo')
  assert.equal(applyNamePattern('{name}', { name: '', ext: 'png' }), 'image')
})

test('long names are cut and never end on a dot', () => {
  const long = safeBase('x'.repeat(300))
  assert.equal(long.length, 120)
  assert.equal(safeBase(`${'y'.repeat(119)}.zzz`).endsWith('.'), false)
})

test('width and height are blank, not zero, before they are known', () => {
  assert.equal(applyNamePattern('{name}-{width}', { name: 'a.png', ext: 'png' }), 'a-')
})

test('unique names count up and remember what they gave out', () => {
  const used = new Set()
  assert.equal(uniqueFileName('photo', 'webp', used), 'photo.webp')
  assert.equal(uniqueFileName('photo', 'webp', used), 'photo-1.webp')
  assert.equal(uniqueFileName('photo', 'webp', used), 'photo-2.webp')
  assert.equal(uniqueFileName('other', 'webp', used), 'other.webp')
})
