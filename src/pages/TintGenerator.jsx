import { useState, useCallback } from 'react'
import { generateTintScale, T_LABELS, hexToHsl, hslToHex, textColorForBg } from '../utils/colors'

const ANCHOR_LABELS = T_LABELS

export default function TintGenerator({ onCopy }) {
  const [tints, setTints] = useState([
    { hex: '#6366f1', anchor: 5, hueShift: 0, satMin: 0, satMax: 0, lMin: 5, lMax: 98, mode: 'perceived' }
  ])

  const updateTint = useCallback((idx, key, value) => {
    setTints(prev => prev.map((t, i) => i === idx ? { ...t, [key]: value } : t))
  }, [])

  const addTint = useCallback(() => {
    setTints(prev => [...prev, {
      hex: hslToHex(Math.floor(Math.random() * 360), 65, 50),
      anchor: 5, hueShift: 0, satMin: 0, satMax: 0, lMin: 5, lMax: 98, mode: 'perceived'
    }])
  }, [])

  const removeTint = useCallback((idx) => {
    setTints(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const buildTintData = useCallback(() => {
    const result = {}
    tints.forEach((cfg, idx) => {
      const scale = generateTintScale(cfg)
      const name = `colour-${idx + 1}`
      const obj = {}
      T_LABELS.forEach((l, i) => { obj[l] = scale[i] })
      result[name] = obj
    })
    return result
  }, [tints])

  const exportCSS = useCallback(() => {
    const data = buildTintData()
    let css = ':root {\n'
    Object.entries(data).forEach(([name, stops]) => {
      Object.entries(stops).forEach(([k, v]) => { css += `  --${name}-${k}: ${v};\n` })
    })
    css += '}'
    onCopy(css)
  }, [buildTintData, onCopy])

  const exportJSON = useCallback(() => {
    const data = buildTintData()
    onCopy(JSON.stringify(data, null, 2))
  }, [buildTintData, onCopy])

  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Tint Generator</h1>
        <p>Create mathematically perfect colour scales. Expand a single hex into a full spectrum of utility values.</p>
      </div>

      {tints.map((cfg, idx) => {
        const scale = generateTintScale(cfg)
        return (
          <div key={idx} className="tint-row" style={{ marginBottom: 32 }}>
            <div className="tint-top-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'center', marginBottom: 12 }}>
              <input type="color" value={cfg.hex} style={{ width: 32, height: 28 }} onChange={e => updateTint(idx, 'hex', e.target.value)} />
              <input type="text" value={cfg.hex} style={{ width: 80, fontFamily: 'var(--mono)', fontSize: 10 }} onChange={e => updateTint(idx, 'hex', e.target.value)} />
              <label style={{ fontSize: 9, color: 'var(--t2)' }}>Anchor</label>
              <select style={{ width: 70 }} value={cfg.anchor} onChange={e => updateTint(idx, 'anchor', +e.target.value)}>
                {ANCHOR_LABELS.map((l, i) => <option key={l} value={i}>{l}</option>)}
              </select>
              <label style={{ fontSize: 9, color: 'var(--t2)' }}>Mode</label>
              <select style={{ width: 90 }} value={cfg.mode} onChange={e => updateTint(idx, 'mode', e.target.value)}>
                <option value="perceived">Perceived</option>
                <option value="linear">Linear</option>
              </select>
              {idx > 0 && <button className="btn btn-s" onClick={() => removeTint(idx)}>Remove</button>}
            </div>

            <div className="tint-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 8, marginBottom: 16 }}>
              {scale.map((c, i) => {
                const hsl = hexToHsl(c)
                const isAnchor = i === cfg.anchor
                return (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div className="tint-swatch" style={{ background: c }} onClick={() => onCopy(c)}>
                      <span className="stop-label" style={{ color: textColorForBg(c) }}>{T_LABELS[i]}</span>
                    </div>
                    <div className="tint-info">
                      <div className="hex">{c}</div>
                      {isAnchor ? <div className="tint-base-tag">Base</div> : <div className="lval">L: {hsl[2]}%</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="tint-controls-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Lightness Max', key: 'lMax', min: 60, max: 100 },
                { label: 'Lightness Min', key: 'lMin', min: 0, max: 20 },
                { label: 'Hue Shift', key: 'hueShift', min: -30, max: 30, suffix: '°', showSign: true },
                { label: 'Sat Shift (light end)', key: 'satMax', min: -30, max: 30, showSign: true },
              ].map(ctrl => (
                <div key={ctrl.key}>
                  <label style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)', display: 'flex', justifyContent: 'space-between' }}>
                    {ctrl.label}
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--t1)' }}>
                      {ctrl.showSign && cfg[ctrl.key] > 0 ? '+' : ''}{cfg[ctrl.key]}{ctrl.suffix || ''}
                    </span>
                  </label>
                  <input type="range" min={ctrl.min} max={ctrl.max} value={cfg[ctrl.key]} onChange={e => updateTint(idx, ctrl.key, +e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div style={{ margin: '16px 0 40px' }}>
        <button className="btn" onClick={addTint}>+ Add Colour</button>
      </div>

      <div className="sub">
        <div className="sl">Export</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={exportCSS}>Copy CSS Variables</button>
          <button className="btn" onClick={exportJSON}>Copy Framer JSON</button>
        </div>
      </div>
    </div>
  )
}
