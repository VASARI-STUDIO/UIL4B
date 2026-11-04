import { Link } from 'react-router-dom'
import { partsPresent } from '../../utils/userHome'
import OpenPill from '../spectrum/OpenPill'
import PhIcon from '../spectrum/PhIcon'
import ToolArt from '../spectrum/ToolArt'
import ProjectPlate from './ProjectPlate'

// The four parts of a project, in the order the starter names them, each with the name the page
// uses for it and the tool that builds it (its drawn plate on /tools).
const STARTER_STEPS = [
  { part: 'palette', label: 'Colour', art: 'palette' },
  { part: 'fonts', label: 'Type', art: 'font-pair' },
  { part: 'type-scale', label: 'Type scale', art: 'type-scale' },
  { part: 'tints', label: 'Tints', art: 'tint' },
]

// What a signed-in account with no project in play sees where the lead would be. It names the one
// action, shows the working design's colours when the person has already changed them (never the
// default palette, which would read as theirs), and otherwise draws the four parts of a project in
// order: a true sequence, so it is numbered. The steps are plain text under their plates: Start the
// walkthrough is the way in.
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
        <div className="uh-plate-slot">
          <ProjectPlate colors={colors} size="card" />
        </div>
      )}
      <div className="uh-continue-body">
        <h2 id="uh-starter-h" className="uh-continue-name">{limit ? 'Your Free plan is full' : archived ? 'Start a new project' : 'Start your first project'}</h2>
        <p className="uh-starter-text">
          {limit
            ? `All your projects are archived, and archived projects count toward the Free plan's ${limit}. Open one below to delete it, or go Pro to keep them all and start another.`
            : `${archived ? 'All your projects are archived. ' : ''}New project sets up colour, type, type scale and tints, and saves as you go.`}
        </p>
        {!limit && !touched && (
          <ol className="uh-steps uh-steps--plates" aria-label="The walkthrough">
            {STARTER_STEPS.map((s, i) => (
              <li key={s.part}>
                <span className="spt-thumb"><ToolArt id={s.art} size="thumb" /></span>
                <span className="uh-step-label"><span className="uh-step-n">{i + 1}</span>{' '}<span className="uh-step-name">{s.label}</span></span>
              </li>
            ))}
          </ol>
        )}
        <div className="uh-continue-actions">
          {limit
            ? <OpenPill to="/plans" className="uh-cta">See plans</OpenPill>
            : (
              <button type="button" className="sp-pill uh-cta" onClick={onStart}>
                <span>Start the walkthrough</span>
                <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
              </button>
            )}
          <Link className="uh-link" to="/learn/help">How projects work</Link>
        </div>
      </div>
    </section>
  )
}
