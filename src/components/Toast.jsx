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

export default function Toast({ message, visible, type = 'success' }) {
  const kind = ICONS[type] ? type : 'success'
  return (
    <div
      className={`toast toast-${kind}${visible ? ' show' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className="toast-ico">{ICONS[kind]}</span>
      <span className="toast-msg">{message}</span>
    </div>
  )
}
