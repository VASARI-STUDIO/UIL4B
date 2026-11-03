// The Video tab's edit list: Undo and Redo, then the edits so far as one line of
// plain words. One row that never wraps; a long list is cut with an ellipsis
// and the whole of it is in the title and the page text.
//
// The buttons use aria-disabled rather than disabled: a button that disables
// itself on its last press drops the keyboard focus on the floor.
const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)

export default function EditBar({ history, disabled }) {
  const { canUndo, canRedo, undo, redo, edits, said } = history
  const line = edits.length ? edits.join(' · ') : 'No edits yet'
  return (
    <div className="fc-editbar" role="group" aria-label="Edit history">
      <button
        type="button"
        className="fc-btn fc-editbtn"
        data-edit="undo"
        onClick={undo}
        aria-label="Undo"
        aria-keyshortcuts="Control+Z Meta+Z"
        aria-disabled={!canUndo || disabled}
        title="Undo (Ctrl+Z)"
      >
        <Svg><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>
        <span className="fc-editbtn-text">Undo</span>
      </button>
      <button
        type="button"
        className="fc-btn fc-editbtn"
        data-edit="redo"
        onClick={redo}
        aria-label="Redo"
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        aria-disabled={!canRedo || disabled}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Svg><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Svg>
        <span className="fc-editbtn-text">Redo</span>
      </button>
      <p className="fc-editline" title={line}>
        <span className="fc-editline-k">Edits</span>
        {line}
      </p>
      <span className="sr-only" role="status" aria-live="polite">{said}</span>
    </div>
  )
}
