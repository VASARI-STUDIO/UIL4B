// The Spectrum glyph set, ported to inline SVG.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS RATHER THAN A <link> TO PHOSPHOR
// ─────────────────────────────────────────────────────────────────────────────
// "UIL4B - Spectrum.dc.html" pulls FIVE Phosphor weight stylesheets from
// cdn.jsdelivr.net in its <helmet> and then writes `class="ph ph-arrow-up-right"`
// roughly two hundred times. Adopting that literally would put a new origin, a
// DNS lookup, a TLS handshake and five icon-font files on the first-paint path
// of the front door — the exact cost global.css's own @font-face note measured
// at ~587ms and self-hosted the type system to avoid. It would also make every
// glyph a FONT glyph, which means it arrives after the text does and shifts the
// row it sits in.
//
// So the glyphs are drawn here, in the idiom src/components/NavIcon.jsx already
// established for the nav mega-menus: one 24-unit box, `fill="none"`,
// `stroke="currentColor"`, round caps and joins, `aria-hidden` on the <svg>.
// They inherit colour from the parent and cost nothing beyond the markup.
//
// ONLY THE GLYPHS THE PAGE ACTUALLY USES ARE HERE. Phosphor ships ~9,000; the
// Spectrum sales page uses fifteen of them. The CATEGORY glyphs (colour, type,
// icons, imagery, ai) are deliberately NOT redrawn — NavIcon already owns those
// and the bench reuses it, so a tool's icon on this page and the same tool's
// icon in the nav cannot drift.
//
// `size` exists because these sit at three scales on the page (11px inside a
// CTA bubble, 16px in a row, 26px in a card) and an SVG that is sized by CSS
// alone measures 0×0 for one frame in Safari before the stylesheet resolves.

const GLYPHS = {
  // ph-arrow-up-right. The page's most-used glyph: it is the `data-cta-icon`
  // that rotates 45° on hover, so the arrow is drawn pointing up-right and the
  // rotation lands it pointing right.
  'arrow-up-right': (
    <>
      <path d="M7.5 16.5 16.5 7.5" />
      <path d="M8.75 7.5h7.75v7.75" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </>
  ),
  // ph-magnifying-glass
  search: (
    <>
      <circle cx="11" cy="11" r="6.75" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  // ph-shuffle
  shuffle: (
    <>
      <path d="M15.5 5.5h4v4" />
      <path d="M15.5 18.5h4v-4" />
      <path d="M19.5 5.5 4.5 18.5" />
      <path d="M4.5 5.5 9 10" />
      <path d="m15 15 4.5 3.5" />
    </>
  ),
  // ph-copy
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 5.5a2 2 0 0 0-2-2H6a2.5 2.5 0 0 0-2.5 2.5v7a2 2 0 0 0 2 2" />
    </>
  ),
  // ph-check
  check: <path d="m4.5 12.5 5 5 10-11" />,
  // ph-minus — the "not on this plan" marker, drawn rather than an en dash so
  // it sits on the same optical baseline as the ticks above it.
  minus: <path d="M5 12h14" />,
  // ph-x
  close: <path d="M18 6 6 18M6 6l12 12" />,
  // ph-folder-simple
  folder: <path d="M3.5 18V6.5a1 1 0 0 1 1-1h4.2a1 1 0 0 1 .72.3l1.36 1.4a1 1 0 0 0 .72.3h8a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-16a1 1 0 0 1-1-1Z" />,
  // ph-download-simple
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  // ph-upload-simple
  upload: (
    <>
      <path d="M12 15.5v-11" />
      <path d="M7.5 9 12 4.5 16.5 9" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  // ph-credit-card
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M6.5 14.5h3" />
    </>
  ),
  // ph-arrow-u-up-left
  undo: (
    <>
      <path d="M8 13.5 4 9.5l4-4" />
      <path d="M4 9.5h10.5a5.5 5.5 0 0 1 0 11H10" />
    </>
  ),
  // ph-lock-simple
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  // ph-file-arrow-up — the export/handoff glyph on the specimen cards.
  file: (
    <>
      <path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Z" />
      <path d="M13.5 3.5v5h5" />
    </>
  ),
  // ph-sparkle — AI Studio's marker on the bench rail.
  sparkle: <path d="M12 4.2 13.6 9 18.4 10.6 13.6 12.2 12 17 10.4 12.2 5.6 10.6 10.4 9z" />,
  // ph-caret-down
  caret: <path d="m7 10 5 5 5-5" />,
}

export default function SpectrumIcon({ name, size = 16, className, strokeWidth = 1.6 }) {
  const glyph = GLYPHS[name]
  // A MISSING NAME RENDERS NOTHING RATHER THAN A FALLBACK CIRCLE.
  // NavIcon falls back to a circle because its ids come from the tool tree and a
  // new group should still draw something. Every name here is a literal typed in
  // this repo, so an unknown one is a typo, and a typo that draws a plausible
  // circle is a typo that ships. `tests/unit/spectrum-structure.test.js` fails
  // the build on any name this file does not carry.
  if (!glyph) return null
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  )
}
