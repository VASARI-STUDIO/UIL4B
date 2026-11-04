import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// A picker that grows after it opens (Enter adds the Recent row) must never
// grow over the control that opened it, whichever side it opened on.
for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  test(`Tint picker never covers its trigger after it grows at ${width}px`, async ({ page }) => {
    watch(page, 'designer editing a tint source')
    await page.setViewportSize({ width, height })
    await go(page, '/create/tint')

    const trigger = page.getByRole('button', { name: 'Pick base colour 1', exact: true })
    const picker = page.getByRole('dialog', { name: 'Pick base colour 1', exact: true })
    const hex = picker.locator('.cpk-hex')
    const overlap = () => page.evaluate(() => {
      const t = document.querySelector('[aria-label="Pick base colour 1"][aria-haspopup]').getBoundingClientRect()
      const p = document.querySelector('.cpk-pop').getBoundingClientRect()
      return Math.min(t.right, p.right) - Math.max(t.left, p.left) > 0
        && Math.min(t.bottom, p.bottom) - Math.max(t.top, p.top) > 0
    })

    await trigger.click()
    await expect(hex).toBeVisible()
    await hex.fill('#22c55e')
    await hex.press('Enter')
    // The Recent row now exists; give the layout a few frames to settle.
    await expect(picker.locator('.cpk-recents')).toBeVisible()
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    expect(await overlap()).toBe(false)
    await expect(trigger).toBeVisible()
  })
}

// The popover is portalled to the end of <body>, so the browser's own Tab order
// from it is wrong. It must behave like an inline disclosure.
test('Tint picker hands Tab on to the control after its trigger, and Shift+Tab back to the trigger', async ({ page }) => {
  watch(page, 'keyboard user editing a tint source')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/create/tint')

  const trigger = page.getByRole('button', { name: 'Pick base colour 1', exact: true })
  const picker = page.getByRole('dialog', { name: 'Pick base colour 1', exact: true })
  // The control that follows the trigger in the document, outside the picker.
  const expectedNext = await trigger.evaluate(el => {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    const all = Array.from(document.querySelectorAll(sel)).filter(n => n.getClientRects().length > 0)
    const next = all[all.indexOf(el) + 1]
    return next.getAttribute('aria-label') || next.textContent.trim()
  })

  await trigger.click()
  await expect(picker).toBeVisible()
  await expect(picker.locator('.cpk-pad')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(picker).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(picker.locator('.cpk-pad')).toBeFocused()
  await picker.locator('.cpk-swatches').last().locator('button').last().focus()
  await page.keyboard.press('Tab')
  await expect(picker).toHaveCount(0)
  const landed = await page.evaluate(() => {
    const el = document.activeElement
    return el.getAttribute('aria-label') || el.textContent.trim()
  })
  expect(landed).toBe(expectedNext)
  expect(await page.evaluate(() => !!document.activeElement.closest('.cpk-pop, .skip-link, [class*="skip"]'))).toBe(false)
})

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
      await expect(picker).toBeVisible()
      if (width === 390) {
        // The phone sheet dims the page behind it on purpose: the first tap
        // outside lands on the scrim and closes the sheet, it does not reach
        // the field underneath. Only after that is the field tappable again.
        await page.locator('.cpk-scrim').click({ position: { x: 10, y: 10 } })
        await expect(picker).toHaveCount(0)
        await expect(page.locator('.cpk-scrim')).toHaveCount(0)
        await source.click()
        await expect(source).toBeFocused()
      } else {
        // Wider screens draw no scrim: a tap straight on another field closes the picker.
        await expect(page.locator('.cpk-scrim')).toHaveCount(0)
        await source.click()
        await expect(picker).toHaveCount(0)
        await expect(source).toBeFocused()
      }
    })
  }
}
