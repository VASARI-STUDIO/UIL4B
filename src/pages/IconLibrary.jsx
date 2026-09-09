import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme } from '../contexts/ThemeContext'
import { useProject } from '../contexts/ProjectContext'
import { useProModal } from '../contexts/ProModalContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { getLenis } from '../hooks/useSmoothScroll'
import { trackIconCopy } from '../utils/analytics'
import UIKitGuide from '../components/UIKitGuide'
import ColorPickerPop from '../components/ColorPickerPop'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import SnapSlider from '../components/SnapSlider'
import { addRecentIcon, getRecentIcons, clearRecentIcons } from '../utils/recentIcons'
import { openInNewTab } from '../utils/newTab'
import { consumeIconDraft, readIconDraft, validateIconDraft } from '../utils/iconHandoff'
import {
  STROKE_PX, STROKE_UNIT_PX, customIconStrokePx, draftStrokePx,
  stickyStrokePx, strokeAttrForPx, viewBoxOf,
} from '../utils/iconStroke'
import { WIDE_INK, inkShape } from '../utils/glyphShape'

const API_LIMIT = 999

const API_HOSTS = [
  'https://api.iconify.design',
  'https://api.simplesvg.com',
  'https://api.unisvg.com',
]

const COLORED_PACKS = new Set([
  'logos', 'flat-color-icons', 'fxemoji', 'noto', 'noto-v1', 'twemoji', 'emojione',
  'emojione-v1', 'openmoji', 'fluent-emoji', 'fluent-emoji-flat', 'circle-flags',
  'flag', 'flagpack', 'cif', 'skill-icons', 'devicon', 'vscode-icons', 'token-branded',
])
// Theme-adaptive tint for the GRID/rail only (inverts monochrome art in dark mode).
// The customizer Stage does NOT use this — it fixes contrast via a luminance swap.
const invClass = (pack) => (COLORED_PACKS.has(pack) ? '' : 'ig-inv')

// Curated cross-pack collections. A chip aggregates every pack in its group so
// "Coloured" shows colour icons from ALL colour packs, not just one — same for
// the other styles. `packs` are real Iconify prefixes.
const ICON_GROUPS = {
  outlined: { label: 'Outlined', packs: ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph'] },
  solid: { label: 'Solid', packs: ['mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs'] },
  coloured: { label: 'Coloured', packs: ['logos', 'flat-color-icons', 'devicon', 'skill-icons', 'vscode-icons', 'token-branded'] },
  brands: { label: 'Brand logos', packs: ['simple-icons', 'logos', 'devicon', 'skill-icons'] },
  flags: { label: 'Flags', packs: ['circle-flags', 'flag', 'flagpack', 'cif'] },
  emoji: { label: 'Emoji', packs: ['twemoji', 'fluent-emoji', 'noto', 'openmoji'] },
}
const GROUP_ORDER = ['outlined', 'solid', 'coloured', 'brands', 'flags', 'emoji']
// Cap each pack's contribution so a 5-pack aggregate stays snappy (the grid is
// windowed anyway — nobody scrolls past a few thousand).
const PER_PACK_CAP = 1500

// Every pack across every group, de-duped — the default "All packs" aggregate.
const ALL_PACKS = [...new Set(GROUP_ORDER.flatMap(k => ICON_GROUPS[k].packs))]

// Built once at module scope so LibraryFilterGroup is not handed a new array
// identity on every keystroke — it measures its sliding indicator off the
// active button, and a fresh options array re-runs that measurement.
//
// "My Icons" leads because it is the user's own collection rather than one of
// the catalogue's groups; `custom` is not a member of GROUP_ORDER and never was.
const GROUP_OPTIONS = [
  { id: 'custom', label: 'My Icons' },
  ...GROUP_ORDER.map((key) => ({ id: key, label: ICON_GROUPS[key].label })),
]
// Cap per pack for the default aggregate so we hold ~5k lightweight refs, not ~36k.
const ALL_INITIAL_PER_PACK = 250
// Packs whose default style is genuinely stroke-based (the stroke slider applies).
const STROKE_PACKS = new Set(ICON_GROUPS.outlined.packs)
// Pro-gated store of user-customised icons. NEVER read/written for non-Pro.
const CUSTOM_KEY = 'vs-custom-icons'

// ── Logo.dev brand logos ──────────────────────────────────────────────────────
// The Iconify brand packs only cover logos that ship in those icon sets. Logo.dev
// serves virtually every company's real logo by name or domain, so it's the
// "any brand" pack. The token is PUBLISHABLE (safe client-side, like the Firebase
// web key) — VITE_-prefixed so it reaches the browser, with the public key as a
// fallback. There's no "list every logo" endpoint, so this pack browses a curated
// set of popular brands and lets search resolve any company by name. A missing
// logo comes back as a monogram (200 OK). Free-tier commercial use requires a
// visible attribution link back to logo.dev (rendered under the grid).
const LOGODEV_TOKEN = import.meta.env.VITE_LOGODEV_KEY || 'pk_L_3nxFHHQrOLmFuS16PsFQ'
// Build a logo image URL. `ref` is a domain (stripe.com) or a plain brand name;
// names are resolved through the /name/ path. Retina PNG so it stays crisp.
const logodevUrl = (ref, size = 128) => {
  const clean = String(ref || '').trim()
  const path = clean.includes('.') ? encodeURIComponent(clean) : `name/${encodeURIComponent(clean)}`
  return `https://img.logo.dev/${path}?token=${LOGODEV_TOKEN}&size=${size}&format=png&retina=true`
}
// Curated popular brands for the browse grid — domains give the most reliable
// match. Grouped loosely (tech · dev · social · finance · commerce · media).
const LOGODEV_BRANDS = [
  { name: 'Google', domain: 'google.com' }, { name: 'Apple', domain: 'apple.com' },
  { name: 'Microsoft', domain: 'microsoft.com' }, { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Meta', domain: 'meta.com' }, { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Spotify', domain: 'spotify.com' }, { name: 'YouTube', domain: 'youtube.com' },
  { name: 'X', domain: 'x.com' }, { name: 'Instagram', domain: 'instagram.com' },
  { name: 'LinkedIn', domain: 'linkedin.com' }, { name: 'TikTok', domain: 'tiktok.com' },
  { name: 'Discord', domain: 'discord.com' }, { name: 'Slack', domain: 'slack.com' },
  { name: 'Reddit', domain: 'reddit.com' }, { name: 'Pinterest', domain: 'pinterest.com' },
  { name: 'Twitch', domain: 'twitch.tv' }, { name: 'WhatsApp', domain: 'whatsapp.com' },
  { name: 'GitHub', domain: 'github.com' }, { name: 'GitLab', domain: 'gitlab.com' },
  { name: 'Figma', domain: 'figma.com' }, { name: 'Notion', domain: 'notion.so' },
  { name: 'Vercel', domain: 'vercel.com' }, { name: 'Stripe', domain: 'stripe.com' },
  { name: 'OpenAI', domain: 'openai.com' }, { name: 'Anthropic', domain: 'anthropic.com' },
  { name: 'Cloudflare', domain: 'cloudflare.com' }, { name: 'Adobe', domain: 'adobe.com' },
  { name: 'Dropbox', domain: 'dropbox.com' }, { name: 'Airbnb', domain: 'airbnb.com' },
  { name: 'Uber', domain: 'uber.com' }, { name: 'PayPal', domain: 'paypal.com' },
  { name: 'Visa', domain: 'visa.com' }, { name: 'Mastercard', domain: 'mastercard.com' },
  { name: 'Shopify', domain: 'shopify.com' }, { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'Nvidia', domain: 'nvidia.com' }, { name: 'Intel', domain: 'intel.com' },
  { name: 'Tesla', domain: 'tesla.com' }, { name: 'Samsung', domain: 'samsung.com' },
  { name: 'Sony', domain: 'sony.com' }, { name: 'Nike', domain: 'nike.com' },
  { name: 'Coca-Cola', domain: 'coca-cola.com' }, { name: 'McDonald’s', domain: 'mcdonalds.com' },
  { name: 'Disney', domain: 'disney.com' }, { name: 'Airtable', domain: 'airtable.com' },
  { name: 'Zoom', domain: 'zoom.us' }, { name: 'Canva', domain: 'canva.com' },
]

// ── Free-tier daily copy allowance ────────────────────────────────────────────
// Non-Pro users get FREE_COPIES_PER_DAY icon copies per LOCAL day, tracked as
// { date: 'YYYY-MM-DD', count } in localStorage. A new day resets the count.
const COPY_DAY_KEY = 'vs-icon-copy-day'
const FREE_COPIES_PER_DAY = 10

function localDay() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readCopyCount() {
  try {
    const o = JSON.parse(localStorage.getItem(COPY_DAY_KEY) || 'null')
    return o && o.date === localDay() ? (Number(o.count) || 0) : 0
  } catch { return 0 }
}

function bumpCopyCount() {
  try {
    localStorage.setItem(COPY_DAY_KEY, JSON.stringify({ date: localDay(), count: readCopyCount() + 1 }))
  } catch { /* quota */ }
}

// Sticky stroke width — the last width the user set persists so the next icon
// they open starts at the same weight, making it easy to build a consistent set.
// A re-opened custom icon still wins with its own saved stroke.
//
// The value is now PIXELS, so it lives under a NEW key: `vs-icon-stroke` held a
// viewBox user-unit number and reusing that key would have silently redefined
// what every returning user's stored digit meant. The old key is read exactly
// once, converted at the size the editor has always opened at (see
// `stickyStrokePx`), and then left alone — the first slider move writes the
// pixel key, which wins from then on.
const STROKE_KEY = 'vs-icon-stroke-px'
const LEGACY_STROKE_KEY = 'vs-icon-stroke'
function readStickyStroke() {
  try {
    return stickyStrokePx(localStorage.getItem(STROKE_KEY), localStorage.getItem(LEGACY_STROKE_KEY))
  } catch { return STROKE_PX.default }
}
function writeStickyStroke(v) {
  try { localStorage.setItem(STROKE_KEY, String(v)) } catch { /* private mode / quota — non-fatal */ }
}

// ── Style coherence ──────────────────────────────────────────────────────────
// Several Iconify prefixes ship MULTIPLE styles under one prefix, so a raw
// /collection dump mixes stroked and filled glyphs. That is why "Outlined" was
// showing filled icons: Phosphor (`ph`) carries `-fill`/`-duotone` weights,
// Heroicons/Iconoir carry `-solid`, Tabler carries `-filled`. These per-pack,
// suffix-anchored matchers keep only the names whose glyph matches the chosen
// style, so a style filter shows ONE coherent look (never a filled icon under
// "Outlined"). Packs absent here are single-style — every name is kept.
const STYLE_RULES = {
  ph:                 { outlined: n => !/-(?:thin|light|bold|fill|duotone)$/.test(n) },
  heroicons:          { outlined: n => !/-solid$/.test(n) },
  iconoir:            { outlined: n => !/-solid$/.test(n) },
  tabler:             { outlined: n => !/-filled$/.test(n) },
  mdi:                { solid: n => !/-outline$/.test(n) },
  'material-symbols': { solid: n => !/-(?:outline(?:-(?:rounded|sharp))?|rounded|sharp)$/.test(n) },
  solar:              { solid: n => /-bold(?:-duotone)?$/.test(n) },
}
// The style a single pack browses in — so picking "Phosphor" under Interface
// (outlined) directly never dumps its fill weights either.
const PACK_STYLE = {
  lucide: 'outlined', tabler: 'outlined', iconoir: 'outlined', heroicons: 'outlined', ph: 'outlined',
  mdi: 'solid', 'material-symbols': 'solid', solar: 'solid', 'fa6-solid': 'solid', bxs: 'solid',
}
const matchesStyle = (pack, name, style) => {
  const rule = STYLE_RULES[pack]?.[style]
  return rule ? rule(name) : true
}
const keepStyle = (pack, names, style) => {
  const rule = STYLE_RULES[pack]?.[style]
  return rule ? names.filter(rule) : names
}

function buildSvgUrl(host, pack, name, params = {}) {
  let url = `${host}/${pack}/${name}.svg`
  const parts = []
  if (params.size) { parts.push(`width=${params.size}`, `height=${params.size}`) }
  if (params.color) parts.push(`color=${encodeURIComponent(params.color)}`)
  if (params.rotate) parts.push(`rotate=${params.rotate}deg`)
  const flipVal = [params.flipH && 'horizontal', params.flipV && 'vertical'].filter(Boolean).join(',')
  if (flipVal) parts.push(`flip=${flipVal}`)
  if (params.download) parts.push('download=1')
  if (parts.length) url += '?' + parts.join('&')
  return url
}

async function fetchWithFallback(path, timeout = 4000) {
  for (const host of API_HOSTS) {
    try {
      const r = await fetch(`${host}${path}`, { signal: AbortSignal.timeout(timeout) })
      if (r.ok) return r
    } catch { /* try next host */ }
  }
  throw new Error('All API hosts failed')
}

// Base SVG markup cache. Only the parameterless variant is cached — it's the
// only one the customizer requests, and params would fragment the cache for no
// benefit. `svgTextCache` holds the in-flight promise (concurrent callers
// dedupe); `svgTextReady` holds resolved text for synchronous reads, so the
// customizer can seed its stage on first paint with no "Loading…" flash.
const svgTextCache = new Map()
const svgTextReady = new Map()
const svgKey = (pack, name) => `${pack}:${name}`

function fetchSvgText(pack, name, params = {}) {
  const cacheable = !params || Object.keys(params).length === 0
  const key = svgKey(pack, name)
  if (cacheable && svgTextCache.has(key)) return svgTextCache.get(key)
  const p = (async () => {
    for (const host of API_HOSTS) {
      try {
        const url = buildSvgUrl(host, pack, name, params)
        const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
        if (r.ok) return await r.text()
      } catch { /* try next host */ }
    }
    throw new Error('Failed to fetch icon SVG')
  })()
  if (cacheable) {
    svgTextCache.set(key, p)
    // Failures aren't cached — a flaky network shouldn't poison the icon forever.
    p.then(txt => svgTextReady.set(key, txt)).catch(() => svgTextCache.delete(key))
  }
  return p
}

// Fire-and-forget warm-up on grid hover/focus, so by the time the click lands
// the customizer's base markup is usually already resolved.
const prefetchIconSvg = (icon) => {
  if (icon?.cdn && !icon.custom && !icon.logo) fetchSvgText(icon.pack, icon.name).catch(() => {})
}

// ── Brand-glyph contrast chips ───────────────────────────────────────────────
// Colored/brand artwork keeps its own colours, so the grid can't tint it for
// contrast the way `ig-inv` does for monochrome packs. Instead each glyph sits
// on a chip using the Stage's light gradient by default; if the artwork itself
// is near-white (Apple, OpenAI, GitHub-in-dark…) we sample its pixels once and
// flip that icon's chip to the dark Stage gradient. Tone is remembered per icon
// so scrolling or reopening never re-samples.
const glyphCache = new Map() // 'pack:name' → { tone, ar } (chip tone + ink aspect)

// A BRAND LOCKUP IS NOT A SQUARE MARK, AND THE GRID USED TO PRETEND IT WAS.
//
// Founder, 2026-09-04: "check our rendering for alot of the icons, alot of the
// icons are not rendering correctly". Measured on /create/icons under the Brand
// logos filter at 1440x900: `logos/aerospike` painted 24 x 2.1px inside its
// 24 x 24 box and `logos/active-campaign` 24 x 2.4px. Illegible - and NOT a
// fetch failure: all 120 mounted tiles loaded, every one the real artwork.
//
// TWO CAUSES, ONE SYMPTOM, and one measurement reaches both:
//   a) `logos` ships genuinely wide viewBoxes. Censused against the Iconify API:
//      839 of 1,880 (45%) are off-square, 625 (33%) exceed 2:1, worst `rolldown`
//      at 11.8:1 (512 x 43.39). Requesting ?width=24&height=24 pins the box and
//      leaves the viewBox alone, so the art letterboxes to a thin strip.
//   b) `devicon` ships 422 `-wordmark` entries on a SQUARE 128 x 128 canvas with
//      a horizontal lockup drawn small inside it. The aspect ratio is honest and
//      no viewBox handling can reach it - the artwork's own margins are the
//      problem. These are the entries the founder named: adonisjs-wordmark,
//      aerospike-wordmark, aframe-wordmark, akka-wordmark, algolia-wordmark.
//
// So the signal is the INK, not the box: the bounding box of the opaque pixels.
// That number is wide for (a) and for (b) alike. This canvas pass already ran on
// every one of these glyphs to choose the chip tone, so the extra cost is one
// comparison per pixel and no extra decode.
//
// Colored/brand artwork keeps its own colours, so the grid can't tint it for
// contrast the way `ig-inv` does for monochrome packs. Instead each glyph sits
// on a chip using the Stage's light gradient by default; if the artwork itself
// is near-white (Apple, OpenAI, GitHub-in-dark...) we flip that icon's chip to
// the dark Stage gradient. Both facts are remembered per icon, so scrolling or
// reopening never re-samples.

// Average relative luminance of the glyph's opaque pixels, plus the aspect ratio
// of the box those pixels occupy. Near-white artwork (avg > .82) needs the dark
// chip. Any failure (CORS taint, decode error) falls back to a light chip and a
// square ink box - which is exactly the treatment every icon had before this
// measurement existed, so a sampling failure degrades to the old behaviour
// rather than to a broken one.
//
// S is 64 rather than 24 because a 10:1 lockup occupies two rows of a 24px
// raster: enough to see, not enough to measure. At 64 it is a six-row band and
// the ratio is stable.
function sampleGlyph(img) {
  try {
    const S = 64
    const canvas = document.createElement('canvas')
    canvas.width = S
    canvas.height = S
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, S, S)
    const { data } = ctx.getImageData(0, 0, S, S)
    const toLin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    let sum = 0
    let n = 0
    let x0 = S, y0 = S, x1 = -1, y1 = -1
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 64) continue
      sum += 0.2126 * toLin(data[i]) + 0.7152 * toLin(data[i + 1]) + 0.0722 * toLin(data[i + 2])
      n++
      const p = i / 4
      const px = p % S
      const py = (p - px) / S
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
    }
    if (n === 0) return { tone: 'light', ar: 1, cap: 1 }
    // The raster is SQUARE and drawImage stretched the art to fill it, so the
    // measured ink box is the true one divided by the image own aspect. Undoing
    // that is what makes one number cover both causes: a square-canvas devicon
    // wordmark contributes all of its width through the ink box (natural 1), a
    // wide logos viewBox contributes all of its width through the natural aspect
    // (ink box roughly square), and anything in between composes correctly.
    const { ar, cap } = inkShape({
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      inkW: x1 - x0 + 1,
      inkH: y1 - y0 + 1,
      raster: S,
    })
    return { tone: sum / n > 0.82 ? 'dark' : 'light', ar, cap }
  } catch { return { tone: 'light', ar: 1, cap: 1 } }
}


// Iconify-served brand glyph on a tone-aware chip. crossOrigin is safe here —
// the same API already answers CORS fetches in fetchSvgText — but logo.dev
// images must NOT use this component (unknown CORS policy; a crossOrigin
// failure would blank the image entirely), so they get a plain light chip.
//
// THE REQUEST ASKS FOR A HEIGHT, NOT A BOX. `?width=24&height=24` pinned both
// dimensions and left the viewBox alone, so the API returned a 24 x 24 SVG that
// letterboxed a 512 x 45 lockup into a 2px strip. `?height=48` lets the width
// follow the artwork, so the element's intrinsic aspect is finally the truth
// about the art. Square glyphs are unaffected - the CSS still paints them in a
// 24px box - and 48 gives the wide chip resolution to scale from.
function BrandGlyph({ pack, name }) {
  const key = svgKey(pack, name)
  const [shape, setShape] = useState(() => glyphCache.get(key) || { tone: 'light', ar: 1, cap: 1 })
  const cached = glyphCache.get(key)
  if (cached && cached !== shape) setShape(cached)
  const onLoad = (e) => {
    if (glyphCache.has(key)) return
    const next = sampleGlyph(e.currentTarget)
    glyphCache.set(key, next)
    setShape(next)
  }
  const wide = shape.ar > WIDE_INK
  return (
    <span
      className={`ig-chip${shape.tone === 'dark' ? ' ig-chip--dark' : ''}${wide ? ' ig-chip--wide' : ''}`}
      style={wide ? { '--ig-wide-cap': shape.cap } : undefined}
    >
      <img
        src={`https://api.iconify.design/${pack}/${name}.svg?height=48`}
        crossOrigin="anonymous"
        loading="lazy"
        alt={name}
        onLoad={onLoad}
      />
    </span>
  )
}

// ── Pure helpers (module scope — reused by the customizer + browse fns) ───────

// Round-robin merge so the grid mixes packs (outlined+solid+coloured+…) instead
// of dumping one pack fully before the next.
function interleavePacks(lists) {
  const maxLen = lists.reduce((m, l) => Math.max(m, l.length), 0)
  const merged = []
  for (let i = 0; i < maxLen; i++) for (const l of lists) if (i < l.length) merged.push(l[i])
  return merged
}

// Pro-gated custom store. Callers MUST check isPro before invoking these for a
// non-Pro user — the store is never touched for non-Pro (anti-tamper).
function readCustomIcons() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}
function writeCustomIcons(list) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); return true }
  catch { return false }
}

function newCustomIconStamp() {
  return {
    key: `${CUSTOM_KEY}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  }
}

// Custom (base N) naming: count existing saves of the same base, then N = count+1.
function nextCustomName(base, existing) {
  const count = existing.filter(c => c.base === base).length
  const iteration = count + 1
  return { iteration, name: `Custom (${base} ${iteration})` }
}

// WCAG relative luminance of a hex colour (0 = black, 1 = white). Drives the
// contrast-aware Stage swap so a black icon never disappears on #0E0E11.
function relativeLuminance(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return 1
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const toLin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const r = toLin(parseInt(h.slice(0, 2), 16))
  const g = toLin(parseInt(h.slice(2, 4), 16))
  const b = toLin(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Sanitise arbitrary SVG markup (fetched OR pasted) before it ever touches the
// DOM: parse, drop <script>, strip on* handlers and javascript: hrefs. Returns
// the cleaned <svg> string, or null if it isn't valid SVG.
function sanitizeSvgMarkup(text) {
  if (!text || typeof text !== 'string') return null
  try {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    if (doc.querySelector('parsererror')) return null
    const svg = doc.querySelector('svg')
    if (!svg) return null
    svg.querySelectorAll('script').forEach(n => n.remove())
    const walk = (el) => {
      for (const a of [...el.attributes]) {
        const name = a.name.toLowerCase()
        const val = (a.value || '').trim().toLowerCase()
        if (name.startsWith('on')) el.removeAttribute(a.name)
        else if ((name === 'href' || name === 'xlink:href') && val.startsWith('javascript:')) el.removeAttribute(a.name)
      }
      for (const child of [...el.children]) walk(child)
    }
    walk(svg)
    return svg.outerHTML
  } catch { return null }
}

// Build a neutral (currentColor) base SVG for an embedded icon — no width/height
// so the Stage CSS drives its size live.
function embeddedSvgMarkup(icon) {
  return icon.filled
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
}

// Heuristic: does this markup describe a stroke-based icon (so we show the
// stroke control)? fill:none + a real stroke colour.
function detectPastedStroke(svg) {
  if (!svg) return false
  return /fill\s*=\s*["']none["']/i.test(svg) && /stroke\s*=\s*["'](?!none)[^"']+["']/i.test(svg)
}

// Re-neutralise a saved custom's baked root colour back to currentColor so the
// Stage can live-recolour it again on re-open.
function normalizeCustomBase(svg) {
  if (!svg) return svg
  return svg
    .replace(/(<svg\b[^>]*?)\sstroke="(?!none)[^"]*"/i, '$1 stroke="currentColor"')
    .replace(/(<svg\b[^>]*?)\sfill="(?!none)[^"]*"/i, '$1 fill="currentColor"')
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg || '')}`
}

// viewBox-centred rotate/flip transform used when baking output markup.
function transformAttr(rotate, flipH, flipV, cx, cy) {
  const parts = []
  if (rotate) parts.push(`rotate(${rotate} ${cx} ${cy})`)
  if (flipH || flipV) parts.push(`translate(${cx} ${cy}) scale(${flipH ? -1 : 1} ${flipV ? -1 : 1}) translate(${-cx} ${-cy})`)
  return parts.join(' ')
}

// Bake the live customiser values into REAL SVG attributes so copied/saved/
// downloaded markup matches the Stage exactly (this is the Lucide copy-reset
// #2794 workaround — never fall back to defaults).
function serializeCustomizedSvg(rawSvg, opts = {}) {
  if (!rawSvg) return ''
  const { size = 48, color, stroke, isStroke, absStroke, cap, join, rotate = 0, flipH = false, flipV = false } = opts
  let doc
  try { doc = new DOMParser().parseFromString(rawSvg, 'image/svg+xml') } catch { return rawSvg }
  const svg = doc.querySelector('svg')
  if (!svg) return rawSvg
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  if (color) {
    // The Stage resolves `currentColor` via the CSS `color` property, so setting
    // it on the root makes EVERY currentColor child (fill or stroke) resolve to
    // the chosen colour in the exported file too — without this the standalone
    // SVG falls back to black and the colour edit is silently dropped. The
    // explicit fill/stroke below still covers icons that bake literal colours.
    svg.setAttribute('color', color)
    if (isStroke) {
      svg.setAttribute('stroke', color)
      if (svg.getAttribute('fill') && svg.getAttribute('fill') !== 'none') svg.setAttribute('fill', color)
    } else {
      svg.setAttribute('fill', color)
    }
  }
  // `stroke` arrives in PIXELS. stroke-width is written in viewBox user units,
  // so it has to be divided by the scale this file will be rendered at —
  // otherwise a 2 lands on screen as 4px at the default size. `strokeAttrForPx`
  // owns that conversion and the Stage calls the same function, so preview and
  // exported file cannot disagree. See src/utils/iconStroke.js.
  const box = viewBoxOf(rawSvg)
  // The Stage forces stroke width/cap/join on the svg AND every descendant
  // (CSS `svg, svg *`). Mirror that here so icons whose child shapes carry their
  // own stroke attributes export with the edits applied, not the originals.
  if (isStroke) {
    const strokeAttr = strokeAttrForPx({ px: stroke, size, viewBox: box, absolute: absStroke })
    const shapes = [svg, ...svg.querySelectorAll('*')]
    for (const el of shapes) {
      if (strokeAttr != null) el.setAttribute('stroke-width', String(strokeAttr))
      if (absStroke) el.setAttribute('vector-effect', 'non-scaling-stroke')
      if (cap) el.setAttribute('stroke-linecap', cap)
      if (join) el.setAttribute('stroke-linejoin', join)
    }
  }
  const vb = (svg.getAttribute('viewBox') || '0 0 24 24').split(/\s+/).map(Number)
  const cx = (vb[0] || 0) + (vb[2] || 24) / 2
  const cy = (vb[1] || 0) + (vb[3] || 24) / 2
  const tf = transformAttr(rotate, flipH, flipV, cx, cy)
  if (tf) {
    const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', tf)
    while (svg.firstChild) g.appendChild(svg.firstChild)
    svg.appendChild(g)
  }
  return svg.outerHTML
}

// Robust clipboard write: async Clipboard API with a legacy execCommand
// fallback. Returns whether the copy landed (so callers never fake success).
async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:absolute;left:-9999px;top:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

// Map an active icon to the recents payload. Pasted icons have no stable
// identity, so they aren't tracked (returns null → addRecentIcon no-ops).
function recentPayload(icon) {
  if (!icon || icon.pasted) return null
  if (icon.cdn) return { cdn: true, pack: icon.pack, name: icon.custom ? icon.base : icon.name }
  if (icon.d) return { cdn: false, name: icon.name, d: icon.d, filled: !!icon.filled }
  return null
}

// Pro-gated line-style options. Each button previews its OWN effect: a thick
// stub whose ends / corner render in the exact cap or join it sets, so the
// choice is visual, not a word.
const CAP_OPTS = [
  { v: 'round', label: 'Round ends', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" aria-hidden="true"><line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round" /></svg> },
  { v: 'butt', label: 'Flat ends', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" aria-hidden="true"><line x1="7" y1="12" x2="17" y2="12" strokeLinecap="butt" /></svg> },
  { v: 'square', label: 'Square ends', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" aria-hidden="true"><line x1="7" y1="12" x2="17" y2="12" strokeLinecap="square" /></svg> },
]
const JOIN_OPTS = [
  { v: 'round', label: 'Round corners', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" aria-hidden="true"><path d="M6 18 L12 7 L18 18" strokeLinejoin="round" /></svg> },
  { v: 'miter', label: 'Sharp corners', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" aria-hidden="true"><path d="M6 18 L12 7 L18 18" strokeLinejoin="miter" /></svg> },
  { v: 'bevel', label: 'Bevel corners', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" aria-hidden="true"><path d="M6 18 L12 7 L18 18" strokeLinejoin="bevel" /></svg> },
]

// ── Icon customizer ──────────────────────────────────────────────────────────
// Replaces the old IconDetail. A structural sibling of ExportPanel: a dark
// spotlight "Stage" with live --ig-* preview, sanitised inline SVG, copy
// serialisation, and a Pro-gated Save. Adopts ExportPanel's a11y verbatim.
function IconCustomizer({ icon, addMode, isPro, saveLimit = Infinity, onClose, onCopy, onPick }) {
  const { user } = useAuth()
  const { projects, saveProject, projectLimit } = useProject()
  const { openProModal } = useProModal()
  const { requireLogin } = useLoginPrompt()
  const { theme } = useTheme()
  // The stage follows the site theme: in light mode an un-tinted icon previews
  // dark-on-light, in dark mode white-on-dark — so what you see matches where
  // you'll paste it. An explicit colour choice always overrides this.
  const themeInk = theme === 'light' ? '#18181B' : '#F4F4F5'
  const panelRef = useRef(null)
  const stageRef = useRef(null)
  const hostRef = useRef(null)
  const restoreRef = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  const [pasted, setPasted] = useState(null)      // { svg, isStroke } for add-mode
  const [pasteText, setPasteText] = useState('')
  const [pasteErr, setPasteErr] = useState(false)

  const activeIcon = useMemo(() => {
    if (icon) return icon
    if (pasted) return { name: 'custom-icon', base: 'icon', svg: pasted.svg, cdn: false, filled: !pasted.isStroke, pasted: true }
    return null
  }, [icon, pasted])

  // Seed controls from a re-opened custom's saved values, then from a validated
  // homepage draft (`draftSize` / `draftStroke` — bounded values, nothing else),
  // then from the defaults.
  const [size, setSize] = useState(() => (icon?.custom && icon.size) || icon?.draftSize || 48)
  const [color, setColor] = useState(() => (icon?.custom && icon.color) || '')
  // A saved custom keeps its own stroke; anything else opens at the sticky width.
  // Both arrive in whatever unit their era used, so both go through the pixel
  // conversion: a pre-fix record stored viewBox units next to its own size, and
  // the homepage draft is a user-unit number for a 24-grid glyph. Converting at
  // the boundary means a saved icon re-opens at the weight it was saved at.
  const [stroke, setStroke] = useState(() => (
    (icon?.custom ? customIconStrokePx(icon) : null)
    ?? draftStrokePx(icon?.draftStroke, icon?.draftSize)
    ?? readStickyStroke()
  ))
  const [absStroke, setAbsStroke] = useState(() => !!(icon?.custom && icon.absStroke))
  const [cap, setCap] = useState(() => (icon?.custom && icon.cap) || 'round')
  const [join, setJoin] = useState(() => (icon?.custom && icon.join) || 'round')
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [copied, setCopied] = useState('')
  const [savedState, setSavedState] = useState(() => (icon?.custom ? 'saved' : 'idle'))
  // Save-to-project picker: saving is a two-step flow — choose a project, then
  // write — so the free per-PROJECT icon cap can be enforced at pick time.
  const [savePickerOpen, setSavePickerOpen] = useState(false)
  // Which project the current edit landed in — drives the "Saved to X" button
  // label. Seeded from a re-opened custom's stored projectId.
  const [savedProjectId, setSavedProjectId] = useState(() => (icon?.custom && icon.projectId) || null)
  // Hovering a saved button re-arms it ("Save to another project").
  const [saveHover, setSaveHover] = useState(false)
  // Inline new-project creation inside the picker: naming is REQUIRED before
  // an icon can be assigned to a fresh project.
  const [newProjOpen, setNewProjOpen] = useState(false)
  const [newProjName, setNewProjName] = useState('')

  // Pro asks (daily copy cap, project cap, line styles) all open the canonical
  // Wave-1 Pro modal — one upgrade surface, no per-page variants. The edit in
  // progress here stays untouched behind the overlay, so nothing is lost.
  const showProGate = (kind) => {
    const presets = {
      copies: {
        title: 'You’ve hit today’s free copy limit',
        subtitle: `The free plan includes ${FREE_COPIES_PER_DAY} icon copies per day — the counter resets tomorrow. Go Pro for unlimited copies.`,
      },
      projects: {
        title: 'You’re at the free project limit',
        subtitle: `The free plan includes ${Number.isFinite(projectLimit) ? projectLimit : 3} projects. Go Pro for unlimited projects and icon saves.`,
      },
      line: {
        title: 'Upgrade to Pro to use this feature',
        subtitle: 'Line styles let you fine-tune stroke ends and corners — and Pro unlocks every other colour and icon tool too.',
      },
    }
    // `gate` is DERIVED from the kind rather than written into each preset, so
    // a kind added later is measured under its own name by existing — the same
    // reason trackUpgradeGate lives in ProModalContext and not at the 16 call
    // sites. Without it all three of these walls reported as their modal title,
    // and "Upgrade to Pro to use this feature" names nothing.
    openProModal({ gate: `icon-${kind}`, ...(presets[kind] || {}) })
  }

  // Saving is FREE — it just needs an account (projects are account-scoped).
  // Open the single-click login popup over this page; on success resume the
  // save-picker in place so the edit continues without a tab hop.
  const promptSaveLogin = async () => {
    const u = await requireLogin('save icons')
    if (u) setSavePickerOpen(true)
  }
  // Per-project custom-icon counts, read fresh each time the picker opens so
  // the "n/limit" badges reflect the live store.
  const projectCounts = useMemo(() => {
    if (!savePickerOpen) return {}
    const counts = {}
    for (const r of readCustomIcons()) {
      if (r.projectId) counts[r.projectId] = (counts[r.projectId] || 0) + 1
    }
    return counts
  }, [savePickerOpen])

  const isColoredPack = !!(activeIcon?.cdn && COLORED_PACKS.has(activeIcon.pack))
  const isStroke = useMemo(() => {
    if (!activeIcon) return false
    if (activeIcon.custom) return !!activeIcon.isStroke
    if (activeIcon.svg) return detectPastedStroke(activeIcon.svg)
    if (activeIcon.cdn) return STROKE_PACKS.has(activeIcon.pack) && matchesStyle(activeIcon.pack, activeIcon.name, 'outlined')
    return !activeIcon.filled
  }, [activeIcon])
  const rendersInline = !!activeIcon && (!!activeIcon.svg || (activeIcon.cdn ? isStroke : true))

  // Synchronous base markup for non-CDN sources (memoised — no setState churn).
  const localBase = useMemo(() => {
    if (!activeIcon) return null
    if (activeIcon.custom && activeIcon.svg) return normalizeCustomBase(activeIcon.svg)
    if (activeIcon.svg) return sanitizeSvgMarkup(activeIcon.svg)
    if (!activeIcon.cdn) return embeddedSvgMarkup(activeIcon)
    return null
  }, [activeIcon])

  // CDN base fetched once per icon, keyed by identity so a stale response from a
  // previous icon can never paint. All setState here is async (never in-render).
  const [fetched, setFetched] = useState({ id: null, svg: null, err: false })
  useEffect(() => {
    if (!activeIcon || !activeIcon.cdn || activeIcon.custom) return
    const id = activeIcon.id || `${activeIcon.pack}:${activeIcon.name}`
    let cancelled = false
    fetchSvgText(activeIcon.pack, activeIcon.name, {})
      .then(txt => {
        if (cancelled) return
        const clean = sanitizeSvgMarkup(txt)
        setFetched(clean ? { id, svg: clean, err: false } : { id, svg: null, err: true })
      })
      .catch(() => { if (!cancelled) setFetched({ id, svg: null, err: true }) })
    return () => { cancelled = true }
  }, [activeIcon])

  // Similar icons — same pack, same name-root (e.g. arrow-left surfaces
  // arrow-right / arrow-up). A foot-of-popup retention nudge: keep users building
  // a consistent set inside the customizer instead of bouncing back to the grid.
  // Only for plain CDN icons (custom/pasted have no pack sibling to mine).
  // Keyed by icon identity (like `fetched`) so a stale pack response can never
  // paint the wrong siblings, and so we never reset state synchronously in-render.
  const [similar, setSimilar] = useState({ id: null, list: [] })
  useEffect(() => {
    if (!activeIcon?.cdn || activeIcon.custom || activeIcon.pasted) return
    const { pack, name } = activeIcon
    if (!pack || !name) return
    const id = activeIcon.id || `${pack}:${name}`
    const root = name.split(/[-_]/)[0]
    if (!root) return
    let cancelled = false
    getCollectionNames(pack)
      .then(({ names }) => {
        if (cancelled) return
        setSimilar({
          id,
          list: names
            .filter(n => n !== name && n.split(/[-_]/)[0] === root)
            .slice(0, 6)
            .map(n => ({ id: `${pack}:${n}`, pack, name: n, cdn: true })),
        })
      })
      .catch(() => { /* non-fatal — just hide the row */ })
    return () => { cancelled = true }
  }, [activeIcon])

  const currentId = activeIcon ? (activeIcon.id || `${activeIcon.pack}:${activeIcon.name}`) : null
  const similarList = similar.id === currentId ? similar.list : []
  const fetchedBase = fetched.id === currentId ? fetched.svg : null
  const loadErr = fetched.id === currentId ? fetched.err : false
  // Synchronous seed from the module cache — an icon whose markup was already
  // resolved (grid hover prefetch, or opened before) paints on the very first
  // frame instead of flashing "Loading…" while the effect round-trips.
  const cachedCdnBase = useMemo(() => {
    if (!activeIcon?.cdn || activeIcon.custom) return null
    const raw = svgTextReady.get(svgKey(activeIcon.pack, activeIcon.name))
    return raw ? sanitizeSvgMarkup(raw) : null
  }, [activeIcon])
  const baseSvgText = localBase || fetchedBase || cachedCdnBase

  // Inject the neutral base inline on the Stage; CSS vars drive its appearance.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = rendersInline && baseSvgText ? baseSvgText : ''
  }, [rendersInline, baseSvgText])

  // Live preview via the ONLY permitted inline-style channel: setProperty.
  //
  // `--ig-stroke` feeds a CSS `stroke-width`, which the Stage resolves in the
  // SAME viewBox user units the exported file uses — so it goes through the
  // same px→units conversion the serializer runs. Preview and download read
  // one function; they cannot drift.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const strokeAttr = strokeAttrForPx({
      px: stroke, size, viewBox: viewBoxOf(baseSvgText), absolute: absStroke,
    })
    stage.style.setProperty('--ig-size', `${size}px`)
    stage.style.setProperty('--ig-stroke', String(strokeAttr ?? STROKE_PX.default))
    stage.style.setProperty('--ig-color', color || themeInk)
    stage.style.setProperty('--ig-cap', cap)
    stage.style.setProperty('--ig-join', join)
    const tf = []
    if (rotate) tf.push(`rotate(${rotate}deg)`)
    if (flipH) tf.push('scaleX(-1)')
    if (flipV) tf.push('scaleY(-1)')
    stage.style.setProperty('--ig-transform', tf.length ? tf.join(' ') : 'none')
  }, [size, stroke, color, cap, join, rotate, flipH, flipV, themeInk, absStroke, baseSvgText])

  // Lock body scroll + restore focus to the opener on unmount (mirror ExportPanel).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    getLenis()?.stop()
    const opener = restoreRef.current
    return () => {
      document.body.style.overflow = prev
      getLenis()?.start()
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  // Move focus into the panel, trap Tab, close on Escape (mirror ExportPanel).
  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const f = panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!f || f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const serializedOutput = useMemo(
    () => serializeCustomizedSvg(baseSvgText, { size, color: color || undefined, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV }),
    [baseSvgText, size, color, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV],
  )

  const stageImgUrl = useMemo(() => {
    if (!activeIcon?.cdn) return ''
    const p = { size }
    const imgColor = isColoredPack ? '' : (color || themeInk)
    if (imgColor) p.color = imgColor
    if (rotate) p.rotate = rotate
    if (flipH) p.flipH = true
    if (flipV) p.flipV = true
    return buildSvgUrl(API_HOSTS[0], activeIcon.pack, activeIcon.name, p)
  }, [activeIcon, size, color, isColoredPack, themeInk, rotate, flipH, flipV])

  // Brand/colored artwork: the Stage tone follows the same sampled per-icon tone
  // as the grid chips — light gradient unless the artwork is near-white. Seeded
  // from the shared cache (usually already populated by the grid), refined by
  // the stage image's own onLoad sampling if not.
  const brandKey = activeIcon?.cdn && !activeIcon.custom ? svgKey(activeIcon.pack, activeIcon.name) : null
  const [brandTone, setBrandTone] = useState(() => (brandKey && glyphCache.get(brandKey)?.tone) || 'light')
  const [prevBrandKey, setPrevBrandKey] = useState(brandKey)
  if (brandKey !== prevBrandKey) {
    // Derive-during-render on icon change (no effect → no cascading-render lint).
    setPrevBrandKey(brandKey)
    setBrandTone((brandKey && glyphCache.get(brandKey)?.tone) || 'light')
  }
  const onStageImgLoad = (e) => {
    if (!isColoredPack) return
    const key = svgKey(activeIcon.pack, activeIcon.name)
    if (!glyphCache.has(key)) glyphCache.set(key, sampleGlyph(e.currentTarget))
    setBrandTone(glyphCache.get(key).tone)
  }

  const effectiveColor = isColoredPack ? '#F4F4F5' : (color || themeInk)
  const stageIsLight = isColoredPack ? brandTone === 'light' : relativeLuminance(effectiveColor) < 0.35

  const markDirty = () => setSavedState(s => (s === 'saved' ? 'idle' : s))

  const applyPaste = () => {
    const clean = sanitizeSvgMarkup(pasteText)
    if (!clean) { setPasteErr(true); return }
    setPasteErr(false)
    setPasted({ svg: clean, isStroke: detectPastedStroke(clean) })
  }

  // Free-tier daily cap: gate BEFORE the clipboard write, so a capped copy is a
  // pure no-op that opens the upgrade prompt — nothing lands on the clipboard.
  const handleCopySvg = async () => {
    if (!isPro && readCopyCount() >= FREE_COPIES_PER_DAY) { showProGate('copies'); return }
    const ok = await writeClipboard(serializedOutput)
    if (!ok) return
    if (!isPro) bumpCopyCount()
    trackIconCopy(activeIcon?.pack || null, activeIcon?.name || 'icon')
    setCopied('svg')
    setTimeout(() => setCopied(''), 2000)
    if (onCopy) onCopy(serializedOutput)
    addRecentIcon(recentPayload(activeIcon), 'copy')
  }

  const handleCopyCode = async () => {
    if (!isPro && readCopyCount() >= FREE_COPIES_PER_DAY) { showProGate('copies'); return }
    const ok = await writeClipboard(serializedOutput)
    if (!ok) return
    if (!isPro) bumpCopyCount()
    trackIconCopy(activeIcon?.pack || null, activeIcon?.name || 'icon')
    setCopied('code')
    setTimeout(() => setCopied(''), 2000)
  }

  const handleDownload = () => {
    if (!serializedOutput) return
    try {
      const blob = new Blob([serializedOutput], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(activeIcon?.name || 'icon').replace(/[^\w.-]+/g, '-')}.svg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { /* ignore */ }
  }

  // Saving is a two-step flow: pick a project, then write. Signed-out users are
  // gated to login first — projects are account-scoped, so the per-project save
  // cap can't be enforced without one.
  const handleSave = () => {
    if (!activeIcon || !baseSvgText) return
    if (!user) { promptSaveLogin(); return }
    setSavePickerOpen(true)
  }

  // ANTI-TAMPER: the per-project cap is enforced BEFORE any compute — an
  // over-cap non-Pro save routes to checkout with no record built and the
  // Custom store never written.
  const handleSaveToProject = (projectId) => {
    if (!activeIcon || !baseSvgText) return
    const existing = readCustomIcons()
    const used = existing.filter(r => r.projectId === projectId).length
    if (!isPro && used >= saveLimit) { setSavePickerOpen(false); openInNewTab('/checkout'); return }
    const base = activeIcon.custom ? activeIcon.base : (activeIcon.cdn || activeIcon.d ? activeIcon.name : 'icon')
    const { iteration, name } = nextCustomName(base, existing)
    const colored = isColoredPack || !!color || (activeIcon.pasted === true && !isStroke)
    const svg = serializeCustomizedSvg(baseSvgText, { size, color: color || undefined, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV })
    const record = {
      ...newCustomIconStamp(),
      base, iteration, name, projectId,
      pack: activeIcon.pack || null, cdn: !!activeIcon.cdn,
      svg, color: color || '', size, stroke, absStroke, cap, join, isStroke, colored,
      // Stamp the unit. Records without it predate the pixel fix and stored
      // `stroke` in viewBox units; `customIconStrokePx` converts those on read,
      // and this marker is what stops a converted value being converted twice.
      strokeUnit: STROKE_UNIT_PX,
    }
    setSavePickerOpen(false)
    setNewProjOpen(false)
    setNewProjName('')
    if (!writeCustomIcons([record, ...existing])) { setSavedState('error'); return }
    addRecentIcon(recentPayload(activeIcon), 'edit')
    setSavedProjectId(projectId)
    setSavedState('saved')
    setSaveHover(false)
  }

  // "New" in the picker: a 4th free project is the upgrade moment — close the
  // picker and surface the projects gate instead of a dead-end error.
  const handleNewProject = () => {
    if (!isPro && projects.length >= projectLimit) {
      setSavePickerOpen(false)
      showProGate('projects')
      return
    }
    setNewProjOpen(true)
  }

  const handleCreateAndSave = () => {
    const name = newProjName.trim()
    if (!name) return
    try {
      const id = saveProject(name, { blank: true })
      handleSaveToProject(id)
    } catch {
      setSavePickerOpen(false)
      showProGate('projects')
    }
  }

  // Reset every control to its opening default (a fresh, un-edited icon).
  const handleReset = () => {
    setSize(48)
    setColor('')
    setStroke(2)
    writeStickyStroke(2)
    setAbsStroke(false)
    setCap('round')
    setJoin('round')
    setRotate(0)
    setFlipH(false)
    setFlipV(false)
    markDirty()
  }

  const savedProjectName = useMemo(() => {
    if (!savedProjectId) return null
    return projects.find(p => p.id === savedProjectId)?.name || null
  }, [savedProjectId, projects])

  // Projects that already hold a saved copy of THIS base icon — surfaced at the
  // foot of the popup so opening the original still tells you where your edited
  // versions live.
  const savedInProjects = useMemo(() => {
    if (!activeIcon || activeIcon.custom || activeIcon.pasted) return []
    const names = new Set()
    for (const r of readCustomIcons()) {
      if (r.base !== activeIcon.name || (r.pack || null) !== (activeIcon.pack || null) || !r.projectId) continue
      const p = projects.find(x => x.id === r.projectId)
      if (p) names.add(p.name)
    }
    return [...names]
    // savedState: re-check after each save so the note appears immediately.
  }, [activeIcon, projects, savedState]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveLabel = savedState === 'saved'
    ? (saveHover ? 'Save to another project' : (savedProjectName ? `Saved to ${savedProjectName}` : 'Saved to Custom Icons'))
    : savedState === 'error' ? 'Couldn’t save — retry'
      : activeIcon?.custom ? 'Save as new' : 'Save to project'

  const title = addMode && !activeIcon ? 'Add a custom icon.' : (activeIcon?.name || 'Customise')

  return (
    <div className="icust-overlay" onMouseDown={onClose}>
      <div
        className="icust-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icust-title"
        ref={panelRef}
        tabIndex={-1}
        data-lenis-prevent
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="icust-head">
          <div className="icust-head-text">
            <span className="icust-eyebrow">{addMode && !activeIcon ? 'Add icon' : 'Customise'}</span>
            <h2 className="icust-title" id="icust-title">{title}</h2>
          </div>
          <button type="button" className="icust-close" onClick={onClose} aria-label="Close customizer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="icust-body">
        {!activeIcon ? (
          <div className="icust-paste">
            <p className="icust-paste-help">Paste SVG markup or the full <code>&lt;svg&gt;…&lt;/svg&gt;</code>. Tune it on the stage, then copy — or save it to Custom Icons with Pro.</p>
            <textarea
              className="icust-paste-input"
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setPasteErr(false) }}
              placeholder="<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; …>…</svg>"
              aria-label="SVG markup"
              spellCheck={false}
            />
            {pasteErr && <p className="icust-err">That doesn’t look like valid SVG. Paste the full &lt;svg&gt;…&lt;/svg&gt;.</p>}
            <div className="icust-foot">
              <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={onClose}>Cancel</button>
              <button type="button" className="ui-pill ui-pill-accent ui-pill-md" onClick={applyPaste}>Add to stage</button>
            </div>
          </div>
        ) : (
          <>
            <div className={`icust-stage${stageIsLight ? ' icust-stage--light' : ''}${absStroke ? ' is-abs' : ''}`} ref={stageRef}>
              {rendersInline ? (
                <>
                  <div ref={hostRef} className="icust-stage-host" aria-hidden="true" />
                  {!baseSvgText && <span className="icust-stage-msg">{loadErr ? 'Couldn’t load this icon.' : 'Loading…'}</span>}
                </>
              ) : (
                <img
                  className="icust-stage-img"
                  src={stageImgUrl}
                  width={size}
                  height={size}
                  alt={activeIcon.name}
                  crossOrigin={isColoredPack ? 'anonymous' : undefined}
                  onLoad={isColoredPack ? onStageImgLoad : undefined}
                />
              )}
            </div>

            <div className="icust-meta">
              <span className="icust-tag">{activeIcon.custom ? 'Custom' : activeIcon.pasted ? 'Pasted' : (activeIcon.pack || 'embedded')}</span>
              <span className="icust-tag">{activeIcon.name}</span>
              {activeIcon.cdn && !activeIcon.custom && <span className="icust-tag">CDN</span>}
            </div>

            <div className="icust-controls">
              <div className="icust-row">
                <label htmlFor="icust-size">Size</label>
                <SnapSlider
                  id="icust-size"
                  min={12}
                  max={128}
                  value={size}
                  defaultValue={48}
                  snaps={[12, 16, 24, 32, 48, 64, 96, 128]}
                  unit="px"
                  inputMax={1024}
                  ariaLabel="Icon size"
                  onChange={(v) => { setSize(v); markDirty() }}
                />
              </div>

              <div className="icust-row">
                <label>Colour</label>
                {isColoredPack ? (
                  <span className="icust-note">Original colours preserved</span>
                ) : (
                  <>
                    <div className="icust-seg">
                      <button type="button" className={!color ? 'active' : ''} onClick={() => { setColor(''); markDirty() }}>Default</button>
                      <button type="button" className={color === '#000000' ? 'active' : ''} onClick={() => { setColor('#000000'); markDirty() }}>Black</button>
                      <button type="button" className={color === '#ffffff' ? 'active' : ''} onClick={() => { setColor('#ffffff'); markDirty() }}>White</button>
                    </div>
                    <ColorPickerPop value={color || themeInk} onChange={(v) => { setColor(v); markDirty() }} />
                  </>
                )}
              </div>

              {isStroke && (
                <div className="icust-row">
                  <label htmlFor="icust-stroke">Stroke</label>
                  {/* The `px` unit is half the fix: the slider now reports the
                      width the exported file actually measures, at any size. */}
                  <SnapSlider
                    id="icust-stroke"
                    min={STROKE_PX.min}
                    max={STROKE_PX.max}
                    step={STROKE_PX.step}
                    value={stroke}
                    defaultValue={STROKE_PX.default}
                    snaps={STROKE_PX.snaps}
                    unit="px"
                    inputMin={STROKE_PX.inputMin}
                    inputMax={STROKE_PX.inputMax}
                    decimals={2}
                    ariaLabel="Stroke width in pixels"
                    onChange={(v) => { setStroke(v); writeStickyStroke(v); markDirty() }}
                  />
                  {/* Both modes now measure the same pixels AT THIS SIZE; they
                      differ only once someone rescales the exported file. Off:
                      the stroke scales with the artwork, the way an icon should.
                      On (non-scaling-stroke): it holds this pixel width at every
                      size it is ever drawn at. "Absolute" never said that. */}
                  <button
                    type="button"
                    className={`icust-abs${absStroke ? ' active' : ''}`}
                    aria-pressed={absStroke}
                    aria-label={`Fixed stroke width — hold ${stroke}px even when the SVG is resized`}
                    title={`Hold this stroke at ${stroke}px even if the SVG is resized later. Off: the stroke scales with the icon.`}
                    onClick={() => { setAbsStroke(a => !a); markDirty() }}
                  >Fixed</button>
                </div>
              )}

              {isStroke && (
                <div
                  className={`icust-pro${isPro ? '' : ' is-locked'}`}
                  onClick={!isPro ? () => showProGate('line') : undefined}
                >
                  <div className="icust-pro-head">
                    <span>Line style</span>
                    {!isPro && <span className="pnav-pop-tag">Pro</span>}
                  </div>
                  <div className="icust-row">
                    <label>Ends</label>
                    <div className="icust-seg icust-seg--icon">
                      {CAP_OPTS.map(o => (
                        <button key={o.v} type="button" className={cap === o.v ? 'active' : ''} title={o.label} aria-label={o.label} aria-pressed={cap === o.v}
                          onClick={() => { if (!isPro) return; setCap(o.v); markDirty() }}>
                          {o.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="icust-row">
                    <label>Corners</label>
                    <div className="icust-seg icust-seg--icon">
                      {JOIN_OPTS.map(o => (
                        <button key={o.v} type="button" className={join === o.v ? 'active' : ''} title={o.label} aria-label={o.label} aria-pressed={join === o.v}
                          onClick={() => { if (!isPro) return; setJoin(o.v); markDirty() }}>
                          {o.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="icust-row">
                <label>Rotate</label>
                <div className="icust-seg">
                  {[0, 90, 180, 270].map(deg => (
                    <button key={deg} type="button" className={rotate === deg ? 'active' : ''} onClick={() => { setRotate(deg); markDirty() }}>{deg}°</button>
                  ))}
                </div>
              </div>

              <div className="icust-row">
                <label>Flip</label>
                <div className="icust-seg">
                  <button type="button" className={flipH ? 'active' : ''} aria-pressed={flipH} onClick={() => { setFlipH(f => !f); markDirty() }}>Horizontal</button>
                  <button type="button" className={flipV ? 'active' : ''} aria-pressed={flipV} onClick={() => { setFlipV(f => !f); markDirty() }}>Vertical</button>
                </div>
              </div>
            </div>

            <div className="icust-code">
              <div className="icust-code-label">SVG</div>
              <button type="button" className="icust-code-box" onClick={handleCopyCode}>
                <span className="icust-code-hint">{copied === 'code' ? 'Copied!' : 'Click to copy'}</span>
                <code>{serializedOutput}</code>
              </button>
            </div>

            <div className="icust-foot">
              <button type="button" className="ui-pill ui-pill-accent ui-pill-md" onClick={handleCopySvg}>
                {copied === 'svg' ? 'Copied!' : 'Copy SVG'}
              </button>

              <button
                type="button"
                className="ui-pill ui-pill-out ui-pill-md"
                onClick={handleSave}
                onMouseEnter={() => setSaveHover(true)}
                onMouseLeave={() => setSaveHover(false)}
                onFocus={() => setSaveHover(true)}
                onBlur={() => setSaveHover(false)}
              >
                {saveLabel}
              </button>

              <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={handleDownload}>Download</button>

              <button type="button" className="ui-pill ui-pill-out ui-pill-md icust-reset" onClick={handleReset}>Reset to default</button>
            </div>

            {savedInProjects.length > 0 && (
              <p className="icust-savedin">
                Saved in {savedInProjects.length === 1 ? 'project' : 'projects'}: <strong>{savedInProjects.join(', ')}</strong>
              </p>
            )}

            {similarList.length > 0 && (
              <div className="icust-similar">
                <div className="icust-similar-label">Similar in this pack</div>
                <div className="icust-similar-row">
                  {similarList.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className="icust-similar-btn"
                      title={s.name}
                      aria-label={`Open ${s.name}`}
                      onClick={() => onPick?.(s)}
                    >
                      <img
                        src={buildSvgUrl(API_HOSTS[0], s.pack, s.name, { size: 24, color: isColoredPack ? undefined : themeInk })}
                        width="24"
                        height="24"
                        alt=""
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {savePickerOpen && (
          <div className="icust-gate-backdrop" onMouseDown={() => setSavePickerOpen(false)}>
            <div
              className="icust-gate"
              role="dialog"
              aria-modal="true"
              aria-labelledby="icust-pick-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="icust-gate-title" id="icust-pick-title">Save to a project</h3>
              <p className="icust-gate-copy">
                {Number.isFinite(saveLimit)
                  ? `Pick where this icon lives — the free plan saves up to ${saveLimit} icons per project.`
                  : 'Pick where this icon lives.'}
              </p>
              {projects.length > 0 && (
                <div className="icust-proj-list">
                  {projects.map((p) => {
                    const used = projectCounts[p.id] || 0
                    const full = !isPro && used >= saveLimit
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="icust-proj-btn"
                        disabled={full}
                        title={full ? `This project is at the free limit of ${saveLimit} icons.` : undefined}
                        onClick={() => handleSaveToProject(p.id)}
                      >
                        <span className="icust-proj-name">{p.name}</span>
                        <span className="icust-proj-count">
                          {Number.isFinite(saveLimit) ? `${used}/${saveLimit}` : `${used} saved`}
                          {full && <span className="pnav-pop-tag">Full</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {/* New-project path: naming is required — the create button stays
                  disabled until a name is typed. A 4th free project routes to
                  the upgrade gate instead (handleNewProject). */}
              {newProjOpen ? (
                <div className="icust-newproj">
                  <input
                    className="icust-newproj-input"
                    type="text"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndSave() }}
                    placeholder="Project name (required)"
                    aria-label="New project name"
                    maxLength={60}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ui-pill ui-pill-accent ui-pill-md"
                    disabled={!newProjName.trim()}
                    onClick={handleCreateAndSave}
                  >
                    Create &amp; save
                  </button>
                </div>
              ) : (
                <button type="button" className="icust-proj-btn icust-proj-btn--new" onClick={handleNewProject}>
                  <span className="icust-proj-name">+ New project</span>
                  {!isPro && Number.isFinite(projectLimit) && (
                    <span className="icust-proj-count">{projects.length}/{projectLimit}</span>
                  )}
                </button>
              )}
              {!isPro && <Link className="icust-upgrade" to="/plans" target="_blank" rel="noopener">Upgrade for unlimited →</Link>}
              <button type="button" className="icust-gate-dismiss" onClick={() => { setSavePickerOpen(false); setNewProjOpen(false); setNewProjName('') }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Flatten a /collection response into a flat, de-duplicated list of icon names.
// Combines categorised + uncategorised icons; aliases/hidden are skipped so the
// grid only shows canonical, renderable icons.
function collectionToNames(d) {
  const seen = new Set()
  const names = []
  const push = (n) => { if (n && !seen.has(n)) { seen.add(n); names.push(n) } }
  if (Array.isArray(d.uncategorized)) d.uncategorized.forEach(push)
  if (d.categories) Object.values(d.categories).forEach(arr => Array.isArray(arr) && arr.forEach(push))
  return names
}

// ── Collection cache ──────────────────────────────────────────────────────────
// Module-level (survives remounts) cache of parsed /collection responses, keyed by
// Iconify prefix. Every browse path (All packs / single pack / cross-pack group /
// search-clear) funnels through getCollectionNames, so a pack is fetched from the
// CDN at most ONCE per session. Switching packs or collections — or bouncing back
// to "All packs" — then paints from memory with no network round-trip. Caches the
// RAW de-duped name list + title; each caller still applies its own style filter.
const COLLECTION_CACHE = new Map()

async function getCollectionNames(pack) {
  const hit = COLLECTION_CACHE.get(pack)
  if (hit) return hit
  const r = await fetchWithFallback(`/collection?prefix=${pack}`, 6000)
  const d = await r.json()
  const entry = { names: collectionToNames(d), title: d.title || pack }
  COLLECTION_CACHE.set(pack, entry)
  return entry
}

const PAGE_SIZE = 120

export default function IconLibrary({ onCopy, embedded, onCatalogue }) {
  const { t } = useI18n()
  const { isPro, plan } = useSubscription()
  // Free-tier custom-icon allowance (Pro → Infinity). Single source: the plan.
  const customIconLimit = plan?.limits?.['custom-icons'] ?? Infinity
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])      // full result set (browse or search)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [mode, setMode] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeCat] = useState('all')
  const [pack, setPack] = useState('')
  const [group, setGroup] = useState(null)   // active cross-pack collection, or null
  const [source, setSource] = useState('all')  // all | group | pack | custom | search
  // An ephemeral draft handed over from the homepage icon preview. Read during
  // render and re-validated HERE before anything is applied, so a tampered,
  // stale or already-consumed record simply opens the normal editor state
  // instead. The draft only preselects an icon, size and stroke; authentication,
  // free limits and Pro checks below remain the sole authority over what may be
  // done with it. The commit effect further down empties the slot exactly once,
  // so a reload or a second visit inherits nothing.
  const [selected, setSelected] = useState(() => {
    const draft = validateIconDraft(readIconDraft())
    if (!draft) return null
    return {
      id: `${draft.pack}:${draft.name}`,
      pack: draft.pack,
      name: draft.name,
      cdn: true,
      draftSize: draft.size,
      draftStroke: draft.stroke,
    }
  })
  const [addMode, setAddMode] = useState(false)
  const [recents, setRecents] = useState(() => getRecentIcons())
  const timer = useRef(null)
  const cdnOk = useRef(null)
  const reqId = useRef(0)            // guards against out-of-order async responses
  const didInit = useRef(false)
  const sentinelRef = useRef(null)
  const retryRef = useRef(null)     // re-runs the last browse for the error banner

  const renderLocal = useCallback((q, packFilter) => {
    const localIcons = window.icons || []
    const PACKS = window.PACKS || {}
    const pm = { tabler: 'T', lucide: 'L', iconoir: 'I', heroicons: 'H', 'simple-icons': 'S' }
    const pc = pm[packFilter] || ''
    q = (q || '').toLowerCase()
    const filtered = localIcons.filter(i =>
      (activeCat === 'all' || i.c === activeCat) &&
      (!packFilter || i.p === pc) &&
      (!q || i.n.indexOf(q) !== -1 || i.c.indexOf(q) !== -1)
    )
    setIcons(filtered.map(i => ({
      id: i.n,
      name: i.n,
      pack: PACKS[i.p] || i.p,
      d: i.d,
      filled: i.p === 'S',
      cdn: false
    })))
    setVisible(PAGE_SIZE)
    // "Built-in icons", not "Offline": this branch is reached when the icon
    // SERVICE refused (a 429 rate limit was measured on 2026-09-08), and the
    // browser is online the whole time. The notice above the grid says what
    // happened; this line says what is being shown.
    setMode(cdnOk.current === false ? 'Built-in icons' : 'Embedded')
    setLoading(false)
  }, [activeCat])

  // Load EVERY pack by default, progressively. Fire all /collection requests in
  // parallel but append per-pack as each resolves (never Promise.all-block), and
  // round-robin merge so the grid stays mixed. Skeleton shows until the first
  // pack lands; a total failure surfaces the retry banner + built-in icons.
  const browseAll = useCallback(() => {
    const rid = ++reqId.current
    retryRef.current = browseAll
    setSource('all'); setGroup(null); setPack('')
    setLoadError(false)
    setVisible(PAGE_SIZE); setMode('')
    const lists = ALL_PACKS.map(() => [])

    // Warm-cache fast path: if every pack is already cached (e.g. returning to
    // "All packs" after browsing a single pack), paint synchronously with no
    // network and no skeleton flash.
    if (ALL_PACKS.every(p => COLLECTION_CACHE.has(p))) {
      cdnOk.current = true
      ALL_PACKS.forEach((p, idx) => {
        const names = keepStyle(p, COLLECTION_CACHE.get(p).names, PACK_STYLE[p]).slice(0, ALL_INITIAL_PER_PACK)
        lists[idx] = names.map(n => ({ id: `${p}:${n}`, pack: p, name: n, cdn: true }))
      })
      const merged = lists.flat()
      setIcons(merged)
      setMode(`All packs · ${merged.length.toLocaleString()} icons · ${ALL_PACKS.length} sets`)
      setLoading(false)
      return
    }

    setLoading(true)
    setIcons([])
    let settled = 0
    let okCount = 0
    ALL_PACKS.forEach((p, idx) => {
      getCollectionNames(p)
        .then(({ names: raw }) => {
          if (rid !== reqId.current) return
          cdnOk.current = true
          okCount++
          const names = keepStyle(p, raw, PACK_STYLE[p]).slice(0, ALL_INITIAL_PER_PACK)
          lists[idx] = names.map(n => ({ id: `${p}:${n}`, pack: p, name: n, cdn: true }))
          // Default sort = pack-by-pack: lists stays in ALL_PACKS order and each
          // pack's icons are contiguous, so flat() groups every pack together
          // (Lucide block, then Tabler, …) regardless of which request resolves
          // first — no round-robin interleave.
          const merged = lists.flat()
          setIcons(merged)
          const sets = lists.filter(l => l.length).length
          setMode(`All packs · ${merged.length.toLocaleString()} icons · ${sets} sets`)
          if (merged.length) setLoading(false)
        })
        .catch(() => { /* this pack failed — others may still resolve */ })
        .finally(() => {
          if (rid !== reqId.current) return
          settled++
          if (settled === ALL_PACKS.length) {
            setLoading(false)
            if (okCount === 0) { cdnOk.current = false; setLoadError(true); renderLocal('', '') }
          }
        })
    })
  }, [renderLocal])

  // Logo.dev pack — a curated grid of popular brands. No network: the logos are
  // <img> URLs resolved lazily by the browser as cells scroll into view.
  const browseLogos = useCallback(() => {
    reqId.current++            // cancel any in-flight browse
    retryRef.current = browseLogos
    setSource('pack'); setGroup(null); setPack('logodev')
    setLoadError(false)
    setIcons(LOGODEV_BRANDS.map(b => ({ id: `logodev:${b.domain}`, pack: 'logodev', name: b.name, ref: b.domain, logo: true })))
    setVisible(PAGE_SIZE)
    setMode(`Brand logos · ${LOGODEV_BRANDS.length} popular brands`)
    setLoading(false)
  }, [])

  // Logo.dev search — Logo.dev's image API resolves ANY company by name, so a
  // query returns curated matches first plus a direct lookup for the raw term
  // (deduped), meaning even brands not in the curated list still resolve.
  const searchLogos = useCallback((q) => {
    reqId.current++
    setSource('pack'); setGroup(null); setPack('logodev')
    setLoadError(false)
    const term = (q || '').trim()
    if (term.length < 2) { browseLogos(); return }
    const lower = term.toLowerCase()
    const hits = LOGODEV_BRANDS.filter(b => b.name.toLowerCase().includes(lower) || b.domain.includes(lower))
    const results = hits.map(b => ({ id: `logodev:${b.domain}`, pack: 'logodev', name: b.name, ref: b.domain, logo: true }))
    const directRef = term.includes('.') ? lower : term
    if (!results.some(r => r.ref.toLowerCase() === directRef.toLowerCase())) {
      results.unshift({ id: `logodev:${directRef}`, pack: 'logodev', name: term, ref: directRef, logo: true })
    }
    setIcons(results)
    setVisible(PAGE_SIZE)
    setMode(`Brand logos · ${results.length} for “${term}”`)
    setLoading(false)
  }, [browseLogos])

  // Browse an entire icon set via the /collection endpoint.
  // Browse one pack, optionally narrowed by an active collection chip — pack
  // and chip are independent filters that compose (chip = style within pack).
  const browsePack = useCallback((packFilter, groupKey = null) => {
    setSource('pack'); setGroup(groupKey || null)
    if (packFilter === 'logodev') { browseLogos(); return }
    if (!packFilter) { browseAll(); return }
    const rid = ++reqId.current
    retryRef.current = () => browsePack(packFilter, groupKey)
    setLoading(true); setLoadError(false)
    getCollectionNames(packFilter)
      .then(({ names: raw, title }) => {
        if (rid !== reqId.current) return
        cdnOk.current = true
        const names = keepStyle(packFilter, raw, groupKey || PACK_STYLE[packFilter])
        if (!names.length) { renderLocal('', packFilter); return }
        setIcons(names.map(n => ({ id: `${packFilter}:${n}`, pack: packFilter, name: n, cdn: true })))
        setVisible(PAGE_SIZE)
        setMode(`${title}${groupKey ? ` · ${ICON_GROUPS[groupKey].label}` : ''} · ${names.length.toLocaleString()} icons`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal('', packFilter)
      })
  }, [renderLocal, browseAll, browseLogos])

  // Browse a whole collection (chip): fetch every pack in the group and
  // round-robin interleave them so the grid mixes packs.
  const browseGroup = useCallback((groupKey) => {
    const g = ICON_GROUPS[groupKey]
    if (!g) return
    const rid = ++reqId.current
    retryRef.current = () => browseGroup(groupKey)
    setSource('group'); setGroup(groupKey); setPack('')
    setLoading(true); setLoadError(false)
    Promise.all(g.packs.map(p =>
      getCollectionNames(p)
        .then(({ names }) => ({ names: keepStyle(p, names, groupKey).slice(0, PER_PACK_CAP), pack: p, ok: true }))
        .catch(() => ({ names: [], pack: p, ok: false }))
    ))
      .then(results => {
        if (rid !== reqId.current) return
        if (!results.some(r => r.ok)) { cdnOk.current = false; setLoadError(true); renderLocal('', ''); return }
        cdnOk.current = true
        const lists = results.map(r => r.names.map(n => ({ id: `${r.pack}:${n}`, pack: r.pack, name: n, cdn: true })))
        const merged = interleavePacks(lists)
        if (!merged.length) { renderLocal('', ''); return }
        setIcons(merged)
        setVisible(PAGE_SIZE)
        const hits = results.filter(r => r.names.length).length
        setMode(`${g.label} · ${merged.length.toLocaleString()} icons · ${hits} packs`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal('', '')
      })
  }, [renderLocal])

  // Custom Icons category. Free accounts get a real allowance (see
  // customIconLimit), so the store is read for everyone; Pro just lifts the cap.
  const browseCustom = useCallback(() => {
    retryRef.current = browseCustom
    reqId.current++            // cancel any in-flight browse
    setSource('custom'); setGroup(null); setPack('')
    setQuery(''); setLoadError(false)
    const list = readCustomIcons()
    setIcons(list.map(c => ({ ...c, custom: true, id: c.key })))
    setVisible(PAGE_SIZE)
    setMode(`Custom Icons · ${list.length.toLocaleString()} saved`)
    setLoading(false)
  }, [])

  const doSearch = useCallback((q, scope = {}) => {
    q = (q || '').trim()
    const { pack: packFilter = '', group: groupKey = null } = scope
    // Brand logos resolve locally (curated list + name/domain lookup) — never
    // hit the Iconify /search endpoint for the Logo.dev pack.
    if (packFilter === 'logodev') { searchLogos(q); return }
    if (!q || q.length < 2) {
      if (packFilter) browsePack(packFilter, groupKey)
      else if (groupKey) browseGroup(groupKey)
      else browseAll()
      return
    }
    if (cdnOk.current === false) {
      renderLocal(q, packFilter)
      return
    }
    const rid = ++reqId.current
    retryRef.current = () => doSearch(q, scope)
    setSource('search')
    setLoading(true); setLoadError(false)
    // Pack and chip compose: a set pack narrows the endpoint, the chip narrows
    // the STYLE of the results (matchesStyle below); chip alone fans out to the
    // whole collection's packs.
    const params = new URLSearchParams()
    if (packFilter) params.set('prefix', packFilter)
    else if (groupKey) params.set('prefixes', ICON_GROUPS[groupKey].packs.join(','))
    params.set('query', q)
    params.set('limit', String(API_LIMIT))
    fetchWithFallback(`/search?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (rid !== reqId.current) return
        cdnOk.current = true
        if (!d.icons || !d.icons.length) {
          renderLocal(q, packFilter)
          return
        }
        const style = groupKey || PACK_STYLE[packFilter]
        const items = d.icons
          .map(id => { const [p, n] = id.split(':'); return { id, pack: p, name: n, cdn: true } })
          .filter(ic => matchesStyle(ic.pack, ic.name, style))
        if (!items.length) { renderLocal(q, packFilter); return }
        setIcons(items)
        setVisible(PAGE_SIZE)
        const scopeLabel = [packFilter, groupKey ? ICON_GROUPS[groupKey].label : ''].filter(Boolean).join(' · ') || 'All packs'
        setMode(`${items.length.toLocaleString()} matches${d.total > items.length ? '+' : ''} · ${scopeLabel}`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal(q, packFilter)
      })
  }, [renderLocal, browsePack, browseGroup, browseAll, searchLogos])

  // Consume the homepage draft on commit — see the `selected` initialiser above.
  useEffect(() => { consumeIconDraft() }, [])

  // Tell the masthead whether the grid under it is the CATALOGUE or the
  // built-in fallback. IconEmojiLibrary's status pill used to read
  // navigator.onLine alone, so with every Iconify host refusing (429/403 —
  // the 2026-09-08 outage) it said "Live library connected" in green directly
  // above the notice saying the icon service could not be reached. `loadError`
  // is the same flag that renders that notice, so the pill and the notice can
  // never disagree again. Reported through a callback rather than lifted,
  // because the fetch lifecycle (reqId, cdnOk, the retry ref) lives here.
  useEffect(() => { onCatalogue?.(loadError ? 'fallback' : 'live') }, [loadError, onCatalogue])

  // Initial load: all packs, so the grid shows catalogue breadth on first paint.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    // Call browseAll directly — not via setTimeout. A deferred timer gets
    // cancelled by this effect's StrictMode cleanup before it can fire, and the
    // didInit guard then blocks the remount from rescheduling, so the initial
    // browse never runs (grid stuck on skeletons). browseAll dedupes via reqId.
    browseAll()
  }, [browseAll])

  // Infinite scroll — reveal another page as the sentinel comes into view. The
  // `visible` dep makes the observer reconnect after each reveal so it keeps
  // draining while the sentinel stays inside the rootMargin (fixes the stall).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(v => Math.min(v + PAGE_SIZE, icons.length))
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [icons.length, visible])

  const debounceSearch = useCallback((q, scope) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q, scope), 300)
  }, [doSearch])

  // Takes the value, not the event: LibrarySearch hands its `onChange` a string,
  // and adapting at the call site with a fake `{ target: { value } }` would be a
  // shim nobody could read.
  //
  // An EMPTY value routes to handleClearSearch rather than through the debounce.
  // The shared field's own clear button calls onChange('') like any other edit,
  // and clearing has to do more than empty the box: cancel the in-flight
  // debounced search, then restore whichever listing was being browsed. Letting
  // '' fall through would leave a search running against nothing and strand the
  // user on the last result set.
  const handleQueryChange = (next) => {
    if (!next) { handleClearSearch(); return }
    setQuery(next)
    debounceSearch(next, { pack, group })
  }

  const handleClearSearch = () => {
    setQuery('')
    clearTimeout(timer.current)
    if (source === 'custom') browseCustom()
    else if (pack) browsePack(pack, group)
    else if (group) browseGroup(group)
    else browseAll()
  }

  // Search text, pack and collection chip are three independent filters that
  // compose — changing one never clears the others (My Icons excepted: it's a
  // local store, not a CDN scope).
  const handlePackChange = (e) => {
    const p = e.target.value
    clearTimeout(timer.current)
    if (p === 'custom') { setQuery(''); browseCustom(); return }
    const nextPack = p === 'all' ? '' : p
    setPack(nextPack)
    if (query.trim().length >= 2) doSearch(query, { pack: nextPack, group })
    else if (nextPack) browsePack(nextPack, group)
    else if (group) browseGroup(group)
    else browseAll()
  }

  // Toggle a cross-pack collection chip. Keeps the active search text AND the
  // selected pack — the chip narrows style within whatever scope is set.
  const handleGroupToggle = (key) => {
    clearTimeout(timer.current)
    const q = query.trim()
    const nextGroup = group === key ? null : key
    setGroup(nextGroup)
    if (q.length >= 2) doSearch(query, { pack, group: nextGroup })
    else if (pack) browsePack(pack, nextGroup)
    else if (nextGroup) browseGroup(nextGroup)
    else browseAll()
  }

  const handleIconClick = (icon) => {
    // Brand logos are raster (PNG/WebP) from Logo.dev, so they can't be edited in
    // the SVG customizer — clicking copies the high-res image URL instead.
    if (icon.logo) {
      trackIconCopy('logodev', icon.name)
      onCopy?.(logodevUrl(icon.ref, 512))
      return
    }
    setAddMode(false)
    setSelected(icon)
  }

  const handleAddIcon = () => {
    setSelected(null)
    setAddMode(true)
  }

  const handleCloseCustomizer = useCallback(() => {
    setSelected(null)
    setAddMode(false)
    setRecents(getRecentIcons())
    if (source === 'custom') browseCustom()
  }, [source, browseCustom])

  // Clear-all for the two My Icons sections. Saved (custom) is Pro-only and wipes
  // the store; Recently copied is available to everyone and wipes the recents.
  const handleClearCustom = useCallback(() => {
    writeCustomIcons([])
    setIcons([])
    setMode('Custom Icons · 0 saved')
  }, [])

  const handleClearRecents = useCallback(() => {
    clearRecentIcons()
    setRecents([])
  }, [])

  // The dropdown reflects the PACK filter only — an active chip leaves it on
  // "All packs" so the two filters read as independent.
  const selectValue = source === 'custom' ? 'custom' : (pack || 'all')

  const shown = icons.slice(0, visible)
  const hasMore = visible < icons.length
  const isMyIcons = source === 'custom'
  const searchEmpty = !isMyIcons && !loading && icons.length === 0 && !loadError

  // Shared glyph renderer — one code path for custom (saved), CDN and embedded
  // icons, reused by the main grid and both My Icons sections.
  const iconGlyph = (icon) => {
    if (icon.custom) {
      const img = <img src={svgToDataUri(icon.svg)} width="24" height="24" className={icon.colored ? '' : 'ig-inv'} loading="lazy" alt={icon.name} />
      return icon.colored ? <span className="ig-chip">{img}</span> : img
    }
    if (icon.logo) {
      // logo.dev serves opaque-background marks — no sampling (unknown CORS), a
      // plain light chip always gives enough separation from the card surface.
      return (
        <span className="ig-chip">
          <img src={logodevUrl(icon.ref, 64)} width="28" height="28" className="ig-logo" loading="lazy" alt={icon.name} />
        </span>
      )
    }
    if (icon.cdn) {
      if (COLORED_PACKS.has(icon.pack)) return <BrandGlyph pack={icon.pack} name={icon.name} />
      return <img src={`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`} width="24" height="24" className={invClass(icon.pack)} loading="lazy" alt={icon.name} />
    }
    return (
      <svg viewBox="0 0 24 24" fill={icon.filled ? 'currentColor' : 'none'} stroke={icon.filled ? 'none' : 'currentColor'} aria-hidden="true">
        <path d={icon.d} />
      </svg>
    )
  }

  // THE PACK LABEL ONLY EARNS ITS LINE WHEN IT DISCRIMINATES.
  // #298 dropped it below 980px; above 980px it was still drawn under EVERY
  // cell - 120 of them on first paint, all reading "lucide" - while the line
  // that does tell icons apart, the icon's own name, was being truncated to
  // make room for it ("align-horizontal-…", "align-vertical-distribute-…").
  // A value identical across the whole grid discriminates nothing.
  // Mobbin, platform web, and no reference labels the pack on the cell:
  // Skiff (screens/85ca7e92-1c51-401d-92ed-6942e6beaf47) and Craft
  // (screens/992cc0ba-f9d6-41e2-98d6-c624907d6593) give their pickers bare
  // glyphs; Notion (screens/899cb181-5770-47d2-92c8-332ca9d9a733) heads the
  // collection once; and Magnific, which has this exact job at this exact
  // scale (screens/c215558c-23c8-415a-8b3d-917004d27adb), states "Special
  // Lineal by Freepik · 288.1k icons in this collection" ONCE above the grid
  // and labels not one cell. That is the same answer the CSS note reached:
  // pack identity belongs to the GROUP.
  // So it is kept for the case #298 reserved it for and no other - a result
  // set that actually holds more than one pack, which is where the word tells
  // you something. Which pack is being browsed is already stated by the pack
  // filter in the toolbar above.
  const packOf = (icon) => (icon.logo ? 'logo.dev' : (icon.custom ? null : icon.pack || null))
  const renderGrid = (list) => {
    const showPack = new Set(list.map(packOf).filter(Boolean)).size > 1
    return list.map((icon, idx) => renderCell(icon, idx, showPack))
  }

  const renderCell = (icon, idx, showPack = false) => (
    <div
      key={icon.id || icon.key || `${idx}-${icon.name || ''}`}
      className="ic"
      role="button"
      tabIndex={0}
      aria-label={icon.logo ? `Copy ${icon.name} logo URL` : `Customise ${icon.name}`}
      onClick={() => handleIconClick(icon)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleIconClick(icon) } }}
      onMouseEnter={() => prefetchIconSvg(icon)}
      onFocus={() => prefetchIconSvg(icon)}
    >
      {iconGlyph(icon)}
      <span>{icon.name}</span>
      {showPack && packOf(icon) && <span className="ic-pack">{packOf(icon)}</span>}
    </div>
  )

  return (
    <div className="sec">
      {!embedded && (
        <div className="sec-h">
          <div className="sec-h-eyebrow">{t('iconLibrary.eyebrow')}</div>
          <h1>{t('iconLibrary.heading')}</h1>
          <p>{t('iconLibrary.subtitle')}</p>
        </div>
      )}

      {recents.length > 0 && !isMyIcons && (
        <div className="ig-rail">
          <div className="ig-rail-head">
            Recent
            <button
              type="button"
              className="ig-rail-clear"
              aria-label="Clear recent icons"
              title="Clear recent"
              onClick={() => { clearRecentIcons(); setRecents([]) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Clear
            </button>
          </div>
          <div className="ig-rail-track rail-overflow">
            {recents.map((r) => (
              <button
                key={r.key}
                type="button"
                className="ig-rail-item"
                aria-label={`${r.action === 'edit' ? 'Edited' : 'Copied'} ${r.name} — open to customise`}
                onClick={() => handleIconClick(r)}
              >
                {r.cdn ? (
                  <img src={`https://api.iconify.design/${r.pack}/${r.name}.svg?width=24&height=24`} width="24" height="24" className={invClass(r.pack)} loading="lazy" alt="" />
                ) : (
                  <svg viewBox="0 0 24 24" fill={r.filled ? 'currentColor' : 'none'} stroke={r.filled ? 'none' : 'currentColor'} aria-hidden="true"><path d={r.d} /></svg>
                )}
                <span className={`ig-rail-badge ig-rail-badge--${r.action === 'edit' ? 'edit' : 'copy'}`} aria-hidden="true">
                  {r.action === 'edit' ? (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  ) : (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sub">
        {/* THE SHARED BROWSE LANGUAGE. This was the fourth implementation of a
            Library toolbar — `.pl-toolbar` with `.pl-search-wrap` (borrowed
            from the Prompt Library) and outlined `.pl-chip` pills — while the
            Palette and Gradient libraries had already converged on
            src/components/library/. Founder request: make this and the Emoji
            Library match the galleries.

            THE PACK SELECT STAYS A SELECT. Twenty-six packs in six optgroups is
            not a pill tray, and forcing it into one to look consistent would
            trade a working control for a matching one. It sits in the toolbar's
            filter row beside the group tray and takes the shared field metrics,
            which is what "consistent" has to mean for a control this size. */}
        <LibraryToolbar
          className="ig-toolbar"
          search={{
            value: query,
            onChange: handleQueryChange,
            placeholder: 'Search icons…',
            label: 'Search icons',
          }}
          action={(
            <button type="button" className="ig-addbtn" onClick={handleAddIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add icon
            </button>
          )}
        >
          <select className="lbry-select" value={selectValue} onChange={handlePackChange} aria-label="Icon pack">
            <option value="all">All packs</option>
            <optgroup label="Yours">
              <option value="custom">My Icons</option>
            </optgroup>
            <optgroup label="Interface (outlined)">
              <option value="lucide">Lucide</option>
              <option value="tabler">Tabler</option>
              <option value="iconoir">Iconoir</option>
              <option value="heroicons">Heroicons</option>
              <option value="ph">Phosphor</option>
            </optgroup>
            <optgroup label="Interface (solid)">
              <option value="mdi">Material Design</option>
              <option value="material-symbols">Material Symbols</option>
              <option value="solar">Solar</option>
              <option value="fa6-solid">Font Awesome</option>
              <option value="bxs">BoxIcons</option>
            </optgroup>
            <optgroup label="Brand logos (coloured)">
              <option value="logodev">Real brand logos (Logo.dev)</option>
              <option value="simple-icons">Simple Icons</option>
              <option value="logos">Logos (colour)</option>
              <option value="devicon">Devicon</option>
              <option value="skill-icons">Skill Icons</option>
            </optgroup>
            <optgroup label="Flags">
              <option value="circle-flags">Circle Flags</option>
              <option value="flag">Flag Icons</option>
              <option value="flagpack">Flagpack</option>
              <option value="cif">Currency Flags</option>
            </optgroup>
            <optgroup label="Flat & emoji">
              <option value="flat-color-icons">Flat Color Icons</option>
              <option value="twemoji">Twemoji</option>
              <option value="noto">Noto Emoji</option>
              <option value="fluent-emoji">Fluent Emoji</option>
              <option value="openmoji">OpenMoji</option>
            </optgroup>
          </select>
          <LibraryFilterGroup
            label="Filter by icon group"
            triggerLabel="Group"
            value={source === 'custom' ? 'custom' : group}
            onChange={(id) => (id === 'custom' ? browseCustom() : handleGroupToggle(id))}
            options={GROUP_OPTIONS}
          />
        </LibraryToolbar>

        {isMyIcons ? (
          // ── My Icons: two distinct collections, each independently clearable ──
          // 1) Saved — icons customised + saved to the project (Pro-gated store);
          // 2) Recently copied — every icon copied out, for quick reuse (all users).
          <div className="ig-myicons">
            <section className="ig-mysec">
              <div className="ig-mysec-head">
                <h3 className="ig-mysec-title">Saved</h3>
                {icons.length > 0 && (
                  <button type="button" className="ig-rail-clear" onClick={handleClearCustom} title="Clear all saved icons">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Clear all
                  </button>
                )}
              </div>
              {icons.length > 0 ? (
                <div className="ig">{renderGrid(shown)}</div>
              ) : (
                <div className="ig-custom-empty">No saved icons yet — open any icon, adjust it on the stage, and hit Save to keep it here.</div>
              )}
              {!isPro && (
                <p className="ig-custom-hint">
                  Free plan saves up to {customIconLimit} icons per project ·{' '}
                  <button type="button" className="ig-custom-hint-link" onClick={() => openInNewTab('/checkout')}>Go Pro for unlimited</button>
                </p>
              )}
            </section>

            <section className="ig-mysec">
              <div className="ig-mysec-head">
                <h3 className="ig-mysec-title">Recently copied</h3>
                {recents.length > 0 && (
                  <button type="button" className="ig-rail-clear" onClick={handleClearRecents} title="Clear recently copied">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Clear all
                  </button>
                )}
              </div>
              {recents.length > 0 ? (
                <div className="ig">{renderGrid(recents)}</div>
              ) : (
                <div className="ig-custom-empty">Icons you copy show up here for quick reuse.</div>
              )}
            </section>
          </div>
        ) : (
          <>
            {loadError && (
              // role="status": the sentence is the only thing telling a
              // screen-reader user that the grid under it is the built-in set
              // rather than the catalogue they searched. Rendered with every
              // Iconify host refused (429/403) on 2026-09-08 the state was
              // otherwise complete — the sentence, Try again and the built-in
              // grid — but nothing announced it.
              <div className="ig-notice" role="status">
                <span>Couldn’t reach the icon service — showing built-in icons.</span>
                <button type="button" className="ui-pill ui-pill-out ui-pill-sm" onClick={() => retryRef.current?.()}>Try again</button>
              </div>
            )}

            <div className="ig">
              {loading && icons.length === 0
                ? Array.from({ length: 24 }).map((_, i) => (
                  <div key={`skel-${i}`} className="ig-skel" aria-hidden="true">
                    <div className="sk ig-skel-glyph" />
                    <div className="sk ig-skel-label" />
                  </div>
                ))
                : renderGrid(shown)}
            </div>

            {hasMore && <div ref={sentinelRef} className="ig-sentinel" />}

            {loading && icons.length > 0 && (
              <p className="ig-status">Loading more…</p>
            )}

            {searchEmpty && (
              <div className="pl-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>{query.trim()
                  ? `No icons match “${query.trim()}”. Try another word, or clear the search to browse everything.`
                  : 'No icons to show — try another pack or search.'}</p>
              </div>
            )}

            {!loading && icons.length > 0 && (
              <p className="ig-status">
                Showing {shown.length.toLocaleString()} of {icons.length.toLocaleString()} · {mode}
              </p>
            )}

            {pack === 'logodev' && (
              <p className="ig-attrib">
                Search any brand by name or domain (e.g. <code>notion.so</code>) — click a logo to copy its
                high-res image URL. Brand logos provided by{' '}
                <a href="https://logo.dev" target="_blank" rel="noopener noreferrer">Logo.dev</a>.
              </p>
            )}
          </>
        )}
      </div>
      <UIKitGuide step="icons" />

      {(selected || addMode) && (
        <IconCustomizer
          key={selected ? (selected.id || selected.key || `${selected.pack || 'emb'}:${selected.name}`) : 'add'}
          icon={selected}
          addMode={addMode && !selected}
          isPro={isPro}
          saveLimit={customIconLimit}
          onClose={handleCloseCustomizer}
          onCopy={onCopy}
          onPick={handleIconClick}
        />
      )}
    </div>
  )
}
