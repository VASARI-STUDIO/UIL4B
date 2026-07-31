import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

test.describe('Palette Builder recovery and tool continuity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('palette-test-cleaned')) return
      localStorage.removeItem('vs-current-design')
      localStorage.removeItem('vs-palette-history')
      sessionStorage.clear()
      sessionStorage.setItem('palette-test-cleaned', 'true')
    })
  })

  test('a first session starts from one random seed and every seed representation matches', async ({ page }) => {
    watch(page, 'first-time palette designer')
    await go(page, '/color/palette')

    const seed = page.getByRole('textbox', { name: 'Seed colour hex' })
    const firstHex = page.locator('.plb-col .plb-hex').first()
    await expect(seed).toHaveValue(/^#[0-9A-F]{6}$/)
    await expect(firstHex).toHaveText(await seed.inputValue())

    const initial = await seed.inputValue()
    const pickerColour = await page.locator('.plb-seedpick .cpk-trigger-chip').evaluate(
      element => getComputedStyle(element).backgroundColor,
    )
    const firstColour = await page.locator('.plb-col').first().evaluate(
      element => getComputedStyle(element).backgroundColor,
    )
    expect(pickerColour).toBe(firstColour)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(seed).toHaveValue(initial)
    await expect(firstHex).toHaveText(initial)
  })

  test('the shell aligns, controls stay level, and hover labels cause no toolbar reflow', async ({ page }) => {
    watch(page, 'precision-focused desktop designer')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/color/palette')
    await expect(page.locator('.plb-toolbar')).toBeVisible()

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('.pnav')
      const navInner = document.querySelector('.pnav-inner')
      const toolbar = document.querySelector('.plb-toolbar')
      const title = document.querySelector('.plb-title')
      const controls = [
        document.querySelector('.plb-seedpick .cpk-trigger'),
        document.querySelector('.plb-hexfield'),
        document.querySelector('.plb-harm'),
      ]
      const navLeft = navInner.getBoundingClientRect().left + parseFloat(getComputedStyle(navInner).paddingLeft)
      return {
        gap: toolbar.getBoundingClientRect().top - nav.getBoundingClientRect().bottom,
        leftDelta: title.getBoundingClientRect().left - navLeft,
        heights: controls.map(element => element.getBoundingClientRect().height),
      }
    })
    expect(Math.abs(geometry.gap)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.leftDelta)).toBeLessThanOrEqual(1)
    expect(new Set(geometry.heights.map(value => Math.round(value))).size).toBe(1)

    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(800)
    const preview = page.getByRole('button', { name: 'Preview' })
    const next = page.getByRole('button', { name: 'Gradient' })
    const collapsedLabel = await preview.locator('.plb-lbl').evaluate(element => {
      const style = getComputedStyle(element)
      return {
        visibility: style.visibility,
        opacity: style.opacity,
        borderWidth: style.borderTopWidth,
        clipPath: style.clipPath,
      }
    })
    expect(collapsedLabel.visibility).toBe('hidden')
    expect(collapsedLabel.opacity).toBe('0')
    expect(collapsedLabel.borderWidth).toBe('0px')
    expect(collapsedLabel.clipPath).not.toBe('none')
    const before = await page.evaluate(() => ({
      toolbar: document.querySelector('.plb-toolbar').getBoundingClientRect().toJSON(),
      next: document.querySelector('[title="Open this palette in the Gradient Generator"]').getBoundingClientRect().toJSON(),
    }))
    await preview.hover()
    await page.waitForTimeout(350)
    const after = await page.evaluate(() => ({
      toolbar: document.querySelector('.plb-toolbar').getBoundingClientRect().toJSON(),
      next: document.querySelector('[title="Open this palette in the Gradient Generator"]').getBoundingClientRect().toJSON(),
    }))
    expect(after.toolbar.height).toBe(before.toolbar.height)
    expect(after.toolbar.width).toBe(before.toolbar.width)
    expect(after.next.x).toBe(before.next.x)
    await expect(preview.locator('.plb-lbl')).toHaveCSS('visibility', 'visible')
    await expect(next).toBeVisible()

    await page.locator('.app-footer').scrollIntoViewIfNeeded()
    const footerDelta = await page.evaluate(() => {
      const navInner = document.querySelector('.pnav-inner')
      const navLeft = navInner.getBoundingClientRect().left + parseFloat(getComputedStyle(navInner).paddingLeft)
      return document.querySelector('.app-footer-mark').getBoundingClientRect().left - navLeft
    })
    expect(Math.abs(footerDelta)).toBeLessThanOrEqual(1)
  })

  test('adjustment tracks are equal, explanatory, and mark the neutral centre', async ({ page }) => {
    watch(page, 'designer tuning colour relationships')
    await go(page, '/color/palette')

    const tracks = page.locator('.plb-adjust input[type="range"]')
    await expect(tracks).toHaveCount(4)
    const details = await tracks.evaluateAll(elements => elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      background: getComputedStyle(element).backgroundImage,
    })))
    expect(Math.max(...details.map(item => item.width)) - Math.min(...details.map(item => item.width))).toBeLessThan(0.1)
    for (const item of details) {
      expect(item.background).toContain('linear-gradient')
      expect(item.background).toContain('50%')
    }
  })

  test('Space activates interactive Palette controls without invoking the global randomise shortcut', async ({ page }) => {
    watch(page, 'keyboard designer using controls, popovers and modals')
    await go(page, '/color/palette')
    await expect(page.locator('.plb-col .plb-hex')).toHaveCount(5)
    const before = await page.locator('.plb-col .plb-hex').allTextContents()

    const previewButton = page.getByRole('button', { name: 'Preview' })
    await previewButton.focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog', { name: 'Palette preview' })).toBeVisible()
    await page.getByRole('button', { name: 'Dark', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const close = page.getByRole('button', { name: 'Close preview' })
    await close.focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('dialog', { name: 'Palette preview' })).toHaveCount(0)

    expect(await page.locator('.plb-col .plb-hex').allTextContents()).toEqual(before)
  })

  test('swap direction, right-click insertion and preview gating are explicit', async ({ page }) => {
    watch(page, 'keyboard-and-pointer palette editor')
    await go(page, '/color/palette')

    const swatchHexes = page.locator('.plb-col .plb-hex')
    await expect(swatchHexes).toHaveCount(5)
    const before = await swatchHexes.allTextContents()
    await page.getByRole('button', { name: 'Choose a direction to swap PRIMARY' }).click()
    await expect(page.getByRole('menuitem', { name: 'Swap left' })).toHaveCount(0)
    await page.getByRole('menuitem', { name: 'Swap right' }).click()
    await expect(page.locator('.plb-col .plb-hex').first()).toHaveText(before[1])
    await expect(page.getByRole('textbox', { name: 'Seed colour hex' })).toHaveValue(before[1])

    await page.locator('.plb-gap').first().click({ button: 'right' })
    const insertMenu = page.getByRole('menu', { name: 'Insert colours' })
    await expect(insertMenu).toBeVisible()
    await expect(insertMenu.getByRole('menuitem')).toHaveCount(4)

    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.locator('.plb-preview-item')).toHaveCount(6)
    await expect(page.locator('.plb-preview-item--locked')).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Unlock preview' })).toHaveCount(3)
    await expect(page.locator('[data-preview-scene="Commerce checkout"]')).toContainText('Order summary')
    await expect(page.locator('[data-preview-scene="Account settings"]')).toContainText('Email address')
    await expect(page.locator('[data-preview-scene="Support inbox"]')).toContainText('Unable to export tokens')
    await expect(page.locator('[data-preview-scene="Finance overview"]')).toContainText('Recent transactions')
    await page.getByRole('tab', { name: 'Brand' }).click()
    await expect(page.locator('.plb-preview-item')).toHaveCount(6)
    await expect(page.locator('.plb-preview-item--locked')).toHaveCount(3)
    await expect(page.locator('[data-preview-scene="Architecture studio"]')).toContainText('Courtyard House')
    await expect(page.locator('[data-preview-scene="Conference"]')).toContainText('Opening keynote')
    await expect(page.locator('[data-preview-scene="Hospitality"]')).toContainText('Check rooms')
    await page.getByRole('tab', { name: 'Graphic Design' }).click()
    await expect(page.locator('[data-preview-scene="Album cover"]')).toContainText('Signal One')
    await expect(page.locator('[data-preview-scene="Packaging"]')).toContainText('ORIGIN')
    await expect(page.locator('[data-preview-scene="Magazine cover"]')).toContainText('Brisbane')
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('contrast and HCT stay attached to each swatch with clear Pro explanations', async ({ page }) => {
    watch(page, 'free designer discovering advanced colour checks')
    await go(page, '/color/palette')

    await expect(page.locator('.plb-toolbar').getByRole('button', { name: /Contrast/i })).toHaveCount(0)
    await page.getByRole('button', { name: 'Show contrast guidance for PRIMARY' }).click()
    await expect(page.getByRole('dialog', { name: 'Check contrast, light and dark' })).toBeVisible()
    await page.getByRole('button', { name: 'Close', exact: true }).click()

    await page.getByRole('button', { name: 'Edit PRIMARY in HCT' }).click()
    await expect(page.getByRole('dialog', { name: 'Fine-tune any colour in HCT' })).toBeVisible()
  })

  for (const width of [980, 768, 480, 380]) {
    test(`the shared shell remains contained at ${width}px`, async ({ page }) => {
      watch(page, `palette designer at ${width}px`)
      await page.setViewportSize({ width, height: 820 })
      await go(page, '/color/palette')
      await expect(page.locator('.plb-toolbar')).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(1)

      await page.locator('.app-footer').scrollIntoViewIfNeeded()
      const gutterDelta = await page.evaluate(() => {
        const navInner = document.querySelector('.pnav-inner')
        const navLeft = navInner.getBoundingClientRect().left + parseFloat(getComputedStyle(navInner).paddingLeft)
        return document.querySelector('.app-footer-mark').getBoundingClientRect().left - navLeft
      })
      expect(Math.abs(gutterDelta)).toBeLessThanOrEqual(1)
    })
  }

  test('Tint Generator offers an immediate route back to the Palette Builder', async ({ page }) => {
    watch(page, 'designer moving between colour tools')
    await go(page, '/color/tint')
    const back = page.getByRole('link', { name: 'Back to Palette Builder' })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/color\/palette$/)
  })
})
