// C6 — the hero search bar types a query, holds, backspaces, types the next.
//
// FOUNDER: "can we make the search bar show a animation of typing something,
// then after a couple of seconds it backspaces then types another thing."
//
// EVIDENCE, stated honestly: Mobbin returned NO capture of a typing animation.
// Every pacing number is `judgement` and none of it is research-backed. What is
// NOT judgement is the two things that could break, and those are what these
// tests guard:
//
//   1. CLS. The homepage baseline is mean 0.0000 / worst 0.0000 on the
//      `homepage-field-metrics` profile. The demo string is painted in an
//      OUT-OF-FLOW overlay whose width comes from `.hcmd-bar`'s grid track
//      (`auto minmax(0,1fr) auto`), never from its content, so no string length
//      can move anything. Measured 0.0000 again after this shipped. The spec
//      explicitly rejects revealing `.hcmd-results` as part of this animation
//      because THAT is an in-flow sibling.
//   2. The visitor. It must never type into a real field, never take focus,
//      yield the instant anyone touches the bar, never resume over them, and
//      never be announced as though the visitor typed it.
//
// Rendered behaviour for all of that was verified in Chromium (see the PR); a
// source test cannot prove a caret blinks. These guard the structural promises
// that make the rendered behaviour possible.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// Comments here quote the very declarations under test, so strip first — same
// reasoning as hero-entrance.test.js.
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const css = stripCss(read('src/styles/global.css'))
const bar = stripJs(read('src/components/HomeCommandBar.jsx'))
const appearance = stripJs(read('src/contexts/AppearanceContext.jsx'))
const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '')

const rule = (selector) => {
  const m = new RegExp(`(^|\\})\\s*${selector.replace(/[.[\]*+?^$|(){}\\]/g, '\\$&')}\\{([^}]*)\\}`, 'm').exec(css)
  return m ? m[2] : null
}

// ── 1 · the CLS guarantee is structural ─────────────────────────────────────

test('the demo string is painted out of flow', () => {
  // This single declaration is the whole reserved-width argument. In flow, a
  // ten-character query would size the field and move the bar's siblings.
  const ghost = rule('.hcmd-ghost')
  assert.ok(ghost, '.hcmd-ghost is gone')
  assert.match(ghost, /position\s*:\s*absolute/,
    'the overlay must be out of flow or the typed string contributes to layout')
  assert.match(ghost, /inset\s*:\s*0/)
  assert.match(ghost, /pointer-events\s*:\s*none/,
    'the overlay sits over a real input and must never eat a click')
})

test('the field keeps its width from the grid track, not its content', () => {
  const barRule = rule('.hcmd-bar')
  assert.ok(barRule, '.hcmd-bar is gone')
  assert.match(barRule, /grid-template-columns\s*:\s*auto minmax\(0,\s*1fr\) auto/,
    'the bar must keep the track that sizes the input independently of its content')
  const field = rule('.hcmd-field')
  assert.ok(field, '.hcmd-field wrapper is gone')
  assert.match(field, /position\s*:\s*relative/, 'the overlay needs this as its containing block')
  assert.match(field, /min-width\s*:\s*0/, 'without min-width:0 the track cannot shrink')
})

test('the results panel is not part of this animation', () => {
  // `.hcmd-results` is an IN-FLOW sibling below the bar. Showing it as a payoff
  // for the demo query would move every element beneath it — a guaranteed CLS
  // regression against a 0.0000 baseline.
  assert.ok(!/GHOST[\s\S]{0,400}hcmd-results/.test(bar),
    'the typing demo must not drive the results panel')
  const results = rule('.hcmd-results')
  assert.ok(results && !/position\s*:\s*absolute/.test(results),
    'if .hcmd-results ever goes out of flow, re-check the rejection above')
})

// ── 2 · it never impersonates the visitor ───────────────────────────────────

test('the animated string is never the input value or the placeholder', () => {
  // Cycling `value` would leave a field the visitor has to clear; cycling the
  // `placeholder` attribute would put the moving string into the DOM the
  // accessibility tree reads.
  assert.match(bar, /placeholder="Search tools/,
    'the placeholder must stay static')
  assert.ok(!/placeholder=\{/.test(bar),
    'the placeholder attribute is being computed — it must not carry the animation')
  assert.ok(!/value=\{ghost\}/.test(bar),
    'the animated string is being written into the input value')
  assert.match(bar, /value=\{query\}/, 'the input must stay bound to the real query state')
})

test('the overlay is hidden from assistive technology', () => {
  const overlay = /<span className="hcmd-ghost"[\s\S]{0,200}?>/.exec(bar)?.[0] || ''
  assert.ok(overlay, 'the overlay element is gone')
  assert.match(overlay, /aria-hidden="true"/,
    'a screen reader must never be told the visitor typed the demo string')
  assert.match(bar, /aria-label="Search every UIL4B tool"/,
    'the accessible name must stay stable and must not come from the animation')
})

test('any sign of a real visitor stops it, permanently', () => {
  for (const handler of ['onFocusCapture', 'onPointerDownCapture', 'onKeyDownCapture']) {
    assert.ok(new RegExp(`${handler}=\\{stopGhost\\}`).test(bar),
      `${handler} must yield the bar to the visitor`)
  }
  // Typing yields too, and before the query state updates.
  assert.match(bar, /onChange=\{\(event\)\s*=>\s*\{\s*stopGhost\(\)/,
    'typing must stop the demo')
  // One-way: nothing may set it back on.
  const setsOn = [...bar.matchAll(/setGhostOn\(([^)]*)\)/g)].map((m) => m[1].trim())
  assert.deepEqual(setsOn, ['false'],
    `setGhostOn is called with ${setsOn.join(', ')} — the yield must be one-way, never resumed`)
  // And the overlay cannot paint over a real value.
  assert.match(bar, /const showGhost = ghostOn && !query/,
    'the overlay must not paint while the field has a value')
})

test('WCAG 2.2.2 — the stop is discoverable, not merely present', () => {
  // 2.2.2 (Pause, Stop, Hide) applies: the demo starts automatically, runs
  // ~14s (over the five-second threshold) and sits alongside other content. A
  // mechanism that exists but that nobody can find does not satisfy it.
  //
  // The ⌘K keycap already IS a stop — it focuses the input, which yields the
  // bar — so it names that while there is something to stop, rather than adding
  // a second control the page does not otherwise need.
  assert.match(bar, /showGhost \? 'Focus the tool search, and stop the search demonstration'/,
    'the keycap must announce that it stops the demo while the demo is running')
  assert.match(bar, /: 'Focus the tool search'/,
    'and must go back to its plain name once there is nothing left to stop')

  // The practical half: ANY first interaction ends it, not only one aimed at
  // the bar, so a visitor who simply scrolls or presses a key is obeyed.
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    assert.ok(bar.includes(`'${type}'`), `${type} must end the demo`)
  }
  assert.match(bar, /once: true, passive: true/,
    'the page-level listeners must be passive and fire once — they must not cost a scroll')
})

// ── 3 · pacing is tunable, one constant per beat ────────────────────────────

test('every timing is a named constant, and none is inline', () => {
  const expected = {
    GHOST_START_MS: 1200,
    GHOST_TYPE_MS: 60,
    GHOST_HOLD_MS: 2200,
    GHOST_ERASE_MS: 30,
    GHOST_GAP_MS: 500,
  }
  for (const [name, value] of Object.entries(expected)) {
    const m = new RegExp(`const ${name} = (\\d+)`).exec(bar)
    assert.ok(m, `${name} is gone — each beat stays independently tunable`)
    assert.equal(Number(m[1]), value, `${name} changed`)
  }
  // No raw millisecond literal in the driver itself.
  const driver = /const runQuery[\s\S]*?type\(1\)/.exec(bar)?.[0] || ''
  assert.ok(driver, 'the cycle driver is gone')
  assert.ok(!/wait\(\s*\d+/.test(driver),
    'a raw duration is back in the driver — every beat must come from a constant')
})

test('it runs one pass and stops, rather than looping forever', () => {
  // Motion in a reader's peripheral vision while they read the headline is the
  // gimmick failure the research warns about.
  assert.ok(!/setInterval/.test(bar), 'an interval is back — the cycle must not loop')
  assert.match(bar, /qi === GHOST_QUERIES\.length - 1/,
    'the final query must end the cycle rather than wrap around')
})

// ── 4 · reduced motion, in both directions ──────────────────────────────────

test('the cycle never starts under reduced motion, and paints no caret', () => {
  assert.match(bar, /if \(reduced\) return/,
    'the driver must bail out entirely when motion is off')
  assert.match(bar, /\{!reduced && <i className="hcmd-caret" \/>\}/,
    'no caret may render under reduced motion')
  assert.match(bar, /useState\(prefersReducedMotion\)/,
    'reduced motion must be read from the shared contract, not re-implemented')
  assert.match(bar, /from '\.\.\/hooks\/useHomeMotion'/,
    'the homepage must keep ONE definition of "motion is off"')
})

test('the CSS mirrors the contract in both directions', () => {
  // The attribute wins over the OS query BOTH ways, so a visitor who turned
  // motion back on inside the app still gets the animation.
  assert.match(css, /html\[data-reduced-motion="true"\] \.hcmd-caret\{animation:none\}/,
    'the explicit-on branch is missing')
  assert.match(css, /html:not\(\[data-reduced-motion="false"\]\) \.hcmd-caret\{animation:none\}/,
    'the OS branch is missing, or is not excluding an explicit opt-back-in')
})

// ── 5 · the defect that made every reduced-motion branch dead code ──────────

test('no reduced-motion preference is fabricated for a visitor who never chose', () => {
  // MEASURED: with OS `prefers-reduced-motion: reduce` on and a fresh profile,
  // html[data-reduced-motion] read "false" at DOMContentLoaded, because the
  // inline bootstrap wrote String(!!undefined). An explicit "false" beats the
  // OS query by contract, so the app ignored the OS setting app-wide and every
  // `@media (prefers-reduced-motion:reduce) html:not([data-reduced-motion=
  // "false"])` rule in this stylesheet — the standard pattern used throughout —
  // was dead code.
  assert.ok(!/String\(!!a\.reducedMotion\)/.test(html),
    'index.html is fabricating an explicit "false" for visitors who never chose, '
    + 'which silently disables every prefers-reduced-motion rule in the app')
  assert.match(html, /typeof a\.reducedMotion==='boolean'/,
    'the bootstrap must distinguish "no choice" from an explicit false')
  assert.match(html, /prefers-reduced-motion: reduce/,
    'the bootstrap must fall back to the OS query when no choice was stored')

  // The React side has to agree, or its effect overwrites the bootstrap.
  assert.match(appearance, /reducedMotion:\s*undefined/,
    'AppearanceContext must treat "never chosen" as a third state, not as false')
  assert.match(appearance, /typeof prev\.reducedMotion === 'boolean'/,
    'a stored choice must be honoured, and an absent one must not become false')
})
