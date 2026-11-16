// The browser half of the live page previews: ask POST /api/ai?export=preview for one page of one theme drawn with the
// person's brand, and hand back its HTML for a sandboxed frame. The page is made on the server; nothing here can draw a theme.
//
// fetchPagePreview never throws. It resolves one of:
//   { status: 'ok', html }      the page, as a document with no script to run (the frame is sandboxed with no permissions)
//   { status: 'upgrade' }       403: this account is not on a plan that can see the theme's own page; the stock picture stays
//   { status: 'unavailable' }   anything else (signed out, no such page, a network or server fault); the stock picture stays
// A page already asked for is answered from memory, keyed by theme, page and a hash of the brand sent.
// `loadAuth` and `fetchImpl` are injected so a test runs this without Firebase or a network.

import { documentDesign } from '../../utils/exportDocument.js'

export const EXPORT_PREVIEW_URL = '/api/ai?export=preview'
const CACHE_LIMIT = 40

/** A short stable hash of the brand sent (FNV-1a over its JSON), so a change of colour, type, logo or name is a new key. */
export function brandHash(brand) {
  const text = JSON.stringify(brand ?? null)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

/** The brand the server draws a page from: the design the export reads, and the name as typed. */
export const brandOf = (design, name) => ({ name: String(name || design?.name || ''), design: documentDesign(design) })

export const previewKey = (theme, page, hash) => `${theme}|${page}|${hash}`

const cache = new Map()
const asking = new Map()
// Set once the server answers that the endpoint does not exist (404, 405, 501): later pages are not asked for.
let missing = false

/** Forget every stored page and the memory of a missing endpoint (for a test, and for a sign-out). */
export function clearPreviewCache() {
  cache.clear()
  asking.clear()
  missing = false
}

/** The stored answer for a request, or null. */
export const cachedPreview = (theme, page, brand) => cache.get(previewKey(theme, page, brandHash(brand))) || null

function remember(key, answer) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
  cache.set(key, answer)
}

export async function fetchPagePreview({ theme, page, brand }, { loadAuth, fetchImpl, signal } = {}) {
  const key = previewKey(theme, page, brandHash(brand))
  if (cache.has(key)) return cache.get(key)
  if (missing) return { status: 'unavailable' }
  if (asking.has(key)) return asking.get(key)
  const run = (async () => {
    try {
      const sdk = await loadAuth?.()
      const user = sdk?.auth?.currentUser
      const token = user ? await user.getIdToken() : null
      if (!token) return { status: 'unavailable' }
      const doFetch = fetchImpl || globalThis.fetch
      const res = await doFetch(EXPORT_PREVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme, page, brand }),
        signal,
      })
      if (res.status === 403) {
        const answer = { status: 'upgrade' }
        remember(key, answer)
        return answer
      }
      if (res.status === 404 || res.status === 405 || res.status === 501) missing = true
      if (!res.ok) return { status: 'unavailable' }
      const type = String(res.headers?.get?.('Content-Type') || '')
      const html = type.includes('json') ? (await res.json().catch(() => null))?.html : await res.text()
      if (typeof html !== 'string' || !html) return { status: 'unavailable' }
      const answer = { status: 'ok', html }
      remember(key, answer)
      return answer
    } catch {
      return { status: 'unavailable' }
    } finally {
      asking.delete(key)
    }
  })()
  asking.set(key, run)
  return run
}
