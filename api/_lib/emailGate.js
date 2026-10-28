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
// would lock out someone who has paid for the capacity. The exemption is for an
// ACTIVE subscription and for a lifetime entitlement only. A trial can be
// started with a throwaway address and past_due is a grace window for a payment
// that failed, so neither is paid capacity: both resolve to the Pro plan but
// still have to verify.

import { hasLifetimeEntitlement, planForSubscription } from './plans.js'

// Matched by the client in src/utils/aiEmailGate.js; keep the two in step.
export const EMAIL_UNVERIFIED_CODE = 'email-unverified'

export const EMAIL_UNVERIFIED_BODY = Object.freeze({
  error: 'Verify your email to use AI tools.',
  code: EMAIL_UNVERIFIED_CODE,
})

/**
 * Does this account hold paid capacity that was actually paid for? True for a
 * lifetime entitlement, and for a subscription that is `active` and still inside
 * its period. `trialing`, `past_due` and anything lapsed or revoked are not.
 */
export function holdsPaidAccess({ subscription, lifetimeEntitlement } = {}) {
  if (hasLifetimeEntitlement(lifetimeEntitlement)) return true
  return subscription?.status === 'active' && planForSubscription(subscription).id === 'pro'
}

/**
 * The 403 body for a request that may not use the paid tasks, or null when it
 * may. `emailVerified` is the raw `email_verified` claim from the verified ID
 * token; only a literal `true` counts. `subscription` and `lifetimeEntitlement`
 * are the account document's fields as stored; anything missing fails closed.
 */
export function emailGateBody({ emailVerified, subscription, lifetimeEntitlement } = {}) {
  if (emailVerified === true) return null
  if (holdsPaidAccess({ subscription, lifetimeEntitlement })) return null
  return { ...EMAIL_UNVERIFIED_BODY }
}
