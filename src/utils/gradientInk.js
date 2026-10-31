// Which ink to set over a gradient. The candidates are near-black and near-white (not
// pure); the winner is the one with the higher worst-case contrast against every stop
// and the midpoint between each neighbouring pair, since text may sit over any of them.
import { contrastRatio } from './colors'

export const INK_DARK = { hex: '#181818', css: 'oklch(0.2 0 0)' }
export const INK_LIGHT = { hex: '#FAFAFA', css: 'oklch(0.98 0 0)' }
export const BODY_TEXT_RATIO = 4.5

const channel = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
const midpoint = (a, b) => `#${[0, 1, 2].map((i) => Math.round((channel(a, i) + channel(b, i)) / 2).toString(16).padStart(2, '0')).join('')}`

/** The colours text can sit on: each stop and the middle of each neighbouring pair, in position order. */
export function inkSamples(stops) {
  const sorted = [...stops].sort((a, b) => a.position - b.position).map((s) => s.color)
  const out = []
  sorted.forEach((c, i) => {
    out.push(c)
    if (sorted[i + 1]) out.push(midpoint(c, sorted[i + 1]))
  })
  return out
}

const worst = (ink, samples) => Math.min(...samples.map((c) => contrastRatio(ink.hex, c)))

/** { css, ratio, low }: the ink to use, its worst-case ratio to one decimal place, and whether it misses 4.5:1. */
export function pickInk(stops) {
  const samples = inkSamples(stops)
  const dark = worst(INK_DARK, samples)
  const light = worst(INK_LIGHT, samples)
  const ink = dark >= light ? INK_DARK : INK_LIGHT
  const ratio = Math.floor(Math.max(dark, light) * 10) / 10
  return { css: ink.css, hex: ink.hex, ratio, low: ratio < BODY_TEXT_RATIO }
}
