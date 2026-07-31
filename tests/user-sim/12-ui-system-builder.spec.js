import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

async function enter(page) {
  await go(page, '/color/palette')
  await page.getByRole('button', { name: 'Build UI system' }).click()
  await expect(page.getByRole('heading', { name: 'UI System Builder' })).toBeVisible()
}

test.describe('UI System Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('vs-current-design')
      localStorage.removeItem('vs-palette-history')
      sessionStorage.clear()
    })
  })

  test('Space belongs to UI controls and Back restores the ordinary Palette draft exactly', async ({ page, context }) => {
    watch(page, 'designer evaluating UI mode without committing it')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await go(page, '/color/palette')
    const seed = await page.getByRole('textbox', { name: 'Seed colour hex' }).inputValue()
    const palette = await page.locator('.plb-col .plb-hex').allTextContents()

    await page.getByRole('button', { name: 'Open UI System Pro mode' }).click()
    await expect(page.getByRole('heading', { name: 'UI System Builder' })).toBeVisible()
    await expect(page.getByRole('gridcell', { name: new RegExp(`Brand 500, ${seed}`) })).toBeVisible()

    const brand500 = page.getByRole('gridcell', { name: new RegExp(`Brand 500, ${seed}`) })
    await brand500.focus()
    await page.keyboard.press('Space')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(seed)
    await page.getByRole('button', { name: 'Dark', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.uis-lab-canvas')).toHaveCount(1)
    await expect(page.locator('.uis-lab-canvas')).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: 'Back to palette' }).click()
    await expect(page.getByRole('textbox', { name: 'Seed colour hex' })).toHaveValue(seed)
    expect(await page.locator('.plb-col .plb-hex').allTextContents()).toEqual(palette)
  })

  test('all 54 shades, role evidence and the core Component Lab remain visible to free users', async ({ page }) => {
    watch(page, 'free designer auditing the whole generated system')
    await enter(page)

    await expect(page.getByRole('gridcell')).toHaveCount(54)
    await expect(page.getByRole('rowheader')).toHaveCount(6)
    await expect(page.getByText('Complete system preview.')).toBeVisible()
    await expect(page.locator('.uis-role-map')).toHaveCount(2)
    await expect(page.getByRole('heading', { name: 'Test the system on interface states' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Default' }).first()).toBeVisible()
    await expect(page.getByText('Status alerts').first()).toBeVisible()
    await expect(page.getByText('Invalid field').first()).toBeVisible()
    await expect(page.locator('.uis-scene-tab')).toHaveCount(5)
    await page.getByRole('button', { name: 'What is HCT?' }).first().click()
    await expect(page.getByRole('tooltip')).toContainText('Hue chooses the colour family')
    await expect(page.getByRole('tooltip')).toContainText('Display gamut')
  })

  test('the matrix has one roving tab stop and arrows plus Enter copy the focused shade', async ({ page, context }) => {
    watch(page, 'keyboard-only system designer')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enter(page)

    const active = page.locator('.uis-cell[tabindex="0"]')
    await expect(active).toHaveCount(1)
    await active.focus()
    await expect(active).toHaveAccessibleName(/Brand 500/)
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.uis-cell:focus')).toHaveAccessibleName(/Brand 600/)
    const expected = (await page.locator('.uis-cell:focus').getAttribute('aria-label')).match(/#[0-9A-F]{6}/)[0]
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected)
    await expect(page.getByRole('article', { name: /Brand 600 details/ })).toContainText('Contrast evidence')
    await expect(page.getByRole('article', { name: /Brand 600 details/ })).toContainText('Achieved HCT')
  })

  test('free actions gate calmly without hiding system evidence', async ({ page }) => {
    watch(page, 'free designer testing premium boundaries')
    await enter(page)

    await page.getByRole('textbox', { name: 'Brand 500' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit the UI system seed' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('button', { name: 'True grey' }).click()
    await expect(page.getByRole('dialog', { name: 'Rebalance the complete UI system' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('gridcell', { name: /Brand 600/ }).click()
    await page.getByRole('button', { name: /Edit shade/ }).click()
    await expect(page.getByRole('dialog', { name: 'Fine-tune individual UI shades' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('button', { name: 'Copy CSS' }).click()
    await expect(page.getByRole('dialog', { name: 'Export production-ready UI tokens' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('tab', { name: 'Settings Form' }).click()
    await expect(page.getByRole('dialog', { name: 'Open every applied UI scene' })).toBeVisible()
    await expect(page.getByRole('gridcell')).toHaveCount(54)
  })

  test('light, dark and side-by-side Component Lab modes consume the generated roles', async ({ page }) => {
    watch(page, 'designer validating both interface themes')
    await enter(page)

    await expect(page.locator('.uis-lab-canvas')).toHaveCount(2)
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('.uis-lab-canvas')).toHaveCount(1)
    await expect(page.locator('.uis-lab-canvas')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Side-by-side' }).click()
    await expect(page.locator('.uis-lab-canvas')).toHaveCount(2)

    const mappedPairs = await page.locator('.uis-role-pairs p').allTextContents()
    expect(mappedPairs.length).toBeGreaterThan(10)
    expect(mappedPairs.every(text => /[4-9]\.\d{2}:1|1\d\.\d{2}:1|2\d\.\d{2}:1/.test(text))).toBe(true)
  })

  test('new compact controls retain at least 44 by 44 CSS-pixel touch targets', async ({ page }) => {
    watch(page, 'touch user operating the UI system controls')
    await enter(page)

    const sizes = await page.locator([
      '.uis-back',
      '.uis-choice',
      '.uis-command-actions .btn',
      '.uis-segmented button',
      '.uis-scene-tab',
      '.uis-help-button',
      '.uis-export-actions .btn',
      '.uis-detail-ident .btn',
      '.uis-seed-picker',
    ].join(',')).evaluateAll(elements => elements.map(element => ({
      name: element.textContent?.trim() || element.getAttribute('aria-label'),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    })))
    for (const control of sizes) {
      expect(control.height, `${control.name} target height`).toBeGreaterThanOrEqual(44)
      if (control.name === 'What is HCT?' || control.name === 'Choose UI system brand colour') {
        expect(control.width, `${control.name} target width`).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('free preview cannot apply nine editable Brand shades or bypass the palette cap', async ({ page }) => {
    watch(page, 'free designer reaching the Pro hand-back boundary')
    await go(page, '/color/palette')
    await expect(page.locator('.plb-col .plb-hex').first()).toBeVisible()
    const original = await page.locator('.plb-col .plb-hex').allTextContents()
    await page.getByRole('button', { name: 'Build UI system' }).click()
    await page.getByRole('button', { name: 'Apply Brand scale to palette' }).click()
    await expect(page.getByRole('dialog', { name: 'Apply a complete Brand scale' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Back to palette' }).click()
    expect(await page.locator('.plb-col .plb-hex').allTextContents()).toEqual(original)
    expect(original.length).toBeLessThanOrEqual(8)
  })

  for (const width of [1440, 800, 720, 640, 380]) {
    const zoomContext = width === 720 ? ' (1440px viewport at 200% equivalent)' : ''
    test(`the UI system remains contained at ${width}px${zoomContext}`, async ({ page }) => {
      watch(page, `UI system designer at ${width}px`)
      await page.setViewportSize({ width, height: 900 })
      await enter(page)

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
      if (width > 980) {
        await expect(page.locator('.uis-matrix-wrap')).toHaveCSS('overflow-x', 'visible')
      } else if (width > 640) {
        await expect(page.locator('.uis-matrix-wrap')).toHaveCSS('overflow-x', 'auto')
      } else {
        await expect(page.locator('#uis-row-brand .uis-cell:visible')).toHaveCount(9)
        await expect(page.locator('#uis-row-success .uis-cell:visible')).toHaveCount(0)
        await page.getByRole('button', { name: /Success/ }).click()
        await expect(page.locator('#uis-row-success .uis-cell:visible')).toHaveCount(9)
      }
    })
  }

  test('generation remains available offline and honors reduced motion plus forced colours', async ({ page, context }) => {
    watch(page, 'designer working with constrained browser settings')
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
    await go(page, '/color/palette')
    await expect(page.getByRole('button', { name: 'Build UI system' })).toBeVisible()
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Build UI system' }).click()

    await expect(page.getByRole('gridcell')).toHaveCount(54)
    await expect(page.locator('.uis-cell').first()).toHaveCSS('transition-duration', '0s')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  })
})
