import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { generateHarmony, generateTintScale, textColorForBg, hslToHex, hexToHsl, contrastRatio, hexToRgb, mixHex, describeColor, T_LABELS, autoTonalPalette, tonalRamp, applyAdjust, hexToHct, simCvd, fixForeground, derivePreviewRoles, roleHueArcs, semanticRamp } from '../utils/colors'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useI18n } from '../contexts/I18nContext'
import { trackColourPick } from '../utils/analytics'
import { useExport } from '../contexts/ExportContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
import UIKitGuide from '../components/UIKitGuide'
import SnapSlider from '../components/SnapSlider'
import ShuffleIcon from '../components/ShuffleIcon'
import { extractColorPointsFromImage } from '../utils/extractColors'
import { COLOR_LIBRARIES, findClosestNamedColor } from '../data/namedColors'
import { resolveTool } from '../data/toolTree'

const HARMS = ['analogous', 'complement', 'triadic', 'split', 'tetradic', 'monochromatic', 'custom']
const HARM_LABELS = {
  analogous: 'Analogous', complement: 'Complementary', triadic: 'Triadic',
  split: 'Split Comp.', tetradic: 'Tetradic', monochromatic: 'Mono', custom: 'Custom',
}
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']

// Global-adjust sliders (CS#3.15). Each drives one field of globalAdjust; the
// whole palette is recomputed non-destructively via applyAdjust.
const ADJUST_FIELDS = [
  { key: 'h', label: 'Hue', min: -180, max: 180, unit: '°' },
  { key: 's', label: 'Saturation', min: -100, max: 100, unit: '%' },
  // "Tone" not "Brightness": this shifts HCT *tone*, not luminance — honest naming
  // for a HCT-native tool. The ±100 range maps to ±50 tone steps (see applyAdjust).
  { key: 'b', label: 'Tone', min: -100, max: 100, unit: '' },
  { key: 'temp', label: 'Temperature', min: -100, max: 100, unit: '' },
]

const BRANDS = [
  { n: 'Google', colors: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#1A1A1A'] },
  { n: 'Spotify', colors: ['#1DB954', '#191414', '#535353', '#B3B3B3', '#FFFFFF'] },
  { n: 'Stripe', colors: ['#635BFF', '#0A2540', '#00D4AA', '#7A73FF', '#FBFCFE'] },
  { n: 'Netflix', colors: ['#E50914', '#221F1F', '#B20710', '#F5F5F1', '#564D4D'] },
  { n: 'Discord', colors: ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#2C2F33'] },
  { n: 'Airbnb', colors: ['#FF5A5F', '#00A699', '#FC642D', '#767676', '#484848'] },
  { n: 'Slack', colors: ['#4A154B', '#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'] },
  { n: 'GitHub', colors: ['#24292F', '#0969DA', '#1F883D', '#8250DF', '#CF222E'] },
  { n: 'Linear', colors: ['#5E6AD2', '#1B1B25', '#F2F2F2', '#26B5CE', '#EB5757'] },
  { n: 'Figma', colors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE', '#0ACF83'] },
]

const DESIGN_SYSTEMS = [
  { n: 'Material Design', base: '#6750A4', colors: ['#6750A4', '#625B71', '#7D5260', '#B4C8E1', '#FFFBFE'] },
  { n: 'Tailwind CSS', base: '#0EA5E9', colors: ['#0EA5E9', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'] },
  { n: 'Apple HIG', base: '#007AFF', colors: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'] },
  { n: 'Vercel', base: '#000000', colors: ['#000000', '#FFFFFF', '#0070F3', '#7928CA', '#FF0080'] },
  { n: 'Linear', base: '#5E6AD2', colors: ['#5E6AD2', '#1B1B25', '#26B5CE', '#EB5757', '#F2F2F2'] },
  { n: 'Stripe', base: '#635BFF', colors: ['#635BFF', '#0A2540', '#00D4AA', '#FF7A00', '#FBFCFE'] },
]

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
}
const STATE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

const STATE_BUNDLES = [
  { name: 'Balanced', desc: 'Familiar, calm defaults for most product UI.', config: { success: 1, warning: 0, error: 0, info: 0 } },
  { name: 'Material', desc: 'Established Material state foundations.', config: { success: 4, warning: 4, error: 4, info: 4 } },
  { name: 'Vivid', desc: 'Higher chroma for expressive interfaces.', config: { success: 0, warning: 2, error: 1, info: 2 } },
  { name: 'Cool', desc: 'Teal, yellow, pink and sky emphasis.', config: { success: 2, warning: 1, error: 2, info: 1 } },
  { name: 'Warm', desc: 'Classic green, amber and red signals.', config: { success: 1, warning: 0, error: 0, info: 2 } },
  { name: 'Apple', desc: 'System colours aligned with Apple platforms.', config: { success: 3, warning: 3, error: 3, info: 3 } },
  { name: 'Tailwind', desc: 'Direct mapping to Tailwind colour ramps.', config: { success: 5, warning: 5, error: 5, info: 5 } },
]

const STATE_META = {
  success: { label: 'Success', cue: '✓', intent: 'Completed, connected or ready' },
  warning: { label: 'Warning', cue: '!', intent: 'Needs attention before continuing' },
  error: { label: 'Error', cue: '×', intent: 'Failed, destructive or blocked' },
  info: { label: 'Information', cue: 'i', intent: 'Helpful context or neutral update' },
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

const GRAD_TYPES = ['Linear', 'Radial', 'Conic']

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

// Small padlock used as the Pro affordance on gated controls.
function LockGlyph({ size = 11 }) {
  return (
    <svg className="cs-pro-lock-glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

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

function semanticExampleRef(colours) {
  return (element) => {
    if (!element) return
    element.style.setProperty('--stc-soft', colours.soft)
    element.style.setProperty('--stc-border', colours.border)
    element.style.setProperty('--stc-strong', colours.strong)
    element.style.setProperty('--stc-ink', colours.ink)
  }
}

function TintSwatch({ color, label, onCopy }) {
  const [hover, setHover] = useState(false)
  const fg = textColorForBg(color)
  const rgb = hover ? hexToRgb(color) : null
  return (
    <div onClick={() => onCopy(color)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      role="button" tabIndex={0} aria-label={`Copy ${color.toUpperCase()}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy(color) } }}
      style={{
        flex: 1, padding: '22px 0 10px', textAlign: 'center', background: color, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
        minHeight: 80, transition: 'filter .15s, transform .12s',
        filter: hover ? 'brightness(1.08)' : 'none',
        transform: hover ? 'scaleY(1.08)' : 'none',
      }}
    >
      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, color: fg, opacity: hover ? 1 : .7 }}>
        {label}
      </span>
      <span style={{ fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 600, color: fg, opacity: hover ? .9 : .5 }}>
        {color.toUpperCase().replace('#', '')}
      </span>
      {hover && rgb && (
        <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: fg, opacity: .5 }}>
          {rgb[0]},{rgb[1]},{rgb[2]}
        </span>
      )}
    </div>
  )
}

// ── Slice 2 surfaces ──────────────────────────────────────────────────────
// The Slice-1 ColorInfoPopup (centered modal, ci-* classes, gamma-space CVD,
// colorPsychology) is REPLACED by CtxMenu + SwatchPopup below. The old per-swatch
// Vision tab is superseded by the palette-wide CB overlay (§4.C); Usage/psychology
// is deferred to CS#5. CVD now runs on the linear-RGB Machado-2009 simCvd in
// colors.js — the old gamma-space matrices are gone.

// CVD modes for the palette-wide colour-vision lens (§4.C). value = simCvd() key.
const CB_MODES = [
  { value: 'normal', label: 'Normal', short: 'Normal', desc: 'True colour' },
  { value: 'protanopia', label: 'Protan', short: 'Prot', desc: 'Red-blind (protanopia)' },
  { value: 'deuteranopia', label: 'Deutan', short: 'Deut', desc: 'Green-blind (deuteranopia)' },
  { value: 'tritanopia', label: 'Tritan', short: 'Trit', desc: 'Blue-blind (tritanopia)' },
  { value: 'achromatopsia', label: 'Achroma', short: 'Achr', desc: 'Total colour-blindness (achromatopsia)' },
]
const CB_LABELS = Object.fromEntries(CB_MODES.map(m => [m.value, m.desc]))

// Small inline icons used by the context menu / popup, kept local (the rail's
// CopyIcon is reused where a copy glyph is needed).
function ChevronRight({ size = 14 }) {
  return <svg className="cs-ctx-arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
}

// ─── CONTEXT MENU (cs-ctx, §4.A) ───────────────────────────────────────────
// Right-click / long-press fast path. Portals to <body> (must escape the
// swatch's overflow:hidden). Desktop = floating at cursor with flip+clamp;
// ≤480px = bottom sheet (positioning handled in CSS via the media query).
function CtxMenu({ color, role, isExtra, isLocked, sheet, x, y, onCopy, onShades, onContrast, onEdit, onToggleLock, onRemove, onClose, restoreRef }) {
  const menuRef = useRef(null)
  const itemRefs = useRef([])
  const [active, setActive] = useState(0)

  // Build the item list (Remove only for extras). Each carries its handler and
  // whether it closes the menu on activation.
  const items = useMemo(() => {
    const list = [
      { key: 'copy', label: 'Copy', kbd: '⌘C', icon: <CopyIcon size={14} />, run: onCopy, closes: true },
      { key: 'shades', label: 'View shades', arrow: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18" /></svg>, run: onShades, closes: true },
      { key: 'contrast', label: 'Check contrast', arrow: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3v18" fill="currentColor" /></svg>, run: onContrast, closes: true },
      { key: 'edit', label: 'Edit colour…', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>, run: onEdit, closes: true },
      { key: 'lock', label: isLocked ? 'Unlock' : 'Lock', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" />{isLocked ? <path d="M7 11V7a5 5 0 0 1 10 0v4" /> : <path d="M7 11V7a5 5 0 0 1 9.9-1" />}</svg>, run: onToggleLock, closes: false },
    ]
    if (isExtra) list.push({ key: 'remove', label: 'Remove', danger: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>, run: onRemove, closes: true })
    return list
  }, [isExtra, isLocked, onCopy, onShades, onContrast, onEdit, onToggleLock, onRemove])

  const activate = useCallback((i) => {
    const it = items[i]
    if (!it) return
    it.run()
    if (it.closes) onClose()
  }, [items, onClose])

  // Flip + clamp at the cursor (desktop only; the sheet is positioned by CSS).
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el || sheet) return
    el.style.setProperty('--cs-ctx-chip', color)
    const w = el.offsetWidth, h = el.offsetHeight
    let nx = x, ny = y, origin = 'top left'
    if (x + w > window.innerWidth - 8) { nx = x - w; origin = 'top right' }
    if (y + h > window.innerHeight - 8) { ny = y - h; origin = origin === 'top right' ? 'bottom right' : 'bottom left' }
    nx = Math.max(8, Math.min(nx, window.innerWidth - w - 8))
    ny = Math.max(8, Math.min(ny, window.innerHeight - h - 8))
    el.style.setProperty('--cs-ctx-x', nx + 'px')
    el.style.setProperty('--cs-ctx-y', ny + 'px')
    el.style.setProperty('--cs-ctx-origin', origin)
  }, [x, y, sheet, color])

  // Set the live chip colour for the sheet variant (no flip maths there).
  useLayoutEffect(() => {
    if (sheet && menuRef.current) menuRef.current.style.setProperty('--cs-ctx-chip', color)
  }, [sheet, color])

  // Auto-focus the first item on open.
  useEffect(() => { itemRefs.current[0]?.focus() }, [])

  // Dismissal: outside-click, Esc, scroll, resize. Restore focus on unmount.
  useEffect(() => {
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose() }
    const onScroll = () => onClose()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      // Restore focus to the live anchor (owned by the parent, stable for the
      // menu's lifetime). Reading .current at cleanup is intentional.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      restoreRef?.current?.focus?.()
    }
  }, [onClose, restoreRef])

  const onKeyDown = (e) => {
    const n = items.length
    if (e.key === 'ArrowDown') { e.preventDefault(); const i = (active + 1) % n; setActive(i); itemRefs.current[i]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const i = (active - 1 + n) % n; setActive(i); itemRefs.current[i]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); itemRefs.current[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); itemRefs.current[n - 1]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      if (e.key === ' ' || e.key === 'Enter' || (e.key === 'ArrowRight' && items[active].arrow)) { e.preventDefault(); activate(active) }
    }
  }

  return createPortal(
    <div ref={menuRef} className={`cs-ctx${sheet ? ' cs-ctx-sheet' : ''}`} role="menu"
      aria-label={`${role} colour actions`} onKeyDown={onKeyDown}>
      <div className="cs-ctx-head" aria-hidden="true">
        <span className="cs-ctx-chip" />
        <span className="cs-ctx-role">{role}</span>
        <span className="cs-ctx-hex">{color.toUpperCase()}</span>
      </div>
      {items.map((it, i) => (
        <Fragment key={it.key}>
          {it.danger && <div className="cs-ctx-sep" role="separator" />}
          <button
            ref={el => (itemRefs.current[i] = el)}
            className={`cs-ctx-item${it.danger ? ' cs-ctx-danger' : ''}${active === i ? ' cs-ctx-active' : ''}`}
            role="menuitem" tabIndex={active === i ? 0 : -1}
            aria-label={it.label}
            onMouseEnter={() => setActive(i)}
            onClick={() => activate(i)}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.kbd && <span className="cs-ctx-kbd">{it.kbd}</span>}
            {it.arrow && <ChevronRight />}
          </button>
        </Fragment>
      ))}
    </div>,
    document.body
  )
}

// ─── SWATCH POPUP (cs-sw, §4.B) ────────────────────────────────────────────
// Deep path. 4 tabs: Values · Contrast · Shades · Edit. Desktop = anchored
// popover (no scrim, aria-modal=false). ≤480px = bottom sheet (scrim, modal).
// Tracks the swatch by INDEX; live colour derived from props each render.
const SW_TABS = [
  { id: 'values', label: 'Values' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'shades', label: 'Shades' },
  { id: 'edit', label: 'Edit' },
]

function gradeBadges(ratio) {
  // Returns the two-tier badge set (Normal text + Large text) for a contrast ratio.
  return [
    { label: 'Normal', cls: ratio >= 4.5 ? 'pass' : 'fail', tier: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail' },
    { label: 'Large', cls: ratio >= 3 ? 'pass' : 'fail', tier: ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'Fail' },
  ]
}

function SwatchPopup({ idx, color, role, anchorRect, isSheet, siblings, isLocked, adjustActive, baseValue, onClose, onCopy, onTab, initialTab, onReplace, onResetAdjust, recentEdits, restoreRef }) {
  const popRef = useRef(null)
  const bodyRef = useRef(null)
  const tabsRef = useRef(null)
  const tabRefs = useRef({})
  const underlineRef = useRef(null)
  const heroRef = useRef(null)
  const hexInputRef = useRef(null)
  const colorInputRef = useRef(null)
  const [tab, setTab] = useState(initialTab || 'values')
  const [copied, setCopied] = useState(null)
  const [hexDraft, setHexDraft] = useState(color.toUpperCase())
  const [hexErr, setHexErr] = useState(false)
  const commitTimer = useRef(null)
  const copyTimerRef = useRef(null)

  const fg = textColorForBg(color)
  const [r, g, b] = hexToRgb(color)
  const [hh, ss, ll] = hexToHsl(color)
  const [hctH, hctC, hctT] = hexToHct(color)
  const onWhite = contrastRatio(color, '#FFFFFF')
  const onBlack = contrastRatio(color, '#000000')
  const whiteText = contrastRatio('#FFFFFF', color)
  const blackText = contrastRatio('#000000', color)

  const valueRows = [
    ['HEX', color.toUpperCase()],
    ['RGB', `${r}, ${g}, ${b}`],
    ['HSL', `${hh}°, ${ss}%, ${ll}%`],
    ['HCT', `${Math.round(hctH)}°, ${Math.round(hctC)}, ${Math.round(hctT)}`],
  ]

  // Set dynamic colours via custom props on refs (no inline styles).
  useLayoutEffect(() => {
    heroRef.current?.style.setProperty('--cs-sw-bg', color)
    heroRef.current?.style.setProperty('--cs-sw-fg', fg)
  }, [color, fg])

  // Keep the hex draft in sync when the swatch colour changes from outside (e.g.
  // a shade-replace or Fix), unless the user is mid-edit in this field.
  useEffect(() => {
    if (document.activeElement !== hexInputRef.current) {
      setHexDraft(color.toUpperCase())
      setHexErr(false)
    }
  }, [color])

  // Tab underline measurement (sliding-pill, echoes the page nav).
  const measureUnderline = useCallback(() => {
    const el = tabRefs.current[tab]
    const u = underlineRef.current
    if (!el || !u) return
    u.style.setProperty('--cs-sw-tab-x', el.offsetLeft + 'px')
    u.style.setProperty('--cs-sw-tab-w', el.offsetWidth + 'px')
  }, [tab])
  useLayoutEffect(() => { measureUnderline() }, [measureUnderline])
  // Re-measure on viewport/tab-bar resize and late font load — the popup can stay
  // open across a resize, and the underline would otherwise misalign (mirrors the
  // page-nav thumb). useLayoutEffect for the initial sync; effect for the observer.
  useEffect(() => {
    document.fonts?.ready.then(measureUnderline).catch(() => {})
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureUnderline) : null
    if (ro && tabsRef.current) ro.observe(tabsRef.current)
    window.addEventListener('resize', measureUnderline)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', measureUnderline)
    }
  }, [measureUnderline])

  // Anchored positioning (desktop). Sheet positioning is CSS-only.
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el || isSheet || !anchorRect) return
    const w = el.offsetWidth, h = el.offsetHeight
    let x = anchorRect.left
    let y = anchorRect.bottom + 8
    if (y + h > window.innerHeight - 12) {
      const above = anchorRect.top - h - 8
      y = above >= 12 ? above : Math.max(12, (window.innerHeight - h) / 2)
    }
    x = Math.min(x, window.innerWidth - w - 12)
    x = Math.max(12, x)
    el.style.setProperty('--cs-sw-x', x + 'px')
    el.style.setProperty('--cs-sw-y', y + 'px')
  }, [anchorRect, isSheet, tab])

  // Focus management: focus the requested tab's first control / the hex input on
  // open. Focus trap while open. Restore focus to the swatch on close.
  useEffect(() => {
    if ((initialTab || tab) === 'edit') hexInputRef.current?.focus()
    else tabRefs.current[initialTab || 'values']?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = popRef.current?.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')
      if (!focusables || !focusables.length) return
      const list = Array.from(focusables).filter(n => !n.disabled && n.offsetParent !== null)
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const onDown = (e) => { if (popRef.current && !popRef.current.contains(e.target)) onClose() }
    const onScroll = (e) => {
      if (isSheet) return
      // Ignore scrolls originating inside the popup's own scrollable content
      // (the .cs-sw-body tab panel). A capture-phase window listener still
      // receives these with e.target set to the inner scroll node. A page
      // scroll has e.target === document (not contained → still closes).
      if (popRef.current && e?.target?.nodeType && popRef.current.contains(e.target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      // Restore focus to the live anchor (parent-owned, stable for the popup's
      // lifetime). Reading .current at cleanup is intentional.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      restoreRef?.current?.focus?.()
    }
  }, [onClose, isSheet, restoreRef])

  const selectTab = (id) => { setTab(id); onTab?.(id) }

  const copyValue = (key, value) => {
    onCopy(value)
    setCopied(key)
    // Store the handle so a rapid re-copy doesn't race two timers (mirrors commitTimer).
    clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(c => (c === key ? null : c)), 1100)
  }

  // Hex / rgb() validation + debounced commit (§4.D).
  const HEX_RE = /^#?[0-9a-fA-F]{6}$/
  const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  const tryParse = (raw) => {
    const s = raw.trim()
    if (HEX_RE.test(s)) return '#' + s.replace('#', '').toUpperCase()
    const m = s.match(RGB_RE)
    if (m) {
      const ch = [m[1], m[2], m[3]].map(v => Math.max(0, Math.min(255, parseInt(v, 10))))
      if (ch.some(v => v > 255)) return null
      return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    }
    return null
  }
  const onHexChange = (raw) => {
    setHexDraft(raw)
    clearTimeout(commitTimer.current)
    const parsed = tryParse(raw)
    if (!parsed) { setHexErr(raw.trim().length > 0); return }
    setHexErr(false)
    commitTimer.current = setTimeout(() => onReplace(parsed, 'edit'), 120)
  }
  useEffect(() => () => { clearTimeout(commitTimer.current); clearTimeout(copyTimerRef.current) }, [])

  const badge = (cls, tier) => <span className={`cs-sw-badge ${cls}`}>{tier}</span>

  // Mini contrast cell colours via custom props on a ref callback.
  const qcRef = (ground, sample) => (el) => {
    if (!el) return
    el.style.setProperty('--cs-qc-bg', ground)
    el.style.setProperty('--cs-qc-fg', sample)
    el.style.setProperty('--cs-qc-tx', textColorForBg(ground))
  }

  const shades = useMemo(() => tonalRamp(color, [10, 20, 30, 40, 50, 60, 70, 80, 90, 95]), [color])
  const TONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95]

  return (
    <div className={`cs-sw-overlay${isSheet ? ' cs-sw-sheet-overlay' : ''}`}>
      <div ref={popRef} className="cs-sw" role="dialog" aria-modal={isSheet ? 'true' : 'false'}
        aria-labelledby={`cs-sw-hex-${idx}`}>
        <button className="cs-sw-close" onClick={onClose} aria-label="Close">&times;</button>
        <div ref={heroRef} className="cs-sw-hero">
          <span className="cs-sw-role">{role}</span>
          <span className="cs-sw-name">{describeColor(color)}</span>
          <span className="cs-sw-hex" id={`cs-sw-hex-${idx}`}>{color.toUpperCase()}</span>
          <button className="cs-sw-edit-pill" onClick={() => selectTab('edit')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            Edit
          </button>
        </div>
        <div ref={tabsRef} className="cs-sw-tabs" role="tablist" aria-label="Colour details">
          {SW_TABS.map(t => (
            <button key={t.id} ref={el => (tabRefs.current[t.id] = el)}
              className={`cs-sw-tab${tab === t.id ? ' active' : ''}`}
              role="tab" id={`cs-sw-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`cs-sw-panel-${t.id}`}
              onClick={() => selectTab(t.id)}>{t.label}</button>
          ))}
          <span ref={underlineRef} className="cs-sw-tab-underline" aria-hidden="true" />
        </div>
        <div ref={bodyRef} className="cs-sw-body" role="tabpanel" id={`cs-sw-panel-${tab}`} aria-labelledby={`cs-sw-tab-${tab}`}>
          {tab === 'values' && (
            <>
              <div className="cs-sw-values">
                {valueRows.map(([label, val]) => (
                  <button key={label} className="cs-sw-val-row" onClick={() => copyValue(label, val)}>
                    <span className="cs-sw-val-label">{label}</span>
                    <span className="cs-sw-val-text">{val}</span>
                    {copied === label ? <span className="cs-sw-val-copied">Copied</span> : <CopyIcon size={12} />}
                  </button>
                ))}
              </div>
              <div className="cs-sw-quick">
                {[['#FFFFFF', onWhite], ['#000000', onBlack]].map(([ground, ratio]) => (
                  <div key={ground} className="cs-sw-qc" ref={qcRef(ground, color)}>
                    <span className="cs-sw-qc-aa">Aa</span>
                    <span className="cs-sw-qc-ratio">{ratio.toFixed(1)}:1</span>
                    {badge(ratio >= 4.5 ? 'pass' : ratio >= 3 ? 'warn' : 'fail', ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Lg' : 'Fail')}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'contrast' && (
            <div className="cs-sw-contrast">
              <div className="cs-sw-group-label">vs white &amp; black</div>
              <div className="cs-sw-cc-pair">
                {[['#FFFFFF', onWhite], ['#000000', onBlack]].map(([ground, ratio]) => (
                  <div key={ground} className="cs-sw-cc" ref={qcRef(ground, color)}>
                    <span className="cs-sw-cc-aa">Aa</span>
                    <span className="cs-sw-cc-ratio">{ratio.toFixed(2)}:1</span>
                    <div className="cs-sw-badges">
                      {gradeBadges(ratio).map(bd => <span key={bd.label} className={`cs-sw-badge ${bd.cls}`} title={`${bd.label} text`}>{bd.label[0]}: {bd.tier}</span>)}
                    </div>
                    {ratio < 4.5 && (() => {
                      // Compute once — fixForeground is an iterative HCT binary search;
                      // reuse the result for both the click handler and the label.
                      const fixed = fixForeground(color, ground, 4.5)
                      return (
                        <button className="cs-sw-fix" onClick={() => onReplace(fixed, 'fix')}>
                          Nudge to AA → {fixed.toUpperCase()}
                        </button>
                      )
                    })()}
                  </div>
                ))}
              </div>

              {siblings.length > 0 && (
                <>
                  <div className="cs-sw-group-label">vs palette siblings (UI ≥3:1)</div>
                  <div className="cs-sw-siblings">
                    {siblings.map(s => {
                      const ratio = contrastRatio(color, s.color)
                      return (
                        <div key={s.idx} className="cs-sw-sib-row">
                          <span className="cs-sw-sib-chip" ref={el => el && el.style.setProperty('--cs-sib', s.color)} />
                          <span className="cs-sw-sib-role">{s.role}</span>
                          <span className="cs-sw-sib-ratio">{ratio.toFixed(2)}:1</span>
                          {badge(ratio >= 3 ? 'pass' : 'fail', ratio >= 3 ? 'OK' : 'Low')}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <div className="cs-sw-group-label">text on this colour</div>
              <div className="cs-sw-siblings">
                {[['#FFFFFF', 'White text', whiteText], ['#000000', 'Black text', blackText]].map(([tc, label, ratio]) => (
                  <div key={tc} className="cs-sw-sib-row">
                    <span className="cs-sw-sib-chip" ref={el => el && el.style.setProperty('--cs-sib', tc)} />
                    <span className="cs-sw-sib-role">{label}</span>
                    <span className="cs-sw-sib-ratio">{ratio.toFixed(2)}:1</span>
                    {badge(ratio >= 4.5 ? 'pass' : ratio >= 3 ? 'warn' : 'fail', ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Lg' : 'Fail')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'shades' && (
            <>
              <p className="cs-sw-helper">Click a shade to replace this swatch · ⧉ to copy.</p>
              <div className="cs-sw-shade-strip">
                {shades.map((sh, i) => (
                  <button key={i} className="cs-sw-shade-seg" ref={el => el && el.style.setProperty('--cs-seg', sh)}
                    title={sh.toUpperCase()} aria-label={`Tone ${TONES[i]} ${sh.toUpperCase()}`}
                    onClick={() => onReplace(sh, 'shade')} />
                ))}
              </div>
              <div className="cs-sw-siblings">
                {shades.map((sh, i) => {
                  const current = sh.toLowerCase() === color.toLowerCase()
                  return (
                    <button key={i} className="cs-sw-shade-row" aria-current={current ? 'true' : undefined}
                      onClick={() => onReplace(sh, 'shade')}>
                      <span className="cs-sw-shade-dot" ref={el => el && el.style.setProperty('--cs-dot', sh)} />
                      <span className="cs-sw-shade-tone">{TONES[i]}</span>
                      <span className="cs-sw-shade-hex">{sh.toUpperCase()}</span>
                      <span className="cs-sw-shade-ratio">{contrastRatio(sh, '#FFFFFF').toFixed(1)}:1</span>
                      <span className="cs-sw-shade-copy" role="button" tabIndex={-1} aria-label={`Copy ${sh.toUpperCase()}`}
                        onClick={(e) => { e.stopPropagation(); onCopy(sh.toUpperCase()) }}>
                        <CopyIcon size={11} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'edit' && (
            <>
              <div className="cs-sw-edit-label">Exact colour</div>
              <div className="cs-sw-edit-field">
                <label className="cs-sw-edit-chip" ref={el => el && el.style.setProperty('--cs-edit-chip', color)}>
                  <input ref={colorInputRef} type="color" value={color}
                    onChange={e => onReplace(e.target.value, 'edit')} aria-label="Pick colour" />
                </label>
                <input ref={hexInputRef} type="text" inputMode="text"
                  className={`cs-sw-edit-hex${hexErr ? ' invalid' : ''}`}
                  value={hexDraft} onChange={e => onHexChange(e.target.value)}
                  aria-label="Hex value" aria-invalid={hexErr}
                  aria-describedby={hexErr ? `cs-sw-edit-err-${idx}` : undefined}
                  spellCheck={false} autoComplete="off" />
                <button className="cs-sw-edit-pick" onClick={() => colorInputRef.current?.click()}>Pick</button>
              </div>
              {hexErr && (
                <div className="cs-sw-edit-err" id={`cs-sw-edit-err-${idx}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  Enter a valid 6-digit hex (or rgb()).
                </div>
              )}
              {recentEdits.length > 0 && (
                <>
                  <div className="cs-sw-edit-label">Recent</div>
                  <div className="cs-sw-recent">
                    {recentEdits.map((hex, i) => (
                      <button key={i} className="cs-sw-recent-chip" ref={el => el && el.style.setProperty('--cs-recent', hex)}
                        title={hex.toUpperCase()} aria-label={`Set ${hex.toUpperCase()}`}
                        onClick={() => onReplace(hex, 'edit')} />
                    ))}
                  </div>
                </>
              )}
              <div className="cs-sw-edit-sep" />
              {adjustActive ? (
                <>
                  <div className="cs-sw-edit-note">
                    A global adjust is active — this swatch is set exactly, then the adjust lens is applied on top (shown in the rail). <button onClick={onResetAdjust}>Reset adjust</button> for a 1:1 match.
                  </div>
                  <div className="cs-sw-edit-sub">Set: {baseValue.toUpperCase()} · as shown in rail: {color.toUpperCase()}</div>
                </>
              ) : (
                <div className="cs-sw-edit-note">This sets the swatch exactly. Click a value to copy it from any tab.</div>
              )}
              {isLocked && (
                <div className="cs-sw-edit-note">This swatch is locked; it won&apos;t change on Randomise.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Colour System popup (CS#3.14, Slice 3) ──
// Three tabs (Generate / Image / Brands) sharing Slice 2's popup chrome,
// positioner, dismissal, focus-trap and ≤480 bottom-sheet. Replaces the old
// cs-add-menu dropdown + standalone Pick-Colour overlay.

const CSYS_TABS = [
  { id: 'gen', label: 'Generate' },
  { id: 'img', label: 'Image' },
  { id: 'brand', label: 'Brands' },
]

// Harmony chips, in display order. `free` mirrors the cs-pb-harms split exactly.
const CSYS_HARMS = [
  { id: 'auto', label: 'Auto', free: true },
  { id: 'custom', label: 'Custom', free: true },
  { id: 'monochromatic', label: 'Monochromatic', free: true },
  { id: 'complement', label: 'Complementary', free: false },
  { id: 'analogous', label: 'Analogous', free: false },
  { id: 'triadic', label: 'Triadic', free: false },
  { id: 'split', label: 'Split', free: false },
  { id: 'tetradic', label: 'Tetradic', free: false },
]

// Tiny mono 2–3 dot relationship diagram per harmony (Gestalt: read the
// *relationship* pre-consciously). Dots on a 24×24 circle; no colour reveal.
function HarmonyDiagram({ id }) {
  // angles (deg, 12-o'clock = -90) of the related hues around the wheel.
  const sets = {
    auto: [0],
    custom: [0, 47],
    monochromatic: [0],
    complement: [0, 180],
    analogous: [-30, 0, 30],
    triadic: [0, 120, 240],
    split: [0, 150, 210],
    tetradic: [0, 90, 180, 270],
  }
  const angles = sets[id] || [0]
  const cx = 12, cy = 12, r = 7
  return (
    <svg className="cs-csys-harm-diagram" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r + 2.5} stroke="currentColor" strokeWidth="1" opacity="0.35" />
      {id === 'monochromatic'
        ? [4, 7, 10].map((rr, i) => <circle key={i} cx={cx} cy={cy - rr + 5} r="1.7" fill="currentColor" />)
        : angles.map((a, i) => {
            const rad = ((a - 90) * Math.PI) / 180
            return <circle key={i} cx={cx + r * Math.cos(rad)} cy={cy + r * Math.sin(rad)} r="2" fill="currentColor" />
          })}
    </svg>
  )
}

function ColourSystemPopup({
  anchorRect, isSheet, baseColor, harmony, isPro, freeSlotsLeft, checkCanAdd,
  onProGate, onClose, restoreRef, onAddRamp, onAddCustomHue, onAddSampled, onAddBrand, onAddBrandSwatch,
}) {
  const popRef = useRef(null)
  const tabsRef = useRef(null)
  const tabRefs = useRef({})
  const underlineRef = useRef(null)
  const [tab, setTab] = useState('gen')

  // Anchored positioning (desktop) — reuse Slice 2's exact algorithm.
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el || isSheet || !anchorRect) return
    const w = el.offsetWidth, h = el.offsetHeight
    let x = anchorRect.left
    let y = anchorRect.bottom + 8
    if (y + h > window.innerHeight - 12) {
      const above = anchorRect.top - h - 8
      y = above >= 12 ? above : Math.max(12, (window.innerHeight - h) / 2)
    }
    x = Math.min(x, window.innerWidth - w - 12)
    x = Math.max(12, x)
    el.style.setProperty('--cs-csys-x', x + 'px')
    el.style.setProperty('--cs-csys-y', y + 'px')
  }, [anchorRect, isSheet, tab])

  // Tab underline measurement (sliding-pill, echoes Slice 2).
  const measureUnderline = useCallback(() => {
    const el = tabRefs.current[tab]
    const u = underlineRef.current
    if (!el || !u) return
    u.style.setProperty('--cs-csys-tab-x', el.offsetLeft + 'px')
    u.style.setProperty('--cs-csys-tab-w', el.offsetWidth + 'px')
  }, [tab])
  useLayoutEffect(() => { measureUnderline() }, [measureUnderline])
  useEffect(() => {
    document.fonts?.ready.then(measureUnderline).catch(() => {})
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureUnderline) : null
    if (ro && tabsRef.current) ro.observe(tabsRef.current)
    window.addEventListener('resize', measureUnderline)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', measureUnderline)
    }
  }, [measureUnderline])

  // Focus the active tab on open.
  useEffect(() => {
    tabRefs.current.gen?.focus()
  }, [])

  // Dismissal: Esc, outside-click, scroll/resize → close + restore focus to trigger.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = popRef.current?.querySelectorAll('button, [href], input, select, canvas, [tabindex]:not([tabindex="-1"])')
      if (!focusables || !focusables.length) return
      const list = Array.from(focusables).filter(n => !n.disabled && n.offsetParent !== null)
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const onDown = (e) => {
      // Ignore clicks on the trigger itself — its own onClick toggles the popup.
      // Without this guard the mousedown→onClose() then click→toggle race reopens it.
      if (restoreRef?.current?.contains(e.target)) return
      if (popRef.current && !popRef.current.contains(e.target)) onClose()
    }
    const onScroll = (e) => {
      if (isSheet) return
      // Ignore scrolls originating inside the popup's own scrollable content
      // (the .cs-csys-body / Tints tab list). A capture-phase window listener
      // still receives these with e.target set to the inner scroll node. A page
      // scroll has e.target === document (not contained → still closes).
      if (popRef.current && e?.target?.nodeType && popRef.current.contains(e.target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      restoreRef?.current?.focus?.()
    }
  }, [onClose, isSheet, restoreRef])

  // Roving tabindex / arrow-key tab switching.
  const onTabKey = (e) => {
    const order = CSYS_TABS.map(t => t.id)
    const i = order.indexOf(tab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = e.key === 'ArrowRight' ? (i + 1) % order.length : (i - 1 + order.length) % order.length
      setTab(order[next])
      requestAnimationFrame(() => tabRefs.current[order[next]]?.focus())
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const next = e.key === 'Home' ? 0 : order.length - 1
      setTab(order[next])
      requestAnimationFrame(() => tabRefs.current[order[next]]?.focus())
    }
  }

  return (
    <div className={`cs-sw-overlay${isSheet ? ' cs-csys-sheet-overlay' : ''}`}>
      <div ref={popRef} className="cs-csys-popup" role="dialog" aria-modal="true" aria-labelledby="cs-csys-title">
        {isSheet && <div className="cs-csys-grabber" aria-hidden="true" />}
        <div className="cs-csys-head">
          <h2 className="cs-csys-title" id="cs-csys-title">Colour System</h2>
          <button className="cs-csys-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div ref={tabsRef} className="cs-csys-tabs" role="tablist" aria-label="Colour System" onKeyDown={onTabKey}>
          {CSYS_TABS.map(t => (
            <button key={t.id} ref={el => (tabRefs.current[t.id] = el)}
              className={`cs-csys-tab${tab === t.id ? ' active' : ''}`}
              role="tab" id={`cs-csys-tab-${t.id}`} aria-selected={tab === t.id}
              aria-controls={`cs-csys-panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
          <span ref={underlineRef} className="cs-csys-tab-underline" aria-hidden="true" />
        </div>
        <div className="cs-csys-body">
          {tab === 'gen' && (
            <CsysGenerate baseColor={baseColor} harmony={harmony} isPro={isPro} checkCanAdd={checkCanAdd}
              onProGate={onProGate} onAddRamp={onAddRamp} onAddCustomHue={onAddCustomHue} />
          )}
          {tab === 'img' && (
            <CsysImage isPro={isPro} freeSlotsLeft={freeSlotsLeft} checkCanAdd={checkCanAdd}
              onAddSampled={onAddSampled} />
          )}
          {tab === 'brand' && (
            <CsysBrands freeSlotsLeft={freeSlotsLeft} onAddBrand={onAddBrand} onAddBrandSwatch={onAddBrandSwatch} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Generate tab ──
function CsysGenerate({ baseColor, harmony, isPro, checkCanAdd, onProGate, onAddRamp, onAddCustomHue }) {
  // Selected harmony — only free ids are ever held in state (anti-tamper: a Pro
  // chip click NEVER changes selection or computes a ramp for a non-Pro user).
  const [sel, setSel] = useState(() => {
    const free = CSYS_HARMS.find(h => h.id === harmony && h.free)
    return free ? free.id : 'auto'
  })
  const tileRef = useRef([])

  // The previewed ramp.
  // ANTI-TAMPER (Slice 1 contract): a Pro harmony is ONLY computed when isPro is
  // true. `sel` can never hold a Pro id for a non-Pro user (onChip gates it), so
  // the locked branch is never reached client-side — no harmony hex is placed in
  // state/DOM/preview for a non-entitled user. The strip only shows free output.
  const ramp = useMemo(() => {
    if (sel === 'custom') {
      const [h] = hexToHsl(baseColor)
      const one = hslToHex((h + 47) % 360, 55, 55)
      return [one, one, one, one, one]
    }
    const proHarm = CSYS_HARMS.find(h => h.id === sel && !h.free)
    if (proHarm && isPro) {
      const out = generateHarmony(baseColor, sel)
      // Pad/trim to a 5-tile strip without inventing colours (repeat last).
      const five = out.slice(0, 5)
      while (five.length < 5) five.push(out[out.length - 1])
      return five
    }
    return tonalRamp(baseColor, [30, 45, 60, 75, 90])
  }, [sel, baseColor, isPro])

  useLayoutEffect(() => {
    ramp.forEach((hex, i) => tileRef.current[i]?.style.setProperty('--cs-csys-tile', hex))
  }, [ramp])

  const onChip = (h) => {
    if (!h.free) { if (!isPro) { onProGate('harmonies'); return } }
    setSel(h.id)
  }

  const commit = () => {
    if (!checkCanAdd(1)) return
    if (sel === 'custom') { onAddCustomHue(); return }
    onAddRamp(ramp)
  }

  return (
    <div className="cs-csys-panel" role="tabpanel" id="cs-csys-panel-gen" aria-labelledby="cs-csys-tab-gen">
      <div className="cs-csys-eyebrow">Auto<span className="cs-csys-free-badge">Free</span></div>
      <div className="cs-csys-auto">
        {ramp.map((hex, i) => (
          <span key={i} ref={el => (tileRef.current[i] = el)} className="cs-csys-auto-tile" title={hex} />
        ))}
      </div>
      <div className="cs-csys-eyebrow">Harmony</div>
      <div className="cs-csys-harm" role="radiogroup" aria-label="Harmony">
        {CSYS_HARMS.map(h => {
          const locked = !h.free && !isPro
          const selected = sel === h.id
          return (
            <button key={h.id} type="button"
              className={`cs-csys-harm-chip${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}
              role="radio" aria-checked={selected}
              aria-disabled={locked || undefined}
              aria-label={locked ? `${h.label} — Pro` : h.label}
              onClick={() => onChip(h)}>
              <HarmonyDiagram id={h.id} />
              <span className="cs-csys-harm-label">{h.label}</span>
              {locked && <span className="cs-csys-lock"><LockGlyph size={10} /></span>}
            </button>
          )
        })}
      </div>
      <div className="cs-csys-foot">
        <button className="cs-csys-add" onClick={commit}>Add to palette</button>
        <button className="cs-csys-ghost" onClick={onAddCustomHue}>Custom hue</button>
      </div>
    </div>
  )
}

// ── Image tab (the signature instrument) ──
const CSYS_MAX_BYTES = 12 * 1024 * 1024
function CsysImage({ isPro, freeSlotsLeft, checkCanAdd, onAddSampled }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)       // visible, drawn letterboxed
  const srcRef = useRef(null)          // offscreen, natural-res, sampled
  const loupeRef = useRef(null)
  const loupeCanvasRef = useRef(null)
  const fileRef = useRef(null)
  const ptRefs = useRef({})
  const readoutRef = useRef(null)
  const rafRef = useRef(null)
  const liveTimerRef = useRef(null)
  const draggingRef = useRef(null)

  const [phase, setPhase] = useState('empty')   // empty | loading | ready | error
  const [errMsg, setErrMsg] = useState('')
  const [dragover, setDragover] = useState(false)
  const [points, setPoints] = useState([])      // [{ id, x, y, hex }] x/y normalised 0–1
  const [active, setActive] = useState(null)     // active point id
  const [zoom, setZoom] = useState(1)
  const [live, setLive] = useState('')
  const idRef = useRef(0)

  // Letterbox geometry of the source image inside the canvas (px, CSS units).
  const boxRef = useRef({ ox: 0, oy: 0, dw: 0, dh: 0, cw: 0, ch: 0 })

  const sampleAt = useCallback((nx, ny) => {
    const src = srcRef.current
    if (!src) return '#000000'
    const sx = Math.max(0, Math.min(src.width - 1, Math.round(nx * src.width)))
    const sy = Math.max(0, Math.min(src.height - 1, Math.round(ny * src.height)))
    try {
      const d = src.getContext('2d', { willReadFrequently: true }).getImageData(sx, sy, 1, 1).data
      return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    } catch { return '#000000' }
  }, [])

  // Draw the image letterboxed into the visible canvas at the current zoom.
  const drawCanvas = useCallback(() => {
    const cv = canvasRef.current, src = srcRef.current, stage = stageRef.current
    if (!cv || !src || !stage) return
    const cw = stage.clientWidth
    const maxH = parseInt(getComputedStyle(stage).getPropertyValue('--cs-csys-stage-h') || '300', 10) || 300
    const ar = src.width / src.height
    let dw = cw, dh = cw / ar
    if (dh > maxH) { dh = maxH; dw = maxH * ar }
    cv.width = Math.round(cw)
    cv.height = Math.round(maxH)
    const ctx = cv.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.clearRect(0, 0, cv.width, cv.height)
    const sw = dw * zoom, sh = dh * zoom
    const ox = (cw - sw) / 2, oy = (maxH - sh) / 2
    ctx.drawImage(src, ox, oy, sw, sh)
    boxRef.current = { ox, oy, dw: sw, dh: sh, cw, ch: maxH }
  }, [zoom])

  // Project a normalised point to CSS px within the stage, and apply via custom props.
  const positionPoints = useCallback(() => {
    const { ox, oy, dw, dh } = boxRef.current
    points.forEach(p => {
      const el = ptRefs.current[p.id]
      if (!el) return
      el.style.setProperty('--cs-x', (ox + p.x * dw) + 'px')
      el.style.setProperty('--cs-y', (oy + p.y * dh) + 'px')
      el.style.setProperty('--cs-c', p.hex)
    })
  }, [points])

  useLayoutEffect(() => { if (phase === 'ready') { drawCanvas(); positionPoints() } }, [phase, zoom, drawCanvas, positionPoints])
  useEffect(() => {
    if (phase !== 'ready') return
    const onResize = () => { drawCanvas(); positionPoints() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [phase, drawCanvas, positionPoints])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); clearTimeout(liveTimerRef.current) }, [])

  const announce = useCallback((hex) => {
    clearTimeout(liveTimerRef.current)
    liveTimerRef.current = setTimeout(() => setLive(`Sampled ${hex}`), 300)
  }, [])

  // Draw the magnifier loupe around a normalised point and position it near the handle.
  const drawLoupe = useCallback((p) => {
    const lc = loupeCanvasRef.current, src = srcRef.current, loupe = loupeRef.current
    if (!lc || !src || !loupe) return
    const N = 11, scale = 8
    lc.width = N; lc.height = N
    const sx = Math.round(p.x * src.width) - (N >> 1)
    const sy = Math.round(p.y * src.height) - (N >> 1)
    const ctx = lc.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, N, N)
    try { ctx.drawImage(src, sx, sy, N, N, 0, 0, N, N) } catch { /* edge */ }
    // Position the loupe near the handle (above-left), clamped to the stage.
    const { ox, oy, dw, dh } = boxRef.current
    const hx = ox + p.x * dw, hy = oy + p.y * dh
    // Match the responsive loupe sizes to the SAME breakpoints the CSS used, then
    // drive both the position math and the custom property from this one value so
    // CSS overrides can't disagree with the JS-positioned clamp (default = N*scale).
    const size = window.innerWidth <= 320 ? 72 : window.innerWidth <= 480 ? 80 : N * scale
    let lx = hx + 18, ly = hy - size - 18
    if (ly < 0) ly = hy + 18
    if (lx + size > boxRef.current.cw) lx = hx - size - 18
    if (lx < 0) lx = 4
    loupe.style.setProperty('--cs-loupe-x', lx + 'px')
    loupe.style.setProperty('--cs-loupe-y', ly + 'px')
    loupe.style.setProperty('--cs-loupe-size', size + 'px')
  }, [])

  const updatePoint = useCallback((id, nx, ny, { announceHex = false } = {}) => {
    const cx = Math.max(0, Math.min(1, nx)), cy = Math.max(0, Math.min(1, ny))
    const hex = sampleAt(cx, cy)
    setPoints(ps => ps.map(p => (p.id === id ? { ...p, x: cx, y: cy, hex } : p)))
    const el = ptRefs.current[id]
    const { ox, oy, dw, dh } = boxRef.current
    if (el) {
      el.style.setProperty('--cs-x', (ox + cx * dw) + 'px')
      el.style.setProperty('--cs-y', (oy + cy * dh) + 'px')
      el.style.setProperty('--cs-c', hex)
    }
    // Keep the readout chip pinned to the handle during a live drag/nudge — its ref
    // callback only fires at mount, so without this it lags behind the moving point.
    const ro = readoutRef.current
    if (ro) {
      ro.style.setProperty('--cs-x', (ox + cx * dw) + 'px')
      ro.style.setProperty('--cs-y', (oy + cy * dh) + 'px')
      ro.style.setProperty('--cs-c', hex)
    }
    drawLoupe({ x: cx, y: cy })
    if (announceHex) announce(hex)
    return hex
  }, [sampleAt, drawLoupe, announce])

  const seedFromFile = useCallback(async (file) => {
    setPhase('loading'); setErrMsg('')
    if (!file.type.startsWith('image/')) {
      setPhase('error'); setErrMsg("That's not an image. Try PNG, JPG, or WEBP."); return
    }
    if (file.size > CSYS_MAX_BYTES) {
      setPhase('error'); setErrMsg('Image is over 12 MB. Try a smaller one.'); return
    }
    // Decode at natural resolution into the offscreen sampling canvas.
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      try {
        // Cap the sampling buffer so a 8000px upload doesn't blow memory; sampling
        // stays per-pixel accurate at this resolution for eyedropper purposes.
        const cap = 1600
        const s = Math.min(cap / img.width, cap / img.height, 1)
        const sw = Math.max(1, Math.round(img.width * s))
        const sh = Math.max(1, Math.round(img.height * s))
        const off = document.createElement('canvas')
        off.width = sw; off.height = sh
        off.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, sw, sh)
        srcRef.current = off
        URL.revokeObjectURL(url)
        let seeds = []
        try { seeds = await extractColorPointsFromImage(file, 5) } catch { seeds = [] }
        setPhase('ready')
        if (seeds.length) {
          setPoints(seeds.map(s2 => ({ id: ++idRef.current, x: s2.x, y: s2.y, hex: s2.hex })))
          setActive(null)
        } else {
          setPoints([])
          setLive('We couldn\'t find distinct colours in that image — tap to place a point.')
        }
      } catch {
        setPhase('error'); setErrMsg('Couldn\'t read that image. Try another file.')
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); setPhase('error'); setErrMsg('Couldn\'t read that image. Try another file.') }
    img.src = url
  }, [])

  const onFile = (e) => { const f = e.target.files?.[0]; if (f) seedFromFile(f); if (fileRef.current) fileRef.current.value = '' }
  const onDrop = (e) => {
    e.preventDefault(); setDragover(false)
    const f = e.dataTransfer.files?.[0]; if (f) seedFromFile(f)
  }

  // Add a point at a normalised location (click/tap or keyboard P).
  const addPoint = useCallback((nx, ny) => {
    if (!checkCanAdd(1)) return null   // fires onProGate('extra-colours') internally when capped
    const id = ++idRef.current
    const hex = sampleAt(nx, ny)
    setPoints(ps => [...ps, { id, x: nx, y: ny, hex }])
    setActive(id)
    requestAnimationFrame(() => { ptRefs.current[id]?.focus(); drawLoupe({ x: nx, y: ny }) })
    announce(hex)
    return id
  }, [checkCanAdd, sampleAt, drawLoupe, announce])

  const removePoint = useCallback((id) => {
    setPoints(ps => {
      if (ps.length <= 1) { setLive('Keep at least one sample point.'); return ps }
      const next = ps.filter(p => p.id !== id)
      setActive(a => (a === id ? (next[0]?.id ?? null) : a))
      return next
    })
  }, [])

  // Keep a ref of points for the pointerup closure (avoids stale read).
  const pointsRef = useRef(points)
  useEffect(() => { pointsRef.current = points }, [points])

  // Pointer drag of a handle.
  const onPointerDown = (e, id) => {
    e.preventDefault(); e.stopPropagation()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* unsupported / detached */ }
    setActive(id)
    ptRefs.current[id]?.focus()
    draggingRef.current = id
    ptRefs.current[id]?.classList.add('is-dragging')
    const move = (ev) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const stage = stageRef.current; if (!stage) return
        const r = stage.getBoundingClientRect()
        const { ox, oy, dw, dh } = boxRef.current
        const nx = (ev.clientX - r.left - ox) / dw
        const ny = (ev.clientY - r.top - oy) / dh
        updatePoint(id, nx, ny)
      })
    }
    const up = () => {
      draggingRef.current = null
      ptRefs.current[id]?.classList.remove('is-dragging')
      const p = pointsRef.current.find(pp => pp.id === id)
      if (p) announce(p.hex)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Click empty canvas → add a point there.
  const onStagePointerDown = (e) => {
    if (phase !== 'ready') return
    if (e.target.closest('.cs-csys-pt')) return
    const stage = stageRef.current; if (!stage) return
    const r = stage.getBoundingClientRect()
    const { ox, oy, dw, dh } = boxRef.current
    const nx = (e.clientX - r.left - ox) / dw
    const ny = (e.clientY - r.top - oy) / dh
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
    addPoint(nx, ny)
  }

  // Keyboard contract on the canvas application region.
  const onStageKey = (e) => {
    if (phase !== 'ready') return
    if (e.key === 'p' || e.key === 'P' || (e.key === 'Enter' && e.target === stageRef.current)) {
      e.preventDefault(); addPoint(0.5, 0.5)
    }
  }

  // Per-point keyboard: arrows nudge, Delete/Backspace remove.
  const onPointKey = (e, id) => {
    const p = pointsRef.current.find(pp => pp.id === id); if (!p) return
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removePoint(id); return }
    const step = e.shiftKey ? 10 : 1
    const { dw, dh } = boxRef.current
    let dx = 0, dy = 0
    if (e.key === 'ArrowLeft') dx = -step
    else if (e.key === 'ArrowRight') dx = step
    else if (e.key === 'ArrowUp') dy = -step
    else if (e.key === 'ArrowDown') dy = step
    else return
    e.preventDefault()
    const nx = p.x + (dw ? dx / dw : 0)
    const ny = p.y + (dh ? dy / dh : 0)
    setActive(id)
    updatePoint(id, nx, ny, { announceHex: true })
  }

  const replaceImage = () => { setPhase('empty'); setPoints([]); setActive(null); setZoom(1); srcRef.current = null }

  const canAdd = points.length > 0 && (isPro || freeSlotsLeft() > 0)
  const commit = () => { if (points.length) onAddSampled(points.map(p => p.hex)) }

  // ── render ──
  if (phase === 'empty' || phase === 'error') {
    return (
      <div className="cs-csys-panel" role="tabpanel" id="cs-csys-panel-img" aria-labelledby="cs-csys-tab-img">
        <button type="button"
          className={`cs-csys-drop${dragover ? ' is-dragover' : ''}${phase === 'error' ? ' is-error' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragover(true) }}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="cs-csys-drop-title">Drop an image, or browse</span>
          <span className="cs-csys-drop-sub">PNG, JPG, WEBP · up to 12 MB</span>
          {phase === 'error' && <span className="cs-csys-drop-err" role="alert">{errMsg}</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="cs-csys-file" onChange={onFile} />
      </div>
    )
  }

  // Live readout chip for the active handle. Extracted from the render IIFE for
  // readability; its position is set on mount via readoutRef and then kept in sync
  // by updatePoint during drags/nudges so it tracks the handle in real time.
  const activeReadout = (() => {
    if (phase !== 'ready' || !points.length || !active) return null
    const p = points.find(pp => pp.id === active)
    if (!p) return null
    const cr = contrastRatio(p.hex, '#FFFFFF')
    const tier = cr >= 7 ? 'AAA' : cr >= 4.5 ? 'AA' : cr >= 3 ? 'AA Lg' : 'Fail'
    const cls = cr >= 4.5 ? 'pass' : cr >= 3 ? 'warn' : 'fail'
    return (
      <div className="cs-csys-readout"
        ref={el => {
          readoutRef.current = el
          if (el) {
            const { ox, oy, dw, dh } = boxRef.current
            el.style.setProperty('--cs-x', (ox + p.x * dw) + 'px')
            el.style.setProperty('--cs-y', (oy + p.y * dh) + 'px')
            el.style.setProperty('--cs-c', p.hex)
          }
        }}>
        <span className="cs-csys-readout-sw" />
        <span className="cs-csys-readout-hex">{p.hex}</span>
        <span className={`cs-csys-readout-badge ${cls}`}>{tier}</span>
      </div>
    )
  })()

  return (
    <div className="cs-csys-panel" role="tabpanel" id="cs-csys-panel-img" aria-labelledby="cs-csys-tab-img">
      <div className="cs-csys-zoom" role="group" aria-label="Zoom">
        {[1, 2].map(z => (
          <button key={z} type="button" className={`cs-csys-zoom-seg${zoom === z ? ' active' : ''}`}
            aria-pressed={zoom === z} onClick={() => setZoom(z)}>{z}×</button>
        ))}
      </div>
      <div ref={stageRef}
        className={`cs-csys-stage${phase === 'loading' ? ' is-loading' : ''}`}
        role="application"
        aria-label="Image colour sampler. Use arrow keys to move the selected point; press P to place a new point; Delete to remove."
        aria-describedby="cs-csys-instr"
        tabIndex={0}
        onPointerDown={onStagePointerDown}
        onKeyDown={onStageKey}>
        <canvas ref={canvasRef} className="cs-csys-canvas" aria-hidden="true" />
        {points.map((p, i) => (
          <span key={p.id} ref={el => (ptRefs.current[p.id] = el)}
            className={`cs-csys-pt${active === p.id ? ' is-active' : ''}`}
            role="slider" aria-label={`Sample point ${i + 1}, ${p.hex}`}
            aria-valuetext={`${p.hex}, contrast ${contrastRatio(p.hex, '#FFFFFF').toFixed(1)} to 1 on white`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.x * 100)}
            tabIndex={active == null ? (i === 0 ? 0 : -1) : (active === p.id ? 0 : -1)}
            onFocus={() => { setActive(p.id); drawLoupe(p) }}
            onPointerDown={e => onPointerDown(e, p.id)}
            onKeyDown={e => onPointKey(e, p.id)}>
            <span className="cs-csys-pt-ring" />
            <button type="button" className="cs-csys-pt-del" aria-label={`Remove sample point ${i + 1}`}
              tabIndex={-1} onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); removePoint(p.id) }}>&times;</button>
          </span>
        ))}
        <div ref={loupeRef} className="cs-csys-loupe" aria-hidden="true">
          <canvas ref={loupeCanvasRef} className="cs-csys-loupe-canvas" />
          <span className="cs-csys-loupe-cross" />
        </div>
        {phase === 'loading' && <div className="cs-csys-state is-loading"><span className="cs-csys-spinner" />Reading image…</div>}
        {activeReadout}
      </div>
      <p id="cs-csys-instr" className="cs-csys-hint">{points.length ? 'Tap the image to add a point · drag or use arrow keys to refine' : 'Tap the image to place a sample point'}</p>
      <div className="cs-csys-tray" role="list" aria-label="Sampled colours">
        {points.map((p, i) => (
          <button key={p.id} type="button" role="listitem"
            ref={el => { if (el) el.style.setProperty('--cs-c', p.hex) }}
            className={`cs-csys-tray-tile${active === p.id ? ' is-active' : ''}`}
            title={p.hex} aria-label={`Sample ${i + 1} ${p.hex}, remove`}
            onClick={() => removePoint(p.id)}>
            <span className="cs-csys-tray-x" aria-hidden="true">&times;</span>
          </button>
        ))}
      </div>
      <p className="cs-csys-live" aria-live="polite" role="status">{live}</p>
      <div className="cs-csys-foot">
        <button className="cs-csys-add" onClick={commit} disabled={!canAdd}>
          {points.length ? `Add ${points.length} colour${points.length === 1 ? '' : 's'}` : 'Add colours'}
        </button>
        <button className="cs-csys-ghost" onClick={replaceImage}>Replace image</button>
      </div>
    </div>
  )
}

// ── Brands tab ──
function CsysBrands({ freeSlotsLeft, onAddBrand, onAddBrandSwatch }) {
  const [sel, setSel] = useState(null)
  const barRefs = useRef({})
  // BRANDS is a module constant and barRefs is a stable ref, so the swatch colours
  // only need painting once after mount — run on mount, not every render.
  useLayoutEffect(() => {
    BRANDS.forEach(b => {
      const refs = barRefs.current[b.n] || []
      b.colors.forEach((c, i) => refs[i]?.style.setProperty('--cs-c', c))
    })
  }, [])
  const selBrand = BRANDS.find(b => b.n === sel)
  return (
    <div className="cs-csys-panel" role="tabpanel" id="cs-csys-panel-brand" aria-labelledby="cs-csys-tab-brand">
      <div className="cs-csys-brand-grid">
        {BRANDS.map(b => (
          <div key={b.n}
            className={`cs-csys-brand${sel === b.n ? ' is-selected' : ''}`}
            role="button" tabIndex={0} aria-pressed={sel === b.n}
            onClick={() => setSel(b.n)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(b.n) } }}>
            <span className="cs-csys-brand-name">{b.n}</span>
            <div className="cs-csys-brand-bar">
              {b.colors.map((c, i) => (
                <button key={i} type="button" className="cs-csys-brand-sw"
                  ref={el => { (barRefs.current[b.n] = barRefs.current[b.n] || [])[i] = el }}
                  aria-label={`Add ${b.n} ${c}`} title={c}
                  onClick={e => { e.stopPropagation(); onAddBrandSwatch(c) }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cs-csys-foot">
        <button className="cs-csys-add" disabled={!selBrand} onClick={() => selBrand && onAddBrand(selBrand)}>
          {selBrand ? `Add ${selBrand.n} palette` : 'Select a brand'}
        </button>
        {!freeSlotsLeft() && <span className="cs-csys-foot-note">Free palettes hold up to 8 colours</span>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Slice 4 — "See it shipped" Previews (CS#3.2).
// Four vector/CSS scenes that recolour live from a single deterministic role
// map (derivePreviewRoles). Two free (hero, app), two Pro-locked (mobile,
// article). The Pro gate is a HARD render gate (§9): for non-Pro users the real
// palette-applied scene is NEVER computed, placed in state, or put in the DOM —
// `roles` is passed as null and `PreviewScene` returns the palette-free
// LockedPlaceholder BEFORE any code touches `roles`. No blur, no opacity:0, no
// data-*, nothing inspect-element can extract. Mirrors the Slice 3 contract.
// ─────────────────────────────────────────────────────────────────────────

const PV_SCENE_MODE = { hero: 'dark', app: 'light', mobile: 'light', article: 'light' }
const PV_SCENE_LABEL = {
  hero: 'Marketing site',
  app: 'App dashboard',
  mobile: 'Mobile app',
  article: 'Editorial article',
}
const PV_LEGEND_ROLES = [
  { key: 'bg', name: 'Background' },
  { key: 'surface', name: 'Surface' },
  { key: 'primary', name: 'Primary' },
  { key: 'accent', name: 'Accent' },
  { key: 'text', name: 'Text' },
]

// Imperatively paint the eight --pv-* custom properties on a scene canvas ref.
// The sanctioned dynamic-style path (no inline style attribute). Only ever runs
// for an unlocked scene whose component actually mounts — locked scenes return
// before this hook is reached, so no palette value is written to a locked DOM.
function usePvCanvas(canvasRef, roles) {
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el || !roles) return
    const set = (k, v) => el.style.setProperty(k, v)
    set('--pv-bg', roles.bg)
    set('--pv-surface', roles.surface)
    set('--pv-primary', roles.primary)
    set('--pv-on-primary', roles.onPrimary)
    set('--pv-accent', roles.accent)
    set('--pv-text', roles.text)
    set('--pv-muted', roles.muted)
    set('--pv-border', roles.border)
    set('--pv-primary-border', roles.primaryBorder || 'transparent')
  }, [canvasRef, roles])
}

// Quiet legend that teaches the role→hex mapping (Material "see the logic" move).
// Dots reflect the real derived hex, painted via the same --pv-* custom-prop
// path as the scenes (no inline style attribute on the markup).
function PreviewLegend({ roles }) {
  const legendRef = useRef(null)
  usePvCanvas(legendRef, roles)
  if (!roles) return null
  return (
    <div className="cs-pv-legend" role="group" aria-label="Palette role mapping" ref={legendRef}>
      {PV_LEGEND_ROLES.map(({ key, name }) => {
        const hex = roles[key]
        return (
          <div className="cs-pv-legend-item" key={key} aria-label={`${name}, ${hex}`}>
            <span className="cs-pv-legend-dot" data-role={key} aria-hidden="true" />
            <span className="cs-pv-legend-name">{name}</span>
            <span className="cs-pv-legend-hex">{hex}</span>
          </div>
        )
      })}
      {roles.lowChroma && (
        <span className="cs-pv-legend-hint">Add a saturated colour to brand the CTA</span>
      )}
    </div>
  )
}

// Generic, palette-free monochrome wireframe shown to non-Pro users in place of
// a locked scene. Built ONLY from app chrome tokens (--t3 / --border / --bg-2);
// identical for every user — there is nothing palette-derived to inspect (§9).
function LockedPlaceholder({ scene }) {
  return (
    <div className="cs-pv-lock-art" aria-hidden="true">
      {scene === 'mobile' ? (
        <div className="cs-pv-lock-phone">
          <span className="cs-pv-lock-bar" />
          <span className="cs-pv-lock-block" />
          <span className="cs-pv-lock-line" />
          <span className="cs-pv-lock-line is-short" />
          <span className="cs-pv-lock-block" />
        </div>
      ) : (
        <div className="cs-pv-lock-doc">
          <span className="cs-pv-lock-line is-kicker" />
          <span className="cs-pv-lock-head" />
          <span className="cs-pv-lock-line" />
          <span className="cs-pv-lock-line" />
          <span className="cs-pv-lock-line is-short" />
          <span className="cs-pv-lock-rule" />
          <span className="cs-pv-lock-line" />
          <span className="cs-pv-lock-line is-short" />
        </div>
      )}
    </div>
  )
}

// ── The four real scenes (only rendered for free scenes, or Pro users). ──
function HeroScene() {
  return (
    <>
      <div className="cs-pv-glow" aria-hidden="true" />
      <div className="cs-pv-nav" aria-hidden="true">
        <span className="cs-pv-wordmark"><i className="cs-pv-dot" />Northwind</span>
        <span className="cs-pv-nav-links">
          <span className="cs-pv-link">Product</span>
          <span className="cs-pv-link">Pricing</span>
          <span className="cs-pv-link">Docs</span>
          <span className="cs-pv-btn">Start free</span>
        </span>
      </div>
      <div className="cs-pv-hero" aria-hidden="true">
        <span className="cs-pv-tag">New · v2 is here</span>
        <h3 className="cs-pv-headline">Ship your palette<br />as a real product.</h3>
        <p className="cs-pv-sub">A believable interface, recoloured live from the swatches you just built — type, depth and a CTA that lands.</p>
        <div className="cs-pv-cta-row">
          <span className="cs-pv-btn">Get started</span>
          <span className="cs-pv-btn is-ghost">Live demo</span>
        </div>
        <div className="cs-pv-logos">
          <span /><span /><span /><span />
        </div>
      </div>
    </>
  )
}

function AppScene() {
  return (
    <div className="cs-pv-app" aria-hidden="true">
      <aside className="cs-pv-side">
        <span className="cs-pv-side-mark" />
        <span className="cs-pv-side-item is-active"><i /></span>
        <span className="cs-pv-side-item"><i /></span>
        <span className="cs-pv-side-item"><i /></span>
        <span className="cs-pv-side-item"><i /></span>
      </aside>
      <div className="cs-pv-app-main">
        <div className="cs-pv-topbar">
          <span className="cs-pv-topbar-title">Overview</span>
          <span className="cs-pv-btn">New report</span>
        </div>
        <div className="cs-pv-kpis">
          {[['Revenue', '$48.2k', '+12%'], ['Users', '8,140', '+4%'], ['Churn', '1.9%', '−0.3%']].map((k, i) => (
            <div className="cs-pv-kpi" key={i}>
              <span className="cs-pv-kpi-label">{k[0]}</span>
              <span className="cs-pv-kpi-num">{k[1]}</span>
              <span className="cs-pv-kpi-chip">{k[2]}</span>
            </div>
          ))}
        </div>
        <div className="cs-pv-chart">
          {Array(8).fill(null).map((_, i) => (
            <span key={i} className={`cs-pv-bar${i === 5 ? ' is-peak' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MobileScene() {
  return (
    <div className="cs-pv-mobile" aria-hidden="true">
      <div className="cs-pv-phone">
        <div className="cs-pv-screen">
          <div className="cs-pv-status"><span /><span className="cs-pv-status-dots"><i /><i /><i /></span></div>
          <div className="cs-pv-feed-head">
            <span className="cs-pv-avatar" />
            <span className="cs-pv-feed-title">Discover</span>
          </div>
          {[0, 1].map(i => (
            <div className="cs-pv-feed-card" key={i}>
              <span className="cs-pv-feed-img" />
              <span className="cs-pv-feed-line" />
              <span className="cs-pv-feed-line is-short" />
              <span className="cs-pv-feed-actions"><i className="is-active" /><i /></span>
            </div>
          ))}
          <span className="cs-pv-fab">+</span>
          <div className="cs-pv-tabbar">
            <i className="is-active" /><i /><i /><i />
          </div>
        </div>
      </div>
    </div>
  )
}

function ArticleScene() {
  return (
    <div className="cs-pv-article" aria-hidden="true">
      <span className="cs-pv-kicker">Design systems</span>
      <h3 className="cs-pv-art-headline">Colour as a language for product teams</h3>
      <span className="cs-pv-byline">By A. Designer · 6 min read</span>
      <span className="cs-pv-rule" />
      <div className="cs-pv-cols">
        <p>A palette is only as good as the interface it survives. Real type at real measure is where contrast decisions earn their keep, and where a <span className="cs-pv-a">link colour</span> proves itself.</p>
        <p>The pull-quote below borrows the surface and primary roles directly, so the editorial voice stays in tune with the rest of the brand without a second thought.</p>
      </div>
      <blockquote className="cs-pv-quote">“The best colour system disappears — you only notice when it’s wrong.”</blockquote>
    </div>
  )
}

const PV_SCENES = { hero: HeroScene, app: AppScene, mobile: MobileScene, article: ArticleScene }

// One scene card. HARD GATE first: a locked, non-Pro scene returns the
// palette-free placeholder before any code touches `roles` (which the parent
// passes as null anyway). No real scene is ever built for a locked card.
function PreviewScene({ scene, roles, locked, onUpgrade }) {
  const canvasRef = useRef(null)
  // The effect is always called (hooks rule), but no-ops when roles is null —
  // so for a locked card nothing is ever written to its canvas.
  usePvCanvas(canvasRef, locked ? null : roles)

  const mode = PV_SCENE_MODE[scene]
  const label = PV_SCENE_LABEL[scene]

  if (locked) {
    return (
      <div className="cs-pv-scene is-locked" data-scene={scene} role="group"
        aria-label={`${label} — Pro preview, locked`}>
        <div className="cs-pv-scene-head">
          <span className="cs-pv-scene-tag">{label}</span>
          <span className="cs-pv-scene-mode">Pro</span>
        </div>
        <div className="cs-pv-canvas" ref={canvasRef}>
          <LockedPlaceholder scene={scene} />
          <div className="cs-pv-lock">
            <span className="cs-pv-lock-badge"><LockGlyph size={12} /> Pro</span>
            <span className="cs-pv-lock-label">{label}</span>
            <button type="button" className="cs-pv-lock-cta" onClick={onUpgrade}
              aria-label="Unlock Pro previews — upgrade">Unlock Pro previews</button>
          </div>
        </div>
      </div>
    )
  }

  const Scene = PV_SCENES[scene]
  const desc = `${label} preview using your palette: ${mode} background, ${roles?.primary} call-to-action, ${roles?.accent} highlights.`
  return (
    <div className="cs-pv-scene" data-scene={scene} data-mode={mode}>
      <div className="cs-pv-scene-head">
        <span className="cs-pv-scene-tag">{label}</span>
        <span className="cs-pv-scene-mode">{mode === 'dark' ? 'Dark' : 'Light'}</span>
      </div>
      <div className="cs-pv-canvas" ref={canvasRef} role="img" aria-label={desc}>
        <Scene />
      </div>
    </div>
  )
}

// Closing upgrade CTA — only rendered for non-Pro users (parent guards it).
function PreviewUpsell({ onUpgrade }) {
  return (
    <div className="cs-pv-upsell">
      <div className="cs-pv-upsell-copy">
        <strong>Two more scenes, fully recoloured.</strong>
        <span>Unlock the mobile feed and editorial article previews with Pro.</span>
      </div>
      <button type="button" className="btn btn-accent cs-pv-upsell-cta" onClick={onUpgrade}
        aria-label="Unlock Pro previews — upgrade">Unlock Pro previews</button>
    </div>
  )
}

// The five visible colour tools, each its own routed page under /create/<pagetitle>. The
// section tools re-enter the studio focused on their section (via the pathname
// effect below); tint + contrast are standalone pages. The footer at the bottom
// links across to all of them. Order mirrors the mega-menu.
const COLOUR_TOOLS = [
  { id: 'palette', label: 'Palette', route: '/create/palette', desc: 'Build the core ramp' },
  { id: 'semantic', label: 'Semantic Colour', route: '/create/semantic-color', desc: 'Success, warning, error' },
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
  states: 'Dial in success, warning, error and info colours. Start from a preset bundle or tune each state’s hue — every state gets a full 50–900 ramp.',
  systems: 'Start your UI colours from a proven foundation — load a design-system palette, borrow a brand’s colours, or pull named swatches from the classic libraries.',
  gradients: 'Blend gradients across your palette. Add and reposition stops, switch between linear, radial and conic, then copy the CSS in one click.',
}

export default function ColorStudio({ onCopy, toast }) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const { rounding } = useAppearance()
  const { design, setPalette, setStates, setTints, setGradient, saveProject, projects, loadProject, overwriteProject, canSaveProjects } = useProject()
  // `isPro` drives every Pro gate. The later upgrade-popup slice will also pull
  // `checkout` from here to wire real billing; Slice 1 doesn't (see onProGate).
  const { isPro } = useSubscription()

  // Real Pro gate (function prop): non-Pro users hit this instead of getting the
  // gated capability computed/rendered. Slice-1 stub — the toast IS the gate.
  // We deliberately do NOT call checkout() here: that hard-navigates
  // (window.location.href) and destroys the user's unsaved palette. The in-page
  // upgrade popup that wires the real checkout is an explicitly-later slice; this
  // stub only surfaces the lock. Wires the prop without touching billing files.
  // (`checkout` stays imported for that later slice / other callers.)
  const onProGate = useCallback((feature) => {
    const labels = {
      harmonies: 'Harmony systems are a Pro feature — upgrade to unlock',
      'extra-colours': 'Palettes beyond 8 colours are a Pro feature — upgrade to unlock',
      previews: 'Premium UI previews are a Pro feature — upgrade to unlock',
      'gallery-gradient': 'Editing a gallery gradient is a Pro feature — hit Reset to start your own',
    }
    toast?.(labels[feature] || 'This is a Pro feature')
  }, [toast])

  const [undoToast, setUndoToast] = useState(null)
  const undoTimerRef = useRef(null)
  const showUndoToast = useCallback((message, undoFn) => {
    clearTimeout(undoTimerRef.current)
    setUndoToast({ message, undoFn })
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000)
  }, [])
  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimerRef.current)
    setUndoToast(null)
  }, [])

  const [baseColor, setBaseColor] = useState(() => design?.palette?.base || '#2563EB')
  const [harmony, setHarmony] = useState(() => design?.palette?.harmony || 'auto')
  // Engine selector — 'auto' (HCT/Material-3 tonal) is the Slice-1 default and the
  // only mode wired so far. The Auto/HSL toggle UI is a later slice; we read+persist
  // `mode` now (so the value round-trips through ProjectContext) but don't expose a
  // setter until that toggle exists. Add `setMode` back when the toggle lands.
  const [mode] = useState(() => design?.palette?.mode || 'auto')
  const [globalAdjust, setGlobalAdjust] = useState(() => design?.palette?.globalAdjust || { h: 0, s: 0, b: 0, temp: 0 })
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
  const [stateColors, setStateColors] = useState(() => design?.states || { success: 1, warning: 0, error: 0, info: 0 })
  const [activeColorIdx, setActiveColorIdx] = useState(() => design?.palette?.activeIdx || 0)
  const [locked, setLocked] = useState(() => new Set(design?.palette?.locked || []))
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  // a11y live region for randomise / insert / lock announcements.
  const [liveMsg, setLiveMsg] = useState('')
  const [cssExpanded, setCssExpanded] = useState(false)
  const colorRef = useRef(null)
  // ── Slice 2 surfaces (§5.2) ──
  // Both menu+popup are tracked by INDEX (not colour value) so they follow live
  // edits (shade-replace/fix/edit) and survive duplicate colours. Opening one
  // closes the other. cbMode + recentEdits are EPHEMERAL (never persisted).
  const [ctxMenu, setCtxMenu] = useState(null)   // { idx, x, y, mode:'menu'|'sheet' } | null
  const [swPopup, setSwPopup] = useState(null)    // { idx, tab } | null
  const [cbMode, setCbMode] = useState('normal')  // 'normal' | one of CB_MODES
  const [recentEdits, setRecentEdits] = useState([])
  // The right-clicked / long-pressed swatch node — focus is restored here when a
  // surface closes (a11y). Set imperatively in the rail render.
  const ctxAnchorRef = useRef(null)
  const swAnchorRef = useRef(null)
  const [swAnchorRect, setSwAnchorRect] = useState(null)

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
  const [stopPickerIdx, setStopPickerIdx] = useState(null)

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

  // ── "See it shipped" Previews role mappings (Slice 4, §5) ──
  // Two pure, deterministic role objects derived from the live palette: one for
  // the dark hero scene, one for the light scenes (app/mobile/article). Computed
  // once per palette change and passed down; scenes never invent their own map.
  const rolesDark = useMemo(() => derivePreviewRoles(allColors, { mode: 'dark' }), [allColors])
  const rolesLight = useMemo(() => derivePreviewRoles(allColors, { mode: 'light' }), [allColors])

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
  // a11y note for the clash heuristic — read out, not just ringed (§5.6).
  const cbClashMsg = cbClash.size > 0
    ? `${cbClash.size} colours may be hard to tell apart in ${CB_LABELS[cbMode] || cbMode}.`
    : ''

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
  // Returns true if `n` swatches can be added now. When a non-Pro user would
  // exceed the cap, fires the Pro gate and returns false (caller adds nothing).
  const checkCanAdd = useCallback((n = 1) => {
    if (isPro) return true
    if (baseColors.length + n > PRO_MAX) { onProGate('extra-colours'); return false }
    return true
  }, [isPro, baseColors.length, onProGate])
  // Remaining free slots before the cap (Infinity for Pro). Used to clamp a
  // multi-colour merge (brand palettes) to what will fit.
  const freeSlotsLeft = useCallback(() => (isPro ? Infinity : Math.max(0, PRO_MAX - baseColors.length)), [isPro, baseColors.length])

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

  // Re-deal animation token: bump on randomise so unlocked cards replay cs-deal.
  const [dealToken, setDealToken] = useState(0)

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
    setDealToken(t => t + 1)
    setLiveMsg('Palette randomised')
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

  const toggleLock = useCallback((idx) => {
    setLocked(prev => {
      const next = new Set(prev)
      if (next.has(idx)) { next.delete(idx); setLiveMsg('Colour unlocked') }
      else { next.add(idx); setLiveMsg('Colour locked') }
      return next
    })
  }, [])


  const resetPalette = useCallback(() => {
    const prev = { base: baseColor, harmony, extras: [...extraColors], ovr: { ...overrides }, idx: activeColorIdx }
    setBaseColor('#2563EB')
    setHarmony('auto')
    setExtraColors([])
    setOverrides({})
    setActiveColorIdx(0)
    showUndoToast('Palette reset to default', () => {
      setBaseColor(prev.base)
      setHarmony(prev.harmony)
      setExtraColors(prev.extras)
      setOverrides(prev.ovr)
      setActiveColorIdx(prev.idx)
    })
  }, [baseColor, harmony, extraColors, overrides, activeColorIdx, showUndoToast])

  // Colour System popup (CS#3.14, Slice 3) — replaced the old cs-add-menu dropdown.
  const [csysOpen, setCsysOpen] = useState(false)
  const csysAnchorRef = useRef(null)
  // Capture the trigger rect AT CLICK TIME (mirrors Slice 2's swAnchorRect) so the
  // popup anchors to where the button was when opened, not a stale live rect read
  // during render after a layout shift.
  const [csysAnchorRect, setCsysAnchorRect] = useState(null)
  const closeCsys = useCallback(() => setCsysOpen(false), [])
  // Close on route change (the popup is anchored to a page-local trigger).
  useEffect(() => {
    if (!csysOpen) return
    const onPop = () => setCsysOpen(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [csysOpen])

  // Commit a previewed free-tier ramp (Generate tab) — clamps to the cap.
  const addSystemRamp = useCallback((ramp) => {
    const slots = freeSlotsLeft()
    const toAdd = ramp.filter(c => !allColors.map(x => x.toUpperCase()).includes(c.toUpperCase())).slice(0, slots === Infinity ? ramp.length : slots)
    if (!isPro && ramp.length > toAdd.length && freeSlotsLeft() < ramp.length) onProGate('extra-colours')
    if (!toAdd.length) {
      // Nothing to add: either the palette has room and these are all dupes (tell the
      // user, don't fail silently), or the cap is blocking — let checkCanAdd fire the
      // Pro gate so the lock is surfaced rather than swallowed.
      if (isPro || freeSlotsLeft() > 0) toast?.('These colours are already in your palette')
      else checkCanAdd(1)
      return
    }
    const prev = [...extraColors]
    setExtraColors([...extraColors, ...toAdd])
    showUndoToast(`Added ${toAdd.length} colour${toAdd.length === 1 ? '' : 's'}`, () => setExtraColors(prev))
    setCsysOpen(false)
  }, [allColors, extraColors, freeSlotsLeft, isPro, onProGate, checkCanAdd, showUndoToast, toast])

  // Commit sampled image colours (Image tab) — same clamp + undo path as brands.
  const addSampledColors = useCallback((hexes) => {
    const slots = freeSlotsLeft()
    const fresh = hexes.filter(c => !allColors.map(x => x.toUpperCase()).includes(c.toUpperCase()))
    const toAdd = slots === Infinity ? fresh : fresh.slice(0, slots)
    if (fresh.length > toAdd.length) onProGate('extra-colours')
    if (toAdd.length) {
      const prev = [...extraColors]
      setExtraColors([...extraColors, ...toAdd])
      showUndoToast(`Added ${toAdd.length} colour${toAdd.length === 1 ? '' : 's'} from image`, () => setExtraColors(prev))
    } else if (!fresh.length) {
      toast?.('Those colours are already in your palette')
    }
    setCsysOpen(false)
  }, [allColors, extraColors, freeSlotsLeft, onProGate, showUndoToast, toast])

  // Add a single colour (per-swatch brand affordance) via the cap chokepoint.
  const addSingleColor = useCallback((hex) => {
    if (allColors.map(x => x.toUpperCase()).includes(hex.toUpperCase())) { toast?.('That colour is already in your palette'); return }
    if (!checkCanAdd(1)) return
    const prev = [...extraColors]
    setExtraColors([...extraColors, hex])
    showUndoToast('Colour added', () => setExtraColors(prev))
  }, [allColors, extraColors, checkCanAdd, showUndoToast, toast])

  const [gradPresetsExpanded, setGradPresetsExpanded] = useState(false)
  const [saveProjectName, setSaveProjectName] = useState('')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [namedLibrary, setNamedLibrary] = useState('css')
  const [namedSearch, setNamedSearch] = useState('')

  const allTintScales = useMemo(() => {
    return allColors.map(c => generateTintScale({
      hex: c, anchor: 5, hueShift: 0,
      satMin: -satDecay, satMax: satDecay / 2,
      lMin: oled ? 3 : 5, lMax: lumBias, mode: 'perceived',
    }))
  }, [allColors, lumBias, satDecay, oled])

  const paletteGradients = useMemo(() => {
    if (allColors.length < 2) return []
    const results = []
    for (let i = 0; i < allColors.length && results.length < 10; i++) {
      for (let j = i + 1; j < allColors.length && results.length < 10; j++) {
        results.push({
          n: `${(ROLES[i] || 'C' + (i + 1))} → ${(ROLES[j] || 'C' + (j + 1))}`,
          stops: [{ color: allColors[i], position: 0 }, { color: allColors[j], position: 100 }],
          angle: 135, type: 'Linear',
        })
      }
    }
    if (results.length < 10 && tintScale.length >= 3) {
      results.push({ n: 'Tint fade', stops: [{ color: tintScale[1], position: 0 }, { color: tintScale[5], position: 50 }, { color: tintScale[9], position: 100 }], angle: 135, type: 'Linear' })
    }
    if (results.length < 10 && allColors.length >= 3) {
      results.push({ n: 'Trio sweep', stops: [{ color: allColors[0], position: 0 }, { color: allColors[1], position: 50 }, { color: allColors[2], position: 100 }], angle: 90, type: 'Linear' })
    }
    return results.slice(0, 10)
  }, [allColors, tintScale])

  // "Custom (Hue Offset)" is a FREE manual path by design — it's a single
  // hue-rotated colour, the sibling of per-swatch manual editing. Only harmony
  // *systems* (analogous/complement/triadic/split-comp) are Pro. It still passes
  // through the shared 6-colour cap via checkCanAdd.
  const addColor = () => {
    if (!checkCanAdd(1)) { setCsysOpen(false); return }
    const [h] = hexToHsl(baseColor)
    const offset = (extraColors.length + 1) * 47
    setExtraColors([...extraColors, hslToHex((h + offset) % 360, 55, 55)])
    setCsysOpen(false)
  }

  // The native <input type="color"> fires onChange continuously while the user
  // drags inside the picker, and a real 'change' event only once on commit.
  // We append a single swatch on the first onChange of a session, then update
  // that same swatch in place for the rest of the drag — and reset the session
  // on commit so the next pick adds a fresh swatch instead of clobbering.
  const addSessionRef = useRef(null)
  const addCustomColor = (hex) => {
    if (addSessionRef.current == null) {
      // First onChange of a session = a real add → consume a slot / check the cap.
      // Subsequent drags update the same swatch in place (no new slot, no check).
      if (!checkCanAdd(1)) return
      addSessionRef.current = extraColors.length
      setExtraColors([...extraColors, hex])
    } else {
      const at = addSessionRef.current
      setExtraColors(extraColors.map((c, i) => (i === at ? hex : c)))
    }
  }
  const endAddSession = useCallback((node) => {
    if (!node) return
    node.addEventListener('change', () => { addSessionRef.current = null })
  }, [])

  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx) }
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      // Reorder the RAW base palette (write-backs operate on baseColors, not the
      // adjusted view) so the global-adjust lens stays consistent after a move.
      const reordered = [...baseColors]
      const [moved] = reordered.splice(dragIdx, 1)
      reordered.splice(dragOverIdx, 0, moved)
      const newLocked = new Set()
      locked.forEach(li => {
        if (li === dragIdx) newLocked.add(dragOverIdx)
        else if (dragIdx < dragOverIdx && li > dragIdx && li <= dragOverIdx) newLocked.add(li - 1)
        else if (dragIdx > dragOverIdx && li >= dragOverIdx && li < dragIdx) newLocked.add(li + 1)
        else newLocked.add(li)
      })
      setLocked(newLocked)
      setBaseColor(reordered[0])
      setOverrides(Object.fromEntries(reordered.slice(1, colors.length).map((c, i) => [i + 1, c])))
      setExtraColors(reordered.slice(colors.length))
      if (activeColorIdx === dragIdx) setActiveColorIdx(dragOverIdx)
      else if (dragIdx < dragOverIdx && activeColorIdx > dragIdx && activeColorIdx <= dragOverIdx) setActiveColorIdx(activeColorIdx - 1)
      else if (dragIdx > dragOverIdx && activeColorIdx >= dragOverIdx && activeColorIdx < dragIdx) setActiveColorIdx(activeColorIdx + 1)
      // Reorder remaps indices; any open surface tracks by index, so its idx is now
      // stale (would render a DIFFERENT swatch's data). Close rather than remap.
      setSwPopup(null); setSwAnchorRect(null); setCtxMenu(null)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const editPaletteColor = (idx, hex) => {
    if (idx === 0) {
      // Index 0 is the base colour itself — keep it as the source of truth.
      setBaseColor(hex)
    } else if (idx < colors.length) {
      // Override a harmony-generated swatch in place (visible everywhere).
      setOverrides(prev => ({ ...prev, [idx]: hex }))
    } else {
      const eIdx = idx - colors.length
      setExtraColors(extraColors.map((c, i) => i === eIdx ? hex : c))
    }
  }

  // ── Slice 2 surface handlers (§5.1/§5.2) ──
  // Opening either surface closes the other (one job per screen). The context
  // menu is the fast path (right-click / long-press); the popup is the deep path.
  // CB mode disables both — you judge a simulation, you don't edit through it.
  const cbActive = cbMode !== 'normal'
  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])
  const closeSwPopup = useCallback(() => { setSwPopup(null); setSwAnchorRect(null) }, [])
  const openCtxMenu = useCallback((idx, x, y, mode = 'menu') => {
    if (cbActive) { setLiveMsg('Exit colour-vision mode to edit.'); if (toast) toast('Exit colour-vision mode to edit.'); return }
    setSwPopup(null); setSwAnchorRect(null)
    setCtxMenu({ idx, x, y, mode })
  }, [cbActive, toast])
  const openSwatchPopup = useCallback((idx, tab = 'values', rect = null) => {
    if (cbActive) { setLiveMsg('Exit colour-vision mode to edit.'); if (toast) toast('Exit colour-vision mode to edit.'); return }
    setCtxMenu(null)
    setSwAnchorRect(rect)
    setSwPopup({ idx, tab })
  }, [cbActive, toast])

  // Replace a swatch's colour from a popup action (edit / shade / fix). Writes
  // through editPaletteColor (raw base layer), pushes the value into the session
  // recent-edits history, and offers a one-tap undo. `source` is advisory only.
  const replaceSwatch = useCallback((idx, hex) => {
    const next = (hex || '').toUpperCase()
    if (!/^#[0-9A-F]{6}$/.test(next)) return
    const prev = { base: baseColor, ovr: { ...overrides }, extras: [...extraColors] }
    editPaletteColor(idx, next)
    setRecentEdits(list => [next, ...list.filter(h => h.toUpperCase() !== next)].slice(0, 8))
    showUndoToast('Colour updated', () => {
      setBaseColor(prev.base)
      setOverrides(prev.ovr)
      setExtraColors(prev.extras)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, overrides, extraColors, colors.length, showUndoToast])

  const resetGlobalAdjust = useCallback(() => setGlobalAdjust({ h: 0, s: 0, b: 0, temp: 0 }), [])

  // ── Long-press → bottom-sheet context menu (≤480, §4.A) ──
  // 450ms hold with a >10px move / scroll cancel. Touch only; right-click is the
  // desktop path. Refs (not state) so the timer never triggers a render mid-press.
  const lpTimer = useRef(null)
  const lpStart = useRef(null)
  const lpFired = useRef(false)
  // Unmount cleanup: a pending long-press would otherwise fire setCtxMenu on an
  // unmounted component (mirrors gapTimerRef/adjustRafRef cleanups).
  useEffect(() => () => clearTimeout(lpTimer.current), [])
  const cancelLongPress = useCallback(() => {
    clearTimeout(lpTimer.current)
    lpTimer.current = null
    lpStart.current = null
  }, [])
  const onSwatchTouchStart = useCallback((idx, node) => (e) => {
    if (cbActive || e.touches.length !== 1) return
    const t = e.touches[0]
    lpStart.current = { x: t.clientX, y: t.clientY }
    lpFired.current = false
    clearTimeout(lpTimer.current)
    lpTimer.current = setTimeout(() => {
      lpFired.current = true
      ctxAnchorRef.current = node
      openCtxMenu(idx, t.clientX, t.clientY, 'sheet')
    }, 450)
  }, [cbActive, openCtxMenu])
  const onSwatchTouchMove = useCallback((e) => {
    if (!lpStart.current || !e.touches.length) return
    const t = e.touches[0]
    if (Math.abs(t.clientX - lpStart.current.x) > 10 || Math.abs(t.clientY - lpStart.current.y) > 10) cancelLongPress()
  }, [cancelLongPress])
  const onSwatchTouchEnd = useCallback(() => cancelLongPress(), [cancelLongPress])

  // Write a whole RAW palette array back into base/overrides/extras. The first
  // `colors.length` slots map to base(0)+overrides(1..), the rest become extras.
  // Used by gap-insert and keyboard reorder so they stay in the non-destructive
  // base layer (the adjust lens recomputes the displayed colours).
  const writeRawPalette = useCallback((next) => {
    if (!next.length) return
    setBaseColor(next[0])
    setOverrides(Object.fromEntries(next.slice(1, colors.length).map((c, i) => [i + 1, c])))
    setExtraColors(next.slice(colors.length))
  }, [colors.length])

  // Insert N evenly-spaced colours at the Lab/tonal midpoints between two
  // neighbours (CS#3.5). N=1 → t=.5. Routes through the shared checkCanAdd cap
  // chokepoint (anti-tamper): a non-Pro insert that would exceed 6 fires the Pro
  // gate and inserts nothing.
  const insertBetween = useCallback((leftIdx, count) => {
    const n = Math.max(1, Math.min(3, count))
    const a = baseColors[leftIdx]
    const b = baseColors[leftIdx + 1]
    if (!a || !b) return
    if (!checkCanAdd(n)) return
    const mids = []
    for (let k = 1; k <= n; k++) mids.push(mixHex(a, b, k / (n + 1)))
    const next = [...baseColors.slice(0, leftIdx + 1), ...mids, ...baseColors.slice(leftIdx + 1)]
    // Shift locks past the insertion point.
    setLocked(prev => {
      const out = new Set()
      prev.forEach(li => out.add(li > leftIdx ? li + n : li))
      return out
    })
    writeRawPalette(next)
    setDealToken(t => t + 1)
    setLiveMsg(`Inserted ${n} colour${n > 1 ? 's' : ''}`)
  }, [baseColors, checkCanAdd, writeRawPalette])

  // Keyboard reorder (a11y): ArrowLeft/Right on a focused card moves it.
  const moveCard = useCallback((idx, dir) => {
    const target = idx + dir
    if (target < 0 || target >= baseColors.length) return
    const next = [...baseColors]
    const [moved] = next.splice(idx, 1)
    next.splice(target, 0, moved)
    setLocked(prev => {
      const out = new Set()
      prev.forEach(li => {
        if (li === idx) out.add(target)
        else if (dir > 0 && li === target) out.add(idx)
        else if (dir < 0 && li === target) out.add(idx)
        else out.add(li)
      })
      return out
    })
    writeRawPalette(next)
    if (activeColorIdx === idx) setActiveColorIdx(target)
    // Reorder remaps indices; close any index-tracked surface so it can't show the
    // wrong swatch's data (mirrors handleDragEnd).
    setSwPopup(null); setSwAnchorRect(null); setCtxMenu(null)
    setLiveMsg(`Moved colour to position ${target + 1}`)
  }, [baseColors, activeColorIdx, writeRawPalette])

  // Gap-insert count cycling: click +1; click again within 600ms cycles 1→2→3;
  // commit on timeout. State: { idx, count } for the active gap.
  const [gapState, setGapState] = useState(null)
  const gapTimerRef = useRef(null)
  const handleGapClick = useCallback((leftIdx) => {
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current)
    setGapState(prev => {
      const count = prev && prev.idx === leftIdx ? (prev.count % 3) + 1 : 1
      gapTimerRef.current = setTimeout(() => {
        insertBetween(leftIdx, count)
        setGapState(null)
      }, 600)
      return { idx: leftIdx, count }
    })
  }, [insertBetween])
  useEffect(() => () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current) }, [])

  // Global-adjust slider write — rAF-throttled so a fast drag coalesces to one
  // state update per frame (<16ms), avoiding re-render thrash on the rail.
  const adjustRafRef = useRef(null)
  const adjustPendingRef = useRef(null)
  const updateAdjust = useCallback((key, value) => {
    // Merge into the pending slot (don't overwrite) so two sliders moved within the
    // same frame both land — otherwise the second clobbers the first.
    adjustPendingRef.current = { ...(adjustPendingRef.current || {}), [key]: value }
    if (adjustRafRef.current) return
    adjustRafRef.current = requestAnimationFrame(() => {
      adjustRafRef.current = null
      const p = adjustPendingRef.current
      adjustPendingRef.current = null
      if (p) setGlobalAdjust(prev => ({ ...prev, ...p }))
    })
  }, [])
  useEffect(() => () => { if (adjustRafRef.current) cancelAnimationFrame(adjustRafRef.current) }, [])

  // Brand-palette merge can add several swatches: for a non-Pro user clamp the
  // appended slice to the remaining free slots, and fire the Pro gate if the merge
  // would have overflowed the cap (so the lock is surfaced, not silently swallowed).
  // Wired to the Colour System popup's Brands tab (onAddBrand).
  const addBrandColors = useCallback((brand) => {
    const newColors = brand.colors.filter(c => !allColors.map(x => x.toUpperCase()).includes(c.toUpperCase())).slice(0, 3)
    const slots = freeSlotsLeft()
    const toAdd = newColors.slice(0, slots)
    // Surface the Pro gate when the cap clipped the merge; that branch owns its own
    // toast, so don't also claim the colours were duplicates (that would be a lie).
    const capped = newColors.length > toAdd.length
    if (capped) onProGate('extra-colours')
    if (toAdd.length) {
      const prev = [...extraColors]
      setExtraColors([...extraColors, ...toAdd])
      showUndoToast(`Added ${brand.n} palette`, () => setExtraColors(prev))
    } else if (!capped) {
      toast?.('All of those colours are already in your palette')
    }
    setCsysOpen(false)
  }, [allColors, extraColors, freeSlotsLeft, onProGate, showUndoToast, toast])

  const removeExtra = (i) => {
    const prev = { extras: [...extraColors], idx: activeColorIdx }
    // Functional form: a double-tap remove must filter the latest list, not the one
    // closed over at render (which would resurrect the first-removed swatch).
    setExtraColors(prevExtras => prevExtras.filter((_, idx) => idx !== i))
    if (activeColorIdx >= colors.length + i) setActiveColorIdx(0)
    showUndoToast('Swatch removed', () => {
      setExtraColors(prev.extras)
      setActiveColorIdx(prev.idx)
    })
  }

  const applyBrand = (brand) => {
    const prev = { base: baseColor, harmony, extras: [...extraColors], ovr: { ...overrides }, idx: activeColorIdx }
    setBaseColor(brand.colors[0])
    setExtraColors(brand.colors.slice(5))
    setOverrides({})
    setActiveColorIdx(0)
    showUndoToast(`Applied ${brand.n} palette`, () => {
      setBaseColor(prev.base)
      setHarmony(prev.harmony)
      setExtraColors(prev.extras)
      setOverrides(prev.ovr)
      setActiveColorIdx(prev.idx)
    })
  }

  const applyDesignSystem = (ds) => {
    const prev = { base: baseColor, harmony, extras: [...extraColors], ovr: { ...overrides }, idx: activeColorIdx }
    setBaseColor(ds.base)
    setExtraColors(ds.colors.slice(1))
    setOverrides({})
    setActiveColorIdx(0)
    showUndoToast(`Applied ${ds.n} palette`, () => {
      setBaseColor(prev.base)
      setHarmony(prev.harmony)
      setExtraColors(prev.extras)
      setOverrides(prev.ovr)
      setActiveColorIdx(prev.idx)
    })
  }

  const stateCSS = Object.entries(stateColors).map(([state, sel]) => {
    const shades = resolveStateShades(state, sel)
    return shades.map((c, i) => `  --color-${state}-${STATE_LABELS[i]}: ${c};`).join('\n')
  }).join('\n')
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
      return [state, { soft: shades[0], border: shades[2], strong: shades[6], ink: shades[8] }]
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
  const fullCSS = `:root {\n${allColors.map((x, i) => `  --color-${i + 1}: ${x};`).join('\n')}\n\n${stateCSS}\n}`

  const resolveStop = (s, i) => s.color || allColors[i] || allColors[0]
  const gradFn = gradType === 'Radial' ? 'radial-gradient' : gradType === 'Conic' ? 'conic-gradient' : 'linear-gradient'
  const angleStr = gradType === 'Linear' ? `${gradAngle}deg, ` : gradType === 'Conic' ? `from ${gradAngle}deg, ` : ''
  const gradCSS = `${gradFn}(${angleStr}${gradStops.map((s, i) => `${resolveStop(s, i)} ${s.position}%`).join(', ')})`
  // A gallery gradient (carried in via the shared design.gradient.source flag) is
  // free to preview + copy here too, but reshaping it is Pro — mirroring the gate
  // in GradientGenerator. guardGradEdit raises the toast and blocks the edit; the
  // escape hatches (Reset / preset chips) clear source back to 'own' so the
  // resulting from-scratch gradient is freely editable.
  const gradFromLibrary = design?.gradient?.source === 'gallery'
  const gradEditLocked = gradFromLibrary && !isPro
  const guardGradEdit = () => { if (!gradFromLibrary || isPro) return true; onProGate('gallery-gradient'); return false }
  const addGradStop = () => {
    if (!guardGradEdit()) return
    const sorted = [...gradStops].sort((a, b) => a.position - b.position)
    const lastTwo = sorted.slice(-2)
    const midPos = Math.round((lastTwo[0].position + lastTwo[1].position) / 2)
    const c1 = hexToRgb(resolveStop(lastTwo[0], gradStops.indexOf(lastTwo[0])))
    const c2 = hexToRgb(resolveStop(lastTwo[1], gradStops.indexOf(lastTwo[1])))
    const midHex = '#' + [0, 1, 2].map(i => Math.round((c1[i] + c2[i]) / 2).toString(16).padStart(2, '0')).join('')
    setGradStops([...gradStops, { color: midHex, position: midPos }])
  }
  const removeGradStop = (idx) => { if (!guardGradEdit()) return; if (gradStops.length > 2) setGradStops(gradStops.filter((_, i) => i !== idx)) }
  const updateStop = (idx, updates) => { if (!guardGradEdit()) return; setGradStops(gradStops.map((s, i) => i === idx ? { ...s, ...updates } : s)) }
  const applyPreset = (preset) => { setGradStops(preset.stops.map(s => ({ color: s.color, position: s.pos }))); setGradAngle(preset.angle); setGradType(preset.type); setStopPickerIdx(null); setGradient({ source: 'own' }) }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Colour</div>
        <h1>{soloSection ? SOLO_TITLES[soloSection] : t('color.title')}</h1>
        <p>{soloSection ? SOLO_DESC[soloSection] : t('tools.colorStudio.description')}</p>
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

      {/* Section pill-nav only exists on the merged /create/color studio — a
          standalone tool page has exactly one section, nothing to jump to. */}
      {!soloSection && (
        <nav className="cs-pillnav" aria-label="Colour Studio sections" ref={navRef}>
          <span className="cs-pillnav-thumb" aria-hidden="true" ref={thumbRef} />
          {SECTIONS.map(s => (
            <button
              key={s.id}
              ref={el => { itemRefs.current[s.id] = el }}
              className={`cs-pillnav-item${activeSection === s.id ? ' active' : ''}`}
              aria-current={activeSection === s.id ? 'true' : undefined}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >{s.label}</button>
          ))}
        </nav>
      )}

      {/* ═══ SECTION 1: PALETTE BUILDER ═══ */}
      {(!soloSection || soloSection === 'palette') && (
      <section id="palette" className="cs-pb-section">
        <div className={soloSection ? 'cs-section-header cs-pb-header cs-solo-toolbar' : 'cs-section-header cs-pb-header'} onClick={soloSection ? undefined : () => toggleCollapse('palette')}>
          {!soloSection && <>
            <svg className={`cs-chevron${collapsed.palette ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <h2 className="cs-pb-title">Palette Builder</h2>
          </>}
          <button className="btn btn-accent btn-s cs-pb-randomize" onClick={(e) => { e.stopPropagation(); randomize() }} title="Random palette (or press Spacebar)">
            <ShuffleIcon size={14} />
            Randomise
            <kbd className="cs-pb-kbd">Space</kbd>
          </button>
          <button className="btn btn-s cs-pb-reset" onClick={(e) => { e.stopPropagation(); resetPalette() }} title="Reset palette to default">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
          {/* Colour System popup trigger (CS#3.14, Slice 3). Opens cs-csys-popup —
              the Generate / Image / Brands surface that replaced the old dropdown. */}
          <button ref={csysAnchorRef} type="button"
            className="btn btn-s cs-pb-add-trigger cs-csys-trigger"
            aria-label="Open Colour System" aria-haspopup="dialog" aria-expanded={csysOpen}
            onClick={(e) => { e.stopPropagation(); setCsysOpen(o => { if (!o) setCsysAnchorRect(csysAnchorRef.current?.getBoundingClientRect()); return !o }) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" />
            </svg>
            Colour System
          </button>
        </div>

        {(soloSection === 'palette' || !collapsed.palette) && <>
        {/* a11y: announce randomise / insert / lock / move to screen readers. */}
        <p className="cs-pb-live" aria-live="polite" role="status">{liveMsg}</p>

        {/* Colour-vision lens toggle (CS#3.9, §4.C). Palette-level control grouped
            above the rail (common region). Sliding-pill on >380; a labelled
            <select> on ≤380 (Hick — a select is fine for 5 exclusive options on a
            tiny screen). cbMode is EPHEMERAL — never persisted. */}
        <div className="cs-cb-wrap">
          <span className="cs-cb-title" id="cs-cb-label">Colour vision</span>
          <div ref={cbBarRef} className="cs-cb-toggle" role="radiogroup" aria-labelledby="cs-cb-label">
            {CB_MODES.map(m => (
              <button key={m.value} ref={el => (cbSegRefs.current[m.value] = el)}
                className={`cs-cb-seg${cbMode === m.value ? ' active' : ''}`}
                role="radio" aria-checked={cbMode === m.value} aria-label={m.desc}
                onClick={() => setCbMode(m.value)}>
                <span className="cs-cb-seg-full">{m.label}</span>
                <span className="cs-cb-seg-abbr" aria-hidden="true">{m.short}</span>
              </button>
            ))}
            <span ref={cbThumbRef} className="cs-cb-thumb" aria-hidden="true" />
          </div>
          {/* ≤380 fallback — same state, different control (CSS hides one or the other). */}
          <label className="cs-cb-select-wrap">
            <span className="cs-cb-select-label">Colour vision</span>
            <select className="cs-cb-select" value={cbMode} onChange={e => setCbMode(e.target.value)}
              aria-label="Colour vision simulation">
              {CB_MODES.map(m => <option key={m.value} value={m.value}>{m.desc}</option>)}
            </select>
          </label>
        </div>

        {/* Active-lens banner — the visible text that names what's simulated, so the
            mode is never ambiguous (and SR users hear it). Hex values unchanged. */}
        {cbActive && (
          <div className="cs-cb-banner" role="status">
            <svg className="cs-cb-banner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /></svg>
            <span>Simulating {CB_LABELS[cbMode]} — colours shown are how your palette appears; hex values are unchanged.</span>
            <button className="cs-cb-banner-exit" onClick={() => setCbMode('normal')}>Back to normal</button>
          </div>
        )}
        {/* Clash heuristic note — read out, not just a ring on the swatch. */}
        <p className="cs-pb-live" aria-live="polite" role="status">{cbClashMsg}</p>

        {/* Base colour + harmony quick-switch. The base picker is free; the
            harmony *systems* are Pro (CS#3.7) — a non-Pro click routes to the
            gate and does NOT recompute the harmony (anti-tamper). */}
        <div className="cs-pb-base">
          <div className="cs-pb-base-swatch">
            <span className="cs-pb-base-chip" style={{ background: baseColor }} aria-hidden="true" />
            <input
              ref={colorRef}
              type="color"
              value={baseColor}
              onChange={e => { setBaseColor(e.target.value); setOverrides({}); trackColourPick(e.target.value) }}
              aria-label="Pick base colour"
              className="cs-pb-base-input"
            />
          </div>
          <input
            type="text" value={baseColor.toUpperCase()} className="cs-pb-base-hex"
            aria-label="Base colour hex"
            onChange={e => { let v = e.target.value; if (!v.startsWith('#')) v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) { setBaseColor(v); setOverrides({}) } }}
          />
          <span className="cs-pb-base-div" aria-hidden="true" />
          <div className="cs-pb-harms">
            {HARMS.map(h => {
              const free = h === 'analogous' || h === 'custom' || h === 'monochromatic'
              return (
                <button key={h}
                  className={`pt-t${harmony === h ? ' on' : ''}${!free && !isPro ? ' cs-pro-lock' : ''}`}
                  onClick={() => {
                    if (!free && !isPro) { onProGate('harmonies'); return }
                    setHarmony(h); setOverrides({})
                  }}
                >{HARM_LABELS[h]}{!free && !isPro && <LockGlyph size={10} />}</button>
              )
            })}
          </div>
        </div>

        {/* Palette rail — tonal-glass cards (CS#3.1/3.3/3.4/3.5/3.10/3.16). */}
        <div className={`cs-pb-rail${cbActive ? ' cb-on' : ''}`}>
          {allColors.map((color, i) => {
            const isActive = i === activeColorIdx
            const isExtra = i >= colors.length
            const isLocked = locked.has(i)
            const isDragGhost = dragIdx === i
            const isDragOver = dragOverIdx === i && dragIdx !== i
            const role = ROLES[i] || `CUSTOM ${i - colors.length + 1}`
            const tints = tonalRamp(color, [30, 45, 60, 75, 90])
            // Displayed background = simulated under the CB lens; the hex label and
            // every action still use `color` (the true value). Never mutate source.
            const shownColor = cbActive ? cbColors[i] : color
            const fg = textColorForBg(shownColor)
            const isClash = cbActive && cbClash.has(i)
            return (
              // Re-deal animation replays by remounting on dealToken change; the
              // token must key the OUTERMOST node (the Fragment) so the swatch
              // div is actually torn down and re-created (CS-1).
              <Fragment key={`${i}-${dealToken}`}>
                {/* Gap-insert zone before every card except the first (CS#3.5). */}
                {i > 0 && (() => {
                  // The gap cycles 1→2→3 inserts on repeat activation; the label
                  // reflects the count that the NEXT activation will insert so SR
                  // users hear what they're about to do (code-review #10).
                  const gapCount = gapState && gapState.idx === i - 1 ? gapState.count : 1
                  const between = `between ${ROLES[i - 1] || 'colour ' + i} and ${role}`
                  return (
                    <div className="cs-pb-gap"
                      onClick={() => handleGapClick(i - 1)}
                      role="button" tabIndex={0}
                      aria-label={`Insert ${gapCount} colour${gapCount > 1 ? 's' : ''} ${between}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGapClick(i - 1) } }}
                    >
                      <span className="cs-pb-gap-btn" aria-hidden="true">
                        {gapState && gapState.idx === i - 1
                          ? <span className="cs-pb-gap-count">{gapState.count}</span>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>}
                      </span>
                    </div>
                  )
                })()}
                <div
                  className={`cs-pb-swatch${isActive ? ' active' : ''}${isLocked ? ' locked' : ''}${isDragGhost ? ' drag-ghost' : ''}${isDragOver ? ' drag-over' : ''}${isClash ? ' cs-cb-clash' : ''} cs-d${Math.min(i, 5)}`}
                  ref={el => { if (el && ctxMenu?.idx === i) ctxAnchorRef.current = el; if (el && swPopup?.idx === i) swAnchorRef.current = el }}
                  draggable={!cbActive}
                  onDragStart={() => { if (!cbActive) handleDragStart(i) }}
                  onDragOver={(e) => { if (!cbActive) handleDragOver(e, i) }}
                  onDragEnd={handleDragEnd}
                  onClick={() => { if (cbActive) return; setActiveColorIdx(i); onCopy(color) }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (cbActive) { setLiveMsg('Exit colour-vision mode to edit.'); if (toast) toast('Exit colour-vision mode to edit.'); return }
                    ctxAnchorRef.current = e.currentTarget
                    openCtxMenu(i, e.clientX, e.clientY, window.matchMedia('(max-width: 480px)').matches ? 'sheet' : 'menu')
                  }}
                  onTouchStart={(e) => onSwatchTouchStart(i, e.currentTarget)(e)}
                  onTouchMove={onSwatchTouchMove}
                  onTouchEnd={onSwatchTouchEnd}
                  onTouchCancel={onSwatchTouchEnd}
                  onKeyDown={(e) => {
                    if (cbActive) return
                    if (e.key === 'ArrowLeft') { e.preventDefault(); moveCard(i, -1) }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); moveCard(i, 1) }
                    else if (e.key === 'Enter') { setActiveColorIdx(i); onCopy(color) }
                    else if (e.shiftKey && e.key === 'F10') {
                      e.preventDefault()
                      const r = e.currentTarget.getBoundingClientRect()
                      ctxAnchorRef.current = e.currentTarget
                      openCtxMenu(i, r.left + r.width / 2, r.top + 40, window.matchMedia('(max-width: 480px)').matches ? 'sheet' : 'menu')
                    } else if (e.key === 'ContextMenu') {
                      e.preventDefault()
                      const r = e.currentTarget.getBoundingClientRect()
                      ctxAnchorRef.current = e.currentTarget
                      openCtxMenu(i, r.left + r.width / 2, r.top + 40, window.matchMedia('(max-width: 480px)').matches ? 'sheet' : 'menu')
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${role} ${color.toUpperCase()}${isLocked ? ', locked' : ''}${cbActive ? ', simulated colour' : ''}${isClash ? ', hard to distinguish from another swatch' : ''}. Arrow keys reorder, Enter copies.`}
                  style={{ background: shownColor, color: fg }}
                >
                  {/* CB simulated micro-tag (§4.C) — names the swatch as a simulation. */}
                  {cbActive && <span className="cs-cb-tag" aria-hidden="true">simulated</span>}
                  {/* Hover/focus toolbar: drag · lock · copy · (i) · remove. */}
                  <div className="cs-pb-tools">
                    <span className="cs-pb-tool cs-pb-tool--drag" aria-hidden="true" title="Drag to reorder">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                    </span>
                    <button className={`cs-pb-tool${isLocked ? ' locked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLock(i) }}
                      title={isLocked ? 'Unlock colour' : 'Lock colour'} aria-label={isLocked ? 'Unlock colour' : 'Lock colour'} aria-pressed={isLocked}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {isLocked
                          ? <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
                          : <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>}
                      </svg>
                    </button>
                    <button className="cs-pb-tool" onClick={(e) => { e.stopPropagation(); onCopy(color) }} title="Copy hex" aria-label="Copy hex">
                      <CopyIcon size={12} />
                    </button>
                    <button className="cs-pb-tool" onClick={(e) => { e.stopPropagation(); ctxAnchorRef.current = e.currentTarget.closest('.cs-pb-swatch'); openSwatchPopup(i, 'values', e.currentTarget.closest('.cs-pb-swatch')?.getBoundingClientRect()) }} title="Colour details" aria-label="Colour details">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </button>
                    {isExtra && (
                      <button className="cs-pb-tool" onClick={(e) => { e.stopPropagation(); removeExtra(i - colors.length) }} title="Remove colour" aria-label="Remove colour">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>

                  <div className="cs-pb-swatch-meta">
                    <div className="cs-pb-role">{role}</div>
                    {/* Manual per-swatch set (CS#3.16): the hex label opens the popup's
                        Edit tab (the proper home for exact entry — picker + validated
                        hex field). Label always shows the TRUE colour, even under the
                        CB lens. */}
                    <button className="cs-pb-hex" onClick={(e) => { e.stopPropagation(); ctxAnchorRef.current = e.currentTarget.closest('.cs-pb-swatch'); openSwatchPopup(i, 'edit', e.currentTarget.closest('.cs-pb-swatch')?.getBoundingClientRect()) }}
                      title="Edit this colour" aria-label={`Edit ${role} colour, currently ${color.toUpperCase()}`}>
                      {color.toUpperCase()}
                    </button>
                  </div>

                  {/* Built-in tonal tints (CS#3.3) — the tonal ramp of this card. */}
                  <div className="cs-pb-tints" aria-hidden="true">
                    {tints.map((t, ti) => (
                      // tabIndex -1: the tints row is aria-hidden, so it must also
                      // be removed from the Tab order (CS-2) — copying the tint
                      // stays available via right-click info / the parent swatch.
                      <button key={ti} className="cs-pb-tint" style={{ background: t }}
                        title={t.toUpperCase()} tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); onCopy(t) }} />
                    ))}
                  </div>
                </div>
              </Fragment>
            )
          })}

          {/* Trailing "+ Add" card (CS#3.14) — the free single-colour add path
              and the entry point that becomes the Colour System popup later. */}
          <label className="cs-pb-add">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            <span className="cs-pb-add-label">Add</span>
            <input ref={endAddSession} type="color" value={baseColor}
              onChange={e => addCustomColor(e.target.value)}
              aria-label="Add a custom colour"
              className="cs-pb-add-input" />
          </label>
        </div>

        {/* Global adjust strip (CS#3.15) — non-destructive H/S/B/Temp lens over
            the whole palette. Writes globalAdjust; applyAdjust recomputes
            allColors live. rAF-throttled via the slider's native input event. */}
        <div className="cs-pb-adjust">
          {ADJUST_FIELDS.map(f => (
            <div className="cs-pb-adjust-field" key={f.key}>
              <span className="cs-pb-adjust-label">
                <span>{f.label}</span>
              </span>
              <SnapSlider min={f.min} max={f.max} value={globalAdjust[f.key]}
                defaultValue={0} snaps={[0]} unit={f.unit}
                ariaLabel={f.label}
                onChange={v => updateAdjust(f.key, v)} />
            </div>
          ))}
          <button className="cs-pb-adjust-reset"
            disabled={globalAdjust.h === 0 && globalAdjust.s === 0 && globalAdjust.b === 0 && globalAdjust.temp === 0}
            onClick={() => setGlobalAdjust({ h: 0, s: 0, b: 0, temp: 0 })}>Reset adjust</button>
        </div>

        {/* Compact CSS output */}
        <div className="card" style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setCssExpanded(!cssExpanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--t1)', padding: '8px 0', minHeight: 36 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .2s', transform: cssExpanded ? 'rotate(90deg)' : 'none' }}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
              CSS Variables
            </button>
            <button className="btn btn-s" onClick={() => onCopy(fullCSS)} style={{ padding: '4px 10px', fontSize: 10 }}>
              <CopyIcon /> Copy All
            </button>
          </div>
          {cssExpanded && (
            <div className="code" onClick={() => onCopy(fullCSS)} style={{ marginTop: 10, fontSize: 11, maxHeight: 260, overflow: 'auto' }}>
              {fullCSS}
            </div>
          )}
        </div>
        </>}
      </section>
      )}

      {/* ═══ SECTION 2: UI STATE COLORS ═══ */}
      {(!soloSection || soloSection === 'states') && (
      <section id="states" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className={`cs-section-header stc-head${soloSection ? ' solo' : ''}`} onClick={soloSection ? undefined : () => toggleCollapse('states')} style={{ marginBottom: collapsed.states && !soloSection ? 0 : 14 }}>
          {!soloSection && (
            <div className="stc-head-title">
              <svg className={`cs-chevron${collapsed.states ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Semantic Colours</h2>
            </div>
          )}
          <div className="stc-toolbar" onClick={e => e.stopPropagation()}>
            <div className="stc-toolbar-copy">
              <span className="stc-kicker">Semantic bundle</span>
              <span>{activeStateBundle?.name || 'Custom mix'} · 40 canonical tokens</span>
            </div>
            <button className="stc-copy-btn" onClick={copyStateTokens}>Copy all tokens</button>
          </div>
        </div>
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
              <h2 id="stc-preview-title">Check every state in context</h2>
              <p>Light and dark surfaces use the same roles, with a symbol and message so meaning never depends on colour alone.</p>
            </div>
          </div>
          <div className="stc-preview-grid">
            {['Light interface', 'Dark interface'].map((themeLabel, themeIndex) => (
              <div className={themeIndex ? 'stc-preview stc-preview--dark' : 'stc-preview'} key={themeLabel}>
                <div className="stc-preview-head">
                  <strong>{themeLabel}</strong>
                  <span>{activeStateBundle?.name || 'Custom mix'} bundle</span>
                </div>
                <div className="stc-example-list">
                  {Object.entries(STATE_META).map(([state, meta]) => (
                    <div className="stc-example" key={state} ref={semanticExampleRef(statePreview[state])}>
                      <span className="stc-example-cue" aria-hidden="true">{meta.cue}</span>
                      <span>
                        <strong>{meta.label}</strong>
                        <small>{meta.intent}</small>
                      </span>
                      <button type="button" onClick={() => onCopy(resolveStateShades(state, stateColors[state])[6])}>
                        Copy 600
                      </button>
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
            <p>Each role exports from <code>--color-success-50</code> through <code>--color-info-900</code>, ready for CSS or a token pipeline.</p>
            <button type="button" className="stc-copy-btn" onClick={copyStateTokens}>Copy 40 CSS variables</button>
          </div>
          <pre className="stc-code" tabIndex="0"><code>{`:root {\n${stateCSS}\n}`}</code></pre>
        </section>

        <nav className="stc-next" aria-label="Continue building the colour system">
          <div>
            <span className="stc-kicker">Next in the workflow</span>
            <strong>Validate the states, then connect them to the rest of your interface foundation.</strong>
          </div>
          <div>
            <NavLink to="/create/contrast">Check contrast <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/create/tint">Build tonal scales <span aria-hidden="true">→</span></NavLink>
            <NavLink to="/create/palette">Return to palette <span aria-hidden="true">→</span></NavLink>
          </div>
        </nav>
        </>}
      </section>
      )}

      {/* ═══ SECTION 3: DESIGN SYSTEMS ═══ */}
      {(!soloSection || soloSection === 'systems') && (
      <section id="systems" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        {/* Solo /color/ui: the hero already names the page, and this header holds
            no actions — drop it entirely instead of leaving an empty toolbar. */}
        {!soloSection && (
          <div className="cs-section-header" onClick={() => toggleCollapse('systems')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.systems ? 0 : 14 }}>
            <svg className={`cs-chevron${collapsed.systems ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Design Systems</h2>
          </div>
        )}
        {(soloSection === 'systems' || !collapsed.systems) && <>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.6 }}>
          Click a system to load its palette. Or start from a brand below.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px,100%), 1fr))', gap: 10, marginBottom: 20 }}>
          {DESIGN_SYSTEMS.map(ds => (
            <div key={ds.n} className="card-i" style={{ cursor: 'pointer', padding: 14 }} onClick={() => applyDesignSystem(ds)}
              role="button" tabIndex={0} aria-label={`Load ${ds.n} palette`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyDesignSystem(ds) } }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {ds.colors.map((c, ci) => (
                  <div key={ci} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid var(--border)' }} />
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ds.n}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Brand Palettes</h3>
        <div className="cs-brand-scroll">
          {BRANDS.map(brand => (
            <div key={brand.n} className="card-i" style={{ cursor: 'pointer', padding: 10, minWidth: 140, flexShrink: 0 }} onClick={() => applyBrand(brand)}
              role="button" tabIndex={0} aria-label={`Load ${brand.n} brand palette`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyBrand(brand) } }}>
              <div style={{ display: 'flex', height: 28, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                {brand.colors.map((c, ci) => <div key={ci} style={{ flex: 1, background: c }} />)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{brand.n}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>Named Colour Libraries</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {COLOR_LIBRARIES.map(lib => (
            <button key={lib.id} className={`pl-chip${namedLibrary === lib.id ? ' active' : ''}`} onClick={() => { setNamedLibrary(lib.id); setNamedSearch('') }}>
              {lib.name} <span style={{ fontSize: 9, opacity: .6 }}>({lib.colors.length})</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginBottom: 12, maxWidth: 300 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={namedSearch} onChange={e => setNamedSearch(e.target.value)} placeholder="Search colours..." style={{ paddingLeft: 32, width: '100%', fontSize: 12 }} />
        </div>
        {(() => {
          const lib = COLOR_LIBRARIES.find(l => l.id === namedLibrary)
          if (!lib) return null
          const q = namedSearch.trim().toLowerCase()
          const filtered = q ? lib.colors.filter(c => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q)) : lib.colors
          const closest = activeColor ? findClosestNamedColor(activeColor, namedLibrary) : null
          return <>
            {closest && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: closest.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--t1)' }}>Closest match: <strong>{closest.name}</strong> ({closest.hex})</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {filtered.slice(0, 80).map(c => (
                <div key={c.name} onClick={() => addCustomColor(c.hex)}
                  role="button" tabIndex={0} aria-label={`Add ${c.name} (${c.hex}) to palette`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addCustomColor(c.hex) } }}
                  style={{ cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', background: 'var(--bg-1)', transition: 'border-color .15s' }} title={`Add ${c.name} (${c.hex}) to palette`}>
                  <div style={{ height: 28, borderRadius: 4, background: c.hex, marginBottom: 4, border: '1px solid rgba(0,0,0,.06)' }} />
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{c.hex}</div>
                </div>
              ))}
            </div>
            {q && filtered.length === 0 && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8, padding: '12px 0', textAlign: 'center' }}>No colours found</div>}
            {filtered.length > 80 && <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>Showing 80 of {filtered.length} — search to narrow results</div>}
          </>
        })()}
        </>}
      </section>
      )}

      {/* ═══ SECTION 4: GRADIENT TOOL ═══ */}
      {(!soloSection || soloSection === 'gradients') && (
      <section id="gradients" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={soloSection ? undefined : () => toggleCollapse('gradients')} style={{ cursor: soloSection ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.gradients && !soloSection ? 0 : 14 }}>
          {!soloSection && <>
            <svg className={`cs-chevron${collapsed.gradients ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Gradient Tool</h2>
          </>}
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s" onClick={addGradStop}>{gradEditLocked && <LockGlyph size={11} />} + Add Stop</button>
            <button className="btn btn-s" onClick={() => { setGradStops([{ color: null, position: 0 }, { color: null, position: 100 }]); setGradient({ source: 'own' }) }} style={{ fontSize: 10 }}>Reset</button>
          </div>
        </div>

        {(soloSection === 'gradients' || !collapsed.gradients) && <>
        <div className="grad-big" style={{ background: gradCSS, borderRadius: 'var(--radius)' }}>
          <div className="grad-tags">
            <span className="grad-tag">{gradFn.toUpperCase()}</span>
            <span className="grad-tag">{gradAngle}&deg;</span>
            <span className="grad-tag">{gradStops.length} stops</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px,100%),1fr))', gap: 14, marginBottom: 20 }}>
          {/* Stop controls */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Color Stops</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gradStops.map((stop, si) => {
                const resolved = resolveStop(stop, si)
                return (
                  <div key={si} style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                    <button type="button" onClick={() => { if (!guardGradEdit()) return; setStopPickerIdx(stopPickerIdx === si ? null : si) }}
                      style={{ width: 32, height: 32, borderRadius: 6, cursor: 'pointer', background: resolved, border: '2px solid var(--border)', padding: 0, flexShrink: 0, transition: 'border-color .15s' }}
                      title="Pick from palette & tints"
                      aria-label="Pick from palette and tints"
                    />
                    <input type="text" value={resolved.toUpperCase()} disabled={gradEditLocked} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11, minWidth: 0 }}
                      onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) updateStop(si, { color: e.target.value }) }}
                    />
                    <input type="number" min="0" max="100" value={stop.position} disabled={gradEditLocked} onChange={e => updateStop(si, { position: Math.max(0, Math.min(100, +e.target.value)) })}
                      style={{ width: 52, fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', padding: '4px 2px', MozAppearance: 'textfield' }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>%</span>
                    {gradStops.length > 2 && (
                      <button onClick={() => removeGradStop(si)}
                        style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
                        aria-label="Remove gradient stop"
                      >&times;</button>
                    )}
                    {stopPickerIdx === si && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--warm-shadow-lg)', padding: 12, marginTop: 4, width: 300 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Custom</div>
                          <input type="color" value={resolved} onChange={e => { updateStop(si, { color: e.target.value }) }}
                            aria-label="Pick a custom gradient stop colour"
                            style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                          />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 6 }}>From Palette</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                          {allColors.map((c, ci) => (
                            <div key={ci} onClick={() => { updateStop(si, { color: c }); setStopPickerIdx(null) }}
                              style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: '1px solid var(--border)' }} title={`${ROLES[ci] || 'Custom'}: ${c}`}
                            />
                          ))}
                        </div>
                        {allColors.map((c, ci) => {
                          const scale = allTintScales[ci]
                          if (!scale) return null
                          return (
                            <div key={ci} style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                                <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--t3)' }}>
                                  {ROLES[ci] || `Custom ${ci - colors.length + 1}`} tints
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {scale.map((t, ti) => (
                                  <div key={ti} onClick={() => { updateStop(si, { color: t }); setStopPickerIdx(null) }}
                                    style={{ width: 18, height: 18, borderRadius: 2, background: t, cursor: 'pointer', border: '1px solid var(--border)' }} title={`${T_LABELS[ti]}: ${t}`}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-s" onClick={addGradStop} style={{ fontSize: 10 }}>{gradEditLocked && <LockGlyph size={11} />} + Stop</button>
              <button className="btn btn-s" onClick={() => { if (!guardGradEdit()) return; setGradStops(prev => [...prev].reverse().map((s, i, arr) => ({ ...s, position: 100 - arr[arr.length - 1 - i].position }))) }} title="Flip gradient direction" style={{ fontSize: 10 }}>{gradEditLocked && <LockGlyph size={11} />} &#8644; Flip</button>
            </div>
          </div>

          {/* Properties */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Properties</div>
            <div className="seg-label">Type</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {GRAD_TYPES.map(t => (
                <button key={t} className={`pt-t${gradType === t ? ' on' : ''}`} onClick={() => { if (!guardGradEdit()) return; setGradType(t) }} style={{ flex: 1, justifyContent: 'center', padding: '5px 10px', fontSize: 11 }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div className="seg-label" style={{ marginBottom: 0 }}>Angle</div>
            </div>
            <SnapSlider min={0} max={360} value={gradAngle} defaultValue={135}
              snaps={[0, 45, 90, 135, 180, 225, 270, 315, 360]} unit="°"
              ariaLabel="Gradient angle"
              disabled={gradEditLocked}
              onChange={(v) => { if (guardGradEdit()) setGradAngle(v) }} />

            {/* CSS Export */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>CSS</span>
                <button className="btn btn-s" onClick={() => onCopy(`background: ${gradCSS};`)} style={{ padding: '4px 10px', fontSize: 10 }}>
                  <CopyIcon /> Copy
                </button>
              </div>
              <div className="code" onClick={() => onCopy(`background: ${gradCSS};`)} style={{ fontSize: 11 }}>
                {`background: ${gradCSS};`}
              </div>
            </div>
          </div>
        </div>

        {/* Palette-based gradients */}
        {paletteGradients.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="seg-label">From Your Palette</div>
            <div className="grad-presets">
              {paletteGradients.map(g => {
                const previewCss = `linear-gradient(${g.angle}deg, ${g.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                return (
                  <div key={g.n} className="grad-p" onClick={() => applyPreset({ ...g, stops: g.stops.map(s => ({ color: s.color, pos: s.position })) })}>
                    <div className="grad-p-preview" style={{ background: previewCss }} />
                    <div className="grad-p-info">
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--t0)' }}>{g.n}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        {g.stops.map((s, si) => (
                          <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, border: '1px solid var(--border)' }} />
                            <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{s.color.toUpperCase()}</span>
                            <span style={{ fontSize: 8, color: 'var(--t3)' }}>{describeColor(s.color)}</span>
                            {si < g.stops.length - 1 && <span style={{ color: 'var(--t3)', fontSize: 9 }}>→</span>}
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-s" style={{ marginTop: 6, padding: '3px 8px', fontSize: 9 }}
                        onClick={e => { e.stopPropagation(); onCopy(`background: ${previewCss};`) }}
                      ><CopyIcon size={9} /> CSS</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Community presets */}
        <div style={{ marginBottom: 14 }}>
          <div className="seg-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Community Presets
            {GRAD_PRESETS.length > 6 && (
              <button className="btn btn-s" style={{ fontSize: 10, padding: '3px 10px' }} onClick={() => setGradPresetsExpanded(!gradPresetsExpanded)}>
                {gradPresetsExpanded ? 'Show less' : `Show all (${GRAD_PRESETS.length})`}
              </button>
            )}
          </div>
          <div className="grad-bento">
            {(gradPresetsExpanded ? GRAD_PRESETS : GRAD_PRESETS.slice(0, 8)).map((g, gi) => {
              const previewCss = `${g.type === 'Radial' ? 'radial-gradient' : g.type === 'Conic' ? 'conic-gradient' : 'linear-gradient'}(${g.type === 'Linear' ? g.angle + 'deg, ' : g.type === 'Conic' ? 'from ' + g.angle + 'deg, ' : ''}${g.stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`
              const isWide = gi % 5 === 0 || g.stops.length > 3
              return (
                <div key={g.n} className={`grad-bento-card${isWide ? ' wide' : ''}`} onClick={() => applyPreset(g)}>
                  <div className="grad-bento-preview" style={{ background: previewCss }} />
                  <div className="grad-bento-info">
                    <div className="grad-bento-name">{g.n}</div>
                    <div className="grad-bento-stops">
                      {g.stops.map((s, si) => (
                        <span key={si} className="grad-bento-stop">
                          <span className="grad-bento-dot" style={{ background: s.color }} />
                          <span className="grad-bento-hex">{s.color.toUpperCase().replace('#', '')}</span>
                          <span className="grad-bento-pos">{s.pos}%</span>
                          {si < g.stops.length - 1 && <span className="grad-bento-arrow">→</span>}
                        </span>
                      ))}
                    </div>
                    <button className="btn btn-s" style={{ marginTop: 6, padding: '3px 8px', fontSize: 9 }}
                      onClick={e => { e.stopPropagation(); onCopy(`background: ${previewCss};`) }}
                    ><CopyIcon size={9} /> CSS</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </>}
      </section>
      )}


      {/* ═══ SECTION 5: SEE IT SHIPPED — PREVIEWS (Slice 4) ═══ */}
      {!soloSection && (
      <section id="visualizer" className="cs-pv">
        <div className={`cs-section-header cs-pv-header${collapsed.visualizer ? ' is-collapsed' : ''}`} onClick={() => toggleCollapse('visualizer')}>
          <svg className={`cs-chevron${collapsed.visualizer ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <h2>See it shipped</h2>
          <span className="cs-pv-sublabel">Your palette inside real interfaces.</span>
        </div>

        {!collapsed.visualizer && (
          <div className="cs-pv-body">
            <PreviewLegend roles={rolesDark} />
            <div className="cs-pv-grid">
              <PreviewScene scene="hero" roles={rolesDark} />
              <PreviewScene scene="app" roles={rolesLight} />
              <PreviewScene scene="mobile" locked={!isPro} roles={isPro ? rolesLight : null} onUpgrade={() => onProGate('previews')} />
              <PreviewScene scene="article" locked={!isPro} roles={isPro ? rolesLight : null} onUpgrade={() => onProGate('previews')} />
            </div>
            {!isPro && <PreviewUpsell onUpgrade={() => onProGate('previews')} />}
          </div>
        )}
      </section>
      )}

      {/* ── More colour tools — links to every sibling tool's own page ──
          Section tools re-enter this studio focused on their section (the
          pathname effect handles it, no remount); tint + contrast navigate to
          their standalone pages. */}
      <nav className="cs-tools-footer" aria-label="More colour tools">
        <h2 className="cs-tools-footer-title">More colour tools</h2>
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

      {/* Context menu (cs-ctx, §4.A) — fast path. idx-tracked; live colour derived
          each render. Skips render if the index fell out of range (e.g. a remove). */}
      {ctxMenu && allColors[ctxMenu.idx] != null && (
        <CtxMenu
          color={allColors[ctxMenu.idx]}
          role={ROLES[ctxMenu.idx] || `CUSTOM ${ctxMenu.idx - colors.length + 1}`}
          isExtra={ctxMenu.idx >= colors.length}
          isLocked={locked.has(ctxMenu.idx)}
          sheet={ctxMenu.mode === 'sheet'}
          x={ctxMenu.x}
          y={ctxMenu.y}
          restoreRef={ctxAnchorRef}
          onCopy={() => onCopy(allColors[ctxMenu.idx])}
          onShades={() => openSwatchPopup(ctxMenu.idx, 'shades', ctxAnchorRef.current?.getBoundingClientRect())}
          onContrast={() => openSwatchPopup(ctxMenu.idx, 'contrast', ctxAnchorRef.current?.getBoundingClientRect())}
          onEdit={() => openSwatchPopup(ctxMenu.idx, 'edit', ctxAnchorRef.current?.getBoundingClientRect())}
          onToggleLock={() => toggleLock(ctxMenu.idx)}
          onRemove={() => { if (ctxMenu.idx >= colors.length) removeExtra(ctxMenu.idx - colors.length) }}
          onClose={closeCtxMenu}
        />
      )}

      {/* Swatch popup (cs-sw, §4.B) — deep path. idx-tracked. siblings = the other
          swatches (for the contrast tab). baseValue = the RAW set value (pre-adjust
          lens); colour = the displayed value. */}
      {swPopup && allColors[swPopup.idx] != null && (
        <SwatchPopup
          idx={swPopup.idx}
          color={allColors[swPopup.idx]}
          baseValue={baseColors[swPopup.idx] || allColors[swPopup.idx]}
          role={ROLES[swPopup.idx] || `CUSTOM ${swPopup.idx - colors.length + 1}`}
          isSheet={typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches}
          anchorRect={swAnchorRect}
          siblings={allColors.map((c, i) => ({ idx: i, color: c, role: ROLES[i] || `CUSTOM ${i - colors.length + 1}` })).filter(s => s.idx !== swPopup.idx)}
          isLocked={locked.has(swPopup.idx)}
          adjustActive={globalAdjust.h !== 0 || globalAdjust.s !== 0 || globalAdjust.b !== 0 || globalAdjust.temp !== 0}
          initialTab={swPopup.tab}
          recentEdits={recentEdits}
          restoreRef={swAnchorRef}
          onClose={closeSwPopup}
          onCopy={onCopy}
          onTab={(tab) => setSwPopup(p => (p ? { ...p, tab } : p))}
          onReplace={(hex, source) => replaceSwatch(swPopup.idx, hex, source)}
          onResetAdjust={resetGlobalAdjust}
        />
      )}

      {csysOpen && (
        <ColourSystemPopup
          anchorRect={csysAnchorRect}
          isSheet={typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches}
          baseColor={baseColor}
          harmony={harmony}
          isPro={isPro}
          freeSlotsLeft={freeSlotsLeft}
          checkCanAdd={checkCanAdd}
          onProGate={onProGate}
          onClose={closeCsys}
          restoreRef={csysAnchorRef}
          onAddRamp={addSystemRamp}
          onAddCustomHue={addColor}
          onAddSampled={addSampledColors}
          onAddBrand={addBrandColors}
          onAddBrandSwatch={addSingleColor}
        />
      )}

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
