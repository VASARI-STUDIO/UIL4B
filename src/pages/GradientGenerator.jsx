import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useId } from 'react'
import { createPortal } from 'react-dom'
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
import SaveShareMenu, { SaveShareItem } from '../components/tool/SaveShareMenu'
import { GRAD_TYPE_WEIGHTS, rollGradient, pickPaletteLook } from '../utils/gradientRandom'
import useShiftSelect from '../hooks/useShiftSelect'
import { rangeOf, toggleIn, shiftGroup, removable } from '../utils/stopSelection'
import usePopover from '../hooks/usePopover'
import useMediaQuery from '../hooks/useMediaQuery'
import { hexToRgb, hexToOklch } from '../utils/colors'
import { labelFor, paletteChips, activeShades } from '../utils/paletteRoles'
import { allColoursLocked, nextPaintTarget, applyStarterPair } from '../utils/gradientPaint'
import { STARTER_PAIRS } from '../data/gradientStarterPairs'
import MenuSelect from '../components/tool/MenuSelect'
import { gradientCss, gradientToolUrl, decodeGradientParams } from '../data/gradientGallery'
import { LIBRARY_GRADIENT_ROWS } from '../data/gradientLibrary'
import { galleryTier } from '../utils/lockedPreview'
import { openGradientRows } from '../utils/gradientMoods'
import { consumeGradientDraft, readGradientDraft } from '../utils/colorHandoff'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import useExportGate from '../hooks/useExportGate'
import useGradientSubmissionMigration from '../hooks/useGradientSubmissionMigration'
import LegacyGradientsPrompt from '../components/LegacyGradientsPrompt'
import { stashPendingSave, clearPendingSave, takePendingSave } from '../utils/pendingSave'
// This page's own sheet. Every rule is scoped under `.grd`, the page root, so
// nothing depends on import order.
// tool-shell.css is the shared tool shell the other tool pages load too.
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
// `pool` is the colours Shuffle from palette draws from, as upper-case hexes. Empty
// means every palette colour. An entry saved before the pool existed has none and
// reads as empty.
const DEFAULT_FILTERS = { types: [ANY], counts: [ANY], keepAngle: false, pool: [] }
const HEX_6 = /^#[0-9A-F]{6}$/
function readFilters() {
  try {
    const f = JSON.parse(sessionStorage.getItem(FILTER_KEY) || 'null')
    const ok = (arr, allowed) => Array.isArray(arr) && arr.length > 0 && arr.every((v) => allowed.includes(v))
    if (f && ok(f.types, [ANY, ...GRAD_TYPES]) && ok(f.counts, COUNT_OPTIONS)) {
      const pool = Array.isArray(f.pool) ? [...new Set(f.pool.filter((h) => typeof h === 'string' && HEX_6.test(h)))] : []
      return { ...DEFAULT_FILTERS, ...f, keepAngle: !!f.keepAngle, pool }
    }
  } catch { /* storage blocked or unreadable: the defaults stand */ }
  return DEFAULT_FILTERS
}
// The engine's view of a filter: an empty list means Any.
const engineFilters = (f) => ({
  types: f.types.includes(ANY) ? [] : f.types,
  counts: f.counts.includes(ANY) ? [] : f.counts,
})
// True when any setting narrows what Random and Shuffle may make from the default.
const isNarrowed = (f) => !f.types.includes(ANY) || !f.counts.includes(ANY) || f.keepAngle
// The pool colours that are still on offer, in the order they were picked. A colour
// the palette no longer holds is ignored rather than deleted, so coming back to the
// same palette finds the pick again.
const livePool = (pool, colours) => {
  const offered = new Set(colours.map((c) => c.hex.toUpperCase()))
  return (pool || []).filter((h) => offered.has(h))
}
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
  // Roving tabindex: the group is one Tab stop, on the first pressed option (or
  // the one the arrows last reached). ←/→ move focus, Home/End jump to the ends.
  const [rove, setRove] = useState(null)
  const firstOn = Math.max(0, options.findIndex((o) => isOn(o)))
  const stop = rove != null && rove < options.length ? rove : firstOn
  const onKeyDown = (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let to = null
    if (e.key in keys) to = (stop + keys[e.key] + options.length) % options.length
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = options.length - 1
    if (to == null) return
    e.preventDefault()
    setRove(to)
    e.currentTarget.querySelectorAll('button')[to]?.focus()
  }
  return (
    <div className="grd-shuf-row">
      <span className="grd-shuf-k" id={`grd-shuf-${label}`}>{label}</span>
      <div className="tl-pills" role="group" aria-labelledby={`grd-shuf-${label}`} onKeyDown={onKeyDown}>
        {options.map((o, i) => (
          <button
            key={String(o)}
            type="button"
            className={`tl-pill${isOn(o) ? ' is-on' : ''}`}
            aria-pressed={isOn(o)}
            tabIndex={i === stop ? 0 : -1}
            onFocus={() => setRove(i)}
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

// One face of the code well's Copy button: an icon and a label. The button stacks
// several in one grid cell (see .grd-copy-stack), so its width is the widest face
// and never moves between "Copy CSS", "Copy Tailwind", "Copy SVG" and "Copied".
function CopyFace({ icon, className, children }) {
  return (
    <span className={`grd-copy-face${className ? ` ${className}` : ''}`}>
      <ToolIcon name={icon} size={14} />
      <span>{children}</span>
    </span>
  )
}

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
// near-black ink by the chip's own lightness.
function ColourChip({ hex, label, on, unavailable = false, onPick }) {
  const light = useMemo(() => hexToOklch(hex)[0] >= 60, [hex])
  const name = `${label}, ${hex}${on ? ', in this gradient' : ''}`
  return (
    <button
      type="button"
      className={`grd-chip${on ? ' is-on' : ''}${light ? ' is-light' : ''}`}
      style={{ background: hex }}
      aria-pressed={on}
      aria-disabled={unavailable || undefined}
      aria-describedby={unavailable ? 'grd-avail-status' : undefined}
      aria-label={name}
      title={name}
      onClick={() => onPick(hex, label)}
    >
      {on && <ToolIcon name="check" size={12} />}
    </button>
  )
}

// A starter pair: two flat halves in one pill. One press sets the gradient's first
// and last stop. The halves are two elements, not a hard-stop gradient, so the
// pill is flat colour like the chips.
function StarterPair({ pair, unavailable = false, onApply }) {
  const name = `${pair.name}, ${pair.left} to ${pair.right}`
  return (
    <button
      type="button"
      className="grd-pair"
      aria-label={name}
      title={name}
      aria-disabled={unavailable || undefined}
      aria-describedby={unavailable ? 'grd-avail-status' : undefined}
      onClick={() => onApply(pair)}
    >
      <span className="grd-pair-half" style={{ background: pair.left }} aria-hidden="true" />
      <span className="grd-pair-half" style={{ background: pair.right }} aria-hidden="true" />
    </button>
  )
}

// What the status line's last sentence was about: the target stop(s) and every
// stop's colour. Once either changes the sentence is stale and the line goes back
// to saying what the next press will do.
const paintKey = (idxs, list) => `${idxs.join(',')}|${list.map((st) => st.color).join('')}`

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
// (ShuffleSettings draws it in the shared sheet layer). Style only lists families that are built; with none, the
// row would offer nothing to choose, so it is left out.
// The settings themselves, shared by the popover and the toolbar's More menu
// (where the button has no room, the same controls sit inline in that menu).
// The Colours row: which palette colours Shuffle from palette draws from. "All"
// is the empty pool; "Pick colours…" opens a checklist, and two or more ticks make
// the pool. It only has a choice to offer when the palette (or the starter set)
// holds two colours or more.
function PoolRow({ colours, filters, setFilters }) {
  const uid = useId().replace(/:/g, '')
  const [listOpen, setListOpen] = useState(false)
  const live = livePool(filters.pool, colours)
  const n = live.length
  const picking = listOpen || n >= 2
  const toggle = (hex) => {
    const h = hex.toUpperCase()
    setFilters((f) => {
      const cur = livePool(f.pool, colours)
      return { ...f, pool: cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h] }
    })
  }
  if (colours.length < 2) return null
  return (
    <div className="grd-shuf-row">
      <span className="grd-shuf-k" id={`grd-pool-k-${uid}`}>Colours</span>
      <div className="tl-pills" role="group" aria-labelledby={`grd-pool-k-${uid}`}>
        <button
          type="button"
          className={`tl-pill${picking ? '' : ' is-on'}`}
          aria-pressed={!picking}
          onClick={() => { setListOpen(false); setFilters((f) => ({ ...f, pool: [] })) }}
        >All palette colours</button>
        <button
          type="button"
          className={`tl-pill${picking ? ' is-on' : ''}`}
          aria-pressed={picking}
          aria-expanded={listOpen}
          aria-controls={`grd-pool-list-${uid}`}
          onClick={() => setListOpen((o) => !o)}
        >{n >= 2 ? `${n} colours` : 'Pick colours…'}</button>
      </div>
      {listOpen && (
        <div id={`grd-pool-list-${uid}`} className="grd-pool" role="group" aria-label="Colours to shuffle from">
          {colours.map((c) => {
            const on = live.includes(c.hex.toUpperCase())
            return (
              <label key={c.hex} className="grd-pool-opt">
                <input type="checkbox" checked={on} onChange={() => toggle(c.hex)} />
                <span className="grd-pool-dot" style={{ background: c.hex }} aria-hidden="true" />
                <span className="grd-pool-name">{c.label}</span>
              </label>
            )
          })}
          <p className="grd-pool-count" role="status">{n >= 2 ? `Shuffle from ${n} colours.` : 'Tick two or more colours.'}</p>
        </div>
      )}
    </div>
  )
}

function ShuffleBody({ filters, setFilters, colours }) {
  const coarse = useMediaQuery('(pointer: coarse)')
  const summary = `Random makes ${sentence(filters.types.filter((t) => t !== ANY).length ? filters.types : ['any type'])}, ${sentence(filters.counts.filter((c) => c !== ANY).length ? filters.counts.map((c) => `${c} stops`) : ['any number of stops'])}`
  return (
    <div className="grd-shuf-body">
      {/* STYLE_FAMILIES is empty until a family is built. The Style row,
          a FilterGroup over [Plain, ...STYLE_FAMILIES] whose empty
          selection falls back to Plain, goes here. */}
      <FilterGroup label="Type" options={[ANY, ...GRAD_TYPES]} value={filters.types} coarse={coarse} onChange={(types) => setFilters((f) => ({ ...f, types }))} />
      <FilterGroup label="Stops" options={COUNT_OPTIONS} value={filters.counts} coarse={coarse} onChange={(counts) => setFilters((f) => ({ ...f, counts }))} />
      {/* The hint belongs to the pill rows above it, not to Keep the angle. */}
      <p className="grd-shuf-hint">{coarse ? 'Tap to add or remove.' : 'Shift-click to pick more than one.'}</p>
      <PoolRow colours={colours} filters={filters} setFilters={setFilters} />
      <button
        type="button"
        className={`grd-shuf-keep${filters.keepAngle ? ' is-on' : ''}`}
        aria-pressed={filters.keepAngle}
        onClick={() => setFilters((f) => ({ ...f, keepAngle: !f.keepAngle }))}
      >
        <ToolIcon name={filters.keepAngle ? 'lock-simple' : 'lock-simple-open'} size={13} />
        <span>Keep the angle</span>
      </button>
      <div className="sr-only" role="status">{summary}</div>
    </div>
  )
}

const PHONE_QUERY = '(max-width: 767px)'
const SHUFFLE_TITLE = 'What Random and Shuffle make'

function ShuffleSettings({ open, onOpen, onClose, filters, setFilters, colours }) {
  const phone = useMediaQuery(PHONE_QUERY)
  const narrowed = isNarrowed(filters)
  const sheetId = `grd-shuf-sheet-${useId().replace(/:/g, '')}`
  const { triggerRef, popRef, closeToTrigger } = usePopover(open, onClose, { portalled: phone })
  // Turning the screen across 768px swaps popover and sheet: close rather than
  // leave the open one wired to the other's element.
  const wasPhone = useRef(phone)
  useEffect(() => {
    if (wasPhone.current === phone) return
    wasPhone.current = phone
    if (open) onClose()
  }, [phone, open, onClose])
  return (
    <span className="grd-shuf-wrap">
      <ToolButton
        ref={triggerRef}
        variant="square"
        icon="sliders-horizontal"
        className={`grd-shuf-btn${narrowed ? ' is-narrowed' : ''}`}
        aria-label={narrowed ? 'Shuffle settings, narrowed' : 'Shuffle settings'}
        title={narrowed ? 'Shuffle settings, narrowed' : 'Shuffle settings'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
      />
      {open && !phone && (
        <div ref={popRef} className="tl-pop grd-shuf" role="dialog" aria-label="Shuffle settings" tabIndex={-1}>
          <div className="grd-shuf-head">
            <span className="grd-shuf-title">{SHUFFLE_TITLE}</span>
            <button type="button" className="grd-iconbtn grd-shuf-x" onClick={closeToTrigger} aria-label="Close"><ToolIcon name="x" size={14} /></button>
          </div>
          <ShuffleBody filters={filters} setFilters={setFilters} colours={colours} />
        </div>
      )}
      {/* Below 768px the same settings are a bottom sheet in the shared sheet
          layer (the More menu's), portalled to <body>: the toolbar's
          backdrop-filter makes it the containing block of anything fixed
          inside it, so a fixed sheet drawn here hung off the toolbar. */}
      {open && phone && createPortal(
        <div className="tl-sheet-layer">
          {/* data-pop-scrim keeps the popover hook from closing on the press
              itself: the click below closes it and hands focus back to the button
              (a close on the press loses it to the page). */}
          <div className="tl-sheet-scrim" aria-hidden="true" data-pop-scrim={sheetId} onClick={closeToTrigger} />
          <div id={sheetId} ref={popRef} className="tl-sheet" role="dialog" aria-label="Shuffle settings" tabIndex={-1}>
            <span className="tl-sheet-grab" aria-hidden="true" />
            <div className="tl-sheet-head">
              <span className="tl-sheet-title">{SHUFFLE_TITLE}</span>
              <button type="button" className="tl-sheet-x" onClick={closeToTrigger} aria-label="Close"><ToolIcon name="x" size={16} /></button>
            </div>
            <ShuffleBody filters={filters} setFilters={setFilters} colours={colours} />
          </div>
        </div>,
        document.body,
      )}
    </span>
  )
}

// `onExport` is this tool's ONE declared export hook — the copy of the payload
// that IS the artefact. It defaults to `onCopy` so the component still copies
// correctly if it is ever mounted outside CreateTool; the activation naming
// lives in src/config/activationExports.js, never here.
export default function GradientGenerator({ onCopy, onExport = onCopy, toast }) {
  const { design, setGradient, projects, saveProject, overwriteProject, canSaveProjects } = useProject()
  const { user, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  // Gradients an earlier visit queued in this browser: a signed-in person is
  // asked whether to keep them with the account (never moved unasked).
  const keepGradients = useGradientSubmissionMigration({ toast })
  const requireExportAccount = useExportGate()
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
  const stopListRef = useRef(null) // the stop list's scrolling window (see syncStopScroll)
  const coarse =useMediaQuery('(pointer: coarse)')
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
  // The Available colours status line: the last press's sentence and the key that
  // says which stops and colours it describes. `n` flips an invisible character on
  // an identical sentence so a screen reader says it again.
  const [paintNote, setPaintNote] = useState(null)
  const paintCount = useRef(0)
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
  // The Save or share menu (SaveShareMenu). `pendingSave` is a save waiting for the
  // account to reach ProjectContext — see doSave.
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveNameError, setSaveNameError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [pendingSave, setPendingSave] = useState(null)
  const [saveNote, setSaveNote] = useState('')
  const saveTriggerRef = useRef(null)
  // doSave waits on the sign-in popup; these say what became of the tool meanwhile.
  const mountedRef = useRef(true)
  const saveOpenRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => { saveOpenRef.current = saveOpen }, [saveOpen])
  const [fmt, setFmt] = useState('css') // export format: css | tailwind | svg
  // The code well's Copy button swaps to "Copied" for a beat after a press.
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(0)
  useEffect(() => () => clearTimeout(copiedTimer.current), [])
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
      setSpace(incoming.space || 'srgb')
      // A link copied from the tool is someone's own gradient; only a library
      // hand-off (no src marker) opens locked.
      setFromLibrary(!incoming.link)
      toast?.(`Loaded ${incoming.name || 'gradient'}`)
    } else {
      const preset = presetSlug ? PRESETS.find(p => slugify(p.n) === presetSlug) : null
      if (preset) applyPreset(preset)
      toast?.(preset ? `Loaded ${preset.n}` : 'Opened in Gradient Generator')
    }
    const next = new URLSearchParams(searchParams)
    ;['preset', 'tab', 'gs', 'gt', 'ga', 'gn', 'gi', 'src'].forEach(k => next.delete(k))
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
    const shift = remove.filter((r) => r < activeStop).length
    const next = remove.includes(activeStop) ? Math.min(activeStop - shift, stops.length - remove.length - 1) : activeStop - shift
    setActiveStop(next)
    // A later Shift-click ranges from the stop that is active now, not from an
    // index the delete moved.
    anchorRef.current = next
    setPicked([])
    setSelMode(false)
    if (blocked) say('A gradient needs at least two stops.')
    else if (remove.length > 1) say(`${remove.length} stops removed`)
  }, [guardEdit, stops.length, activeStop, toast, say])

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
  // this logic. `closeSeam` is set for a conic roll: locked stops and the cycling
  // of `sample` can leave the last colour off the first, so it is made the first
  // again (or the first made the last, when only the last is locked).
  const rollStops = useCallback((sample, count, closeSeam = false) => {
    // A locked stop must always survive, even when the rolled count is smaller
    // than its index — so if ANY stop is locked we keep the current length
    // rather than shrinking to the rolled count and dropping locked stops.
    const hasStopLock = stops.some(s => s.locked)
    const n = hasStopLock ? stops.length : count
    const out = Array.from({ length: n }, (_, i) => {
      const ex = stops[i]
      if (ex?.locked) return { color: ex.color, position: ex.position, locked: true }
      return {
        color: sample(i),
        position: Math.round((i / (n - 1)) * 100),
        locked: false,
      }
    })
    if (closeSeam && hasStopLock && n >= 3) {
      const last = out[n - 1]
      if (!last.locked) last.color = out[0].color
      else if (!out[0].locked) out[0].color = last.color
    }
    return out
  }, [stops])

  // Random: colours are chosen in OKLCH under the quality rules in
  // utils/gradientRandom, so the ends are related and the middle is never grey.
  const randomise = useCallback(() => {
    const g = rollGradient(Math.random, engineFilters(filters))
    setStops(rollStops((i) => g.stops[i % g.stops.length].color, g.stops.length, g.type === 'Conic'))
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
  // The Shuffle pool lives in Shuffle settings (filters.pool). The colours on offer
  // there are the palette's, or the ten starter colours while there is no palette.
  // The pool counts from two colours up: one tick is just a mark.
  const poolColours = useMemo(() => (chips.length ? chips : STARTER_COLOURS.map((c) => ({ hex: c.hex, label: c.name }))), [chips])
  const livePicks = useMemo(() => livePool(filters.pool, poolColours), [filters.pool, poolColours])
  const usingPicks = livePicks.length >= 2
  const pool = usingPicks ? livePicks : paletteHexes
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
    const engine = engineFilters(filters)
    // The roll's own radial gate judges colours that are thrown away here, so it
    // is off and the gate runs on the palette colours instead.
    const g = rollGradient(Math.random, { ...engine, radialGate: false })
    const { type: lookType, colours: picks } = pickPaletteLook(pool, g.stops.length, g.type, engine.types, Math.random)
    setStops(rollStops((i) => picks[i % picks.length], g.stops.length, lookType === 'Conic'))
    setType(lookType)
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

  // A chip paints the selected stops, or the target stop; then the target moves on
  // to the next stop whose colour is not locked, so two presses make a whole
  // gradient. A selection stays where it is. Pressing a colour a stop already has
  // changes nothing but still moves the target, so pressing through a palette in
  // order never stalls.
  const pickColour = useCallback((hex, name) => {
    if (!guardEdit()) return
    if (allColoursLocked(stops)) {
      setPaintNote({ text: 'Every colour is locked.', key: paintKey(targets, stops), n: ++paintCount.current })
      return
    }
    const upper = hex.toUpperCase()
    const same = targets.every((i) => stops[i]?.color?.toUpperCase() === upper)
    const painted = same ? stops : stops.map((st, i) => (targets.includes(i) ? { ...st, color: hex } : st))
    if (!same) setStops(painted)
    const next = multi ? activeStop : nextPaintTarget(painted, activeStop)
    if (next !== activeStop) { setActiveStop(next); anchorRef.current = next }
    let text
    if (multi) text = `${targets.length} selected stops ${same ? 'are already' : 'set to'} ${name}.`
    else if (same) text = `Stop ${activeStop + 1} is already ${name}.`
    else text = `Stop ${activeStop + 1} set to ${name}.${next !== activeStop ? ` Next: stop ${next + 1}.` : ''}`
    setPaintNote({ text, key: paintKey(multi ? targets : [next], painted), n: ++paintCount.current })
  }, [guardEdit, targets, stops, multi, activeStop])

  // A starter pair sets the first and last stop in one press (the stops between are
  // re-mixed), and the target goes back to stop 1 so the next press starts over.
  const applyPair = useCallback((pair) => {
    if (!guardEdit()) return
    if (allColoursLocked(stops)) {
      setPaintNote({ text: 'Every colour is locked.', key: paintKey(targets, stops), n: ++paintCount.current })
      return
    }
    const painted = applyStarterPair(stops, pair)
    setStops(painted)
    selectOnly(0)
    setPaintNote({ text: `Stops set to ${pair.name}.`, key: paintKey([0], painted), n: ++paintCount.current })
  }, [guardEdit, stops, targets, selectOnly])

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

  // "From a project" in the sparse Available colours states: saved projects only
  // (the current palette is what is missing there). The choice lasts the session.
  const projectSources = useMemo(() => importSources.filter((s) => s.key.startsWith('proj-')), [importSources])
  const [fromKey, setFromKey] = useState('')
  const fromProject = projectSources.find((s) => s.key === fromKey) || null

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

  // ── Save or share ──
  // The name the field opens with. No generated name exists yet, so the type
  // stands in; the naming step swaps this one line.
  const defaultSaveName = `${type} gradient`

  const closeSave = useCallback((reason) => {
    setSaveOpen(false)
    setSaveNote('')
    setSaveNameError('')
    setPendingSave(null)
    // A closed menu has nothing to reopen on a remount.
    clearPendingSave()
    // Keyboard and the row actions hand focus back to the button; a press outside
    // is already somewhere else.
    if (reason !== 'outside') saveTriggerRef.current?.focus()
  }, [])
  const toggleSave = () => {
    if (saveOpen) { closeSave('button'); return }
    setSaveName(defaultSaveName)
    setSaveNameError('')
    setSaveError('')
    setSaveNote('')
    setSaveOpen(true)
  }
  // Back from onboarding after signing up to save: reopen the menu with the name
  // typed before, and let the person press Save. Decided once per mount, when
  // the account is first known.
  const restoreCheckedRef = useRef(false)
  useEffect(() => {
    if (authLoading || restoreCheckedRef.current) return
    restoreCheckedRef.current = true
    if (!user) return
    const stashed = takePendingSave('gradient')
    if (stashed == null) return
    setSaveName(stashed || defaultSaveName)
    setSaveNote('You’re signed in. Press Save to finish.')
    setSaveOpen(true)
  }, [authLoading, user, defaultSaveName])

  // Copy CSS and Copy Tailwind class go through onExport so the activation count
  // is unchanged; it writes the clipboard and toasts.
  // The one export call: every copy and download path runs through it.
  const sendExport = useCallback(value => onExport?.(value), [onExport])
  const copyExport = useCallback((value) => {
    closeSave('item')
    return sendExport(value)
  }, [sendExport, closeSave])

  // The code well's Copy button and Ctrl/Cmd+C. Straight to onExport, the same
  // path as the menu rows, so activation counting is unchanged. It does not go
  // through copyExport: that hands focus back to the Save button, which would
  // pull a keyboard user out of the well. Only a refused clipboard (false) skips
  // the "Copied" swap; the toast carries that error.
  const copyCode = useCallback(async () => {
    const ok = await sendExport(exportCode)
    if (ok === false) return
    clearTimeout(copiedTimer.current)
    setCopied(true)
    copiedTimer.current = setTimeout(() => setCopied(false), 1400)
  }, [sendExport, exportCode])
  const onCodeKeyDown = (e) => {
    // Ctrl/Cmd+C with nothing selected copies the whole snippet. With a text
    // selection the browser's own copy runs untouched.
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.repeat || e.key.toLowerCase() !== 'c') return
    if (window.getSelection()?.toString()) return
    e.preventDefault()
    copyCode()
  }

  // Free, no account. Written to the clipboard here rather than through onExport:
  // a link is not an export.
  const copyLink = async () => {
    closeSave('item')
    // No name yet (it comes with the generated name), so `gn` is left off. A
    // gradient of the person's own carries src=link so it opens editable; one still
    // sourced from the library stays a library hand-off and opens locked.
    const url = `${window.location.origin}${gradientToolUrl({ type, angle, stops, gi: space, src: fromLibrary ? undefined : 'link' })}`
    try {
      await navigator.clipboard.writeText(url)
      toast?.('Link copied')
    } catch {
      toast?.('Couldn’t copy the link', 'error')
    }
  }

  // A file, so it needs a free account (useExportGate). Conic has no SVG form.
  const downloadSvg = async () => {
    if (type === 'Conic') return
    if (!(await requireExportAccount('download this gradient as an SVG'))) return
    closeSave('item')
    const blob = new Blob([gradientSvg(type, angle, stops, space)], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uil4b-gradient.svg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  // The account is asked for BEFORE the name, as on the palette: a signed-out
  // visitor pressing Save with an empty name meets the sign-in, not a refusal
  // about the name.
  const doSave = async () => {
    if (!canSaveProjects) {
      // A new account is sent to onboarding, which unmounts this page; the stash
      // lets the page reopen the menu with the name when it comes back.
      stashPendingSave('gradient', saveName.trim())
      const signedIn = await requireLogin('save this gradient to your account', { free: true, signup: true })
      // Unmounted: a new account was sent to onboarding. The stash stays for the
      // remount to find. It is cleared only once the save has run, or when the
      // sign-in is cancelled or the menu closed (closeSave).
      if (!mountedRef.current) return
      if (!signedIn) { clearPendingSave(); setPendingSave(null); return }
      // Closed while the sign-in was open: nothing to finish.
      if (!saveOpenRef.current) { clearPendingSave(); return }
    }
    const name = saveName.trim()
    // Refused here with the page still open: nothing is waiting to be reopened.
    if (!name) { clearPendingSave(); setSaveNameError('Name the project to save it.'); return }
    // The save runs in the effect below. Right after the sign-in resolves this
    // closure still holds the signed-out `saveProject`, which throws "Sign in to
    // save projects"; the effect re-runs with the fresh one once the account has
    // reached ProjectContext.
    setPendingSave(name)
  }
  useEffect(() => {
    if (pendingSave == null || !canSaveProjects) return
    setPendingSave(null)
    // The save is being attempted, so a remount has nothing left to reopen.
    clearPendingSave()
    try {
      saveProject(pendingSave)
      closeSave('item')
      toast?.('Project saved')
    } catch (err) {
      // The free cap's refusal stays under the field, with the way forward as a link.
      setSaveError(err?.message || 'Couldn’t save')
    }
  }, [pendingSave, canSaveProjects, saveProject, closeSave, toast])
  const overwriteWith = (project) => {
    try {
      overwriteProject(project.id)
      closeSave('item')
      toast?.('Updated: ' + project.name)
    } catch (err) {
      toast?.(err?.message || 'Couldn’t save', 'error')
    }
  }

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
      if (run.length >= 2) {
        say(`${run.length} stops selected`)
        // The window shows three rows: bring the run's first row into it, so a
        // Shift-click from the rail does not select rows the list never shows.
        const list = stopListRef.current
        const row = list?.querySelector(`.grd-stop-select[data-stop="${Math.min(...run)}"]`)?.closest('.grd-stop')
        if (list && row) {
          const l = list.getBoundingClientRect()
          const r = row.getBoundingClientRect()
          if (r.top < l.top) list.scrollTop += r.top - l.top
          else if (r.bottom > l.bottom) list.scrollTop += r.bottom - l.bottom
        }
      }
      return
    }
    if (e?.ctrlKey || e?.metaKey || selMode) {
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
  // The Select button in the Stops head: the same mode a long press starts,
  // for a finger that has not found the long press. The active stop is the first
  // one in it.
  // Clear and Done leave the head row once pressed: focus goes to the active
  // stop's row (the first row when there is none), not to the page.
  const endSelection = useCallback(() => {
    clearSelection()
    requestAnimationFrame(() => {
      const list = stopListRef.current
      const to = list?.querySelector(`.grd-stop-select[data-stop="${activeStop}"]`) || list?.querySelector('.grd-stop-select')
      to?.focus({ preventScroll: true })
    })
  }, [clearSelection, activeStop])
  const startSelecting = useCallback(() => {
    setSelMode(true)
    setPicked([])
    anchorRef.current = activeStop
    say('Selecting stops. Tap a stop to add or remove it.')
  }, [activeStop, say])
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
    if (e.shiftKey || e.ctrlKey || e.metaKey || selMode) { pressStop(idx, e); return }
    if (!guardEdit()) return
    beginStopDrag(idx)
  }, [beginStopDrag, guardEdit, pressStop, selMode])

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
  // A chip is on when any stop uses its colour; the ringed dot on the ramp, not the
  // chip, says where the next press lands.
  const usedHexes = new Set(stops.map((st) => st.color.toUpperCase()))
  const allLocked = allColoursLocked(stops)
  // Fewer than two palette colours: Available colours offers starting points instead.
  const sparse = chips.length < 2
  const noteNow = paintNote && paintNote.key === paintKey(targets, stops) ? paintNote : null
  const availHead = allLocked ? 'Every colour is locked' : multi ? `Painting ${targets.length} selected stops` : `Painting stop ${activeStop + 1} of ${stops.length}`
  const availIdle = allLocked ? 'Every colour is locked. Unlock a stop to paint it.' : multi ? `Press a colour to paint the ${targets.length} selected stops.` : `Press a colour to paint stop ${activeStop + 1}.`
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

  // Escape anywhere in the controls panel (stop list, hex input, chips) clears
  // the selection. Something open in front of it closes first: a popover or menu
  // the key came from, or a picker whose button holds focus. The picker's popover
  // is a portal, and React events bubble out of it, so the target must also sit
  // inside the panel's own DOM.
  const onPanelKey = (e) => {
    if (e.key !== 'Escape' || !(multi || selMode)) return
    if (!e.currentTarget.contains(e.target)) return
    if (e.target.closest?.('[role="dialog"], [role="menu"], [aria-expanded="true"]')) return
    e.preventDefault()
    clearSelection()
  }

  // Keys inside the stop list. Ctrl/Cmd+A selects every stop; Shift+Up/Down on a
  // row moves to the next row and extends the run to it; Delete/Backspace
  // removes a selection.
  const onStopListKey = (e) => {
    // The colour picker's popover is a portal, and React events bubble out of it.
    if (!stopListRef.current?.contains(e.target)) return
    const row = e.target.closest?.('.grd-stop-select')
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
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
          id: 'shuffle-settings', priority: 3,
          // Too narrow for the button: the same settings sit inline in More.
          menu: () => (
            <div className="grd-shuf-inline">
              <div className="grd-shuf-inline-head">
                <span className="grd-shuf-title">{SHUFFLE_TITLE}</span>
                {isNarrowed(filters) && <span className="grd-shuf-state">Narrowed</span>}
              </div>
              <ShuffleBody filters={filters} setFilters={setFilters} colours={poolColours} />
            </div>
          ),
          render: () => (
            <ShuffleSettings
              open={shuffleOpen}
              onOpen={() => setShuffleOpen(true)}
              onClose={() => setShuffleOpen(false)}
              filters={filters}
              setFilters={setFilters}
              colours={poolColours}
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
          id: 'count', priority: 2, align: 'end', menu: false,
          render: () => <span className="tl-meta grd-count">{stops.length} {stops.length === 1 ? 'stop' : 'stops'}</span>,
        },
      ]}
      primary={(
        <ToolButton
          ref={saveTriggerRef}
          variant="accent"
          icon="bookmark-simple"
          iconSize={14}
          aria-haspopup="dialog"
          aria-expanded={saveOpen}
          onClick={toggleSave}
        >
          Save or share
        </ToolButton>
      )}
    >
      {saveOpen && (
        <SaveShareMenu
          label="Save, share and export this gradient"
          name={saveName}
          onNameChange={(v) => { setSaveName(v); setSaveNameError('') }}
          onSave={doSave}
          busy={authLoading}
          nameError={saveNameError}
          note={saveNote}
          sheetBelow={768}
          saveError={saveError}
          refusalTestId="gradient-save-refusal"
          projects={projects}
          onOverwrite={overwriteWith}
          onClose={closeSave}
          dismiss
          triggerRef={saveTriggerRef}
          focusOnOpen
          selectOnFocus
          share={(
            <SaveShareItem onClick={copyLink}>Copy link to this gradient</SaveShareItem>
          )}
          exports={(
            <>
              {/* Seams, no rows yet: "Copy CSS with finishes" (a finish is on),
                  Curtains and Beams (their own CSS and the SVG refusal), and
                  "Download image" (Pro). */}
              <SaveShareItem onClick={() => copyExport(`background: ${css};`)}>Copy CSS</SaveShareItem>
              <SaveShareItem onClick={() => copyExport(tailwindValue(css))}>Copy Tailwind class</SaveShareItem>
              <SaveShareItem
                icon="download"
                onClick={downloadSvg}
                disabled={type === 'Conic'}
                reason="SVG can't draw a conic gradient"
                hint={user ? undefined : 'Needs a free account'}
              >
                Download SVG
              </SaveShareItem>
            </>
          )}
        />
      )}
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

          <div className="grd-code" onKeyDown={onCodeKeyDown}>
            <div className="grd-fmt">
              <div className="grd-fmt-tabs" role="tablist" aria-label="Export format">
                {EXPORT_FORMATS.filter(f => f.id !== 'svg' || type !== 'Conic').map(f => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={effFmt === f.id}
                    className={`tl-pill tl-pill--mono grd-fmt-btn${effFmt === f.id ? ' is-on' : ''}`}
                    onClick={() => { setFmt(f.id); clearTimeout(copiedTimer.current); setCopied(false) }}
                  >{f.label}</button>
                ))}
              </div>
              {/* Seam: the "+ finishes" toggle (spec 11.2) goes here, just left of
                  Copy. Copy's margin-left:auto keeps it at the right edge either way. */}
              <button
                type="button"
                className={`grd-copy${copied ? ' is-copied' : ''}`}
                onClick={copyCode}
                aria-label={copied ? 'Copied' : `Copy ${fmtLabel}`}
              >
                <span className="grd-copy-stack" aria-hidden="true">
                  <CopyFace icon="copy" className="grd-copy-idle">Copy<span className="grd-copy-fmt"> {fmtLabel}</span></CopyFace>
                  <CopyFace icon="check" className="grd-copy-done">Copied</CopyFace>
                  {/* Hidden faces that hold the width at the widest label. */}
                  {EXPORT_FORMATS.map((f) => (
                    <CopyFace key={f.id} icon="copy" className="grd-copy-size">Copy<span className="grd-copy-fmt"> {f.label}</span></CopyFace>
                  ))}
                  <CopyFace icon="check" className="grd-copy-size">Copied</CopyFace>
                </span>
              </button>
            </div>
            <pre className={`grd-code-text${effFmt === 'svg' ? ' grd-code-text--block' : ''}${effFmt === 'css' ? ' grd-code-text--wrap' : ''}`} tabIndex={0} aria-label={`${fmtLabel} code`}><code>{exportCode}</code></pre>
          </div>
        </ToolMain>

        <ToolPanel label="Gradient controls" className="grd-panel" onKeyDown={onPanelKey}>
          {/* AVAILABLE COLOURS. Every colour in the palette, one press from the
              selected stop, then its shades when the project's ramp is current.
              With no palette the ten starter colours stand in. */}
          <ToolSection
            label="Available colours"
            labelId="grd-avail-label"
            className="grd-avail"
            aside={<span className="grd-avail-tip">{availHead}</span>}
          >
            <div className="sr-only" role="status">{pickNote}</div>
            {sparse ? (
              <div className="grd-sparse">
                <p className="grd-avail-note" ref={paletteNoteRef} tabIndex={-1}>
                  {chips.length === 0 ? 'No palette yet. Start from a pair, or use your own colours.' : 'Add a second colour in Palette Builder to shuffle from it.'}
                </p>
                <div className="grd-sparse-body">
                  {fromProject ? (
                    <div className="grd-avail-block">
                      <span className="grd-avail-sub" id="grd-from-label">Colours from {fromProject.name}</span>
                      <div className="grd-chips" role="group" aria-labelledby="grd-from-label">
                        {fromProject.colors.map((hex, i) => (
                          <ColourChip key={`${hex}-${i}`} hex={hex.toUpperCase()} label={`${fromProject.name} colour ${i + 1}`} on={usedHexes.has(hex.toUpperCase())} unavailable={allLocked} onPick={pickColour} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grd-avail-block">
                        <span className="grd-avail-sub" id="grd-pairs-label">Pairs</span>
                        <div className="grd-pairs" role="group" aria-labelledby="grd-pairs-label">
                          {STARTER_PAIRS.map((pair) => (
                            <StarterPair key={pair.id} pair={pair} unavailable={allLocked} onApply={applyPair} />
                          ))}
                        </div>
                      </div>
                      <div className="grd-avail-block">
                        <span className="grd-avail-sub" id="grd-starter-label">Colours</span>
                        {chips.length === 0 ? (
                          <div className="grd-chips grd-chips--starter" role="group" aria-labelledby="grd-starter-label">
                            {STARTER_COLOURS.map((c) => (
                              <ColourChip key={c.hex} hex={c.hex} label={c.name} on={usedHexes.has(c.hex.toUpperCase())} unavailable={allLocked} onPick={pickColour} />
                            ))}
                          </div>
                        ) : (
                          <div className="grd-chips" role="group" aria-labelledby="grd-starter-label">
                            {chips.map((c) => (
                              <ColourChip key={c.hex} hex={c.hex} label={c.label} on={usedHexes.has(c.hex.toUpperCase())} unavailable={allLocked} onPick={pickColour} />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {/* The row keeps its height whether or not a project select is drawn,
                    so projects arriving later move nothing. */}
                <div className="grd-avail-from">
                  {projectSources.length > 0 && (
                    <MenuSelect
                      className="grd-from-select"
                      ariaLabel="From a project"
                      value={fromProject ? fromProject.key : ''}
                      options={[{ value: '', label: 'From a project' }, ...projectSources.map((s) => ({ value: s.key, label: s.name }))]}
                      onChange={setFromKey}
                    />
                  )}
                  <Link to="/create/palette" className="grd-avail-link">{chips.length === 0 ? 'Make a palette' : 'Open Palette Builder'}</Link>
                </div>
              </div>
            ) : (
              <div className="grd-chips" role="group" aria-label="Palette colours">
                {shownChips.map((c) => (
                  <ColourChip key={c.hex} hex={c.hex} label={c.label} on={usedHexes.has(c.hex.toUpperCase())} unavailable={allLocked} onPick={pickColour} />
                ))}
                {hiddenChips > 0 && (
                  <Link to="/create/palette" className="grd-chips-more">
                    +{hiddenChips} more<span className="sr-only">{hiddenChips === 1 ? ' colour' : ' colours'} in Palette Builder</span>
                  </Link>
                )}
              </div>
            )}
            {shades && (
              <div className="grd-shades">
                <span className="grd-avail-sub" id="grd-shades-label">{shades.role} shades</span>
                <div className="grd-chips grd-chips--shades" role="group" aria-labelledby="grd-shades-label">
                  {shades.items.map((c) => (
                    <ColourChip key={c.hex} hex={c.hex} label={c.label} on={usedHexes.has(c.hex.toUpperCase())} unavailable={allLocked} onPick={pickColour} />
                  ))}
                </div>
              </div>
            )}
            <p id="grd-avail-status" className="grd-avail-status" role="status" aria-live="polite" aria-atomic="true">
              {noteNow ? noteNow.text + (noteNow.n % 2 ? '\u200B' : '') : <span className="grd-avail-idle" aria-hidden="true">{availIdle}</span>}
            </p>
          </ToolSection>

          <ToolSection
            label="Stops"
            aside={(
              <span className="grd-sec-tools">
                {multi || selMode ? (
                  <>
                    <span className="grd-sel-count">{targets.length} selected</span>
                    <button type="button" className="grd-sel-clear" onClick={endSelection}>{selMode ? 'Done' : 'Clear'}</button>
                  </>
                ) : (
                  <>
                    {stops.length > 3 && (
                      <span className="grd-stops-count">{`${stopScroll.first}–${Math.min(stops.length, stopScroll.first + 2)} of ${stops.length}`}</span>
                    )}
                    {/* A finger has no Shift or Ctrl and may not find the long
                        press, so selecting stops gets a button of its own. */}
                    {coarse && <button type="button" className="grd-sel-clear" onClick={startSelecting} aria-label="Select stops">Select</button>}
                  </>
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
                  title={`${role.label}, ${s.color.toUpperCase()}, ${Math.round(s.position)}%${coarse ? '' : '. Shift-click to select more'}`}
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
            <span id="grd-stops-hint" className="sr-only">Shift-click selects a run of stops. Ctrl-click adds or removes one. From the keyboard, Shift with Enter or Space does the same as Shift-click. On a touch screen, use the Select button or press and hold. Shift with the up or down arrow extends the selection, Control A selects all, Escape clears it.</span>
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

      {/* The question about gradients this browser holds comes last in the editor,
          after the code well and the controls: it mounts once the account is known,
          so anywhere above would push the canvas or the panel down mid-edit. */}
      {keepGradients.waiting > 0 && (
        <div className="grd-keep">
          <LegacyGradientsPrompt
            count={keepGradients.waiting}
            busy={keepGradients.busy}
            onKeep={keepGradients.keep}
            onDismiss={keepGradients.notMine}
          />
        </div>
      )}

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
    </ToolLayout>
  )
}
