// A visitor who asks their OS for more contrast must get a different page.
//
// Until 2026-09-04, `grep -c prefers-contrast src/styles/global.css` returned
// ZERO across 11,000-plus lines. Rendered with the browser reporting
// prefers-contrast: more — matchMedia confirmed true in the run — every resolved
// token came back identical to the default: --border #dad8cf, --t2 #5f5f59,
// --t3 #6c6c66. The preference was received and ignored.
//
// There is one @media(forced-colors:active) block in the sheet, which is a
// different and much blunter mechanism (Windows High Contrast). It does nothing
// for the graded preference macOS Increase Contrast and Chrome expose, and a
// test that counted it would have reported this item as already done.
//
// TWO THINGS THIS FILE GUARDS, and the second is the one that actually bites.
//   1. The numbers: every token the block touches must move in the direction of
//      MORE contrast, and land on a real target.
//   2. The ORDERING. A media query adds NO specificity. These selectors are
//      (0,1,0), exactly like the [data-theme] blocks at the top of the file and
//      the Foundry blocks in the middle, so this block wins only by being later
//      in source. Placed above the Foundry light block it reads perfectly and
//      paints nothing — which is precisely how the first dark hue set shipped
//      dead, and why category-hue-contrast.test.js grew an ordering assertion.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { contrastRatio } from '../../src/utils/colors.js'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

// THE ARITHMETIC IS THE APP'S OWN, AND IT IS NOT ROUNDED.
//
// This file used to carry a private srgb/lum/ratio triple ending
// `Math.round(r * 100) / 100`. Rounding to two places BEFORE the comparison
// hands every floor here a free half-hundredth, so a token measuring 6.9951:1
// rounded to 7 and cleared AAA. That is worse in THIS file than in its
// siblings: the whole point of `prefers-contrast: more` is that a visitor has
// asked the OS for more headroom, so certifying a value that only reaches the
// floor once it has been rounded up to it defeats the block's reason to exist.
// Round for the MESSAGE, never for the compare.
//
// `contrastRatio` is imported rather than reimplemented because a test that
// carries its own copy of the formula only ever checks that copy. It is the
// same function the Contrast Checker reports to the user. Same route as
// preview-roles-contrast.test.js and plans-truth.test.js.
const ratio = (a, b) => contrastRatio(a, b)
/** Two places, for humans reading a failure. Never fed back into a compare. */
const show = (r) => Math.round(r * 100) / 100

/** Brace-matched body of the first block matching `selector` after `from`. */
const bodyAfter = (selector, from) => {
  const re = new RegExp(`${selector}\\s*\\{`, 'g')
  re.lastIndex = from
  const m = re.exec(CSS)
  if (!m) return null
  let depth = 1
  let i = m.index + m[0].length
  const start = i
  while (i < CSS.length && depth > 0) {
    if (CSS[i] === '{') depth++
    else if (CSS[i] === '}') depth--
    i++
  }
  return { body: CSS.slice(start, i - 1), at: m.index }
}

const MEDIA_AT = CSS.indexOf('@media (prefers-contrast: more)')

const declared = (themeSelector, token) => {
  const block = bodyAfter(`\\[data-theme="${themeSelector}"\\]`, MEDIA_AT)
  assert.ok(block, `no [data-theme="${themeSelector}"] block inside the prefers-contrast media query`)
  const m = [...block.body.matchAll(new RegExp(`${token}\\s*:\\s*(#[0-9a-fA-F]{6})`, 'g'))]
  return m.length ? m[m.length - 1][1] : null
}

// The grounds each theme actually paints text on.
const LIGHT_GROUNDS = ['#FFFFFF', '#EFEEE9', '#F6F5F1']
const DARK_GROUNDS = ['#060607', '#0B0C0E', '#111215', '#17181B']

// The defaults these override, so "stronger" can be checked rather than assumed.
const BASE = {
  light: { '--t1': '#50504A', '--t2': '#5F5F59', '--t3': '#6C6C66', '--border': '#DAD8CF', '--bh': '#C0BDB0', '--accent': '#0F6FFF', '--accent-strong': '#0B5ED7' },
  dark: { '--t1': '#BFBEB6', '--t2': '#9F9F98', '--t3': '#8E8E88', '--border': '#202125', '--bh': '#303136', '--accent': '#6FA8FF', '--accent-strong': '#4A90FF' },
}
const GROUNDS = { light: LIGHT_GROUNDS, dark: DARK_GROUNDS }

test('the sheet answers prefers-contrast at all', () => {
  assert.ok(MEDIA_AT > 0,
    'global.css contains no @media (prefers-contrast: more) block. A visitor who\n'
    + 'asks their OS for more contrast gets byte-identical tokens. Note that the\n'
    + 'forced-colors block is NOT this: it covers Windows High Contrast, a different\n'
    + 'and much blunter mechanism.')
})

/** Offset just past the closing brace of the prefers-contrast media query. */
const MEDIA_END = (() => {
  const open = CSS.indexOf('{', MEDIA_AT)
  let depth = 1
  let i = open + 1
  while (i < CSS.length && depth > 0) {
    if (CSS[i] === '{') depth++
    else if (CSS[i] === '}') depth--
    i++
  }
  return i
})()

// The trap. This must fail if the block is ever moved up the file, or if some
// later block starts re-declaring the same tokens underneath it.
test('the prefers-contrast block sits BELOW every block it overrides', () => {
  for (const theme of ['light', 'dark']) {
    const sel = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{`, 'g')
    const starts = [...CSS.matchAll(sel)].map((m) => m.index)
    assert.ok(starts.filter((i) => i < MEDIA_AT).length >= 2,
      `expected the early and the Foundry [data-theme="${theme}"] blocks to precede\n`
      + 'the media query. If they do not, this block is above what it means to override\n'
      + 'and the preference paints nothing.')
    // Blocks INSIDE the media query are its own; only ones after its closing
    // brace can beat it.
    const shadowing = starts
      .filter((i) => i >= MEDIA_END)
      .filter((i) => CSS.slice(i, CSS.indexOf('}', i)).includes('--t3'))
    assert.equal(shadowing.length, 0,
      `a [data-theme="${theme}"] block AFTER the prefers-contrast query re-declares --t3.\n`
      + 'Both are (0,1,0) and a media query adds no specificity, so the later one wins\n'
      + 'and the preference is dead again.')
  }
})

test('every token the block touches moves toward MORE contrast, never less', () => {
  const failures = []
  for (const theme of ['light', 'dark']) {
    for (const [token, base] of Object.entries(BASE[theme])) {
      const value = declared(theme, token)
      if (!value) { failures.push(`  ${theme} ${token} is not declared in the block`); continue }
      const worst = (v) => Math.min(...GROUNDS[theme].map((g) => ratio(v, g)))
      if (worst(value) <= worst(base)) {
        failures.push(`  ${theme} ${token}: ${base} (${show(worst(base))}) -> ${value} (${show(worst(value))}) is not an improvement`)
      }
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'))
})

test('the text roles clear AAA and stay a ladder rather than collapsing', () => {
  for (const theme of ['light', 'dark']) {
    const worst = (t) => Math.min(...GROUNDS[theme].map((g) => ratio(declared(theme, t), g)))
    const [t1, t2, t3] = ['--t1', '--t2', '--t3'].map(worst)
    for (const [name, r] of [['--t1', t1], ['--t2', t2], ['--t3', t3]]) {
      assert.ok(r >= 7, `${theme} ${name} is ${show(r)}:1 under prefers-contrast; AAA body text is 7:1`)
    }
    // Solving every role to 7 flat collapses all three onto one value in light.
    // The preference is about legibility, not about deleting the hierarchy.
    assert.ok(t1 > t2 && t2 > t3,
      `${theme} text roles are no longer a ladder (${show(t1)} / ${show(t2)} / ${show(t3)}). Grade the\n`
      + 'targets (9 / 8 / 7) rather than solving each one to the same floor.')
  }
})

test('borders reach the 1.4.11 non-text floor, and hover stays distinct from rest', () => {
  for (const theme of ['light', 'dark']) {
    const worst = (t) => Math.min(...GROUNDS[theme].map((g) => ratio(declared(theme, t), g)))
    assert.ok(worst('--border') >= 3,
      `${theme} --border is ${show(worst('--border'))}:1 under prefers-contrast; 1.4.11 asks 3:1`)
    assert.ok(worst('--bh') >= 4.5,
      `${theme} --bh is ${show(worst('--bh'))}:1; at 3:1 it solves to the same value as --border\n`
      + 'and hover stops being visible as a change')
  }
})

// The half of the accent story the backlog note got wrong.
test('the accent pair is lifted per theme, not swapped blind', () => {
  for (const theme of ['light', 'dark']) {
    for (const token of ['--accent', '--accent-strong']) {
      const worst = Math.min(...GROUNDS[theme].map((g) => ratio(declared(theme, token), g)))
      assert.ok(worst >= 7,
        `${theme} ${token} is ${show(worst)}:1 under prefers-contrast, under the 7:1 aimed for here`)
    }
  }
  // In DARK, --accent (#6FA8FF, 6.54) is stronger than --accent-strong (#4A90FF,
  // 5.04). The note prescribed swapping --accent FOR --accent-strong, which in
  // dark would have LOWERED contrast for the one user who asked for more.
  assert.ok(ratio(declared('dark', '--accent'), '#17181B') > ratio('#4A90FF', '#17181B'),
    'the dark accent under prefers-contrast is weaker than plain --accent-strong;\n'
    + 'that is the blind swap the note prescribed, and it is backwards in dark.')
  // And the filled-control mirror, which a text-only lift would break.
  assert.ok(ratio('#FFFFFF', declared('light', '--accent-strong')) >= 4.5,
    'white on the light prefers-contrast accent fill is under AA')
  assert.ok(ratio('#101012', declared('dark', '--accent-strong')) >= 4.5,
    'near-black on the dark prefers-contrast accent fill is under AA')
})
