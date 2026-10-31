// "Tally": a spending card, the Product example in the Pro set. The scene is a
// card app spent the way a bank spends a brand: the card is the one coloured
// object, the budget bar's spent part is the primary, the active tab is the
// secondary, the pace tick is the accent, and the rest is neutral. Plain data,
// no React, so tests read the roles, the text recipe and the figures without a DOM.
//
// The budget figure, the bar, the category list and the shares are all derived
// from CATS, so the page can never print a total that disagrees with its own bar.
import { contrastRatio, mixHex } from '../../../utils/colors.js'
import { fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'success', 'warning', 'error', 'info', 'neutral']

export const TEXT_RECIPE = [
  { el: 'figure', ink: 'text', large: true },
  { el: 'balance, limits heading', ink: 'text', large: true },
  { el: 'merchants, amounts, category names, nav, tabs, field labels, input values, toast, card details', ink: 'text', large: false },
  { el: 'labels, dates, shares, transaction notes, pace label, limits help lines, card detail labels and help', ink: 'muted', large: false },
  { el: 'card text', ink: 'inkOnField:primary', large: false },
  { el: 'category glyphs', ink: 'inkOnField:subtle', large: false },
  { el: 'refund, pending, declined, frozen line, overseas help line', ink: 'success-ink|warning-ink|error-ink|info-ink', large: false },
  { el: 'limit error message', ink: 'error-ink', large: false },
  { el: 'Save limits button', ink: 'on-primary', large: false },
]

export const BUDGET = 1600
export const DAYS_IN_MONTH = 31
export const DAYS_LEFT = 19

// Spending so far this month, in dollars.
export const CATS = [
  { name: 'Groceries', glyph: 'cart', amount: 412.3 },
  { name: 'Bills', glyph: 'bolt', amount: 389.4 },
  { name: 'Eating out', glyph: 'fork', amount: 244.9 },
  { name: 'Transport', glyph: 'train', amount: 186 },
  { name: 'Other', glyph: 'dots', amount: 52 },
]

const cents = (n) => Math.round(n * 100)
export const money = (n) => `$${(cents(n) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

const spent = CATS.reduce((t, c) => t + cents(c.amount), 0) / 100

// Whole-percent shares that add up to 100: each category gets its floor, then
// the largest remainders take the spare points (rounding each alone can print 99 or 101).
function shares(cats) {
  const exact = cats.map((c) => (c.amount / spent) * 100)
  const out = exact.map(Math.floor)
  let spare = 100 - out.reduce((t, n) => t + n, 0)
  exact
    .map((x, i) => [x - out[i], i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => { if (spare-- > 0) out[i] += 1 })
  return out
}
const SHARES = shares(CATS)

export const FIGURES = {
  spent: money(spent),
  line: `of ${money(BUDGET).replace('.00', '')} · ${DAYS_LEFT} days left`,
  left: money(BUDGET - spent),
  // The share of the budget spent, and where an even pace would be today.
  spentShare: Math.min(100, (spent / BUDGET) * 100),
  paceShare: ((DAYS_IN_MONTH - DAYS_LEFT) / DAYS_IN_MONTH) * 100,
  cats: CATS.map((c, i) => ({ ...c, text: money(c.amount), share: SHARES[i] })),
}

export const ACCOUNT = { name: 'Everyday account', balance: money(3412.08) }

// Each day's rows, newest first. `mark` names the merchant's drawn mark.
//   tone    the state a row always carries (the refund), with `shape` as its icon;
//   states  what a row shows in a State-menu state, by state id: a tone, a shape
//           and a note (a state carries a word and a shape as well as a colour);
//   only    the one state a row exists in (a declined payment is not in the resting list);
//   hover   draws the row as if the pointer were on it.
export const TXNS = [
  {
    day: 'Today',
    rows: [
      {
        who: 'Trade Depot Alexandria', mark: 'shelf', note: 'Hardware · Pending', amount: -112.85,
        states: {
          frozen: { tone: 'warning', shape: '■', note: 'Pending · will decline' },
          declined: { tone: 'warning', shape: '■', note: 'Pending · will decline' },
        },
      },
      { who: 'Marrickville Fresh Market', mark: 'leaf', note: 'Groceries · 2:14 pm', amount: -64.2 },
      {
        who: 'Ride share', mark: 'chevron', note: 'Transport · 11:36 am', amount: -18.4, only: 'declined',
        states: { declined: { tone: 'error', shape: '●', note: 'Declined, card frozen' } },
      },
      { who: 'Opal top-up', mark: 'ring', note: 'Transport · 8:02 am', amount: -40, hover: true },
    ],
  },
  {
    day: 'Yesterday',
    rows: [
      { who: 'Homeware Co. refund', mark: 'bowl', note: 'Refund · 3:20 pm', amount: 29, tone: 'success', shape: '▲' },
      { who: 'Interest earned', mark: 'tally', note: 'Everyday account · 12:01 am', amount: 1.12 },
    ],
  },
]

// Bills coming out in the next fortnight, shown under the balance in the wide layout.
export const DUE = [
  { who: 'Southbank Energy', mark: 'ring', note: 'Electricity · Wed 14 Oct', amount: -142.6 },
  { who: 'Fibrehome Internet', mark: 'chevron', note: 'Internet · Mon 19 Oct', amount: -89 },
  { who: 'Greenway Insurance', mark: 'shelf', note: 'Contents cover · Fri 23 Oct', amount: -64.3 },
]
export const amountText = (n) => `${n < 0 ? '−' : '+'}${money(Math.abs(n))}`

// The Upcoming tab: scheduled payments, grouped by when they fall. The first
// three are the Due soon rows, so the two lists can never disagree on a date.
const [ENERGY, INTERNET, COVER] = DUE
export const UPCOMING = [
  {
    day: 'This week',
    rows: [
      ENERGY,
      { who: 'Pulse Fitness', mark: 'tally', note: 'Membership · Thu 15 Oct', amount: -18.5 },
    ],
  },
  {
    day: 'Later this month',
    rows: [
      INTERNET,
      COVER,
      { who: 'Northside Water', mark: 'bowl', note: 'Water · Tue 27 Oct', amount: -96.4 },
    ],
  },
]

export const CARD = { last4: '4471', masked: '•••• •••• •••• 4471', expiry: '09/28' }
export const DETAILS_PIN_HELP = 'Shown only on your phone.'
export const ACTIONS = ['Freeze', 'Details', 'Limits']
export const TABS = ['Spending', 'Upcoming']
export const NAV = ['Accounts', 'Cards', 'Payments', 'Insights']
// What the small heading above the budget figure says for each nav item; Cards is the resting one.
export const NAV_HEADING = {
  Accounts: 'Accounts · October so far',
  Cards: 'October so far',
  Payments: 'Payments · October so far',
  Insights: 'Insights · October so far',
}

export const FROZEN_LINE = 'Card frozen. Payments will decline.'

// The Limits action, shown open: a focused field, a field in error, a toggle on
// and one disabled, and a toast. The error quotes the category it is about, so
// it can never disagree with the budget list.
const EATING_OUT = CATS.find((c) => c.name === 'Eating out')
export const LIMITS = {
  toast: 'Budget saved',
  budget: { label: 'Monthly budget', value: money(BUDGET).replace('.00', '') },
  eating: {
    label: 'Eating out limit',
    limit: 200,
    value: money(200).replace('.00', ''),
    error: `That's under what you've already spent this month (${money(EATING_OUT.amount)}).`,
  },
  roundUps: { label: 'Round-ups to savings', help: 'Rounds each purchase up to the next dollar.' },
  overseas: { label: 'Overseas fees', help: 'Available once your card has been active for 30 days.' },
}

/** The dollars in what was typed into a limit field ("$1,600" gives 1600; nothing gives NaN). */
export const parseDollars = (text) => {
  const digits = String(text).replace(/[^0-9.]/g, '')
  return digits === '' ? NaN : Number(digits)
}

/** Whether a typed Eating out limit is under what has already been spent there (so the error stays true as the user types). */
export const eatingUnderSpend = (text) => !(parseDollars(text) >= EATING_OUT.amount)

// The primary button's hover and pressed fills. Each one moves the primary toward
// deeper (or, when that would cost the label its contrast, toward the colour that
// sets the label furthest apart), so the label stays readable as it is pressed.
function primaryFills(r) {
  const floor = Math.min(4.5, contrastRatio(r.onPrimary, r.primary))
  const away = contrastRatio(r.onPrimary, r.canvas) >= contrastRatio(r.onPrimary, r.text) ? r.canvas : r.text
  const reads = (c) => contrastRatio(r.onPrimary, c) >= floor
  const apart = (c, from) => contrastRatio(c, from) >= 1.1
  // Toward the deep by a little for hover and a lot for pressed; toward `away` when the deep would cost the label its contrast.
  const [h, p] = [0.3, 0.6].map((t) => mixHex(r.primary, r.deep, t))
  if (reads(h) && reads(p) && apart(h, r.primary) && apart(p, h)) return { hover: h, press: p }
  return { hover: mixHex(r.primary, away, 0.2), press: mixHex(r.primary, away, 0.38) }
}

/**
 * The colours this scene works out per palette and mode: the ink on the card,
 * the edge a pastel or near-black card needs against the page, the ink and edge
 * of a category glyph on the subtle, and the focus ring of the Limits form.
 * For a two-colour pair nothing is corrected, and the rows that carry a state
 * and the Limits form are left out.
 * @param {object} r derivePaletteRoles() output
 */
export function tallyVars(r) {
  const keep = Boolean(r.pair)
  const grounds = { text: r.text, canvas: r.canvas }
  const cardInk = inkOnField(r.primary, { on: r.onPrimary, ...grounds }, { keep }).hex
  const fills = primaryFills(r)
  const vars = {
    '--ty-primary-hover': fills.hover,
    '--ty-primary-press': fills.press,
    '--ty-card-ink': cardInk,
    '--ty-card-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
    '--ty-glyph-ink': inkOnField(r.subtle, { on: r.onSubtle, ...grounds }, { keep }).hex,
    '--ty-glyph-edge': fieldEdge(r.subtle, r.canvas, r.borderStrong),
    // The focus ring is the primary, or its border tone when the primary is under 3:1 on the page.
    '--ty-ring': contrastRatio(r.primary, r.canvas) < 3 && r.primaryBorder !== 'transparent' ? r.primaryBorder : r.primary,
  }
  return { vars, pair: keep }
}
