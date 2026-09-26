// THE BRAND KIT WALKTHROUGH — the reading behind the guided flow.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FOUNDER'S ASK, 2026-09-05
// ─────────────────────────────────────────────────────────────────────────────
// “lets make the one in the navigation the create Brand system should start a
// guided walkthrough to build a full system”, and separately “build a brand kit
// should go straight into step 1 then provide a popup with a quick set of
// information”.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS ACTUALLY WRONG, MEASURED BEFORE ANY DESIGN WORK
// ─────────────────────────────────────────────────────────────────────────────
// The walkthrough existed and was DEAD ON ARRIVAL. Pressing “Build a brand kit”
// in the Create mega menu set the session flag and navigated to `/create/color`
// — and `/create/color` stopped being a tool. App.jsx routes it to ColorLanding,
// the compressed colour SALES page (“One colour system, start to finish.”), and
// ColorStudio — the only page that rendered `<UIKitGuide step="color" />` — now
// mounts on exactly one route, `/create/semantic-color`, which is not in the
// flow. So the front door set a flag and dropped the visitor on a page of five
// links with no step bar, no popup and no step 1. Reproduced in a browser: flag
// `1`, `.uikit-stepbar` absent, `.uikit-intro` absent.
//
// That is both founder complaints in one defect, and it is why step one below is
// `/create/palette`. That is the route SYSTEM_PARTS (utils/userHome.js) and
// FIRST_WINS (utils/firstWin.js) already name as the colour tool, and the one
// that actually writes `design.palette`.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHERE THE STATE LIVES — DECIDED BEFORE THE SCREENS, AND NOTHING NEW WAS BUILT
// ─────────────────────────────────────────────────────────────────────────────
// A guided flow is only worth having if step 4 knows what happened in step 1, so
// the first question was where that knowledge lives. The answer already existed:
// `design` in contexts/ProjectContext.jsx. Every step's tool already reads and
// writes it — PaletteBuilder `setPalette`, FontMatcher `setFonts`, TypeScale
// `setTypeScale` — it is mirrored to localStorage under `vs-current-design` and
// pushed to Firestore per project, and `saveProject` snapshots it whole.
//
// So the walkthrough adds NO store of its own and NO hand-off slot. There is no
// staged draft to leak, which is why no `createHandoffSlot` appears here: the
// hand-off between steps is that both ends read the same saved design. (See
// utils/handoffSlot.js for the trap that applies to slots that DO get staged
// from a link — a modified click stages in a tab that never navigates. Nothing
// here stages, so nothing here can leak.)
//
// PROGRESS IS DERIVED, NEVER COUNTED. `partsPresent()` in utils/userHome.js
// already answers “which parts of this system has anyone actually built?” by
// comparing the design against DEFAULT_DESIGN, and the User Home already renders
// that reading. Reusing it means the walkthrough's ticks and the project card's
// ticks are the same measurement and cannot disagree — and a counter cannot
// drift out of step with the work, because there is no counter.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT MUST BE RESUMABLE, AND HOW
// ─────────────────────────────────────────────────────────────────────────────
// A full brand system is not a single sitting. Because completion is derived
// from saved work rather than from a cursor, resuming is not a feature that
// needed building: `firstIncompleteStep()` below reads the same design and says
// where to go back to. The one thing that did change is that the “in the flow”
// flag moved from sessionStorage to localStorage, because sessionStorage dies
// with the tab and a flow you cannot come back to tomorrow is not resumable.
//
// MOBBIN, and which screen drove which decision:
//   • Klaviyo “Set up your account” — a checklist whose completed rows keep a
//     green tick and whose header carries a real percentage (36% → 45% between
//     two screens in the same flow). That drove DERIVED completion and the
//     decision that finished steps stay visible rather than collapsing.
//     https://mobbin.com/flows/b7b2c5a6-1a8f-46eb-bdd9-df23c3aae492
//   • Cofounder onboarding — a “Design Roadmap” rail along the bottom showing
//     the ordered cards with the current one lit, plus a persistent “Skip
//     onboarding →”. That drove the step RAIL shape and the always-present exit.
//     https://mobbin.com/flows/fb656a96-bbee-4752-871f-5206d44202e7
//   • Weavy and FLORA — a coach card DOCKED at the bottom of a live canvas with
//     a close X, the canvas fully usable behind it. That drove the orientation
//     popup being docked and non-modal rather than centred behind a scrim.
//     https://mobbin.com/screens/c08a2be4-1418-4217-9795-81932e345167
//     https://mobbin.com/screens/74c49ba5-be5f-4fc4-9dd1-363c9dd50ac5
//
// DOM-free and React-free, for the same reason as utils/firstWin.js and
// utils/userHome.js: this is the logic the flow is judged on, and it should be
// testable without a browser.

import { partsPresent } from './userHome.js'
import { DEFAULT_DESIGN } from '../data/designDefaults.js'

/** Live under localStorage, not sessionStorage — see the resumability note. */
export const GUIDE_KEY = 'vs-uikit-guide'
/** Whether the orientation card has been shown once already. */
export const GUIDE_SEEN_KEY = 'vs-uikit-guide-seen'

/**
 * The ordered steps, and the four the Create mega-menu card already promises:
 * Colours, Fonts, Type scale, Icons. The menu card derives its numbered list
 * from THIS array (see PillNav.jsx), so the promise and the flow cannot drift.
 *
 * `path` MUST be a live Create tool that renders. tests/unit/brand-kit-guide.test.js
 * checks each one against liveToolRoutes() in src/data/toolTree.js and against
 * the routes that only redirect, exactly the way first-win.test.js does — which
 * is the assertion that would have caught `/create/color` becoming a landing
 * page underneath this flow.
 *
 * `part` is the id in SYSTEM_PARTS whose presence marks the step done, or null
 * where the artefact is not part of the saved design (icons). Naming it here
 * rather than inferring it keeps one vocabulary across the walkthrough, the
 * project card and the User Home.
 */
export const BRAND_KIT_STEPS = Object.freeze([
  Object.freeze({
    id: 'color',
    label: 'Colours',
    blurb: 'Pick a seed and build the full set',
    path: '/create/palette',
    part: 'palette',
  }),
  Object.freeze({
    id: 'fonts',
    label: 'Fonts',
    blurb: 'Pair a heading and a body face',
    path: '/create/font-pair',
    part: 'fonts',
  }),
  Object.freeze({
    id: 'typescale',
    label: 'Type scale',
    blurb: 'Set the base size and the ratio',
    path: '/create/type-scale',
    part: 'type-scale',
  }),
  Object.freeze({
    id: 'icons',
    label: 'Icons',
    blurb: 'Choose a set that fits the system',
    path: '/create/icons',
    // Icons are not part of the saved design object, so there is nothing in
    // `design` to compare. `iconsTouched` is passed in instead — see below.
    part: null,
  }),
])

/**
 * What each finished step actually produced, in a few characters.
 *
 * This is the whole point of a guided flow rather than four bookmarks: standing
 * on Icons you can see the palette you drew on Colours and the faces you chose
 * on Fonts. Values come straight off the same design object, so the rail cannot
 * show a system the tools did not build.
 *
 * `colors` is capped because the rail renders them as swatches in a chip.
 */
const SWATCH_CAP = 5

export function stepArtefacts(design) {
  const d = withDefaults(design)
  const colors = (Array.isArray(d.palette?.colors) ? d.palette.colors : [])
    .filter((c) => typeof c === 'string' && c)
    .slice(0, SWATCH_CAP)
  const heading = d.fonts?.heading?.family || null
  const body = d.fonts?.body?.family || null
  const base = Number(d.typeScale?.base)
  const ratio = Number(d.typeScale?.ratio)

  return {
    color: { colors },
    fonts: {
      // One line when both faces are the same family, which is a real and
      // common choice — "Inter / Inter" reads like a bug.
      text: heading && body ? (heading === body ? heading : `${heading} / ${body}`) : null,
    },
    typescale: {
      text: Number.isFinite(base) && Number.isFinite(ratio)
        ? `${base}px · ${ratio}`
        : null,
    },
    icons: {},
  }
}

/**
 * Fill a partial design out of the defaults before reading it.
 *
 * A FOUND DEFECT, and it is worth stating because the fix looks like paranoia.
 * `partsPresent()` decides a part is present when it DIFFERS from the default,
 * so an ABSENT part differs too: `norm(undefined) === ''`, which is not
 * `'inter'`, so `{}` reports its fonts as chosen. The User Home never sees that
 * because ProjectContext hands out `{ ...DEFAULT_DESIGN, ...parsed }` and a
 * saved project always carries a whole design — but this module is also called
 * from the nav on every render, before anything is loaded, and "nothing built"
 * must never render as "one of four built".
 *
 * Group-by-group rather than a top-level spread: the four groups are what
 * `partsPresent` reads, and a shallow spread would leave `{ palette: null }`
 * as null.
 */
function withDefaults(design) {
  const d = design && typeof design === 'object' ? design : {}
  const out = { ...DEFAULT_DESIGN, ...d }
  for (const key of ['palette', 'fonts', 'typeScale', 'tints']) {
    const group = d[key]
    out[key] = group && typeof group === 'object'
      ? { ...DEFAULT_DESIGN[key], ...group }
      : DEFAULT_DESIGN[key]
  }
  return out
}

/**
 * The four steps with `done` resolved, in order.
 *
 * `iconsTouched` is injected rather than read here because the only honest
 * signal for it is `getRecentIcons()` in utils/recentIcons.js — a localStorage
 * list the Icon Library already writes and the dashboard rail already reads.
 * Injecting keeps this module DOM-free and lets a test pin the value.
 */
export function guideSteps(design, { iconsTouched = false } = {}) {
  const full = withDefaults(design)
  const present = partsPresent(full)
  const artefacts = stepArtefacts(full)
  return BRAND_KIT_STEPS.map((step, index) => ({
    ...step,
    index,
    number: index + 1,
    done: step.part ? !!present[step.part] : !!iconsTouched,
    artefact: artefacts[step.id] || {},
  }))
}

/** How many of the four are built, and out of how many. */
export function guideProgress(design, options) {
  const steps = guideSteps(design, options)
  const done = steps.filter((s) => s.done).length
  return { steps, done, total: steps.length, complete: done === steps.length }
}

/**
 * Where “Resume” goes: the first step with no work in it, or null when the
 * system is finished.
 *
 * Deliberately the FIRST incomplete rather than “the one after the last done” —
 * someone who set a type scale before choosing colours should be sent back to
 * the gap, not forward past it.
 */
export function firstIncompleteStep(design, options) {
  const { steps } = guideProgress(design, options)
  return steps.find((s) => !s.done) || null
}

/**
 * The destination for the nav's brand-kit action.
 *
 * A FRESH start always opens step one. That is the founder's instruction —
 * “build a brand kit should go straight into step 1” — and it holds even for
 * someone whose design already has colours in it, because starting a brand kit
 * is a decision to go through the whole thing.
 *
 * Once the flow is ALREADY RUNNING the same control resumes instead, landing on
 * the first gap. That is the Klaviyo reading: a setup checklist you return to
 * shows you what is left, it does not restart you.
 */
export function guideEntry(design, { active = false, ...options } = {}) {
  if (!active) {
    return { resume: false, step: BRAND_KIT_STEPS[0], path: BRAND_KIT_STEPS[0].path }
  }
  const next = firstIncompleteStep(design, options)
  const step = next || BRAND_KIT_STEPS[0]
  return { resume: true, step, path: step.path }
}

/* ── the flow flag, and why it is localStorage ─────────────────────────────
   "I am part-way through the walkthrough" has to survive closing the tab,
   because a full brand system is not a single sitting. It used to be
   sessionStorage, which dies with the tab and made the flow un-resumable by
   construction. The key is unchanged and already disclosed in
   utils/dataExport.js.

   `storage` is injected exactly the way utils/onboardingState.js injects it, so
   these are testable without a browser and this module stays React-free. Every
   access is wrapped: localStorage THROWS rather than returning empty where a
   browser is set to block site data, and the correct behaviour with no stored
   value is the behaviour a first-time visitor gets anyway. */
function store(storage) {
  if (storage) return storage
  return typeof localStorage === 'undefined' ? null : localStorage
}

function read(key, storage) {
  try { return store(storage)?.getItem(key) ?? null } catch { return null }
}

function write(key, value, storage) {
  try { store(storage)?.setItem(key, value) } catch { /* quota / blocked */ }
}

function drop(key, storage) {
  try { store(storage)?.removeItem(key) } catch { /* blocked */ }
}

/** Is the visitor part-way through the walkthrough? */
export const isGuideActive = (storage) => read(GUIDE_KEY, storage) === '1'
/** Enter the flow. The nav's brand-kit action calls this. */
export const startGuide = (storage) => write(GUIDE_KEY, '1', storage)
/** Leave it. The card stays "seen" so re-entering does not re-teach. */
export const endGuide = (storage) => drop(GUIDE_KEY, storage)
/** Has the orientation card already been offered once? */
export const introSeen = (storage) => read(GUIDE_SEEN_KEY, storage) === '1'
/** Record that it has. Called when it is DISMISSED, never while rendering. */
export const markIntroSeen = (storage) => write(GUIDE_SEEN_KEY, '1', storage)

/**
 * The router state a new blank project arrives with. The first step's
 * orientation card reads it and opens for the new project even when the card
 * was seen before; it is navigation state, so it lives on that one history
 * entry and nothing is stored.
 */
export const NEW_PROJECT_STATE = Object.freeze({ newProject: true })

/** The step object for a page's `step` prop, or null when it names no step. */
export const stepById = (id) => BRAND_KIT_STEPS.find((s) => s.id === id) || null

/** The step after this one, or null at the end of the flow. */
export function nextStep(id) {
  const i = BRAND_KIT_STEPS.findIndex((s) => s.id === id)
  return i >= 0 ? BRAND_KIT_STEPS[i + 1] || null : null
}
