import { Link } from 'react-router-dom'
import { partsPresent } from '../../utils/userHome'

// The four parts of a project, in the order the starter names them, each with the name the page
// uses for it.
const STARTER_STEPS = [
  { part: 'palette', label: 'Colour' },
  { part: 'fonts', label: 'Type' },
  { part: 'type-scale', label: 'Type scale' },
  { part: 'tints', label: 'Tints' },
]

// What a signed-in account with no project in play sees where the lead would be. It names the one
// action, shows the working design's colours when the person has already changed them (never the
// default palette, which would read as theirs), and lists the four parts of a project in order: a
// true sequence, so it is numbered. The steps are plain text: Start the walkthrough is the way in.
//
// `archived` is the account whose projects are all archived: there is nothing to continue, so the
// same card leads, says why, and the archived projects follow it as rows.
//
// `limit` is set when those archived projects already fill the Free plan: archived projects count
// toward it, so the walkthrough would only be refused. The card says so and offers the plans instead.
//
// Start the walkthrough runs the same startNew() as New project. The card is gone once a project is
// in play.
export default function StarterCard({ design, onStart, archived = false, limit = null }) {
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
        <h2 id="uh-starter-h" className="uh-continue-name">{limit ? 'Your Free plan is full' : archived ? 'Start a new project' : 'Start your first project'}</h2>
        <p className="uh-starter-text">
          {limit
            ? `All your projects are archived, and archived projects count toward the Free plan's ${limit}. Open one below to delete it, or go Pro to keep them all and start another.`
            : `${archived ? 'All your projects are archived. ' : ''}New project sets up colour, type, type scale and tints, and saves as you go.`}
        </p>
        {!limit && <ol className="uh-steps" aria-label="The walkthrough">
          {STARTER_STEPS.map((s) => <li key={s.part}>{s.label}</li>)}
        </ol>}
        <div className="uh-continue-actions">
          {limit
            ? <Link className="uh-cta" to="/plans">See plans</Link>
            : <button type="button" className="uh-cta" onClick={onStart}>Start the walkthrough</button>}
          <Link className="uh-link" to="/learn/help">How projects work</Link>
        </div>
      </div>
    </section>
  )
}
