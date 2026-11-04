// The Pro preview's words and gate names, and the draft that survives a visit to /plans.
//
// What a person relies on:
//   - a Pro viewer, or one on free settings, has no preview;
//   - Sharp, Crisp, a ends-and-corners mix, a custom size, and a style with a size each get the
//     spec's line, word for word, and the upgrade gate that names what they hit;
//   - the proof caption puts the literal value in a { code } span and nothing else;
//   - the live region's text never names the size, so an arrow key does not have it read again;
//   - the draft keeps only plain icons and values inside their ranges, and goes stale after an hour;
//   - the draft comes back only after the viewer has left for /plans (a stamp), never on a reload.
//
// Every expected string is written out by hand; none is built from the module under test.
// HOW TO SEE EACH FAIL (src/utils/iconProPreview.js, src/utils/iconPreviewDraft.js):
//   proPreview ignores isPro                      -> "a Pro viewer has no preview"
//   the gate for a size alone becomes line-style  -> "the gate names what was hit"
//   the size line loses its { code } span          -> "the size line sets 40px apart as a value"
//   validatePreviewDraft stops checking the age    -> "a draft older than an hour is ignored"
//   validatePreviewDraft accepts size 2000         -> "a draft with a size outside 8 to 1024 is refused"
//   the size goes back into the preview line       -> "the preview line never names the size"
//   readPreviewDraft stops requiring the stamp     -> "a draft nobody left with is dropped, not restored"
//   stampPreviewDraft stops writing leftAt         -> "stamping on the way to /plans makes the draft restorable"
//   readPreviewDraft stops removing old drafts     -> "an expired draft is removed, not just ignored"
//   ProUpgradeModal stops calling onLeave          -> "the upgrade popup stamps the draft before it navigates"
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { proPreview, BACK_TO_FREE_NOTE } from '../../src/utils/iconProPreview.js'
import {
  PREVIEW_DRAFT_KEY, PREVIEW_DRAFT_MAX_AGE_MS, readPreviewDraft, stampPreviewDraft, validatePreviewDraft, writePreviewDraft,
  clearPreviewDraft,
} from '../../src/utils/iconPreviewDraft.js'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

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

test('the size line is the same words at every size, and the caption sets the size apart as a value', () => {
  const size = free({ size: 40 })
  assert.equal(size.text, 'Custom sizes are Pro. Preview them here; saving and export need Pro.')
  assert.deepEqual(size.parts, ['Custom sizes are Pro. Preview them here; saving and export need Pro.'])
  assert.deepEqual(size.caption, ['Exports at ', { code: '40px' }])
})

test('the preview line never names the size, so an arrow key does not change what a live region reads', () => {
  // The line is read out by a live region; text that changes on every step of the size slider would be
  // read again on every step. Any size, with or without a line style, must give the same words.
  const sizeWords = new Set()
  const bothWords = new Set()
  for (const size of [8, 9, 40, 41, 100, 1024]) {
    const a = free({ size })
    const b = free({ size, cap: 'square', join: 'miter' })
    sizeWords.add(a.text)
    bothWords.add(b.text)
    assert.doesNotMatch(a.text, /\d/, `size ${size}`)
    assert.doesNotMatch(b.text, /\d/, `size ${size} with Sharp`)
  }
  assert.equal(sizeWords.size, 1)
  assert.equal(bothWords.size, 1)
})

test('a style with a size says the exact both sentence, and the caption joins them', () => {
  const both = free({ size: 40, cap: 'square', join: 'miter' })
  assert.equal(both.text, 'Custom ends, corners and sizes are Pro. Preview them here; saving and export need Pro.')
  assert.deepEqual(both.caption, ['Sharp, ', { code: '40px' }])
  const crisp = free({ size: 40, cap: 'butt', join: 'bevel' })
  assert.equal(crisp.text, both.text)
  assert.deepEqual(crisp.caption, ['Crisp, ', { code: '40px' }])
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

// A stand-in sessionStorage for the draft's own read, write and stamp.
function withStorage(run) {
  const mem = new Map()
  globalThis.sessionStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
  try { run(mem) } finally { delete globalThis.sessionStorage }
}

test('a draft nobody left with is dropped, not restored', () => {
  // The draft is written when the upgrade popup opens. A reload or a typed address finds it with no
  // stamp: it must not reopen the popup, and the slot is emptied.
  withStorage((mem) => {
    assert.equal(writePreviewDraft(icon, settings, NOW), true)
    assert.equal(readPreviewDraft(NOW + 1000), null)
    assert.equal(mem.size, 0, 'the unstamped draft was left in the slot')
  })
})

test('stamping on the way to /plans makes the draft restorable', () => {
  withStorage((mem) => {
    assert.equal(stampPreviewDraft(NOW), false, 'nothing to stamp')
    writePreviewDraft(icon, settings, NOW)
    assert.equal(stampPreviewDraft(NOW + 2000), true)
    assert.equal(JSON.parse(mem.get(PREVIEW_DRAFT_KEY)).leftAt, NOW + 2000)
    const back = readPreviewDraft(NOW + 60_000)
    assert.equal(back.icon.id, 'lucide:heart')
    assert.deepEqual(back.settings, settings)
    assert.ok(mem.has(PREVIEW_DRAFT_KEY), 'reading must not consume it: the page and the popup both read')
  })
})

test('an expired draft is removed, not just ignored', () => {
  withStorage((mem) => {
    writePreviewDraft(icon, settings, NOW)
    stampPreviewDraft(NOW + 1000)
    // Just inside an hour of the write (and of the stamp): kept. Just outside both: dropped and removed.
    // This cannot tell "an hour from the write" from "an hour from the stamp"; the next test can.
    assert.ok(readPreviewDraft(NOW + PREVIEW_DRAFT_MAX_AGE_MS))
    assert.equal(readPreviewDraft(NOW + 1000 + PREVIEW_DRAFT_MAX_AGE_MS + 1000), null)
    assert.equal(mem.size, 0, 'the expired draft was left in the slot')
  })
})

// The hour runs from the stamp (the moment the viewer left), not from the write.
test('a draft stamped late is kept for an hour from the stamp, not from the write', () => {
  withStorage(() => {
    writePreviewDraft(icon, settings, NOW)
    stampPreviewDraft(NOW + 50 * 60_000)
    assert.ok(readPreviewDraft(NOW + 70 * 60_000), 'written 70 min ago, left with 20 min ago')
  })
})

test('a stamp must be a real moment between the write and now', () => {
  for (const leftAt of [NOW - 1, 'x', NOW + 60_000, null]) {
    assert.equal(validatePreviewDraft({ icon, settings, at: NOW, leftAt }, NOW + 1000), null, String(leftAt))
  }
})

test('the upgrade popup stamps the draft before it navigates to /plans, and the library asks it to', () => {
  const modal = read('src/components/ProUpgradeModal.jsx')
  assert.match(modal, /onClose\(\)\s*\r?\n\s*onLeave\?\.\(\)\s*\r?\n\s*navigate\(`\/plans\?plan=/, 'the checkout button')
  assert.match(modal, /seeAllPlans = \(\) => \{ onClose\(\); onLeave\?\.\(\); navigate\('\/plans'\) \}/, 'See all plans')
  assert.match(read('src/pages/IconLibrary.jsx'), /openProModal\(\{ gate: preview\.gate, proof, onLeave: \(\) => stampPreviewDraft\(\) \}\)/)
})

test('write, read and clear go through sessionStorage under vs-icon-draft', () => {
  const mem = new Map()
  globalThis.sessionStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
  try {
    assert.equal(writePreviewDraft(null, settings, NOW), false, 'no icon, no write')
    assert.equal(mem.size, 0)
    assert.equal(writePreviewDraft(icon, settings, NOW), true)
    assert.ok(mem.has(PREVIEW_DRAFT_KEY))
    stampPreviewDraft(NOW + 500)
    assert.equal(readPreviewDraft(NOW + 1000).icon.id, 'lucide:heart')
    assert.equal(readPreviewDraft(NOW + PREVIEW_DRAFT_MAX_AGE_MS + 5000), null)
    writePreviewDraft(icon, settings, NOW)
    clearPreviewDraft()
    assert.equal(mem.size, 0)
    mem.set(PREVIEW_DRAFT_KEY, '{not json')
    assert.equal(readPreviewDraft(NOW), null, 'garbage reads as no draft')
  } finally { delete globalThis.sessionStorage }
})
