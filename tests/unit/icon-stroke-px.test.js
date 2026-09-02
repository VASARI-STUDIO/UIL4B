// Icon stroke width — the number the user sets is the number they measure.
//
// FOUNDER BUG (2026-09-02): "I tried exporting a 2px stroke width and it
// exported at 4px." `stroke-width` is measured in viewBox USER UNITS; our icons
// carry a 24-unit viewBox; the export writes width/height = `size`, default 48.
// The renderer therefore scaled the drawing 2x and a stroke of 2 landed as 4px.
// At size 64 it was fractional as well as wrong: 2 became 5.33px.
//
// The serializer was never the bug — it wrote the number it was handed. The
// CONTROL was, because a slider labelled "Stroke" with stops at 1 / 1.5 / 2
// reads as pixels to everybody. The fix makes the control mean pixels, and this
// suite is the pin: for a matrix of size x stroke x viewBox, the attribute we
// write must be the one that MEASURES the requested pixels once the renderer
// has scaled it back up.
//
// The expected scale is recomputed here on purpose rather than imported. If it
// came from the module under test, a broken `renderScale` would break both
// sides of every assertion identically and the suite would stay green.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_VIEWBOX, STROKE_PX, clampStrokePx, customIconStrokePx, draftStrokePx,
  parseViewBox, renderScale, stickyStrokePx, strokeAttrForPx, viewBoxOf,
} from '../../src/utils/iconStroke.js'

// What a browser does with `<svg width=size height=size viewBox="0 0 w h">`:
// both axes are pinned to `size`, so the default preserveAspectRatio letterboxes
// a non-square box and the uniform scale is the smaller ratio.
const scale = (size, w, h = w) => Math.min(size / w, size / h)

/** The width, in CSS pixels, that a browser will actually paint. */
const painted = (attr, size, w, h = w) => attr * scale(size, w, h)

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

// ── The report ───────────────────────────────────────────────────────────────

test('THE BUG: 2px at the default size exports as 2px, not 4px', () => {
  // The founder's exact reproduction. Default size 48, 24-unit viewBox.
  const attr = strokeAttrForPx({ px: 2, size: 48, viewBox: 24 })
  assert.equal(attr, 1, 'a 2px stroke on a 2x-scaled drawing is stroke-width="1"')
  assert.equal(painted(attr, 48, 24), 2, 'and it must MEASURE 2px')
  // The old behaviour, named so it cannot come back by accident.
  assert.notEqual(attr, 2, 'writing the pixel value straight through is the bug')
})

test('every size the editor offers measures the width that was asked for', () => {
  // The full size ladder from the Size slider's snaps, plus the two ends.
  for (const size of [12, 16, 24, 32, 48, 64, 96, 128]) {
    for (const px of [0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8]) {
      const attr = strokeAttrForPx({ px, size, viewBox: 24 })
      assert.ok(
        Math.abs(painted(attr, size, 24) - px) < 1e-4,
        `size ${size}, ${px}px -> stroke-width ${attr} paints ${painted(attr, size, 24)}px`,
      )
    }
  }
})

test('the sizes the old arithmetic got fractionally wrong are now exact', () => {
  // The note called these out by name: at 64 a stroke of 2 painted 5.33px.
  assert.equal(strokeAttrForPx({ px: 2, size: 64, viewBox: 24 }), 0.75)
  assert.equal(painted(0.75, 64, 24), 2)
  assert.equal(strokeAttrForPx({ px: 3, size: 128, viewBox: 24 }), 0.5625)
  assert.equal(painted(0.5625, 128, 24), 3)
  // Size 24 is the one case where the old and new values coincide, because the
  // scale is 1. A fix that only worked there would be no fix at all.
  assert.equal(strokeAttrForPx({ px: 2, size: 24, viewBox: 24 }), 2)
})

// ── Non-24 viewBoxes ─────────────────────────────────────────────────────────

test('the scale reads the icon\'s OWN viewBox, never a hard-coded 24', () => {
  // Pasted and custom SVGs are routinely 16, 20, 32 or 512.
  const cases = [
    { size: 48, px: 2, vb: 16, attr: 0.66667 },
    { size: 48, px: 2, vb: 20, attr: 0.83333 },
    { size: 48, px: 2, vb: 32, attr: 1.33333 },
    { size: 48, px: 2, vb: 512, attr: 21.33333 },
    { size: 32, px: 1.5, vb: 16, attr: 0.75 },
  ]
  for (const { size, px, vb, attr } of cases) {
    assert.equal(strokeAttrForPx({ px, size, viewBox: vb }), attr, `${px}px at ${size} on a ${vb} box`)
    assert.ok(Math.abs(painted(attr, size, vb) - px) < 1e-4, `${vb}-unit box must still paint ${px}px`)
  }
})

test('a non-square viewBox is letterboxed, so the smaller ratio wins', () => {
  // width and height are BOTH `size`, so a 24x48 box is drawn at half scale on
  // the x axis's terms; using size/w would paint the stroke at double.
  const box = { w: 24, h: 48 }
  const attr = strokeAttrForPx({ px: 2, size: 48, viewBox: box })
  assert.equal(renderScale(48, box), 1)
  assert.equal(attr, 2)
  assert.equal(painted(attr, 48, 24, 48), 2)
})

test('a missing, malformed or degenerate viewBox falls back to 24 rather than NaN', () => {
  for (const bad of [null, undefined, '', 'nonsense', '0 0 24', '0 0 0 0', '0 0 -5 -5', '0 0 24 abc']) {
    const { w, h } = parseViewBox(bad)
    assert.equal(w, DEFAULT_VIEWBOX, `viewBox ${JSON.stringify(bad)}`)
    assert.equal(h, DEFAULT_VIEWBOX, `viewBox ${JSON.stringify(bad)}`)
  }
  // Comma-separated is legal SVG and appears in the wild.
  assert.deepEqual(parseViewBox('0,0,32,32'), { w: 32, h: 32 })
  assert.equal(strokeAttrForPx({ px: 2, size: 48, viewBox: 'garbage' }), 1, 'falls back to the 24 grid')
})

test('the viewBox is read off the real markup, root element only', () => {
  assert.deepEqual(viewBoxOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path/></svg>'), { w: 16, h: 16 })
  assert.deepEqual(viewBoxOf("<svg viewBox='0 0 20 20'/>"), { w: 20, h: 20 })
  assert.deepEqual(viewBoxOf('<svg fill="none"><path d="M0 0"/></svg>'), { w: 24, h: 24 }, 'no viewBox → the 24 grid')
  assert.deepEqual(viewBoxOf(null), { w: 24, h: 24 })
})

test('an unusable stroke yields null, so no attribute is written at all', () => {
  // Better a file with the pack's own stroke than one carrying stroke-width="NaN".
  for (const bad of [undefined, null, '', 'thick', NaN, Infinity, -1, 0]) {
    assert.equal(strokeAttrForPx({ px: bad, size: 48, viewBox: 24 }), null, String(bad))
  }
  // A zero-width stroke is an invisible icon; leaving the pack's own attribute
  // alone is the less destructive answer.
  assert.equal(strokeAttrForPx({ px: 0, size: 48, viewBox: 24, absolute: true }), null)
})

// ── The Fixed (non-scaling-stroke) toggle ────────────────────────────────────

test('Fixed passes the pixel value straight through, because it is already pixels', () => {
  // `vector-effect: non-scaling-stroke` resolves stroke-width in the FINAL
  // rendered space. Dividing by the scale as well would halve it.
  for (const size of [24, 48, 64, 128]) {
    for (const vb of [16, 24, 32]) {
      assert.equal(strokeAttrForPx({ px: 2, size, viewBox: vb, absolute: true }), 2)
    }
  }
})

test('Fixed and default agree on the pixels AT the export size, and only there', () => {
  // This is why the toggle still earns its place: the two modes are now
  // indistinguishable in the exported file as delivered, and differ only when a
  // consumer rescales it. Scaled, the default mode's stroke grows with the
  // artwork; Fixed's does not.
  const size = 48
  const off = strokeAttrForPx({ px: 3, size, viewBox: 24 })
  const on = strokeAttrForPx({ px: 3, size, viewBox: 24, absolute: true })
  assert.equal(painted(off, size, 24), 3)
  assert.equal(on, 3, 'non-scaling-stroke: the attribute IS the painted width')
  assert.notEqual(off, on, 'they are different attribute values reaching the same result')
  // Rendered at double size by whoever consumes the file:
  assert.equal(painted(off, size * 2, 24), 6, 'default: the stroke scales with the icon')
  assert.equal(on, 3, 'Fixed: still 3px, at any size it is ever drawn at')
})

// ── Saved icons ──────────────────────────────────────────────────────────────

test('a pre-fix saved icon re-opens at the weight it was saved at', () => {
  // Pre-fix records stored viewBox units next to their own `size` and their own
  // baked `svg`, so the pixel weight is exactly recoverable.
  const legacy = { stroke: 2, size: 48, svg: '<svg viewBox="0 0 24 24"><path/></svg>' }
  assert.equal(customIconStrokePx(legacy), 4, '2 units at size 48 always painted 4px')
  assert.equal(customIconStrokePx({ ...legacy, size: 64 }), 5.333333333333333)
  assert.equal(customIconStrokePx({ ...legacy, stroke: 1, size: 24 }), 1)
  assert.equal(
    customIconStrokePx({ stroke: 2, size: 48, svg: '<svg viewBox="0 0 16 16"><path/></svg>' }), 6,
    'and it reads that record\'s own viewBox, not 24',
  )
})

test('the migration round-trips: a re-saved legacy icon is byte-identical', () => {
  // The strongest form of "nothing changed meaning". Convert the stored value
  // to pixels, convert it back for the attribute, and land on the number
  // already frozen in the record's own markup.
  for (const size of [12, 24, 32, 48, 64, 96, 128]) {
    for (const units of [1, 1.5, 2, 2.5, 3]) {
      for (const vb of [16, 20, 24, 32]) {
        const record = { stroke: units, size, svg: `<svg viewBox="0 0 ${vb} ${vb}"><path/></svg>` }
        const px = customIconStrokePx(record)
        const attr = strokeAttrForPx({ px, size, viewBox: vb })
        assert.ok(
          Math.abs(attr - units) < 1e-4,
          `size ${size}, ${units} units on a ${vb} box: re-exported as ${attr}`,
        )
      }
    }
  }
})

test('a record written since the fix is never converted twice', () => {
  const fresh = { stroke: 2, size: 48, strokeUnit: 'px', svg: '<svg viewBox="0 0 24 24"><path/></svg>' }
  assert.equal(customIconStrokePx(fresh), 2, 'the stamp is what stops a second conversion')
  assert.equal(customIconStrokePx({ ...fresh, size: 128 }), 2, 'and size no longer enters into it')
})

test('a legacy record with Absolute on was ALREADY pixels, so it is left alone', () => {
  // non-scaling-stroke resolved in rendered space even before this fix, so that
  // number already meant what the user read. Converting it would be the bug.
  const rec = { stroke: 2, size: 48, absStroke: true, svg: '<svg viewBox="0 0 24 24"><path/></svg>' }
  assert.equal(customIconStrokePx(rec), 2)
})

test('a record with no usable stroke seeds nothing rather than a wrong number', () => {
  for (const rec of [null, undefined, {}, { stroke: 0 }, { stroke: 'two' }, { stroke: NaN }]) {
    assert.equal(customIconStrokePx(rec), null, JSON.stringify(rec))
  }
})

test('the sticky preference keeps its WEIGHT across the unit change', () => {
  // The old key held a bare user-unit number with no size beside it, but the
  // editor has always opened at 48 on a 24 grid — the state that value was set
  // and last seen in. Its stated purpose is "the next icon starts at the same
  // weight", so the weight is what survives, not the digit.
  assert.equal(stickyStrokePx(null, '2'), 4, 'the old default painted 4px and still does')
  assert.equal(stickyStrokePx(null, '1'), 2)
  assert.equal(stickyStrokePx(null, '3'), 6)
  // The new key wins outright once it exists.
  assert.equal(stickyStrokePx('2', '3'), 2)
  assert.equal(stickyStrokePx('1.5', null), 1.5)
  // Junk in either slot falls to the default, never to NaN.
  for (const [a, b] of [[null, null], ['', ''], ['x', 'y'], [null, '9'], [null, '0'], ['0', null]]) {
    assert.equal(stickyStrokePx(a, b), STROKE_PX.default, `${a} / ${b}`)
  }
})

test('the homepage hand-off keeps the weight the visitor saw', () => {
  // The homepage preview draws a bare 24-grid Lucide path at `size`, so its
  // user-unit number converts the same way. Its bounded sets, verbatim.
  for (const size of [24, 32, 48]) {
    for (const units of [1, 1.5, 2, 2.5]) {
      assert.equal(draftStrokePx(units, size), units * (size / 24), `${units} at ${size}`)
    }
  }
  assert.equal(draftStrokePx(1.5, 48), 3)
  assert.equal(draftStrokePx(undefined, 48), null, 'no draft → fall through to the sticky width')
})

// ── The control's range ──────────────────────────────────────────────────────

test('the pixel range holds every value the migration can produce', () => {
  // If a migrated weight fell outside the control, a saved icon would silently
  // re-open lighter or heavier than it was saved.
  for (const units of [1, 1.5, 2, 2.5, 3]) {
    const sticky = stickyStrokePx(null, String(units))
    assert.ok(sticky >= STROKE_PX.min && sticky <= STROKE_PX.max, `sticky ${units} → ${sticky}px is off the track`)
    for (const size of [12, 16, 24, 32, 48, 64, 96, 128]) {
      const px = customIconStrokePx({ stroke: units, size, svg: '<svg viewBox="0 0 24 24"/>' })
      assert.equal(px, clampStrokePx(px), `size ${size}, ${units} units → ${px}px was clamped, i.e. altered`)
    }
  }
})

test('the default is the weight the editor already rendered', () => {
  // 2 units at size 48 painted 4px before this change, and painting 4px is what
  // `default` now asks for — so the fix relabels, it does not restyle.
  assert.equal(STROKE_PX.default, 4)
  assert.equal(strokeAttrForPx({ px: STROKE_PX.default, size: 48, viewBox: 24 }), 2,
    'and the pre-paint CSS fallback --ig-stroke:2 still matches it')
  // Every snap sits on the step grid, or the slider cannot reach it by keyboard.
  for (const s of STROKE_PX.snaps) {
    assert.ok(s >= STROKE_PX.min && s <= STROKE_PX.max, `snap ${s} is off the track`)
    assert.ok(Math.abs((s - STROKE_PX.min) / STROKE_PX.step % 1) < 1e-9, `snap ${s} is off the step grid`)
  }
})

test('clamping never returns NaN, and never widens the range', () => {
  assert.equal(clampStrokePx('nonsense'), STROKE_PX.default)
  assert.equal(clampStrokePx(undefined), STROKE_PX.default)
  assert.equal(clampStrokePx(0), STROKE_PX.inputMin)
  assert.equal(clampStrokePx(1e6), STROKE_PX.inputMax)
  assert.equal(clampStrokePx(2), 2)
})

// ── The call sites ───────────────────────────────────────────────────────────
//
// The arithmetic above is only worth anything if the editor actually uses it,
// and there are exactly two places that must: the markup the user downloads,
// and the Stage they judge it by. These guard against the conversion being
// correct in a module nothing calls.

test('the exported markup and the Stage both write the CONVERTED width', () => {
  const page = src('../../src/pages/IconLibrary.jsx')

  assert.match(page, /setAttribute\('stroke-width', String\(strokeAttr\)\)/,
    'the serializer must write the converted attribute')
  assert.doesNotMatch(page, /setAttribute\('stroke-width', String\(stroke\)\)/,
    'writing the raw pixel value into stroke-width is the founder\'s bug')

  const stageLine = /setProperty\('--ig-stroke', ([^)]*)\)/.exec(page)
  assert.ok(stageLine, 'the Stage must still set --ig-stroke')
  assert.doesNotMatch(stageLine[1], /^String\(stroke\)$/,
    'the Stage resolves stroke-width in the same user units as the file, so it needs the same conversion')
  assert.match(stageLine[1], /strokeAttr/, 'and it must be the SAME converted value the export uses')

  // One conversion, called twice — a second implementation is a second bug.
  assert.equal((page.match(/strokeAttrForPx\(/g) || []).length, 2,
    'preview and export must both go through strokeAttrForPx and nothing else should')
})

test('the slider says px, because the missing unit is what made it lie', () => {
  const page = src('../../src/pages/IconLibrary.jsx')
  const row = /<SnapSlider\s+id="icust-stroke"[\s\S]*?\/>/.exec(page)?.[0] || ''
  assert.ok(row, 'the stroke slider must still exist')
  assert.match(row, /unit="px"/, 'a bare "Stroke" number is what the founder read as pixels')
  assert.match(row, /ariaLabel="Stroke width in pixels"/, 'and screen-reader users get the unit too')
})

test('a saved icon records which unit its stroke is in', () => {
  const page = src('../../src/pages/IconLibrary.jsx')
  assert.match(page, /strokeUnit: STROKE_UNIT_PX/,
    'without the stamp, every new record would be migrated again on read')
})
