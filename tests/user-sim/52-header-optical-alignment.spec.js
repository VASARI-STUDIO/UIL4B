// The header's right-hand controls, measured as INK rather than as boxes.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FAULT
// ─────────────────────────────────────────────────────────────────────────────
// Founder, 2026-09-05, marked screenshot at 662px: the search circle, the
// avatar and the hamburger "are misaligned". He confirmed the complaint is
// ALIGNMENT — not crowding, not the avatar failing to render.
//
// A box measurement says there is nothing wrong, and that is why this went
// unfixed. All three controls are 40x40 in one `align-items:center` flex row,
// and their box centres measure a 0.00px spread at every width from 390 to
// 1440. The misalignment is entirely in what is PAINTED: the search field and
// the avatar are bordered discs whose ink fills their 40px box, while the menu
// button had `border:none;background:none`, so it painted a bare 16x10 glyph
// floating in an invisible box.
//
// Two measurable consequences, both of which are what a marked-up screenshot
// looks like:
//   · the visible gap between the disc and the glyph measured 30px at 662,
//     against the 16px the row actually sets;
//   · the glyph stopped 28px from the right edge of the bar while the logotype
//     starts 16px from the left one, so the row read as pulled in at one end.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE ORACLE IS A RASTER AND NOT A RECT
// ─────────────────────────────────────────────────────────────────────────────
// Asserting on `getBoundingClientRect` would have passed on the broken build —
// it did, at every width. So this screenshots the bar and finds each control's
// ink centroid: the centre of mass of the pixels that depart from the bar's
// own background, weighted by how far they depart. That is the quantity an eye
// aligns, and it is the only one that separates the two builds.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// 662 is the founder's own capture. The rest bracket it: 480 and 390 are the
// phone band, 700 and 768 the rest of the band where the compact bar shows.
const WIDTHS = [390, 480, 600, 662, 700, 768]

const BAR_H = 80

/** Ink centroid + ink bounds of a control, read off a screenshot of the bar. */
async function inkOf(page, selector) {
  const box = await page.locator(selector).boundingBox()
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: page.viewportSize().width, height: BAR_H } })
  return page.evaluate(async ({ box, png, barH }) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
    const cv = document.createElement('canvas')
    cv.width = bmp.width; cv.height = bmp.height
    const ctx = cv.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data
    const at = (x, y) => { const i = (y * cv.width + x) * 4; return [d[i], d[i + 1], d[i + 2]] }
    // Background sampled from a dead stretch of the bar, left of the cluster
    // and right of the logotype.
    const bg = at(Math.round(cv.width * 0.55), Math.round(barH / 2))
    // Pad the box: a bare glyph sits well inside its box, and a border can sit
    // a hair proud of one.
    const x0 = Math.max(0, Math.floor(box.x) - 2), x1 = Math.min(cv.width, Math.ceil(box.x + box.width) + 2)
    const y0 = Math.max(0, Math.floor(box.y) - 2), y1 = Math.min(barH, Math.ceil(box.y + box.height) + 2)
    let sw = 0, sx = 0, sy = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const [r, g, b] = at(x, y)
        const dev = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2])
        if (dev < 12) continue
        sw += dev; sx += (x + 0.5) * dev; sy += (y + 0.5) * dev
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    if (!sw) return null
    return {
      cx: sx / sw, cy: sy / sw,
      left: minX, right: maxX, top: minY, bottom: maxY,
      w: maxX - minX + 1, h: maxY - minY + 1,
      boxCX: box.x + box.width / 2, boxCY: box.y + box.height / 2,
      boxRight: box.x + box.width,
    }
  }, { box, png: shot.toString('base64'), barH: BAR_H })
}

test.describe('header controls sit on one optical line', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'visitor on a narrow laptop') })

  test('every control in the cluster paints the same optical mass', async ({ page }) => {
    await go(page, '/')
    const bad = []
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      await page.waitForTimeout(200)
      const search = await inkOf(page, '.pnav-search-field')
      const menu = await inkOf(page, '.pnav-mobile')
      expect(search, `no search control painted at ${width}px`).toBeTruthy()
      expect(menu, `no menu control painted at ${width}px`).toBeTruthy()

      // The whole fault: a bare glyph paints a fraction of its neighbour.
      // 16x10 against 40x40 was the broken build.
      if (Math.abs(menu.w - search.w) > 3 || Math.abs(menu.h - search.h) > 3) {
        bad.push(`${width}px: menu ink ${menu.w}x${menu.h} vs search ink ${search.w}x${search.h}`)
      }
      // Vertical: both ink centres on one line. This held on the broken build
      // too — it is here so a future fix cannot buy width by dropping height.
      expect(Math.abs(menu.cy - search.cy), `${width}px: ink centres off by`).toBeLessThan(1)
    }
    expect(bad, `controls painting different optical mass:\n  ${bad.join('\n  ')}`).toEqual([])
  })

  test('the row ends where the logotype begins, measured as ink', async ({ page }) => {
    await go(page, '/')
    const bad = []
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      await page.waitForTimeout(200)
      const logo = await inkOf(page, '.pnav-logo')
      const menu = await inkOf(page, '.pnav-mobile')
      // The left optical margin is the logotype's ink from the viewport edge;
      // the right is the last control's ink from the other edge. A bare glyph
      // made the right margin 28px against a 16px left — the row looked pulled
      // in at one end, which is what "misaligned" meant.
      const leftMargin = logo.left
      const rightMargin = width - 1 - menu.right
      if (Math.abs(leftMargin - rightMargin) > 4) {
        bad.push(`${width}px: left ${leftMargin}px vs right ${rightMargin}px`)
      }
      // And the control must reach its own box, not float inside it.
      expect(menu.boxRight - 1 - menu.right, `${width}px: menu ink stops short of its box by`).toBeLessThanOrEqual(2)
    }
    expect(bad, `the bar's optical margins do not match:\n  ${bad.join('\n  ')}`).toEqual([])
  })
})
