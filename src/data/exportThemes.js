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
])

// Each row and the file formats it can download in. The UI kit is one zip; the book and the slides come as a page to print or a zip.
export const THEME_ROW_FORMATS = Object.freeze({
  'ui-kit': Object.freeze(['zip']),
  book: Object.freeze(['pdf', 'html']),
  slides: Object.freeze(['pdf', 'html']),
})

// The themes whose UI kit a free account can download. Every other row and theme is Pro.
export const FREE_UI_KIT_THEMES = Object.freeze(['04-standards', '07-spec'])

export const isExportTheme = (theme) => typeof theme === 'string' && EXPORT_THEMES.some((t) => t.id === theme)
export const isThemeRowFormat = (row, format) => typeof row === 'string' && typeof format === 'string'
  && Object.hasOwn(THEME_ROW_FORMATS, row) && THEME_ROW_FORMATS[row].includes(format)

/** True when downloading `row` in `theme` needs Pro. Anything that is not a known row and theme counts as Pro. */
export function isThemeExportPro(row, theme) {
  return !(row === 'ui-kit' && FREE_UI_KIT_THEMES.includes(theme))
}
