// The stock page previews of each export theme: theme -> ordered pages -> { id, kind, label, src1x, src2x, w, h, pro }.
// The dialog's page gallery and main image read pages only through previewPages(), so this file is the one place that knows
// where a page picture lives and how big it is.
//
//   kind   which document the page belongs to: 'kit' | 'book' | 'guidelines'
//   src1x  the picture at its own size; src2x the retina picture, or '' when there is none (srcSet is then left out)
//   w, h   the picture's pixel size, so the box is reserved at the right aspect before it loads
//   pro    true when the document is Pro in this theme (themedFileIsPro's table: src/data/exportThemes.js)
//
// Today's pictures are the single-density rasters in public/export-themes, one or two per document.

import { isThemeExportPro, themeHasRow } from '../data/exportThemes.js'
import { pickerTheme } from './exportThemePicker.js'

/** The one place the address of a page picture is built. */
export const pageUrl = (themeId, key) => `/export-themes/${themeId}-${key}.webp`

// Pixel size of a theme's pictures by its sample page shape (config/exportThemePicker.js); the book is one wide frame in every theme.
const SIZE = Object.freeze({
  '16:9': [840, 472], 'A4 landscape': [720, 508], A4: [600, 850], '5:4': [600, 480], '4:5': [600, 750], '1:1': [600, 600], '3:2': [720, 480],
})
const BOOK_SIZE = Object.freeze([1424, 606])

// kind -> the Free/Pro row it is, and its pages in order.
const KINDS = Object.freeze([
  { kind: 'kit', row: 'ui-kit', pages: [['kitScreen', 'App screen'], ['kitButtons', 'Buttons']] },
  { kind: 'guidelines', row: 'slides', pages: [['guideCover', 'Cover'], ['guidePalette', 'Palette']] },
  { kind: 'book', row: 'book', pages: [['book', 'First page']] },
])

/** Every stock page of a theme, grouped by document in the order kit, guidelines, book. [] for an unknown theme. */
export function previewPages(themeId) {
  const theme = pickerTheme(themeId)
  if (!theme || theme.id !== themeId) return []
  const out = []
  for (const k of KINDS) {
    if (!themeHasRow(theme.id, k.row)) continue
    const [w, h] = k.kind === 'book' ? BOOK_SIZE : SIZE[theme.shape] || SIZE['A4 landscape']
    const pro = isThemeExportPro(k.row, theme.id)
    for (const [key, label] of k.pages) {
      out.push(Object.freeze({ id: key, kind: k.kind, label, src1x: pageUrl(theme.id, key), src2x: '', w, h, pro }))
    }
  }
  return out
}

/** The pages of one document in a theme. */
export const previewPagesFor = (themeId, kind) => previewPages(themeId).filter((p) => p.kind === kind)
