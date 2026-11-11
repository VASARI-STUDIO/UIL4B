// The hero's entrance, and the faces it is set in.
//
// The homepage hero (src/components/home/HomeHero.jsx, styled by
// src/styles/pages/home-hero.css) has exactly one motion: the loop panel enters
// once, rising 12px as it fades in over 300ms after an 80ms delay. The
// headline, the sub-line and the buttons have no entrance (the headline is the
// page's largest paint and the served shell paints it settled), and the glow is
// still.
//
// These tests read shipped source. They cannot prove it FEELS smooth, only a
// browser can, so they guard the specific regressions instead.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { stripCss, stripJs } from '../helpers/strip-comments.js'
import { geistWeights } from '../helpers/font-axis.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// Every assertion below is about SHIPPED declarations. The comments in these
// files necessarily quote the very strings under test (`filter: blur(12px)`,
// `fonts.googleapis.com`), so matching raw source would pass on prose and fail
// to notice the real thing coming back. Strip first, always.
const stripHtml = (s) => s.replace(/<!--[\s\S]*?-->/g, '')

const css = stripCss(read('src/styles/global.css'))
const html = stripHtml(read('index.html'))


// ── The hero's one entrance ─────────────────────────────────────────────────

const heroCss = stripCss(read('src/styles/pages/home-hero.css'))

/** The declarations of every rule whose selector list includes `selector`. */
function declarationsFor(source, selector) {
  const out = []
  for (const m of source.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if (m[1].split(',').some((s) => s.trim() === selector)) out.push(m[2])
  }
  return out
}

test('the panel enters once: 12px rise and fade, 300ms, 80ms delay', () => {
  const keyframes = /@keyframes hh-panel-in\s*\{([^]*?\})\s*\}/.exec(heroCss)
  assert.ok(keyframes, 'the panel entrance keyframes are gone')
  assert.match(keyframes[1], /opacity:\s*0/)
  assert.match(keyframes[1], /translateY\(12px\)/)
  const rule = declarationsFor(heroCss, '.hh-fig[data-ready]').find((d) => d.includes('animation:'))
  assert.ok(rule, 'the figure no longer runs the entrance')
  assert.match(rule, /animation:\s*hh-panel-in 300ms cubic-bezier\(\.23,\s*1,\s*\.32,\s*1\) 80ms both/)
  assert.ok(!/infinite/.test(heroCss), 'something in the hero loops forever')
})

test('the panel stays clear until the loop has drawn, then enters', () => {
  // Rising in empty and having the loop pop into it a beat later is the defect
  // this gate answers: the entrance is keyed on `data-ready`, which HomeHero sets
  // when HeroLoop reports its panel has committed.
  const clear = declarationsFor(heroCss, '.hh-fig:not([data-ready])')
  assert.ok(clear.some((d) => /opacity:\s*0/.test(d)), 'the panel is no longer clear before it is ready')
  assert.ok(!declarationsFor(heroCss, '.hh-fig').some((d) => d.includes('animation')),
    'the entrance runs on every mount again, before the loop has drawn')
  const hero = read('src/components/home/HomeHero.jsx')
  assert.match(hero, /data-ready=\{loopReady \|\| undefined\}/)
  assert.match(read('src/components/home/HeroLoop.jsx'), /<LoopReady onReady=\{onReady\} \/>/)
})

test('the entrance moves transform and opacity only, with no blur', () => {
  const frames = [...heroCss.matchAll(/@keyframes [\w-]+\s*\{([^]*?\})\s*\}/g)].map((m) => m[1]).join('\n')
  assert.ok(frames.length > 0)
  const props = new Set([...frames.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]))
  for (const p of props) assert.ok(['opacity', 'transform'].includes(p), `the hero animates ${p}`)
  assert.ok(!/blur\(/.test(frames), 'the hero animates a blur')
})

test('the headline, sub-line, buttons and glow carry no entrance', () => {
  for (const selector of ['.hh-copy', '.hh-h1', '.hh-h1-mark', '.hh-sub', '.hh-cta', '.hh-go', '.hh-ghost', '.hh-glow', '.hh-glow > span']) {
    for (const block of declarationsFor(heroCss, selector)) {
      assert.ok(!/animation/.test(block), `${selector} animates: ${block.trim()}`)
    }
  }
  // The glow's blur is a static filter on a layer that never changes.
  assert.ok(!/will-change/.test(heroCss), 'the hero promotes a layer it never animates')
})

test('reduced motion swaps the rise for a 200ms fade, under both opt-outs', () => {
  assert.match(heroCss, /@keyframes hh-panel-fade\s*\{\s*from\s*\{\s*opacity:\s*0;?\s*\}\s*\}/)
  for (const guard of [
    /prefers-reduced-motion: reduce\)\s*\{\s*html:not\(\[data-reduced-motion="false"\]\) \.hh-fig\[data-ready\]\s*\{[^}]*hh-panel-fade 200ms/,
    /html\[data-reduced-motion="true"\] \.hh-fig\[data-ready\]\s*\{[^}]*hh-panel-fade 200ms/,
  ]) {
    assert.match(heroCss, guard)
  }
  // The fade must outrank the stylesheet-wide reduced-motion rule, which would
  // otherwise cut it to a single frame.
  assert.match(heroCss, /animation-duration:\s*200ms !important/)
})

test('only the visible loop is mounted, one size per breakpoint', () => {
  const src = read('src/components/home/HomeHero.jsx')
  assert.match(src, /useLoopSize\(\)/)
  assert.match(src, /useAutoplaySlot\('hero'/)
  assert.match(src, /<HeroLoop\b/)
  assert.equal([...src.matchAll(/<HeroLoop\b/g)].length, 1, 'more than one loop is mounted')
})

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
    'public/fonts/geist-mono-latin.woff2', 'public/fonts/geist-mono-latin-ext.woff2',
    // Geist's sans files are no longer declared by the site; the UI kit export
    // embeds them as its own interface face (src/utils/kitFonts.js).
    'public/fonts/geist-latin.woff2', 'public/fonts/geist-latin-ext.woff2',
  ]) {
    assert.ok(fs.existsSync(path.join(process.cwd(), f)), `${f} is missing`)
  }
  // SWITZER (the UI face since 2026-10-27) IS NOT IN THE REPOSITORY. It is
  // downloaded into public/fonts/switzer/ by scripts/fetch-switzer.mjs, which
  // `npm run build`, `test:unit` and `test:users` run first. CI and Vercel get it
  // from the same hook. A missing file here means the fetch did not run, not that
  // someone deleted a font.
  for (const f of ['Switzer-Variable.woff2', 'Switzer-VariableItalic.woff2']) {
    const full = path.join(process.cwd(), 'public', 'fonts', 'switzer', f)
    assert.ok(fs.existsSync(full), `public/fonts/switzer/${f} is missing - run \`npm run fonts:fetch\` (it is downloaded, never committed)`)
    assert.equal(fs.readFileSync(full).subarray(0, 4).toString('latin1'), 'wOF2', `${f} is not a WOFF2 file`)
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
  for (const family of ['GEIST', 'GEIST-MONO', 'CAVEAT']) { // GEIST: still embedded by the UI kit export
    const licence = `public/fonts/${family}-OFL.txt`
    assert.ok(fs.existsSync(path.join(process.cwd(), licence)), `${licence} is missing`)
    assert.match(fs.readFileSync(path.join(process.cwd(), licence), 'utf8'), /^Copyright \d{4} /,
      `${licence} does not open on the copyright line OFL 1.1 asks travel with the font`)
  }
})

test('Switzer is never committed, and its licence pointer travels with the fetch script', () => {
  // The ITF Free Font License v2.0 allows self-hosting on our own site and bans
  // putting the font in a public repository, subsetting it, converting it and
  // passing it on. The repository is public. So the folder must stay gitignored
  // and nothing under it may be tracked, whatever else changes.
  const ignore = read('.gitignore')
  assert.match(ignore, /^public\/fonts\/switzer\/\s*$/m, 'public/fonts/switzer/ must stay in .gitignore')
  let tracked = null
  try {
    tracked = execFileSync('git', ['ls-files', 'public/fonts/switzer'], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch { /* no git (a source tarball): the .gitignore check above is the guard */ }
  if (tracked !== null) assert.equal(tracked, '', `Switzer files are tracked by git: ${tracked}`)

  assert.ok(fs.existsSync(path.join(process.cwd(), 'scripts', 'fetch-switzer.mjs')), 'scripts/fetch-switzer.mjs is missing')
  assert.match(read('scripts/SWITZER-LICENCE.md'), /ITF Free Font License/, 'the licence pointer must name the licence')
  // The build runs the fetch, so Vercel and CI both get the file.
  const scripts = JSON.parse(read('package.json')).scripts
  assert.match(scripts.prebuild || '', /fetch-switzer/, '`npm run build` must run the Switzer fetch first')
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
  for (const want of [/fonts\/switzer\/Switzer-Variable\.woff2/, /geist-mono-latin\.woff2/]) {
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
    // 'Switzer Fallback' and 'Geist Fallback' are metric-matched stand-ins for
    // the swap period: a local() Arial with size-adjust and ascent/descent/
    // line-gap overrides. They have no file to load, but they still declare a
    // range and swap (the Learn font-loading table reads every rule and needs both).
    if (/font-family:\s*'(Switzer|Geist) Fallback'/.test(f)) {
      assert.match(f, /src:\s*local\(/, 'the fallback must be a local() face, never a download')
      assert.match(f, /size-adjust:/, 'the fallback is only worth having if it is size-adjusted')
      assert.match(f, /ascent-override:/)
      assert.match(f, /descent-override:/)
      assert.match(f, /line-gap-override:/)
    }
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
    // A rule that names its own quoted non-Geist face (the homepage's Archivo
    // samples) renders on that face's axis, as with the JSX check below.
    return [...text.matchAll(/\{[^{}]*\}/g)]
      .filter(([rule]) => !/font-family:\s*["'](?!Geist)[^"']+["']/i.test(rule))
      .flatMap(([rule]) => [...rule.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1])))
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
    return geistWeights(text)
  })
  // A weight set beside an explicit non-Geist `fontFamily` (the loop's Archivo
  // headline) renders on that face's own axis and is not counted here.
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

test('the Geist axis check reads the face beside each weight', () => {
  // Without these cases the exemption could widen until nothing is checked.
  const archivo = `<h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800 }} />`
  assert.deepEqual(geistWeights(archivo), [], 'an explicit Archivo weight is not a Geist weight')
  const svgArchivo = `<text fontFamily="Archivo" fontWeight="800">x</text>`
  assert.deepEqual(geistWeights(svgArchivo), [])
  const geist = `<h1 style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800 }} />`
  assert.deepEqual(geistWeights(geist), [800], 'Geist at 800 is outside its axis and must be reported')
  const bare = `<p style={{ margin: 0, fontWeight: 800 }}>x</p>`
  assert.deepEqual(geistWeights(bare), [800], 'no family means the default face, which is Geist')
  const computed = `<p style={{ fontFamily: v.headFont, fontWeight: 800 }}>x</p>`
  assert.deepEqual(geistWeights(computed), [800], 'a computed family does not exempt a weight')
  // The exemption stays inside the one style object it was written in.
  const neighbours = `<><a style={{ fontFamily: "'Archivo'", fontWeight: 800 }} /><b style={{ fontWeight: 800 }} /></>`
  assert.deepEqual(geistWeights(neighbours), [800], 'a sibling without a family stays on Geist')
})
