// The Video tab's tool rail: which groups exist, in what order, which of them
// hold an edit, and how a phone's five-slot row is filled.
//
// The order is the order the edits are applied in (the pipeline): cut the clip,
// crop it, turn it, change its time, restyle it, add to it, then size the
// output. A group with no control today is simply absent, never greyed out:
// LOOK and ADD are listed so their place is fixed, and stay out of the rail
// until something real lives in them.
import { GIF_COLOURS_MAX } from '../../utils/mediaEncode.js'

export const RAIL_GROUPS = [
  { id: 'clip', label: 'Clip' },
  { id: 'crop', label: 'Crop' },
  { id: 'turn', label: 'Turn' },
  { id: 'time', label: 'Time' },
  { id: 'look', label: 'Look' },
  { id: 'add', label: 'Add' },
  { id: 'size', label: 'Size' },
]

// The groups that have controls today. `clip` needs a known length to trim.
// A sound-only output (MP3) has no picture to crop, turn or size, so it keeps
// just the trim and the speed.
export function presentGroups({ hasDuration, audioOnly = false }) {
  if (audioOnly) return RAIL_GROUPS.filter(g => (g.id === 'clip' && hasDuration) || g.id === 'time')
  const hasControls = { clip: !!hasDuration, crop: true, turn: true, time: true, look: false, add: false, size: true }
  return RAIL_GROUPS.filter(g => hasControls[g.id])
}

// The phone row holds at most FIVE slots. These four earn a slot of their own
// (a clip, a crop, a speed and an output size are what people reach for first);
// anything else goes behind the fifth, "More", which opens one sheet.
export const PHONE_SLOTS = 5
export const PHONE_DIRECT = ['clip', 'crop', 'time', 'size']

/**
 * Split the present groups for the phone row: `direct` get a slot each, `more`
 * share the fifth. The fifth slot is always "More" while anything is behind it,
 * so the row never holds more than PHONE_SLOTS.
 */
export function splitRail(groups, slots = PHONE_SLOTS) {
  const direct = groups.filter(g => PHONE_DIRECT.includes(g.id)).slice(0, slots - 1)
  const more = groups.filter(g => !direct.includes(g))
  return { direct, more }
}

// The Size group's starting values. The Video tab starts its controls from
// these, so a mark can never disagree with what a fresh page shows.
export const SIZE_DEFAULTS = Object.freeze({
  fps: 10, width: 480, quality: 'medium', plays: 0, colours: GIF_COLOURS_MAX, dither: 'pattern',
})

// Which groups hold an edit that differs from the default. `s` is a plain
// object of the Video tab's settings. A mark means "this group changes the
// result", so a value that is set but does nothing right now does not count:
// the fit, position and outside colour only act once the shape or a cut-out is
// not the original, and that case is already marked by the shape or the cut.
export function groupMarks(s) {
  return {
    clip: s.trimStart > 0 || s.trimEnd != null,
    crop: s.shape !== 'original' || s.cut !== 'none',
    turn: s.turn !== 0 || !!s.flipH || !!s.flipV,
    time: s.speed !== 1 || s.direction !== 'forward',
    look: false,
    add: false,
    size: Object.keys(SIZE_DEFAULTS).some(k => s[k] !== SIZE_DEFAULTS[k]),
  }
}

// The group to show: the one asked for if it exists, else the first.
export function activeOf(groups, wanted) {
  return groups.find(g => g.id === wanted) || groups[0] || null
}

// The ids that tie a rail button to its panel.
export const railTabId = (base, id) => `${base}-tab-${id}`
export const railPanelId = (base, id) => `${base}-panel-${id}`
