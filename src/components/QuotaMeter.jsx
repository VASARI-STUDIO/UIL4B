// The AI allowance, shown before it runs out rather than after.
//
// Two things it deliberately does NOT do:
//
//  • It does not invent a monthly figure. Nothing local counts across days, so
//    until a server response arrives the monthly line is simply absent. A
//    guessed ceiling is worse than a missing one.
//  • It does not say "resets at midnight" when the MONTHLY ceiling is the one
//    biting. That reset is the 1st, and telling someone the wrong one is a lie
//    they will act on by coming back tomorrow to the same wall.

import { Link } from 'react-router-dom'

function Bar({ label, bucket, tone }) {
  const pct = bucket.limit > 0 ? Math.min(100, Math.round((bucket.used / bucket.limit) * 100)) : 0
  return (
    <div className="quota-row">
      <div className="quota-row-h">
        <span className="quota-label">{label}</span>
        <span className="quota-count">
          {bucket.used} / {bucket.limit}
        </span>
      </div>
      <div
        className={`quota-track quota-track--${tone}`}
        role="progressbar"
        aria-valuenow={bucket.used}
        aria-valuemin={0}
        aria-valuemax={bucket.limit}
        aria-label={`${label}: ${bucket.used} of ${bucket.limit} used`}
      >
        <span className="quota-fill" ref={(el) => el && el.style.setProperty('--quota-pct', `${pct}%`)} />
      </div>
    </div>
  )
}

export default function QuotaMeter({ quota, className = '' }) {
  if (!quota?.daily?.limit) return null
  const { daily, monthly, binding, blocked, message, source } = quota
  const tone = blocked ? 'out' : binding ? 'low' : 'ok'

  return (
    <div className={`quota ${className}`.trim()}>
      <Bar label="Today" bucket={daily} tone={daily.exhausted ? 'out' : daily.low ? 'low' : 'ok'} />
      {monthly && (
        <Bar label="This month" bucket={monthly} tone={monthly.exhausted ? 'out' : monthly.low ? 'low' : 'ok'} />
      )}
      {message && (
        // aria-live so someone who has just used their last generation is told,
        // rather than discovering it from a button that stopped working.
        <p className={`quota-msg quota-msg--${tone}`} aria-live="polite">{message}</p>
      )}
      {message && !quota.isPro && (
        // The wall, or the approach to it, is where someone on Free actually
        // wants to know what Pro allows. Not shown to Pro, whose next step is
        // the reset, not a page selling them what they have.
        <p className="quota-note"><Link to="/plans">See all plans</Link></p>
      )}
      {source === 'local' && (
        <p className="quota-note">Counted on this device until your first generation today.</p>
      )}
    </div>
  )
}
