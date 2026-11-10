import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'
import { exportPanel, typeRadio } from './export-rows.js'
import { mockThemeApi } from './export-theme-mock.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  const now = new Date().toISOString()
  return { id: 'export-project', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

for (const width of [390, 1440]) {
  test.describe(`saved project export at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: true })

    for (const [openerName, area] of [['the header Export project', '.pjd-head-actions'], ['the export bar Export project', '.pjd-export']]) {
      for (const input of ['mouse', 'touch', 'Enter']) {
        test(`${openerName} downloads a UI kit with ${input}`, async ({ page }) => {
          // The kit comes from the export route as a zip; a stand-in answers it and records what the dialog asked for.
          const calls = await mockThemeApi(page)
          await signIn(page, { plan: 'free', projects: [savedProject()] })
          await go(page, '/projects')
          await page.locator('.uh-card-name[data-project="Harbour"]').click()
          await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()

          const opener = page.locator(area).getByRole('button', { name: 'Export project', exact: true })
          const activate = async (button) => {
            if (input === 'Enter') {
              await button.focus()
              await button.press('Enter')
            } else if (input === 'touch') await button.tap()
            else await button.click()
          }
          await opener.focus()
          await activate(opener)
          const panel = exportPanel(page)
          await expect(panel).toBeVisible()
          await expect(panel.getByRole('heading', { name: 'Export Harbour' }), 'the popup is named for the project and takes focus').toBeFocused()
          await expect(page.locator('#main')).toHaveAttribute('inert', '')
          await activate(typeRadio(panel, 'UI kit'))

          const [download] = await Promise.all([
            page.waitForEvent('download'),
            activate(panel.getByRole('button', { name: 'Export UI kit', exact: true })),
          ])
          expect(download.suggestedFilename()).toBe('harbour-ui-kit-04-standards.zip')
          expect(await download.failure()).toBeNull()
          const stream = await download.createReadStream()
          const chunks = []
          for await (const chunk of stream) chunks.push(chunk)
          expect(Buffer.concat(chunks).subarray(0, 2).toString(), 'a real zip').toBe('PK')
          expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ row: 'ui-kit', format: 'zip', projectName: 'Harbour' })])
          expect(calls[0].body.design.palette.colors[0], 'for this project\u2019s colours').toBe('#1F4B8E')

          await expect(panel.getByText('Downloaded harbour-ui-kit-04-standards.zip.')).toBeVisible()
          await page.keyboard.press('Escape')
          await expect(panel).toHaveCount(0)
          await expect(page.locator('#main')).not.toHaveAttribute('inert', '')
          await expect(opener).toBeFocused()
        })
      }
    }
  })
}
