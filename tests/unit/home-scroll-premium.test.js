// THE HOMEPAGE'S TWO PINNED SECTIONS: WHAT MUST STAY TRUE.
//
// Exports (home-exports.css): the stacked cards are a still pile. A covered card does not scale, dim,
// filter or cast a shadow, nothing in the sheet animates a card, and the stack sits behind a media query
// so a small or short window gets the plain column.
// Try (home-try.css): the pinned column moves by transform only, and its progress line steps
// with the active tool under reduced motion.
//
// These read the sheets as text. They cannot see a runtime fault; tests/user-sim/148 and 312
// measure the rendered result. What the text can see is a dropped guard, a keyframe that
// animates a layout property, or a banned effect creeping in.
//
// MUTATIONS (each turns a test red):
//   - add `transform: scale(...)`, `filter` or `box-shadow` to .hx-card, or an `::after` on it -> "the covered card stays as it was".
//   - move `position: sticky` out of the 1024x560 media query -> "the stack sits behind a size query".
//   - add `width` or `top` to a @keyframes in either sheet -> "keyframes move transform and opacity only".
//   - add a gradient, will-change or `transition: all` to either sheet -> "no banned effect".
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'

const EXPORTS = stripComments(read('src/styles/pages/home-exports.css'))
const TRY = stripComments(read('src/styles/pages/home-try.css'))
const EXPORTS_JSX = read('src/components/home/HomeExports.jsx')
const TRY_JSX = read('src/components/home/HomeTry.jsx')

// The declarations of every top-level rule whose selector is exactly `selector`.
const rule = (css, selector) => css.split('}').map((chunk) => chunk.split('{')).filter(([sel, body]) => body !== undefined && sel.trim() === selector).map(([, body]) => body).join(';')
// The body of the stack's media query: from its opening line to the first closing brace in column 0.
const STACK_QUERY = /@media \(min-width: 1024px\) and \(min-height: 560px\) \{([\s\S]*?)\r?\n\}/

test('the stripper works, so the reads below can be trusted', () => {
  assert.ok(EXPORTS.includes('.hx-card'), 'home-exports.css was not read')
  assert.ok(TRY.includes('.ht-names'), 'home-try.css was not read')
  assert.ok(!/\/\*/.test(EXPORTS), 'comments were not stripped')
})

test('exports: the covered card stays as it was (no scale, dim, filter, shadow or animation)', () => {
  const card = rule(EXPORTS, '.hx-card')
  assert.ok(card.includes('border-radius'), 'the .hx-card rule was not found')
  assert.ok(!/transform|filter|box-shadow|opacity|animation/.test(card), '.hx-card changes how a covered card looks')
  assert.ok(!/\.hx-card[^{]*::(after|before)/.test(EXPORTS), 'a layer over the card is back')
  assert.ok(!/@keyframes|animation-timeline|view-timeline|animation-name/.test(EXPORTS), 'the exports sheet animates something')
})

test('exports: the stack sits behind a size query, so a small or short window gets the plain column', () => {
  assert.ok(!/position:\s*sticky/.test(EXPORTS.replace(STACK_QUERY, '')), 'sticky is applied outside the 1024x560 query')
  const stack = EXPORTS.match(STACK_QUERY)?.[1] ?? ''
  assert.match(stack, /--hx-base:\s*clamp\(24px, calc\(\(100svh - 664px\) \/ 2\), 84px\)/)
  assert.match(stack, /\.hx-card\[data-card="2"\] \{ top: calc\(var\(--hx-base\) \+ var\(--hx-edge\) \* 2\); \}/)
  assert.match(stack, /\.hx-tail \{ height: 240px; \}/)
  assert.match(EXPORTS, /\.hx \{[^}]*--hx-edge:\s*12px/)
  assert.match(rule(EXPORTS, '.hx-foot'), /margin:\s*48px 0 0/)
})

test('keyframes move transform and opacity only', () => {
  for (const [name, css] of [['exports', EXPORTS], ['try', TRY]]) {
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
    // The exports tile's wordmark band is one black fade, the tile's own design; nothing else paints one.
    assert.ok(gradients.length <= (name === 'home-try.css' ? 2 : 1), `${name} paints a gradient`)
  }
  assert.match(EXPORTS, /\.hx-scrim\s*\{[^}]*linear-gradient\(to top, rgba\(0, 0, 0, \.86\) 0%, rgba\(0, 0, 0, \.76\) 68%, rgba\(0, 0, 0, 0\) 100%\)/, 'the one exports gradient is the wordmark band')
})

test('exports: the stack adds no scroll listener and writes no transform or opacity', () => {
  assert.ok(!/addEventListener\(\s*['"]scroll['"]/.test(EXPORTS_JSX), 'HomeExports.jsx listens to scroll')
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
