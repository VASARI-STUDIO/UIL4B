// Glyph bodies for the icon groups, fetched in batches from the Iconify API.
//
// One request per pack per batch of names (`/{pack}.json?icons=a,b,c`), the
// same endpoint the Icon Library grid uses, never one request per icon. The
// caller passes a PLAN — Map(pack → names) from glyphRequestPlan() in
// src/data/iconGroups.js — and nothing outside the plan is requested, which is
// what keeps a locked group's glyphs, and a gated pack, off the network.
//
// Bodies are cached for the session at module scope, so reopening a group or
// returning to the index costs nothing.

const HOST = 'https://api.iconify.design'
const BATCH = 100

// 'pack:name' → { body, width, height }
const BODIES = new Map()
// 'pack:name' → the in-flight or settled request that covers it
const ASKED = new Map()

const key = (pack, name) => `${pack}:${name}`

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
  const url = `${HOST}/${pack}.json?icons=${names.map(encodeURIComponent).join(',')}`
  try {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(8000) })
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
export async function loadGroupGlyphs(plan, { fetchImpl = globalThis.fetch } = {}) {
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
