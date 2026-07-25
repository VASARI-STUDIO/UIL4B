// Personas: DESIGNER and FRONT-END DEVELOPER.
// Goal: build one shared tonal scale, evaluate it in a real interface context,
// then inspect a deterministic CSS handoff without losing the source work.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

test.describe('Tint Scale designer and developer workflows', () => {
  test('a designer can tune a scale and evaluate semantic roles', async ({ page }) => {
    watch(page, 'designer')
    await go(page, '/color/tint')

    await expect(page.getByRole('heading', { level: 1, name: 'Tint Scale Generator' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /For designers/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Interface preview', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Copy Primary role colour/i })).toBeVisible()
    await expect(page.locator('.tt-cell')).toHaveCount(11)

    const designerTab = page.getByRole('tab', { name: /For designers/i })
    await designerTab.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: /For developers/i })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(designerTab).toBeFocused()

    const hex = page.getByRole('textbox', { name: 'Base colour 1 hex' })
    await hex.fill('#DC2626')
    await expect(hex).toHaveValue('#DC2626')
    await expect(page.locator('.tt-ramp-meta')).toContainText('#DC2626 source')

    await page.screenshot({
      path: test.info().outputPath('tint-scale-designer-desktop.png'),
      fullPage: true,
    })
  })

  test('a developer can inspect a complete multi-scale CSS handoff', async ({ page }) => {
    watch(page, 'front-end developer')
    await go(page, '/color/tint')

    await page.getByRole('tab', { name: /For developers/i }).click()
    await expect(page.getByRole('tab', { name: /For developers/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Prepare the handoff' })).toBeVisible()
    await expect(page.locator('#tt-export')).toContainText('--tint-50:')

    await page.getByRole('button', { name: 'Add colour' }).click()
    await expect(page.locator('.tt-ramp-block')).toHaveCount(2)
    await expect(page.locator('#tt-export')).toContainText('--tint-1-50:')
    await expect(page.locator('#tt-export')).toContainText('--tint-2-50:')
    await expect(page.getByText('22 generated tokens')).toBeVisible()

    await page.screenshot({
      path: test.info().outputPath('tint-scale-developer-desktop.png'),
      fullPage: true,
    })
  })

  test('the workflow remains usable and contained on a phone', async ({ page }) => {
    watch(page, 'mobile designer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/color/tint')

    await expect(page.getByRole('button', { name: 'Design preview' })).toBeVisible()
    await expect(page.locator('.tt-preview')).toBeVisible()
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(hasPageOverflow, 'Tint Scale should not create horizontal page overflow').toBe(false)

    await page.screenshot({
      path: test.info().outputPath('tint-scale-designer-mobile.png'),
      fullPage: true,
    })
  })
})
