import Glyph from './Glyph'

// The plan strip under "Your workspace": the plan's name and the two allowances
// that plan meters, as 5px meters (UIL4B App.dc.html, `projects` screen).
//
// Only a meter the plan actually has is drawn. Pro has no project limit
// (SubscriptionContext resolves it to Infinity), so a Pro account sees the AI
// meter alone rather than "3 of Infinity". A signed-out visitor sees no strip at
// all — they have no plan — which is the property
// tests/user-sim/20-billing-banner.spec.js holds.
//
// `data-testid="project-quota-note"` rides on the slots meter because this IS
// the page's statement of the project cap now; the long at-cap paragraph the old
// page printed is not in the design's screen. The refusal itself still happens where it
// is asked for, in the New project dialog (SaveRefusal).
export default function PlanStrip({ planLabel, ai, slots }) {
  return (
    <div className="uh-plan">
      <span className="uh-plan-chip">
        <span className="uh-plan-ico" aria-hidden="true"><Glyph name="gauge" size={15} /></span>
        <span className="uh-plan-name">{planLabel} plan</span>
      </span>
      {ai && (
        <span className="uh-meter">
          <span className="uh-meter-row">
            <span>AI generations today</span>
            <span className="uh-meter-val">{ai.used} of {ai.limit}</span>
          </span>
          <span
            className="uh-meter-track"
            role="meter"
            aria-label="AI generations today"
            aria-valuemin={0}
            aria-valuemax={ai.limit}
            aria-valuenow={ai.used}
          >
            <span className="uh-meter-fill is-accent" style={{ width: `${ai.pct}%` }} />
          </span>
        </span>
      )}
      {slots && (
        <span className="uh-meter" data-testid="project-quota-note">
          <span className="uh-meter-row">
            <span>Project slots</span>
            <span className="uh-meter-val">{slots.used} of {slots.limit}</span>
          </span>
          <span
            className="uh-meter-track"
            role="meter"
            aria-label="Project slots"
            aria-valuemin={0}
            aria-valuemax={slots.limit}
            aria-valuenow={Math.min(slots.used, slots.limit)}
          >
            <span className="uh-meter-fill" style={{ width: `${slots.pct}%` }} />
          </span>
        </span>
      )}
    </div>
  )
}
