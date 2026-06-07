import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { canUseFeature, getRemainingUses, getUsageCount, getResetTime } from '../utils/usageTracker'

/**
 * UsageGate — wraps AI-powered actions with authentication + daily limit checks.
 *
 * Props:
 *   toolId      — unique identifier for the tool (e.g. "alt-text")
 *   dailyLimit  — max number of uses per day
 *   children    — the content to render when access is allowed
 */
export default function UsageGate({ toolId, dailyLimit, children }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ---------- Not authenticated ----------
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

  // ---------- Limit reached ----------
  if (!canUseFeature(toolId, dailyLimit)) {
    const reset = getResetTime()
    const now = new Date()
    const diffMs = reset - now
    const diffH = Math.floor(diffMs / 3600000)
    const diffM = Math.floor((diffMs % 3600000) / 60000)

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
          Your limit resets in <strong>{diffH > 0 ? `${diffH}h ` : ''}{diffM}m</strong>.
        </div>
        <div className="usage-gate-counter">
          {getUsageCount(toolId)} / {dailyLimit} used today
        </div>
      </div>
    )
  }

  // ---------- Allowed ----------
  return (
    <>
      <div className="usage-gate-remaining">
        {getRemainingUses(toolId, dailyLimit)} / {dailyLimit} uses remaining today
      </div>
      {children}
    </>
  )
}
