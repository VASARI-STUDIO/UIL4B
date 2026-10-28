// Bread & Salt: the copy and the drawn chart of the Article view. A baking
// newsletter, one issue open on a reading page. Plain data, no React, so a test
// can read the words without a DOM.
//
// Every string is printed in the pair's two colours at a fixed size: 40px
// headline, 24px pull quote, 20px standfirst, 18px body, 12px byline, chart
// labels and caption. The 20px brand is bold (700), so it counts as large text.

export const BRAND = 'Bread & Salt'

export const MAST = { issue: 'Issue 31', subscribe: 'Subscribe' }

export const STORY = {
  headline: 'Why your sourdough spreads in summer',
  standfirst: 'Warm dough ferments faster than the recipe expects. Here is how to read it, and when to shorten the bulk.',
  byline: 'By Mei Lin Tran \u00b7 6 min read',
}

// The first paragraph carries one inline link; the view draws its underline as a
// separate 1px line (a UI part) rather than as text decoration.
export const BODY = {
  first: {
    before: 'Most recipes assume a ',
    link: 'dough temperature',
    after: ' of about 22\u00b0C. On a 30\u00b0C afternoon the same dough can finish its bulk ferment an hour early, and an over-proofed dough loses the strength to hold its shape.',
  },
  second: 'Take its temperature when you finish mixing. If it reads above 26\u00b0C, start checking an hour sooner than the recipe says, and shape as soon as it has grown by half.',
}

export const QUOTE = 'Shape when it has grown by half, not when the clock says so.'

// The chart is two curves on a 0..100 square (y grows downward): the 22\u00b0C
// dough rises steadily, the 30\u00b0C dough peaks early and then sags. The curves
// are stretched to the plot; the labels are HTML, so they stay at 12px.
export const CHART = {
  title: 'Dough rise over 4 hours at 22\u00b0C and 30\u00b0C',
  cool: { label: '22\u00b0C', path: 'M0 96 C30 94 60 76 100 44' },
  warm: { label: '30\u00b0C', path: 'M0 96 C20 88 38 30 62 10 S88 12 100 24' },
  from: '0 h',
  to: '4 h',
  caption: 'Rise measured in a straight-sided jar, Brunswick kitchen, January.',
}
