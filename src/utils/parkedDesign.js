// Putting unsaved work aside before the working design is replaced.
//
// The working design (`vs-current-design`) is overwritten by a new project, by
// opening a project and by a shared palette link. When it holds work nobody has
// saved, that work would be gone. These helpers decide whether it is at risk and
// keep a copy of it in a slot of its own, so an Undo can bring it back exactly.
//
// The slot shows one kit (the newest). A different kit already there is not
// replaced: it moves to a short shelf behind it (PARKED_SHELF_KEY, newest
// first) and comes back into the slot once the newest is continued, saved or
// discarded. An Undo of a discard puts the kit back beside a newer one, never
// over it.
//
// DOM-free: storage is passed in, so the rules are testable without a browser.
// The slot stays in this browser; it is not part of the account's synced data.

import { DEFAULT_DESIGN } from '../data/designDefaults.js'

export const PARKED_KEY = 'vs-previous-design'
export const PARKED_SHELF_KEY = 'vs-previous-designs'
// Kits kept behind the one in the slot. Past this the oldest goes.
export const SHELF_LIMIT = 4

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

const isSlot = (v) => isObj(v) && isObj(v.design)
const sameSlot = (a, b) => a.parkedAt === b.parkedAt && deepEqual(a.design, b.design)

/** The parked design, or null. */
export function readParked(storage) {
  try {
    const slot = JSON.parse(storage.getItem(PARKED_KEY) || 'null')
    return isSlot(slot) ? slot : null
  } catch {
    return null
  }
}

/** The kits kept behind the slot, newest first. */
export function readShelf(storage) {
  try {
    const list = JSON.parse(storage.getItem(PARKED_SHELF_KEY) || '[]')
    return Array.isArray(list) ? list.filter(isSlot) : []
  } catch {
    return []
  }
}

function writeShelf(list, storage) {
  if (list.length) storage.setItem(PARKED_SHELF_KEY, JSON.stringify(list))
  else storage.removeItem(PARKED_SHELF_KEY)
}

// Put a slot on the shelf: one copy of each design, newest first, capped.
function shelve(slot, storage) {
  const rest = readShelf(storage).filter((s) => !deepEqual(s.design, slot.design))
  const list = [slot, ...rest].sort((a, b) => (b.parkedAt || 0) - (a.parkedAt || 0)).slice(0, SHELF_LIMIT)
  writeShelf(list, storage)
}

/**
 * Empty the slot and bring the newest shelved kit into it. Returns the slot as
 * it now is (the kit brought forward, or null). Throws when storage does.
 */
export function dropParked(storage) {
  storage.removeItem(PARKED_KEY)
  const [next, ...rest] = readShelf(storage)
  if (!next) return null
  storage.setItem(PARKED_KEY, JSON.stringify(next))
  writeShelf(rest, storage)
  return next
}

/**
 * Put a slot back (Undo of a discard). Into the slot when it is empty; beside a
 * newer kit that has been parked since, never over it: the older of the two
 * goes on the shelf. Returns the slot as it now is, or null when storage is
 * blocked.
 */
export function putBack(slot, storage) {
  if (!isSlot(slot)) return readParked(storage)
  try {
    const held = readParked(storage)
    if (held && sameSlot(held, slot)) return held
    if (!held || (slot.parkedAt || 0) >= (held.parkedAt || 0)) {
      storage.setItem(PARKED_KEY, JSON.stringify(slot))
      if (held) shelve(held, storage)
      return slot
    }
    shelve(slot, storage)
    return held
  } catch {
    return null
  }
}

/**
 * Park the design if it is at risk. The slot shows the newest; a different kit
 * already in it moves to the shelf rather than being lost. Returns `{ slot, fresh }`: the slot now holding the design (null
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
    // Shelved first, so a write that fails part way leaves a copy, not a gap.
    if (held) shelve(held, storage)
    writeShelf(readShelf(storage).filter((s) => !deepEqual(s.design, slot.design)), storage)
    storage.setItem(PARKED_KEY, JSON.stringify(slot))
  } catch {
    return { slot: null, fresh: false }
  }
  return { slot, fresh: true }
}

/**
 * Take a parked design back. Returns the design exactly as it was parked and
 * empties the slot (the newest shelved kit moves into it), but only while
 * storage still holds that same slot. A slot
 * cleared since (sign-out, an account switch) or replaced by a newer park
 * gives nothing back, so an old toast can never restore work into a browser
 * that has changed hands.
 */
export function takeParked(slot, storage) {
  if (!slot || !isObj(slot.design)) return null
  try {
    if (readParked(storage)?.parkedAt !== slot.parkedAt) return null
    dropParked(storage)
  } catch { return null }
  return slot.design
}
