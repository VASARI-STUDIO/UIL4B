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
import { roleLabel, slotLandsBook } from './paletteRoles.js'
import { colorName } from './paletteNames.js'
import { deriveRoles, hexToOklch, mixHex, softInk } from './exportTemplates/roles.js'
import { bookTokens } from './bookTokens.js'

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

const BANDS_PER_PAGE = 5
const BAND_H = 144
const BAND_GAP = 6
// The matrix is square, so it grows quadratically; past eight colours the cells
// stop being legible, and the page says so rather than shrinking them.
export const MATRIX_MAX = 8
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
const article = (word) => (/^[aeiou]/i.test(String(word)) ? 'an' : 'a')

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

/** Everything the plan and the layout read, worked out once. */
function readContext(design, { projectName, watermark, measure, date, missingFonts }) {
  const d = readBook(design)
  const name = String(projectName ?? '').trim() || 'Design System'
  const base = d.base
  const roles = deriveRoles(d.palette, { contrast, primary: base || d.palette[0] })
  const field = base || DARK_FIELD
  const fieldInk = inkFor(field).ink
  const iso = date.toISOString().slice(0, 10)
  return {
    d, name, watermark, measure, iso,
    ladder: typeLadder(d),
    tokens: bookTokens(d),
    paper: roles.paper, ink: roles.ink, muted: roles.muted, rule: roles.rule,
    field, fieldInk,
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
    const sys = systemName(d.harmony)
    add('opening', 'Colour', {
      num: '01', title: 'Colour', field: c.field, ink: c.fieldInk,
      abstract: `${d.palette.length} ${d.palette.length === 1 ? 'colour' : 'colours'} built on ${article(sys)} ${sys} system, each with the ink that reads on it and the ratio that proves it.`,
    })
    const indexed = d.palette.map((hex, index) => ({ index, hex }))
    balancedChunk(indexed, BANDS_PER_PAGE).forEach((items, gi) => {
      add('palette', 'Colour', { items, first: gi === 0, leaf: gi === 0 ? 'The palette' : null })
    })
    add('matrix', 'Colour', {
      colours: d.palette.slice(0, MATRIX_MAX), capped: d.palette.length > MATRIX_MAX, leaf: 'Contrast matrix',
    })
  }
  if (d.gradient) add('gradient', 'Colour', { leaf: 'The gradient' })

  add('opening', 'Typography', {
    num: '02', title: 'Typography', field: DARK_FIELD, ink: '#FFFFFF',
    abstract: `${d.heading} for headings, ${d.body} for reading, on a ${d.ratio} scale from ${d.baseSize}px.`,
  })
  add('families', 'Typography', { leaf: 'The families' })
  add('scale', 'Typography', { leaf: 'The scale' })

  const tokenField = d.palette[1] || d.palette[0] || DARK_FIELD
  add('opening', 'Tokens', {
    num: '03', title: 'Tokens', field: tokenField, ink: inkFor(tokenField).ink,
    abstract: `${c.tokens.length} custom properties: the whole system as code, ready to paste into a stylesheet.`,
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

const caps = (t, x, y, fill, { px = 8, weight = 600, spacing = 1.4, align, family } = {}, c) =>
  text(String(t).toUpperCase(), x, y, face(weight, px, family || c.d.body), fill, { letterSpacing: spacing, ...(align ? { align } : {}) })

const heading = (c, px) => face(c.d.headingWeight, px, c.d.heading)
const bodyFont = (c, px, weight = c.d.bodyWeight) => face(weight, px, c.d.body)
const headSpacing = (c, px) => (c.d.headingSpacing ? { letterSpacing: round(c.d.headingSpacing * px) } : {})

/** Running head above, folio and credit below. Not drawn on the cover or the full-bleed openings. */
function frame(c, page) {
  const ops = [rect(0, 0, PAGE.width, PAGE.height, c.paper)]
  const label = page.section || ''
  const nameFont = face(600, 8.5, c.d.body)
  ops.push(
    caps(fitLine(c.name.toUpperCase(), 330, nameFont, c.measure), MARGIN, 40, c.muted, { px: 8.5 }, c),
    caps(label, RIGHT, 40, c.muted, { px: 8.5, align: 'right' }, c),
    hair(MARGIN, 54, RIGHT, c.rule),
  )
  ops.push(...foot(c, page, c.muted, c.rule))
  return ops
}

function foot(c, page, fill, ruleColour, { rule = true } = {}) {
  const ops = []
  if (rule) ops.push(hair(MARGIN, FOOT_RULE, RIGHT, ruleColour))
  const left = c.watermark ? 'Made with UIL4B — uil4b.com' : 'Design system book'
  ops.push(text(left, MARGIN, FOOT_RULE + 24, face(400, 9, c.d.body), fill))
  const folio = page.kind === 'contents' ? ['i', 'ii', 'iii', 'iv', 'v', 'vi'][page.folio - 1] || String(page.folio) : pad2(page.folio)
  ops.push(text(folio, RIGHT, FOOT_RULE + 24, face(600, 10, c.d.body), fill, { align: 'right' }))
  return ops
}

/** The page title and its lede. Returns the ops and where the content starts. */
function pageHead(c, title, lede, { first = true } = {}) {
  const ops = [text(title, MARGIN, TOP + 30, heading(c, 30), c.ink, headSpacing(c, 30))]
  if (!first) {
    const w = c.measure(title, heading(c, 30))
    ops.push(caps('continued', MARGIN + w + 12, TOP + 30, c.muted, { px: 8, spacing: 1.4 }, c))
    return { ops, y: TOP + 56 }
  }
  const lines = wrapText(lede, 470, bodyFont(c, 11.5, 400), c.measure, { maxLines: 2 })
  lines.forEach((line, i) => ops.push(text(line, MARGIN, TOP + 56 + i * 17, bodyFont(c, 11.5, 400), c.muted)))
  return { ops, y: TOP + 56 + Math.max(1, lines.length) * 17 + 18 }
}

// ── Pages ───────────────────────────────────────────────────────────────────

function coverOps(c) {
  const { d } = c
  const ops = [rect(0, 0, PAGE.width, PAGE.height, c.field)]
  ops.push(
    caps('Design system book', MARGIN, 64, c.fieldSoft, { px: 9.5, spacing: 2.4 }, c),
    caps(`Issued ${c.iso}`, RIGHT, 64, c.fieldSoft, { px: 9.5, spacing: 1.6, align: 'right' }, c),
  )

  // The name at the largest size that sets in three lines or fewer; if even the
  // smallest cannot, it is cut with an ellipsis rather than left to run over.
  const sizes = [96, 80, 68, 58, 50, 42, 36]
  let size = sizes[sizes.length - 1]
  let lines = null
  for (const s of sizes) {
    const wrapped = wrapText(c.name, CONTENT_W, heading(c, s), c.measure)
    if (wrapped.length <= 3) { size = s; lines = wrapped; break }
  }
  if (!lines) lines = wrapText(c.name, CONTENT_W, heading(c, size), c.measure, { maxLines: 3 })
  const leading = Math.round(size * 1.04)
  const stripTop = coverStrip(c).length ? PAGE.height - 188 : PAGE.height - 96
  const metaH = 70
  const titleBottom = stripTop - metaH - 36
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
  if (c.watermark) ops.push(text('Made with UIL4B — uil4b.com', RIGHT, creditY, face(400, 9, d.body), c.fieldSoft, { align: 'right' }))
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
      ops.push(text(title, MARGIN + 44, y, font, c.muted))
      ops.push(text(String(e.folio), MARGIN + listW, y, face(400, 10, d.body), c.muted, { align: 'right' }))
      y += 22
      continue
    }
    y += y === TOP + 120 ? 0 : 14
    const font = heading(c, 20)
    const title = fitLine(e.title, listW - 120, font, c.measure)
    if (e.num) ops.push(text(e.num, MARGIN, y, mono(500, 10), c.muted))
    ops.push(text(title, MARGIN + 44, y, font, c.ink, headSpacing(c, 20)))
    const end = MARGIN + 44 + c.measure(title, font) + 10
    const folioW = c.measure(String(e.folio), face(600, 12, d.body))
    if (end < MARGIN + listW - folioW - 10) ops.push(hair(end, y - 3, MARGIN + listW - folioW - 10, c.edge, [1, 3]))
    ops.push(text(String(e.folio), MARGIN + listW, y, face(600, 12, d.body), c.ink, { align: 'right' }))
    y += 26
  }

  // The aside: what the book is, and four facts about it.
  const ax = MARGIN + listW + 44
  const aw = RIGHT - ax
  ops.push({ op: 'line', x1: ax - 22, y1: TOP + 100, x2: ax - 22, y2: TOP + 560, stroke: c.rule })
  ops.push(caps('About this book', ax, TOP + 120, c.muted, { px: 8 }, c))
  const prose = [
    `This is the specification for ${c.name}: the colour, typography and token decisions behind the interface, written down so they can be applied consistently and checked.`,
    'Every contrast figure in it was measured, not estimated. Nothing here is illustrative: each value is the value the system actually holds.',
  ]
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
    ops.push(caps(label, ax, ay + 2, c.muted, { px: 7.5 }, c))
    ops.push(text(String(value), RIGHT, ay + 2, face(600, 11, d.body), c.ink, { align: 'right' }))
    ay += 30
  }
  ops.push(hair(ax, ay - 14, RIGHT, c.rule))
  return ops
}

function openingOps(c, page) {
  const { d } = c
  const soft = softInk(page.ink, page.field, contrast, { amount: 0.82 })
  const ops = [rect(0, 0, PAGE.width, PAGE.height, page.field)]
  ops.push(caps(`Section ${page.num}`, MARGIN, 64, soft, { px: 9.5, spacing: 2.4 }, c))
  // The numeral is a ghost: large enough to read as a shape, close enough to the
  // field that it never competes with the title.
  const ghost = mixHex(page.ink, page.field, 0.16)
  ops.push(text(page.num, RIGHT + 8, PAGE.height - 92, face(c.d.headingWeight, 380, d.heading), ghost, { align: 'right' }))

  const size = 64
  const titleLines = wrapText(page.title, 470, heading(c, size), c.measure, { maxLines: 2 })
  titleLines.forEach((line, i) => ops.push(text(line, MARGIN, 300 + i * 68, heading(c, size), page.ink, headSpacing(c, size))))
  const abstractTop = 300 + (titleLines.length - 1) * 68 + 44
  const lines = wrapText(page.abstract, 360, bodyFont(c, 13, 400), c.measure, { maxLines: 6 })
  lines.forEach((line, i) => ops.push(text(line, MARGIN, abstractTop + i * 20, bodyFont(c, 13, 400), page.ink)))
  const footY = PAGE.height - 48
  ops.push(text(c.watermark ? 'Made with UIL4B — uil4b.com' : 'Design system book', MARGIN, footY, face(400, 9, d.body), soft))
  ops.push(text(pad2(page.folio), RIGHT, footY, face(600, 10, d.body), soft, { align: 'right' }))
  return ops
}

function paletteOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'The palette', `Each colour with its role in the ${systemName(d.harmony)} system, its values in three notations, and the ink that reads on it.`, { first: page.first })
  ops.push(...head.ops)
  let y = head.y
  page.items.forEach(({ index, hex }, n) => {
    const { ink, ratio, label } = inkFor(hex)
    const chipW = 170
    ops.push(rect(MARGIN, y, chipW, BAND_H, hex, 3))
    if (contrast(hex, c.paper) < NEAR_PAPER) ops.push(outline(MARGIN, y, chipW, BAND_H, c.edge, 3))
    ops.push(text(pad2(index + 1), MARGIN + 14, y + 26, mono(600, 11), ink))
    ops.push(text(hex, MARGIN + 14, y + BAND_H - 16, face(700, 16, d.body), ink))

    const x2 = MARGIN + chipW + 24
    const w2 = 176
    ops.push(caps(roleLabel(d.harmony, index), x2, y + 16, c.muted, { px: 8 }, c))
    const nameLines = wrapText(colorName(hex), w2, heading(c, 21), c.measure, { maxLines: 2 })
    nameLines.forEach((line, i) => ops.push(text(line, x2, y + 44 + i * 24, heading(c, 21), c.ink, headSpacing(c, 21))))
    const landsTop = y + 44 + (nameLines.length - 1) * 24 + 22
    const lands = wrapText(slotLandsBook(index), w2, bodyFont(c, 9.5, 400), c.measure, { maxLines: nameLines.length > 1 ? 2 : 3 })
    lands.forEach((line, i) => ops.push(text(line, x2, landsTop + i * 13, bodyFont(c, 9.5, 400), c.muted)))

    const x3 = x2 + w2 + 24
    const w3 = RIGHT - x3
    ;[['HEX', hex], ['RGB', rgbOf(hex)], ['HSL', hslOf(hex)], ['OKLCH', oklchOf(hex)]].forEach(([k, v], i) => {
      ops.push(caps(k, x3, y + 16 + i * 15, c.muted, { px: 7.5 }, c))
      ops.push(text(v, x3 + 42, y + 16 + i * 15, mono(500, 9.5), c.ink))
    })
    ops.push(hair(x3, y + 74, RIGHT, c.rule))
    const cells = [['Ink', label], ['Ratio', `${ratio}:1`], ['Grade', grade(ratio)]]
    cells.forEach(([k, v], i) => {
      const cx = x3 + (w3 / 3) * i
      ops.push(caps(k, cx, y + 92, c.muted, { px: 7.5 }, c))
      ops.push(text(v, cx, y + 108, face(600, 11, d.body), c.ink))
    })
    ops.push(caps('Tints 80 · 60 · 40 · 20', x3, y + 126, c.muted, { px: 7, spacing: 1.2 }, c))
    ;[80, 60, 40, 20].forEach((pct, i) => {
      const tint = mixHex(hex, c.paper, pct / 100)
      const tw = (w3 - 12) / 4
      const tx = x3 + i * (tw + 4)
      ops.push(rect(tx, y + 131, tw, 12, tint))
      if (contrast(tint, c.paper) < NEAR_PAPER) ops.push(outline(tx, y + 131, tw, 12, c.edge))
    })

    if (n < page.items.length - 1) ops.push(hair(MARGIN, y + BAND_H + BAND_GAP / 2, RIGHT, c.rule))
    y += BAND_H + BAND_GAP
  })
  return ops
}

/** The class of a contrast cell: weight and shading carry it, never a hue. */
export function matrixClass(ratio) {
  return ratio >= 4.5 ? { word: 'Pass', weight: 700 } : ratio >= 3 ? { word: 'Large', weight: 500 } : { word: 'Fail', weight: 400 }
}

function matrixOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'Contrast matrix', 'Every pair in the palette, measured. Read a row as the background and a column as the text on it. The figure is the same either way.')
  ops.push(...head.ops)
  const axes = [...page.colours, '#FFFFFF', '#000000']
  const rowHeadW = 104
  const cw = Math.min(64, (CONTENT_W - rowHeadW) / axes.length)
  const headH = 58
  const rowH = 48
  let y = head.y + 8

  ops.push(caps('bg / fg', MARGIN, y + headH - 12, c.muted, { px: 7.5 }, c))
  axes.forEach((hex, i) => {
    const cx = MARGIN + rowHeadW + i * cw + cw / 2
    ops.push(rect(cx - 7, y + 8, 14, 14, hex, 7))
    if (contrast(hex, c.paper) < NEAR_PAPER) ops.push(outline(cx - 7, y + 8, 14, 14, c.edge, 7))
    ops.push(text(hex.slice(1), cx, y + 42, mono(500, 8), c.ink, { align: 'center' }))
  })
  y += headH
  ops.push(hair(MARGIN, y, RIGHT, c.ink))

  page.colours.forEach((row) => {
    ops.push(rect(MARGIN, y + rowH / 2 - 7, 14, 14, row, 7))
    if (contrast(row, c.paper) < NEAR_PAPER) ops.push(outline(MARGIN, y + rowH / 2 - 7, 14, 14, c.edge, 7))
    ops.push(text(row, MARGIN + 24, y + rowH / 2 + 3.5, mono(500, 10), c.ink))
    axes.forEach((col, i) => {
      const x = MARGIN + rowHeadW + i * cw
      if (row === col) {
        ops.push(text('–', x + cw / 2, y + rowH / 2 + 4, face(400, 12, d.body), c.muted, { align: 'center' }))
        return
      }
      const ratio = contrast(row, col)
      const { word, weight } = matrixClass(ratio)
      if (word === 'Fail') ops.push(rect(x + 1, y + 1, cw - 2, rowH - 2, mixHex(c.ink, c.paper, 0.06)))
      else if (word === 'Large') ops.push(rect(x + 1, y + 1, cw - 2, rowH - 2, mixHex(c.ink, c.paper, 0.025)))
      ops.push(text(String(ratio), x + cw / 2, y + rowH / 2 + 1, face(weight, 11.5, d.body), word === 'Fail' ? c.muted : c.ink, { align: 'center' }))
      ops.push(caps(word, x + cw / 2, y + rowH / 2 + 14, c.muted, { px: 6.5, spacing: 1, align: 'center' }, c))
    })
    y += rowH
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  })

  y += 30
  const key = [
    ['Pass', 'reads as normal text, 4.5:1 or more'],
    ['Large', 'reads as large text only, 3:1 or more'],
    ['Fail', 'is a fill, not a text pair'],
  ]
  key.forEach(([word, rest], i) => {
    const w = c.measure(word, face(700, 10, d.body))
    ops.push(text(word, MARGIN, y + i * 18, face(700, 10, d.body), c.ink))
    ops.push(text(rest, MARGIN + w + 6, y + i * 18, face(400, 10, d.body), c.muted))
  })
  y += key.length * 18 + 14
  if (page.capped) {
    const note = `The matrix shows the first ${MATRIX_MAX} colours. Past eight the cells stop being legible at this size, so the remaining colours are specified on the palette pages and measured against paper and ink there.`
    const lines = wrapText(note, 470, face(400, 10, d.body), c.measure, { maxLines: 4 })
    lines.forEach((line, i) => ops.push(text(line, MARGIN, y + i * 15, face(400, 10, d.body), c.muted)))
  }
  return ops
}

function gradientOps(c, page) {
  const { d } = c
  const g = d.gradient
  const css = `linear-gradient(${g.angle}deg, ${g.stops.map((s) => `${s.color} ${s.position}%`).join(', ')})`
  const ops = frame(c, page)
  const head = pageHead(c, 'The gradient', `A ${g.type.toLowerCase()} blend at ${g.angle}°, specified by stop so it can be rebuilt exactly rather than eyeballed.`)
  ops.push(...head.ops)
  let y = head.y + 4
  ops.push({ op: 'gradient', x: MARGIN, y, w: CONTENT_W, h: 220, angle: g.angle, stops: g.stops, radius: 3 })
  y += 220 + 36

  const colX = [MARGIN, MARGIN + 150, MARGIN + 330]
  ;['Stop', 'Colour', 'Position'].forEach((h, i) => ops.push(caps(h, colX[i], y, c.muted, { px: 8 }, c)))
  y += 10
  ops.push(hair(MARGIN, y, RIGHT, c.ink))
  g.stops.forEach((s, i) => {
    const mid = y + 17
    ops.push(rect(colX[0], mid - 9, 12, 12, s.color, 6))
    if (contrast(s.color, c.paper) < NEAR_PAPER) ops.push(outline(colX[0], mid - 9, 12, 12, c.edge, 6))
    ops.push(text(`Stop ${i + 1}`, colX[0] + 22, mid, face(600, 11, d.body), c.ink))
    ops.push(text(s.color, colX[1], mid, mono(500, 10.5), c.ink))
    ops.push(text(`${s.position}%`, colX[2], mid, mono(500, 10.5), c.ink))
    y += 30
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  })
  y += 28
  const code = wrapText(`background: ${css};`, CONTENT_W - 32, mono(400, 10), c.measure)
  const boxH = code.length * 15 + 28
  ops.push(rect(MARGIN, y, CONTENT_W, boxH, mixHex(c.ink, c.paper, 0.05), 3))
  code.forEach((line, i) => ops.push(text(line, MARGIN + 16, y + 24 + i * 15, mono(400, 10), c.ink)))
  return ops
}

const ALPHABET = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789 & ., : ; ! ? “ ” ( ) – — @ # % € £ $',
]

function familiesOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'The families', 'Two faces carry the system. Every fallback is stated in the colophon, so the document degrades predictably rather than arbitrarily.')
  ops.push(...head.ops)
  let y = head.y + 6
  const specimens = [
    ['Headings', d.heading, d.headingWeight, d.headingSpacing],
    ['Body', d.body, d.bodyWeight, d.bodySpacing],
  ]
  for (const [role, family, weight, spacing] of specimens) {
    ops.push(hair(MARGIN, y, RIGHT, c.ink))
    ops.push(caps(role, MARGIN, y + 20, c.muted, { px: 8.5 }, c))
    ops.push(text(
      `Weight ${weight}  ·  Tracking ${spacing ? `${spacing}em` : 'normal'}`,
      RIGHT, y + 20, face(400, 9.5, d.body), c.muted, { align: 'right' },
    ))
    // The name at the largest size that sets on one line.
    const sizes = [68, 60, 52, 44, 38, 32, 26]
    const size = sizes.find((s) => c.measure(family, face(weight, s, family)) <= CONTENT_W) || sizes[sizes.length - 1]
    const nameLine = fitLine(family, CONTENT_W, face(weight, size, family), c.measure)
    ops.push(text(nameLine, MARGIN, y + 36 + size * 0.86, face(weight, size, family), c.ink, spacing ? { letterSpacing: round(spacing * size) } : {}))
    let sy = y + 36 + size * 0.86 + 40
    for (const row of ALPHABET) {
      const lines = wrapText(row, CONTENT_W, face(weight, 22, family), c.measure)
      lines.forEach((line) => { ops.push(text(line, MARGIN, sy, face(weight, 22, family), c.ink)); sy += 32 })
    }
    y = sy + 24
  }
  return ops
}

function scaleOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  const head = pageHead(c, 'The scale', `A ${d.ratio} ratio from a ${d.baseSize}px base. Each row is set in the face and size it specifies.`)
  ops.push(...head.ops)
  let y = head.y + 4
  const cols = { step: MARGIN, size: MARGIN + 92, rem: MARGIN + 148, lead: MARGIN + 208, specimen: MARGIN + 270 }
  const specW = RIGHT - cols.specimen
  ;[['Step', cols.step], ['Size', cols.size], ['rem', cols.rem], ['Leading', cols.lead], ['Specimen', cols.specimen]]
    .forEach(([h, x]) => ops.push(caps(h, x, y, c.muted, { px: 7.5 }, c)))
  y += 10
  ops.push(hair(MARGIN, y, RIGHT, c.ink))
  for (const s of c.ladder) {
    const isHeading = s.exp >= 1
    const family = isHeading ? d.heading : d.body
    const weight = isHeading ? d.headingWeight : d.bodyWeight
    // The row is clamped so a steep ratio cannot push it off the page, and shrunk
    // until the label fits its column. The size column always carries the true value.
    let shown = Math.min(s.px, 44)
    while (shown > 10 && c.measure(s.name, face(weight, shown, family)) > specW) shown -= 2
    const rowH = Math.max(36, Math.round(shown * 1.4))
    const base = y + rowH / 2 + shown * 0.33
    ops.push(text(s.name, cols.step, base, face(600, 10, d.body), c.ink))
    ops.push(text(`${round(s.px)}px`, cols.size, base, mono(400, 9.5), c.muted))
    ops.push(text(`${round(s.px / 16)}`, cols.rem, base, mono(400, 9.5), c.muted))
    ops.push(text(String(isHeading ? 1.15 : d.lineHeight), cols.lead, base, mono(400, 9.5), c.muted))
    ops.push(text(s.name, cols.specimen, base, face(weight, shown, family), c.ink, isHeading ? headSpacing(c, shown) : {}))
    y += rowH
    ops.push(hair(MARGIN, y, RIGHT, c.rule))
  }
  y += 30
  const note = `Specimens above 44px are shown reduced so the row fits the page; the size column is always the true value. Body copy sets at ${d.lineHeight} leading, headings tighten to 1.15, which is what stops a two-line heading reading as two separate lines.`
  wrapText(note, 500, face(400, 10, d.body), c.measure, { maxLines: 4 })
    .forEach((line, i) => ops.push(text(line, MARGIN, y + i * 15, face(400, 10, d.body), c.muted)))
  y += 4 * 15 + 18

  // The body face as running text at the base size and leading.
  const sample = 'A system is a set of decisions written down, so that the next person to open the file makes the same ones. The colours carry the character, the type carries the voice, and the tokens carry both into code.'
  const room = Math.max(0, BOTTOM - y - 30)
  const lh = round(d.baseSize * d.lineHeight)
  const maxLines = Math.max(0, Math.floor(room / lh))
  if (maxLines >= 3) {
    ops.push(caps(`Body at ${d.baseSize}px, ${d.lineHeight} leading`, MARGIN, y + 6, c.muted, { px: 7.5 }, c))
    wrapText(sample, 440, face(d.bodyWeight, d.baseSize, d.body), c.measure, { maxLines: Math.min(maxLines, 7) })
      .forEach((line, i) => ops.push(text(line, MARGIN, y + 30 + i * lh, face(d.bodyWeight, d.baseSize, d.body), c.ink)))
  }
  return ops
}

function tokensOps(c, page) {
  const ops = frame(c, page)
  const head = pageHead(
    c, 'Custom properties',
    `All ${page.total} tokens, named for the role each colour plays rather than the colour it happens to be, so a palette change does not orphan the name.`,
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

function colophonOps(c, page) {
  const { d } = c
  const ops = frame(c, page)
  // The colophon has no lede, so its title stands alone.
  ops.push(text('How this book was made', MARGIN, TOP + 30, heading(c, 30), c.ink, headSpacing(c, 30)))
  const colW = 290
  const missing = c.missingFonts
  const typefaces = missing.length
    ? `Headings are set in ${d.heading} at ${d.headingWeight}, body in ${d.body} at ${d.bodyWeight}. ${missing.join(' and ')} could not be loaded when this book was drawn, so ${missing.length > 1 ? 'those pages use' : 'its text uses'} the platform sans instead.`
    : `Headings set in ${d.heading} at ${d.headingWeight}, body in ${d.body} at ${d.bodyWeight}. Both fall back to system-ui, then the platform sans, so a face that cannot load is replaced rather than left blank.`
  const left = [
    ['Method', 'Contrast is the WCAG 2.2 relative-luminance ratio (§1.4.3). AA needs 4.5:1 for normal text and 3:1 for large; AAA needs 7:1. Every figure is reproducible: the same two hex values always give the same ratio.'],
    ['Typefaces', typefaces],
  ]
  const right = [
    ['What this book covers', 'Colour, typography and tokens: the decisions this system actually holds.'],
    ['What it does not', 'A full identity manual would also carry logo construction, imagery direction, tone of voice and applied examples. Those are not in this book because they are not in the system: this document specifies only what was really designed, and states the boundary rather than filling it with placeholders.'],
  ]
  const column = (blocks, x) => {
    let y = TOP + 90
    for (const [label, body] of blocks) {
      ops.push(caps(label, x, y, c.muted, { px: 8 }, c))
      const lines = wrapText(body, colW, face(400, 10.5, d.body), c.measure)
      lines.forEach((line, i) => ops.push(text(line, x, y + 22 + i * 16, face(400, 10.5, d.body), c.ink)))
      y += 22 + lines.length * 16 + 28
    }
  }
  column(left, MARGIN)
  column(right, MARGIN + colW + 40)

  const fy = BOTTOM - 60
  ops.push(hair(MARGIN, fy, RIGHT, c.ink))
  ops.push(text(fitLine(c.name, 250, heading(c, 15), c.measure), MARGIN, fy + 28, heading(c, 15), c.ink, headSpacing(c, 15)))
  ops.push(text(`Issued ${c.iso}`, MARGIN + 330, fy + 28, face(400, 10, d.body), c.muted))
  ops.push(text('Set from the system it describes', RIGHT, fy + 28, face(400, 10, d.body), c.muted, { align: 'right' }))
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
      ctx.fillText(o.text, o.x, o.y)
      if (spaced) ctx.letterSpacing = '0px'
    }
  }
}

// How long a render waits for the kit's faces before it draws in the fallback.
const FONT_WAIT_MS = 6000

/**
 * Load the kit's faces and wait for them. Resolves the families that did NOT
 * arrive (empty when all did), so the colophon can say so instead of claiming a
 * face the pages are not set in. Never rejects: a font that cannot load is a
 * fallback, not a failed export.
 */
export async function ensureBookFonts(d) {
  if (typeof document === 'undefined' || !document.fonts?.load) return []
  const families = [...new Set([d.heading, d.body])]
  const weights = [...new Set([400, 500, 600, 700, d.headingWeight, d.bodyWeight])]
  const missing = []
  try {
    const { loadFont, verifyFontLoaded } = await import('./googleFonts')
    await Promise.all(families.map(async (family) => {
      await Promise.race([loadFont(family, weights).catch(() => null), new Promise((r) => setTimeout(r, FONT_WAIT_MS))])
      await Promise.all(weights.map((w) => Promise.resolve(document.fonts.load(face(w, 24, family))).catch(() => null)))
      const check = family === d.heading ? d.headingWeight : d.bodyWeight
      if ((await verifyFontLoaded(family, check, { timeout: 1500 })) === 'failed') missing.push(family)
    }))
  } catch {
    return []
  }
  return missing
}

const canvasMeasurer = (ctx) => (str, font) => {
  ctx.font = font
  return ctx.measureText(str).width
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
