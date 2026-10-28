import { useCallback, useSyncExternalStore } from 'react'
import { verifyResendStore } from '../utils/verifyResendStore'

// The shared "Resend link" state for `uid`: { state, prior, error, left,
// resend }. The reminder bar and the AI tools' verify prompt both use it, so a
// link sent from one shows its cooldown in the other.
export default function useVerifyResend(uid, send) {
  // Subscribing is what re-renders this component on every change; the values
  // are then read for `uid`, so another account's state is never shown.
  useSyncExternalStore(verifyResendStore.subscribe, verifyResendStore.getSnapshot)
  const mine = verifyResendStore.view(uid)
  const resend = useCallback(() => verifyResendStore.resend(uid, send), [uid, send])
  return { state: mine.state, prior: mine.prior, error: mine.error, left: mine.left, resend }
}
