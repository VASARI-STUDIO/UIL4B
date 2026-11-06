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

test('nothing loops: the old spin is gone and the ring turns once', () => {
  assert.doesNotMatch(css, /chroma-spin/, 'the infinite chroma-spin is still declared or used')
  assert.doesNotMatch(css, /::before\{[^}]*animation:[^}]*infinite/, 'a ring rule still loops')
  assert.match(css, /::before\{opacity:\.92;--chroma-w:1\.5px;--chroma-angle:140deg;transition:opacity 320ms cubic-bezier\(\.25,1,\.5,1\),--chroma-w 360ms cubic-bezier\(\.25,1,\.5,1\),--chroma-angle 560ms cubic-bezier\(\.45,\.05,\.3,1\)\}/,
    'keyboard focus no longer fades in, thickens and turns once')
  assert.match(css, /@property --chroma-w\{syntax:'<length>';inherits:false;initial-value:\.5px\}/, 'the ring does not start at .5px')
  // Leaving: the width and angle reset only after the 280ms fade-out.
  assert.match(css, /opacity 280ms cubic-bezier\(\.25,1,\.5,1\),--chroma-w 0s linear 280ms,--chroma-angle 0s linear 280ms/)
})

test('hover shows the ring only where the pointer can hover; focus shows it everywhere', () => {
  const hoverRules = [...css.matchAll(/([^{}]*):hover[^{}]*::before\{[^}]*--chroma-w:1\.5px[^}]*\}/g)]
  assert.ok(hoverRules.length >= 1, 'no hover rule thickens the ring')
  for (const m of hoverRules) {
    const before = css.slice(0, m.index)
    const media = before.lastIndexOf('@media')
    const opens = before.slice(media).split('{').length - 1
    const closes = before.slice(media).split('}').length - 1
    assert.ok(media >= 0 && opens > closes, 'a hover ring rule sits outside any media query')
    assert.match(before.slice(media), /^@media \(hover:hover\) and \(pointer:fine\)\{/, 'the hover ring is not gated on a hover-capable pointer')
    // The 40ms intent delay on all three properties.
    assert.equal((m[0].match(/ 40ms/g) || []).length, 3, 'hover does not wait 40ms on opacity, width and angle')
  }
  assert.match(css, /\):focus-visible::before\{opacity:\.92;/, 'keyboard focus no longer shows the ring')
  assert.match(css, /@media \(hover:none\)\{[^@]*:active[^@]*::before\{opacity:\.92;[^}]*transition:none\}/, 'touch has no press flash')
})

test('reduced motion keeps a still 1.5px ring in both spellings; forced colours drop it', () => {
  assert.match(css, /html\[data-reduced-motion="true"\] :is\([^)]*\.tl-btn\)::before\{--chroma-w:1\.5px;--chroma-angle:140deg;transition:opacity 120ms linear!important\}/)
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\s*html:not\(\[data-reduced-motion="false"\]\) :is\([^)]*\.tl-btn\)::before\{--chroma-w:1\.5px;--chroma-angle:140deg;transition:opacity 120ms linear!important\}/)
  assert.match(css, /@media \(forced-colors:active\)\{\s*:is\([^)]*\.tl-btn\)::before\{content:none\}/)
  assert.match(css, /@property --chroma-angle\{syntax:'<angle>'/)
})

test('go arrows turn in place in 320ms and never travel; Next leans 3px', () => {
  // These two sheets are written one declaration per line; fold whitespace so the rules read the same either way.
  const flat = (p) => stripCss(read(p)).replace(/\s+/g, ' ')
  const home = flat('src/styles/pages/home-tokens.css')
  const hoverOnly = '@media \\(hover: ?hover\\) and \\(pointer: ?fine\\) ?\\{[^@]*?'
  assert.match(home, /\.mi-go ?\{[^}]*transition: ?transform 320ms cubic-bezier\(\.25, ?1, ?\.5, ?1\)/)
  assert.match(home, new RegExp(`${hoverOnly}:hover > \\.mi-go ?\\{ ?transform: ?rotate\\(45deg\\)`), 'a diagonal go arrow does not turn 45deg on hover')
  assert.match(home, new RegExp(`${hoverOnly}:hover > \\.mi-go--r, :hover > \\.mi-go--e ?\\{ ?transform: ?rotate\\(-45deg\\)`), 'a right go arrow does not turn -45deg on hover')
  assert.match(home, /:focus-visible > \.mi-go ?\{ ?transform: ?rotate\(45deg\)/, 'keyboard focus does not turn the go arrow')
  assert.match(home, new RegExp(`${hoverOnly}:hover > \\.mi-nx ?\\{ ?transform: ?translateX\\(3px\\)`), 'Next does not lean 3px on hover')
  assert.match(home, /\.mi-nx ?\{ ?transition: ?transform 180ms/)
  assert.match(home, /:active > \.mi-nx ?\{[^}]*transition-duration: ?100ms/)
  assert.doesNotMatch(home, /\.mi-go[^{]*\{[^}]*translate/, 'a go arrow travels')
  assert.match(home, /html\[data-reduced-motion="true"\] :is\(\.mi-go, \.mi-nx\) ?\{ ?transition: ?none; ?transform: ?none !important/)
  assert.match(home, /@media \(prefers-reduced-motion: ?reduce\) ?\{ ?html:not\(\[data-reduced-motion="false"\]\) :is\(\.mi-go, \.mi-nx\) ?\{ ?transition: ?none/)
  const spectrum = flat('src/styles/pages/spectrum.css')
  assert.match(spectrum, /\.sp-pill-icon ?\{[^}]*transition: ?transform 320ms cubic-bezier\(\.25, ?1, ?\.5, ?1\)/)
})

test('filled buttons are left out of the ring', () => {
  const sel = /:is\((\.btn:not\([^{]*?\)),\.ui-pill-out/.exec(css)
  assert.ok(sel, 'the ring selector was not found')
  for (const filled of ['.btn-accent', '.btn-primary', '.btn-inverse', '.btn-ghost']) {
    assert.ok(sel[1].includes(`:not(${filled})`), `${filled} is not excluded from the ring`)
  }
})
