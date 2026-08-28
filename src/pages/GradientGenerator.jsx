import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import ColorPickerPop from '../components/ColorPickerPop'
import ShuffleIcon from '../components/ShuffleIcon'
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

// ── Gradient Generator ──
// The standalone /create/gradient tool: build any linear / radial / conic
// gradient with draggable stops, a live angle dial and copy-ready CSS — all on
// one screen and styled with the app design tokens so it follows the active
// theme. It reads + writes the shared design.gradient (ProjectContext) so a
// gradient authored here survives a jump to any other colour tool.
// (Class prefix `ggn-` = gradient generator.)

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
function gradientSvg(type, angle, stops) {
  const stopEls = [...stops]
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

// Hex text field with a local draft, so partially-typed values aren't wiped by
// the controlled stop colour on every keystroke. Commits when the text is a
// valid #rrggbb; reverts to the stop's colour on blur if left invalid.
function StopHexInput({ color, label, onCommit }) {
  const [draft, setDraft] = useState(color.toUpperCase())
  useEffect(() => { setDraft(color.toUpperCase()) }, [color])
  const valid = isValidHex(draft)
  const revert = () => setDraft(color.toUpperCase())
  return (
    <span className="ggn-stop-hex-field">
      <input
        type="text"
        className="ggn-stop-hex"
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
      {!valid && <span className="ggn-field-error" role="status">Use a 6-digit hex</span>}
    </span>
  )
}

function StopPositionInput({ value, label, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(Math.round(value)))
  useEffect(() => { setDraft(String(Math.round(value))) }, [value])

  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(String(Math.round(value)))
      return
    }
    const next = Math.max(0, Math.min(100, Math.round(parsed)))
    setDraft(String(next))
    onCommit(next)
  }

  return (
    <div className="ggn-stop-pos">
      <input
        type="number"
        min="0"
        max="100"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            setDraft(String(Math.round(value)))
            e.currentTarget.blur()
          }
        }}
        disabled={disabled}
        aria-label={label}
      />
      <span aria-hidden="true">%</span>
    </div>
  )
}

// Upload glyph for the "Submit for review" action.
const IcoSubmit = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v13" />
  </svg>
)

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
          <div className="ggn-submit-preview" style={{ background: gradient.css }} aria-hidden="true" />
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

// Community submission surface name for the sign-in gate (utils/submitIntent).
const SUBMIT_SURFACE = 'gradient'

export default function GradientGenerator({ onCopy, toast }) {
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
  const dialRef = useRef(null)
  // Handle elements by stop index, so a stop added by pressing the rail can be
  // focused the moment it renders — that is what makes the arrow keys work on it
  // straight away instead of only after the user hunts it down and clicks it.
  const handleEls = useRef(new Map())
  const focusStopRef = useRef(null)

  const css = gradientCss(type, angle, stops)

  // Export code for the copy panel. SVG only applies to linear/radial, so a
  // conic gradient falls back to CSS even if SVG was the last-picked format.
  const effFmt = fmt === 'svg' && type === 'Conic' ? 'css' : fmt
  const exportCode = useMemo(() => {
    if (effFmt === 'tailwind') return tailwindValue(css)
    if (effFmt === 'svg') return gradientSvg(type, angle, stops)
    return `background: ${css};`
  }, [effFmt, css, type, angle, stops])

  // Persist to the shared design so the gradient follows the user across tools.
  // `source` travels with it so the Pro gate on gallery gradients survives a
  // remount/refresh and stays consistent with ColorStudio's gradient editor.
  useEffect(() => {
    setGradient({ stops: stops.map(s => ({ color: s.color, position: s.position })), angle, type, source: fromLibrary ? 'gallery' : 'own' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, angle, type, fromLibrary])

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

  const copyCode = useCallback(async () => {
    try {
      const result = await onCopy?.(exportCode)
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
  }, [exportCode, onCopy, toast])

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
      const signedIn = await requireLogin('submit a gradient to the community library', {
        free: true,
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
    if (e.target.closest?.('.ggn-handle')) return
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || !rect.width) return
    if (e.cancelable) e.preventDefault()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const idx = addStopAt(pct)
    if (idx == null) return
    beginStopDrag(idx)
  }, [addStopAt, beginStopDrag])

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
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [angleActive, guardEdit])

  // Focus a freshly added handle once it exists in the DOM. Keyed on the stop
  // count so it fires exactly on the render that added one.
  useEffect(() => {
    const idx = focusStopRef.current
    if (idx == null) return
    focusStopRef.current = null
    handleEls.current.get(idx)?.focus({ preventScroll: true })
  }, [stops.length])

  const sortedForBar = [...stops.map((s, i) => ({ ...s, i }))].sort((a, b) => a.position - b.position)

  return (
    <div className="ggn">
      {/* Header */}
      <header className="ggn-head">
        <div className="ggn-head-id">
          <span className="ggn-eyebrow">Create / Colour</span>
          <div className="ggn-title-row">
            <h1 className="ggn-title">Gradient Generator</h1>
          </div>
          <p className="ggn-sub">Compose on a direct canvas, refine every stop in the inspector, then hand off production-ready CSS, Tailwind or SVG.</p>
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
          <button
            type="button"
            className="ggn-btn ggn-btn-ghost"
            onClick={openSubmit}
            disabled={authLoading}
            aria-busy={authLoading || undefined}
            title={authLoading
              ? 'Checking your account…'
              : 'Submit this gradient for review for the gradient library'}
          >
            <IcoSubmit size={15} /> Submit for review
          </button>
        </div>
      </header>

      <div className="ggn-status" aria-live="polite">
        <span><strong>{type}</strong> gradient</span>
        <span><strong>{stops.length}</strong> editable stop{stops.length === 1 ? '' : 's'}</span>
        <span><strong>{angleActive ? `${Math.round(angle)}°` : 'Centred'}</strong> direction</span>
        <span><strong>{effFmt.toUpperCase()}</strong> handoff</span>
      </div>

      <div className="ggn-grid" aria-label="Gradient workbench">
        {/* Preview */}
        <section className="ggn-stage" aria-labelledby="ggn-stage-title">
          <div className="ggn-stage-head">
            <div>
              <span className="ggn-step">01 · Canvas</span>
              <h2 id="ggn-stage-title">Shape the gradient</h2>
            </div>
            <span className="ggn-badge">{stops.length}/{MAX_STOPS} stops</span>
          </div>
          <div className="ggn-preview-wrap">
            <div className="ggn-preview" style={{ background: css }}>
              <div className="ggn-preview-pills">
                <span className="ggn-pill">{type}</span>
                {angleActive && <span className="ggn-pill">{Math.round(angle)}°</span>}
              </div>
            </div>
            <div
              className="ggn-bar"
              ref={barRef}
              onPointerDown={railPointerDown}
              title="Press the rail to add a stop, then drag to place it"
              role="group"
              aria-label="Gradient stop rail. Press empty space to add a stop and drag to place it."
            >
              <div className="ggn-bar-track" style={{ background: `linear-gradient(90deg, ${[...stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${Math.round(s.position)}%`).join(', ')})` }} />
              {sortedForBar.map(s => (
                <button
                  key={s.i}
                  type="button"
                  ref={(el) => {
                    if (el) handleEls.current.set(s.i, el)
                    else handleEls.current.delete(s.i)
                  }}
                  className={`ggn-handle${activeStop === s.i ? ' is-active' : ''}${dragIdx === s.i ? ' is-dragging' : ''}${s.locked ? ' is-locked' : ''}`}
                  style={{ left: `${s.position}%`, '--h-color': s.color }}
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
                  {/* Live position, shown while dragging or keyboard-focused, so
                      a fine adjustment is read off the handle rather than guessed. */}
                  <span className="ggn-handle-val" aria-hidden="true">{Math.round(s.position)}%</span>
                </button>
              ))}
            </div>
            <p className="ggn-preview-hint">
              {editLocked
                ? 'Editing gallery gradients is a Pro feature — Reset or Random to start a free, editable gradient.'
                : 'Press the rail to add a stop and drag to place it · drag or arrow a handle to move it · Shift + arrow moves 10%'}
            </p>
          </div>
        </section>

        {/* Control panel. The slot stretches to the canvas column's height and the
            panel is absolutely positioned inside it, so the inspector always matches
            the canvas height and a long export block scrolls in .ggn-panel-body
            instead of stretching the row. Both are unset in the single-column
            breakpoints, where the panel simply flows. */}
        <div className="ggn-panel-slot">
          <aside className="ggn-panel" aria-labelledby="ggn-inspector-title">
            <div className="ggn-panel-head">
              <div>
                <span className="ggn-step">02 · Inspector</span>
                <h2 id="ggn-inspector-title">Refine &amp; export</h2>
              </div>
            </div>
            <div className="ggn-panel-body" tabIndex={0} role="group" aria-label="Inspector controls">
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
                    {angleActive ? (
                      <div className="ggn-angle-num">
                        <input
                          type="number" min="0" max="360" value={Math.round(angle)}
                          onChange={(e) => { const v = e.target.value; if (v === '') return; if (guardEdit()) setAngle(((Math.round(+v) % 360) + 360) % 360) }}
                          disabled={editLocked}
                          className="ggn-angle-input"
                          aria-label="Gradient angle in degrees"
                        />
                        <span className="ggn-angle-deg" aria-hidden="true">°</span>
                      </div>
                    ) : (
                      <div className="ggn-angle-val">n/a for radial</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ggn-field">
                <div className="ggn-label-row">
                  <span className="ggn-label">Code</span>
                  <button type="button" className="ggn-copy" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
                </div>
                <div className="ggn-fmt" role="tablist" aria-label="Export format">
                  {EXPORT_FORMATS.filter(f => f.id !== 'svg' || type !== 'Conic').map(f => (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      aria-selected={effFmt === f.id}
                      className={`ggn-fmt-btn${effFmt === f.id ? ' is-on' : ''}`}
                      onClick={() => setFmt(f.id)}
                    >{f.label}</button>
                  ))}
                </div>
                <button type="button" className={`ggn-css${effFmt === 'svg' ? ' ggn-css--block' : ''}`} onClick={copyCode} title="Click to copy">
                  <code>{exportCode}</code>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Stops */}
      <section className="ggn-block">
        <div className="ggn-block-head">
          <span className="ggn-label">Stops</span>
          <div className="ggn-block-actions">
            <LockBtn on={locks.count} onClick={() => setLocks(l => ({ ...l, count: !l.count }))} label={locks.count ? 'Stop count locked — unlock to randomise it' : 'Lock the number of stops when randomising'} />
            <button
              type="button"
              className="ggn-btn ggn-btn-ghost ggn-btn-sm"
              onClick={addStop}
              disabled={stops.length >= MAX_STOPS}
            >
              {editLocked && <IcoLock size={12} />} + Add Stop
            </button>
            <button type="button" className="ggn-btn ggn-btn-ghost ggn-btn-sm" onClick={flip}>{editLocked && <IcoLock size={12} />} ⇄ Flip</button>
          </div>
        </div>
        <div className="ggn-stops">
          {stops.map((s, i) => (
            <div key={i} className={`ggn-stop${activeStop === i ? ' is-active' : ''}`} onClick={() => setActiveStop(i)}>
              <span className="ggn-stop-idx" aria-hidden="true">{i + 1}</span>
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
              <StopPositionInput
                value={s.position}
                disabled={editLocked}
                label={`Stop ${i + 1} position`}
                onCommit={(position) => updateStop(i, { position })}
              />
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
      <section className="ggn-block ggn-sources">
        <div className="ggn-block-head">
          <div>
            <span className="ggn-step">03 · Starting points</span>
            <h2>Begin with colours you trust</h2>
          </div>
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
            Nothing to import yet — build a palette in the <Link to="/create/palette">Palette Builder</Link> and its colours will appear here as gradient stops.
          </p>
        )}
      </section>

      {/* Presets */}
      <section className="ggn-block ggn-starting">
        <div className="ggn-block-head">
          <div>
            <span className="ggn-label">Curated gradients</span>
            <p>Choose a direction, then make it yours in the canvas.</p>
          </div>
          <Link className="ggn-gal-link" to="/discover/gradients">
            Browse the Gradient Library <span aria-hidden="true">→</span>
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

      {/* Only ever mounted for a signed-in user — see openSubmit above. */}
      {submitOpen && uid && (
        <SubmitGradientModal
          gradient={{ css, name: '' }}
          authorName={userProfile?.displayName || user?.displayName || ''}
          onClose={() => setSubmitOpen(false)}
          onSubmit={submitForReview}
        />
      )}
    </div>
  )
}
