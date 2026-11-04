import { useEffect, useState } from 'react'
import { loadAuthSdk } from '../utils/firebaseAccess'
import { msToUtcMidnight, settleServerUsage, utcDay } from '../components/userhome/workspace'

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
//
// An answer goes stale three ways, and each is handled:
//   - the tab was hidden for a while   -> refetch when it becomes visible again
//   - the UTC day rolled over          -> refetch at the next UTC midnight, and
//                                         never show an answer for another day
//   - the plan changed (free -> Pro)   -> refetch; until it lands, the answer's
//                                         limit and monthly limit are dropped,
//                                         so a Pro account is not capped at the
//                                         free limit. The count is kept: it
//                                         does not depend on the plan.

export function useServerAiUsage(uid, planId = null) {
  const [state, setState] = useState({ uid: null, planId: null, day: null, usage: null })
  const [today, setToday] = useState(() => utcDay())

  useEffect(() => {
    if (!uid) return undefined
    let live = true
    let seq = 0
    let timer = null

    const load = async () => {
      const mine = ++seq
      // The day on THIS clock when asked; compared with this clock later, so a wrong
      // device clock cannot hide every answer.
      const asked = utcDay()
      setToday(asked)
      try {
        const sdk = await loadAuthSdk()
        const token = await sdk.auth.currentUser?.getIdToken()
        if (!token) return
        const res = await fetch('/api/ai?usage=1', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const body = await res.json()
        // `mine === seq`: a slower, older request must not overwrite a newer answer.
        if (live && mine === seq && Number.isFinite(body?.used)) setState({ uid, planId, day: asked, usage: body })
      } catch { /* keep the local figure */ }
    }

    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    const armMidnight = () => {
      timer = setTimeout(() => { load(); armMidnight() }, msToUtcMidnight())
    }

    load()
    document.addEventListener('visibilitychange', onVisible)
    armMidnight()
    return () => {
      live = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid, planId])

  return settleServerUsage(state, { uid, planId, today })
}
