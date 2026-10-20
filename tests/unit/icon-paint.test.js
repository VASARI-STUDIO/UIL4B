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
