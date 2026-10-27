import { useEffect, useState } from 'react'
import { loadAuthSdk } from '../utils/firebaseAccess'

// This account's AI usage, read from the server (GET /api/ai?usage=1).
//
// The strip on /projects used to read a per-browser localStorage count, so a
// second device, a cleared cache or a private window showed "0 of 5" while the
// account had used 5. The enforced count lives in Firestore documents the
// client cannot read; the endpoint reads them for the signed-in account.
//
// Fails quiet: any error leaves `usage` null and the caller keeps the local
// figure, which is what the page showed before. `uid` is both the "signed in"
// switch and the key, so one account's figures are never shown to the next.
export function useServerAiUsage(uid) {
  const [state, setState] = useState({ uid: null, usage: null })

  useEffect(() => {
    if (!uid) return undefined
    let live = true
    ;(async () => {
      try {
        const sdk = await loadAuthSdk()
        const token = await sdk.auth.currentUser?.getIdToken()
        if (!token) return
        const res = await fetch('/api/ai?usage=1', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const body = await res.json()
        if (live && Number.isFinite(body?.used)) setState({ uid, usage: body })
      } catch { /* keep the local figure */ }
    })()
    return () => { live = false }
  }, [uid])

  return state.uid === uid ? state.usage : null
}
