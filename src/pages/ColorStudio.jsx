import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { generateHarmony, generateTintScale, textColorForBg, hslToHex, hexToHsl, contrastRatio, hexToRgb, luminance, T_LABELS } from '../utils/colors'
import { usePalette, useProject } from '../contexts/ProjectContext'
import { useI18n } from '../contexts/I18nContext'
import { useExport } from '../contexts/ExportContext'
import { useTheme } from '../contexts/ThemeContext'

const HARMS = ['analogous', 'complement', 'triadic', 'split', 'tetradic', 'monochromatic']
const HARM_LABELS = {
  analogous: 'Analogous', complement: 'Complementary', triadic: 'Triadic',
  split: 'Split Comp.', tetradic: 'Tetradic', monochromatic: 'Mono',
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
    { name: 'TW', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  ],
  warning: [
    { name: 'Amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
    { name: 'Orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
    { name: 'Apple', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#FF9500', '#e08200', '#b86a00', '#925300', '#6e3e00'] },
    { name: 'Material', shades: ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#FF9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100'] },
    { name: 'TW', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
  ],
  error: [
    { name: 'Red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
    { name: 'Pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
    { name: 'Apple', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#FF3B30', '#e0342a', '#b82a22', '#91211b', '#6e1914'] },
    { name: 'Material', shades: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#F44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c'] },
    { name: 'TW', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  ],
  info: [
    { name: 'Blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
    { name: 'Sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
    { name: 'Indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
    { name: 'Apple', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#007AFF', '#0062d6', '#004db3', '#003d8f', '#002e6b'] },
    { name: 'Material', shades: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196F3', '#1e88e5', '#1565c0', '#0d47a1', '#0a3880'] },
    { name: 'TW', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  ],
}
const STATE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

const STATE_BUNDLES = [
  { name: 'Default', config: { success: 0, warning: 0, error: 0, info: 0 } },
  { name: 'Vivid', config: { success: 1, warning: 2, error: 1, info: 0 } },
  { name: 'Cool', config: { success: 2, warning: 1, error: 2, info: 1 } },
  { name: 'Warm', config: { success: 1, warning: 0, error: 0, info: 2 } },
  { name: 'Apple', config: { success: 3, warning: 3, error: 3, info: 3 } },
  { name: 'Material', config: { success: 4, warning: 4, error: 4, info: 4 } },
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
]

const GRAD_TYPES = ['Linear', 'Radial', 'Conic']

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

const LT = { bg: '#ffffff', surface: '#f9f6f1', surfaceAlt: '#eee9e0', border: '#eee9e0', borderStrong: '#e2dcd2', text: '#1a1814', textMuted: '#5c5650', textFaint: '#8a847e', textGhost: '#b8b2aa', card: '#ffffff', inputBg: '#ffffff' }
const DK = { bg: '#1e1c18', surface: '#161412', surfaceAlt: '#28251f', border: '#353028', borderStrong: '#423c32', text: '#f3efe8', textMuted: '#a8a29e', textFaint: '#706b64', textGhost: '#4a453e', card: '#1e1c18', inputBg: '#28251f' }

function PreviewBtn({ children, bg, color, border, hoverBg, hoverBorder, style = {} }) {
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)
  const base = { padding: '8px 20px', borderRadius: 8, border: border || 'none', background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s ease', transform: active ? 'scale(.97)' : hover ? 'translateY(-1px)' : 'none', opacity: active ? .9 : 1, boxShadow: hover && !active ? '0 2px 8px rgba(0,0,0,.1)' : 'none', ...style }
  if (hover && hoverBg) base.background = hoverBg
  if (hover && hoverBorder) base.border = hoverBorder
  return <button style={base} onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setActive(false) }} onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}>{children}</button>
}

function PreviewNavItem({ label, isActive, activeBg, activeColor, idleBg, idleColor, hoverBg }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: 'pointer', transition: 'all .15s ease', background: isActive ? activeBg : hover ? (hoverBg || 'rgba(128,128,128,.08)') : (idleBg || 'transparent'), color: isActive ? activeColor : idleColor }}
    >{label}</div>
  )
}

function PreviewTableRow({ children, bg, hoverBg, style = {} }) {
  const [hover, setHover] = useState(false)
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ ...style, background: hover ? hoverBg : bg, transition: 'background .12s ease', cursor: 'default' }}>{children}</div>
}

function PreviewToast({ icon, msg, accentColor, iconBg, iconColor, bg, border, textColor }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${accentColor}`, transition: 'all .15s ease', transform: hover ? 'translateX(2px)' : 'none', cursor: 'default' }}
    >
      <div style={{ width: 22, height: 22, borderRadius: 6, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 12, color: textColor, flex: 1 }}>{msg}</span>
      <ContrastBadge fg={iconColor} bg={iconBg} />
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

export default function ColorStudio({ onCopy }) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const { design, setPalette, setStates, setTints, setGradient } = useProject()
  const { savePalette } = usePalette()

  const [baseColor, setBaseColor] = useState(() => design?.palette?.base || '#2563EB')
  const [harmony, setHarmony] = useState(() => design?.palette?.harmony || 'analogous')
  const [extraColors, setExtraColors] = useState(() => design?.palette?.extraColors || [])
  const [stateColors, setStateColors] = useState(() => design?.states || { success: 0, warning: 0, error: 0, info: 0 })
  const [activeColorIdx, setActiveColorIdx] = useState(() => design?.palette?.activeIdx || 0)
  const [cssExpanded, setCssExpanded] = useState(false)
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
    { id: 'preview', label: 'Preview' },
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
  const allColors = [...colors, ...extraColors]

  // Sync palette state to ProjectContext (full design persistence)
  useEffect(() => {
    setPalette({ base: baseColor, harmony, extraColors, activeIdx: activeColorIdx, colors: allColors })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony, extraColors, activeColorIdx, allColors.join(',')])

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
  --ds-radius: 12px; --ds-radius-s: 8px;
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
.color-swatch { height: 80px; position: relative; }
.color-swatch::after { content: 'Click to copy'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #fff; background: rgba(0,0,0,.45); backdrop-filter: blur(4px); opacity: 0; transition: opacity .2s; text-transform: uppercase; letter-spacing: .06em; }
.color-card:hover .color-swatch::after { opacity: 1; }
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
${allColors.map((c, i) => `        <div class="color-card" data-hex="${c}">
          <div class="color-swatch" style="background:${c}"></div>
          <div class="color-info">
            <div class="color-name">${labels[i]}</div>
            <div class="color-val">${c.toUpperCase()}</div>
          </div>
        </div>`).join('\n')}
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
  }, [allColors.join(','), tintScale.join(','), JSON.stringify(stateColors), theme])

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    setBaseColor(hex)
    setExtraColors([])
    setActiveColorIdx(0)
  }, [])

  const addColor = () => {
    const [h] = hexToHsl(baseColor)
    const offset = (extraColors.length + 1) * 47
    setExtraColors([...extraColors, hslToHex((h + offset) % 360, 55, 55)])
  }

  const removeExtra = (i) => {
    setExtraColors(extraColors.filter((_, idx) => idx !== i))
    if (activeColorIdx >= colors.length + i) setActiveColorIdx(0)
  }

  const applyBrand = (brand) => {
    setBaseColor(brand.colors[0])
    setExtraColors(brand.colors.slice(5))
    setActiveColorIdx(0)
  }

  const applyDesignSystem = (ds) => {
    setBaseColor(ds.base)
    setExtraColors(ds.colors.slice(1))
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
  const previewBg = '#ffffff'
  const previewDarkBg = '#1a1814'

  return (
    <div className="sec">
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.05, marginBottom: 10 }}>
          {t('color.title')}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          {t('tools.colorStudio.description')}
        </p>
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
          <button className="btn btn-s" onClick={(e) => { e.stopPropagation(); randomPalette() }} title="Random palette" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10" /><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
            </svg>
            Random
          </button>
          <button className="btn btn-s" onClick={(e) => { e.stopPropagation(); addColor() }}>+ Add Colour</button>
        </div>

        {!collapsed.palette && <>
        {/* Base color + harmony row */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                onClick={() => colorRef.current?.click()}
                style={{ width: 42, height: 42, borderRadius: 'var(--radius-s)', background: baseColor, cursor: 'pointer', border: '1px solid var(--border)', flexShrink: 0 }}
              />
              <input ref={colorRef} type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              <input
                type="text" value={baseColor.toUpperCase()}
                style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, width: 90 }}
                onChange={e => { let v = e.target.value; if (!v.startsWith('#')) v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) setBaseColor(v) }}
              />
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {HARMS.map(h => (
                <button key={h} className={`pt-t${harmony === h ? ' on' : ''}`} onClick={() => setHarmony(h)}
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
            return (
              <div key={i} style={{ position: 'relative', flex: '1 1 0', minWidth: 80 }}>
                <div
                  onClick={() => { setActiveColorIdx(i); onCopy(color) }}
                  style={{
                    background: color, borderRadius: 'var(--radius-s)', padding: '16px 12px',
                    minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    cursor: 'pointer', transition: 'transform .12s', color: textColorForBg(color),
                    border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                    outline: isActive ? '2px solid var(--accent-soft)' : 'none',
                    outlineOffset: 1,
                  }}
                >
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .6, marginBottom: 2 }}>
                    {ROLES[i] || `CUSTOM ${i - colors.length + 1}`}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
                    {color.toUpperCase()}
                  </div>
                </div>
                {isExtra && (
                  <button onClick={() => removeExtra(i - colors.length)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.4)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >&times;</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Compact CSS output */}
        <div className="card" style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setCssExpanded(!cssExpanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--t1)', padding: 0 }}
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
                style={{
                  width: 28, height: 28, borderRadius: 6, background: c, border: i === activeColorIdx ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer', transition: 'transform .1s',
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
        <div style={{ display: 'flex', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {tintScale.map((c, i) => (
            <div key={i} onClick={() => onCopy(c)}
              style={{
                flex: 1, padding: '22px 0 10px', textAlign: 'center', background: c, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                minHeight: 80, transition: 'transform .1s',
              }}
            >
              <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, color: textColorForBg(c), opacity: .7 }}>
                {T_LABELS[i]}
              </span>
              <span style={{ fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 600, color: textColorForBg(c), opacity: .5 }}>
                {c.toUpperCase().replace('#', '')}
              </span>
            </div>
          ))}
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
                    >{p.name}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', borderRadius: 'var(--radius-s)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {active.shades.map((shade, si) => (
                  <div key={si} onClick={() => onCopy(shade)}
                    style={{ flex: 1, padding: '16px 0 6px', textAlign: 'center', background: shade, cursor: 'pointer', minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
                  >
                    <span style={{ fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 600, color: textColorForBg(shade), opacity: .6 }}>
                      {STATE_LABELS[si]}
                    </span>
                  </div>
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
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
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

      {/* ═══ SECTION 5: UI PREVIEW COMPONENTS ═══ */}
      <section id="preview" style={{ marginBottom: 48, scrollMarginTop: 100 }}>
        <div className="cs-section-header" onClick={() => toggleCollapse('preview')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: collapsed.preview ? 0 : 14 }}>
          <svg className={`cs-chevron${collapsed.preview ? '' : ' open'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>UI Preview</h2>
        </div>
        {!collapsed.preview && <>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
          See your palette in context. Every component shown in light and dark mode with interactive states and WCAG contrast ratios.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px,100%),1fr))', gap: 14 }}>
          {/* ── Card Component ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 20, background: t.bg, color: t.text }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint }}>Card Component</span>
                  <ContrastBadge fg={primary} bg={t.bg} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: t.text }}>Dashboard Overview</h3>
                <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
                  Your design system is ready. Review the metrics below and export when satisfied.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewBtn bg={primary} color={textColorForBg(primary)}>Get Started</PreviewBtn>
                  <PreviewBtn bg="transparent" color={secondary} border={`1px solid ${secondary}`} hoverBg={`${secondary}12`}>Learn More</PreviewBtn>
                </div>
              </div>
              <div style={{ padding: '10px 20px', background: t.surface, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textFaint }}>
                <span>{t === LT ? 'Light' : 'Dark'}</span>
                <ContrastBadge fg={t.text} bg={t.bg} />
              </div>
            </div>
          ))}

          {/* ── Navigation ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 14, background: t.bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint }}>Navigation</span>
                  <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
                </div>
                <div style={{ display: 'flex', gap: 4, background: t.surfaceAlt, borderRadius: 8, padding: 4 }}>
                  <PreviewNavItem label="Dashboard" isActive activeBg={primary} activeColor={textColorForBg(primary)} idleColor={t.textMuted} />
                  <PreviewNavItem label="Projects" isActive={false} activeBg={primary} activeColor={textColorForBg(primary)} idleColor={t.textMuted} hoverBg={`${t.border}`} />
                  <PreviewNavItem label="Settings" isActive={false} activeBg={primary} activeColor={textColorForBg(primary)} idleColor={t.textMuted} hoverBg={`${t.border}`} />
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Form Elements ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 14, background: t.bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint }}>Form Elements</span>
                  <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
                </div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>Email Address</label>
                <div style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.borderStrong}`, background: t.inputBg, fontSize: 13, color: t.textGhost, marginBottom: 12 }}>user@example.com</div>
                <PreviewBtn bg={primary} color={textColorForBg(primary)} style={{ width: '100%', justifyContent: 'center' }}>Submit</PreviewBtn>
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Alerts ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 14, background: t.bg }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint, display: 'block', marginBottom: 10 }}>Alerts</span>
                {['success', 'warning', 'error', 'info'].map(state => {
                  const shade = STATE_PRESETS[state][stateColors[state]].shades
                  const alertBg = t === LT ? shade[0] : `${shade[8]}22`
                  const alertBorder = t === LT ? shade[2] : shade[8]
                  const alertText = t === LT ? shade[8] : shade[2]
                  return (
                    <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: alertBg, border: `1px solid ${alertBorder}`, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: shade[5], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: alertText, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{state} alert message</span>
                      <ContrastBadge fg={alertText} bg={alertBg} />
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Stats Widget ── */}
          {[LT, DK].map(t => {
            const stats = [
              { label: 'Revenue', value: '$12.4k', trend: '+12%', color: primary },
              { label: 'Users', value: '3,842', trend: '+8%', color: secondary },
              { label: 'Conversion', value: '2.4%', trend: '-3%', color: accent },
              { label: 'Avg. Time', value: '4:32', trend: '+5%', color: allColors[3] || primary },
            ]
            return (
              <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                <div style={{ padding: 14, background: t.bg }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint, display: 'block', marginBottom: 10 }}>Stats Widget</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {stats.map(s => (
                      <div key={s.label} style={{ padding: 12, background: t.card, borderRadius: 8, border: `1px solid ${t.border}` }}>
                        <div style={{ fontSize: 10, color: t.textFaint, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 2 }}>{s.value}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: s.trend.startsWith('+') ? STATE_PRESETS.success[stateColors.success].shades[5] : STATE_PRESETS.error[stateColors.error].shades[5] }}>{s.trend}</span>
                          <div style={{ width: 16, height: 3, borderRadius: 2, background: s.color, opacity: .6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
              </div>
            )
          })}

          {/* ── Badges & Tags ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 14, background: t.bg }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint, display: 'block', marginBottom: 12 }}>Badges & Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {allColors.map((c, i) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c, color: textColorForBg(c) }}>
                      {ROLES[i] || `Tag ${i + 1}`}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {allColors.map((c, i) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: `1px solid ${c}`, color: c, background: 'transparent' }}>
                      Outline {i + 1}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {allColors.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: t.textMuted }}>{c.toUpperCase()}</span>
                      <ContrastBadge fg={c} bg={t.bg} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Profile Card ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ height: 56, background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
              <div style={{ padding: '0 16px 16px', background: t.bg, position: 'relative' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: primary, color: textColorForBg(primary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, border: `3px solid ${t.bg}`, marginTop: -24, marginBottom: 10 }}>A</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: t.text }}>Alex Morgan</div>
                <div style={{ fontSize: 12, color: t.textFaint, marginBottom: 10 }}>Senior Product Designer</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: `${primary}18`, color: primary }}>Design</span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: `${secondary}18`, color: secondary }}>Systems</span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: `${accent}18`, color: accent }}>Research</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewBtn bg={primary} color={textColorForBg(primary)} style={{ flex: 1, padding: '7px', fontSize: 11 }}>Follow</PreviewBtn>
                  <PreviewBtn bg={t.card} color={t.text} border={`1px solid ${t.border}`} hoverBg={t.surfaceAlt} style={{ flex: 1, padding: '7px', fontSize: 11, fontWeight: 500 }}>Message</PreviewBtn>
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Pricing Card ── */}
          {[LT, DK].map(t => {
            const okShade = STATE_PRESETS.success[stateColors.success].shades
            return (
              <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                <div style={{ padding: 20, background: t.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: primary, color: textColorForBg(primary) }}>PRO</span>
                    <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: t.text }}>$29</span>
                    <span style={{ fontSize: 13, color: t.textFaint }}>/month</span>
                  </div>
                  {['Unlimited projects', 'Priority support', 'Custom branding', 'API access'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: t === LT ? okShade[1] : `${okShade[6]}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, color: okShade[t === LT ? 6 : 3], fontWeight: 700 }}>&#10003;</span>
                      </div>
                      <span style={{ fontSize: 12, color: t.textMuted }}>{f}</span>
                    </div>
                  ))}
                  <PreviewBtn bg={primary} color={textColorForBg(primary)} style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>Get Started</PreviewBtn>
                </div>
                <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
              </div>
            )
          })}

          {/* ── Data Table ── */}
          {[LT, DK].map(t => {
            const rows = [
              { name: 'Sarah Chen', status: 'Active', role: 'Admin', stateKey: 'success' },
              { name: 'James Wilson', status: 'Pending', role: 'Editor', stateKey: 'warning' },
              { name: 'Eva Martinez', status: 'Inactive', role: 'Viewer', stateKey: 'error' },
            ]
            return (
              <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                <div style={{ padding: '12px 16px', background: t.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint }}>Data Table</span>
                    <ContrastBadge fg={t.text} bg={t.bg} />
                  </div>
                  <div style={{ borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '8px 12px', background: t.surfaceAlt, fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                      <span>Name</span><span>Status</span><span>Role</span><span></span>
                    </div>
                    {rows.map((row, ri) => {
                      const stShade = STATE_PRESETS[row.stateKey][stateColors[row.stateKey]].shades
                      return (
                        <PreviewTableRow key={ri} bg={t.card} hoverBg={t.surfaceAlt}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '10px 12px', borderTop: `1px solid ${t.border}`, alignItems: 'center', fontSize: 12 }}
                        >
                          <span style={{ fontWeight: 600, color: t.text }}>{row.name}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: stShade[5] }} />
                            <span style={{ fontSize: 11, color: stShade[t === LT ? 7 : 3] }}>{row.status}</span>
                          </span>
                          <span style={{ fontSize: 11, color: t.textFaint }}>{row.role}</span>
                          <PreviewBtn bg={`${primary}12`} color={primary} border={`1px solid ${primary}30`} hoverBg={`${primary}22`} style={{ padding: '4px 10px', fontSize: 10 }}>Edit</PreviewBtn>
                        </PreviewTableRow>
                      )
                    })}
                  </div>
                </div>
                <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
              </div>
            )
          })}

          {/* ── Chat Bubbles ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 16, background: t.surface }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint, display: 'block', marginBottom: 12 }}>Chat Bubbles</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: secondary, color: textColorForBg(secondary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>J</div>
                    <div style={{ padding: '8px 14px', borderRadius: '12px 12px 12px 4px', background: t.card, border: `1px solid ${t.border}`, fontSize: 12, color: t.text, maxWidth: '75%' }}>
                      Hey, how does this palette look?
                      <div style={{ fontSize: 9, color: t.textGhost, marginTop: 4 }}>10:32 AM</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <div style={{ padding: '8px 14px', borderRadius: '12px 12px 4px 12px', background: primary, color: textColorForBg(primary), fontSize: 12, maxWidth: '75%' }}>
                      Looks great! Contrast ratios all pass AA.
                      <div style={{ fontSize: 9, opacity: .7, marginTop: 4 }}>10:33 AM</div>
                    </div>
                    <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: secondary, color: textColorForBg(secondary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>J</div>
                    <div style={{ padding: '8px 14px', borderRadius: '12px 12px 12px 4px', background: t.card, border: `1px solid ${t.border}`, fontSize: 12, color: t.text, maxWidth: '75%' }}>
                      Perfect, let's ship it!
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: t === LT ? t.surfaceAlt : t.bg, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Progress Bars ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 14, background: t.bg }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint, display: 'block', marginBottom: 12 }}>Progress & Loading</span>
                {[
                  { label: 'Design tokens', pct: 85, color: primary },
                  { label: 'Component library', pct: 62, color: secondary },
                  { label: 'Documentation', pct: 34, color: accent },
                  { label: 'Testing coverage', pct: 91, color: allColors[3] || primary },
                ].map(p => (
                  <div key={p.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: t.textMuted }}>{p.label}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: p.color }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: t.surfaceAlt, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, borderRadius: 3, background: p.color, transition: 'width .3s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── Toasts & Notifications ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ padding: 14, background: t.bg }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textFaint, display: 'block', marginBottom: 12 }}>Toasts & Notifications</span>
                {[
                  { type: 'success', msg: 'Changes saved successfully', icon: '✓' },
                  { type: 'error', msg: 'Failed to upload file', icon: '✕' },
                  { type: 'warning', msg: 'Storage almost full (90%)', icon: '!' },
                  { type: 'info', msg: 'New update available v2.4', icon: 'i' },
                ].map(toast => {
                  const shade = STATE_PRESETS[toast.type][stateColors[toast.type]].shades
                  return <PreviewToast key={toast.type} icon={toast.icon} msg={toast.msg} accentColor={shade[5]} iconBg={t === LT ? shade[1] : `${shade[7]}30`} iconColor={shade[t === LT ? 7 : 3]} bg={t.card} border={t.border} textColor={t.text} />
                })}
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textFaint }}>{t === LT ? 'Light' : 'Dark'}</div>
            </div>
          ))}

          {/* ── App Layout (full-width) ── */}
          {[LT, DK].map(t => (
            <div key={t.bg} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', height: 260 }}>
                <div style={{ width: 160, background: t === LT ? DK.bg : LT.bg, padding: 12, display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t === LT ? DK.textFaint : LT.textFaint, marginBottom: 6 }}>Sidebar</span>
                  {['Dashboard', 'Projects', 'Analytics', 'Settings'].map((item, idx) => (
                    <PreviewNavItem key={item} label={item} isActive={idx === 0} activeBg={primary} activeColor={textColorForBg(primary)} idleColor={t === LT ? DK.textMuted : LT.textMuted} hoverBg={t === LT ? DK.surfaceAlt : LT.surfaceAlt} />
                  ))}
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: accent, color: textColorForBg(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>A</div>
                    <span style={{ fontSize: 10, color: t === LT ? DK.textMuted : LT.textMuted }}>Alex M.</span>
                  </div>
                </div>
                <div style={{ flex: 1, background: t.bg, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>Dashboard</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1 }}>
                    {allColors.slice(0, 4).map((c, i) => (
                      <div key={i} style={{ borderRadius: 8, border: `1px solid ${t.border}`, padding: 8, background: t.card }}>
                        <div style={{ width: '100%', height: 4, borderRadius: 2, background: c, marginBottom: 6 }} />
                        <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{[247, 1.2, 89, 4.8][i]}{['', 'k', '%', 's'][i]}</div>
                        <div style={{ fontSize: 9, color: t.textFaint }}>{['Views', 'Revenue', 'Uptime', 'Latency'][i]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: t.surface, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textFaint }}>
                <span>App layout — {t === LT ? 'Light' : 'Dark'}</span>
                <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
              </div>
            </div>
          ))}
        </div>
        </>}
      </section>

      {/* ═══ SECTION 6: GRADIENT TOOL ═══ */}
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
                    <input type="color" value={resolved} onChange={e => updateStop(si, { color: e.target.value })} style={{ width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }} />
                    <input type="text" value={resolved.toUpperCase()} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11, minWidth: 0 }}
                      onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) updateStop(si, { color: e.target.value }) }}
                    />
                    <input type="number" min="0" max="100" value={stop.position} onChange={e => updateStop(si, { position: Math.max(0, Math.min(100, +e.target.value)) })}
                      style={{ width: 52, fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>%</span>
                    <button type="button" onClick={() => setStopPickerIdx(stopPickerIdx === si ? null : si)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', fontSize: 10, color: 'var(--t2)', transition: 'all .15s' }}
                      title="Fill from palette or tints"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.3-3.5-4-6.5c-.7 3-2 4.5-4 6.5S5 13 5 15a7 7 0 007 7z"/></svg>
                    </button>
                    {gradStops.length > 2 && (
                      <button onClick={() => removeGradStop(si)}
                        style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
                      >&times;</button>
                    )}
                    {stopPickerIdx === si && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--warm-shadow-lg)', padding: 12, marginTop: 4, width: 260 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 6 }}>From Palette</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                          {allColors.map((c, ci) => (
                            <div key={ci} onClick={() => { updateStop(si, { color: c }); setStopPickerIdx(null) }}
                              style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: '1px solid var(--border)' }} title={c}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 6 }}>From Tints</div>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {tintScale.map((c, ti) => (
                            <div key={ti} onClick={() => { updateStop(si, { color: c }); setStopPickerIdx(null) }}
                              style={{ width: 20, height: 20, borderRadius: 3, background: c, cursor: 'pointer', border: '1px solid var(--border)' }} title={c}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-s" onClick={() => setGradStops(gradStops.map((s, i) => ({ ...s, color: null })))} style={{ fontSize: 10 }}>Auto from palette</button>
              <button className="btn btn-s" onClick={addGradStop} style={{ fontSize: 10 }}>+ Stop</button>
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

        {/* Presets — large vertical cards */}
        <div style={{ marginBottom: 14 }}>
          <div className="seg-label">Presets</div>
          <div className="grad-presets">
            {GRAD_PRESETS.map(g => {
              const previewCss = `${g.type === 'Radial' ? 'radial-gradient' : g.type === 'Conic' ? 'conic-gradient' : 'linear-gradient'}(${g.type === 'Linear' ? g.angle + 'deg, ' : g.type === 'Conic' ? 'from ' + g.angle + 'deg, ' : ''}${g.stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`
              return (
                <div key={g.n} className="grad-p" onClick={() => applyPreset(g)}>
                  <div className="grad-p-preview" style={{ background: previewCss }} />
                  <div className="grad-p-info">
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--t0)' }}>{g.n}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      {g.stops.map((s, si) => (
                        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, border: '1px solid var(--border)' }} />
                          <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{s.color.toUpperCase()}</span>
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
        </>}
      </section>
    </div>
  )
}
