import { useState, useRef, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProPrice } from '../hooks/usePrices'

const ONBOARDED_KEY = 'vs-onboarded'

const QUESTIONS = [
  {
    id: 'source',
    q: 'How did you hear about us?',
    options: ['Search engine', 'Social media', 'Friend or colleague', 'YouTube / video', 'Somewhere else'],
  },
  {
    id: 'use',
    q: 'What will you mainly use UIL4B for?',
    options: ['Web design', 'Branding & identity', 'UI / UX work', 'Marketing & social', 'Just exploring'],
  },
  {
    id: 'role',
    q: 'What best describes you?',
    options: ['Designer', 'Developer', 'Founder / entrepreneur', 'Student', 'Hobbyist'],
  },
]

const PRO_FEATURES = [
  '1,000 AI generations per day',
  'Higher-quality AI models',
  'Projects synced across devices',
  'Advanced design-system exports',
  'Priority support',
]

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function Onboarding() {
  const { user, userProfile, updateProfile, loading } = useAuth()
  const { checkout } = useSubscription()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [billing, setBilling] = useState('yearly')
  const [busy, setBusy] = useState(false)
  const proPrice = useProPrice()
  const headingRef = useRef(null)

  // New sign-ups now reach /onboarding via a `navigate(..., {replace:true})` that
  // manages no focus of its own (App.jsx), so a keyboard/AT user would be dropped
  // to <body> with no announcement. Move focus to the step heading on mount and on
  // every step change so the flow is keyboard-navigable and screen-reader-announced
  // (audit C5 / QA Q3). The heading carries tabIndex={-1} to be programmatically
  // focusable without becoming a tab stop.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // Onboarding only makes sense for a signed-in user. While auth is still
  // resolving we show the flow shell; if definitively signed out, go to login.
  if (!loading && !user) return <Navigate to="/login" replace />

  const total = QUESTIONS.length
  const onPricing = step >= total
  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const persist = () => {
    try { updateProfile?.({ onboarding: { ...answers, completedAt: Date.now() } }) } catch { /* ignore */ }
    try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* ignore */ }
  }

  const choose = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }))
    setTimeout(() => setStep(s => s + 1), 160)
  }

  const back = () => setStep(s => Math.max(0, s - 1))

  const finishFree = () => {
    persist()
    navigate('/home')
  }

  const finishPro = async () => {
    persist()
    setBusy(true)
    try {
      await checkout(billing)
    } catch {
      navigate('/home')
    }
  }

  const skip = () => {
    try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* ignore */ }
    navigate('/home')
  }

  return (
    <div className="onb">
      <div className="onb-card">
        <div className="onb-top">
          <div className="onb-brand">UIL4B</div>
          <button type="button" className="onb-skip" onClick={skip}>Skip</button>
        </div>

        <div className="onb-progress">
          {QUESTIONS.map((_, i) => (
            <span key={i} className={`onb-dot${i < step ? ' done' : ''}${i === step ? ' active' : ''}`} />
          ))}
          <span className={`onb-dot${onPricing ? ' active' : ''}`} />
        </div>

        {!onPricing ? (
          <div className="onb-step" key={step}>
            {step === 0 && (
              <div className="onb-greeting">Welcome, <em>{firstName}</em> <span aria-hidden="true">👋</span></div>
            )}
            <h1 className="onb-q" ref={headingRef} tabIndex={-1}>{QUESTIONS[step].q}</h1>
            <p className="onb-sub">Quick question {step + 1} of {total} — this helps us improve UIL4B.</p>
            <div className="onb-options">
              {QUESTIONS[step].options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`onb-option${answers[QUESTIONS[step].id] === opt ? ' selected' : ''}`}
                  onClick={() => choose(QUESTIONS[step].id, opt)}
                >
                  <span>{opt}</span>
                  <svg className="onb-option-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" className="onb-back" onClick={back}>← Back</button>
            )}
          </div>
        ) : (
          <div className="onb-step onb-pricing-step">
            <div className="onb-greeting">You're all set, <em>{firstName}</em>.</div>
            <h1 className="onb-q" ref={headingRef} tabIndex={-1}>Pick the plan that fits.</h1>
            <p className="onb-sub">Everything core is free forever. Upgrade any time for more AI — or start free and decide later.</p>

            <div className="onb-billing">
              <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
              <button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>
                Yearly {proPrice.savingsPct > 0 && <span className="onb-save">Save {proPrice.savingsPct}%</span>}
              </button>
            </div>

            <div className="onb-tiers">
              <div className="onb-tier">
                <div className="onb-tier-name">Free</div>
                <div className="onb-tier-price"><span className="onb-tier-amount">$0</span><span className="onb-tier-per">forever</span></div>
                <ul className="onb-tier-list">
                  <li><CheckIcon /> All core design tools</li>
                  <li><CheckIcon /> Unlimited palettes &amp; exports</li>
                  <li><CheckIcon /> 40 AI generations / day</li>
                </ul>
                <button className="btn onb-tier-btn" onClick={finishFree} disabled={busy}>Start with Free</button>
              </div>

              <div className="onb-tier onb-tier-pro">
                <span className="onb-tier-flag">Best value</span>
                <div className="onb-tier-name">Pro</div>
                <div className="onb-tier-price">
                  <span className="onb-tier-amount">{billing === 'yearly' ? proPrice.yearlyTotal : proPrice.monthly}</span>
                  <span className="onb-tier-per">{billing === 'yearly' ? '/year' : '/month'}</span>
                </div>
                <div className="onb-tier-sub">{billing === 'yearly' ? `AUD · ${proPrice.yearlyPerMonth}/mo` : 'AUD · billed monthly'}</div>
                <ul className="onb-tier-list">
                  {PRO_FEATURES.map(f => <li key={f}><CheckIcon /> {f}</li>)}
                </ul>
                <button className="btn btn-accent onb-tier-btn" onClick={finishPro} disabled={busy}>
                  {busy ? 'Redirecting to Stripe…' : `Go Pro — ${billing === 'yearly' ? `${proPrice.yearlyTotal}/yr` : `${proPrice.monthly}/mo`}`}
                </button>
                <div className="onb-tier-foot">Secure checkout via Stripe · cancel anytime</div>
              </div>
            </div>

            <button type="button" className="onb-back" onClick={finishFree} disabled={busy}>Maybe later — continue free</button>
          </div>
        )}
      </div>
    </div>
  )
}
