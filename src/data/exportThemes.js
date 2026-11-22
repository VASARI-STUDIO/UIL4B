// The export themes and which of their downloads a free account may have. Data only: the server (api/_lib/exportThemeRoute.js)
// and the client read the same table, so a button and the route that backs it cannot disagree. The theme code itself is
// server-only and is never imported from here.

export const EXPORT_THEMES = Object.freeze([
  Object.freeze({ id: '01-presentation', name: 'Presentation' }),
  Object.freeze({ id: '02-poster', name: 'Ticket' }),
  Object.freeze({ id: '03-broadsheet', name: 'Broadsheet' }),
  Object.freeze({ id: '04-standards', name: 'Standards' }),
  Object.freeze({ id: '05-specimen', name: 'Catalogue' }),
  Object.freeze({ id: '06-studio', name: 'Studio' }),
  Object.freeze({ id: '07-spec', name: 'Specification' }),
  Object.freeze({ id: '08-monograph', name: 'Riso' }),
  Object.freeze({ id: '09-blueprint', name: 'Blueprint' }),
  Object.freeze({ id: '10-inuse', name: 'In use' }),
  // Pro themes with all three rows. Named apart from 04 Standards so the picker shows two different names.
  Object.freeze({ id: '21-presentation', name: 'Keynote', extraRows: Object.freeze(['guide']) }),
  Object.freeze({ id: '22-ticket', name: 'Stub' }),
  Object.freeze({ id: '23-broadsheet', name: 'Front Page' }),
  Object.freeze({ id: '24-standards', name: 'Standards Plate' }),
  Object.freeze({ id: '26-notebook', name: 'Notebook' }),
  Object.freeze({ id: '28-riso', name: 'Print Shop' }),
  Object.freeze({ id: '29-blueprint', name: 'Drawing Sheet' }),
  Object.freeze({ id: '30-fluted', name: 'Fluted' }),
  Object.freeze({ id: '31-contact', name: 'Contact' }),
  Object.freeze({ id: '32-dieline', name: 'Dieline' }),
  // The Free pair. Guidelines-only themes: they have slides and nothing else, and those are free.
  Object.freeze({ id: '25-label', name: 'Label', rows: Object.freeze(['slides']), free: true }),
  Object.freeze({ id: '27-swissfield', name: 'Swiss Field', rows: Object.freeze(['slides', 'guide']), free: true }),
])

// Each row and the file formats it can download in. The UI kit is one zip; the book and the slides come as a page to print or a zip.
export const THEME_ROW_FORMATS = Object.freeze({
  'ui-kit': Object.freeze(['zip']),
  book: Object.freeze(['pdf', 'html']),
  slides: Object.freeze(['pdf', 'html']),
  // The themed style guide: A4 pages to print, a zip of the pages, fonts and style-guide.md, or the markdown alone.
  guide: Object.freeze(['pdf', 'html', 'md']),
})

// Rows a theme has only when it opts in: by a rows list that names them, or by `extraRows` on a theme with no rows list (which keeps every
// other row). The style guide is drawn by a theme's own lane (lane-guide.js), so a theme without one must not be offered it. Gating follows
// the guidelines: free where they are free. Keynote (21) opts in by extraRows and is Pro only. Swiss Field (27) stays on a rows list because it is guidelines-only (no UI kit, no book).
const OPT_IN_ROWS = Object.freeze(['guide'])

// The themes whose UI kit a free account can download. Interim: Standards, until the Free pair (Label and Swiss Field) has UI kits
// of its own; the pair draws the guidelines only for now. Every other theme and row is Pro. src/config/exportFormats.js mirrors
// this as Standards' `freeExports`, and a unit test holds the two together.
export const FREE_UI_KIT_THEMES = Object.freeze(['04-standards'])

export const isExportTheme = (theme) => typeof theme === 'string' && EXPORT_THEMES.some((t) => t.id === theme)
export const isThemeRowFormat = (row, format) => typeof row === 'string' && typeof format === 'string'
  && Object.hasOwn(THEME_ROW_FORMATS, row) && THEME_ROW_FORMATS[row].includes(format)

/**
 * True when a table entry has the row. An entry with a `rows` list has exactly those rows. An entry without one has every row except the
 * opt-in ones, and gets an opt-in row by naming it in `extraRows` (so opting in never means restating the rows it already has).
 */
export const entryHasRow = (t, row) => (t.rows ? t.rows.includes(row) : !OPT_IN_ROWS.includes(row) || (t.extraRows || []).includes(row))

/** True when the theme has the row. */
export function themeHasRow(theme, row) {
  const t = EXPORT_THEMES.find((x) => x.id === theme)
  return Boolean(t) && Object.hasOwn(THEME_ROW_FORMATS, row) && entryHasRow(t, row)
}

/** True when downloading the row in the theme needs Pro. Anything that is not a known row and theme, or a row the theme lacks, counts as Pro. */
export function isThemeExportPro(row, theme) {
  if (!themeHasRow(theme, row)) return true
  if (EXPORT_THEMES.find((x) => x.id === theme).free) return false
  return !(row === 'ui-kit' && FREE_UI_KIT_THEMES.includes(theme))
}
