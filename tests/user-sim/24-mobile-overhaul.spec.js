// The mobile overhaul — rendered proof for docs/qa/mobile-audit-2026-08.md.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY EVERY ASSERTION HERE IS GEOMETRY AND NONE OF THEM IS TEXT
// ─────────────────────────────────────────────────────────────────────────────
// The audit's headline defect (S15) is a nav CTA that renders as "tart for Fre"
// between 769px and ~870px. Nothing in the DOM changes when that happens —
// `innerText` still reads "Start for Free". A `toHaveText` assertion therefore
// PASSES on the broken build, and so does an accessible-name check, and so does
// a screen reader. Only a sighted user sees the damage.
//
// The mechanism is that the label's inner span is `justify-items:center`, so it
// is sized to its own max-content and simply OVERHANGS the pill on both sides
// when the pill is squeezed. White text on a white bar is invisible. So the
// property that actually matters is: does the glyph run lie inside the painted
// button? That is what these tests measure — a DOM Range over the text node
// against the button's border box.
//
// Likewise the touch tests below assert computed `opacity` and hit-testing under
// REAL device metrics (isMobile + hasTouch), because a desktop Chromium narrowed
// to 390px still reports `hover: hover` and hides this entire class of defect.
import { test, expect } from '@playwright/test'
import { watch } from './helpers.js'

const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/**
 * A context with real device metrics. `isMobile`/`hasTouch` are what make
 * `matchMedia('(hover: hover)')` report false, which is the whole point: the
 * hover-revealed controls in this file are only broken on a device that cannot
 * hover, and a resized desktop window is not one.
 */
async function touch(browser, width, height, tablet = false) {
  return browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: tablet ? 2 : 3,
    isMobile: true,
    hasTouch: true,
    userAgent: tablet ? IPAD_UA : IOS_UA,
  })
}

async function openTouch(browser, width, height, path, tablet = false) {
  const ctx = await touch(browser, width, height, tablet)
  const page = await ctx.newPage()
  watch(page, `mobile overhaul ${width}x${height}`)
  // Google One Tap is live on app-shell routes signed out, and it would sit over
  // the very controls these tests hit-test. Served as an empty script rather
  // than aborted: an abort raises a console error that the feedback loop then
  // reports as a finding on every single viewport, and the point is to make One
  // Tap absent, not to make the network fail.
  await page.route('**accounts.google.com/gsi/**', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript', body: '',
  }).catch(() => {}))
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load').catch(() => {})
  await page.waitForTimeout(600)
  return { ctx, page }
}

// ─────────────────────────────────────────────────────────────────────────────
// S15 · the primary nav CTA is legible at every width
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How many pixels of the CTA's glyph run fall outside the pill's painted box,
 * plus the width of the `1fr` label track. Both are rendered geometry.
 */
async function ctaGeometry(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('.pnav-cta')
    if (!btn) return null
    const inner = btn.querySelector('.pnav-cta-i')
    const br = btn.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(inner)
    const tr = range.getBoundingClientRect()
    return {
      // The label's natural width, and the width the grid track gives it.
      needs: Math.round(tr.width * 100) / 100,
      track: Math.round(parseFloat(getComputedStyle(btn).gridTemplateColumns) * 100) / 100,
      // Glyphs painted outside the pill — white-on-white, i.e. gone.
      outside: Math.round((Math.max(0, br.left - tr.left) + Math.max(0, tr.right - br.right)) * 100) / 100,
      // The bar must not solve it by overrunning itself either: body has
      // overflow-x:clip, so an overrun is thrown away rather than scrolled to.
      navOverrun: (() => {
        const n = document.querySelector('.pnav-inner')
        return n ? Math.round(n.scrollWidth - n.clientWidth) : 0
      })(),
    }
  })
}

// 769 and 800 are where the track collapsed hardest (measured 0px and 6.58px on
// the broken build); 834 is iPad portrait, 844 is a landscape phone. 768, 900
// and 1024 were measured CLEAN by the audit and must stay clean.
const CTA_WIDTHS = [768, 769, 800, 834, 844, 870, 900, 960, 1024]

for (const path of ['/color/palette', '/settings']) {
  test(`S15 · "Start for Free" is fully painted at every width on ${path}`, async ({ browser }) => {
    const damage = []
    for (const w of CTA_WIDTHS) {
      const { ctx, page } = await openTouch(browser, w, 800, path, true)
      const g = await ctaGeometry(page)
      await ctx.close()
      expect(g, `${w}px: .pnav-cta missing`).not.toBeNull()
      if (g.outside > 0 || g.track + 0.5 < g.needs || g.navOverrun > 0) {
        damage.push(`${w}px: ${g.outside}px of the label outside the pill, track ${g.track}px for a ${g.needs}px label, bar overran itself by ${g.navOverrun}px`)
      }
    }
    expect(damage, damage.join('\n')).toEqual([])
  })
}

test('S15 · the .is-waiting reveal still animates its grid track open', async ({ browser }) => {
  // The fix pins flex-shrink and raises the actions cluster's min-width. Neither
  // may disturb the deliberate hide-on-load state, which collapses the SAME
  // `grid-template-columns` track to 0fr and animates it back. 834x700 is inside
  // the previously-broken band and short enough that #workbench starts below the
  // 60%-of-viewport trigger, so the pill really does start hidden.
  const { ctx, page } = await openTouch(browser, 834, 700, '/', true)

  const read = () => page.evaluate(() => {
    const b = document.querySelector('.pnav-cta')
    const cs = getComputedStyle(b)
    return {
      waiting: b.classList.contains('is-waiting'),
      track: Math.round(parseFloat(cs.gridTemplateColumns) * 100) / 100,
      opacity: Math.round(parseFloat(cs.opacity) * 100) / 100,
      tabIndex: b.tabIndex,
    }
  })

  const atRest = await read()
  expect(atRest.waiting, 'the CTA should start in its waiting state at the top of a sales page').toBe(true)
  expect(atRest.track, 'the waiting track must still collapse to 0').toBe(0)
  expect(atRest.opacity).toBe(0)
  expect(atRest.tabIndex, 'a hidden CTA must stay out of the tab order').toBe(-1)

  await page.evaluate(() => {
    const sec = document.getElementById('workbench') || document.getElementById('create')
    window.scrollTo({ top: sec.offsetTop, behavior: 'instant' })
  })

  // Sampled mid-transition: the track must INTERPOLATE, not jump-cut. A snap
  // here would mean the transition stopped running (see css-conventions.md —
  // a composite already carries its easing, so a stray `ease` kills it).
  await page.waitForTimeout(110)
  const mid = await read()
  expect(mid.track, `mid-reveal track was ${mid.track}px — the reveal jump-cut instead of easing`).toBeGreaterThan(0)

  await page.waitForTimeout(800)
  const shown = await read()
  expect(shown.waiting).toBe(false)
  expect(shown.opacity).toBe(1)
  expect(shown.tabIndex, 'a revealed CTA must be reachable by keyboard').toBe(0)
  const g = await ctaGeometry(page)
  expect(g.outside, 'the revealed CTA must be fully painted').toBe(0)
  expect(mid.track, 'mid-reveal should be part-way, not already finished').toBeLessThan(shown.track)

  await ctx.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// S11 / S12 / S14 · nothing may be invisible at rest AND still take taps
// ─────────────────────────────────────────────────────────────────────────────
// One property, asserted the same way everywhere, because the audit found one
// mistake repeated across four surfaces: a control hidden at rest and revealed
// by :hover, on a device that has no hover. `display:none` is NOT counted — a
// control deliberately removed at a breakpoint is a design decision. A control
// painted at opacity 0 or visibility:hidden while still accepting pointer events
// is the defect: it is undiscoverable AND live, which is worse than missing,
// because a tap meant for the swatch underneath can run Remove or Duplicate with
// nothing on screen to explain what happened.

/** Controls that are invisible at rest but still hit-testable. */
async function ghostTargets(page, selector) {
  return page.evaluate((sel) => {
    const out = []
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const invisible = parseFloat(cs.opacity) === 0 || cs.visibility === 'hidden'
      if (invisible && cs.pointerEvents !== 'none') {
        out.push(`${el.getAttribute('aria-label') || el.className} (${cs.opacity}/${cs.visibility}, ${Math.round(r.width)}x${Math.round(r.height)})`)
      }
    }
    return out
  }, selector)
}

const TOUCH_MATRIX = [
  // The audit measured these BROKEN — tablet portrait and landscape, and both
  // landscape phones. 769px is where the old max-width:768px correction stopped
  // being true, which is why a tablet got a worse surface than a phone.
  [844, 390], [932, 430], [834, 1194], [1024, 768], [1180, 820],
  // And these CLEAN. They must stay clean.
  [768, 1024], [390, 844], [320, 568],
]

const REVEAL_CASES = [
  { route: '/color/palette', sel: '.plb-tool', what: 'S11 · Palette Builder per-swatch tools' },
  { route: '/color/palette', sel: '.plb-gap', what: 'S11 · Palette Builder insert-between buttons' },
  { route: '/discover/palettes', sel: '.pgal-act', what: 'S12 · Palette Library per-card actions' },
  { route: '/community', sel: '.ch-heart', what: 'S14 · Community like buttons' },
]

for (const c of REVEAL_CASES) {
  test(`${c.what} are never invisible-but-live on a touch device`, async ({ browser }) => {
    const damage = []
    for (const [w, h] of TOUCH_MATRIX) {
      const { ctx, page } = await openTouch(browser, w, h, c.route, w >= 700)
      // Prove the emulation is doing its job before trusting the result. A
      // desktop Chromium narrowed to 390px still reports hover:hover, and would
      // pass every assertion below on the broken build.
      const caps = await page.evaluate(() => ({
        hover: matchMedia('(hover: hover)').matches,
        coarse: matchMedia('(pointer: coarse)').matches,
      }))
      expect(caps, `${w}x${h}: device emulation lost — this test is meaningless without hover:none`).toEqual({ hover: false, coarse: true })
      const ghosts = await ghostTargets(page, c.sel)
      await ctx.close()
      if (ghosts.length) damage.push(`${w}x${h}: ${ghosts.length} invisible-but-live ${c.sel} — e.g. ${ghosts[0]}`)
    }
    expect(damage, damage.join('\n')).toEqual([])
  })
}

test('the hover reveal itself is preserved on pointer devices', async ({ browser }) => {
  // The cheap way to pass the four tests above is to delete the hover reveal
  // outright. That would be a regression in the other direction — a resting
  // swatch is meant to be a clean colour field on a device that CAN hover. So
  // assert the pointer behaviour explicitly: hidden at rest, shown on hover.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })
  const page = await ctx.newPage()
  watch(page, 'pointer user on the palette builder')
  await page.goto('/color/palette', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load').catch(() => {})
  await page.waitForTimeout(600)

  expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(true)

  const tool = page.locator('.plb-tool').first()
  expect(await tool.evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
    'a pointer device should still get a clean swatch at rest').toBe(0)

  await page.locator('.plb-col').first().hover()
  await page.waitForTimeout(350)
  expect(await tool.evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
    'hovering the column must still reveal its tools').toBe(1)

  await ctx.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// S13 · `visibility` must never be inside a transition, on any path
// ─────────────────────────────────────────────────────────────────────────────
// `visibility` is a DISCRETE property: transitioning it does not fade anything,
// it flips the value at 50% of the duration. So the reveal costs a frame, and a
// focus advance faster than one frame skips the control entirely. This is a
// property of the stylesheet, so assert it directly on the computed style —
// including under reduced motion, where the same mistake was duplicated in the
// prefers-reduced-motion variant and therefore survived a reduced-motion retest.
const REVEAL_LAYERS = [
  ['/discover/palettes', '.pgal-actions'],
  ['/community', '.ch-heart'],
  ['/color/palette', '.plb-tool'],
]

for (const [route, sel] of REVEAL_LAYERS) {
  test(`S13 · ${sel} never transitions visibility (normal and reduced motion)`, async ({ browser }) => {
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      })
      const page = await ctx.newPage()
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('load').catch(() => {})
      await page.waitForTimeout(500)
      const props = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).transitionProperty)
      await ctx.close()
      expect(props, `${sel} (reduced motion: ${reduced}) still lists visibility in its transition: ${props}`)
        .not.toMatch(/visibility/)
    }
  })
}

test('S13 · the palette card actions are reachable by keyboard at any tab speed', async ({ browser }) => {
  // METHODOLOGY, and it is load-bearing (see the audit): focus moves must be
  // recorded IN THE PAGE with a focusin listener and read once at the end. An
  // evaluate() between Tab presses adds ~100ms of round-trip and silently turns
  // a 0-of-5 into a 5-of-5 — the naive version of this test reports a pass at
  // every speed on the broken build.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'keyboard user in the palette library')
  await page.goto('/discover/palettes', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('load').catch(() => {})
  await page.waitForTimeout(600)

  await page.evaluate(() => {
    window.__seq = []
    document.addEventListener('focusin', (e) => {
      window.__seq.push((e.target.className || e.target.tagName).toString().split(' ')[0])
    })
    document.querySelector('.pgal-card').scrollIntoView({ block: 'center', behavior: 'instant' })
  })
  await page.waitForTimeout(250)

  // 0ms is the case that failed: the whole sequence completes inside one
  // animation frame, style is never recomputed, and the browser skipped the
  // layer. 250ms is a relaxed human speed and always passed, so it proves
  // nothing on its own — both are asserted so the result cannot be speed-luck.
  const reachedAt = {}
  for (const gap of [0, 250]) {
    await page.evaluate(() => { window.__seq = []; document.querySelector('.pgal-stripe').focus() })
    for (let i = 0; i < 26; i++) {
      await page.keyboard.press('Tab')
      if (gap) await page.waitForTimeout(gap)
    }
    reachedAt[gap] = await page.evaluate(() => window.__seq.filter((s) => s === 'pgal-act').length)
  }
  await ctx.close()

  expect(reachedAt[0], `only ${reachedAt[0]} action buttons reached at full tab speed — the reveal is costing a frame again`).toBeGreaterThan(0)
  expect(reachedAt[0], `reachability is speed-dependent: ${reachedAt[0]} at 0ms vs ${reachedAt[250]} at 250ms`).toBe(reachedAt[250])
})

test('S12 · the touch action row does not cover the palette it acts on', async ({ browser }) => {
  // The first shape of this fix left the actions as a permanent overlay, which
  // hid 85% of the fourth stripe and 35% of the third at tablet widths. A
  // control layer that obscures the artefact it operates on is a different
  // defect, not a fix — so assert the swatch is intact, not merely that the
  // buttons are visible.
  for (const [w, h] of [[390, 844], [834, 1194], [1180, 820]]) {
    const { ctx, page } = await openTouch(browser, w, h, '/discover/palettes', w >= 700)
    const covered = await page.evaluate(() => {
      const card = document.querySelector('.pgal-card')
      const acts = card.querySelector('.pgal-actions').getBoundingClientRect()
      return [...card.querySelectorAll('.pgal-stripe')]
        .map((s, i) => {
          const r = s.getBoundingClientRect()
          const ov = Math.max(0, Math.min(r.bottom, acts.bottom) - Math.max(r.top, acts.top))
          return ov > 1 ? `stripe ${i + 1}: ${Math.round(ov)}px of ${Math.round(r.height)}px hidden` : null
        })
        .filter(Boolean)
    })
    await ctx.close()
    expect(covered, `${w}x${h}: ${covered.join(', ')}`).toEqual([])
  }
})
