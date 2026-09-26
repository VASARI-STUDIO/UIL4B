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
  // /create/tint is not listed: its
  // drawn screen has no cross-tool links, and its back button is the shared
  // toolbar's (see 100-tool-toolbar-one-row).
  ['/create/type-scale', '.tsc-handoff', 'Find a pairing'],
  ['/create/font-pair', '.fpr-handoff', 'Build a scale'],
  ['/create/font-gallery', '.fg-pair-link', 'Build a font pair'],
  // '/create/contrast' is not listed: its drawn screen has no
  // cross-tool links (the Create menu carries them), so the link is gone.
  ['/create/gradient', '.grd-lib', 'Gradient Library'],
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

test.describe('the small in-page controls that actually do something', () => {
  // Three controls that act on a click and were 3, 4 and 9px short. Measured
  // signed out across 320-1920 before the fix:
  //   button.plb-hex      67.5 x 21   the hex on a palette swatch; copies it
  //   button.snapv-value    56 x 23   the number beside a slider; click to type
  //   button.ggn-copy     28.5 x 15   copies the gradient's CSS
  //
  // MUTATION: drop min-height:24px from either rule and the matching case goes
  // red at its measured height above.
  const CASES = [
    ['/create/palette', '.plb-hex', 'the hex on a swatch'],
    // Not listed: '.snapv-value — the value beside a slider'. The drawn
    // Adjust bar's value is a readout (D:1043), not a click-to-type control,
    // so it is no longer a target; its alignment is held below.
    ['/create/gradient', '.grd .tl-primary .tl-btn', 'the CSS copy button'],
  ]

  for (const [route, selector, human] of CASES) {
    test(`${selector} on ${route} — ${human}`, async ({ page }) => {
      watch(page, 'someone copying a value out of a tool on a phone')
      await page.setViewportSize({ width: 390, height: 844 })
      await go(page, route)
      const el = page.locator(selector).first()
      await expect(el).toBeVisible()
      await settle(page)

      // POSITIVE CONTROL. These are the opposite case to `.stc-sc-link` and
      // `.stc-sc-ghost`, which are specimen elements with tabIndex={-1} and no
      // handler and are deliberately NOT held to this floor. So prove this one
      // is really reachable before asserting it is really big enough.
      const reachable = await el.evaluate((node) => node.tabIndex >= 0 && !node.disabled)
      expect(reachable, `${selector} should be a control a person can reach`).toBe(true)

      const box = await el.boundingBox()
      expect(box, `${selector} has no box`).not.toBeNull()
      expect(
        Math.round(box.height * 10) / 10,
        `${selector} is ${box.height.toFixed(1)}px tall — WCAG 2.5.8 asks ${MIN}px`,
      ).toBeGreaterThanOrEqual(MIN)
    })
  }

  test('the slider value keeps its right edge after being made taller', async ({ page }) => {
    // A flex container ignores `text-align` for its items, so the min-height
    // fix could have silently re-centred every number in the slider stack.
    // `justify-content:flex-end` is what preserves the column of digits.
    //
    // ASSERTED AT 390px, AND ONLY THERE, because that is the only width where
    // "a column of digits" exists. `.plb-adjust-fields` is a grid that runs
    // `repeat(4, auto minmax(0,1fr))` on desktop, so the four values sit SIDE
    // BY SIDE and having four different right edges is correct. Measured:
    //   1440px  rights 283 / 601 / 876 / 1205, all on one row  (4 x 1)
    //    640px  rights 283 / 624, two rows                     (2 x 2)
    //    390px  rights 374 / 374 / 374 / 374, four rows        (1 x 4)
    // The first draft of this test asserted a shared edge at 1440 and failed
    // on a layout that was never wrong.
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/palette')
    await expect(page.locator('.plb-adjust .tl-slider-v').first()).toBeVisible()
    await settle(page)

    // MEASURE THE TEXT, NOT THE BOX. The box is a fixed 56px and never moves,
    // so `justify-content:center` would re-centre every number while leaving
    // every bounding rect identical — an assertion on the element's own rect
    // CANNOT FAIL for the thing this test exists to defend. The first draft did
    // exactly that, and the mutation proved it: re-centring the values left the
    // test green. A Range over the text node reports where the digits actually
    // sit.
    const vals = await page.evaluate(() => {
      const list = [...document.querySelectorAll('.plb-adjust .tl-slider-v')]
      return list.map((v) => {
        const box = v.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(v)
        const text = range.getBoundingClientRect()
        return {
          right: Math.round(text.right),
          top: Math.round(box.top),
          // how far the digits stop short of the box's right edge
          inset: Math.round(box.right - text.right),
        }
      })
    })
    expect(vals.length, 'the four adjustment sliders each have a value').toBeGreaterThanOrEqual(4)
    // POSITIVE CONTROL: they really are stacked here, so a shared right edge
    // means alignment rather than four boxes sitting on top of each other.
    expect(
      new Set(vals.map((v) => v.top)).size,
      'the four values should be on four separate rows at 390px',
    ).toBe(vals.length)
    expect(
      new Set(vals.map((v) => v.right)).size,
      `the digits no longer share a right edge: ${vals.map((v) => v.right).join(', ')}`,
    ).toBe(1)
    // And they are flush right inside their box, not floating in the middle of
    // it. `padding-right:6px` is the only thing that should separate them, so
    // anything past ~8px means the text has been re-centred.
    for (const v of vals) {
      expect(
        v.inset,
        `the value sits ${v.inset}px in from its own right edge — it has been re-centred`,
      ).toBeLessThanOrEqual(8)
    }
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
