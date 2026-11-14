import { useCallback, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, NavLink, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { openFirebaseGate } from '../utils/firebaseAccess'
import { PRO_POINTS, BILLING_OPTIONS, canCheckout, canRetryPrice, priceState, priceStateCopy, resolveOffers } from '../config/planFacts'
import { getStripe, hasStripeKey } from '../utils/stripeClient'
import { usePriceRetry, usePrices, useProPrice, formatPrice } from '../hooks/usePrices'
import { PLAN_LADDER } from '../config/planLadder'
import { EVENTS, sendEvent } from '../utils/productEvents'
import { renewalDisclosure, quotableAmount, periodWords } from '../utils/renewalDisclosure'
import { verifyErrorText } from '../utils/emailVerification'
import { checkoutErrorText, checkoutErrorAction, plainError } from '../utils/checkoutError'
import ReportProblemLink from '../components/ReportProblemLink'
import useMediaQuery from '../hooks/useMediaQuery'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/tool-shell.css'
// This page's own sheet: every rule under `.ck`, so it wins by specificity
// rather than by a chunk order Vite does not promise.
import '../styles/pages/checkout.css'

const PLANS = {
  monthly: {
    interval: 'monthly',
    name: 'UI L4B Pro',
    cadence: 'Monthly',
    months: 1,
  },
  yearly: {
    interval: 'yearly',
    name: 'UI L4B Pro',
    cadence: 'Yearly',
    months: 12,
  },
}

// Derived, never typed. This list is read at the moment money changes hands,
// which makes it the worst possible place for a figure the server will not
// honour — it advertised 1,000 AI actions/day against a limit of 30.
//
// And it is /plans' list, word for word (src/config/planFacts.js). It used to
// be its own — "Advanced colour controls", "a 12-page A4 manual" — so the step
// where money changes hands described a different Pro from the step before it.
const FEATURES = PRO_POINTS

// "Monthly or Yearly" — read off the buyable cadences, never typed.
// Built without a regex replacement: the price guard reads `$1` in source as
// a dollar amount.
const CADENCE_WORDS = (() => {
  const labels = BILLING_OPTIONS.map((o) => o.label)
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}` : labels.join('')
})()

// The shared outage sentence the unavailable panel closes on, read from the
// price copy rather than typed here.
const PRICE_UNDER = priceStateCopy('unreachable', {}).under
const PRICE_CHECKING = priceStateCopy('loading', {}).line1

// STRIPE'S EMBEDDED CHECKOUT, ONE INSTANCE AT A TIME.
//
// Stripe allows one embedded Checkout per page, and an instance that is still
// being created (its session request in flight) cannot be destroyed until it
// exists. Changing the billing period replaces the instance, so each new one
// waits on this queue until the one before it has been created and destroyed.
// <EmbeddedCheckoutProvider> cannot be remounted for this: unmounted while its
// instance is still being created, it never destroys that instance.
let embedQueue = Promise.resolve()

// A period must stay chosen this long before its session is requested, so
// stepping through the periods creates one session, not one per step.
const SESSION_DEBOUNCE_MS = 400
// An instance waiting behind one that never finishes would wait forever; past
// this the panel shows the error and its Try again.
const EMBED_TIMEOUT_MS = 20000
const EMBED_TIMEOUT_ERROR = 'The payment form is taking too long to load. Check your connection, then try again.'
const STRIPE_LOAD_ERROR = 'The payment form couldn’t load. Check your connection, then try again.'
const ALREADY_PRO_MESSAGE = 'You’re already on Pro, so there’s nothing to buy. Your plan is managed here.'

function CheckoutEmbed({ fetchClientSecret, onReady, onFail, onPaying }) {
  const nodeRef = useRef(null)
  useEffect(() => {
    let live = true
    let instance = null
    // Only the instance on screen reports a failure: a request for a period
    // the buyer has already left fails quietly and leaves the new one alone.
    const fail = (e) => { if (live) onFail(e) }
    const created = embedQueue.then(async () => {
      if (!live) return
      let stripe
      try {
        stripe = await getStripe()
      } catch {
        throw plainError(STRIPE_LOAD_ERROR)
      }
      if (!stripe || !live) return
      instance = await stripe.createEmbeddedCheckoutPage({
        fetchClientSecret: () => fetchClientSecret().catch((e) => { fail(e); throw e }),
        // Once payment is submitted the period is fixed, so the instance
        // taking the payment is never replaced under it. Completion needs no
        // callback: the session redirects to its return page.
        onAnalyticsEvent: (event) => {
          if (!live) return
          if (event?.eventType === 'checkoutSubmitted') onPaying(true)
          else if (event?.eventType === 'checkoutSubmitFailed') onPaying(false)
        },
      })
      if (live) {
        instance.mount(nodeRef.current)
        onReady(true)
      } else {
        instance.destroy()
      }
    })
    embedQueue = created.catch(() => {})
    const timer = setTimeout(() => fail(plainError(EMBED_TIMEOUT_ERROR)), EMBED_TIMEOUT_MS)
    created.then(() => clearTimeout(timer), (e) => { clearTimeout(timer); fail(e) })
    return () => {
      live = false
      clearTimeout(timer)
      onReady(false)
      onPaying(false)
      if (instance) instance.destroy()
    }
  }, [fetchClientSecret, onReady, onFail, onPaying])
  return <div ref={nodeRef} className="checkout-embed" />
}

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function Chevron({ direction }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'back' ? 'M15 6l-6 6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  )
}

function GoArrow() {
  return (
    <span className="mi-go ck-well" aria-hidden="true">
      <svg className="mi-a" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M8 7h9v9" /></svg>
    </span>
  )
}

// ── Dates ───────────────────────────────────────────────────────────────────
// The bill names the real day each charge lands, worked from today and the
// ladder's trial length. Whole-month steps clamp to the month's last day.
const DATE_FORMAT = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
function addMonths(date, months) {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(date.getDate(), lastDay))
  return next
}
function longDate(date, withYear) {
  const parts = Object.fromEntries(DATE_FORMAT.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.weekday} ${parts.day} ${parts.month}${withYear ? ` ${parts.year}` : ''}`
}

const NO_FIGURE = '—'
const NBSP = ' '

// The "today, then, later" bill for one billing period. Every amount comes from
// the offer the price service answered for; with none, each figure is a dash.
// `offer` is { label, months, total, trialDays }, `other` the period not chosen.
function billModel({ offer, other, fmt, today, figures, checking }) {
  const per = periodWords(offer.months) || 'period'
  const amt = figures && typeof offer.total === 'number' ? fmt(offer.total) : null
  const stops = []
  if (offer.trialDays > 0) {
    const first = addDays(today, offer.trialDays)
    const renews = addMonths(first, offer.months)
    const span = offer.months === 1 ? '1 month' : `${offer.months} months`
    stops.push({
      key: 'today',
      now: true,
      label: 'Today',
      fig: amt ? fmt(0) : NO_FIGURE,
      sen: `Pro opens on this account and your ${offer.trialDays}-day free trial starts.`,
    }, {
      key: 'first',
      label: longDate(first, first.getFullYear() !== today.getFullYear()),
      fig: amt || NO_FIGURE,
      sen: `The first payment, for the ${per}.`,
    }, {
      key: 'later',
      label: longDate(renews, true),
      fig: amt || NO_FIGURE,
      sen: amt
        ? `Nothing more to pay for ${span}. Then ${amt} again, every ${per} until you cancel.`
        : `Nothing more to pay for ${span}. Then it renews every ${per} until you cancel.`,
    })
  } else {
    stops.push({
      key: 'today',
      now: true,
      label: 'Today',
      fig: amt || NO_FIGURE,
      sen: `${offer.label} has no trial, so the first payment is taken today.`,
    }, {
      key: 'later',
      label: 'Then',
      fig: amt ? (offer.months === 1 ? `${amt} a ${per}` : `${amt} every ${per}`) : NO_FIGURE,
      sen: `Renews every ${per} until you cancel.`,
    })
  }
  let otherLine = ''
  if (checking) otherLine = PRICE_CHECKING
  else if (other && typeof other.total === 'number') {
    if (other.months === 1) {
      otherLine = `${other.label} is ${fmt(other.total)}${NBSP}a${NBSP}month${other.trialDays === 0 ? `, with no${NBSP}free${NBSP}trial.` : '.'}`
    } else {
      otherLine = `${other.label} works out at ${fmt(other.total / other.months)}${NBSP}a${NBSP}month.`
    }
  }
  return { stops, otherLine }
}

function BillStops({ model, className = '', ghost = false }) {
  return (
    <div className={`ck-stops${className ? ` ${className}` : ''}${ghost ? ' gh' : ''}`} aria-hidden={ghost || undefined}>
      {model.stops.map((stop) => (
        <div className="ck-stop" key={stop.key}>
          <span className={`ck-dot${stop.now ? ' now' : ''}`} aria-hidden="true" />
          <div className="ck-row">
            <p className="ck-lab">{stop.label}</p>
            <p className="ck-fig">{stop.fig}</p>
          </div>
          <p className="ck-sen">{stop.sen}</p>
        </div>
      ))}
      <p className="ck-small ck-other">{model.otherLine}</p>
    </div>
  )
}

// A refusal sentence, reworded for the phone where the message sits above the
// form and the action below it. Anything that does not end the way the shared
// sentences do stays in the panel, unchanged.
const SIGN_IN_TAIL = 'Log in again to continue.'
const CONNECTION_TAIL = 'Check your connection, then try again.'
function belowForm(text, code) {
  if (!text) return ''
  if (code === 'log-in' && text.endsWith(SIGN_IN_TAIL)) return `${text.slice(0, -SIGN_IN_TAIL.length)}Log in again below to continue.`
  if (text.endsWith(CONNECTION_TAIL)) return `${text.slice(0, -'try again.'.length)}try again below.`
  return ''
}

function SignInGate({ cadence, onClick }) {
  return (
    <div className="ck-blk ck-gate">
      <h3 className="ck-bh" data-errfocus="1" tabIndex={-1}>Log in or create an account to pay</h3>
      <p className="ck-bp">Pro is attached to an account, so the payment form opens once you’re logged in. Your {cadence.toLowerCase()} choice stays selected.</p>
      <div className="ck-ba">
        <button type="button" className="ck-go" onClick={onClick}>Log in to continue<GoArrow /></button>
      </div>
    </div>
  )
}

// Shown when the server refuses checkout because the account's email is not
// verified (code 'email-unverified'). It reuses the verification link the
// reminder bar and Settings send. "I've verified" re-reads the account and mints
// a fresh ID token first, because the server judges the token's own copy of the
// flag, then asks for the form again.
function VerifyEmailPrompt({ email, onResend, onRetry }) {
  const [state, setState] = useState('idle') // idle | sending | sent | failed
  const [failure, setFailure] = useState('')
  const resend = async () => {
    if (state === 'sending') return
    setState('sending')
    try {
      await onResend()
      setState('sent')
    } catch (e) {
      setFailure(verifyErrorText(e))
      setState('failed')
    }
  }
  return (
    <>
      <p className="ck-bp" role="status">
        {state === 'sent'
          ? <>Link sent{email ? <> to {email}</> : null}. Check your inbox and spam folder.</>
          : <>We sent a link{email ? <> to {email}</> : null} when you signed up. Open it, or send a new one.</>}
      </p>
      {state === 'failed' && <p className="ck-bp" role="alert">{failure}</p>}
      <div className="ck-ba">
        <button type="button" className="ck-ghost mi-ring" aria-disabled={state === 'sending' || undefined} onClick={resend}>
          {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Resend link' : 'Send link'}
        </button>
        <button type="button" className="ck-go plain" onClick={onRetry}>I’ve verified, try again</button>
      </div>
    </>
  )
}

export default function Checkout() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading, sendVerificationEmail, refreshEmailVerified } = useAuth()
  const { isPro, createCheckoutSession } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  // The features list is open beside the form and folded on a phone, where the
  // summary also stacks above the form and the bill reads as rows.
  const wide = useMediaQuery('not all and (max-width: 599px)')

  // Which surface sent the buyer here (the export gallery sends `kit-gallery`).
  const from = params.get('from')
  // `?plan=` is what every link to this page writes; `?period=` is read as the
  // same choice and wins when both are present.
  const periodParam = params.get('period')
  const requestedPlan = Object.hasOwn(PLANS, periodParam) ? periodParam : params.get('plan')
  const planKey = Object.hasOwn(PLANS, requestedPlan) ? requestedPlan : null
  const plan = PLANS[planKey]
  const proPrice = useProPrice()
  const { prices } = usePrices()
  const { retrying, retry } = usePriceRetry()
  const [error, setError] = useState('')
  // The server's reason code for the error, when it sent one, or 'log-in' when
  // the sign-in expired (what the panel offers instead of Try again).
  const [errorCode, setErrorCode] = useState('')
  // One failure can report twice (the fetch wrapper, then Stripe's own
  // rejection), so a later call without a code keeps the code already set.
  // Every path that clears the error clears the code with it.
  const failCheckout = useCallback((err) => {
    // The buyer reads a sentence of this page's own; the raw text stays here.
    console.warn('checkout: the payment session failed:', err?.message, { code: err?.code, status: err?.status })
    setError(checkoutErrorText(err))
    setErrorCode((prev) => err?.code || checkoutErrorAction(err) || prev)
  }, [])
  // The plan the payment form is built for. It follows the chosen plan once
  // the choice has rested for SESSION_DEBOUNCE_MS.
  const [sessionPlan, setSessionPlan] = useState(planKey)
  const [formReady, setFormReady] = useState(false)
  // Payment submitted or complete: the period choice is locked.
  const [paying, setPaying] = useState(false)
  // The currency each period's payment session was actually created in, as the
  // server reported it, keyed by period so a late answer for a period the buyer
  // has left cannot colour the one on screen.
  const [sessionCurrencies, setSessionCurrencies] = useState({})
  // Counts period changes; its parity restarts the short fade on the bill.
  const [changes, setChanges] = useState(0)
  const [today] = useState(() => new Date())
  const startedSent = useRef(false)
  const errorRef = useRef(null)
  const statusRef = useRef(null)
  const frameRef = useRef(null)
  const segRefs = useRef({})
  const focusSeg = useRef(null)
  // Set when the buyer asks for the form again, so focus lands on the loading
  // line and then on the form instead of being lost with the panel they used.
  const retryFocus = useRef(false)
  const invalidRef = useRef(null)

  // A refusal arrives after the buyer has been looking at the form, and on a
  // phone the panel can sit below the fold: bring it into view and focus it so
  // it is not missed.
  useEffect(() => {
    if (!error || !errorRef.current) return
    errorRef.current.focus({ preventScroll: true })
    errorRef.current.scrollIntoView?.({ block: 'center' })
  }, [error])

  // A link without a usable period lands on the invalid-selection card, which
  // takes focus on its heading.
  useEffect(() => {
    if (!planKey) invalidRef.current?.focus({ preventScroll: true })
  }, [planKey])

  // The billing-period choices are the ladder's buyable cadences that this
  // page has a case for, each with the saving /plans prints on its own tab.
  const resolved = resolveOffers({ prices, currency: proPrice.currency, loaded: proPrice.loaded })
  const periodOptions = resolved.offers.filter((o) => Object.hasOwn(PLANS, o.checkoutPlan))
  // /plans reads its cadence from `?billing=<ladder id>`, so going back keeps
  // the period chosen here.
  const chosenOption = periodOptions.find((o) => o.checkoutPlan === planKey)
  const plansHref = chosenOption ? `/plans?billing=${chosenOption.id}` : '/plans'
  // Shortest period first. With no offers at all the tray still offers both.
  const segments = (periodOptions.length
    ? periodOptions.map((o) => ({ key: o.checkoutPlan, label: o.label, months: o.months, saving: o.savingLabel }))
    : Object.values(PLANS).map((p) => ({ key: p.interval, label: p.cadence, months: p.months, saving: '' }))
  ).sort((a, b) => a.months - b.months)

  // The plan lives in the URL, so a reload, the sign-in hand-off and the
  // session request all read the same choice. `replace` keeps Back going to
  // the page before checkout rather than through every period tried.
  const choosePlan = (next, { focus = false } = {}) => {
    if (paying || next === planKey || !Object.hasOwn(PLANS, next)) return
    setError(''); setErrorCode('')
    if (focus) focusSeg.current = next
    setChanges((n) => n + 1)
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set('plan', next)
      nextParams.delete('period')
      return nextParams
    }, { replace: true })
  }
  useEffect(() => {
    if (focusSeg.current && focusSeg.current === planKey) {
      segRefs.current[planKey]?.focus()
      focusSeg.current = null
    }
  }, [planKey])
  const onTrayKey = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    if (paying) return
    const at = segments.findIndex((s) => s.key === planKey)
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? segments.length - 1 : (at + step + segments.length) % segments.length
    choosePlan(segments[to].key, { focus: true })
  }

  // THE AMOUNT AND THE NOTE COME OFF THE LADDER (`chosenOption`, from
  // resolveOffers), whatever the cadence — there is no per-cadence branch to
  // forget when a cadence is added. The amount is the total charged each
  // period.
  const amount = chosenOption?.available ? formatPrice(chosenOption.total, proPrice.currency) : null
  // The renewal line for one period. The amount is quoted only when the price
  // service confirmed it live AND the payment session was created in the
  // currency that amount is shown in. A returning customer with a locked
  // currency gets a session in that currency whatever the page asked for, so
  // the server reports the currency it used and a mismatch (or no report yet)
  // drops the figure. Without one the terms say how the plan renews and leave
  // the figure to Stripe's own form.
  const renewalFor = (key) => {
    const offer = periodOptions.find((o) => o.checkoutPlan === key)
    const quoted = offer?.available ? formatPrice(offer.total, proPrice.currency) : null
    return renewalDisclosure({
      trialDays: PLAN_LADDER.find((entry) => entry.id === key)?.trialDays || 0,
      amount: quotableAmount({ amount: quoted, live: !!quoted && proPrice.source[key] === 'live', displayCurrency: proPrice.currency, sessionCurrency: sessionCurrencies[key] }),
      months: PLANS[key]?.months,
    })
  }
  const renewal = renewalFor(planKey)
  // The price state is one of loading, retrying, unreachable, no-currency,
  // cadence-missing or live, the same state and the same words /plans and
  // Settings use (planFacts.js). `useProPrice` reports `loaded: true` once the
  // fetch settles, even when it settled by failing, and null for every amount it
  // could not confirm, so the page reads the state and never infers an outage
  // from a missing amount. Only `live` sells: the payment form mounts on it.
  const priceStatus = priceState({ price: proPrice, offers: resolved.offers, selectedId: chosenOption?.id, retrying })
  const otherOption = resolved.offers.find((o) => o.id !== chosenOption?.id)
  const priceContext = { currencyLabel: proPrice.currencyLabel, selectedLabel: chosenOption?.label, otherLabel: otherOption?.label }
  const priceCopy = priceStateCopy(priceStatus, priceContext)

  useEffect(() => {
    if (sessionPlan === planKey) return undefined
    const timer = setTimeout(() => setSessionPlan(planKey), SESSION_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [planKey, sessionPlan])

  const sessionInterval = PLANS[sessionPlan]?.interval
  const fetchClientSecret = useCallback(() => {
    if (!sessionInterval) return Promise.reject(new Error('Invalid checkout selection'))
    // Stripe's embedded checkout calls this when it starts, so this is the
    // moment a checkout began, not a visit to the page. A period change starts
    // a new session, not a new checkout, so it is sent once per visit.
    if (!startedSent.current) {
      startedSent.current = true
      sendEvent(EVENTS.checkoutStarted, { plan: sessionInterval, from })
    }
    return createCheckoutSession(sessionInterval, (session) => {
      setSessionCurrencies((prev) => ({ ...prev, [sessionInterval]: session?.currency || null }))
    })
  }, [createCheckoutSession, sessionInterval, from])

  // The payment panel is waiting on the auth answer, so ask for it now rather
  // than when the browser is idle. A no-op in a build that loads auth eagerly.
  useEffect(() => { openFirebaseGate() }, [])

  // A signed-in buyer is headed for the payment form, so Stripe.js starts
  // loading now rather than once the form mounts. Nothing loads signed out.
  // A failed load is not cached; the form asks again and reports it.
  useEffect(() => { if (user) getStripe()?.catch(() => {}) }, [user])

  // Already-Pro accounts have nothing to buy here: they go to Settings, open at Plan and billing, and are told why.
  // A buyer whose payment started on this page and has just gone through is not told "already".
  useEffect(() => {
    if (loading || !user || !isPro) return
    if (!startedSent.current) window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: ALREADY_PRO_MESSAGE, type: 'info' } }))
    navigate('/settings', { replace: true, state: { section: 'support' } })
  }, [user, loading, isPro, navigate])

  // Choosing a period needs no account; paying does. The popup opens over this
  // page and resolves in place, so the period in the URL is still the one
  // chosen when the payment form mounts.
  const signInToPay = () => {
    requireLogin('pay for Pro', { reasons: ['Pro is attached to your account, so payment needs one.'] })
  }

  // What the payment panel shows, in the order the checks run.
  const kind = loading
    ? 'checking'
    : !user
      ? 'gate'
      : !proPrice.loaded
        ? 'pricewait'
        // No live price for this cadence in this currency (not `live`, or no
        // amount): no payment form. The server would refuse it, or worse,
        // charge something the summary does not show.
        : !canCheckout(priceStatus) || !amount
          ? 'unavail'
          : !hasStripeKey
            ? 'nokey'
            : error
              ? (errorCode === 'email-unverified' ? 'verify' : 'error')
              : 'form'

  // Asking for the form again: focus the loading line, then the form once it
  // is there. A new refusal goes to its own heading instead (see above).
  useEffect(() => {
    if (!retryFocus.current) return
    if (error) { retryFocus.current = false; return }
    if (kind !== 'form') return
    if (!formReady) { statusRef.current?.focus({ preventScroll: true }); return }
    retryFocus.current = false
    const active = document.activeElement
    if (!active || active === document.body || active === statusRef.current) frameRef.current?.focus({ preventScroll: true })
  }, [error, formReady, kind])

  if (user && isPro) return null
  if (!plan) {
    return (
      <div className="ck">
        <section className="ck-ret ck-ret--solo">
          <h1 className="ck-rh" data-errfocus="1" tabIndex={-1} ref={invalidRef}>Invalid checkout selection</h1>
          {/* The cadences are read from the plan ladder, not typed. */}
          <p className="ck-rp" role="status">Choose {CADENCE_WORDS} from Plans. No payment session was created.</p>
          <div className="ck-ract">
            <NavLink to="/plans" className="ck-go">Back to Plans<GoArrow /></NavLink>
          </div>
        </section>
      </div>
    )
  }

  // ── The bill ──────────────────────────────────────────────────────────────
  const fmt = (n) => formatPrice(n, proPrice.currency)
  const offerFor = (key) => {
    const found = periodOptions.find((o) => o.checkoutPlan === key)
    return {
      label: found?.label || PLANS[key].cadence,
      months: PLANS[key].months,
      total: found?.available ? found.total : null,
      trialDays: PLAN_LADDER.find((entry) => entry.id === key)?.trialDays || 0,
    }
  }
  const otherKey = Object.keys(PLANS).find((key) => key !== planKey)
  const live = priceStatus === 'live'
  const checking = priceStatus === 'loading'
  const shown = offerFor(planKey)
  const unshown = offerFor(otherKey)
  const bill = billModel({ offer: shown, other: live ? unshown : null, fmt, today, figures: live && shown.total !== null, checking })
  const ghostBill = billModel({ offer: unshown, other: live ? shown : null, fmt, today, figures: live && unshown.total !== null, checking })
  const outage = ['retrying', 'unreachable', 'no-currency', 'cadence-missing'].includes(priceStatus)
  // While Stripe is being asked again the outage block keeps the height of the
  // one it replaces, by holding that one's lines invisibly under the new ones.
  const ghostCopy = priceStatus === 'retrying' ? priceStateCopy('unreachable', priceContext) : null
  const fade = changes === 0 ? '' : changes % 2 ? 'ck-fx-a' : 'ck-fx-b'

  // On a phone the one-line reason sits under the heading, above the form, and
  // the panel keeps only the action.
  const stripeDown = priceStatus === 'unreachable' || priceStatus === 'retrying'
  const leadError = wide ? '' : kind === 'error' ? belowForm(error, errorCode) : stripeDown ? priceStateCopy('unreachable', priceContext).line1 : ''
  const leadId = 'ck-lead-err'

  const lockId = 'ck-lock'
  const backToSettings = user
    ? <NavLink to="/settings" className={`ck-lnk${wide ? ' ck-back-settings' : ' ck-after'}`}><Chevron direction="back" />Back to settings</NavLink>
    : null

  // How the plan renews and what subscribing agrees to, directly above the
  // payment form in every layout. The block stays mounted while the period
  // changes, so its polite live region announces the new wording.
  const disclosure = (
    <div className="checkout-disclosure">
      <div className={`ck-twin ${fade}`.trim()}>
        <p className="checkout-renewal" aria-live="polite" aria-atomic="true">{renewal}</p>
        <p className="ck-renew gh" aria-hidden="true">{renewalFor(otherKey) || NBSP}</p>
      </div>
      <p className="checkout-terms">
        By subscribing you agree to our <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
      </p>
    </div>
  )

  const gate = <SignInGate cadence={plan.cadence} onClick={signInToPay} />
  const included = wide
    ? (
      <>
        <div className="ck-div" />
        <h3 className="ck-h3">What’s included</h3>
        <ul className="ck-pts">
          {FEATURES.map((f) => <li key={f}><Tick /><span>{f}</span></li>)}
        </ul>
      </>
    )
    : (
      <details className="ck-det">
        <summary>What’s included<Chevron direction="down" /></summary>
        <ul className="ck-pts">
          {FEATURES.map((f) => <li key={f}><Tick /><span>{f}</span></li>)}
        </ul>
      </details>
    )

  return (
    <div className="ck">
      <header className="ck-head">
        {/* NO TAXONOMY EYEBROW. It is a common AI tell, and the same element was
            removed from the Font Gallery, Font Pair, the Type Scale and the
            Tint tool. A 10px mono-caps label restating the page's own section,
            directly above an h1 that names the page, on a route the nav already
            has lit. Hierarchy is a control, not a label. */}
        <NavLink to={plansHref} className="ck-lnk"><Chevron direction="back" />Back to Plans</NavLink>
        <h1 className="ck-h1">Upgrade to Pro</h1>
        <div className="ck-lead-cell">
          <p className={`ck-lead${paying || leadError ? ' off' : ''}`}>Complete your subscription securely. Your payment is processed by Stripe.</p>
          <p className={`ck-lead lk${paying ? '' : ' off'}`} id={lockId} role="status">{paying ? 'Payment in progress, so the billing period can’t change now.' : ''}</p>
          {leadError && <p className="ck-lead ck-lead-err" id={leadId} role={kind === 'error' ? undefined : 'status'}>{leadError}</p>}
        </div>
      </header>

      <div className="ck-grid">
        <div className="ck-col">
          <section className="ck-sum" aria-labelledby="ck-pt">
            <span className="ck-spec" aria-hidden="true"><i /></span>
            <h2 className="ck-pt" id="ck-pt">{plan.name}</h2>
            {/* Buttons with the radio role, so the group is one tab stop and
                the arrow keys move the choice, as /plans' own switch does. */}
            <div className="ck-tray" role="radiogroup" aria-label="Billing period" aria-describedby={paying ? lockId : undefined} onKeyDown={onTrayKey}>
              {segments.map((s) => {
                const on = s.key === planKey
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    className={`ck-seg${on ? ' on' : ''}`}
                    data-seg={s.key}
                    aria-checked={on}
                    aria-disabled={paying ? 'true' : undefined}
                    tabIndex={on ? 0 : -1}
                    ref={(el) => { segRefs.current[s.key] = el }}
                    onClick={() => choosePlan(s.key)}
                  >
                    {s.label}{s.saving ? ` · ${s.saving}` : ''}
                  </button>
                )
              })}
            </div>

            {/* In one column the panel sits below this whole card, so the
                sign-in comes up here, above the bill; the panel has none. */}
            {!wide && kind === 'gate' && gate}

            {/* Announces the new cadence and its charges after a period change. */}
            <div className="ck-bill" aria-live="polite" aria-atomic="true">
              <span className="sr-only">{plan.cadence} plan</span>
              {outage ? (
                <div className="ck-out">
                  <p className="ck-fig">{priceCopy.word}</p>
                  {!leadError && (
                    <div className="ck-twin">
                      <p className="ck-sen">{priceCopy.line1}</p>
                      {ghostCopy && <p className="ck-sen gh" aria-hidden="true">{ghostCopy.line1}</p>}
                    </div>
                  )}
                  {(priceCopy.line2 || ghostCopy?.line2) && (
                    <div className="ck-twin">
                      <p className="ck-sen ck-small">{priceCopy.line2}</p>
                      {ghostCopy && <p className="ck-sen ck-small gh" aria-hidden="true">{ghostCopy.line2}</p>}
                    </div>
                  )}
                  {priceCopy.button && (
                    // usePrices caches the failure for the life of the module, so
                    // without this the summary stays on "Unavailable" until a full
                    // reload. Same control and same label as /plans.
                    <div className="ck-act">
                      <button
                        type="button"
                        className="ck-ghost mi-ring"
                        aria-disabled={priceStatus === 'retrying' ? 'true' : undefined}
                        aria-busy={priceStatus === 'retrying' ? 'true' : undefined}
                        onClick={() => {
                          if (priceStatus === 'cadence-missing') choosePlan(otherKey, { focus: true })
                          else if (canRetryPrice(priceStatus) && priceStatus !== 'retrying') retry()
                        }}
                      >
                        {priceCopy.button}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ck-twin">
                  <BillStops model={bill} className={fade} />
                  <BillStops model={ghostBill} ghost />
                </div>
              )}
            </div>

            {included}
          </section>
          {wide && backToSettings}
        </div>

        {(wide || user || loading) && (
          <section className="ck-fp" aria-label="Payment">
            {kind === 'gate' && gate}

            {(kind === 'checking' || kind === 'pricewait') && (
              <>
                {disclosure}
                <div className="ck-slot">
                  <div className="ck-frame stat" aria-busy="true">
                    <p className="ck-status" role="status">{kind === 'checking' ? 'Checking your account…' : 'Checking the live Stripe price…'}</p>
                  </div>
                </div>
              </>
            )}

            {kind === 'unavail' && (
              <div className="ck-blk" role="status">
                <p className="ck-bp ck-bp0">{priceCopy.under || PRICE_UNDER}</p>
              </div>
            )}

            {kind === 'nokey' && (
              <div className="ck-blk ck-nokey" role="status">
                <p className="ck-bp ck-bp0">Payments aren’t configured yet. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in your environment to enable checkout.</p>
              </div>
            )}

            {kind === 'verify' && (
              <div className="ck-blk checkout-error">
                <h3 className="ck-bh" data-errfocus="1" tabIndex={-1} ref={errorRef}>Verify your email to continue</h3>
                <VerifyEmailPrompt
                  email={user.email}
                  onResend={sendVerificationEmail}
                  onRetry={async () => {
                    await refreshEmailVerified().catch(() => {})
                    retryFocus.current = true
                    setError(''); setErrorCode('')
                  }}
                />
              </div>
            )}

            {kind === 'error' && (
              <>
                {disclosure}
                <div className="ck-slot ck-blk checkout-error" role="alert">
                  <h3 className="ck-bh" data-errfocus="1" tabIndex={-1} ref={errorRef} aria-describedby={leadError ? leadId : undefined}>Checkout unavailable</h3>
                  {!leadError && <p className="ck-bp">{error}</p>}
                  <div className="ck-ba">
                    {errorCode === 'log-in' ? (
                      // The session is no good, so a retry would fail the same way:
                      // sign in again (forced, though the account looks signed in),
                      // then ask for the form again.
                      <button type="button" className="ck-go plain" onClick={() => {
                        requireLogin('continue to checkout', { force: true, email: user?.email }).then((back) => {
                          if (back) { retryFocus.current = true; setError(''); setErrorCode('') }
                        })
                      }}>Log in</button>
                    ) : (
                      <button type="button" className="ck-go plain" onClick={() => { retryFocus.current = true; setError(''); setErrorCode('') }}>Try again</button>
                    )}
                  </div>
                  {/* Quiet, and drawn at every width. */}
                  <div className="ck-br"><ReportProblemLink subject="Problem at checkout" /></div>
                </div>
              </>
            )}

            {kind === 'form' && (
              <>
                {disclosure}
                <div className="ck-slot">
                  <div className={`ck-frame${formReady ? '' : ' stat'}`} ref={frameRef} role="group" aria-label="Payment form" aria-busy={!formReady || paying} tabIndex={-1}>
                    {/* From the moment a form is destroyed until the next one
                        mounts. Kept in the tree and emptied, so each new load is
                        announced; it takes no room once empty. */}
                    <p className="ck-status checkout-loading" role="status" tabIndex={-1} ref={statusRef}>{formReady ? '' : 'Loading payment form…'}</p>
                    {/* A new period destroys the form at once; the next is created
                        once the choice has rested, with a new session request. */}
                    {sessionPlan === planKey && (
                      <CheckoutEmbed fetchClientSecret={fetchClientSecret} onReady={setFormReady} onFail={failCheckout} onPaying={setPaying} />
                    )}
                  </div>
                </div>
                <p className="ck-cap">Secure checkout by Stripe.</p>
              </>
            )}
          </section>
        )}

        {/* After the payment panel, so the tab order is the reading order on a
            phone, where it stacks last. */}
        {!wide && backToSettings}
      </div>
    </div>
  )
}
