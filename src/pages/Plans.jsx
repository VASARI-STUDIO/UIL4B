import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FREE_SAVE_LIMITS, useSubscription } from '../contexts/SubscriptionContext'
import { refreshPrices, useProPrice } from '../hooks/usePrices'
import SystemCTA from '../components/SystemCTA'

const BILLING_OPTIONS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'lifetime', label: 'One-off' },
]

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
    a: 'No. Free has no card requirement or trial clock. It includes the core toolkit, 40 AI actions per day, and a practical save allowance.',
  },
  {
    q: 'What changes on Pro?',
    a: 'Pro raises AI actions from 40 to 1,000 per day, removes the project and custom-icon save caps, unlocks advanced colour controls, and adds full design JSON export.',
  },
  {
    q: 'How does yearly billing work?',
    a: 'The yearly subscription starts with a 7-day free trial. The live saving is calculated from the current monthly and yearly Stripe prices.',
  },
  {
    q: 'What is the One-off option?',
    a: 'One payment grants durable Pro access to this account. Checkout remains disabled until an active one-off Stripe price is available for your currency.',
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
    const next = BILLING_OPTIONS[(index + BILLING_OPTIONS.length) % BILLING_OPTIONS.length]
    setBilling(next.id)
    tabRefs.current[(index + BILLING_OPTIONS.length) % BILLING_OPTIONS.length]?.focus()
  }
  const onTabKeyDown = (event, index) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); selectTab(index + 1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); selectTab(index - 1) }
    else if (event.key === 'Home') { event.preventDefault(); selectTab(0) }
    else if (event.key === 'End') { event.preventDefault(); selectTab(BILLING_OPTIONS.length - 1) }
  }

  const amount = billing === 'monthly' ? price.monthly
    : billing === 'yearly' ? price.yearlyTotal
      : price.lifetime
  const cadence = billing === 'monthly' ? 'per month'
    : billing === 'yearly' ? 'per year'
      : 'one payment'
  const checkoutHref = `/checkout?plan=${billing}`
  const signInFrom = `${location.pathname}${location.search || ''}`
  const proTo = user ? checkoutHref : '/login'
  const proState = user ? undefined : { from: checkoutHref, returnTo: signInFrom }
  // Only claim a tab is unavailable once the price service has actually
  // answered — otherwise the first paint accuses the One-off tab of being
  // disabled while the fetch is still in flight.
  const priceServiceDown = price.loaded && !price.serviceAvailable
  const lifetimeUnavailable = billing === 'lifetime' && price.loaded && !price.availability.lifetime
  const priceState = !price.loaded ? 'Checking live price…'
    : priceServiceDown ? (amount
      ? `Live pricing is unreachable · showing the canonical ${price.currencyLabel} amount`
      : 'Live pricing is unreachable · no price can be shown right now')
      : price.source[billing] === 'live' ? `${price.currencyLabel} live price`
        : billing === 'lifetime' ? `${price.currencyLabel} canonical price · checkout not active`
          : `${price.currencyLabel} guide price · confirmed at checkout`

  return (
    <div className="sec plans-page">
      <div className="sec-h plans-hero">
        <div className="sec-h-eyebrow">Plans</div>
        <h1>More room when your <em>workflow grows</em>.</h1>
        <p>Start with the complete core toolkit. Choose a subscription or one-off Pro access when you need higher limits and advanced handoff controls.</p>
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
          <p className="plans-card-intro">A capable everyday workspace with clear, predictable limits.</p>
          <ul className="sub-tier-list">
            <li><Check /> 40 AI actions each day</li>
            <li><Check /> Save {FREE_SAVE_LIMITS.projects} projects and {FREE_SAVE_LIMITS.customIcons} custom icons</li>
            <li><Check /> Core colour, type, icon and image tools</li>
            <li><Check /> Standard CSS and palette exports</li>
          </ul>
          {user
            ? <button className="btn sub-tier-btn" disabled>{isPro ? 'Included with Pro' : 'Current plan'}</button>
            : <Link className="btn sub-tier-btn" to="/login">Start on Free</Link>}
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
            {billing === 'lifetime' && (
              <div className="plans-price-detail">Durable Pro access for this account · no subscription</div>
            )}
            {priceServiceDown && (
              <button type="button" className="btn btn-s plans-price-retry" onClick={() => refreshPrices()}>
                Retry live pricing
              </button>
            )}
          </div>

          <p className="plans-card-intro plans-pro-intro">Everything in Free, plus the daily capacity, colour depth and handoff exports a full system build needs.</p>

          <div className="plans-outcomes" aria-label="Verified Pro outcomes">
            <section className="plans-outcome-group">
              <h2>More capacity</h2>
              <div className="plans-outcome-metrics">
                <div><strong>1,000</strong><span>AI actions per day, up from 40 on Free</span></div>
                <div><strong>Unlimited</strong><span>saved projects and custom icons, up from {FREE_SAVE_LIMITS.projects} and {FREE_SAVE_LIMITS.customIcons} on Free</span></div>
              </div>
            </section>
            <section className="plans-outcome-group">
              <h2>Deeper colour control</h2>
              <p>Advanced harmonies, HCT editing, expanded palettes and gated colour-system controls.</p>
            </section>
            <section className="plans-outcome-group">
              <h2>Cleaner handoff</h2>
              <p>Full design JSON export and watermark-free palette export where that Pro export is supported.</p>
            </section>
          </div>

          {isPro ? (
            <Link className="btn sub-tier-btn" to="/settings" state={{ section: 'support' }}>View account details</Link>
          ) : lifetimeUnavailable ? (
            <button
              type="button"
              className="btn btn-accent sub-tier-btn"
              aria-disabled="true"
              aria-describedby="lifetime-unavailable"
            >
              One-off not available yet
            </button>
          ) : (
            <Link
              className="btn btn-accent sub-tier-btn"
              to={proTo}
              state={proState}
              aria-disabled={subLoading || !price.loaded}
              onClick={(event) => { if (subLoading || !price.loaded) event.preventDefault() }}
            >
              {billing === 'yearly' ? 'Start 7-day free trial' : billing === 'lifetime' ? 'Buy Pro once' : 'Choose monthly Pro'}
            </Link>
          )}
          {lifetimeUnavailable && (
            <p id="lifetime-unavailable" className="plans-unavailable-note">No payment will be started until the live one-off price is active for {price.currencyLabel}. Monthly and Yearly are unaffected.</p>
          )}
          {!lifetimeUnavailable && <div className="sub-tier-foot">Secure checkout by Stripe</div>}
        </article>
      </div>

      <div className="plans-compare-wrap">
        <table className="plans-compare-table">
          <caption className="sr-only">Free and Pro verified limits and capabilities</caption>
          <thead><tr><th scope="col">Capability</th><th scope="col">Free</th><th scope="col" className="pct-pro">Pro</th></tr></thead>
          <tbody>
            <tr><td>AI actions per day</td><td>40</td><td className="pct-pro">1,000</td></tr>
            <tr><td>Saved projects</td><td>{FREE_SAVE_LIMITS.projects}</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Custom icons</td><td>{FREE_SAVE_LIMITS.customIcons}</td><td className="pct-pro">Unlimited</td></tr>
            <tr><td>Advanced colour controls</td><td>Core controls</td><td className="pct-pro">Unlocked</td></tr>
            <tr><td>Design JSON export</td><td className="pct-none">Not included</td><td className="pct-pro">Full design JSON</td></tr>
            <tr><td>Palette export watermark</td><td>UIL4B credit</td><td className="pct-pro">Removed</td></tr>
          </tbody>
        </table>
      </div>

      <div className="plans-trust">
        <span><Check /> Free needs no card</span>
        <span><Check /> Subscriptions can be cancelled</span>
        <span><Check /> One-off is not a subscription</span>
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
        description="The core toolkit is ready without a card. Pro adds capacity, advanced colour control and fuller handoff."
        primaryLabel={user ? 'Open the workspace' : 'Start building free'}
        primaryTo={user ? '/color' : '/login'}
        secondaryLabel="Explore colour tools"
        secondaryTo="/color"
        hint="No trial clock on Free"
      />
    </div>
  )
}
