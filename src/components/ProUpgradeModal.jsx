import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePrices, refreshPrices } from '../hooks/usePrices'
import { detectCurrency } from '../utils/currency'
import { PRO_POINTS } from '../config/planFacts'
import {
  resolvePlanLadder,
  livePlans,
  cheapestPerMonth,
  savingsVsMonthly,
} from '../config/planLadder'
import useModalDialog from '../hooks/useModalDialog'
import ProHarmonyPreview from './ProHarmonyPreview'
import { showsColourRail } from '../utils/proGateProof'

// The Pro upgrade modal — a funnel surface, and the only one in the app.
//
// The upgrade flow: clicking a Pro tool shows this popup ·
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
//     Monthly bills immediately; Yearly carries a seven-day trial.
//     The purchasable ladder offers Monthly and Yearly.
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
//  Monthly and Yearly use stacked plan rows, with each rate, billing total
//  and trial shown together.
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
//  · THE HEAD IS PLAIN TEXT. It used to open on an uppercase mono "UIL4B Pro"
//    label above the title, ticks before every feature line, uppercase mono
//    plan names and em dashes in the steps. Each one is a default a template
//    ships with, and together they made the surface read as machine-made. The
//    title now carries the offer, the features are a plain list, the plan names
//    are sentence-case sans, and the steps use colons and full stops. Callers
//    still pass an `eyebrow`; it is ignored here.
//
//  · A GATE MAY BRING ITS OWN PROOF. `proof` is a node the caller draws from the
//    user's own work in the Pro setting (an icon at the previewed line style,
//    say). It takes the rail's slot where the gate is not a colour gate, so one
//    gate never shows both. No `proof`, no slot: the dialog stays one column.
//
// Prices come from src/config/planLadder.js — the single module — never typed
// into this file. Read its header before changing any amount.

// Copy for the walls opened from the icon customiser, keyed by `gate`. A caller
// that passes its own title or subtitle wins; this fills in when it passes
// neither, so the three walls say the same thing wherever they are raised.
// The literal sizes sit in <code>, the one place this dialog uses mono.
const ICON_GATE_COPY = {
  'icon-line-style': {
    title: 'Export icons in Sharp and Crisp',
    subtitle: 'Pro opens every line style and any export size, on every icon in the library.',
  },
  'icon-export-size': {
    title: 'Export icons at any size',
    subtitle: (
      <>Pro lets you type any size from <code>8</code> to <code>1024px</code>, and opens Sharp and Crisp line styles.</>
    ),
  },
  'icon-pro-preview': {
    title: 'Export your Pro settings',
    subtitle: 'Pro opens every line style and any export size, on every icon in the library.',
  },
}

// /plans' Pro lines, word for word (src/config/planFacts.js). This modal kept
// its own list — "Pro colour tools — HCT editing, light + dark contrast
// repair" — which described a different Pro from the page it links to.
const DEFAULT_FEATURES = PRO_POINTS

export default function ProUpgradeModal({ opts = {}, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { prices, settled } = usePrices()
  const dialogRef = useModalDialog(onClose)
  const uid = useId()
  const [starting, setStarting] = useState(false)

  const gateCopy = ICON_GATE_COPY[opts.gate] || {}
  const {
    title = gateCopy.title || 'Unlock everything with Pro',
    subtitle = gateCopy.subtitle || 'Keep every tool open and every export clean. Free stays free. Pro removes the limits.',
    features = DEFAULT_FEATURES,
    // The exact colour the gate fired on, when the caller knows it. The rail
    // degrades to the last palette this browser worked on, then to the brand
    // accent, so nothing breaks when a caller passes nothing.
    seed,
    // Which wall fired. Already passed by every call site for analytics; read
    // here to decide whether the colour rail is proof or decoration.
    gate,
    // A picture of the user's own work in the Pro setting, drawn by the caller.
    proof,
    // Called just before the modal sends the visitor to /plans, so a caller can keep its
    // state for the return trip. Closing the modal without going does not call it.
    onLeave,
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
  // The caller's proof takes the rail's slot, and only where there is no rail.
  const showProof = !showColourRail && !!proof

  const currency = useMemo(() => detectCurrency(), [])
  const ladder = useMemo(
    () => resolvePlanLadder({ prices, currency }),
    [prices, currency],
  )
  // Only rows Stripe has a live price for, in the currency shown. A cadence
  // served from the fallback table is not listed: it would quote the approved
  // USD amount beside the live rows, and start a trial that ends at a refusal.
  const plans = useMemo(() => livePlans(ladder), [ladder])
  const headline = useMemo(() => cheapestPerMonth(plans), [plans])

  // Default to the cheapest per-month plan, which is also the one carrying the
  // trial. Selecting it for the user is a convenience, not a trap: every other
  // plan is one click away and nothing is pre-ticked that costs more.
  const [choiceId, setChoiceId] = useState(() => headline?.id || 'yearly')
  const choice = plans.find((p) => p.id === choiceId) || plans[0] || null

  // No live row at all: the service is unreachable, or it answered with
  // fallback defaults only. Either way there is no offer to make.
  const priceUnavailable = settled && plans.length === 0
  const hasTrial = !!choice?.trialDays

  // Every Pro/upgrade CTA goes to /plans — never to a login popup, never
  // straight to checkout. The main button hands the visitor to the plans page,
  // which is where the account and payment steps start. The chosen cadence
  // rides along as `?plan=`, which /plans reads to preselect that cadence.
  const goCheckout = () => {
    if (!choice || starting) return
    setStarting(true)
    onClose()
    onLeave?.()
    navigate(`/plans?plan=${encodeURIComponent(choice.checkoutPlan)}`)
  }

  const seeAllPlans = () => { onClose(); onLeave?.(); navigate('/plans') }

  return (
    <div className="ui-modal-overlay" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={'ui-modal ui-pro' + (showColourRail ? '' : showProof ? ' ui-pro--proof' : ' ui-pro--norail')}
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
            (at 320/390/430px from the palette's colour-
            system gate). The rail has no focusable control, so the DOM order
            stays and only the paint order changes; see global.css. */}
        {showColourRail && <ProHarmonyPreview seed={seed} />}

        {/* The caller's proof, in the rail's grid area. Painted between the head
            and the price on a phone, because it is a single small picture and
            not the tall strip the rail is. */}
        {showProof && <div className="ui-pro-proof">{proof}</div>}

        <div className="ui-pro-body">
          {/* NO PRICE, NO OFFER — so the outage and its two ways out come
              FIRST. The Pro lines are /plans' now (planFacts), longer than
              the modal's old four, and at 320x568 they pushed this block
              below the sheet's first screen (69-flow-audit, flow 2). */}
          {priceUnavailable && (
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
          )}
          <ul className="ui-pro-list">
            {features.map((f) => (
              <li className="ui-pro-li" key={f}>{f}</li>
            ))}
          </ul>

          {!priceUnavailable && (
            <fieldset className="ui-pro-plans" disabled={!settled}>
              <legend className="sr-only">Choose a billing period</legend>
              {!settled && <span className="sk ui-pro-plans-skel" aria-hidden="true" />}
              {settled && plans.map((plan) => {
                const save = savingsVsMonthly(plan, plans)
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
                      </span>
                      <span className="ui-pro-plan-rate">
                        <span className="ui-pro-plan-amount">{plan.perMonthLabel}</span>
                        <span className="ui-pro-plan-per">/mo</span>
                      </span>
                    </span>
                    <span className="ui-pro-plan-total">
                      {plan.totalLabel} {plan.cadence}
                      {/* The trial lives here and in the button, not in a chip. */}
                      {plan.trialDays > 0 && ` · ${plan.trialDays}-day free trial`}
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
              <li><strong>Today:</strong> create your account and confirm payment details.</li>
              {hasTrial ? (
                <>
                  <li><strong>Days 1 to {choice.trialDays}:</strong> full Pro access. Nothing is charged.</li>
                  <li>
                    <strong>Day {choice.trialDays}:</strong> {choice.totalLabel} is charged, then {choice.cadence.replace('billed ', '')}.
                  </li>
                </>
              ) : (
                <li><strong>Then:</strong> {choice.totalLabel} {choice.cadence}, starting today.</li>
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
                  "Upgrade to Pro" on the one that bills today. A disclaimer
                  under a tile makes the trial easy to miss; the button is
                  where it is seen. */}
              <div className="ui-pro-cta">
                <button
                  type="button"
                  className="btn btn-accent btn-l"
                  onClick={goCheckout}
                  disabled={!choice || !settled || starting}
                  aria-busy={starting}
                >
                  {starting
                    ? 'Opening plans…'
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
                {/* The Customer Portal is where a subscriber cancels, so the line
                    is said only to someone with an account. */}
                {user ? 'Cancel any time from Settings. ' : ''}
                <button type="button" onClick={seeAllPlans}>See all plans</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
