// The Palette Builder action rail's collapse rule.
//
// Founder, 2026-09-05, two screenshots: the desktop toolbar "reads as
// unresolved rather than designed", and at 662px "the row overflows … with the
// row clipped mid-control".
//
// The rule itself is one comparison, and it is the same shape `filterFit.js`
// landed on for the icon and emoji library: measure the intrinsic width, build
// a budget out of things that cannot move when the layout changes, compare.
// What is worth testing here is not arithmetic but the ANTI-OSCILLATION
// property — that neither side of the comparison is a quantity the collapse
// itself would change — and the real measurements the rule has to classify.
import test from 'node:test'
import assert from 'node:assert/strict'
import { LEAD_CAP, RIBBON_QUERY, TOOLBAR_GAP, railOverflowsToolbar } from '../../src/utils/toolbarFit.js'

// Measured in a rendered browser at each width, before the change.
// `intrinsic` is `.plb-toolbar-group.rail-overflow`'s scrollWidth; it differs
// between the two bands because below 961px the rail's buttons carry visible
// labels and the same controls measure 964 instead of 712.
const MEASURED = [
  { w: 1920, intrinsic: 712, collapse: false, why: 'one row, 57px, nothing hidden' },
  { w: 1440, intrinsic: 712, collapse: false, why: 'the reference desktop, already correct' },
  { w: 1180, intrinsic: 712, collapse: false, why: 'pinned by 23-responsive-mid-band: nothing scrolls' },
  { w: 1080, intrinsic: 712, collapse: true, why: 'the rail FITS and the toolbar still wrapped to 105px' },
  { w: 1000, intrinsic: 712, collapse: true, why: 'same two-row wrap' },
  { w: 981, intrinsic: 712, collapse: true, why: 'same two-row wrap' },
  { w: 768, intrinsic: 964, collapse: true, why: 'two rows AND the rail clipped 3 controls' },
  { w: 662, intrinsic: 964, collapse: true, why: "the founder's own capture" },
  { w: 390, intrinsic: 964, collapse: true, why: 'the rail clipped 6 of 11' },
]

test('the rule classifies every measured width the way the browser did', () => {
  for (const m of MEASURED) {
    assert.equal(
      railOverflowsToolbar({ intrinsic: m.intrinsic, rowWidth: m.w }),
      m.collapse,
      `${m.w}px (intrinsic ${m.intrinsic}) — ${m.why}`,
    )
  }
})

test('THE BAND NOBODY REPORTED: 981–1080 collapses, 1180 does not', () => {
  // The fault the founder called "unresolved" on desktop is partly this: at
  // 981–1080 the rail has ZERO overflow and the toolbar still wraps to two
  // rows, 105px tall, because lead + rail + gap exceeds the row. A rule built
  // from the rail's own overflow would have missed it entirely; this one is
  // built from whether the rail fits BESIDE the lead group, which is the
  // question the layout actually asks.
  assert.equal(railOverflowsToolbar({ intrinsic: 712, rowWidth: 1080 }), true)
  assert.equal(railOverflowsToolbar({ intrinsic: 712, rowWidth: 1180 }), false)
  // The exact crossing, so a later change to LEAD_CAP or the gap cannot move
  // it silently: it must sit between the two widths above.
  const edge = 712 + LEAD_CAP + TOOLBAR_GAP
  assert.ok(edge > 1080 && edge <= 1180, `the crossing landed at ${edge}px`)
})

test('an unmeasured rail is not an overflowing one', () => {
  // Reporting true here would collapse the cluster on first paint, before
  // anything had been measured — a flash of the wrong toolbar on every load.
  assert.equal(railOverflowsToolbar({ intrinsic: 0, rowWidth: 1440 }), false)
  assert.equal(railOverflowsToolbar({ intrinsic: 964, rowWidth: 0 }), false)
  assert.equal(railOverflowsToolbar({ intrinsic: NaN, rowWidth: 1440 }), false)
})

test('ANTI-OSCILLATION: the budget uses no quantity the collapse can move', () => {
  // The lead group and the rail both change width when the cluster collapses;
  // the toolbar's width and a stated ceiling do not. So the same row width
  // must produce the same answer whatever the rail currently measures — which
  // is only true because the caller passes a CACHED intrinsic rather than a
  // live one. Here that is the contract being asserted: the function has no
  // input that a collapse could feed back into.
  const args = railOverflowsToolbar.length
  assert.equal(args, 1, 'one options object, so every input is named and reviewable')
  // The ceiling is a constant, not a measurement, and it is the lead group's
  // full content width (measured 359px and unchanging from 769px up).
  assert.equal(LEAD_CAP, 359)
  assert.equal(TOOLBAR_GAP, 18)
  // Collapsing shrinks the intrinsic; feeding the SHRUNKEN value back in is
  // exactly the loop this design forbids, and it would flip the answer. The
  // test states the flip so the reason for caching is on the record.
  assert.equal(railOverflowsToolbar({ intrinsic: 964, rowWidth: 662 }), true)
  assert.equal(railOverflowsToolbar({ intrinsic: 260, rowWidth: 662 }), false)
})

test('the exempt band is stated as a query, and is the shipped ribbon band', () => {
  // 769–960 is a shipped, argued, twice-tested decision (the swipeable ribbon
  // with the irreversible controls promoted ahead of the fade). The founder's
  // report does not touch it. If this query ever drifts, the two specs that
  // pin the ribbon should be read before it is changed.
  assert.equal(RIBBON_QUERY, '(min-width:769px) and (max-width:960px)')
})
