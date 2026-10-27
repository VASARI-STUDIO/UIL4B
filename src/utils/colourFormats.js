// The six notations a swatch is shown in, each as the text a person would paste.
//
// Every conversion already exists in utils/colors.js; this only formats them.
// CMYK is the naive sRGB conversion (no ICC profile, no black generation or
// ink limits), so it is a screen estimate and not a print-ready value.
import { hexToCmyk, hexToHsl, hexToHsv, hexToOklch, hexToRgb } from './colors.js'

export function colourFormats(hex) {
  const up = String(hex).toUpperCase()
  const [r, g, b] = hexToRgb(up)
  const [hue, s, l] = hexToHsl(up)
  const [hueB, hs, hb] = hexToHsv(up)
  // Both converters round the hue after scaling, so a hue just under a full turn
  // comes back as 360; a person expects 0. OKLCH rounds the same way.
  const h = hue % 360
  const hh = hueB % 360
  const [c, m, y, k] = hexToCmyk(up)
  const [ol, oc, ohRaw] = hexToOklch(up)
  const oh = ohRaw % 360
  return [
    { key: 'hex', label: 'HEX', value: up },
    { key: 'rgb', label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { key: 'hsl', label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)` },
    { key: 'hsb', label: 'HSB', value: `hsb(${hh}, ${hs}%, ${hb}%)` },
    { key: 'cmyk', label: 'CMYK', value: `cmyk(${c}%, ${m}%, ${y}%, ${k}%)` },
    { key: 'oklch', label: 'OKLCH', value: `oklch(${ol}% ${oc} ${oh})` },
  ]
}
