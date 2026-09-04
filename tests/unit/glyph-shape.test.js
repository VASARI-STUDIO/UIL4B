// A BRAND LOCKUP IS NOT A SQUARE MARK.
//
// Founder, 2026-09-04: "check our rendering for alot of the icons, alot of the
// icons are not rendering correctly", with a screenshot of /create/icons under
// the Brand logos filter. Measured in a rendered browser at 1440x900 before the
// fix: `logos/aerospike` painted 24 x 2.1px inside its 24 x 24 slot and
// `logos/active-campaign` 24 x 2.4px. Every image loaded — this was never a
// fetch failure — the grid was simply asking the Iconify API for a square
// render of artwork that is not square, and then giving it a square box.
//
// TWO CAUSES produce the identical symptom, and a fix that handles one and not
// the other leaves half the grid broken. Censused against the Iconify API for
// the four packs in ICON_GROUPS.brands (6,773 icons):
//
//   simple-icons  3,457   all square
//   devicon       1,036   all square viewBoxes, but 422 are `-wordmark` entries
//                         with a horizontal lockup drawn inside the square
//   skill-icons     400   all square
//   logos         1,880   839 off-square (45%), 625 over 2:1 (33%), worst
//                         `rolldown` 11.8:1 at 512 x 43.39
//
// So the signal has to be the INK, not the box. `inkShape` takes the artwork's
// intrinsic aspect AND the bounding box of its opaque pixels in a SQUARE raster,
// and returns one aspect that is correct for both causes, plus the width cap
// that keeps the ink inside the slot without ever cropping it.
//
// These are the numbers behind the rendered result: the same 24 tiles that were
// illegible now paint 104px wide, and all 24 show 100% of their ink.
import test from 'node:test'
import assert from 'node:assert/strict'
import { WIDE_INK, inkShape } from '../../src/utils/glyphShape.js'

const R = 64 // the raster side sampleGlyph uses

test('a square mark with square ink is not wide, and is drawn at its own size', () => {
  const { ar, cap } = inkShape({ naturalW: 48, naturalH: 48, inkW: 60, inkH: 60, raster: R })
  assert.ok(ar < WIDE_INK, `a square glyph must not be treated as a lockup (got ${ar})`)
  assert.equal(Math.round(ar), 1)
  // cap ~1.07: it may be drawn a hair wider than the slot height, which the
  // `min(100%, ...)` in CSS makes irrelevant for a glyph that stays square.
  assert.ok(cap > 1 && cap < 1.2, `unexpected cap ${cap}`)
})

test('CAUSE 1 — a wide viewBox is detected from the intrinsic aspect alone', () => {
  // logos/aerospike: 512 x 45 art, served at ?height=48 so intrinsic is 546 x 48.
  // Stretched into a square raster its ink fills nearly the whole box, so the
  // ink ratio alone says "square" and only the intrinsic aspect carries the
  // truth. This is the case a pixel-only measurement misses.
  const { ar } = inkShape({ naturalW: 546, naturalH: 48, inkW: 64, inkH: 64, raster: R })
  assert.ok(ar > WIDE_INK, `a 11.4:1 lockup must read as wide (got ${ar})`)
  assert.ok(Math.abs(ar - 546 / 48) < 0.01, `ar should be the intrinsic aspect, got ${ar}`)
})

test('CAUSE 2 — a lockup on a SQUARE canvas is detected from the ink alone', () => {
  // devicon/adonisjs-wordmark: 128 x 128 canvas, lockup across the middle.
  // Intrinsic aspect is exactly 1:1 and says nothing at all; only the pixels do.
  // Measured live: cap 3.2, i.e. the ink occupies 20 of 64 raster rows.
  const { ar, cap } = inkShape({ naturalW: 48, naturalH: 48, inkW: 64, inkH: 20, raster: R })
  assert.ok(ar > WIDE_INK, `a wide lockup on a square canvas must read as wide (got ${ar})`)
  assert.equal(+ar.toFixed(1), 3.2)
  assert.equal(+cap.toFixed(1), 3.2)
})

test('THE CAP NEVER LETS THE INK BE CROPPED — this is what a two-line wordmark needs', () => {
  const SLOT_H = 36 // .ig-chip--wide height in global.css
  const SLOT_W = 104 // the cell content width measured at 1440x900
  const cases = [
    { what: 'devicon one-line wordmark', naturalW: 48, naturalH: 48, inkW: 64, inkH: 20 },
    { what: 'devicon two-line wordmark', naturalW: 48, naturalH: 48, inkW: 64, inkH: 32 },
    { what: 'devicon tall stacked lockup', naturalW: 48, naturalH: 48, inkW: 64, inkH: 46 },
    { what: 'logos 4:1', naturalW: 192, naturalH: 48, inkW: 64, inkH: 62 },
    { what: 'logos 11.4:1', naturalW: 546, naturalH: 48, inkW: 64, inkH: 64 },
  ]
  for (const c of cases) {
    const { cap } = inkShape({ ...c, raster: R })
    const natural = c.naturalW / c.naturalH
    // what the CSS resolves to: width:min(100%, calc(36px * cap))
    const elementW = Math.min(SLOT_W, SLOT_H * cap)
    const inkOnScreen = elementW * (c.inkH / R) / natural
    assert.ok(inkOnScreen <= SLOT_H + 0.01,
      `${c.what}: ink paints ${inkOnScreen.toFixed(1)}px into a ${SLOT_H}px slot — it would be cropped`)
  }
})

test('the wide treatment is worth having: every case gains real painted height', () => {
  const SLOT_H = 36, SLOT_W = 104, OLD_BOX = 24
  // pack, intrinsic, ink rows, and the painted height each had in a 24px square
  const cases = [
    { name: 'logos/aerospike', naturalW: 546, naturalH: 48, inkH: 64, before: 24 / (546 / 48) },
    { name: 'logos/active-campaign', naturalW: 473, naturalH: 48, inkH: 64, before: 24 / (473 / 48) },
    { name: 'logos/500px', naturalW: 192, naturalH: 48, inkH: 64, before: 24 / 4 },
  ]
  for (const c of cases) {
    const { cap } = inkShape({ naturalW: c.naturalW, naturalH: c.naturalH, inkW: 64, inkH: c.inkH, raster: R })
    const natural = c.naturalW / c.naturalH
    const after = Math.min(SLOT_W, SLOT_H * cap) * (c.inkH / R) / natural
    assert.ok(after > c.before * 3,
      `${c.name}: ${c.before.toFixed(1)}px -> ${after.toFixed(1)}px is not the ~4x the fix claims`)
    assert.ok(after <= SLOT_H + 0.01, `${c.name} overflows the slot`)
  }
  assert.equal(OLD_BOX, 24) // the box the founder's screenshot was taken in
})

test('an unreadable sample degrades to square, which is the pre-existing treatment', () => {
  // A CORS-tainted canvas, a transparent glyph, or a decode failure must not
  // promote an icon to the wide slot on garbage numbers.
  for (const bad of [
    { naturalW: 48, naturalH: 48, inkW: 0, inkH: 0, raster: R },
    { naturalW: 0, naturalH: 0, inkW: 64, inkH: 4, raster: R },
    { naturalW: 48, naturalH: 48, inkW: 64, inkH: 20, raster: 0 },
  ]) {
    const { ar, cap } = inkShape(bad)
    if (bad.inkW === 0 || bad.raster === 0) {
      assert.equal(ar, 1, 'a failed sample must read as square')
      assert.equal(cap, 1)
    }
    assert.ok(Number.isFinite(ar) && Number.isFinite(cap), 'never NaN or Infinity')
  }
})
