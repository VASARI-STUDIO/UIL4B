// The Pro preview's words and gate names, and the draft that survives a visit to /plans.
//
// What a person relies on:
//   - a Pro viewer, or one on free settings, has no preview;
//   - Sharp, Crisp, a ends-and-corners mix, a custom size, and a style with a size each get the
//     spec's line, word for word, and the upgrade gate that names what they hit;
//   - the proof caption puts the literal value in a { code } span and nothing else;
//   - the draft keeps only plain icons and values inside their ranges, and goes stale after an hour.
//
// Every expected string is written out by hand; none is built from the module under test.
// HOW TO SEE EACH FAIL (src/utils/iconProPreview.js, src/utils/iconPreviewDraft.js):
//   proPreview ignores isPro                      -> "a Pro viewer has no preview"
//   the gate for a size alone becomes line-style  -> "the gate names what was hit"
//   the size line loses its { code } span          -> "the size line sets 40px apart as a value"
//   validatePreviewDraft stops checking the age    -> "a draft older than an hour is ignored"
//   validatePreviewDraft accepts size 2000         -> "a draft with a size outside 8 to 1024 is refused"
import test from 'node:test'
import assert from 'node:assert/strict'
import { proPreview, BACK_TO_FREE_NOTE } from '../../src/utils/iconProPreview.js'
import {
  PREVIEW_DRAFT_KEY, PREVIEW_DRAFT_MAX_AGE_MS, readPreviewDraft, validatePreviewDraft, writePreviewDraft, clearPreviewDraft,
} from '../../src/utils/iconPreviewDraft.js'

const free = (o) => proPreview({ isPro: false, size: 24, cap: 'round', join: 'round', ...o })

test('a Pro viewer has no preview, and neither has free settings', () => {
  assert.equal(proPreview({ isPro: true, size: 40, cap: 'square', join: 'miter' }), null)
  assert.equal(free({}), null)
  assert.equal(free({ size: 48 }), null)
})

test('Sharp and Crisp each get their own line and the line-style gate', () => {
  const sharp = free({ cap: 'square', join: 'miter' })
  assert.equal(sharp.text, 'Sharp is a Pro line style. Preview it here; saving and export need Pro.')
  assert.equal(sharp.gate, 'icon-line-style')
  assert.equal(free({ cap: 'butt', join: 'bevel' }).text, 'Crisp is a Pro line style. Preview it here; saving and export need Pro.')
})

test('a mix no tile draws says custom ends and corners', () => {
  const mix = free({ cap: 'square', join: 'round' })
  assert.equal(mix.text, 'Custom ends and corners are Pro. Preview them here; saving and export need Pro.')
  assert.equal(mix.gate, 'icon-line-style')
})

test('the gate names what was hit', () => {
  assert.equal(free({ size: 40 }).gate, 'icon-export-size')
  assert.equal(free({ size: 40, cap: 'square', join: 'miter' }).gate, 'icon-pro-preview')
})

test('the size line sets 40px apart as a value', () => {
  const size = free({ size: 40 })
  assert.equal(size.text, 'Custom sizes are Pro. Preview 40px here; saving and export need Pro.')
  assert.deepEqual(size.parts, ['Custom sizes are Pro. Preview ', { code: '40px' }, ' here; saving and export need Pro.'])
  assert.deepEqual(size.caption, ['Exports at ', { code: '40px' }])
})

test('a style with a size says both, and the caption joins them', () => {
  const both = free({ size: 40, cap: 'square', join: 'miter' })
  assert.equal(both.text, 'Sharp and custom sizes are Pro. Preview them here; saving and export need Pro.')
  assert.deepEqual(both.caption, ['Sharp, ', { code: '40px' }])
  assert.equal(free({ size: 40, cap: 'butt', join: 'bevel' }).text, 'Crisp and custom sizes are Pro. Preview them here; saving and export need Pro.')
})

test('leaving a preview has one fixed note', () => {
  assert.equal(BACK_TO_FREE_NOTE, 'Back to free settings. Copy, download and save are on.')
})

// ── The draft ──
const NOW = 1_700_000_000_000
const icon = { pack: 'lucide', name: 'heart' }
const settings = { size: 40, stroke: 1.5, cap: 'square', join: 'miter', rotate: 90, color: '#112233', absStroke: false, flipH: true, flipV: false }

test('a draft round-trips with the icon id rebuilt', () => {
  const back = validatePreviewDraft({ icon, settings, at: NOW }, NOW)
  assert.deepEqual(back.icon, { id: 'lucide:heart', pack: 'lucide', name: 'heart', cdn: true })
  assert.deepEqual(back.settings, settings)
})

test('a draft older than an hour is ignored', () => {
  assert.equal(validatePreviewDraft({ icon, settings, at: NOW - PREVIEW_DRAFT_MAX_AGE_MS - 1 }, NOW), null)
  assert.ok(validatePreviewDraft({ icon, settings, at: NOW - PREVIEW_DRAFT_MAX_AGE_MS + 1000 }, NOW))
})

test('a draft with a size outside 8 to 1024 is refused', () => {
  for (const size of [7, 1025, 2000, 12.5, 'x']) assert.equal(validatePreviewDraft({ icon, settings: { ...settings, size }, at: NOW }, NOW), null, String(size))
})

test('a draft with an unknown end, corner, rotation or colour is refused', () => {
  for (const patch of [{ cap: 'arrow' }, { join: 'spike' }, { rotate: 45 }, { color: 'red' }, { color: 'url(#x)' }]) {
    assert.equal(validatePreviewDraft({ icon, settings: { ...settings, ...patch }, at: NOW }, NOW), null, JSON.stringify(patch))
  }
  assert.ok(validatePreviewDraft({ icon, settings: { ...settings, color: '' }, at: NOW }, NOW), 'no colour (text colour) is allowed')
})

test('a draft with no icon is refused and nothing is written', () => {
  assert.equal(validatePreviewDraft({ icon: null, settings, at: NOW }, NOW), null)
})

test('write, read and clear go through sessionStorage under vs-icon-draft', () => {
  const mem = new Map()
  globalThis.sessionStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
  try {
    assert.equal(writePreviewDraft(null, settings, NOW), false, 'no icon, no write')
    assert.equal(mem.size, 0)
    assert.equal(writePreviewDraft(icon, settings, NOW), true)
    assert.ok(mem.has(PREVIEW_DRAFT_KEY))
    assert.equal(readPreviewDraft(NOW + 1000).icon.id, 'lucide:heart')
    assert.equal(readPreviewDraft(NOW + PREVIEW_DRAFT_MAX_AGE_MS + 5000), null)
    clearPreviewDraft()
    assert.equal(mem.size, 0)
    mem.set(PREVIEW_DRAFT_KEY, '{not json')
    assert.equal(readPreviewDraft(NOW), null, 'garbage reads as no draft')
  } finally { delete globalThis.sessionStorage }
})
