import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`Tint picker hex stays tappable at ${width}px in ${theme}`, async ({ page }) => {
      watch(page, 'designer editing a tint source')
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await page.addInitScript(value => localStorage.setItem('vs-t', value), theme)
      await go(page, '/create/tint')

      const trigger = page.getByRole('button', { name: 'Pick base colour 1', exact: true })
      const picker = page.getByRole('dialog', { name: 'Pick base colour 1', exact: true })
      const hex = picker.locator('.cpk-hex')
      const source = page.getByRole('textbox', { name: 'Base colour 1 hex', exact: true })
      await trigger.click()
      await expect(hex).toBeVisible()
      await expect.poll(() => hex.evaluate(input => {
        const box = input.getBoundingClientRect()
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        return {
          topmost: hit === input || input.contains(hit),
          insideViewport: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
        }
      })).toEqual({ topmost: true, insideViewport: true })
      await hex.click()
      await expect(hex).toBeFocused()
      await hex.fill('#22c55e')
      await hex.press('Enter')
      await expect(source).toHaveValue('#22C55E')
      await expect(trigger.locator('.cpk-trigger-chip')).toHaveCSS('background-color', 'rgb(34, 197, 94)')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

      await hex.press('Escape')
      await expect(picker).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await trigger.click()
      await source.click()
      await expect(picker).toHaveCount(0)
    })
  }
}
