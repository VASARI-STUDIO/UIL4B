// Per-group line icons for the nav mega-menus (and reusable later in the in-tool
// rail and surface landings). One inline SVG set, keyed by the group `id` from
// src/data/toolTree.js. Every glyph is stroke="currentColor" so it inherits its
// category colour from the row's `.pnav-tool-ico` slot — zero asset dependencies,
// and the menu can never drift from the tree.

import { useId } from 'react'

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
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <circle cx="17" cy="7" r="3" />
      <path d="m7 14-3 6h6z" />
      <path d="M14 14h6v6h-6z" />
    </>
  ),
  // ── Create · per-tool menu glyphs ──
  palette: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  gradient: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 20 20 4" />
    </>
  ),
  'gradient-gallery': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 20 20 4" />
    </>
  ),
  contrast: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
    </>
  ),
  // Reuses the brand droplet — tint/shades share that visual language.
  tint: <path d="M12 3.5s5.5 5.8 5.5 9.5A5.5 5.5 0 0 1 6.5 13c0-3.7 5.5-9.5 5.5-9.5z" />,
  semantic: (
    <>
      <rect x="4" y="5" width="16" height="4.2" rx="2.1" />
      <rect x="4" y="10.4" width="16" height="4.2" rx="2.1" />
      <rect x="4" y="15.8" width="10" height="4.2" rx="2.1" />
    </>
  ),
  'ui-colour': (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 9h17" />
      <rect x="6" y="12" width="5" height="4.5" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  'font-pair': (
    <>
      <path d="M3 17 7 7l4 10" />
      <path d="M4.4 13.5h5.2" />
      <path d="M13 17 17 7l4 10" />
      <path d="M14.4 13.5h5.2" />
    </>
  ),
  'box-shadow': (
    <>
      <rect x="4" y="4" width="12" height="12" rx="2" />
      <path d="M8 20h10a2 2 0 0 0 2-2V8" />
    </>
  ),
  auto: (
    <>
      <rect x="4" y="8" width="12" height="12" rx="2" />
      <path d="M18.5 3l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="currentColor" stroke="none" />
    </>
  ),
  // Reuses the icons smiley — emoji shares that face motif.
  emoji: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.5h.01" />
      <path d="M15 10.5h.01" />
      <path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" />
    </>
  ),
  ratio: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <rect x="7" y="9.5" width="7" height="5" rx="1" />
    </>
  ),
  'alt-text': (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="8" cy="9.5" r="1.4" />
      <path d="M4 16l4-3.5 3 2.5" />
      <path d="M13.5 9.5h5M16 9.5v6" />
    </>
  ),
  // -- Menu glyphs drawn for the compact mega menu: one distinct mark per tool --
  'palette-strip': (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M9.2 6v12M14.8 6v12" />
    </>
  ),
  'type-scale': (
    <>
      <path d="M3.5 20h17" />
      <path d="M6 20v-4.5M4.5 15.5h3" />
      <path d="M11.5 20v-9M9.6 11h3.8" />
      <path d="M17.5 20V5.5M15.2 5.5h4.6" />
    </>
  ),
  'icon-library': <path d="m12 4 2.4 5 5.4.7-4 3.7 1.1 5.4L12 16.1l-4.9 2.7 1.1-5.4-4-3.7 5.4-.7z" />,
  'file-converter': (
    <>
      <path d="M4 8.5h15" />
      <path d="m15.5 5 3.5 3.5-3.5 3.5" />
      <path d="M20 15.5H5" />
      <path d="M8.5 12 5 15.5 8.5 19" />
    </>
  ),
  '3d-converter': (
    <>
      <path d="M12 3.5 19.5 7.8v8.4L12 20.5 4.5 16.2V7.8z" />
      <path d="M4.5 7.8 12 12l7.5-4.2M12 12v8.5" />
    </>
  ),
  // A front gradient square with a second sheet behind it: a library of them,
  // so it no longer wears the Gradient tool's own mark.
  'gradient-library': (
    <>
      <rect x="3.5" y="8" width="12.5" height="12.5" rx="2.5" />
      <path d="M3.5 20.5 16 8" />
      <path d="M8 4.5h10.5a2 2 0 0 1 2 2V17" />
    </>
  ),
  // -- Learn guides: one mark each, none shared with a tool --
  'guide-contrast': (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  'guide-scale': (
    <>
      <path d="M4 18 8.5 6 13 18M5.8 13.5h5.4" />
      <path d="m15.5 18 2.6-6.5 2.6 6.5M16.4 16h3.4" />
    </>
  ),
  'guide-metrics': (
    <>
      <path d="M5 6.5h14M5 17.5h14" />
      <path d="M12 6.5v11" />
    </>
  ),
  'guide-colour-spaces': (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="1.7" />
      <circle cx="15" cy="12" r="1.7" />
      <circle cx="8" cy="17" r="1.7" />
    </>
  ),
  'guide-theme': (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" />
    </>
  ),
  'guide-brand': (
    <>
      <path d="M12 3.5 18 12l-6 8.5L6 12z" />
      <path d="M12 12v4.5" />
      <circle cx="12" cy="10.5" r="1" />
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
  // A glyph descending onto a baseline: the file arriving underneath text that
  // is already being read, which is what /learn/font-loading is about.
  loading: (
    <>
      <path d="M12 4.5v8.5" />
      <path d="m8.5 9.5 3.5 3.5 3.5-3.5" />
      <path d="M5 18.5h14" />
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
  // ── Account (the site map's group tiles) ──
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.4-3.6 4-5.2 7-5.2s5.6 1.6 7 5.2" />
    </>
  ),
  legal: (
    <>
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4M9 12.5h6M9 16h6" />
    </>
  ),
}

const FALLBACK = <circle cx="12" cy="12" r="7" />

// Hover-moment variants for the mega menu. The same glyph at rest, with
// its moving parts classed so global.css ("HOVER MOMENTS") can animate them. Only
// the menu rows ask for these (`moment`), so every other use of an icon is untouched.
// Rest geometry is identical to ICONS; the extra parts are hidden at rest by CSS.
// A value that is a function gets a unique id, for a clipPath.
const MOMENT_ICONS = {
  contrast: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path className="half" d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
    </>
  ),
  // The ramp (tint at the top, shade at the bottom) rises inside the drop, which
  // is the clip; the outline is drawn last so the stroke stays above the fill.
  tint: (uid) => (
    <>
      <clipPath id={uid}><path d="M12 3.5s5.5 5.8 5.5 9.5A5.5 5.5 0 0 1 6.5 13c0-3.7 5.5-9.5 5.5-9.5z" /></clipPath>
      <g clipPath={`url(#${uid})`}>
        <g className="rise" stroke="none" fill="currentColor">
          <rect x="5" y="3" width="14" height="6" fillOpacity=".18" />
          <rect x="5" y="9" width="14" height="4.6" fillOpacity=".42" />
          <rect x="5" y="13.6" width="14" height="6" fillOpacity=".75" />
        </g>
      </g>
      <path d="M12 3.5s5.5 5.8 5.5 9.5A5.5 5.5 0 0 1 6.5 13c0-3.7 5.5-9.5 5.5-9.5z" />
    </>
  ),
  semantic: (
    <>
      <rect className="sb s1" x="4" y="5" width="16" height="4.2" rx="2.1" stroke="none" />
      <rect className="sb s2" x="4" y="10.4" width="16" height="4.2" rx="2.1" stroke="none" />
      <rect className="sb s3" x="4" y="15.8" width="10" height="4.2" rx="2.1" stroke="none" />
      <rect x="4" y="5" width="16" height="4.2" rx="2.1" />
      <rect x="4" y="10.4" width="16" height="4.2" rx="2.1" />
      <rect x="4" y="15.8" width="10" height="4.2" rx="2.1" />
    </>
  ),
  'type-scale': (
    <g className="ts">
      <path d="M3.5 20h17" />
      <g className="t1"><path d="M6 20v-4.5M4.5 15.5h3" /></g>
      <g className="t2"><path d="M11.5 20v-9M9.6 11h3.8" /></g>
      <g className="t3"><path d="M17.5 20V5.5M15.2 5.5h4.6" /></g>
    </g>
  ),
  icons: (
    <>
      <path className="i1" d="m12 4 2.4 5 5.4.7-4 3.7 1.1 5.4L12 16.1l-4.9 2.7 1.1-5.4-4-3.7 5.4-.7z" />
      <path className="i2" d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.6 12 19 12 19z" />
      <path className="i3" d="M13 3.5 6 13.5h5l-1 7 7-10h-5z" />
      <path className="i4" d="M7 4.5h10v15l-5-3.6-5 3.6z" />
      <g className="i5">
        <circle cx="12" cy="12" r="3.6" />
        <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M17.3 6.7l-1.4 1.4M8.1 15.9l-1.4 1.4" />
      </g>
    </>
  ),
  // The face tilts and its right eye winks once: the dot hides and a closed lid shows.
  emoji: (
    <g className="face">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.5h.01" />
      <path className="er" d="M15 10.5h.01" />
      <path className="ew" d="M13.3 10.9q1.7-1.5 3.4 0" />
      <path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" />
    </g>
  ),
  // Two arrows that run through once, like a file passing.
  'file-converter': (
    <>
      <g className="a1">
        <path d="M4 8.5h15" />
        <path d="m15.5 5 3.5 3.5-3.5 3.5" />
      </g>
      <g className="a2">
        <path d="M20 15.5H5" />
        <path d="M8.5 12 5 15.5 8.5 19" />
      </g>
    </>
  ),
  // The inner frame turns from landscape to portrait.
  ratio: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <rect className="in" x="7" y="9.5" width="7" height="5" rx="1" />
    </>
  ),
  // Three faces of the cube take light, drawn first so the outline stays above.
  'model-3d': (
    <>
      <path className="f f1" d="M12 3.5 19.5 7.8 12 12 4.5 7.8z" />
      <path className="f f2" d="M4.5 7.8 12 12v8.5L4.5 16.2z" />
      <path className="f f3" d="M19.5 7.8 12 12v8.5l7.5-4.3z" />
      <path d="M12 3.5 19.5 7.8v8.4L12 20.5 4.5 16.2V7.8z" />
      <path d="M4.5 7.8 12 12l7.5-4.2M12 12v8.5" />
    </>
  ),
  // The picture steps back and the T comes forward.
  'alt-text': (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <g className="pic">
        <circle cx="8" cy="9.5" r="1.4" />
        <path d="M4 16l4-3.5 3 2.5" />
      </g>
      <path className="tx" d="M13.5 9.5h5M16 9.5v6" />
    </>
  ),
  // Terracotta Dusk (paletteGallery.js), filled under the outlines.
  'palette-library': (
    <>
      <rect className="c c1" x="4" y="4" width="7" height="7" rx="1.5" fill="#264653" />
      <rect className="c c2" x="13" y="4" width="7" height="7" rx="1.5" fill="#2A9D8F" />
      <rect className="c c3" x="4" y="13" width="7" height="7" rx="1.5" fill="#E9C46A" />
      <rect className="c c4" x="13" y="13" width="7" height="7" rx="1.5" fill="#E76F51" />
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  inspiration: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path className="needle" d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  // The line becomes three dots that hop once, like a reply on its way.
  'prompt-library': (
    <>
      <path d="M4 5.5h16v9H9l-4 3.5v-3.5H4z" />
      <path className="ln" d="M8.5 10h7" />
      <circle className="d d1" cx="9" cy="10" r="1.25" />
      <circle className="d d2" cx="12" cy="10" r="1.25" />
      <circle className="d d3" cx="15" cy="10" r="1.25" />
    </>
  ),
}

export default function NavIcon({ id, className, moment }) {
  const uid = `nvi${useId().replace(/:/g, '')}`
  const variant = moment ? MOMENT_ICONS[moment] : null
  const glyph = variant ? (typeof variant === 'function' ? variant(uid) : variant) : ICONS[id] || FALLBACK
  return (
    <svg
      className={variant ? ['mm-gl', className].filter(Boolean).join(' ') : className}
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
      {glyph}
    </svg>
  )
}
