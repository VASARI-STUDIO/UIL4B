import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as iconStroke from '../../src/utils/iconStroke.js'

const src = readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8')

test('the caption names the mode and its numbers at the current size', () => {
  for (const [size, stroke, there] of [[48, 4, '8'], [128, 0.75, '4'], [12, 4, '2'], [24, 2, '2']]) {
    const rel = iconStroke.strokeScaleCaption({ size, stroke, absolute: false })
    const text = `${rel.prefix}${rel.effect}${rel.suffix}`
    assert.match(text, /^Relative: /)
    assert.ok(text.includes(`${stroke}px at 24px`), text)
    if (size !== 24) assert.ok(text.includes(`${there}px at ${size}px`), text)
    const fixed = iconStroke.strokeScaleCaption({ size, stroke, absolute: true })
    assert.equal(`${fixed.prefix}${fixed.effect}${fixed.suffix}`, `Fixed: the stroke is ${stroke}px at every size and PNG scale, so bigger icons look lighter.`)
    assert.doesNotMatch(text + fixed.suffix, /—/)
  }
})

test('Relative and Fixed are a two-way radio choice described by the live caption', () => {
  const group = src.match(/<div className="icust-seg icust-mode"[^>]*>/)?.[0]
  assert.ok(group, 'the choice exists')
  assert.match(group, /role="radiogroup"/)
  assert.match(group, /aria-describedby="icust-stroke-note"/)
  assert.match(src, /\[\['Relative', false\], \['Fixed', true\]\]/)
  assert.match(src, /strokeScaleCaption\(\{ size, stroke, absolute: absStroke \}\)/)
  assert.match(src, /<p id="icust-stroke-note" className="icust-stroke-note">\r?\n\s*\{strokeCaption\.prefix\}<b>\{strokeCaption\.effect\}<\/b>\{strokeCaption\.suffix\}\r?\n/)
})

test('the PNG is serialised at its own pixel size with the slider value, not a scaled copy of it', () => {
  assert.doesNotMatch(src, /stroke: stroke \* grow/)
  assert.match(src, /size: format\.px, color: isColoredPack \? undefined : \(color \|\| themeInk\),\s+stroke, isStroke, absStroke/)
})
