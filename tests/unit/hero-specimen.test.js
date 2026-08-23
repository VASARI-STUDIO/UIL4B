// The hero's specimen band, and the copy changes that came with it.
//
// Tested here rather than in a browser because every guarantee below is a DATA
// or SOURCE guarantee. A rendered test of the band would go green on a hero
// that had quietly stopped computing anything — it would still show four
// swatches and a number.
//
// The four that would catch a silent regression:
//
//   · the pair count VARIES across the shipped library. If it ever collapses to
//     one value the fact has stopped being evidence and the band has become
//     decoration with a number painted on it;
//   · the grade is the EXPORTER'S grade, so the hero cannot disagree with a
//     file a customer downloads;
//   · the CSS shown is the exporter's own bytes, not a hand-typed sample that
//     goes stale the first time the exporter changes;
//   · no route literal, because the Create tools moved to /create/<pagetitle>
//     and a typed path would ship an internal link into a 301.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { HOME_CURATED } from '../../src/data/homeGallery.js'
import { paletteCss, paletteBuilderUrl } from '../../src/data/paletteGallery.js'
import { CSS_GLIMPSE_LINES, cssGlimpse, measurePalette } from '../../src/data/heroSpecimen.js'
import { contrastRatio, hexToRgb, luminance } from '../../src/utils/colors.js'
import { grade } from '../../src/utils/styleGuideExport.js'
import { CREATE_ROUTE_MIGRATION } from '../../src/data/legacyRoutes.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// This file's subject matter is partly "which strings must NOT appear", and the
// source files necessarily explain themselves by quoting those very strings in
// comments. Strip comments before matching or every test here passes on prose.
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

const specimen = stripJs(read('src/components/HomeSpecimen.jsx'))
const home = stripJs(read('src/pages/Home.jsx'))
const commandBar = stripJs(read('src/components/HomeCommandBar.jsx'))
const css = stripCss(read('src/styles/global.css'))

/* ── The measurement is computed, not printed ─────────────────────────────── */

test('the pair count takes at least three distinct values across the library', () => {
  // THE test in this file. The band's whole claim is that a function ran, and
  // the only externally visible proof of that is variation. A best-pair ratio
  // alone would read AAA on most entries and look typed.
  const counts = new Set(HOME_CURATED.map((item) => measurePalette(item.colors).clear))
  assert.ok(
    counts.size >= 3,
    `the "n of 6 pairs clear AA" count collapsed to ${counts.size} value(s) across ` +
    `${HOME_CURATED.length} entries (${[...counts].sort().join(', ')}). It has stopped ` +
    'being evidence that anything was measured.',
  )
})

test('every count is a single digit in 0..6, so its cell can never resize', () => {
  for (const item of HOME_CURATED) {
    const { clear, total } = measurePalette(item.colors)
    assert.equal(total, 6, `${item.name}: four colours make six unordered pairs`)
    assert.ok(Number.isInteger(clear) && clear >= 0 && clear <= 6, `${item.name}: count ${clear}`)
  }
})

test('the grade is styleGuideExport\'s grade(), never a local threshold table', () => {
  // If this drifts, the hero can tell a visitor a pair is AA while the style
  // guide they then export calls it AA Large. Recomputed independently here
  // from contrastRatio + grade rather than trusting the module's own return.
  for (const item of HOME_CURATED) {
    const m = measurePalette(item.colors)
    let best = 0
    for (let i = 0; i < item.colors.length; i += 1) {
      for (let j = i + 1; j < item.colors.length; j += 1) {
        best = Math.max(best, contrastRatio(item.colors[i], item.colors[j]))
      }
    }
    assert.equal(m.grade, grade(best), `${item.name}: grade disagrees with the exporter`)
    assert.equal(m.ratio, best.toFixed(2), `${item.name}: ratio is not the best pair at two decimals`)
  }
})

test('the ratio always carries two decimals, and the hexes are uppercase', () => {
  // Both are CLS reserves, not cosmetics: a bare "21:1" is narrower than
  // "12.78:1" and would resize a cell inside a fixed-height band.
  for (const item of HOME_CURATED) {
    const m = measurePalette(item.colors)
    assert.match(m.ratio, /^\d+\.\d{2}$/, `${item.name}: ratio "${m.ratio}"`)
    assert.match(m.ink, /^#[0-9A-F]{6}$/, `${item.name}: ink "${m.ink}"`)
    assert.match(m.ground, /^#[0-9A-F]{6}$/, `${item.name}: ground "${m.ground}"`)
  }

  // …and the uppercasing is REAL, not an artefact of the library happening to
  // be stored uppercase today. Asserting only against HOME_CURATED passed with
  // .toUpperCase() deleted — found by mutating it, which is why this line
  // exists. A lower-case entry arriving from anywhere must still render
  // "#AABBCC", because a mixed-case column is a visual wobble and, in a
  // prerendered band, a hydration diff.
  // Both sample hexes must contain LETTERS, or .toUpperCase() is a no-op on
  // them and the assertion is vacuous — which is exactly how the first
  // version of this test passed with the call deleted.
  const lower = measurePalette(['#0a0b0c', '#fafbfc', '#00adb5', '#393e46'])
  assert.match(lower.ink, /^#[0-9A-F]{6}$/, `ink "${lower.ink}" was not uppercased`)
  assert.match(lower.ground, /^#[0-9A-F]{6}$/, `ground "${lower.ground}" was not uppercased`)
})

test('the ink is the darker of the best pair on every entry', () => {
  // The line reads "{ink} on {ground}". If the order flipped on some entries
  // the hero would be recommending white text on white on those.
  for (const item of HOME_CURATED) {
    const m = measurePalette(item.colors)
    // Compared by real relative luminance, not by the hex's integer value —
    // #00ADB5 sorts below #808080 as a number and above it as a colour.
    const lum = (h) => { const [r, g, b] = hexToRgb(h); return luminance(r, g, b) }
    assert.notEqual(m.ink, m.ground, `${item.name}: the best pair is one colour twice`)
    assert.ok(lum(m.ink) <= lum(m.ground),
      `${item.name}: "${m.ink} on ${m.ground}" names the lighter colour as the ink`)
  }
})

/* ── The CSS is the exporter's bytes ──────────────────────────────────────── */

test('the CSS glimpse is a contiguous slice of paletteCss\'s own output', () => {
  // Acceptance: a visitor who copies this palette from the Discover gallery
  // must get text containing exactly these lines. A hand-typed sample is the
  // one thing in this band that could be false.
  for (const item of HOME_CURATED) {
    const lines = cssGlimpse(item.css)
    assert.equal(lines.length, CSS_GLIMPSE_LINES, `${item.name}: wrong number of lines`)
    assert.ok(item.css.includes(lines.join('\n')), `${item.name}: the glimpse is not in the export`)
    // …and item.css is itself paletteCss's output for this palette, so the
    // gallery's Copy CSS and the band cannot diverge.
    const source = paletteCss({ name: item.name, colors: item.colors })
    assert.equal(item.css, source, `${item.name}: the band's CSS is not paletteCss's`)
    assert.equal(lines[0].trim(), ':root {', `${item.name}: the glimpse should open on the selector`)
    assert.match(lines[1], /^\s+--[a-z0-9-]+: #[0-9A-F]{6};$/, `${item.name}: "${lines[1]}"`)
  }
})

/* ── The hand-off is derived, never typed ─────────────────────────────────── */

test('the band names no route literal, and hands off through item.to', () => {
  assert.ok(specimen.includes('to={item.to}'), 'the link must use the entry\'s own derived URL')
  const literals = specimen.match(/['"`]\/(create|color|colour)\//g)
  assert.equal(literals, null, `the band types a route: ${literals?.join(', ')}`)
  // And the URL it derives resolves to the migrated Create path, not a 301
  // source. Checked against the migration table rather than a typed string.
  const retired = new Set(CREATE_ROUTE_MIGRATION.map(([old]) => old))
  for (const item of HOME_CURATED.slice(0, 5)) {
    assert.equal(item.to, paletteBuilderUrl(item.colors), `${item.name}: to is not the builder URL`)
    assert.ok(!retired.has(item.to.split('?')[0]), `${item.name}: ${item.to} is a redirect source`)
  }
})

/* ── Determinism, because the build prerenders this markup ────────────────── */

test('nothing in the band varies between the server and the first client paint', () => {
  // HomeWorkbench.makePalette() uses Math.random(). That is fine below the fold
  // in a client-only panel and would be a hydration mismatch here.
  for (const [name, src] of [['HomeSpecimen.jsx', specimen], ['heroSpecimen.js', stripJs(read('src/data/heroSpecimen.js'))]]) {
    for (const banned of ['Math.random', 'Date.now', 'new Date', 'localStorage', 'sessionStorage']) {
      assert.ok(!src.includes(banned), `${name} uses ${banned}; the band is prerendered`)
    }
  }
  assert.ok(specimen.includes('useState(0)'), 'the starting index must be 0, not seeded')
  assert.ok(specimen.includes('.toUpperCase()'), 'hexes are uppercased with a locale-free method')
  assert.ok(!specimen.includes('toLocaleUpperCase'), 'toLocaleUpperCase is locale-dependent')
})

/* ── Accessibility shape ──────────────────────────────────────────────────── */

test('the band is one figure with a caption, and the swatches are not read twice', () => {
  assert.ok(specimen.includes('<figure'), 'a figure gives AT one object rather than fifteen fragments')
  assert.ok(specimen.includes('<figcaption'), 'the caption names the artefact and its colour space')
  // The swatches are hidden because the hex row beneath carries the same
  // information as text; the column LABELS are not, because they are the
  // band's structure.
  assert.match(specimen, /hspec-swatches[^>]*aria-hidden="true"/, 'the swatch row must be aria-hidden')
  assert.ok(!/hspec-lab[^>]*aria-hidden/.test(specimen), 'the column labels must reach assistive tech')
  assert.match(specimen, /role="status"\s+aria-live="polite"/, 'stepping must be announced politely')
})

test('no text is ever painted on a generated swatch', () => {
  // readableInk()'s luminance threshold does not guarantee 4.5:1 at this size,
  // so the hexes live on the page ground instead. This deletes the failure
  // class rather than managing it.
  const swatch = specimen.match(/<span className="hspec-swatch"[^/]*\/>/)
  assert.ok(swatch, 'the swatch must stay a self-closing element with no children')
})

/* ── The band's height is a token, at every breakpoint ────────────────────── */

test('the band is never sized by its content', () => {
  const block = css.slice(css.indexOf('.home-hero-specimen{'))
  assert.ok(/height:var\(--hero-specimen\)/.test(block), 'the band must take its height from the token')
  assert.ok(!/\.home-hero-specimen\{[^}]*min-height/.test(css), 'min-height would let content grow the band')
  assert.ok(!/\.home-hero-specimen\{[^}]*height:auto/.test(css), 'height:auto is content sizing')
  // Every declared value is a whole multiple of the 48px ground module, which
  // is the relationship that stops the page grid reading as wallpaper.
  const values = [...css.matchAll(/--hero-specimen:(\d+)px/g)].map((m) => Number(m[1]))
  assert.ok(values.length >= 4, `expected a value per breakpoint, found ${values.length}`)
  for (const v of values) assert.equal(v % 48, 0, `${v}px is not a multiple of the 48px module`)
})

test('both reduced-motion mechanisms switch off every animation the band adds', () => {
  // An explicit in-app attribute must beat the OS query in BOTH directions —
  // the shape prefersReducedMotion() implements in useHomeMotion.js.
  for (const sel of ['.home-hero-specimen', '.hspec-cell', '.hspec-cap']) {
    const osQuery = new RegExp(`html:not\\(\\[data-reduced-motion="false"\\]\\)[^{]*${sel.replace('.', '\\.')}[^{]*\\{animation:none\\}`)
    const attribute = new RegExp(`html\\[data-reduced-motion="true"\\][^{]*${sel.replace('.', '\\.')}[^{]*\\{animation:none\\}`)
    assert.match(css, osQuery, `${sel} is not switched off by the OS query`)
    assert.match(css, attribute, `${sel} is not switched off by the explicit attribute`)
  }
})

/* ── What the hero deleted ────────────────────────────────────────────────── */

test('the borrowed catalogue numbers are gone from the hero', () => {
  // 200K is Iconify's catalogue and 1,500+ is Google Fonts'. Both are real and
  // both are already claimed IN CONTEXT elsewhere in the product, where they
  // are attributable. In a stat strip they read as ours.
  for (const gone of ['200K ICONS', '1,500+ FONTS', 'ONE ACCOUNT', 'ONE WORKSPACE', 'HERO_STATS']) {
    assert.ok(!home.includes(gone), `"${gone}" is still in the hero`)
  }
  assert.ok(!home.includes('home-hero-stats'), 'the stat line markup is still present')
  assert.ok(!css.includes('.home-hero-stats'), 'the stat line CSS is still present')
  assert.ok(!css.includes('.home-hero-stat-sep'), 'the stat separator CSS is still present')
})

test('the one honest number survives, derived, in the command bar placeholder', () => {
  assert.match(commandBar, /placeholder=\{`Search \$\{LIVE_TOOL_COUNT\} live tools`\}/,
    'the placeholder must derive the count, never print it')
  assert.match(commandBar, /CREATE_GROUPS[\s\S]{0,200}filter\(\(tl\) => !tl\.soon\)/,
    'LIVE_TOOL_COUNT must be counted from the tool tree')
})

/* ── The headline, which is still an open founder decision ────────────────── */

test('the headline lives in one place and spends exactly one marker pen', () => {
  // ⚠️ FOUNDER DECISION OPEN — anti-slop-and-hero-2026-08.md §2.12 item 1. This
  // test pins the SHAPE, not the wording, so swapping to the alternative option
  // stays a one-line edit to HERO_HEADLINE.
  // Greedy to the LAST bracket on the line: the marked word is itself in
  // square brackets, so a lazy match stops inside the string it is reading.
  const match = home.match(/const HERO_HEADLINE = \[(.*)\]\s*$/m)
  assert.ok(match, 'HERO_HEADLINE must stay a single top-level array in Home.jsx')
  const lines = match[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
  assert.equal(lines.length, 2, 'the break between the two lines is authored, not computed')

  const marks = lines.join(' ').match(/\[[^\]]+\]/g) || []
  assert.equal(marks.length, 1,
    `design-language-v2.md budgets --hi at one element per viewport; found ${marks.length}`)

  for (const line of lines) {
    const plain = line.replace(/[[\]]/g, '')
    assert.ok(plain.length <= 21,
      `"${plain}" is ${plain.length} characters; over 21 it falls to a third line at the 96px cap`)
  }
  // The retired framing must not come back. positioning.md names "every design
  // tool in one place" as the framing that sells a grab-bag of tools.
  assert.ok(!/every design tool/i.test(home), 'the retired grab-bag framing is back in the hero')
})
