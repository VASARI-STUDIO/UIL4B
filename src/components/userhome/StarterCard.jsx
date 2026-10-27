import { Link } from 'react-router-dom'
import { SYSTEM_PARTS, partsPresent } from '../../utils/userHome'

// The four parts of a project, in the order the starter names them, each with the name the page
// uses for it. The tool each links to is the part's own (SYSTEM_PARTS), so a step cannot point at a
// route the part is not built on.
const STARTER_STEPS = [
  { part: 'palette', label: 'Colour' },
  { part: 'fonts', label: 'Type' },
  { part: 'type-scale', label: 'Type scale' },
  { part: 'tints', label: 'Tints' },
].map((s) => ({ ...s, tool: SYSTEM_PARTS.find((p) => p.id === s.part).tool }))

// What a signed-in account with no projects sees where the lead would be. It names the one action,
// shows the working design's colours when the person has already changed them (never the default
// palette, which would read as theirs), and lists the four parts of a project in order: a true
// sequence, so it is numbered. Each step opens the tool that builds that part.
//
// Start the walkthrough runs the same startNew() as New project. The card is gone once a project exists.
export default function StarterCard({ design, onStart }) {
  const colors = (design?.palette?.colors || []).filter(Boolean)
  const touched = partsPresent(design).palette && colors.length > 0
  return (
    <section className="uh-continue uh-starter" aria-labelledby="uh-starter-h" data-testid="starter-card">
      {touched && (
        <span className="uh-strip" aria-hidden="true">
          {colors.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
        </span>
      )}
      <div className="uh-continue-body">
        <h2 id="uh-starter-h" className="uh-continue-name">Start your first project</h2>
        <p className="uh-starter-text">
          New project walks you through colour, type, type scale and tints, and saves as you go.
        </p>
        <ol className="uh-steps" aria-label="The walkthrough">
          {STARTER_STEPS.map((s) => <li key={s.part}><Link to={s.tool}>{s.label}</Link></li>)}
        </ol>
        <div className="uh-continue-actions">
          <button type="button" className="uh-cta" onClick={onStart}>Start the walkthrough</button>
          <Link className="uh-link" to="/learn/help">How projects work</Link>
        </div>
      </div>
    </section>
  )
}
