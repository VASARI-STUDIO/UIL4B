// Nothing is cut off on a small phone: the project page's part index and the
// icon names in the icon library both fit their boxes at 360 and 375.
//
// ── MUTATIONS ───────────────────────────────────────────────────────────────
// 1. Put `grid-template-columns: 1fr 1fr` back on `.pjv-ix` in the 1199px band
//    and drop the 400px rule (project-v3.css): the index test fails at 360.
// 2. Remove the 640px `.ic.has-pack .ic-name` two-line rule (library.css): the
//    icon-name test fails.
// 3. Remove the 360-400px 11px `.ic-name` rule (library.css): the icon-name test
//    fails on arrow-down-on-square-stack.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const NOW = new Date().toISOString()
function finished(id, name) {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.states.warning = 1
  return { id, name, design, createdAt: NOW, updatedAt: NOW }
}

for (const [width, height] of [[360, 740], [375, 667]]) {
  test.describe(`at ${width}`, () => {
    test.use({ viewport: { width, height } })

    test('the project index fits: no part name or value is cut off', async ({ page }) => {
      watch(page, `a designer reading a finished project on a ${width}px phone`)
      await signIn(page, { plan: 'free', projects: [finished('harbour', 'Harbour')] })
      await go(page, '/projects/harbour')
      const nav = page.getByRole('navigation', { name: 'Parts of this project' })
      await expect(nav).toBeVisible()
      const over = await nav.evaluate((el) => {
        const out = []
        if (el.scrollWidth > el.clientWidth) out.push(`nav ${el.scrollWidth} > ${el.clientWidth}`)
        for (const a of el.querySelectorAll('.pjv-ixa')) {
          if (a.scrollWidth > a.clientWidth) out.push(`${a.textContent} ${a.scrollWidth} > ${a.clientWidth}`)
          const r = a.getBoundingClientRect()
          if (r.right > document.documentElement.clientWidth) out.push(`${a.textContent} past the edge`)
        }
        return out
      })
      expect(over, 'every index row fits its box').toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    })

    test('icon names fit their tiles', async ({ page }) => {
      watch(page, `a designer browsing icons on a ${width}px phone`)
      await go(page, '/create/icons')
      await expect(page.locator('.lib-surface .ig .ic-name').first()).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const cut = await page.locator('.lib-surface .ig .ic-name').evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length)
          .filter((el) => el.scrollWidth > el.clientWidth)
          .map((el) => `${el.textContent} ${el.scrollWidth} > ${el.clientWidth}`))
      expect(cut, 'no icon name runs past its tile').toEqual([])
    })
  })
}
