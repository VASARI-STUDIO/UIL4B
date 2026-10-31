// Contrast pairs: every text/ground pair the palette can make, as a CSV and a JSON file.
//
// Ratios come from the one `contrast` function the books use (2 decimals, rounded
// before the grade is read), so a pair here has the same ratio and the same result
// as the same pair in the design system book. Nothing is estimated.
//
// ROWS. Each palette colour is a foreground; the grounds are every other palette
// colour plus white and black (paper and ink), so n colours give n * (n - 1) + 2n
// rows. A colour is never paired with a ground of the same hex.
//
// FLAGS (WCAG 2.2): aa_text 4.5, aaa_text 7, aa_large_ui 3 (large text, and UI
// components and graphics), aaa_large_text 4.5.
//
// Pure functions over a plain design object.

import { contrast } from './styleGuideExport.js'
import { readBook } from './bookModel.js'
import { paletteRole } from './systemRoles.js'

const HEADER = ['foreground', 'foreground_hex', 'background', 'background_hex', 'ratio', 'aa_text', 'aaa_text', 'aa_large_ui', 'aaa_large_text']
const PAPER = { name: 'white', hex: '#ffffff' }
const INK = { name: 'black', hex: '#000000' }

/** The WCAG results for a ratio, as booleans. */
export function wcagFlags(ratio) {
  return { aa_text: ratio >= 4.5, aaa_text: ratio >= 7, aa_large_ui: ratio >= 3, aaa_large_text: ratio >= 4.5 }
}

/**
 * Every pair, as { foreground, background, ratio, ...flags } where each side is
 * { name, hex } (name is the CSS custom property, or white / black).
 */
export function contrastPairs(design) {
  const colours = readBook(design).palette.map((hex, i) => ({ name: `--color-${paletteRole(i)}`, hex: hex.toLowerCase() }))
  const grounds = [...colours, PAPER, INK]
  const rows = []
  for (const fg of colours) {
    for (const bg of grounds) {
      if (fg.hex === bg.hex) continue
      const ratio = contrast(fg.hex.toUpperCase(), bg.hex.toUpperCase())
      rows.push({ foreground: fg, background: bg, ratio, ...wcagFlags(ratio) })
    }
  }
  return rows
}

const pf = (v) => (v ? 'pass' : 'fail')
const csvCell = (v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

/** The pairs as CSV: a header row, then one row per pair. Ratios have two decimals. */
export function buildContrastPairsCsv(design) {
  const lines = [HEADER.join(',')]
  for (const p of contrastPairs(design)) {
    lines.push([
      p.foreground.name, p.foreground.hex, p.background.name, p.background.hex, p.ratio.toFixed(2),
      pf(p.aa_text), pf(p.aaa_text), pf(p.aa_large_ui), pf(p.aaa_large_text),
    ].map(csvCell).join(','))
  }
  return `${lines.join('\n')}\n`
}

/** The same pairs as JSON: ratio as a number (rounded to 2 decimals), flags as booleans. */
export function buildContrastPairsJson(design, { projectName = 'Design System' } = {}) {
  const pairs = contrastPairs(design).map((p) => ({
    foreground: p.foreground,
    background: p.background,
    ratio: p.ratio,
    aa_text: p.aa_text,
    aaa_text: p.aaa_text,
    aa_large_ui: p.aa_large_ui,
    aaa_large_text: p.aaa_large_text,
  }))
  const doc = {
    description: `${String(projectName ?? '')}: contrast pairs. aa_text is 4.5:1, aaa_text 7:1, aa_large_ui 3:1 (large text and UI components), aaa_large_text 4.5:1.`,
    pairs,
  }
  return `${JSON.stringify(doc, null, 2)}\n`
}
