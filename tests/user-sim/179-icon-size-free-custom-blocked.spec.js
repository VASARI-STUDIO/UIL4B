// A FREE CUSTOM SIZE CAN BE PREVIEWED, BUT NOT TAKEN AWAY.
//
// Typing in the Custom field and picking Custom are never blocked, for anyone. But the file at a
// size outside the five presets is Pro. A free or signed-out viewer who commits 40 sees the icon
// at 40 and the reason in a status line, while Copy SVG, the code's Copy, Download SVG and Save to
// project are all off. Picking a preset again turns them back on, and the clipboard has been written
// by nothing in between. (This slice does not merge alone: the Pro preview slice swaps these
// disabled buttons for the Upgrade button. Until then, off is the honest state.)
//
// HOW TO SEE EACH FAIL (src/utils/iconSize.js, src/pages/IconLibrary.jsx):
//   isProSetting always returns false                     -> every test here: the buttons stay on
//   drop `|| exportBlocked` from the Copy SVG `disabled`  -> "a committed 40 turns off ..." (names Copy SVG)
//   drop it from the code box / Download / Save           -> the same test, naming that button
//   (the guards inside handleCopySvg and friends are a second line behind `disabled`; a disabled
//   button never fires click, so no spec can reach them without calling the handler directly)
//   drop the `.icust-size-block` status line              -> "the reason is a status line"
//   src restored byte for byte                            -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'someone without Pro trying a custom icon size'
const REASON = 'Custom sizes are Pro. Preview 40px here; copy, download and save need Pro.'

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

const actions = (page) => ({
  'Copy SVG': page.getByRole('button', { name: 'Copy SVG', exact: true }),
  'the code Copy': page.locator('.icust-code-box'),
  'Download SVG': page.getByRole('button', { name: 'Download SVG', exact: true }),
  'Save to project': page.getByRole('button', { name: 'Save to project', exact: true }),
})
const reason = (page) => page.getByRole('status').filter({ hasText: 'Custom sizes are Pro' })
const customRadio = (page) => page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name: /^Custom size/ })
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

    test('a committed 40 turns off Copy SVG, the code Copy, Download and Save, and says why', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      for (const [label, button] of Object.entries(actions(page))) await expect(button, `${label} is off before any custom size`).toBeEnabled({ timeout: 20_000 })
      await expect(reason(page), 'no reason before there is something to explain').toHaveCount(0)

      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')

      await expect(customRadio(page)).toHaveAccessibleName('Custom size, 40 pixels')
      for (const [label, button] of Object.entries(actions(page))) await expect(button, `${label} is on for a free custom size`).toBeDisabled()
      await expect(reason(page), 'the reason is a status line').toHaveText(REASON)
      await ctx.close()
    })

    test('a click that lands anyway writes nothing to the clipboard and downloads nothing', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      let downloads = 0
      page.on('download', () => { downloads += 1 })
      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')
      for (const [, button] of Object.entries(actions(page))) await expect(button).toBeDisabled()
      // force skips the actionability wait, so these reach the handlers if the buttons are only styled off.
      for (const [, button] of Object.entries(actions(page))) await button.click({ force: true, timeout: 2_000 }).catch(() => {})
      expect(await page.evaluate(() => window.__clipboardWrites), 'something was copied at a Pro size').toEqual([])
      expect(downloads, 'a file was downloaded at a Pro size').toBe(0)
      await expect(page.getByRole('button', { name: /Copied!/ }), 'it claimed to copy').toHaveCount(0)
      await ctx.close()
    })

    test('picking a preset again turns everything back on and clears the reason', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await customRadio(page).click()
      await sizeInput(page).fill('40')
      await sizeInput(page).press('Enter')
      await expect(reason(page)).toHaveText(REASON)

      await page.getByRole('radiogroup', { name: 'Export size' }).getByRole('radio', { name: '32 pixels' }).click()
      for (const [label, button] of Object.entries(actions(page))) await expect(button, `${label} stays off after returning to a preset`).toBeEnabled()
      await expect(reason(page)).toHaveCount(0)

      // And the file is the preset's, not the custom one's.
      await actions(page)['Copy SVG'].click()
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
      await expect(actions(page)['Copy SVG']).toBeDisabled()
      await sizeInput(page).fill('48')
      await sizeInput(page).press('Enter')
      await expect(page.locator('.icust-size-custom')).toHaveCount(0)
      for (const [label, button] of Object.entries(actions(page))) await expect(button, `${label} is off at the 48 preset`).toBeEnabled()
      await expect(reason(page)).toHaveCount(0)
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
  for (const [label, button] of Object.entries(actions(page))) await expect(button, `${label} is off for Pro`).toBeEnabled()
  await expect(reason(page)).toHaveCount(0)
  await ctx.close()
})
