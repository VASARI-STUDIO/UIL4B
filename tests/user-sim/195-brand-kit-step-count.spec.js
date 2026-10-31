// The walkthrough bar says where the person is, at every width.
//
//   · The count reads "Step N of 4" on each of the four tools, at 390, 768 and
//     1440px. It is a position, not a tally: nothing about it depends on what
//     has been built.
//   · It is drawn (not visually hidden) and at least 13px.
//   · The bar keeps one height, one x and one width across all four steps, and
//     the count keeps its own x and width, so Next never makes anything jump.
//   · Below 1056px the count sits in a band above the steps and does not touch
//     them.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const GUIDE_KEY = 'vs-uikit-guide'
const SEEN_KEY = 'vs-uikit-guide-seen'

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })

const STEPS = [
  { route: '/create/palette', n: 1 },
  { route: '/create/font-pair', n: 2 },
  { route: '/create/type-scale', n: 3 },
  { route: '/create/icons', n: 4 },
]

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 },
]

/** The bar and its count, measured in one go from the DOM. */
const measure = (page) => rail(page).evaluate((bar) => {
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x * 10) / 10, width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10, top: r.top, bottom: r.bottom }
  }
  const count = bar.querySelector('.bkit-rail-count')
  const cs = getComputedStyle(count)
  const firstStep = bar.querySelector('.bkit-step')
  return {
    bar: box(bar),
    count: box(count),
    text: count.textContent,
    fontSize: parseFloat(cs.fontSize),
    shown: cs.display !== 'none' && cs.visibility !== 'hidden' && box(count).width > 1,
    clipped: count.scrollWidth > count.clientWidth,
    stepTop: box(firstStep).top,
    stepLeft: box(firstStep).x,
    barBottomOverflow: bar.scrollWidth > bar.clientWidth,
  }
})

test.describe('Brand kit walkthrough: the step count', () => {
  for (const { width, height } of WIDTHS) {
    test(`${width}px: "Step N of 4" on every step, and the bar does not move between them`, async ({ page }) => {
      watch(page, 'designer stepping through the brand kit')
      await page.setViewportSize({ width, height })
      await page.addInitScript(([g, s]) => {
        try { localStorage.setItem(g, '1'); localStorage.setItem(s, '1') } catch { /* private mode */ }
      }, [GUIDE_KEY, SEEN_KEY])

      const seen = []
      for (const { route, n } of STEPS) {
        await go(page, route)
        await expect(rail(page)).toBeVisible()
        await expect(rail(page)).toContainText(`Step ${n} of 4`)
        // Polled: the rail remounts as each tool arrives and a node caught
        // mid-mount measures zero.
        await expect.poll(async () => (await measure(page)).shown, { message: `step ${n}: the count is not drawn` }).toBe(true)
        const m = await measure(page)
        expect(m.text, `step ${n}`).toBe(`Step ${n} of 4`)
        expect(m.fontSize, `step ${n}: the count is under the 13px floor`).toBeGreaterThanOrEqual(13)
        expect(m.clipped, `step ${n}: the count is clipped`).toBe(false)
        expect(m.barBottomOverflow, `step ${n}: the bar overflows sideways`).toBe(false)
        if (width < 1056) {
          expect(m.count.bottom, `step ${n}: the count runs into the steps`).toBeLessThanOrEqual(m.stepTop)
        }
        seen.push(m)
      }

      // One height, one x, one width for the bar, and the same for the count.
      for (const m of seen.slice(1)) {
        expect(m.bar.height, 'bar height changed between steps').toBe(seen[0].bar.height)
        expect(m.bar.x, 'bar x changed between steps').toBe(seen[0].bar.x)
        expect(m.bar.width, 'bar width changed between steps').toBe(seen[0].bar.width)
        expect(m.count.x, 'count x changed between steps').toBe(seen[0].count.x)
        expect(m.count.width, 'count width changed between steps').toBe(seen[0].count.width)
        expect(m.stepLeft, 'first step moved between steps').toBe(seen[0].stepLeft)
      }

      await page.screenshot({ path: test.info().outputPath(`brand-kit-count-${width}.png`), fullPage: false })
    })
  }
})
