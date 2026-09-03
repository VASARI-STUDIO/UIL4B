import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { generateHarmony, generateTintScale, textColorForBg, hslToHex, hexToHsl, contrastRatio, hexToRgb, mixHex, describeColor, autoTonalPalette, applyAdjust, simCvd, roleHueArcs, semanticRamp } from '../utils/colors'
import { useProject } from '../contexts/ProjectContext'
import { useI18n } from '../contexts/I18nContext'
import { useExport } from '../contexts/ExportContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
import UIKitGuide from '../components/UIKitGuide'
import { resolveTool } from '../data/toolTree'

const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']



const STATE_PRESETS = {
  success: [
    { name: 'Emerald', shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
    { name: 'Green', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
    { name: 'Teal', shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'] },
    { name: 'Apple', shades: ['#f0fdf4', '#dcfce7', '#b6f5cc', '#7aedaa', '#4ade80', '#34C759', '#2aa648', '#1f8a3a', '#186d2e', '#125524'] },
    { name: 'Material', shades: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4CAF50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'] },
    { name: 'Tailwind', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  ],
  warning: [
    { name: 'Amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
    { name: 'Orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
    { name: 'Apple', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#FF9500', '#e08200', '#b86a00', '#925300', '#6e3e00'] },
    { name: 'Material', shades: ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#FF9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100'] },
    { name: 'Tailwind', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
  ],
  error: [
    { name: 'Red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
    { name: 'Pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
    { name: 'Apple', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#FF3B30', '#e0342a', '#b82a22', '#91211b', '#6e1914'] },
    { name: 'Material', shades: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#F44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c'] },
    { name: 'Tailwind', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  ],
  info: [
    { name: 'Blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
    { name: 'Sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
    { name: 'Indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
    { name: 'Apple', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#007AFF', '#0062d6', '#004db3', '#003d8f', '#002e6b'] },
    { name: 'Material', shades: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196F3', '#1e88e5', '#1565c0', '#0d47a1', '#0a3880'] },
    { name: 'Tailwind', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  ],
  // PENDING — the fifth role, added 2026-09-04. Success, warning, error and info
  // are all SETTLED conditions: three outcomes and one piece of ambient context.
  // Nothing in the set covers "underway, outcome not known yet".
  //
  // IT IS NOT A COLOUR LOOKING FOR A JOB. This app already needs a fifth signal
  // and, having no token for it, spells it FIVE different ways — every one of
  // these was read off the source and confirmed to have a live consumer:
  //   .alt-card-status   "Generating..."  var(--accent-strong)   the BRAND colour
  //   .fc-status         "Converting..."  var(--t2)              gave up on colour
  //   Admin STATUS_*     'in-progress'    var(--accent)/-bg      the BRAND colour
  //   Admin TYPE_*/DONUT 'help', slice 5  #a855f7 raw hex        no dark value
  //   .adm-check-icon.pending             rgba(245,158,11,.1)    WARNING amber
  // Two tools that do the same thing - run a job and report on it - answer the
  // question differently, and a state colour that IS the brand colour cannot
  // signal a state, it signals "us". #a855f7 is Tailwind purple-500: the app had
  // already picked this hue by hand, it just had nowhere to put it.
  //
  // CHECKED AND DELIBERATELY NOT COUNTED: the .fp-* roadmap block in global.css
  // has .fp-dot-progress{background:var(--accent)}, which looks like a sixth
  // site. The whole .fp-* block is DEAD CSS - zero JSX consumers anywhere in
  // src/ or tests/. Recorded so it is not re-reported as evidence.
  //
  // Violet, because it is the only large gap left in the wheel. The four
  // reference hues are 0 (error), 38 (warning), 142 (success) and 217 (info):
  // the arc from 217 back round to 360 is 143 degrees wide and empty, and it is
  // also the arc info's own Custom slider used to spill into unopposed.
  pending: [
    { name: 'Violet', shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
    { name: 'Purple', shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'] },
    { name: 'Fuchsia', shades: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'] },
    { name: 'Apple', shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#AF52DE', '#9546bd', '#7a399b', '#642f7f', '#522768'] },
    { name: 'Material', shades: ['#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2', '#673AB7', '#5e35b1', '#512da8', '#4527a0', '#311b92'] },
    { name: 'Tailwind', shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
  ],
}
const STATE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

const STATE_BUNDLES = [
  { name: 'Balanced', desc: 'Familiar, calm defaults for most product UI.', config: { success: 1, warning: 0, error: 0, info: 0, pending: 0 } },
  { name: 'Material', desc: 'Established Material state foundations.', config: { success: 4, warning: 4, error: 4, info: 4, pending: 4 } },
  { name: 'Vivid', desc: 'Higher chroma for expressive interfaces.', config: { success: 0, warning: 2, error: 1, info: 2, pending: 2 } },
  { name: 'Cool', desc: 'Teal, yellow, pink, sky and violet emphasis.', config: { success: 2, warning: 1, error: 2, info: 1, pending: 0 } },
  { name: 'Warm', desc: 'Classic green, amber and red signals.', config: { success: 1, warning: 0, error: 0, info: 2, pending: 2 } },
  { name: 'Apple', desc: 'System colours aligned with Apple platforms.', config: { success: 3, warning: 3, error: 3, info: 3, pending: 3 } },
  { name: 'Tailwind', desc: 'Direct mapping to Tailwind colour ramps.', config: { success: 5, warning: 5, error: 5, info: 5, pending: 5 } },
]

// The cue is the NON-COLOUR half of each role — WCAG 1.4.1, and the reason the
// preview can be read by someone who cannot separate the hues. '…' is the one
// this product already uses: every long job in the app says "Generating…",
// "Converting…", "Loading engine…". It is also inside the self-hosted subset
// (U+2026 falls in the U+2000-206F range both webfonts ship), which ✓ is not.
const STATE_META = {
  success: { label: 'Success', cue: '✓', intent: 'Completed, connected or ready' },
  warning: { label: 'Warning', cue: '!', intent: 'Needs attention before continuing' },
  error: { label: 'Error', cue: '×', intent: 'Failed, destructive or blocked' },
  info: { label: 'Information', cue: 'i', intent: 'Helpful context or neutral update' },
  pending: { label: 'Pending', cue: '…', intent: 'Underway — no outcome yet' },
}

// Reference "500" hex per role, taken from the Balanced bundle — the canonical
// seed for each role's custom hue arc and generated ramp (Cluster F).
const STATE_REF_HEX = Object.fromEntries(
  Object.entries(STATE_BUNDLES[0].config).map(([role, idx]) => [role, STATE_PRESETS[role][idx].shades[5]])
)
// Per-role hue arcs, capped at the midpoints to adjacent roles so a custom
// semantic colour stays legible (green success can lean lime/teal, never blue).
const ROLE_ARCS = roleHueArcs(STATE_REF_HEX)

// Resolve a role's selection to its 10 shades. `sel` is either an integer preset
// index or a custom `{ custom: hue }` object. Central resolver so every consumer
// — the live strip, the CSS export, the HTML export, the localStorage cache —
// agrees on how a custom hue expands into a ramp.
function resolveStateShades(state, sel) {
  if (sel && typeof sel === 'object' && Number.isFinite(sel.custom)) {
    return semanticRamp(sel.custom, STATE_REF_HEX[state])
  }
  const idx = Number.isInteger(sel) ? sel : 0
  return (STATE_PRESETS[state][idx] || STATE_PRESETS[state][0]).shades
}

const GRAD_PRESETS = [
  { n: 'Indigo Rose', stops: [{ color: '#667eea', pos: 0 }, { color: '#764ba2', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Peach', stops: [{ color: '#ee9ca7', pos: 0 }, { color: '#ffdde1', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Aqua', stops: [{ color: '#1a2980', pos: 0 }, { color: '#26d0ce', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Celestial', stops: [{ color: '#c33764', pos: 0 }, { color: '#1d2671', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Relay', stops: [{ color: '#3a1c71', pos: 0 }, { color: '#d76d77', pos: 50 }, { color: '#ffaf7b', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Sublime', stops: [{ color: '#fc5c7d', pos: 0 }, { color: '#6a82fb', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Flare', stops: [{ color: '#f12711', pos: 0 }, { color: '#f5af19', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Emerald', stops: [{ color: '#348f50', pos: 0 }, { color: '#56b4d3', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Sunset', stops: [{ color: '#f093fb', pos: 0 }, { color: '#f5576c', pos: 50 }, { color: '#ffd200', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Ocean', stops: [{ color: '#2E3192', pos: 0 }, { color: '#1BFFFF', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Northern Lights', stops: [{ color: '#43cea2', pos: 0 }, { color: '#185a9d', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Warm Flame', stops: [{ color: '#ff9a9e', pos: 0 }, { color: '#fecfef', pos: 50 }, { color: '#fdfcfb', pos: 100 }], angle: 45, type: 'Linear' },
  { n: 'Deep Space', stops: [{ color: '#000000', pos: 0 }, { color: '#434343', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Malibu', stops: [{ color: '#4facfe', pos: 0 }, { color: '#00f2fe', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Plum Plate', stops: [{ color: '#667eea', pos: 0 }, { color: '#764ba2', pos: 100 }], angle: 90, type: 'Radial' },
  { n: 'Rainbow', stops: [{ color: '#ff0000', pos: 0 }, { color: '#ff8800', pos: 20 }, { color: '#ffff00', pos: 40 }, { color: '#00ff00', pos: 60 }, { color: '#0088ff', pos: 80 }, { color: '#8800ff', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Instagram', stops: [{ color: '#feda75', pos: 0 }, { color: '#fa7e1e', pos: 30 }, { color: '#d62976', pos: 60 }, { color: '#962fbf', pos: 80 }, { color: '#4f5bd5', pos: 100 }], angle: 45, type: 'Linear' },
  { n: 'Cotton Candy', stops: [{ color: '#a18cd1', pos: 0 }, { color: '#fbc2eb', pos: 100 }], angle: 120, type: 'Linear' },
  { n: 'Mojito', stops: [{ color: '#1d976c', pos: 0 }, { color: '#93f9b9', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Royal', stops: [{ color: '#141e30', pos: 0 }, { color: '#243b55', pos: 100 }], angle: 135, type: 'Linear' },
  { n: 'Bloody Mary', stops: [{ color: '#ff512f', pos: 0 }, { color: '#dd2476', pos: 100 }], angle: 90, type: 'Linear' },
  { n: 'Aurora Conic', stops: [{ color: '#5ee7df', pos: 0 }, { color: '#b490ca', pos: 50 }, { color: '#5ee7df', pos: 100 }], angle: 90, type: 'Conic' },
  { n: 'Spotlight', stops: [{ color: '#ffffff', pos: 0 }, { color: '#6a11cb', pos: 100 }], angle: 90, type: 'Radial' },
]


function StateShade({ shade, label, onCopy }) {
  const fg = textColorForBg(shade)
  return (
    <div onClick={() => onCopy(shade)}
      role="button" tabIndex={0} aria-label={`Copy ${shade.toUpperCase()}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy(shade) } }}
      className="stc-cell" style={{ background: shade, color: fg }}
    >
      <span className="stc-cell-tone">{label}</span>
      <span className="stc-cell-hex">{shade.replace('#', '').toLowerCase()}</span>
    </div>
  )
}

// Every usage example below paints from the --stc-* custom properties this
// writes and nothing else, and they are derived from the user's own resolved
// ramp by sceneColours() above - so a scene cannot show a colour the pack does
// not contain. That is the rule #340 applied to the Discover cards when it made
// them read from the gallery data, and it is the reason this demo cannot drift
// from the pack it claims to show.
function semanticSceneRef(colours) {
  return (element) => {
    if (!element) return
    for (const [key, value] of Object.entries(colours)) {
      element.style.setProperty(`--stc-${key.toLowerCase()}`, value)
    }
  }
}

// Lucide-shaped inline glyphs, drawn the way the rest of this file draws SVG
// (currentColor, 2px stroke, round caps) so they inherit the role colour. Lucide
// is the project's icon pack; these are not a second icon language.
const SCENE_ICONS = {
  success: <><path d="M20 6 9 17l-5-5" /></>,
  warning: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  error: <><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  // A broken ring: it reads as "in progress" even when it is not turning, which
  // is what a visitor with reduced motion gets.
  pending: <><path d="M21 12a9 9 0 1 1-6.2-8.6" /></>,
}

// The two panel grounds. They are FIXED on purpose: the panels are a picture of
// a light interface and a dark one, not of this page, so they do not follow the
// app theme. Both are measured against below.
const SCENE_LIGHT_BG = '#f7f8fa'
const SCENE_DARK_BG = '#111318'

// Pick the first candidate that clears `floor` against `ground`; fall back to
// the last (the most extreme) rather than throwing, so a hand-built ramp can
// never blank the preview.
function pickForContrast(candidates, ground, floor) {
  return candidates.find(c => contrastRatio(c, ground) >= floor) || candidates[candidates.length - 1]
}

// WHY THIS IS DERIVED RATHER THAN INDEXED. The first cut of these scenes took
// fixed steps - text at 800, fills at 600 - the way the old swatch rows did.
// Measured across all 7 bundles x 2 panels x 5 roles, that produced 18 failures,
// and they were NOT eyeballable: Material's warning ramp puts a bright orange at
// 800 (#ef6c00), so "Already used by 2 projects" was 2.90:1 on its own fill,
// and white on Material's error 600 (#e53935) is 4.23:1 - a destructive button
// whose label misses AA. A fixed index is an assumption about a ramp's shape,
// and the packs do not all have the same shape.
//
// So each job asks for the first shade that actually clears its floor. 4.5:1 for
// text, 3:1 for icons and control boundaries (WCAG 1.4.11). The colours still
// come only from the user's own ramp - nothing is invented, the ramp is just
// read at the step that works.
function sceneColours(shades) {
  // The dark fill is computed here the same way the CSS computes it, so the
  // number measured is the number painted: color-mix(strong 15%, #111318).
  const strong = pickForContrast([shades[6], shades[7], shades[8]], shades[0], 3)
  const darkFill = mixHex(SCENE_DARK_BG, strong, 0.15)
  return {
    soft: shades[0],
    tint: shades[1],
    border: shades[2],
    strong,
    // Text on the pale fill.
    ink: pickForContrast([shades[8], shades[9], '#101014'], shades[0], 4.5),
    // A fill that can carry a white label: the destructive button, the switch.
    solid: pickForContrast([shades[6], shades[7], shades[8], shades[9]], '#ffffff', 4.5),
    // Text and icons sitting straight on the light panel, with no fill under
    // them - the info note and its link.
    onPanel: pickForContrast([shades[6], shades[7], shades[8], shades[9]], SCENE_LIGHT_BG, 4.5),
    // Dark panel: the same jobs, from the light end of the ramp.
    inkD: pickForContrast([shades[1], shades[0], shades[2]], darkFill, 4.5),
    liftD: pickForContrast([shades[4], shades[3], shades[2], shades[1]], darkFill, 3),
    solidD: pickForContrast([shades[4], shades[3], shades[2], shades[1]], SCENE_DARK_BG, 4.5),
    onPanelD: pickForContrast([shades[4], shades[3], shades[2], shades[1]], SCENE_DARK_BG, 4.5),
  }
}

// ─── THE USAGE EXAMPLES (founder, 2026-08-08) ──────────────────────────────
// "swatch demos replaced with real usage examples - icons, buttons, switches,
// alerts". What was here was five identical rows: a coloured circle, the role
// name, the role's own definition, and a Copy button. That is a swatch with a
// caption - it shows you the colour, it does not show you the DECISION.
//
// Mobbin (web) drove the replacement. Lovable, Stitch and GitBook all pair token
// editing with a preview built from real product UI, and the pattern repeats:
//   v0            token list beside a live account form, KPI card and a payments
//                 table whose Status column is the semantic colour doing its job
//   Base44        an "App Colors" list beside a working finance dashboard
//   Stitch        a component sheet - buttons in every variant, fields, chips
//   Framer        one real button shown in its STATES, not one swatch per state
//   MagicPath     each colour captioned with the job it does, not just its name
// And for the roles themselves:
//   Plane         In Progress is its own colour beside Done and Cancelled
//   Mistral AI    Pending is a first-class tab beside Fetched and Failed
//   Laravel Cloud every pending step is grey - a system with no pending colour
//   Confluence    the status picker ships FIVE colours; the fifth is purple
//
// So: one scene per role, and every scene a DIFFERENT component - which is the
// whole point. Five identical shapes cannot show that a colour behaves
// differently as a 1px border than as a 40px fill. Each role gets the component
// it actually governs, and between them they cover the four things the founder
// named: icons, buttons, switches, alerts.
//
// The copy is plausible product content on purpose (anti-slop: "decorative
// product mock-ups contain implausible data or controls"). Nothing here claims a
// number about UIL4B itself.
//
// The dark panel is handled entirely in CSS, off .stc-preview--dark, so a scene
// is written once and there is one colour source and no fixed sample values.
const SEMANTIC_SCENES = [
  {
    // SUCCESS - a switch. Green-when-on is the one place a semantic colour
    // governs a control rather than a message, and "on" is a settled good state.
    role: 'success',
    render: () => (
      <div className="stc-sc-row">
        <span className="stc-sc-lead">
          <strong>Two-factor authentication</strong>
          <small>Protecting 3 devices</small>
        </span>
        <span className="stc-sc-switch stc-sc-switch--on" role="img" aria-label="Two-factor authentication is on">
          <i />
        </span>
      </div>
    ),
  },
  {
    // WARNING - a field that is advisory, not blocking. The border and the
    // helper text carry it, and the action stays available: that IS the
    // difference between warning and error, and it is invisible on a swatch.
    role: 'warning',
    render: () => (
      <div className="stc-sc-field">
        <label className="stc-sc-label" htmlFor="stc-sc-slug">Project slug</label>
        <input id="stc-sc-slug" className="stc-sc-input" type="text" defaultValue="aurora-design-system" readOnly tabIndex={-1} />
        <span className="stc-sc-help">
          <SceneIcon role="warning" size={13} />
          Already used by 2 projects
          <button type="button" className="stc-sc-ghost" tabIndex={-1}>Use anyway</button>
        </span>
      </div>
    ),
  },
  {
    // ERROR - the alert, and the only solid button in the set. Error is the one
    // role that blocks, so it gets the loudest object and the strongest fill.
    role: 'error',
    render: () => (
      <div className="stc-sc-alert">
        <span className="stc-sc-alert-ico"><SceneIcon role="error" size={16} /></span>
        <span className="stc-sc-lead">
          <strong>Payment declined</strong>
          <small>Your card was declined on 2 September.</small>
        </span>
        <button type="button" className="stc-sc-solid" tabIndex={-1}>Update card</button>
      </div>
    ),
  },
  {
    // INFO - the quietest thing in the set, deliberately. If info is as loud as
    // error the scale has no top, and that is a judgement you can only make by
    // seeing them stacked.
    role: 'info',
    render: () => (
      <div className="stc-sc-note">
        <SceneIcon role="info" size={15} />
        <span>Billing runs on the 1st. Changes apply next cycle.</span>
        <button type="button" className="stc-sc-link" tabIndex={-1}>Learn more</button>
      </div>
    ),
  },
  {
    // PENDING - the new role, in the place it actually lives: an activity row
    // with a turning icon and a status badge. The spin is a plain CSS animation
    // and is NOT given its own prefers-reduced-motion block - the global clamp
    // in global.css already stops it and honours an explicit data-reduced-motion
    // choice, which a bare media block would override. That is the exact fault
    // #336 fixed on 13 blocks; do not add a fourteenth.
    role: 'pending',
    render: () => (
      <div className="stc-sc-row">
        <span className="stc-sc-act-ico"><SceneIcon role="pending" size={16} spin /></span>
        <span className="stc-sc-lead">
          <strong>Publishing design system</strong>
          <small>3 of 5 token files written</small>
        </span>
        <span className="stc-sc-badge">In progress</span>
      </div>
    ),
  },
]

function SceneIcon({ role, size = 16, spin = false }) {
  return (
    <svg className={spin ? 'stc-scene-ico stc-scene-ico--spin' : 'stc-scene-ico'}
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >{SCENE_ICONS[role]}</svg>
  )
}

const CB_MODES = [
  { value: 'normal', label: 'Normal', short: 'Normal', desc: 'True colour' },
  { value: 'protanopia', label: 'Protan', short: 'Prot', desc: 'Red-blind (protanopia)' },
  { value: 'deuteranopia', label: 'Deutan', short: 'Deut', desc: 'Green-blind (deuteranopia)' },
  { value: 'tritanopia', label: 'Tritan', short: 'Trit', desc: 'Blue-blind (tritanopia)' },
  { value: 'achromatopsia', label: 'Achroma', short: 'Achr', desc: 'Total colour-blindness (achromatopsia)' },
]
const CB_LABELS = Object.fromEntries(CB_MODES.map(m => [m.value, m.desc]))









const COLOUR_TOOLS = [
  { id: 'palette', label: 'Palette', route: '/create/palette', desc: 'Build the core ramp' },
  { id: 'semantic', label: 'Semantic Colour', route: '/create/semantic-color', desc: 'Success, error, pending' },
  { id: 'gradient', label: 'Gradient', route: '/create/gradient', desc: 'Blend across your palette' },
  { id: 'tint', label: 'Tint', route: '/create/tint', desc: 'Scale any swatch' },
  { id: 'contrast', label: 'Contrast Checker', route: '/create/contrast', desc: 'Verify AA / AAA' },
]

// Colour tool id → the single studio section that route renders (#39). Keyed by
// tool id, not URL segment, so it survives a route move.
const PATH_TO_SECTION = { palette: 'palette', semantic: 'states', ui: 'systems', gradient: 'gradients' }
const SOLO_TITLES = { palette: 'Palette Builder', states: 'Semantic Colours', systems: 'UI Colour Systems', gradients: 'Gradient Tool' }

// Tool-specific hero copy for the standalone pages (#50). The merged studio
// keeps the generic i18n description; each solo page says what IT does — the
// same standard the Tint and Contrast pages set.
const SOLO_DESC = {
  palette: 'Build your core palette from one seed colour. Pick a harmony, fine-tune every swatch, and get tonal ramps with accessibility checks built in.',
  states: 'Dial in success, warning, error, info and pending colours. Start from a preset bundle or tune each state’s hue — every state gets a full 50–900 ramp.',
  systems: 'Start your UI colours from a proven foundation — load a design-system palette, borrow a brand’s colours, or pull named swatches from the classic libraries.',
  gradients: 'Blend gradients across your palette. Add and reposition stops, switch between linear, radial and conic, then copy the CSS in one click.',
}

export default function ColorStudio({ onCopy, toast }) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const { rounding } = useAppearance()
  const { design, setPalette, setStates, setTints, setGradient, saveProject, projects, loadProject, overwriteProject, canSaveProjects } = useProject()

  const [undoToast, setUndoToast] = useState(null)
  const undoTimerRef = useRef(null)
  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimerRef.current)
    setUndoToast(null)
  }, [])

  const [baseColor, setBaseColor] = useState(() => design?.palette?.base || '#2563EB')
  const [harmony] = useState(() => design?.palette?.harmony || 'auto')
  // Engine selector — 'auto' (HCT/Material-3 tonal) is the Slice-1 default and the
  // only mode wired so far. The Auto/HSL toggle UI is a later slice; we read+persist
  // `mode` now (so the value round-trips through ProjectContext) but don't expose a
  // setter until that toggle exists. Add `setMode` back when the toggle lands.
  const [mode] = useState(() => design?.palette?.mode || 'auto')
  const [globalAdjust] = useState(() => design?.palette?.globalAdjust || { h: 0, s: 0, b: 0, temp: 0 })
  const [extraColors, setExtraColors] = useState(() => design?.palette?.extraColors || [])
  // Reconcile the incoming palette against this studio's base+harmony model.
  // The Palette Builder (and project loads / brand + variation picks) persist the
  // full, authoritative palette in `colors`, but describe the five roles ONLY
  // there — not via base+harmony, which can't reproduce a brand or hand-authored
  // palette. Without this, a handed-off Apple/variation palette would be rebuilt
  // from just its first colour + analogous (and then written back, corrupting the
  // shared state). Pin any role the harmony generator wouldn't regenerate as an
  // override so the palette survives the tool switch. Skipped when a global-adjust
  // lens is baked into `colors` (the studio's own base+harmony+adjust round-trip
  // is already faithful, and pinning the adjusted colours would double-apply it).
  const [overrides, setOverrides] = useState(() => {
    const p = design?.palette || {}
    const stored = p.overrides || {}
    const full = Array.isArray(p.colors) ? p.colors : null
    const adj = p.globalAdjust
    const zeroAdj = !adj || (!adj.h && !adj.s && !adj.b && !adj.temp)
    if (!full || full.length < 2 || !zeroAdj) return stored
    const gen = generateHarmony(p.base || '#2563EB', p.harmony || 'auto')
    const merged = { ...stored }
    for (let i = 0; i < gen.length; i++) {
      const c = full[i]
      if (c && gen[i] && !merged[i] && c.toUpperCase() !== gen[i].toUpperCase()) merged[i] = c
    }
    return merged
  })
  // A project saved before `pending` existed carries four keys. stateColors is
  // read by JSON.stringify equality (activeStateBundle) and by Object.entries
  // (the ramps, the CSS, the export, the localStorage cache), so a missing key
  // would drop the role from all five AND pin the tray to "Custom mix" forever.
  // Seed from the default bundle and let the saved values win.
  const [stateColors, setStateColors] = useState(
    () => ({ ...STATE_BUNDLES[0].config, ...(design?.states || {}) }),
  )
  const [activeColorIdx] = useState(() => design?.palette?.activeIdx || 0)
  const [locked] = useState(() => new Set(design?.palette?.locked || []))
  const [cbMode] = useState('normal')  // 'normal' | one of CB_MODES

  // Tint-ramp tuning. The standalone Tints section (with its sliders) folded
  // into the palette builder's per-card tonal undersides in Slice 1; these
  // values still drive tintScale/allTintScales (used by Systems + exports), so
  // they persist at their saved/default settings until a later slice re-exposes
  // controls for them.
  const lumBias = design?.tints?.lumBias ?? 82
  const satDecay = design?.tints?.satDecay ?? 12
  const oled = design?.tints?.oled ?? true

  const [gradStops, setGradStops] = useState(() => design?.gradient?.stops || [{ color: null, position: 0 }, { color: null, position: 100 }])
  const [gradAngle, setGradAngle] = useState(() => design?.gradient?.angle ?? 135)
  const [gradType, setGradType] = useState(() => design?.gradient?.type || 'Linear')

  const SECTIONS = useMemo(() => [
    { id: 'palette', label: 'Palette' },
    { id: 'states', label: 'States' },
    { id: 'systems', label: 'Systems' },
    { id: 'gradients', label: 'Gradients' },
    { id: 'visualizer', label: 'Visualizer' },
  ], [])
  const [collapsed, setCollapsed] = useState({})
  const [activeSection, setActiveSection] = useState('palette')
  const toggleCollapse = useCallback((id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] })), [])

  // ── Focused single-tool view ──
  // Each colour tool reads as its own page: expand ONLY the target section,
  // collapse every sibling, then smooth-scroll to it. The shared palette still
  // lives one expand away, so the "stays in sync" core value is never lost.
  // Used by both the ?tool= deep-link handler and the "More colour tools" footer.
  const focusSection = useCallback((sectionId) => {
    setCollapsed(SECTIONS.reduce((acc, s) => { acc[s.id] = s.id !== sectionId; return acc }, {}))
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [SECTIONS])

  // ── Discover hand-off: ?preset=<slug>&tab=gradient ──
  // When the user picks "Use in Gradient Generator" from Discover, we arrive
  // with a preset slug. Match it against GRAD_PRESETS by slugified name, apply
  // it, expand + scroll to the gradients section, toast, then strip the params
  // (replace) so a refresh/back doesn't silently re-apply it. One-shot.
  const [searchParams, setSearchParams] = useSearchParams()
  const presetAppliedRef = useRef(false)
  useEffect(() => {
    if (presetAppliedRef.current) return
    const presetSlug = searchParams.get('preset')
    if (!presetSlug && searchParams.get('tab') !== 'gradient') return
    presetAppliedRef.current = true
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const preset = presetSlug ? GRAD_PRESETS.find(p => slugify(p.n) === presetSlug) : null
    if (preset) {
      setGradStops(preset.stops.map(s => ({ color: s.color, position: s.pos })))
      setGradAngle(preset.angle)
      setGradType(preset.type)
    }
    setCollapsed(prev => ({ ...prev, gradients: false }))
    requestAnimationFrame(() => {
      document.getElementById('gradients')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    if (toast) toast(preset ? 'Loaded from Discover' : 'Opened in Gradient Generator')
    // Strip the hand-off params without adding a history entry.
    const next = new URLSearchParams(searchParams)
    next.delete('preset'); next.delete('tab'); next.delete('from')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, toast])

  // ── Route focus: the solo colour tool routes ──
  // The section tools (palette / semantic / ui / gradient) are real routes that
  // mount THIS studio as a true standalone page: ONLY their section renders
  // (soloSection), the pill nav is hidden, and the page title becomes the
  // tool's own. The colour category home keeps the full merged studio. Tracked
  // by tool id (not one-shot) — the dispatcher renders the same element type
  // for every colour route, so switching tools in the nav re-runs this without
  // remounting.
  //
  // Resolved through toolTree, NEVER by slicing a segment out of the pathname.
  // This used to read the SECOND path segment and treat it as the tool id — an
  // assumption that only held while every colour tool sat under one parent, and
  // that the /create/<pagetitle> flattening breaks. CREATE_GROUPS is the table
  // the router itself is built from, so asking it is the only reading that
  // cannot go stale the next time a URL moves.
  const { pathname } = useLocation()
  const { tool: routeTool, isHome: onCategoryHome } = resolveTool(pathname)
  const pathSeg = onCategoryHome ? null : routeTool?.id || null
  const soloSection = pathSeg ? (PATH_TO_SECTION[pathSeg] || 'palette') : null
  const pathToolRef = useRef(null)
  useEffect(() => {
    if (!pathSeg) {
      // Back on /create/color proper: reopen everything so the merged studio is whole.
      if (pathToolRef.current) { pathToolRef.current = null; setCollapsed({}) }
      return
    }
    if (pathSeg === pathToolRef.current) return
    pathToolRef.current = pathSeg
    // Solo routes render ONLY their section — no siblings to collapse, and the
    // hero IS the top of the page, so the merged-studio collapse-and-scroll
    // (focusSection) would only scroll the fresh hero out of view. Clear any
    // collapse state and let the router's scroll-to-top handle position.
    setCollapsed({})
  }, [pathSeg])

  // ── Nav deep-link: ?tool=<id> (legacy) ──
  // Old external links still arrive as /create/color?tool=<id>; keep honouring them.
  // Same focus behaviour, then strip the param. One-shot, with its own ref so it
  // never fights the preset/tab handler above. contrast + tint now live on their
  // own pages → their legacy ids fall back to the palette section.
  const toolAppliedRef = useRef(false)
  useEffect(() => {
    if (toolAppliedRef.current) return
    const tool = searchParams.get('tool')
    if (!tool) return
    toolAppliedRef.current = true
    const TOOL_TO_SECTION = {
      palette: 'palette',
      gradient: 'gradients',
      semantic: 'states',
      'ui-colour': 'systems',
      contrast: 'palette',
      tint: 'palette',
    }
    const sectionId = TOOL_TO_SECTION[tool] || 'palette'
    focusSection(sectionId)
    const next = new URLSearchParams(searchParams)
    next.delete('tool')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, focusSection])

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { setActiveSection(entry.target.id); break }
      }
    }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [SECTIONS])

  // ── Pill-nav sliding thumb (CS#2/2.1) ──
  // The thumb is positioned/sized from a live measure of the active button
  // (offsetLeft/offsetWidth) so it fits any label width at any zoom/font state.
  // We set CSS custom props imperatively on the thumb ref (NOT a JSX inline
  // style attribute) to satisfy the no-inline-styles rule.
  const navRef = useRef(null)
  const thumbRef = useRef(null)
  const itemRefs = useRef({})
  const measureThumb = useCallback(() => {
    const el = itemRefs.current[activeSection]
    const thumb = thumbRef.current
    if (!el || !thumb) return
    thumb.style.setProperty('--cs-thumb-x', el.offsetLeft + 'px')
    thumb.style.setProperty('--cs-thumb-w', el.offsetWidth + 'px')
  }, [activeSection])
  useEffect(() => {
    measureThumb()
    // On ≤768 the rail scrolls; centre the active item then re-measure once it settles.
    const el = itemRefs.current[activeSection]
    if (el && navRef.current && navRef.current.scrollWidth > navRef.current.clientWidth) {
      el.scrollIntoView({ inline: 'center', block: 'nearest' })
      requestAnimationFrame(() => requestAnimationFrame(measureThumb))
    }
  }, [activeSection, measureThumb])
  useEffect(() => {
    measureThumb()
    // Outfit loads after first paint and shifts label widths — re-measure then.
    document.fonts?.ready.then(measureThumb).catch(() => {})
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureThumb) : null
    if (ro && navRef.current) ro.observe(navRef.current)
    window.addEventListener('resize', measureThumb)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', measureThumb)
    }
  }, [measureThumb])

  // Memoised on its scalar inputs so the array identity is stable across unrelated
  // renders — otherwise the whole downstream pipeline (baseColors→allColors→cbColors
  // →cbClash, incl. applyAdjust/simCvd per swatch) would recompute on every state
  // change (menus, toasts). generateHarmony is pure for a given (base, harmony).
  const colors = useMemo(() => generateHarmony(baseColor, harmony), [baseColor, harmony])
  // Per-index manual overrides applied on top of the harmony-generated colours.
  const resolvedColors = useMemo(() => colors.map((c, i) => overrides[i] || c), [colors, overrides])
  // baseColors = the RAW palette (generator + overrides + extras). All write-back
  // handlers (drag/edit/remove/randomise) operate on THIS — the global adjust is a
  // non-destructive lens layered on top for display/export only.
  const baseColors = useMemo(() => [...resolvedColors, ...extraColors], [resolvedColors, extraColors])
  // allColors = baseColors through the global-adjust lens. applyAdjust returns the
  // same array reference when the adjust is zeroed (identity), so every downstream
  // consumer/export is untouched until a slider moves.
  const allColors = useMemo(() => applyAdjust(baseColors, globalAdjust), [baseColors, globalAdjust])

  // ── Colour-vision lens (CS#3.9, §4.C) ──
  // A pure presentation lens over allColors — NEVER mutates the source. When a
  // CVD mode is active the rail backgrounds render cbColors[i]; the hex LABELS
  // always render the true allColors[i]. simCvd never throws (returns input hex
  // on bad data), so a swatch can never go blank.
  const cbColors = useMemo(
    () => (cbMode === 'normal' ? allColors : allColors.map(c => simCvd(c, cbMode))),
    [allColors, cbMode]
  )
  // Confusion-pair heuristic (FREE premium touch): any two simulated swatches
  // within ≈28/255 Euclidean RGB distance are flagged as hard to tell apart for
  // this vision type. Returns a Set of swatch indices in any clashing pair.
  const cbClash = useMemo(() => {
    const out = new Set()
    if (cbMode === 'normal') return out
    const rgbs = cbColors.map(hexToRgb)
    for (let i = 0; i < rgbs.length; i++) {
      for (let j = i + 1; j < rgbs.length; j++) {
        const dr = rgbs[i][0] - rgbs[j][0], dg = rgbs[i][1] - rgbs[j][1], db = rgbs[i][2] - rgbs[j][2]
        if (Math.sqrt(dr * dr + dg * dg + db * db) <= 28) { out.add(i); out.add(j) }
      }
    }
    return out
  }, [cbColors, cbMode])

  // CB segmented-toggle sliding thumb — same measure technique as the page nav
  // (DRY: third use of the pattern). Sets --cs-cb-x / --cs-cb-w on the thumb ref.
  const cbBarRef = useRef(null)
  const cbThumbRef = useRef(null)
  const cbSegRefs = useRef({})
  const measureCbThumb = useCallback(() => {
    const el = cbSegRefs.current[cbMode]
    const thumb = cbThumbRef.current
    if (!el || !thumb) return
    thumb.style.setProperty('--cs-cb-x', el.offsetLeft + 'px')
    thumb.style.setProperty('--cs-cb-w', el.offsetWidth + 'px')
  }, [cbMode])
  useLayoutEffect(() => { measureCbThumb() }, [measureCbThumb])
  useEffect(() => {
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureCbThumb) : null
    if (ro && cbBarRef.current) ro.observe(cbBarRef.current)
    window.addEventListener('resize', measureCbThumb)
    document.fonts?.ready.then(measureCbThumb).catch(() => {})
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', measureCbThumb) }
  }, [measureCbThumb])

  // ── Free-tier 6-colour cap (CS#3.17) — single state-level chokepoint ──
  // Every palette-growth path (insert-between, manual hue-offset, custom pick,
  // brand-palette merge) funnels through these two helpers so the cap is enforced
  // in the reducer logic, not just the UI — it holds against a console caller, not
  // only a button click. PRO_MAX is the free ceiling on TOTAL swatches.
  const PRO_MAX = 8

  // Sync palette state to ProjectContext (full design persistence)
  useEffect(() => {
    setPalette({ base: baseColor, harmony, mode, globalAdjust, extraColors, overrides, activeIdx: activeColorIdx, colors: allColors, locked: [...locked] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony, mode, JSON.stringify(globalAdjust), extraColors, JSON.stringify(overrides), activeColorIdx, allColors.join(',')])

  useEffect(() => {
    setStates(stateColors)
    // Cache resolved state shades to localStorage so the global style-guide
    // export (in TopBar) can include them without needing STATE_PRESETS.
    try {
      const resolved = Object.fromEntries(
        Object.entries(stateColors).map(([state, sel]) => [state, resolveStateShades(state, sel)])
      )
      localStorage.setItem('vs-state-shades', JSON.stringify(resolved))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateColors])

  useEffect(() => {
    setGradient({ stops: gradStops, angle: gradAngle, type: gradType })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradStops, gradAngle, gradType])

  // Tonal randomise (CS#3.10). Default mode='auto' deals an HCT/Material-3 tonal
  // palette mapped to the 5 ROLES — accessible-by-construction. Locked swatches
  // survive. Murphy's-law: if the HCT solver throws, fall back to HSL random +
  // a non-blocking toast; never white-screen.
  const randomize = useCallback(() => {
    let fresh
    try {
      fresh = autoTonalPalette()
      if (!Array.isArray(fresh) || fresh.length < colors.length || fresh.some(c => !/^#[0-9a-f]{6}$/i.test(c))) {
        throw new Error('tonal palette invalid')
      }
    } catch {
      fresh = colors.map(() => hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30)))
      toast?.('Colour engine fell back to a simple random palette')
    }

    if (!locked.has(0)) setBaseColor(fresh[0])
    setOverrides(prev => {
      const next = { ...prev }
      for (let i = 1; i < colors.length; i++) {
        if (locked.has(i)) next[i] = baseColors[i]       // keep the locked colour
        else next[i] = fresh[i] || hslToHex(Math.floor(Math.random() * 360), 60, 55)
      }
      return next
    })
    setExtraColors(prev => prev.map((c, i) => {
      const globalIdx = colors.length + i
      if (locked.has(globalIdx)) return c
      return hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    }))
  }, [locked, colors, baseColors, toast])

  // Deal a fresh Auto tonal palette once on mount (CS#3.8) — only if the user
  // hasn't carried in a saved/customised palette.
  const didInitRandomRef = useRef(false)
  useEffect(() => {
    if (didInitRandomRef.current) return
    didInitRandomRef.current = true
    const pristine = harmony === 'auto' && extraColors.length === 0 && Object.keys(overrides).length === 0 && (baseColor === '#2563EB' || baseColor === '#0051FF')
    if (pristine) randomize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Spacebar randomise belongs to the Palette Builder — don't fire it on a
    // standalone tool page where that section isn't even rendered (#39).
    if (soloSection && soloSection !== 'palette') return
    const onKey = (e) => {
      if (e.code !== 'Space') return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      e.preventDefault()
      randomize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [randomize, soloSection])

  const activeColor = allColors[activeColorIdx] || allColors[0]

  const tintScale = useMemo(() => {
    return generateTintScale({
      hex: activeColor, anchor: 5, hueShift: 0,
      satMin: -satDecay, satMax: satDecay / 2,
      lMin: oled ? 3 : 5, lMax: lumBias, mode: 'perceived',
    })
  }, [activeColor, lumBias, satDecay, oled])

  // Sync tints to ProjectContext
  useEffect(() => {
    setTints({ lumBias, satDecay, oled, scale: tintScale })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lumBias, satDecay, oled, tintScale.join(',')])

  const { registerExport, clearExport } = useExport()

  useEffect(() => {
    const labels = allColors.map((_, i) => ['Primary', 'Secondary', 'Accent', 'Neutral', 'Surface'][i] || `Colour ${i + 1}`)
    const stateLabels = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

    const buildVars = () => {
      const colorVars = allColors.map((c, i) => `  --color-${labels[i].toLowerCase().replace(/\s+/g, '-')}: ${c};`).join('\n')
      const tintVars = tintScale.map((c, i) => `  --tint-${i + 1}: ${c};`).join('\n')
      const stateVars = Object.entries(stateColors).map(([state, sel]) => {
        const shades = resolveStateShades(state, sel)
        return shades.map((c, i) => `  --${state}-${stateLabels[i]}: ${c};`).join('\n')
      }).join('\n')
      return { colorVars, tintVars, stateVars }
    }

    const generateHTML = () => {
      const { colorVars, tintVars, stateVars } = buildVars()
      const stateEntries = Object.entries(stateColors).map(([state, sel]) => ({
        name: state, shades: resolveStateShades(state, sel)
      }))
      const isDark = theme === 'dark'
      const rdMap = { none: ['0px', '0px'], subtle: ['6px', '4px'], default: ['12px', '8px'], pronounced: ['20px', '14px'] }
      const [rdVal, rdSVal] = rdMap[rounding] || rdMap.default
      return `<!DOCTYPE html>
<html lang="en" data-theme="${isDark ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System — UIL4B</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
:root {
${colorVars}
${tintVars}
${stateVars}
  --ds-bg: #faf9f7; --ds-bg2: #fff; --ds-text: #1a1a17; --ds-text2: #6b6b63;
  --ds-text3: #a3a299; --ds-border: rgba(0,0,0,.08); --ds-border2: rgba(0,0,0,.05);
  --ds-code-bg: #1a1a17; --ds-code-text: #e5e5dd;
  --ds-sidebar: rgba(255,255,255,.85); --ds-hover: rgba(0,0,0,.04);
  --ds-accent: #a78bfa; --ds-accent-bg: rgba(167,139,250,.1);
  --ds-radius: ${rdVal}; --ds-radius-s: ${rdSVal};
  --ds-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  --ds-shadow-lg: 0 4px 16px rgba(0,0,0,.06), 0 12px 40px rgba(0,0,0,.04);
  --ds-glass: rgba(255,255,255,.6);
}
[data-theme="dark"] {
  --ds-bg: #0d0d0c; --ds-bg2: #161614; --ds-text: #e8e8e2; --ds-text2: #8a8a80;
  --ds-text3: #555550; --ds-border: rgba(255,255,255,.07); --ds-border2: rgba(255,255,255,.04);
  --ds-code-bg: #111110; --ds-code-text: #d4d4cc;
  --ds-sidebar: rgba(17,17,15,.9); --ds-hover: rgba(255,255,255,.04);
  --ds-accent: #a78bfa; --ds-accent-bg: rgba(167,139,250,.12);
  --ds-shadow: 0 1px 3px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.15);
  --ds-shadow-lg: 0 4px 16px rgba(0,0,0,.3), 0 12px 40px rgba(0,0,0,.2);
  --ds-glass: rgba(255,255,255,.04);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: var(--ds-bg); color: var(--ds-text); line-height: 1.6; display: flex; min-height: 100vh; -webkit-font-smoothing: antialiased; }
.sidebar { position: fixed; top: 0; left: 0; width: 220px; height: 100vh; background: var(--ds-sidebar); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-right: 1px solid var(--ds-border); padding: 24px 0; overflow-y: auto; z-index: 10; }
.sidebar-brand { padding: 0 20px 20px; border-bottom: 1px solid var(--ds-border); margin-bottom: 12px; }
.sidebar-brand h3 { font-size: 14px; font-weight: 800; letter-spacing: -.02em; }
.sidebar-brand .brand-sub { font-size: 10px; color: var(--ds-accent); display: block; margin-top: 2px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.sidebar-brand .brand-date { font-size: 10px; color: var(--ds-text3); display: block; margin-top: 4px; }
.sidebar .nav-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ds-text3); padding: 16px 20px 6px; }
.sidebar a { display: block; padding: 8px 20px; font-size: 12px; font-weight: 500; color: var(--ds-text2); text-decoration: none; transition: all .15s; border-left: 2px solid transparent; }
.sidebar a:hover { color: var(--ds-text); background: var(--ds-hover); }
.sidebar a.active { color: var(--ds-accent); background: var(--ds-accent-bg); border-left-color: var(--ds-accent); }
.sidebar-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 20px; border-top: 1px solid var(--ds-border); }
.sidebar-footer span { font-size: 9px; color: var(--ds-text3); letter-spacing: .04em; }
.content { margin-left: 220px; flex: 1; padding: 48px 48px; max-width: 920px; }
header { margin-bottom: 48px; }
header .tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ds-accent); background: var(--ds-accent-bg); padding: 4px 12px; border-radius: 20px; margin-bottom: 14px; }
header h1 { font-size: 2.2rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.1; margin-bottom: 8px; }
header p { font-size: 14px; color: var(--ds-text2); line-height: 1.7; }
.meta { font-size: 11px; color: var(--ds-text3); margin-top: 8px; font-family: 'SF Mono', 'Fira Code', monospace; }
.format-bar { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
.fmt-btn { padding: 6px 14px; border: 1px solid var(--ds-border); background: var(--ds-glass); color: var(--ds-text2); font-size: 10px; font-weight: 600; letter-spacing: .04em; border-radius: var(--ds-radius-s); cursor: pointer; font-family: inherit; text-transform: uppercase; transition: all .2s cubic-bezier(.16,1,.3,1); }
.fmt-btn:hover { border-color: var(--ds-text2); color: var(--ds-text); transform: translateY(-1px); }
.fmt-btn.active { background: var(--ds-accent-bg); color: var(--ds-accent); border-color: rgba(167,139,250,.3); box-shadow: 0 0 0 1px rgba(167,139,250,.1); }
section { margin-bottom: 56px; scroll-margin-top: 24px; }
section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--ds-border2); color: var(--ds-text3); }
.color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.color-card { border-radius: var(--ds-radius); overflow: hidden; border: 1px solid var(--ds-border); background: var(--ds-bg2); cursor: pointer; transition: all .25s cubic-bezier(.16,1,.3,1); box-shadow: var(--ds-shadow); }
.color-card:hover { transform: translateY(-3px); box-shadow: var(--ds-shadow-lg); }
.color-swatch { height: 80px; position: relative; transition: filter .2s ease; }
.color-card:hover .color-swatch { filter: brightness(1.12) saturate(1.05); }
.color-swatch .swatch-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-weight: 600; color: #fff; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); opacity: 0; transition: opacity .2s; }
.color-card:hover .swatch-overlay { opacity: 1; }
.swatch-overlay .hex-val { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
.swatch-overlay .rgb-val { font-size: 9px; opacity: .85; font-family: 'SF Mono', 'Fira Code', monospace; }
.color-info { padding: 12px; }
.color-name { font-weight: 600; font-size: 12px; margin-bottom: 3px; }
.color-val { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: var(--ds-text2); }
.tint-row { display: flex; gap: 4px; }
.tint-swatch { flex: 1; height: 48px; border-radius: var(--ds-radius-s); cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; transition: transform .15s cubic-bezier(.16,1,.3,1); box-shadow: inset 0 -1px 0 rgba(0,0,0,.06); }
.tint-swatch:hover { transform: scaleY(1.2) translateY(-2px); }
.tint-swatch span { font-size: 7px; font-family: 'SF Mono', 'Fira Code', monospace; opacity: .5; }
.state-section { margin-bottom: 24px; }
.state-label { font-size: 11px; font-weight: 700; text-transform: capitalize; margin-bottom: 8px; letter-spacing: .02em; }
.state-row { display: flex; gap: 4px; }
.state-chip { flex: 1; height: 40px; border-radius: var(--ds-radius-s); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; cursor: pointer; transition: transform .15s cubic-bezier(.16,1,.3,1); }
.state-chip:hover { transform: scaleY(1.15) translateY(-1px); }
.state-chip span { font-size: 7px; font-family: 'SF Mono', 'Fira Code', monospace; opacity: .5; }
pre.code { background: var(--ds-code-bg); color: var(--ds-code-text); padding: 24px; border-radius: var(--ds-radius); overflow-x: auto; font-size: 11px; line-height: 1.9; border: 1px solid var(--ds-border); font-family: 'SF Mono', 'Fira Code', monospace; }
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--ds-text); color: var(--ds-bg); padding: 10px 20px; border-radius: var(--ds-radius-s); font-size: 12px; font-weight: 600; opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none; z-index: 100; transform: translateY(8px); box-shadow: var(--ds-shadow-lg); }
.toast.show { opacity: 1; transform: translateY(0); }
.theme-toggle { position: fixed; top: 16px; right: 16px; z-index: 20; background: var(--ds-glass); border: 1px solid var(--ds-border); backdrop-filter: blur(12px); padding: 8px 14px; border-radius: var(--ds-radius-s); cursor: pointer; font-size: 11px; font-weight: 600; color: var(--ds-text2); font-family: inherit; transition: all .15s; }
.theme-toggle:hover { color: var(--ds-text); border-color: var(--ds-text2); }
@media (max-width: 700px) {
  .sidebar { display: none; }
  .content { margin-left: 0; padding: 24px 16px; }
  .theme-toggle { top: 12px; right: 12px; }
}
  </style>
</head>
<body>
  <button class="theme-toggle" onclick="var t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;this.textContent=t==='dark'?'Light Mode':'Dark Mode'">${isDark ? 'Light Mode' : 'Dark Mode'}</button>
  <nav class="sidebar">
    <div class="sidebar-brand"><h3>UIL4B</h3><span class="brand-sub">Design System</span><span class="brand-date">Generated ${new Date().toLocaleDateString()}</span></div>
    <div class="nav-label">Sections</div>
    <a href="#colours" class="active">Colours</a>
    <a href="#tint-scale">Tint Scale</a>
    <a href="#state-colours">State Colours</a>
    <a href="#css-properties">CSS Properties</a>
    <div class="sidebar-footer"><span>Exported from UIL4B</span></div>
  </nav>
  <div class="content">
    <header>
      <span class="tag">Design System Export</span>
      <h1>Colour System</h1>
      <p>Complete colour palette, tint scale, and UI state colours with CSS custom properties ready for production.</p>
    </header>
    <div class="format-bar">
      <button class="fmt-btn active" data-fmt="hex">HEX</button>
      <button class="fmt-btn" data-fmt="rgb">RGB</button>
      <button class="fmt-btn" data-fmt="hsl">HSL</button>
      <button class="fmt-btn" data-fmt="hsb">HSB</button>
      <button class="fmt-btn" data-fmt="cmyk">CMYK</button>
      <button class="fmt-btn" data-fmt="oklch">OKLCH</button>
    </div>
    <section id="colours">
      <h2>Colours</h2>
      <div class="color-grid">
${allColors.map((c, i) => {
          const rgb = hexToRgb(c)
          return `        <div class="color-card" data-hex="${c}">
          <div class="color-swatch" style="background:${c}">
            <div class="swatch-overlay">
              <span class="hex-val">${c.toUpperCase()}</span>
              <span class="rgb-val">rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})</span>
            </div>
          </div>
          <div class="color-info">
            <div class="color-name">${labels[i]}</div>
            <div class="color-val">${c.toUpperCase()}</div>
          </div>
        </div>`
        }).join('\n')}
      </div>
    </section>
    <section id="tint-scale">
      <h2>Tint Scale</h2>
      <div class="tint-row">
${tintScale.map((c) => `        <div class="tint-swatch" data-hex="${c}" style="background:${c}"><span>${c.toUpperCase()}</span></div>`).join('\n')}
      </div>
    </section>
    <section id="state-colours">
      <h2>State Colours</h2>
${stateEntries.map(s => `      <div class="state-section">
        <div class="state-label">${s.name}</div>
        <div class="state-row">
${s.shades.map((c, i) => `          <div class="state-chip" data-hex="${c}" style="background:${c};color:${i < 5 ? '#000' : '#fff'}"><span>${stateLabels[i]}</span></div>`).join('\n')}
        </div>
      </div>`).join('\n')}
    </section>
    <section id="css-properties">
      <h2>CSS Custom Properties</h2>
      <pre class="code">:root {
${colorVars}
${tintVars}
${stateVars}
}</pre>
    </section>
  </div>
  <div class="toast" id="toast"></div>
  <script>
(function(){
  function hexToRgb(h){h=h.replace('#','');var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);return{r:r,g:g,b:b}}
  function hexToHsl(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,s=0,hh=0;if(mx!==mn){var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)hh=((g-b)/d+(g<b?6:0))/6;else if(mx===g)hh=((b-r)/d+2)/6;else hh=((r-g)/d+4)/6}return{h:Math.round(hh*360),s:Math.round(s*100),l:Math.round(l*100)}}
  function hexToHsb(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,s=mx===0?0:d/mx,v=mx,hh=0;if(d!==0){if(mx===r)hh=((g-b)/d+(g<b?6:0))/6;else if(mx===g)hh=((b-r)/d+2)/6;else hh=((r-g)/d+4)/6}return{h:Math.round(hh*360),s:Math.round(s*100),b:Math.round(v*100)}}
  function hexToCmyk(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255,k=1-Math.max(r,g,b);if(k===1)return{c:0,m:0,y:0,k:100};return{c:Math.round((1-r-k)/(1-k)*100),m:Math.round((1-g-k)/(1-k)*100),y:Math.round((1-b-k)/(1-k)*100),k:Math.round(k*100)}}
  function hexToOklch(h){var c=hexToRgb(h),r=c.r/255,g=c.g/255,b=c.b/255;function lin(v){return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}var lr=lin(r),lg=lin(g),lb=lin(b);var l=Math.cbrt(.4122214708*lr+.5363325363*lg+.0514459929*lb);var m=Math.cbrt(.2119034982*lr+.6806995451*lg+.1073969566*lb);var s=Math.cbrt(.0883024619*lr+.2164557872*lg+.6652917509*lb);var L=.2104542553*l+.793617785*m-.0040720468*s;var a=1.9779984951*l-2.428592205*m+.4505937099*s;var bb=.0259040371*l+.7827717662*m-.808675766*s;var C=Math.sqrt(a*a+bb*bb);var H=Math.atan2(bb,a)*180/Math.PI;if(H<0)H+=360;return{l:+(L*100).toFixed(1),c:+C.toFixed(3),h:+H.toFixed(1)}}
  function fmt(hex,f){hex=hex.trim();switch(f){case'hex':return hex.toUpperCase();case'rgb':var c=hexToRgb(hex);return'rgb('+c.r+', '+c.g+', '+c.b+')';case'hsl':var h=hexToHsl(hex);return'hsl('+h.h+', '+h.s+'%, '+h.l+'%)';case'hsb':var v=hexToHsb(hex);return'hsb('+v.h+', '+v.s+'%, '+v.b+'%)';case'cmyk':var k=hexToCmyk(hex);return'cmyk('+k.c+'%, '+k.m+'%, '+k.y+'%, '+k.k+'%)';case'oklch':var o=hexToOklch(hex);return'oklch('+o.l+'% '+o.c+' '+o.h+')';default:return hex.toUpperCase()}}
  var cur='hex';
  var toast=document.getElementById('toast');var tid;
  function show(m){toast.textContent=m;toast.classList.add('show');clearTimeout(tid);tid=setTimeout(function(){toast.classList.remove('show')},1800)}
  function update(){document.querySelectorAll('.color-val').forEach(function(el){var card=el.closest('[data-hex]');if(card)el.textContent=fmt(card.dataset.hex,cur)});document.querySelectorAll('.tint-swatch span, .state-chip span').forEach(function(el){var p=el.closest('[data-hex]');if(p)el.textContent=fmt(p.dataset.hex,cur)})}
  document.querySelectorAll('.fmt-btn').forEach(function(btn){btn.addEventListener('click',function(){cur=btn.dataset.fmt;document.querySelectorAll('.fmt-btn').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');update()})});
  document.querySelectorAll('[data-hex]').forEach(function(el){el.addEventListener('click',function(){var t=fmt(el.dataset.hex,cur);navigator.clipboard.writeText(t).then(function(){show('Copied: '+t)}).catch(function(){show('Copied: '+t)})})});
  document.querySelectorAll('.sidebar a').forEach(function(a){a.addEventListener('click',function(){document.querySelectorAll('.sidebar a').forEach(function(l){l.classList.remove('active')});a.classList.add('active')})});
  var sections=document.querySelectorAll('section[id]');var links=document.querySelectorAll('.sidebar a');
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id)})}})},{rootMargin:'-20% 0px -60% 0px'});
  sections.forEach(function(s){io.observe(s)});
})();
  </script>
</body>
</html>`
    }

    registerExport({
      label: 'Colour System',
      downloadHTML: () => {
        const html = generateHTML()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'colour-system.html'
        a.click()
        URL.revokeObjectURL(url)
      },
      downloadCSS: () => {
        const { colorVars, tintVars, stateVars } = buildVars()
        const css = `:root {\n${colorVars}\n\n${tintVars}\n\n${stateVars}\n}\n`
        const blob = new Blob([css], { type: 'text/css' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'colour-system.css'
        a.click()
        URL.revokeObjectURL(url)
      },
      copyCSS: () => {
        const { colorVars, tintVars, stateVars } = buildVars()
        onCopy(`:root {\n${colorVars}\n\n${tintVars}\n\n${stateVars}\n}`)
      },
    })

    return () => clearExport()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColors.join(','), tintScale.join(','), JSON.stringify(stateColors), theme, rounding])



  // Colour System popup (CS#3.14, Slice 3) — replaced the old cs-add-menu dropdown.
  const [csysOpen, setCsysOpen] = useState(false)
  // Close on route change (the popup is anchored to a page-local trigger).
  useEffect(() => {
    if (!csysOpen) return
    const onPop = () => setCsysOpen(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [csysOpen])



  const [saveProjectName, setSaveProjectName] = useState('')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)







  // ── Long-press → bottom-sheet context menu (≤480, §4.A) ──
  // 450ms hold with a >10px move / scroll cancel. Touch only; right-click is the
  // desktop path. Refs (not state) so the timer never triggers a render mid-press.
  const lpTimer = useRef(null)
  // Unmount cleanup: a pending long-press would otherwise fire setCtxMenu on an
  // unmounted component (mirrors gapTimerRef/adjustRafRef cleanups).
  useEffect(() => () => clearTimeout(lpTimer.current), [])



  const gapTimerRef = useRef(null)
  useEffect(() => () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current) }, [])

  // Global-adjust slider write — rAF-throttled so a fast drag coalesces to one
  // state update per frame (<16ms), avoiding re-render thrash on the rail.
  const adjustRafRef = useRef(null)
  useEffect(() => () => { if (adjustRafRef.current) cancelAnimationFrame(adjustRafRef.current) }, [])



  const stateCSS = Object.entries(stateColors).map(([state, sel]) => {
    const shades = resolveStateShades(state, sel)
    return shades.map((c, i) => `  --color-${state}-${STATE_LABELS[i]}: ${c};`).join('\n')
  }).join('\n')
  // One source for "how many roles / how many tokens", so the hero strip, the
  // section header and the handoff button cannot drift apart again.
  const stateRoleIds = Object.keys(STATE_META)
  const stateTokenCount = stateRoleIds.length * STATE_LABELS.length
  const activeStateBundle = STATE_BUNDLES.find(
    (bundle) => JSON.stringify(stateColors) === JSON.stringify(bundle.config),
  )
  const activeStateBundleIndex = STATE_BUNDLES.findIndex(
    (bundle) => JSON.stringify(stateColors) === JSON.stringify(bundle.config),
  )
  const handleStateBundleKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const last = STATE_BUNDLES.length - 1
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index - 1 + STATE_BUNDLES.length) % STATE_BUNDLES.length
          : (index + 1) % STATE_BUNDLES.length
    setStateColors(STATE_BUNDLES[nextIndex].config)
    requestAnimationFrame(() => document.getElementById(`stc-bundle-${nextIndex}`)?.focus())
  }
  const statePreview = Object.fromEntries(
    Object.entries(stateColors).map(([state, selection]) => {
      const shades = resolveStateShades(state, selection)
      return [state, sceneColours(shades)]
    }),
  )

  // "Custom" semantic-hue helpers (Cluster F). Switching a role to Custom seeds
  // the slider at its canonical hue; pasting a hex rotates the pasted hue into
  // the role's arc and clamps it (imports any brand colour, still legible).
  const setCustomHue = (state, hue) => setStateColors({ ...stateColors, [state]: { custom: Math.round(hue) } })
  const applyHexToArc = (state, raw) => {
    const hex = (raw || '').trim().replace(/^#?/, '#')
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false
    const arc = ROLE_ARCS[state]
    const mid = (arc.lo + arc.hi) / 2
    let h = hexToHsl(hex)[0]
    while (h - mid > 180) h -= 360
    while (h - mid < -180) h += 360
    setCustomHue(state, Math.max(arc.lo, Math.min(arc.hi, h)))
    return true
  }
  const copyStateTokens = () => onCopy(`:root {\n${stateCSS}\n}`)

  return (
    <div className="sec">
      {/* THE SOLO TOOL HEADER. The four colour tools ran TWO hero languages: the
          Tint Scale Generator (.tt-hero) and the Gradient Generator (.ggn-head)
          both open with an eyebrow, a large serif title, a description and the
          page's own actions, then a live status strip that reports the tool's
          current state in four facts. Semantic Colours and the Contrast Checker
          were still on `.sec-h`, the site-wide section header, which has no
          actions and no status and says nothing about the tool you are in.

          This is convergence on the shape two of the four already shipped, not a
          fifth pattern. `.sec-h` itself is untouched — it is site-wide, and
          restyling it here would reach every page that uses it. */}
      <div className={soloSection ? 'stc-hero' : 'sec-h'}>
        <div className={soloSection ? 'stc-hero-id' : undefined}>
          <div className={soloSection ? 'stc-hero-eyebrow' : 'sec-h-eyebrow'}>{soloSection ? 'Create / Colour' : 'Colour'}</div>
          <h1>{soloSection ? SOLO_TITLES[soloSection] : t('color.title')}</h1>
          <p>{soloSection ? SOLO_DESC[soloSection] : t('tools.colorStudio.description')}</p>
        </div>
        {soloSection === 'states' && (
          <div className="stc-hero-actions">
            <button type="button" className="stc-copy-btn" onClick={copyStateTokens}>Copy all tokens</button>
          </div>
        )}
        {canSaveProjects && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center', position: 'sticky', bottom: 16, zIndex: 20, background: 'var(--card)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--warm-shadow-lg)' }}>
            <button className="btn btn-accent btn-s" onClick={() => setSaveMenuOpen(!saveMenuOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add to Project
            </button>
            {projects.length > 0 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>Load:</span>
                {projects.slice(-5).map(p => (
                  <button key={p.id} className="btn btn-s" onClick={() => { loadProject(p.id); toast?.('Loaded: ' + p.name) }}
                    style={{ padding: '3px 10px', fontSize: 10 }}
                  >{p.name}</button>
                ))}
              </div>
            )}
            {saveMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--warm-shadow-lg)', padding: 14, marginTop: 4, width: 280 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Add current design to project</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" value={saveProjectName} onChange={e => setSaveProjectName(e.target.value)}
                    placeholder="Project name..." style={{ flex: 1, fontSize: 12 }}
                    onKeyDown={e => { if (e.key === 'Enter' && saveProjectName.trim()) { try { saveProject(saveProjectName); setSaveProjectName(''); setSaveMenuOpen(false); toast?.('Project saved') } catch (err) { toast?.(err.message || 'Couldn’t save') } } }}
                  />
                  <button className="btn btn-accent btn-s" onClick={() => { if (saveProjectName.trim()) { try { saveProject(saveProjectName); setSaveProjectName(''); setSaveMenuOpen(false); toast?.('Project saved') } catch (err) { toast?.(err.message || 'Couldn’t save') } } }}
                    style={{ padding: '4px 12px', fontSize: 11 }}>Save</button>
                </div>
                {projects.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginTop: 12, marginBottom: 6 }}>Overwrite existing</div>
                    {projects.slice(-5).map(p => (
                      <button key={p.id} onClick={() => { overwriteProject(p.id); setSaveMenuOpen(false); toast?.('Updated: ' + p.name) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '6px 0', fontSize: 11, color: 'var(--t1)', cursor: 'pointer', fontFamily: 'var(--font)', borderBottom: '1px solid var(--border)' }}
                      >{p.name} <span style={{ fontSize: 9, color: 'var(--t3)' }}>{new Date(p.updatedAt).toLocaleDateString()}</span></button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* The live status strip the sibling colour tools carry (.ggn-status on the
          Gradient Generator, the stat row on the Tint Scale Generator): four
          facts about what the tool currently holds, so the header reports state
          rather than only naming the page. The bundle name was previously the
          only one of these on the page and it was buried in the section header
          below, next to the copy button. */}
      {soloSection === 'states' && (
        <div className="stc-status" aria-live="polite">
          <span><strong>{activeStateBundle?.name || 'Custom mix'}</strong> bundle</span>
          <span><strong>{stateRoleIds.length}</strong> state roles</span>
          <span><strong>{STATE_LABELS.length}</strong> stops per ramp</span>
          <span><strong>{stateTokenCount}</strong> canonical tokens</span>
        </div>
      )}

      {/* ═══ SECTION 2: UI STATE COLORS ═══ */}
      {(!soloSection || soloSection === 'states') && (
      <section id="states" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        {/* The solo page's copy of this header is gone: the bundle name is in the
            status strip and "Copy all tokens" is in the hero, so rendering it
            again here was the same two facts twice, 300px apart. The merged
            studio still needs it as a collapse control. */}
        {!soloSection && (
          <div className="cs-section-header stc-head" onClick={() => toggleCollapse('states')} style={{ marginBottom: collapsed.states ? 0 : 14 }}>
            <div className="stc-head-title">
              <svg className={`cs-chevron${collapsed.states ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Semantic Colours</h2>
            </div>
            <div className="stc-toolbar" onClick={e => e.stopPropagation()}>
              <div className="stc-toolbar-copy">
                <span className="stc-kicker">Semantic bundle</span>
                <span>{activeStateBundle?.name || 'Custom mix'} · {stateTokenCount} canonical tokens</span>
              </div>
              <button className="stc-copy-btn" onClick={copyStateTokens}>Copy all tokens</button>
            </div>
          </div>
        )}
        {(soloSection === 'states' || !collapsed.states) && <>
        <div className="stc-bundles" role="radiogroup" aria-label="Semantic colour bundle">
          {STATE_BUNDLES.map((bundle, bundleIndex) => {
            const selected = JSON.stringify(stateColors) === JSON.stringify(bundle.config)
            return (
              <button
                key={bundle.name}
                type="button"
                id={`stc-bundle-${bundleIndex}`}
                className={selected ? 'stc-bundle stc-bundle--on' : 'stc-bundle'}
                role="radio"
                aria-checked={selected}
                tabIndex={selected || (activeStateBundleIndex < 0 && bundleIndex === 0) ? 0 : -1}
                onClick={() => setStateColors(bundle.config)}
                onKeyDown={(event) => handleStateBundleKeyDown(event, bundleIndex)}
              >
                <span className="stc-bundle-top">
                  <strong>{bundle.name}</strong>
                  <span aria-hidden="true">{selected ? 'Selected' : 'Choose'}</span>
                </span>
                <span className="stc-bundle-swatches" aria-hidden="true">
                  {Object.entries(bundle.config).map(([role, index]) => (
                    <i key={role} ref={element => element?.style.setProperty('--stc-bundle-c', STATE_PRESETS[role][index].shades[5])} />
                  ))}
                </span>
                <small>{bundle.desc}</small>
              </button>
            )
          })}
        </div>
        {Object.entries(STATE_PRESETS).map(([state, presets]) => {
          const sel = stateColors[state]
          // NB: coerce to a real boolean. `sel` is 0 for the default preset of
          // several states, and a bare `sel && …` short-circuits to the number 0
          // — which then leaks as a stray "0" via `{isCustom && …}` below.
          const isCustom = !!(sel && typeof sel === 'object' && Number.isFinite(sel.custom))
          const shades = resolveStateShades(state, sel)
          const arc = ROLE_ARCS[state]
          return (
            <div key={state} className="stc-role">
              <div className="stc-role-head">
                <div className="stc-role-id">
                  <span className="stc-role-cue" aria-hidden="true">{STATE_META[state].cue}</span>
                  <span>
                    <strong className="stc-role-name">{STATE_META[state].label}</strong>
                    <small>{STATE_META[state].intent}</small>
                  </span>
                </div>
                <div className="stc-role-presets">
                  {presets.map((p, pi) => (
                    <button key={p.name} onClick={() => setStateColors({ ...stateColors, [state]: pi })}
                      className={`pt-t${!isCustom && pi === sel ? ' on' : ''}`}
                    ><span className="state-preset-full">{p.name}</span><span className="state-preset-short">{p.name === 'Tailwind' ? 'TW' : p.name}</span></button>
                  ))}
                  <button
                    onClick={() => (isCustom ? setStateColors({ ...stateColors, [state]: STATE_BUNDLES[0].config[state] }) : setCustomHue(state, arc.canonical))}
                    className={`pt-t${isCustom ? ' on' : ''}`} aria-pressed={isCustom}
                  >Custom</button>
                </div>
              </div>
              {isCustom && (() => {
                const [, refS, refL] = hexToHsl(STATE_REF_HEX[state])
                const norm = h => ((h % 360) + 360) % 360
                const at = h => hslToHex(norm(h), refS, refL)
                const grad = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map(t => at(arc.lo + t * (arc.hi - arc.lo))).join(', ')})`
                const curName = describeColor(at(sel.custom))
                return (
                  <div className="cs-hue stc-hue" style={{ '--arc-grad': grad }}>
                    <div className="stc-hue-row">
                      <span className="stc-kicker">Hue</span>
                      <input type="range" className="cs-hue-slider"
                        min={Math.round(arc.lo)} max={Math.round(arc.hi)} step="1" value={sel.custom}
                        aria-label={`${state} custom hue`} aria-valuetext={curName}
                        onChange={e => setCustomHue(state, Number(e.target.value))}
                      />
                      <span className="stc-hue-val">{norm(sel.custom)}°</span>
                    </div>
                    <div className="cs-hue-ends">
                      <span>{describeColor(at(arc.lo))}</span>
                      <input type="text" className="cs-hue-hex" placeholder="Paste hex" maxLength={7}
                        aria-label={`Import a hex colour for ${state}`}
                        onKeyDown={e => {
                          if (e.key !== 'Enter') return
                          if (applyHexToArc(state, e.currentTarget.value)) e.currentTarget.value = ''
                          else toast?.('Enter a six-digit hex colour, for example #16A34A')
                        }}
                      />
                      <span>{describeColor(at(arc.hi))}</span>
                    </div>
                  </div>
                )
              })()}
              <div className="stc-ramp">
                {shades.map((shade, si) => (
                  <StateShade key={si} shade={shade} label={STATE_LABELS[si]} onCopy={onCopy} />
                ))}
              </div>
            </div>
          )
        })}

        <section className="stc-preview-section" aria-labelledby="stc-preview-title">
          <div className="stc-subhead">
            <div>
              <span className="stc-kicker">Live UI proof</span>
              <h2 id="stc-preview-title">See each role do its job</h2>
              <p>One component per role, on the same surfaces you ship on. Every scene paints from the ramp you chose above &mdash; change a role and it changes here. Each carries a symbol and a message, so meaning never depends on colour alone.</p>
            </div>
          </div>
          <div className="stc-preview-grid">
            {['Light interface', 'Dark interface'].map((themeLabel, themeIndex) => (
              <div className={themeIndex ? 'stc-preview stc-preview--dark' : 'stc-preview'} key={themeLabel}>
                <div className="stc-preview-head">
                  <strong>{themeLabel}</strong>
                  <span>{activeStateBundle?.name || 'Custom mix'} bundle</span>
                </div>
                <div className="stc-scene-list">
                  {SEMANTIC_SCENES.map(({ role, render }) => (
                    <div className="stc-scene" key={role} ref={semanticSceneRef(statePreview[role])}>
                      {render()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="stc-handoff" aria-labelledby="stc-handoff-title">
          <div className="stc-handoff-copy">
            <span className="stc-kicker">Developer handoff</span>
            <h2 id="stc-handoff-title">Canonical, predictable token names</h2>
            {/* Derived, not typed. The status strip above was already pinned to
                its real source; this block still said "40" and named info as the
                last role, both of which a fifth role makes false. */}
            <p>Each role exports from <code>--color-{stateRoleIds[0]}-{STATE_LABELS[0]}</code> through <code>--color-{stateRoleIds[stateRoleIds.length - 1]}-{STATE_LABELS[STATE_LABELS.length - 1]}</code>, ready for CSS or a token pipeline.</p>
            <button type="button" className="stc-copy-btn" onClick={copyStateTokens}>Copy {stateTokenCount} CSS variables</button>
          </div>
          <pre className="stc-code" tabIndex="0"><code>{`:root {\n${stateCSS}\n}`}</code></pre>
        </section>

        {/* The "Next in the workflow" nav that used to sit here is gone. It
            offered contrast, tint and palette - a strict SUBSET of the "More
            colour tools" footer ~200px below it, which offers those three plus
            gradient. Two navigation blocks that close together, one wholly
            contained in the other, is a choice the reader has to make twice.
            Its editorial line survives as the footer's lead, so the sequencing
            advice is kept and only the duplicate destinations are dropped. */}
        </>}
      </section>
      )}

      {/* ── More colour tools — links to every sibling tool's own page ──
          Section tools re-enter this studio focused on their section (the
          pathname effect handles it, no remount); tint + contrast navigate to
          their standalone pages. */}
      <nav className="cs-tools-footer" aria-label="More colour tools">
        <h2 className="cs-tools-footer-title">More colour tools</h2>
        {soloSection === 'states' && (
          <p className="cs-tools-footer-lead">Validate the states, then connect them to the rest of your interface foundation.</p>
        )}
        <div className="cs-tools-footer-grid">
          {/* Never link a page to itself — filter the tool you're already on. */}
          {COLOUR_TOOLS.filter(tool => tool.route !== pathname).map(tool => (
            <NavLink
              key={tool.id}
              to={tool.route}
              className="cs-tools-footer-link"
            >
              <strong>{tool.label}</strong>
              <span>{tool.desc}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Flow CTA: Next step → Typography ── */}
      <div className="cs-next-step">
        <NavLink to="/create/font-pair" className="cs-next-link">
          <span>Next step</span>
          <strong>Continue to Typography</strong>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </NavLink>
      </div>
      <UIKitGuide step="color" />

      {undoToast && (
        <div className="cs-undo-toast">
          <span>{undoToast.message}</span>
          <button onClick={() => { undoToast.undoFn(); dismissUndo() }}>Undo</button>
          <button className="cs-undo-dismiss" onClick={dismissUndo}>&times;</button>
        </div>
      )}
    </div>
  )
}
