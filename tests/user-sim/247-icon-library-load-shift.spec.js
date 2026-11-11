// The Icon Library's footer must not jump while the library chunk loads.
//
// The tab fallback (`.lib-loading`) shows while the IconLibrary chunk is on
// the wire. If it is shorter than the first screen, the footer paints in view
// and is then pushed off it by the skeleton grid. The observer is registered
// before navigation so it sees shifts from the very first paint, and every
// entry counts (a touch context marks entries hadRecentInput with no input).
//
// MUTATION: drop `lib-loading--route` from the fallback in IconEmojiLibrary.jsx
//   -> the footer is in view during the fallback and CLS is over 0.1 at 390.
// MUTATION: set `.lib-loading--route{min-height:280px}` -> same failures.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const SIZES = [
  { name: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: '768', viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: false },
]

for (const size of SIZES) {
  test.describe(`icon library load at ${size.name}`, () => {
    test.use({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: size.hasTouch })

    test('the footer stays below the fold during the fallback and nothing shifts', async ({ page }) => {
      await page.addInitScript(() => {
        window.__cls = 0
        window.__footerSeenInFallback = false
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) window.__cls += entry.value
        }).observe({ type: 'layout-shift', buffered: true })
        // Sample every frame while the tab fallback is mounted.
        const tick = () => {
          const fallback = document.querySelector('.lib-loading')
          const footer = document.querySelector('footer')
          if (fallback && footer && footer.getBoundingClientRect().top < window.innerHeight) {
            window.__footerSeenInFallback = true
          }
          if (!document.querySelector('.ig .ic, .ig-skel')) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })

      // Hold the library chunk so the fallback is on screen long enough to measure.
      let release
      const held = new Promise(resolve => { release = resolve })
      await page.route(/\/assets\/IconLibrary-[^/]+\.js$/, async route => {
        await held
        await route.continue()
      })

      await go(page, '/create/icons')
      await expect(page.locator('.lib-loading')).toBeVisible()
      release()
      await expect(page.locator('.ig-skel, .ig .ic').first()).toBeVisible()
      await page.waitForTimeout(400)

      const { cls, footerSeen } = await page.evaluate(() => ({
        cls: window.__cls,
        footerSeen: window.__footerSeenInFallback,
      }))
      expect(footerSeen, 'the footer is never in view while the library loads').toBe(false)
      expect(cls, 'layout shift while the library loads').toBeLessThan(0.1)
    })
  })
}
