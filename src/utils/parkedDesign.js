// Putting unsaved work aside before the working design is replaced.
//
// The working design (`vs-current-design`) is overwritten by a new project, by
// opening a project and by a shared palette link. When it holds work nobody has
// saved, that work would be gone. These helpers decide whether it is at risk and
// keep ONE copy of it in a slot of its own, so an Undo can bring it back exactly.
//
// DOM-free: storage is passed in, so the rules are testable without a browser.
// The slot stays in this browser; it is not part of the account's synced data.

import { DEFAULT_DESIGN } from '../data/designDefaults.js'

export const PARKED_KEY = 'vs-previous-design'

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

// A design as it is compared: defaults filled in, JSON-normalised (so an
// `undefined` field reads the way it does after a round trip through storage),
// and without `source`, which says where the design came from, not what it is.
function comparable(design) {
  const full = JSON.parse(JSON.stringify({ ...DEFAULT_DESIGN, ...(isObj(design) ? design : {}) }))
  delete full.source
  return full
}

function deepEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  }
  if (isObj(a) && isObj(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((k) => k in b && deepEqual(a[k], b[k]))
  }
  return false
}

/** Do these two designs hold the same work? Key order and `source` do not count. */
export function designsMatch(a, b) {
  return deepEqual(comparable(a), comparable(b))
}

/**
 * Would replacing this working design lose work?
 *
 * Yes when it differs from the default design AND from the project it came
 * from. A design that matches ANY saved project is safe too: that project holds
 * it. `projects` is the signed-in person's list; signed out it is empty, so any
 * non-default design is at risk.
 */
export function isAtRisk(design, projects = []) {
  if (designsMatch(design, DEFAULT_DESIGN)) return false
  const list = Array.isArray(projects) ? projects : []
  const sourceId = design?.source?.projectId
  const source = sourceId ? list.find((p) => p?.id === sourceId) : null
  if (source && designsMatch(design, source.design)) return false
  return !list.some((p) => designsMatch(design, p?.design))
}

/** The parked design, or null. */
export function readParked(storage) {
  try {
    const slot = JSON.parse(storage.getItem(PARKED_KEY) || 'null')
    return isObj(slot) && isObj(slot.design) ? slot : null
  } catch {
    return null
  }
}

/**
 * Park the design if it is at risk. One slot: a newer parked design replaces an
 * older one. Returns `{ slot, fresh }`: the slot now holding the design (null
 * when nothing was at risk, or when it could not be written), and whether this
 * call wrote it. Asking again for a design the slot already holds is not fresh,
 * so a double call (StrictMode, a double press) does not announce it twice.
 */
export function parkIfAtRisk({ design, projects, storage, now = Date.now() }) {
  if (!isAtRisk(design, projects)) return { slot: null, fresh: false }
  const held = readParked(storage)
  if (held && deepEqual(held.design, JSON.parse(JSON.stringify(design)))) return { slot: held, fresh: false }
  const slot = { design: JSON.parse(JSON.stringify(design)), parkedAt: now }
  try {
    storage.setItem(PARKED_KEY, JSON.stringify(slot))
  } catch {
    return { slot: null, fresh: false }
  }
  return { slot, fresh: true }
}

/**
 * Take a parked design back. Returns the design exactly as it was parked and
 * empties the slot, unless a newer design has been parked since (that one stays).
 */
export function takeParked(slot, storage) {
  if (!slot || !isObj(slot.design)) return null
  try {
    if (readParked(storage)?.parkedAt === slot.parkedAt) storage.removeItem(PARKED_KEY)
  } catch { /* the slot stays; the design is still returned */ }
  return slot.design
}
