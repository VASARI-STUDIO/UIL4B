// A SELECT INSIDE THE FEEDBACK DIALOG OPENS ON THE SCREEN EDGE AT 390.
//
// The dialog's overlay already covers the phone tab bar, so the list must not
// leave room for it. MenuSelect marks any list whose trigger sits in a layer
// above the tab bar.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Marking only lists inside .tl-sheet-layer leaves this one 61px short of the
// edge and fails the assertion. /discover is a non-tool route with the tab bar.
import { test, expect } from './base.js'
import { go } from './helpers.js'
for (const route of ['/create/palette', '/discover']) test(`feedback select reaches the screen edge at 390 on ${route}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, route)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('uil4b:report-problem')))
  const modal = page.locator('.fb-modal')
  await expect(modal).toBeVisible()
  await modal.locator('.menu-select-trigger, [aria-haspopup="listbox"]').first().click()
  const list = page.locator('.pop.menu-select-list')
  await expect(list).toBeVisible()
  await expect.poll(async () => { const b = await list.boundingBox(); return Math.round(Math.abs(b.y + b.height - 844)) }, { timeout: 5_000 }).toBeLessThanOrEqual(1)
})
