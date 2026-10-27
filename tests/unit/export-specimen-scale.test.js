// specimenScale(): the one shrink factor every specimen in a type scale is set at.
//
// The expected values below are worked by hand from the geometry, not by calling the
// formula again. One CSS px is 25.4 / 96 = 0.264583 mm, so a 100 px specimen at line
// height 1 is 26.4583 mm tall, and a 3-letter name at 0.6 em per letter is 47.625 mm wide.
import test from 'node:test'
import assert from 'node:assert/strict'
import { specimenScale } from '../../src/utils/exportTemplates/shared.js'

// Padding and the row-text minimum zeroed so the only thing deciding the height is the specimen.
const TALL = { roomMm: 20, widthMm: 1000, padMm: 0, textMm: 0, lineHeight: 1 }
const BIG = [{ name: 'Big', px: 100 }]

test('a ladder that fits its table is set at true size and the head says only "Specimen"', () => {
  // 16 px and 12 px rows come to about 17 mm of a 95 mm table; the widest name is 12.7 mm of 183 mm.
  const out = specimenScale(
    [{ name: 'Body', px: 16 }, { name: 'Small', px: 12 }],
    { roomMm: 95, widthMm: 183, padMm: 3.85, textMm: 4.2, lineHeight: 1.1 },
  )
  assert.deepEqual(out, { k: 1, label: 'Specimen' })
})

test('a ladder that is too tall gets the largest share that fits: 20 mm of a 26.46 mm specimen is 75 %', () => {
  // 20 / 26.4583 = 0.7559. Two decimals, rounded down, is 0.75 (rounding to nearest would say 0.76, which is 20.11 mm).
  const out = specimenScale(BIG, TALL)
  assert.equal(out.k, 0.75)
  assert.equal(out.label, 'Specimen, at 75%')
})

test('the factor it returns never overflows the room, and one more percent would', () => {
  const { k } = specimenScale(BIG, TALL)
  const tall = (share) => 100 * share * 0.264583
  assert.ok(tall(k) <= 20, 'the chosen share is taller than the table')
  assert.ok(tall(k + 0.01) > 20, 'a larger share also fitted, so k is not the largest')
})

test('the widest name limits the factor when it is wider than its column', () => {
  // "Big" at 100 px is 47.625 mm wide; a 30 mm column allows 30 / 47.625 = 0.6299 of it, so 62 %.
  const out = specimenScale(BIG, { roomMm: 1000, widthMm: 30, padMm: 0, textMm: 0, lineHeight: 1 })
  assert.deepEqual(out, { k: 0.62, label: 'Specimen, at 62%' })
})

test('the line height counts: left out it is 1.15, not 1', () => {
  // 20 / (26.4583 * 1.15) = 0.6573, so 65 %; at a line height of 1 the same table gives 75 %.
  const { lineHeight, ...noLineHeight } = TALL
  assert.equal(specimenScale(BIG, noLineHeight).k, 0.65)
  assert.equal(specimenScale(BIG, { ...noLineHeight, lineHeight: 1.15 }).k, 0.65)
  assert.equal(specimenScale(BIG, { ...noLineHeight, lineHeight }).k, 0.75)
})

test('each row pays its padding, so the same ladder in a padded table is smaller', () => {
  // Rows: 2 x (100 px x k x 0.264583 + 5 mm) in 40 mm. 40 = 2 x 5 + 52.9167 k, so k = 0.5669, which is 56 %.
  const two = [{ name: 'Big', px: 100 }, { name: 'Bit', px: 100 }]
  assert.equal(specimenScale(two, { roomMm: 40, widthMm: 1000, padMm: 5, textMm: 0, lineHeight: 1 }).k, 0.56)
})

test('a row never gets shorter than its text, so a tiny specimen does not shrink the table', () => {
  // A 10 px specimen is 2.6 mm but its row text is 8 mm: the row is 8 + 2 = 10 mm at any share.
  // 10 mm fits a 10 mm table at true size; a 9 mm table can never fit, and the share stops at 10 %.
  const one = [{ name: 'A', px: 10 }]
  const fit = { widthMm: 1000, padMm: 2, textMm: 8, lineHeight: 1 }
  assert.deepEqual(specimenScale(one, { ...fit, roomMm: 10 }), { k: 1, label: 'Specimen' })
  assert.deepEqual(specimenScale(one, { ...fit, roomMm: 9 }), { k: 0.1, label: 'Specimen, at 10%' })
})
