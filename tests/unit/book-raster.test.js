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
  wrapText, fitLine, pageFileName, gradientLine, matrixClass, FOOT_Y, estimateWidth, darkestColour, CREDIT_LINE, balanceLines, formatRatio, ensureBookFonts, uniqueColourNames,
} from '../../src/utils/bookRaster.js'
import { contrast, inkFor } from '../../src/utils/styleGuideExport.js'
import { bookTokens } from '../../src/utils/bookTokens.js'
import { colorName } from '../../src/utils/paletteNames.js'
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
  assert.ok(shown.includes(`${contrast('#2563EB', '#FFFFFF').toFixed(2)}:1`))
  assert.ok(shown.includes(`${contrast('#1E40AF', '#93C5FD').toFixed(2)}:1`))
  const palette = build().pages.find((p) => p.kind === 'palette')
  assert.ok(texts(palette).includes(`${inkFor('#2563EB').ratio.toFixed(2)}:1`))
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

test('heading tracking is measured: a spaced long name stays inside the margins everywhere it is set', () => {
  const name = 'Northern Coastal Cooperative Of Independent Cheesemakers And Allied Trades'
  const spaced = { ...DESIGN, typeScale: { ...DESIGN.typeScale, headingSpacing: 0.1 } }
  const book = build(spaced, { projectName: name })
  let checked = 0
  for (const page of book.pages) {
    for (const o of page.ops.filter((x) => x.op === 'text' && x.letterSpacing && /"Outfit"/.test(x.font) && !x.align)) {
      const width = estimateWidth(o.text, o.font) + [...o.text].length * o.letterSpacing
      assert.ok(o.x + width <= 672 + 1, `${page.id}: "${o.text}" is ${Math.round(o.x + width)} wide against a 672 margin`)
      checked += 1
    }
  }
  assert.ok(checked > 10, 'no spaced heading was found to check')
  const coverLines = book.pages[0].ops.filter((o) => o.op === 'text' && o.letterSpacing && o.y > 150 && o.y < 740)
  assert.ok(coverLines.length >= 2, 'the long cover name should wrap')
  // The same name with no tracking wraps no more than with it.
  const plain = build(DESIGN, { projectName: name }).pages[0].ops.filter((o) => o.op === 'text' && /"Outfit"/.test(o.font) && o.y > 150 && o.y < 740)
  assert.ok(coverLines.length >= plain.length, 'tracking made the cover title shorter')
})

test('many colours paginate: five a page at most, no stub; the matrix takes up to 13 colours, 7 rows a page', () => {
  assert.equal(MATRIX_MAX, 13)
  for (const n of [2, 5, 6, 8, 11, 13, 14, 40]) {
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
    const matrices = book.pages.filter((p) => p.kind === 'matrix')
    const shown = Math.min(n, MATRIX_MAX)
    assert.equal(matrices[0].colours.length, shown)
    assert.equal(matrices[0].capped, n > MATRIX_MAX)
    assert.equal(matrices.length, Math.ceil(shown / 7), `${n} colours: ${matrices.length} matrix pages`)
    assert.deepEqual(matrices.flatMap((p) => p.rows), matrices[0].colours, `${n} colours: a row is missing or repeated`)
    for (const p of matrices) assert.ok(p.rows.length <= 7, `${n} colours: ${p.rows.length} rows on a matrix page`)
    const rowCounts = matrices.map((p) => p.rows.length)
    assert.ok(Math.max(...rowCounts) - Math.min(...rowCounts) <= 1, `${n} colours: uneven matrix pages ${rowCounts}`)
    // Every extra matrix page is its own contents entry.
    assert.equal(book.contents.filter((e) => /^Contrast matrix/.test(e.title)).length, matrices.length)
    for (const p of matrices) assert.ok(book.contents.some((e) => e.folio === p.folio), `${n} colours: matrix page ${p.folio} is not in the contents`)
    // The cap is explained on the page, and no longer says the rest are measured elsewhere.
    const said = texts(matrices[0]).join(' ')
    if (n > MATRIX_MAX) {
      assert.match(said, new RegExp(`first ${MATRIX_MAX} colours`))
      assert.ok(!/palette pages/.test(said), 'the matrix still claims the rest are measured on the palette pages')
    } else assert.ok(!/limited to the first/.test(said))
  }
})

test('a one-colour kit has no matrix page: its palette page has a full-width swatch, big tints and the ink ratios', () => {
  const one = { ...DESIGN, palette: { base: '#2563EB', colors: ['#2563EB'] } }
  const book = build(one)
  inside(book)
  assert.ok(!book.pages.some((p) => p.kind === 'matrix'), 'a one-colour kit still has a matrix page')
  assert.ok(!book.contents.some((e) => /matrix/i.test(e.title)), 'the contents still list a matrix')
  const hex = readBook(one).palette[0]
  const page = book.pages.find((p) => p.kind === 'palette')
  const swatch = page.ops.find((o) => o.op === 'rect' && o.fill === hex && o.h === 260)
  assert.ok(swatch, 'no 260 high swatch')
  assert.equal(swatch.x, 52)
  assert.equal(swatch.w, 620)
  const said = texts(page)
  assert.ok(said.includes(formatRatio(contrast(hex, '#FFFFFF'))), 'no ratio on white')
  assert.ok(said.includes(formatRatio(contrast(hex, '#000000'))), 'no ratio on black')
  const tints = page.ops.filter((o) => o.op === 'rect' && o.w > 140 && o.h >= 60 && o.fill !== hex && o.w < 724)
  assert.equal(tints.length, 4, 'four large tints')
  // Two colours do get their matrix.
  assert.ok(build({ ...DESIGN, palette: { base: '#2563EB', colors: ['#2563EB', '#0F172A'] } }).pages.some((p) => p.kind === 'matrix'))
})

test('palette pages of three rows or fewer have 200 high swatches 210 apart; fuller pages keep 144 and 150', () => {
  const chipsOf = (n) => {
    const design = { ...DESIGN, palette: { base: '#2563EB', colors: manyColours(n) } }
    return build(design).pages.filter((p) => p.kind === 'palette').map((page) => {
      inside({ pages: [page] })
      return page.ops.filter((o) => o.op === 'rect' && o.w === 170 && o.radius === 3).map((o) => ({ y: o.y, h: o.h }))
    })
  }
  for (const n of [2, 3, 6]) {
    for (const chips of chipsOf(n)) {
      assert.ok(chips.length >= 1 && chips.length <= 3)
      for (const chip of chips) assert.equal(chip.h, 200, `${n} colours: a swatch is ${chip.h} high`)
      chips.slice(1).forEach((chip, i) => assert.equal(chip.y - chips[i].y, 210, `${n} colours: rows ${chip.y - chips[i].y} apart`))
    }
  }
  for (const n of [4, 5]) {
    const [chips] = chipsOf(n)
    for (const chip of chips) assert.equal(chip.h, 144, `${n} colours: a swatch is ${chip.h} high`)
    chips.slice(1).forEach((chip, i) => assert.equal(chip.y - chips[i].y, 150))
  }
  // The taller band keeps its tints inside it.
  const [three] = chipsOf(3)
  const page = build({ ...DESIGN, palette: { base: '#2563EB', colors: manyColours(3) } }).pages.find((p) => p.kind === 'palette')
  const tints = page.ops.filter((o) => o.op === 'rect' && o.h === 18)
  assert.equal(tints.length, 12)
  for (const t of tints) assert.ok(t.y + t.h <= three[Math.floor(tints.indexOf(t) / 4)].y + 200, 'a tint leaves its band')
})

test('two palette entries with one colour name are numbered: the later ones get 2, 3', () => {
  // Three colours that really do share a name ("Wild Fern"), and one that does not.
  const near = ['#256403', '#25670D', '#256803', '#0F172A']
  const name = colorName(near[0])
  assert.equal(colorName(near[1]), name, 'the fixture colours no longer share a name; pick others')
  assert.equal(colorName(near[2]), name)
  assert.deepEqual(uniqueColourNames(near).slice(0, 3), [name, `${name} 2`, `${name} 3`])
  assert.equal(uniqueColourNames(near)[3], colorName(near[3]), 'a name that is already unique is left alone')
  const drawnNames = (colors) => build({ ...DESIGN, palette: { base: colors[0], colors } }).pages
    .filter((p) => p.kind === 'palette')
    .flatMap((p) => p.ops.filter((o) => o.op === 'text' && /^700 21px/.test(o.font)).map((o) => o.text))
  assert.deepEqual(drawnNames(near).slice(0, 3), [name, `${name} 2`, `${name} 3`])
  // The count runs over the whole palette, not per page: six of one name over two pages.
  const six = ['#256403', '#25670D', '#256803', '#256A00', '#257044', '#25712C']
  assert.deepEqual(drawnNames(six), six.map((_, i) => (i ? `${name} ${i + 1}` : name)))
})

test('matrix shading tints the passing cells and leaves the failing ones bare and light', () => {
  const page = build().pages.find((p) => p.kind === 'matrix')
  const cells = page.ops.filter((o) => o.op === 'rect' && o.h === 46)
  const cellAt = (t) => cells.find((r) => t.x > r.x && t.x < r.x + r.w && t.y > r.y && t.y < r.y + r.h)
  const seen = { Pass: [], Large: [], Fail: [] }
  for (const t of page.ops.filter((o) => o.op === 'text' && /^\d+\.\d\d:1$/.test(o.text))) {
    const { word } = matrixClass(parseFloat(t.text))
    seen[word].push({ t, cell: cellAt(t) })
  }
  assert.ok(seen.Pass.length && seen.Large.length && seen.Fail.length, 'the sample has no cell of some class')
  for (const { t, cell } of seen.Pass) assert.ok(cell, `${t.text} passes and is not tinted`)
  for (const { t, cell } of seen.Large) assert.ok(cell, `${t.text} is large-text only and is not tinted`)
  for (const { t, cell } of seen.Fail) assert.equal(cell, undefined, `${t.text} fails and is tinted`)
  assert.notEqual(seen.Pass[0].cell.fill, seen.Large[0].cell.fill, 'pass and large share one tint')
  // Weight still carries the class, so it never rests on shading alone.
  assert.ok(Number(/^(\d+) /.exec(seen.Pass[0].t.font)[1]) > Number(/^(\d+) /.exec(seen.Fail[0].t.font)[1]))
  assert.notEqual(seen.Fail[0].t.fill, seen.Pass[0].t.fill, 'a failing figure is not muted')
})

test('with 13 colours the matrix is 15 columns of 35 units, and every figure fits its cell', () => {
  const design = { ...DESIGN, palette: { base: '#2563EB', colors: manyColours(13) } }
  const matrix = build(design).pages.filter((p) => p.kind === 'matrix')
  assert.equal(matrix.length, 2)
  for (const page of matrix) {
    const centres = page.ops.filter((o) => o.op === 'text' && /^[0-9A-F]{6}$/.test(o.text) && o.align === 'center').map((o) => o.x)
    assert.equal(centres.length, 15)
    centres.slice(1).forEach((x, i) => assert.equal(Math.round((x - centres[i]) * 100) / 100, 35))
    const figures = page.ops.filter((o) => o.op === 'text' && /^\d+\.\d\d:1$/.test(o.text))
    assert.ok(figures.length >= 6 * 14, `${figures.length} figures`)
    for (const o of figures) assert.ok(estimateWidth(o.text, o.font) <= 35, `"${o.text}" is ${Math.round(estimateWidth(o.text, o.font))} wide in a 35 cell`)
    const rowLabel = page.ops.find((o) => o.op === 'text' && /^#[0-9A-F]{6}$/.test(o.text))
    assert.ok(rowLabel.x + estimateWidth(rowLabel.text, rowLabel.font) <= 52 + 95, 'a row label runs into the first column')
    assert.ok(Math.abs(centres[0] - (52 + 95 + 17.5)) < 0.01, 'the first column does not start after the 95 unit row head')
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

test('ensureBookFonts resolves at its deadline when a face never settles, naming it as missing', async () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'document')
  globalThis.document = { fonts: { load: () => new Promise(() => {}) } }
  try {
    const fontApi = { loadFont: () => Promise.resolve('loaded'), verifyFontLoaded: async () => 'ok' }
    const started = Date.now()
    const missing = await ensureBookFonts({ heading: 'Outfit', body: 'Inter', headingWeight: 700, bodyWeight: 400 }, { deadlineMs: 40, fontApi })
    assert.ok(Date.now() - started < 2000, 'the font step waited far past its deadline')
    assert.deepEqual(missing.sort(), ['Inter', 'Outfit'])
    // A stylesheet that never loads is caught by the same deadline.
    const stuck = { loadFont: () => new Promise(() => {}), verifyFontLoaded: async () => 'ok' }
    assert.deepEqual(await ensureBookFonts({ heading: 'Outfit', body: 'Outfit', headingWeight: 700, bodyWeight: 400 }, { deadlineMs: 40, fontApi: stuck }), ['Outfit'])
    // When everything loads, nothing is missing.
    globalThis.document = { fonts: { load: async () => [] } }
    assert.deepEqual(await ensureBookFonts({ heading: 'Outfit', body: 'Inter', headingWeight: 700, bodyWeight: 400 }, { deadlineMs: 500, fontApi }), [])
  } finally {
    if (had) Object.defineProperty(globalThis, 'document', had)
    else delete globalThis.document
  }
})

// ── The watermark ───────────────────────────────────────────────────────────

test('the credit line is drawn on every page when asked for, and on none when not', () => {
  const credit = CREDIT_LINE
  for (const page of build(DESIGN, { watermark: true }).pages) assert.ok(texts(page).includes(credit), `${page.id} has no credit line`)
  for (const page of build(DESIGN, { watermark: false }).pages) assert.ok(!texts(page).includes(credit), `${page.id} carries a credit line it should not`)
})

// ── Folios and running heads ────────────────────────────────────────────────

test('body pages carry a running head and a folio; the cover carries neither', () => {
  const book = build()
  const cover = texts(book.pages[0])
  assert.ok(!cover.includes('01'))
  const palette = book.pages.find((p) => p.kind === 'palette')
  assert.ok(texts(palette).includes('Acme'), 'the running head does not name the project')
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
  // Every contents entry's page number is drawn padded; the page's fact figures
  // (colour, step and token counts) are not folios and are left out.
  const contentsTexts = texts(book.pages.find((p) => p.kind === 'contents'))
  for (const entry of book.contents) {
    assert.ok(contentsTexts.includes(String(entry.folio).padStart(2, '0')), `${entry.title}: folio ${entry.folio} is not drawn as two digits`)
  }
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

test('a gradient with 30 stops lists what fits, says how many more, and keeps the code box on the page', () => {
  const stopsOf = (n) => manyColours(n).map((color, i) => ({ color, position: Math.round((i * 100) / Math.max(1, n - 1)) }))
  const gradientPage = (n) => build({ ...DESIGN, gradient: { angle: 135, type: 'Linear', stops: stopsOf(n) } }).pages.find((p) => p.kind === 'gradient')
  const listedOn = (page) => texts(page).filter((t) => /^Stop \d+$/.test(t)).length

  const small = gradientPage(5)
  assert.equal(listedOn(small), 5)
  assert.ok(!texts(small).some((t) => /more stop/.test(t)), 'a short list should not say there are more')

  const long = gradientPage(30)
  inside({ pages: [long] })
  const listed = listedOn(long)
  assert.ok(listed >= 6 && listed < 30, `${listed} stops listed`)
  assert.ok(texts(long).includes(`+${30 - listed} more stops`), 'the page does not say how many stops are left out')
  const box = long.ops.filter((o) => o.op === 'rect' && o.w === 620 && o.radius === 3).at(-1)
  assert.ok(box.y + box.h <= 944, `the code box ends at ${box.y + box.h}`)
  const lastRow = Math.max(...long.ops.filter((o) => o.op === 'text' && /^Stop \d+$/.test(o.text)).map((o) => o.y))
  assert.ok(lastRow < box.y, 'the stop list runs into the code box')
  // Every stop is still in the code.
  const code = long.ops.filter((o) => o.op === 'text' && o.y > box.y).map((o) => o.text).join(' ')
  assert.equal((code.match(/#[0-9A-F]{6} \d+%/g) || []).length, 30)
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

// ── Copy ────────────────────────────────────────────────────────────────────

test('the credit line is one constant, with a middle dot and no em dash anywhere in drawn text', () => {
  assert.equal(CREDIT_LINE, 'Made with UIL4B · uil4b.com')
  const book = build(DESIGN, { watermark: true })
  for (const page of book.pages) {
    // The glyph specimen shows the em dash as a character to look at; it is the one exception.
    const drawn = texts(page).filter((t) => !t.includes('“'))
    assert.ok(!drawn.some((t) => t.includes('—')), `${page.id} draws an em dash`)
  }
  const src = read('src/utils/bookRaster.js')
  assert.equal((src.match(/Made with UIL4B/g) || []).length, 1, 'the credit text is copied rather than shared')
})

test('a one-colour kit says "1 colour, with the ink...", not a count built on a system', () => {
  const one = plan({ ...DESIGN, palette: { base: '#2563EB', colors: ['#2563EB'] } }).find((p) => p.kind === 'opening')
  assert.equal(one.abstract, '1 colour, with the ink that reads on it and the ratio that proves it.')
  assert.match(plan().find((p) => p.kind === 'opening').abstract, /^6 colours built on an? [a-z-]+ system, each with the ink/)
})

test('balanceLines never leaves one word alone on the last line, and leaves balanced text alone', () => {
  const font = '10px "X"'
  const text = 'aaaaa bbbbb ccccc ddddd eeeee fffff ggggg'
  // Plain wrapping strands the last word...
  assert.deepEqual(wrapText(text, 100, font), ['aaaaa bbbbb ccccc', 'ddddd eeeee fffff', 'ggggg'])
  // ...the balanced version does not, and loses no word.
  const balanced = balanceLines(text, 100, font)
  assert.deepEqual(balanced, ['aaaaa bbbbb ccccc', 'ddddd eeeee', 'fffff ggggg'])
  assert.equal(balanced.join(' '), text)
  // One line, or already two words on the last, is returned as wrapText gives it.
  assert.deepEqual(balanceLines('aaaaa bbbbb', 100, font), ['aaaaa bbbbb'])
  assert.deepEqual(balanceLines('aaaaa bbbbb ccccc ddddd eeeee fffff', 100, font), wrapText('aaaaa bbbbb ccccc ddddd eeeee fffff', 100, font))
  // It never breaks the line limit: a cut line keeps its ellipsis.
  assert.ok(balanceLines(text.repeat(3), 100, font, estimateWidth, { maxLines: 2 }).length <= 2)
})

test('formatRatio always gives two decimals and ":1", and the band and matrix both use it', () => {
  assert.equal(formatRatio(7), '7.00:1')
  assert.equal(formatRatio(4.5), '4.50:1')
  assert.equal(formatRatio(21), '21.00:1')
  assert.equal(formatRatio(5.173), '5.17:1')
  assert.equal(formatRatio('3.1'), '3.10:1')
  const book = build()
  const matrix = book.pages.find((p) => p.kind === 'matrix')
  const figures = texts(matrix).filter((t) => /:1$/.test(t))
  assert.equal(figures.length, matrix.colours.length * (matrix.colours.length + 1), "a matrix cell has no ratio figure")

  assert.ok(figures.every((t) => /^\d+\.\d\d:1$/.test(t)), `a matrix figure is not formatted: ${figures.filter((t) => !/^\d+\.\d\d:1$/.test(t))}`)
  for (const band of book.pages.filter((p) => p.kind === 'palette')) {
    for (const t of texts(band).filter((x) => /:1$/.test(x))) assert.match(t, /^\d+\.\d\d:1$/)
  }
})

// ── Labels: sentence case, no tracking ──────────────────────────────────────

test('labels are sentence case and untracked: no small text has letter spacing or is set in capitals', () => {
  const sizeOf = (font) => Number(/(\d+(?:\.\d+)?)px/.exec(font)[1])
  const spaced = { ...DESIGN, typeScale: { ...DESIGN.typeScale, headingSpacing: 0.1 } }
  const designs = [DESIGN, spaced, { ...DESIGN, palette: { base: '#2563EB', colors: manyColours(13) } }]
  // The four notation acronyms, the WCAG grades a figure carries, and hex values are not labels.
  const allowed = new Set(['HEX', 'RGB', 'HSL', 'OKLCH', 'AA', 'AAA'])
  for (const design of designs) {
    for (const page of build(design).pages) {
      for (const o of page.ops.filter((x) => x.op === 'text' && sizeOf(x.font) <= 12)) {
        assert.ok(!(o.letterSpacing > 0), `${page.id}: "${o.text}" is tracked by ${o.letterSpacing}`)
        // Labels are the body face at weight 500 or 600; prose is 400 and values are monospace.
        if (/monospace/.test(o.font) || !/^(500|600) /.test(o.font)) continue
        const words = o.text.replace(/#?\b[0-9A-F]{6}\b/g, '').split(/[^A-Za-z]+/).filter((w) => w.length > 1)
        for (const w of words) {
          assert.ok(w !== w.toUpperCase() || allowed.has(w), `${page.id}: "${o.text}" has the capitals word ${w}`)
        }
      }
    }
  }
  // The labels the design names, in the case it names them.
  const book = build()
  const all = (kind) => book.pages.filter((p) => p.kind === kind).flatMap(texts)
  assert.ok(all('palette').includes('Primary') && all('palette').includes('Tints 80, 60, 40, 20%'))
  assert.ok(all('matrix').includes('Background / text'))
  assert.ok(texts(book.pages[0]).includes('Design system book') && texts(book.pages[0]).includes('Issued 2026-10-29'))
  assert.ok(book.pages.filter((p) => p.kind === 'opening').every((p) => texts(p).includes(`Section ${Number(p.num)}`)))
})
