// In-memory hand-off from the homepage icon preview into the real Icon Library
// editor.
//
// The draft is deliberately tiny and completely bounded: a version, one icon
// from a bundled allowlist inside one live-supported pack, one size from a
// fixed set and one stroke width from a fixed set. Nothing else survives
// validation — no SVG or HTML markup, no URLs, no colours, no executable data,
// no plan/quota/entitlement fields. Unknown keys are ignored rather than
// merged, because the output object is rebuilt from scratch.
//
// The draft grants NO capability. The editor's existing authentication, free
// limits and Pro checks remain the sole authority; this only preselects which
// icon opens and at which size/stroke.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { createHandoffSlot } from './handoffSlot.js'

export const ICON_DRAFT_VERSION = 1

// One live-supported pack. The homepage never calls Iconify, Logo.dev or any
// other catalogue — these ids are bundled and drawn inline.
export const ICON_DRAFT_PACK = 'lucide'

// Bounded allowlist. Every id is a real Lucide icon name, so the editor can
// resolve it exactly as if the visitor had found it in the grid.
export const ICON_DRAFT_NAMES = [
  'search', 'house', 'heart', 'star',
  'bell', 'mail', 'image', 'lock',
  'cloud', 'zap', 'circle-check', 'calendar',
]

export const ICON_DRAFT_SIZES = [24, 32, 48]
export const ICON_DRAFT_STROKES = [1, 1.5, 2, 2.5]

export const DEFAULT_ICON_DRAFT = Object.freeze({
  version: ICON_DRAFT_VERSION,
  pack: ICON_DRAFT_PACK,
  name: 'heart',
  size: 48,
  stroke: 1.5,
})

/**
 * Validate an untrusted draft. Returns a freshly built, fully bounded draft, or
 * null when anything about it is unsupported. Called before navigation AND
 * again in the editor before the draft is applied.
 */
export function validateIconDraft(draft) {
  if (!draft || typeof draft !== 'object') return null
  if (draft.version !== ICON_DRAFT_VERSION) return null
  if (draft.pack !== ICON_DRAFT_PACK) return null
  if (typeof draft.name !== 'string' || !ICON_DRAFT_NAMES.includes(draft.name)) return null
  const size = Number(draft.size)
  if (!ICON_DRAFT_SIZES.includes(size)) return null
  const stroke = Number(draft.stroke)
  if (!ICON_DRAFT_STROKES.includes(stroke)) return null
  return {
    version: ICON_DRAFT_VERSION,
    pack: ICON_DRAFT_PACK,
    name: draft.name,
    size,
    stroke,
  }
}

/** Build a draft from loose homepage state, or null if it isn't valid. */
export function buildIconDraft({ name, size, stroke }) {
  return validateIconDraft({ version: ICON_DRAFT_VERSION, pack: ICON_DRAFT_PACK, name, size, stroke })
}

const slot = createHandoffSlot()

/** Stage a draft for the next Icon Library mount. False when it is invalid. */
export function setIconDraft(draft) {
  const valid = validateIconDraft(draft)
  slot.set(valid)
  return !!valid
}

/**
 * Read the staged draft during render, re-validated. Null when absent, already
 * consumed or invalid — the editor then opens in its normal state. Safe to call
 * from a render React may discard.
 */
export function readIconDraft() {
  return validateIconDraft(slot.peek())
}

/** Consume the draft — call once from the editor's mount effect. */
export function consumeIconDraft() {
  slot.consume()
}

/** Drop a staged draft that will never be delivered (e.g. a failed navigation). */
export function resetIconDraft() {
  slot.clear()
}
