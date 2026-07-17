import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useProPrice } from '../hooks/usePrices'

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function Star() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z" />
    </svg>
  )
}

const DEFAULT_FEATURES = [
  'Unlimited palettes, projects & icon saves',
  'Pro colour tools — HCT editing and light + dark contrast',
  'Clean, watermark-free exports',
  'Every brand system, fully editable',
]

// Canonical Pro-upgrade modal (Image 3). Opened imperatively via
// useProModal().openProModal(opts); reads live Stripe prices so the CTA can
// never show a price we don't charge.
export default function ProUpgradeModal({ opts = {}, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const price = useProPrice('aud')

  const {
    title = 'Unlock everything with Pro',
    subtitle = 'Go Pro to remove the limits — keep your exports clean and every tool unlocked.',
    eyebrow = 'UIL4B Pro',
    features = DEFAULT_FEATURES,
  } = opts

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const goCheckout = async () => {
    onClose()
    if (!user) {
      const u = await requireLogin('upgrade to Pro')
      if (!u) return
    }
    navigate('/checkout')
  }

  // Strings from useProPrice are already formatted (e.g. "A$3.33"); the hook
  // falls back to the AUD anchor on its own, so never re-format them here.
  // The headline rate is the YEARLY plan's monthly equivalent — the cheapest
  // honest "per month" number we charge.
  const amount = price.yearlyPerMonth

  return (
    <div className="ui-modal-overlay" onMouseDown={onClose}>
      <div
        className="ui-modal ui-pro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-pro-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ui-pro-grid">
          <div className="ui-pro-main">
            <div className="ui-modal-head" style={{ padding: 0 }}>
              <span className="ui-pro-eyebrow">{eyebrow}</span>
              <button type="button" className="ui-modal-x" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <h2 className="ui-pro-title" id="ui-pro-title">{title}</h2>
            <p className="ui-pro-sub">{subtitle}</p>
            <ul className="ui-pro-list">
              {features.map((f, i) => (
                <li className="ui-pro-li" key={i}>
                  <span className="ui-pro-tick"><Tick /></span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="ui-pro-price">
              <span className="ui-pro-amount">{amount}</span>
              <span className="ui-pro-per">/ month — {price.yearlyTotal} billed yearly</span>
              {price.savingsPct > 0 && (
                <span className="ui-pro-save">Save {price.savingsPct}% vs monthly</span>
              )}
            </div>
            <div className="ui-pro-cta">
              <button type="button" className="btn btn-accent btn-l" onClick={goCheckout}>
                {user ? 'Upgrade to Pro' : 'Get started free'}
              </button>
            </div>
            <p className="ui-pro-note">
              Cancel anytime. <button type="button" onClick={() => { onClose(); navigate('/plans') }}>See all plans</button>
            </p>
          </div>

          <div className="ui-pro-art" aria-hidden="true">
            <div className="ui-pro-art-glyphs">
              <svg width="150" height="150" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
                <circle cx="60" cy="14" r="9" fill="#fff" opacity=".95" />
                <circle cx="100" cy="60" r="9" fill="#fff" opacity=".75" />
                <circle cx="60" cy="106" r="9" fill="#fff" opacity=".6" />
                <circle cx="20" cy="60" r="9" fill="#fff" opacity=".85" />
                <circle cx="60" cy="60" r="6" fill="#fff" />
              </svg>
            </div>
            <div className="ui-pro-proof">
              <div className="ui-pro-proof-stars">
                <Star /><Star /><Star /><Star /><Star />
              </div>
              <p className="ui-pro-proof-txt">Loved by designers who’d rather build than tab-hop.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
