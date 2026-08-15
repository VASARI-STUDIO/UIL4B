import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import ColorPickerPop from '../components/ColorPickerPop'
import UiSystemBuilder from '../components/UiSystemBuilder'
import {
  adjustHandleColors, adjustTrackGradientsFromStops, adjustTrackStops, applyAdjust,
  autoTonalFromSeed, contrastRatio, derivePreviewRoles, generateHarmony, hctToHex,
  hexToHct, hexToHsl, hslToHex, mixHex, randomSystemPalette, simCvd, textColorForBg,
  tonalRamp,
} from '../utils/colors'
import { FREE_VARIATIONS, paletteVariations, scorePalette } from '../utils/paletteVariations'
// Column titles + the community-submit dice name share one vocabulary — see
// utils/paletteNames.js for why `colorName` is deterministic and
// `randomPaletteName` deliberately is not.
import { colorName, randomPaletteName } from '../utils/paletteNames'
import { roleLabel } from '../utils/paletteRoles'
import { BRAND_PALETTES } from '../data/brandPalettes'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useAuth } from '../contexts/AuthContext'
import { getOwnerHandle, isAdminEmail, PUBLIC_OWNER_ID } from '../utils/constants'
import { appendCommunitySubmission } from '../utils/communitySubmissions'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { consumeBoardDraft, readBoardDraft, resetGradientDraft, resetTintDraft, setGradientDraft, setTintDraft } from '../utils/colorHandoff'
// The adjust lens contract — see utils/paletteAdjust.js for why the base
// colours and the slider values are persisted separately.
import { normaliseHex, persistedPalette, readSavedPalette, ZERO_ADJUST } from '../utils/paletteAdjust'

// Palette Builder — the standalone /color/palette workbench. A full-bleed
// board so the columns are the page, not a panel floating in chrome: a
// toolbar (seed + harmony + brands/variations/preview + vision + randomise +
// save/share), full-height colour columns with per-column tools (drag-reorder,
// HCT edit, tints, right-click menu), and a bottom global-adjust bar. Runs on
// the exact same colour engine as the merged Colour Studio (utils/colors.js),
// so palettes built here match the studio's output.

const DEFAULT_SEED = '#4338E0'
const SESSION_SEED_KEY = 'vs-palette-session-seed'
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']
const PRO_MAX = 8   // free ceiling on TOTAL columns — free palettes can hold up to 8
const HARD_MAX = 10 // absolute ceiling so the board never becomes slivers
const IMG_MAX_MB = 4 // uploaded-image size cap for the free image picker

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

// The colour systems a free user is allowed to run through the generator. Any
// other system (paid harmonies, a brand's 'custom' system) collapses to 'auto'
// the moment a free user edits from it — otherwise it becomes a backdoor into
// the paid harmony engine.
const FREE_SYSTEMS = ['auto', 'monochromatic']

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
// Zero is the value every one of these sliders is measured against — it is
// "this palette, unlensed", and it is the point a user hunts for after an
// experiment. So it carries a WIDE centre detent while the intermediate marks
// stay light (see snapPoints in utils/sliderKeys.js for the per-point radius).
// One shared radius could only make all three equally sticky, which is how
// finding zero came to need pixel precision.
//
// Hue spans ±50 rather than ±180: past about a fifth of the wheel the board
// stops being a variation of the colour the user chose and becomes a different
// palette, which is what the Randomise button is for. ADJUST_TRACK_RANGES.h in
// utils/colors.js MUST match — the track is a picture of this slider.
const ADJUST_FIELDS = [
  { key: 'h', label: 'Hue', min: -50, max: 50, unit: '°', snaps: [{ value: -25, radius: 6 }, { value: 0, radius: 8 }, { value: 25, radius: 6 }] },
  { key: 's', label: 'Saturation', min: -100, max: 100, unit: '%', snaps: [{ value: -50, radius: 6 }, { value: 0, radius: 12 }, { value: 50, radius: 6 }] },
  { key: 'b', label: 'Tone', min: -100, max: 100, unit: '%', snaps: [{ value: -50, radius: 6 }, { value: 0, radius: 12 }, { value: 50, radius: 6 }] },
  { key: 'temp', label: 'Temperature', min: -100, max: 100, unit: '', snaps: [{ value: -50, radius: 6 }, { value: 0, radius: 12 }, { value: 50, radius: 6 }] },
]

// Tones for the expanded per-colour tints panel (click the mini ramp to open).
const TINT_TONES = [95, 90, 80, 70, 60, 50, 40, 30, 20, 10]

const HANDLE_KEY = 'vs-community-handle'            // the user's chosen social name

function randomPaletteSeed() {
  let hue = Math.floor(Math.random() * 360)
  try {
    const values = new Uint16Array(1)
    globalThis.crypto?.getRandomValues?.(values)
    hue = values[0] % 360
  } catch { /* Math.random fallback above */ }
  return normaliseHex(hctToHex(hue, 64, 54)) || DEFAULT_SEED
}

function sessionSeed() {
  try {
    const remembered = normaliseHex(sessionStorage.getItem(SESSION_SEED_KEY))
    if (remembered) return remembered
    const fresh = randomPaletteSeed()
    sessionStorage.setItem(SESSION_SEED_KEY, fresh)
    return fresh
  } catch {
    return randomPaletteSeed()
  }
}

// Palette history (toolbar History menu): a rolling local log of the boards the
// user has worked through, so an accidental randomise is never destructive.
const HISTORY_KEY = 'vs-palette-history'
const HISTORY_MAX = 30
function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter(h => h && Array.isArray(h.colors) && h.colors.length >= 2).slice(0, HISTORY_MAX) : []
  } catch { return [] }
}
function paletteSignature(snapshot) {
  return JSON.stringify({
    colors: snapshot.colors || [],
    seed: snapshot.seed || snapshot.colors?.[0] || DEFAULT_SEED,
    harmony: snapshot.harmony || 'analogous',
    locked: snapshot.locked || [],
    adjust: snapshot.adjust || ZERO_ADJUST,
    vision: snapshot.vision || 'normal',
    showContrast: Boolean(snapshot.showContrast),
    importedGalleryId: snapshot.importedGalleryId || null,
  })
}
// Compact relative time for the history rows — "Just now", "5m ago", "2h ago".
function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 45) return 'Just now'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

// ── Community handle: profanity filter that also catches evasion (item 22) ───
// Normalise before matching so leetspeak (sh1t), separators (f_u_c_k) and
// repeated-char padding (shiiit) all collapse to the same stem we test against
// the blocklist. Numbers/underscores stay legal in the handle itself.
function normaliseForFilter(raw) {
  return String(raw).toLowerCase()
    .replace(/[!|1]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')     // drop separators, remaining digits, symbols
    .replace(/(.)\1+/g, '$1')   // collapse repeated-char padding
}

const HANDLE_BLOCK = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'nigger', 'nigga', 'faggot', 'fag',
  'retard', 'rape', 'slut', 'whore', 'dick', 'cock', 'pussy', 'bastard', 'wanker',
  'twat', 'bollocks', 'spic', 'chink', 'kike', 'tranny', 'nazi', 'porn', 'anal', 'cum',
]

// Returns a human message if the handle is invalid/blocked, else null.
function handleProblem(raw) {
  const h = String(raw).trim()
  if (h.length < 3) return 'Handle must be at least 3 characters.'
  if (h.length > 20) return 'Handle must be 20 characters or fewer.'
  if (!/^[a-zA-Z0-9_]+$/.test(h)) return 'Use only letters, numbers and underscores.'
  const norm = normaliseForFilter(h)
  if (HANDLE_BLOCK.some(w => norm.includes(w))) return 'Please choose a different handle.'
  return null
}

// Perceptual interpolation between two colours along the shortest hue arc in
// HCT, at ratio t (0 = a, 1 = b) — what the click-between-columns insert(s)
// produce. HSL mix if the solver throws. Shared by the single midpoint insert
// and the "insert N between" batch menu so there is one interpolation path.
function stepColor(a, b, t) {
  try {
    const [h1, c1, t1] = hexToHct(a)
    const [h2, c2, t2] = hexToHct(b)
    const d = ((h2 - h1 + 540) % 360) - 180
    const hex = hctToHex((((h1 + d * t) % 360) + 360) % 360, c1 + (c2 - c1) * t, t1 + (t2 - t1) * t)
    return normaliseHex(hex) || a
  } catch {
    return normaliseHex(mixHex(a, b, t)) || a
  }
}

// Perceptual midpoint of two colours — the plain (single-insert) case of stepColor.
function midColor(a, b) {
  return stepColor(a, b, 0.5)
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

const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

// "From image" — draw the upload onto a canvas capped for cheap sampling and
// hand back its pixel data (plus the source object URL for the preview). The
// caller keeps the ImageData so picker points can re-sample it live on drag.
function loadImageData(file, maxSize = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)
        resolve({ data: ctx.getImageData(0, 0, w, h), url })
      } catch (err) { URL.revokeObjectURL(url); reject(err) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that image')) }
    img.src = url
  })
}

// Histogram 12-bit RGB buckets and keep the most-common, visually distinct
// ones (no k-means — plenty for seeding a board). Each swatch also carries a
// normalised centroid position so we can drop a draggable picker point on the
// image exactly where that colour lives.
function dominantSwatches(imageData, count) {
  const { data, width, height } = imageData
  const buckets = new Map()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const p = i / 4
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    const b = buckets.get(key) || { r: 0, g: 0, b: 0, x: 0, y: 0, n: 0 }
    b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]
    b.x += p % width; b.y += Math.floor(p / width); b.n++
    buckets.set(key, b)
  }
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n)
  const picks = []
  for (const b of ranked) {
    const rgb = [b.r / b.n, b.g / b.n, b.b / b.n]
    const dupe = picks.some(p => Math.hypot(p.rgb[0] - rgb[0], p.rgb[1] - rgb[1], p.rgb[2] - rgb[2]) < 48)
    if (dupe) continue
    picks.push({ rgb, hex: rgbToHex(rgb[0], rgb[1], rgb[2]), x: (b.x / b.n) / width, y: (b.y / b.n) / height })
    if (picks.length >= count) break
  }
  return picks.map(p => ({ hex: p.hex, x: p.x, y: p.y }))
}

// Colour of the pixel under a normalised (0–1) point — used while dragging a
// picker point across the previewed image.
function sampleImageData(imageData, nx, ny) {
  const { data, width, height } = imageData
  const px = Math.min(width - 1, Math.max(0, Math.round(nx * width)))
  const py = Math.min(height - 1, Math.max(0, Math.round(ny * height)))
  const i = (py * width + px) * 4
  return rgbToHex(data[i], data[i + 1], data[i + 2])
}

// WCAG level for a raw ratio (AAA ≥7, AA ≥4.5, AA18 large-text ≥3, else LOW).
function wcagLevel(ratio) {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA18' : 'LOW'
}

// Contrast of a swatch against WHITE ink and against BLACK ink — the two
// results the Pro contrast view shows side by side, so you can see at a glance
// whether a colour carries light text, dark text, or both.
function contrastPair(hex) {
  const rate = (ink) => { const ratio = contrastRatio(hex, ink); return { level: wcagLevel(ratio), ratio } }
  return { light: rate('#FFFFFF'), dark: rate('#000000') }
}

// Column colour + legible ink through CSS custom properties — the
// no-inline-styles route (same pattern as TintTool's swatchRef). `sim` is the
// colour-vision-simulated shade painted on the bottom half when a vision type
// is active; it equals `color` when vision is Normal (so the split is seamless).
function colRef(color, ink, sim) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--plb-c', color)
    el.style.setProperty('--plb-ink', ink)
    el.style.setProperty('--plb-sim', sim || color)
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
const IcoArrowLeft = () => <Ico><path d="m15 18-6-6 6-6" /></Ico>
const IcoArrowRight = () => <Ico><path d="m9 18 6-6-6-6" /></Ico>
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
const IcoDice = () => (
  <Ico size={14}><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.1" /><circle cx="15.5" cy="8.5" r="1.1" /><circle cx="12" cy="12" r="1.1" /><circle cx="8.5" cy="15.5" r="1.1" /><circle cx="15.5" cy="15.5" r="1.1" /></Ico>
)
const IcoHistory = () => (
  <Ico size={13}><path d="M3 12a9 9 0 1 0 2.8-6.5" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></Ico>
)
// Undo — the arrowhead MUST land on the end of the shaft. The previous glyph
// pointed at y=12 while its shaft ended at y=10, so the head rendered detached
// and sitting low. Lucide's `undo-2` geometry, unmodified: head at (4,9), shaft
// leaving the same point.
const IcoUndo = () => (
  <Ico size={13}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></Ico>
)
const IcoReset = () => (
  <Ico size={13}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Ico>
)
// Gradient — a swatch with two parallel diagonal bands (the ramp), matching the
// stroke weight and 13px optical size of the other toolbar glyphs.
const IcoGradient = () => (
  <Ico size={13}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15 15 3" /><path d="M9 21 21 9" /></Ico>
)
const IcoGallery = () => (
  <Ico size={13}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Ico>
)
// Sparkle-and-wand glyph for the "Explore" gallery button. Fill-based (not the
// stroke-based <Ico>), so it's a standalone inline SVG at the same 13px size.
const IcoExplore = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="currentColor" aria-hidden="true">
    <path d="M21.871 15.566c.281 0 .422-.164.469-.421c.797-3.75.75-3.891 4.664-4.688c.281-.047.445-.21.445-.469c0-.281-.164-.445-.445-.492c-3.914-.797-3.867-.937-4.664-4.664c-.047-.258-.188-.445-.469-.445s-.422.187-.492.445c-.774 3.727-.727 3.867-4.664 4.664c-.258.047-.445.211-.445.492c0 .258.187.422.445.469c3.937.797 3.89.938 4.664 4.688c.07.257.21.421.492.421m19.36 8.274c.328 0 .515-.211.562-.516c.82-4.453.844-4.734 5.554-5.555c.305-.046.54-.257.54-.585c0-.329-.235-.516-.54-.586c-4.71-.797-4.734-1.078-5.554-5.532c-.047-.304-.234-.539-.562-.539s-.54.235-.586.54c-.797 4.453-.82 4.734-5.532 5.53c-.328.071-.539.258-.539.587s.211.539.54.585c4.71.82 4.734 1.102 5.53 5.555c.047.305.258.516.587.516M9.027 30.566c.329 0 .516-.234.563-.539c.82-4.453.844-4.734 5.555-5.53c.304-.071.539-.259.539-.587s-.235-.539-.54-.586c-4.71-.82-4.734-1.101-5.554-5.555c-.047-.304-.235-.515-.563-.515s-.539.21-.585.515c-.82 4.454-.82 4.735-5.532 5.555c-.328.047-.539.258-.539.586s.211.516.54.586c4.71.797 4.71 1.078 5.53 5.531c.047.305.258.54.586.54m40.008 20.04c1.008 1.007 2.695 1.007 3.61 0c.984-1.032.984-2.626 0-3.61l-22.266-22.36c-.984-.984-2.672-.984-3.61 0c-.984 1.032-.96 2.65 0 3.634ZM35.418 34.504l-6.867-6.89c-.422-.423-.54-.868-.14-1.29c.398-.375.843-.281 1.288.164l6.89 6.89ZM20.16 50.98c.422 0 .727-.305.774-.75c.773-6.258 1.078-6.422 7.43-7.454c.515-.093.82-.328.82-.797c0-.445-.305-.726-.727-.796c-6.398-1.22-6.75-1.196-7.523-7.453c-.047-.446-.352-.75-.774-.75c-.445 0-.75.304-.797.726c-.82 6.352-1.054 6.563-7.523 7.477c-.422.047-.727.351-.727.797c0 .445.305.703.727.796c6.469 1.242 6.68 1.242 7.523 7.5a.774.774 0 0 0 .797.703" />
  </svg>
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
export function HctPicker({ hex, label, onChange, onClose }) {
  const [requested, setRequested] = useState(() => {
    try {
      const [h, c, t] = hexToHct(hex)
      if ([h, c, t].every(Number.isFinite)) return { h: Math.round(h), c: Math.round(c), t: Math.round(t) }
    } catch { /* HSL approximation below */ }
    const [h, s, l] = hexToHsl(hex)
    return { h: Math.round(h), c: Math.round(s * 0.6), t: Math.round(l) }
  })
  const [achieved, setAchieved] = useState(requested)
  const [draft, setDraft] = useState(hex)

  const emit = (request) => {
    const next = {
      h: ((request.h % 360) + 360) % 360,
      c: Math.max(0, Math.min(150, request.c)),
      t: Math.max(0, Math.min(100, request.t)),
    }
    let out
    try { out = hctToHex(next.h, next.c, next.t) }
    catch { out = hslToHex(next.h, Math.min(100, next.c), Math.min(95, Math.max(5, next.t))) }
    const norm = normaliseHex(out)
    if (norm) {
      let actual = next
      try {
        const [h, c, t] = hexToHct(norm)
        if ([h, c, t].every(Number.isFinite)) actual = { h: Math.round(h), c: Math.round(c), t: Math.round(t) }
      } catch { /* keep the clamped request */ }
      setRequested(next)
      setAchieved(actual)
      setDraft(norm)
      onChange(norm)
    }
  }
  const commitDraft = () => {
    const norm = normaliseHex(draft)
    if (!norm) { setDraft(hex); return }
    setDraft(norm)
    onChange(norm)
    try {
      const [h, c, t] = hexToHct(norm)
      if ([h, c, t].every(Number.isFinite)) {
        const actual = { h: Math.round(h), c: Math.round(c), t: Math.round(t) }
        setRequested(actual)
        setAchieved(actual)
      }
    } catch { /* keep slider state */ }
  }
  const limited = requested.c - achieved.c > 1.5 || Math.abs(requested.t - achieved.t) > 1.2

  return (
    <div className="plb-pop plb-picker" role="dialog" aria-label={`Edit ${label} in HCT`}>
      <div className="plb-pop-head">
        <span className="plb-pop-title">Edit — HCT</span>
        <span className="plb-help">
          <button type="button" className="plb-help-btn" aria-describedby="plb-hct-help">?</button>
          <span id="plb-hct-help" className="plb-help-tip" role="tooltip">
            Hue chooses the colour family, Chroma controls colourfulness, and Tone sets perceptual lightness from 0 (black) to 100 (white).
          </span>
        </span>
        <button type="button" className="plb-pop-x" aria-label="Close editor" onClick={onClose}><IcoX /></button>
      </div>
      {[
        { key: 'h', label: 'Hue', min: 0, max: 359, unit: '°', snaps: [90, 180, 270], snapRadius: 6 },
        { key: 'c', label: 'Chroma', min: 0, max: 150, unit: '', snaps: [50, 100] },
        { key: 't', label: 'Tone', min: 0, max: 100, unit: '', snaps: [50], snapRadius: 3 },
      ].map(f => (
        <div className="plb-picker-row" key={f.key}>
          <span className="plb-picker-label">{f.label}</span>
          <SnapSlider
            min={f.min}
            max={f.max}
            value={requested[f.key]}
            snaps={f.snaps}
            snapRadius={f.snapRadius}
            unit={f.unit}
            onChange={(v) => emit({ ...requested, [f.key]: Math.round(v) })}
            ariaLabel={`${f.label} of ${label}`}
          />
        </div>
      ))}
      <div className="plb-picker-evidence" aria-live="polite">
        <span>Requested H {requested.h}Â° Â· C {requested.c} Â· T {requested.t}</span>
        <span>Achieved H {achieved.h}Â° Â· C {achieved.c} Â· T {achieved.t}</span>
        {limited && <strong>Display gamut limited; controls retain your requested HCT.</strong>}
      </div>
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

// ── The three preview scenes. Each maps the palette (via derivePreviewRoles →
// --pv-* custom props) onto a distinct, high-fidelity mock of a real design
// context, so "will this actually ship?" gets answered for UI, brand and
// graphic work — not just a dashboard. ──

const PREVIEW_SCENES = {
  ui: [
    { name: 'Analytics dashboard', head: 'Weekly overview', sub: 'Live product metrics and a primary action' },
    { name: 'Commerce checkout', head: 'Review your order', sub: 'Summary, totals and payment hierarchy' },
    { name: 'Project workspace', head: 'Launch checklist', sub: 'Tasks, progress and team activity' },
    { name: 'Account settings', head: 'Profile settings', sub: 'Forms, helper copy and saved state' },
    { name: 'Support inbox', head: 'Customer inbox', sub: 'Conversation list and response actions' },
    { name: 'Finance overview', head: 'Account balance', sub: 'Transactions, status and transfer action' },
  ],
  brand: [
    { name: 'Product launch', kicker: 'Introducing', head: 'Design that\nfeels inevitable', sub: 'A focused product launch with primary and secondary actions.' },
    { name: 'Architecture studio', kicker: 'Selected practice', head: 'Built for\nlasting use', sub: 'An editorial studio page with confident colour restraint.' },
    { name: 'Creative portfolio', kicker: 'New collection', head: 'Work with\na clear point', sub: 'A portfolio introduction supported by a compact project index.' },
    { name: 'Conference', kicker: 'Brisbane · October', head: 'Systems in\npractice', sub: 'An event page balancing schedule, venue and registration.' },
    { name: 'Independent journal', kicker: 'Issue sixteen', head: 'Ideas worth\nkeeping', sub: 'An editorial cover with a clear reading path and subscription action.' },
    { name: 'Hospitality', kicker: 'Open this season', head: 'Stay close\nto the coast', sub: 'A destination page using the palette for calm orientation.' },
  ],
  graphic: [
    { name: 'Editorial poster', kicker: 'Vol. 04 — Colour', head: 'FORM\n& HUE', sub: 'Type, shape and colour working as one composed system.' },
    { name: 'Album cover', kicker: 'Recorded live', head: 'NIGHT\nSIGNAL', sub: 'A compact cover system with a legible release hierarchy.' },
    { name: 'Campaign', kicker: 'City series 02', head: 'MOVE\nWITH IT', sub: 'A public campaign balancing impact with readable details.' },
    { name: 'Packaging', kicker: 'Batch No. 18', head: 'FIELD\nNOTES', sub: 'A packaging face with product, variant and provenance cues.' },
    { name: 'Magazine cover', kicker: 'Spring edition', head: 'NEW\nGROUND', sub: 'A cover composition built for title, feature and issue data.' },
    { name: 'Social launch', kicker: 'Available Friday', head: 'MAKE\nSPACE', sub: 'A campaign tile that preserves the message at small sizes.' },
  ],
}

// UI — a product dashboard (nav, KPI cards, data bars, CTA).
function PreviewUI({ colors, scene }) {
  if (scene.name === 'Commerce checkout') {
    return (
      <div className="plb-pv-authored plb-pv-checkout">
        <main><small>Payment</small><div className="plb-pv-h">{scene.head}</div><div className="plb-pv-field">Card number <b>•••• 4242</b></div><div className="plb-pv-field">Delivery <b>Standard · $8</b></div></main>
        <aside><strong>Order summary</strong><p>Canvas field bag <b>$84</b></p><p>Studio notebook <b>$18</b></p><dl><dt>Total</dt><dd>$110</dd></dl><span className="plb-pv-cta">Pay securely</span></aside>
      </div>
    )
  }
  if (scene.name === 'Project workspace') {
    return (
      <div className="plb-pv-authored plb-pv-workspace">
        <header><div><small>Project workspace</small><div className="plb-pv-h">{scene.head}</div></div><span className="plb-pv-cta">Add task</span></header>
        <div className="plb-pv-board-cols"><section><strong>To do · 3</strong><p>Audit empty states</p><p>Write release notes</p></section><section><strong>In progress · 2</strong><p>Token migration</p><p>Mobile QA</p></section><section><strong>Review · 4</strong><p>Checkout states</p><p>Contrast pass</p></section></div>
      </div>
    )
  }
  if (scene.name === 'Account settings') {
    return (
      <div className="plb-pv-authored plb-pv-settings">
        <nav><strong>Settings</strong><span className="is-active">Profile</span><span>Security</span><span>Notifications</span></nav>
        <form><small>Account settings</small><div className="plb-pv-h">{scene.head}</div><label>Display name <i>Maya Chen</i></label><label>Email address <i>maya@example.com</i></label><label className="plb-pv-toggle">Weekly summary <b /></label><span className="plb-pv-cta">Save changes</span></form>
      </div>
    )
  }
  if (scene.name === 'Support inbox') {
    return (
      <div className="plb-pv-authored plb-pv-inbox">
        <aside><strong>Inbox <b>12</b></strong><p className="is-active">Unable to export tokens<small>Jamie · 4m</small></p><p>Billing receipt<small>Amir · 22m</small></p><p>Team invitation<small>Rina · 1h</small></p></aside>
        <main><small>Customer inbox</small><div className="plb-pv-h">Unable to export tokens</div><p className="plb-pv-message">The JSON export is not reaching my clipboard. Can you help me recover it?</p><div className="plb-pv-reply">Write a reply… <span>Send</span></div></main>
      </div>
    )
  }
  if (scene.name === 'Finance overview') {
    return (
      <div className="plb-pv-authored plb-pv-finance">
        <header><div><small>Available balance</small><div className="plb-pv-h">$24,840.60</div></div><span className="plb-pv-cta">Transfer</span></header>
        <div className="plb-pv-finance-chart">{colors.slice(0, 7).map((color, index) => <i key={color + index} ref={barRef(color)} />)}</div>
        <section><strong>Recent transactions</strong><p><span>UIL4B Pro</span><b>−$24.00</b></p><p><span>Client deposit</span><b>+$4,800.00</b></p><p><span>Cloud hosting</span><b>−$86.40</b></p></section>
      </div>
    )
  }
  return (
    <>
      <aside className="plb-pv-side">
        <span className="plb-pv-logo" />
        <span className="plb-pv-navline plb-pv-navline--on" />
        <span className="plb-pv-navline" />
        <span className="plb-pv-navline" />
        <span className="plb-pv-navline" />
      </aside>
      <div className="plb-pv-main">
        <div className="plb-pv-h">{scene.head}</div>
        <div className="plb-pv-p">{scene.sub}</div>
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
    </>
  )
}

// Brand — a marketing landing hero (wordmark, headline, primary + ghost CTAs,
// brand-colour chip row).
function PreviewBrand({ colors, scene }) {
  if (scene.name === 'Architecture studio') {
    return (
      <div className="plb-pvb plb-pvb-architecture">
        <header><strong>ATELIER 07</strong><span>Work · Practice · Contact</span></header>
        <main><div><span className="plb-pvb-eyebrow">{scene.kicker}</span><div className="plb-pvb-head">Courtyard House</div><p>{scene.sub}</p></div><figure><i ref={barRef(colors[1] || colors[0])} /><figcaption>Brisbane · 2026</figcaption></figure></main>
      </div>
    )
  }
  if (scene.name === 'Creative portfolio') {
    return (
      <div className="plb-pvb plb-pvb-portfolio">
        <header><strong>NOA / DESIGN</strong><span>Selected work 2024–26</span></header>
        <div><aside><span className="plb-pvb-eyebrow">{scene.kicker}</span><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div></aside><ol><li><b>01</b> Field Supply <small>Identity</small></li><li><b>02</b> Common Ground <small>Digital</small></li><li><b>03</b> Form Journal <small>Editorial</small></li></ol></div>
      </div>
    )
  }
  if (scene.name === 'Conference') {
    return (
      <div className="plb-pvb plb-pvb-conference">
        <header><strong>UIL4B / LIVE</strong><span>{scene.kicker}</span></header>
        <main><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p><div className="plb-pvb-schedule"><span><b>09:00</b> Opening keynote</span><span><b>11:30</b> Colour systems</span><span><b>14:00</b> Shipping critique</span></div><span className="plb-pvb-btn plb-pvb-btn--primary">Register</span></main>
      </div>
    )
  }
  if (scene.name === 'Independent journal') {
    return (
      <div className="plb-pvb plb-pvb-journal">
        <header><strong>FORM / JOURNAL</strong><span>{scene.kicker}</span></header>
        <main><article><span className="plb-pvb-eyebrow">Cover story</span><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p></article><aside><strong>Inside this issue</strong><p>01 · Designing for repair</p><p>02 · The patient interface</p><p>03 · Tools that last</p></aside></main>
      </div>
    )
  }
  if (scene.name === 'Hospitality') {
    return (
      <div className="plb-pvb plb-pvb-hospitality">
        <header><strong>TIDELINE HOUSE</strong><span>Stay · Dine · Explore</span></header>
        <main><span className="plb-pvb-eyebrow">{scene.kicker}</span><div className="plb-pvb-head">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p><div className="plb-pvb-booking"><span>Check in <b>14 Aug</b></span><span>Guests <b>2 adults</b></span><span className="plb-pvb-btn plb-pvb-btn--primary">Check rooms</span></div></main>
      </div>
    )
  }
  return (
    <div className="plb-pvb">
      <div className="plb-pvb-nav">
        <span className="plb-pvb-mark" />
        <span className="plb-pvb-navlinks">
          <span className="plb-pvb-navlink" />
          <span className="plb-pvb-navlink" />
          <span className="plb-pvb-navlink" />
        </span>
        <span className="plb-pvb-navcta">Sign up</span>
      </div>
      <div className="plb-pvb-hero">
        <span className="plb-pvb-eyebrow">{scene.kicker}</span>
        <div className="plb-pvb-head">{scene.head.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</div>
        <div className="plb-pvb-sub">{scene.sub}</div>
        <div className="plb-pvb-btns">
          <span className="plb-pvb-btn plb-pvb-btn--primary">Get started</span>
          <span className="plb-pvb-btn plb-pvb-btn--ghost">Learn more</span>
        </div>
        <div className="plb-pvb-chips">
          {colors.slice(0, 6).map((c, i) => (
            <span key={i} className="plb-pvb-chip" ref={barRef(c)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Graphic Design — an editorial poster (display type, geometric shapes, a full
// palette gradient bar, swatch caption).
function PreviewGraphic({ colors, scene }) {
  if (scene.name === 'Album cover') {
    return (
      <div className="plb-pvg plb-pvg-album">
        <div className="plb-pvg-disc" ref={barRef(colors[1] || colors[0])}><i /></div>
        <div><span className="plb-pvg-kicker">{scene.kicker}</span><div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><ol><li>Signal One <b>03:42</b></li><li>Afterimage <b>04:18</b></li><li>Night Drive <b>05:01</b></li></ol></div>
      </div>
    )
  }
  if (scene.name === 'Campaign') {
    return (
      <div className="plb-pvg plb-pvg-campaign">
        <header><span>{scene.kicker}</span><b>PUBLIC MOTION</b></header>
        <div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p>
        <footer><strong>FORTITUDE VALLEY → WEST END</strong><span>Every 12 minutes · 06:00–23:30</span></footer>
      </div>
    )
  }
  if (scene.name === 'Packaging') {
    return (
      <div className="plb-pvg plb-pvg-package">
        <div className="plb-pvg-pack-face"><span>{scene.kicker}</span><div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><p>Native botanical infusion</p><b>80 g / 24 serves</b></div>
        <aside><strong>ORIGIN</strong><p>Grown and packed on Yugambeh Country.</p><strong>NOTES</strong><p>Lemon myrtle · roasted wattleseed</p></aside>
      </div>
    )
  }
  if (scene.name === 'Magazine cover') {
    return (
      <div className="plb-pvg plb-pvg-magazine">
        <header><strong>GROUND</strong><span>{scene.kicker}</span></header>
        <div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div>
        <aside><p>How smaller studios are reshaping public space</p><p>Materials with a second life</p><p>Brisbane’s quiet architecture</p></aside>
      </div>
    )
  }
  if (scene.name === 'Social launch') {
    return (
      <div className="plb-pvg plb-pvg-social">
        <header><strong>@uil4b</strong><span>1 / 3</span></header>
        <main><span className="plb-pvg-kicker">{scene.kicker}</span><div className="plb-pvg-title">{scene.head.replace('\n', ' ')}</div><p>{scene.sub}</p></main>
        <footer><span>#designsystems #colour</span><strong>Save for Friday →</strong></footer>
      </div>
    )
  }
  return (
    <div className="plb-pvg">
      <div className="plb-pvg-shapes" aria-hidden="true">
        <span className="plb-pvg-circle" ref={barRef(colors[1] || colors[0])} />
        <span className="plb-pvg-square" ref={barRef(colors[2] || colors[0])} />
        <span className="plb-pvg-tri" ref={barRef(colors[3] || colors[0])} />
      </div>
      <div className="plb-pvg-body">
        <span className="plb-pvg-kicker">{scene.kicker}</span>
        <div className="plb-pvg-title">{scene.head.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</div>
        <div className="plb-pvg-lead">{scene.sub}</div>
      </div>
      <div className="plb-pvg-swatches">
        {colors.slice(0, 8).map((c, i) => (
          <span key={i} className="plb-pvg-sw" ref={barRef(c)} />
        ))}
      </div>
    </div>
  )
}

function PreviewScene({ colors, mode, title, tab = 'ui', scene = PREVIEW_SCENES[tab][0], variant = 0 }) {
  const roles = derivePreviewRoles(colors, { mode })
  return (
    <div className="plb-pvwrap">
      {title && <div className="plb-pv-name">{title}</div>}
      <div className={`plb-pv plb-pv--${tab} plb-pv--v${variant}`} ref={pvRef(roles)} role="group" aria-label={`${scene.name} palette preview`} data-preview-scene={scene.name}>
        {tab === 'brand' ? <PreviewBrand colors={colors} scene={scene} />
          : tab === 'graphic' ? <PreviewGraphic colors={colors} scene={scene} />
            : <PreviewUI colors={colors} scene={scene} />}
      </div>
    </div>
  )
}

// Community submission surface name for the sign-in gate (utils/submitIntent).
const SUBMIT_SURFACE = 'palette'

export default function PaletteBuilder({ onCopy, toast }) {
  const { design, setPalette, saveProject, overwriteProject, projects, canSaveProjects } = useProject()
  const { isPro, loading: entitlementLoading } = useSubscription()
  const { openProModal } = useProModal()
  const { requireLogin } = useLoginPrompt()
  const { user, loading: authLoading } = useAuth()
  // Stable primitive so the community-gate effect doesn't re-run on every
  // AuthContext render (it rebuilds the `user` object each time).
  const uid = user?.uid || null
  const ownerHandle = getOwnerHandle(user?.email)

  // A free user can only ever run a free system through the generator. Paid
  // harmonies and brand systems collapse to 'auto' for them, so editing from a
  // paid/brand state can't ride the paid engine (Pro users keep whatever's set).
  const resolveSystem = useCallback(
    (type) => (isPro || FREE_SYSTEMS.includes(type) ? type : 'auto'),
    [isPro]
  )


  const navigate = useNavigate()

  // Read the incoming state ONCE, on first mount — the board owns it from then
  // on. `queryColors` is a shared ?c= link (already-final colours, so it lands
  // with a clean lens); `handoff` is the homepage mini-builder's Continue, which
  // carries BOTH the swatches and the colour system the board must open on;
  // `saved` is the carried-in project, split back into its base colours and the
  // sliders that produced them.
  //
  // Order matters: an explicit ?c= URL is the strongest statement of intent, a
  // hand-off is the next (the visitor pressed Continue seconds ago), and the
  // saved project is the fallback. PEEKED during render and CONSUMED from a
  // mount effect below — see utils/handoffSlot.js for why that split exists.
  const [queryColors] = useState(colorsFromQuery)
  const [handoff] = useState(readBoardDraft)
  const [saved] = useState(() => readSavedPalette(design?.palette, HARD_MAX))
  const [initial] = useState(() => {
    if (queryColors) return { colors: queryColors, seed: queryColors[0], adjust: ZERO_ADJUST }
    if (handoff) return { colors: handoff.colors, seed: handoff.colors[0], adjust: ZERO_ADJUST }
    if (saved) return { colors: saved.colors, seed: saved.colors[0], adjust: saved.adjust }
    const firstSeed = sessionSeed()
    return { colors: generateHarmony(firstSeed, 'analogous'), seed: firstSeed, adjust: ZERO_ADJUST }
  })
  useEffect(() => { consumeBoardDraft() }, [])

  // Colours are the source of truth (positional: index 0–4 = the five ROLES,
  // beyond = ALTERNATIVE n). They stay the RAW base: the adjust lens never
  // writes back into them. Seed + harmony act as a generator over the unlocked
  // slots; a shared ?c= link or a carried-in project wins first paint.
  const [colors, setColors] = useState(initial.colors)
  const [seed, setSeed] = useState(initial.seed)
  const [seedInput, setSeedInput] = useState(seed)
  // The hex field is an EDITING BUFFER while focused and a READOUT otherwise —
  // see `shownSeed` below for why the two cannot be the same value. Tracking
  // focus is what lets a half-typed "#4A5" survive as the user types it while
  // the resting field still reports the colour on screen.
  const [seedFocused, setSeedFocused] = useState(false)
  // A hand-off names the system explicitly and outranks the carried-in project,
  // because it describes what the visitor just did rather than what this device
  // last held. The id is validated against HARMONIES here — utils/colorHandoff
  // deliberately does not know this catalogue — so an unknown id falls through
  // to the existing behaviour instead of producing a board with no system.
  const [harmony, setHarmony] = useState(() => {
    if (handoff && HARMONIES.some(h => h.id === handoff.system)) return handoff.system
    // 'auto', not 'analogous' — P-004. Missed in the first pass: the default
    // moved in ProjectContext and ColorStudio but this fallback still handed a
    // new board a PAID system that then silently collapsed to Auto anyway.
    return HARMONIES.some(h => h.id === design?.palette?.harmony) ? design.palette.harmony : 'auto'
  })
  const [locked, setLocked] = useState(() => new Set(design?.palette?.locked || []))

  // P-003, founder verdict: the free tier is A FOOT IN THE DOOR.
  //
  // That settles what this collapse should feel like. A free user opening a
  // board saved on a paid system got Auto silently: the chip still read
  // "Analogous" while the board rendered something else, so the product looked
  // unreliable rather than paid. The proposal's own smallest version is "make
  // every gate EXPLICIT rather than silent — the user should always know they
  // hit a paid edge, never merely find that something behaved oddly."
  //
  // For a foot-in-the-door tier that is not just honesty, it is the entire
  // mechanism: a silent downgrade teaches the user nothing, while a named one
  // shows them exactly what Pro buys at the moment they wanted it.
  const collapsedSystem = !isPro && !FREE_SYSTEMS.includes(harmony)
    ? HARMONIES.find(h => h.id === harmony)?.label || harmony
    : null
  // A shared link carries finished colours, so it opens with the sliders at zero
  // rather than re-applying whatever lens was last left on this device.
  const [adjust, setAdjust] = useState(initial.adjust)
  const [vision, setVision] = useState('normal')
  const [showContrast, setShowContrast] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')

  // Toolbar popovers + board popovers (one open at a time, dismiss on
  // outside pointerdown or Escape — handled by the shared effect below).
  const [saveOpen, setSaveOpen] = useState(false)  // merged Save & share menu
  const [harmOpen, setHarmOpen] = useState(false)
  const [visionOpen, setVisionOpen] = useState(false)

  // Image picker (Wave 4): a free, no-login dropdown. Once an image is loaded
  // it stays nested in the menu with draggable picker points sampling its
  // pixels live, plus a +/− count and a reset/auto re-extract.
  const [imgOpen, setImgOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState('')      // object URL for the preview
  const [imgPoints, setImgPoints] = useState([]) // [{ x, y, hex }] normalised
  const [imgError, setImgError] = useState('')
  const [imgDragOver, setImgDragOver] = useState(false)
  const imgDataRef = useRef(null)               // ImageData kept for live sampling
  const imgDragIdx = useRef(null)               // point index being dragged
  const imgStageRef = useRef(null)              // the preview stage element
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
  const [swapIdx, setSwapIdx] = useState(null)     // column with the directional swap chooser open
  const [ctxMenu, setCtxMenu] = useState(null)     // { kind: 'swatch' | 'gap', i, x, y } right-click menu
  const [preview, setPreview] = useState(null)     // { mode, tab, compare } modal
  const [saveName, setSaveName] = useState('')
  const [submitName, setSubmitName] = useState('')
  // Community submit popup (Wave 5 items 20–22): a proper modal with a palette
  // preview, a name field + dice generator, and a one-time handle gate.
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const [handle, setHandle] = useState(() => {
    try { return localStorage.getItem(HANDLE_KEY) || '' } catch { return '' }
  })
  const [handleInput, setHandleInput] = useState('')
  const [handleErr, setHandleErr] = useState('')
  // UI System mode leaves every ordinary Palette state value mounted and
  // untouched until the user explicitly applies its Brand scale back.
  //
  // ADMIN-ONLY while the tool is unfinished. Both entry points (the "UI System
  // Pro" breadcrumb and the "Build UI system" toolbar button) are removed for
  // everyone else rather than shown-and-blocked: a Pro badge on a control that
  // then refuses to deliver is worse than no control, and this one was
  // advertising a paid upgrade for something not ready to be sold. The mode
  // itself, its Pro entitlement checks and applyUiBrandScale are all untouched
  // — this only decides who can reach them.
  const [uiMode, setUiMode] = useState(false)
  const canUseUiSystem = isAdminEmail(user?.email)
  // Combined community-gallery popup (Discover hand-in): one large popup with
  // Community / Variations / Brands tabs, applying a pick straight onto the board.
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryTab, setGalleryTab] = useState('community') // community | variations | brands
  // Which community palette is currently "imported" (ticked). Clicking that same
  // card again reverts to the pre-import system; any edit clears the tick because
  // the palette is now an edited derivative, not the untouched import.
  const [importedGalleryId, setImportedGalleryId] = useState(null)
  const preImportRef = useRef(null)   // snapshot of the system before the import
  const importedSigRef = useRef(null) // baseline signature of the imported board
  // Palette history: rolling localStorage log (see HISTORY_KEY above).
  const [histOpen, setHistOpen] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const resetSnapshotRef = useRef(null)
  const fileRef = useRef(null)

  // Drag-reorder plumbing + the grow-in animation slot for inserted colours.
  const dragFrom = useRef(null)
  const [overIdx, setOverIdx] = useState(null)
  const [animIdx, setAnimIdx] = useState(null) // Set<number> of columns mid grow-in, or null
  const animTimer = useRef(null)
  // Accepts a single index (the everyday single-insert path) or an array of
  // indices (the batch "insert N between" menu) so every newly-spliced slot
  // gets the same grow-in animation in one go.
  const flashIn = (i) => {
    setAnimIdx(new Set(Array.isArray(i) ? i : [i]))
    clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimIdx(null), 450)
  }
  // Slide-close: the removed column plays the reverse of the grow-in before it
  // actually leaves the array, so pressing ✕ collapses the swatch shut.
  const [outIdx, setOutIdx] = useState(null)
  const outTimer = useRef(null)
  useEffect(() => () => { clearTimeout(animTimer.current); clearTimeout(outTimer.current) }, [])

  const seedValid = normaliseHex(seedInput) != null

  // The adjust lens is non-destructive: `colors` stays raw, exports/labels use
  // the adjusted values, and the board shows the vision-simulated version.
  const adjusted = useMemo(() => applyAdjust(colors, adjust), [colors, adjust])
  const paletteScore = useMemo(() => scorePalette(adjusted), [adjusted])

  // What the seed chip and the hex field REPORT: the colour swatch 0 actually
  // is on screen — not the base the lens is derived from. Those two diverge the
  // instant any adjust slider moves, and a field reading #4A56AE above an
  // orange board is precisely the "showing a different palette to the current
  // hex" fault. The base is not lost: it is still `seed`, still what the board
  // re-derives from, and still what persists (see utils/paletteAdjust.js). It
  // simply has no business being presented as the palette's colour when it is
  // not a colour the palette contains.
  const shownSeed = normaliseHex(adjusted[0]) || seed

  // Per-column derivations that are NOT the swatch itself. tonalRamp is six
  // CAM16 solves per colour, so on a full 10-colour board that is 60 solves —
  // three times the cost of the whole adjust lens — and it was being redone on
  // every frame of every slider drag. Deferring it hands React permission to
  // drop the mini-ramps to a lower priority while the user is scrubbing: the
  // swatch colour and hex readout still track the slider frame for frame, and
  // the ramps catch up the moment the drag settles.
  const deferredAdjusted = useDeferredValue(adjusted)
  const columnMeta = useMemo(
    () => deferredAdjusted.map(c => ({ ramp: tonalRamp(c), contrast: contrastPair(c) })),
    [deferredAdjusted],
  )
  // The column TITLE names the colour in the slot, so it is keyed on the
  // DISPLAYED palette and NOT on the deferred one: a title that lags the hex
  // beside it by a frame is the same "this label describes the colour that was
  // here a moment ago" fault the fixed role labels had, just briefer. It costs
  // one CAM16 solve per colour against the six the tonal ramp above spends, so
  // it is cheap enough to keep in step. Pure over the hex list
  // (utils/paletteNames.js), so a re-render that changes no colour produces the
  // identical array and nothing re-titles.
  const columnNames = useMemo(() => adjusted.map(colorName), [adjusted])

  // Coloured slider tracks — see adjustTrackStops. Each track sweeps its own
  // axis with the other three held where the user left them, so moving Hue
  // repaints the Saturation, Tone and Temperature bars into the hue that now
  // exists. No track reads its own slider's value, so the bar under an active
  // thumb is still stable mid-drag.
  //
  // Built from the DEFERRED adjust: 4 tracks × 9 stops is 36 CAM16 round trips,
  // which is the same order as the tonal ramps below and has no business
  // running on every frame of a scrub. React drops it to a lower priority while
  // the pointer is moving and catches up when it settles — the dragged bar is
  // unaffected either way, because it does not depend on the value changing.
  const deferredAdjust = useDeferredValue(adjust)
  const trackStops = useMemo(() => adjustTrackStops(colors, deferredAdjust), [colors, deferredAdjust])
  const trackGradients = useMemo(() => adjustTrackGradientsFromStops(trackStops), [trackStops])
  // …and the handle lens: the colour the track above paints at each slider's
  // CURRENT position, sampled from those very stops. It follows the drag, which
  // is the whole point — the dot is a window onto the bar, not a lid over it.
  const handleColors = useMemo(() => adjustHandleColors(trackStops, adjust), [trackStops, adjust])
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

  // Freeze a snapshot the first time the variations tab is viewed (or after
  // invalidation). The variations grid now lives inside the combined Gallery
  // popup, so the snapshot freezes when that popup is open on the variations tab.
  useEffect(() => {
    if (galleryOpen && galleryTab === 'variations' && !varBase) setVarBase(applyAdjust(colors, adjust))
  }, [galleryOpen, galleryTab, varBase, colors, adjust])

  // Keep ProjectContext in sync so Save/overwrite capture the live palette and
  // the merged studio picks it up (same persisted shape as the studio writes).
  // `persistedPalette` writes BOTH halves: `colors` is the adjusted palette —
  // what the user sees, and what every other consumer of design.palette.colors
  // expects — while `baseColors` carries the un-lensed base this board
  // re-derives from. See utils/paletteAdjust.js for why both are needed and how
  // an older saved shape is read back without re-adjusting it.
  // Debounced: each ProjectContext write auto-persists the whole design to
  // localStorage, so writing on every tick would make slider scrubs janky —
  // rapid changes collapse into one write ~200ms after the user settles.
  useEffect(() => {
    const t = setTimeout(() => {
      setPalette({
        ...persistedPalette(colors, adjust),
        base: seed,
        harmony,
        extraColors: adjusted.slice(ROLES.length),
        locked: [...locked],
        activeIdx: 0,
      })
    }, 200)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, harmony, colors.join(','), adjusted.join(','), JSON.stringify(adjust), locked])

  // Regenerate the current system over the UNLOCKED role slots; extras stay.
  const regen = (fromSeed, type) => {
    // Free users can't regenerate through a paid/brand system — collapse to a
    // free default and snap the visible system back so the UI matches the engine.
    const sys = resolveSystem(type)
    if (sys !== harmony) setHarmony(sys)
    let gen
    try {
      gen = sys === 'auto' ? autoTonalFromSeed(fromSeed) : generateHarmony(fromSeed, sys)
    } catch {
      gen = generateHarmony(fromSeed, 'analogous')
    }
    setColors(prev => prev.map((c, i) => (i < gen.length && !locked.has(i) ? normaliseHex(gen[i]) || c : c)))
  }

  const setFromSeedInput = (raw) => {
    setSeedInput(raw)
    const norm = normaliseHex(raw)
    if (!norm) return
    setSeed(norm)
    regen(norm, harmony)
    // Zero the lens, so the colour the user just named is the colour they get.
    // Regenerating UNDER an active lens is what produced the founder's report:
    // type #4A56AE with hue at +116° and every swatch lands 116° away from it,
    // including the seed swatch the field is supposedly reporting. There is no
    // reading of "set the seed to this" that ends with the seed being something
    // else. Announced only when a lens was actually discarded, and Undo
    // restores it — see resetSnapshotRef.
    if (ADJUST_FIELDS.some(f => adjust[f.key] !== 0)) {
      setAdjust(ZERO_ADJUST)
      setLiveMsg('Seed set — global adjustments cleared so the palette matches the hex')
    }
  }

  const pickHarmony = (h) => {
    if (!h.free && !isPro) {
      openProModal({ eyebrow: 'Pro colour tools', title: 'Unlock every colour system', subtitle: 'Analogous, complementary, triadic, tetradic and custom harmonies build richer palettes than the free Auto and Monochromatic systems.' })
      return
    }
    setHarmony(h.id)
    setHarmOpen(false)
    regen(seed, h.id)
  }

  // Randomise — system-aware: a fresh seed run through the CURRENT colour
  // system, so randomise explores the system you chose instead of discarding
  // it. The engine choice lives in randomSystemPalette (utils/colors.js) —
  // 'monochromatic' used to be routed to the tonal engine here, which puts the
  // SECONDARY role on a sibling hue, so a mono shuffle came back with two hues.
  // Only 'auto' is tonal now. Locked colours always survive; HSL fallback if
  // the HCT solver ever throws.
  const randomize = useCallback(() => {
    // Same free-system guard as regen: a free user randomising from a paid/brand
    // system gets a free system instead, and the UI snaps to match.
    const sys = resolveSystem(harmony)
    if (sys !== harmony) setHarmony(sys)
    let fresh
    try {
      fresh = randomSystemPalette(sys)
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
  }, [harmony, locked, toast, resolveSystem])

  const anyPopover = saveOpen || harmOpen || visionOpen || imgOpen
    || galleryOpen || histOpen
    || tintsIdx != null || pickerIdx != null || swapIdx != null || ctxMenu != null || preview != null

  // Spacebar = randomise only from the idle Palette canvas. Buttons, links,
  // popovers and the in-place UI System own Space for activation or copy.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.defaultPrevented || e.repeat || uiMode || anyPopover) return
      if (document.querySelector('[aria-modal="true"]')) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input,textarea,select,button,a,summary,[contenteditable="true"],[role="button"],[role="menuitem"],[role="option"],[role="tab"],[role="gridcell"]')) return
      e.preventDefault()
      randomize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [randomize, uiMode, anyPopover])

  // One dismiss layer for every popover: outside pointerdown or Escape closes
  // toolbar menus (anything not inside a .plb-menuwrap) and board popovers
  // (anything not inside a .plb-pop). Escape also closes the preview modal.
  // Close every toolbar menu in one call — used by the dismiss layer and by each
  // toolbar button (so opening one always closes the rest). Setters are stable.
  const closeAllMenus = useCallback(() => {
    setSaveOpen(false); setHarmOpen(false); setVisionOpen(false); setImgOpen(false); setGalleryOpen(false); setHistOpen(false)
  }, [])
  useEffect(() => {
    if (!anyPopover) return
    const closePops = () => { setTintsIdx(null); setPickerIdx(null); setSwapIdx(null); setCtxMenu(null) }
    const onDown = (e) => {
      if (!e.target.closest('.plb-menuwrap')) closeAllMenus()
      if (!e.target.closest('.plb-pop')) closePops()
    }
    const onEsc = (e) => {
      if (e.key !== 'Escape') return
      closeAllMenus(); closePops(); setPreview(null)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [anyPopover, closeAllMenus])

  // Record the board into palette history. Debounced so slider scrubs and
  // rapid randomises collapse into one entry; identical heads are skipped.
  useEffect(() => {
    const t = setTimeout(() => {
      setHistory(prev => {
        const snapshot = {
          colors: [...colors],
          seed,
          seedInput,
          harmony,
          locked: [...locked],
          adjust: { ...adjust },
          vision,
          showContrast,
          importedGalleryId,
          at: Date.now(),
        }
        const signature = paletteSignature(snapshot)
        if (prev[0] && paletteSignature(prev[0]) === signature) return prev
        const next = [snapshot, ...prev.filter(entry => paletteSignature(entry) !== signature)].slice(0, HISTORY_MAX)
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* quota / disabled */ }
        return next
      })
    }, 900)
    return () => clearTimeout(t)
  }, [colors, seed, seedInput, harmony, locked, adjust, vision, showContrast, importedGalleryId])

  const toggleLock = (i) => {
    setLocked(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i); setLiveMsg(`Colour ${i + 1} unlocked`) }
      else { next.add(i); setLiveMsg(`Colour ${i + 1} locked`) }
      return next
    })
  }

  // Swap in the direction explicitly chosen by the user. Roles are positional,
  // locks travel with their colours, and swapping across position zero updates
  // the visible seed so the toolbar never describes a different first swatch.
  const swapCols = (i, direction) => {
    const j = direction === 'left' ? i - 1 : i + 1
    if (j < 0 || j >= colors.length || j === i) return
    const nextFirst = i === 0 ? colors[j] : j === 0 ? colors[i] : null
    setColors(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n })
    setLocked(prev => {
      const next = new Set(prev)
      const a = next.has(i), b = next.has(j)
      next.delete(i); next.delete(j)
      if (a) next.add(j)
      if (b) next.add(i)
      return next
    })
    if (nextFirst) { setSeed(nextFirst); setSeedInput(nextFirst) }
    setSwapIdx(null)
    setLiveMsg(`Colour swapped ${direction}`)
  }

  // Drag-reorder: full splice move (not a swap) so the whole row shifts to
  // close the gap, matching how the columns visually reflow. Locks travel
  // with their colour.
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
    if (outIdx != null) return // let the current close animation finish first
    setTintsIdx(null); setPickerIdx(null); setCtxMenu(null)
    const drop = () => {
      setColors(prev => prev.filter((_, k) => k !== i))
      setLocked(prev => {
        const next = new Set()
        prev.forEach(k => { if (k < i) next.add(k); else if (k > i) next.add(k - 1) })
        return next
      })
      setOutIdx(null)
      setLiveMsg('Colour removed')
    }
    // Slide the swatch closed first (reverse of the grow-in), then splice it out.
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { drop(); return }
    setOutIdx(i)
    clearTimeout(outTimer.current)
    outTimer.current = setTimeout(drop, 300)
  }

  // Single insert path for the Add block AND the click-between gaps — gates
  // the caps, shifts locks right, and flags the slot for the grow-in animation.
  const insertAt = (idx, hex) => {
    if (colors.length >= HARD_MAX) { toast?.(`Palettes max out at ${HARD_MAX} colours`); return }
    if (!isPro && colors.length >= PRO_MAX) {
      openProModal({ eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
      return
    }
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

  // Batch insert for the gap right-click menu — computes and splices all `n`
  // evenly-spaced steps in ONE pass. Deliberately NOT a loop over insertAt:
  // insertAt reads colors.length from the render closure and would re-check a
  // stale length on each call, and would re-mid the ORIGINAL pair each time
  // instead of producing evenly-spaced steps between the two neighbours.
  // Enforces both caps itself rather than relying on insertAt.
  const insertBetweenMany = (i, n) => {
    const hardRoom = HARD_MAX - colors.length
    if (n > hardRoom) { toast?.(`Palettes max out at ${HARD_MAX} colours`); return }
    const ceiling = isPro ? HARD_MAX : PRO_MAX
    const room = ceiling - colors.length
    if (n > room) {
      openProModal({ eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
      return
    }
    const a = colors[i]
    const b = colors[Math.min(i + 1, colors.length - 1)]
    const at = i + 1
    const steps = Array.from({ length: n }, (_, k) => stepColor(a, b, (k + 1) / (n + 1)))
    setColors(prev => { const next = [...prev]; next.splice(at, 0, ...steps); return next })
    setLocked(prev => {
      const next = new Set()
      prev.forEach(k => next.add(k >= at ? k + n : k))
      return next
    })
    flashIn(Array.from({ length: n }, (_, k) => at + k))
    setLiveMsg(`${n} colour${n === 1 ? '' : 's'} added`)
  }

  const setColorAt = (i, hex) => {
    setColors(prev => prev.map((c, k) => (k === i ? hex : c)))
    if (i === 0) { setSeed(hex); setSeedInput(hex) }
    // Hand-editing a value diverges from any active paid/brand system. For free
    // users, snap the visible System back to a free default so a brand's paid
    // system can't linger as a backdoor into the paid engine on the next regen.
    const sys = resolveSystem(harmony)
    if (sys !== harmony) setHarmony(sys)
  }

  // Per-colour HCT editing is a Pro tool — free users get the upgrade modal
  // instead of the picker; Pro users toggle the picker open on that column.
  const openHctPicker = (i) => {
    setCtxMenu(null)
    if (!isPro) {
      openProModal({ eyebrow: 'Pro colour tools', title: 'Fine-tune any colour in HCT', subtitle: 'Edit hue, chroma and tone on each colour individually with the HCT picker — perceptual control the free tier keeps read-only.' })
      return
    }
    setTintsIdx(null); setPickerIdx(p => (p === i ? null : i))
  }

  // Load a file into the picker: validate type + 4 MB cap, keep its ImageData
  // for live sampling, and auto-extract a first set of picker points.
  const loadImageFile = async (file) => {
    if (!file) return
    setImgError('')
    if (!file.type.startsWith('image/')) { setImgError('That file isn’t an image.'); return }
    if (file.size > IMG_MAX_MB * 1024 * 1024) {
      setImgError(`That image is over ${IMG_MAX_MB} MB — pick a smaller one.`); return
    }
    try {
      const { data, url } = await loadImageData(file)
      imgDataRef.current = data
      setImgSrc(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      setImgPoints(dominantSwatches(data, Math.min(colors.length, PRO_MAX)))
    } catch (err) {
      setImgError(err?.message || 'Couldn’t read that image')
    }
  }

  const onImageFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    loadImageFile(file)
  }

  const onImageDrop = (e) => {
    e.preventDefault(); setImgDragOver(false)
    loadImageFile(e.dataTransfer.files?.[0])
  }

  // Re-run automatic extraction over the current image (reset / auto).
  const autoExtractImage = () => {
    if (!imgDataRef.current) return
    setImgPoints(dominantSwatches(imgDataRef.current, Math.min(imgPoints.length || colors.length, PRO_MAX)))
  }

  const clearImage = () => {
    setImgSrc(prev => { if (prev) URL.revokeObjectURL(prev); return '' })
    imgDataRef.current = null
    setImgPoints([]); setImgError('')
  }

  const addImagePoint = () => {
    if (!imgDataRef.current || imgPoints.length >= PRO_MAX) return
    setImgPoints(prev => [...prev, { x: 0.5, y: 0.5, hex: sampleImageData(imgDataRef.current, 0.5, 0.5) }])
  }
  const removeImagePoint = () => {
    setImgPoints(prev => (prev.length > 2 ? prev.slice(0, -1) : prev))
  }

  // Drag a picker point across the image; re-sample the pixel under it live.
  const moveImagePoint = (clientX, clientY) => {
    const idx = imgDragIdx.current
    const stage = imgStageRef.current
    if (idx == null || !stage || !imgDataRef.current) return
    const r = stage.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height))
    const hex = sampleImageData(imgDataRef.current, x, y)
    setImgPoints(prev => prev.map((p, i) => (i === idx ? { x, y, hex } : p)))
  }
  useEffect(() => {
    if (!imgSrc) return
    const onMove = (e) => { if (imgDragIdx.current != null) { e.preventDefault(); moveImagePoint(e.clientX, e.clientY) } }
    const onUp = () => { imgDragIdx.current = null }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [imgSrc])
  // Release the preview object URL when the picker unmounts.
  useEffect(() => () => { if (imgSrc) URL.revokeObjectURL(imgSrc) }, [imgSrc])

  // Apply the picked colours to the board — free, no login (saving is gated
  // elsewhere). Locked slots survive; the board grows to fit up to PRO_MAX.
  const applyImagePalette = () => {
    const picks = imgPoints.map(p => p.hex)
    if (!picks.length) return
    applyPalette(picks, 'Palette pulled from the image')
    setImgOpen(false)
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

  const resetPalette = () => {
    const current = {
      colors: [...colors],
      seed,
      seedInput,
      harmony,
      locked: [...locked],
      adjust: { ...adjust },
      vision,
      showContrast,
      importedGalleryId,
      preImport: preImportRef.current,
      importedSig: importedSigRef.current,
      at: Date.now(),
    }
    const defaults = generateHarmony(DEFAULT_SEED, 'analogous')
    const baseline = {
      colors: defaults,
      seed: DEFAULT_SEED,
      seedInput: DEFAULT_SEED,
      harmony: 'analogous',
      locked: [],
      adjust: ZERO_ADJUST,
      vision: 'normal',
      showContrast: false,
      importedGalleryId: null,
    }
    const defaultPalette = paletteSignature(current) === paletteSignature(baseline)
    // Preserve the first meaningful pre-reset snapshot when Reset is pressed
    // repeatedly. Without this guard, a defensive double-click replaces the
    // recoverable state with an already-reset board.
    if (!resetSnapshotRef.current || !defaultPalette) {
      resetSnapshotRef.current = {
        before: current,
        baseline,
      }
    }
    setHistory(prev => {
      const signature = paletteSignature(current)
      const withoutDuplicate = prev.filter((entry) => paletteSignature(entry) !== signature)
      const next = [current, ...withoutDuplicate].slice(0, HISTORY_MAX)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* quota / disabled */ }
      return next
    })
    setColors(defaults)
    setSeed(DEFAULT_SEED)
    setSeedInput(DEFAULT_SEED)
    setHarmony('analogous')
    setLocked(new Set())
    setAdjust(ZERO_ADJUST)
    setVision('normal')
    setShowContrast(false)
    setImportedGalleryId(null)
    preImportRef.current = null
    importedSigRef.current = null
    setTintsIdx(null)
    setPickerIdx(null)
    setSwapIdx(null)
    setCtxMenu(null)
    setPreview(null)
    setVarBase(null)
    setActiveVar(null)
    closeAllMenus()
    setLiveMsg('Palette reset to the default system')
    toast?.('Palette reset · Undo is available')
  }

  const undoPalette = () => {
    const resetSnapshot = resetSnapshotRef.current
    if (resetSnapshot) {
      const current = {
        colors, seed, seedInput, harmony, locked: [...locked], adjust, vision,
        showContrast, importedGalleryId,
      }
      const editedAfterReset = paletteSignature(current) !== paletteSignature(resetSnapshot.baseline)
      const target = editedAfterReset ? resetSnapshot.baseline : resetSnapshot.before
      setColors(target.colors)
      setSeed(target.seed || target.colors[0])
      setSeedInput(target.seedInput || target.seed || target.colors[0])
      setHarmony(target.harmony || 'analogous')
      setLocked(new Set(target.locked || []))
      setAdjust({ ...(target.adjust || ZERO_ADJUST) })
      setVision(target.vision || 'normal')
      setShowContrast(Boolean(target.showContrast))
      setImportedGalleryId(target.importedGalleryId || null)
      preImportRef.current = target.preImport || null
      importedSigRef.current = target.importedSig || null
      resetSnapshotRef.current = null
      if (editedAfterReset) {
        const editedSignature = paletteSignature(current)
        setHistory(prev => {
          const next = prev.filter(entry => paletteSignature(entry) !== editedSignature)
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* quota / disabled */ }
          return next
        })
      }
      setLiveMsg('Palette state restored')
      toast?.('Palette state restored')
      return
    }
    const currentSignature = paletteSignature({
      colors, seed, harmony, locked: [...locked], adjust, vision, showContrast, importedGalleryId,
    })
    const entry = history.find((item) => paletteSignature(item) !== currentSignature)
    if (!entry) return
    const restored = entry.colors.slice(0, HARD_MAX)
    setColors(restored)
    setSeed(entry.seed || restored[0])
    setSeedInput(entry.seedInput || entry.seed || restored[0])
    setHarmony(entry.harmony || 'analogous')
    setAdjust({ ...(entry.adjust || ZERO_ADJUST) })
    setLocked(new Set(entry.locked || []))
    setVision(entry.vision || 'normal')
    setShowContrast(Boolean(entry.showContrast))
    setImportedGalleryId(entry.importedGalleryId || null)
    setLiveMsg('Last palette restored')
    toast?.('Last palette restored')
  }

  const pickVariation = (v, idx) => {
    if (!isPro && idx >= FREE_VARIATIONS) {
      openProModal({ eyebrow: 'Pro colour tools', title: 'Every variation, unlocked', subtitle: 'Free covers the first set of generated variations; Pro unlocks the full range of alternates for any palette.' })
      return
    }
    // Preserve the frozen list across this apply so reopening the menu shows the
    // same variations with this one ticked, instead of rotating to a fresh set.
    skipVarInvalidate.current = true
    setActiveVar(v.id)
    applyPalette(v.colors, `Applied variation: ${v.label}`)
    setGalleryOpen(false)
  }
  const compareVariation = (v, idx) => {
    // Free users can compare the free variations; the Pro-only rows stay gated.
    if (!isPro && idx >= FREE_VARIATIONS) {
      openProModal({ eyebrow: 'Pro colour tools', title: 'Compare every variation', subtitle: 'Line palettes up side by side to compare them. Free covers the first set of variations; Pro unlocks the full range.' })
      return
    }
    setGalleryOpen(false)
    setPreview({ mode: 'light', tab: 'ui', compare: v })
  }
  // Generic "line it up against the current palette" — used by the brand and
  // community rows, which carry no precomputed score, so we compute one here.
  const comparePalette = (label, colors) => {
    const cols = colors.map(c => normaliseHex(c)).filter(Boolean)
    if (cols.length < 2) return
    setGalleryOpen(false)
    setPreview({ mode: 'light', tab: 'ui', compare: { label, colors: cols, score: scorePalette(cols) } })
  }
  // Import a community-gallery palette as a toggle. The FIRST import snapshots
  // the user's own pre-gallery system; applying it ticks the card. Clicking the
  // SAME (ticked) card — or switching to a different card and toggling it —
  // reverts to that original snapshot, never to an intermediate gallery pick.
  // Any edit afterwards clears the tick (see the edit-detection effect) because
  // the board is now a derivative. Enabling a palette applies it directly — no
  // info popup — so the whole gallery swatch reads as a one-click select.
  const importGalleryPalette = (cols, name, id) => {
    if (importedGalleryId === id && preImportRef.current) {
      const snap = preImportRef.current
      setColors(snap.colors)
      setAdjust(snap.adjust)
      setSeed(snap.seed)
      setSeedInput(snap.seedInput)
      preImportRef.current = null
      importedSigRef.current = null
      setImportedGalleryId(null)
      setLiveMsg('Reverted to your previous palette')
      toast?.('Reverted to your previous palette')
      return
    }
    // Snapshot only the user's own palette — the one in place before any gallery
    // import. Switching gallery A → B must NOT overwrite it, so revert always
    // lands on the user's work, not the previously-selected gallery item.
    if (!preImportRef.current) preImportRef.current = { colors, adjust, seed, seedInput }
    importedSigRef.current = null // let the effect record the imported baseline
    applyPalette(cols, `Loaded ${name}`)
    setImportedGalleryId(id)
    // Keep the gallery popup open so selecting swatches reads as a live toggle —
    // the user can compare picks (and untick to revert) without reopening it.
  }
  // Clear the imported tick once the board diverges from the imported baseline.
  // The first run after an import records the baseline (colours + adjust lens);
  // any later change to either means the user customised it → drop the tick.
  useEffect(() => {
    if (!importedGalleryId) return
    const sig = `${colors.join(',')}|${JSON.stringify(adjust)}`
    if (importedSigRef.current == null) {
      importedSigRef.current = sig
    } else if (sig !== importedSigRef.current) {
      importedSigRef.current = null
      preImportRef.current = null
      setImportedGalleryId(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, JSON.stringify(adjust), importedGalleryId])
  const pickBrand = (b) => {
    if (!b.free && !isPro) {
      openProModal({ eyebrow: 'Pro colour tools', title: 'Load any brand system', subtitle: 'Free covers a handful of starter brands; Pro unlocks the full set — each one applies the brand’s whole colour system, not just its swatches.' })
      return
    }
    // Selecting a brand applies its WHOLE system. Pro users keep the brand's
    // system; free users get the exact colours on the free default so the brand
    // can't smuggle in the paid harmony engine when they start editing.
    const sys = resolveSystem(b.system || 'custom')
    setHarmony(sys)
    applyPalette(b.colors, `Loaded the ${b.name} palette`)
    setGalleryOpen(false)
  }

  const cssExport = useMemo(() => {
    const lines = adjusted.map((c, i) => {
      const role = i < ROLES.length ? ROLES[i].toLowerCase() : `alternative-${i - ROLES.length + 1}`
      return `  --color-${role}: ${c};`
    })
    return `:root {\n${lines.join('\n')}\n}`
  }, [adjusted])

  // ── Hand-offs into the sibling colour tools ─────────────────────────────────
  // Both carry what the user is actually LOOKING at (the adjusted values, never
  // the raw base) through the in-memory slot in utils/colorHandoff: versioned,
  // nothing persisted, consumed exactly once at the destination. A reload or a
  // direct visit to either tool finds nothing and it opens in its normal state.
  // If navigation ever throws, the staged draft is dropped so it can't leak into
  // a later, unrelated visit.
  const openInGradient = () => {
    closeAllMenus()
    if (!setGradientDraft(adjusted)) {
      toast?.('A gradient needs two different colours — add another to the board first')
      return
    }
    setLiveMsg('Opening your palette in the Gradient Generator')
    try {
      navigate('/color/gradient')
    } catch {
      resetGradientDraft()
      toast?.('Couldn’t open the Gradient Generator — try again')
    }
  }

  const openInTint = (hex) => {
    if (!setTintDraft([hex])) { toast?.('That colour couldn’t be handed over — try another'); return }
    setTintsIdx(null)
    setLiveMsg(`Opening ${hex} in the Tint Generator`)
    try {
      navigate('/color/tint')
    } catch {
      resetTintDraft()
      toast?.('Couldn’t open the Tint Generator — try again')
    }
  }

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
      // Free exports carry a small brand watermark; Pro exports stay clean.
      if (!isPro) {
        const label = 'Made with UIL4B'
        g.font = '700 22px Outfit, system-ui, sans-serif'
        const tw = g.measureText(label).width
        const padX = 14, bh = 34, margin = 22, bw = tw + padX * 2
        const bx = w - margin - bw, by = margin
        g.fillStyle = 'rgba(0,0,0,.5)'
        if (g.roundRect) { g.beginPath(); g.roundRect(bx, by, bw, bh, 10); g.fill() }
        else g.fillRect(bx, by, bw, bh)
        g.fillStyle = '#FFFFFF'
        g.textAlign = 'left'
        g.textBaseline = 'middle'
        g.fillText(label, bx + padX, by + bh / 2 + 1)
      }
      canvas.toBlob((blob) => {
        if (!blob) { toast?.('Couldn’t render the image'); return }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'uil4b-palette.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      })
      setSaveOpen(false)
    } catch {
      toast?.('Couldn’t render the image')
    }
  }

  // Open the submit popup. Community actions require a login (Wave-1 "still
  // free" popup) — on success we prefill a themed name to nudge the user, then
  // the popup handles the handle gate + final submit. The submission form is
  // never rendered for a signed-out user; the sign-in prompt comes first and
  // says plainly why an account is needed.
  const openSubmitForm = useCallback(() => {
    consumeSubmitIntent()
    setSaveOpen(false)
    setSubmitErr('')
    setSubmitName(n => n.trim() || randomPaletteName(adjusted))
    setSubmitOpen(true)
  }, [adjusted])

  const openSubmit = useCallback(async () => {
    // Auth still resolving — we know neither answer, so show neither prompt.
    if (authLoading) return
    if (!uid) {
      setSubmitIntent(SUBMIT_SURFACE)
      const signedIn = await requireLogin('submit this palette to the community', {
        free: true,
        reasons: COMMUNITY_SUBMIT_REASONS,
      })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    openSubmitForm()
  }, [authLoading, uid, requireLogin, openSubmitForm])

  // Resume the intent when signing in remounted this surface — the awaited
  // handler above would have been discarded with the old tree. In-memory only:
  // a full page reload finds nothing and the page opens normally.
  useEffect(() => {
    if (authLoading || !uid) return
    if (!hasSubmitIntent(SUBMIT_SURFACE)) return
    openSubmitForm()
  }, [authLoading, uid, openSubmitForm])

  // Save the one-time community handle after the profanity/evasion filter.
  // NOTE: uniqueness is only checked against handles seen on THIS device — the
  // community store is localStorage today. Server-side (Firestore) uniqueness
  // is deferred to the founder (flagged: needs a Firestore rule/transaction).
  const saveHandle = () => {
    const problem = handleProblem(handleInput)
    if (problem) { setHandleErr(problem); return }
    const clean = handleInput.trim()
    try { localStorage.setItem(HANDLE_KEY, clean) } catch { /* private mode */ }
    setHandle(clean); setHandleInput(''); setHandleErr('')
  }

  // Community submission — same localStorage store + shape Community.jsx
  // renders, with the palette link as the URL so the card opens this board.
  const submitToCommunity = () => {
    const name = submitName.trim()
    if (!name) { setSubmitErr('Give the palette a name first.'); return }
    const publicHandle = ownerHandle?.publicHandle || (handle ? '@' + handle : '')
    if (!publicHandle) { setSubmitErr('Set your community handle first.'); return }
    try {
      appendCommunitySubmission({
        id: 'u' + Date.now(),
        name,
        author: publicHandle,
        ownerId: ownerHandle ? PUBLIC_OWNER_ID : undefined,
        category: 'Branding',
        url: shareLink(),
        c1: adjusted[0],
        c2: adjusted[1] || adjusted[0],
        colors: adjusted,
        saves: 0,
        mine: true,
      })
      setSubmitName('')
      setSubmitOpen(false)
      toast?.('Submitted to the community — thanks!')
    } catch {
      setSubmitErr('Couldn’t submit right now.')
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
  const canUndo = resetSnapshotRef.current != null
    || history.some((entry) => paletteSignature(entry) !== paletteSignature({
      colors, seed, harmony, locked: [...locked], adjust, vision, showContrast, importedGalleryId,
    }))
  const activeHarmony = HARMONIES.find(h => h.id === harmony) || HARMONIES[0]
  const activeVision = VISION_MODES.find(([id]) => id === vision) || VISION_MODES[0]

  const applyUiBrandScale = scale => {
    if (entitlementLoading || !isPro) {
      openProModal({
        eyebrow: 'UI System · Pro',
        title: 'Apply a complete Brand scale',
        subtitle: 'Pro can transfer all nine Brand shades into the editable Palette while keeping Brand 500 as its first swatch and seed.',
      })
      return false
    }
    const next = scale.map(normaliseHex).filter(Boolean).slice(0, HARD_MAX)
    if (next.length !== 9) return false
    setColors(next)
    setSeed(next[0])
    setSeedInput(next[0])
    setHarmony('custom')
    setLocked(new Set())
    setAdjust(ZERO_ADJUST)
    setImportedGalleryId(null)
    setLiveMsg('Brand 500 and the remaining Brand scale applied to Palette.')
    setUiMode(false)
    return true
  }

  // Belt and braces: the entry points are gone for non-admins, so this can only
  // fire if the flag is reached some other way. It renders the ordinary board
  // rather than an error, because there is nothing here a visitor did wrong.
  if (uiMode && canUseUiSystem) {
    return (
      <div className="plb plb--ui-system">
        <UiSystemBuilder
          initialSeed={seed}
          isPro={isPro}
          entitlementLoading={entitlementLoading}
          onBack={() => setUiMode(false)}
          onApplyBrand={applyUiBrandScale}
          onCopy={onCopy}
          toast={toast}
        />
      </div>
    )
  }

  return (
    <div className="plb">
      <p className="sr-only" aria-live="polite">{liveMsg}</p>

      {/* ── Toolbar ── */}
      <header className="plb-toolbar">
        <div className="plb-toolbar-group">
          <div className="plb-mode-switch">
            <h1 className="plb-title">Palette</h1>
            {canUseUiSystem && (
              <>
                <span aria-hidden="true">/</span>
                <button type="button" aria-label="Open UI System mode" onClick={() => setUiMode(true)}>
                  UI System <span>Admin</span>
                </button>
              </>
            )}
          </div>
          <div className="plb-seedpick">
            <ColorPickerPop
              value={shownSeed}
              onChange={(hex) => setFromSeedInput(hex.toUpperCase())}
              ariaLabel="Pick seed colour"
            />
          </div>
          <input
            type="text"
            className={seedValid ? 'plb-hexfield' : 'plb-hexfield plb-hexfield--bad'}
            value={seedFocused ? seedInput : shownSeed}
            onChange={(e) => setFromSeedInput(e.target.value)}
            onFocus={() => { setSeedInput(shownSeed); setSeedFocused(true) }}
            onBlur={() => { setSeedFocused(false); setSeedInput(shownSeed) }}
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
              onClick={() => { const n = !harmOpen; closeAllMenus(); setHarmOpen(n) }}
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
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-icobtn"
              aria-label="Image"
              aria-expanded={imgOpen}
              title="Pull colours from an image"
              onClick={() => { const n = !imgOpen; closeAllMenus(); setImgOpen(n) }}
            >
              <IcoImage /><span className="plb-lbl"><span className="plb-lbl-i">Image</span></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="plb-file" onChange={onImageFile} aria-hidden="true" tabIndex={-1} />
            {imgOpen && (
              <div className="plb-menu plb-menu--left plb-imgmenu" role="menu" aria-label="Pull colours from an image">
                <div className="plb-menu-title">From image</div>
                {!imgSrc ? (
                  <>
                    <div
                      className={imgDragOver ? 'plb-imgdrop plb-imgdrop--over' : 'plb-imgdrop'}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setImgDragOver(true) }}
                      onDragLeave={() => setImgDragOver(false)}
                      onDrop={onImageDrop}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
                    >
                      <IcoImage />
                      <div className="plb-imgdrop-t">Drag an image here</div>
                      <div className="plb-imgdrop-s">or click to browse · PNG, JPG, up to {IMG_MAX_MB} MB</div>
                    </div>
                    {imgError && <div className="plb-imgerr" role="alert">{imgError}</div>}
                  </>
                ) : (
                  <>
                    <div className="plb-imgstage" ref={imgStageRef}>
                      <img src={imgSrc} alt="Uploaded reference" className="plb-imgstage-img" draggable={false} />
                      {imgPoints.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          className="plb-imgpoint"
                          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, background: p.hex }}
                          onPointerDown={(e) => { e.preventDefault(); imgDragIdx.current = i }}
                          aria-label={`Picker point ${i + 1}: ${p.hex}`}
                          title={p.hex}
                        />
                      ))}
                    </div>
                    <div className="plb-imgstrip">
                      {imgPoints.map((p, i) => (
                        <div key={i} className="plb-imgswatch" style={{ background: p.hex }} title={p.hex} />
                      ))}
                    </div>
                    <div className="plb-imgcount">
                      <span className="plb-imgcount-l">Colours</span>
                      <div className="plb-imgcount-ctl">
                        <button type="button" className="plb-imgcount-btn" onClick={removeImagePoint} disabled={imgPoints.length <= 2} aria-label="Fewer colours">−</button>
                        <span className="plb-imgcount-n">{imgPoints.length}</span>
                        <button type="button" className="plb-imgcount-btn" onClick={addImagePoint} disabled={imgPoints.length >= PRO_MAX} aria-label="More colours">+</button>
                      </div>
                    </div>
                    <div className="plb-imgactions">
                      <button type="button" className="btn btn-s btn-ghost" onClick={autoExtractImage}>Reset / auto</button>
                      <button type="button" className="btn btn-s btn-ghost" onClick={() => fileRef.current?.click()}>Replace</button>
                      <button type="button" className="btn btn-s" onClick={applyImagePalette}>Apply</button>
                    </div>
                    <button type="button" className="plb-imgclear" onClick={clearImage}>Remove image</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* One gallery button → a large community-gallery popup with three
              nested tabs: browse Community palettes, this palette's Variations,
              and curated Brand systems. */}
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-icobtn"
              aria-label="Explore"
              aria-expanded={galleryOpen}
              aria-haspopup="dialog"
              title="Explore — community palettes, variations and brand systems"
              onClick={() => { const n = !galleryOpen; closeAllMenus(); setGalleryOpen(n) }}
            >
              <IcoExplore /><span className="plb-lbl"><span className="plb-lbl-i">Explore</span></span>
            </button>
            {galleryOpen && (
              <div className="plb-menu plb-menu--left plb-galpopup" role="dialog" aria-label="Colour gallery" data-lenis-prevent>
                <div className="plb-galpopup-head">
                  <div className="plb-menu-title">{galleryTab === 'community' ? 'Community gallery' : galleryTab === 'variations' ? 'Variations' : 'Brand systems'}</div>
                  <div className="plb-galtabs" role="tablist" aria-label="Gallery sections">
                    <button type="button" role="tab" aria-selected={galleryTab === 'community'} className={galleryTab === 'community' ? 'plb-galtab plb-galtab--on' : 'plb-galtab'} onClick={() => setGalleryTab('community')}><IcoGallery /> Community</button>
                    <button type="button" role="tab" aria-selected={galleryTab === 'variations'} className={galleryTab === 'variations' ? 'plb-galtab plb-galtab--on' : 'plb-galtab'} onClick={() => setGalleryTab('variations')}><IcoSpark /> Variations</button>
                    <button type="button" role="tab" aria-selected={galleryTab === 'brands'} className={galleryTab === 'brands' ? 'plb-galtab plb-galtab--on' : 'plb-galtab'} onClick={() => setGalleryTab('brands')}><IcoBookmark /> Brands</button>
                  </div>
                </div>

                {galleryTab === 'community' && (
                  <div className="plb-galpopup-body">
                    <PaletteGalleryGrid
                      toast={toast}
                      selectedId={importedGalleryId}
                      onPick={(cols, name, id) => importGalleryPalette(cols, name, id)}
                      onCompare={(cols, name) => comparePalette(name, cols)}
                    />
                    <div className="plb-menu-sub">Browse the full set in <Link to="/discover" onClick={() => setGalleryOpen(false)}>Discover</Link></div>
                  </div>
                )}

                {galleryTab === 'variations' && (
                  <div className="plb-galpopup-body">
                    <div className="plb-galpopup-note">
                      <span>Generated from your current palette</span>
                      <span className="plb-score" title="Palette quality score — tone range, evenness, chroma profile and distinctness">Current {paletteScore}</span>
                    </div>
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
                              title="Compare with the current palette"
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
                )}

                {galleryTab === 'brands' && (
                  <div className="plb-galpopup-body">
                    {BRAND_PALETTES.map(b => {
                      const gated = !b.free && !isPro
                      return (
                        <div key={b.id} className={`plb-varrow${gated ? ' plb-varrow--locked' : ''}`}>
                          <button type="button" className="plb-varrow-main" onClick={() => pickBrand(b)}>
                            <span className="plb-strip" aria-hidden="true">
                              {b.colors.map((c, k) => <span key={k} className="plb-strip-c" ref={barRef(c)} />)}
                            </span>
                            <span className="plb-varrow-name">{b.name}</span>
                            {gated && <span className="plb-tab-lock"><IcoLock size={11} /></span>}
                          </button>
                          {!gated && (
                            <button
                              type="button"
                              className="plb-varrow-cmp"
                              title="Compare with the current palette"
                              aria-label={`Compare ${b.name} with the current palette`}
                              onClick={() => comparePalette(b.name, b.colors)}
                            >
                              <IcoEye />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="button" className="btn btn-s plb-icobtn" aria-label="Preview" title="Preview the palette on a UI mockup" onClick={() => setPreview({ mode: 'light', tab: 'ui', compare: null })}>
            <IcoEye /><span className="plb-lbl"><span className="plb-lbl-i">Preview</span></span>
          </button>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={visionOpen}
              aria-haspopup="menu"
              title="Vision type — split each swatch to preview it through a colour-vision deficiency"
              onClick={() => { const n = !visionOpen; closeAllMenus(); setVisionOpen(n) }}
            >
              <VisionGlyph id={vision} size={13} />
              <span className="plb-harm-k">Vision type</span>
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
          <button
            type="button"
            className="btn btn-s plb-icobtn"
            aria-label="Gradient"
            title="Open this palette in the Gradient Generator"
            onClick={openInGradient}
          >
            <IcoGradient /><span className="plb-lbl"><span className="plb-lbl-i">Gradient</span></span>
          </button>
          {canUseUiSystem && (
            <button type="button" className="btn btn-s" onClick={() => setUiMode(true)} title="Build a complete UI colour system from Brand 500"><IcoSliders /> Build UI system</button>
          )}
          <button type="button" className="btn btn-s btn-accent plb-random" onClick={randomize}>
            <IcoShuffle /> Randomise <kbd className="plb-kbd">Space</kbd>
          </button>
          <button type="button" className="btn btn-s plb-icobtn" aria-label="Undo" onClick={undoPalette} disabled={!canUndo} title="Undo the last palette change">
            <IcoUndo /><span className="plb-lbl"><span className="plb-lbl-i">Undo</span></span>
          </button>
          <button type="button" className="btn btn-s plb-icobtn" aria-label="Reset" onClick={resetPalette} title="Reset every palette control to its default">
            <IcoReset /><span className="plb-lbl"><span className="plb-lbl-i">Reset</span></span>
          </button>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-icobtn"
              aria-label="History"
              aria-expanded={histOpen}
              aria-haspopup="menu"
              title="Palette history — jump back to any board you've had"
              onClick={() => { const n = !histOpen; closeAllMenus(); setHistOpen(n) }}
            >
              <IcoHistory /><span className="plb-lbl"><span className="plb-lbl-i">History</span></span>
            </button>
            {histOpen && (
              <div className="plb-menu plb-histmenu" role="menu" aria-label="Palette history" data-lenis-prevent>
                <div className="plb-menu-title">History</div>
                {history.length === 0 ? (
                  <div className="plb-menu-sub">No history yet — every palette you build lands here automatically</div>
                ) : (
                  <>
                    <div className="plb-scrolllist">
                      {history.map((h, i) => (
                        <button
                          key={`${h.at}-${i}`}
                          type="button"
                          role="menuitem"
                          className="plb-varrow"
                          onClick={() => {
                            setColors(h.colors.slice(0, HARD_MAX))
                            setSeed(h.seed || h.colors[0])
                            setSeedInput(h.seedInput || h.seed || h.colors[0])
                            setHarmony(h.harmony || 'analogous')
                            setLocked(new Set(h.locked || []))
                            setAdjust({ ...(h.adjust || ZERO_ADJUST) })
                            setVision(h.vision || 'normal')
                            setShowContrast(Boolean(h.showContrast))
                            setImportedGalleryId(h.importedGalleryId || null)
                            setLiveMsg('Palette restored from history')
                            toast?.('Palette restored from history')
                            setHistOpen(false)
                          }}
                        >
                          <span className="plb-strip" aria-hidden="true">
                            {h.colors.slice(0, 6).map((c, k) => <span key={k} className="plb-strip-c" ref={barRef(c)} />)}
                          </span>
                          <span className="plb-varrow-name">{h.colors.length} colours<small>{timeAgo(h.at)}</small></span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="plb-menu-item plb-histclear"
                      onClick={() => { setHistory([]); try { localStorage.removeItem(HISTORY_KEY) } catch { /* disabled */ } }}
                    >
                      Clear history
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <span className="plb-toolbar-sep" aria-hidden="true" />
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s btn-accent plb-icobtn"
              aria-label="Save / export"
              aria-expanded={saveOpen}
              aria-haspopup="dialog"
              title="Save, share or export this palette"
              onClick={async () => {
                if (!canSaveProjects) {
                  const user = await requireLogin('save this palette', { free: true })
                  if (!user) return
                }
                const n = !saveOpen; closeAllMenus(); setSaveOpen(n)
              }}
            >
              <IcoBookmark /><span className="plb-lbl"><span className="plb-lbl-i">Save / export</span></span>
            </button>
            {saveOpen && (
              <div className="plb-menu plb-menu--left plb-savemenu" role="dialog" aria-label="Save, share and export this palette" data-lenis-prevent>
                <div className="plb-menu-title">Save to a project</div>
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
                    <div className="plb-scrolllist">
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
                    </div>
                  </>
                )}
                <div className="plb-menu-div" role="separator" />
                <div className="plb-menu-sub">Share</div>
                <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(shareLink()); setSaveOpen(false) }}><IcoCopy /> Copy link to this palette</button>
                <div className="plb-menu-sub">Export</div>
                <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(cssExport); setSaveOpen(false) }}><IcoCopy /> Copy CSS variables</button>
                <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(adjusted.join(', ')); setSaveOpen(false) }}><IcoCopy /> Copy hex values</button>
                <button type="button" className="plb-menu-item" onClick={downloadPng}><IcoDownload /> Download PNG card</button>
                <div className="plb-menu-sub">Community</div>
                <button
                  type="button"
                  className="plb-menu-item"
                  onClick={openSubmit}
                  disabled={authLoading}
                  aria-busy={authLoading || undefined}
                  title={authLoading ? 'Checking your account…' : undefined}
                ><IcoUsers /> Submit to the community…</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── The board ── */}
      {/* P-003: name the paid edge instead of quietly stepping around it. */}
      {collapsedSystem && (
        <div className="plb-collapsed" role="status">
          <span>
            <strong>{collapsedSystem}</strong> is a Pro system — this board is
            using <strong>Auto</strong>. Nothing you saved has changed.
          </span>
          <button
            type="button"
            className="btn btn-s plb-collapsed-cta"
            onClick={() => openProModal({
              gate: 'palette-system-collapse',
              eyebrow: 'Pro colour tools',
              title: `Build with ${collapsedSystem}`,
              subtitle: 'Analogous, complementary, triadic, tetradic and custom harmonies build richer palettes than the free Auto and Monochromatic systems.',
            })}
          >
            See what Pro adds
          </button>
        </div>
      )}

      <div className="plb-board">
        {adjusted.map((c, i) => {
          // Vision type split: TOP half paints the real palette colour, BOTTOM
          // half simulates it through the selected colour-vision deficiency.
          // 'normal' leaves the swatch as a single flat colour.
          const isSplit = vision !== 'normal'
          const sim = isSplit ? simCvd(c, vision) : c
          const ink = textColorForBg(sim)
          // Deferred (see columnMeta): during a drag these lag the swatch by a
          // frame or two rather than re-solving CAM16 for every column. The
          // fallback covers the render where a colour has just been added and
          // the deferred palette is still one shorter.
          const meta = columnMeta[i]
          const contrast = meta ? meta.contrast : contrastPair(c)
          const ramp = meta ? meta.ramp : tonalRamp(c)
          const name = columnNames[i]
          // The DISPLAYED role, which varies by system. ROLES[i] stays the
          // stable slot identity that exports, tints and the UI preview key
          // off — see utils/paletteRoles.js for why those must not move.
          const role = roleLabel(harmony, i)
          const isLocked = locked.has(i)
          const colClass = [
            'plb-col',
            isLocked && 'plb-col--locked',
            isSplit && 'plb-col--split',
            animIdx?.has(i) && 'plb-col--in',
            outIdx === i && 'plb-col--out',
            overIdx === i && dragFrom.current != null && 'plb-col--over',
          ].filter(Boolean).join(' ')
          return (
            <section
              key={i}
              className={colClass}
              ref={colRef(c, ink, sim)}
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
                setCtxMenu({ kind: 'swatch', i, x: e.clientX, y: e.clientY })
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
                  title={isPro ? 'Edit in HCT' : 'Edit in HCT — Pro'}
                  aria-label={`Edit ${role} in HCT`}
                  onClick={() => openHctPicker(i)}
                >
                  <IcoSliders />
                </button>
                <button
                  type="button"
                  className={showContrast ? 'plb-tool plb-tool--on' : 'plb-tool'}
                  aria-pressed={showContrast}
                  title={isPro ? 'Show WCAG contrast for this palette' : 'Show WCAG contrast — Pro'}
                  aria-label={`Show contrast guidance for ${role}`}
                  onClick={() => {
                    if (!isPro) {
                      openProModal({ eyebrow: 'Pro colour tools', title: 'Check contrast, light and dark', subtitle: 'See WCAG contrast on every colour against both white and black text — so you know which colours carry legible text in light and dark UI.' })
                      return
                    }
                    setShowContrast(v => !v)
                  }}
                >
                  <IcoContrast />
                </button>
                {adjusted.length > 1 && (
                  <button
                    type="button"
                    className={swapIdx === i ? 'plb-tool plb-tool--on' : 'plb-tool'}
                    title="Choose a swap direction"
                    aria-label={`Choose a direction to swap ${role}`}
                    aria-haspopup="menu"
                    aria-expanded={swapIdx === i}
                    onClick={() => {
                      setTintsIdx(null); setPickerIdx(null); setCtxMenu(null)
                      setSwapIdx(current => current === i ? null : i)
                    }}
                  >
                    <IcoSwap />
                  </button>
                )}
                <button type="button" className="plb-tool" title="Copy hex" aria-label={`Copy ${adjusted[i]}`} onClick={() => onCopy?.(adjusted[i])}>
                  <IcoCopy />
                </button>
                {adjusted.length > 2 && (
                  <button type="button" className="plb-tool" title="Remove colour" aria-label={`Remove ${role}`} onClick={() => removeCol(i)}>
                    <IcoX />
                  </button>
                )}
              </div>

              {swapIdx === i && (
                <div className="plb-pop plb-swappop" role="menu" aria-label={`Swap ${role}`}>
                  {i > 0 && (
                    <button type="button" role="menuitem" className="plb-swapdir" onClick={() => swapCols(i, 'left')}>
                      <IcoArrowLeft /> Swap left
                    </button>
                  )}
                  {i < colors.length - 1 && (
                    <button type="button" role="menuitem" className="plb-swapdir" onClick={() => swapCols(i, 'right')}>
                      Swap right <IcoArrowRight />
                    </button>
                  )}
                </div>
              )}

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
              {/* The title describes the COLOUR in this slot, so it changes
                  with the colour system. The role below it describes the SLOT
                  — it is what exports, tints and the UI preview key off, so it
                  stays, demoted to an eyebrow. */}
              <div className="plb-name">{name}</div>
              {/* Canonical uppercase in the DOM, not just via text-transform.
                  The CSS already displayed it uppercase, so the lowercase
                  underneath was what a screen reader announced, what the copy
                  button put on the clipboard, and what a test read back — three
                  ways of disagreeing with the one thing the user can see. The
                  seed field beside it reports normaliseHex's canonical form, so
                  this is also what makes "the field names swatch 0" checkable
                  as a string rather than only as a colour. */}
              <button type="button" className="plb-hex" title="Copy hex" onClick={() => onCopy?.(adjusted[i].toUpperCase())}>{adjusted[i].toUpperCase()}</button>
              <div className="plb-role">{role}</div>
              {showContrast && (
                <span className="plb-badges" role="group" aria-label={`Contrast of ${adjusted[i]} — white text ${contrast.light.ratio.toFixed(1)} to 1, black text ${contrast.dark.ratio.toFixed(1)} to 1`}>
                  <span className={`plb-badge plb-badge--${contrast.light.level.toLowerCase()}`} title={`With white text — ${contrast.light.ratio.toFixed(2)}:1`}>
                    <span className="plb-badge-ink plb-badge-ink--w" aria-hidden="true" />{contrast.light.level} {contrast.light.ratio.toFixed(1)}
                  </span>
                  <span className={`plb-badge plb-badge--${contrast.dark.level.toLowerCase()}`} title={`With black text — ${contrast.dark.ratio.toFixed(2)}:1`}>
                    <span className="plb-badge-ink plb-badge-ink--b" aria-hidden="true" />{contrast.dark.level} {contrast.dark.ratio.toFixed(1)}
                  </span>
                </span>
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
                  <button
                    type="button"
                    className="btn btn-s plb-tintopen"
                    onClick={() => openInTint(adjusted[i])}
                  >
                    Open in Tint Generator
                  </button>
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

              {i < adjusted.length - 1 && (
                <button
                  type="button"
                  className="plb-gap"
                  aria-label={`Insert a colour between position ${i + 1} and ${i + 2} — right-click, or open the menu key, to insert more than one`}
                  title="Insert a colour here — right-click for more"
                  onClick={() => insertBetween(i)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTintsIdx(null); setPickerIdx(null)
                    // A real right-click carries the pointer position; a
                    // keyboard-triggered contextmenu event (Menu key /
                    // Shift+F10) typically reports (0,0) or detail 0 — anchor
                    // to the button itself instead of the viewport corner.
                    const synthetic = (e.clientX === 0 && e.clientY === 0) || e.detail === 0
                    const pos = synthetic
                      ? (() => { const r = e.currentTarget.getBoundingClientRect(); return { x: r.left, y: r.bottom } })()
                      : { x: e.clientX, y: e.clientY }
                    setCtxMenu({ kind: 'gap', i, ...pos })
                  }}
                  onKeyDown={(e) => {
                    // Explicit fallback for the Menu key / Shift+F10 in case
                    // the browser doesn't dispatch a native contextmenu event
                    // from the keyboard — keeps this reachable without a mouse.
                    if (e.key !== 'ContextMenu' && !(e.key === 'F10' && e.shiftKey)) return
                    e.preventDefault()
                    setTintsIdx(null); setPickerIdx(null)
                    const r = e.currentTarget.getBoundingClientRect()
                    setCtxMenu({ kind: 'gap', i, x: r.left, y: r.bottom })
                  }}
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
      {ctxMenu && ctxMenu.kind === 'gap' && (
        <div className="plb-pop plb-ctx" role="menu" aria-label="Insert colours" ref={ctxPosRef(ctxMenu.x, ctxMenu.y)}>
          {(() => {
            const ceiling = isPro ? HARD_MAX : PRO_MAX
            const room = ceiling - colors.length
            const hardRoom = HARD_MAX - colors.length
            const counts = [1, 2, 3, 4].filter(n => n <= hardRoom)
            if (counts.length === 0) {
              return (
                <div className="plb-ctx-item plb-ctx-item--muted" role="menuitem" aria-disabled="true">
                  Palette is full at {HARD_MAX} colours
                </div>
              )
            }
            return counts.map(n => {
              const gated = n > room
              return (
                <button
                  key={n}
                  type="button"
                  role="menuitem"
                  className="plb-ctx-item"
                  onClick={() => {
                    const at = ctxMenu.i
                    setCtxMenu(null)
                    if (gated) {
                      openProModal({ eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
                      return
                    }
                    insertBetweenMany(at, n)
                  }}
                >
                  <IcoPlus size={15} /> Insert {n} colour{n === 1 ? '' : 's'}
                  {gated && <span className="plb-ctx-pro">Pro</span>}
                </button>
              )
            })
          })()}
        </div>
      )}
      {ctxMenu && ctxMenu.kind !== 'gap' && (
        <div className="plb-pop plb-ctx" role="menu" aria-label="Colour actions" ref={ctxPosRef(ctxMenu.x, ctxMenu.y)}>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { onCopy?.(adjusted[ctxMenu.i]); setCtxMenu(null) }}><IcoCopy /> Copy hex</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { setFromSeedInput(adjusted[ctxMenu.i]); setCtxMenu(null) }}><IcoShuffle /> Use as seed</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => openHctPicker(ctxMenu.i)}><IcoSliders /> Edit in HCT</button>
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
          <div className={preview.compare ? 'plb-modal-card' : 'plb-modal-card plb-modal-card--previews'}>
            <div className="plb-modal-head">
              <span className="plb-pop-title">{preview.compare ? 'Compare palettes' : 'Preview'}</span>
              <div className="plb-modal-tabs" role="tablist" aria-label="Preview context">
                {[['ui', 'UI'], ['brand', 'Brand'], ['graphic', 'Graphic Design']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={preview.tab === id}
                    className={preview.tab === id ? 'plb-modal-tab plb-modal-tab--on' : 'plb-modal-tab'}
                    onClick={() => setPreview(p => ({ ...p, tab: id }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
            {preview.compare ? (
              <div className="plb-modal-body plb-modal-body--split">
                <PreviewScene
                  colors={adjusted}
                  mode={preview.mode}
                  tab={preview.tab}
                  title={`Current — score ${paletteScore}`}
                />
                <PreviewScene
                  colors={preview.compare.colors}
                  mode={preview.mode}
                  tab={preview.tab}
                  title={`${preview.compare.label}${preview.compare.score != null ? ` — score ${preview.compare.score}` : ''}`}
                />
              </div>
            ) : (
              <div className="plb-preview-grid" aria-label={`${preview.tab} preview scenes`}>
                {PREVIEW_SCENES[preview.tab].map((scene, index) => {
                  const gated = !isPro && index >= 3
                  return (
                    <article className={gated ? 'plb-preview-item plb-preview-item--locked' : 'plb-preview-item'} key={scene.name}>
                      <div className="plb-preview-label">
                        <strong>{scene.name}</strong>
                        {gated && <span><IcoLock open={false} size={11} /> Pro</span>}
                      </div>
                      <PreviewScene colors={adjusted} mode={preview.mode} tab={preview.tab} scene={scene} variant={index} />
                      {gated && (
                        <button
                          type="button"
                          className="plb-preview-gate"
                          onClick={() => openProModal({ eyebrow: 'Pro palette previews', title: `Preview ${scene.name.toLowerCase()}`, subtitle: 'Test your palette across the complete preview library, in both light and dark interfaces.' })}
                        >
                          <IcoLock open={false} size={13} /> Unlock preview
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
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

      {/* ── Submit-to-community popup (Wave 5 items 20–22) ──
          Only ever mounted for a signed-in user — see openSubmit above. */}
      {submitOpen && uid && (
        <div
          className="plb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Submit palette to the community"
          onPointerDown={(e) => { if (e.target === e.currentTarget) setSubmitOpen(false) }}
        >
          <div className="plb-modal-card plb-submitcard">
            <div className="plb-modal-head">
              <span className="plb-pop-title">Submit to the community</span>
              <button type="button" className="plb-pop-x" aria-label="Close" onClick={() => setSubmitOpen(false)}><IcoX /></button>
            </div>

            {/* Palette preview */}
            <div className="plb-submit-strip" aria-hidden="true">
              {adjusted.map((c, i) => (
                <span key={i} className="plb-submit-sw" style={{ background: c }} />
              ))}
            </div>

            {!handle && !ownerHandle ? (
              <>
                <div className="plb-menu-sub">Choose your community handle</div>
                <p className="plb-submit-hint">This is the name shown on everything you post. Letters, numbers and underscores — pick it once.</p>
                <div className="plb-menu-row">
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => { setHandleInput(e.target.value); setHandleErr('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveHandle() }}
                    placeholder="yourhandle"
                    aria-label="Community handle"
                    maxLength={20}
                    spellCheck="false"
                    autoComplete="off"
                  />
                  <button type="button" className="btn btn-s btn-accent" onClick={saveHandle}>Set handle</button>
                </div>
                {handleErr && <p className="plb-submit-err" role="alert">{handleErr}</p>}
              </>
            ) : (
              <>
                <div className="plb-submit-as">
                  Posting as <strong>{ownerHandle?.publicHandle || `@${handle}`}</strong>
                  {!ownerHandle && <button type="button" className="plb-linkbtn" onClick={() => { setHandle(''); setHandleErr('') }}>change</button>}
                </div>
                <div className="plb-menu-sub">Palette name</div>
                <div className="plb-menu-row">
                  <input
                    type="text"
                    value={submitName}
                    onChange={(e) => { setSubmitName(e.target.value); setSubmitErr('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitToCommunity() }}
                    placeholder="Palette name…"
                    aria-label="Palette name for the community"
                  />
                  <button
                    type="button"
                    className="btn btn-s plb-dice"
                    onClick={() => { setSubmitName(randomPaletteName(adjusted)); setSubmitErr('') }}
                    title="Generate a themed name"
                    aria-label="Generate a themed name"
                  >
                    <IcoDice />
                  </button>
                </div>
                {submitErr && <p className="plb-submit-err" role="alert">{submitErr}</p>}
                <div className="plb-modal-actions">
                  <button type="button" className="btn btn-s btn-accent" onClick={submitToCommunity}>Submit palette</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Global adjust ── */}
      <footer className="plb-adjust" aria-label="Global palette adjustments">
        {/* One grid for all four fields, with each field as display:contents, so
            the LABEL columns size to their own text while the TRACK columns are
            equal `1fr` siblings of one grid. That is what makes every track the
            same length no matter how much longer "Temperature" is than "Hue" —
            a per-field flex row cannot do it, because each row divides its own
            width. See .plb-adjust-fields in global.css. */}
        <div className="plb-adjust-fields">
          {ADJUST_FIELDS.map(f => (
            <div className={`plb-adjust-field${adjust[f.key] !== 0 ? ' plb-adjust-field--edited' : ''}`} key={f.key}>
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
                trackGradient={trackGradients?.[f.key] || null}
                handleColor={handleColors?.[f.key] || null}
                onChange={(v) => setAdjust(prev => ({ ...prev, [f.key]: v }))}
                ariaLabel={`${f.label} adjustment`}
              />
            </div>
          ))}
        </div>
        {/* Keep this slot in the row at rest. Adding it only after the first
            input event changed the grid width underneath an active pointer,
            which made the right-most Temperature thumb jump away mid-drag. */}
        <button
          type="button"
          className={`btn btn-s btn-ghost plb-adjust-reset${adjustDirty ? '' : ' plb-adjust-reset--idle'}`}
          onClick={() => setAdjust(ZERO_ADJUST)}
          disabled={!adjustDirty}
          aria-hidden={!adjustDirty}
          tabIndex={adjustDirty ? 0 : -1}
        >
          Reset
        </button>
        <button type="button" className="btn btn-s plb-copycss" onClick={() => onCopy?.(cssExport)}>Copy CSS</button>
      </footer>
    </div>
  )
}
