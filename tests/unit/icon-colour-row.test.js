import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { colourRowState } from '../../src/utils/iconColourRow.js'
import { stripCss, stripJs } from '../helpers/strip-comments.js'

const MULTI = '<svg><path fill="#123456"/><path fill="#abcdef"/></svg>'
const GRADIENT = '<svg><defs><linearGradient id="a"/></defs><path fill="url(#a)"/></svg>'
const SINGLE = '<svg><path fill="#161614"/></svg>'
const BRAND = '<svg><path fill="#E60012"/><path fill="#E60012"/></svg>'
// The grid's near-black limit (INK_DARK_MAX in IconLibrary.jsx, pinned by the glyph-ink test).
const INK_DARK_MAX = 0.05
const rowOf = (svg, extra) => colourRowState({ inColouredPack: true, svg, inkDarkMax: INK_DARK_MAX, ...extra })

test('a one-colour brand logo keeps its colour and offers it as the original', () => {
  assert.deepEqual(rowOf(BRAND), { coloured: true, row: 'brand', paint: '#e60012' })
  assert.deepEqual(rowOf('<svg><path stroke="#1da1f2"/></svg>'), { coloured: true, row: 'brand', paint: '#1da1f2' })
})

test('choosing a colour recolours a brand logo but keeps the Original choice in the row', () => {
  assert.deepEqual(rowOf(BRAND, { colourChosen: true }), { coloured: false, row: 'brand', paint: '#e60012' })
  assert.deepEqual(rowOf(BRAND, { colourChosen: false }), { coloured: true, row: 'brand', paint: '#e60012' })
})

test('a chosen colour does not change what other art reads as', () => {
  assert.deepEqual(rowOf(MULTI, { colourChosen: true }), { coloured: true, row: 'original' })
  assert.deepEqual(rowOf(SINGLE, { colourChosen: true }), { coloured: false, row: 'choose' })
  assert.deepEqual(rowOf(null, { colourChosen: true }), { coloured: true, row: 'wait' })
})

test('a white one-colour logo is a brand colour, not theme ink', () => {
  assert.deepEqual(rowOf('<svg><path fill="#fff"/></svg>'), { coloured: true, row: 'brand', paint: '#ffffff' })
})

test('the brand rule stops at the grid\'s near-black limit', () => {
  assert.equal(rowOf('<svg><path fill="#3f3f3f"/></svg>').row, 'choose')
  assert.equal(rowOf('<svg><path fill="#404040"/></svg>').row, 'brand')
  // Shapes that set no paint are black, so they are near-black art.
  assert.equal(rowOf('<svg><path d="M0 0h8v8z"/></svg>').row, 'choose')
})

test('the limit comes from the caller, so the row and the grid cannot disagree', () => {
  assert.equal(colourRowState({ inColouredPack: true, svg: '<svg><path fill="#404040"/></svg>', inkDarkMax: 0.1 }).row, 'choose')
})

test('a brand colour beside another paint is multi-colour art, not a brand row', () => {
  assert.deepEqual(rowOf('<svg><path fill="#e60012"/><path fill="#161614"/></svg>'), { coloured: true, row: 'original' })
})

test('art whose colour cannot be read from its attributes is not a brand row', () => {
  assert.equal(rowOf('<svg><style>path{fill:#e60012}</style><path/></svg>').row, 'choose')
  assert.equal(rowOf('<svg fill="currentColor"><path/></svg>').row, 'choose')
})

test('only a coloured pack gets a brand row', () => {
  assert.deepEqual(colourRowState({ inColouredPack: false, svg: BRAND, inkDarkMax: INK_DARK_MAX }), { coloured: false, row: 'choose' })
})

test('a brand logo goes from waiting straight to the brand row, never through "original"', () => {
  assert.deepEqual([null, BRAND].map((svg) => rowOf(svg).row), ['wait', 'brand'])
})

test('the customiser hands the row the grid\'s limit and draws the Original chip with the brand swatch', () => {
  const jsx = stripJs(readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8'))
  assert.match(jsx, /colourRowState\(\{[^}]*inkDarkMax: INK_DARK_MAX/)
  assert.match(jsx, /style=\{\{ background: brandPaint \}\}/)
})

test('a one-colour logo in a coloured pack gets the colour choice', () => {
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: SINGLE, inkDarkMax: INK_DARK_MAX }), { coloured: false, row: 'choose' })
})

test('multi-colour and gradient art read "Original colours"', () => {
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: MULTI }), { coloured: true, row: 'original' })
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: GRADIENT }), { coloured: true, row: 'original' })
})

test('an icon outside the coloured packs always gets the choice, whatever its markup', () => {
  for (const svg of [SINGLE, MULTI, '']) {
    assert.deepEqual(colourRowState({ inColouredPack: false, svg }), { coloured: false, row: 'choose' })
  }
})

test('before the markup arrives the row waits: no Default, no "Original colours"', () => {
  // github-icon is one colour, so it must not show the coloured-art row on a slow load.
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: null }), { coloured: true, row: 'wait' })
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: '' }), { coloured: true, row: 'wait' })
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: undefined }), { coloured: true, row: 'wait' })
})

test('a one-colour logo goes from waiting straight to the choice, never through "original"', () => {
  const rows = [null, SINGLE].map((svg) => colourRowState({ inColouredPack: true, svg, inkDarkMax: INK_DARK_MAX }).row)
  assert.deepEqual(rows, ['wait', 'choose'])
})

test('a failed load stops waiting', () => {
  assert.equal(colourRowState({ inColouredPack: true, svg: null, failed: true }).row, 'original')
})

test('an icon outside the coloured packs never waits', () => {
  assert.equal(colourRowState({ inColouredPack: false, svg: null }).row, 'choose')
})

test('the waiting row hides its control but keeps its height and its label', () => {
  const jsx = stripJs(readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8'))
  assert.match(jsx, /icust-row\$\{colourRow === 'wait' \? ' icust-row--wait' : ''\}/)
  const css = stripCss(readFileSync(new URL('../../src/styles/deferred/library.css', import.meta.url), 'utf8'))
  assert.match(css, /\.icust-row--wait\s*>\s*:not\(label\)\s*\{\s*visibility:\s*hidden\s*\}/)
  assert.doesNotMatch(css, /\.icust-row--wait\s*\{/)
})

test('the "Original colours" text is a plain value, never a Default pill', () => {
  const jsx = stripJs(readFileSync(new URL('../../src/pages/IconLibrary.jsx', import.meta.url), 'utf8'))
  assert.match(jsx, /colourRow === 'original' \? \(\s*<span className="icust-value">Original colours<\/span>/)
  assert.doesNotMatch(jsx, /icust-seg-static/)
  assert.doesNotMatch(jsx, /icust-note/)
})

test('a caller that leaves the limit out reads art as the grid does', () => {
  // The limit itself is pinned to IconLibrary.jsx by the glyph-ink test. Near-black stays ink
  // and brand colours stay brand colours with no limit passed.
  assert.equal(colourRowState({ inColouredPack: true, svg: SINGLE }).row, 'choose')
  assert.equal(colourRowState({ inColouredPack: true, svg: '<svg><path fill="#3f3f3f"/></svg>' }).row, 'choose')
  assert.deepEqual(colourRowState({ inColouredPack: true, svg: BRAND }), { coloured: true, row: 'brand', paint: '#e60012' })
  assert.equal(colourRowState({ inColouredPack: true, svg: '<svg><path fill="#404040"/></svg>' }).row, 'brand')
})

test('near-black written as rgb(), hsl() or a hex with alpha is ink, like the plain hex', () => {
  for (const paint of ['rgb(22, 22, 20)', 'rgb(22 22 20)', 'rgba(0,0,0,0.5)', 'hsl(0, 0%, 10%)', 'hsl(0 0% 0%)',
    '#161614ff', '#16161480', '#000f', '#000a']) {
    assert.equal(rowOf(`<svg><path fill="${paint}"/></svg>`).row, 'choose', paint)
  }
  assert.equal(rowOf('<svg><path style="fill:rgb(0, 0, 0)"/></svg>').row, 'choose')
})

test('a brand colour written as rgb(), hsl() or a hex with alpha is still a brand row', () => {
  for (const paint of ['rgb(230, 0, 18)', 'hsl(355, 100%, 45%)', '#e60012ff', '#e00f', 'rgb(255 255 255)']) {
    assert.equal(rowOf(`<svg><path fill="${paint}"/></svg>`).row, 'brand', paint)
  }
})

test('a paint that cannot be read keeps its treatment', () => {
  assert.equal(rowOf('<svg><path fill="url(#a)"/></svg>').row, 'original')
  assert.equal(rowOf('<svg fill="currentColor"><path/></svg>').row, 'choose')
  // A name or an out-of-range value is not read, so it counts as a brand colour as before.
  assert.equal(rowOf('<svg><path fill="none" stroke="rebeccapurple"/></svg>').row, 'brand')
  assert.equal(rowOf('<svg><path fill="rgb(300, 0, 0)"/></svg>').row, 'brand')
})
