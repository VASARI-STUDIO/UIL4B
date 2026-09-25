// Palette Builder controls, by what a person sees on the page.
//
// The seed is a chip on the toolbar: a swatch and the hex, which opens the
// colour picker. Reading the seed reads the chip; setting it goes through the
// picker's "Colour value" field, the same way a person types one in.
import { expect } from './base.js'

export const seedChip = (page) => page.locator('.plb .plb-seedchip')

/** The seed hex as the chip shows it, e.g. "#3A7BD5". */
export const readSeed = async (page) => (await page.locator('.plb .plb-seedchip-hex').textContent()).trim()

/** Type a hex into the seed picker and apply it with Enter; the picker closes. */
export async function setSeed(page, hex) {
  await seedChip(page).click()
  const dialog = page.getByRole('dialog', { name: 'Pick seed colour' })
  await expect(dialog).toBeVisible()
  const field = dialog.getByRole('textbox', { name: 'Colour value' })
  await field.fill(hex)
  await field.press('Enter')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
}

/** The palette's toolbar (the shared ToolToolbar, inside the palette root). */
export const paletteToolbar = (page) => page.locator('.plb [data-tool-toolbar]')

/** Open the "Tools" overflow and return its panel (popover or phone sheet). */
export async function openPaletteTools(page) {
  const bar = paletteToolbar(page)
  await expect(bar).not.toHaveClass(/is-measuring/)
  await bar.getByRole('button', { name: 'Tools' }).click()
  const panel = page.getByRole('dialog', { name: 'Tools' })
  await expect(panel).toBeVisible()
  return panel
}

const startsWith = (label) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)

/**
 * Run an action that may be on the toolbar row or, when the row is too narrow
 * for it, in the "Tools" overflow. `inlineName` is the button's accessible
 * name on the row; `menuLabel` the row it becomes in the overflow.
 */
export async function clickPaletteAction(page, inlineName, menuLabel = inlineName) {
  const bar = paletteToolbar(page)
  await expect(bar).not.toHaveClass(/is-measuring/)
  const inline = bar.getByRole('button', { name: inlineName, exact: true })
  if (await inline.count() && await inline.first().isVisible()) {
    await inline.first().click()
    return
  }
  const panel = await openPaletteTools(page)
  await panel.getByRole('button', { name: startsWith(menuLabel) }).click()
}
