// EVERY DISCOVER CARD THAT IS ON SCREEN AT LOAD IS VISIBLE WITHOUT SCROLLING.
//
// The cards fade in through useReveal's IntersectionObserver, which trims 8% off
// the bottom of the viewport and wants 15% of a card inside what is left. A card
// straddling the fold on load (the last one at 1440x900, the third on a phone)
// was on screen and still at opacity 0 until the visitor scrolled. The hook now
// shows whatever is already on screen when the page mounts.
//
// The sizes are the ones where a card straddles the fold today; the 1100 high
// window is the card's own "fits entirely" case and is here as the control.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Deleting the on-screen pass in src/hooks/useReveal.js (observing every node
// again) fails the 1440x900 and 390x844 cases with a card in view at opacity 0.
import { test, expect } from './base.js'
import { goRaw, watch } from './helpers.js'

const SIZES = [
  { width: 1440, height: 900 },
  { width: 1440, height: 1100 },
  { width: 390, height: 844 },
]

/** Cards whose box is at least partly on screen but which are not fully opaque. */
function hiddenInView(page) {
  return page.evaluate(() => [...document.querySelectorAll('.surface-card')]
    .filter((card) => {
      const { top, bottom } = card.getBoundingClientRect()
      return top < innerHeight && bottom > 0 && Number(getComputedStyle(card).opacity) < 1
    })
    .map((card) => card.querySelector('.surface-card-title')?.textContent || 'card'))
}

for (const motion of ['no-preference', 'reduce']) {
  for (const { width, height } of SIZES) {
    test(`every card in view shows within a second at ${width}x${height}, motion ${motion}`, async ({ page }) => {
      watch(page, 'a visitor opening Discover')
      await page.emulateMedia({ reducedMotion: motion })
      await page.setViewportSize({ width, height })
      await goRaw(page, '/discover')
      await expect(page.locator('.surface-card').first()).toBeAttached()

      // Without a scroll, a wheel or a touch.
      await expect.poll(() => hiddenInView(page), {
        message: 'a card that is on screen is still invisible',
        timeout: 1000,
      }).toEqual([])
      expect(await page.locator('.surface-card').count()).toBeGreaterThan(3)
    })
  }
}
