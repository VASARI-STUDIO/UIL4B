// Sundial: a home battery and solar dashboard, the Product example.
//
// Every figure the scene prints comes from the one hourly array below and a
// small battery simulation run over it at module load: the lead export figure,
// its credit, the battery ring, "full by", the chart and the table total. Change
// a number in HOURS and every one of them moves together, so the scene can
// never print a total that disagrees with its own chart.
//
// Pure and DOM-free, so tests read ROLES, TEXT_RECIPE and the derived figures without
// rendering anything.
import { brandAsText, fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

// The roles the scene paints. A test renders the scene and checks that every
// one of these is on at least one leaf element.
export const ROLES = [
  'primary', 'secondary', 'accent', 'subtle', 'deep',
  'success', 'warning', 'error', 'info', 'neutral',
]

// Text recipe: every text colour the scene sets and the floor it must clear.
// `ink` names where the colour comes from, for the contrast test.
export const TEXT_RECIPE = [
  { el: 'lead figure', ink: 'text', large: true },
  { el: 'labels, axis, meta', ink: 'muted', large: false },
  { el: 'credit line', ink: 'success-ink', large: false },
  // The label sits on a --pv-canvas plate over the plot, so its grounds are [surface, canvas].
  { el: 'now label', ink: 'brandAsText:accent', grounds: ['surface', 'canvas'], large: false },
  // Each alert row's text is inkOnField(tint, {on: <tone>-ink, text, canvas}) on its own tint.
  { el: 'alert rows', ink: 'inkOnField:warning-tint|error-tint|info-tint', large: false },
  { el: 'ring percentage', ink: 'text', large: true },
]

// kW, averaged over each hour of the day (index 0 is 00:00 to 01:00).
const SOLAR = [0, 0, 0, 0, 0, 0, 0.1, 0.6, 1.5, 2.6, 3.6, 4.4, 4.9, 5.1, 4.9, 4.3, 3.4, 2.2, 1.0, 0.2, 0, 0, 0, 0]
const LOAD = [0.5, 0.4, 0.4, 0.4, 0.4, 0.5, 0.9, 1.6, 1.4, 0.8, 0.7, 0.8, 1.1, 0.9, 0.8, 0.9, 1.3, 2.2, 2.6, 2.4, 1.9, 1.4, 0.9, 0.6]

export const BATTERY_KWH = 13.5
const RESERVE_KWH = 1.35 // the battery never drains below 10%
const CHARGE_KW = 1.9
const DISCHARGE_KW = 5
const START_KWH = 3.4
export const FEED_IN_CENTS = 9
export const NOW_H = 14 // "now" is the start of the 14:00 hour

// Same time yesterday, kWh, for the table's Change column.
const YESTERDAY = { solar: 21.6, battery: 2.9, grid: 3.4 }

const round1 = (v) => Math.round(v * 10) / 10

// One pass over the day: solar serves the house first, then charges the
// battery, then exports; a shortfall is met by the battery, then the grid.
function simulate() {
  let soc = START_KWH
  let fullAt = null
  const hours = SOLAR.map((solar, h) => {
    const net = solar - LOAD[h]
    let battery = 0 // kW out of the battery into the house
    let grid = 0 // kW imported
    let exported = 0
    if (net >= 0) {
      const rate = Math.min(net, CHARGE_KW)
      const charge = Math.min(rate, BATTERY_KWH - soc)
      // Full part-way through this hour, at the rate it charges in this hour.
      if (fullAt === null && charge > 0 && soc + charge >= BATTERY_KWH - 1e-9) {
        fullAt = h + (BATTERY_KWH - soc) / rate
      }
      soc += charge
      exported = net - charge
    } else {
      battery = Math.max(0, Math.min(-net, DISCHARGE_KW, soc - RESERVE_KWH))
      soc -= battery
      grid = -net - battery
    }
    return { h, solar, load: LOAD[h], battery, grid, exported, soc }
  })
  return { hours, fullAt }
}

const SIM = simulate()
export const HOURS = SIM.hours

const sum = (list, key) => list.reduce((t, x) => t + x[key], 0)
const past = HOURS.slice(0, NOW_H)

const exportedKwh = sum(past, 'exported')
const socNow = HOURS[NOW_H - 1].soc

const hhmm = (h) => {
  const m = Math.round(h * 60)
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const sources = [
  { id: 'solar', name: 'Solar', role: 'primary', kwh: sum(past, 'solar') },
  { id: 'battery', name: 'Battery', role: 'secondary', kwh: sum(past, 'battery') },
  { id: 'grid', name: 'Grid import', role: 'deep', kwh: sum(past, 'grid') },
]
const total = sources.reduce((t, s) => t + s.kwh, 0)

export const FIGURES = {
  now: hhmm(NOW_H),
  exported: round1(exportedKwh).toFixed(1),
  credit: ((exportedKwh * FEED_IN_CENTS) / 100).toFixed(2),
  socKwh: round1(socNow).toFixed(1),
  socPct: Math.round((socNow / BATTERY_KWH) * 100),
  fullBy: SIM.fullAt === null ? null : hhmm(SIM.fullAt),
  total: round1(total).toFixed(1),
  sources: sources.map((s) => {
    const delta = ((s.kwh - YESTERDAY[s.id]) / YESTERDAY[s.id]) * 100
    return {
      ...s,
      kwh: round1(s.kwh).toFixed(1),
      share: total ? Math.round((s.kwh / total) * 100) : 0,
      delta: Math.round(delta),
    }
  }),
}

// ── The chart's geometry ────────────────────────────────────────────────────
// A 240 x 60 box: 10 units an hour, 10 units a kW, drawn with
// preserveAspectRatio="none" so it fills whatever width it is given. Labels
// are HTML laid over it, so they never stretch.
export const KW_MAX = 6
const W = 240
const H = 60
const x = (h) => (h / 24) * W
const y = (kw) => H - (kw / KW_MAX) * H

// Points at each hour's midpoint, plus both edges, so the areas meet the axes.
function line(values) {
  const pts = values.map((v, h) => [x(h + 0.5), y(v)])
  return [[0, y(values[0])], ...pts, [W, y(values[values.length - 1])]]
}
const fmt = (pts) => pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(2)}`).join(' L')

const tops = {
  solar: HOURS.map((r) => r.solar),
  battery: HOURS.map((r) => r.solar + r.battery),
  grid: HOURS.map((r) => r.solar + r.battery + r.grid),
}
const area = (top, bottom) => {
  const t = line(top)
  const b = bottom ? line(bottom).reverse() : [[W, H], [0, H]]
  return `M${fmt(t)} L${fmt(b)} Z`
}

export const CHART = {
  W, H,
  nowX: x(NOW_H),
  nowPct: (NOW_H / 24) * 100,
  areas: [
    { id: 'solar', role: 'primary', d: area(tops.solar, null), edge: `M${fmt(line(tops.solar))}` },
    { id: 'battery', role: 'secondary', d: area(tops.battery, tops.solar), edge: `M${fmt(line(tops.battery))}` },
    { id: 'grid', role: 'deep', d: area(tops.grid, tops.battery), edge: `M${fmt(line(tops.grid))}` },
  ],
  // Direct labels: each sits on its own area at the hour it is thickest.
  labels: [
    { name: 'Solar', role: 'primary', h: 13, kw: tops.solar[13], beforeNow: true },
    { name: 'Battery', role: 'secondary', h: 19, kw: tops.battery[19] },
    { name: 'Grid', role: 'deep', h: 3, kw: tops.grid[3] },
  // A label that would straddle the now line ends at it instead, so the line never crosses its text.
  ].map((l) => ({ ...l, left: l.beforeNow ? (NOW_H / 24) * 100 : ((l.h + 0.5) / 24) * 100, top: (y(l.kw) / H) * 100 })),
  ticks: [0, 3, 6, 9, 12, 15, 18, 21, 24],
  kw: [6, 4, 2, 0],
}

const ALERT_TONES = ['warning', 'error', 'info']

/**
 * The colours this scene works out per palette and mode: the accent set as
 * text, an ink for each alert row on its own tint, and an edge for the solar
 * field when it would melt into the surface.
 *
 * The "Now" label sits on a canvas plate over the plot (a surface), so the
 * accent is measured against both grounds, not the surface alone.
 * @param {object} r derivePaletteRoles() output
 */
export function sundialVars(r) {
  const now = brandAsText(r.accent, [r.surface, r.canvas])
  const vars = {
    '--sd-now-ink': now.hex,
    '--sd-solar-edge': fieldEdge(r.primary, r.surface, r.borderStrong),
    // Neutral linework holds at the dark canvas only one step stronger.
    '--sd-line': r.mode === 'dark' ? r.borderStrong : r.border,
  }
  // The tone's own ink is kept when it clears 4.5:1 on its tint; otherwise the
  // neutral text or canvas, or a pole, does.
  for (const tone of ALERT_TONES) {
    const { ink, tint } = r[tone]
    vars[`--sd-${tone}-ink`] = inkOnField(tint, { on: ink, text: r.text, canvas: r.canvas }).hex
  }
  return { vars, nowAdjusted: now.adjusted }
}
