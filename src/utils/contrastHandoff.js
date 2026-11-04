// The Palette Builder to Contrast Checker hand-off: the URL it travels in, and
// which pair of the palette it opens on.
//
//   /create/contrast?fg=1F2937&bg=FFFFFF&from=palette&fgRole=deep&bgRole=canvas
//
// The pair rides in the address, not in memory, so a reload of the checker keeps
// it. Pure functions with no React, so the rules can be run as plain numbers.
// Explicit extension so `node --test` can import this module directly.
import { contrastRatio, hexToHct } from './colors.js'
import { normaliseHex } from './paletteAdjust.js'

export const NEAR_BLACK = '#0B0C0E'
export const WHITE = '#FFFFFF'

// The five generated slots keep the same positional names the CSS export uses,
// whatever the system calls them on screen; columns past them are numbered.
const SLOT_ROLES = ['primary', 'secondary', 'accent', 'subtle', 'deep']
const FIXED_ROLES = new Set([...SLOT_ROLES, 'canvas', 'white', 'near-black'])
const ALT_ROLE = /^alt-[1-9][0-9]?$/

/** The role name of palette slot `index`: primary to deep, then alt-1, alt-2. */
export const roleAt = (index) => (index < SLOT_ROLES.length ? SLOT_ROLES[index] : `alt-${index - SLOT_ROLES.length + 1}`)

/** A role from the address, or null for anything outside the fixed list. */
export const cleanRole = (raw) => (typeof raw === 'string' && (FIXED_ROLES.has(raw) || ALT_ROLE.test(raw)) ? raw : null)

/**
 * What the checker was opened for. `from` is only ever 'palette' (anything else
 * is ignored); roles outside the fixed list are dropped one by one.
 */
export function parseHandoff(params) {
  return {
    from: params.get('from') === 'palette' ? 'palette' : null,
    fgRole: cleanRole(params.get('fgRole')),
    bgRole: cleanRole(params.get('bgRole')),
  }
}

/** The checker's address for a pair, hex without the '#'. */
export function handoffUrl({ fg, bg, fgRole, bgRole }) {
  const q = new URLSearchParams({ fg: fg.slice(1).toUpperCase(), bg: bg.slice(1).toUpperCase(), from: 'palette' })
  if (fgRole) q.set('fgRole', fgRole)
  if (bgRole) q.set('bgRole', bgRole)
  return `/create/contrast?${q}`
}

// CIE L* (HCT tone). The thresholds below are judgement, not WCAG.
const toneOf = (hex) => hexToHct(hex)[2]
const DARK_TEXT_BELOW = 30   // a palette colour this dark can carry body text
const LIGHT_GROUND_ABOVE = 95 // a palette colour this light can be the page
const DARK_COLUMN_BELOW = 50 // a column darker than this is checked as text

const slots = (colors) => colors
  .map((raw, i) => ({ hex: normaliseHex(raw), role: roleAt(i) }))
  .filter((c) => c.hex)
  .map((c) => ({ ...c, tone: toneOf(c.hex) }))

// The page ground the palette's text sits on: its lightest colour when that is
// near white, otherwise plain white.
function groundOf(list) {
  const lightest = list.reduce((a, c) => (!a || c.tone > a.tone ? c : a), null)
  return lightest && lightest.tone > LIGHT_GROUND_ABOVE
    ? { hex: lightest.hex, role: lightest.role }
    : { hex: WHITE, role: 'canvas' }
}

/**
 * Extra tools > Check contrast: body text on the page ground. The text is the
 * darkest palette colour when it is dark enough, otherwise near black.
 */
export function readingPair(colors) {
  const list = slots(colors)
  const darkest = list.reduce((a, c) => (!a || c.tone < a.tone ? c : a), null)
  const text = darkest && darkest.tone < DARK_TEXT_BELOW
    ? { hex: darkest.hex, role: darkest.role }
    : { hex: NEAR_BLACK, role: 'near-black' }
  const ground = groundOf(list)
  return { fg: text.hex, bg: ground.hex, fgRole: text.role, bgRole: ground.role }
}

/**
 * Column > Check contrast. A dark colour is checked as text on the page ground;
 * a mid or light one as a fill with a label on it: white, or near black when
 * white falls under 3:1 and near black does better.
 */
export function columnPair(colors, index) {
  const list = slots(colors)
  const col = list.find((c) => c.role === roleAt(index))
  if (!col) return readingPair(colors)
  if (col.tone < DARK_COLUMN_BELOW) {
    const ground = groundOf(list)
    return { fg: col.hex, bg: ground.hex, fgRole: col.role, bgRole: ground.role }
  }
  const white = contrastRatio(WHITE, col.hex)
  const black = contrastRatio(NEAR_BLACK, col.hex)
  const label = white < 3 && black > white
    ? { hex: NEAR_BLACK, role: 'near-black' }
    : { hex: WHITE, role: 'white' }
  return { fg: label.hex, bg: col.hex, fgRole: label.role, bgRole: col.role }
}
