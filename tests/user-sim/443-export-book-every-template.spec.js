// THE BRAND BOOK BUILDS IN EVERY TEMPLATE, as PDF and as HTML, through the real server route.
//
// A Pro account with a saved project opens Export, picks the Brand book, and exports it in each template the grid lists. Each
// request is answered by the real document handler (export-live.js), so a template whose build throws on this palette answers
// 422 or 500 and the popup says "That file didn't build". Every template must answer 200 and the popup must show no error.
//
// The palette carries a mid blue (#2E7BB8) that sits just under 4.5:1 against near-black, the case that used to stop the build.
//
// MUTATION (must fail this spec): engine/color.js, make the contrast check throw for every pair -> every template fails.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { chooseFormat, exportPanel, primaryButton, readTemplates, chooseTemplate } from './export-rows.js'
import { serveExportRoutes } from './export-live.js'

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540']
  const now = new Date().toISOString()
  return { id: 'kerbside', name: 'Kerbside', design, createdAt: now, updatedAt: now }
}

async function openExport(page) {
  const served = await serveExportRoutes(page)
  await signIn(page, { plan: 'pro', projects: [savedProject()] })
  await go(page, '/projects/kerbside')
  await page.locator('.pjv-go').first().click()
  await expect(page, 'the tool page, not the project page').not.toHaveURL(/\/projects\//)
  await page.getByRole('button', { name: /^Export/ }).first().click()
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  return { panel, ...served }
}

for (const id of ['book', 'book-html']) {
  test(`the brand book ${id === 'book' ? 'PDF' : 'HTML'} builds in every template`, async ({ page }) => {
    test.setTimeout(240_000)
    watch(page, `the brand book ${id} in every template`)
    const { panel, documents } = await openExport(page)
    await chooseFormat(panel, id)
    const { names } = await readTemplates(panel)
    expect(names.length, 'the grid lists templates').toBeGreaterThan(0)
    const failed = []
    for (const name of names) {
      await chooseTemplate(panel, name)
      const before = documents.length
      await primaryButton(page).click()
      await expect.poll(() => documents.length, { message: `${name}: the document was asked for`, timeout: 60_000 }).toBeGreaterThan(before)
      const doc = documents[documents.length - 1]
      if (doc.status !== 200) failed.push(`${name}: ${doc.status}`)
    }
    expect(failed, 'every template answers 200').toEqual([])
    await expect(panel.getByText(/didn.t build/i), 'no build error shows').toHaveCount(0)
  })
}
