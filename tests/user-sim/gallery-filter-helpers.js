// Shared plumbing for the gallery specs that filter the libraries and read the
// gate. Numbers come from the data and the tier constants, never from a typed
// count, so a change to the cap or the library changes the arithmetic here and
// not a literal.
import { expect } from './base.js'
import { LIBRARY_GRADIENT_ROWS } from '../../src/data/gradientLibrary.js'
import { LIBRARY_PALETTE_ROWS } from '../../src/data/paletteLibrary.js'
import { MOOD_LABELS } from '../../src/utils/paletteMood.js'

/** Do the Pro stubs carry the facets a locked filter needs? False until the stub fields land. */
export const gradientStubsCarryType = LIBRARY_GRADIENT_ROWS.some((r) => !Array.isArray(r.stops) && r.type)
export const paletteStubsCarryMoods = LIBRARY_PALETTE_ROWS.some((r) => !Array.isArray(r.colors) && Array.isArray(r.moods))

/** The login dialog, by its title. */
export const loginDialog = (page) => page.getByRole('dialog').filter({ has: page.locator('#ui-login-title') })

/**
 * Choose one option of the gradient Type filter, wherever the toolbar keeps it:
 * a visible group on a wide screen, the Filters sheet on a phone.
 */
export async function pickGradientType(page, label) {
  const group = page.getByRole('group', { name: 'Filter by gradient type' })
  if (await group.isVisible().catch(() => false)) {
    await group.getByRole('button', { name: label, exact: true }).click()
    return
  }
  await page.locator('.lbry-filtersbtn').click()
  const sheet = page.getByRole('dialog', { name: 'Mood' })
  await sheet.getByRole('button', { name: label, exact: true }).click()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toHaveCount(0)
}

/** Choose a palette mood by its label, wherever the toolbar keeps it. */
export async function pickPaletteMood(page, moodId) {
  const label = MOOD_LABELS[moodId]
  const trigger = page.locator('.lbry-filtertrig')
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click()
    await page.getByRole('group', { name: 'Filter palettes by mood' }).getByRole('button', { name: label, exact: true }).click()
    return
  }
  await page.locator('.lbry-filtersbtn').click()
  const sheet = page.getByRole('dialog', { name: 'Mood' })
  await sheet.getByRole('button', { name: label, exact: true }).click()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toHaveCount(0)
}

/** Every `rgb()` / `rgba()` colour in a computed style string, as upper-case #RRGGBB. */
export function hexesIn(css) {
  const out = []
  for (const m of String(css).matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) {
    out.push(`#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase())
  }
  return out
}
