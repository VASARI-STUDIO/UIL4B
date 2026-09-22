// The homepage → tool hand-off contracts.
//
// These two slots are the only channel between the homepage mini-workbench and
// the real tools. They must be in-memory, versioned, consumed exactly once, and
// completely bounded — a tampered or stale record can never reach a destination
// as-is, and the icon draft can never carry markup, URLs, colours or plan data.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'
import { createHandoffSlot } from '../../src/utils/handoffSlot.js'
import {
  DEFAULT_IMAGE_DRAFT,
  DRAFT_COMPRESSIONS,
  DRAFT_FORMATS,
  DRAFT_RESOLUTIONS,
  IMAGE_HANDOFF_VERSION,
  consumeImageHandoff,
  describeCompressionLimit,
  draftToConverterSettings,
  isSupportedImageFile,
  normaliseImageDraft,
  partitionImageFiles,
  readImageHandoff,
  resetImageHandoff,
  setImageHandoff,
  setPendingImages,
} from '../../src/utils/imageHandoff.js'
import {
  DEFAULT_ICON_DRAFT,
  ICON_DRAFT_NAMES,
  ICON_DRAFT_PACK,
  ICON_DRAFT_SIZES,
  ICON_DRAFT_STROKES,
  ICON_DRAFT_VERSION,
  buildIconDraft,
  consumeIconDraft,
  readIconDraft,
  resetIconDraft,
  setIconDraft,
  validateIconDraft,
} from '../../src/utils/iconHandoff.js'

// A stand-in for a browser File — the slot only ever reads `type` and `name`.
const file = (name, type = '') => ({ name, type, size: 1024 })

/* ── the slot itself ─────────────────────────────────────────────────────── */

test('a hand-off slot returns nothing before anything is staged', () => {
  const slot = createHandoffSlot()
  assert.equal(slot.peek(), null)
})

test('peeking never consumes, so a discarded render cannot lose the payload', () => {
  // React may render a component, throw the result away and render it again.
  // Every one of those reads must still see the record; only the committed
  // consumer empties the slot.
  const slot = createHandoffSlot()
  slot.set({ v: 1 })
  assert.deepEqual(slot.peek(), { v: 1 })
  assert.deepEqual(slot.peek(), { v: 1 })
  assert.deepEqual(slot.peek(), { v: 1 })
})

test('one commit consumes the record for good', () => {
  const slot = createHandoffSlot()
  slot.set({ v: 1 })
  slot.peek()
  slot.consume()
  assert.equal(slot.peek(), null, 'a remount or a second visit sees nothing')
  slot.consume()
  assert.equal(slot.peek(), null)
})

test('staging a new record replaces the previous one', () => {
  const slot = createHandoffSlot()
  slot.set({ v: 1 })
  slot.set({ v: 2 })
  assert.deepEqual(slot.peek(), { v: 2 })
  slot.clear()
  assert.equal(slot.peek(), null)
})

/* ── image output draft ──────────────────────────────────────────────────── */

test('the default image draft is 4K · WebP · Lossless', () => {
  assert.equal(DEFAULT_IMAGE_DRAFT.resolution, '4k')
  assert.equal(DEFAULT_IMAGE_DRAFT.format, 'image/webp')
  assert.equal(DEFAULT_IMAGE_DRAFT.compression, 'lossless')
  assert.equal(DEFAULT_IMAGE_DRAFT.version, IMAGE_HANDOFF_VERSION)
})

test('the draft vocabulary is exactly the options the converter can apply', () => {
  assert.deepEqual(DRAFT_RESOLUTIONS.map((r) => r.id), ['4k', '2k', 'original'])
  assert.deepEqual(DRAFT_FORMATS.map((f) => f.id), ['image/webp', 'image/png', 'image/jpeg', 'image/avif'])
  assert.deepEqual(DRAFT_COMPRESSIONS.map((c) => c.id), ['lossless', 'high', 'balanced'])
  // Only PNG genuinely stores every pixel in this converter.
  assert.deepEqual(DRAFT_FORMATS.filter((f) => f.lossless).map((f) => f.id), ['image/png'])
})

test('an unsupported or tampered draft value falls back to the default', () => {
  assert.deepEqual(normaliseImageDraft({ resolution: '8k', format: 'image/tiff', compression: 'perfect' }), {
    version: IMAGE_HANDOFF_VERSION,
    resolution: '4k',
    format: 'image/webp',
    compression: 'lossless',
  })
  assert.deepEqual(normaliseImageDraft(null), { ...DEFAULT_IMAGE_DRAFT })
  assert.deepEqual(normaliseImageDraft('image/png'), { ...DEFAULT_IMAGE_DRAFT })
})

test('unknown draft keys are ignored rather than merged through', () => {
  const dirty = normaliseImageDraft({
    resolution: '2k',
    plan: 'pro',
    filename: 'secret-brief.png',
    onload: 'alert(1)',
  })
  assert.deepEqual(Object.keys(dirty).sort(), ['compression', 'format', 'resolution', 'version'])
  assert.equal(dirty.resolution, '2k')
})

test('a draft maps onto real converter settings', () => {
  assert.deepEqual(draftToConverterSettings({ resolution: '4k', format: 'image/webp', compression: 'lossless' }), {
    format: 'image/webp', maxDim: 3840, quality: 100,
  })
  assert.deepEqual(draftToConverterSettings({ resolution: 'original', format: 'image/png', compression: 'balanced' }), {
    format: 'image/png', maxDim: 0, quality: 75,
  })
})

test('lossless is only claimed where the converter can deliver it', () => {
  assert.equal(describeCompressionLimit('image/png', 'lossless'), null)
  assert.equal(describeCompressionLimit('image/webp', 'high'), null)
  const limit = describeCompressionLimit('image/webp', 'lossless')
  assert.ok(limit && limit.includes('WebP'), 'WebP + Lossless explains the limit before hand-off')
  assert.ok(describeCompressionLimit('image/jpeg', 'lossless'))
  assert.ok(describeCompressionLimit('image/avif', 'lossless'))
})

/* ── image file acceptance ───────────────────────────────────────────────── */

test('image acceptance matches the converter, by MIME type or extension', () => {
  assert.equal(isSupportedImageFile(file('shot.png', 'image/png')), true)
  assert.equal(isSupportedImageFile(file('logo.svg', '')), true, 'extension is enough when the OS gives no type')
  assert.equal(isSupportedImageFile(file('scan.HEIC', '')), false)
  assert.equal(isSupportedImageFile(file('brief.pdf', 'application/pdf')), false)
  assert.equal(isSupportedImageFile(null), false)
})

test('a mixed selection is split into accepted images and the rest', () => {
  const { accepted, rejected } = partitionImageFiles([
    file('a.png', 'image/png'), file('notes.txt', 'text/plain'), file('b.webp', 'image/webp'),
  ])
  assert.deepEqual(accepted.map((f) => f.name), ['a.png', 'b.webp'])
  assert.deepEqual(rejected.map((f) => f.name), ['notes.txt'])
})

/* ── image hand-off ──────────────────────────────────────────────────────── */

test('accepted files and the draft transfer once, then the slot is empty', () => {
  resetImageHandoff()
  assert.equal(setImageHandoff([file('a.png', 'image/png'), file('b.jpg', 'image/jpeg')], { resolution: '2k' }), true)
  const taken = readImageHandoff()
  assert.deepEqual(taken.files.map((f) => f.name), ['a.png', 'b.jpg'])
  assert.equal(taken.draft.resolution, '2k')
  assert.equal(taken.draft.format, 'image/webp')
  // Reading again before the commit is harmless — the destination may render
  // more than once before it mounts.
  assert.deepEqual(readImageHandoff().files.map((f) => f.name), ['a.png', 'b.jpg'])
  consumeImageHandoff()
  assert.equal(readImageHandoff(), null, 'a revisit or remount cannot import it again')
})

test('a selection with no accepted image stages nothing', () => {
  resetImageHandoff()
  assert.equal(setImageHandoff([file('brief.pdf', 'application/pdf')], null), false)
  assert.equal(readImageHandoff(), null)
})

test('the dashboard quick-upload path still hands off files with no draft', () => {
  resetImageHandoff()
  setPendingImages([file('a.png', 'image/png')])
  const taken = readImageHandoff()
  assert.equal(taken.files.length, 1)
  assert.equal(taken.draft, null)
  resetImageHandoff()
})

/* ── icon draft ──────────────────────────────────────────────────────────── */

test('the icon draft allowlist is bounded and single-pack', () => {
  assert.equal(ICON_DRAFT_PACK, 'lucide')
  assert.equal(ICON_DRAFT_NAMES.length, 12)
  assert.deepEqual(ICON_DRAFT_SIZES, [24, 32, 48])
  assert.deepEqual(ICON_DRAFT_STROKES, [1, 1.5, 2, 2.5])
  assert.equal(validateIconDraft(DEFAULT_ICON_DRAFT)?.name, DEFAULT_ICON_DRAFT.name)
})

test('every allowlisted icon builds a valid draft', () => {
  for (const name of ICON_DRAFT_NAMES) {
    for (const size of ICON_DRAFT_SIZES) {
      for (const stroke of ICON_DRAFT_STROKES) {
        assert.deepEqual(buildIconDraft({ name, size, stroke }), {
          version: ICON_DRAFT_VERSION, pack: ICON_DRAFT_PACK, name, size, stroke,
        })
      }
    }
  }
})

test('anything outside the allowlist is rejected outright', () => {
  assert.equal(buildIconDraft({ name: 'not-a-real-icon', size: 48, stroke: 1.5 }), null)
  assert.equal(buildIconDraft({ name: 'heart', size: 512, stroke: 1.5 }), null, 'off-list size')
  assert.equal(buildIconDraft({ name: 'heart', size: 48, stroke: 9 }), null, 'off-list stroke')
  assert.equal(validateIconDraft({ ...DEFAULT_ICON_DRAFT, pack: 'mdi' }), null, 'off-list pack')
  assert.equal(validateIconDraft({ ...DEFAULT_ICON_DRAFT, version: 99 }), null, 'stale version')
  assert.equal(validateIconDraft(null), null)
  assert.equal(validateIconDraft('heart'), null)
})

test('the icon draft cannot smuggle markup, URLs, colours or plan state', () => {
  const draft = validateIconDraft({
    version: ICON_DRAFT_VERSION,
    pack: ICON_DRAFT_PACK,
    name: 'heart',
    size: 48,
    stroke: 1.5,
    svg: '<svg onload="alert(1)"><script>x</script></svg>',
    src: 'https://evil.example/icon.svg',
    color: '#ff0000',
    isPro: true,
    plan: 'pro',
    quota: Infinity,
  })
  assert.deepEqual(Object.keys(draft).sort(), ['name', 'pack', 'size', 'stroke', 'version'])
  assert.equal(draft.svg, undefined)
  assert.equal(draft.isPro, undefined)
})

test('the icon draft transfers once and is re-validated on the way out', () => {
  resetIconDraft()
  assert.equal(setIconDraft(buildIconDraft({ name: 'zap', size: 32, stroke: 2 })), true)
  assert.deepEqual(readIconDraft(), {
    version: ICON_DRAFT_VERSION, pack: ICON_DRAFT_PACK, name: 'zap', size: 32, stroke: 2,
  })
  consumeIconDraft()
  assert.equal(readIconDraft(), null, 'a reloaded or direct editor route falls back to normal state')
})

test('an invalid draft is never staged', () => {
  resetIconDraft()
  assert.equal(setIconDraft({ version: 1, pack: 'lucide', name: '<script>', size: 48, stroke: 1.5 }), false)
  assert.equal(readIconDraft(), null)
})

/* ── The hand-off's PLACE in the panel, not just its payload ─────────────
 *
 * Everything above asserts what the hand-off CARRIES. This asserts where it
 * SITS, because #341 put it in a position where the payload was perfect and
 * the button could not be clicked: `position:sticky;bottom:0` as the last
 * child of `.hw-controls`, the one zone in the panel that scrolls. A sticky
 * element inside its own scroller permanently covers the bottom N px of that
 * scroller, so any control that lands there is painted over at every scroll
 * position but the last.
 *
 * tests/user-sim/49-workbench-handoff-clearance.spec.js measures the rendered
 * geometry. This is the cheap half: it reads the JSX and fails the BUILD, in
 * milliseconds, if the foot is ever nested back inside the scroller — which is
 * the single structural fact the whole defect class depends on.
 */
// ONE TEST IS DELETED HERE: "the hand-off is a sibling of the scrolling control
// zone, never a child of it". It read src/components/HomeWorkbench.jsx, which
// was deleted on 2026-09-18 with src/pages/Home.jsx when Spectrum became `/`.
//
// The SLOTS are not deleted and neither is the rest of this file: the hand-off
// records are still written by the tools and still consumed by
// PaletteBuilder.jsx and IconLibrary.jsx, so every contract about their shape,
// versioning, single consumption and bounds still has both ends. What went is
// the one assertion about where a button sat inside a component that no longer
// exists.
