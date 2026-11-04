// How a spec reaches one export file in the Export popup (src/components/export/):
// pick the type in the rail, then the category under Brand book, then the file in
// that category's "{Category} file type" switch. Where a format lives is read from
// src/config/dialogExport.js, so a file moved to another category is followed here.
// What the popup SAYS (file labels, button words) is written out below, not read
// from the source, so a reworded button fails the spec instead of agreeing with it.
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import { exportLocation } from '../../src/config/dialogExport.js'

/** The popup (the dialog inside the .xd overlay). */
export const exportPanel = (page) => page.locator('.xd').getByRole('dialog')
export const exportDialog = exportPanel

export const formatById = (id) => {
  const format = EXPORT_FORMATS.find((f) => f.id === id)
  if (!format) throw new Error(`no export format "${id}"`)
  return format
}

/** { type, category } for a format id, from the popup's own config. */
export const locationOf = (id) => {
  const where = exportLocation(id)
  if (!where) throw new Error(`export format "${id}" is in no category`)
  return where
}

// The file switch's pill for each format. The UI kit has none (its file is text).
export const FILE_LABEL = {
  book: 'PDF', 'book-png': 'PNG pages', 'book-html': 'HTML',
  guidelines: 'PDF', 'guidelines-html': 'HTML',
  html: 'HTML', png: 'PNG', jpeg: 'JPEG', md: 'Markdown',
  kit: null, css: 'CSS stylesheet', json: 'JSON',
  tailwind: 'Tailwind theme', contrast: 'Contrast CSV', 'contrast-json': 'Contrast JSON',
}

// The primary button's words once the file is the pick (an account that may have it).
export const ACTION = {
  book: 'Export PDF', 'book-png': 'Export PNG pages', 'book-html': 'Export HTML',
  guidelines: 'Export PDF', 'guidelines-html': 'Export HTML',
  html: 'Export style guide', png: 'Export style guide', jpeg: 'Export style guide', md: 'Export style guide',
  kit: 'Export UI kit', css: 'Export CSS', json: 'Export JSON',
  tailwind: 'Export Tailwind theme', contrast: 'Export contrast pairs', 'contrast-json': 'Export contrast pairs',
}

/** The primary button's label for a format. */
export const actionLabel = (id) => {
  if (!ACTION[id]) throw new Error(`no button label known for "${id}"`)
  return ACTION[id]
}

/** The popup's root, from either the page or the dialog locator. */
const rootOf = (panelOrPage) => (
  typeof panelOrPage.getByRole === 'function' && !panelOrPage.goto ? panelOrPage : exportPanel(panelOrPage)
)

/** The rail's type radio: "Brand book", "UI kit" or "Code". */
export const typeRadio = (panelOrPage, typeName) => rootOf(panelOrPage)
  .getByRole('radiogroup', { name: 'Export type' })
  .getByRole('radio', { name: new RegExp(`^${typeName}`) })

/** The Brand book category radio: "Book, A4 pages, Pro", "Slides, 16:9, Pro" or "Style guide, A4, free". */
export const categoryRadio = (panelOrPage, categoryName) => rootOf(panelOrPage)
  .getByRole('radiogroup', { name: 'Brand book categories' })
  .getByRole('radio', { name: new RegExp(`^${categoryName},`) })

/** The File step's radiogroup for a category ("Book file type"). */
export const fileGroup = (panelOrPage, categoryName) => rootOf(panelOrPage)
  .getByRole('radiogroup', { name: `${categoryName} file type` })

/** The dock's primary button, the status line and the error line. */
export const primaryButton = (panelOrPage) => rootOf(panelOrPage).locator('.xd-primary')
export const dockStatus = (panelOrPage) => rootOf(panelOrPage).locator('.xd-status')
export const dockError = (panelOrPage) => rootOf(panelOrPage).locator('.xd-error')

/** Choose a file: its type, then its category (Brand book only), then its pill where the category has a switch. */
export async function chooseFormat(panelOrPage, id) {
  const panel = rootOf(panelOrPage)
  const { type, category } = locationOf(id)
  await typeRadio(panel, type.name).click()
  if (type.categories.length > 1) await categoryRadio(panel, category.name).click()
  if (category.files.length > 1) {
    await fileGroup(panel, category.name).getByRole('radio', { name: FILE_LABEL[id], exact: true }).click()
  }
}

/** Choose a file, press the primary button and return the download it starts. */
export async function exportAs(page, id) {
  await chooseFormat(page, id)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    primaryButton(page).click(),
  ])
  return download
}
