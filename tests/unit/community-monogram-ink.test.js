// The /community card monograms sit on a gradient whose stops are DATA, so no
// fixed ink can be right for all of them. Nine of the twelve curated cards were
// below the 3:1 large-text floor, worst 1.47:1, and nothing in the suite could
// see it: both 39-accent-contrast and 43-state-token-contrast bail with a null
// on the first background-image ancestor they meet, so every node over a
// gradient was dropped BEFORE it was scored. 48-text-over-gradients.spec.js
// measures them now, in a rendered browser, against real pixels.
//
// This file is the other half, and it exists because the rendered spec walks
// only the twelve rows that happen to be on the page. The guarantee being made
// is about the FUNCTION — give it any pair of stops and the ink it returns
// clears the floor — so it is proved here where it costs milliseconds, the same
// split workbenchInk.js already uses for the generated-palette inks.
//
// Everything below is the SAME arithmetic the rendered spec checks against
// Chromium's own pixels. It is not a second opinion; it is the cheap half of one
// opinion, and 48 is what keeps it honest.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { contrastRatio, inkOnGradient, mixHex } from '../../src/utils/colors.js'
import { COMMUNITY_DESIGNS } from '../../src/data/communityDesigns.js'
import { stripJs as stripComments } from '../helpers/strip-comments.js'

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

// 30px/700 is large text under WCAG 1.4.3 (18.66px bold and up), so 3:1.
const FLOOR = 3

// The stop pair renders as linear-gradient(135deg, c1, c2). Both stops are
// opaque hexes, so CSS interpolates per channel in sRGB and there is no
// premultiplied-alpha term — which is exactly why this can be arithmetic
// rather than a screenshot. Sampled, not endpoint-tested; see the third test.
const SAMPLES = 257
function worstOnGradient(ink, c1, c2) {
  let worst = Infinity
  for (let i = 0; i < SAMPLES; i++) {
    const r = contrastRatio(ink, mixHex(c1, c2, i / (SAMPLES - 1)))
    if (r < worst) worst = r
  }
  return worst
}

// What the rule painted before: rgba(255,255,255,.92). CSS composites that over
// whatever is behind it, so the effective ink is a different colour on every
// stop of every gradient — which is half of why the failure was so easy to miss.
function legacyInkOver(ground) {
  const at = (i) => parseInt(ground.slice(i, i + 2), 16)
  const ch = (v) => Math.round(v).toString(16).padStart(2, '0')
  return '#' + ch(255 * 0.92 + at(1) * 0.08) + ch(255 * 0.92 + at(3) * 0.08) + ch(255 * 0.92 + at(5) * 0.08)
}
function worstLegacy(c1, c2) {
  let worst = Infinity
  for (let i = 0; i < SAMPLES; i++) {
    const g = mixHex(c1, c2, i / (SAMPLES - 1))
    const r = contrastRatio(legacyInkOver(g), g)
    if (r < worst) worst = r
  }
  return worst
}

const CARDS = COMMUNITY_DESIGNS.filter((d) => d.c1 && d.c2)

// ── 1. The fixture discriminates ────────────────────────────────────────────
// First, because every assertion below is vacuous if the seed data stopped
// carrying gradients or the old ink was already fine.

test('the seed data still carries gradient stops, and the OLD ink really failed on them', () => {
  assert.ok(CARDS.length >= 12, `only ${CARDS.length} community cards carry a c1/c2 pair`)

  const failed = CARDS.filter((d) => worstLegacy(d.c1, d.c2) < FLOOR)
  assert.equal(
    failed.length, 9,
    'The shipped-before ink, rgba(255,255,255,.92), was below 3:1 on NINE of the twelve. '
    + `This run says ${failed.length}. If the seed colours changed, re-price the fix; if this `
    + 'is zero, the fixture no longer discriminates and every test below proves nothing.',
  )
  const worst = Math.min(...CARDS.map((d) => worstLegacy(d.c1, d.c2)))
  assert.ok(worst < 1.6, `the worst legacy ratio was 1.47:1; this run says ${worst.toFixed(2)}`)
})

// ── 2. The guarantee ────────────────────────────────────────────────────────

test('every community monogram ink clears the 3:1 large-text floor on its own gradient', () => {
  const bad = []
  for (const d of CARDS) {
    const ink = inkOnGradient(d.c1, d.c2, FLOOR)
    const ratio = worstOnGradient(ink, d.c1, d.c2)
    if (ratio < FLOOR) bad.push(`${d.id} ${d.c1}->${d.c2}: ${ink} at ${ratio.toFixed(2)}:1`)
  }
  assert.deepEqual(bad, [], 'monograms below the floor:\n  ' + bad.join('\n  '))
})

test('no curated colour is touched — only the ink moves', () => {
  // The whole reason per-item ink was chosen over darkening the seeds: the
  // colour IS the content on a design-community card. inkOnGradient is a pure
  // read; this pins the intent so a future "fix" cannot quietly edit the data.
  const seeds = CARDS.map((d) => `${d.id}:${d.c1}/${d.c2}`)
  assert.deepEqual(seeds.slice(0, 3), ['s1:#3B82F6/#8B5CF6', 's2:#0EA5E9/#22D3EE', 's3:#111827/#374151'])
  const s9 = CARDS.find((d) => d.id === 's9')
  assert.equal(`${s9.c1}/${s9.c2}`, '#059669/#6EE7B7', 'the worst-contrast card keeps its colours')
})

test('the accepted cost is real and pinned: ten of the twelve monograms are dark ink', () => {
  // The founder accepted this explicitly. Pinned so nobody "restores the single
  // white ink" believing it is a cosmetic tidy-up — it is the defect coming back.
  const dark = CARDS.filter((d) => {
    const ink = inkOnGradient(d.c1, d.c2, FLOOR)
    return contrastRatio(ink, '#FFFFFF') >= contrastRatio(ink, '#000000')
  })
  assert.equal(dark.length, 10, `expected 10 dark-ink monograms of 12, got ${dark.length}`)
  const light = CARDS.filter((d) => !dark.includes(d)).map((d) => d.id).sort()
  assert.deepEqual(light, ['s10', 's3'], 'only the two near-black gradients keep a light ink')
})

// ── 3. The model has to SAMPLE, and this is the case that proves it ─────────

test('the gradient is sampled, not endpoint-tested — and sampling changes the ANSWER', () => {
  // Relative luminance is convex along a gamma-encoded per-channel lerp, so its
  // MAXIMUM is at an endpoint but its minimum can be interior. A dark ink's
  // worst ground is the DARKEST one, so endpoint-only testing reads high.
  //
  // #FF0000 -> #0080FF is the case that makes this load-bearing rather than
  // merely more precise. Both stops are light enough that a dark ink looks
  // comfortable at the ends — 4.92:1 — while the ramp dips through a muddy
  // interior where the same ink measures 2.76:1, below the floor. An
  // endpoint-only model does not just report a better number here; it picks
  // the WRONG POLE and ships an illegible monogram.
  const [a, b] = ['#FF0000', '#0080FF']
  const DARK = '#0A0B0D'
  const endpointsOnly = Math.min(contrastRatio(DARK, a), contrastRatio(DARK, b))
  const truth = worstOnGradient(DARK, a, b)
  assert.ok(endpointsOnly >= FLOOR, `the endpoint model must ACCEPT this ink for the point to stand (${endpointsOnly.toFixed(2)})`)
  assert.ok(truth < FLOOR, `and the sampled ramp must reject it (${truth.toFixed(2)})`)

  // The shipped function samples, so it takes the other pole and clears.
  const chosen = inkOnGradient(a, b, FLOOR)
  assert.notEqual(chosen, DARK, 'inkOnGradient chose the pole an endpoint-only model would have chosen')
  assert.ok(
    worstOnGradient(chosen, a, b) >= FLOOR,
    `inkOnGradient returned ${chosen}, which is ${worstOnGradient(chosen, a, b).toFixed(2)}:1 `
    + 'on the sampled ramp — below the floor',
  )
})

// ── 4. Where ink alone cannot win, recorded rather than assumed ─────────────

test('a straddling gradient is NOT solved by ink, and no shipped pair is near one', () => {
  // Honest bound. If a ramp is light enough at one end to defeat a dark ink and
  // dark enough at the other to defeat a light one, no single ink clears it and
  // the answer would have to be a scrim or different seed colours — the two
  // options the founder did not pick. Nothing ships near this, but the function
  // must not be read as a guarantee for arbitrary data.
  const ink = inkOnGradient('#000000', '#A0A0A0', FLOOR)
  assert.ok(
    worstOnGradient(ink, '#000000', '#A0A0A0') < FLOOR,
    'A black-to-mid-grey ramp is supposed to be unsolvable by ink alone. If this now '
    + 'passes, the pole walk changed and this bound needs re-measuring rather than deleting.',
  )
  // The shipped pairs are nowhere near it: every one keeps its whole ramp on one
  // side, which is why per-item ink is sufficient HERE and not in general.
  for (const d of CARDS) {
    const chosen = inkOnGradient(d.c1, d.c2, FLOOR)
    assert.ok(
      worstOnGradient(chosen, d.c1, d.c2) >= FLOOR + 0.4,
      `${d.id} clears the floor by less than 0.4 — it is drifting toward the straddle case`,
    )
  }
})

// ── 5. The maths is wired to the page ───────────────────────────────────────
// A guarantee that no component calls is worth nothing, and this is exactly the
// shape of failure the repo has hit before: correct arithmetic, orphaned.

test('CommunityCard chooses the ink per item and hands it to the stylesheet', () => {
  const src = stripComments(read('src/components/discover/CommunityCard.jsx'))
  assert.match(src, /inkOnGradient\(/, 'CommunityCard no longer computes a per-item ink')
  assert.match(src, /--mono-ink/, 'CommunityCard no longer sets --mono-ink')
  assert.match(src, /--mono-glow/, 'CommunityCard no longer sets --mono-glow')
  assert.match(src, /item\.c1/, 'the ink must be derived from the card\'s OWN stops')
})

test('.ch-thumb-mono reads the per-item ink and is opaque', () => {
  const css = stripComments(read('src/styles/global.css'))
  const rule = css.match(/\.ch-thumb-mono\{[^}]*\}/)
  assert.ok(rule, '.ch-thumb-mono has gone from the stylesheet')
  assert.match(rule[0], /color:var\(--mono-ink/, '.ch-thumb-mono is not reading the per-item ink')
  assert.ok(
    !/color:rgba\(/.test(rule[0]),
    'the ink is translucent again. CSS composites it toward the ground, so the '
    + 'measured ratio is not the ratio the colour claims — that alpha was worth '
    + '0.1-0.2:1 here and about 0.7:1 on the state tokens.',
  )
})

// ── 6. The FALLBACK ground, which per-item ink could not see ─────────────
//
// Per-item ink is a guarantee about a card that HAS a usable pair of stops.
// Nothing validates c1/c2: sanitizeCommunitySubmission passes them straight
// through, and Community.jsx spreads a server payload over its own defaults,
// so a card can reach CommunityCard with no usable pair at all. That card
// falls through to the rule's own ground -
// linear-gradient(135deg,var(--accent),var(--accent-strong)) - which is not
// per-item DATA but a THEME pair, and the two are different colours in the two
// themes. The hard-coded #FFFFFF that used to sit in the var() fallback was
// never measured against either of them.

// The accent pair as the CASCADE resolves it: the last declaration inside a
// [data-theme="..."] block wins, because :root and [data-theme] are both
// (0,1,0) and this sheet declares --accent only in theme blocks. Read off the
// sheet rather than repeated here, so moving a brand value fails this test
// instead of silently invalidating it.
function themeToken(css, theme, token) {
  const re = new RegExp('\\[data-theme="' + theme + '"\\]\\s*\\{([^}]*)\\}', 'g')
  let value = null
  for (const m of css.matchAll(re)) {
    const d = m[1].match(new RegExp('--' + token + ':\\s*(#[0-9a-fA-F]{6})'))
    if (d) value = d[1]
  }
  return value
}

// The stylesheet's own fallback ink for a thumbnail with no usable stops.
//
// LAST DECLARATION WINS, so every matching rule is scanned rather than the
// first one found: `.ch-thumb` is declared twice on purpose (geometry first,
// then the ink defaults), and taking match() at its word would read the
// geometry rule, find no ink and report the guarantee missing when it is there.
function fallbackInk(css, theme) {
  const re = theme === 'dark'
    ? /\[data-theme="dark"\]\s+\.ch-thumb\{([^}]*)\}/g
    : /(?:^|[\r\n])\.ch-thumb\{([^}]*)\}/g
  let value = null
  for (const rule of css.matchAll(re)) {
    const m = rule[1].match(/--mono-ink:\s*(#[0-9a-fA-F]{6})/)
    if (m) value = m[1]
  }
  return value
}

test('the accent-gradient fallback carries a MEASURED ink in both themes', () => {
  const css = stripComments(read('src/styles/global.css'))
  for (const theme of ['light', 'dark']) {
    const c1 = themeToken(css, theme, 'accent')
    const c2 = themeToken(css, theme, 'accent-strong')
    assert.ok(c1 && c2, `${theme}: could not read the accent pair off the sheet`)
    const ink = fallbackInk(css, theme)
    assert.ok(ink, `${theme}: .ch-thumb declares no fallback --mono-ink`)
    const ratio = worstOnGradient(ink, c1, c2)
    assert.ok(
      ratio >= FLOOR,
      `${theme}: the fallback monogram ink ${ink} measures ${ratio.toFixed(2)}:1 on `
      + `${c1}->${c2}, below the ${FLOOR}:1 large-text floor`,
    )
  }
})

test('and prefers-contrast: more does not undo it', () => {
  // That block overrides --accent and --accent-strong to a single value per
  // theme, so the fallback ground changes shape - a solid, not a ramp - for
  // the one user who asked for MORE contrast. Both poles are checked there too.
  const css = stripComments(read('src/styles/global.css'))
  const block = css.match(/@media \(prefers-contrast: more\)\{([\s\S]*?)[\r\n]\}/)
  assert.ok(block, 'the prefers-contrast block has gone from the sheet')
  for (const theme of ['light', 'dark']) {
    const scoped = block[1].match(new RegExp('\\[data-theme="' + theme + '"\\]\\{([^}]*)\\}'))
    assert.ok(scoped, `${theme}: no prefers-contrast override`)
    const c1 = scoped[1].match(/--accent:\s*(#[0-9a-fA-F]{6})/)
    const c2 = scoped[1].match(/--accent-strong:\s*(#[0-9a-fA-F]{6})/)
    assert.ok(c1 && c2, `${theme}: the override no longer sets both accent tokens`)
    const ink = fallbackInk(css, theme)
    const ratio = worstOnGradient(ink, c1[1], c2[1])
    assert.ok(ratio >= FLOOR, `${theme} prefers-contrast: ${ink} is ${ratio.toFixed(2)}:1 on ${c1[1]}->${c2[1]}`)
  }
})

test('the fixture discriminates: the hard-coded white this replaced really failed', () => {
  // Without this the two tests above would pass on a sheet that never had a
  // problem. #FFFFFF measures 4.43:1 on the light pair and 2.41:1 on the dark
  // one - so the defect was theme-shaped, and a light-only check would have
  // reported a clean pass. Same reversal [gradient-text-below-aa] recorded for
  // --accent-strong on /seo.
  const css = stripComments(read('src/styles/global.css'))
  const dark = worstOnGradient('#FFFFFF', themeToken(css, 'dark', 'accent'), themeToken(css, 'dark', 'accent-strong'))
  assert.ok(dark < FLOOR, `plain white now measures ${dark.toFixed(2)}:1 on the dark accent pair - `
    + 'the brand values moved and the two tests above need re-measuring, not deleting')
})

test('CommunityCard writes the stops and the ink together, or writes neither', () => {
  // The hole this closes was a SPLIT: --c1/--c2 were written unconditionally
  // while --mono-ink was written only when they parsed, so a card with a
  // non-hex stop got a ground from its own bad data and an ink from the
  // stylesheet's fallback - two measurements of two different things. Worse, a
  // value CSS cannot parse at all invalidates the whole gradient at
  // computed-value time, so .ch-thumb resolves to `initial` and the monogram
  // lands on the CARD, where white is 1.00:1 in light.
  const src = stripComments(read('src/components/discover/CommunityCard.jsx'))
  const style = src.match(/style: mono[\s\S]{0,240}?,\s*\}/)
  assert.ok(style, 'the thumbnail style is no longer gated on the per-item ink')
  const branch = style[0]
  for (const prop of ['--c1', '--c2', '--mono-ink', '--mono-glow']) {
    assert.ok(branch.includes(prop), `${prop} is no longer written on the same branch as the others`)
  }
  assert.match(branch, /:\s*undefined/, "the unusable-stops branch must write NOTHING, so the rule's own fallback applies")
})
