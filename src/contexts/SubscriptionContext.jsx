import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { auth as firebaseAuth } from '../utils/firebase'
import { ADMIN_EMAILS } from '../utils/constants'

const SubscriptionContext = createContext()

// Maps the region subtag of the browser locale to a supported Stripe currency
// so checkout shows each visitor their local pricing. Unknown regions fall
// through to Stripe's default (USD).
const REGION_CURRENCY = {
  AU: 'aud', NZ: 'nzd', GB: 'gbp', US: 'usd', CA: 'cad', SG: 'sgd', CH: 'chf',
  IE: 'eur', DE: 'eur', FR: 'eur', ES: 'eur', IT: 'eur', NL: 'eur', AT: 'eur',
  BE: 'eur', FI: 'eur', PT: 'eur', GR: 'eur', LU: 'eur', EE: 'eur', SK: 'eur',
  SI: 'eur', LV: 'eur', LT: 'eur', CY: 'eur', MT: 'eur',
}

function detectCurrency() {
  try {
    const region = (navigator.language || '').split('-')[1]?.toUpperCase()
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region]
  } catch { /* ignore */ }
  return null
}

// Free-tier save allowance — the single source of truth for BOTH enforcement
// (ProjectContext, IconLibrary) and the pricing copy (Plans.jsx). Saving is no
// longer fully Pro-gated: a free account gets a real allowance, and Pro lifts
// the cap. Change the numbers here and every surface follows.
export const FREE_SAVE_LIMITS = { projects: 3, customIcons: 8 }

const FREE_PLAN = {
  id: 'free', label: 'Free',
  limits: {
    'alt-text': 40, 'prompts-ai': 40, 'ai-default': 40,
    projects: FREE_SAVE_LIMITS.projects, 'custom-icons': FREE_SAVE_LIMITS.customIcons,
  },
}
const PRO_PLAN = {
  id: 'pro', label: 'Pro',
  limits: {
    'alt-text': 1000, 'prompts-ai': 1000, 'ai-default': 1000,
    projects: Infinity, 'custom-icons': Infinity,
  },
}

function planForSubscription(sub) {
  if (!sub) return FREE_PLAN
  const active = sub.status === 'active' || sub.status === 'trialing'
  if (!active) return FREE_PLAN
  if (sub.currentPeriodEnd && Date.now() > sub.currentPeriodEnd + 86_400_000) return FREE_PLAN
  return PRO_PLAN
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null)
      setLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data()
      setSubscription(data?.subscription || null)
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
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const plan = isAdmin ? PRO_PLAN : planForSubscription(subscription)
  const isPro = plan.id === 'pro'

  // Sends the user to our own embedded checkout page (/checkout) instead of a
  // Stripe-hosted page, so the flow keeps the site's branding and chrome.
  const checkout = useCallback(async (interval = 'monthly') => {
    const plan = interval === 'yearly' ? 'yearly' : 'monthly'
    window.location.href = `/checkout?plan=${plan}`
  }, [])

  // Creates an embedded Checkout session and returns its client_secret, used by
  // the /checkout page to mount Stripe's <EmbeddedCheckout />.
  const createCheckoutSession = useCallback(async (interval = 'monthly') => {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ interval, currency: detectCurrency() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Checkout failed (server returned ${res.status})`)
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
    if (!res.ok) throw new Error(data.error || `Could not verify checkout (server returned ${res.status})`)
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
    if (!res.ok) throw new Error(data.error || `Portal failed (server returned ${res.status})`)
    window.location.href = data.url
  }, [])

  return (
    <SubscriptionContext.Provider value={{
      subscription, plan, isPro, isAdmin, loading,
      checkout, createCheckoutSession, getCheckoutStatus, openPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
