// The Learn guides publish numbers, and the surface's own claim — printed in
// the hero hint at /learn, where a reader decides whether to open one — is that
// every figure in them is either cited to a linked clause or computed. A guide
// that states a wrong number is worse than a guide that does not exist: it is
// the one place on this product that says it is teaching.
//
// tests/unit/learn-articles.test.js guards the JOINS between the registry, the
// prose, the page and the nav. It says nothing about whether the arithmetic in
// the prose is true, and nothing in the build ever would.
//
// So this file does what tests/unit/daily-tips.test.js does for the daily tip:
// it RECOMPUTES every numeric claim in the two guides that make them, from the
// sRGB transfer curve and the WCAG contrast definition written out below rather
// than from the product's own helpers, and matches the results against the
// sentences that quote them. Where a claim is about what a PRODUCT FUNCTION
// produces — the tint ramp is generateTintScale() at the Colour Studio's own
// defaults — the function is imported, because it is the subject of the claim;
// the ratios taken off its output are still recomputed here.
//
// Three failure modes it exists for, all of which ship green today:
//
//   1. A COPY EDIT THAT ROUNDS. "4.45:1" becoming "4.5:1" inverts the point of
//      the paragraph it sits in, and reads better.
//   2. A TOKEN THAT MOVES. Both guides quote this product's own hexes —
//      #EFEEE9, #0A0A0C, #0B5ED7, #4A90FF. A palette change in global.css
//      leaves them behind as confident, checkable, wrong.
//   3. A DEFAULT THAT MOVES. The ramp is only "the ramp the product hands you"
//      while ColorStudio.jsx and designDefaults.js still call the generator the
//      way the article says they do.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { generateTintScale, T_LABELS } from '../../src/utils/colors.js'
import { proseOf } from '../../scripts/learn-wordcount.mjs'

/* ── the sRGB / WCAG arithmetic, written out rather than imported ─────────── */

const toLinear = (channel) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const rgb = (hex) => (hex.replace('#', '').match(/../g) || []).map((h) => parseInt(h, 16))
const luminance = (hex) => {
  const [r, g, b] = rgb(hex)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
/** Every channel replaced by 255 minus itself. */
const invert = (hex) =>
  `#${rgb(hex).map((c) => (255 - c).toString(16).padStart(2, '0')).join('').toUpperCase()}`
/** HSL hue in whole degrees, from the sRGB channels. */
const hue = (hex) => {
  const [r, g, b] = rgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round(((h * 60) % 360 + 360) % 360)
}
const shown = (n) => `${n.toFixed(2)}:1`

/* ── the files under test ────────────────────────────────────────────────── */

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8')
const css = read('src', 'styles', 'global.css')
const themeSource = read('src', 'data', 'learn', 'themeSystems.jsx')
const brandSource = read('src', 'data', 'learn', 'brandColour.jsx')
const rampSource = read('src', 'components', 'BrandRampTable.jsx')
const studioSource = read('src', 'pages', 'ColorStudio.jsx')
const defaultsSource = read('src', 'data', 'designDefaults.js')

const themeProse = proseOf(themeSource)
const brandProse = proseOf(brandSource)

/**
 * One custom property out of one theme block in global.css.
 *
 * The blocks are `[data-theme="light"]{--bg-0:#EFEEE9;...}` on a single line,
 * so the value is read from the block rather than from the file: searching the
 * whole file for `--bg-0:` finds whichever theme comes first and silently
 * measures the wrong palette.
 */
function token(theme, name) {
  const at = css.indexOf(`[data-theme="${theme}"]{`)
  assert.ok(at !== -1, `global.css no longer carries a [data-theme="${theme}"] block`)
  const block = css.slice(at, css.indexOf('}', at))
  const found = new RegExp(`${name}\\s*:\\s*(#[0-9a-f]{6})`, 'i').exec(block)
  assert.ok(found, `${name} is not a plain hex in the ${theme} theme any more`)
  return found[1].toUpperCase()
}

test('the guides under test are the ones that are published', () => {
  // Every assertion below reads two files off disk by name. If a guide were
  // renamed or dropped, the reads would throw — but if the REGISTRY stopped
  // carrying them, these files would still be on disk and every check here
  // would pass while nothing rendered. That is the vacuous-pass this catches.
  const slugs = LEARN_ARTICLES.map((a) => a.slug)
  assert.ok(slugs.includes('theme-systems'), 'theme-systems is not a registered article')
  assert.ok(slugs.includes('brand-colour'), 'brand-colour is not a registered article')
  assert.ok(themeProse.length > 4000 && brandProse.length > 3000, 'a guide lost most of its prose')
})

/* ── Dark and light themes ───────────────────────────────────────────────── */

test('the theme guide quotes this product’s own grounds and accents', () => {
  const lightGround = token('light', '--bg-0')
  const darkGround = token('dark', '--bg-0')
  const lightAccent = token('light', '--accent-strong')
  const darkAccent = token('dark', '--accent-strong')

  assert.equal(lightGround, '#EFEEE9')
  assert.equal(darkGround, '#0A0A0C')
  assert.equal(lightAccent, '#0B5ED7')
  assert.equal(darkAccent, '#4A90FF')

  for (const hex of [lightGround, darkGround, lightAccent, darkAccent]) {
    assert.match(themeProse, new RegExp(hex, 'i'), `the guide no longer names ${hex}`)
  }
})

test('the ground very nearly inverts, by the margin the guide states', () => {
  const flipped = invert(token('light', '--bg-0'))
  assert.equal(flipped, '#101116', 'inverting the light ground no longer gives #101116')
  const against = ratio(flipped, token('dark', '--bg-0'))
  assert.equal(shown(against), '1.05:1',
    `the inverted light ground now measures ${shown(against)} against the real dark ground`)
  assert.match(themeProse, /#101116/)
  assert.match(themeProse, /1\.05:1/)
})

test('the accent does not invert at all, and the guide’s hues are the real ones', () => {
  const lightAccent = token('light', '--accent-strong')
  const flipped = invert(lightAccent)
  assert.equal(flipped, '#F4A128', 'inverting the light accent no longer gives #F4A128')
  assert.equal(hue(lightAccent), 216)
  assert.equal(hue(flipped), 36)
  assert.equal(hue(token('dark', '--accent-strong')), 217)
  // 180 degrees apart is the claim; the arithmetic is what makes it one.
  assert.equal(Math.abs(hue(lightAccent) - hue(flipped)), 180)
  assert.match(themeProse, /#F4A128/i)
  assert.match(themeProse, /hue 216\b/)
  assert.match(themeProse, /hue 36\b/)
  assert.match(themeProse, /hue 217\b/)
})

test('the linearisation figures in the formula block are the real ones', () => {
  // The block prints these to four places to show that lin(255 - c) is not
  // 1 - lin(c), which is the whole reason inversion cannot preserve a ratio.
  assert.equal(toLinear(64).toFixed(4), '0.0513')
  assert.equal(toLinear(191).toFixed(4), '0.5210')
  assert.equal((1 - toLinear(64)).toFixed(4), '0.9487')
  assert.equal(255 - 64, 191, 'the inverted channel in the block is no longer the inverse')
  // Asserted as the printed LINES, not as bare figures: 0.5210 appears twice in
  // the guide — once in the block, once in the sentence under it — and an
  // `includes` on the figure alone was satisfied by whichever copy a mutation
  // had not touched. Each line is rebuilt from the recomputed value.
  const lines = [
    `lin(64/255)   = ${toLinear(64).toFixed(4)}`,
    `lin(191/255)  = ${toLinear(191).toFixed(4)}`,
    `1 - lin(64/255) = ${(1 - toLinear(64)).toFixed(4)}`,
  ]
  for (const line of lines) {
    assert.ok(themeSource.includes(line), `the formula block no longer prints "${line}"`)
  }
  // And the sentence that reads the block back to the reader quotes the same two.
  assert.match(themeProse,
    new RegExp(`${toLinear(191).toFixed(4)} against ${(1 - toLinear(64)).toFixed(4)}`),
    'the paragraph under the formula no longer quotes the two figures in it')
})

test('THE ONE THAT MATTERS: the inverted pair disagrees with the real one in every row', () => {
  // The sentence under the live table says the two ratio columns disagree in
  // every row and do not disagree in a consistent direction. The table computes
  // itself in the browser; this asserts the claim ABOUT it, in both themes, on
  // the four pairs ThemeInversionTable actually reads.
  const pairs = ['--t0', '--t1', '--t3', '--accent-strong']
  const directions = new Set()
  for (const theme of ['light', 'dark']) {
    const ground = token(theme, '--bg-0')
    for (const name of pairs) {
      const ink = token(theme, name)
      const painted = ratio(ink, ground)
      const flipped = ratio(invert(ink), invert(ground))
      assert.notEqual(shown(painted), shown(flipped),
        `${name} in the ${theme} theme now reads the same either way (${shown(painted)}) —`
        + ' the paragraph under the table says the columns disagree in every row')
      directions.add(Math.sign(flipped - painted))
    }
  }
  assert.equal(directions.size, 2,
    'inversion now moves every ratio the same way — the guide says it does not,'
    + ' and that is the sentence ruling out a constant correction')
})

test('the dark surface ramp spans what the guide says it spans', () => {
  const levels = ['--bg-0', '--bg-1', '--bg-2', '--bg-3', '--bg-4'].map((n) => token('dark', n))
  assert.equal(levels[0], '#0A0A0C')
  assert.equal(levels[4], '#28292D')
  assert.equal(levels.length, 5, 'the guide says five surface levels')
  assert.equal(shown(ratio(levels[0], levels[4])), '1.36:1')
  // The guide quotes the two ends of the step range to two places, so the
  // assertion is on the PRINTED values rather than on the raw floats: the
  // smallest step is 1.0399, which is 1.04:1 as published and below 1.04 as a
  // number, and a float comparison would fail on its own rounding.
  const steps = levels.slice(1).map((hex, i) => ratio(levels[i], hex))
  assert.equal(shown(Math.min(...steps)), '1.04:1',
    `the smallest surface step is now ${shown(Math.min(...steps))}`)
  assert.equal(shown(Math.max(...steps)), '1.12:1',
    `the largest surface step is now ${shown(Math.max(...steps))}`)
  assert.match(themeProse, /1\.36:1/)
  assert.match(themeProse, /1\.04:1/)
  assert.match(themeProse, /1\.12:1/)
  assert.match(themeProse, /five surface levels/)
})

test('inverting a state colour really does produce the opposite meaning', () => {
  const err = token('light', '--err')
  const ok = token('light', '--ok')
  assert.equal(err, '#DC2626')
  assert.equal(ok, '#16A34A')
  assert.equal(invert(err), '#23D9D9')
  assert.equal(invert(ok), '#E95CB5')
  // A red at hue 0 and a green at hue 142 come back as their opposites.
  assert.equal(Math.abs(hue(err) - hue(invert(err))), 180)
  assert.equal(hue(invert(ok)), 322)
  for (const hex of ['#DC2626', '#23D9D9', '#16A34A', '#E95CB5']) {
    assert.match(themeProse, new RegExp(hex, 'i'), `the guide no longer names ${hex}`)
  }
})

/* ── Choosing a brand colour ─────────────────────────────────────────────── */

// The generator call the article says it is showing. Kept beside the assertions
// that check ColorStudio.jsx and designDefaults.js still make it this way.
const SEED = '#2563EB'
const TINT_CONFIG = {
  hex: SEED, anchor: 5, hueShift: 0, satMin: -12, satMax: 6, lMin: 3, lMax: 82, mode: 'perceived',
}
const ramp = () => generateTintScale(TINT_CONFIG)

test('the ramp table is wired to the Colour Studio’s real defaults', () => {
  // Not a check of generateTintScale — a check that the CALL the article
  // publishes is the call the product makes. If the studio's defaults move, the
  // article's ramp silently stops being the one a reader is handed.
  assert.match(defaultsSource, /lumBias:\s*82/, 'the default lumBias moved; TINT_CONFIG.lMax is stale')
  assert.match(defaultsSource, /satDecay:\s*12/, 'the default satDecay moved; satMin/satMax are stale')
  assert.match(defaultsSource, /oled:\s*true/, 'the default oled flag moved; TINT_CONFIG.lMin is stale')
  assert.match(studioSource, /anchor:\s*5,\s*hueShift:\s*0/, 'ColorStudio no longer anchors at 5')
  assert.match(studioSource, /satMin:\s*-satDecay,\s*satMax:\s*satDecay\s*\/\s*2/,
    'ColorStudio derives saturation differently now')
  assert.match(studioSource, /lMin:\s*oled\s*\?\s*3\s*:\s*5,\s*lMax:\s*lumBias/,
    'ColorStudio derives the ramp ends differently now')
  assert.match(studioSource, new RegExp(`baseColor === '${SEED}'`, 'i'),
    `${SEED} is no longer the Colour Studio's default base colour`)

  // And the component publishes the same call and the same two grounds.
  assert.ok(rampSource.includes(`hex: SEED, anchor: 5, hueShift: 0, satMin: -12, satMax: 6, lMin: 3, lMax: 82, mode: 'perceived'`),
    'BrandRampTable no longer generates the ramp with the configuration this test asserts')
  assert.ok(rampSource.includes(`const LIGHT_GROUND = '${token('light', '--bg-0')}'`),
    'BrandRampTable measures against a light ground global.css no longer uses')
  assert.ok(rampSource.includes(`const DARK_GROUND = '${token('dark', '--bg-0')}'`),
    'BrandRampTable measures against a dark ground global.css no longer uses')
})

test('THE OTHER ONE THAT MATTERS: no stop in the ramp clears 4.5:1 on both grounds', () => {
  // This is the article's central claim and the reason a role token has to hold
  // a value per theme. If it ever became false the paragraph would be wrong in
  // the direction that matters — it would be telling readers to do something
  // unnecessary.
  const light = token('light', '--bg-0')
  const dark = token('dark', '--bg-0')
  const stops = ramp()
  assert.equal(stops.length, 11, 'the guide says eleven stops')
  assert.equal(stops.length, T_LABELS.length)

  const both = stops.filter((hex) => ratio(hex, light) >= 4.5 && ratio(hex, dark) >= 4.5)
  assert.deepEqual(both, [], `${both.join(', ')} now clears 4.5:1 on both grounds`)
  assert.match(brandProse, /Not one of the eleven stops/)

  const bothBoundary = stops
    .map((hex, i) => [T_LABELS[i], hex])
    .filter(([, hex]) => ratio(hex, light) >= 3 && ratio(hex, dark) >= 3)
    .map(([label]) => label)
  assert.deepEqual(bothBoundary, ['400', '500'],
    `the stops clearing 3:1 on both grounds are now ${bothBoundary.join(', ')}`)
  assert.match(brandProse, /400 and 500/)
})

test('the windows the guide names are the windows the ramp produces', () => {
  const light = token('light', '--bg-0')
  const dark = token('dark', '--bg-0')
  const stops = ramp()
  const firstOnLight = T_LABELS[stops.findIndex((hex) => ratio(hex, light) >= 4.5)]
  const lastOnDark = T_LABELS[stops.map((hex) => ratio(hex, dark) >= 4.5).lastIndexOf(true)]
  assert.equal(firstOnLight, '600', `the first stop clearing 4.5:1 on light is now ${firstOnLight}`)
  assert.equal(lastOnDark, '400', `the last stop clearing 4.5:1 on dark is now ${lastOnDark}`)
  assert.match(brandProse, /first stop that clears 4\.5:1 is 600/)
  assert.match(brandProse, /last one that does is 400/)
})

test('the seed misses the threshold by exactly the margin quoted', () => {
  const onGround = ratio(SEED, token('light', '--bg-0'))
  assert.equal(shown(onGround), '4.45:1')
  assert.ok(onGround < 4.5, 'the seed now passes on the light ground')
  assert.equal(Math.round((4.5 - onGround) * 100), 5, 'the shortfall is no longer five hundredths')
  // And it is a different number on pure white, which is the point of the line.
  assert.equal(shown(ratio(SEED, '#FFFFFF')), '5.17:1')
  assert.notEqual(shown(onGround), shown(ratio(SEED, '#FFFFFF')))
  assert.match(brandProse, /4\.45:1/)
  assert.match(brandProse, /five hundredths under/)
})

test('tinting a neutral moves its ratio upwards, by the amounts quoted', () => {
  // The table is built by the article from hslToHex(); the CLAIM under it is
  // that 8% costs about two tenths and 16% about four, and that both move up.
  // Recomputed here from the same lightnesses without the product's converter,
  // by constructing the HSL triple's sRGB values directly.
  const ground = token('light', '--bg-0')
  const hslToHex = (h, s, l) => {
    const S = s / 100
    const L = l / 100
    const c = (1 - Math.abs(2 * L - 1)) * S
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = L - c / 2
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
    return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`
  }
  for (const lightness of [50, 40, 30]) {
    const grey = ratio(hslToHex(0, 0, lightness), ground)
    const soft = ratio(hslToHex(221, 8, lightness), ground)
    const strong = ratio(hslToHex(221, 16, lightness), ground)
    assert.ok(soft > grey && strong > soft,
      `at lightness ${lightness}% the tinted neutral no longer measures higher than the grey`)
    assert.ok(soft - grey < 0.4,
      `8% saturation now moves the ratio by ${(soft - grey).toFixed(2)}; the guide says`
      + ' every one of those moves is under four tenths of a ratio point')
    assert.ok(strong - grey < 0.7,
      `16% saturation now moves the ratio by ${(strong - grey).toFixed(2)}; the guide`
      + ' says under seven tenths')
  }
  assert.match(brandProse, /under four tenths of a ratio point at 8%/)
  assert.match(brandProse, /under seven tenths at 16%/)
  assert.match(brandProse, /every one of them moves/)
})

test('the brand red and the error red really are indistinguishable', () => {
  const brandRed = '#E11D48'
  const errorRed = token('light', '--err')
  assert.equal(shown(ratio(brandRed, errorRed)), '1.03:1')
  assert.match(brandProse, /#E11D48/i)
  assert.match(brandProse, /1\.03:1/)
})

/* ── the register the founder chose ──────────────────────────────────────── */

test('no guide slips into the first person or into marketing', () => {
  // Founder decision, 2026-09-05, recorded in CHANGELOG.md: Learn is neutral
  // and factual, explicitly NOT his voice, so it can be written at scale and
  // fact-checked rather than signed. The contrast with the founder note, which
  // is nothing but his voice, is deliberate.
  // Case-SENSITIVE for the pronoun "I": proseOf leaves the odd arrow-function
  // parameter behind, and `(i) =>` inside a table-building expression is not
  // the founder's voice. Everything else is a word no reference register uses.
  const firstPersonI = /\bI\b/
  const firstPerson = /\b(?:we|we're|we've|our|ours|let's)\b/i
  const marketing = /\b(?:effortless|effortlessly|supercharge|unlock|seamless|game-chang|revolutionar|delightful|best-in-class|world-class|at scale)\b/i
  const flattery = /\b(?:you're awesome|great job|you've got this|amazing work|keep crushing|nailed it)\b/i
  for (const article of LEARN_ARTICLES) {
    const prose = proseOf(read('src', 'data', 'learn', article.file))
    const found = firstPersonI.exec(prose) || firstPerson.exec(prose)
    assert.equal(found, null, `${article.slug} writes in the first person: "${found?.[0]}"`)
    assert.equal(marketing.exec(prose), null, `${article.slug} reads as marketing copy`)
    assert.equal(flattery.exec(prose), null, `${article.slug} flatters the reader`)
  }
})

test('every guide still ends at a tool and cites at least three sources', () => {
  // A positive control on the two tests above: they iterate LEARN_ARTICLES, so
  // an empty or gutted registry would make both vacuously true.
  assert.ok(LEARN_ARTICLES.length >= 5, 'fewer guides are registered than are published')
  for (const article of LEARN_ARTICLES) {
    assert.ok(article.sources.length >= 3, `${article.slug} cites fewer than three sources`)
    assert.match(article.toolTo, /^\/create\//, `${article.slug} does not end at a tool`)
  }
})
