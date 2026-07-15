import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import {
  applyAdjust, autoTonalPalette, contrastRatio, derivePreviewRoles,
  generateHarmony, hctToHex, hexToHct, hexToHsl, hslToHex, mixHex, simCvd,
  textColorForBg, tonalRamp,
} from '../utils/colors'
import { FREE_VARIATIONS, paletteVariations, scorePalette } from '../utils/paletteVariations'
import { BRAND_PALETTES } from '../data/brandPalettes'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'

// Palette Builder — the standalone /color/palette workbench. A Coolors-style
// full-bleed board: a toolbar (seed + harmony + brands/variations/preview +
// vision + randomise + save/share), full-height colour columns with per-column
// tools (drag-reorder, HCT edit, tints, right-click menu), and a bottom
// global-adjust bar. Runs on the exact same colour engine as the merged Colour
// Studio (utils/colors.js), so palettes built here match the studio's output.

const DEFAULT_SEED = '#4338E0'
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']
const PRO_MAX = 8   // free ceiling on TOTAL columns — free palettes can hold up to 8
const HARD_MAX = 10 // absolute ceiling so the board never becomes slivers

// Harmony options for the Colour System dropdown. `free` mirrors the studio's
// CSYS_HARMS split, plus the tonal Auto system which is always free.
const HARMONIES = [
  { id: 'auto', label: 'Auto', free: true },
  { id: 'monochromatic', label: 'Monochromatic', free: true },
  { id: 'analogous', label: 'Analogous', free: false },
  { id: 'complement', label: 'Complementary', free: false },
  { id: 'triadic', label: 'Triadic', free: false },
  { id: 'split', label: 'Split', free: false },
  { id: 'tetradic', label: 'Tetradic', free: false },
  { id: 'custom', label: 'Custom', free: false },
]

// Colour-vision preview modes — same ids simCvd understands.
const VISION_MODES = [
  ['normal', 'Normal'],
  ['protanopia', 'Protanopia'],
  ['deuteranopia', 'Deuteranopia'],
  ['tritanopia', 'Tritanopia'],
  ['achromatopsia', 'Achromatopsia'],
]

// Global adjust lens — identical field spec to the studio ({h,s,b,temp}).
// snapRadius is absolute (track units): the hue track is ±180 so the default
// 6%-of-range radius (±21°) swallowed everything near a snap — the "hue feels
// buggy" report. Tight radii keep snaps magnetic without eating the range.
const ADJUST_FIELDS = [
  { key: 'h', label: 'Hue', min: -180, max: 180, unit: '°', snaps: [-90, 0, 90], snapRadius: 8 },
  { key: 's', label: 'Saturation', min: -100, max: 100, unit: '%', snaps: [-50, 0, 50], snapRadius: 6 },
  { key: 'b', label: 'Tone', min: -100, max: 100, unit: '%', snaps: [-50, 0, 50], snapRadius: 6 },
  { key: 'temp', label: 'Temperature', min: -100, max: 100, unit: '', snaps: [-50, 0, 50], snapRadius: 6 },
]
const ZERO_ADJUST = { h: 0, s: 0, b: 0, temp: 0 }

// Tones for the expanded per-colour tints panel (click the mini ramp to open).
const TINT_TONES = [95, 90, 80, 70, 60, 50, 40, 30, 20, 10]

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
const SUBMISSIONS_KEY = 'vs-community-submissions' // same store Community.jsx reads

// '#Abc' / 'aabbcc' → canonical '#AABBCC'; null when the string isn't a hex.
function normaliseHex(raw) {
  const m = HEX_RE.exec((raw || '').trim())
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex.toUpperCase()}`
}

// Perceptual midpoint of two colours (shortest hue arc in HCT) — what the
// click-between-columns insert produces. HSL mix if the solver throws.
function midColor(a, b) {
  try {
    const [h1, c1, t1] = hexToHct(a)
    const [h2, c2, t2] = hexToHct(b)
    const d = ((h2 - h1 + 540) % 360) - 180
    const hex = hctToHex((((h1 + d / 2) % 360) + 360) % 360, (c1 + c2) / 2, (t1 + t2) / 2)
    return normaliseHex(hex) || a
  } catch {
    return normaliseHex(mixHex(a, b, 0.5)) || a
  }
}

// Shared palettes arrive as /color/palette?c=4338E0,7C6CF0,… — parse or null.
function colorsFromQuery() {
  try {
    const c = new URLSearchParams(window.location.search).get('c')
    if (!c) return null
    const list = c.split(',').map(normaliseHex).filter(Boolean)
    return list.length >= 2 ? list.slice(0, HARD_MAX) : null
  } catch {
    return null
  }
}

// "From image" — downsample to a small canvas, histogram 12-bit RGB buckets,
// then keep the most-common buckets that are visually distinct. A lightweight
// dominant-colour pull (no k-means) — plenty for seeding a palette board.
function extractImageColors(file, count) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const size = 72
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        const buckets = new Map()
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
          const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 }
          b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; b.n++
          buckets.set(key, b)
        }
        const ranked = [...buckets.values()].sort((a, b) => b.n - a.n)
        const picks = []
        for (const b of ranked) {
          const rgb = [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)]
          const dupe = picks.some(p => Math.hypot(p.rgb[0] - rgb[0], p.rgb[1] - rgb[1], p.rgb[2] - rgb[2]) < 48)
          if (dupe) continue
          picks.push({ rgb, hex: '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() })
          if (picks.length >= count) break
        }
        resolve(picks.map(p => p.hex))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that image')) }
    img.src = url
  })
}

// Legible-ink contrast of a swatch → the AA badge. textColorForBg picks the ink,
// so the badge reports the contrast a label ON this colour actually gets.
function badgeFor(hex) {
  const ink = textColorForBg(hex) === 'rgba(0,0,0,.85)' ? '#000000' : '#FFFFFF'
  const ratio = contrastRatio(hex, ink)
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA18' : 'LOW'
  return { level, ratio }
}

// Column colour + legible ink through CSS custom properties — the
// no-inline-styles route (same pattern as TintTool's swatchRef).
function colRef(color, ink) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--plb-c', color)
    el.style.setProperty('--plb-ink', ink)
  }
}
function barRef(color) {
  return (el) => { if (el) el.style.setProperty('--plb-rc', color) }
}
// Right-click menu position (clamped to the viewport) through custom props.
function ctxPosRef(x, y) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--plb-mx', `${Math.min(x, window.innerWidth - 220)}px`)
    el.style.setProperty('--plb-my', `${Math.min(y, window.innerHeight - 330)}px`)
  }
}
// Preview scene roles → --pv-* custom props on the scene root.
function pvRef(roles) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--pv-bg', roles.bg)
    el.style.setProperty('--pv-surface', roles.surface)
    el.style.setProperty('--pv-primary', roles.primary)
    el.style.setProperty('--pv-onprimary', roles.onPrimary)
    el.style.setProperty('--pv-accent', roles.accent)
    el.style.setProperty('--pv-text', roles.text)
    el.style.setProperty('--pv-muted', roles.muted)
    el.style.setProperty('--pv-border', roles.border)
    el.style.setProperty('--pv-pborder', roles.primaryBorder)
  }
}

// ── Tiny mono icons (stroke = currentColor, so they inherit the column ink) ──
function Ico({ size = 15, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const IcoLock = ({ open, size }) => (
  <Ico size={size}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    {open ? <path d="M8 11V7a4 4 0 0 1 7.6-1.7" /> : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
  </Ico>
)
const IcoSwap = () => (
  <Ico><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></Ico>
)
const IcoCopy = () => (
  <Ico><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Ico>
)
const IcoX = () => <Ico><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Ico>
const IcoImage = () => (
  <Ico size={13}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Ico>
)
const IcoShuffle = () => (
  <Ico size={13}><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="m4 4 5 5" /></Ico>
)
const IcoChevron = () => <Ico size={12}><path d="m6 9 6 6 6-6" /></Ico>
const IcoPlus = ({ size }) => <Ico size={size}><path d="M12 5v14" /><path d="M5 12h14" /></Ico>
const IcoEye = () => (
  <Ico size={13}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Ico>
)
const IcoGrip = () => (
  <Ico><circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" /></Ico>
)
const IcoSliders = () => (
  <Ico><path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M2 14h4" /><path d="M10 8h4" /><path d="M18 16h4" /></Ico>
)
const IcoContrast = () => (
  <Ico size={13}><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 7a5 5 0 0 1 0 10" /></Ico>
)
const IcoSpark = () => (
  <Ico size={13}><path d="m12 3 2.1 6.4L21 12l-6.9 2.6L12 21l-2.1-6.4L3 12l6.9-2.6L12 3Z" /></Ico>
)
const IcoCheck = ({ size = 13 }) => (
  <Ico size={size}><path d="m20 6-11 11-5-5" /></Ico>
)
const IcoBookmark = () => (
  <Ico size={13}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /></Ico>
)
const IcoDownload = () => (
  <Ico size={13}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></Ico>
)
const IcoUsers = () => (
  <Ico size={13}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></Ico>
)
// Harmony-wheel glyph for the Colour System button (Image 2 "system" graphic).
const IcoSystem = ({ size = 13 }) => (
  <Ico size={size}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="4" r="1.5" /><circle cx="19" cy="8.5" r="1.5" /><circle cx="19" cy="15.5" r="1.5" /><circle cx="12" cy="20" r="1.5" /><circle cx="5" cy="15.5" r="1.5" /><circle cx="5" cy="8.5" r="1.5" /></Ico>
)
// A distinct little wheel glyph per harmony type, echoing Image 2's option pills.
const HARM_GLYPHS = {
  auto: <><circle cx="12" cy="12" r="2.2" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" /></>,
  monochromatic: <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,
  analogous: <><circle cx="7" cy="15" r="1.5" /><circle cx="12" cy="9" r="1.5" /><circle cx="17" cy="15" r="1.5" /></>,
  complement: <><circle cx="6" cy="12" r="1.7" /><circle cx="18" cy="12" r="1.7" /><path d="M8 12h8" /></>,
  triadic: <><circle cx="12" cy="5" r="1.6" /><circle cx="6" cy="17" r="1.6" /><circle cx="18" cy="17" r="1.6" /></>,
  split: <><circle cx="12" cy="5" r="1.5" /><circle cx="6" cy="16" r="1.5" /><circle cx="18" cy="16" r="1.5" /><path d="M12 6.5v4M12 10.5 7.5 14.5M12 10.5l4.5 4" /></>,
  tetradic: <><circle cx="7" cy="7" r="1.5" /><circle cx="17" cy="7" r="1.5" /><circle cx="7" cy="17" r="1.5" /><circle cx="17" cy="17" r="1.5" /></>,
  custom: <><path d="M4 20h16" /><path d="M6 15.5 14 7.5l2.5 2.5-8 8H6z" /></>,
}
const HarmonyGlyph = ({ id, size = 14 }) => <Ico size={size}>{HARM_GLYPHS[id] || HARM_GLYPHS.auto}</Ico>
// One icon per colour-vision mode for the Vision dropdown.
const VISION_GLYPHS = {
  normal: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  protanopia: <><path d="M12 3s6 6.7 6 10.5a6 6 0 0 1-12 0C6 9.7 12 3 12 3Z" /></>,
  deuteranopia: <><path d="M12 3s6 6.7 6 10.5a6 6 0 0 1-12 0C6 9.7 12 3 12 3Z" /><path d="M9.5 13.5h5" /></>,
  tritanopia: <><path d="M12 3s6 6.7 6 10.5a6 6 0 0 1-12 0C6 9.7 12 3 12 3Z" /><path d="M12 9v7" /></>,
  achromatopsia: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" /></>,
}
const VisionGlyph = ({ id, size = 14 }) => <Ico size={size}>{VISION_GLYPHS[id] || VISION_GLYPHS.normal}</Ico>

// ── HctPicker — per-column Hue·Chroma·Tone editor (the M3 space the whole
// engine runs in), plus a hex field. Edits the RAW colour; the global adjust
// lens still applies on top, same as every other way of setting a colour. ──
function HctPicker({ hex, label, onChange, onClose }) {
  const [hct, setHct] = useState(() => {
    try {
      const [h, c, t] = hexToHct(hex)
      if ([h, c, t].every(Number.isFinite)) return { h: Math.round(h), c: Math.round(c), t: Math.round(t) }
    } catch { /* HSL approximation below */ }
    const [h, s, l] = hexToHsl(hex)
    return { h: Math.round(h), c: Math.round(s * 0.6), t: Math.round(l) }
  })
  const [draft, setDraft] = useState(hex)

  const emit = (next) => {
    setHct(next)
    let out
    try { out = hctToHex(next.h, next.c, next.t) }
    catch { out = hslToHex(next.h, Math.min(100, next.c), Math.min(95, Math.max(5, next.t))) }
    const norm = normaliseHex(out)
    if (norm) { setDraft(norm); onChange(norm) }
  }
  const commitDraft = () => {
    const norm = normaliseHex(draft)
    if (!norm) { setDraft(hex); return }
    setDraft(norm)
    onChange(norm)
    try {
      const [h, c, t] = hexToHct(norm)
      if ([h, c, t].every(Number.isFinite)) setHct({ h: Math.round(h), c: Math.round(c), t: Math.round(t) })
    } catch { /* keep slider state */ }
  }

  return (
    <div className="plb-pop plb-picker" role="dialog" aria-label={`Edit ${label} in HCT`}>
      <div className="plb-pop-head">
        <span className="plb-pop-title">Edit — HCT</span>
        <button type="button" className="plb-pop-x" aria-label="Close editor" onClick={onClose}><IcoX /></button>
      </div>
      {[
        { key: 'h', label: 'Hue', min: 0, max: 360, unit: '°', snaps: [0, 90, 180, 270], snapRadius: 6 },
        { key: 'c', label: 'Chroma', min: 0, max: 130, unit: '', snaps: [] },
        { key: 't', label: 'Tone', min: 0, max: 100, unit: '', snaps: [50], snapRadius: 3 },
      ].map(f => (
        <div className="plb-picker-row" key={f.key}>
          <span className="plb-picker-label">{f.label}</span>
          <SnapSlider
            min={f.min}
            max={f.max}
            value={hct[f.key]}
            snaps={f.snaps}
            snapRadius={f.snapRadius}
            unit={f.unit}
            onChange={(v) => emit({ ...hct, [f.key]: Math.round(v) })}
            ariaLabel={`${f.label} of ${label}`}
          />
        </div>
      ))}
      <div className="plb-picker-hexrow">
        <span className="plb-picker-chip" ref={barRef(hex)} aria-hidden="true" />
        <input
          type="text"
          className="plb-picker-hex"
          value={draft}
          spellCheck="false"
          autoComplete="off"
          aria-label={`Hex value of ${label}`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft() } }}
        />
      </div>
    </div>
  )
}

// ── PreviewScene — the palette mapped onto a miniature product UI through
// derivePreviewRoles, so "will this actually ship?" gets answered visually. ──
function PreviewScene({ colors, mode, title }) {
  const roles = derivePreviewRoles(colors, { mode })
  return (
    <div className="plb-pvwrap">
      {title && <div className="plb-pv-name">{title}</div>}
      <div className="plb-pv" ref={pvRef(roles)} aria-hidden="true">
        <aside className="plb-pv-side">
          <span className="plb-pv-logo" />
          <span className="plb-pv-navline plb-pv-navline--on" />
          <span className="plb-pv-navline" />
          <span className="plb-pv-navline" />
          <span className="plb-pv-navline" />
        </aside>
        <div className="plb-pv-main">
          <div className="plb-pv-h">Weekly overview</div>
          <div className="plb-pv-p">Your palette mapped to real UI roles</div>
          <div className="plb-pv-cards">
            <div className="plb-pv-card"><span className="plb-pv-k">Views</span><span className="plb-pv-n">4,821</span></div>
            <div className="plb-pv-card"><span className="plb-pv-k">Saves</span><span className="plb-pv-n plb-pv-n--accent">312</span></div>
            <div className="plb-pv-card"><span className="plb-pv-k">Shares</span><span className="plb-pv-n">96</span></div>
          </div>
          <div className="plb-pv-bars">
            {colors.slice(0, 8).map((c, i) => (
              <span key={i} className={`plb-pv-bar plb-pv-bar--${(i % 5) + 1}`} ref={barRef(c)} />
            ))}
          </div>
          <span className="plb-pv-cta">Primary action</span>
        </div>
      </div>
    </div>
  )
}

export default function PaletteBuilder({ onCopy, toast }) {
  const { design, setPalette, saveProject, overwriteProject, projects, canSaveProjects } = useProject()
  const { isPro } = useSubscription()

  // Colours are the source of truth (positional: index 0–4 = the five ROLES,
  // beyond = ALTERNATIVE n). Seed + harmony act as a generator over the
  // unlocked slots; a shared ?c= link or a carried-in project wins first paint.
  const [colors, setColors] = useState(() =>
    colorsFromQuery()
    || (design?.palette?.colors?.length >= 2 ? design.palette.colors.slice(0, HARD_MAX) : generateHarmony(DEFAULT_SEED, 'analogous'))
  )
  const [seed, setSeed] = useState(() => colorsFromQuery()?.[0] || design?.palette?.base || DEFAULT_SEED)
  const [seedInput, setSeedInput] = useState(seed)
  const [harmony, setHarmony] = useState(() =>
    (HARMONIES.some(h => h.id === design?.palette?.harmony) ? design.palette.harmony : 'analogous')
  )
  const [locked, setLocked] = useState(() => new Set(design?.palette?.locked || []))
  const [adjust, setAdjust] = useState(() => design?.palette?.globalAdjust || ZERO_ADJUST)
  const [vision, setVision] = useState('normal')
  const [showContrast, setShowContrast] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')

  // Toolbar popovers + board popovers (one open at a time, dismiss on
  // outside pointerdown or Escape — handled by the shared effect below).
  const [saveOpen, setSaveOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [harmOpen, setHarmOpen] = useState(false)
  const [varsOpen, setVarsOpen] = useState(false)
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [visionOpen, setVisionOpen] = useState(false)
  // Variation persistence: `varBase` is the frozen palette snapshot the current
  // variation list is derived from, `activeVar` the id of the one the user picked.
  // Picking a variation preserves the base (via the skip guard) so reopening the
  // menu shows the same list with the active row ticked; any real edit to the
  // palette clears both so the list regenerates off the new colours.
  const [varBase, setVarBase] = useState(null)
  const [activeVar, setActiveVar] = useState(null)
  const skipVarInvalidate = useRef(false)
  const [tintsIdx, setTintsIdx] = useState(null)   // column with the tints panel open
  const [pickerIdx, setPickerIdx] = useState(null) // column with the HCT editor open
  const [ctxMenu, setCtxMenu] = useState(null)     // { i, x, y } right-click menu
  const [preview, setPreview] = useState(null)     // { mode, compare } modal
  const [saveName, setSaveName] = useState('')
  const [submitName, setSubmitName] = useState('')
  const fileRef = useRef(null)

  // Drag-reorder plumbing + the grow-in animation slot for inserted colours.
  const dragFrom = useRef(null)
  const [overIdx, setOverIdx] = useState(null)
  const [animIdx, setAnimIdx] = useState(null)
  const animTimer = useRef(null)
  const flashIn = (i) => {
    setAnimIdx(i)
    clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimIdx(null), 450)
  }
  useEffect(() => () => clearTimeout(animTimer.current), [])

  const seedValid = normaliseHex(seedInput) != null

  // The adjust lens is non-destructive: `colors` stays raw, exports/labels use
  // the adjusted values, and the board shows the vision-simulated version.
  const adjusted = useMemo(() => applyAdjust(colors, adjust), [colors, adjust])
  const view = useMemo(() => adjusted.map(c => simCvd(c, vision)), [adjusted, vision])
  const paletteScore = useMemo(() => scorePalette(adjusted), [adjusted])
  const variations = useMemo(() => (varBase ? paletteVariations(varBase) : []), [varBase])

  // Any genuine change to the palette (manual edit, randomise, harmony change,
  // brand pick) invalidates the frozen variation snapshot so the list rebuilds.
  // Picking a variation sets the skip guard first, so applying one does NOT
  // rotate the list — the active row just gets ticked.
  useEffect(() => {
    if (skipVarInvalidate.current) { skipVarInvalidate.current = false; return }
    setVarBase(null)
    setActiveVar(null)
  }, [colors, adjust])

  // Freeze a snapshot the first time the menu opens (or after invalidation).
  useEffect(() => {
    if (varsOpen && !varBase) setVarBase(applyAdjust(colors, adjust))
  }, [varsOpen, varBase, colors, adjust])

  // Keep ProjectContext in sync so Save/overwrite capture the live palette and
  // the merged studio picks it up (same persisted shape as the studio writes).
  useEffect(() => {
    setPalette({ base: seed, harmony, colors: adjusted, extraColors: adjusted.slice(ROLES.length), globalAdjust: adjust, locked: [...locked], activeIdx: 0 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, harmony, adjusted.join(','), JSON.stringify(adjust), locked])

  // Regenerate the current system over the UNLOCKED role slots; extras stay.
  const regen = (fromSeed, type) => {
    let gen
    try {
      gen = type === 'auto' ? autoTonalPalette(hexToHsl(fromSeed)[0]) : generateHarmony(fromSeed, type)
    } catch {
      gen = generateHarmony(fromSeed, 'analogous')
    }
    setColors(prev => prev.map((c, i) => (i < gen.length && !locked.has(i) ? normaliseHex(gen[i]) || c : c)))
  }

  const setFromSeedInput = (raw) => {
    setSeedInput(raw)
    const norm = normaliseHex(raw)
    if (norm) { setSeed(norm); regen(norm, harmony) }
  }

  const pickHarmony = (h) => {
    if (!h.free && !isPro) { toast?.('Harmony systems are a Pro feature — upgrade to unlock'); return }
    setHarmony(h.id)
    setHarmOpen(false)
    regen(seed, h.id)
  }

  // Randomise — harmony-aware: the tonal Auto engine when a tonal system is
  // active, otherwise a fresh random seed run through the CURRENT harmony, so
  // randomise explores the system you chose instead of discarding it. Locked
  // colours always survive; HSL fallback if the HCT solver ever throws.
  const randomize = useCallback(() => {
    let fresh
    try {
      if (harmony === 'auto' || harmony === 'monochromatic') {
        fresh = autoTonalPalette()
      } else {
        // Seed in confident brand territory, not muddy mid-tones: request high
        // chroma (48–92 — the HCT solver gamut-clamps per hue, so pale hues like
        // yellow settle lower automatically) at tone 46–60, the band where a
        // primary reads well on both light and dark surfaces.
        const seedHex = hctToHex(Math.random() * 360, 48 + Math.random() * 44, 46 + Math.random() * 14)
        fresh = generateHarmony(seedHex, harmony)
      }
      fresh = fresh.map(c => normaliseHex(c)).filter(Boolean)
      if (fresh.length < ROLES.length) throw new Error('palette invalid')
    } catch {
      fresh = ROLES.map(() => hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30)))
      toast?.('Colour engine fell back to a simple random palette')
    }
    setColors(prev => prev.map((c, i) => {
      if (locked.has(i)) return c
      if (i < fresh.length) return fresh[i]
      return hslToHex(Math.floor(Math.random() * 360), 50 + Math.floor(Math.random() * 40), 50 + Math.floor(Math.random() * 30))
    }))
    if (!locked.has(0)) { setSeed(fresh[0]); setSeedInput(fresh[0]) }
    setLiveMsg('Palette randomised')
  }, [harmony, locked, toast])

  // Spacebar = randomise (never while typing in a field or with a modal open).
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      if (preview) return
      e.preventDefault()
      randomize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [randomize, preview])

  // One dismiss layer for every popover: outside pointerdown or Escape closes
  // toolbar menus (anything not inside a .plb-menuwrap) and board popovers
  // (anything not inside a .plb-pop). Escape also closes the preview modal.
  const anyPopover = saveOpen || shareOpen || harmOpen || varsOpen || brandsOpen || visionOpen
    || tintsIdx != null || pickerIdx != null || ctxMenu != null || preview != null
  useEffect(() => {
    if (!anyPopover) return
    const closeMenus = () => { setSaveOpen(false); setShareOpen(false); setHarmOpen(false); setVarsOpen(false); setBrandsOpen(false); setVisionOpen(false) }
    const closePops = () => { setTintsIdx(null); setPickerIdx(null); setCtxMenu(null) }
    const onDown = (e) => {
      if (!e.target.closest('.plb-menuwrap')) closeMenus()
      if (!e.target.closest('.plb-pop')) closePops()
    }
    const onEsc = (e) => {
      if (e.key !== 'Escape') return
      closeMenus(); closePops(); setPreview(null)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [anyPopover])

  const toggleLock = (i) => {
    setLocked(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i); setLiveMsg(`Colour ${i + 1} unlocked`) }
      else { next.add(i); setLiveMsg(`Colour ${i + 1} locked`) }
      return next
    })
  }

  // ⇄ swaps a column with its right neighbour (the last swaps left) — the
  // quick way to re-assign roles, since roles are positional. Locks follow.
  const swapCols = (i) => {
    const j = i === colors.length - 1 ? i - 1 : i + 1
    if (j < 0 || j === i) return
    setColors(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n })
    setLocked(prev => {
      const next = new Set(prev)
      const a = next.has(i), b = next.has(j)
      next.delete(i); next.delete(j)
      if (a) next.add(j)
      if (b) next.add(i)
      return next
    })
  }

  // Drag-reorder: full splice move (not a swap) so the whole row shifts the
  // way Coolors does it. Locks travel with their colour.
  const moveCol = (from, to) => {
    if (from == null || to == null || from === to) return
    setColors(prev => { const n = [...prev]; const [c] = n.splice(from, 1); n.splice(to, 0, c); return n })
    setLocked(prev => {
      const flags = colors.map((_, k) => prev.has(k))
      const [f] = flags.splice(from, 1)
      flags.splice(to, 0, f)
      const next = new Set()
      flags.forEach((v, k) => { if (v) next.add(k) })
      return next
    })
    setLiveMsg(`Colour moved to position ${to + 1}`)
  }

  const removeCol = (i) => {
    if (colors.length <= 2) { toast?.('A palette needs at least two colours'); return }
    setColors(prev => prev.filter((_, k) => k !== i))
    setLocked(prev => {
      const next = new Set()
      prev.forEach(k => { if (k < i) next.add(k); else if (k > i) next.add(k - 1) })
      return next
    })
    setTintsIdx(null); setPickerIdx(null); setCtxMenu(null)
  }

  // Single insert path for the Add block AND the click-between gaps — gates
  // the caps, shifts locks right, and flags the slot for the grow-in animation.
  const insertAt = (idx, hex) => {
    if (colors.length >= HARD_MAX) { toast?.(`Palettes max out at ${HARD_MAX} colours`); return }
    if (!isPro && colors.length >= PRO_MAX) { toast?.(`Palettes beyond ${PRO_MAX} colours are a Pro feature — upgrade to unlock`); return }
    setColors(prev => { const n = [...prev]; n.splice(idx, 0, hex); return n })
    setLocked(prev => {
      const next = new Set()
      prev.forEach(k => next.add(k >= idx ? k + 1 : k))
      return next
    })
    flashIn(idx)
    setLiveMsg('Colour added')
  }

  const addCol = () => {
    const [h] = hexToHsl(colors[colors.length - 1])
    insertAt(colors.length, normaliseHex(hslToHex((h + 40) % 360, 62, 58)) || DEFAULT_SEED)
  }
  const insertBetween = (i) => insertAt(i + 1, midColor(colors[i], colors[Math.min(i + 1, colors.length - 1)]))

  const setColorAt = (i, hex) => {
    setColors(prev => prev.map((c, k) => (k === i ? hex : c)))
    if (i === 0) { setSeed(hex); setSeedInput(hex) }
  }

  const onImageFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const picks = await extractImageColors(file, colors.length)
      if (!picks.length) throw new Error('No colours found in that image')
      setColors(prev => prev.map((c, i) => (!locked.has(i) && picks[i] ? picks[i] : c)))
      if (!locked.has(0) && picks[0]) { setSeed(picks[0]); setSeedInput(picks[0]) }
      setLiveMsg('Palette pulled from the image')
      toast?.('Palette pulled from the image')
    } catch (err) {
      toast?.(err?.message || 'Couldn’t read that image')
    }
  }

  // Apply a whole ready-made palette (variation or brand). Resets the adjust
  // lens — the incoming colours ARE the new baseline. Locked slots survive.
  const applyPalette = (hexes, msg) => {
    const next = hexes.map(c => normaliseHex(c)).filter(Boolean).slice(0, HARD_MAX)
    if (next.length < 2) return
    setColors(prev => {
      const out = next.length >= prev.length ? next : [...next, ...prev.slice(next.length)]
      return out.map((c, i) => (locked.has(i) && prev[i] ? prev[i] : c))
    })
    setAdjust(ZERO_ADJUST)
    if (!locked.has(0)) { setSeed(next[0]); setSeedInput(next[0]) }
    if (msg) { setLiveMsg(msg); toast?.(msg) }
  }

  const pickVariation = (v, idx) => {
    if (!isPro && idx >= FREE_VARIATIONS) { toast?.('More variations are a Pro feature — upgrade to unlock'); return }
    // Preserve the frozen list across this apply so reopening the menu shows the
    // same variations with this one ticked, instead of rotating to a fresh set.
    skipVarInvalidate.current = true
    setActiveVar(v.id)
    applyPalette(v.colors, `Applied variation: ${v.label}`)
    setVarsOpen(false)
  }
  const compareVariation = (v, idx) => {
    if (!isPro) { toast?.('Comparing palettes side-by-side is a Pro feature'); return }
    if (idx >= FREE_VARIATIONS && !isPro) return
    setVarsOpen(false)
    setPreview({ mode: 'light', compare: v })
  }
  const pickBrand = (b) => {
    if (!b.free && !isPro) { toast?.('More brand palettes are a Pro feature — upgrade to unlock'); return }
    applyPalette(b.colors, `Loaded the ${b.name} palette`)
    setBrandsOpen(false)
  }

  const cssExport = useMemo(() => {
    const lines = adjusted.map((c, i) => {
      const role = i < ROLES.length ? ROLES[i].toLowerCase() : `alternative-${i - ROLES.length + 1}`
      return `  --color-${role}: ${c};`
    })
    return `:root {\n${lines.join('\n')}\n}`
  }, [adjusted])

  // Short share URL — /p/:code hits /api/share (vercel.json rewrite), which
  // serves social-preview OG meta + a palette-card image, then redirects
  // humans on to /color/palette?c=... where the ?c= parser picks it up.
  const shareLink = () => `${window.location.origin}/p/${adjusted.map(c => c.slice(1)).join(',')}`

  // Social-card PNG (1200×630) of the palette — the shareable mini version,
  // rendered client-side so it needs no serverless function.
  const downloadPng = () => {
    try {
      const w = 1200, h = 630
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const g = canvas.getContext('2d')
      const cw = w / adjusted.length
      adjusted.forEach((c, i) => {
        g.fillStyle = c
        g.fillRect(Math.floor(i * cw), 0, Math.ceil(cw) + 1, h)
        g.fillStyle = textColorForBg(c) === 'rgba(0,0,0,.85)' ? '#000000' : '#FFFFFF'
        g.font = '600 26px Outfit, system-ui, sans-serif'
        g.textAlign = 'center'
        g.fillText(c, i * cw + cw / 2, h - 42)
      })
      canvas.toBlob((blob) => {
        if (!blob) { toast?.('Couldn’t render the image'); return }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'uil4b-palette.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      })
      setShareOpen(false)
    } catch {
      toast?.('Couldn’t render the image')
    }
  }

  // Community submission — same localStorage store + shape Community.jsx
  // renders, with the palette link as the URL so the card opens this board.
  const submitToCommunity = () => {
    const name = submitName.trim()
    if (!name) { toast?.('Give the palette a name first'); return }
    try {
      const list = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]')
      list.push({
        id: 'u' + Date.now(),
        name,
        author: 'You',
        category: 'Branding',
        url: shareLink(),
        c1: adjusted[0],
        c2: adjusted[1] || adjusted[0],
        colors: adjusted,
        saves: 0,
        mine: true,
      })
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list))
      setSubmitName('')
      setShareOpen(false)
      toast?.('Submitted to the community — thanks!')
    } catch {
      toast?.('Couldn’t submit right now')
    }
  }

  const doSave = () => {
    const name = saveName.trim()
    if (!name) return
    try {
      saveProject(name)
      setSaveName(''); setSaveOpen(false)
      toast?.('Project saved')
    } catch (err) {
      toast?.(err?.message || 'Couldn’t save')
    }
  }

  const adjustDirty = ADJUST_FIELDS.some(f => adjust[f.key] !== 0)
  const activeHarmony = HARMONIES.find(h => h.id === harmony) || HARMONIES[0]
  const activeVision = VISION_MODES.find(([id]) => id === vision) || VISION_MODES[0]

  return (
    <div className="plb">
      <p className="sr-only" aria-live="polite">{liveMsg}</p>

      {/* ── Toolbar ── */}
      <header className="plb-toolbar">
        <div className="plb-toolbar-group">
          <h1 className="plb-title">Palette Builder</h1>
          <div className="plb-seed" ref={colRef(view[0] || seed, 'transparent')}>
            <input
              type="color"
              value={seed}
              onChange={(e) => setFromSeedInput(e.target.value.toUpperCase())}
              aria-label="Pick seed colour"
            />
          </div>
          <input
            type="text"
            className={seedValid ? 'plb-hexfield' : 'plb-hexfield plb-hexfield--bad'}
            value={seedInput}
            onChange={(e) => setFromSeedInput(e.target.value)}
            onBlur={() => setSeedInput(seed)}
            placeholder={DEFAULT_SEED}
            spellCheck="false"
            autoComplete="off"
            aria-invalid={!seedValid}
            aria-label="Seed colour hex"
          />
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-harm"
              aria-expanded={harmOpen}
              aria-haspopup="menu"
              onClick={() => { setVarsOpen(false); setBrandsOpen(false); setSaveOpen(false); setShareOpen(false); setVisionOpen(false); setHarmOpen(o => !o) }}
            >
              <IcoSystem />
              <span className="plb-harm-k">System</span>
              {activeHarmony.label}
              <IcoChevron />
            </button>
            {harmOpen && (
              <div className="plb-menu plb-menu--left plb-harmmenu" role="menu" aria-label="Colour system">
                <div className="plb-menu-title">Colour system</div>
                <div className="plb-harm-grid">
                  {HARMONIES.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={harmony === h.id}
                      className={harmony === h.id ? 'plb-harm-opt plb-harm-opt--on' : 'plb-harm-opt'}
                      onClick={() => pickHarmony(h)}
                    >
                      <HarmonyGlyph id={h.id} size={15} />
                      <span className="plb-harm-opt-l">{h.label}</span>
                      {h.free
                        ? <span className="plb-free">Free</span>
                        : (!isPro && <span className="plb-tab-lock"><IcoLock size={10} /></span>)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="plb-toolbar-group">
          <button type="button" className="btn btn-s" onClick={() => fileRef.current?.click()}>
            <IcoImage /> Image
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="plb-file" onChange={onImageFile} aria-hidden="true" tabIndex={-1} />

          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={brandsOpen}
              onClick={() => { setHarmOpen(false); setVarsOpen(false); setSaveOpen(false); setShareOpen(false); setVisionOpen(false); setBrandsOpen(o => !o) }}
            >
              <IcoBookmark /> Brands
            </button>
            {brandsOpen && (
              <div className="plb-menu plb-menu--left plb-brandmenu" role="menu" aria-label="Brand palettes">
                <div className="plb-menu-title">Brand palettes</div>
                <div className="plb-scrolllist">
                  {BRAND_PALETTES.map(b => {
                    const gated = !b.free && !isPro
                    return (
                      <button
                        key={b.id}
                        type="button"
                        role="menuitem"
                        className={gated ? 'plb-varrow plb-varrow--locked' : 'plb-varrow'}
                        onClick={() => pickBrand(b)}
                      >
                        <span className="plb-strip" aria-hidden="true">
                          {b.colors.map((c, k) => <span key={k} className="plb-strip-c" ref={barRef(c)} />)}
                        </span>
                        <span className="plb-varrow-name">{b.name}</span>
                        {gated && <span className="plb-tab-lock"><IcoLock size={11} /></span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={varsOpen}
              onClick={() => { setHarmOpen(false); setBrandsOpen(false); setSaveOpen(false); setShareOpen(false); setVisionOpen(false); setVarsOpen(o => !o) }}
            >
              <IcoSpark /> Variations
            </button>
            {varsOpen && (
              <div className="plb-menu plb-menu--left plb-varmenu" role="menu" aria-label="Palette variations">
                <div className="plb-menu-title">
                  Variations
                  <span className="plb-score" title="Palette quality score — tone range, evenness, chroma profile and distinctness">Current {paletteScore}</span>
                </div>
                <div className="plb-scrolllist">
                  {variations.map((v, idx) => {
                    const gated = !isPro && idx >= FREE_VARIATIONS
                    const active = activeVar === v.id
                    return (
                      <div key={v.id} className={`plb-varrow${gated ? ' plb-varrow--locked' : ''}${active ? ' plb-varrow--active' : ''}`}>
                        <button type="button" className="plb-varrow-main" onClick={() => pickVariation(v, idx)} aria-pressed={active}>
                          <span className="plb-strip" aria-hidden="true">
                            {v.colors.slice(0, 6).map((c, k) => <span key={k} className="plb-strip-c" ref={barRef(c)} />)}
                          </span>
                          <span className="plb-varrow-name">{v.label}<small>{v.desc}</small></span>
                          {active && <span className="plb-varrow-tick" aria-label="Active variation"><IcoCheck size={13} /></span>}
                          <span className="plb-score">{v.score}</span>
                          {gated && <span className="plb-tab-lock"><IcoLock size={11} /></span>}
                        </button>
                        {!gated && (
                          <button
                            type="button"
                            className="plb-varrow-cmp"
                            title={isPro ? 'Compare with the current palette' : 'Comparing is a Pro feature'}
                            aria-label={`Compare ${v.label} with the current palette`}
                            onClick={() => compareVariation(v, idx)}
                          >
                            <IcoEye />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {variations.length === 0 && <div className="plb-menu-sub">No distinct variations for this palette</div>}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="btn btn-s" onClick={() => setPreview({ mode: 'light', compare: null })}>
            <IcoEye /> Preview
          </button>
          <button
            type="button"
            className={showContrast ? 'btn btn-s plb-tgl plb-tgl--on' : 'btn btn-s plb-tgl'}
            aria-pressed={showContrast}
            title="Show WCAG contrast badges on every colour"
            onClick={() => setShowContrast(v => !v)}
          >
            <IcoContrast /> Contrast
          </button>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={visionOpen}
              aria-haspopup="menu"
              title="Preview the palette through colour-vision deficiencies"
              onClick={() => { setHarmOpen(false); setBrandsOpen(false); setVarsOpen(false); setSaveOpen(false); setShareOpen(false); setVisionOpen(o => !o) }}
            >
              <VisionGlyph id={vision} size={13} />
              <span className="plb-harm-k">Vision</span>
              {activeVision[1]}
              <IcoChevron />
            </button>
            {visionOpen && (
              <div className="plb-menu plb-menu--left plb-vismenu" role="menu" aria-label="Colour-vision preview">
                <div className="plb-menu-title">Colour-vision preview</div>
                {VISION_MODES.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={vision === id}
                    className={vision === id ? 'plb-visopt plb-visopt--on' : 'plb-visopt'}
                    onClick={() => { setVision(id); setVisionOpen(false) }}
                  >
                    <VisionGlyph id={id} size={15} />
                    <span className="plb-visopt-l">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/color" className="btn btn-s" title="Open the full Colour Studio">Studio</NavLink>
          <button type="button" className="btn btn-s btn-accent plb-random" onClick={randomize}>
            <IcoShuffle /> Randomise <kbd className="plb-kbd">Space</kbd>
          </button>
          <span className="plb-toolbar-sep" aria-hidden="true" />
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={saveOpen}
              onClick={() => {
                if (!canSaveProjects) { toast?.('Sign in to save projects'); return }
                setHarmOpen(false); setVarsOpen(false); setBrandsOpen(false); setShareOpen(false); setVisionOpen(false); setSaveOpen(o => !o)
              }}
            >
              Save
            </button>
            {saveOpen && (
              <div className="plb-menu" role="dialog" aria-label="Save palette to a project">
                <div className="plb-menu-title">Save palette to a project</div>
                <div className="plb-menu-row">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') doSave() }}
                    placeholder="Project name…"
                    aria-label="Project name"
                  />
                  <button type="button" className="btn btn-s btn-accent" onClick={doSave}>Save</button>
                </div>
                {projects.length > 0 && (
                  <>
                    <div className="plb-menu-sub">Overwrite existing</div>
                    {projects.slice(-5).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="plb-menu-item"
                        onClick={() => {
                          try { overwriteProject(p.id); setSaveOpen(false); toast?.('Updated: ' + p.name) }
                          catch (err) { toast?.(err?.message || 'Couldn’t save') }
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-dark"
              aria-expanded={shareOpen}
              onClick={() => { setHarmOpen(false); setVarsOpen(false); setBrandsOpen(false); setSaveOpen(false); setVisionOpen(false); setShareOpen(o => !o) }}
            >
              Share <IcoChevron />
            </button>
            {shareOpen && (
              <div className="plb-menu" role="menu" aria-label="Share palette">
                <button type="button" className="plb-menu-item" role="menuitem" onClick={() => { onCopy?.(shareLink()); setShareOpen(false) }}>Copy link to this palette</button>
                <button type="button" className="plb-menu-item" role="menuitem" onClick={() => { onCopy?.(cssExport); setShareOpen(false) }}>Copy CSS variables</button>
                <button type="button" className="plb-menu-item" role="menuitem" onClick={() => { onCopy?.(adjusted.join(', ')); setShareOpen(false) }}>Copy hex values</button>
                <button type="button" className="plb-menu-item" role="menuitem" onClick={downloadPng}><IcoDownload /> Download PNG card</button>
                <div className="plb-menu-sub"><IcoUsers /> Submit to the community</div>
                <div className="plb-menu-row">
                  <input
                    type="text"
                    value={submitName}
                    onChange={(e) => setSubmitName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitToCommunity() }}
                    placeholder="Palette name…"
                    aria-label="Palette name for the community"
                  />
                  <button type="button" className="btn btn-s btn-accent" onClick={submitToCommunity}>Submit</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── The board ── */}
      <div className="plb-board">
        {view.map((c, i) => {
          const ink = textColorForBg(c)
          const { level, ratio } = badgeFor(adjusted[i])
          const ramp = tonalRamp(c)
          const role = i < ROLES.length ? ROLES[i] : `ALTERNATIVE ${i - ROLES.length + 1}`
          const isLocked = locked.has(i)
          const colClass = [
            'plb-col',
            isLocked && 'plb-col--locked',
            animIdx === i && 'plb-col--in',
            overIdx === i && dragFrom.current != null && 'plb-col--over',
          ].filter(Boolean).join(' ')
          return (
            <section
              key={i}
              className={colClass}
              ref={colRef(c, ink)}
              aria-label={`${role} ${adjusted[i]}`}
              // Whole-swatch drag: grab anywhere on the column to reorder (the
              // grip glyph stays as a visual affordance). Disabled while a tints
              // or HCT popover is open on this column so slider drags aren't
              // hijacked by the native element drag.
              draggable={pickerIdx !== i && tintsIdx !== i}
              onDragStart={(e) => {
                dragFrom.current = i
                e.dataTransfer.effectAllowed = 'move'
                try { e.dataTransfer.setData('text/plain', String(i)) } catch { /* older engines */ }
              }}
              onDragEnd={() => { dragFrom.current = null; setOverIdx(null) }}
              onContextMenu={(e) => {
                e.preventDefault()
                setTintsIdx(null); setPickerIdx(null)
                setCtxMenu({ i, x: e.clientX, y: e.clientY })
              }}
              onDragOver={(e) => {
                if (dragFrom.current == null) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (overIdx !== i) setOverIdx(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                moveCol(dragFrom.current, i)
                dragFrom.current = null
                setOverIdx(null)
              }}
            >
              <div className="plb-col-tools">
                <span
                  className="plb-tool plb-tool--grip"
                  title="Drag anywhere on this colour to reorder"
                  aria-hidden="true"
                >
                  <IcoGrip />
                </span>
                <button
                  type="button"
                  className={isLocked ? 'plb-tool plb-tool--on' : 'plb-tool'}
                  aria-pressed={isLocked}
                  title={isLocked ? 'Unlock — allow randomise to change it' : 'Lock — keep this colour through randomise'}
                  aria-label={isLocked ? `Unlock ${role}` : `Lock ${role}`}
                  onClick={() => toggleLock(i)}
                >
                  <IcoLock open={!isLocked} />
                </button>
                <button
                  type="button"
                  className="plb-tool"
                  title="Edit in HCT"
                  aria-label={`Edit ${role} in HCT`}
                  onClick={() => { setTintsIdx(null); setCtxMenu(null); setPickerIdx(p => (p === i ? null : i)) }}
                >
                  <IcoSliders />
                </button>
                {view.length > 1 && (
                  <button type="button" className="plb-tool" title="Swap with the next column" aria-label={`Swap ${role} with the next column`} onClick={() => swapCols(i)}>
                    <IcoSwap />
                  </button>
                )}
                <button type="button" className="plb-tool" title="Copy hex" aria-label={`Copy ${adjusted[i]}`} onClick={() => onCopy?.(adjusted[i])}>
                  <IcoCopy />
                </button>
                {view.length > 2 && (
                  <button type="button" className="plb-tool" title="Remove colour" aria-label={`Remove ${role}`} onClick={() => removeCol(i)}>
                    <IcoX />
                  </button>
                )}
              </div>

              <div className="plb-ramp" role="group" aria-label={`Tonal ramp of ${adjusted[i]} — click to view all tints`}>
                {ramp.map((rc, k) => (
                  <button
                    key={k}
                    type="button"
                    className="plb-ramp-bar"
                    ref={barRef(rc)}
                    title="View tints"
                    aria-label={`View the tints of ${adjusted[i]}`}
                    onClick={() => { setPickerIdx(null); setCtxMenu(null); setTintsIdx(t => (t === i ? null : i)) }}
                  />
                ))}
              </div>
              <button type="button" className="plb-hex" title="Copy hex" onClick={() => onCopy?.(adjusted[i])}>{adjusted[i]}</button>
              <div className="plb-role">{role}</div>
              {showContrast && (
                <span className={`plb-badge plb-badge--${level.toLowerCase()}`}>{level} {ratio.toFixed(1)}</span>
              )}

              {tintsIdx === i && (
                <div className="plb-pop plb-tintpop" role="dialog" aria-label={`Tints of ${adjusted[i]}`}>
                  <div className="plb-pop-head">
                    <span className="plb-pop-title">Tints</span>
                    <button type="button" className="plb-pop-x" aria-label="Close tints" onClick={() => setTintsIdx(null)}><IcoX /></button>
                  </div>
                  <div className="plb-tint-list">
                    {tonalRamp(adjusted[i], TINT_TONES).map((tc, k) => (
                      <button key={k} type="button" className="plb-tint-row" onClick={() => onCopy?.(normaliseHex(tc) || tc)}>
                        <span className="plb-tint-chip" ref={barRef(tc)} aria-hidden="true" />
                        <span className="plb-tint-tone">T{TINT_TONES[k]}</span>
                        <span className="plb-tint-hex">{(normaliseHex(tc) || tc)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pickerIdx === i && (
                <HctPicker
                  key={i}
                  hex={colors[i]}
                  label={role}
                  onChange={(hex) => setColorAt(i, hex)}
                  onClose={() => setPickerIdx(null)}
                />
              )}

              {i < view.length - 1 && (
                <button
                  type="button"
                  className="plb-gap"
                  aria-label={`Insert a colour between position ${i + 1} and ${i + 2}`}
                  title="Insert a colour here"
                  onClick={() => insertBetween(i)}
                >
                  <span className="plb-gap-dot"><IcoPlus size={13} /></span>
                </button>
              )}
            </section>
          )
        })}
        <button type="button" className="plb-add" onClick={addCol} aria-label="Add a colour">
          <span className="plb-add-dot"><IcoPlus size={18} /></span>
          <span className="plb-add-label">Add</span>
        </button>
      </div>

      {/* ── Right-click menu ── */}
      {ctxMenu && (
        <div className="plb-pop plb-ctx" role="menu" aria-label="Colour actions" ref={ctxPosRef(ctxMenu.x, ctxMenu.y)}>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { onCopy?.(adjusted[ctxMenu.i]); setCtxMenu(null) }}><IcoCopy /> Copy hex</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { setFromSeedInput(adjusted[ctxMenu.i]); setCtxMenu(null) }}><IcoShuffle /> Use as seed</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { setPickerIdx(ctxMenu.i); setCtxMenu(null) }}><IcoSliders /> Edit in HCT</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { setTintsIdx(ctxMenu.i); setCtxMenu(null) }}><IcoEye /> View tints</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { toggleLock(ctxMenu.i); setCtxMenu(null) }}>
            <IcoLock open={locked.has(ctxMenu.i)} size={15} /> {locked.has(ctxMenu.i) ? 'Unlock' : 'Lock'}
          </button>
          <div className="plb-ctx-sep" aria-hidden="true" />
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { insertAt(ctxMenu.i, midColor(colors[Math.max(0, ctxMenu.i - 1)], colors[ctxMenu.i])); setCtxMenu(null) }}><IcoPlus size={15} /> Insert left</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { insertBetween(ctxMenu.i); setCtxMenu(null) }}><IcoPlus size={15} /> Insert right</button>
          {colors.length > 2 && (
            <button type="button" role="menuitem" className="plb-ctx-item plb-ctx-item--danger" onClick={() => { removeCol(ctxMenu.i); setCtxMenu(null) }}><IcoX /> Remove</button>
          )}
        </div>
      )}

      {/* ── Preview modal ── */}
      {preview && (
        <div
          className="plb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Palette preview"
          onPointerDown={(e) => { if (e.target === e.currentTarget) setPreview(null) }}
        >
          <div className="plb-modal-card">
            <div className="plb-modal-head">
              <span className="plb-pop-title">{preview.compare ? 'Compare palettes' : 'Preview'}</span>
              <div className="plb-modal-modes" role="group" aria-label="Preview theme">
                {['light', 'dark'].map(m => (
                  <button
                    key={m}
                    type="button"
                    className={preview.mode === m ? 'plb-mode plb-mode--on' : 'plb-mode'}
                    aria-pressed={preview.mode === m}
                    onClick={() => setPreview(p => ({ ...p, mode: m }))}
                  >
                    {m === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
              <button type="button" className="plb-pop-x" aria-label="Close preview" onClick={() => setPreview(null)}><IcoX /></button>
            </div>
            <div className={preview.compare ? 'plb-modal-body plb-modal-body--split' : 'plb-modal-body'}>
              <PreviewScene
                colors={adjusted}
                mode={preview.mode}
                title={preview.compare ? `Current — score ${paletteScore}` : undefined}
              />
              {preview.compare && (
                <PreviewScene
                  colors={preview.compare.colors}
                  mode={preview.mode}
                  title={`${preview.compare.label} — score ${preview.compare.score}`}
                />
              )}
            </div>
            {preview.compare && (
              <div className="plb-modal-actions">
                <button
                  type="button"
                  className="btn btn-s btn-accent"
                  onClick={() => { applyPalette(preview.compare.colors, `Applied variation: ${preview.compare.label}`); setPreview(null) }}
                >
                  Use {preview.compare.label}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Global adjust ── */}
      <footer className="plb-adjust" aria-label="Global palette adjustments">
        {ADJUST_FIELDS.map(f => (
          <div className="plb-adjust-field" key={f.key}>
            <label className="plb-adjust-label" htmlFor={`plb-${f.key}`}>{f.label}</label>
            <SnapSlider
              id={`plb-${f.key}`}
              min={f.min}
              max={f.max}
              value={adjust[f.key]}
              defaultValue={0}
              snaps={f.snaps}
              snapRadius={f.snapRadius}
              unit={f.unit}
              onChange={(v) => setAdjust(prev => ({ ...prev, [f.key]: v }))}
              ariaLabel={`${f.label} adjustment`}
            />
          </div>
        ))}
        {adjustDirty && (
          <button type="button" className="btn btn-s btn-ghost" onClick={() => setAdjust(ZERO_ADJUST)}>Reset</button>
        )}
        <button type="button" className="btn btn-s plb-copycss" onClick={() => onCopy?.(cssExport)}>Copy CSS</button>
      </footer>
    </div>
  )
}
