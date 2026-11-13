// A COMPLETE PROJECT HAS ONE PRIMARY EXPORT BUTTON AND ONE SECONDARY.
//
// The rail's (or, below 1200px, the bottom bar's) next action and the export band
// both start the export. Both read "Export project"; only the first is filled with
// the ink colour, the band's is the quiet outlined button, so the page has a single
// primary action.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Giving the export band's button the pjv-go class makes both fills the same and
// fails the secondary-fill assertion.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

function completeProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  const now = new Date().toISOString()
  return { id: 'two-buttons', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

for (const { width, height } of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`the next action is primary and the export band's button is secondary at ${width}`, async ({ page }) => {
    watch(page, 'a designer with a finished project')
    await page.setViewportSize({ width, height })
    await signIn(page, { plan: 'free', projects: [completeProject()] })
    await go(page, '/projects/two-buttons')
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()

    const primary = page.locator('.pjv-go').getByText('Export project', { exact: true })
    const primaryButton = page.locator('button.pjv-go', { hasText: 'Export project' })
    const band = page.locator('.pjv-exb').getByRole('button', { name: 'Export project', exact: true })
    await expect(primary).toBeVisible()
    await expect(band).toBeVisible()

    const ink = await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.background = 'var(--pj-ink)'
      document.querySelector('.pjv').appendChild(probe)
      const colour = getComputedStyle(probe).backgroundColor
      probe.remove()
      return colour
    })
    const fill = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(await fill(primaryButton)).toBe(ink)
    expect(await fill(band)).not.toBe(ink)
  })
}
