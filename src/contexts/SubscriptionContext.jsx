import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { auth as firebaseAuth } from '../utils/firebase'

const SubscriptionContext = createContext()

const FREE_PLAN = { id: 'free', label: 'Free', limits: { 'alt-text': 40, 'prompts-ai': 40, 'ai-default': 40 } }
const PRO_PLAN = { id: 'pro', label: 'Pro', limits: { 'alt-text': 1000, 'prompts-ai': 1000, 'ai-default': 1000 } }

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

  const plan = planForSubscription(subscription)
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
      body: JSON.stringify({ interval }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Checkout failed')
    return data.clientSecret
  }, [])

  // Reads the result of a completed embedded checkout (used by /checkout/return).
  const getCheckoutStatus = useCallback(async (sessionId) => {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not verify checkout')
    return data
  }, [])

  const openPortal = useCallback(async () => {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/create-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Portal failed')
    window.location.href = data.url
  }, [])

  return (
    <SubscriptionContext.Provider value={{
      subscription, plan, isPro, loading,
      checkout, createCheckoutSession, getCheckoutStatus, openPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
