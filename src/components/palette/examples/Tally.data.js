// E6, "Tally": a spending card, the Product example in the Pro set. The card is
// the primary; the five spending categories are the five brand slots, side by
// side in one budget bar, which makes this the set's test of neighbouring
// colours. Plain data, no React, so tests read the roles, the text recipe and
// the figures without a DOM.
//
// The budget figure, the bar and the legend are all derived from CATS, so the
// page can never print a total that disagrees with its own bar.
import { contrastRatio } from '../../../utils/colors.js'
import { fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'warning', 'error', 'info', 'neutral']

export const TEXT_RECIPE = [
  { el: 'figure, merchants, amounts', ink: 'text', large: true },
  { el: 'labels, legend shares, dates, transaction notes', ink: 'muted', large: false },
  { el: 'card text', ink: 'inkOnField:primary', large: false },
  { el: 'frozen action', ink: 'inkOnField:warning-tint', large: false },
  { el: 'refund, pending, declined, interest', ink: 'success-ink|warning-ink|error-ink|info-ink', large: false },
]

export const BUDGET = 1600
export const DAYS_LEFT = 19

// Spending so far this month, in dollars, one entry per brand slot.
export const CATS = [
  { name: 'Groceries', role: 'primary', amount: 412.3 },
  { name: 'Transport', role: 'secondary', amount: 186 },
  { name: 'Eating out', role: 'accent', amount: 244.9 },
  { name: 'Bills', role: 'deep', amount: 389.4 },
  { name: 'Other', role: 'subtle', amount: 52 },
]

const cents = (n) => Math.round(n * 100)
export const money = (n) => `$${(cents(n) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

const spent = CATS.reduce((t, c) => t + cents(c.amount), 0) / 100

export const FIGURES = {
  spent: money(spent),
  line: `of ${money(BUDGET).replace('.00', '')} budget · ${DAYS_LEFT} days left`,
  left: BUDGET - spent,
  cats: CATS.map((c) => ({ ...c, text: money(c.amount), share: Math.round((c.amount / spent) * 100) })),
}

// `tone` marks the transactions that carry a state: each has a word and a
// shape as well as a colour.
export const TXNS = [
  {
    day: 'Today',
    rows: [
      { who: 'Corner Grocer, Newtown', ini: 'CG', amount: -64.2 },
      { who: 'Train top-up', ini: 'TT', amount: -40 },
      { who: 'Trade Depot', ini: 'TD', amount: -112.85, tone: 'warning', mark: '■', note: 'Pending' },
    ],
  },
  {
    day: 'Yesterday',
    rows: [
      { who: 'Homeware Co.', ini: 'HC', amount: 29, tone: 'success', mark: '▲', note: 'Refund' },
      { who: 'Ride share', ini: 'RS', amount: -18.4, tone: 'error', mark: '●', note: 'Declined · card frozen' },
      { who: 'Interest earned', ini: '%', amount: 1.12, tone: 'info', mark: '◆', note: '' },
    ],
  },
]
export const amountText = (n) => `${n < 0 ? '−' : '+'}${money(Math.abs(n))}`

export const CARD = { last4: '4471', name: 'Everyday' }
export const ACTIONS = ['Freeze', 'Details', 'Limits']

/**
 * The colours this scene works out per palette and mode: the ink on the card,
 * the edge a pastel or near-black card needs against the page, the outline for
 * a chip or stripe too close to the card's own colour, the gap between two
 * neighbouring categories (3px when they are within 1.5:1, else 2px), and the
 * ink on the frozen action. For a two-colour pair nothing is corrected, and the
 * rows that carry a state are left out.
 * @param {object} r derivePaletteRoles() output
 */
export function tallyVars(r) {
  const keep = Boolean(r.pair)
  const grounds = { text: r.text, canvas: r.canvas }
  const cardInk = inkOnField(r.primary, { on: r.onPrimary, ...grounds }, { keep }).hex
  // A feature on the card that is nearly its colour gets a hairline in the card's ink.
  const onCard = (fill) => (contrastRatio(fill, r.primary) < 1.5 ? cardInk : 'transparent')
  const vars = {
    '--ty-card-ink': cardInk,
    '--ty-card-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
    '--ty-chip-edge': onCard(r.subtle),
    '--ty-stripe-edge': onCard(r.deep),
    '--ty-frozen-ink': inkOnField(r.warning.tint, { on: r.warning.ink, ...grounds }).hex,
  }
  CATS.forEach((c, i) => {
    vars[`--ty-edge-${i + 1}`] = fieldEdge(r[c.role], r.canvas, r.borderStrong)
    if (i > 0) vars[`--ty-gap-${i + 1}`] = contrastRatio(r[CATS[i - 1].role], r[c.role]) < 1.5 ? '3px' : '2px'
  })
  return { vars, pair: keep }
}
