import { useId, useMemo } from 'react'
import useModalDialog from '../../hooks/useModalDialog'
import { hasSavedColour, projectChoices } from '../../utils/savedColours'

// A modal that asks which project one colour goes into.
//
//   hex        the colour, as #RRGGBB
//   name       the colour's name, if it has one
//   projects   the person's projects (ProjectContext.projects)
//   loading    true until the account's projects have been read once
//   currentId  the project the working design came from, offered first
//   onChoose   (project) => void. Does the save and closes the dialog.
//   onClose    called on Escape, the close button or an outside press
//
// The caller asks for the account first (requireLogin) and only mounts this
// for someone who can save.
export default function SaveColourDialog({ hex, name, projects, loading = false, currentId, onChoose, onClose }) {
  const titleId = useId()
  const dialogRef = useModalDialog(onClose)
  const choices = useMemo(() => projectChoices(projects, currentId), [projects, currentId])

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div className="ui-modal plb-sc" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className="ui-modal-head">
          <h2 id={titleId} className="ui-modal-title">Save to a project</h2>
          <button type="button" className="ui-modal-x plb-sc-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ui-modal-body plb-sc-body">
          <p className="plb-sc-colour">
            <span className="plb-sc-chip" style={{ background: hex }} aria-hidden="true" />
            <span className="plb-sc-hex">{hex}</span>
            {name && <span className="plb-sc-name">{name}</span>}
          </p>
          {choices.length === 0 && loading ? (
            <p className="plb-sc-empty" role="status">Loading your projects.</p>
          ) : choices.length === 0 ? (
            <p className="plb-sc-empty">You have no projects yet. Save this palette as a project first, then add single colours to it.</p>
          ) : (
            <ul className="plb-sc-list">
              {choices.map((p) => {
                const has = hasSavedColour(p, hex)
                return (
                  <li key={p.id}>
                    <button type="button" className="plb-sc-row" onClick={() => onChoose(p)}>
                      <span className="plb-sc-row-name">{p.name}</span>
                      {p.id === currentId && <span className="plb-sc-row-tag">Current</span>}
                      {has && <span className="plb-sc-row-tag">Already saved</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
