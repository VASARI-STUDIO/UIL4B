// In-memory hand-offs from the Palette Builder into the other colour tools.
//
// Two tiny drafts: the live palette on its way to the Gradient Generator, and
// one previewed swatch on its way to the Tint Scale Generator. Both follow the
// same contract as imageHandoff / iconHandoff — versioned, never persisted,
// never in the URL, never in analytics. The record is READ during render (safe
// from a render React may discard) and CONSUMED exactly once from the
// destination's mount effect, so a reload, a Back/Forward navigation or a
// direct visit finds nothing and the tool opens in its normal state.
//
// A draft carries colours and nothing else — no plan, entitlement, name, id or
// markup. The output is rebuilt from scratch, so unknown keys are dropped
// rather than merged, and every hex is re-validated on the way out. The draft
// grants no capability: each destination's own free/Pro rules stay the sole
// authority over what may then be done with those colours.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { createHandoffSlot } from './handoffSlot.js'

export const COLOR_HANDOFF_VERSION = 1

// A gradient needs two stops; the Gradient Generator's own palette import caps
// at five so a carried-in ramp stays readable — the same cap applies here.
export const GRADIENT_HANDOFF_MIN = 2
export const GRADIENT_HANDOFF_MAX = 5
// TintTool holds up to eight ramps (its MAX_RAMPS). The tints preview hands
// over a single colour, but the cap is stated rather than assumed.
export const TINT_HANDOFF_MIN = 1
export const TINT_HANDOFF_MAX = 8

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** '#abc' / 'AABBCC' → '#AABBCC'; null when the value isn't a hex colour. */
export function normaliseHandoffHex(raw) {
  if (typeof raw !== 'string') return null
  const m = HEX_RE.exec(raw.trim())
  if (!m) return null
  const hex = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return `#${hex.toUpperCase()}`
}

// Keep only real hex colours, deduped (a repeated gradient stop or tint ramp is
// noise, not information) and capped. Returns null when the result is too short
// to be useful at the destination.
function cleanColors(list, min, max) {
  if (!Array.isArray(list)) return null
  const out = []
  for (const raw of list) {
    const hex = normaliseHandoffHex(raw)
    if (hex && !out.includes(hex)) out.push(hex)
    if (out.length >= max) break
  }
  return out.length >= min ? out : null
}

// One slot + its validator. Validation runs before staging AND again on the way
// out, so a stale record can never reach a destination as-is.
function makeColorSlot(min, max) {
  const slot = createHandoffSlot()
  const validate = (draft) => {
    if (!draft || typeof draft !== 'object') return null
    if (draft.version !== COLOR_HANDOFF_VERSION) return null
    const colors = cleanColors(draft.colors, min, max)
    return colors ? { version: COLOR_HANDOFF_VERSION, colors } : null
  }
  return {
    validate,
    build: (colors) => validate({ version: COLOR_HANDOFF_VERSION, colors }),
    stage: (colors) => {
      const valid = validate({ version: COLOR_HANDOFF_VERSION, colors })
      slot.set(valid)
      return !!valid
    },
    read: () => validate(slot.peek()),
    consume: () => slot.consume(),
    reset: () => slot.clear(),
  }
}

const gradientSlot = makeColorSlot(GRADIENT_HANDOFF_MIN, GRADIENT_HANDOFF_MAX)
const tintSlot = makeColorSlot(TINT_HANDOFF_MIN, TINT_HANDOFF_MAX)

/* ── Palette → Gradient Generator ─────────────────────────────────────────── */

/** Build a draft from loose colours, or null when it can't make a gradient. */
export const buildGradientDraft = gradientSlot.build
export const validateGradientDraft = gradientSlot.validate
/** Stage the palette for the next Gradient Generator mount. False when unusable. */
export const setGradientDraft = gradientSlot.stage
/** Read during render, re-validated. Null when absent, consumed or invalid. */
export const readGradientDraft = gradientSlot.read
/** Consume — call once from the destination's mount effect. */
export const consumeGradientDraft = gradientSlot.consume
/** Drop a staged draft that will never be delivered (e.g. a failed navigation). */
export const resetGradientDraft = gradientSlot.reset

/* ── Palette → Tint Scale Generator ───────────────────────────────────────── */

export const buildTintDraft = tintSlot.build
export const validateTintDraft = tintSlot.validate
export const setTintDraft = tintSlot.stage
export const readTintDraft = tintSlot.read
export const consumeTintDraft = tintSlot.consume
export const resetTintDraft = tintSlot.reset
