import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'

// The front end for billing state the Stripe webhook has always collected and
// nothing ever read. See src/utils/billingState.js for the rules; this file
// only decides how to SAY them.
//
// Placed bottom-LEFT deliberately: bottom-right already holds the toast
// (global.css .toast) and the feedback FAB (.global-feedback-btn), and a
// payment warning that lands underneath a "Copied!" toast is a payment warning
// nobody reads.
//
// Dismissal is sessionStorage, not localStorage, and keyed on the alert's own
// key. So: it stops nagging within a visit, it comes back next visit, and a
// NEW failure re-surfaces even if an older one was dismissed. Nothing about
// money gets permanently silenced by one click.

const DISMISS_PREFIX = 'vs-billing-dismissed:'

function readDismissed(key) {
  if (!key) return false
  try {
    return sessionStorage.getItem(DISMISS_PREFIX + key) === '1'
  } catch {
    return false   // private mode / storage disabled — show the banner
  }
}

function writeDismissed(key) {
  try {
    sessionStorage.setItem(DISMISS_PREFIX + key, '1')
  } catch {
    /* the banner still closes for this render; it just returns on reload */
  }
}

function formatDate(ms) {
  if (!Number.isFinite(ms)) return null
  try {
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
  } catch {
    return null
  }
}

function plural(n, one, many) {
  return n === 1 ? one : many
}

// Copy per alert kind. Every string states what happened, what it costs, and
// what fixes it — in that order — because a billing notice that only says
// "there was a problem" sends the user to support instead of to their card.
function contentFor(alert) {
  const { kind, daysLeft } = alert
  if (kind === 'payment-failed') {
    return {
      title: 'Your last payment didn’t go through',
      body: daysLeft > 0
        ? `Pro stays on for ${daysLeft} more ${plural(daysLeft, 'day', 'days')} while you update your card.`
        : 'Pro pauses today unless your card is updated.',
      cta: 'Update payment method',
    }
  }
  if (kind === 'payment-lapsed') {
    return {
      title: 'Pro is paused — payment failed',
      body: 'Your projects and saved work are all still here. Updating your card switches Pro back on.',
      cta: 'Update payment method',
    }
  }
  if (kind === 'trial-ending') {
    const on = formatDate(alert.trialEndsAt)
    return {
      title: daysLeft === 0
        ? 'Your free trial ends today'
        : `Your free trial ends in ${daysLeft} ${plural(daysLeft, 'day', 'days')}`,
      body: on
        ? `Pro billing starts on ${on}. Cancel any time before then and you won’t be charged.`
        : 'Cancel any time before it ends and you won’t be charged.',
      cta: 'Manage billing',
    }
  }
  // cancel-scheduled
  const on = formatDate(alert.endsAt)
  return {
    title: on ? `Pro ends on ${on}` : 'Pro is scheduled to end',
    body: 'Nothing is deleted — your saved projects stay. You just won’t be able to add new ones past the free limit.',
    cta: 'Keep Pro',
  }
}

export default function BillingBanner() {
  const { billingAlert: alert, openPortal } = useSubscription()
  const [dismissedKey, setDismissedKey] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!alert) return null
  if (dismissedKey === alert.key || readDismissed(alert.key)) return null

  const { title, body, cta } = contentFor(alert)
  const urgent = alert.severity === 'urgent'

  const dismiss = () => {
    writeDismissed(alert.key)
    setDismissedKey(alert.key)
  }

  // The retry link Stripe gave us is always the shortest path — it opens the
  // exact unpaid invoice with a card form on it. The portal is the fallback for
  // every other kind of alert, and for a failure whose invoice URL never
  // arrived.
  const openBilling = async () => {
    if (alert.hostedInvoiceUrl) {
      window.location.href = alert.hostedInvoiceUrl
      return
    }
    setBusy(true)
    setError('')
    try {
      await openPortal()
    } catch (err) {
      setBusy(false)
      setError(err?.message || 'Could not open billing. Try Settings → Subscription.')
    }
  }

  return (
    <div
      className={`bill-banner${urgent ? ' bill-banner--urgent' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="bill-banner-body">
        <p className="bill-banner-title">{title}</p>
        <p className="bill-banner-text">{body}</p>
        {error && <p className="bill-banner-err" role="alert">{error}</p>}
        <div className="bill-banner-actions">
          <button type="button" className="bill-banner-cta" onClick={openBilling} disabled={busy}>
            {busy ? 'Opening…' : cta}
          </button>
          <Link to="/settings" className="bill-banner-link" onClick={dismiss}>Settings</Link>
        </div>
      </div>
      <button type="button" className="bill-banner-x" onClick={dismiss} aria-label="Dismiss this notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
