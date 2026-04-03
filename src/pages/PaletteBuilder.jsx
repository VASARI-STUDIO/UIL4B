import { useState, useCallback, useRef } from 'react'
import { generateHarmony, textColorForBg, hslToHex, hexToHsl, contrastRatio } from '../utils/colors'

const HARMS = ['complement', 'analogous', 'triadic', 'monochromatic']
const HARM_LABELS = { complement: 'Complementary', analogous: 'Analogous', triadic: 'Triadic', monochromatic: 'Monochromatic' }
const ROLES = ['PRIMARY', 'CONTAINER', 'ACCENT', 'SUBTLE', 'DEEP']

const COLOR_NAMES = [
  [0, 'Crimson'], [15, 'Scarlet'], [30, 'Amber'], [45, 'Gold'], [60, 'Citrine'],
  [75, 'Lime'], [90, 'Chartreuse'], [120, 'Emerald'], [150, 'Jade'], [170, 'Teal'],
  [190, 'Cyan'], [210, 'Azure'], [230, 'Cobalt'], [245, 'Indigo'], [260, 'Violet'],
  [280, 'Amethyst'], [300, 'Magenta'], [320, 'Fuchsia'], [340, 'Rose'], [360, 'Crimson'],
]
const SUFFIXES = ['Voyager', 'Drift', 'Pulse', 'Nova', 'Flare', 'Spark', 'Bloom', 'Echo']

function getColorName(hex) {
  const [h, s, l] = hexToHsl(hex)
  if (s < 10) return l > 60 ? 'Silver Mist' : 'Obsidian Core'
  let name = 'Crimson'
  for (let i = 0; i < COLOR_NAMES.length - 1; i++) {
    if (h >= COLOR_NAMES[i][0] && h < COLOR_NAMES[i + 1][0]) { name = COLOR_NAMES[i][1]; break }
  }
  const si = Math.floor(h / 45) % SUFFIXES.length
  return `${name} ${SUFFIXES[si]}`
}

const STARTERS = [
  { n: 'Ocean Drift', d: 'Subtle slate blues for professional SaaS platforms.', c: ['#0a1628', '#1e3a5f', '#3a7bd5', '#63b3ed', '#bee3f8'] },
  { n: 'Emerald Pulse', d: 'Vibrant greens optimized for fintech and dashboards.', c: ['#1a2e1a', '#2d5a2d', '#4a8c4a', '#7bc47b', '#c8f0c8'] },
  { n: 'Royal Spectrum', d: 'Modern purples designed for high-end creative tools.', c: ['#1a0a1a', '#4a154b', '#7c3085', '#b660cd', '#e8b4f8'] },
]

export default function PaletteBuilder({ onCopy }) {
  const [baseColor, setBaseColor] = useState('#6366f1')
  const [harmony, setHarmony] = useState('complement')
  const colorRef = useRef(null)

  const colors = generateHarmony(baseColor, harmony)
  const ratio = contrastRatio(baseColor, '#ffffff')

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 40 + Math.floor(Math.random() * 20))
    setBaseColor(hex)
  }, [])

  const cssVars = `:root {\n${colors.map((x, i) => `  --p-${(ROLES[i] || 'swatch').toLowerCase()}: ${x};`).join('\n')}\n}`

  return (
    <div className="sec">
      {/* Hero */}
      <div className="sec-h">
        <h1>Refine your vision with <span style={{ color: 'var(--accent)' }}>algorithmic</span> precision.</h1>
        <p>The Palette Builder uses advanced color theory models to generate harmonious systems for enterprise interfaces.</p>
      </div>

      {/* Main split: controls left, swatches right */}
      <div className="split" style={{ marginBottom: 32 }}>
        {/* Single left card with all controls */}
        <div className="side">
          <div className="card" style={{ padding: 0 }}>
            {/* Base Signature */}
            <div style={{ padding: '22px 22px 18px' }}>
              <div className="sl">Base Signature</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div
                  onClick={() => colorRef.current?.click()}
                  style={{
                    width: 48, height: 48, borderRadius: 10, background: baseColor,
                    cursor: 'pointer', border: '1px solid var(--border)', flexShrink: 0
                  }}
                />
                <input ref={colorRef} type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={baseColor}
                  style={{ width: 120, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                  onChange={e => {
                    let v = e.target.value
                    if (!v.startsWith('#')) v = '#' + v
                    if (/^#[0-9a-f]{6}$/i.test(v)) setBaseColor(v)
                  }}
                />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginTop: 8 }}>{getColorName(baseColor)}</div>
            </div>

            {/* Harmony Logic */}
            <div style={{ padding: '18px 22px', borderTop: '1px solid var(--border)' }}>
              <div className="sl">Harmony Logic</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                {HARMS.map(h => (
                  <button key={h} className={`harm-opt${harmony === h ? ' on' : ''}`} onClick={() => setHarmony(h)}>
                    {HARM_LABELS[h]}{harmony === h ? ' \u2714' : '\u203A'}
                  </button>
                ))}
              </div>
            </div>

            {/* Contrast Filter */}
            <div style={{ padding: '18px 22px 22px', borderTop: '1px solid var(--border)' }}>
              <div className="sl">Contrast Filter</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--inp)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>WCAG {ratio.toFixed(1)} AA</span>
                <span className={`tag ${ratio >= 4.5 ? 'tag-pass' : 'tag-fail'}`}>{ratio >= 4.5 ? 'PASSED' : 'FAIL'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Palette swatches */}
        <div>
          <div className="pal-grid">
            {colors.map((color, i) => (
              <div key={i} className="pal-swatch" style={{ background: color, color: textColorForBg(color) }} onClick={() => onCopy(color)}>
                <div className="role">{ROLES[i] || `SWATCH ${i + 1}`}</div>
                <div className="hex">{color.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Variables + Interface Context */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))', gap: 12, marginBottom: 48 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>CSS Variables</span>
            <button className="btn btn-s" onClick={() => onCopy(cssVars)} style={{ gap: 4, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
          <div className="code" onClick={() => onCopy(cssVars)}>{cssVars}</div>
        </div>

        <div className="card" style={{ display: 'flex', gap: 20, overflow: 'hidden' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 24, height: 4, borderRadius: 2, background: 'var(--accent)' }} />
              <div style={{ width: 24, height: 4, borderRadius: 2, background: 'var(--bg-4)' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Interface Context</h3>
            <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 16 }}>
              Preview how your harmony translates to functional components like buttons, alerts, and navigation shells.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: colors[0] || 'var(--accent)', color: textColorForBg(colors[0] || '#6366f1'), fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Active State</button>
              <button style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${colors[0] || 'var(--accent)'}`, background: 'transparent', color: colors[0] || 'var(--accent)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Outline</button>
            </div>
          </div>
          <div style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, opacity: 0.5 }}>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-4)', width: '100%' }} />
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-4)', width: '80%' }} />
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-4)', width: '90%' }} />
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-4)', width: '60%' }} />
            <div style={{ height: 24, borderRadius: 6, background: colors[0] || 'var(--accent)', width: '65%', marginTop: 4, opacity: 0.7 }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: colors[1] || 'var(--accent)', alignSelf: 'flex-end', marginTop: -20, opacity: 0.8 }} />
          </div>
        </div>
      </div>

      {/* Starter Systems */}
      <div style={{ marginBottom: 48, position: 'relative' }}>
        {/* FAB + button */}
        <button
          onClick={randomPalette}
          style={{
            position: 'absolute', top: 0, right: 0, width: 48, height: 48, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 24, fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px var(--accent-glow)', transition: 'all var(--t)', zIndex: 2
          }}
        >+</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingRight: 60 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>Curation</div>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Starter Systems</h2>
          </div>
          <span style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>Browse Full Library &rarr;</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 14 }}>
          {STARTERS.map(p => (
            <div key={p.n} className="card" style={{ cursor: 'pointer', padding: 14 }} onClick={() => setBaseColor(p.c[2])}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', marginBottom: 10, height: 40 }}>
                {p.c.map(c => <div key={c} style={{ flex: 1, background: c }} />)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.n}</span>
                <span style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 600 }}>{p.c.length} COLORS</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
