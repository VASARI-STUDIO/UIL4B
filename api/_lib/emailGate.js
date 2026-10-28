// Free use of the paid AI tasks needs a verified email address.
//
// Every /api/ai task spends provider money and is metered per uid, so a
// throwaway email/password account would otherwise bring its own free allowance.
// Firebase marks `email_verified` true for Google sign-ins and for any account
// that has opened its verification link, so only unverified password accounts
// are held back.
//
// A paying account is not held back. Checkout does not require a verified
// address, so a subscriber can legitimately be unverified, and refusing them
// would lock out someone who has paid for the capacity. The check therefore
// applies to the plan the request resolves to, not to the account alone.

// Matched by the client in src/utils/aiEmailGate.js; keep the two in step.
export const EMAIL_UNVERIFIED_CODE = 'email-unverified'

export const EMAIL_UNVERIFIED_BODY = Object.freeze({
  error: 'Verify your email to use AI tools.',
  code: EMAIL_UNVERIFIED_CODE,
})

/**
 * The 403 body for a request that may not use the paid tasks, or null when it
 * may. `emailVerified` is the raw `email_verified` claim from the verified ID
 * token; only a literal `true` counts. `planId` is the id the request's plan
 * resolved to, and anything other than 'pro' is treated as free use.
 */
export function emailGateBody({ emailVerified, planId }) {
  if (emailVerified === true) return null
  if (planId === 'pro') return null
  return { ...EMAIL_UNVERIFIED_BODY }
}
