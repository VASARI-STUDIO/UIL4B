import { useEffect, useRef } from 'react'
// URGENT access, not patient: every Firestore call below is behind a truthy
// `uid`, which only exists once auth has resolved to a signed-in user. See
// src/utils/firebaseAccess.js.
import { loadFirestore } from '../utils/firebaseAccess'
import { classifyError, syncFailureMessage, payloadBytes, DOC_BYTE_BUDGET } from '../utils/projectSync'
import { reportSyncFailure, reportSyncOk, getSyncState } from '../utils/syncStatus'
import { clearAtSignOut, takeDiscardRequest } from '../utils/signOutClear'
import { registerUnsentCheck, anyUnsent, forgetOrphanedUnsent } from '../utils/unsentTracker'
import {
  SYNC_DOCS, ACCOUNT_KEY_NAMES, LEGACY_STAMP_KEY, keySpec,
  readMeta, writeMeta, readLocal, detectLocalChanges, pendingKeys,
  reconcile, buildDoc, docsForKeys, applyToStorage, releaseCache, clearMirrors,
  sameValue, repairAfterSettle,
} from '../utils/accountSync'
import { announceApplied, RESET_EVENT } from '../utils/accountEvents'

/* ═════════════════════════════════════════════════════════════════════════════
   ACCOUNT-BOUND DATA — the wiring. The rules are in src/utils/accountSync.js;
   read its header first. This file decides WHEN: when to look for local
   changes, when to read the account, when to write it, and what the screen is
   told.

   How it works:

   · IT LOOKS INSTEAD OF WAITING TO BE TOLD. A one-second look at the account
     keys' stored strings, plus one on tab hide and on the cross-tab `storage`
     event, so a same-tab change reaches the account without every writer
     having to announce it.
   · THE LOOK RUNS SIGNED OUT TOO, so a change made signed out carries the time
     it was made, and the next sign-in can weigh it honestly.
   · SIGN-IN READS BOTH DOCUMENTS, THEN LISTENS. The first read decides BIND /
     SYNC / SWITCH (the cache's owner against the signed-in uid) and migrates
     signed-out work up; later snapshots are per-key newer-wins.
   · SIGN-OUT RELEASES THE CACHE — unless something has not reached the account
     yet, in which case nothing is deleted (it cannot be sent after sign-out).
   · Silent success is worse than a visible failure. Every read and write reports into utils/syncStatus.
   ═════════════════════════════════════════════════════════════════════════════ */

const LOOK_MS = 1000
const PUSH_DEBOUNCE_MS = 1200
/** The channel this hook reports into. See src/utils/syncStatus.js. */
const SYNC_CHANNEL = 'preferences'

function storage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

function sessionStore() {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null } catch { return null }
}

// The one live pusher, so a sign-out button can send what is pending BEFORE it
// signs out (after, the rules refuse the write). Module scope because the hook
// is mounted once, in App.
let activeFlush = null

// Other holders of account data that sync on their own (the saved projects)
// register a sender here, so the same flush covers them. Sign-out clears the
// saved projects from this browser once nothing is reported unsent, so they
// have to be sent first.
const extraFlushes = new Set()

// Holders of account data that sync on their own also say whether they still
// hold something the account has not received (the saved projects: an edit
// waiting for its delayed push, or a push that has not been answered).
export { registerUnsentCheck, anyUnsent }

/** Add a sender to flushAccountSync(). Returns the function that removes it. */
export function registerAccountFlush(send) {
  extraFlushes.add(send)
  return () => { extraFlushes.delete(send) }
}

/**
 * Send every pending account change now. Resolves when the write settles, or
 * immediately when nobody is signed in. Never rejects: a failure is reported
 * through syncStatus like every other.
 *
 * Call it before `logout()` and before switching accounts: Settings and the
 * header's account switcher and sign-out rows do.
 */
export function flushAccountSync() {
  const senders = [activeFlush, ...extraFlushes].filter(Boolean)
  return Promise.all(senders.map((send) => Promise.resolve().then(send).catch(() => {}))).then(() => {})
}

/** Kept for any caller of the old API: a local change, announced. */
export function notifyLocalChange() {
  try { window.dispatchEvent(new CustomEvent('vs-local-change')) } catch { /* nothing listening */ }
}

function migrateLegacyClock(ls) {
  // The old single device clock described no owner and no key, so there is
  // nothing in it to carry over: this device binds on its next sign-in, which
  // takes the account's settings and migrates up only what the account lacks.
  try { ls?.removeItem(LEGACY_STAMP_KEY) } catch { /* nothing to remove */ }
}

export function useFirestoreSync(uid) {
  const uidRef = useRef(uid)
  const prevUidRef = useRef(null)
  const pushTimerRef = useRef(null)
  const pushRef = useRef(null)
  const pullRef = useRef(null)

  useEffect(() => { uidRef.current = uid }, [uid])

  // ── THE LOOK. Always on, signed in or out. ─────────────────────────────────
  useEffect(() => {
    const ls = storage()
    if (!ls) return undefined
    migrateLegacyClock(ls)

    const look = () => {
      const meta = readMeta(ls)
      const changed = detectLocalChanges(ls, meta)
      if (!changed.length) return
      writeMeta(ls, meta)
      if (uidRef.current) {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
        pushTimerRef.current = setTimeout(() => { pushRef.current?.() }, PUSH_DEBOUNCE_MS)
      }
    }
    look()
    const timer = setInterval(look, LOOK_MS)
    const onStorage = (e) => { if (!e.key || ACCOUNT_KEY_NAMES.includes(e.key)) look() }
    const onHide = () => {
      look()
      // A tab being put away is the last chance to send what is pending.
      if (document.visibilityState === 'hidden' && uidRef.current) pushRef.current?.()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('vs-local-change', look)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      clearInterval(timer)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('vs-local-change', look)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  // ── THE ACCOUNT. Per signed-in uid. ────────────────────────────────────────
  useEffect(() => {
    const ls = storage()
    const prev = prevUidRef.current
    prevUidRef.current = uid

    if (!uid) {
      activeFlush = null
      // Only a sign-out SEEN in this session releases the cache. A page that
      // loads signed out passes through here with no previous uid and touches
      // nothing.
      if (prev && ls) {
        const meta = readMeta(ls)
        // The person's own answer to "changes haven't reached your account":
        // discard them (see utils/signOutClear.js).
        const discard = takeDiscardRequest()
        // Read once, before anything is cleared. Registered holders keep their
        // answer after the account is gone; one that unmounted left it behind.
        const holdersUnsent = anyUnsent()
        forgetOrphanedUnsent()
        const out = releaseCache(ls, meta, { discard })
        writeMeta(ls, meta)
        if (out.released) announceApplied(out.keys)
        else console.warn('[sync] kept this device\'s copy at sign-out: changes had not reached the account', pendingKeys(meta))
        // The rest of what the person left here: cached profile, remembered
        // accounts, saved projects and per-visit keys. Saved work goes only
        // when the account holds it (or they chose to discard); a standing
        // sync failure, or a project edit not yet sent, means something may
        // not have reached the account.
        const cleared = clearAtSignOut({
          local: ls,
          session: sessionStore(),
          uid: prev,
          workIsSafeToLose: discard || (out.released && !holdersUnsent && getSyncState().errors.length === 0),
        })
        announceApplied(cleared)
      }
      return undefined
    }
    forgetOrphanedUnsent()
    if (!ls) return undefined

    let cancelled = false
    const unsubs = []

    // Decide and apply, for whichever documents were just read.
    const settle = (remote) => {
      const meta = readMeta(ls)
      detectLocalChanges(ls, meta) // stamp anything changed since the last look
      const before = readLocal(ls)
      const result = reconcile({ uid, meta, local: before, remote })
      if (result.mode === 'switch') {
        clearMirrors(ls)
        meta.pushed = {}
      }
      meta.owner = result.owner
      meta.stamps = result.stamps
      const written = applyToStorage(ls, meta, result.apply)
      // What the account now holds and this device agrees with is, by
      // definition, not pending.
      const after = readLocal(ls)
      for (const key of ACCOUNT_KEY_NAMES) {
        const doc = keySpec(key).doc
        if (!Object.hasOwn(remote, doc)) continue
        const r = remote[doc] ? remote[doc][key] : undefined
        if (sameValue(after[key], r)) meta.pushed[key] = meta.stamps[key] || 0
      }
      writeMeta(ls, meta)
      if (written.length) announceApplied(written)
      if (result.mode === 'switch') announceApplied(['vs-onboarded'])
      if (result.push) pushRef.current?.()
      // The prompt library and its saved ids merge separately; once the data
      // document has been applied, add any copy a saved id is missing.
      repairAfterSettle(remote, ls, {
        uid,
        isCurrent: () => !cancelled && uidRef.current === uid,
        announce: announceApplied,
      })
    }

    const docRef = (fs, id) => fs.doc(fs.db, 'users', uid, 'sync', id)

    const push = async () => {
      if (cancelled || uidRef.current !== uid) return
      const meta = readMeta(ls)
      if (meta.owner !== uid) return // not bound to this account yet: the pull decides first
      detectLocalChanges(ls, meta)
      writeMeta(ls, meta)
      const pending = pendingKeys(meta)
      if (!pending.length) return
      const local = readLocal(ls)
      const stampsAtBuild = { ...meta.stamps }
      try {
        const fs = await loadFirestore()
        for (const id of docsForKeys(pending)) {
          const payload = buildDoc(id, local, stampsAtBuild)
          const bytes = payloadBytes(payload)
          if (bytes > DOC_BYTE_BUDGET) {
            reportSyncFailure(SYNC_CHANNEL, syncFailureMessage('too-large', `${Math.round(bytes / 1024)} KB of a 1 MB limit`), () => pushRef.current?.())
            return
          }
          await fs.setDoc(docRef(fs, id), payload, { merge: true })
          const now = readMeta(ls)
          for (const key of ACCOUNT_KEY_NAMES) {
            if (keySpec(key).doc === id) now.pushed[key] = stampsAtBuild[key] || 0
          }
          writeMeta(ls, now)
        }
        reportSyncOk(SYNC_CHANNEL)
      } catch (error) {
        reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)), () => pushRef.current?.())
      }
    }
    pushRef.current = push
    activeFlush = push

    const pull = async () => {
      try {
        const fs = await loadFirestore()
        if (cancelled) return
        const snaps = await Promise.all(SYNC_DOCS.map((id) => fs.getDoc(docRef(fs, id))))
        if (cancelled) return
        const remote = {}
        SYNC_DOCS.forEach((id, i) => { remote[id] = snaps[i].exists() ? snaps[i].data() : null })
        settle(remote)
        reportSyncOk(SYNC_CHANNEL)

        // Then listen. A snapshot of our own write is a no-op: the values agree.
        for (const id of SYNC_DOCS) {
          if (cancelled) return
          unsubs.push(fs.onSnapshot(
            docRef(fs, id),
            (snap) => { if (!cancelled) settle({ [id]: snap.exists() ? snap.data() : null }) },
            (error) => reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)), () => pullRef.current?.()),
          ))
        }
      } catch (error) {
        reportSyncFailure(SYNC_CHANNEL, syncFailureMessage(classifyError(error)), () => pullRef.current?.())
      }
    }
    pullRef.current = () => {
      unsubs.splice(0).forEach((u) => u())
      return pull()
    }
    pull()

    // Settings → Clear local data wiped the cache; read the account again.
    const onReset = () => { pullRef.current?.() }
    window.addEventListener(RESET_EVENT, onReset)

    return () => {
      cancelled = true
      window.removeEventListener(RESET_EVENT, onReset)
      unsubs.splice(0).forEach((u) => u())
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      if (activeFlush === push) activeFlush = null
    }
  }, [uid])

  return { pushToFirestore: () => pushRef.current?.() }
}
