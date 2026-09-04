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

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// Every assertion below is about SHIPPED declarations. The comments in these
// files necessarily quote the very strings under test (`filter: blur(12px)`,
// `fonts.googleapis.com`), so matching raw source would pass on prose and fail
// to notice the real thing coming back. Strip first, always.
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const stripHtml = (s) => s.replace(/<!--[\s\S]*?-->/g, '')
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const css = stripCss(read('src/styles/global.css'))
const html = stripHtml(read('index.html'))
const motion = stripJs(read('src/hooks/useHomeMotion.js'))

// ── The entrance does not wait on a chunk ───────────────────────────────────

test('the hero entrance is CSS, not a GSAP timeline', () => {
  // A fire-once entrance does not need a timeline, and putting it in one means
  // it cannot begin until the import resolves.
  for (const sel of ['.home-hero-line-in', '.home-hero-sub', '.home-hero-hint']) {
    assert.ok(!motion.includes(sel),
      `${sel} is animated from useHomeMotion.js again — the entrance must not wait on the GSAP chunk`)
  }
  assert.match(css, /@keyframes home-hero-clip-up/)
  assert.match(css, /@keyframes home-hero-rise/)
})

test('no JS class holds the hero hidden', () => {
  // `.motion-armed` set opacity:0 on the headline until GSAP arrived. If the
  // chunk failed, a bug in the failure path left the hero invisible for good.
  assert.ok(!motion.includes('motion-armed'),
    'the arming class is back; the hero must supply its own start state via animation-fill-mode')
  assert.ok(!/\.home\.motion-armed/.test(css))
})

test('the hidden start state comes from the animation itself', () => {
  // `both` fill applies the `from` keyframe before the animation starts, which
  // is what prevents a flash without needing JS to hide anything.
  const line = /\.home-hero-line-in\{animation:[^}]*\}/.exec(css)?.[0] || ''
  assert.match(line, /\bboth\b/, 'the clip-up needs animation-fill-mode: both')
})

// ── Nothing expensive is animated ───────────────────────────────────────────

test('the entrance animates transform and opacity only', () => {
  // Anything else — filter, width, top — is laid out or rasterised per frame
  // and cannot run on the compositor.
  const frames = /@keyframes home-hero-(?:clip-up|rise)\{[\s\S]*?\}\s*\}/g
  const blocks = css.match(frames) || []
  assert.ok(blocks.length >= 2, 'expected both hero keyframe blocks')
  for (const b of blocks) {
    const props = [...b.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1])
    for (const p of props) {
      assert.ok(['transform', 'opacity'].includes(p),
        `hero keyframes animate '${p}'; only transform and opacity composite`)
    }
  }
})

test('the blur burn-off is gone', () => {
  assert.ok(!/filter:\s*blur/.test(motion),
    'a filter tween is back in the hero timeline — it re-rasterises the largest text every frame')
})

// ── The clip actually clips ─────────────────────────────────────────────────

test('the headline lines have a clip container, with room for descenders', () => {
  const rule = /\.home-hero-line\{([^}]*)\}/.exec(css)?.[1] || ''
  assert.match(rule, /overflow:\s*hidden/,
    'without this the clip-up does not clip and the two lines slide through each other')
  // line-height is .98, so `g` and `y` hang below the box and would be shaved.
  assert.match(rule, /padding-bottom:/, 'descenders need room inside the clip')
  assert.match(rule, /margin-bottom:\s*-/, 'the negative margin must cancel that padding in layout')
})

// ── Reduced motion, both directions ─────────────────────────────────────────

test('reduced motion settles the hero instantly, and an explicit opt-in wins', () => {
  // AppearanceContext treats its own toggle as authoritative — a user may opt
  // back INTO motion despite an OS-level reduce. useHomeMotion mirrors that, and
  // the CSS has to agree or the two disagree about the same hero.
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(css, /html:not\(\[data-reduced-motion="false"\]\)[^{]*\{animation:none\}/)
  assert.match(css, /html\[data-reduced-motion="true"\][^{]*\{animation:none\}/)
})

// ── The font arrives before it can shift anything ───────────────────────────

test('the fonts are self-hosted, not two third-party round trips', () => {
  assert.ok(!/fonts\.googleapis\.com/.test(html),
    'the stylesheet request is back; the font URL is only discoverable after it parses')
  assert.ok(!/fonts\.gstatic\.com/.test(css), 'font files must be served from our own origin')
  // Design Language V2 replaced Outfit with two families: Manrope (--font/--display)
  // and JetBrains Mono (--mono, which V2 makes load-bearing rather than decorative).
  for (const f of [
    'public/fonts/manrope-latin.woff2', 'public/fonts/manrope-latin-ext.woff2',
    'public/fonts/jetbrains-mono-latin.woff2', 'public/fonts/jetbrains-mono-latin-ext.woff2'
  ]) {
    assert.ok(fs.existsSync(path.join(process.cwd(), f)), `${f} is missing`)
  }
  // OFL 1.1 permits redistribution; shipping the font means shipping the licence.
  assert.ok(fs.existsSync(path.join(process.cwd(), 'public/fonts/OFL.txt')))
})

test('both families are preloaded, in CORS mode', () => {
  const links = html.match(/<link[^>]*rel="preload"[^>]*>/g) || []
  // BOTH, not just the UI face: V2 puts mono above the fold (nav wordmark,
  // eyebrows, stat line), so a late mono arrival shifts first paint too.
  for (const want of [/manrope-latin\.woff2/, /jetbrains-mono-latin\.woff2/]) {
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
  // The V2 families have narrower axes than Outfit's 100..900 — verified by
  // reading the fvar table of the shipped files: Manrope 200..800, JetBrains
  // Mono 100..800. A weight outside a family's axis is silently CLAMPED, which
  // is the same silent-rounding failure this test was written to catch.
  const faces = css.match(/@font-face\{[^}]*\}/g) || []
  assert.ok(faces.length >= 1, 'expected self-hosted @font-face rules')
  for (const f of faces) {
    assert.match(f, /font-weight:\s*\d{3} \d{3}/,
      'each face must declare a variable RANGE, or intermediate weights round')
    assert.match(f, /font-display:\s*swap/)
  }
  // Weights authored OUTSIDE the @font-face rules, i.e. real call sites.
  const used = [...css.replace(/@font-face\{[^}]*\}/g, '').matchAll(/font-weight:\s*(\d{3})/g)]
    .map((m) => Number(m[1]))
  const odd = [...new Set(used.filter((w) => w % 100 !== 0))]
  assert.ok(odd.length > 0, 'expected intermediate weights; if these were removed, update this test')
  // The intermediate weights are the whole reason for a variable font, so they
  // must be renderable by BOTH families — the tighter axis, 200..800, binds.
  for (const w of odd) {
    assert.ok(w >= 200 && w <= 800, `intermediate weight ${w} sits outside Manrope's 200..800 axis`)
  }
  // Two call sites still ask for 900 (Palette Builder's preview/export headings)
  // and clamp to Manrope's 800. V2's own display scale tops out at 800, so this
  // is accepted rather than fixed — but it is BOUNDED here on purpose. A third
  // out-of-axis weight fails this test so the next author has to make a choice
  // instead of inheriting a silent clamp.
  const outOfAxis = used.filter((w) => w < 200 || w > 800)
  assert.deepStrictEqual(outOfAxis, [900, 900],
    'a new out-of-axis weight appeared; it will be silently clamped — pick one inside 200..800')
})
