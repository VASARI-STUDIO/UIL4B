import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GROUNDS, normaliseGround, groundContrastNote, groundHex, colourChoice } from '../../src/utils/iconColourRow.js'
import { contrastRatio } from '../../src/utils/colors.js'
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

// The sheet with comments and line breaks removed, so a rule reads as one line.
const flatCss = (p) => stripCss(read(p)).replace(/\s+/g, ' ')
const ICON_CSS = 'src/styles/pages/icon-emoji-library.css'

test('the matching fixed ground is a clear step from the page ground, in both themes', () => {
  const page = { light: groundHex('page', 'light'), dark: groundHex('page', 'dark') }
  assert.ok(contrastRatio(groundHex('light', 'light'), page.light) >= 1.2, 'Light is too close to the light page')
  assert.ok(contrastRatio(groundHex('dark', 'dark'), page.dark) >= 1.2, 'Dark is too close to the dark page')
  // the page hexes the note measures are the theme's own --bg-0
  const globalCss = flatCss('src/styles/global.css')
  assert.match(globalCss, new RegExp(`\\[data-theme="dark"\\] ?\\{ ?--bg-0: ?${page.dark}`, 'i'))
  assert.match(globalCss, new RegExp(`\\[data-theme="light"\\] ?\\{ ?--bg-0: ?${page.light}`, 'i'))
})

test('the ground hexes in the note, the stage and the swatches are the same', () => {
  const stage = flatCss('src/styles/deferred/library.css')
  const swatches = flatCss(ICON_CSS)
  for (const g of ['light', 'dark']) {
    const hex = groundHex(g, 'light')
    assert.match(stage, new RegExp(`\\.icust-stage--${g} ?\\{ ?background: ?${hex}`, 'i'), `${g} stage`)
    assert.match(swatches, new RegExp(`\\.icust-ground-sw--${g} ?\\{ ?background: ?${hex}`, 'i'), `${g} swatch`)
  }
})

test('the Page swatch is half ink and half the page ground, in flat colour', () => {
  const css = flatCss(ICON_CSS)
  assert.match(css, /\.icust-ground-sw--page ?\{ ?background: ?var\(--t0\) ?\}/)
  assert.match(css, /\.icust-ground-sw--page::before ?\{[^}]*inset: ?0 0 0 50%[^}]*background: ?var\(--bg-0\)/)
  for (const rule of css.match(/\.icust-ground-sw--page[^{]*\{[^}]*\}/g)) assert.doesNotMatch(rule, /gradient\(/)
})

test('the note and the help line hold their lines, so a choice never moves the controls', () => {
  const css = flatCss(ICON_CSS)
  assert.match(css.match(/\.iel-page \.icust-ground-note ?\{[^}]*\}/)[0], /min-height: ?calc\(8px \+ 1em \* 1\.4\)/)
  assert.match(css, /@media ?\(max-width: ?560px\) ?\{ ?\.iel-page \.icust-ground-note ?\{[^}]*min-height: ?calc\(8px \+ 2em \* 1\.4\)/)
  // two lines at every width: no narrower override for the help line
  assert.match(css.match(/\.iel-page \.icust-colour-help ?\{[^}]*\}/)[0], /min-height: ?calc\(2em \* 1\.4\)/)
  assert.doesNotMatch(css, /@media[^{]*\{ ?\.iel-page \.icust-colour-help ?\{/)
})

test('on a touch screen each ground swatch has a 44 by 44 hit area and a 16px gap', () => {
  const css = flatCss(ICON_CSS)
  const at = css.indexOf('@media(pointer:coarse){ .iel-page .icust-ground{')
  assert.ok(at >= 0, 'the coarse-pointer ground block is missing')
  const block = css.slice(at)
  const coarse = block.slice(0, block.indexOf('@media(max-width:560px)'))
  assert.match(coarse, /\.icust-ground ?\{ ?gap: ?16px ?\}/)
  assert.match(coarse, /\.icust-ground-sw ?\{ ?width: ?28px; ?height: ?28px ?\}/)
  assert.match(coarse, /\.icust-ground-sw::after ?\{[^}]*inset: ?-8px ?\}/)
})

test('the Custom radio claims no popup, and the note names a custom colour', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /'aria-haspopup': undefined, 'data-opens-popup': ''/)
  assert.match(jsx, /next\.hasAttribute\('data-opens-popup'\)/)
  assert.match(jsx, /custom: \(color \|\| ''\)\.toUpperCase\(\)/)
  assert.match(jsx, /The file keeps this colour wherever you use it\./)
})
