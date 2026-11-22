// Reaching the Flags icons through the category control: Coloured, then Flags on the Coloured type bar.
import { expect } from './base.js'

/**
 * Press Coloured, then Flags, from whichever layout the toolbar is in (inline tray, "Category" menu,
 * or the Filters panel), then close any panel it opened. Each step only clicks a control that is not
 * already pressed, so a retry never toggles Flags back off.
 */
export async function chooseFlags(page) {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const category = page.getByRole('group', { name: 'Icon category' }).first()
  const trigger = page.locator('.lbry-filtertrig', { hasText: 'Category' }).first()
  const flags = page.getByRole('group', { name: 'Coloured icon type' }).getByRole('button', { name: 'Flags', exact: true })
  const isOn = async (loc) => (await loc.isVisible()) && (await loc.getAttribute('aria-pressed')) === 'true'
  const expanded = async (loc) => (await loc.isVisible()) && (await loc.getAttribute('aria-expanded')) === 'true'

  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20_000 })
  await expect(async () => {
    if (!await category.isVisible() && await filters.isVisible() && !await expanded(filters)) await filters.click({ timeout: 2000 })
    if (!await category.isVisible() && await trigger.isVisible()) await trigger.click({ timeout: 2000 })
    const coloured = category.getByRole('button', { name: /^Coloured/ })
    if (!await isOn(coloured) && !await isOn(flags)) await coloured.click({ timeout: 2000 })
    await expect(flags).toBeVisible({ timeout: 2000 })
    if (!await isOn(flags)) await flags.click({ timeout: 2000 })
    await expect(flags).toHaveAttribute('aria-pressed', 'true', { timeout: 2000 })
  }, { message: 'Flags chosen through Coloured from whichever layout the toolbar settled on' }).toPass({ timeout: 25_000 })

  await expect(async () => {
    if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 2000 })
    else if (await expanded(filters)) await filters.click({ timeout: 2000 })
    expect(await sheet.isVisible() || await expanded(filters), 'the Filters panel is closed again').toBe(false)
  }).toPass({ timeout: 10_000 })
}
