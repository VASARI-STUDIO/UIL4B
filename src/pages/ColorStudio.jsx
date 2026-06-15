import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { generateHarmony, generateTintScale, textColorForBg, hslToHex, hexToHsl, contrastRatio, hexToRgb, hexToCmyk, hexToHsv, hexToOklch, mixHex, describeColor, T_LABELS } from '../utils/colors'
import { useProject } from '../contexts/ProjectContext'
import { useI18n } from '../contexts/I18nContext'
import { trackColourPick } from '../utils/analytics'
import { useExport } from '../contexts/ExportContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
import UIKitGuide from '../components/UIKitGuide'
import { extractColorsFromImage } from '../utils/extractColors'

const HARMS = ['analogous', 'complement', 'triadic', 'split', 'tetradic', 'monochromatic', 'custom']
const HARM_LABELS = {
  analogous: 'Analogous', complement: 'Complementary', triadic: 'Triadic',
  split: 'Split Comp.', tetradic: 'Tetradic', monochromatic: 'Mono', custom: 'Custom',
}
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']

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
  { name: 'Default', config: { success: 1, warning: 0, error: 0, info: 0 } },
  { name: 'Material', config: { success: 4, warning: 4, error: 4, info: 4 } },
  { name: 'Vivid', config: { success: 0, warning: 2, error: 1, info: 2 } },
  { name: 'Cool', config: { success: 2, warning: 1, error: 2, info: 1 } },
  { name: 'Warm', config: { success: 1, warning: 0, error: 0, info: 2 } },
  { name: 'Apple', config: { success: 3, warning: 3, error: 3, info: 3 } },
  { name: 'Tailwind', config: { success: 5, warning: 5, error: 5, info: 5 } },
]

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

function StateShade({ shade, label, onCopy }) {
  const [hover, setHover] = useState(false)
  const fg = textColorForBg(shade)
  const rgb = hover ? hexToRgb(shade) : null
  return (
    <div onClick={() => onCopy(shade)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ flex: 1, padding: '16px 0 6px', textAlign: 'center', background: shade, cursor: 'pointer', minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', transition: 'filter .15s', filter: hover ? 'brightness(1.05)' : 'none' }}
    >
      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, color: fg, opacity: hover ? 1 : .6, transition: 'opacity .15s' }}>
        {hover ? shade.toUpperCase().replace('#', '') : label}
      </span>
      {hover && rgb && (
        <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: fg, opacity: .5, marginTop: 1 }}>
          {rgb[0]},{rgb[1]},{rgb[2]}
        </span>
      )}
    </div>
  )
}

function TintSwatch({ color, label, onCopy }) {
  const [hover, setHover] = useState(false)
  const fg = textColorForBg(color)
  const rgb = hover ? hexToRgb(color) : null
  return (
    <div onClick={() => onCopy(color)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
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
        {hover ? color.toUpperCase().replace('#', '') : color.toUpperCase().replace('#', '')}
      </span>
      {hover && rgb && (
        <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: fg, opacity: .5 }}>
          {rgb[0]},{rgb[1]},{rgb[2]}
        </span>
      )}
    </div>
  )
}

function ContrastBadge({ fg, bg }) {
  const ratio = contrastRatio(fg, bg)
  const pass = ratio >= 4.5
  return (
    <span style={{
      fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700,
      padding: '2px 6px', borderRadius: 4,
      background: pass ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
      color: pass ? '#16a34a' : '#dc2626',
    }}>
      {ratio.toFixed(1)}:1 {pass ? 'AA' : ''}
    </span>
  )
}

function snap(value, target, threshold = 3) {
  return Math.abs(value - target) <= threshold ? target : value
}

function colorPsychology(h, s, l) {
  if (s < 10) {
    if (l > 85) return { mood: 'Clean, minimal', audience: 'Luxury, tech, healthcare', pros: ['Clean and modern', 'Universal appeal', 'Great for backgrounds'], cons: ['Can feel sterile', 'Low visual impact alone'] }
    if (l < 20) return { mood: 'Authoritative, bold', audience: 'Premium, editorial, fashion', pros: ['Conveys sophistication', 'High contrast pairing', 'Timeless feel'], cons: ['Can feel heavy', 'Needs lighter accents'] }
    return { mood: 'Balanced, neutral', audience: 'Corporate, professional', pros: ['Versatile and safe', 'Easy to pair', 'Professional feel'], cons: ['Non-distinctive', 'Needs accent colours'] }
  }
  if (h < 30) return { mood: 'Energetic, urgent', audience: 'Food, retail, entertainment', pros: ['Grabs attention fast', 'Creates urgency', 'Evokes passion'], cons: ['Can feel aggressive', 'Overuse causes fatigue'] }
  if (h < 60) return { mood: 'Warm, optimistic', audience: 'Creative, youth, wellness', pros: ['Friendly and inviting', 'Conveys warmth', 'High visibility'], cons: ['Hard to read as text', 'Can feel childish if overused'] }
  if (h < 90) return { mood: 'Fresh, natural', audience: 'Eco, organic, outdoor', pros: ['Calming and fresh', 'Signals growth', 'Natural associations'], cons: ['Common — needs distinction', 'Cool tones may clash'] }
  if (h < 150) return { mood: 'Trustworthy, calm', audience: 'Health, fintech, sustainability', pros: ['Balanced energy', 'Associated with health', 'Works light and dark'], cons: ['Less common in branding', 'Can feel clinical'] }
  if (h < 210) return { mood: 'Reliable, professional', audience: 'Tech, finance, corporate', pros: ['Builds trust instantly', 'Universal appeal', 'Pairs with most palettes'], cons: ['Overused in tech', 'Can feel cold'] }
  if (h < 270) return { mood: 'Creative, luxurious', audience: 'Beauty, gaming, premium', pros: ['Evokes creativity', 'Feels premium', 'Distinctive and memorable'], cons: ['Can feel mystical', 'Hard to match casually'] }
  if (h < 330) return { mood: 'Playful, bold', audience: 'Fashion, beauty, social media', pros: ['Eye-catching and fun', 'Modern and energetic', 'Appeals to younger demos'], cons: ['Can feel unserious', 'Gender associations'] }
  return { mood: 'Energetic, urgent', audience: 'Food, retail, entertainment', pros: ['Grabs attention fast', 'Creates urgency', 'Evokes passion'], cons: ['Can feel aggressive', 'Overuse causes fatigue'] }
}

const CVD_MATRICES = {
  protanopia:   [0.567,0.433,0, 0.558,0.442,0, 0,0.242,0.758],
  deuteranopia: [0.625,0.375,0, 0.7,0.3,0, 0,0.3,0.7],
  tritanopia:   [0.95,0.05,0, 0,0.433,0.567, 0,0.475,0.525],
}
function simCVD(hex, matrix) {
  const [r, g, b] = hexToRgb(hex)
  const nr = Math.round(matrix[0]*r + matrix[1]*g + matrix[2]*b)
  const ng = Math.round(matrix[3]*r + matrix[4]*g + matrix[5]*b)
  const nb = Math.round(matrix[6]*r + matrix[7]*g + matrix[8]*b)
  return '#' + [nr,ng,nb].map(v => Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')
}

function ColorInfoPopup({ color, onClose, onCopy, onChange }) {
  const ref = useRef(null)
  const [tab, setTab] = useState('values')
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [onClose])

  const [h, s, l] = hexToHsl(color)
  const [r, g, b] = hexToRgb(color)
  const [c, m, y, k] = hexToCmyk(color)
  const [hv, sv, bv] = hexToHsv(color)
  const [oL, oC, oH] = hexToOklch(color)
  const fg = textColorForBg(color)
  const onWhite = contrastRatio(color, '#FFFFFF')
  const onBlack = contrastRatio(color, '#000000')
  const grade = (ratio) => ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail'
  const gradeBadge = (ratio) => {
    const pass = ratio >= 4.5
    const large = ratio >= 3
    return { text: pass ? 'AA' : large ? 'AA Lg' : 'Fail', ok: pass || large, strong: pass }
  }

  const whiteText = contrastRatio('#FFFFFF', color)
  const blackText = contrastRatio('#000000', color)

  const tints = [0.85, 0.65, 0.45, 0.25].map(t => mixHex(color, '#FFFFFF', t)).reverse()
  const darks = [0.15, 0.3, 0.45, 0.6, 0.75].map(t => mixHex(color, '#000000', t))
  const tintShade = [...tints, color, ...darks]

  const rows = [
    ['HEX', color.toUpperCase()],
    ['RGB', `rgb(${r}, ${g}, ${b})`],
    ['HSL', `hsl(${h}, ${s}%, ${l}%)`],
    ['HSB', `hsb(${hv}, ${sv}%, ${bv}%)`],
    ['CMYK', `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`],
    ['OKLCH', `oklch(${oL}% ${oC} ${oH})`],
  ]

  const cvdTypes = [
    { key: 'protanopia', label: 'Protanopia', desc: 'Red-blind' },
    { key: 'deuteranopia', label: 'Deuteranopia', desc: 'Green-blind' },
    { key: 'tritanopia', label: 'Tritanopia', desc: 'Blue-blind' },
  ]

  const psych = colorPsychology(h, s, l)
  const TABS = [
    { id: 'values', label: 'Values' },
    { id: 'contrast', label: 'Contrast' },
    { id: 'shades', label: 'Shades' },
    { id: 'vision', label: 'Vision' },
    { id: 'usage', label: 'Usage' },
  ]

  return (
    <div className="ci-overlay">
      <div className="ci-popup" ref={ref}>
        <button className="ci-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="ci-hero" style={{ background: color, color: fg }}>
          <span className="ci-name">{describeColor(color)}</span>
          <span className="ci-hero-hex">{color.toUpperCase()}</span>
          <label className="ci-edit" style={{ color: fg, borderColor: fg }}>
            Edit
            <input type="color" value={color} onChange={e => onChange(e.target.value)} />
          </label>
        </div>
        <div className="ci-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`ci-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="ci-body">
          {tab === 'values' && (
            <>
              <div className="ci-values">
                {rows.map(([label, val]) => (
                  <button key={label} className="ci-value-row" onClick={() => onCopy(val)} title="Copy">
                    <span className="ci-value-label">{label}</span>
                    <span className="ci-value-val">{val}</span>
                    <CopyIcon size={11} />
                  </button>
                ))}
              </div>
              <div className="ci-quick-contrast">
                <div className="ci-qc-cell" style={{ background: '#fff' }}>
                  <span className="ci-qc-sample" style={{ color }}>Aa</span>
                  <span className="ci-qc-ratio">{onWhite.toFixed(1)}:1</span>
                  <span className={`ci-qc-badge ${onWhite >= 4.5 ? 'pass' : onWhite >= 3 ? 'warn' : 'fail'}`}>{grade(onWhite)}</span>
                </div>
                <div className="ci-qc-cell" style={{ background: '#000' }}>
                  <span className="ci-qc-sample" style={{ color }}>Aa</span>
                  <span className="ci-qc-ratio" style={{ color: '#fff' }}>{onBlack.toFixed(1)}:1</span>
                  <span className={`ci-qc-badge ${onBlack >= 4.5 ? 'pass' : onBlack >= 3 ? 'warn' : 'fail'}`}>{grade(onBlack)}</span>
                </div>
              </div>
            </>
          )}

          {tab === 'contrast' && (
            <>
              <div className="ci-shades-label">Colour on backgrounds</div>
              <div className="ci-contrast">
                <div className="ci-contrast-cell" style={{ background: '#fff', color }}>
                  <span className="ci-cc-label">On white</span>
                  <span className="ci-cc-sample" style={{ color }}>Sample text Aa</span>
                  <strong>{onWhite.toFixed(2)}</strong>
                  <em className={onWhite >= 4.5 ? 'pass' : 'fail'}>{grade(onWhite)}</em>
                </div>
                <div className="ci-contrast-cell" style={{ background: '#000', color }}>
                  <span className="ci-cc-label" style={{ color: '#fff' }}>On black</span>
                  <span className="ci-cc-sample" style={{ color }}>Sample text Aa</span>
                  <strong style={{ color: '#fff' }}>{onBlack.toFixed(2)}</strong>
                  <em className={onBlack >= 4.5 ? 'pass' : 'fail'} style={{ color: '#fff' }}>{grade(onBlack)}</em>
                </div>
              </div>
              <div className="ci-shades-label" style={{ marginTop: 16 }}>Text on this colour</div>
              <div className="ci-text-contrast">
                {[['#FFFFFF', 'White text', whiteText], ['#000000', 'Black text', blackText]].map(([tc, label, ratio]) => {
                  const bg = gradeBadge(ratio)
                  return (
                    <div key={tc} className="ci-text-row" style={{ background: color }}>
                      <span style={{ color: tc, fontSize: 14, fontWeight: 700 }}>Aa</span>
                      <span style={{ color: tc }}>{label}</span>
                      <span className="ci-text-ratio" style={{ color: tc }}>
                        {ratio.toFixed(1)}:1
                      </span>
                      <span className={`ci-qc-badge ${bg.strong ? 'pass' : bg.ok ? 'warn' : 'fail'}`}>{bg.text}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'shades' && (
            <>
              <div className="ci-shades-label">Tints &amp; Shades</div>
              <div className="ci-tintshade">
                {tintShade.map((sh, i) => {
                  const isBase = sh.toLowerCase() === color.toLowerCase()
                  return (
                    <button key={i} className={'ci-ts-cell' + (isBase ? ' ci-ts-base' : '')}
                      style={{ background: sh, color: textColorForBg(sh) }}
                      onClick={() => onCopy(sh.toUpperCase())}
                      title={'Copy ' + sh.toUpperCase()}>
                      <span className="ci-ts-hex">{sh.toUpperCase().replace('#', '')}</span>
                    </button>
                  )
                })}
              </div>
              <div className="ci-shade-list">
                {tintShade.map((sh, i) => {
                  const isBase = sh.toLowerCase() === color.toLowerCase()
                  return (
                    <button key={i} className={`ci-shade-row${isBase ? ' ci-shade-base' : ''}`} onClick={() => onCopy(sh.toUpperCase())}>
                      <div className="ci-shade-dot" style={{ background: sh }} />
                      <span className="ci-shade-hex">{sh.toUpperCase()}</span>
                      <span className="ci-shade-ratio">{contrastRatio(sh, '#FFFFFF').toFixed(1)}:1</span>
                      <CopyIcon size={9} />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'vision' && (
            <>
              <div className="ci-shades-label">Colour blindness simulation</div>
              <div className="ci-cvd-grid">
                <div className="ci-cvd-card">
                  <div className="ci-cvd-swatch" style={{ background: color }} />
                  <span className="ci-cvd-name">Normal</span>
                  <span className="ci-cvd-hex">{color.toUpperCase()}</span>
                </div>
                {cvdTypes.map(cvd => {
                  const sim = simCVD(color, CVD_MATRICES[cvd.key])
                  return (
                    <div key={cvd.key} className="ci-cvd-card" onClick={() => onCopy(sim)}>
                      <div className="ci-cvd-swatch" style={{ background: sim }} />
                      <span className="ci-cvd-name">{cvd.label}</span>
                      <span className="ci-cvd-desc">{cvd.desc}</span>
                      <span className="ci-cvd-hex">{sim.toUpperCase()}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'usage' && (
            <div className="ci-psychology">
              <div className="ci-psych-header">
                <div className="ci-psych-row"><span className="ci-psych-label">Mood</span><span>{psych.mood}</span></div>
                <div className="ci-psych-row"><span className="ci-psych-label">Best for</span><span>{psych.audience}</span></div>
              </div>
              <div className="ci-psych-lists">
                <div className="ci-psych-list">
                  {psych.pros.map((p, i) => <div key={i} className="ci-psych-item ci-psych-pro"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>{p}</div>)}
                </div>
                <div className="ci-psych-list">
                  {psych.cons.map((c, i) => <div key={i} className="ci-psych-item ci-psych-con"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>{c}</div>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ColorStudio({ onCopy }) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const { rounding } = useAppearance()
  const { design, setPalette, setStates, setTints, setGradient, saveProject, projects, loadProject, overwriteProject, canSaveProjects } = useProject()

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
  const [harmony, setHarmony] = useState(() => design?.palette?.harmony || 'analogous')
  const [extraColors, setExtraColors] = useState(() => design?.palette?.extraColors || [])
  const [overrides, setOverrides] = useState(() => design?.palette?.overrides || {})
  const [stateColors, setStateColors] = useState(() => design?.states || { success: 1, warning: 0, error: 0, info: 0 })
  const [activeColorIdx, setActiveColorIdx] = useState(() => design?.palette?.activeIdx || 0)
  const [locked, setLocked] = useState(() => new Set(design?.palette?.locked || []))
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [cssExpanded, setCssExpanded] = useState(false)
  const [infoColor, setInfoColor] = useState(null)
  const colorRef = useRef(null)

  const [lumBias, setLumBias] = useState(() => design?.tints?.lumBias ?? 82)
  const [satDecay, setSatDecay] = useState(() => design?.tints?.satDecay ?? 12)
  const [oled, setOled] = useState(() => design?.tints?.oled ?? true)

  const [gradStops, setGradStops] = useState(() => design?.gradient?.stops || [{ color: null, position: 0 }, { color: null, position: 100 }])
  const [gradAngle, setGradAngle] = useState(() => design?.gradient?.angle ?? 135)
  const [gradType, setGradType] = useState(() => design?.gradient?.type || 'Linear')
  const [stopPickerIdx, setStopPickerIdx] = useState(null)

  const SECTIONS = useMemo(() => [
    { id: 'palette', label: 'Palette' },
    { id: 'tints', label: 'Tints' },
    { id: 'states', label: 'States' },
    { id: 'systems', label: 'Systems' },
    { id: 'gradients', label: 'Gradients' },
  ], [])
  const [collapsed, setCollapsed] = useState({})
  const [activeSection, setActiveSection] = useState('palette')
  const toggleCollapse = useCallback((id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] })), [])

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

  const colors = generateHarmony(baseColor, harmony)
  // Per-index manual overrides applied on top of the harmony-generated colours.
  const resolvedColors = colors.map((c, i) => overrides[i] || c)
  const allColors = [...resolvedColors, ...extraColors]

  // Sync palette state to ProjectContext (full design persistence)
  useEffect(() => {
    setPalette({ base: baseColor, harmony, extraColors, overrides, activeIdx: activeColorIdx, colors: allColors, locked: [...locked] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony, extraColors, JSON.stringify(overrides), activeColorIdx, allColors.join(',')])

  useEffect(() => {
    setStates(stateColors)
    // Cache resolved state shades to localStorage so the global style-guide
    // export (in TopBar) can include them without needing STATE_PRESETS.
    try {
      const resolved = Object.fromEntries(
        Object.entries(stateColors).map(([state, idx]) => [state, STATE_PRESETS[state][idx].shades])
      )
      localStorage.setItem('vs-state-shades', JSON.stringify(resolved))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateColors])

  useEffect(() => {
    setGradient({ stops: gradStops, angle: gradAngle, type: gradType })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradStops, gradAngle, gradType])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      e.preventDefault()
      randomPalette()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [randomPalette])

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
      const stateVars = Object.entries(stateColors).map(([state, presetIdx]) => {
        const shades = STATE_PRESETS[state][presetIdx].shades
        return shades.map((c, i) => `  --${state}-${stateLabels[i]}: ${c};`).join('\n')
      }).join('\n')
      return { colorVars, tintVars, stateVars }
    }

    const generateHTML = () => {
      const { colorVars, tintVars, stateVars } = buildVars()
      const stateEntries = Object.entries(stateColors).map(([state, presetIdx]) => ({
        name: state, shades: STATE_PRESETS[state][presetIdx].shades
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
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }, [])

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    if (locked.size === 0) {
      setBaseColor(hex)
      setExtraColors([])
      setOverrides({})
      setActiveColorIdx(0)
    } else {
      if (!locked.has(0)) setBaseColor(hex)
      setOverrides(prev => {
        const next = { ...prev }
        for (let i = 1; i < colors.length; i++) {
          if (locked.has(i)) {
            next[i] = allColors[i]
          } else {
            delete next[i]
          }
        }
        return next
      })
      setExtraColors(prev => prev.map((c, i) => {
        const globalIdx = colors.length + i
        if (locked.has(globalIdx)) return c
        return hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
      }))
    }
  }, [locked, colors.length, allColors])

  const resetPalette = useCallback(() => {
    const prev = { base: baseColor, harmony, extras: [...extraColors], ovr: { ...overrides }, idx: activeColorIdx }
    setBaseColor('#2563EB')
    setHarmony('analogous')
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

  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [tintDropdownOpen, setTintDropdownOpen] = useState(false)
  const [gradPresetsExpanded, setGradPresetsExpanded] = useState(false)
  const [saveProjectName, setSaveProjectName] = useState('')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)

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

  const addColor = () => {
    const [h] = hexToHsl(baseColor)
    const offset = (extraColors.length + 1) * 47
    setExtraColors([...extraColors, hslToHex((h + offset) % 360, 55, 55)])
    setAddMenuOpen(false)
  }

  // The native <input type="color"> fires onChange continuously while the user
  // drags inside the picker, and a real 'change' event only once on commit.
  // We append a single swatch on the first onChange of a session, then update
  // that same swatch in place for the rest of the drag — and reset the session
  // on commit so the next pick adds a fresh swatch instead of clobbering.
  const addSessionRef = useRef(null)
  const addCustomColor = (hex) => {
    if (addSessionRef.current == null) {
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
      const reordered = [...allColors]
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

  const addComplement = () => {
    const [h, s, l] = hexToHsl(baseColor)
    setExtraColors([...extraColors, hslToHex((h + 180) % 360, s, l)])
    setAddMenuOpen(false)
  }

  const addAnalogous = () => {
    const [h, s, l] = hexToHsl(baseColor)
    const offset = 30 + Math.floor(Math.random() * 15)
    setExtraColors([...extraColors, hslToHex((h + offset) % 360, s, l)])
    setAddMenuOpen(false)
  }

  const addTriadic = () => {
    const [h, s, l] = hexToHsl(baseColor)
    setExtraColors([...extraColors, hslToHex((h + 120) % 360, s, l)])
    setAddMenuOpen(false)
  }

  const addSplitComp = () => {
    const [h, s, l] = hexToHsl(baseColor)
    setExtraColors([...extraColors, hslToHex((h + 150) % 360, s, l)])
    setAddMenuOpen(false)
  }

  const addBrandColors = (brand) => {
    const newColors = brand.colors.filter(c => !allColors.map(x => x.toUpperCase()).includes(c.toUpperCase()))
    setExtraColors([...extraColors, ...newColors.slice(0, 3)])
    setAddMenuOpen(false)
  }

  const [extracting, setExtracting] = useState(false)
  const extractFileRef = useRef(null)
  const handleImageExtract = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    try {
      const extracted = await extractColorsFromImage(file, 5)
      if (extracted.length) {
        setBaseColor(extracted[0])
        setHarmony('custom')
        setOverrides({})
        setExtraColors(extracted.slice(1))
        setActiveColorIdx(0)
        setLocked(new Set())
      }
    } catch { /* ignore */ }
    setExtracting(false)
    setAddMenuOpen(false)
    if (extractFileRef.current) extractFileRef.current.value = ''
  }

  const addMenuRef = useRef(null)
  useEffect(() => {
    if (!addMenuOpen) return
    const close = (e) => {
      // Don't close if the click is inside the add-menu (e.g. the native color picker)
      if (addMenuRef.current && addMenuRef.current.contains(e.target)) return
      setAddMenuOpen(false)
    }
    // Use mousedown instead of click so the native browser colour-picker
    // popover (which doesn't dispatch mousedown on the document) stays open.
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [addMenuOpen])

  const removeExtra = (i) => {
    setExtraColors(extraColors.filter((_, idx) => idx !== i))
    if (activeColorIdx >= colors.length + i) setActiveColorIdx(0)
  }

  const applyBrand = (brand) => {
    setBaseColor(brand.colors[0])
    setExtraColors(brand.colors.slice(5))
    setOverrides({})
    setActiveColorIdx(0)
  }

  const applyDesignSystem = (ds) => {
    setBaseColor(ds.base)
    setExtraColors(ds.colors.slice(1))
    setOverrides({})
    setActiveColorIdx(0)
  }

  const stateCSS = Object.entries(stateColors).map(([state, presetIdx]) => {
    const preset = STATE_PRESETS[state][presetIdx]
    return preset.shades.map((c, i) => `  --${state}-${STATE_LABELS[i]}: ${c};`).join('\n')
  }).join('\n')
  const fullCSS = `:root {\n${allColors.map((x, i) => `  --color-${i + 1}: ${x};`).join('\n')}\n\n${stateCSS}\n}`

  const resolveStop = (s, i) => s.color || allColors[i] || allColors[0]
  const gradFn = gradType === 'Radial' ? 'radial-gradient' : gradType === 'Conic' ? 'conic-gradient' : 'linear-gradient'
  const angleStr = gradType === 'Linear' ? `${gradAngle}deg, ` : gradType === 'Conic' ? `from ${gradAngle}deg, ` : ''
  const gradCSS = `${gradFn}(${angleStr}${gradStops.map((s, i) => `${resolveStop(s, i)} ${s.position}%`).join(', ')})`
  const addGradStop = () => {
    const sorted = [...gradStops].sort((a, b) => a.position - b.position)
    const lastTwo = sorted.slice(-2)
    const midPos = Math.round((lastTwo[0].position + lastTwo[1].position) / 2)
    const c1 = hexToRgb(resolveStop(lastTwo[0], gradStops.indexOf(lastTwo[0])))
    const c2 = hexToRgb(resolveStop(lastTwo[1], gradStops.indexOf(lastTwo[1])))
    const midHex = '#' + [0, 1, 2].map(i => Math.round((c1[i] + c2[i]) / 2).toString(16).padStart(2, '0')).join('')
    setGradStops([...gradStops, { color: midHex, position: midPos }])
  }
  const removeGradStop = (idx) => { if (gradStops.length > 2) setGradStops(gradStops.filter((_, i) => i !== idx)) }
  const updateStop = (idx, updates) => setGradStops(gradStops.map((s, i) => i === idx ? { ...s, ...updates } : s))
  const applyPreset = (preset) => { setGradStops(preset.stops.map(s => ({ color: s.color, position: s.pos }))); setGradAngle(preset.angle); setGradType(preset.type); setStopPickerIdx(null) }

  const primary = allColors[0]
  const secondary = allColors[1] || allColors[0]
  const accent = allColors[2] || allColors[0]

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Colour</div>
        <h1>{t('color.title')}</h1>
        <p>{t('tools.colorStudio.description')}</p>
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
                  <button key={p.id} className="btn btn-s" onClick={() => { loadProject(p.id); onCopy?.('Loaded: ' + p.name) }}
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
                    onKeyDown={e => { if (e.key === 'Enter' && saveProjectName.trim()) { saveProject(saveProjectName); setSaveProjectName(''); setSaveMenuOpen(false); onCopy?.('Project saved') } }}
                  />
                  <button className="btn btn-accent btn-s" onClick={() => { if (saveProjectName.trim()) { saveProject(saveProjectName); setSaveProjectName(''); setSaveMenuOpen(false); onCopy?.('Project saved') } }}
                    style={{ padding: '4px 12px', fontSize: 11 }}>Save</button>
                </div>
                {projects.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginTop: 12, marginBottom: 6 }}>Overwrite existing</div>
                    {projects.slice(-5).map(p => (
                      <button key={p.id} onClick={() => { overwriteProject(p.id); setSaveMenuOpen(false); onCopy?.('Updated: ' + p.name) }}
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

      <nav className="cs-sticky-nav">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`cs-nav-item${activeSection === s.id ? ' active' : ''}`}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >{s.label}</button>
        ))}
      </nav>

      {/* ═══ SECTION 1: PALETTE BUILDER ═══ */}
      <section id="palette" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={() => toggleCollapse('palette')} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.palette ? 0 : 20, cursor: 'pointer' }}>
          <svg className={`cs-chevron${collapsed.palette ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Palette Builder</h2>
          <button className="btn btn-s" onClick={(e) => { e.stopPropagation(); randomPalette() }} title="Random palette (or press Spacebar)" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10" /><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
            </svg>
            Random
            <kbd style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--mono)', marginLeft: 2 }}>Space</kbd>
          </button>
          <button className="btn btn-s" onClick={(e) => { e.stopPropagation(); resetPalette() }} title="Reset palette to default" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
          <div className="cs-add-wrap" ref={addMenuRef} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <button className="btn btn-s" onClick={() => setAddMenuOpen(!addMenuOpen)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              + Add Colour
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {addMenuOpen && (
              <div className="cs-add-menu">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Pick Colour
                    <input ref={endAddSession} type="color" value={baseColor}
                      onChange={e => addCustomColor(e.target.value)}
                      style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </label>
                </div>
                <div className="cs-add-menu-sep" />
                <button onClick={addColor}>Custom (Hue Offset)</button>
                <button onClick={addComplement}>Complementary</button>
                <button onClick={addAnalogous}>Analogous</button>
                <button onClick={addTriadic}>Triadic</button>
                <button onClick={addSplitComp}>Split Complement</button>
                <div className="cs-add-menu-sep" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--brand)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {extracting ? 'Extracting…' : 'Extract from Image'}
                  <input ref={extractFileRef} type="file" accept="image/*" onChange={handleImageExtract} style={{ display: 'none' }} />
                </label>
                <div className="cs-add-menu-sep" />
                <div className="cs-add-menu-label">From Brand Palette</div>
                {BRANDS.slice(0, 6).map(b => (
                  <button key={b.n} onClick={() => addBrandColors(b)}>
                    <span>{b.n}</span>
                    <span className="cs-add-menu-dots">
                      {b.colors.slice(0, 4).map((c, ci) => (
                        <span key={ci} className="cs-add-menu-dot" style={{ background: c }} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!collapsed.palette && <>
        {/* Base color + harmony row */}
        <div className="card" style={{ padding: '12px 16px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>Base colour & Harmony</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
                <div
                  style={{ width: 42, height: 42, borderRadius: 'var(--radius-s)', background: baseColor, border: '1px solid var(--border)', pointerEvents: 'none' }}
                />
                <input
                  ref={colorRef}
                  type="color"
                  value={baseColor}
                  onChange={e => { setBaseColor(e.target.value); setOverrides({}); trackColourPick(e.target.value) }}
                  aria-label="Pick base colour"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0, background: 'none', appearance: 'none', WebkitAppearance: 'none' }}
                />
              </div>
              <input
                type="text" value={baseColor.toUpperCase()}
                style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, width: 90 }}
                onChange={e => { let v = e.target.value; if (!v.startsWith('#')) v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) { setBaseColor(v); setOverrides({}) } }}
              />
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {HARMS.map(h => (
                <button key={h} className={`pt-t${harmony === h ? ' on' : ''}`} onClick={() => { setHarmony(h); setOverrides({}) }}
                  style={{ padding: '5px 12px', fontSize: 11 }}
                >{HARM_LABELS[h]}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Palette swatches */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {allColors.map((color, i) => {
            const isActive = i === activeColorIdx
            const isExtra = i >= colors.length
            const isLocked = locked.has(i)
            const isDragOver = dragOverIdx === i && dragIdx !== i
            return (
              <div key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                style={{ position: 'relative', flex: '1 1 0', minWidth: 80, opacity: dragIdx === i ? .5 : 1, transition: 'opacity .15s, transform .15s', transform: isDragOver ? 'scale(1.04)' : 'none' }}
              >
                <div
                  onClick={() => { setActiveColorIdx(i); onCopy(color) }}
                  style={{
                    background: color, borderRadius: 'var(--radius-s)', padding: '16px 12px',
                    minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    cursor: 'grab', transition: 'transform .12s', color: textColorForBg(color),
                    border: isActive ? '2px solid var(--accent)' : isDragOver ? '2px dashed var(--brand)' : '1px solid var(--border)',
                    outline: isActive ? '2px solid var(--accent-soft)' : 'none',
                    outlineOffset: 1,
                  }}
                >
                  {isLocked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: 6, left: 6, opacity: .7 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  )}
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .6, marginBottom: 2 }}>
                    {ROLES[i] || `CUSTOM ${i - colors.length + 1}`}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
                    {color.toUpperCase()}
                  </div>
                </div>
                <input type="color" value={color}
                  onChange={e => editPaletteColor(i, e.target.value)}
                  style={{ position: 'absolute', bottom: 4, left: 4, width: 22, height: 22, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4, opacity: .7 }}
                  title="Edit colour"
                />
                <button onClick={(e) => { e.stopPropagation(); toggleLock(i) }}
                  title={isLocked ? 'Unlock colour' : 'Lock colour'}
                  style={{ position: 'absolute', top: 4, left: 4, background: isLocked ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.4)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {isLocked
                      ? <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
                      : <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>}
                  </svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setInfoColor(color) }}
                  title="Colour details"
                  style={{ position: 'absolute', top: 4, right: isExtra ? 26 : 4, background: 'rgba(0,0,0,.4)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, fontStyle: 'italic', fontFamily: 'Georgia,serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >i</button>
                {isExtra && (
                  <button onClick={() => removeExtra(i - colors.length)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.4)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >&times;</button>
                )}
              </div>
            )
          })}
          {/* Quick-add colour swatch */}
          <div style={{ position: 'relative', flex: '0 0 80px', minWidth: 80 }}>
            <label
              style={{
                borderRadius: 'var(--radius-s)', padding: '16px 12px',
                minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer', transition: 'background .15s, border-color .15s',
                border: '2px dashed var(--border)', background: 'var(--hvr)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>Add</span>
              <input ref={endAddSession} type="color" value={baseColor}
                onChange={e => addCustomColor(e.target.value)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </label>
          </div>
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

      {/* ═══ SECTION 2: TINT SCALES ═══ */}
      <section id="tints" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={() => toggleCollapse('tints')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.tints ? 0 : 14 }}>
          <svg className={`cs-chevron${collapsed.tints ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tint Scale</h2>
        </div>

        {!collapsed.tints && <>
        {/* Quick switch + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {allColors.map((c, i) => (
              <button key={i} onClick={() => setActiveColorIdx(i)} title={c}
                aria-label={`Switch to ${c}`}
                style={{
                  width: 36, height: 36, borderRadius: 8, background: c, border: i === activeColorIdx ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer', transition: 'transform .1s', padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--t2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 9 }}>Lum</span>
              <input type="range" min="50" max="100" value={lumBias} onChange={e => setLumBias(snap(+e.target.value, 82))} style={{ width: 80 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{lumBias}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 9 }}>Sat</span>
              <input type="range" min="0" max="50" value={satDecay} onChange={e => setSatDecay(snap(+e.target.value, 12))} style={{ width: 80 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{satDecay}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <span style={{ fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 9 }}>OLED</span>
              <button className={`toggle-switch${oled ? ' on' : ''}`} onClick={() => setOled(!oled)} style={{ transform: 'scale(.8)' }} />
            </label>
          </div>
          <button className="btn btn-s" onClick={() => {
            const css = ':root {\n' + tintScale.map((c, i) => `  --tint-${T_LABELS[i]}: ${c};`).join('\n') + '\n}'
            onCopy(css)
          }} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 10 }}>
            <CopyIcon /> Copy Tints
          </button>
        </div>

        {/* Tint strip */}
        <div className="cs-tint-strip" style={{ display: 'flex', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {tintScale.map((c, i) => (
            <TintSwatch key={i} color={c} label={T_LABELS[i]} onCopy={onCopy} />
          ))}
        </div>

        {/* Tint dropdown: all palette colours */}
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setTintDropdownOpen(!tintDropdownOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--t1)', padding: '8px 0' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .2s', transform: tintDropdownOpen ? 'rotate(90deg)' : 'none' }}>
              <polyline points="9 6 15 12 9 18" />
            </svg>
            All Palette Tints
            <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400 }}>{allColors.length} colours</span>
          </button>
          {tintDropdownOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {allColors.map((c, ci) => {
                const scale = allTintScales[ci]
                if (!scale) return null
                return (
                  <div key={ci}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid var(--border)' }} />
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--t2)' }}>
                        {ROLES[ci] || `Custom ${ci - colors.length + 1}`}
                      </span>
                      <button className="btn btn-s" onClick={() => {
                        const css = ':root {\n' + scale.map((t, ti) => `  --${(ROLES[ci] || 'custom-' + (ci - colors.length + 1)).toLowerCase()}-${T_LABELS[ti]}: ${t};`).join('\n') + '\n}'
                        onCopy(css)
                      }} style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 9 }}>
                        <CopyIcon size={9} /> Copy
                      </button>
                    </div>
                    <div style={{ display: 'flex', borderRadius: 'var(--radius-s)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      {scale.map((t, ti) => (
                        <TintSwatch key={ti} color={t} label={T_LABELS[ti]} onCopy={onCopy} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </>}
      </section>

      {/* ═══ SECTION 3: UI STATE COLORS ═══ */}
      <section id="states" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={() => toggleCollapse('states')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed.states ? 0 : 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg className={`cs-chevron${collapsed.states ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>UI State Colours</h2>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Preset</span>
            {STATE_BUNDLES.map(b => (
              <button key={b.name}
                className={`pt-t${JSON.stringify(stateColors) === JSON.stringify(b.config) ? ' on' : ''}`}
                onClick={() => setStateColors(b.config)}
                style={{ padding: '4px 10px', fontSize: 10 }}
              >{b.name}</button>
            ))}
          </div>
        </div>
        {!collapsed.states && <>
        {Object.entries(STATE_PRESETS).map(([state, presets]) => {
          const activeIdx = stateColors[state]
          const active = presets[activeIdx]
          return (
            <div key={state} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: active.shades[5] }} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{state}</span>
                <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
                  {presets.map((p, pi) => (
                    <button key={p.name} onClick={() => setStateColors({ ...stateColors, [state]: pi })}
                      className={`pt-t${pi === activeIdx ? ' on' : ''}`} style={{ padding: '3px 8px', fontSize: 9 }}
                    ><span className="state-preset-full">{p.name}</span><span className="state-preset-short">{p.name === 'Tailwind' ? 'TW' : p.name}</span></button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', borderRadius: 'var(--radius-s)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {active.shades.map((shade, si) => (
                  <StateShade key={si} shade={shade} label={STATE_LABELS[si]} onCopy={onCopy} />
                ))}
              </div>
            </div>
          )
        })}
        </>}
      </section>

      {/* ═══ SECTION 4: DESIGN SYSTEMS ═══ */}
      <section id="systems" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={() => toggleCollapse('systems')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.systems ? 0 : 14 }}>
          <svg className={`cs-chevron${collapsed.systems ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Design Systems</h2>
        </div>
        {!collapsed.systems && <>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.6 }}>
          Click a system to load its palette. Or start from a brand below.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px,100%), 1fr))', gap: 10, marginBottom: 20 }}>
          {DESIGN_SYSTEMS.map(ds => (
            <div key={ds.n} className="card-i" style={{ cursor: 'pointer', padding: 14 }} onClick={() => applyDesignSystem(ds)}>
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
            <div key={brand.n} className="card-i" style={{ cursor: 'pointer', padding: 10, minWidth: 140, flexShrink: 0 }} onClick={() => applyBrand(brand)}>
              <div style={{ display: 'flex', height: 28, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                {brand.colors.map((c, ci) => <div key={ci} style={{ flex: 1, background: c }} />)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{brand.n}</div>
            </div>
          ))}
        </div>
        </>}
      </section>

      {/* ═══ SECTION 5: GRADIENT TOOL ═══ */}
      <section id="gradients" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={() => toggleCollapse('gradients')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.gradients ? 0 : 14 }}>
          <svg className={`cs-chevron${collapsed.gradients ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Gradient Tool</h2>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s" onClick={addGradStop}>+ Add Stop</button>
            <button className="btn btn-s" onClick={() => setGradStops([{ color: null, position: 0 }, { color: null, position: 100 }])} style={{ fontSize: 10 }}>Reset</button>
          </div>
        </div>

        {!collapsed.gradients && <>
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
                    <button type="button" onClick={() => setStopPickerIdx(stopPickerIdx === si ? null : si)}
                      style={{ width: 32, height: 32, borderRadius: 6, cursor: 'pointer', background: resolved, border: '2px solid var(--border)', padding: 0, flexShrink: 0, transition: 'border-color .15s' }}
                      title="Pick from palette & tints"
                    />
                    <input type="text" value={resolved.toUpperCase()} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11, minWidth: 0 }}
                      onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) updateStop(si, { color: e.target.value }) }}
                    />
                    <input type="number" min="0" max="100" value={stop.position} onChange={e => updateStop(si, { position: Math.max(0, Math.min(100, +e.target.value)) })}
                      style={{ width: 52, fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', padding: '4px 2px', MozAppearance: 'textfield' }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>%</span>
                    {gradStops.length > 2 && (
                      <button onClick={() => removeGradStop(si)}
                        style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
                      >&times;</button>
                    )}
                    {stopPickerIdx === si && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--warm-shadow-lg)', padding: 12, marginTop: 4, width: 300 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Custom</div>
                          <input type="color" value={resolved} onChange={e => { updateStop(si, { color: e.target.value }) }}
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
              <button className="btn btn-s" onClick={addGradStop} style={{ fontSize: 10 }}>+ Stop</button>
              <button className="btn btn-s" onClick={() => setGradStops(prev => [...prev].reverse().map((s, i, arr) => ({ ...s, position: 100 - arr[arr.length - 1 - i].position })))} title="Flip gradient direction" style={{ fontSize: 10 }}>&#8644; Flip</button>
            </div>
          </div>

          {/* Properties */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Properties</div>
            <div className="seg-label">Type</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {GRAD_TYPES.map(t => (
                <button key={t} className={`pt-t${gradType === t ? ' on' : ''}`} onClick={() => setGradType(t)} style={{ flex: 1, justifyContent: 'center', padding: '5px 10px', fontSize: 11 }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div className="seg-label" style={{ marginBottom: 0 }}>Angle</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)' }}>{gradAngle}&deg;</span>
            </div>
            <input type="range" min="0" max="360" value={gradAngle} onChange={e => setGradAngle(snap(+e.target.value, 135, 5))} />

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


      {/* ── Flow CTA: Next step → Typography ── */}
      <div className="cs-next-step">
        <NavLink to="/fontpairs" className="cs-next-link">
          <span>Next step</span>
          <strong>Continue to Typography</strong>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </NavLink>
      </div>
      <UIKitGuide step="color" />

      {infoColor && (
        <ColorInfoPopup
          color={infoColor}
          onClose={() => setInfoColor(null)}
          onCopy={onCopy}
          onChange={(hex) => {
            const idx = allColors.indexOf(infoColor)
            if (idx >= 0) editPaletteColor(idx, hex)
            setInfoColor(hex)
          }}
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
