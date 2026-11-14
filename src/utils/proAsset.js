// The output previews of the Pro community prompts, fetched on entitlement.
//
// A locked prompt's poster, animation and built page are not public files: a
// Pro account asks GET /api/ai?proAsset=<kind>&id=<id> (api/_lib/library/proAssets.js)
// with its ID token, and the answer is shown through a blob: URL. The server
// re-checks the plan, so nothing here is a gate.
//
// This module is the fetch and the per-session cache; the React side is
// src/hooks/useProAsset.js. It follows src/utils/proLibrary.js:
//
//   - cached in memory per uid + kind + id, for the life of the page;
//   - concurrent requests for the same key share one fetch;
//   - everything is dropped, and its blob URL revoked, when the signed-in uid
//     changes (sign-out included), by a listener on the auth state;
//   - the token sent is always the one of the uid the request is keyed on.
//
// 'unavailable' (503 or 404: this deployment has no preview data for the id)
// is reported separately from 'error' (see STATIC_FALLBACK in the hook).

export const proAssetKey = (uid, kind, id) => `${uid}:${kind}:${id}`

export function createProAsset({ loadAuth = null, fetchImpl = null, createURL = null, revokeURL = null } = {}) {
  const env = { loadAuth, fetchImpl, createURL, revokeURL }
  const cache = new Map() // key -> blob URL
  const inflight = new Map() // key -> Promise<outcome>
  const unavailable = new Set() // keys the server has no preview for
  let watching = false

  const makeURL = (blob) => (env.createURL || globalThis.URL.createObjectURL)(blob)
  const dropURL = (url) => { try { (env.revokeURL || globalThis.URL.revokeObjectURL)(url) } catch { /* already gone */ } }

  const cachedAsset = (key) => cache.get(key) || null
  const isAssetUnavailable = (key) => unavailable.has(key)

  function forgetWhere(drop) {
    for (const [key, url] of [...cache]) if (drop(key)) { cache.delete(key); dropURL(url) }
    for (const key of [...inflight.keys()]) if (drop(key)) inflight.delete(key)
    for (const key of [...unavailable]) if (drop(key)) unavailable.delete(key)
  }
  /** Drop everything that belongs to any uid but this one (null drops it all). */
  function forgetAssetsExcept(uid) {
    const prefix = uid ? `${uid}:` : null
    forgetWhere((key) => !prefix || !key.startsWith(prefix))
  }

  async function watchAuth() {
    if (watching) return
    watching = true
    try {
      const sdk = await env.loadAuth?.()
      if (typeof sdk?.onAuthStateChanged !== 'function') { watching = false; return }
      sdk.onAuthStateChanged(sdk.auth, (user) => forgetAssetsExcept(user?.uid || null))
    } catch {
      watching = false
    }
  }

  async function request(kind, id, uid) {
    const sdk = await env.loadAuth?.()
    const user = sdk?.auth?.currentUser
    if (!user || user.uid !== uid) return { outcome: 'error' }
    const token = await user.getIdToken()
    if (!token) return { outcome: 'error' }
    const doFetch = env.fetchImpl || globalThis.fetch
    const response = await doFetch(`/api/ai?proAsset=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 403) return { outcome: 'denied' }
    if (response.status === 404 || response.status === 503) return { outcome: 'unavailable' }
    if (!response.ok) return { outcome: 'error' }
    const blob = await response.blob()
    return { outcome: 'ready', blob }
  }

  /**
   * Load one preview for one account. Never rejects: resolves 'ready',
   * 'unavailable', 'denied', 'error' or 'discarded' (the account changed while
   * it was in flight). Only 'ready' and 'unavailable' are remembered.
   */
  function loadProAsset(kind, id, uid) {
    const key = proAssetKey(uid, kind, id)
    if (cache.has(key)) return Promise.resolve('ready')
    if (unavailable.has(key)) return Promise.resolve('unavailable')
    if (inflight.has(key)) return inflight.get(key)
    watchAuth()
    const run = request(kind, id, uid)
      .catch(() => ({ outcome: 'error' }))
      .then(({ outcome, blob }) => {
        if (inflight.get(key) !== run) return 'discarded'
        inflight.delete(key)
        if (outcome === 'ready') cache.set(key, makeURL(blob))
        else if (outcome === 'unavailable') unavailable.add(key)
        return outcome
      })
    inflight.set(key, run)
    return run
  }

  return {
    cachedAsset, isAssetUnavailable, forgetAssetsExcept, loadProAsset,
    setAuth(loader) { env.loadAuth = loader },
  }
}

const shared = createProAsset()

export const setProAssetAuth = shared.setAuth
export const cachedAsset = shared.cachedAsset
export const isAssetUnavailable = shared.isAssetUnavailable
export const forgetAssetsExcept = shared.forgetAssetsExcept
export const loadProAsset = shared.loadProAsset
