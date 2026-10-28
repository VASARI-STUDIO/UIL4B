import { useEffect, useRef, useState } from 'react'
import SaveRefusal from '../SaveRefusal'
// The base menu rules (.plb-menu, .plb-menu-item, ...) and the floating-panel
// rules this menu sits in.
import '../../styles/deferred/colour.css'
import '../../styles/deferred/save-share-menu.css'

// The Save or share menu the colour tools open from their toolbar's primary
// button: name a project and save it, overwrite one, then Share and Export rows.
// Each tool owns what a row does; this owns the frame, the save field and the
// dismissal.
//
//   label          the dialog's accessible name
//   name           the project name field's value (controlled)
//   onNameChange   (value) => void
//   onSave         called on Save and on Enter in the field
//   busy           true while the account is still being checked: Save is disabled, as a
//                  press would meet the sign-in prompt for someone who is signed in
//   nameError      a plain refusal held under the field (an empty name)
//   note           a plain line under the field (a save that is waiting for Save)
//   sheetBelow     640 (default) or 768: below this width the menu is a bottom
//                  sheet; from it up, a popover under the button
//   saveError      the free cap's refusal, shown with its link to the plans page
//   refusalTestId  data-testid for that refusal
//   projects       the saved projects; the newest five are offered to overwrite
//   onOverwrite    (project) => void
//   onClose        close the menu: ('button' | 'escape' | 'outside') => void
//   share          rows under "Share"
//   exports        rows under "Export"
//   after          anything below the export rows (a section with its own heading)
//   dismiss        true: this component closes itself on Escape and on a press
//                  outside it (a tool that has its own dismiss layer leaves it false)
//   triggerRef     the button that opened it; a press on it is not "outside"
//   focusOnOpen    true: focus moves in when it opens (the name field with its
//                  text selected, or the dialog itself on a touch screen so no
//                  keyboard opens uninvited)
//   selectOnFocus  select the whole name when the field takes focus, so typing
//                  replaces a prefilled name
export default function SaveShareMenu({
  label,
  name, onNameChange, onSave, busy = false, nameError, note, sheetBelow = 640, saveError, refusalTestId,
  projects = [], onOverwrite,
  onClose,
  share, exports, after,
  dismiss = false, triggerRef, focusOnOpen = false, selectOnFocus = false,
}) {
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    if (!focusOnOpen) return
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    if (coarse) dialogRef.current?.focus({ preventScroll: true })
    else {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    }
  }, [focusOnOpen])

  // A refused name sends the person back to the field to fix it.
  useEffect(() => {
    if (nameError) inputRef.current?.focus({ preventScroll: true })
  }, [nameError])

  // Every press of Save. When the same refusal is already showing, the effect
  // above sees no change, so the press itself returns focus to the field and
  // remounts the message (a new alert, which a screen reader reads again).
  const [pressed, setPressed] = useState(0)
  const press = () => {
    if (busy) return
    if (nameError) {
      inputRef.current?.focus({ preventScroll: true })
      setPressed(n => n + 1)
    }
    onSave?.()
  }

  useEffect(() => {
    if (!dismiss) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // The sign-in dialog opened from Save sits on top and takes Escape first.
      if (e.target instanceof Element && e.target.closest('[aria-modal="true"]')) return
      closeRef.current?.('escape')
    }
    const onDown = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest('.plb-menuwrap, [aria-modal="true"], [aria-labelledby="ui-login-title"]')) return
      if (triggerRef?.current?.contains(t)) return
      closeRef.current?.('outside')
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [dismiss, triggerRef])

  return (
    <div className={`plb-menuwrap plb-float${sheetBelow === 768 ? ' plb-float--sheet768' : ''}`}>
      <div className="plb-menu plb-savemenu" role="dialog" aria-label={label} tabIndex={-1} ref={dialogRef} data-lenis-prevent>
        <div className="plb-float-head">
          <div className="plb-menu-title">Save to a project</div>
          <button type="button" className="plb-pop-x" aria-label="Close" onClick={() => onClose?.('button')}><CloseIcon /></button>
        </div>
        <div className="plb-menu-row">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => onNameChange?.(e.target.value)}
            onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter') press() }}
            placeholder="Project name…"
            aria-label="Project name"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'ssm-name-error' : undefined}
            autoCapitalize="words"
            enterKeyHint="done"
          />
          <button
            type="button"
            className="btn btn-s btn-accent"
            onClick={press}
            disabled={busy}
            aria-busy={busy || undefined}
            title={busy ? 'Checking your account…' : undefined}
          >Save</button>
        </div>
        {note && !nameError && <p className="plb-menu-note" role="status">{note}</p>}
        {nameError && <p className="plb-menu-error" id="ssm-name-error" role="alert" key={pressed}>{nameError}</p>}
        {saveError && <SaveRefusal message={saveError} testId={refusalTestId} />}
        {projects.length > 0 && (
          <>
            <div className="plb-menu-sub">Overwrite existing</div>
            <div className="plb-scrolllist">
              {projects.slice(-5).map(p => (
                <button key={p.id} type="button" className="plb-menu-item" onClick={() => onOverwrite?.(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="plb-menu-div" role="separator" />
        <div className="plb-menu-sub">Share</div>
        {share}
        <div className="plb-menu-sub">Export</div>
        {exports}
        {after}
      </div>
    </div>
  )
}

// One row of the menu. `disabled` is aria-disabled, not the attribute, so the
// row stays reachable by keyboard and its reason is read with it: the reason is
// shown as text under the row, never a tooltip alone.
export function SaveShareItem({ icon, onClick, disabled = false, reason, hint, children }) {
  const reasonId = reason ? `ssm-reason-${String(children).replace(/\W+/g, '-').toLowerCase()}` : undefined
  return (
    <>
      <button
        type="button"
        className="plb-menu-item"
        aria-disabled={disabled || undefined}
        aria-describedby={disabled ? reasonId : undefined}
        onClick={disabled ? undefined : onClick}
      >
        {icon === 'download' ? <DownloadIcon /> : <CopyIcon />} {children}
        {hint && <span className="plb-menu-hint">{hint}</span>}
      </button>
      {disabled && reason && <p className="plb-menu-reason" id={reasonId}>{reason}</p>}
    </>
  )
}

// The same 24-unit, 2-stroke glyphs the Palette Builder draws inline, so the
// two tools' menus read as one.
function Glyph({ size = 15, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const CloseIcon = () => <Glyph><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Glyph>
const CopyIcon = () => <Glyph><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Glyph>
const DownloadIcon = () => <Glyph size={13}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></Glyph>
