import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PillNav from '../components/PillNav'
import SpectrumRamp from '../components/spectrum/SpectrumRamp'
import SpectrumFooter from '../components/spectrum/SpectrumFooter'
import SpectrumIcon from '../components/spectrum/SpectrumIcon'
import { useAuth } from '../contexts/AuthContext'
import { AI_LIMITS, FREE_SAVE_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { refreshPrices, usePrices, useProPrice } from '../hooks/usePrices'
import { formatMoney } from '../config/planLadder'
import { COLOUR_SYSTEMS } from '../config/colourSystems'
import { BRAND_PALETTES } from '../data/brandPalettes'
import { freeFormats, proOnlyFormats } from '../config/exportFormats'
import { BRAND_STARTER_BETA, allowanceSentence } from '../config/aiGeneration'
import { TOOL_COUNT, numberWord } from '../components/spectrum/spectrumFacts'
// The plan lines, cadences and billed line live in one module that every
// surface describing Free and Pro reads: Settings, Checkout and the upgrade
// modal included.
import {
  FREE_POINTS, FREE_EXCLUSION, PRO_POINTS, BILLING_OPTIONS, DEFAULT_BILLING, BILLED_EVERY,
  FREE_EXPORT_NAMES, PRO_EXPORT_NAMES, perMonth,
} from '../config/planFacts'
// The page's own sheet, every selector under `.pricing`. Imported here so it
// rides this lazy route's chunk. The Spectrum ground, the colour band and the
// footer are styled by spectrum.css, which `/` already loads in the entry.
import '../styles/pages/pricing.css'

// ═════════════════════════════════════════════════════════════════════════════
// PRICING — /plans, built from the Pricing screen of "UIL4B - Spectrum.dc.html"
// (design lines 1083–1220). The design file is the spec and is reproduced, not
// adapted. This replaces the legacy Plans page and its app header.
//
// Reading order, which is the design's: hero, billing toggle, the two plan
// cards, the assurance line, the comparison, the questions, the colour band,
// the footer. The design has no "Before you pay" section and no closing CTA
// block; the footer's "Open the toolkit" is the page's last way in.
//
// ── WHAT IS THE DESIGN'S AND WHAT IS THE PRODUCT'S ──────────────────────────
// Layout, sizes, type and copy are the design's. Where one of the design's
// lines states a fact the product does not have (a price, a count, a feature),
// the component and the wording stay and the true value goes in. Each
// substitution is named where it happens.
//
// ── NOTHING ON THIS PAGE IS A TYPED NUMBER ──────────────────────────────────
// The legacy page's rule, kept: every figure is imported from the module that
// also DRIVES it, so the page cannot drift from the product without a test
// going red.
//   AI_LIMITS / FREE_SAVE_LIMITS → src/config/plans.js (api/_lib/plans.js mirror)
//   allowanceSentence            → src/config/aiGeneration.js (what /api/ai enforces)
//   COLOUR_SYSTEMS               → what the palette engine gates on
//   BRAND_PALETTES               → what PaletteBuilder gates on (`b.free`)
//   export formats               → src/config/exportFormats.js, which renders the buttons
//   prices                       → /api/get-prices via usePrices(); nothing typed
// ═════════════════════════════════════════════════════════════════════════════

const AI = AI_LIMITS
const SYSTEMS_TOTAL = COLOUR_SYSTEMS.length
const SYSTEMS_FREE = COLOUR_SYSTEMS.filter((s) => s.free)
const BRANDS_TOTAL = BRAND_PALETTES.length
const BRANDS_FREE = BRAND_PALETTES.filter((b) => b.free === true).length

const FREE_EXPORTS = freeFormats()
const PRO_EXPORTS = proOnlyFormats()

// ── THE BILLING TOGGLE: THE DESIGN'S THREE CADENCES ─────────────────────────
// The design's toggle draws Monthly / Quarterly 10% off / Yearly 17% off. All
// three are buyable; the filter stays so a tier without a checkout can never
// be offered. Each saving is computed from the live prices, and yearly is
// preselected, as the design's `billing: 2` is.

// ── THE DESIGN'S LINES, WITH THE FACTS PUT IN ───────────────────────────────
// Sub-line, D:1086: "…six times the AI generations, the full OKLCH colour
// engine, unlimited kits and clean, unmarked exports." There is no OKLCH
// engine and no "kits" limit; what Pro opens is every colour system and
// unlimited projects. "six times" is the daily ceiling ratio,
// computed.
const AI_MULTIPLE = AI.pro.daily / AI.free.daily
const HERO_SUB = `Pro gives you the controls real client work needs: ${numberWord(AI_MULTIPLE)} times the AI generations, all ${numberWord(SYSTEMS_TOTAL)} colour systems, unlimited projects and clean, unmarked exports.`

// Free card, D:1110-1116 — four ticks and one minus, in the design's wording
// where it is true:
//   "All thirteen tools, unmetered" — the count is derived; "unmetered" is cut,
//     because the AI tools are metered (the next line says by how much).
//   "Copy as CSS, JSON, Tailwind or OKLCH" — CSS, JSON and Tailwind are
//     unbuilt export formats; the real free export offer replaces it.
//   "3 saved kits, every export format" — Free does not get every format; the
//     real save limits replace it.
// The design's minus line, verbatim: the free exports do carry a "Made with UIL4B" line.

// Pro card, D:1135-1139 — the design's five lines, each replaced by the real delta it
// stands for: "Curves, harmonies and OKLCH controls" → the colour systems;
// "Studio-quality kit exports, no mark" → no "Made with UIL4B" line;
// "Unlimited saved kits" → projects and icons; "90 days of version history"
// (no such feature exists) → the export formats Pro actually gates.

// The comparison, D:1678-1686, grouped under the design's three labels. The design's rows were
// seven, two of them for features that do not exist (version history,
// "advanced colour controls" as a yes/no); these are the real rows.
const COMPARE = [
  { group: 'THE TOOLS', rows: [
    { label: `All ${numberWord(TOOL_COUNT)} tools`, free: 'Included', pro: 'Included' },
    { label: 'Brand palettes', free: `${BRANDS_FREE} of ${BRANDS_TOTAL}`, pro: `All ${BRANDS_TOTAL}` },
  ] },
  { group: 'AI AND CONTROLS', rows: [
    { label: 'AI generations', free: `${AI.free.daily} a day, ${AI.free.monthly} a month`, pro: `${AI.pro.daily} a day, ${AI.pro.monthly} a month` },
    { label: 'Brand Starter', beta: BRAND_STARTER_BETA, free: allowanceSentence('free'), pro: allowanceSentence('pro') },
    { label: 'Colour systems', free: `${SYSTEMS_FREE.length} of ${SYSTEMS_TOTAL}`, pro: `All ${SYSTEMS_TOTAL}, plus HCT editing` },
  ] },
  { group: 'YOUR WORK', rows: [
    { label: 'Saved projects', free: String(FREE_SAVE_LIMITS.projects), pro: 'Unlimited' },
    { label: 'Custom icons', free: String(FREE_SAVE_LIMITS.customIcons), pro: 'Unlimited' },
    { label: 'Style guide exports', free: FREE_EXPORT_NAMES, pro: FREE_EXPORT_NAMES },
    { label: 'Number of exports', free: 'Unlimited', pro: 'Unlimited' },
    ...PRO_EXPORTS.map((f) => ({ label: f.name, free: 'Not included', pro: 'Included' })),
    { label: 'Export watermark', free: 'Small “Made with UIL4B” line', pro: 'Removed' },
    { label: 'Local-only file handling', free: 'Yes', pro: 'Yes' },
  ] },
]

// The questions, D:1694-1699, two columns. The design's answers where they
// are true:
//   1. "What counts as one generation?" — the drawn answer names palettes and
//      scales, which the AI does not generate; the real answer is kept.
//   2. "Is the Pro model different?" — the drawn answer, verbatim; it is true.
//   3. "Do my files get uploaded?" — the drawn answer, verbatim.
//   4. "Can I cancel?" — "From the dashboard, in two clicks" is false: the
//      Stripe portal has no cancellation flow, so the page makes no
//      cancellation claim. The slot carries the export-formats question
//      instead, naming only the formats a plan actually delivers.
const FAQS = [
  {
    q: 'What counts as one generation?',
    a: 'One image described by the Alt Text generator, or one prompt produced by an AI tool. Browsing, editing palettes, building type scales, exporting a style guide and everything else in the toolkit are unmetered — they run in your browser and cost us nothing.',
  },
  {
    q: 'Is the Pro model different?',
    a: 'No. Both plans run the same model. Pro raises the daily and monthly ceiling, nothing else about the output changes.',
  },
  {
    q: 'Do my files get uploaded?',
    a: 'Image and video work happens in the browser. Only AI prompts leave the machine, and they carry text, not your assets.',
  },
  {
    q: 'Which export formats can I actually get?',
    a: `${FREE_EXPORTS.length} on Free, ${FREE_EXPORT_NAMES}, each carrying a small “Made with UIL4B” line in the footer. Pro removes that line and adds ${PRO_EXPORT_NAMES}.`,
  },
]

// Per-month, rounded once, the way planLadder.js rounds it: $48/12 is $4 and
// must never render as $3.99 one frame and $4.00 the next.

// The design's billed notes (D:1688-1692), per cadence, with "cancel any time"
// out; the cadence wording comes from config/planFacts.js.

export default function Pricing() {
  const { user } = useAuth()
  const { isPro, loading: subLoading } = useSubscription()
  const location = useLocation()
  // Seeded from `?billing=`, validated against the options the toggle can
  // show, so a stale `?billing=quarterly` falls back rather than putting the
  // page into a state its own toggle cannot represent.
  // `?plan=<checkoutPlan>` is what the upgrade dialog sends, so the cadence
  // picked there arrives selected here.
  const [billing, setBilling] = useState(() => {
    const params = new URLSearchParams(location.search)
    const asked = params.get('billing')
    if (BILLING_OPTIONS.some((o) => o.id === asked)) return asked
    const byPlan = BILLING_OPTIONS.find((o) => o.checkoutPlan === params.get('plan'))
    return byPlan ? byPlan.id : DEFAULT_BILLING
  })
  const tabRefs = useRef([])

  // THE PRICES ARE THE LIVE ONES. useProPrice() is what the legacy page, the
  // Checkout page and Settings quote; it knows whether the price service
  // answered. usePrices() is the same cache, read raw, because a whole amount
  // has to lose its cents on a 66px number (formatMoney) and the per-month
  // arithmetic needs numbers, not strings.
  const price = useProPrice()
  const { prices } = usePrices()
  const currency = price.currency
  const totalOf = (o) => (price.loaded ? prices?.[o.liveKey]?.[currency] : undefined)
  const monthlyTotal = totalOf(BILLING_OPTIONS.find((o) => o.id === 'monthly') || {})
  const hasMonthly = typeof monthlyTotal === 'number'
  const plan = BILLING_OPTIONS.find((o) => o.id === billing) || BILLING_OPTIONS[0]
  const total = totalOf(plan)
  const hasAmount = typeof total === 'number'
  const amount = hasAmount ? formatMoney(perMonth(total, plan.months), currency) : null
  const priceServiceDown = price.loaded && !hasAmount

  // EACH CADENCE'S OWN SAVING, from the live amounts: its per-month rate
  // against monthly, the rule planLadder.js#savingsVsMonthly applies (whole
  // percent, and nothing under 5% — "save 1%" is worse than no badge).
  const savingOf = (o) => {
    const t = totalOf(o)
    if (o.id === 'monthly' || !hasMonthly || typeof t !== 'number') return 0
    const pct = Math.round((1 - perMonth(t, o.months) / monthlyTotal) * 100)
    return pct >= 5 ? pct : 0
  }
  // The design's badge logic (D:2929): the saving on a discounted cadence, otherwise
  // RECOMMENDED — in the design's "17% off" form.
  const savingLabel = (o) => (savingOf(o) > 0 ? `${savingOf(o)}% off` : '')
  const badge = savingLabel(plan) ? savingLabel(plan).toUpperCase() : 'RECOMMENDED'
  const showWas = hasAmount && savingOf(plan) > 0

  // The design's note (D:1128): "Billed $40 yearly, cancel any time. Keep
  // every export you made." with the real amount, and the trial the cadence
  // actually carries said for EVERY cadence that has one: the server grants
  // 7 days on quarterly and yearly alike (TRIAL_DAYS in api/_lib/pricing.js,
  // mirrored by trialDays). Monthly has none, so says none.
  const trial = plan.trialDays ? `, ${plan.trialDays}-day free trial` : ''
  const billedNote = plan.months > 1
    ? `Billed ${formatMoney(total, currency)} ${BILLED_EVERY[plan.id]}${trial}, cancel any time. Keep every export you made.`
    : `Billed ${BILLED_EVERY[plan.id]}${trial}, cancel any time. Keep every export you made.`

  // THE PRO CTA IS TODAY'S CHECKOUT WIRING, IN HIS BUTTON. This page IS
  // /plans, so the button starts the real upgrade: signed in it goes straight
  // to /checkout for the chosen cadence; signed out it opens the sign-in popup
  // via /login with `from` set, and LoginRoute sends the visitor on to that
  // checkout once they are in.
  const checkoutHref = `/checkout?plan=${plan.checkoutPlan}`
  const proTo = user ? checkoutHref : '/login'
  const proState = user ? undefined : { from: checkoutHref, returnTo: `${location.pathname}${location.search || ''}` }
  const proBusy = subLoading || !price.loaded

  const selectTab = (index) => {
    const wrapped = (index + BILLING_OPTIONS.length) % BILLING_OPTIONS.length
    setBilling(BILLING_OPTIONS[wrapped].id)
    tabRefs.current[wrapped]?.focus()
  }
  const onTabKeyDown = (event, index) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); selectTab(index + 1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); selectTab(index - 1) }
    else if (event.key === 'Home') { event.preventDefault(); selectTab(0) }
    else if (event.key === 'End') { event.preventDefault(); selectTab(BILLING_OPTIONS.length - 1) }
  }

  const ctaIcon = (
    <span className="pr-cta-icon" aria-hidden="true"><SpectrumIcon name="arrow-up-right" size={13} /></span>
  )

  let proCta
  if (isPro) {
    proCta = (
      <Link className="pr-cta pr-cta--pro" to="/settings" state={{ section: 'support' }}>
        <span>View account details</span>{ctaIcon}
      </Link>
    )
  } else if (priceServiceDown) {
    // No amount means no offer. Asking for a card without being able to name
    // the amount is the one thing a pricing page must never do.
    proCta = (
      <button type="button" className="pr-cta pr-cta--pro" aria-disabled="true" aria-describedby="pricing-noprice">
        <span>Pricing unavailable right now</span>
      </button>
    )
  } else {
    proCta = (
      <Link
        className="pr-cta pr-cta--pro"
        to={proTo}
        state={proState}
        aria-disabled={proBusy ? 'true' : undefined}
        onClick={(event) => { if (proBusy) event.preventDefault() }}
      >
        <span>Upgrade to Pro</span>{ctaIcon}
      </Link>
    )
  }

  return (
    <div className="spectrum pricing">
      {/* The marketing nav, exactly as `/` mounts it. */}
      <PillNav variant="spectrum" />
      <div className="sp-grain" aria-hidden="true" />

      <main id="main" tabIndex={-1}>
        <section id="pricing" className="pr-hero" aria-labelledby="pricing-h1">
          <div className="pr-shell">
            {/* The design's h1 (D:1085). "Less than 1 coffee" holds on the
                yearly cadence in USD, $48 a year = $4 a month. */}
            <h1 className="pr-h1" id="pricing-h1">
              Improve your design systems for <em>less than 1 coffee</em> per month.
            </h1>
            <p className="pr-sub">{HERO_SUB}</p>

            <div className="pr-billing" role="tablist" aria-label="Choose how to pay for Pro">
              {BILLING_OPTIONS.map((option, index) => {
                const selected = billing === option.id
                const save = savingLabel(option)
                return (
                  <button
                    key={option.id}
                    ref={(element) => { tabRefs.current[index] = element }}
                    id={`pricing-tab-${option.id}`}
                    type="button"
                    role="tab"
                    className="pr-billing-tab"
                    aria-selected={selected}
                    aria-controls="pricing-pro-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setBilling(option.id)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                  >
                    <span>{option.label}</span>
                    {save && <span className="pr-billing-save">{save}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="pr-plans-sec" aria-label="Plans">
          <div className="pr-shell pr-plans">
            <article className="pr-plan pr-plan--free" aria-labelledby="pricing-free-tier">
              <div className="pr-plan-top">
                <span className="pr-plan-tier" id="pricing-free-tier">FREE</span>
                <span className="pr-plan-aside">No account needed</span>
              </div>
              <p className="pr-plan-price">
                <span className="pr-plan-amount">$0</span>
                <span className="pr-plan-per">/ forever</span>
              </p>
              {/* The design's note was "…to run. No trial clock, no card." — both
                  clauses are payment reassurances the product no longer
                  makes; the sentence before them stays. */}
              <p className="pr-plan-note">Free because the tools cost us nothing to run.</p>
              {/* The toolkit opens without a sign-up gate and lands on the
                  workspace. */}
              <Link className="pr-cta pr-cta--ghost" to="/projects">Open the toolkit</Link>
              <span className="pr-plan-rule" aria-hidden="true" />
              <p className="pr-plan-label">WHAT&apos;S INCLUDED</p>
              <ul className="pr-plan-list">
                {FREE_POINTS.map((point) => (
                  <li key={point}>
                    <span className="pr-plan-mark" aria-hidden="true"><SpectrumIcon name="check" size={13} strokeWidth={2.2} /></span>
                    {point}
                  </li>
                ))}
                <li className="is-off">
                  <span className="pr-plan-mark" aria-hidden="true"><SpectrumIcon name="minus" size={13} strokeWidth={2.2} /></span>
                  {FREE_EXCLUSION}
                </li>
              </ul>
            </article>

            <article
              id="pricing-pro-panel"
              className="pr-plan pr-plan--pro"
              role="tabpanel"
              aria-labelledby={`pricing-tab-${billing}`}
            >
              <span className="pr-plan-edge" aria-hidden="true" />
              <div className="pr-plan-top">
                <span className="pr-plan-tier">PRO</span>
                <span className="pr-plan-badge">{badge}</span>
              </div>
              <p className="pr-plan-price" aria-live="polite">
                <span className={`pr-plan-amount${price.loaded && !hasAmount ? ' is-word' : ''}`}>
                  {!price.loaded ? '—' : amount || 'Unavailable'}
                </span>
                {hasAmount && <span className="pr-plan-per">/ month</span>}
                {showWas && <span className="pr-plan-was">was {formatMoney(monthlyTotal, currency)}</span>}
              </p>
              {priceServiceDown ? (
                <>
                  <p className="pr-plan-note" id="pricing-noprice">
                    We can’t reach Stripe to confirm the {price.currencyLabel} price, so no checkout will be
                    started. Everything on Free keeps working.
                  </p>
                  <button type="button" className="pr-plan-retry" onClick={() => refreshPrices()}>
                    Retry live pricing
                  </button>
                </>
              ) : (
                <p className="pr-plan-note">{hasAmount ? billedNote : 'Checking the live price…'}</p>
              )}
              {proCta}
              <span className="pr-plan-rule" aria-hidden="true" />
              <p className="pr-plan-label">EVERYTHING IN FREE, PLUS</p>
              <ul className="pr-plan-list">
                {PRO_POINTS.map((point) => (
                  <li key={point}>
                    <span className="pr-plan-mark" aria-hidden="true"><SpectrumIcon name="check" size={13} strokeWidth={2.2} /></span>
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* The design's assurances (D:2922-2926) without "No card needed for
            Free". Cancelling is the Settings "Cancel plan" button, which opens
            the billing portal's cancellation flow. */}
        <section className="pr-assure-sec" aria-label="Assurances">
          <ul className="pr-shell pr-assure">
            <li>
              <span className="pr-assure-icon" aria-hidden="true"><SpectrumIcon name="undo" size={15} /></span>
              Cancel Pro any time
            </li>
            <li>
              <span className="pr-assure-icon" aria-hidden="true"><SpectrumIcon name="lock" size={15} /></span>
              Files stay in your browser
            </li>
          </ul>
        </section>

        <section className="pr-compare-sec" aria-labelledby="pricing-compare-h">
          <div className="pr-shell">
            <div className="pr-compare-head">
              <h2 className="pr-h2" id="pricing-compare-h">What you get on each plan</h2>
            </div>
            <table className="pr-compare" role="table">
              <caption className="sr-only">Free and Pro compared, grouped by the tools, AI and controls, and your work</caption>
              <thead role="rowgroup">
                <tr className="pr-compare-headrow" role="row">
                  <th scope="col" role="columnheader">WHAT YOU GET</th>
                  <th scope="col" role="columnheader">FREE</th>
                  <th scope="col" role="columnheader">PRO</th>
                </tr>
              </thead>
              {COMPARE.map((group) => (
                <tbody key={group.group} role="rowgroup">
                  <tr className="pr-compare-group" role="row"><th colSpan={3} scope="colgroup" role="columnheader">{group.group}</th></tr>
                  {group.rows.map((row) => (
                    <tr className="pr-compare-row" key={row.label} role="row">
                      <th scope="row" role="rowheader">
                        {row.label}
                        {/* Beta is disclosed where the money is, not only on the tool. */}
                        {row.beta && <> <span className="beta-badge">Beta</span></>}
                      </th>
                      <td data-plan="Free" role="cell">{row.free}</td>
                      <td data-plan="Pro" className="is-pro" role="cell">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <section className="pr-faq-sec" aria-labelledby="pricing-faq-h">
          <div className="pr-shell pr-faq">
            <div className="pr-faq-head">
              <h2 className="pr-h2" id="pricing-faq-h">Common questions</h2>
              {/* The design's lede (D:1182). "ask support" is the feedback form, the
                  one place a question reaches the team. */}
              <p className="pr-faq-lede">
                If yours isn’t here, <Link to="/feedback">ask support</Link> and we’ll add it to this list.
              </p>
            </div>
            <div className="pr-faq-grid">
              {FAQS.map((f) => (
                <div className="pr-faq-row" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SpectrumRamp className="sp-ramp--close" />
      </main>

      <SpectrumFooter toolkitTo="/projects" />
    </div>
  )
}
