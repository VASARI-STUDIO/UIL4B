// Loads the generated shortcode table on demand — when the first detail dialog
// opens, not on page load, so the grid's first paint pays nothing for it.
//
// A fetch() of a hashed asset, not a dynamic import(): a rejected import() is
// cached by the browser's module map and a retry could never succeed, while a
// fetch() is a real request every time. See emojiIndexLoader.js for the long
// version of that argument; this is the same shape for the same reasons.

import tableUrl from './emojiShortcodes.txt?url'
import { parseEmojiShortcodes } from './emojiShortcodes.js'

let cached = null
let inflight = null

export function getLoadedEmojiShortcodes() {
  return cached
}

export function loadEmojiShortcodes() {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch(tableUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`emoji shortcodes: HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        const parsed = parseEmojiShortcodes(text)
        if (!parsed.size) throw new Error('emoji shortcodes: empty')
        cached = parsed
        inflight = null
        return cached
      })
      .catch((err) => {
        inflight = null
        throw err
      })
  }
  return inflight
}
