// /create/tint, rebuilt to the design's drawn screen:
// step columns over a lightness chart, and one side card of SOURCES (ours: the
// multi-scale fold), LIGHTNESS AND SATURATION, STEPS / CURVE / SPACING and
// CONTRAST NOTES. The generator is the design's OKLCH curve (D:1436-1442).
//
// The previous build's designer/developer tabs, role preview and step modes
// (every 50/25/10/5, endpoints) are gone with the old screen; what these tests
// hold is the drawn tool, plus the multi-scale capability this build keeps.
// Spacing and the contrast tooltip have their own spec (149).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

test.describe('Tint workflows', () => {
  test('a designer tunes a scale: steps, curve, lightness and saturation all move it', async ({ page }) => {
    watch(page, 'designer')
    await go(page, '/create/tint')

    await expect(page.getByRole('heading', { level: 1, name: 'Tint' })).toBeVisible()
    await expect(page.locator('.tt-cell')).toHaveCount(11)
    await expect(page.locator('.tt-bar')).toHaveCount(11)
    await expect(page.locator('.tt-note')).toHaveCount(11)

    // STEPS: 9 / 11 / 13, with the design's labels.
    await page.getByRole('button', { name: '13 steps' }).click()
    await expect(page.locator('.tt-cell')).toHaveCount(13)
    await expect(page.locator('.tt-cell-step').first()).toHaveText('25')
    await page.getByRole('button', { name: '9 steps' }).click()
    await expect(page.locator('.tt-cell')).toHaveCount(9)
    await expect(page.locator('.tt-cell-step').last()).toHaveText('800')

    // CURVE changes the ramp.
    const ramp = () => page.locator('.tt-note-hex').allTextContents()
    const even = await ramp()
    await page.getByRole('button', { name: 'High contrast' }).click()
    await expect(page.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true')
    expect(await ramp()).not.toEqual(even)

    // LIGHTNESS shapes the ramp and leaves the source colour alone. The ends of
    // the scale stay put; the steps between move.
    const hex = page.getByRole('textbox', { name: 'Base colour 1 hex' })
    const before = await hex.inputValue()
    const afterCurve = await ramp()
    const lightness = page.getByRole('slider', { name: 'Lightness' })
    await lightness.focus()
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight')
    await expect(page.locator('.tl-slider').filter({ has: lightness }).locator('.tl-slider-v')).toHaveText('+20')
    const lighter = await ramp()
    expect(lighter).not.toEqual(afterCurve)
    expect(lighter[0], 'the first step does not move').toBe(afterCurve[0])
    expect(lighter.at(-1), 'the last step does not move').toBe(afterCurve.at(-1))
    await expect(hex, 'lightness does not edit the source colour').toHaveValue(before)

    // SATURATION at zero makes a neutral ramp.
    const saturation = page.getByRole('slider', { name: 'Saturation' })
    await saturation.focus()
    await page.keyboard.press('Home')
    await expect(page.locator('.tl-slider').filter({ has: saturation }).locator('.tl-slider-v')).toHaveText('0%')
    const grey = await ramp()
    expect(grey).not.toEqual(lighter)
    for (const h of grey) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
      expect(Math.max(r, g, b) - Math.min(r, g, b), `${h} is not neutral at saturation 0`).toBeLessThanOrEqual(3)
    }
    await expect(hex, 'saturation does not edit the source colour').toHaveValue(before)

    await page.screenshot({ path: test.info().outputPath('tint-desktop.png'), fullPage: true })
  })

  test('a developer exports several scales with deterministic names', async ({ page }) => {
    watch(page, 'front-end developer')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/create/tint')

    await page.getByRole('button', { name: 'Add a colour' }).click()
    await expect(page.locator('.tt-src')).toHaveCount(2)
    // The new source is the one shown, and the radios say so.
    await expect(page.getByRole('radio', { name: 'Show scale 2' })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('radio', { name: 'Show scale 1' }).click()
    await expect(page.getByRole('radio', { name: 'Show scale 1' })).toHaveAttribute('aria-checked', 'true')

    await page.locator('.tl-export-btn').click()
    await page.getByRole('menuitem', { name: 'Copy CSS' }).click()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('--tint-1-50:')
    expect(text).toContain('--tint-2-950:')
    expect(text.match(/--tint-/g).length, 'two eleven-step scales').toBe(22)

    // One scale's own CSS, unnumbered when it is the only one.
    await page.getByRole('button', { name: 'Remove base colour 2' }).click()
    await expect(page.locator('.tt-src')).toHaveCount(1)
    await page.locator('.tl-export-btn').click()
    await page.getByRole('menuitem', { name: 'Copy CSS' }).click()
    const single = await page.evaluate(() => navigator.clipboard.readText())
    expect(single).toContain('--tint-50:')
    expect(single).not.toContain('--tint-1-')
  })

  test('the working surface is above the fold on a small phone, and contained', async ({ page }) => {
    watch(page, 'mobile designer')
    await page.setViewportSize({ width: 375, height: 667 })
    await go(page, '/create/tint')
    const cols = page.locator('.tt-cols')
    await expect(cols).toBeVisible()
    const box = await cols.boundingBox()
    expect(box.y + box.height, 'the step strip ends above the fold on an iPhone SE').toBeLessThanOrEqual(667)
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasPageOverflow, 'Tint should not create horizontal page overflow').toBe(false)
    await page.screenshot({ path: test.info().outputPath('tint-mobile.png'), fullPage: true })
  })

  test('an invalid source edit never blanks the scale, and reverts on blur', async ({ page }) => {
    watch(page, 'design-system engineer')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/tint')

    const hex = page.getByRole('textbox', { name: 'Base colour 1 hex' })
    const before = await page.locator('.tt-note-hex').allTextContents()
    await hex.fill('#NOTHEX')
    await expect(hex).toHaveAttribute('aria-invalid', 'true')
    expect(await page.locator('.tt-note-hex').allTextContents()).toEqual(before)
    await hex.blur()
    await expect(hex).toHaveValue('#2563EB')
  })

  test('clicking a step copies it, and the note says so', async ({ page }) => {
    watch(page, 'designer copying one step')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await go(page, '/create/tint')
    const cell = page.locator('.tt-cell').nth(5)
    const label = await cell.getAttribute('aria-label')
    const hex = label.match(/#[0-9A-F]{6}/)[0]
    await cell.click()
    await expect(page.locator('.tt-note-hex').nth(5)).toHaveText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(hex)
  })
})
