// THE HOMEPAGE'S MOTION: WHAT MUST STAY TRUE WHEN SOMEONE EDITS IT.
//
// The motion on `/` is declared in src/styles/pages/spectrum.css and driven by a
// few lines of React. Four properties are cheap to break and expensive to find
// afterwards, and each has a test here:
//
//   U1  every new animation has BOTH reduced-motion guards (the Settings choice
//       and the OS preference), or a visitor who asked for no motion gets it.
//   U2  the resting state is visible: nothing the page animates is parked at
//       opacity:0 or off-position in plain CSS, and every animation fills
//       `backwards`, so a cancelled or skipped run costs the movement and never
//       the content.
//   U3  the keyframes move `transform` and `opacity` only (compositor work).
//   U4  no scroll handler on the bench or the proof band, and the band's hue
//       handler is attached from an IntersectionObserver callback and from
//       nowhere else.
//   U5  the served shell is untouched: it carries none of the arrival markup, so
//       the headline stays the page's one settled, full-size largest paint.
//
// These read the stylesheet as TEXT, which cannot see a runtime fault; the
// behaviour is in tests/user-sim/161-home-motion.spec.js. What the text can see
// is a missing guard or a selector that drifted, which is why a guard is looked
// up by the class its animation is attached to rather than counted.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { homeShellRoot, applyHomeShell } from '../../scripts/home-shell.mjs'

const CSS_PATH = ['src/styles/pages/spectrum.css', 'src/styles/deferred/spectrum.css'].find((p) => fs.existsSync(p))
if (!CSS_PATH) throw new Error('spectrum.css is in neither src/styles/pages/ nor src/styles/deferred/')
const CSS = read(CSS_PATH).replace(/\/\*[\s\S]*?\*\//g, '')
const js = (p) => stripComments(read(p))
const BENCH = js('src/components/spectrum/SpectrumBench.jsx')
const PROOF = js('src/components/spectrum/SpectrumProof.jsx')
const RAMP = js('src/components/spectrum/SpectrumRamp.jsx')

// ── a small stylesheet reader ───────────────────────────────────────────────
// Rules and keyframes, each with the at-rules it sits in. Enough for this file;
// not a CSS parser (no strings containing braces, which this sheet does not have).
function parseSheet(css) {
  const rules = []
  const keyframes = []
  const walk = (text, ctx) => {
    let i = 0
    while (i < text.length) {
      const open = text.indexOf('{', i)
      if (open === -1) break
      let depth = 1
      let j = open + 1
      while (j < text.length && depth) {
        if (text[j] === '{') depth += 1
        else if (text[j] === '}') depth -= 1
        j += 1
      }
      // Anything before the last `;` is a finished statement (@import, @layer a;), not this prelude.
      const prelude = text.slice(i, open).split(';').pop().trim()
      const body = text.slice(open + 1, j - 1)
      if (/^@keyframes\s/.test(prelude)) keyframes.push({ name: prelude.replace(/^@keyframes\s+/, '').trim(), body })
      else if (/^@(media|supports|layer|container)\b/.test(prelude)) walk(body, [...ctx, prelude])
      else if (prelude && !prelude.startsWith('@')) rules.push({ selector: prelude, body, ctx })
      i = j
    }
  }
  walk(css, [])
  return { rules, keyframes }
}

/** Split on commas that are not inside (), []. */
function splitTop(sel) {
  const out = []
  let depth = 0
  let from = 0
  for (let i = 0; i < sel.length; i += 1) {
    const c = sel[i]
    if (c === '(' || c === '[') depth += 1
    else if (c === ')' || c === ']') depth -= 1
    else if (c === ',' && depth === 0) { out.push(sel.slice(from, i).trim()); from = i + 1 }
  }
  out.push(sel.slice(from).trim())
  return out.filter(Boolean)
}

/** The classes an element must have to be the SUBJECT of this selector (its last compound; `:is()` expanded). */
function subjects(selector) {
  const result = []
  for (const part of splitTop(selector)) {
    // The last compound: scan back to the first top-level space or combinator.
    let depth = 0
    let cut = 0
    for (let i = part.length - 1; i >= 0; i -= 1) {
      const c = part[i]
      if (c === ')' || c === ']') depth += 1
      else if (c === '(' || c === '[') depth -= 1
      else if (depth === 0 && /[\s>+~]/.test(c)) { cut = i + 1; break }
    }
    const compound = part.slice(cut)
    const is = /:is\((.*)\)$/.exec(compound)
    if (is) { result.push(...subjects(is[1])); continue }
    const classes = compound.replace(/\[[^\]]*\]/g, '').match(/\.[A-Za-z_][\w-]*/g) || []
    if (classes.length) result.push(classes.at(-1))
  }
  return result
}

const decl = (body, prop) => {
  const m = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;]+)`).exec(body)
  return m ? m[1].trim() : null
}
const hasClass = (selector, cls) => new RegExp(`${cls.replace('.', '\\.')}(?![\\w-])`).test(selector)

const SHEET = parseSheet(CSS)

const TRUE_GUARD = ':where(html[data-reduced-motion="true"])'
const OS_GUARD = ':where(html:not([data-reduced-motion="false"]))'
const isReduceMedia = (r) => r.ctx.some((c) => /prefers-reduced-motion:\s*reduce/.test(c))
const settingsGuards = SHEET.rules.filter((r) => !isReduceMedia(r) && r.selector.includes(TRUE_GUARD))
const osGuards = SHEET.rules.filter((r) => isReduceMedia(r) && r.selector.includes(OS_GUARD))

// The animations this build added, and the rules that start each of them.
const NEW_ANIMATIONS = ['sp-arrive', 'sp-bar-set', 'sp-depth', 'sp-enter', 'sp-fade-a', 'sp-fade-b']
const drivers = (name) => SHEET.rules.filter((r) => new RegExp(`(?:^|[;{\\s])animation(?:-name)?\\s*:[^;]*\\b${name}\\b`).test(r.body))

test('the stripper and the sheet reader still work, so the checks below can be trusted', () => {
  assertStripperWorks(assert)
  // POSITIVE CONTROLS: a reader that found nothing would let every loop below pass.
  assert.ok(SHEET.rules.length > 200, `only ${SHEET.rules.length} rules read from spectrum.css`)
  for (const name of NEW_ANIMATIONS) {
    assert.ok(SHEET.keyframes.some((k) => k.name === name), `@keyframes ${name} is gone`)
    assert.ok(drivers(name).length > 0, `nothing starts ${name}`)
  }
  assert.ok(settingsGuards.length >= 3 && osGuards.length >= 3,
    `the reduced-motion guards were not found (${settingsGuards.length} Settings, ${osGuards.length} OS)`)
  assert.deepEqual(subjects('.a .b:is(.c, .d .e)'), ['.c', '.e'])
  assert.deepEqual(subjects('.x :is(.p, .q .r), .s[data-k="1"]'), ['.p', '.r', '.s'])
})

// ── U1 ──────────────────────────────────────────────────────────────────────

test('U1: every new animation is switched off by both reduced-motion guards', () => {
  for (const name of NEW_ANIMATIONS) {
    const targets = [...new Set(drivers(name).flatMap((r) => subjects(r.selector)))]
    assert.ok(targets.length > 0, `could not find what ${name} is attached to`)
    for (const cls of targets) {
      const stopsIt = (g) => hasClass(g.selector, cls) && /^none\b/.test(decl(g.body, 'animation') || '') && /!important/.test(g.body)
      assert.ok(settingsGuards.some(stopsIt),
        `${name} runs on ${cls}, but no \`${TRUE_GUARD}\` rule sets animation: none !important on it. `
        + 'Somebody who turned motion off in Settings still gets it.')
      assert.ok(osGuards.some(stopsIt),
        `${name} runs on ${cls}, but no \`@media (prefers-reduced-motion: reduce)\` rule with ${OS_GUARD} `
        + 'sets animation: none !important on it. Somebody whose OS asks for less motion still gets it.')
    }
  }
})

test('U1: the tab pill\'s slide is switched off by both guards', () => {
  const movers = SHEET.rules.filter((r) => subjects(r.selector).includes('.sp-rail-ind') && decl(r.body, 'transition'))
  assert.ok(movers.length > 0, '.sp-rail-ind no longer has a transition')
  const stopsIt = (g) => hasClass(g.selector, '.sp-rail-ind') && /^none\b/.test(decl(g.body, 'transition') || '') && /!important/.test(g.body)
  assert.ok(settingsGuards.some(stopsIt), '.sp-rail-ind slides, but the Settings guard does not set transition: none !important on it')
  assert.ok(osGuards.some(stopsIt), '.sp-rail-ind slides, but the OS guard does not set transition: none !important on it')
})

// ── U2 ──────────────────────────────────────────────────────────────────────

test('U2: every new animation fills backwards (both, for the scroll-linked depth)', () => {
  for (const name of NEW_ANIMATIONS) {
    for (const r of drivers(name)) {
      const value = decl(r.body, 'animation') || ''
      const fill = name === 'sp-depth' ? /\bboth\b/ : /\bbackwards\b/
      assert.ok(fill.test(value),
        `\`${r.selector}\` starts ${name} with "${value}", which does not fill ${name === 'sp-depth' ? 'both' : 'backwards'}. `
        + 'Without it the element keeps (or never gets) its first frame once the run ends or is cancelled.')
    }
  }
})

test('U2: nothing the page animates is parked hidden or moved in plain CSS', () => {
  const animated = new Set(NEW_ANIMATIONS.flatMap((n) => drivers(n).flatMap((r) => subjects(r.selector))))
  // The hero's controls and the library grid are the elements whose own rules must stay visible.
  for (const cls of ['.sp-hero-sub', '.tim-anchor', '.sp-hero-cta', '.sp-disc-grid']) animated.add(cls)
  assert.ok(animated.size >= 5, `only ${animated.size} animated subjects found`)
  for (const r of SHEET.rules) {
    if (r.selector.includes('html[data-reduced-motion') || r.selector.includes('html:not([data-reduced-motion')) continue
    // `.sp-panel`'s sp-depth rule and the windows' `data-on="false"` hiding are state, not resting paint.
    for (const sel of splitTop(r.selector)) {
      if (/:(hover|active|focus)/.test(sel)) continue
      if (!subjects(sel).some((c) => animated.has(c))) continue
      const opacity = decl(r.body, 'opacity')
      const transform = decl(r.body, 'transform')
      assert.ok(!(opacity && /^0(\.0+)?$/.test(opacity)),
        `\`${sel}\` rests at opacity: ${opacity}. A rule that hides an animated element in plain CSS hides it for good when the animation is cancelled.`)
      assert.ok(!transform || /^none\b/.test(transform),
        `\`${sel}\` rests at transform: ${transform}. The movement belongs in the keyframes.`)
    }
  }
})

// ── U3 ──────────────────────────────────────────────────────────────────────

test('U3: every keyframe on the page moves transform and opacity only', () => {
  assert.ok(SHEET.keyframes.length >= 7, `only ${SHEET.keyframes.length} @keyframes read`)
  for (const k of SHEET.keyframes) {
    const props = new Set()
    for (const frame of k.body.matchAll(/\{([^{}]*)\}/g)) {
      for (const d of frame[1].split(';')) {
        const p = d.split(':')[0].trim()
        if (p) props.add(p)
      }
    }
    assert.ok(props.size > 0, `@keyframes ${k.name} has no declarations the reader could see`)
    const other = [...props].filter((p) => p !== 'transform' && p !== 'opacity')
    assert.deepEqual(other, [],
      `@keyframes ${k.name} animates ${other.join(', ')}. Anything but transform and opacity repaints or relayouts on the main thread, `
      + 'which is busy hydrating exactly when the hero arrives.')
  }
})

test('U3: nothing on the page uses transition: all or will-change', () => {
  assert.ok(!/transition\s*:\s*all\b/.test(CSS), 'spectrum.css has transition: all')
  assert.ok(!/transition-property\s*:\s*all\b/.test(CSS), 'spectrum.css has transition-property: all')
  assert.ok(!/will-change/.test(CSS), 'spectrum.css has will-change; the spec adds it only after a trace shows a stutter, naming the property')
  for (const [file, src] of Object.entries({ BENCH, PROOF, RAMP, PAGE: js('src/pages/Spectrum.jsx') })) {
    assert.ok(!/transition\s*:\s*['"`]all\b/.test(src), `${file} sets an inline transition: all`)
  }
})

test('U3: the headline is not an arrival target', () => {
  // Moving the headline would make the settled hydrated one a later, larger LCP candidate.
  const targets = new Set(NEW_ANIMATIONS.flatMap((n) => drivers(n).flatMap((r) => subjects(r.selector))))
  for (const banned of ['.sp-hero-h1', '.sp-hero-core', '.sp-words', '.sp-words-visual', '.sp-w', '.sp-wm', '.sp-hero']) {
    assert.ok(!targets.has(banned), `${banned} is animated by a new keyframe`)
  }
  // And nothing that starts a new animation sits on the hero's own box.
  const hero = SHEET.rules.filter((r) => subjects(r.selector).includes('.sp-hero-h1') && NEW_ANIMATIONS.some((n) => r.body.includes(n)))
  assert.deepEqual(hero.map((r) => r.selector), [])
})

// ── U4 ──────────────────────────────────────────────────────────────────────

const scrollListener = /addEventListener\(\s*['"`]scroll['"`]/
const matching = (src, openAt, open, close) => {
  let depth = 0
  for (let i = openAt; i < src.length; i += 1) {
    if (src[i] === open) depth += 1
    else if (src[i] === close) { depth -= 1; if (depth === 0) return i }
  }
  return -1
}

test('U4: the bench and the proof band listen to no scroll, and use an observer instead', () => {
  assert.ok(BENCH.includes('new IntersectionObserver'), 'the bench no longer observes its steps')
  assert.ok(PROOF.includes('new IntersectionObserver'), 'the proof band no longer observes its row')
  for (const [file, src] of Object.entries({ 'SpectrumBench.jsx': BENCH, 'SpectrumProof.jsx': PROOF })) {
    assert.ok(!scrollListener.test(src), `${file} adds a scroll listener. Both ran one per frame before; an observer replaced them.`)
    assert.ok(!/onScroll|\.onscroll/.test(src), `${file} has an onScroll handler`)
  }
})

test('U4: the band\'s hue listener is attached from an IntersectionObserver callback only', () => {
  const at = RAMP.search(scrollListener)
  assert.ok(at > -1, 'SpectrumRamp.jsx no longer listens to scroll at all, so the hue spin is gone or moved')
  assert.equal([...RAMP.matchAll(new RegExp(scrollListener.source, 'g'))].length, 1, 'SpectrumRamp.jsx has more than one scroll listener')

  // The one listener sits in `attach`, so every question is "who calls attach()".
  const fn = /const attach = \(\) => \{/.exec(RAMP)
  assert.ok(fn, 'the listener is no longer inside a function named attach')
  const fnEnd = matching(RAMP, fn.index + fn[0].length - 1, '{', '}')
  assert.ok(at > fn.index && at < fnEnd, 'the scroll listener is outside attach(), so it can be attached unconditionally')

  const ioStart = RAMP.indexOf('new IntersectionObserver(')
  assert.ok(ioStart > -1, 'SpectrumRamp.jsx no longer creates an IntersectionObserver')
  const ioEnd = matching(RAMP, ioStart + 'new IntersectionObserver'.length, '(', ')')
  const calls = [...RAMP.matchAll(/\battach\(\)/g)].map((m) => m.index).filter((i) => i < fn.index || i > fnEnd)
  assert.ok(calls.length >= 1, 'nothing calls attach()')
  for (const i of calls) {
    const inObserver = i > ioStart && i < ioEnd
    // The one other caller is the branch for a browser with no IntersectionObserver at all.
    const inFallback = /typeof IntersectionObserver === 'undefined'\)\s*\{[^}]*$/.test(RAMP.slice(0, i))
    assert.ok(inObserver || inFallback,
      'attach() is called outside the observer callback: ...' + RAMP.slice(Math.max(0, i - 60), i + 10).replace(/\s+/g, ' '))
  }
  assert.ok(calls.some((i) => i > ioStart && i < ioEnd), 'the observer callback never calls attach()')
  // Leaving the viewport takes it off again.
  assert.ok(/removeEventListener\(\s*['"`]scroll['"`]/.test(RAMP), 'the hue listener is never removed')
  assert.ok(/\bdetach\(\)/.test(RAMP.slice(ioStart, ioEnd)), 'the observer callback never detaches the listener when the band leaves')
})

// ── U5 ──────────────────────────────────────────────────────────────────────

test('U5: the served shell carries none of the arrival', () => {
  const ARRIVAL = ['is-arriving', 'sp-arrive', 'sp-ramp--arrive', '--sp-arrive-at', 'sp-bar-set']
  const shells = {
    'homeShellRoot()': homeShellRoot(),
    'applyHomeShell(index.html)': applyHomeShell(read('index.html')),
    'scripts/home-shell.mjs': stripComments(read('scripts/home-shell.mjs')),
  }
  const dist = `${process.env.DIST_DIR || 'dist'}/index.html`
  if (fs.existsSync(dist)) shells[dist] = read(dist)
  for (const [where, html] of Object.entries(shells)) {
    for (const word of ARRIVAL) assert.ok(!html.includes(word), `${where} contains "${word}". The headline would be served mid-arrival.`)
  }
  // POSITIVE CONTROL: it is the real shell, and the hero header is still the bare one.
  assert.ok(shells['homeShellRoot()'].includes('<header class="sp-hero">'), 'the shell\'s hero header is no longer the bare <header class="sp-hero">')
  assert.ok(shells['homeShellRoot()'].includes('<h1 class="sp-hero-h1">'), 'the shell lost its headline')
})

test('U5: the hero\'s arrival is decided in React, from the same first render as the headline', () => {
  const page = js('src/pages/Spectrum.jsx')
  assert.match(page, /\[arrive\] = useState\(\(\) =>[^)]*prefersReducedMotion\(\)/,
    'the arrival is no longer decided once, in the first render, with a reduced-motion check')
  assert.ok(!/<h1[^>]*is-arriving/.test(page), 'the h1 carries the arrival class')
})
