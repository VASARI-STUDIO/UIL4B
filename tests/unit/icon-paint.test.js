import test from 'node:test'
import assert from 'node:assert/strict'
import { isMulticolourSvg, monochromeSvg } from '../../src/utils/iconPaint.js'

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
