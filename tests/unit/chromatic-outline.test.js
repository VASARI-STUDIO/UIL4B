// The chromatic outline on outline-only buttons: its hues are the colour
// band's, its hover lives behind a hover-capable pointer, and it stands still
// under reduced motion and disappears under forced colours.
// tests/user-sim/99-chromatic-outline.spec.js checks the same on the page.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripCss } from '../helpers/strip-comments.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const css = stripCss(read('src/styles/global.css'))

test('the ring draws the colour band\'s chromatic hues, in order, closed', () => {
  const ramp = read('src/components/spectrum/SpectrumRamp.jsx')
  const table = /const BARS = \[([\s\S]*?)\n\]/.exec(ramp)
  assert.ok(table, 'SpectrumRamp.jsx no longer declares BARS')
  const bars = [...table[1].matchAll(/\[(\d+), (\d+), (\d+), \d+\]/g)].map((m) => m.slice(1, 4).map(Number))
  assert.ok(bars.length >= 18, `only ${bars.length} bars read`)
  // The chromatic bars; the neutral tail (saturation under 20%) is left out.
  const hues = bars.filter(([, s]) => s >= 20).map(([h, s, l]) => `hsl(${h} ${s}% ${l}%)`)
  const conic = /conic-gradient\(from var\(--chroma-angle\),([^)]*\)(?:,hsl\([^)]*\))*)\)/.exec(css)
  assert.ok(conic, 'the chromatic ring gradient was not found in global.css')
  const stops = conic[1].match(/hsl\([^)]*\)/g)
  assert.deepEqual(stops, [...hues, hues[0]])
})

test('hover shows the ring only where the pointer can hover; focus shows it everywhere', () => {
  const hoverRules = [...css.matchAll(/([^{}]*):hover[^{}]*::before\{[^}]*chroma-spin[^}]*\}/g)]
  assert.ok(hoverRules.length >= 1, 'no hover rule starts the ring')
  for (const m of hoverRules) {
    const before = css.slice(0, m.index)
    const media = before.lastIndexOf('@media')
    const opens = before.slice(media).split('{').length - 1
    const closes = before.slice(media).split('}').length - 1
    assert.ok(media >= 0 && opens > closes, 'a hover ring rule sits outside any media query')
    assert.match(before.slice(media), /^@media \(hover:hover\) and \(pointer:fine\)\{/, 'the hover ring is not gated on a hover-capable pointer')
  }
  assert.match(css, /\):focus-visible::before\{opacity:1;animation:chroma-spin/, 'keyboard focus no longer shows the ring')
})

test('reduced motion keeps it still in both spellings; forced colours drop it', () => {
  assert.match(css, /html\[data-reduced-motion="true"\] :is\(\.btn,\.ui-pill-out,\.tl-btn\)::before\{animation:none!important\}/)
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\s*html:not\(\[data-reduced-motion="false"\]\) :is\(\.btn,\.ui-pill-out,\.tl-btn\)::before\{animation:none!important\}/)
  assert.match(css, /@media \(forced-colors:active\)\{\s*:is\(\.btn,\.ui-pill-out,\.tl-btn\)::before\{content:none\}/)
  assert.match(css, /@property --chroma-angle\{syntax:'<angle>'/)
})

test('filled buttons are left out of the ring', () => {
  const sel = /:is\((\.btn:not\([^{]*?\)),\.ui-pill-out/.exec(css)
  assert.ok(sel, 'the ring selector was not found')
  for (const filled of ['.btn-accent', '.btn-primary', '.btn-inverse', '.btn-ghost']) {
    assert.ok(sel[1].includes(`:not(${filled})`), `${filled} is not excluded from the ring`)
  }
})
