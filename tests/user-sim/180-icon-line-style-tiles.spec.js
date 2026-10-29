// THE LINE STYLE IS THREE TILES, AND A PRO ONE CAN BE PREVIEWED BUT NOT TAKEN AWAY.
//
// Round, Sharp and Crisp are a radiogroup of tiles, each drawing the icon being edited in its own
// ends and corners. Arrow keys steer through them. "Set ends and corners separately" opens two rows
// of words; a mix no tile draws leaves every tile unselected and keeps the rows open. For a free or
// signed-out viewer, pressing Sharp or Crisp opens no dialog and changes the stage, but Copy SVG becomes
// Upgrade to Pro, the code Copy, Download SVG and Save to project dim (aria-disabled) with a reason, and nothing
// reaches the clipboard. Pro viewers see no hint and export the style. (The swap itself is covered in
// 181-icon-pro-preview-swap.spec.js.)
//
// HOW TO SEE EACH FAIL (src/utils/iconLineStyle.js, src/utils/iconSize.js, src/pages/IconLibrary.jsx):
//   isProLineStyle always returns false            -> "pressing Sharp ... turns off" and "a mix no tile draws"
//   isProSetting ignores cap and join              -> the same two: the buttons stay on
//   drop `onKeyDown={steerRadios}` from the tiles  -> "arrow keys steer through the tiles"
//   the preview line stops saying the style's name   -> "pressing Sharp ..." (the reason)
//   LINE_STYLES crisp gets join 'miter'            -> "each tile draws its own style"
//   `hidden={!splitShown}` becomes `hidden={!splitOpen}` -> "a mix no tile draws keeps the rows open"
//   the Pro hint shows for Pro viewers             -> "a Pro viewer sees no hint"
//   src restored byte for byte                     -> all of them pass again.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PERSONA = 'someone choosing a line style for an icon'
const SHARP_REASON = 'Sharp is a Pro line style. Preview it here; saving and export need Pro.'
const MIX_REASON = 'Custom ends and corners are Pro. Preview them here; saving and export need Pro.'

/** Open the customiser as a signed-in free viewer, a signed-out one, or Pro. */
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
  await expect(page.locator('.icust-line-tile svg').first()).toBeVisible({ timeout: 20_000 })
  return { ctx, page }
}

const group = (page) => page.getByRole('radiogroup', { name: 'Line style' })
const tile = (page, name) => group(page).getByRole('radio', { name: new RegExp(`^${name}`) })
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
const stageCap = (page) => page.locator('.icust-stage').evaluate((el) => el.style.getPropertyValue('--ig-cap'))
const toggle = (page) => page.getByRole('button', { name: 'Set ends and corners separately' })

test('three tiles, Round selected, and each draws its own ends and corners at 56px', async ({ browser }) => {
  const { ctx, page } = await openAs(browser, null)
  await expect(group(page).getByRole('radio')).toHaveCount(3)
  await expect(tile(page, 'Round')).toHaveAttribute('aria-checked', 'true')
  await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'false')
  await expect(tile(page, 'Crisp')).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.icust-seg--icon'), 'the old icon-only rows are gone').toHaveCount(0)

  const drawn = async (id) => page.locator(`.icust-line-tile[data-style="${id}"] svg`).first().evaluate((svg) => {
    const box = svg.getBoundingClientRect()
    return { cap: svg.getAttribute('stroke-linecap'), join: svg.getAttribute('stroke-linejoin'), w: Math.round(box.width), h: Math.round(box.height) }
  })
  expect(await drawn('round')).toEqual({ cap: 'round', join: 'round', w: 56, h: 56 })
  expect(await drawn('sharp')).toEqual({ cap: 'square', join: 'miter', w: 56, h: 56 })
  expect(await drawn('crisp')).toEqual({ cap: 'butt', join: 'bevel', w: 56, h: 56 })
  await ctx.close()
})

for (const [who, plan] of [['a signed-in free viewer', 'free'], ['a signed-out viewer', null]]) {
  test.describe(who, () => {
    test('is told which styles are Pro, in words', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await expect(page.getByText('Sharp and Crisp are Pro', { exact: true })).toBeVisible()
      await expect(tile(page, 'Sharp')).toHaveAccessibleName('Sharp, Pro')
      await expect(tile(page, 'Round')).toHaveAccessibleName('Round')
      await ctx.close()
    })

    test('pressing Sharp previews it, opens no dialog, swaps Copy SVG for Upgrade to Pro and dims the rest, with a reason', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await expect(primary(page)).toHaveAccessibleName('Copy SVG', { timeout: 20_000 })
      for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} is on before any Pro style`).toBeEnabled({ timeout: 20_000 })
      await expect(reason(page), 'no reason before there is something to explain').toHaveText('')
      const dialogs = await page.locator('[role="dialog"]').count()

      await tile(page, 'Sharp').click()
      await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
      expect(await stageCap(page), 'the stage shows square ends').toBe('square')
      await expect(page.locator('[role="dialog"]'), 'a dialog opened').toHaveCount(dialogs)
      await expect(reason(page)).toHaveText(SHARP_REASON)
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      for (const [label, button] of Object.entries(dimmable(page))) {
        await expect(button, `${label} is dimmed at a Pro style`).toHaveAttribute('aria-disabled', 'true')
        await expect(button, `${label} stays focusable (aria-disabled, not disabled)`).not.toHaveAttribute('disabled', /.*/)
      }

      // force skips the actionability wait, so these reach the handlers if the buttons are only styled off.
      for (const [, button] of Object.entries(dimmable(page))) await button.click({ force: true, timeout: 2_000 }).catch(() => {})
      expect(await page.evaluate(() => window.__clipboardWrites), 'something was copied at a Pro style').toEqual([])
      await expect(page.locator('[role="dialog"]'), 'a click on a dimmed button opened something').toHaveCount(dialogs)
      await ctx.close()
    })

    test('going back to Round turns everything back on and the preview line says so', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await tile(page, 'Crisp').click()
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      await tile(page, 'Round').click()
      for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} stays dimmed after Round`).toBeEnabled()
      await expect(primary(page)).toHaveAccessibleName('Copy SVG')
      await expect(reason(page)).toHaveText('Back to free settings. Copy, download and save are on.')
      await primary(page).click()
      await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length), { timeout: 10_000 }).toBeGreaterThan(0)
      const written = await page.evaluate(() => window.__clipboardWrites.at(-1))
      expect(written).toMatch(/stroke-linecap="round"/)
      expect(written).not.toMatch(/stroke-linecap="(square|butt)"/)
      await ctx.close()
    })

    test('a mix no tile draws leaves every tile unselected, keeps the rows open, and is Pro', async ({ browser }) => {
      const { ctx, page } = await openAs(browser, plan)
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(page.locator('#icust-line-split')).toBeHidden()
      await toggle(page).click()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')

      await page.getByRole('radiogroup', { name: 'Ends' }).getByRole('radio', { name: 'Square' }).click()
      for (const name of ['Round', 'Sharp', 'Crisp']) await expect(tile(page, name), `${name} is selected at a mix`).toHaveAttribute('aria-checked', 'false')
      await expect(reason(page)).toHaveText(MIX_REASON)
      await expect(primary(page)).toHaveAccessibleName('Upgrade to Pro')
      // The toggle is aria-disabled while the rows must stay open, so the actionability wait would never end: force the press.
      await toggle(page).click({ force: true })
      await expect(toggle(page), 'the rows closed while the pair matches no tile').toHaveAttribute('aria-expanded', 'true')

      // Completing the pair lands on a tile, and the rows stay put under the pointer.
      await page.getByRole('radiogroup', { name: 'Corners' }).getByRole('radio', { name: 'Mitre' }).click()
      await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')
      await ctx.close()
    })
  })
}

test('arrow keys steer through the tiles, and focus stays in the group', async ({ browser }) => {
  const { ctx, page } = await openAs(browser, null)
  await tile(page, 'Round').focus()
  await page.keyboard.press('ArrowRight')
  await expect(tile(page, 'Sharp')).toBeFocused()
  await expect(tile(page, 'Sharp')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(tile(page, 'Crisp')).toBeFocused()
  await expect(tile(page, 'Crisp')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(tile(page, 'Round')).toBeFocused()
  await expect(tile(page, 'Round')).toHaveAttribute('aria-checked', 'true')
  expect(await stageCap(page)).toBe('round')
  await ctx.close()
})

test('a Pro viewer sees no hint, no reason, and exports the style', async ({ browser }) => {
  const { ctx, page } = await openAs(browser, 'pro')
  await expect(page.getByText('Sharp and Crisp are Pro', { exact: true }), 'a Pro viewer sees no hint').toHaveCount(0)
  await expect(page.locator('.icust-line-pro')).toHaveCount(0)
  await expect(tile(page, 'Sharp')).toHaveAccessibleName('Sharp')
  await tile(page, 'Sharp').click()
  await expect(reason(page), 'a Pro viewer is told nothing').toHaveText('')
  await expect(primary(page)).toHaveAccessibleName('Copy SVG')
  for (const [label, button] of Object.entries(dimmable(page))) await expect(button, `${label} is dimmed for Pro`).toBeEnabled()
  await primary(page).click()
  await expect.poll(() => page.evaluate(() => window.__clipboardWrites.length), { timeout: 10_000 }).toBeGreaterThan(0)
  const written = await page.evaluate(() => window.__clipboardWrites.at(-1))
  expect(written).toMatch(/stroke-linecap="square"/)
  expect(written).toMatch(/stroke-linejoin="miter"/)
  await ctx.close()
})
