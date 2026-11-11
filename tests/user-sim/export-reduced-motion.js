// Reduced motion in the Export dialog's Theme step, for the specs that drive it.
//
// Two settings ask for it, and the dialog reads both: the operating system's (prefers-reduced-motion) and the app's own
// (html[data-reduced-motion="true"], written from the saved appearance). Under either, every property change gets a 0.01ms
// transition, and the Theme list has to take keyboard focus all the same.
import { expect } from './base.js'

/** Each way a person turns reduced motion on; `apply` runs before the page loads. */
export const MOTION_SETTINGS = [
  { name: 'the system setting', apply: (page) => page.emulateMedia({ reducedMotion: 'reduce' }) },
  { name: 'the app’s setting', apply: (page) => page.addInitScript(() => localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: true }))) },
]

/** The widths the Theme list is checked at: a popover on a wide window, a sheet on a phone. */
export const MOTION_WIDTHS = [
  { name: 'wide', size: { width: 1440, height: 900 } },
  { name: 'phone', size: { width: 390, height: 844 } },
]

/** What the page is doing about motion: the attribute the app's CSS reads, and the system query. */
export const motionState = (page) => page.evaluate(() => ({
  attribute: document.documentElement.getAttribute('data-reduced-motion'),
  system: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}))

/**
 * Choose a theme from the keyboard, starting on Change with the dialog on the free account's default theme (Standards):
 * Enter opens the list and it has focus, ArrowDown moves to the next theme, Enter chooses it and focus goes back to Change.
 */
export async function chooseThemeWithKeys(page, panel) {
  const change = panel.getByRole('button', { name: /^Change theme, current / })
  const list = page.getByRole('listbox', { name: 'Theme' })
  const active = () => list.evaluate((el) => document.getElementById(el.getAttribute('aria-activedescendant'))?.querySelector('.xd-theme-opt-n')?.textContent)

  await change.focus()
  await expect(change).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(list).toBeVisible()
  await expect(list, 'the open list has keyboard focus').toBeFocused()
  expect(await active(), 'it opens on the chosen theme').toBe('Standards')

  await page.keyboard.press('ArrowDown')
  expect(await active(), 'ArrowDown moves to the next theme').toBe('Catalogue')

  await page.keyboard.press('Enter')
  await expect(list, 'Enter chooses and closes the list').toHaveCount(0)
  await expect(panel.locator('.xd-theme-name > span:first-child')).toHaveText('Catalogue')
  await expect(change, 'focus goes back to Change').toBeFocused()
}
