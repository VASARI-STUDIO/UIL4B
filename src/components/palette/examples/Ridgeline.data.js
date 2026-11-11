// "Ridgeline": a trail-run app's activity page, painted with the user's palette.
// A real loop on Mt Coot-tha (OpenStreetMap tracks, NASA SRTM heights) with the route
// on the map (primary), the start and finish (deep), the steepest stretch (accent), the
// height profile (secondary line over a subtle ground) and the splits underneath.
//
// Plain data, no React, so tests read the roles, the text recipe and the figures without
// a DOM. Every figure on the page comes from the one ELEV array and the pace rule below,
// so the page cannot print a total that disagrees with its own chart.
import { fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'
import { mixHex, contrastRatio } from '../../../utils/colors.js'
import { ELEV, LENGTH, STEP, STRETCHES } from './Ridgeline.route.js'

export { LENGTH, STEP }

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral']

// What each text sets its colour from, for the contrast sweep.
export const TEXT_RECIPE = [
  { el: 'wordmark, title, figures, split paces, segment names, kudos', ink: 'text', large: false },
  { el: 'nav, labels, units, axis, map labels, footer credit', ink: 'muted', large: false },
  { el: 'record, finish', ink: 'inkOnField:primary', large: false },
  { el: 'pause, resume', ink: 'inkOnField:secondary', large: false },
  { el: 'avatar initials, the picked row', ink: 'inkOnField:subtle', large: false },
  { el: 'PR badge', ink: 'inkOnField:accent', large: false },
  { el: 'fastest', ink: 'success-ink', large: false },
]

export const BRAND = {
  name: 'Ridgeline',
  nav: ['Home', 'Routes', 'Log'],
  record: 'Record',
  initials: 'MC',
}

export const ACTIVITY = {
  title: 'Saturday run',
  when: '6:14 am',
  place: 'Mt Coot-tha, Brisbane',
  kudos: 18,
}

export const CREDIT = {
  map: 'Map © OpenStreetMap contributors',
  mapUrl: 'https://www.openstreetmap.org/copyright',
  elevation: 'Elevation: NASA SRTM (public domain), via OpenTopoData',
}

// ── The ground: height at any distance along the route ───────────────────────
const LAST = ELEV.length - 1
/** Metres along the route that sample `i` was taken at (the last one is at the end). */
const distAt = (i) => (i >= LAST ? LENGTH : i * STEP)

/** Ground height in metres at `m` metres along the route, between the samples. */
export function elevAt(m) {
  const d = Math.min(Math.max(m, 0), LENGTH)
  const i = Math.min(Math.floor(d / STEP), LAST - 1)
  const a = distAt(i)
  const b = distAt(i + 1)
  return ELEV[i] + (ELEV[i + 1] - ELEV[i]) * ((d - a) / (b - a))
}

/** Metres climbed and descended between two distances, following every sample in between. */
function changeBetween(a, b) {
  const pts = [elevAt(a)]
  for (let i = 0; i <= LAST; i++) if (distAt(i) > a && distAt(i) < b) pts.push(ELEV[i])
  pts.push(elevAt(b))
  let up = 0
  let down = 0
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i] - pts[i - 1]
    if (d > 0) up += d
    else down -= d
  }
  return { up, down }
}

export const MIN = Math.min(...ELEV)
export const MAX = Math.max(...ELEV)
/** Where the highest sample is, in metres along the route. */
export const PEAK_AT = distAt(ELEV.indexOf(MAX))
const GAIN = Math.round(changeBetween(0, LENGTH).up)

// ── The pace: slower on a climb, quicker on a descent, averaging 7:09 a km ───
const AVERAGE_PACE = 7 * 60 + 9
const km = (m) => m / 1000

const rawSplits = []
for (let from = 0; from < LENGTH; from += 1000) {
  const to = Math.min(from + 1000, LENGTH)
  const len = to - from
  const { up, down } = changeBetween(from, to)
  // Seconds a km: flat running, plus the climb and less the descent, each per km of the split.
  const raw = 380 + 0.55 * (up / km(len)) - 0.2 * (down / km(len))
  rawSplits.push({ from, to, len, up, down, raw, net: elevAt(to) - elevAt(from) })
}
// One scale for all of them, so the whole run averages the stated pace.
const scale = (AVERAGE_PACE * km(LENGTH)) / rawSplits.reduce((t, s) => t + s.raw * km(s.len), 0)
const withTime = rawSplits.map((s) => {
  const pace = Math.round(s.raw * scale)
  return { ...s, pace, time: Math.round(pace * km(s.len)) }
})
const fastestPace = Math.min(...withTime.map((s) => s.pace))
const TOTAL_TIME = withTime.reduce((t, s) => t + s.time, 0)

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`
/** "+34 m" or "−18 m", with a real minus sign. */
const signed = (m) => `${m < 0 ? '−' : '+'}${Math.abs(Math.round(m))} m`

export const SPLITS = withTime.map((s, i) => ({
  n: s.len < 1000 ? (km(s.from) + km(s.len)).toFixed(1) : String(i + 1),
  from: s.from,
  to: s.to,
  pace: mmss(s.pace),
  elev: signed(s.net),
  fastest: s.pace === fastestPace,
  // Bar length is speed, so the quickest km is the longest.
  bar: Math.round((fastestPace / s.pace) * 100),
}))

/** Seconds spent between two distances, at the pace of each split they cross. */
function timeBetween(a, b) {
  let t = 0
  for (const s of withTime) {
    const lo = Math.max(a, s.from)
    const hi = Math.min(b, s.to)
    if (hi > lo) t += (s.pace * km(hi - lo))
  }
  return t
}

// ── The steepest stretch: the sharpest 300 m of the route, from the samples ──
const WINDOW = 3 * STEP
let steepAt = 0
for (let i = 0; i + 3 < LAST; i++) if (ELEV[i + 3] - ELEV[i] > ELEV[steepAt + 3] - ELEV[steepAt]) steepAt = i
const steepRise = ELEV[steepAt + 3] - ELEV[steepAt]
export const STEEPEST = {
  from: steepAt * STEP,
  to: steepAt * STEP + WINDOW,
  // "1 in N": N metres along for every metre up.
  oneIn: Math.round(WINDOW / steepRise),
  label: `Steepest, 1 in ${Math.round(WINDOW / steepRise)}`,
}

// ── The segments tab: the named tracks of the route ─────────────────────────
const prIndex = STRETCHES.reduce((best, s, i) => {
  const overlap = (x) => Math.max(0, Math.min(x.to, STEEPEST.to) - Math.max(x.from, STEEPEST.from))
  return overlap(s) > overlap(STRETCHES[best]) ? i : best
}, 0)
/** How much quicker the record run was than the last best, in seconds. */
const PR_BY = 74

export const SEGMENTS = STRETCHES.map((s, i) => ({
  name: s.name,
  from: s.from,
  to: s.to,
  length: `${km(s.to - s.from).toFixed(2)} km`,
  gain: `${Math.round(changeBetween(s.from, s.to).up)} m up`,
  time: mmss(timeBetween(s.from, s.to)),
  pr: i === prIndex,
  prNote: i === prIndex ? `Previous best ${mmss(timeBetween(s.from, s.to) + PR_BY)}` : '',
}))
export const PR_INDEX = prIndex

// ── The page's figures ───────────────────────────────────────────────────────
export const STATS = [
  { label: 'Distance', value: km(LENGTH).toFixed(2), unit: 'km' },
  { label: 'Moving time', value: hms(TOTAL_TIME), unit: '' },
  { label: 'Elevation gain', value: String(GAIN), unit: 'm' },
]

// ── The elevation chart: a 600 x 160 box, drawn stretched ───────────────────
export const CHART = (() => {
  const w = 600
  const h = 160
  // Room under the lowest point for its label, and above the highest for its label.
  const lo = MIN - 70
  const hi = MAX + 55
  const x = (m) => (m / LENGTH) * w
  const y = (e) => h - ((e - lo) / (hi - lo)) * h
  const pt = (i) => `${x(distAt(i)).toFixed(1)} ${y(ELEV[i]).toFixed(1)}`
  const line = ELEV.map((_, i) => `${i ? 'L' : 'M'}${pt(i)}`).join('')
  const steepPts = [0, 1, 2, 3].map((k) => `${k ? 'L' : 'M'}${pt(steepAt + k)}`).join('')
  const pct = (m, e) => ({ left: `${((m / LENGTH) * 100).toFixed(2)}%`, top: `${((y(e) / h) * 100).toFixed(2)}%` })
  return {
    w,
    h,
    line,
    area: `${line}L${w} ${h}L0 ${h}Z`,
    steep: steepPts,
    at: (m) => pct(m, elevAt(m)),
    max: pct(PEAK_AT, MAX),
    min: pct(distAt(ELEV.indexOf(MIN)), MIN),
    steepTag: pct((STEEPEST.from + STEEPEST.to) / 2, (ELEV[steepAt] + ELEV[steepAt + 3]) / 2),
    axis: ['0', '5 km', `${km(LENGTH).toFixed(1)} km`],
    axisAt: ['0%', `${((5000 / LENGTH) * 100).toFixed(2)}%`, '100%'],
  }
})()

/** What the scrub reads at `m` metres along the route. */
export function readoutAt(m) {
  const d = Math.min(Math.max(m, 0), LENGTH)
  const slope = (elevAt(Math.min(d + 50, LENGTH)) - elevAt(Math.max(d - 50, 0))) / (Math.min(d + 50, LENGTH) - Math.max(d - 50, 0))
  const pct = Math.round(Math.abs(slope) * 100)
  const grade = pct < 2 ? 'Flat' : `${slope > 0 ? 'Climbing' : 'Descending'} ${pct}%`
  return { km: km(d).toFixed(2), height: `${Math.round(elevAt(d))} m`, grade }
}

// ── Live tracking: part-way round the climb ─────────────────────────────────
const HERE = 4200
export const LIVE = (() => {
  const split = withTime.find((s) => HERE >= s.from && HERE <= s.to) || withTime[0]
  return {
    at: HERE,
    figures: [
      { label: 'Distance', value: km(HERE).toFixed(2), unit: 'km' },
      { label: 'Time', value: hms(timeBetween(0, HERE)), unit: '' },
      { label: 'Pace', value: mmss(split.pace), unit: '/km' },
      { label: 'Climb', value: String(Math.round(changeBetween(0, HERE).up)), unit: 'm' },
    ],
  }
})()

// A hover or pressed fill that moves away from the ink, so the label still reads on it.
function pressFills(fill, ink, r) {
  const away = contrastRatio(ink, r.canvas) >= contrastRatio(ink, r.text) ? r.canvas : r.text
  return { hover: mixHex(fill, away, 0.14), press: mixHex(fill, away, 0.28) }
}

/**
 * The colours this scene works out per palette and mode: the ink on each filled
 * control, the edges a pale or near-black field needs against its ground, and the
 * hover and pressed fills of the two buttons.
 * @param {object} r derivePaletteRoles() output
 */
export function ridgelineVars(r) {
  const keep = Boolean(r.pair)
  const grounds = { text: r.text, canvas: r.canvas }
  const own = (fill, on) => inkOnField(fill, { on, ...grounds }, { keep }).hex
  const primaryInk = own(r.primary, r.onPrimary)
  const secondaryInk = own(r.secondary, r.onSecondary)
  const primary = pressFills(r.primary, primaryInk, r)
  const secondary = pressFills(r.secondary, secondaryInk, r)
  return {
    '--rl-primary-ink': primaryInk,
    '--rl-primary-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
    '--rl-primary-hover': primary.hover,
    '--rl-primary-press': primary.press,
    '--rl-secondary-ink': secondaryInk,
    '--rl-secondary-edge': fieldEdge(r.secondary, r.canvas, r.borderStrong),
    '--rl-secondary-hover': secondary.hover,
    '--rl-secondary-press': secondary.press,
    '--rl-subtle-ink': own(r.subtle, r.onSubtle),
    '--rl-accent-ink': own(r.accent, r.onAccent),
    '--rl-accent-edge': fieldEdge(r.accent, r.canvas, r.borderStrong),
    '--rl-subtle-edge': fieldEdge(r.subtle, r.canvas, r.borderStrong),
  }
}
