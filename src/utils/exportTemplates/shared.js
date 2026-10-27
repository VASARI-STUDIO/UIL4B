// Helpers every export template shares. Templates return strings; they never
// read the design and never import a generator (tests/unit/template-seam.test.js).

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/**
 * Put `items` in the order a template names. Ids the template does not name keep
 * their place at the end, so a section the generator produced is never dropped;
 * ids it names that the generator did not produce are skipped.
 */
export function orderSections(items, order = [], key = (x) => x) {
  const rank = (item) => {
    const at = order.indexOf(key(item))
    return at === -1 ? order.length : at
  }
  return items.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i).map((x) => x.item)
}

/**
 * A colour for a style attribute: the value if it is a six-digit hex, else the
 * fallback the caller supplies. Colours are validated upstream; this keeps a new
 * template from ever being the place an unchecked string reaches an attribute.
 */
export const safeHex = (value, fallback) => (/^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value) : fallback)

/** "PRIMARY SOFT" as "Primary soft": role labels arrive in capitals. */
export const sentenceCase = (text) => {
  const t = String(text ?? '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** The date as YYYY-MM-DD in the reader's own time zone, so the day matches their clock, not UTC's. */
export const localIso = (date) => {
  const two = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

// A character's width in average advances. A capital in a bold geometric face sets
// near 0.7 em against the 0.52 average (a ratio of about 1.35), so a name in capitals
// would otherwise be measured too narrow and cut; lowercase sits a little under the
// average to keep a mixed-case name where it was. Digits, spaces and marks count one.
const CAP_WIDTH = 1.35
const LOWER_WIDTH = 0.95

/** `text` measured in average advances, with capitals weighted wider than lowercase. */
export function titleWidth(text) {
  let width = 0
  for (const ch of String(text ?? '')) {
    if (ch !== ch.toLowerCase()) width += CAP_WIDTH
    else if (ch !== ch.toUpperCase()) width += LOWER_WIDTH
    else width += 1
  }
  return width
}

/**
 * The size a cover title is set at. Picks the first of `steps` (largest first)
 * at which `name` fits `maxLines` lines in `measure`, counting characters against
 * an average advance of `advance` em (0.52; 0.46 for a condensed face), capitals
 * counted wider than lowercase (titleWidth). `measure`
 * and `steps` share one unit. Breaks fall at spaces; a word longer than a line
 * breaks anywhere, which the title CSS allows with overflow-wrap:anywhere.
 *
 * The first step that fits `maxLines` with every word whole wins; a word is split
 * only at the last step. Returns { size, lines, clamp, broken }. `clamp` is true when even the last step
 * needs more than `maxLines`; the title is then clamped with an ellipsis on the
 * cover and printed in full elsewhere. `lines` never exceeds `maxLines`.
 */
export function fitTitle(name, { maxLines = 3, steps = [], measure = 100, advance = 0.52 } = {}) {
  const text = String(name ?? '').trim().replace(/\s+/g, ' ')
  const sizes = steps.length ? steps : [measure / 10]
  const wrap = (size) => {
    const cap = Math.max(1, Math.floor(measure / (size * advance)))
    let lines = text ? 1 : 0
    let used = 0
    let broken = false
    for (const word of text.split(' ')) {
      if (!word) continue
      const width = titleWidth(word)
      const need = used ? used + 1 + width : width
      if (need <= cap) { used = need; continue }
      if (used) { lines += 1; used = 0 }
      if (width > cap) {
        broken = true
        lines += Math.ceil(width / cap) - 1
        used = width % cap || cap
      } else {
        used = width
      }
    }
    return { lines, broken }
  }
  // A smaller step that keeps every word whole beats a larger one that splits a word;
  // a word is split only at the last step.
  for (const size of sizes.slice(0, -1)) {
    const { lines, broken } = wrap(size)
    if (lines <= maxLines && !broken) return { size, lines, clamp: false, broken }
  }
  const size = sizes[sizes.length - 1]
  const last = wrap(size)
  if (last.lines <= maxLines) return { size, lines: last.lines, clamp: false, broken: last.broken }
  return { size, lines: maxLines, clamp: true, broken: last.broken }
}

/**
 * `name` cut to whole words with a closing ellipsis when it needs more than `maxLines`
 * lines at `size` (same units and advance as fitTitle). The CSS line clamp alone cuts a
 * long title wherever the third line runs out, which can be mid-word ("Subur…"); this
 * drops the words that do not fit first, so the clamp is only a backstop. A name that
 * fits, or whose first word alone is longer than a line, comes back unchanged;
 * a longer word later on is dropped like any other that does not fit.
 */
export function clampTitle(name, size, { maxLines = 3, measure = 100, advance = 0.52 } = {}) {
  const text = String(name ?? '').trim().replace(/\s+/g, ' ')
  const cap = Math.max(1, Math.floor(measure / (size * advance)))
  const words = text.split(' ').filter(Boolean)
  let lines = words.length ? 1 : 0
  let used = 0
  let kept = 0
  for (const word of words) {
    const width = titleWidth(word)
    const need = used ? used + 1 + width : width
    if (need <= cap) { used = need; kept += 1; continue }
    if (width > cap) { if (!kept) return text; break }
    if (lines >= maxLines) break
    lines += 1
    used = width
    kept += 1
  }
  if (kept === words.length || kept === 0) return text
  // The ellipsis needs a column on the last line; if the line is full, drop its last word.
  if (used + 1 > cap && kept > 1) kept -= 1
  return `${words.slice(0, kept).join(' ').replace(/[\s,;:.\-–—]+$/, '')}…`
}

// The most colours a template lays out. The tool never produces more; a longer
// list is cut to its first 13 rather than shrunk until it is unreadable.
export const MAX_SLOTS = 13

// Columns of each book template's swatch grid.
const GRID_COLUMNS = { specification: 3, monograph: 3, atlas: 4 }

// Presentation lays its swatches in one row up to this many colours, then in two.
const ONE_ROW_MAX = 6
// The widest a row of two may run, in cell widths (the primary counts for two).
const ROW_UNITS_MAX = 8

/**
 * Presentation's rows: one up to six colours; 7 to 13 in two, the brand colours (the
 * primary and the accents) above and the neutrals below when both rows then fit in
 * ROW_UNITS_MAX cell widths, else the colours in order, split so the rows run as even as
 * they can. The primary is a double-width cell wherever it sits.
 */
function presentationLayout(count, kinds) {
  const cell = (i) => ({ i, span: i === 0 ? 2 : 1 })
  const all = Array.from({ length: count }, (_, i) => i)
  if (count <= ONE_ROW_MAX) return [all.map(cell)]
  const units = (row) => row.reduce((sum, i) => sum + cell(i).span, 0)
  if (Array.isArray(kinds)) {
    const brand = all.filter((i) => i === 0 || (kinds[i] && kinds[i] !== 'neutral'))
    const rest = all.filter((i) => !brand.includes(i))
    if (rest.length && Math.max(units(brand), units(rest)) <= ROW_UNITS_MAX) return [brand.map(cell), rest.map(cell)]
  }
  const half = Math.ceil(units(all) / 2)
  let take = 1
  while (take < count - 1 && units(all.slice(0, take)) < half) take += 1
  return [all.slice(0, take).map(cell), all.slice(take).map(cell)]
}

/**
 * Rows of cells for `n` colours: [[{ i, span }]], `i` the slot index and `span`
 * the columns it takes. The primary (slot 0) takes a whole row of its own, so its
 * cell is always the largest; the rest follow one column each. 'presentation' is the
 * exception: its rows are presentationLayout's, and `kinds` (each slot's 'primary',
 * 'accent' or 'neutral') is what it tells brand colours from neutrals by. 0 colours is
 * no rows, and anything over MAX_SLOTS is cut to MAX_SLOTS.
 */
export function paletteLayout(n, template = 'specification', kinds = null) {
  const count = Math.min(MAX_SLOTS, Math.max(0, Math.floor(Number(n) || 0)))
  if (!count) return []
  if (template === 'presentation') return presentationLayout(count, kinds)
  const cols = GRID_COLUMNS[Object.hasOwn(GRID_COLUMNS, template) ? template : 'specification']
  const rows = [[{ i: 0, span: cols }]]
  for (let start = 1; start < count; start += cols) {
    const row = []
    for (let i = start; i < Math.min(count, start + cols); i += 1) row.push({ i, span: 1 })
    rows.push(row)
  }
  return rows
}

/**
 * A template's chrome @font-face, read through the generator's `fontData(file)`
 * (the server's reader; absent in the browser and in the golden tests). Any failure
 * is '' and the page falls back to the system face rather than failing to render.
 */
export function chromeFor(chrome, fontData) {
  let base64 = null
  try { base64 = typeof fontData === 'function' ? fontData(chrome.file) : null } catch { base64 = null }
  return chromeFace(chrome, base64)
}

/**
 * The @font-face for a template's chrome face from the base64 the server read, or
 * '' when there is none (the browser, the golden tests): the stack then falls back
 * to the system face. `chrome` is the template's own constant; the data is
 * accepted only as plain base64 within the font budget.
 */
export function chromeFace(chrome, base64) {
  if (!chrome || typeof base64 !== 'string' || base64.length > 160000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return ''
  return `@font-face{font-family:'${esc(chrome.family)}';src:url(data:font/woff2;base64,${base64}) format('woff2');font-weight:${esc(chrome.weights)};font-display:block}`
}

/** The name of a reading ink the generator hands over: black is all zeros, anything else is white. */
export const inkName = (hex) => (/^#0+$/.test(String(hex)) ? 'Black' : 'White')

const PX_MM = 25.4 / 96

/**
 * The one factor every specimen in a type scale is set at: 1 (true size) when the
 * ladder fits its table, else the largest k that does. One factor for the whole
 * ladder keeps the ratios between steps true, which a per-row cap does not.
 * A row is as tall as its specimen (`lineHeight` × size) or its row text
 * (`textMm`), whichever is taller, plus `padMm`; the widest specimen must fit `widthMm`.
 *
 * @param {{ name: string, px: number }[]} ladder
 * @param {{ roomMm: number, widthMm: number, padMm: number, textMm: number, lineHeight?: number }} fit
 * @returns {{ k: number, label: string }} `label` is the column head: "Specimen", or "Specimen, at 72%"
 */
export function specimenScale(ladder, { roomMm, widthMm, padMm, textMm, lineHeight = 1.15 }) {
  // A specimen never drops under 1px (it would print as 0), even when that overflows the table: a clipped row beats an empty one.
  const minPx = Math.min(...ladder.map((s) => s.px))
  const floorK = Number.isFinite(minPx) && minPx > 0 ? Math.min(1, Math.ceil(100 / minPx) / 100) : 0.1
  const height = (k) => ladder.reduce((sum, s) => sum + Math.max(s.px * k * lineHeight * PX_MM, textMm) + padMm, 0)
  const widest = Math.max(...ladder.map((s) => String(s.name).length * 0.6 * s.px * PX_MM))
  let k = Math.min(1, widthMm / widest)
  if (height(k) > roomMm) {
    let lo = 0.01
    let hi = k
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2
      if (height(mid) > roomMm) hi = mid
      else lo = mid
    }
    k = lo
  }
  k = Math.max(floorK, Math.floor(k * 100) / 100)
  return { k, label: k < 1 ? `Specimen, at ${Math.round(k * 100)}%` : 'Specimen' }
}
