import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProPrice } from '../hooks/usePrices'

function Check() {
  return (
    <svg className="sub-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const PRICE_COMPARISONS = [
  { emoji: '☕', text: 'less than 2 coffees a month' },
  { emoji: '🥤', text: 'less than one smoothie a month' },
  { emoji: '🎬', text: 'less than most streaming services' },
  { emoji: '🍔', text: 'less than one lunch out' },
  { emoji: '🅿️', text: 'less than 2 hours of city parking' },
  { emoji: '🍺', text: 'less than one pint at the pub' },
  { emoji: '🚗', text: 'less than one short Uber ride' },
  { emoji: '🎟️', text: 'less than one movie ticket' },
]

const FAQ = [
  {
    q: 'Do I need a card to use the free plan?',
    a: 'No. Free is genuinely free — no card, no trial clock. Every core design tool, unlimited palettes, scales and exports, plus 40 AI generations a day.',
  },
  {
    q: 'What counts as an “AI generation”?',
    a: 'Any single AI action — an alt-text write-up, an image prompt, or a landing-page draft. Free gives you 40 a day; Pro raises that to 1,000 and uses higher-quality models.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Manage or cancel your plan from Settings in one click. If you cancel, Pro stays active until the end of the period you already paid for.',
  },
  {
    q: 'Is the yearly free trial really free?',
    a: 'Yes — the yearly plan starts with a 7-day free trial. You won’t be charged today, and you can cancel before it ends at no cost.',
  },
]

export default function Plans() {
  const { user } = useAuth()
  const { isPro, loading: subLoading } = useSubscription()
  const [billing, setBilling] = useState('yearly')
  const proPrice = useProPrice()
  const [coffeeIdx, setCoffeeIdx] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setCoffeeIdx(i => (i + 1) % PRICE_COMPARISONS.length), 4000)
    return () => clearInterval(timer)
  }, [])

  const checkoutHref = `/checkout?plan=${billing}`
  // Signed-out users bounce through login, then land straight on checkout with
  // the plan they picked preserved.
  const proTo = user ? checkoutHref : '/login'
  const proState = user ? undefined : { from: checkoutHref }

  return (
    <div className="sec plans-page">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Pricing</div>
        <h1>Simple, honest <em>pricing</em>.</h1>
        <p>One product, one subscription. Start free forever — upgrade to Pro only when you need more AI. No hidden tiers, no per-seat maths.</p>
      </div>

      {isPro && (
        <div className="plans-pro-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          <span>You’re on <strong>UIL4B Pro</strong> — thank you for supporting the project. <Link to="/settings" state={{ section: 'support' }}>Manage your plan →</Link></span>
        </div>
      )}

      <div className="sub-billing-toggle" role="tablist" aria-label="Billing interval">
        <button role="tab" aria-selected={billing === 'monthly'} className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
        <button role="tab" aria-selected={billing === 'yearly'} className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>
          Yearly {proPrice.savingsPct > 0 && <span className="sub-save">Save {proPrice.savingsPct}%</span>}
        </button>
      </div>

      <div className="sub-tiers plans-tiers">
        {/* Free */}
        <div className="sub-tier">
          <div className="sub-tier-head">
            <div className="sub-tier-name">Free</div>
            <div className="sub-tier-price"><span className="sub-tier-amount">$0</span><span className="sub-tier-per">forever</span></div>
          </div>
          <ul className="sub-tier-list">
            <li><Check /> All core design tools</li>
            <li><Check /> Unlimited palettes, scales &amp; exports</li>
            <li><Check /> 40 AI generations per day</li>
            <li><Check /> Local browser saves</li>
          </ul>
          {user ? (
            <button className="btn sub-tier-btn" disabled>{isPro ? 'Included in Pro' : 'Your current plan'}</button>
          ) : (
            <Link className="btn sub-tier-btn" to="/login">Get started free</Link>
          )}
          <div className="sub-tier-foot">No card required</div>
        </div>

        {/* Pro */}
        <div className="sub-tier sub-tier-pro">
          <span className="sub-tier-flag">Recommended</span>
          <div className="sub-tier-head">
            <div className="sub-tier-name">Pro</div>
            <div className="sub-tier-price">
              <span className="sub-tier-amount">{billing === 'yearly' ? proPrice.yearlyTotal : proPrice.monthly}</span>
              <span className="sub-tier-per">{billing === 'yearly' ? 'per year' : 'per month'}</span>
            </div>
            <div className="sub-tier-sub">{billing === 'yearly' ? `AUD · ${proPrice.yearlyPerMonth}/mo${proPrice.savingsPct > 0 ? `, save ${proPrice.savingsPct}%` : ''} · 7-day free trial` : 'AUD · billed monthly'}</div>
          </div>
          <ul className="sub-tier-list">
            <li><Check /> <strong>Everything in Free, plus:</strong></li>
            {billing === 'yearly' && <li><Check /> <strong>7-day free trial</strong> — cancel anytime</li>}
            <li><Check /> 1,000 AI generations per day</li>
            <li><Check /> Higher-quality AI models</li>
            <li><Check /> Projects synced across devices</li>
            <li><Check /> Advanced design-system exports</li>
            <li><Check /> Priority support</li>
          </ul>
          {isPro ? (
            <Link className="btn sub-tier-btn" to="/settings" state={{ section: 'support' }}>Manage plan</Link>
          ) : (
            <Link
              className="btn btn-accent sub-tier-btn"
              to={proTo}
              state={proState}
              aria-disabled={subLoading}
            >
              {billing === 'yearly' ? 'Start 7-day free trial' : `Upgrade — ${proPrice.monthly}/mo`}
            </Link>
          )}
          <div className="sub-tier-foot">Secure checkout via Stripe · cancel anytime</div>
          <div className="plans-compare">
            <span aria-hidden="true">{PRICE_COMPARISONS[coffeeIdx].emoji}</span> That&apos;s {PRICE_COMPARISONS[coffeeIdx].text}
          </div>
        </div>

        {/* Premium Plus — coming soon */}
        <div className="sub-tier plans-tier-soon">
          <span className="sub-tier-flag plans-flag-soon">Coming Soon</span>
          <div className="sub-tier-head">
            <div className="sub-tier-name">Premium Plus</div>
            <div className="sub-tier-price"><span className="sub-tier-amount">—</span><span className="sub-tier-per">TBA</span></div>
          </div>
          <ul className="sub-tier-list">
            <li><Check /> Everything in Pro</li>
            <li><Check /> Unlimited AI generations</li>
            <li><Check /> Team collaboration</li>
            <li><Check /> Custom branding on exports</li>
            <li><Check /> White-label option</li>
            <li><Check /> Dedicated support</li>
          </ul>
          <button className="btn sub-tier-btn" disabled>Coming soon</button>
        </div>
      </div>

      {/* Reassurance strip */}
      <div className="plans-trust">
        <span><Check /> Cancel anytime</span>
        <span><Check /> Secure Stripe checkout</span>
        <span><Check /> No card for Free</span>
      </div>

      {/* FAQ */}
      <div className="plans-faq">
        <h2 className="plans-faq-h">Questions, answered</h2>
        {FAQ.map((f, i) => (
          <div key={f.q} className={`plans-faq-item${openFaq === i ? ' open' : ''}`}>
            <button className="plans-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
              {f.q}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {openFaq === i && <div className="plans-faq-a">{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
