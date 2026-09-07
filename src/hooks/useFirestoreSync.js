import { useEffect, useRef, useCallback } from 'react'
// URGENT access, not patient: every code path below is already behind a
// truthy `uid`, which only exists once auth has resolved to a signed-in user.
// By then the deferred chunk is either loaded or in flight, so this awaits an
// already-settled promise in the common case — and if it is the first Firestore
// touch of the session, the person whose data is syncing is exactly who should
// open the gate rather than wait behind it. See src/utils/firebaseAccess.js.
import { loadFirestore } from '../utils/firebaseAccess'

const SYNC_KEYS = [
  'vs-current-design',
  'vs-prompts',
  'vs-pinned-tools',
  'vs-recent-tools',
  'vs-t',
  'vs-lang',
  'vs-appearance',
]

const DEBOUNCE_MS = 2000

function getLocalData() {
  const data = {}
  SYNC_KEYS.forEach(key => {
    const raw = localStorage.getItem(key)
    if (raw) {
      try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
    }
  })
  return data
}

export function useFirestoreSync(uid) {
  const timerRef = useRef(null)
  const unsubRef = useRef(null)
  const suppressRef = useRef(false)

  const pushToFirestore = useCallback(async () => {
    if (!uid) return
    const data = getLocalData()
    data._updatedAt = Date.now()
    try {
      const fs = await loadFirestore()
      await fs.setDoc(fs.doc(fs.db, 'users', uid, 'sync', 'data'), data, { merge: true })
    } catch {}
  }, [uid])

  const pullFromFirestore = useCallback(async () => {
    if (!uid) return
    try {
      const fs = await loadFirestore()
      const snap = await fs.getDoc(fs.doc(fs.db, 'users', uid, 'sync', 'data'))
      if (!snap.exists()) return
      const remote = snap.data()
      applyRemoteData(remote)
    } catch {}
  }, [uid])

  useEffect(() => {
    if (!uid) return

    pullFromFirestore()

    // The subscribe is now asynchronous, so the cleanup below may run before it
    // lands. `cancelled` is what stops a listener being attached to a uid the
    // component has already moved off — without it, signing out and back in as
    // someone else would leave the previous account's document streaming into
    // this browser's localStorage.
    let cancelled = false
    loadFirestore().then((fs) => {
      if (cancelled) return
      unsubRef.current = fs.onSnapshot(
        fs.doc(fs.db, 'users', uid, 'sync', 'data'),
        (snap) => {
          if (!snap.exists() || suppressRef.current) return
          applyRemoteData(snap.data())
        },
        () => {}
      )
    }).catch(() => {})

    const onStorage = (e) => {
      if (!SYNC_KEYS.includes(e.key)) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        suppressRef.current = true
        pushToFirestore().finally(() => {
          setTimeout(() => { suppressRef.current = false }, 1000)
        })
      }, DEBOUNCE_MS)
    }

    window.addEventListener('storage', onStorage)

    const onLocalChange = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        suppressRef.current = true
        pushToFirestore().finally(() => {
          setTimeout(() => { suppressRef.current = false }, 1000)
        })
      }, DEBOUNCE_MS)
    }
    window.addEventListener('vs-local-change', onLocalChange)

    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('vs-local-change', onLocalChange)
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [uid, pushToFirestore, pullFromFirestore])

  return { pushToFirestore }
}

function applyRemoteData(remote) {
  SYNC_KEYS.forEach(key => {
    if (remote[key] !== undefined) {
      const val = typeof remote[key] === 'string' ? remote[key] : JSON.stringify(remote[key])
      localStorage.setItem(key, val)
    }
  })
  window.dispatchEvent(new Event('vs-sync-applied'))
}

export function notifyLocalChange() {
  window.dispatchEvent(new CustomEvent('vs-local-change'))
}
