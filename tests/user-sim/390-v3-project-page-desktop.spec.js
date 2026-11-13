// V3 project page (/projects/:id) on a desktop: the index jumps to a part and
// moves focus there, Copy says Copied, the other projects are rows, and the foot
// sends a free account to /plans.
//
// ── MUTATIONS ───────────────────────────────────────────────────────────────
// 1. Remove the focus() call in goToBand (ProjectDetail.jsx): the index-jump test
//    fails on the focused heading.
// 2. Point the "See Pro" link at /pricing: the Pro-link test fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

test.use({ viewport: { width: 1440, height: 900 } })

const NOW = new Date().toISOString()
function finished(id, name) {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  return { id, name, design, createdAt: NOW, updatedAt: NOW }
}

test.describe('the project page, desktop', () => {
  test('the index jumps to a part and puts focus on its heading', async ({ page }) => {
    watch(page, 'a designer jumping to the type scale of a finished project')
    await signIn(page, { plan: 'free', projects: [finished('harbour', 'Harbour')] })
    await go(page, '/projects/harbour')
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
    await expect(page.locator('.pjv-status')).toHaveText('Complete and ready to export')

    await page.getByRole('navigation', { name: 'Parts of this project' }).getByRole('link', { name: /Type scale/ }).click()
    await expect(page.locator('#pjv-type-scale-h'), 'focus lands on the part heading').toBeFocused()
    await expect(page.locator('.pjv-ixa.on')).toContainText('Type scale')
  })

  test('Copy says Copied, then goes back to Copy', async ({ page, context }) => {
    watch(page, 'a designer copying a palette as CSS')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await signIn(page, { plan: 'free', projects: [finished('harbour', 'Harbour')] })
    await go(page, '/projects/harbour')
    const copy = page.getByRole('button', { name: 'Copy palette as CSS' })
    await copy.click()
    await expect(page.locator('#pjv-palette .pjv-copy.on')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('#1F4B8E')
    await expect(page.locator('#pjv-palette .pjv-copy.on')).toHaveCount(0, { timeout: 5000 })
  })

  test('the other projects are rows that open their page', async ({ page }) => {
    watch(page, 'a designer moving to another project')
    await signIn(page, { plan: 'free', projects: [finished('harbour', 'Harbour'), finished('quarry', 'Quarry')] })
    await go(page, '/projects/harbour')
    await expect(page.locator('.pjv-rnm')).toHaveText(['Quarry'])
    await page.locator('.pjv-row', { hasText: 'Quarry' }).click()
    await expect(page).toHaveURL(/\/projects\/quarry$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Quarry' })).toBeVisible()
  })

  test('a free account sees See Pro, and it goes to /plans', async ({ page }) => {
    watch(page, 'a free designer reading the foot of the page')
    await signIn(page, { plan: 'free', projects: [finished('harbour', 'Harbour')] })
    await go(page, '/projects/harbour')
    await expect(page.locator('.pjv-plan a')).toHaveAttribute('href', '/plans')
    await page.locator('.pjv-plan a').click()
    await expect(page).toHaveURL(/\/plans/)
  })

  test('a Pro account sees no upgrade line', async ({ page }) => {
    watch(page, 'a Pro designer on a project page')
    await signIn(page, { plan: 'pro', projects: [finished('harbour', 'Harbour')] })
    await go(page, '/projects/harbour')
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
    await expect(page.locator('.pjv-plan')).toHaveCount(0)
  })

  test('the page does not scroll sideways at 1200 and 1440', async ({ page }) => {
    watch(page, 'a designer on a laptop')
    await signIn(page, { plan: 'free', projects: [finished('harbour', 'Harbour')] })
    for (const width of [1200, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/projects/harbour')
      await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll at ${width}`).toBe(true)
    }
  })
})
