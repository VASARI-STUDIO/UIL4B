import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { loadAuthSdk } from '../utils/firebaseAccess'
import { readSessionHint } from '../utils/sessionHint'
import {
  libraryKey, deriveLibraryStatus, cachedLibrary, hasCachedLibrary, isLibraryDenied, clearLibraryDenied,
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
 *   active  true when this viewer is, or may turn out to be, a Pro account whose
 *           library comes from the server. Pages keep the free rows and show a
 *           status block in place of the upsell while it is true and `status`
 *           is not 'ready'.
 *   status  'idle'      not a Pro viewer: anonymous, or a signed-in account
 *                       whose plan resolved to free;
 *           'resolving' signed in (or a returning session whose auth has not
 *                       answered) and the plan is not known yet, so the viewer
 *                       may be Pro and must not be shown the free wall;
 *           'loading'   request in flight;
 *           'ready'     `items` holds the whole library in canonical order;
 *           'refused'   the server answered 403 for an account the client
 *                       believed was Pro; `retry` clears that and asks again;
 *           'error'     network or server failure; `retry` asks again.
 *   items   the fetched rows, or null until ready.
 */
export function useProLibrary(kind, { enabled: wanted = true } = {}) {
  const { user, loading: authLoading } = useAuth()
  const { isPro, planKnown } = useSubscription()
  const uid = user?.uid || null
  const enabled = wanted === true && isPro === true && planKnown === true && uid != null
  const key = libraryKey(uid, kind)

  const [, setVersion] = useState(0)
  const [failedKey, setFailedKey] = useState(null)
  // Bumped by a retry after a refusal: the denied mark is cleared outside React,
  // so the fetch effect needs a dependency that changes to run again.
  const [attempt, setAttempt] = useState(0)

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
  }, [enabled, kind, uid, key, failedKey, attempt])

  const retry = useCallback(() => {
    clearLibraryDenied(key)
    setFailedKey(null)
    setAttempt((n) => n + 1)
  }, [key])

  // A returning session whose auth has not answered yet, or an account whose
  // plan is still on the way. The hint is only a guess about the first paint
  // (utils/sessionHint.js), so a wrong one costs a moment of neutral loading and
  // never grants anything.
  const resolving = (authLoading === true && readSessionHint()) || (uid != null && planKnown !== true)
  const status = deriveLibraryStatus({
    wanted: wanted === true,
    enabled,
    cached: enabled && hasCachedLibrary(key),
    denied: enabled && isLibraryDenied(key),
    failed: failedKey === key,
    resolving,
  })
  const items = status === 'ready' ? cachedLibrary(key) : null
  // `active` stays true through every state but 'idle', so a Pro viewer never
  // gets the upsell, and an account whose plan is still resolving gets the
  // neutral status block rather than the free wall.
  const active = status !== 'idle'
  return { items, status, retry, active }
}
