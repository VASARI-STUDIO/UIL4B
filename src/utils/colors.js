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
  const hsl = hexToHsl(hex)
  return hsl[2] > 55 ? 'rgba(0,0,0,.85)' : 'rgba(255,255,255,.9)'
}

export function generateHarmony(hex, type) {
  const [h, s, l] = hexToHsl(hex)
  const colors = [hex]
  switch (type) {
    case 'complement':
      colors.push(
        hslToHex(h + 180, s, l),
        hslToHex(h, Math.max(s - 20, 10), Math.min(l + 30, 90)),
        hslToHex(h + 180, Math.max(s - 20, 10), Math.min(l + 30, 90)),
        hslToHex(h, s, Math.max(l - 25, 10))
      )
      break
    case 'analogous':
      colors.push(
        hslToHex(h - 30, s, l),
        hslToHex(h + 30, s, l),
        hslToHex(h - 15, Math.max(s - 15, 10), Math.min(l + 20, 90)),
        hslToHex(h + 15, Math.max(s - 15, 10), Math.min(l + 20, 90))
      )
      break
    case 'triadic':
      colors.push(
        hslToHex(h + 120, s, l),
        hslToHex(h + 240, s, l),
        hslToHex(h, Math.max(s - 25, 10), Math.min(l + 25, 90)),
        hslToHex(h + 120, Math.max(s - 25, 10), Math.min(l + 25, 90))
      )
      break
    case 'split':
      colors.push(
        hslToHex(h + 150, s, l),
        hslToHex(h + 210, s, l),
        hslToHex(h, s, Math.min(l + 30, 90)),
        hslToHex(h + 180, s, Math.max(l - 20, 10))
      )
      break
    case 'tetradic':
      colors.push(
        hslToHex(h + 90, s, l),
        hslToHex(h + 180, s, l),
        hslToHex(h + 270, s, l)
      )
      break
    case 'monochromatic':
      colors.push(
        hslToHex(h, s, Math.min(l + 20, 90)),
        hslToHex(h, Math.max(s - 15, 10), Math.min(l + 35, 95)),
        hslToHex(h, Math.max(s - 10, 10), Math.max(l - 20, 10)),
        hslToHex(h, s, Math.max(l - 35, 5))
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
    if (i === 0 || i === n - 1) newS = Math.max(0, newS * 0.3)
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
