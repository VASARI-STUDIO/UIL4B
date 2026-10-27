// The few glyphs the customiser footer draws that ToolIcon does not carry. Same
// box and drawing rules as ToolIcon (24-unit grid, currentColor stroke, round
// caps and joins, 1.5 weight), so the two sets sit together in one row.
const GLYPHS = {
  download: (<><path d="M12 3.75v10.5" /><path d="M20.25 14.25v5.25a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-5.25" /><path d="m8.25 10.5 3.75 3.75 3.75-3.75" /></>),
  'caret-down': (<path d="m6 9 6 6 6-6" />),
  check: (<path d="m5 12 4.5 4.5L19 7" />),
  'folder-plus': (<><path d="M3.75 18.75V5.25a.75.75 0 0 1 .75-.75h5.06a.75.75 0 0 1 .53.22l1.94 1.94a.75.75 0 0 0 .53.22h6.69a.75.75 0 0 1 .75.75v3" /><path d="M3.75 18.75h9" /><path d="M18 14.25v6" /><path d="M15 17.25h6" /></>),
  'circle-notch': (<path d="M16.5 4.2a9 9 0 1 1-9 0" />),
  alert: (<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.25" /><circle cx="12" cy="16.13" r=".38" /></>),
}

export default function FooterGlyph({ name, size = 16, className }) {
  const glyph = GLYPHS[name]
  if (!glyph) return null
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  )
}
