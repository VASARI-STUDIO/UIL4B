import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SnapSlider from '../components/SnapSlider'
import ColorPickerPop from '../components/ColorPickerPop'
import {
  applyAdjust, autoTonalFromSeed, autoTonalPalette, contrastRatio, derivePreviewRoles,
  generateHarmony, hctToHex, hexToHct, hexToHsl, hslToHex, mixHex, simCvd,
  textColorForBg, tonalRamp,
} from '../utils/colors'
import { FREE_VARIATIONS, paletteVariations, scorePalette } from '../utils/paletteVariations'
import { BRAND_PALETTES } from '../data/brandPalettes'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'

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
const HANDLE_KEY = 'vs-community-handle'            // the user's chosen social name

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
// Compact relative time for the history rows — "Just now", "5m ago", "2h ago".
function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 45) return 'Just now'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

// ── Random themed palette-name generator (Wave 5 item 21) ────────────────────
// Pure client-side, no API. We bucket the palette by its dominant HCT hue
// (weighted by chroma so near-greys barely vote) plus overall chroma, then
// stitch an adjective + noun from a themed wordlist — greens → nature, warm
// hues → sunset, blues → ocean, greys → mono/tech, and so on.
// Each theme carries three banks: `adj` (editorial modifiers), `noun` (material /
// pigment names that can also stand alone), and `solo` (evocative single words
// that need no adjective). Vocabulary leans on architecture, pigment and
// interiors language so the output reads like a magazine colour story.
const NAME_THEMES = {
  sunset: {
    adj: ['Burnished', 'Sun-Baked', 'Molten', 'Faded', 'Antique', 'Scorched', 'Aged', 'Raw'],
    noun: ['Terracotta', 'Sienna', 'Ochre', 'Oxblood', 'Corten', 'Ember', 'Saffron', 'Cinnabar', 'Marmalade', 'Rust', 'Amber', 'Vermilion'],
    solo: ['Sfumato', 'Kiln', 'Adobe', 'Harvest', 'Firebrick', 'Persimmon'],
  },
  nature: {
    adj: ['Weathered', 'Dusty', 'Muted', 'Deep', 'Pale', 'Wild', 'Soft', 'Sun-Bleached'],
    noun: ['Sage', 'Moss', 'Olive', 'Verdigris', 'Celadon', 'Fern', 'Eucalyptus', 'Malachite', 'Laurel', 'Thyme', 'Pistachio', 'Patina'],
    solo: ['Conservatory', 'Botanica', 'Foliage', 'Wintergreen', 'Bracken', 'Undergrowth'],
  },
  ocean: {
    adj: ['Deep', 'Glacial', 'Faded', 'Cold', 'Washed', 'Nordic', 'Muted', 'Antique'],
    noun: ['Indigo', 'Cobalt', 'Prussian', 'Cerulean', 'Slate', 'Teal', 'Delft', 'Denim', 'Marine', 'Glacier', 'Azure', 'Petrol'],
    solo: ['Nocturne', 'Fathom', 'Meridian', 'Bathhouse', 'Cyanotype', 'Deepwater'],
  },
  cosmic: {
    adj: ['Velvet', 'Regal', 'Dusky', 'Smoked', 'Deep', 'Faded', 'Antique', 'Muted'],
    noun: ['Aubergine', 'Plum', 'Amethyst', 'Damson', 'Orchid', 'Iris', 'Mulberry', 'Byzantine', 'Tyrian', 'Mauve', 'Wine', 'Heather'],
    solo: ['Twilight', 'Vespers', 'Nightfall', 'Obscura', 'Penumbra', 'Aster'],
  },
  candy: {
    adj: ['Soft', 'Faded', 'Sun-Washed', 'Bright', 'Powdered', 'Dusty', 'Vivid', 'Antique'],
    noun: ['Rose', 'Blush', 'Coral', 'Peony', 'Fuchsia', 'Raspberry', 'Flamingo', 'Sorbet', 'Guava', 'Watermelon', 'Bubblegum', 'Punch'],
    solo: ['Confetti', 'Aperitif', 'Camellia', 'Pomelo', 'Gelato', 'Rosewater'],
  },
  tech: {
    adj: ['Brushed', 'Signal', 'Cold', 'Anodised', 'Electric', 'Muted', 'Matte', 'Charged'],
    noun: ['Titanium', 'Chrome', 'Cobalt', 'Graphite', 'Pewter', 'Gunmetal', 'Steel', 'Neon', 'Circuit', 'Alloy', 'Carbon', 'Signal'],
    solo: ['Monolith', 'Wireframe', 'Datum', 'Hologram', 'Blueprint', 'Interface'],
  },
  mono: {
    adj: ['Raw', 'Aged', 'Bare', 'Soft', 'Weathered', 'Matte', 'Pale', 'Warm'],
    noun: ['Alabaster', 'Travertine', 'Basalt', 'Graphite', 'Pewter', 'Greige', 'Oatmeal', 'Bone', 'Concrete', 'Plaster', 'Limestone', 'Chalk'],
    solo: ['Brutalist', 'Terrazzo', 'Vellum', 'Parchment', 'Gesso', 'Monochrome'],
  },
}

// Art-movement / atelier prefixes that pair with any theme noun for a
// gallery-label feel ("Bauhaus Ochre", "Atelier Sienna").
const NAME_MOVEMENTS = ['Bauhaus', 'Atelier', 'Modernist', 'Nordic', 'Studio', 'Salon', 'Deco', 'Archive']

function paletteTheme(colors) {
  if (!colors?.length) return 'mono'
  let sumC = 0, hasAccent = false
  const hueBins = {}
  for (const hex of colors) {
    let h, c
    try { [h, c] = hexToHct(hex) } catch { continue }
    sumC += c
    if (c > 25) hasAccent = true
    const key = (Math.round(h / 30) * 30) % 360   // 12 coarse hue bins
    hueBins[key] = (hueBins[key] || 0) + c        // vote weighted by chroma
  }
  const avgC = sumC / colors.length
  if (avgC < 12) return hasAccent ? 'tech' : 'mono' // mostly greys
  const domHue = Number(Object.entries(hueBins).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
  if (domHue < 15 || domHue >= 330) return avgC > 55 ? 'candy' : 'sunset' // red / pink
  if (domHue < 45) return avgC > 45 ? 'sunset' : 'nature'                 // orange
  if (domHue < 90) return 'sunset'                                        // yellow-amber
  if (domHue < 165) return 'nature'                                       // green
  if (domHue < 255) return 'ocean'                                        // cyan-blue
  if (domHue < 300) return 'cosmic'                                       // purple
  return 'candy'                                                          // magenta
}

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Compose a name from one of several editorial patterns so repeated rolls feel
// curated, not templated: "Burnished Sienna", "Travertine", "Corten & Ash",
// "Bauhaus Ochre", "Nocturne No. 4", "Sienna Study".
function randomPaletteName(colors) {
  const theme = NAME_THEMES[paletteTheme(colors)] || NAME_THEMES.mono
  const adj = () => pickOne(theme.adj)
  const noun = () => pickOne(theme.noun)
  const patterns = [
    () => `${adj()} ${noun()}`,
    () => `${adj()} ${noun()}`,        // weight the classic pair a little heavier
    () => pickOne(theme.solo),
    () => `${pickOne(NAME_MOVEMENTS)} ${noun()}`,
    () => `${noun()} Study`,
    () => `${pickOne(theme.solo)} No. ${2 + Math.floor(Math.random() * 8)}`,
    () => {
      // "A & B" — two distinct nouns from the theme.
      const a = noun()
      let b = noun()
      let guard = 0
      while (b === a && guard++ < 5) b = noun()
      return b === a ? `${adj()} ${a}` : `${a} & ${b}`
    },
  ]
  return pickOne(patterns)()
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
const IcoDice = () => (
  <Ico size={14}><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.1" /><circle cx="15.5" cy="8.5" r="1.1" /><circle cx="12" cy="12" r="1.1" /><circle cx="8.5" cy="15.5" r="1.1" /><circle cx="15.5" cy="15.5" r="1.1" /></Ico>
)
const IcoHistory = () => (
  <Ico size={13}><path d="M3 12a9 9 0 1 0 2.8-6.5" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></Ico>
)
const IcoGallery = () => (
  <Ico size={13}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Ico>
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

// ── The three preview scenes. Each maps the palette (via derivePreviewRoles →
// --pv-* custom props) onto a distinct, high-fidelity mock of a real design
// context, so "will this actually ship?" gets answered for UI, brand and
// graphic work — not just a dashboard. ──

// UI — a product dashboard (nav, KPI cards, data bars, CTA).
function PreviewUI({ colors }) {
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
    </>
  )
}

// Brand — a marketing landing hero (wordmark, headline, primary + ghost CTAs,
// brand-colour chip row).
function PreviewBrand({ colors }) {
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
        <span className="plb-pvb-eyebrow">Introducing</span>
        <div className="plb-pvb-head">Design that<br />feels inevitable</div>
        <div className="plb-pvb-sub">A brand system built from your exact palette — every role in place.</div>
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
function PreviewGraphic({ colors }) {
  return (
    <div className="plb-pvg">
      <div className="plb-pvg-shapes" aria-hidden="true">
        <span className="plb-pvg-circle" ref={barRef(colors[1] || colors[0])} />
        <span className="plb-pvg-square" ref={barRef(colors[2] || colors[0])} />
        <span className="plb-pvg-tri" ref={barRef(colors[3] || colors[0])} />
      </div>
      <div className="plb-pvg-body">
        <span className="plb-pvg-kicker">Vol. 04 — Colour</span>
        <div className="plb-pvg-title">FORM<br />&amp; HUE</div>
        <div className="plb-pvg-lead">Type, shape and colour working as one composed system.</div>
      </div>
      <div className="plb-pvg-swatches">
        {colors.slice(0, 8).map((c, i) => (
          <span key={i} className="plb-pvg-sw" ref={barRef(c)} />
        ))}
      </div>
    </div>
  )
}

function PreviewScene({ colors, mode, title, tab = 'ui' }) {
  const roles = derivePreviewRoles(colors, { mode })
  return (
    <div className="plb-pvwrap">
      {title && <div className="plb-pv-name">{title}</div>}
      <div className={`plb-pv plb-pv--${tab}`} ref={pvRef(roles)} aria-hidden="true">
        {tab === 'brand' ? <PreviewBrand colors={colors} />
          : tab === 'graphic' ? <PreviewGraphic colors={colors} />
            : <PreviewUI colors={colors} />}
      </div>
    </div>
  )
}

export default function PaletteBuilder({ onCopy, toast }) {
  const { design, setPalette, saveProject, overwriteProject, projects, canSaveProjects } = useProject()
  const { isPro } = useSubscription()
  const { openProModal } = useProModal()
  const { requireLogin } = useLoginPrompt()

  // A free user can only ever run a free system through the generator. Paid
  // harmonies and brand systems collapse to 'auto' for them, so editing from a
  // paid/brand state can't ride the paid engine (Pro users keep whatever's set).
  const resolveSystem = useCallback(
    (type) => (isPro || FREE_SYSTEMS.includes(type) ? type : 'auto'),
    [isPro]
  )

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
  const [ctxMenu, setCtxMenu] = useState(null)     // { i, x, y } right-click menu
  const [preview, setPreview] = useState(null)     // { mode, tab, compare } modal
  // Split-screen colour-vision check shown when a community palette is imported:
  // top = normal, bottom = the same palette through a colour-vision simulation,
  // so the user immediately sees how accessible their new palette is. { colors,
  // name, mode } where mode is a simCvd id (deuteranopia by default).
  const [splitVision, setSplitVision] = useState(null)
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
  // Design System Builder (Wave 6 item 23): replaces the old "Studio" link with a
  // coming-soon popup — long-term this becomes the guided walkthrough across the
  // individual colour tools.
  const [dsbOpen, setDsbOpen] = useState(false)
  // Combined community-gallery popup (Discover hand-in): one large popup with
  // Community / Variations / Brands tabs, applying a pick straight onto the board.
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryTab, setGalleryTab] = useState('community') // community | variations | brands
  // Palette history: rolling localStorage log (see HISTORY_KEY above).
  const [histOpen, setHistOpen] = useState(false)
  const [history, setHistory] = useState(loadHistory)
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

  // Freeze a snapshot the first time the variations tab is viewed (or after
  // invalidation). The variations grid now lives inside the combined Gallery
  // popup, so the snapshot freezes when that popup is open on the variations tab.
  useEffect(() => {
    if (galleryOpen && galleryTab === 'variations' && !varBase) setVarBase(applyAdjust(colors, adjust))
  }, [galleryOpen, galleryTab, varBase, colors, adjust])

  // Keep ProjectContext in sync so Save/overwrite capture the live palette and
  // the merged studio picks it up (same persisted shape as the studio writes).
  useEffect(() => {
    setPalette({ base: seed, harmony, colors: adjusted, extraColors: adjusted.slice(ROLES.length), globalAdjust: adjust, locked: [...locked], activeIdx: 0 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, harmony, adjusted.join(','), JSON.stringify(adjust), locked])

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
    if (norm) { setSeed(norm); regen(norm, harmony) }
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

  // Randomise — harmony-aware: the tonal Auto engine when a tonal system is
  // active, otherwise a fresh random seed run through the CURRENT harmony, so
  // randomise explores the system you chose instead of discarding it. Locked
  // colours always survive; HSL fallback if the HCT solver ever throws.
  const randomize = useCallback(() => {
    // Same free-system guard as regen: a free user randomising from a paid/brand
    // system gets a free system instead, and the UI snaps to match.
    const sys = resolveSystem(harmony)
    if (sys !== harmony) setHarmony(sys)
    let fresh
    try {
      if (sys === 'auto' || sys === 'monochromatic') {
        fresh = autoTonalPalette()
      } else {
        // Seed in confident brand territory, not muddy mid-tones: request high
        // chroma (48–92 — the HCT solver gamut-clamps per hue, so pale hues like
        // yellow settle lower automatically) at tone 46–60, the band where a
        // primary reads well on both light and dark surfaces.
        const seedHex = hctToHex(Math.random() * 360, 48 + Math.random() * 44, 46 + Math.random() * 14)
        fresh = generateHarmony(seedHex, sys)
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
  }, [harmony, locked, toast, resolveSystem])

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
  // Close every toolbar menu in one call — used by the dismiss layer and by each
  // toolbar button (so opening one always closes the rest). Setters are stable.
  const closeAllMenus = useCallback(() => {
    setSaveOpen(false); setHarmOpen(false); setVisionOpen(false); setImgOpen(false); setGalleryOpen(false); setHistOpen(false)
  }, [])
  const anyPopover = saveOpen || harmOpen || visionOpen || imgOpen
    || galleryOpen || histOpen
    || tintsIdx != null || pickerIdx != null || ctxMenu != null || preview != null
  useEffect(() => {
    if (!anyPopover) return
    const closePops = () => { setTintsIdx(null); setPickerIdx(null); setCtxMenu(null) }
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
        const key = colors.join(',')
        if (prev[0] && prev[0].colors.join(',') === key) return prev
        const next = [{ colors: [...colors], at: Date.now() }, ...prev].slice(0, HISTORY_MAX)
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* quota / disabled */ }
        return next
      })
    }, 900)
    return () => clearTimeout(t)
  }, [colors])

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
  // On importing a community palette, surface a top/bottom colour-vision check so
  // the user sees how the palette they just loaded holds up for colour-blind
  // viewers. Defaults to deuteranopia (the most common form).
  const openSplitVision = (colors, name) => {
    const cols = colors.map(c => normaliseHex(c)).filter(Boolean)
    if (cols.length < 2) return
    setSplitVision({ colors: cols, name, mode: 'deuteranopia' })
  }
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
  // the popup handles the handle gate + final submit.
  const openSubmit = async () => {
    const user = await requireLogin('submit this palette to the community', { free: true })
    if (!user) return
    setSaveOpen(false)
    setSubmitErr('')
    setSubmitName(n => n.trim() || randomPaletteName(adjusted))
    setSubmitOpen(true)
  }

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
    if (!handle) { setSubmitErr('Set your community handle first.'); return }
    try {
      const list = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]')
      list.push({
        id: 'u' + Date.now(),
        name,
        author: '@' + handle,
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
  const activeHarmony = HARMONIES.find(h => h.id === harmony) || HARMONIES[0]
  const activeVision = VISION_MODES.find(([id]) => id === vision) || VISION_MODES[0]

  return (
    <div className="plb">
      <p className="sr-only" aria-live="polite">{liveMsg}</p>

      {/* ── Toolbar ── */}
      <header className="plb-toolbar">
        <div className="plb-toolbar-group">
          <h1 className="plb-title">Palette Builder</h1>
          <div className="plb-seedpick">
            <ColorPickerPop
              value={seed}
              onChange={(hex) => setFromSeedInput(hex.toUpperCase())}
              ariaLabel="Pick seed colour"
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
              aria-expanded={imgOpen}
              title="Pull colours from an image"
              onClick={() => { const n = !imgOpen; closeAllMenus(); setImgOpen(n) }}
            >
              <IcoImage /><span className="plb-lbl">Image</span>
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
              aria-expanded={galleryOpen}
              aria-haspopup="dialog"
              title="Community gallery — palettes, variations and brand systems"
              onClick={() => { const n = !galleryOpen; closeAllMenus(); setGalleryOpen(n) }}
            >
              <IcoGallery /><span className="plb-lbl">Gallery</span>
            </button>
            {galleryOpen && (
              <div className="plb-menu plb-menu--left plb-galpopup" role="dialog" aria-label="Colour gallery">
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
                      onPick={(cols, name) => { applyPalette(cols, `Loaded ${name}`); setGalleryOpen(false); openSplitVision(cols, name) }}
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

          <button type="button" className="btn btn-s plb-icobtn" title="Preview the palette on a UI mockup" onClick={() => setPreview({ mode: 'light', tab: 'ui', compare: null })}>
            <IcoEye /><span className="plb-lbl">Preview</span>
          </button>
          <button
            type="button"
            className={showContrast ? 'btn btn-s plb-icobtn plb-tgl plb-tgl--on' : 'btn btn-s plb-icobtn plb-tgl'}
            aria-pressed={showContrast}
            title={isPro ? 'Show WCAG contrast on every colour — light and dark text' : 'Pro — WCAG contrast on every colour, light and dark text'}
            onClick={() => {
              if (!isPro) { openProModal({ eyebrow: 'Pro colour tools', title: 'Check contrast, light and dark', subtitle: 'See WCAG contrast on every colour against both white and black text — so you know which colours carry legible text in light and dark UI.' }); return }
              setShowContrast(v => !v)
            }}
          >
            <IcoContrast /><span className="plb-lbl">Contrast</span>{!isPro && <IcoLock open={false} size={12} />}
          </button>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s"
              aria-expanded={visionOpen}
              aria-haspopup="menu"
              title="Preview the palette through colour-vision deficiencies"
              onClick={() => { const n = !visionOpen; closeAllMenus(); setVisionOpen(n) }}
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
          <button type="button" className="btn btn-s" onClick={() => setDsbOpen(true)} title="Design System Builder — coming soon"><IcoSliders /> Design System Builder</button>
          <button type="button" className="btn btn-s btn-accent plb-random" onClick={randomize}>
            <IcoShuffle /> Randomise <kbd className="plb-kbd">Space</kbd>
          </button>
          <div className="plb-menuwrap">
            <button
              type="button"
              className="btn btn-s plb-icobtn"
              aria-expanded={histOpen}
              aria-haspopup="menu"
              title="Palette history — jump back to any board you've had"
              onClick={() => { const n = !histOpen; closeAllMenus(); setHistOpen(n) }}
            >
              <IcoHistory /><span className="plb-lbl">History</span>
            </button>
            {histOpen && (
              <div className="plb-menu plb-histmenu" role="menu" aria-label="Palette history">
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
                          onClick={() => { applyPalette(h.colors, 'Palette restored from history'); setHistOpen(false) }}
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
              aria-expanded={saveOpen}
              aria-haspopup="dialog"
              title="Save this palette to a project, or share &amp; export it"
              onClick={async () => {
                if (!canSaveProjects) {
                  const user = await requireLogin('save this palette', { free: true })
                  if (!user) return
                }
                const n = !saveOpen; closeAllMenus(); setSaveOpen(n)
              }}
            >
              <IcoBookmark /><span className="plb-lbl">Save &amp; share</span>
            </button>
            {saveOpen && (
              <div className="plb-menu plb-menu--left plb-savemenu" role="dialog" aria-label="Save, share and export this palette">
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
                <div className="plb-menu-sub">Share &amp; export</div>
                <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(shareLink()); setSaveOpen(false) }}><IcoCopy /> Copy link to this palette</button>
                <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(cssExport); setSaveOpen(false) }}><IcoCopy /> Copy CSS variables</button>
                <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(adjusted.join(', ')); setSaveOpen(false) }}><IcoCopy /> Copy hex values</button>
                <button type="button" className="plb-menu-item" onClick={downloadPng}><IcoDownload /> Download PNG card</button>
                <button type="button" className="plb-menu-item" onClick={openSubmit}><IcoUsers /> Submit to the community…</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── The board ── */}
      <div className="plb-board">
        {view.map((c, i) => {
          const ink = textColorForBg(c)
          const contrast = contrastPair(adjusted[i])
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
                  title={isPro ? 'Edit in HCT' : 'Edit in HCT — Pro'}
                  aria-label={`Edit ${role} in HCT`}
                  onClick={() => openHctPicker(i)}
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
          <div className="plb-modal-card">
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
            <div className={preview.compare ? 'plb-modal-body plb-modal-body--split' : 'plb-modal-body'}>
              <PreviewScene
                colors={adjusted}
                mode={preview.mode}
                tab={preview.tab}
                title={preview.compare ? `Current — score ${paletteScore}` : undefined}
              />
              {preview.compare && (
                <PreviewScene
                  colors={preview.compare.colors}
                  mode={preview.mode}
                  tab={preview.tab}
                  title={`${preview.compare.label}${preview.compare.score != null ? ` — score ${preview.compare.score}` : ''}`}
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

      {/* ── Split-screen colour-vision check (shown on community import) ── */}
      {splitVision && (
        <div
          className="plb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Colour-vision check"
          onPointerDown={(e) => { if (e.target === e.currentTarget) setSplitVision(null) }}
        >
          <div className="plb-modal-card">
            <div className="plb-modal-head">
              <span className="plb-pop-title">Colour-vision check{splitVision.name ? ` — ${splitVision.name}` : ''}</span>
              <div className="plb-modal-modes" role="group" aria-label="Colour-vision type">
                {VISION_MODES.filter(([id]) => id !== 'normal').map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={splitVision.mode === id ? 'plb-mode plb-mode--on' : 'plb-mode'}
                    aria-pressed={splitVision.mode === id}
                    onClick={() => setSplitVision(s => ({ ...s, mode: id }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className="plb-pop-x" aria-label="Close colour-vision check" onClick={() => setSplitVision(null)}><IcoX /></button>
            </div>
            <div className="plb-modal-body">
              <div className="plb-cvd-row">
                <div className="plb-cvd-label"><IcoEye /> Normal vision</div>
                <div className="plb-cvd-strip">
                  {splitVision.colors.map((c, i) => (
                    <span key={i} className="plb-cvd-sw" ref={barRef(c)} />
                  ))}
                </div>
              </div>
              <div className="plb-cvd-row">
                <div className="plb-cvd-label"><IcoEye /> {VISION_MODES.find(([id]) => id === splitVision.mode)?.[1] || 'Simulated'}</div>
                <div className="plb-cvd-strip">
                  {splitVision.colors.map((c, i) => (
                    <span key={i} className="plb-cvd-sw" ref={barRef(simCvd(c, splitVision.mode))} />
                  ))}
                </div>
              </div>
              <p className="plb-cvd-note">Top row shows your palette as most people see it; the bottom row simulates how it appears with {(VISION_MODES.find(([id]) => id === splitVision.mode)?.[1] || '').toLowerCase()}. Colours that collapse together may be hard to tell apart.</p>
            </div>
            <div className="plb-modal-actions">
              <button type="button" className="btn btn-s btn-accent" onClick={() => setSplitVision(null)}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit-to-community popup (Wave 5 items 20–22) ── */}
      {submitOpen && (
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

            {!handle ? (
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
                  Posting as <strong>@{handle}</strong>
                  <button type="button" className="plb-linkbtn" onClick={() => { setHandle(''); setHandleErr('') }}>change</button>
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

      {dsbOpen && (
        <div
          className="plb-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Design System Builder"
          onPointerDown={(e) => { if (e.target === e.currentTarget) setDsbOpen(false) }}
        >
          <div className="plb-modal-card plb-dsbcard">
            <div className="plb-modal-head">
              <span className="plb-pop-title">Design System Builder</span>
              <button type="button" className="plb-pop-x" aria-label="Close" onClick={() => setDsbOpen(false)}><IcoX /></button>
            </div>
            <div className="plb-dsb-body">
              <div className="plb-dsb-emoji" aria-hidden="true">🤫</div>
              <p className="plb-dsb-lede">
                A guided walkthrough that carries you across every colour tool — palette,
                semantic, tints, UI colour and gradients — into one finished system.
              </p>
              <p className="plb-dsb-sub">It&rsquo;s on the way. For now, jump straight into any of the tools it will connect:</p>
              <nav className="plb-dsb-links" aria-label="Colour tools">
                <Link className="plb-dsb-link" to="/color/palette" onClick={() => setDsbOpen(false)}>Palette</Link>
                <Link className="plb-dsb-link" to="/color/semantic" onClick={() => setDsbOpen(false)}>Semantic Colour</Link>
                <Link className="plb-dsb-link" to="/color/tint" onClick={() => setDsbOpen(false)}>Tint</Link>
                <Link className="plb-dsb-link" to="/color/ui" onClick={() => setDsbOpen(false)}>UI Colour</Link>
                <Link className="plb-dsb-link" to="/color/gradient" onClick={() => setDsbOpen(false)}>Gradient</Link>
                <Link className="plb-dsb-link" to="/color/contrast" onClick={() => setDsbOpen(false)}>Contrast Checker</Link>
              </nav>
            </div>
            <div className="plb-modal-actions">
              <button type="button" className="btn btn-s btn-accent" onClick={() => setDsbOpen(false)}>Got it</button>
            </div>
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
