// Reduced motion vs. scroll-snap rails.
//
// `global.css` carried a reduced-motion guard for `.dsc-rail-track`, a class
// that ships nowhere (its component, `components/discover/FeaturedRail.jsx`,
// was deleted in PR #196 and the stylesheet block outlived it). Meanwhile the
// two rails that DO ship — the Palette Builder action ribbon and the Gradient
// Generator preset strip — carried `scroll-snap-type` with no guard at all.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THESE TESTS MEASURE A SCROLL POSITION AND NOT A COMPUTED STYLE
// ─────────────────────────────────────────────────────────────────────────────
// Reading `scroll-snap-type` back proves the declaration parsed; it does not
// prove the guard reached the element, and it does not prove there was anything
// to guard. So each rail is scrolled to a position that is deliberately NOT a
// snap point and the position is read back after the engine has settled. The
// difference between that and the same operation with snapping switched off is
// the snap pull — the scroll displacement the user did not ask for, in pixels.
// Under reduced motion it must be 0. In the control run it must not be, or the
// test never reached the code.
//
// ─────────────────────────────────────────────────────────────────────────────
// HOW REDUCED MOTION IS TURNED ON HERE, AND WHY IT IS NOT THE OS QUERY ALONE
// ─────────────────────────────────────────────────────────────────────────────
// `AppearanceContext` writes `data-reduced-motion` on <html> and is
// authoritative; the OS media query is only the fallback for when the attribute
// is absent. On this branch the boot script in index.html writes
// `String(!!a.reducedMotion)` unconditionally, so a visitor who has never
// touched the Settings toggle gets the explicit string "false" — which by
// contract BEATS `prefers-reduced-motion: reduce`. PR #273
// (`fix/reduced-motion-resolution`) fixes that and is not merged here or into
// main, so `reducedMotion: 'reduce'` on its own reduces nothing on this build.
//
// The primary tests therefore drive the real user path — the stored appearance
// preference the Settings toggle writes — which exercises the
// `html[data-reduced-motion="true"]` half and is live today. One further test
// covers the `@media(prefers-reduced-motion:reduce)` half by clearing the
// fabricated attribute, so the fallback selector is proven independently of the
// boot script. All three keep passing once #273 lands.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// The two rails that ship, at a width where each is a scroller.
// `.plb-toolbar-group:last-child` scrolls in two bands (769–960 and ≤768).
// `.ggn-presets` used to scroll at EVERY width, and a 1440px case was listed
// here for exactly that reason. It no longer does: from 981px up the strip
// wraps to a grid and the sixteen presets are all on screen at once, so there
// is no scroll position left for a snap to pull. Its phone case below is
// still a scroller and still carries the guard pair.
const RAILS = [
  { name: 'Palette Builder action ribbon', sel: '.plb-toolbar-group:last-child', path: '/color/palette', width: 390, height: 844 },
  { name: 'Palette Builder action ribbon (mid-band)', sel: '.plb-toolbar-group:last-child', path: '/color/palette', width: 900, height: 900 },
  { name: 'Gradient Generator preset rail', sel: '.ggn-presets', path: '/color/gradient', width: 390, height: 844 },
]

/**
 * Open `path` at an exact viewport under real touch device metrics.
 * `reduced` writes the stored appearance preference BEFORE the boot script
 * runs, which is exactly what the Settings toggle persists — not a synthetic
 * attribute poke, and not the OS query the boot script currently overrides.
 */
async function open(browser, { width, height, path, reduced }) {
  const tablet = width >= 700
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: tablet ? 2 : 3,
    isMobile: true,
    hasTouch: true,
    userAgent: tablet ? IPAD_UA : IOS_UA,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  const page = await ctx.newPage()
  watch(page, `motion guards ${width}x${height} ${path}${reduced ? ' [reduced]' : ''}`)
  // One Tap is stubbed for the whole suite in base.js, on the context — which
  // covers this hand-built one. Not routed again here: a page route takes
  // precedence over a context route, so a second copy would silently win the
  // race base.js exists to remove.
  if (reduced) {
    await page.addInitScript(() => {
      try { localStorage.setItem('vs-appearance', JSON.stringify({ reducedMotion: true })) } catch { /* private mode */ }
    })
  }
  await go(page, path)
  await page.waitForLoadState('load').catch(() => {})
  return { ctx, page }
}

/**
 * Scroll `sel` to a position between two snap points and report how far the
 * engine moved it, against the same operation with snapping switched off.
 * Returns `{ present, scrollable, pull, snapType }`.
 */
async function snapPull(page, sel) {
  await page.locator(sel).first().waitFor({ state: 'attached', timeout: 15000 })
  return page.evaluate(async (s) => {
    const el = document.querySelector(s)
    if (!el) return { present: false }
    const scrollable = el.scrollWidth - el.clientWidth
    const kids = [...el.children]
    const settle = () => new Promise((r) => setTimeout(r, 260))
    const rest = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    if (scrollable <= 4 || kids.length < 2) {
      return { present: true, scrollable, pull: null, snapType: getComputedStyle(el).scrollSnapType }
    }
    // 55% into the first child is between two snap points by construction.
    const target = Math.min(Math.round(kids[0].getBoundingClientRect().width * 0.55), scrollable)
    el.scrollLeft = 0; await rest()
    el.scrollLeft = target; await settle()
    const snapped = el.scrollLeft
    const prev = el.style.scrollSnapType
    el.style.scrollSnapType = 'none'
    el.scrollLeft = 0; await rest()
    el.scrollLeft = target; await settle()
    const free = el.scrollLeft
    el.style.scrollSnapType = prev
    return {
      present: true, scrollable, target, snapped, free,
      pull: Math.round(Math.abs(snapped - free)),
      snapType: getComputedStyle(el).scrollSnapType,
    }
  }, sel)
}

// ─────────────────────────────────────────────────────────────────────────────
// Reduced motion on — no rail may pull the scroll position
// ─────────────────────────────────────────────────────────────────────────────
test('reduced motion · no shipping scroll-snap rail moves the scroll position', async ({ browser }) => {
  const offenders = []
  for (const rail of RAILS) {
    const { ctx, page } = await open(browser, { ...rail, reduced: true })
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-reduced-motion'))
    const r = await snapPull(page, rail.sel)
    if (attr !== 'true') offenders.push(`${rail.name} @${rail.width}px: reduced motion never applied (data-reduced-motion=${attr})`)
    else if (!r.present) offenders.push(`${rail.name} @${rail.width}px: rail absent`)
    else if (r.pull === null) offenders.push(`${rail.name} @${rail.width}px: rail does not overflow (${r.scrollable}px), nothing measured`)
    else if (r.pull !== 0) offenders.push(`${rail.name} @${rail.width}px: ${r.pull}px snap pull (${r.target} → ${r.snapped}, free ${r.free}), scroll-snap-type=${r.snapType}`)
    await ctx.close()
  }
  expect(offenders, offenders.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// The control run — OS preference quiet, no stored preference
// ─────────────────────────────────────────────────────────────────────────────
// Without this the clamped numbers above prove nothing: a rail that never
// snapped, or that stopped overflowing, reports a 0px pull and passes. This
// asserts the opposite of the test above on the same builds and the same
// widths, so a guard that leaked out of its selector fails here.
test('control · the same rails DO snap when motion is not reduced', async ({ browser }) => {
  const silent = []
  for (const rail of RAILS) {
    const { ctx, page } = await open(browser, { ...rail, reduced: false })
    const r = await snapPull(page, rail.sel)
    if (!r.present) silent.push(`${rail.name} @${rail.width}px: rail absent`)
    else if (!r.pull) silent.push(`${rail.name} @${rail.width}px: no snap pull with motion allowed (scrollable ${r.scrollable}px, scroll-snap-type=${r.snapType}) — the reduced-motion assertion above is measuring nothing`)
    await ctx.close()
  }
  expect(silent, silent.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// The OS-preference fallback selector
// ─────────────────────────────────────────────────────────────────────────────
// The attribute is authoritative and the media query is the fallback for when
// it is absent. Clearing the attribute is what makes that fallback reachable on
// this branch, because the boot script fabricates an explicit "false" for a
// default visitor (PR #273). This asserts the fallback's own selector —
// `html:not([data-reduced-motion="false"])` inside
// `@media(prefers-reduced-motion:reduce)` — resolves against the real rails.
test('reduced motion · the prefers-reduced-motion fallback reaches both rails', async ({ browser }) => {
  const offenders = []
  for (const rail of RAILS) {
    const { ctx, page } = await open(browser, { ...rail, reduced: false })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.evaluate(() => document.documentElement.removeAttribute('data-reduced-motion'))
    const r = await snapPull(page, rail.sel)
    if (!r.present) offenders.push(`${rail.name} @${rail.width}px: rail absent`)
    else if (r.pull === null) offenders.push(`${rail.name} @${rail.width}px: rail does not overflow, nothing measured`)
    else if (r.pull !== 0) offenders.push(`${rail.name} @${rail.width}px: ${r.pull}px snap pull under the OS fallback, scroll-snap-type=${r.snapType}`)
    await ctx.close()
  }
  expect(offenders, offenders.join('\n')).toEqual([])
})
