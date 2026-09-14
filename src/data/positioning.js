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
// ── The lines below are the founder's, verbatim ─────────────────────────────
//
// Given 2026-09-07 in his own messages. The ONLY edits applied are the two a
// proofreader would make and nothing else: "your" → "you're", and sentence
// case with a closing full stop. No tightening, no re-ordering, no synonyms.
// If a line reads oddly, that is his voice and it stays — he asked for "real
// australian style english to sound like me not an AI written statement", and
// an agent smoothing these sentences is exactly the failure that request names.
//
// DO NOT ADD A LINE TO THIS ARRAY. It is not a copy deck an agent tops up; it
// is a record of what the founder said. A new claim needs him to say it.
// `docs/reference/positioning.md` carries the same four lines as prose and is
// the doc-authority owner; this module is the machine-readable copy of them.

/**
 * @typedef {object} FounderLine
 * @property {string} id     stable key, so a surface names WHICH line it uses
 * @property {string} text   the sentence, as it renders
 * @property {string} source the founder's raw phrase, before the two edits
 */

/** @type {readonly FounderLine[]} */
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
  // FOUNDER, 2026-09-14. He quoted `one-unified-location` back and said it
  // "should be" this instead — first as "stop tirelessly searching those
  // bookmark folders and trying to remember Site names of each Design Tool
  // youre looking for", then, asked whether to use that verbatim or trim it,
  // he wrote a shorter one himself: "no more trying to remember the names of
  // the 1 tool websites."
  //
  // His sentence, his phrasing, including "1 tool websites". Only the leading
  // capital is added, the way the apostrophe was added to the line above.
  //
  // IT IS A NEW ENTRY RATHER THAN AN EDIT OF `one-unified-location`, and that
  // is not tidiness. HERO_HEADLINE is spliced from that line — its marked run
  // "in one unified location" is taken from it verbatim, and `cutFrom` names it
  // so a test can check the trace. Rewriting the line in place would have
  // silently invalidated a headline he approved on 2026-09-10 and broken the
  // provenance the splice depends on. The old line stays as the hero's source;
  // the surfaces that DISPLAYED it now show this one.
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
  if (!found) throw new Error(`positioning: no founder line with id "${id}"`)
  return found.text
}

// ── The hero headline ───────────────────────────────────────────────────────
//
// ASSEMBLED, NOT WRITTEN — AND APPROVED BY THE FOUNDER ON 2026-09-10.
//
// The founder chose "build one from my words only" over an agent draft, so this
// headline is a splice of two of the lines above and contains no word that is
// not in one of them:
//
//   "Build and export UI and brand design kits"  ← build-and-export, verbatim
//                                                  head of the sentence
//   "in one unified location"                    ← one-unified-location,
//                                                  verbatim tail
//
// The comma between them is punctuation, not a word. Nothing else was added,
// and no synonym was substituted.
//
// HE READ IT AND SAID SHIP IT, 2026-09-10. It was put to him beside the two
// phrases it was cut from, and the answer was yes. So this is no longer an
// agent's proposal waiting on him — it is his line, and it is the first
// sentence a visitor reads.
//
// DO NOT REWORD IT WITHOUT HIM. Not a tightening, not a synonym, not a comma.
// The only replacement that would not need asking him again is another splice
// of these same founder lines, and even that changes a sentence he has
// personally approved. `tests/unit/positioning-truth.test.js` pins the exact
// string, so an edit here fails the build until somebody moves the pin — which
// is the moment to go and ask.
//
// The marked run is the highlight the page paints (`<mark class="home-mark">`)
// and the one `--hi` element in the hero viewport — design-language-v2.md
// budgets at most one per viewport, and scripts/og-cards.mjs throws if the h1
// stops highlighting a phrase, because the share card paints the same mark.
export const HERO_HEADLINE = Object.freeze({
  lead: 'Build and export UI and brand design kits,',
  mark: 'in one unified location',
  tail: '.',
  /** The ids this line was cut from, so the trace is checkable by a test
   *  rather than only asserted in a comment. */
  cutFrom: Object.freeze(['build-and-export', 'one-unified-location']),
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
  // The hero's sub-line, under the assembled headline. The headline says what
  // you get; this says what stops. Chosen over `forget-the-app-name` because
  // the hero already names the product's output above it, and the bookmark
  // sentence is the one that describes the visitor's current afternoon.
  homeHeroSub: 'bookmark-folders',
  // /plans opens on the outcome the money buys, which is the build-and-export
  // sentence — the only one of the four that names a deliverable.
  plansFraming: 'build-and-export',
  // /help greets somebody who arrived looking for a specific tool, which is
  // precisely what `forget-the-app-name` is about.
  helpOpening: 'forget-the-app-name',
  // llms.txt is read by a machine deciding what this product IS.
  llmsSummary: 'build-and-export',
  // The homepage tools section, on the founder's 2026-09-07 instruction that
  // the heading should read "more something like" this line.
  toolsSectionHeading: 'one-tool-websites',
  // The homepage export section's heading (HomeExportKit, passed down from
  // Home.jsx). It read "Your system leaves as a document, not a screenshot."
  // — the "not an X" defensive negation the founder threw out by name on the
  // tools heading ("Not a screenshot. The actual tools, running here.", 2026-08).
  // The section DRAWS a page of the export; the sentence that names what is
  // being drawn is his build-and-export line. Anti-slop audit, 2026-09-09.
  homeExportHeading: 'build-and-export',
  // /plans's closing band. It read "Build first. Upgrade when your workflow
  // asks for it." over a "No trial clock on Free" reassurance hint — agent copy
  // in the slot where the retired "No credit card required" line used to sit.
  // The founder's own closing claim is the unified-location sentence.
  plansClosing: 'one-tool-websites',
})
