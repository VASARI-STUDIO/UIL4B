import { contrastRatio, hexToRgb, luminance } from './colors'

// Figures for the colour contrast guide, always read off the product's own
// contrastRatio() and luminance() so no number in the prose is typed in.

export const ratioText = (a, b) => `${contrastRatio(a, b).toFixed(2)}:1`
export const lumText = (hex) => luminance(...hexToRgb(hex)).toFixed(4)

// White laid over a colour at the given opacity: the pixel that reaches the screen.
export function blendWhite(hex, alpha) {
  const out = hexToRgb(hex).map((c) => Math.round(255 * alpha + c * (1 - alpha)))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
