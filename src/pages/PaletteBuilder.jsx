import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import ColorPickerPop from '../components/ColorPickerPop'
import {
  adjustHandleColors, adjustTrackGradientsFromStops, adjustTrackStops, applyAdjust,
  autoTonalFromSeed, contrastRatio, generateHarmony, hctToHex,
  hexToHct, hexToHsl, hslToHex, mixHex, randomSystemPalette, simCvd, textColorForBg,
  tonalRamp,
} from '../utils/colors'
import { FREE_VARIATIONS, paletteVariations, scorePalette } from '../utils/paletteVariations'
// Column titles + the community-submit dice name share one vocabulary — see
// utils/paletteNames.js for why `colorName` is deterministic and
// `randomPaletteName` deliberately is not.
import { colorName, randomPaletteName } from '../utils/paletteNames'
import { roleLabel } from '../utils/paletteRoles'
import { barRef, colRef } from '../utils/paletteBoard'
import { BRAND_PALETTES } from '../data/brandPalettes'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
// The eighteen preview scenes and the components that paint them. Lifted out of
// this file on 2026-09-11 — 280 lines of pure, prop-only rendering that nothing
// else in the builder reaches into. See the note at the top of PalettePreview.jsx
// for why this block and not another, and for the equivalence evidence.
import PreviewScene from '../components/palette/PalettePreview'
import { PREVIEW_SCENES } from '../data/palettePreviewScenes'
import { LockedPaletteRow, LockedTeaseCta } from '../components/library/LockedTease'
import { splitLockedLibrary } from '../utils/lockedPreview'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useAuth } from '../contexts/AuthContext'
import { getOwnerHandle, PUBLIC_OWNER_ID } from '../utils/constants'
import UIKitGuide from '../components/UIKitGuide'
import SaveRefusal from '../components/SaveRefusal'
import { appendCommunitySubmission } from '../utils/communitySubmissions'
import { buildQueueRecord } from '../utils/communityQueue'
import { publishToQueue } from '../utils/communityQueueApi'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { boardDraftAge, consumeBoardDraft, readBoardDraft, resetGradientDraft, resetTintDraft, setGradientDraft, setTintDraft } from '../utils/colorHandoff'
// The adjust lens contract — see utils/paletteAdjust.js for why the base
// colours and the slider values are persisted separately.
import useModalDialog from '../hooks/useModalDialog'
import useExportGate from '../hooks/useExportGate'
import useMediaQuery from '../hooks/useMediaQuery'
// The measured collapse for the action rail — the rule, the measurements that
// found the band nobody had reported, and why one band is exempt.
import { railOverflowsToolbar, RIBBON_QUERY } from '../utils/toolbarFit'
import { normaliseHex, persistedPalette, readSavedPalette, ZERO_ADJUST } from '../utils/paletteAdjust'
// What a fresh board and a Reset open on, plus the ?c= > hand-off > saved >
// random precedence — kept pure so the free-settings default and “a shared link
// beats the random draw” can be tested exhaustively without a DOM.
import { colorsFromSearch, defaultPaletteBoard, DEFAULT_SYSTEM, initialPaletteBoard, isDefaultSettings } from '../utils/paletteDefaults'

// THE OPENING SENTENCE. Empty on purpose, and the empty string is the
// deliverable: the founder is writing this line himself (2026-09-13, “Build
// the slot, then I’ll write the line”). The heading area below renders the
// paragraph only when there is something in it, so the page has no blank gap
// while it is empty and needs no second edit when it is filled.
//
// The shape to match is the one its three siblings already ship, and
// `tests/user-sim/58-tool-lede-states-the-model.spec.js` pins each of them
// verbatim — one sentence naming the MODEL the tool works on, then one saying
// that everything below is that model. Not the workflow, which the controls
// already show:
//
//   /create/tint       “One base colour and one curve. Every step below is
//                       that colour at a measured tone.”
//   /create/gradient    “Colour stops and where each one sits. Everything
//                       below is those two facts, as CSS, Tailwind or SVG.”
//   /create/font-pair   “Two families — one for headings, one for body. Every
//                       preview below is those two, together.”
//
// When this is filled in, add /create/palette to that spec's LEDES table so
// the sentence is pinned the same way the other three are.
const PALETTE_LEDE = ''
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/account.css'
import '../styles/deferred/colour.css'
import '../styles/deferred/tool-shell.css'
// This page's OWN sheet, and it must stay LAST. The `plb` family's base rules
// live in global.css and in the shared deferred/colour.css, neither of which
// this route may edit. Importing last means this sheet loads after both and
// wins at equal specificity — which is also what lets it re-point the
// `--accent-strong` and `--brand` aliases for the whole page in one place.
import '../styles/pages/palette-builder.css'

// Palette Builder — the standalone /create/palette workbench. A full-bleed
// board so the columns are the page, not a panel floating in chrome: a
// toolbar (seed + harmony + brands/variations/preview + vision + randomise +
// save/share), full-height colour columns with per-column tools (drag-reorder,
// HCT edit, tints, right-click menu), and a bottom global-adjust bar. Runs on
// the exact same colour engine as the merged Colour Studio (utils/colors.js),
// so palettes built here match the studio's output.

// The action rail's exploratory cluster, in one of its two forms.
//
// ON THE ROW it renders its children and NOTHING ELSE — no wrapper, not even a
// `display:contents` one. That is the point: the five controls stay direct
// children of the rail, so every `>` selector aimed at the rail keeps matching
// and the row is laid out to the pixel as it was before this existed. See the
// markup note in utils/toolbarFit.js for what happened when a wrapper was
// there — a band this change does not touch moved by 54px.
//
// COLLAPSED it is a panel behind one labelled trigger. Each control keeps its
// own `.plb-menuwrap` and its own popover, so nothing about how any of them
// works changes; only where they live does.
function ToolCluster({ collapsed, open, children }) {
  if (!collapsed) return children
  return (
    <div
      className="plb-tools plb-tools--panel"
      id="plb-tools-panel"
      role="menu"
      aria-label="More palette tools"
      hidden={!open}
    >
      {children}
    </div>
  )
}

const DEFAULT_SEED = '#4338E0'
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

// `vs-palette-session-seed` used to pin the first random seed to sessionStorage
// so a reload came back to the same board. MEASURED before removing it: it is
// read exactly once, on the first visit a device ever makes. The mount effect
// below writes the drawn board straight into ProjectContext, so from the second
// visit onward `readSavedPalette` wins the precedence and the seed is never
// consulted again — in a fresh tab, with sessionStorage empty, the key was not
// even written. Everything it was there to protect is protected better by the
// saved project, which survives a real restart and carries the whole board
// rather than one hex. So the guarantee it made is kept; the key is retired.

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
    harmony: snapshot.harmony || DEFAULT_SYSTEM,
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

// Shared palettes arrive as /create/palette?c=4338E0,7C6CF0,… — parse or null.
// The parsing itself lives in utils/paletteDefaults so the rule that a shared
// link outranks the random draw is enumerable in a unit test; this wrapper only
// owns where the search string comes from.
function colorsFromQuery() {
  try {
    return colorsFromSearch(window.location.search, HARD_MAX)
  } catch {
    return null
  }
}

const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

// Browser canvases have a maximum dimension (4096 is the smallest limit still
// in the wild). The source canvas below is capped there rather than at the
// histogram's 320: everything the LOUPE shows and everything a marker reports
// is read from it, so it has to hold real pixels, not an approximation of them.
const IMG_SOURCE_MAX = 4096

// "From image" — two canvases, deliberately.
//
//   `data`   a 320px ImageData. Cheap enough to histogram in a loop for the
//            automatic extraction, and that is all it is for.
//   `source` the image at (near) its own resolution. EVERY value a marker
//            reports and every pixel the loupe draws comes from here.
//
// They used to be one, and the 320px one was doing both jobs. That was
// invisible while a marker was a 26px dot over a 400px preview — the dot
// covered dozens of pixels, so nobody could tell which one it claimed. The
// moment a loupe magnifies the sample it becomes very visible: at 320px a
// 4000px-wide photo is sampled one pixel in twelve, so the loupe would draw a
// smooth region of the photo and the readout would name a colour from a
// different pixel. The founder asked to see "exactly what pixel im selecting",
// and a loupe fed by a thumbnail cannot answer that question honestly.
function loadImageData(file, maxSize = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const draw = (w, h) => {
          const c = document.createElement('canvas')
          c.width = w; c.height = h
          // Read frequently: the drag handler takes a 1x1 sample per pointermove.
          c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, w, h)
          return c
        }
        const fit = (cap) => {
          const scale = Math.min(1, cap / Math.max(img.width, img.height))
          return [Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale))]
        }
        const [sw, sh] = fit(maxSize)
        const small = draw(sw, sh)
        const [fw, fh] = fit(IMG_SOURCE_MAX)
        // Reuse the small canvas when the image is already tiny — drawing the
        // same pixels twice buys nothing.
        const source = (fw === sw && fh === sh) ? small : draw(fw, fh)
        // The natural dimensions, not the capped canvas's: the preview stage
        // is sized from this ratio, and rounding 4000x2999 down to 320x240
        // would tilt every picker point by a fraction of the image.
        resolve({
          data: small.getContext('2d').getImageData(0, 0, sw, sh),
          source,
          url,
          aspect: img.naturalWidth / img.naturalHeight,
        })
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

// Which SOURCE pixel does a normalised (0–1) point land on? One function, used
// by the sampler and by the loupe, so the value under the crosshair and the
// value on the swatch can never come from two different roundings.
function sourcePixel(canvas, nx, ny) {
  const px = Math.min(canvas.width - 1, Math.max(0, Math.floor(nx * canvas.width)))
  const py = Math.min(canvas.height - 1, Math.max(0, Math.floor(ny * canvas.height)))
  return { px, py }
}

// Colour of the pixel under a normalised (0–1) point, read at SOURCE
// resolution — used while dragging or nudging a picker point, and by the loupe
// for the value it prints under the crosshair.
function sampleSourcePixel(canvas, nx, ny) {
  if (!canvas) return null
  const { px, py } = sourcePixel(canvas, nx, ny)
  try {
    const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(px, py, 1, 1).data
    return rgbToHex(d[0], d[1], d[2])
  } catch { return null }
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

// `colRef` / `barRef` moved to utils/paletteBoard.js — the homepage workbench's
// Palette mode now renders a real `.plb-board` with these same classes, and two
// private copies of the property contract is how two boards drift apart.
// Right-click menu position (clamped to the viewport) through custom props.
function ctxPosRef(x, y) {
  return (el) => {
    if (!el) return
    el.style.setProperty('--plb-mx', `${Math.min(x, window.innerWidth - 220)}px`)
    el.style.setProperty('--plb-my', `${Math.min(y, window.innerHeight - 330)}px`)
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
const IcoMore = () => (
  <Ico><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></Ico>
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

// Community submission surface name for the sign-in gate (utils/submitIntent).
const SUBMIT_SURFACE = 'palette'

// `onExport` is this tool's ONE declared export hook. This file has EIGHT copy
// affordances; only the CSS-variables export represents the whole palette, so
// only that one routes through the hook. Copying a single hex, a tint row or a
// share link stays on `onCopy` and is not an activation — see
// src/config/activationExports.js for why that decision lives in CreateTool.
export default function PaletteBuilder({ onCopy, onExport = onCopy, toast }) {
  const { design, setPalette, saveProject, overwriteProject, projects, canSaveProjects } = useProject()
  const { isPro } = useSubscription()
  const { openProModal } = useProModal()
  // The brands panel, split before it is rendered rather than styled after it.
  // A locked brand's colours are not in `openBrands`, so they never reach
  // barRef and never enter the DOM — see utils/lockedPreview.js. Fails closed
  // while the entitlement is still resolving, because `unlocked` is only ever
  // satisfied by an exact `true`.
  const { open: openBrands, locked: lockedBrands, remaining: lockedBrandCount } = useMemo(() => (
    splitLockedLibrary(BRAND_PALETTES, {
      unlocked: isPro === true,
      isOpen: (brand) => brand.free === true,
      preview: (brand) => ({ id: brand.id, label: brand.name, slots: brand.colors.length }),
    })
  ), [isPro])
  const { requireLogin } = useLoginPrompt()
  // Producing a FILE needs a free account; copying never does.
  const requireExportAccount = useExportGate()
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
  // The precedence itself is in utils/paletteDefaults: ?c= beats a hand-off,
  // which beats the saved project, which beats a random draw. Nothing here may
  // draw over the first three — a link someone sent a colleague, a Continue
  // pressed seconds ago, and a board on this device are all real work.
  // `source` is what the persist effect below reads to tell an untouched draw
  // apart from a palette a person actually chose.
  const [initial] = useState(() => initialPaletteBoard({ queryColors, handoff, saved }))
  // Age of the hand-off that won, captured during the same render that read it
  // — after the mount effect consumes the slot there is nothing left to ask.
  const [handoffAge] = useState(boardDraftAge)
  useEffect(() => {
    consumeBoardDraft()
    // One line, once per mount, saying WHY this board looks the way it does.
    // The founder's report is intermittent and state-shaped, so the thing worth
    // shipping is not a guess about which branch misfired but a record that
    // names it the next time it happens. `handoff` in particular should only
    // ever be minutes-fresh; an age near the ttl in a report is the smoking gun
    // for a stager that leaked. Colours are deliberately NOT logged — the count
    // is what the report was about, and a console is not a place to put a
    // user's work.
    try {
      console.info('[palette] board source=%s cols=%d handoffAge=%s', initial.source, initial.colors.length, handoffAge ?? '—')
    } catch { /* a console that throws is not a reason to fail a mount */ }
  // Mount-only by design. `initial` and `handoffAge` are frozen first-render
  // reads held in useState, so naming them here would fire exactly once anyway
  // and would only imply this effect re-runs on values it cannot see change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    return HARMONIES.some(h => h.id === design?.palette?.harmony) ? design.palette.harmony : DEFAULT_SYSTEM
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
  const [saveError, setSaveError] = useState('')   // the cap's refusal, held under the field — see doSave
  const [harmOpen, setHarmOpen] = useState(false)
  const [visionOpen, setVisionOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)  // the collapsed Tools panel

  // Image picker (Wave 4): a free, no-login dropdown. Once an image is loaded
  // it stays nested in the menu with draggable picker points sampling its
  // pixels live, plus a +/− count and a reset/auto re-extract.
  const [imgOpen, setImgOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState('')      // object URL for the preview
  const [imgPoints, setImgPoints] = useState([]) // [{ x, y, hex }] normalised
  const [imgError, setImgError] = useState('')
  const [imgDragOver, setImgDragOver] = useState(false)
  // The uploaded image's own width/height ratio. The stage is sized to it so a
  // point's normalised (x, y) in the SOURCE lands on the same spot of the
  // DISPLAYED image — see the CSS note on .plb-imgstage.
  const [imgAspect, setImgAspect] = useState(16 / 10)
  const imgDataRef = useRef(null)               // 320px ImageData — histogram only
  const imgSourceRef = useRef(null)             // full-resolution canvas — every sample and the loupe
  const imgDragIdx = useRef(null)               // point index being dragged
  const imgStageRef = useRef(null)              // the preview stage element
  const imgLoupeRef = useRef(null)              // the loupe <canvas>
  // Which marker the loupe is following. Set by a drag, a click, a focus or an
  // arrow-key nudge, so the mouse and the keyboard drive one thing rather than
  // two. Null means no marker is being worked on and the loupe stays away.
  const [imgActive, setImgActive] = useState(null)
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
  // UI SYSTEM MODE IS GONE FROM THIS PAGE. Founder instruction, 2026-09-05:
  // “lets remove the build UI system from the colour pallete also, lets make the
  // one in the navigation the create Brand system should start a guided
  // walkthrough to build a full system”. Both halves are one decision — the
  // palette tool stops being a side door into system-building, and the nav
  // becomes the single front door (see components/UIKitGuide.jsx).
  //
  // BOTH entry points went, not one: the “UI System / Admin” breadcrumb beside
  // the title AND the “Build UI system” toolbar button. They were already
  // admin-only, so no visitor loses a control they could see.
  //
  // WHAT WAS CARRIED THROUGH IT, AND WHY IT IS DROPPED DELIBERATELY RATHER THAN
  // SILENTLY: `applyUiBrandScale` transferred the generated nine-shade Brand
  // scale back onto this board (Pro-gated, seed and swatches replaced). Nothing
  // else ever called it, and the mode was the only producer of a scale to
  // apply, so with the doors closed the hand-off has no source — it is removed
  // with them rather than left as an unreachable branch. components/
  // UiSystemBuilder.jsx and its children stay on disk, unimported and unbuilt,
  // with tests/user-sim/12-ui-system-builder.spec.js still describing the
  // contract; re-entering the tool means giving it its own route, not putting
  // this button back.
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
  //
  // An UNTOUCHED RANDOM DRAW IS NOT SAVED WORK. Skipping the mount write for it
  // is what makes the founder's "auto load a random palette" true on every
  // visit rather than only the first: this effect used to persist the drawn
  // board immediately, which turned a throwaway default into a saved palette
  // the user never made, and from then on the saved branch of the precedence
  // won and the page showed that one palette forever. Measured before the fix:
  // visit, reload and a fresh tab all returned the same five hexes. Only the
  // FIRST run is skipped, and only for `source === 'random'` — the moment the
  // user changes anything the effect re-runs and persists as it always did, and
  // a ?c= link, a hand-off or a saved project still persist on mount.
  const pristineRef = useRef(initial.source === 'random')
  useEffect(() => {
    if (pristineRef.current) { pristineRef.current = false; return }
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
      // A free system, not Analogous. The solver throwing is not a reason to
      // hand a free user output from the paid harmony engine.
      gen = generateHarmony(fromSeed, 'monochromatic')
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
      openProModal({ gate: 'palette-harmony-system', eyebrow: 'Pro colour tools', title: 'Unlock every colour system', subtitle: 'Analogous, complementary, triadic, tetradic and custom harmonies build richer palettes than the free Auto and Monochromatic systems.' })
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

  // imgOpen is deliberately NOT here. The image picker is a centred modal now,
  // and this layer closes anything whose pointerdown misses a .plb-menuwrap —
  // which is every press inside the modal, including dragging a picker point.
  // useModalDialog owns its Escape and the scrim owns its outside press.
  const anyPopover = saveOpen || harmOpen || visionOpen
    || galleryOpen || histOpen
    || tintsIdx != null || pickerIdx != null || swapIdx != null || ctxMenu != null || preview != null

  // Both of this page's dialogs declared aria-modal="true" and trapped nothing:
  // Tab walked out into the builder behind them, the canvas scrolled, and
  // closing dropped focus to the top of the document. The setState setters are
  // stable, so these close handlers are stable too and the effect does not
  // re-run on every render of a very large component.
  const closePreview = useCallback(() => setPreview(null), [])
  const closeSubmit = useCallback(() => setSubmitOpen(false), [])
  const closeImageDialog = useCallback(() => setImgOpen(false), [])
  const imageDialogRef = useModalDialog(closeImageDialog, { enabled: imgOpen })
  const previewDialogRef = useModalDialog(closePreview, { enabled: preview != null })
  const submitDialogRef = useModalDialog(closeSubmit, { enabled: Boolean(submitOpen && uid) })

  // Spacebar = randomise only from the idle Palette canvas. Buttons, links and
  // popovers own Space for activation or copy.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.defaultPrevented || e.repeat || anyPopover) return
      if (document.querySelector('[aria-modal="true"]')) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input,textarea,select,button,a,summary,[contenteditable="true"],[role="button"],[role="menuitem"],[role="option"],[role="tab"],[role="gridcell"]')) return
      e.preventDefault()
      randomize()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [randomize, anyPopover])

  // One dismiss layer for every popover: outside pointerdown or Escape closes
  // toolbar menus (anything not inside a .plb-menuwrap) and board popovers
  // (anything not inside a .plb-pop). Escape also closes the preview modal.
  // Close every toolbar menu in one call — used by the dismiss layer and by each
  // toolbar button (so opening one always closes the rest). Setters are stable.
  const closeAllMenus = useCallback(() => {
    setSaveOpen(false); setSaveError(''); setHarmOpen(false); setVisionOpen(false); setImgOpen(false); setGalleryOpen(false); setHistOpen(false); setToolsOpen(false)
  }, [])

  /* ── Does the action rail fit? (palette-toolbar-rendering) ────────────────
   *
   * The rule and the whole argument for it live in utils/toolbarFit.js. This
   * is only the measuring half, and it follows LibraryFilterGroup's contract
   * exactly, because that contract is what keeps a measure-then-change-layout
   * loop from oscillating:
   *
   *   · the intrinsic width is taken ONCE per band, while the cluster is
   *     still on the row, and cached. It is never re-read while collapsed,
   *     where the cluster is a vertical menu and would measure as one.
   *   · the budget comes from the toolbar's width and a CONSTANT ceiling, so
   *     nothing on that side of the comparison moves when the cluster
   *     collapses.
   *
   * The band is part of the cache key: below 961px the rail's buttons carry
   * visible labels and the same five controls measure 964px instead of 712px,
   * so one cached number would be wrong on one side of that line.
   */
  const railRef = useRef(null)
  const intrinsicRef = useRef({ band: null, width: 0 })
  const ribbonBand = useMediaQuery(RIBBON_QUERY)
  const [railOverflows, setRailOverflows] = useState(false)
  const toolsCollapsed = railOverflows && !ribbonBand

  // Closing the panel when the band changes is adjust-state-during-render (the
  // documented React pattern), not an effect: a resize that un-collapses the
  // cluster while its panel is open would otherwise leave a menu mounted with
  // no trigger to hand focus back to.
  const [wasCollapsed, setWasCollapsed] = useState(toolsCollapsed)
  if (wasCollapsed !== toolsCollapsed) {
    setWasCollapsed(toolsCollapsed)
    setToolsOpen(false)
  }

  const fitRail = useCallback(() => {
    const rail = railRef.current
    const row = rail?.closest('.plb-toolbar')
    if (!rail || !row) return
    const band = window.matchMedia('(min-width:961px)').matches ? 'wide' : 'narrow'
    let intrinsic = intrinsicRef.current.width
    if (intrinsicRef.current.band !== band) {
      // Only measurable while the cluster is on the row. `scrollWidth` is the
      // rail's own content width — it is a scroll container below 961px, so
      // this is the one number that reports the full line rather than the
      // visible slice of it.
      // The intrinsic width can only be read while the cluster is ON THE ROW.
      // Returning here — the obvious guard — is a trap: it leaves the previous
      // answer standing AND leaves the cache empty, so once collapsed the rail
      // could never re-measure and never expand again. Measured: after the
      // font-swap invalidation below, the toolbar froze collapsed at every
      // width up to 1920.
      //
      // So say "I cannot answer yet" by expanding, and answer on the next pass
      // with a row that can be measured. This cannot loop: it runs only when
      // the BAND has changed, and the pass that follows caches a number, after
      // which the branch is not taken again until the band changes once more.
      if (toolsCollapsed) { setRailOverflows(false); return }
      intrinsic = rail.scrollWidth
      if (!intrinsic) return
      intrinsicRef.current = { band, width: intrinsic }
    }
    // THE ROW'S CONTENT BOX, NOT ITS `clientWidth`. `.plb-toolbar` carries
    // `padding:10px var(--page-inline)` (20px a side at these widths) and
    // `clientWidth` includes it, so passing `clientWidth` credited the flex
    // line with 40px it does not have. Measured consequence on `main`: the
    // cluster expanded at 1097px and did not fit until 1137px, so every width
    // in 1097–1136 wrapped the toolbar to two rows at 105px instead of one at
    // 57px. See the note above `railOverflowsToolbar` for the full table.
    const cs = getComputedStyle(row)
    const rowWidth = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    setRailOverflows(railOverflowsToolbar({ intrinsic, rowWidth }))
  }, [toolsCollapsed])

  // No separate mount call: ResizeObserver fires once when observation begins,
  // which is both the first measurement and the only place this state is set.
  // Setting it from an effect body instead would be the cascading-render shape
  // `react-hooks/set-state-in-effect` exists to catch.
  useEffect(() => {
    const row = railRef.current?.closest('.plb-toolbar')
    if (!row || typeof ResizeObserver === 'undefined') return undefined
    const obs = new ResizeObserver(fitRail)
    obs.observe(row)
    return () => obs.disconnect()
  }, [fitRail])

  // THE FONT-SWAP INVALIDATION IS ITS OWN EFFECT, AND RUNS ONCE.
  //
  // It began life inside the observer effect above, which was wrong in a way
  // that only a rendered browser shows. That effect re-runs whenever the
  // collapse flips, `document.fonts.ready` is an ALREADY-RESOLVED promise by
  // then, and so every flip re-registered a callback that fired immediately,
  // invalidated the cache and expanded the row — which measured, collapsed,
  // flipped, and started again. Measured: 981, 1000, 1080 and 662 never
  // settled, and 981 sat in the broken 105px two-row form half the time.
  //
  // A font swap happens once. So does this.
  const fontsSettled = useRef(false)
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (cancelled || fontsSettled.current) return
      fontsSettled.current = true
      // Every control width has changed, so the cached number is stale.
      // Expanding alongside the invalidation is what makes the re-measure
      // possible at all — see the guard in fitRail.
      intrinsicRef.current = { band: null, width: 0 }
      setRailOverflows(false)
    }).catch(() => {})
    return () => { cancelled = true }
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
      openProModal({ gate: 'palette-colour-cap', eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
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
      openProModal({ gate: 'palette-colour-cap', eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
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
      openProModal({ gate: 'palette-hct-picker', eyebrow: 'Pro colour tools', title: 'Fine-tune any colour in HCT', subtitle: 'Edit hue, chroma and tone on each colour individually with the HCT picker — perceptual control the free tier keeps read-only.' })
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
      const { data, source, url, aspect } = await loadImageData(file)
      imgDataRef.current = data
      imgSourceRef.current = source
      setImgAspect(Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 10)
      setImgSrc(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      setImgActive(null)
      setImgPoints(trueToSource(dominantSwatches(data, Math.min(colors.length, PRO_MAX))))
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

  // ONE INVARIANT, and the loupe exists to make it checkable: the colour a
  // marker reports is the colour of the SOURCE pixel it is standing on.
  //
  // `dominantSwatches` cannot honour it on its own. Its hex is a bucket AVERAGE
  // and its position is that bucket's centroid, so the two describe a region
  // rather than a point — a ring of one colour puts its centroid in the middle,
  // where the photo is some other colour entirely. That was invisible under a
  // 26px dot and is the first thing a magnifier would expose: crosshair on one
  // colour, swatch showing another, and no way for the user to tell which of
  // the two is lying. The extraction still CHOOSES the points; this only makes
  // each one tell the truth about where it ended up.
  const trueToSource = useCallback((points) => {
    const src = imgSourceRef.current
    if (!src) return points
    return points.map(p => ({ ...p, hex: sampleSourcePixel(src, p.x, p.y) || p.hex }))
  }, [])

  // Re-run automatic extraction over the current image (reset / auto).
  const autoExtractImage = () => {
    if (!imgDataRef.current) return
    setImgActive(null)
    setImgPoints(trueToSource(dominantSwatches(imgDataRef.current, Math.min(imgPoints.length || colors.length, PRO_MAX))))
  }

  const clearImage = () => {
    setImgSrc(prev => { if (prev) URL.revokeObjectURL(prev); return '' })
    imgDataRef.current = null
    imgSourceRef.current = null
    setImgPoints([]); setImgError(''); setImgAspect(16 / 10); setImgActive(null)
  }

  const addImagePoint = () => {
    if (!imgSourceRef.current || imgPoints.length >= PRO_MAX) return
    const hex = sampleSourcePixel(imgSourceRef.current, 0.5, 0.5) || '#808080'
    setImgPoints(prev => {
      setImgActive(prev.length)
      return [...prev, { x: 0.5, y: 0.5, hex }]
    })
  }
  const removeImagePoint = () => {
    setImgPoints(prev => (prev.length > 2 ? prev.slice(0, -1) : prev))
    setImgActive(null)
  }

  // Put marker `idx` at a normalised position and re-sample it at source
  // resolution. The single write path — drag, keyboard nudge and the +
  // button all come through here, so they cannot drift apart.
  const placeImagePoint = useCallback((idx, x, y) => {
    const src = imgSourceRef.current
    if (idx == null || !src) return
    const cx = Math.min(1, Math.max(0, x))
    const cy = Math.min(1, Math.max(0, y))
    const hex = sampleSourcePixel(src, cx, cy)
    setImgPoints(prev => prev.map((p, i) => (i === idx ? { x: cx, y: cy, hex: hex || p.hex } : p)))
  }, [])

  // Drag a picker point across the image; re-sample the pixel under it live.
  const moveImagePoint = useCallback((clientX, clientY) => {
    const idx = imgDragIdx.current
    const stage = imgStageRef.current
    if (idx == null || !stage) return
    const r = stage.getBoundingClientRect()
    placeImagePoint(idx, (clientX - r.left) / r.width, (clientY - r.top) / r.height)
  }, [placeImagePoint])

  // Keyboard parity. The markers were <button>s with a pointerdown handler and
  // nothing else, so a keyboard user could focus one and then had no way to
  // move it at all — the tool's only sampling gesture was mouse-only. Arrows
  // step ONE SOURCE PIXEL, which is the unit the loupe is showing; Shift steps
  // ten, so crossing a large photo does not take four thousand presses.
  const nudgeImagePoint = (idx, dxPx, dyPx) => {
    const src = imgSourceRef.current
    const p = imgPoints[idx]
    if (!src || !p) return
    setImgActive(idx)
    placeImagePoint(idx, p.x + dxPx / src.width, p.y + dyPx / src.height)
  }

  const onImagePointKey = (e, i) => {
    const step = e.shiftKey ? 10 : 1
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    nudgeImagePoint(i, move[0], move[1])
  }

  useEffect(() => {
    if (!imgSrc) return
    const onMove = (e) => { if (imgDragIdx.current != null) { e.preventDefault(); moveImagePoint(e.clientX, e.clientY) } }
    const onUp = () => { imgDragIdx.current = null }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [imgSrc, moveImagePoint])

  // ── The loupe ────────────────────────────────────────────────────────────
  //
  // Founder: "show me a large zoomed in view so i can [see] exactly what pixel
  // im selecting". Five markers over a ~400px preview of a 4000px photo means
  // one marker covers roughly a hundred source pixels, so "which one am I on"
  // was genuinely unanswerable.
  //
  // References (Mobbin): Alan's crop screen parks its magnifier in a FIXED
  // CORNER with a crosshair at the centre rather than floating it under the
  // finger — a loupe that follows the pointer covers the thing it is
  // magnifying, which is the failure mode a first attempt always ships.
  // Shopee's ring loupe is the reason for a thick neutral rim: it has to read
  // over any photograph, light or dark. beehiiv's web colour picker is why the
  // hex sits ON the loupe rather than across the panel — the value and the
  // pixel are one piece of information and get read together.
  //
  // The corner is chosen per-frame, opposite the marker, so the loupe never
  // sits on top of the region being sampled.
  const LOUPE_PX = 13          // source pixels across the loupe (odd: one true centre)
  const drawLoupe = useCallback(() => {
    const cv = imgLoupeRef.current
    const src = imgSourceRef.current
    const p = imgActive != null ? imgPoints[imgActive] : null
    if (!cv || !src || !p) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const size = cv.width                       // backing store is square
    const cell = size / LOUPE_PX
    const { px, py } = sourcePixel(src, p.x, p.y)
    const half = (LOUPE_PX - 1) / 2
    ctx.clearRect(0, 0, size, size)
    // Nearest-neighbour: a smoothed loupe is a picture of an interpolation,
    // not of the pixels, and the whole point is to show the pixels.
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(src, px - half, py - half, LOUPE_PX, LOUPE_PX, 0, 0, size, size)
    // The sampled pixel, outlined in both inks so it survives any photo under
    // it — a single white box vanishes on a white pixel, which is exactly the
    // pixel a user is most likely to be hunting for.
    const x0 = half * cell
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,0,0,.75)'
    ctx.strokeRect(x0 - 1.5, x0 - 1.5, cell + 3, cell + 3)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#fff'
    ctx.strokeRect(x0 - 1, x0 - 1, cell + 2, cell + 2)
  }, [imgActive, imgPoints])

  useEffect(() => { drawLoupe() }, [drawLoupe])
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
    // Founder request, 2026-09-03: "reset should reset the settings to default
    // but randomise the colour." So the settings go back to DEFAULT_SYSTEM with
    // the lens at zero, and the COLOURS are a fresh draw from the same engine
    // the Randomise button uses — not a return to the fixed #4338E0 board, and
    // not the paid analogous system this used to rebuild under a free label.
    // The pre-reset board is pushed into vs-palette-history just below and
    // `undoPalette` still restores it, so re-randomising costs nothing.
    const fresh = defaultPaletteBoard()
    const defaults = fresh.colors
    const baseline = {
      colors: defaults,
      seed: fresh.seed,
      seedInput: fresh.seed,
      harmony: DEFAULT_SYSTEM,
      locked: [],
      adjust: ZERO_ADJUST,
      vision: 'normal',
      showContrast: false,
      importedGalleryId: null,
    }
    // Settings, not colours. Two resets never produce the same board now, so
    // comparing whole boards could never be true again and the double-click
    // guard below would have been silently dead. See isDefaultSettings.
    const defaultPalette = isDefaultSettings(current)
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
    setSeed(fresh.seed)
    setSeedInput(fresh.seed)
    setHarmony(DEFAULT_SYSTEM)
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
    setLiveMsg('Settings reset to the default system, with a new random palette')
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
      setHarmony(target.harmony || DEFAULT_SYSTEM)
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
    setHarmony(entry.harmony || DEFAULT_SYSTEM)
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
      openProModal({ gate: 'palette-variation-apply', eyebrow: 'Pro colour tools', title: 'Every variation, unlocked', subtitle: 'Free covers the first set of generated variations; Pro unlocks the full range of alternates for any palette.' })
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
      openProModal({ gate: 'palette-variation-compare', eyebrow: 'Pro colour tools', title: 'Compare every variation', subtitle: 'Line palettes up side by side to compare them. Free covers the first set of variations; Pro unlocks the full range.' })
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
      openProModal({ gate: 'palette-brand-system', eyebrow: 'Pro colour tools', title: 'Load any brand system', subtitle: 'Free covers a handful of starter brands; Pro unlocks the full set — each one applies the brand’s whole colour system, not just its swatches.' })
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

  // The single export path. Both "Copy CSS variables" (save menu) and the
  // footer's "Copy CSS" are the SAME export reached two ways, so they share one
  // function rather than each calling the hook — one call site per tool is the
  // whole point of the shape, and two would be two places to forget.
  const copyCssExport = () => onExport?.(cssExport)

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
      navigate('/create/gradient')
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
      navigate('/create/tint')
    } catch {
      resetTintDraft()
      toast?.('Couldn’t open the Tint Generator — try again')
    }
  }

  // Short share URL — /p/:code hits /api/share (vercel.json rewrite), which
  // serves social-preview OG meta + a palette-card image, then redirects
  // humans on to /create/palette?c=... where the ?c= parser picks it up.
  const shareLink = () => `${window.location.origin}/p/${adjusted.map(c => c.slice(1)).join(',')}`

  // Social-card PNG (1200×630) of the palette — the shareable mini version,
  // rendered client-side so it needs no serverless function.
  const downloadPng = async () => {
    try {
      /* THE EXPORT IS DRAWN IN THE PRODUCT'S TYPEFACE, READ FROM THE TOKEN.
       *
       * These two `g.font` lines said `Outfit`, and Outfit has had no
       * @font-face since the Geist foundation landed — so every palette card
       * anyone exported was silently drawn in system-ui. Nothing on screen
       * showed it: the canvas just resolves the next family in the list. A
       * paid export in the wrong face is the kind of defect that only ever
       * gets noticed by the customer.
       *
       * Read from `--font` rather than naming Geist, so the next foundation
       * change carries here without anyone remembering this file exists. */
      const uiFont = getComputedStyle(document.documentElement)
        .getPropertyValue('--font').trim() || 'system-ui, sans-serif'
      const swatchFont = `600 26px ${uiFont}`
      const markFont = `700 22px ${uiFont}`
      /* AND THE FACE HAS TO BE LOADED BEFORE ANYTHING IS DRAWN. Canvas does
       * not wait for a webfont the way layout does — it paints whatever is
       * resolved at that instant and there is no second chance once toBlob
       * has run. `document.fonts.load` is the wait; if it rejects we draw
       * anyway rather than refuse the export. */
      try {
        await Promise.all([document.fonts.load(swatchFont), document.fonts.load(markFont)])
      } catch { /* fall back to whatever the family list resolves to */ }

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
        g.font = swatchFont
        g.textAlign = 'center'
        g.fillText(c, i * cw + cw / 2, h - 42)
      })
      // Free exports carry a small brand watermark; Pro exports stay clean.
      if (!isPro) {
        const label = 'Made with UIL4B'
        g.font = markFont
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
      canvas.toBlob(async (blob) => {
        if (!blob) { toast?.('Couldn’t render the image'); return }
        // The PNG is a file, so it needs a free account. The board itself,
        // every hex on it and Copy CSS all stay free — see useExportGate.js.
        if (!(await requireExportAccount('download this palette as an image'))) return
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
  //
  // LOCAL FIRST, THEN THE ACCOUNT. Until this reached the queue a palette was
  // written to `vs-community-submissions` and NOWHERE ELSE — the same bug
  // already fixed for gradients. A palette submitted on a phone was invisible
  // on a laptop, and no reviewer ever saw it, so "submitted" named a review
  // that could not happen. The local write stays first: submitting works
  // offline and the list updates without waiting on a round trip. The queue
  // write is what makes it follow the ACCOUNT and reach a reviewer.
  const submitToCommunity = async () => {
    const name = submitName.trim()
    if (!name) { setSubmitErr('Give the palette a name first.'); return }
    const publicHandle = ownerHandle?.publicHandle || (handle ? '@' + handle : '')
    if (!publicHandle) { setSubmitErr('Set your community handle first.'); return }
    // Defence in depth: the form is only mounted after the sign-in gate, but a
    // sign-out mid-flow must not slip a submission through.
    if (!uid) { setSubmitOpen(false); return }
    const localId = 'u' + Date.now()
    const url = shareLink()
    try {
      appendCommunitySubmission({
        id: localId,
        name,
        author: publicHandle,
        ownerId: ownerHandle ? PUBLIC_OWNER_ID : undefined,
        category: 'Branding',
        url,
        c1: adjusted[0],
        c2: adjusted[1] || adjusted[0],
        colors: adjusted,
        saves: 0,
        mine: true,
      })
      setSubmitName('')
      setSubmitOpen(false)
    } catch {
      setSubmitErr('Couldn’t submit right now.')
      return
    }

    const queued = buildQueueRecord({
      kind: 'palette',
      name,
      user,
      payload: { colors: adjusted, category: 'Branding', url, author: publicHandle },
    })
    if (!queued) {
      // No signed-in user — the local copy stands, and the message says so
      // rather than claiming it reached a reviewer.
      toast?.('Saved to this browser. Sign in to submit it for review.')
      return
    }
    try {
      await publishToQueue({ ...queued, localId })
      toast?.('Submitted to the community — thanks!')
    } catch {
      // Never claim it reached the queue when it did not. The local copy is
      // kept, so nothing the user made is lost.
      toast?.('Saved locally — we could not reach the review queue. Try again later.')
    }
  }

  // THE GATE MOVED OFF THE MENU AND ONTO THE SAVE, because the menu also holds
  // three COPY items.
  //
  // "Save / export" used to ask for an account before it would OPEN, and behind
  // it sat Copy link to this palette, Copy CSS variables and Copy hex values.
  // So on this one surface copying was gated — which is the opposite of the rule
  // the founder set on 2026-09-15: producing a FILE needs a free account,
  // copying a value never does. The board's own per-swatch Copy and the
  // toolbar's Copy CSS were free the whole time, so the product disagreed with
  // itself inside a single page.
  //
  // Now the menu opens for anybody, the three Copy rows work signed out, and the
  // account is asked for at the two things that actually keep or produce
  // something: this save, and the PNG download (gated separately through
  // useExportGate). `signup: true` matches the export gate — somebody who
  // reaches this has no account, so "Log in to continue" is the wrong greeting.
  const doSave = async () => {
    // THE ACCOUNT IS ASKED FOR BEFORE THE NAME, and the order matters.
    //
    // The name check below is a silent `return` — the Save button is never
    // disabled, so pressing it empty does nothing and says nothing. That was
    // unreachable while the gate sat on the menu opener, because a signed-out
    // visitor never got as far as the button. Moving the gate down here without
    // moving it ABOVE the name check would have handed them that dead click
    // instead of the gate, which is a worse first answer than being asked to
    // sign up.
    //
    // Asked first, the flow reads the way it did before: press Save, get asked
    // for an account. (The empty-name silence is a separate, older defect and is
    // left alone here rather than fixed in passing.)
    if (!canSaveProjects) {
      const user = await requireLogin('save this palette', { free: true, signup: true })
      if (!user) return
    }
    const name = saveName.trim()
    if (!name) return
    try {
      saveProject(name)
      setSaveName(''); setSaveError(''); setSaveOpen(false)
      toast?.('Project saved')
    } catch (err) {
      // The cap's refusal went out as the SUCCESS toast — green tick, 1.8
      // seconds, "go Pro" with nothing to press (#436, flow 2). It stays under
      // the field it refused, in ProjectContext's words, with the way forward
      // as a link — the treatment /projects already gives the same refusal.
      setSaveError(err?.message || 'Couldn’t save')
    }
  }

  const adjustDirty = ADJUST_FIELDS.some(f => adjust[f.key] !== 0)
  const canUndo = resetSnapshotRef.current != null
    || history.some((entry) => paletteSignature(entry) !== paletteSignature({
      colors, seed, harmony, locked: [...locked], adjust, vision, showContrast, importedGalleryId,
    }))
  const activeHarmony = HARMONIES.find(h => h.id === harmony) || HARMONIES[0]
  const activeVision = VISION_MODES.find(([id]) => id === vision) || VISION_MODES[0]

  return (
    // `data-board-source` is the instrumentation for
    // `palette-opens-with-wrong-state`. The report — "sometimes I open the
    // palette builder and it has added many colours and it's a different
    // swatch" — was impossible to triage because the four ways a board can be
    // populated (a ?c= link, a hand-off, this device's saved project, a fresh
    // random draw) are indistinguishable once painted. This attribute names the
    // branch that won, and `data-board-cols` the count the founder was
    // counting, so a screenshot of the inspector or one line in the console
    // settles which path produced the board instead of the next reporter having
    // to reconstruct it. It is inert: nothing reads it to decide anything, and
    // it carries no colour values, so it stays safe to leave on in production.
    <div className="plb" data-board-source={initial.source} data-board-cols={colors.length}>
      <p className="sr-only" aria-live="polite">{liveMsg}</p>

      {/* ── Page heading ──
          FOUNDER, 2026-09-14, with a screenshot of this page at ~700px: the
          words "Palette Generator" struck through, the whole header boxed in
          red, "horrible UI and UX".

          What he approved on 2026-09-13 was a heading SLOT — "Build the slot,
          then I'll write the line." What shipped in the slot was the ROUTE'S
          OWN NAME at clamp(38px,5vw,64px), above an empty lede. So the page
          spent up to 64px of display type, plus the block's own padding,
          restating a word that is already in the nav, the browser tab and the
          share card — and then opened the working area below the fold on a
          phone. A workspace that titles itself is the tell: not one of
          Squarespace's palette editor, Arcade's Colors, Gamma's theme editor
          or Adobe Color spends a heading row on its own name. They open on the
          work.

          THE SLOT IS NOT DELETED, it just stops painting nothing. The heading
          area renders only when PALETTE_LEDE has something in it — the day he
          writes the line, the h1 and his sentence appear together, which is
          what the slot was for. Until then the h1 is still IN THE DOCUMENT,
          carrying id="plb-page-title", because `.plb-board` below is
          aria-labelledby it: the board's accessible name is this heading, and
          hiding it visually must not take the board's name away. Screen-reader
          users lose nothing; the page keeps exactly one h1 either way. */}
      {PALETTE_LEDE ? (
        <header className="plb-hero">
          <h1 id="plb-page-title">Palette Generator</h1>
          <p className="plb-hero-lede">{PALETTE_LEDE}</p>
        </header>
      ) : (
        <h1 id="plb-page-title" className="sr-only">Palette Generator</h1>
      )}

      {/* ── Toolbar ── */}
      <header className="plb-toolbar">
        <div className="plb-toolbar-group">
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

        {/* `rail-overflow` carries the shared scroller affordances (peek fade,
            visible scrollbar, snap). It is switched back OFF above 960px in
            global.css, where this group must not be a scroll container at all —
            its dropdowns are absolutely-positioned popups and a scroll
            container would clip them. */}
        <div className="plb-toolbar-group rail-overflow" ref={railRef}>
          {/* THE EXPLORATORY CLUSTER.
              Uncollapsed this wrapper is `display:contents` — it has no box, so
              the row is laid out exactly as it was before it existed and every
              measurement, rule and shipped test that reads this rail sees the
              same geometry. Collapsed it becomes a panel behind one labelled
              trigger. Each control keeps its own `.plb-menuwrap` and its own
              popover, so nothing about how they work changes; only where they
              live does. */}
          {toolsCollapsed && (
            <div className="plb-menuwrap plb-toolswrap">
              <button
                type="button"
                className="btn btn-s plb-toolsbtn"
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-controls={toolsOpen ? 'plb-tools-panel' : undefined}
                title="Image, Explore, Preview, Gradient and History"
                onClick={() => { const n = !toolsOpen; closeAllMenus(); setToolsOpen(n) }}
              >
                <IcoSliders />
                {/* A WORD, not a tenth icon. The founder's desktop complaint is
                    a run of icon-only buttons reading as unresolved; answering
                    an overflow with one more glyph would deepen exactly that.
                    Mobbin: Substack's editor toolbar collapses to "More ▾" set
                    beside its other labelled dropdowns, so the overflow reads
                    as a peer of Style and Button rather than as another
                    mystery square. */}
                <span className="plb-harm-k">Tools</span>
                <IcoChevron />
              </button>
            </div>
          )}
          <ToolCluster collapsed={toolsCollapsed} open={toolsOpen}>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-icobtn"
              aria-label="Image"
              aria-haspopup="dialog"
              aria-expanded={imgOpen}
              title="Pull colours from an image"
              onClick={() => { const n = !imgOpen; closeAllMenus(); setImgOpen(n) }}
            >
              <IcoImage /><span className="plb-lbl"><span className="plb-lbl-i">Image</span></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="plb-file" onChange={onImageFile} aria-hidden="true" tabIndex={-1} />
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
                    {/* openBrands holds only the rows this viewer may load. A
                        Pro-gated brand is not in the list, so its colours never
                        reach barRef and never enter the DOM — the lock is the
                        absence of the row, not a style over it. */}
                    {openBrands.map(b => (
                      <div key={b.id} className="plb-varrow">
                        <button type="button" className="plb-varrow-main" onClick={() => pickBrand(b)}>
                          <span className="plb-strip" aria-hidden="true">
                            {b.colors.map((c, k) => <span key={k} className="plb-strip-c" ref={barRef(c)} />)}
                          </span>
                          <span className="plb-varrow-name">{b.name}</span>
                        </button>
                        <button
                          type="button"
                          className="plb-varrow-cmp"
                          title="Compare with the current palette"
                          aria-label={`Compare ${b.name} with the current palette`}
                          onClick={() => comparePalette(b.name, b.colors)}
                        >
                          <IcoEye />
                        </button>
                      </div>
                    ))}
                    {lockedBrands.map(preview => <LockedPaletteRow key={preview.id} preview={preview} />)}
                    {lockedBrandCount > 0 && (
                      <LockedTeaseCta
                        gate="palette-builder-brand-lock"
                        heading={`Another ${lockedBrandCount} brand ${lockedBrandCount === 1 ? 'system' : 'systems'} with Pro`}
                        body="Loading a brand applies its whole colour system, not only its swatches."
                        action="See what Pro includes"
                        modal={{
                          eyebrow: 'Pro colour tools',
                          title: 'Load any brand system',
                          subtitle: `Free covers ${BRAND_PALETTES.length - lockedBrandCount} starter brands. Pro opens the remaining ${lockedBrandCount}, and each one applies the brand’s whole colour system rather than its swatches alone.`,
                        }}
                      />
                    )}
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
          </ToolCluster>
          {/* ── end of the exploratory cluster ─────────────────────────────────
              What stays on the row is what a person is mid-task with: generate,
              step back, and commit. What collapses is what they went LOOKING
              for. That split is also why the cluster is contiguous in the DOM:
              a collapse that reordered the row would move focus order for
              everyone to buy space for one band. */}
          {/* NOT `btn-accent`. Measured 2026-09-14: this button and "Save /
              export" both carried it, so the row showed TWO filled accent
              buttons of equal weight and the eye had no way to tell the
              reversible act from the committing one. Randomise is the cheap,
              undoable, repeatable act — Space does it, and Undo sits next to
              it. Save / export is the one that leaves the page. One primary
              per row; this is the one that gives it up. */}
          <button type="button" className="btn btn-s plb-random" onClick={randomize}>
            <IcoShuffle /> Randomise <kbd className="plb-kbd">Space</kbd>
          </button>
          {/* `plb-undo` / `plb-reset` are layout hooks, not new styling: below
              961px these two are promoted out of the rail's overflow and drop
              their visible label (see the max-width:960px block in global.css).
              The accessible name stays on aria-label either way. */}
          <button type="button" className="btn btn-s plb-icobtn plb-undo" aria-label="Undo" onClick={undoPalette} disabled={!canUndo} title="Undo the last palette change">
            <IcoUndo /><span className="plb-lbl"><span className="plb-lbl-i">Undo</span></span>
          </button>
          <button type="button" className="btn btn-s plb-icobtn plb-reset" aria-label="Reset" onClick={resetPalette} title="Reset every palette control to its default">
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
                            setHarmony(h.harmony || DEFAULT_SYSTEM)
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
          {/* The order hook goes on the WRAPPER, not the button: the wrapper is
              the rail's flex item, so `order` on the button would do nothing. */}
          <div className="plb-menuwrap plb-savewrap">
            <button
              type="button"
              className="btn btn-s btn-accent plb-icobtn"
              aria-label="Save / export"
              aria-expanded={saveOpen}
              aria-haspopup="dialog"
              title="Save, share or export this palette"
              onClick={() => {
                // No gate here — see the note on doSave. This menu holds three
                // Copy rows, and copying is free forever; the account is asked
                // for at the save and at the PNG, which are the two things that
                // keep or produce something.
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
                {saveError && <SaveRefusal message={saveError} testId="palette-save-refusal" />}
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
                            catch (err) { toast?.(err?.message || 'Couldn’t save', 'error') }
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
                <button type="button" className="plb-menu-item" onClick={() => { copyCssExport(); setSaveOpen(false) }}><IcoCopy /> Copy CSS variables</button>
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

      {/* THE BOARD IS THE PAGE, SO IT CARRIES A NAME AND THE COLUMNS DO NOT.
          ------------------------------------------------------------------
          Measured on the built preview at 1440x900, signed out and signed in,
          off Chrome's own accessibility tree rather than off the markup: this
          route's landmark list was

            navigation(Primary) | main | contentinfo
            | region("PRIMARY #664BB7") | region("SECONDARY #CE70B4")
            | region("ACCENT #B39CFF") | region("SUBTLE #E6E0EC")
            | region("DEEP #352565") | navigation(Footer)

          Five of the nine landmarks on the page were colour swatches, named
          with raw hex, and the count GREW with the palette — a sixth colour
          made a sixth landmark, up to PRO_MAX. The board itself, which is the
          thing the page exists to produce, was anonymous, and the only
          heading in the document was the 15px toolbar h1 above.

          The cause was one element choice: each column was a <section> with
          an accessible name, and a named <section> IS role=region. The five
          sibling colour tools use that element for exactly the opposite job —
          /create/tint, /create/gradient and /create/semantic-color each wrap a
          major page section in one and point aria-labelledby at that section's
          own h2, so their landmark lists read "Choose source colours", "Tune
          the system", "Shape the gradient". Same element, two meanings, which
          is the failure principle-ai-slop-diagnostic names under system
          coherence: similar treatment without a semantic reason.

          The correction is the one this repo had already written for the OTHER
          renderer of this board. HomeWorkbench.jsx paints .plb-board with a
          grouping role and a name, and .plb-badges below has grouped its two
          contrast readings the same way since launch. So the set is the named
          unit and a swatch is an item inside it — which is also what every
          colour surface read on Mobbin does (Mural, Discord, V7 and Canva all
          put one heading over the whole set; Arcade, Gamma and Squarespace
          name the palette and leave the swatches carrying a name and a value).

          The name is borrowed from the h1 rather than typed, so there is no
          second string that can drift from the page's own title.

          NOTHING PAINTED MOVES. A role attribute has no rule in any stylesheet
          here, and <section> and <div> are both display:block before .plb-col
          sets its own — 64-computed-style-snapshot passes all 25 routes
          unregenerated. */}
      <div className="plb-board" role="group" aria-labelledby="plb-page-title">
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
            <div
              role="group"
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
                  className={isLocked ? 'plb-tool plb-tool--key plb-tool--on' : 'plb-tool plb-tool--key'}
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
                      openProModal({ gate: 'palette-contrast-view', eyebrow: 'Pro colour tools', title: 'Check contrast, light and dark', subtitle: 'See WCAG contrast on every colour against both white and black text — so you know which colours carry legible text in light and dark UI.' })
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
                <button type="button" className="plb-tool plb-tool--key" title="Copy hex" aria-label={`Copy ${adjusted[i]}`} onClick={() => onCopy?.(adjusted[i])}>
                  <IcoCopy />
                </button>
                {adjusted.length > 2 && (
                  <button type="button" className="plb-tool" title="Remove colour" aria-label={`Remove ${role}`} onClick={() => removeCol(i)}>
                    <IcoX />
                  </button>
                )}
                {/* Touch-band overflow. See the @media(min-width:769px) and
                    (hover:none) block in global.css for why it exists: that band
                    inherits the desktop VERTICAL tool column while hover:none
                    pins it permanently open, which puts seven unlabelled icons
                    down the top of every swatch. Only .plb-tool--key survives
                    there; the rest move behind this one control, which opens the
                    existing labelled "Colour actions" menu rather than adding a
                    second surface to maintain. */}
                <button
                  type="button"
                  className={ctxMenu?.kind === 'swatch' && ctxMenu.i === i ? 'plb-tool plb-tool--more plb-tool--on' : 'plb-tool plb-tool--more'}
                  title="More colour actions"
                  aria-label={`More actions for ${role}`}
                  aria-haspopup="menu"
                  aria-expanded={ctxMenu?.kind === 'swatch' && ctxMenu.i === i}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    setTintsIdx(null); setPickerIdx(null); setSwapIdx(null)
                    setCtxMenu(cur => (cur && cur.kind === 'swatch' && cur.i === i)
                      ? null
                      : { kind: 'swatch', i, x: r.left, y: r.bottom + 6 })
                  }}
                >
                  <IcoMore />
                </button>
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

              {/* ONE button, five decorative bars — it used to be five buttons.
                  They were identical: same aria-label, same onClick, no
                  per-bar behaviour, so the ramp offered one function through
                  five targets. That cost a WCAG 2.5.8 failure (14px wide with a
                  4px gap puts the centres 18px apart, so the 24px spacing
                  exception cannot apply either), 20 redundant tab stops per
                  page, and "View the tints of #009549, button" announced five
                  times per swatch. As one button the target is 86x34, and the
                  bars become the same aria-hidden chip-strip idiom already used
                  by .plb-strip-c and .plb-pvg-sw. */}
              <button
                type="button"
                className="plb-ramp"
                title="View tints"
                aria-label={`Tonal ramp of ${adjusted[i]} — view all tints`}
                onClick={() => { setPickerIdx(null); setCtxMenu(null); setTintsIdx(t => (t === i ? null : i)) }}
              >
                {ramp.map((rc, k) => (
                  <span key={k} className="plb-ramp-bar" ref={barRef(rc)} aria-hidden="true" />
                ))}
              </button>
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
            </div>
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
                      openProModal({ gate: 'palette-colour-cap', eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
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
          <button
            type="button"
            role="menuitem"
            className="plb-ctx-item"
            onClick={() => {
              setCtxMenu(null)
              if (!isPro) {
                openProModal({ gate: 'palette-contrast-view', eyebrow: 'Pro colour tools', title: 'Check contrast, light and dark', subtitle: 'See WCAG contrast on every colour against both white and black text — so you know which colours carry legible text in light and dark UI.' })
                return
              }
              setShowContrast(v => !v)
            }}
          >
            <IcoContrast /> {showContrast ? 'Hide contrast' : 'Show contrast'}
          </button>
          <div className="plb-ctx-sep" aria-hidden="true" />
          {ctxMenu.i > 0 && (
            <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { swapCols(ctxMenu.i, 'left'); setCtxMenu(null) }}><IcoArrowLeft /> Swap left</button>
          )}
          {ctxMenu.i < colors.length - 1 && (
            <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { swapCols(ctxMenu.i, 'right'); setCtxMenu(null) }}><IcoArrowRight /> Swap right</button>
          )}
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { insertAt(ctxMenu.i, midColor(colors[Math.max(0, ctxMenu.i - 1)], colors[ctxMenu.i])); setCtxMenu(null) }}><IcoPlus size={15} /> Insert left</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { insertBetween(ctxMenu.i); setCtxMenu(null) }}><IcoPlus size={15} /> Insert right</button>
          {colors.length > 2 && (
            <button type="button" role="menuitem" className="plb-ctx-item plb-ctx-item--danger" onClick={() => { removeCol(ctxMenu.i); setCtxMenu(null) }}><IcoX /> Remove</button>
          )}
        </div>
      )}

      {/* ── Image picker modal ──
          Was an anchored 300px toolbar dropdown. Two things were wrong with it,
          and the founder only saw the second: the stage was too small to place a
          picker point deliberately, and — the real fault — it was a FIXED 16/10
          box showing the image `object-fit: cover`, while every picker point is
          stored as a normalised coordinate in the SOURCE. Any image that was not
          16/10 was cropped, so the markers sat over pixels they had not sampled
          and dragging one read the colour under a different pixel than the one
          under the cursor. Centred, enlarged, and the stage now takes the
          image's own ratio so the two coordinate spaces are the same space. */}
      {imgOpen && (
        <div
          className="plb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Pull colours from an image"
          tabIndex={-1}
          ref={imageDialogRef}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setImgOpen(false) }}
        >
          <div className="plb-modal-card plb-imgcard">
            <div className="plb-modal-head">
              <span className="plb-pop-title">From image</span>
              <button type="button" className="plb-pop-x" onClick={() => setImgOpen(false)} aria-label="Close">
                <IcoX />
              </button>
            </div>
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
                <div className="plb-imgstage" ref={imgStageRef} style={{ '--plb-img-ar': imgAspect }} data-img-aspect={imgAspect}>
                  <img src={imgSrc} alt="Uploaded reference" className="plb-imgstage-img" draggable={false} />
                  {imgPoints.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className={imgActive === i ? 'plb-imgpoint plb-imgpoint--on' : 'plb-imgpoint'}
                      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, background: p.hex }}
                      onPointerDown={(e) => { e.preventDefault(); imgDragIdx.current = i; setImgActive(i) }}
                      // Focus, not click, arms the loupe for a keyboard user:
                      // arriving on the marker is the moment they need to see
                      // where it is, and it is the only cue they get that the
                      // arrow keys now do something.
                      onFocus={() => setImgActive(i)}
                      onKeyDown={(e) => onImagePointKey(e, i)}
                      aria-label={`Picker point ${i + 1}: ${p.hex}. Use the arrow keys to move it a pixel at a time, or hold Shift for ten.`}
                      title={p.hex}
                      data-hex={p.hex}
                    />
                  ))}
                  {/* Parked in a corner rather than under the pointer (Alan),
                      and on the side AWAY from the marker, so the magnifier
                      never covers the region it is magnifying. */}
                  {imgActive != null && imgPoints[imgActive] && (
                    <div
                      className="plb-loupe"
                      data-side={imgPoints[imgActive].x > 0.5 ? 'left' : 'right'}
                      aria-hidden="true"
                    >
                      <canvas ref={imgLoupeRef} className="plb-loupe-cv" width={208} height={208} />
                      <span className="plb-loupe-hex">{imgPoints[imgActive].hex}</span>
                    </div>
                  )}
                </div>
                {/* One live region for both input methods — a keyboard nudge is
                    silent otherwise, and the loupe it arms is aria-hidden
                    because a canvas of pixels is not something to read out. */}
                <p className="sr-only" aria-live="polite">
                  {imgActive != null && imgPoints[imgActive]
                    ? `Point ${imgActive + 1} is on ${imgPoints[imgActive].hex}`
                    : ''}
                </p>
                <p className="plb-imghint">Drag a marker, or focus one and use the arrow keys, to sample a different pixel.</p>
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
        </div>
      )}

      {/* ── Preview modal ── */}
      {preview && (
        <div
          className="plb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Palette preview"
          tabIndex={-1}
          ref={previewDialogRef}
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
                          onClick={() => openProModal({ gate: 'palette-preview-scene', eyebrow: 'Pro palette previews', title: `Preview ${scene.name.toLowerCase()}`, subtitle: 'Test your palette across the complete preview library, in both light and dark interfaces.' })}
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
          tabIndex={-1}
          ref={submitDialogRef}
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
      {/* The grouping role is what DELIVERS the name on the line below. A
          <footer> that is a descendant of <main> maps to the generic role, and
          a generic element takes no accessible name — so "Global palette
          adjustments" was written here, and Chrome's accessibility tree
          reported this strip nameless at every width and in both themes. The
          string is unchanged; it simply reaches a reader now. */}
      <footer className="plb-adjust" role="group" aria-labelledby="plb-adjust-title">
        {/* THE STRIP NOW SAYS WHAT IT DOES, ON SCREEN.
            "Global palette adjustments" existed only as an aria-label, so the
            name reached assistive technology and nobody else. A sighted user
            got four sliders against the bottom edge with no statement of
            SCOPE — and scope is the one thing that matters here, because
            every other control on this page acts on ONE swatch (lock, copy,
            the per-row menu) while these four move all of them at once. The
            founder's screenshot boxed this strip as horrible UX; reading it
            cold, there is nothing that tells you dragging Hue will repaint
            the whole board.

            aria-labelledby, not aria-label, so the accessible name IS the
            visible one rather than a second string that can drift from it. */}
        <p className="plb-adjust-title" id="plb-adjust-title">Adjust all</p>
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
        {/* The icon is not decoration and it is not new: it is the same
            <IcoCopy /> the save menu puts on "Copy CSS variables", which calls
            this same copyCssExport(). Measured, this button and `.plb-hexfield`
            — a real text input two rows above it — shared a white ground and
            the identical 1px rgb(218,216,207) border, and at <=768 this one
            stretches to the full width of the viewport (628x29 at 660px). The
            founder read it off a screenshot as a text field. A leading glyph is
            what a field never has. */}
        <button type="button" className="btn btn-s plb-copycss" onClick={copyCssExport}><IcoCopy /> Copy CSS</button>
      </footer>

      {/* Step 1 of the brand-kit walkthrough (colours → fonts → type scale →
          icons). Renders nothing unless the visitor is in the flow. This page is
          the step because it is the tool that writes `design.palette`, which is
          what the walkthrough reads to know the step is done. */}
      <UIKitGuide step="color" />
    </div>
  )
}
