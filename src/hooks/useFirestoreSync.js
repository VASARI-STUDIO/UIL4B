import { useEffect, useRef, useCallback } from 'react'
// URGENT access, not patient: every code path below is already behind a
// truthy `uid`, which only exists once auth has resolved to a signed-in user.
// By then the deferred chunk is either loaded or in flight, so this awaits an
// already-settled promise in the common case — and if it is the first Firestore
// touch of the session, the person whose data is syncing is exactly who should
// open the gate rather than wait behind it. See src/utils/firebaseAccess.js.
import { loadFirestore } from '../utils/firebaseAccess'
import { classifyError, syncFailureMessage, shouldApplyRemote } from '../utils/projectSync'
import { reportSyncFailure, reportSyncOk } from '../utils/syncStatus'

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

/* ═════════════════════════════════════════════════════════════════════════════
   WHY THIS HOOK KEEPS A CLOCK
   ═════════════════════════════════════════════════════════════════════════════
   `firestore-sync-last-writer-wins` (2026-09-06 review). applyRemoteData used to
   write every synced key straight into localStorage without ever reading
   `remote._updatedAt`, while pushToFirestore wrote that field on every push. The
   sequence the review read off the code, and it loses an edit at both ends:

     1. Device B edits vs-current-design. Its 2 s debounce starts.
     2. Inside that window, device A's older push arrives as a snapshot. B is
        not suppressed — suppressRef only covers B's OWN push — so A's data
        overwrites B's localStorage.
     3. B's debounce fires. getLocalData() reads the value A just wrote and
        pushes A's data back up as if it were B's.

   B's edit is now gone from the device AND from the account. Nothing anywhere
   noticed.

   THE FIX IS A LOCAL CLOCK, not a bigger suppression window. `localStampRef` is
   the moment this device last had a change of its own, and it is set the instant
   the change is announced — not when the debounce fires — because step 2 happens
   inside the debounce and a stamp written at push time would still be behind A's.
   A remote snapshot older than that stamp is REFUSED and said so; the newer side
   is always the one kept.

   WHAT THE USER SEES ON A REFUSAL: nothing, and that is correct. A refusal means
   the newer copy — theirs, on this screen — was kept and the older one discarded.
   There is no loss to report and no action to offer. It is logged, and the
   `vs-sync-refused` event carries both timestamps for anyone debugging it. The
   conflicts a user IS told about are the ones where the screen changed under
   them, and those are projects, reported by ProjectContext through the same
   utils/syncStatus store this hook reports its failures into.
   ═════════════════════════════════════════════════════════════════════════════ */

/** Where this device records the moment it last changed something itself. */
const STAMP_KEY = 'vs-sync-updatedAt'

/** The channel this hook reports into. See src/utils/syncStatus.js. */
const SYNC_CHANNEL = 'preferences'

function readStamp() {
  try {
    const n = Number(localStorage.getItem(STAMP_KEY))
    return Number.isFinite(n) ? n : 0
  } catch { return 0 }
}

function writeStamp(value) {
  try { localStorage.setItem(STAMP_KEY, String(value)) } catch { /* quota */ }
}

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
  const localStampRef = useRef(0)

  const pushToFirestore = useCallback(async () => {
    if (!uid) return
    const data = getLocalData()
    // The stamp that goes UP is the moment of the local change, not the moment
    // of the push. Stamping at push time would put this device's edit two
    // seconds into the future of itself and let a racing device's later pull
    // draw the wrong conclusion.
    data._updatedAt = localStampRef.current || Date.now()
    try {
      const fs = await loadFirestore()
      await fs.setDoc(fs.doc(fs.db, 'users', uid, 'sync', 'data'), data, { merge: true })
      writeStamp(data._updatedAt)
      reportSyncOk(SYNC_CHANNEL)
    } catch (error) {
      // WAS `catch {}`. A permission-denied on the sync document was
      // indistinguishable from an empty one, which is exactly how a settings
      // sync can be dead for weeks with nobody able to tell.
      reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)))
    }
  }, [uid])

  const applyRemoteData = useCallback((remote) => {
    if (!remote) return false
    const verdict = shouldApplyRemote(remote._updatedAt, localStampRef.current)
    if (!verdict.apply) {
      // THE REFUSAL, LOGGED. The review's instruction was "compare _updatedAt
      // before applying, keep the newer side, and log the refusal" — a silent
      // refusal is a smaller bug than a silent overwrite but it is the same
      // shape, and this one has to be debuggable from a user's console.
      console.warn('[sync] refused an older remote snapshot', {
        remote: Number(remote._updatedAt) || 0,
        local: localStampRef.current,
      })
      try {
        window.dispatchEvent(new CustomEvent('vs-sync-refused', {
          detail: { remote: Number(remote._updatedAt) || 0, local: localStampRef.current },
        }))
      } catch { /* a page without CustomEvent is not a page we can help */ }
      return false
    }
    SYNC_KEYS.forEach(key => {
      if (remote[key] !== undefined) {
        const val = typeof remote[key] === 'string' ? remote[key] : JSON.stringify(remote[key])
        localStorage.setItem(key, val)
      }
    })
    const applied = Number(remote._updatedAt) || 0
    if (applied > localStampRef.current) {
      localStampRef.current = applied
      writeStamp(applied)
    }
    window.dispatchEvent(new Event('vs-sync-applied'))
    return true
  }, [])

  const pullFromFirestore = useCallback(async () => {
    if (!uid) return
    try {
      const fs = await loadFirestore()
      const snap = await fs.getDoc(fs.doc(fs.db, 'users', uid, 'sync', 'data'))
      if (!snap.exists()) { reportSyncOk(SYNC_CHANNEL); return }
      applyRemoteData(snap.data())
      reportSyncOk(SYNC_CHANNEL)
    } catch (error) {
      reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)))
    }
  }, [uid, applyRemoteData])

  useEffect(() => {
    if (!uid) return

    localStampRef.current = readStamp()
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
        (error) => {
          reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)))
        },
      )
    }).catch((error) => {
      reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)))
    })

    // A local change stamps the clock NOW. See the block comment above: the
    // stamp has to beat the incoming snapshot, and the incoming snapshot
    // arrives during the debounce.
    const markLocalChange = () => {
      localStampRef.current = Date.now()
      writeStamp(localStampRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        suppressRef.current = true
        pushToFirestore().finally(() => {
          setTimeout(() => { suppressRef.current = false }, 1000)
        })
      }, DEBOUNCE_MS)
    }

    const onStorage = (e) => {
      if (!SYNC_KEYS.includes(e.key)) return
      markLocalChange()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('vs-local-change', markLocalChange)

    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('vs-local-change', markLocalChange)
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [uid, pushToFirestore, pullFromFirestore, applyRemoteData])

  return { pushToFirestore }
}

export function notifyLocalChange() {
  window.dispatchEvent(new CustomEvent('vs-local-change'))
}
