// The design system book as images: one 2K PNG per A4 page, in a zip.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS DRAWN, AND WHY IT IS NOT THE PDF BOOK'S RASTER
// ─────────────────────────────────────────────────────────────────────────────
// The PDF book (utils/designSystemBook.js) is HTML for the browser's print
// engine, and it is built on the server so the Pro generator never reaches the
// client bundle. A PNG cannot come from that HTML without rasterising it, and
// utils/styleGuideRaster.js explains why that route is wrong (a foreignObject
// drops webfonts, html2canvas reimplements layout badly). So this follows the
// same answer: the pages are known structures over known data, drawn directly.
//
// It covers the same sections as the PDF book — cover, contents, colour (with
// the specification bands and the contrast matrix), the gradient, typography
// (families and scale), every token, and the colophon — and lays them out for a
// 1448 x 2048 px page (A4 at 2K), not for a printer's margins.
//
// IMPORT RULE. This file must never import designSystemBook.js or the templates
// under exportTemplates/book/: tests/unit/export-document.test.js walks the
// client import graph and fails if the Pro HTML generator is reachable. The
// shared pieces (the design reader, the token list, the colour maths) live in
// modules that have no such constraint.
//
// THE HONEST LIMIT. Like the Pro previews, this runs in the browser, so the Pro
// check in ExportPanel.runExport is a courtesy and not protection. The server
// cannot draw a canvas without a dependency the project does not carry.
//
// ─────────────────────────────────────────────────────────────────────────────
// SHAPE
// ─────────────────────────────────────────────────────────────────────────────
// Everything that decides what goes where is a pure function of the design and
// a `measure(text, font)` function, and returns plain data:
//
//   planBookPages(design, opts)  → which pages exist, in order, with their contents
//   buildBookPages(design, opts) → the same pages with their draw operations
//
// `measure` is injected because wrapping needs real glyph widths. The browser
// passes a canvas measurer once the fonts have loaded; a test passes nothing and
// gets estimateWidth(). Only renderBookPages / renderBookPng touch a canvas.
//
// Authored in a 724 x 1024 sheet and drawn at exactly 2x, so every measurement
// reads in familiar CSS pixels and a 1px rule lands on two whole device pixels.
import { contrast, grade, inkFor, typeLadder } from './styleGuideExport.js'
import { readBook } from './bookModel.js'
import { roleLabel, slotLandsBook, slotPlaced } from './paletteRoles.js'
import { colorName } from './paletteNames.js'
import { deriveRoles, hexToOklch, mixHex, softInk } from './exportTemplates/roles.js'
import { bookTokens } from './bookTokens.js'
import { pairTally, plural, matrixBlocks, systemSentence, GLYPH_STRIP, GLYPH_STRIP_PT } from './exportTemplates/shared.js'

// ── Geometry ────────────────────────────────────────────────────────────────

export const PAGE = Object.freeze({ width: 724, height: 1024 })
export const SCALE = 2
// What each PNG measures: 1448 x 2048, A4 portrait at 2K.
export const PIXELS = Object.freeze({ width: PAGE.width * SCALE, height: PAGE.height * SCALE })

export const MARGIN = 52
const CONTENT_W = PAGE.width - MARGIN * 2           // 620
const RIGHT = PAGE.width - MARGIN                   // 672
const TOP = 84                                      // first line of a page's content
const BOTTOM = 944                                  // last line of a page's content
const FOOT_RULE = 972
// The baseline of the credit and the folio, on content pages and openings alike.
export const FOOT_Y = FOOT_RULE + 24
// The gap between the bottom of an opening's big section number and the foot line.
const GHOST_GAP = 40

const BANDS_PER_PAGE = 5
// Five rows and the 24 gaps between them must fit under the first page's lede.
const BAND_H = 130
const BAND_GAP = 24
// A palette page with this many rows or fewer draws them taller and further apart.
export const ROOMY_MAX_ROWS = 3
export const ROOMY_BAND_H = 200
export const ROOMY_BAND_STEP = ROOMY_BAND_H + BAND_GAP
const TOKENS_ROW_PAD = 10
const TOKENS_LINE = 14
// The token table: where it starts under the introduction on the first page and
// on the pages after it, the room each has, and the columns (the value wraps).
const TOKEN_TOP = Object.freeze({ first: TOP + 108, rest: TOP + 56 })
const TOKEN_ROOM = Object.freeze({ first: BOTTOM - TOKEN_TOP.first, rest: BOTTOM - TOKEN_TOP.rest })
const TOKEN_COLS = Object.freeze({ nameX: MARGIN, valueX: MARGIN + 248, valueWidth: CONTENT_W - 248 })

const NEAR_PAPER = 1.35
const FALLBACK_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
const DARK_FIELD = '#111114'

/**
 * The kit's darkest colour by relative luminance: the lowest luminance is the
 * smallest contrast ratio against black. DARK_FIELD only stands in for an empty palette.
 */
export function darkestColour(palette) {
  let best = null
  let bestRatio = Infinity
  for (const hex of palette || []) {
    const ratio = contrast(hex, '#000000')
    if (ratio < bestRatio) { best = hex; bestRatio = ratio }
  }
  return best || DARK_FIELD
}

/** The credit line, on the cover and the foot of every page when the free-tier mark is on. */
export const CREDIT_LINE = 'Made with UIL4B · uil4b.com'

const round = (n) => Math.round(n * 100) / 100
const pad2 = (n) => String(n).padStart(2, '0')

// ── Text: fonts, measuring, wrapping ────────────────────────────────────────

/** A canvas font string: the kit's family first, then a stack that still reads. */
export const face = (weight, px, family) => `${weight} ${px}px "${family}", ${FALLBACK_STACK}`
const mono = (weight, px) => `${weight} ${px}px ${MONO_STACK}`

/**
 * A width estimate for tests and for planning without a canvas. Deliberately a
 * little generous (0.55em a glyph, 0.62em in monospace) so a layout that fits
 * here fits with the real face too.
 */
export function estimateWidth(text, font) {
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(String(font))?.[1]) || 12
  const advance = String(font).includes('monospace') ? 0.62 : 0.55
  return [...String(text ?? '')].length * px * advance
}

/**
 * How far `text` hangs below its baseline in `font`. A canvas measurer carries a
 * `descent` (actualBoundingBoxDescent); the pure plan has none, so it estimates
 * 3% of the size, which is more than a lining numeral overshoots.
 */
export function glyphDescent(measure, text, font) {
  if (typeof measure?.descent === 'function') return Math.max(0, measure.descent(text, font))
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(String(font))?.[1]) || 12
  return px * 0.03
}

/**
 * A measurer that also counts a face's letter spacing (in em): every character
 * adds `em` times the font size, which is what the canvas draws. It wraps the
 * canvas measurer in the browser and the estimator in a test, and keeps the
 * canvas measurer's `descent`.
 */
export function withTracking(measure, em) {
  if (!em) return measure
  const tracked = (str, font) => {
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(String(font))?.[1]) || 12
    return measure(str, font) + [...String(str ?? '')].length * em * px
  }
  if (typeof measure.descent === 'function') tracked.descent = measure.descent
  return tracked
}

function ellipsize(text, maxWidth, font, measure) {
  let t = String(text).replace(/…$/, '').trimEnd()
  while (t.length > 1 && measure(`${t}…`, font) > maxWidth) t = t.slice(0, -1).trimEnd()
  return `${t}…`
}

/** One line, cut with an ellipsis if it would run past `maxWidth`. */
export function fitLine(text, maxWidth, font, measure = estimateWidth) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  return measure(t, font) <= maxWidth ? t : ellipsize(t, maxWidth, font, measure)
}

/**
 * Wrap `text` to `maxWidth`. A word wider than a line is split rather than left
 * to run off the page. With `maxLines`, anything past it is cut and the last
 * line ends in an ellipsis, so a long name can never push the page out of shape.
 */
export function wrapText(text, maxWidth, font, measure = estimateWidth, { maxLines = Infinity } = {}) {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines = []
  let line = ''
  for (let word of words) {
    while (measure(word, font) > maxWidth && word.length > 1) {
      let n = word.length - 1
      while (n > 1 && measure(word.slice(0, n), font) > maxWidth) n -= 1
      if (line) { lines.push(line); line = '' }
      lines.push(word.slice(0, n))
      word = word.slice(n)
    }
    const next = line ? `${line} ${word}` : word
    if (!line || measure(next, font) <= maxWidth) line = next
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = ellipsize(kept[maxLines - 1], maxWidth, font, measure)
    return kept
  }
  return lines
}

/**
 * wrapText for an introduction: if the last line would be one word on its own,
 * the last word of the line above comes down to keep it company (when the pair
 * still fits the width and the line above keeps a word).
 */
export function balanceLines(text, maxWidth, font, measure = estimateWidth, opts = {}) {
  const lines = wrapText(text, maxWidth, font, measure, opts)
  const n = lines.length
  if (n < 2 || /\s/.test(lines[n - 1]) || lines[n - 1].endsWith('…')) return lines
  const above = lines[n - 2].split(' ')
  if (above.length < 2) return lines
  const moved = above.pop()
  const last = `${moved} ${lines[n - 1]}`
  if (measure(last, font) > maxWidth) return lines
  return [...lines.slice(0, n - 2), above.join(' '), last]
}

// ── Pagination ──────────────────────────────────────────────────────────────

/**
 * Split into the same NUMBER of groups a plain chunk would, spread evenly. A
 * plain chunk of six at five-a-page leaves a page carrying one colour, which is
 * the most obviously unfinished thing a book can do.
 */
export function balancedChunk(list, max) {
  if (list.length <= max) return [list]
  const pages = Math.ceil(list.length / max)
  const small = Math.floor(list.length / pages)
  const big = list.length % pages
  const out = []
  let at = 0
  for (let g = 0; g < pages; g += 1) {
    const size = small + (g < big ? 1 : 0)
    out.push(list.slice(at, at + size))
    at += size
  }
  return out
}

/**
 * Pack items of different heights into pages. The page count is the least the
 * capacities allow; the items are then spread over that many pages as evenly as
 * they will go, so the last page is not a stub. `capFirst` is the room on the
 * first page (it carries the introduction), `capRest` on the others.
 */
export function paginate(items, heightOf, capFirst, capRest = capFirst) {
  if (!items.length) return []
  const heights = items.map(heightOf)
  const pack = (limit) => {
    const groups = [[]]
    let used = 0
    heights.forEach((h, i) => {
      const room = Math.min(limit, groups.length === 1 ? capFirst : capRest)
      if (groups[groups.length - 1].length && used + h > room) { groups.push([]); used = 0 }
      groups[groups.length - 1].push(items[i])
      used += h
    })
    return groups
  }
  const natural = pack(Infinity)
  if (natural.length === 1) return natural
  const total = heights.reduce((a, b) => a + b, 0)
  for (let limit = Math.ceil(total / natural.length); limit < capRest; limit += 4) {
    const groups = pack(limit)
    if (groups.length <= natural.length) return groups
  }
  return natural
}

// ── The design, read once ───────────────────────────────────────────────────

const SYSTEM_NAMES = {
  auto: 'tonal', complement: 'complementary', analogous: 'analogous',
  triadic: 'triadic', split: 'split-complementary', tetradic: 'tetradic',
  monochromatic: 'monochromatic', custom: 'custom',
}
const systemName = (harmony) => SYSTEM_NAMES[harmony] || 'tonal'

function rgbOf(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
}

function hslOf(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
}

function oklchOf(hex) {
  const ok = hexToOklch(hex)
  return `oklch(${(ok.l * 100).toFixed(1)}% ${ok.c.toFixed(3)} ${Math.round(ok.h)})`
}

/**
 * A name for each palette entry. Two colours that land on the same name (two
 * near blues are both "Cobalt") would read as one colour listed twice, so the
 * later ones are numbered: Cobalt, Cobalt 2, Cobalt 3.
 */
export function uniqueColourNames(palette) {
  const used = new Set()
  const seen = new Map()
  return (palette || []).map((hex) => {
    const base = colorName(hex)
    let n = (seen.get(base) || 0) + 1
    let name = n === 1 ? base : `${base} ${n}`
    while (used.has(name)) { n += 1; name = `${base} ${n}` }
    seen.set(base, n)
    used.add(name)
    return name
  })
}

/** Everything the plan and the layout read, worked out once. */
function readContext(design, { projectName, watermark, measure, date, missingFonts }) {
  const d = readBook(design)
  const name = String(projectName ?? '').trim() || 'Design System'
  const base = d.base
  const roles = deriveRoles(d.palette, { contrast, primary: base || d.palette[0] })
  const dark = darkestColour(d.palette)
  const field = base || dark
  const fieldInk = inkFor(field).ink
  const iso = date.toISOString().slice(0, 10)
  return {
    d, name, watermark, measure, iso,
    // Headings are drawn with the kit's tracking, so they are measured with it too.
    headMeasure: withTracking(measure, d.headingSpacing),
    names: uniqueColourNames(d.palette),
    ladder: typeLadder(d),
    tokens: bookTokens(d),
    paper: roles.paper, ink: roles.ink, muted: roles.muted, rule: roles.rule,
    field, fieldInk, dark,
    // The same ink the cover is set in, toned down to a solid secondary colour that
    // still passes on the field (an opacity would let the ratio fall unchecked).
    fieldSoft: softInk(fieldInk, field, contrast, { amount: 0.82 }),
    edge: mixHex(roles.ink, roles.paper, 0.22),
    missingFonts: Array.isArray(missingFonts) ? missingFonts : [],
    hasPalette: d.palette.length > 0,
  }
}

// ── The page plan ───────────────────────────────────────────────────────────

/**
 * Which pages the book has, in order, and what each carries. Plain data: no draw
 * operations, so a test can read the structure without a canvas.
 *
 * Page kinds: cover, contents, opening, palette, matrix, gradient, families,
 * scale, tokens, colophon. Each also has `section`, `folio` (its 1-based number),
 * and `leaf` (its contents entry, or null on a continuation page).
 */
export function planBookPages(design, {
  projectName = 'Design System', watermark = true, measure = estimateWidth, date = new Date(), missingFonts = [],
} = {}) {
  const c = readContext(design, { projectName, watermark, measure, date, missingFonts })
  const { d } = c
  const pages = []
  const add = (kind, section, data = {}) => pages.push({ kind, section, leaf: null, ...data })

  add('cover', '')
  add('contents', 'Contents')

  if (c.hasPalette) {
    const tally = pairTally(d.palette, ['#FFFFFF', '#000000'], contrast)
    add('opening', 'Colour', {
      num: '01', title: 'Colour', field: c.field, ink: c.fieldInk,
      abstract: `${plural(d.palette.length, 'colour')}. ${tally.pass} of ${tally.total} pairs pass AA for text.`,
    })
    const indexed = d.palette.map((hex, index) => ({ index, hex }))
    balancedChunk(indexed, BANDS_PER_PAGE).forEach((items, gi) => {
      add('palette', 'Colour', { items, first: gi === 0, leaf: gi === 0 ? 'The palette' : null })
    })
    // One colour has nothing to be measured against but white and black, which the
    // palette page already shows as its ink ratios: no matrix page.
    // Every colour is a row. A wide palette is cut into column groups and row pages, as the HTML book does.
    const blocks = d.palette.length > 1 ? matrixBlocks(d.palette, ['#FFFFFF', '#000000']) : []
    blocks.forEach((block, gi) => {
      add('matrix', 'Colour', {
        rows: block.rows, cols: block.cols, first: block.first,
        leaf: gi === 0 ? 'Contrast matrix' : null,
      })
    })
  }
  if (d.gradient) add('gradient', 'Colour', { leaf: 'The gradient' })

  add('opening', 'Typography', {
    num: '02', title: 'Typography', field: c.dark, ink: inkFor(c.dark).ink,
    abstract: `${[...new Set([d.heading, d.body])].join(' and ')}, ${d.ratio} scale from ${d.baseSize}px.`,
  })
  add('families', 'Typography', { leaf: 'The families' })
  add('scale', 'Typography', { leaf: 'The scale' })

  const tokenField = d.palette[1] || d.palette[0] || DARK_FIELD
  add('opening', 'Tokens', {
    num: '03', title: 'Tokens', field: tokenField, ink: inkFor(tokenField).ink,
    abstract: `${plural(c.tokens.length, 'custom property', 'custom properties')}, named by role.`,
  })
  const valueW = TOKEN_COLS.valueWidth
  const rows = c.tokens.map((t) => {
    const lines = wrapText(t.value, valueW, mono(400, 10), measure)
    return { name: t.name, lines: lines.length ? lines : [''], height: Math.max(1, lines.length) * TOKENS_LINE + TOKENS_ROW_PAD }
  })
  paginate(rows, (r) => r.height, TOKEN_ROOM.first, TOKEN_ROOM.rest).forEach((items, gi) => {
    add('tokens', 'Tokens', { items, first: gi === 0, total: c.tokens.length, leaf: gi === 0 ? 'Custom properties' : null })
  })

  add('colophon', 'Colophon', { title: 'Colophon' })

  pages.forEach((p, i) => { p.folio = i + 1; p.id = `${p.kind}-${pad2(i + 1)}` })
  return { pages, ctx: c }
}

/** The contents entries, from the planned pages: openings, their leaves, the colophon. */
export function contentsEntries(pages) {
  const out = []
  for (const p of pages) {
    if (p.kind === 'opening') out.push({ num: p.num, title: p.title, folio: p.folio, sub: false })
    else if (p.kind === 'colophon') out.push({ num: '', title: p.title, folio: p.folio, sub: false })
    else if (p.leaf) out.push({ num: '', title: p.leaf, folio: p.folio, sub: true })
  }
  return out
}

/** `page-01.png`, with enough digits that the files sort in order. */
export function pageFileName(index, total) {
  const digits = Math.max(2, String(total).length)
  return `page-${String(index + 1).padStart(digits, '0')}.png`
}

// ── Draw-operation helpers ──────────────────────────────────────────────────

const text = (t, x, y, font, fill, extra = {}) => ({ op: 'text', text: t, x, y, font, fill, ...extra })
const rect = (x, y, w, h, fill, radius = 0) => ({ op: 'rect', x, y, w, h, fill, ...(radius ? { radius } : {}) })
const outline = (x, y, w, h, stroke, radius = 0) => ({ op: 'strokeRect', x, y, w, h, stroke, ...(radius ? { radius } : {}) })
const hair = (x1, y, x2, stroke, dash) => ({ op: 'line', x1, y1: y, x2, y2: y, stroke, ...(dash ? { dash } : {}) })

// A label is sentence case in the body face at weight 500, a point above the size
// it was drawn at as a tracked cap, with no letter spacing (Dylan's type rule).
const labelText = (t, x, y, fill, { px = 8, weight = 500, align, family } = {}, c) =>
  text(String(t), x, y, face(weight, px + 1, family || c.d.body), fill, align ? { align } : {})

/** "ANALOGOUS −30°" to "Analogous −30°": the role names are stored in capitals. */
const sentence = (t) => { const s = String(t).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1) }

/** The role label of a palette slot; a colour past the generated five says it has no place yet. */
const roleText = (harmony, index) => sentence(roleLabel(harmony, index)) + (slotPlaced(index) ? '' : ', unassigned')

const heading = (c, px) => face(c.d.headingWeight, px, c.d.heading)
const bodyFont = (c, px, weight = c.d.bodyWeight) => face(weight, px, c.d.body)
const headSpacing = (c, px) => (c.d.headingSpacing ? { letterSpacing: round(c.d.headingSpacing * px) } : {})

/** Running head above, folio and credit below. Not drawn on the cover or the full-bleed openings. */
function frame(c, page) {
  const ops = [rect(0, 0, PAGE.width, PAGE.height, c.paper)]
  const label = page.section || ''
  const nameFont = face(500, 9.5, c.d.body)
  ops.push(
    labelText(fitLine(c.name, 330, nameFont, c.measure), MARGIN, 40, c.muted, { px: 8.5 }, c),
    labelText(label, RIGHT, 40, c.muted, { px: 8.5, align: 'right' }, c),
    hair(MARGIN, 54, RIGHT, c.rule),
  )
  ops.push(...foot(c, page, c.muted, c.rule))
  return ops
}

function foot(c, page, fill, ruleColour, { rule = true } = {}) {
  const ops = []
  if (rule) ops.push(hair(MARGIN, FOOT_RULE, RIGHT, ruleColour))
  const left = c.watermark ? CREDIT_LINE : 'Design system book'
  ops.push(text(left, MARGIN, FOOT_Y, face(400, 9, c.d.body), fill))
  const folio = pad2(page.folio)
  ops.push(text(folio, RIGHT, FOOT_Y, face(600, 10, c.d.body), fill, { align: 'right' }))
  return ops
}

/** The page title and its lede. Returns the ops and where the content starts. */
function pageHead(c, title, lede, { first = true } = {}) {
  const ops = [text(title, MARGIN, TOP + 30, heading(c, 30), c.ink, headSpacing(c, 30))]
  if (!first) {
    const w = c.headMeasure(title, heading(c, 30))
    ops.push(labelText('continued', MARGIN + w + 12, TOP + 30, c.muted, { px: 8 }, c))
    return { ops, y: TOP + 56 }
  }
  const lines = balanceLines(lede, 470, bodyFont(c, 11.5, 400), c.measure, { maxLines: 2 })
  lines.forEach((line, i) => ops.push(text(line, MARGIN, TOP + 56 + i * 17, bodyFont(c, 11.5, 400), c.muted)))
  return { ops, y: TOP + 56 + Math.max(1, lines.length) * 17 + 18 }
}

// ── Pages ───────────────────────────────────────────────────────────────────

/** How far the cover's title block moves down when there is no colour strip. */
export const COVER_NO_STRIP_DROP = 144

function coverOps(c) {
  const { d } = c
  const ops = [rect(0, 0, PAGE.width, PAGE.height, c.field)]
  ops.push(
    labelText('Design system book', MARGIN, 64, c.fieldSoft, { px: 9.5 }, c),
    labelText(`Issued ${c.iso}`, RIGHT, 64, c.fieldSoft, { px: 9.5, align: 'right' }, c),
  )

  // The name at the largest size that sets in three lines or fewer; if even the
  // smallest cannot, it is cut with an ellipsis rather than left to run over.
  const sizes = [96, 80, 68, 58, 50, 42, 36]
  let size = sizes[sizes.length - 1]
  let lines = null
  for (const s of sizes) {
    const wrapped = wrapText(c.name, CONTENT_W, heading(c, s), c.headMeasure)
    if (wrapped.length <= 3) { size = s; lines = wrapped; break }
  }
  if (!lines) lines = wrapText(c.name, CONTENT_W, heading(c, size), c.headMeasure, { maxLines: 3 })
  const leading = Math.round(size * 1.04)
  const hasStrip = coverStrip(c).length > 0
  const stripTop = PAGE.height - 188
  const metaH = 70
  // With no colour strip the title block drops by the strip's room, so the page
  // does not end in an empty band under it.
  const titleBottom = stripTop - metaH - 36 + (hasStrip ? 0 : COVER_NO_STRIP_DROP)
  const firstBaseline = titleBottom - (lines.length - 1) * leading
  lines.forEach((line, i) => ops.push(text(line, MARGIN, firstBaseline + i * leading, heading(c, size), c.fieldInk, headSpacing(c, size))))

  const metaY = titleBottom + 44
  ops.push(
    hair(MARGIN, titleBottom + 18, MARGIN + 48, c.fieldInk),
    text(`${d.heading} and ${d.body}`, MARGIN, metaY, face(600, 13, d.body), c.fieldInk),
    text(
      `${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'}  ·  ${c.tokens.length} tokens  ·  ${d.baseSize}px base  ·  ${d.ratio} scale`,
      MARGIN, metaY + 22, face(400, 11, d.body), c.fieldSoft,
    ),
  )

  // The whole palette as a full-bleed strip, so the system is visible before a word is read.
  const bars = coverStrip(c)
  bars.forEach((hex, i) => {
    const x0 = Math.round((PAGE.width * i) / bars.length)
    const x1 = Math.round((PAGE.width * (i + 1)) / bars.length)
    ops.push(rect(x0, stripTop, x1 - x0, PAGE.height - stripTop, hex))
  })
  const creditY = metaY + 22
  if (c.watermark) ops.push(text(CREDIT_LINE, RIGHT, creditY, face(400, 9, d.body), c.fieldSoft, { align: 'right' }))
  return ops
}

/** The colours drawn along the foot of the cover: all but the one the cover already is. */
function coverStrip(c) {
  const rest = c.d.palette.filter((hex) => hex !== c.field).slice(0, 16)
  return rest
}

function contentsOps(c, page, entries) {
  const { d } = c
  const ops = frame(c, page)
  ops.push(text('Contents', MARGIN, TOP + 46, heading(c, 44), c.ink, headSpacing(c, 44)))
  const listW = 380
  let y = TOP + 120
  for (const e of entries) {
    if (e.sub) {
      const font = bodyFont(c, 11, 400)
      const title = fitLine(e.title, listW - 120, font, c.measure)
      ops.push(text(title, MARGIN + 20, y, font, c.muted))
      ops.push(text(pad2(e.folio), MARGIN + listW, y, face(400, 10, d.body), c.muted, { align: 'right' }))
      y += 22
      continue
    }
    y += y === TOP + 120 ? 0 : 14
    const font = heading(c, 20)
    const title = fitLine(e.title, listW - 120, font, c.headMeasure)
    ops.push(text(title, MARGIN, y, font, c.ink, headSpacing(c, 20)))
    const end = MARGIN + c.headMeasure(title, font) + 10
    const folioW = c.measure(pad2(e.folio), face(600, 12, d.body))
    if (end < MARGIN + listW - folioW - 10) ops.push(hair(end, y - 3, MARGIN + listW - folioW - 10, c.edge, [1, 3]))
    ops.push(text(pad2(e.folio), MARGIN + listW, y, face(600, 12, d.body), c.ink, { align: 'right' }))
    y += 26
  }

  // The aside: what the book is, and four facts about it.
  const ax = MARGIN + listW + 44
  const aw = RIGHT - ax
  // The column rule ends at the last stat rule; its end is set once the stats are placed.
  const colRule = { op: 'line', x1: ax - 22, y1: TOP + 100, x2: ax - 22, y2: TOP + 560, stroke: c.rule }
  ops.push(colRule)
  ops.push(labelText('About this book', ax, TOP + 120, c.muted, { px: 8 }, c))
  const prose = [`The colour, type and token specification for ${c.name}.`]
  let ay = TOP + 148
  for (const para of prose) {
    const lines = wrapText(para, aw, bodyFont(c, 10, 400), c.measure, { maxLines: 8 })
    lines.forEach((line, i) => ops.push(text(line, ax, ay + i * 15, bodyFont(c, 10, 400), c.ink)))
    ay += lines.length * 15 + 12
  }
  ay += 10
  const facts = [['Colours', d.palette.length], ['Type steps', c.ladder.length], ['Tokens', c.tokens.length], ['Issued', c.iso]]
  for (const [label, value] of facts) {
    ops.push(hair(ax, ay - 14, RIGHT, c.rule))
    ops.push(labelText(label, ax, ay + 2, c.muted, { px: 7.5 }, c))
    ops.push(text(String(value), RIGHT, ay + 2, face(600, 11, d.body), c.ink, { align: 'right' }))
    ay += 30
  }
  ops.push(hair(ax, ay - 14, RIGHT, c.rule))
  colRule.y2 = ay - 14
  return ops
}

function openingOps(c, page) {
  const { d } = c
  const soft = softInk(page.ink, page.field, contrast, { amount: 0.82 })
  const ops = [rect(0, 0, PAGE.width, PAGE.height, page.field)]
  ops.push(labelText(`Section ${Number(page.num)}`, MARGIN, 64, soft, { px: 9.5 }, c))
  // The numeral is a ghost: large enough to read as a shape, close enough to the
  // field that it never competes with the title.
  const ghost = mixHex(page.ink, page.field, 0.16)
  // Its bottom edge (baseline plus the descent the face really has) sits GHOST_GAP
  // above the foot line, so it can never touch the folio.
  const ghostFont = face(c.d.headingWeight, 380, d.heading)
  ops.push(text(page.num, RIGHT + 8, FOOT_Y - GHOST_GAP - glyphDescent(c.measure, page.num, ghostFont), ghostFont, ghost, { align: 'right' }))

  const size = 64
  const titleLines = wrapText(page.title, 470, heading(c, size), c.headMeasure, { maxLines: 2 })
  titleLines.forEach((line, i) => ops.push(text(line, MARGIN, 300 + i * 68, heading(c, size), page.ink, headSpacing(c, size))))
  const abstractTop = 300 + (titleLines.length - 1) * 68 + 44
  const lines = balanceLines(page.abstract, 360, bodyFont(c, 13, 400), c.measure, { maxLines: 6 })
  lines.forEach((line, i) => ops.push(text(line, MARGIN, abstractTop + i * 20, bodyFont(c, 13, 400), page.ink)))
  ops.push(text(c.watermark ? CREDIT_LINE : 'Design system book', MARGIN, FOOT_Y, face(400, 9, d.body), soft))
  ops.push(text(pad2(page.folio), RIGHT, FOOT_Y, face(600, 10, d.body), soft, { align: 'right' }))
  return ops
}

function paletteOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'The palette', `Each colour with its role in the ${systemName(d.harmony)} system, its values in three notations, and the ink that reads on it.`, { first: page.first })
  ops.push(...head.ops)
  if (d.palette.length === 1) return soloPaletteOps(c, page.items[0], ops, head.y)
  let y = head.y
  // A page of three rows or fewer has the room to breathe: taller swatches, further apart.
  const roomy = page.items.length <= ROOMY_MAX_ROWS
  const bandH = roomy ? ROOMY_BAND_H : BAND_H
  const step = roomy ? ROOMY_BAND_STEP : BAND_H + BAND_GAP
  const lineH = roomy ? 20 : 15
  page.items.forEach(({ index, hex }) => {
    const { ink, ratio, label } = inkFor(hex)
    const chipW = 170
    ops.push(rect(MARGIN, y, chipW, bandH, hex, 3))
    if (contrast(hex, c.paper) < NEAR_PAPER) ops.push(outline(MARGIN, y, chipW, bandH, c.edge, 3))
    ops.push(text(pad2(index + 1), MARGIN + 14, y + 26, face(600, 11, d.body), ink, { tabular: true }))
    ops.push(text(hex, MARGIN + 14, y + bandH - 16, face(700, 16, d.body), ink))

    const x2 = MARGIN + chipW + 24
    const w2 = 176
    ops.push(labelText(roleText(d.harmony, index), x2, y + 16, c.muted, { px: 8 }, c))
    const nameLines = wrapText(c.names[index], w2, heading(c, 21), c.headMeasure, { maxLines: 2 })
    nameLines.forEach((line, i) => ops.push(text(line, x2, y + 44 + i * 24, heading(c, 21), c.ink, headSpacing(c, 21))))
    const landsTop = y + 44 + (nameLines.length - 1) * 24 + 22
    // A colour with no place in the interface has no line here; the label says so.
    const lands = slotPlaced(index) ? wrapText(slotLandsBook(index), w2, bodyFont(c, 9.5, 400), c.measure, { maxLines: nameLines.length > 1 ? 2 : 3 }) : []
    lands.forEach((line, i) => ops.push(text(line, x2, landsTop + i * 13, bodyFont(c, 9.5, 400), c.muted)))

    const x3 = x2 + w2 + 24
    const w3 = RIGHT - x3
    notationRows(hex).forEach(([k, v], i) => {
      ops.push(labelText(k, x3, y + 16 + i * lineH, c.muted, { px: 7.5 }, c))
      ops.push(text(v, x3 + 42, y + 16 + i * lineH, mono(500, 9.5), c.ink))
    })
    const ruleAt = roomy ? 100 : 68
    ops.push(hair(x3, y + ruleAt, RIGHT, c.rule))
    const cells = [['Ink', label], ['Ratio', formatRatio(ratio)], ['Grade', grade(ratio)]]
    cells.forEach(([k, v], i) => {
      const cx = x3 + (w3 / 3) * i
      ops.push(labelText(k, cx, y + ruleAt + 18, c.muted, { px: 7.5 }, c))
      ops.push(text(v, cx, y + ruleAt + 34, face(600, 11, d.body), c.ink))
    })
    const chipH = roomy ? 18 : 12
    const chipY = y + bandH - 1 - chipH
    ops.push(labelText('Tints 80, 60, 40, 20%', x3, chipY - 5, c.muted, { px: 7 }, c))
    ;[80, 60, 40, 20].forEach((pct, i) => {
      const tint = mixHex(hex, c.paper, pct / 100)
      const tw = (w3 - 12) / 4
      const tx = x3 + i * (tw + 4)
      ops.push(rect(tx, chipY, tw, chipH, tint))
      if (contrast(tint, c.paper) < NEAR_PAPER) ops.push(outline(tx, chipY, tw, chipH, c.edge))
    })

    y += step
  })
  return ops
}

/** The swatch of a one-colour kit, the full width of the page. */
export const SOLO_SWATCH = Object.freeze({ w: CONTENT_W, h: 260 })

/**
 * A one-colour kit's palette page. The one swatch is the page's subject, so it is
 * drawn the full width with the tints large under it, and the ratios it would have
 * had a matrix page for (against white and against black) sit in the same row.
 */
function soloPaletteOps(c, { index, hex }, ops, top) {
  const { d } = c
  const { ink } = inkFor(hex)
  const { w, h } = SOLO_SWATCH
  ops.push(rect(MARGIN, top, w, h, hex, 3))
  if (contrast(hex, c.paper) < NEAR_PAPER) ops.push(outline(MARGIN, top, w, h, c.edge, 3))
  // One colour needs no number.
  ops.push(text(hex, MARGIN + 22, top + h - 26, face(700, 34, d.body), ink))

  let y = top + h + 34
  const left = 270
  ops.push(labelText(roleText(d.harmony, index), MARGIN, y, c.muted, { px: 8 }, c))
  const nameLines = wrapText(c.names[index], left, heading(c, 28), c.headMeasure, { maxLines: 2 })
  nameLines.forEach((line, i) => ops.push(text(line, MARGIN, y + 34 + i * 32, heading(c, 28), c.ink, headSpacing(c, 28))))
  const landsTop = y + 34 + (nameLines.length - 1) * 32 + 24
  const lands = slotPlaced(index) ? wrapText(slotLandsBook(index), left, bodyFont(c, 10, 400), c.measure, { maxLines: 3 }) : []
  lands.forEach((line, i) => ops.push(text(line, MARGIN, landsTop + i * 14, bodyFont(c, 10, 400), c.muted)))

  const x3 = MARGIN + left + 50
  notationRows(hex).forEach(([k, v], i) => {
    ops.push(labelText(k, x3, y + i * 22, c.muted, { px: 7.5 }, c))
    ops.push(text(v, x3 + 48, y + i * 22, mono(500, 10), c.ink))
  })
  y = Math.max(y + 3 * 22, landsTop + (lands.length - 1) * 14) + 28

  // The ink ratios: the colour as a background, under white text and under black.
  ops.push(hair(MARGIN, y, RIGHT, c.rule))
  const best = inkFor(hex).label
  const cells = [['On white', contrast(hex, '#FFFFFF')], ['On black', contrast(hex, '#000000')]]
  const colW = CONTENT_W / 3
  cells.forEach(([k, ratio], i) => {
    const cx = MARGIN + colW * i
    ops.push(labelText(k, cx, y + 24, c.muted, { px: 7.5 }, c))
    ops.push(text(formatRatio(ratio), cx, y + 50, face(600, 18, d.body), c.ink))
    ops.push(text(grade(ratio), cx, y + 68, face(500, 10.5, d.body), c.muted))
  })
  ops.push(labelText('Best ink', MARGIN + colW * 2, y + 24, c.muted, { px: 7.5 }, c))
  ops.push(text(best, MARGIN + colW * 2, y + 50, face(600, 18, d.body), c.ink))
  ops.push(hair(MARGIN, y + 86, RIGHT, c.rule))
  y += 86 + 34

  ops.push(labelText('Tints 80, 60, 40, 20%', MARGIN, y, c.muted, { px: 7.5 }, c))
  const gap = 8
  const tw = (CONTENT_W - gap * 3) / 4
  ;[80, 60, 40, 20].forEach((pct, i) => {
    const tint = mixHex(hex, c.paper, pct / 100)
    const tx = MARGIN + i * (tw + gap)
    ops.push(rect(tx, y + 12, tw, SOLO_TINT_H, tint, 2))
    if (contrast(tint, c.paper) < NEAR_PAPER) ops.push(outline(tx, y + 12, tw, SOLO_TINT_H, c.edge, 2))
    ops.push(text(`${pct}%`, tx, y + 12 + SOLO_TINT_H + 18, mono(500, 9.5), c.muted))
  })
  return ops
}
const SOLO_TINT_H = 72

const notationRows = (hex) => [['HEX', hex], ['RGB', rgbOf(hex)], ['HSL', hslOf(hex)], ['OKLCH', oklchOf(hex)]]

/** A contrast ratio as drawn: always two decimals, so 7 reads "7.00:1" and the column aligns. */
export const formatRatio = (r) => `${Number(r).toFixed(2)}:1`

/** The class of a contrast cell: weight and shading carry it, never a hue. */
export function matrixClass(ratio) {
  return ratio >= 4.5 ? { word: 'Pass', weight: 700 } : ratio >= 3 ? { word: 'Large', weight: 500 } : { word: 'Fail', weight: 400 }
}

// How much of the ink a cell is tinted with, by class. A failing cell has no tint.
const MATRIX_TINT = Object.freeze({ pass: 0.08, large: 0.035 })

function matrixOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'Contrast matrix', 'Contrast ratio for each pair. Read a row as the background and a column as the text on it.', { first: page.first })
  ops.push(...head.ops)
  const axes = page.cols
  const rowHeadW = 95
  const cw = Math.min(64, (CONTENT_W - rowHeadW) / axes.length)
  // The ratio is set at the largest size that fits its cell (35 units wide at 13 colours).
  const figPx = [11.5, 10.5, 9.5, 8.5, 8, 7.5].find((px) => c.measure('21.00:1', face(700, px, d.body)) <= cw - 4) || 7.5
  const headH = 58
  const rowH = 48
  let y = head.y + 8

  ops.push(labelText('Background / text', MARGIN, y + headH - 12, c.muted, { px: 7.5 }, c))
  axes.forEach((hex, i) => {
    const cx = MARGIN + rowHeadW + i * cw + cw / 2
    ops.push(rect(cx - 7, y + 8, 14, 14, hex, 7))
    if (contrast(hex, c.paper) < NEAR_PAPER) ops.push(outline(cx - 7, y + 8, 14, 14, c.edge, 7))
    ops.push(text(hex.slice(1), cx, y + 42, mono(500, 8), c.ink, { align: 'center' }))
  })
  y += headH
  ops.push(hair(MARGIN, y, RIGHT, c.ink))

  page.rows.forEach((row) => {
    ops.push(rect(MARGIN, y + rowH / 2 - 7, 14, 14, row, 7))
    if (contrast(row, c.paper) < NEAR_PAPER) ops.push(outline(MARGIN, y + rowH / 2 - 7, 14, 14, c.edge, 7))
    ops.push(text(row.slice(1), MARGIN + 24, y + rowH / 2 + 3.5, mono(500, 10), c.ink))
    axes.forEach((col, i) => {
      const x = MARGIN + rowHeadW + i * cw
      if (row === col) {
        ops.push(text('–', x + cw / 2, y + rowH / 2 + 4, face(400, 12, d.body), c.muted, { align: 'center' }))
        return
      }
      const ratio = contrast(row, col)
      const { word, weight } = matrixClass(ratio)
      // The pairs that work are the ones tinted; a failing pair is left on the paper
      // and set light. Weight and shading carry the class, never a hue.
      if (word === 'Pass') ops.push(rect(x + 1, y + 1, cw - 2, rowH - 2, mixHex(c.ink, c.paper, MATRIX_TINT.pass)))
      else if (word === 'Large') ops.push(rect(x + 1, y + 1, cw - 2, rowH - 2, mixHex(c.ink, c.paper, MATRIX_TINT.large)))
      ops.push(text(formatRatio(ratio), x + cw / 2, y + rowH / 2 + 1, face(weight, figPx, d.body), word === 'Fail' ? c.muted : c.ink, { align: 'center' }))
      ops.push(labelText(word, x + cw / 2, y + rowH / 2 + 14, c.muted, { px: 6.5, align: 'center' }, c))
    })
    y += rowH
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  })

  y += 30
  const key = [
    ['Pass', '4.5:1 or more, normal text'],
    ['Large', '3:1 or more, large text'],
    ['Fail', 'under 3:1, fills only'],
  ]
  key.forEach(([word, rest], i) => {
    const w = c.measure(word, face(700, 10, d.body))
    ops.push(text(word, MARGIN, y + i * 18, face(700, 10, d.body), c.ink))
    ops.push(text(rest, MARGIN + w + 6, y + i * 18, face(400, 10, d.body), c.muted))
  })
  y += key.length * 18 + 14
  return ops
}

const GRADIENT_ROW_H = 30
const GRADIENT_CODE_GAP = 28

function gradientOps(c, page) {
  const { d } = c
  const g = d.gradient
  const css = `linear-gradient(${g.angle}deg, ${g.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})`
  const ops = frame(c, page)
  const head = pageHead(c, 'The gradient', `${g.type} gradient at ${g.angle}°, ${plural(g.stops.length, 'stop')}.`)
  ops.push(...head.ops)
  let y = head.y + 4
  ops.push({ op: 'gradient', x: MARGIN, y, w: CONTENT_W, h: 220, angle: g.angle, stops: g.stops, radius: 3 })
  y += 220 + 36

  const colX = [MARGIN, MARGIN + 150, MARGIN + 330]
  ;['Stop', 'Colour', 'Position'].forEach((h, i) => ops.push(labelText(h, colX[i], y, c.muted, { px: 8 }, c)))
  y += 10
  ops.push(hair(MARGIN, y, RIGHT, c.ink))
  // The code box is reserved first, then as many stop rows as the rest of the page
  // holds. Past that the list ends in "+N more stops"; the CSS below still carries
  // every one of them, so nothing is lost, only not listed.
  const code = wrapText(`background: ${css};`, CONTENT_W - 32, mono(400, 10), c.measure, { maxLines: 12 })
  const boxH = code.length * 15 + 28
  const fits = Math.max(0, Math.floor((BOTTOM - y - GRADIENT_CODE_GAP - boxH) / GRADIENT_ROW_H))
  const listed = g.stops.length <= fits ? g.stops.length : Math.max(0, fits - 1)
  g.stops.slice(0, listed).forEach((s, i) => {
    const mid = y + 17
    ops.push(rect(colX[0], mid - 9, 12, 12, s.color, 6))
    if (contrast(s.color, c.paper) < NEAR_PAPER) ops.push(outline(colX[0], mid - 9, 12, 12, c.edge, 6))
    ops.push(text(`Stop ${i + 1}`, colX[0] + 22, mid, face(600, 11, d.body), c.ink))
    ops.push(text(s.color, colX[1], mid, mono(500, 10.5), c.ink))
    ops.push(text(`${s.position}%`, colX[2], mid, mono(500, 10.5), c.ink))
    y += GRADIENT_ROW_H
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  })
  if (listed < g.stops.length) {
    const more = g.stops.length - listed
    ops.push(text(`+${more} more ${more === 1 ? 'stop' : 'stops'}`, MARGIN, y + 19, face(500, 10.5, d.body), c.muted))
    y += GRADIENT_ROW_H
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  }
  y += GRADIENT_CODE_GAP
  ops.push(rect(MARGIN, y, CONTENT_W, boxH, mixHex(c.ink, c.paper, 0.05), 3))
  code.forEach((line, i) => ops.push(text(line, MARGIN + 16, y + 24 + i * 15, mono(400, 10), c.ink)))
  return ops
}

// The glyph strip is drawn at GLYPH_STRIP_PT, converted to layout px (96 px to the inch).
const STRIP_PX = round(GLYPH_STRIP_PT * 4 / 3)

function familiesOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'The families', `Headings in ${d.heading} ${d.headingWeight}. Body in ${d.body} ${d.bodyWeight}.`)
  ops.push(...head.ops)
  let y = head.y + 6
  const specimens = [
    ['Headings', d.heading, d.headingWeight, d.headingSpacing],
    ['Body', d.body, d.bodyWeight, d.bodySpacing],
  ]
  for (const [role, family, weight, spacing] of specimens) {
    ops.push(hair(MARGIN, y, RIGHT, c.ink))
    ops.push(labelText(role, MARGIN, y + 20, c.muted, { px: 8.5 }, c))
    ops.push(text(
      `Weight ${weight}  ·  Tracking ${spacing ? `${spacing}em` : 'normal'}`,
      RIGHT, y + 20, face(400, 9.5, d.body), c.muted, { align: 'right' },
    ))
    // The name at the largest size that sets on one line.
    const sizes = [68, 60, 52, 44, 38, 32, 26]
    const size = sizes.find((s) => c.measure(family, face(weight, s, family)) <= CONTENT_W) || sizes[sizes.length - 1]
    const nameLine = fitLine(family, CONTENT_W, face(weight, size, family), c.measure)
    ops.push(text(nameLine, MARGIN, y + 36 + size * 0.86, face(weight, size, family), c.ink, spacing ? { letterSpacing: round(spacing * size) } : {}))
    // A sentence about this system in the face, then the character set as a small strip.
    let sy = y + 36 + size * 0.86 + 40
    const sentence = systemSentence(d, role === 'Headings' ? 'heading' : 'body')
    wrapText(sentence, CONTENT_W, face(weight, 22, family), c.measure)
      .forEach((line) => { ops.push(text(line, MARGIN, sy, face(weight, 22, family), c.ink)); sy += 32 })
    sy += 4
    wrapText(GLYPH_STRIP, CONTENT_W, face(weight, STRIP_PX, family), c.measure)
      .forEach((line) => { ops.push(text(line, MARGIN, sy, face(weight, STRIP_PX, family), c.ink)); sy += STRIP_PX * 1.5 })
    y = sy + 24
  }
  return ops
}

/** The largest a scale specimen is drawn, in layout px. */
export const SCALE_MAX_PX = 76

/**
 * The one factor every scale row is shrunk by (1 = true size). The cap is on the
 * largest step, so a steep ratio keeps its proportions; the factor drops further
 * only if the widest label would overflow the specimen column.
 */
export function scaleFactor(c, specW) {
  const { d } = c
  const maxPx = Math.max(1, ...c.ladder.map((s) => s.px))
  let k = Math.min(1, SCALE_MAX_PX / maxPx)
  for (const s of c.ladder) {
    const isHeading = s.exp >= 1
    const w = (isHeading ? c.headMeasure : c.measure)(s.name, face(isHeading ? d.headingWeight : d.bodyWeight, s.px, isHeading ? d.heading : d.body))
    if (w * k > specW) k = specW / w
  }
  return k
}

function scaleOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'The scale', `${d.ratio} ratio from a ${d.baseSize}px base.`)
  ops.push(...head.ops)
  let y = head.y + 4
  const cols = { step: MARGIN, size: MARGIN + 92, rem: MARGIN + 148, lead: MARGIN + 208, specimen: MARGIN + 270 }
  const specW = RIGHT - cols.specimen
  ;[['Step', cols.step], ['Size', cols.size], ['Rem', cols.rem], ['Leading', cols.lead], ['Specimen', cols.specimen]]
    .forEach(([h, x]) => ops.push(labelText(h, x, y, c.muted, { px: 7.5 }, c)))
  y += 10
  ops.push(hair(MARGIN, y, RIGHT, c.ink))
  // One shared factor shrinks every row, so the steps keep their true proportions.
  const k = scaleFactor(c, specW)
  for (const s of c.ladder) {
    const isHeading = s.exp >= 1
    const family = isHeading ? d.heading : d.body
    const weight = isHeading ? d.headingWeight : d.bodyWeight
    // The size column always carries the true value.
    const shown = round(s.px * k)
    const rowH = Math.max(36, Math.round(shown * 1.4))
    const base = y + rowH / 2 + shown * 0.33
    ops.push(text(s.name, cols.step, base, face(600, 10, d.body), c.ink))
    ops.push(text(`${s.px.toFixed(1)}px`, cols.size, base, mono(400, 9.5), c.muted))
    ops.push(text((s.px / 16).toFixed(2), cols.rem, base, mono(400, 9.5), c.muted))
    ops.push(text(Number(isHeading ? 1.15 : d.lineHeight).toFixed(2), cols.lead, base, mono(400, 9.5), c.muted))
    ops.push(text(s.name, cols.specimen, base, face(weight, shown, family), c.ink, isHeading ? headSpacing(c, shown) : {}))
    y += rowH
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  }
  y += 30
  if (k < 1) {
    const note = 'Specimens are reduced so the scale fits the page. The size column is the true value.'
    const noteLines = wrapText(note, 500, face(400, 10, d.body), c.measure, { maxLines: 2 })
    noteLines.forEach((line, i) => ops.push(text(line, MARGIN, y + i * 15, face(400, 10, d.body), c.muted)))
    y += noteLines.length * 15 + 18
  }

  // The body face as running text at the base size and leading.
  const sample = 'A system is a set of decisions written down, so that the next person to open the file makes the same ones. The colours carry the character, the type carries the voice, and the tokens carry both into code.'
  const room = Math.max(0, BOTTOM - y - 30)
  const lh = round(d.baseSize * d.lineHeight)
  const maxLines = Math.max(0, Math.floor(room / lh))
  if (maxLines >= 3) {
    ops.push(labelText(`Body at ${d.baseSize}px, ${d.lineHeight} leading`, MARGIN, y + 6, c.muted, { px: 7.5 }, c))
    wrapText(sample, 440, face(d.bodyWeight, d.baseSize, d.body), c.measure, { maxLines: Math.min(maxLines, 7) })
      .forEach((line, i) => ops.push(text(line, MARGIN, y + 30 + i * lh, face(d.bodyWeight, d.baseSize, d.body), c.ink)))
  }
  return ops
}

function tokensOps(c, page) {
  const ops = frame(c, page)
  const head = pageHead(
    c, 'Custom properties',
    `${plural(page.total, 'custom property', 'custom properties')}, named by role.`,
    { first: page.first },
  )
  ops.push(...head.ops)
  let y = page.first ? TOKEN_TOP.first : TOKEN_TOP.rest
  ops.push(hair(MARGIN, y, RIGHT, c.ink))
  for (const row of page.items) {
    const top = y
    ops.push(text(row.name, TOKEN_COLS.nameX, top + 17, mono(600, 10), c.ink))
    row.lines.forEach((line, i) => ops.push(text(line, TOKEN_COLS.valueX, top + 17 + i * TOKENS_LINE, mono(400, 10), c.muted)))
    y += row.height
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  }
  return ops
}

export const COLOPHON_NAME_W = 300
// The room between the last line of the colophon's text and its sign-off rule.
const COLOPHON_GAP = 48
const COLOPHON_NAME_SIZES = [15, 14, 13, 12, 11, 10]

/**
 * A name set in at most two lines of `width`, stepping the size down until it
 * fits. Never ellipsised: at the smallest size every line is kept.
 */
export function fitName(name, width, measure, fontFor) {
  let out
  for (const size of COLOPHON_NAME_SIZES) {
    out = { size, lines: wrapText(name, width, fontFor(size), measure) }
    if (out.lines.length <= 2) break
  }
  return out
}

function colophonOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  // The colophon has no lede, so its title stands alone.
  ops.push(text('Colophon', MARGIN, TOP + 30, heading(c, 30), c.ink, headSpacing(c, 30)))
  const colW = 290
  const missing = c.missingFonts
  const typefaces = missing.length
    ? `Headings in ${d.heading} ${d.headingWeight}. Body in ${d.body} ${d.bodyWeight}. ${missing.join(' and ')} could not be loaded when this book was drawn, so ${missing.length > 1 ? 'those pages use' : 'its text uses'} the platform sans instead.`
    : `Headings in ${d.heading} ${d.headingWeight}. Body in ${d.body} ${d.bodyWeight}.`
  const left = [
    ['Method', 'Contrast: WCAG 2.2 relative luminance (1.4.3, 1.4.11). AA text 4.5:1, large text and UI parts 3:1, AAA 7:1.'],
    ['Typefaces', typefaces],
  ]
  const right = [
    ['Scope', 'This book covers colour, type and tokens. Logo construction, imagery and tone of voice are not part of this system.'],
  ]
  // The columns are measured first: their last line sits COLOPHON_GAP above the sign-off rule.
  const place = (blocks) => {
    let y = TOP + 90
    return blocks.map(([label, body]) => {
      const lines = wrapText(body, colW, face(400, 10.5, d.body), c.measure)
      const block = { label, lines, y }
      y += 22 + lines.length * 16 + 28
      return block
    })
  }
  const lastLine = (placed) => placed.reduce((m, b) => Math.max(m, b.y + 22 + (b.lines.length - 1) * 16), 0)
  const cols = [[place(left), MARGIN], [place(right), MARGIN + colW + 40]]

  // The project name wraps to two lines at most and is never cut: if two lines
  // will not hold it at 15px the size steps down. Below the smallest size it takes
  // a third line (the rule moves up to make room) rather than losing words.
  const { lines: nameLines, size: nameSize } = fitName(c.name, COLOPHON_NAME_W, c.headMeasure, (px) => heading(c, px))
  const nameLh = Math.round(nameSize * 1.25)
  const fy = BOTTOM - 60 - Math.max(0, nameLines.length - 2) * nameLh
  const drop = Math.max(0, fy - COLOPHON_GAP - Math.max(...cols.map(([placed]) => lastLine(placed))))
  for (const [placed, x] of cols) {
    for (const { label, lines, y } of placed) {
      ops.push(labelText(label, x, y + drop, c.ink, { px: 8, weight: 600 }, c))
      lines.forEach((line, i) => ops.push(text(line, x, y + drop + 22 + i * 16, face(400, 10.5, d.body), c.ink)))
    }
  }

  ops.push(hair(MARGIN, fy, RIGHT, c.ink))
  nameLines.forEach((line, i) => ops.push(text(line, MARGIN, fy + 28 + i * nameLh, heading(c, nameSize), c.ink, headSpacing(c, nameSize))))
  ops.push(text(`Issued ${c.iso}`, MARGIN + 330, fy + 28, face(400, 10, d.body), c.muted))
  return ops
}

/**
 * The whole book as pages with their draw operations. Every op is plain data
 * (rect, strokeRect, line, text, gradient), so the result can be checked for
 * overflow, order and content without a canvas.
 */
export function buildBookPages(design, opts = {}) {
  const { pages, ctx: c } = planBookPages(design, opts)
  const entries = contentsEntries(pages)
  const draw = {
    cover: coverOps, contents: (cc, p) => contentsOps(cc, p, entries), opening: openingOps, palette: paletteOps,
    matrix: matrixOps, gradient: gradientOps, families: familiesOps, scale: scaleOps, tokens: tokensOps, colophon: colophonOps,
  }
  return {
    pages: pages.map((p) => ({ ...p, ops: draw[p.kind](c, p) })),
    fonts: { heading: c.d.heading, body: c.d.body },
    paper: c.paper,
    contents: entries,
  }
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function roundedPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** The start and end of a CSS-angle gradient across a box (0deg points up, clockwise). */
export function gradientLine({ x, y, w, h, angle }) {
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const length = Math.abs(w * dx) + Math.abs(h * dy)
  const cx = x + w / 2
  const cy = y + h / 2
  return { x0: cx - (dx * length) / 2, y0: cy - (dy * length) / 2, x1: cx + (dx * length) / 2, y1: cy + (dy * length) / 2 }
}

export function drawBookOps(ctx, ops) {
  for (const o of ops) {
    if (o.op === 'rect') {
      ctx.fillStyle = o.fill
      if (o.radius) { roundedPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill() } else ctx.fillRect(o.x, o.y, o.w, o.h)
    } else if (o.op === 'strokeRect') {
      ctx.strokeStyle = o.stroke
      ctx.lineWidth = 1
      if (o.radius) { roundedPath(ctx, o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1, o.radius); ctx.stroke() } else ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1)
    } else if (o.op === 'line') {
      // A rule sits on a whole authored pixel, which is two whole device pixels at 2x.
      ctx.strokeStyle = o.stroke
      ctx.lineWidth = 1
      ctx.setLineDash(o.dash || [])
      ctx.beginPath()
      ctx.moveTo(o.x1, o.y1 + 0.5)
      ctx.lineTo(o.x2, o.y2 + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
    } else if (o.op === 'gradient') {
      const { x0, y0, x1, y1 } = gradientLine(o)
      const fill = ctx.createLinearGradient(x0, y0, x1, y1)
      for (const s of o.stops) fill.addColorStop(Math.min(1, Math.max(0, s.position / 100)), s.color)
      ctx.fillStyle = fill
      if (o.radius) { roundedPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill() } else ctx.fillRect(o.x, o.y, o.w, o.h)
    } else if (o.op === 'text') {
      ctx.fillStyle = o.fill
      ctx.font = o.font
      ctx.textAlign = o.align || 'left'
      ctx.textBaseline = 'alphabetic'
      const spaced = o.letterSpacing && 'letterSpacing' in ctx
      if (spaced) ctx.letterSpacing = `${o.letterSpacing}px`
      if (o.tabular) {
        // Canvas has no font-variant-numeric, so figures that must line up (a swatch's
        // index) are set one to a cell, each as wide as the face's zero.
        const pitch = ctx.measureText('0').width
        ctx.textAlign = 'center'
        ;[...o.text].forEach((ch, i) => ctx.fillText(ch, o.x + pitch * (i + 0.5), o.y))
      } else ctx.fillText(o.text, o.x, o.y)
      if (spaced) ctx.letterSpacing = '0px'
    }
  }
}

// How long a render waits for one family's stylesheet before it draws in the fallback.
const FONT_WAIT_MS = 6000
// The one deadline over the whole font step. A .woff2 that never arrives (so
// document.fonts.load never settles) must not hold the export, and the panel
// with it, for ever.
export const BOOK_FONT_DEADLINE_MS = 8000

/**
 * Load the kit's faces and wait for them, for at most `deadlineMs` in all.
 * Resolves the families that did NOT arrive (empty when all did), so the
 * colophon can say so instead of claiming a face the pages are not set in. A
 * family still loading at the deadline counts as missing. Never rejects: a font
 * that cannot load is a fallback, not a failed export. `fontApi`
 * ({ loadFont, verifyFontLoaded }) can be injected; it defaults to the Google
 * Fonts helpers.
 */
export async function ensureBookFonts(d, { deadlineMs = BOOK_FONT_DEADLINE_MS, fontApi } = {}) {
  if (typeof document === 'undefined' || !document.fonts?.load) return []
  const families = [...new Set([d.heading, d.body])]
  const weights = [...new Set([400, 500, 600, 700, d.headingWeight, d.bodyWeight])]
  const finished = new Set()
  const failed = new Set()
  const timers = []
  const after = (ms) => new Promise((resolve) => { timers.push(setTimeout(resolve, ms)) })

  const work = (async () => {
    try {
      const { loadFont, verifyFontLoaded } = fontApi || await import('./googleFonts')
      await Promise.all(families.map(async (family) => {
        try {
          await Promise.race([Promise.resolve(loadFont(family, weights)).catch(() => null), after(FONT_WAIT_MS)])
          await Promise.all(weights.map((w) => Promise.resolve().then(() => document.fonts.load(face(w, 24, family))).catch(() => null)))
          const check = family === d.heading ? d.headingWeight : d.bodyWeight
          if ((await verifyFontLoaded(family, check, { timeout: 1500 })) === 'failed') failed.add(family)
        } catch { /* a family that errors is a fallback, not a failed export */ }
        finished.add(family)
      }))
    } catch { families.forEach((family) => finished.add(family)) /* the helper module would not load: draw in the fallback */ }
  })()

  await Promise.race([work, after(Math.max(0, deadlineMs))])
  timers.forEach(clearTimeout)
  return families.filter((family) => failed.has(family) || !finished.has(family))
}

const canvasMeasurer = (ctx) => {
  const measure = (str, font) => {
    ctx.font = font
    return ctx.measureText(str).width
  }
  measure.descent = (str, font) => {
    ctx.font = font
    return ctx.measureText(str).actualBoundingBoxDescent || 0
  }
  return measure
}

function newCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = PIXELS.width
  canvas.height = PIXELS.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not create a canvas to draw the book.')
  return { canvas, ctx }
}

/**
 * Draw each page and hand its canvas to `visit(canvas, page, index, total)`. One
 * canvas is alive at a time when `visit` releases it, which is what keeps a long
 * book from holding tens of megabytes per page at once.
 */
export async function forEachBookPage(design, opts, visit) {
  const { projectName = 'Design System', watermark = true, date = new Date() } = opts || {}
  const d = readBook(design)
  const missingFonts = await ensureBookFonts(d)
  const scratch = newCanvas()
  const measure = canvasMeasurer(scratch.ctx)
  const book = buildBookPages(design, { projectName, watermark, date, measure, missingFonts })
  scratch.canvas.width = 0

  for (let i = 0; i < book.pages.length; i += 1) {
    const { canvas, ctx } = newCanvas()
    ctx.scale(SCALE, SCALE)
    ctx.imageSmoothingQuality = 'high'
    if ('fontKerning' in ctx) ctx.fontKerning = 'normal'
    if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision'
    // Paint the paper first so no page can come out transparent.
    ctx.fillStyle = book.paper
    ctx.fillRect(0, 0, PAGE.width, PAGE.height)
    drawBookOps(ctx, book.pages[i].ops)
    await visit(canvas, book.pages[i], i, book.pages.length)
  }
  return book.pages.length
}

/** Every page as a canvas, 1448 x 2048. The caller owns them. */
export async function renderBookPages(design, opts = {}) {
  const canvases = []
  await forEachBookPage(design, opts, (canvas) => { canvases.push(canvas) })
  return canvases
}

const toPng = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('A page of the book could not be encoded.'))), 'image/png')
})

/**
 * The book as one zip Blob of page-01.png, page-02.png and so on. PNGs are
 * already compressed, so the zip stores them as they are.
 */
export async function renderBookPng(design, opts = {}) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  await forEachBookPage(design, opts, async (canvas, page, index, total) => {
    zip.file(pageFileName(index, total), await toPng(canvas))
    canvas.width = 0
    canvas.height = 0
  })
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
