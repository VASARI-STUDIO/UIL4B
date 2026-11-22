// THE EXPORT POPUP USES THE PROJECT'S OWN NAME, from a tool page as well as from the project's page.
//
// What went wrong: opened from a tool page (the Create pane's colour tools, with the project loaded in them), the dialog was not
// handed a project id, and the project's name lives on the project record, not on the design. So the name came out empty and every
// stand-in showed: the preview drew "Design System", and the zip downloaded as "untitled-brand-guidelines-25-label.zip". The design
// does know its project (design.source.projectId), so the name is read through that.
//
// Followed through the three places the name travels:
//   (a) the live preview's request body       brand.name
//   (b) the document's request body           projectName
//   (c) the file the person is handed         the zip's name
// and the page the person sees (the cover carries the name, not the stand-in).
//
// MUTATIONS (each must fail the group named after it):
//   - projectFileName.js: read only `projectId` (drop the design's and the working design's source) -> every test here
//   - ExportPreview.jsx: pass `name` (the stand-in-filled one) to brandOf again                      -> (a) and the cover
//   - useExportRunner.js: read the name from `projects.find(projectId)` only                         -> (b) and (c)
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { chooseFormat, exportPanel, primaryButton } from './export-rows.js'
import { serveExportRoutes } from './export-live.js'

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']
  const now = new Date().toISOString()
  return { id: 'kerbside', name: 'Kerbside', design, createdAt: now, updatedAt: now }
}

/** Open the project, press its "open in a tool" link (which loads it as the working design) and open Export on the tool page. */
async function openFromAToolPage(page) {
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

test.describe('the project name from a tool page', () => {
  test('(a) the live preview is asked for with the project name and the page carries it', async ({ page }) => {
    watch(page, 'the guidelines preview from a tool page')
    const { panel, previews } = await openFromAToolPage(page)
    await chooseFormat(panel, 'guidelines')
    const frame = panel.locator('.xd-box iframe')
    await expect(frame, 'the live page arrived').toBeVisible({ timeout: 15000 })
    expect(previews.length, 'a live page was asked for').toBeGreaterThan(0)
    expect(previews[0].body.brand.name, 'the request names the project').toBe('Kerbside')
    const doc = await (await frame.elementHandle()).contentFrame()
    const text = await doc.evaluate(() => document.body.innerText)
    expect(text, 'the cover carries the project name').toContain('Kerbside')
    expect(text, 'and not the stand-in').not.toContain('Design System')
  })

  test('(b)(c) the file is asked for and saved under the project name', async ({ page }) => {
    watch(page, 'the guidelines zip from a tool page')
    const { panel, documents } = await openFromAToolPage(page)
    await chooseFormat(panel, 'guidelines-html')
    const [download] = await Promise.all([page.waitForEvent('download'), primaryButton(page).click()])
    expect(documents.length, 'the document was asked for').toBeGreaterThan(0)
    expect(documents[0].body.projectName, 'the request names the project').toBe('Kerbside')
    expect(download.suggestedFilename(), 'the zip is named for the project').toMatch(/^kerbside-brand-guidelines-.*\.zip$/)
  })
})
