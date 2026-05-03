import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { generateHarmony, generateTintScale, textColorForBg, hslToHex, hexToHsl, contrastRatio, hexToRgb, luminance, T_LABELS } from '../utils/colors'
import { usePalette } from '../contexts/PaletteContext'

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

const STATE_BUNDLES = [
  { name: 'Default', config: { success: 0, warning: 0, error: 0, info: 0 } },
  { name: 'Vivid', config: { success: 1, warning: 2, error: 1, info: 0 } },
  { name: 'Cool', config: { success: 2, warning: 1, error: 2, info: 1 } },
  { name: 'Warm', config: { success: 1, warning: 0, error: 0, info: 2 } },
]

const GRAD_PRESETS = [
  { n: 'Indigo Rose', css: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { n: 'Peach', css: 'linear-gradient(to right,#ee9ca7,#ffdde1)' },
  { n: 'Aqua', css: 'linear-gradient(to right,#1a2980,#26d0ce)' },
  { n: 'Celestial', css: 'linear-gradient(to right,#c33764,#1d2671)' },
  { n: 'Relay', css: 'linear-gradient(to right,#3a1c71,#d76d77,#ffaf7b)' },
  { n: 'Sublime', css: 'linear-gradient(to right,#fc5c7d,#6a82fb)' },
  { n: 'Flare', css: 'linear-gradient(to right,#f12711,#f5af19)' },
  { n: 'Emerald', css: 'linear-gradient(to right,#348f50,#56b4d3)' },
]

const GRAD_TYPES = ['Linear', 'Radial', 'Conic']

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
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
  const [baseColor, setBaseColor] = useState('#7c5cfc')
  const [harmony, setHarmony] = useState('analogous')
  const [extraColors, setExtraColors] = useState([])
  const [stateColors, setStateColors] = useState({ success: 0, warning: 0, error: 0, info: 0 })
  const [activeColorIdx, setActiveColorIdx] = useState(0)
  const [cssExpanded, setCssExpanded] = useState(false)
  const colorRef = useRef(null)
  const { savePalette } = usePalette()

  const [lumBias, setLumBias] = useState(82)
  const [satDecay, setSatDecay] = useState(12)
  const [oled, setOled] = useState(true)

  const [gradColor1, setGradColor1] = useState(null)
  const [gradColor2, setGradColor2] = useState(null)
  const [gradAngle, setGradAngle] = useState(135)
  const [gradType, setGradType] = useState('Linear')

  const colors = generateHarmony(baseColor, harmony)
  const allColors = [...colors, ...extraColors]

  useEffect(() => {
    savePalette(allColors)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony, extraColors.length])

  const activeColor = allColors[activeColorIdx] || allColors[0]

  const tintScale = useMemo(() => {
    return generateTintScale({
      hex: activeColor, anchor: 5, hueShift: 0,
      satMin: -satDecay, satMax: satDecay / 2,
      lMin: oled ? 3 : 5, lMax: lumBias, mode: 'perceived',
    })
  }, [activeColor, lumBias, satDecay, oled])

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

  const gc1 = gradColor1 || allColors[0]
  const gc2 = gradColor2 || allColors[1] || allColors[0]
  const gradFn = gradType === 'Radial' ? 'radial-gradient' : gradType === 'Conic' ? 'conic-gradient' : 'linear-gradient'
  const angleStr = gradType === 'Linear' ? `${gradAngle}deg, ` : gradType === 'Conic' ? `from ${gradAngle}deg, ` : ''
  const gradCSS = `${gradFn}(${angleStr}${gc1}, ${gc2})`

  const primary = allColors[0]
  const secondary = allColors[1] || allColors[0]
  const accent = allColors[2] || allColors[0]
  const previewBg = '#ffffff'
  const previewDarkBg = '#1a1814'

  return (
    <div className="sec">
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.05, marginBottom: 10 }}>
          Color Studio
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          Build complete color systems — palette, tints, contrast checks, and gradients — all in one place.
        </p>
      </div>

      {/* ═══ SECTION 1: PALETTE BUILDER ═══ */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Palette Builder</h2>
          <button className="btn btn-s" onClick={randomPalette} title="Random palette" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10" /><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
            </svg>
            Random
          </button>
          <button className="btn btn-s" onClick={addColor}>+ Add Color</button>
        </div>

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
      </section>

      {/* ═══ SECTION 2: TINT SCALES ═══ */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Tint Scale</h2>

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
      </section>

      {/* ═══ SECTION 3: UI STATE COLORS ═══ */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>UI State Colors</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
      </section>

      {/* ═══ SECTION 4: DESIGN SYSTEMS ═══ */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Design Systems</h2>
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
      </section>

      {/* ═══ SECTION 5: UI PREVIEW COMPONENTS ═══ */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>UI Preview</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
          See your palette in context. Inline contrast ratios show WCAG compliance.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px,100%),1fr))', gap: 14 }}>
          {/* Card Preview — Light */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, background: previewBg, color: '#1a1814', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e' }}>Card Component</span>
                <ContrastBadge fg={primary} bg={previewBg} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#1a1814' }}>Dashboard Overview</h3>
              <p style={{ fontSize: 13, color: '#5c5650', lineHeight: 1.6, marginBottom: 16 }}>
                Your design system is ready. Review the metrics below and export when satisfied.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: primary, color: textColorForBg(primary), fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Get Started
                </button>
                <button style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${secondary}`, background: 'transparent', color: secondary, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  Learn More
                </button>
              </div>
            </div>
            <div style={{ padding: '10px 20px', background: '#f9f6f1', borderTop: '1px solid #eee9e0', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8a847e' }}>
              <span>Light theme</span>
              <ContrastBadge fg="#1a1814" bg={previewBg} />
            </div>
          </div>

          {/* Card Preview — Dark */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, background: previewDarkBg, color: '#f3efe8', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#706b64' }}>Card Component</span>
                <ContrastBadge fg={primary} bg={previewDarkBg} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#f3efe8' }}>Analytics Report</h3>
              <p style={{ fontSize: 13, color: '#a8a29e', lineHeight: 1.6, marginBottom: 16 }}>
                Track performance metrics and identify trends in your design system usage.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: primary, color: textColorForBg(primary), fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  View Report
                </button>
                <button style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${secondary}`, background: 'transparent', color: secondary, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  Export
                </button>
              </div>
            </div>
            <div style={{ padding: '10px 20px', background: '#161412', borderTop: '1px solid #28251f', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#706b64' }}>
              <span>Dark theme</span>
              <ContrastBadge fg="#f3efe8" bg={previewDarkBg} />
            </div>
          </div>

          {/* Nav Bar Preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 14, background: previewBg }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e', marginBottom: 10 }}>Navigation</div>
              <div style={{ display: 'flex', gap: 4, background: '#eee9e0', borderRadius: 8, padding: 4 }}>
                <div style={{ padding: '7px 16px', borderRadius: 6, background: primary, color: textColorForBg(primary), fontSize: 12, fontWeight: 600 }}>Dashboard</div>
                <div style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, color: '#5c5650' }}>Projects</div>
                <div style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, color: '#5c5650' }}>Settings</div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
              </div>
            </div>
          </div>

          {/* Form Preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 14, background: previewBg }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e', marginBottom: 10 }}>Form Elements</div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5c5650', marginBottom: 4 }}>Email Address</label>
              <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2dcd2', background: '#fff', fontSize: 13, color: '#b8b2aa', marginBottom: 12 }}>user@example.com</div>
              <button style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: primary, color: textColorForBg(primary), fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Submit
              </button>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
              </div>
            </div>
          </div>

          {/* Alert Previews */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>Alerts</div>
            {['success', 'warning', 'error', 'info'].map(state => {
              const shade = STATE_PRESETS[state][stateColors[state]].shades
              return (
                <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: shade[0], border: `1px solid ${shade[2]}`, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: shade[5], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: shade[8], fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{state} alert message</span>
                  <ContrastBadge fg={shade[8]} bg={shade[0]} />
                </div>
              )
            })}
          </div>

          {/* Stats Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 14, background: previewBg }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e', marginBottom: 10 }}>Stats Widget</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Revenue', value: '$12.4k', trend: '+12%', color: primary },
                  { label: 'Users', value: '3,842', trend: '+8%', color: secondary },
                  { label: 'Conversion', value: '2.4%', trend: '-3%', color: accent },
                  { label: 'Avg. Time', value: '4:32', trend: '+5%', color: allColors[3] || primary },
                ].map(s => (
                  <div key={s.label} style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #eee9e0' }}>
                    <div style={{ fontSize: 10, color: '#8a847e', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1814', marginBottom: 2 }}>{s.value}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: s.trend.startsWith('+') ? '#16a34a' : '#dc2626' }}>{s.trend}</span>
                      <div style={{ width: 16, height: 3, borderRadius: 2, background: s.color, opacity: .6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badges & Tags */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Badges & Tags</div>
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
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t1)' }}>{c.toUpperCase()}</span>
                  <ContrastBadge fg={c} bg={previewBg} />
                </div>
              ))}
            </div>
          </div>

          {/* Profile / Avatar Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 56, background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
            <div style={{ padding: '0 16px 16px', position: 'relative' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: primary, color: textColorForBg(primary),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700,
                border: '3px solid var(--card)', marginTop: -24, marginBottom: 10,
              }}>A</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Alex Morgan</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>Senior Product Designer</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: `${primary}18`, color: primary }}>Design</span>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: `${secondary}18`, color: secondary }}>Systems</span>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: `${accent}18`, color: accent }}>Research</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: primary, color: textColorForBg(primary), fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Follow</button>
                <button style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid var(--border)`, background: 'var(--card)', color: 'var(--t0)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Message</button>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, background: previewBg }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e', marginBottom: 8 }}>Pricing Card</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: primary, color: textColorForBg(primary) }}>PRO</span>
                <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#1a1814' }}>$29</span>
                <span style={{ fontSize: 13, color: '#8a847e' }}>/month</span>
              </div>
              {['Unlimited projects', 'Priority support', 'Custom branding', 'API access'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${STATE_PRESETS.success[stateColors.success].shades[1]}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: STATE_PRESETS.success[stateColors.success].shades[6], fontWeight: 700 }}>&#10003;</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#5c5650' }}>{f}</span>
                </div>
              ))}
              <button style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: primary, color: textColorForBg(primary), fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 }}>
                Get Started
              </button>
            </div>
          </div>

          {/* Table / List Preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: previewBg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e' }}>Data Table</span>
                <ContrastBadge fg="#1a1814" bg={previewBg} />
              </div>
              <div style={{ borderRadius: 8, border: '1px solid #eee9e0', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '8px 12px', background: '#eee9e0', fontSize: 10, fontWeight: 700, color: '#5c5650', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  <span>Name</span><span>Status</span><span>Role</span><span></span>
                </div>
                {[
                  { name: 'Sarah Chen', status: 'Active', role: 'Admin', stateKey: 'success' },
                  { name: 'James Wilson', status: 'Pending', role: 'Editor', stateKey: 'warning' },
                  { name: 'Eva Martinez', status: 'Inactive', role: 'Viewer', stateKey: 'error' },
                ].map((row, ri) => {
                  const stShade = STATE_PRESETS[row.stateKey][stateColors[row.stateKey]].shades
                  return (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', padding: '10px 12px', background: '#fff', borderTop: '1px solid #eee9e0', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: '#1a1814' }}>{row.name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: stShade[5] }} />
                        <span style={{ fontSize: 11, color: stShade[7] }}>{row.status}</span>
                      </span>
                      <span style={{ fontSize: 11, color: '#8a847e' }}>{row.role}</span>
                      <button style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${primary}22`, background: `${primary}08`, color: primary, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Chat / Message Bubbles */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 16, background: '#f9f6f1' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a847e', marginBottom: 12 }}>Chat Bubbles</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: secondary, color: textColorForBg(secondary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>J</div>
                  <div style={{ padding: '8px 14px', borderRadius: '12px 12px 12px 4px', background: '#fff', border: '1px solid #eee9e0', fontSize: 12, color: '#1a1814', maxWidth: '75%' }}>
                    Hey, how does this palette look?
                    <div style={{ fontSize: 9, color: '#b8b2aa', marginTop: 4 }}>10:32 AM</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <div style={{ padding: '8px 14px', borderRadius: '12px 12px 4px 12px', background: primary, color: textColorForBg(primary), fontSize: 12, maxWidth: '75%' }}>
                    Looks great! The contrast ratios all pass AA.
                    <div style={{ fontSize: 9, opacity: .7, marginTop: 4 }}>10:33 AM</div>
                  </div>
                  <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: secondary, color: textColorForBg(secondary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>J</div>
                  <div style={{ padding: '8px 14px', borderRadius: '12px 12px 12px 4px', background: '#fff', border: '1px solid #eee9e0', fontSize: 12, color: '#1a1814', maxWidth: '75%' }}>
                    Perfect, let's ship it!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Progress & Loading</div>
            {[
              { label: 'Design tokens', pct: 85, color: primary },
              { label: 'Component library', pct: 62, color: secondary },
              { label: 'Documentation', pct: 34, color: accent },
              { label: 'Testing coverage', pct: 91, color: allColors[3] || primary },
            ].map(p => (
              <div key={p.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--t1)' }}>{p.label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: p.color }}>{p.pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, borderRadius: 3, background: p.color, transition: 'width .3s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', height: 280 }}>
              <div style={{ width: 180, background: previewDarkBg, padding: 14, display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#706b64', marginBottom: 8 }}>Sidebar</div>
                {['Dashboard', 'Projects', 'Analytics', 'Settings'].map((item, idx) => (
                  <div key={item} style={{
                    padding: '7px 10px', borderRadius: 6, fontSize: 11, fontWeight: idx === 0 ? 600 : 400,
                    background: idx === 0 ? primary : 'transparent',
                    color: idx === 0 ? textColorForBg(primary) : '#a8a29e',
                  }}>{item}</div>
                ))}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, color: textColorForBg(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>A</div>
                  <span style={{ fontSize: 11, color: '#a8a29e' }}>Alex M.</span>
                </div>
              </div>
              <div style={{ flex: 1, background: previewBg, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1814', marginBottom: 4 }}>Dashboard</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1 }}>
                  {allColors.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ borderRadius: 8, border: '1px solid #eee9e0', padding: 10, background: '#fff' }}>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: c, marginBottom: 8 }} />
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1814' }}>{[247, 1.2, 89, 4.8][i]}{['', 'k', '%', 's'][i]}</div>
                      <div style={{ fontSize: 9, color: '#8a847e' }}>{['Views', 'Revenue', 'Uptime', 'Latency'][i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '8px 14px', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t2)' }}>
              <span>App layout</span>
              <ContrastBadge fg={textColorForBg(primary)} bg={primary} />
            </div>
          </div>

          {/* Toast / Notification Preview */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Toasts & Notifications</div>
            {[
              { type: 'success', msg: 'Changes saved successfully', icon: '✓' },
              { type: 'error', msg: 'Failed to upload file', icon: '✕' },
              { type: 'warning', msg: 'Storage almost full (90%)', icon: '!' },
              { type: 'info', msg: 'New update available v2.4', icon: 'i' },
            ].map(t => {
              const shade = STATE_PRESETS[t.type][stateColors[t.type]].shades
              return (
                <div key={t.type} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6,
                  borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${shade[5]}`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, background: shade[1], color: shade[7],
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{t.icon}</div>
                  <span style={{ fontSize: 12, color: 'var(--t0)', flex: 1 }}>{t.msg}</span>
                  <ContrastBadge fg={shade[7]} bg={shade[1]} />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6: GRADIENT TOOL ═══ */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Gradient Tool</h2>

        <div className="grad-big" style={{ background: gradCSS, borderRadius: 'var(--radius)' }}>
          <div className="grad-tags">
            <span className="grad-tag">{gradFn.toUpperCase()}</span>
            <span className="grad-tag">{gradAngle}&deg;</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%),1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Colors</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Start</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={gc1} onChange={e => setGradColor1(e.target.value)} />
                  <input type="text" value={gc1} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11 }}
                    onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setGradColor1(e.target.value) }}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="seg-label">End</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={gc2} onChange={e => setGradColor2(e.target.value)} />
                  <input type="text" value={gc2} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11 }}
                    onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setGradColor2(e.target.value) }}
                  />
                </div>
              </div>
            </div>
            <button className="btn btn-s" onClick={() => { setGradColor1(null); setGradColor2(null) }} style={{ fontSize: 10 }}>
              Auto from palette
            </button>
          </div>

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
          </div>
        </div>

        {/* Presets */}
        <div style={{ marginBottom: 14 }}>
          <div className="seg-label">Presets</div>
          <div className="grad-presets">
            {GRAD_PRESETS.map(g => (
              <div key={g.n} className="grad-p" style={{ background: g.css }} onClick={() => onCopy(`background: ${g.css};`)} title={g.n} />
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="card" style={{ padding: '12px 16px' }}>
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
      </section>
    </div>
  )
}
