import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { AI_LIMITS, FREE_SAVE_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { usePriceRetry, usePrices, useProPrice } from '../hooks/usePrices'
import useMediaQuery from '../hooks/useMediaQuery'
import { APPROVED_CURRENCY, formatMoney } from '../config/planLadder'
import { COLOUR_SYSTEMS } from '../config/colourSystems'
import { freeFormats } from '../config/exportFormats'
import { TOOL_COUNT, numberWord } from '../components/spectrum/spectrumFacts'
// The offers, cadences and billed lines live in one module that every surface
// describing Free and Pro reads: Settings, Checkout and the upgrade modal too.
import {
  BILLED_EVERY, BILLING_OPTIONS, DEFAULT_BILLING, FREE_EXCLUSION, FREE_EXPORT_NAMES, PRO_EXPORT_NAMES, PRO_POINTS, PRO_VALUE,
  UNCREDITED_EXPORT_NAMES, canCheckout, perMonth, priceState, priceStateCopy, resolveOffers,
} from '../config/planFacts'
// The page's own sheet, every selector under `.pricing`. Imported here so it
// rides this lazy route's chunk. The Spectrum ground, the colour band and the
// footer are styled by spectrum.css, which `/` already loads in the entry.
import '../styles/pages/pricing.css'

// ═════════════════════════════════════════════════════════════════════════════
// PRICING — /plans. Two layouts over one set of facts.
//
// From 1024px up it is the plan ledger: Free and Pro are two columns of one
// comparison. The price, the billing switch and every difference sit in one
// table, and the one accent on the page is the Pro button.
// Reading order: headline, the ledger (billing, plan heads, the rows where the
// plans differ, one line for what is the same), the questions, the colour band,
// the footer.
//
// Below 1024px it is the offer first: headline, the billing switch, the Pro
// card (price, billed line, trial line, button, what Pro adds), the Free row,
// the three-column comparison, the questions as an accordion and a closing band
// whose Pro button goes straight to checkout. A plan bar docks to the bottom
// while the Pro button is off screen.
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
const SYSTEMS_TOTAL = COLOUR_SYSTEMS.length

const FREE_EXPORTS = freeFormats()

// The page headline, on both billing states. One constant, so Monthly and
// Yearly cannot end up with different wording.
const HEADLINE_LEAD = 'Improve your design systems for less than 1 cup of'
const HEADLINE_TAIL = 'per month.'

// A takeaway cup, drawn inline: the icon set has no coffee glyph.
function TakeawayCup() {
  return (
    <svg className="pr-h1-cup" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6h14" />
      <path d="M6.5 3.5h11L19 6" />
      <path d="M5 6l1.6 14.5h10.8L19 6" />
      <path d="M5.8 11h12.4" />
    </svg>
  )
}

// The sub-line leads with what Pro opens, then the ceilings. "Six times" would
// be true of the daily limit and false of the monthly one (300 against 40), so
// it quotes both ends of the daily limit instead of a multiple.
const HERO_SUB = `Pro opens all ${numberWord(SYSTEMS_TOTAL)} colour systems and every icon pack and library, lifts AI from ${AI.free.daily} to ${AI.pro.daily} generations a day, and takes the UIL4B line off your exports.`

const CANCEL_LINE = 'Cancel Pro any time. Keep every export you made.'
const OFFER_BY_ID = Object.fromEntries(BILLING_OPTIONS.map((o) => [o.id, o]))

// Where the docked plan bar takes over from the sticky top bar: below this the
// Pro column is too narrow to hold a price and a button.
const DOCK_QUERY = '(max-width: 1359px)'
// The ledger needs three columns; below this width the page uses the offer-first
// layout, which is a different tree rather than the same one restyled.
const LEDGER_QUERY = '(min-width: 1024px)'
// The nav's height, and the room the docked bar needs above the closing band.
const BAR_CLEAR_PX = 64
const BAR_END_PX = 80

// The comparison. Only rows where the plans differ; whatever matches is the
// single "Same on both plans" row below. The groups and rows are planFacts'
// PRO_VALUE, which quotes each limit from the module that enforces it.
const COMPARE = PRO_VALUE

const SAME_ON_BOTH = `All ${numberWord(TOOL_COUNT)} tools. Style guide exports in ${FREE_EXPORT_NAMES}, as often as you like. The same AI model. Files stay in your browser.`

// The offer with a free trial and the one without, from the ladder.
const TRIAL_OFFER = BILLING_OPTIONS.find((o) => o.trialDays)
const PLAIN_OFFER = BILLING_OPTIONS.find((o) => !o.trialDays)

// The questions, in the order a buyer asks them. Both layouts read this array.
const FAQS = [
  {
    q: 'When am I charged?',
    a: `${TRIAL_OFFER.label} starts with a ${TRIAL_OFFER.trialDays}-day free trial, so nothing is charged today; the first payment is taken when the trial ends. ${PLAIN_OFFER.label} has no trial, so the first payment is taken today. Pro then renews each month or year until you cancel.`,
  },
  {
    q: 'How do I cancel?',
    a: 'Open Settings, then Subscription, and choose Cancel plan. Stripe’s billing page opens to confirm it. Pro stays on until the end of the period you’ve paid for, and Settings shows the date it ends.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Cancelling stops the next payment. It doesn’t refund the period you’re in, and you keep Pro until that period ends. Cancel during the free trial and you’re never charged. If you think a charge is wrong, ask support.',
  },
  {
    q: 'Where are my receipts?',
    a: 'In Settings, then Subscription, choose Manage billing. It opens your Stripe billing page with your payment history. If you can’t find what you need there, ask support.',
  },
  {
    q: 'Do prices include tax?',
    a: 'Checkout shows the exact amount before you pay, and that’s what you’re charged. For a tax invoice, ask support.',
  },
  {
    q: 'What happens to my work if Pro ends?',
    a: `Every file you exported is yours: it’s on your computer. Your account stays, and Free’s limits apply from then on: ${FREE_SAVE_LIMITS.projects} saved projects, ${FREE_SAVE_LIMITS.customIcons} custom icons, ${AI.free.daily} AI generations a day, and the UIL4B line on new exports.`,
  },
  {
    q: 'What counts as one generation?',
    a: 'One image described by the Alt Text generator, or one prompt produced by an AI tool. Browsing, editing palettes, building type scales, exporting a style guide and everything else in the toolkit are unmetered, because they run in your browser.',
  },
  {
    q: 'Is the Pro model different?',
    a: 'No. Both plans run the same model. Pro raises the daily and monthly ceiling, nothing else about the output changes.',
  },
  {
    q: 'Do my files get uploaded?',
    a: 'Most image and video work runs in the browser. The AI features are the exception: the Alt Text Generator sends your image to an AI provider, and prompt writing sends your text.',
  },
  {
    q: 'Which export formats can I actually get?',
    a: `${FREE_EXPORTS.length} on Free: ${FREE_EXPORT_NAMES}. All but ${UNCREDITED_EXPORT_NAMES} carry a small “Made with UIL4B” line. Pro removes that line and adds ${PRO_EXPORT_NAMES}.`,
  },
]

// The billed line under the Pro price, per offer. A cadence over one month
// states its own total and how often it bills, in the words the card uses at
// every width and with no other cadence's price beside it; the one-month
// cadence says whether it carries a trial.
function billedLine(offer) {
  if (offer.months > 1) {
    if (!offer.totalLabel) return ''
    return `${cardLines(offer).billed}.`
  }
  return offer.trialDays
    ? `Billed monthly after a ${offer.trialDays}-day free trial.`
    : `Billed monthly. No free trial on ${offer.label}; billing starts today.`
}

// The unit a cadence bills per, from the months it covers.
const unitOf = (offer) => (offer.months === 12 ? 'year' : 'month')

// The line under the Pro button: the trial's terms when the cadence has one,
// otherwise what the best cadence works out at. That second line is only said
// when the best cadence can be bought in the page's currency (`bestLive`); a
// fallback amount would point the visitor at something they cannot choose, so
// the line stays empty and its slot keeps its height.
function underLine(offer, bestOffer, bestLive) {
  if (offer.trialDays && offer.totalLabel) return `Free for ${offer.trialDays} days, then ${offer.totalLabel} a ${unitOf(offer)}.`
  if (bestLive && bestOffer?.amountLabel && bestOffer.id !== offer.id) return `${bestOffer.label} works out at ${bestOffer.amountLabel} a month.`
  return ''
}

// The Pro card's two lines above the button: what is billed, and the trial's
// terms (or the plain fact that this cadence has none).
function cardLines(offer) {
  return {
    billed: `${offer.totalLabel} billed ${BILLED_EVERY[offer.id]}`,
    trial: offer.trialDays
      ? `${offer.trialDays}-day free trial, then ${offer.totalLabel} a ${unitOf(offer)}`
      : 'No free trial; billing starts today.',
  }
}

// Every row of the comparison, group labels dropped: the phone table has no
// group rows, so the order is the ledger's.
const COMPARE_ROWS = COMPARE.flatMap((group) => group.rows)

const ctaLabel = (offer) => (offer.trialDays ? `Start ${offer.trialDays}-day free trial` : 'Upgrade to Pro')

export default function Pricing() {
  const { user, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const navigate = useNavigate()
  const { isPro, loading: subLoading } = useSubscription()
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
  const [barOn, setBarOn] = useState(false)
  const ledger = useMediaQuery(LEDGER_QUERY)
  const headRef = useRef(null)
  const ctaRef = useRef(null)
  const endRef = useRef(null)
  const rampRef = useRef(null)
  // Set when a recovery action replaces the Pro button, so focus follows the swap.
  const keepCtaFocus = useRef(false)

  // The live prices. useProPrice() knows whether the price service answered;
  // usePrices() is the same cache read raw, which resolveOffers needs.
  const price = useProPrice()
  const { prices } = usePrices()
  const { retrying, retry } = usePriceRetry()
  const currency = price.currency
  const { offers } = resolveOffers({ prices, currency, loaded: price.loaded })
  const offer = offers.find((o) => o.id === billing) || offers[0]
  // ONE STATE decides every price word and whether any button may reach
  // checkout: only 'live' does (planFacts.js priceState).
  const state = priceState({ price, offers, selectedId: billing, retrying })
  const live = canCheckout(state)
  const outage = state === 'unreachable' || state === 'no-currency' || state === 'cadence-missing'
  // When another cadence still has a price the service did answer, and only the
  // selected cadence is unavailable; the note says which.
  const otherOffer = offers.find((o) => o.id !== offer.id && o.amountLabel)
  const stateCtx = { currencyLabel: price.currencyLabel, selectedLabel: offer.label, otherLabel: otherOffer?.label || offers.find((o) => o.id !== offer.id)?.label }
  const stateCopy = priceStateCopy(state, stateCtx)
  const freeAmount = formatMoney(0, currency)

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

  // The plan bar repeats the Pro button once the real one has scrolled out of
  // sight. From 1360 it pins under the nav when the header row leaves. From 1024
  // to 1359 (the ledger) it docks to the bottom when the Pro button leaves and
  // drops again as the closing colour band comes into view, which would otherwise
  // paint over it. Below 1024 (the offer-first layout) it docks the same way but
  // drops when the closing section comes into view, so it never sits over the
  // closing buttons. It reads positions on scroll rather than
  // watching for intersections, because a jump past the button (an anchor, a
  // restored scroll) crosses nothing an observer would report.
  const barEnabled = !isPro && !proBusy && live
  useEffect(() => {
    if (!barEnabled) return undefined
    const narrow = window.matchMedia(DOCK_QUERY)
    let frame = 0
    const update = () => {
      frame = 0
      const head = headRef.current?.getBoundingClientRect()
      const cta = ctaRef.current?.getBoundingClientRect()
      const end = endRef.current?.getBoundingClientRect()
      const ramp = rampRef.current?.getBoundingClientRect()
      if (!head || !cta || !end || !ramp) return
      const clear = BAR_CLEAR_PX
      const headGone = head.bottom < clear
      const ctaGone = cta.bottom < clear
      if (!narrow.matches) {
        setBarOn(headGone)
      } else if (ledger) {
        setBarOn(ctaGone && ramp.top >= window.innerHeight)
      } else {
        setBarOn(ctaGone && end.top >= window.innerHeight - BAR_END_PX)
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    narrow.addEventListener('change', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      narrow.removeEventListener('change', schedule)
    }
  }, [barEnabled, ledger])

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

  // A repeat of the Pro button, so it is hidden from assistive tech and keyboard
  // users; they reach the real one.
  const bar = (
    <div className={`pr-bar${barEnabled && barOn ? ' is-on' : ''}`} aria-hidden="true">
      <span className="pr-bar-lead">Compare plans</span>
      <span className="pr-bar-free"><span className="pr-bar-name">Free</span> <span className="pr-bar-amt">{freeAmount}</span></span>
      <span className="pr-bar-pro">
        <span className="pr-bar-price">
          <span className="pr-bar-name">Pro<span className="pr-bar-bill"> · billed {BILLED_EVERY[offer.id]}</span></span>
          <span className="pr-bar-amt">{live ? `${offer.amountLabel} / month` : ''}</span>
        </span>
        {live && !isPro
          ? <Link className="pr-bar-btn" to={proTo} tabIndex={-1} onClick={openPro}>{label}</Link>
          : <span className="pr-bar-btn">{label}</span>}
      </span>
    </div>
  )

  let proCta
  if (isPro) {
    proCta = (
      <Link ref={ctaRef} className="pr-cta pr-cta--pro" to="/settings" state={{ section: 'support' }}>
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
        className="pr-cta pr-cta--pro"
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
        className="pr-cta pr-cta--pro"
        to={proTo}
        aria-disabled={proBusy ? 'true' : undefined}
        onClick={openPro}
      >
        {label}
      </Link>
    )
  } else {
    // Loading, retrying, unreachable, no-currency: no link to checkout. This is
    // one button in every one of those states, so it keeps focus through a
    // Retry, and it holds the Pro button's place while the price is checked.
    const waiting = state === 'loading' || state === 'retrying'
    proCta = (
      <button
        type="button"
        ref={ctaRef}
        className="pr-cta pr-cta--pro"
        aria-describedby={outage ? 'pricing-noprice' : undefined}
        aria-disabled={waiting ? 'true' : undefined}
        aria-busy={state === 'retrying' ? 'true' : undefined}
        onClick={() => { if (waiting) return; keepCtaFocus.current = true; retry() }}
      >
        {waiting ? (stateCopy.button || label) : stateCopy.button}
      </button>
    )
  }

  // Every state's note sits in one grid cell and the inactive ones are hidden,
  // so the slot is always as tall as the tallest note and nothing moves when the
  // switch is used or the price arrives. Until the live price lands, the hidden
  // notes are sized with the ladder's fallback amounts, shown as the approved USD
  // amounts the way resolvePlanLadder quotes them, never as the visitor's
  // currency. On a page in another currency they carry "US$", so a bare "$"
  // never reads as the page's own dollar.
  const qualify = currency !== APPROVED_CURRENCY
  const sized = offers.map((o) => {
    const fallback = OFFER_BY_ID[o.id]
    return {
      ...o,
      totalLabel: o.totalLabel || formatMoney(fallback.approvedTotal, APPROVED_CURRENCY, { qualify }),
      amountLabel: o.amountLabel || formatMoney(perMonth(fallback.approvedTotal, fallback.months), APPROVED_CURRENCY, { qualify }),
    }
  })
  const sizedBest = sized.find((o) => o.id === DEFAULT_BILLING)
  const bestLive = !!offers.find((o) => o.id === DEFAULT_BILLING)?.amountLabel
  // Every outage state's words sit in the same stack as hidden notes, so the slot
  // is as tall as the tallest and the Pro button does not move when the state
  // changes. The words come from PRICE_STATE_COPY, the one place they live.
  const OUTAGE_STATES = ['unreachable', 'no-currency', 'cadence-missing']
  const outageCopy = Object.fromEntries(OUTAGE_STATES.map((id) => [id, priceStateCopy(id, stateCtx)]))
  const noteStates = [
    ...sized.map((o) => ({
      id: o.id,
      lines: [billedLine(o), CANCEL_LINE].filter(Boolean),
      under: underLine(o, sizedBest, bestLive),
    })),
    ...OUTAGE_STATES.map((id) => ({ id, lines: [outageCopy[id].line1, outageCopy[id].line2], under: outageCopy[id].under })),
    { id: 'loading', lines: [priceStateCopy('loading').line1], under: '' },
  ]
  const activeNote = state === 'retrying' ? 'loading' : live ? offer.id : state

  // The offer-first layout's two lines above the Pro button, sized the same way:
  // every state shares one cell, so nothing moves when the switch is used.
  const cardStates = [
    ...sized.map((o) => ({ id: o.id, ...cardLines(o) })),
    ...OUTAGE_STATES.map((id) => ({ id, billed: outageCopy[id].line1, trial: outageCopy[id].line2 })),
    { id: 'loading', billed: priceStateCopy('loading').line1, trial: '' },
  ]

  // The saving, derived from the ladder and never typed. It reads the
  // same on both cadences and names the one that saves, so a monthly arrival
  // still sees it.
  const savingOffer = offers.find((o) => o.id === DEFAULT_BILLING)
  const savingLine = !price.loaded || !(savingOffer?.saving > 0) ? ''
    : billing === savingOffer.id ? `You save ${savingOffer.saving}% a year` : `${savingOffer.label} saves ${savingOffer.saving}%`

  // The closing "Choose Pro" is the same destination as the Pro button, so a
  // visitor at the end of the page is one tap from checkout on the cadence they
  // selected. A Pro account has nothing to buy and a missing price means no offer.
  const closePro = isPro || outage ? null : !live ? (
    // Checking the price: the button holds its place and links nowhere.
    <button type="button" className="pr-cta pr-cta--pro" aria-disabled="true">Choose Pro</button>
  ) : (
    <Link
      className="pr-cta pr-cta--pro"
      to={proTo}
      aria-disabled={proBusy ? 'true' : undefined}
      onClick={openPro}
    >
      Choose Pro
    </Link>
  )

  const billingSwitch = (nameProps, withSaving) => (
    // Two options, one tab stop; the arrow keys move the choice.
    <div className="pr-billing" role="radiogroup" {...nameProps}>
      {offers.map((o) => (
        <label className="pr-billing-opt" key={o.id}>
          <input
            type="radio"
            className="pr-billing-input"
            name="pricing-billing"
            value={o.id}
            checked={billing === o.id}
            onChange={() => chooseBilling(o.id)}
          />
          <span className="pr-billing-text">
            {o.label}
            {withSaving && o.saving > 0 && <span className="pr-billing-save"> · Save {o.saving}%</span>}
          </span>
        </label>
      ))}
    </div>
  )

  return (
    <div className="spectrum pricing">
      {/* The marketing nav, exactly as `/` mounts it. */}
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />

      <main id="main" tabIndex={-1}>
        <section id="pricing" className="pr-hero pr-shell" aria-labelledby="pricing-h1">
          <h1 className="pr-h1" id="pricing-h1">{HEADLINE_LEAD}{' '}<span className="pr-h1-nowrap">coffee{' '}<TakeawayCup /></span>{' '}{HEADLINE_TAIL}</h1>
          <p className="pr-sub">{HERO_SUB}</p>
        </section>

        {ledger ? (
          <>
        <section className="pr-ledger-sec pr-shell" aria-label="Plans compared">
          <div className="pr-ledger">
            {bar}

            <table className="pr-table" role="table">
              <caption className="sr-only">Free and Pro compared</caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader" className="sr-only">What you get</th>
                  <th scope="col" role="columnheader" className="sr-only">Free</th>
                  <th scope="col" role="columnheader" className="sr-only">Pro</th>
                </tr>
              </thead>

              <tbody role="rowgroup">
                <tr role="row" className="pr-headrow">
                  <td role="cell" className="pr-c pr-c--label pr-head pr-head--billing">
                    <span className="pr-k" id="pricing-billing-k">Billing</span>
                    {billingSwitch({ 'aria-labelledby': 'pricing-billing-k' }, true)}
                    <span className="pr-cur">{price.loaded && <><span className="pr-cur-pre">Prices in </span>{price.currencyLabel}.</>}</span>
                  </td>

                  <td role="cell" className="pr-c pr-c--free pr-head pr-head--free">
                    <div className="pr-plan">
                      <span className="pr-plan-name">Free</span>
                      {user && !isPro && !subLoading && <span className="pr-plan-tag">Your plan</span>}
                    </div>
                    <p className="pr-price">
                      <span className="pr-amt">{freeAmount}</span>
                      <span className="pr-per">forever</span>
                    </p>
                    <p className="pr-note">Free because most tools run in your browser.</p>
                    {/* The toolkit opens without a sign-up gate and lands on the workspace. */}
                    <Link className="pr-cta pr-cta--free" to="/projects">Open the toolkit</Link>
                    <span className="pr-under">No account needed</span>
                  </td>

                  <td role="cell" className="pr-c pr-c--pro pr-head pr-head--pro" ref={headRef}>
                    <div className="pr-plan">
                      <span className="pr-plan-name">Pro</span>
                      {isPro && <span className="pr-plan-tag">Your plan</span>}
                    </div>
                    <div aria-live="polite">
                      <div key={switched ? billing : 'first'} className={`pr-swap${switched ? ' is-swapped' : ''}`}>
                        <p className="pr-price">
                          <span className={`pr-amt${outage ? ' is-word' : ''}`}>
                            {live ? offer.amountLabel : stateCopy.word}
                          </span>
                          {live && <span className="pr-per">/ month</span>}
                        </p>
                        <div className="pr-stack">
                          {noteStates.map((state) => (
                            <p
                              key={state.id}
                              className={`pr-note${state.id === activeNote ? '' : ' is-ghost'}`}
                              id={outage && state.id === activeNote ? 'pricing-noprice' : undefined}
                              aria-hidden={state.id === activeNote ? undefined : 'true'}
                            >
                              {state.lines.map((line) => <span key={line}>{line}</span>)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                    {proCta}
                    <div className="pr-stack pr-stack--under">
                      {noteStates.map((state) => (
                        <span
                          key={state.id}
                          className={`pr-under${state.id === activeNote ? '' : ' is-ghost'}`}
                          aria-hidden={state.id === activeNote ? undefined : 'true'}
                        >
                          {state.under}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>

              {COMPARE.map((group, groupIndex) => (
                <tbody key={group.group} role="rowgroup" className="pr-group">
                  <tr role="row" className="pr-grouprow">
                    <th scope="rowgroup" role="rowheader" className="pr-c pr-c--label pr-c--group">{group.group}</th>
                    <td role="cell" className="pr-c pr-c--free pr-c--blank" />
                    <td role="cell" className="pr-c pr-c--pro pr-c--blank" />
                  </tr>
                  {group.rows.map((row, rowIndex) => {
                    const last = groupIndex === COMPARE.length - 1 && rowIndex === group.rows.length - 1
                    return (
                      <tr role="row" className="pr-row" key={row.label}>
                        <th scope="row" role="rowheader" className="pr-c pr-c--label">{row.label}</th>
                        <td role="cell" className="pr-c pr-c--free">
                          <span className="pr-tag" aria-hidden="true">Free</span>
                          {row.free === null
                            ? <span className="pr-none"><span aria-hidden="true">–</span><span className="sr-only">Not included</span></span>
                            : row.free}
                        </td>
                        <td role="cell" className={`pr-c pr-c--pro${last ? ' is-last' : ''}`}>
                          <span className="pr-tag" aria-hidden="true">Pro</span>
                          {row.pro}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))}

              <tbody role="rowgroup" className="pr-group pr-group--same">
                <tr role="row" className="pr-row pr-row--same">
                  <th scope="row" role="rowheader" className="pr-c pr-c--label pr-c--group">Same on both plans</th>
                  <td role="cell" colSpan={2} className="pr-c pr-c--same">{SAME_ON_BOTH}</td>
                </tr>
              </tbody>
            </table>

            <div className="pr-foot" ref={endRef}>
              <p>Secure checkout by Stripe.</p>
            </div>
          </div>
        </section>

        <section className="pr-faq-sec pr-shell" aria-labelledby="pricing-faq-h">
          <div className="pr-faq">
            <h2 className="pr-h2" id="pricing-faq-h">Common questions</h2>
            {FAQS.map((f) => (
              <div className="pr-faq-row" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            {/* "ask support" is the feedback form, the one place a question reaches the team. */}
            <div className="pr-faq-row">
              <h3>Something else?</h3>
              <p>
                If yours isn’t here, <Link to="/feedback">ask support</Link> and we’ll add it to this list.
              </p>
            </div>
          </div>
        </section>
          </>
        ) : (
          <>
            <section className="pr-offer pr-shell" aria-label="Plans">
              <div className="pr-offer-top">
                {billingSwitch({ 'aria-label': 'Billing' }, false)}
                <span className="pr-cur">{price.loaded && <><span className="pr-cur-pre">Prices in </span>{price.currencyLabel}.</>}</span>
              </div>

              {/* The same hooks as the ledger's Pro head, so a test reads either layout alike. */}
              <article className="pr-pro pr-head--pro" ref={headRef} aria-labelledby="pricing-pro-name">
                <div className="pr-pro-main">
                  <div className="pr-pro-top">
                    <h2 className="pr-plan" id="pricing-pro-name">
                      <span className="pr-plan-name">Pro</span>
                      {isPro && <span className="pr-plan-tag">Your plan</span>}
                    </h2>
                    <p className="pr-save">{savingLine}</p>
                  </div>
                  <div aria-live="polite">
                    <div key={switched ? billing : 'first'} className={`pr-swap${switched ? ' is-swapped' : ''}`}>
                      <p className="pr-price">
                        <span className={`pr-amt${outage ? ' is-word' : ''}`}>
                          {live ? offer.amountLabel : stateCopy.word}
                        </span>
                        {live && <span className="pr-per">/ month</span>}
                      </p>
                      <div className="pr-stack">
                        {cardStates.map((state) => (
                          <p
                            key={state.id}
                            className={`pr-note${state.id === activeNote ? '' : ' is-ghost'}`}
                            id={outage && state.id === activeNote ? 'pricing-noprice' : undefined}
                            aria-hidden={state.id === activeNote ? undefined : 'true'}
                          >
                            <span>{state.billed}</span>
                            {state.trial && <span>{state.trial}</span>}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  {proCta}
                  {!isPro && <span className="pr-under">{live ? CANCEL_LINE : stateCopy.under}</span>}
                </div>

                <div className="pr-pro-adds">
                  <h3 className="pr-pro-adds-h">Everything in Free, plus</h3>
                  <ul className="pr-ticks">
                    {PRO_POINTS.map((point) => (
                      <li key={point}>
                        <svg className="pr-tick" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                          <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              <div className="pr-free pr-head--free">
                <div className="pr-free-id">
                  <h2 className="pr-plan">
                    <span className="pr-plan-name">Free</span>
                    {user && !isPro && !subLoading && <span className="pr-plan-tag">Your plan</span>}
                  </h2>
                  <p className="pr-free-amt"><span className="pr-amt">{freeAmount}</span></p>
                </div>
                <p className="pr-free-says">
                  <span>All {numberWord(TOOL_COUNT)} tools. {AI.free.daily} AI generations a day, {AI.free.monthly} a month.</span>
                  <span>{FREE_SAVE_LIMITS.projects} saved projects · {FREE_SAVE_LIMITS.customIcons} custom icons · {FREE_EXCLUSION}</span>
                </p>
                {/* The toolkit opens without a sign-up gate and lands on the workspace. */}
                <Link className="pr-cta pr-cta--free" to="/projects">Open the toolkit</Link>
              </div>
            </section>

            <section className="pr-diff pr-shell" aria-labelledby="pricing-diff-h">
              <h2 className="pr-h2" id="pricing-diff-h">What you get on each plan</h2>
              <p className="pr-lede"><strong>Same on both plans.</strong> {SAME_ON_BOTH}</p>
              <table className="pr-dtable">
                <caption className="sr-only">Free and Pro compared</caption>
                <thead>
                  <tr>
                    <th scope="col">What you get</th>
                    <th scope="col">Free</th>
                    <th scope="col">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr className="pr-drow" key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td className={row.free === null ? 'is-none' : undefined}>{row.free === null ? 'Not included' : row.free}</td>
                      <td className="is-pro">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="pr-faq-sec pr-faq-sec--acc pr-shell" aria-labelledby="pricing-faq-h">
              <h2 className="pr-h2" id="pricing-faq-h">Common questions</h2>
              <div className="pr-qa-list">
                {FAQS.map((f, i) => (
                  <details className="pr-qa" key={f.q} open={i === 0}>
                    <summary>
                      <span>{f.q}</span>
                      <span className="pr-qa-mark" aria-hidden="true" />
                    </summary>
                    <p>{f.a}</p>
                  </details>
                ))}
                {/* "ask support" is the feedback form, the one place a question reaches the team. */}
                <p className="pr-qa-more">
                  If yours isn’t here, <Link to="/feedback">ask support</Link> and we’ll add it to this list.
                </p>
              </div>
            </section>

            <section className="pr-close pr-shell" ref={endRef} aria-labelledby="pricing-close-h">
              <div className="pr-close-copy">
                <h2 className="pr-h2" id="pricing-close-h">Start with all {numberWord(TOOL_COUNT)} tools.</h2>
                <p>Free is {freeAmount}. Choose Pro for higher limits and unmarked exports.</p>
              </div>
              <div className="pr-close-btns">
                <Link className="pr-cta pr-cta--free" to="/projects">Open the toolkit</Link>
                {closePro}
              </div>
              <p className="pr-close-fine">Secure checkout by Stripe.</p>
            </section>

            {/* The docked plan bar sits outside the flow, in its own stacking context. */}
            <div className="pr-ledger pr-ledger--dock">{bar}</div>
          </>
        )}

        <div ref={rampRef}>
          <SpectrumRamp className="sp-ramp--close" />
        </div>
      </main>

      <SpectrumFooter toolkitTo="/projects" />
    </div>
  )
}
