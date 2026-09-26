// The mobile overhaul — rendered proof for the August 2026 mobile audit (S1–S16).
// That audit was deleted 2026-09-05; docs/qa/defect-register-2026-08.md says what
// each number was and which test below holds it.
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
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

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
  // One Tap used to be stubbed here, per page. It is now stubbed for the whole
  // suite in base.js — including contexts built by hand like this one — so this
  // spec's own copy went with it rather than racing it. See base.js for why.
  await go(page, path)
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
// THE SIGNED-OUT HEADER CTA IS THE FILE'S UPGRADE PILL (App line 122). The sliding "Start for Free"
// pill this measured is gone from the bar — a visitor opens the tools without
// an account — so the same S15 guarantees are read off `.pnav-upgrade`: the
// label fully inside its pill, the bar not overrunning itself, painted and
// reachable from the first frame.
async function ctaGeometry(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('.pnav-upgrade')
    if (!btn || !btn.getClientRects().length) return null
    const br = btn.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(btn)
    const tr = range.getBoundingClientRect()
    const cs = getComputedStyle(btn)
    return {
      // The label's natural width, and the width the pill gives it.
      needs: Math.round(tr.width * 100) / 100,
      track: Math.round((btn.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 100) / 100,
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
  test(`S15 · the signed-out Upgrade pill is fully painted at every width on ${path}`, async ({ browser }) => {
    const damage = []
    for (const w of CTA_WIDTHS) {
      const { ctx, page } = await openTouch(browser, w, 800, path, true)
      const g = await ctaGeometry(page)
      await ctx.close()
      expect(g, `${w}px: .pnav-upgrade missing`).not.toBeNull()
      if (g.outside > 0 || g.track + 0.5 < g.needs || g.navOverrun > 0) {
        damage.push(`${w}px: ${g.outside}px of the label outside the pill, track ${g.track}px for a ${g.needs}px label, bar overran itself by ${g.navOverrun}px`)
      }
    }
    expect(damage, damage.join('\n')).toEqual([])
  })
}

/**
 * The tests above take their reading a fixed 400ms after `load`, which only
 * measures the finished layout if the pill is not still animating then. It was.
 *
 * PillNav seeded `ctaReady` to a flat `false`, so the CTA mounted in .is-waiting
 * on EVERY route and the scroll effect revealed it one tick after hydration —
 * playing a 280ms grid-track reveal on app-shell routes that have no #workbench
 * gate to wait for. MEASURED at 768px on /settings: track 0 → 87.55px, settling
 * at load+310ms idle and load+440ms under a 4× CPU throttle. Past 400ms the
 * reading above is a frame of the animation, which is why CI reported a
 * different short track at every width and a different one per shard for the
 * same width (1024px read 85.97 on one and 50.20 on the other) while `needs`
 * never moved. A layout fault is the same number every time; that was not one.
 *
 * So this asserts the property the width tests assume rather than test: on a
 * route with no scroll gate the pill is CORRECT AT FIRST PAINT — no waiting
 * class, full track, and in the tab order — read the instant it attaches, with
 * no settle pause to hide a reveal behind. Deliberately not a "wait until it
 * stops moving" check: that would go green on a pill that animates in late,
 * which is the defect.
 */
for (const path of ['/color/palette', '/settings']) {
  test(`S15 · the CTA is painted on arrival, not animated in, on ${path}`, async ({ browser }) => {
    const ctx = await touch(browser, 768, 800, true)
    const page = await ctx.newPage()
    watch(page, `cta first paint ${path}`)
    // One Tap is stubbed suite-wide in base.js; this spec's own copy is gone.
    await go(page, path)
    await page.locator('.pnav-upgrade').first().waitFor({ state: 'attached', timeout: 15000 })
    const first = await page.evaluate(() => {
      const b = document.querySelector('.pnav-upgrade')
      const range = document.createRange()
      range.selectNodeContents(b)
      const cs = getComputedStyle(b)
      return {
        waiting: b.classList.contains('is-waiting'),
        track: Math.round((b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 100) / 100,
        needs: Math.round(range.getBoundingClientRect().width * 100) / 100,
        hidden: b.getAttribute('aria-hidden'),
        tabIndex: b.tabIndex,
      }
    })
    await ctx.close()
    expect(first.waiting, `${path} has no #workbench gate, so the CTA must never mount in the waiting state`).toBe(false)
    expect(first.track + 0.5, `the CTA's label track was ${first.track}px for a ${first.needs}px label on arrival — it is still animating open`).toBeGreaterThanOrEqual(first.needs)
    expect(first.hidden, 'a painted CTA must not be aria-hidden, not even for the length of an entrance').toBeNull()
    expect(first.tabIndex, 'a painted CTA must be reachable by keyboard from the first paint').toBe(0)
  })
}

// ── DELETED: 'S15 · the .is-waiting reveal still animates its grid track open'
//
// WHAT IT GUARDED. The S15 fix pinned flex-shrink and raised the actions
// cluster's min-width, and neither was allowed to disturb the deliberate
// hide-on-load state the sales page used: `.pnav-cta.is-waiting` collapses the
// SAME `grid-template-columns` track to 0fr, at opacity 0 and tabIndex -1, and
// animates it back once the visitor reaches the tools section. The test drove
// `/` at 834x700, caught the FIRST non-zero frame of the track rather than a
// frame at a fixed offset, and asserted it was well short of the finished
// width — so a jump-cut (the transition having stopped running) failed, and so
// did a reveal that never started.
//
// WHY IT IS GONE. The gate has no route left to fire on. PillNav reveals the
// waiting CTA from `document.getElementById('workbench') || …('create')`, and
// after the route swap NOTHING in src/ renders either id: Home.jsx carried
// `#workbench` and is deleted, Spectrum's bench is `#bench`, and `/` does not
// mount the app header at all — it mounts the marketing pill
// (`PillNav variant="spectrum"`), which has no "Start for Free" pill to hide.
// The remaining SALES_PATHS entries (/plans, /pricing) have no gate section
// either, so `ctaReady`'s effect flips it true on its first synchronous call
// and the waiting state is never observable.
//
// Re-pointing it at /plans was tried and rejected for exactly that reason: the
// `atRest` reading there is a race against an effect that has already run, so
// the test would be flaky in the good case and green in the bad one. A test
// that cannot fail is the thing this file's header is written against.
//
// WHERE THE SURVIVING PART LIVES. The two `S15 · the CTA is painted on arrival`
// tests above, which now describe every route rather than the non-sales ones:
// no waiting class, full label track, not aria-hidden and in the tab order,
// read the instant the pill attaches. They are the half that was about the
// VISITOR; this one was about the animation of a state the product can no
// longer enter.
//
// The `is-waiting` rules in the stylesheet and the `ctaReady` gate in
// PillNav.jsx are now unreachable code. That has been reported to the director
// rather than removed here — this lane does not edit src/.

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
  await go(page, '/color/palette')
  await page.waitForLoadState('load').catch(() => {})
  await page.waitForTimeout(600)

  expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(true)

  // The drawn lock (D:1021) is always on the swatch; the colour's actions
  // menu beside it is the one control that waits for the pointer.
  expect(await page.locator('.plb-tool--key').first().evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
    'the lock is drawn at rest').toBe(1)
  const tool = page.locator('.plb-tool--more').first()
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
  ['/discover/palettes', '.lbry-card-actions'],
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
      await go(page, route)
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
  await go(page, '/discover/palettes')
  await page.waitForLoadState('load').catch(() => {})
  // Wait for the card to EXIST before the settle pause, not instead of it. The
  // gallery windows its list, so on a contended runner nothing is mounted at
  // 600ms and the in-page `document.querySelector('.pgal-card')` below crashed
  // CI with `Cannot read properties of null (reading 'scrollIntoView')` — the
  // same fault openTouch() above was fixed for, and raising the 600 would only
  // move the coin flip. The stripe is waited for as well because it is the
  // element the tab loop itself dereferences. The pause stays: layout after
  // mount is still worth settling, it just no longer decides whether the test
  // has anything to measure.
  await expect(page.locator('.pgal-card').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.pgal-stripe').first()).toBeVisible({ timeout: 15000 })
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
    // waitFor, not the settle pause: MEASURED, .pgal-card lands 326–351ms after
    // `load` on an idle machine and 360–503ms under a 4× CPU throttle, against
    // openTouch's fixed 400ms. It was always a coin flip on a contended runner
    // and CI lost it twice, crashing on a null card rather than failing an
    // assertion. Measured the same both sides of #254's Discover rewrite
    // (pre-#254 median 493ms, post 401ms), so the gallery is not the regression
    // — the fixed pause was never long enough to be the thing that decides.
    const { ctx, page } = await openTouch(browser, w, h, '/discover/palettes', w >= 700, '.pgal-card')
    const covered = await page.evaluate(() => {
      const card = document.querySelector('.pgal-card')
      const acts = card.querySelector('.lbry-card-actions').getBoundingClientRect()
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
          // The tone number is the drawn label (D:934) and a clipped one is
          // the S15 fault in a new place. The hex is in the cell's name.
          for (const t of cell.querySelectorAll('.stc-cell-tone')) {
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
        hexShown: [...document.querySelectorAll('.stc-cell')].filter((e) => /#[0-9A-F]{6}/.test(e.getAttribute('aria-label') || '')).length,
        hiddenCells, scrollers, tiny, clipped, sample,
      }
    })
    await ctx.close()
    // Derived from the ramps actually on the page, not a typed 40. This
    // assertion was written when there were four roles and had to be edited by
    // hand the moment a fifth arrived - the same stale-literal fault the hero
    // strip and the handoff button both carried. What it is really guarding is
    // "every ramp is complete", so say that.
    const expectedCells = r.ramps * 10
    expect(r.ramps, `${w}x${h}: no semantic ramps rendered at all`).toBeGreaterThan(0)
    expect(r.cells, `${w}x${h}: expected ${expectedCells} tone cells (${r.ramps} ramps x 10)`).toBe(expectedCells)
    if (r.hiddenCells) damage.push(`${w}x${h}: ${r.hiddenCells} tone cell(s) outside their ramp`)
    if (r.scrollers) damage.push(`${w}x${h}: ${r.scrollers} ramp(s) are horizontal scrollers again`)
    if (r.hexShown !== expectedCells) damage.push(`${w}x${h}: only ${r.hexShown} of ${expectedCells} tone cells name their hex — the tool's output is unreadable here`)
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
      const bundles = [...box.querySelectorAll('[role="radio"]')]
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

// ──────────────────────────────────────────────────────────────────────────────
// The 834px tool stack [palette-swatch-actions-tablet]
// ──────────────────────────────────────────────────────────────────────────────
// The REVEAL_CASES above ask whether a control is invisible-but-live. This asks
// the opposite question, and neither one implies the other: are there simply
// TOO MANY of them, permanently, on top of the thing the page exists to show?
//
// The defect was composed, not written. Above 768px a swatch column is vertical
// and the tool stack runs down it; `@media(hover:hover)` was the only thing
// hiding that stack at rest. An iPad in landscape is 834px wide AND reports
// hover:none, so it took the desktop vertical column and the permanent
// visibility together: seven unlabelled 32px icons stacked over ~450px of
// swatch, five columns at once, 35 buttons sitting on the colours. 1280 hid
// them until hover; 390 laid them out as a short row under the name and hex.
//
// COUNT is what is asserted: only the lock and the overflow control are on a
// colour in this band. (PLACEMENT was asserted too, the row below the name and
// hex; the design's drawn board puts the lock at the column's top corner, D:1021, so
// that half went with the redraw.)
//
// And the overflow control must be PRESENT, not merely the others absent: the
// cheap way to pass a count assertion is to delete the actions outright, which
// would be a worse product than the one being fixed.
//
// REAL DEVICE METRICS ARE THE WHOLE TEST. `hover:none` is what makes this bug
// exist. A desktop Chromium narrowed to 834px reports hover:hover, renders the
// correct desktop layout, and would pass every assertion below on a fully
// reverted stylesheet. The caps assertion is therefore not a formality — it is
// the half that makes the rest mean anything.
const PINNED_BAND = [
  [834, 1194],  // iPad portrait — the width the audit reported
  [1180, 820],  // iPad Pro landscape
  [1024, 768],  // the old 4:3 tablet, still above the 768px cutover
]

test('S11b · the touch band collapses the swatch tool stack instead of pinning seven icons open', async ({ browser }) => {
  const damage = []
  for (const [w, h] of PINNED_BAND) {
    const { ctx, page } = await openTouch(browser, w, h, '/create/palette', true, '.plb-col')

    const caps = await page.evaluate(() => ({
      hover: matchMedia('(hover: hover)').matches,
      coarse: matchMedia('(pointer: coarse)').matches,
    }))
    expect(caps, `${w}x${h}: device emulation lost — this test is meaningless without hover:none, because the defect only exists on a device that cannot hover`)
      .toEqual({ hover: false, coarse: true })

    const r = await page.evaluate(() => {
      const shown = (el) => {
        if (!el || el.offsetParent === null) return false
        const s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false
        const b = el.getBoundingClientRect()
        return b.width > 0 && b.height > 0
      }
      const cols = [...document.querySelectorAll('.plb-col')].filter(c => c.offsetParent !== null)
      return cols.map((col, i) => {
        const tools = [...col.querySelectorAll('.plb-tool')].filter(shown)
        return {
          i,
          count: tools.length,
          labels: tools.map(t => t.getAttribute('aria-label') || t.className),
          hasOverflow: tools.some(t => t.classList.contains('plb-tool--more')),
        }
      })
    })
    await ctx.close()

    // The sample cannot collapse to nothing: five columns, each with controls.
    expect(r.length, `${w}x${h}: no palette columns rendered, so this proves nothing`).toBeGreaterThan(2)

    for (const c of r) {
      if (c.count > 2) {
        damage.push(`${w}x${h} col${c.i}: ${c.count} controls pinned open — ${c.labels.join(', ')}`)
      }
      if (c.count === 0) {
        damage.push(`${w}x${h} col${c.i}: no controls at all — touch must keep persistent controls`)
      }
      if (!c.hasOverflow) {
        damage.push(`${w}x${h} col${c.i}: no .plb-tool--more, so the hidden actions are unreachable on touch`)
      }
    }
  }
  expect(damage, damage.join('\n')).toEqual([])
})

// REVERSED 2026-09-13, BY THE FOUNDER, AFTER USING THE PAGE. This test used to
// assert the opposite — that the phone row keeps all seven controls — on the
// grounds that an audit had called that row "legible and clearly authored" and
// that adding the overflow control there "would be an eighth icon in a row that
// already works". The founder looked at /create/palette at ~660px and said:
//
//   "im finding alot of basic UI problems that can be replaced with better UI
//    design such as replacing some buttons with a drop down or other large
//    issues"
//
// The old reasoning is answered by the SHAPE of the change rather than ignored:
// the overflow control does not join seven icons, it replaces five of them. The
// row is three — Lock, Copy, More — not eight. Measured across 320/360/390/
// 430/660/768 before the change: seven painted `.plb-tool` per column on five
// columns, 35 unlabelled icon targets on one screen. After: 15, each with a
// visible-to-a-reader name, every hidden action still reachable by name in the
// "Colour actions" menu, row heights byte-identical (88/88/88/96/111), nothing
// covered at 390x568, 390x640 or 320x568, and `.plb-role` — which had been
// `display:none` below 769px — back in the 128px that frees.
//
// If this is ever reversed again, reverse it because the founder looked at the
// rendered page again, not because an audit preferred the older row.
//
// The design's drawn board (D:1017-1043) puts one control on a colour, the
// lock at its top corner; copy is the hex itself. The row is now Lock and the
// named "More actions" menu, which holds every other action on the colour.
test('S11b · the phone row collapses to two controls and a named menu', async ({ browser }) => {
  const { ctx, page } = await openTouch(browser, 390, 844, '/create/palette', false, '.plb-col')

  const caps = await page.evaluate(() => ({
    hover: matchMedia('(hover: hover)').matches,
    coarse: matchMedia('(pointer: coarse)').matches,
  }))
  expect(caps, '390x844: device emulation lost — this test is meaningless without hover:none')
    .toEqual({ hover: false, coarse: true })

  const r = await page.evaluate(() => {
    const shown = (el) => {
      if (!el || el.offsetParent === null) return false
      const s = getComputedStyle(el)
      if (s.display === 'none') return false
      const b = el.getBoundingClientRect()
      return b.width > 0 && b.height > 0
    }
    const col = [...document.querySelectorAll('.plb-col')].filter(c => c.offsetParent !== null)[0]
    const tools = [...col.querySelectorAll('.plb-tool')].filter(shown)
    return {
      count: tools.length,
      overflow: tools.filter(t => t.classList.contains('plb-tool--more')).length,
    }
  })
  await ctx.close()

  expect(r.count, 'the phone row is the lock and the overflow control — no more, and never zero')
    .toBe(2)
  expect(r.overflow, 'without the overflow control the five collapsed actions would be unreachable on a phone')
    .toBe(1)
})
