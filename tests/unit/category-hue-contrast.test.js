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
import { contrastRatio } from '../../src/utils/colors.js'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')
// Comments first — this file's own prose, and the measurement tables in
// global.css, are full of hex literals that would otherwise be parsed as
// declarations. A mutation run has already caught a test that passed only
// because a stale comment still named the old value.
const WITHOUT_COMMENTS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

// Then the prefers-contrast overrides, for the same reason and with the same
// offset-preserving blanking. This file is about the DEFAULT token roles, and
// every lookup below takes the LAST matching declaration — so once
// @media (prefers-contrast: more) started re-declaring the accent pair, the
// "--accent must NOT clear AA" assertion below started reading #094AAA and
// failing. That value is correct; it is just not the value this test is about.
// A user asking their OS for more contrast is exactly who the pair SHOULD
// collapse for. The prefers-contrast block has its own file:
// tests/unit/prefers-contrast.test.js, which checks it strengthens every token
// it touches and sits low enough in the sheet to apply at all.
const blankMediaBlocks = (css, opener) => {
  let out = css
  for (;;) {
    const at = out.indexOf(opener)
    if (at < 0) return out
    const open = out.indexOf('{', at)
    if (open < 0) return out
    let depth = 1
    let i = open + 1
    while (i < out.length && depth > 0) {
      if (out[i] === '{') depth++
      else if (out[i] === '}') depth--
      i++
    }
    const span = out.slice(at, i).replace(/[^\n]/g, ' ')
    out = out.slice(0, at) + span + out.slice(i)
  }
}
const CSS = blankMediaBlocks(WITHOUT_COMMENTS, '@media (prefers-contrast')

// THE ARITHMETIC IS THE APP'S OWN, AND IT IS NOT ROUNDED.
//
// This file used to carry a private srgb/lum/ratio triple that ended
// `Math.round(r * 100) / 100`. Two things were wrong with that.
//
// The rounding was the one that mattered. Rounding to two places BEFORE the
// comparison hands the floor a free half-hundredth in both directions: a pair
// measuring 4.4951:1 rounds to 4.5 and clears `>= AA`. So the assertion could
// not fail on the near miss — which is precisely the defect a contrast floor
// exists to catch, and precisely the band a hue nudge lands in. Round for the
// MESSAGE (a failure quoting 4.49523:1 is unreadable), never for the compare.
//
// The second is that a test which reimplements the formula is only checking
// its own copy of it. `contrastRatio` in src/utils/colors.js is what the
// Contrast Checker, the palette engine and derivePreviewRoles all report to
// the user; if the two ever disagreed, this file would happily certify a pair
// the product itself calls a failure. preview-roles-contrast.test.js and
// plans-truth.test.js already take that route.
const ratio = (a, b) => contrastRatio(a, b)
/** Two places, for humans reading a failure. Never fed back into a compare. */
const show = (r) => Math.round(r * 100) / 100

const HUES = ['--hue-colour', '--hue-type', '--hue-component', '--hue-imagery', '--hue-ai', '--hue-icons']
const AA = 4.5

/** The grounds each theme actually paints these on: --bg-0..--bg-3 plus the card. */
const LIGHT_GROUNDS = ['#FFFFFF', '#F5F5F2', '#F6F5F1']
const DARK_GROUNDS = ['#060607', '#0B0C0E', '#111215', '#17181B']

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
    assert.ok(darkValue(t), `${t} has no dark value — it will paint the light one on #060607`)
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
        if (r < AA) failures.push(`  ${t} ${theme} ${value} on ${g} = ${show(r)}:1 (needs ${AA})`)
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

// ── The readable companion: --hue-*-strong ────────────────────────────────
//
// [hue-set-has-no-tint-margin]: the brand set clears 4.5 on its BARE ground by
// hundredths (4.60 light, 4.56 dark), so ANY tint behind hue-coloured text puts
// it under. One token was being asked to be both the category's brand colour
// and an ink with room to sit on something, and those are different jobs. The
// split is the same one --accent / --accent-strong and --ok / --ok-strong
// already make in this sheet.
//
// The tests below are the numbers half. The floor is not "bare AA" but "AA on
// the largest tint the sheet actually paints", because the point of the role is
// that a NEW surface can use it without re-deriving anything.
const STRONG = HUES.map((t) => `${t}-strong`)

// The biggest tint any rule in global.css puts behind hue-coloured content
// (.hw-continue:hover). 12%, 14%, 10% and 7% all sit inside it.
const MAX_TINT = 0.18
// The neutral hover film the sheet paints under hue-coloured labels
// (.smap-link-a:hover sets background:var(--hvr) and the label to the hue).
const HOVER = { light: ['#0F0F10', 0.04], dark: ['#F2F1EC', 0.05] }

const hexToRgbT = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** color-mix(in srgb, a p%, b) for two opaque colours: component-wise on the
 *  gamma-encoded values. Mixing with `transparent` composites to the same. */
const mixT = (a, b, t) => '#' + hexToRgbT(a)
  .map((v, i) => Math.round(v * t + hexToRgbT(b)[i] * (1 - t)).toString(16).padStart(2, '0'))
  .join('')

test('every category hue has a readable -strong companion in BOTH themes', () => {
  for (const t of STRONG) {
    assert.ok(lightValue(t), `${t} has no light value`)
    assert.ok(darkValue(t), `${t} has no dark value - it will paint the light one on #060607`)
  }
})

test('-strong clears AA on every ground under the largest tint the sheet paints', () => {
  const failures = []
  for (const t of HUES) {
    for (const [theme, grounds] of [['light', LIGHT_GROUNDS], ['dark', DARK_GROUNDS]]) {
      const brand = theme === 'light' ? lightValue(t) : darkValue(t)
      const ink = theme === 'light' ? lightValue(`${t}-strong`) : darkValue(`${t}-strong`)
      const [hv, ha] = HOVER[theme]
      for (const g of grounds) {
        // bare, hovered, tinted, and hovered-then-tinted: the compound case a
        // .smap-soon pill inside a hovered .smap-link-a actually lands on.
        const hovered = mixT(hv, g, ha)
        for (const [label, ground] of [
          ['bare', g],
          ['hover', hovered],
          [`+${MAX_TINT * 100}%`, mixT(brand, g, MAX_TINT)],
          [`hover +${MAX_TINT * 100}%`, mixT(brand, hovered, MAX_TINT)],
        ]) {
          const r = ratio(ink, ground)
          if (r < AA) failures.push(`  ${t}-strong ${theme} ${ink} on ${label} ${ground} = ${show(r)}:1 (needs ${AA})`)
        }
      }
    }
  }
  assert.equal(failures.length, 0,
    'the readable role is what lets a NEW surface put hue text on a tint:\n' + failures.join('\n'))
})

test('-strong is a genuine step away from the brand value, not a copy of it', () => {
  // If the two ever collapse the split has been undone, and every tinted
  // surface silently goes back to failing. The brand value is the one that
  // must NOT be pushed: it paints the dots, rails, icon tiles and OG cards.
  for (const t of HUES) {
    for (const [theme, get] of [['light', lightValue], ['dark', darkValue]]) {
      const brand = get(t)
      const ink = get(`${t}-strong`)
      assert.notEqual(brand.toUpperCase(), ink.toUpperCase(),
        `${t} ${theme}: -strong equals the brand value, so the roles have collapsed`)
      const grounds = theme === 'light' ? LIGHT_GROUNDS : DARK_GROUNDS
      const worstBrand = Math.min(...grounds.map((g) => ratio(brand, g)))
      const worstInk = Math.min(...grounds.map((g) => ratio(ink, g)))
      assert.ok(worstInk > worstBrand,
        `${t} ${theme}: -strong ${ink} (${show(worstInk)}) is not more readable than ${brand} (${show(worstBrand)})`)
    }
  }
})

test('the rules that paint hue-coloured TEXT read the readable role', () => {
  // Matched on the declaration rather than on a token name in isolation: the
  // defect this guards is a text rule reading the FILL token, which is exactly
  // what every one of these did before. Fills, dots, rails, borders, outlines
  // and icons deliberately keep var(--hue) - they are 1.4.11 non-text at 3:1
  // and the base hue is the point of them.
  // .hw-chrome-here was the third entry here until 2026-09-15. The homepage
  // workbench no longer draws a browser title bar with a breadcrumb in it, so
  // the rule it guarded does not exist to guard. The list is shorter, not
  // weaker: the defect is a TEXT rule reading the fill token, and the two
  // survivors still fail if either of them regresses.
  const TEXT_RULES = [
    '.smap-link-a.active .smap-link-label{color:var(--hue-strong,var(--accent-strong))}',
    '.smap-link-a:hover .smap-link-label{color:var(--hue-strong,var(--accent-strong))}',
  ]
  for (const rule of TEXT_RULES) {
    assert.ok(RAW.includes(rule), `this text rule no longer reads --hue-strong:\n  ${rule}`)
  }
  // .smap-soon is the one that paints its ink ON a tint, so it is checked as a
  // pair: readable ink, brand tint, brand border, and the two fallbacks agreeing.
  assert.ok(RAW.includes(
    'color:var(--hue-strong,var(--accent-strong));background:color-mix(in srgb,var(--hue,var(--accent)) 7%,transparent)'),
  '.smap-soon no longer pairs a --hue-strong ink with a --hue tint')
})

test('every category carries both roles, so no rule can resolve to nothing', () => {
  // var(--hue-strong) with no [data-hue] ancestor falls back to --accent-strong,
  // which is correct. Inside one, it must resolve to that category's own value -
  // a mapping that sets --hue and forgets --hue-strong would silently paint the
  // accent blue on every category.
  for (const id of ['colour', 'type', 'component', 'imagery', 'ai', 'icons']) {
    assert.ok(CSS.includes(`[data-hue="${id}"]{--hue:var(--hue-${id});--hue-strong:var(--hue-${id}-strong)}`),
      `[data-hue="${id}"] does not map both roles`)
  }
})

// THE ONE-ACCENT MODEL. --accent is one value in both
// themes and it is a FILL; --accent-strong is an alias of --accent-mid, the
// TEXT member, which walks toward #0B0C0E in light and toward paper in dark.
// The split is still load-bearing: bare --accent as text fails on the dark
// page, and that is why the text member exists.
const mixHex = (a, b, pA) => '#' + [1, 3, 5].map((i) => {
  const v = Math.round(parseInt(a.slice(i, i + 2), 16) * pA + parseInt(b.slice(i, i + 2), 16) * (1 - pA))
  return v.toString(16).padStart(2, '0')
}).join('').toUpperCase()
test('--accent and --accent-strong still carry the roles the sheet documents', () => {
  const accent = resolve('--accent', ':root')
  assert.ok(accent, 'accent not found on :root')
  assert.match(CSS, /--accent-strong:var\(--accent-mid\)/, '--accent-strong is no longer the text member')
  assert.match(CSS, /--accent-mid:color-mix\(in srgb,var\(--accent\) var\(--accent-k-mid\),var\(--accent-toward\)\)/,
    '--accent-mid is no longer derived the way this test measures it')
  const k = (scope) => {
    const bodies = bodiesOf(scope).join(';')
    const m = [...bodies.matchAll(/--accent-k-mid:(\d+)%/g)]
    return m.length ? Number(m[m.length - 1][1]) / 100 : null
  }
  const lightMid = mixHex(accent, '#0B0C0E', k(':root'))
  const darkMid = mixHex(accent, '#EFEEEA', k('\\[data-theme="dark"\\]'))
  for (const g of LIGHT_GROUNDS) {
    assert.ok(ratio(lightMid, g) >= AA, `light --accent-mid ${lightMid} is ${show(ratio(lightMid, g))}:1 on ${g}`)
  }
  for (const g of DARK_GROUNDS) {
    assert.ok(ratio(darkMid, g) >= AA, `dark --accent-mid ${darkMid} is ${show(ratio(darkMid, g))}:1 on ${g}`)
  }
  assert.ok(ratio(accent, DARK_GROUNDS[0]) < AA,
    `--accent ${accent} now clears AA as text on the dark page; the fill/text split is no longer needed — re-read the family note`)
})
