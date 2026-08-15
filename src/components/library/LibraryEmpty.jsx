// The "nothing matches" state for every Library browse surface.
//
// `onClear` is required rather than optional, and the button is rendered
// unconditionally: an empty grid whose only escape is for the user to work out
// which of three filters they set is the dead end murphys-law.md exists to
// forbid. The Gradient Library only offered the reset when it could prove a
// filter was active, which meant the one case where the reset was hardest to
// find by hand was the case where it was hidden.
//
// role="status" so the change is announced — the grid emptying is silent
// otherwise, and on a long page it happens below the fold.

export default function LibraryEmpty({
  title,
  detail,
  onClear,
  clearLabel = 'Clear filters',
  className = '',
}) {
  return (
    <div className={`lbry-empty${className ? ` ${className}` : ''}`} role="status">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
      <button type="button" className="lbry-empty-clear" onClick={onClear}>
        {clearLabel}
      </button>
    </div>
  )
}
