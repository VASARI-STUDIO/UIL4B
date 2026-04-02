import { useState, useMemo } from 'react'

const NAMES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']
const EXPS = [-2, -1, 0, 1, 2, 3, 4, 5, 6]
const RATIOS = [
  { label: 'Major 2nd', value: 1.125 },
  { label: 'Minor 3rd', value: 1.200 },
  { label: 'Major 3rd (1.250)', value: 1.250 },
  { label: 'Perfect 4th', value: 1.333 },
  { label: 'Perfect 5th', value: 1.500 },
  { label: 'Golden Ratio', value: 1.618 },
]

export default function TypeScale({ onCopy }) {
  const [base, setBase] = useState(16)
  const [ratio, setRatio] = useState(1.250)

  const scale = useMemo(() =>
    EXPS.map((e, i) => ({
      name: NAMES[i],
      size: (base * Math.pow(ratio, e)).toFixed(1),
      exp: e
    })).reverse()
  , [base, ratio])

  const cssVars = useMemo(() => {
    let css = ':root {\n'
    EXPS.forEach((e, i) => {
      const s = (base * Math.pow(ratio, e)).toFixed(1)
      css += `  --text-${NAMES[i]}: ${s}px;\n`
    })
    css += '}'
    return css
  }, [base, ratio])

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Type Scale</h1>
        <p>Modular type scale calculator.</p>
      </div>
      <div className="sub">
        <div className="row" style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--t2)' }}>Base</label>
          <input type="number" value={base} min="8" max="32" style={{ width: 60 }} onChange={e => setBase(+e.target.value)} />
          <label style={{ fontSize: 10, color: 'var(--t2)' }}>Ratio</label>
          <select value={ratio} onChange={e => setRatio(+e.target.value)}>
            {RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="card">
          {scale.map(s => (
            <div key={s.name} className="ts-row">
              <div className="ts-meta">{s.name}<br />{s.size}px</div>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: `${s.size}px`, fontWeight: s.exp >= 3 ? 600 : 400 }}>
                The quick brown fox
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="code" onClick={() => onCopy(cssVars)}>{cssVars}</div>
        </div>
      </div>
    </div>
  )
}
