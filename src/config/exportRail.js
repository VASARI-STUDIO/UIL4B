// The rail of the Export dialog: four kinds of export, in the order the dialog lists them. Each item owns some of the dialog's
// categories (src/config/dialogExport.js EXPORT_TYPES), and a category owns its file formats (src/config/exportFormats.js, read
// only here). So this file holds only the grouping and the words; which format is free or Pro, and which templates are free,
// stay in the format and theme config, and the server still decides Free or Pro.
//
//   Brand guidelines  the guidelines deck (16:9) and the A4 brand book
//   UI style guide    the UI kit, the style guide (HTML, Markdown, themed) and the app-ready bundle
//   Image             the style guide as PNG or JPEG, and the book as page images
//   Code              the tokens (CSS, JSON, Tailwind) and the contrast pairs
//
// `choice` names the row under the template line when an item has more than one category (Layout for the brand, Document for the
// UI kit). An item with one category shows no such row.
import { EXPORT_TYPES } from './dialogExport.js'

export const RAIL = Object.freeze([
  Object.freeze({ id: 'brand', label: 'Brand guidelines', short: 'Brand', choice: 'Layout', categories: Object.freeze(['slides', 'book']) }),
  Object.freeze({ id: 'ui', label: 'UI style guide', short: 'UI', choice: 'Document', categories: Object.freeze(['kit', 'guide', 'apps']) }),
  Object.freeze({ id: 'image', label: 'Image', short: 'Image', choice: 'Image of', categories: Object.freeze(['guide-image', 'book-pages']) }),
  Object.freeze({ id: 'code', label: 'Code', short: 'Code', choice: 'Code', categories: Object.freeze(['tokens', 'contrast']) }),
])

// The pages of the free style guide, in order (api/_lib/exportThemes/engine/pages.js STYLE_PAGES). The free version of the
// UI style guide shows these; a later slice draws them as the "free version" list.
export const STYLE_PAGES = Object.freeze(['Cover', 'Logo', 'Colour', 'Type', 'Contrast', 'Tokens', 'Usage'])

/** The rail item that owns a category id, or the first item for an id none lists. */
export const railOfCategory = (categoryId) => RAIL.find((r) => r.categories.includes(categoryId)) || RAIL[0]

/** A rail item's categories, as the dialog's own category objects, in the item's order. */
export const railCategories = (item) => {
  const all = EXPORT_TYPES.flatMap((t) => t.categories)
  return item.categories.map((id) => all.find((c) => c.id === id)).filter(Boolean)
}

/** The type id (EXPORT_TYPES) that holds a category: what a pick's `type` must be for that category. */
export const typeIdOfCategory = (categoryId) => (EXPORT_TYPES.find((t) => t.categories.some((c) => c.id === categoryId)) || EXPORT_TYPES[0]).id
