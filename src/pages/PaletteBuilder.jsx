import { useState, useCallback } from 'react'
import { generateHarmony, textColorForBg, hslToHex, contrastRatio } from '../utils/colors'

const HARMS = ['complement', 'analogous', 'triadic', 'split', 'tetradic']
const HARM_LABELS = { complement: 'Complementary', analogous: 'Analogous', triadic: 'Triadic', split: 'Split Complementary', tetradic: 'Tetradic' }
const ROLES = ['PRIMARY', 'CONTAINER', 'ACCENT', 'SUBTLE', 'DEEP']

const STARTERS = [
  { n: 'Ocean Drift', d: 'Subtle slate blues for professional SaaS platforms.', c: ['#0a1628', '#1e3a5f', '#3a7bd5', '#63b3ed', '#bee3f8'] },
  { n: 'Emerald Pulse', d: 'Vibrant greens optimized for fintech and dashboards.', c: ['#1a2e1a', '#2d5a2d', '#4a8c4a', '#7bc47b', '#c8f0c8'] },
  { n: 'Royal Spectrum', d: 'Modern purples designed for high-end creative tools.', c: ['#1a0a1a', '#4a154b', '#7c3085', '#b660cd', '#e8b4f8'] },
  { n: 'Midnight', d: 'Deep blues for immersive dark interfaces.', c: ['#0f0f23', '#1a1a3e', '#4a4a8a', '#8888cc', '#ccccff'] },
  { n: 'Ember', d: 'Warm tones for lifestyle and hospitality brands.', c: ['#2d1b0e', '#8b4513', '#d2691e', '#f4a460', '#ffe4c4'] },
  { n: 'Slate', d: 'Neutral greys for minimal enterprise design.', c: ['#0f1419', '#1e2630', '#384250', '#6b7b8d', '#b0bec5'] },
]

export default function PaletteBuilder({ onCopy }) {
  const [baseColor, setBaseColor] = useState('#6366f1')
  const [harmony, setHarmony] = useState('complement')

  const colors = generateHarmony(baseColor, harmony)
  const ratio = contrastRatio(baseColor, '#ffffff')

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 40 + Math.floor(Math.random() * 20))
    setBaseColor(hex)
  }, [])

  const cssVars = `:root {\n${colors.map((x, i) => `  --p-${(ROLES[i] || 'swatch').toLowerCase()}: ${x};`).join('\n')}\n}`

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Refine your vision with <span style={{ color: 'var(--accent)' }}>algorithmic</span> precision.</h1>
        <p>The Palette Builder uses advanced color theory models to generate harmonious systems for enterprise interfaces.</p>
      </div>

      <div className="split" style={{ marginBottom: 32 }}>
        <div className="side">
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Base Signature</div>
            <div className="row" style={{ marginTop: 8 }}>
              <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} />
              <input
                type="text"
                value={baseColor}
                style={{ width: 120, fontFamily: 'var(--mono)' }}
                onChange={e => {
                  let v = e.target.value
                  if (!v.startsWith('#')) v = '#' + v
                  if (/^#[0-9a-f]{6}$/i.test(v)) setBaseColor(v)
                }}
              />
            </div>
            <button className="btn btn-s" style={{ marginTop: 10 }} onClick={randomPalette}>Random</button>
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Harmony Logic</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {HARMS.map(h => (
                <button key={h} className={`harm-opt${harmony === h ? ' on' : ''}`} onClick={() => setHarmony(h)}>
                  {HARM_LABELS[h]}{harmony === h ? ' \u2714' : '\u203A'}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Contrast Filter</div>
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>WCAG {ratio.toFixed(1)} AA</span>
              <span className={`tag ${ratio >= 4.5 ? 'tag-pass' : 'tag-fail'}`}>{ratio >= 4.5 ? 'PASSED' : 'FAIL'}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="pal-grid">
            {colors.map((color, i) => (
              <div key={i} className="pal-swatch" style={{ background: color, color: textColorForBg(color) }} onClick={() => onCopy(color)}>
                <div className="role">{ROLES[i] || `SWATCH ${i + 1}`}</div>
                <div className="hex">{color}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))', gap: 12, marginBottom: 48 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>CSS Variables</span>
            <button className="btn btn-s" onClick={() => onCopy(cssVars)} style={{ gap: 4 }}>Copy</button>
          </div>
          <div className="code" onClick={() => onCopy(cssVars)}>{cssVars}</div>
        </div>
        <div className="card">
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
      </div>

      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
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
