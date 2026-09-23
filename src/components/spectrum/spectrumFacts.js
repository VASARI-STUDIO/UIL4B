import {
  CREATE_GROUPS,
  categoryDestination,
  createTools,
  toolRoute,
} from '../../data/toolTree.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../config/plans.js'
import { COLOUR_SYSTEMS } from '../../config/colourSystems.js'
import { freeFormats, proOnlyFormats, unbuiltFormats } from '../../config/exportFormats.js'
import {
  cheapestPerMonth,
  purchasablePlans,
  resolvePlanLadder,
  savingsVsMonthly,
} from '../../config/planLadder.js'
import { GALLERY_GRADIENTS } from '../../data/gradientGallery.js'
import { LIBRARY_PALETTES } from '../../data/paletteLibrary.js'

// ═════════════════════════════════════════════════════════════════════════════
// EVERY NUMBER AND EVERY CAPABILITY CLAIM THE SPECTRUM PAGE MAKES, DERIVED.
// ═════════════════════════════════════════════════════════════════════════════
//
// "UIL4B - Spectrum.dc.html" is a MOCK. It is visually and structurally the
// source of truth for this page and it is worth nothing at all as a source of
// facts — it carries invented prices, an invented plan ladder, invented proof
// numbers and a handful of exports the product cannot build. The same trap the
// V2 design project walked into. So the rule for this page is the rule
// Plans.jsx states at the top of its own constants block:
//
//     If you are about to type a number or a capability into this file: don't.
//     Import it, or delete the claim.
//
// This module is where that import happens once, so Spectrum.jsx reads like a
// layout and `tests/unit/spectrum-truth.test.js` can check every claim against
// the module that decides it rather than against a screenshot.
//
// WHAT THE DESIGN CLAIMED AND WHAT IS ACTUALLY TRUE — each of these is a defect
// that would have shipped by copying the prototype, and each is listed in the
// handover so the founder can see what moved:
//
//   MOCK                                  TRUTH (and its owner)
//   ───────────────────────────────────── ──────────────────────────────────────
//   "$4 / month", "was $4"                $7 monthly · $48 yearly, i.e. $4 a
//                                         month on the yearly cadence.
//                                         planLadder.js#approvedTotal
//   Quarterly at $3.60 a month            Quarterly has `checkoutPlan: null` —
//                                         buying it dead-ends on "Invalid
//                                         selection". It is not offered here.
//   "Cancel Pro any time" · "Cancel? From  The Stripe Customer Portal has no
//   the dashboard, in two clicks"          cancellation flow enabled
//                                         ([stripe-retention-config]); /plans
//                                         deleted this claim by name and
//                                         surface-claims-truth.test.js bans it.
//   "138 kits exported · 27 designers ·   Fabricated. Removed entirely; nothing
//   4 studios · 9,176 palettes"            replaces it. See PROOF below.
//   "Copy as CSS, JSON, Tailwind or        CSS, JSON and Tailwind are `Soon` in
//   OKLCH" as an EXPORT                    exportFormats.js. Per-tool COPY is
//                                         real; the panel export is not.
//   "PDF · Figma · React · Tokens" chips  Two of those four do not exist.
//   "90 days of version history"          Nothing in this repo stores version
//                                         history. Claim deleted.
//   "Thirteen tools"                      True, and now counted rather than
//                                         typed — see TOOL_COUNT.
//   "1,240 ICONS · 48 PALETTES"           Counted off the real arrays.

/* ── The toolkit ──────────────────────────────────────────────────────────── */

const ALL_TOOLS = createTools()

// LIVE, AND NOT BETA.
//
// The design says "Thirteen tools" twice and lists exactly thirteen routes, and
// the thirteen it lists are the live tools MINUS Brand Starter, which
// toolTree.js marks `beta: true`. That is the honest reading and it is the one
// kept: a beta tool is disclosed as beta wherever it is named (Plans.jsx does
// the same), so counting it into a flat "thirteen tools" headline would make the
// headline quietly wrong the moment a reader opened it.
//
// COUNTED, NOT TYPED. Ship the UI Component Builder and this page says fifteen
// on the next build with no edit here — which is the only reason a derived count
// is worth the indirection.
export const LIVE_TOOLS = ALL_TOOLS.filter((t) => !t.soon && !t.beta)
export const TOOL_COUNT = LIVE_TOOLS.length

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]
/** Spelled out for prose, digits past twenty. "Thirteen tools", not "13 tools". */
export function numberWord(n, { capital = false } = {}) {
  const word = NUMBER_WORDS[n] || String(n)
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word
}

/* ── The bench ────────────────────────────────────────────────────────────────
 *
 * The design's bench is four mock tool windows in a sticky scroll with a
 * numbered rail beside them. The panels are MOCKS OF OUR OWN TOOLS, so the
 * structure survives intact and only the contents change: each panel is one
 * Create category, in the tree's own order, showing that category's real tools
 * and opening at the route `categoryDestination()` gives.
 *
 * A category with nothing live is ABSENT rather than shown empty — UI Component
 * Builder has two tools and both are Soon, and a bench panel for a bench that is
 * not there is the "Soon badge over a disabled button" defect in a bigger frame.
 * Read off the flag, so shipping the group adds its panel.
 *
 * `glyph` names a NavIcon id, not a new drawing: the icon beside a category here
 * and the icon beside the same category in the nav mega-menu are one asset.
 */
export const BENCH = CREATE_GROUPS
  .map((group) => ({
    id: group.id,
    label: group.label,
    glyph: group.id,
    to: categoryDestination(group.id),
    tools: group.tools.filter((t) => !t.soon),
  }))
  .filter((panel) => panel.tools.length > 0)
  .map((panel, i) => ({ ...panel, no: String(i + 1).padStart(2, '0') }))

/** A tool route by id, from the tree. Throws on an unknown id — the same
 *  contract Home.jsx relies on, so a renamed tool fails `npm run build`
 *  rather than shipping a dead link on the front door. */
export const route = toolRoute

/* ── What is in the library, counted ──────────────────────────────────────── */

export const LIBRARY_COUNTS = {
  palettes: LIBRARY_PALETTES.length,
  gradients: GALLERY_GRADIENTS.length,
}

/* ── Plans ────────────────────────────────────────────────────────────────────
 *
 * DISPLAY-ONLY, AND DELIBERATELY. `resolvePlanLadder()` with no `prices`
 * argument returns the founder-approved fallbacks and opens no request.
 * Home.jsx makes the same call for the same reason, stated in its own comment:
 * /plans is the one surface that quotes a live, currency-correct,
 * checkout-backed price, and the front door does not spend an LCP budget on a
 * fetch for a panel five screens down. This page is the front door.
 */
const RESOLVED = resolvePlanLadder()
/** Only the cadences something can accept the click for. Quarterly is absent by
 *  construction — it has no `checkoutPlan` — rather than by being deleted from a
 *  second list somebody has to remember to keep in step. */
export const LADDER = purchasablePlans(RESOLVED)
/** The honest headline figure: the cheapest per-month price among the tiers we
 *  will actually sell. planLadder.js: "Never typed into copy." */
export const CHEAPEST = cheapestPerMonth(RESOLVED)

export function ladderSaving(plan) {
  return savingsVsMonthly(plan, RESOLVED)
}

/** Each cadence's note, derived. A tier with a trial says so (`trialDays`
 *  mirrors what Stripe is told); one that beats monthly by a real margin says by
 *  how much; monthly states the thing a buyer would otherwise meet at the till.
 *  The same function Home.jsx computes, for the same reason. */
export function ladderNote(plan) {
  const bits = []
  const saving = ladderSaving(plan)
  if (saving) bits.push(`Save ${saving}%`)
  if (plan.trialDays) bits.push(`${plan.trialDays}-day free trial`)
  if (!bits.length) bits.push('No trial — bills immediately')
  return bits.join(' · ')
}

const SYSTEMS_TOTAL = COLOUR_SYSTEMS.length
const SYSTEMS_FREE = COLOUR_SYSTEMS.filter((s) => s.free)
const FREE_EXPORTS = freeFormats()
const PRO_EXPORTS = proOnlyFormats()
const UNBUILT_EXPORTS = unbuiltFormats()

// "Style guide (HTML)" → "HTML". Plans.jsx's own two helpers, because the two
// pages have to name the export offer identically or the visitor has met two
// different offers before they reach checkout.
const shortName = (f) => {
  const inParens = /\(([^)]+)\)\s*$/.exec(f.name)
  return inParens ? inParens[1] : f.name
}
export const listNames = (formats) => {
  const names = formats.map(shortName)
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export const EXPORTS = {
  free: FREE_EXPORTS,
  pro: PRO_EXPORTS,
  unbuilt: UNBUILT_EXPORTS,
  freeNames: listNames(FREE_EXPORTS),
  proNames: PRO_EXPORTS.map((f) => f.name).join(' and '),
  unbuiltNames: listNames(UNBUILT_EXPORTS),
}

/* ── The two plan cards ─────────────────────────────────────────────────────
 *
 * Every line is /plans's own claim about the same delta, read from the same
 * modules /plans reads. The design's Free list sold "Copy as CSS, JSON,
 * Tailwind or OKLCH" and its Pro list sold "90 days of version history"; the
 * first conflates the tools' per-tool Copy (real, unmetered) with the export
 * panel (three of those four formats are Soon), and the second names a feature
 * that does not exist anywhere in this repository.
 */
export const FREE_POINTS = [
  `All ${numberWord(TOOL_COUNT)} tools, without an account`,
  `${AI_LIMITS.free.daily} AI generations a day, ${AI_LIMITS.free.monthly} a month`,
  `Style guide exports in ${EXPORTS.freeNames}`,
  `${FREE_SAVE_LIMITS.projects} saved projects and ${FREE_SAVE_LIMITS.customIcons} custom icons`,
  `${SYSTEMS_FREE.length} colour systems (${SYSTEMS_FREE.map((s) => s.label).join(' and ')})`,
]

/** The one thing Free does NOT get, said out loud rather than left as a gap
 *  between two lists. Mobbin/Slash states a plan's exclusions in its own row
 *  rather than making the reader diff two columns:
 *  https://mobbin.com/sites/sections/23755ec5-0281-446a-b5b5-9433d63397c4
 *  On a page whose failure mode has twice been an overstated free tier, the
 *  exclusion is the more useful half. */
export const FREE_EXCLUSION = 'A small “Made with UIL4B” line on exported files'

export const PRO_POINTS = [
  `${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month`,
  `All ${SYSTEMS_TOTAL} colour systems, plus HCT editing`,
  EXPORTS.proNames,
  'Unlimited saved projects and custom icons',
  'Style guides with no “Made with UIL4B” line',
]

export const COMPARE = [
  { group: 'THE TOOLS', label: `All ${numberWord(TOOL_COUNT)} tools`, free: 'Included', pro: 'Included' },
  { label: 'Where the work happens', free: 'Your browser', pro: 'Your browser' },
  { group: 'AI AND CONTROLS', label: 'AI generations', free: `${AI_LIMITS.free.daily} a day, ${AI_LIMITS.free.monthly} a month`, pro: `${AI_LIMITS.pro.daily} a day, ${AI_LIMITS.pro.monthly} a month` },
  { label: 'Colour systems', free: `${SYSTEMS_FREE.length} of ${SYSTEMS_TOTAL}`, pro: `All ${SYSTEMS_TOTAL}, plus HCT editing` },
  { group: 'YOUR WORK', label: 'Saved projects', free: String(FREE_SAVE_LIMITS.projects), pro: 'Unlimited' },
  { label: 'Custom icons', free: String(FREE_SAVE_LIMITS.customIcons), pro: 'Unlimited' },
  { label: 'Style guide exports', free: EXPORTS.freeNames, pro: `${EXPORTS.freeNames}, plus ${EXPORTS.proNames}` },
  { label: 'Export mark', free: '“Made with UIL4B” line', pro: 'Removed' },
]

/* ── The reassurance row ──────────────────────────────────────────────────── */

// The design's three assurances, minus the two that may not ship.
//
// "Cancel Pro any time" is the claim /plans deleted under a founder flag,
// because the Stripe portal has no cancellation flow enabled; re-adding it on
// the front page would retract nothing.
//
// "No card needed for Free" IS THE RETIRED TAGLINE, and it came back here
// because whoever built this row did not know it had been retired. The founder,
// 2026-09-07: *"remove the no credit card required tag line … these all over the
// place is a huge AI Slop feature"*. It is swept by
// tests/user-sim/62-retired-taglines.spec.js on every prerendered route, and it
// was failing on `/` and `/home` — the two routes that matter most — from the
// day Spectrum became the front door.
//
// DELETED, NOT REWORDED. That was his instruction for this class of line the
// last time one was removed: a payment-reassurance line reworded is still a
// payment-reassurance line. The fact itself is not lost — the Free plan card
// under #pricing says "No account needed to use the tools" and prices at $0,
// which is the same reassurance made by the product rather than asserted at the
// reader.
//
// The remaining two are true and stay in his words.
export const ASSURANCES = [
  { icon: 'lock', label: 'Image and video work happens in your browser' },
  { icon: 'check', label: `Every one of the ${numberWord(TOOL_COUNT)} tools opens without an account` },
]

/* ── The proof band ───────────────────────────────────────────────────────────
 *
 * THE DESIGN'S FOUR PROOF NUMBERS ARE GONE AND NOTHING COUNTS IN THEIR PLACE.
 *
 * "138 kits exported since we opened the toolkit · 27 designers building with it
 * every week · 4 studios using it on client work · 9,176 palettes generated"
 * under the heading "Don't just take it from us". None of those is measured
 * anywhere in this repository; the analytics this app has could not produce
 * three of them. They are placeholder proof, and shipping them on the front door
 * is the single most expensive sentence on this page.
 *
 * Substituting better-behaved numbers was considered and rejected twice over.
 * Home.jsx's own note records why: its community grid printed `{design.saves}`
 * on every card, every one of them zero, and the conclusion drawn there was
 * "the fix for empty social proof is to stop making a social claim — not to
 * find a better zero". And the obvious fallback — a three-up strip of countable
 * figures — is the component the founder marked "AI" by name on the Font
 * Gallery masthead, which is why `.htools-facts` was deleted from this very
 * page in the 2026-09-09 audit.
 *
 * So the slot keeps its JOB — the last reassurance before the price — and
 * changes its EVIDENCE. Each row is a property of the product a visitor can
 * check in one click, in sentences this app already ships, with the tool that
 * proves it named beside it. It claims nothing about anyone else using it,
 * because we cannot yet say anything true about that.
 *
 * A REAL testimonial band belongs here the day there is a real testimonial, and
 * the heading "Don't just take it from us" is the founder's and is waiting for
 * it. That is in the handover, not invented here.
 */
export const PROOF = [
  {
    claim: 'Nothing here is saved unless you ask.',
    note: 'Colour, type and image work runs in the browser. Only AI prompts leave the machine, and they carry text, not your assets.',
    toolId: 'file-converter',
    linkLabel: 'Open File Converter',
  },
  {
    claim: 'Every value is a real value you can copy out.',
    note: 'Contrast ratios are computed against the colours on screen, not quoted from a table.',
    toolId: 'contrast',
    linkLabel: 'Open Contrast Checker',
  },
  {
    claim: 'The limits are printed before you reach them.',
    note: `Free saves ${FREE_SAVE_LIMITS.projects} projects and runs ${AI_LIMITS.free.daily} AI generations a day. Both numbers are on the plan, on the tool and in the panel.`,
    to: '/plans',
    linkLabel: 'See the plans',
  },
]

/* ── FAQ ──────────────────────────────────────────────────────────────────────
 *
 * The design ships four. Three are kept — they came from the founder's brief and
 * the answers hold — and the fourth ("Can I cancel? From the dashboard, in two
 * clicks, no email required.") is replaced, because it is false twice over: the
 * portal has no cancellation flow, and there is no two-click path to one.
 *
 * Where an answer states a figure, the figure is interpolated rather than typed,
 * and where /plans already answers the same question its answer is used rather
 * than a second wording of it — a visitor who reads both pages has to meet one
 * product, not two.
 */
export const FAQS = [
  {
    q: 'What counts as one generation?',
    a: 'One image described by the Alt Text generator, or one prompt produced by an AI tool. Browsing, editing palettes, building type scales, exporting a style guide and everything else in the toolkit are unmetered — they run in your browser and cost us nothing.',
  },
  {
    q: 'Is the Pro model different?',
    a: 'No, and we will not claim otherwise. Free and Pro run the same model today. Pro buys capacity, the advanced colour controls, and cleaner handoff — not different output from the same prompt.',
  },
  {
    q: 'Do my files get uploaded?',
    a: 'Image and video work happens in the browser. Only AI prompts leave the machine, and they carry text, not your assets.',
  },
  {
    q: 'Which export formats can I actually get?',
    a: `${EXPORTS.free.length} on Free — ${EXPORTS.freeNames} — each carrying a small “Made with UIL4B” line in the footer. Pro removes that line and adds ${EXPORTS.proNames}. ${EXPORTS.unbuilt.length} more formats (${EXPORTS.unbuiltNames}) are listed in the export panel as Soon: they are not built, so nobody has them and Pro does not sell them.`,
  },
]
