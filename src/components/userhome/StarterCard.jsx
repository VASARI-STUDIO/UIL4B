import { Link } from 'react-router-dom'
import { BRAND_KIT_STEPS } from '../../utils/brandKitGuide'
import { partsPresent } from '../../utils/userHome'

// What a signed-in account with no projects sees where the lead would be. It names the one action,
// shows the working design's colours when the person has already changed them (never the default
// palette, which would read as theirs), and lists the walkthrough's real steps in order: a true
// sequence, so it is numbered. The step names come from the walkthrough itself, so they cannot drift.
//
// Start the walkthrough runs the same startNew() as New project. The card is gone once a project exists.
export default function StarterCard({ design, onStart }) {
  const colors = (design?.palette?.colors || []).filter(Boolean)
  const touched = partsPresent(design).palette && colors.length > 0
  // "colours, fonts, type scale and icons", read off the walkthrough's own steps.
  const names = BRAND_KIT_STEPS.map((s) => s.label.toLowerCase())
  const stepNames = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return (
    <section className="proj-card uh-continue uh-starter" aria-labelledby="uh-starter-h" data-testid="starter-card">
      {touched && (
        <span className="uh-strip" aria-hidden="true">
          {colors.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
        </span>
      )}
      <div className="uh-continue-body">
        <h2 id="uh-starter-h" className="uh-continue-name">Start your first project</h2>
        <p className="uh-starter-text">
          New project walks you through {stepNames}, and saves as you go.
        </p>
        <ol className="uh-steps" aria-label="The walkthrough">
          {BRAND_KIT_STEPS.map((s) => <li key={s.id}>{s.label}</li>)}
        </ol>
        <div className="uh-continue-actions">
          <button type="button" className="uh-cta" onClick={onStart}>Start the walkthrough</button>
          <Link className="uh-link" to="/learn/help">How projects work</Link>
        </div>
      </div>
    </section>
  )
}
