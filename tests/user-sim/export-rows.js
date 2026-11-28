// How a spec reaches one export file in the Export popup (src/components/export/):
// pick the type in the rail, then the category's tab, then the file in
// that category's "{Category} file type" switch. Where a format lives is read from
// src/config/dialogExport.js, so a file moved to another category is followed here.
// What the popup SAYS (file labels, button words) is written out below, not read
// from the source, so a reworded button fails the spec instead of agreeing with it.
import { expect } from './base.js'
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

// The names the popup's rail and tabs had before the four-category layout, mapped to today's, so a spec that still says "Brand book" or
// "Slides" reaches the right place. Branding, UI, Image and Code are the rail; every category is a tab in the bar over the preview.
const RAIL = { Branding: 'Brand guidelines', 'Brand book': 'Brand guidelines', UI: 'UI style guide', 'UI kit': 'UI style guide' }
const TAB = { Book: 'Brand book', Slides: 'Guidelines' }

/** The rail's type radio: "Branding", "UI", "Image" or "Code". */
export const typeRadio = (panelOrPage, typeName) => rootOf(panelOrPage)
  .getByRole('radiogroup', { name: 'Export type' })
  .getByRole('radio', { name: new RegExp(`^${RAIL[typeName] || typeName}`) })

/** The tab for a category: "Guidelines, Brand guidelines", "Brand book, A4 pages, Pro" or "Style guide, A4". */
export const categoryRadio = (panelOrPage, categoryName) => rootOf(panelOrPage)
  .getByRole('tablist')
  .getByRole('tab', { name: new RegExp(`^${TAB[categoryName] || categoryName},`) })

/** The file switch under the page, a radiogroup named for the category ("Brand book file type"). */
export const fileGroup = (panelOrPage, categoryName) => rootOf(panelOrPage)
  .getByRole('radiogroup', { name: `${categoryName} file type` })

/** The dock's primary button, the status line and the error line. */
export const primaryButton = (panelOrPage) => rootOf(panelOrPage).locator('.xd-primary')
// Under .xd-dock: the stage has its own one-line status (.xd-stage-status), which the dock query must not match.
export const dockStatus = (panelOrPage) => rootOf(panelOrPage).locator('.xd-dock .xd-status')
export const dockError = (panelOrPage) => rootOf(panelOrPage).locator('.xd-error')

// Which rail item holds each category since the four-item rail (src/config/exportRail.js), written out here.
const CATEGORY_RAIL = {
  Guidelines: 'Brand guidelines', 'Brand book': 'Brand guidelines',
  'UI kit': 'UI style guide', 'Style guide': 'UI style guide', 'App-ready bundle': 'UI style guide',
  'Style guide image': 'Image', 'Book pages': 'Image',
  Tokens: 'Code', Contrast: 'Code',
}

/** Reach a category the way a person does: the rail item that holds it (when its tab is not already showing), then the tab. */
export async function pickCategory(panelOrPage, categoryName) {
  const tab = categoryRadio(panelOrPage, categoryName)
  if (!(await tab.count())) await typeRadio(panelOrPage, CATEGORY_RAIL[categoryName]).click()
  await tab.click()
}

/** Choose a file: the rail item and tab that hold its category, then its pill where the category has a switch. */
export async function chooseFormat(panelOrPage, id) {
  const panel = rootOf(panelOrPage)
  const { category } = locationOf(id)
  await pickCategory(panel, category.name)
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

/** The gallery's grid. The premium strip in the main view is a .xd-tpl-grid too (.xd-prem-grid), so it is left out here. */
export const GALLERY = '.xd-tpl-grid:not(.xd-prem-grid)'

/** Open "Change template" (the grid of templates in the dialog) if it is not open, and return the grid. */
export async function openTemplates(panelOrPage) {
  const panel = rootOf(panelOrPage)
  const grid = panel.locator(GALLERY)
  if (!(await grid.count())) await panel.getByRole('button', { name: 'Change template' }).click()
  await grid.waitFor()
  return grid
}

/** A template card by the template's own name (its label reads "<name>, <brand> sample brand[, Pro][, chosen]"). */
export const templateCard = (panelOrPage, name) => rootOf(panelOrPage)
  .locator(`${GALLERY} .xd-tpl-card`)
  .filter({ has: rootOf(panelOrPage).page().locator('.xd-tpl-n').getByText(name, { exact: true }) })

/** Choose a template the way a person does: Change template, then the card. The dialog returns to the preview with it chosen. */
export async function chooseTemplate(panelOrPage, name) {
  const panel = rootOf(panelOrPage)
  await openTemplates(panel)
  await templateCard(panel, name).click()
  await panel.locator(GALLERY).waitFor({ state: 'detached' })
}

/** The template in use: open the grid, read the pressed card, and go back to the preview. */
export async function expectTemplate(panelOrPage, name) {
  const panel = rootOf(panelOrPage)
  await openTemplates(panel)
  await expect(templateCard(panel, name)).toHaveAttribute('aria-pressed', 'true')
  await panel.getByRole('button', { name: 'Back to preview' }).click()
}

/** The grid as a person reads it: the card names in order, the ones that carry the Pro mark, and the chosen one. Goes back to the preview. */
export async function readTemplates(panelOrPage) {
  const panel = rootOf(panelOrPage)
  const grid = await openTemplates(panel)
  const read = await grid.locator('.xd-tpl-card').evaluateAll((cards) => ({
    names: cards.map((c) => c.querySelector('.xd-tpl-n').textContent),
    pro: cards.filter((c) => c.querySelector('.xd-tpl-pro')).map((c) => c.querySelector('.xd-tpl-n').textContent),
    chosen: cards.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.querySelector('.xd-tpl-n').textContent),
  }))
  await panel.getByRole('button', { name: 'Back to preview' }).click()
  await grid.waitFor({ state: 'detached' })
  return read
}

/** Open "File details" (the file list, the name, logo and identity fields) if it is closed, and return it. */
export async function openDetails(panelOrPage) {
  const more = rootOf(panelOrPage).locator('details.xd-more')
  if ((await more.getAttribute('open')) === null) await more.locator('summary').click()
  return more
}
