// The two taglines the founder retired, and the proof they are gone from every
// route the site prerenders.
//
// ── Why this file exists ────────────────────────────────────────────────────
//
// Founder, 2026-09-07: "remove the no credit card required tag line and the Ui
// system toolkit tag line these all over the place is a huge AI Slop feature".
//
// "All over the place" is the important half. Both strings had spread across
// surfaces that do not import each other — the hero, the sign-up popup, the
// closing CTA's DEFAULT prop, a colour landing page, three separate places on
// /plans — so removing them once, in the place you happen to be looking, is how
// this comes back. Nothing in the repo could have told you where they all were.
//
// So the check is a WALK, not a grep of the files the removal touched. It reads
// the same route table `scripts/prerender.mjs` builds shells from, visits every
// route in a real browser, and reads the VISIBLE text of each one. A string
// reintroduced on any route, by any future change, fails here.
//
// ── This is a rendered check on purpose ─────────────────────────────────────
//
// A unit test over the source files would be cheaper and would have been
// wrong. The claim is about what a visitor SEES, and the sources it can appear
// from include a default prop, a `.map()` over a config array, and a string
// composed at render time — none of which a file grep resolves. It also has to
// survive the retirement of `HomeHeroDirections`, whose copy lived in a
// component the router only mounted behind a query string.
//
// ── EVERY ABSENCE IS PAIRED WITH A PRESENCE ─────────────────────────────────
//
// `not.toContain()` is trivially true of a page that rendered nothing, and this
// repo has been bitten by exactly that (the h1 assertion satisfied by a word
// that never varied, #394). A route that 404s, boots to the static shell, or
// throws into the ErrorBoundary would PASS a bare absence check while proving
// nothing.
//
// So each route must first clear a POSITIVE CONTROL — non-zero visible text,
// above a floor that a boot shell or an error card cannot reach — and only then
// is it checked for the strings. The control is asserted per route, not once
// for the run, because a single dead route in the middle of the walk is exactly
// the case a run-level control misses.

import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'

// The retired strings, lower-cased for a case-insensitive comparison.
//
// CASE MATTERS AND IS DELIBERATELY DISCARDED. A case-sensitive absence check is
// one of this repo's named failure modes: "No Credit Card" would have walked
// straight through a check written against "no credit card".
//
// `no card` is included as well as `no credit card` because that is the form
// the hero, the login popup and two of the three /plans instances actually
// used. It is the broadest of the three and it is the one that catches a
// paraphrase.
// ─────────────────────────────────────────────────────────────────────────────
// KNOWN RED AS OF THE ROUTE SWAP, AND IT IS THE PRODUCT, NOT THIS FILE
// ─────────────────────────────────────────────────────────────────────────────
// `/` and `/home` currently FAIL on 'no card'. The front door's reassurance row
// ships `{ icon: 'card', label: 'No card needed for Free' }` —
// src/components/spectrum/spectrumFacts.js, `ASSURANCES` — which is the exact
// class of line the founder retired on 2026-09-07 ("remove the no credit card
// required tag line … these all over the place is a huge AI Slop feature").
//
// That row's own comment shows the check that was made and the one that was
// not: it records dropping the design's "Cancel Pro any time" because /plans
// had deleted the same claim, and says nothing about the card line, so the
// retirement was simply not known to whoever built the row.
//
// This walk is left RED rather than exempted, because an exemption here is
// indistinguishable from the tagline being allowed back — which is the exact
// mechanism the file's header describes ("removing them once, in the place you
// happen to be looking, is how this comes back"). The fix is one line in
// spectrumFacts.js and it is the founder's call whether anything replaces it;
// his instruction last time was to delete the clause, not reword it.
const RETIRED = [
  'no credit card',
  'credit card required',
  'no card',
  'ui system toolkit',
  // ── Retired by the 2026-09-09 anti-slop audit (70-anti-slop-marketing) ──
  // Each of these was on a surface the founder had ruled on the shape of; the
  // walk keeps them off every route rather than the one they were found on.
  // "Systems worth stealing." — his verdict: "bad copy" — was back on
  // /discover as "Find systems worth stealing."
  'worth stealing',
  // The footer tagline, on every page. A tagline is the thing he retired.
  'operating workspace',
  // Payment reassurance, the retired "no card" class: the homepage price lede
  // and the /plans closing hint both said it.
  'no trial clock',
  // The homepage closing banner's hint and headline.
  'upgrade only when',
  'first decision to clean handoff',
  // The negation over the Curated Resources grid heading. (The gallery
  // masthead sentences — "…with a point of view…" — are NOT swept: they were
  // deleted and restored in the same audit because three contracts pin a
  // masthead with a description and the 390px masthead is a hole without one;
  // they wait on the founder's rewrite.)
  'hand-picked, not scraped',
]

// ── The positive control is the suite's own, not a floor I picked ───────────
//
// My first version of this used a character floor on `document.body.innerText`.
// It was wrong twice over and the suite caught both:
//
//   · A body floor cannot tell a rendered page from a LOADING FALLBACK. Nineteen
//     routes are `lazy()`, and while a chunk is in flight App.jsx renders a
//     fallback inside <main> that still carries the pill nav and the footer —
//     measured at 421 characters of body text.
//   · Any floor high enough to clear that is too high for the real pages.
//     Measured across all 35 prerendered routes on this build, the thinnest are
//     /feedback (603 body / 171 main), /create/alt-text (725/293) and
//     /create/palette (759/326) — graphics-heavy tools that are genuinely
//     text-light. A 900-character floor failed five perfectly good routes.
//
// `expectRendered()` is the control this suite already owns and it is strictly
// better than either number: it fails on App.jsx's ErrorBoundary card FIRST
// (a crash card passes any content count), and then counts the route's OWN
// content — body text minus the nav and footer every route carries — so a
// blank shell cannot satisfy it however much chrome is on screen.
// ── `/` IS NOT IN prerenderRoutes(), AND THAT NEARLY MADE THIS TEST USELESS ──
//
// The build writes the homepage from `index.html` rather than as a generated
// route shell, so the prerender matrix — correctly, for its own purposes —
// starts at /community and never lists `/`. Walking it verbatim meant this spec
// visited 35 routes and skipped the ONE page both retired taglines actually
// lived on: the hero kicker and the hero's "Free to use. No card." are both on
// `/`, and so is the SystemCTA whose hint carried the third instance.
//
// It was found by mutation, not by reading: putting "No credit card required"
// back into Home.jsx's SystemCTA hint and rebuilding left all 36 tests GREEN.
// An absence check that cannot see the page the string lives on is exactly the
// "assertion that cannot fail" this repo keeps paying for.
//
// So the homepage is prepended explicitly, and deduped in case the matrix ever
// starts including it.
const ROUTES = [...new Set(['/', ...prerenderRoutes()])]

test.describe('the retired taglines are gone from every route', () => {
  // The route table is the same one the build prerenders from, so this cannot
  // drift out of step with what ships. If it is ever empty, that is a broken
  // import rather than a clean run — assert it before spending a browser on it.
  test('the walk has a route table to walk', async () => {
    expect(ROUTES.length, 'prerenderRoutes() returned nothing to walk').toBeGreaterThan(30)
    // The homepage is the page both taglines lived on. If it ever falls out of
    // this list again, the walk is worth very little.
    expect(ROUTES, 'the walk no longer visits the homepage').toContain('/')
  })

  for (const route of ROUTES) {
    test(`${route} shows neither retired tagline`, async ({ page }) => {
      const feedback = watch(page)
      await go(page, route)

      // ── The positive control ──
      // Crash card first, then the route's own content count. Only once this
      // has passed is there anything for the tagline check to be absent FROM.
      await expectRendered(page, route)

      // ── THE HAYSTACK IS textContent, NOT innerText, AND THAT IS THE WHOLE
      //    DIFFERENCE BETWEEN THIS TEST WORKING AND NOT ──
      //
      // innerText was the obvious choice — "what a sighted visitor has" — and it
      // is blind to most of this site. `useHomeMotion()` calls
      // `gsap.set('[data-reveal]', { autoAlpha: 0 })`, and GSAP's autoAlpha is
      // opacity PLUS `visibility: hidden`. innerText skips visibility:hidden
      // subtrees, so until a section is scrolled into view its text is not in
      // innerText at all.
      //
      // Measured on this build at 1440x900: the homepage's SystemCTA hint was
      // present in the DOM as
      //   <p class="system-cta-hint">No credit card required · …</p>
      // while `document.querySelector('.system-cta').innerText` returned the
      // EMPTY STRING and body innerText was 3,474 characters that did not
      // include it. The mutation that put the tagline back was green.
      //
      // textContent sees it, and it is also the right question: the claim is
      // that the string is not on the page, including in a section the visitor
      // has not scrolled to yet and including in sr-only text a screen reader
      // would announce. Script and style contents are stripped because those
      // are not content.
      const visible = await page.evaluate(() => {
        const clone = document.body.cloneNode(true)
        clone.querySelectorAll('script, style, template, noscript').forEach((n) => n.remove())
        return clone.textContent || ''
      })

      // ── The absences, now that there is something to be absent FROM ──
      const haystack = visible.toLowerCase()
      for (const phrase of RETIRED) {
        expect(
          haystack,
          `${route} shows the retired tagline "${phrase}". The founder removed it on `
          + '2026-09-07 ("these all over the place is a huge AI Slop feature") and asked that '
          + 'nothing replace it — delete the clause, do not reword it.',
        ).not.toContain(phrase)
      }

      void feedback
    })
  }
})
