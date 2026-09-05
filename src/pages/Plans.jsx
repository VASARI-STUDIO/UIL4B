import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AI_LIMITS, FREE_SAVE_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { refreshPrices, useProPrice } from '../hooks/usePrices'
import { useReveal } from '../hooks/useReveal'
import { COLOUR_SYSTEMS } from '../config/colourSystems'
import { BRAND_PALETTES } from '../data/brandPalettes'
import { freeFormats, proOnlyFormats, unbuiltFormats } from '../config/exportFormats'
import SystemCTA from '../components/SystemCTA'

// The One-off ("lifetime") tier is GONE from this page. It was a third tab that
// could not be bought — the checkout stayed disabled pending a live Stripe
// price — so a third of the page's decision surface was a dead end, and the
// yearly/monthly choice was buried beside it. Existing lifetime entitlements
// are still honoured (see planForUser in api/_lib/plans.js); the tier simply
// stopped being advertised until it can actually be sold.
const BILLING_OPTIONS = [
  { id: 'yearly', label: 'Yearly' },
  { id: 'monthly', label: 'Monthly' },
]

// ─────────────────────────────────────────────────────────────────────────────
// NOTHING ON THIS PAGE IS A TYPED NUMBER.
//
// Every figure below is imported from the module that also DRIVES the thing it
// describes, so the page cannot drift away from the product without a test
// going red. This is not tidiness — it is the only defence that has ever worked
// here. Typed numbers are how this page came to advertise 1,000 AI actions a
// day against a provider tier that meters per project rather than per user,
// and how it came to sell a JSON export that has never existed.
//
//   AI_LIMITS        → src/config/plans.js, unit-tested against api/_lib/plans.js
//   FREE_SAVE_LIMITS → the same file; ProjectContext enforces it
//   COLOUR_SYSTEMS   → the array the palette engine and the upgrade modal read
//   BRAND_PALETTES   → the array PaletteBuilder gates on (`b.free`)
//   export formats   → src/config/exportFormats.js, which renders the buttons
//
// If you are about to type a number or a capability into this file: don't.
// Import it, or delete the claim.
// ─────────────────────────────────────────────────────────────────────────────
const AI = AI_LIMITS

const SYSTEMS_TOTAL = COLOUR_SYSTEMS.length
const SYSTEMS_FREE = COLOUR_SYSTEMS.filter((s) => s.free)
const BRANDS_TOTAL = BRAND_PALETTES.length
const BRANDS_FREE = BRAND_PALETTES.filter((b) => b.free === true).length

// The export offer, derived. FREE_EXPORTS are built and ungated; PRO_EXPORTS
// are built and gated; UNBUILT_EXPORTS exist as "Soon" rows in the panel and
// are the ones this page must never sell.
const FREE_EXPORTS = freeFormats()
const PRO_EXPORTS = proOnlyFormats()
const UNBUILT_EXPORTS = unbuiltFormats()

// "Style guide (HTML)" → "HTML". The panel needs the long name; a pricing page
// listing four of them needs the extension, and the repetition reads as padding.
const shortName = (f) => {
  const inParens = /\(([^)]+)\)\s*$/.exec(f.name)
  return inParens ? inParens[1] : f.name
}
// "HTML, Markdown, PNG and JPEG" — the last join is "and", because a trailing
// comma before the final item reads as a truncated list, and on this page a
// list that looks truncated is the wrong impression to give.
const listNames = (formats) => {
  const names = formats.map(shortName)
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function Check() {
  return (
    <svg className="sub-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// The counterpart to Check, for the exclusions block. Drawn rather than an "x"
// character so it sits on the same optical baseline as the ticks above it.
function Cross() {
  return (
    <svg className="sub-cross" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function TierIcon({ pro = false }) {
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  return pro
    ? <svg {...props}><path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" /></svg>
    : <svg {...props}><path d="M12 2 3 7l9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>
}

const FAQ = [
  {
    q: 'Do I need a card to use Free?',
    a: `No. Free has no card requirement and no trial clock. Every colour, type, icon and image tool opens without an account, and using them is never metered. What Free limits is how much you can SAVE — ${FREE_SAVE_LIMITS.projects} projects and ${FREE_SAVE_LIMITS.customIcons} custom icons — and how much AI you can run, at ${AI.free.daily} generations a day.`,
  },
  {
    q: 'When exactly do I hit the paywall?',
    a: `On your ${FREE_SAVE_LIMITS.projects + 1}th saved project. A project holds a palette, a font pairing and a type scale together, so saving a type scale into a new project is the same act as saving a palette into one — it is one project either way, and it counts once. Everything up to that point, including browsing every font and exporting from every tool, is free. The other walls are the ${SYSTEMS_TOTAL - SYSTEMS_FREE.length} Pro colour systems and the brand palettes outside the free ${BRANDS_FREE}; both say so before you click, not after.`,
  },
  {
    q: 'Is typography free?',
    a: `Browsing is, completely — the whole font catalogue, every pairing, the dossier and the scale, with no account and no gate on copying or exporting what you make. Keeping it is what costs: a saved type system lands in a project, and projects are capped at ${FREE_SAVE_LIMITS.projects} on Free. That is the same rule colour and icons follow, and it is deliberately the only rule.`,
  },
  {
    q: 'Which export formats can I actually get?',
    a: `${FREE_EXPORTS.length} on Free — ${listNames(FREE_EXPORTS)} — each carrying a small "Made with UIL4B" line in the footer. Pro removes that line and adds ${PRO_EXPORTS.map((f) => f.name).join(' and ')}. ${UNBUILT_EXPORTS.length} more formats (${listNames(UNBUILT_EXPORTS)}) are listed in the export panel as Soon: they are not built, so nobody has them and Pro does not sell them.`,
  },
  {
    q: 'Why are the AI limits not higher?',
    a: `Because we would rather quote a number that always works than a big one that fails in month two. AI generation currently runs on free provider tiers, which are metered across the whole site rather than per person — so the honest per-user allowance is small. Pro raises it from ${AI.free.daily} to ${AI.pro.daily} a day and from ${AI.free.monthly} to ${AI.pro.monthly} a month. When paid capacity is funded, these go up, and you keep whatever plan you are on.`,
  },
  {
    q: 'Does Pro use a better AI model?',
    a: 'No, and we will not claim otherwise. Free and Pro run the same model today. Pro buys capacity, the advanced colour controls, and cleaner handoff — not different output from the same prompt.',
  },
  {
    q: 'What counts as an AI generation?',
    a: 'One image described by the Alt Text generator, or one prompt produced by an AI tool. Browsing, editing palettes, building type scales, exporting a style guide and everything else in the toolkit are unmetered — they run in your browser and cost us nothing.',
  },
  {
    q: 'How does yearly billing work?',
    a: 'Yearly starts with a 7-day free trial and is charged once a year. Monthly has no trial and bills immediately. The saving shown on the Yearly tab is calculated live from the current Stripe prices, not from a number typed onto this page — if it is not showing, we could not reach Stripe and would rather show nothing than a stale figure.',
  },
  {
    q: 'What happens if I cancel?',
    a: `You keep Pro until the end of the period you have already paid for, then the account moves to Free. Nothing you have saved is deleted. If you are over the Free limit of ${FREE_SAVE_LIMITS.projects} projects, the ones you have stay readable and you simply cannot add more until you are under it again — we do not lock or hide your work.`,
  },
]

export default function Plans() {
  const { user } = useAuth()
  const { isPro, loading: subLoading } = useSubscription()
  const location = useLocation()
  const [billing, setBilling] = useState('yearly')
  const [openFaq, setOpenFaq] = useState(null)
  const tabRefs = useRef([])
  const price = useProPrice()
  // SystemCTA's content sits in a `[data-reveal]` div, and the stylesheet
  // starts every one of those at `opacity:0`. Something has to add `.is-in`.
  // Home drives it with useHomeMotion; ColorLanding and SurfaceLanding — the
  // only other SystemCTA consumers — call useReveal(). This page called
  // NEITHER, so the entire closing block (eyebrow, headline, lede, both
  // buttons, hint) rendered as a 472px blank white box at the foot of the
  // pricing page, in every browser, for every visitor.
  //
  // Nothing caught it: the element has a real bounding box and
  // `visibility:visible`, so Playwright still considers it visible and clicks
  // it happily — 18-signup-intent.spec.js has been clicking an invisible
  // button and passing. Opacity is what was wrong, so opacity is what
  // 52-plans-truth.spec.js now asserts.
  useReveal()

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

  const amount = billing === 'monthly' ? price.monthly : price.yearlyTotal
  const cadence = billing === 'monthly' ? 'per month' : 'per year'
  const checkoutHref = `/checkout?plan=${billing}`
  const signInFrom = `${location.pathname}${location.search || ''}`
  const proTo = user ? checkoutHref : '/login'
  const proState = user ? undefined : { from: checkoutHref, returnTo: signInFrom }
  const priceServiceDown = price.loaded && !price.serviceAvailable
  const priceState = !price.loaded ? 'Checking live price…'
    : priceServiceDown ? (amount
      ? `Live pricing is unreachable · showing the canonical ${price.currencyLabel} amount`
      : 'Live pricing is unreachable · no price can be shown right now')
      : price.source[billing] === 'live' ? `${price.currencyLabel} live price`
        : `${price.currencyLabel} guide price · confirmed at checkout`

  return (
    <div className="sec plans-page">
      <div className="sec-h plans-hero">
        <div className="sec-h-eyebrow">Plans</div>
        {/* 01-first-time-visitor.spec.js asserts /The whole toolkit is free/ on
            this h1. The sentence is also the page's actual position, so it
            stays — but the lede below it no longer says "without a limit",
            which was not true of saving, of the colour systems, or of the
            brand palettes. */}
        <h1>The whole toolkit is <em>free</em>. Pro adds room.</h1>
        <p>
          Every colour, type, icon and image tool opens in your browser without an account,
          and using them is never metered. What Free limits is how much you can keep and how
          much AI you can run. Below is every one of those limits, with the number.
        </p>
      </div>

      {isPro && (
        <div className="plans-pro-banner">
          <TierIcon pro />
          <span>Your account has <strong>UIL4B Pro</strong> access. <Link to="/settings" state={{ section: 'support' }}>View account details →</Link></span>
        </div>
      )}

      <div className="sub-billing-toggle" role="tablist" aria-label="Choose how to pay for Pro">
        {BILLING_OPTIONS.map((option, index) => (
          <button
            key={option.id}
            ref={(element) => { tabRefs.current[index] = element }}
            id={`plans-tab-${option.id}`}
            type="button"
            role="tab"
            aria-selected={billing === option.id}
            aria-controls="plans-pro-panel"
            tabIndex={billing === option.id ? 0 : -1}
            className={billing === option.id ? 'active' : ''}
            onClick={() => setBilling(option.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {option.label}
            {option.id === 'yearly' && price.loaded && price.savingsPct > 0 && (
              <span className="sub-save">Save {price.savingsPct}%</span>
            )}
          </button>
        ))}
      </div>

      <div className="sub-tiers plans-tiers">
        <article className="sub-tier plans-free-card">
          <div className="sub-tier-head">
            <div className="sub-tier-top"><span className="sub-tier-icon"><TierIcon /></span><div className="sub-tier-name">Free</div></div>
            <div className="sub-tier-price"><span className="sub-tier-amount">$0</span><span className="sub-tier-per">forever</span></div>
          </div>
          <p className="plans-card-intro">The complete toolkit, with limits only where something costs money to run.</p>
          {/* The "unlimited" line is load-bearing beyond this card: it is why
              every copy and export action in the typography tools is ungated,
              and tests/unit/typography-paywall.test.js asserts the two of them
              against each other. So the QUANTITY promise is kept exactly —
              nothing here is metered — and only the FORMAT implication is
              removed, because "and exports" read as all nine of them when four
              are not built and one is Pro. */}
          <ul className="sub-tier-list">
            <li><Check /> Every colour, type, icon and image tool</li>
            <li><Check /> Unlimited palettes, font pairings, type scales and gradients — none of it metered</li>
            <li><Check /> Style guide export in {listNames(FREE_EXPORTS)} — as often as you like</li>
            <li><Check /> {AI.free.daily} AI generations a day · {AI.free.monthly} a month</li>
            <li><Check /> {FREE_SAVE_LIMITS.projects} saved projects and {FREE_SAVE_LIMITS.customIcons} custom icons</li>
            <li><Check /> {SYSTEMS_FREE.length} colour systems ({SYSTEMS_FREE.map((s) => s.label).join(' and ')}) and {BRANDS_FREE} brand palettes</li>
          </ul>
          {/* Mobbin/Sketch states what a licence EXCLUDES in its own labelled
              block rather than leaving the reader to diff two lists. On a page
              whose failure mode has twice been an overstated free tier, saying
              the exclusions out loud is the more useful half. */}
          <div className="plans-excludes">
            <div className="plans-excludes-h">Not on Free</div>
            <ul>
              <li><Cross /> The other {SYSTEMS_TOTAL - SYSTEMS_FREE.length} colour systems, and HCT editing</li>
              <li><Cross /> The other {BRANDS_TOTAL - BRANDS_FREE} brand palettes</li>
              <li><Cross /> {PRO_EXPORTS.map((f) => f.name).join(', ')}</li>
              <li><Cross /> Exports without the “Made with UIL4B” footer line</li>
            </ul>
          </div>
          {user
            ? <button className="btn sub-tier-btn" disabled>{isPro ? 'Included with Pro' : 'Your current plan'}</button>
            : <Link className="btn sub-tier-btn" to="/login?signup=1">Start on Free</Link>}
          <div className="sub-tier-foot">No card required</div>
        </article>

        <article
          id="plans-pro-panel"
          className="sub-tier sub-tier-pro"
          role="tabpanel"
          aria-labelledby={`plans-tab-${billing}`}
        >
          <div className="sub-tier-head">
            <div className="sub-tier-top"><span className="sub-tier-icon"><TierIcon pro /></span><div className="sub-tier-name">Pro</div></div>
            <div className="sub-tier-price plans-price-slot" aria-live="polite">
              <span className={`sub-tier-amount${!price.loaded ? ' is-loading' : ''}`}>
                {!price.loaded ? '—' : amount || 'Unavailable'}
              </span>
              <span className="sub-tier-per">{cadence}</span>
            </div>
            <div className="sub-tier-sub">{priceState}</div>
            {billing === 'yearly' && price.loaded && price.yearlyPerMonth && (
              <div className="plans-price-detail">{price.yearlyPerMonth}/month · 7-day free trial</div>
            )}
            {priceServiceDown && (
              <button type="button" className="btn btn-s plans-price-retry" onClick={() => refreshPrices()}>
                Retry live pricing
              </button>
            )}
          </div>

          <p className="plans-card-intro plans-pro-intro">Everything in Free, plus:</p>

          {/* Every line is a DELTA, and every delta is derived. "Advanced
              harmonies … and expanded palettes" was replaced with the counts it
              was standing in for: a reader cannot price a vague adjective, and
              a vague adjective is what let the JSON claim sit here unnoticed. */}
          <ul className="sub-tier-list">
            <li><Check /> <strong>{AI.pro.daily} AI generations a day</strong> · {AI.pro.monthly} a month</li>
            <li><Check /> <strong>Unlimited</strong> saved projects and custom icons</li>
            <li><Check /> All {SYSTEMS_TOTAL} colour systems, plus HCT editing</li>
            <li><Check /> All {BRANDS_TOTAL} brand palettes</li>
            <li><Check /> {PRO_EXPORTS.map((f) => f.name).join(', ')}</li>
            <li><Check /> Style guides with no “Made with UIL4B” line</li>
          </ul>

          {/* No amount means no offer. The CTA used to stay live and inviting
              whenever `price.loaded` was true, even if the price itself came
              back null — so the page could read "Unavailable · per year" above
              a confident "Start 7-day free trial". Asking for a card without
              being able to name the amount is the one thing a pricing page must
              never do, so the button states the actual situation instead. */}
          {isPro ? (
            <Link className="btn sub-tier-btn" to="/settings" state={{ section: 'support' }}>View account details</Link>
          ) : !amount && price.loaded ? (
            <>
              <button type="button" className="btn sub-tier-btn" aria-disabled="true" aria-describedby="plans-noprice">
                Pricing unavailable right now
              </button>
              <p id="plans-noprice" className="plans-unavailable-note">
                We can’t reach Stripe to confirm the {price.currencyLabel} price, so no checkout will be started.
                Everything on Free keeps working — try again in a moment.
              </p>
            </>
          ) : (
            <Link
              className="btn btn-accent sub-tier-btn"
              to={proTo}
              state={proState}
              aria-disabled={subLoading || !price.loaded}
              onClick={(event) => { if (subLoading || !price.loaded) event.preventDefault() }}
            >
              {billing === 'yearly' ? 'Start 7-day free trial' : 'Choose monthly Pro'}
            </Link>
          )}
          {/* "· cancel any time" removed — see the founder flag on .plans-trust
              below. The Stripe Customer Portal has no cancellation flow enabled
              yet, so the sentence promised a control that is not there. */}
          {!(price.loaded && !amount) && <div className="sub-tier-foot">Secure checkout by Stripe</div>}
        </article>
      </div>

      {/* ── BEFORE YOU PAY ──────────────────────────────────────────────────
          Three facts a buyer would otherwise discover after paying: shared AI
          capacity, four export formats that do not exist, and where the
          typography wall actually is.

          This was one `.plans-honesty` paragraph about AI limits. It is a
          section now because the AI note was never the only thing being
          discovered late — the export offer was materially overstated on this
          page until today, and a single buried paragraph is how that survived.

          Mobbin/Gamma puts an explicit "export limitations" disclosure in the
          product rather than in a support article; this repo already took that
          pattern once, for the design system book's colophon. Same move, one
          layer earlier — before the money, not after it.

          Deliberately NOT a row of cards: the plan cards are the only card
          shape on this page, so these are text on hairline rules. Three equally
          weighted rounded boxes would make disclosure look like marketing. */}
      <section className="plans-notes" aria-labelledby="plans-notes-h">
        <h2 className="plans-notes-h" id="plans-notes-h">Before you pay</h2>

        <div className="plans-note">
          <h3>AI capacity is small, and it is shared</h3>
          <p>
            AI generation runs on free provider tiers, which meter across the whole site
            rather than per person, so the honest per-user allowance is low: {AI.free.daily} a
            day on Free and {AI.pro.daily} on Pro. We quote allowances we can actually honour
            instead of large ones we cannot. Everything else in UIL4B runs in your browser and
            is unmetered on both plans.
          </p>
        </div>

        <div className="plans-note">
          <h3>{UNBUILT_EXPORTS.length} export formats are not built yet — and are not for sale</h3>
          <p>
            The export panel lists {FREE_EXPORTS.length + PRO_EXPORTS.length + UNBUILT_EXPORTS.length} formats.
            {' '}{FREE_EXPORTS.length + PRO_EXPORTS.length} of them work today. The rest show a{' '}
            <span className="plans-soon-inline">Soon</span> badge over a disabled button,
            and Pro does not unlock them, because there is nothing to unlock:
          </p>
          <ul className="plans-soon-list">
            {UNBUILT_EXPORTS.map((f) => (
              <li key={f.id}>
                <span className="plans-soon-name">{f.name}</span>
                <span className="plans-soon-badge">Soon</span>
              </li>
            ))}
          </ul>
          <p className="plans-note-foot">
            If that changes, it changes in the panel first and on this page second.
          </p>
        </div>

        <div className="plans-note">
          <h3>Typography is free to use and Pro to hoard</h3>
          <p>
            The font catalogue, pairings, dossiers and the type scale are open to everyone,
            with no gate on copying or exporting what you make. Saving a type system writes it
            into a project, and Free holds {FREE_SAVE_LIMITS.projects} — so the wall is your
            {' '}{FREE_SAVE_LIMITS.projects + 1}th project, wherever you reach it from. Colour
            and icons follow the identical rule, on purpose: one limit is learnable, three are
            a maze.
          </p>
        </div>
      </section>

      <div className="plans-compare-wrap rail-overflow">
        <table className="plans-compare-table">
          <caption className="sr-only">
            Free and Pro compared, grouped by what you can keep, AI, colour, using the tools,
            and export. Every figure is read from the same configuration the product enforces.
          </caption>
          <thead><tr><th scope="col">Capability</th><th scope="col">Free</th><th scope="col" className="pct-pro">Pro</th></tr></thead>
          {/* GROUPED, AND QUANTIFIED. Mobbin/Mixpanel and Mobbin/Railway both
              lead their comparison with a "Usage limits" group of real numbers
              and only then list capabilities; Mobbin/Rox does the same with
              "Usage Limits" above "Features". That ordering is right here for a
              non-obvious reason: every wall in this product is a COUNT, so a
              table of ticks would hide the entire pricing model. There is not
              one bare tick below.

              Three columns and `.pct-pro` on every Pro cell are load-bearing —
              36-rail-overflow.spec.js counts those cells and asserts the table
              needs no horizontal gesture at 390px, where global.css switches it
              to table-layout:fixed at 44/28/28. Group rows are colSpan=3 so
              that arithmetic is untouched. */}
          <tbody>
            <tr className="pct-group"><th colSpan={3} scope="colgroup">What you can keep</th></tr>
            <tr><td>Saved projects (a palette, fonts and a type scale together)</td><td>{FREE_SAVE_LIMITS.projects}</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Custom icons</td><td>{FREE_SAVE_LIMITS.customIcons}</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Where the paywall is</td><td>Your {FREE_SAVE_LIMITS.projects + 1}th project</td><td className="pct-pro">No cap</td></tr>

            <tr className="pct-group"><th colSpan={3} scope="colgroup">AI</th></tr>
            <tr><td>AI generations per day</td><td>{AI.free.daily}</td><td className="pct-pro">{AI.pro.daily}</td></tr>
            <tr><td>AI generations per month</td><td>{AI.free.monthly}</td><td className="pct-pro">{AI.pro.monthly}</td></tr>
            <tr><td>AI model</td><td>Same on both plans</td><td className="pct-pro">Same on both plans</td></tr>

            <tr className="pct-group"><th colSpan={3} scope="colgroup">Colour</th></tr>
            <tr><td>Colour systems</td><td>{SYSTEMS_FREE.length} of {SYSTEMS_TOTAL}</td><td className="pct-pro">All {SYSTEMS_TOTAL}</td></tr>
            <tr><td>HCT editing</td><td className="pct-none">Not included</td><td className="pct-pro">Included</td></tr>
            <tr><td>Brand palettes</td><td>{BRANDS_FREE} of {BRANDS_TOTAL}</td><td className="pct-pro">All {BRANDS_TOTAL}</td></tr>

            <tr className="pct-group"><th colSpan={3} scope="colgroup">Using the tools</th></tr>
            <tr><td>Colour, type, icon and image tools</td><td>All of them</td><td className="pct-pro">All of them</td></tr>
            <tr><td>Palettes, font pairings, type scales and gradients</td><td>Unlimited</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Browsing the font catalogue</td><td>Unlimited</td><td className="pct-pro">Unlimited</td></tr>

            <tr className="pct-group"><th colSpan={3} scope="colgroup">Export</th></tr>
            <tr><td>Style guide formats</td><td>{listNames(FREE_EXPORTS)}</td><td className="pct-pro">{listNames(FREE_EXPORTS)}</td></tr>
            <tr><td>Number of exports</td><td>Unlimited</td><td className="pct-pro">Unlimited</td></tr>
            {PRO_EXPORTS.map((f) => (
              <tr key={f.id}><td>{f.name}</td><td className="pct-none">Not included</td><td className="pct-pro">Included</td></tr>
            ))}
            <tr><td>“Made with UIL4B” footer on exports</td><td>Present</td><td className="pct-pro">Removed</td></tr>
            <tr><td>{listNames(UNBUILT_EXPORTS)}</td><td className="pct-none">Not built</td><td className="pct-pro pct-none-pro">Not built</td></tr>
          </tbody>
        </table>
      </div>

      {/* ⚠️ FOUNDER FLAG — "Cancel any time" was removed from this row and from
          the Pro card's footer, and it is NOT a copy preference.

          [stripe-retention-config] is BLOCKED, and its note reads: "create
          RETAIN50 and enable cancellation/retention in the Stripe Customer
          Portal; checkout code is already live." Until that is done in the
          dashboard, the portal has no cancellation flow to show. The code side
          is correct and defensive — api/create-portal.js asks for
          flow_data.subscription_cancel and, if the portal rejects it, deletes
          the flow and opens the default portal rather than erroring — but a
          default portal with cancellation disabled still gives the user no way
          to cancel. So "cancel any time" is a promise the billing system cannot
          currently honour, which is exactly the class of claim this page is
          forbidden to make.

          What replaced it is the part that IS true no matter how the portal is
          configured: the period you paid for is yours, and nothing is deleted.
          The FAQ describes what cancelling does without promising a button.

          PUT IT BACK the moment the portal is configured — it is a good line
          and it should be here. */}
      <div className="plans-trust">
        <span><Check /> Free needs no card</span>
        <span><Check /> You keep the period you have paid for</span>
        <span><Check /> Nothing you saved is ever deleted</span>
      </div>

      <div className="plans-faq">
        <h2 className="plans-faq-h">Questions, answered</h2>
        {FAQ.map((item, index) => (
          <div key={item.q} className={`plans-faq-item${openFaq === index ? ' open' : ''}`}>
            <button className="plans-faq-q" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>
              {item.q}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {openFaq === index && <div className="plans-faq-a">{item.a}</div>}
          </div>
        ))}
      </div>

      <SystemCTA
        eyebrow="Start on Free"
        title="Build first. Upgrade when your workflow asks for it."
        description={`The complete toolkit is ready without a card. Pro raises the AI allowance, opens all ${SYSTEMS_TOTAL} colour systems and all ${BRANDS_TOTAL} brand palettes, and lifts the ${FREE_SAVE_LIMITS.projects}-project cap.`}
        primaryLabel={user ? 'Open Create' : 'Start building free'}
        primaryTo={user ? '/create/color' : '/login'}
        secondaryLabel="Explore colour tools"
        secondaryTo="/create/color"
        hint="No trial clock on Free"
      />
    </div>
  )
}
