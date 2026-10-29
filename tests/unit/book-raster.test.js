// The design system book as 2K PNG pages.
//
// The page plan and the layout are pure functions of the design and a measuring
// function, so what matters about the book (every section is there, nothing runs
// off a page, the count is stable) is arithmetic and is checked here without a
// canvas. Only renderBookPng touches one. The seam is planBookPages /
// buildBookPages in src/utils/bookRaster.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  PAGE, PIXELS, SCALE, MATRIX_MAX, planBookPages, buildBookPages, balancedChunk, paginate,
  wrapText, fitLine, pageFileName, gradientLine, matrixClass, FOOT_Y, estimateWidth, darkestColour,
} from '../../src/utils/bookRaster.js'
import { contrast, inkFor } from '../../src/utils/styleGuideExport.js'
import { bookTokens } from '../../src/utils/bookTokens.js'
import { readBook } from '../../src/utils/bookModel.js'
import { EXPORT_FORMATS, assertFormatsCoherent, groupFormats, isGroupPro, proOnlyFormats } from '../../src/config/exportFormats.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

const DESIGN = {
  name: 'Acme',
  palette: { base: '#2563EB', harmony: 'analogous', colors: ['#2563EB', '#1E40AF', '#93C5FD', '#F8FAFC', '#0F172A', '#64748B'] },
  fonts: { heading: { family: 'Outfit', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5, headingWeight: 700 },
  gradient: { angle: 135, type: 'Linear', stops: [{ color: null, position: 0 }, { color: '#1E40AF', position: 100 }] },
}

const opts = { projectName: 'Acme', date: new Date(Date.UTC(2026, 9, 29)) }
const plan = (design = DESIGN, o = {}) => planBookPages(design, { ...opts, ...o }).pages
const build = (design = DESIGN, o = {}) => buildBookPages(design, { ...opts, ...o })
const texts = (page) => page.ops.filter((o) => o.op === 'text').map((o) => o.text)
const manyColours = (n) => Array.from({ length: n }, (_, i) => `#${((i * 2654435) % 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`)

// ── The page is 2K A4 ───────────────────────────────────────────────────────

test('a page is 1448 x 2048 px: A4 portrait drawn at exactly 2x', () => {
  assert.deepEqual({ ...PIXELS }, { width: 1448, height: 2048 })
  assert.equal(PAGE.width * SCALE, 1448)
  assert.equal(PAGE.height * SCALE, 2048)
  assert.ok(Math.abs(PAGE.width / PAGE.height - 210 / 297) < 0.001, 'not the A4 ratio')
})

// ── Every section appears, in order ─────────────────────────────────────────

test('every section of the book has a page, in the same order as the PDF book', () => {
  const kinds = plan().map((p) => p.kind)
  assert.deepEqual(kinds, [
    'cover', 'contents',
    // Six colours at five a page: two pages of three.
    'opening', 'palette', 'palette', 'matrix', 'gradient',
    'opening', 'families', 'scale',
    'opening', 'tokens', 'colophon',
  ])
  const sections = plan().filter((p) => p.kind === 'opening').map((p) => p.title)
  assert.deepEqual(sections, ['Colour', 'Typography', 'Tokens'])
})

test('without a palette the colour section is left out rather than drawn empty', () => {
  const kinds = plan({ ...DESIGN, palette: { colors: [] }, gradient: null }).map((p) => p.kind)
  assert.ok(!kinds.includes('palette') && !kinds.includes('matrix') && !kinds.includes('gradient'))
  assert.ok(kinds.includes('cover') && kinds.includes('families') && kinds.includes('tokens') && kinds.includes('colophon'))
})

test('every colour is on a palette page, and the contents list the real page numbers', () => {
  const book = build()
  const onPages = book.pages.filter((p) => p.kind === 'palette').flatMap((p) => p.items.map((i) => i.hex))
  assert.deepEqual(onPages, readBook(DESIGN).palette)
  for (const e of book.contents.filter((x) => !x.sub)) {
    const page = book.pages[e.folio - 1]
    assert.ok(page, `contents point at page ${e.folio}, which does not exist`)
    assert.ok(page.kind === 'opening' || page.kind === 'colophon', `"${e.title}" points at a ${page.kind} page`)
  }
  const contents = book.pages.find((p) => p.kind === 'contents')
  for (const e of book.contents) assert.ok(texts(contents).includes(e.title), `"${e.title}" is missing from the contents page`)
})

test('every token is listed exactly once, across the token pages', () => {
  const names = build().pages.filter((p) => p.kind === 'tokens').flatMap((p) => p.items.map((r) => r.name))
  assert.deepEqual(names, bookTokens(readBook(DESIGN)).map((t) => t.name))
})

test('the contrast figures are the ones the PDF book states', () => {
  const matrix = build().pages.find((p) => p.kind === 'matrix')
  const shown = texts(matrix)
  assert.ok(shown.includes(String(contrast('#2563EB', '#FFFFFF'))))
  assert.ok(shown.includes(String(contrast('#1E40AF', '#93C5FD'))))
  const palette = build().pages.find((p) => p.kind === 'palette')
  assert.ok(texts(palette).includes(`${inkFor('#2563EB').ratio}:1`))
  assert.equal(matrixClass(4.5).word, 'Pass')
  assert.equal(matrixClass(3).word, 'Large')
  assert.equal(matrixClass(2.99).word, 'Fail')
})

// ── Nothing leaves the page ─────────────────────────────────────────────────

const inside = (book) => {
  for (const page of book.pages) {
    for (const o of page.ops) {
      if (o.op === 'text') {
        assert.ok(o.x >= 0 && o.x <= PAGE.width, `${page.id}: "${o.text}" at x=${o.x}`)
        assert.ok(o.y >= 0 && o.y <= PAGE.height, `${page.id}: "${o.text}" at y=${o.y}`)
        if (page.kind !== 'cover' && page.kind !== 'opening') {
          assert.ok(o.y <= 944 || o.y >= 990, `${page.id}: "${o.text}" runs into the foot at y=${o.y}`)
        }
      } else if (o.op === 'rect' || o.op === 'strokeRect' || o.op === 'gradient') {
        assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= PAGE.width + 0.5 && o.y + o.h <= PAGE.height + 0.5, `${page.id}: a block leaves the page`)
        const full = o.w >= PAGE.width && o.h >= PAGE.height
        if (!full && page.kind !== 'cover' && page.kind !== 'opening') assert.ok(o.y + o.h <= 944, `${page.id}: a block runs into the foot at ${o.y + o.h}`)
      } else if (o.op === 'line') {
        assert.ok(o.x1 >= 0 && o.x2 <= PAGE.width && o.y1 <= PAGE.height)
      }
    }
  }
}

test('nothing is drawn off the page in the ordinary book', () => inside(build()))

test('a long project name wraps or is cut, and never overflows', () => {
  const name = 'The Extraordinarily Long-Winded Name Of A Brand Identity Programme For A Regional Cooperative Of Independent Cheesemakers And Allied Trades'
  const book = build(DESIGN, { projectName: name })
  inside(book)
  const running = book.pages[1].ops.find((o) => o.op === 'text' && o.x === 52 && o.y === 40)
  assert.ok(running.text.length < name.length, 'the running head carries the whole long name')
  assert.ok(running.text.endsWith('…'), 'the running head was cut without an ellipsis')
  // A single word wider than the page is split rather than left to run over.
  inside(build(DESIGN, { projectName: 'Supercalifragilisticexpialidocious'.repeat(4) }))
})

test('many colours paginate: five a page at most, no stub, and the matrix stays capped', () => {
  for (const n of [1, 5, 6, 11, 13, 40]) {
    const design = { ...DESIGN, palette: { base: '#2563EB', colors: manyColours(n) } }
    const book = build(design)
    inside(book)
    const palettePages = book.pages.filter((p) => p.kind === 'palette')
    assert.equal(palettePages.reduce((a, p) => a + p.items.length, 0), n, `${n} colours: some are missing`)
    for (const p of palettePages) assert.ok(p.items.length <= 5, `${n} colours: a page holds ${p.items.length}`)
    if (n > 5) {
      const sizes = palettePages.map((p) => p.items.length)
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `${n} colours: uneven pages ${sizes}`)
    }
    const matrix = book.pages.find((p) => p.kind === 'matrix')
    assert.equal(matrix.colours.length, Math.min(n, MATRIX_MAX))
    assert.equal(matrix.capped, n > MATRIX_MAX)
  }
})

test('the token list paginates by height and a long value wraps inside its column', () => {
  const design = { ...DESIGN, palette: { base: '#2563EB', colors: manyColours(60) } }
  const pages = plan(design).filter((p) => p.kind === 'tokens')
  assert.ok(pages.length > 1, 'sixty colours should not fit one token page')
  assert.equal(pages.reduce((a, p) => a + p.items.length, 0), bookTokens(readBook(design)).length)
  assert.ok(pages.find((p) => p.first), 'no first token page')
  const lengths = pages.map((p) => p.items.reduce((a, r) => a + r.height, 0))
  for (const h of lengths) assert.ok(h <= 944 - 140, `a token page is ${h}px tall`)
  inside(build(design))
  const gradientRow = pages.flatMap((p) => p.items).find((r) => r.name === '--gradient-brand')
  assert.ok(gradientRow.lines.length >= 1)
})

test('paginate spreads items evenly and never leaves a stub, balancedChunk likewise', () => {
  const items = Array.from({ length: 23 }, (_, i) => i)
  const groups = paginate(items, () => 20, 200, 200)
  assert.equal(groups.length, 3)
  assert.deepEqual(groups.flat(), items)
  assert.ok(Math.max(...groups.map((g) => g.length)) - Math.min(...groups.map((g) => g.length)) <= 1)
  assert.deepEqual(paginate([], () => 1, 10), [])
  assert.deepEqual(balancedChunk([1, 2, 3, 4, 5, 6], 5).map((g) => g.length), [3, 3])
})

// ── The count is stable ─────────────────────────────────────────────────────

test('the same design always plans the same pages', () => {
  const a = plan().map((p) => p.id)
  const b = plan().map((p) => p.id)
  assert.deepEqual(a, b)
  assert.equal(a.length, 13)
  assert.deepEqual(a.map((_, i) => i + 1), plan().map((p) => p.folio))
  // The date, the watermark and a wider measurer change words and positions, not the structure of a short book.
  assert.equal(plan(DESIGN, { date: new Date(Date.UTC(2030, 0, 1)) }).length, a.length)
  assert.equal(plan(DESIGN, { watermark: false }).length, a.length)
  // A pure function: planning does not alter the design it was given.
  const before = JSON.stringify(DESIGN)
  build()
  assert.equal(JSON.stringify(DESIGN), before)
})

test('page files sort in order, with two digits and more when the book is long', () => {
  assert.equal(pageFileName(0, 12), 'page-01.png')
  assert.equal(pageFileName(11, 12), 'page-12.png')
  assert.equal(pageFileName(0, 120), 'page-001.png')
  assert.equal(pageFileName(119, 120), 'page-120.png')
})

// ── Fonts ───────────────────────────────────────────────────────────────────

test('a kit with no fonts falls back to Inter, and every face carries a fallback stack', () => {
  const book = build({ palette: DESIGN.palette })
  assert.deepEqual(book.fonts, { heading: 'Inter', body: 'Inter' })
  for (const page of book.pages) {
    for (const o of page.ops.filter((x) => x.op === 'text')) {
      assert.ok(/system-ui|monospace/.test(o.font), `${page.id}: "${o.text}" is set in ${o.font}, with no fallback`)
    }
  }
})

test('a hostile family name is replaced, not drawn into the font string', () => {
  const book = build({ ...DESIGN, fonts: { heading: { family: 'x"; background:url(//evil)' }, body: { family: 'Inter' } } })
  assert.equal(book.fonts.heading, 'Inter')
})

test('the colophon names a face that could not load instead of claiming it', () => {
  const ok = texts(build().pages.at(-1)).join(' ')
  assert.ok(!/could not be loaded/.test(ok))
  const missing = texts(build(DESIGN, { missingFonts: ['Outfit'] }).pages.at(-1)).join(' ')
  assert.match(missing, /Outfit could not be loaded/)
})

// ── The watermark ───────────────────────────────────────────────────────────

test('the credit line is drawn on every page when asked for, and on none when not', () => {
  const credit = 'Made with UIL4B — uil4b.com'
  for (const page of build(DESIGN, { watermark: true }).pages) assert.ok(texts(page).includes(credit), `${page.id} has no credit line`)
  for (const page of build(DESIGN, { watermark: false }).pages) assert.ok(!texts(page).includes(credit), `${page.id} carries a credit line it should not`)
})

// ── Folios and running heads ────────────────────────────────────────────────

test('body pages carry a running head and a folio; the cover carries neither', () => {
  const book = build()
  const cover = texts(book.pages[0])
  assert.ok(!cover.includes('01'))
  const palette = book.pages.find((p) => p.kind === 'palette')
  assert.ok(texts(palette).includes('ACME'), 'the running head does not name the project')
  assert.ok(texts(palette).includes(String(palette.folio).padStart(2, '0')), 'the folio is missing')
  assert.ok(texts(book.pages[1]).includes('02'), 'the contents page is not folio 02')
})

test('every folio is two-digit arabic, with no roman numeral anywhere, contents list included', () => {
  const book = build()
  const roman = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i
  for (const page of book.pages) {
    assert.ok(!texts(page).some((t) => roman.test(t)), `${page.id} draws a roman numeral`)
    const folios = page.ops.filter((o) => o.op === 'text' && o.align === 'right' && o.y === FOOT_Y)
    if (page.kind !== 'cover') assert.deepEqual(folios.map((o) => o.text).filter((t) => /^\d+$/.test(t)), [String(page.folio).padStart(2, '0')])
  }
  const listed = book.pages.find((p) => p.kind === 'contents').ops
    .filter((o) => o.op === 'text' && o.align === 'right' && /^\d+$/.test(o.text) && o.y < 700).map((o) => o.text)
  assert.ok(listed.length >= book.contents.length)
  assert.ok(listed.every((t) => /^\d\d$/.test(t)), `a contents folio is not two digits: ${listed}`)
  // Ten or more pages: still two digits, never three.
  const long = build({ ...DESIGN, palette: { ...DESIGN.palette, colors: manyColours(16) } })
  assert.ok(long.pages.some((p) => p.folio >= 10))
  for (const p of long.pages.filter((q) => q.kind !== 'cover')) assert.ok(texts(p).includes(String(p.folio).padStart(2, '0')))
})

// ── Helpers ─────────────────────────────────────────────────────────────────

test('wrapText breaks on words, splits a word wider than a line, and cuts with an ellipsis', () => {
  const font = '400 10px "Inter"'
  const lines = wrapText('one two three four five six seven', 60, font)
  assert.ok(lines.length > 1 && lines.every((l) => l.length * 5.5 <= 60 + 0.01))
  assert.equal(lines.join(' '), 'one two three four five six seven')
  assert.ok(wrapText('abcdefghijklmnopqrstuvwxyz', 50, font).length > 1)
  const cut = wrapText('one two three four five six seven eight nine ten', 60, font, undefined, { maxLines: 2 })
  assert.equal(cut.length, 2)
  assert.ok(cut[1].endsWith('…'))
  assert.equal(fitLine('short', 200, font), 'short')
  assert.ok(fitLine('x'.repeat(100), 100, font).endsWith('…'))
  assert.deepEqual(wrapText('', 100, font), [])
})

test('the gradient runs corner to corner at 135 degrees and up at 0', () => {
  const diag = gradientLine({ x: 0, y: 0, w: 100, h: 100, angle: 135 })
  assert.ok(diag.x0 < diag.x1 && diag.y0 < diag.y1, 'a 135deg gradient should run down and right')
  const up = gradientLine({ x: 0, y: 0, w: 100, h: 200, angle: 0 })
  assert.ok(Math.abs(up.x0 - up.x1) < 1e-9 && up.y0 > up.y1, 'a 0deg gradient should run upward')
})

// ── Wiring ──────────────────────────────────────────────────────────────────

test('the book row offers PDF or PNG (2K), and both are Pro', () => {
  const formats = groupFormats('book')
  assert.deepEqual(formats.map((f) => f.id), ['book', 'book-png'])
  assert.deepEqual(formats.map((f) => f.option), ['PDF', 'PNG (2K)'])
  assert.ok(formats.every((f) => f.pro && f.live))
  assert.equal(isGroupPro('book'), true)
  assert.equal(assertFormatsCoherent(EXPORT_FORMATS), true)
  assert.match(formats[1].desc, /1448 x 2048/)
})

test('the PNG is another file of the book, so the plan lines still count one book', () => {
  assert.equal(EXPORT_FORMATS.find((f) => f.id === 'book-png').variantOf, 'book')
  assert.ok(!proOnlyFormats().some((f) => f.id === 'book-png'))
  assert.ok(proOnlyFormats().some((f) => f.id === 'book'))
  assert.throws(() => assertFormatsCoherent([{ id: 'a', live: true, group: 'g', variantOf: 'missing' }]), /variantOf/)
})

test('ExportPanel loads bookRaster only on demand, behind the same Pro check, and names the file', () => {
  const panel = read('src/components/ExportPanel.jsx')
  assert.match(panel, /await import\('\.\.\/utils\/bookRaster'\)/, 'the book raster must be code-split')
  assert.ok(!/^import .*bookRaster/m.test(panel), 'bookRaster is imported statically, so every visitor downloads it')
  assert.match(panel, /`\$\{slug\}-book-2k\.zip`/)
  // The PNG branch sits after the plan gate and the account gate in runExport.
  assert.ok(panel.indexOf("format === 'book-png'") > 0)
  assert.ok(panel.indexOf('const gateKey') < panel.indexOf('await import(\'../utils/bookRaster\')'))
  assert.ok(panel.indexOf('requireExportAccount(reason)') < panel.indexOf('await import(\'../utils/bookRaster\')'))
  assert.match(panel, /if \(paidFile && !proNow\)/, 'a Pro account that signs in at the gate is re-read before the PNG is drawn')
})

test('bookRaster never imports the Pro HTML generator or its templates', () => {
  const src = read('src/utils/bookRaster.js')
  assert.ok(!/^import .*designSystemBook/m.test(src))
  assert.ok(!/^import .*exportTemplates\/book\//m.test(src))
  assert.ok(!/^import .*brandGuidelines/m.test(src))
  // jszip is loaded on demand with the rest of the render path.
  assert.match(src, /await import\('jszip'\)/)
  assert.ok(!/^import .*jszip/m.test(src))
})

// ── The type scale page ─────────────────────────────────────────────────────

const withRatio = (ratio, base = 16) => ({ ...DESIGN, typeScale: { ...DESIGN.typeScale, base, ratio } })
const sizeOf = (font) => Number(/(\d+(?:\.\d+)?)px/.exec(font)[1])
// The specimen column of the scale page: [ladder step, size it was drawn at].
const specimens = (design) => {
  const { pages, ctx } = planBookPages(design, opts)
  const built = buildBookPages(design, opts).pages.find((p) => p.kind === 'scale')
  assert.ok(pages.some((p) => p.kind === 'scale'))
  const rows = ctx.ladder.map((s) => {
    const op = built.ops.find((o) => o.op === 'text' && o.x === 52 + 270 && o.text === s.name)
    assert.ok(op, `no specimen for ${s.name}`)
    return { step: s, drawn: sizeOf(op.font) }
  })
  return { rows, text: texts(built).join(' ') }
}

test('scale rows share one factor: no 44px cap, the largest sits at 76, the note shows only when reduced', () => {
  const steep = specimens(withRatio(1.618))
  const maxPx = Math.max(...steep.rows.map((r) => r.step.px))
  assert.ok(maxPx > 76, 'the steep scale is not steep enough to test the factor')
  const k = 76 / maxPx
  for (const r of steep.rows) assert.ok(Math.abs(r.drawn - r.step.px * k) < 0.02, `${r.step.name}: drawn at ${r.drawn}, expected ${r.step.px * k}`)
  assert.ok(Math.max(...steep.rows.map((r) => r.drawn)) > 44, 'the old 44px cap is still in force')
  assert.ok(/shown reduced/.test(steep.text), 'the reduced note is missing on a reduced scale')

  const gentle = specimens(withRatio(1.067, 14))
  assert.ok(Math.max(...gentle.rows.map((r) => r.step.px)) <= 76)
  for (const r of gentle.rows) assert.equal(r.drawn, r.step.px, `${r.step.name} was reduced without need`)
  assert.ok(!/shown reduced/.test(gentle.text), 'the reduced note shows although nothing is reduced')
})

// ── The colophon names the project in full ──────────────────────────────────

test('the colophon wraps the project name to two lines at most, and never cuts it', () => {
  const nameOps = (name) => {
    const page = build(DESIGN, { projectName: name }).pages.find((p) => p.kind === 'colophon')
    return page.ops.filter((o) => o.op === 'text' && o.x === 52 && o.y > 880 && o.y < 944 && o.text !== 'Issued')
  }
  const medium = 'Northern Cooperative Of Independent Cheesemakers And Allied Trades'
  const lines = nameOps(medium)
  assert.ok(lines.length >= 2 && lines.length <= 2, `${lines.length} lines`)
  assert.equal(lines.map((o) => o.text).join(' '), medium, 'the name was cut')
  // Too long for two lines at 15px: the size steps down, the words stay.
  const long = 'The Extraordinarily Long-Winded Name Of A Brand Identity Programme For A Regional Cooperative Of Independent Cheesemakers'
  const small = nameOps(long)
  assert.equal(small.map((o) => o.text).join(' '), long, 'a long name was cut')
  assert.ok(small.every((o) => !o.text.includes('…')), 'an ellipsis was drawn')
  assert.ok(sizeOf(small[0].font) < 15, 'the size did not step down')
})

// ── The foot ────────────────────────────────────────────────────────────────

test('an opening\'s section number ends above the folio, by its measured descent; one foot line for all pages', () => {
  // A measurer that reports a deep descent (as a canvas does through
  // actualBoundingBoxDescent): the numeral must rise by exactly that much.
  const descent = 30
  const measure = Object.assign((t, f) => estimateWidth(t, f), { descent: () => descent })
  const book = build(DESIGN, { measure })
  for (const page of book.pages.filter((p) => p.kind === 'opening')) {
    const numeral = page.ops.find((o) => o.op === 'text' && o.text === page.num && sizeOf(o.font) === 380)
    const folio = page.ops.find((o) => o.op === 'text' && o.text === String(page.folio).padStart(2, '0') && o.align === 'right')
    assert.ok(numeral && folio, `${page.id}: numeral or folio missing`)
    assert.equal(folio.y, FOOT_Y, `${page.id}: the folio is not on the shared foot line`)
    const folioTop = folio.y - sizeOf(folio.font)
    assert.ok(numeral.y + descent <= folioTop, `${page.id}: the numeral (bottom ${numeral.y + descent}) touches the folio (top ${folioTop})`)
    assert.equal(numeral.y, FOOT_Y - 40 - descent)
  }
  // Without a canvas the descent is estimated, never zero.
  const estimated = build().pages.find((p) => p.kind === 'opening')
  assert.ok(estimated.ops.find((o) => o.op === 'text' && sizeOf(o.font) === 380).y < FOOT_Y - 40)
  // Content pages foot on the same line.
  const body = build().pages.find((p) => p.kind === 'palette')
  assert.ok(body.ops.some((o) => o.op === 'text' && o.y === FOOT_Y && o.align === 'right'))
})

// ── The typography opener ───────────────────────────────────────────────────

test('the typography opener is the kit\'s darkest colour by luminance, with the fixed dark only for an empty palette', () => {
  const kit = (colors) => ({ ...DESIGN, palette: { base: colors[0], harmony: 'analogous', colors } })
  const field = (design) => plan(design).find((p) => p.kind === 'opening' && p.title === 'Typography').field
  assert.equal(field(DESIGN), '#0F172A')
  // The darkest is not first, last, or the base.
  assert.equal(field(kit(['#2563EB', '#FFFFFF', '#1B4D3E', '#93C5FD', '#7C3AED'])), '#1B4D3E')
  // A kit of light colours still gets its own darkest, not the fixed #111114.
  assert.equal(field(kit(['#F8FAFC', '#E2E8F0', '#CBD5E1'])), '#CBD5E1')
  assert.equal(darkestColour(['#336699', '#223344', '#ffeedd']), '#223344')
  assert.equal(field({ ...DESIGN, palette: { colors: [] }, gradient: null }), '#111114')
  // The ink is chosen for it: white on a dark field, black on a light one.
  const light = plan(kit(['#F8FAFC', '#E2E8F0', '#CBD5E1'])).find((p) => p.title === 'Typography')
  assert.equal(light.ink, '#000000')
})

// ── The cover without a colour strip ────────────────────────────────────────

test('a one-colour cover has no strip and its title block sits 144 lower than with one', () => {
  const kit = (colors) => ({ ...DESIGN, palette: { base: colors[0], harmony: 'analogous', colors } })
  const metaY = (design) => {
    const cover = build(design).pages[0]
    return {
      y: cover.ops.find((o) => o.op === 'text' && o.text === 'Outfit and Inter').y,
      bars: cover.ops.filter((o) => o.op === 'rect' && o.w < PAGE.width && o.h > 0 && o.y > 800 && o.x >= 0 && o.w > 0).length,
    }
  }
  const many = metaY(kit(['#2563EB', '#1E40AF', '#93C5FD']))
  const one = metaY(kit(['#2563EB']))
  assert.ok(many.bars >= 2, 'the multi-colour cover lost its strip')
  assert.equal(one.bars, 0, 'the one-colour cover still draws a strip')
  assert.equal(one.y - many.y, 144)
  inside(build(kit(['#2563EB'])))
})
