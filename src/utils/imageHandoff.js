// In-memory hand-off from a homepage/dashboard image picker into File Converter.
//
// `File` objects stay alive across the SPA route change (no page reload), so a
// module slot is all we need — and all we may use. Filenames, file bytes and
// image content must never enter the URL, localStorage, sessionStorage or
// analytics, so nothing here persists and nothing here is serialised.
//
// The record is versioned and consumed atomically exactly once. A direct visit
// or a reload of /file-converter finds an empty slot and shows its normal
// choose/drop state.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { createHandoffSlot } from './handoffSlot.js'

export const IMAGE_HANDOFF_VERSION = 1

// ── Output-draft vocabulary ─────────────────────────────────────────────────
// Every option below maps onto a setting the real File Converter can actually
// apply, so a draft never promises something the destination has to silently
// drop. `maxDim` is the converter's "Max Dimension" (longest edge, downscale
// only — it never upscales), `quality` its canvas encode quality.

export const DRAFT_RESOLUTIONS = [
  { id: '4k', label: '4K', detail: 'Longest edge 3840 px', maxDim: 3840 },
  { id: '2k', label: '2K', detail: 'Longest edge 1920 px', maxDim: 1920 },
  { id: 'original', label: 'Original', detail: 'Keep the source size', maxDim: 0 },
]

// The image formats File Converter already offers, in the order the homepage
// presents them. `lossless: true` means the encoder genuinely stores every
// pixel; the others are quality-based in this converter and must say so.
export const DRAFT_FORMATS = [
  { id: 'image/webp', label: 'WebP', lossless: false },
  { id: 'image/png', label: 'PNG', lossless: true },
  { id: 'image/jpeg', label: 'JPEG', lossless: false },
  { id: 'image/avif', label: 'AVIF', lossless: false },
]

export const DRAFT_COMPRESSIONS = [
  { id: 'lossless', label: 'Lossless', quality: 100 },
  { id: 'high', label: 'High quality', quality: 90 },
  { id: 'balanced', label: 'Balanced', quality: 75 },
]

export const DEFAULT_IMAGE_DRAFT = Object.freeze({
  version: IMAGE_HANDOFF_VERSION,
  resolution: '4k',
  format: 'image/webp',
  compression: 'lossless',
})

const has = (list, id) => list.some((item) => item.id === id)

/**
 * Build a trusted draft from untrusted input. Unknown keys are ignored and any
 * unsupported value falls back to the default, so a tampered or stale record can
 * never reach the converter as-is.
 */
export function normaliseImageDraft(draft) {
  const input = draft && typeof draft === 'object' ? draft : {}
  return {
    version: IMAGE_HANDOFF_VERSION,
    resolution: has(DRAFT_RESOLUTIONS, input.resolution) ? input.resolution : DEFAULT_IMAGE_DRAFT.resolution,
    format: has(DRAFT_FORMATS, input.format) ? input.format : DEFAULT_IMAGE_DRAFT.format,
    compression: has(DRAFT_COMPRESSIONS, input.compression) ? input.compression : DEFAULT_IMAGE_DRAFT.compression,
  }
}

/** The converter settings a normalised draft asks for. */
export function draftToConverterSettings(draft) {
  const safe = normaliseImageDraft(draft)
  const resolution = DRAFT_RESOLUTIONS.find((r) => r.id === safe.resolution)
  const compression = DRAFT_COMPRESSIONS.find((c) => c.id === safe.compression)
  return { format: safe.format, maxDim: resolution.maxDim, quality: compression.quality }
}

/**
 * The honest limit of a format/compression pairing, or null when the converter
 * can honour it exactly. Shown on the homepage BEFORE hand-off and again in the
 * converter, so "Lossless" is never implied where it cannot be delivered.
 */
export function describeCompressionLimit(formatId, compressionId) {
  if (compressionId !== 'lossless') return null
  const format = DRAFT_FORMATS.find((f) => f.id === formatId)
  if (!format || format.lossless) return null
  return `${format.label} export is quality-based in File Converter, so it cannot store a truly lossless copy — it will use the highest quality setting instead. PNG keeps every pixel.`
}

// ── File acceptance ─────────────────────────────────────────────────────────
// Kept identical to File Converter's own image accept list so the picker, the
// validation and the destination agree.
export const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp,image/avif,image/x-icon,image/vnd.microsoft.icon,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif,.ico'

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|bmp|avif|ico)$/i

export function isSupportedImageFile(file) {
  if (!file) return false
  const type = typeof file.type === 'string' ? file.type : ''
  const name = typeof file.name === 'string' ? file.name : ''
  return type.startsWith('image/') || IMAGE_EXT.test(name)
}

/** Split a picked FileList into the images we accept and everything else. */
export function partitionImageFiles(files) {
  const all = files ? Array.from(files) : []
  const accepted = all.filter(isSupportedImageFile)
  return { accepted, rejected: all.filter((f) => !accepted.includes(f)) }
}

// ── The slot ────────────────────────────────────────────────────────────────
const slot = createHandoffSlot()

/**
 * Stage accepted `File` objects plus an optional output draft for the next
 * File Converter mount. Returns false when there is nothing to hand off.
 */
export function setImageHandoff(files, draft) {
  const accepted = files ? Array.from(files).filter(isSupportedImageFile) : []
  if (!accepted.length) {
    slot.set(null)
    return false
  }
  slot.set({
    version: IMAGE_HANDOFF_VERSION,
    files: accepted,
    draft: draft ? normaliseImageDraft(draft) : null,
  })
  return true
}

/** Legacy entry point used by the dashboard quick-upload tile (files only). */
export function setPendingImages(files) {
  return setImageHandoff(files, null)
}

/**
 * Read the staged record during render. Returns null when absent, already
 * consumed or from an unknown version — the converter then shows its normal
 * empty choose/drop state. Safe to call from a render React may discard.
 */
export function readImageHandoff() {
  const record = slot.peek()
  if (!record || record.version !== IMAGE_HANDOFF_VERSION || !record.files?.length) return null
  return { files: record.files, draft: record.draft ? normaliseImageDraft(record.draft) : null }
}

/**
 * Consume the record — call once from the destination's mount effect. After
 * this, a remount, Back/Forward navigation or a second visit reads nothing.
 */
export function consumeImageHandoff() {
  slot.consume()
}

/** Drop a staged record that will never be delivered (e.g. a failed navigation). */
export function resetImageHandoff() {
  slot.clear()
}
