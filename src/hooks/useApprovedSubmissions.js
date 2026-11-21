import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listApproved } from '../utils/communityQueueApi'
import { createApprovedLoader, filterApproved } from '../utils/approvedSubmissions'

// The approved community submissions of one kind, for a gallery to merge into
// its rows. The read is attempted signed in or out: listApproved turns a refusal
// (what firestore.rules gives a visitor it does not let read) into an empty list,
// so the static library still renders and nothing is logged. Any other failure is
// an empty list too.
//
// One read serves both galleries: it is kept per account (signed out is its own
// key) for a few minutes, so opening the Palette Library after the Gradient
// Library does not read again, and a sign-in or sign-out reads afresh.
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
    let cancelled = false
    load(key === 'signed-out' ? null : key).then((docs) => { if (!cancelled) setState({ key, docs }) })
    return () => { cancelled = true }
  }, [key, loading])

  // Another account's list never shows through after a sign-out or switch.
  return useMemo(
    () => (state.key === key ? filterApproved(state.docs, { kind }) : EMPTY),
    [key, state, kind],
  )
}
