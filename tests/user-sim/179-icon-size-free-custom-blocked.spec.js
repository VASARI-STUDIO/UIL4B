// A FREE CUSTOM SIZE CAN BE PREVIEWED, BUT NOT TAKEN AWAY.
//
// Typing in the Custom field and picking Custom are never blocked, for anyone. But the file at a
// size outside the five presets is Pro. A free or signed-out viewer who commits 40 sees the icon
// at 40 and the reason in the preview line (#icust-preview-line, a live region). The primary
// button is still the same node but reads "Upgrade to Pro"; the code's Copy, Download SVG (both
// parts) and Save to project are aria-disabled: still in the tab order, never `disabled`, and a
// click does nothing. Picking a preset again turns them back on, and the clipboard has been
// written by nothing in between. (The swap's own behaviour is in 181-icon-pro-preview-swap.spec.js.)
//
// HOW TO SEE EACH FAIL (src/utils/iconSize.js, src/utils/iconProPreview.js, src/pages/IconLibrary.jsx):
//   isProSetting always returns false                     -> every test here: nothing is dimmed
//   drop `aria-disabled={previewing || undefined}` from Save / the code box -> "a committed 40 ..."
//   drop `blocked` from SplitDownload's onClick guard      -> "a click that lands anyway ..."
//   the preview line stops being #icust-preview-line       -> "a committed 40 ... says why"
//   src restored byte for byte                             -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'someone without Pro trying a custom icon size'
const REASON = 'Custom sizes are Pro. Preview 40px here; saving and export need Pro.'
const FREE_AGAIN = 'Back to free settings. Copy, download and save are on.'

/** Open the customiser as a signed-in free viewer or a signed-out one. */
async function openAs(browser, plan) {
  const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, PERSONA)
  await page.addInitScript(() => {
    window.__clipboardWrites = []
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = (text) => { window.__clipboardWrites.push(text); return orig(text) }
  })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-size-cell[data-s="16"] svg')).toBeVisible({ timeout: 20_000 })
  return { ctx, page }
}

/** Copy SVG, then Upgrade to Pro: the one node, found by class because its name changes. */
const primary = (page) => page.locator('.icust-copy')
/** The ones that dim (aria-disabled) while a Pro setting is previewed. */
const dimmable = (page) => ({
  'the code Copy': page.locator('.icust-code-box'),
  'Download SVG': page.getByRole('button', { name: 'Download SVG', exact: true }),
  'Download formats': page.getByRole('button', { name: 'Download formats', exact: true }),
  'Save to project': page.getByRole('button', { name: 'Save to project', exact: true }),
})
const reason = (page) => page.locator('#icust-preview-line')
const customRadio = (page) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name: /^Custom(,|$)/ })
const sizeInput = (page) => page.getByRole('textbox', { name: 'Custom size' })

for (const [who, plan] of [['a signed-in free viewer', 'free'], ['a signed-out viewer', null]]) {
  test.describe(who, () => {
    test('can pick Custom and type a size, and nothing about that is blocked', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await expect(page.getByText('Custom size is Pro', { exact: true }), 'the hint is in the rail header').toBeVisible()
      await customRadio(page).click()
      await expect(sizeInput(page)).toBeFocused()
      await sizeInput(page).fill('40')
      await expect(sizeInput(page)).toHaveValue('40')
      await ctx.close()
    })

    test('a committed 40 swaps Copy SVG for Upgrade to Pro, dims Download, Save and the code Copy, and says why', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await expect(primary(page), 'Copy SVG before any custom size').toHaveAccessibleName('Copy SVG', { timeout: 20_000 })
      for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} is live before any custom size`).toBeEnabled({ timeout: 20_000 })
      await expect(reason(page), 'no reason before there is something to explain').toHaveText('')

      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')

      await expect(customRadio(page)).toHaveAccessibleName('Custom, 40 pixels')
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await expect(primary(page), 'the Upgrade button is live, not dimmed').toBeEnabled()
      await expect(primary(page)).toHaveAttribute('aria-haspopup', 'dialog')
      for (const [label, button] of Object.entries(dimmable(page))) {
        await expect(button, `${label} is dimmed`).toHaveAttribute('aria-disabled', 'true')
        await expect(button, `${label} stays focusable (aria-disabled, not disabled)`).not.toHaveAttribute('disabled', /.*/)
        await expect(button, `${label} says why`).toHaveAttribute('aria-describedby', 'icust-preview-line')
      }
      await expect(reason(page), 'the reason is the preview line').toHaveText(REASON)
      await expect(reason(page)).toHaveAttribute('role', 'status')
      await expect(reason(page).locator('.icust-mono'), 'only the value is mono').toHaveText('40px')
      await ctx.close()
    })

    test('a click that lands anyway writes nothing to the clipboard, downloads nothing and opens nothing', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      let downloads = 0
      page.on('download', () => { downloads += 1 })
      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')
      for (const [label, button] of Object.entries(dimmable(page))) await expect(button, label).toHaveAttribute('aria-disabled', 'true')
      const dialogs = await page.locator('[role="dialog"]').count()
      // force skips the actionability wait (aria-disabled would hold a plain click forever).
      for (const [, button] of Object.entries(dimmable(page))) await button.click({ force: true, timeout: 2_000 }).catch(() => {})
      expect(await page.evaluate(() => window.__clipboardWrites), 'something was copied at a Pro size').toEqual([])
      expect(downloads, 'a file was downloaded at a Pro size').toBe(0)
      await expect(page.getByRole('button', { name: /Copied!/ }), 'it claimed to copy').toHaveCount(0)
      await expect(page.locator('[role="dialog"]'), 'a click on a dimmed button opened something').toHaveCount(dialogs)
      await ctx.close()
    })

    test('picking a preset again turns everything back on and the preview line says so', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')
      await expect(reason(page)).toHaveText(REASON)

      await page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name: '32 pixels' }).click()
      for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} stays dimmed after returning to a preset`).toBeEnabled()
      await expect(primary(page)).toHaveAccessibleName('Copy SVG')
      await expect(primary(page)).not.toHaveAttribute('aria-haspopup', /.*/)
      await expect(reason(page), 'the reason is gone and the live region says the settings are free again').toHaveText(FREE_AGAIN)

      // And the file is the preset's, not the custom one's.
      await primary(page).click()
      await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length), { timeout: 10_000 }).toBeGreaterThan(0)
      const written = await page.evaluate(() => window.__clipboardWrites.at(-1))
      expect(written).toMatch(/<svg[^>]* width="32" height="32"/)
      await ctx.close()
    })

    test('typing a preset size into Custom turns everything back on too', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await sizeInput(page).fill('48')
      await sizeInput(page).press('Enter')
      await expect(page.locator('.icust-size-custom')).toHaveCount(0)
      for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} stays dimmed at the 48 preset`).toBeEnabled()
      await expect(primary(page)).toHaveAccessibleName('Copy SVG')
      await expect(reason(page)).not.toContainText('Custom sizes are Pro')
      await ctx.close()
    })
  })
}

test('a Pro viewer is never blocked at a custom size, and sees no hint or reason', async ({ browser }) => {
  const { ctx, page } = await openAs(browser, 'pro')
  await expect(page.getByText('Custom size is Pro', { exact: true })).toHaveCount(0)
  await customRadio(page).click()
  await sizeInput(page).fill('40')
  await sizeInput(page).press('Enter')
  await expect(primary(page)).toHaveAccessibleName('Copy SVG')
  for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} is dimmed for Pro`).toBeEnabled()
  await expect(reason(page), 'a Pro viewer is told nothing').toHaveText('')
  await ctx.close()
})
