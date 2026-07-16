import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { hexToRgb } from '../utils/colors'

// ── Gradient Cockpit ──
// The standalone /color/gradient tool: a dense, dark control surface where every
// stop, dial and output lives on one screen. It still reads + writes the shared
// design.gradient (ProjectContext) so a gradient authored here survives a jump to
// any other colour tool, but presents its own purpose-built cockpit chrome rather
// than the light merged-studio section.

const GRAD_TYPES = ['Linear', 'Radial', 'Conic']
const GRAD_FN = { Linear: 'linear-gradient', Radial: 'radial-gradient', Conic: 'conic-gradient' }

// Cockpit presets (the mockup's 4×2 grid). Explicit hex so the preview is vivid
// regardless of the user's current palette.
const PRESETS = [
  { n: 'Nebula', type: 'Conic', angle: 90, stops: [{ color: '#7C3AED', position: 0 }, { color: '#DB2777', position: 50 }, { color: '#F59E0B', position: 100 }] },
  { n: 'Aqua', type: 'Linear', angle: 120, stops: [{ color: '#0EA5E9', position: 0 }, { color: '#22D3EE', position: 100 }] },
  { n: 'Ember', type: 'Linear', angle: 45, stops: [{ color: '#DC2626', position: 0 }, { color: '#F59E0B', position: 100 }] },
  { n: 'Meadow', type: 'Linear', angle: 135, stops: [{ color: '#16A34A', position: 0 }, { color: '#84CC16', position: 100 }] },
  { n: 'Dusk', type: 'Linear', angle: 160, stops: [{ color: '#6366F1', position: 0 }, { color: '#A855F7', position: 100 }] },
  { n: 'Graphite', type: 'Linear', angle: 135, stops: [{ color: '#1F2937', position: 0 }, { color: '#4B5563', position: 100 }] },
  { n: 'Peach', type: 'Linear', angle: 90, stops: [{ color: '#FB7185', position: 0 }, { color: '#FDBA74', position: 100 }] },
  { n: 'Mono', type: 'Linear', angle: 180, stops: [{ color: '#0F172A', position: 0 }, { color: '#64748B', position: 100 }] },
]

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Compose the production CSS value for a gradient. Stops are sorted so a
// dragged-past handle still reads left→right.
function gradientCss(type, angle, stops) {
  const fn = GRAD_FN[type] || 'linear-gradient'
  const prefix = type === 'Linear' ? `${angle}deg, ` : type === 'Conic' ? `from ${angle}deg at 50% 50%, ` : ''
  const parts = [...stops]
    .sort((a, b) => a.position - b.position)
    .map(s => `${s.color.toUpperCase()} ${Math.round(s.position)}%`)
    .join(', ')
  return `${fn}(${prefix}${parts})`
}

// Midpoint colour between two hex values — used when inserting a stop.
function midHex(a, b) {
  const c1 = hexToRgb(a), c2 = hexToRgb(b)
  return '#' + [0, 1, 2].map(i => Math.round((c1[i] + c2[i]) / 2).toString(16).padStart(2, '0')).join('')
}

const DEFAULT_STOPS = () => PRESETS[0].stops.map(s => ({ ...s }))

export default function GradientGenerator({ onCopy, toast }) {
  const { design, setGradient } = useProject()
  const [searchParams, setSearchParams] = useSearchParams()

  // Seed from the saved gradient. Null stop colours (the untouched default,
  // "use my palette") resolve to the live palette; a fully-default gradient seeds
  // the Nebula preset so a first-time visitor lands on the vivid mockup look.
  const [type, setType] = useState(() => design?.gradient?.type || 'Conic')
  const [angle, setAngle] = useState(() => design?.gradient?.angle ?? 90)
  const [stops, setStops] = useState(() => {
    const saved = design?.gradient?.stops
    if (Array.isArray(saved) && saved.some(s => s.color)) {
      return saved.map((s, i) => ({ color: s.color || design?.palette?.colors?.[i] || '#2563EB', position: s.position }))
    }
    return DEFAULT_STOPS()
  })
  const [activeStop, setActiveStop] = useState(0)
  const [copied, setCopied] = useState(false)

  const barRef = useRef(null)
  const dialRef = useRef(null)

  const css = gradientCss(type, angle, stops)
  const cssValue = `background: ${css};`

  // Persist to the shared design so the gradient follows the user across tools.
  useEffect(() => {
    setGradient({ stops: stops.map(s => ({ color: s.color, position: s.position })), angle, type })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, angle, type])

  // ── Discover hand-off (?preset=<slug>&tab=gradient) ──
  useEffect(() => {
    const presetSlug = searchParams.get('preset')
    if (!presetSlug && searchParams.get('tab') !== 'gradient') return
    const preset = presetSlug ? PRESETS.find(p => slugify(p.n) === presetSlug) : null
    if (preset) applyPreset(preset)
    toast?.(preset ? `Loaded ${preset.n}` : 'Opened in Gradient Generator')
    const next = new URLSearchParams(searchParams)
    next.delete('preset'); next.delete('tab')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPreset = useCallback((p) => {
    setStops(p.stops.map(s => ({ ...s })))
    setType(p.type)
    setAngle(p.angle)
    setActiveStop(0)
  }, [])

  const updateStop = useCallback((idx, patch) => {
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }, [])

  const addStop = useCallback(() => {
    setStops(prev => {
      const sorted = [...prev].sort((a, b) => a.position - b.position)
      const last = sorted[sorted.length - 1], prevLast = sorted[sorted.length - 2] || sorted[0]
      const position = Math.round((prevLast.position + last.position) / 2)
      return [...prev, { color: midHex(prevLast.color, last.color), position }]
    })
  }, [])

  const removeStop = useCallback((idx) => {
    setStops(prev => prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev)
    setActiveStop(0)
  }, [])

  const flip = useCallback(() => {
    setStops(prev => prev.map(s => ({ ...s, position: 100 - s.position })))
  }, [])

  const randomHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  const randomise = useCallback(() => {
    const n = 2 + Math.floor(Math.random() * 2) // 2–3 stops
    const next = Array.from({ length: n }, (_, i) => ({
      color: randomHex(),
      position: Math.round((i / (n - 1)) * 100),
    }))
    setStops(next)
    setType(GRAD_TYPES[Math.floor(Math.random() * GRAD_TYPES.length)])
    setAngle(Math.round(Math.random() * 360))
    setActiveStop(0)
  }, [])

  const reset = useCallback(() => applyPreset(PRESETS[0]), [applyPreset])

  const copyCss = useCallback(() => {
    onCopy?.(cssValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }, [cssValue, onCopy])

  // ── Drag: stop handles on the preview bar ──
  const dragStop = useCallback((e, idx) => {
    e.preventDefault()
    setActiveStop(idx)
    const move = (ev) => {
      const rect = barRef.current?.getBoundingClientRect()
      if (!rect) return
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100))
      updateStop(idx, { position: Math.round(pct) })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [updateStop])

  // ── Drag: the angle dial ──
  const angleActive = type !== 'Radial'
  const dragDial = useCallback((e) => {
    if (!angleActive) return
    const compute = (ev) => {
      const rect = dialRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
      let deg = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90
      setAngle((Math.round(deg) + 360) % 360)
    }
    compute(e)
    const move = (ev) => compute(ev)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [angleActive])

  const sortedForBar = [...stops.map((s, i) => ({ ...s, i }))].sort((a, b) => a.position - b.position)

  return (
    <div className="gcx">
      {/* Header */}
      <header className="gcx-head">
        <div className="gcx-head-id">
          <span className="gcx-eyebrow">Colour · Cockpit</span>
          <div className="gcx-title-row">
            <h1 className="gcx-title">Gradient Cockpit</h1>
            <span className="gcx-badge">{stops.length}<span className="gcx-badge-b">B</span></span>
          </div>
          <p className="gcx-sub">A dense control surface. Every stop, dial and output on one screen — for when you want to move fast.</p>
        </div>
        <div className="gcx-head-actions">
          <button type="button" className="gcx-btn gcx-btn-accent" onClick={randomise}>
            <span className="gcx-diamond" aria-hidden="true">◆</span> Random
          </button>
          <button type="button" className="gcx-btn gcx-btn-ghost" onClick={reset}>Reset</button>
        </div>
      </header>

      <div className="gcx-grid">
        {/* Preview */}
        <div className="gcx-preview-wrap">
          <div className="gcx-preview" style={{ background: css }}>
            <div className="gcx-preview-pills">
              <span className="gcx-pill">{type}</span>
              {angleActive && <span className="gcx-pill">{Math.round(angle)}°</span>}
            </div>
            <div className="gcx-bar" ref={barRef} aria-hidden="true">
              <div className="gcx-bar-track" style={{ background: `linear-gradient(90deg, ${[...stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${Math.round(s.position)}%`).join(', ')})` }} />
              {sortedForBar.map(s => (
                <button
                  key={s.i}
                  type="button"
                  className={`gcx-handle${activeStop === s.i ? ' is-active' : ''}`}
                  style={{ left: `${s.position}%`, '--h-color': s.color }}
                  onPointerDown={(e) => dragStop(e, s.i)}
                  aria-label={`Gradient stop ${s.i + 1} at ${Math.round(s.position)}%`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Control panel */}
        <div className="gcx-panel">
          <div className="gcx-field">
            <span className="gcx-label">Type</span>
            <div className="gcx-seg">
              {GRAD_TYPES.map(t => (
                <button key={t} type="button" className={`gcx-seg-btn${type === t ? ' is-on' : ''}`} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="gcx-field">
            <span className="gcx-label">Angle</span>
            <div className={`gcx-angle${angleActive ? '' : ' is-disabled'}`}>
              <div className="gcx-dial" ref={dialRef} onPointerDown={dragDial} role="slider" aria-label="Gradient angle" aria-valuenow={Math.round(angle)} aria-valuemin={0} aria-valuemax={360} tabIndex={angleActive ? 0 : -1}
                onKeyDown={(e) => {
                  if (!angleActive) return
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setAngle(a => (a + 1) % 360) }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setAngle(a => (a + 359) % 360) }
                }}>
                <div className="gcx-dial-hand" style={{ transform: `rotate(${angle}deg)` }} />
                <div className="gcx-dial-center" />
              </div>
              <div className="gcx-angle-ctrl">
                <input
                  type="range" min="0" max="360" value={Math.round(angle)}
                  onChange={(e) => setAngle(+e.target.value)}
                  disabled={!angleActive}
                  className="gcx-range"
                  aria-label="Gradient angle slider"
                />
                <div className="gcx-angle-val">{Math.round(angle)}°</div>
              </div>
            </div>
          </div>

          <div className="gcx-field">
            <div className="gcx-label-row">
              <span className="gcx-label">CSS</span>
              <button type="button" className="gcx-copy" onClick={copyCss}>{copied ? '✓ Copied' : 'Copy CSS'}</button>
            </div>
            <button type="button" className="gcx-css" onClick={copyCss} title="Click to copy">
              <code>{cssValue}</code>
            </button>
          </div>
        </div>
      </div>

      {/* Stops */}
      <section className="gcx-block">
        <div className="gcx-block-head">
          <span className="gcx-label">Stops</span>
          <div className="gcx-block-actions">
            <button type="button" className="gcx-btn gcx-btn-ghost gcx-btn-sm" onClick={addStop}>+ Stop</button>
            <button type="button" className="gcx-btn gcx-btn-ghost gcx-btn-sm" onClick={flip}>⇄ Flip</button>
          </div>
        </div>
        <div className="gcx-stops">
          {stops.map((s, i) => (
            <div key={i} className={`gcx-stop${activeStop === i ? ' is-active' : ''}`} onClick={() => setActiveStop(i)}>
              <label className="gcx-stop-swatch" style={{ background: s.color }}>
                <input type="color" value={s.color} onChange={(e) => updateStop(i, { color: e.target.value })} aria-label={`Stop ${i + 1} colour`} />
              </label>
              <input
                type="text" className="gcx-stop-hex" value={s.color.toUpperCase()}
                onChange={(e) => { const v = e.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) updateStop(i, { color: v }) }}
                aria-label={`Stop ${i + 1} hex`}
              />
              <div className="gcx-stop-pos">
                <input
                  type="number" min="0" max="100" value={Math.round(s.position)}
                  onChange={(e) => updateStop(i, { position: Math.max(0, Math.min(100, +e.target.value)) })}
                  aria-label={`Stop ${i + 1} position`}
                />
                <span>%</span>
              </div>
              <button type="button" className="gcx-stop-x" onClick={(e) => { e.stopPropagation(); removeStop(i) }} disabled={stops.length <= 2} aria-label={`Remove stop ${i + 1}`}>×</button>
            </div>
          ))}
        </div>
      </section>

      {/* Presets */}
      <section className="gcx-block">
        <div className="gcx-block-head">
          <span className="gcx-label">Presets</span>
        </div>
        <div className="gcx-presets">
          {PRESETS.map(p => (
            <button key={p.n} type="button" className="gcx-preset" onClick={() => applyPreset(p)}>
              <span className="gcx-preset-swatch" style={{ background: gradientCss(p.type, p.angle, p.stops) }} />
              <span className="gcx-preset-name">{p.n}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
