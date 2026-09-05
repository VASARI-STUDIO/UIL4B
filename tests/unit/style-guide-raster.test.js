// The style guide as an image.
//
// The layout is a pure function returning draw operations precisely so it can
// be checked here — canvas only appears in drawOps/renderStyleGuideImage. What
// matters about a document like this is that it never lies and never spills off
// the page, and both are arithmetic.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { buildStyleGuideLayout, A4, MARGIN } from '../../src/utils/styleGuideRaster.js'
import { contrast, typeLadder, readDesign } from '../../src/utils/styleGuideExport.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

const DESIGN = {
  name: 'Acme',
  palette: { base: '#2563EB', colors: ['#2563EB', '#1E40AF', '#93C5FD', '#F8FAFC', '#0F172A', '#64748B'] },
  fonts: { heading: { family: 'Outfit', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5, headingWeight: 700 },
}

const layout = (design = DESIGN, opts = {}) =>
  buildStyleGuideLayout(design, { projectName: 'Acme', date: new Date(2026, 7, 12), ...opts })

const texts = (ops) => ops.filter((o) => o.op === 'text').map((o) => o.text)

// ── Nothing leaves the page ─────────────────────────────────────────────────

test('every drawn element stays inside the A4 sheet', () => {
  for (const o of layout()) {
    if (o.op === 'rect' || o.op === 'strokeRect') {
      assert.ok(o.x >= 0 && o.y >= 0, `rect starts off-page at ${o.x},${o.y}`)
      assert.ok(o.x + o.w <= A4.width + 0.5, `rect runs past the right edge: ${o.x + o.w}`)
      assert.ok(o.y + o.h <= A4.height + 0.5, `rect runs past the bottom: ${o.y + o.h}`)
    }
    if (o.op === 'text') {
      assert.ok(o.y <= A4.height, `text "${o.text}" is drawn below the page at y=${o.y}`)
      assert.ok(o.x >= 0 && o.x <= A4.width, `text "${o.text}" is drawn off-page at x=${o.x}`)
    }
    if (o.op === 'line') {
      assert.ok(o.x1 >= 0 && o.x2 <= A4.width, 'a rule runs past the page edge')
      assert.ok(o.y1 <= A4.height, 'a rule is drawn below the page')
    }
  }
})

test('an aggressive type scale is truncated rather than allowed to overflow', () => {
  // A 1.8 ratio makes Display enormous. The sheet must drop rows it cannot fit
  // rather than draw them past the bottom edge.
  const ops = layout({ ...DESIGN, typeScale: { base: 24, ratio: 1.8, lineHeight: 1.5 } })
  for (const o of ops.filter((x) => x.op === 'text')) {
    assert.ok(o.y <= A4.height, `"${o.text}" spilled off the sheet at y=${o.y}`)
  }
})

test('a huge palette is capped, and the row it draws fills the width exactly', () => {
  const many = Array.from({ length: 40 }, (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`)
  const ops = layout({ ...DESIGN, palette: { base: '#2563EB', colors: many } })
  const swatches = ops.filter((o) => o.op === 'rect' && o.radius === 8)
  assert.ok(swatches.length <= 12, `drew ${swatches.length} swatches; the sheet caps at 12`)

  // The right-most swatch in the first row must land on the right margin. A
  // trailing gap reads as a mistake in a document whose job is looking
  // considered.
  const firstRowY = swatches[0].y
  const row = swatches.filter((s) => s.y === firstRowY)
  const rightEdge = Math.max(...row.map((s) => s.x + s.w))
  assert.ok(Math.abs(rightEdge - (A4.width - MARGIN)) < 0.5,
    `the swatch row ends at ${rightEdge}, not the ${A4.width - MARGIN} margin`)
})

// ── It tells the truth ──────────────────────────────────────────────────────

test('the sizes printed are the real computed sizes, even where the drawing is capped', () => {
  // Display is drawn at a capped 40px so it fits, but the LABEL must still
  // state the true size — otherwise the document is a lie about the system it
  // is documenting.
  const d = readDesign({ ...DESIGN, typeScale: { base: 24, ratio: 1.8, lineHeight: 1.5 } })
  const real = typeLadder(d)
  const drawn = texts(layout({ ...DESIGN, typeScale: { base: 24, ratio: 1.8, lineHeight: 1.5 } }))
  const display = real.find((s) => s.name === 'Display')
  const label = drawn.find((t) => /^\d+(\.\d+)?px$/.test(t) && Math.abs(parseFloat(t) - display.px) < 0.01)
  assert.ok(label, `the true Display size ${display.px}px is not printed anywhere`)
  assert.ok(display.px > 40, 'this case is only meaningful if the true size exceeds the drawn cap')
})

test('every swatch prints its hex and a real contrast figure', () => {
  const drawn = texts(layout())
  for (const hex of DESIGN.palette.colors) {
    assert.ok(drawn.includes(hex.toUpperCase()), `${hex} is missing its label`)
    const expected = Math.round(contrast(hex, '#FFFFFF') * 100) / 100
    assert.ok(drawn.some((t) => t.startsWith(`${expected}:1 on white`)),
      `${hex} does not print its measured ${expected}:1 contrast`)
  }
})

test('the hex on a swatch is drawn in an ink that can actually be read on it', () => {
  const ops = layout()
  const swatches = ops.filter((o) => o.op === 'rect' && o.radius === 8)
  for (const s of swatches) {
    const label = ops.find((o) => o.op === 'text' && o.text === s.fill.toUpperCase())
    assert.ok(label, `${s.fill} has no hex label`)
    assert.ok(contrast(label.fill, s.fill) >= 4.5,
      `the ${s.fill} label is drawn in ${label.fill}, only ${contrast(label.fill, s.fill).toFixed(2)}:1`)
  }
})

test('a near-white swatch gets an outline so it is visible on white paper', () => {
  const ops = layout({ ...DESIGN, palette: { base: '#FFFFFF', colors: ['#FFFFFF', '#FEFEFE'] } })
  const outlines = ops.filter((o) => o.op === 'strokeRect')
  assert.equal(outlines.length, 2, 'both near-white swatches need an edge')
})

test('a dark swatch is NOT outlined — the border is for invisibility, not decoration', () => {
  const ops = layout({ ...DESIGN, palette: { base: '#0F172A', colors: ['#0F172A'] } })
  assert.equal(ops.filter((o) => o.op === 'strokeRect').length, 0)
})

test('the project name and the fonts it actually uses are on the sheet', () => {
  const drawn = texts(layout(DESIGN, { projectName: 'Acme Rebrand' }))
  assert.ok(drawn.includes('Acme Rebrand'))
  assert.ok(drawn.some((t) => t.includes('Outfit') && t.includes('Inter')),
    'the masthead must name both families')
})

test('the type specimens are set in the system\'s own fonts', () => {
  const ops = layout()
  const specimens = ops.filter((o) => o.op === 'text' && o.text === 'The quick brown fox')
  assert.ok(specimens.length > 0)
  // Headings in the heading family, body steps in the body family.
  assert.ok(specimens.some((o) => o.font.includes('Outfit')), 'heading steps must use the heading family')
  assert.ok(specimens.some((o) => o.font.includes('Inter')), 'body steps must use the body family')
})

// ── Watermark policy ────────────────────────────────────────────────────────

test('a free export carries the credit and a Pro export does not', () => {
  assert.ok(texts(layout(DESIGN, { watermark: true })).some((t) => /uil4b\.com/.test(t)))
  assert.ok(!texts(layout(DESIGN, { watermark: false })).some((t) => /uil4b\.com/.test(t)))
})

// ── Degenerate input ────────────────────────────────────────────────────────

test('an empty design produces a valid sheet that says what is missing', () => {
  const ops = buildStyleGuideLayout(null, { projectName: 'Untitled' })
  assert.ok(ops.length > 0, 'an empty design must still render a sheet')
  assert.ok(texts(ops).includes('No palette saved yet.'),
    'an empty palette must be stated, not left as a blank gap')
  for (const o of ops.filter((x) => x.op === 'text')) {
    assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), `${o.text} has a non-finite position`)
  }
})

test('malformed colours never reach the canvas', () => {
  // readDesign filters to real hexes; this guards the whole path rather than
  // trusting that it always will.
  const ops = buildStyleGuideLayout(
    { palette: { colors: ['#2563EB', 'not-a-colour', null, 42, '#GGGGGG'] } },
    { projectName: 'X' },
  )
  for (const o of ops.filter((x) => x.op === 'rect' && x.radius === 8)) {
    assert.match(o.fill, /^#[0-9A-F]{6}$/, `${o.fill} is not a usable colour`)
  }
})

test('the sheet is deterministic — the same design draws the same pixels', () => {
  const date = new Date(2026, 7, 12)
  assert.deepEqual(
    buildStyleGuideLayout(DESIGN, { projectName: 'Acme', date }),
    buildStyleGuideLayout(DESIGN, { projectName: 'Acme', date }),
  )
})

// ── Wiring ──────────────────────────────────────────────────────────────────

test('the export panel offers the raster formats and loads them on demand', () => {
  // The format table moved out of ExportPanel.jsx into src/config/exportFormats.js
  // on 2026-09-05 so /plans could read the same array it renders from, rather
  // than describing the export offer in prose. The offer is therefore asserted
  // against the table, and the code-splitting against the panel that consumes
  // it — which also makes "is PNG live?" a question about a value rather than
  // about the 200 characters that happen to follow a string match.
  const formats = read('src/config/exportFormats.js')
  assert.ok(/id: 'png'/.test(formats) && /id: 'jpeg'/.test(formats),
    'both raster formats must be offered')

  const png = EXPORT_FORMATS.find((f) => f.id === 'png')
  const jpeg = EXPORT_FORMATS.find((f) => f.id === 'jpeg')
  assert.equal(png?.live, true, 'PNG must be marked live, not "Soon"')
  assert.equal(jpeg?.live, true, 'JPEG must be marked live, not "Soon"')
  assert.ok(!png.pro && !jpeg.pro, 'the raster style guides are free-tier formats')

  const panel = read('src/components/ExportPanel.jsx')
  assert.ok(/await import\('\.\.\/utils\/styleGuideRaster'\)/.test(panel),
    'the raster path must be code-split so an HTML export does not pay for it')
  assert.ok(/const FORMATS = EXPORT_FORMATS/.test(panel),
    'the panel must render the shared table, or the assertions above describe an array nobody uses')
})

test('a failed export keeps the panel open and explains itself', () => {
  // Closing on failure leaves the user with no file and no explanation, which
  // reads as the button doing nothing at all.
  const src = read('src/components/ExportPanel.jsx')
  assert.ok(/setError\(/.test(src), 'a failure must produce a message')
  assert.ok(/role="alert"/.test(src), 'that message must be announced')
})

test('JPEG paints the paper explicitly, because JPEG has no alpha', () => {
  // Without this the unpainted background encodes as black and the export is
  // a black sheet with black text.
  const src = read('src/utils/styleGuideRaster.js')
  assert.ok(/fillRect\(0, 0, A4\.width, A4\.height\)/.test(src),
    'the canvas must be painted before drawing')
})
