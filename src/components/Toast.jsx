const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  ),
}

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
export default function Toast({ message, visible, type = 'success', onDismiss }) {
  const kind = ICONS[type] ? type : 'success'
  return (
    <div
      className={`toast toast-${kind}${visible ? ' show' : ''}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      aria-hidden={!visible}
      inert={!visible}
    >
      <span className="toast-ico">{ICONS[kind]}</span>
      <span className="toast-msg">{message}</span>
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
