import { useEffect, useId, useRef, useState } from 'react'
import useModalDialog from '../../hooks/useModalDialog'
import SaveRefusal from '../SaveRefusal'

// A modal that names a new project and saves the tool's work into it.
//
//   title        the dialog's heading
//   summary      one line saying what the project will keep
//   defaultName  what the name field starts as
//   onSave(name) does the save (ProjectContext.saveProject). It may throw: the
//                free plan's cap is thrown as an Error and is shown under the
//                field with the link to the plans page, which is where the
//                person can act on it. A save that returns closes the dialog.
//   onClose      called on Cancel, Escape, the close button or an outside press
//
// The caller asks for the account first (requireLogin) and only mounts this
// for someone who can save.
export default function SaveToProjectDialog({ title = 'Save to a project', summary, defaultName = '', onSave, onClose }) {
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState('')
  const [refusal, setRefusal] = useState('')
  const titleId = useId()
  const errId = useId()
  const inputRef = useRef(null)
  const dialogRef = useModalDialog(onClose, { initialFocus: '.tl-save-input' })

  // Focus lands on the name field (useModalDialog); select the suggested name so
  // typing replaces it.
  useEffect(() => { inputRef.current?.select() }, [])

  const submit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Give the project a name.'); inputRef.current?.focus(); return }
    try {
      onSave(trimmed)
    } catch (err) {
      setRefusal(err?.message || 'Couldn’t save')
    }
  }

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div className="ui-modal tl-save" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className="ui-modal-head">
          <h2 id={titleId} className="ui-modal-title">{title}</h2>
          <button type="button" className="ui-modal-x tl-save-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <form className="ui-modal-body tl-save-form" onSubmit={submit}>
          {summary && <p className="tl-save-summary">{summary}</p>}
          <label className="tl-save-field">
            <span>Project name</span>
            <input
              type="text"
              className="tl-save-input"
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); setRefusal('') }}
              maxLength={60}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errId : undefined}
            />
          </label>
          {refusal && <SaveRefusal message={refusal} testId="project-save-refusal" />}
          {error && <p id={errId} className="tl-save-err" role="alert">{error}</p>}
          <div className="tl-save-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
