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
import { go, watch } from './helpers.js'
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
const RETIRED = [
  'no credit card',
  'credit card required',
  'no card',
  'ui system toolkit',
]

// The floor the positive control has to clear, and TWO measurements rather
// than one.
//
// The obvious single check — "body has some visible text" — is exactly the hole
// helpers.js documents at length: nineteen routes are `lazy()`, and while a
// chunk is in flight App.jsx renders a fallback INSIDE `<main>` that still
// carries the pill nav and the footer. Measured on this build, that fallback is
// **421 characters of body text with an EMPTY main**. A floor of a few hundred
// characters on `body` alone would have been satisfied by the fallback, and the
// absence checks below would then have proved nothing on any slow route.
//
// So the control is: body well clear of the fallback's 421, AND `main` itself
// carrying real text — `main` is 0 while the fallback is up, so it is the
// measurement that actually discriminates. The thinnest arrived route measured
// in helpers.js is /sitemap at body 4124 / main 3702, so both floors sit far
// below every real page and far above both failure shapes.
const MIN_BODY_CHARS = 900
const MIN_MAIN_CHARS = 300

const ROUTES = prerenderRoutes()

test.describe('the retired taglines are gone from every route', () => {
  // The route table is the same one the build prerenders from, so this cannot
  // drift out of step with what ships. If it is ever empty, that is a broken
  // import rather than a clean run — assert it before spending a browser on it.
  test('the walk has a route table to walk', async () => {
    expect(ROUTES.length, 'prerenderRoutes() returned nothing to walk').toBeGreaterThan(30)
  })

  for (const route of ROUTES) {
    test(`${route} shows neither retired tagline`, async ({ page }) => {
      const feedback = watch(page)
      await go(page, route)

      // ── The positive control ──
      // `innerText`, not textContent: textContent includes <script>, <template>
      // and display:none subtrees, so it reports text for a page that painted
      // nothing. innerText is what a sighted visitor has.
      const seen = await page.evaluate(() => ({
        body: document.body.innerText || '',
        main: document.querySelector('main')?.innerText || '',
      }))
      expect(
        seen.body.length,
        `${route} rendered ${seen.body.length} characters of body text — at or below the `
        + 'lazy-route fallback, so the absence checks below would have proved nothing. This is '
        + 'a broken route, not a passing tagline check.',
      ).toBeGreaterThan(MIN_BODY_CHARS)
      expect(
        seen.main.length,
        `${route} rendered ${seen.main.length} characters inside <main> — the loading `
        + 'fallback measures 0 here, so this route never arrived and proves nothing about the '
        + 'taglines.',
      ).toBeGreaterThan(MIN_MAIN_CHARS)

      // ── The absences, now that there is something to be absent FROM ──
      const haystack = seen.body.toLowerCase()
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
