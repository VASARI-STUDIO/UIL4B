// E1, "Slack Water": a made-up harbour quarterly whose cover is a drawn chart
// of the harbour, painted with the palette. Plain data, no React, so tests can
// read the roles, the text recipe, the copy and the chart geometry without a DOM.
//
// The chart is drawn in a 480 x 360 box. Labels are HTML, placed at the same
// points as percentages of that box, so they keep their real pixel size at any
// width while the drawing scales.

// Every role this example paints. A test renders the example and checks each
// one is on at least one element; the legend shows the rest as "Not in this
// preview".
export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'neutral']

// What each text sets its colour from, for the contrast sweep.
// ink: 'inkOnField:primary' is inkOnField(primary, {on, text, canvas});
// 'brandAsText:secondary' is brandAsText(secondary, [canvas]); 'text', 'muted'
// and 'on-primary' are the neutral and button inks. The wharf labels and the
// caption sit on a plate in the field's colour, so the field is their ground
// wherever they land.
export const TEXT_RECIPE = [
  { el: 'wordmark', ink: 'text' },
  { el: 'issue', ink: 'muted' },
  { el: 'nav', ink: 'text' },
  { el: 'subscribe', ink: 'inkOnField:primary' },
  { el: 'headline', ink: 'text', large: true },
  { el: 'headline-tail', ink: 'muted', large: true },
  { el: 'standfirst', ink: 'muted' },
  { el: 'byline', ink: 'muted' },
  { el: 'wharf-label', ink: 'inkOnField:primary', plate: 'primary' },
  { el: 'caption', ink: 'inkOnField:primary', plate: 'primary' },
  { el: 'page-active', ink: 'brandAsText:secondary' },
  { el: 'page', ink: 'muted' },
  { el: 'title', ink: 'text' },
  { el: 'desk', ink: 'muted' },
]

export const MAST = {
  name: 'Slack Water',
  issue: 'Issue 09 · Out today',
  nav: ['Issues', 'Ferries', 'Tides'],
  cta: 'Subscribe $48/yr',
}

export const HERO = {
  head: 'The 7:12 to Manly,',
  tail: 'and everyone on it.',
  standfirst: 'Four hundred people cross the harbour on the first ferry every weekday. We rode it for a month and drew the route they never look at.',
  byline: ['Words by the Ferries desk', 'Drawings by the Chart desk', '11 min read'],
  caption: 'The F1, Circular Quay to Manly, 7:12 am',
}

// ── The chart ───────────────────────────────────────────────────────────────
// The two land shapes run far past the box on every open side, so when the
// field is taller or wider than the chart the land goes on to the field's edge
// instead of ending in a visible rectangle. Absolute commands only (M H V C Z):
// a test flattens these to polygons to place the labels.
export const CHART_BOX = { w: 480, h: 360 }
export const LAND = [
  'M-1200 -1200H1700V118H480C462 126 448 112 430 116C404 122 384 150 352 146C326 142 310 104 278 102C250 100 236 132 208 130C182 128 172 108 140 110C108 112 96 136 66 134C40 132 20 118 0 122H-1200Z',
  'M-1200 1700V254H0C30 248 52 266 82 262C120 256 132 232 172 238C212 244 222 276 262 270C300 264 316 238 352 244C368 246 376 238 384 222C392 202 402 194 412 198C424 204 426 238 440 262C452 270 468 256 480 252H1700V1700Z',
]
export const ROUTE = 'M44 252C120 216 200 200 260 188C320 176 380 150 452 126'

// What part of the chart each layout shows, in chart units: the window is `w`
// wide from `x0`, centred on `yc` vertically. The field's width sets the scale
// (px per unit = field width / w), so a narrower window is a closer crop.
// Nothing is hidden by a rule: a wharf is either inside the window with its
// whole label, or outside it with none of it. `fields` is the range of field
// widths in px that layout meets. The CSS carries the same three numbers.
export const WINDOWS = {
  wide: { w: 520, x0: -20, yc: 180, fields: [549, 578] },
  mid: { w: 300, x0: 110, yc: 175, fields: [287, 466] },
  narrow: { w: 220, x0: 170, yc: 180, fields: [286, 598] },
}

// Wharves, in chart units. `side` is where the label sits against its dot and
// `gap` pushes it that many px further out. Each label is a plate in the
// field's colour; a test checks it against the land, the route, the other
// labels and the windows above, so no label sits on land.
export const WHARVES = [
  { name: 'Circular Quay', x: 44, y: 252, side: 'above', gap: 16 },
  { name: 'Kirribilli', x: 66, y: 137, side: 'below', gap: 0 },
  { name: 'Neutral Bay', x: 208, y: 133, side: 'below', gap: 24 },
  { name: 'Mosman Bay', x: 352, y: 149, side: 'left', gap: 16 },
  { name: 'Watsons Bay', x: 380, y: 226, side: 'left', gap: 8 },
  { name: 'Manly', x: 452, y: 126, side: 'below', gap: 8 },
]

// Where the 7:12 is now, on the route; `turn` is the hull's heading in degrees.
export const FERRY = { x: 296, y: 179, turn: -12 }

// The contents list. Page numbers are a real sequence; the first is the page
// this issue opens on.
export const CONTENTS = [
  { page: 14, title: 'Eleven wharves, one tide table', desk: 'Tides desk', active: true },
  { page: 26, title: 'Coffee on the lower deck', desk: 'Ferries desk' },
  { page: 41, title: 'Drawing a harbour from memory', desk: 'Chart desk' },
]

export const NEXT = 'Next issue back in 4 weeks'
