// The homepage mini-builder → Palette Builder hand-off.
//
// REGRESSION GUARD: "Continue in Palette Builder" was a bare <Link>. It carried
// nothing, so the board opened on its own default colour system — 'analogous',
// which is a PAID system. A signed-out visitor was dropped straight off the
// homepage into a system they cannot use. The hand-off now states the system
// explicitly, and carries the swatches the visitor generated.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BOARD_HANDOFF_MAX, BOARD_HANDOFF_MIN, BOARD_HANDOFF_TTL_MS, COLOR_HANDOFF_VERSION,
  boardDraftAge, buildBoardDraft, consumeBoardDraft, readBoardDraft, resetBoardDraft,
  setBoardDraft, validateBoardDraft,
} from '../../src/utils/colorHandoff.js'
import { createHandoffSlot, navigatesThisTab } from '../../src/utils/handoffSlot.js'

const HOME_SWATCHES = ['#1E788F', '#267CC9', '#5881DA', '#868CEE', '#CBC6F1']

test.beforeEach(() => resetBoardDraft())

test('THE FIX: the hand-off names the system, and it is the free one', () => {
  assert.equal(setBoardDraft(HOME_SWATCHES, 'auto'), true)
  const draft = readBoardDraft()
  assert.equal(draft.system, 'auto')
  assert.deepEqual(draft.colors, HOME_SWATCHES)
})

test('the swatches carry over exactly, normalised and in order', () => {
  assert.equal(setBoardDraft(['#1e788f', '267cc9', '#58f'], 'auto'), true)
  assert.deepEqual(readBoardDraft().colors, ['#1E788F', '#267CC9', '#5588FF'])
})

test('a draft with no system is refused — the system is the point of it', () => {
  assert.equal(setBoardDraft(HOME_SWATCHES, undefined), false)
  assert.equal(setBoardDraft(HOME_SWATCHES, ''), false)
  assert.equal(setBoardDraft(HOME_SWATCHES, 42), false)
  assert.equal(readBoardDraft(), null)
})

test('a system id that is not an id is refused', () => {
  for (const bad of ['Auto', 'auto system', '../auto', '<script>', 'a'.repeat(64)]) {
    assert.equal(setBoardDraft(HOME_SWATCHES, bad), false, `${bad} should be refused`)
  }
})

test('the system id is carried opaquely — the destination owns the catalogue', () => {
  // colorHandoff deliberately does not know HARMONIES. A well-formed but
  // unknown id survives staging; PaletteBuilder checks it against its own list
  // and falls back rather than rendering a board with no system.
  assert.equal(setBoardDraft(HOME_SWATCHES, 'not-a-real-system'), true)
  assert.equal(readBoardDraft().system, 'not-a-real-system')
})

test('too few colours to build a board is refused', () => {
  assert.equal(setBoardDraft(['#1E788F'], 'auto'), false)
  assert.equal(setBoardDraft([], 'auto'), false)
  assert.equal(setBoardDraft(null, 'auto'), false)
  assert.equal(BOARD_HANDOFF_MIN, 2)
})

test('the board cap is enforced, and duplicates are dropped', () => {
  const many = Array.from({ length: 20 }, (_, i) => `#${String(i).padStart(2, '0')}0000`)
  assert.equal(setBoardDraft(many, 'auto'), true)
  assert.equal(readBoardDraft().colors.length, BOARD_HANDOFF_MAX)
  assert.equal(setBoardDraft(['#1E788F', '#1e788f', '#267CC9'], 'auto'), true)
  assert.deepEqual(readBoardDraft().colors, ['#1E788F', '#267CC9'])
})

test('unknown keys are dropped rather than merged through', () => {
  const draft = validateBoardDraft({
    version: COLOR_HANDOFF_VERSION,
    colors: HOME_SWATCHES,
    system: 'auto',
    plan: 'pro',
    entitlements: ['everything'],
  })
  assert.deepEqual(Object.keys(draft).sort(), ['colors', 'system', 'version'])
})

test('a draft of the wrong version never reaches the destination', () => {
  assert.equal(validateBoardDraft({ version: 99, colors: HOME_SWATCHES, system: 'auto' }), null)
  assert.equal(validateBoardDraft(null), null)
  assert.equal(validateBoardDraft('auto'), null)
})

test('the draft is consumed exactly once, so Back or a revisit finds nothing', () => {
  setBoardDraft(HOME_SWATCHES, 'auto')
  // Peeking is safe any number of times — React may render and discard.
  assert.ok(readBoardDraft())
  assert.ok(readBoardDraft())
  consumeBoardDraft()
  assert.equal(readBoardDraft(), null)
})

test('buildBoardDraft validates without staging anything', () => {
  assert.ok(buildBoardDraft(HOME_SWATCHES, 'auto'))
  assert.equal(readBoardDraft(), null, 'building must not stage')
})

/* ── THE STALE-DRAFT DEFECT (palette-opens-with-wrong-state) ───────────────
 *
 * Founder, 2026-09-05: "somtimes i open the pallete builder and it has added
 * many colours and its a different swatch". Intermittent, and this is the
 * mechanism.
 *
 * The homepage staged the draft from a `<Link onClick>`. React Router composes
 * a caller's onClick UNCONDITIONALLY and only afterwards asks its own
 * shouldProcessLinkClick whether to navigate — which for a Ctrl/Cmd/Shift/Alt
 * click, or any non-primary button, is no, because the browser is opening a new
 * tab instead. The new tab starts a fresh module instance and correctly finds
 * nothing. The ORIGINAL tab was left holding a draft nothing would ever
 * consume, and the slot had no expiry, so it waited for the life of the tab and
 * was imported by whatever visit to /create/palette came next — from the nav,
 * the mega menu, a gallery link — over the visitor's own saved board.
 *
 * Two guards, tested separately because either alone still leaves a hole:
 *  1. `navigatesThisTab` — do not stage a click that does not move this tab.
 *  2. a ttl on the slot — a hand-off means "seconds ago"; make that true even
 *     if a future stager forgets guard 1.
 */

test('GUARD 1: a click that does not move this tab must not stage a draft', () => {
  assert.equal(navigatesThisTab({ button: 0 }), true, 'a plain left click navigates')
  for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    assert.equal(navigatesThisTab({ button: 0, [key]: true }), false, `${key} opens a new tab/window`)
  }
  assert.equal(navigatesThisTab({ button: 1 }), false, 'middle click opens a new tab')
  assert.equal(navigatesThisTab({ button: 2 }), false, 'right click opens a menu')
  assert.equal(navigatesThisTab({ button: 0, defaultPrevented: true }), false, 'cancelled upstream')
  assert.equal(navigatesThisTab(null), false, 'no event, no navigation')
})

test('GUARD 1: keyboard activation and _self targets still stage', () => {
  // Enter on a focused link produces a click with no `button` — it navigates.
  assert.equal(navigatesThisTab({}), true)
  assert.equal(navigatesThisTab({ button: 0 }, '_self'), true)
  assert.equal(navigatesThisTab({ button: 0 }, '_blank'), false, 'not this tab')
  assert.equal(navigatesThisTab({ button: 0, currentTarget: { target: '_blank' } }), false)
})

test('GUARD 2: a hand-off expires, so a leaked draft cannot ambush a later visit', () => {
  let clock = 0
  const slot = createHandoffSlot({ ttlMs: BOARD_HANDOFF_TTL_MS, now: () => clock })
  slot.set({ colors: HOME_SWATCHES })
  assert.ok(slot.peek(), 'staged and read in the same instant')
  clock = BOARD_HANDOFF_TTL_MS          // the route change it has to survive
  assert.ok(slot.peek(), 'still live at exactly the ttl')
  clock = BOARD_HANDOFF_TTL_MS + 1      // the visit that used to be ambushed
  assert.equal(slot.peek(), null, 'a stale draft is gone, not delivered')
  assert.equal(slot.stagedAgo(), null)
})

test('GUARD 2: the ttl is long enough for a real route change', () => {
  // A lazy chunk on a cold cache is ~1s, so the window must clear that by an
  // order of magnitude — and stay far under the gap that made the bug
  // reportable, since the founder was opening the builder much later, by a
  // different route, in the same tab.
  assert.ok(BOARD_HANDOFF_TTL_MS >= 10_000, 'must survive a slow lazy route')
  assert.ok(BOARD_HANDOFF_TTL_MS <= 60_000, 'must not outlive the intent')
})

test('GUARD 2: the ttl is opt-in — the File-carrying slots never expire', () => {
  let clock = 0
  const slot = createHandoffSlot({ now: () => clock })
  slot.set({ file: 'x' })
  clock = 60 * 60 * 1000
  assert.deepEqual(slot.peek(), { file: 'x' }, 'no ttl asked for, none applied')
})

test('the live board slot carries the ttl, and reports a draft age for triage', () => {
  setBoardDraft(HOME_SWATCHES, 'auto')
  const age = boardDraftAge()
  assert.equal(typeof age, 'number', 'a live draft reports its age')
  assert.ok(age < BOARD_HANDOFF_TTL_MS)
  consumeBoardDraft()
  assert.equal(boardDraftAge(), null, 'a consumed draft has no age')
})

test('THE LIVE SLOT expires — not just a slot the test built itself', () => {
  // The two GUARD 2 tests above construct their own slot, so they pass whether
  // or not the REAL boardSlot was ever given a ttl — a mutation that dropped
  // `{ ttlMs }` from the module-level slot went undetected. This drives the
  // wall clock the shipped module reads, so the assertion is about the thing
  // the page actually imports.
  const realNow = Date.now
  try {
    let clock = realNow()
    Date.now = () => clock
    assert.equal(setBoardDraft(HOME_SWATCHES, 'auto'), true)
    assert.ok(readBoardDraft(), 'delivered on the route change it was staged for')
    clock += BOARD_HANDOFF_TTL_MS + 1
    assert.equal(readBoardDraft(), null, 'the leaked draft is dropped, not delivered')
  } finally {
    Date.now = realNow
  }
})
