// Target size on the Create tools — WCAG 2.5.8 (AA), 24x24 CSS px.
//
// `audit-coverage-not-run` swept target size at six widths on eighteen routes
// and recorded the result honestly: the sub-24px hits are real, but they are
// "almost all footer nav links at about 21x21 and inline swatch controls", so
// it was queued at POLISH weight rather than raised as its own P1. This spec
// is the part of that queue that sits INSIDE the Create tools, measured again
// on 2026-09-06 at all twenty widths from 320 to 1920.
//
// It covers three classes, and deliberately not a fourth:
//
//   1. THE CROSS-TOOL HANDOFF LINKS. Seven of them, 18.1–21.4px tall, and they
//      are how a person moves between tools — Tint → Palette, Type Scale →
//      Font Pair, Contrast → Tint, Gradient → Gradient Library. Four were the
//      same declaration copied to four places, so one rule fixes all seven.
//
//   2. THE PALETTE ADJUSTMENT SLIDERS. Hue / Saturation / Tone / Temperature
//      measured 154.7 x 14 at every width 820–1920 and 186.5 x 14 at 390. They
//      are the tool's fine adjustment and the thing a phone user drags.
//
//   3. THE LIBRARY SEARCH FIELD's hit area, which is a different fault wearing
//      the same number — see the test for why it needs a real click.
//
// NOT COVERED, and left deliberately: the app footer's links (~18–21.4px) and
// the nav's, which are the app shell and are being audited separately; and
// `.ggn-handle`, the 20x20 gradient stop handle, where growing the target
// changes how the gradient bar is dragged and is a design call rather than a
// defect fix.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const MIN = 24

const settle = async (page) => {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  // Settle by geometry stability across frames, never by a stopwatch.
  await page.evaluate(async () => {
    let prev = ''
    let stable = 0
    for (let i = 0; i < 90 && stable < 4; i += 1) {
      const cur = `${document.documentElement.scrollHeight}:${document.body.scrollWidth}`
      if (cur === prev) stable += 1
      else { stable = 0; prev = cur }
      await new Promise((r) => requestAnimationFrame(r))
    }
  })
}

// route -> the handoff link on it, and the words a person reads.
const HANDOFF = [
  ['/create/tint', '.tt-more-link', 'Build a full palette'],
  // The visible text is "← Palette Builder"; "Back to Palette Builder" is the
  // aria-label. Assert the words a sighted person reads, not the ones a screen
  // reader announces — otherwise this control's own arrow makes the check pass
  // for the wrong reason.
  ['/create/tint', '.tt-back', 'Palette Builder'],
  ['/create/type-scale', '.tsc-more-link', 'Pair two families'],
  ['/create/font-pair', '.fpr-more-link', 'Build a type scale'],
  ['/create/font-gallery', '.fg-more-link', 'Pair two families'],
  ['/create/contrast', '.cc-more-link', 'Build a tint scale from this colour'],
  ['/create/gradient', '.ggn-gal-link', 'Browse the Gradient Library'],
]

test.describe('cross-tool handoff links meet the 24px target floor', () => {
  for (const [route, selector, words] of HANDOFF) {
    test(`${selector} on ${route} — "${words}"`, async ({ page }) => {
      watch(page, 'a designer moving from one Create tool to the next')
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, route)
      const link = page.locator(selector).first()
      await expect(link).toBeVisible()
      await settle(page)

      // POSITIVE CONTROL. A height assertion on a locator that matched nothing
      // would pass vacuously, so prove the link is really there and really is
      // the one a person would read.
      const text = (await link.textContent()).replace(/\s+/g, ' ').trim()
      expect(text, `${selector} should read like a handoff to another tool`).toContain(words)

      const box = await link.boundingBox()
      expect(box, `${selector} has no box`).not.toBeNull()
      expect(
        Math.round(box.height * 10) / 10,
        `${selector} is ${box.height.toFixed(1)}px tall — WCAG 2.5.8 asks ${MIN}px`,
      ).toBeGreaterThanOrEqual(MIN)
    })
  }
})

test.describe('Palette Builder adjustment sliders are draggable on a phone', () => {
  // MUTATION: put `height:14px` back on `.snapv--grad input[type="range"]`
  // in global.css and all four go red at 14px.
  const SLIDERS = [
    ['#plb-h', 'Hue'],
    ['#plb-s', 'Saturation'],
    ['#plb-b', 'Tone'],
    ['#plb-temp', 'Temperature'],
  ]

  test('all four are at least 24px tall at 390px', async ({ page }) => {
    watch(page, 'a designer nudging a palette one-handed on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/palette')
    await expect(page.locator('#plb-h')).toBeVisible()
    await settle(page)

    const short = []
    for (const [selector, label] of SLIDERS) {
      const el = page.locator(selector)
      // POSITIVE CONTROL: it is the range input the label names, not a wrapper.
      await expect(el).toHaveAttribute('type', 'range')
      const box = await el.boundingBox()
      expect(box, `${selector} (${label}) has no box`).not.toBeNull()
      expect(box.width, `${selector} should span the row`).toBeGreaterThan(80)
      if (box.height < MIN) short.push(`${label} (${selector}): ${box.height.toFixed(1)}px`)
    }
    expect(short, `sliders under the ${MIN}px target floor:\n  ${short.join('\n  ')}`).toEqual([])
  })
})

test.describe('the library search field accepts a click anywhere in it', () => {
  // THIS ONE CANNOT BE A HEIGHT ASSERTION, which is why it clicks.
  //
  // `.lbry-search` is a plain <div> with `min-height:46px`, NOT a <label>, so
  // it forwards nothing to the input inside it. With the flex default
  // (`align-items:center`) the input sat at its own 18px content height in the
  // middle of that 46px field and the 14px above and below it was dead.
  // MEASURED before the fix on /create/font-gallery at 1440: wrapper 360x46,
  // input 306x18, and a real click 4px inside the wrapper's top edge left
  // `document.activeElement` on `main.rail-content`. The field LOOKS 46px tall
  // and accepted a click in the middle 18px only.
  //
  // A bounding-box assertion on the wrapper would have passed the whole time —
  // it was always 46px. Only a click can tell the two apart.
  //
  // MUTATION: drop `align-self:stretch` from `.lbry-search input` and the
  // top and bottom clicks go red while the middle one stays green.
  for (const route of ['/create/font-gallery', '/create/icons']) {
    test(`clicking near the top and bottom edges focuses the input on ${route}`, async ({ page }) => {
      watch(page, 'someone tapping a search field to filter a library')
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, route)
      const field = page.locator('.lbry-search').first()
      await expect(field).toBeVisible()
      await settle(page)

      const geom = await page.evaluate(() => {
        const wrap = document.querySelector('.lbry-search')
        const input = wrap.querySelector('input')
        const rw = wrap.getBoundingClientRect()
        const ri = input.getBoundingClientRect()
        return {
          wrapTop: rw.top, wrapHeight: rw.height,
          inputCentreX: ri.left + ri.width / 2, inputHeight: ri.height,
        }
      })

      // POSITIVE CONTROL: the field really is the tall control it looks like,
      // so a passing click cannot come from a collapsed 0px box.
      expect(geom.wrapHeight, 'the search field should be its full height').toBeGreaterThanOrEqual(40)

      const missed = []
      for (const dy of [3, 8, geom.wrapHeight - 8, geom.wrapHeight - 3]) {
        await page.evaluate(() => document.activeElement?.blur())
        await page.mouse.click(Math.round(geom.inputCentreX), Math.round(geom.wrapTop + dy))
        const focused = await page.evaluate(() => document.activeElement?.tagName)
        if (focused !== 'INPUT') missed.push(`${Math.round(dy)}px from the top focused <${focused}>`)
      }
      expect(
        missed,
        `the search field ignored a click inside its own box:\n  ${missed.join('\n  ')}`,
      ).toEqual([])
    })
  }
})
