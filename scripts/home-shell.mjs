// THE HOMEPAGE'S HEADLINE, IN THE SERVED HTML, SO LCP DOES NOT WAIT FOR REACT.
//
// ── What was measured ───────────────────────────────────────────────────────
//
// On scripts/home-field-metrics.mjs's profile (Pixel 5, CDP 150 ms / 204800 B/s,
// CPU 4x, cold context per run, 10 runs) the homepage painted at FCP 1690 ms and
// recorded LCP at 3662 ms. The LCP element was `SPAN.home-hero-line-in` — the
// hero headline — in every run of every build.
//
// The ~1.9 s between them was not paint work. `grep -c home-hero-h1
// dist/index.html` was 0: the served shell painted `.boot-shell`, a skeleton of
// grey boxes whose `.boot-title` is an empty `<i>`. The headline could not exist
// until the 455,541-byte entry chunk had arrived, evaluated, run React and laid
// the page out. #456 split the render-blocking stylesheet and moved FCP by
// 927 ms; it moved LCP by 162 ms, because first paint and largest paint were
// waiting on two different things.
//
// So this puts the real headline into the served `/` shell. It paints with the
// stylesheet, at FCP, out of the same CSS rules the hydrated page uses.
//
// ── NOTHING HERE IS TYPED ───────────────────────────────────────────────────
//
// The sentence lives in src/data/positioning.js. It is imported, never restated. A second hard-coded
// copy of an approved sentence is the defect class this repository keeps paying
// for — scripts/site-pricing.mjs records the same argument for prices, and
// tests/unit/index-html-pricing.test.js fails the build if a price-shaped
// string reappears in index.html. tests/unit/home-shell-hero.test.js is the
// equivalent guard for this sentence: index.html and this file must both
// contain none of it, and what this module emits must equal what
// src/components/home/HomeHero.jsx renders, part for part.
//
// ── WHY THE MARKUP IS THE HYDRATED MARKUP, ELEMENT FOR ELEMENT ──────────────
//
// The shell's headline and the hydrated headline occupy the same pixels or the
// change is not worth having, for two separate reasons:
//
//   LAYOUT. A shell headline that sits anywhere but where React will put it is
//   a layout shift dressed up as a performance win. CLS on this page is 0 and
//   stays 0.
//
//   LCP ITSELF. Chrome records a text element's largest-paint size the first
//   time it paints and never re-sizes it, but a LATER element that paints a
//   LARGER area becomes a new candidate. The hydrated headline is a different
//   DOM node, so if it paints bigger than the shell's did, LCP moves back to
//   hydration and this whole file buys nothing.
//
// Both are answered the same way: emit `.spectrum > main > section.hh-hero >
// .hh-copy > h1.hh-h1` with the marked run in one `span.hh-h1-mark`, and let
// src/styles/pages/home-hero.css, the render-blocking sheet, do the typography.
// Font, size, weight, line-height, letter-spacing, wrap points and position
// then come from ONE set of rules, not from a copy of them. The hero's
// padding-top reserves the nav's height, so the skeleton nav below is
// `position:fixed` and contributes nothing to flow.
//
// ── WHAT A VISITOR SEES BETWEEN FIRST PAINT AND HYDRATION, AND WHY ──────────
//
// The headline, settled, exactly where it will stay. It does not animate in,
// and it does not animate again when React arrives. That is one decision made
// twice over, and the second half of it is forced by how Chrome measures LCP.
//
// WHAT WAS MEASURED, on this profile, with the shell hero left running the
// `home-hero-clip-up` entrance (3 runs, all identical in shape):
//
//     1664ms  clip-up START [shell]        2734ms  clip-up DONE [shell]
//     3529ms  clip-up START [react]        4951ms  clip-up DONE [react]
//     LCP candidates: SPAN.home-hero-line-in@1720ms/2369px²
//
// LCP was perfect — one candidate, at first paint — and the page was worse to
// look at: the headline rose, sat still for seven hundred milliseconds, then
// dropped and rose again, finishing 5 seconds in. Two entrances is not a
// performance win, it is a double-render with a good number attached.
//
// AND SUPPRESSING ONLY THE SECOND ONE DOES NOT WORK. Chrome records a text
// element's LCP size on its first painted frame. With the entrance running, the
// shell's span is recorded at a 2369 px² SLIVER (the clip-up starts at
// translate 110% behind `.home-hero-line`'s overflow:hidden — see
// tests/unit/hero-first-paint.test.js for that geometry). A settled hydrated
// headline paints its whole box, which is far LARGER, so it becomes a new LCP
// candidate and the metric walks straight back to hydration.
//
// So the shell's headline has to be recorded at its FULL size, which means its
// first painted frame has to be the settled one, which means no entrance in the
// shell either. Both copies then paint the same box, the second is never a
// larger candidate, and LCP stays at first paint.
//
// THE ENTRANCE IS NOT RETIRED — it is now correctly conditional. It exists to
// announce a headline arriving after the page did. Here the headline arrives
// WITH the page, so there is nothing to announce, and `data-hero-prepainted`
// (below) turns it off for exactly that hero. Arrive at `/` later in the same
// session, from another route, and the hero mounts into a page that is already
// there — an arrival — and the clip-up plays as it always has.
// `prefers-reduced-motion` is untouched: those two rules in global.css already
// say `animation:none`, and none of this restates them.
// The hero's words: one module feeds both the hydrated hero and this shell.
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB } from '../src/components/spectrum/spectrumHero.js'
import { logoSvg } from '../src/config/brandLogo.js'

/** Escape for text between tags. Same contract as prerender.mjs's `text()`. */
const text = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The two landmarks the replacement is anchored between. `<div id="root">` is
// pinned by tests/unit/lazy-route-readiness.test.js and `<noscript>` is the
// next top-level block in the body, so neither can drift without a test saying
// so. Anchored rather than pattern-matched because a regex over the whole shell
// would silently match less of it after an edit.
export const ROOT_OPEN = '<div id="root">'
export const AFTER_ROOT = '<noscript>'

/**
 * The attribute that says "this document already painted its headline".
 *
 * It goes on <html>, in the SERVED markup, so it is in effect before the
 * stylesheet paints anything — there is no frame in which the shell's headline
 * is mid-entrance. src/styles/global.css reads it to turn the clip-up off for
 * the hero it describes, and src/pages/Home.jsx drops it when the homepage
 * unmounts, so the next arrival at `/` is a real arrival and animates.
 */
export const PREPAINTED_ATTR = 'data-hero-prepainted'

/**
 * The sales page sets its text in Geist, which no other route uses, so the file
 * is preloaded in this shell's head and nowhere else. It is one variable file,
 * so the one preload covers the 600 headline and the 400 sub-line. Without it
 * the file is only discovered once the stylesheet is parsed, the headline
 * paints in the fallback face first, and the swap shifts it.
 *
 * This lives here, not in the per-route head rewrite in prerender.mjs: `/` is
 * not in the route matrix (see HOME_SHELL_ROUTES), so a head rewrite keyed on
 * `/` never ran, and `/home` is a second shell for the same page.
 * `crossorigin` is required: fonts are fetched in CORS mode, and a preload
 * without it is downloaded twice.
 */
export const HOME_FONT_PRELOAD = '<link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>'

/**
 * index.html preloads Switzer, the face every other route is set in. The sales
 * page does not use it (its text is Geist), so on this shell the preload would
 * fetch 11 KB at high priority in the same wave as the stylesheets for a file
 * nothing paints with. Matched on the href so the rest of the tag can change.
 */
export const SWITZER_PRELOAD = /<link\b[^>]*\brel="preload"[^>]*\bhref="[^"]*Switzer-Variable\.woff2"[^>]*>\n?/

/**
 * The URLs that serve the sales page, and therefore the only shells that get
 * this headline.
 *
 * `/` is NOT in scripts/route-matrix.mjs — the matrix carries `/home`, which
 * src/utils/routeMeta.js canonicalises onto `/` — so `/` is served straight out
 * of `dist/index.html`, the one file prerender otherwise never rewrites (see
 * the `transformIndexHtml` note in vite.config.js). Both are listed here so the
 * set is the answer to "which shells say this", rather than a `/home` special
 * case in the loop and an unexplained extra write after it.
 *
 * WHAT IS KNOWINGLY WRONG FOR ONE VISITOR. App.jsx renders the sales page at
 * `/` only for a visitor with no signed-in session hint; a returning signed-in
 * visitor is redirected to their app home instead. The shell cannot know which,
 * and it deliberately does not try: reading `vs-session` here would put a second
 * reader of that key outside src/utils/sessionHint.js, whose whole argument is
 * that the decision lives in ONE place. The shell was already marketing-shaped
 * for that visitor — a kicker, a title and three cards — so what changes for
 * them is that the placeholder now has words in it, not who it is wrong for.
 */
export const HOME_SHELL_ROUTES = new Set(['/', '/home'])

/**
 * The `/` shell's #root contents.
 *
 * The hero is the chain src/components/home/HomeHero.jsx renders, so the served
 * headline sits on the same pixels the hydrated one will:
 * `.spectrum > main > section#top.hh-hero > .hh-copy > h1.hh-h1`, with the
 * marked run in a single `span.hh-h1-mark`, then the sub-line. The headline is
 * plain text with no entrance, so its first painted frame is its settled one.
 * The typography comes from src/styles/pages/home-hero.css, which is in the
 * render-blocking sheet.
 *
 * `id="boot-shell"` stays, and so do the things read through it:
 * tests/user-sim/helpers.js `ready()` treats its absence as "React has
 * committed", and 04-premium-home.spec.js asserts the status live region, the
 * single `aria-hidden` decoration wrapper and a `.boot-card`. The decoration
 * comes AFTER `<main>` so the skeleton strip flows below the hero instead of
 * pushing it down; the nav inside it is fixed, so where it sits in the tree
 * does not matter.
 *
 * The skeleton bars are `<span>`s, not `<i>`s. `<i>` is italic by default, and
 * an italic box set in Switzer (the `.boot-shell` face) makes the browser fetch
 * Switzer-VariableItalic.woff2 for a bar with no text in it. The sheet gives
 * every bar `display:block`, so they draw the same.
 */
function heroH1() {
  return `<h1 class="hh-h1">${text(SPECTRUM_HERO.lead)} <span class="hh-h1-mark">${text(SPECTRUM_HERO.mark)}</span>${text(SPECTRUM_HERO.tail)}</h1>`
}

export function homeShellRoot() {
  return `${ROOT_OPEN}
  <div class="boot-shell boot-shell-home" id="boot-shell">
    <span class="boot-status" role="status" aria-live="polite">Loading UIL4B</span>
    <div class="spectrum">
      <div class="sp-grain" aria-hidden="true"></div>
      <main>
        <section id="top" class="hh-hero">
          <div class="hh-glow" aria-hidden="true"><span></span></div>
          <div class="hh-copy">
            ${heroH1()}
            <p class="hh-sub">${text(SPECTRUM_HERO_SUB)}</p>
          </div>
        </section>
      </main>
      <div class="boot-decoration" aria-hidden="true">
        <div class="boot-nav">
          ${logoSvg({ attrs: 'class="boot-mark" aria-hidden="true" focusable="false"' })}
          <span class="boot-nav-lines"><span class="boot-line"></span><span class="boot-line"></span><span class="boot-line"></span></span>
          <span class="boot-actions"><span class="boot-action"></span><span class="boot-action"></span></span>
        </div>
        <div class="boot-below">
          <div class="boot-cards"><span class="boot-card"></span><span class="boot-card"></span><span class="boot-card"></span></div>
        </div>
      </div>
    </div>
  </div>
</div>
`
}

/**
 * Swap the generic skeleton for the homepage one. THROWS rather than passing
 * the html through: a silent no-op here would ship the skeleton shell while the
 * build stayed green and the field metric quietly went back to 3.6 s, which is
 * the same invisible failure scripts/site-pricing.mjs throws to avoid.
 *
 * Applied to `/` ONLY. Every other route shell — and the 404 — keeps the
 * generic skeleton, because the headline in it is THIS page's headline, and
 * painting it on /plans before the real page arrives would be a lie the shell
 * told on the product's behalf.
 */
export function applyHomeShell(html) {
  // The <html> attribute FIRST, so the two body anchors are located in the
  // string that is actually spliced. Finding them before this edit and slicing
  // after it would shift every index by the width of the attribute — a quiet
  // off-by-22 that would cut the shell open mid-tag.
  const opened = html.replace(/<html\b([^>]*)>/, (whole, attrs) => (
    attrs.includes(PREPAINTED_ATTR) ? whole : `<html${attrs} ${PREPAINTED_ATTR}>`
  ))
  if (!opened.includes(PREPAINTED_ATTR)) {
    throw new Error(
      `home-shell: could not put ${PREPAINTED_ATTR} on <html>. Without it the hydrated `
      + 'headline re-runs the entrance the shell has already finished — a visible '
      + 'double-render, and a larger LCP candidate that moves the metric back to hydration.',
    )
  }

  const open = opened.indexOf(ROOT_OPEN)
  const after = opened.indexOf(AFTER_ROOT)
  if (open === -1 || after === -1 || after < open) {
    throw new Error(
      `home-shell: could not find ${ROOT_OPEN} … ${AFTER_ROOT} in the built shell. `
      + 'index.html has changed shape — fix the anchors rather than shipping a homepage '
      + 'whose headline waits for React.',
    )
  }
  const shelled = opened.slice(0, open) + homeShellRoot() + opened.slice(after)
  const unswitzered = shelled.replace(SWITZER_PRELOAD, '')
  if (unswitzered.includes(HOME_FONT_PRELOAD)) return unswitzered
  if (!unswitzered.includes('</head>')) {
    throw new Error('home-shell: could not find </head> to put the Geist preload before.')
  }
  // Last in the head, after the stylesheets and the scripts: the first paint
  // waits on the stylesheets, and this 29 KB font requested ahead of them (or
  // ahead of the scripts) cost 95 to 170 ms of LCP on the throttled mobile profile.
  return unswitzered.replace('</head>', `${HOME_FONT_PRELOAD}\n</head>`)
}

/**
 * Read the finished file back and prove the headline is in it.
 *
 * The same reasoning `assertPricingSubstituted` in scripts/prerender.mjs
 * records: the way a build-time substitution fails is silently. This is the
 * only step that looks at what was actually written, and a shell that lost its
 * headline would otherwise ship a green build whose field metric had quietly
 * gone back to waiting for React.
 */
export function assertHomeShellApplied(html, where) {
  const wanted = [
    ['the hero section', '<section id="top" class="hh-hero">'],
    ['the h1', '<h1 class="hh-h1">'],
    ['the lead', `${text(SPECTRUM_HERO.lead)} <span class="hh-h1-mark">`],
    ['the highlight', `<span class="hh-h1-mark">${text(SPECTRUM_HERO.mark)}</span>`],
    [`${PREPAINTED_ATTR} on <html>`, PREPAINTED_ATTR],
    ['the Geist preload', HOME_FONT_PRELOAD],
  ]
  const missing = wanted.filter(([, needle]) => !html.includes(needle)).map(([label]) => label)
  if (SWITZER_PRELOAD.test(html)) {
    throw new Error(`home-shell: ${where} still preloads Switzer, which the sales page does not use.`)
  }
  if (missing.length) {
    throw new Error(
      `home-shell: ${where} was written without ${missing.join(', ')}. The homepage would `
      + 'paint a skeleton and wait for React for its largest paint again.',
    )
  }
}
