// E1, "Slack Water": a made-up harbour quarterly whose cover is a drawn chart
// of the harbour, painted with the palette. Plain data, no React, so tests can
// read the roles, the text recipe and the copy without a DOM.
//
// The chart is drawn in a 480 x 360 viewBox. Labels are HTML, placed at the same
// points as percentages of that box, so they keep their real pixel size at any
// width while the drawing scales.

// Every role this example paints. A test renders the example and checks each
// one is on at least one element; the legend shows the rest as "Not in this
// preview".
export const ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep', 'neutral']

// What each text sets its colour from, for the contrast sweep.
// ink: 'inkOnField:primary' is inkOnField(primary, {on, text, canvas});
// 'brandAsText:secondary' is brandAsText(secondary, [canvas]); 'text', 'muted'
// and 'on-primary' are the neutral and button inks.
export const TEXT = [
  { el: 'wordmark', ink: 'text' },
  { el: 'issue', ink: 'muted' },
  { el: 'nav', ink: 'text' },
  { el: 'subscribe', ink: 'on-primary', on: 'primary' },
  { el: 'headline', ink: 'text', large: true },
  { el: 'headline-tail', ink: 'muted', large: true },
  { el: 'standfirst', ink: 'muted' },
  { el: 'byline', ink: 'muted' },
  { el: 'wharf-label', ink: 'inkOnField:primary' },
  { el: 'caption', ink: 'inkOnField:primary' },
  { el: 'page-active', ink: 'brandAsText:secondary' },
  { el: 'page', ink: 'muted' },
  { el: 'title', ink: 'text' },
  { el: 'desk', ink: 'muted' },
]

export const MAST = {
  name: 'Slack Water',
  issue: 'Issue 09 · Out today',
  nav: ['Issues', 'Ferries', 'Tides', 'Subscribe'],
  cta: 'Subscribe $48/yr',
}

export const HERO = {
  head: 'The 7:12 to Manly,',
  tail: 'and everyone on it.',
  standfirst: 'Four hundred people cross the harbour on the first ferry every weekday. We rode it for a month and drew the route they never look at.',
  byline: ['Words by the Ferries desk', 'Drawings by the Chart desk', '11 min read'],
  caption: 'The F1, Circular Quay to Manly, 7:12 am',
}

// Points in the 480 x 360 box. `side` puts the label above or below the dot,
// always over water, where its ink was measured.
export const WHARVES = [
  { name: 'Circular Quay', x: 40, y: 244, side: 'above', narrow: true },
  { name: 'Kirribilli', x: 112, y: 122, side: 'below' },
  { name: 'Neutral Bay', x: 186, y: 140, side: 'below' },
  { name: 'Mosman Bay', x: 252, y: 116, side: 'below' },
  { name: 'Watsons Bay', x: 396, y: 214, side: 'above' },
  { name: 'Manly', x: 452, y: 130, side: 'below', narrow: true },
]

// Where the 7:12 is now, on the route.
export const FERRY = { x: 300, y: 172 }

// The contents list. Page numbers are a real sequence; the first is the page
// this issue opens on.
export const CONTENTS = [
  { page: 14, title: 'Eleven wharves, one tide table', desk: 'Tides desk', active: true },
  { page: 26, title: 'Coffee on the lower deck', desk: 'Ferries desk' },
  { page: 41, title: 'Drawing a harbour from memory', desk: 'Chart desk' },
]

export const NEXT = 'Next issue back in 4 weeks'
