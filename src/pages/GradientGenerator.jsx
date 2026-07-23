import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
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

// Starter presets (the 4×4 grid). Explicit hex so the preview is vivid
// regardless of the user's current palette. A spread of moods — vivid,
// muted, warm, cool, mono — and all three gradient types (Linear / Radial /
// Conic) so the grid doubles as a tour of what the tool can build.
const PRESETS = [
  { n: 'Nebula', type: 'Conic', angle: 90, stops: [{ color: '#7C3AED', position: 0 }, { color: '#DB2777', position: 50 }, { color: '#F59E0B', position: 100 }] },
  { n: 'Aqua', type: 'Linear', angle: 120, stops: [{ color: '#0EA5E9', position: 0 }, { color: '#22D3EE', position: 100 }] },
  { n: 'Ember', type: 'Linear', angle: 45, stops: [{ color: '#DC2626', position: 0 }, { color: '#F59E0B', position: 100 }] },
  { n: 'Meadow', type: 'Linear', angle: 135, stops: [{ color: '#16A34A', position: 0 }, { color: '#84CC16', position: 100 }] },
  { n: 'Dusk', type: 'Linear', angle: 160, stops: [{ color: '#6366F1', position: 0 }, { color: '#A855F7', position: 100 }] },
  { n: 'Graphite', type: 'Linear', angle: 135, stops: [{ color: '#1F2937', position: 0 }, { color: '#4B5563', position: 100 }] },
  { n: 'Peach', type: 'Linear', angle: 90, stops: [{ color: '#FB7185', position: 0 }, { color: '#FDBA74', position: 100 }] },
  { n: 'Mono', type: 'Linear', angle: 180, stops: [{ color: '#0F172A', position: 0 }, { color: '#64748B', position: 100 }] },
  { n: 'Sunset', type: 'Linear', angle: 60, stops: [{ color: '#F97316', position: 0 }, { color: '#DB2777', position: 55 }, { color: '#7C3AED', position: 100 }] },
  { n: 'Lagoon', type: 'Linear', angle: 135, stops: [{ color: '#0D9488', position: 0 }, { color: '#0EA5E9', position: 100 }] },
  { n: 'Grape', type: 'Linear', angle: 150, stops: [{ color: '#7E22CE', position: 0 }, { color: '#DB2777', position: 100 }] },
  { n: 'Citrus', type: 'Linear', angle: 90, stops: [{ color: '#FACC15', position: 0 }, { color: '#65A30D', position: 100 }] },
  { n: 'Twilight', type: 'Linear', angle: 200, stops: [{ color: '#0F172A', position: 0 }, { color: '#4338CA', position: 55 }, { color: '#DB2777', position: 100 }] },
  { n: 'Aurora', type: 'Conic', angle: 140, stops: [{ color: '#22D3EE', position: 0 }, { color: '#818CF8', position: 45 }, { color: '#4ADE80', position: 100 }] },
  { n: 'Bloom', type: 'Radial', angle: 90, stops: [{ color: '#FDE68A', position: 0 }, { color: '#FB7185', position: 60 }, { color: '#BE185D', position: 100 }] },
  { n: 'Ocean', type: 'Radial', angle: 90, stops: [{ color: '#38BDF8', position: 0 }, { color: '#1E3A8A', position: 100 }] },
]

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// A palette colour counts only if it's a full 6-digit hex (3-digit shorthand
// and blanks are rejected) — shared by every palette-sampling path below so the
// rule can't drift between call sites.
const isValidHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '')

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

// Padlock glyph — open shackle when unlocked, closed when locked — so a locked
// control reads at a glance. Stroke-based to match the other ggn icons.
const IcoLock = ({ size = 13, open = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    {open
      ? <path d="M8 11V7a4 4 0 0 1 7.9-.9" />
      : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
  </svg>
)

// Small lock toggle used across the tool — pins a setting so it survives a
// randomise. `on` = locked; the glyph flips its shackle to reflect state.
const LockBtn = ({ on, onClick, label, className = '' }) => (
  <button
    type="button"
    className={`ggn-lock${on ? ' is-on' : ''}${className ? ' ' + className : ''}`}
    onClick={onClick}
    aria-pressed={on}
    aria-label={label}
    title={label}
  >
    <IcoLock open={!on} />
  </button>
)

export default function GradientGenerator({ onCopy, toast }) {
  const { design, setGradient, projects } = useProject()
  const { isPro } = useSubscription()
  const { openProModal } = useProModal()
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

  // A gradient carried in from the Discover gallery is free to preview + copy,
  // but reshaping it is a Pro tool. `fromLibrary` is set on the ?gs= hand-off
  // (below); every wholesale-replace action (Reset / Random / From palette /
  // Import / preset) clears it, so those act as free escape hatches to an
  // editable, from-scratch gradient. We seed it from the shared design's
  // `source` flag so the gate survives a remount or refresh — and stays in sync
  // with the parallel gradient editor in ColorStudio, which writes the same flag.
  const [fromLibrary, setFromLibrary] = useState(() => design?.gradient?.source === 'gallery')

  // Randomise locks — pin any of type / angle / stop-count so a shuffle keeps
  // them. Per-stop colour+position locks live on the stop objects (`.locked`).
  const [locks, setLocks] = useState({ type: false, angle: false, count: false })

  const barRef = useRef(null)
  const dialRef = useRef(null)
  const suppressBarClickRef = useRef(false) // set during a stop drag so the drag-ending click doesn't add a stop

  const css = gradientCss(type, angle, stops)
  const cssValue = `background: ${css};`

  // Persist to the shared design so the gradient follows the user across tools.
  // `source` travels with it so the Pro gate on gallery gradients survives a
  // remount/refresh and stays consistent with ColorStudio's gradient editor.
  useEffect(() => {
    setGradient({ stops: stops.map(s => ({ color: s.color, position: s.position })), angle, type, source: fromLibrary ? 'gallery' : 'own' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, angle, type, fromLibrary])

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
      setFromLibrary(true)
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

  // A gallery gradient is free to view + copy; reshaping it — adding/moving/
  // recolouring stops, switching type or angle, flipping — is Pro. `editLocked`
  // drives the visual cues; `guardEdit` intercepts every edit action, raises the
  // Pro modal and returns false so the caller bails. Returns true (edit allowed)
  // for Pro users and for any gradient not sourced from the gallery.
  const editLocked = fromLibrary && !isPro
  const guardEdit = useCallback(() => {
    if (!fromLibrary || isPro) return true
    openProModal({
      eyebrow: 'Pro gradient tools',
      title: 'Editing gallery gradients is Pro',
      subtitle: 'Every gradient in the gallery is free to preview and copy. Reshaping one — adding stops, recolouring, changing the type or angle — is a Pro tool. Prefer to stay free? Hit Reset, Random or From palette to start an editable gradient of your own.',
      features: [
        'Add, move & recolour stops on any gallery gradient',
        'Switch gradient type and fine-tune the angle',
        'Flip and randomise straight from your own palette',
        'Unlimited saved projects across every colour tool',
      ],
    })
    return false
  }, [fromLibrary, isPro, openProModal])

  const applyPreset = useCallback((p) => {
    setStops(p.stops.map(s => ({ ...s })))
    setType(p.type)
    setAngle(p.angle)
    setActiveStop(0)
    setFromLibrary(false)
  }, [])

  const updateStop = useCallback((idx, patch) => {
    if (!guardEdit()) return
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }, [guardEdit])

  // Toggling a stop's randomise-lock isn't reshaping the gradient — it's a
  // shuffle control, exactly like the ungated type / angle / count locks — so it
  // bypasses guardEdit and stays available on a gallery gradient.
  const toggleStopLock = useCallback((idx) => {
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, locked: !s.locked } : s))
  }, [])

  // Insert a stop at a given position (0–100), blending the colour from the two
  // stops it lands between. Used by both the "+ Stop" button (midpoint) and a
  // click on the preview bar (exact position). Focuses the new stop.
  const addStopAt = useCallback((pct) => {
    if (!guardEdit()) return
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
  }, [stops.length, guardEdit])

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
    if (!guardEdit()) return
    setStops(prev => prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev)
    setActiveStop(0)
  }, [guardEdit])

  const flip = useCallback(() => {
    if (!guardEdit()) return
    setStops(prev => prev.map(s => ({ ...s, position: 100 - s.position })))
  }, [guardEdit])

  const randomHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()

  // Build a fresh set of stops that honours the current locks: a locked count
  // keeps the same number, and any stop marked `.locked` keeps its colour +
  // position while the rest are re-rolled. `sample(i)` supplies the colour for
  // an unlocked slot (random hex, or a palette pick) so both randomisers share
  // this logic.
  const rollStops = useCallback((sample) => {
    // A locked stop must always survive, even when the rolled count is smaller
    // than its index — so if ANY stop is locked we keep the current length
    // rather than shrinking to a random 2–3 and dropping locked stops.
    const hasStopLock = stops.some(s => s.locked)
    const n = (locks.count || hasStopLock) ? stops.length : 2 + Math.floor(Math.random() * 2) // 2–3 stops
    return Array.from({ length: n }, (_, i) => {
      const ex = stops[i]
      if (ex?.locked) return { color: ex.color, position: ex.position, locked: true }
      return {
        color: sample(i),
        position: Math.round((i / (n - 1)) * 100),
        locked: false,
      }
    })
  }, [locks.count, stops])

  const randomise = useCallback(() => {
    setStops(rollStops(() => randomHex()))
    if (!locks.type) setType(GRAD_TYPES[Math.floor(Math.random() * GRAD_TYPES.length)])
    if (!locks.angle) setAngle(Math.round(Math.random() * 360))
    setActiveStop(0)
    setFromLibrary(false)
  }, [rollStops, locks.type, locks.angle])

  // Valid hex colours in the live Palette Builder palette — feeds the
  // "From palette" button (needs 2+ to build a gradient).
  const paletteHexes = useMemo(
    () => [...new Set((design?.palette?.colors || []).filter(isValidHex))],
    [design?.palette?.colors]
  )
  const canRandomFromPalette = paletteHexes.length >= 2

  // Like Random, but samples the user's OWN palette instead of random hex, so
  // the result always sits inside their brand colours. Fisher–Yates shuffle →
  // take 2–3 → spread evenly → random type/angle. Falls back to fully-random
  // if the palette can't make a gradient (guarded by canRandomFromPalette).
  const randomiseFromPalette = useCallback(() => {
    const pool = paletteHexes // already filtered + deduped
    if (pool.length < 2) { randomise(); return }
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // Draw unlocked slots from the shuffled palette, cycling if there are more
    // stops than colours so a locked count never runs the pool dry.
    setStops(rollStops(i => shuffled[i % shuffled.length].toUpperCase()))
    if (!locks.type) setType(GRAD_TYPES[Math.floor(Math.random() * GRAD_TYPES.length)])
    if (!locks.angle) setAngle(Math.round(Math.random() * 360))
    setActiveStop(0)
    setFromLibrary(false)
    toast?.('Random gradient from your palette')
  }, [paletteHexes, randomise, rollStops, locks.type, locks.angle, toast])

  const reset = useCallback(() => applyPreset(PRESETS[0]), [applyPreset])

  // ── Import colours: the live Palette Builder palette + saved projects ──
  // A source needs 2+ real hex colours to make a gradient; capped at 5 stops so
  // an imported ramp stays readable.
  const importSources = useMemo(() => {
    const list = []
    const current = (design?.palette?.colors || []).filter(isValidHex)
    if (current.length >= 2) {
      list.push({ key: 'palette', name: 'Current palette', meta: 'Palette Builder', colors: current.slice(0, 5) })
    }
    for (const p of projects || []) {
      const colors = (p?.design?.palette?.colors || []).filter(isValidHex)
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
    setFromLibrary(false)
    toast?.(`Imported ${src.name}`)
  }, [toast])

  // ── Presets built from the user's own palettes/projects ──
  // Each import source becomes a ready-made gradient (colours spread evenly
  // across a linear ramp) so a saved palette is a one-tap gradient. These lead
  // the Presets grid, ahead of the built-in starters. Angles rotate through a
  // small set so consecutive palette presets don't all look identical.
  const palettePresets = useMemo(() => {
    const angles = [135, 90, 160, 45]
    return importSources.map((src, i) => ({
      n: src.name,
      type: 'Linear',
      angle: angles[i % angles.length],
      mine: true,
      stops: src.colors.map((color, j) => ({
        color: color.toUpperCase(),
        position: Math.round((j / (src.colors.length - 1)) * 100),
      })),
    }))
  }, [importSources])

  const copyCss = useCallback(() => {
    onCopy?.(cssValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }, [cssValue, onCopy])

  // ── Drag: stop handles on the preview bar ──
  const dragStop = useCallback((e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    if (!guardEdit()) return
    setActiveStop(idx)
    const move = (ev) => {
      suppressBarClickRef.current = true // a real drag happened → swallow the click that ends it
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
  }, [updateStop, guardEdit])

  // Click an empty part of the bar to drop a stop right where you click. Clicks
  // that land on a handle (its own button, incl. the click that ends a drag)
  // bubble up here too, so ignore them — those move a stop, they don't add one.
  const barClick = useCallback((e) => {
    if (suppressBarClickRef.current) { suppressBarClickRef.current = false; return }
    if (e.target.closest('.ggn-handle')) return
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    addStopAt(pct)
  }, [addStopAt])

  // ── Drag: the angle dial ──
  const angleActive = type !== 'Radial'
  const dragDial = useCallback((e) => {
    if (!angleActive) return
    if (!guardEdit()) return
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
  }, [angleActive, guardEdit])

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
          {editLocked && (
            <p className="ggn-lock-note">
              <IcoLock size={12} />
              <span>Gallery gradient — free to preview &amp; copy. Editing it is a Pro tool; Reset or Random to start a free, editable one.</span>
            </p>
          )}
        </div>
        <div className="ggn-head-actions">
          <button type="button" className="ggn-btn ggn-btn-accent" onClick={randomise}>
            <ShuffleIcon size={15} /> Random
          </button>
          <button
            type="button"
            className="ggn-btn ggn-btn-ghost"
            onClick={() => canRandomFromPalette && randomiseFromPalette()}
            aria-disabled={!canRandomFromPalette || undefined}
            aria-label={canRandomFromPalette
              ? 'Random gradient from your palette'
              : 'From palette — add 2+ colours in the Palette Builder to use this'}
            title={canRandomFromPalette
              ? 'Build a random gradient from your current palette'
              : 'Add 2+ colours in the Palette Builder to use this'}
          >
            <ShuffleIcon size={15} /> From palette
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
              onClick={barClick}
              title="Click to add a stop"
            >
              <div className="ggn-bar-track" style={{ background: `linear-gradient(90deg, ${[...stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${Math.round(s.position)}%`).join(', ')})` }} />
              {sortedForBar.map(s => (
                <button
                  key={s.i}
                  type="button"
                  className={`ggn-handle${activeStop === s.i ? ' is-active' : ''}${s.locked ? ' is-locked' : ''}`}
                  style={{ left: `${s.position}%`, '--h-color': s.color }}
                  onPointerDown={(e) => dragStop(e, s.i)}
                  aria-label={`Gradient stop ${s.i + 1} at ${Math.round(s.position)}%${s.locked ? ', locked' : ''}`}
                />
              ))}
            </div>
          </div>
          <p className="ggn-preview-hint">
            {editLocked
              ? 'Editing gallery gradients is a Pro feature — Reset or Random to start a free, editable gradient.'
              : 'Drag a handle to move a stop · click the bar to add one'}
          </p>
        </div>

        {/* Control panel */}
        <div className="ggn-panel">
          <div className="ggn-field">
            <div className="ggn-label-row">
              <span className="ggn-label">Type</span>
              <LockBtn on={locks.type} onClick={() => setLocks(l => ({ ...l, type: !l.type }))} label={locks.type ? 'Type locked — unlock to randomise it' : 'Lock type when randomising'} />
            </div>
            <div className="ggn-seg">
              {GRAD_TYPES.map(t => (
                <button key={t} type="button" className={`ggn-seg-btn${type === t ? ' is-on' : ''}`} onClick={() => { if (guardEdit()) setType(t) }}>{t}</button>
              ))}
            </div>
          </div>

          <div className="ggn-field">
            <div className="ggn-label-row">
              <span className="ggn-label">Angle</span>
              <LockBtn on={locks.angle} onClick={() => setLocks(l => ({ ...l, angle: !l.angle }))} label={locks.angle ? 'Angle locked — unlock to randomise it' : 'Lock angle when randomising'} />
            </div>
            <div className={`ggn-angle${angleActive ? '' : ' is-disabled'}`}>
              <div className="ggn-dial" ref={dialRef} onPointerDown={dragDial} role="slider" aria-label="Gradient angle" aria-valuenow={Math.round(angle)} aria-valuemin={0} aria-valuemax={360} tabIndex={angleActive ? 0 : -1}
                onKeyDown={(e) => {
                  if (!angleActive) return
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); if (guardEdit()) setAngle(a => (a + 1) % 360) }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); if (guardEdit()) setAngle(a => (a + 359) % 360) }
                }}>
                <div className="ggn-dial-hand" style={{ transform: `rotate(${angle}deg)` }} />
                <div className="ggn-dial-center" />
              </div>
              <div className="ggn-angle-ctrl">
                <input
                  type="range" min="0" max="360" value={Math.round(angle)}
                  onChange={(e) => { if (guardEdit()) setAngle(+e.target.value) }}
                  disabled={!angleActive || editLocked}
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
            <LockBtn on={locks.count} onClick={() => setLocks(l => ({ ...l, count: !l.count }))} label={locks.count ? 'Stop count locked — unlock to randomise it' : 'Lock the number of stops when randomising'} />
            <button type="button" className="ggn-btn ggn-btn-ghost ggn-btn-sm" onClick={addStop}>{editLocked && <IcoLock size={12} />} + Stop</button>
            <button type="button" className="ggn-btn ggn-btn-ghost ggn-btn-sm" onClick={flip}>{editLocked && <IcoLock size={12} />} ⇄ Flip</button>
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
                  disabled={editLocked}
                  onDisabledClick={guardEdit}
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
                  disabled={editLocked}
                  aria-label={`Stop ${i + 1} position`}
                />
                <span>%</span>
              </div>
              <LockBtn
                on={!!s.locked}
                onClick={(e) => { e.stopPropagation(); toggleStopLock(i) }}
                className="ggn-stop-lock"
                label={s.locked ? `Stop ${i + 1} locked — colour & position kept on randomise` : `Lock stop ${i + 1} colour & position when randomising`}
              />
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
          {palettePresets.map((p, i) => (
            <button key={`mine-${i}`} type="button" className="ggn-preset ggn-preset--mine" onClick={() => applyPreset(p)} title={`Gradient from ${p.n}`}>
              <span className="ggn-preset-swatch" style={{ background: gradientCss(p.type, p.angle, p.stops) }} />
              <span className="ggn-preset-name">{p.n}</span>
            </button>
          ))}
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
