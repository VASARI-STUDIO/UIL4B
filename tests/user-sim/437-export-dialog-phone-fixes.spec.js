// THE EXPORT DIALOG ON A PHONE: three things a person saw in the rendered check.
//
// 1. Choosing a template from the grid lands on the top of the preview, not wherever the grid was scrolled to: the picture
//    and its "Pro template" chip are in view.
// 2. The grid's card pictures are sharp on a 2x screen: each card offers a 2x picture and the screen uses it.
// 3. Every tab in the bar over the preview fits the phone's width: none is cut at the right edge.
//
// Sizes and copy are written out here, not read from src/.
//
// MUTATIONS (each break must fail the group named after it):
//   - drop the templates -> preview scroll reset in ExportDialog.jsx          -> "choosing a template lands on the top of the preview"
//   - drop srcSet from the card <img> in ExportTemplates.jsx                  -> "the card pictures are sharp on a 2x screen"
//   - delete one <id>-thumb@2x.webp                                           -> "the card pictures are sharp on a 2x screen"
//   - drop the max-width:479.98px tab rules in export-dialog.css              -> "every tab fits the phone's width"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { GALLERY, chooseFormat, exportPanel, openTemplates, typeRadio } from './export-rows.js'

const ROUTE = '/projects/harbour/export'
const PHONES = [[360, 740], [375, 667], [390, 844]]
const RAIL = ['Brand guidelines', 'UI style guide', 'Image', 'Code']

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  const now = new Date().toISOString()
  return { id: 'harbour', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

async function open(page, file = 'kit') {
  await signIn(page, { plan: 'free', projects: [savedProject()] })
  await go(page, ROUTE)
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  await chooseFormat(panel, file)
  return panel
}

/** How far each of the dialog's two scroll boxes is scrolled (the column on most phones, the whole body on a short one). */
const scrolled = (panel) => panel.evaluate((el) => {
  const col = el.querySelector('.xd-scroll')
  const body = el.querySelector('.xd-body')
  return { col: Math.round(col?.scrollTop ?? 0), body: Math.round(body?.scrollTop ?? 0) }
})

for (const [width, height] of PHONES) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } })

    test('choosing a template lands on the top of the preview', async ({ page }) => {
      watch(page, `choosing the last template in the grid at ${width}x${height}`)
      const panel = await open(page)
      const grid = await openTemplates(panel)
      const last = grid.locator('.xd-tpl-card').last()
      // Scroll the grid to its end the way a thumb does, then choose the last card.
      await last.scrollIntoViewIfNeeded()
      const before = await scrolled(panel)
      expect(before.col + before.body, 'the grid is long enough to scroll at this size').toBeGreaterThan(0)
      await last.click()
      await expect(panel.locator(GALLERY), 'choosing a card returns to the preview').toHaveCount(0)
      await expect.poll(() => scrolled(panel), { message: 'the preview opens at its top, not where the grid was' }).toEqual({ col: 0, body: 0 })
      // The picture's top edge and the Pro chip are on screen, below the tab bar.
      const stage = panel.locator('.xd-box img, .xd-box iframe').first()
      const [stageTop, barBottom] = await Promise.all([
        stage.evaluate((el) => el.getBoundingClientRect().top),
        panel.getByRole('tablist').evaluate((el) => el.getBoundingClientRect().bottom),
      ])
      expect(stageTop, 'the top of the picture is not hidden above the tab bar').toBeGreaterThanOrEqual(barBottom - 1)
      await expect(panel.getByText('Pro template', { exact: true }).first(), 'the chip naming the Pro template is in view').toBeInViewport()
    })

    test("every tab fits the phone's width", async ({ page }) => {
      watch(page, `the tab bar over the preview at ${width}x${height}`)
      const panel = await open(page)
      for (const type of RAIL) {
        await typeRadio(panel, type).click()
        const bar = panel.getByRole('tablist')
        if (!(await bar.count())) continue
        const fit = await bar.evaluate((el) => {
          const box = el.getBoundingClientRect()
          const tabs = [...el.querySelectorAll('[role="tab"]')].map((t) => {
            const r = t.getBoundingClientRect()
            return { name: t.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }
          })
          return { left: Math.round(box.left), right: Math.round(box.right), over: el.scrollWidth - el.clientWidth, tabs }
        })
        expect(fit.over, `${type}: the tab bar does not need to scroll sideways (${JSON.stringify(fit.tabs)})`).toBeLessThanOrEqual(1)
        for (const t of fit.tabs) {
          expect(t.right, `${type}: "${t.name}" ends inside the bar`).toBeLessThanOrEqual(fit.right + 1)
          expect(t.left, `${type}: "${t.name}" starts inside the bar`).toBeGreaterThanOrEqual(fit.left - 1)
          expect(Math.min(t.w, t.h), `${type}: "${t.name}" is still a 44px target`).toBeGreaterThanOrEqual(44)
        }
      }
    })
  })
}

test.describe('the card pictures are sharp on a 2x screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

  for (const file of ['kit', 'guidelines']) {
    test(`every card in the ${file === 'kit' ? 'UI kit' : 'guidelines'} grid uses its 2x picture`, async ({ page }) => {
      watch(page, `the ${file} template grid on a 2x phone`)
      const panel = await open(page, file)
      const grid = await openTemplates(panel)
      const imgs = grid.locator('.xd-tpl-card img')
      const count = await imgs.count()
      expect(count, 'the grid has its cards').toBeGreaterThan(10)
      for (let i = 0; i < count; i++) {
        const img = imgs.nth(i)
        await img.scrollIntoViewIfNeeded()
        await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), { message: `card ${i + 1}'s picture loads` }).toBe(true)
        // naturalWidth on a picture chosen by a 2x srcset entry is divided by 2, so the file's own width is read from a fresh Image.
        const r = await img.evaluate(async (el) => {
          const file = new Image()
          file.src = el.currentSrc
          await file.decode()
          return { src: el.currentSrc, natural: file.naturalWidth, drawn: el.getBoundingClientRect().width }
        })
        expect(r.src, `card ${i + 1} uses the 2x picture on a 2x screen`).toMatch(/-thumb@2x\.webp$/)
        // 284 picture pixels across a card about 155 wide: 1.8 or more to the CSS pixel, so it is not stretched on the screen.
        expect(r.natural / r.drawn, `card ${i + 1} (${r.src.split('/').pop()}) has about two picture pixels to each CSS pixel`).toBeGreaterThanOrEqual(1.8)
      }
    })
  }
})
