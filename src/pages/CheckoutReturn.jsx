import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, NavLink, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../config/plans'
import { COLOUR_SYSTEMS, FREE_COLOUR_SYSTEMS } from '../config/colourSystems'
import { BILLED_EVERY, PRO_EXPORT_NAMES } from '../config/planFacts'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/checkout.css'

// The address /privacy and /terms already publish.
const SUPPORT_EMAIL = 'support@uil4b.com'

// Every figure comes from the same config /plans reads, never typed here, so
// the ledger cannot drift from what the plan really grants. Each row steps the
// Free value to the Pro value and, where the change has one home, links to it.
function ledgerRows() {
  return [
    {
      id: 'ai',
      label: 'AI generations',
      from: String(AI_LIMITS.free.daily),
      to: String(AI_LIMITS.pro.daily),
      unit: 'a day',
      note: `${AI_LIMITS.pro.monthly} a month. Try it in Alt Text.`,
      href: '/create/alt-text',
      where: 'Alt Text',
    },
    {
      id: 'colour',
      label: 'Colour systems',
      from: String(FREE_COLOUR_SYSTEMS.length),
      to: String(COLOUR_SYSTEMS.length),
      note: 'Plus HCT editing, in Palette.',
      href: '/create/palette',
      where: 'Palette',
    },
    {
      id: 'projects',
      label: 'Saved projects',
      from: String(FREE_SAVE_LIMITS.projects),
      to: 'Unlimited',
      note: `Custom icons too, up from ${FREE_SAVE_LIMITS.customIcons}.`,
      href: '/projects',
      where: 'Projects',
    },
    {
      // Export is a dialog in the top bar, not a page, so this row says where
      // it lives instead of pretending to be a link.
      id: 'export',
      label: 'Exports',
      from: 'Marked',
      to: 'Unmarked',
      note: `No “Made with UIL4B” line, plus the ${PRO_EXPORT_NAMES}. Use Export in the top bar.`,
    },
  ]
}

const formatDate = ms => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

function Arrow() {
  return (
    <svg className="co-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" /></svg>
  )
}

function Chevron() {
  return (
    <svg className="co-chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 3.5 4.5 4.5L6 12.5" /></svg>
  )
}

function Ledger({ linked }) {
  return (
    <ul className={`co-ledger${linked ? ' is-live' : ''}`}>
      {ledgerRows().map(row => {
        const body = (
          <>
            <span className="co-row-text">
              <span className="co-row-label">{row.label}</span>
              <span className="co-row-note">{row.note}</span>
            </span>
            <span className="co-change">
              <span className="co-from">{row.from}</span>
              <Arrow />
              <span className="co-to">{row.to}</span>
              {row.unit && <span className="co-unit">{row.unit}</span>}
            </span>
            <span className="co-row-end">{linked && row.href && <Chevron />}</span>
          </>
        )
        return (
          <li key={row.id}>
            {linked && row.href ? (
              <Link
                to={row.href}
                className="co-row"
                aria-label={`${row.label}: ${row.to}${row.unit ? ` ${row.unit}` : ''}, up from ${row.from}. Open ${row.where}.`}
              >
                {body}
              </Link>
            ) : (
              <div className="co-row">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function CheckoutReturn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getCheckoutStatus, isPro, planKnown, subscription } = useSubscription()

  const sessionId = params.get('session_id')
  // Missing session id is an error state from the start — no effect needed.
  const [state, setState] = useState(sessionId ? 'loading' : 'error') // loading | success | error
  const [checkoutMode, setCheckoutMode] = useState('subscription')
  const [billingInterval, setBillingInterval] = useState(null)
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
          setBillingInterval(data.interval || null)
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

  // The page already listens to the account live, so a settling payment turns
  // into an active one the moment Pro lands, with no reload.
  const oneOff = checkoutMode === 'payment'
  const proLanded = isPro && planKnown
  let view
  if (state === 'loading') view = 'loading'
  else if (state === 'error') view = sessionId ? 'failed' : 'nosession'
  else if (!activationPending || proLanded) {
    view = !oneOff && subscription?.status === 'trialing' && Number.isFinite(subscription?.trialEndsAt) ? 'trial' : 'active'
  } else view = 'settling'

  const email = user?.email || ''
  const last8 = sessionId ? sessionId.slice(-8) : ''
  const dateMs = oneOff ? null
    : view === 'trial' ? subscription?.trialEndsAt
      : subscription?.currentPeriodEnd
  const hasDate = Number.isFinite(dateMs)
  const dateText = hasDate ? formatDate(dateMs) : ''
  const isActive = view === 'active' || view === 'trial'
  const hasPlan = isActive || view === 'settling'

  const COPY = {
    loading: { h: 'Confirming your payment…', sub: 'Checking with Stripe. This page updates by itself.' },
    active: { h: 'You’re on UIL4B Pro.', sub: oneOff ? 'Pro is yours with no renewal. Here’s what changed.' : 'Here’s what changed on your account.' },
    trial: { h: 'You’re on UIL4B Pro.', sub: `Free until ${dateText}. You won’t be charged before then. Here’s what changed.` },
    settling: { h: 'Payment received.', sub: `Pro is still being attached to ${email || 'your account'}. This page updates by itself when it lands, and you can leave it: Pro will still arrive.` },
    failed: { h: 'We couldn’t confirm this payment.', sub: `If you paid, nothing is lost: Pro attaches to the account you paid with. Check again in a minute, or email us the reference below.${email ? ` You’re signed in as ${email}.` : ''} Paid with another account? Sign in with that one.` },
    nosession: { h: 'This link has no payment attached.', sub: 'Nothing was charged from this page. Pick a plan to start again.' },
  }[view]

  // Move focus to the headline whenever the state changes, so a screen reader
  // lands on the result. The live region below says the same words aloud.
  const headingRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [view])

  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)
  useEffect(() => () => clearTimeout(copyTimer.current), [])
  const copyReference = () => {
    if (!sessionId || !navigator.clipboard?.writeText) return
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Checkout …${last8}`)}&body=${encodeURIComponent(`Reference: ${sessionId || ''}`)}`
  const settingsState = { section: 'support' }

  return (
    <div className="sec checkout-page">
      <section className="co-return" aria-labelledby="co-return-h">
        <p className="sr-only" role="status" aria-live="polite">{COPY.h}</p>

        <div className="co-head" key={view}>
          <div className="co-glyph" aria-hidden="true">
            {view === 'loading' && <span className="checkout-spinner co-spin" />}
            {(isActive || view === 'settling') && (
              <svg className="co-tick" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            )}
            {(view === 'failed' || view === 'nosession') && (
              <svg className="co-alert" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            )}
          </div>
          <h1 id="co-return-h" className="co-title" tabIndex={-1} ref={headingRef}>{COPY.h}</h1>
          <p className="co-sub">
            {view === 'settling' && <span className="checkout-spinner co-spin co-spin-inline" aria-hidden="true" />}
            {COPY.sub}
          </p>
        </div>

        {isActive && (
          <>
            <h2 className="sr-only">What Pro changed</h2>
            <Ledger linked key="linked" />
          </>
        )}
        {view === 'settling' && (
          <>
            <h2 className="co-ledger-h">Arriving with Pro</h2>
            <Ledger key="plain" />
          </>
        )}

        <div className="co-actions">
          {isActive && (
            <>
              {/* Was `/dashboard`, which is only a redirect to `/home` — the
                  anonymous sales page. So the moment of highest goodwill, right
                  after someone paid, ended on the page trying to acquire them,
                  being told about the free tier they had just moved off. */}
              <NavLink to="/projects" className="btn btn-accent">Start building</NavLink>
              <NavLink to="/settings" state={settingsState} className="btn">{oneOff ? 'View account details' : 'Manage subscription'}</NavLink>
            </>
          )}
          {view === 'settling' && (
            <>
              <button type="button" className="btn btn-accent" onClick={() => window.location.reload()}>Check again</button>
              <NavLink to="/settings" state={settingsState} className="btn">Manage subscription</NavLink>
            </>
          )}
          {view === 'failed' && (
            <>
              <button type="button" className="btn btn-accent" onClick={() => window.location.reload()}>Check again</button>
              <NavLink to="/plans" className="btn">Back to Plans</NavLink>
            </>
          )}
          {view === 'nosession' && (
            <>
              {/* Was "Try again" → /checkout. With no ?plan on it, Checkout
                  renders "Invalid checkout selection — choose Monthly or
                  Yearly from Plans", so the button offered a retry and landed
                  on a page saying the retry was invalid. Rendered 2026-09-09.
                  The plan is chosen on /plans; send them there, in Checkout's
                  own words for the same link. */}
              <NavLink to="/plans" className="btn btn-accent">Back to Plans</NavLink>
              <NavLink to="/settings" className="btn">Back to settings</NavLink>
            </>
          )}
        </div>

        {view === 'failed' && (
          <p className="co-links">
            <a href={mailto}>Email support</a>
            <NavLink to="/settings">Settings</NavLink>
          </p>
        )}

        <dl className="co-details">
          {email && (
            <div className="co-detail">
              <dt>Account</dt>
              <dd className="co-ellipsis" title={email}>{email}</dd>
            </div>
          )}
          {hasPlan && (
            <div className="co-detail">
              <dt>Plan</dt>
              <dd>{oneOff ? 'Pro, one-off purchase' : `Pro${BILLED_EVERY[billingInterval] ? `, billed ${BILLED_EVERY[billingInterval]}` : ''}`}</dd>
            </div>
          )}
          {hasPlan && hasDate && (
            <div className="co-detail">
              <dt>{view === 'trial' ? 'Free until' : 'Renews'}</dt>
              <dd>{dateText}</dd>
            </div>
          )}
          {sessionId && (
            <div className="co-detail">
              <dt>Reference</dt>
              <dd className="co-ref">
                <span className="co-ref-code">…{last8}</span>
                <button type="button" className="btn btn-s" onClick={copyReference} aria-label="Copy payment reference">{copied ? 'Copied' : 'Copy'}</button>
                <span className="sr-only" role="status" aria-live="polite">{copied ? 'Payment reference copied' : ''}</span>
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}
