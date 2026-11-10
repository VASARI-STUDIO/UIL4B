import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GROUNDS, normaliseGround, groundContrastNote, groundHex, groundVars, checkerUri, colourChoice } from '../../src/utils/iconColourRow.js'
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
  assert.equal(groundContrastNote({ ink: '#000000', ground: 'checker', theme: 'light' }), null)
  assert.equal(groundContrastNote({ ink: '#F4F4F5', ground: 'checker', theme: 'dark' }), null)
  // the dark checker is dark: black on it is hard to see, and Light is what reads
  assert.deepEqual(groundContrastNote({ ink: '#000000', ground: 'checker', theme: 'dark' }), { suggest: 'light' })
})

test('the stage class comes from the ground state, never from the colour', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.doesNotMatch(jsx, /stageIsLight|onThemeGround|ied-ground--theme|icust-stage--theme/)
  assert.match(jsx, /className=\{`ied-ground ied-ground--\$\{ground\}/)
  // and the stage is the element the --ig-* variables are written on
  assert.match(jsx, /ref=\{stageRef\}>/)
})

test('no stage ground or ground swatch paints a gradient', () => {
  const css = stripCss(read('src/styles/pages/icon-editor.css'))
  let seen = 0
  for (const m of css.matchAll(/([^{}]*\.ied-(?:ground(?:--[a-z]+)?|gnd-[a-z]+)\s*(?:,[^{}]*)?)\{([^{}]*)\}/g)) {
    seen++
    assert.doesNotMatch(m[2], /gradient\(/, `icon-editor.css: ${m[1].trim()} paints a gradient`)
  }
  assert.ok(seen >= 8, `only ${seen} ground rules were read; renamed? update the pattern, do not let this go vacuous`)
})

test('the colour row is one radiogroup of four chips, with no pill track', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /role="radiogroup" aria-labelledby="ied-colour-label"/)
  // Default, Black and White are written out; Custom is the colour picker's trigger as a radio.
  // A duotone or brand-coloured icon's first chip reads Original instead of Default.
  assert.match(jsx, /isDuotone \|\| brandPaint \? 'Original' : 'Default'/)
  assert.doesNotMatch(jsx, /Text colour<\/span>/)
  assert.match(jsx, /\['black', 'Black', '#000000'\], \['white', 'White', '#ffffff'\]/)
  assert.match(jsx, /triggerProps=\{\{ role: 'radio', 'aria-checked': choice === 'custom'/)
  assert.doesNotMatch(jsx, />Default<\/button>/)
})

test('choosing Default clears the colour, so the serializer writes none', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /onClick=\{\(\) => \{ setColor\(''\); markDirty\(\) \}\}/)
  // the serializer only touches colour when one is given
  assert.match(jsx, /if \(color\) \{\s*svg\.setAttribute\('color', color\)/)
})

// The sheet with comments and line breaks removed, so a rule reads as one line.
const flatCss = (p) => stripCss(read(p)).replace(/\s+/g, ' ')
const ICON_CSS = 'src/styles/pages/icon-editor.css'
// The custom properties the editor declares per theme: the dark set is the first .ied-overlay block,
// the light set the [data-theme="light"] one.
const themeVars = (theme) => {
  const css = flatCss(ICON_CSS)
  const head = theme === 'light' ? '[data-theme="light"] .ied-overlay{' : '.ied-overlay{'
  const at = css.indexOf(head)
  assert.ok(at >= 0, `${theme} variable block is missing`)
  const body = css.slice(at + head.length, css.indexOf('}', at))
  return Object.fromEntries([...body.matchAll(/(--ied-[a-z0-9-]+) ?: ?([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}
// A var(--bg-2,#F6F5F1) is read as its fallback; the app's own token is that colour.
const hexOf = (v) => (v.match(/#[0-9a-f]{6}/i) || [])[0]

test('the ground hexes the contrast note measures are the ones the stage paints, in both themes', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  // The Light and Dark plates are written on the dialog root from the table the note measures,
  // so there is no second copy in the stylesheet to drift.
  assert.match(jsx, /className="ied-overlay" style=\{groundVars\(theme\)\}/)
  assert.match(jsx, /proofGround\(ground, theme\)/)
  for (const theme of ['light', 'dark']) {
    const vars = themeVars(theme)
    assert.equal(vars['--ied-g-light'], undefined, `${theme}: Light plate is declared in the stylesheet as well`)
    assert.equal(vars['--ied-g-dark'], undefined, `${theme}: Dark plate is declared in the stylesheet as well`)
    assert.deepEqual(groundVars(theme), { '--ied-g-light': groundHex('light', theme), '--ied-g-dark': groundHex('dark', theme) })
    // Page is the stage's own colour. The light stage is the app's --bg-2.
    assert.equal(hexOf(vars['--ied-g-page'])?.toLowerCase(), groundHex('page', theme).toLowerCase(), `page ground in the ${theme} theme`)
    assert.equal(hexOf(vars['--ied-stage'])?.toLowerCase(), groundHex('page', theme).toLowerCase(), `stage in the ${theme} theme`)
  }
})

test('the checker the stylesheet paints has the squares the note measures, in both themes', () => {
  for (const theme of ['light', 'dark']) {
    const vars = themeVars(theme)
    const uri = decodeURIComponent(vars['--ied-checker'])
    const fills = [...uri.matchAll(/fill='(#[0-9a-f]{6})'/gi)].map((m) => m[1].toLowerCase())
    const painted = [...new Set(fills)]
    const lum = (h) => contrastRatio(h, '#000000')
    const darker = painted.sort((a, b) => lum(a) - lum(b))[0]
    assert.equal(darker, groundHex('checker', theme).toLowerCase(), `${theme} checker, darker square`)
    // and the same pair in the small swatch checker and the upgrade preview
    assert.equal(decodeURIComponent(vars['--ied-checker-s']).match(/#[0-9a-f]{6}/gi).map((h) => h.toLowerCase()).filter((h, i, all) => all.indexOf(h) === i).sort().join(), painted.slice().sort().join())
    assert.ok(decodeURIComponent(checkerUri(theme, 8)).toLowerCase().includes(darker), `${theme} preview checker`)
  }
})

// Known and left as the board draws it: the plate is a quieter step from the stage than the
// old 1.2:1 guarantee (about 1.14:1 Dark on the dark stage, 1.09:1 Light on the light stage).
// Whether to widen it is a question for the pull request, so this stays a todo, not a pass or a block.
test('the matching fixed ground is a clear step from the stage it sits on, in both themes', { todo: 'the board\'s own values are a smaller step; PR question' }, () => {
  for (const theme of ['light', 'dark']) {
    const stage = groundHex('page', theme)
    for (const g of ['light', 'dark']) {
      const ratio = contrastRatio(groundHex(g, theme), stage)
      assert.ok(ratio >= 1.2, `${g} ground on the ${theme} stage is only ${ratio.toFixed(2)}:1`)
    }
  }
})

test('the stage plate and its swatch paint from the same variable, so they cannot drift', () => {
  const css = flatCss(ICON_CSS)
  for (const g of ['light', 'dark', 'page']) {
    assert.match(css, new RegExp(`\\.ied-gnd-${g} ?\\{ ?background: ?var\\(--ied-g-${g}\\)`), `${g} swatch`)
  }
  for (const g of ['light', 'dark']) {
    assert.match(css, new RegExp(`\\.ied-ground--${g} ?\\{ ?background: ?var\\(--ied-g-${g}\\)`), `${g} stage`)
  }
  // Page has no plate: the icon sits on the stage, so its swatch is the stage's colour.
  assert.match(css, /\.ied-ground--page ?\{ ?background: ?transparent/)
  for (const theme of ['light', 'dark']) {
    const vars = themeVars(theme)
    assert.equal(vars['--ied-g-page'].replace(/\s/g, ''), vars['--ied-stage'].replace(/\s/g, ''), `${theme} Page swatch is not the stage colour`)
  }
})

test('the contrast note sits over the stage and holds no room, and its live region is always in the page, so a choice never moves the controls', () => {
  const css = flatCss(ICON_CSS)
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /\{contrastNote && \(\s*<div className="ied-contrast">/)
  // The live region is mounted whether or not a note is showing, so a note that arrives is announced.
  assert.match(jsx, /<div className="ied-vh" aria-live="polite">/)
  assert.match(css.match(/\.ied-contrast ?\{[^}]*\}/)[0], /position: ?absolute/)
  for (const rule of css.match(/[^}]*\.ied-contrast[^{]*\{[^}]*\}/g)) assert.doesNotMatch(rule, /min-height/, 'the note reserves room again')
  assert.doesNotMatch(css, /--note-lines|--stage-rest/, 'a held note band is back')
})

// The swatch is 32px with a mouse. Touch gets 44 by 44 two ways: the wide dialog's coarse-pointer block,
// and the phone sheet (below 900px), which sets 44 whatever the pointer is. Each block is cut out whole,
// so a later rule elsewhere in the sheet cannot stand in for it.
// The sheet may hold several blocks under one query; the one that styles the swatch is the one cut out.
function mediaBlock(css, header) {
  let from = 0
  const found = []
  for (let at = css.indexOf(header, from); at >= 0; at = css.indexOf(header, from)) {
    let depth = 0
    let end = -1
    for (let i = css.indexOf('{', at); i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) { end = i + 1; break }
    }
    assert.ok(end > 0, `${header} block never closes`)
    found.push(css.slice(at, end))
    from = end
  }
  assert.ok(found.length > 0, `${header} block is missing`)
  return found.find((b) => b.includes('.ied-bgb')) ?? found[0]
}

for (const header of ['@media (pointer:coarse) and (min-width:900px)', '@media (max-width:899px){']) {
  test(`on a touch screen each ground swatch has a 44 by 44 hit area (${header.replace('{', '')})`, () => {
    const block = mediaBlock(flatCss(ICON_CSS), header)
    assert.match(block, /\.ied-bgb ?\{[^}]*(?:width: ?44px|min-width: ?44px)/)
    assert.match(block, /\.ied-bgb ?\{[^}]*(?:height: ?44px|min-height: ?44px)/)
  })
}

test('the Custom radio claims no popup, and the note names a custom colour', () => {
  const jsx = stripJs(read('src/pages/IconLibrary.jsx'))
  assert.match(jsx, /'aria-haspopup': undefined, 'data-opens-popup': ''/)
  assert.match(jsx, /next\.hasAttribute\('data-opens-popup'\)/)
  assert.match(jsx, /custom: \(color \|\| ''\)\.toUpperCase\(\)/)
  assert.match(jsx, /The file keeps this colour wherever you use it\./)
})
