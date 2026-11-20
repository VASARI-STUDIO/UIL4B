// The marketing bar's way back after it hides on a scroll down.
//   · it does not return for a small upward move (a wobble, a trackpad tail)
//   · a clear upward scroll brings it back, after a short beat (200ms), not at once
//   · any downward move during that beat, even one pixel, cancels the return
//   · focus in the bar and an open menu keep it on screen (held in 96-spectrum-nav
//     and 434-spectrum-mega-menu); this file only holds the scroll arithmetic
//
// MUTATIONS (each should turn the named test red):
//   · SpectrumNav.jsx: RETURN_DISTANCE to 1                 -> "a small upward move"
//   · SpectrumNav.jsx: RETURN_DELAY to 0                    -> "not at once"
//   · SpectrumNav.jsx: drop the `dy > 0` cancel branch      -> "a downward pixel"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const DOWN_TO = 1400

async function hiddenBar(page) {
  await go(page, '/')
  const nav = page.locator('.spnav')
  await expect(nav).toHaveCount(1)
  await page.evaluate((y) => window.scrollTo(0, y), DOWN_TO)
  await expect(nav).toHaveAttribute('data-nav-hidden', '1')
  return nav
}

/** Scrolls to each y in turn, letting the scroll event land and then waiting `gap` ms before the next. */
const walk = (page, steps) => page.evaluate(async (list) => {
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  for (const [y, gap] of list) {
    window.scrollTo(0, y)
    await frames()
    if (gap) await new Promise((r) => setTimeout(r, gap))
  }
  return document.querySelector('.spnav').dataset.navHidden
}, steps)

test.describe('the marketing bar after it has hidden', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor easing back up the sales page') })

  test('a small upward move does not bring it back', async ({ page }) => {
    const nav = await hiddenBar(page)
    // Five 4px steps up is 20px in all, under the distance a return needs.
    const state = await walk(page, [[1396, 0], [1392, 0], [1388, 0], [1384, 0], [1380, 600]])
    expect(state, 'the bar returned for a 20px wobble').toBe('1')
    await expect(nav).toHaveAttribute('data-nav-hidden', '1')
  })

  test('a clear scroll up brings it back after a beat, not at once', async ({ page }) => {
    const nav = await hiddenBar(page)
    const state = await walk(page, [[DOWN_TO - 200, 40]])
    expect(state, 'the bar came back the moment the page moved up').toBe('1')
    await expect(nav).toHaveAttribute('data-nav-hidden', '0')
  })

  test('a downward pixel during the beat cancels the return', async ({ page }) => {
    const nav = await hiddenBar(page)
    const state = await walk(page, [[DOWN_TO - 200, 60], [DOWN_TO - 199, 600]])
    expect(state, 'the bar returned although the page moved down inside the beat').toBe('1')
    await expect(nav).toHaveAttribute('data-nav-hidden', '1')
    // A fresh, clear scroll up brings it back.
    await walk(page, [[DOWN_TO - 500, 0]])
    await expect(nav).toHaveAttribute('data-nav-hidden', '0')
  })
})
