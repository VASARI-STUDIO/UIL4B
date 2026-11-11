import { Link } from 'react-router-dom'

// The allowances, inside the Today panel: the plan's AI meter, the Free plan's project meter and the
// plan line. (It was a band under the title; the date now frames the daily allowance, so it lives
// with it.)
//
// Only a meter the plan actually has is drawn. Pro has no project limit (SubscriptionContext
// resolves it to Infinity), so a Pro account sees the AI meter alone rather than "3 of Infinity".
// A signed-out visitor is given no strip at all (the page does not mount this) — they have no plan —
// which is the property tests/user-sim/20-billing-banner.spec.js holds.
//
// The project count prints here and nowhere else on the page. `data-testid="project-quota-note"` rides
// on the project meter because this IS the page's statement of the cap; the refusal itself still
// happens where it is asked for, at New project (SaveRefusal).
export default function PlanStrip({ planLabel, isPro, ai, slots, asOf }) {
  // One condition decides whose count is shown, for the note and the meter's spoken value alike.
  const onAccount = ai?.source === 'account'
  const atCap = !!slots && slots.used >= slots.limit
  return (
    <div className="uh-plan">
      <div className="uh-meters">
        {ai && (
          <div className="uh-meter">
            <div className="uh-meter-row">
              <span>AI generations today</span>
              <span className="uh-meter-val">{ai.used} of {ai.limit}</span>
            </div>
            <span
              className="uh-meter-track"
              role="meter"
              aria-label="AI generations today"
              aria-valuemin={0}
              aria-valuemax={ai.limit}
              aria-valuenow={ai.used}
              aria-valuetext={`${ai.used} of ${ai.limit} today, ${onAccount ? 'on your account' : 'counted on this browser'}`}
            >
              <span className="uh-meter-fill is-accent" style={{ width: `${ai.pct}%` }} />
            </span>
            {/* Whose count this is, and when it rolls over. "Resets daily" is all that is
                promised: the server's day is UTC, the browser's is local (see aiQuota.js). */}
            <p className="uh-meter-note" data-testid="ai-meter-note">
              {onAccount
                ? `${ai.month ? `${ai.month.used} of ${ai.month.limit} this month` : 'On your account'}. Resets daily.`
                : 'Counted on this browser. Resets daily.'}
              {asOf ? ` As of ${asOf}.` : ''}
            </p>
          </div>
        )}
        {slots && (
          <div className="uh-meter" data-testid="project-quota-note">
            <div className="uh-meter-row">
              <span>Projects</span>
              {/* The figure is the meter value (sans, tabular); ", the Free limit" is the row's own 13px --t2. */}
              <span><span className="uh-meter-val">{slots.used} of {slots.limit}</span>{atCap ? ', the Free limit' : ''}</span>
            </div>
            <span
              className="uh-meter-track"
              role="meter"
              aria-label="Projects"
              aria-valuemin={0}
              aria-valuemax={slots.limit}
              aria-valuenow={Math.min(slots.used, slots.limit)}
              aria-valuetext={atCap ? `${slots.used} of ${slots.limit}, the Free limit` : `${slots.used} of ${slots.limit}`}
            >
              <span className={`uh-meter-fill${atCap ? ' is-cap' : ''}`} style={{ width: `${slots.pct}%` }} />
            </span>
          </div>
        )}
      </div>
      <p className="uh-plan-line">
        <span>{planLabel} plan</span>
        {!isPro && <Link to="/plans" className="uh-link uh-plans-link">See plans</Link>}
      </p>
    </div>
  )
}
