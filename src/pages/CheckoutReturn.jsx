import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

export default function CheckoutReturn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getCheckoutStatus } = useSubscription()

  const sessionId = params.get('session_id')
  // Missing session id is an error state from the start — no effect needed.
  const [state, setState] = useState(sessionId ? 'loading' : 'error') // loading | success | error
  const [email, setEmail] = useState('')
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
          setEmail(data.customerEmail || '')
          setCheckoutMode(data.mode || 'subscription')
          setActivationPending(data.mode === 'payment' && data.entitlementActive !== true)
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
            <div className="checkout-spinner" />
            <h2>Confirming your checkout…</h2>
            <p>This only takes a moment.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="card checkout-return-card">
            <div className="checkout-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2>{activationPending ? 'Payment received' : 'You’re on UIL4B Pro 🎉'}</h2>
            <p>
              {email ? <>A confirmation has been sent to <strong>{email}</strong>. </> : null}
              {checkoutMode !== 'payment'
                ? 'Your Pro subscription is active across the toolkit.'
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
              <NavLink to="/dashboard" className="btn btn-accent">Go to dashboard</NavLink>
              <NavLink to="/settings" className="btn">{checkoutMode === 'payment' ? 'View account details' : 'Manage subscription'}</NavLink>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="card checkout-return-card">
            <div className="checkout-error-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2>We couldn’t confirm your checkout</h2>
            <p>If you completed payment, activation may still be processing. Unpaid one-off checkouts never grant Pro access.</p>
            <div className="checkout-return-actions">
              <NavLink to="/checkout" className="btn btn-accent">Try again</NavLink>
              <NavLink to="/settings" className="btn">Back to settings</NavLink>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
