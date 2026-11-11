// /discover/buttons — the Button Library.
//
//   1. Signed out, a visitor copies a design's CSS from the card, and the HTML
//      and CSS from its dialog. Nothing needs an account.
//   2. The Pro blocks (quick edits, the prompt) are locked for them, and the
//      link goes to /plans.
//   3. A Pro session gets the edits, and the CSS it copies changes with them.
//   4. Nothing overflows sideways at 390, with the dialog shut or open.
//   5. Escape closes the dialog and hands focus back to what opened it.
//
// MUTATIONS this file goes red on:
//   - render the edits for everyone (drop `pro ?` in ButtonLibraryDialog): test 2 goes red;
//   - copy the unedited CSS (use `buttonCss(item)` for the dialog copy): test 3 goes red;
//   - drop `useModalDialog` from the dialog: test 5 goes red.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const openSolid = async (page) => {
  await page.getByRole('button', { name: 'Open Solid button', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Solid button' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Button Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  })

  test('signed out: copy the CSS from a card, and the HTML and CSS from its dialog', async ({ page }) => {
    watch(page, 'a visitor copying a button')
    await go(page, '/discover/buttons')
    await expect(page.getByRole('heading', { level: 1, name: 'Button Library' })).toBeVisible()

    await page.getByRole('button', { name: 'Copy Solid CSS', exact: true }).click()
    const card = await clipboard(page)
    expect(card).toContain('.btn-solid {')
    expect(card).toContain('@media (hover: hover) {')
    expect(card).toContain('@media (prefers-reduced-motion: reduce) {')

    const dialog = await openSolid(page)
    await dialog.getByRole('button', { name: 'Copy HTML', exact: true }).click()
    expect(await clipboard(page)).toContain('<button class="btn-solid" type="button">')
    await dialog.getByRole('button', { name: 'Copy CSS', exact: true }).click()
    expect(await clipboard(page)).toBe(card.trim())
    // Enabled and disabled, side by side.
    await expect(dialog.locator('.blib-live button')).toHaveCount(2)
    await expect(dialog.locator('.blib-live button:disabled')).toHaveCount(1)
  })

  test('signed out: the Pro blocks are locked and link to /plans', async ({ page }) => {
    watch(page, 'a visitor meeting the Pro blocks')
    await go(page, '/discover/buttons')
    const dialog = await openSolid(page)
    await expect(dialog.getByRole('radio')).toHaveCount(0)
    await expect(dialog.getByRole('heading', { name: 'AI prompt' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Quick edits' })).toBeVisible()
    const links = dialog.getByRole('link', { name: 'See Pro plans' })
    await expect(links).toHaveCount(2)
    await expect(links.first()).toHaveAttribute('href', '/plans')
    // The prompt text is not in the page for someone who cannot read it.
    await expect(page.getByText('Match this spec:')).toHaveCount(0)
    await links.first().click()
    await expect(page).toHaveURL(/\/plans$/)
  })

  test('Pro: quick edits unlock, and the copied CSS changes with them', async ({ page }) => {
    watch(page, 'a Pro member editing a button')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/buttons')
    const dialog = await openSolid(page)
    await expect(dialog.getByRole('radio', { name: 'Large' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled()

    await dialog.getByRole('radio', { name: 'Large' }).check()
    await dialog.getByRole('radio', { name: 'Round' }).check()
    await dialog.getByRole('radio', { name: 'Violet' }).check()
    await expect(dialog.getByRole('button', { name: 'Reset', exact: true })).toBeEnabled()

    await dialog.getByRole('button', { name: 'Copy CSS', exact: true }).click()
    const css = await clipboard(page)
    expect(css).toContain('--button-pad-y: 16px')
    expect(css).toContain('--button-radius: 999px')
    expect(css).toContain('--button-bg: #6d28d9')

    // The prompt carries the same CSS.
    await expect(dialog.getByRole('heading', { name: 'AI prompt' })).toBeVisible()
    await expect(dialog.locator('.blib-pre--wrap')).toContainText('--button-radius: 999px')
    await expect(dialog.getByRole('link', { name: 'See Pro plans' })).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Reset', exact: true }).click()
    await dialog.getByRole('button', { name: 'Copy CSS', exact: true }).click()
    expect(await clipboard(page)).toContain('--button-pad-y: 12px')
  })

  test('Escape closes the dialog and focus goes back to its button', async ({ page }) => {
    watch(page, 'a visitor closing a dialog')
    await go(page, '/discover/buttons')
    const opener = page.getByRole('button', { name: 'Open Solid button', exact: true })
    await opener.click()
    await expect(page.getByRole('dialog', { name: 'Solid button' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

    test('390: nothing overflows sideways, shut or open', async ({ page }) => {
      watch(page, 'a phone visitor on the Button Library')
      await go(page, '/discover/buttons')
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(await overflow(), 'the page scrolls sideways').toBeLessThanOrEqual(0)
      // The toolbar is one row: search plus the role chips, never wrapped.
      const box = await page.locator('.blib-toolbar').boundingBox()
      expect(box.width).toBeLessThanOrEqual(390)

      await openSolid(page)
      expect(await overflow(), 'the dialog scrolls the page sideways').toBeLessThanOrEqual(0)
      const dialog = page.getByRole('dialog', { name: 'Solid button' })
      const dbox = await dialog.boundingBox()
      expect(dbox.x).toBeGreaterThanOrEqual(0)
      expect(dbox.x + dbox.width).toBeLessThanOrEqual(390)
      await page.keyboard.press('Escape')
      await expect(page.locator('.blib-card')).toHaveCount(10)
    })

    test('320: the full-width preview is as wide enabled as disabled, inside the dialog', async ({ page }) => {
      watch(page, 'a small-phone visitor on the full-width button')
      await page.setViewportSize({ width: 320, height: 640 })
      await go(page, '/discover/buttons')
      await page.getByRole('button', { name: 'Open Full width button', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Full width button' })
      await expect(dialog).toBeVisible()
      const widths = await dialog.locator('.blib-live button').evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().width)))
      expect(widths).toHaveLength(2)
      expect(widths[1], 'the disabled preview shrank to its text').toBe(widths[0])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    })
  })
})
