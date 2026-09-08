// The homepage headline must COUNT AS PAINTED on the hero's very first frame.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS MEASURED (2026-09-08, on scripts/home-field-metrics.mjs's profile:
// Pixel 5, CDP 150 ms / 204800 B/s, CPU 4x, cold context per run)
// ─────────────────────────────────────────────────────────────────────────────
// The LCP element is SPAN.home-hero-line-in in every run, and its LCP entry
// lands 19-22 ms after the clip-up animation's startTime — on the SAME frame
// the hero first paints. The entrance costs LCP nothing. That is NOT because the
// text is visible on frame 0 (the clip-up starts at translate 110%, behind an
// overflow:hidden mask); it is because `.home-hero-line` carries `.28em` of
// descender padding INSIDE the mask, and 110% of a .98 line box overshoots the
// content box by only .098em, so ~.18em of the headline's box is still inside
// the clip on frame 0. Chrome's text paint timing records a text block the
// first time it paints with non-zero area inside its clip and never re-sizes
// it — which is why the recorded LCP size is a 2369 px² sliver rather than the
// headline, and why LCP is pinned to the hero's first frame.
//
// Fully clip the first frame — a `from` of 130%, or padding under .1em — and
// Chrome waits for the first frame with visible text instead: the 80 ms delay
// plus a frame, ~100 ms later on that profile. Nobody would SEE the regression;
// the field metric would.
//
// WHY THESE ARE GEOMETRY CHECKS AND NOT TIMINGS. The millisecond figure is
// machine-dependent and is deliberately kept out of the suite (see the
// homepage-field-metrics pipeline note). What is exact — and what regresses
// silently — is the geometry: on the entrance's first keyframe, does the LCP
// candidate have painted area inside its clip, and is it the LCP element at
// all? Both are asked of the real rendered page, at the animation's own time 0,
// with no stopwatch anywhere.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Installed before any page script, buffered so nothing painted before the
// observer attached is missed. Records every candidate, not just the last one,
// so a failure message can say what won instead.
const LCP_PROBE = `
window.__lcpEntries = []
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) {
  window.__lcpEntries.push({
    t: Math.round(e.startTime), size: e.size,
    el: e.element ? e.element.tagName + '.' + String(e.element.className || '').split(' ')[0] : '(none)',
  })
} }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported */ }
`

// Rewind each headline line's clip-up to ITS OWN time 0 and measure how much of
// the line's box sits inside the overflow:hidden clip (`.home-hero-line`) at
// that instant. Restores the animation afterwards. `transform` is returned as
// the positive control: at time 0 the `from` keyframe must be in effect, or the
// measurement was of the settled headline and proves nothing.
const FIRST_FRAME = (els) => els.map((el) => {
  const anim = el.getAnimations().find((a) => a.animationName === 'home-hero-clip-up')
  const clip = el.parentElement
  const measure = () => {
    const c = clip.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const w = Math.max(0, Math.min(c.right, b.right) - Math.max(c.left, b.left))
    const h = Math.max(0, Math.min(c.bottom, b.bottom) - Math.max(c.top, b.top))
    return {
      visibleArea: Math.round(w * h),
      boxArea: Math.round(b.width * b.height),
      inViewport: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth,
      transform: getComputedStyle(el).transform,
    }
  }
  if (!anim) return { animated: false, ...measure() }
  const was = anim.currentTime
  anim.pause()
  anim.currentTime = 0
  const atZero = measure()
  if (was !== null) anim.currentTime = was
  anim.play()
  return { animated: true, ...atZero }
})

test("on the entrance's first keyframe the headline still has painted area inside its clip", async ({ page }) => {
  watch(page, "a first-time visitor whose headline must count as painted on the hero's first frame")
  await go(page, '/')

  const lines = page.locator('.home-hero-line-in')
  await expect(lines).toHaveCount(2)
  const frame0 = await lines.evaluateAll(FIRST_FRAME)

  for (const [i, f] of frame0.entries()) {
    expect(f.animated, `headline line ${i + 1} has no home-hero-clip-up animation — the entrance moved and this guard is looking at the wrong thing`).toBe(true)
    // Positive control: the rewind put the `from` keyframe in effect.
    expect(f.transform, `line ${i + 1}: at time 0 the clip-up's from-transform should apply; got 'none', so this measured the settled headline`).not.toBe('none')
    expect(f.inViewport, `line ${i + 1} is outside the viewport at time 0`).toBe(true)
    expect(
      f.visibleArea,
      `line ${i + 1}: on the entrance's first keyframe 0 px² of the headline is inside its clip `
      + `(box ${f.boxArea} px²). Chrome will not record the headline's LCP until its first VISIBLE frame — `
      + 'the 80 ms delay plus a frame later. Keep the clip-up\'s from-translate under '
      + '100% + .home-hero-line\'s padding-block, or LCP moves without anyone seeing it.',
    ).toBeGreaterThan(0)
  }
})

test('the headline is the LCP element of a homepage load', async ({ page }) => {
  await page.addInitScript({ content: LCP_PROBE })
  watch(page, 'a first-time visitor whose largest paint should be the headline')
  await go(page, '/')

  // Every hero entrance finished, so every candidate that will ever be
  // reported (short of user input) has been. Settled on the animation layer,
  // not a stopwatch — and on the ENTRANCE animations only: the page also runs
  // infinite decorative loops whose `finished` never resolves.
  await page.evaluate(() => Promise.allSettled(
    document.getAnimations().filter((a) => /^home-hero-/.test(a.animationName || '')).map((a) => a.finished),
  ))
  const entries = await page.evaluate(() => window.__lcpEntries)
  expect(entries.length, 'no largest-contentful-paint entry at all — the probe never attached').toBeGreaterThan(0)
  const last = entries[entries.length - 1]
  expect(
    last.el,
    `the LCP element is ${last.el} (${last.size} px²), not the headline. Candidates in order: `
    + entries.map((e) => `${e.el}@${e.t}ms/${e.size}px²`).join(', ')
    + ". The geometry guard above protects the headline's first frame; if the headline is no "
    + 'longer what Chrome measures, that guard is protecting the wrong element.',
  ).toBe('SPAN.home-hero-line-in')
})

test('under reduced motion the headline is fully inside its clip with no entrance at all', async ({ page }) => {
  // The same in-app choice 10-home-chaos-to-calm uses: an explicit toggle beats
  // the OS query, so this is the state the CSS `animation:none` rules serve.
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({ rounding: 'default', density: 'cozy', reducedMotion: true }))
  })
  watch(page, 'a visitor who turned motion off and must get the headline instantly, whole')
  await go(page, '/')

  const lines = page.locator('.home-hero-line-in')
  await expect(lines).toHaveCount(2)
  const frame0 = await lines.evaluateAll(FIRST_FRAME)
  for (const [i, f] of frame0.entries()) {
    expect(f.animated, `line ${i + 1} still runs the clip-up under reduced motion`).toBe(false)
    expect(f.transform, `line ${i + 1} is transformed under reduced motion`).toBe('none')
    // The whole box, not a sliver: nothing is masked when nothing moves.
    expect(f.visibleArea, `line ${i + 1}: ${f.visibleArea} of ${f.boxArea} px² inside the clip under reduced motion`).toBe(f.boxArea)
  }
})
