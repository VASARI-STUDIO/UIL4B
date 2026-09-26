// The one signal every holder of account-bound state listens to.
//
// When the account's values are written into localStorage — at sign-in, when
// another device changes something, at sign-out when the cache is released —
// the providers that read those keys once at mount (theme, appearance,
// language, pinned tools, the working design) have to read them again, or the
// screen keeps showing the old value until a reload: a pull that worked
// perfectly would be invisible until the next refresh.
//
// Kept apart from src/hooks/useFirestoreSync.js so a context can listen without
// importing the Firestore access broker.

export const APPLIED_EVENT = 'vs-sync-applied'
/** Settings → Clear local data: the cache was wiped, fetch the account again. */
export const RESET_EVENT = 'vs-sync-reset'

export function announceApplied(keys) {
  if (!keys || !keys.length) return
  try {
    window.dispatchEvent(new CustomEvent(APPLIED_EVENT, { detail: { keys: [...keys] } }))
  } catch { /* no window: nothing is listening */ }
}

/**
 * Call `onChange` whenever the account writes one of `keys` into storage.
 * Returns the unsubscribe. An event without a key list (an older dispatcher)
 * counts as "anything may have changed".
 */
export function onAccountApplied(keys, onChange) {
  if (typeof window === 'undefined') return () => {}
  const wanted = new Set(keys)
  const handler = (event) => {
    const changed = event?.detail?.keys
    if (!Array.isArray(changed) || changed.some((k) => wanted.has(k))) onChange(changed || null)
  }
  window.addEventListener(APPLIED_EVENT, handler)
  return () => window.removeEventListener(APPLIED_EVENT, handler)
}

export function requestAccountReset() {
  try { window.dispatchEvent(new CustomEvent(RESET_EVENT)) } catch { /* nothing listening */ }
}
