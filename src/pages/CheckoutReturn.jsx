import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { clearPick, readPick } from '../utils/kitGalleryPick'
import ReportProblemLink from '../components/ReportProblemLink'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/checkout.css'

// How often, and how many times, a settling payment re-asks the server.
const SETTLE_RETRY_MS = 4000
const SETTLE_RETRIES = 15

const formatDate = ms => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

function GoArrow() {
  return (
    <span className="mi-go ck-well" aria-hidden="true">
      <svg className="mi-a" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M8 7h9v9" /></svg>
    </span>
  )
}

export default function CheckoutReturn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getCheckoutStatus, subscription } = useSubscription()
  const { projects } = useProject()

  // Set by the export gallery just before checkout; read once, here, and cleared once the payment is
  // confirmed. It is only a way back for the account that made it, into a project that still exists.
  const [storedPick] = useState(() => readPick())
  const galleryPick = storedPick && user && storedPick.uid === user.uid && projects.some((p) => p.id === storedPick.projectId)
    ? storedPick
    : null
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
    let timer = null
    const check = attempt => {
      getCheckoutStatus(sessionId)
        .then(data => {
          if (cancelled) return
          if (data.status === 'complete') {
            if (data.mode === 'payment' && data.paymentStatus !== 'paid') {
              setState('error')
              return
            }
            clearPick()
            setCheckoutMode(data.mode || 'subscription')
            // Only the server's answer for this checkout's own kind counts: a
            // one-off needs entitlementActive, a subscription needs
            // subscriptionActive. When it can't confirm yet, the honest line is
            // that the payment arrived and access is settling, and the page
            // asks again until the server confirms.
            const pending = data.mode === 'payment'
              ? data.entitlementActive !== true
              : data.subscriptionActive !== true
            setActivationPending(pending)
            setState('success')
            if (pending && attempt < SETTLE_RETRIES) {
              timer = setTimeout(() => check(attempt + 1), SETTLE_RETRY_MS)
            }
          } else if (data.status === 'open') {
            // Payment not finished — send them back to retry.
            // A buyer who came from the export gallery keeps the label that says so.
            const fromGallery = params.get('from') === 'kit-gallery' || storedPick
            navigate(`/checkout?plan=${data.interval || 'yearly'}${fromGallery ? '&from=kit-gallery' : ''}`, { replace: true })
          } else {
            setState('error')
          }
        })
        .catch(() => { if (!cancelled) setState('error') })
    }
    check(0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [user, sessionId, getCheckoutStatus, navigate, params, storedPick])

  // A settling payment turns into an active one when a later checkout-status
  // response confirms it. The live account is never enough on its own: it can
  // hold Pro from another purchase or a stale snapshot.
  const oneOff = checkoutMode === 'payment'
  let view
  if (state === 'loading') view = 'loading'
  else if (state === 'error') view = sessionId ? 'failed' : 'nosession'
  else if (!activationPending) {
    view = !oneOff && subscription?.status === 'trialing' && Number.isFinite(subscription?.trialEndsAt) ? 'trial' : 'active'
  } else view = 'settling'

  const last8 = sessionId ? sessionId.slice(-8) : ''
  const trialEnds = Number.isFinite(subscription?.trialEndsAt) ? formatDate(subscription.trialEndsAt) : ''
  const isActive = view === 'active' || view === 'trial'

  const COPY = {
    loading: { h: 'Confirming your checkout…', sub: 'This only takes a moment.' },
    active: { h: 'You’re on UI L4B Pro', sub: oneOff ? 'Your Pro access is active across the toolkit, with no renewal.' : 'Your Pro subscription is active across the toolkit.' },
    trial: { h: 'You’re on UI L4B Pro', sub: `Your Pro subscription is active across the toolkit. Your free trial runs until ${trialEnds}, and you won’t be charged before then.` },
    settling: { h: 'Payment received', sub: 'Your payment is confirmed. Pro access is still being attached to this account. Keep this reference and reload in a moment if it hasn’t appeared.' },
    failed: { h: 'We couldn’t confirm your checkout', sub: 'If you completed payment, activation may still be processing. Unpaid one-off checkouts never grant Pro access.' },
    nosession: { h: 'This link has no payment attached', sub: 'Nothing was charged from this page. Pick a plan to start again.' },
  }[view]

  // Move focus to the headline whenever the state changes, so a screen reader
  // lands on the result. The body line is a status region and says the same.
  const headingRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [view])

  const settingsState = { section: 'support' }
  const manageLabel = oneOff ? 'View account details' : 'Manage subscription'
  // A buyer who came from the export gallery goes back to the pick they made.
  const exportHref = galleryPick ? `/projects/${encodeURIComponent(galleryPick.projectId)}/export` : null
  const exportState = galleryPick ? { kitPick: { design: galleryPick.design, format: galleryPick.format } } : undefined

  // One ink pill, then one outline pill.
  let ink = null
  let outline = null
  if (isActive || view === 'settling') {
    if (galleryPick) {
      ink = { to: exportHref, label: 'Back to your export', state: exportState }
      outline = { to: '/projects', label: 'Start building' }
    } else {
      ink = { to: '/projects', label: 'Start building' }
      outline = { to: '/settings', label: manageLabel, state: settingsState }
    }
  } else if (view === 'failed') {
    ink = { to: '/settings', label: 'Back to settings', state: settingsState }
    outline = { to: '/plans', label: 'Back to Plans' }
  } else if (view === 'nosession') {
    // Was "Try again" → /checkout, which with no plan chosen says the retry
    // is invalid. The plan is chosen on /plans, so this goes there.
    ink = { to: '/plans', label: 'Back to Plans' }
    outline = { to: '/settings', label: 'Back to settings' }
  }

  return (
    <div className="ck">
      <section className="ck-ret" aria-labelledby="ck-return-h">
        <h1 id="ck-return-h" className="ck-rh" data-errfocus="1" tabIndex={-1} ref={headingRef}>{COPY.h}</h1>
        {view === 'failed' && <p className="ck-rp ck-rkey">Check Settings → Plan and billing before you try again, so you don’t pay twice.</p>}
        <p className="ck-rp" role="status">{COPY.sub}</p>
        {sessionId && view !== 'loading' && view !== 'nosession' && (
          <div className="ck-ref"><span>Confirmation reference</span><code>…{last8}</code></div>
        )}
        {ink && (
          <div className="ck-ract">
            {/* Was `/dashboard`, which is only a redirect to `/home` — the
                anonymous sales page. So the moment of highest goodwill, right
                after someone paid, ended on the page trying to acquire them. */}
            <NavLink to={ink.to} state={ink.state} className="ck-go">{ink.label}<GoArrow /></NavLink>
            <NavLink to={outline.to} state={outline.state} className="ck-ghost mi-ring">{outline.label}</NavLink>
          </div>
        )}
        {view === 'failed' && <div className="ck-rrep"><ReportProblemLink subject="Problem confirming checkout" /></div>}
      </section>
    </div>
  )
}
