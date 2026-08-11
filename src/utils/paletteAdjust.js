// The Palette Builder's global-adjust lens and the shape it persists.
//
// This lives outside the page component so the contract that keeps the
// adjustment NON-DESTRUCTIVE can be tested directly — the page module pulls in
// React, and this contract is exactly the one that must never regress.
//
// The rule, in one line: `applyAdjust` is the single derivation from BASE to
// DISPLAYED, so the base colours and the slider values are persisted separately
// and the lens is never folded back into the base. Persisting the RESULT plus
// the sliders is what used to make the adjustment compound on every save/reload
// cycle, and it meant dragging a slider back to 0 no longer restored the
// original palette because the base had already drifted.
// Explicit extension so `node --test` can import this module directly for the
// unit suite; Vite resolves it identically.
import { applyAdjust } from './colors.js'

// Slider bounds, mirrored by ADJUST_FIELDS in the Palette Builder toolbar and
// by ADJUST_TRACK_RANGES in colors.js. Each field is symmetric around 0, so one
// number per key is the whole range.
//
// `h` narrowed from 180 to 50 when the hue slider did. Boards saved under the
// old range restore through readSavedPalette below, which re-derives and
// compares: a stored h of 116 no longer reproduces the stored colours, so those
// colours become the new base with the sliders at zero. The user's palette
// opens looking exactly as they left it — which is also the only reading under
// which the seed swatch beside the hex field is telling the truth.
export const ADJUST_BOUNDS = Object.freeze({ h: 50, s: 100, b: 100, temp: 100 })
export const ZERO_ADJUST = Object.freeze({ h: 0, s: 0, b: 0, temp: 0 })

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** '#Abc' / 'aabbcc' → canonical '#AABBCC'; null when the string isn't a hex. */
export function normaliseHex(raw) {
  const m = HEX_RE.exec(String(raw ?? '').trim())
  if (!m) return null
  const hex = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return `#${hex.toUpperCase()}`
}

/** Clamp an untrusted stored lens back onto the slider ranges. */
export function normaliseAdjust(raw) {
  if (!raw || typeof raw !== 'object') return { ...ZERO_ADJUST }
  const out = { ...ZERO_ADJUST }
  for (const [key, bound] of Object.entries(ADJUST_BOUNDS)) {
    const v = Number(raw[key])
    if (Number.isFinite(v)) out[key] = Math.max(-bound, Math.min(bound, v))
  }
  return out
}

const sameColorList = (a, b) =>
  a.length === b.length && a.every((c, i) => String(c).toUpperCase() === String(b[i]).toUpperCase())

/**
 * The palette patch the builder writes to the shared design.
 *
 * `colors` is what the user SEES: every other surface (Tint, Gradient, exports,
 * share cards, the dashboard, saved projects) reads it directly and never
 * re-applies the lens, so it must stay the adjusted result. `baseColors` +
 * `globalAdjust` are what the board re-derives from, and they are the only pair
 * the builder itself reads back.
 */
export function persistedPalette(baseColors, adjust) {
  const lens = normaliseAdjust(adjust)
  return { baseColors, colors: applyAdjust(baseColors, lens), globalAdjust: lens }
}

/**
 * Restore the board from a saved design. The stored base is trusted ONLY when
 * re-deriving it reproduces the stored `colors` exactly. That single check
 * covers all three cases honestly:
 *
 *  • our own round-trip → base + sliders restored exactly, nothing compounds;
 *  • a project saved BEFORE this split (already-adjusted `colors` alongside a
 *    non-zero `globalAdjust`) → the stored colours are taken as the base and the
 *    sliders start at zero. The board opens looking exactly as the user left it;
 *    their saved palette is never silently re-adjusted;
 *  • another tool (Colour Studio, a Projects palette apply) having rewritten
 *    `colors` without knowing about `baseColors` → the check fails, so a stale
 *    base can never resurrect a palette the user has since moved on from.
 *
 * Returns null when there is no usable saved palette (fewer than two colours).
 */
export function readSavedPalette(palette, max = 10) {
  const shown = (palette?.colors || []).map(normaliseHex).filter(Boolean).slice(0, max)
  if (shown.length < 2) return null
  const base = (palette?.baseColors || []).map(normaliseHex).filter(Boolean).slice(0, max)
  const adjust = normaliseAdjust(palette?.globalAdjust)
  if (base.length === shown.length) {
    const derived = applyAdjust(base, adjust).map(c => normaliseHex(c) || c)
    if (sameColorList(derived, shown)) return { colors: base, adjust }
  }
  return { colors: shown, adjust: { ...ZERO_ADJUST } }
}
