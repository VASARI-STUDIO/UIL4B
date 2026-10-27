// A SELECT INSIDE THE FEEDBACK DIALOG OPENS ON THE SCREEN EDGE AT 390.
//
// The dialog's overlay already covers the phone tab bar, so the list must not
// leave room for it. MenuSelect marks any list whose trigger sits in a layer
// above the tab bar.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Marking only lists inside .tl-sheet-layer leaves this one 61px short of the
// edge and fails the assertion.
import { test, expect } from './base.js'
import { go } from './helpers.js'
test('feedback select reaches the screen edge at 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/create/palette')
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('uil4b:report-problem')))
  const modal = page.locator('.fb-modal')
  await expect(modal).toBeVisible()
  await modal.locator('.menu-select-trigger, [aria-haspopup="listbox"]').first().click()
  const list = page.locator('.pop.menu-select-list')
  await expect(list).toBeVisible()
  await page.waitForTimeout(400)
  const b = await list.boundingBox()
  expect(Math.abs(b.y + b.height - 844)).toBeLessThanOrEqual(1)
})
