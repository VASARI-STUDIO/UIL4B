// AN OPACITY ON TEXT WHOSE INK WAS CHOSEN FOR CONTRAST IS ALWAYS A BUG.
//
// Two families of label in this app do not get their colour from a token. They
// compute it against a ground the USER chose, so the ground is not known until
// runtime and no designer can eyeball the pair:
//
//   * The Palette Builder board labels — `.plb-name`, `.plb-role` — ink through
//     readableInk(fill), which walks until the text clears 4.5:1 on that fill.
//   * The gradient preview pills — `.ggn-pill` — print white on a translucent
//     scrim laid over a gradient the user built, so their effective ground is
//     whatever colours they picked.
//
// Both had a dimming property applied on top, and in both cases the dimming
// silently spent a guarantee that had already been fully consumed:
//
//   .plb-name  opacity .95  →  10.41% of grounds under 4.5:1, worst 4.14:1
//   .plb-role  opacity .6   →  89.51% of grounds under 4.5:1, worst 2.19:1
//   .ggn-pill  scrim .5     →  3.69:1 on a white gradient stop
//
// WHY THE PALETTE HALF CAN NEVER BE FIXED BY LOWERING THE NUMBER. readableInk's
// guarantee is exact, not comfortable. Swept over a 2-step grid of all
// 2,097,152 sRGB grounds, its ink clears 4.5:1 on every one — and the worst
// case is 4.500:1, on #F03004. It lands ON the floor, so there is no headroom
// for an opacity to spend and the lowest safe value is 1.00. That is why those
// two rules were emptied rather than tuned, and it is the fact this file pins:
// the moment a dimming property returns to either, it fails here.
//
// WHY THIS IS A UNIT TEST WHEN A RENDERED ONE EXISTS.
// 63-workbench-ink-search.spec.js (DELETED with HomeWorkbench) measured the composited alpha
// on a real board in both themes, which is the stronger proof and the slower
// one. This reads the declarations and fails in milliseconds, and it covers the
// case the rendered sweep structurally cannot: `.ggn-pill` sits on a gradient,
// so groundOf() returns no flat colour for it and that sweep skips it — which
// is exactly how the pill's scrim shipped under AA with a green suite.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_STYLESHEETS } from './appStylesheets.js'

/** Every declaration block whose selector list mentions `cls`, with its file. */
function rulesFor(cls) {
  const out = []
  for (const { file, css } of ALL_STYLESHEETS) {
    // Comments first: global.css documents these rules at length and the prose
    // says "opacity" more often than the CSS does. Stripping is not cosmetic —
    // without it every assertion below reads a paragraph as a declaration.
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const re = /([^{}]+)\{([^{}]*)\}/g
    let m
    while ((m = re.exec(bare)) !== null) {
      const selector = m[1].trim().split(/\s+/).slice(-8).join(' ')
      const body = m[2]
      // Word-boundary match so `.plb-name` is not found inside `.plb-names`.
      const hit = new RegExp('\\' + cls + '(?![\\w-])').test(m[1])
      if (hit) out.push({ file, selector, body })
    }
  }
  return out
}

// The labels whose ink is computed, not chosen. Adding a class here is how a
// new computed-ink label joins the guarantee.
const COMPUTED_INK_LABELS = ['.plb-name', '.plb-role']

test('no Palette Builder board label dims its computed ink', () => {
  for (const cls of COMPUTED_INK_LABELS) {
    const rules = rulesFor(cls)

    // POSITIVE CONTROL, and it is load-bearing. Every assertion in this test is
    // an ABSENCE, so a renamed class, a moved stylesheet or a broken parser
    // satisfies all of them while measuring nothing. This is the shape that has
    // gone vacuous in this suite before — see the header of appStylesheets.js,
    // where two tests quietly stopped reading the rules they were written about.
    assert.ok(rules.length > 0,
      `no rule for ${cls} was found in any stylesheet, so the opacity assertion `
      + 'below is guarding nothing. The class was renamed or moved.')

    for (const { file, selector, body } of rules) {
      const opacity = /(?:^|;)\s*opacity\s*:\s*([^;]+)/.exec(body)
      assert.equal(opacity, null,
        `${file} — \`${selector}\` sets opacity:${opacity && opacity[1].trim()} on `
        + `${cls}. Its ink comes from readableInk(), whose worst case over all `
        + '2,097,152 grounds is exactly 4.500:1, so there is no headroom to dim: '
        + 'any value below 1 puts the label under AA on a share of the colour '
        + 'space (.95 → 10.41%, .6 → 89.51%). Use size, weight or tracking for '
        + 'hierarchy instead — see the note above .plb-role in global.css.')
    }
  }
})

// ── The gradient pill, which is arithmetic rather than an absence ────────────

const lin = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const contrast = (a, b) => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// The design's drawn gradient screen puts no label on the canvas. The one label that still sits over a user-chosen
// gradient is the stop handle's live position readout, `.grd-handle-val`, so
// the same arithmetic now guards it.
test('the gradient handle readout stays legible on the brightest gradient possible', () => {
  const rules = rulesFor('.grd-handle-val').filter((r) => /background\s*:/.test(r.body))
  assert.ok(rules.length > 0,
    'no .grd-handle-val rule with a background was found, so this test is guarding nothing.')

  for (const { file, selector, body } of rules) {
    const ink = /(?:^|;)\s*color\s*:\s*([^;]+)/.exec(body)
    assert.ok(ink, `${file} — \`${selector}\` has no colour to measure.`)
    assert.equal(ink[1].trim(), '#fff',
      `${file} — \`${selector}\` no longer paints white. The arithmetic below `
      + 'assumes white ink; update it with the new colour.')

    const scrim = /background\s*:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(body)
    assert.ok(scrim,
      `${file} — \`${selector}\` no longer uses an rgba() scrim, so its legibility `
      + 'over a user-chosen gradient is no longer something this test can compute.')

    const rgb = [Number(scrim[1]), Number(scrim[2]), Number(scrim[3])]
    const alpha = Number(scrim[4])

    // THE WORST GROUND A GRADIENT CAN PRESENT IS PURE WHITE, so that is the only
    // case worth asserting: clear it and every stop the user can pick is clear
    // too. backdrop-filter does not enter this — a blur averages the
    // neighbourhood and cannot return anything brighter than its brightest
    // pixel, so white stays the bound with or without it.
    const composited = rgb.map((c) => c * alpha + 255 * (1 - alpha))
    const ratio = contrast([255, 255, 255], composited)

    assert.ok(ratio >= 4.5,
      `${file} — \`${selector}\` paints white on rgba(${rgb.join(',')},${alpha}) `
      + `over a gradient. On a white stop that composites to ${ratio.toFixed(2)}:1, `
      + 'under the 4.5:1 floor for 11px text. The scrim has to assume the '
      + 'brightest colour the user can choose: 0.56 is the floor and 0.62 is what '
      + 'ships, for margin.')
  }
})
