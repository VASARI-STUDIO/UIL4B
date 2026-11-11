// Spec 244: the sliding pill, matched toolbar controls, the phone dock gutter,
// the Back arrow and the Tints Pro cue.
//
// MUTATIONS (each should turn the named test red):
//   - drop the useSlideIndicator call in ToolPills                -> "the selected pill slides"
//   - remove `transition: none` for reduced motion in tool-layout.css -> "reduced motion"
//   - put .tl-select back to its 12px radius in a toolbar          -> "toolbar controls share a height and a radius"
//   - put the dock padding back to var(--tl-pad)                   -> "Copy size keeps the page gutter"
//   - default ToolBack to /projects                                -> "Back goes to the tools index"
//   - hide .grd-pro-tag at 360                                     -> "Tints shows Pro at 360"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const pillIndicator = (page) => page.evaluate(() => {
  const g = document.querySelector('.tl-pills[data-slide]')
  if (!g) return null
  const cs = getComputedStyle(g, '::before')
  const m = new DOMMatrix(cs.transform)
  return { x: m.m41, y: m.m42, w: parseFloat(cs.width), dur: cs.transitionDuration }
})

test.describe('the sliding pill', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the selected pill slides to the clicked option', async ({ page }) => {
    watch(page, 'designer switching a pill group')
    await go(page, '/create/contrast')
    const group = page.locator('.tl-pills[data-slide]').first()
    await expect(group).toBeVisible()
    const before = await pillIndicator(page)
    const other = group.locator('.tl-pill:not(.is-on)').first()
    const box = await other.evaluate((el) => ({ x: el.offsetLeft, y: el.offsetTop }))
    await other.click()
    await expect.poll(async () => (await pillIndicator(page)).x).not.toBe(before.x)
    await expect.poll(async () => {
      const now = await pillIndicator(page)
      return Math.abs(now.x - box.x) + Math.abs(now.y - box.y)
    }).toBeLessThan(1)
  })

  test('reduced motion: the pill moves with no transition', async ({ page }) => {
    watch(page, 'designer with reduced motion on')
    await go(page, '/create/contrast')
    await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })
    await expect(page.locator('.tl-pills[data-slide]').first()).toBeVisible()
    const ind = await pillIndicator(page)
    expect(parseFloat(ind.dur)).toBe(0)
  })
})

test.describe('toolbar controls share a height and a radius', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the toolbar buttons and selects on the type tools line up', async ({ page }) => {
    watch(page, 'designer scanning a toolbar')
    for (const route of ['/create/palette', '/create/type-scale', '/create/font-pair']) {
      await go(page, route)
      const rows = await page.evaluate(() => [...document.querySelectorAll('[data-tool-toolbar] .tl-btn, [data-tool-toolbar] .tl-select')]
        .filter((el) => el.offsetWidth > 0)
        .map((el) => ({ h: Math.round(el.getBoundingClientRect().height), r: parseFloat(getComputedStyle(el).borderTopLeftRadius) > 17 })))
      expect(rows.length, route).toBeGreaterThan(1)
      expect(new Set(rows.map((r) => r.h)).size, `${route}: one height`).toBe(1)
      expect(new Set(rows.map((r) => r.r)).size, `${route}: one corner (pill)`).toBe(1)
    }
  })
})

test.describe('360px', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true })

  test('Copy size keeps the page gutter', async ({ page }) => {
    watch(page, 'designer on a small phone')
    await go(page, '/create/aspect-ratio')
    const b = await page.getByRole('button', { name: 'Copy size' }).boundingBox()
    expect(b.x, 'left gutter').toBeGreaterThanOrEqual(16)
    expect(360 - (b.x + b.width), 'right gutter').toBeGreaterThanOrEqual(16)
  })

  test('Tints shows Pro at 360', async ({ page }) => {
    watch(page, 'free designer at 360')
    await signIn(page, { plan: 'free' })
    await go(page, '/create/gradient')
    const button = page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true })
    await expect(button).toBeVisible()
    await expect.poll(() => button.evaluate((el) => el.innerText.trim())).toBe('Pro')
  })
})

test.describe('Back', () => {
  test('Back goes to the tools index', async ({ page }) => {
    watch(page, 'designer leaving a tool')
    await go(page, '/create/palette')
    await go(page, '/create/aspect-ratio')
    const back = page.locator('[data-tool-toolbar]').getByRole('link', { name: 'Back to all tools' })
    await expect(back).toHaveAttribute('href', '/tools')
    await back.click()
    await expect(page).toHaveURL(/\/tools$/)
  })
})
