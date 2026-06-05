import { useEffect, useRef, useCallback } from 'react'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'

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
      await setDoc(doc(db, 'users', uid, 'sync', 'data'), data, { merge: true })
    } catch {}
  }, [uid])

  const pullFromFirestore = useCallback(async () => {
    if (!uid) return
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'sync', 'data'))
      if (!snap.exists()) return
      const remote = snap.data()
      applyRemoteData(remote)
    } catch {}
  }, [uid])

  useEffect(() => {
    if (!uid) return

    pullFromFirestore()

    unsubRef.current = onSnapshot(
      doc(db, 'users', uid, 'sync', 'data'),
      (snap) => {
        if (!snap.exists() || suppressRef.current) return
        applyRemoteData(snap.data())
      },
      () => {}
    )

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
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('vs-local-change', onLocalChange)
      if (unsubRef.current) unsubRef.current()
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
