import { useState, useCallback } from 'react'
import { generateTintScale, T_LABELS, hexToHsl, textColorForBg, contrastRatio } from '../utils/colors'

export default function TintGenerator({ onCopy }) {
  const [baseHex, setBaseHex] = useState('#6366f1')
  const [steps, setSteps] = useState(11)
  const [lMax, setLMax] = useState(98)
  const [anchor] = useState(5)
  const [mode, setMode] = useState('perceived')

  const cfg = { hex: baseHex, anchor, hueShift: 0, satMin: 0, satMax: 0, lMin: 5, lMax, mode }
  const scale = generateTintScale(cfg)

  const buildCSS = useCallback(() => {
    let css = ':root {\n'
    scale.forEach((c, i) => { css += `  --color-${T_LABELS[i]}: ${c};\n` })
    css += '}'
    return css
  }, [scale])

  const buildJSON = useCallback(() => {
    const obj = {}
    scale.forEach((c, i) => { obj[T_LABELS[i]] = c })
    return JSON.stringify(obj, null, 2)
  }, [scale])

  return (
    <div className="sec">
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
        Toolkit / Core Tools
      </div>
      <div className="sec-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Tint Generator</h1>
          <p>Create mathematically perfect monolithic scales for your design system. Expand a single base hex into a full spectrum of utility values.</p>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: baseHex }} />
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>Base Hex</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{baseHex}</div>
          </div>
        </div>
      </div>

      {/* Controls seg-bar */}
      <div className="seg-bar" style={{ marginBottom: 32 }}>
        <div className="seg-cell">
          <div className="seg-label">Base Color</div>
          <div className="row" style={{ gap: 6 }}>
            <input type="color" value={baseHex} onChange={e => setBaseHex(e.target.value)} style={{ width: 32, height: 28, padding: 2 }} />
            <input type="text" value={baseHex} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setBaseHex(e.target.value) }} />
          </div>
        </div>
        <div className="seg-cell">
          <div className="seg-label">Steps Count</div>
          <div className="row" style={{ gap: 8 }}>
            <input type="range" min="5" max="15" value={steps} onChange={e => setSteps(+e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{steps}</span>
          </div>
        </div>
        <div className="seg-cell">
          <div className="seg-label">Luminance Spread</div>
          <div className="row" style={{ gap: 8 }}>
            <input type="range" min="60" max="100" value={lMax} onChange={e => setLMax(+e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{lMax}%</span>
          </div>
        </div>
        <div className="seg-cell">
          <div className="seg-label">Format</div>
          <select value={mode} onChange={e => setMode(e.target.value)} style={{ width: '100%' }}>
            <option value="perceived">HEX Codes</option>
            <option value="linear">Linear</option>
          </select>
        </div>
      </div>

      {/* Tints & Shades */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tints & Shades</h2>
          <button className="btn btn-s" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => onCopy(buildCSS())}>Copy Scale</button>
        </div>
        <div className="tint-grid-responsive" style={{ display: 'grid', gridTemplateColumns: `repeat(${scale.length}, 1fr)`, gap: 8 }}>
          {scale.map((c, i) => {
            const hsl = hexToHsl(c)
            const isAnchor = i === anchor
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className="tint-swatch" style={{ background: c }} onClick={() => onCopy(c)}>
                  <span className="stop-label" style={{ color: textColorForBg(c) }}>{T_LABELS[i]}</span>
                </div>
                <div className="tint-info">
                  <div className="hex">{c}</div>
                  {isAnchor ? <div className="tint-base-tag">Selected Base</div> : <div className="lval">L: {hsl[2]}%</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Technical Spectrum Table */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Technical Spectrum</h3>
            <p style={{ fontSize: 12, color: 'var(--t2)' }}>Detailed HSL and RGB breakdowns for production usage.</p>
          </div>
          <button className="btn btn-s" onClick={() => onCopy(buildJSON())}>JSON Export</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Stop', 'Preview', 'Hex', 'HSL', 'Contrast', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scale.map((c, i) => {
                const hsl = hexToHsl(c)
                const cr = contrastRatio(c, '#ffffff')
                const isAnchor = i === anchor
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: isAnchor ? 'var(--accent-bg)' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontWeight: 600, color: isAnchor ? 'var(--accent)' : 'var(--t0)' }}>{T_LABELS[i]}</td>
                    <td style={{ padding: '10px 12px' }}><div style={{ width: 24, height: 24, borderRadius: 6, background: c }} /></td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)' }}>{c}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', color: isAnchor ? 'var(--accent)' : 'var(--t1)' }}>{hsl[0]}, {hsl[1]}%, {hsl[2]}%</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`tag ${cr >= 4.5 ? 'tag-pass' : 'tag-fail'}`}>{cr.toFixed(1)}{cr >= 4.5 ? ' AA' : ' FAIL'}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button className="btn btn-s" style={{ padding: '3px 8px' }} onClick={() => onCopy(c)}>Copy</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 40 }}>
        <button className="btn" onClick={() => onCopy(buildCSS())}>Copy CSS Variables</button>
        <button className="btn" onClick={() => onCopy(buildJSON())}>Copy JSON</button>
      </div>
    </div>
  )
}
