// Backing out of the palette preview: Escape, the close button, the browser Back button, and where focus lands.
//
// Seen to fail (make each break, watch the named test fail, restore):
//   1  in PalettePreviewDialog.jsx make the close button's onClick a no-op: "the close button closes the dialog and returns focus" fails
//   2  in PalettePreviewDialog.jsx drop the `useBackClosesDialog` call: "Back closes the dialog and stays on the palette page" fails
//   3  in PalettePreviewDialog.jsx drop the `useEscapeLayer` call on the legend popover: "Escape closes the open popover first, then the dialog" fails
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const COLORS = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']

async function open(page) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, COLORS)
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('backing out of the preview', () => {
  test('Escape closes the dialog', async ({ page }) => {
    watch(page, 'designer pressing Escape in the preview')
    const dialog = await open(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/create\/palette/)
  })

  test('the close button closes the dialog and returns focus', async ({ page }) => {
    const dialog = await open(page)
    await dialog.getByRole('button', { name: 'Close preview' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('body'), 'focus is not stranded on a removed node').not.toBeFocused()
    await expect(page.getByRole('button', { name: /^Preview/ }).first(), 'the Preview button is back to open it again').toBeVisible()
  })

  test('Back closes the dialog and stays on the palette page', async ({ page }) => {
    // Back closes the full-screen phone sheet only (useBackClosesDialog(layout === 'strip')); the desktop
    // modal sits over the page and Back there leaves it, as 194 holds. So this runs at phone width.
    await page.setViewportSize({ width: 390, height: 844 })
    const dialog = await open(page)
    const before = page.url()
    // The sheet adds its history entry once it mounts; wait for it so a Back cannot leave the page.
    await expect.poll(() => page.evaluate(() => Boolean(window.history.state?.dialogBack)), { message: 'the sheet never marked its history entry' }).toBe(true)
    await page.goBack()
    await expect(dialog).toHaveCount(0)
    expect(page.url(), 'Back left the palette page instead of closing the sheet').toBe(before)
  })

  test('Escape closes the open popover first, then the dialog', async ({ page }) => {
    const dialog = await open(page)
    const more = dialog.locator('.pvd-more')
    if (await more.count()) {
      await more.click()
      await expect(dialog.getByRole('dialog', { name: 'More colours' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog.getByRole('dialog', { name: 'More colours' })).toHaveCount(0)
      await expect(dialog, 'the first Escape left the dialog open').toBeVisible()
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('Tab stays inside the dialog', async ({ page }) => {
    const dialog = await open(page)
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"][aria-label="Palette preview"]')))
    expect(inside, 'focus after 40 Tabs').toBe(true)
    await expect(dialog).toBeVisible()
  })
})
