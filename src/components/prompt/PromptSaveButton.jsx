// The one Save control for a community prompt, used by the card and the
// modal. It is a toggle: `saved` drives aria-pressed and the Save/Saved label,
// and pressing it on a saved prompt unsaves it (PromptLibrary owns the store
// and the Undo toast).
export default function PromptSaveButton({ saved, onToggle, name, className = '' }) {
  return (
    <button
      type="button"
      className={`pl-save${saved ? ' is-saved' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={saved}
      // The visible word leads the name (WCAG 2.5.3); the title tells a card's
      // Save apart from the next card's in a list of buttons.
      aria-label={name ? `${saved ? 'Saved' : 'Save'}: ${name}` : undefined}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}
