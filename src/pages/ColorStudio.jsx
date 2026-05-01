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
  ],
  warning: [
    { name: 'Amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
  ],
  error: [
    { name: 'Red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
  ],
  info: [
    { name: 'Blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
    { name: 'Indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
  ],
}
const STATE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

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
              <input type="range" min="50" max="100" value={lumBias} onChange={e => setLumBias(+e.target.value)} style={{ width: 80 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{lumBias}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 9 }}>Sat</span>
              <input type="range" min="0" max="50" value={satDecay} onChange={e => setSatDecay(+e.target.value)} style={{ width: 80 }} />
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
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>UI State Colors</h2>
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
            <input type="range" min="0" max="360" value={gradAngle} onChange={e => setGradAngle(+e.target.value)} />
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
