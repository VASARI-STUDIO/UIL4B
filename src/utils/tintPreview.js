// Which step of a Tint Generator ramp plays which part on the Preview's sample
// page. Keyed by step LABEL, so a 13-step ramp (25 ... 975) cannot shift them.
// A 9-step ramp has no 900 or 950, so 800 is both the heading and the dark
// surface. The Preview component reads this; nothing else does.
import { contrastRatio, textColorForBg } from './colors.js'

const BASE = { page: '50', card: '100', line: '200', button: '600', hover: '700', text: '700', darkInk: '50', darkSub: '100' }
export const PREVIEW_ROLES = {
  9: { ...BASE, head: '800', dark: '800' },
  11: { ...BASE, head: '900', dark: '950' },
  13: { ...BASE, head: '900', dark: '950' },
}

/**
 * The hex of every role, from the ramp as drawn: { page, card, line, button,
 * buttonInk, hover, text, head, dark, darkInk, darkSub } plus `steps` (the label
 * each role took). The button's ink is white or black, not a ramp step. A role
 * whose label is not in the ramp is left out.
 */
export function previewColours(ramp, count) {
  const steps = PREVIEW_ROLES[count] || PREVIEW_ROLES[11]
  const byLabel = new Map(ramp.map((t) => [t.label, t.hex]))
  const hex = {}
  for (const [role, label] of Object.entries(steps)) {
    if (byLabel.has(label)) hex[role] = byLabel.get(label)
  }
  if (hex.button) hex.buttonInk = textColorForBg(hex.button)
  return { steps, hex }
}

/** "15.8:1", or "3.9:1, below 4.5" for a pair that fails body-text contrast. */
export function ratioText(a, b) {
  const raw = contrastRatio(a, b)
  const text = `${(Math.floor(raw * 10) / 10).toFixed(1)}:1`
  return raw < 4.5 ? `${text}, below 4.5` : text
}

/** "15.8 to 1", or "3.9 to 1, below 4.5", for the screen reader legend. */
export function ratioSpoken(a, b) {
  const raw = contrastRatio(a, b)
  const text = `${(Math.floor(raw * 10) / 10).toFixed(1)} to 1`
  return raw < 4.5 ? `${text}, below 4.5` : text
}
