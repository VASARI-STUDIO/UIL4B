import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ColorPickerPop from './ColorPickerPop'
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
import { setBoardDraft } from '../utils/colorHandoff'
import { derivePreviewRoles } from '../utils/colors'
import {
  L_RAMP, cardGrounds, hslToHex, labelGround, mutedInk, readableInk,
} from '../utils/workbenchInk'
import { useTheme } from '../contexts/ThemeContext'
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
// All five panels' state lives here, so switching tabs keeps a visitor's edits
// for the session. A reload deliberately returns to safe defaults — no
// persistence is added just to make a preview survive.
//
// V2 RE-FRAMING (feat/v2-homepage): the five panels, their state, their copy
// hand-offs and their keyboard/ARIA wiring are UNCHANGED. What changed is that
// the shell can now be rendered on its own (`variant="sticky"`) so the V2
// sticky-scroll section can house it in its right-hand column, and the active
// mode can be driven from outside (`activeTab` / `onTabChange`) so the left
// column's step narrative and this tablist stay one shared selection rather
// than two competing ones. Uncontrolled use — `<HomeWorkbench />` — behaves
// exactly as before.

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

// The colour system the Palette Builder must open on when a visitor continues
// from here. Auto is the tonal system, and it is the one system that is FREE
// for everyone — so a signed-out visitor arriving straight off the homepage
// lands somewhere they can actually work. Without this hand-off the board fell
// through to its own default, 'analogous', which is paid.
const HANDOFF_SYSTEM = 'auto'


function makeSwatch(baseHue, i) {
  const h = (baseHue + i * 14 + (Math.random() * 8 - 4) + 360) % 360
  const s = 60 + Math.random() * 16
  return { hex: hslToHex(h, s, L_RAMP[i]), locked: false }
}

function makePalette() {
  const baseHue = Math.floor(Math.random() * 360)
  return L_RAMP.map((_, i) => makeSwatch(baseHue, i))
}

// The chart's shape is FIXED. Only the colours come from the palette, so
// pressing Generate changes the thing under test and nothing else — a chart
// that also re-rolled its curve would make two variables move at once and you
// could no longer tell whether the ramp or the data had changed.
//
// Twelve readings on a 100 × 32 viewBox, plotted with preserveAspectRatio
// "none" so the curve stretches to whatever width the panel has. Values are
// the SVG y (small = high), so this series trends upward.
const UI_SERIES = [24, 27, 20, 25, 18, 22, 14, 17, 10, 13, 7, 4]

const UI_CHART_W = 100
const UI_CHART_H = 32

function seriesPath(values, close) {
  const step = UI_CHART_W / (values.length - 1)
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${v}`).join(' ')
  return close ? `${line} L${UI_CHART_W},${UI_CHART_H} L0,${UI_CHART_H} Z` : line
}

// Three rows is enough to put ramp steps side by side in a real context and
// short enough that the card never becomes the page.
const UI_ROWS = [
  { name: 'Design tokens', state: 'Shipped' },
  { name: 'Component library', state: 'In review' },
  { name: 'Documentation', state: 'Draft' },
]

/**
 * Zone 1 of the Palette mode: the artefact.
 *
 * This panel used to BE the five swatches — a labelled colour row presented as
 * a live product preview. Every comparable token editor sampled on Mobbin
 * (v0, Lovable, GitBook, Gamma) previews a palette on real application UI and
 * none of them previews it as a swatch row, for the reason the row cannot
 * answer: swatches show you five colours, a UI shows you whether they COMPOSE.
 * The swatch row is still here — it moved to the controls zone, where it is the
 * input it always was.
 *
 * ROLES COME FROM derivePreviewRoles(), THE SAME ENGINE THE FULL TOOLS USE.
 * The first version of this hand-rolled its own luminance sort and picked
 * darkest-as-primary, lightest-as-tint. That was a seventh copy of a luminance
 * calculation this codebase already has, and it was worse than the original:
 * derivePreviewRoles picks `primary` by CHROMA subject to a 3:1 floor on the
 * surface (not by darkness), rejects a primary that clashes with its own
 * background, falls back to the brand focal for an all-grey palette, derives
 * `text` by contrast rather than ever using a swatch for copy, and self-heals
 * every pair to AA before returning. It is also mode-aware, which is what makes
 * this mock correct in dark theme rather than merely legible.
 *
 * Using it also means the homepage preview and the Palette Builder / Colour
 * Studio previews now speak one language: the same palette produces the same
 * roles wherever a visitor meets it.
 *
 * Inert and aria-hidden, exactly like `.hw-chrome` and `.hw-grad-preview`
 * above it: nothing inside is focusable, no control is impersonated, and every
 * hex it paints is announced for real by the swatch buttons below.
 */
function PaletteStage({ swatches }) {
  const { theme } = useTheme()
  const hexes = swatches.map((s) => s.hex)
  const role = derivePreviewRoles(hexes, { mode: theme === 'dark' ? 'dark' : 'light' })
  // The step the engine spent as the card's own background cannot also be a dot
  // ON that card — it paints itself invisible. Caught in dark theme, where `bg`
  // is the darkest step and the first row simply had no dot: a preview implying
  // the palette contains an unusable colour, when in fact the preview had taken
  // that colour for its ground. The dots compare steps against each other on
  // the card; a step that IS the card is not one of them.
  // Compared against BOTH the derived step and the ground finally painted: if
  // labelGround moved the card background, a dot equal to the original step is
  // no longer an exact match but is still invisible against it.
  const cardBg = cardGrounds(role.bg, role.surface).bg
  const dots = hexes.filter((h) => {
    const v = h.toLowerCase()
    return v !== String(role.bg).toLowerCase() && v !== String(cardBg).toLowerCase()
  })
  /*
   * THE GROUND MOVES FIRST, AND THAT IS THE WHOLE FIX.
   *
   * #346 guaranteed the muted INK against both grounds and got the failure rate
   * down, but could not reach zero, because the remaining case is one where no
   * ink of any lightness clears 4.5:1 — a mid-luminance chromatic fill. The
   * generator makes those constantly: L_RAMP is [34, 47, 60, 73, 86], a band
   * centred on exactly the luminance where both poles are equidistant and
   * neither wins. Choosing a better ink cannot solve a ground that admits no
   * good ink; the ground has to move. labelGround does that and only that — it
   * returns the fill unchanged in the common case and walks its lightness only
   * as far as an achromatic ink requires, keeping hue and saturation.
   *
   * MEASURED ON THE RENDERED PAGE, 60 rerolls per theme, compositing the true
   * ground rather than reading each element's own background. Dark theme only;
   * light was already clean.
   *   .hw-ui-app          7/60  (11.67%)  worst 3.56  #f2f3f5 on #358b9a
   *   .hw-ui-crumb        3/60  ( 5.00%)  worst 3.95  #ffffff on #358b9a
   *   .hw-ui-delta        3/60  ( 5.00%)  worst 3.95
   *   .hw-ui-metric-label 2/60  ( 3.33%)  worst 4.29  #141414 on #2d8c21
   *   .hw-ui-row-state    6/180 ( 3.33%)  worst 4.29
   *   .hw-ui-metric-num   1/60  ( 1.67%)  worst 4.26  #f2f3f5 on #1f7e8f
   *   .hw-ui-row-name     3/180 ( 1.67%)  worst 4.26
   *
   * NOTE WHAT THAT LIST CONTAINS. The backlog item was filed about the MUTED
   * role, and its arithmetic estimate was a 2.5% residual with a 4.22 floor.
   * Measured on the page it is worse and it is wider: role.text fails too, and
   * .hw-ui-app is the worst offender at 3.56:1 — the product name, 14px/700, in
   * the card the palette preview exists to sell. An arithmetic estimate that
   * assumed the ground equalled role.surface missed it because it assumed the
   * thing that was wrong. So role.text goes through the same guarantee as
   * role.muted; both land on both grounds, so both need both.
   */
  const { bg, surface } = cardGrounds(role.bg, role.surface)
  const muted = mutedInk(role.muted, [bg, surface])
  const text = mutedInk(role.text, [bg, surface])
  const dotSeries = dots.length ? dots : hexes
  return (
    <div className="hw-ui" aria-hidden="true" style={{ background: bg, borderColor: role.border }}>
      <div className="hw-ui-bar" style={{ background: surface, borderBottomColor: role.border }}>
        <span className="hw-ui-mark" style={{ background: labelGround(role.primary), color: readableInk(role.primary) }}>A</span>
        <span className="hw-ui-app" style={{ color: text }}>Acme</span>
        <span className="hw-ui-crumb" style={{ color: muted }}>Overview</span>
        <span className="hw-ui-avatar" style={{ background: labelGround(role.accent), color: readableInk(role.accent) }}>M</span>
      </div>

      <div className="hw-ui-main">
        <div className="hw-ui-metric">
          <span className="hw-ui-metric-label" style={{ color: muted }}>Sessions this week</span>
          <span className="hw-ui-metric-row">
            <strong className="hw-ui-metric-num" style={{ color: text }}>12,480</strong>
            <span className="hw-ui-delta" style={{ background: surface, color: muted, border: `1px solid ${role.border}` }}>+12.4%</span>
          </span>
        </div>

        {/* An area chart, because that is what the sampled editors preview a
            palette on — v0 and Lovable both lead with one. It is also the
            element that shows an accent doing its actual job: carrying a shape
            at 2px against a background, which a 96px swatch never has to. */}
        <svg className="hw-ui-chart" viewBox={`0 0 ${UI_CHART_W} ${UI_CHART_H}`} preserveAspectRatio="none" focusable="false">
          <path d={seriesPath(UI_SERIES, true)} fill={role.primary} opacity=".14" />
          <path d={seriesPath(UI_SERIES, false)} fill="none" stroke={role.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Where the ramp gets compared. The dots stay the RAW generated
            colours in generated order — this is the one place the palette is
            shown as itself rather than through a role, and re-sorting or
            re-deriving them would hide a generator that produced two
            near-identical steps. They are decoration beside a text label, never
            the only carrier of meaning. */}
        <ul className="hw-ui-rows">
          {UI_ROWS.map((row, i) => (
            <li className="hw-ui-row" key={row.name} style={{ borderTopColor: role.border }}>
              <span className="hw-ui-dot" style={{ background: dotSeries[i % dotSeries.length] || role.primary }} />
              <span className="hw-ui-row-name" style={{ color: text }}>{row.name}</span>
              <span className="hw-ui-row-state" style={{ color: muted }}>{row.state}</span>
            </li>
          ))}
        </ul>

        <div className="hw-ui-acts">
          {/* `primaryBorder` is the engine's own remedy for a CTA that cannot
              clear 3:1 on its card — transparent when it is not needed. */}
          <span className="hw-ui-btn" style={{ background: role.primary, color: role.onPrimary, border: `1px solid ${role.primaryBorder}` }}>Primary action</span>
          {/* `text`, not `role.text`. This was the one label in the card still
              reading the engine value raw while every sibling above took the
              mutedInk guarantee, and it measured 4.39:1 (#F2F3F5 on #8B6D22)
              in dark. It went unseen because .hw-ui-btn was missing from test
              8c's selector list, which is the same shape of hole as the
              rgba-only parser: not a wrong answer, an answer never attempted. */}
          <span className="hw-ui-btn hw-ui-btn--ghost" style={{ borderColor: role.border, color: text }}>Secondary</span>
        </div>
      </div>
    </div>
  )
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
      {/* Zone 1 — the artefact. See the `.hw-stage` / `.hw-controls` block in
          global.css: the stage holds what the mode produces, the controls hold
          what changes it, and the two are never interleaved. */}
      <div className="hw-stage">
        <PaletteStage swatches={swatches} />
      </div>

      {/* Zone 2 — the controls. The swatch row is an INPUT: lock, copy, and
          the value each button announces. It reads as the palette rail under
          the canvas, which is where every sampled editor puts it. */}
      <div className="hw-controls">
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
              <span className="hw-pal-hex" style={{ background: labelGround(s.hex) }}>{s.hex}</span>
              {copiedHex === s.hex && <span className="hw-pal-tick" aria-hidden="true" style={{ background: labelGround(s.hex) }}>Copied</span>}
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

      </div>

      <div className="hw-foot">
        {/* Stays a real <Link> with a real href, so middle-click / open-in-new-tab
            still work — those start a fresh module instance, which legitimately
            finds no staged draft and opens the builder in its normal state. */}
        <Link
          className="hw-continue"
          to="/create/palette"
          onClick={() => setBoardDraft(swatches.map((s) => s.hex), HANDOFF_SYSTEM)}
        >
          Continue in Palette Builder
          <span aria-hidden="true">→</span>
        </Link>
        <span className="hw-foot-note">Your five swatches carry over on the free Auto system · full ramps, roles and export there.</span>
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

  // "sRGB hex", not "Hex". For a product whose pitch is defensible colour
  // systems, naming the space is both more correct and a credibility signal,
  // and it costs four characters.
  const stopField = (stop, label) => (
    <div className="hw-field">
      <label className="hw-label" htmlFor={`hw-grad-${stop}`}>
        {label} <span className="hw-label-space">sRGB hex</span>
      </label>
      <div className="hw-stop">
        {/* The shared picker — the homepage demo is the first colour control
            most visitors ever touch here, so it must be the same one the tools
            use rather than the operating system's. */}
        <ColorPickerPop
          value={gradient[stop]}
          ariaLabel={`${label} colour picker`}
          onChange={(hex) => pickStop(stop, hex)}
          triggerClassName="hw-stop-well"
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
      <div className="hw-stage">
        <div className="hw-grad-preview" style={{ background: css }} aria-hidden="true" />
      </div>

      <div className="hw-controls">
      <div className="hw-fields">
        {stopField('from', 'Start')}
        {stopField('to', 'End')}
      </div>

      {/* A property, so a label-left / control-right row with the number as a
          real input. On this column a slider alone cannot land on 135 degrees,
          so the readout is the precise control and the slider the coarse one —
          the arrangement Salesforce uses for Border Radius and MagicPath for
          every type-scale value. The range keeps the id, so the existing
          contract (`#hw-grad-angle`) still points at the slider. */}
      <div className="hw-prop">
        <label className="hw-prop-label" htmlFor="hw-grad-angle">Angle</label>
        <input
          id="hw-grad-angle"
          className="hw-prop-range"
          type="range"
          min="0"
          max="360"
          step="1"
          value={gradient.angle}
          onChange={(e) => onChange({ ...gradient, angle: Number(e.target.value) })}
        />
        <div className="hw-prop-num">
          <input
            className="hw-num"
            type="number"
            min="0"
            max="360"
            step="1"
            value={gradient.angle}
            aria-label="Gradient angle in degrees"
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isFinite(next)) onChange({ ...gradient, angle: Math.min(360, Math.max(0, next)) })
            }}
          />
          <span className="hw-num-unit" aria-hidden="true">&deg;</span>
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

      </div>

      <div className="hw-foot">
        <Link className="hw-continue" to="/create/gradient">
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
      navigate('/create/file-converter')
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
      {/* The reference picker belongs to the ARTEFACT, not the controls — it
          chooses what the canvas shows, so it travels with the canvas. */}
      <div className="hw-stage">
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

      </div>

      <div className="hw-controls">
        {/* File type is a closed set of OPTIONS, so a rail. Resolution and
            compression are PROPERTIES with a described value, so rows. The
            rail also collapses a label+select pair onto one line, which is
            most of the vertical room this mode was short of. */}
        <div className="hw-rail-group">
          <span className="hw-rail-label" id="hw-img-fmt-label">File type</span>
          <div className="hw-rail" role="group" aria-labelledby="hw-img-fmt-label">
            {DRAFT_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="hw-tile"
                aria-pressed={draft.format === f.id}
                onClick={() => setDraft({ format: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hw-prop">
          <label className="hw-prop-label" htmlFor="hw-img-res">Resolution</label>
          <select
            id="hw-img-res"
            className="hw-select hw-prop-select"
            value={draft.resolution}
            onChange={(e) => setDraft({ resolution: e.target.value })}
          >
            {DRAFT_RESOLUTIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label} — {r.detail}</option>
            ))}
          </select>
        </div>

        <div className="hw-prop">
          <label className="hw-prop-label" htmlFor="hw-img-comp">Compression</label>
          <select
            id="hw-img-comp"
            className="hw-select hw-prop-select"
            value={draft.compression}
            onChange={(e) => setDraft({ compression: e.target.value })}
          >
            {DRAFT_COMPRESSIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <p className="hw-intent">
          <span className="hw-intent-label">Output intent</span>
          <strong>{intent}</strong>
          <span className="hw-intent-note">Nothing is converted here — File Converter does the encoding.</span>
        </p>

        {limit && <p className="hw-limit">{limit}</p>}

      {error && (
        <p className="hw-alert" role="alert">
          {error}{' '}
          <button type="button" className="hw-link-btn" onClick={openPicker}>Choose images again</button>
        </p>
      )}

      </div>

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
      navigate('/create/icons')
    } catch {
      resetIconDraft()
      lockRef.current = false
      setOpening(false)
      setError('Opening the Icon Editor failed. Your preview is unchanged — try again.')
    }
  }

  return (
    <div className="hw-body">
      <div className="hw-stage hw-icon-stage">
        <div className="hw-icon-preview">
          <IconGlyph name={state.name} size={state.size} stroke={state.stroke} />
        </div>
        <p className="hw-icon-meta">{state.name} · {state.size}px · {state.stroke} stroke</p>
      </div>

      <div className="hw-controls">
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

        {/* Sizes and strokes are OPTIONS, so rails rather than a stack of
            selects. Two selects with labels cost ~130px, two rails ~76px, and
            every value is now one click instead of two. */}
        <div className="hw-rail-group">
          <span className="hw-rail-label" id="hw-icon-size-label">Size</span>
          <div className="hw-rail" role="group" aria-labelledby="hw-icon-size-label">
            {ICON_DRAFT_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                className="hw-tile"
                aria-pressed={state.size === sz}
                aria-label={`Icon size ${sz} pixels`}
                onClick={() => patch({ size: sz })}
              >
                {sz}<span className="hw-tile-unit" aria-hidden="true">px</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hw-rail-group">
          <span className="hw-rail-label" id="hw-icon-stroke-label">Stroke</span>
          <div className="hw-rail" role="group" aria-labelledby="hw-icon-stroke-label">
            {ICON_DRAFT_STROKES.map((st) => (
              <button
                key={st}
                type="button"
                className="hw-tile"
                aria-pressed={state.stroke === st}
                aria-label={`Stroke width ${st}`}
                onClick={() => patch({ stroke: st })}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

      <p className="hw-note">
        A free taste of the editor: twelve Lucide icons, three sizes, four stroke widths. Nothing here
        saves to My Icons, downloads an asset or counts against a plan.
      </p>

      {error && <p className="hw-alert" role="alert">{error}</p>}

      </div>

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

// `short` is the tile face; `label` stays the accessible name, so the rail
// reads "Minor third · 1.2" to a screen reader while the tile shows the
// interval and its number.
const TYPE_RATIOS = [
  { value: 1.2, short: 'Minor 3rd', label: 'Minor third · 1.2' },
  { value: 1.25, short: 'Major 3rd', label: 'Major third · 1.25' },
  { value: 1.333, short: 'Perfect 4th', label: 'Perfect fourth · 1.333' },
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
  const [baseDraft, setBaseDraft] = useState(() => String(state.base))
  const lockRef = useRef(false)

  const patch = (next) => {
    setError('')
    onChange({ ...state, ...next })
  }

  const commitBase = () => {
    const raw = baseDraft.trim()
    const numeric = Number(raw)
    const next = raw && Number.isFinite(numeric)
      ? Math.min(40, Math.max(8, numeric))
      : state.base
    setBaseDraft(String(next))
    if (next !== state.base) patch({ base: next })
    return next
  }

  const openScale = () => {
    if (lockRef.current) return
    lockRef.current = true
    setOpening(true)
    const base = commitBase()
    const staged = setScaleDraft({
      scale: { base, ratio: state.ratio },
    })
    if (!staged) {
      lockRef.current = false
      setOpening(false)
      setError('That type scale could not be handed over. Check the base size and ratio, then try again.')
      return
    }
    announce(`Opening a ${base}px type scale in the Type Scale Generator.`)
    try {
      navigate('/create/type-scale')
    } catch {
      resetScaleDraft()
      lockRef.current = false
      setOpening(false)
      setError('Opening the Type Scale Generator failed. Your preview is unchanged — try again.')
    }
  }

  return (
    <div className="hw-body">
      <div className="hw-stage">
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

      </div>

        <div className="hw-controls hw-type-side">
          {/* Base size is a PROPERTY: label left, editable number right. Ratio
              is a set of named OPTIONS, so it becomes a rail below rather than
              a third select. */}
          <div className="hw-prop">
            <label className="hw-prop-label" htmlFor="hw-type-base">Base size</label>
            <div className="hw-prop-num hw-prop-num--wide">
              <input
                id="hw-type-base"
                className="hw-num"
                type="number"
                min="8"
                max="40"
                step="1"
                value={baseDraft}
                onChange={(event) => {
                  const raw = event.target.value
                  setBaseDraft(raw)
                  const numeric = Number(raw)
                  // Preserve an empty/partial draft for keyboard replacement,
                  // while valid complete values continue to update the preview.
                  if (raw.trim() && Number.isFinite(numeric) && numeric >= 8 && numeric <= 40) {
                    patch({ base: numeric })
                  }
                }}
                onBlur={commitBase}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitBase()
                    event.currentTarget.blur()
                  }
                }}
              />
              <span className="hw-num-unit" aria-hidden="true">px</span>
            </div>
          </div>

          <div className="hw-rail-group">
            <span className="hw-rail-label" id="hw-type-ratio-label">Scale ratio</span>
            <div className="hw-rail" role="group" aria-labelledby="hw-type-ratio-label">
              {TYPE_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  type="button"
                  className="hw-tile hw-tile--wide"
                  aria-pressed={state.ratio === ratio.value}
                  aria-label={ratio.label}
                  onClick={() => patch({ ratio: ratio.value })}
                >
                  {ratio.short}<span className="hw-tile-unit" aria-hidden="true">{ratio.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hw-prop">
            <label className="hw-prop-label" htmlFor="hw-type-sample">Preview text</label>
            <input
              id="hw-type-sample"
              className="hw-input hw-prop-text"
              type="text"
              value={state.sample}
              onChange={(event) => patch({ sample: event.target.value })}
            />
          </div>

          <nav className="hw-type-tools" aria-label="Typography tools">
            <Link className="hw-type-tool" to="/create/font-gallery">
              <NavIcon id="type" />
              <span><strong>Font Gallery</strong><small>Browse and compare families</small></span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="hw-type-tool" to="/create/font-pair">
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

      <p className="hw-note">
        This preview calculates real sizes from your base and ratio. It does not save a font kit;
        the full tools handle family selection, pair reasoning and developer exports.
      </p>

      {error && <p className="hw-alert" role="alert">{error}</p>}

        </div>

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

export default function HomeWorkbench({ variant = 'section', activeTab, onTabChange }) {
  // Controlled when `activeTab` is supplied, uncontrolled otherwise. The
  // internal value is kept in step either way, so a caller can hand the
  // selection over mid-session (the V2 scroll sync does exactly that) without
  // the tablist ever losing its own roving tab stop.
  const [internal, setInternal] = useState(HOME_WORKBENCH_TABS[0].id)
  const active = activeTab ?? internal
  const setActive = useCallback((id) => {
    setInternal(id)
    onTabChange?.(id)
  }, [onTabChange])
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

  const activeMeta = HOME_WORKBENCH_TABS.find((t) => t.id === active) || HOME_WORKBENCH_TABS[0]

  const shell = (
        <div className="hw-shell" data-hue={activeMeta.hue}>
          {/* App chrome. The shell was a bare card with tabs, so the "live
              workspace" claim above it was carried entirely by the copy. This
              is the same furniture the real tool pages wear — a title bar, the
              route you are notionally standing in, and the state readout — so
              the panel reads as a window into the product rather than as a
              marketing widget that happens to be interactive.

              Decorative and inert: aria-hidden, nothing focusable, no route
              claimed that does not exist. The breadcrumb tracks the active tab,
              so it is never lying about where you are. */}
          <div className="hw-chrome" aria-hidden="true">
            <span className="hw-chrome-dots"><i /><i /><i /></span>
            <span className="hw-chrome-crumb">
              <span className="hw-chrome-app">UIL4B</span>
              <span className="hw-chrome-sep">/</span>
              <span className="hw-chrome-route">Create</span>
              <span className="hw-chrome-sep">/</span>
              <span className="hw-chrome-here">{activeMeta.label}</span>
            </span>
            <span className="hw-chrome-live"><i />Live preview</span>
          </div>
          <div className="hw-tabs rail-overflow" role="tablist" aria-label="Workbench modes">
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
            aria-labelledby={`hw-tab-${activeMeta.id}`}
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
        </div>
  )

  // The V2 sticky column supplies its own frame, heading and narrative, so the
  // shell travels there bare. Everything inside it — state, clipboard, keyboard
  // handling, ARIA wiring, hand-offs — is byte-for-byte the same component.
  if (variant === 'sticky') return shell

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

        {shell}
      </div>
    </section>
  )
}
