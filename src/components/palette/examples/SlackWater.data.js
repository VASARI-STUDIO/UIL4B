// "Slack Water": a made-up harbour quarterly, shown as one article's opening
// page. The ferry photograph leads, the type sits on the page beside it, and the
// palette is spent the way a masthead spends a brand: Subscribe and the route on
// the map are the primary, the nav underline and the current issue row the
// secondary, the ferry on the map the accent, the two wharves the deep and the
// current row's ground the subtle. Plain data, no React, so tests read the roles,
// the text recipe, the copy and the crossing without a DOM.
import { contrastRatio, mixHex } from '../../../utils/colors.js'
import { fieldEdge, inkOnField } from '../../../utils/palettePreviewRoles.js'

export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'error', 'neutral']

// What each text sets its colour from, for the contrast sweep.
export const TEXT_RECIPE = [
  { el: 'wordmark, nav, headline, dek, body, panel titles', ink: 'text', large: false },
  { el: 'issue line, rubric, byline, caption, map labels, readout, panel notes', ink: 'muted', large: false },
  { el: 'Subscribe, Continue', ink: 'inkOnField:primary', large: false },
  { el: 'current issue row', ink: 'inkOnField:subtle', large: false },
  { el: 'email error', ink: 'error-ink', large: false },
]

export const MAST = { name: 'Slack Water', issue: 'Issue 09 · Out today', nav: ['Issues', 'Ferries', 'Tides'], cta: 'Subscribe' }

export const HERO = {
  rubric: 'The commute',
  head: 'The 7:12 to Manly, and everyone on it.',
  dek: 'Four hundred people cross the harbour on the first ferry every weekday. We rode it for a month and drew the route they never look at.',
  byline: 'By Ana Whitlock',
  credit: 'Photographs by Theo Ruiz',
  length: '11 min read',
  caption: 'The 7:12 leaving Circular Quay, one minute late and full.',
}

export const BODY = [
  'Nobody on the 7:12 looks at the harbour. The regulars have their thumbs on their phones before the ropes are off, and by Fort Denison the lower deck smells of coffee and wet umbrellas. It is the one half hour of the day nobody can ask them for anything.',
  'The ferry takes thirty minutes door to door, and in that time it crosses four kinds of water: the shallow green of the cove, the tidal run past the islands, the deep channel under the heads and the slack at the other end, where the wash settles and the wharf comes up slowly.',
]

export const MAP = {
  box: { w: 600, h: 400 },
  north: 'M0 0H600V120C585 128 560 118 540 126C520 134 520 150 500 156C480 162 470 140 450 146C430 152 430 176 408 178C386 180 380 160 356 164C330 168 322 192 296 196C270 200 262 178 236 184C210 190 200 214 172 216C144 218 130 196 100 200C70 204 40 222 0 220Z',
  south: 'M0 400V290C30 286 60 300 92 294C120 288 130 266 160 266C190 266 196 286 226 288C256 290 264 270 292 268C320 266 330 286 360 286C392 286 400 262 430 258C460 254 474 270 504 268C540 266 560 250 600 252V400Z',
  streets: ['M20 330H180M40 350H200M60 310V390M110 300V396M160 280V380', 'M300 40H470M330 70H520M360 20V110M420 20V120M470 30V110'],
  route: 'M96 288C170 262 250 250 310 236C376 220 420 200 458 178C480 166 496 158 506 153',
  islands: [{ x: 214, y: 232 }, { x: 262, y: 226 }],
  // `at` is how far along the route the place is (0 to 1); `wharf` places a dot.
  places: [
    { name: 'Circular Quay', x: 96, y: 288, at: 0, wharf: true, side: 'below' },
    { name: 'Fort Denison', x: 214, y: 232, at: 0.22, side: 'above' },
    { name: 'Bradleys Head', x: 330, y: 150, at: 0.55, side: 'land' },
    { name: 'North Head', x: 548, y: 92, at: 0.9, side: 'land' },
    { name: 'Manly', x: 506, y: 153, at: 1, wharf: true, side: 'right' },
  ],
}

// The crossing: leaves at 7:12 and takes 30 minutes. `rest` is where the still picture shows the ferry.
export const CROSSING = { startMin: 7 * 60 + 12, minutes: 30, rest: 0.58 }

export const clockAt = (p) => {
  const t = CROSSING.startMin + Math.round(Math.min(1, Math.max(0, p)) * CROSSING.minutes)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} am`
}

/** What the ferry is doing at `p`: at a wharf at either end, otherwise off the nearest place. */
export function whereAt(p) {
  if (p <= 0.02) return 'Leaving Circular Quay'
  if (p >= 0.98) return 'Alongside at Manly'
  const near = MAP.places.slice(1, -1).reduce((best, pl) => (Math.abs(pl.at - p) < Math.abs(best.at - p) ? pl : best))
  return `Off ${near.name}`
}

// One small dataset per nav item, shown under the story. `on` marks the current row.
export const PANELS = {
  Issues: {
    kicker: 'In this issue',
    rows: [
      { a: '14', b: 'Eleven wharves, one tide table', c: 'Tides desk', on: true, role: 'subtle' },
      { a: '26', b: 'Coffee on the lower deck', c: 'Ferries desk' },
      { a: '41', b: 'Drawing a harbour from memory', c: 'Chart desk' },
    ],
    note: 'Next issue back in 4 weeks',
  },
  Ferries: {
    kicker: 'Leaving Circular Quay, Wharf 3',
    rows: [
      { a: '7:12', b: 'Manly, direct', c: '30 min', on: true, role: 'subtle' },
      { a: '7:27', b: 'Manly, direct', c: '30 min' },
      { a: '7:42', b: 'Manly, direct', c: '30 min' },
    ],
    note: 'Times for a weekday',
  },
  Tides: {
    kicker: 'Sydney Heads today',
    rows: [
      { a: '5:48 am', b: 'High tide', c: '1.7 m' },
      { a: '12:02 pm', b: 'Low tide', c: '0.4 m', on: true, role: 'subtle' },
      { a: '6:11 pm', b: 'High tide', c: '1.6 m' },
    ],
    note: 'Slack water lasts about twenty minutes either side of each tide',
  },
}

export const SUBSCRIBE = {
  title: 'Subscribe to Slack Water',
  lead: '$48 a year. Four issues, and the tide table for your wharf.',
  label: 'Email address',
  error: 'Enter an email address like name@example.com',
  done: 'You are on the list. Nothing was sent: this is a preview.',
  sample: 'ana.whitlock@',
}

/** Whether a typed address is not yet a usable one (so the error stays true as the user types). */
export const emailProblem = (text) => !/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(String(text).trim())

// The primary button's hover and pressed fills, kept where the label still reads.
function primaryFills(r) {
  const floor = Math.min(4.5, contrastRatio(r.onPrimary, r.primary))
  const away = contrastRatio(r.onPrimary, r.canvas) >= contrastRatio(r.onPrimary, r.text) ? r.canvas : r.text
  const reads = (c) => contrastRatio(r.onPrimary, c) >= floor
  const [h, p] = [0.3, 0.6].map((t) => mixHex(r.primary, r.deep, t))
  if (reads(h) && reads(p) && contrastRatio(h, r.primary) >= 1.1 && contrastRatio(p, h) >= 1.1) return { hover: h, press: p }
  return { hover: mixHex(r.primary, away, 0.2), press: mixHex(r.primary, away, 0.38) }
}

/** The colours this scene works out per palette and mode. */
export function slackVars(r) {
  const keep = Boolean(r.pair)
  const grounds = { text: r.text, canvas: r.canvas }
  const fills = primaryFills(r)
  return {
    '--sw-ink': inkOnField(r.primary, { on: r.onPrimary, ...grounds }, { keep }).hex,
    '--sw-edge': fieldEdge(r.primary, r.canvas, r.borderStrong),
    '--sw-sub-ink': inkOnField(r.subtle, { on: r.onSubtle, ...grounds }, { keep }).hex,
    '--sw-acc-edge': fieldEdge(r.accent, r.raised, r.borderStrong),
    '--sw-hover': fills.hover,
    '--sw-press': fills.press,
    '--sw-ring': contrastRatio(r.primary, r.canvas) < 3 && r.primaryBorder !== 'transparent' ? r.primaryBorder : r.primary,
  }
}
