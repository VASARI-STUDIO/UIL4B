import { Link } from 'react-router-dom'
import { FIRST_PALETTE_STATE } from '../../utils/paletteCoach'
import { toolRoute } from '../../data/toolTree'
import { partsPresent } from '../../utils/userHome'
import PhIcon from '../spectrum/PhIcon'
import useWorkingRamp from './useWorkingRamp'

// What a signed-in account with no project sees first on the workspace: one action, straight
// into the Palette Builder (which opens its two-beat coach, see utils/paletteCoach.js). It shows
// a live ramp from the tool itself, so the first screen has real content in it, not an empty box.
//
// It is gone as soon as the account has a project, which is what the first save makes. The
// header's New project still starts the full walkthrough, so nothing the old starter offered
// is lost: only the second button for the same job.
export default function FirstPaletteCard({ design }) {
  const ramp = useWorkingRamp(design)
  const own = partsPresent(design).palette
  return (
    <section className="uh-continue uh-first" aria-labelledby="uh-first-h" data-testid="first-palette-card">
      <div className="uh-continue-body">
        <div className="uh-first-ramp" role="img" aria-label={own ? 'Your colours so far' : 'A palette built from one colour'}>
          {ramp.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
        </div>
        <p className="uh-first-cap">{own ? 'Your colours so far' : 'Example: built from one colour'}</p>
        <h2 id="uh-first-h" className="uh-continue-name">Turn one colour into a full palette</h2>
        <p className="uh-starter-text">
          Pick a colour or paste a hex code. You get the shades, text colours and contrast checks, and you can keep it here.
        </p>
        <div className="uh-continue-actions">
          <Link className="sp-pill uh-cta" to={toolRoute('palette')} state={FIRST_PALETTE_STATE}>
            <span>Make your first palette</span>
            <span className="sp-pill-icon" aria-hidden="true"><PhIcon name="arrow-up-right" /></span>
          </Link>
        </div>
      </div>
    </section>
  )
}
