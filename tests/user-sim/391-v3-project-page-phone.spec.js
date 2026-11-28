// V3 project page on a phone: one primary button, in a bottom bar that stays on
// screen while the page scrolls, and nothing runs off the side at 390 or 320.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Change .pjv-bar's position from sticky to static in project-v3.css: the bar
// test fails because the bar is no longer inside the viewport after scrolling.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const NOW = new Date().toISOString()
function halfBuilt() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  return { id: 'half', name: 'Half Done', design, createdAt: NOW, updatedAt: NOW }
}

for (const width of [390, 320]) {
  test.describe(`at ${width}`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('the next action sits in a bar that stays in view, and nothing scrolls sideways', async ({ page }) => {
      watch(page, 'a designer on a phone')
      await signIn(page, { plan: 'free', projects: [halfBuilt()] })
      await go(page, '/projects/half')
      await expect(page.getByRole('heading', { level: 1, name: 'Half Done' })).toBeVisible()

      const bar = page.locator('.pjv-bar')
      await expect(bar.getByRole('link', { name: /^Continue:/ })).toBeVisible()
      // Scrolled to the end of the content (the site footer starts just below the window).
      await page.evaluate(() => window.scrollTo(0, document.querySelector('.sp-footer').getBoundingClientRect().top + window.scrollY - window.innerHeight))
      const box = await bar.boundingBox()
      expect(box.y + box.height, 'the bar is on screen after scrolling').toBeLessThanOrEqual(800 + 1)
      expect(box.y, 'the bar is on screen after scrolling').toBeGreaterThanOrEqual(0)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const gap = await page.evaluate(() => document.querySelector('.sp-footer').getBoundingClientRect().top - document.querySelector('.pjv-bar').getBoundingClientRect().bottom)
      expect(gap, 'at the foot of the page the bar sits above the footer and covers none of it').toBeGreaterThanOrEqual(-1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sideways scroll').toBe(true)
    })
  })
}
