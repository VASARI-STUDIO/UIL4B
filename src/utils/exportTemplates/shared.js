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

/**
 * Rows of cells for `n` colours: [[{ i, span }]], `i` the slot index and `span`
 * the columns it takes. The primary (slot 0) takes a whole row of its own, so its
 * cell is always the largest; the rest follow one column each. 0 colours is no
 * rows, and anything over MAX_SLOTS is cut to MAX_SLOTS.
 */
export function paletteLayout(n, template = 'specification') {
  const count = Math.min(MAX_SLOTS, Math.max(0, Math.floor(Number(n) || 0)))
  const cols = GRID_COLUMNS[Object.hasOwn(GRID_COLUMNS, template) ? template : 'specification']
  if (!count) return []
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
