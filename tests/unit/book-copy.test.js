// The design system books say what the system is and stop. This pins the copy, the
// specimen sizes, the contrast matrix and the number formats across all three layouts.
// To see a check fail: put "rather than" back into a lede in src/utils/designSystemBook.js,
// cap a specimen with Math.min(s.px, 44), or slice the matrix to eight colours.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { contrast, typeLadder } from '../../src/utils/styleGuideExport.js'
import { fmtRatio, matrixBlocks, pairTally, MATRIX_ROWS, MATRIX_COLS } from '../../src/utils/exportTemplates/shared.js'
import { FIXED_DATE } from '../helpers/export-samples.js'

const TEMPLATES = ['specification', 'monograph', 'atlas']
const COLOURS = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540', '#B4552D', '#F5EDE3', '#E8B04A', '#7A3E9D', '#2B2B2B', '#F2F2F2', '#5C8A3A', '#D94F70', '#123456', '#654321', '#ABCDEF', '#FEDCBA']
const design = (n, typeScale = { base: 16, ratio: 1.333, lineHeight: 1.5 }) => ({
  palette: { base: COLOURS[0], harmony: 'analogous', colors: COLOURS.slice(0, n) },
  gradient: { stops: [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }], angle: 135, type: 'Linear' },
  fonts: { heading: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale,
})
const build = (template, d = design(5)) => buildDesignSystemBook(d, { projectName: 'Harbourline', date: FIXED_DATE, template })
const pages = (html) => html.split('<section class="pg').slice(1)

// Phrases that argue for the document's own honesty. A list, so a new one is one line.
const BANNED = [
  /rather than/i, /not estimated/i, /\bproves?\b/i, /Nothing here/i, /eyeball/i, /illustrative/i,
  /placeholder/i, /predictably/i, /actually holds/i, /happens to be/i, /Set from the system it describes/i,
  /How this book was made/i, /first (8|eight) colours/i, /checked elsewhere/i, /measured against paper and ink there/i,
]

test('no layout carries a self-defending phrase, at any palette size', () => {
  for (const template of TEMPLATES) {
    for (const n of [0, 1, 5, 13, 17]) {
      const html = build(template, design(n))
      for (const banned of BANNED) assert.doesNotMatch(html, banned, `${template}, ${n} colours: ${banned}`)
    }
  }
})

test('the contents page is the facts, with the type step count taken from the ladder', () => {
  const html = build('specification')
  const contents = pages(html).find((p) => p.includes('pg-contents'))
  assert.match(contents, /The colour, type and token specification for <b>Harbourline<\/b>\./)
  assert.match(contents, new RegExp(`<dt>Type steps</dt><dd>${typeLadder({ baseSize: 16, ratio: 1.333 }).length}</dd>`))
  assert.match(contents, /<dt>Colours<\/dt><dd>5<\/dd>/)
})

test('folios are arabic: the contents page prints 2, never ii', () => {
  const contents = pages(build('specification')).find((p) => p.includes('pg-contents'))
  assert.match(contents, /<span class="folio">2<\/span>/)
  assert.doesNotMatch(contents, /<span class="folio">[ivx]+<\/span>/)
})

const specimenSizes = (html) => [...html.matchAll(/class="sp" style="font-size:([\d.]+)px/g)].map((m) => Number(m[1]))

test('the scale specimens print at their true sizes, so Display, H1 and H2 differ', () => {
  const truth = typeLadder({ baseSize: 16, ratio: 1.333 }).map((s) => s.px)
  for (const template of ['specification', 'monograph', 'atlas']) {
    const sizes = specimenSizes(build(template))
    assert.equal(sizes.length, 8, `${template}: one specimen for each step`)
    assert.ok(Math.max(...sizes) > 44, `${template}: the largest specimen is still capped`)
    for (let i = 1; i < 3; i += 1) assert.ok(sizes[i] < sizes[i - 1], `${template}: step ${i} is not smaller than step ${i - 1}`)
    if (template !== 'atlas') truth.forEach((px, i) => assert.ok(Math.abs(sizes[i] - px) < 0.06, `${template}: step ${i} is ${sizes[i]}px, not ${px}px`))
  }
})

test('a ladder too tall for its table is reduced by one factor and says so', () => {
  const big = design(5, { base: 24, ratio: 1.618, lineHeight: 1.5 })
  for (const template of ['specification', 'monograph']) {
    const html = build(template, big)
    const ladder = typeLadder({ baseSize: 24, ratio: 1.618 })
    const sizes = specimenSizes(html)
    const k = sizes[0] / ladder[0].px
    assert.ok(k < 1, `${template}: the 1.618 ladder should not fit at true size`)
    sizes.forEach((px, i) => assert.ok(Math.abs(px / ladder[i].px - k) < 0.01, `${template}: step ${i} does not share the factor`))
    assert.match(html, /reduced|of their size/, `${template}: the reduction is stated`)
  }
})

test('the contrast matrix has a row for every colour and the pages are cut evenly', () => {
  for (const template of ['specification', 'monograph']) {
    for (const n of [5, 8, 13, 17]) {
      const html = build(template, design(n))
      const matrixPages = pages(html).filter((p) => /class="(wide )?mx"/.test(p))
      const rowHeads = matrixPages.flatMap((p) => [...p.matchAll(/<th scope="row">(?:<[^>]+><\/[a-z]+>)?(#[0-9A-F]{6})<\/th>/g)].map((m) => m[1]))
      // 17 colours is 19 columns, so the matrix splits into two column groups and every row appears in both.
      const groups = n + 2 > MATRIX_COLS ? 2 : 1
      assert.equal(rowHeads.length, n * groups, `${template}, ${n} colours: ${rowHeads.length} rows`)
      assert.deepEqual([...new Set(rowHeads)].sort(), COLOURS.slice(0, n).sort(), `${template}, ${n} colours: a colour is missing from the rows`)
      for (const p of matrixPages) assert.ok((p.match(/<th scope="row">/g) || []).length <= MATRIX_ROWS, `${template}: a matrix page holds more than ${MATRIX_ROWS} rows`)
      if (n === 13) assert.equal(matrixPages.length, 2, `${template}: 13 colours should fill two pages`)
    }
  }
})

test('every colour is a column too, so each pair is on the page', () => {
  const html = build('specification', design(13))
  const heads = [...html.matchAll(/<span class="mx-h">([0-9A-F]{6})<\/span>/g)].map((m) => m[1])
  for (const hex of COLOURS.slice(0, 13)) assert.ok(heads.includes(hex.slice(1)), `${hex} is not a column`)
  assert.ok(heads.includes('FFFFFF') && heads.includes('000000'), 'paper and ink are columns')
})

test('every contrast ratio is printed to two decimals', () => {
  for (const template of TEMPLATES) {
    const html = build(template, design(13))
    const body = html.slice(html.indexOf('</style>'))
    const ratios = [...body.matchAll(/(\d+(?:\.\d+)?):1(?!\d)/g)].map((m) => m[1]).filter((r) => r !== '4.5' && r !== '3' && r !== '7')
    assert.ok(ratios.length >= 5, `${template}: found ${ratios.length} ratios`)
    for (const r of ratios) assert.match(r, /^\d+\.\d{2}$/, `${template}: "${r}:1" is not two decimals`)
  }
  // The matrix cells carry no ":1", so check a pair whose ratio ends in a zero.
  const pair = COLOURS.slice(0, 13).flatMap((a) => COLOURS.slice(0, 13).map((b) => [a, b])).find(([a, b]) => a !== b && String(contrast(a, b)).split('.')[1]?.length === 1)
  assert.ok(pair, 'the fixture has a ratio with a trailing zero')
  assert.ok(build('specification', design(13)).includes(`>${fmtRatio(contrast(...pair))}<span`), 'the matrix prints the trailing zero')
})

test('the typography opener takes its field from the palette, and falls back to ink only when nothing is dark', () => {
  const opener = (html) => pages(html).find((p) => p.includes('<h2 class="open-title">Typography</h2>'))
  assert.match(opener(build('specification')), /background:#0D2540/)
  assert.doesNotMatch(build('specification'), /#111114/)
  const light = { ...design(2), palette: { base: '#F5EDE3', harmony: 'auto', colors: ['#F5EDE3', '#E8B04A'] } }
  assert.match(opener(build('specification', light)), /background:#111114/)
})

test('colours the preview does not paint are labelled once, with no stamped sentence', () => {
  for (const template of TEMPLATES) {
    const html = build(template, design(8))
    assert.doesNotMatch(html, /Not assigned to a part of the interface/, `${template}: the stamped sentence is back`)
    assert.match(html, /alternative 1, unassigned/i, `${template}: an unplaced colour is not labelled`)
  }
})

test('matrixBlocks, pairTally and fmtRatio', () => {
  assert.equal(fmtRatio(9.9), '9.90')
  assert.equal(fmtRatio(21), '21.00')
  const ws = ['#FFFFFF', '#000000']
  assert.deepEqual(matrixBlocks(COLOURS.slice(0, 13), ws).map((b) => b.rows.length), [7, 6])
  assert.deepEqual(matrixBlocks(COLOURS.slice(0, 5), ws).map((b) => b.rows.length), [5])
  const split = matrixBlocks(COLOURS.slice(0, 17), ws)
  assert.equal(split.length, 6)
  assert.ok(split.every((b) => b.cols.length <= MATRIX_COLS && b.rows.length <= MATRIX_ROWS))
  assert.equal(split.filter((b) => b.first).length, 1)
  // Black and white: the pair itself and each against the opposite ground; a colour against its own twin is no pair.
  assert.deepEqual(pairTally(['#000000', '#FFFFFF'], ws, contrast), { pass: 3, total: 3 })
  assert.equal(pairTally(['#123456', '#123456'], ws, contrast).total, 4)
})
