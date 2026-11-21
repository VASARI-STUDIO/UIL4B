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
import { onSignOut } from '../../utils/signOutHooks.js'

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
// Counts clears. A request that began before a clear belongs to the previous account and is not stored.
let epoch = 0
// Whose pages the cache holds: the signed-in uid (null when signed out) and whether the account is on Pro.
let owner = { uid: null, pro: false }

/** Forget every stored page and the memory of a missing endpoint (for a test, and for a sign-out). */
export function clearPreviewCache() {
  cache.clear()
  asking.clear()
  missing = false
  epoch += 1
}

// Signing out clears the cache at once (AuthContext runs the sign-out hooks), so the next account never sees these pages.
onSignOut(clearPreviewCache)

/**
 * Tells the cache who is signed in and on which plan, and clears it when either changes (a sign-out, another account, an upgrade
 * or a lapse), so one account's pages, or a Free account's "upgrade" answers, are never shown to the next. `pro` left out keeps
 * the plan already known. Cheap enough to call on every render.
 */
export function syncPreviewOwner(uid, pro) {
  const next = { uid: uid || null, pro: pro === undefined ? owner.pro : Boolean(pro) }
  if (next.uid === owner.uid && next.pro === owner.pro) return
  owner = next
  clearPreviewCache()
}

/**
 * The key a component holds an answer under: the request's key behind the owner the cache holds now. An answer kept under one
 * owner's key is never read back under another's, so a screen that keeps its own copy cannot show the last account's page.
 */
export const ownedPreviewKey = (theme, page, hash) => `${owner.uid ?? ''}|${owner.pro ? 'pro' : 'free'}|${previewKey(theme, page, hash)}`

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
  let began = epoch
  const run = (async () => {
    try {
      const sdk = await loadAuth?.()
      const user = sdk?.auth?.currentUser
      // The account signed in now owns the cache; a different one from the last request clears it first.
      syncPreviewOwner(user?.uid)
      began = epoch
      const token = user ? await user.getIdToken() : null
      if (!token) return { status: 'unavailable' }
      const doFetch = fetchImpl || globalThis.fetch
      const res = await doFetch(EXPORT_PREVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme, page, brand }),
        signal,
      })
      const current = began === epoch
      if (res.status === 403) {
        const answer = { status: 'upgrade' }
        if (current) remember(key, answer)
        return answer
      }
      if (res.status === 404 || res.status === 405 || res.status === 501) missing = true
      if (!res.ok) return { status: 'unavailable' }
      const type = String(res.headers?.get?.('Content-Type') || '')
      const html = type.includes('json') ? (await res.json().catch(() => null))?.html : await res.text()
      if (typeof html !== 'string' || !html) return { status: 'unavailable' }
      const answer = { status: 'ok', html }
      if (current) remember(key, answer)
      return answer
    } catch {
      return { status: 'unavailable' }
    } finally {
      // A clear may have started the same request again for the next account; only this run's own entry goes.
      if (asking.get(key) === run) asking.delete(key)
    }
  })()
  asking.set(key, run)
  return run
}
