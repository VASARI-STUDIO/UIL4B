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
  BOARD_HANDOFF_MAX, BOARD_HANDOFF_MIN, COLOR_HANDOFF_VERSION,
  buildBoardDraft, consumeBoardDraft, readBoardDraft, resetBoardDraft, setBoardDraft,
  validateBoardDraft,
} from '../../src/utils/colorHandoff.js'

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
