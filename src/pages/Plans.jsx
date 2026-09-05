import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AI_LIMITS, FREE_SAVE_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { refreshPrices, useProPrice } from '../hooks/usePrices'
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

// Every AI figure on this page comes from AI_LIMITS, which is unit-tested
// against api/_lib/plans.js — the server, and the only number that is real.
// Typing them in by hand is how this page came to advertise 1,000 AI actions a
// day against a free provider tier that meters per project, not per user.
const AI = AI_LIMITS

function Check() {
  return (
    <svg className="sub-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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
    a: `No. Free has no card requirement and no trial clock. It includes the complete core toolkit — every colour, type, icon and image tool — plus ${AI.free.daily} AI generations a day (${AI.free.monthly} a month) and room for ${FREE_SAVE_LIMITS.projects} saved projects.`,
  },
  {
    q: 'Why are the AI limits not higher?',
    a: `Because we would rather quote a number that always works than a big one that fails in month two. AI generation currently runs on free provider tiers, which are metered across the whole site rather than per person — so the honest per-user allowance is small. Pro raises it from ${AI.free.daily} to ${AI.pro.daily} a day and from ${AI.free.monthly} to ${AI.pro.monthly} a month. When paid capacity is funded, these go up, and you keep whatever plan you are on.`,
  },
  {
    q: 'Does Pro use a better AI model?',
    a: 'No, and we will not claim otherwise. Free and Pro run the same model today. Pro buys capacity, the advanced colour controls, and watermark-free export — not different output from the same prompt.',
  },
  {
    q: 'What counts as an AI generation?',
    a: 'One image described by the Alt Text generator, or one prompt produced by an AI tool. Browsing, editing palettes, exporting CSS, and everything else in the toolkit are unmetered — they run in your browser and cost us nothing.',
  },
  {
    q: 'How does yearly billing work?',
    a: 'Yearly starts with a 7-day free trial and is charged once a year. The saving shown is calculated live from the current monthly and yearly Stripe prices, not from a number typed onto this page.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'You keep Pro until the end of the period you have already paid for, then the account moves to Free. Nothing you have saved is deleted — if you are over the Free project limit, existing projects stay readable and you simply cannot add more until you are under it again.',
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
        <h1>The whole toolkit is <em>free</em>. Pro adds room.</h1>
        <p>
          Every colour, type, icon and image tool runs in your browser without an account —
          and without a limit, because it costs us nothing to run. Pro is for when you want
          more AI capacity, deeper colour control and clean handoff.
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
          <ul className="sub-tier-list">
            <li><Check /> Every colour, type, icon and image tool</li>
            <li><Check /> Unlimited palettes, font pairings, type scales, gradients and exports</li>
            <li><Check /> {AI.free.daily} AI generations a day · {AI.free.monthly} a month</li>
            <li><Check /> {FREE_SAVE_LIMITS.projects} saved projects and {FREE_SAVE_LIMITS.customIcons} custom icons</li>
          </ul>
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

          <ul className="sub-tier-list">
            <li><Check /> <strong>{AI.pro.daily} AI generations a day</strong> · {AI.pro.monthly} a month</li>
            <li><Check /> <strong>Unlimited</strong> saved projects and custom icons</li>
            <li><Check /> Advanced harmonies, HCT editing and expanded palettes</li>
            <li><Check /> Watermark-free export and full design JSON</li>
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
          {!(price.loaded && !amount) && <div className="sub-tier-foot">Secure checkout by Stripe · cancel any time</div>}
        </article>
      </div>

      {/* Said plainly, on the page, rather than discovered at a 429. Capacity
          that is shared is a fact about the product, and a user who reads it
          here is not surprised by it later. See growth-persuasion.md. */}
      <p className="plans-honesty" role="note">
        <strong>About the AI limits:</strong> AI generation currently runs on free provider
        tiers, which are metered across the whole site rather than per person. We quote
        allowances we can actually honour instead of large ones we cannot. Everything else in
        UIL4B runs in your browser and is unmetered on both plans.
      </p>

      <div className="plans-compare-wrap rail-overflow">
        <table className="plans-compare-table">
          <caption className="sr-only">Free and Pro verified limits and capabilities</caption>
          <thead><tr><th scope="col">Capability</th><th scope="col">Free</th><th scope="col" className="pct-pro">Pro</th></tr></thead>
          <tbody>
            <tr><td>Colour, type, icon and image tools</td><td>All of them</td><td className="pct-pro">All of them</td></tr>
            <tr><td>Palettes, font pairings, type scales and exports</td><td>Unlimited</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>AI generations per day</td><td>{AI.free.daily}</td><td className="pct-pro">{AI.pro.daily}</td></tr>
            <tr><td>AI generations per month</td><td>{AI.free.monthly}</td><td className="pct-pro">{AI.pro.monthly}</td></tr>
            <tr><td>AI model</td><td>Same on both plans</td><td className="pct-pro">Same on both plans</td></tr>
            <tr><td>Saved projects (palette, fonts and type scale)</td><td>{FREE_SAVE_LIMITS.projects}</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Custom icons</td><td>{FREE_SAVE_LIMITS.customIcons}</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Advanced colour controls</td><td>Core controls</td><td className="pct-pro">Unlocked</td></tr>
            <tr><td>Design JSON export</td><td className="pct-none">Not included</td><td className="pct-pro">Full design JSON</td></tr>
            <tr><td>Palette export watermark</td><td>UIL4B credit</td><td className="pct-pro">Removed</td></tr>
          </tbody>
        </table>
      </div>

      <div className="plans-trust">
        <span><Check /> Free needs no card</span>
        <span><Check /> Cancel any time, keep the period you paid for</span>
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
        description="The complete toolkit is ready without a card. Pro adds capacity, advanced colour control and fuller handoff."
        primaryLabel={user ? 'Open Create' : 'Start building free'}
        primaryTo={user ? '/create/color' : '/login'}
        secondaryLabel="Explore colour tools"
        secondaryTo="/create/color"
        hint="No trial clock on Free"
      />
    </div>
  )
}
