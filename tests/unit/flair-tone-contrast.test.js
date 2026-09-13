// The flair tones, checked as NUMBERS, on the tint each one actually lands on.
//
// WHY THIS FILE EXISTS AND WHY IT IS A UNIT TEST.
// .flair paints 10.5px BOLD text in --flair-c on a 12% tint OF THE SAME COLOUR.
// So the ground is a function of the ink, and a tone that reads fine on a bare
// card can still fail here — which is exactly what shipped. Measured on the
// rendered page before the fix, worst real ground per theme:
//   blue #2563EB 3.80 light / 2.75 dark   violet #7C3AED 4.14 / 2.54
//   rose #E11D48 3.38 / 3.12              amber  #D97706 2.44 / 4.22
//   green #15803D 3.71 / 2.82             slate  #64748B 5.49 / 2.92
//   gold  #B7791F 2.78 / 3.72
// Eleven of the fourteen missed 4.5:1. The named tones were raw hexes with no
// dark values at all, so dark painted the light ones.
//
// THE RENDERED HALF CANNOT COVER THIS, which is the reason the arithmetic lives
// here rather than in the Playwright suite. .flair renders only on /settings and
// in signed-in community bylines, and the user-sim suite is signed out — #331
// measured these tones by hand and left them for exactly that reason. A test
// that cannot run is not a test, so this half does the whole job from the
// declared values and needs no session.
//
// GOLD IS THE CASE THAT MATTERS MOST HERE. Its background is a linear-gradient,
// and every contrast walker in this repo bails on a background-image (groundOf()
// returns null for one, deliberately, because a photo or gradient makes the
// ground unknowable). So gold is INVISIBLE to the rendered walk in both themes —
// it scored nothing and passed. Its two gradient stops are checked below by
// hand, which is the only place they are checked at all.
import test from 'node:test'
import assert from 'node:assert/strict'
import { luminance } from '../../src/utils/colors.js'
// Reads the WHOLE app stylesheet, not global.css alone. The rules this file
// asserts on were split out of global.css into src/styles/deferred/*.css on
// 2026-09-13; a test that keeps reading one file after a lift like that does
// not go red, it goes VACUOUS. See tests/unit/appStylesheets.js.
import { ALL_CSS } from './appStylesheets.js'

const RAW = ALL_CSS
// Blank out comments first, preserving offsets. This file's own measurement
// tables in global.css are full of hex literals that would otherwise be read as
// declarations — the sibling category-hue-contrast.test.js was caught by a
// mutation run passing only because a stale comment still named the old value.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const rgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

// THE ARITHMETIC IS THE APP'S OWN, AND IT IS NOT ROUNDED.
//
// This file used to carry a private srgb/lumRgb/ratio triple ending
// `Math.round(r * 100) / 100`. The rounding is the part that mattered:
// rounding to two places BEFORE the comparison gives the floor a free half
// hundredth, so a tone measuring 4.4951:1 on its own tint rounded to 4.5 and
// cleared `>= AA`. A contrast floor that cannot fail on the near miss is not a
// floor — and the near miss is the whole failure mode here, because these
// tones are hand-nudged one hex step at a time.
//
// `luminance` is imported rather than reimplemented for the second reason: a
// test that carries its own copy of the formula is only checking that copy. It
// is the same function the Contrast Checker and the palette engine report to
// the user, so this file can no longer certify a pair the product itself
// calls a failure. Same route as preview-roles-contrast.test.js.
//
// It takes CHANNELS, not a hex, which is what `tint` below needs: a composited
// tint lands on fractional channel values and must not be re-quantised to a
// hex before it is measured.
const ratio = (a, b) => {
  const hi = Math.max(luminance(...a), luminance(...b))
  const lo = Math.min(luminance(...a), luminance(...b))
  return (hi + 0.05) / (lo + 0.05)
}
/** Two places, for humans reading a failure. Never fed back into a compare. */
const show = (r) => Math.round(r * 100) / 100
// color-mix(in srgb, C p%, transparent) painted over an opaque ground G
// composites to exactly p*C + (1-p)*G. That closed form is what lets this be
// arithmetic rather than a browser run.
const tint = (colour, ground, pct) => rgb(colour).map((c, i) => pct * c + (1 - pct) * rgb(ground)[i])

const TONES = ['blue', 'violet', 'rose', 'amber', 'green', 'slate', 'gold']
const AA = 4.5

// The grounds .flair actually lands on, READ OFF THE RENDERED PAGE rather than
// assumed: a pill was injected into /settings and /community in both themes and
// its composited ground reported back. Light: rows and cards are #FFFFFF, the
// page is #EFEEE9. Dark: #191A1D and #101012. #212327 is carried as a margin for
// inset rows. Adding --bg-3/--bg-4 to the light set as well would force amber to
// #864904 and gold to #795015 — brown, not amber — which is the cost of tuning
// against a ground you have not confirmed the element can sit on.
const LIGHT_GROUNDS = ['#FFFFFF', '#EFEEE9', '#F6F5F1']
const DARK_GROUNDS = ['#101012', '#191A1D', '#212327']

// ANCHORED AT THE START OF A LINE, and that is load-bearing. An unanchored
// /\.flair--gold\s*\{/ also matches the tail of
// `[data-theme="dark"] .flair--gold{...}`, and since this keeps the LAST match
// it silently reported the dark value as the light one — which is how the first
// run of this file "found" gold at 1.94:1 in light. Every selector below is
// therefore matched with `m` and a leading `^`.
const valueOf = (selector, token) => {
  const re = new RegExp(`^${selector}\\s*\\{([^}]*)\\}`, 'gm')
  let found = null
  let m
  while ((m = re.exec(CSS)) !== null) {
    const d = [...m[1].matchAll(new RegExp(`${token}\\s*:\\s*(#[0-9a-fA-F]{6})`, 'g'))]
    if (d.length) found = d[d.length - 1][1]
  }
  return found
}

const lightTone = (t) => valueOf(`\\.flair--${t}`, '--flair-c')
const darkTone = (t) => valueOf(`\\[data-theme="dark"\\] \\.flair--${t}`, '--flair-c')

test('every named flair tone has a light AND a dark value', () => {
  const missing = []
  for (const t of TONES) {
    if (!lightTone(t)) missing.push(`.flair--${t} has no light value`)
    if (!darkTone(t)) {
      missing.push(`.flair--${t} has no dark value — dark will paint the light one on #191A1D`)
    }
  }
  assert.equal(missing.length, 0, missing.join('\n'))
})

test('every flair tone clears 4.5:1 on its OWN 12% tint, on every ground it lands on', () => {
  const failures = []
  for (const t of TONES) {
    for (const [value, grounds, theme] of [
      [lightTone(t), LIGHT_GROUNDS, 'light'],
      [darkTone(t), DARK_GROUNDS, 'dark'],
    ]) {
      for (const g of grounds) {
        const r = ratio(rgb(value), tint(value, g, 0.12))
        if (r < AA) {
          failures.push(`  .flair--${t} ${theme} ${value} on its own 12% tint over ${g} = ${show(r)}:1`)
        }
      }
    }
  }
  assert.equal(failures.length, 0,
    'These tones paint 10.5px bold text under AA on their own tint:\n' + failures.join('\n'))
})

// Gold's gradient is the one ground no rendered walk in this repo can see.
test('the gold gradient carries its label at both stops, in both themes', () => {
  const failures = []
  for (const [tone, warm, grounds, theme] of [
    [lightTone('gold'), valueOf('\\.flair--gold', '--flair-warm'), LIGHT_GROUNDS, 'light'],
    [darkTone('gold'), valueOf('\\[data-theme="dark"\\] \\.flair--gold', '--flair-warm'), DARK_GROUNDS, 'dark'],
  ]) {
    assert.ok(tone, `gold has no ${theme} tone`)
    assert.ok(warm, `gold has no ${theme} --flair-warm stop — the gradient cannot be checked`)
    for (const g of grounds) {
      const atWarm = ratio(rgb(tone), tint(warm, g, 0.20))
      const atTone = ratio(rgb(tone), tint(tone, g, 0.14))
      if (atWarm < AA) failures.push(`  gold ${theme} ${tone} on the 20% ${warm} stop over ${g} = ${show(atWarm)}:1`)
      if (atTone < AA) failures.push(`  gold ${theme} ${tone} on the 14% ${tone} stop over ${g} = ${show(atTone)}:1`)
    }
  }
  assert.equal(failures.length, 0,
    'A gradient ground is skipped by every contrast walk in this repo, so these\n'
    + 'numbers exist nowhere else:\n' + failures.join('\n'))
})

// The mirror case. The selected chip fills with the tone and puts --flair-fg on
// it; the state tokens carry --ok-fg/--warn-fg/--err-fg for the same reason.
test('the selected flair chip carries its label on the solid tone fill', () => {
  const fgLight = valueOf('\\.flair', '--flair-fg') || '#fff'
  const fgDark = valueOf('\\[data-theme="dark"\\] \\.flair', '--flair-fg')
  assert.ok(fgDark, '--flair-fg has no dark value. The dark tones are LIGHT, so white ink\n'
    + 'on them measures about 2.8:1 — adding dark tones without inverting this\n'
    + 'foreground creates the bug it was meant to avoid.')
  const failures = []
  for (const [fg, tone, theme] of [
    ...TONES.map((t) => [fgLight, lightTone(t), `light .flair--${t}`]),
    ...TONES.map((t) => [fgDark, darkTone(t), `dark .flair--${t}`]),
  ]) {
    const ink = fg === '#fff' ? '#ffffff' : fg
    const r = ratio(rgb(ink), rgb(tone))
    if (r < AA) failures.push(`  ${theme}: ${ink} on a solid ${tone} fill = ${show(r)}:1`)
  }
  assert.equal(failures.length, 0,
    'The selected chip is 11.5px text on a solid fill:\n' + failures.join('\n'))
})

// Opacity is the trap this block was rebuilt to avoid, and it is invisible to a
// value-based check like the ones above: it fades ink and ground toward each
// other, so every declared hex still measures fine while the rendered pill does
// not. At .62 these labels measured 2.52:1 light and 2.80:1 dark.
test('the flair picker chips are not muted with opacity', () => {
  const block = CSS.match(/\.flairpick-chip\s*\{([^}]*)\}/)
  assert.ok(block, '.flairpick-chip rule not found')
  assert.ok(!/opacity\s*:/.test(block[1]),
    'The resting chip is muted with opacity again. Opacity fades the LABEL as well\n'
    + 'as the fill and cannot be compensated for by any choice of colour — measured\n'
    + '2.52:1 light and 2.80:1 dark at .62, and only 3.68/3.92 even at .82. These are\n'
    + 'real buttons; mute the surface (a weaker tint) and leave the ink alone.')
})
