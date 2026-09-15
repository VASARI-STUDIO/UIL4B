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
import { showsColourRail } from '../utils/proGateProof'

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
//     the day money moves. WHICH plans carry it is no longer a fact this file
//     knows — it reads `trialDays` off the resolved ladder, which mirrors
//     api/_lib/pricing.js#TRIAL_DAYS, which is what Stripe is actually told.
//     (This comment used to say "the YEARLY plan only". That stopped being
//     true on 2026-09-15 when the founder made the trial earned by the
//     CADENCE — monthly bills today, quarterly and yearly each get seven days.)
//
// ── 2026-09-15, founder ─────────────────────────────────────────────────────
// "review its UI for AI slop feeling and pricing, and make it slightly unique
//  for each different pro upgrade one, also include quarterly pricing, improve
//  heigrachy, the 7 day free trial on the yearly needs to be more obvious."
//
// What that turned into, and why:
//
//  · THE PRICE WAS PRINTED THREE TIMES before the button — a 40px "from
//    $X/month" headline, then the same number again on the tile below it, then
//    a third time in the steps box. The headline is gone. It was the cheapest
//    plan's per-month rate, which is now sitting in the plan rows a few
//    centimetres lower, so it said nothing new while competing with the title
//    for the top of the page. Removing it also retires a whole bug class: the
//    long comment that used to live here is about a fallback price rendering
//    on top of "we couldn't load current prices". A price that does not exist
//    cannot contradict an error.
//
//  · THE PLANS WERE SIDE-BY-SIDE TILES, at minmax(180px,1fr) in a ~400px
//    column. That fits two. Quarterly makes three, and three would have
//    wrapped 2-then-1 — a broken-looking grid on the one surface that asks for
//    money. They are stacked rows now, which is what Riverside, Adobe and
//    Behance all do once there are three billing periods to choose between
//    (mobbin.com/screens/725a3c3e-5c4f-455c-8d4c-8d4f2abb4b4b,
//     .../28ac7aa0-7aca-4a92-9a6c-c8ab4272d103,
//     .../c90bc8de-b312-4771-866e-93f6d002dbcb). A row also has somewhere to
//    put the trial that is not a footnote.
//
//  · THE TRIAL WAS THE SMALLEST TEXT ON THE SURFACE — 11.5px, under the total,
//    on one tile. It is the strongest thing on the offer and it read like a
//    disclaimer. It is now a filled chip on the row AND the CTA says it, which
//    is what all three references above do: the trial belongs in the button a
//    person is about to press.
//
//    NOTE the guardrail this does NOT break. A previous pass put "Get started
//    free" in this button and it was removed for implying the product is free.
//    "Start your 7-day free trial" is not that claim: it is what the button
//    does, the card is taken at checkout either way, and the line under it
//    still says a free account is created first and when billing begins. The
//    no-trial cadence still reads "Upgrade to Pro", because for monthly that
//    is the truth.
//
//  · EVERY GATE SHOWED THE SAME COLOUR RAIL. The eyebrow, title and subtitle
//    are already written per gate, but an icon gate, a type-system gate and a
//    gradient gate all opened onto five rows of colour harmonies generated
//    from a palette seed the user may never have touched — proof of a product
//    they were not being sold, which is the most AI-slop thing on the surface:
//    a panel that looks like evidence and is actually decoration. The rail now
//    renders only where colour IS the product.
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
  // "…and full design JSON" removed 2026-09-05: the JSON export is not built.
  // See the note in src/pages/Checkout.jsx.
  'The design system book (PDF), and style guides with no credit line',
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
    // Which wall fired. Already passed by every call site for analytics; read
    // here to decide whether the colour rail is proof or decoration.
    gate,
  } = opts

  // THE RAIL IS PROOF, SO IT ONLY APPEARS WHERE IT PROVES SOMETHING.
  //
  // ProHarmonyPreview generates the colour systems the subscription buys from
  // the user's own seed. On a palette wall that is the product. On
  // `icon-outline`, `ui-system-*` or the type-system wall it is five rows of
  // swatches about something else — and because resolvePaletteSeed always
  // finds A seed (last palette → brand accent), it never degraded to nothing;
  // it confidently drew the wrong evidence.
  //
  // Two signals, both already sent by the callers: a palette gate, or an
  // explicit seed — which is how ExportPanel says "this export is about this
  // palette" (it passes design.palette.colors[0]).
  const showColourRail = showsColourRail({ seed, gate })

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
        className={'ui-modal ui-pro' + (showColourRail ? '' : ' ui-pro--norail')}
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
            in DOM order, and grid-template-areas moves it to the right at
            width.

            Below 780px it is PAINTED LAST, not second. The single column used
            to read promise -> proof -> price, and on a phone the proof is
            ~500px of strips, so the price — or the "we couldn't load prices"
            block and its buttons — sat a full screen or more below the fold
            (measured 2026-09-09 at 320/390/430 from the palette's colour-
            system gate). The rail has no focusable control, so the DOM order
            stays and only the paint order changes; see global.css. */}
        {showColourRail && <ProHarmonyPreview seed={seed} />}

        <div className="ui-pro-body">
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
                    {/* A ROW, not a tile. Identity on the left, money on the
                        right, terms underneath — so a third cadence costs one
                        more row instead of breaking a 2-up grid onto a second
                        line. */}
                    <span className="ui-pro-plan-main">
                      <span className="ui-pro-plan-id">
                        <span className="ui-pro-plan-name">{plan.label}</span>
                        {save > 0 && <span className="ui-pro-plan-save">Save {save}%</span>}
                        {/* THE TRIAL, PROMOTED. This was 11.5px of accent text
                            under the total — the quietest thing in the tile,
                            for the loudest thing in the offer. It is a filled
                            chip on the identity line now, which is where the
                            eye already is when it reads the plan's name. */}
                        {plan.trialDays > 0 && (
                          <span className="ui-pro-plan-trial">{plan.trialDays}-day free trial</span>
                        )}
                      </span>
                      <span className="ui-pro-plan-rate">
                        <span className="ui-pro-plan-amount">{plan.perMonthLabel}</span>
                        <span className="ui-pro-plan-per">/mo</span>
                      </span>
                    </span>
                    <span className="ui-pro-plan-total">
                      {plan.totalLabel} {plan.cadence}
                    </span>
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
                  for what it costs.

                  "Get started free" used to sit here and was removed for
                  implying the product is free. The trial label is not a
                  return to that: it names the action the button performs, on
                  the cadences that genuinely carry a trial, and reverts to
                  "Upgrade to Pro" on the one that bills today. The founder
                  asked for the trial to be more obvious (2026-09-15); a
                  disclaimer under a tile was not that, and the button is
                  where Riverside, Adobe and Behance all put it. */}
              <div className="ui-pro-cta">
                <button
                  type="button"
                  className="btn btn-accent btn-l"
                  onClick={goCheckout}
                  disabled={!choice || !settled || starting}
                  aria-busy={starting}
                >
                  {starting
                    ? 'Opening checkout…'
                    : hasTrial
                      ? `Start your ${choice.trialDays}-day free trial`
                      : 'Upgrade to Pro'}
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
