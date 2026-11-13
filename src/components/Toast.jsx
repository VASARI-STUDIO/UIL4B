// Only an error carries an icon (a circle with a cross, in the danger colour).
// Success, info and warning are the words alone: the status is the sentence.
const KINDS = ['success', 'error', 'info', 'warning']
const ERROR_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
)

// `onDismiss` puts a real button on the toast. It exists for the error kind,
// which now outlives the success kind by design (useToast.js): a refusal that
// sits for six seconds needs a way to be sent away sooner, and that way has to
// be reachable from the keyboard — the toast is the last thing in the document,
// so Tab reaches it, and Enter or Space on the ✕ closes it. The button is
// rendered for every kind so the control is where a person expects it to be.
//
// `inert` while hidden: a hidden toast keeps its DOM (the exit transition needs
// it), and without inert the ✕ would still be a tab stop inside an
// aria-hidden region — a focus that goes nowhere visible.
//
// `action` ({ label, onAction }) adds one action button, e.g. Undo. Pressing
// it runs the action and closes the toast. `onHold`/`onRelease` stop and
// restart the toast's clock while the pointer or focus is on it.
export default function Toast({ message, visible, type = 'success', onDismiss, action = null, onHold, onRelease }) {
  const kind = KINDS.includes(type) ? type : 'success'
  return (
    <div
      className={`toast toast-${kind}${visible ? ' show' : ''}${action ? ' has-action' : ''}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      aria-hidden={!visible}
      inert={!visible}
      onPointerEnter={action ? onHold : undefined}
      onPointerLeave={action ? onRelease : undefined}
      onFocus={action ? onHold : undefined}
      onBlur={action ? onRelease : undefined}
    >
      {kind === 'error' && <span className="toast-ico">{ERROR_ICON}</span>}
      <span className="toast-msg">{message}</span>
      {action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => { action.onAction(); onDismiss?.() }}
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button type="button" className="toast-x" onClick={onDismiss} aria-label="Dismiss">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
