// E4, "Ridgeline": a trail-run app, the Product example. Two phone screens, one
// live and one summary, around a contour map with the route and an elevation
// profile. Plain data, no React, so tests read the roles, the text recipe and
// the figures without a DOM.
//
// The summary's figures (distance, time, climb, the fastest split, the profile)
// are all derived from the one ELEV array and the pace rule below, so the page
// can never print a total that disagrees with its own profile.
import { brandAsText, fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral']

export const TEXT_RECIPE = [
  { el: 'title, figures', ink: 'text', large: false },
  { el: 'labels, splits, tab names', ink: 'muted', large: false },
  { el: 'pause', ink: 'inkOnField:secondary', large: false },
  { el: 'finish', ink: 'inkOnField:primary', large: false },
  { el: 'selected tab', ink: 'brandAsText:primary', large: false },
  { el: 'fastest', ink: 'success-ink', large: false },
]

// ── The map: a 360 x 444 box, drawn with preserveAspectRatio "slice" ───────────
export const MAP = { w: 360, h: 444 }

// Closed, smooth ring through `n` points whose radius wobbles with the angle.
function ring(cx, cy, r, phase, n = 14) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 + 0.13 * Math.sin(3 * a + phase) + 0.07 * Math.sin(5 * a + phase * 1.7)
    return [cx + Math.cos(a) * r * k * 1.15, cy + Math.sin(a) * r * k * 0.85]
  })
  return smooth(pts, true)
}

// Catmull-Rom through the points, written as cubic Beziers.
function smooth(pts, closed = false) {
  const n = pts.length
  const at = (i) => pts[closed ? (i + n) % n : Math.min(Math.max(i, 0), n - 1)]
  const f = (v) => v.toFixed(1)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return closed ? `${d}Z` : d
}

// One path of nested rings round two summits, so the contours light up as one part.
export const CONTOURS = [
  ...Array.from({ length: 9 }, (_, i) => ring(250, 110, 22 + i * 22, 0.6)),
  ...Array.from({ length: 5 }, (_, i) => ring(60, 290, 18 + i * 20, 2.1)),
].join('')

const WAY = [[50, 400], [90, 360], [70, 310], [130, 280], [190, 300], [240, 262], [222, 208], [160, 176], [190, 128], [258, 96], [282, 60]]
const HERE = 6 // the waypoint your position sits on
export const ROUTE_DONE = smooth(WAY.slice(0, HERE + 1))
export const ROUTE_REST = smooth(WAY.slice(HERE))
export const START = WAY[0]
export const POSITION = WAY[HERE]

// ── The live screen ─────────────────────────────────────────────────────────
export const LIVE = {
  place: 'Mt Coot-tha Summit Track',
  figures: [['Distance', '4.1', 'km'], ['Time', '31:48', ''], ['Pace', '7:45', '/km']],
}

// ── The summary: one elevation array (metres at each km mark, then the finish) ──
const ELEV = [96, 118, 171, 262, 361, 402, 380, 341, 396, 338, 310]
const KM = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.6]
const sec = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const clock = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`

// Pace in seconds a km: a flat base, slower on a climb, quicker on a descent.
const SPLITS = KM.map((km, i) => {
  const d = ELEV[i + 1] - ELEV[i]
  const pace = Math.round(410 + 0.6 * Math.max(d, 0) - 0.25 * Math.max(-d, 0))
  return { n: i < 9 ? String(i + 1) : '9.6', km, pace, delta: d }
})
const fastest = Math.min(...SPLITS.map((s) => s.pace))
const slowest = Math.max(...SPLITS.map((s) => s.pace))
const totalSec = SPLITS.reduce((t, s) => t + s.pace * s.km, 0)
const up = ELEV.slice(1).reduce((t, e, i) => t + Math.max(e - ELEV[i], 0), 0)
const steepest = ELEV.slice(1).reduce((b, e, i) => (e - ELEV[i] > ELEV[b + 1] - ELEV[b] ? i : b), 0)

export const SUMMARY = {
  title: 'Saturday run',
  line: `${KM.reduce((a, b) => a + b, 0).toFixed(1)} km · ${clock(totalSec)} · ${up} m up`,
  splits: SPLITS.map((s) => ({
    n: s.n, pace: sec(s.pace), fastest: s.pace === fastest,
    // Bar length is speed, so the quickest km is the longest.
    bar: Math.round((fastest / s.pace) * 100),
    slow: s.pace === slowest,
  })),
  tabs: ['Run', 'Routes', 'Log', 'Me'],
}

// ── The elevation profile: a 240 x 70 box, drawn stretched ──────────────────
const PW = 240
const PH = 70
const lo = Math.min(...ELEV) - 10
const hi = Math.max(...ELEV) + 10
const cum = KM.reduce((a, k) => [...a, a[a.length - 1] + k], [0])
const px = (i) => (cum[i] / cum[cum.length - 1]) * PW
const py = (e) => PH - ((e - lo) / (hi - lo)) * PH
const line = ELEV.map((e, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(e).toFixed(1)}`).join('')
export const PROFILE = {
  w: PW, h: PH,
  line,
  area: `${line}L${PW} ${PH}L0 ${PH}Z`,
  steep: `M${px(steepest).toFixed(1)} ${py(ELEV[steepest]).toFixed(1)}L${px(steepest + 1).toFixed(1)} ${py(ELEV[steepest + 1]).toFixed(1)}`,
  low: `${lo + 10} m`,
  high: `${hi - 10} m`,
}

/**
 * The colours this scene works out per palette and mode: the ink on each button,
 * the selected tab's label (the primary as text), and the edges a pastel or
 * near-black field needs against its ground.
 * @param {object} r derivePaletteRoles() output
 */
export function ridgelineVars(r) {
  const keep = Boolean(r.pair)
  const own = (fill, on) => inkOnField(fill, { on, text: r.text, canvas: r.canvas }, { keep }).hex
  const tab = keep ? { hex: r.text, adjusted: false } : brandAsText(r.primary, [r.surface])
  return {
    vars: {
      '--rl-pause-ink': own(r.secondary, r.onSecondary),
      '--rl-finish-ink': own(r.primary, r.onPrimary),
      '--rl-pause-edge': fieldEdge(r.secondary, r.surface, r.borderStrong),
      '--rl-finish-edge': fieldEdge(r.primary, r.surface, r.borderStrong),
      '--rl-tab-ink': tab.hex,
      '--rl-bar-edge': fieldEdge(r.primary, r.surface, r.borderStrong),
      // Contour lines hold at the dark canvas only one step stronger.
      '--rl-line': r.mode === 'dark' ? r.borderStrong : r.border,
    },
    tabAdjusted: tab.adjusted,
  }
}
