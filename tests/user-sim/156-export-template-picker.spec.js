// THE EXPORT DIALOG HAS NO LAYOUT PICKER FOR THE THEMED FILES.
//
// The UI kit, the book and the slides (PDF and HTML) used to offer a Layout step with three template tiles each (Studio, Manual,
// Showcase; Specification, Monograph, Atlas; Presentation, Poster, Grid). Those files now take one of ten themes through the
// Theme step instead (191-export-theme-picker.spec.js covers the picker). This spec keeps the other half true:
//
//   1. For a free and a Pro account, the themed files show a Theme step and no Template tiles and no Layout heading.
//   2. The book as PNG pages still has its Layout step, with the one-layout line and no tiles.
//   3. A themed request carries a theme and never a template.
//
// MUTATION
//   - ExportSteps: showLayout loses its `!themed &&`   -> test 1 (the Layout heading and the tiles come back for the themed files).
//   - useExportRunner: the themed request adds `template` -> test 3.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel, primaryButton } from './export-rows.js'
import { mockThemeApi, cleanHtml } from './export-theme-mock.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const TEMPLATE_NAMES = ['Studio', 'Manual', 'Showcase', 'Specification', 'Monograph', 'Atlas', 'Presentation', 'Poster', 'Grid']

async function openProject(page, plan = 'free') {
  await signIn(page, { plan })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  await expect(exportPanel(page)).toBeVisible()
  return exportPanel(page)
}
const step = (panel, name) => panel.getByRole('heading', { level: 3, name, exact: true })

for (const plan of ['free', 'pro']) {
  for (const file of ['kit', 'book', 'book-html', 'guidelines', 'guidelines-html']) {
    test(`${plan}: ${file} has a Theme step and no Layout step or template tiles`, async ({ page }) => {
      watch(page, `a ${plan} account looking for a layout choice on ${file}`)
      const panel = await openProject(page, plan)
      await chooseFormat(panel, file)
      await expect(step(panel, 'Theme')).toBeVisible()
      await expect(step(panel, 'Layout')).toHaveCount(0)
      await expect(panel.getByRole('radiogroup', { name: 'Template' })).toHaveCount(0)
      await expect(panel.locator('.exp-tpl-tile')).toHaveCount(0)
      // A theme is a name in the Theme step; no template name is a radio anywhere else in the dialog. The theme radios
      // carry sample brand names (one of them is Studio), so they are left out by their own group.
      const themes = await panel.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio').allInnerTexts()
      const offered = (await panel.getByRole('radio').allInnerTexts()).filter((t) => !themes.includes(t)).join('\n')
      for (const name of TEMPLATE_NAMES) expect(offered, `${name} is not a radio in the dialog`).not.toMatch(new RegExp(`^${name}\\b`, 'm'))
    })
  }

  test(`${plan}: the book as PNG pages keeps its Layout step with the one-layout line and no tiles`, async ({ page }) => {
    watch(page, `a ${plan} account choosing PNG pages`)
    const panel = await openProject(page, plan)
    await chooseFormat(panel, 'book-png')
    await expect(step(panel, 'Layout')).toBeVisible()
    await expect(panel.getByText('PNG pages use one layout.')).toBeVisible()
    await expect(panel.getByRole('radiogroup', { name: 'Template' })).toHaveCount(0)
    await expect(step(panel, 'Theme')).toHaveCount(0)
  })
}

test('a themed request carries the theme, the row and the format, and no template', async ({ page, context }) => {
  watch(page, 'a Pro account sending the book')
  await context.addInitScript(() => { window.print = () => {} })
  const calls = await mockThemeApi(page, () => ({ html: cleanHtml() }))
  const panel = await openProject(page, 'pro')
  await chooseFormat(panel, 'book')
  const [popup] = await Promise.all([context.waitForEvent('page'), primaryButton(panel).click()])
  await expect(popup.locator('#printed-doc')).toBeVisible()
  expect(calls).toHaveLength(1)
  expect(calls[0].body).toMatchObject({ theme: '01-presentation', row: 'book', format: 'pdf' })
  expect(Object.keys(calls[0].body)).not.toContain('template')
})
