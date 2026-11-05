// Spec 303: the micro animations that were lost and are back (cards 479a9d4310
// and feaa875f01; the list is handover/specs/lost-micro-animations-2026-11-05.md).
//
// What is covered, each from what the browser computes and draws (the toast success
// pop is not back: it was removed on purpose, as decoration this product does not use):
//   - sliding tab underline    the File Converter tabs on the Spectrum homepage
//                              (.sp-modes) and the font dossier tabs in the
//                              Font Pair font browser (.fdx-tabs)
//   - Font Pair chevron        the "Prepare the handoff" caret turns on open
//   - aspect-ratio preview     the shape eases between ratios by scale on a
//                              fixed frame, never by width or height
//
// A motion "works" when it moves on transform alone, the value passes through
// positions between the old and new, it ends where it should, and the same move
// lands at once under reduced motion (the OS setting, or the in-app switch with
// the OS saying nothing).
//
// Not covered: the Palette Builder's colour-vision control. It is a dropdown of
// six long mode names (ToolSelect), not a pill group, so there is no pill to
// slide and the row was left out on purpose.
//
// MUTATIONS (each should turn the named test red):
//   - drop the useSlideIndicator call in spectrum/BenchConverter.jsx
//       -> "the underline slides" (File Converter tabs)
//   - drop it in FontDossier.jsx                    -> "the underline slides" (font dossier tabs)
//   - delete `--si-n` from useSlideIndicator.js     -> both underline cases (no bar width)
//   - change the bar's transition in spectrum.css (.sp-modes[data-slide="ready"]::after)
//     or type.css (.fdx-tabs[data-slide="ready"]::after) to width, or remove it
//                                                   -> "the underline slides" for that bar
//   - delete the reduced-motion `transition: none` rules for .sp-modes::after / .fdx-tabs ::after
//                                                   -> "reduced motion" for that bar
//   - remove `transition: transform` from .fpr-delivery > summary::after (font-pair.css)
//                                                   -> "the caret turns"
//   - give .rc-vis-frame a width/height transition, or drop its transform transition
//     (aspect-ratio.css)                            -> "the shape eases"
//   - size .rc-vis-frame by --arc-w/--arc-h again instead of scale
//                                                   -> "the shape eases" (frame is not a fixed 240px)
//   - delete the reduced-motion rule for .rc-vis-frame
//                                                   -> "reduced motion" for the preview
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [1440, 390]
const heightFor = (w) => (w < 700 ? 844 : 900)

// Sample an element's (or its pseudo-element's) transform every frame while
// `action` runs, for `ms` after the sampler starts.
async function traceAround(locator, pseudo, action, ms = 700) {
  const handle = await locator.elementHandle()
  const sampler = handle.evaluate((el, [ps, span]) => new Promise((resolve) => {
    const seen = []
    const t0 = performance.now()
    const tick = () => {
      const cs = getComputedStyle(el, ps || null)
      const m = new DOMMatrix(cs.transform)
      seen.push({ a: m.a, b: m.b, d: m.d, x: m.m41, y: m.m42 })
      if (performance.now() - t0 < span) requestAnimationFrame(tick)
      else resolve(seen)
    }
    tick()
  }), [pseudo, ms])
  await action()
  return sampler
}

const style = (locator, pseudo, props) => locator.evaluate((el, [ps, names]) => {
  const cs = getComputedStyle(el, ps || null)
  return Object.fromEntries(names.map((n) => [n, cs[n]]))
}, [pseudo, props])

const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol

// The in-app switch, set after load with the OS saying nothing.
const reduceInApp = (page) => page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true' })

/* ── Sliding tab underline ────────────────────────────────────────────────── */

// Where the bar should end up on a tab: x and scaleX from the tab's box.
const BARS = [
  {
    id: 'converter-tabs',
    name: 'File Converter tabs (Spectrum homepage)',
    widths: WIDTHS,
    duration: 0.2,
    // The bar spans the tab's full width; its top is the tab's bottom edge less the 2px bar.
    expect: (tab) => ({ x: tab.left, scale: tab.width, y: tab.top + tab.height - 2 }),
    open: async (page) => {
      await go(page, '/')
      // At 1000px and below the bench is a tool switcher: pick the Converter window first.
      const switcherTab = page.getByRole('tab', { name: 'Converter', exact: true })
      if (await switcherTab.count()) await switcherTab.click()
      const bar = page.locator('.sp-modes')
      await bar.scrollIntoViewIfNeeded()
      return { bar, target: bar.getByRole('tab', { name: 'Aspect ratio', exact: true }) }
    },
  },
  {
    id: 'dossier-tabs',
    name: 'Font dossier tabs (Font Pair font browser)',
    widths: [1440],
    duration: 0.2,
    // The bar is inset 10px each side of the tab and sits on the strip's rule.
    expect: (tab) => ({ x: tab.left + 10, scale: tab.width - 20, y: tab.top + tab.height - 1 }),
    open: async (page) => {
      await go(page, '/create/font-pair')
      await page.getByRole('button', { name: 'Browse heading family' }).first().click()
      const dialog = page.locator('.fbd-dialog')
      await expect(dialog).toBeVisible()
      await dialog.locator('.fbd-card').first().locator('.fbd-info').click()
      const bar = dialog.locator('.fdx-tabs')
      await expect(bar).toBeVisible()
      return { bar, target: bar.getByRole('tab', { name: 'In use', exact: true }) }
    },
  },
]

async function tabBox(target) {
  return target.evaluate((el) => ({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }))
}

for (const c of BARS) {
  test.describe(c.name, () => {
    for (const width of c.widths) {
      test(`the underline slides to a clicked tab on transform alone at ${width}px`, async ({ page }) => {
        watch(page, 'someone switching tabs')
        await page.setViewportSize({ width, height: heightFor(width) })
        const { bar, target } = await c.open(page, width)
        await expect(bar, 'the tab strip never drew its underline').toHaveAttribute('data-slide', 'ready')

        const rest = await style(bar, '::after', ['transitionProperty', 'transitionDuration', 'content'])
        expect(rest.content, 'the strip draws no underline bar').not.toBe('none')
        expect(rest.transitionProperty, 'the bar must move on transform alone').toBe('transform')
        expect(parseFloat(rest.transitionDuration)).toBeGreaterThanOrEqual(0.15)
        expect(parseFloat(rest.transitionDuration)).toBeLessThanOrEqual(0.25)

        const seen = await traceAround(bar, '::after', () => target.click())
        await expect(target).toHaveAttribute('aria-selected', 'true')
        const end = c.expect(await tabBox(target))
        const first = seen[0]
        const last = seen.at(-1)
        expect(near(last.x, end.x), `the bar ended at x ${last.x}, not under the chosen tab (${end.x})`).toBe(true)
        expect(near(last.a, end.scale), `the bar is ${last.a}px wide, not the tab's ${end.scale}px`).toBe(true)
        expect(near(last.y, end.y), `the bar sits at y ${last.y}, not on the tab's foot (${end.y})`).toBe(true)
        expect(Math.abs(end.x - first.x), 'the bar did not move').toBeGreaterThan(8)
        const between = seen.filter((p) => !near(p.x, first.x, 1) && !near(p.x, last.x, 1))
        expect(between.length, 'the bar jumped instead of sliding').toBeGreaterThan(0)
        // The tab's own underline is clear while the bar is drawn, so the two are never both on.
        const own = await style(target, null, ['borderBottomColor'])
        if (c.id === 'converter-tabs') expect(own.borderBottomColor, 'the tab paints a second underline under the bar').toBe('rgba(0, 0, 0, 0)')
        else {
          const ownBar = await style(target, '::after', ['content'])
          expect(ownBar.content, 'the tab paints a second underline under the bar').toBe('none')
        }
      })
    }

    test('reduced motion (OS setting): the bar lands at once', async ({ page }) => {
      watch(page, 'someone whose system asks for reduced motion')
      const width = c.widths[0]
      await page.setViewportSize({ width, height: heightFor(width) })
      // Before the page loads: the app stamps the attribute from the OS value at boot.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const { bar, target } = await c.open(page, width)
      await expect(bar).toHaveAttribute('data-slide', 'ready')
      const seen = await traceAround(bar, '::after', () => target.click())
      await expect(target).toHaveAttribute('aria-selected', 'true')
      const first = seen[0]
      const last = seen.at(-1)
      expect(Math.abs(last.x - first.x), 'the bar did not move').toBeGreaterThan(8)
      expect(seen.filter((p) => !near(p.x, first.x, 1) && !near(p.x, last.x, 1)).length, 'the bar still slides under reduced motion').toBe(0)
      expect(parseFloat((await style(bar, '::after', ['transitionDuration'])).transitionDuration), 'a transition is still set').toBeLessThanOrEqual(0.00001)
    })

    test('reduced motion (in-app switch): the bar lands at once with the OS saying nothing', async ({ page }) => {
      watch(page, 'someone who turned reduced motion on inside the app')
      const width = c.widths[0]
      await page.setViewportSize({ width, height: heightFor(width) })
      const { bar, target } = await c.open(page, width)
      await expect(bar).toHaveAttribute('data-slide', 'ready')
      await reduceInApp(page)
      const seen = await traceAround(bar, '::after', () => target.click())
      await expect(target).toHaveAttribute('aria-selected', 'true')
      const first = seen[0]
      const last = seen.at(-1)
      expect(Math.abs(last.x - first.x), 'the bar did not move').toBeGreaterThan(8)
      expect(seen.filter((p) => !near(p.x, first.x, 1) && !near(p.x, last.x, 1)).length, 'the bar still slides under reduced motion').toBe(0)
      expect(parseFloat((await style(bar, '::after', ['transitionDuration'])).transitionDuration), 'a transition is still set').toBeLessThanOrEqual(0.00001)
    })
  })
}

/* ── Font Pair: the disclosure caret turns ────────────────────────────────── */

test.describe('Font Pair: the handoff caret turns when the row opens', () => {
  async function openPage(page, width) {
    await page.setViewportSize({ width, height: heightFor(width) })
    await go(page, '/create/font-pair')
    const summary = page.locator('.fpr-delivery > summary')
    await expect(summary).toBeAttached()
    await summary.scrollIntoViewIfNeeded()
    return summary
  }
  // The docked bar can sit over a row at the foot of a phone, so the row is
  // opened from the keyboard, the way Enter on a summary does.
  const toggle = async (page, summary) => { await summary.focus(); await page.keyboard.press('Enter') }

  for (const width of WIDTHS) {
    test(`the caret turns a quarter on transform alone at ${width}px`, async ({ page }) => {
      watch(page, 'someone opening the handoff row')
      const summary = await openPage(page, width)
      const rest = await style(summary, '::after', ['transitionProperty', 'transitionDuration', 'transform'])
      expect(rest.transform, 'the caret starts turned').toBe('none')
      expect(rest.transitionProperty, 'the caret must turn on transform alone').toBe('transform')
      expect(parseFloat(rest.transitionDuration)).toBeGreaterThanOrEqual(0.1)
      expect(parseFloat(rest.transitionDuration)).toBeLessThanOrEqual(0.25)

      const seen = await traceAround(summary, '::after', () => toggle(page, summary), 600)
      await expect(page.locator('.fpr-delivery')).toHaveAttribute('open', '')
      const last = seen.at(-1)
      // rotate(90deg): a = 0, b = 1.
      expect(near(last.a, 0, 0.01) && near(last.b, 1, 0.01), `the open caret is not a quarter turn (a ${last.a}, b ${last.b})`).toBe(true)
      expect(seen.filter((p) => p.b > 0.05 && p.b < 0.95).length, 'the caret jumped instead of turning').toBeGreaterThan(0)

      // And back.
      await toggle(page, summary)
      await expect(page.locator('.fpr-delivery')).not.toHaveAttribute('open', '')
      await expect.poll(async () => (await style(summary, '::after', ['transform'])).transform, { timeout: 2000 }).toBe('none')
    })
  }

  test('reduced motion (OS setting): the caret turns at once', async ({ page }) => {
    watch(page, 'someone whose system asks for reduced motion')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const summary = await openPage(page, 1440)
    const seen = await traceAround(summary, '::after', () => toggle(page, summary), 600)
    expect(near(seen.at(-1).b, 1, 0.01), 'the caret never turned').toBe(true)
    expect(seen.filter((p) => p.b > 0.05 && p.b < 0.95).length, 'the caret still turns slowly').toBe(0)
    expect(parseFloat((await style(summary, '::after', ['transitionDuration'])).transitionDuration), 'instant (the global clamp leaves 0.01ms)').toBeLessThanOrEqual(0.00001)
  })

  test('reduced motion (in-app switch): the caret turns at once with the OS saying nothing', async ({ page }) => {
    watch(page, 'someone who turned reduced motion on inside the app')
    const summary = await openPage(page, 1440)
    await reduceInApp(page)
    const seen = await traceAround(summary, '::after', () => toggle(page, summary), 600)
    expect(near(seen.at(-1).b, 1, 0.01), 'the caret never turned').toBe(true)
    expect(seen.filter((p) => p.b > 0.05 && p.b < 0.95).length, 'the caret still turns slowly').toBe(0)
    expect(parseFloat((await style(summary, '::after', ['transitionDuration'])).transitionDuration), 'instant (the global clamp leaves 0.01ms)').toBeLessThanOrEqual(0.00001)
  })
})

/* ── Aspect ratio: the preview shape eases between ratios ─────────────────── */

test.describe('Aspect & Resolution: the preview shape eases between ratios', () => {
  // 1920:1080 (16:9) opens; setting the ratio height to 1920 makes it 1:1 in one change.
  async function openPage(page, width) {
    await page.setViewportSize({ width, height: heightFor(width) })
    await go(page, '/create/aspect-ratio')
    const frame = page.locator('.rc-vis-frame')
    await expect(frame).toBeAttached()
    return frame
  }
  const squareUp = (page) => page.getByLabel('Ratio height').fill('1920')

  for (const width of WIDTHS) {
    test(`the shape eases by scale on a fixed frame at ${width}px`, async ({ page }) => {
      watch(page, 'someone changing the ratio')
      const frame = await openPage(page, width)
      const rest = await style(frame, null, ['transitionProperty', 'transitionDuration', 'width', 'height'])
      expect(rest.transitionProperty, 'the shape must ease on transform alone, never width or height').toBe('transform')
      expect(parseFloat(rest.transitionDuration)).toBeGreaterThanOrEqual(0.2)
      expect(parseFloat(rest.transitionDuration)).toBeLessThanOrEqual(0.3)
      expect([rest.width, rest.height], 'the frame is not a fixed box').toEqual(['240px', '240px'])

      const seen = await traceAround(frame, null, () => squareUp(page), 800)
      const first = seen[0]
      const last = seen.at(-1)
      // The shape is read as height over width of the scale, since the stage may fit it
      // smaller than 240: 16:9 is 0.5625, 1:1 is 1.
      const r = (p) => p.d / p.a
      expect(near(r(first), 0.5625, 0.01), `the shape did not start as 16:9 (${first.a}, ${first.d})`).toBe(true)
      expect(near(r(last), 1, 0.01), `the shape did not end square (${last.a}, ${last.d})`).toBe(true)
      expect(seen.filter((p) => r(p) > 0.58 && r(p) < 0.98).length, 'the shape jumped instead of easing').toBeGreaterThan(0)
      // Through the whole move the frame's own size never changed.
      const after = await style(frame, null, ['width', 'height'])
      expect([after.width, after.height]).toEqual(['240px', '240px'])
      // The numbers under it are right: the readout says 1:1.
      await expect(page.locator('.rc-vis-ratio')).toHaveText(/^1\s*:\s*1$/)
    })
  }

  test('reduced motion (OS setting): the shape changes at once', async ({ page }) => {
    watch(page, 'someone whose system asks for reduced motion')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const frame = await openPage(page, 1440)
    const seen = await traceAround(frame, null, () => squareUp(page), 800)
    expect(near(seen.at(-1).d / seen.at(-1).a, 1, 0.01), 'the shape never changed').toBe(true)
    expect(seen.filter((p) => p.d / p.a > 0.58 && p.d / p.a < 0.98).length, 'the shape still eases').toBe(0)
    expect(parseFloat((await style(frame, null, ['transitionDuration'])).transitionDuration), 'instant (the global clamp leaves 0.01ms)').toBeLessThanOrEqual(0.00001)
  })

  test('reduced motion (in-app switch): the shape changes at once with the OS saying nothing', async ({ page }) => {
    watch(page, 'someone who turned reduced motion on inside the app')
    const frame = await openPage(page, 1440)
    await reduceInApp(page)
    const seen = await traceAround(frame, null, () => squareUp(page), 800)
    expect(near(seen.at(-1).d / seen.at(-1).a, 1, 0.01), 'the shape never changed').toBe(true)
    expect(seen.filter((p) => p.d / p.a > 0.58 && p.d / p.a < 0.98).length, 'the shape still eases').toBe(0)
    expect(parseFloat((await style(frame, null, ['transitionDuration'])).transitionDuration), 'instant (the global clamp leaves 0.01ms)').toBeLessThanOrEqual(0.00001)
  })
})
