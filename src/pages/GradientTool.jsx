import { useState } from 'react'

const PRESETS = [
  { n: 'Indigo Rose', css: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { n: 'Peach', css: 'linear-gradient(to right,#ee9ca7,#ffdde1)' },
  { n: 'Aqua', css: 'linear-gradient(to right,#1a2980,#26d0ce)' },
  { n: 'Celestial', css: 'linear-gradient(to right,#c33764,#1d2671)' },
  { n: 'Relay', css: 'linear-gradient(to right,#3a1c71,#d76d77,#ffaf7b)' },
  { n: 'Sublime', css: 'linear-gradient(to right,#fc5c7d,#6a82fb)' },
  { n: 'Flare', css: 'linear-gradient(to right,#f12711,#f5af19)' },
  { n: 'Moonlit', css: 'linear-gradient(to right,#0f2027,#203a43,#2c5364)' },
  { n: 'Frost', css: 'linear-gradient(to right,#000428,#004e92)' },
  { n: 'Emerald', css: 'linear-gradient(to right,#348f50,#56b4d3)' },
  { n: 'Velvet', css: 'linear-gradient(to right,#da4453,#89216b)' },
]

const TYPES = ['Linear', 'Radial', 'Conic']

export default function GradientTool({ onCopy }) {
  const [color1, setColor1] = useState('#a855f7')
  const [color2, setColor2] = useState('#ec4899')
  const [angle, setAngle] = useState(135)
  const [type, setType] = useState('Linear')

  const gradFn = type === 'Radial' ? 'radial-gradient' : type === 'Conic' ? 'conic-gradient' : 'linear-gradient'
  const angleStr = type === 'Linear' ? `${angle}deg, ` : type === 'Conic' ? `from ${angle}deg, ` : ''
  const css = `${gradFn}(${angleStr}${color1}, ${color2})`
  const cssOutput = `background: ${css};`

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Gradient Tool</h1>
        <p>Create complex, multi-stop gradients with pixel precision. Optimized for modern CSS and high-performance rendering.</p>
      </div>

      <div className="grad-big" style={{ background: css }}>
        <div className="grad-tags">
          <span className="grad-tag">{gradFn.toUpperCase()}</span>
          <span className="grad-tag">{angle}&deg;</span>
        </div>
      </div>

      <div className="split" style={{ marginBottom: 40 }}>
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Gradient Stops</h3>
              <button className="btn btn-s" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>+ Add New Stop</button>
            </div>
            <div className="row" style={{ gap: 14, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Color Value</div>
                <div className="row" style={{ gap: 6 }}>
                  <input type="color" value={color1} onChange={e => setColor1(e.target.value)} />
                  <input type="text" value={color1} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setColor1(e.target.value) }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Position</div>
                <input type="text" value="0%" readOnly style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Opacity</div>
                <input type="text" value="100%" readOnly style={{ width: '100%' }} />
              </div>
            </div>
            <div className="row" style={{ gap: 14, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Color Value</div>
                <div className="row" style={{ gap: 6 }}>
                  <input type="color" value={color2} onChange={e => setColor2(e.target.value)} />
                  <input type="text" value={color2} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }} onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setColor2(e.target.value) }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Position</div>
                <input type="text" value="100%" readOnly style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="seg-label">Opacity</div>
                <input type="text" value="100%" readOnly style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Properties</h3>
            <div className="seg-label">Type</div>
            <div className="row" style={{ gap: 4, marginBottom: 16 }}>
              {TYPES.map(t => (
                <button key={t} className={`pt-t${type === t ? ' on' : ''}`} onClick={() => setType(t)} style={{ flex: 1, justifyContent: 'center' }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div className="seg-label" style={{ marginBottom: 0 }}>Angle</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)' }}>{angle}&deg;</span>
            </div>
            <input type="range" min="0" max="360" value={angle} onChange={e => setAngle(+e.target.value)} style={{ marginBottom: 16 }} />

            <div className="seg-label">Presets</div>
            <div className="grad-presets" style={{ marginTop: 4 }}>
              {PRESETS.slice(0, 4).map(g => (
                <div key={g.n} className="grad-p" style={{ background: g.css, height: 56, borderRadius: 4 }} onClick={() => onCopy(`background: ${g.css};`)} title={g.n} />
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Export CSS</h3>
              <button className="btn btn-s" onClick={() => onCopy(cssOutput)}>Copy</button>
            </div>
            <div className="code" onClick={() => onCopy(cssOutput)} style={{ fontSize: 12 }}>{cssOutput}</div>
            <div className="row" style={{ gap: 6, marginTop: 12 }}>
              <button className="btn btn-s" onClick={() => onCopy(cssOutput)}>Tailwind Class</button>
              <button className="btn btn-s" onClick={() => onCopy(JSON.stringify({ type: gradFn, angle, stops: [color1, color2] }, null, 2))}>JSON Data</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))', gap: 12 }}>
        {[
          { icon: '\u2728', title: 'Smart Suggestions', desc: 'AI-powered color transitions' },
          { icon: '\u2591', title: 'Noise Generator', desc: 'Add texture to your gradients' },
          { icon: '\u21BA', title: 'Version History', desc: 'Undo and browse previous edits' },
        ].map(f => (
          <div key={f.title} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
