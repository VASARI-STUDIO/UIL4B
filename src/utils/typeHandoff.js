// In-memory hand-offs between the three typography tools.
//
// Font Gallery → Font Pair, Font Gallery → Type Scale, Font Pair → Type Scale
// and Type Scale → Font Pair all carry the CURRENT selection, so a tool is
// never opened empty. Same contract as colorHandoff / imageHandoff: versioned,
// never persisted, never in the URL, never in analytics. The record is READ
// during render (safe from a render React may discard) and CONSUMED exactly
// once from the destination's mount effect, so a reload, a Back/Forward
// navigation or a direct visit finds nothing and the tool opens normally.
//
// A draft carries type choices and nothing else — no plan, entitlement, id or
// markup. Every field is rebuilt and re-validated on the way out, so unknown
// keys are dropped rather than merged, and the draft grants no capability:
// each destination's own free/Pro rules stay the sole authority.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { createHandoffSlot } from './handoffSlot.js'

export const TYPE_HANDOFF_VERSION = 1

// Google's own category vocabulary. Anything else is dropped rather than
// guessed at — a bogus category would pick the wrong generic fallback.
const CATEGORIES = ['serif', 'sans-serif', 'display', 'handwriting', 'monospace']

// Family names come from the Google catalog, but a draft must survive a stale
// or hand-built record too. Letters, digits, spaces and the handful of marks
// real families use — no quotes, no angle brackets, nothing that could change
// the meaning of a CSS declaration built from it.
const FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 '’+._-]{0,63}$/

export const RATIO_MIN = 1.01
export const RATIO_MAX = 3
export const BASE_MIN = 8
export const BASE_MAX = 40

function cleanFamily(raw) {
  if (typeof raw !== 'string') return null
  const family = raw.trim().replace(/\s+/g, ' ')
  return FAMILY_RE.test(family) ? family : null
}

// Google ships weights in hundreds; anything else is snapped into range rather
// than trusted, so a draft can never ask for `font-weight: 1e9`.
function cleanWeight(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 400
  return Math.min(900, Math.max(100, Math.round(n / 100) * 100))
}

function cleanRole(raw) {
  const family = cleanFamily(raw?.family)
  if (!family) return null
  return {
    family,
    weight: cleanWeight(raw?.weight),
    category: CATEGORIES.includes(raw?.category) ? raw.category : 'sans-serif',
  }
}

function cleanNumber(raw, min, max) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

// A draft is useful when it names at least ONE role OR carries a complete scale.
// Roles are optional individually — the homepage can hand over only base/ratio
// and let Type Scale keep the user's saved families.
function validate(draft) {
  if (!draft || typeof draft !== 'object') return null
  if (draft.version !== TYPE_HANDOFF_VERSION) return null
  const heading = cleanRole(draft.heading)
  const body = cleanRole(draft.body)
  const base = cleanNumber(draft.scale?.base, BASE_MIN, BASE_MAX)
  const ratio = cleanNumber(draft.scale?.ratio, RATIO_MIN, RATIO_MAX)
  const scale = base != null && ratio != null ? { base, ratio } : null
  if (!heading && !body && !scale) return null

  const out = { version: TYPE_HANDOFF_VERSION }
  if (heading) out.heading = heading
  if (body) out.body = body
  if (scale) out.scale = scale

  return out
}

function makeTypeSlot() {
  const slot = createHandoffSlot()
  return {
    validate,
    /** Build a draft from loose values, or null when there's nothing usable. */
    build: (draft) => validate({ ...draft, version: TYPE_HANDOFF_VERSION }),
    /** Stage for the next destination mount. False when the draft is unusable. */
    stage: (draft) => {
      const valid = validate({ ...draft, version: TYPE_HANDOFF_VERSION })
      slot.set(valid)
      return !!valid
    },
    /** Read during render, re-validated. Null when absent, consumed or invalid. */
    read: () => validate(slot.peek()),
    /** Consume — call once from the destination's mount effect. */
    consume: () => slot.consume(),
    /** Drop a staged record that will never be delivered. */
    reset: () => slot.clear(),
  }
}

const pairSlot = makeTypeSlot()
const scaleSlot = makeTypeSlot()

/* ── → Font Pair (/fontpairs) ─────────────────────────────────────────────── */

export const buildPairDraft = pairSlot.build
export const validatePairDraft = pairSlot.validate
export const setPairDraft = pairSlot.stage
export const readPairDraft = pairSlot.read
export const consumePairDraft = pairSlot.consume
export const resetPairDraft = pairSlot.reset

/* ── → Type Scale (/typescale) ────────────────────────────────────────────── */

export const buildScaleDraft = scaleSlot.build
export const validateScaleDraft = scaleSlot.validate
export const setScaleDraft = scaleSlot.stage
export const readScaleDraft = scaleSlot.read
export const consumeScaleDraft = scaleSlot.consume
export const resetScaleDraft = scaleSlot.reset
