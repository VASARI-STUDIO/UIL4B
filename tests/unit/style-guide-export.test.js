// The premium style-guide export.
//
// This is a paid deliverable, so the bar is not "it produced a file" — it is
// that the file is correct, self-contained, and honest about what it measured.
// A style guide that states a wrong contrast ratio is worse than none: someone
// will ship against it.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStyleGuideHtml, buildStyleGuideMarkdown, contrast, grade, inkFor, readDesign, typeLadder,
} from '../../src/utils/styleGuideExport.js'

const DESIGN = {
  palette: { base: '#0051FF', colors: ['#0051FF', '#4C8DFF', '#A9C7FF', '#0B1B3A'] },
  fonts: { heading: { family: 'Inter', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5 },
}
const AT = new Date('2026-08-12T00:00:00Z')

test('contrast matches the WCAG reference values', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21)
  assert.equal(contrast('#FFFFFF', '#000000'), 21, 'the ratio is symmetric')
  assert.equal(contrast('#777777', '#777777'), 1)
  // The canonical 4.5:1 boundary colour on white.
  assert.ok(Math.abs(contrast('#767676', '#FFFFFF') - 4.54) < 0.05)
})

test('grades follow WCAG 1.4.3 boundaries exactly', () => {
  assert.equal(grade(21), 'AAA')
  assert.equal(grade(7), 'AAA')
  assert.equal(grade(6.99), 'AA')
  assert.equal(grade(4.5), 'AA')
  assert.equal(grade(4.49), 'AA Large')
  assert.equal(grade(3), 'AA Large')
  assert.equal(grade(2.99), 'Fail')
})

test('the recommended ink is always the higher-contrast of the two', () => {
  for (const hex of ['#0051FF', '#FFFFFF', '#000000', '#A9C7FF', '#0B1B3A', '#808080']) {
    const { ink, ratio } = inkFor(hex)
    const other = ink === '#000000' ? '#FFFFFF' : '#000000'
    assert.ok(ratio >= contrast(hex, other), `${hex}: picked the worse ink`)
    assert.equal(ratio, contrast(hex, ink), `${hex}: the stated ratio must be the one measured`)
  }
})

test('a half-written design produces a shorter guide, never a broken one', () => {
  // Saved designs come from many tool versions. None of these may throw, and
  // none may put "undefined" or "NaN" in front of a paying user.
  const cases = [undefined, null, {}, { palette: {} },
    { palette: { colors: ['nope', 42, null] } },
    { typeScale: { base: 0, ratio: 0 } }, { fonts: {} }]
  for (const bad of cases) {
    for (const [label, doc] of [
      ['html', buildStyleGuideHtml(bad, { date: AT })],
      ['markdown', buildStyleGuideMarkdown(bad, { date: AT })],
    ]) {
      assert.ok(doc.length > 200, `${label}: produced nothing`)
      assert.ok(!/undefined|NaN|\[object Object\]/.test(doc), `${label}: leaked a broken value`)
    }
  }
})

test('invalid colours are dropped rather than rendered', () => {
  const html = buildStyleGuideHtml({ palette: { colors: ['#0051FF', 'red', '#GGGGGG', '#4C8DFF'] } }, { date: AT })
  assert.ok(html.includes('#0051FF') && html.includes('#4C8DFF'))
  assert.ok(!html.includes('#GGGGGG'), 'a malformed hex must never reach the document')
})

test('the document is self-contained — no scripts, no images, no external CSS', () => {
  const html = buildStyleGuideHtml(DESIGN, { date: AT })
  assert.ok(!/<script/i.test(html), 'a handed-off document must not carry script')
  assert.ok(!/<img/i.test(html), 'no image requests — the swatches are CSS')
  // The ONE permitted external reference is the user's own font families.
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"/g)) {
    assert.ok(/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(m[1]),
      `unexpected external reference: ${m[1]}`)
  }
})

test('it is print-ready — A4 pages that break in the right places', () => {
  const html = buildStyleGuideHtml(DESIGN, { date: AT })
  assert.ok(html.includes('@page'), 'no print page rules')
  assert.ok(html.includes('size:A4'))
  assert.ok(html.includes('page-break-after:always'))
  assert.ok(html.includes('297mm'), 'pages are not A4-height')
  assert.equal((html.match(/class="page/g) || []).length, 4)
})

test('THE ONE THAT MATTERS: every stated ratio is the ratio actually measured', () => {
  // The whole value of this artefact is that its numbers are checkable, so this
  // recomputes each one from the hex printed beside it.
  const html = buildStyleGuideHtml(DESIGN, { date: AT })
  const rows = [...html.matchAll(/(#[0-9A-F]{6}) on white<\/th><td class="num">([\d.]+):1<\/td><td>([A-Za-z ]+)</g)]
  assert.ok(rows.length >= 4, `expected the evidence table to list the palette, got ${rows.length}`)
  for (const [, hex, stated, statedGrade] of rows) {
    const real = contrast(hex, '#FFFFFF')
    assert.equal(+stated, real, `${hex}: document says ${stated}:1, actual is ${real}:1`)
    assert.equal(statedGrade.trim(), grade(real), `${hex}: wrong grade for ${real}:1`)
  }
})

test('the type ladder is the modular scale it claims to be', () => {
  const ladder = typeLadder(readDesign(DESIGN))
  assert.equal(ladder.find(s => s.name === 'Body').px, 16)
  for (const step of ladder) {
    assert.equal(step.px, Math.round(16 * Math.pow(1.25, step.exp) * 10) / 10, `${step.name} is off the scale`)
  }
  for (let i = 1; i < ladder.length; i++) {
    assert.ok(ladder[i].px < ladder[i - 1].px, `${ladder[i].name} is not smaller than ${ladder[i - 1].name}`)
  }
})

test('HTML and Markdown describe the SAME system, not two systems', () => {
  const html = buildStyleGuideHtml(DESIGN, { projectName: 'Acme', date: AT })
  const md = buildStyleGuideMarkdown(DESIGN, { projectName: 'Acme', date: AT })
  for (const hex of DESIGN.palette.colors) {
    assert.ok(html.includes(hex), `html is missing ${hex}`)
    assert.ok(md.includes(hex), `markdown is missing ${hex}`)
  }
  for (const step of typeLadder(readDesign(DESIGN))) {
    assert.ok(md.includes(`${step.px}px`), `markdown is missing the ${step.name} size`)
  }
  assert.ok(html.includes('Acme') && md.includes('Acme'))
})

test('the free watermark is visible, and Pro removes it', () => {
  const free = buildStyleGuideHtml(DESIGN, { watermark: true, date: AT })
  const pro = buildStyleGuideHtml(DESIGN, { watermark: false, date: AT })
  // In the page footer, not a comment — a watermark you cannot see is not one.
  assert.ok(free.includes('Made with UIL4B'))
  assert.ok(!pro.includes('Made with UIL4B'), 'Pro must export clean')
  assert.ok(buildStyleGuideMarkdown(DESIGN, { watermark: true, date: AT }).includes('Made with [UIL4B]'))
  assert.ok(!buildStyleGuideMarkdown(DESIGN, { watermark: false, date: AT }).includes('Made with'))
})

test('a project name cannot break out of the document', () => {
  const html = buildStyleGuideHtml(DESIGN, { projectName: '</title><script>alert(1)</script>', date: AT })
  assert.ok(!/<script>alert/.test(html), 'the name was not escaped')
  assert.ok(html.includes('&lt;script&gt;'))
})
