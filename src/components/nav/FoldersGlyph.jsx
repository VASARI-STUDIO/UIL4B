// The folders glyph: Projects, wherever it is drawn (the phone tab bar, the
// account popover and the menu sheet), so one icon always means the workspace.
export default function FoldersGlyph({ size = 21 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8v10a1.5 1.5 0 0 0 1.5 1.5h12.5" />
      <path d="M7 15.5V5.5A1.5 1.5 0 0 1 8.5 4h3.3l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5V15.5A1.5 1.5 0 0 1 19 17H8.5A1.5 1.5 0 0 1 7 15.5Z" />
    </svg>
  )
}
