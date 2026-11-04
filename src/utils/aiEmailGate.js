// What the AI tools do when /api/ai refuses an unverified email.
//
// The server answers 403 with { code: 'email-unverified' } for free use of any
// paid task (api/_lib/emailGate.js). The tools show VerifyEmailPrompt for it
// instead of a toast, because the refusal cannot be retried until the person
// acts. Everything that decides what is shown lives here, DOM-free.

// Matches EMAIL_UNVERIFIED_CODE in api/_lib/emailGate.js.
export const EMAIL_UNVERIFIED_CODE = 'email-unverified'

/** True for the one reply that means "verify your email", and for nothing else. */
export function isEmailUnverifiedReply(status, body) {
  return status === 403 && body?.code === EMAIL_UNVERIFIED_CODE
}

export const VERIFY_PROMPT_TITLE = 'Verify your email to use AI tools.'

/** The sentence after the title. Without an address it still reads whole. */
export function verifyPromptSent(email) {
  return email ? `We sent a link to ${email}.` : 'We sent a link to your email.'
}

// Shown under the buttons after "I've verified" finds the account unchanged.
export const VERIFY_NOT_YET = "We can't see it verified yet. Open the link in the email, then try again."
export const VERIFY_CHECK_FAILED = "We couldn't check just now. Try again."

/**
 * What "I've verified" does with the re-read of the account.
 * `verified` is the value refreshEmailVerified resolves: true, false, or null
 * when the account changed mid-read. Only true retries the request.
 */
export function verifyCheckOutcome(verified) {
  if (verified === true) return { retry: true, message: '' }
  if (verified === false) return { retry: false, message: VERIFY_NOT_YET }
  return { retry: false, message: '' }
}

/**
 * "I've verified" end to end, given `refresh` (AuthContext's refreshEmailVerified).
 * A refresh that rejects is a failed check, not a verified account: it says so
 * and does not retry, because the token in hand may still carry the old claim.
 */
export async function checkVerified(refresh) {
  try {
    return verifyCheckOutcome(await refresh())
  } catch {
    return { retry: false, message: VERIFY_CHECK_FAILED }
  }
}

// Shown under the buttons after a Resend. The sentence above already names the
// address, so this does not repeat it.
export const VERIFY_RESENT = 'New link sent.'

/** The status line under the buttons: a check's answer wins over a send's. */
export function verifyPromptNote({ checkNote, sendState }) {
  return checkNote || (sendState === 'sent' ? VERIFY_RESENT : '')
}

/**
 * Did the address become verified while the prompt was open? True only for the
 * same signed-in account going from owing verification to not owing it. A
 * prompt that opens on an account that does not owe it (it cannot be helped by
 * verifying) never answers yes, and signing out is not a verification.
 */
export function verifiedWhileOpen({ wasOwed, owed, openedFor, uid }) {
  return wasOwed === true && owed === false && !!uid && uid === openedFor
}

/**
 * The prompt is about to leave the page: put keyboard focus somewhere that
 * stays, so it does not drop to <body>. `pick` may name a better target (the
 * tool's own Generate button); the page's <main> is the fallback. Focus moves
 * only when it is inside the prompt (`root`) or already on <body>: an
 * auto-continue after verifying in another tab must not pull the caret out of
 * the field the person is typing in. The page does not scroll. Returns the
 * element focused, or null.
 */
export function focusAfterVerified(doc, pick, root) {
  const active = doc?.activeElement
  const inPrompt = !active || active === doc?.body || (root && root.contains?.(active))
  if (!inPrompt) return null
  const target = pick?.() || doc?.getElementById?.('main') || null
  target?.focus?.({ preventScroll: true })
  return target
}

/**
 * Starting a generation in the AltText tool clears any earlier refusal. `retry`
 * is what to repeat if this run is refused too: null for one card (recorded at
 * the refusal), `{ id: null, batch: true }` for the whole batch. Without this a
 * prompt left over from an earlier refusal stays up, and a stale retry target
 * is repeated after the person verifies.
 */
export function beginVerifyRun({ setNeeded, stop, retryRef }, retry) {
  setNeeded(false)
  stop.current = false
  retryRef.current = retry
}

/**
 * A run was refused for the unverified email: stop the batch, show the prompt,
 * and remember what to repeat. The first refusal in a run decides the target.
 */
export function refuseForVerify({ setNeeded, stop, retryRef }, itemId) {
  stop.current = true
  retryRef.current ??= { id: itemId, batch: false }
  setNeeded(true)
}

/** What to repeat once verified: the whole batch, one card, or nothing. */
export function verifyRetryTarget(retry, items) {
  if (retry?.batch) return { kind: 'batch' }
  const item = (items || []).find((it) => it.id === retry?.id)
  return item ? { kind: 'one', item } : { kind: 'none' }
}

/**
 * The Resend button's label. After a send it reads "Sent" with the seconds left
 * on the cooldown, then goes back to offering another link.
 */
export function resendLabel(state, secondsLeft) {
  if (state === 'sending') return 'Sending…'
  if (state === 'sent' && secondsLeft > 0) return `Sent · ${secondsLeft}s`
  return 'Resend link'
}
