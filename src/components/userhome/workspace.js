// Everything the workspace (/projects) and the project page (/projects/:id)
// print, read off the project or off the module that enforces it.
//
// The design's screens ("Your workspace" and the project page in
// UIL4B App.dc.html) were drawn over a fixed demo: three projects called
// Cobalt, Citron and Slate, a kit of Colour / Type / Type scale / Icons, "2 of
// 5" AI generations and a $4 price. The LAYOUT is the design's and is reproduced as
// drawn. The VALUES in it come from here, so none of them is typed into a
// component:
//
//   · the four parts are the four this product actually saves in a project
//     (utils/userHome.js SYSTEM_PARTS — palette, type scale, fonts, tints).
//     The design's fourth slot was Icons; a project stores no icons, so that slot is
//     Tints, which it does store.
//   · the AI meter reads the same per-browser counter the AI tools write
//     (utils/usageTracker.js), against the plan's daily limit.
//   · the price is planLadder.js's cheapest per-month figure, never "$4".
//
// Plain module, no JSX, so the unit tests can import it under `node --test`.

import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../config/plans.js'
import { cheapestPerMonth, resolvePlanLadder } from '../../config/planLadder.js'
import { createTools } from '../../data/toolTree.js'
import { projectDigest, relativeTime } from '../../utils/userHome.js'

/* ── Numbers in prose ─────────────────────────────────────────────────────── */

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]
/** "eleven", not "11"; digits past twenty. */
export function numberWord(n) {
  return NUMBER_WORDS[n] || String(n)
}

/* ── "All eleven tools" ───────────────────────────────────────────────────── */

/** Every Create tool the menu offers as live — the same filter the sales page
 *  counts with (spectrumFacts.js LIVE_TOOLS), so the two cannot disagree. */
export function liveToolCount() {
  return createTools().filter((t) => !t.soon && !t.beta).length
}

/* ── The plan strip ───────────────────────────────────────────────────────── */

/** The tools whose allowance is DAILY. api/_lib/plans.js meters each of them on
 *  its own bucket (field = toolId), and the Brand Starter is metered per month
 *  or per account instead (config/aiGeneration.js), so it is not a daily meter. */
export const DAILY_AI_TOOLS = Object.freeze(['alt-text', 'prompts-ai'])

/**
 * "AI generations today", as the person will meet the cap.
 *
 * The server keeps a separate daily bucket per tool, so there is no single
 * "used today" the product enforces. The figure that tells someone how close
 * they are to being refused is the busiest tool's count against its own limit,
 * so that is the one printed. `countFor` is injected (usageTracker's
 * getUsageCount in the page) so this stays testable without a DOM.
 */
export function aiUsageToday(countFor, plan) {
  const limit = plan?.limits?.['ai-default'] ?? AI_LIMITS.free.daily
  const used = Math.max(0, ...DAILY_AI_TOOLS.map((id) => Number(countFor(id)) || 0))
  const shown = Math.min(used, limit)
  return { used: shown, limit, pct: limit > 0 ? Math.round((shown / limit) * 100) : 0 }
}

/** Project slots, or null when the plan has no project limit (Pro). */
export function projectSlots(count, limit) {
  if (!Number.isFinite(limit)) return null
  const used = Math.min(count, limit)
  return { used: count, limit, pct: limit > 0 ? Math.round((used / limit) * 100) : 0 }
}

/* ── The Pro panel ────────────────────────────────────────────────────────── */

const LADDER = resolvePlanLadder()
const CHEAPEST = cheapestPerMonth(LADDER)

/** "Upgrade for $4/mo" with the $4 derived; "Billed yearly" from the same tier. */
export const UPGRADE = Object.freeze({
  label: CHEAPEST?.perMonthLabel ? `Upgrade for ${CHEAPEST.perMonthLabel}/mo` : 'See Pro',
  billed: CHEAPEST?.id === 'yearly' ? 'Billed yearly' : CHEAPEST?.id === 'monthly' ? 'Billed monthly' : '',
})

/** The design's line was "Pro lifts the three-project limit and keeps ninety days of
 *  version history." There is no version history anywhere in this product;
 *  the second clause is the other thing Pro really raises. */
export const UPGRADE_LINE = `Pro lifts the ${numberWord(FREE_SAVE_LIMITS.projects)}-project limit and the daily AI cap.`

/** The design's four perks, each held to what Pro actually changes (see /plans). */
export const PRO_PERKS = Object.freeze([
  { icon: 'lightning', label: `${AI_LIMITS.pro.daily} generations a day`, note: `${AI_LIMITS.pro.monthly} a month` },
  { icon: 'sliders-horizontal', label: 'HCT editing and per-colour contrast', note: 'Tune lightness and chroma per stop' },
  { icon: 'seal-check', label: 'No mark on exports', note: 'Plus the design system book' },
  { icon: 'clock-counter-clockwise', label: 'Unlimited projects', note: 'Plus unlimited custom icons' },
])

/* ── A project's icon ─────────────────────────────────────────────────────── */

/** The six choices the design's picker offers, in the design's order. */
export const PROJECT_GLYPHS = Object.freeze(['rocket-launch', 'storefront', 'compass', 'cube', 'flask', 'graduation-cap'])

/** A stable default per project. The design's demo used the list index, which changes
 *  whenever the order does; the id does not. */
export function defaultGlyph(id) {
  const s = String(id || '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PROJECT_GLYPHS[h % PROJECT_GLYPHS.length]
}

/** What the tile shows: the icon stored ON the project (`project.icon`, which
 *  syncs with it), which is one of the design's six glyphs or an
 *  icon the old page let a person upload; otherwise a stable default. */
export function projectIcon(id, stored) {
  if (typeof stored === 'string' && PROJECT_GLYPHS.includes(stored)) return { glyph: stored }
  if (typeof stored === 'string' && stored.startsWith('data:image/')) return { image: stored }
  return { glyph: defaultGlyph(id) }
}

/* ── New in Discover ──────────────────────────────────────────────────────── */

/**
 * The newest `count` palettes by the date they reached the library (`added`,
 * see data/paletteGallery.js). Only dated entries qualify — an undated one is
 * from the original set and nothing is newer than a dated one. Palettes added
 * on the same day are ordered as the file lists them, latest first, since
 * each wave is appended.
 */
export function newestPalettes(list, count = 4) {
  return (Array.isArray(list) ? list : [])
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => typeof p.added === 'string')
    .sort((a, b) => (a.p.added === b.p.added ? b.i - a.i : a.p.added < b.p.added ? 1 : -1))
    .slice(0, count)
    .map(({ p }) => p)
}

/* ── Status, as the card and the list print it ─────────────────────────────── */

export function projectStatus(project, now = Date.now()) {
  const digest = projectDigest(project)
  const tag = project?.archived ? 'Archived' : digest.done === digest.total ? 'Ready' : 'In progress'
  const when = relativeTime(digest.updatedAt, now)
  return {
    digest,
    tag,
    ready: tag === 'Ready',
    has: `${digest.done} of ${digest.total} parts`,
    pct: `${Math.round((digest.done / digest.total) * 100)}%`,
    edited: when,
  }
}

/** Newest first — "Recent projects". */
export function byRecent(a, b) {
  const t = (p) => Date.parse(p?.updatedAt || p?.createdAt) || 0
  return t(b) - t(a)
}

/* ── The project page's four slots ────────────────────────────────────────── */

const RATIO_NAMES = [
  [1.067, 'Minor second'], [1.125, 'Major second'], [1.2, 'Minor third'], [1.25, 'Major third'],
  [1.333, 'Perfect fourth'], [1.414, 'Augmented fourth'], [1.5, 'Perfect fifth'], [1.618, 'Golden ratio'], [2, 'Octave'],
]
export function ratioName(ratio) {
  const hit = RATIO_NAMES.find(([v]) => Math.abs(v - ratio) < 0.002)
  return hit ? hit[1] : null
}

/** Six steps of the scale, largest first, rounded to whole pixels. */
export function scaleSteps(base, ratio, count = 6) {
  return Array.from({ length: count }, (_, i) => Math.round(base * ratio ** (count - 1 - i)))
}

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)

/**
 * The design's four slots in the design's order (Colour, Type, Type scale, then the fourth), each
 * filled from the saved design. `tool` is the live route that builds the part.
 */
export function projectSlots4(project) {
  const d = project?.design || {}
  const digest = projectDigest(project)
  const done = Object.fromEntries(digest.parts.map((p) => [p.id, p.done]))
  const tool = Object.fromEntries(digest.parts.map((p) => [p.id, p.tool]))
  const heading = d.fonts?.heading || {}
  const body = d.fonts?.body || {}
  const base = digest.scaleBase
  const ratio = digest.scaleRatio
  const name = ratioName(ratio)
  const tints = Array.isArray(d.tints?.scale) ? d.tints.scale : []

  return [
    {
      id: 'palette', icon: 'palette', label: 'Colour', done: done.palette, tool: tool.palette,
      detail: `${digest.colourCount} colour${digest.colourCount === 1 ? '' : 's'}`,
      ramp: digest.colors.filter(isHex),
      emptyNote: 'Seed one colour and the ramp comes with it.', emptyCta: 'Build the palette',
    },
    {
      id: 'fonts', icon: 'text-t', label: 'Type', done: done.fonts, tool: tool.fonts,
      detail: `${digest.heading} ${heading.weight ?? ''} over ${digest.body} ${body.weight ?? ''}`.replace(/\s+/g, ' ').trim(),
      typeHead: `${digest.heading} ${heading.weight ?? ''}`.trim(),
      typeBody: `Body set in ${digest.body} ${body.weight ?? ''}`.trim(),
      emptyNote: 'Pick a pairing and see it on real sentences.', emptyCta: 'Choose a pairing',
    },
    {
      id: 'type-scale', icon: 'ruler', label: 'Type scale', done: done['type-scale'], tool: tool['type-scale'],
      detail: `${name ? `${name}, ` : ''}${ratio.toFixed(3)}, six steps from ${base} px`,
      typeHead: scaleSteps(base, ratio).join(' / '),
      typeBody: `Six steps, base ${base} px`,
      emptyNote: 'Set a ratio and read it at shipping sizes.', emptyCta: 'Set the scale',
    },
    {
      id: 'tints', icon: 'drop-half', label: 'Tints', done: done.tints, tool: tool.tints,
      detail: `${tints.length} step${tints.length === 1 ? '' : 's'}`,
      ramp: tints.filter(isHex),
      emptyNote: '', emptyCta: 'Generate the tints',
    },
  ]
}
