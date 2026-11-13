import { useId, useState } from 'react'
import Dialog from './Dialog'

// A confirm that names the thing being destroyed, and asks for its name
// before the action arms.
//
//   name         the exact text to type
//   title        e.g. `Delete Kerbside?`
//   action       the verb and the object, e.g. `Permanently delete`
//   fieldLabel   the field's accessible name
//   strip        optional colours for the band on top
//   error        a failed attempt: the text shows under the field and the
//                action reads `Try again`
//
// No ink pill: the destructive action is a tonal pill with danger-coloured
// text, and the secondary is outlined. The scrim does not close it. The error
// slot keeps its height whether or not it holds a message, so the dialog does
// not jump when one appears.
function ConfirmBody({ onClose, onConfirm, name, title, action, fieldLabel, strip = null, error = '' }) {
  const [typed, setTyped] = useState('')
  const errorId = useId()
  // An empty name never arms: an empty field would otherwise match it.
  const armed = !!name && typed === name

  const submit = () => { if (armed) onConfirm() }

  return (
    <Dialog open onClose={onClose} title={title} strip={strip} initialFocus=".ov-dialog-field">
      <p className="ov-dialog-text">
        Type <strong>{name}</strong> to delete it. <span className="ov-nowrap">This cannot be undone.</span>
      </p>
      <input
        className="ov-dialog-field"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        // Enter while an input method is composing picks a candidate; it is not a confirm.
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
        placeholder={name}
        aria-label={fieldLabel}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <p className="ov-dialog-error" id={errorId} role={error ? 'alert' : undefined}>{error}</p>
      <div className="ov-dialog-foot">
        <button type="button" className="ui-pill ui-pill-out" onClick={onClose}>Cancel</button>
        <button type="button" className="ui-pill ov-act-danger" disabled={!armed} onClick={submit}>
          {error ? 'Try again' : action}
        </button>
      </div>
    </Dialog>
  )
}

// Mounted only while open, so the typed text starts empty every time.
export default function ConfirmDialog({ open, ...rest }) {
  return open ? <ConfirmBody {...rest} /> : null
}
