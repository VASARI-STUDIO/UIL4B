import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import ColorPickerPop from '../components/ColorPickerPop'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills, ToolSlider, ToolIcon,
} from '../components/tool/ToolLayout'
import { sampleStopsOklch } from '../components/tool/oklch'
import { GRAD_TYPE_WEIGHTS, pickGradientType, pickStopCount } from '../utils/gradientRandom'
import { hexToRgb } from '../utils/colors'
import { gradientCss, decodeGradientParams } from '../data/gradientGallery'
import { consumeGradientDraft, readGradientDraft } from '../utils/colorHandoff'
import { appendGradientSubmission, sanitizeGradientSubmission } from '../utils/gradientSubmissions'
import { buildQueueRecord } from '../utils/communityQueue'
import { publishToQueue } from '../utils/communityQueueApi'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import useModalDialog from '../hooks/useModalDialog'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
// This page's own sheet. Every rule is scoped under `.grd`, the page root, so
// nothing depends on import order.
// tool-shell.css carries the .ui-form / .ui-field rules the submit modal uses.
import '../styles/deferred/tool-shell.css'
import '../styles/pages/gradient.css'

// ── Gradient ──
// The standalone /create/gradient tool, rebuilt to the design
// (UIL4B App.dc.html, `isGradient`, D:610-716): the shared sticky
// tool toolbar, a canvas + stop rail + code well on the left, and a 336px card
// of STOPS / SELECTED STOP / GEOMETRY on the right, with a 6-up preset strip
// under both. Every function the previous build had is kept and placed in that
// layout — see the notes at each block. It reads + writes the shared
// design.gradient (ProjectContext) so a gradient authored here survives a jump
// to any other colour tool. (Class prefix `grd-`.)

const GRAD_TYPES = GRAD_TYPE_WEIGHTS.map(([type]) => type)

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
const MAX_STOPS = 12

// Palette colours → evenly spread stops. Same shape the "Import colours" path
// builds, so a palette carried in from the Palette Builder lands identically to
// one imported here.
const stopsFromColors = (colors) => colors.map((color, i) => ({
  color: color.toUpperCase(),
  position: Math.round((i / (colors.length - 1)) * 100),
}))

// Export formats offered under the preview. SVG is dropped for conic gradients
// (SVG has no conic-gradient element), so the toggle adapts to the type.
const EXPORT_FORMATS = [
  { id: 'css', label: 'CSS' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'svg', label: 'SVG' },
]

// Build a standalone, paste-ready SVG for a linear or radial gradient. The CSS
// angle (0deg = up, 90deg = right, clockwise) is converted to the gradient
// vector SVG wants. Conic isn't representable as an SVG gradient, so callers
// only offer SVG for linear/radial.
function gradientSvg(type, angle, stops, space = 'srgb') {
  // SVG gradients only interpolate in sRGB, so an OKLCH gradient is exported
  // as sRGB stops sampled every 5% along the OKLCH path — the SVG then paints
  // the same ramp the CSS does rather than silently a different one.
  const source = space === 'oklch' ? sampleStopsOklch(stops, 5) : stops
  const stopEls = [...source]
    .sort((a, b) => a.position - b.position)
    .map(s => `      <stop offset="${Math.round(s.position)}%" stop-color="${s.color.toUpperCase()}" />`)
    .join('\n')
  let def
  if (type === 'Radial') {
    def = `    <radialGradient id="grad" cx="50%" cy="50%" r="75%">\n${stopEls}\n    </radialGradient>`
  } else {
    const rad = ((angle % 360) + 360) % 360 * Math.PI / 180
    const dx = Math.sin(rad), dy = -Math.cos(rad)
    const x1 = (50 - dx * 50).toFixed(1), y1 = (50 - dy * 50).toFixed(1)
    const x2 = (50 + dx * 50).toFixed(1), y2 = (50 + dy * 50).toFixed(1)
    def = `    <linearGradient id="grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n${stopEls}\n    </linearGradient>`
  }
  return `<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">\n  <defs>\n${def}\n  </defs>\n  <rect width="600" height="400" fill="url(#grad)" />\n</svg>`
}

// Turn a CSS gradient value into a Tailwind arbitrary value. Tailwind reads
// underscores as spaces inside arbitrary values, so every space becomes `_`.
const tailwindValue = (css) => `bg-[${css.replace(/ /g, '_')}]`

// INTERPOLATION — the design's GEOMETRY "Interpolation: OKLCH | sRGB" control
// (D:692-699), implemented for real. `in oklch` is a CSS Color 4 colour-
// interpolation method; it goes after the angle/position part of the gradient
// function (`linear-gradient(135deg in oklch, …)`, `radial-gradient(in oklch,
// …)`, `conic-gradient(from 90deg at 50% 50% in oklch, …)`). sRGB is the
// function's default, so it writes nothing.
const SPACES = [
  { value: 'oklch', label: 'OKLCH' },
  { value: 'srgb', label: 'sRGB' },
]
function gradientCssIn(type, angle, stops, space) {
  const css = gradientCss(type, angle, stops)
  if (space !== 'oklch') return css
  const open = css.indexOf('(') + 1
  if (type === 'Radial') return `${css.slice(0, open)}in oklch, ${css.slice(open)}`
  const comma = css.indexOf(', ', open)
  return `${css.slice(0, comma)} in oklch${css.slice(comma)}`
}

// A browser without `in oklch` (Chrome < 111, Safari < 16.2) drops the whole
// declaration, and the canvas would paint nothing. It paints the sRGB twin
// instead; the COPIED code still says what the person chose.
const supportsOklchGradients = (() => {
  try { return typeof CSS !== 'undefined' && CSS.supports('background-image', 'linear-gradient(90deg in oklch, red, blue)') } catch { return false }
})()

// SELECTED STOP swatches — the design's ten (GRAD_SWATCHES, D:1150).
const STOP_SWATCHES = ['#2F6BFF', '#1B3FA8', '#8B5CF0', '#E894AC', '#E0784E', '#D9B93C', '#3FAFA0', '#52A069', '#0B0C0E', '#F7F7F4']

// Hex text field with a local draft, so partially-typed values aren't wiped by
// the controlled stop colour on every keystroke. Commits when the text is a
// valid #rrggbb; reverts to the stop's colour on blur if left invalid.
function StopHexInput({ color, label, onCommit }) {
  const [draft, setDraft] = useState(color.toUpperCase())
  useEffect(() => { setDraft(color.toUpperCase()) }, [color])
  const valid = isValidHex(draft)
  const revert = () => setDraft(color.toUpperCase())
  return (
    <span className="grd-hex-field">
      <input
        type="text"
        className="grd-hex"
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          if (isValidHex(v)) onCommit(v.toUpperCase())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (valid) onCommit(draft.toUpperCase())
            else revert()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            revert()
            e.currentTarget.blur()
          }
        }}
        onBlur={revert}
        aria-label={label}
        aria-invalid={!valid}
        spellCheck="false"
        autoComplete="off"
      />
      {!valid && <span className="grd-field-error" role="status">Use a 6-digit hex</span>}
    </span>
  )
}

// Submit-for-review modal for the gradient library. Same shape and the same
// `ui-modal` chrome the Community Hub's design submission already uses, on the
// same local-first storage pattern — this adds no backend and publishes nothing.
// The note is the honest part: the gradient is QUEUED, not live.
function SubmitGradientModal({ gradient, authorName, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: gradient.name || '', author: authorName || '', note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submitDialogRef = useModalDialog(onClose)

  const submit = () => {
    if (busy) return                                   // double-submit guard
    if (!form.name.trim()) return setError('Give your gradient a name.')
    setBusy(true)
    const ok = onSubmit({
      name: form.name.trim(),
      author: form.author.trim(),
      note: form.note.trim(),
    })
    if (!ok) { setBusy(false); setError('That gradient could not be queued. Try again.') }
  }

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div className="ui-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit a gradient for review" tabIndex={-1} ref={submitDialogRef}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">Submit for review</h2>
          <button className="ui-modal-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="ui-modal-body">
          <div className="grd-submit-preview" style={{ background: gradient.css }} aria-hidden="true" />
          <div className="ui-form">
            <label className="ui-field">
              <span>Name</span>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Harbour Dusk" maxLength={60} />
            </label>
            <label className="ui-field">
              <span>Author</span>
              <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Your name (optional)" maxLength={40} />
            </label>
            <label className="ui-field">
              <span>Note for the reviewer</span>
              <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Where it works well (optional)" maxLength={200} />
            </label>
            {error && <div className="ui-modal-err" role="alert">{error}</div>}
            <p className="ui-modal-note">
              Your gradient is queued for review on this browser — it is <strong>not published</strong>.
              Shared publishing to the gradient library isn’t live yet, so nothing appears in the
              gallery until a reviewer approves it. You can withdraw it any time from the gallery.
            </p>
          </div>
          <div className="ui-modal-actions ui-modal-actions--row">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={submit} disabled={busy}>
              {busy ? 'Queueing…' : 'Queue for review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Small lock toggle — pins a setting so it survives a randomise. `on` = locked;
// the glyph flips its shackle to say so. Drawn at the size of the design's
// row-end icon buttons (the stop row's remove ×, 26px) so it sits in a row
// without adding a new control shape.
const LockBtn = ({ on, onClick, label, className = '' }) => (
  <button
    type="button"
    className={`grd-iconbtn grd-lock${on ? ' is-on' : ''}${className ? ' ' + className : ''}`}
    onClick={onClick}
    aria-pressed={on}
    aria-label={label}
    title={label}
  >
    <ToolIcon name={on ? 'lock-simple' : 'lock-simple-open'} size={13} />
  </button>
)

// Community submission surface name for the sign-in gate (utils/submitIntent).
const SUBMIT_SURFACE = 'gradient'

// `onExport` is this tool's ONE declared export hook — the copy of the payload
// that IS the artefact. It defaults to `onCopy` so the component still copies
// correctly if it is ever mounted outside CreateTool; the activation naming
// lives in src/config/activationExports.js, never here.
export default function GradientGenerator({ onCopy, onExport = onCopy, toast }) {
  const { design, setGradient, projects } = useProject()
  const { user, userProfile, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  // Stable primitive so the gate effect doesn't re-run on every AuthContext render.
  const uid = user?.uid || null
  const { isPro } = useSubscription()
  const { openProModal } = useProModal()
  const [searchParams, setSearchParams] = useSearchParams()

  // A palette handed over from the Palette Builder's Gradient button. Read (not
  // consumed) during render, so a render React discards can't lose it; the mount
  // effect below empties the slot exactly once. A reload or a direct visit reads
  // nothing and the tool seeds from the saved gradient as usual.
  const carriedPalette = readGradientDraft()

  // Seed from the saved gradient. Null stop colours (the untouched default,
  // "use my palette") resolve to the live palette; a fully-default gradient seeds
  // the Nebula preset so a first-time visitor lands on a vivid look.
  const [type, setType] = useState(() => design?.gradient?.type || 'Conic')
  const [angle, setAngle] = useState(() => design?.gradient?.angle ?? 90)
  const [stops, setStops] = useState(() => {
    if (carriedPalette) return stopsFromColors(carriedPalette.colors)
    const saved = design?.gradient?.stops
    if (Array.isArray(saved) && saved.some(s => s.color)) {
      return saved.map((s, i) => ({ color: s.color || design?.palette?.colors?.[i] || '#2563EB', position: s.position }))
    }
    return DEFAULT_STOPS()
  })
  const [activeStop, setActiveStop] = useState(0)
  const [copied, setCopied] = useState(false)
  const [fmt, setFmt] = useState('css') // export format: css | tailwind | svg
  // Interpolation space — the design's GEOMETRY control. OKLCH is its default
  // (D:1306, gSpace: 0). A saved gradient keeps the space it was saved in; one
  // saved before this control existed was drawn in sRGB, so it stays sRGB.
  const [space, setSpace] = useState(() => {
    const saved = design?.gradient
    if (saved?.space === 'oklch' || saved?.space === 'srgb') return saved.space
    return saved?.stops?.some?.((s) => s?.color) ? 'srgb' : 'oklch'
  })

  // A gradient carried in from the Discover gallery is free to preview + copy,
  // but reshaping it is a Pro tool. `fromLibrary` is set on the ?gs= hand-off
  // (below); every wholesale-replace action (Reset / Random / From palette /
  // Import / preset) clears it, so those act as free escape hatches to an
  // editable, from-scratch gradient. We seed it from the shared design's
  // `source` flag so the gate survives a remount or refresh — and stays in sync
  // with the parallel gradient editor in ColorStudio, which writes the same flag.
  // A palette carried in from the Palette Builder is the user's OWN work, so it
  // must never inherit the gallery gradient's Pro edit lock.
  const [fromLibrary, setFromLibrary] = useState(() => !carriedPalette && design?.gradient?.source === 'gallery')

  // Randomise locks — pin any of type / angle / stop-count so a shuffle keeps
  // them. Per-stop colour+position locks live on the stop objects (`.locked`).
  const [locks, setLocks] = useState({ type: false, angle: false, count: false })

  // The stop currently being dragged (index, or null). Drives the live position
  // readout on the handle so a fine adjustment is read, not guessed.
  const [dragIdx, setDragIdx] = useState(null)

  // Submit-for-review (gradient library). Local-first queue only — see
  // utils/gradientSubmissions.js.
  const [submitOpen, setSubmitOpen] = useState(false)

  const barRef = useRef(null)
  // Handle elements by stop index, so a stop added by pressing the rail can be
  // focused the moment it renders — that is what makes the arrow keys work on it
  // straight away instead of only after the user hunts it down and clicks it.
  const handleEls = useRef(new Map())
  const focusStopRef = useRef(null)

  const css = gradientCssIn(type, angle, stops, space)
  // What the canvas paints: the chosen space where the browser can, else sRGB.
  const paintCss = supportsOklchGradients ? css : gradientCss(type, angle, stops)

  // Export code for the copy panel. SVG only applies to linear/radial, so a
  // conic gradient falls back to CSS even if SVG was the last-picked format.
  const effFmt = fmt === 'svg' && type === 'Conic' ? 'css' : fmt
  const exportCode = useMemo(() => {
    if (effFmt === 'tailwind') return tailwindValue(css)
    if (effFmt === 'svg') return gradientSvg(type, angle, stops, space)
    return `background: ${css};`
  }, [effFmt, css, type, angle, stops, space])

  // Persist to the shared design so the gradient follows the user across tools.
  // `source` travels with it so the Pro gate on gallery gradients survives a
  // remount/refresh and stays consistent with ColorStudio's gradient editor.
  useEffect(() => {
    setGradient({ stops: stops.map(s => ({ color: s.color, position: s.position })), angle, type, space, source: fromLibrary ? 'gallery' : 'own' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, angle, type, space, fromLibrary])

  // Commit the Palette Builder hand-off. Effects only run for a committed tree,
  // so this empties the slot exactly once — a remount, a Back/Forward navigation
  // or a second visit inherits nothing.
  useEffect(() => {
    if (readGradientDraft()) toast?.('Gradient built from your palette')
    consumeGradientDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // A library gradient is drawn in sRGB there, so it opens in sRGB here —
      // the preview matches the card it came from until the person changes it.
      setSpace('srgb')
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
      gate: 'gradient-gallery-edit',
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
  // press on the preview rail (exact position). Returns the new stop's index —
  // the rail hands it straight to a drag so one gesture creates AND positions
  // it — or null when nothing was added. Also queues focus onto the new handle
  // so the arrow keys nudge it without a hunt for it first.
  const addStopAt = useCallback((pct) => {
    if (!guardEdit()) return null
    if (stops.length >= MAX_STOPS) {
      toast?.(`A gradient can contain up to ${MAX_STOPS} stops`)
      return null
    }
    const idx = stops.length // appended below, so this is the new stop's index
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
    setActiveStop(idx)
    focusStopRef.current = idx
    return idx
  }, [stops.length, guardEdit, toast])

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
    const n = (locks.count || hasStopLock) ? stops.length : pickStopCount(Math.random())
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
    if (!locks.type) setType(pickGradientType(Math.random()))
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
    if (!locks.type) setType(pickGradientType(Math.random()))
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

  const copyCode = useCallback(async () => {
    try {
      const result = await onExport?.(exportCode)
      if (result === false) {
        setCopied(false)
        return
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
      toast?.('Copy failed — select the code and copy it manually')
    }
  }, [exportCode, onExport, toast])

  // Queue the current gradient for review. Local-first, exactly like the
  // Community Hub's design submission: it lands in this browser's queue with a
  // 'pending' status and is not published anywhere. Returns false if the
  // gradient could not be stored, so the modal can say so rather than lie.
  // Ask a signed-out user to sign in BEFORE the submission form exists, so
  // nobody names a gradient and writes a reviewer note only to be told they need
  // an account. While auth is still resolving we show neither prompt — the
  // trigger is disabled rather than flashing the wrong dialog.
  //
  // The gradient itself lives in ProjectContext (persisted), so signing in never
  // costs the user their work; the intent slot only remembers that the FORM
  // should re-open if the sign-in remounted this surface.
  // The single place the submission form is opened. Both the gate below and the
  // post-sign-in resume go through it, so there is exactly one path to a form.
  const openSubmitForm = useCallback(() => {
    consumeSubmitIntent()
    setSubmitOpen(true)
  }, [])

  const openSubmit = useCallback(async () => {
    if (authLoading) return
    if (!uid) {
      setSubmitIntent(SUBMIT_SURFACE)
      // `signup: true` for the same reason as the Type Scale save and the
      // export gate: this branch is only reached when `uid` is absent, so the
      // person meeting it has no account, and "Log in to continue" greets them
      // with a form for one they have never made.
      const signedIn = await requireLogin('submit a gradient to the community library', {
        free: true,
        signup: true,
        reasons: COMMUNITY_SUBMIT_REASONS,
      })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    openSubmitForm()
  }, [authLoading, uid, requireLogin, openSubmitForm])

  // Resume the intent when signing in remounted this surface. In-memory only —
  // a full page reload finds nothing and the tool opens normally.
  useEffect(() => {
    if (authLoading || !uid) return
    if (!hasSubmitIntent(SUBMIT_SURFACE)) return
    openSubmitForm()
  }, [authLoading, uid, openSubmitForm])

  const submitForReview = useCallback(async (fields) => {
    if (!uid) { setSubmitOpen(false); return false }   // defence in depth
    const record = sanitizeGradientSubmission({
      id: `g${Date.now()}`,
      ...fields,
      authorEmail: user?.email,
      type,
      angle: Math.round(angle),
      stops: stops.map(s => ({ color: s.color, position: Math.round(s.position) })),
      status: 'pending',
      submittedAt: Date.now(),
    })
    if (!record) return false

    // Local first: submitting works offline and the user's own list updates
    // without waiting on a round trip.
    appendGradientSubmission(record)
    setSubmitOpen(false)

    // Then publish to the shared queue. Until this existed, a submission never
    // left the browser — invisible on the user's other devices, and invisible
    // to any reviewer, so "pending" described a review that could not happen.
    const queued = buildQueueRecord({
      kind: 'gradient',
      name: record.name,
      user,
      payload: { type: record.type, angle: record.angle, stops: record.stops },
    })
    if (!queued) {
      // No signed-in user — the local copy stands, and the message says so
      // rather than claiming it reached a reviewer.
      toast?.('Saved to this browser. Sign in to submit it for review.')
      return true
    }
    try {
      await publishToQueue({ ...queued, localId: record.id })
      toast?.('Gradient submitted for review')
    } catch {
      // Never claim it reached the queue when it did not. The local copy is
      // kept, so nothing the user made is lost.
      toast?.('Saved locally — we could not reach the review queue. Try again later.')
    }
    return true
  }, [angle, stops, type, toast, uid, user])

  // ── Drag: stop handles on the preview rail ──
  // One drag session, shared by "grab an existing handle" and "press the rail to
  // create one", so a newly added stop is immediately draggable in the SAME
  // gesture. Pointer events are bound to the window, so the drag survives the
  // pointer leaving the rail; `dragIdx` state keeps the handle marked live so
  // its position readout stays on screen for the whole drag.
  const beginStopDrag = useCallback((idx) => {
    setActiveStop(idx)
    setDragIdx(idx)
    const move = (ev) => {
      const rect = barRef.current?.getBoundingClientRect()
      if (!rect || !rect.width) return
      if (ev.cancelable) ev.preventDefault() // no text selection / touch scroll mid-drag
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100))
      updateStop(idx, { position: Math.round(pct) })
    }
    const up = () => {
      setDragIdx(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [updateStop])

  const dragStop = useCallback((e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    if (!guardEdit()) return
    beginStopDrag(idx)
  }, [beginStopDrag, guardEdit])

  // Press empty rail to drop a stop right where you press — on POINTERDOWN, not
  // on the click that ends the gesture. That is the whole fix: the handle exists
  // and is visible from the first frame, and the same press continues straight
  // into a drag, so fine-tuning is one gesture instead of click-then-find-it.
  // Presses that land on a handle are the handle's own gesture (it stops
  // propagation), so they never reach here.
  const railPointerDown = useCallback((e) => {
    if (e.button != null && e.button > 0) return
    if (e.target.closest?.('.grd-handle')) return
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || !rect.width) return
    if (e.cancelable) e.preventDefault()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const idx = addStopAt(pct)
    if (idx == null) return
    beginStopDrag(idx)
  }, [addStopAt, beginStopDrag])

  // The angle applies to linear and conic; a radial gradient has none, and the
  // design hides the row for it (gradAngleDisplay, D:1831).
  const angleActive = type !== 'Radial'

  // Focus a freshly added handle once it exists in the DOM. Keyed on the stop
  // count so it fires exactly on the render that added one.
  useEffect(() => {
    const idx = focusStopRef.current
    if (idx == null) return
    focusStopRef.current = null
    handleEls.current.get(idx)?.focus({ preventScroll: true })
  }, [stops.length])

  const sortedForBar = [...stops.map((s, i) => ({ ...s, i }))].sort((a, b) => a.position - b.position)
  const selected = stops[activeStop] || stops[0]
  // The rail reads the stops left to right, so it is always a 90deg ramp in the
  // chosen space whatever the gradient's type — the design paints the gradient
  // itself there, which for a radial or conic would put no stop where its
  // handle sits.
  const railCss = gradientCssIn('Linear', 90, stops, supportsOklchGradients ? space : 'srgb')
  const allPresets = [...palettePresets, ...PRESETS]
  const presetOn = (p) => p.type === type
    && p.stops.length === stops.length
    && [...p.stops].sort((a, b) => a.position - b.position)
      .every((s, i) => s.color.toUpperCase() === sortedForBar[i].color.toUpperCase() && Math.round(s.position) === Math.round(sortedForBar[i].position))
  const fmtLabel = EXPORT_FORMATS.find((f) => f.id === effFmt)?.label || 'CSS'

  return (
    <ToolLayout
      className="grd"
      title="Gradient"
      titleId="grd-title"
      items={[
        // THE TOOL'S OWN ACTIONS. The drawn toolbar carries only the name, the
        // stop count and Copy CSS; these four are the previous build's header
        // actions, kept (the tool's actions live in the toolbar)
        // in its quiet-button shape. What does not fit goes to More.
        {
          id: 'random', priority: 3,
          render: () => <ToolButton icon="shuffle" onClick={randomise} title="Random gradient">Random</ToolButton>,
          menu: { label: 'Random', icon: 'shuffle', onSelect: randomise },
        },
        {
          id: 'from-palette', priority: 1,
          render: () => (
            <ToolButton
              icon="swatches"
              onClick={() => canRandomFromPalette && randomiseFromPalette()}
              aria-disabled={!canRandomFromPalette || undefined}
              aria-label={canRandomFromPalette ? undefined : 'From palette — add 2+ colours in the Palette Builder to use this'}
              title={canRandomFromPalette ? 'Build a random gradient from your current palette' : 'Add 2+ colours in the Palette Builder to use this'}
            >
              From palette
            </ToolButton>
          ),
          menu: {
            label: 'From palette', icon: 'swatches', ariaDisabled: !canRandomFromPalette,
            title: canRandomFromPalette ? 'Build a random gradient from your current palette' : 'Add 2+ colours in the Palette Builder to use this',
            onSelect: () => canRandomFromPalette && randomiseFromPalette(),
          },
        },
        {
          id: 'reset', priority: 1,
          render: () => <ToolButton icon="arrow-counter-clockwise" onClick={reset} title="Reset to the starting gradient">Reset</ToolButton>,
          menu: { label: 'Reset', icon: 'arrow-counter-clockwise', onSelect: reset },
        },
        {
          id: 'submit', priority: 0,
          render: () => (
            <ToolButton
              icon="upload-simple"
              onClick={openSubmit}
              disabled={authLoading}
              aria-busy={authLoading || undefined}
              title={authLoading ? 'Checking your account…' : 'Submit this gradient for review for the gradient library'}
            >
              Submit for review
            </ToolButton>
          ),
          menu: { label: 'Submit for review', icon: 'upload-simple', disabled: authLoading, onSelect: openSubmit },
        },
        {
          id: 'count', priority: 2, align: 'end', menu: false,
          render: () => <span className="tl-meta grd-count">{stops.length} {stops.length === 1 ? 'stop' : 'stops'}</span>,
        },
      ]}
      primary={(
        <ToolButton variant="accent" icon="copy" iconSize={14} onClick={copyCode}>
          {copied ? 'Copied' : `Copy ${fmtLabel}`}
        </ToolButton>
      )}
    >
      <ToolGrid>
        <ToolMain>
          {editLocked && (
            <p className="grd-note">
              <ToolIcon name="lock-simple" size={13} />
              <span>Gallery gradient — free to preview &amp; copy. Editing it is a Pro tool; Reset or Random to start a free, editable one.</span>
            </p>
          )}
          <div className="grd-canvas" style={{ background: paintCss }} role="img" aria-label={`${type} gradient preview`} />

          {/* The stop rail. Press empty rail to drop a stop where you press and
              keep dragging to place it; drag or arrow a handle to move it
              (Shift + arrow moves 10%, Home/End jump, Delete removes). */}
          <div className="grd-rail-wrap">
            <div
              className="grd-rail"
              ref={barRef}
              onPointerDown={railPointerDown}
              title="Press the rail to add a stop, then drag to place it"
              role="group"
              aria-label="Gradient stop rail. Press empty space to add a stop and drag to place it."
              style={{ background: railCss }}
            >
              {sortedForBar.map(s => (
                <button
                  key={s.i}
                  type="button"
                  ref={(el) => {
                    if (el) handleEls.current.set(s.i, el)
                    else handleEls.current.delete(s.i)
                  }}
                  className={`grd-handle${activeStop === s.i ? ' is-active' : ''}${dragIdx === s.i ? ' is-dragging' : ''}${s.locked ? ' is-locked' : ''}`}
                  style={{ left: `${s.position}%`, '--grd-stop': s.color }}
                  onPointerDown={(e) => dragStop(e, s.i)}
                  onFocus={() => setActiveStop(s.i)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                      e.preventDefault()
                      updateStop(s.i, { position: Math.min(100, Math.round(s.position) + (e.shiftKey ? 10 : 1)) })
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      updateStop(s.i, { position: Math.max(0, Math.round(s.position) - (e.shiftKey ? 10 : 1)) })
                    } else if (e.key === 'Home') {
                      e.preventDefault()
                      updateStop(s.i, { position: 0 })
                    } else if (e.key === 'End') {
                      e.preventDefault()
                      updateStop(s.i, { position: 100 })
                    } else if ((e.key === 'Delete' || e.key === 'Backspace') && stops.length > 2) {
                      e.preventDefault()
                      removeStop(s.i)
                    }
                  }}
                  aria-label={`Gradient stop ${s.i + 1} at ${Math.round(s.position)}%${s.locked ? ', locked' : ''}`}
                >
                  <span className="grd-handle-dot" aria-hidden="true" />
                  {/* Live position while dragging or keyboard-focused, so a
                      fine adjustment is read off the handle, not guessed. */}
                  <span className="grd-handle-val" aria-hidden="true">{Math.round(s.position)}%</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grd-code">
            <div className="grd-fmt" role="tablist" aria-label="Export format">
              {EXPORT_FORMATS.filter(f => f.id !== 'svg' || type !== 'Conic').map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={effFmt === f.id}
                  className={`tl-pill tl-pill--mono grd-fmt-btn${effFmt === f.id ? ' is-on' : ''}`}
                  onClick={() => setFmt(f.id)}
                >{f.label}</button>
              ))}
            </div>
            <pre className={`grd-code-text${effFmt === 'svg' ? ' grd-code-text--block' : ''}`} tabIndex={0} aria-label={`${fmtLabel} code`}><code>{exportCode}</code></pre>
          </div>
        </ToolMain>

        <ToolPanel label="Gradient controls" className="grd-panel">
          <ToolSection
            label="Stops"
            aside={(
              <span className="grd-sec-tools">
                <LockBtn on={locks.count} onClick={() => setLocks(l => ({ ...l, count: !l.count }))} label={locks.count ? 'Stop count locked — unlock to randomise it' : 'Lock the number of stops when randomising'} />
                <button type="button" className="grd-iconbtn" onClick={flip} aria-label="Flip the stops" title="Flip the stops">
                  <ToolIcon name="arrows-left-right" size={13} />
                </button>
              </span>
            )}
          >
            {stops.map((s, i) => (
              <div key={i} className={`grd-stop${activeStop === i ? ' is-on' : ''}`}>
                <button
                  type="button"
                  className="grd-stop-swatch"
                  style={{ background: s.color }}
                  onClick={() => setActiveStop(i)}
                  aria-pressed={activeStop === i}
                  aria-label={`Select stop ${i + 1}, ${s.color.toUpperCase()}`}
                />
                <span className="grd-stop-hex">{s.color.toUpperCase()}</span>
                <span className="grd-stop-pos">{Math.round(s.position)}%</span>
                <LockBtn
                  on={!!s.locked}
                  onClick={() => toggleStopLock(i)}
                  className="grd-stop-lock"
                  label={s.locked ? `Stop ${i + 1} locked — colour & position kept on randomise` : `Lock stop ${i + 1} colour & position when randomising`}
                />
                {stops.length > 2 && (
                  <button type="button" className="grd-iconbtn grd-stop-x" onClick={() => removeStop(i)} aria-label={`Remove stop ${i + 1}`} title="Remove this stop">
                    <ToolIcon name="x" size={12} />
                  </button>
                )}
              </div>
            ))}
            {stops.length < MAX_STOPS && (
              <ToolButton variant="dashed" icon="plus" iconSize={13} className="grd-add" onClick={addStop}>
                Add a stop
              </ToolButton>
            )}
          </ToolSection>

          <ToolSection label="Selected stop">
            <div className="grd-swatches" role="group" aria-label="Quick colours for the selected stop">
              {STOP_SWATCHES.map((hex) => {
                const on = selected?.color?.toUpperCase() === hex
                return (
                  <button
                    key={hex}
                    type="button"
                    className={`grd-swatch${on ? ' is-on' : ''}`}
                    style={{ background: hex }}
                    aria-label={`Use ${hex}`}
                    aria-pressed={on}
                    title={hex}
                    onClick={() => updateStop(activeStop, { color: hex })}
                  />
                )
              })}
            </div>
            {selected && (
              <div className="grd-pick">
                <span className="grd-pick-swatch">
                  <ColorPickerPop
                    value={selected.color}
                    onChange={(hex) => updateStop(activeStop, { color: hex.toUpperCase() })}
                    ariaLabel={`Stop ${activeStop + 1} colour`}
                    disabled={editLocked}
                    onDisabledClick={guardEdit}
                  />
                </span>
                <StopHexInput
                  color={selected.color}
                  label={`Stop ${activeStop + 1} hex`}
                  onCommit={(v) => updateStop(activeStop, { color: v })}
                />
              </div>
            )}
            <ToolSlider
              label="Position"
              value={Math.round(selected?.position ?? 0)}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateStop(activeStop, { position: v })}
              display={`${Math.round(selected?.position ?? 0)}%`}
              track={railCss}
              ariaLabel="Stop position"
              ariaValueText={`${Math.round(selected?.position ?? 0)}%`}
              disabled={editLocked}
            />
          </ToolSection>

          <ToolSection label="Geometry" className="grd-geo">
            <div className="grd-row">
              <ToolPills
                label="Gradient type"
                options={GRAD_TYPES}
                value={type}
                onChange={(t) => { if (guardEdit()) setType(t) }}
              />
              <LockBtn on={locks.type} onClick={() => setLocks(l => ({ ...l, type: !l.type }))} label={locks.type ? 'Type locked — unlock to randomise it' : 'Lock type when randomising'} />
            </div>
            {angleActive && (
              <div className="grd-row">
                <ToolSlider
                  label="Angle"
                  className="grd-angle"
                  value={Math.round(angle)}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(v) => { if (guardEdit()) setAngle(v % 360) }}
                  display={`${Math.round(angle)}°`}
                  ariaLabel="Gradient angle"
                  ariaValueText={`${Math.round(angle)} degrees`}
                  disabled={editLocked}
                />
                <LockBtn on={locks.angle} onClick={() => setLocks(l => ({ ...l, angle: !l.angle }))} label={locks.angle ? 'Angle locked — unlock to randomise it' : 'Lock angle when randomising'} />
              </div>
            )}
            <div className="grd-interp">
              <span className="grd-interp-k" id="grd-interp-label">Interpolation</span>
              <ToolPills labelledBy="grd-interp-label" mono options={SPACES} value={space} onChange={setSpace} />
            </div>
          </ToolSection>
        </ToolPanel>
      </ToolGrid>

      {/* START FROM A PRESET (D:703-713). The drawn strip is six across; the
          build's set is the person's own palettes first (one-tap gradients of
          their saved colours), then the curated sixteen, in the same grid. */}
      <section className="grd-presets" aria-labelledby="grd-presets-title">
        <div className="grd-presets-head">
          <h2 id="grd-presets-title">Start from a preset</h2>
          <Link className="grd-lib" to="/discover/gradients">
            <span>Gradient Library</span>
            <ToolIcon name="caret-right" size={12} className="grd-lib-caret" />
          </Link>
        </div>
        <div className="grd-preset-grid">
          {allPresets.map((p, i) => {
            const on = presetOn(p)
            return (
              <button
                key={`${p.mine ? 'mine' : 'p'}-${i}`}
                type="button"
                className={`grd-preset${p.mine ? ' grd-preset--mine' : ''}${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => applyPreset(p)}
                title={p.mine ? `Gradient from ${p.n}` : undefined}
              >
                <span className="grd-preset-swatch" style={{ background: gradientCss(p.type, p.angle, p.stops) }} aria-hidden="true" />
                <span className="grd-preset-row">
                  <span className="grd-preset-name">{p.n}</span>
                  <span className="grd-preset-meta">{p.stops.length} stops</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Only ever mounted for a signed-in user — see openSubmit above. */}
      {submitOpen && uid && (
        <SubmitGradientModal
          gradient={{ css: paintCss, name: '' }}
          authorName={userProfile?.displayName || user?.displayName || ''}
          onClose={() => setSubmitOpen(false)}
          onSubmit={submitForReview}
        />
      )}
    </ToolLayout>
  )
}
