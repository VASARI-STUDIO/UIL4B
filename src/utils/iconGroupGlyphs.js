// Glyph bodies for the icon groups, fetched in batches from the Iconify API.
//
// One request per pack per batch of names (`/{pack}.json?icons=a,b,c`), the
// same endpoint the Icon Library grid uses, never one request per icon. The
// caller passes a PLAN — Map(pack → names) from glyphRequestPlan() in
// src/data/iconGroups.js — and nothing outside the plan is requested, which is
// what keeps a locked group's glyphs, and a gated pack, off the network.
//
// Bodies are cached for the session at module scope, so reopening a group or
// returning to the index costs nothing; the requests themselves go through
// iconifyFetch, so they survive a reload and honour the shared rate-limit
// cool-down.

// The extension matters: Node's ESM loader (the unit tests) does not add one.
import { iconifyFetch } from './iconifyFetch.js'

import { isAnimatedPack } from '../data/iconPackTiers.js'

const HOST = 'https://api.iconify.design'
const BATCH = 100

// 'pack:name' → { body, width, height }
const BODIES = new Map()
// 'pack:name' → the in-flight or settled request that covers it
const ASKED = new Map()

const key = (pack, name) => `${pack}:${name}`

/** Names per glyph request in the Icon Library grid (the groups use the same size). */
export const GLYPH_CHUNK = BATCH

/**
 * Which glyph requests cover `refs`, with each icon always landing in the same
 * one. `lists` is Map(pack → that pack's names in listing order); `refs` is the
 * icons on screen, as { pack, name }. A pack's list is cut into fixed chunks by
 * position (chunk k = names[k*size .. (k+1)*size)), and every chunk that holds a
 * visible icon is returned whole. So the URL for an icon depends on where it sits
 * in its pack, never on which other icons happen to be visible, and a cache load
 * and a network load ask for the same URLs.
 *
 * A ref that is not in its pack's list (a Recent-rail icon the grid is not
 * showing) cannot be placed by position: those names are sorted and chunked
 * apart, so the same set still gives the same URL.
 *
 * Returns [{ pack, id, names }], each chunk once.
 */
export function glyphChunkPlan(lists, refs, size = GLYPH_CHUNK) {
  const posOf = new Map()
  for (const [pack, names] of lists) {
    names.forEach((n, i) => { if (!posOf.has(key(pack, n))) posOf.set(key(pack, n), i) })
  }
  const chunks = new Map()
  const extras = new Map()
  for (const { pack, name } of refs) {
    const i = posOf.get(key(pack, name))
    if (i === undefined) {
      if (!extras.has(pack)) extras.set(pack, new Set())
      extras.get(pack).add(name)
      continue
    }
    const k = Math.floor(i / size)
    const id = `${pack}:${k}`
    if (!chunks.has(id)) chunks.set(id, { pack, id: String(k), names: lists.get(pack).slice(k * size, (k + 1) * size) })
  }
  const plan = [...chunks.values()]
  for (const [pack, set] of extras) {
    const sorted = [...set].sort()
    for (let i = 0; i < sorted.length; i += size) plan.push({ pack, id: `x${i / size}`, names: sorted.slice(i, i + size) })
  }
  return plan
}

/** The cached glyph for `pack:name`, or null until its batch has landed. */
export function glyphFor(ref) {
  return BODIES.get(ref) || null
}

function store(pack, names, data) {
  const defW = data?.width || 24
  const defH = data?.height || 24
  for (const n of names) {
    let cur = n
    for (let hop = 0; hop < 8; hop += 1) {
      const icon = data?.icons?.[cur]
      if (icon && typeof icon.body === 'string') {
        BODIES.set(key(pack, n), { body: icon.body, width: icon.width || defW, height: icon.height || defH })
        break
      }
      const parent = data?.aliases?.[cur]?.parent
      if (!parent) break
      cur = parent
    }
  }
}

async function requestBatch(pack, names, fetchImpl) {
  // The animated sets load only through the server's Pro check, never from this host.
  if (isAnimatedPack(pack)) return false
  const url = `${HOST}/${pack}.json?icons=${names.map(encodeURIComponent).join(',')}`
  try {
    // An injected fetchImpl (the unit tests') is called directly: those tests
    // count calls, which a shared cache and cool-down would swallow.
    const r = fetchImpl
      ? await fetchImpl(url, { signal: AbortSignal.timeout(8000) })
      : await iconifyFetch(url, { timeout: 8000 })
    if (!r.ok) return false
    store(pack, names, await r.json())
    return true
  } catch {
    return false
  }
}

/**
 * Fetch every name in `plan` that is not already cached or in flight.
 * Resolves true when every batch was answered, false when any was refused —
 * the caller shows the refused state rather than a grid of empty cells.
 * A refused batch is forgotten, so a retry asks again.
 */
export async function loadGroupGlyphs(plan, { fetchImpl = null } = {}) {
  const waits = []
  for (const [pack, names] of plan || []) {
    const fresh = names.filter((n) => !BODIES.has(key(pack, n)) && !ASKED.has(key(pack, n)))
    for (let i = 0; i < fresh.length; i += BATCH) {
      const chunk = fresh.slice(i, i + BATCH)
      const p = requestBatch(pack, chunk, fetchImpl).then((ok) => {
        if (!ok) chunk.forEach((n) => ASKED.delete(key(pack, n)))
        return ok
      })
      chunk.forEach((n) => ASKED.set(key(pack, n), p))
    }
    for (const n of names) {
      const pending = ASKED.get(key(pack, n))
      if (pending && !waits.includes(pending)) waits.push(pending)
    }
  }
  const results = await Promise.all(waits)
  return results.every(Boolean)
}

/** Test hook: forget every cached body and request. */
export function resetGroupGlyphs() {
  BODIES.clear()
  ASKED.clear()
}
