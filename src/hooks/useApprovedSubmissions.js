import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listApproved } from '../utils/communityQueueApi'
import { createApprovedLoader, filterApproved } from '../utils/approvedSubmissions'

// The approved community submissions of one kind, for a gallery to merge into
// its rows. Only a signed-in member reads: firestore.rules does not yet let a
// visitor list the queue, so a signed-out read would only be refused. When the
// rules allow approved reads for visitors, drop the signed-out early return
// below. listApproved turns a refusal into an empty list, and any other failure
// is an empty list too, so the static library always renders.
//
// One read serves both galleries: it is kept per account for a few minutes, so
// opening the Palette Library after the Gradient Library does not read again,
// and a sign-in or account switch reads afresh.
const EMPTY = Object.freeze([])
const load = createApprovedLoader({
  list: () => listApproved({ kinds: ['gradient', 'palette'], max: Infinity }),
})

/** The approved documents of `kind` ('gradient' | 'palette'), newest first. */
export default function useApprovedSubmissions(kind) {
  const { user, loading } = useAuth()
  const key = user?.uid || 'signed-out'
  const [state, setState] = useState({ key: null, docs: EMPTY })

  useEffect(() => {
    if (loading) return undefined // wait for the sign-in state, so one read is not wasted
    if (key === 'signed-out') return undefined // visitors cannot read the queue yet (see above)
    let cancelled = false
    load(key).then((docs) => { if (!cancelled) setState({ key, docs }) })
    return () => { cancelled = true }
  }, [key, loading])

  // Another account's list never shows through after a sign-out or switch.
  return useMemo(
    () => (state.key === key ? filterApproved(state.docs, { kind }) : EMPTY),
    [key, state, kind],
  )
}
