// Personas: DESIGNER and FRONT-END DEVELOPER.
// Goal: build one shared tonal scale, evaluate it in a real interface context,
// then inspect a deterministic CSS handoff without losing the source work.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

test.describe('Tint Scale designer and developer workflows', () => {
  test('a designer can tune a scale and evaluate semantic roles', async ({ page }) => {
    watch(page, 'designer')
    await go(page, '/create/tint')

    await expect(page.getByRole('heading', { level: 1, name: 'Tint Scale Generator' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /For designers/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Interface preview', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Copy Primary role colour/i })).toBeVisible()
    await expect(page.locator('.tt-cell')).toHaveCount(11)
    await expect(page.getByRole('radio', { name: /Scale 1/i })).toHaveAttribute('aria-checked', 'true')

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
    await go(page, '/create/tint')

    await page.getByRole('tab', { name: /For developers/i }).click()
    await expect(page.getByRole('tab', { name: /For developers/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Prepare the handoff' })).toBeVisible()
    await expect(page.locator('#tt-export')).toContainText('--tint-50:')

    await page.getByRole('button', { name: 'Add colour' }).click()
    await expect(page.locator('.tt-ramp-block')).toHaveCount(2)
    await expect(page.locator('#tt-export')).toContainText('--tint-1-50:')
    await expect(page.locator('#tt-export')).not.toContainText('--tint-2-50:')
    await expect(page.getByText('22 generated tokens')).toBeVisible()

    const secondScale = page.getByRole('radio', { name: /Scale 2/i })
    await secondScale.focus()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('radio', { name: /Scale 1/i })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(secondScale).toBeFocused()
    await expect(secondScale).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('#tt-export')).toContainText('--tint-2-50:')
    await expect(page.locator('#tt-export')).not.toContainText('--tint-1-50:')
    await expect(page.getByRole('button', { name: 'Copy all scales' })).toBeVisible()

    await page.screenshot({
      path: test.info().outputPath('tint-scale-developer-desktop.png'),
      fullPage: true,
    })
  })

  test('the workflow remains usable and contained on a phone', async ({ page }) => {
    watch(page, 'mobile designer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/tint')

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

  test('invalid source edits and very dense scales fail safely', async ({ page }) => {
    watch(page, 'design-system engineer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/tint')

    const hex = page.getByRole('textbox', { name: 'Base colour 1 hex' })
    await hex.fill('#NOTHEX')
    await expect(hex).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('.tt-ramp-select')).toContainText('#2563EB source')
    await hex.blur()
    await expect(hex).toHaveValue('#2563EB')

    await page.getByLabel('Steps').selectOption('5')
    await expect(page.locator('.tt-cell')).toHaveCount(199)
    await expect(page.getByText(/Dense scale: scroll horizontally/)).toBeVisible()
    const sourceBeforeTune = await page.evaluate(() => {
      const source = document.getElementById('tt-output-title')
      const tune = document.getElementById('tt-config-title')
      return Boolean(source && tune && (source.compareDocumentPosition(tune) & Node.DOCUMENT_POSITION_FOLLOWING))
    })
    expect(sourceBeforeTune, 'Source colours should precede tuning in the DOM and mobile reading order').toBe(true)

    const denseTabStops = page.locator('.tt-ramp--dense .tt-cell[tabindex="0"]')
    await expect(denseTabStops).toHaveCount(1)
    await denseTabStops.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.tt-ramp--dense .tt-cell').nth(1)).toBeFocused()
    await expect(page.locator('.tt-dense-inspector')).toContainText('Selected stop 10')
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(hasPageOverflow, 'Dense tint ramps should scroll locally without widening the page').toBe(false)
  })
})
