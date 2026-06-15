// Color conversion utilities migrated from app.js

export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  let h, s
  const l = (mx + mn) / 2
  if (mx === mn) {
    h = s = 0
  } else {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return '#' + f(0) + f(8) + f(4)
}

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ]
}

// HSB/HSV (hue, saturation, brightness/value) — computed from RGB.
export function hexToHsv(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  let h = 0
  if (d !== 0) {
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  const s = mx === 0 ? 0 : d / mx
  return [Math.round(h * 360), Math.round(s * 100), Math.round(mx * 100)]
}

// Blend a hex colour toward a target hex by amount t (0..1) in RGB space.
export function mixHex(hex, target, t) {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0')
  return '#' + ch(0) + ch(1) + ch(2)
}

export function hexToCmyk(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const k = 1 - Math.max(r, g, b)
  if (k === 1) return [0, 0, 0, 100]
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  return [c, m, y, k].map(v => Math.round(v * 100))
}

export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const lr = lin(r), lg = lin(g), lb = lin(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2164557872 * lg + 0.6652917509 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(a * a + bb * bb)
  let H = Math.atan2(bb, a) * 180 / Math.PI
  if (H < 0) H += 360
  return [+(L * 100).toFixed(1), +C.toFixed(3), +H.toFixed(1)]
}

// Approximate human-readable colour name from HSL — hue family plus
// lightness/saturation modifiers. Honest and dataset-free (no giant lookup).
export function describeColor(hex) {
  const [h, s, l] = hexToHsl(hex)
  if (l <= 4) return 'Black'
  if (l >= 97) return 'White'
  if (s <= 8) {
    if (l < 22) return 'Charcoal'
    if (l < 42) return 'Dark Grey'
    if (l < 62) return 'Grey'
    if (l < 82) return 'Light Grey'
    return 'Off White'
  }
  const HUES = [
    [15, 'Red'], [45, 'Orange'], [65, 'Yellow'], [90, 'Lime'], [150, 'Green'],
    [175, 'Teal'], [195, 'Cyan'], [240, 'Blue'], [275, 'Indigo'], [300, 'Violet'],
    [330, 'Magenta'], [345, 'Pink'], [360, 'Red'],
  ]
  const family = HUES.find(([max]) => h <= max)?.[1] || 'Red'
  let prefix = ''
  if (l < 25) prefix = 'Dark '
  else if (l > 78) prefix = 'Light '
  else if (s < 35) prefix = 'Muted '
  else if (s > 80 && l > 45 && l < 65) prefix = 'Vivid '
  return prefix + family
}

export function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

export function contrastRatio(hex1, hex2) {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  const l1 = luminance(c1[0], c1[1], c1[2])
  const l2 = luminance(c2[0], c2[1], c2[2])
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export function textColorForBg(hex) {
  const rgb = hexToRgb(hex)
  const lum = luminance(rgb[0], rgb[1], rgb[2])
  return lum > 0.179 ? 'rgba(0,0,0,.85)' : 'rgba(255,255,255,.9)'
}

function soften(s, factor) { return Math.max(10, Math.round(s * factor)) }
function lShift(l, delta) { return Math.max(5, Math.min(95, l + delta)) }

export function generateHarmony(hex, type) {
  const [h, s, l] = hexToHsl(hex)
  const colors = [hex]
  const headroom = 95 - l
  const depth = l - 5
  switch (type) {
    case 'complement':
      colors.push(
        hslToHex(h + 180, s, l),
        hslToHex(h, soften(s, .7), lShift(l, headroom * .5)),
        hslToHex(h + 180, soften(s, .7), lShift(l, headroom * .5)),
        hslToHex(h, s, lShift(l, -depth * .5))
      )
      break
    case 'analogous':
      colors.push(
        hslToHex(h - 30, s, l),
        hslToHex(h + 30, s, l),
        hslToHex(h - 15, soften(s, .75), lShift(l, headroom * .35)),
        hslToHex(h + 15, soften(s, .75), lShift(l, headroom * .35))
      )
      break
    case 'triadic':
      colors.push(
        hslToHex(h + 120, s, l),
        hslToHex(h + 240, s, l),
        hslToHex(h, soften(s, .65), lShift(l, headroom * .45)),
        hslToHex(h + 120, soften(s, .65), lShift(l, headroom * .45))
      )
      break
    case 'split':
      colors.push(
        hslToHex(h + 150, s, l),
        hslToHex(h + 210, s, l),
        hslToHex(h, s, lShift(l, headroom * .5)),
        hslToHex(h + 180, s, lShift(l, -depth * .4))
      )
      break
    case 'tetradic':
      colors.push(
        hslToHex(h + 90, s, l),
        hslToHex(h + 180, s, l),
        hslToHex(h + 270, s, l),
        hslToHex(h, soften(s, .8), lShift(l, -depth * .45))
      )
      break
    case 'monochromatic':
      colors.push(
        hslToHex(h, s, lShift(l, headroom * .4)),
        hslToHex(h, soften(s, .7), lShift(l, headroom * .7)),
        hslToHex(h, soften(s, .85), lShift(l, -depth * .4)),
        hslToHex(h, s, lShift(l, -depth * .7))
      )
      break
    case 'custom':
      colors.push(
        hslToHex(h + 60, s, l),
        hslToHex(h + 180, s, l),
        hslToHex(h, soften(s, .6), lShift(l, headroom * .5)),
        hslToHex(h, s, lShift(l, -depth * .5))
      )
      break
  }
  return colors
}

const T_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const T_LINEAR = [97, 93, 85, 75, 62, 50, 38, 28, 18, 10, 5]
const T_PERCEIVED = [98, 95, 88, 78, 66, 53, 40, 30, 20, 12, 6]

export { T_LABELS }

export function generateTintScale(cfg) {
  const [h, s, baseL] = hexToHsl(cfg.hex)
  const stops = cfg.mode === 'perceived' ? T_PERCEIVED : T_LINEAR
  const n = stops.length
  const ai = cfg.anchor
  return stops.map((defaultL, i) => {
    let newL
    if (i === ai) { newL = baseL }
    else if (i < ai) { const t = 1 - (i / ai); newL = baseL + t * (cfg.lMax - baseL) }
    else { const t2 = (i - ai) / (n - 1 - ai); newL = baseL - t2 * (baseL - cfg.lMin) }
    newL = Math.max(0, Math.min(100, newL))
    const tNorm = (n - 1 - i) / (n - 1)
    const newH = h + cfg.hueShift * tNorm
    let satShift = cfg.satMax * tNorm + cfg.satMin * (1 - tNorm)
    let newS = Math.max(0, Math.min(100, s + satShift))
    if (i === 0 || i === n - 1) newS = Math.max(0, newS * 0.5)
    return hslToHex(newH, Math.round(newS), Math.round(newL))
  })
}

export function fixForeground(fg, bg, targetRatio) {
  const fgHsl = hexToHsl(fg)
  const [h, s] = fgHsl
  const bgRgb = hexToRgb(bg)
  const bgLum = luminance(bgRgb[0], bgRgb[1], bgRgb[2])
  const isDk = bgLum < 0.5
  let lo, hi
  if (isDk) { lo = fgHsl[2]; hi = 100 } else { lo = 0; hi = fgHsl[2] }
  let best = fg
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const t = hslToHex(h, s, Math.round(mid))
    const r = contrastRatio(t, bg)
    if (r >= targetRatio) { best = t; if (isDk) hi = mid; else lo = mid }
    else { if (isDk) lo = mid; else hi = mid }
  }
  return best
}

export function fixBackground(fg, bg, targetRatio) {
  const bgHsl = hexToHsl(bg)
  const [h, s] = bgHsl
  const fgRgb = hexToRgb(fg)
  const fgLum = luminance(fgRgb[0], fgRgb[1], fgRgb[2])
  const isFgLight = fgLum > 0.5
  let lo, hi
  if (isFgLight) { lo = 0; hi = bgHsl[2] } else { lo = bgHsl[2]; hi = 100 }
  let best = bg
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const t = hslToHex(h, s, Math.round(mid))
    const r = contrastRatio(fg, t)
    if (r >= targetRatio) { best = t; if (isFgLight) lo = mid; else hi = mid }
    else { if (isFgLight) hi = mid; else lo = mid }
  }
  return best
}
