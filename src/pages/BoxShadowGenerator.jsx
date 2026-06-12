import { useState, useCallback, useMemo } from 'react'

const PRESETS = [
  { name: 'Subtle', layers: [{ x: 0, y: 1, blur: 3, spread: 0, color: '#000000', opacity: 8, inset: false }] },
  { name: 'Medium', layers: [{ x: 0, y: 4, blur: 14, spread: -3, color: '#000000', opacity: 12, inset: false }] },
  { name: 'Elevated', layers: [
    { x: 0, y: 4, blur: 6, spread: -1, color: '#000000', opacity: 10, inset: false },
    { x: 0, y: 10, blur: 30, spread: -6, color: '#000000', opacity: 15, inset: false },
  ]},
  { name: 'Layered', layers: [
    { x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 5, inset: false },
    { x: 0, y: 2, blur: 4, spread: 0, color: '#000000', opacity: 6, inset: false },
    { x: 0, y: 4, blur: 8, spread: 0, color: '#000000', opacity: 7, inset: false },
    { x: 0, y: 8, blur: 16, spread: 0, color: '#000000', opacity: 8, inset: false },
  ]},
  { name: 'Sharp', layers: [{ x: 6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 20, inset: false }] },
  { name: 'Glow', layers: [{ x: 0, y: 0, blur: 24, spread: 4, color: '#635BFF', opacity: 40, inset: false }] },
  { name: 'Inner', layers: [{ x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 15, inset: true }] },
  { name: 'Neumorphic', layers: [
    { x: 6, y: 6, blur: 12, spread: 0, color: '#000000', opacity: 10, inset: false },
    { x: -6, y: -6, blur: 12, spread: 0, color: '#ffffff', opacity: 8, inset: false },
  ]},
]

function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
}

function layerToCSS(l) {
  return `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${hexToRgba(l.color, l.opacity)}`
}

const DEFAULT_LAYER = { x: 0, y: 4, blur: 12, spread: 0, color: '#000000', opacity: 12, inset: false }

export default function BoxShadowGenerator({ onCopy, toast }) {
  const [layers, setLayers] = useState([{ ...DEFAULT_LAYER }])
  const [activeLayer, setActiveLayer] = useState(0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [boxColor, setBoxColor] = useState('#ffffff')
  const [borderRadius, setBorderRadius] = useState(12)

  const cssValue = useMemo(() => layers.map(layerToCSS).join(',\n    '), [layers])
  const cssOneLine = useMemo(() => layers.map(layerToCSS).join(', '), [layers])

  const updateLayer = useCallback((idx, key, val) => {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l))
  }, [])

  const addLayer = useCallback(() => {
    setLayers(prev => [...prev, { ...DEFAULT_LAYER }])
    setActiveLayer(layers.length)
  }, [layers.length])

  const removeLayer = useCallback((idx) => {
    if (layers.length <= 1) return
    setLayers(prev => prev.filter((_, i) => i !== idx))
    setActiveLayer(a => Math.min(a, layers.length - 2))
  }, [layers.length])

  const duplicateLayer = useCallback((idx) => {
    setLayers(prev => [...prev.slice(0, idx + 1), { ...prev[idx] }, ...prev.slice(idx + 1)])
    setActiveLayer(idx + 1)
  }, [])

  const applyPreset = useCallback((preset) => {
    setLayers(preset.layers.map(l => ({ ...l })))
    setActiveLayer(0)
  }, [])

  const copyCSS = useCallback(() => {
    const css = `box-shadow: ${cssOneLine};`
    navigator.clipboard.writeText(css)
    if (onCopy) onCopy(css)
    if (toast) toast('CSS copied')
  }, [cssOneLine, onCopy, toast])

  const copyTailwind = useCallback(() => {
    const tw = `shadow-[${layers.map(l => `${l.inset ? 'inset_' : ''}${l.x}px_${l.y}px_${l.blur}px_${l.spread}px_${hexToRgba(l.color, l.opacity).replace(/ /g, '')}`).join(',')}]`
    navigator.clipboard.writeText(tw)
    if (onCopy) onCopy(tw)
    if (toast) toast('Tailwind class copied')
  }, [layers, onCopy, toast])

  const layer = layers[activeLayer] || layers[0]

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">CSS Tool</div>
        <h1>Box Shadow Generator</h1>
        <p>Design layered box shadows with live preview and copy CSS or Tailwind.</p>
      </div>

      {/* Presets */}
      <div className="pl-chips" style={{ marginBottom: 20 }}>
        {PRESETS.map(p => (
          <button key={p.name} className="pl-chip" onClick={() => applyPreset(p)}>{p.name}</button>
        ))}
      </div>

      <div className="bsg-layout">
        {/* Preview */}
        <div className="bsg-preview" style={{ background: bgColor }}>
          <div className="bsg-box" style={{ background: boxColor, borderRadius, boxShadow: cssOneLine }} />
        </div>

        {/* Controls */}
        <div className="bsg-controls">
          {/* Layer tabs */}
          <div className="bsg-layers">
            <div className="bsg-layer-tabs">
              {layers.map((_, i) => (
                <button key={i} className={`bsg-layer-tab${activeLayer === i ? ' active' : ''}`} onClick={() => setActiveLayer(i)}>
                  {i + 1}
                </button>
              ))}
              <button className="bsg-layer-tab bsg-layer-add" onClick={addLayer} title="Add layer">+</button>
            </div>
            <div className="bsg-layer-actions">
              <button className="btn-xs" onClick={() => duplicateLayer(activeLayer)} title="Duplicate layer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
              {layers.length > 1 && (
                <button className="btn-xs" onClick={() => removeLayer(activeLayer)} title="Remove layer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Sliders */}
          <div className="bsg-fields">
            <label className="bsg-field">
              <span>X Offset</span>
              <input type="range" min="-50" max="50" value={layer.x} onChange={e => updateLayer(activeLayer, 'x', +e.target.value)} />
              <input type="number" className="bsg-num" value={layer.x} onChange={e => updateLayer(activeLayer, 'x', +e.target.value)} />
            </label>
            <label className="bsg-field">
              <span>Y Offset</span>
              <input type="range" min="-50" max="50" value={layer.y} onChange={e => updateLayer(activeLayer, 'y', +e.target.value)} />
              <input type="number" className="bsg-num" value={layer.y} onChange={e => updateLayer(activeLayer, 'y', +e.target.value)} />
            </label>
            <label className="bsg-field">
              <span>Blur</span>
              <input type="range" min="0" max="100" value={layer.blur} onChange={e => updateLayer(activeLayer, 'blur', +e.target.value)} />
              <input type="number" className="bsg-num" value={layer.blur} onChange={e => updateLayer(activeLayer, 'blur', +e.target.value)} />
            </label>
            <label className="bsg-field">
              <span>Spread</span>
              <input type="range" min="-50" max="50" value={layer.spread} onChange={e => updateLayer(activeLayer, 'spread', +e.target.value)} />
              <input type="number" className="bsg-num" value={layer.spread} onChange={e => updateLayer(activeLayer, 'spread', +e.target.value)} />
            </label>
            <label className="bsg-field">
              <span>Opacity</span>
              <input type="range" min="0" max="100" value={layer.opacity} onChange={e => updateLayer(activeLayer, 'opacity', +e.target.value)} />
              <input type="number" className="bsg-num" value={layer.opacity} onChange={e => updateLayer(activeLayer, 'opacity', +e.target.value)} />
            </label>
            <div className="bsg-row">
              <label className="bsg-field bsg-field-color">
                <span>Shadow</span>
                <input type="color" value={layer.color} onChange={e => updateLayer(activeLayer, 'color', e.target.value)} />
              </label>
              <label className="bsg-field bsg-field-check">
                <input type="checkbox" checked={layer.inset} onChange={e => updateLayer(activeLayer, 'inset', e.target.checked)} />
                <span>Inset</span>
              </label>
            </div>
          </div>

          {/* Box settings */}
          <div className="bsg-box-settings">
            <label className="bsg-field bsg-field-color">
              <span>Background</span>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
            </label>
            <label className="bsg-field bsg-field-color">
              <span>Box</span>
              <input type="color" value={boxColor} onChange={e => setBoxColor(e.target.value)} />
            </label>
            <label className="bsg-field">
              <span>Radius</span>
              <input type="range" min="0" max="100" value={borderRadius} onChange={e => setBorderRadius(+e.target.value)} />
              <input type="number" className="bsg-num" value={borderRadius} onChange={e => setBorderRadius(+e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      {/* Code output */}
      <div className="bsg-code-wrap">
        <pre className="bsg-code"><code>box-shadow: {cssValue};</code></pre>
        <div className="bsg-code-actions">
          <button className="btn btn-s" onClick={copyCSS}>Copy CSS</button>
          <button className="btn btn-s btn-ghost" onClick={copyTailwind}>Copy Tailwind</button>
        </div>
      </div>
    </div>
  )
}
