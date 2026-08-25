// Loads the generated per-emoji search index on demand.
//
// WHY NOT BUNDLED. The index is 88 KB raw / ~31 KB gzipped — three times the
// rest of the Emoji Library chunk. The founder's report on this surface was
// "slow to render/load", so paying that on every visit to make the search box
// work would fix one complaint by worsening the other. Instead the grid renders
// from the catalogue alone (unchanged first paint) and the index is fetched the
// moment the user shows intent to search — on focus, before the first keystroke
// — so by the time a character is typed it is normally already resolved.
//
// The promise is cached, so concurrent callers share one request and a repeat
// visit within the session is synchronous.

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
    inflight = import('./emojiIndex.js')
      .then((mod) => {
        cached = mod.EMOJI_TERMS
        inflight = null
        return cached
      })
      .catch((err) => {
        // Clear the in-flight promise so a retry (or coming back online) can
        // genuinely re-attempt rather than re-await the same rejection forever.
        inflight = null
        throw err
      })
  }
  return inflight
}
