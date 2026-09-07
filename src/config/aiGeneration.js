// THE BRAND STARTER ALLOWANCE — one table, printed by the page and enforced by
// the server.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS RATHER THAN A SENTENCE ON /plans
// ─────────────────────────────────────────────────────────────────────────────
// This page has shipped a false AI claim twice already (see the top of
// tests/unit/plans-truth.test.js): "1,000 AI actions a day" against a provider
// tier metered PER PROJECT, and "full design JSON" as a Pro benefit for a file
// the product cannot make. Both times the mechanism was the same — a capability
// DESCRIBED in copy instead of DERIVED from the thing that implements it.
//
// index.html once carried three more of them, all AI limits, all removed.
//
// A feature whose whole proposition is a NUMBER ("one free generation") is the
// most dangerous place left for that to happen again, so the number lives here
// and every surface reads it: /plans prints it, the tool prints it, and
// api/_lib/aiGeneration.js enforces it.
//
// ⚠️ MIRROR. api/_lib/aiGeneration.js is the SECURITY BOUNDARY and the real
// answer — a browser can be told anything. These values exist so the UI can
// quote the allowance without a round trip, exactly as src/config/plans.js
// mirrors api/_lib/plans.js. tests/unit/ai-generation-truth.test.js IMPORTS
// BOTH MODULES and fails the build if any number disagrees, so the two cannot
// drift and ship.
//
// This lives outside any component module because a constant exported alongside
// a component trips react-refresh/only-export-components and breaks fast
// refresh. Plain data belongs in a plain module. Explicit `.js` extensions on
// its own imports for the same reason src/data/toolIndex.js uses them:
// `node --test` resolves ESM strictly and the guard test has to import this.

// The toolId every usage bucket is keyed by. Shared with the server; it is also
// what makes the Brand Starter's allowance independent of Alt Text's and the
// Image Prompt's, which meter on 'alt-text' and 'prompts-ai'.
export const BRAND_STARTER_TOOL_ID = 'brand-starter'

// ─────────────────────────────────────────────────────────────────────────────
// THE TWO NUMBERS
// ─────────────────────────────────────────────────────────────────────────────

// The founder's own words, 2026-09-06: "free users will get 1 free usage".
// ONE PER ACCOUNT, EVER — not one per day and not one per month. A free trial
// that silently refills is not a trial, it is an unmetered feature with a
// slow tap, and this one calls a paid provider on every press.
export const FREE_TOTAL_GENERATIONS = 1

// ⚠️ THE FOUNDER'S NUMBER TO CHANGE. He said "paid get more" and did not say
// how many; this is the defensible reading, and it is deliberately the ONLY
// place the figure appears.
//
// How it was derived, so it can be argued with rather than guessed at again:
//
//   · api/_lib/plans.js sizes the whole AI offer from a shared provider ceiling
//     of ~200 successful generations a DAY, site-wide, and lands Pro at 30/day
//     and 300/month across every AI tool. A Brand Starter generation is ONE
//     text completion — cheaper than the alt-text vision call that budget was
//     built around — so 20 is ~7% of the Pro monthly AI allowance and cannot
//     meaningfully crowd the shared pool even if every Pro user exhausts it.
//   · The JOB does not recur daily. A brand starter is what you press when you
//     begin a system, and the free save cap is 3 projects. 20 a month is a new
//     starting point every working day and a half, which is past the point of
//     usefulness rather than short of it.
//   · It is a BETA. Raising a beta allowance costs nothing and reads as
//     generosity; lowering one reads as a takeaway. Start where it is easy to
//     move up from.
//
// It resets on the 1st, on the same monthly bucket api/_lib/plans.js already
// uses, so there is no second reset date for anyone to learn.
export const PRO_MONTHLY_GENERATIONS = 20

// ─────────────────────────────────────────────────────────────────────────────
// THE TABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What each plan gets, and over what window.
 *
 * `period` is load-bearing rather than decorative: it is what stops the UI
 * telling a free user their allowance "resets on the 1st". It does not. Saying
 * so would send them back in a month to the same wall, which is the exact
 * failure api/ai.js's existing limit copy was written to avoid ("you have hit
 * your limit" with no period and no reset time).
 */
export const GENERATION_ALLOWANCES = Object.freeze({
  free: Object.freeze({ total: FREE_TOTAL_GENERATIONS, period: 'lifetime' }),
  pro: Object.freeze({ total: PRO_MONTHLY_GENERATIONS, period: 'month' }),
})

/** The allowance for a plan id. Anything unrecognised is treated as Free. */
export function generationAllowance(planId) {
  return GENERATION_ALLOWANCES[planId] || GENERATION_ALLOWANCES.free
}

/**
 * The allowance as a sentence, so /plans and the tool cannot word it
 * differently. Returns the words, never a bare number — "1" beside a feature
 * name does not say one WHAT, or for how long.
 */
export function allowanceSentence(planId) {
  const { total, period } = generationAllowance(planId)
  const unit = total === 1 ? 'generation' : 'generations'
  return period === 'lifetime'
    ? `${total} ${unit}, once per account`
    : `${total} ${unit} a month`
}

/** What is left, floored at zero. Used by the meter and by the refusal copy. */
export function generationsRemaining(planId, used) {
  const { total } = generationAllowance(planId)
  const left = total - (Number.isFinite(used) ? used : 0)
  return left > 0 ? left : 0
}

/**
 * Why a person cannot press Generate, in words, or null when they can.
 *
 * Both branches name what runs out and what happens next, because a refusal
 * that only says "limit reached" is a dead end — and a free user's dead end is
 * the one moment the product has to be honest rather than salesy about what
 * upgrading actually buys (capacity; see the model note in api/_lib/plans.js).
 */
export function exhaustedMessage(planId, used) {
  if (generationsRemaining(planId, used) > 0) return null
  const { total, period } = generationAllowance(planId)
  if (period === 'lifetime') {
    return `You have used your ${total === 1 ? 'one free generation' : `${total} free generations`}. `
      + 'Pro raises this to a monthly allowance — everything you have already generated stays where it is.'
  }
  return `You have used all ${total} Brand Starter generations in your plan this month. It resets on the 1st.`
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE FEATURE PRODUCES — the founder's "and more", named
// ─────────────────────────────────────────────────────────────────────────────
//
// The founder asked for "a pallete, font, and more". `and more` is ONE further
// artefact, and it is the TYPE SCALE, chosen for a reason that is not "it was
// easy": palette, fonts and type scale are three of the four steps the brand
// kit walkthrough already walks (utils/brandKitGuide.js — Colours, Fonts, Type
// scale, Icons), and the first three are exactly the ones a description can
// answer. Icons cannot be generated honestly here: /create/icons reads the
// Iconify catalogue over the network and a model naming icon ids it cannot see
// would be inventing them.
//
// A gradient was the other candidate and was rejected: it is decoration rather
// than a system part, `partsPresent()` does not read one, and shipping it would
// have made the result a set of three things where two are structural and one
// is a flourish.
//
// Each artefact declares the tool it opens in. Those routes are checked against
// liveToolRoutes() by tests/unit/ai-generation-truth.test.js, the same way
// tests/unit/brand-kit-guide.test.js checks the walkthrough's — which is the
// assertion that would have caught /create/color becoming a landing page
// underneath the guided flow.
export const BRAND_STARTER_ARTEFACTS = Object.freeze([
  Object.freeze({
    id: 'palette',
    label: 'Palette',
    opensIn: 'Palette Builder',
    route: '/create/palette',
    part: 'palette',
  }),
  Object.freeze({
    id: 'fonts',
    label: 'Font pairing',
    opensIn: 'Font Pair',
    route: '/create/font-pair',
    part: 'fonts',
  }),
  Object.freeze({
    id: 'typeScale',
    label: 'Type scale',
    opensIn: 'Type Scale',
    route: '/create/type-scale',
    part: 'type-scale',
  }),
])

// ─────────────────────────────────────────────────────────────────────────────
// INPUT LIMITS — cost control, stated where the field can print them
// ─────────────────────────────────────────────────────────────────────────────

// Provider input tokens are real money and the founder is a solo developer, so
// the brief is capped rather than trusted. 500 matches the cap alt-text already
// applies to its `context` field, which keeps one number across the AI surface.
// The server slices to the same figure — the field showing a counter is a
// courtesy, not the enforcement.
export const MAX_PROMPT_CHARS = 500

// Below this there is nothing to design from and the generation would spend a
// unit of a one-shot allowance on a coin toss. Checked in the browser so it
// never costs a request, and again on the server so it never costs a unit.
export const MIN_PROMPT_CHARS = 12

// How many roles a palette comes back with. The Palette Builder's board holds
// up to ten columns (BOARD_HANDOFF_MAX in utils/colorHandoff.js), so eight
// leaves room and five is the smallest set that can carry background, surface,
// text, primary and accent without doubling a role up.
export const PALETTE_MIN_ROLES = 5
export const PALETTE_MAX_ROLES = 8

// ─────────────────────────────────────────────────────────────────────────────
// BETA
// ─────────────────────────────────────────────────────────────────────────────
//
// Declared as data so the nav badge, the tool header and the plans table read
// one flag instead of three hand-typed "Beta" strings that can be removed
// individually. The word is the whole treatment: no sparkle, no shimmer, no
// gradient — see .claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md,
// and the founder's own note that these surfaces "can provoke an unwanted AI
// slop feeling".
export const BRAND_STARTER_BETA = true

// What "beta" is actually promising, in one sentence, wherever the badge needs
// explaining. It states a LIMIT rather than an excuse: the honest content of
// the label is that the output is a starting point and the allowance is small
// while the cost is being measured.
export const BETA_NOTE = 'Beta: the output is a starting point to edit, not a finished brand. '
  + 'Allowances are small while we measure what this costs to run.'
