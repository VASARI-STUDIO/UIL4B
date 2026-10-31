import { useState } from 'react'
import { Link } from 'react-router-dom'
import useModalDialog from '../../hooks/useModalDialog'
import { handleProblem, readStoredHandle, writeStoredHandle } from '../../utils/communityHandle'
// The dialog, strip, field and hint rules (.plb-modal, .plb-submitcard, ...).
import '../../styles/deferred/colour.css'

// The "Submit to the community" dialog the colour tools open from the Save or
// share menu: a preview of the work, who it is posted as, a name, and a plain
// note that a reviewer checks it first. Each tool owns what submitting does;
// this owns the frame, the one-time handle step and the finished state.
//
// Mount it only for a signed-in person (useCommunitySubmitGate); the form is
// never shown to a signed-out visitor.
//
//   noun          'palette' | 'gradient': used in the label, button and field
//   ownerHandle   a fixed public handle for the account (the founder's), or null
//   children      the preview, drawn inside the preview strip
//   name          the name field's value (controlled)
//   onNameChange  (value) => void
//   onRandomName  optional; adds a dice button that suggests a name
//   onSubmit      (author) => void: `author` is the public handle to credit.
//                 The tool validates the name and shows a refusal through `error`
//   onClose       close the dialog. Must be stable (useModalDialog re-focuses
//                 whenever it changes)
//   error         a plain refusal held in the form, which stays as it was
//   busy          true while the submission is on its way: the button is held
//   done          { message, to, toLabel } once it has reached the queue: the
//                 form is replaced by a confirmation that says where to see it
export default function CommunitySubmitDialog({
  noun, ownerHandle = null, children,
  name, onNameChange, onRandomName, onSubmit, onClose,
  error = '', busy = false, done = null,
}) {
  const ref = useModalDialog(onClose)
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  // The handle is chosen once and kept on this device (and with the account, via
  // accountSync). An account with a fixed public handle never sees the step.
  const [handle, setHandle] = useState(() => readStoredHandle())
  const [handleInput, setHandleInput] = useState('')
  const [handleErr, setHandleErr] = useState('')
  const publicHandle = ownerHandle?.publicHandle || (handle ? '@' + handle : '')

  const saveHandle = () => {
    const problem = handleProblem(handleInput)
    if (problem) { setHandleErr(problem); return }
    const clean = handleInput.trim()
    writeStoredHandle(clean)
    setHandle(clean); setHandleInput(''); setHandleErr('')
  }
  const submit = () => { if (!busy) onSubmit?.(publicHandle) }

  return (
    <div
      className="plb-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Submit ${noun} to the community`}
      tabIndex={-1}
      ref={ref}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="plb-modal-card plb-submitcard">
        <div className="plb-modal-head">
          <span className="plb-pop-title">{done ? 'Submitted for review' : 'Submit to the community'}</span>
          <button type="button" className="plb-pop-x" aria-label="Close" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="plb-submit-strip" aria-hidden="true">{children}</div>

        {done ? (
          <>
            <p className="plb-submit-hint" role="status" data-testid="community-submit-done">{done.message}</p>
            <div className="plb-modal-actions">
              {done.to && <Link className="btn btn-s" to={done.to} onClick={onClose}>{done.toLabel}</Link>}
              <button type="button" className="btn btn-s btn-accent" onClick={onClose}>Done</button>
            </div>
          </>
        ) : !handle && !ownerHandle ? (
          <>
            <div className="plb-menu-sub">Choose your community handle</div>
            <p className="plb-submit-hint">This is the name shown on everything you post. Letters, numbers and underscores. Pick it once.</p>
            <div className="plb-menu-row">
              <input
                type="text"
                value={handleInput}
                onChange={(e) => { setHandleInput(e.target.value); setHandleErr('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveHandle() }}
                placeholder="yourhandle"
                aria-label="Community handle"
                maxLength={20}
                spellCheck="false"
                autoComplete="off"
              />
              <button type="button" className="btn btn-s btn-accent" onClick={saveHandle}>Set handle</button>
            </div>
            {handleErr && <p className="plb-submit-err" role="alert">{handleErr}</p>}
          </>
        ) : (
          <>
            <div className="plb-submit-as">
              Posting as <strong>{publicHandle}</strong>
              {!ownerHandle && <button type="button" className="plb-linkbtn" onClick={() => { setHandle(''); setHandleErr('') }}>change</button>}
            </div>
            <div className="plb-menu-sub">{Noun} name</div>
            <div className="plb-menu-row">
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange?.(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                placeholder={`${Noun} name…`}
                aria-label={`${Noun} name for the community`}
                aria-invalid={error ? true : undefined}
                maxLength={80}
              />
              {onRandomName && (
                <button
                  type="button"
                  className="btn btn-s plb-dice"
                  onClick={onRandomName}
                  title="Generate a themed name"
                  aria-label="Generate a themed name"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.1" /><circle cx="15.5" cy="8.5" r="1.1" /><circle cx="12" cy="12" r="1.1" /><circle cx="8.5" cy="15.5" r="1.1" /><circle cx="15.5" cy="15.5" r="1.1" /></svg>
                </button>
              )}
            </div>
            {error && <p className="plb-submit-err" role="alert" data-testid="community-submit-error">{error}</p>}
            <p className="plb-submit-hint">A reviewer checks every submission before it appears. Until then only you can see it.</p>
            <div className="plb-modal-actions">
              <button
                type="button"
                className="btn btn-s btn-accent"
                onClick={submit}
                disabled={busy}
                aria-busy={busy || undefined}
              >{busy ? 'Submitting…' : `Submit ${noun}`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
