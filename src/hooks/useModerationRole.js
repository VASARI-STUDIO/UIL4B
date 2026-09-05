import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { roleFromClaims } from '../utils/moderation'

// The signed-in person's moderation role, read from their ID token's claims.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG THIS EXISTS TO CLOSE
// ─────────────────────────────────────────────────────────────────────────────
// /api/verify-admin mints the `admin` custom claim and returns
// `claimUpdated: true` when it has just done so. NOTHING IN THE APP EVER READ
// THAT FIELD — before this hook, `claimUpdated` appeared in exactly one place
// in src/, and that place was nowhere.
//
// It matters because minting a claim server-side does not change the token the
// browser is already holding. `getIdToken()` returns the CACHED token until it
// expires, which is up to an hour — so the sequence that actually happened on a
// first sign-in was:
//
//   1. Admin.jsx mounts and reads Firestore. The token carries no `admin`
//      claim yet, so every gated read is refused.
//   2. In parallel, the verify-admin effect mints the claim and reports
//      `claimUpdated: true` into a variable nobody looks at.
//   3. The page goes on holding a token that still does not carry the claim,
//      and nothing re-reads anything.
//
// `getIdTokenResult(true)` is the finishing half: it forces a refresh, so the
// claim the server just minted is in the token before the next read.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS A HOOK AND NOT A CHANGE TO AuthContext
// ─────────────────────────────────────────────────────────────────────────────
// AuthContext.jsx is founder-gated by docs/reference/human-validation-zones.md
// and roles are a privilege-escalation surface, so it is exactly the file an
// agent must not quietly extend. It does not need to be: everything here reads
// `auth.currentUser` from utils/firebase directly, the same way Admin.jsx
// already does, so the role is available to any surface that wants it without a
// single line changing in the gated file.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE STATE IS ONE OBJECT KEYED BY uid
// ─────────────────────────────────────────────────────────────────────────────
// `resolved` carries the uid it was resolved FOR. Everything else is derived
// from comparing it with the current uid, which means (a) an account switch
// cannot leave the previous account's role on screen for a frame, and (b) no
// state is set synchronously inside the effect — the async body's first
// statement is an await — so this adds no react-hooks/set-state-in-effect
// warning to a lint baseline that is checked for regressions.
export function useModerationRole() {
  const { user, loading: authLoading } = useAuth()
  const [resolved, setResolved] = useState(null)
  const uid = user?.uid || null

  // Read the role out of the token. `force` spends a network round trip to get
  // a freshly minted claim; without it Firebase hands back the cached token.
  const read = useCallback(async (force = false) => {
    const { auth } = await import('../utils/firebase')
    const current = auth.currentUser
    if (!current) return { role: 'user', uid: null }
    const result = await current.getIdTokenResult(force)
    return { role: roleFromClaims(result?.claims), uid: current.uid }
  }, [])

  useEffect(() => {
    if (authLoading || !uid) return
    let cancelled = false

    ;(async () => {
      try {
        // Read what the current token already says FIRST. A returning moderator
        // whose claim is already minted gets a correct answer with no network
        // at all, and the surface renders on the first paint rather than after
        // a round trip.
        const cached = await read(false)
        if (cancelled) return
        setResolved({ uid, role: cached.role, error: '' })

        const { auth } = await import('../utils/firebase')
        const token = await auth.currentUser?.getIdToken()
        if (!token || cancelled) return

        // The handshake. This is the ONLY thing that mints a claim, and it
        // decides entirely from a server-verified email — nothing sent from
        // here influences the outcome.
        const res = await fetch('/api/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return

        // Force a refresh when the server says it changed something, and also
        // whenever the server's verdict is ahead of the token we just read. The
        // second condition is what rescues a session whose claim was minted on
        // some EARLIER visit that never refreshed: `claimUpdated` is false then,
        // because the claim already existed, and without this the stale token
        // would go on being believed until it expired on its own.
        const serverSaysPrivileged = data?.isAdmin === true || data?.moderator === true
        if (data?.claimUpdated === true || (serverSaysPrivileged && cached.role === 'user')) {
          const fresh = await read(true)
          if (cancelled) return
          setResolved({ uid, role: fresh.role, error: '' })
        }
      } catch (err) {
        if (cancelled) return
        // Offline, or the endpoint is unreachable. Recorded, not thrown: a
        // moderator holding a valid claim should not lose their queue because a
        // handshake they did not need failed. The role stays whatever the
        // cached token said, which is the honest answer — it just cannot be
        // improved on right now.
        setResolved((prev) => ({
          uid,
          role: prev?.uid === uid ? prev.role : 'user',
          error: err?.message || 'Could not confirm your role with the server.',
        }))
      }
    })()

    return () => { cancelled = true }
  }, [uid, authLoading, read])

  const current = resolved?.uid === uid ? resolved : null

  return {
    role: uid ? (current?.role || 'user') : 'user',
    // True until the role is a fact. A surface that renders "not a moderator"
    // while still checking accuses the person of not having access they may
    // well have, so callers need one flag that covers auth resolving AND the
    // token being read — combining two is how the order gets got wrong.
    loading: authLoading || (!!uid && !current),
    error: current?.error || '',
    signedIn: !!uid,
    /** Re-read the token from Firebase, forcing a refresh. */
    refresh: useCallback(async () => {
      const fresh = await read(true)
      setResolved({ uid, role: fresh.role, error: '' })
      return fresh.role
    }, [read, uid]),
  }
}
