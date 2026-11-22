// THE EXPORT POPUP'S LIVE PAGE SHOWS THE WHOLE PAGE: a person with a saved project sees the Guidelines cover and palette of the
// template they chose, whole, at 1440 and at 390; and the Brand book cover, with its headline in full.
//
// What went wrong: the live frame was sized to the stock picture (840x472 for the slides) but the document is the theme's own page
// (Presentation 1280x720, Standards 1123x794, Label 1000x800, Swiss Field 1920x1080). The frame showed the document's top-left corner
// behind two scrollbars, so a cover read as a flat block of colour with a few small words, and the right-hand side was cut. The book's
// frame was a 606px window onto the top of the book, shorter than the cover headline's own position (the descenders of
// "bv twelve." sit at 622px in Presentation).
//
// The page is read from inside the frame (Playwright reaches a sandboxed frame; the app does not), in the page's own pixels:
//   - nothing scrolls: the document is exactly as large as the frame, and the page sits at its top-left corner
//   - the frame's picture is the shape of the page (the box on the stage is the document's shape, not the stock picture's)
//   - the biggest type on the cover is inside the frame, so a headline cannot be cut at the right or the bottom
//
// MUTATIONS (each must fail the group named after it):
//   - ExportStage.jsx: size the frame from page.w / page.h again   -> "the whole page is in the frame", "the box is the page's shape"
//   - exportLiveSize.js: drop RESET from liveHtml                  -> "the whole page is in the frame" (the 24px stack padding returns)
//   - exportLiveSize.js: BOOK_LIVE.h back to 606                   -> "the brand book's headline is whole"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { chooseFormat, chooseTemplate, exportPanel } from './export-rows.js'
import { serveExportRoutes } from './export-live.js'

const ROUTE = '/projects/kerbside/export'
// Theme id, the name its card carries, and the page it draws at (written out here, not read from src/).
const THEMES = [
  ['01-presentation', 'Presentation', 1280, 720],
  ['04-standards', 'Standards', 1123, 794],
  ['25-label', 'Label', 1000, 800],
  ['27-swissfield', 'Swiss Field', 1920, 1080],
]
const SIZES = [[1440, 900], [390, 844]]

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']
  const now = new Date().toISOString()
  return { id: 'kerbside', name: 'Kerbside', design, createdAt: now, updatedAt: now }
}

async function open(page, file, cardName) {
  const served = await serveExportRoutes(page)
  await signIn(page, { plan: 'pro', projects: [savedProject()] })
  await go(page, ROUTE)
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  await chooseFormat(panel, file)
  await chooseTemplate(panel, cardName)
  const frame = panel.locator('.xd-box iframe')
  await expect(frame, 'the live page arrived').toBeVisible({ timeout: 15000 })
  return { panel, frame, served }
}

/** What the page looks like from inside its frame (in the page's own pixels), and where the frame sits on the stage. */
async function readFrame(frame) {
  const placed = await frame.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const b = el.closest('.xd-box').getBoundingClientRect()
    return { frame: { x: r.x, y: r.y, w: r.width, h: r.height }, box: { x: b.x, y: b.y, w: b.width, h: b.height } }
  })
  const doc = await (await frame.elementHandle()).contentFrame()
  const inside = await doc.evaluate(() => {
    const de = document.documentElement
    const pg = document.querySelector('.pg')?.getBoundingClientRect()
    // The largest type on the page that has text of its own.
    let big = null
    for (const el of document.querySelectorAll('.pg *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (!big || size > big.size) big = { size, text: el.textContent.trim().slice(0, 40), left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    }
    const h1 = document.querySelector('h1')?.getBoundingClientRect()
    return {
      vw: innerWidth, vh: innerHeight, sw: de.scrollWidth, sh: de.scrollHeight,
      pg: pg && { x: pg.x, y: pg.y, w: pg.width, h: pg.height }, big, h1: h1 && { top: h1.top, bottom: h1.bottom },
    }
  })
  return { ...placed, ...inside }
}

for (const [width, height] of SIZES) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } })

    for (const [, card, pw, ph] of THEMES) {
      test(`${card}: the whole page is in the frame, and the box is the page's shape`, async ({ page }) => {
        watch(page, `the ${card} guidelines cover at ${width}x${height}`)
        const { panel, frame, served } = await open(page, 'guidelines', card)
        for (const which of ['cover', 'palette']) {
          if (which === 'palette') {
            await panel.locator('.xd-thumb').nth(1).click()
            await expect.poll(() => served.previews.length, { message: 'the second page was asked for' }).toBeGreaterThan(1)
            await expect(frame).toBeVisible()
          }
          await expect.poll(async () => (await readFrame(frame)).vw, { message: `${card} ${which}: the document has loaded at its own size` }).toBe(pw)
          const r = await readFrame(frame)
          // The frame is the page's own size: the document fits it exactly and nothing scrolls.
          expect(r.vw, `${card} ${which}: frame width`).toBe(pw)
          expect(r.vh, `${card} ${which}: frame height`).toBe(ph)
          expect(r.sw, `${card} ${which}: no sideways scroll inside the frame`).toBeLessThanOrEqual(pw)
          expect(r.sh, `${card} ${which}: no vertical scroll inside the frame`).toBeLessThanOrEqual(ph)
          // The page sits at the corner of the frame and fills it (no padding or gap round it).
          expect(r.pg, `${card} ${which}: the page is at the corner and fills the frame`).toEqual({ x: 0, y: 0, w: pw, h: ph })
          // The box on the stage is the page's shape, and the scaled frame fills it.
          expect(r.box.w / r.box.h, `${card} ${which}: the box's shape`).toBeCloseTo(pw / ph, 1)
          expect(r.frame.w, `${card} ${which}: scaled frame fills the box width`).toBeCloseTo(r.box.w, 0)
          expect(r.frame.h, `${card} ${which}: scaled frame fills the box height`).toBeCloseTo(r.box.h, 0)
          expect(r.frame.w, `${card} ${which}: the picture is not wider than the dialog`).toBeLessThanOrEqual(width)
          // The biggest type on the page is inside the frame, so no headline is cut at the right or the bottom.
          expect(r.big, `${card} ${which}: the page has type`).not.toBeNull()
          expect(r.big.right, `${card} ${which}: "${r.big.text}" is not cut at the right`).toBeLessThanOrEqual(pw + 1)
          expect(r.big.bottom, `${card} ${which}: "${r.big.text}" is not cut at the bottom`).toBeLessThanOrEqual(ph + 1)
        }
      })
    }

    test("the brand book's headline is whole", async ({ page }) => {
      watch(page, `the brand book cover at ${width}x${height}`)
      const { frame } = await open(page, 'book', 'Presentation')
      await expect.poll(async () => (await readFrame(frame)).vw, { message: 'the book has loaded' }).toBe(1424)
      const r = await readFrame(frame)
      expect(r.h1, 'the cover has a headline').toBeTruthy()
      // "bv twelve." has descenders: the line's box ends 0 to a few px under them, so the whole box must be inside the frame.
      expect(r.h1.bottom, `the headline ends at ${Math.round(r.h1.bottom)}px, inside the ${r.vh}px frame`).toBeLessThanOrEqual(r.vh)
      expect(r.sh, 'the frame shows the top of the book and never scrolls it').toBeGreaterThan(0)
      // The frame is the shape of the window it draws, and nothing in it has scrollbars.
      expect(r.frame.w / r.frame.h, "the frame's shape").toBeCloseTo(r.vw / r.vh, 1)
    })
  })
}
