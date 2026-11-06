// The thirteen tool glyphs of the bookmarks window, drawn on a 24px grid at a
// 1.6px stroke. They are sized by the box that holds them.
const PATHS = {
  palette: <><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M9.2 6v12M14.8 6v12" /></>,
  semantic: <><rect x="4" y="5" width="16" height="4.2" rx="2.1" /><rect x="4" y="10.4" width="16" height="4.2" rx="2.1" /><rect x="4" y="15.8" width="10" height="4.2" rx="2.1" /></>,
  tint: <path d="M12 3.5s5.5 5.8 5.5 9.5A5.5 5.5 0 0 1 6.5 13c0-3.7 5.5-9.5 5.5-9.5z" />,
  gradient: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M4 20 20 4" /></>,
  contrast: <><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M14.5 5.2v13.6M17 6.4v11.2M19.3 9.5v5" /></>,
  gallery: <><path d="M5.5 19 12 5l6.5 14" /><path d="M8.5 14h7" /></>,
  pair: <><path d="M3 17 7 7l4 10" /><path d="M4.4 13.5h5.2" /><path d="M13 17 17 7l4 10" /><path d="M14.4 13.5h5.2" /></>,
  scale: <><path d="M3.5 20h17" /><path d="M6 20v-4.5M4.5 15.5h3" /><path d="M11.5 20v-9M9.6 11h3.8" /><path d="M17.5 20V5.5M15.2 5.5h4.6" /></>,
  icons: <path d="m12 4 2.4 5 5.4.7-4 3.7 1.1 5.4L12 16.1l-4.9 2.7 1.1-5.4-4-3.7 5.4-.7z" />,
  emoji: <><circle cx="12" cy="12" r="8.5" /><path d="M9 10.5h.01" /><path d="M15 10.5h.01" /><path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" /></>,
  convert: <><path d="M4 8.5h15" /><path d="m15.5 5 3.5 3.5-3.5 3.5" /><path d="M20 15.5H5" /><path d="M8.5 12 5 15.5 8.5 19" /></>,
  ratio: <><rect x="3" y="6" width="18" height="12" rx="2" /><rect x="7" y="9.5" width="7" height="5" rx="1" /></>,
  alt: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="8" cy="9.5" r="1.4" /><path d="M4 16l4-3.5 3 2.5" /><path d="M13.5 9.5h5M16 9.5v6" /></>,
}

export function Glyph({ name, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}

/** The folder outline used by the bookmarks bar and the menu rows. */
export function FolderIcon({ size = 15, stroke = 1.7, style }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" style={style}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
