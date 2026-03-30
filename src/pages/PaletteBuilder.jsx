import { useState, useCallback } from 'react'
import { generateHarmony, textColorForBg, hexToHsl, hslToHex } from '../utils/colors'

const HARMS = ['complement', 'analogous', 'triadic', 'split', 'tetradic']
const HARM_LABELS = { complement: 'Complementary', analogous: 'Analogous', triadic: 'Triadic', split: 'Split Complementary', tetradic: 'Tetradic' }
const ROLES = ['PRIMARY', 'CONTAINER', 'ACCENT', 'SUBTLE', 'DEEP']

const STARTERS = [
  { n: 'Midnight', c: ['#0f0f23', '#1a1a3e', '#4a4a8a', '#8888cc', '#ccccff'] },
  { n: 'Forest', c: ['#1a2e1a', '#2d5a2d', '#4a8c4a', '#7bc47b', '#c8f0c8'] },
  { n: 'Ember', c: ['#2d1b0e', '#8b4513', '#d2691e', '#f4a460', '#ffe4c4'] },
  { n: 'Ocean', c: ['#0a1628', '#1e3a5f', '#3a7bd5', '#63b3ed', '#bee3f8'] },
  { n: 'Plum', c: ['#1a0a1a', '#4a154b', '#7c3085', '#b660cd', '#e8b4f8'] },
  { n: 'Slate', c: ['#0f1419', '#1e2630', '#384250', '#6b7b8d', '#b0bec5'] },
]

export default function PaletteBuilder({ onCopy }) {
  const [baseColor, setBaseColor] = useState('#6366f1')
  const [harmony, setHarmony] = useState('complement')

  const colors = generateHarmony(baseColor, harmony)

  const randomPalette = useCallback(() => {
    const hex = hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 40 + Math.floor(Math.random() * 20))
    setBaseColor(hex)
  }, [])

  const cssVars = `:root {\n${colors.map((x, i) => `  --p-${(ROLES[i] || 'swatch').toLowerCase()}: ${x};`).join('\n')}\n}`

  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Palette Builder</h1>
        <p>Generate harmonious colour systems using advanced colour theory models.</p>
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
                <button
                  key={h}
                  className={`harm-opt${harmony === h ? ' on' : ''}`}
                  onClick={() => setHarmony(h)}
                >
                  {HARM_LABELS[h]}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="sl">CSS Variables</div>
            <div className="code" style={{ marginTop: 6 }} onClick={() => onCopy(cssVars)}>
              {cssVars}
            </div>
          </div>
        </div>

        <div>
          <div className="pal-grid">
            {colors.map((color, i) => (
              <div
                key={i}
                className="pal-swatch"
                style={{ background: color, color: textColorForBg(color) }}
                onClick={() => onCopy(color)}
              >
                <div className="role">{ROLES[i] || `SWATCH ${i + 1}`}</div>
                <div className="hex">{color}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>Curation</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Starter Systems</h2>
        <div className="pal-grid">
          {STARTERS.map(p => (
            <div key={p.n} className="card" style={{ cursor: 'pointer', padding: 10 }} onClick={() => setBaseColor(p.c[2])}>
              <div style={{ display: 'flex', overflow: 'hidden', marginBottom: 6 }}>
                {p.c.map(c => <div key={c} style={{ flex: 1, height: 28, background: c }} />)}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{p.n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
