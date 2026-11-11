// How the server-only libraries become the browser's copy of them.
//
// The browser never holds a Pro row's values. It holds, for each library:
//
//   - the FULL record of every row a free account may open (the first
//     GALLERY_TIER_LIMITS.free eligible rows), and
//   - a STUB for every other row: its id, the name or tags the locked tease
//     shows, how many values it holds, and the one flag `isOpen` reads.
//
// in the library's canonical order, so the pages can keep calling
// splitLockedLibrary on the whole list exactly as they did and get the same
// `open`, `locked`, `remaining` and `eligible`. A Pro account replaces the list
// with the server's response (serve.js), which is the same canonical order.
//
// THE FREE SET IS COMPUTED, NOT LISTED. `freeSplit` runs the pages' own
// splitLockedLibrary with the pages' own rule (src/utils/libraryRules.js) and
// the free tier's cap, over the server data. src/data/*.js are generated from
// it by emitClient.js, and tests/unit/pro-library-server-only.test.js fails if
// the committed files differ from a fresh render.
//
// This file is build-time and test-time tooling, kept out of api/ on purpose:
// the request path (api/_lib/library/serve.js) never imports it, so no src/
// file is imported from api/ and the page-side rules and the split do not ride
// in the function.

import { GALLERY_TIER_LIMITS, splitLockedLibrary } from '../../src/utils/lockedPreview.js'
import { LIBRARY_RULES, rowSlots } from '../../src/utils/libraryRules.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { BRAND_PALETTES } from '../../api/_lib/library/brandPalettes.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { COMMUNITY_PROMPTS } from '../../api/_lib/library/communityPrompts.js'
import { GALLERY_PALETTES } from '../../api/_lib/library/paletteGallery.js'
import { LIBRARIES } from '../../api/_lib/library/serve.js'

export { LIBRARIES }

/** The free tier's rows of a library, found with the page's own split. */
export function freeSplit(kind, items = LIBRARIES[kind]) {
  const rules = LIBRARY_RULES[kind]
  return splitLockedLibrary(items, {
    unlocked: false,
    isOpen: rules.isOpen,
    preview: rules.preview,
    limit: GALLERY_TIER_LIMITS.free,
    tease: Infinity,
  })
}

/** A Pro row with its payload withheld: only what the tease and `isOpen` need. */
export function stubOf(kind, item) {
  if (kind === 'palettes') {
    const stub = { id: item.id, name: item.name, kind: item.kind, slots: rowSlots(item) }
    if (item.pro !== undefined) stub.pro = item.pro
    // A date is a public fact about the library, and "New in Discover" sorts on it.
    if (item.added !== undefined) stub.added = item.added
    return stub
  }
  if (kind === 'gradients') return { id: item.id, name: item.name, slots: rowSlots(item) }
  // `category` places the locked card on the gallery overview; like the tags it
  // is a public filter facet, not the payload.
  const stub = { id: item.id, free: item.free, tags: item.tags }
  if (item.category !== undefined) stub.category = item.category
  return stub
}

/** The library in canonical order: full where free, stub elsewhere. */
export function clientRows(kind, items = LIBRARIES[kind]) {
  const free = new Set(freeSplit(kind, items).open.map((item) => item.id))
  return items.map((item) => (free.has(item.id) ? item : stubOf(kind, item)))
}

/** The Palette Builder's Brands panel: free brands in full, Pro brands as stubs. */
export function brandRows(brands = BRAND_PALETTES) {
  return brands.map((brand) => (brand.free === true
    ? { id: brand.id, name: brand.name, free: true, system: brand.system, colors: brand.colors }
    : { id: brand.id, name: brand.name, free: false, slots: rowSlots(brand) }))
}

/** True totals, for every surface that prints a count without holding the rows. */
export function libraryTotals() {
  return {
    palettes: LIBRARY_PALETTES.length,
    curatedPalettes: GALLERY_PALETTES.length,
    brandPalettes: BRAND_PALETTES.length,
    freeBrandPalettes: BRAND_PALETTES.filter((brand) => brand.free === true).length,
    gradients: GALLERY_GRADIENTS.length,
    prompts: COMMUNITY_PROMPTS.length,
  }
}
