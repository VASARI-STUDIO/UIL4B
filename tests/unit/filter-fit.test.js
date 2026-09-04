// THE TOOLBAR STOPS CHANGING HEIGHT WHEN THE CHIP COUNT CHANGES.
//
// Founder, 2026-09-04: "the header design changes height switching from the
// emoji to icon library. the bar is broken visually on a standard desktop."
//
// MEASURED at 1440x900 before the fix, in a rendered browser:
//
//   /create/icons   toolbar  68px   tray wants  493px   one line
//   /create/emoji   toolbar 213px   tray wants 1478px   THREE lines
//
// 145px of jump on a tab switch — and all three routes (/create/icons,
// /create/emoji, /create/icons-emoji) mount the same component, so this is one
// page moving under the user's cursor.
//
// The emoji side showed exactly the shape #318 named for 641-980px: a 1321px
// search field alone on line one, the tray wrapped to two chip rows on line two,
// and the skin-tone control orphaned hard right on line three. At 1440px, where
// #318's media query does not apply and nothing was supposed to be wrong.
//
// The band was a proxy for the real condition. `trayOverflowsRow` states the
// real one, and these tests pin the two properties that make it safe to act on:
// it must not depend on anything that collapsing changes, and it must not
// collapse a tray that fits.
import test from 'node:test'
import assert from 'node:assert/strict'
import { trayOverflowsRow } from '../../src/components/library/filterFit.js'

// From global.css: `.lbry-search{max-width:360px}` and `.lbry-toolbar-row{gap:10px}`.
const CAP = 360
const GAP = 10

// Measured on this branch at 1440x900.
const ROW_1440 = 1321
const EMOJI_TRAY = 1478 // 12 categories, each with a glyph, a label and a count
const ICON_TRAY = 493 // 7 groups, no counts
const EMOJI_ACTION = 70 // the skin-tone control
const ICON_ACTION = 111 // "Add icon"

test('THE REPORTED CASE: the emoji tray cannot fit a 1440px row, and says so', () => {
  assert.equal(trayOverflowsRow({
    intrinsic: EMOJI_TRAY, rowWidth: ROW_1440, actionWidth: EMOJI_ACTION, searchCap: CAP, gap: GAP,
  }), true)
})

test('the icon tray fits the same row and is left alone', () => {
  assert.equal(trayOverflowsRow({
    intrinsic: ICON_TRAY, rowWidth: ROW_1440, actionWidth: ICON_ACTION, searchCap: CAP, gap: GAP,
  }), false)
})

test('the emoji tray needs a viewport nobody has — which is why no breakpoint fixed it', () => {
  // It clears only when the row can hold the tray plus a capped search, the
  // action and the gaps: 1478 + 360 + 70 + 20 = 1928px of ROW, before the
  // page's own gutters. That is why widening the band was never the answer.
  const needed = EMOJI_TRAY + CAP + EMOJI_ACTION + GAP * 2
  assert.equal(needed, 1928)
  assert.equal(trayOverflowsRow({
    intrinsic: EMOJI_TRAY, rowWidth: needed - 1, actionWidth: EMOJI_ACTION, searchCap: CAP, gap: GAP,
  }), true)
  assert.equal(trayOverflowsRow({
    intrinsic: EMOJI_TRAY, rowWidth: needed, actionWidth: EMOJI_ACTION, searchCap: CAP, gap: GAP,
  }), false)
})

test('THE BUDGET USES THE SEARCH CAP, NOT A MEASURED WIDTH — this is the anti-oscillation property', () => {
  // The failure this guards: measuring the search field instead of its ceiling.
  // While the tray is wrapped onto its own line the field is the full row wide
  // (1321px measured at 1440), and a budget built from that says "nothing fits",
  // collapses, whereupon the field shrinks to 360px and the budget says "it fits
  // after all". That is a toolbar that never settles.
  //
  // The function is given a CAP, so the same answer comes back no matter what
  // state the row was in when it was asked.
  const args = { intrinsic: EMOJI_TRAY, rowWidth: ROW_1440, actionWidth: EMOJI_ACTION, gap: GAP }
  const collapsed = trayOverflowsRow({ ...args, searchCap: CAP })
  const expanded = trayOverflowsRow({ ...args, searchCap: CAP })
  assert.equal(collapsed, expanded, 'the answer must not depend on the layout that produced it')

  // And the decision is monotone in the row width: once a tray fits, every wider
  // row also fits, so widening can never re-collapse it.
  let seenFit = false
  for (let row = 400; row <= 2600; row += 25) {
    const overflows = trayOverflowsRow({ ...args, rowWidth: row, searchCap: CAP })
    if (!overflows) seenFit = true
    assert.ok(!(seenFit && overflows), `not monotone: row ${row} re-collapsed a tray that had fitted`)
  }
  assert.ok(seenFit, 'the sweep never reached a width where the tray fits')
})

test('an unmeasured tray never collapses — first paint must not hide every filter', () => {
  for (const intrinsic of [0, -1, undefined, NaN]) {
    assert.equal(trayOverflowsRow({
      intrinsic, rowWidth: ROW_1440, actionWidth: 0, searchCap: CAP, gap: GAP,
    }), false, `intrinsic ${intrinsic} must not be read as an overflow`)
  }
  // A row that has not been laid out yet is the same situation.
  assert.equal(trayOverflowsRow({
    intrinsic: EMOJI_TRAY, rowWidth: 0, actionWidth: 0, searchCap: CAP, gap: GAP,
  }), false)
})

test('a surface with no action gets that width back', () => {
  // The Palette Library passes no action. The budget must not reserve room for
  // a control that is not there.
  const tray = ROW_1440 - CAP - GAP * 2 - 40
  assert.equal(trayOverflowsRow({
    intrinsic: tray, rowWidth: ROW_1440, actionWidth: 0, searchCap: CAP, gap: GAP,
  }), false)
  assert.equal(trayOverflowsRow({
    intrinsic: tray, rowWidth: ROW_1440, actionWidth: 111, searchCap: CAP, gap: GAP,
  }), true, 'the same tray must collapse once an action takes part of the row')
})
