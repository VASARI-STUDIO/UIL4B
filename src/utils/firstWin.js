// The first win, and the one screen that puts it on the path.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The last thing onboarding did was ask for money. A brand-new account — three
// survey questions deep, nothing built, nothing saved — was shown a two-tier
// pricing table and asked to choose. The audit's own highest-impact finding
// (B5): the product asks to be paid before it has demonstrated it is worth
// paying for, and the step immediately after that is /projects, which asks the
// user to go and start again.
//
// So the pricing step is replaced by the first real move. Not a tour, not a
// video, not a checklist of things to read: three concrete artefacts, each one
// a live tool that opens when you pick it.
//
// ── WHY THESE THREE, AND NOT ANY OTHER THREE ────────────────────────────────
//
// Because they are the three the SIGN-UP PROMISE already named. LoginPopup.jsx
// tells someone creating an account, in the largest type on the dialog:
//
//     "Your palettes, type scales and gradients, kept."
//
// That is the contract the account was created under. Landing that person on a
// pricing table changed the subject; landing them on a palette, a type scale or
// a gradient is the same sentence, now in the imperative. Anything else here
// would be a fourth thing the product never promised — and the promise is the
// only honest reason to prefer one starting point over another.
//
// ── WHAT COUNTS AS THE WIN ──────────────────────────────────────────────────
//
// NOT arriving on the tool. The win is the SAVED artefact — the first thing
// that required an account and survives the session — which is why `activation`
// below names the event trackActivation already fires, and why utils/
// timeToValue.js measures from the moment this screen is answered to the moment
// that event lands. A card that opened a tool and was never saved is a
// measurable failure of this screen, and it is meant to be.
//
// DOM-free and React-free, so the routing table can be tested without a browser
// and the page stays a renderer. Same reason utils/projectQuota.js and
// utils/onboardingState.js live apart from their pages.

/**
 * The three starting points, in the order the sign-up promise names them.
 *
 * `route` MUST be a live Create tool. tests/unit/first-win.test.js checks each
 * one against liveToolRoutes() in src/data/toolTree.js, so flipping a tool to
 * `soon: true` or renaming its route fails the build instead of shipping an
 * onboarding card that dead-ends on a "still building" screen.
 *
 * `activation` is the id trackActivation() reports under, so "which start did
 * we recommend" and "did that start produce anything" are the same vocabulary.
 */
export const FIRST_WINS = Object.freeze([
  Object.freeze({
    id: 'palette',
    label: 'A colour palette',
    blurb: 'Start from one colour and build the full set — then save it to your projects.',
    route: '/create/palette',
    activation: 'palette',
  }),
  Object.freeze({
    id: 'type-scale',
    label: 'A type scale',
    blurb: 'Pick two families and get every size, ready to paste — then save it to your projects.',
    route: '/create/type-scale',
    activation: 'type-scale',
  }),
  Object.freeze({
    id: 'gradient',
    label: 'A gradient',
    blurb: 'Build a CSS gradient you can use straight away — then save it to your projects.',
    route: '/create/gradient',
    activation: 'gradient',
  }),
])

const BY_ID = new Map(FIRST_WINS.map((w) => [w.id, w]))

/** The chosen start, or null for anything that is not one of the three. */
export function firstWinById(id) {
  return BY_ID.get(id) || null
}

/**
 * Where picking `id` should send someone. Null — never a bare '/' or a guess —
 * when the id is not one of the three, so a caller has to decide what to do
 * about it rather than silently navigating somewhere arbitrary.
 */
export function firstWinRoute(id) {
  return BY_ID.get(id)?.route || null
}

/**
 * Every id this screen can record, for the analytics counter and for tests.
 * 'skipped' is deliberately one of them: someone who declines is the single
 * most important cohort on this screen, and a counter that only knows about
 * the three cards cannot see them at all.
 */
export const FIRST_WIN_SKIPPED = 'skipped'

// There is no 'exited' counter. There was one while three survey questions sat
// in front of this screen — leaving before reaching the cards is a different
// failure from seeing them and wanting none. With the survey gone this is the
// ONLY screen, so nothing can exit before it, and a counter no code path can
// ever increment is a permanent zero that reads like a finding.

export function firstWinIds() {
  return [...FIRST_WINS.map((w) => w.id), FIRST_WIN_SKIPPED]
}

/**
 * Is `value` something we are willing to write to the profile as a first-win
 * choice? Guards the persisted shape: the admin table and the counters both
 * read it, and neither should ever have to cope with an arbitrary string.
 *
 * Only a real card qualifies. 'skipped' is counted but never persisted — the
 * decline path has always refused to write an answer nobody gave, on the
 * grounds that inventing blanks puts empty values in the admin table, and a
 * profile field reading "skipped" would be exactly that with extra steps.
 */
export function isFirstWinChoice(value) {
  return typeof value === 'string' && BY_ID.has(value)
}
