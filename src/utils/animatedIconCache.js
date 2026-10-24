// What the page keeps in memory for the animated icon sets, and the rule for
// when it may keep it: only while the viewer is on the Pro tier. Leaving Pro
// empties every store below, and an answer that arrives after that is dropped
// instead of stored.
//
// The stores themselves belong to the page (they also hold the other packs);
// this module owns the purge, the tier it checks, and the code that writes a
// glyph answer into them, so each is testable on its own.
import { ANIMATED_PACKS, isAnimatedPack } from '../data/iconPackTiers.js'

export const glyphKey = (pack, name) => `${pack}:${name}`

let tier = 'anon'

/** The page reports the viewer's tier here whenever it changes. */
export function setAnimatedTier(next) { tier = next }

export const animatedTierIsPaid = () => tier === 'paid'

/** An error for an answer that arrived after the viewer left Pro. */
export const staleAnimatedAnswer = () => Object.assign(new Error('Animated icons answer arrived after the plan changed'), { stale: true })

/**
 * Forget everything fetched for the animated sets.
 *   byPack  Maps keyed by the bare prefix
 *   keyed   Maps or Sets keyed 'prefix:name'
 */
export function purgeAnimatedCaches({ byPack = [], keyed = [] }, packs = ANIMATED_PACKS) {
  for (const pack of packs) {
    for (const store of byPack) store.delete(pack)
    const prefix = `${pack}:`
    for (const store of keyed) {
      for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key)
    }
  }
}

/**
 * Write an Iconify JSON answer for `names` into the glyph stores. Returns false,
 * storing nothing, when the pack is an animated one and the viewer is no longer
 * on Pro; true otherwise.
 *   stores  { body: Map, box: Map, missing: Set }
 */
export function applyGlyphData(pack, names, data, stores) {
  if (isAnimatedPack(pack) && !animatedTierIsPaid()) return false
  const defW = data.width || 24
  const defH = data.height || 24
  const bodyOf = (n) => {
    // A requested name can be an alias; the parent carries the markup. Iconify
    // allows an alias chain, so walk it with a hop cap rather than trusting it
    // to be one deep. An alias such as `lucide:home` (of `house`) would
    // otherwise be recorded as missing.
    let cur = n
    for (let hop = 0; hop < 8; hop++) {
      if (data.icons && data.icons[cur]) return { icon: data.icons[cur], key: cur }
      const alias = data.aliases && data.aliases[cur]
      if (!alias || !alias.parent) return null
      cur = alias.parent
    }
    return null
  }
  for (const n of names) {
    const found = bodyOf(n)
    const key = glyphKey(pack, n)
    if (!found || typeof found.icon.body !== 'string') { stores.missing.add(key); continue }
    stores.missing.delete(key)
    stores.body.set(key, found.icon.body)
    const w = found.icon.width || defW
    const h = found.icon.height || defH
    if (w !== 24 || h !== 24) stores.box.set(key, { w, h })
  }
  return true
}
