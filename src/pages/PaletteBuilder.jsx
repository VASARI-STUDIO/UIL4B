import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateHarmony, textColorForBg, hslToHex } from '../utils/colors'
import { usePalette } from '../contexts/PaletteContext'

const HARMS = ['complement', 'analogous', 'triadic', 'monochromatic']
const HARM_LABELS = { complement: 'Complementary', analogous: 'Analogous Focus', triadic: 'Triadic Spread', monochromatic: 'Monochromatic' }
const ROLES = ['PRIMARY', 'CONTAINER', 'ACCENT', 'SUBTLE', 'DEEP']
const ROLE_DESC = ['Main Brand Anchor', 'Surface Accent', 'High Visibility', 'Muted Backdrop', 'Absolute Foundation']

const STARTERS = [
  { n: 'Neon Monolith', d: 'High-contrast UI for developer-centric dashboards.', c: ['#6b7cff', '#3a3f6b', '#cfcc45'] },
  { n: 'Glass Prism', d: 'Soft tonal shifts optimized for immersive editorial layouts.', c: ['#4fa8d5', '#6b8cff', '#555'] },
  { n: 'Shadow Tech', d: 'Ultra-dark foundations for military-grade security interfaces.', c: ['#666', '#a855f7'] },
]

export default function PaletteBuilder({ onCopy }) {
  const [baseColor, setBaseColor] = useState('#d0bcff')
  const [harmony, setHarmony] = useState('analogous')
  const colorRef = useRef(null)
  const navigate = useNavigate()
  const { savePalette } = usePalette()

  const colors = generateHarmony(baseColor, harmony)

  useEffect(() => {
    savePalette(colors)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor, harmony])

  const sendToTints = (hex) => {
    navigate(`/tints?seed=${encodeURIComponent(hex)}`)
  }

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    setBaseColor(hex)
  }, [])

  const cssVars = `:root {\n${colors.map((x, i) => `  --obs-${(ROLES[i] || 'swatch').toLowerCase()}: ${x};`).join('\n')}\n  --obs-surface: #131314;\n  --obs-elevation-1: 0 4px 24px rgba(208, 188, 255, 0.08);\n}`

  return (
    <div className="sec">
      {/* Title */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.05, marginBottom: 12, fontStyle: 'italic' }}>
          Palette Builder
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          Generate high-performance tonal systems optimized for accessibility and brand authority. Driven by Obsidian Logic's proprietary color engine.
        </p>
      </div>

      {/* Configuration Engine + CSS Variables Output */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 380px) 1fr', gap: 14, marginBottom: 48 }}>
        {/* Configuration Engine */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Configuration Engine</div>
          </div>

          <div style={{ padding: '0 22px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>Base Signature</div>
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
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 10 }}>Harmony Logic</div>
            <select
              value={harmony}
              onChange={e => setHarmony(e.target.value)}
              style={{ width: '100%', fontSize: 13, fontWeight: 500 }}
            >
              {HARMS.map(h => (
                <option key={h} value={h}>{HARM_LABELS[h]}</option>
              ))}
            </select>
          </div>

          <div style={{ padding: '8px 22px 22px' }}>
            <button
              className="btn"
              onClick={randomPalette}
              style={{ width: '100%', justifyContent: 'center', fontWeight: 600, padding: '12px 20px' }}
            >
              Regenerate System
            </button>
          </div>
        </div>

        {/* CSS Variables Output */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>CSS Variables Output</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-s" onClick={() => sendToTints(colors[0])} style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }} title="Open Tint Generator with primary color">
                Send to Tints &rarr;
              </button>
              <button className="btn btn-s" onClick={() => onCopy(cssVars)} style={{ padding: '3px 8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div className="code" onClick={() => onCopy(cssVars)} style={{ fontSize: 12, lineHeight: 1.8 }}>{cssVars}</div>
        </div>
      </div>

      {/* System Tones */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>System Tones</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, position: 'relative' }}>
          {colors.map((color, i) => (
            <div
              key={i}
              onClick={() => onCopy(color)}
              style={{
                background: color,
                borderRadius: 4,
                padding: '18px 14px',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform .12s',
                color: textColorForBg(color),
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.7 }}>
                {ROLES[i]}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                  {color.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, opacity: 0.55, fontFamily: 'var(--mono)' }}>
                  {ROLE_DESC[i]}
                </div>
              </div>
            </div>
          ))}

          {/* FAB */}
          <button
            onClick={randomPalette}
            style={{
              position: 'absolute', bottom: -16, right: -16, width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 20, fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px var(--accent-glow)', transition: 'all var(--t)', zIndex: 2
            }}
          >+</button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 48 }} />

      {/* Starter Systems */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Starter Systems</h2>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', cursor: 'pointer', fontFamily: 'var(--mono)' }}>Browse Catalog &rarr;</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 24, lineHeight: 1.6 }}>
          Curated foundations for specialized industry vertical logic.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px,100%), 1fr))', gap: 14 }}>
          {STARTERS.map(p => (
            <div key={p.n} className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }} onClick={randomPalette}>
              {/* Abstract dark image area */}
              <div style={{
                height: 140, background: `linear-gradient(135deg, #0a0a0f 0%, ${p.c[0]}22 50%, #0a0a0f 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `radial-gradient(circle, ${p.c[0]}44 0%, transparent 70%)`,
                  filter: 'blur(8px)'
                }} />
              </div>
              <div style={{ padding: '12px 16px 16px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {p.c.map((c, ci) => (
                    <div key={ci} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.n}</div>
                <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
