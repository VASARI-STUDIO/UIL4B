import { contrastRatio, hexToHct, hexToHsl, hctToHex, hslToHex } from './colors'

// Palette-variation engine for the Palette Builder. Generates named HCT
// transforms of the current palette and ranks them with scorePalette so the
// panel recommends GOOD shifts first instead of listing arbitrary filters.
// All maths run in HCT (perceptual) with an HSL fallback per colour, so a
// solver failure degrades one swatch instead of killing the panel.

const HEX6_RE = /^#[0-9a-fA-F]{6}$/

function safeHct(hex) {
  try {
    const [h, c, t] = hexToHct(hex)
    if ([h, c, t].every(Number.isFinite)) return [h, c, t]
  } catch { /* fall through */ }
  const [h, s, l] = hexToHsl(hex)
  return [h, s * 0.6, l]
}

function safeHex(h, c, t, fallback) {
  try { return hctToHex(h, c, t).toUpperCase() } catch { /* HSL route */ }
  try { return hslToHex(((h % 360) + 360) % 360, Math.min(100, Math.max(0, c)), Math.min(95, Math.max(5, t))).toUpperCase() } catch { return fallback }
}

const wrap360 = h => ((h % 360) + 360) % 360
const clampTone = t => Math.min(98, Math.max(3, t))

// Pull a hue toward a pole (30° = warm amber, 210° = cool azure) by amount 0-1.
function pullHue(h, pole, amount) {
  const diff = ((pole - h + 540) % 360) - 180
  return wrap360(h + diff * amount)
}

// ── scorePalette ─────────────────────────────────────────────────────────────
// 0–100 quality estimate of a palette AS A UI SYSTEM, built from four
// measurable components (no vibes):
//   • tone range (35): a usable system needs light AND dark — reward a
//     max−min tone spread up to ~60, punish washed-flat palettes.
//   • tone evenness (20): tones should ladder, not clump — measured as the
//     stdev of gaps between sorted tones vs an even ladder.
//   • chroma profile (25): mean chroma in the 25–60 sweet spot (vivid enough
//     to brand, calm enough to ship) + reward having one low-chroma neutral.
//   • distinctness (20): penalise near-duplicate swatches (ΔH<12 & Δtone<8)
//     and reward legible ink contrast on every swatch.
export function scorePalette(hexes) {
  const list = (Array.isArray(hexes) ? hexes : []).filter(h => typeof h === 'string' && HEX6_RE.test(h))
  if (list.length < 2) return 0
  const hcts = list.map(safeHct)

  const tones = hcts.map(x => x[2]).sort((a, b) => a - b)
  const spread = tones[tones.length - 1] - tones[0]
  const toneRange = Math.min(1, spread / 60) * 35

  let evenness = 20
  if (tones.length > 2) {
    const gaps = tones.slice(1).map((t, i) => t - tones[i])
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length)
    evenness = Math.max(0, 1 - sd / 30) * 20
  }

  const chromas = hcts.map(x => x[1])
  const meanC = chromas.reduce((a, b) => a + b, 0) / chromas.length
  const sweet = meanC >= 25 && meanC <= 60 ? 1 : Math.max(0, 1 - Math.abs(meanC - 42.5) / 60)
  const hasNeutral = chromas.some(c => c < 14) ? 1 : 0.6
  const chromaScore = sweet * hasNeutral * 25

  let dupPenalty = 0
  for (let i = 0; i < hcts.length; i++) {
    for (let j = i + 1; j < hcts.length; j++) {
      const dh = Math.abs(hcts[i][0] - hcts[j][0]) % 360
      const hueD = dh > 180 ? 360 - dh : dh
      if (hueD < 12 && Math.abs(hcts[i][2] - hcts[j][2]) < 8) dupPenalty += 6
    }
  }
  const legible = list.filter(h => Math.max(contrastRatio(h, '#FFFFFF'), contrastRatio(h, '#000000')) >= 4.5).length / list.length
  const distinct = Math.max(0, legible * 20 - dupPenalty)

  return Math.round(Math.min(100, toneRange + evenness + chromaScore + distinct))
}

// One transform applied to every colour: fn([h,c,t], i) → [h,c,t].
function mapPalette(hexes, fn) {
  return hexes.map((hex, i) => {
    const [h, c, t] = safeHct(hex)
    const [nh, nc, nt] = fn([h, c, t], i)
    return safeHex(wrap360(nh), Math.max(0, nc), clampTone(nt), hex)
  })
}

// Named variation recipes — each is a *system-level* shift, not a per-swatch
// tweak, so the palette keeps its internal relationships.
const RECIPES = [
  { id: 'warmer', label: 'Warmer', desc: 'Hues pulled toward amber', fn: ([h, c, t]) => [pullHue(h, 30, 0.22), c * 1.02, t] },
  { id: 'cooler', label: 'Cooler', desc: 'Hues pulled toward azure', fn: ([h, c, t]) => [pullHue(h, 210, 0.22), c * 1.02, t] },
  { id: 'softer', label: 'Softer', desc: 'Chroma eased, tones lifted', fn: ([h, c, t]) => [h, c * 0.62, t + (92 - t) * 0.25] },
  { id: 'vivid', label: 'More vivid', desc: 'Chroma pushed up', fn: ([h, c, t]) => [h, c * 1.45 + 6, t] },
  { id: 'deeper', label: 'Deeper', desc: 'Tones pulled down, richer', fn: ([h, c, t]) => [h, c * 1.08, t - t * 0.28] },
  { id: 'luminous', label: 'Luminous', desc: 'Tones lifted, airy', fn: ([h, c, t]) => [h, c * 0.9, t + (96 - t) * 0.35] },
  { id: 'muted', label: 'Muted', desc: 'Editorial low-chroma read', fn: ([h, c, t]) => [h, Math.min(c * 0.45, 18), t] },
  { id: 'contrast', label: 'High contrast', desc: 'Tones spread from the middle', fn: ([h, c, t]) => [h, c, t + (t - 50) * 0.55] },
  { id: 'shift-l', label: 'Alternative A', desc: 'Whole system rotated −20°', fn: ([h, c, t]) => [h - 20, c, t] },
  { id: 'shift-r', label: 'Alternative B', desc: 'Whole system rotated +20°', fn: ([h, c, t]) => [h + 20, c, t] },
]

// paletteVariations(hexes) → [{id,label,desc,colors,score}] sorted best-first.
// The caller gates: first FREE_VARIATIONS entries are free, the rest are Pro.
export const FREE_VARIATIONS = 3

export function paletteVariations(hexes) {
  const base = (Array.isArray(hexes) ? hexes : []).filter(h => typeof h === 'string' && HEX6_RE.test(h))
  if (base.length < 2) return []
  const seen = new Set([base.join(',')])
  const out = []
  for (const r of RECIPES) {
    const colors = mapPalette(base, r.fn)
    const key = colors.join(',')
    if (seen.has(key)) continue // transform was a no-op on this palette
    seen.add(key)
    out.push({ id: r.id, label: r.label, desc: r.desc, colors, score: scorePalette(colors) })
  }
  return out.sort((a, b) => b.score - a.score)
}
