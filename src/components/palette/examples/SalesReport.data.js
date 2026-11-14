// Sales report: a kiosk's weekly report. The stacked bars are the artefact: the
// five brand colours are the five product categories, so the chart is the one
// place a palette is judged as data colours. The figure's change is the success;
// everything else is neutral.
//
// Plain data, no React. Every figure (day totals, shares, the headline, the best
// day) is added up from the one table below, so the chart, the table and the
// aria-label cannot disagree. A category colour closer than 3:1 to the canvas is
// flagged with its ratio, so the chart says when it cannot be read by colour alone.
import { contrastRatio } from '../../../utils/colors.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'neutral']

// Every text colour the scene sets and what it reads against.
export const TEXT_RECIPE = [
  { el: 'headline figure, table, category names', ink: 'text', ground: 'canvas' },
  { el: 'axis ticks, day names, day totals, column headings', ink: 'muted', ground: 'canvas' },
  { el: 'change line', ink: 'success-ink', ground: 'canvas' },
]

export const COPY = {
  week: 'Week of 9 November',
  company: 'Third Wave Kiosk · Weekly report',
  tableLabel: 'Sales by category, week of 9 November',
  columns: ['Category', 'Sales', 'Share', 'Change'],
  total: 'Total',
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Dollars per day, Monday to Sunday, and last week's change per category.
const CATEGORIES = [
  { name: 'Coffee', role: 'primary', days: [960, 1040, 1070, 1110, 1380, 1510, 1220], change: 610 },
  { name: 'Food', role: 'secondary', days: [610, 650, 660, 700, 840, 960, 740], change: 320 },
  { name: 'Retail beans', role: 'accent', days: [250, 270, 280, 290, 340, 450, 330], change: 180 },
  { name: 'Catering', role: 'deep', days: [280, 300, 310, 300, 330, 140, 180], change: -90 },
  { name: 'Gift cards', role: 'subtle', days: [80, 80, 90, 120, 120, 320, 110], change: 240 },
]

// Pixels per dollar: the best day, $3,380, stands 220px tall.
export const SCALE = 0.065
export const TICKS = [0, 1000, 2000, 3000].map((v) => ({ text: v ? `$${v / 1000}k` : '0', y: v * SCALE }))
export const GRID = [0, 65, 130, 195]

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
export const dollars = (n) => `$${group(n)}`
const signed = (n) => `${n < 0 ? '−' : '+'}$${group(Math.abs(n))}`
const sum = (list) => list.reduce((a, b) => a + b, 0)

/**
 * Everything the scene draws, worked out for one palette.
 * @param {object} roles derivePaletteRoles() output
 */
export function reportFor(roles) {
  const cats = CATEGORIES.map((c, i) => {
    const ratio = contrastRatio(roles[c.role], roles.canvas)
    return { ...c, i, fail: ratio < 3, ratio: `${ratio.toFixed(1)}:1`, total: sum(c.days) }
  })
  const grand = sum(cats.map((c) => c.total))
  const days = DAYS.map((name, d) => ({
    name,
    total: sum(cats.map((c) => c.days[d])),
    segs: cats.map((c) => ({ i: c.i, role: c.role, fail: c.fail, h: c.days[d] * SCALE })),
  }))
  // Direct labels sit beside Sunday's stack at each segment's middle, kept 18px apart.
  let rise = 0
  const ys = cats.map((c) => {
    const h = c.days[6] * SCALE
    const y = rise + h / 2
    rise += h + 2
    return y
  })
  for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] < 18) ys[i] = ys[i - 1] + 18
  const best = days.reduce((a, b) => (b.total > a.total ? b : a))
  return {
    cats,
    days,
    labels: cats.map((c, i) => ({ ...c, y: ys[i] })),
    rows: cats.map((c) => ({ ...c, sales: dollars(c.total), share: `${Math.round((c.total / grand) * 100)}%`, delta: signed(c.change) })),
    totals: { sales: dollars(grand), share: '100%', delta: signed(sum(cats.map((c) => c.change))) },
    headline: dollars(grand),
    up: `up ${dollars(sum(cats.map((c) => c.change)))} on last week`,
    chartLabel: `Stacked bar chart of daily sales by category for 9 to 15 November. ${FULL_DAYS[days.indexOf(best)]} was the best day at ${dollars(best.total)}. The table below has every figure.`,
  }
}
