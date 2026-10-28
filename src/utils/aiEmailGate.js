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
 * The Resend button's label. After a send it reads "Sent" with the seconds left
 * on the cooldown, then goes back to offering another link.
 */
export function resendLabel(state, secondsLeft) {
  if (state === 'sending') return 'Sending…'
  if (state === 'sent' && secondsLeft > 0) return `Sent · ${secondsLeft}s`
  return 'Resend link'
}
