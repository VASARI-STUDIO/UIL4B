import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GROUNDS, normaliseGround, groundContrastNote, colourChoice } from '../../src/utils/iconColourRow.js'
import { stripCss, stripJs } from '../helpers/strip-comments.js'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

test('a stored ground is kept only if it is one of the four', () => {
  assert.deepEqual([...GROUNDS], ['page', 'light', 'dark', 'checker'])
  for (const g of GROUNDS) assert.equal(normaliseGround(g), g)
  for (const bad of [null, undefined, '', 'blue', 'theme']) assert.equal(normaliseGround(bad), 'page')
})

test('which colour choice a value is does not depend on its case', () => {
  assert.equal(colourChoice(''), 'text')
  assert.equal(colourChoice('#000000'), 'black')
  assert.equal(colourChoice('#FFFFFF'), 'white')
  assert.equal(colourChoice('#ffffff'), 'white')
  assert.equal(colourChoice('#3366cc'), 'custom')
})

test('black on a dark ground is a note that offers Light; white on the page in light mode offers Dark', () => {
  assert.deepEqual(groundContrastNote({ ink: '#000000', ground: 'dark', theme: 'light' }), { suggest: 'light' })
  assert.deepEqual(groundContrastNote({ ink: '#000000', ground: 'page', theme: 'dark' }), { suggest: 'light' })
  assert.deepEqual(groundContrastNote({ ink: '#ffffff', ground: 'page', theme: 'light' }), { suggest: 'dark' })
})

test('an icon that reads on its ground gets no note', () => {
  assert.equal(groundContrastNote({ ink: '#18181B', ground: 'page', theme: 'light' }), null)
  assert.equal(groundContrastNote({ ink: '#F4F4F5', ground: 'page', theme: 'dark' }), null)
  assert.equal(groundContrastNote({ ink: '#000000', ground: 'checker', theme: 'dark' }), null)
})

test('the stage class comes from the ground state, never from the colour', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.doesNotMatch(jsx, /stageIsLight|onThemeGround|icust-stage--theme/)
  assert.match(jsx, /className=\{`icust-stage icust-stage--\$\{ground\}/)
})

test('no stage ground paints a gradient', () => {
  const sheets = ['src/styles/global.css', 'src/styles/deferred/library.css', 'src/styles/pages/icon-emoji-library.css']
  for (const f of sheets) {
    const css = stripCss(read(f))
    for (const m of css.matchAll(/([^{}]*\.icust-stage(?:--[a-z]+)?\s*(?:,[^{}]*)?)\{([^{}]*)\}/g)) {
      assert.doesNotMatch(m[2], /gradient\(/, `${f}: ${m[1].trim()} paints a gradient`)
    }
  }
})

test('the colour row is one radiogroup of four chips, with no pill track and no Default button', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /role="radiogroup" aria-labelledby="icust-colour-label"/)
  // Text colour, Black and White are written out; Custom is the colour picker's trigger as a radio.
  assert.match(jsx, /isDuotone \? 'Original' : 'Text colour'/)
  assert.match(jsx, /\['black', 'Black', '#000000'\], \['white', 'White', '#ffffff'\]/)
  assert.match(jsx, /triggerProps=\{\{ role: 'radio', 'aria-checked': choice === 'custom'/)
  assert.doesNotMatch(jsx, />Default<\/button>/)
})

test('choosing Text colour clears the colour, so the serializer writes none', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /onClick=\{\(\) => \{ setColor\(''\); markDirty\(\) \}\}/)
  // the serializer only touches colour when one is given
  assert.match(jsx, /if \(color\) \{\s*svg\.setAttribute\('color', color\)/)
})
