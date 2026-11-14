import { contrastRatio, hexToRgb } from './colors.js'

// The numbers the library preview dialog reads out: which pairs of a palette's
// colours can carry text, and how legible white and black text are across a
// gradient. Pure, so the dialog and the tests read the same answers.

/** WCAG 2.2 thresholds: normal text, then large text and UI. */
export const TEXT_RATIO = 4.5
export const LARGE_RATIO = 3
/** The most pairs the dialog lists. */
export const PAIRS_SHOWN = 4
/** Points sampled along a gradient to find its lowest contrast. */
export const GRADIENT_SAMPLES = 11

/** A ratio cut to one decimal without rounding up, so 4.49 never reads as 4.5. */
export const floorRatio = (ratio) => (Math.floor(ratio * 10) / 10).toFixed(1)

/**
 * The pairs of a palette's colours that reach 3:1, strongest first.
 * `shown` is the first PAIRS_SHOWN; `moreText` counts the pairs that pass for
 * text (4.5:1) beyond those; `any` is false when no pair reaches 3:1.
 */
export function readablePairs(colors) {
  const pairs = []
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const ratio = contrastRatio(colors[i], colors[j])
      if (ratio >= LARGE_RATIO) pairs.push({ a: colors[i], b: colors[j], ratio, verdict: ratio >= TEXT_RATIO ? 'Text' : 'Large text' })
    }
  }
  pairs.sort((x, y) => y.ratio - x.ratio)
  const shown = pairs.slice(0, PAIRS_SHOWN)
  const moreText = pairs.slice(PAIRS_SHOWN).filter((p) => p.ratio >= TEXT_RATIO).length
  return { shown, moreText, any: pairs.length > 0 }
}

const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase()

/** `count` colours spaced along a gradient's stops, blended in sRGB. */
export function gradientSamples(stops, count = GRADIENT_SAMPLES) {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const out = []
  for (let i = 0; i < count; i += 1) {
    const at = (i / (count - 1)) * 100
    const next = sorted.findIndex((s) => s.position >= at)
    if (next <= 0) { out.push(sorted[next === 0 ? 0 : sorted.length - 1].color.toUpperCase()); continue }
    const lo = sorted[next - 1]
    const hi = sorted[next]
    const span = hi.position - lo.position
    const t = span === 0 ? 0 : (at - lo.position) / span
    const a = hexToRgb(lo.color)
    const b = hexToRgb(hi.color)
    out.push(toHex(a.map((v, k) => v + (b[k] - v) * t)))
  }
  return out
}

/** The lowest ratio white text and black text reach over the sampled gradient. */
export function gradientTextContrast(stops) {
  const samples = gradientSamples(stops)
  return {
    white: Math.min(...samples.map((hex) => contrastRatio('#FFFFFF', hex))),
    black: Math.min(...samples.map((hex) => contrastRatio('#000000', hex))),
  }
}

/** What a ratio means for body text, in the words the dialog uses. */
export const verdictFor = (ratio) => (ratio >= TEXT_RATIO ? 'Text' : ratio >= LARGE_RATIO ? 'Large text' : 'Not for text')
