// The Video tab's edit list: every setting that changes the picture, kept as one
// plain object (the "recipe") so a step back is a swap of whole recipes rather
// than a replay of events. DOM-free on purpose, like mediaEncode.js, so its
// numbers can be unit-tested as numbers.
//
// What is a recipe and what is not: trim, crop (shape, position, box, fit),
// cut-out (shape, corner radius, what fills outside), turn, flip, speed and
// direction. How the file is WRITTEN (format, frame rate, width, quality, loop,
// colours) is not an edit, so stepping back never changes it.
//
// One history belongs to one file. A new file starts a new history
// (`startHistory`), and the old steps are gone with the old file.
import {
  CORNER_DEFAULT, DIRECTIONS, FILL_DEFAULT, SPEEDS, TRANSPARENT, TURNS,
} from './mediaEncode.js'

/** Steps kept. An edit is a few numbers, so this is about memory for the list only. */
export const HISTORY_DEPTH = 100

/** Dragging a crop box makes dozens of changes a second; these keys merge into one step. */
const GESTURE_KEYS = ['box']
/** Changes to a gesture key closer together than this are one drag. */
export const GESTURE_MS = 500

export const EDIT_DEFAULTS = Object.freeze({
  trimStart: 0,
  trimEnd: null,
  shape: 'original',
  anchor: 'centre',
  box: null,
  fit: 'crop',
  cut: 'none',
  radius: CORNER_DEFAULT,
  fill: TRANSPARENT,
  fillColour: FILL_DEFAULT,
  turn: 0,
  flipH: false,
  flipV: false,
  speed: 1,
  direction: 'forward',
})

export const EDIT_KEYS = Object.keys(EDIT_DEFAULTS)

/** The keys whose value differs between two recipes. */
export function changedKeys(a, b) {
  return EDIT_KEYS.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
}

export const sameRecipe = (a, b) => changedKeys(a, b).length === 0

// ── The history ──────────────────────────────────────────────────────────────
// { past: oldest..newest recipes, present, future: next-redo first, at, keys }
// `at` and `keys` remember when and what the last step was, for merging a drag.

export function startHistory(recipe) {
  return { past: [], present: { ...recipe }, future: [], at: 0, keys: [] }
}

export const canUndo = h => h.past.length > 0
export const canRedo = h => h.future.length > 0

/**
 * Note that the settings are now `next`. Does nothing if they have not changed
 * (which is how an undo that has just restored them is told apart from an edit).
 * A real edit adds a step and empties the redo line.
 */
export function record(h, next, now = 0) {
  const keys = changedKeys(h.present, next)
  if (!keys.length) return h
  const drag = keys.every(k => GESTURE_KEYS.includes(k))
    && h.past.length > 0
    && h.keys.length > 0
    && h.keys.every(k => GESTURE_KEYS.includes(k))
    && now - h.at < GESTURE_MS
  return {
    past: drag ? h.past : [...h.past, h.present].slice(-HISTORY_DEPTH),
    present: { ...next },
    future: [],
    at: now,
    keys,
  }
}

export function undo(h) {
  if (!canUndo(h)) return h
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
    at: 0,
    keys: [],
  }
}

export function redo(h) {
  if (!canRedo(h)) return h
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    at: 0,
    keys: [],
  }
}

// ── Words ────────────────────────────────────────────────────────────────────
const num = n => String(+Number(n).toFixed(1))

const GROUPS = [
  {
    name: 'trim',
    keys: ['trimStart', 'trimEnd'],
    say: r => {
      if (!(r.trimStart > 0) && r.trimEnd == null) return null
      if (r.trimEnd == null) return `Trimmed to start at ${num(r.trimStart)} s`
      return r.trimStart > 0 ? `Trimmed to ${num(r.trimStart)}–${num(r.trimEnd)} s` : `Trimmed to end at ${num(r.trimEnd)} s`
    },
  },
  {
    name: 'crop',
    keys: ['shape', 'anchor', 'box', 'fit'],
    say: r => {
      if (r.shape === 'original') return null
      if (r.shape === 'custom') return 'Custom crop'
      const base = r.fit === 'fit' ? `Fitted to ${r.shape} with bars` : `Cropped to ${r.shape}`
      return r.anchor === 'centre' ? base : `${base}, aligned ${r.anchor}`
    },
  },
  {
    name: 'cut-out',
    keys: ['cut', 'radius', 'fill', 'fillColour'],
    say: r => {
      const shape = { circle: 'Circle cut-out', oval: 'Oval cut-out', rounded: `Rounded corners ${r.radius}%` }[r.cut]
      // The fill only matters where something is drawn outside the picture.
      const outside = r.cut !== 'none' || (r.fit === 'fit' && r.shape !== 'original' && r.shape !== 'custom')
      const fill = outside && r.fill !== TRANSPARENT ? `outside filled ${r.fillColour}` : null
      if (shape && fill) return `${shape}, ${fill}`
      return shape || (fill ? fill.charAt(0).toUpperCase() + fill.slice(1) : null)
    },
  },
  {
    name: 'turn',
    keys: ['turn'],
    say: r => {
      if (!r.turn) return null
      const t = TURNS.find(o => o.id === r.turn)
      return `Turned ${t ? t.label : `${r.turn}°`}`
    },
  },
  {
    name: 'flip',
    keys: ['flipH', 'flipV'],
    say: r => (r.flipH && r.flipV ? 'Flipped both ways' : r.flipH ? 'Flipped horizontally' : r.flipV ? 'Flipped vertically' : null),
  },
  {
    name: 'speed',
    keys: ['speed'],
    say: r => (r.speed === 1 ? null : (SPEEDS.find(o => o.id === r.speed)?.name || `${r.speed} times speed`)),
  },
  {
    name: 'direction',
    keys: ['direction'],
    say: r => (r.direction === 'forward' ? null : `Plays ${(DIRECTIONS.find(o => o.id === r.direction)?.label || r.direction).toLowerCase()}`),
  },
]

/** The edits a recipe holds, as short plain phrases, in a fixed order. Empty when it holds none. */
export function describeEdits(recipe) {
  return GROUPS.map(g => g.say(recipe)).filter(Boolean)
}

/** The plain names of the kinds of edit that differ between two recipes ("turn", "crop"). */
export function changedEditNames(a, b) {
  const keys = changedKeys(a, b)
  return GROUPS.filter(g => g.keys.some(k => keys.includes(k))).map(g => g.name)
}
