// THE FOUNDER'S VALUE PROPOSITION, IN HIS WORDS, IN ONE PLACE.
//
// ── Why this module exists ──────────────────────────────────────────────────
//
// Every sales surface in this app used to write its own value claim. The hero
// said one thing, /plans framed it another way, /help opened on a third, and
// public/llms.txt told a machine a fourth. None of them was wrong exactly, but
// no two agreed, and nothing in the repo could tell you which one the founder
// had actually approved — so each rewrite of any one of them was a fresh guess.
//
// That is the same failure `src/config/exportFormats.js` was extracted to fix
// (a pricing page describing the export offer from memory, and describing it
// wrongly in the direction that costs money) and the same one
// `src/config/planLadder.js` fixed for prices. The pattern is: put the claim in
// one module, derive every surface from it, and let a unit test fail the build
// when a surface types a competing one. `tests/unit/positioning-truth.test.js`
// is that test.
//
// ── The positioning lines, verbatim ─────────────────────────────────────────
//
// The ONLY edits applied to the source phrases are the two a proofreader would
// make and nothing else: "your" → "you're", and sentence case with a closing
// full stop. No tightening, no re-ordering, no synonyms. The voice is
// deliberately plain Australian English; if a line reads oddly, it stays.
//
// DO NOT ADD A LINE TO THIS ARRAY. It is not a copy deck to top up; a new line
// is new approved copy, not an edit.

/**
 * @typedef {object} PositioningLine
 * @property {string} id     stable key, so a surface names WHICH line it uses
 * @property {string} text   the sentence, as it renders
 * @property {string} source the raw phrase, before the two edits
 */

/** @type {readonly PositioningLine[]} */
export const VALUE_PROPOSITION = Object.freeze([
  Object.freeze({
    id: 'forget-the-app-name',
    text: 'No more trying to remember the name of the specific app for the tool you liked.',
    source: 'no more trying to remember the name of the specific app for the tool you liked',
  }),
  Object.freeze({
    id: 'bookmark-folders',
    text: 'Gone are the days of searching through bookmark folders upon bookmark folders to find each tool.',
    source: 'gone are the days of searching through bookmark folders upon bookmark folders to find each tool',
  }),
  Object.freeze({
    id: 'build-and-export',
    text: 'Build and export UI and brand design kits and content for website building.',
    source: 'build and export UI and brand design kits and content for website building',
  }),
  Object.freeze({
    id: 'one-unified-location',
    text: "All the design tools you're constantly searching for, in one unified location.",
    source: 'all the design tools your constantly searching for in one unified location',
  }),
  // The successor to `one-unified-location` on the surfaces that displayed
  // it. The phrasing is kept whole, including "1 tool websites"; only the
  // leading capital is added.
  //
  // IT IS A NEW ENTRY RATHER THAN AN EDIT OF `one-unified-location`, so any
  // splice that names the older line in `cutFrom` still traces to real text.
  Object.freeze({
    id: 'one-tool-websites',
    text: 'No more trying to remember the names of the 1 tool websites.',
    source: 'no more trying to remember the names of the 1 tool websites',
  }),
])

/** Look one up by id. Throws on an unknown id, the same contract toolRoute()
 *  has with the tool tree: a surface that names a line this module does not
 *  carry is a build failure, not a silently missing sentence. */
export function line(id) {
  const found = VALUE_PROPOSITION.find((l) => l.id === id)
  if (!found) throw new Error(`positioning: no positioning line with id "${id}"`)
  return found.text
}

// ── The hero headline ───────────────────────────────────────────────────────
//
// The front door's h1 is the headline drawn in the Spectrum design
// ("UIL4B - Spectrum.dc.html", the hero). "kit" is right here, because kits
// are what the product EXPORTS. It is not a splice of the positioning lines
// above; it is the design's sentence as drawn, so `cutFrom` is empty and
// `source` names where it comes from.
//
// DO NOT REWORD IT. `tests/unit/positioning-truth.test.js` pins the exact
// string, so an edit here fails the build until the pin is moved with it.
//
// ONE SOURCE, THREE READERS: the landing (via src/components/spectrum/
// spectrumHero.js), the served `/` shell (scripts/home-shell.mjs) and the share
// card (scripts/og-cards.mjs). The marked run is the one the page paints in the
// accent and the share card highlights; og-cards throws if there is none.
export const HERO_HEADLINE = Object.freeze({
  lead: 'Build and export UI and brand kits from',
  mark: 'one place',
  tail: '.',
  /** Where the sentence comes from, so a test can check the trace. */
  source: 'UIL4B - Spectrum.dc.html (hero h1)',
  /** Positioning lines it was spliced from — none: it is the design's sentence whole. */
  cutFrom: Object.freeze([]),
})

/** The headline as one plain string — for tests, share cards and llms.txt. */
export const heroHeadlineText = () =>
  `${HERO_HEADLINE.lead} ${HERO_HEADLINE.mark}${HERO_HEADLINE.tail}`

// ── Which surface says which line ───────────────────────────────────────────
//
// One line per surface, chosen for the job that surface does. A surface takes
// its line FROM HERE; it does not restate one. Keeping the mapping in this
// module (rather than in each page) is what lets positioning-truth.test.js
// check every surface against the same table.
export const SURFACE_LINE = Object.freeze({
  // `homeHeroSub` is gone: the landing's sub-line is its own sentence
  // (SPECTRUM_HERO_SUB in components/spectrum/spectrumHero.js), and the share
  // card reads it from there.
  // `plansFraming` is gone: /plans renders the pricing screen's own heading
  // and sub-line, and the landing no longer carries a pricing section.
  // /help greets somebody who arrived looking for a specific tool, which is
  // precisely what `forget-the-app-name` is about.
  helpOpening: 'forget-the-app-name',
  // llms.txt is read by a machine deciding what this product IS.
  llmsSummary: 'build-and-export',
  // No mapping for the landing's bench heading: it is the design's own line
  // ("Say goodbye to bookmark folders."). No mapping for /plans's closing
  // band either: the Pricing screen has none. A mapping with no consumer is
  // "a promise the module makes and nothing keeps", so none is kept.
})
