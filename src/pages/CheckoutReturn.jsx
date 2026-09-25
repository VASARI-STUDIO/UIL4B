import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/checkout.css'

export default function CheckoutReturn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getCheckoutStatus } = useSubscription()

  const sessionId = params.get('session_id')
  // Missing session id is an error state from the start — no effect needed.
  const [state, setState] = useState(sessionId ? 'loading' : 'error') // loading | success | error
  const [checkoutMode, setCheckoutMode] = useState('subscription')
  // A paid one-off whose entitlement hasn't landed yet must not be reported as
  // active — the payment is confirmed, the access is still settling.
  const [activationPending, setActivationPending] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (!sessionId) return
    let cancelled = false
    getCheckoutStatus(sessionId)
      .then(data => {
        if (cancelled) return
        if (data.status === 'complete') {
          if (data.mode === 'payment' && data.paymentStatus !== 'paid') {
            setState('error')
            return
          }
          setCheckoutMode(data.mode || 'subscription')
          // Both modes, not just the one-off. This page used to state flatly
          // that "Your Pro subscription is active" for every completed
          // subscription checkout — including one whose webhooks never landed
          // and whose account was still on Free. /api/checkout-status now
          // reconciles that case and reports the result; when it could not, the
          // honest line is that the payment arrived and access is settling.
          setActivationPending(data.mode === 'payment'
            ? data.entitlementActive !== true
            : data.subscriptionActive !== true)
          setState('success')
        } else if (data.status === 'open') {
          // Payment not finished — send them back to retry.
          navigate(`/checkout?plan=${data.interval || 'yearly'}`, { replace: true })
        } else {
          setState('error')
        }
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [user, sessionId, getCheckoutStatus, navigate])

  return (
    <div className="sec checkout-page">
      <div className="checkout-return">
        {state === 'loading' && (
          <div className="card checkout-return-card">
            <div className="checkout-spinner" aria-hidden="true" />
            <h1>Confirming your checkout…</h1>
            <p>This only takes a moment.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="card checkout-return-card">
            <div className="checkout-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1>{activationPending ? 'Payment received' : 'You’re on UIL4B Pro'}</h1>
            <p>
              {checkoutMode !== 'payment'
                ? activationPending
                  ? 'Your payment is confirmed. Pro access is still being attached to this account — keep this reference and reload in a moment if it hasn’t appeared.'
                  : 'Your Pro subscription is active across the toolkit.'
                : activationPending
                  ? 'Your one-off payment is confirmed. Pro access is still being attached to this account — keep this reference and reload in a moment if it hasn’t appeared.'
                  : 'Your one-off purchase is complete and Pro access is attached to this account.'}
            </p>
            {sessionId && (
              <p className="checkout-return-ref">
                <span className="checkout-return-ref-label">Confirmation reference</span>
                <code className="checkout-return-ref-code">{sessionId}</code>
              </p>
            )}
            <div className="checkout-return-actions">
              {/* Was `/dashboard`, which is only a redirect to `/home` — the
                  anonymous sales page. So the moment of highest goodwill, right
                  after someone paid, ended on the page trying to acquire them,
                  being told about the free tier they had just moved off. */}
              <NavLink to="/projects" className="btn btn-accent">Start building</NavLink>
              <NavLink to="/settings" className="btn">{checkoutMode === 'payment' ? 'View account details' : 'Manage subscription'}</NavLink>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="card checkout-return-card">
            <div className="checkout-error-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h1>We couldn’t confirm your checkout</h1>
            <p>If you completed payment, activation may still be processing. Unpaid one-off checkouts never grant Pro access.</p>
            <div className="checkout-return-actions">
              {/* Was "Try again" → /checkout. With no ?plan on it, Checkout
                  renders "Invalid checkout selection — choose Monthly or
                  Yearly from Plans", so the button offered a retry and landed
                  on a page saying the retry was invalid. Rendered 2026-09-09.
                  The plan is chosen on /plans; send them there, in Checkout's
                  own words for the same link. */}
              <NavLink to="/plans" className="btn btn-accent">Back to Plans</NavLink>
              <NavLink to="/settings" className="btn">Back to settings</NavLink>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
