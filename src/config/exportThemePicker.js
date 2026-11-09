// What the Export dialog's Theme picker shows for each export theme, and which of the dialog's files take a theme. The ids, names and
// the Free rule are src/data/exportThemes.js's (the one table the server reads too); this adds the sample brand each preview is
// drawn from, the page shape, and the picture paths. No theme code is here: the previews are pictures of the sample brands' pages.

import { EXPORT_THEMES, isThemeExportPro } from '../data/exportThemes.js'
import { fileName } from '../utils/exportFileName.js'

// Page counts of the two documents, checked against the engine's page lists by tests/unit/export-theme-picker.test.js.
export const UI_KIT_PAGES = 25
export const GUIDELINES_PAGES = 33

const SAMPLE = Object.freeze({
  '01-presentation': ['Kerbside', '16:9'],
  '02-poster': ['Encore', '16:9'],
  '03-broadsheet': ['Saltbush', '16:9'],
  '04-standards': ['Two Shores', 'A4 landscape'],
  '05-specimen': ['Margin', 'A4'],
  '06-studio': ['Offcut', 'A4'],
  '07-spec': ['Northern Current', 'A4'],
  '08-monograph': ['Long Room', 'A4'],
  '09-blueprint': ['Plumbline', 'A4'],
  '10-inuse': ['Shallow End', 'A4'],
})

/** The ten themes in the picker's order: { id, name, brand, shape, free } (free: the UI kit is free in it). */
export const PICKER_THEMES = Object.freeze(EXPORT_THEMES.map((t) => Object.freeze({
  ...t, brand: SAMPLE[t.id][0], shape: SAMPLE[t.id][1], free: !isThemeExportPro('ui-kit', t.id),
})))

export const pickerTheme = (id) => PICKER_THEMES.find((t) => t.id === id) || PICKER_THEMES[0]

/** The theme a picker starts on: the first Free one for an account that is not Pro, else the first. */
export const defaultThemeId = (isPro) => (isPro ? PICKER_THEMES[0] : PICKER_THEMES.find((t) => t.free)).id

// The dialog's files that take a theme, as the route's row and format. The book as PNG pages is drawn in the browser and has none.
export const THEMED_FILES = Object.freeze({
  kit: Object.freeze({ row: 'ui-kit', format: 'zip' }),
  book: Object.freeze({ row: 'book', format: 'pdf' }),
  'book-html': Object.freeze({ row: 'book', format: 'html' }),
  guidelines: Object.freeze({ row: 'slides', format: 'pdf' }),
  'guidelines-html': Object.freeze({ row: 'slides', format: 'html' }),
})
export const themedFile = (fileId) => (Object.hasOwn(THEMED_FILES, fileId) ? THEMED_FILES[fileId] : null)

// The zips a themed file downloads as, by file id. The PDF rows save nothing: the document opens in the print window.
const THEMED_ZIPS = Object.freeze({ kit: 'ui-kit', 'book-html': 'brand-book', 'guidelines-html': 'brand-guidelines' })

/** `lumen-ui-kit-04-standards.zip` from ('Lumen', 'kit', '04-standards'), or '' for a file that is not a themed zip. */
export const themedZipName = (project, fileId, themeId) => (
  Object.hasOwn(THEMED_ZIPS, fileId) ? fileName(project, `${THEMED_ZIPS[fileId]}-${themeId}`, 'zip') : ''
)

/** True when this file in this theme needs Pro (the same call the server makes). */
export const themedFileIsPro = (fileId, themeId) => {
  const t = themedFile(fileId)
  return t ? isThemeExportPro(t.row, themeId) : false
}

const SHAPE_CLASS = Object.freeze({ '16:9': 'wide', 'A4 landscape': 'land', A4: 'port' })
export const shapeClass = (shape) => SHAPE_CLASS[shape] || 'port'

/** The preview pictures of one theme: [{ src, alt }] for a kind ('kit' | 'book' | 'guidelines'). */
export function themeShots(kind, theme) {
  const t = typeof theme === 'string' ? pickerTheme(theme) : theme
  const at = (key, what) => ({ src: `/export-themes/${t.id}-${key}.webp`, alt: `${t.name} theme ${what}, shown with the ${t.brand} sample brand` })
  if (kind === 'book') return [at('book', 'brand book, top of the first page')]
  if (kind === 'guidelines') return [at('guideCover', 'brand guidelines, cover page'), at('guidePalette', 'brand guidelines, palette page')]
  return [at('kitScreen', 'UI kit, app screen page'), at('kitButtons', 'UI kit, buttons page')]
}

export const themeThumb = (theme) => `/export-themes/${theme.id}-thumb.webp`

/** The preview caption and the file's description for a kind, in a theme. */
export function themeLines(kind, theme) {
  const t = typeof theme === 'string' ? pickerTheme(theme) : theme
  if (kind === 'book') return { caption: 'The top of the brand book.', desc: `The ${t.name} brand book, in light and dark.` }
  if (kind === 'guidelines') return { caption: `Cover and palette pages, ${t.shape}.`, desc: `The ${t.name} brand guidelines: ${GUIDELINES_PAGES} pages, ${t.shape}.` }
  return { caption: `An app screen and the buttons page, ${t.shape}.`, desc: `The ${t.name} UI kit: ${UI_KIT_PAGES} pages, ${t.shape}, with a code package and an example app.` }
}
