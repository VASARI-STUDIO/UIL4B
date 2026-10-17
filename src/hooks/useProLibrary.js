import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { loadAuthSdk } from '../utils/firebaseAccess'
import {
  libraryKey, cachedLibrary, hasCachedLibrary, isLibraryDenied, clearLibraryDenied,
  forgetLibrariesExcept, forgetLibrariesOf, loadProLibrary, setProLibraryAuth,
} from '../utils/proLibrary'

// proLibrary.js holds no Firebase import of its own; this is where it gets its auth.
setProLibraryAuth(loadAuthSdk)

/**
 * The full Pro library for a Pro account, fetched from the server.
 *
 * Fetches only when the account is Pro AND its plan has finished resolving
 * (`isPro` is the free default while the entitlement is still on the way, and
 * a Pro account must not flash the upsell on the strength of that default).
 *
 * `enabled: false` holds the fetch back (the Palette Builder waits until its
 * gallery popup is open); a library already fetched this session is not refetched.
 *
 * Returns { items, status, retry, active }:
 *   active  true when this viewer is a Pro account whose library should come
 *           from the server. Pages keep the free rows and show a quiet line
 *           while it is true and `status` is not 'ready'.
 *   status  'idle'     not a Pro viewer, or the server said this account is not
 *                      Pro (403: treated as free, no error UI);
 *           'loading'  request in flight;
 *           'ready'    `items` holds the whole library in canonical order;
 *           'error'    network or server failure; `retry` asks again.
 *   items   the fetched rows, or null until ready.
 */
export function useProLibrary(kind, { enabled: wanted = true } = {}) {
  const { user } = useAuth()
  const { isPro, planKnown } = useSubscription()
  const uid = user?.uid || null
  const enabled = wanted === true && isPro === true && planKnown === true && uid != null
  const key = libraryKey(uid, kind)

  const [, setVersion] = useState(0)
  const [failedKey, setFailedKey] = useState(null)

  // A different account (or none) on this tab never sees the last one's rows.
  // (proLibrary also follows the auth state itself, so this is the second line.)
  useEffect(() => { forgetLibrariesExcept(uid) }, [uid])

  // An account whose plan has resolved to not-Pro keeps no Pro rows in memory.
  useEffect(() => { if (planKnown === true && isPro !== true && uid) forgetLibrariesOf(uid) }, [planKnown, isPro, uid])

  useEffect(() => {
    if (!enabled) { clearLibraryDenied(key); return undefined }
    if (hasCachedLibrary(key) || isLibraryDenied(key) || failedKey === key) return undefined
    let live = true
    loadProLibrary(kind, uid).then((outcome) => {
      if (!live) return
      // 'discarded' with this effect still live: the cache was emptied under a
      // request for the account that is still signed in. Offer the retry.
      if (outcome === 'error' || outcome === 'discarded') setFailedKey(key)
      else setVersion((v) => v + 1)
    })
    return () => { live = false }
  }, [enabled, kind, uid, key, failedKey])

  const retry = useCallback(() => setFailedKey(null), [])

  let status = 'idle'
  let items = null
  if (enabled) {
    if (hasCachedLibrary(key)) { status = 'ready'; items = cachedLibrary(key) }
    else if (isLibraryDenied(key)) status = 'idle'
    else if (failedKey === key) status = 'error'
    else status = 'loading'
  }
  // `active` stays true through loading and error, so a Pro viewer never gets
  // the upsell. A plan still resolving is not a Pro viewer yet and sees the
  // free view until it is, exactly as before.
  const active = status !== 'idle'
  return { items, status, retry, active }
}
