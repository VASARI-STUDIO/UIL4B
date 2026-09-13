import { useCallback, useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { useAuth } from '../contexts/AuthContext'
import { AI_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { getStripe, hasStripeKey } from '../utils/stripeClient'
import { refreshPrices, useProPrice } from '../hooks/usePrices'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'

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
  lifetime: {
    interval: 'lifetime',
    name: 'UIL4B Pro',
    cadence: 'One-off',
    per: 'one payment',
    trial: null,
  },
}

// Derived, never typed. This list is read at the moment money changes hands,
// which makes it the worst possible place for a figure the server will not
// honour — it advertised 1,000 AI actions/day against a limit of 30.
const FEATURES = [
  `${AI_LIMITS.pro.daily} AI generations a day · ${AI_LIMITS.pro.monthly} a month`,
  'Unlimited project and custom-icon saves',
  'Advanced colour controls',
  // WAS 'Full design JSON export', removed 2026-09-05. There is no JSON export
  // to sell: `json` in ExportPanel's FORMATS has no `live: true`, renders a
  // "Soon" badge and a disabled button, and runExport() has no branch that
  // could build one. This list is read at the moment money changes hands, so
  // it was the single worst place in the product for that claim to sit.
  // What Pro's export entitlement actually IS, and all it is:
  'The design system book (PDF) — a 12-page A4 manual',
  'Style guides with no UIL4B credit line',
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

  const requestedPlan = params.get('plan')
  const planKey = Object.hasOwn(PLANS, requestedPlan) ? requestedPlan : null
  const plan = PLANS[planKey]
  const proPrice = useProPrice()
  const amount = planKey === 'yearly' ? proPrice.yearlyTotal
    : planKey === 'lifetime' ? proPrice.lifetime
      : proPrice.monthly
  // AN UNREACHABLE PRICE SERVICE IS A STATE THIS PAGE HAS TO RENDER, and until
  // 2026-09-11 it rendered it as a lie. `useProPrice` returns `loaded: true`
  // the moment the fetch SETTLES — including when it settled by failing — and
  // null for every amount it could not confirm. So with /api/get-prices down:
  //
  //   amount slot   `{proPrice.loaded ? amount : '—'}` → loaded was true and
  //                 amount was null, so React rendered NOTHING. Measured on the
  //                 built preview: `.checkout-plan-amount` textContent "" above
  //                 "per year". A blank where a price goes reads as free.
  //   note          the yearly branch interpolated `proPrice.yearlyPerMonth`
  //                 unconditionally, so the page printed the string
  //                 "USD · null/mo", in accent colour, on the screen where
  //                 money changes hands.
  //
  // Lifetime escaped both because CANONICAL_LIFETIME in usePrices.js gives it a
  // fallback the recurring intervals do not have.
  //
  // src/pages/Plans.jsx — the step immediately before this one — already
  // answers this exact outage, and these are ITS sentences, not new ones. Two
  // steps of one funnel must not describe one outage two ways.
  const priceServiceDown = proPrice.loaded && !proPrice.serviceAvailable
  const note = priceServiceDown
    ? (amount
      ? `Live pricing is unreachable · showing the canonical ${proPrice.currencyLabel} amount`
      : 'Live pricing is unreachable · no price can be shown right now')
    : planKey === 'yearly'
      ? `${proPrice.currencyLabel} · ${proPrice.yearlyPerMonth}/mo${proPrice.savingsPct > 0 ? ` · save ${proPrice.savingsPct}%` : ''}`
      : planKey === 'lifetime' ? `${proPrice.currencyLabel} · one-off purchase · no renewal`
        : `${proPrice.currencyLabel} · billed monthly · cancel anytime`
  const [error, setError] = useState('')

  const stripePromise = useMemo(() => getStripe(), [])

  const fetchClientSecret = useCallback(() => {
    if (!plan) return Promise.reject(new Error('Invalid checkout selection'))
    if (plan.interval === 'lifetime' && !proPrice.availability.lifetime) {
      return Promise.reject(new Error(`One-off checkout is not available in ${proPrice.currencyLabel} yet`))
    }
    return createCheckoutSession(plan.interval).catch(e => {
      setError(e?.message || 'Could not start checkout')
      throw e
    })
  }, [createCheckoutSession, plan, proPrice.availability.lifetime, proPrice.currencyLabel])

  // Send signed-out users to login, and already-Pro users back to settings.
  useEffect(() => {
    if (loading) return
    if (!user) navigate('/login', { state: { from: `/checkout?plan=${planKey || requestedPlan || ''}` }, replace: true })
    else if (isPro) navigate('/settings', { replace: true })
  }, [user, loading, isPro, navigate, planKey, requestedPlan])

  if (loading || !user || isPro) return null
  if (!plan) {
    return (
      <div className="sec checkout-page">
        <div className="checkout-return">
          <div className="card checkout-return-card">
            <div className="checkout-error-icon" aria-hidden="true">!</div>
            <h1>Invalid checkout selection</h1>
            <p>Choose Monthly or Yearly from Plans. No payment session was created.</p>
            <NavLink to="/plans" className="btn btn-accent">Back to Plans</NavLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sec checkout-page">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Checkout</div>
        <h1>{planKey === 'lifetime' ? 'Buy Pro once' : 'Upgrade to Pro'}</h1>
        <p>{planKey === 'lifetime' ? 'Complete one secure payment for durable Pro access.' : 'Complete your subscription securely.'} Your payment is processed by Stripe.</p>
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
                {/* `amount || 'Unavailable'` is Plans.jsx's line 306, for the
                    reason given above: `loaded` means settled, not known. */}
                <span className="checkout-plan-amount">{!proPrice.loaded ? '—' : amount || 'Unavailable'}</span>
                <span className="checkout-plan-per">{plan.per}</span>
              </div>
            </div>

            <div className="checkout-plan-note">{note}</div>

            {/* usePrices caches the failure for the life of the module, so
                without this the summary stays on "Unavailable" until a full
                reload. Same control and same label as Plans.jsx. */}
            {priceServiceDown && (
              <button type="button" className="btn btn-s checkout-price-retry" onClick={() => refreshPrices()}>
                Retry live pricing
              </button>
            )}

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

            <div className="checkout-switch"><NavLink to="/plans">Compare all payment options</NavLink></div>
          </div>

          <NavLink to="/settings" className="checkout-back">← Back to settings</NavLink>
        </aside>

        {/* Embedded Stripe checkout */}
        <div className="checkout-form card">
          {!proPrice.loaded ? (
            <div className="checkout-error">Checking the live Stripe price…</div>
          ) : planKey === 'lifetime' && !proPrice.availability.lifetime ? (
            <div className="checkout-error">
              <strong style={{ display: 'block', marginBottom: 6 }}>One-off checkout is temporarily unavailable</strong>
              <span style={{ fontSize: 12, color: 'var(--t2)' }}>No payment session was created. Return to Plans and try again after the live {proPrice.currencyLabel} price is activated.</span>
            </div>
          ) : !hasStripeKey ? (
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
