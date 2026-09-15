// THE TINT SWATCH LABELS CARRY COMPUTED INK, SO THEY CANNOT BE DIMMED.
//
// Sibling of tests/unit/label-ink-not-dimmed.test.js, which pins the same rule
// for the Palette Builder board labels and the gradient preview pill. This file
// covers the third family, on /create/tint, and it is a SEPARATE file because
// the arithmetic is different: those labels ink through readableInk(), which
// walks until it clears 4.5:1, while these ink through textColorForBg(), which
// returns whichever of black and white wins on that ground and therefore has a
// different — and slightly larger — worst case.
//
// WHAT THE TWO LABELS ARE. TintTool.jsx writes `--tt-ink` on every swatch and
// every preview role sample (`el.style.setProperty('--tt-ink',
// textColorForBg(color))`), and tint.css paints `color:var(--tt-ink)` on
// `.tt-cell` and `.tt-role-sample`. Two CHILD rules then used to dim it:
//
//   .tt-cell-hex          opacity .84   the hex printed under every swatch
//   .tt-role-sample span  opacity .8    the role name on every preview sample
//
// Both are 9px, so the floor they have to clear is 4.5:1, not 3:1.
//
// WHAT THE DIMMING COST, swept below over all 2,097,152 grounds of a 2-step
// sRGB grid — the same sweep the rule's comment in tint.css quotes:
//
//   alpha 1.00        0 grounds under 4.5:1        worst 4.583:1
//   alpha 0.99        0 grounds under 4.5:1        worst 4.505:1
//   alpha 0.84  311,254 grounds (14.84%)           worst 3.447:1
//   alpha 0.80  428,271 grounds (20.42%)           worst 3.201:1
//
// So the guarantee has about one percent of headroom, and 1.00 is the only
// value worth having. Hierarchy between the step number and the hex under it is
// carried by size (11px against 9px) and weight (750 against 400), which cost
// nothing.
//
// WHY A UNIT TEST WHEN A RENDERED ONE EXISTS. tests/user-sim/90-create-tool-
// state.spec.js drives the real tool to a base colour that reproduces the
// failure and measures composited pixels, which is the stronger proof and the
// slower one. This reads the declarations in milliseconds and covers the case
// the rendered sweep cannot: it is exhaustive over the colour space, and the
// rendered one can only ever visit the ramp that one base hex generates.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_STYLESHEETS } from './appStylesheets.js'

// ── The arithmetic, and it checks itself ────────────────────────────────────

// NOT ROUNDED TO 8 BITS, and the choice is worth a line: a composited channel
// lands between two integers, and rounding it first moves every number in this
// file by a hair (311,176 rather than 311,254 grounds at .84). The rendered
// guard in 90-create-tool-state.spec.js reads getComputedStyle and composites
// in float, so float is what keeps the two measurements comparable.
const linOf = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const lum = ([r, g, b]) => 0.2126 * linOf(r) + 0.7152 * linOf(g) + 0.0722 * linOf(b)
const contrast = (a, b) => {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const BLACK = [0, 0, 0]
const WHITE = [255, 255, 255]
/** src/utils/colors.js textColorForBg: black or white, whichever wins here. */
const inkFor = (g) => (contrast(BLACK, g) >= contrast(WHITE, g) ? BLACK : WHITE)

const AA_SMALL = 4.5

/**
 * What an `opacity` of `alpha` costs these labels, over a 2-step grid of the
 * whole sRGB cube. Returns the count under AA, the share, and the worst ground.
 */
function sweep(alpha) {
  let under = 0
  let total = 0
  let worst = Infinity
  let worstGround = BLACK
  for (let r = 0; r < 256; r += 2) {
    for (let g = 0; g < 256; g += 2) {
      for (let b = 0; b < 256; b += 2) {
        const ground = [r, g, b]
        const ink = inkFor(ground)
        const painted = [
          ink[0] * alpha + r * (1 - alpha),
          ink[1] * alpha + g * (1 - alpha),
          ink[2] * alpha + b * (1 - alpha),
        ]
        const ratio = contrast(painted, ground)
        total += 1
        if (ratio < AA_SMALL) under += 1
        if (ratio < worst) { worst = ratio; worstGround = ground }
      }
    }
  }
  return { under, total, pct: (under / total) * 100, worst, worstGround }
}

const hexOf = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`

// THE POSITIVE CONTROL FOR THE MATHS, and it is not decoration. Every other
// assertion in this file is an ABSENCE — "no rule sets opacity" — which a
// broken parser, a renamed class or a moved stylesheet satisfies while
// measuring nothing, and which says nothing at all about WHY the absence
// matters. This test is the one that can only pass if contrast(), inkFor() and
// sweep() are all still computing something real: it requires the undimmed ink
// to clear AA on every ground AND the shipped-at-the-time .84 to fail on a
// sixth of them. Break either half of the arithmetic and this goes red before
// any absence assertion gets the chance to pass vacuously.
test('the sweep can tell a safe alpha from the one that shipped', () => {
  const full = sweep(1)
  assert.equal(full.under, 0,
    `textColorForBg's own ink fell under ${AA_SMALL}:1 on ${full.under} grounds. `
    + 'That is this file\'s premise failing, not a CSS regression — check '
    + 'contrast()/inkFor() against src/utils/colors.js before touching tint.css.')
  assert.ok(full.worst > 4.5 && full.worst < 4.6,
    `undimmed worst case is ${full.worst.toFixed(3)}:1, expected 4.583:1 on `
    + `${hexOf([0x38, 0x86, 0x0a])}. The ink function changed; re-derive the `
    + 'headroom before trusting any number in this file.')

  const dimmed = sweep(0.84)
  assert.ok(dimmed.under > 300000,
    `an opacity of .84 was measured breaking AA on only ${dimmed.under} grounds, `
    + 'but the defect this file was written about broke 311,254 (14.84%). The '
    + 'sweep has stopped measuring what it claims to.')
  assert.ok(dimmed.worst < 3.5,
    `an opacity of .84 bottomed out at ${dimmed.worst.toFixed(3)}:1, not the `
    + '3.447:1 measured on #EC001A. Same problem as above.')
})

// ── The rules, read out of the shipped stylesheets ───────────────────────────

/** Every declaration block whose selector list mentions `sel`, with its file. */
function rulesFor(sel) {
  const out = []
  for (const { file, css } of ALL_STYLESHEETS) {
    // Comments first — tint.css now documents this rule at length and the prose
    // says "opacity" far more often than the CSS does. Without stripping, every
    // assertion below reads a paragraph as a declaration.
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const re = /([^{}]+)\{([^{}]*)\}/g
    let m
    while ((m = re.exec(bare)) !== null) {
      // Word-boundary match so `.tt-cell` is not found inside `.tt-cell-hex`.
      if (!new RegExp('\\' + sel + '(?![\\w-])').test(m[1])) continue
      out.push({
        file,
        selector: m[1].trim().split(/\s+/).slice(-8).join(' '),
        body: m[2],
      })
    }
  }
  return out
}

// The two label families on /create/tint whose ink is computed, not chosen.
// Adding a selector here is how a new computed-ink label joins the guarantee.
const COMPUTED_INK_LABELS = [
  { sel: '.tt-cell-hex', what: 'the hex printed under every tint swatch' },
  { sel: '.tt-role-sample', what: 'the role name on every preview sample' },
]

test('no tint swatch label dims its computed ink', () => {
  for (const { sel, what } of COMPUTED_INK_LABELS) {
    const rules = rulesFor(sel)

    // POSITIVE CONTROL, load-bearing for the same reason as in
    // label-ink-not-dimmed.test.js: the assertion under it is an absence, so a
    // rename or a moved stylesheet would satisfy it while reading nothing.
    assert.ok(rules.length > 0,
      `no rule for ${sel} was found in any stylesheet, so the opacity assertion `
      + 'below is guarding nothing. The class was renamed or the sheet moved.')

    for (const { file, selector, body } of rules) {
      const found = /(?:^|;)\s*opacity\s*:\s*([^;]+)/.exec(body)
      if (!found) continue
      const alpha = Number(found[1].trim())
      const cost = Number.isFinite(alpha) && alpha < 1 ? sweep(alpha) : null
      assert.fail(
        `${file} — \`${selector}\` sets opacity:${found[1].trim()} on ${sel} (${what}). `
        + 'Its colour is var(--tt-ink), which TintTool.jsx computes with '
        + 'textColorForBg() against the swatch the USER chose, so the opacity is '
        + 'spending a contrast guarantee that has almost no headroom: the '
        + `undimmed worst case over the whole sRGB cube is 4.583:1.${cost
          ? ` At ${alpha} the label falls under 4.5:1 on ${cost.under.toLocaleString()} `
            + `of ${cost.total.toLocaleString()} grounds (${cost.pct.toFixed(2)}%), `
            + `worst ${cost.worst.toFixed(3)}:1 on ${hexOf(cost.worstGround)}.`
          : ''} Use size, weight or tracking for hierarchy instead — see the note `
          + 'above .tt-cell-hex in src/styles/pages/tint.css.',
      )
    }
  }
})
