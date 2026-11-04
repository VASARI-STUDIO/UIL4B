// The rules behind the Contrast Checker's "Your palette" strip and the previews
// painted with the palette's roles: which job a pair does, what a role is called
// on screen, and how the suggested pairs are grouped. Pure functions with no
// React, so the rules can be run as plain numbers.
// Explicit extensions so `node --test` can import this module directly.
import { hexToHct } from './colors.js'
import { roleLabel } from './paletteRoles.js'
import { roleAt } from './contrastHandoff.js'

export const JOBS = ['text', 'fill-label', 'beside']

// What each job is called over its group of pair cards. The note says what the
// pair is shown as, never a ratio: a pair in this group can still clear 4.5:1, and a
// "3:1" note would then contradict its own card's mark.
export const JOB_GROUPS = {
  text: { title: 'Text on background' },
  'fill-label': { title: 'Labels on fills' },
  beside: { title: 'Colour beside colour', note: 'Shown side by side as UI parts' },
}

const NEUTRAL_ROLES = new Set(['canvas', 'white', 'near-black'])
const NEUTRAL_HEX = new Set(['#FFFFFF', '#0B0C0E'])
// Judgement, not WCAG: a colour lighter than this can be the page itself, and one
// darker than the second line can only be a label on a lighter fill.
const GROUND_TONE_ABOVE = 95
const LABEL_TONE_BELOW = 10

const tone = (hex) => hexToHct(hex)[2]
const neutral = (hex, role) => NEUTRAL_ROLES.has(role) || NEUTRAL_HEX.has(String(hex).toUpperCase())

/**
 * The job a pair does, which decides what a preview paints in it:
 *   text        a page ground (white, near black, or a palette colour as light as
 *               the page) with text on it
 *   fill-label  a white, near-black, very light or very dark label on a fill
 *   beside      two brand colours next to each other (a chart line, a tag)
 * Roles settle the neutrals; everything else is read from lightness.
 * @param {string} fg #rrggbb
 * @param {string} bg #rrggbb
 * @param {string|null} [fgRole] a role from contrastHandoff, when known
 * @param {string|null} [bgRole]
 * @returns {'text'|'fill-label'|'beside'}
 */
export function pairJob(fg, bg, fgRole = null, bgRole = null) {
  if (neutral(bg, bgRole) || tone(bg) > GROUND_TONE_ABOVE) return 'text'
  if (neutral(fg, fgRole) || tone(fg) > GROUND_TONE_ABOVE || tone(fg) < LABEL_TONE_BELOW) return 'fill-label'
  return 'beside'
}

/** The slot index a role names (primary is 0, alt-1 is 5), or -1 for a role outside the slots. */
export function slotOf(role) {
  for (let i = 0; i < 20; i += 1) if (roleAt(i) === role) return i
  return -1
}

/**
 * What the person sees a role called: the Palette Builder's name for the slot
 * under the palette's system ("Analogous +30°"), or White and Near black. Null
 * for a role that names nothing, so a caller falls back to "text" or "background".
 */
export function roleName(role, harmony = 'auto') {
  if (role === 'white' || role === 'canvas') return 'White'
  if (role === 'near-black') return 'Near black'
  const i = slotOf(role)
  if (i < 0) return null
  const s = roleLabel(harmony, i)
  return s.charAt(0) + s.slice(1).toLowerCase()
}

/**
 * Pairs in groups by job, in the order the strip lists them, each group best
 * ratio first. Nothing is dropped: a pair that does no job in particular lands in
 * "Colour beside colour".
 * @param {{fg: string, bg: string, fgRole?: string|null, bgRole?: string|null, ratio: number}[]} pairs
 * @returns {{job: string, title: string, note?: string, pairs: object[]}[]} groups with no pairs are left out
 */
export function groupPairs(pairs) {
  return JOBS
    .map((job) => ({
      job,
      ...JOB_GROUPS[job],
      pairs: pairs
        .filter((p) => pairJob(p.fg, p.bg, p.fgRole, p.bgRole) === job)
        .sort((a, b) => b.ratio - a.ratio),
    }))
    .filter((g) => g.pairs.length > 0)
}
