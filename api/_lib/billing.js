import { BILLING_INTERVALS, LOOKUP_KEYS } from './pricing.js'

export const LIFETIME_SKU = LOOKUP_KEYS.lifetime

export function parseBillingInterval(value) {
  return typeof value === 'string' && BILLING_INTERVALS.includes(value) ? value : null
}

export function isPaidLifetimeSession(session) {
  return !!session
    && session.mode === 'payment'
    && session.status === 'complete'
    && session.payment_status === 'paid'
    && session.metadata?.entitlementSku === LIFETIME_SKU
    && typeof session.metadata?.firebaseUid === 'string'
    && session.metadata.firebaseUid.length > 0
}

export function lifetimeEntitlementFromSession(session, grantedAt = Date.now()) {
  if (!isPaidLifetimeSession(session)) return null
  return {
    active: true,
    sku: LIFETIME_SKU,
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
    customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
    grantedAt,
    updatedAt: grantedAt,
    revokedAt: null,
    revokedReason: null,
  }
}
