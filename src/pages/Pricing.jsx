import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import HomeFinalCall from '../components/home/HomeFinalCall'
import { FreeList, ProList } from '../components/home/PlanLists'
import { PLAN_ICON_PATHS, bandHue } from '../components/home/planListArt'
import { GoArrow, PlanFigure } from '../components/plans/PlanParts'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { AI_LIMITS, FREE_SAVE_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import useMediaQuery from '../hooks/useMediaQuery'
import { usePriceRetry, usePrices, useProPrice } from '../hooks/usePrices'
import { digitRuns } from '../utils/digitRuns'
import { formatMoney } from '../config/planLadder'
import { COLOUR_SYSTEMS } from '../config/colourSystems'
import { EXPORT_THEMES_LIVE, comingLine } from '../config/exportFormats'
import { TOOL_COUNT, numberWord } from '../components/spectrum/spectrumFacts'
// The offers, cadences and billed lines live in one module that every surface
// describing Free and Pro reads: Settings, Checkout and the upgrade modal too.
import {
  BILLED_EVERY, BILLING_OPTIONS, DEFAULT_BILLING, MADE_WITH_LINE, sameExportNames, PRO_ROWS, PRO_VALUE,
  canCheckout, perMonth, priceState, priceStateCopy, resolveOffers, subscriptionCadence,
} from '../config/planFacts'
// The pair of cards reuses the homepage's sheet; the page's own sheet follows it,
// every selector under `.pricing`. Imported here so it rides this lazy route's
// chunk. The Spectrum ground and the footer are styled by spectrum.css, which `/`
// already loads in the entry.
import '../styles/pages/home-tokens.css'
import '../styles/pages/home-plans.css'
import '../styles/pages/pricing.css'

// ═════════════════════════════════════════════════════════════════════════════
// PRICING — /plans.
//
// Reading order: headline and lead, the pair (Free, and Pro with its billing
// switch, price, terms and button), the comparison table (its head sticks and
// carries the Pro price and button once the pair's button has scrolled away),
// the questions, the closing call and the footer.
//
// ── NOTHING ON THIS PAGE IS A TYPED NUMBER ──────────────────────────────────
// Every figure is imported from the module that also DRIVES it, so the page
// cannot drift from the product without a test going red.
//   AI_LIMITS / FREE_SAVE_LIMITS → src/config/plans.js (api/_lib/plans.js mirror)
//   COLOUR_SYSTEMS               → what the palette engine gates on
//   PRO_VALUE                     → src/config/planFacts.js, which quotes the library, icon and export gates
//   export formats               → src/config/exportFormats.js, which renders the buttons
//   offers, trials, savings      → src/config/planFacts.js over the one ladder
//   prices                       → /api/get-prices via usePrices(); nothing typed
// ═════════════════════════════════════════════════════════════════════════════

const AI = AI_LIMITS
const NBSP = ' '

// The number and its noun stay on one line at any width ("1 / coffee" never splits).
const HEADLINE = 'Improve your design systems for less than 1 coffee per month.'.replace('1 coffee', `1${NBSP}coffee`)

const HERO_LEAD =`Pro lifts AI from ${AI.free.daily} to ${AI.pro.daily} generations a day, opens all ${numberWord(COLOUR_SYSTEMS.length)} colour systems, gives you unlimited projects, and removes the ${MADE_WITH_LINE} from your exports.`

const CANCEL_LINE = 'Cancel Pro any time. Keep every export you made.'
const STRIPE_LINE = 'Secure checkout by Stripe.'

const SAME_ON_BOTH = `All ${numberWord(TOOL_COUNT)} tools. Style guide exports in ${sameExportNames()}, as often as you like. The same AI model. Files stay in your browser. ${comingLine()}`.trim()

// The offer with a free trial and the one without, from the ladder.
const TRIAL_OFFER = BILLING_OPTIONS.find((o) => o.trialDays)
const PLAIN_OFFER = BILLING_OPTIONS.find((o) => !o.trialDays)

// The questions, in the order a buyer asks them.
const FAQS = [
  {
    q: 'When am I charged?',
    a: `${TRIAL_OFFER.label} starts with a ${TRIAL_OFFER.trialDays}-day free trial, so nothing is charged today; the first payment is taken when the trial ends. ${PLAIN_OFFER.label} has no trial, so the first payment is taken today. Pro then renews each month or year until you cancel.`,
  },
  {
    q: 'How do I cancel?',
    a: 'Open Settings, then Plan and billing, and choose Cancel plan. Stripe’s billing page opens to confirm it. Pro stays on until the end of the period you’ve paid for, and Settings shows the date it ends.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Cancelling stops the next payment. It doesn’t refund the period you’re in, and you keep Pro until that period ends. Cancel during the free trial and you’re never charged. If you think a charge is wrong, ask support.',
  },
  {
    q: 'Do prices include tax?',
    a: 'Checkout shows the exact amount before you pay, and that’s what you’re charged. For a tax invoice, ask support.',
  },
  {
    q: 'What happens to my work if Pro ends?',
    a: `Every file you exported is yours: it’s on your computer. Your account stays, and Free’s limits apply from then on: ${FREE_SAVE_LIMITS.projects} saved projects with ${FREE_SAVE_LIMITS.customIcons} icons in each, ${AI.free.daily} AI generations a day, and the “Made with UI L4B” line on new exports.`,
  },
  {
    q: 'Do my files get uploaded?',
    a: 'Most image and video work runs in the browser. The AI features are the exception: the Alt Text Generator and the photo scan in the AI Image Prompt Generator send your image to an AI provider, and prompt writing sends your text.',
  },
  {
    q: 'What counts as one generation?',
    a: 'One image described by the Alt Text generator, or one prompt produced by an AI tool. Browsing, editing palettes, building type scales, exporting a style guide and everything else in the toolkit are unmetered, because they run in your browser.',
  },
]

// Each comparison group borrows the icon and hue of the Pro list row it matches.
const GROUP_ROW = { AI: 'ai', Colour: 'colour-systems', Libraries: 'library', Icons: 'icon-packs', 'Your work': 'saves', Exports: 'white-label' }
function groupArt(group) {
  const index = PRO_ROWS.findIndex((row) => row.id === GROUP_ROW[group])
  if (index < 0) return null
  return { d: PLAN_ICON_PATHS[PRO_ROWS[index].icon], color: bandHue('pro', index, PRO_ROWS.length) }
}

// Every number in a value is set heavier, so the eye can run down a column.
function Figures({ text }) {
  return (
    <span>
      {digitRuns(text).map((run, i) => (run.num ? <span key={i} className="pl-n">{run.text}</span> : run.text))}
    </span>
  )
}

// One comparison cell, printed by the table and by the stacked list under 1200.
function FreeValue({ row }) {
  if (row.free !== null) return <Figures text={row.free} />
  return (
    <span className="pl-v">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M6 12h12" /></svg>
      <span className="sr-only">Not included</span>
    </span>
  )
}
function ProValue({ row }) {
  if (row.pro !== 'Included') return <Figures text={row.pro} />
  return (
    <span className="pl-v">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
      <span>Included</span>
    </span>
  )
}

const unitOf = (offer) => (offer.months === 12 ? 'year' : 'month')
const ctaLabel = (offer) => (offer.trialDays ? `Start ${offer.trialDays}-day free trial` : 'Upgrade to Pro')

const SEG_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export default function Pricing() {
  const { user, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const navigate = useNavigate()
  const { isPro, loading: subLoading, subscription } = useSubscription()
  const location = useLocation()
  // Seeded from `?billing=`, validated against the options the switch can
  // show, so a stale `?billing=quarterly` falls back rather than putting the
  // page into a state its own switch cannot represent.
  // `?plan=<checkoutPlan>` is what the upgrade dialog sends, so the cadence
  // picked there arrives selected here.
  const [billing, setBilling] = useState(() => {
    const params = new URLSearchParams(location.search)
    const asked = params.get('billing')
    if (BILLING_OPTIONS.some((o) => o.id === asked)) return asked
    const byPlan = BILLING_OPTIONS.find((o) => o.checkoutPlan === params.get('plan'))
    return byPlan ? byPlan.id : DEFAULT_BILLING
  })
  // The price swap animates only after the person has used the switch, so
  // first paint is still.
  const [switched, setSwitched] = useState(false)
  // The table head prints the Pro price and button once the pair's button has
  // scrolled up under the nav.
  const [stuck, setStuck] = useState(false)
  const [open, setOpen] = useState({})
  // Under 768 the Pro list shows its first rows; this opens the rest.
  const [allRows, setAllRows] = useState(false)
  // Under 1200 a docked bar carries the Pro action whenever the page's own
  // action is off screen.
  const [barOn, setBarOn] = useState(false)
  const rootRef = useRef(null)
  const freeGoRef = useRef(null)
  const actRef = useRef(null)
  const ctaRef = useRef(null)
  const segRefs = useRef({})
  // Set when a recovery action replaces the Pro button, so focus follows the swap.
  const keepCtaFocus = useRef(false)

  // The live prices. useProPrice() knows whether the price service answered;
  // usePrices() is the same cache read raw, which resolveOffers needs.
  const price = useProPrice()
  const { prices } = usePrices()
  const { retrying, retry } = usePriceRetry()
  const currency = price.currency
  const { offers } = resolveOffers({ prices, currency, loaded: price.loaded })
  // A Pro account prints the cadence it is on, not the one the switch would offer.
  // When the record cannot say (a founder account, or a month with no stored
  // count), no price is printed for it.
  const accountOffer = isPro ? offers.find((o) => o.id === subscriptionCadence(subscription)) : undefined
  const offer = accountOffer || offers.find((o) => o.id === billing) || offers[0]
  // ONE STATE decides every price word and whether any button may reach
  // checkout: only 'live' does (planFacts.js priceState).
  const state = priceState({ price, offers, selectedId: offer.id, retrying })
  const live = canCheckout(state)
  // A Pro account has nothing to buy, so an outage or an unknown cadence prints no price and no outage line.
  const hidePrice = isPro && !(accountOffer && live)
  const outage = state === 'unreachable' || state === 'no-currency' || state === 'cadence-missing'
  // When another cadence still has a price the service did answer, and only the
  // selected cadence is unavailable; the note says which.
  const otherOffer = offers.find((o) => o.id !== offer.id && o.amountLabel)
  const stateCtx = { currencyLabel: price.currencyLabel, selectedLabel: offer.label, otherLabel: otherOffer?.label || offers.find((o) => o.id !== offer.id)?.label }
  const stateCopy = priceStateCopy(state, stateCtx)
  // A visitor in another currency reads "US$4", never a bare "$" that could be their own.
  const money = (amount) => formatMoney(amount, currency, { qualify: true })
  const freeAmount = money(0)

  // THE PRO CTA IS THE REAL CHECKOUT WIRING. Every paid button links to
  // /checkout for the chosen cadence. Signed in, the click follows the link.
  // Signed out, the login popup opens over this page and, once the visitor has
  // an account, carries on to that checkout. `from` makes a new account come
  // back to the same checkout after onboarding. A modified click (new tab or
  // window) keeps the plain link, and /checkout still asks for an account.
  const proTo = `/checkout?plan=${offer.checkoutPlan}`
  const proBusy = subLoading || !price.loaded
  const openPro = (event) => {
    if (proBusy) { event.preventDefault(); return }
    if (user || authLoading) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    requireLogin('pay for Pro', { reasons: ['Pro is attached to your account, so payment needs one.'], from: proTo })
      .then((back) => { if (back) navigate(proTo) })
  }
  const label = ctaLabel(offer)

  const chooseBilling = (id) => {
    setBilling(id)
    setSwitched(true)
  }

  // The switch is one tab stop; the arrow keys move the choice and its focus.
  const onSegKey = (event, index) => {
    const step = SEG_KEYS[event.key]
    if (!step) return
    event.preventDefault()
    const next = offers[(index + step + offers.length) % offers.length]
    chooseBilling(next.id)
    segRefs.current[next.id]?.focus()
  }

  // One observer on the pair's action row: once it has gone up under the nav,
  // the table head takes over the Pro price and button.
  useEffect(() => {
    const el = actRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting && entry.boundingClientRect.bottom < 64)
    }, { rootMargin: '-64px 0px 0px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The recovery actions replace the Pro button with another element (the buy
  // link, or the loading link), which drops focus to the page. Put it back on
  // the new Pro button, and stop once the prices have settled. If focus has
  // gone somewhere else on purpose, leave it there.
  useEffect(() => {
    if (!keepCtaFocus.current) return
    const active = document.activeElement
    if (active && active !== document.body && active !== ctaRef.current) {
      keepCtaFocus.current = false
      return
    }
    ctaRef.current?.focus({ preventScroll: true })
    if (price.loaded) keepCtaFocus.current = false
  }, [price.loaded, state, offer.id])

  // The words the price slot prints, by state.
  const bestOffer = offers.find((o) => o.id === DEFAULT_BILLING)
  const noTrialOffer = offers.find((o) => !o.trialDays)
  const liveAmount = live ? money(perMonth(offer.total, offer.months)) : ''
  const liveTotal = live ? money(offer.total) : ''
  let detail1 = ''
  let detail2 = ''
  let foot1 = ''
  let foot2 = ''
  if (isPro) {
    if (!hidePrice) detail1 = `${liveTotal} billed ${BILLED_EVERY[offer.id]}.`
    foot1 = 'Manage your plan and receipts in Settings.'
  } else if (live) {
    detail1 = offer.trialDays
      ? `Free for ${offer.trialDays} days, then ${liveTotal} a ${unitOf(offer)}.`
      : `Billed monthly. No free trial on ${offer.label}; billing starts today.`
    if (offer.trialDays) {
      if (noTrialOffer?.total != null) detail2 = `${noTrialOffer.label} is ${money(noTrialOffer.total)}${NBSP}a${NBSP}month, with no${NBSP}free${NBSP}trial.`
    } else if (bestOffer?.total != null && bestOffer.id !== offer.id) {
      detail2 = `${bestOffer.label} works out at ${money(perMonth(bestOffer.total, bestOffer.months))} a month.`
    }
    foot1 = CANCEL_LINE
    foot2 = STRIPE_LINE
  } else {
    detail1 = stateCopy.line1
    detail2 = stateCopy.line2
    foot1 = stateCopy.under
  }
  const priceSize = live || state === 'loading' || state === 'retrying' ? 'pa-amt' : 'pa-amt pa-amt--word'
  // Every price state holds the live slot's height, so the Pro button does not move when the price lands.
  const detailMin = isPro ? ' pa-slot--short' : ''
  const fx = switched ? ' pl-fx' : ''
  const fxKey = switched ? billing : 'first'

  // The Pro action, by state. Only 'live' links to checkout; every other state
  // is a button that cannot reach it. No-currency has no Pro action at all.
  const waiting = state === 'loading' || state === 'retrying'
  let proCta = null
  if (isPro) {
    proCta = (
      <Link ref={ctaRef} className="hpl-btn hpl-ghost ui-pill-out" to="/settings" state={{ section: 'support' }}>
        View account details
      </Link>
    )
  } else if (state === 'cadence-missing') {
    // This cadence has no price in the visitor's currency, so retrying would
    // fail again; the useful action is the cadence that can be bought.
    proCta = (
      <button
        type="button"
        ref={ctaRef}
        className="hpl-btn hpl-go pa-go pa-go--plain"
        aria-describedby="pricing-noprice"
        onClick={() => { keepCtaFocus.current = true; chooseBilling(otherOffer.id) }}
      >
        {stateCopy.button}
      </button>
    )
  } else if (live) {
    proCta = (
      <Link
        ref={ctaRef}
        className="hpl-btn hpl-go pa-go"
        to={proTo}
        aria-disabled={proBusy ? 'true' : undefined}
        onClick={openPro}
      >
        <span key={fxKey} className={fx.trim() || undefined}>{label}</span>
        <GoArrow />
      </Link>
    )
  } else if (state !== 'no-currency') {
    // Loading, retrying, unreachable: no link to checkout. One button in every
    // one of those states, so it keeps focus through a Retry, and it holds the
    // Pro button's place while the price is checked.
    proCta = (
      <button
        type="button"
        ref={ctaRef}
        className="hpl-btn hpl-go pa-go pa-go--plain"
        aria-describedby={outage ? 'pricing-noprice' : undefined}
        aria-disabled={waiting ? 'true' : undefined}
        aria-busy={state === 'retrying' ? 'true' : undefined}
        onClick={() => { if (waiting) return; keepCtaFocus.current = true; retry() }}
      >
        {waiting ? (stateCopy.button || label) : stateCopy.button}
      </button>
    )
  }
  const hasAction = proCta !== null
  // Side by side (1200 and up) Free is the left panel, so it comes first in the
  // markup and Tab runs left to right. Stacked, Pro sits above Free and its
  // action comes first. useMediaQuery picks one tree: CSS `order` would leave the
  // tab order behind the picture.
  const wide = useMediaQuery('(min-width: 1200px)')
  const proFirst = hasAction && !wide

  // The docked bar's one action, by state: Pro's pill when the live price is
  // up, the recovery button when the price is down or missing, Free's toolkit
  // link when Pro has no action. Never on a Pro account.
  let barKind = null
  if (!isPro && !subLoading) {
    if (live) barKind = 'price'
    // 'retrying' keeps the bar a Retry was pressed in, so the press has an answer on screen.
    else if (state === 'unreachable' || state === 'cadence-missing' || state === 'retrying') barKind = 'action'
    else if (state === 'no-currency') barKind = 'toolkit'
  }

  // One observer for the bar. Its root is the screen less the bar's 64px, so a
  // button sitting under the bar counts as off screen. The bar shows while the
  // page's own action is off screen, and hides while the closing call or the
  // footer is on screen, so one ink pill is in view at a time.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return undefined
    const main = hasAction ? ctaRef.current : freeGoRef.current
    const ends = [root.querySelector('.hm-close'), root.querySelector('footer')]
    const seen = new Map()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting))
      setBarOn(seen.get(main) === false && !ends.some((el) => seen.get(el) === true))
    }, { rootMargin: '0px 0px -64px 0px' })
    ;[main, ...ends].forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [hasAction, state, isPro])

  // The closing "Choose Pro" is the same destination as the Pro button. A Pro
  // account has nothing to buy and a missing price means no offer.
  const chooseInner = (
    <>
      <span>Choose Pro</span>
      <span className="mi-go hm-close-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 17L17 7M8 7h9v9" />
        </svg>
      </span>
    </>
  )
  const closePro = isPro || outage ? null : !live ? (
    // Checking the price: the button holds its place and links nowhere.
    <button type="button" className="hm-close-cta" aria-disabled="true">{chooseInner}</button>
  ) : (
    <Link
      className="hm-close-cta"
      to={proTo}
      aria-disabled={proBusy ? 'true' : undefined}
      onClick={openPro}
    >
      {chooseInner}
    </Link>
  )

  // Free's card is placed in the markup by `proFirst`: Pro first when it has an
  // action and the cards are stacked (its switch and button are the first thing a
  // keyboard reaches, and it is first on the phone and tablet), Free first
  // otherwise. Side by side, the grid seats Free left in either order.
  const freeCard = (
    <div key="free" className="hpl-card hpl-free">
      <div className="pa-planrow">
        <h2 className="hpl-plan">Free</h2>
        {user && !isPro && !subLoading && <span className="pa-tag pa-tag--free">Your plan</span>}
      </div>
      <p className="hpl-amount">{freeAmount}</p>
      <p className="hpl-note pa-freenote">You don’t need a card, and there’s no time limit.</p>
      <FreeList live={EXPORT_THEMES_LIVE} />
      <div className="hpl-freefoot">
        {/* The toolkit opens without a sign-up gate and lands on the workspace. */}
        <Link ref={freeGoRef} className="hpl-btn hpl-ghost ui-pill-out" to="/projects">Open the toolkit</Link>
        {!user && <p>You don’t need an account to start.</p>}
      </div>
    </div>
  )

  const showSwitch = !isPro && state !== 'no-currency'
  const showPill = live && !isPro
  const stickyPro = stuck && showPill ? `Pro · ${liveAmount} a month, billed ${BILLED_EVERY[offer.id]}` : 'Pro'
  const pillOn = stuck && showPill

  // The same card, built once so the pair can seat it before or after Free (see `proFirst`).
  const proCard = (
    <div key="pro" className="hpl-card hpl-pro pa-pro">
      <span className="hpl-edge" aria-hidden="true" />
      <div className="pa-pro-grid">
        <div className="pa-pro-top">
          <div className="pa-proline">
            <div className="pa-planrow">
              <h2 className="hpl-plan">Pro</h2>
              {isPro && <span className="pa-tag pa-tag--pro">Your plan</span>}
            </div>
            {showSwitch && (
              <div className="pl-switch" role="radiogroup" aria-label="Billing">
                {offers.map((o, index) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    ref={(node) => { segRefs.current[o.id] = node }}
                    className={`pl-seg${billing === o.id ? ' pl-on' : ''}`}
                    aria-checked={billing === o.id}
                    tabIndex={billing === o.id ? 0 : -1}
                    onClick={() => chooseBilling(o.id)}
                    onKeyDown={(event) => onSegKey(event, index)}
                  >
                    {o.saving > 0 ? `${o.label} · Save ${o.saving}%` : o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isPro && <p className="pa-active">Pro is active on this account.</p>}
          <p className="hpl-tagline">The full studio, white-labelled.</p>
          <p key={fxKey} className={`pa-price${fx}${hidePrice ? ' pa-price--hold' : ''}`} aria-live="polite">
            {!hidePrice && <span className={priceSize}>{live ? liveAmount : stateCopy.word}</span>}
            {live && !hidePrice && <span className="pa-per">{offer.months > 1 ? `a month, billed ${BILLED_EVERY[offer.id]}` : 'a month'}</span>}
          </p>
        </div>
        <div key={`slot-${fxKey}`} className={`pa-slot${detailMin}${fx}`} id={outage ? 'pricing-noprice' : undefined}>
          <p>{detail1}</p>
          <p>{detail2}</p>
        </div>
        <PlanFigure />
        <div className={`pa-act${hasAction ? '' : ' pa-act--none'}`} ref={actRef}>
          {hasAction && <div className="pa-cta">{proCta}</div>}
          <div key={`foot-${fxKey}`} className={`pa-foot${fx}`}>
            <p>{foot1}</p>
            <p>{foot2}</p>
          </div>
        </div>
      </div>
      <ProList live={EXPORT_THEMES_LIVE} collapsed={!allRows} />
      <button
        type="button"
        className="hpl-more"
        aria-expanded={allRows}
        aria-controls="pp-prolist"
        onClick={() => setAllRows((value) => !value)}
      >
        {allRows ? 'Show fewer' : `Show all ${PRO_ROWS.length} Pro features`}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  )

  return (
    <div className="spectrum pricing" ref={rootRef}>
      {/* The marketing nav, exactly as `/` mounts it. */}
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />

      <main id="main" tabIndex={-1}>
        <header className="pa-wrap pa-head">
          <h1 className="pa-h1" id="pricing-h1">{HEADLINE}</h1>
          <p className="pa-lead">{HERO_LEAD}</p>
        </header>

        <div className="pa-wrap">
          <div className="hpl pa-hpl">
            <div className={`pa-pair${hasAction ? '' : ' pa-pair--ff'}`}>
              {proFirst ? [proCard, freeCard] : [freeCard, proCard]}
            </div>
          </div>

          <section className="pl-panel" aria-labelledby="pl-tbl-h">
            <h2 id="pl-tbl-h" className="sr-only">Every limit</h2>
            <table className="pl-t">
              <caption className="sr-only">Free and Pro compared</caption>
              <thead>
                <tr>
                  <th scope="col">What you get</th>
                  <th scope="col" className="pl-ink">Free</th>
                  <th scope="col" className="pl-ink">
                    <div className="pl-headpro">
                      <span key={`head-${fxKey}`} className={`pl-headlabel${stuck && showPill ? ' pl-headlabel--price' : ''}${fx}`}>{stickyPro}</span>
                      {/* Only a live price may link to checkout; every other state, and a Pro account, has no pill in the markup. */}
                      {showPill && (
                        <Link
                          className={`pl-pill${pillOn ? ' is-on' : ''}`}
                          to={proTo}
                          onClick={openPro}
                          aria-hidden={pillOn ? undefined : 'true'}
                          tabIndex={pillOn ? 0 : -1}
                        >
                          {label}
                        </Link>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              {PRO_VALUE.map((group) => {
                const art = groupArt(group.group)
                return (
                  <tbody key={group.group}>
                    <tr>
                      <th scope="rowgroup" colSpan={3} className="pl-gh">
                        <span className="pl-ghin">
                          {art && (
                            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={art.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d={art.d} />
                            </svg>
                          )}
                          {group.group}
                        </span>
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr className="pl-r" key={row.label}>
                        <th scope="row" className="pl-l">{row.label}</th>
                        <td className="pl-f"><FreeValue row={row} /></td>
                        <td className="pl-p"><ProValue row={row} /></td>
                      </tr>
                    ))}
                  </tbody>
                )
              })}
              <tbody className="pl-same">
                <tr>
                  <th scope="row">Same on both plans</th>
                  <td colSpan={2}><p>{SAME_ON_BOTH}</p></td>
                </tr>
              </tbody>
            </table>
            {/* Under 1200 the table gives way to one stack per group: the label, then Free and Pro on their own lines. */}
            <div className="pl-stack">
              {PRO_VALUE.map((group, gi) => {
                const art = groupArt(group.group)
                return (
                  <section key={group.group} aria-labelledby={`pl-sg-${gi}`}>
                    <h3 id={`pl-sg-${gi}`} className="pl-sh">
                      {art && (
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={art.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d={art.d} />
                        </svg>
                      )}
                      {group.group}
                    </h3>
                    <dl>
                      {group.rows.map((row) => (
                        <div className="pl-srow" key={row.label}>
                          <dt>{row.label}</dt>
                          <dd className="pl-val pl-val--free">
                            <span className="pl-vl">Free</span>
                            <span className="pl-vv"><FreeValue row={row} /></span>
                          </dd>
                          <dd className="pl-val pl-val--pro">
                            <span className="pl-vl">Pro</span>
                            <span className="pl-vv"><ProValue row={row} /></span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )
              })}
              <section className="pl-ssame" aria-labelledby="pl-same-h">
                <h3 id="pl-same-h">Same on both plans</h3>
                <p>{SAME_ON_BOTH}</p>
              </section>
            </div>
          </section>
        </div>

        <section className="pa-wrap pa-faq" aria-labelledby="pl-faq-h">
          <div className="pa-faq-grid">
            <h2 id="pl-faq-h" className="pa-h2">Common questions</h2>
            <div>
              {FAQS.map((f, i) => {
                const expanded = !!open[i]
                return (
                  <div className={`pl-item${i === FAQS.length - 1 ? ' pl-endq' : ''}`} key={f.q}>
                    <h3>
                      <button
                        type="button"
                        className="pl-q"
                        id={`pl-q-${i}`}
                        aria-expanded={expanded}
                        aria-controls={`pl-a-${i}`}
                        onClick={() => setOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                      >
                        <span>{f.q}</span>
                        <svg className="pl-pm" aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2.5 8h11" />
                          <path className="pl-pmv" d="M8 2.5v11" />
                        </svg>
                      </button>
                    </h3>
                    <div id={`pl-a-${i}`} role="region" aria-labelledby={`pl-q-${i}`} hidden={!expanded} className="pl-ans"><p>{f.a}</p></div>
                  </div>
                )
              })}
              {/* "ask support" is the feedback form, the one place a question reaches the team. */}
              <div className="pa-more">
                <p className="pa-more-h">Something else?</p>
                <p className="pa-more-p">
                  If yours isn’t here, <Link className="hpl-link pa-help" to="/feedback">ask support</Link> and we’ll add it to this list.
                </p>
              </div>
            </div>
          </div>
        </section>

        <HomeFinalCall
          toolkitTo="/projects"
          heading={`Start with all ${numberWord(TOOL_COUNT)} tools.`}
          lead={`Free is ${freeAmount}. Pro raises the limits and removes the “Made with UI L4B” line.`}
          actions={(
            <>
              <Link className="hm-close-ghost ui-pill-out" to="/projects">Open the toolkit</Link>
              {closePro}
            </>
          )}
        />
      </main>

      {barKind && (
        <aside className="pl-bar" data-on={barOn ? 'true' : 'false'} aria-label={barKind === 'toolkit' ? 'Toolkit' : 'Pro plan'}>
          {barKind === 'price' && (
            <>
              <div key={`bar-${fxKey}`} className={`pl-bar-text${fx}`}>
                <p className="pl-bar-top"><span className="pl-bar-pro">Pro · </span>{liveAmount} a month</p>
                <p className="pl-bar-sub">{offer.months > 1 ? `${liveTotal} billed ${BILLED_EVERY[offer.id]}` : `billed ${BILLED_EVERY[offer.id]}`}</p>
              </div>
              <Link className="pl-bar-go" to={proTo} onClick={openPro} tabIndex={barOn ? 0 : -1}>
                <span key={`bar-label-${fxKey}`} className={fx.trim() || undefined}>{label}</span>
              </Link>
            </>
          )}
          {barKind === 'action' && (
            <button
              type="button"
              className="hm-close-ghost ui-pill-out pl-bar-ghost"
              onClick={proCta.props.onClick}
              aria-busy={state === 'retrying' ? 'true' : undefined}
              tabIndex={barOn ? 0 : -1}
            >
              {stateCopy.button}
            </button>
          )}
          {barKind === 'toolkit' && (
            <Link className="hm-close-ghost ui-pill-out pl-bar-ghost" to="/projects" tabIndex={barOn ? 0 : -1}>Open the toolkit</Link>
          )}
        </aside>
      )}

      <SpectrumFooter toolkitTo="/projects" home pageColumn={false} />
    </div>
  )
}
