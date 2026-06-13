import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useNavigate } from 'react-router-dom'
import { canUseFeature, getRemainingUses, getUsageCount } from '../utils/usageTracker'

export default function UsageGate({ toolId, children }) {
  const { user } = useAuth()
  const { plan, isPro, checkout } = useSubscription()
  const navigate = useNavigate()

  const dailyLimit = plan?.limits?.[toolId] ?? plan?.limits?.['ai-default'] ?? 40

  if (!user) {
    return (
      <div className="usage-gate-card">
        <div className="usage-gate-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <div className="usage-gate-title">Sign in required</div>
        <div className="usage-gate-text">
          This AI-powered tool requires a free account. Sign in to start generating.
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/login')}>
          Sign in
        </button>
      </div>
    )
  }

  if (!canUseFeature(toolId, dailyLimit)) {
    return (
      <div className="usage-gate-card">
        <div className="usage-gate-icon limit">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="usage-gate-title">Daily limit reached</div>
        <div className="usage-gate-text">
          You have used all <strong>{dailyLimit}</strong> daily uses for this tool.
        </div>
        {!isPro && (
          <button className="btn btn-accent" onClick={() => checkout('monthly')}>
            Upgrade to Pro for 1,000/day
          </button>
        )}
        <div className="usage-gate-counter">
          {getUsageCount(toolId)} / {dailyLimit} used today
        </div>
      </div>
    )
  }

  const remaining = getRemainingUses(toolId, dailyLimit)
  const used = getUsageCount(toolId)
  const pct = Math.min(100, Math.round((used / dailyLimit) * 100))
  const low = remaining <= Math.max(2, Math.round(dailyLimit * 0.1))

  return (
    <>
      <div className="usage-gate-meter">
        <div className="usage-gate-meter-head">
          <span className="usage-gate-meter-label">
            AI generations today
            {isPro && <span className="usage-gate-badge">Pro</span>}
          </span>
          <span className={`usage-gate-meter-count${low ? ' low' : ''}`}>
            <strong>{remaining}</strong> / {dailyLimit} left
          </span>
        </div>
        <div className="usage-gate-meter-track">
          <div className={`usage-gate-meter-fill${low ? ' low' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        {low && !isPro && (
          <button type="button" className="usage-gate-meter-upgrade" onClick={() => checkout('monthly')}>
            Running low — upgrade to Pro for 1,000/day
          </button>
        )}
      </div>
      {children}
    </>
  )
}
