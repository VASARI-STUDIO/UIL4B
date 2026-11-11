import { useId } from 'react'
import SaveRefusal from '../SaveRefusal'
import ProjectPlate from './ProjectPlate'
import useParkedKit from '../../hooks/useParkedKit'
import { withDefaults } from '../../utils/brandKitGuide'
import { whenText } from '../../utils/brandKitChooser'
import { partsPresent } from '../../utils/userHome'

// The "Unsaved brand kit" row with a thumbnail, in the app's `uh-` styles. The /projects page draws the
// same kit as a text line instead (components/dashboard/ParkedLine.jsx); both read useParkedKit.

export default function ParkedRow() {
  const headId = useId()
  const { parked, more, name, refusal, saving, onContinue, onSave, onDiscard } = useParkedKit()

  if (!parked) return null

  const design = parked.design
  const colours = Array.isArray(design.palette?.colors) && partsPresent(withDefaults(design)).palette
    ? design.palette.colors.filter((c) => typeof c === 'string')
    : []

  return (
    <section className="uh-parked" aria-labelledby={headId}>
      <div className="spt-thumb"><ProjectPlate size="thumb" colors={colours} /></div>
      <div className="uh-parked-text">
        <h2 id={headId} className="uh-parked-name" title={name || undefined}>{name || 'Unsaved brand kit'}</h2>
        <p className="uh-parked-meta">
          Not saved yet · edited {whenText(parked.parkedAt)}
          {more > 0 && ` · ${more} more waiting behind it`}
        </p>
      </div>
      <div className="uh-parked-actions">
        <button type="button" className="uh-ghost" onClick={onContinue}>Continue</button>
        <button type="button" className="uh-ghost" onClick={onSave} disabled={saving}>Save as project</button>
        <button type="button" className="uh-textbtn" onClick={onDiscard}>Discard</button>
      </div>
      {refusal && <SaveRefusal message={refusal} testId="parked-save-refusal" />}
    </section>
  )
}
