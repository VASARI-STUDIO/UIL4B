import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ACCEPT_IMAGE,
  DEFAULT_IMAGE_DRAFT,
  DRAFT_COMPRESSIONS,
  DRAFT_FORMATS,
  DRAFT_RESOLUTIONS,
  describeCompressionLimit,
  partitionImageFiles,
  resetImageHandoff,
  setImageHandoff,
} from '../utils/imageHandoff'
import {
  DEFAULT_ICON_DRAFT,
  ICON_DRAFT_NAMES,
  ICON_DRAFT_SIZES,
  ICON_DRAFT_STROKES,
  buildIconDraft,
  resetIconDraft,
  setIconDraft,
} from '../utils/iconHandoff'
import { resetScaleDraft, setScaleDraft } from '../utils/typeHandoff'
import { HOME_WORKBENCH_TABS } from '../data/toolTree'
import NavIcon from './NavIcon'

// The homepage mini-workbench: five task modes over one persistent panel.
//
// This is the "calm" half of the hero's chaos → calm story. Eleven real tool
// links sit above it; five ways of *working* sit here. Every panel is a limited
// but genuine interaction — real generated values, real editable inputs, real
// hand-offs into the full tools — and every panel names where Continue goes
// before you press it.
//
// Deliberate limits, stated as honestly as the capabilities:
//   · nothing here saves, exports, counts against a quota or grants a plan;
//   · the Image panel produces an output DRAFT, never a finished conversion;
//   · the Icon panel edits a preview, never a stored custom icon.
//
// All four panels' state lives here, so switching tabs keeps a visitor's edits
// for the session. A reload deliberately returns to safe defaults — no
// persistence is added just to make a preview survive.

/* ── colour maths (no dependency, deterministic) ────────────────────────── */

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
}

// Perceived luminance → a readable ink for a swatch label.
function readableInk(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.58 ? '#141414' : '#FFFFFF'
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function expandHex(value) {
  const hex = value.trim()
  if (!HEX_RE.test(hex)) return null
  if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase()
  return hex.toUpperCase()
}

/**
 * Copy honestly: resolve true only when the clipboard actually accepted the
 * text. A denied or unavailable clipboard must never report success.
 */
async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/* ── shared tiny glyphs ─────────────────────────────────────────────────── */

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

function IconLock({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...strokeProps}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      {open ? <path d="M8 11V8a4 4 0 0 1 7.5-2" /> : <path d="M8 11V8a4 4 0 0 1 8 0v3" />}
    </svg>
  )
}

/* ── keyboard: the ARIA tabs pattern, shared by both tablists ───────────── */

function tabKeyIndex(key, index, length) {
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === 'ArrowLeft') return (index - 1 + length) % length
  if (key === 'ArrowRight') return (index + 1) % length
  return -1
}

/* ── 1 · Palette ─────────────────────────────────────────────────────────── */

const L_RAMP = [34, 47, 60, 73, 86]

function makeSwatch(baseHue, i) {
  const h = (baseHue + i * 14 + (Math.random() * 8 - 4) + 360) % 360
  const s = 60 + Math.random() * 16
  return { hex: hslToHex(h, s, L_RAMP[i]), locked: false }
}

function makePalette() {
  const baseHue = Math.floor(Math.random() * 360)
  return L_RAMP.map((_, i) => makeSwatch(baseHue, i))
}

function PalettePanel({ swatches, onChange, announce }) {
  const [copyError, setCopyError] = useState('')
  const [copiedHex, setCopiedHex] = useState('')

  const generate = () => {
    const baseHue = Math.floor(Math.random() * 360)
    onChange(swatches.map((s, i) => (s.locked ? s : makeSwatch(baseHue, i))))
    setCopiedHex('')
    announce('Generated four unlocked colours. Locked colours were kept.')
  }

  const toggleLock = (index) => {
    const next = swatches.map((s, i) => (i === index ? { ...s, locked: !s.locked } : s))
    onChange(next)
    announce(`${next[index].hex} ${next[index].locked ? 'locked' : 'unlocked'}.`)
  }

  const copy = async (hex) => {
    const ok = await copyText(hex)
    if (ok) {
      setCopyError('')
      setCopiedHex(hex)
      announce(`${hex} copied.`)
    } else {
      setCopiedHex('')
      setCopyError(hex)
    }
  }

  return (
    <div className="hw-body">
      <ul className="hw-pal">
        {swatches.map((s, i) => (
          <li className="hw-pal-sw" key={i} style={{ background: s.hex }}>
            <button
              type="button"
              className="hw-pal-lock"
              style={{ color: readableInk(s.hex) }}
              aria-pressed={s.locked}
              aria-label={`${s.locked ? 'Unlock' : 'Lock'} ${s.hex}`}
              onClick={() => toggleLock(i)}
            >
              <IconLock open={!s.locked} />
            </button>
            <button
              type="button"
              className="hw-pal-copy"
              style={{ color: readableInk(s.hex) }}
              aria-label={`Copy ${s.hex}`}
              onClick={() => copy(s.hex)}
            >
              <span className="hw-pal-hex">{s.hex}</span>
              {copiedHex === s.hex && <span className="hw-pal-tick" aria-hidden="true">Copied</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="hw-row">
        <button type="button" className="hw-btn hw-btn-go" onClick={generate}>Generate</button>
        <p className="hw-note">Lock a colour to keep it through the next generate.</p>
      </div>

      {copyError && (
        <p className="hw-alert" role="alert">
          This browser blocked the clipboard. Select and copy this value manually:{' '}
          <code className="hw-code-inline">{copyError}</code>
        </p>
      )}

      <div className="hw-foot">
        <Link className="hw-continue" to="/color/palette">
          Continue in Palette Builder
          <span aria-hidden="true">→</span>
        </Link>
        <span className="hw-foot-note">Five swatches here · full ramps, roles and export there.</span>
      </div>
    </div>
  )
}

/* ── 2 · Gradient ────────────────────────────────────────────────────────── */

const DEFAULT_GRADIENT = { from: '#7C3AED', to: '#22D3EE', angle: 135 }

function gradientCss({ from, to, angle }) {
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`
}

function GradientPanel({ gradient, onChange, announce }) {
  // Text drafts are held separately so a half-typed hex never destroys the
  // preview — the last valid value stays on screen while the field explains
  // what to correct.
  const [drafts, setDrafts] = useState({ from: gradient.from, to: gradient.to })
  const [invalid, setInvalid] = useState({ from: false, to: false })
  const [copyState, setCopyState] = useState('')

  const css = gradientCss(gradient)

  const commitStop = (stop, value) => {
    setDrafts((d) => ({ ...d, [stop]: value }))
    const hex = expandHex(value)
    if (!hex) {
      setInvalid((v) => ({ ...v, [stop]: true }))
      return
    }
    setInvalid((v) => ({ ...v, [stop]: false }))
    onChange({ ...gradient, [stop]: hex })
  }

  const pickStop = (stop, value) => {
    const hex = value.toUpperCase()
    setDrafts((d) => ({ ...d, [stop]: hex }))
    setInvalid((v) => ({ ...v, [stop]: false }))
    onChange({ ...gradient, [stop]: hex })
  }

  const copy = async () => {
    const ok = await copyText(`background: ${css};`)
    setCopyState(ok ? 'ok' : 'fail')
    if (ok) announce('Gradient CSS copied.')
  }

  const stopField = (stop, label) => (
    <div className="hw-field">
      <label className="hw-label" htmlFor={`hw-grad-${stop}`}>{label}</label>
      <div className="hw-stop">
        <input
          type="color"
          className="hw-stop-well"
          value={gradient[stop]}
          aria-label={`${label} colour picker`}
          onChange={(e) => pickStop(stop, e.target.value)}
        />
        <input
          id={`hw-grad-${stop}`}
          type="text"
          className="hw-input hw-input-hex"
          value={drafts[stop]}
          spellCheck="false"
          autoComplete="off"
          maxLength={7}
          aria-invalid={invalid[stop] || undefined}
          aria-describedby={invalid[stop] ? `hw-grad-${stop}-err` : undefined}
          onChange={(e) => commitStop(stop, e.target.value)}
        />
      </div>
      {invalid[stop] && (
        <p className="hw-field-err" id={`hw-grad-${stop}-err`}>
          Use a hex value like #7C3AED. The preview still shows {gradient[stop]}.
        </p>
      )}
    </div>
  )

  return (
    <div className="hw-body">
      <div className="hw-grad-preview" style={{ background: css }} aria-hidden="true" />

      <div className="hw-fields">
        {stopField('from', 'Start')}
        {stopField('to', 'End')}
        <div className="hw-field hw-field-grow">
          <label className="hw-label" htmlFor="hw-grad-angle">Angle · {gradient.angle}°</label>
          <input
            id="hw-grad-angle"
            type="range"
            min="0"
            max="360"
            step="1"
            value={gradient.angle}
            onChange={(e) => onChange({ ...gradient, angle: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="hw-out">
        <code className="hw-code">background: {css};</code>
        <button type="button" className="hw-btn" onClick={copy}>Copy CSS</button>
      </div>

      {copyState === 'fail' && (
        <p className="hw-alert" role="alert">
          This browser blocked the clipboard. The CSS above can be selected and copied manually.
        </p>
      )}

      <div className="hw-foot">
        <Link className="hw-continue" to="/color/gradient">
          Continue in Gradient Generator
          <span aria-hidden="true">→</span>
        </Link>
        <span className="hw-foot-note">Two stops here · multi-stop, presets and gallery there.</span>
      </div>
    </div>
  )
}

/* ── 3 · Image ───────────────────────────────────────────────────────────── */

// Bundled reference thumbnails — 880×495 WebP, shipped with the site. No stock
// CDN, no 4K source fetch: "4K" is an output INTENT handed to File Converter,
// never something encoded here.
const IMAGE_REFERENCES = [
  {
    id: 'architecture',
    label: 'Architecture',
    src: '/previews/home-image-converter/architecture.webp',
    alt: 'Reference photograph: a concrete and glass building facade in raking daylight.',
  },
  {
    id: 'people',
    label: 'People',
    src: '/previews/home-image-converter/people.webp',
    alt: 'Reference photograph: two people talking in a bright interior, faces in soft light.',
  },
  {
    id: 'nature',
    label: 'Nature',
    src: '/previews/home-image-converter/nature.webp',
    alt: 'Reference photograph: a forested valley under low cloud.',
  },
]

const REFERENCE_W = 880
const REFERENCE_H = 495

const DEFAULT_IMAGE_STATE = {
  reference: IMAGE_REFERENCES[0].id,
  draft: { ...DEFAULT_IMAGE_DRAFT },
}

function labelOf(list, id) {
  return list.find((item) => item.id === id)?.label || ''
}

function ImagePanel({ state, onChange, announce }) {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const tabRefs = useRef([])
  // Only references the visitor has actually opened get an <img>, so exactly one
  // thumbnail is fetched on first paint and none are fetched speculatively.
  const [visited, setVisited] = useState(() => [state.reference])
  const [loaded, setLoaded] = useState({})
  const [failed, setFailed] = useState({})
  const [error, setError] = useState('')
  const [handingOff, setHandingOff] = useState(false)
  // A second activation must not create a second transfer, even before React
  // has re-rendered the disabled button.
  const lockRef = useRef(false)

  const { reference, draft } = state
  const activeIndex = IMAGE_REFERENCES.findIndex((r) => r.id === reference)
  const limit = describeCompressionLimit(draft.format, draft.compression)
  const intent = `${labelOf(DRAFT_RESOLUTIONS, draft.resolution)} · ${labelOf(DRAFT_FORMATS, draft.format)} · ${labelOf(DRAFT_COMPRESSIONS, draft.compression)}`

  const selectReference = (id) => {
    if (!visited.includes(id)) setVisited((v) => [...v, id])
    // Output choices deliberately survive a reference change — only Reset
    // returns them to the starting intent.
    onChange({ ...state, reference: id })
  }

  const onRefKeyDown = (event, index) => {
    const next = tabKeyIndex(event.key, index, IMAGE_REFERENCES.length)
    if (next < 0) return
    event.preventDefault()
    selectReference(IMAGE_REFERENCES[next].id)
    tabRefs.current[next]?.focus()
  }

  const setDraft = (patch) => {
    onChange({ ...state, draft: { ...draft, ...patch } })
  }

  const reset = () => {
    if (!visited.includes(DEFAULT_IMAGE_STATE.reference)) {
      setVisited((v) => [...v, DEFAULT_IMAGE_STATE.reference])
    }
    setError('')
    onChange({ reference: DEFAULT_IMAGE_STATE.reference, draft: { ...DEFAULT_IMAGE_DRAFT } })
    announce('Reset to Architecture, 4K, WebP, Lossless.')
  }

  // The OS picker must open inside this trusted activation: no promise, timeout,
  // animation callback or navigation may run first, or the browser blocks it.
  const openPicker = () => {
    if (lockRef.current) return
    setError('')
    fileRef.current?.click()
  }

  const onFiles = (event) => {
    const { accepted, rejected } = partitionImageFiles(event.target.files)
    event.target.value = ''
    if (!accepted.length) {
      // Cancelling produces no change event at all, so reaching here with no
      // accepted file means a real unsupported selection.
      if (rejected.length) {
        setError('Those files are not images this converter reads. Choose PNG, JPEG, WebP, GIF, SVG, BMP, AVIF or ICO and try again.')
      }
      return
    }
    if (lockRef.current) return
    lockRef.current = true
    setHandingOff(true)
    if (!setImageHandoff(accepted, draft)) {
      lockRef.current = false
      setHandingOff(false)
      setError('Those files could not be handed over. Choose them again to retry.')
      return
    }
    try {
      navigate('/file-converter')
    } catch {
      // The destination will never mount, so drop the staged record rather than
      // leave it to surprise a later visit. The visitor keeps the draft and can
      // choose the same files again.
      resetImageHandoff()
      lockRef.current = false
      setHandingOff(false)
      setError('Opening File Converter failed. Choose your images again to retry.')
    }
  }

  const activeRef = IMAGE_REFERENCES[activeIndex] || IMAGE_REFERENCES[0]

  return (
    <div className="hw-body">
      <div className="hw-subtabs" role="tablist" aria-label="Built-in reference images">
        {IMAGE_REFERENCES.map((r, index) => (
          <button
            key={r.id}
            ref={(node) => { tabRefs.current[index] = node }}
            type="button"
            role="tab"
            id={`hw-ref-tab-${r.id}`}
            aria-controls="hw-ref-panel"
            aria-selected={r.id === reference}
            tabIndex={r.id === reference ? 0 : -1}
            className="hw-subtab"
            onClick={() => selectReference(r.id)}
            onKeyDown={(event) => onRefKeyDown(event, index)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="hw-img-split">
        <div
          className="hw-ref"
          id="hw-ref-panel"
          role="tabpanel"
          aria-labelledby={`hw-ref-tab-${activeRef.id}`}
        >
          {failed[activeRef.id] ? (
            <p className="hw-ref-msg">
              The {activeRef.label} preview could not load. Your output settings are unchanged — pick
              another reference or try your own image.
            </p>
          ) : (
            !loaded[activeRef.id] && <p className="hw-ref-msg" aria-hidden="true">Loading {activeRef.label} reference…</p>
          )}
          {IMAGE_REFERENCES.filter((r) => visited.includes(r.id)).map((r) => (
            <img
              key={r.id}
              className="hw-ref-img"
              src={r.src}
              alt={r.alt}
              width={REFERENCE_W}
              height={REFERENCE_H}
              decoding="async"
              hidden={r.id !== reference || !!failed[r.id]}
              onLoad={() => setLoaded((s) => ({ ...s, [r.id]: true }))}
              onError={() => setFailed((s) => ({ ...s, [r.id]: true }))}
            />
          ))}
        </div>

        <div className="hw-img-controls">
          <div className="hw-fields">
            <div className="hw-field">
              <label className="hw-label" htmlFor="hw-img-res">Resolution</label>
              <select
                id="hw-img-res"
                className="hw-select"
                value={draft.resolution}
                onChange={(e) => setDraft({ resolution: e.target.value })}
              >
                {DRAFT_RESOLUTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label} — {r.detail}</option>
                ))}
              </select>
            </div>
            <div className="hw-field">
              <label className="hw-label" htmlFor="hw-img-fmt">File type</label>
              <select
                id="hw-img-fmt"
                className="hw-select"
                value={draft.format}
                onChange={(e) => setDraft({ format: e.target.value })}
              >
                {DRAFT_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="hw-field">
              <label className="hw-label" htmlFor="hw-img-comp">Compression</label>
              <select
                id="hw-img-comp"
                className="hw-select"
                value={draft.compression}
                onChange={(e) => setDraft({ compression: e.target.value })}
              >
                {DRAFT_COMPRESSIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <p className="hw-intent">
            <span className="hw-intent-label">Output intent</span>
            <strong>{intent}</strong>
            <span className="hw-intent-note">Nothing is converted here — File Converter does the encoding.</span>
          </p>

          {limit && <p className="hw-limit">{limit}</p>}
        </div>
      </div>

      {error && (
        <p className="hw-alert" role="alert">
          {error}{' '}
          <button type="button" className="hw-link-btn" onClick={openPicker}>Choose images again</button>
        </p>
      )}

      <div className="hw-foot">
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept={ACCEPT_IMAGE}
          multiple
          onChange={onFiles}
        />
        <button
          type="button"
          className="hw-continue hw-continue-go"
          disabled={handingOff}
          onClick={openPicker}
        >
          {handingOff ? 'Opening File Converter…' : 'Try your image'}
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hw-btn" onClick={reset} disabled={handingOff}>Reset</button>
        <span className="hw-foot-note">Your files open in File Converter with this draft applied.</span>
      </div>
    </div>
  )
}

/* ── 4 · Icon ────────────────────────────────────────────────────────────── */

// The bundled allowlist, drawn inline. The homepage never calls Iconify,
// Logo.dev or any other catalogue; the real editor resolves the same names.
const ICON_PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 20l-3.2-3.2',
  house: 'M4 11l8-6 8 6M6 10v9h12v-9',
  heart: 'M12 20s-7-4.6-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.4-9.2 9-9.2 9z',
  star: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0',
  mail: 'M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2M3 8l9 6 9-6',
  image: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M9 10.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0M5 17l4.5-4 4 3.5 3-2.5L20 17',
  lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2M8 11V8a4 4 0 0 1 8 0v3',
  cloud: 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 18z',
  zap: 'M13 3 5 14h5l-1 7 8-11h-5z',
  'circle-check': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 12l2.5 2.5L16 9',
  calendar: 'M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2M4 11h16M8 4v4M16 4v4',
}

const DEFAULT_ICON_STATE = {
  name: DEFAULT_ICON_DRAFT.name,
  size: DEFAULT_ICON_DRAFT.size,
  stroke: DEFAULT_ICON_DRAFT.stroke,
}

function IconGlyph({ name, size, stroke }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

function IconPanel({ state, onChange, announce }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(false)
  const lockRef = useRef(false)

  const draft = buildIconDraft(state)

  const patch = (next) => {
    setError('')
    onChange({ ...state, ...next })
  }

  const openEditor = () => {
    if (lockRef.current) return
    if (!draft) {
      setError('That combination is not one the editor supports. Pick another icon, size or stroke.')
      return
    }
    lockRef.current = true
    setOpening(true)
    if (!setIconDraft(draft)) {
      lockRef.current = false
      setOpening(false)
      setError('That draft could not be handed over. Try again.')
      return
    }
    announce(`Opening ${state.name} in the Icon Editor.`)
    try {
      navigate('/icons')
    } catch {
      resetIconDraft()
      lockRef.current = false
      setOpening(false)
      setError('Opening the Icon Editor failed. Your preview is unchanged — try again.')
    }
  }

  return (
    <div className="hw-body">
      <div className="hw-icon-split">
        <div className="hw-icon-stage">
          <div className="hw-icon-preview">
            <IconGlyph name={state.name} size={state.size} stroke={state.stroke} />
          </div>
          <p className="hw-icon-meta">{state.name} · {state.size}px · {state.stroke} stroke</p>
        </div>

        <div className="hw-icon-side">
          <div className="hw-icon-grid" role="group" aria-label="Preview icon">
            {ICON_DRAFT_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className="hw-icon-cell"
                aria-pressed={state.name === name}
                aria-label={`Preview the ${name.replace(/-/g, ' ')} icon`}
                onClick={() => patch({ name })}
              >
                <IconGlyph name={name} size={22} stroke={state.stroke} />
              </button>
            ))}
          </div>

          <div className="hw-fields">
            <div className="hw-field">
              <label className="hw-label" htmlFor="hw-icon-size">Size</label>
              <select
                id="hw-icon-size"
                className="hw-select"
                value={state.size}
                onChange={(e) => patch({ size: Number(e.target.value) })}
              >
                {ICON_DRAFT_SIZES.map((s) => <option key={s} value={s}>{s} px</option>)}
              </select>
            </div>
            <div className="hw-field">
              <label className="hw-label" htmlFor="hw-icon-stroke">Stroke</label>
              <select
                id="hw-icon-stroke"
                className="hw-select"
                value={state.stroke}
                onChange={(e) => patch({ stroke: Number(e.target.value) })}
              >
                {ICON_DRAFT_STROKES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <p className="hw-note">
        A free taste of the editor: twelve Lucide icons, three sizes, four stroke widths. Nothing here
        saves to My Icons, downloads an asset or counts against a plan.
      </p>

      {error && <p className="hw-alert" role="alert">{error}</p>}

      <div className="hw-foot">
        <button
          type="button"
          className="hw-continue hw-continue-go"
          disabled={!draft || opening}
          onClick={openEditor}
        >
          {opening ? 'Opening Icon Editor…' : 'Continue in Icon Editor'}
          <span aria-hidden="true">→</span>
        </button>
        <span className="hw-foot-note">Opens {state.name} in the real editor · 200k+ icons there.</span>
      </div>
    </div>
  )
}

/* ── 5 · Typography ─────────────────────────────────────────────────────── */

const TYPE_RATIOS = [
  { value: 1.2, label: 'Minor third · 1.2' },
  { value: 1.25, label: 'Major third · 1.25' },
  { value: 1.333, label: 'Perfect fourth · 1.333' },
]

const DEFAULT_TYPE_STATE = {
  base: 16,
  ratio: 1.25,
  sample: 'Build interfaces that hold up.',
}

const TYPE_STEPS = [
  { label: 'Display', exponent: 3 },
  { label: 'Heading', exponent: 2 },
  { label: 'Body', exponent: 0 },
  { label: 'Caption', exponent: -1 },
]

function TypographyPanel({ state, onChange, announce }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(false)
  const lockRef = useRef(false)

  const patch = (next) => {
    setError('')
    onChange({ ...state, ...next })
  }

  const openScale = () => {
    if (lockRef.current) return
    lockRef.current = true
    setOpening(true)
    const staged = setScaleDraft({
      heading: { family: 'Inter', weight: 700, category: 'sans-serif' },
      body: { family: 'Inter', weight: 400, category: 'sans-serif' },
      scale: { base: state.base, ratio: state.ratio },
    })
    if (!staged) {
      lockRef.current = false
      setOpening(false)
      setError('That type scale could not be handed over. Check the base size and ratio, then try again.')
      return
    }
    announce(`Opening a ${state.base}px type scale in the Type Scale Generator.`)
    try {
      navigate('/typescale')
    } catch {
      resetScaleDraft()
      lockRef.current = false
      setOpening(false)
      setError('Opening the Type Scale Generator failed. Your preview is unchanged — try again.')
    }
  }

  return (
    <div className="hw-body">
      <div className="hw-type-split">
        <div className="hw-type-preview" aria-label="Live type scale preview">
          {TYPE_STEPS.map((step) => {
            const size = Math.round(state.base * Math.pow(state.ratio, step.exponent) * 10) / 10
            return (
              <div className="hw-type-row" key={step.label}>
                <span className="hw-type-meta">{step.label} · {size}px</span>
                <span
                  className="hw-type-sample"
                  ref={(node) => node?.style.setProperty('--hw-type-size', `${size}px`)}
                >
                  {state.sample}
                </span>
              </div>
            )
          })}
        </div>

        <div className="hw-type-side">
          <div className="hw-fields">
            <div className="hw-field">
              <label className="hw-label" htmlFor="hw-type-base">Base size</label>
              <input
                id="hw-type-base"
                className="hw-input"
                type="number"
                min="8"
                max="40"
                step="1"
                value={state.base}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next) && next >= 8 && next <= 40) patch({ base: next })
                }}
              />
            </div>
            <div className="hw-field hw-field-grow">
              <label className="hw-label" htmlFor="hw-type-ratio">Scale ratio</label>
              <select
                id="hw-type-ratio"
                className="hw-select"
                value={state.ratio}
                onChange={(event) => patch({ ratio: Number(event.target.value) })}
              >
                {TYPE_RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hw-field">
            <label className="hw-label" htmlFor="hw-type-sample">Preview text</label>
            <input
              id="hw-type-sample"
              className="hw-input"
              type="text"
              value={state.sample}
              onChange={(event) => patch({ sample: event.target.value })}
            />
          </div>

          <nav className="hw-type-tools" aria-label="Typography tools">
            <Link className="hw-type-tool" to="/fontgallery">
              <NavIcon id="type" />
              <span><strong>Font Gallery</strong><small>Browse and compare families</small></span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="hw-type-tool" to="/fontpairs">
              <NavIcon id="font-pair" />
              <span><strong>Font Pair</strong><small>Build a reasoned pairing</small></span>
              <span aria-hidden="true">→</span>
            </Link>
            <button type="button" className="hw-type-tool" onClick={openScale} disabled={opening}>
              <NavIcon id="typography" />
              <span><strong>Type Scale</strong><small>Continue with this live scale</small></span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>
        </div>
      </div>

      <p className="hw-note">
        This preview calculates real sizes from your base and ratio. It does not save a font kit;
        the full tools handle family selection, pair reasoning and developer exports.
      </p>

      {error && <p className="hw-alert" role="alert">{error}</p>}

      <div className="hw-foot">
        <button
          type="button"
          className="hw-continue hw-continue-go"
          disabled={opening}
          onClick={openScale}
        >
          {opening ? 'Opening Type Scale…' : 'Continue in Type Scale'}
          <span aria-hidden="true">→</span>
        </button>
        <span className="hw-foot-note">Carries the {state.base}px base and {state.ratio} ratio once.</span>
      </div>
    </div>
  )
}

/* ── the workbench ───────────────────────────────────────────────────────── */

export default function HomeWorkbench() {
  const [active, setActive] = useState(HOME_WORKBENCH_TABS[0].id)
  const [status, setStatus] = useState('')
  const tabRefs = useRef([])

  // One state bag per mode, held here so switching tabs keeps the session's
  // edits. Reload deliberately returns to defaults.
  const [swatches, setSwatches] = useState(makePalette)
  const [gradient, setGradient] = useState(DEFAULT_GRADIENT)
  const [image, setImage] = useState(DEFAULT_IMAGE_STATE)
  const [icon, setIcon] = useState(DEFAULT_ICON_STATE)
  const [typography, setTypography] = useState(DEFAULT_TYPE_STATE)

  const announce = useCallback((message) => setStatus(message), [])

  const onTabKeyDown = (event, index) => {
    const next = tabKeyIndex(event.key, index, HOME_WORKBENCH_TABS.length)
    if (next < 0) return
    event.preventDefault()
    setActive(HOME_WORKBENCH_TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  const activeTab = HOME_WORKBENCH_TABS.find((t) => t.id === active) || HOME_WORKBENCH_TABS[0]

  return (
    <section className="hw" id="workbench" aria-labelledby="hw-title">
      <div className="home-container">
        <div className="hw-head">
          <span className="home-eyebrow">Live workspace</span>
          <h2 className="home-h2" id="hw-title">Turn scattered tools into one working surface.</h2>
          <p className="home-lede">
            A limited but real slice of the workspace: the values below are generated, editable and
            yours to take into the full tool. Nothing is saved and no account is needed.
          </p>
        </div>

        <div className="hw-shell" data-hue={activeTab.hue}>
          <div className="hw-tabs" role="tablist" aria-label="Workbench modes">
            {HOME_WORKBENCH_TABS.map((tab, index) => (
              <button
                key={tab.id}
                ref={(node) => { tabRefs.current[index] = node }}
                type="button"
                role="tab"
                id={`hw-tab-${tab.id}`}
                aria-controls="hw-panel"
                aria-selected={tab.id === active}
                tabIndex={tab.id === active ? 0 : -1}
                className="hw-tab"
                data-tab={tab.id}
                data-active={tab.id === active}
                onClick={() => setActive(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                <NavIcon id={tab.icon} className="hw-tab-icon" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div
            className="hw-panel"
            id="hw-panel"
            role="tabpanel"
            aria-labelledby={`hw-tab-${activeTab.id}`}
          >
            {active === 'palette' && (
              <PalettePanel swatches={swatches} onChange={setSwatches} announce={announce} />
            )}
            {active === 'gradient' && (
              <GradientPanel gradient={gradient} onChange={setGradient} announce={announce} />
            )}
            {active === 'image' && (
              <ImagePanel state={image} onChange={setImage} announce={announce} />
            )}
            {active === 'icon' && (
              <IconPanel state={icon} onChange={setIcon} announce={announce} />
            )}
            {active === 'typography' && (
              <TypographyPanel state={typography} onChange={setTypography} announce={announce} />
            )}
          </div>

          <p className="sr-only" role="status" aria-live="polite">{status}</p>
          <span className="hw-splash" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
