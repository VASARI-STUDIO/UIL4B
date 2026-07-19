import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import ColorPickerPop from '../components/ColorPickerPop'
import ShuffleIcon from '../components/ShuffleIcon'
import { hexToRgb } from '../utils/colors'
import { gradientCss, decodeGradientParams } from '../data/gradientGallery'

// ── Gradient Generator ──
// The standalone /color/gradient tool: build any linear / radial / conic
// gradient with draggable stops, a live angle dial and copy-ready CSS — all on
// one screen and styled with the app design tokens so it follows the active
// theme. It reads + writes the shared design.gradient (ProjectContext) so a
// gradient authored here survives a jump to any other colour tool.
// (Class prefix `ggn-` = gradient generator.)

const GRAD_TYPES = ['Linear', 'Radial', 'Conic']

// Starter presets (the 4×2 grid). Explicit hex so the preview is vivid
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

// Interpolated colour between two hex values at a 0–1 ratio — used when
// inserting a stop so the new swatch blends its neighbours.
function mixHex(a, b, t = 0.5) {
  const c1 = hexToRgb(a), c2 = hexToRgb(b)
  return '#' + [0, 1, 2].map(i => Math.round(c1[i] + (c2[i] - c1[i]) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
}

const DEFAULT_STOPS = () => PRESETS[0].stops.map(s => ({ ...s }))

// Hex text field with a local draft, so partially-typed values aren't wiped by
// the controlled stop colour on every keystroke. Commits when the text is a
// valid #rrggbb; reverts to the stop's colour on blur if left invalid.
function StopHexInput({ color, label, onCommit }) {
  const [draft, setDraft] = useState(color.toUpperCase())
  useEffect(() => { setDraft(color.toUpperCase()) }, [color])
  return (
    <input
      type="text" className="ggn-stop-hex" value={draft}
      onChange={(e) => {
        const v = e.target.value
        setDraft(v)
        if (/^#[0-9a-f]{6}$/i.test(v)) onCommit(v.toUpperCase())
      }}
      onBlur={() => setDraft(color.toUpperCase())}
      aria-label={label}
    />
  )
}

export default function GradientGenerator({ onCopy, toast }) {
  const { design, setGradient, projects } = useProject()
  const [searchParams, setSearchParams] = useSearchParams()

  // Seed from the saved gradient. Null stop colours (the untouched default,
  // "use my palette") resolve to the live palette; a fully-default gradient seeds
  // the Nebula preset so a first-time visitor lands on a vivid look.
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

  // ── Hand-offs: gallery (?gs=…&gt=…&ga=…) and Discover (?preset=&tab=) ──
  useEffect(() => {
    const incoming = decodeGradientParams(searchParams)
    const presetSlug = searchParams.get('preset')
    if (!incoming && !presetSlug && searchParams.get('tab') !== 'gradient') return
    if (incoming) {
      setStops(incoming.stops.map(s => ({ ...s })))
      setType(incoming.type)
      setAngle(incoming.angle)
      setActiveStop(0)
      toast?.(`Loaded ${incoming.name || 'gradient'}`)
    } else {
      const preset = presetSlug ? PRESETS.find(p => slugify(p.n) === presetSlug) : null
      if (preset) applyPreset(preset)
      toast?.(preset ? `Loaded ${preset.n}` : 'Opened in Gradient Generator')
    }
    const next = new URLSearchParams(searchParams)
    ;['preset', 'tab', 'gs', 'gt', 'ga', 'gn'].forEach(k => next.delete(k))
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

  // Insert a stop at a given position (0–100), blending the colour from the two
  // stops it lands between. Used by both the "+ Stop" button (midpoint) and a
  // double-click on the preview bar (exact position). Focuses the new stop.
  const addStopAt = useCallback((pct) => {
    setStops(prev => {
      const sorted = [...prev].sort((a, b) => a.position - b.position)
      let lo = sorted[0], hi = sorted[sorted.length - 1]
      for (let i = 0; i < sorted.length - 1; i++) {
        if (pct >= sorted[i].position && pct <= sorted[i + 1].position) { lo = sorted[i]; hi = sorted[i + 1]; break }
      }
      const span = hi.position - lo.position
      const t = span > 0 ? (pct - lo.position) / span : 0.5
      const next = [...prev, { color: mixHex(lo.color, hi.color, t), position: Math.round(pct) }]
      return next
    })
    setActiveStop(stops.length) // the appended stop
  }, [stops.length])

  const addStop = useCallback(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position)
    // Drop the new stop into the widest gap so it doesn't stack on a neighbour.
    let gapMid = 50, widest = -1
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].position - sorted[i].position
      if (gap > widest) { widest = gap; gapMid = (sorted[i].position + sorted[i + 1].position) / 2 }
    }
    addStopAt(gapMid)
  }, [stops, addStopAt])

  const removeStop = useCallback((idx) => {
    setStops(prev => prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev)
    setActiveStop(0)
  }, [])

  const flip = useCallback(() => {
    setStops(prev => prev.map(s => ({ ...s, position: 100 - s.position })))
  }, [])

  const randomHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()
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

  // ── Import colours: the live Palette Builder palette + saved projects ──
  // A source needs 2+ real hex colours to make a gradient; capped at 5 stops so
  // an imported ramp stays readable.
  const importSources = useMemo(() => {
    const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '')
    const list = []
    const current = (design?.palette?.colors || []).filter(isHex)
    if (current.length >= 2) {
      list.push({ key: 'palette', name: 'Current palette', meta: 'Palette Builder', colors: current.slice(0, 5) })
    }
    for (const p of projects || []) {
      const colors = (p?.design?.palette?.colors || []).filter(isHex)
      if (colors.length >= 2) {
        list.push({ key: `proj-${p.id}`, name: p.name || 'Untitled project', meta: 'Saved project', colors: colors.slice(0, 5) })
      }
    }
    return list
  }, [design?.palette?.colors, projects])

  const importColors = useCallback((src) => {
    setStops(src.colors.map((color, i) => ({
      color: color.toUpperCase(),
      position: Math.round((i / (src.colors.length - 1)) * 100),
    })))
    setActiveStop(0)
    toast?.(`Imported ${src.name}`)
  }, [toast])

  const copyCss = useCallback(() => {
    onCopy?.(cssValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }, [cssValue, onCopy])

  // ── Drag: stop handles on the preview bar ──
  const dragStop = useCallback((e, idx) => {
    e.preventDefault()
    e.stopPropagation()
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

  // Double-click an empty part of the bar to drop a stop right there.
  const barDoubleClick = useCallback((e) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    addStopAt(pct)
  }, [addStopAt])

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
    <div className="ggn">
      {/* Header */}
      <header className="ggn-head">
        <div className="ggn-head-id">
          <span className="ggn-eyebrow">Colour · Gradient</span>
          <div className="ggn-title-row">
            <h1 className="ggn-title">Gradient Generator</h1>
            <span className="ggn-badge">{stops.length} {stops.length === 1 ? 'stop' : 'stops'}</span>
          </div>
          <p className="ggn-sub">Build any gradient — drag the stops, dial the angle and copy production-ready CSS. It follows you across every colour tool.</p>
        </div>
        <div className="ggn-head-actions">
          <button type="button" className="ggn-btn ggn-btn-accent" onClick={randomise}>
            <ShuffleIcon size={15} /> Random
          </button>
          <button type="button" className="ggn-btn ggn-btn-ghost" onClick={reset}>Reset</button>
        </div>
      </header>

      <div className="ggn-grid">
        {/* Preview */}
        <div className="ggn-preview-wrap">
          <div className="ggn-preview" style={{ background: css }}>
            <div className="ggn-preview-pills">
              <span className="ggn-pill">{type}</span>
              {angleActive && <span className="ggn-pill">{Math.round(angle)}°</span>}
            </div>
            <div
              className="ggn-bar"
              ref={barRef}
              onDoubleClick={barDoubleClick}
              title="Double-click to add a stop"
            >
              <div className="ggn-bar-track" style={{ background: `linear-gradient(90deg, ${[...stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${Math.round(s.position)}%`).join(', ')})` }} />
              {sortedForBar.map(s => (
                <button
                  key={s.i}
                  type="button"
                  className={`ggn-handle${activeStop === s.i ? ' is-active' : ''}`}
                  style={{ left: `${s.position}%`, '--h-color': s.color }}
                  onPointerDown={(e) => dragStop(e, s.i)}
                  aria-label={`Gradient stop ${s.i + 1} at ${Math.round(s.position)}%`}
                />
              ))}
            </div>
          </div>
          <p className="ggn-preview-hint">Drag a handle to move a stop · double-click the bar to add one</p>
        </div>

        {/* Control panel */}
        <div className="ggn-panel">
          <div className="ggn-field">
            <span className="ggn-label">Type</span>
            <div className="ggn-seg">
              {GRAD_TYPES.map(t => (
                <button key={t} type="button" className={`ggn-seg-btn${type === t ? ' is-on' : ''}`} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="ggn-field">
            <span className="ggn-label">Angle</span>
            <div className={`ggn-angle${angleActive ? '' : ' is-disabled'}`}>
              <div className="ggn-dial" ref={dialRef} onPointerDown={dragDial} role="slider" aria-label="Gradient angle" aria-valuenow={Math.round(angle)} aria-valuemin={0} aria-valuemax={360} tabIndex={angleActive ? 0 : -1}
                onKeyDown={(e) => {
                  if (!angleActive) return
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setAngle(a => (a + 1) % 360) }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setAngle(a => (a + 359) % 360) }
                }}>
                <div className="ggn-dial-hand" style={{ transform: `rotate(${angle}deg)` }} />
                <div className="ggn-dial-center" />
              </div>
              <div className="ggn-angle-ctrl">
                <input
                  type="range" min="0" max="360" value={Math.round(angle)}
                  onChange={(e) => setAngle(+e.target.value)}
                  disabled={!angleActive}
                  className="ggn-range"
                  aria-label="Gradient angle slider"
                />
                <div className="ggn-angle-val">{angleActive ? `${Math.round(angle)}°` : 'n/a for radial'}</div>
              </div>
            </div>
          </div>

          <div className="ggn-field">
            <div className="ggn-label-row">
              <span className="ggn-label">CSS</span>
              <button type="button" className="ggn-copy" onClick={copyCss}>{copied ? '✓ Copied' : 'Copy CSS'}</button>
            </div>
            <button type="button" className="ggn-css" onClick={copyCss} title="Click to copy">
              <code>{cssValue}</code>
            </button>
          </div>
        </div>
      </div>

      {/* Stops */}
      <section className="ggn-block">
        <div className="ggn-block-head">
          <span className="ggn-label">Stops</span>
          <div className="ggn-block-actions">
            <button type="button" className="ggn-btn ggn-btn-ghost ggn-btn-sm" onClick={addStop}>+ Stop</button>
            <button type="button" className="ggn-btn ggn-btn-ghost ggn-btn-sm" onClick={flip}>⇄ Flip</button>
          </div>
        </div>
        <div className="ggn-stops">
          {stops.map((s, i) => (
            <div key={i} className={`ggn-stop${activeStop === i ? ' is-active' : ''}`} onClick={() => setActiveStop(i)}>
              <div className="ggn-stop-swatch">
                <ColorPickerPop
                  value={s.color}
                  onChange={(hex) => updateStop(i, { color: hex.toUpperCase() })}
                  ariaLabel={`Stop ${i + 1} colour`}
                />
              </div>
              <StopHexInput
                color={s.color}
                label={`Stop ${i + 1} hex`}
                onCommit={(v) => updateStop(i, { color: v })}
              />
              <div className="ggn-stop-pos">
                <input
                  type="number" min="0" max="100" value={Math.round(s.position)}
                  onChange={(e) => updateStop(i, { position: Math.max(0, Math.min(100, +e.target.value)) })}
                  aria-label={`Stop ${i + 1} position`}
                />
                <span>%</span>
              </div>
              <button type="button" className="ggn-stop-x" onClick={(e) => { e.stopPropagation(); removeStop(i) }} disabled={stops.length <= 2} aria-label={`Remove stop ${i + 1}`}>×</button>
            </div>
          ))}
        </div>
      </section>

      {/* Import colours — from the Palette Builder or a saved project */}
      <section className="ggn-block">
        <div className="ggn-block-head">
          <span className="ggn-label">Import colours</span>
        </div>
        {importSources.length > 0 ? (
          <div className="ggn-imports">
            {importSources.map(src => (
              <button key={src.key} type="button" className="ggn-import" onClick={() => importColors(src)}>
                <span className="ggn-import-stripes" aria-hidden="true">
                  {src.colors.map((c, i) => <span key={i} style={{ background: c }} />)}
                </span>
                <span className="ggn-import-id">
                  <span className="ggn-import-name">{src.name}</span>
                  <span className="ggn-import-meta">{src.meta} · {src.colors.length} colours</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="ggn-import-empty">
            Nothing to import yet — build a palette in the <Link to="/color/palette">Palette Builder</Link> and its colours will appear here as gradient stops.
          </p>
        )}
      </section>

      {/* Presets */}
      <section className="ggn-block">
        <div className="ggn-block-head">
          <span className="ggn-label">Presets</span>
          <Link className="ggn-gal-link" to="/discover/gradients">
            Browse the gradient gallery <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="ggn-presets">
          {PRESETS.map(p => (
            <button key={p.n} type="button" className="ggn-preset" onClick={() => applyPreset(p)}>
              <span className="ggn-preset-swatch" style={{ background: gradientCss(p.type, p.angle, p.stops) }} />
              <span className="ggn-preset-name">{p.n}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
