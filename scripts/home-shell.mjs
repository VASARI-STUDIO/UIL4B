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
import { SPECTRUM_HERO, SPECTRUM_HERO_SUB, SPECTRUM_SEARCH_PHRASES } from '../src/components/spectrum/spectrumHero.js'
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
 * index.html preloads Switzer, the face every other route is set in, at the top
 * of the head, ahead of the stylesheets. The shell's nav bar is set in it
 * (`.spnav` takes --font), so the file is wanted here too, but not at that
 * position: it would queue ahead of the render-blocking sheets. This pattern
 * finds index.html's copy so the shell can take it out and put one tag straight
 * after the sheets instead, beside Geist. Matched on the href so the rest of
 * the tag can change.
 *
 * One file is enough. It is the variable upright, so the one preload covers
 * every weight the nav paints, and the italic is never fetched because nothing
 * in the shell is italic. Without the preload the file is requested only once
 * the stylesheet is parsed, the nav paints in 'Switzer Fallback' (the
 * metric-matched Arial in global.css: size-adjust, ascent-override,
 * descent-override, font-display:swap) and the swap changes the nav's text
 * widths: under a pixel on a Windows Chromium, several pixels where text is laid
 * out on whole-pixel advances, which a layout-shift observer reports as a shift
 * inside the nav. With the preload the file lands with the sheets, before the
 * first paint on a fast link, so there is no swap to report.
 *
 * THE COST, measured on the throttled mobile profile (CDP 150 ms / 200 KB/s,
 * CPU 4x, cold, median of 7): the 43 KB file shares the pipe with the sheets and
 * moves LCP by about +180 ms at 1440 and +170 ms at 390 (`fetchpriority="low"`
 * halves that, but then arrives no earlier than it would without the preload on a
 * fast link, which is the case it is here for). LCP stays under 1.5 s.
 */
export const SWITZER_PRELOAD = /<link\b[^>]*\brel="preload"[^>]*\bhref="[^"]*Switzer-Variable\.woff2"[^>]*>\n?/

export const HOME_SWITZER_PRELOAD = '<link rel="preload" href="/fonts/switzer/Switzer-Variable.woff2" as="font" type="font/woff2" crossorigin>'

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

/**
 * A static copy of the hydrated nav bar (src/components/SpectrumNav.jsx), same
 * classes, so the stylesheet that sizes the real one sizes this one and React's
 * mount replaces it pixel for pixel. It is `inert` and `aria-hidden` for the
 * seconds before hydration: nothing in it takes focus or a click, and the real
 * nav is the one assistive tech meets. The links are the ones the real bar has
 * on the sales page, written out because the component cannot be imported here.
 */
function shellNav() {
  const glass = (size) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>`
  return `<nav class="spnav" aria-hidden="true" inert data-nav-hidden="0" data-nav-pinned="0" data-scrolled="0">
        <div class="spnav-bar">
          <span class="spnav-mark"><span class="spnav-word">${logoSvg({ attrs: 'class="brand-logo brand-logo--lockup brand-logo-wide" focusable="false"' })}</span></span>
          <div class="spnav-end">
            <div class="spnav-quiet"><span class="spnav-quiet-link">Tools</span><span class="spnav-quiet-link">Plans</span><span class="spnav-quiet-link">On mobile</span></div>
            <span class="spnav-search">${glass(15)}<span>Search tools</span><kbd>Ctrl K</kbd></span>
            <div class="spnav-phone"><span class="spnav-icon">${glass(17)}</span><span class="spnav-icon spnav-burger"><span class="spnav-burger-ico" data-burger="out"><span></span><span></span></span></span></div>
          </div>
        </div>
      </nav>`
}

/** The hero's two buttons: real links, so they work before React arrives. */
const SHELL_CTA = `<div class="hh-cta">
              <a class="hh-go" href="/projects">Open the toolkit<span class="hh-go-disc" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17L17 7M8 7h9v9"></path></svg></span></a>
              <a class="hh-ghost ui-pill-out" href="/plans">View plans</a>
            </div>`

/** The search frame, same chain as SpectrumSearch, inert until the real one mounts. */
/**
 * The input carries a `placeholder` for one reason: spectrum.css hides the ghost
 * phrase whenever the field is `:not(:placeholder-shown)`, and an input with no
 * placeholder attribute never matches `:placeholder-shown`. Without it the
 * served ghost was `display:none` and the phrase popped in at mount. The sheet
 * paints the placeholder transparent, so it never shows; the visible words are
 * the ghost's, the first of SpectrumSearch's phrases, which is also what the
 * live search shows on its first frame before it starts to type.
 */
const SHELL_SEARCH = `<div class="hh-search" aria-hidden="true" inert>
              <div class="sp-search"><div class="hcmd"><div class="hcmd-bar"><span class="hcmd-prompt">&gt;</span><input class="hcmd-input" type="text" tabindex="-1" readonly value="" placeholder="Search every tool"><span class="hcmd-kbd"><kbd>Ctrl K</kbd></span></div></div><span class="sp-search-ghost">Search for<span class="sp-search-rot">${text(SPECTRUM_SEARCH_PHRASES[0])}</span></span></div>
            </div>`

export function homeShellRoot() {
  return `${ROOT_OPEN}
  <div class="boot-shell boot-shell-home" id="boot-shell">
    <span class="boot-status" role="status" aria-live="polite">Loading UIL4B</span>
    <div class="spectrum">
      ${shellNav()}
      <div class="sp-grain" aria-hidden="true"></div>
      <main>
        <section id="top" class="hh-hero">
          <div class="hh-glow" aria-hidden="true"><span></span></div>
          <div class="hh-copy">
            ${heroH1()}
            <p class="hh-sub">${text(SPECTRUM_HERO_SUB)}</p>
            ${SHELL_CTA}
            ${SHELL_SEARCH}
          </div>
        </section>
      </main>
      <div class="boot-decoration" aria-hidden="true">
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
  if (!unswitzered.includes('</head>')) {
    throw new Error('home-shell: could not find </head> to put the Geist preload before.')
  }
  // Taken out first, so a shell that already carries it ends up with one, placed.
  const unpreloaded = [HOME_FONT_PRELOAD, HOME_SWITZER_PRELOAD].reduce(
    (out, tag) => out.split(`${tag}\n`).join('').split(tag).join(''),
    unswitzered,
  )
  return fontPreloadAfterStylesheets(stylesheetsBeforeScripts(unpreloaded))
}

/**
 * Put the Geist and Switzer preloads straight after the last stylesheet link: ahead of the
 * entry script and its ~70 modulepreload links, behind the sheets.
 *
 * The first paint waits on the stylesheets, so they keep the front of the
 * queue; a 29 KB font requested ahead of them cost 95 to 170 ms of LCP on the
 * throttled mobile profile. But with the sheets ahead of the scripts, a preload
 * left last in the head sat behind about 400 KB of modulepreloads, so Geist
 * arrived after the headline's first paint and the swap from 'Geist Fallback'
 * moved the headline's text by a fraction of a pixel. Straight after the sheets
 * the font is requested in the same wave and arrives with them. A head with no
 * stylesheet link gets it before `</head>`.
 */
export function fontPreloadAfterStylesheets(html) {
  const headEnd = html.indexOf('</head>')
  if (headEnd === -1) return html
  const head = html.slice(0, headEnd)
  const sheets = [...head.matchAll(HEAD_STYLESHEETS)]
  const last = sheets.at(-1)
  const at = last ? last.index + last[0].length : headEnd
  const lead = last && !last[0].endsWith('\n') ? '\n' : ''
  return `${html.slice(0, at)}${lead}${HOME_FONT_PRELOAD}\n${HOME_SWITZER_PRELOAD}\n${html.slice(at)}`
}

// The built head lists the entry script and its ~70 modulepreload links, and
// only then the stylesheets. The browser asks for them in that order, so on a
// slow connection the stylesheets the first paint waits on queue behind about
// 400 KB of script that nothing paints with. Moved ahead of them, LCP fell by
// about 570 ms on the throttled mobile profile, to just under the 2.5 s budget.
// The sheets keep their order among themselves (the cascade depends on it) and
// the entry script stays in the head, so it starts as soon as it did.
const HEAD_STYLESHEETS = /<link\b[^>]*\brel="stylesheet"[^>]*>\n?/g
const ENTRY_SCRIPT = /<script\b[^>]*\btype="module"[^>]*\bsrc="\/assets\/[^"]*"[^>]*><\/script>\n?/

/** A no-op on a head with no built entry script (the source index.html). */
export function stylesheetsBeforeScripts(html) {
  const headEnd = html.indexOf('</head>')
  if (headEnd === -1) return html
  const head = html.slice(0, headEnd)
  const sheets = head.match(HEAD_STYLESHEETS)
  if (!sheets || !ENTRY_SCRIPT.test(head)) return html
  const block = sheets.map((sheet) => (sheet.endsWith('\n') ? sheet : `${sheet}\n`)).join('')
  // Replacer function, so a `$` in a path is never read as a substitution pattern.
  const moved = head.replace(HEAD_STYLESHEETS, '').replace(ENTRY_SCRIPT, (script) => block + script)
  return moved + html.slice(headEnd)
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
    ['the Switzer preload', HOME_SWITZER_PRELOAD],
  ]
  const missing = wanted.filter(([, needle]) => !html.includes(needle)).map(([label]) => label)
  const head = html.slice(0, Math.max(html.indexOf('</head>'), 0))
  const switzers = head.match(new RegExp(SWITZER_PRELOAD.source, 'g')) || []
  if (switzers.length > 1) {
    throw new Error(`home-shell: ${where} preloads Switzer ${switzers.length} times; one is enough, and a second request is bandwidth taken from the headline.`)
  }
  const script = head.match(ENTRY_SCRIPT)
  const lastSheet = head.lastIndexOf('rel="stylesheet"')
  if (script && lastSheet > script.index) {
    throw new Error(`home-shell: ${where} lists the entry script ahead of a stylesheet, which queues the render-blocking CSS behind the JS.`)
  }
  const preloadAt = head.indexOf(HOME_FONT_PRELOAD)
  if (script && preloadAt > script.index) {
    throw new Error(`home-shell: ${where} lists the Geist preload behind the entry script and its modulepreloads, so the font arrives after the headline's first paint.`)
  }
  const switzerAt = head.indexOf(HOME_SWITZER_PRELOAD)
  if (script && switzerAt > script.index) {
    throw new Error(`home-shell: ${where} lists the Switzer preload behind the entry script and its modulepreloads, so the nav paints in the fallback face first.`)
  }
  if (switzerAt !== -1 && switzerAt < lastSheet) {
    throw new Error(`home-shell: ${where} lists the Switzer preload ahead of a stylesheet, which queues the render-blocking CSS behind a font.`)
  }
  if (missing.length) {
    throw new Error(
      `home-shell: ${where} was written without ${missing.join(', ')}. The homepage would `
      + 'paint a skeleton and wait for React for its largest paint again.',
    )
  }
}
