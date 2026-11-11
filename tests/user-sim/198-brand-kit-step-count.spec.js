// The walkthrough bar says where the person is, at every width.
//
//   · The count reads "Step N of 4" on each of the four tools, at 390, 768 and
//     1440px. It is a position, not a tally: nothing about it depends on what
//     has been built.
//   · On a phone it is drawn inside the steps trigger, and from 1024px in the pill;
//     both at least 13px. On a tablet (768 to 1023px) the four labels need the
//     width, so it is read out and not drawn.
//   · The bar keeps one height (60px below 1024px), one x and one width across
//     all four steps, and the count keeps its own x and width, so Next never
//     makes anything jump.
//   · The card that opens on arrival is one sentence and one button; the four
//     steps are behind "What's this?". On a phone there is no arrival card: the
//     steps panel opens itself, with the four steps and the help line in it.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { kitRail, stepsTrigger, stepsPanel, helpTrigger } from './kit-bar.js'

const GUIDE_KEY = 'vs-uikit-guide'
const SEEN_KEY = 'vs-uikit-guide-seen'

const rail = kitRail

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
const measure = (page) => rail(page).evaluate((bar, phone) => {
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x * 10) / 10, width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10, top: r.top, bottom: r.bottom }
  }
  // A phone keeps the count in its steps trigger; a tablet and a desktop in the bar's lead.
  const count = bar.querySelector(phone ? '.bkit-rail-steps-count' : '.bkit-rail-count')
  const cs = getComputedStyle(count)
  const firstStep = bar.querySelector(phone ? '.bkit-rail-steps' : '.bkit-step')
  return {
    bar: box(bar),
    count: box(count),
    text: count.textContent,
    fontSize: parseFloat(cs.fontSize),
    // The tablet clips the whole lead to a pixel (its count keeps its own width inside it).
    shown: cs.display !== 'none' && cs.visibility !== 'hidden' && box(count).width > 1 && box(count.closest('.bkit-rail-head') || count).width > 1,
    clipped: count.scrollWidth > count.clientWidth,
    stepTop: box(firstStep).top,
    stepLeft: box(firstStep).x,
    barBottomOverflow: bar.scrollWidth > bar.clientWidth,
  }
}, page.viewportSize().width < 768)

// The card that opens on arrival is one sentence and one button. The list of
// all four steps is still there, behind the bar's "What's this?". (A phone's
// panel is the one surface: it opens with the list.)
test.describe('Brand kit walkthrough: the arrival card', () => {
  for (const { width, height } of WIDTHS) {
    test(`${width}px: short on arrival, the four steps behind "What's this?"`, async ({ page }) => {
      watch(page, 'designer arriving at the brand kit for the first time')
      await page.setViewportSize({ width, height })
      await page.addInitScript((g) => {
        try { localStorage.setItem(g, '1') } catch { /* private mode */ }
      }, GUIDE_KEY)

      await go(page, '/create/palette')
      if (width < 768) {
        // The panel opens upward from the bar's steps trigger, with the list in it.
        const panel = stepsPanel(page)
        await expect(panel).toBeVisible()
        await expect(stepsTrigger(page)).toHaveAttribute('aria-expanded', 'true')
        await expect(panel.locator('.bkit-sheet-help')).toHaveText('Pick your brand colour. Fonts, type scale and icons come next, and each one uses what you chose here.')
        await expect(panel.locator('.bkit-card-steps li')).toHaveCount(4)
        await expect(panel.locator('.bkit-card-steps')).toContainText('Type scale')
        await page.screenshot({ path: test.info().outputPath(`brand-kit-arrival-card-${width}.png`), fullPage: false })
        // Pressed again, the trigger closes it.
        await helpTrigger(page).click()
        await expect(panel).toBeHidden()
        await expect(stepsTrigger(page)).toHaveAttribute('aria-expanded', 'false')
        return
      }
      const card = page.getByRole('dialog', { name: 'Step 1 of 4: Colours' })
      await expect(card).toBeVisible()
      await expect(card.locator('.bkit-card-body')).toHaveText('Pick your brand colour. Fonts, type scale and icons come next, and each one uses what you chose here.')
      await expect(card.locator('.bkit-card-steps'), 'the list is on the arrival card').toHaveCount(0)
      await expect(card.getByRole('button', { name: 'Start with colours' })).toBeVisible()
      // Nothing in the card scrolls.
      expect(await card.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'the arrival card scrolls').toBe(true)
      await page.screenshot({ path: test.info().outputPath(`brand-kit-arrival-card-${width}.png`), fullPage: false })

      // "What's this?" grows the same card to the list.
      await rail(page).getByRole('button', { name: /What.s this\?/ }).click()
      await expect(card).toBeVisible()
      await expect(card.locator('.bkit-card-steps li')).toHaveCount(4)
      await expect(card.locator('.bkit-card-steps')).toContainText('Type scale')
      await page.screenshot({ path: test.info().outputPath(`brand-kit-whats-this-${width}.png`), fullPage: false })

      // Pressed again, it closes.
      await rail(page).getByRole('button', { name: /What.s this\?/ }).click()
      await expect(card).toBeHidden()
    })
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
        const tablet = width >= 768 && width < 1024
        if (tablet) {
          // Read out, not drawn: clipped to a pixel, so the four labels get the width.
          await expect.poll(async () => (await measure(page)).shown, { message: `step ${n}: the count is drawn on a tablet` }).toBe(false)
        } else {
          // Polled: the rail remounts as each tool arrives and a node caught
          // mid-mount measures zero.
          await expect.poll(async () => (await measure(page)).shown, { message: `step ${n}: the count is not drawn` }).toBe(true)
        }
        const m = await measure(page)
        expect(m.text, `step ${n}`).toBe(`Step ${n} of 4`)
        if (!tablet) {
          expect(m.fontSize, `step ${n}: the count is under the 13px floor`).toBeGreaterThanOrEqual(13)
          expect(m.clipped, `step ${n}: the count is clipped`).toBe(false)
        }
        expect(m.barBottomOverflow, `step ${n}: the bar overflows sideways`).toBe(false)
        // One height per width: 60px below 1024px, the 50px pill above.
        if (width < 1024) expect(m.bar.height, `step ${n}: the bar is not 60px`).toBe(60)
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
