import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { loadAuthSdk } from '../utils/firebaseAccess'
import { isProPreview } from '../data/proPreviewIds'
import { promptAnimSrc, promptPageSrc, promptPosterSrc } from '../data/promptPreviewAssets'
import { cachedAsset, forgetAssetsExcept, loadProAsset, proAssetKey, setProAssetAuth } from '../utils/proAsset'

// proAsset.js holds no Firebase import of its own; this is where it gets its auth.
setProAssetAuth(loadAuthSdk)

// The locked previews are not in public/, so a deployment without the Pro
// preview data (the route answers 503) shows the error state, never a file.
export const STATIC_FALLBACK = false

const STATIC = { poster: promptPosterSrc, anim: promptAnimSrc, page: promptPageSrc }

/**
 * Where to load one prompt preview from.
 *
 * A free prompt's preview is a public file: its path comes back at once. A Pro
 * prompt's preview is fetched with the account's ID token and comes back as a
 * blob: URL once it has loaded, or null until then (and for a viewer who is not
 * Pro, who is never shown these previews by the library pages).
 *
 * `enabled: false` holds the fetch back (an animation that is not playing).
 * Returns { src, status }: status is 'static', 'loading', 'ready', 'denied',
 * 'error' or 'idle'.
 */
export function useProAsset(kind, id, { enabled = true, retry = 0 } = {}) {
  const { user } = useAuth()
  const { isPro, planKnown } = useSubscription()
  const uid = user?.uid || null
  const locked = isProPreview(id)
  const allowed = locked && enabled && isPro === true && planKnown === true && uid != null
  const key = proAssetKey(uid, kind, id)
  // A failed load is not remembered, so bumping `retry` asks again; the
  // attempt is part of the result's key so the old failure does not show.
  const attemptKey = `${key}#${retry}`

  const [result, setResult] = useState(null) // { key, outcome }

  useEffect(() => { forgetAssetsExcept(uid) }, [uid])

  useEffect(() => {
    if (!allowed || cachedAsset(key)) return undefined
    let live = true
    loadProAsset(kind, id, uid).then((outcome) => { if (live) setResult({ key: attemptKey, outcome }) })
    return () => { live = false }
  }, [allowed, kind, id, uid, key, attemptKey])

  if (!locked) return { src: STATIC[kind](id), status: 'static' }
  if (!allowed) return { src: null, status: 'idle' }
  const url = cachedAsset(key)
  if (url) return { src: url, status: 'ready' }
  const outcome = result?.key === attemptKey ? result.outcome : null
  if (outcome === 'unavailable' && STATIC_FALLBACK) return { src: STATIC[kind](id), status: 'static' }
  if (outcome === 'denied') return { src: null, status: 'denied' }
  if (outcome === 'error' || outcome === 'discarded' || outcome === 'unavailable') return { src: null, status: 'error' }
  return { src: null, status: 'loading' }
}
