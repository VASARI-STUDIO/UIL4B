// Per-group line icons for the nav mega-menus (and reusable later in the in-tool
// rail and surface landings). One inline SVG set, keyed by the group `id` from
// src/data/toolTree.js. Every glyph is stroke="currentColor" so it inherits its
// category hue from the parent `.pnav-ico` tile — zero asset dependencies, and
// the menu can never drift from the tree.

const ICONS = {
  // ── Create ──
  colour: (
    <>
      <circle cx="9.5" cy="10" r="5" />
      <circle cx="14.5" cy="14" r="5" />
    </>
  ),
  type: (
    <>
      <path d="M5.5 19 12 5l6.5 14" />
      <path d="M8.5 14h7" />
    </>
  ),
  component: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M4 9.5h16" />
      <path d="M9.5 9.5V20" />
    </>
  ),
  imagery: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 4.5-4.5L13 17l3-3 4 4" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3.5 13.7 8.3 18.5 10 13.7 11.7 12 16.5 10.3 11.7 5.5 10 10.3 8.3z" />
      <path d="M18.3 14.5 19 16.3 20.8 17 19 17.7 18.3 19.5 17.6 17.7 15.8 17 17.6 16.3z" />
    </>
  ),
  icons: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.5h.01" />
      <path d="M15 10.5h.01" />
      <path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" />
    </>
  ),
  // ── Discover ──
  inspiration: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  'community-fonts': (
    <>
      <path d="M5.5 17 11 5l5.5 12" />
      <path d="M8 13h6" />
      <path d="M4 20h16" />
    </>
  ),
  'community-prompts': (
    <>
      <path d="M4 5.5h16v9H9l-4 3.5v-3.5H4z" />
      <path d="M8.5 10h7" />
    </>
  ),
  curated: <path d="M7 4h10a1 1 0 0 1 1 1v14.5l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  collections: <path d="M4 8a2 2 0 0 1 2-2h3l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />,
  // ── Learn ──
  principles: (
    <>
      <path d="M12 6.5C10.4 5.3 8.2 4.8 4.5 5v13c3.7-.2 5.9.3 7.5 1.5 1.6-1.2 3.8-1.7 7.5-1.5V5c-3.7-.2-5.9.3-7.5 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  themes: <path d="M20 14.2A8 8 0 1 1 9.8 4 6.5 6.5 0 0 0 20 14.2z" />,
  brand: <path d="M12 3.5s5.5 5.8 5.5 9.5A5.5 5.5 0 0 1 6.5 13c0-3.7 5.5-9.5 5.5-9.5z" />,
  typography: (
    <>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h9" />
    </>
  ),
  seo: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m20 20-5.2-5.2" />
    </>
  ),
  marketing: (
    <>
      <path d="M4 10.5v3a1 1 0 0 0 1 1h2.5l5 3.5v-12l-5 3.5H5a1 1 0 0 0-1 1z" />
      <path d="M16.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  'ai-assistants': (
    <>
      <path d="m9 8.5-3.5 3.5L9 15.5" />
      <path d="m15 8.5 3.5 3.5L15 15.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.7 9.6a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2-2.3 3.3" />
      <path d="M12 16.5h.01" />
    </>
  ),
}

const FALLBACK = <circle cx="12" cy="12" r="7" />

export default function NavIcon({ id, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[id] || FALLBACK}
    </svg>
  )
}
