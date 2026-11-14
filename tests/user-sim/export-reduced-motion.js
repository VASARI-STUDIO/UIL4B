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

/** The widths the Theme list is checked at: it is the same inline list on a wide window and on a phone. */
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
 * Choose a theme from the keyboard, with the dialog on the free account's default theme (Standards, the first row of the Free
 * group): focus the chosen row, ArrowDown chooses the next row (the first of the In Pro group, Presentation) and takes focus.
 */
export async function chooseThemeWithKeys(page, panel) {
  const group = panel.getByRole('radiogroup', { name: 'Theme' })
  const chosen = group.getByRole('radio', { checked: true })

  // On a phone the list is folded under a "Theme: <name> · <brand>" row; open it, as a person would, before choosing.
  if (!(await group.isVisible())) await panel.getByRole('button', { name: /^Theme:/ }).click()
  await expect(chosen, 'a free account starts on Standards').toHaveText(/^Standards/)
  await chosen.focus()
  await expect(chosen).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(chosen, 'ArrowDown chooses the next theme').toHaveText(/^Presentation/)
  await expect(chosen, 'focus goes with the choice').toBeFocused()
}
