// THE SCROLL-LINKED DEPTH OF THE HOMEPAGE'S TWO PINNED SECTIONS: WHAT MUST STAY TRUE.
//
// Exports (home-exports.css): a card covered by the next scales to .96 and dims, driven by a
// view timeline (no scroll listener), and a visitor who asked for no motion gets the plain stack.
// Try (home-try.css): the pinned column moves by transform only, and its progress line steps
// with the active tool under reduced motion.
//
// These read the sheets as text. They cannot see a runtime fault; tests/user-sim/148 and 312
// measure the rendered result. What the text can see is a dropped guard, a keyframe that
// animates a layout property, or a banned effect creeping in.
//
// MUTATIONS (each turns a test red):
//   - delete the `animation: none` guards for .hx-card -> "reduced motion" tests.
//   - add `width` or `top` to @keyframes hx-cover -> "keyframes move transform and opacity only".
//   - add a gradient, will-change or `transition: all` to either sheet -> "no banned effect".
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'

const EXPORTS = stripComments(read('src/styles/pages/home-exports.css'))
const TRY = stripComments(read('src/styles/pages/home-try.css'))
const TOKENS = stripComments(read('src/styles/pages/home-tokens.css'))
const EXPORTS_JSX = read('src/components/home/HomeExports.jsx')
const TRY_JSX = read('src/components/home/HomeTry.jsx')

test('the stripper works, so the reads below can be trusted', () => {
  assert.ok(EXPORTS.includes('.hx-card'), 'home-exports.css was not read')
  assert.ok(TRY.includes('.ht-names'), 'home-try.css was not read')
  assert.ok(!/\/\*/.test(EXPORTS), 'comments were not stripped')
})

test('exports: the covered card scales to .96 and dims, from a view timeline on the covering card', () => {
  assert.match(EXPORTS, /@keyframes hx-cover\s*\{\s*to\s*\{\s*transform:\s*scale\(\.96\)/)
  assert.match(EXPORTS, /@keyframes hx-dim\s*\{\s*to\s*\{\s*opacity:\s*\.\d+/)
  assert.match(EXPORTS, /view-timeline-name:\s*--hx-t1/)
  assert.match(EXPORTS, /view-timeline-name:\s*--hx-t2/)
  assert.match(EXPORTS, /timeline-scope:\s*--hx-t1,\s*--hx-t2/)
  assert.match(EXPORTS, /\.hx-card\[data-card="0"\][^{]*\{\s*animation-timeline:\s*--hx-t1/)
  assert.match(EXPORTS, /animation-range:\s*exit/)
  // The last card is never covered, so it has no timeline of its own to scale by.
  assert.ok(!/data-card="2"[^{]*\{[^}]*animation-timeline/.test(EXPORTS))
})

test('exports: the animation sits behind a support check, so an older browser keeps the plain stack', () => {
  const at = EXPORTS.indexOf('@supports (animation-timeline: view())')
  assert.ok(at > -1, 'the scroll-linked rules are not behind @supports')
  assert.ok(EXPORTS.indexOf('animation-name: hx-cover') > at, 'hx-cover is applied outside the @supports block')
})

test('exports: reduced motion (the setting and the OS) switches the cover off', () => {
  assert.match(EXPORTS, /:where\(html\[data-reduced-motion="true"\]\) \.hx \.hx-card,\s*:where\(html\[data-reduced-motion="true"\]\) \.hx \.hx-card::after \{ animation: none; \}/)
  assert.match(EXPORTS, /:where\(html:not\(\[data-reduced-motion="false"\]\)\) \.hx \.hx-card,\s*:where\(html:not\(\[data-reduced-motion="false"\]\)\) \.hx \.hx-card::after \{ animation: none; \}/)
  // The guards come after the rules they switch off, or an equal-specificity tie goes the wrong way.
  assert.ok(EXPORTS.lastIndexOf('animation-name: hx-dim') < EXPORTS.indexOf(':where(html[data-reduced-motion="true"]) .hx .hx-card'))
})

test('keyframes move transform and opacity only', () => {
  for (const [name, css] of [['exports', EXPORTS]]) {
    for (const k of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
      const props = [...k[2].matchAll(/([\w-]+)\s*:/g)].map((m) => m[1])
      assert.ok(props.length > 0, `@keyframes ${k[1]} has no declarations the reader could see`)
      for (const p of props) assert.ok(p === 'transform' || p === 'opacity', `${name} @keyframes ${k[1]} animates ${p}`)
    }
  }
})

test('no banned effect in either sheet: gradient, glow, transition: all, will-change', () => {
  for (const [name, css] of [['home-exports.css', EXPORTS], ['home-try.css', TRY]]) {
    assert.ok(!/transition(-property)?\s*:\s*all\b/.test(css), `${name} has transition: all`)
    assert.ok(!/will-change/.test(css), `${name} has will-change`)
    // The Try font list fades its foot with a mask; that is the one gradient, and it is not paint.
    const gradients = css.match(/(linear|radial|conic)-gradient\(/g) ?? []
    assert.ok(gradients.length <= (name === 'home-try.css' ? 2 : 0), `${name} paints a gradient`)
  }
})

test('the elevation scale is defined once and the cards use it', () => {
  for (const n of [1, 2, 3]) assert.match(TOKENS, new RegExp(`--hm-elev-${n}:`))
  assert.match(EXPORTS, /box-shadow:\s*var\(--hm-elev-3\)/)
})

test('exports: the cover adds no scroll listener', () => {
  assert.ok(!/addEventListener\(\s*['"]scroll['"]/.test(EXPORTS_JSX), 'HomeExports.jsx listens to scroll')
  // Nor does it write a transform or opacity from script: the scale and dim are the stylesheet's alone.
  assert.ok(!/style\.(transform|opacity)\s*=|setProperty\(\s*['"](transform|opacity)['"]/.test(EXPORTS_JSX), 'HomeExports.jsx sets transform or opacity from script')
})

test('try: the pinned column moves by transform, and its progress line follows the scroll', () => {
  assert.match(TRY, /\.ht-it\[data-after="true"\]\s*\{\s*transform:\s*translateY\(var\(--open-h/)
  assert.ok(!/grid-template-rows\s*:\s*0fr/.test(TRY), 'the description opens by a grid-rows (layout) transition again')
  assert.match(TRY, /\.ht-prog\s*\{[^}]*transform:\s*scaleX\(var\(--p/)
  assert.match(TRY_JSX, /setProperty\('--p'/)
  assert.match(TRY_JSX, /setProperty\('--open-h'/)
})

test('try: reduced motion drops the glide and makes the progress line step with the active tool', () => {
  assert.match(TRY, /html\[data-reduced-motion="true"\] \.ht-prog \{ transform: scaleX\(calc\(\(var\(--k, 0\) \+ 1\) \/ 4\)\); \}/)
  assert.match(TRY, /html:not\(\[data-reduced-motion="false"\]\) \.ht-prog \{ transform: scaleX\(calc\(\(var\(--k, 0\) \+ 1\) \/ 4\)\); \}/)
  assert.match(TRY, /html\[data-reduced-motion="true"\] \.ht-it,\s*html\[data-reduced-motion="true"\] \.ht-prog \{ transition: none; \}/)
})
