// When the brand kit chooser shows, and what it offers.
//
// The chooser is the first view of the walkthrough's panel. It asks "carry on,
// or start a new one?" only when the person is coming back to a kit after a gap.
// Everything here is DOM-free: storage values are passed in, so each rule is a
// table-driven test.

import { partsPresent } from './userHome.js'
import { DEFAULT_DESIGN } from '../data/designDefaults.js'
import { withDefaults } from './brandKitGuide.js'
import { designsMatch } from './parkedDesign.js'
import { SESSION_AUTH, SESSION_DONE, SESSION_ON } from './kitSession.js'
import { normaliseHex } from './paletteAdjust.js'

/** How long a working design can sit before coming back to it is a question. */
export const CHOOSER_GAP_MS = 6 * 60 * 60 * 1000

const MIN = 60 * 1000
const HOUR = 60 * MIN

/**
 * Where the working design stands against the saved projects:
 *   empty     no part of it has been built
 *   saved     a saved project holds exactly this
 *   changed   it came from a saved project and has moved on since
 *   unsaved   there is work and no project holds it
 * `changed` and `unsaved` are the two that put work at risk.
 */
export function workingStatus(design, projects = []) {
  if (!Object.values(partsPresent(withDefaults(design))).some(Boolean)) return 'empty'
  const list = Array.isArray(projects) ? projects : []
  const source = sourceProject(design, list)
  if (!source) return 'unsaved'
  return designsMatch(design, source.design) ? 'saved' : 'changed'
}

/** The project the working design came from, or one that holds it exactly. */
export function sourceProject(design, projects = []) {
  const list = Array.isArray(projects) ? projects : []
  const id = design?.source?.projectId
  const named = id ? list.find((p) => p?.id === id) : null
  if (named) return named
  if (designsMatch(design, DEFAULT_DESIGN)) return null
  return list.find((p) => designsMatch(design, p?.design)) || null
}

export const atRisk = (status) => status === 'changed' || status === 'unsaved'

/**
 * How the page was reached, read once on arrival.
 *   link          a shared palette link or the homepage hand-off
 *   new-project   New project on the workspace
 *   brand-kit     the nav's Build a brand kit
 *   back          the browser's Back or Forward
 *   direct        anything else: a typed address, a link in the bar, the menu
 * `project` arrivals (Continue building) stamp the design as edited just before
 * they navigate, so the gap rule already keeps them out.
 */
export function classifyArrival({ state, navType, key, linked = false } = {}) {
  if (linked) return 'link'
  if (state?.newProject) return 'new-project'
  if (state?.brandKitArrival || state?.openBrandKitCard) return 'brand-kit'
  if (navType === 'POP' && key && key !== 'default') return 'back'
  return 'direct'
}

/** The palette's colours in one spelling ('#abc' and '#AABBCC' are the same colour). */
export function colourKey(design) {
  const colors = design?.palette?.colors
  return JSON.stringify(Array.isArray(colors) ? colors.map((c) => normaliseHex(c) || c) : null)
}

/**
 * The design as an edit is judged. The board restates a kit a moment after it
 * opens, filling in the fields it derives the swatches from (`baseColors`,
 * `globalAdjust`, `locked`) and respelling the colours; none of that is an edit,
 * so those fields are left out and the colours compared by `colourKey`.
 */
export function editKey(design) {
  if (!design || typeof design !== 'object') return JSON.stringify(design ?? null)
  // eslint-disable-next-line no-unused-vars
  const { baseColors, globalAdjust, locked, ...palette } = design.palette || {}
  return JSON.stringify({ ...design, palette: { ...palette, colors: JSON.parse(colourKey(design)) } })
}

/**
 * Does the chooser show, and which row starts focused?
 * Returns { show, eligible, defaultChoice } where `eligible` says the arrival was
 * one the chooser could apply to (so the tab can note it was asked or skipped).
 */
export function chooserDecision({
  status, arrival, onFirstStep = true, flagActive = false,
  editedAt = null, now = Date.now(), session = null, pendingSave = false,
}) {
  const eligible = onFirstStep && (arrival === 'brand-kit' || (arrival === 'direct' && flagActive))
  const defaultChoice = status === 'saved' ? 'new' : 'continue'
  const none = { show: false, eligible, defaultChoice }
  if (!eligible || status === 'empty' || pendingSave) return none
  if (session === SESSION_ON) return none
  if (session === SESSION_DONE) return { ...none, show: arrival === 'brand-kit' }
  const gap = editedAt == null || now - editedAt >= CHOOSER_GAP_MS
  return { ...none, show: gap || session === SESSION_AUTH }
}

/** "7 hours ago", "yesterday", then a day and month ("4 Nov"). */
export function whenText(at, now = Date.now()) {
  const t = Number(at)
  if (!Number.isFinite(t) || t <= 0) return 'a while ago'
  const rtf = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' })
  const diff = Math.max(0, now - t)
  if (diff < MIN) return rtf.format(0, 'second')
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MIN), 'minute')
  if (diff < 24 * HOUR) return rtf.format(-Math.floor(diff / HOUR), 'hour')
  const midnight = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
  if (Math.round((midnight(now) - midnight(t)) / (24 * HOUR)) === 1) return rtf.format(-1, 'day')
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(t)
}

/** The three most recently edited projects that are not archived and not `currentId`. */
export function otherProjects(projects = [], currentId = null, count = 3) {
  const at = (p) => Date.parse(p?.updatedAt || p?.createdAt || '') || 0
  return (Array.isArray(projects) ? projects : [])
    .filter((p) => p && !p.archived && p.id !== currentId)
    .sort((a, b) => at(b) - at(a))
    .slice(0, count)
}

/** The Continue row's label and meta line, as whole strings. */
export function continueCopy({ status, name, done, when, signedIn }) {
  if (status === 'saved') return { label: `Continue ${name}`, meta: `${done} of 4 parts built · edited ${when}` }
  if (status === 'changed') return { label: `Continue ${name}`, meta: `Changed since you last saved · edited ${when}` }
  return {
    label: 'Continue this brand kit',
    meta: `${done} of 4 parts built · edited ${when} · ${signedIn ? 'not saved as a project yet' : 'kept in this browser until you save it'}`,
  }
}

/** The Start new row's meta line. */
export function startNewMeta({ status, name, slotWhen = null }) {
  if (!atRisk(status)) return status === 'saved' ? `${name} stays in your projects.` : ''
  return slotWhen
    ? `This one replaces the unsaved brand kit from ${slotWhen} in Your workspace.`
    : 'This one moves to Your workspace as an unsaved brand kit.'
}

export const capLine = (limit) => `Free plan: ${limit} of ${limit} projects saved. Saving a new one needs a free slot.`
