// The typography hand-off slot: what a draft is allowed to carry between the
// Font Gallery, Font Pair and Type Scale, and what it must drop. These are the
// pure, DOM-free parts of utils/typeHandoff.js — the React read/consume
// lifecycle is exercised by the Playwright walk in tests/user-sim.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TYPE_HANDOFF_VERSION,
  buildPairDraft,
  buildScaleDraft,
  consumePairDraft,
  consumeScaleDraft,
  readPairDraft,
  readScaleDraft,
  resetPairDraft,
  resetScaleDraft,
  setPairDraft,
  setScaleDraft,
  validatePairDraft,
} from '../../src/utils/typeHandoff.js'

test('a draft keeps only family, weight and category', () => {
  const draft = buildPairDraft({
    heading: { family: 'Playfair Display', weight: 700, category: 'serif', plan: 'pro', id: 'x' },
    body: { family: 'Inter', weight: 400, category: 'sans-serif' },
  })
  assert.deepEqual(draft, {
    version: TYPE_HANDOFF_VERSION,
    heading: { family: 'Playfair Display', weight: 700, category: 'serif' },
    body: { family: 'Inter', weight: 400, category: 'sans-serif' },
  })
})

test('one role is enough; the other is simply absent', () => {
  const draft = buildPairDraft({ heading: { family: 'Inter', weight: 700, category: 'sans-serif' } })
  assert.equal(draft.heading.family, 'Inter')
  assert.equal(draft.body, undefined)
})

test('a draft with no usable role is rejected outright', () => {
  assert.equal(buildPairDraft({}), null)
  assert.equal(buildPairDraft({ heading: null, body: null }), null)
  assert.equal(buildPairDraft({ heading: { family: '' } }), null)
  assert.equal(validatePairDraft(null), null)
  assert.equal(validatePairDraft('Inter'), null)
})

test('a family name that could change the meaning of a CSS declaration is dropped', () => {
  assert.equal(buildPairDraft({ heading: { family: "Inter', monospace; color:red; --x:'" } }), null)
  assert.equal(buildPairDraft({ heading: { family: '<script>' } }), null)
  assert.equal(buildPairDraft({ heading: { family: 'A'.repeat(200) } }), null)
})

test('weights are snapped into the 100–900 range rather than trusted', () => {
  const wild = buildPairDraft({ heading: { family: 'Inter', weight: 1e9, category: 'sans-serif' } })
  assert.equal(wild.heading.weight, 900)
  const tiny = buildPairDraft({ heading: { family: 'Inter', weight: -40, category: 'sans-serif' } })
  assert.equal(tiny.heading.weight, 100)
  const odd = buildPairDraft({ heading: { family: 'Inter', weight: 437, category: 'sans-serif' } })
  assert.equal(odd.heading.weight, 400)
  const missing = buildPairDraft({ heading: { family: 'Inter', category: 'sans-serif' } })
  assert.equal(missing.heading.weight, 400)
})

test('an unknown category falls back to sans-serif rather than a bad generic', () => {
  const draft = buildPairDraft({ heading: { family: 'Inter', weight: 400, category: 'blackletter' } })
  assert.equal(draft.heading.category, 'sans-serif')
})

test('a scale rides along only when both numbers are usable, and is clamped', () => {
  const ok = buildPairDraft({ heading: { family: 'Inter' }, scale: { base: 18, ratio: 1.25 } })
  assert.deepEqual(ok.scale, { base: 18, ratio: 1.25 })

  const half = buildPairDraft({ heading: { family: 'Inter' }, scale: { base: 18 } })
  assert.equal(half.scale, undefined)

  const clamped = buildPairDraft({ heading: { family: 'Inter' }, scale: { base: 900, ratio: 99 } })
  assert.deepEqual(clamped.scale, { base: 40, ratio: 3 })
})

test('a complete scale can travel alone and is consumed exactly once', () => {
  resetScaleDraft()
  assert.equal(buildScaleDraft({ scale: { base: 19 } }), null)
  assert.equal(buildScaleDraft({ scale: { ratio: 1.333 } }), null)
  assert.deepEqual(buildScaleDraft({ scale: { base: 19, ratio: 1.333 } }), {
    version: TYPE_HANDOFF_VERSION,
    scale: { base: 19, ratio: 1.333 },
  })
  assert.equal(setScaleDraft({ scale: { base: 19, ratio: 1.333 } }), true)
  assert.deepEqual(readScaleDraft().scale, { base: 19, ratio: 1.333 })
  consumeScaleDraft()
  assert.equal(readScaleDraft(), null)
})

test('a draft from a different version is never delivered', () => {
  assert.equal(validatePairDraft({ version: 999, heading: { family: 'Inter' } }), null)
})

test('the slot is read-many, consume-once', () => {
  resetPairDraft()
  assert.equal(readPairDraft(), null)

  assert.equal(setPairDraft({ heading: { family: 'Lora', weight: 700, category: 'serif' } }), true)
  // Reading during render must be repeatable — React may discard a render.
  assert.equal(readPairDraft().heading.family, 'Lora')
  assert.equal(readPairDraft().heading.family, 'Lora')

  consumePairDraft()
  assert.equal(readPairDraft(), null)
})

test('staging an unusable draft reports false and leaves nothing behind', () => {
  resetPairDraft()
  assert.equal(setPairDraft({ heading: { family: '' } }), false)
  assert.equal(readPairDraft(), null)
})
