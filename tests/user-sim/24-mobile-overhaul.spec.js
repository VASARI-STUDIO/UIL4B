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

async function openTouch(browser, width, height, path, tablet = false, waitFor = null) {
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
  // Wait for the thing under test to exist, rather than sleeping and hoping.
  // A fixed 600ms was enough against a `vite build` bundle and NOT enough
  // against the `vite build --mode test` bundle the acceptance suite actually
  // serves, so the login tests passed in isolation and failed in the suite with
  // a null element. A settle pause is still useful for layout, but it must not
  // be the thing that decides whether the element is there.
  if (waitFor) await page.locator(waitFor).first().waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForTimeout(400)
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

// ─────────────────────────────────────────────────────────────────────────────
// S7 · the login dialog on a short viewport
// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT ONLY. Nothing here touches the auth flow, the sign-in methods or any
// file listed in docs/reference/human-validation-zones.md — the Google button,
// the divider and both links are all still rendered, because winning back
// vertical space by removing a sign-in method would be an auth change wearing a
// layout change's clothes.
//
// The dialog genuinely cannot fit its content at 390px of viewport height, so
// it has to scroll; the defect was that nothing said so, and the primary submit
// was sliced across the scroll boundary, which reads as a rendering fault.

async function loginGeometry(page) {
  return page.evaluate(() => {
    const m = document.querySelector('.ui-modal')
    const mr = m.getBoundingClientRect()
    const visibleHeight = (el) => {
      const r = el.getBoundingClientRect()
      return Math.max(0, Math.min(r.bottom, mr.bottom) - Math.max(r.top, mr.top))
    }
    const submit = m.querySelector('.auth-submit')
    const signup = m.querySelector('.auth-links button')
    const controls = [...m.querySelectorAll('button,a,input')].filter((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    return {
      hiddenPx: Math.max(0, m.scrollHeight - m.clientHeight),
      submitH: Math.round(submit.getBoundingClientRect().height),
      submitVisibleH: Math.round(visibleHeight(submit)),
      signupVisibleH: Math.round(visibleHeight(signup)),
      // Controls with NOTHING showing at the initial scroll position. A control
      // peeking at the boundary is an affordance; one with zero pixels is not
      // there at all.
      entirelyBelowFold: controls.filter((e) => visibleHeight(e) === 0)
        .map((e) => (e.innerText || e.getAttribute('aria-label') || e.type || e.tagName).trim().slice(0, 30).replace(/\s+/g, ' ')),
      // The cue is the two `local` layers masking the two `scroll` layers.
      // Rendered proof that it appears only when there IS more is in the PR.
      hasScrollCue: /local/.test(getComputedStyle(m).backgroundAttachment),
    }
  })
}

// maxBuried is measured, not chosen. At 844x390 the dialog holds 451px of
// content in 372px, so ONE control (Forgot password?) still starts below the
// fold — the sign-up link above it peeks, which is the affordance that says so.
// Before the fix that number was 2: sign-up was buried with it. At 932x430
// nothing should be buried at all; before the fix Forgot password? was.
for (const [w, h, maxBuried] of [[844, 390, 1], [932, 430, 0]]) {
  test(`S7 · Login at ${w}x${h} shows a whole Sign In button and does not bury sign-up`, async ({ browser }) => {
    const { ctx, page } = await openTouch(browser, w, h, '/login', w >= 700, '.ui-modal')
    const g = await loginGeometry(page)
    await ctx.close()

    // The audit's headline: "the word Sign In is visible, the bottom half of its
    // background is not". Sliced, not merely small — so compare against its own
    // height rather than a magic number.
    expect(g.submitVisibleH, `the submit button is sliced by the dialog edge: ${g.submitVisibleH}px of ${g.submitH}px showing`)
      .toBe(g.submitH)

    // "For a signed-out visitor on a landscape phone, the account-creation link
    // is invisible." It does not have to be whole — peeking at the boundary IS
    // the affordance — but zero is a conversion path that does not exist.
    expect(g.signupVisibleH, 'the sign-up link is entirely below the fold with nothing to suggest it exists')
      .toBeGreaterThan(0)

    expect(g.entirelyBelowFold.length,
      `${g.entirelyBelowFold.length} control(s) start with zero pixels showing: ${g.entirelyBelowFold.join(' | ')}`)
      .toBeLessThanOrEqual(maxBuried)

    expect(g.hasScrollCue, 'the dialog scrolls with no scroll cue').toBe(true)
  })
}

test('S7 · portrait viewports still need no scrolling at all', async ({ browser }) => {
  // The short-height rules must not leak upward. These four were measured clean
  // by the audit and are the regression guard for the max-height:460px block.
  for (const [w, h] of [[360, 560], [390, 640], [390, 844], [768, 1024]]) {
    const { ctx, page } = await openTouch(browser, w, h, '/login', w >= 700, '.ui-modal')
    const g = await loginGeometry(page)
    await ctx.close()
    expect(g.hiddenPx, `${w}x${h}: the login dialog scrolls by ${g.hiddenPx}px and should not`).toBe(0)
    expect(g.submitVisibleH).toBe(g.submitH)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// S8 · every Settings section is on screen, and no label loses a letter
// ─────────────────────────────────────────────────────────────────────────────
// Two properties, because fixing the first is what created the risk of the
// second. The nav used to be a horizontal scroller with its scrollbar deleted,
// hiding Data Management (account deletion, data export) and Privacy & Legal
// (consent) — the two sections people open Settings specifically to find. It now
// wraps. Wrapping into narrow cells is exactly where a nowrap label starts
// spilling past its own card, which is the S15 fault in a different place, so
// the glyph check below is not belt-and-braces — it caught a real "Data
// Managemen" at 320px during this very fix.
// 560x800 and 640x800 sit in the 481-900 band, where the layout is the wrapping
// FLEX row rather than the <=480 grid. Without one of them a reintroduced
// overflow-x:auto is invisible: at <=480 the grid masks it, and at >=768 the five
// items already fit on one line. Found by mutation, not by inspection.
const SETTINGS_VIEWPORTS = [[320, 568], [360, 560], [390, 640], [390, 844], [430, 932], [560, 800], [640, 800], [768, 1024], [844, 390]]

test('S8 · all five Settings sections are reachable without swiping', async ({ browser }) => {
  const damage = []
  for (const [w, h] of SETTINGS_VIEWPORTS) {
    const { ctx, page } = await openTouch(browser, w, h, '/settings', w >= 700, '.settings-nav')
    const r = await page.evaluate(() => {
      const nav = document.querySelector('.settings-nav')
      const nr = nav.getBoundingClientRect()
      const items = [...nav.querySelectorAll('.settings-nav-item')]
      const offscreen = items.filter((i) => {
        const b = i.getBoundingClientRect()
        return b.right > nr.right + 0.5 || b.left < nr.left - 0.5
      }).map((i) => i.textContent.trim())
      return {
        count: items.length,
        offscreen,
        scrolls: nav.scrollWidth > nav.clientWidth + 1,
        under24: items.filter((i) => {
          const b = i.getBoundingClientRect()
          return b.width < 24 || b.height < 24
        }).length,
      }
    })
    await ctx.close()
    expect(r.count, `${w}x${h}: expected 5 section items`).toBe(5)
    if (r.offscreen.length) damage.push(`${w}x${h}: ${r.offscreen.length} section(s) outside the nav: ${r.offscreen.join(', ')}`)
    if (r.scrolls) damage.push(`${w}x${h}: the section nav is a horizontal scroller again`)
    if (r.under24) damage.push(`${w}x${h}: ${r.under24} section target(s) under 24px`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

test('S8 · no Settings section label spills outside its own card', async ({ browser }) => {
  // Range over the rendered glyphs, not innerText — innerText reads
  // "Data Management" whether or not the final t is on screen.
  const damage = []
  for (const [w, h] of SETTINGS_VIEWPORTS) {
    const { ctx, page } = await openTouch(browser, w, h, '/settings', w >= 700, '.settings-nav')
    const escapes = await page.evaluate(() => {
      const nav = document.querySelector('.settings-nav')
      const nr = nav.getBoundingClientRect()
      const out = []
      for (const it of nav.querySelectorAll('.settings-nav-item')) {
        const br = it.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(it)
        const tr = range.getBoundingClientRect()
        const past = Math.round(Math.max(0, tr.right - br.right) + Math.max(0, br.left - tr.left))
        const pastNav = Math.round(Math.max(0, tr.right - nr.right) + Math.max(0, nr.left - tr.left))
        if (past || pastNav) out.push(`${it.textContent.trim()} (${past}px outside its button, ${pastNav}px outside the card)`)
      }
      return out
    })
    await ctx.close()
    if (escapes.length) damage.push(`${w}x${h}: ${escapes.join(' | ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// S6 · the Information Centre fits the narrowest phone we support
// ─────────────────────────────────────────────────────────────────────────────
// body carries overflow-x:clip site-wide, so anything wider than the viewport is
// CUT OFF rather than scrolled to. "Is it wider" is therefore the wrong question
// on its own — the question is whether it is reachable, and whether the text
// survived. Both are asserted, because the fix for the first can cause the
// second: taking the floor off a grid track stops the page overflowing and
// starts the cards overflowing instead, which is what a first pass at this did.
const INFO_VIEWPORTS = [[320, 568], [360, 560], [390, 844], [430, 932], [560, 800], [768, 1024]]

test('S6 · nothing on /info is pushed outside a 320px phone', async ({ browser }) => {
  const damage = []
  for (const [w, h] of INFO_VIEWPORTS) {
    const { ctx, page } = await openTouch(browser, w, h, '/info', w >= 700, '.ic-wrap')
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const hasScrollableAncestor = (el) => {
        let n = el.parentElement
        while (n && n !== document.body) {
          const cs = getComputedStyle(n)
          if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true
          n = n.parentElement
        }
        return false
      }
      const unreachable = []
      for (const el of document.querySelectorAll('.ic-wrap, .ic-wrap *')) {
        const b = el.getBoundingClientRect()
        if (!b.width || !b.height) continue
        if (b.right > vw + 0.5 && !hasScrollableAncestor(el)) {
          unreachable.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`)
        }
      }
      // Glyph-level: text is the content of this page, and none of it can be
      // recovered by scrolling.
      const cut = []
      for (const el of document.querySelectorAll('.ic-wrap h1, .ic-wrap h2, .ic-wrap p, .ic-toc a')) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const tr = range.getBoundingClientRect()
        if (tr.right > vw + 0.5) cut.push(`"${el.textContent.trim().slice(0, 24)}" +${Math.round(tr.right - vw)}px`)
      }
      return { unreachable: unreachable.slice(0, 4), unreachableCount: unreachable.length, cut: cut.slice(0, 3) }
    })
    await ctx.close()
    if (r.unreachableCount) damage.push(`${w}x${h}: ${r.unreachableCount} element(s) outside the viewport with no scroller — ${r.unreachable.join(', ')}`)
    if (r.cut.length) damage.push(`${w}x${h}: text past the viewport edge — ${r.cut.join(', ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

test('S6 · the screen-stat cards keep their own text inside their own box', async ({ browser }) => {
  // The counter-guard. minmax(0,1fr) removes a track's min-content floor, which
  // is right for the page and wrong for the card if the card is then starved.
  const damage = []
  for (const [w, h] of INFO_VIEWPORTS) {
    const { ctx, page } = await openTouch(browser, w, h, '/info', w >= 700, '.ic-stat')
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ic-stat')]
      const escapes = []
      for (const card of cards) {
        const br = card.getBoundingClientRect()
        for (const el of [card, ...card.children]) {
          const range = document.createRange()
          range.selectNodeContents(el)
          const tr = range.getBoundingClientRect()
          const past = Math.round(Math.max(0, tr.right - br.right) + Math.max(0, br.left - tr.left))
          if (past > 1) escapes.push(`"${el.textContent.trim().slice(0, 18)}" +${past}px`)
        }
      }
      return { count: cards.length, minW: cards.length ? Math.round(Math.min(...cards.map(c => c.getBoundingClientRect().width))) : 0, escapes: escapes.slice(0, 3) }
    })
    await ctx.close()
    expect(r.count, `${w}x${h}: expected the four screen-stat cards`).toBe(4)
    if (r.escapes.length) damage.push(`${w}x${h}: card text outside its card (narrowest card ${r.minW}px) — ${r.escapes.join(', ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// S9 · collapsed accordions must not hold tab stops
// ─────────────────────────────────────────────────────────────────────────────
// The panel collapses with grid-template-rows 0fr, which animates well but,
// unlike display:none, leaves its descendants focusable. A keyboard, switch or
// screen-reader user was moved 8 times onto links inside a box of ZERO height
// with overflow:hidden — a focus ring on nothing.

test('S9 · no tab stop lands inside a collapsed /info panel', async ({ browser }) => {
  const { ctx, page } = await openTouch(browser, 390, 844, '/info', false, '.ic-acc-body')

  const shape = await page.evaluate(() => ({
    collapsed: [...document.querySelectorAll('.ic-acc-body')].filter((b) => !b.classList.contains('is-open')).length,
    focusables: [...document.querySelectorAll('.ic-acc-body:not(.is-open)')]
      .reduce((n, b) => n + b.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length, 0),
  }))
  expect(shape.collapsed, 'expected most panels collapsed on load').toBeGreaterThan(0)
  expect(shape.focusables, 'expected collapsed panels to contain focusable links — otherwise this test proves nothing').toBeGreaterThan(0)

  // Recorded in the page: reading activeElement between presses would add a
  // round-trip, and this is the same class of timing-sensitive measurement S13
  // was ruined by.
  await page.evaluate(() => {
    window.__inCollapsed = []
    document.addEventListener('focusin', (e) => {
      const body = e.target.closest('.ic-acc-body')
      if (!body || body.classList.contains('is-open')) return
      const inner = body.querySelector('.ic-acc-body-inner')
      window.__inCollapsed.push(`${(e.target.textContent || '').trim().slice(0, 24)} (panel height ${Math.round(inner.getBoundingClientRect().height)}px)`)
    })
    document.body.focus()
  })
  for (let i = 0; i < 60; i++) await page.keyboard.press('Tab')
  const landed = await page.evaluate(() => window.__inCollapsed)
  await ctx.close()

  expect(landed, `focus landed ${landed.length} time(s) inside a collapsed panel: ${landed.slice(0, 3).join(' | ')}`).toEqual([])
})

test('S9 · opening a panel gives its links back to the keyboard', async ({ browser }) => {
  // The counter-guard: it would be trivial to pass the test above by making
  // those links permanently unreachable.
  const { ctx, page } = await openTouch(browser, 390, 844, '/info', false, '.ic-acc-body')

  const id = await page.evaluate(() => {
    const target = [...document.querySelectorAll('.ic-acc-body')]
      .find((b) => !b.classList.contains('is-open') && b.querySelector('a[href]'))
    target.closest('.ic-acc').querySelector('.ic-acc-head').click()
    return target.id
  })
  await page.waitForTimeout(600)

  const state = await page.evaluate((pid) => {
    const b = document.getElementById(pid)
    return {
      open: b.classList.contains('is-open'),
      inert: b.hasAttribute('inert'),
      height: Math.round(b.querySelector('.ic-acc-body-inner').getBoundingClientRect().height),
    }
  }, id)
  expect(state.open).toBe(true)
  expect(state.inert, 'inert must lift when the panel opens').toBe(false)
  expect(state.height, 'an open panel should have real height').toBeGreaterThan(0)

  await page.evaluate((pid) => {
    window.__reached = 0
    document.addEventListener('focusin', (e) => {
      if (e.target.closest('#' + CSS.escape(pid))) window.__reached++
    })
    document.querySelector('.ic-acc-head').focus()
  }, id)
  for (let i = 0; i < 70; i++) await page.keyboard.press('Tab')
  const reached = await page.evaluate(() => window.__reached)
  await ctx.close()

  expect(reached, 'focus never reached inside the opened panel').toBeGreaterThan(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// S1 / S2 · Semantic Colours must show the scale it says it is showing
// ─────────────────────────────────────────────────────────────────────────────
// Both defects were the same shape: a control turned into a horizontal scroller
// with nothing to say it scrolls. What made S1 worse than an ordinary overflow
// is that the ramp's own border-radius drew its right edge rounded and CLOSED,
// so the control actively signalled "this is the end of the scale" while the
// page copy promised "every state gets a full 50–900 ramp" and the toolbar read
// "40 canonical tokens". Neither is asserted by counting DOM nodes — the cells
// were always in the DOM. What is asserted is how many are inside their own
// container's box.
const STC_VIEWPORTS = [[320, 568], [360, 560], [390, 844], [430, 932], [560, 800], [640, 800], [700, 800], [768, 1024]]

test('S1 · every tone in every ramp is on screen, with its hex', async ({ browser }) => {
  const damage = []
  for (const [w, h] of STC_VIEWPORTS) {
    const { ctx, page } = await openTouch(browser, w, h, '/color/semantic', w >= 700, '.stc-ramp')
    const r = await page.evaluate(() => {
      const ramps = [...document.querySelectorAll('.stc-ramp')]
      let hiddenCells = 0, scrollers = 0, tiny = 0, clipped = 0, sample = ''
      for (const ramp of ramps) {
        const rb = ramp.getBoundingClientRect()
        if (ramp.scrollWidth > ramp.clientWidth + 1) scrollers++
        for (const cell of ramp.querySelectorAll('.stc-cell')) {
          const cr = cell.getBoundingClientRect()
          if (cr.left < rb.left - 0.5 || cr.right > rb.right + 0.5) hiddenCells++
          if (cr.width < 24 || cr.height < 24) tiny++
          // The tone number and the hex are the output; a clipped one is the
          // S15 fault in a new place.
          for (const t of cell.querySelectorAll('.stc-cell-tone, .stc-cell-hex')) {
            const range = document.createRange()
            range.selectNodeContents(t)
            const tr = range.getBoundingClientRect()
            const past = Math.round(Math.max(0, tr.right - cr.right) + Math.max(0, cr.left - tr.left))
            if (past > 1) { clipped++; if (!sample) sample = `"${t.textContent.trim()}" +${past}px in a ${Math.round(cr.width)}px cell` }
          }
        }
      }
      return {
        ramps: ramps.length,
        cells: document.querySelectorAll('.stc-cell').length,
        hexShown: [...document.querySelectorAll('.stc-cell-hex')].filter((e) => getComputedStyle(e).display !== 'none').length,
        hiddenCells, scrollers, tiny, clipped, sample,
      }
    })
    await ctx.close()
    expect(r.cells, `${w}x${h}: expected 40 tone cells (4 ramps x 10)`).toBe(40)
    if (r.hiddenCells) damage.push(`${w}x${h}: ${r.hiddenCells} tone cell(s) outside their ramp`)
    if (r.scrollers) damage.push(`${w}x${h}: ${r.scrollers} ramp(s) are horizontal scrollers again`)
    if (r.hexShown !== 40) damage.push(`${w}x${h}: only ${r.hexShown} of 40 hex values rendered — the tool's output is unreadable here`)
    if (r.tiny) damage.push(`${w}x${h}: ${r.tiny} tone cell(s) under 24px`)
    if (r.clipped) damage.push(`${w}x${h}: ${r.clipped} clipped label(s), e.g. ${r.sample}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

test('S2 · all seven starting bundles are visible without swiping', async ({ browser }) => {
  const damage = []
  for (const [w, h] of STC_VIEWPORTS) {
    const { ctx, page } = await openTouch(browser, w, h, '/color/semantic', w >= 700, '.stc-bundles')
    const r = await page.evaluate(() => {
      const box = document.querySelector('.stc-bundles')
      const bb = box.getBoundingClientRect()
      const bundles = [...box.querySelectorAll('.stc-bundle')]
      return {
        total: bundles.length,
        outside: bundles.filter((b) => {
          const r2 = b.getBoundingClientRect()
          return r2.left < bb.left - 0.5 || r2.right > bb.right + 0.5
        }).length,
        scrolls: box.scrollWidth > box.clientWidth + 1,
      }
    })
    await ctx.close()
    expect(r.total, `${w}x${h}: expected 7 preset bundles`).toBe(7)
    if (r.outside) damage.push(`${w}x${h}: ${r.outside} of 7 bundles outside the picker`)
    if (r.scrolls) damage.push(`${w}x${h}: the bundle picker is a horizontal scroller again`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// ─────────────────────────────────────────────────────────────────────────────
// S16 · the Type Scale specimens are readable on a phone
// ─────────────────────────────────────────────────────────────────────────────
// The measurement has to cover BOTH axes. The specimen used to be clipped
// horizontally (nowrap + ellipsis); a two-line clamp would clip it vertically
// instead, and a width-only check reports that as clean. So "hidden" here is
// scrollWidth OR scrollHeight exceeding the box, and the assertion is on the
// FRACTION of the string that renders, not on whether an ellipsis appeared.

test('S16 · no Type Scale specimen is reduced to a fragment on a phone', async ({ browser }) => {
  const damage = []
  for (const [w, h] of [[320, 568], [360, 560], [390, 640], [390, 844], [430, 932], [768, 1024]]) {
    const { ctx, page } = await openTouch(browser, w, h, '/typescale', w >= 700, '.tsc-row-text')
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.tsc-row-text')]
      const hidden = []
      for (const el of rows) {
        // Horizontal clipping, and vertical clipping (a line clamp), in one number.
        const vScale = el.scrollHeight > el.clientHeight + 1 ? el.scrollHeight / el.clientHeight : 1
        const needs = el.scrollWidth * vScale
        const gets = el.clientWidth
        if (needs > gets + 1) {
          hidden.push(`${getComputedStyle(el).fontSize}: ${Math.round((gets / needs) * 100)}% shown (${gets} of ${Math.round(needs)}px)`)
        }
      }
      return { rows: rows.length, hidden }
    })
    await ctx.close()
    expect(r.rows, `${w}x${h}: expected the 9 specimen rows`).toBe(9)
    if (r.hidden.length) damage.push(`${w}x${h}: ${r.hidden.length} of 9 specimens cut — ${r.hidden.slice(0, 2).join(', ')}`)
  }
  expect(damage, damage.join('\n')).toEqual([])
})
