// A COMPLETE PROJECT HAS ONE PRIMARY EXPORT BUTTON AND ONE SECONDARY.
//
// The header's next action and the export bar both start the export. Both read
// "Export project"; only the header one is filled with the accent, the bar's is
// the quiet grey button, so the page has a single primary action.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Putting the accent class back on the export bar's button makes both fills
// match and fails the secondary-fill assertion.
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
  test(`the header export is primary and the export bar's is secondary at ${width}`, async ({ page }) => {
    watch(page, 'a designer with a finished project')
    await page.setViewportSize({ width, height })
    await signIn(page, { plan: 'free', projects: [completeProject()] })
    await go(page, '/projects/two-buttons')
    await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()

    const header = page.locator('.pjd-head-actions').getByRole('button', { name: 'Export project', exact: true })
    const bar = page.locator('.pjd-export').getByRole('button', { name: 'Export project', exact: true })
    await expect(header).toBeVisible()
    await expect(bar).toBeVisible()

    const accent = await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.background = 'var(--accent)'
      document.querySelector('.pjd').appendChild(probe)
      const colour = getComputedStyle(probe).backgroundColor
      probe.remove()
      return colour
    })
    const fill = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(await fill(header)).toBe(accent)
    expect(await fill(bar)).not.toBe(accent)
  })
}
