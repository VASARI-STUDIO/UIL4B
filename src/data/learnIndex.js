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
//   sources     every specification and document the prose cites, in the order
//               it cites them. They live here rather than beside the prose so
//               the article files export nothing but a component (an array
//               export beside a component trips react-refresh, and the sources
//               are a property of the article rather than of its markup)
//   sections    the article's own headings, in order — the table of contents
//               is generated from this, so a heading cannot exist in the prose
//               without appearing in the contents and vice versa (the article
//               component renders each section FROM this list)
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
export const TOPICS = Object.freeze(['Colour', 'Typography', 'Accessibility'])

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
    sources: [
      { label: 'WCAG 2.2 — SC 1.4.3 Contrast (Minimum)', href: 'https://www.w3.org/TR/WCAG22/#contrast-minimum' },
      { label: 'WCAG 2.2 — SC 1.4.6 Contrast (Enhanced)', href: 'https://www.w3.org/TR/WCAG22/#contrast-enhanced' },
      { label: 'WCAG 2.2 — SC 1.4.11 Non-text Contrast', href: 'https://www.w3.org/TR/WCAG22/#non-text-contrast' },
      { label: 'WCAG 2.2 — SC 1.4.1 Use of Color', href: 'https://www.w3.org/TR/WCAG22/#use-of-color' },
      { label: 'WCAG 2.2 — definitions: relative luminance, contrast ratio, large scale text', href: 'https://www.w3.org/TR/WCAG22/#dfn-relative-luminance' },
      { label: 'Understanding SC 1.4.3 — the rationale for 4.5:1 and the pt/px conversion', href: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html' },
      { label: 'w3c/wcag#308 — the 0.03928 to 0.04045 correction', href: 'https://github.com/w3c/wcag/issues/308' },
    ],
    sections: [
      { id: 'thresholds', title: 'The thresholds' },
      { id: 'large-text', title: 'What counts as large text' },
      { id: 'formula', title: 'How the ratio is calculated' },
      { id: 'non-text', title: 'Contrast for things that are not text' },
      { id: 'blind-spots', title: 'What a contrast ratio cannot see' },
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

/** Titles + descriptions for routeMetaMap, keyed by route. */
export const LEARN_PAGE_TITLES = Object.freeze(
  Object.fromEntries(LEARN_ARTICLES.map((a) => [`/learn/${a.slug}`, `UI L4B | ${a.title}`])),
)
export const LEARN_PAGE_DESCRIPTIONS = Object.freeze(
  Object.fromEntries(LEARN_ARTICLES.map((a) => [`/learn/${a.slug}`, a.description])),
)
