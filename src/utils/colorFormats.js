// Reading and writing one colour in the three notations people actually type.
//
// The picker EMITS `#rrggbb` whatever is on screen — every consumer (palette
// swatches, gradient stops, icon colour) stores hex, and widening that contract
// would be a much larger change than a display preference deserves. So this
// module is a lens over the same value, not a second value.
//
// Alpha is carried separately for the same reason: only a caller that opted
// into it can receive it, so `format()` takes the alpha it should show rather
// than reading it off the hex.

export const COLOR_FORMATS = ['hex', 'rgb', 'hsl']

const HEX6 = /^#?([0-9a-f]{6})$/i
const HEX3 = /^#?([0-9a-f]{3})$/i
const HEX8 = /^#?([0-9a-f]{8})$/i

/** `#rrggbb`, or null. Accepts shorthand and an 8-digit hex (alpha dropped). */
export function normalizeHex(raw) {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  const long = value.match(HEX6)
  if (long) return `#${long[1].toLowerCase()}`
  const eight = value.match(HEX8)
  if (eight) return `#${eight[1].slice(0, 6).toLowerCase()}`
  const short = value.match(HEX3)
  if (short) return `#${short[1].toLowerCase().split('').map((c) => c + c).join('')}`
  return null
}

export function hexToRgb(hex) {
  const n = normalizeHex(hex) || '#000000'
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  }
}

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  // Saturation folds around l = 0.5: below it the range is bounded by how much
  // light there is, above it by how much room is left.
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

const round = (n) => Math.round(n)
const pct = (n) => `${Math.round(n * 100)}%`

/**
 * Render `hex` in `format`, including alpha only when it is not fully opaque.
 *
 * `rgb(…)`/`hsl(…)` gain a fourth argument rather than becoming `rgba(…)`:
 * modern CSS takes alpha in the same function, and printing the legacy name
 * would teach the notation the browser is moving away from.
 */
export function formatColor(hex, format, alpha = 1) {
  const value = normalizeHex(hex) || '#000000'
  const a = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : 1))
  const opaque = a >= 1
  // Two decimals: 0.01 steps are what the slider produces, and trailing zeros
  // read as noise in a field people copy out of.
  const aStr = String(Number(a.toFixed(2)))

  if (format === 'rgb') {
    const { r, g, b } = hexToRgb(value)
    return opaque ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${aStr})`
  }
  if (format === 'hsl') {
    const { h, s, l } = rgbToHsl(hexToRgb(value))
    const base = `${round(h)} ${pct(s)} ${pct(l)}`
    return opaque ? `hsl(${base})` : `hsl(${base} / ${aStr})`
  }
  // Hex carries alpha the only way it can: two more digits.
  if (opaque) return value
  return `${value}${Math.round(a * 255).toString(16).padStart(2, '0')}`
}

/**
 * Read a colour a user typed, in any of the three notations.
 *
 * Returns `{ hex, alpha }`, or null if it is not a colour. Alpha defaults to 1
 * rather than to the caller's current alpha: someone who types `rgb(0 0 0)`
 * over a half-transparent colour means the opaque one.
 *
 * Deliberately tolerant about separators. `rgb(12, 34, 56)` and `rgb(12 34 56)`
 * are the same colour, people paste both, and refusing one because CSS changed
 * its preferred spelling would be pedantry aimed at the wrong audience.
 */
export function parseColor(raw) {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null

  const hex = normalizeHex(text)
  if (hex) {
    const eight = text.match(HEX8)
    return { hex, alpha: eight ? parseInt(eight[1].slice(6, 8), 16) / 255 : 1 }
  }

  const fn = text.match(/^(rgba?|hsla?)\s*\(([^)]*)\)$/i)
  if (!fn) return null
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null

  const num = (s) => {
    const n = Number.parseFloat(s)
    return Number.isFinite(n) ? n : null
  }
  const alphaOf = (s) => {
    if (s == null) return 1
    const n = num(s)
    if (n == null) return 1
    return Math.min(1, Math.max(0, s.trim().endsWith('%') ? n / 100 : n))
  }

  if (/^rgba?$/i.test(fn[1])) {
    const [r, g, b] = parts.slice(0, 3).map((p) => {
      const n = num(p)
      if (n == null) return null
      // `rgb(50% 50% 50%)` is legal and means half of 255, not 50.
      return p.trim().endsWith('%') ? Math.round((n / 100) * 255) : Math.round(n)
    })
    if ([r, g, b].some((n) => n == null || n < 0 || n > 255)) return null
    const to2 = (n) => n.toString(16).padStart(2, '0')
    return { hex: `#${to2(r)}${to2(g)}${to2(b)}`, alpha: alphaOf(parts[3]) }
  }

  const h = num(parts[0])
  const s = num(parts[1])
  const l = num(parts[2])
  if ([h, s, l].some((n) => n == null)) return null
  return { hex: hslToHex(h, s / 100, l / 100), alpha: alphaOf(parts[3]) }
}

export function hslToHex(h, s, l) {
  const sat = Math.min(1, Math.max(0, s))
  const lit = Math.min(1, Math.max(0, l))
  const c = (1 - Math.abs(2 * lit - 1)) * sat
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let rgb
  if (hp < 1) rgb = [c, x, 0]
  else if (hp < 2) rgb = [x, c, 0]
  else if (hp < 3) rgb = [0, c, x]
  else if (hp < 4) rgb = [0, x, c]
  else if (hp < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const m = lit - c / 2
  const to2 = (n) => Math.round(Math.min(255, Math.max(0, (n + m) * 255))).toString(16).padStart(2, '0')
  return `#${to2(rgb[0])}${to2(rgb[1])}${to2(rgb[2])}`
}
