// The first icon names of every Iconify pack the library lists, committed so the
// default "All packs" grid does not have to ask the API's /collection endpoint
// for them. That endpoint is rate-limited per IP (one visit's worth of requests
// was enough to be refused for an hour), while /{prefix}.json?icons= - how the
// grid fetches its glyphs - is not. Names come from here, glyphs stay live.
//
// One file per pack under ./iconHeads/, each { title, names }, written by
// scripts/snapshot-icon-heads.mjs with the Regular-weight rule already applied
// and capped at HEAD_SIZE names. Each file is its own chunk, so a visitor loads
// only the packs their tier lists. They are a starting point, not the catalogue:
// browsing one pack still reads its full /collection.
export const HEAD_SIZE = 250

const loaders = import.meta.glob('./iconHeads/*.json', { import: 'default' })
const loaded = new Map()

/** { title, names } for one pack, or a rejection when the pack has no head file. */
export function loadPackHead(pack) {
  const load = loaders[`./iconHeads/${pack}.json`]
  if (!load) return Promise.reject(new Error(`No icon head for ${pack}`))
  if (!loaded.has(pack)) {
    // A chunk that failed to load is asked for again next time, not remembered.
    loaded.set(pack, load().catch((error) => { loaded.delete(pack); throw error }))
  }
  return loaded.get(pack)
}
