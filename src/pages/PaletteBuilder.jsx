import { Suspense, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useExport } from '../contexts/ExportContext'
import SnapSlider from '../components/SnapSlider'
// `lazy` in this file is lazyRoute, not React's: if the dialog's file failed to
// download, it waits for the recovery reload instead of crashing the page.
import { lazyRoute as lazy } from '../utils/lazyRoute'
import ColorPickerPop from '../components/ColorPickerPop'
import {
  ToolLayout, ToolBack, ToolButton, ToolSelect, ToolSlider, ToolIcon, ToolCode,
} from '../components/tool/ToolLayout'
import {
  adjustTrackGradientsFromStops, adjustTrackStops, applyAdjust,
  autoTonalFromSeed, contrastRatio, generateHarmony, hctToHex,
  hexToHct, hexToHsl, hslToHex, mixHex, randomSystemPalette, simCvd, textColorForBg,
} from '../utils/colors'
// The Tint Generator's own ramp (one function, so the swatch tints and the
// generator cannot drift): the strip is five of its steps, the popover all 11.
import { swatchStripHexes, tintRampForHex } from '../utils/tintRamp'
import { colourFormats } from '../utils/colourFormats'
import { freeVariationIds, paletteVariations, scorePalette } from '../utils/paletteVariations'
// Column titles + the community-submit dice name share one vocabulary — see
// utils/paletteNames.js for why `colorName` is deterministic and
// `randomPaletteName` deliberately is not.
import { colorName, randomPaletteName } from '../utils/paletteNames'
import { roleLabel } from '../utils/paletteRoles'
import { barRef, colRef } from '../utils/paletteBoard'
import { VISION_HUES, VISION_MODES, VISION_NOTE, visionAnnouncement, visionMode } from '../utils/visionModes'
import { BRAND_ROWS, LIBRARY_PALETTE_ROWS } from '../data/paletteLibrary'
import { LIBRARY_TOTALS } from '../data/libraryTotals'
import { LIBRARY_RULES } from '../utils/libraryRules'
import { useProLibrary } from '../hooks/useProLibrary'
import ProLibraryStatus from '../components/library/ProLibraryStatus'
import { IcoSearchSm, ProBlock, RovingRows, RowSkeletons, SwatchRow, YourPaletteRow } from '../components/palette/SwatchRows'
// The preview dialog: the scene list and the role legend. Its own chunk, loaded
// when Preview is first pointed at or opened (previewLoader.js).
import { DEFAULT_SCENE, PREVIEW_SCENES, openingScene } from '../data/palettePreviewScenes'
import { loadPreviewDialog } from '../components/palette/previewLoader'
import NearestMatchPanel from '../components/palette/NearestMatchPanel'
import HarmonyWheel from '../components/palette/HarmonyWheel'
import { splitLockedLibrary, GALLERY_TIER_LIMITS } from '../utils/lockedPreview'
import { useProject } from '../contexts/ProjectContext'
import { fileName } from '../utils/exportFileName'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useProModal } from '../contexts/ProModalContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useAuth } from '../contexts/AuthContext'
import { getOwnerHandle, PUBLIC_OWNER_ID } from '../utils/constants'
import UIKitGuide from '../components/UIKitGuide'
import SaveShareMenu from '../components/tool/SaveShareMenu'
import { stashPendingSave, clearPendingSave, takePendingSave } from '../utils/pendingSave'
import { appendCommunitySubmission } from '../utils/communitySubmissions'
import { buildQueueRecord } from '../utils/communityQueue'
import { publishToQueue } from '../utils/communityQueueApi'
import { isPostLimit } from '../utils/communityLimits'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { boardDraftAge, consumeBoardDraft, readBoardDraft, resetGradientDraft, resetTintDraft, setGradientDraft, setTintDraft } from '../utils/colorHandoff'
// The adjust lens contract — see utils/paletteAdjust.js for why the base
// colours and the slider values are persisted separately.
import useModalDialog from '../hooks/useModalDialog'
import useExportGate from '../hooks/useExportGate'
// The measured collapse for the action rail — the rule, the measurements that
// found the band nobody had reported, and why one band is exempt.
import { normaliseHex, persistedPalette, readSavedPalette, ZERO_ADJUST } from '../utils/paletteAdjust'
import { columnPair, handoffUrl, readingPair } from '../utils/contrastHandoff'
// What a fresh board and a Reset open on, plus the ?c= > hand-off > saved >
// random precedence — kept pure so the free-settings default and “a shared link
// beats the random draw” can be tested exhaustively without a DOM.
import { colorsFromSearch, defaultPaletteBoard, DEFAULT_SYSTEM, initialPaletteBoard, isDefaultSettings } from '../utils/paletteDefaults'

// The preview dialog, as its own chunk. The Preview button warms it on hover and
// focus, so a click usually finds it already loaded.
const PalettePreviewDialog = lazy(() => loadPreviewDialog())
const warm = () => { loadPreviewDialog().catch(() => {}) }
const warmPreview = { onPointerEnter: warm, onFocus: warm }

// Pointer-opened menus must not leave a keyboard reveal latched on Escape.
function returnMenuFocus(el, pointer) {
  if (!el) return
  if (!pointer) { el.focus({ preventScroll: true }); return }
  let supported = false
  el.focus({ preventScroll: true, get focusVisible() { supported = true; return false } })
  if (!supported || el.matches(':focus-visible')) el.blur()
}
// A brand's tick in Explore shares `importedGalleryId` with the community palettes, so its id is prefixed.
const brandTickId = (b) => `brand:${b.id}`
// True from 1024px up, where Suggest and Explore dock beside the board.
function useWideDock() {
  const Q = '(min-width: 1024px)'
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(Q).matches
  const [wide, setWide] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(Q)
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return wide
}
// The phone layout's breakpoint (the same one ToolLayout's overflow uses).
const PHONE_QUERY = '(max-width: 767px)'
function usePhone() {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches
  const [phone, setPhone] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(PHONE_QUERY)
    const on = () => setPhone(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return phone
}

// Marks a scrolling body that has more below it, so the CSS can fade its bottom
// edge. A ref callback with a cleanup: it measures on mount, on scroll and when
// the body resizes, and writes one data attribute straight to the element
// rather than through React state.
function scrollCue(el) {
  if (!el) return undefined
  const check = () => {
    el.dataset.more = el.scrollHeight - el.scrollTop - el.clientHeight > 4 ? 'true' : 'false'
  }
  check()
  el.addEventListener('scroll', check, { passive: true })
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
  ro?.observe(el)
  // Rows that arrive after mount (a list fetched late) change the scroll height
  // without resizing the body, so watch its content too.
  const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(check) : null
  mo?.observe(el, { childList: true, subtree: true })
  return () => {
    el.removeEventListener('scroll', check)
    ro?.disconnect()
    mo?.disconnect()
  }
}

// Palette CSS on a phone: the toolbar overflow's bottom sheet (the .tl-sheet
// classes in tool-layout.css), holding the CSS and its copy button. The scrim
// and Escape close it; useModalDialog traps focus and returns it to the button
// that opened the sheet.
function PaletteCssSheet({ css, onCopy, onClose }) {
  const ref = useModalDialog(onClose)
  return createPortal(
    <div className="tl-sheet-layer">
      <div className="tl-sheet-scrim" aria-hidden="true" onClick={onClose} />
      <div className="tl-sheet" role="dialog" aria-modal="true" aria-label="Palette CSS" tabIndex={-1} ref={ref}>
        <span className="tl-sheet-grab" aria-hidden="true" />
        <div className="tl-sheet-head">
          <span className="tl-sheet-title">Palette CSS</span>
          <button type="button" className="tl-sheet-x" onClick={onClose} aria-label="Close">
            <ToolIcon name="x" size={16} />
          </button>
        </div>
        <ToolCode tone="page" label="Palette CSS variables">{css}</ToolCode>
        <ToolButton variant="accent" icon="copy" className="plb-sheet-copy" onClick={onCopy}>Copy CSS</ToolButton>
      </div>
    </div>,
    document.body,
  )
}

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

const DEFAULT_SEED = '#4338E0'
const ROLES = ['PRIMARY', 'SECONDARY', 'ACCENT', 'SUBTLE', 'DEEP']
const PRO_MAX = 8   // free ceiling on TOTAL columns — free palettes can hold up to 8
const HARD_MAX = 10 // absolute ceiling so the board never becomes slivers
const IMG_MAX_MB = 4 // uploaded-image size cap for the free image picker

// Harmony options for the Colour System dropdown. `free` mirrors the studio's
// CSYS_HARMS split, plus the tonal Auto system which is always free.
const HARMONIES = [
  { id: 'auto', label: 'Auto', free: true, desc: 'Your colour, a near hue, light to dark.' },
  { id: 'monochromatic', label: 'Monochromatic', free: true, desc: 'One hue in lighter and darker shades.' },
  { id: 'analogous', label: 'Analogous', free: false, desc: 'Neighbouring hues, calm and cohesive.' },
  { id: 'complement', label: 'Complementary', free: false, desc: 'Opposite hues, for maximum contrast.' },
  { id: 'triadic', label: 'Triadic', free: false, desc: 'Three evenly spaced hues, balanced.' },
  { id: 'split', label: 'Split', free: false, desc: 'Your hue plus the two beside its opposite.' },
  { id: 'tetradic', label: 'Tetradic', free: false, desc: 'Four hues at 90°, rich variety.' },
  { id: 'custom', label: 'Custom', free: false, desc: 'Your hue, one 60° on, and its opposite.' },
]

// The colour systems a free user is allowed to run through the generator. Any
// other system (paid harmonies, a brand's 'custom' system) collapses to 'auto'
// the moment a free user edits from it — otherwise it becomes a backdoor into
// the paid harmony engine.
const FREE_SYSTEMS = ['auto', 'monochromatic']

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

// The design's slider tracks (D:2171-2174), shown until the live tracks
// (what each slider would do to THIS palette) have been computed.
const ADJUST_TRACKS = {
  h: 'linear-gradient(90deg,#3FAFA0,#4B7BFF,#A483C5)',
  s: 'linear-gradient(90deg,#4A4E57,#4B7BFF)',
  b: 'linear-gradient(90deg,#14224A,#7D9FFF,#FAFAF8)',
  temp: 'linear-gradient(90deg,#3FAFA0,#8E93A0,#E8845F)',
}

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
// Measure the full menu, including its border, even when it is scroll-capped.
function placeContextMenu(el, { x, y, triggerTop }) {
  const visibleRect = (selector) => {
    const node = document.querySelector(selector)
    if (!node || !node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') return null
    return node.getBoundingClientRect()
  }
  const margin = 8
  const top = Math.max(0, visibleRect('.pnav')?.bottom ?? 0) + margin
  const bottom = Math.min(window.innerHeight, visibleRect('.pnav-tabs')?.top ?? window.innerHeight) - margin
  const available = Math.max(0, bottom - top)
  const rect = el.getBoundingClientRect()
  const fullHeight = el.scrollHeight + rect.height - el.clientHeight
  const height = Math.min(fullHeight, available)
  const phone = window.innerWidth < 768
  // Retain the desktop coordinates unless the measured menu crosses a boundary.
  let left = phone ? x : Math.min(x, window.innerWidth - 220)
  let menuTop = phone ? y : Math.min(y, window.innerHeight - 330)
  const above = (triggerTop ?? y) - margin
  if ((phone || menuTop < top || menuTop + height > bottom) && above - top > bottom - y) {
    menuTop = above - height
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
  menuTop = Math.max(top, Math.min(menuTop, bottom - height))
  el.style.setProperty('--plb-mx', `${left}px`)
  el.style.setProperty('--plb-my', `${menuTop}px`)
  el.style.setProperty('--plb-menu-max-height', `${available}px`)
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
const IcoCheck = ({ size = 13 }) => (
  <Ico size={size}><path d="m20 6-11 11-5-5" /></Ico>
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
// An eye whose pupil is a dot in the hue that mode loses (a hollow ring for no
// colour, the text colour for normal). The outline follows currentColor. Each
// size has its own geometry so the strokes land on whole pixels. The mild mode's
// pupil is a bigger open ring in the hue with only its left half filled, so it
// cannot be read as the green-blind dot (solid, smaller) at 16px, and it keeps the
// full hue's contrast in light and dark (a faded dot would not). `open` is the
// ring's centre-line radius and `lip` its stroke width.
const VISION_EYE = {
  20: { d: 'M1.75 10C3.6 6.4 6.6 4.5 10 4.5s6.4 1.9 8.25 5.5C16.4 13.6 13.4 15.5 10 15.5S3.6 13.6 1.75 10Z', stroke: 1.5, c: 10, dot: 3.25, ring: 2.75, open: 3.45, lip: 1.25 },
  16: { d: 'M1.5 8C2.95 5.15 4.95 3.6 8 3.6s5.05 1.55 6.5 4.4C13.05 10.85 11.05 12.4 8 12.4S2.95 10.85 1.5 8Z', stroke: 1.25, c: 8, dot: 2.6, ring: 2.2, open: 2.7, lip: 1 },
}
const VisionIcon = ({ mode, size = 20, className }) => {
  const g = VISION_EYE[size]
  const hue = VISION_HUES[mode] || 'currentColor'
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" stroke="currentColor" strokeWidth={g.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path className="vis-eye" d={g.d} />
      {mode === 'achromatopsia' && <circle className="vis-ring" cx={g.c} cy={g.c} r={g.ring} />}
      {mode === 'deuteranomaly' && <>
        <circle className="vis-open" cx={g.c} cy={g.c} r={g.open} stroke={hue} strokeWidth={g.lip} />
        <path className="vis-dot" d={`M${g.c} ${g.c - g.open}A${g.open} ${g.open} 0 0 0 ${g.c} ${g.c + g.open}Z`} stroke="none" fill={hue} />
      </>}
      {mode !== 'achromatopsia' && mode !== 'deuteranomaly' && <circle className="vis-dot" cx={g.c} cy={g.c} r={g.dot} stroke="none" fill={hue} />}
    </svg>
  )
}

// The strip above the board while a colour-vision check is on: names the mode,
// says which half is which, and gives a way out. The icon and the text each have a
// phone form that CSS swaps in at 767px and below. It is not a live region: the
// page's sr-only message announces the change. If it goes while focus is inside
// it (Undo, the Reset shortcut), focus moves somewhere that stays.
//
// Where focus goes once the strip's button is gone: the Vision select if it is on
// the row, else the Extra tools button. Turn off uses this too.
const focusVisionFallback = () => {
  const bar = document.querySelector('[data-tool-toolbar]')
  const target = bar?.querySelector('[data-tl-item="vision"] .menu-select-trigger') || bar?.querySelector('.tl-more-btn')
  target?.focus({ preventScroll: true })
}
const VisionStrip = ({ mode, onTurnOff }) => {
  const ref = useRef(null)
  // A layout cleanup on unmount runs before React takes the node out, so focus is still readable.
  // The move waits a frame: the toolbar measures its row again in the same commit
  // (the mode name changed), and for a moment shows every item, so a target found now
  // can leave the row before paint. Focus that someone has already placed is left alone.
  useLayoutEffect(() => () => {
    if (!ref.current?.contains(document.activeElement)) return
    requestAnimationFrame(() => {
      const now = document.activeElement
      if (!now || now === document.body) focusVisionFallback()
    })
  }, [])
  const m = visionMode(mode)
  return (
    <div className="plb-vision" ref={ref}>
      <VisionIcon mode={mode} size={20} className="plb-vision-ico plb-vision-ico--lg" />
      <VisionIcon mode={mode} size={16} className="plb-vision-ico plb-vision-ico--sm" />
      <span className="plb-vision-text">
        <b className="plb-vision-name">
          <span className="plb-vision-long">{m.name}.</span>
          <span className="plb-vision-short">{m.short}.</span>
        </b>
        <span className="plb-vision-rest">
          <span className="plb-vision-long">Top half: your colour. Bottom half: how it looks.</span>
          <span className="plb-vision-short">Bottom half: how it looks.</span>
        </span>
      </span>
      <button type="button" className="tl-btn tl-btn--quiet plb-vision-off" aria-label="Turn off the colour vision check" onClick={onTurnOff}>Turn off</button>
    </div>
  )
}

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
        <span>Requested H {requested.h}° · C {requested.c} · T {requested.t}</span>
        <span>Achieved H {achieved.h}° · C {achieved.c} · T {achieved.t}</span>
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
  const { registerExport, clearExport } = useExport()
  const { isPro, planKnown } = useSubscription()
  const { openProModal } = useProModal()
  // The gallery popup's two library tabs. The bundle holds the free brands and
  // the free curated palettes in full and a name-only stub for every Pro brand;
  // a Pro account's full set comes from the server (src/utils/proLibrary.js),
  // fetched when the popup opens and not before. The palettes library carries
  // the brands too (kind 'brand', id `brand-*`, with the colour system), so one
  // fetch feeds both tabs.
  const [galleryOpen, setGalleryOpen] = useState(false)
  const proLib = useProLibrary('palettes', { enabled: galleryOpen })
  const proReady = proLib.status === 'ready'
  const proPending = proLib.active && !proReady
  const brandRows = useMemo(() => (proReady
    ? proLib.items
      .filter((row) => row.kind === 'brand')
      .map((row) => ({ id: row.id.replace(/^brand-/, ''), name: row.name, free: row.pro !== true, system: row.system, colors: row.colors }))
    : BRAND_ROWS
  ), [proReady, proLib.items])
  // The brands panel, split before it is rendered rather than styled after it.
  // A locked brand is a stub with no colours, so it never reaches barRef and
  // never enters the DOM — see utils/lockedPreview.js. `unlocked` is only
  // satisfied once the server's full set has arrived, so it fails closed while
  // the entitlement or the fetch is still resolving.
  const { open: openBrands, locked: lockedBrands, remaining: lockedBrandCount } = useMemo(() => (
    splitLockedLibrary(brandRows, {
      unlocked: proReady,
      isOpen: LIBRARY_RULES.brands.isOpen,
      preview: LIBRARY_RULES.brands.preview,
    })
  ), [brandRows, proReady])
  // The Community tab: the curated palettes. Free accounts get the free set
  // (the same ten the Palette Library opens) and a line saying there is more.
  const communityRows = useMemo(() => (proReady
    ? proLib.items.filter((row) => row.kind === 'curated')
    : splitLockedLibrary(LIBRARY_PALETTE_ROWS, {
      unlocked: false,
      isOpen: LIBRARY_RULES.palettes.isOpen,
      preview: LIBRARY_RULES.palettes.preview,
      limit: GALLERY_TIER_LIMITS.free,
      tease: 0,
    }).open.filter((row) => row.kind === 'curated')
  ), [proReady, proLib.items])
  const communityLocked = Math.max(0, LIBRARY_TOTALS.curatedPalettes - communityRows.length)
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
  // A stored or restored value this build does not know is treated as normal: no
  // split board, no strip. The raw value is kept as it came.
  const activeVision = VISION_MODES.some((m) => m.id === vision) ? vision : 'normal'
  const [showContrast, setShowContrast] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')

  // Toolbar popovers + board popovers (one open at a time, dismiss on
  // outside pointerdown or Escape — handled by the shared effect below).
  const [saveOpen, setSaveOpen] = useState(false)  // merged Save & share menu
  const [saveError, setSaveError] = useState('')   // the cap's refusal, held under the field — see doSave
  const [saveNameError, setSaveNameError] = useState('') // an empty name's refusal, held under the field
  const [saveNote, setSaveNote] = useState('') // a line under the name field (a save waiting for Save)
  const mountedRef = useRef(true)   // doSave waits on the sign-in popup; these say what became of the tool meanwhile
  const saveOpenRef = useRef(false)
  const [pendingSave, setPendingSave] = useState(null) // a save waiting for the account to reach ProjectContext (see doSave)

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
  // variation list is derived from, `panelApplied` what the user last applied from the Suggest panel.
  // Picking a variation preserves the base (via the skip guard) so reopening the
  // menu shows the same list with the active row ticked; any real edit to the
  // palette clears both so the list regenerates off the new colours.
  const [varBase, setVarBase] = useState(null)
  // The one thing on trial: { kind: 'variation' | 'explore', id, name, before, after, mine, compare }
  // while the board shows something applied from the Suggest or the Explore panel.
  // `compare` is what Your palette's Compare button lines up against the user's own.
  const [panelApplied, setPanelApplied] = useState(null)
  // ONE trial snapshot for both panels: the board as it was before the first apply
  // from either of them (colours, lens, seed, colour system, and its score). It is taken
  // on the first apply, cleared by pressing the applied row again or by any real
  // edit to the board, and KEPT when the user switches between Suggest and Explore
  // or between Explore's tabs, so going back always lands on the user's own palette.
  const trialSnapRef = useRef(null)
  const skipVarInvalidate = useRef(false)
  // One info panel per board: a column's tints or its colour values. They share
  // one slot, so opening either closes the other and every existing
  // `setTintsIdx(null)` close also closes the values panel.
  const [colPanel, setColPanel] = useState(null)    // { kind: 'tints' | 'values' | 'match', i }
  const tintsIdx = colPanel?.kind === 'tints' ? colPanel.i : null
  const valuesIdx = colPanel?.kind === 'values' ? colPanel.i : null
  const matchIdx = colPanel?.kind === 'match' ? colPanel.i : null
  const setTintsIdx = useCallback((next) => setColPanel((cur) => {
    const v = typeof next === 'function' ? next(cur?.kind === 'tints' ? cur.i : null) : next
    return v == null ? null : { kind: 'tints', i: v }
  }), [])
  const setValuesIdx = useCallback((i) => setColPanel(i == null ? null : { kind: 'values', i }), [])
  // The panel's index means "that column of this palette", so anything that
  // swaps the palette or changes how many columns there are closes it; a stale
  // index would point past the end and leave an open panel nobody can see.
  const colPanelRef = useRef(null)
  colPanelRef.current = colPanel
  useEffect(() => { setColPanel((cur) => (cur ? null : cur)) }, [colors.length])
  // Closing the panel hands focus back to the control that opened it: the
  // column's "..." button, or its tint strip. The panel's own close button
  // unmounts while it holds focus, which would otherwise drop focus to <body>.
  const panelOpenerRef = useRef('more')
  const panelReturnRef = useRef(null)
  const closeColPanel = useCallback(() => {
    const cur = colPanelRef.current
    if (cur) panelReturnRef.current = { i: cur.i, opener: panelOpenerRef.current }
    setColPanel(null)
  }, [])
  useLayoutEffect(() => {
    const back = panelReturnRef.current
    if (!back) return
    panelReturnRef.current = null
    columnRefs.current[back.i]?.querySelector(back.opener === 'ramp' ? '.plb-ramp' : '.plb-tool--more')?.focus({ preventScroll: true })
  })
  const [pickerIdx, setPickerIdx] = useState(null) // column with the HCT editor open
  const columnRefs = useRef([])
  const removeFocusRef = useRef(null)
  useLayoutEffect(() => {
    if (removeFocusRef.current == null) return
    columnRefs.current[removeFocusRef.current]?.querySelector('.plb-tool--key')?.focus({ preventScroll: true })
    removeFocusRef.current = null
  }, [colors.length])
  // A choice in a swatch's "…" menu unmounts the focused item with the menu, so
  // focus goes back to a swatch's "…" once the change has rendered: the swatch
  // the action was for, wherever it ended up (Swap and Insert left move it), or
  // for Remove the swatch that took its place. `ctxReturnRef` holds that
  // swatch's index until the next commit.
  const ctxReturnRef = useRef(null)
  useLayoutEffect(() => {
    const at = ctxReturnRef.current
    if (at == null) return
    ctxReturnRef.current = null
    columnRefs.current[at]?.querySelector('.plb-tool--more')?.focus({ preventScroll: true })
  })
  // Absolute coordinates remain relative to the size-contained column. Measure
  // in viewport space first so even the edge columns keep the whole panel visible.
  useLayoutEffect(() => {
    const column = columnRefs.current[pickerIdx ?? tintsIdx ?? valuesIdx ?? matchIdx]
    const panel = column?.querySelector(pickerIdx != null ? '.plb-picker' : '.plb-tintpop')
    if (!panel) return
    const place = (event) => {
      // Internal scrolling keeps the panel's height cap and scroll position.
      if (event?.type === 'scroll' && event.target instanceof Node && panel.contains(event.target)) return
      for (const name of ['--plb-pop-x', '--plb-pop-y', '--plb-pop-max-height']) panel.style.removeProperty(name)
      const margin = 8
      const visibleRect = (selector) => {
        const node = document.querySelector(selector)
        if (!node || !node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') return null
        return node.getBoundingClientRect()
      }
      const bounds = column.getBoundingClientRect()
      const tools = column.querySelector('.plb-col-tools').getBoundingClientRect()
      const ramp = column.querySelector('.plb-ramp').getBoundingClientRect()
      const trigger = pickerIdx != null || (ramp.width === 0 && ramp.height === 0) ? tools : ramp
      const top = Math.max(0, visibleRect('.pnav')?.bottom ?? 0) + margin
      const bottom = Math.min(window.innerHeight, visibleRect('.pnav-tabs')?.top ?? window.innerHeight) - margin
      const available = Math.max(0, bottom - top)
      panel.style.setProperty('--plb-pop-max-height', `${available}px`)
      const rect = panel.getBoundingClientRect()
      const anchorLeft = window.innerWidth < 768 ? bounds.left + 12 : tools.right - rect.width
      const left = Math.max(margin, Math.min(anchorLeft, window.innerWidth - rect.width - margin))
      const y = Math.max(top, Math.min(trigger.bottom + margin, bottom - rect.height))
      panel.style.setProperty('--plb-pop-x', `${left - bounds.left}px`)
      panel.style.setProperty('--plb-pop-y', `${y - bounds.top}px`)
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(panel)
    observer.observe(column)
    observer.observe(column.querySelector('.plb-col-tools'))
    for (const node of document.querySelectorAll('.pnav, .pnav-tabs')) observer.observe(node)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [pickerIdx, tintsIdx, valuesIdx, matchIdx, colors.length])
  const [ctxMenu, setCtxMenu] = useState(null)     // { kind: 'swatch' | 'gap', i, x, y } right-click menu
  const ctxMenuRef = useRef(null)
  const ctxTriggerRef = useRef(null)
  const moreHiddenAtPressRef = useRef(false) // a non-mouse press landed while the More button was still faded out
  useLayoutEffect(() => {
    const el = ctxMenuRef.current
    if (!ctxMenu || !el) return
    const updateScrollCue = () => {
      el.dataset.scrollMore = String(el.scrollHeight - el.clientHeight - el.scrollTop > 1)
    }
    const place = () => { placeContextMenu(el, ctxMenu); updateScrollCue() }
    el.scrollTop = 0
    place()
    if (ctxMenu.keyboard) el.querySelector('button[role="menuitem"]')?.focus({ preventScroll: true })
    el.addEventListener('scroll', updateScrollCue)
    const observer = new ResizeObserver(place)
    observer.observe(el)
    for (const node of document.querySelectorAll('.pnav, .pnav-tabs')) observer.observe(node)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', updateScrollCue)
      window.removeEventListener('resize', place)
    }
  }, [ctxMenu])
  const [swapIdx, setSwapIdx] = useState(null)     // column with the swap-direction popover open
  const [toolsIdx, setToolsIdx] = useState(null)   // column whose quick tools a tap has opened (touch)
  const phone = usePhone()
  const [cssSheetOpen, setCssSheetOpen] = useState(false) // Palette CSS bottom sheet (phone)
  // The sheet belongs to the phone layout. Leaving it (rotating wider) closes
  // it, so rotating back does not bring it up unasked.
  useEffect(() => { if (!phone) setCssSheetOpen(false) }, [phone])
  // Stable, because useModalDialog re-focuses the dialog whenever onClose changes.
  const closeCssSheet = useCallback(() => setCssSheetOpen(false), [])
  const [preview, setPreview] = useState(null)     // { mode, scene, compare } dialog
  // The last preview viewed this visit: closing and reopening returns to it. Not saved, so a reload starts on the default.
  const [lastScene, setLastScene] = useState(DEFAULT_SCENE)
  const [saveName, setSaveName] = useState('')
  // The save runs here, not in doSave: right after the sign-in resolves, doSave's
  // closure still holds the signed-out `saveProject`, which throws "Sign in to
  // save projects". This effect re-runs with the fresh one once the account has
  // reached ProjectContext.
  useEffect(() => {
    if (pendingSave == null || !canSaveProjects) return
    setPendingSave(null)
    // The save is being attempted, so a remount has nothing left to reopen.
    clearPendingSave()
    try {
      saveProject(pendingSave)
      setSaveName(''); setSaveError(''); setSaveNameError(''); setSaveNote(''); setSaveOpen(false)
      toast?.('Project saved')
    } catch (err) {
      // The cap's refusal went out as the SUCCESS toast — green tick, 1.8
      // seconds, "go Pro" with nothing to press (#436, flow 2). It stays under
      // the field it refused, in ProjectContext's words, with the way forward
      // as a link — the treatment /projects already gives the same refusal.
      setSaveError(err?.message || 'Couldn’t save')
    }
  }, [pendingSave, canSaveProjects, saveProject, toast])
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => { saveOpenRef.current = saveOpen }, [saveOpen])
  // Back from onboarding after signing up to save: reopen the menu with the name
  // typed before, and let the person press Save. Decided once per mount, when
  // the account is first known.
  const restoreCheckedRef = useRef(false)
  useEffect(() => {
    if (authLoading || restoreCheckedRef.current) return
    restoreCheckedRef.current = true
    if (!user) return
    const stashed = takePendingSave('palette')
    if (stashed == null) return
    setSaveName(stashed)
    setSaveNote('You’re signed in. Press Save to finish.')
    setSaveOpen(true)
  }, [authLoading, user])
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
  // The two floating panels share one slot. Suggest is 'variations' and has no
  // tabs. Explore has two, 'community' (Palettes) and 'brands'. A pick applies
  // straight onto the board.
  const [galleryTab, setGalleryTab] = useState('community') // community | variations | brands
  // The panel is placed by CSS alone (a flex sibling of the board, a bottom dock,
  // or a sheet), so nothing positions it from script.
  const galleryRef = useRef(null)
  // Focus goes to the selected tab (or Close) when a panel opens, and back to the
  // button that opened it, or Extra tools, when it closes with focus nowhere.
  const galleryOpenerRef = useRef({ el: null, pointer: false })
  const wasGalleryOpen = useRef(false)
  const exploring = galleryTab !== 'variations'
  // The search field's text (cleared when the panel or its tab changes), and the
  // phone sheet's height: Peek or Full. Suggest and Brands open at Peek, Explore's
  // Palettes at Full, because browsing needs height. At 1024 and up the panel docks
  // beside the board as a complementary region; below that it is a non-modal dialog.
  const [exQuery, setExQuery] = useState('')
  const [sheetFull, setSheetFull] = useState(false)
  const wideDock = useWideDock()
  useEffect(() => { setExQuery(''); setSheetFull(galleryTab === 'community') }, [galleryOpen, galleryTab])
  // Below 1024 the panel is a dock that sits directly on top of the adjust bar and
  // never below it, so the bar's distance from the viewport bottom is measured.
  // A phone sheet covers the bar and ignores it (bottom: 0 in the CSS).
  useLayoutEffect(() => {
    const wrap = galleryRef.current
    if (!galleryOpen || !wrap) return undefined
    const bar = document.querySelector('.plb .plb-adjust')
    const place = () => {
      const top = bar ? bar.getBoundingClientRect().top : window.innerHeight
      wrap.style.setProperty('--plb-dock-b', `${Math.max(0, Math.round(window.innerHeight - top))}px`)
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true })
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place) }
  }, [galleryOpen, wideDock])
  useEffect(() => {
    if (galleryOpen) { wasGalleryOpen.current = true; return }
    if (!wasGalleryOpen.current) return
    wasGalleryOpen.current = false
    if (document.activeElement && document.activeElement !== document.body) return
    if (document.querySelector('[aria-modal="true"]')) return
    const { el, pointer } = galleryOpenerRef.current
    returnMenuFocus(el?.isConnected ? el : document.querySelector('.tl-toolbar .tl-more-btn'), pointer)
  }, [galleryOpen])
  // Which community palette is currently "imported" (ticked). Clicking that same
  // card again reverts to the pre-import system; any edit clears the tick because
  // the palette is now an edited derivative, not the untouched import.
  const [importedGalleryId, setImportedGalleryId] = useState(null)
  const importedSigRef = useRef(null) // baseline signature of the imported board
  // Palette history: rolling localStorage log (see HISTORY_KEY above).
  const [histOpen, setHistOpen] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const resetSnapshotRef = useRef(null)
  const fileRef = useRef(null)
  const swapTriggerRef = useRef(null) // the open column's Swap button, where focus returns when its menu closes
  const swapPointerRef = useRef(false)

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

  // Per-column derivations that are NOT the swatch itself. The strip was six
  // CAM16 solves per colour (60 on a full 10-colour board, three times the cost
  // of the whole adjust lens) redone on every frame of every slider drag; it is
  // cheaper now but still per colour per frame, so it stays deferred. That hands
  // React permission to drop the mini-ramps to a lower priority while the user
  // is scrubbing: the swatch colour and hex readout still track the slider
  // frame for frame, and the ramps catch up the moment the drag settles.
  const deferredAdjusted = useDeferredValue(adjusted)
  const columnMeta = useMemo(
    () => deferredAdjusted.map(c => ({ ramp: swatchStripHexes(c), contrast: contrastPair(c) })),
    [deferredAdjusted],
  )
  // The column TITLE names the colour in the slot, so it is keyed on the
  // DISPLAYED palette and NOT on the deferred one: a title that lags the hex
  // beside it by a frame is the same "this label describes the colour that was
  // here a moment ago" fault the fixed role labels had, just briefer. It costs
  // one CAM16 solve per colour, against the strip's OKLCH ramp above, so
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
  const variations = useMemo(() => (varBase ? paletteVariations(varBase) : []), [varBase])
  // Free is the three best-scoring variations, wherever they sit in their groups.
  const freeVarIds = useMemo(() => freeVariationIds(variations), [variations])
  const variationGroups = useMemo(() => variations.reduce((out, v) => {
    const last = out[out.length - 1]
    if (last && last.label === v.group) last.items.push(v)
    else out.push({ label: v.group, items: [v] })
    return out
  }, []), [variations])
  // Focus moves into the panel on open. These read `variations`, so they sit below
  // that memo: a const read before its declaration throws.
  const hasRows = exploring || variations.length > 0
  useEffect(() => {
    if (!galleryOpen) return
    const wrap = galleryRef.current
    const target = wrap?.querySelector('[role="tab"][aria-selected="true"]') || wrap?.querySelector('button.plb-sw-row') || wrap?.querySelector('.plb-pop-x')
    target?.focus({ preventScroll: true })
  }, [galleryOpen, exploring, hasRows])
  // On a phone, applying a row (a variation, a palette or a brand) drops the sheet
  // from Full to Peek so the board shows the change, then brings the applied row
  // into view. The scroll waits for the Peek layout: at Peek most of the sheet is
  // below the screen and the list's bottom padding makes up for it, so scrolling
  // before the snap changes would measure against the Full layout.
  const scrollAppliedRef = useRef(false)
  useEffect(() => {
    if (!panelApplied || !galleryOpen || wideDock) return
    scrollAppliedRef.current = true
    setSheetFull(false)
  // Keyed on the apply alone: reopening a panel with a row already applied must
  // keep that panel's own opening height (Explore Palettes opens at Full).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelApplied])
  useEffect(() => {
    if (!scrollAppliedRef.current || sheetFull) return
    scrollAppliedRef.current = false
    galleryRef.current?.querySelector('.plb-sw-row[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [panelApplied, sheetFull])

  // Any genuine change to the palette (manual edit, randomise, harmony change,
  // brand pick) invalidates the frozen variation snapshot so the list rebuilds.
  // Picking a variation sets the skip guard first, so applying one does NOT
  // rotate the list — the active row just gets ticked.
  useEffect(() => {
    if (skipVarInvalidate.current) { skipVarInvalidate.current = false; return }
    setVarBase(null)
    setPanelApplied(null)
    trialSnapRef.current = null
  }, [colors, adjust])

  // Freeze a snapshot the first time the variations tab is viewed (or after
  // invalidation). The variations grid now lives inside the combined Gallery
  // popup, so the snapshot freezes when that popup is open on the variations tab.
  // While a variation is applied, the board is not the user's own: the list is
  // derived from the Suggest snapshot ("mine"), so it stays the variations of
  // the user's palette, not of the variation on the board.
  useEffect(() => {
    if (galleryOpen && galleryTab === 'variations' && !varBase) {
      setVarBase(trialSnapRef.current?.mine || applyAdjust(colors, adjust))
    }
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
  // Export the adjusted board without persisting an untouched random draw.
  useEffect(() => {
    registerExport({
      path: '/create/palette',
      design: { ...design, palette: {
        ...design.palette, ...persistedPalette(colors, adjust),
        base: seed, harmony, extraColors: adjusted.slice(ROLES.length),
        locked: [...locked], activeIdx: 0,
      } },
    })
    return clearExport
  }, [design, colors, adjust, seed, harmony, adjusted, locked, registerExport, clearExport])
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
    setColPanel(null)
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
    setColPanel(null)
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
  const anyPopover = saveOpen || imgOpen
    || galleryOpen || histOpen
    || tintsIdx != null || valuesIdx != null || matchIdx != null || pickerIdx != null || ctxMenu != null || preview != null

  // Both of this page's dialogs declared aria-modal="true" and trapped nothing:
  // Tab walked out into the builder behind them, the canvas scrolled, and
  // closing dropped focus to the top of the document. The setState setters are
  // stable, so these close handlers are stable too and the effect does not
  // re-run on every render of a very large component.
  const closePreview = useCallback(() => setPreview(null), [])
  const closeSubmit = useCallback(() => setSubmitOpen(false), [])
  const closeImageDialog = useCallback(() => setImgOpen(false), [])
  const imageDialogRef = useModalDialog(closeImageDialog, { enabled: imgOpen })
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
    setSaveOpen(false); setSaveError(''); setSaveNameError(''); setSaveNote(''); setImgOpen(false); setGalleryOpen(false); setHistOpen(false)
    // A closed menu has no save waiting on the account and nothing to reopen on a remount.
    setPendingSave(null); clearPendingSave()
  }, [])
  // A row in the Save or share menu closing it: the refusal under the field goes too.
  const closeSaveMenu = useCallback(() => {
    setSaveOpen(false); setSaveError(''); setSaveNameError(''); setSaveNote('')
    setPendingSave(null); clearPendingSave()
  }, [])

  // The rail-fit measurement that lived here is gone: the shared ToolToolbar
  // (components/tool/ToolLayout.jsx) measures its own row and moves what does
  // not fit into the Extra tools overflow.
  // The swap-direction popover is dismissed by a press outside it or Escape.
  useEffect(() => {
    if (swapIdx == null) return
    const onDown = (e) => { if (!e.target.closest('.plb-swappop, .plb-tool--swap')) setSwapIdx(null) }
    // The focused menu item unmounts with the menu, so focus goes back to the
    // Swap button first.
    const onEsc = (e) => { if (e.key === 'Escape') { returnMenuFocus(swapTriggerRef.current, swapPointerRef.current); setSwapIdx(null) } }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [swapIdx])

  useEffect(() => {
    if (!anyPopover && toolsIdx == null) return
    const closePops = () => { setTintsIdx(null); setPickerIdx(null); setCtxMenu(null); setToolsIdx(null) }
    const onDown = (e) => {
      // The image dialog is a modal of its own (it closes on its scrim), so a
      // drag inside it is not an outside press. Nor is a press in the sign-in
      // dialog a gallery like opened: the gallery stays put behind it. The Pro
      // modal is the same, and the docked panel (wide screens) closes only by
      // its Close button, Escape or its toolbar button, never by an outside press.
      const dockedHeld = wideDock && galleryOpen && !saveOpen && !imgOpen && !histOpen
      if (!dockedHeld && !e.target.closest('.plb-menuwrap, .plb-modal, .ui-modal-overlay, [aria-labelledby="ui-login-title"]')) closeAllMenus()
      if (!e.target.closest('.plb-pop') && (anyPopover || e.target.closest('.plb-col') !== columnRefs.current[toolsIdx])) {
        // An open panel that held focus hands it back to its opener, unless the
        // press landed on something that takes focus itself. The press's own
        // focus change comes after this handler, so the hand-back waits a tick.
        const cp = colPanelRef.current
        const heldFocus = cp && document.activeElement?.closest('.plb-tintpop')
        const opener = panelOpenerRef.current
        closePops()
        const takesFocus = 'a, button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [role="button"], [role="menuitem"]'
        if (heldFocus && !e.target.closest(takesFocus)) {
          setTimeout(() => {
            // Page furniture (the body, a scroll region) took the press's focus;
            // a real control the person moved to keeps it.
            if (document.activeElement?.matches(takesFocus)) return
            columnRefs.current[cp.i]?.querySelector(opener === 'ramp' ? '.plb-ramp' : '.plb-tool--more')?.focus({ preventScroll: true })
          }, 0)
        }
      }
    }
    const onEsc = (e) => {
      if (e.key !== 'Escape') return
      if (ctxMenuRef.current?.getAttribute('aria-label') === 'Colour actions') returnMenuFocus(ctxTriggerRef.current, !ctxMenu?.keyboard)
      const cp = colPanelRef.current
      if (cp && !ctxMenu) panelReturnRef.current = { i: cp.i, opener: panelOpenerRef.current }
      closeAllMenus(); closePops(); setPreview(null)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [anyPopover, toolsIdx, closeAllMenus, ctxMenu, setTintsIdx, wideDock, galleryOpen, saveOpen, imgOpen, histOpen])

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

  // Close the "…" menu after a choice and hand focus to the "…" of swatch `at`.
  const closeCtxMenu = (at) => { ctxReturnRef.current = at; setCtxMenu(null) }

  // Opening a column's tints or colour values from the "..." menu: the menu
  // closes without sending focus back to "..." (closeCtxMenu would), and focus
  // goes into the panel instead, with the panel named for a screen reader. This
  // runs after the layout effects above, so nothing takes focus back from it.
  const openColPanel = (kind, i) => {
    panelOpenerRef.current = 'more'
    setCtxMenu(null)
    if (kind === 'tints') setTintsIdx(i); else if (kind === 'match') setColPanel({ kind: 'match', i }); else setValuesIdx(i)
  }
  useEffect(() => {
    if (!colPanel) return
    const panel = columnRefs.current[colPanel.i]?.querySelector('.plb-tintpop')
    panel?.querySelector('.plb-pop-x')?.focus({ preventScroll: true })
    const hex = String(adjusted[colPanel.i] || '').toUpperCase()
    setLiveMsg(colPanel.kind === 'values' ? `Colour values for ${hex}` : colPanel.kind === 'match' ? `Nearest named colours for ${hex}` : `Tints of ${hex}`)
  // Only a newly opened panel moves focus; the colours behind an open one can
  // change without it grabbing focus again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colPanel])

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

  const removeCol = (i, event) => {
    if (colors.length <= 2) { toast?.('A palette needs at least two colours'); return }
    if (outIdx != null) return // let the current close animation finish first
    const keyboard = event?.detail === 0
    const fromMenu = event?.currentTarget?.closest?.('.plb-ctx') != null
    if (!keyboard && !fromMenu) document.activeElement?.blur()
    setTintsIdx(null); setPickerIdx(null); setCtxMenu(null); setSwapIdx(null); setToolsIdx(null)
    const drop = () => {
      // The next swatch slides into this slot; the last one hands back to the one before.
      if (fromMenu) ctxReturnRef.current = Math.min(i, colors.length - 2)
      else if (keyboard) removeFocusRef.current = Math.min(i, colors.length - 2)
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
    if (colors.length >= HARD_MAX) { toast?.(`Palettes max out at ${HARD_MAX} colours`); return false }
    if (!isPro && colors.length >= PRO_MAX) {
      openProModal({ gate: 'palette-colour-cap', eyebrow: 'Pro palettes', title: `Go beyond ${PRO_MAX} colours`, subtitle: `Free palettes hold up to ${PRO_MAX} colours. Pro palettes grow to ${HARD_MAX} so you can build full multi-role systems.` })
      return false
    }
    setColors(prev => { const n = [...prev]; n.splice(idx, 0, hex); return n })
    setLocked(prev => {
      const next = new Set()
      prev.forEach(k => next.add(k >= idx ? k + 1 : k))
      return next
    })
    flashIn(idx)
    setLiveMsg('Colour added')
    return true
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
    closeCtxMenu(i)
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
  // Returns true once the apply has gone through, false when fewer than two valid
  // colours remain and nothing changed, so a caller can skip its own bookkeeping
  // for an apply that never happened.
  // `quiet` keeps the screen-reader announcement but skips the toast: inside
  // the Suggest panel the applied card's tick already shows it, and on a phone
  // the toast would sit over the sheet's cards.
  const applyPalette = (hexes, msg, { quiet = false } = {}) => {
    setColPanel(null)
    const next = hexes.map(c => normaliseHex(c)).filter(Boolean).slice(0, HARD_MAX)
    if (next.length < 2) return false
    setColors(prev => {
      const out = next.length >= prev.length ? next : [...next, ...prev.slice(next.length)]
      return out.map((c, i) => (locked.has(i) && prev[i] ? prev[i] : c))
    })
    setAdjust(ZERO_ADJUST)
    if (!locked.has(0)) { setSeed(next[0]); setSeedInput(next[0]) }
    if (msg) { setLiveMsg(msg); if (!quiet) toast?.(msg) }
    return true
  }

  const resetPalette = () => {
    setColPanel(null)
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
      preImport: trialSnapRef.current,
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
    trialSnapRef.current = null
    importedSigRef.current = null
    setTintsIdx(null)
    setPickerIdx(null)
    setCtxMenu(null)
    setPreview(null)
    setVarBase(null)
    setPanelApplied(null)
    trialSnapRef.current = null
    closeAllMenus()
    setLiveMsg('Settings reset to the default system, with a new random palette')
    toast?.('Palette reset · Undo is available')
  }


  // ── Redo (the drawn tray has both). Undo pushes the board it leaves onto
  // this stack; redo restores it. Any other change to the board empties it.
  const redoRef = useRef([])
  const restoringRef = useRef(null)
  const [redoTick, setRedoTick] = useState(0)
  const boardNow = () => ({
    colors: [...colors], seed, seedInput, harmony, locked: [...locked], adjust: { ...adjust },
    vision, showContrast, importedGalleryId, at: Date.now(),
  })
  const applySnapshot = (h) => {
    setColPanel(null)
    const restored = h.colors.slice(0, HARD_MAX)
    setColors(restored)
    setSeed(h.seed || restored[0])
    setSeedInput(h.seedInput || h.seed || restored[0])
    setHarmony(h.harmony || DEFAULT_SYSTEM)
    setLocked(new Set(h.locked || []))
    setAdjust({ ...(h.adjust || ZERO_ADJUST) })
    setVision(h.vision || 'normal')
    setShowContrast(Boolean(h.showContrast))
    setImportedGalleryId(h.importedGalleryId || null)
  }
  const currentSig = paletteSignature(boardNow())
  useEffect(() => {
    // A change that is not the restore itself ends the redo line.
    if (restoringRef.current && restoringRef.current === currentSig) { restoringRef.current = null; return }
    if (redoRef.current.length) { redoRef.current = []; setRedoTick((t) => t + 1) }
  }, [currentSig])
  const redoPalette = () => {
    const next = redoRef.current.pop()
    if (!next) return
    restoringRef.current = paletteSignature(next)
    applySnapshot(next)
    setRedoTick((t) => t + 1)
    setLiveMsg('Palette change redone')
  }
  const canRedo = redoTick >= 0 && redoRef.current.length > 0
  const undoPalette = () => {
    setColPanel(null)
    const leaving = boardNow()
    redoRef.current.push(leaving)
    setRedoTick((t) => t + 1)
    const markRestore = (target) => { restoringRef.current = paletteSignature(target) }
    const resetSnapshot = resetSnapshotRef.current
    if (resetSnapshot) {
      const current = {
        colors, seed, seedInput, harmony, locked: [...locked], adjust, vision,
        showContrast, importedGalleryId,
      }
      const editedAfterReset = paletteSignature(current) !== paletteSignature(resetSnapshot.baseline)
      const target = editedAfterReset ? resetSnapshot.baseline : resetSnapshot.before
      markRestore(target)
      setColors(target.colors)
      setSeed(target.seed || target.colors[0])
      setSeedInput(target.seedInput || target.seed || target.colors[0])
      setHarmony(target.harmony || DEFAULT_SYSTEM)
      setLocked(new Set(target.locked || []))
      setAdjust({ ...(target.adjust || ZERO_ADJUST) })
      setVision(target.vision || 'normal')
      setShowContrast(Boolean(target.showContrast))
      setImportedGalleryId(target.importedGalleryId || null)
      trialSnapRef.current = target.preImport || null
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
    if (!entry) { redoRef.current.pop(); setRedoTick((t) => t + 1); return }
    markRestore(entry)
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

  const openVariationGate = () => openProModal({ gate: 'palette-variation-apply', eyebrow: 'Pro colour tools', title: 'Every variation, unlocked', subtitle: 'Free covers the first set of generated variations; Pro unlocks the full range of alternates for any palette.' })
  // The board as it was before the first apply from EITHER panel. Moving from
  // one row to another (in Suggest, in Explore, or across them) never replaces it,
  // so going back always lands on the user's own palette. This only reads the
  // stored one (or builds the candidate); `keepPanelSnap` stores it once an apply
  // has gone through, so an apply that is refused never leaves a snapshot behind.
  const panelSnap = () => trialSnapRef.current
    || { colors: [...colors], adjust: { ...adjust }, seed, seedInput, harmony, before: paletteScore, mine: adjusted }
  const keepPanelSnap = (snap) => { trialSnapRef.current = snap }
  // True when applying `hexes` would leave the board exactly as it is.
  const isNoopApply = (hexes) => hexes.map(c => normaliseHex(c)).filter(Boolean).join(',') === colors.join(',') && !ADJUST_FIELDS.some(f => adjust[f.key] !== 0)
  const pickVariation = (v, gated) => {
    if (gated) { openVariationGate(); return }
    // The applied card is a toggle: pressing it again puts the user's palette back.
    if (panelApplied?.kind === 'variation' && panelApplied.id === v.id) { revertTrial(); return }
    if (isNoopApply(v.colors)) return
    const snap = panelSnap()
    if (!applyPalette(v.colors, `Applied variation: ${v.label}`, { quiet: true })) return
    keepPanelSnap(snap)
    // Keep the frozen list across this apply, so the panel shows the same
    // variations with this one ticked instead of rotating to a fresh set. The
    // flag swallows the next invalidation, so it is set only once the apply is
    // certain; after a refused apply it would sit armed and swallow the user's
    // next real edit.
    skipVarInvalidate.current = true
    // A variation takes over from an Explore row as the one thing on trial. The
    // snapshot stays, so going back still lands on the user's own palette.
    importedSigRef.current = null
    setImportedGalleryId(null)
    setPanelApplied({ kind: 'variation', id: v.id, name: v.label, before: snap.before, after: v.score, mine: snap.mine, compare: v })
    setLiveMsg(`${v.label} applied. Press it again to go back.`)
  }
  // Put the board back as the first apply found it: colours, lens, seed and
  // colour system. Pressing the applied row again, in either panel, comes here.
  // Nothing disables, so focus stays on the row that was pressed.
  const revertTrial = () => {
    const snap = trialSnapRef.current
    if (!snap) return
    setColPanel(null)
    skipVarInvalidate.current = true
    setColors(snap.colors)
    setAdjust({ ...snap.adjust })
    setSeed(snap.seed)
    setSeedInput(snap.seedInput)
    // A brand changes the colour system as well, so the snapshot carries it.
    if (snap.harmony) setHarmony(snap.harmony)
    trialSnapRef.current = null
    importedSigRef.current = null
    setImportedGalleryId(null)
    setPanelApplied(null)
    setLiveMsg('Your palette is back.')
  }
  // Import a community-gallery palette as a toggle. The FIRST import snapshots
  // the user's own pre-gallery system; applying it ticks the card. Clicking the
  // SAME (ticked) card — or switching to a different card and toggling it —
  // reverts to that original snapshot, never to an intermediate gallery pick.
  // Any edit afterwards clears the tick (see the edit-detection effect) because
  // the board is now a derivative. Enabling a palette applies it directly — no
  // info popup — so the whole gallery swatch reads as a one-click select.
  // A brand from the Brands tab goes through here too (`system` is the colour
  // system it carries): the same snapshot, tick and revert, with the system
  // restored along with the colours.
  const importGalleryPalette = (cols, name, id, system = null) => {
    setColPanel(null)
    if (importedGalleryId === id && trialSnapRef.current) { revertTrial(); return }
    // The snapshot is only ever the user's own palette: the one in place before
    // the first apply from either panel. Switching row A -> B, or Suggest ->
    // Explore, must NOT replace it, so going back lands on the user's work and not
    // on the previous trial. When a variation is on the board the stored snapshot
    // is what's used, not the live board.
    const snap = panelSnap()
    // A refused apply (fewer than two valid colours) changes nothing, and must
    // not leave a snapshot or a changed system behind.
    if (!applyPalette(cols, `Loaded ${name}`, { quiet: true })) return
    if (system) setHarmony(system)
    keepPanelSnap(snap)
    // The Suggest list stays frozen on the user's own palette (the snapshot's), so
    // the next look at Suggest still offers variations of THEIR colours.
    skipVarInvalidate.current = true
    importedSigRef.current = null // let the effect record the imported baseline
    setImportedGalleryId(id)
    setPanelApplied({
      kind: 'explore',
      id,
      name,
      before: snap.before,
      mine: snap.mine,
      compare: { label: name, colors: cols.map(c => normaliseHex(c)).filter(Boolean), score: scorePalette(cols) },
    })
    setLiveMsg(`${name} loaded. Press it again to go back.`)
    // Keep the panel open so picking rows reads as a live toggle: the user can
    // compare picks, and press the applied one again to go back, without reopening it.
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
      trialSnapRef.current = null
      setPanelApplied(null)
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
    // A brand is an Explore import: the card toggles, and its own id (prefixed,
    // so it can never match a community palette's) is what gets ticked.
    importGalleryPalette(b.colors, `the ${b.name} palette`, brandTickId(b), resolveSystem(b.system || 'custom'))
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

  // The Contrast Checker reads the project's palette, and the pair to open on
  // travels in the address (utils/contrastHandoff) so a reload keeps it. The
  // board is written first so an edit still inside the 200ms save delay above
  // goes with it. With no column it opens on the palette's reading pair; with
  // one, on that colour paired by what it is most often used for.
  const openInContrast = (column = null) => {
    closeAllMenus()
    setPalette({
      ...persistedPalette(colors, adjust),
      base: seed,
      harmony,
      extraColors: adjusted.slice(ROLES.length),
      locked: [...locked],
      activeIdx: 0,
    })
    const pair = column == null ? readingPair(adjusted) : columnPair(adjusted, column)
    setLiveMsg(column == null
      ? 'Opening your palette in the Contrast Checker'
      : `Checking ${roleLabel(harmony, column).toLowerCase()} in the Contrast Checker`)
    navigate(handoffUrl(pair))
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
        a.download = fileName(design?.name, 'palette', 'png')
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      })
      closeSaveMenu()
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
    closeSaveMenu()
    setSubmitErr('')
    setSubmitName(n => n.trim() || randomPaletteName(adjusted))
    setSubmitOpen(true)
  }, [adjusted, closeSaveMenu])

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
    } catch (err) {
      // Never claim it reached the queue when it did not. The local copy is
      // kept, so nothing the user made is lost. A refusal by the post limits
      // gets its own words, because trying again at once cannot work.
      toast?.(isPostLimit(err)
        ? `${err.message} Your palette is saved in this browser.`
        : 'Saved locally — we could not reach the review queue. Try again later.')
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
    // The Save button is never disabled, so a signed-out visitor pressing it
    // with an empty name must meet the gate, not a refusal about the name: the
    // account is asked for first, and an empty name then says so under the
    // field.
    if (!canSaveProjects) {
      // A new account is sent to onboarding, which unmounts this page; the stash
      // lets the page reopen the menu with the name when it comes back.
      stashPendingSave('palette', saveName.trim())
      const signedIn = await requireLogin('save this palette', { free: true, signup: true })
      // Unmounted: a new account was sent to onboarding. The stash stays for the
      // remount to find. It is cleared only once the save has run, or when the
      // sign-in is cancelled or the menu closed (closeAllMenus, closeSaveMenu).
      if (!mountedRef.current) return
      if (!signedIn) { clearPendingSave(); setPendingSave(null); return }
      // Closed while the sign-in was open: nothing to finish.
      if (!saveOpenRef.current) { clearPendingSave(); return }
    }
    const name = saveName.trim()
    // Refused here with the page still open: nothing is waiting to be reopened.
    if (!name) { clearPendingSave(); setSaveNameError('Name the project to save it.'); return }
    setPendingSave(name)
  }

  const adjustDirty = ADJUST_FIELDS.some(f => adjust[f.key] !== 0)
  const canUndo = resetSnapshotRef.current != null || history.some((h) => paletteSignature(h) !== currentSig)
    || history.some((entry) => paletteSignature(entry) !== paletteSignature({
      colors, seed, harmony, locked: [...locked], adjust, vision, showContrast, importedGalleryId,
    }))

  const openGallery = (tab, anchor = null, pointer = false) => {
    galleryOpenerRef.current = { el: anchor, pointer }
    closeAllMenus(); setGalleryTab(tab); setGalleryOpen(true)
  }
  const toggleMenu = (isOpen, set) => { const n = !isOpen; closeAllMenus(); set(n) }

  // Each system carries its wheel (the rich row) and a 16px one for the toolbar trigger.
  // `note` is a quiet word beside the name in the menu row only; the trigger stays "Auto".
  const systemOptions = HARMONIES.map(h => ({
    value: h.id, label: h.label, desc: h.desc, mark: h.free || isPro ? '' : 'Pro', note: h.id === 'auto' ? 'recommended' : '',
    icon: <HarmonyWheel system={h.id} size={20} />, triggerIcon: <HarmonyWheel system={h.id} size={16} />,
  }))
  // `desc` is the one-line hint under each name; the divider sets Normal apart
  // from the modes, and `short` / `triggerIcon` are what the toolbar trigger shows.
  const visionOptions = VISION_MODES.map((m, i) => ({
    value: m.id, label: m.name, desc: m.hint, short: m.short, divider: i === 1,
    icon: <VisionIcon mode={m.id} size={20} />, triggerIcon: <VisionIcon mode={m.id} size={16} />,
  }))
  // The mode the live region last said. A mode that comes back some other way
  // (Undo, Redo, a restore from history) is announced by the effect below, after
  // that action's own message.
  const announcedVisionRef = useRef('normal')
  const changeVision = (id) => { announcedVisionRef.current = id; setVision(id); setLiveMsg(visionAnnouncement(id)) }
  useEffect(() => {
    if (announcedVisionRef.current === activeVision) return
    announcedVisionRef.current = activeVision
    const said = visionAnnouncement(activeVision)
    setLiveMsg((prev) => (prev ? `${prev} ${said}` : said))
  }, [activeVision])
  // The strip's button goes with the mode, so focus moves off it first.
  const turnOffVision = () => {
    focusVisionFallback()
    changeVision('normal')
  }
  // From the Extra tools overflow a choice also closes the panel, so that a Pro
  // wall raised by the choice is not opened underneath it.
  const systemSelect = (className, closePanel) => (
    <ToolSelect
      className={className}
      label="System"
      ariaLabel="Colour system"
      value={harmony}
      options={systemOptions}
      onChange={(id) => { const h = HARMONIES.find(x => x.id === id); closePanel?.(); if (h) pickHarmony(h) }}
    />
  )
  const visionSelect = (className, closePanel) => (
    <ToolSelect
      className={className}
      label="Vision"
      ariaLabel="Colour vision check"
      value={activeVision}
      options={visionOptions}
      footnote={VISION_NOTE}
      onChange={(v) => { closePanel?.(); changeVision(v) }}
    />
  )
  const seedChip = (
    <span className="plb-seedpick">
      <ColorPickerPop
        value={shownSeed}
        onChange={(hex) => setFromSeedInput(hex.toUpperCase())}
        ariaLabel="Pick seed colour"
        triggerClassName="tl-btn plb-seedchip"
        triggerChildren={(
          <>
            <span className="plb-seedchip-sw" ref={barRef(shownSeed)} aria-hidden="true" />
            <span className="plb-seedchip-hex">{shownSeed}</span>
          </>
        )}
      />
    </span>
  )
  // Arrow keys, Home and End move between Explore's two tabs (focus follows).
  const onExploreTabKey = (e) => {
    const tabs = ['community', 'brands']
    const at = tabs.indexOf(galleryTab)
    let to = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (at + 1) % tabs.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (at + tabs.length - 1) % tabs.length
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = tabs.length - 1
    if (to < 0) return
    e.preventDefault()
    setGalleryTab(tabs[to])
    document.getElementById(`plb-ex-tab-${tabs[to]}`)?.focus({ preventScroll: true })
  }
  const historyButton = (kind) => (kind === 'undo'
    ? <ToolButton variant="square" icon="arrow-counter-clockwise" onClick={undoPalette} disabled={!canUndo} aria-label="Undo" title="Undo the last palette change" className="plb-undo" />
    : <ToolButton variant="square" icon="arrow-clockwise" onClick={redoPalette} disabled={!canRedo} aria-label="Redo" title="Redo" className="plb-redo" />)
  const openPreview = () => {
    closeAllMenus()
    setPreview({ mode: 'light', scene: openingScene(lastScene, isPro && planKnown), compare: null })
  }
  // Secondary actions move into Extra tools when the toolbar runs out of room.
  // Left of the divider is what builds the board; right of it is what you do
  // with it next. Departure order is lowest priority first, then the item
  // furthest along the row, so on a phone only Undo, Randomise and Suggest stay.
  const toolbarItems = [
    {
      id: 'back', priority: 2,
      render: () => <ToolBack to="/projects" label="Back to projects" history={false} />,
      menu: { label: 'Back to projects', icon: 'arrow-left', onSelect: () => navigate('/projects') },
    },
    { id: 'seed', priority: 4, render: () => seedChip, menu: () => <div className="plb-menu-seed">{seedChip}</div> },
    {
      id: 'image', priority: 3,
      render: () => (
        <span className="plb-menuwrap">
          <ToolButton icon="image" collapse onClick={() => toggleMenu(imgOpen, setImgOpen)} aria-label="Pull colours from an image" title="Pull colours from an image" aria-haspopup="dialog" aria-expanded={imgOpen}>From image</ToolButton>
        </span>
      ),
      menu: { label: 'From image', icon: 'image', onSelect: () => { closeAllMenus(); setImgOpen(true) } },
    },
    { id: 'system', priority: 1, render: () => systemSelect(), menu: (close) => systemSelect('plb-menu-select', close) },
    // `measure`: the trigger's width follows the mode name, so the row is measured again when it changes.
    { id: 'vision', priority: 0, measure: activeVision, render: () => visionSelect(), menu: (close) => visionSelect('plb-menu-select', close) },
    { id: 'div', priority: 2, divider: true },
    { id: 'undo', priority: 5, render: () => historyButton('undo'), menu: { label: 'Undo', icon: 'arrow-counter-clockwise', disabled: !canUndo, onSelect: undoPalette } },
    { id: 'redo', priority: 4, render: () => historyButton('redo'), menu: { label: 'Redo', icon: 'arrow-clockwise', disabled: !canRedo, onSelect: redoPalette } },
    {
      id: 'random', priority: 5,
      render: () => <ToolButton icon="shuffle" iconSize={14} kbd="SPACE" onClick={randomize} className="plb-random" aria-label="Randomise" collapse>Randomise</ToolButton>,
      menu: { label: 'Randomise', icon: 'shuffle', hint: 'SPACE', onSelect: randomize },
    },
    {
      id: 'suggest', priority: 5, align: 'end',
      render: () => (
        <span className="plb-menuwrap">
          <ToolButton icon="magic-wand" collapse onClick={(e) => (galleryOpen && !exploring ? closeAllMenus() : openGallery('variations', e.currentTarget, e.detail > 0))} aria-label="Suggest variations" title="Suggest variations" aria-haspopup="dialog" aria-expanded={galleryOpen && !exploring}>Suggest</ToolButton>
        </span>
      ),
      menu: { label: 'Suggest', icon: 'magic-wand', onSelect: () => openGallery('variations') },
    },
    {
      id: 'explore', priority: 2, align: 'end',
      render: () => (
        <span className="plb-menuwrap">
          <ToolButton icon="swatches" collapse onClick={(e) => (galleryOpen && exploring ? closeAllMenus() : openGallery('community', e.currentTarget, e.detail > 0))} aria-label="Explore palettes and brands" title="Explore palettes and brands" aria-haspopup="dialog" aria-expanded={galleryOpen && exploring}>Explore</ToolButton>
        </span>
      ),
      menu: { label: 'Explore palettes and brands', icon: 'swatches', onSelect: () => openGallery('community') },
    },
    // Preview is a labelled button on the row where there is room, but it
    // leaves before Undo, Redo, Randomise and Suggest do (priority 3, under
    // Redo's 4). On a phone it is an Extra tools row only: a labelled button
    // does not fit beside those four there. `measure` makes the row measure
    // again when the phone breakpoint is crossed.
    {
      id: 'preview', priority: 3, align: 'end', inline: !phone, measure: phone ? 'phone' : null,
      render: () => (
        <ToolButton icon="eye" className="plb-preview-btn" {...warmPreview} onClick={openPreview} aria-label="Preview" title="Preview your palette on real designs" aria-haspopup="dialog" aria-expanded={!!preview}>Preview</ToolButton>
      ),
      menu: { label: 'Preview', icon: 'eye', onSelect: openPreview },
    },
    // Overflow only — never on the row.
    { id: 'gradient', inline: false, menu: { label: 'Open in Gradient', icon: 'arrows-left-right', onSelect: openInGradient } },
    { id: 'contrast', inline: false, menu: { label: 'Check contrast', icon: 'check-circle', onSelect: () => openInContrast() } },
    { id: 'history', inline: false, menu: { label: 'History', icon: 'arrow-counter-clockwise', onSelect: () => { closeAllMenus(); setHistOpen(true) } } },
    { id: 'reset', inline: false, menu: { label: 'Reset palette', icon: 'arrow-clockwise', onSelect: resetPalette } },
  ]

  return (
    // `data-board-source` is the instrumentation for
    // `palette-opens-with-wrong-state`: it names which of the four ways the
    // board was populated won (a ?c= link, a hand-off, this device's saved
    // project, a fresh draw), and `data-board-cols` the count. Inert.
    <ToolLayout
      className="plb"
      title="Palette Generator"
      titleId="plb-page-title"
      showTitle={false}
      back={false}
      bleed
      overflowLabel="Extra tools"
      overflowIcon="sliders-horizontal"
      items={toolbarItems}
      primary={(
        <span className="plb-menuwrap plb-savewrap">
          <ToolButton
            variant="accent"
            icon="bookmark-simple"
            className="plb-save"
            aria-label="Save or share"
            aria-haspopup="dialog"
            aria-expanded={saveOpen}
            // No gate here: this menu holds Copy rows, and copying is free
            // forever. The account is asked for at the save and at the PNG.
            onClick={() => toggleMenu(saveOpen, setSaveOpen)}
          >
            Save or share
          </ToolButton>
        </span>
      )}
      data-board-source={initial.source}
      data-board-cols={colors.length}
    >
      <p className="sr-only" aria-live="polite">{liveMsg}</p>
      <input ref={fileRef} type="file" accept="image/*" className="plb-file" onChange={onImageFile} aria-hidden="true" tabIndex={-1} />

      {/* P-003: name the paid edge instead of quietly stepping around it. */}
      {collapsedSystem && (
        <div className="plb-collapsed" role="status">
          <span>
            <strong>{collapsedSystem}</strong> is a Pro system — this board is
            using <strong>Auto</strong>. Nothing you saved has changed.
          </span>
          <button
            type="button"
            className="tl-btn plb-collapsed-cta"
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

      {/* A colour-vision check is on: say so above the board and give a way out. */}
      {activeVision !== 'normal' && (
        <VisionStrip mode={activeVision} onTurnOff={turnOffVision} />
      )}

      {/* THE BOARD (D:1017-1043). The set is the named unit (role=group,
          named by the page's h1) and each colour an item inside it — never a
          landmark per swatch. */}
      <div className="plb-stage">
        <div className="plb-board" role="group" aria-labelledby="plb-page-title">
          {adjusted.map((c, i) => {
            // Vision check: the TOP half paints the real colour, the BOTTOM
            // half simulates it through the chosen colour-vision deficiency.
            const isSplit = activeVision !== 'normal'
            const sim = isSplit ? simCvd(c, activeVision) : c
            const ink = textColorForBg(sim)
            const anti = ink === '#000000' ? '#FFFFFF' : '#000000'
            const meta = columnMeta[i]
            const ramp = meta ? meta.ramp : swatchStripHexes(c)
            const name = columnNames[i]
            const role = roleLabel(harmony, i)
            const isLocked = locked.has(i)
            const ratio = contrastRatio(c, ink)
            const inkWord = ink === '#000000' ? 'dark text' : 'light text'
            const colClass = [
              'plb-col',
              isLocked && 'plb-col--locked',
              isSplit && 'plb-col--split',
              animIdx?.has(i) && 'plb-col--in',
              outIdx === i && 'plb-col--out',
              overIdx === i && dragFrom.current != null && 'plb-col--over',
              toolsIdx === i && 'plb-col--tools',
            ].filter(Boolean).join(' ')
            const actionsOpen = ctxMenu?.kind === 'swatch' && ctxMenu.i === i
            return (
              <div
                role="group"
                key={i}
                className={colClass}
                ref={(el) => { columnRefs.current[i] = el; colRef(c, ink, sim)(el); if (el) el.style.setProperty('--plb-anti', anti) }}
                aria-label={`${role} ${adjusted[i]}`}
                // Whole-swatch drag reorders; off while a tints or HCT popover
                // is open on this column so slider drags aren't hijacked.
                draggable={pickerIdx !== i && tintsIdx !== i && valuesIdx !== i && matchIdx !== i}
                onDragStart={(e) => {
                  dragFrom.current = i
                  e.dataTransfer.effectAllowed = 'move'
                  try { e.dataTransfer.setData('text/plain', String(i)) } catch { /* older engines */ }
                }}
                onDragEnd={() => { dragFrom.current = null; setOverIdx(null) }}
                // A tap on the bare swatch opens its quick tools where there is
                // no hover to show them. Controls and popovers handle their own
                // presses.
                onClick={(e) => {
                  if (e.target.closest('button, a, input, .plb-pop')) return
                  if (!window.matchMedia('(hover: none)').matches) return
                  setSwapIdx(null)
                  setToolsIdx(cur => (cur === i ? null : i))
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  ctxTriggerRef.current = e.currentTarget.querySelector('.plb-tool--more')
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
                {/* Lock, quick actions, then More share one visual and Tab
                    order. Phones keep Lock and More; the menu holds every action. */}
                <div className="plb-col-tools">
                  <button
                    type="button"
                    className={isLocked ? 'plb-tool plb-tool--key plb-tool--on' : 'plb-tool plb-tool--key'}
                    aria-pressed={isLocked}
                    title={isLocked ? 'Unlock this colour' : 'Lock this colour'}
                    aria-label={isLocked ? `Unlock ${role}` : `Lock ${role}`}
                    onClick={() => toggleLock(i)}
                  >
                    <ToolIcon name={isLocked ? 'lock-simple' : 'lock-simple-open'} size={15} />
                  </button>
                  {/* Quick tools: the three actions people reach for most, one
                      press from the swatch. They show on hover or keyboard focus
                      (and on a tap of the swatch where there is no hover); each
                      is also an item in the Colour actions menu. */}
                  <div className="plb-col-quick">
                    <button
                      type="button"
                      className={pickerIdx === i ? 'plb-tool plb-tool--quick plb-tool--on' : 'plb-tool plb-tool--quick'}
                      title={isPro ? 'Edit in HCT' : 'Edit in HCT — Pro'}
                      aria-label={`Edit ${role} in HCT`}
                      aria-haspopup="dialog"
                      aria-expanded={pickerIdx === i}
                      onClick={() => openHctPicker(i)}
                    >
                      <ToolIcon name="sliders-horizontal" size={15} />
                    </button>
                    {adjusted.length > 1 && (
                      <button
                        type="button"
                        className={swapIdx === i ? 'plb-tool plb-tool--quick plb-tool--swap plb-tool--on' : 'plb-tool plb-tool--quick plb-tool--swap'}
                        title="Choose a swap direction"
                        aria-label={`Choose a direction to swap ${role}`}
                        aria-haspopup="menu"
                        aria-expanded={swapIdx === i}
                        ref={swapIdx === i ? swapTriggerRef : undefined}
                        onClick={(e) => {
                          swapPointerRef.current = e.detail > 0
                          setTintsIdx(null); setPickerIdx(null); setCtxMenu(null)
                          setSwapIdx(cur => (cur === i ? null : i))
                        }}
                      >
                        <ToolIcon name="arrows-left-right" size={15} />
                      </button>
                    )}
                    {adjusted.length > 2 && (
                      <button
                        type="button"
                        className="plb-tool plb-tool--quick"
                        title="Remove colour"
                        aria-label={`Remove ${role}`}
                        onClick={(e) => removeCol(i, e)}
                      >
                        <ToolIcon name="x" size={15} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className={actionsOpen ? 'plb-tool plb-tool--more plb-tool--on' : 'plb-tool plb-tool--more'}
                    title="More colour actions"
                    aria-label={`More actions for ${role}`}
                    aria-haspopup="menu"
                    aria-expanded={actionsOpen}
                    // a tap on a control that is still faded out must not act
                    onPointerDown={(e) => { moreHiddenAtPressRef.current = e.pointerType !== 'mouse' && parseFloat(getComputedStyle(e.currentTarget).opacity) < 0.5 }}
                    onPointerCancel={() => { moreHiddenAtPressRef.current = false }}
                    onClick={(e) => {
                      if (e.detail !== 0 && moreHiddenAtPressRef.current) { moreHiddenAtPressRef.current = false; return }
                      moreHiddenAtPressRef.current = false
                      const r = e.currentTarget.getBoundingClientRect()
                      ctxTriggerRef.current = e.currentTarget
                      setTintsIdx(null); setPickerIdx(null)
                      setCtxMenu(cur => (cur && cur.kind === 'swatch' && cur.i === i) ? null : { kind: 'swatch', i, x: r.left, y: r.bottom + 6, triggerTop: r.top, keyboard: e.detail === 0 })
                    }}
                  >
                    <ToolIcon name="dots-three" size={15} />
                  </button>
                  {swapIdx === i && (
                    <div className="plb-pop plb-swappop" role="menu" aria-label={`Swap ${role}`}>
                      {i > 0 && (
                        <button type="button" role="menuitem" className="plb-swapdir" onClick={() => { swapTriggerRef.current?.focus(); swapCols(i, 'left'); setSwapIdx(null); setToolsIdx(null) }}>
                          <IcoArrowLeft /> Swap left
                        </button>
                      )}
                      {i < colors.length - 1 && (
                        <button type="button" role="menuitem" className="plb-swapdir" onClick={() => { swapTriggerRef.current?.focus(); swapCols(i, 'right'); setSwapIdx(null); setToolsIdx(null) }}>
                          Swap right <IcoArrowRight />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* The 5-bar tint strip (D:1022-1026): one button — it opens
                    this colour's tints. */}
                <button
                  type="button"
                  className="plb-ramp"
                  title={`Tints of ${adjusted[i].toUpperCase()}, 100 to 900`}
                  aria-label={`Tints of ${adjusted[i].toUpperCase()}, 100 to 900 — view all tints`}
                  onClick={() => { panelOpenerRef.current = 'ramp'; setPickerIdx(null); setCtxMenu(null); setTintsIdx(t => (t === i ? null : i)) }}
                >
                  {ramp.map((rc, k) => (
                    <span key={k} className="plb-ramp-bar" ref={barRef(rc)} aria-hidden="true" />
                  ))}
                </button>
                <div className="plb-col-body">
                  <div className="plb-name">{name}</div>
                  {/* Canonical uppercase in the DOM: what a screen reader reads,
                      what the copy puts on the clipboard, what a test reads. */}
                  <button type="button" className="plb-hex" title="Copy hex" onClick={() => onCopy?.(adjusted[i].toUpperCase())}>{adjusted[i].toUpperCase()}</button>
                  <div className="plb-role">{role}</div>
                </div>
                {/* THE AA CHIP (D:1032-1034), in the design's visuals — and Pro, which
                    is a Pro check. A free person sees the
                    chip's place and what it would tell them, and it opens Pro. */}
                {isPro ? (
                  <span className="plb-aa" title={`${ratio.toFixed(2)}:1 with ${inkWord}`}>
                    <ToolIcon name={ratio >= 4.5 ? 'check-circle' : 'warning-circle'} size={12} />
                    {ratio.toFixed(1)}:1 on {inkWord}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="plb-aa plb-aa--locked"
                    title="Contrast check — Pro"
                    aria-label={`Contrast of ${role} — a Pro check`}
                    onClick={() => openProModal({ gate: 'palette-contrast-view', eyebrow: 'Pro colour tools', title: 'Check contrast, light and dark', subtitle: 'See WCAG contrast on every colour against both white and black text — so you know which colours carry legible text in light and dark UI.' })}
                  >
                    <span>
                      AA
                      {i === 0 && <span className="plb-aa-pro"> · Pro</span>}
                    </span>
                  </button>
                )}

                {tintsIdx === i && (
                  <div className="plb-pop plb-tintpop" role="dialog" aria-label={`Tints of ${adjusted[i]}`}>
                    <div className="plb-pop-head">
                      <span className="plb-pop-title">Tints</span>
                      <button type="button" className="plb-pop-x" aria-label="Close tints" onClick={closeColPanel}><IcoX /></button>
                    </div>
                    <div className="plb-tint-list">
                      {tintRampForHex(adjusted[i]).map(({ label, hex: tc }) => (
                        <button key={label} type="button" className="plb-tint-row" onClick={() => onCopy?.(normaliseHex(tc) || tc)}>
                          <span className="plb-tint-chip" ref={barRef(tc)} aria-hidden="true" />
                          <span className="plb-tint-tone">{label}</span>
                          <span className="plb-tint-hex">{(normaliseHex(tc) || tc)}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn btn-s plb-tintopen" onClick={() => openInTint(adjusted[i])}>
                      Open in Tint Generator
                    </button>
                  </div>
                )}

                {valuesIdx === i && (
                  // Shares the tints panel's anchoring (.plb-tintpop) and its
                  // dismissal; reached from the swatch's "..." menu, which is on
                  // screen on a phone.
                  <div className="plb-pop plb-tintpop plb-valpop" role="dialog" aria-label={`Colour values for ${adjusted[i]}`}>
                    <div className="plb-pop-head">
                      <span className="plb-pop-title">Colour values</span>
                      <button type="button" className="plb-pop-x" aria-label="Close colour values" onClick={closeColPanel}><IcoX /></button>
                    </div>
                    <ul className="plb-val-list">
                      {colourFormats(adjusted[i]).map(({ key, label, value }) => (
                        <li key={key} className="plb-val-row">
                          <span className="plb-val-k">{label}</span>
                          <code className="plb-val-v">{value}</code>
                          <button type="button" className="plb-val-copy" aria-label={`Copy ${label} ${value}`} title={`Copy ${label}`} onClick={() => onCopy?.(value)}><IcoCopy /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {matchIdx === i && (
                  // The same slot, anchoring and dismissal as Tints and Colour values.
                  <NearestMatchPanel
                    hex={adjusted[i]}
                    isPro={isPro}
                    planKnown={planKnown}
                    onCopy={(value) => onCopy?.(value)}
                    onClose={closeColPanel}
                    closeIcon={<IcoX />}
                    copyIcon={<IcoCopy />}
                  />
                )}

                {pickerIdx === i && (
                  <HctPicker key={i} hex={colors[i]} label={role} onChange={(hex) => setColorAt(i, hex)} onClose={() => setPickerIdx(null)} />
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
                      const synthetic = (e.clientX === 0 && e.clientY === 0) || e.detail === 0
                      const pos = synthetic
                        ? (() => { const r = e.currentTarget.getBoundingClientRect(); return { x: r.left, y: r.bottom, triggerTop: r.top } })()
                        : { x: e.clientX, y: e.clientY }
                      setCtxMenu({ kind: 'gap', i, ...pos })
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'ContextMenu' && !(e.key === 'F10' && e.shiftKey)) return
                      e.preventDefault()
                      setTintsIdx(null); setPickerIdx(null)
                      const r = e.currentTarget.getBoundingClientRect()
                      setCtxMenu({ kind: 'gap', i, x: r.left, y: r.bottom, triggerTop: r.top })
                    }}
                  >
                    <span className="plb-gap-dot"><IcoPlus size={13} /></span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {/* Suggest / Explore: one docked panel beside the board (a bottom dock below
            1024, a sheet on a phone). It pushes the board and never covers it.
            `.plb-menuwrap` keeps the page's dismiss layer from closing it on a press
            inside it. Design: memory/designs/design-2026-10-31-suggest-explore.md. */}
        {galleryOpen && (() => {
          const mineColors = trialSnapRef.current?.mine || adjusted
          const q = exQuery.trim().toLowerCase()
          const match = (n) => !q || String(n).toLowerCase().includes(q)
          const searchable = galleryTab === 'brands' || communityRows.length > 12
          const shownPalettes = communityRows.filter(r => match(r.name))
          const shownBrands = openBrands.filter(b => match(b.name))
          const shownLocked = lockedBrands.filter(p => match(p.label))
          const noun = galleryTab === 'brands' ? 'brands' : 'palettes'
          const noMatch = Boolean(q) && (galleryTab === 'brands' ? shownBrands.length + shownLocked.length : shownPalettes.length) === 0
          const rowLabel = (name, detail, on) => (on ? `${name}, on your board. Press again to go back to your palette.` : detail ? `${name}: ${detail}` : name)
          const clearSearch = () => { setExQuery(''); document.getElementById('plb-sx-search')?.focus() }
          return (
            <div
              className="plb-menuwrap plb-sx"
              ref={galleryRef}
              data-snap={sheetFull ? 'full' : 'peek'}
              role={wideDock ? 'complementary' : 'dialog'}
              aria-modal={wideDock ? undefined : 'false'}
              aria-label={exploring ? 'Explore palettes and brands' : 'Suggest'}
              data-lenis-prevent
            >
              <button type="button" className="plb-sx-handle" aria-label={sheetFull ? 'Collapse' : 'Expand'} onClick={() => setSheetFull(f => !f)}><span aria-hidden="true" /></button>
              <div className="plb-sx-head">
                <div className="plb-menu-title">{exploring ? 'Explore' : 'Suggest'}</div>
                {exploring && (
                  <div className="tl-pills plb-sg-tabs" role="tablist" aria-label="Explore sections" onKeyDown={onExploreTabKey}>
                    {['community', 'brands'].map(tab => (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        id={`plb-ex-tab-${tab}`}
                        aria-selected={galleryTab === tab}
                        aria-controls={galleryTab === tab ? `plb-ex-panel-${tab}` : undefined}
                        tabIndex={galleryTab === tab ? 0 : -1}
                        className={galleryTab === tab ? 'tl-pill is-on' : 'tl-pill'}
                        onClick={() => setGalleryTab(tab)}
                      >
                        {tab === 'community' ? 'Palettes' : 'Brands'}
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" className="plb-pop-x" aria-label="Close" onClick={closeAllMenus}><IcoX /></button>
              </div>
              <YourPaletteRow
                colors={mineColors}
                detail={exploring ? null : `Balance ${trialSnapRef.current?.before ?? paletteScore}`}
                help={exploring ? null : 'It scores tone range, evenness, chroma profile and distinctness.'}
                onCompare={panelApplied?.compare ? () => { setGalleryOpen(false); setPreview({ mode: 'light', scene: DEFAULT_SCENE, compare: panelApplied.compare }) } : null}
                compareLabel={`Compare ${panelApplied?.name || 'the applied option'} with your palette`}
              />
              <div className="plb-sx-body" ref={scrollCue} {...(exploring ? { role: 'tabpanel', id: `plb-ex-panel-${galleryTab}`, 'aria-labelledby': `plb-ex-tab-${galleryTab}` } : {})}>
                {!exploring && (variations.length === 0 ? (
                  <p className="plb-sx-intro">Variations need at least two colours. Add another colour to the board to see them.</p>
                ) : (
                  <>
                    <p className="plb-sx-intro plb-sx-intro--sg">Each one reworks the colours on your board. Click one to try it, and click it again to go back.</p>
                    <RovingRows>
                      {variationGroups.map(group => (
                        <section key={group.label} aria-label={group.label}>
                          <h3 className="plb-sx-group">{group.label}</h3>
                          <ul className="plb-sw-list" role="list">
                            {group.items.map(v => {
                              const gated = !isPro && !freeVarIds.has(v.id)
                              const active = panelApplied?.kind === 'variation' && panelApplied.id === v.id
                              return (
                                <SwatchRow
                                  key={v.id}
                                  id={`var-${v.id}`}
                                  variant={gated ? 'gate' : 'press'}
                                  name={v.label}
                                  detail={v.desc}
                                  meta={v.score}
                                  colors={v.colors}
                                  applied={active}
                                  mine={mineColors}
                                  ariaLabel={gated ? `${v.label}, Pro only. Opens Pro plans.` : rowLabel(v.label, v.desc, active)}
                                  onPress={() => pickVariation(v, gated)}
                                />
                              )
                            })}
                          </ul>
                        </section>
                      ))}
                    </RovingRows>
                    {!isPro && variations.length > freeVarIds.size && (
                      <ProBlock
                        heading={`${variations.length - freeVarIds.size} more ${variations.length - freeVarIds.size === 1 ? 'variation' : 'variations'} with Pro`}
                        body="Free covers the three best-balanced variations for your palette."
                        onOpen={openVariationGate}
                      />
                    )}
                  </>
                ))}

                {exploring && (
                  <>
                    <p className="plb-sx-intro">{galleryTab === 'brands'
                      ? 'Loads a brand’s published colours and its colour system. Click it again to go back.'
                      : 'Loads a palette in place of yours. Click it again to go back.'}</p>
                    {searchable && (
                      <div className="plb-sx-search">
                        <IcoSearchSm />
                        <label className="sr-only" htmlFor="plb-sx-search">{`Search ${noun}`}</label>
                        <input
                          id="plb-sx-search"
                          type="search"
                          enterKeyHint="search"
                          autoComplete="off"
                          placeholder={`Search ${noun}`}
                          value={exQuery}
                          onFocus={() => { if (!wideDock && window.matchMedia?.('(max-width: 640px)').matches) setSheetFull(true) }}
                          onChange={(e) => setExQuery(e.target.value)}
                        />
                      </div>
                    )}
                    {noMatch ? (
                      <p className="plb-sx-note">No {noun} match &ldquo;{exQuery.trim()}&rdquo;. <button type="button" className="plb-sx-link" onClick={clearSearch}>Clear search</button></p>
                    ) : (
                      <RovingRows>
                        <ul className="plb-sw-list" role="list">
                          {galleryTab === 'community' && shownPalettes.map(p => {
                            const on = importedGalleryId === p.id
                            return (
                              <SwatchRow key={p.id} id={`pal-${p.id}`} name={p.name} colors={p.colors} applied={on} mine={mineColors}
                                ariaLabel={rowLabel(p.name, '', on)} onPress={() => importGalleryPalette(p.colors, p.name, p.id)} />
                            )
                          })}
                          {galleryTab === 'brands' && shownBrands.map(b => {
                            const on = importedGalleryId === brandTickId(b)
                            return (
                              <SwatchRow key={b.id} id={`brand-${b.id}`} name={b.name} colors={b.colors} applied={on} mine={mineColors}
                                ariaLabel={rowLabel(b.name, '', on)} onPress={() => pickBrand(b)} />
                            )
                          })}
                          {galleryTab === 'brands' && !proPending && shownLocked.map(p => (
                            <SwatchRow key={p.id} id={`lock-${p.id}`} variant="static" name={p.label} slots={p.slots} />
                          ))}
                        </ul>
                      </RovingRows>
                    )}
                    {proPending && <RowSkeletons />}
                    {proPending && <ProLibraryStatus library={proLib} noun={galleryTab === 'brands' ? 'brand library' : 'palette library'} />}
                    {!proPending && galleryTab === 'community' && communityLocked > 0 && (
                      <ProBlock
                        gate="palette-builder-community-lock"
                        heading={`Another ${communityLocked} ${communityLocked === 1 ? 'palette' : 'palettes'} with Pro`}
                        body={`Free covers ${communityRows.length} of the ${LIBRARY_TOTALS.curatedPalettes} curated palettes.`}
                      />
                    )}
                    {!proPending && galleryTab === 'brands' && lockedBrandCount > 0 && (
                      <ProBlock
                        gate="palette-builder-brand-lock"
                        heading={`Another ${lockedBrandCount} brand ${lockedBrandCount === 1 ? 'system' : 'systems'} with Pro`}
                        body="Each brand loads its whole colour system, not only its swatches."
                      />
                    )}
                    {galleryTab === 'community' && (
                      <div className="plb-sx-foot">Browse the full set in <Link to="/discover" onClick={() => setGalleryOpen(false)}>Discover</Link></div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })()}
        {/* The ADD rail (D:1037-1040). */}
        <button type="button" className="plb-add" onClick={addCol} aria-label="Add a colour">
          <ToolIcon name="plus" size={19} />
          <span className="plb-add-label">Add</span>
        </button>
      </div>

      {/* ── Colour actions / insert menus (right-click and ⋯) ── */}
      {ctxMenu && ctxMenu.kind === 'gap' && (
        <div className="plb-pop plb-ctx" role="menu" aria-label="Insert colours" ref={ctxMenuRef}>
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
        <div className="plb-pop plb-ctx" role="menu" aria-label="Colour actions" ref={ctxMenuRef}
          onKeyDown={(e) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
            e.preventDefault()
            const items = [...e.currentTarget.querySelectorAll('button[role="menuitem"]')]
            const current = items.indexOf(document.activeElement)
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
              : (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
            items[next]?.focus({ preventScroll: true })
            items[next]?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
          }}>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { onCopy?.(adjusted[ctxMenu.i]); closeCtxMenu(ctxMenu.i) }}><IcoCopy /> Copy hex</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { setFromSeedInput(adjusted[ctxMenu.i]); closeCtxMenu(ctxMenu.i) }}><IcoShuffle /> Use as seed</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => openHctPicker(ctxMenu.i)}><IcoSliders /> Edit in HCT</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => openColPanel('tints', ctxMenu.i)}><IcoEye /> View tints</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => openColPanel('values', ctxMenu.i)}><ToolIcon name="swatches" size={14} /> Colour values</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => openColPanel('match', ctxMenu.i)}><ToolIcon name="tag" size={14} /> Nearest named colours{planKnown && !isPro && <span className="plb-ctx-pro">Pro</span>}</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => openInContrast(ctxMenu.i)}><ToolIcon name="check-circle" size={14} /> Check contrast</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { toggleLock(ctxMenu.i); closeCtxMenu(ctxMenu.i) }}>
            <IcoLock open={locked.has(ctxMenu.i)} size={15} /> {locked.has(ctxMenu.i) ? 'Unlock' : 'Lock'}
          </button>
          <div className="plb-ctx-sep" aria-hidden="true" />
          {ctxMenu.i > 0 && (
            <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { swapCols(ctxMenu.i, 'left'); closeCtxMenu(ctxMenu.i - 1) }}><IcoArrowLeft /> Swap left</button>
          )}
          {ctxMenu.i < colors.length - 1 && (
            <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { swapCols(ctxMenu.i, 'right'); closeCtxMenu(ctxMenu.i + 1) }}><IcoArrowRight /> Swap right</button>
          )}
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { closeCtxMenu(ctxMenu.i + (insertAt(ctxMenu.i, midColor(colors[Math.max(0, ctxMenu.i - 1)], colors[ctxMenu.i])) ? 1 : 0)) }}><IcoPlus size={15} /> Insert left</button>
          <button type="button" role="menuitem" className="plb-ctx-item" onClick={() => { insertBetween(ctxMenu.i); closeCtxMenu(ctxMenu.i) }}><IcoPlus size={15} /> Insert right</button>
          {colors.length > 2 && (
            <button type="button" role="menuitem" className="plb-ctx-item plb-ctx-item--danger" onClick={(e) => { removeCol(ctxMenu.i, e); setCtxMenu(null) }}><IcoX /> Remove</button>
          )}
        </div>
      )}

      {histOpen && (
        <div className="plb-menuwrap plb-float">
          <div className="plb-menu plb-histmenu" role="menu" aria-label="Palette history" data-lenis-prevent>
            <div className="plb-float-head">
              <div className="plb-menu-title">History</div>
              <button type="button" className="plb-pop-x" aria-label="Close" onClick={closeAllMenus}><IcoX /></button>
            </div>
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
                        applySnapshot(h)
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
        </div>
      )}

      {saveOpen && (
        <SaveShareMenu
          label="Save, share and export this palette"
          name={saveName}
          onNameChange={(v) => { setSaveName(v); setSaveNameError('') }}
          onSave={doSave}
          busy={authLoading}
          nameError={saveNameError}
          note={saveNote}
          saveError={saveError}
          refusalTestId="palette-save-refusal"
          projects={projects}
          onOverwrite={(p) => {
            try { overwriteProject(p.id); closeSaveMenu(); toast?.('Updated: ' + p.name) }
            catch (err) { toast?.(err?.message || 'Couldn’t save', 'error') }
          }}
          onClose={closeAllMenus}
          share={(
            <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(shareLink()); closeSaveMenu() }}><IcoCopy /> Copy link to this palette</button>
          )}
          exports={(
            <>
              <button type="button" className="plb-menu-item" onClick={() => { copyCssExport(); closeSaveMenu() }}><IcoCopy /> Copy CSS variables</button>
              <button type="button" className="plb-menu-item" onClick={() => { onCopy?.(adjusted.join(', ')); closeSaveMenu() }}><IcoCopy /> Copy hex values</button>
              <button type="button" className="plb-menu-item" onClick={downloadPng}><IcoDownload /> Download PNG card</button>
            </>
          )}
          after={(
            <>
              <div className="plb-menu-sub">Community</div>
              <button
                type="button"
                className="plb-menu-item"
                onClick={openSubmit}
                disabled={authLoading}
                aria-busy={authLoading || undefined}
                title={authLoading ? 'Checking your account…' : undefined}
              ><IcoUsers /> Submit to the community…</button>
            </>
          )}
        />
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

      {/* ── Preview dialog ── */}
      {preview && (
        <Suspense fallback={null}>
          <PalettePreviewDialog
            preview={preview}
            onChange={(patch) => { if (patch.scene) setLastScene(patch.scene); setPreview((p) => (p ? { ...p, ...patch } : p)) }}
            onClose={closePreview}
            colors={adjusted}
            paletteScore={paletteScore}
            harmony={harmony}
            vision={activeVision}
            visionLabel={visionMode(activeVision).name}
            onResetVision={() => changeVision('normal')}
            isPro={isPro}
            planKnown={planKnown}
            onUnlock={(scene) => openProModal({ gate: 'palette-preview-scene', eyebrow: 'Pro palette previews', title: `Preview ${scene.name.toLowerCase()}`, subtitle: `See your palette on all ${PREVIEW_SCENES.length} previews, in light and dark.` })}
            onUse={() => { applyPalette(preview.compare.colors, `Applied variation: ${preview.compare.label}`); setPreview(null) }}
          />
        </Suspense>
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

      {/* ── ADJUST ALL (D:1044-1057): one row, signed values, Copy CSS inline ──
          The footer is a size container: the bar re-flows on its own width, never
          the window's, into three set shapes (see palette-builder.css). */}
      <footer className="plb-adjust" role="group" aria-labelledby="plb-adjust-title">
        <div className="plb-adjust-bar">
        <p className="plb-adjust-title" id="plb-adjust-title">Adjust all</p>
        {/* One grid for the four sliders, so every row shares one column width
            and the tracks come out the same length however it wraps. */}
        <div className="plb-adjust-fields">
        {ADJUST_FIELDS.map(f => {
          const v = adjust[f.key]
          return (
            <ToolSlider
              key={f.key}
              id={`plb-${f.key}`}
              className={`plb-adjust-field${v !== 0 ? ' plb-adjust-field--edited' : ''}`}
              label={f.label}
              min={f.min}
              max={f.max}
              step={1}
              value={v}
              onChange={(nv) => setAdjust(prev => ({ ...prev, [f.key]: nv }))}
              snaps={f.snaps}
              defaultValue={0}
              // As drawn (D:2171-2174): degrees on Hue, a bare signed number
              // on the others; the percentage is spoken, not printed.
              // The degree sign hangs past the value column's right edge
              // (.plb-deg), so every row's digits end on one line.
              display={f.unit === '°'
                ? <>{`${v > 0 ? '+' : ''}${v}`}<span className="plb-deg">°</span></>
                : `${v > 0 ? '+' : ''}${v}`}
              track={trackGradients?.[f.key] || ADJUST_TRACKS[f.key]}
              ariaLabel={`${f.label} adjustment`}
              ariaValueText={`${v > 0 ? '+' : ''}${v}${f.unit || ''}`}
            />
          )
        })}
        </div>
        <div className="plb-adjust-actions">
        {/* Always laid out, so that the first nudge of a slider does not
            reflow the bar under the pointer; hidden until there is something
            to reset. */}
        <button
          type="button"
          className={adjustDirty ? 'tl-btn plb-adjust-reset' : 'tl-btn plb-adjust-reset is-idle'}
          onClick={() => setAdjust(ZERO_ADJUST)}
          disabled={!adjustDirty}
          aria-hidden={!adjustDirty || undefined}
        >
          Reset
        </button>
        {/* A phone opens the CSS in a bottom sheet to read and copy; wider
            screens copy it straight away. */}
        {phone ? (
          <button type="button" className="plb-copycss" aria-haspopup="dialog" aria-expanded={cssSheetOpen} onClick={() => setCssSheetOpen(true)}>
            <ToolIcon name="code" size={14} /><span>Palette CSS</span>
          </button>
        ) : (
          <button type="button" className="plb-copycss" onClick={copyCssExport}>
            <ToolIcon name="copy" size={14} /><span>Copy CSS</span>
          </button>
        )}
        </div>
        </div>
        {phone && cssSheetOpen && (
          <PaletteCssSheet
            css={cssExport}
            onClose={closeCssSheet}
            onCopy={async () => {
              // Shut the sheet only once the copy has gone through; a refused
              // copy keeps it open beside the toast that says why.
              if (await copyCssExport() === true) setCssSheetOpen(false)
            }}
          />
        )}
      </footer>

      {/* Step 1 of the brand-kit walkthrough; renders nothing unless the
          visitor is in the flow. */}
      <UIKitGuide step="color" />
    </ToolLayout>
  )
}
