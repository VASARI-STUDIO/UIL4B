import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateHarmony, textColorForBg, hslToHex, hexToHsl, contrastRatio } from '../utils/colors'
import { usePalette } from '../contexts/PaletteContext'

const HARMS = ['analogous', 'complement', 'triadic', 'split', 'tetradic', 'monochromatic']
const HARM_LABELS = {
  analogous: 'Analogous',
  complement: 'Complementary',
  triadic: 'Triadic',
  split: 'Split Complementary',
  tetradic: 'Tetradic',
  monochromatic: 'Monochromatic',
}
const HARM_DESC = {
  analogous: 'Adjacent hues — cohesive and harmonious.',
  complement: 'Opposite hues — maximum contrast.',
  triadic: 'Three evenly spaced — vibrant balance.',
  split: 'Base + flanking complement hues.',
  tetradic: 'Four hues at 90° — rich variety.',
  monochromatic: 'Single hue — varied lightness.',
}
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']
const ROLE_DESC = ['Main Brand Color', 'Supporting Tone', 'High Visibility', 'Muted Backdrop', 'Dark Foundation']

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

const STATE_PRESETS = {
  success: [
    { name: 'Emerald', shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
    { name: 'Green', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
    { name: 'Teal', shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'] },
  ],
  warning: [
    { name: 'Amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
    { name: 'Orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
  ],
  error: [
    { name: 'Red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
    { name: 'Pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
  ],
  info: [
    { name: 'Blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
    { name: 'Sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
    { name: 'Indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
  ],
}
const STATE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

export default function PaletteBuilder({ onCopy }) {
  const [baseColor, setBaseColor] = useState('#d0bcff')
  const [harmony, setHarmony] = useState('analogous')
  const [extraColors, setExtraColors] = useState([])
  const [stateColors, setStateColors] = useState({ success: 0, warning: 0, error: 0, info: 0 })
  const colorRef = useRef(null)
  const navigate = useNavigate()
  const { savePalette } = usePalette()

  const colors = generateHarmony(baseColor, harmony)
  const allColors = [...colors, ...extraColors]

  useEffect(() => {
    savePalette(allColors)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony, extraColors.length])

  const sendToTints = (hex) => {
    navigate(`/tints?seed=${encodeURIComponent(hex)}`)
  }

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    setBaseColor(hex)
    setExtraColors([])
  }, [])

  const addColor = () => {
    const [h] = hexToHsl(baseColor)
    const offset = (extraColors.length + 1) * 47
    const newHex = hslToHex((h + offset) % 360, 55, 55)
    setExtraColors([...extraColors, newHex])
  }

  const updateExtra = (i, hex) => {
    const next = [...extraColors]
    next[i] = hex
    setExtraColors(next)
  }

  const removeExtra = (i) => {
    setExtraColors(extraColors.filter((_, idx) => idx !== i))
  }

  const applyBrand = (brand) => {
    setBaseColor(brand.colors[0])
    setExtraColors(brand.colors.slice(5))
  }

  const cssVars = `:root {\n${allColors.map((x, i) => `  --color-${i + 1}: ${x};`).join('\n')}\n}`

  const stateCSS = Object.entries(stateColors).map(([state, presetIdx]) => {
    const preset = STATE_PRESETS[state][presetIdx]
    return preset.shades.map((c, i) => `  --${state}-${STATE_LABELS[i]}: ${c};`).join('\n')
  }).join('\n')

  const fullCSS = `:root {\n${allColors.map((x, i) => `  --color-${i + 1}: ${x};`).join('\n')}\n\n${stateCSS}\n}`

  return (
    <div className="sec">
      {/* Title */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.05, marginBottom: 12 }}>
          Palette Builder
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          Build complete color systems for your brand. Pick a base color, choose a harmony, or start from a real brand palette.
        </p>
      </div>

      {/* Configuration + CSS Output */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 380px) 1fr', gap: 14, marginBottom: 48 }}>
        {/* Configuration */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Configuration</div>
          </div>

          <div style={{ padding: '0 22px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>Base Color</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                onClick={() => colorRef.current?.click()}
                style={{
                  width: 44, height: 44, borderRadius: 4, background: baseColor,
                  cursor: 'pointer', border: '1px solid var(--border)', flexShrink: 0
                }}
              />
              <input ref={colorRef} type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              <input
                type="text"
                value={baseColor.toUpperCase()}
                style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}
                onChange={e => {
                  let v = e.target.value
                  if (!v.startsWith('#')) v = '#' + v
                  if (/^#[0-9a-f]{6}$/i.test(v)) setBaseColor(v)
                }}
              />
            </div>
          </div>

          <div style={{ padding: '0 22px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>Harmony</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {HARMS.map(h => (
                <button
                  key={h}
                  type="button"
                  className={`harm-opt${harmony === h ? ' on' : ''}`}
                  onClick={() => setHarmony(h)}
                  style={{ padding: '8px 12px', fontSize: 12 }}
                >
                  <span style={{ fontWeight: 600 }}>{HARM_LABELS[h]}</span>
                  <span style={{ fontSize: 10, color: 'var(--t2)', marginLeft: 8 }}>{HARM_DESC[h]}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '8px 22px 22px', display: 'flex', gap: 8 }}>
            <button
              className="btn"
              onClick={addColor}
              style={{ flex: 1, justifyContent: 'center', fontWeight: 600, padding: '12px 16px' }}
            >
              + Add Color
            </button>
            <button
              className="btn btn-accent"
              onClick={randomPalette}
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Random palette"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2L19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2L11 5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* CSS Variables Output */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>CSS Output</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-s" onClick={() => sendToTints(colors[0])} style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }} title="Open Tint Generator with primary color">
                Tints &rarr;
              </button>
              <button className="btn btn-s" onClick={() => onCopy(fullCSS)} style={{ padding: '3px 8px' }} title="Copy all CSS variables">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div className="code" onClick={() => onCopy(fullCSS)} style={{ fontSize: 12, lineHeight: 1.8, maxHeight: 320, overflow: 'auto' }}>{fullCSS}</div>
        </div>
      </div>

      {/* System Tones */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>System Tones</h2>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(allColors.length, 6)}, 1fr)`, gap: 8, position: 'relative' }}>
          {colors.map((color, i) => (
            <div
              key={`h-${i}`}
              onClick={() => onCopy(color)}
              style={{
                background: color,
                borderRadius: 4,
                padding: '18px 14px',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform .12s',
                color: textColorForBg(color),
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.7 }}>
                {ROLES[i] || `TONE ${i + 1}`}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                  {color.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, opacity: 0.55, fontFamily: 'var(--mono)' }}>
                  {ROLE_DESC[i] || 'Custom'}
                </div>
              </div>
            </div>
          ))}
          {extraColors.map((color, i) => (
            <div
              key={`e-${i}`}
              style={{
                background: color,
                borderRadius: 4,
                padding: '18px 14px',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform .12s',
                color: textColorForBg(color),
                position: 'relative',
              }}
              onClick={() => onCopy(color)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.7 }}>
                  CUSTOM {i + 1}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeExtra(i) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: textColorForBg(color), opacity: 0.6, fontSize: 16, lineHeight: 1, padding: 0 }}
                  title="Remove color"
                >&times;</button>
              </div>
              <div>
                <input
                  type="text"
                  value={color.toUpperCase()}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    let v = e.target.value
                    if (!v.startsWith('#')) v = '#' + v
                    if (/^#[0-9a-f]{6}$/i.test(v)) updateExtra(i, v)
                  }}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700,
                    background: 'none', border: 'none', color: textColorForBg(color),
                    padding: 0, width: '100%', outline: 'none',
                  }}
                />
                <div style={{ fontSize: 10, opacity: 0.55, fontFamily: 'var(--mono)' }}>
                  Contrast: {contrastRatio(color, '#ffffff').toFixed(1)}:1
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 48 }} />

      {/* UI State Colors */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>UI State Colors</h2>
          <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.6 }}>
            Pick colors for success, warning, error, and info states. Each preset provides a full 10-shade scale ready for your design system.
          </p>
        </div>

        {Object.entries(STATE_PRESETS).map(([state, presets]) => {
          const activeIdx = stateColors[state]
          const active = presets[activeIdx]
          const stateIcon = state === 'success' ? '✓' : state === 'warning' ? '!' : state === 'error' ? '✕' : 'i'
          const stateColor = active.shades[5]
          return (
            <div key={state} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: stateColor, color: textColorForBg(stateColor),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>{stateIcon}</div>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{state}</span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  {presets.map((p, pi) => (
                    <button
                      key={p.name}
                      onClick={() => setStateColors({ ...stateColors, [state]: pi })}
                      className={`pt-t${pi === activeIdx ? ' on' : ''}`}
                      style={{ padding: '4px 10px', fontSize: 10 }}
                    >{p.name}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {active.shades.map((shade, si) => (
                  <div
                    key={si}
                    onClick={() => onCopy(shade)}
                    style={{
                      flex: 1, padding: '20px 0 8px', textAlign: 'center',
                      background: shade, cursor: 'pointer', transition: 'transform .1s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                      minHeight: 72,
                    }}
                  >
                    <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 600, color: textColorForBg(shade), opacity: 0.7 }}>
                      {STATE_LABELS[si]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <button className="btn btn-s" onClick={() => onCopy(`:root {\n${stateCSS}\n}`)} style={{ marginTop: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy State CSS
        </button>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 48 }} />

      {/* Brand Palettes */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Brand Palettes</h2>
          <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 24, lineHeight: 1.6 }}>
            Start from a proven brand's color system. Click any brand to load their palette.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px,100%), 1fr))', gap: 12 }}>
          {BRANDS.map(brand => (
            <div
              key={brand.n}
              className="card-i"
              style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
              onClick={() => applyBrand(brand)}
            >
              <div style={{ display: 'flex', height: 48 }}>
                {brand.colors.map((c, ci) => (
                  <div key={ci} style={{ flex: 1, background: c }} />
                ))}
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{brand.n}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {brand.colors.map((c, ci) => (
                    <span key={ci} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
                      {c.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
