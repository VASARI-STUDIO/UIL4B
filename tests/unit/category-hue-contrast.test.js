// The six category hues, and the accent pair, checked as NUMBERS.
//
// --hue-colour / --hue-type / --hue-component / --hue-imagery / --hue-ai /
// --hue-icons carry the Create categories. They are painted on icons, but also
// as 9-11px TEXT: .smap-soon, .smap-link-label, .pnav-group-title,
// .hw-chrome-here, .home-foot-feat-title.
//
// They shipped in a :root block explicitly labelled "theme-independent", with
// no dark values at all. Measured on the dark grounds before #330:
//   --hue-ai #BE185D was 2.61:1 on --bg-3. The best of the six was 3.78:1.
// Every one of them under the 4.5:1 AA needs at those sizes, in the theme the
// app opens in for anyone whose system prefers dark.
//
// The label was not laziness. `:root` and `[data-theme="dark"]` are both
// (0,1,0), and the Foundry :root sits LATER in the file than the theme blocks
// at the top, so anything it declares beats them. There was nowhere to put a
// dark value that worked until one was added below the Foundry :root — which
// is the second thing this file guards, because the first attempt at the fix
// put the dark set in the early block and it was silently dead.
//
// The rendered half of this is tests/user-sim/39-accent-contrast.spec.js, which
// walks real text nodes. This half is the cheap one: it reads the declared
// hexes and does the arithmetic, so a SEVENTH category added without measuring
// fails immediately rather than at the next review.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')
// Comments first — this file's own prose, and the measurement tables in
// global.css, are full of hex literals that would otherwise be parsed as
// declarations. A mutation run has already caught a test that passed only
// because a stale comment still named the old value.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const srgb = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const lum = (hex) => {
  const h = hex.replace('#', '')
  return 0.2126 * srgb(parseInt(h.slice(0, 2), 16))
    + 0.7152 * srgb(parseInt(h.slice(2, 4), 16))
    + 0.0722 * srgb(parseInt(h.slice(4, 6), 16))
}
const ratio = (a, b) => {
  const hi = Math.max(lum(a), lum(b))
  const lo = Math.min(lum(a), lum(b))
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

const HUES = ['--hue-colour', '--hue-type', '--hue-component', '--hue-imagery', '--hue-ai', '--hue-icons']
const AA = 4.5

/** The grounds each theme actually paints these on: --bg-0..--bg-3 plus the card. */
const LIGHT_GROUNDS = ['#FFFFFF', '#EFEEE9', '#F6F5F1']
const DARK_GROUNDS = ['#101012', '#151619', '#191A1D', '#212327']

/**
 * Bodies are found by BRACE MATCHING, not by regex.
 *
 * The first draft used /:root\s*\{([\s\S]*?)\n\}/ and reported the DARK values
 * as the light ones. `@media(min-width:1440px){:root{--page-gutter:...}}` is
 * all on one line, so the non-greedy body ran past its own closing brace to the
 * next `}` at the start of a line — which was the end of the dark hue block. A
 * test whose parser is wrong is worse than no test: that one insisted the light
 * values failed AA while the real ones were fine.
 */
const bodiesOf = (selector) => {
  const out = []
  const re = new RegExp(`${selector}\\s*\\{`, 'g')
  let m
  while ((m = re.exec(CSS)) !== null) {
    let depth = 1
    let i = m.index + m[0].length
    const start = i
    while (i < CSS.length && depth > 0) {
      if (CSS[i] === '{') depth++
      else if (CSS[i] === '}') depth--
      i++
    }
    out.push(CSS.slice(start, i - 1))
  }
  return out
}

/** Last declaration wins, so read them in source order and keep the last. */
const resolve = (token, scope) => {
  let found = null
  for (const body of bodiesOf(scope)) {
    const m = [...body.matchAll(new RegExp(`${token}\\s*:\\s*(#[0-9a-fA-F]{6})`, 'g'))]
    if (m.length) found = m[m.length - 1][1]
  }
  return found
}

// The light values live on :root; the dark ones on [data-theme="dark"].
const lightValue = (t) => resolve(t, ':root') || resolve(t, '\\[data-theme="light"\\]')
const darkValue = (t) => resolve(t, '\\[data-theme="dark"\\]')

test('every category hue has a light AND a dark value', () => {
  for (const t of HUES) {
    assert.ok(lightValue(t), `${t} has no light value`)
    assert.ok(darkValue(t), `${t} has no dark value — it will paint the light one on #101012`)
  }
})

test('every category hue clears 4.5:1 on every ground it is painted on', () => {
  const failures = []
  for (const t of HUES) {
    for (const [value, grounds, theme] of [
      [lightValue(t), LIGHT_GROUNDS, 'light'],
      [darkValue(t), DARK_GROUNDS, 'dark'],
    ]) {
      for (const g of grounds) {
        const r = ratio(value, g)
        if (r < AA) failures.push(`  ${t} ${theme} ${value} on ${g} = ${r}:1 (needs ${AA})`)
      }
    }
  }
  assert.equal(failures.length, 0,
    'These hues are painted as 9-11px text and miss AA:\n' + failures.join('\n'))
})

// The ordering trap that made the first fix dead. If the dark block that
// carries these ever moves back above the Foundry :root, it stops applying and
// nothing else here would notice — both values would still be present and both
// would still measure fine.
test('the dark hue block sits BELOW the Foundry :root that would otherwise beat it', () => {
  const foundryRoot = CSS.indexOf('--hue-colour', CSS.indexOf(':root', 1000))
  assert.ok(foundryRoot > 0, 'could not find the :root that declares --hue-colour')
  const darkBlocks = [...CSS.matchAll(/\[data-theme="dark"\]\s*\{/g)]
    .map((m) => m.index)
    .filter((i) => {
      const body = CSS.slice(i, CSS.indexOf('}', i) + 1)
      return body.includes('--hue-colour')
    })
  assert.equal(darkBlocks.length, 1, 'expected exactly one dark block declaring --hue-colour')
  assert.ok(darkBlocks[0] > foundryRoot,
    'the dark hue block is EARLIER in the sheet than the :root that declares the light\n'
    + 'values. Both are specificity (0,1,0), so the later one wins and the dark values\n'
    + 'are dead. Move the block below the Foundry :root.')
})

test('--accent and --accent-strong still carry the roles the sheet documents', () => {
  const light = resolve('--accent', ':root') || resolve('--accent', '\\[data-theme="light"\\]')
  const strong = resolve('--accent-strong', ':root') || resolve('--accent-strong', '\\[data-theme="light"\\]')
  assert.ok(light && strong, 'accent pair not found')
  // --accent is the brand colour and is NOT expected to clear AA as small text.
  // If it ever does, the two tokens have collapsed into one and the sweep that
  // separated them has been undone.
  assert.ok(ratio(light, '#FFFFFF') < AA,
    `--accent ${light} now clears AA on white; the pair has collapsed`)
  for (const g of LIGHT_GROUNDS) {
    assert.ok(ratio(strong, g) >= AA,
      `--accent-strong ${strong} is ${ratio(strong, g)}:1 on ${g} — it is the readable one`)
  }
})
