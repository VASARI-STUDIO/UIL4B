import { useCallback, useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { getStripe, hasStripeKey } from '../utils/stripeClient'
import { useProPrice } from '../hooks/usePrices'

const PLANS = {
  monthly: {
    interval: 'monthly',
    name: 'UIL4B Pro',
    cadence: 'Monthly',
    per: 'per month',
    trial: null,
  },
  yearly: {
    interval: 'yearly',
    name: 'UIL4B Pro',
    cadence: 'Yearly',
    per: 'per year',
    trial: '7-day free trial — you won\'t be charged today',
  },
}

const FEATURES = [
  '1,000 AI generations per day',
  'Higher-quality AI models',
  'Projects synced across devices',
  'Advanced design-system exports',
  'Priority support',
]

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function Checkout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { isPro, createCheckoutSession } = useSubscription()

  const planKey = params.get('plan') === 'monthly' ? 'monthly' : 'yearly'
  const plan = PLANS[planKey]
  const proPrice = useProPrice()
  const amount = planKey === 'yearly' ? proPrice.yearlyTotal : proPrice.monthly
  const note = planKey === 'yearly'
    ? `AUD · ${proPrice.yearlyPerMonth}/mo${proPrice.savingsPct > 0 ? ` · save ${proPrice.savingsPct}%` : ''}`
    : 'AUD · billed monthly · cancel anytime'
  const [error, setError] = useState('')

  const stripePromise = useMemo(() => getStripe(), [])

  const fetchClientSecret = useCallback(() => {
    return createCheckoutSession(plan.interval).catch(e => {
      setError(e?.message || 'Could not start checkout')
      throw e
    })
  }, [createCheckoutSession, plan.interval])

  // Send signed-out users to login, and already-Pro users back to settings.
  useEffect(() => {
    if (loading) return
    if (!user) navigate('/login', { state: { from: '/checkout' }, replace: true })
    else if (isPro) navigate('/settings', { replace: true })
  }, [user, loading, isPro, navigate])

  if (loading || !user || isPro) return null

  return (
    <div className="sec checkout-page">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Checkout</div>
        <h1>Upgrade to Pro</h1>
        <p>Complete your subscription securely. Your payment is processed by Stripe.</p>
      </div>

      <div className="checkout-grid">
        {/* Order summary */}
        <aside className="checkout-summary">
          <div className="card checkout-summary-card">
            <div className="checkout-plan-head">
              <div>
                <div className="checkout-plan-name">{plan.name}</div>
                <div className="checkout-plan-cadence">{plan.cadence} plan</div>
              </div>
              <div className="checkout-plan-price">
                <span className="checkout-plan-amount">{amount}</span>
                <span className="checkout-plan-per">{plan.per}</span>
              </div>
            </div>

            <div className="checkout-plan-note">{note}</div>

            {plan.trial && (
              <div className="checkout-trial">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {plan.trial}
              </div>
            )}

            <ul className="checkout-features">
              {FEATURES.map(f => (
                <li key={f}><Check /> {f}</li>
              ))}
            </ul>

            <div className="checkout-switch">
              {planKey === 'yearly' ? (
                <NavLink to="/checkout?plan=monthly">Switch to monthly billing</NavLink>
              ) : (
                <NavLink to="/checkout?plan=yearly">Switch to yearly{proPrice.savingsPct > 0 ? ` & save ${proPrice.savingsPct}%` : ''}</NavLink>
              )}
            </div>
          </div>

          <NavLink to="/settings" className="checkout-back">← Back to settings</NavLink>
        </aside>

        {/* Embedded Stripe checkout */}
        <div className="checkout-form card">
          {!hasStripeKey ? (
            <div className="checkout-error">
              Payments aren’t configured yet. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in your environment to enable checkout.
            </div>
          ) : error ? (
            <div className="checkout-error">
              <strong style={{ display: 'block', marginBottom: 6 }}>Checkout unavailable</strong>
              <span style={{ fontSize: 12, color: 'var(--t2)' }}>{error}</span>
              {error.includes('Server configuration') && (
                <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8 }}>
                  This usually means the Firebase service account key isn't configured on the server.
                  If you're the site owner, check Vercel environment variables.
                </p>
              )}
              <button className="btn btn-s" style={{ marginTop: 12 }} onClick={() => { setError(''); }}>Try again</button>
            </div>
          ) : (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  )
}
