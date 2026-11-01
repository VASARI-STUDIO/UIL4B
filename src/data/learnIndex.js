// The Learn article registry — METADATA ONLY, and deliberately plain JavaScript.
//
// ── Why the metadata is split from the article bodies ───────────────────────
//
// scripts/route-matrix.mjs runs in bare Node with no JSX transform, and it
// imports src/data/routeMetaMap.js to decide which URLs get a prerendered
// shell. routeMetaMap.js now spreads this file's titles and descriptions in, so
// adding an article here is what makes it routable, prerendered, advertised in
// sitemap.xml and rewritten in vercel.json — one edit, four consequences, no
// hand-kept second list.
//
// That only works while this file stays parseable by Node. So: no JSX, no
// browser globals, no imports from anything that has either. The prose lives in
// src/data/learn/*.jsx and is imported only by the page component, which the
// browser is the only thing that ever loads.
//
// ── What an article is ─────────────────────────────────────────────────────
//
//   slug        the URL segment; the route is `/learn/${slug}`
//   title       the <h1> and the card title
//   navLabel    a shorter form for the nav column, where the row is ~180px wide
//   topic       one of TOPICS — the category chip, and how the index groups
//   dek         one sentence describing what the article answers. Shown on the
//               index card and under the <h1>. NOT the meta description.
//   description the <meta name="description"> — written for a search result,
//               so it front-loads the answer rather than the subject
//   file        the module in src/data/learn/ holding the prose
//   words       measured, not estimated: `node scripts/learn-wordcount.mjs`
//   updated     ISO date of the last factual review
//   toolTo      the tool that does the thing the article explains
//   toolLabel   the link text for that tool
//   sections    the article's own headings, in order — the table of contents
//               is generated from this, so a heading cannot exist in the prose
//               without appearing in the contents and vice versa (the article
//               component renders each section FROM this list)
//
// The source lists are NOT on the record. This file is imported by routeMetaMap,
// toolTree and menuModel, so it is in the entry chunk of every route, and the
// lists are read only by the lazy article page. They live in
// src/data/learn/sources.js, read with getArticleSources(slug).
//
// `words` drives the reading estimate rather than a typed "5 min read". 220
// words per minute is the middle of the range usually reported for adult silent
// reading of non-fiction; it is stated in the UI as an estimate because it is
// one.

/**
 * The topics Learn covers. An article's `topic` must be one of these, which
 * tests/unit/learn-articles.test.js asserts — a one-off topic string is how an
 * index page ends up with a category that has exactly one thing in it.
 */
export const TOPICS = Object.freeze(['Colour', 'Typography', 'Accessibility', 'Psychology'])

/** Words per minute used for the reading estimate. */
export const READING_WPM = 220

/** How long `words` takes to read, in whole minutes, minimum 1. */
export const readingMinutes = (words) => Math.max(1, Math.round(words / READING_WPM))

export const LEARN_ARTICLES = Object.freeze([
  {
    slug: 'colour-contrast',
    title: 'Colour contrast and the WCAG thresholds',
    navLabel: 'Colour contrast',
    topic: 'Accessibility',
    dek: 'The four numbers WCAG actually specifies, the formula behind them, and the failures the formula cannot see.',
    description: 'The WCAG contrast thresholds — 4.5:1, 3:1 and 7:1 — the relative-luminance formula behind them, what counts as large text, and what a ratio cannot see.',
    file: 'colourContrast.jsx',
    words: 1400,
    updated: '2026-09-05',
    toolTo: '/create/contrast',
    toolLabel: 'Contrast Checker',
    sections: [
      { id: 'thresholds', title: 'The thresholds' },
      { id: 'large-text', title: 'What counts as large text' },
      { id: 'formula', title: 'How the ratio is calculated' },
      { id: 'non-text', title: 'Contrast for things that are not text' },
      { id: 'blind-spots', title: 'What a contrast ratio cannot see' },
    ],
  },
  {
    slug: 'type-scales',
    title: 'Modular type scales',
    navLabel: 'Type scales',
    topic: 'Typography',
    dek: 'Two numbers generate every size in a type system. What the ratio does to the far end of the scale, and why one scale cannot serve a phone and a desktop.',
    description: 'How a modular type scale works: size = base x ratio^step, which ratio suits which interface, why a ratio compounds, and how clamp() joins two scales.',
    file: 'typeScales.jsx',
    words: 1343,
    updated: '2026-09-05',
    toolTo: '/create/type-scale',
    toolLabel: 'Type Scale Generator',
    sections: [
      { id: 'the-formula', title: 'The formula' },
      { id: 'choosing-a-ratio', title: 'Choosing a ratio' },
      { id: 'compounding', title: 'The ratio compounds' },
      { id: 'two-scales', title: 'Two scales, joined by clamp()' },
      { id: 'line-length', title: 'Line length and line height' },
    ],
  },
  {
    slug: 'typeface-metrics',
    title: 'What a typeface’s metrics decide',
    navLabel: 'Typeface metrics',
    topic: 'Typography',
    dek: 'font-size sizes the box, not the letters. What decides how large a face actually looks, and the arithmetic that makes two faces match.',
    description: 'Why two typefaces at the same font-size are not the same size: the em box, the aspect value, and the formula CSS gives for matching one face to another.',
    file: 'typefaceMetrics.jsx',
    words: 1286,
    updated: '2026-09-06',
    toolTo: '/create/font-gallery',
    toolLabel: 'Font Gallery',
    sections: [
      { id: 'em-box', title: 'What font-size sets' },
      { id: 'aspect-value', title: 'The aspect value' },
      { id: 'matching', title: 'Matching one face to another' },
      { id: 'weight', title: 'Weight is a number, and it can be a range' },
      { id: 'reader-settings', title: 'What the reader changes underneath' },
    ],
  },
  {
    slug: 'font-loading',
    title: 'What the reader sees before the font arrives',
    navLabel: 'Before the font arrives',
    topic: 'Typography',
    dek: 'A font file is a network request, and the text exists before it finishes. What is painted in the meantime, and what moves when it lands.',
    description: 'The three periods of a webfont load, what font-display block and swap cost the reader, why a line re-breaks on swap, and how unicode-range splits a family.',
    file: 'fontLoading.jsx',
    words: 1733,
    updated: '2026-09-06',
    toolTo: '/create/font-pair',
    toolLabel: 'Font Pairing tool',
    sections: [
      { id: 'three-periods', title: 'The three periods a webfont has' },
      { id: 'choosing-display', title: 'Which period the page should spend' },
      { id: 'the-shift', title: 'The line changes width when the file lands' },
      { id: 'subsetting', title: 'A family arrives as several files' },
      { id: 'matching-the-fallback', title: 'Making the stand-in fit' },
    ],
  },
  {
    slug: 'colour-spaces',
    title: 'Colour spaces for interface work',
    navLabel: 'Colour spaces',
    topic: 'Colour',
    dek: 'sRGB, HSL and OKLCH describe the same screen in different coordinates. Which coordinate lies to you, and where.',
    description: 'sRGB, HSL and OKLCH for UI work: why an HSL lightness of 50% is not a lightness, what OKLCH measures instead, and what CSS does between two colours.',
    file: 'colourSpaces.jsx',
    words: 1284,
    updated: '2026-09-05',
    toolTo: '/create/tint',
    toolLabel: 'Tint Scale Generator',
    sections: [
      { id: 'one-screen', title: 'One screen, several coordinate systems' },
      { id: 'hsl-lightness', title: 'HSL lightness is not lightness' },
      { id: 'oklch', title: 'What OKLCH measures instead' },
      { id: 'gamut', title: 'Gamut: colours you can name but not show' },
      { id: 'interpolation', title: 'What CSS does between two colours' },
    ],
  },
  {
    slug: 'theme-systems',
    title: 'Dark and light themes',
    navLabel: 'Dark and light themes',
    topic: 'Colour',
    dek: 'A dark theme is a second set of values bound to the same names. What inversion does instead, and which decisions belong to the reader.',
    description: 'A dark theme is a second set of values on the same token names, not an inversion: what inversion does to contrast and hue, and what the reader decides.',
    file: 'themeSystems.jsx',
    words: 1390,
    updated: '2026-09-06',
    toolTo: '/create/semantic-color',
    toolLabel: 'Semantic Colour Generator',
    sections: [
      { id: 'value-sets', title: 'One set of names, two sets of values' },
      { id: 'inversion', title: 'Inversion is not a theme' },
      { id: 'surfaces', title: 'Which way elevation runs' },
      { id: 'state-colour', title: 'State colour is re-picked' },
      { id: 'preferences', title: 'What the reader’s settings decide' },
    ],
  },
  {
    slug: 'brand-colour',
    title: 'Choosing a brand colour',
    navLabel: 'Brand colour',
    topic: 'Colour',
    dek: 'One hue has to be text, a fill and a border, in two themes. Almost no single value does all of it, which is what the ramp is for.',
    description: 'A brand colour has to be text, a fill and a border in two themes. Why no ramp stop clears 4.5:1 on both grounds, and how far a neutral can be tinted.',
    file: 'brandColour.jsx',
    words: 1089,
    updated: '2026-09-06',
    toolTo: '/create/palette',
    toolLabel: 'Palette Generator',
    sections: [
      { id: 'jobs', title: 'One value, several jobs' },
      { id: 'the-ramp', title: 'What the ramp is for' },
      { id: 'no-single-stop', title: 'No single stop clears both grounds' },
      { id: 'neutrals', title: 'The neutral carries more of the screen' },
      { id: 'state-collision', title: 'When the brand hue is already spoken for' },
    ],
  },
  {
    slug: 'improving-value-proposition',
    title: 'Improving your value proposition',
    navLabel: 'Value proposition',
    topic: 'Psychology',
    dek: 'Fourteen behavioural ideas, graded by how well the evidence holds, with how products use each one and the point where it becomes a dark pattern.',
    description: 'Which behavioural ideas hold up in pricing and UI design: defaults and anchoring do; decoys and countdown timers mostly do not. With ACCC, FTC and EU rules.',
    file: 'valueProposition.jsx',
    words: 4339,
    updated: '2026-11-01',
    toolTo: '/create/contrast',
    toolLabel: 'Contrast Checker',
    sections: [
      { id: 'evidence', title: 'What the research supports' },
      { id: 'value-and-pricing', title: 'Value and pricing' },
      { id: 'trust-and-defaults', title: 'Trust and defaults' },
      { id: 'interface-laws', title: 'Choice and interface laws' },
      { id: 'dark-patterns', title: 'Where each idea becomes a dark pattern' },
    ],
  },
])

/** Every article route, sorted — what routeMetaMap and the router consume. */
export const LEARN_ARTICLE_ROUTES = Object.freeze(
  LEARN_ARTICLES.map((a) => `/learn/${a.slug}`).sort(),
)

/** The article at a slug, or undefined. The router's 404 depends on undefined. */
export function findArticle(slug) {
  const key = String(slug || '').toLowerCase()
  return LEARN_ARTICLES.find((a) => a.slug === key)
}

/** The next article in reading order, wrapping — used for "read next". */
export function nextArticle(slug) {
  const at = LEARN_ARTICLES.findIndex((a) => a.slug === slug)
  if (at === -1) return undefined
  return LEARN_ARTICLES[(at + 1) % LEARN_ARTICLES.length]
}

/**
 * The next article on the same topic, in registry order, wrapping within the
 * topic. A topic with a single article has nothing to wrap to, so it falls back
 * to nextArticle(); the caller tells the two apart by comparing `topic`.
 * Undefined for an unknown slug.
 */
export function nextInTopic(slug) {
  const here = findArticle(slug)
  if (!here) return undefined
  const sameTopic = LEARN_ARTICLES.filter((a) => a.topic === here.topic)
  if (sameTopic.length < 2) return nextArticle(here.slug)
  const at = sameTopic.findIndex((a) => a.slug === here.slug)
  return sameTopic[(at + 1) % sameTopic.length]
}

/**
 * The id of a topic's group on the /learn index, which is where an article's
 * breadcrumb sends the reader. The index builds its ids with the same
 * expression, which tests/unit/learn-articles.test.js asserts.
 */
export const topicAnchorId = (topic) => `learn-topic-${String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

/** Titles + descriptions for routeMetaMap, keyed by route. */
export const LEARN_PAGE_TITLES = Object.freeze(
  Object.fromEntries(LEARN_ARTICLES.map((a) => [`/learn/${a.slug}`, `UI L4B | ${a.title}`])),
)
export const LEARN_PAGE_DESCRIPTIONS = Object.freeze(
  Object.fromEntries(LEARN_ARTICLES.map((a) => [`/learn/${a.slug}`, a.description])),
)
