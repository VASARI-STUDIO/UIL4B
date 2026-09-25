// The glyphs the tool pages draw, ported from the Phosphor names the
// "UIL4B App.dc.html" writes as `class="ph ph-<name>"`.
//
// Inline SVG for the same reason src/components/spectrum/SpectrumIcon.jsx gives:
// a Phosphor webfont would add a CDN origin and a font that arrives after the
// text and shifts the row it sits in. One 24-unit box, stroke in currentColor,
// round caps and joins, 1.5 stroke (Phosphor "regular" is 16 on a 256 grid,
// which is 1.5 on 24). Only the names the tool pages use are here; a missing
// name renders nothing so a typo cannot ship as a plausible fallback shape.

const GLYPHS = {
  'arrow-left': (<><path d="M20.25 12H3.75" /><path d="m10.5 5.25-6.75 6.75 6.75 6.75" /></>),
  'arrow-counter-clockwise': (<><path d="M7.5 9.75H3v-4.5" /><path d="M6.17 17.83a8.25 8.25 0 1 0 0-11.66L3 9.75" /></>),
  'arrow-clockwise': (<><path d="M16.5 9.75H21v-4.5" /><path d="M17.83 17.83a8.25 8.25 0 1 1 0-11.66L21 9.75" /></>),
  'arrows-down-up': (<><path d="m10.5 16.5-3 3-3-3" /><path d="M7.5 4.5v15" /><path d="m13.5 7.5 3-3 3 3" /><path d="M16.5 19.5v-15" /></>),
  'bookmark-simple': (<path d="M18 21 12 17.25 6 21V4.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75Z" />),
  'caret-right': (<path d="m9 4.5 7.5 7.5L9 19.5" />),
  'caret-up-down': (<><path d="m7.5 15.75 4.5 4.5 4.5-4.5" /><path d="m7.5 8.25 4.5-4.5 4.5 4.5" /></>),
  'check-circle': (<><path d="m8.25 12.75 2.25 2.25 5.25-5.25" /><circle cx="12" cy="12" r="9" /></>),
  copy: (<><path d="M15.75 15.75h4.5v-12h-12v4.5" /><rect x="3.75" y="8.25" width="12" height="12" /></>),
  eyedropper: (<><path d="m13.5 6 4.5 4.5" /><path d="M9.44 17.81 5.25 18.75l.94-4.19 8.33-8.33a2.12 2.12 0 0 1 3 3Z" /><path d="m18.75 5.25-1.5 1.5" /></>),
  image: (<><rect x="3" y="4.5" width="18" height="15" rx=".75" /><path d="m3 15.75 4.72-4.72a.75.75 0 0 1 1.06 0l4.19 4.19a.75.75 0 0 0 1.06 0l1.94-1.94a.75.75 0 0 1 1.06 0L21 17.25" /><circle cx="14.63" cy="9.38" r=".38" /></>),
  'lock-simple': (<><rect x="3.75" y="8.25" width="16.5" height="12" rx=".75" /><path d="M8.25 8.25V5.25a3.75 3.75 0 0 1 7.5 0v3" /></>),
  'lock-simple-open': (<><rect x="3.75" y="8.25" width="16.5" height="12" rx=".75" /><path d="M8.25 8.25V5.25a3.75 3.75 0 0 1 7.35-1.05" /></>),
  'magic-wand': (<><path d="M3.75 20.25 14.25 9.75" /><path d="M19.5 9.75V13.5" /><path d="M17.63 11.63h3.75" /><path d="M8.25 3v4.5" /><path d="M6 5.25h4.5" /><path d="M15.75 16.5v3" /><path d="M14.25 18h3" /><path d="m12.75 11.25-1.5-1.5 2.47-2.47a1.06 1.06 0 0 1 1.5 1.5Z" /></>),
  plus: (<><path d="M3.75 12h16.5" /><path d="M12 3.75v16.5" /></>),
  shuffle: (<><path d="M3 7.5h3.2a4.5 4.5 0 0 1 3.66 1.88l4.28 5.99a4.5 4.5 0 0 0 3.66 1.88H21" /><path d="m18.75 5.25 2.25 2.25-2.25 2.25" /><path d="m18.75 14.25 2.25 2.25-2.25 2.25" /><path d="M13.97 9.2a4.5 4.5 0 0 1 3.83-1.7H21" /><path d="M3 16.5h3.2a4.5 4.5 0 0 0 3.83-1.7" /></>),
  warning: (<><path d="M12 9.75v3.75" /><path d="M10.7 3.75 2.46 18a1.5 1.5 0 0 0 1.3 2.25h16.48a1.5 1.5 0 0 0 1.3-2.25L13.3 3.75a1.5 1.5 0 0 0-2.6 0Z" /><circle cx="12" cy="16.88" r=".38" /></>),
  'warning-circle': (<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.25" /><circle cx="12" cy="16.13" r=".38" /></>),
  x: (<><path d="M18.75 5.25 5.25 18.75" /><path d="M18.75 18.75 5.25 5.25" /></>),
  'x-circle': (<><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m15 15-6-6" /></>),
  'arrows-left-right': (<><path d="m16.5 13.5 3 3-3 3" /><path d="M4.5 16.5h15" /><path d="m7.5 10.5-3-3 3-3" /><path d="M19.5 7.5h-15" /></>),
  swatches: (<><path d="M7.5 20.25a3 3 0 0 1-3-3V4.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v12.75a3 3 0 0 1-3 3Z" /><path d="M10.5 9.1 14.4 5.2a.75.75 0 0 1 1.06 0l3.18 3.18a.75.75 0 0 1 0 1.06L9.9 18.2" /><path d="M13.8 14.25h5.45a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75H7.5" /><circle cx="7.5" cy="17.25" r=".38" /></>),
  'upload-simple': (<><path d="M12 14.25V3.75" /><path d="M20.25 14.25v5.25a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-5.25" /><path d="M8.25 7.5 12 3.75l3.75 3.75" /></>),
  'dots-three': (<><circle cx="5.25" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="18.75" cy="12" r="1.1" fill="currentColor" stroke="none" /></>),
  'sliders-horizontal': (<><path d="M13.5 16.5h6.75" /><path d="M3.75 16.5h6.75" /><circle cx="12" cy="16.5" r="1.5" /><path d="M6.75 7.5h13.5" /><path d="M3.75 7.5h0" /><circle cx="5.25" cy="7.5" r="1.5" /></>),
  'info': (<><circle cx="12" cy="12" r="9" /><path d="M11.25 11.25H12v5.25h.75" /><circle cx="11.81" cy="7.88" r=".38" /></>),
  'circle-notch': (<path d="M16.5 4.2a9 9 0 1 1-9 0" />),
}


export default function ToolIcon({ name, size = 15, className }) {
  const glyph = GLYPHS[name]
  if (!glyph) return null
  return (
    <svg
      className={className ? `tl-ico ${className}` : 'tl-ico'}
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
