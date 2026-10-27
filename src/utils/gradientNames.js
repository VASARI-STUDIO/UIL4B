// GENERATED GRADIENT NAMES: a two-word name and a one-line description.
//
// "Midnight Cobalt / Cobalt settling into violet ink, low key". The words say
// what is on screen and nothing else: colour nouns from the stops' OKLCH hue
// and lightness, a light word or the family's own word, and a verb that is
// fixed per family. No feelings, no uses.
//
// DOM-free and deterministic: the same design, seed and `taken` list always
// give the same name. Uniqueness is the caller's list of names to avoid (the
// session's recent names and the person's saved project names), never a
// counter, so a clash picks a different word instead of "Midnight Cobalt 2".

import { hexToOk, curtainColours, STEP_SHAPES, mulberry32 } from './gradientStyles.js'

/* ── colour nouns ────────────────────────────────────────────────────── */

// Thirty-degree OKLCH hue bands, then dark (L < 0.40), mid, light (L > 0.75).
// A fourth entry is the longer noun the description may use.
export const NOUNS = [
  ['Garnet', 'Crimson', 'Blush'],
  ['Rust', 'Coral', 'Peach'],
  [['Sienna', 'burnt sienna'], 'Amber', 'Apricot'],
  ['Bronze', 'Wattle', 'Butter'],
  ['Olive', 'Lime', 'Pistachio'],
  ['Forest', 'Emerald', 'Mint'],
  [['Teal', 'deep teal'], 'Lagoon', 'Seafoam'],
  ['Petrol', 'Cerulean', 'Ice'],
  ['Navy', 'Cobalt', 'Sky'],
  [['Ink', 'violet ink'], 'Indigo', 'Periwinkle'],
  ['Plum', 'Violet', 'Lilac'],
  ['Wine', 'Rose', 'Blossom'],
]
export const NEUTRAL_NOUNS = ['Charcoal', 'Stone', 'Porcelain']

export const BANNED_WORDS = [
  'vibrant', 'stunning', 'electric', 'neon', 'premium', 'beautiful', 'dreamy', 'ethereal',
  'mesmerising', 'cosmic', 'magical', 'gorgeous', 'luxurious', 'perfect', 'ultimate',
  'captivating', 'breathtaking', 'not just',
]

const DARK = 0.4
const LIGHT = 0.75
const MUTED = 0.06
const NEUTRAL = 0.025

const lightnessSlot = (L) => (L < DARK ? 0 : L > LIGHT ? 2 : 1)
const hueBand = (H) => Math.floor((((H % 360) + 360) % 360) / 30) % 12
// Warm hues are the reds, oranges and yellows plus the pinks.
const isWarmHue = (H) => H < 120 || H >= 330

// What one colour is called: `name` is the one word, `long` the sentence-case
// noun the description uses ("burnt sienna", "dusty rose").
export function colourNoun(hex) {
  const o = hexToOk(hex)
  const slot = lightnessSlot(o.L)
  if (o.C < NEUTRAL) {
    const n = NEUTRAL_NOUNS[slot]
    return { name: n, long: n.toLowerCase(), band: -1, slot, muted: false, L: o.L, C: o.C, H: o.H }
  }
  const band = hueBand(o.H)
  const cell = NOUNS[band][slot]
  const name = Array.isArray(cell) ? cell[0] : cell
  let long = (Array.isArray(cell) ? cell[1] : cell).toLowerCase()
  const muted = o.C < MUTED
  if (muted) long = `${isWarmHue(band * 30) ? 'dusty' : 'misty'} ${long}`
  return { name, long, band, slot, muted, L: o.L, C: o.C, H: o.H }
}

/* ── name ────────────────────────────────────────────────────────────── */

const FAMILY_WORD = { mesh: 'Haze', curtains: 'Aurora', beams: 'Beams' }
const PLAIN_WORD = { Linear: 'Drift', Radial: 'Light', Conic: 'Turn' }
const SHAPE_WORD = { arches: 'Arches', blades: 'Blades', fan: 'Fan', ribbons: 'Ribbons' }

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

function familyWord(style, params, nouns) {
  if (style === 'plain') return PLAIN_WORD[params.type] || 'Drift'
  if (style === 'steps') return SHAPE_WORD[STEP_SHAPES.includes(params.shape) ? params.shape : 'arches']
  if (style === 'horizon') {
    const sky = nouns[0]
    const hz = nouns[nouns.length - 1]
    if (isWarmHue(hz.H) && hz.C >= NEUTRAL) return hz.L > sky.L ? 'Dawn' : 'Dusk'
    return 'Horizon'
  }
  return FAMILY_WORD[style] || 'Drift'
}

// The light words for form (a): by lightness first, then muted.
function lightWords(nouns) {
  const L = mean(nouns.map((n) => n.L))
  const C = mean(nouns.map((n) => n.C))
  if (L < 0.35) return ['Midnight', 'Night', 'Deep']
  if (L > 0.75) return ['Morning', 'Pale', 'High']
  if (C < MUTED) {
    const warm = isWarmHue(nouns.reduce((a, b) => (b.C > a.C ? b : a)).H)
    return [warm ? 'Dusty' : 'Misty']
  }
  return []
}

// Seed-stable 32-bit hash of the design, so two designs with the same seed
// can still choose differently.
function designHash(stops) {
  let h = 2166136261
  for (const ch of stops.join('')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

const rotate = (list, by) => (list.length ? list.map((_, i) => list[(i + by) % list.length]) : list)

function nameCandidates(style, params, nouns, stops, seed) {
  const rng = mulberry32((seed >>> 0) + designHash(stops))
  const formA = rng() < 0.5
  const offset = Math.floor(rng() * 3)
  const light = rotate(lightWords(nouns), offset)
  const family = familyWord(style, params, nouns)
  // The most chromatic stop's noun first, then the others in that order.
  const ranked = [...nouns].sort((a, b) => b.C - a.C)
  const seen = new Set()
  const order = ranked.filter((n) => (seen.has(n.name) ? false : seen.add(n.name)))
  const out = []
  for (const n of order) {
    const a = light.map((w) => `${w} ${n.name}`)
    const b = [`${n.name} ${family}`]
    out.push(...(formA ? [...a, ...b] : [...b, ...a]))
  }
  // Last resort, still true: the temperature of the stop, or a plain field of it.
  for (const n of order) out.push(`${isWarmHue(n.H) ? 'Warm' : 'Cool'} ${n.name}`, `${n.name} Field`)
  return out
}

/* ── description ─────────────────────────────────────────────────────── */

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const SHAPE_NOUN = { arches: 'arches', blades: 'blades', fan: 'folds', ribbons: 'ribbons' }
const MAX_DESC = 60

function nounPair(a, b) {
  if (a.long !== b.long) return [a.long, b.long]
  return [a.long, `${b.L >= a.L ? 'paler' : 'deeper'} ${b.long}`]
}

function describe(style, params, nouns, finishes) {
  const first = nouns[0]
  const last = nouns[nouns.length - 1]
  const L = mean(nouns.map((n) => n.L))
  const key = L > 0.75 ? 'high key' : L < 0.35 ? 'low key' : ''
  const fx = []
  if (finishes && finishes.grain > 0) fx.push('film grain')
  if (finishes && finishes.glass) fx.push('glass bars')

  let core
  let short
  if (style === 'curtains') {
    const [c1, c2] = curtainColours(nouns.map((n) => n.hex))
    const a = colourNoun(c1).long
    const b = colourNoun(c2).long
    core = a === b ? `${a} curtains over a night sky` : `${a} and ${b} curtains over a night sky`
    short = `${a} curtains`
  } else if (style === 'beams') {
    const [beam, base] = nounPair(last, first)
    core = `${beam} beams over ${base}`
    short = `${beam} beams`
  } else if (style === 'steps') {
    const [a, b] = nounPair(first, last)
    const shape = SHAPE_NOUN[STEP_SHAPES.includes(params.shape) ? params.shape : 'arches']
    core = `${a} stepping down to ${b} in ${params.steps || 10} ${shape}`
    short = `${a} to ${b}`
  } else {
    let verb = 'into'
    if (style === 'horizon') verb = last.L > first.L ? 'rising into' : 'settling into'
    else if (style === 'mesh') verb = 'pooling with'
    else if (params.type === 'Radial') verb = 'fading out to'
    else if (params.type === 'Conic') verb = 'turning through'
    const multi = style === 'plain' || style === 'mesh'
    const [a, b] = nounPair(first, multi ? nouns[1] : last)
    const more = multi && nouns.length > 2 ? ` and ${nouns.slice(2).map((n) => n.long).join(' and ')}` : ''
    core = `${a} ${verb} ${b}${more}`
    short = `${a} ${verb.split(' ').pop()} ${b}`
  }

  // Key goes first when the line is too long, then the finishes, then the verb.
  const tries = [
    [core, key, ...fx],
    [core, ...fx],
    [core, ...fx.slice(0, 1)],
    [core],
    [short],
  ]
  for (const parts of tries) {
    const line = cap(parts.filter(Boolean).join(', '))
    if (line.length <= MAX_DESC) return line
  }
  return cap(first.long).slice(0, MAX_DESC)
}

/* ── public ──────────────────────────────────────────────────────────── */

// design: { style, stops: [hex...], params, finishes: { grain, glass }, seed }
// taken: names to avoid (recent names, saved project names).
export function generateName({ style = 'plain', stops, params = {}, finishes = {}, seed = 1, taken = [] }) {
  const hexes = stops.map((s) => (typeof s === 'string' ? s : s.color).toLowerCase())
  const nouns = hexes.map((h) => ({ ...colourNoun(h), hex: h }))
  const avoid = new Set([...taken].map((t) => String(t).toLowerCase()))
  const list = nameCandidates(style, params, nouns, hexes, seed)
  const name = list.find((c) => !avoid.has(c.toLowerCase())) || list[0]
  return { name, description: describe(style, params, nouns, finishes) }
}

// Names of the colour nouns the description uses for a design, for tests and
// for the board: the sentence-case nouns of every stop, in order.
export const stopNouns = (stops) => stops.map((s) => colourNoun(typeof s === 'string' ? s : s.color).long)
