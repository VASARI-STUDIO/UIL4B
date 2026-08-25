// Loads the generated per-emoji search index on demand.
//
// WHY IT IS NOT BUNDLED. The index is 88 KB raw / ~31 KB gzipped — three times
// the rest of the Emoji Library chunk. The founder's report on this surface was
// "slow to render/load", so paying that on every visit to make the search box
// work would fix one complaint by worsening the other. Instead the grid renders
// from the catalogue alone (unchanged first paint) and the index is fetched the
// moment the user shows intent to search — on focus, before the first keystroke
// — so by the time a character is typed it is normally already resolved.
//
// WHY fetch() AND NOT import(). It was a lazily-imported module first, and the
// retry was untestable-by-inspection but broken in fact: once a dynamic import
// rejects, the browser's module map caches the FAILURE, and every later
// import() of that URL re-rejects from cache without touching the network. So
// "Try again" could never succeed, and neither could coming back online — both
// were verified failing in a browser before this was changed. A fetch() has no
// such cache, so a retry is a real request. As a hashed `?url` asset it is
// still content-addressed and still outside the JS graph, and it no longer
// trips main.jsx's vite:preloadError reload, which is for stale deploys and
// would have thrown away a working page here.

import indexUrl from './emojiIndex.txt?url'
import { parseEmojiIndex } from './emojiIndex.js'

let cached = null
let inflight = null

// The resolved index, or null if it has not finished loading. Lets a caller
// render synchronously when the index is already warm (a second search in the
// same session) instead of flashing a loading state it does not need.
export function getLoadedEmojiIndex() {
  return cached
}

export function loadEmojiIndex() {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch(indexUrl)
      .then((res) => {
        // A 404 resolves rather than rejecting, and would otherwise parse to an
        // empty Map — a search box that finds nothing and says nothing.
        if (!res.ok) throw new Error(`emoji index: HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        const parsed = parseEmojiIndex(text)
        if (!parsed.size) throw new Error('emoji index: empty')
        cached = parsed
        inflight = null
        return cached
      })
      .catch((err) => {
        // Clear the in-flight promise so a retry, or coming back online, is a
        // genuine new attempt rather than a re-await of the same rejection.
        inflight = null
        throw err
      })
  }
  return inflight
}
