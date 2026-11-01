// The dev-only component sheet at /dev/components.
//
// The acceptance build is `vite build --mode test`, and the route's gate is
// `import.meta.env.DEV || MODE === 'test'`, so it renders here. That it is ABSENT
// from a production build is a unit check (a production bundle cannot be served
// by this suite): tests/unit/dev-component-sheet-not-in-production.test.js.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const SECTIONS = ['buttons-fields', 'menus-nav', 'feedback']

test.describe('the dev component sheet', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'dev-component-sheet') })

  test('renders its three sections with the real controls', async ({ page }) => {
    await go(page, '/dev/components')
    await expect(page.locator('[data-dev-sheet="components"] h1')).toHaveText('Component sheet')
    for (const id of SECTIONS) await expect(page.locator(`[data-dcs-section="${id}"]`)).toBeVisible()
    // Buttons: every state of the default button, the real classes.
    const row = page.locator('[data-dcs-family="Button, default"]')
    await expect(row.locator('.dcs-cell')).toHaveCount(5)
    await expect(row.locator('[data-state="disabled"] button.btn')).toBeDisabled()
    await expect(row.locator('[data-state="loading"] button.btn')).toHaveAttribute('aria-busy', 'true')
    await expect(page.locator('[data-dcs-family="Form field"] [data-state="invalid"] input')).toHaveAttribute('aria-invalid', 'true')
    // Feedback: four real toasts, a tab strip, a switch, an empty state, the loader.
    await expect(page.locator('.dcs-toasts .toast.show')).toHaveCount(4)
    await expect(page.getByRole('tablist', { name: 'Sample tabs' }).getByRole('tab')).toHaveCount(4)
    await expect(page.getByRole('switch').first()).toBeVisible()
    await expect(page.locator('.lbry-empty')).toBeVisible()
    await expect(page.locator('.dcs-loading .fg-loader')).toBeAttached()
  })

  test('forced hover paints the same colours as a real hover', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/dev/components')
    const forced = page.locator('[data-dcs-family="Button, default"] [data-state="hover"] button')
    const live = page.locator('[data-dcs-family="Button, default"] [data-state="default"] button')
    const paint = (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.borderTopColor, s.color].join('|') })
    const forcedPaint = await paint(forced)
    await live.hover()
    await page.waitForTimeout(400)
    expect(await paint(live)).toBe(forcedPaint)
  })

  test('the filter menu opens once its stage is on screen, anchored to its trigger, with no scroll jump', async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      await go(page, '/dev/components')
      const trigger = page.locator('[data-dcs-open-menu] .lbry-filtertrig')
      // Off screen at arrival: still closed, and the page has not moved.
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(await page.evaluate(() => window.scrollY), `scrollY on arrival at ${width}`).toBeLessThan(2)
      await page.locator('[data-dcs-open-menu]').evaluate((el) => el.scrollIntoView({ block: 'center' }))
      const settled = await page.evaluate(() => window.scrollY)
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const menu = page.locator('[data-dcs-open-menu] .lbry-filtermenu')
      await expect(menu).toBeVisible()
      // Opening (and the focus it moves) does not scroll the page.
      await page.waitForTimeout(400)
      expect(await page.evaluate(() => window.scrollY), `scroll jump at ${width}`).toBe(settled)
      // Anchored: the list hangs 6px under the trigger. usePopover end-aligns it (right edges
      // together) and flips to start-aligned (left edges together) when the end would run off
      // the left of the screen; either way one pair of edges is flush with the trigger's.
      const t = await trigger.boundingBox()
      const m = await menu.boundingBox()
      expect(Math.abs(m.y - (t.y + t.height + 6)), `menu offset below trigger at ${width}`).toBeLessThanOrEqual(2)
      const align = await menu.getAttribute('data-pop-align')
      expect(['start', 'end'], `popover alignment at ${width}`).toContain(align)
      const flush = align === 'start' ? Math.abs(m.x - t.x) : Math.abs(m.x + m.width - (t.x + t.width))
      expect(flush, `menu ${align} edge vs trigger at ${width}`).toBeLessThanOrEqual(2)
      expect(m.x, `menu inside the screen at ${width}`).toBeGreaterThanOrEqual(0)
      expect(m.x + m.width, `menu inside the screen at ${width}`).toBeLessThanOrEqual(width)
    }
  })

  test('the chip trays never wrap and the theme control has room', async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/dev/components')
      for (const tray of await page.locator('[data-dcs-family="Chips"] .lbry-filters').all()) {
        const tops = await tray.locator('.lbry-filter').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
        expect(new Set(tops).size, `chip rows at ${width}`).toBe(1)
      }
      // No theme button's content spills past its own box.
      const squeezed = await page.locator('.dcs-stage .theme-seg-btn').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth).length)
      expect(squeezed, `squeezed theme buttons at ${width}`).toBe(0)
    }
  })

  test('?menu= opens the real header panel and the buttons do too', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/dev/components?menu=discover')
    await expect(page.locator('#pnav-mega[data-menu="discover"]')).toBeVisible()
    await go(page, '/dev/components')
    await page.locator('[data-open-menu="create"]').click()
    await expect(page.locator('#pnav-mega[data-menu="create"]')).toBeVisible()
  })

  test('the modal opens from the sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/dev/components')
    await page.locator('[data-open-modal]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('has no horizontal overflow at 390, 768 and 1440', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/dev/components')
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over, `overflow at ${width}`).toBeLessThanOrEqual(0)
    }
  })

  test('the jump bar never wraps', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/dev/components')
    const tops = await page.locator('.dcs-jump a').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
  })
  test('the in-flow toast specimens stay under the sticky header', async ({ page }) => {
    await go(page, '/dev/components')
    const z = await page.locator('.dcs-toasts .toast').first().evaluate((el) => getComputedStyle(el).zIndex)
    expect(z).toBe('auto')
  })
})
