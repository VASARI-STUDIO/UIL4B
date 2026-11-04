// "Pro" as plain words with a lock: what a paid row and a blurred preview carry
// for a free account. Plain text in one ink, not a tinted pill. The lock is
// decorative, because the row's own accessible name already says "Pro".
export default function ExportProTag({ className = 'exp-fmt-pro' }) {
  return (
    <span className={className}>
      <svg className="exp-pro-lock" viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z" />
      </svg>
      <span>Pro</span>
    </span>
  )
}
