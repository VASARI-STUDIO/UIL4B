// THE HOMEPAGE HERO STRIP'S BARS FIT THE STRIP, IN A REAL BROWSER.
//
// The hero strip has 2px of side padding. Its bars are sized from the strip's
// width, and that width must be the CONTENT width: measured with the padding
// in, the 21 whole-pixel bars come out up to 4px wider than the room they sit
// in and the last bar pokes out past the strip's inner right edge. This checks,
// at phone, tablet and desktop widths in both themes, that the last bar ends at
// or inside the content box, that the first bar starts at or inside its left
// edge, and that the page never scrolls sideways.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// The five standard widths, plus the worst case near each: the bars take
// 21 whole pixels each plus 40px of gaps, so a strip 40 + 21k px wide leaves
// no spare pixel and the old padded measure pushed the last bar out by 4px.
// None of the five standard widths happens to land there.
const WIDTHS = [320, 334, 376, 390, 754, 768, 1006, 1024, 1426, 1440]
const THEMES = ['light', 'dark']

/** Where the bars sit against the strip's content box, in CSS pixels. */
const measure = (page) => page.evaluate(() => {
  const strip = document.querySelector('.sp-ramp--hero > .sp-ramp-bars')
  const bars = [...strip.querySelectorAll('.sp-ramp-bar')]
  const box = strip.getBoundingClientRect()
  const cs = getComputedStyle(strip)
  const inner = {
    left: box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
    right: box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
  }
  const first = bars[0].getBoundingClientRect()
  const last = bars[bars.length - 1].getBoundingClientRect()
  const root = document.documentElement
  return {
    count: bars.length,
    sized: strip.parentElement.style.getPropertyValue('--sp-bar-w'),
    leftOverflow: inner.left - first.left,
    rightOverflow: last.right - inner.right,
    pageOverflow: root.scrollWidth - root.clientWidth,
  }
})

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test(`hero strip bars fit its content box at ${width}px, ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      watch(page, 'a visitor on the homepage')
      try {
        await go(page, '/')
        const strip = page.locator('.sp-ramp--hero > .sp-ramp-bars')
        await expect(strip).toBeVisible()
        // The whole-pixel width is written once the strip has been measured.
        await expect.poll(() => page.locator('.sp-ramp--hero').evaluate((el) => el.style.getPropertyValue('--sp-bar-w'))).not.toBe('')

        const m = await measure(page)
        expect(m.count).toBe(21)
        // Sub-pixel slack only: layout rounds to 1/64px.
        expect(m.rightOverflow, 'last bar past the content box right edge').toBeLessThanOrEqual(0.05)
        expect(m.leftOverflow, 'first bar past the content box left edge').toBeLessThanOrEqual(0.05)
        expect(m.pageOverflow, 'page scrolls sideways').toBeLessThanOrEqual(0)
      } finally {
        await ctx.close()
      }
    })
  }
}
