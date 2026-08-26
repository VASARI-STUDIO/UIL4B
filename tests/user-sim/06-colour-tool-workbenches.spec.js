// Adversarial acceptance coverage for the Gradient and Semantic Colour tools.
// These flows deliberately use invalid values, repeated actions, keyboard-only
// adjustments, and narrow screens so the workbenches fail safely under pressure.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'
import { normalizeClipboardText } from '../../src/hooks/useClipboard.js'

test.describe('Gradient Generator workbench resilience', () => {
  test('a developer can refine stops without invalid input corrupting the gradient', async ({ page }) => {
    watch(page, 'front-end developer')
    await go(page, '/create/gradient')

    await expect(page.getByRole('heading', { level: 1, name: 'Gradient Generator' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Shape the gradient' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Refine & export' })).toBeVisible()

    const firstHex = page.getByRole('textbox', { name: 'Stop 1 hex' })
    await expect(firstHex).toHaveValue('#7C3AED')
    await firstHex.fill('#NOTHEX')
    await expect(firstHex).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use a 6-digit hex')).toBeVisible()
    await firstHex.press('Enter')
    await expect(firstHex).toHaveValue('#7C3AED')

    const position = page.getByRole('spinbutton', { name: 'Stop 1 position' })
    await position.fill('')
    await position.blur()
    await expect(position).toHaveValue('0')

    const handle = page.getByRole('button', { name: /Gradient stop 1 at 0%/ })
    await handle.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect(page.getByRole('spinbutton', { name: 'Stop 1 position' })).toHaveValue('10')

    await page.screenshot({
      path: test.info().outputPath('gradient-workbench-desktop.png'),
      fullPage: true,
    })
  })

  test('locked stops survive repeated randomise actions and stop count is bounded', async ({ page }) => {
    watch(page, 'product designer')
    await go(page, '/create/gradient')

    await page.getByRole('textbox', { name: 'Stop 1 hex' }).fill('#123456')
    const firstLock = page.getByRole('button', { name: /Lock stop 1 colour/ })
    await firstLock.click()
    await expect(page.getByRole('button', { name: /Stop 1 locked/ })).toHaveAttribute('aria-pressed', 'true')

    const random = page.getByRole('button', { name: /^Random$/ })
    await random.click()
    await random.click()
    await random.click()
    await expect(page.getByRole('textbox', { name: 'Stop 1 hex' })).toHaveValue('#123456')

    const add = page.getByRole('button', { name: /Add Stop/ })
    while (await add.isEnabled()) await add.click()
    await expect(page.locator('.ggn-stop')).toHaveCount(12)
    await expect(add).toBeDisabled()
  })

  test('clipboard denial is recoverable and the mobile canvas stays contained', async ({ page }) => {
    watch(page, 'mobile developer')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')) },
      })
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/gradient')

    await page.getByRole('button', { name: 'Copy', exact: true }).click()
    await expect(page.getByText(/Failed to copy|Copy failed/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible()
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow, 'Gradient Generator should not create page-level horizontal overflow').toBe(false)
  })

  test('clipboard handling rejects invalid payloads and survives a missing browser API', async ({ page }) => {
    watch(page, 'developer on a restricted browser')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      })
    })
    await go(page, '/create/gradient')

    const normalized = [
      normalizeClipboardText('  #ABCDEF  '),
      normalizeClipboardText(42),
      normalizeClipboardText({ unsafe: true }),
      normalizeClipboardText(null),
    ]
    expect(normalized).toEqual(['#ABCDEF', '42', '', ''])

    await page.getByRole('button', { name: 'Copy', exact: true }).click()
    await expect(page.getByText('Clipboard is not available in this browser')).toBeVisible()
  })
})

test.describe('Semantic Colour system workflow', () => {
  test('a designer can choose a bundle and evaluate non-colour state cues', async ({ page }) => {
    watch(page, 'product designer')
    await go(page, '/create/semantic-color')

    await expect(page.getByRole('heading', { level: 1, name: 'Semantic Colours' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Balanced/ })).toHaveAttribute('aria-checked', 'true')
    const vividBundle = page.getByRole('radio', { name: /Vivid/ })
    await vividBundle.click()
    await expect(vividBundle).toHaveAttribute('aria-checked', 'true')
    await vividBundle.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: /Cool/ })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(vividBundle).toBeFocused()

    await expect(page.getByText('Light interface')).toBeVisible()
    await expect(page.getByText('Dark interface')).toBeVisible()
    await expect(page.locator('.stc-example-cue')).toHaveCount(8)
    await expect(page.locator('.stc-code')).toContainText('--color-success-50:')
    await expect(page.locator('.stc-code')).toContainText('--color-info-900:')

    const successRole = page.locator('.stc-role').first()
    await successRole.getByRole('button', { name: 'Custom' }).click()
    const successHex = page.getByRole('textbox', { name: 'Import a hex colour for success' })
    await successHex.fill('bad')
    await successHex.press('Enter')
    await expect(page.getByText(/Enter a six-digit hex colour/)).toBeVisible()
    await successHex.fill('#16A34A')
    await successHex.press('Enter')
    await expect(successHex).toHaveValue('')

    await page.screenshot({
      path: test.info().outputPath('semantic-colours-desktop.png'),
      fullPage: true,
    })
  })

  test('the semantic editor and handoff remain contained on a narrow screen', async ({ page }) => {
    watch(page, 'mobile product designer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/semantic-color')

    await expect(page.getByRole('radio', { name: /Balanced/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Canonical, predictable token names' })).toBeVisible()
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasOverflow, 'Semantic Colours should not create page-level horizontal overflow').toBe(false)
    await page.screenshot({
      path: test.info().outputPath('semantic-colours-mobile.png'),
      fullPage: true,
    })
  })
})
