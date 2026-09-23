// The hero entrance has to be smooth, and "smooth" here has specific causes.
//
// FOUNDER REPORT, twice: "the hero animation it kind of sucks, its not smooth"
// and later, after a first attempt, "also make the hero animation better its not
// smooth". Measuring rather than guessing found three separate faults:
//
//   1. The entrance ran from a GSAP timeline, so it could not START until a
//      ~40KB dynamic import resolved. Until then a JS class held the headline at
//      opacity:0 — roughly 350ms of blank hero on a throttled CPU, then a pop.
//   2. It tweened `filter: blur(12px)` across the largest text on the page,
//      which re-rasterises the layer every frame.
//   3. `.home-hero-line` had no `overflow: hidden`, so the `yPercent: 110`
//      "clip up" never clipped and the two headline lines slid through each
//      other.
//
// And a fourth, found in the trace: the font came from two sequential
// third-party round trips and landed at ~587ms, dirtying all 851 boxes in a
// 262ms full-document relayout in the middle of the entrance. A warm cache did
// the same page in 27ms of total layout, which is what proved the cost was
// arrival time.
//
// These tests read shipped source. They cannot prove it FEELS smooth — only a
// browser can — so they guard the specific regressions instead.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss, stripJs } from '../helpers/strip-comments.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// Every assertion below is about SHIPPED declarations. The comments in these
// files necessarily quote the very strings under test (`filter: blur(12px)`,
// `fonts.googleapis.com`), so matching raw source would pass on prose and fail
// to notice the real thing coming back. Strip first, always.
const stripHtml = (s) => s.replace(/<!--[\s\S]*?-->/g, '')

const css = stripCss(read('src/styles/global.css'))
const html = stripHtml(read('index.html'))

// ── WHAT THIS FILE STOPPED GUARDING, AND WHERE IT WENT ─────────────────────
//
// Seven tests stood here: the entrance was CSS and not a GSAP timeline, no JS
// class held the headline hidden, the start state came from `animation-fill-mode`,
// the keyframes touched transform and opacity only, the blur burn-off was gone,
// and the clip container left room for descenders on both edges.
//
// Their subject is deleted. src/pages/Home.jsx, src/hooks/useHomeMotion.js and
// the `.home-hero-line` / `.home-hero-line-in` clip-up went on 2026-09-18, when
// the founder made src/pages/Spectrum.jsx the front door. There is no hero left
// with a GSAP timeline to avoid, an arming class to refuse, or a clip to size.
//
// THE ARGUMENTS SURVIVED THE PAGE, and they are held where the new hero lives:
//   · "the entrance must not wait on a chunk" — Spectrum's word reveal is
//     `@keyframes sp-word-up` in src/styles/pages/spectrum.css, which is now the
//     RENDER-BLOCKING sheet (App.jsx imports the page statically), so it cannot
//     wait on anything;
//   · "no JS class holds the hero hidden" — the stronger version is asserted by
//     tests/unit/spectrum-structure.test.js: `.sp-w` declares no transform at
//     rest, so the resting state IS the final state and the headline is readable
//     with the animation never running, in the prerendered shell and with motion
//     off;
//   · "the first painted frame is the settled one" — scripts/home-shell.mjs
//     pre-paints that settled headline into the served `/` shell and
//     tests/unit/home-shell-hero.test.js asserts the shell carries no `.is-in`.
//
// What is left in this file is the half that was never about one page: the
// fonts, their preloads, and the weight axis.

// ── Reduced motion, both directions ─────────────────────────────────────────

test('reduced motion settles the entrance instantly, and an explicit opt-in wins', () => {
  // AppearanceContext treats its own toggle as authoritative — a user may opt
  // back INTO motion despite an OS-level reduce. Every entrance in the app has
  // to agree with that or the two disagree about the same element;
  // src/components/spectrum/reducedMotion.js implements the same contract in JS
  // for the Spectrum page.
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(css, /html:not\(\[data-reduced-motion="false"\]\)[^{]*\{animation:none\}/)
  assert.match(css, /html\[data-reduced-motion="true"\][^{]*\{animation:none\}/)
})

// ── The font arrives before it can shift anything ───────────────────────────

test('the fonts are self-hosted, not two third-party round trips', () => {
  assert.ok(!/fonts\.googleapis\.com/.test(html),
    'the stylesheet request is back; the font URL is only discoverable after it parses')
  assert.ok(!/fonts\.gstatic\.com/.test(css), 'font files must be served from our own origin')
  // THE FILES THIS CHECKED WERE THE RETIRED ONES, and that is why it is worth a
  // paragraph. It named manrope-* and jetbrains-mono-*, which nothing has
  // referenced since the Spectrum adoption (dace2339) moved the product to Geist
  // (--font/--display), Geist Mono (--mono) and Caveat (--hand). Those four files
  // are still on disk — deliberately, because scripts/og-cards.mjs reads
  // manrope-latin.woff2 directly to draw the share cards — so the assertion
  // passed while checking faces the app does not ship. The Geist files could all
  // have gone missing and it would have stayed green.
  //
  // Caveat is deliberately absent: it is the handwritten annotation only, it is
  // preloaded nowhere, and the preload test below is the one that cares which
  // faces are on the first-paint path.
  for (const f of [
    'public/fonts/geist-latin.woff2', 'public/fonts/geist-latin-ext.woff2',
    'public/fonts/geist-mono-latin.woff2', 'public/fonts/geist-mono-latin-ext.woff2'
  ]) {
    assert.ok(fs.existsSync(path.join(process.cwd(), f)), `${f} is missing`)
  }
  // OFL 1.1 permits redistribution; shipping the font means shipping the licence
  // — AND THE RIGHT ONE. This named `public/fonts/OFL.txt`, a single combined
  // file that has not existed since 139e7624 split it: it carried OUTFIT's
  // copyright line, which is the one family the app no longer sets, so Geist,
  // Geist Mono and Caveat each shipped beside a licence naming a different
  // project. That commit wrote one file per family and did not update this
  // assertion, so the check has been failing on a tree where the licensing is
  // now correct. Asserted per family, derived from the .woff2 files this test
  // already lists, so the next face to arrive brings its own notice or fails.
  for (const family of ['GEIST', 'GEIST-MONO', 'CAVEAT']) {
    const licence = `public/fonts/${family}-OFL.txt`
    assert.ok(fs.existsSync(path.join(process.cwd(), licence)), `${licence} is missing`)
    assert.match(fs.readFileSync(path.join(process.cwd(), licence), 'utf8'), /^Copyright \d{4} /,
      `${licence} does not open on the copyright line OFL 1.1 asks travel with the font`)
  }
})

test('both families are preloaded, in CORS mode', () => {
  const links = html.match(/<link[^>]*rel="preload"[^>]*>/g) || []
  // BOTH, not just the UI face: the design puts mono above the fold (nav
  // wordmark, eyebrows, stat line), so a late mono arrival shifts first paint
  // too. Geist and Geist Mono since the Spectrum adoption, 2026-09-18.
  //
  // CAVEAT IS DELIBERATELY ABSENT. It is the handwritten annotation and nothing
  // else, it is below the fold on one route, and preloading a third face would
  // spend first-paint budget on decoration.
  for (const want of [/geist-latin\.woff2/, /geist-mono-latin\.woff2/]) {
    const link = links.find((l) => want.test(l))
    assert.ok(link, `no preload for ${want}`)
    assert.match(link, /as="font"/)
    // Fonts are always fetched in CORS mode. A preload without `crossorigin`
    // mismatches the real request and the file is downloaded twice.
    assert.match(link, /crossorigin/)
  }
})

test('every authored weight sits inside the variable axis that renders it', () => {
  // global.css authors sixteen weights and ten are not multiples of 100. Static
  // instances cannot express those, so they were silently rounded — the hero h1
  // asks for 720 and was rendering at 700. Hence variable faces with a RANGE.
  //
  // Geist is NARROWER STILL than the faces before it — 300..700 against
  // Manrope's 200..800 — and a weight outside a family's axis is silently
  // CLAMPED, which is the same silent-rounding failure this test was written to
  // catch. Adopting Spectrum on 2026-09-18 therefore moved 21 call sites at
  // 720/750/800/900 down to 700; see the note at the bottom of this test.
  //
  // Caveat is the exception and is allowed a SINGLE weight: it ships one static
  // instance at 500 because it has exactly one job (the handwritten homepage
  // annotation) and no second weight is ever asked for. A range is required of
  // every face that carries intermediate weights, which is the real rule.
  const faces = css.match(/@font-face\{[^}]*\}/g) || []
  assert.ok(faces.length >= 1, 'expected self-hosted @font-face rules')
  for (const f of faces) {
    const single = /font-family:\s*'Caveat'/.test(f)
    if (single) {
      assert.match(f, /font-weight:\s*500\b/, 'Caveat ships one static weight, 500')
    } else {
      assert.match(f, /font-weight:\s*\d{3} \d{3}/,
        'each variable face must declare a RANGE, or intermediate weights round')
    }
    assert.match(f, /font-display:\s*swap/)
  }
  // EVERY STYLESHEET, NOT JUST global.css. This scanned global.css alone, and
  // that blindness cost 39 silent clamps: the Spectrum font swap remapped the 21
  // weights this file could see and left 750s and 800s sitting in
  // deferred/tool-shell.css (13), deferred/colour.css (10), studio, account,
  // admin, semantic-color, seo-inspector and tint — plus inline `fontWeight` in
  // JSX, which no CSS scan would ever reach. A guard that only watches one file
  // reports a clean axis while eight other files clamp.
  const styleFiles = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.css')) styleFiles.push(full)
    }
  }
  walk(path.join(process.cwd(), 'src', 'styles'))
  assert.ok(styleFiles.length >= 5, `only ${styleFiles.length} stylesheets found — the walk is not reaching them`)

  const used = styleFiles.flatMap((file) => {
    const text = fs.readFileSync(file, 'utf8').replace(/@font-face\{[^}]*\}/g, '')
    return [...text.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1]))
  })

  // AND THE WEIGHTS NO STYLESHEET CONTAINS. A component can set a weight two
  // ways that a CSS scan will never reach: an inline style object
  // (`style={{ fontWeight: 800 }}`) and — the one that actually got through —
  // an SVG presentation ATTRIBUTE in JSX (`fontWeight="800"` on a <text>).
  // The admin donut's total was drawn at 800 and clamped for weeks; it was
  // found by eye, after this test had already been widened once to walk every
  // stylesheet. A guard that only reads CSS reports a clean axis while JSX
  // clamps.
  //
  // Comments stripped first, for the reason design-tokens.test.js was fixed on
  // the same day: source files now CONTAIN prose about this rule, and a test
  // that fires on an explanation of itself is a test people stop believing.
  const codeFiles = []
  const walkCode = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walkCode(full)
      else if (/\.jsx?$/.test(entry.name)) codeFiles.push(full)
    }
  }
  walkCode(path.join(process.cwd(), 'src'))
  assert.ok(codeFiles.length >= 20, `only ${codeFiles.length} source files found — the walk is not reaching them`)

  const inlineUsed = codeFiles.flatMap((file) => {
    const text = stripJs(fs.readFileSync(file, 'utf8'))
    return [...text.matchAll(/fontWeight\s*[:=]\s*["']?(\d{3})["']?/g)].map((m) => Number(m[1]))
  })
  const inlineOutOfAxis = inlineUsed.filter((w) => w < 300 || w > 700)
  assert.deepEqual(inlineOutOfAxis, [],
    'a JSX fontWeight sits outside Geist\'s 300..700 axis — inline styles and SVG presentation '
    + 'attributes are invisible to a stylesheet scan, and the browser clamps them silently')
  const odd = [...new Set(used.filter((w) => w % 100 !== 0))]
  assert.ok(odd.length > 0, 'expected intermediate weights; if these were removed, update this test')
  // The intermediate weights are the whole reason for a variable font, so they
  // must be renderable by BOTH families — the tighter axis, Geist's 300..700,
  // binds.
  for (const w of odd) {
    assert.ok(w >= 300 && w <= 700, `intermediate weight ${w} sits outside Geist's 300..700 axis`)
  }
  // NOW ZERO, AND THAT IS THE POINT. Under Manrope this list read [900, 900] —
  // two Palette Builder headings that clamped to 800 and were accepted as a
  // bounded exception. Geist's axis is narrower, so adopting Spectrum turned
  // that exception plus 19 more (720, 750, 800) into weights that would clamp
  // to 700 without anyone seeing it. All 21 were remapped to 700 rather than
  // left to clamp, because a clamp is a decision the renderer makes silently
  // and a remap is one an author made on purpose. Most of them sit on the Home
  // page Spectrum replaces outright; the rest are display numbers where Geist
  // at 700 already reads heavier than Manrope did.
  //
  // The empty list is now the guard: a single new out-of-axis weight fails
  // here, so the next author picks one inside 300..700 instead of inheriting a
  // silent clamp.
  const outOfAxis = used.filter((w) => w < 300 || w > 700)
  assert.deepStrictEqual(outOfAxis, [],
    'an out-of-axis weight appeared; it will be silently clamped — pick one inside Geist\'s 300..700')
})
