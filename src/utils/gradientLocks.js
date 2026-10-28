// The lock rules behind Random and Shuffle in the gradient tool (spec
// gradient-generation-v2 §4). Kept pure (stops and flags in, stops out) so the
// page and the unit tests share one definition.
//
// A stop has two locks: `lockColour` keeps its colour, `lockPosition` keeps its
// place on the ramp. The geometry has three: type, angle and interpolation space.
// A lock only governs Random and Shuffle; a hand edit is never blocked.

export const NO_GEOMETRY_LOCKS = Object.freeze({ type: false, angle: false, interp: false })

/**
 * A stop in the current shape. A stop saved with the old single `locked` flag
 * holds both locks; the old flag is dropped. Any other field is kept.
 */
export function normaliseStop(stop) {
  const { locked, ...rest } = stop || {}
  return {
    ...rest,
    lockColour: !!(rest.lockColour || locked),
    lockPosition: !!(rest.lockPosition || locked),
  }
}

export const normaliseStops = (stops) => (stops || []).map(normaliseStop)

/** True when any stop keeps its colour or its position. */
export const hasStopLock = (stops) => stops.some((s) => s.lockColour || s.lockPosition)

/** The stops with every lock cleared (a preset or a hand-off replaces them). */
export const clearStopLocks = (stops) => stops.map((s) => ({ ...s, lockColour: false, lockPosition: false }))

/**
 * Flip one lock ('colour' or 'position') on the stops at `idxs`, all to `to`.
 * The page works `to` out from the row that was pressed.
 */
export function setStopLock(stops, idxs, kind, to) {
  const key = kind === 'position' ? 'lockPosition' : 'lockColour'
  return stops.map((s, i) => (idxs.includes(i) ? { ...s, [key]: !!to } : s))
}

/**
 * The geometry locks from session storage. `locksJson` is the saved locks;
 * `filtersJson` is the older Shuffle-settings entry, whose `keepAngle: true`
 * becomes the angle lock. A saved lock wins over the older flag.
 */
export function parseGeometryLocks(locksJson, filtersJson) {
  let saved = null
  try { saved = JSON.parse(locksJson || 'null') } catch { /* unreadable: treated as none */ }
  let legacyAngle = false
  try { legacyAngle = !!JSON.parse(filtersJson || 'null')?.keepAngle } catch { /* unreadable */ }
  const obj = saved && typeof saved === 'object' ? saved : {}
  return {
    type: !!obj.type,
    angle: typeof obj.angle === 'boolean' ? obj.angle : legacyAngle,
    interp: !!obj.interp,
  }
}

/** Which geometry values Random must keep: the current value where locked, else null. */
export function geometryHolds(locks, current) {
  return {
    type: locks.type ? current.type : null,
    angle: locks.angle ? current.angle : null,
    space: locks.interp ? current.space : null,
  }
}

/**
 * The engine's options for one roll. A type lock overrides the Type filter, and
 * a stop with a colour or position lock fixes the count, which overrides the
 * Stops filter (§4.3).
 */
export function lockedRollOptions(engineFilters, locks, current, stops) {
  const holds = geometryHolds(locks, current)
  return {
    ...engineFilters,
    counts: hasStopLock(stops) ? [stops.length] : engineFilters.counts,
    locks: holds,
  }
}

// Positions for `fixed` (a number where the position is locked, else null). A
// run of free stops is spread evenly between the locked stops either side of it;
// at an end of the ramp it runs out to 0 or 100. With nothing locked this is the
// even spread the tool has always used.
export function spacePositions(fixed) {
  const n = fixed.length
  if (n < 2) return fixed.map((p) => p ?? 0)
  if (fixed.every((p) => p == null)) return fixed.map((_, i) => Math.round((i / (n - 1)) * 100))
  const out = fixed.slice()
  let i = 0
  while (i < n) {
    if (fixed[i] != null) { i++; continue }
    let j = i
    while (j < n && fixed[j] == null) j++
    const k = j - i
    const left = i > 0 ? fixed[i - 1] : null
    const right = j < n ? fixed[j] : null
    for (let m = 0; m < k; m++) {
      let p
      if (left == null) p = (right * m) / k
      else if (right == null) p = left + ((100 - left) * (m + 1)) / k
      else p = left + ((right - left) * (m + 1)) / (k + 1)
      out[i + m] = Math.round(p)
    }
    i = j
  }
  return out
}

/**
 * Build the stops after a roll, honouring each stop's locks.
 *
 * `sample(i)` gives the colour for a stop that is free to change; `count` is the
 * rolled stop count. A colour-locked stop keeps its colour; a position-locked
 * stop keeps its position; a stop with both is untouched. If ANY stop is locked
 * the current count is kept, so no locked stop is dropped.
 *
 * `closeSeam` is set for a conic roll: locked stops and the cycling of `sample`
 * can leave the last colour off the first, so the last takes the first (or the
 * first takes the last, when only the last is colour-locked).
 */
export function rebuildStops(prev, sample, count, closeSeam = false) {
  const kept = hasStopLock(prev)
  const n = kept ? prev.length : count
  const positions = spacePositions(Array.from({ length: n }, (_, i) => (kept && prev[i]?.lockPosition ? prev[i].position : null)))
  const out = Array.from({ length: n }, (_, i) => {
    const ex = kept ? prev[i] : undefined
    return {
      color: ex?.lockColour ? ex.color : sample(i),
      position: positions[i],
      lockColour: !!ex?.lockColour,
      lockPosition: !!ex?.lockPosition,
    }
  })
  if (closeSeam && kept && n >= 3) {
    const last = out[n - 1]
    if (!last.lockColour) last.color = out[0].color
    else if (!out[0].lockColour) out[0].color = last.color
  }
  return out
}
