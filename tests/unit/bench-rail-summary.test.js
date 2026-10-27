// THE RAIL'S SECOND LINE: what each bench window holds, as a sentence.
// The strings are built from the windows' own state, never typed, so a picked
// seed, icon, family or format changes them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { converterSummary, railSummary } from '../../src/components/spectrum/benchSummary.js'
import { BASES, FONTS, HARMONIES, ICONS } from '../../src/components/spectrum/spectrumKit.js'

const rest = { base: 0, harmony: 0, icon: 'palette', weight: 2, size: 24, font: 0, result: null }

test('the four lines are read off the state, in rail order', () => {
  const lines = railSummary({ ...rest, harmony: 1, result: { pct: 92, format: 'WEBP' } })
  assert.equal(lines.length, 4)
  assert.equal(lines[0], `${BASES[0].label}, ${HARMONIES[1][0].toLowerCase()}`)
  assert.equal(lines[1], 'Palette, regular, 24px')
  assert.equal(lines[2], `${FONTS[0].name} with ${FONTS[0].pair}`)
  assert.equal(lines[3], '92% smaller as WebP')
})

test('a picked seed, icon, weight, size and family each change their own line', () => {
  const before = railSummary(rest)
  const [slug, name] = ICONS[3]
  const after = railSummary({ ...rest, base: 2, icon: slug, weight: 4, size: 32, font: 1 })
  assert.notEqual(after[0], before[0])
  assert.equal(after[1], `${name}, fill, 32px`)
  assert.equal(after[2], `${FONTS[1].name} with ${FONTS[1].pair}`)
  assert.equal(after[3], before[3], 'the converter line moved without a measurement')
})

test('the converter line waits for the first encode, then names the format', () => {
  assert.equal(converterSummary(null), 'Not measured yet')
  assert.equal(converterSummary({ pct: null, format: 'WEBP' }), 'Not measured yet')
  assert.equal(converterSummary({ pct: null, format: 'WEBP', measuring: true }), 'Measuring…')
  assert.equal(converterSummary({ pct: null, format: 'WEBP', failed: true }), 'File not supported')
  assert.equal(converterSummary({ pct: 61, format: 'JPEG' }), '61% smaller as JPEG')
  assert.equal(converterSummary({ pct: -8, format: 'WEBP' }), '8% larger as WebP')
  assert.equal(converterSummary({ pct: 0, format: 'PNG' }), 'Lossless PNG')
})

test('the code peek is always three lines and breaks a one-line SVG at its attributes', async () => {
  const { peekLines } = await import('../../src/components/spectrum/benchSummary.js')
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor"><path d="M0"/></svg>'
  assert.deepEqual(peekLines(svg), ['<svg xmlns="http://www.w3.org/2000/svg"', '  width="24" height="24"', '  viewBox="0 0 256 256"'])
  assert.deepEqual(peekLines('<Palette size={24} weight="regular" />'), ['<Palette size={24} weight="regular" />', '', ''])
})
