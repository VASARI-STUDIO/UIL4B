import test from 'node:test'
import assert from 'node:assert/strict'
import { isMulticolourSvg, isNearBlackMono, monochromeSvg, paintLuminance, singlePaint } from '../../src/utils/iconPaint.js'

const cases = [
  ['two fills', '<svg><path fill="#123456"/><path fill="#abcdef"/></svg>', true],
  ['linear gradient', '<svg><defs><linearGradient id="a"/></defs></svg>', true],
  ['radial gradient', '<svg><radialGradient id="a"/></svg>', true],
  ['paint reference', '<svg><path fill="url(#a)"/></svg>', true],
  ['single fixed fill', '<svg><path fill="#161614"/></svg>', false],
  ['no fill', '<svg><path d="M0 0h24v24z"/></svg>', false],
  ['currentColor only', '<svg fill="currentColor"><path stroke="currentColor"/></svg>', false],
  ['equivalent hex colours', '<svg fill="#fff"><path stroke="#FFFFFF"/></svg>', false],
  ['inline style paints', '<svg><path style="fill: #123456; stroke: #abcdef"/></svg>', true],
  ['multiline inline style paints', '<svg><path style="\nfill: #123456;\nstroke: #abcdef"/></svg>', true],
  ['ignored paints', '<svg fill="none" stroke="transparent"><path style="fill: inherit; stroke: currentColor"/></svg>', false],
  ['case and whitespace', '<svg fill=" RED "><path style="fill: red !important"/></svg>', false],
  // Unpainted shapes render black, so they count as a second colour next to an explicit one.
  ['explicit colour plus unpainted path', '<svg><path d="M0 0h8v8z"/><path fill="#d97757" d="M8 8h8v8z"/></svg>', true],
  ['explicit colour plus unpainted shape in a group', '<svg><g><circle r="4"/></g><rect fill="#d97757"/></svg>', true],
  ['explicit stroke plus unpainted path', '<svg><path stroke="#d97757"/><path d="M0 0h8v8z"/></svg>', true],
  ['explicit black plus unpainted path', '<svg><path fill="#000"/><path d="M0 0h8v8z"/></svg>', false],
  ['unpainted path inherits an ancestor fill', '<svg><g fill="#d97757"><path d="M0 0h8v8z"/></g><path fill="#d97757"/></svg>', false],
  ['unpainted path under fill none', '<svg fill="none"><path d="M0 0h8v8z"/><path stroke="#d97757"/></svg>', false],
  ['unpainted shape inside defs, clipPath or mask', '<svg><defs><clipPath id="a"><path d="M0 0h8v8z"/></clipPath></defs><mask id="m"><rect/></mask><path fill="#d97757"/></svg>', false],
  ['unpainted non-shape elements', '<svg><g/><use href="#a"/><path fill="#d97757"/></svg>', false],
]

for (const [name, svg, expected] of cases) {
  test(`SVG colour detection: ${name}`, () => {
    assert.equal(isMulticolourSvg(svg), expected)
  })
}

test('single-colour artwork inherits ink in attributes and inline styles', () => {
  const svg = monochromeSvg('<svg fill="none"><path fill="#161614" style="stroke: #161614 !important; fill: transparent"/></svg>')
  assert.ok(!svg.includes('#161614'))
  assert.match(svg, /fill="currentColor"/)
  assert.match(svg, /stroke:currentColor !important/)
  assert.match(svg, /fill="none"/)
  assert.match(svg, /fill:\s*transparent/)
})

// The grid's near-black threshold is the same linear-luminance ceiling the
// glyph sampler uses for a chosen icon colour (INK_DARK_MAX in IconLibrary.jsx).
const NEAR_BLACK = 0.05
const GRADIENT_ART = '<svg><defs><linearGradient id="a"/></defs><path fill="url(#a)"/></svg>'

test('single paint: one colour, the implicit black, or nothing to name', () => {
  assert.equal(singlePaint('<svg><path fill="#161614"/></svg>'), '#161614')
  assert.equal(singlePaint('<svg><path fill="#FFF"/><path stroke="#ffffff"/></svg>'), '#ffffff')
  // Shapes with no paint of their own are black (Vercel, Apple, X).
  assert.equal(singlePaint('<svg><path d="m128 0l128 221.705H0z"/></svg>'), '#000000')
  assert.equal(singlePaint('<svg fill="none" stroke="#111"><path/></svg>'), '#111111')
  // Several paints, gradients and currentColor have no single colour.
  assert.equal(singlePaint('<svg><path fill="#161614"/><path fill="#ff0000"/></svg>'), null)
  assert.equal(singlePaint(GRADIENT_ART), null)
  assert.equal(singlePaint('<svg fill="currentColor"><path/></svg>'), null)
  assert.equal(singlePaint(''), null)
  assert.equal(singlePaint(null), null)
})

test('single paint is null when colour hides outside the attributes', () => {
  assert.equal(singlePaint('<svg><style>.a{fill:#e60000}</style><path class="a"/></svg>'), null)
  assert.equal(singlePaint('<svg><style>path{fill:#fff}</style><path fill="#000"/></svg>'), null)
  assert.equal(singlePaint('<svg><style type="text/css">.a{fill:red}</style><path class="a"/></svg>'), null)
  assert.equal(singlePaint('<svg><image href="a.png"/></svg>'), null)
  assert.equal(singlePaint('<svg><text x="0">Hi</text></svg>'), null)
  assert.equal(singlePaint('<svg><defs><path id="a" fill="#000"/></defs><use href="#a"/></svg>'), null)
  assert.equal(singlePaint('<svg><foreignObject><div/></foreignObject></svg>'), null)
  // Plain shapes, even ones whose tag starts alike, still read as before.
  assert.equal(singlePaint('<svg><path fill="#000"/></svg>'), '#000000')
})

test('luminance of plain colours', () => {
  assert.equal(paintLuminance('black'), 0)
  assert.equal(paintLuminance('white'), 1)
  assert.equal(paintLuminance('#000000'), 0)
  assert.ok(Math.abs(paintLuminance('#ffffff') - 1) < 1e-9)
  assert.equal(paintLuminance('url(#a)'), null)
  assert.equal(paintLuminance('rebeccapurple'), null)
  assert.equal(paintLuminance(null), null)
})

const mono = (hex) => `<svg><path fill="${hex}"/></svg>`

test('near-black single-colour art: the threshold sits between #3f3f3f and #404040', () => {
  assert.equal(isNearBlackMono(mono('#161614'), NEAR_BLACK), true)
  assert.equal(isNearBlackMono(mono('#000'), NEAR_BLACK), true)
  assert.equal(isNearBlackMono('<svg><path d="M0 0h8v8z"/></svg>', NEAR_BLACK), true)
  assert.equal(isNearBlackMono(mono('#3f3f3f'), NEAR_BLACK), true)
  assert.equal(isNearBlackMono(mono('#404040'), NEAR_BLACK), false)
  // Mid-greys already read on a dark page, so they keep their own colour.
  assert.equal(isNearBlackMono(mono('#666666'), NEAR_BLACK), false)
  assert.equal(isNearBlackMono(mono('#ffffff'), NEAR_BLACK), false)
})

test('a dark wordmark beside a coloured mark is not single-colour near-black', () => {
  assert.equal(isNearBlackMono('<svg><path fill="#161614"/><path fill="#d97757"/></svg>', NEAR_BLACK), false)
  assert.equal(isNearBlackMono('<svg><path fill="#161614"/><path fill="#ffffff"/></svg>', NEAR_BLACK), false)
  assert.equal(isNearBlackMono(GRADIENT_ART, NEAR_BLACK), false)
  // One explicit colour beside an unpainted (black) shape is two colours.
  assert.equal(isNearBlackMono('<svg><path d="M0 0h8v8z"/><path fill="#d97757"/></svg>', NEAR_BLACK), false)
})
