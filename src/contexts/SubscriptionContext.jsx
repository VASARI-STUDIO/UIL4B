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

  const checkout = useCallback(async (interval = 'monthly') => {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ interval }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Checkout failed')
    window.location.href = data.url
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
      checkout, openPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
