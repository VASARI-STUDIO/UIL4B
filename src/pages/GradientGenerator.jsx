import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import ColorPickerPop from '../components/ColorPickerPop'
import AngleWheel from '../components/tool/AngleWheel'
import StopTintMenu from '../components/tool/StopTintMenu'
import { prefersReducedMotion } from '../components/spectrum/reducedMotion'
import {
  ToolLayout, ToolButton, ToolGrid, ToolMain, ToolPanel, ToolSection, ToolPills, ToolSlider, ToolIcon,
} from '../components/tool/ToolLayout'
import { sampleStopsOklch } from '../components/tool/oklch'
import { GRAD_TYPE_WEIGHTS, STYLE_FAMILIES, rollGradient, pickFromPool } from '../utils/gradientRandom'
import useShiftSelect from '../hooks/useShiftSelect'
import { rangeOf, toggleIn, shiftGroup, removable } from '../utils/stopSelection'
import usePopover from '../hooks/usePopover'
import useMediaQuery from '../hooks/useMediaQuery'
import { hexToRgb, hexToOklch } from '../utils/colors'
import { labelFor, paletteChips, activeShades } from '../utils/paletteRoles'
import { gradientCss, decodeGradientParams } from '../data/gradientGallery'
import { LIBRARY_GRADIENT_ROWS } from '../data/gradientLibrary'
import { galleryTier } from '../utils/lockedPreview'
import { openGradientRows } from '../utils/gradientMoods'
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
// of STOPS / SELECTED STOP / GEOMETRY on the right, with the twelve presets
// under both (6x2, 4x3 or 2x6 by width). Every function the previous build had is
// kept and placed in that layout — see the notes at each block. It reads + writes
// the shared design.gradient (ProjectContext) so a gradient authored here survives
// a jump to any other colour tool. (Class prefix `grd-`.)

const GRAD_TYPES = GRAD_TYPE_WEIGHTS.map(([type]) => type)

// ── Shuffle settings ──
// What Random and Shuffle from palette may make. A group holds the values that
// are allowed; 'Any' means the weights decide. The choice is kept for the
// session only.
const FILTER_KEY = 'vs-gradient-shuffle-filters'
const ANY = 'Any'
const COUNT_OPTIONS = [ANY, 2, 3, 4, 5]
const DEFAULT_FILTERS = { types: [ANY], counts: [ANY], keepAngle: false }
function readFilters() {
  try {
    const f = JSON.parse(sessionStorage.getItem(FILTER_KEY) || 'null')
    const ok = (arr, allowed) => Array.isArray(arr) && arr.length > 0 && arr.every((v) => allowed.includes(v))
    if (f && ok(f.types, [ANY, ...GRAD_TYPES]) && ok(f.counts, COUNT_OPTIONS)) return { ...DEFAULT_FILTERS, ...f, keepAngle: !!f.keepAngle }
  } catch { /* storage blocked or unreadable: the defaults stand */ }
  return DEFAULT_FILTERS
}
// The engine's view of a filter: an empty list means Any.
const engineFilters = (f) => ({
  types: f.types.includes(ANY) ? [] : f.types,
  counts: f.counts.includes(ANY) ? [] : f.counts,
})
// "Linear and radial", "2, 3 and 4": what the live region says after a press.
const sentence = (vals) => {
  const t = vals.map((v) => String(v).toLowerCase())
  return t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} and ${t[t.length - 1]}`
}

// One row of toggle buttons that can hold more than one value. A press picks
// only that value; Shift, Ctrl or Cmd adds or removes it; on a touch screen a
// tap adds or removes. Space and Enter fire the same click, so Shift+Space
// and Shift+Enter add or remove from the keyboard.
function FilterGroup({ label, options, value, onChange, coarse, onAnnounce }) {
  const { select, isOn } = useShiftSelect({ value, onChange, any: options.includes(ANY) ? ANY : null, fallback: options.includes(ANY) ? ANY : options[0], coarse })
  return (
    <div className="grd-shuf-row">
      <span className="grd-shuf-k" id={`grd-shuf-${label}`}>{label}</span>
      <div className="tl-pills" role="group" aria-labelledby={`grd-shuf-${label}`}>
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            className={`tl-pill${isOn(o) ? ' is-on' : ''}`}
            aria-pressed={isOn(o)}
            onClick={(e) => { select(o, e); onAnnounce?.(label) }}
          >{String(o)}</button>
        ))}
      </div>
    </div>
  )
}

// Starter presets: twelve ready-to-use gradients for real interfaces, nine
// linear and three radial. Each carries what it is good for, so the list reads
// as a set of answers rather than a spread of colours. They differ in shape on
// purpose: two- and three-stop ramps, dark-to-light and light-to-dark, a ramp
// that travels a long way round the hue wheel (Aurora), and soft radials whose
// centre is a colour, not a lamp. They are drawn in OKLCH (`space`), so a ramp
// between two hues keeps its lightness and chroma instead of going grey in the
// middle; stops are placed where the hue changes. None repeats a gradient from
// the library. The grid shows exactly these twelve, 6x2, 4x3 or 2x6.
const PRESETS = [
  { n: 'Indigo Night', use: 'App or hero background', type: 'Linear', angle: 160, space: 'oklch', stops: [{ color: '#0A0F2C', position: 0 }, { color: '#27348B', position: 55 }, { color: '#6E6BFF', position: 100 }] },
  { n: 'Rose Quartz', use: 'Soft hero or card wash', type: 'Linear', angle: 135, space: 'oklch', stops: [{ color: '#FFE3EC', position: 0 }, { color: '#F7A8C4', position: 50 }, { color: '#B58CF0', position: 100 }] },
  { n: 'Citrus Glow', use: 'Banner or call to action', type: 'Linear', angle: 120, space: 'oklch', stops: [{ color: '#FFD84D', position: 0 }, { color: '#FF8A3D', position: 55 }, { color: '#F0436A', position: 100 }] },
  { n: 'Deep Water', use: 'Dashboard or header', type: 'Linear', angle: 180, space: 'oklch', stops: [{ color: '#04243A', position: 0 }, { color: '#0B6E8A', position: 55 }, { color: '#3CD6C0', position: 100 }] },
  { n: 'Carbon', use: 'Dark surface or button', type: 'Linear', angle: 145, space: 'oklch', stops: [{ color: '#0F1116', position: 0 }, { color: '#707A8E', position: 100 }] },
  { n: 'Aurora', use: 'Feature band or banner', type: 'Linear', angle: 100, space: 'oklch', stops: [{ color: '#0B1B3A', position: 0 }, { color: '#1FB6A6', position: 55 }, { color: '#C6F36B', position: 100 }] },
  { n: 'Afterglow', use: 'Landing page hero', type: 'Linear', angle: 170, space: 'oklch', stops: [{ color: '#14234F', position: 0 }, { color: '#E0788C', position: 55 }, { color: '#FFD9A0', position: 100 }] },
  { n: 'Sage Paper', use: 'Quiet page background', type: 'Linear', angle: 160, space: 'oklch', stops: [{ color: '#F8F3E6', position: 0 }, { color: '#9FC2A8', position: 100 }] },
  { n: 'Fog Bank', use: 'Header or footer fade', type: 'Linear', angle: 180, space: 'oklch', stops: [{ color: '#F0F3F8', position: 0 }, { color: '#64738E', position: 100 }] },
  { n: 'Lilac Halo', use: 'Spotlight behind a card', type: 'Radial', angle: 90, space: 'oklch', stops: [{ color: '#F4F1FF', position: 0 }, { color: '#C9BEFF', position: 55 }, { color: '#8E7CF0', position: 100 }] },
  { n: 'Rose Ember', use: 'Glow behind a product', type: 'Radial', angle: 90, space: 'oklch', stops: [{ color: '#F4A58C', position: 0 }, { color: '#D4476B', position: 55 }, { color: '#3A1238', position: 100 }] },
  { n: 'Tidepool', use: 'Cool focal background', type: 'Radial', angle: 90, space: 'oklch', stops: [{ color: '#58B2D4', position: 0 }, { color: '#1E5FB8', position: 50 }, { color: '#0A1D4D', position: 100 }] },
]

// A taste of the library for its panel: one chip per mood, each painted with a
// gradient this viewer can open in full, so the strip shows range instead of six
// warm rows. Each chip links to the library filtered to that mood (`?mood=`,
// read by GradientGallery). The swatch is picked in the component from the rows
// the viewer's tier can open (exploreTaste), never from a fixed row, so a row
// the library withholds from them never reaches the page.
const EXPLORE_MOODS = ['warm', 'cool', 'dark', 'light', 'pastel', 'vivid']

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

// The starting look is the first preset: its stops, and this one angle. A first
// visit and Reset both read it (Reset applies PRESETS[0]), so they cannot drift.
const DEFAULT_ANGLE = PRESETS[0].angle
const DEFAULT_STOPS = () => PRESETS[0].stops.map(s => ({ ...s }))
const MAX_STOPS = 12
const MIN_STOPS = 2

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
//
// The control shows plain words and keeps the real space name on demand: the
// pill's accessible name and hover text carry it, and `hint` is the visible
// line under the pills for the chosen option (so touch and keyboard see it
// too). `srgb` is gamma-encoded sRGB, the CSS default — not linear light — so
// it is "Standard", not "Linear".
const SPACES = [
  { value: 'oklch', label: 'Perceived', real: 'OKLCH', hint: 'OKLCH: blends the way the eye sees colour, so steps look even' },
  { value: 'srgb', label: 'Standard', real: 'sRGB', hint: 'sRGB — the CSS default, blends the raw red, green and blue values' },
].map((o) => ({ ...o, ariaLabel: `${o.label} (${o.real})`, title: o.hint }))
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

// Ten starter colours, offered in Available colours while there is no palette to
// draw from. Each has a name so its chip reads as more than a hex.
const STARTER_COLOURS = [
  { hex: '#2F6BFF', name: 'Starter blue' }, { hex: '#1B3FA8', name: 'Starter navy' },
  { hex: '#8B5CF0', name: 'Starter violet' }, { hex: '#E894AC', name: 'Starter pink' },
  { hex: '#E0784E', name: 'Starter orange' }, { hex: '#D9B93C', name: 'Starter gold' },
  { hex: '#3FAFA0', name: 'Starter teal' }, { hex: '#52A069', name: 'Starter green' },
  { hex: '#0B0C0E', name: 'Starter ink' }, { hex: '#F7F7F4', name: 'Starter paper' },
]

// The most items Available colours draws in the palette row (two rows at a fine
// pointer). A palette past it shows one fewer colour and a "+N more" link in the
// last place, so the row never takes more room than thirteen colours do.
const MAX_CHIPS = 13

// A round colour chip that sets the selected stop(s). The chosen state is a ring
// and a tick, so it never rests on colour alone; the tick takes white or
// near-black ink by the chip's own lightness. A colour picked as part of the
// Shuffle pool wears a dashed ring in that same ink. Shift, Ctrl or Cmd+click
// picks or unpicks it without applying it; on touch a press and hold does.
function ColourChip({ hex, label, on, picked, onPick, onTogglePick }) {
  const light = useMemo(() => hexToOklch(hex)[0] >= 60, [hex])
  const hold = useRef({ timer: 0, fired: false })
  useEffect(() => () => clearTimeout(hold.current.timer), [])
  const name = `${label}, ${hex}${picked ? ', picked for shuffle' : ''}`
  return (
    <button
      type="button"
      className={`grd-chip${on ? ' is-on' : ''}${picked ? ' is-picked' : ''}${light ? ' is-light' : ''}`}
      style={{ background: hex }}
      aria-pressed={on}
      aria-label={name}
      title={name}
      onPointerDown={(e) => {
        hold.current.fired = false
        if (e.pointerType !== 'touch') return
        hold.current.timer = setTimeout(() => { hold.current.fired = true; onTogglePick(hex, label) }, 450)
      }}
      onPointerUp={() => clearTimeout(hold.current.timer)}
      onPointerCancel={() => clearTimeout(hold.current.timer)}
      onPointerLeave={() => clearTimeout(hold.current.timer)}
      onContextMenu={(e) => { if (e.pointerType === 'touch' || hold.current.fired) e.preventDefault() }}
      onClick={(e) => {
        if (hold.current.fired) { hold.current.fired = false; return }
        if (e.shiftKey || e.ctrlKey || e.metaKey) onTogglePick(hex, label)
        else onPick(hex, label)
      }}
    >
      {on && <ToolIcon name="check" size={12} />}
    </button>
  )
}

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

// Why Shuffle from palette is inert: its title, its accessible description and
// the toast a press raises all say this.
const SHUFFLE_PALETTE_NEEDS = 'Needs a palette with two or more colours'

// Small lock toggle — pins a setting so it survives a randomise. `on` = locked;
// the glyph flips its shackle to say so. Drawn at the size of the design's
// row-end icon buttons (the stop row's remove ×, 26px) so it sits in a row
// without adding a new control shape.
// `unavailable` keeps the button focusable (aria-disabled, not disabled) and
// inert, so its reason can be read through `describedBy` rather than lost.
const LockBtn = ({ on, onClick, label, className = '', unavailable = false, describedBy, onUnavailable }) => (
  <button
    type="button"
    className={`grd-iconbtn grd-lock${on ? ' is-on' : ''}${className ? ' ' + className : ''}`}
    onClick={unavailable ? onUnavailable : onClick}
    aria-pressed={on}
    aria-disabled={unavailable || undefined}
    aria-describedby={describedBy}
    aria-label={label}
    title={label}
  >
    <ToolIcon name={on ? 'lock-simple' : 'lock-simple-open'} size={13} />
  </button>
)

// The Shuffle settings popover: a popover from 768px, a bottom sheet below
// (the CSS moves it). Style only lists families that are built; with none, the
// row would offer nothing to choose, so it is left out.
function ShuffleSettings({ open, onOpen, onClose, filters, setFilters }) {
  const { triggerRef, popRef, closeToTrigger } = usePopover(open, onClose)
  const coarse = useMediaQuery('(pointer: coarse)')
  const summary = `Random makes ${sentence(filters.types.filter((t) => t !== ANY).length ? filters.types : ['any type'])}, ${sentence(filters.counts.filter((c) => c !== ANY).length ? filters.counts.map((c) => `${c} stops`) : ['any number of stops'])}`
  return (
    <span className="grd-shuf-wrap">
      <ToolButton
        ref={triggerRef}
        variant="square"
        icon="sliders-horizontal"
        aria-label="Shuffle settings"
        title="Shuffle settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
      />
      {open && (
        <div ref={popRef} className="tl-pop grd-shuf" role="dialog" aria-label="Shuffle settings" tabIndex={-1}>
          <div className="grd-shuf-head">
            <span className="grd-shuf-title">Random makes</span>
            <button type="button" className="grd-iconbtn grd-shuf-x" onClick={closeToTrigger} aria-label="Close"><ToolIcon name="x" size={14} /></button>
          </div>
          {/* STYLE_FAMILIES is empty until a family is built. The Style row,
              a FilterGroup over [Plain, ...STYLE_FAMILIES] whose empty
              selection falls back to Plain, goes here. */}
          <FilterGroup label="Type" options={[ANY, ...GRAD_TYPES]} value={filters.types} coarse={coarse} onChange={(types) => setFilters((f) => ({ ...f, types }))} />
          <FilterGroup label="Stops" options={COUNT_OPTIONS} value={filters.counts} coarse={coarse} onChange={(counts) => setFilters((f) => ({ ...f, counts }))} />
          <button
            type="button"
            className={`grd-shuf-keep${filters.keepAngle ? ' is-on' : ''}`}
            aria-pressed={filters.keepAngle}
            onClick={() => setFilters((f) => ({ ...f, keepAngle: !f.keepAngle }))}
          >
            <ToolIcon name={filters.keepAngle ? 'lock-simple' : 'lock-simple-open'} size={13} />
            <span>Keep the angle</span>
          </button>
          <p className="grd-shuf-hint">{coarse ? 'Tap to add or remove.' : 'Shift-click to pick more than one.'}</p>
          <div className="sr-only" role="status">{summary}</div>
        </div>
      )}
    </span>
  )
}

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
  // The Explore chips this viewer can open: a mood only shows if the library
  // would list at least one gradient for it at their tier. Auth still resolving
  // reads as signed out, as it does in the gallery.
  const exploreTier = galleryTier({ isPro, signedIn: user != null })
  const exploreTaste = useMemo(() => {
    // Pro opens the whole library, but only the free-open rows ship in full (the
    // rest are stubs with no stops), so Pro's swatches come from those.
    const open = openGradientRows(LIBRARY_GRADIENT_ROWS, exploreTier === 'pro' ? 'free' : exploreTier)
      .filter((g) => Array.isArray(g.stops) && Array.isArray(g.tags))
    // The first open row carrying the mood, preferring one no earlier chip took,
    // so moods that share a row (warm and vivid) do not paint the same swatch.
    const used = new Set()
    const taste = []
    for (const mood of EXPLORE_MOODS) {
      const carrying = open.filter((g) => g.tags.includes(mood))
      const row = carrying.find((g) => !used.has(g.id)) || carrying[0]
      if (!row) continue
      used.add(row.id)
      taste.push({ ...row, mood })
    }
    return taste
  }, [exploreTier])

  // A palette handed over from the Palette Builder's Gradient button. Read (not
  // consumed) during render, so a render React discards can't lose it; the mount
  // effect below empties the slot exactly once. A reload or a direct visit reads
  // nothing and the tool seeds from the saved gradient as usual.
  const carriedPalette = readGradientDraft()

  // Seed from the saved gradient. The untouched default has two null-coloured
  // stops, which count as nothing saved: that case seeds the first preset, so a
  // first-time visitor lands on a finished look. Once any stop has a colour, the
  // saved stops are used and a stop still null falls back to the matching colour
  // of the live palette.
  const [type, setType] = useState(() => design?.gradient?.type || PRESETS[0].type)
  // The design's untouched default carries a placeholder 135deg with no colours,
  // so it does not count as a saved angle. A gradient with real stops keeps its
  // saved angle, and so does a palette carried over from the Palette Builder
  // (its stops are rebuilt, the saved angle stays). Otherwise the default angle
  // is used, so a first visit and Reset draw the same thing.
  const [angle, setAngle] = useState(() => {
    const saved = design?.gradient
    const hasOwn = !!carriedPalette || saved?.stops?.some?.((s) => s?.color)
    return hasOwn ? (saved?.angle ?? DEFAULT_ANGLE) : DEFAULT_ANGLE
  })
  const [stops, setStops] = useState(() => {
    if (carriedPalette) return stopsFromColors(carriedPalette.colors)
    const saved = design?.gradient?.stops
    if (Array.isArray(saved) && saved.some(s => s.color)) {
      return saved.map((s, i) => ({ color: s.color || design?.palette?.colors?.[i] || '#2563EB', position: s.position }))
    }
    return DEFAULT_STOPS()
  })
  const [activeStop, setActiveStop] = useState(0)
  // Stops selected together (indices). Fewer than two is not a multi-selection:
  // the active stop alone is. `selMode` is the touch way in, where a long press
  // starts selecting and every tap after it adds or removes a stop.
  const [picked, setPicked] = useState([])
  const [selMode, setSelMode] = useState(false)
  const anchorRef = useRef(0)
  const coarse = useMediaQuery('(pointer: coarse)')
  const multi = picked.length >= 2
  // The stops a colour, lock or delete acts on: the selection, or the active stop.
  const targets = useMemo(() => (multi ? picked : [activeStop]), [multi, picked, activeStop])
  // A control on row `i` acts on the whole selection when `i` is part of it.
  const targetsFor = (i) => (multi && picked.includes(i) ? picked : [i])
  // The live region is emptied and refilled a tick later, so saying the same
  // thing twice (pressing the same chip again after the colour was changed
  // elsewhere) announces twice; an unchanged string would not.
  const [pickNote, setPickNote] = useState('')
  const pickNoteTimer = useRef(0)
  useEffect(() => () => clearTimeout(pickNoteTimer.current), [])
  const say = useCallback((text) => {
    setPickNote('')
    clearTimeout(pickNoteTimer.current)
    pickNoteTimer.current = setTimeout(() => setPickNote(text), 60)
  }, [])
  // One stop, and nothing else, becomes the selection (and the anchor a later
  // Shift+click ranges from).
  const selectOnly = useCallback((i) => {
    setActiveStop(i)
    setPicked([])
    setSelMode(false)
    anchorRef.current = i
  }, [])
  const clearSelection = useCallback((announce = true) => {
    setPicked([])
    setSelMode(false)
    if (announce) say('Selection cleared')
  }, [say])
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

  // Shuffle settings replace the type, angle and stop-count locks: picking one
  // type is the same as locking it. Per-stop colour+position locks stay on the
  // stop objects (`.locked`).
  const [filters, setFilters] = useState(readFilters)
  useEffect(() => {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters)) } catch { /* private mode */ }
  }, [filters])
  const [shuffleOpen, setShuffleOpen] = useState(false)

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
  const focusRemovedRowRef = useRef(false)

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
      selectOnly(0)
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
      subtitle: 'Every gradient in the gallery is free to preview and copy. Reshaping one — adding stops, recolouring, changing the type or angle — is a Pro tool. Prefer to stay free? Press Reset, Random or Shuffle from palette to start an editable gradient of your own.',
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
    if (p.space) setSpace(p.space)
    selectOnly(0)
    setFromLibrary(false)
  }, [selectOnly])

  const updateStop = useCallback((idx, patch) => {
    if (!guardEdit()) return
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }, [guardEdit])

  // The same patch on several stops at once (the selection).
  const updateStops = useCallback((idxs, patch) => {
    if (!guardEdit()) return
    setStops(prev => prev.map((s, i) => idxs.includes(i) ? { ...s, ...patch } : s))
  }, [guardEdit])

  // Move the selection together; it stops as a group at 0 and 100.
  const moveStops = useCallback((idxs, delta) => {
    if (!guardEdit()) return
    setStops(prev => shiftGroup(prev, idxs, delta))
  }, [guardEdit])

  // Toggling a stop's randomise-lock isn't reshaping the gradient — it's a
  // shuffle control, exactly like the ungated type / angle / count locks — so it
  // bypasses guardEdit and stays available on a gallery gradient. On a selected
  // row it flips every selected stop to the opposite of that row.
  const toggleStopLock = useCallback((idx) => {
    const idxs = targetsFor(idx)
    const to = !stops[idx]?.locked
    setStops(prev => prev.map((s, i) => idxs.includes(i) ? { ...s, locked: to } : s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, picked])

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
    selectOnly(idx)
    focusStopRef.current = idx
    return idx
  }, [stops.length, guardEdit, toast, selectOnly])

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

  // The selection follows the rows: removing a row above the active one moves
  // it up with them, and removing the active one hands it to the row that slides
  // into its place (or the new last row), so the list does not jump back to row 1.
  // `keepFocus` is set when the keyboard pressed the row's ×: the rows are keyed
  // by index, so the pressed button can unmount, and focus is handed on below.
  // A selection goes together, but never below two stops: it removes as many as
  // it can and says why the rest stayed.
  const removeStops = useCallback((idxs, keepFocus = false) => {
    if (!guardEdit()) return
    const { remove, blocked } = removable(stops.length, idxs, MIN_STOPS)
    if (!remove.length) {
      toast?.('A gradient needs at least two stops')
      say('A gradient needs at least two stops.')
      return
    }
    if (keepFocus) focusRemovedRowRef.current = true
    setStops(prev => prev.length - remove.length >= MIN_STOPS ? prev.filter((_, i) => !remove.includes(i)) : prev)
    setActiveStop(a => {
      const shift = remove.filter((r) => r < a).length
      return remove.includes(a) ? Math.min(a - shift, stops.length - remove.length - 1) : a - shift
    })
    setPicked([])
    setSelMode(false)
    if (blocked) say('A gradient needs at least two stops.')
    else if (remove.length > 1) say(`${remove.length} stops removed`)
  }, [guardEdit, stops.length, toast, say])

  const flip = useCallback(() => {
    if (!guardEdit()) return
    setStops(prev => prev.map(s => ({ ...s, position: 100 - s.position })))
  }, [guardEdit])

  // The tints menu for a stop: opened by right-click on a stop (its row or its
  // handle), the menu key, or the Tints button. Applying a tint is a Pro tool; a
  // free account sees the ramp locked and the Pro modal on a press.
  const [tintMenu, setTintMenu] = useState(null)
  const closeTintMenu = useCallback(() => setTintMenu(null), [])
  const openTintMenu = useCallback((e, idx, returnTo, fromButton = false) => {
    e.preventDefault()
    const box = e.currentTarget.getBoundingClientRect()
    // The Tints button, the menu key and Shift+F10 have no pointer position:
    // hang the menu off the control and land focus on its first row.
    const fromKeys = fromButton || (!e.clientX && !e.clientY)
    selectOnly(idx)
    setTintMenu({
      idx,
      x: fromKeys ? box.left : e.clientX,
      y: fromKeys ? box.bottom + 4 : e.clientY,
      focusFirst: fromKeys,
      fromButton,
      // Keyboard and button opens hang off the control, which the menu must not cover.
      anchor: fromKeys ? e.currentTarget : null,
      returnTo: returnTo || e.currentTarget,
    })
  }, [selectOnly])
  const applyTint = useCallback((hex, label) => {
    if (!tintMenu) return
    updateStop(tintMenu.idx, { color: hex })
    toast?.(`Tint ${label} applied to stop ${tintMenu.idx + 1}`)
  }, [tintMenu, updateStop, toast])
  const gateTints = useCallback(() => {
    openProModal({
      gate: 'gradient-stop-tints',
      eyebrow: 'Pro gradient tools',
      title: 'Tint any stop',
      subtitle: 'Open the tints of a stop and put one on it in a single press. Free accounts can see the ramp; applying a tint is a Pro tool.',
      features: [
        'Eleven tints of any stop colour, light to dark',
        'Put one on the stop in a single press',
        'Open the ramp from the Tints button or a right-click on a stop',
      ],
    })
  }, [openProModal])

  // Build a fresh set of stops that honours the current locks: a locked count
  // keeps the same number, and any stop marked `.locked` keeps its colour +
  // position while the rest are re-rolled. `sample(i)` supplies the colour for
  // an unlocked slot (random hex, or a palette pick) so both randomisers share
  // this logic.
  const rollStops = useCallback((sample, count) => {
    // A locked stop must always survive, even when the rolled count is smaller
    // than its index — so if ANY stop is locked we keep the current length
    // rather than shrinking to the rolled count and dropping locked stops.
    const hasStopLock = stops.some(s => s.locked)
    const n = hasStopLock ? stops.length : count
    return Array.from({ length: n }, (_, i) => {
      const ex = stops[i]
      if (ex?.locked) return { color: ex.color, position: ex.position, locked: true }
      return {
        color: sample(i),
        position: Math.round((i / (n - 1)) * 100),
        locked: false,
      }
    })
  }, [stops])

  // Random: colours are chosen in OKLCH under the quality rules in
  // utils/gradientRandom, so the ends are related and the middle is never grey.
  const randomise = useCallback(() => {
    const g = rollGradient(Math.random, engineFilters(filters))
    setStops(rollStops((i) => g.stops[i % g.stops.length].color, g.stops.length))
    setType(g.type)
    if (!filters.keepAngle) setAngle(g.angle)
    selectOnly(0)
    setFromLibrary(false)
  }, [rollStops, filters, selectOnly])

  // ── Available colours ──
  // The palette's colours (de-duplicated without regard to case, in palette
  // order), each with the role it holds, and the active colour's shades when the
  // project's ramp is current. The palette cannot change while this page is
  // open, so both are settled by the first paint and the section's height does
  // not move during a session.
  const roleDesign = useMemo(() => ({ palette: design?.palette, tints: design?.tints }), [design?.palette, design?.tints])
  const chips = useMemo(() => paletteChips(roleDesign), [roleDesign])
  const shades = useMemo(() => activeShades(roleDesign), [roleDesign])
  // The rest of a long palette is one link away in Palette Builder.
  const shownChips = chips.length > MAX_CHIPS ? chips.slice(0, MAX_CHIPS - 1) : chips
  const hiddenChips = chips.length - shownChips.length

  // Valid hex colours in the live Palette Builder palette — feeds the
  // "From palette" button (needs 2+ to build a gradient).
  const paletteHexes = useMemo(() => chips.map((c) => c.hex), [chips])
  // Colours picked (Shift-click) as the Shuffle pool. They only count while they
  // are still on offer, and from two up: one pick is just a mark.
  const [chipPicks, setChipPicks] = useState([])
  const offered = useMemo(() => new Set([
    ...(chips.length ? chips : STARTER_COLOURS).map((c) => c.hex.toUpperCase()),
    ...(shades ? shades.items.map((c) => c.hex.toUpperCase()) : []),
  ]), [chips, shades])
  const livePicks = useMemo(() => chipPicks.filter((h) => offered.has(h)), [chipPicks, offered])
  const usingPicks = livePicks.length >= 2
  const pool = usingPicks ? livePicks : paletteHexes
  const togglePick = useCallback((hex) => {
    const h = hex.toUpperCase()
    const next = livePicks.includes(h) ? livePicks.filter((x) => x !== h) : [...livePicks, h]
    setChipPicks(next)
    say(next.length >= 2 ? `Shuffle from ${next.length} picked colours` : next.length === 1 ? '1 colour picked. Pick another to shuffle from picks.' : 'Picks cleared')
  }, [livePicks, say])
  const clearPicks = useCallback(() => { setChipPicks([]); say('Picks cleared') }, [say])
  const canRandomFromPalette = pool.length >= 2
  const shuffleHint = usingPicks ? `Shuffle from ${livePicks.length} picked colours` : SHUFFLE_PALETTE_NEEDS
  // Pressing Shuffle from palette with nothing to draw from says why in a toast
  // and takes the person to the Available colours note, which holds the way to
  // make a palette. The count is how many times it was pressed, so a second
  // press brings the note back into view.
  const [paletteMissing, setPaletteMissing] = useState(0)
  const paletteNoteRef = useRef(null)
  // Once the palette can make a gradient the count goes back to zero, so a
  // later drop below two colours does not pull focus on its own.
  useEffect(() => {
    if (canRandomFromPalette) setPaletteMissing(0)
  }, [canRandomFromPalette])
  // Like Random, but samples the user's OWN palette instead of random hex, so
  // the result always sits inside their brand colours. Fisher–Yates shuffle →
  // take 2–3 → spread evenly → random type/angle. Falls back to fully-random
  // if the palette can't make a gradient (guarded by canRandomFromPalette).
  const randomiseFromPalette = useCallback(() => {
    if (pool.length < 2) { randomise(); return }
    // The type, count and angle come from the same roll as Random; only the
    // colours differ. A two-colour pick has to differ in lightness or hue, and
    // the pool cycles if there are more stops than colours.
    const g = rollGradient(Math.random, engineFilters(filters))
    const picks = pickFromPool(pool, g.stops.length, Math.random)
    setStops(rollStops((i) => picks[i % picks.length], g.stops.length))
    setType(g.type)
    if (!filters.keepAngle) setAngle(g.angle)
    selectOnly(0)
    setFromLibrary(false)
    toast?.(usingPicks ? `Random gradient from ${pool.length} picked colours` : 'Random gradient from your palette')
  }, [pool, usingPicks, randomise, rollStops, filters, toast, selectOnly])

  const fromPalette = useCallback(() => {
    if (!canRandomFromPalette) {
      setPaletteMissing((n) => n + 1)
      toast?.(SHUFFLE_PALETTE_NEEDS)
      return
    }
    setPaletteMissing(0)
    randomiseFromPalette()
  }, [canRandomFromPalette, randomiseFromPalette, toast])

  // The note is in the panel, which the sticky toolbar can leave off screen on a
  // phone scrolled down: bring it into view and move focus to it. Focus goes
  // first with preventScroll so the one scroll is the animated one.
  useEffect(() => {
    if (!paletteMissing) return
    const note = paletteNoteRef.current
    if (!note) return
    note.focus({ preventScroll: true })
    note.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [paletteMissing])

  // A chip sets the colour of every selected stop, or of the active one.
  const pickColour = useCallback((hex, name) => {
    if (!guardEdit()) return
    setStops((prev) => prev.map((s, i) => (targets.includes(i) ? { ...s, color: hex } : s)))
    say(targets.length > 1 ? `${targets.length} stops set to ${name}` : `Stop ${targets[0] + 1} set to ${name}`)
  }, [guardEdit, targets, say])

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
    selectOnly(idx)
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
  }, [updateStop, selectOnly])

  // A press on a stop (its row, or its handle on the rail) with the modifier
  // keys a pointer has, or the long-press mode a finger has. A plain press
  // selects only that stop; Shift selects the run from the anchor along the
  // rail; Ctrl/Cmd, or any press in touch selection mode, adds or removes one.
  // Selecting is not an edit, so it never meets guardEdit.
  const pressStop = useCallback((i, e) => {
    if (e?.shiftKey && !coarse) {
      const run = rangeOf(stops, anchorRef.current, i)
      setActiveStop(i)
      setPicked(run.length >= 2 ? run : [])
      if (run.length >= 2) say(`${run.length} stops selected`)
      return
    }
    if (e?.ctrlKey || e?.metaKey || (coarse && selMode)) {
      const next = toggleIn(multi ? picked : [activeStop], i)
      if (!next.length) return
      anchorRef.current = i
      setActiveStop(next.includes(i) ? i : next[next.length - 1])
      setPicked(next.length >= 2 ? next : [])
      say(next.length >= 2 ? `${next.length} stops selected` : '1 stop selected')
      return
    }
    selectOnly(i)
  }, [coarse, selMode, multi, picked, activeStop, stops, say, selectOnly])

  // Touch: press and hold a row for 450ms to start selecting. The click that
  // ends the hold is swallowed, and the long-press menu is kept off (the Tints
  // button is how a finger opens that).
  const holdRef = useRef({ timer: 0, fired: false })
  const holdStart = useCallback((i, e) => {
    holdRef.current.fired = false
    if (e.pointerType !== 'touch') return
    clearTimeout(holdRef.current.timer)
    holdRef.current.timer = setTimeout(() => {
      holdRef.current.fired = true
      setSelMode(true)
      setActiveStop(i)
      setPicked([])
      anchorRef.current = i
      say('Selecting stops. Tap a stop to add or remove it.')
    }, 450)
  }, [say])
  const holdEnd = useCallback(() => clearTimeout(holdRef.current.timer), [])
  useEffect(() => holdEnd, [holdEnd])
  // The row's click: the end of a long press selects nothing more.
  const clickStop = useCallback((i, e) => {
    if (holdRef.current.fired) { holdRef.current.fired = false; return }
    pressStop(i, e)
  }, [pressStop])

  const dragStop = useCallback((e, idx) => {
    if (e.button != null && e.button > 0) return // a right-click opens the tints menu, not a drag
    e.preventDefault()
    e.stopPropagation()
    // Modifier presses and touch selection mode select instead of dragging.
    if (e.shiftKey || e.ctrlKey || e.metaKey || (coarse && selMode)) { pressStop(idx, e); return }
    if (!guardEdit()) return
    beginStopDrag(idx)
  }, [beginStopDrag, guardEdit, pressStop, coarse, selMode])

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

  // The stop list is a fixed window that scrolls inside itself, so the panel
  // (and the page) is the same height at 2 stops and at 12. `stopScroll` says
  // which edges have more rows past them (the CSS fades and rules that edge) and
  // `first`, the top visible row, for the "1–3 of 12" count in the header.
  const stopListRef = useRef(null)
  // After a keyboard remove, focus lands on the active row's ×, or on its label
  // button when the × has just gone inert at two stops. A pointer remove leaves
  // focus alone.
  useEffect(() => {
    if (!focusRemovedRowRef.current) return
    focusRemovedRowRef.current = false
    const row = stopListRef.current?.querySelector('.grd-stop.is-on')
    const x = row?.querySelector('.grd-stop-x')
    const target = x && x.getAttribute('aria-disabled') !== 'true' ? x : row?.querySelector('.grd-stop-select')
    target?.focus()
  }, [stops.length])
  const [stopScroll, setStopScroll] = useState({ above: false, below: false, first: 1 })
  const syncStopScroll = useCallback(() => {
    const el = stopListRef.current
    if (!el) return
    const above = el.scrollTop > 0
    const below = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    const rows = el.children
    const pitch = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 0
    const first = pitch > 0 ? Math.max(1, Math.min(rows.length - 2, Math.round(el.scrollTop / pitch) + 1)) : 1
    setStopScroll((prev) => (prev.above === above && prev.below === below && prev.first === first ? prev : { above, below, first }))
  }, [])
  useLayoutEffect(() => { syncStopScroll() }, [stops.length, syncStopScroll])
  // The window changes height when the pointer type does (56px rows on touch),
  // and on a resize that re-lays the panel: measure again rather than trust the
  // last scroll event.
  useEffect(() => {
    const el = stopListRef.current
    if (!el) return undefined
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => syncStopScroll()) : null
    ro?.observe(el)
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null
    mq?.addEventListener?.('change', syncStopScroll)
    return () => {
      ro?.disconnect()
      mq?.removeEventListener?.('change', syncStopScroll)
    }
  }, [syncStopScroll])
  // Bring the active stop's row into the window (a stop just added, or one picked
  // on the rail) by scrolling the window alone: scrollIntoView would also move
  // the page. Instant under reduced motion.
  useEffect(() => {
    const win = stopListRef.current
    const row = win?.children[activeStop]
    if (!row) return
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    let next = win.scrollTop
    if (top < next) next = top
    else if (bottom > next + win.clientHeight) next = bottom - win.clientHeight
    if (next !== win.scrollTop) win.scrollTo({ top: next, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [activeStop, stops.length])

  const sortedForBar = [...stops.map((s, i) => ({ ...s, i }))].sort((a, b) => a.position - b.position)
  const selected = stops[activeStop] || stops[0]
  const selectedHex = selected?.color?.toUpperCase()
  // The rail reads the stops left to right, so it is always a 90deg ramp in the
  // chosen space whatever the gradient's type — the design paints the gradient
  // itself there, which for a radial or conic would put no stop where its
  // handle sits.
  const railCss = gradientCssIn('Linear', 90, stops, supportsOklchGradients ? space : 'srgb')
  const presetOn = (p) => p.type === type
    && p.stops.length === stops.length
    && [...p.stops].sort((a, b) => a.position - b.position)
      .every((s, i) => s.color.toUpperCase() === sortedForBar[i].color.toUpperCase() && Math.round(s.position) === Math.round(sortedForBar[i].position))
  // One tile. The user's own palettes and the twelve starters share it but sit in
  // separate grids, so the starter grid always holds exactly its twelve.
  const renderPreset = (p, key) => {
    const on = presetOn(p)
    return (
      <button
        key={key}
        type="button"
        className={`grd-preset${p.mine ? ' grd-preset--mine' : ''}${on ? ' is-on' : ''}`}
        aria-pressed={on}
        onClick={() => applyPreset(p)}
        title={p.mine ? `Gradient from ${p.n}` : undefined}
      >
        <span className="grd-preset-swatch" style={{ background: gradientCssIn(p.type, p.angle, p.stops, supportsOklchGradients ? p.space : 'srgb') }} aria-hidden="true" />
        <span className="grd-preset-row">
          <span className="grd-preset-name">{p.n}</span>
          <span className="grd-preset-meta">{p.mine ? `${p.stops.length} stops` : p.type}</span>
        </span>
        <span className="grd-preset-use">{p.mine ? 'From your palettes' : p.use}</span>
      </button>
    )
  }
  const fmtLabel = EXPORT_FORMATS.find((f) => f.id === effFmt)?.label || 'CSS'

  // Keys inside the stop list. Escape clears the selection; Ctrl/Cmd+A selects
  // every stop; Shift+Up/Down on a row moves to the next row and extends the
  // run to it; Delete/Backspace removes a selection.
  const onStopListKey = (e) => {
    // The colour picker's popover is a portal, and React events bubble out of it.
    if (!stopListRef.current?.contains(e.target)) return
    const row = e.target.closest?.('.grd-stop-select')
    if (e.key === 'Escape' && (multi || selMode)) {
      e.preventDefault()
      clearSelection()
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
      e.preventDefault()
      if (stops.length < 2) return
      setPicked(stops.map((_, i) => i))
      say(`All ${stops.length} stops selected`)
    } else if (row && e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const from = Number(row.dataset.stop)
      const to = Math.max(0, Math.min(stops.length - 1, from + (e.key === 'ArrowDown' ? 1 : -1)))
      if (to === from) return
      if (!multi) anchorRef.current = from
      const run = rangeOf(stops, anchorRef.current, to)
      setActiveStop(to)
      setPicked(run.length >= 2 ? run : [])
      say(run.length >= 2 ? `${run.length} stops selected` : '1 stop selected')
      stopListRef.current?.querySelector(`.grd-stop-select[data-stop="${to}"]`)?.focus()
    } else if (row && multi && picked.includes(Number(row.dataset.stop)) && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      removeStops(picked, true)
    }
  }

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
          id: 'shuffle-settings', priority: 3, menu: false,
          render: () => (
            <ShuffleSettings
              open={shuffleOpen}
              onOpen={() => setShuffleOpen(true)}
              onClose={() => setShuffleOpen(false)}
              filters={filters}
              setFilters={setFilters}
            />
          ),
        },
        {
          id: 'from-palette', priority: 1,
          render: () => (
            <ToolButton
              icon="swatches"
              onClick={fromPalette}
              aria-disabled={!canRandomFromPalette || undefined}
              aria-describedby={canRandomFromPalette && !usingPicks ? undefined : 'grd-shuffle-palette-hint'}
              title={canRandomFromPalette && !usingPicks ? 'Build a random gradient from your current palette' : shuffleHint}
            >
              Shuffle from palette
            </ToolButton>
          ),
          menu: {
            label: 'Shuffle from palette', icon: 'swatches', ariaDisabled: !canRandomFromPalette,
            describedBy: canRandomFromPalette && !usingPicks ? undefined : 'grd-shuffle-palette-hint',
            title: canRandomFromPalette && !usingPicks ? 'Build a random gradient from your current palette' : shuffleHint,
            onSelect: fromPalette,
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
          {/* The stage is the canvas's fixed slot. */}
          <div className="grd-stage">
            <div className="grd-canvas" style={{ background: paintCss }} role="img" aria-label={`${type} gradient preview`} />
          </div>
          {(!canRandomFromPalette || usingPicks) && <span id="grd-shuffle-palette-hint" className="sr-only">{shuffleHint}</span>}

          {/* The stop rail. Press empty rail to drop a stop where you press and
              keep dragging to place it; drag or arrow a handle to move it
              (Shift + arrow moves 10%, Home/End jump, Delete removes). */}
          <div className="grd-rail-wrap">
            <div
              className="grd-rail"
              ref={barRef}
              onPointerDown={railPointerDown}
              onKeyDown={(e) => { if (e.key === 'Escape' && (multi || selMode)) { e.preventDefault(); clearSelection() } }}
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
                  className={`grd-handle${activeStop === s.i ? ' is-active' : ''}${multi && picked.includes(s.i) ? ' is-sel' : ''}${dragIdx === s.i ? ' is-dragging' : ''}${s.locked ? ' is-locked' : ''}`}
                  style={{ left: `${s.position}%`, '--grd-stop': s.color }}
                  onPointerDown={(e) => dragStop(e, s.i)}
                  onContextMenu={(e) => openTintMenu(e, s.i)}
                  onFocus={() => (picked.includes(s.i) ? setActiveStop(s.i) : selectOnly(s.i))}
                  onKeyDown={(e) => {
                    // On a selected handle the arrows, Home and End move the
                    // whole selection by the same amount.
                    const group = multi && picked.includes(s.i)
                    const by = (d) => (group ? moveStops(picked, d) : updateStop(s.i, { position: Math.max(0, Math.min(100, Math.round(s.position) + d)) }))
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                      e.preventDefault()
                      by(e.shiftKey ? 10 : 1)
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      by(e.shiftKey ? -10 : -1)
                    } else if (e.key === 'Home') {
                      e.preventDefault()
                      by(-100)
                    } else if (e.key === 'End') {
                      e.preventDefault()
                      by(100)
                    } else if ((e.key === 'Delete' || e.key === 'Backspace') && stops.length > 2) {
                      e.preventDefault()
                      removeStops(targetsFor(s.i))
                    }
                  }}
                  aria-pressed={multi ? picked.includes(s.i) : undefined}
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
            <pre className={`grd-code-text${effFmt === 'svg' ? ' grd-code-text--block' : ''}${effFmt === 'css' ? ' grd-code-text--wrap' : ''}`} tabIndex={0} aria-label={`${fmtLabel} code`}><code>{exportCode}</code></pre>
          </div>
        </ToolMain>

        <ToolPanel label="Gradient controls" className="grd-panel">
          {/* AVAILABLE COLOURS. Every colour in the palette, one press from the
              selected stop, then its shades when the project's ramp is current.
              With no palette the ten starter colours stand in. */}
          <ToolSection
            label="Available colours"
            labelId="grd-avail-label"
            className="grd-avail"
            aside={chipPicks.length > 0 ? <button type="button" className="grd-sel-clear" onClick={clearPicks}>Clear picks</button> : undefined}
          >
            <span id="grd-picks-hint" className="sr-only">Shift-click colours to pick them for Shuffle from palette. On a touch screen, press and hold.</span>
            <div className="sr-only" role="status">{pickNote}</div>
            {chips.length === 0 && (
              <div className="grd-avail-help">
                <p className="grd-avail-note" ref={paletteNoteRef} tabIndex={-1}>No palette yet. Colours you build in Palette Builder show up here.</p>
                <Link to="/create/palette" className="grd-avail-link">Open Palette Builder</Link>
              </div>
            )}
            {chips.length === 0 ? (
              <>
                <span className="grd-avail-sub" id="grd-starter-label">Starter colours</span>
                <div className="grd-chips grd-chips--starter" role="group" aria-labelledby="grd-starter-label" aria-describedby="grd-picks-hint">
                  {STARTER_COLOURS.map((c) => (
                    <ColourChip key={c.hex} hex={c.hex} label={c.name} on={selectedHex === c.hex} picked={livePicks.includes(c.hex.toUpperCase())} onPick={pickColour} onTogglePick={togglePick} />
                  ))}
                </div>
              </>
            ) : (
              <div className="grd-chips" role="group" aria-label="Palette colours" aria-describedby="grd-picks-hint">
                {shownChips.map((c) => (
                  <ColourChip key={c.hex} hex={c.hex} label={c.label} on={selectedHex === c.hex} picked={livePicks.includes(c.hex.toUpperCase())} onPick={pickColour} onTogglePick={togglePick} />
                ))}
                {hiddenChips > 0 && (
                  <Link to="/create/palette" className="grd-chips-more">
                    +{hiddenChips} more<span className="sr-only">{hiddenChips === 1 ? ' colour' : ' colours'} in Palette Builder</span>
                  </Link>
                )}
              </div>
            )}
            {chips.length === 1 && (
              <div className="grd-avail-help">
                <p className="grd-avail-note" ref={paletteNoteRef} tabIndex={-1}>Add a second colour in Palette Builder to shuffle from it.</p>
                <Link to="/create/palette" className="grd-avail-link">Open Palette Builder</Link>
              </div>
            )}
            {shades && (
              <div className="grd-shades">
                <span className="grd-avail-sub" id="grd-shades-label">{shades.role} shades</span>
                <div className="grd-chips grd-chips--shades" role="group" aria-labelledby="grd-shades-label" aria-describedby="grd-picks-hint">
                  {shades.items.map((c) => (
                    <ColourChip key={c.hex} hex={c.hex} label={c.label} on={selectedHex === c.hex} picked={livePicks.includes(c.hex.toUpperCase())} onPick={pickColour} onTogglePick={togglePick} />
                  ))}
                </div>
              </div>
            )}
          </ToolSection>

          <ToolSection
            label="Stops"
            aside={(
              <span className="grd-sec-tools">
                {multi || selMode ? (
                  <>
                    <span className="grd-sel-count">{targets.length} selected</span>
                    <button type="button" className="grd-sel-clear" onClick={() => clearSelection()}>{selMode ? 'Done' : 'Clear'}</button>
                  </>
                ) : stops.length > 3 && (
                  <span className="grd-stops-count">{`${stopScroll.first}–${Math.min(stops.length, stopScroll.first + 2)} of ${stops.length}`}</span>
                )}
                <button type="button" className="grd-iconbtn" onClick={flip} aria-label="Flip the stops" title="Flip the stops">
                  <ToolIcon name="arrows-left-right" size={13} />
                </button>
              </span>
            )}
          >
            <div
              ref={stopListRef}
              className={`grd-stops${stopScroll.above ? ' is-above' : ''}${stopScroll.below ? ' is-below' : ''}`}
              role="group"
              aria-label="Stop list"
              aria-describedby="grd-stops-hint"
              onScroll={syncStopScroll}
              onKeyDown={onStopListKey}
            >
            {stops.map((s, i) => {
              const role = labelFor(s.color, roleDesign)
              const inSel = multi ? picked.includes(i) : activeStop === i
              return (
              <div
                key={i}
                className={`grd-stop${inSel ? ' is-on' : ''}${multi && inSel ? ' is-multi' : ''}`}
                onContextMenu={(e) => {
                  // A finger's long press selects; the Tints button opens the menu there.
                  if (coarse) { e.preventDefault(); return }
                  openTintMenu(e, i, e.currentTarget.querySelector('.grd-stop-select'))
                }}
              >
                {/* The swatch opens this stop's colour picker. Selecting the
                    stop is the colour/position label beside it. */}
                <span className="grd-stop-pick" onClick={() => { if (!(multi && picked.includes(i))) selectOnly(i) }}>
                  <ColorPickerPop
                    value={s.color}
                    onChange={(hex) => updateStops(targetsFor(i), { color: hex.toUpperCase() })}
                    ariaLabel={`Pick stop ${i + 1} colour`}
                    triggerClassName="grd-stop-swatch"
                    triggerChildren={<span className="grd-stop-chip" style={{ background: s.color }} aria-hidden="true" />}
                    popClassName="grd-cpk-pop"
                    disabled={editLocked}
                    onDisabledClick={guardEdit}
                    portal
                  />
                </span>
                <button
                  type="button"
                  className="grd-stop-select"
                  data-stop={i}
                  onClick={(e) => clickStop(i, e)}
                  onPointerDown={(e) => holdStart(i, e)}
                  onPointerUp={holdEnd}
                  onPointerCancel={holdEnd}
                  onPointerLeave={holdEnd}
                  aria-pressed={inSel}
                  aria-label={`Select stop ${i + 1}, ${s.color.toUpperCase()}`}
                  aria-describedby={`grd-stop-role-${i}`}
                  title={`${role.label}, ${s.color.toUpperCase()}, ${Math.round(s.position)}%`}
                >
                  {/* The role and shade ("Primary 500"), or "Custom" when the
                      colour is not one of the palette's. The accessible name
                      stays "Select stop N, #HEX"; this is its description. */}
                  <span id={`grd-stop-role-${i}`} className={`grd-stop-role${role.custom ? ' is-custom' : ''}`}>{role.label}</span>
                  <span className="grd-stop-hex">{s.color.toUpperCase()}</span>
                  <span className="grd-stop-pos">{Math.round(s.position)}%</span>
                </button>
                <LockBtn
                  on={!!s.locked}
                  onClick={() => toggleStopLock(i)}
                  className="grd-stop-lock"
                  label={multi && inSel ? `Lock or unlock the ${picked.length} selected stops` : s.locked ? `Stop ${i + 1} locked — colour & position kept on randomise` : `Lock stop ${i + 1} colour & position when randomising`}
                />
                {/* Always drawn, so the row keeps its columns; it only works
                    while there are more than two stops. */}
                <button
                  type="button"
                  className="grd-iconbtn grd-stop-x"
                  onClick={(e) => removeStops(targetsFor(i), e.detail === 0)}
                  aria-disabled={stops.length <= MIN_STOPS || undefined}
                  aria-describedby={stops.length <= MIN_STOPS ? 'grd-stop-min-hint' : undefined}
                  aria-label={multi && inSel ? `Remove the ${picked.length} selected stops` : `Remove stop ${i + 1}`}
                  title={stops.length <= MIN_STOPS ? 'A gradient needs at least two stops' : multi && inSel ? 'Remove the selected stops' : 'Remove this stop'}
                >
                  <ToolIcon name="x" size={12} />
                </button>
              </div>
              )
            })}
            </div>
            {/* The reason the × is inert at two stops. A press also says it in a
                toast, which is how a finger or the keyboard sees it. */}
            {stops.length <= MIN_STOPS && <span id="grd-stop-min-hint" className="sr-only">A gradient needs at least two stops</span>}
            <span id="grd-stops-hint" className="sr-only">Shift-click selects a run of stops. Ctrl-click adds or removes one. On a touch screen, press and hold. Shift with the up or down arrow extends the selection, Control A selects all, Escape clears it.</span>
            <ToolButton variant="dashed" icon="plus" iconSize={13} className="grd-add" onClick={addStop} aria-disabled={stops.length >= MAX_STOPS || undefined}>
              {stops.length >= MAX_STOPS ? `${MAX_STOPS} stops is the most` : 'Add a stop'}
            </ToolButton>
          </ToolSection>

          <ToolSection label="Selected stop">
            {selected && (
              <div className="grd-pick">
                <span className="grd-pick-swatch">
                  <ColorPickerPop
                    value={selected.color}
                    onChange={(hex) => updateStops(targets, { color: hex.toUpperCase() })}
                    ariaLabel={multi ? `Colour of the ${picked.length} selected stops` : `Stop ${activeStop + 1} colour`}
                    popClassName="grd-cpk-pop"
                    disabled={editLocked}
                    onDisabledClick={guardEdit}
                  />
                </span>
                <StopHexInput
                  color={selected.color}
                  label={multi ? `Hex for the ${picked.length} selected stops` : `Stop ${activeStop + 1} hex`}
                  onCommit={(v) => updateStops(targets, { color: v })}
                />
                <button
                  type="button"
                  className="grd-iconbtn grd-tints-btn"
                  onClick={(e) => {
                    // A second press closes the menu it opened. The menu leaves a
                    // press on this button alone (ignoreDownOn), so this click is
                    // what sees it.
                    if (tintMenu?.fromButton && tintMenu.idx === activeStop) { closeTintMenu(); return }
                    openTintMenu(e, activeStop, e.currentTarget, true)
                  }}
                  aria-haspopup="menu"
                  aria-expanded={tintMenu?.idx === activeStop}
                  aria-label={isPro ? `Tints of stop ${activeStop + 1}` : `Tints of stop ${activeStop + 1} (Pro)`}
                  title={isPro ? 'Tints of this stop' : 'Tints of this stop (Pro)'}
                >
                  <ToolIcon name={isPro ? 'swatches' : 'lock-simple'} size={14} />
                  <span className="grd-tints-label">Tints</span>
                </button>
              </div>
            )}
            <ToolSlider
              label="Position"
              value={Math.round(selected?.position ?? 0)}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateStop(activeStop, { position: v })}
              display={multi ? 'Mixed' : `${Math.round(selected?.position ?? 0)}%`}
              track={railCss}
              ariaLabel="Stop position"
              ariaValueText={multi ? 'Mixed' : `${Math.round(selected?.position ?? 0)}%`}
              disabled={editLocked || multi}
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
            </div>
            {/* The row is always drawn, at the wheel's height; a radial gradient
                says it has no angle in the same space instead of removing it. */}
            <div className="grd-row grd-row--angle">
              {angleActive ? (
                <AngleWheel
                  label="Angle"
                  ariaLabel="Gradient angle"
                  numberLabel="Gradient angle in degrees"
                  value={angle}
                  onChange={(v) => { if (guardEdit()) setAngle(v) }}
                  locked={editLocked}
                  onLockedPress={guardEdit}
                />
              ) : (
                <p className="grd-angle-none" id="grd-angle-none">Radial gradients have no angle</p>
              )}
            </div>
            <div className="grd-interp">
              <span className="grd-interp-k" id="grd-interp-label">Interpolation</span>
              <ToolPills labelledBy="grd-interp-label" describedBy="grd-interp-hint" options={SPACES} value={space} onChange={setSpace} />
              {/* Both hints sit in one grid cell, the idle one hidden, so the
                  cell is as tall as the longer hint whichever is showing. */}
              <div className="grd-interp-hints">
                {SPACES.map((o) => (
                  o.value === space
                    ? <p key={o.value} className="grd-interp-hint" id="grd-interp-hint">{o.hint}</p>
                    : <p key={o.value} className="grd-interp-hint is-idle" aria-hidden="true">{o.hint}</p>
                ))}
              </div>
            </div>
          </ToolSection>
        </ToolPanel>
      </ToolGrid>

      {/* START FROM A PRESET. The person's own palettes come first (one-tap
          gradients of their saved colours), then the curated set. */}
      <section className="grd-presets" aria-labelledby="grd-presets-title">
        <div className="grd-presets-head">
          <div className="grd-presets-title">
            <h2 id="grd-presets-title">Start from a preset</h2>
            <p>Ready-to-use gradients. Pick one to edit it.</p>
          </div>
        </div>
        {palettePresets.length > 0 && (
          <>
            <h3 className="grd-presets-sub">Your palettes</h3>
            <div className="grd-mine-grid">{palettePresets.map((p, i) => renderPreset(p, `mine-${i}`))}</div>
            <h3 className="grd-presets-sub">Starters</h3>
          </>
        )}
        <div className="grd-preset-grid">{PRESETS.map((p, i) => renderPreset(p, `p-${i}`))}</div>
      </section>

      {/* The way into the full library: a full-width panel under the presets,
          with a few of the library's own gradients as a taste. */}
      <section className="grd-explore" aria-labelledby="grd-explore-title">
        <div className="grd-explore-copy">
          <h2 id="grd-explore-title">Explore the library</h2>
          <p>Browse by mood, then open any gradient here to adjust it.</p>
          <ToolButton as={Link} to="/discover/gradients" variant="accent" icon="caret-right" iconSize={13} className="grd-explore-cta">
            Browse all gradients
          </ToolButton>
        </div>
        <ul className="grd-explore-taste" aria-label="Browse the library by mood">
          {exploreTaste.map((g) => (
            <li key={g.id}>
              <Link className="grd-explore-chip" to={`/discover/gradients?mood=${g.mood}`} aria-label={`${g.mood[0].toUpperCase()}${g.mood.slice(1)} gradients in the library`}>
                <span className="grd-explore-swatch" style={{ background: gradientCss(g.type, g.angle, g.stops) }} aria-hidden="true" />
                <span className="grd-explore-mood">{g.mood}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {tintMenu && stops[tintMenu.idx] && (
        <StopTintMenu
          color={stops[tintMenu.idx].color}
          stopNumber={tintMenu.idx + 1}
          x={tintMenu.x}
          y={tintMenu.y}
          isPro={isPro}
          focusFirst={tintMenu.focusFirst}
          returnTo={tintMenu.returnTo}
          ignoreDownOn={tintMenu.fromButton ? tintMenu.returnTo : null}
          anchor={tintMenu.anchor}
          onApply={applyTint}
          onGate={gateTints}
          onClose={closeTintMenu}
        />
      )}

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
