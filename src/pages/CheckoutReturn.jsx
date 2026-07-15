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
          setEmail(data.customerEmail || '')
          setState('success')
        } else if (data.status === 'open') {
          // Payment not finished — send them back to retry.
          navigate('/checkout', { replace: true })
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
            <h2>Confirming your subscription…</h2>
            <p>This only takes a moment.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="card checkout-return-card">
            <div className="checkout-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2>You’re on UIL4B Pro 🎉</h2>
            <p>
              {email ? <>A confirmation has been sent to <strong>{email}</strong>. </> : null}
              Your Pro features are now unlocked across the toolkit.
            </p>
            {sessionId && (
              <p className="checkout-return-ref">
                <span className="checkout-return-ref-label">Confirmation reference</span>
                <code className="checkout-return-ref-code">{sessionId}</code>
              </p>
            )}
            <div className="checkout-return-actions">
              <NavLink to="/dashboard" className="btn btn-accent">Go to dashboard</NavLink>
              <NavLink to="/settings" className="btn">Manage subscription</NavLink>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="card checkout-return-card">
            <div className="checkout-error-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2>We couldn’t confirm your checkout</h2>
            <p>If you completed payment, your subscription may still activate shortly. Otherwise you can try again.</p>
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
