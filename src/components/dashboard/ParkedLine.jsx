import { Link } from 'react-router-dom'
import useParkedKit from '../../hooks/useParkedKit'
import { whenText } from '../../utils/brandKitChooser'
import { isCountUnknownMessage } from '../../utils/projectCount'

// One text line under the Today line for a brand kit that was put aside: what it is, when, and the three
// things to do with it. No card; the actions are the page's text buttons. A second kit waiting behind it is
// counted in the line. A refused save (the Free cap, or a count that is not known yet) prints under it.

const when = (at) => {
  const text = whenText(at)
  return /^\d{1,2} [A-Za-z]{3,4}$/.test(text) ? `on ${text}` : text
}

export default function ParkedLine() {
  const { parked, more, name, refusal, saving, onContinue, onSave, onDiscard } = useParkedKit()
  if (!parked) return null

  return (
    <div className="db-parked" role="group" aria-label="Unsaved brand kit">
      <p className="db-pk-t" data-testid="parked-line">
        {`Unsaved brand kit${name ? ` (${name})` : ''}, put aside ${when(parked.parkedAt)}.`}
        {more > 0 && ` ${more} more waiting behind it.`}
      </p>
      <span className="db-pk-a">
        <button type="button" className="db-textbtn" onClick={onContinue}>Continue</button>
        <button type="button" className="db-textbtn" onClick={onSave} disabled={saving}>Save as project</button>
        <button type="button" className="db-textbtn" onClick={onDiscard}>Discard</button>
      </span>
      {refusal && (
        <p className="db-pk-err" role="alert" data-testid="parked-save-refusal">
          <span>{refusal}</span>
          {!isCountUnknownMessage(refusal) && <>{' '}<Link className="db-tl" to="/plans">See what Pro adds</Link></>}
        </p>
      )}
    </div>
  )
}
