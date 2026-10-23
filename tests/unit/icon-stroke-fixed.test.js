import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as iconStroke from '../../src/utils/iconStroke.js'

const src = readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8')

test('Fixed caption explains scaling with the current size and stroke in both states', () => {
  assert.equal(typeof iconStroke.strokeScaleCaption, 'function')
  for (const [size, stroke, scaledSize, grown, held] of [
    [48, 4, '96', '8', '4'],
    [128, 0.75, '256', '1.5', '0.75'],
    [12, 4, '24', '8', '4'],
    [128, 8, '256', '16', '8'],
    [48, 1.125, '96', '2.25', '1.13'],
  ]) {
    for (const absolute of [false, true]) {
      const caption = iconStroke.strokeScaleCaption({ size, stroke, absolute })
      assert.equal(caption.prefix, `If the file is scaled to ${scaledSize}px, the stroke `)
      assert.equal(caption.effect, absolute ? `stays ${held}px` : `grows to ${grown}px`)
      assert.equal(`${caption.prefix}${caption.effect}.`,
        `If the file is scaled to ${scaledSize}px, the stroke ${absolute ? `stays ${held}px` : `grows to ${grown}px`}.`)
    }
  }
})

test('Fixed uses its visible name and the live caption as its description', () => {
  const button = src.match(/<button\b[^>]*className=\{`icust-abs[\s\S]*?>Fixed<\/button>/)?.[0]
  assert.ok(button, 'Fixed button exists')
  assert.doesNotMatch(button, /\btitle\s*=/)
  assert.doesNotMatch(button, /\baria-label\s*=/)
  assert.match(button, /aria-pressed=\{absStroke\}/)
  assert.match(button, /aria-describedby="icust-stroke-note"/)
  assert.match(src, /strokeScaleCaption\(\{ size, stroke, absolute: absStroke \}\)/)
  assert.match(src, /<p id="icust-stroke-note" className="icust-stroke-note">\r?\n\s*\{strokeCaption\.prefix\}<b>\{strokeCaption\.effect\}<\/b>\./)
})
