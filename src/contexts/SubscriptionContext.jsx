import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { auth as firebaseAuth } from '../utils/firebase'
import { isAdminEmail } from '../utils/constants'
import { detectCurrency } from '../utils/currency'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../config/plans'
import { billingAlert, isWithinPastDueGrace } from '../utils/billingState'

const SubscriptionContext = createContext()

const BILLING_INTERVALS = new Set(['monthly', 'yearly', 'lifetime'])

// The billing APIs return a generic message plus a correlation id (the real
// Stripe/Firebase error stays in the server log). Show the id so a user can
// quote it to support and the founder can find the exact log line.
function billingError(data, status, fallback) {
  const base = data?.error || `${fallback} (server returned ${status})`
  return new Error(data?.correlationId ? `${base} [ref ${data.correlationId}]` : base)
}

// Free-tier save allowance — the single source of truth for BOTH enforcement
// (ProjectContext, IconLibrary) and the pricing copy (Plans.jsx). Saving is no
// longer fully Pro-gated: a free account gets a real allowance, and Pro lifts
// the cap. Change the numbers here and every surface follows.
// Both tables live in src/config/plans.js — plain data, outside this file,
// because a constant exported alongside a component breaks fast refresh
// (react-refresh/only-export-components). Re-exported here so the many existing
// `from '../contexts/SubscriptionContext'` imports keep working.
export { AI_LIMITS, FREE_SAVE_LIMITS } from '../config/plans'

const FREE_PLAN = {
  id: 'free', label: 'Free',
  limits: {
    'alt-text': AI_LIMITS.free.daily, 'prompts-ai': AI_LIMITS.free.daily, 'ai-default': AI_LIMITS.free.daily,
    projects: FREE_SAVE_LIMITS.projects, 'custom-icons': FREE_SAVE_LIMITS.customIcons,
  },
  monthlyLimits: {
    'alt-text': AI_LIMITS.free.monthly, 'prompts-ai': AI_LIMITS.free.monthly, 'ai-default': AI_LIMITS.free.monthly,
  },
}
const PRO_PLAN = {
  id: 'pro', label: 'Pro',
  limits: {
    'alt-text': AI_LIMITS.pro.daily, 'prompts-ai': AI_LIMITS.pro.daily, 'ai-default': AI_LIMITS.pro.daily,
    projects: Infinity, 'custom-icons': Infinity,
  },
  monthlyLimits: {
    'alt-text': AI_LIMITS.pro.monthly, 'prompts-ai': AI_LIMITS.pro.monthly, 'ai-default': AI_LIMITS.pro.monthly,
  },
}

// Mirrors api/_lib/plans.js planForSubscription. The server is the only one
// that actually grants anything; this exists so the UI doesn't have to wait for
// a round trip to know what to show. Both honour the same seven-day grace on a
// failing payment — see src/utils/billingState.js for why the window is
// anchored on paymentFailedAt rather than on currentPeriodEnd.
function planForSubscription(sub, lifetimeEntitlement) {
  if (lifetimeEntitlement?.active === true && !lifetimeEntitlement.revokedAt) return PRO_PLAN
  if (!sub) return FREE_PLAN
  // Refunded or charged back. A sticky flag rather than a status, because
  // `status` is overwritten from Stripe on every subscription event — see the
  // note on subscriptionAccessRevoked in api/_lib/plans.js. Checked before the
  // past-due grace: that window is for a payment being RETRIED, not a reversed
  // one. The server is what actually enforces this; the mirror is here so the
  // UI does not spend a round trip showing Pro to someone who no longer has it.
  if (sub.accessRevoked === true) return FREE_PLAN
  const active = sub.status === 'active' || sub.status === 'trialing'
  if (active) {
    if (sub.currentPeriodEnd && Date.now() > sub.currentPeriodEnd + 86_400_000) return FREE_PLAN
    return PRO_PLAN
  }
  if (isWithinPastDueGrace(sub)) return PRO_PLAN
  return FREE_PLAN
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [lifetimeEntitlement, setLifetimeEntitlement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null)
      setLifetimeEntitlement(null)
      setLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data()
      setSubscription(data?.subscription || null)
      setLifetimeEntitlement(data?.lifetimeEntitlement || null)
      setLoading(false)
    }, () => {
      setLoading(false)
    })

    return unsub
  }, [user?.uid])

  // Founder/admin accounts get Pro entitlements without a Stripe subscription.
  // This mirrors the server-side gate in api/_lib/plans.js (planForUser): the
  // email here comes from Firebase Auth, and every paid API call re-verifies
  // it server-side from the ID token — flipping this flag in devtools unlocks
  // nothing that the server doesn't independently grant.
  const isAdmin = isAdminEmail(user?.email)
  const plan = isAdmin ? PRO_PLAN : planForSubscription(subscription, lifetimeEntitlement)
  const isPro = plan.id === 'pro'

  // The billing state worth interrupting someone about — failing payment, trial
  // about to end, cancellation scheduled. Everything it reads is written by
  // api/stripe-webhook.js and, until now, read by nothing.
  //
  // Admins are excluded: their Pro comes from the email allowlist, so a stale
  // subscription doc on a founder account must not raise a payment banner about
  // access they were never going to lose.
  const alert = useMemo(
    () => (isAdmin ? null : billingAlert(subscription)),
    [isAdmin, subscription],
  )

  // Sends the user to our own embedded checkout page (/checkout) instead of a
  // Stripe-hosted page, so the flow keeps the site's branding and chrome.
  const checkout = useCallback(async (interval = 'monthly') => {
    if (!BILLING_INTERVALS.has(interval)) throw new Error('Invalid billing interval')
    window.location.href = `/checkout?plan=${interval}`
  }, [])

  // Creates an embedded Checkout session and returns its client_secret, used by
  // the /checkout page to mount Stripe's <EmbeddedCheckout />.
  const createCheckoutSession = useCallback(async (interval = 'monthly') => {
    if (!BILLING_INTERVALS.has(interval)) throw new Error('Invalid billing interval')
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ interval, currency: detectCurrency() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw billingError(data, res.status, 'Checkout failed')
    return data.clientSecret
  }, [])

  // Reads the result of a completed embedded checkout (used by /checkout/return).
  const getCheckoutStatus = useCallback(async (sessionId) => {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw billingError(data, res.status, 'Could not verify checkout')
    return data
  }, [])

  // opts.flow === 'cancel' deep-links into Stripe's portal cancellation flow,
  // where Stripe presents the configured retention coupon before cancelling.
  const openPortal = useCallback(async (opts = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/create-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ flow: opts.flow || null }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw billingError(data, res.status, 'Portal failed')
    window.location.href = data.url
  }, [])

  return (
    <SubscriptionContext.Provider value={{
      subscription, lifetimeEntitlement, plan, isPro, isAdmin, loading,
      billingAlert: alert,
      checkout, createCheckoutSession, getCheckoutStatus, openPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
