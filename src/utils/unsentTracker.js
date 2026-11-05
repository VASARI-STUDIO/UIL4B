// WHICH SAVED PROJECTS HAVE NOT REACHED THE ACCOUNT.
//
// The account-sync keys know what is pending (accountSync.pendingKeys). The
// saved projects sync on their own, with a delay after each edit, so nothing
// else says "this edit has not been sent". Sign-out clears the saved projects
// from the browser once everything has reached the account, so it needs that
// answer, and a push that was started but never answered must not count as
// sent.
//
// An edit marks the tracker. A push takes a ticket when it STARTS and clears
// the mark only if it succeeded and nothing was edited since: an edit made
// while a push is in flight is not in what that push sent.
//
// DOM-free so every rule is unit-testable.

export function createUnsentTracker() {
  let unsent = false
  let edits = 0
  return {
    /** A local edit that still has to be sent. */
    markChanged() { unsent = true; edits += 1 },
    /** Call as a push starts; hand the result to finish(). */
    begin() { return edits },
    /** The push ended. Only a success that saw no later edit clears the mark. */
    finish(ticket, ok) { if (ok && ticket === edits) unsent = false },
    /**
     * A new sign-in starts from nothing marked. Pushes still running from
     * before cannot clear anything that is marked afterwards.
     */
    reset() { unsent = false; edits += 1 },
    isUnsent() { return unsent },
  }
}

// ── The registry sign-out reads ─────────────────────────────────────────────

const checks = new Set()
// A holder that goes away while it still has unsent work leaves this behind, so
// the answer does not depend on the holder still being mounted at sign-out.
let orphaned = false

/** Register `() => boolean`. Returns the function that removes it. */
export function registerUnsentCheck(check) {
  checks.add(check)
  return () => {
    checks.delete(check)
    try { if (check()) orphaned = true } catch { /* a broken check says nothing */ }
  }
}

/** True when any registered holder (or one that left) has unsent work. */
export function anyUnsent() {
  if (orphaned) return true
  for (const check of checks) {
    try { if (check()) return true } catch { /* ignore */ }
  }
  return false
}

/** Forget what departed holders left behind (a new sign-in, or a finished sign-out). */
export function forgetOrphanedUnsent() { orphaned = false }
