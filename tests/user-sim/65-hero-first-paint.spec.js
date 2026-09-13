// The homepage headline must be PAINTED, WHOLE, on the page's first frame —
// and it must not arrive twice.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS FILE USED TO GUARD, AND WHY THE QUESTION MOVED
// ─────────────────────────────────────────────────────────────────────────────
// Until 2026-09-13 the headline did not exist in the served HTML. It was painted
// by React, so the hero's FIRST FRAME was the first frame of the `home-hero-
// clip-up` entrance, and the only reason LCP was not a further ~100 ms behind
// hydration was a geometric accident worth pinning: the clip-up starts at
// translate 110% behind `.home-hero-line`'s overflow:hidden, and the `.28em` of
// descender padding INSIDE that mask left ~.18em of the line box painted on
// frame 0. Chrome records a text block the first time it paints with non-zero
// area inside its clip and never re-sizes it, so LCP was pinned to that frame —
// at a recorded size of 2369 px², a sliver.
//
// scripts/prerender.mjs now writes the real headline into the served `/` and
// `/home` shells, so the headline paints with the stylesheet instead of with the
// entry chunk. Measured on scripts/home-field-metrics.mjs's profile, 10 cold
// runs: LCP 3662 ms mean / 4520 ms worst → 1702 ms mean / 1724 ms worst, CLS 0
// before and after.
//
// That moves what is worth guarding, in two directions at once:
//
//   · The sliver no longer decides anything, because the headline is painted
//     whole before any entrance could clip it. What must be true now is the
//     stronger thing: the FIRST LCP candidate is the headline AT FULL SIZE.
//     If it is ever recorded as a sliver again, a settled hydrated headline
//     becomes a LARGER candidate and LCP walks straight back to hydration —
//     silently, with the page looking identical.
//
//   · The entrance must NOT run on that load. It exists to announce a headline
//     arriving after the page did; here the headline arrives with the page.
//     Left alone it ran a second time ~1.7 s after the shell's copy settled
//     (measured: clip-up START 3529 ms against DONE 2734 ms) — a visible
//     double-render. `data-hero-prepainted` on <html>, written by the same
//     prerender step, is what turns it off, and src/pages/Home.jsx drops that
//     attribute on unmount.
//
// So the clip-up still exists and still matters — on the path where it is still
// an entrance, which is arriving at `/` from another route inside the session.
// The frame-0 geometry check has moved there rather than being deleted; its
// static half is still tests/unit/hero-first-paint.test.js.
//
// NOTHING HERE ASSERTS A MILLISECOND. The timings above are the record of a
// measurement, not a threshold: the machine-dependent figures live in
// scripts/home-field-metrics.mjs and on the pipeline item, for the reason that
// script's header gives. What is asserted is geometry, ordering and the
// identity of the LCP element — all exact, all machine-independent.
import { test, expect } from './base.js'
import { go, ready, watch } from './helpers.js'

// Installed before any page script, buffered so nothing painted before the
// observer attached is missed. Records every candidate, not just the last one,
// so a failure message can say what won instead. The rAF scan alongside it
// records every clip-up that ever STARTS — an animation that has finished and
// been removed is no longer in getAnimations(), so "did it run?" cannot be
// asked after the fact.
const PROBE = `
window.__lcpEntries = []
window.__clipUps = []
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) {
  window.__lcpEntries.push({
    t: Math.round(e.startTime), size: e.size,
    el: e.element ? e.element.tagName + '.' + String(e.element.className || '').split(' ')[0] : '(none)',
  })
} }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported */ }
const seen = new WeakSet()
const scan = () => {
  try {
    for (const a of document.getAnimations()) {
      if (a.animationName !== 'home-hero-clip-up' || seen.has(a)) continue
      seen.add(a)
      window.__clipUps.push(Math.round(performance.now()))
    }
  } catch { /* getAnimations unsupported */ }
  requestAnimationFrame(scan)
}
requestAnimationFrame(scan)
`

// How much of each headline line is inside its overflow:hidden clip, right now.
// `transform` comes back as the control: a settled headline reports 'none', and
// a headline mid-entrance does not.
const MEASURE = (els) => els.map((el) => {
  const clip = el.parentElement
  const c = clip.getBoundingClientRect()
  const b = el.getBoundingClientRect()
  const w = Math.max(0, Math.min(c.right, b.right) - Math.max(c.left, b.left))
  const h = Math.max(0, Math.min(c.bottom, b.bottom) - Math.max(c.top, b.top))
  return {
    visibleArea: Math.round(w * h),
    boxArea: Math.round(b.width * b.height),
    inViewport: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth,
    transform: getComputedStyle(el).transform,
    animationName: getComputedStyle(el).animationName,
  }
})

// Rewind each line's clip-up to ITS OWN time 0 and measure there. Restores the
// animation afterwards. Only used on the path where the entrance still runs.
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

// ── A cold load of the front door ───────────────────────────────────────────

test('a cold homepage load paints the whole headline, and does not animate it in', async ({ page }) => {
  await page.addInitScript({ content: PROBE })
  watch(page, 'a first-time visitor who must read the headline as soon as the page paints')
  await go(page, '/')

  // The served document said so. Without this the assertions below would still
  // pass on a page whose entrance happened to have finished already, which is
  // the vacuous version of this test.
  expect(
    await page.evaluate(() => document.documentElement.hasAttribute('data-hero-prepainted')),
    'the `/` shell was served without data-hero-prepainted on <html>, so scripts/prerender.mjs '
    + 'did not write the headline into it — the homepage is back to waiting for React for its '
    + 'largest paint.',
  ).toBe(true)

  const clipUps = await page.evaluate(() => window.__clipUps)
  expect(
    clipUps.length,
    `the clip-up ran ${clipUps.length} time(s) on a cold homepage load (at ${clipUps.join(', ')} ms). `
    + 'The headline is in the served shell, so it is already on screen — an entrance here is a '
    + 'second arrival of something that never left, and it also makes the settled hydrated '
    + 'headline a LARGER LCP candidate than the shell\'s, which moves LCP back to hydration.',
  ).toBe(0)

  const lines = page.locator('.home-hero-line-in')
  await expect(lines).toHaveCount(2)
  const now = await lines.evaluateAll(MEASURE)
  for (const [i, f] of now.entries()) {
    expect(f.animationName, `line ${i + 1} still has an animation-name on a pre-painted hero`).toBe('none')
    expect(f.transform, `line ${i + 1} is transformed on a pre-painted hero`).toBe('none')
    expect(f.inViewport, `line ${i + 1} is outside the viewport`).toBe(true)
    // The WHOLE box, not a sliver: nothing is masked when nothing moves.
    expect(
      f.visibleArea,
      `line ${i + 1}: ${f.visibleArea} of ${f.boxArea} px² is inside its clip. The headline must be `
      + 'painted whole, or the LCP candidate it produces is smaller than the one the hydrated '
      + 'headline will produce.',
    ).toBe(f.boxArea)
  }
})

test('the headline is the LCP element of a homepage load, recorded at its full size', async ({ page }) => {
  await page.addInitScript({ content: PROBE })
  watch(page, 'a first-time visitor whose largest paint should be the headline')
  await go(page, '/')

  // Settled on the animation layer, not a stopwatch — and on the hero's own
  // entrances only: the page runs infinite decorative loops whose `finished`
  // never resolves. On this path there are none to wait for, which is the point
  // of the test above; this stays so the check does not depend on that.
  await page.evaluate(() => Promise.allSettled(
    document.getAnimations().filter((a) => /^home-hero-/.test(a.animationName || '')).map((a) => a.finished),
  ))

  const entries = await page.evaluate(() => window.__lcpEntries)
  expect(entries.length, 'no largest-contentful-paint entry at all — the probe never attached').toBeGreaterThan(0)
  const list = entries.map((e) => `${e.el}@${e.t}ms/${e.size}px²`).join(', ')

  // FIRST, because that is the one the served shell produced.
  expect(entries[0].el, `the first LCP candidate is ${entries[0].el}, not the headline. Candidates: ${list}`)
    .toBe('SPAN.home-hero-line-in')
  // LAST, because a later, larger candidate is exactly how this regresses.
  expect(entries[entries.length - 1].el, `the last LCP candidate is not the headline. Candidates: ${list}`)
    .toBe('SPAN.home-hero-line-in')

  // AND AT FULL SIZE. This is the assertion that would catch the entrance
  // coming back to the shell: a clipped first frame is recorded at roughly 2% of
  // the headline's box (2369 px² was the measured figure), and Chrome never
  // re-sizes it — so the settled hydrated headline becomes a larger candidate
  // and LCP silently returns to hydration with the page looking identical.
  const boxes = await page.locator('.home-hero-line-in').evaluateAll(
    (els) => els.map((el) => {
      const b = el.getBoundingClientRect()
      return Math.round(b.width * b.height)
    }),
  )
  const biggest = Math.max(...boxes)
  expect(
    entries[0].size,
    `the headline's LCP was recorded at ${entries[0].size} px² against a settled line box of `
    + `${biggest} px². That is a clipped first frame, not the painted headline. Candidates: ${list}`,
  ).toBeGreaterThan(biggest * 0.3)
})

// ── Arriving at the homepage from inside the session ────────────────────────
//
// The path where the clip-up is still an entrance, and therefore the path that
// still has to satisfy the geometry this file was originally written for.

/** Land on a PillNav route, then reach the homepage the way a visitor does. */
async function arriveFromAnotherRoute(page) {
  await go(page, '/create/contrast')
  // A non-homepage URL must not end up pre-painted, and this is checked at the
  // URL rather than at the file, because the two can disagree: vercel.json
  // rewrites each prerendered URL to its own shell, but `vite preview` — which
  // this suite runs against — has no such table and hands dist/index.html to
  // EVERY path. The head script in index.html is what makes the answer depend
  // on where the visitor actually is instead of on which file arrived, so this
  // assertion covers the gate as well as the routing.
  expect(
    await page.evaluate(() => document.documentElement.hasAttribute('data-hero-prepainted')),
    'a non-homepage URL is marked data-hero-prepainted. That attribute turns the hero '
    + 'entrance off, and it belongs only to a document that actually painted the headline '
    + 'before React ran.',
  ).toBe(false)
  expect(
    await page.evaluate(() => !!document.querySelector('#boot-shell')),
    'the boot shell is still on screen after ready() — this reads the wrong page',
  ).toBe(false)
  await page.getByLabel('UIL4B home').click()
  await ready(page, '/home')
}

test("arriving at the homepage in-session still plays the entrance, and still paints inside its clip on frame 0", async ({ page }) => {
  watch(page, 'a visitor who reaches the homepage from a tool, for whom the hero really does arrive')
  await arriveFromAnotherRoute(page)

  const lines = page.locator('.home-hero-line-in')
  await expect(lines).toHaveCount(2)
  const frame0 = await lines.evaluateAll(FIRST_FRAME)

  for (const [i, f] of frame0.entries()) {
    expect(f.animated, `headline line ${i + 1} has no home-hero-clip-up animation — the entrance is gone from the one path where it is still an entrance`).toBe(true)
    // Positive control: the rewind put the `from` keyframe in effect.
    expect(f.transform, `line ${i + 1}: at time 0 the clip-up's from-transform should apply; got 'none', so this measured the settled headline`).not.toBe('none')
    expect(f.inViewport, `line ${i + 1} is outside the viewport at time 0`).toBe(true)
    expect(
      f.visibleArea,
      `line ${i + 1}: on the entrance's first keyframe 0 px² of the headline is inside its clip `
      + `(box ${f.boxArea} px²). Keep the clip-up's from-translate under 100% + `
      + ".home-hero-line's padding-block, or the headline is invisible for the 80 ms delay plus a frame.",
    ).toBeGreaterThan(0)
  }
})

test('under reduced motion the headline is fully inside its clip with no entrance at all', async ({ page }) => {
  // The same in-app choice 10-home-chaos-to-calm uses: an explicit toggle beats
  // the OS query, so this is the state the CSS `animation:none` rules serve.
  // Taken on the IN-SESSION path on purpose — on a cold load the entrance is
  // already off for everyone, so asserting it there would prove nothing about
  // the reduced-motion rules.
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({ rounding: 'default', density: 'cozy', reducedMotion: true }))
  })
  watch(page, 'a visitor who turned motion off and must get the headline instantly, whole')
  await arriveFromAnotherRoute(page)

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
