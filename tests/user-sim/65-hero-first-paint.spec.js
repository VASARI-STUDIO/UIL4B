// The homepage headline must be PAINTED, WHOLE, on the page's first frame, and
// it must never animate.
//
// WHAT IS GUARDED
// The headline is one `h1.hh-h1`, plain text with no wrappers and no entrance.
// scripts/prerender.mjs writes the same headline into the served `/` and `/home`
// shells, so it paints with the stylesheet rather than with the entry chunk, and
// `data-hero-prepainted` on <html> marks a document that did. If the headline
// were ever animated in, or recorded as a small first paint, a larger settled
// candidate would take over and the largest contentful paint would silently
// move to hydration with the page looking identical.
//
// The only thing on the first screen that enters is the loop panel (`.hh-fig`,
// `hh-panel-in`: 300ms, a 12px rise and a fade). Under reduced motion it fades
// only (`hh-panel-fade`), with no movement.
//
// NOTHING HERE ASSERTS A MILLISECOND. What is asserted is which elements are
// animated, geometry, ordering and the identity of the LCP element.
//
// MUTATIONS (each should turn the named test red):
//   - give `.hh-h1` an animation in home-hero.css      -> "paints the whole headline"
//   - remove `data-hero-prepainted` from the shell     -> "paints the whole headline"
//   - remove the `hh-panel-in` animation from `.hh-fig`-> "arriving ... plays the panel entrance"
//   - make `hh-panel-in` rise 12px under reduced motion-> "under reduced motion"
import { test, expect } from './base.js'
import { go, goHoldingApp, ready, watch } from './helpers.js'
import { SPECTRUM_HERO } from '../../src/components/spectrum/spectrumHero.js'

// Installed before any page script, buffered so nothing painted before the
// observer attached is missed. Records every LCP candidate, not just the last
// one, so a failure message can say what won instead. The rAF scan alongside it
// records every animation that ever STARTS on the hero: an animation that has
// finished and been removed is no longer in getAnimations(), so "did it run?"
// cannot be asked after the fact.
const PROBE = `
window.__lcpEntries = []
window.__heroAnims = []
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) {
  window.__lcpEntries.push({
    t: Math.round(e.startTime), size: e.size,
    el: e.element ? e.element.tagName + '.' + String(e.element.className || '').split(' ')[0] : '(none)',
  })
} }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported */ }
const seen = new WeakSet()
const scan = () => {
  try {
    const hero = document.querySelector('section#top')
    if (hero) for (const a of hero.getAnimations({ subtree: true })) {
      if (seen.has(a)) continue
      seen.add(a)
      const target = a.effect && a.effect.target
      // Decorative infinite loops are not entrances, so only finite ones count.
      if (a.effect.getTiming().iterations === Infinity) continue
      window.__heroAnims.push({ name: a.animationName || '(transition)', el: target ? target.tagName + '.' + String(target.className || '').split(' ')[0] : '(none)' })
    }
  } catch { /* getAnimations unsupported */ }
  requestAnimationFrame(scan)
}
requestAnimationFrame(scan)
`

/** The headline as the browser has it right now: its box, its paint state, and every running animation under it. */
const MEASURE = (h1) => {
  const b = h1.getBoundingClientRect()
  let opacity = 1
  for (let el = h1; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity)
  return {
    area: Math.round(b.width * b.height),
    inViewport: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth,
    transform: getComputedStyle(h1).transform,
    animationName: getComputedStyle(h1).animationName,
    opacity,
    running: h1.getAnimations({ subtree: true }).length,
    text: h1.textContent.replace(/\s+/g, ' ').trim(),
  }
}

// ── A cold load of the front door ───────────────────────────────────────────

test('a cold homepage load paints the whole headline, and does not animate it in', async ({ page }) => {
  await page.addInitScript({ content: PROBE })
  watch(page, 'a first-time visitor who must read the headline as soon as the page paints')
  await go(page, '/')

  // The served document said so. Without this the assertions below would still
  // pass on a headline that happened to have settled already, which is the
  // vacuous version of this test.
  expect(
    await page.evaluate(() => document.documentElement.hasAttribute('data-hero-prepainted')),
    'the `/` shell was served without data-hero-prepainted on <html>, so scripts/prerender.mjs '
    + 'did not write the headline into it: the homepage is back to waiting for React for its '
    + 'largest paint.',
  ).toBe(true)

  const h1 = page.locator('section#top h1.hh-h1')
  await expect(h1).toHaveCount(1)
  const m = await h1.evaluate(MEASURE)
  expect(m.text, 'the headline text is not the positioning headline').toBe(SPECTRUM_HERO.text.replace(/\s+/g, ' ').trim())
  expect(m.animationName, 'the headline has an animation-name on a pre-painted hero').toBe('none')
  expect(m.transform, 'the headline is transformed on a pre-painted hero').toBe('none')
  expect(m.opacity, 'the headline is not fully opaque').toBe(1)
  expect(m.inViewport, 'the headline is outside the first screen').toBe(true)
  expect(m.running, 'the headline or something inside it is animating').toBe(0)

  // Nothing the headline is made of ever animated, and nothing else on a cold
  // load rises or fades in except the loop panel.
  const anims = await page.evaluate(() => window.__heroAnims)
  expect(
    anims.filter((a) => /^H1\.|^SPAN\.hh-h1-mark/.test(a.el)),
    `an entrance ran on the headline: ${JSON.stringify(anims)}`,
  ).toEqual([])
})

test('the headline is the LCP element of a homepage load, recorded at its full size', async ({ page }) => {
  await page.addInitScript({ content: PROBE })
  watch(page, 'a first-time visitor whose largest paint should be the headline')
  // The app's script is held until the shell's first LCP candidate has been
  // RECORDED. An entry's `element` reads null once its node has left the
  // document, and React's createRoot replaces the shell, so on a slow runner the
  // observer callback ran after the swap and the headline's own paint read as
  // "(none)". See goHoldingApp in helpers.js. Every later candidate is still
  // observed live, after hydration.
  await goHoldingApp(page, '/', () => expect.poll(
    () => page.evaluate(() => window.__lcpEntries.length),
    { message: 'the served shell never produced a largest-contentful-paint entry', timeout: 15000 },
  ).toBeGreaterThan(0))

  const entries = await page.evaluate(() => window.__lcpEntries)
  expect(entries.length, 'no largest-contentful-paint entry at all: the probe never attached').toBeGreaterThan(0)
  const list = entries.map((e) => `${e.el}@${e.t}ms/${e.size}px²`).join(', ')

  // FIRST, because that is the one the served shell produced.
  expect(entries[0].el, `the first LCP candidate is ${entries[0].el}, not the headline. Candidates: ${list}`)
    .toBe('H1.hh-h1')
  // LAST, because a later, larger candidate is exactly how this regresses.
  expect(entries[entries.length - 1].el, `the last LCP candidate is not the headline. Candidates: ${list}`)
    .toBe('H1.hh-h1')

  // AND AT FULL SIZE, measured against the H1's own settled box (the H1 is what
  // Chrome records). A clipped or faded first frame is recorded small and never
  // re-sized, so the settled headline would become a larger candidate.
  const settled = await page.locator('section#top h1.hh-h1').evaluate((el) => {
    const b = el.getBoundingClientRect()
    return Math.round(b.width * b.height)
  })
  expect(
    entries[0].size,
    `the headline's LCP was recorded at ${entries[0].size} px² against a settled headline box of `
    + `${settled} px². That is a clipped first frame, not the painted headline. Candidates: ${list}`,
  ).toBeGreaterThan(settled * 0.3)
})

// ── Arriving at the homepage from inside the session ────────────────────────
//
// The path where the loop panel really is an arrival: the hero mounts into a
// page that is already there.

/** Land on an app route, then reach the homepage the way a visitor does. */
async function arriveFromAnotherRoute(page) {
  await go(page, '/create/contrast')
  // A non-homepage URL must not end up pre-painted. This is checked at the URL
  // rather than the file because `vite preview` hands the same shell to every
  // path, so the head script in index.html is what makes the answer depend on
  // where the visitor actually is.
  expect(
    await page.evaluate(() => document.documentElement.hasAttribute('data-hero-prepainted')),
    'a non-homepage URL is marked data-hero-prepainted. That attribute belongs only to a '
    + 'document that actually painted the headline before React ran.',
  ).toBe(false)
  expect(
    await page.evaluate(() => !!document.querySelector('#boot-shell')),
    'the boot shell is still on screen after ready(): this reads the wrong page',
  ).toBe(false)
  // The way a visitor leaves a tool for the homepage: the logo takes an app page
  // to the dashboard, and the logo there takes the dashboard to the homepage.
  // Both are client-side route changes, so the document (and its scan) survives.
  await page.getByRole('link', { name: 'UIL4B, go to your dashboard' }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await page.getByRole('link', { name: 'UIL4B, go to the home page' }).click()
  await ready(page, '/home')
}

test('arriving at the homepage in-session plays the panel entrance and leaves the headline alone', async ({ page }) => {
  await page.addInitScript({ content: PROBE })
  watch(page, 'a visitor who reaches the homepage from a tool, for whom the hero really does arrive')
  await arriveFromAnotherRoute(page)

  const h1 = page.locator('section#top h1.hh-h1')
  await expect(h1).toHaveCount(1)
  const fig = page.locator('section#top .hh-fig')
  await expect(fig).toBeAttached()
  // Seen on the animation layer by the per-frame scan rather than by a single
  // read, so an entrance that already finished still counts.
  await page.waitForFunction(() => window.__heroAnims.some((a) => a.name === 'hh-panel-in'), null, { polling: 'raf', timeout: 5000 })
    .catch(() => {})
  const anims = await page.evaluate(() => window.__heroAnims)
  expect(anims.some((a) => a.name === 'hh-panel-in' && a.el === 'FIGURE.hh-fig'), `the loop panel's entrance never ran: ${JSON.stringify(anims)}`).toBe(true)
  // The homepage holds the theme at dark while it is mounted, so arriving from a
  // light tool flips the theme and the search field's own `transition: all`
  // fades its colours. That is a transition on a control, like a hover, not an
  // entrance. Any other element's animation or transition still fails here.
  expect(
    anims.filter((a) => a.name !== 'hh-panel-in' && !/^(BUTTON|A|SVG|svg|PATH|CIRCLE|INPUT\.hcmd-input)/.test(a.el)),
    `something other than the loop panel entered: ${JSON.stringify(anims)}`,
  ).toEqual([])

  const m = await h1.evaluate(MEASURE)
  expect(m.animationName, 'the headline has an animation in-session').toBe('none')
  expect(m.running, 'the headline is animating in-session').toBe(0)
  expect(m.opacity, 'the headline is not fully opaque in-session').toBe(1)

  // The entrance must END: a panel left at opacity 0 is a hero with no loop, and
  // that failure would be silent.
  await fig.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  const settled = await fig.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { opacity: cs.opacity, rise: new DOMMatrix(cs.transform).m42 }
  })
  expect(settled, 'the loop panel did not settle at full opacity and its place').toEqual({ opacity: '1', rise: 0 })
})

test('under reduced motion the panel only fades, and the headline is whole with no entrance at all', async ({ page }) => {
  // The in-app choice: an explicit toggle beats the OS query, so this is the
  // state the CSS rules for `data-reduced-motion="true"` serve. Taken on the
  // in-session path on purpose, since that is where the panel enters.
  await page.addInitScript({ content: PROBE })
  await page.addInitScript(() => {
    localStorage.setItem('vs-appearance', JSON.stringify({ rounding: 'default', density: 'cozy', reducedMotion: true }))
  })
  watch(page, 'a visitor who turned motion off and must get the headline instantly, whole')
  await arriveFromAnotherRoute(page)

  const h1 = page.locator('section#top h1.hh-h1')
  const m = await h1.evaluate(MEASURE)
  expect(m.animationName, 'the headline has an animation under reduced motion').toBe('none')
  expect(m.transform, 'the headline is transformed under reduced motion').toBe('none')
  expect(m.opacity, 'the headline is not fully opaque under reduced motion').toBe(1)

  const fig = page.locator('section#top .hh-fig')
  await expect(fig).toBeAttached()
  await page.waitForFunction(() => window.__heroAnims.some((a) => /^hh-panel/.test(a.name)), null, { polling: 'raf', timeout: 5000 })
    .catch(() => {})
  const anims = await page.evaluate(() => window.__heroAnims)
  expect(anims.filter((a) => /^hh-panel/.test(a.name)).map((a) => a.name), 'the panel does not fade under reduced motion').toContain('hh-panel-fade')
  expect(anims.some((a) => a.name === 'hh-panel-in'), 'the panel still rises under reduced motion').toBe(false)
})
