// WHAT IS ACTUALLY IN A PROJECT — the reading behind the User Home.
//
// ────────────────────────────────────────────────────────────────────────
// THE FOUNDER'S ASK, 2026-09-05
// ────────────────────────────────────────────────────────────────────────
// “see what is actually in each project at a glance (palette, fonts, scale)
// rather than a name” and “progress, so a project with colours but no type scale
// says so”. Both of those are one question — which of the four things a design
// system is made of does this project actually have? — so they are one function.
//
// ────────────────────────────────────────────────────────────────────────
// WHY “PRESENT” IS MEASURED AGAINST THE DEFAULTS AND NOT AGAINST EMPTINESS
// ────────────────────────────────────────────────────────────────────────
// Every saved project carries a full design object, because ProjectContext
// snapshots the whole working design on save. So a project the user never
// touched still HAS fonts (Inter/Inter), a type scale (16px / 1.25) and a
// palette (one colour, #0051FF). Asking “is there a typeScale?” would answer yes
// for every project ever saved, and the progress display would be four ticks on
// every card — a control that cannot report a difference, which is worse than
// not having one.
//
// So a part counts as PRESENT when it differs from DEFAULT_DESIGN. That is the
// only reading that can distinguish “I chose 16px” from “nobody has been here”,
// and it is derived from the same object the save path writes, so it cannot
// drift from the product the way a hard-coded ‘Inter’ would.
//
// The one place this is deliberately generous: a single-colour palette counts as
// present if that colour is not the default seed. Somebody whose whole system is
// one brand colour has made a decision, and telling them their palette is
// missing would be wrong.
//
// ────────────────────────────────────────────────────────────────────────
// THE METRIC RULE
// ────────────────────────────────────────────────────────────────────────
// homeStats() DROPS ANY FIGURE THAT IS ZERO. The homepage community strip was
// fixed in this repository for printing “0 saves” on every card, and the finding
// on that item was that an honest zero is still the weakest possible thing to
// say about yourself. A counter with nothing behind it is not data, it is
// furniture, so it does not render at all. Every figure that DOES render is
// counted off the same `projects` array the save cap counts, so none of them can
// disagree with the cap or with each other.
//
// DOM-free and React-free — same reason as utils/firstWin.js and
// utils/projectQuota.js: this is the logic the page is judged on, and it should
// be testable without a browser.

import { DEFAULT_DESIGN } from '../data/designDefaults.js'

/**
 * The four parts a design system is made of in this product, in the order the
 * work actually happens: colour first, because everything else is chosen
 * against it; then the scale; then the faces; then the tints derived from the
 * colour.
 *
 * `tool` is the live Create route that BUILDS that part. tests/unit/user-home.test.js
 * checks each one against liveToolRoutes() in src/data/toolTree.js, exactly the
 * way first-win.test.js does, so flipping a tool to `soon: true` or renaming a
 * route fails the build instead of shipping a suggestion that dead-ends.
 */
export const SYSTEM_PARTS = Object.freeze([
  Object.freeze({ id: 'palette', label: 'Palette', tool: '/create/palette', action: 'Build the palette' }),
  Object.freeze({ id: 'type-scale', label: 'Type scale', tool: '/create/type-scale', action: 'Set the type scale' }),
  Object.freeze({ id: 'fonts', label: 'Fonts', tool: '/create/font-pair', action: 'Pair the fonts' }),
  Object.freeze({ id: 'tints', label: 'Tints', tool: '/create/tint', action: 'Generate the tints' }),
])

const norm = (value) => String(value == null ? '' : value).trim().toLowerCase()

/**
 * Which of the four parts this design has actually had work done on.
 *
 * Defaults are injected rather than imported at the call site so a test can pin
 * the COMPARISON without depending on today's default values.
 */
export function partsPresent(design, defaults = DEFAULT_DESIGN) {
  const d = design || {}
  const base = defaults || DEFAULT_DESIGN

  const colors = Array.isArray(d.palette?.colors) ? d.palette.colors.filter(Boolean) : []
  const seed = norm(base.palette?.colors?.[0] ?? base.palette?.base)
  const palette = colors.length > 1 || (colors.length === 1 && norm(colors[0]) !== seed)

  const fonts = norm(d.fonts?.heading?.family) !== norm(base.fonts?.heading?.family)
    || norm(d.fonts?.body?.family) !== norm(base.fonts?.body?.family)

  // A number the user moved, not a number that merely exists. `Number()` rather
  // than a truthiness check: 0 is a real (if odd) base size and must not read as
  // “absent”, and undefined must not read as “changed”.
  const scaleBase = Number(d.typeScale?.base)
  const scaleRatio = Number(d.typeScale?.ratio)
  const typeScale = (Number.isFinite(scaleBase) && scaleBase !== Number(base.typeScale?.base))
    || (Number.isFinite(scaleRatio) && scaleRatio !== Number(base.typeScale?.ratio))

  const tints = Array.isArray(d.tints?.scale) && d.tints.scale.length > 0

  return { palette, 'type-scale': typeScale, fonts, tints }
}

/**
 * Everything the User Home needs to render one project card, read off the
 * project itself. No network, no defaults invented on the page.
 *
 * `parts` is always all four, in SYSTEM_PARTS order, each with `done` — so the
 * card can render the complete row of four and show which one is missing, which
 * is the founder's “a project with colours but no type scale should say so”.
 */
export function projectDigest(project, defaults = DEFAULT_DESIGN) {
  const design = project?.design || {}
  const present = partsPresent(design, defaults)
  const parts = SYSTEM_PARTS.map((part) => ({ ...part, done: !!present[part.id] }))
  const colors = Array.isArray(design.palette?.colors) ? design.palette.colors.filter(Boolean) : []
  const missing = parts.filter((p) => !p.done)

  return {
    id: project?.id ?? null,
    name: project?.name || 'Untitled project',
    archived: !!project?.archived,
    colors,
    colourCount: colors.length,
    heading: design.fonts?.heading?.family || DEFAULT_DESIGN.fonts.heading.family,
    body: design.fonts?.body?.family || DEFAULT_DESIGN.fonts.body.family,
    scaleBase: Number(design.typeScale?.base) || DEFAULT_DESIGN.typeScale.base,
    scaleRatio: Number(design.typeScale?.ratio) || DEFAULT_DESIGN.typeScale.ratio,
    tintCount: Array.isArray(design.tints?.scale) ? design.tints.scale.length : 0,
    parts,
    done: parts.length - missing.length,
    total: parts.length,
    missing,
    // The first thing still to do, or null when the system is complete. This is
    // the per-card next step, and the page-level suggestion is built from it.
    next: missing[0] || null,
    updatedAt: project?.updatedAt || project?.createdAt || null,
  }
}

/**
 * The most recently touched project that is still in play. Archived records are
 * skipped — suggesting the next step on something the user has explicitly put
 * away is the opposite of helpful.
 */
export function mostRecentProject(projects) {
  const live = (Array.isArray(projects) ? projects : []).filter((p) => p && !p.archived)
  if (!live.length) return null
  return live.reduce((newest, p) => {
    const a = Date.parse(p.updatedAt || p.createdAt) || 0
    const b = Date.parse(newest.updatedAt || newest.createdAt) || 0
    return a > b ? p : newest
  })
}

/**
 * THE NEXT-TOOL SUGGESTION.
 *
 * Derived from real project state, never random, and never a tool the visitor
 * has no reason to open:
 *
 *   · nothing saved      → the palette, because it is the part everything else is
 *                           chosen against, and because it is what the sign-up
 *                           promise names first (see utils/firstWin.js).
 *   · something missing  → the tool that builds the first missing part, named
 *                           against the project it belongs to.
 *   · nothing missing    → the Contrast Checker. A complete system's next real
 *                           move is validating it, and that is a live tool
 *                           rather than an invented one.
 *
 * Returns { to, tool, reason, project } — `reason` is a sentence naming the
 * actual project, so the suggestion can never read as generic advice.
 */
export function nextToolSuggestion(projects, defaults = DEFAULT_DESIGN) {
  const project = mostRecentProject(projects)
  if (!project) {
    return {
      to: '/create/palette',
      tool: 'Palette Builder',
      reason: 'Nothing saved yet. A palette is the fastest thing to have waiting for you tomorrow.',
      project: null,
    }
  }
  const digest = projectDigest(project, defaults)
  if (digest.next) {
    return {
      to: digest.next.tool,
      tool: digest.next.label,
      reason: `“${digest.name}” has no ${digest.next.label.toLowerCase()} yet.`,
      project: digest,
    }
  }
  return {
    to: '/create/contrast',
    tool: 'Contrast Checker',
    reason: `“${digest.name}” has all four parts. Check the pairs before you hand it over.`,
    project: digest,
  }
}

/**
 * QUICK DATA TRACKING — figures counted off the projects array, zero-suppressed.
 *
 * Returns [] when there is nothing true to say, so the caller renders nothing at
 * all rather than a row of zeroes. See the metric rule at the top of this file.
 *
 * `parts built` is the aggregate of the same four-part read the cards show, so
 * the number in the header and the ticks on the cards are the same fact counted
 * twice rather than two facts that can disagree.
 */
export function homeStats(projects, defaults = DEFAULT_DESIGN) {
  const list = (Array.isArray(projects) ? projects : []).filter(Boolean)
  if (!list.length) return []

  const digests = list.map((p) => projectDigest(p, defaults))
  const colours = digests.reduce((sum, d) => sum + d.colourCount, 0)
  const built = digests.reduce((sum, d) => sum + d.done, 0)
  const parts = digests.length * SYSTEM_PARTS.length

  const stats = [
    { id: 'projects', value: list.length, label: list.length === 1 ? 'project' : 'projects' },
    { id: 'colours', value: colours, label: colours === 1 ? 'colour kept' : 'colours kept' },
    { id: 'parts', value: built, of: parts, label: 'system parts built' },
  ]
  // A zero here is not a finding, it is an absence — do not print it.
  return stats.filter((s) => s.value > 0)
}

/**
 * A palette, drawn as the palette: hard stops, one CSS value.
 *
 * Hard stops rather than a blend because these are discrete colours somebody
 * chose, and interpolating between them paints colours that are NOT in the
 * project. The project card used to be topped with
 * `linear-gradient(135deg, colour1, colour2)` — a decorative two-stop blend of
 * the first two swatches, standing in for a palette instead of being one. Same
 * correction the homepage strip got in `homepage-community-points-outward`.
 *
 * One implementation, two callers (the project card and the daily starters), so
 * the two cannot drift into drawing the same thing differently.
 */
export function paletteBands(colors) {
  const list = Array.isArray(colors) ? colors.filter(Boolean) : []
  if (!list.length) return 'var(--bg-3)'
  const step = 100 / list.length
  const bands = list
    .map((c, i) => `${c} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`)
    .join(', ')
  return `linear-gradient(90deg, ${bands})`
}

/**
 * “A project with colours but no type scale should say so” — the founder's own
 * example, said in words.
 *
 * A percentage would have been easier and worse. Airtable's project gallery
 * (mobbin.com/screens/0e9a986f-01cd-4332-ac89-ba5c36853ae3) prints “Progress
 * Percentage 75” beside a status chip, and 75 tells you how far along you are
 * without telling you WHICH part is missing — the only half you can act on.
 *
 * “Nothing built yet” rather than naming all four: a brand-new project listing
 * every part it lacks reads as a telling-off, and it is the state every project
 * starts in.
 */
export function partsLabel(digest) {
  if (!digest?.missing?.length) return 'All four parts'
  if (digest.missing.length === digest.total) return 'Nothing built yet'
  const names = digest.missing.map((m) => m.label.toLowerCase())
  const last = names.pop()
  return names.length ? `No ${names.join(', ')} or ${last}` : `No ${last}`
}

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * “When did I last touch this?” in words.
 *
 * Coarse on purpose. “3 hours ago” is the resolution the question actually
 * needs; “2 hours 47 minutes ago” is precision nobody asked for on a card. Past
 * a week it gives a date instead, because “34 days ago” is arithmetic the reader
 * has to do themselves.
 *
 * Returns null — never “unknown” or a fabricated date — for anything unparseable
 * or in the future, so the caller omits the line rather than printing a guess.
 */
export function relativeTime(value, now = Date.now()) {
  const then = Date.parse(value)
  if (!Number.isFinite(then)) return null
  const delta = now - then
  if (delta < 0) return null
  if (delta < MINUTE) return 'just now'
  if (delta < HOUR) {
    const m = Math.floor(delta / MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (delta < DAY) {
    const h = Math.floor(delta / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  if (delta < 7 * DAY) {
    const d = Math.floor(delta / DAY)
    return `${d} day${d === 1 ? '' : 's'} ago`
  }
  return new Date(then).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Pick `count` items out of `list`, deterministically for a given day.
 *
 * Same contract as the daily tip: stable across a reload, different tomorrow,
 * and testable. The stride is derived from the list length so it is coprime with
 * it whenever possible, which is what stops the selection collapsing onto a
 * handful of items — with a fixed stride of, say, 6 over a 102-item list, only
 * every sixth item could ever be chosen.
 */
export function pickForDay(list, day, count, offset = 0) {
  const items = Array.isArray(list) ? list : []
  const n = items.length
  if (!n || count <= 0) return []
  const stride = strideFor(n)
  const out = []
  const seen = new Set()
  for (let i = 0; out.length < Math.min(count, n); i += 1) {
    const index = (((day + offset + i) * stride) % n + n) % n
    if (seen.has(index)) {
      // Only reachable when count > n, which the loop bound already prevents;
      // kept so a future caller cannot produce duplicates by accident.
      continue
    }
    seen.add(index)
    out.push(items[index])
  }
  return out
}

/** The largest stride below n that is coprime with n; 1 when n is 1 or 2. */
export function strideFor(n) {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
  for (let s = Math.floor(n / 2) + 1; s > 1; s -= 1) {
    if (gcd(s, n) === 1) return s
  }
  return 1
}
