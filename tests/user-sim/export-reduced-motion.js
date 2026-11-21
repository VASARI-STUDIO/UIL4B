// Reduced motion in the Export dialog's templates grid, for the specs that drive it.
//
// Two settings ask for it, and the dialog reads both: the operating system's (prefers-reduced-motion) and the app's own
// (html[data-reduced-motion="true"], written from the saved appearance). Under either, every property change gets a 0.01ms
// transition, and the templates grid has to take keyboard focus all the same.
import { expect } from './base.js'
import { openTemplates, expectTemplate } from './export-rows.js'

/** Each way a person turns reduced motion on; `apply` runs before the page loads. */
export const MOTION_SETTINGS = [
  { name: 'the system setting', apply: (page) => page.emulateMedia({ reducedMotion: 'reduce' }) },
  { name: 'the app’s setting', apply: (page) => page.addInitScript(() => localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: true }))) },
]

/** The widths the templates grid is checked at: the same grid on a wide window and on a phone. */
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
 * Choose a template from the keyboard, with the dialog on the free account's default template (Standards, the first card of the
 * grid): open "View templates", focus the chosen card, Tab reaches the next card (the first of the Pro ones, Presentation), and
 * Enter chooses it and goes back to the preview.
 */
export async function chooseThemeWithKeys(page, panel) {
  const grid = await openTemplates(panel)
  const chosen = grid.locator('.xd-tpl-card[aria-pressed="true"]')
  await expect(chosen, 'a free account starts on Standards').toContainText('Standards')
  await chosen.focus()
  await expect(chosen).toBeFocused()

  await page.keyboard.press('Tab')
  const next = grid.locator('.xd-tpl-card').nth(1)
  await expect(next, 'Tab takes focus to the next card').toBeFocused()
  await expect(next).toContainText('Presentation')
  await expect(chosen, 'focus alone chooses nothing').toContainText('Standards')

  await page.keyboard.press('Enter')
  await expect(grid, 'choosing returns to the preview').toHaveCount(0)
  await expect(panel, 'the dialog stays open').toBeVisible()
  await expectTemplate(panel, 'Presentation')
}
