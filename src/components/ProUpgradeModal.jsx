import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { usePrices, refreshPrices } from '../hooks/usePrices'
import { detectCurrency } from '../utils/currency'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../config/plans'
import {
  resolvePlanLadder,
  purchasablePlans,
  cheapestPerMonth,
  savingsVsMonthly,
} from '../config/planLadder'
import useModalDialog from '../hooks/useModalDialog'
import ProHarmonyPreview from './ProHarmonyPreview'

// The Pro upgrade modal — a funnel surface, and the only one in the app.
//
// The founder's requirement, in order: clicking a Pro tool shows this popup ·
// the CTA is an Upgrade button · it shows the plans · the user can start a
// trial, which begins create-account → checkout.
//
// Three rules this file holds to, all from docs/reference/growth-persuasion.md:
//
//  1. The cost-per-month is the dominant number and the annualised total is
//     supporting text — because per-month is the figure a person compares, and
//     hiding the total would be the dishonest half of that trade.
//  2. Nothing here counts down, expires, or claims scarcity. There is no
//     "3 spots left", no timer, no invented testimonial. The previous version
//     of this modal carried five filled stars and "Loved by designers who'd
//     rather build than tab-hop" — fabricated social proof, guardrail 1, gone.
//  3. The trial is stated plainly: which plan carries it, how long it runs, and
//     the day money moves. src/pages/Checkout.jsx grants the trial on the
//     YEARLY plan only, so only the yearly CTA may say "trial".
//
// Prices come from src/config/planLadder.js — the single module — never typed
// into this file. Read its header before changing any amount.

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const DEFAULT_FEATURES = [
  `${AI_LIMITS.pro.daily} AI generations a day, ${AI_LIMITS.pro.monthly} a month`,
  `Unlimited saved projects (Free keeps ${FREE_SAVE_LIMITS.projects})`,
  'Pro colour tools — HCT editing, light + dark contrast repair',
  'Clean, watermark-free exports and full design JSON',
]

export default function ProUpgradeModal({ opts = {}, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const { prices, settled } = usePrices()
  const dialogRef = useModalDialog(onClose)
  const uid = useId()
  const [starting, setStarting] = useState(false)

  const {
    title = 'Unlock everything with Pro',
    subtitle = 'Keep every tool open and every export clean. Free stays free — Pro removes the ceiling.',
    eyebrow = 'UIL4B Pro',
    features = DEFAULT_FEATURES,
    // The exact colour the gate fired on, when the caller knows it. The rail
    // degrades to the last palette this browser worked on, then to the brand
    // accent, so nothing breaks when a caller passes nothing.
    seed,
  } = opts

  const currency = useMemo(() => detectCurrency(), [])
  const ladder = useMemo(
    () => resolvePlanLadder({ prices, currency }),
    [prices, currency],
  )
  const plans = useMemo(() => purchasablePlans(ladder), [ladder])
  const headline = useMemo(() => cheapestPerMonth(ladder), [ladder])

  // Default to the cheapest per-month plan, which is also the one carrying the
  // trial. Selecting it for the user is a convenience, not a trap: every other
  // plan is one click away and nothing is pre-ticked that costs more.
  const [choiceId, setChoiceId] = useState(() => headline?.id || 'yearly')
  const choice = plans.find((p) => p.id === choiceId) || plans[0] || null

  const priceUnavailable = settled && !prices
  const hasTrial = !!choice?.trialDays

  const goCheckout = async () => {
    if (!choice || starting) return
    setStarting(true)
    const destination = `/checkout?plan=${choice.checkoutPlan}`
    onClose()
    if (!user) {
      // "Start a trial" for a signed-out visitor means create an account first —
      // the founder's create-account → checkout order. Open the popup on the
      // SIGN-UP form, not sign-in, so the control does what it said.
      const u = await requireLogin('start your Pro plan', { signup: true })
      if (!u) return
      // A brand-new sign-up is intercepted into onboarding by App.jsx, which
      // would otherwise discard this checkout intent. Stash the destination so
      // onboarding resumes straight to checkout — including the chosen plan,
      // which a bare '/checkout' would have dropped.
      try { sessionStorage.setItem('vs-resume-after-onboarding', destination) } catch { /* ignore */ }
    }
    navigate(destination)
  }

  const seeAllPlans = () => { onClose(); navigate('/plans') }

  return (
    <div className="ui-modal-overlay" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="ui-modal ui-pro"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-sub`}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="ui-modal-x ui-pro-x" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="ui-pro-head">
          <span className="ui-pro-eyebrow">{eyebrow}</span>
          <h2 className="ui-pro-title" id={`${uid}-title`}>{title}</h2>
          <p className="ui-pro-sub" id={`${uid}-sub`}>{subtitle}</p>
        </div>

        {/* The right rail: the systems this subscription actually buys, drawn
            live from the user's own seed. Placed between the head and the body
            in DOM order so the single-column layout reads promise -> proof ->
            price, and grid-template-areas moves it to the right at width. */}
        <ProHarmonyPreview seed={seed} />

        <div className="ui-pro-body">
          {/* The headline rate. Computed from whichever plan is genuinely the
              cheapest per month — never typed, so it cannot drift from the
              tiles underneath it.

              It is suppressed outright when the price service is down. Rendered
              once against a dead /api/get-prices, this quoted the fallback
              ladder's "from $4/month" directly above "We couldn't load current
              prices just now" — two contradictory claims about money on the
              same screen. If we cannot say the real number, we say nothing. */}
          <p className="ui-pro-from" aria-live="polite" hidden={priceUnavailable}>
            {settled && headline?.perMonthLabel ? (
              <>
                <span className="ui-pro-from-lead">from</span>
                <span className="ui-pro-from-amount">{headline.perMonthLabel}</span>
                <span className="ui-pro-from-per">/month</span>
              </>
            ) : (
              <span className="sk ui-pro-from-skel"><span className="sr-only">Loading prices…</span></span>
            )}
          </p>

          <ul className="ui-pro-list">
            {features.map((f) => (
              <li className="ui-pro-li" key={f}>
                <span className="ui-pro-tick"><Tick /></span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {priceUnavailable ? (
            // Murphy's law: the price service can be down or the visitor offline.
            // Never guess an amount at the moment money is discussed — say so and
            // offer the retry, which refreshPrices() exists for.
            <div className="ui-pro-plans-err" role="alert">
              <p>We couldn&rsquo;t load current prices just now.</p>
              <div className="ui-pro-plans-err-acts">
                <button type="button" className="btn btn-s" onClick={() => refreshPrices()}>Try again</button>
                <button type="button" className="btn btn-s" onClick={seeAllPlans}>See all plans</button>
              </div>
            </div>
          ) : (
            <fieldset className="ui-pro-plans" disabled={!settled}>
              <legend className="sr-only">Choose a billing period</legend>
              {!settled && <span className="sk ui-pro-plans-skel" aria-hidden="true" />}
              {settled && plans.map((plan) => {
                const save = savingsVsMonthly(plan, ladder)
                return (
                  <label
                    key={plan.id}
                    className={'ui-pro-plan' + (choice?.id === plan.id ? ' is-chosen' : '')}
                    htmlFor={`${uid}-${plan.id}`}
                  >
                    <input
                      className="sr-only ui-pro-plan-input"
                      type="radio"
                      id={`${uid}-${plan.id}`}
                      name={`${uid}-plan`}
                      value={plan.id}
                      checked={choice?.id === plan.id}
                      onChange={() => setChoiceId(plan.id)}
                    />
                    <span className="ui-pro-plan-top">
                      <span className="ui-pro-plan-name">{plan.label}</span>
                      {save > 0 && <span className="ui-pro-plan-save">Save {save}%</span>}
                    </span>
                    <span className="ui-pro-plan-rate">
                      <span className="ui-pro-plan-amount">{plan.perMonthLabel}</span>
                      <span className="ui-pro-plan-per">/mo</span>
                    </span>
                    <span className="ui-pro-plan-total">
                      {plan.totalLabel} {plan.cadence}
                    </span>
                    {plan.trialDays > 0 && (
                      <span className="ui-pro-plan-trial">{plan.trialDays}-day free trial</span>
                    )}
                  </label>
                )
              })}
            </fieldset>
          )}

          {/* Say plainly what happens and when billing starts. Static text: no
              clock, no countdown, no "offer ends". */}
          {settled && choice && !priceUnavailable && (
            <ol className="ui-pro-steps" aria-label="What happens next">
              <li><strong>Today</strong> — create your account and confirm payment details.</li>
              {hasTrial ? (
                <>
                  <li><strong>Days 1&ndash;{choice.trialDays}</strong> — full Pro access. Nothing is charged.</li>
                  <li>
                    <strong>Day {choice.trialDays}</strong> — {choice.totalLabel} is charged, then {choice.cadence.replace('billed ', '')}.
                    Cancel any time before then and you pay nothing.
                  </li>
                </>
              ) : (
                <li><strong>Then</strong> — {choice.totalLabel} {choice.cadence}, starting today. Cancel any time from Settings.</li>
              )}
            </ol>
          )}

          {/* No CTA at all while prices are unavailable. A disabled "Upgrade
              to Pro" still makes an offer we cannot currently price; the error
              block above already carries the retry and the way out. */}
          {!priceUnavailable && (
            <>
              {/* One primary action, labelled for what it does rather than
                  for what it costs. "Get started free" used to sit here, which
                  contradicted the whole surface: this is the upgrade path.
                  The trial is stated in the steps above and again under the
                  button, not smuggled into the button label. */}
              <div className="ui-pro-cta">
                <button
                  type="button"
                  className="btn btn-accent btn-l"
                  onClick={goCheckout}
                  disabled={!choice || !settled || starting}
                  aria-busy={starting}
                >
                  {starting ? 'Opening checkout…' : 'Upgrade to Pro'}
                </button>
                {/* Declining must be exactly as easy as accepting —
                    growth-persuasion.md guardrail 3. A real button with a real
                    label, not a grey word hidden in a corner. */}
                <button type="button" className="ui-pro-later" onClick={onClose}>
                  Maybe later
                </button>
              </div>

              <p className="ui-pro-note">
                {hasTrial
                  ? `Free for ${choice.trialDays} days. `
                  : ''}
                {user ? 'Cancel any time from Settings.' : 'You’ll create a free account first, then confirm payment.'}
                {' '}
                <button type="button" onClick={seeAllPlans}>See all plans</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
