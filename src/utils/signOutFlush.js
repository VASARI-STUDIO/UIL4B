import { flushAccountSync } from '../hooks/useFirestoreSync'
import { getSyncState } from './syncStatus'

// SEND WHAT IS PENDING BEFORE SIGNING OUT, AND SAY SO WHEN IT CANNOT BE SENT.
//
// After sign-out the rules refuse an account write, so pending changes have to
// go first. flushAccountSync never rejects: a failed send is reported through
// the sync store, and offline the write is held without settling. So the flush
// gets a limited wait, then the store is read for a failure.
//
// What "sign out anyway" does to unsent changes (src/utils/accountSync.js
// releaseCache and reconcile): this device keeps its copy, because the cache is
// released only once nothing is pending. The next sign-in here with the SAME
// account sends it. A DIFFERENT account signing in first replaces it.

/** How long a sign-out waits for pending changes to be sent. */
export const SIGN_OUT_FLUSH_WAIT_MS = 10000

/** The sentence both sign-out surfaces use when changes are still unsent. */
export const UNSENT_CHANGES_NOTE = 'Some recent changes haven’t reached your account yet. If you sign out now, they stay on this device and are sent the next time you sign in here with this account. Signing in with a different account first discards them.'

/**
 * Resolves 'sent' when nothing is left unsent, 'unsent' when the wait ran out
 * or the sync store reports a failure. Never rejects.
 * `flush` and `readState` are injectable so the rule can be tested without a
 * browser.
 */
export async function flushBeforeSignOut({ waitMs = SIGN_OUT_FLUSH_WAIT_MS, flush = flushAccountSync, readState = getSyncState } = {}) {
  let timer
  const held = new Promise((resolve) => { timer = setTimeout(resolve, waitMs, 'held') })
  try {
    const settled = await Promise.race([flush().then(() => 'done', () => 'failed'), held])
    return settled === 'done' && !readState().errors.length ? 'sent' : 'unsent'
  } finally {
    clearTimeout(timer)
  }
}
