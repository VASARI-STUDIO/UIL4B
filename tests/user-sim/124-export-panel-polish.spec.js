// THE EXPORT PANEL'S TWO QUIET SIGNALS: THE DOWNLOAD TOAST AND THE SCROLL FADE.
//
// 1. A finished download closes the panel, and the close says nothing about the
//    file. ExportPanel raises the app's one toast, "Downloaded <filename>". It
//    must name the file the browser actually received, and it must be on screen.
// 2. While more of the panel is below what is showing (a window too short for the
//    five rows and their options), the panel carries
//    `has-more` and the dock's ::before fade is opaque; at the bottom of the list
//    both are gone, so the cue never points at nothing.
//
// The filename is read from the download itself, not from a string typed into
// this spec, so the toast cannot agree with a wrong name.
//
// ── MUTATION (run on 21 Oct 2026, product source restored afterwards) ─────────
// Dispatching a different event name in ExportPanel.jsx (`uil4b:toast` ->
// `uil4b:toasts`) fails both toast tests: no toast shows. Removing the has-more
// toggle fails both fade tests: with `className="exp-panel"` the top-of-list
// test finds no class; with the class always on, the bottom-of-list test still
// finds it.
import { chooseFormat } from './export-rows.js'
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

// A COMPLETE project: ProjectDetail offers "Export project" only when the design
// has a palette, fonts and a type scale; otherwise the button reads "Fill the gaps".
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

const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]
// The five rows, their options and the dock fit in about 570px; below that the panel scrolls.
const SHORT_HEIGHT = 440

async function openPanel(page) {
  await signIn(page, { plan: 'free', projects: [savedProject()] })
  await go(page, '/projects/export-project')
  await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
  await page.getByRole('button', { name: 'Export project', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Export your design system' })
  await expect(panel).toBeVisible()
  return panel
}

for (const { width, height } of SIZES) {
  test.describe(`export panel at ${width}px`, () => {
    test.use({ viewport: { width, height } })

    test('a finished JSON export names the downloaded file in a toast that is on screen', async ({ page }) => {
      watch(page, 'a designer exporting design tokens from a saved project')
      const panel = await openPanel(page)
      await chooseFormat(panel, 'json')

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        panel.getByRole('button', { name: 'Export JSON tokens', exact: true }).click(),
      ])
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/\.tokens\.json$/)

      await expect(panel).toHaveCount(0)
      const toast = page.locator('.toast.show')
      await expect(toast).toHaveText(`Downloaded ${filename}`)
      // On screen means inside the viewport once its slide-in has finished, not
      // merely present in the DOM.
      await expect.poll(async () => {
        const box = await toast.boundingBox()
        if (!box) return 'no box'
        const inside = box.x >= 0 && box.y >= 0
          && box.x + box.width <= width && box.y + box.height <= height
        return inside ? 'inside' : `outside ${JSON.stringify(box)}`
      }).toBe('inside')
    })

    test('the scroll fade shows while rows are below the fold', async ({ page }) => {
      watch(page, 'a designer opening the export panel in a window too short for it')
      const panel = await openPanel(page)
      // The five rows fit a normal screen, so the premise is made on a short one.
      await page.setViewportSize({ width, height: SHORT_HEIGHT })
      // The premise: the panel really does run past the window's edge here.
      await expect.poll(() => panel.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(40)
      expect(await panel.evaluate((el) => el.scrollTop)).toBe(0)

      await expect(panel).toHaveClass(/\bhas-more\b/)
      await expect.poll(() => panel.evaluate(
        (el) => getComputedStyle(el.querySelector('.exp-dock'), '::before').opacity,
      )).toBe('1')
    })

    test('the scroll fade is gone once the list is scrolled to its end', async ({ page }) => {
      watch(page, 'a designer scrolling the export panel to its end')
      const panel = await openPanel(page)
      await page.setViewportSize({ width, height: SHORT_HEIGHT })
      await expect.poll(() => panel.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(40)
      await expect(panel).toHaveClass(/\bhas-more\b/)

      await panel.evaluate((el) => { el.scrollTop = el.scrollHeight })
      expect(await panel.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 4)).toBe(true)

      await expect(panel).not.toHaveClass(/\bhas-more\b/)
      await expect.poll(() => panel.evaluate(
        (el) => getComputedStyle(el.querySelector('.exp-dock'), '::before').opacity,
      )).toBe('0')

      // And it comes back when the reader scrolls up again.
      await panel.evaluate((el) => { el.scrollTop = 0 })
      await expect(panel).toHaveClass(/\bhas-more\b/)
    })
  })
}
