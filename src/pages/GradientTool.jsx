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

export default function GradientTool({ onCopy }) {
  const [color1, setColor1] = useState('#6366f1')
  const [color2, setColor2] = useState('#ec4899')
  const [angle, setAngle] = useState(135)

  const css = `linear-gradient(${angle}deg, ${color1}, ${color2})`
  const cssOutput = `background: ${css};`

  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Gradient Tool</h1>
        <p>Create gradients with precision. Optimised for modern CSS.</p>
      </div>

      <div className="grad-big" style={{ background: css }}>
        <div className="grad-tags">
          <span className="grad-tag">linear-gradient</span>
          <span className="grad-tag">{angle}&deg;</span>
        </div>
      </div>

      <div className="split" style={{ marginBottom: 40 }}>
        <div>
          <div className="card">
            <div className="sl">Gradient Stops</div>
            <div className="row" style={{ gap: 14, marginTop: 10 }}>
              <div>
                <div className="seg-label">Start</div>
                <input type="color" value={color1} onChange={e => setColor1(e.target.value)} />
              </div>
              <div>
                <div className="seg-label">End</div>
                <input type="color" value={color2} onChange={e => setColor2(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="seg-label">Angle</div>
              <div className="row">
                <input type="range" min="0" max="360" value={angle} style={{ flex: 1 }} onChange={e => setAngle(+e.target.value)} />
                <input type="number" min="0" max="360" value={angle} style={{ width: 56, textAlign: 'center' }} onChange={e => setAngle(+e.target.value)} />
                <span style={{ fontSize: 10, color: 'var(--t2)' }}>&deg;</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="sl">Presets</div>
            <div className="grad-presets" style={{ marginTop: 6 }}>
              {PRESETS.map(g => (
                <div
                  key={g.n}
                  className="grad-p"
                  style={{ background: g.css }}
                  onClick={() => onCopy(`background: ${g.css};`)}
                  title={g.n}
                />
              ))}
            </div>
          </div>
          <div className="card">
            <div className="sl">Export CSS</div>
            <div className="code" style={{ marginTop: 6 }} onClick={() => onCopy(cssOutput)}>
              {cssOutput}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
