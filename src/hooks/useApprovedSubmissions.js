import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listApproved } from '../utils/communityQueueApi'
import { filterApproved } from '../utils/approvedSubmissions'

// The approved community submissions of one kind, for a gallery to merge into
// its rows. firestore.rules only lets a signed-in visitor read them, so a
// signed-out visitor gets an empty list without a request. Any failure is an
// empty list too: the static library still renders and nothing is logged.
//
// One read serves both galleries: it is kept per account for a few minutes, so
// opening the Palette Library after the Gradient Library does not read again.
const EMPTY = Object.freeze([])
const KEEP_MS = 5 * 60 * 1000
let cached = null // { uid, at, promise }

function loadApproved(uid) {
  if (cached && cached.uid === uid && Date.now() - cached.at < KEEP_MS) return cached.promise
  const promise = listApproved({ max: Infinity }).catch(() => {
    if (cached && cached.promise === promise) cached = null // a failure is not kept
    return []
  })
  cached = { uid, at: Date.now(), promise }
  return promise
}

/** The approved documents of `kind` ('gradient' | 'palette'), newest first. */
export default function useApprovedSubmissions(kind) {
  const { user } = useAuth()
  const uid = user?.uid || null
  const [state, setState] = useState({ uid: null, docs: EMPTY })

  useEffect(() => {
    if (!uid) return undefined
    let cancelled = false
    loadApproved(uid).then((docs) => { if (!cancelled) setState({ uid, docs }) })
    return () => { cancelled = true }
  }, [uid])

  // Another account's list never shows through after a sign-out or switch.
  return useMemo(
    () => (uid && state.uid === uid ? filterApproved(state.docs, { kind }) : EMPTY),
    [uid, state, kind],
  )
}
