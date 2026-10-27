import MenuSelect from '../components/tool/MenuSelect'
import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo, memo, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme } from '../contexts/ThemeContext'
import { useProject } from '../contexts/ProjectContext'
import { useProModal, reportUpgradeGate } from '../contexts/ProModalContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { lockScroll } from '../utils/scrollLock'
import useExportGate from '../hooks/useExportGate'
import { trackIconCopy } from '../utils/analytics'
import UIKitGuide from '../components/UIKitGuide'
import ColorPickerPop from '../components/ColorPickerPop'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import SnapSlider from '../components/SnapSlider'
import SplitDownload from '../components/library/SplitDownload'
import FooterGlyph from '../components/library/FooterGlyph'
import {
  downloadFileName, readDownloadFormat, saveBlobAs, svgToPngBlob, writeDownloadFormat,
} from '../utils/iconDownload'
import { addRecentIcon, getRecentIcons, clearRecentIcons } from '../utils/recentIcons'
import { openInNewTab } from '../utils/newTab'
import { collectionToNames, createCollectionLoader, createLimiter } from '../utils/iconifyCollectionCache'
import { matchesRegular } from '../data/iconRegularRules'
import { loadPackHead } from '../data/iconHeads'
import { isNearBlackMono, monochromeSvg } from '../utils/iconPaint'
import { colourRowState } from '../utils/iconColourRow'
import { concatenatePackLists, orderIconsByPack } from '../utils/iconPackOrder'
import { consumeIconDraft, readIconDraft, validateIconDraft } from '../utils/iconHandoff'
import {
  DEFAULT_ICON_SIZE, STROKE_PX, STROKE_UNIT_PX, customIconStrokePx, draftStrokePx,
  stickyStrokePx, strokeAttrForPx, strokeScaleCaption, viewBoxOf,
} from '../utils/iconStroke'
import { WIDE_INK, inkShape } from '../utils/glyphShape'
import { registerSymbolsSliced, symbolRef, touchSymbol } from '../utils/iconSprite'
import {
  endBandKind, packsProAdds, pickTeaseIcons, teaseCellCount, teaseCellPlace, teaseColsFallback,
} from '../utils/iconEndBand'
// The closing arrow shared with the homepage's closing band.
import PhGlyph from '../components/spectrum/PhGlyph'
import { PH_ARROW_UP_RIGHT } from '../components/spectrum/phosphorNav'
// WHO SEES WHICH PACK. One editable table, no pack name in this file's logic —
// see src/data/iconPackTiers.js for the rule and for how to move a
// pack between tiers with a one-word edit.
import {
  ANIMATED_PACKS, ANON_ICON_CAP, ICON_GATE_COPY, anonPerPack, canSeeIcon, canSeePack, isAnimatedPack, isBlockedPack, proOnlyIconCount, tierOf, viewerTier, visibleIconNames, visiblePacks,
} from '../data/iconPackTiers'
// THE ANIMATED SETS NEVER TOUCH api.iconify.design FROM THE BROWSER. Their listing
// and glyphs come only from this client, which calls the server's Pro check.
import { ANIMATED_BATCH, animatedIcons, classifyAnimatedFailure, isAnimatedName, isPackScopedFailure } from '../utils/animatedIcons'
import {
  applyGlyphData, glyphKey, purgeAnimatedCaches, setAnimatedTier, staleAnimatedAnswer, animatedTierIsPaid,
} from '../utils/animatedIconCache'
// WHAT IS OWED TO THE PEOPLE WHO DREW THEM. Four of the sets below are Creative
// Commons Attribution sets and two of those are free-tier, so the credit under
// this grid is a licence CONDITION and not a nicety — see iconPackCredits.js.
import { ICON_PACK_CREDITS, iconifyCredit, packCredit } from '../data/iconPackCredits'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
// The attribution line's own sheet. It is NOT in library.css, deliberately: a
// licence condition should be editable — and reviewable — without opening a
// 900-line shared stylesheet, and a rule that disappears by accident here is a
// rule that takes a credit off the screen with it.
import '../styles/pages/icon-attribution.css'

const API_LIMIT = 999

// ONE HOST, BECAUSE THE OTHER TWO WERE NEVER A FALLBACK.
// `api.simplesvg.com` and `api.unisvg.com` are Iconify's documented mirrors and
// sat here as the retry path for exactly the outage this file keeps hitting.
// MEASURED, both from one machine and unauthenticated:
//   api.iconify.design  /collection?prefix=lucide -> 200
//   api.simplesvg.com   /collection?prefix=lucide -> 403
//   api.unisvg.com      /collection?prefix=lucide -> 403
// They do not rate-limit us, they refuse us outright, so every failure path in
// this file walked two guaranteed-403 hosts before giving up — three round
// trips of latency per failed icon, and a "fallback" that has never once
// returned a byte. Keeping them made the retry look survivable when it was
// not. The array shape stays so the loops below are unchanged and a real
// mirror can be added back the day one exists.
const API_HOSTS = [
  'https://api.iconify.design',
]

const COLORED_PACKS = new Set([
  'logos', 'flat-color-icons', 'fxemoji', 'noto', 'noto-v1', 'twemoji', 'emojione',
  'emojione-v1', 'openmoji', 'fluent-emoji', 'fluent-emoji-flat', 'circle-flags',
  'flag', 'flagpack', 'cif', 'skill-icons', 'devicon', 'vscode-icons', 'token-branded',
  'meteocons',
])
// Theme-adaptive tint for the GRID/rail only (inverts monochrome art in dark mode).
// The customizer Stage does NOT use this — it fixes contrast via a luminance swap.
const invClass = (pack) => (COLORED_PACKS.has(pack) ? '' : 'ig-inv')

// Curated cross-pack collections. A chip aggregates every pack in its group so
// "Coloured" shows colour icons from ALL colour packs, not just one — same for
// the other styles. `packs` are real Iconify prefixes.
const ICON_GROUPS = {
  coloured: { label: 'Coloured', packs: ['logos', 'flat-color-icons', 'devicon', 'skill-icons', 'vscode-icons', 'token-branded'] },
  brands: { label: 'Brand logos', packs: ['simple-icons', 'logos', 'devicon', 'skill-icons'] },
  flags: { label: 'Flags', packs: ['circle-flags', 'flag', 'flagpack', 'cif'] },
  emoji: { label: 'Emoji', packs: ['twemoji', 'fluent-emoji', 'noto', 'openmoji'] },
}
const GROUP_ORDER = ['coloured', 'brands', 'flags', 'emoji']
// Cap each pack's contribution so a 5-pack aggregate stays snappy (the grid is
// windowed anyway — nobody scrolls past a few thousand).
const PER_PACK_CAP = 1500

// Every pack across every group, de-duped — the default "All packs" aggregate.
const INTERFACE_PACKS = ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph', 'mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs', 'mingcute', 'carbon']
const ALL_PACKS = [...new Set([...INTERFACE_PACKS, ...GROUP_ORDER.flatMap(k => ICON_GROUPS[k].packs)])]

// The group tray's options were built HERE, at module scope, so that
// LibraryFilterGroup was not handed a new array identity on every keystroke —
// it measures its sliding indicator off the active button, and a fresh options
// array re-runs that measurement.
//
// They are now built inside the component (`groupOptions`) because a locked
// chip has to say which tier opens it, and the tier is not a module-level fact.
// The identity guarantee is kept by memoising on the tier alone: a handful of
// changes in a session rather than one per render. Do not move this back to a
// plain expression in the JSX.
//
// "My Icons" leads because it is the user's own collection rather than one of
// the catalogue's groups; `custom` is not a member of GROUP_ORDER and never was.
// Cap per pack for the default aggregate so we hold ~5k lightweight refs, not ~36k.
const ALL_INITIAL_PER_PACK = 250
// Packs whose default style is genuinely stroke-based (the stroke slider applies).
const STROKE_PACKS = new Set(['lucide', 'tabler', 'iconoir', 'heroicons', 'ph'])
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
const logodevUrl = (ref, size = 128, theme) => {
  const clean = String(ref || '').trim()
  const path = clean.includes('.') ? encodeURIComponent(clean) : `name/${encodeURIComponent(clean)}`
  return `https://img.logo.dev/${path}?token=${LOGODEV_TOKEN}&size=${size}&format=png&retina=true${theme ? `&theme=${theme === 'light' ? 'light' : 'dark'}` : ''}`
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

// The customiser's opening values. One table feeds the first-open seeds, what
// Reset restores, and the test for "does anything differ" (which shows Reset),
// so they can never disagree. The stroke is in pixels (see iconStroke.js).
const CUSTOMISER_DEFAULTS = Object.freeze({
  size: DEFAULT_ICON_SIZE,
  color: '',
  stroke: STROKE_PX.default,
  absStroke: false,
  cap: 'round',
  join: 'round',
  rotate: 0,
  flipH: false,
  flipV: false,
})

// ── Weights: Regular / Bold / Fill / Duo ─────────────────────────────────────
// the Regular/Bold/Fill/Duo tabs
// on the design's phone mock are built for real. A weight is not a CSS effect: it swaps
// every glyph for the weight the pack's own designers drew, which Iconify
// serves under a suffix on the same name. Only the packs that DRAW a weight
// offer it, and the table says exactly which:
//
//   Phosphor  (ph)         regular, -bold, -fill, -duotone   — all four
//   Heroicons              outline, -solid                   — Fill
//   Tabler                 outline, -filled (a subset)       — Fill
//   Iconoir                outline, -solid  (a subset)       — Fill
//
// Lucide draws one weight and so offers Regular only. A segment the current
// scope cannot honour is DISABLED with the reason (which packs do draw it),
// never faked with a thicker stroke. Heroicons' 16px and 20px solid sets are
// left out: they are drawn for other grids, so they are a size, not a weight.
//
// Nothing here widens what is fetched: a weight filters the names of packs the
// viewer may already browse, so the tier gate is untouched.
const ICON_WEIGHTS = [
  { id: 'regular', label: 'Regular' },
  { id: 'bold', label: 'Bold' },
  { id: 'fill', label: 'Fill' },
  { id: 'duo', label: 'Duo' },
]
const WEIGHT_RULES = {
  bold: { ph: n => /-bold$/.test(n) },
  fill: {
    ph: n => /-fill$/.test(n),
    heroicons: n => /-solid$/.test(n) && !/-(?:16|20)-solid$/.test(n),
    tabler: n => /-filled$/.test(n),
    iconoir: n => /-solid$/.test(n),
  },
  duo: { ph: n => /-duotone$/.test(n) },
}
const WEIGHT_PACK_NAMES = { ph: 'Phosphor', heroicons: 'Heroicons', tabler: 'Tabler', iconoir: 'Iconoir' }
const weightPacks = (weight) => Object.keys(WEIGHT_RULES[weight] || {})
// Collections use the pack's Regular artwork; other scopes honour the weight.
// `tier` also drops the icons a pack keeps for Pro (Carbon's logo-*), so a name the
// viewer may not have never becomes a cell, a glyph request or a search hit.
const keepWeight = (pack, names, weight, groupKey = null, tier) => {
  const open = visibleIconNames(pack, names, tier)
  if (groupKey || weight === 'regular') return open.filter(name => matchesRegular(pack, name))
  const rule = WEIGHT_RULES[weight]?.[pack]
  return rule ? open.filter(rule) : []
}
const matchesWeight = (pack, name, weight) => (
  weight === 'regular' ? matchesRegular(pack, name) : !!WEIGHT_RULES[weight]?.[pack]?.(name)
)

function buildSvgUrl(host, pack, name, params = {}) {
  // An animated set has no direct URL, ever: it loads through the server's Pro check.
  if (isAnimatedPack(pack)) return ''
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
  let retryAfter = null
  for (const host of API_HOSTS) {
    try {
      const r = await fetch(`${host}${path}`, { signal: AbortSignal.timeout(timeout) })
      if (r.ok) return r
      // A 429 says how long to wait, when the browser is allowed to read the header
      // (a refusal sent without CORS headers reaches us as a network error instead).
      if (r.status === 429) retryAfter = Number(r.headers.get('retry-after')) || retryAfter
    } catch { /* try next host */ }
  }
  throw Object.assign(new Error('All API hosts failed'), { retryAfter })
}

// Base SVG markup cache. Only the parameterless variant is cached — it's the
// only one the customizer requests, and params would fragment the cache for no
// benefit. `svgTextCache` holds the in-flight promise (concurrent callers
// dedupe); `svgTextReady` holds resolved text for synchronous reads, so the
// customizer can seed its stage on first paint with no "Loading…" flash.
const svgTextCache = new Map()
const svgTextReady = new Map()
const svgKey = glyphKey

function fetchSvgText(pack, name, params = {}) {
  // The block-list in iconPackTiers.js covers every path that takes an icon's markup.
  if (isBlockedPack(pack)) return Promise.reject(new Error('This icon set is not offered'))
  const cacheable = !params || Object.keys(params).length === 0
  const key = svgKey(pack, name)
  if (cacheable && svgTextCache.has(key)) return svgTextCache.get(key)
  const p = (async () => {
    // Animated sets: the server route, then the same standalone markup the grid builds.
    if (isAnimatedPack(pack)) {
      if (!(await loadGlyphBatch(pack, [name]))) throw new Error('Failed to fetch icon SVG')
      const text = glyphSvgText(pack, name)
      if (!text) throw new Error('Failed to fetch icon SVG')
      return text
    }
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
  if (icon?.cdn && !icon.custom && !icon.logo && !isAnimatedPack(icon.pack)) fetchSvgText(icon.pack, icon.name).catch(() => {})
}

/* ── THE GRID ASKS FOR ONE FILE PER PACK, NOT ONE PER ICON ───────────────────

   THE BUG THIS EXISTS TO KILL. Every cell used to render
   `<img src="https://api.iconify.design/{pack}/{name}.svg?width=24&height=24">`.
   PAGE_SIZE is 120, so the first paint of this page fired 120 image requests at
   one host, on top of the 25 `/collection` requests `browseAll` already sends —
   ~145 requests to api.iconify.design from one IP, per load, before the visitor
   has scrolled once. Cloudflare answers that with error 1015 (rate limited by
   IP), which is precisely the breakage recorded at `noteGlyphFailure`
   below: the catalogue answered 200, every glyph came back 429, and because the
   API serves a rate-limited glyph as text/plain while the browser asked for an
   image, ORB blocked it and the <img> just failed. The page believed it was
   healthy and drew 120 blank cells.

   THE FIX. The Iconify API serves many icons in ONE request:
   `/{prefix}.json?icons=a,b,c` returns `{ icons: { a: {body}, … }, aliases, … }`.
   MEASURED: 60 lucide icons in a single response, HTTP 200, 14,977
   bytes. So a 120-cell page costs one request per PACK PRESENT (≈25 on the
   mixed "All packs" view, far fewer on a single pack or a group) instead of 120
   — and scrolling to the next page is usually free, because a pack's tranche is
   fetched generously and cached for the session.

   WHY THE MARKUP IS STILL AN <img>, NOT INLINE SVG. The obvious way to use the
   body is `dangerouslySetInnerHTML`. The only use in src is PhIcon, which
   injects the app's own bundled path data; third-party markup fetched at
   runtime is the worst possible thing to inject the same way. (The customiser
   stage is separate: it parses one SVG, sanitised on fetch or paste, into the
   DOM to edit it.) Composing the body into a `data:image/svg+xml` URI keeps
   the exact same <img> element, the same `ig-inv` tint, the same `loading="lazy"`, and the same canvas sampling in
   BrandGlyph (a data: URI does not taint a canvas, so that path stops needing
   CORS at all) — while SVG inside an <img> is a non-scripting context by spec,
   so a hostile body cannot run anything. Same pixels, no new attack surface.

   AND THE FAILURE IS NOW VISIBLE. This is the half that matters as much as the
   request count. A 429 on an <img> is invisible to JavaScript — that is how the
   old code shipped a page of blank cells believing the service was fine. A 429
   on a fetch() is a status code we can read, so a refusal now flips the SAME
   `loadError` the catalogue path sets, and the honest notice and built-in grid
   appear for the reason they were built. */

// 'pack:name' → svg body markup. Module scope, so it survives remounts.
const GLYPH_BODY = new Map()
// 'pack:name' → { w, h } when the icon overrides its pack's default box.
const GLYPH_BOX = new Map()
// pack → Set of names already requested (resolved or in flight), so a scroll
// that re-renders the same cells never re-asks for them.
const GLYPH_ASKED = new Map()

// One request carries this many names. 60 measured at ~15KB; 100 keeps the URL
// well inside every proxy's limit and still lands under 30KB for a stroke pack.
const GLYPH_BATCH = 100

const askedFor = (pack) => {
  let s = GLYPH_ASKED.get(pack)
  if (!s) { s = new Set(); GLYPH_ASKED.set(pack, s) }
  return s
}

// A batch that fails while the others succeed (one big flag pack timing out, say)
// must not leave its cells blank for the session. Its names come out of the asked
// set so a later pass asks again, but bounded: a name is retried at most
// GLYPH_RETRY_MAX times, and a pack is not re-asked inside GLYPH_RETRY_MS of its
// last failure, because Iconify rate-limits and a storm would make it worse.
const GLYPH_RETRY_MAX = 2
// 'pack:name' → the service has no icon of that name, or never answered for it in
// GLYPH_RETRY_MAX + 1 tries. Such a cell draws a quiet empty slot, not the loading
// skeleton, which would pulse for the rest of the session.
const GLYPH_MISSING = new Set()
const GLYPH_RETRY_MS = 3000
const GLYPH_FAILS = new Map() // 'pack:name' → failed attempts so far
const GLYPH_RETRY_AFTER = new Map() // pack → earliest time it may be asked again

// The glyph stores the animated-icon cache module writes into and purges.
const GLYPH_STORES = { body: GLYPH_BODY, box: GLYPH_BOX, missing: GLYPH_MISSING }

/**
 * Fetch one pack's worth of glyph bodies in a single request and fill the
 * caches. Resolves { ok: true } when the request was answered, and
 * { ok: false, kind } when it was not — the caller turns a failure into the
 * page's existing refused state rather than into 120 silently broken images.
 * `kind` says why (see classifyAnimatedFailure): only an animated set can fail
 * for a reason other than 'transient'.
 */
async function loadGlyphBatchOutcome(pack, names) {
  if (!names.length) return { ok: true }
  let data
  try {
    if (isAnimatedPack(pack)) {
      // The server route checks the plan; a 401/403 throws and is classified below.
      data = await animatedIcons.glyphs(pack, names)
    } else {
      const url = `${API_HOSTS[0]}/${pack}.json?icons=${names.map(encodeURIComponent).join(',')}`
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
      // 429 (Cloudflare 1015) and 5xx land here as a readable status instead of
      // as a broken image nobody can see.
      if (!r.ok) return { ok: false, kind: 'transient' }
      data = await r.json()
    }
  } catch (err) {
    return { ok: false, kind: isAnimatedPack(pack) ? classifyAnimatedFailure(err) : 'transient' }
  }
  // An animated answer that lands after the viewer left Pro is dropped, not stored.
  if (!applyGlyphData(pack, names, data, GLYPH_STORES)) return { ok: false, kind: classifyAnimatedFailure(staleAnimatedAnswer()) }
  // Put the batch in the sprite before the answer is reported, so the cells that
  // paint on the tick that follows find their symbols already there.
  // A sprite failure must not hold the batch: its icons fall back to their data URIs.
  try { await registerGlyphSymbols(pack, names) } catch { /* drawn as images instead */ }
  return { ok: true }
}
const loadGlyphBatch = async (pack, names) => (await loadGlyphBatchOutcome(pack, names)).ok

/**
 * The <img> src for a batched glyph, or '' when its body has not arrived. The
 * body is Iconify's own markup for the icon; wrapping it in an <svg> root with
 * the right viewBox is all that turns it into a standalone file.
 */
// 'pack:name' → composed data URI. A body never changes once stored, so the
// encoded URI is built once rather than on every grid render.
// Bounded LRU: at most GLYPH_URI_MAX entries, least recently used dropped first.
const GLYPH_URI_MAX = 3000
const GLYPH_URI = new Map()
// The standalone SVG markup for a batched glyph, or '' when its body has not arrived.
function glyphSvgText(pack, name) {
  const key = svgKey(pack, name)
  const body = GLYPH_BODY.get(key)
  if (!body) return ''
  const box = GLYPH_BOX.get(key) || { w: 24, h: 24 }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${body}</svg>`
}
function glyphDataUri(pack, name) {
  const key = svgKey(pack, name)
  const hit = GLYPH_URI.get(key)
  if (hit) {
    GLYPH_URI.delete(key)
    GLYPH_URI.set(key, hit)
    return hit
  }
  const text = glyphSvgText(pack, name)
  if (!text) return ''
  const uri = svgToDataUri(text)
  GLYPH_URI.set(key, uri)
  while (GLYPH_URI.size > GLYPH_URI_MAX) {
    GLYPH_URI.delete(GLYPH_URI.keys().next().value)
  }
  return uri
}

// ── Inline sprite for monochrome packs ───────────────────────────────────────
// A monochrome pack icon is drawn as `<svg><use href="#id"/></svg>` from the one
// hidden sprite (utils/iconSprite.js) instead of as an <img> data: URI, which cost
// the browser one SVG document per icon. Coloured packs keep their <img>: the
// brand chip samples the decoded image for its contrast halo and aspect ratio,
// which a <use> has no pixels to give. Animated packs keep it too, because the
// sanitiser drops their <animate> elements.
const inSprite = (pack) => !COLORED_PACKS.has(pack) && !isAnimatedPack(pack)
// Sanitising a cold batch of 100 icons is one 28 ms task at 4x CPU (measured, median
// of 5), so it goes in runs of SPRITE_SLICE with a yield between them: the longest
// run is then about 15 ms.
const SPRITE_SLICE = 25
async function registerGlyphSymbols(pack, names) {
  if (!inSprite(pack)) return
  await registerSymbolsSliced(names.map((name) => ({ key: svgKey(pack, name), text: glyphSvgText(pack, name) })), SPRITE_SLICE)
}
/**
 * `#id` of the icon's symbol, '' when it is not in the sprite (use the data: URI).
 * Read-only: every body arrives through loadGlyphBatchOutcome, which registers
 * its batch, so a render never writes to the page. An icon the sprite has since
 * let go of (see SPRITE_MAX) is drawn from its data: URI instead.
 */
function glyphSymbolRef(pack, name) {
  return inSprite(pack) ? symbolRef(svgKey(pack, name)) : ''
}

// ── Brand-glyph contrast chips ───────────────────────────────────────────────
// Remember artwork measurements so scrolling or reopening never re-samples.
const glyphCache = new Map() // 'pack:name' or 'logodev:ref:theme' → artwork measurements

// A BRAND LOCKUP IS NOT A SQUARE MARK, AND THE GRID USED TO PRETEND IT WAS.
//
// Reported as many icons not rendering correctly. Measured on /create/icons under the Brand
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
//      problem. Examples: adonisjs-wordmark,
//      aerospike-wordmark, aframe-wordmark, akka-wordmark, algolia-wordmark.
//
// So the signal is the INK, not the box: the bounding box of the opaque pixels.
// That number is wide for (a) and for (b) alike.
//
// Colored/brand artwork keeps its own colours and sits straight on the page
// ground: the chip around it is a transparent slot, not a box. Artwork whose ink
// is near-black (or near-white in the light theme) would vanish on that ground,
// so the sampled ink tone also picks a one-pixel edge (`ig-chip--halo-*`) that never
// touches the artwork's colours. The measurement is remembered per icon, so
// scrolling or reopening never re-samples.

// The aspect ratio of the box the glyph's opaque pixels occupy, plus the tone of
// that ink (substantial dark neutral ink -> 'dark', near-white average ->
// 'light', anything else 'mid'), and the plate tone when four opaque corners say the
// art is a baked-in square (else null). Any failure
// (CORS taint, decode error) falls back to a square mid-tone ink box - which is exactly
// the treatment every icon had before this measurement existed, so a sampling
// failure degrades to the old behaviour rather than to a broken one.
//
// S is 64 rather than 24 because a 10:1 lockup occupies two rows of a 24px
// raster: enough to see, not enough to measure. At 64 it is a six-row band and
// the ratio is stable.
// Linear luminance below which a chosen icon colour counts as near-black (a saved
// icon's colour; sampleGlyph reads pixels and uses INK_DARK_NEUTRAL_MAX instead).
const INK_DARK_MAX = 0.05
// Per-pixel ceiling for the dark-neutral share in sampleGlyph. Dark greys through
// #5a5a5a (linear 0.10) sit under it; a mid-grey such as #666 (0.13) already has
// enough contrast on a dark page and gets no edge.
const INK_DARK_NEUTRAL_MAX = 0.11
const INK_LIGHT_MIN = 0.82
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
    let darkNeutral = 0
    let x0 = S, y0 = S, x1 = -1, y1 = -1
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 64) continue
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      const lum = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
      sum += lum
      // Dark lettering can dominate a lockup whose coloured mark lifts its
      // average luminance. Ignore saturated ink and tiny dark details.
      if (lum < INK_DARK_NEUTRAL_MAX && Math.max(r, g, b) - Math.min(r, g, b) <= 48) darkNeutral++
      n++
      const p = i / 4
      const px = p % S
      const py = (p - px) / S
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
    }
    if (n === 0) return { ar: 1, cap: 1, ink: 'mid', opaqueCorners: false, plate: null }
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
    const lum = sum / n
    const corners = [0, S - 1, S * (S - 1), S * S - 1]
    const opaqueCorners = corners.every(p => data[p * 4 + 3] === 255)
    // A baked-in square's plate tone: the corners are plate, never artwork.
    const plate = opaqueCorners
      ? corners.reduce((t, p) => t + 0.2126 * toLin(data[p * 4]) + 0.7152 * toLin(data[p * 4 + 1]) + 0.0722 * toLin(data[p * 4 + 2]), 0) / 4
      : null
    return { ar, cap, ink: darkNeutral / n >= 0.25 ? 'dark' : lum > INK_LIGHT_MIN ? 'light' : 'mid', opaqueCorners, plate }
  } catch { return { ar: 1, cap: 1, ink: 'mid', opaqueCorners: false, plate: null } }
}


// Brand artwork keeps its colours in a transparent, fixed-size slot.
// Which halo (if any) keeps ink that matches the page ground readable: near-black
// ink on the dark theme gets a light halo, near-white ink on the light theme a dark one.
// A flag or emoji never gets one: its average tone says little about its edge, and its
// outline is part of the artwork.
const FLAG_PACKS = new Set([...ICON_GROUPS.flags.packs, 'twemoji'])
const haloFor = (ink, theme, pack) => {
  if (FLAG_PACKS.has(pack)) return ''
  return ink === 'dark' && theme !== 'light' ? 'halo-light' : ink === 'light' && theme === 'light' ? 'halo-dark' : ''
}

// Single-colour near-black pack art (GitHub, Apple, Vercel, X) is drawn in the page's
// own ink in the grid, like a mono icon, instead of keeping its black behind a ring: the
// same brand then reads solid in the Iconify and Logo.dev grids. Only the display
// changes; the markup, copy and download keep the art's own colours. Mixed wordmarks
// (more than one paint) are not this and keep their ring. The answer for a name never
// changes once its body has arrived, so it is worked out once.
const SOLID_INK = new Map() // 'pack:name' → true when the art is one near-black colour
function readsAsThemeInk(pack, name) {
  if (FLAG_PACKS.has(pack)) return false
  const key = svgKey(pack, name)
  const known = SOLID_INK.get(key)
  if (known !== undefined) return known
  const text = glyphSvgText(pack, name)
  if (!text) return false
  const solid = isNearBlackMono(text, INK_DARK_MAX)
  SOLID_INK.set(key, solid)
  return solid
}

// Ink tone already known for an icon in the customiser or My Icons: the grid's
// measurement of the same pack glyph, else one taken from the saved markup.
const SAVED_INK = new Map() // saved-icon key → 'dark' | 'light' | 'mid'
function measuredInk(icon, brandKey) {
  if (brandKey) return glyphCache.get(brandKey)?.ink || null
  if (icon?.custom) return glyphCache.get(svgKey(icon.pack, icon.base))?.ink || SAVED_INK.get(icon.key) || null
  return null
}
// Ink tone of standalone SVG markup, read through an off-screen image.
function sampleSvgInk(svgText, done) {
  const img = new Image()
  img.onload = () => done(sampleGlyph(img).ink)
  img.src = svgToDataUri(svgText)
}

function BrandGlyph({ pack, name, src, gone = false }) {
  const key = svgKey(pack, name)
  const { theme } = useTheme()
  const [shape, setShape] = useState(() => glyphCache.get(key) || { ar: 1, cap: 1, ink: 'mid' })
  const cached = glyphCache.get(key)
  if (cached && cached !== shape) setShape(cached)
  // 'wait' until the <img> loads, 'in' for a load that was watched (it fades),
  // 'ready' for artwork already measured on an earlier mount (no fade), 'fail'
  // when the image errored. Reset when the cell is handed a different icon.
  const [load, setLoad] = useState(() => ({ key, phase: cached ? 'ready' : 'wait' }))
  let phase = load.phase
  if (load.key !== key) {
    phase = cached ? 'ready' : 'wait'
    setLoad({ key, phase })
  }
  const onLoad = (e) => {
    setLoad((l) => (l.key === key && l.phase === 'wait' ? { key, phase: 'in' } : l))
    if (glyphCache.has(key)) return
    const next = sampleGlyph(e.currentTarget)
    glyphCache.set(key, next)
    setShape(next)
  }
  const onError = () => setLoad({ key, phase: 'fail' })
  const wide = shape.ar > WIDE_INK
  const solidInk = !!src && readsAsThemeInk(pack, name)
  const halo = solidInk ? '' : haloFor(shape.ink, theme, pack)
  const waiting = !gone && (!src || phase === 'wait')
  return (
    <span
      className={`ig-chip${wide ? ' ig-chip--wide' : ''}${halo ? ` ig-chip--${halo}` : ''}${waiting ? ' ig-chip--wait' : phase === 'in' ? ' ig-chip--in' : ''}`}
      style={wide ? { '--ig-wide-cap': shape.cap } : undefined}
    >
      {src && (
        <img
          src={src}
          className={[phase === 'wait' ? 'ig-glyph-pending' : phase === 'in' ? 'ig-glyph-in' : '', solidInk ? 'ig-inv' : ''].filter(Boolean).join(' ')}
          loading="lazy"
          alt={name}
          onLoad={onLoad}
          onError={onError}
        />
      )}
    </span>
  )
}

// Previously painted sources skip the loading fade on remount.
const paintedSrc = new Set()
function MonoGlyph({ src, className, alt, onError }) {
  const [phase, setPhase] = useState(() => (paintedSrc.has(src) ? 'ready' : 'wait'))
  const [seen, setSeen] = useState(src)
  if (seen !== src) {
    setSeen(src)
    setPhase(paintedSrc.has(src) ? 'ready' : 'wait')
  }
  const state = phase === 'wait' ? 'ig-glyph-pending' : phase === 'in' ? 'ig-glyph-in' : ''
  return (
    <img
      src={src}
      width="24"
      height="24"
      className={[className, state].filter(Boolean).join(' ')}
      loading="lazy"
      alt={alt}
      onLoad={() => {
        paintedSrc.add(src)
        setPhase((p) => (p === 'wait' ? 'in' : p))
      }}
      onError={(e) => {
        setPhase('fail')
        if (onError) onError(e)
      }}
    />
  )
}

// ── Grid cell ────────────────────────────────────────────────────────────────

// The pack a cell names under its label; see the note at `renderGrid`.
const packOf = (icon) => (icon.logo ? 'logo.dev' : (icon.custom ? null : icon.pack || null))

const gridShowsPack = (list) => {
  let firstPack = null
  for (const icon of list) {
    const pack = packOf(icon)
    if (!pack) continue
    if (firstPack === null) firstPack = pack
    else if (pack !== firstPack) return true
  }
  return false
}

// Hover warm-up waits for the pointer to rest. Scrolling drags every cell it
// passes under the pointer through mouseenter, so warming on enter queued one
// markup request per cell crossed. One shared timer means only the cell the
// pointer settles on is fetched. Focus still warms at once (see IconCell).
const WARM_DELAY_MS = 150
let warmTimer = 0
const warmSoon = (icon) => {
  clearTimeout(warmTimer)
  warmTimer = setTimeout(() => prefetchIconSvg(icon), WARM_DELAY_MS)
}
const warmCancel = () => clearTimeout(warmTimer)

// Saved artwork uses a transparent slot, with a halo from its chosen colour
// or measured ink tone when it matches the page ground.
function SavedPackGlyph({ icon }) {
  const { theme } = useTheme()
  const [measured, setMeasured] = useState(null)
  const luminance = icon.color ? relativeLuminance(icon.color) : null
  const ink = luminance !== null
    ? (luminance < INK_DARK_MAX ? 'dark' : luminance > INK_LIGHT_MIN ? 'light' : 'mid')
    : measuredInk(icon, null) || measured || 'mid'
  const onLoad = (e) => {
    if (measuredInk(icon, null)) return
    const next = sampleGlyph(e.currentTarget).ink
    if (icon.key) SAVED_INK.set(icon.key, next)
    setMeasured(next)
  }
  const halo = haloFor(ink, theme, icon.pack)
  return (
    <span className={halo ? `ig-chip ig-chip--${halo}` : 'ig-chip'}>
      <img src={svgToDataUri(icon.svg)} width="24" height="24" loading="lazy" alt={icon.name} onLoad={onLoad} />
    </span>
  )
}

// A baked light plate stands out hard on the dark page. When the theme variant
// comes back as one, the default variant is sometimes a darker plate, so it is
// sampled once off-screen and used instead when it is clearly darker.
const PLATE_LIGHT_MIN = 0.5
const PLATE_DARKER_BY = 0.25
function probeDefaultPlate(ref, themePlate, done) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const next = sampleGlyph(img)
    if (next.opaqueCorners && next.plate !== null && next.plate < themePlate - PLATE_DARKER_BY) done({ ...next, useDefault: true })
  }
  img.src = logodevUrl(ref, 64)
}

// Sample each logo variant once. Only baked-in opaque corners get rounded, with
// a hairline on the plate's own edge (CSS) in place of the halo; transparent
// marks stay unrounded and the halo follows the artwork's ink. A load the
// browser refuses for CORS is shown plain: no sampling, so no halo or rounding.
function LogoDevGlyph({ icon }) {
  const { theme } = useTheme()
  const key = `logodev:${icon.ref}:${theme}`
  const [measured, setMeasured] = useState(null)
  const [plainKey, setPlainKey] = useState(null)
  const plain = plainKey === key
  const shape = plain ? null : glyphCache.get(key) || (measured?.key === key ? measured.shape : null)
  const halo = shape?.opaqueCorners ? '' : haloFor(shape?.ink, theme, 'logodev')
  const onLoad = (e) => {
    if (plain) return
    if (!glyphCache.has(key)) {
      const next = sampleGlyph(e.currentTarget)
      glyphCache.set(key, next)
      if (theme !== 'light' && next.opaqueCorners && next.plate > PLATE_LIGHT_MIN) {
        probeDefaultPlate(icon.ref, next.plate, (darker) => {
          glyphCache.set(key, darker)
          setMeasured({ key, shape: darker })
        })
      }
    }
    setMeasured({ key, shape: glyphCache.get(key) })
  }
  return (
    <span className={`ig-chip${halo ? ` ig-chip--${halo}` : ''}`}>
      <img
        key={plain ? `${key}:plain` : key}
        {...(plain ? {} : { crossOrigin: 'anonymous' })}
        src={logodevUrl(icon.ref, 64, shape?.useDefault ? undefined : theme)}
        width="28"
        height="28"
        className={`ig-logo${shape?.opaqueCorners ? ' ig-logo--square' : ''}`}
        loading="lazy"
        alt={icon.name}
        onLoad={onLoad}
        onError={plain ? undefined : () => setPlainKey(key)}
      />
    </span>
  )
}

// A sprite cell. The effect is the one place a drawn icon is marked as recently
// used: it runs when the cell mounts (a page revealed, a ghost restored), not on
// every render of the grid.
function SpriteGlyph({ href, symKey, className }) {
  useEffect(() => { touchSymbol(symKey) }, [symKey])
  return (
    <svg width="24" height="24" className={className} aria-hidden="true" focusable="false">
      <use href={href} />
    </svg>
  )
}

// One glyph renderer for custom (saved), logo, CDN and embedded icons.
// `src` is the batched CDN data URI, passed in so a cell re-renders only when
// its own markup lands.
function cellGlyph(icon, src, onGlyphError, gone) {
  if (icon.custom) {
    if (!icon.colored) return <img src={svgToDataUri(icon.svg)} width="24" height="24" className="ig-inv" loading="lazy" alt={icon.name} />
    return <SavedPackGlyph icon={icon} />
  }
  if (icon.logo) return <LogoDevGlyph icon={icon} />
  if (icon.cdn) {
    if (COLORED_PACKS.has(icon.pack)) return <BrandGlyph pack={icon.pack} name={icon.name} src={src} gone={gone} />
    // The batched body, composed into a data: URI. Empty until its tranche
    // lands, which is a cell that has not painted yet rather than a cell that
    // failed — so NO per-icon URL fallback here. Falling back would put one
    // request per cell back on the first paint, and the batch's own refusal is
    // already handled where it can be read. A name the service has no icon for
    // is an empty slot, not a skeleton.
    if (!src) return <span className={gone ? 'ig-glyph-gone' : 'ig-glyph-wait'} aria-hidden="true" />
    // A `#id` is a symbol in the sprite: it exists as soon as the body does, so
    // there is no load to wait for and no state to hold. The cell's own
    // aria-label names it, as it did the <img> alt.
    if (src.charCodeAt(0) === 35) {
      return <SpriteGlyph href={src} symKey={svgKey(icon.pack, icon.name)} className={`ig-sym ${invClass(icon.pack)}`.trim()} />
    }
    return <MonoGlyph src={src} className={invClass(icon.pack)} alt={icon.name} onError={onGlyphError} />
  }
  return (
    <svg viewBox="0 0 24 24" fill={icon.filled ? 'currentColor' : 'none'} stroke={icon.filled ? 'none' : 'currentColor'} aria-hidden="true">
      <path d={icon.d} />
    </svg>
  )
}

// Memoised so a grid change re-renders only the cells it touches. Appending a
// page, a tranche of markup landing or the customizer opening used to re-run
// every mounted cell; every prop here is a primitive, a stable callback or the
// icon object itself, which the list keeps by identity.
//
// `ghost` (a height in px) is the windowed form of a cell far above the
// viewport: the same focusable element at its measured height, holding only its
// name. It stays the same element so focus and find-in-page can still land on
// it, and scrolling it back into view restores the glyph in place.
const IconCell = memo(function IconCell({ icon, src, gone = false, showPack, picked, ghost = 0, onPick, onWarm, onGlyphError }) {
  const pack = showPack ? packOf(icon) : null
  return (
    <div
      className={picked ? 'ic is-picked' : 'ic'}
      style={ghost ? { height: ghost } : undefined}
      role="button"
      tabIndex={0}
      aria-label={icon.logo ? `Copy ${icon.name} logo URL` : `Customise ${icon.name}`}
      onClick={() => onPick(icon)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(icon) } }}
      onMouseEnter={() => onWarm(icon, false)}
      onMouseLeave={warmCancel}
      onFocus={() => onWarm(icon, true)}
    >
      {!ghost && <Fragment key="g">{cellGlyph(icon, src, onGlyphError, gone)}</Fragment>}
      <span key="n" className="ic-name">{icon.name}</span>
      {!ghost && pack && <span key="p" className="ic-pack">{icon.logo ? 'Logo.dev' : gridPackLabel(pack)}</span>}
    </div>
  )
})

// Windowing for long grids. Cells scrolled more than this far above the
// viewport drop their glyph and keep their measured height (see IconCell), so
// the DOM stops growing with the list while the scroll position and row heights stay
// exactly where they were. Only rows that have already been laid out are ever
// swapped, which is what keeps the swap from shifting anything on screen.
const WINDOW_OVERSCAN_PX = 800
// Swap in steps of this many cells so a fast scroll commits a few times a
// second rather than once per row. 24 divides into every column count the
// grid uses on a phone (3, 4) and keeps a step to a few rows on desktop.
const GHOST_STEP = 24

// ── Pure helpers (module scope — reused by the customizer + browse fns) ───────

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
// downloaded markup matches the Stage exactly (a workaround for Lucide's copy
// resetting to default attributes — never fall back to defaults).
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

// One "Similar in this pack" tile. It stays invisible (but in layout, so the
// 44px row never shifts) until its glyph has loaded, then fades in: an empty
// outlined tile is a loading square, and those are dropped. A glyph that
// errors stays hidden. `visibility:hidden` also keeps a not-yet-shown tile out
// of the tab order. A cached image can finish before React attaches onLoad, so
// the ref callback checks it on attach. `onReadyChange` tells the section
// whether any tile is showing, so it can hold back its heading and frame.
function SimilarTile({ s, src, onPick, onReadyChange }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { onReadyChange(s.id, ready) }, [s.id, ready, onReadyChange])
  return (
    <button
      type="button"
      className="icust-similar-btn"
      data-ready={ready ? 'true' : undefined}
      title={s.name}
      aria-label={`Open ${s.name}`}
      onClick={() => onPick?.(s)}
    >
      <img
        ref={el => { if (el && el.complete && el.naturalWidth > 0) setReady(true) }}
        src={src}
        width="24"
        height="24"
        alt=""
        onLoad={() => setReady(true)}
        onError={() => setReady(false)}
      />
    </button>
  )
}

// The "Similar in this pack" block. Its heading, rule and padding stay
// collapsed (the tiles still mount so their glyphs load) until at least one
// tile is showing, so a slow or fully failed pack never leaves a label over
// an empty row. The images load eagerly: a lazy image inside a collapsed block
// would never count as near the viewport. Keyed by the icon at the call site,
// so each icon starts with nothing ready.
function SimilarSection({ list, srcFor, onPick }) {
  const [readyIds, setReadyIds] = useState({})
  const onReadyChange = useCallback((id, ready) => {
    setReadyIds(prev => (!!prev[id] === ready ? prev : { ...prev, [id]: ready }))
  }, [])
  const anyReady = list.some(s => readyIds[s.id])
  return (
    <div className="icust-similar" data-ready={anyReady ? 'true' : undefined}>
      <div className="icust-similar-label">Similar in this pack</div>
      <div className="icust-similar-row">
        {list.map(s => (
          <SimilarTile key={s.id} s={s} src={srcFor(s)} onPick={onPick} onReadyChange={onReadyChange} />
        ))}
      </div>
    </div>
  )
}

// ── Icon customizer ──────────────────────────────────────────────────────────
// Replaces the old IconDetail. A structural sibling of ExportPanel: a dark
// spotlight "Stage" with live --ig-* preview, sanitised inline SVG, copy
// serialisation, and a Pro-gated Save. Adopts ExportPanel's a11y verbatim.
function IconCustomizer({ icon, addMode, isPro, saveLimit = Infinity, onClose, onCopy, onPick }) {
  const { user } = useAuth()
  const { projects, saveProject, projectLimit } = useProject()
  const { openProModal } = useProModal()
  const { requireLogin } = useLoginPrompt()
  // Producing a FILE needs a free account; copying never does.
  const requireExportAccount = useExportGate()
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
  const [size, setSize] = useState(() => (icon?.custom && icon.size) || icon?.draftSize || CUSTOMISER_DEFAULTS.size)
  const [color, setColor] = useState(() => (icon?.custom && icon.color) || CUSTOMISER_DEFAULTS.color)
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
  const [cap, setCap] = useState(() => (icon?.custom && icon.cap) || CUSTOMISER_DEFAULTS.cap)
  const [join, setJoin] = useState(() => (icon?.custom && icon.join) || CUSTOMISER_DEFAULTS.join)
  const [rotate, setRotate] = useState(CUSTOMISER_DEFAULTS.rotate)
  const [flipH, setFlipH] = useState(CUSTOMISER_DEFAULTS.flipH)
  const [flipV, setFlipV] = useState(CUSTOMISER_DEFAULTS.flipV)
  const [copied, setCopied] = useState('')
  // The file format the Download button hands over; it follows the account.
  const [dlFormat, setDlFormat] = useState(() => readDownloadFormat())
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

  const inColoredPack = !!(activeIcon?.cdn && COLORED_PACKS.has(activeIcon.pack))
  const isStroke = useMemo(() => {
    if (!activeIcon) return false
    if (activeIcon.custom) return !!activeIcon.isStroke
    if (activeIcon.svg) return detectPastedStroke(activeIcon.svg)
    if (activeIcon.cdn) return STROKE_PACKS.has(activeIcon.pack) && matchesRegular(activeIcon.pack, activeIcon.name)
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
    // The tiles are <img> URLs on the Iconify host, which an animated set never uses.
    if (isAnimatedPack(activeIcon.pack)) return
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
            .filter(n => n !== name && n.split(/[-_]/)[0] === root && canSeeIcon(pack, n, isPro ? 'paid' : 'free'))
            .slice(0, 6)
            .map(n => ({ id: `${pack}:${n}`, pack, name: n, cdn: true })),
        })
      })
      .catch(() => { /* non-fatal — just hide the row */ })
    return () => { cancelled = true }
  }, [activeIcon, isPro])

  const currentId = activeIcon ? (activeIcon.id || `${activeIcon.pack}:${activeIcon.name}`) : null
  const similarList = similar.id === currentId ? similar.list : []
  const fetchedBase = fetched.id === currentId ? fetched.svg : null
  const loadErr = fetched.id === currentId ? fetched.err : false
  // Synchronous seed from the module caches — an icon whose markup was already
  // resolved (the grid's batched glyphs, hover prefetch, or opened before) paints
  // on the very first frame instead of flashing "Loading…" while the effect
  // round-trips.
  const cachedCdnBase = useMemo(() => {
    if (!activeIcon?.cdn || activeIcon.custom) return null
    const raw = svgTextReady.get(svgKey(activeIcon.pack, activeIcon.name)) || glyphSvgText(activeIcon.pack, activeIcon.name)
    return raw ? sanitizeSvgMarkup(raw) : null
  }, [activeIcon])
  const rawBaseSvgText = localBase || fetchedBase || cachedCdnBase
  // A saved icon carries its own markup and nothing fetches it, so it never waits.
  const { coloured: isColoredPack, row: colourRow } = colourRowState({ inColouredPack: inColoredPack, svg: rawBaseSvgText, failed: loadErr || !!activeIcon?.custom })
  const baseSvgText = useMemo(() => inColoredPack && !isColoredPack && rawBaseSvgText
    ? monochromeSvg(rawBaseSvgText) : rawBaseSvgText,
  [inColoredPack, isColoredPack, rawBaseSvgText])

  // Inject the neutral base inline on the Stage; CSS vars drive its appearance.
  // A layout effect, so the art lands in the same frame the waiting glyph leaves.
  useLayoutEffect(() => {
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
  //
  // A layout effect declared after the injection above: React runs them in order
  // before paint, so the art never shows a frame with a stale stroke.
  useLayoutEffect(() => {
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

  // Lock page scroll + restore focus to the opener on unmount (mirror ExportPanel).
  useEffect(() => {
    const unlockScroll = lockScroll()
    const opener = restoreRef.current
    return () => {
      unlockScroll()
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  // Move focus into the panel, trap Tab, close on Escape (mirror ExportPanel).
  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      // Only what can take focus right now: a hidden Similar tile (visibility
      // hidden, or inside a collapsed block) is not a Tab stop.
      const f = Array.from(panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) || []).filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
      if (f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const strokeCaption = strokeScaleCaption({ size, stroke, absolute: absStroke })
  const serializedOutput = useMemo(
    () => serializeCustomizedSvg(baseSvgText, { size, color: (!isColoredPack && color) || undefined, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV }),
    [baseSvgText, size, color, isColoredPack, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV],
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

  // Reuse the grid's cached markup, resolving currentColor for standalone images.
  const previewSvg = useMemo(() => serializeCustomizedSvg(baseSvgText, {
    size, color: isColoredPack ? undefined : (color || themeInk),
    stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV,
  }), [baseSvgText, size, color, themeInk, isColoredPack, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV])
  const previewSrc = useMemo(() => (previewSvg ? svgToDataUri(previewSvg) : stageImgUrl), [previewSvg, stageImgUrl])
  // The frame on screen is the last one that decoded for THIS icon. A new size,
  // rotation or colour decodes off-screen and swaps in, so the picture never
  // blanks between frames; "Loading…" only covers an icon's first paint.
  const [frame, setFrame] = useState(() => ({ id: currentId, src: previewSvg ? previewSrc : '', failed: false }))
  useEffect(() => {
    if (!previewSrc) return undefined
    let live = true
    const probe = new Image()
    probe.onload = () => { if (live) setFrame({ id: currentId, src: previewSrc, failed: false }) }
    probe.onerror = () => { if (live) setFrame(f => ({ id: currentId, src: f.id === currentId ? f.src : '', failed: true })) }
    probe.src = previewSrc
    return () => { live = false; probe.onload = null; probe.onerror = null }
  }, [previewSrc, currentId])
  const shownSrc = (frame.id === currentId && frame.src) || (previewSvg ? previewSrc : '')
  const imageError = frame.id === currentId && frame.failed
  // Duotone artwork (Phosphor, Solar `-bold-duotone`, and any other `-duotone`
  // name) keeps its own two-tone treatment when no colour is picked.
  const isDuotone = /-duotone$/.test((activeIcon?.custom ? activeIcon.base : activeIcon?.name) || '')
  // Brand/colored artwork keeps its own colours and sits on the page ground, like
  // an un-tinted mono icon. Near-page-ink artwork gets the same faint halo as its
  // grid cell; the tone comes from the shared cache, refined by the stage image's
  // own onLoad sampling if the grid has not measured it.
  // A saved pack glyph has no stage <img> to sample (it is drawn inline), so its
  // tone comes from the grid's measurement of the same glyph, else from its markup.
  const brandKey = activeIcon?.cdn && !activeIcon.custom && isColoredPack ? svgKey(activeIcon.pack, activeIcon.name) : null
  const savedPack = !!(activeIcon?.custom && isColoredPack)
  const inkKey = brandKey || (savedPack ? `saved:${activeIcon.key}` : null)
  const [brandInk, setBrandInk] = useState(() => measuredInk(activeIcon, brandKey) || 'mid')
  const [prevInkKey, setPrevInkKey] = useState(inkKey)
  if (inkKey !== prevInkKey) {
    // Derive-during-render on icon change (no effect → no cascading-render lint).
    setPrevInkKey(inkKey)
    setBrandInk(measuredInk(activeIcon, brandKey) || 'mid')
  }
  useEffect(() => {
    if (!savedPack || !baseSvgText || measuredInk(activeIcon, null)) return
    let cancelled = false
    sampleSvgInk(baseSvgText, (ink) => {
      if (cancelled) return
      if (activeIcon.key) SAVED_INK.set(activeIcon.key, ink)
      setBrandInk(ink)
    })
    return () => { cancelled = true }
  }, [savedPack, baseSvgText, activeIcon])
  const onStageImgLoad = (e) => {
    // Only a data: frame can be read back; the remote fallback shown before the
    // markup arrives would taint the canvas and cache a wrong measurement.
    if (!brandKey || !e.currentTarget.currentSrc.startsWith('data:')) return
    if (!glyphCache.has(brandKey)) glyphCache.set(brandKey, sampleGlyph(e.currentTarget))
    setBrandInk(glyphCache.get(brandKey).ink)
  }
  const stageHalo = isColoredPack ? haloFor(brandInk, theme, activeIcon?.pack) : ''
  const effectiveColor = isColoredPack ? '#F4F4F5' : (color || themeInk)
  const stageIsLight = !isColoredPack && relativeLuminance(effectiveColor) < 0.35
  // An un-tinted icon is drawn in the theme's own ink, so its stage is the theme's
  // own page ground. A coloured pack always uses it; a chosen mono colour keeps
  // the contrast ground.
  const onThemeGround = isColoredPack || !color
  // Until the stage has its own art, show the glyph the grid drew for this icon
  // (same data: URI, so nothing new is fetched) in the stage's box. It is only
  // used on the theme ground, where the grid's tint matches. With no grid glyph
  // (or a chosen colour) the slot stays the same size and paints nothing.
  const waitSrc = activeIcon?.cdn && !activeIcon.custom && onThemeGround ? glyphDataUri(activeIcon.pack, activeIcon.name) : ''
  const stageWait = waitSrc
    ? <img className={`icust-stage-img icust-stage-wait ${invClass(activeIcon.pack)}`} src={waitSrc} width={size} height={size} alt="" aria-hidden="true" />
    : <span className="icust-stage-img icust-stage-wait" style={{ width: size, height: size }} aria-hidden="true" />

  const markDirty = () => setSavedState(s => (s === 'saved' ? 'idle' : s))

  const applyPaste = () => {
    const clean = sanitizeSvgMarkup(pasteText)
    if (!clean) { setPasteErr(true); return }
    setPasteErr(false)
    setPasted({ svg: clean, isStroke: detectPastedStroke(clean) })
  }

  // Free-tier daily cap: gate BEFORE the clipboard write, so a capped copy is a
  // pure no-op that opens the upgrade prompt — nothing lands on the clipboard.
  // Copy, save and download need the icon's real markup. A coloured-pack stage is
  // an <img> that paints before that markup arrives, so these wait for it (their
  // buttons are disabled meanwhile) rather than send an empty string.
  const handleCopySvg = async () => {
    if (!baseSvgText) return
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
    if (!baseSvgText) return
    if (!isPro && readCopyCount() >= FREE_COPIES_PER_DAY) { showProGate('copies'); return }
    const ok = await writeClipboard(serializedOutput)
    if (!ok) return
    if (!isPro) bumpCopyCount()
    trackIconCopy(activeIcon?.pack || null, activeIcon?.name || 'icon')
    setCopied('code')
    setTimeout(() => setCopied(''), 2000)
  }

  // Copying the SVG stays free; taking the FILE needs a free account.
  // See src/hooks/useExportGate.js.
  // Every format goes through the same gate. `format` is a described format from
  // utils/iconDownload.js; the result tells the button what to show.
  const handleDownload = async (format) => {
    if (!serializedOutput) return { status: 'none' }
    if (!(await requireExportAccount('download this icon'))) return { status: 'cancelled' }
    const file = downloadFileName(activeIcon?.name, format)
    try {
      if (format.kind === 'svg') {
        saveBlobAs(new Blob([serializedOutput], { type: 'image/svg+xml' }), file)
      } else {
        // The PNG is the preview drawn at `px`: a stroke width is in pixels of
        // the size it was set at, so it scales with the export (a Fixed stroke
        // included), and a plain icon takes the ink the stage shows because a
        // PNG has no `currentColor` to inherit.
        const grow = format.px / (size || 1)
        const svg = serializeCustomizedSvg(baseSvgText, {
          size: format.px, color: isColoredPack ? undefined : (color || themeInk),
          stroke: stroke * grow, isStroke, absStroke, cap, join, rotate, flipH, flipV,
        })
        saveBlobAs(await svgToPngBlob(svg), file)
      }
      return { status: 'done', file }
    } catch { return { status: 'failed' } }
  }
  const pickDownloadFormat = (id) => { setDlFormat(id); writeDownloadFormat(id) }

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
    if (!isPro && used >= saveLimit) { setSavePickerOpen(false); openInNewTab('/plans'); return }
    const base = activeIcon.custom ? activeIcon.base : (activeIcon.cdn || activeIcon.d ? activeIcon.name : 'icon')
    const { iteration, name } = nextCustomName(base, existing)
    const colored = isColoredPack || !!color || (activeIcon.pasted === true && !isStroke)
    const svg = serializeCustomizedSvg(baseSvgText, { size, color: (!isColoredPack && color) || undefined, stroke, isStroke, absStroke, cap, join, rotate, flipH, flipV })
    const record = {
      ...newCustomIconStamp(),
      base, iteration, name, projectId,
      pack: activeIcon.pack || null, cdn: !!activeIcon.cdn,
      svg, color: isColoredPack ? '' : (color || ''), size, stroke, absStroke, cap, join, isStroke, colored,
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
    const d = CUSTOMISER_DEFAULTS
    setSize(d.size)
    setColor(d.color)
    setStroke(d.stroke)
    writeStickyStroke(d.stroke)
    setAbsStroke(d.absStroke)
    setCap(d.cap)
    setJoin(d.join)
    setRotate(d.rotate)
    setFlipH(d.flipH)
    setFlipV(d.flipV)
    markDirty()
    // The button hides once nothing differs, so focus goes to the first control.
    document.getElementById('icust-size')?.focus()
  }
  // True while any control differs from what handleReset sets.
  const edited = size !== CUSTOMISER_DEFAULTS.size || color !== CUSTOMISER_DEFAULTS.color
    || stroke !== CUSTOMISER_DEFAULTS.stroke || absStroke !== CUSTOMISER_DEFAULTS.absStroke
    || cap !== CUSTOMISER_DEFAULTS.cap || join !== CUSTOMISER_DEFAULTS.join
    || rotate !== CUSTOMISER_DEFAULTS.rotate || flipH !== CUSTOMISER_DEFAULTS.flipH
    || flipV !== CUSTOMISER_DEFAULTS.flipV

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

  // The Save button's words for each width of the footer (the stylesheet shows
  // one): the full label, a short one, and a glyph alone. The full label is
  // always the accessible name.
  const saveLabel = savedState === 'saved'
    ? (saveHover
      ? { full: 'Save to another project', short: 'Save again', glyph: 'check' }
      : { full: savedProjectName ? `Saved to ${savedProjectName}` : 'Saved to Custom Icons', short: 'Saved', glyph: 'check' })
    : savedState === 'error' ? { full: 'Couldn’t save. Retry', short: 'Retry', glyph: 'alert' }
      : activeIcon?.custom ? { full: 'Save as new', short: 'Save new', glyph: 'folder-plus' }
        : { full: 'Save to project', short: 'Save', glyph: 'folder-plus' }
  // Hover re-arms a saved button only where there is a hover; a tap would latch it.
  const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches

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
              <button type="button" className="lib-btn" onClick={onClose}>Cancel</button>
              <button type="button" className="lib-btn lib-btn--primary" onClick={applyPaste}>Add to stage</button>
            </div>
          </div>
        ) : (
          <>
            <div className={`icust-stage${stageIsLight ? ' icust-stage--light' : ''}${onThemeGround ? ' icust-stage--theme' : ''}${stageHalo ? ` icust-stage--${stageHalo}` : ''}${absStroke ? ' is-abs' : ''}`} ref={stageRef}>
              {rendersInline ? (
                <>
                  <div ref={hostRef} className="icust-stage-host" aria-hidden="true" />
                  {!baseSvgText && !loadErr && stageWait}
                  {!baseSvgText && <span className="icust-stage-msg" role="status">{loadErr ? 'Couldn’t load this icon.' : <span className="sr-only">Loading…</span>}</span>}
                </>
              ) : (
                <>
                  {shownSrc ? (
                    <img
                      className="icust-stage-img"
                      src={shownSrc}
                      width={size}
                      height={size}
                      alt={activeIcon.name}
                      onLoad={brandKey ? onStageImgLoad : undefined}
                      style={imageError ? { visibility: 'hidden' } : undefined}
                    />
                  ) : imageError ? (
                    <span className="icust-stage-img" style={{ width: size, height: size }} aria-hidden="true" />
                  ) : stageWait}
                  {(!shownSrc || imageError) && <span className="icust-stage-msg" role="status">{imageError ? 'Couldn’t load this icon.' : <span className="sr-only">Loading…</span>}</span>}
                </>
              )}
            </div>

            <div className="icust-meta">
              <div className="icust-tags">
                <span className="icust-tag">{activeIcon.custom ? 'Custom' : activeIcon.pasted ? 'Pasted' : (activeIcon.pack || 'embedded')}</span>
                <span className="icust-tag icust-tag--name" title={activeIcon.name}>{activeIcon.name}</span>
                {activeIcon.cdn && !activeIcon.custom && <span className="icust-tag">CDN</span>}
              </div>
              {/* Reset changes the controls, so it sits with them. It shows only
                  once something differs; hidden (not removed) so the row holds. */}
              <button
                type="button"
                className={`lib-btn icust-reset${edited ? '' : ' is-hidden'}`}
                onClick={handleReset}
                aria-label="Reset to default"
              >Reset</button>
            </div>

            <div className="icust-controls">
              <div className="icust-row">
                <label htmlFor="icust-size">Size</label>
                <SnapSlider
                  id="icust-size"
                  min={12}
                  max={128}
                  value={size}
                  defaultValue={CUSTOMISER_DEFAULTS.size}
                  snaps={[12, 16, 24, 32, 48, 64, 96, 128]}
                  unit="px"
                  inputMax={1024}
                  ariaLabel="Icon size"
                  onChange={(v) => { setSize(v); markDirty() }}
                />
              </div>

              <div className={`icust-row${colourRow === 'wait' ? ' icust-row--wait' : ''}`}>
                <label>Colour</label>
                {colourRow === 'original' ? (
                  <span className="icust-value">Original colours</span>
                ) : colourRow === 'wait' ? (
                  <span className="icust-value">&nbsp;</span>
                ) : (
                  <>
                    <div className="icust-seg">
                      {isDuotone && <button type="button" className={!color ? 'active' : ''} onClick={() => { setColor(''); markDirty() }}>Default</button>}
                      <button type="button" className={color === '#000000' ? 'active' : ''} onClick={() => { setColor('#000000'); markDirty() }}>Black</button>
                      <button type="button" className={color === '#ffffff' ? 'active' : ''} onClick={() => { setColor('#ffffff'); markDirty() }}>White</button>
                    </div>
                    <ColorPickerPop value={color || themeInk} onChange={(v) => { setColor(v); markDirty() }} />
                  </>
                )}
              </div>

              {isStroke && (
                <div className="icust-stroke">
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
                      aria-describedby="icust-stroke-note"
                      onClick={() => { setAbsStroke(a => !a); markDirty() }}
                    >Fixed</button>
                  </div>
                  <p id="icust-stroke-note" className="icust-stroke-note">
                    {strokeCaption.prefix}<b>{strokeCaption.effect}</b>{strokeCaption.suffix}
                  </p>
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
              <button type="button" className="icust-code-box" onClick={handleCopyCode} disabled={!baseSvgText} aria-busy={!baseSvgText && !loadErr}>
                <span className="icust-code-hint">{!baseSvgText ? (loadErr ? 'Unavailable' : 'Loading…') : copied === 'code' ? 'Copied!' : 'Click to copy'}</span>
                <code>{serializedOutput}</code>
              </button>
            </div>

            <div className="icust-foot">
              <button
                type="button"
                className="lib-btn lib-btn--primary icust-copy"
                onClick={handleCopySvg}
                disabled={!baseSvgText}
                aria-busy={!baseSvgText && !loadErr}
                aria-label={copied === 'svg' ? undefined : 'Copy SVG'}
              >
                {copied === 'svg' ? 'Copied!' : <span>Copy<span className="icust-tier-w"> SVG</span></span>}
              </button>

              <SplitDownload
                format={dlFormat}
                size={size}
                disabled={!baseSvgText}
                loading={!baseSvgText && !loadErr}
                onPick={pickDownloadFormat}
                onDownload={handleDownload}
              />

              <button
                type="button"
                className="lib-btn icust-save"
                onClick={handleSave}
                disabled={!baseSvgText}
                aria-busy={!baseSvgText && !loadErr}
                aria-label={saveLabel.full}
                title={saveLabel.full}
                onMouseEnter={() => { if (canHover()) setSaveHover(true) }}
                onMouseLeave={() => setSaveHover(false)}
                onFocus={() => { if (canHover()) setSaveHover(true) }}
                onBlur={() => setSaveHover(false)}
              >
                <span className="icust-save-w">{saveLabel.full}</span>
                <span className="icust-save-p">{saveLabel.short}</span>
                <FooterGlyph name={saveLabel.glyph} className="icust-save-g" />
              </button>
            </div>

            {savedInProjects.length > 0 && (
              <p className="icust-savedin">
                Saved in {savedInProjects.length === 1 ? 'project' : 'projects'}: <strong>{savedInProjects.join(', ')}</strong>
              </p>
            )}

            {similarList.length > 0 && (
              <SimilarSection
                key={currentId}
                list={similarList}
                srcFor={s => buildSvgUrl(API_HOSTS[0], s.pack, s.name, { size: 24, color: isColoredPack ? undefined : themeInk })}
                onPick={onPick}
              />
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
                    className="lib-btn lib-btn--primary"
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

// ── Collection cache ──────────────────────────────────────────────────────────
// Parsed catalogues survive remounts in memory and reloads in localStorage.
// Each caller applies its own style filter to the unfiltered names.
const COLLECTION_CACHE = new Map()

// Browse functions take false (plain), true (Try again) or 'chip' (a pack or group chip click).
// Only 'chip' carries the retry floor; Try again requests at once.
const retryOptions = (retry) => ({ manualRetry: !!retry, chipRetry: retry === 'chip' })

// /collection is the one endpoint the API rate-limits hard (about six requests in a
// few seconds is refused for an hour, every prefix at once), so at most two are in
// flight and the default "All packs" listing never uses it: see src/data/iconHeads.js.
const collectionGate = createLimiter(2)
// info=1 includes registry attribution in the same catalogue request.
// When the request fails and nothing is stored, the committed head of the pack
// stands in (marked `sample`, never cached) so the pack still shows live glyphs.
const getPublicCollectionNames = createCollectionLoader({
  cache: COLLECTION_CACHE,
  fetchEntry: (pack, { refused } = {}) => collectionGate(async () => {
    const stop = refused?.()
    if (stop) throw stop
    const r = await fetchWithFallback(`/collection?prefix=${pack}&info=1`, 6000)
    const d = await r.json()
    return { names: collectionToNames(d), title: d.title || pack, credit: iconifyCredit(d) }
  }),
  lastResort: async (pack) => {
    const head = await loadPackHead(pack)
    return { names: head.names, title: head.title, credit: null, sample: true }
  },
})
// The animated sets' listing comes from the server's Pro check, and is kept in
// memory only: a Pro-only catalogue is never written to localStorage, where the
// next account on this browser could read it.
const getAnimatedCollectionNames = createCollectionLoader({
  cache: COLLECTION_CACHE,
  storage: () => null,
  // A session or plan problem is the viewer's to fix, and an answer dropped as
  // stale is not a failure of the service: neither starts the retry cooldown.
  cooldownExempt: (error) => isPackScopedFailure(classifyAnimatedFailure(error)),
  fetchEntry: async (pack) => {
    const d = await animatedIcons.collection(pack)
    // An answer that lands after the viewer left Pro is dropped, not cached.
    if (!animatedTierIsPaid()) throw staleAnimatedAnswer()
    return { names: collectionToNames(d), title: d.title || pack, credit: iconifyCredit(d) }
  },
})
const getCollectionNames = (pack, options) => (
  isAnimatedPack(pack) ? getAnimatedCollectionNames(pack, options) : getPublicCollectionNames(pack, options)
)
// failed(pack) asks the loader that owns the pack whether its last request failed.
getCollectionNames.failed = (pack) => (
  isAnimatedPack(pack) ? getAnimatedCollectionNames : getPublicCollectionNames
).failed(pack)

// The names the default "All packs" listing starts from for one pack. Regular weight
// (the default) never asks /collection: the catalogue this session already holds if
// there is one, else the pack's committed head, which is what keeps a visit from
// spending the API's /collection allowance on twenty-five packs at once. Another
// weight needs names the head leaves out, and only the packs that draw it, so only
// those are requested. `degraded` marks names standing in for a refresh that failed.
function defaultPackNames(pack, weight, manualRetry) {
  if (weight === 'regular') {
    const live = COLLECTION_CACHE.get(pack)
    if (live) return Promise.resolve({ names: live.names })
    return loadPackHead(pack).then(({ names }) => ({ names }))
  }
  if (!WEIGHT_RULES[weight]?.[pack]) return Promise.resolve({ names: [] })
  return getCollectionNames(pack, { ...retryOptions(manualRetry), allowSample: false })
    .then(({ names }) => ({ names, degraded: getCollectionNames.failed(pack) }))
}

/** Forget everything fetched for the animated sets (the viewer is no longer Pro). */
const forgetAnimatedSets = () => purgeAnimatedCaches({
  byPack: [COLLECTION_CACHE, GLYPH_ASKED, GLYPH_RETRY_AFTER],
  keyed: [GLYPH_BODY, GLYPH_BOX, GLYPH_URI, GLYPH_FAILS, GLYPH_MISSING, svgTextCache, svgTextReady, glyphCache],
})

/** The licence the registry answered for this pack, or null if it never has. */
const liveCredit = (pack) => COLLECTION_CACHE.get(pack)?.credit || null

const PAGE_SIZE = 120
// Cells mounted per frame when a page is revealed (PAGE_SIZE / 3).
const REVEAL_CHUNK = 40

const SOFT_NOTICE_COPY = {
  partial: 'Some icon sets couldn’t load.',
  stale: 'Couldn’t refresh this set — showing the copy saved on this device.',
  sample: 'Couldn’t load the whole set — showing its first icons.',
}

function firstPageReady(count, settled, total, pageSize, timedOut = false) {
  return (timedOut && count > 0) || count >= pageSize || settled >= total
}

/* ── THE PACK MENU, AS DATA ──────────────────────────────────────────────────

   It was twenty-four hand-written <option> elements. Tiering it that way would
   have meant writing the lock marker onto each one by hand — twenty-four places
   to forget one, and nothing to stop a new pack being added to the menu without
   a marker. As a list the marker is applied in ONE expression, driven by the
   table, so a pack's menu entry and its gate can never disagree.

   The second job: the locked panel has to NAME the pack the visitor picked, and
   these are the only human names the product has for them. `iconPackTiers.js`
   deliberately holds no labels — it is about entitlement, not vocabulary.

   Order and pack labels are what the hand-written menu rendered. The interface
   packs are ONE group, "Interface", stroke packs first and the fill-only ones
   after. Headings carry no style word ("line", "filled", "coloured"): the
   Weight and Coloured chips own those words, and a heading repeating one beside
   a pack that cannot do it (Material under "filled" with Fill struck through,
   Simple Icons under "coloured") contradicts the chip. `vscode-icons` and `token-branded` are in ICON_GROUPS but were never offered
   here as individual packs; they reach the grid through the Coloured chip, and
   that is unchanged. */
const PACK_MENU = [
  {
    label: 'Interface',
    packs: [['lucide', 'Lucide'], ['tabler', 'Tabler'], ['iconoir', 'Iconoir'], ['heroicons', 'Heroicons'], ['ph', 'Phosphor'], ['mdi', 'Material Design'], ['material-symbols', 'Material Symbols'], ['solar', 'Solar'], ['fa6-solid', 'Font Awesome'], ['bxs', 'BoxIcons'], ['mingcute', 'MingCute'], ['carbon', 'Carbon']],
  },
  {
    label: 'Brand logos',
    packs: [['logodev', 'Real brand logos (Logo.dev)'], ['simple-icons', 'Simple Icons'], ['logos', 'Logos (colour)'], ['devicon', 'Devicon'], ['skill-icons', 'Skill Icons']],
  },
  {
    label: 'Flags',
    packs: [['circle-flags', 'Circle Flags'], ['flag', 'Flag Icons'], ['flagpack', 'Flagpack'], ['cif', 'Currency Flags']],
  },
  {
    label: 'Flat & emoji',
    packs: [['flat-color-icons', 'Flat Color Icons'], ['twemoji', 'Twemoji'], ['noto', 'Noto Emoji'], ['fluent-emoji', 'Fluent Emoji'], ['openmoji', 'OpenMoji']],
  },
  {
    label: 'Animated',
    packs: [['line-md', 'Line MD (animated)'], ['svg-spinners', 'SVG Spinners (animated)'], ['meteocons', 'Meteocons (animated)']],
  },
]
const PACK_LABELS = Object.fromEntries(PACK_MENU.flatMap(g => g.packs))
const GRID_ONLY_PACK_LABELS = { 'vscode-icons': 'VSCode Icons', 'token-branded': 'Web3 Icons' }
const gridPackLabel = (p) => GRID_ONLY_PACK_LABELS[p] || PACK_LABELS[p] || ''
const packLabel = (p) => PACK_LABELS[p] || p

/* ── THE CREDIT UNDER THE GRID ───────────────────────────────────────────────

   WHAT THIS REPLACES. The whole product used to carry one
   attribution string: the `<p className="ig-attrib">` further down, rendered
   only when `pack === 'logodev'`. Every other set on this screen was uncredited,
   and the one credit that existed vanished the moment the visitor changed packs.

   THAT IS NOT A STYLE POINT. `solar` and `fa6-solid` are CC-BY-4.0 and both sit
   on the FREE tier, so a signed-out visitor is shown Attribution-licensed work
   on first paint; `twemoji` (CC-BY-4.0) and `openmoji` (CC-BY-SA-4.0) are the
   same obligation on Pro. Attribution is a condition of those grants. logo.dev's
   free tier separately requires its link wherever its logos appear — which is
   why this line names the packs ON SCREEN rather than a fixed list, and why it
   renders in every state of the surface including the gated one, the empty one
   and the offline one. A credit with a condition on it is not a credit.

   WHY IT NAMES WHAT IS IN VIEW RATHER THAN ALL 25. Crediting a set whose icons
   are not on the screen is noise, and noise is what teaches people to stop
   reading the line that also carries the four that matter. /credits carries the
   full list, permanently, and this line links to it. */

/* The fallback grid names its packs by LABEL rather than by prefix:
   renderLocal() sets `pack: PACKS[i.p]`, and window.PACKS maps 'L' to 'Lucide'.
   Those 120 built-in icons are still Lucide, Tabler, Iconoir, Heroicons and
   Simple Icons and still owe their notices, so a label is resolved back to its
   prefix instead of five packs going uncredited on the one screen that is
   already apologising for something. */
const PREFIX_BY_LABEL = Object.fromEntries(
  Object.entries(PACK_LABELS).map(([prefix, label]) => [label, prefix]),
)
const toPrefix = (p) => (ICON_PACK_CREDITS[p] ? p : PREFIX_BY_LABEL[p] || p)

/** Every pack represented in the given lists, in first-appearance order. */
function packsOnScreen(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const icon of list || []) {
      if (!icon?.pack) continue
      const prefix = toPrefix(icon.pack)
      if (seen.has(prefix)) continue
      seen.add(prefix)
      out.push(prefix)
    }
  }
  return out
}

/**
 * The persistent licence line.
 *
 * A pack with no row in iconPackCredits.js is one a Pro search reached outside
 * the twenty-five this product curates — the /search endpoint answers from the
 * whole registry when it is left unscoped, which is what a Pro search has always
 * done. It is credited by its prefix, linked to the Iconify set page, which
 * states that set's licence. Firing a /collection for it would be more precise
 * and would also put an unbounded number of extra requests behind a keystroke,
 * on the one surface in this app with a measured history of being rate-limited.
 */
// The weight segment — Regular / Bold / Fill / Duo, the control the design's phone mock
// draws under the search (Spectrum "On mobile"). A pill track with the chosen
// segment lifted onto the card ground, as drawn. A segment the current scope
// cannot honour is `aria-disabled` rather than `disabled`, so a keyboard user
// can still reach it and hear WHY (the reason is in its accessible name and
// its tooltip) instead of meeting a gap in the tab order. When no weight can
// act, the track drops its ground and states the single-style reason as plain
// text in the first segment's place, so it does not read as a control.
function IconWeightSeg({ value, stateOf, onChange }) {
  const states = ICON_WEIGHTS.map((w) => ({ ...w, ...stateOf(w.id) }))
  const singleStyle = states.every((w) => !w.ok)
  const reason = states[0].why
  return (
    <div className={singleStyle ? 'ig-weight ig-weight--single' : 'ig-weight'} role="group" aria-label="Icon weight">
      {/* Always mounted, so a screen reader hears the reason when a group change
          brings it in; empty and click-through while the buttons are showing. */}
      <span className="ig-weight-status" role="status" title={singleStyle ? reason : undefined}>{singleStyle ? reason : ''}</span>
      {singleStyle ? (
        // Noninteractive labels preserve the four-button track's intrinsic width.
        <span className="ig-weight-measure" aria-hidden="true">
          {ICON_WEIGHTS.map((w) => <span key={w.id}>{w.label}</span>)}
        </span>
      ) : states.map((w) => (
        <button
          key={w.id}
          type="button"
          className="ig-weight-btn"
          aria-pressed={w.ok && value === w.id}
          aria-disabled={!w.ok || undefined}
          aria-label={w.ok ? w.label : `${w.label} — ${w.why}`}
          title={w.why || undefined}
          onClick={() => { if (w.ok) onChange(w.id) }}
        >
          {w.label}
        </button>
      ))}
    </div>
  )
}

function IconPackCredit({ packs }) {
  const rows = packs.map((prefix) => packCredit(prefix, liveCredit(prefix)) || {
    prefix,
    name: prefix,
    url: `https://icon-sets.iconify.design/${prefix}/`,
    licenceName: 'licence on Iconify',
  })
  return (
    <aside className="ig-credit" aria-label="Icon set licences">
      {rows.length > 0 && (
        <p className="ig-credit-packs">
          {rows.map((row, i) => (
            <span className="ig-credit-pack" key={row.prefix}>
              {i > 0 && <span className="ig-credit-sep" aria-hidden="true"> · </span>}
              <a href={row.url} target="_blank" rel="noopener noreferrer">{row.name}</a>
              {' '}
              <span className="ig-credit-lic">{row.licenceName}</span>
            </span>
          ))}
        </p>
      )}
      <p className="ig-credit-more">
        <Link to="/credits">Every set, its author and its licence in full</Link>
      </p>
    </aside>
  )
}

// The word a locked control carries. 'Pro' and 'Log in' are both already this
// app's own labels — 'Pro' is the tag LockedTease prints on every locked row,
// 'Log in' is what the nav trigger says — so nothing new is being coined here.
// A pack the viewer CAN see carries no marker at all: a badge on everything is
// a badge that says nothing.
const lockMark = (prefix, tier) => (canSeePack(prefix, tier) ? '' : tierOf(prefix) === 'paid' ? 'Pro' : 'Log in')

/* ── THE WALL ────────────────────────────────────────────────────────────────

   The same band the Palette and Prompt libraries put at the end of their free
   rows (`.lockt-cta`, global.css), rendered here rather than through
   components/library/LockedTease because that component hard-wires its button
   to openProModal — and half of this surface's walls ask for a free ACCOUNT,
   not a purchase. The class names are shared so the three libraries look like
   one product.

   References, and what each decided:

   The capped grid is real rows first, then one line and one button. Every icon
     inside the cap is real and fully working, so the signed-out grid holds 60
     usable icons rather than 60 teasers, and the band sits after them rather
     than over them. The only blur is on the extra rows IconEndBand draws past
     the cap (see IconEndTease): those are decoration, not results.

   A common pattern puts the plan word on the FILTER as well as on the card —
     a left-hand category list carries a "Business" badge next to the category
     itself. That is `lockMark` above: the pack menu and the group chips say which tier a set
     needs BEFORE it is chosen, so nothing is a dead end you discover by
     clicking.

   Some sites cap the signed-out grid, with a counter-example: the real grid
     sits behind a "Log in to see more" dialog raised the moment you scroll.
     This wall raises
     nothing on its own — the account dialog opens when the button is PRESSED,
     never on arrival or on scroll.

   There is no persistent plan banner. A signed-in free viewer sees markers on
     the controls, and the upgrade band only at the true end of their results
     (a search, a pack or a group), never as a standing strip or during an
     endless scroll. See endBandKind in utils/iconEndBand.js.

   NOT A FAILED LOAD, and not the refused state either. `.ig-notice` — "Couldn't
   reach the icon service" — is a plain row with a Try again button and means
   the network said no. This is an accent band with a padlock and a plan word
   and means the product said no. The two never render together: a gated scope
   never asks for anything, so there is nothing for the service to refuse. */
function IconGateWall({ heading, body, action, onAction, kind }) {
  return (
    <div className={`lockt-cta ig-gate ig-gate--${kind}`} data-gate={kind} role="status">
      <div className="lockt-cta-copy">
        <p className="lockt-cta-head">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ig-gate-lock">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {heading}
        </p>
        <p className="lockt-cta-body">{body}</p>
      </div>
      <button type="button" className="btn btn-accent lockt-cta-btn" onClick={onAction}>{action}</button>
    </div>
  )
}

/* ── THE END OF THE GRID ─────────────────────────────────────────────────────
   The closing band at the bottom of the results: one display sentence, one dim
   line, one filled pill and, where a second way on is true, a ghost pill. It is
   one surface with no card. The text and both controls are always on screen;
   nothing here depends on hover.

   `kind` is 'anon' or 'free' (see endBandKind). `to` makes the primary control
   a link to /plans; without it the primary control is a button that calls
   `onAction`. `tease` is a slot above the copy: the signed-out band fills it
   with IconEndTease, the free band leaves it empty. A blurred row for free
   viewers would be passed here, as long as it holds no markup of a pack that
   viewer may not load (see src/utils/lockedPreview.js). */
function IconEndBand({ kind, heading, body, action, onAction, to, secondary, tease }) {
  const arrow = (
    <span className="ig-end-pill-icon" aria-hidden="true"><PhGlyph d={PH_ARROW_UP_RIGHT} size={13} /></span>
  )
  return (
    <section className="ig-end" data-gate={kind} data-end={kind} aria-labelledby="ig-end-h">
      {tease}
      <div className="ig-end-copy">
        <h2 id="ig-end-h" className="ig-end-h">{heading}</h2>
        <p className="ig-end-p" role={kind === 'anon' ? 'status' : undefined}>{body}</p>
        <div className="ig-end-cta">
          {to
            ? <Link to={to} className="ig-end-pill" onClick={onAction}>{action}{arrow}</Link>
            : <button type="button" className="ig-end-pill" onClick={onAction}>{action}{arrow}</button>}
          {secondary && <Link to="/plans" className="ig-end-ghost">{secondary}</Link>}
        </div>
      </div>
    </section>
  )
}

/* Two rows of blurred icons that continue the grid past the cap. They use a
   grid of their own (the live grid's column count, passed in) rather than the
   `.ig` class, so anything that looks up the results grid still finds exactly
   one. The glyphs are
   path strings already compiled into the bundle and belong to packs a signed-out
   viewer may browse (see pickTeaseIcons), so this makes no request and holds
   nothing gated. The cells carry no name, no pack and no title, are not
   focusable, and are hidden from assistive tech: the band below says the same
   thing in words. A click or tap anywhere on them runs `onAction`. The hover
   chip is CSS-only and appears for a fine pointer; touch relies on the band. */
function IconEndTease({ cells, cols, cellH, chip, onAction }) {
  return (
    <div className="ig-end-tease" aria-hidden="true" onClick={onAction}
      style={{ '--ig-end-cols': cols, ...(cellH ? { '--ig-end-cell-h': `${cellH}px` } : null) }}>
      {cells.map((cell, i) => {
        const { row, edge } = teaseCellPlace(i, cols)
        return (
          <span key={cell.key} className="ig-end-cell" data-row={row} data-edge={edge || undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <path d={cell.d} />
            </svg>
            <span className="ig-end-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" focusable="false">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {chip}
            </span>
          </span>
        )
      })}
    </div>
  )
}

export default function IconLibrary({ onCopy, onCatalogue }) {
  const { isPro, plan, planKnown } = useSubscription()
  const { user, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const navigate = useNavigate()

  /* ── WHAT THIS VIEWER MAY ASK FOR ────────────────────────────────────────
     Derived once, here, and every fetch path below is scoped by it. The check
     sits BEFORE the request rather than on the rendered cell, which is the
     discipline src/utils/lockedPreview.js exists to enforce: a locked thing's
     payload never reaches the browser. Fetch-then-hide would leak the markup
     AND spend the rate limit the batched fetch exists to avoid.

     TWO RESOLUTIONS, AND ONLY ONE IS WORTH WAITING FOR.

     `authLoading` is local and fast — onAuthStateChanged answers from the
     persisted session — and until it does, "is there an account" is genuinely
     unknown, so the first browse waits for it (the init effect below). Guessing
     would paint a signed-in visitor the 60-icon sample and the "free account"
     wall for a beat, which is the product telling them something untrue.

     BILLING IS NOT WAITED FOR, deliberately. `isPro` arrives from a Firestore
     snapshot that can be slow, and on a hung connection it never arrives at
     all; blocking the grid on it would trade a working page for a correct one.
     It does not need to be waited for, because a loading `isPro` is FALSE, and
     false lands on 'free' — narrower than the truth, never wider. A Pro viewer
     browses ten packs for a moment and then twenty-five when the snapshot
     lands, and the widening costs nothing: COLLECTION_CACHE and GLYPH_ASKED
     dedupe every pack the first pass already fetched. */
  const tier = viewerTier({ user, isPro, resolving: authLoading })
  const allowedPacks = useMemo(() => visiblePacks(ALL_PACKS, tier), [tier])
  const canSee = useCallback((p) => canSeePack(p, tier), [tier])
  // The signed-out cap. 60 icons, spread evenly so all five outlined packs are
  // represented — see ANON_ICON_CAP for why it is not a flat slice.
  const capped = tier === 'anon'
  const perPackCap = capped ? anonPerPack(ALL_PACKS) : ALL_INITIAL_PER_PACK
  const capList = useCallback((list) => (capped ? list.slice(0, ANON_ICON_CAP) : list), [capped])

  /* ── "ALL PACKS" IS A CLAIM, AND FOR A GATED VIEWER IT IS FALSE ──────────
     MEASURED signed out at 1440 before this existed, the status line read
     "Showing 60 of 60 · All packs · 60 icons · 5 sets" — forty pixels above a
     wall saying the grid holds the first 60 icons of the outlined packs. Two
     sentences on one screen disagreeing about what the library is, and the one
     in the smaller type was the true one.

     The label is DROPPED rather than reworded. "Showing X of Y" immediately
     before it already carries both counts, so a viewer loses no information —
     and no new sentence is invented to describe a scope the product has never
     had a word for. Whoever really can browse every pack still gets the line
     they have always had, unchanged.

     Derived from the pack counts, not from the tier: move a pack in the table
     and this follows, with no second place to remember. */
  const seesEverything = allowedPacks.length === ALL_PACKS.length
  const scopeLine = useCallback((count, sets) => (
    seesEverything ? `All packs · ${count.toLocaleString()} icons · ${sets} sets` : `${sets} sets`
  ), [seesEverything])
  // Free-tier custom-icon allowance (Pro → Infinity). Single source: the plan.
  const customIconLimit = plan?.limits?.['custom-icons'] ?? Infinity
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])      // full result set (browse or search)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [mode, setMode] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  /* The catalogue is on screen but not all of it, and the notice says which:
     'partial' (some packs of a listing did not load), 'stale' (the saved copy of
     this pack stands in for a refresh that failed) or 'sample' (only the first
     names of this pack could be had). Quieter than `loadError`, which means
     nothing live or saved could be shown at all and the built-in set replaced it. */
  const [softNotice, setSoftNotice] = useState(null)
  /* Why an animated set cannot be shown, when the reason is the viewer's session
     or plan rather than the icon service: 'auth' (sign in again) or 'forbidden'
     (the plan does not include the set). Scoped to the animated pack on screen:
     it never touches `loadError` or `cdnOk`, so the other packs and the next
     search carry on as normal. Cleared wherever a new listing starts. */
  const [animatedNotice, setAnimatedNotice] = useState(null)
  const [activeCat] = useState('all')
  const [pack, setPack] = useState('')
  // The weight is read through a ref by the browse functions, so choosing one
  // can re-run the current scope in the same tick (see handleWeight).
  const [weight, setWeight] = useState('regular')
  const weightRef = useRef('regular')
  const [group, setGroup] = useState(null)   // active cross-pack collection, or null
  const [source, setSource] = useState('all')  // all | group | pack | custom | search
  /* The pack or group the viewer chose and may not have: `{ kind, label, need }`
     where `need` is 'free' (an account opens it) or 'paid' (Pro does). Set by
     the browse functions INSTEAD of fetching, never after one — so a gated
     scope costs zero requests and `loadError` stays false, which is what keeps
     "you cannot have this" and "the service refused" two distinguishable
     states. Null whenever the current scope is one the viewer may browse. */
  const [gated, setGated] = useState(null)
  // How many icons of the open pack are held back for Pro: { pack, n }. Drives the quiet notice under the pack menu.
  const [proHeld, setProHeld] = useState({ pack: '', n: 0 })
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
  const firstPageTimer = useRef(null)
  const [firstPageTimeout, setFirstPageTimeout] = useState(null)
  useEffect(() => {
    if (!firstPageTimeout) return
    firstPageTimer.current = setTimeout(firstPageTimeout, 2500)
    return () => clearTimeout(firstPageTimer.current)
  }, [firstPageTimeout])
  const cdnOk = useRef(null)
  const reqId = useRef(0)            // guards against out-of-order async responses
  const didInit = useRef(false)
  const sentinelRef = useRef(null)
  const retryRef = useRef(null)     // re-runs the last browse for the error banner
  const lastTier = useRef(null)     // the tier the current listing was fetched at

  const renderLocal = useCallback((q, packFilter) => {
    const localIcons = window.icons || []
    const PACKS = window.PACKS || {}
    const pm = { tabler: 'T', lucide: 'L', iconoir: 'I', heroicons: 'H', 'simple-icons': 'S' }
    // THE BUILT-IN SET IS TIERED TOO, and it has to be read through the CODE
    // rather than through `PACKS`: window.PACKS maps 'L' to the display name
    // 'Lucide', not to the Iconify prefix the tier table is keyed on. The five
    // codes invert to five prefixes, and `simple-icons` — the only brand pack
    // in the fallback — is the one this actually removes for a non-Pro viewer.
    //
    // No request is involved either way (these are path strings compiled into
    // the bundle), so this is not about the network. It is about the fallback
    // showing the same library the catalogue would have: a viewer who cannot
    // browse Simple Icons online must not find it here when the service blinks.
    const prefixOf = { T: 'tabler', L: 'lucide', I: 'iconoir', H: 'heroicons', S: 'simple-icons' }
    const pc = pm[packFilter] || ''
    q = (q || '').toLowerCase()
    const filtered = capList(localIcons.filter(i =>
      (activeCat === 'all' || i.c === activeCat) &&
      (!packFilter || i.p === pc) &&
      canSee(prefixOf[i.p] || i.p) &&
      (!q || i.n.indexOf(q) !== -1 || i.c.indexOf(q) !== -1)
    ))
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
    // SERVICE refused (a 429 rate limit was measured), and the
    // browser is online the whole time. The notice above the grid says what
    // happened; this line says what is being shown.
    setMode(cdnOk.current === false ? 'Built-in icons' : 'Embedded')
    setLoading(false)
  }, [activeCat, canSee, capList])

  /* ── WHEN THE CATALOGUE ANSWERS AND THE GLYPHS DO NOT ────────────────────

     The outage work built a real refused-state — "Couldn't reach
     the icon service — showing built-in icons", a Try again button, and the
     built-in set underneath — and keyed it on the CATALOGUE requests failing.

     The library was also failing a way that state cannot see: all 24 /collection requests returned
     200 while every individual glyph .svg came back 429 from Cloudflare
     (error 1015, rate limited by IP). The API answers a rate-limited glyph
     with text/plain, the browser had asked for an image, so ORB blocks it and
     the <img> just fails. Result: the app believed the service was healthy,
     the masthead pill read "Live library connected", and the grid showed 120
     blank cells with nothing said about it.

     A glyph <img> failing tells us nothing on its own — a single icon can be
     missing from a pack. A BATCH of them failing is the service refusing, so
     the count is what carries the meaning. Past the threshold this flips the
     SAME loadError the catalogue path sets, so the notice, the built-in grid
     and the masthead pill all come from one flag and cannot disagree. */
  const glyphFails = useRef(0)
  const noteGlyphFailure = useCallback(() => {
    // Already in the fallback, or the catalogue itself already failed.
    if (cdnOk.current === false) return
    glyphFails.current += 1
    // Eight is past coincidence and well inside one screen of a 120-cell grid,
    // so the swap happens while the user is still looking at the first page.
    if (glyphFails.current < 8) return
    cdnOk.current = false
    setLoadError(true)
    renderLocal('', '')
  }, [renderLocal])

  // Load EVERY pack by default, progressively. Fire all /collection requests in
  // parallel but append per-pack as each resolves (never Promise.all-block), and
  // keep pack order as lists arrive. Hold the skeleton until a page is ready
  // or all packs settle, with a timeout for slow packs.
  const browseAll = useCallback((manualRetry = false) => {
    const rid = ++reqId.current
    retryRef.current = () => browseAll(true)
    setSource('all'); setGroup(null); setPack(''); setGated(null)
    setLoadError(false); setSoftNotice(null); setAnimatedNotice(null)
    setVisible(PAGE_SIZE); setMode('')
    // ALLOWED, NOT ALL. This is the line that decides how many packs a visit
    // lists: a signed-out visit lists five instead of twenty-five, and never
    // names a gated pack in a URL.
    const lists = allowedPacks.map(() => [])

    // Warm-cache fast path: if every pack is already cached (e.g. returning to
    // "All packs" after browsing a single pack), paint synchronously with no
    // network and no skeleton flash.
    if (allowedPacks.every(p => COLLECTION_CACHE.has(p))) {
      cdnOk.current = true
      allowedPacks.forEach((p, idx) => {
        const names = keepWeight(p, COLLECTION_CACHE.get(p).names, weightRef.current, null, tier).slice(0, perPackCap)
        lists[idx] = names.map(n => ({ id: `${p}:${n}`, pack: p, name: n, cdn: true }))
      })
      const merged = capList(lists.flat())
      setIcons(merged)
      setMode(scopeLine(merged.length, allowedPacks.length))
      setLoading(false)
      return
    }

    setLoading(true)
    setIcons([])
    let settled = 0
    let okCount = 0
    let holding = true
    const pageSize = Math.min(PAGE_SIZE, perPackCap * allowedPacks.length)
    const reveal = (timedOut = false) => {
      if (rid !== reqId.current) return
      const count = lists.reduce((sum, list) => sum + list.length, 0)
      if (firstPageReady(count, settled, allowedPacks.length, pageSize, timedOut)) {
        clearTimeout(firstPageTimer.current)
        holding = false
        setIcons(capList(lists.flat()))
        setLoading(false)
      }
    }
    setFirstPageTimeout(() => () => reveal(true))
    let degraded = 0
    allowedPacks.forEach((p, idx) => {
      defaultPackNames(p, weightRef.current, manualRetry)
        .then(({ names: raw, degraded: wasDegraded }) => {
          if (rid !== reqId.current) return
          cdnOk.current = true
          okCount++
          if (wasDegraded) degraded++
          const names = keepWeight(p, raw, weightRef.current, null, tier).slice(0, perPackCap)
          lists[idx] = names.map(n => ({ id: `${p}:${n}`, pack: p, name: n, cdn: true }))
          // Default sort = pack-by-pack: lists stays in allowedPacks order and
          // each pack's icons are contiguous, so flat() groups every pack
          // together (Lucide block, then Tabler, …) regardless of which request
          // resolves first — no round-robin interleave.
          //
          // AND THAT IS WHY THE SIGNED-OUT CAP IS PER PACK, not a slice of the
          // merged list: at 250 a pack a flat slice(0, 60) is sixty consecutive
          // Lucide icons and the sample shows one set of the five it is meant
          // to introduce. `perPackCap` is 12 for a signed-out viewer, so all
          // five land inside the cap.
          const merged = capList(lists.flat())
          // Keep the reserved skeleton intact until reveal exposes the first page.
          if (!holding) setIcons(merged)
          const sets = lists.filter(l => l.length).length
          setMode(scopeLine(merged.length, sets))
        })
        .catch(() => { degraded++ /* this pack failed — others may still resolve */ })
        .finally(() => {
          if (rid !== reqId.current) return
          settled++
          reveal()
          if (settled === allowedPacks.length) {
            // Nothing at all to show is the only case that swaps in the built-in set.
            if (okCount === 0) { cdnOk.current = false; setLoadError(true); renderLocal('', '') }
            else if (degraded > 0) setSoftNotice('partial')
          }
        })
    })
  }, [renderLocal, allowedPacks, perPackCap, capList, scopeLine, tier])

  /* ── REFUSING A SCOPE COSTS NOTHING ──────────────────────────────────────
     The whole point of the gate: the browse functions call this INSTEAD of
     fetching, so a locked pack is never named in a URL and the rate limit is
     never touched on its behalf.

     `reqId` is bumped first. A browse that was already in flight when the
     visitor picked a locked pack would otherwise resolve a moment later and
     paint its icons straight over the wall — the stale-response hazard this
     file already guards everywhere else, reached by a new route.

     `retryRef` is cleared for the same reason the notice is suppressed below:
     there is nothing to retry. Leaving the previous browse's retry armed would
     hand the "Try again" button a function that fetches a pack the viewer
     cannot have.

     `need` is the tier that would OPEN it — 'free' when an account is enough,
     'paid' when it is Pro — not the tier the viewer is in. */
  const refuseScope = useCallback((label, need) => {
    reqId.current++
    retryRef.current = null
    setGated({ label, need })
    setIcons([]); setVisible(PAGE_SIZE); setMode('')
    setLoading(false); setLoadError(false); setSoftNotice(null); setAnimatedNotice(null)
  }, [])

  /* A FAILED ANIMATED LISTING, WHEN THE CAUSE IS THE SESSION OR THE PLAN. The
     grid stays empty and the notice says which, without touching `loadError`
     or `cdnOk`: the icon service is fine, and the next search in any other pack
     must still go to it. Returns false for any other cause so the caller can
     show its usual unreachable state. A stale answer (the viewer left Pro while
     it was in flight) is dropped without a notice; the tier change is already
     re-running the browse. */
  const failAnimatedScope = useCallback((error) => {
    const kind = classifyAnimatedFailure(error)
    if (!isPackScopedFailure(kind)) return false
    setIcons([]); setVisible(PAGE_SIZE); setMode('')
    setLoading(false)
    if (kind !== 'stale') setAnimatedNotice(kind)
    return true
  }, [])

  // The narrowest tier that would open at least one of these packs. A group
  // whose every pack is Pro asks for Pro; one that mixes asks for the cheaper
  // of the two, because that is the true answer to "what do I need for this?"
  const needFor = useCallback((packs) => (
    packs.some(p => !canSee(p) && tierOf(p) === 'free') ? 'free' : 'paid'
  ), [canSee])

  // Logo.dev pack — a curated grid of popular brands. No network: the logos are
  // <img> URLs resolved lazily by the browser as cells scroll into view.
  const browseLogos = useCallback(() => {
    reqId.current++            // cancel any in-flight browse
    retryRef.current = browseLogos
    setSource('pack'); setGroup(null); setPack('logodev'); setGated(null)
    setLoadError(false); setSoftNotice(null); setAnimatedNotice(null)
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
    setSource('pack'); setGroup(null); setPack('logodev'); setGated(null)
    setLoadError(false); setSoftNotice(null); setAnimatedNotice(null)
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
  const browsePack = useCallback((packFilter, groupKey = null, manualRetry = false) => {
    groupKey = ICON_GROUPS[groupKey] ? groupKey : null
    setSource('pack'); setGroup(groupKey || null)
    // "All packs" first: the empty string is not a pack and must never be put
    // to the tier table, which would read it as an unknown prefix and refuse it.
    if (!packFilter) { browseAll(manualRetry); return }
    // BEFORE the logodev branch and before any fetch. Logo.dev makes no Iconify
    // request, but it does resolve 48 <img> from img.logo.dev — a payload for a
    // paid pack, on a commercial API keyed to our token. Same gate, same place.
    if (!canSee(packFilter)) { refuseScope(packLabel(packFilter), tierOf(packFilter) === 'free' ? 'free' : 'paid'); return }
    setGated(null)
    if (packFilter === 'logodev') { browseLogos(); return }
    const rid = ++reqId.current
    retryRef.current = () => browsePack(packFilter, groupKey, true)
    setLoading(true); setLoadError(false); setSoftNotice(null); setAnimatedNotice(null); glyphFails.current = 0
    // The pack's head may stand in for a failed request only when it holds what is
    // being asked for: it is Regular-weight names, so not for another weight.
    const allowSample = weightRef.current === 'regular' || !!groupKey
    getCollectionNames(packFilter, { ...retryOptions(manualRetry), allowSample })
      .then(({ names: raw, title, sample }) => {
        if (rid !== reqId.current) return
        cdnOk.current = true
        // A saved or partial list is still shown when its refresh failed; the notice and Try again stay up.
        if (getCollectionNames.failed(packFilter)) setSoftNotice(sample ? 'sample' : 'stale')
        setProHeld({ pack: packFilter, n: tier === 'paid' ? 0 : proOnlyIconCount(packFilter, raw) })
        const names = capList(keepWeight(packFilter, raw, weightRef.current, groupKey, tier))
        // A weight this pack does not draw is an empty answer, not a failure:
        // the built-in fallback would show Regular glyphs under a Bold label.
        if (!names.length && weightRef.current !== 'regular' && !groupKey) {
          setIcons([]); setVisible(PAGE_SIZE); setLoading(false)
          setMode(`${title} · no ${weightRef.current} weight`)
          return
        }
        if (!names.length) { renderLocal('', packFilter); return }
        setIcons(names.map(n => ({ id: `${packFilter}:${n}`, pack: packFilter, name: n, cdn: true })))
        setVisible(PAGE_SIZE)
        setMode(`${title}${groupKey ? ` · ${ICON_GROUPS[groupKey].label}` : ''} · ${sample ? 'first ' : ''}${names.length.toLocaleString()} icons`)
        setLoading(false)
      })
      .catch((error) => {
        if (rid !== reqId.current) return
        if (isAnimatedPack(packFilter) && failAnimatedScope(error)) return
        // An animated set failing for any other reason is still a failure of
        // this scope alone: it must not switch the other packs to the fallback.
        if (!isAnimatedPack(packFilter)) cdnOk.current = false
        setLoadError(true)
        renderLocal('', packFilter)
      })
  }, [renderLocal, browseAll, browseLogos, canSee, capList, refuseScope, failAnimatedScope, tier])

  // Browse a whole collection (chip): fetch every pack in the group and
  // round-robin interleave them so the grid mixes packs.
  const browseGroup = useCallback((groupKey, manualRetry = false) => {
    const g = ICON_GROUPS[groupKey]
    if (!g) { browseAll(); return }
    // A GROUP IS GATED PACK BY PACK, NOT AS A BLOCK. "Brand logos" is four packs
    // and a free viewer may have none of them, so the chip is a wall; a mixed
    // group would fetch only the members the viewer is entitled to and say so
    // in its own "· N packs" count. There is no mixed group today — the tier
    // line happens to fall on group boundaries — but the arithmetic is written
    // for the table rather than for today's contents, so moving one pack in
    // iconPackTiers.js cannot silently produce a group that fetches what it
    // must not.
    const packs = g.packs.filter(canSee)
    if (!packs.length) { setSource('group'); setGroup(groupKey); setPack(''); refuseScope(g.label, needFor(g.packs)); return }
    const rid = ++reqId.current
    retryRef.current = () => browseGroup(groupKey, true)
    setSource('group'); setGroup(groupKey); setPack(''); setGated(null)
    setLoading(true); setLoadError(false); setSoftNotice(null); setAnimatedNotice(null); glyphFails.current = 0
    Promise.all(packs.map(p =>
      getCollectionNames(p, retryOptions(manualRetry))
        .then(({ names }) => ({ names: keepWeight(p, names, 'regular', null, tier).sort().slice(0, PER_PACK_CAP), pack: p, ok: !getCollectionNames.failed(p) }))
        .catch(() => ({ names: [], pack: p, ok: false }))
    ))
      .then(results => {
        if (rid !== reqId.current) return
        // The built-in set replaces the grid only when no pack gave anything to show.
        if (!results.some(r => r.ok || r.names.length)) { cdnOk.current = false; setLoadError(true); renderLocal('', ''); return }
        cdnOk.current = true
        if (results.some(r => !r.ok)) setSoftNotice('partial')
        const lists = results.map(r => r.names.map(n => ({ id: `${r.pack}:${n}`, pack: r.pack, name: n, cdn: true })))
        // Share the anonymous allowance per pack; a final slice could hide later packs.
        const groupCap = capped ? Math.floor(ANON_ICON_CAP / packs.length) : PER_PACK_CAP
        const merged = concatenatePackLists(lists, groupCap)
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
  }, [renderLocal, canSee, capped, needFor, refuseScope, browseAll, tier])

  // Custom Icons category. Free accounts get a real allowance (see
  // customIconLimit), so the store is read for everyone; Pro just lifts the cap.
  //
  // NEVER GATED BY PACK TIER, at any tier, and that is deliberate rather than
  // an omission: these are the visitor's OWN icons. They carry their own inline
  // markup (`icon.svg`), so nothing here is fetched and nothing here belongs to
  // a pack we sell. `setGated(null)` is the line that guarantees it — reaching
  // My Icons always clears a wall rather than inheriting one.
  const browseCustom = useCallback(() => {
    retryRef.current = browseCustom
    reqId.current++            // cancel any in-flight browse
    setSource('custom'); setGroup(null); setPack(''); setGated(null)
    setQuery(''); setLoadError(false); setSoftNotice(null); setAnimatedNotice(null)
    const list = readCustomIcons()
    setIcons(list.map(c => ({ ...c, custom: true, id: c.key })))
    setVisible(PAGE_SIZE)
    setMode(`Custom Icons · ${list.length.toLocaleString()} saved`)
    setLoading(false)
  }, [])

  const doSearch = useCallback((q, scope = {}) => {
    q = (q || '').trim()
    const { pack: packFilter = '', group: requestedGroup = null } = scope
    const groupKey = ICON_GROUPS[requestedGroup] ? requestedGroup : null
    // THE SEARCH BOX WAS THE HOLE. Left unscoped, /search answers from the whole
    // Iconify registry — type "apple" signed out and the old code would have
    // handed back simple-icons:apple, logos:apple and twemoji:apple, three packs
    // this viewer may not browse, fetched and painted. So the scope is decided
    // HERE, before the request, and again on the way back.
    if (packFilter && !canSee(packFilter)) { setSource('search'); refuseScope(packLabel(packFilter), tierOf(packFilter) === 'free' ? 'free' : 'paid'); return }
    if (groupKey && !ICON_GROUPS[groupKey].packs.some(canSee)) { setSource('search'); refuseScope(ICON_GROUPS[groupKey].label, needFor(ICON_GROUPS[groupKey].packs)); return }
    setGated(null)
    // Brand logos resolve locally (curated list + name/domain lookup) — never
    // hit the Iconify /search endpoint for the Logo.dev pack.
    if (packFilter === 'logodev') { searchLogos(q); return }
    if (!q || q.length < 2) {
      if (packFilter) browsePack(packFilter, groupKey)
      else if (groupKey) browseGroup(groupKey)
      else browseAll()
      return
    }
    // An animated set is searched in the names the server listed for it, never by
    // asking the Iconify /search endpoint, which would put its prefix in a browser request.
    if (isAnimatedPack(packFilter)) {
      const rid = ++reqId.current
      retryRef.current = () => doSearch(q, scope)
      setSource('search')
      setLoading(true); setLoadError(false); setSoftNotice(null); setAnimatedNotice(null); glyphFails.current = 0
      // The names are hyphenated, so "arrow up" has to match arrow-up.
      const needle = q.toLowerCase().replace(/\s+/g, '-')
      getCollectionNames(packFilter)
        .then(({ names, title }) => {
          if (rid !== reqId.current) return
          cdnOk.current = true
          const items = capList(names
            .filter(n => n.includes(needle) && matchesWeight(packFilter, n, weightRef.current))
            .map(n => ({ id: `${packFilter}:${n}`, pack: packFilter, name: n, cdn: true })))
          if (!items.length) { renderLocal(q, packFilter); return }
          setIcons(items)
          setVisible(PAGE_SIZE)
          setMode(`${items.length.toLocaleString()} matches · ${title}`)
          setLoading(false)
        })
        .catch((error) => {
          if (rid !== reqId.current) return
          if (failAnimatedScope(error)) return
          // Not the session or plan: the same unreachable state as before, but an
          // animated set failing must not switch every other pack to the fallback.
          setLoadError(true)
          renderLocal(q, packFilter)
        })
      return
    }
    if (cdnOk.current === false) {
      renderLocal(q, packFilter)
      return
    }
    const rid = ++reqId.current
    retryRef.current = () => doSearch(q, scope)
    setSource('search')
    setLoading(true); setLoadError(false); setSoftNotice(null); setAnimatedNotice(null); glyphFails.current = 0
    // Pack and chip compose: a set pack narrows the endpoint, the chip narrows
    // the collection of results; chip alone fans out to the
    // whole collection's packs.
    const params = new URLSearchParams()
    if (packFilter) params.set('prefix', packFilter)
    else if (groupKey) params.set('prefixes', ICON_GROUPS[groupKey].packs.filter(canSee).join(','))
    // NO `prefixes` FOR PRO, and that is not an oversight. An unscoped search
    // reaches every set Iconify carries, not only our twenty-five, and a Pro
    // visitor has always had that — narrowing it here to "our list" would be
    // taking a capability away in the name of a gate that does not apply to
    // them. Every narrower tier is scoped to exactly what it may browse.
    else if (tier !== 'paid') params.set('prefixes', allowedPacks.join(','))
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
        // THE SECOND CHECK, on the way back. `prefixes` above is a request the
        // API is asked to honour; this is the one we enforce. A proxy that drops
        // the parameter, a future API that widens it, a cached answer from a
        // wider scope — none of them can put a gated pack into the grid, because
        // the filter is applied to what ARRIVED rather than to what was asked
        // for. Same reasoning as the SANITISE_KEYS whitelist in lockedPreview.js:
        // the gate is the filter, the request is only a convenience.
        const matches = d.icons
          .map(id => { const [p, n] = id.split(':'); return { id, pack: p, name: n, cdn: true } })
          .filter(ic => canSee(ic.pack))
          // A pack's Pro-only icons (Carbon's logo-*) are left out for everyone below Pro.
          .filter(ic => canSeeIcon(ic.pack, ic.name, tier))
          // An unscoped Pro search can name an animated set. Its glyphs only load
          // through the server's Pro check, so a direct hit is left out of this list.
          .filter(ic => !isAnimatedPack(ic.pack))
          .filter(ic => matchesWeight(ic.pack, ic.name, groupKey ? 'regular' : weightRef.current))
        const items = groupKey
          ? orderIconsByPack(capList(matches), ICON_GROUPS[groupKey].packs)
          : capList(matches)
        if (!items.length) { renderLocal(q, packFilter); return }
        setIcons(items)
        setVisible(PAGE_SIZE)
        const scopeLabel = [packFilter, groupKey ? ICON_GROUPS[groupKey].label : ''].filter(Boolean).join(' · ')
          || (seesEverything ? 'All packs' : `${allowedPacks.length} sets`)
        setMode(`${items.length.toLocaleString()} matches${d.total > items.length ? '+' : ''} · ${scopeLabel}`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal(q, packFilter)
      })
  }, [renderLocal, browsePack, browseGroup, browseAll, searchLogos, canSee, capList, needFor, refuseScope, failAnimatedScope, tier, allowedPacks, seesEverything])

  // Consume the homepage draft on commit — see the `selected` initialiser above.
  useEffect(() => { consumeIconDraft() }, [])

  // Tell the masthead whether the grid under it is the CATALOGUE or the
  // built-in fallback. IconEmojiLibrary's status pill used to read
  // navigator.onLine alone, so with every Iconify host refusing (429/403)
  // it said "Live library connected" in green directly
  // above the notice saying the icon service could not be reached. `loadError`
  // is the same flag that renders that notice, so the pill and the notice can
  // never disagree again. Reported through a callback rather than lifted,
  // because the fetch lifecycle (reqId, cdnOk, the retry ref) lives here.
  useEffect(() => { onCatalogue?.(loadError ? 'fallback' : 'live') }, [loadError, onCatalogue])

  // The animated-icon cache drops any answer that lands while the viewer is not
  // on Pro, so it has to hear the tier before the browse effects below ask for
  // anything. Effects run in the order written: this one stays above them.
  useEffect(() => { setAnimatedTier(tier) }, [tier])

  // Initial load: every pack this viewer may browse, so the grid shows the
  // breadth they actually have on first paint.
  //
  // `authLoading` is the one thing held for — see the note at the top of this
  // component. The skeleton the grid already draws covers the wait, which is a
  // local read of the persisted session rather than a round trip.
  useEffect(() => {
    if (didInit.current || authLoading) return
    didInit.current = true
    lastTier.current = tier
    // Call browseAll directly — not via setTimeout. A deferred timer gets
    // cancelled by this effect's StrictMode cleanup before it can fire, and the
    // didInit guard then blocks the remount from rescheduling, so the initial
    // browse never runs (grid stuck on skeletons). browseAll dedupes via reqId.
    browseAll()
  }, [browseAll, authLoading, tier])

  /* ── WHEN ENTITLEMENT CHANGES UNDER A LIVE PAGE ──────────────────────────
     Signing in, signing out and the billing snapshot landing all move the tier
     without a navigation, and the grid must follow — otherwise a visitor who
     signs in from the wall's own button watches the wall stay put, which reads
     as the button not working.

     It re-runs the CURRENT scope rather than resetting to "All packs": the
     whole point of signing in at the Simple Icons wall is to see Simple Icons,
     and `pack` still holds it. Same shape as handleClearSearch, for the same
     reason — these four lines are the one place that knows how to restore a
     listing from the filter state.

     A narrowing tier (sign-out, a lapsed subscription) goes through exactly the
     same path, and lands on the wall instead of the grid because the browse
     functions ask the table again. Nothing needs to know which direction it
     moved. */
  useEffect(() => {
    if (!didInit.current || lastTier.current === tier) return
    lastTier.current = tier
    // Leaving Pro (sign-out, a lapsed plan) drops the animated sets' listing and glyphs.
    if (tier !== 'paid') forgetAnimatedSets()
    // An icon opened under the old tier closes if the new one cannot see it.
    if (selected?.cdn && !canSeeIcon(selected.pack, selected.name, tier)) setSelected(null)
    if (source === 'custom') browseCustom()
    else if (query.trim().length >= 2) doSearch(query, { pack, group })
    else if (pack) browsePack(pack, group)
    else if (group) browseGroup(group)
    else browseAll()
    // The scope is READ here, not depended on: this effect fires on a tier
    // change and on nothing else. Adding pack/group/query to the array would
    // re-browse on every keystroke, which is what the debounce exists to stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier])

  // Infinite scroll — reveal another page as the sentinel comes into view. The
  // `visible` dep makes the observer reconnect after each reveal so it keeps
  // draining while the sentinel stays inside the rootMargin (fixes the stall).
  //
  // A page is revealed REVEAL_CHUNK cells per frame, not all 120 in one commit:
  // mounting a whole page at once was one 65-95 ms task on a phone. The chain of
  // frames lives in a ref because each chunk changes `visible`, which re-runs the
  // effect below; its cleanup must not cancel the chain it is part of.
  //
  // `icons` itself is a dependency, not just its length: a replaced listing of
  // the same length ends the chain (the effect after this one) and must also
  // start a fresh observer. An observer only reports when the sentinel's
  // visibility changes, but a new one always reports once on observe(), so the
  // reveal restarts from the current `visible` instead of waiting for a scroll.
  const revealRef = useRef(0)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || revealRef.current) return
      const target = Math.min(visible + PAGE_SIZE, icons.length)
      if (target <= visible) return
      let upTo = visible
      const step = () => {
        revealRef.current = 0
        upTo = Math.min(upTo + REVEAL_CHUNK, target)
        setVisible(upTo)
        if (upTo < target) revealRef.current = requestAnimationFrame(step)
      }
      step()
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [icons, visible])
  // A new listing (or leaving the page) ends any page still being revealed.
  useEffect(() => () => { cancelAnimationFrame(revealRef.current); revealRef.current = 0 }, [icons])

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
  const handlePackChange = (p) => {
    clearTimeout(timer.current)
    if (p === 'custom') { setQuery(''); browseCustom(); return }
    const nextPack = p === 'all' ? '' : p
    setPack(nextPack)
    // A pack that does not draw the chosen weight puts it back to Regular, so
    // the grid shows the pack rather than an empty answer to a question the
    // visitor asked of a different pack.
    if (weightRef.current !== 'regular' && nextPack && !weightPacks(weightRef.current).includes(nextPack)) {
      weightRef.current = 'regular'
      setWeight('regular')
    }
    if (query.trim().length >= 2) doSearch(query, { pack: nextPack, group })
    else if (nextPack) browsePack(nextPack, group, 'chip')
    else if (group) browseGroup(group, 'chip')
    else browseAll('chip')
  }

  // Which weights the current scope can honour, and why not when it cannot.
  // "All packs" can show a weight when any pack the viewer may browse draws
  // it; a pack or group only when a pack within that scope does.
  const weightState = (w) => {
    const collection = ICON_GROUPS[group]
    const scope = collection
      ? collection.packs.filter((p) => allowedPacks.includes(p) && (!pack || p === pack))
      : pack && pack !== 'custom' ? [pack] : allowedPacks
    if (collection && !scope.some((p) => Object.values(WEIGHT_RULES).some((rules) => p in rules))) {
      return { ok: false, why: 'These icons come in one style' }
    }
    if (w === 'regular') return { ok: true }
    const drawn = weightPacks(w)
    const ok = scope.some((p) => drawn.includes(p))
    const who = drawn.map((p) => WEIGHT_PACK_NAMES[p]).join(', ')
    return { ok, why: ok ? (pack ? '' : `Drawn by ${who}`) : `${ICON_WEIGHTS.find((x) => x.id === w).label} is drawn by ${who} only` }
  }
  const handleWeight = (w) => {
    if (w === weight || !weightState(w).ok) return
    clearTimeout(timer.current)
    weightRef.current = w
    setWeight(w)
    setGroup(null)
    const q = query.trim()
    if (q.length >= 2) doSearch(query, { pack, group: null })
    else if (pack && pack !== 'custom') browsePack(pack, null)
    else browseAll()
  }

  // Toggle a cross-pack collection chip. Keeps the active search text AND the
  // selected pack — the chip narrows style within whatever scope is set.
  const handleGroupToggle = (key) => {
    clearTimeout(timer.current)
    const q = query.trim()
    const nextGroup = group === key || !ICON_GROUPS[key] ? null : key
    setGroup(nextGroup)
    // Collections browse original artwork without replacing the stored weight.
    if (q.length >= 2) doSearch(query, { pack, group: nextGroup })
    else if (pack) browsePack(pack, nextGroup, 'chip')
    else if (nextGroup) browseGroup(nextGroup, 'chip')
    else browseAll('chip')
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

  /* ── MY ICONS IS NOT GATED. THE RECENT RAIL IS A DIFFERENT THING. ────────
     The SAVED half of My Icons carries each icon's own markup in the record
     (`icon.svg`) — it is the visitor's work, it asks the network for nothing,
     and no tier is consulted for it anywhere in this file. That is the rule the
     brief sets and it is kept literally.

     `recents` is not that. It is a list of REFERENCES — pack plus name — held
     in localStorage, which outlives a sign-out and a lapsed subscription. A
     reference to a pack the viewer can no longer browse cannot be drawn: the
     batch loader (correctly) refuses to fetch it, so the cell would sit on its
     `ig-glyph-wait` placeholder for ever. A permanent skeleton is the single
     worst outcome available here — it is the "cell that failed to load" this
     file has twice been fixed for — so the reference is dropped instead.
     Nothing of the visitor's is destroyed: recentIcons.js still holds it, and
     it reappears the moment the tier does. */
  const visibleRecents = useMemo(
    () => recents.filter(r => !r.cdn || canSeeIcon(r.pack, r.name, tier)),
    [recents, tier],
  )

  /* The group tray, marked the same way the pack menu is. A chip whose every
     pack is locked says which tier opens it; a chip the viewer can browse says
     nothing, because a badge on everything is a badge that says nothing.
     "My Icons" never carries one — it is not a catalogue group and it is not
     gated.

     MEMOISED ON THE TIER, which is what the module-level GROUP_OPTIONS existed
     to guarantee: LibraryFilterGroup measures its sliding indicator off the
     active button and re-runs that measurement whenever the options array
     changes identity. Per-tier is a handful of times in a session. Per-render
     would be every keystroke, and the indicator would never settle. */
  /* THE GROUP TRAY USED TO CARRY NO TIER MARKER, AND THAT WAS
     MEASURED RATHER THAN PREFERRED — it was the one place this gate could not
     be shown without charging the gated viewer for it. (The history below is
     kept because it is WHY the marker that replaced it takes no width.)

     Other libraries badge the CATEGORY as well as the card, which is the right instinct, and
     its categories are a vertical list with room to spare. This tray is a
     horizontal row inside a 68px toolbar. MEASURED at 1280, signed out:
       · " · Log in" / " · Pro" appended to five of the seven labels added 186px
         to a 474px row and wrapped the toolbar to two lines (118px).
       · Moved into `count`, LibraryFilterGroup's 10px trailing pill, it still
         added ~150px: same wrap at 1280, and at 1180 the tray collapsed to a
         trigger where a Pro viewer keeps chips.
       · A leading `icon` character costs ~17px a chip, which is 85px, which is
         more slack than 1180 has.
     A gate that reshapes the page for the people it gates is a gate that
     punishes them for being gated, so the marker went where it is free: the
     pack menu, which offers every pack individually, spells the tier out in
     its group labels and has a 220px trigger cap.

     Nothing is a dead end without it. Choosing a locked chip costs no request
     and answers immediately with a wall that names the group and the tier — the
     Zapier pattern quoted in components/library/LockedTease.jsx, where the
     locked thing is simply a different card. A marker on the chip itself is
     worth revisiting when the toolbar is redesigned and the row has slack.

     MEMOISED ON THE TIER, which is what the module-level GROUP_OPTIONS existed
     to guarantee: LibraryFilterGroup measures its sliding indicator off the
     active button and re-runs that measurement whenever the options array
     changes identity. Per tier is a handful of times in a session; per render
     would be every keystroke, and the indicator would never settle. */
  /* THE ROW HAS SLACK NOW, AND THE MARKER IS BACK. The Spectrum
     toolbar gives the filters a full-width row of their own, and the marker
     is a padlock badge positioned on the chip's corner rather than a word laid
     out inside it (see `lock` in LibraryFilterGroup), so it costs the tray no
     width at all: the tray a gated viewer gets is the same width, and
     collapses at the same breakpoints, as the one a Pro viewer gets. The
     rule is the pack menu's: a group is marked only when EVERY pack in it is
     out of reach, and the word is the cheapest tier that opens one of them —
     the same answer `needFor` gives the wall. */
  const groupOptions = useMemo(() => [
    { id: 'custom', label: 'My Icons' },
    ...GROUP_ORDER.map((key) => {
      const { label, packs } = ICON_GROUPS[key]
      const locked = packs.every((p) => !canSeePack(p, tier))
      if (!locked) return { id: key, label }
      return { id: key, label, lock: packs.some((p) => tierOf(p) === 'free') ? 'Log in' : 'Pro' }
    }),
  ], [tier])

  // Batch in the markup for whatever the grid is about to draw. Demand-driven:
  // the effect re-runs when `shown` grows (the sentinel raises `visible`) or the
  // browse changes, and `GLYPH_ASKED` means a pack is only ever asked for the
  // names it has not already been asked for. `glyphTick` exists to re-render
  // once a tranche lands — the caches are plain module Maps, so nothing else
  // would tell React the cells can paint.
  const [glyphTick, setGlyphTick] = useState(0)
  // Bumped once a failed pack's cool-down is over, so the effect below runs again
  // without waiting for a scroll. See GLYPH_RETRY_MAX.
  const [retryTick, setRetryTick] = useState(0)
  // MOUNTED, NOT PER-RUN. An `alive` flag cleared by this effect's own cleanup
  // looks like the right way to drop a stale response, and here it silently ate
  // every glyph on the page. `browseAll` appends a pack at a time, so `icons`
  // changes ~25 times during one load; each change re-ran this effect and its
  // cleanup cancelled the tick for the request still in flight. The bodies
  // landed in the cache, the names stayed marked as asked so nothing re-fetched
  // them, and no re-render was ever triggered — MEASURED at 127.0.0.1:5199 on
  // the first build of this change: 120 cells, 120 placeholders, 0 images, two
  // lucide batches both HTTP 200. A resolved tranche is never stale — the cache
  // is module-level and the markup is as good on run 25 as on run 1 — so the
  // only thing worth guarding is the component actually still being mounted.
  //
  // SET IT ON THE WAY IN, NOT JUST ON THE WAY OUT. `useRef(true)` plus a
  // cleanup that clears it is the shape everyone writes, and under StrictMode
  // it is wrong in exactly the way that is hardest to see: React mounts, runs
  // the cleanup against the simulated unmount, then mounts again — so the ref
  // is false for the whole real lifetime of the component and nothing ever sets
  // it back. MEASURED here: 120 lucide bodies in the cache, all 120 visible
  // cells wanting one of them, and not a single <img>, because every
  // `setGlyphTick` was skipped by a guard that thought the page had gone.
  const mountedRef = useRef(true)
  const retryTimerRef = useRef(0)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; clearTimeout(retryTimerRef.current) }
  }, [])
  // `icons` and `visible`, NOT `shown`. `shown` is a fresh array on every render,
  // so depending on it re-runs this body for every unrelated state change in the
  // page — the customizer opening, a slider moving, a toast. It would be
  // harmless (the asked-set short-circuits it) but it would walk 120 icons each
  // time to decide it had nothing to do.
  useEffect(() => {
    // The refused state already owns the screen and is showing built-in icons;
    // asking again here would be the retry button's job, not a render's.
    if (cdnOk.current === false) return
    // COLLAPSE THE PROGRESSIVE LOAD INTO ONE PASS. `browseAll` sets `icons` once
    // per pack as each /collection resolves, so without this the first seconds
    // of a load would batch the 120 lucide icons that briefly fill the grid,
    // then batch again for the mixed set that replaces them — measured as 2
    // wasted requests for names nobody was looking at any more. One frame's
    // worth of settling is under the network round trip that follows it.
    const t = setTimeout(() => {
      const wanted = new Map()
      // The Recent rail is drawn from a separate list that is never part of
      // `icons`, so it has to be named here or its glyphs would wait forever.
      // One page AHEAD of what is drawn, so the markup for the next page is
      // usually cached before infinite scroll appends it and each new cell
      // renders once, with its glyph, instead of once empty and again on arrival.
      for (const icon of [...icons.slice(0, visible + PAGE_SIZE), ...recents]) {
        if (!icon.cdn || icon.custom || icon.logo) continue
        // THE LAST LINE OF DEFENCE, and the only one that is unconditional.
        // Every browse path above already refuses to put a gated pack into
        // `icons`, so in a correct build this never fires. It is here because
        // this is the single function in the file that turns a pack name into a
        // request to api.iconify.design, and a gate that lives only in the four
        // callers is a gate a fifth caller can walk around. The Recent rail is
        // the concrete case: it is drawn from a DIFFERENT list, kept in
        // localStorage, which survives signing out — so a viewer who was Pro
        // yesterday has simple-icons names in there today, and without this
        // line the rail would fetch them.
        if (!canSee(icon.pack) || !canSeeIcon(icon.pack, icon.name, tier)) continue
        const key = svgKey(icon.pack, icon.name)
        // A name the server would refuse is never sent: one such name fails its whole batch.
        if (isAnimatedPack(icon.pack) && !isAnimatedName(icon.name)) { GLYPH_MISSING.add(key); continue }
        if (GLYPH_BODY.has(key)) continue
        // A pack that just failed waits out its cool-down; a name that has
        // failed GLYPH_RETRY_MAX + 1 times is left alone for the session.
        if (Date.now() < (GLYPH_RETRY_AFTER.get(icon.pack) || 0)) continue
        if ((GLYPH_FAILS.get(key) || 0) > GLYPH_RETRY_MAX) continue
        const asked = askedFor(icon.pack)
        if (asked.has(icon.name)) continue
        asked.add(icon.name)
        if (!wanted.has(icon.pack)) wanted.set(icon.pack, [])
        wanted.get(icon.pack).push(icon.name)
      }
      if (!wanted.size) return
      const jobs = []
      for (const [pack, names] of wanted) {
        const batch = isAnimatedPack(pack) ? ANIMATED_BATCH : GLYPH_BATCH
        for (let i = 0; i < names.length; i += batch) {
          const slice = names.slice(i, i + batch)
          jobs.push({ pack, names: slice, done: loadGlyphBatchOutcome(pack, slice) })
        }
      }
      Promise.all(jobs.map(j => j.done)).then((results) => {
        if (!mountedRef.current) return
        setGlyphTick(n => n + 1)
        // EVERY request refused is the service refusing, not an icon missing.
        // A partial failure keeps the cells whose bodies did arrive, and hands
        // the failed batches' names back so a bounded retry can fill the rest.
        // A RETRY run that fails is a partial failure too, however many jobs it
        // held: one flag pack timing out twice must not swap the whole grid for
        // the built-in set, so only a first-time total refusal raises the notice.
        const allRefused = results.length > 0 && results.every(r => !r.ok)
        const isRetryRun = jobs.every(j => j.names.some(n => GLYPH_FAILS.has(svgKey(j.pack, n))))
        // An animated set failing says nothing about the icon service the other
        // packs use, so a refusal made up only of animated batches never counts
        // as the service refusing (and never sets cdnOk).
        const animatedOnly = jobs.every(j => isAnimatedPack(j.pack))
        const refusing = allRefused && !isRetryRun && !animatedOnly
        // A failure that belongs to the viewer's session or plan is neither a
        // retry candidate (waiting will not fix it) nor an outage.
        const scoped = (i) => !results[i].ok && isPackScopedFailure(results[i].kind)
        // Names that were never answered must not stay marked as asked, or a
        // later pass (the retry button, a scroll) would find nothing to request.
        const forgetAsked = (job) => { const asked = askedFor(job.pack); for (const n of job.names) asked.delete(n) }
        const animatedOutage = animatedOnly && allRefused && !isRetryRun && results.every(r => r.kind === 'transient')
        if (results.some(r => !r.ok) && !refusing && !animatedOutage) {
          let retry = false
          jobs.forEach((job, i) => {
            if (results[i].ok) return
            if (scoped(i)) { forgetAsked(job); return }
            const asked = askedFor(job.pack)
            for (const n of job.names) {
              asked.delete(n)
              const key = svgKey(job.pack, n)
              const fails = (GLYPH_FAILS.get(key) || 0) + 1
              GLYPH_FAILS.set(key, fails)
              if (fails <= GLYPH_RETRY_MAX) retry = true
              else GLYPH_MISSING.add(key)
            }
            GLYPH_RETRY_AFTER.set(job.pack, Date.now() + GLYPH_RETRY_MS)
          })
          if (retry) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = setTimeout(() => { if (mountedRef.current) setRetryTick(n => n + 1) }, GLYPH_RETRY_MS + 50)
          }
          // 'forbidden' wins over 'auth': it is the one a retry cannot fix.
          const kinds = results.filter((r, i) => scoped(i) && r.kind !== 'stale').map(r => r.kind)
          if (kinds.length) setAnimatedNotice(kinds.includes('forbidden') ? 'forbidden' : 'auth')
        }
        if (animatedOutage) {
          jobs.forEach(forgetAsked)
          setLoadError(true)
          renderLocal('', jobs[0].pack)
        }
        if (refusing) {
          for (const [pack, names] of wanted) {
            const asked = askedFor(pack)
            for (const n of names) asked.delete(n)
          }
          cdnOk.current = false
          setLoadError(true)
          renderLocal('', '')
        }
      })
    }, 120)
    return () => clearTimeout(t)
  }, [icons, visible, recents, renderLocal, canSee, tier, retryTick])

  // The one read of `glyphTick`. The caches above are module-level Maps, so a
  // tranche landing changes nothing React can see; tying this callback's
  // identity to the counter is what lets a cell that first rendered blank
  // repaint with its markup.
  const glyphSrc = useCallback(
    (pack, name) => glyphSymbolRef(pack, name) || glyphDataUri(pack, name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glyphTick]
  )
  // `!loadError` WAS TOO STRONG, AND IT PUT BACK THE SILENCE THE EMPTY STATE
  // BELOW WAS ADDED TO END.
  //
  // The guard is right for one case: the catalogue could not be fetched and
  // there is nothing to search, where "No icons match" would blame the user's
  // word for the network's failure. But a load error does not mean an empty
  // page here — the surface falls back to 120 built-in icons and says so in the
  // notice above the grid. Searching those is an ordinary thing to do, and when
  // the word matches none of them the grid empties on the SEARCH's account, not
  // the service's.
  //
  // MEASURED at 1280 and 390, light, with the icon service
  // unreachable: `.ig` held 120 cells, typing "zzzqqqxyz" took it to 0, the
  // grid became `display:none`, and the ONLY live region left on the page was
  // the stale "Couldn't reach the icon service" notice. No empty state, no
  // count, nothing announced — a blank page under a banner about a different
  // problem. Typing "arrow" brought back 10, so the search was working fine.
  //
  // So the suppression now applies only while the user has not searched. With a
  // query the block below explains which of the two things went wrong, in the
  // sentence it already carries.
  //
  // THE SAME SILENCE WAS ALSO THERE FOR THE PACK AND COLLECTION
  // FILTERS, which is the half the fix above did not reach.
  //
  // The fallback set is 259 built-in icons and it does not cover every pack the
  // control offers. Measured at 1280 with the service unreachable, stepping
  // through all 24 selectable packs: 18 of them rendered an EMPTY GRID WITH NO
  // MESSAGE AT ALL — ph, mdi, material-symbols, solar, fa6-solid, bxs, logos,
  // devicon, skill-icons, circle-flags, flag, flagpack, cif, flat-color-icons,
  // twemoji, noto, fluent-emoji, openmoji. Only all, lucide, tabler, iconoir,
  // heroicons and simple-icons drew anything. Three quarters of that menu was a
  // control that appeared to do nothing, under a banner about a different
  // problem — the exact state the note above says this empty state exists to
  // end, reached by a different route.
  //
  // Narrowing to a pack or a collection is a user action, the same as typing,
  // so an empty result is an answer to it and deserves one. NO NEW SENTENCE:
  // the block below already carries "No icons to show — try another pack or
  // search." for the query-less case, which is exactly true here and blames
  // nobody. The outage notice stays above it and still explains the cause.
  //
  // AND NOT WHEN THE GRID IS EMPTY BECAUSE THE VIEWER MAY NOT HAVE
  // IT. "No icons to show — try another pack or search" is true of a pack that
  // holds nothing and false of one that holds thousands the visitor is not
  // entitled to; printing it over a gate would be the page blaming the
  // catalogue for a decision the product made. A gated scope has its own panel,
  // which says what it is and how to open it.
  const searchEmpty = !isMyIcons && !gated && !loading && icons.length === 0 && !animatedNotice
    && (!loadError || query.trim().length > 0 || !!pack || !!group)

  /* ── THE WALLS AND THE END BAND, AND WHICH ONE IS ON SCREEN ───────────────
     `gated` replaces the grid: the viewer asked for a set they may not have, so
     there is nothing to show and one thing to say.
     `endKind` picks the band that sits UNDER the grid: the viewer has everything
     they asked for, there is simply less of it, and the band says why. Signed
     out, it is the cap explanation plus a way in. Signed in on the free plan,
     it is an upgrade band shown only once the results have run out. Pro gets no
     band, and a gated scope never gets one (the wall is the whole answer). The
     rules live in endBandKind so they can be tested without rendering. */
  const endKind = endBandKind({
    tier, authLoading, planLoading: !planKnown, isMyIcons, gated, loading, resultCount: icons.length, hasMore,
  })
  const gateCopy = gated ? (gated.need === 'free' ? ICON_GATE_COPY.lockedFree : ICON_GATE_COPY.lockedPro) : null
  // How many packs sit on the other side of the account boundary. Read off the
  // table rather than typed, so moving a pack moves the number.
  const packsBehindLogin = useMemo(
    () => visiblePacks(ALL_PACKS, 'free').length - visiblePacks(ALL_PACKS, 'anon').length,
    [],
  )
  // How many packs Pro adds over a free account, derived the same way.
  const packsProAddsCount = useMemo(() => packsProAdds(ALL_PACKS), [])
  const openGate = useCallback((need) => {
    // The reason string follows the convention every gate in this app uses — a
    // short lowercase verb phrase naming the action, which LoginPopup renders
    // as "log in to <reason>". See hooks/useExportGate.js: no marketing
    // sentence is written at a call site.
    if (need === 'free') { requireLogin('browse every icon pack'); return }
    // `gate` is what trackUpgradeGate measures this wall as. Without it the
    // whole surface would report as the modal's own title.
    // A Pro pack's wall goes to /plans, reporting the
    // same gate id the modal used to.
    reportUpgradeGate('icon-pack-tier')
    navigate('/plans')
  }, [requireLogin, navigate])

  // Stable handlers for IconCell, so its memo holds across renders.
  // `handleIconClick` closes over most of the page's state; the cell calls it
  // through a ref that always holds the newest one.
  const pickRef = useRef(null)
  useEffect(() => { pickRef.current = handleIconClick })
  const onPick = useCallback((icon) => pickRef.current?.(icon), [])
  // The hover prefetch is the customizer's head start, and it is the one
  // remaining path from a cell to api.iconify.design. A cell for a gated pack
  // should never be on screen; if one ever is, hovering it must not be what
  // fetches the markup every other path in this file refused to.
  const onWarm = useCallback((icon, now) => {
    if (!canSee(icon.pack)) return
    if (now) prefetchIconSvg(icon)
    else warmSoon(icon)
  }, [canSee])

  // Windowing state for the main grid: cells before `upTo` render as ghosts of
  // their measured height `h[idx]`, except `keep`, the focused cell, which stays
  // whole so keyboard focus is never swapped out from under the user. Reset
  // whenever the list itself is replaced (a new pack, group or query), since
  // positions then mean different icons.
  const gridRef = useRef(null)

  /* The blurred rows under the signed-out grid must line up with its columns, so
     the column count is read from the live grid's resolved template and kept
     current as the page resizes. The height of a real cell is read the same way
     so the blurred rows sit on the grid's row pitch. Until they are read the
     phone/desktop defaults are used; the band is below the fold at first paint,
     so the correction is not seen. Only measured while the signed-out band is
     showing. */
  const [gridCols, setGridCols] = useState(null)
  const [gridCellH, setGridCellH] = useState(null)
  useEffect(() => {
    if (endKind !== 'anon') return
    const grid = gridRef.current
    if (!grid) return
    const read = () => {
      const n = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
      if (n > 0) setGridCols(n)
      const h = grid.querySelector('.ic')?.getBoundingClientRect().height
      if (h > 0) setGridCellH(Math.round(h * 100) / 100)
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [endKind])
  const teaseCols = gridCols
    || teaseColsFallback(typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 760px)').matches)
  // Built-in icons only, from packs this viewer may browse, and not repeating
  // anything already on screen. No network involved.
  const teaseCells = useMemo(() => {
    if (endKind !== 'anon') return []
    return pickTeaseIcons({
      icons: window.icons || [],
      shownNames: icons.slice(0, visible).map((i) => i.name),
      count: teaseCellCount(teaseCols),
      canSee,
    })
  }, [endKind, icons, visible, teaseCols, canSee])

  const [waitingStatus, setWaitingStatus] = useState(false)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    let timer = null
    let raf = 0
    // Which waiting elements are on screen is the IntersectionObserver's job: it
    // reports after layout, so nothing here reads geometry (a rect read inside the
    // mutation callback forced a layout of the cells React had just mounted, and
    // the scroll listener forced one per scroll event).
    const onscreen = new Set()
    const settle = () => {
      for (const el of onscreen) if (!el.isConnected) onscreen.delete(el)
      if (!onscreen.size) {
        clearTimeout(timer)
        timer = null
        setWaitingStatus(false)
      } else if (timer === null) {
        timer = setTimeout(() => setWaitingStatus(true), 600)
      }
    }
    const io = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting && target.isConnected) onscreen.add(target)
        else onscreen.delete(target)
      }
      settle()
    })
    const watched = new Set()
    // Cheap: selector matching only, no style or layout. At most once a frame.
    const scan = () => {
      raf = 0
      const now = new Set(grid.querySelectorAll('.ig-skel,.ig-glyph-wait,.ig-glyph-pending,.ig-chip--wait'))
      for (const el of now) if (!watched.has(el)) { watched.add(el); io.observe(el) }
      for (const el of watched) if (!now.has(el)) { watched.delete(el); io.unobserve(el); onscreen.delete(el) }
      settle()
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(scan) }
    const observer = new MutationObserver(schedule)
    observer.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    scan()
    return () => {
      observer.disconnect()
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
      clearTimeout(timer)
      setWaitingStatus(false)
    }
  }, [gated, source])
  const [win, setWin] = useState({ list: icons, upTo: 0, h: [], keep: -1 })
  if (win.list !== icons) setWin({ list: icons, upTo: 0, h: [], keep: -1 })
  const windowed = !isMyIcons && !gated && shown.length > PAGE_SIZE
  useEffect(() => {
    const grid = gridRef.current
    if (!windowed || !grid || win.list !== icons) return
    let raf = 0
    // The width comes from a ResizeObserver, which reports after layout; reading
    // `clientWidth` here instead forced a layout on every update that followed a
    // commit.
    let width = -1
    let widthChanged = false
    let seen = -1
    const update = () => {
      raf = 0
      // A new width reflows every row, so every stored height is stale.
      if (widthChanged) {
        widthChanged = false
        if (win.upTo) setWin({ list: icons, upTo: 0, h: [], keep: -1 })
        return
      }
      const kids = grid.children
      // Cells were added (or swapped for ghosts) since the last read, so the page
      // has layout pending. Reading a rect now would force it inside this
      // callback; the frame lays it out anyway, and the next frame reads clean.
      if (kids.length !== seen) {
        seen = kids.length
        raf = requestAnimationFrame(update)
        return
      }
      // First cell whose bottom is still inside the overscan above the viewport.
      let lo = 0
      let hi = kids.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (kids[mid].getBoundingClientRect().bottom < -WINDOW_OVERSCAN_PX) lo = mid + 1
        else hi = mid
      }
      const upTo = lo - (lo % GHOST_STEP)
      // Ghost everything above the window except the focused cell, or keyboard
      // focus would fall to <body>. (Capping `upTo` at the focused cell instead
      // left the whole grid whole once cell 0 had been clicked.)
      const focused = grid.contains(document.activeElement)
        ? Array.prototype.indexOf.call(kids, document.activeElement.closest('.ig > *'))
        : -1
      const keep = focused >= 0 && focused < upTo ? focused : -1
      if (upTo === win.upTo && keep === win.keep) return
      if (upTo <= win.upTo) { setWin({ ...win, upTo, keep }); return }
      // Read every height first, then commit once: one layout, no thrash.
      const h = win.h.slice()
      for (let i = win.upTo; i < upTo; i++) h[i] = kids[i].getBoundingClientRect().height
      setWin({ list: icons, upTo, h, keep })
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    const sizeWatch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (width >= 0 && w !== width) { widthChanged = true; schedule() }
      width = w
    })
    sizeWatch?.observe(grid)
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Focus moving into or out of the ghosted rows changes which cell is kept.
    grid.addEventListener('focusin', schedule)
    grid.addEventListener('focusout', schedule)
    return () => {
      sizeWatch?.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      grid.removeEventListener('focusin', schedule)
      grid.removeEventListener('focusout', schedule)
    }
  }, [windowed, win, icons])

  // THE PACK LABEL ONLY EARNS ITS LINE WHEN IT DISCRIMINATES.
  // It is already dropped below 980px; above 980px it was still drawn under EVERY
  // cell - 120 of them on first paint, all reading "lucide" - while the line
  // that does tell icons apart, the icon's own name, was being truncated to
  // make room for it ("align-horizontal-…", "align-vertical-distribute-…").
  // A value identical across the whole grid discriminates nothing.
  // Comparable web pickers do not label the pack on the cell: some give bare
  // glyphs, some head the collection once, and one states "Special Lineal by
  // Freepik · 288.1k icons in this collection" ONCE above the grid and labels
  // not one cell. That is the same answer the CSS note reached: pack identity
  // belongs to the GROUP.
  // So it is kept for the case the narrow-screen rule reserved it for and no other - a result
  // set that actually holds more than one pack, which is where the word tells
  // you something. Which pack is being browsed is already stated by the pack
  // filter in the toolbar above.
  // `ghosts` is the main grid's windowing state; cells before `ghosts.upTo`
  // render in their ghost form at their measured height.
  // Use the full result so revealing another pack never changes cell heights.
  const mainShowPack = useMemo(() => gridShowsPack(icons), [icons])
  const recentsShowPack = useMemo(() => gridShowsPack(visibleRecents), [visibleRecents])
  const renderGrid = (list, showPack = mainShowPack, ghosts = null) => {
    const ghostAt = (idx) => (ghosts && idx < ghosts.upTo && idx !== ghosts.keep ? ghosts.h[idx] : 0)
    return list.map((icon, idx) => renderCell(icon, idx, showPack, ghostAt(idx)))
  }

  // Reserve the first page's count and pack layout before catalogue names arrive.
  const firstPageSize = capped ? Math.min(PAGE_SIZE, ANON_ICON_CAP) : PAGE_SIZE
  const pendingPacks = pack ? [pack] : group ? ICON_GROUPS[group].packs.filter(canSee) : allowedPacks
  const skeletonIcons = Array.from({ length: firstPageSize }, (_, idx) => ({
    pack: pendingPacks[(source === 'group' || source === 'search' ? idx : Math.floor(idx / perPackCap)) % pendingPacks.length],
  }))
  // The loaded grid labels every cell once its result spans more than one pack,
  // however the first page happens to split, so the skeleton reserves the label
  // whenever the scope will load more than one pack.
  const skeletonShowPack = pendingPacks.length > 1
  // Which pack a search returns is unknown while it loads, so the skeleton
  // cannot tell a one-pack answer from a many-pack one. In a multi-pack scope
  // the loaded grid keeps the labelled cell height either way (the same blank
  // label row the narrow layouts already keep), so neither answer shifts.
  const gridClass = skeletonShowPack ? 'ig ig--reserve-pack' : 'ig'

  // `is-picked` is the design's selected tile (accent wash over an accent
  // hairline): the one whose customizer is open. Matched on pack + name, the
  // same identity the customizer's own key is built from below.
  const isPicked = (icon) => !!selected && selected.name === icon.name
    && (selected.pack || null) === (icon.pack || null) && !!selected.custom === !!icon.custom
  const renderCell = (icon, idx, showPack = false, ghost = 0) => (
    <IconCell
      // THE KEY CARRIES THE POSITION. The built-in set repeats ids across its
      // pages ("flag" is in two of them), and with two pages loaded React met
      // the duplicate and left an orphan cell behind that no later render
      // removed: a stray "flag" sat at the head of every pack's grid, and an
      // uncovered pack showed that one cell above its empty state. Grids here
      // only ever grow at the end (infinite scroll) or are replaced whole (a
      // new pack or query), so a position prefix costs no reconciliation.
      key={`${idx}:${icon.id || icon.key || icon.name || ''}`}
      icon={icon}
      // A ghost draws no glyph, so it asks for no source.
      src={!ghost && icon.cdn && !icon.custom && !icon.logo ? glyphSrc(icon.pack, icon.name) : ''}
      gone={!!icon.cdn && !icon.custom && !icon.logo && GLYPH_MISSING.has(svgKey(icon.pack, icon.name))}
      showPack={showPack}
      picked={isPicked(icon)}
      ghost={ghost}
      onPick={onPick}
      onWarm={onWarm}
      onGlyphError={noteGlyphFailure}
    />
  )

  return (
    <div className="sec">
      {/* Preview-only shape edges; these definitions never enter copied artwork. */}
      <svg className="ig-edge-filters" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {['light', 'dark'].map(tone => (
            <filter key={tone} id={`ig-edge-${tone}`} x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
              <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="edge" />
              <feFlood floodColor={tone === 'light' ? '#f4f4f5' : '#060607'} floodOpacity={tone === 'light' ? '.85' : '.75'} result="colour" />
              <feComposite in="colour" in2="edge" operator="in" result="outline" />
              <feMerge>
                <feMergeNode in="outline" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>
      </svg>
      {/* NO STANDALONE MASTHEAD. Both libraries used to carry one behind
          `{!embedded && ...}` — an eyebrow, an h1 and the subtitle — for a
          route that has not existed since the two were merged: the ONLY import
          of this module is IconEmojiLibrary.jsx, which mounts it inside the
          shared `DiscoverGalleryHero` and passed `embedded` unconditionally.
          Verify with
            grep -rn "from './IconLibrary'" src
            grep -rn "from './EmojiLibrary'" src
          Unreachable, and not inert: the block kept a second copy of the h1 and
          subtitle that the wrapper owns, which is a drift bug waiting for the
          next copy change, and the eyebrow was `sec-h-eyebrow` — the exact
          element since deleted from every tool masthead it reached. A retired motif that cannot be rendered still
          reads as live code to the next person to open the file. */}

      {visibleRecents.length > 0 && !isMyIcons && (
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
            {visibleRecents.map((r) => (
              <button
                key={r.key}
                type="button"
                className="ig-rail-item"
                aria-label={`${r.action === 'edit' ? 'Edited' : 'Copied'} ${r.name} — open to customise`}
                onClick={() => handleIconClick(r)}
              >
                {r.cdn ? (
                  // NEVER `src=""`. The browser resolves an empty src against the
                  // document URL, fetches the HTML page, fails to decode it as an
                  // image and fires onError — which here is `noteGlyphFailure`, so
                  // a rail waiting one tick for its tranche would have counted
                  // itself past the eight-failure threshold and thrown the whole
                  // library into its refused state.
                  glyphDataUri(r.pack, r.name) ? (
                    <img src={glyphDataUri(r.pack, r.name)} width="24" height="24" className={invClass(r.pack)} loading="lazy" alt="" onError={noteGlyphFailure} />
                  ) : (
                    <span className="ig-glyph-wait" aria-hidden="true" />
                  )
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
            src/components/library/. The aim: make this and the Emoji
            Library match the galleries.

            THE PACK SELECT STAYS A SELECT. Twenty-six packs in six optgroups is
            not a pill tray, and forcing it into one to look consistent would
            trade a working control for a matching one. It sits in the toolbar's
            filter row beside the group tray and takes the shared field metrics,
            which is what "consistent" has to mean for a control this size. */}
        <LibraryToolbar
          className="ig-toolbar"
          quick={0}
          activeFilters={(selectValue !== 'all' ? 1 : 0) + (group ? 1 : 0) + (weight !== 'regular' ? 1 : 0)}
          search={{
            value: query,
            onChange: handleQueryChange,
            placeholder: 'Search icons…',
            label: 'Search icons',
          }}
          action={(
            <button type="button" className="ig-addbtn" onClick={handleAddIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span className="ig-addbtn-label">Add icon</span>
            </button>
          )}
        >
          {/* FIRST, so a phone keeps it on screen under the search (the
              toolbar's quick row) exactly where the design's phone mock draws it; the
              pack menu and the collection chips go to the Filters sheet. */}
          <IconWeightSeg value={weight} stateOf={weightState} onChange={handleWeight} />
          {/* Locked packs stay selectable so choosing one can show the access gate. */}
          <MenuSelect className="lbry-select" value={selectValue} onChange={handlePackChange} ariaLabel="Icon pack"
            options={[
              { value: 'all', label: 'All packs' },
              { group: 'Yours', options: [{ value: 'custom', label: 'My Icons' }] },
              ...PACK_MENU.map(g => {
                const marks = [...new Set(g.packs.map(([value]) => lockMark(value, tier)))]
                const uniform = marks.length === 1
                return {
                  group: g.label,
                  mark: uniform ? marks[0] : '',
                  options: g.packs.map(([value, label]) => ({ value, label, mark: uniform ? '' : lockMark(value, tier) })),
                }
              }),
            ]}
          />
          <LibraryFilterGroup
            label="Filter by icon group"
            triggerLabel="Group"
            value={source === 'custom' ? 'custom' : group}
            onChange={(id) => (id === 'custom' ? browseCustom() : handleGroupToggle(id))}
            options={groupOptions}
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
                  <button type="button" className="ig-custom-hint-link" onClick={() => openInNewTab('/plans')}>Go Pro for unlimited</button>
                </p>
              )}
            </section>

            <section className="ig-mysec">
              <div className="ig-mysec-head">
                <h3 className="ig-mysec-title">Recently copied</h3>
                {visibleRecents.length > 0 && (
                  <button type="button" className="ig-rail-clear" onClick={handleClearRecents} title="Clear recently copied">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Clear all
                  </button>
                )}
              </div>
              {visibleRecents.length > 0 ? (
                <div className="ig">{renderGrid(visibleRecents, recentsShowPack)}</div>
              ) : (
                <div className="ig-custom-empty">Icons you copy show up here for quick reuse.</div>
              )}
            </section>
          </div>
        ) : (
          <>
            {loadError && !gated && (
              // role="status": the sentence is the only thing telling a
              // screen-reader user that the grid under it is the built-in set
              // rather than the catalogue they searched. Rendered with every
              // Iconify host refused (429/403) the state was
              // otherwise complete — the sentence, Try again and the built-in
              // grid — but nothing announced it.
              //
              // `!gated` KEEPS THE TWO REFUSALS APART, which is the whole point
              // of having both. A gated scope asks for nothing, so nothing can
              // have refused it; carrying a stale "couldn't reach the icon
              // service" over a Pro wall would tell the visitor the network
              // broke when the product simply said no — and would hand the Try
              // again button a retry for a pack they may not have. It is the
              // same class of error as a masthead pill saying "Live library
              // connected" directly above this notice.
              <div className="ig-notice" role="status">
                <span>Couldn’t reach the icon service — showing built-in icons.</span>
                <button type="button" className="lib-btn ig-notice-btn" onClick={() => retryRef.current?.()}>Try again</button>
              </div>
            )}

            {/* PART OF THE CATALOGUE, NOT NONE OF IT. The grid below is live (or the
                copy saved on this device); the line says what is missing, once and
                quietly, instead of the grid just being shorter. Never beside the
                loud notice above: that one means the built-in set replaced the grid. */}
            {softNotice && !loadError && !gated && (
              <div className="ig-notice ig-notice-quiet" role="status">
                <span>{SOFT_NOTICE_COPY[softNotice]}</span>
                <button type="button" className="lib-btn ig-notice-btn" onClick={() => retryRef.current?.()}>Try again</button>
              </div>
            )}

            {/* AN ANIMATED SET THE SESSION OR PLAN CANNOT OPEN. Its own notice, apart
                from the one above: the icon service is fine, so nothing here
                claims otherwise, shows the built-in set, or affects other packs.
                Only while that pack is the one on screen. */}
            {animatedNotice && isAnimatedPack(pack) && !gated && (
              <div className="ig-notice" role="status">
                <span>{animatedNotice === 'forbidden'
                  ? 'Animated icons need an active Pro plan.'
                  : 'Sign in again to load animated icons.'}</span>
                {animatedNotice === 'forbidden'
                  ? <button type="button" className="lib-btn ig-notice-btn" onClick={() => openGate('paid')}>{ICON_GATE_COPY.lockedPro.action}</button>
                  : <button type="button" className="lib-btn ig-notice-btn" onClick={() => retryRef.current?.()}>Try again</button>}
              </div>
            )}

            {/* CARBON'S BRAND MARKS ARE PRO. They are left out of the list, so this says so once instead of the pack just looking shorter. */}
            {proHeld.n > 0 && proHeld.pack === pack && source === 'pack' && !gated && !loading && (
              <div className="ig-notice ig-notice-quiet" role="status">
                <span>{`${proHeld.n} ${packLabel(pack)} brand logos are on Pro.`}</span>
                <button type="button" className="lib-btn ig-notice-btn" onClick={() => openGate('paid')}>{ICON_GATE_COPY.lockedPro.action}</button>
              </div>
            )}

            {gated && (
              <IconGateWall
                kind={gated.need}
                heading={gateCopy.heading(gated.label)}
                body={gateCopy.body}
                action={gateCopy.action}
                onAction={() => openGate(gated.need)}
              />
            )}

            {/* NO EMPTY `.ig` UNDER A WALL. A gated scope holds no icons, and an
                empty grid container still occupies its gap and reads as a grid
                that failed to fill — the "cell that failed to load" shape this
                file has been fixed for twice. The wall is the whole answer. */}
            {!gated && (
              <div className={gridClass} ref={gridRef}>
                {loading && icons.length === 0
                  ? skeletonIcons.map((icon, i) => (
                    <div key={`skel-${i}`} className="ic ig-skel" aria-hidden="true">
                      <div className={!COLORED_PACKS.has(icon.pack) ? 'ig-skel-slot ig-skel-slot--mono' : 'ig-skel-slot'} />
                      <div className={skeletonShowPack ? 'ig-skel-labels' : 'ig-skel-labels ig-skel-labels--single'}>
                        <div className="sk ig-skel-label" />
                        {skeletonShowPack && <div className="sk ig-skel-pack" />}
                      </div>
                    </div>
                  ))
                  : renderGrid(shown, mainShowPack, windowed && win.list === icons ? win : null)}
              </div>
            )}

            {waitingStatus && !gated && <p className="ig-status" aria-live="polite">Loading icons…</p>}

            {hasMore && <div ref={sentinelRef} className="ig-sentinel" />}

            {loading && icons.length > 0 && (
              <p className="ig-status">Loading more…</p>
            )}

            {/* THE GRID EMPTYING IS A STATUS MESSAGE, and it was silent.
                Type a query that matches nothing and the grid drops from 120
                cells to 0; this block appears, saying so and saying how to get
                back. Nothing announced it — measured at 1280/light
                and 390/dark, where the only live region on the page was the
                app toast, empty. So a screen-reader user searching for a word
                the catalogue does not carry heard nothing at all and had no
                signal that the search, rather than the page, had failed.

                The EMOJI tab of this same surface — the same masthead, one
                click away — has announced its result count since it shipped
                (`#emoji-search-status`, role=status, "0 emojis for …"), and
                the Font Gallery announces `.fg-count`. Two libraries on one
                page answering the same question two ways is the thing the
                shared toolbar work was for.

                role=status, not alert: this is the outcome of the user's own
                keystroke, not an error to interrupt for. No new sentence — the
                two below are the ones already on screen. The icon is decorated
                and now says so; the emoji copy of this block already did. */}
            {searchEmpty && (
              <div className="pl-empty" role="status" aria-live="polite">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

            {/* THE END BAND. The status line above counts what is on screen; it
                cannot say that the number is a rule rather than the size of
                the library, and a count with no explanation is the thing that
                makes a cap feel punitive. Signed out, the band states the rule
                and the Log in button is the way past it. Signed in on the free
                plan, it names what Pro adds and links to the plans. */}
            {endKind === 'anon' && (
              <IconEndBand
                kind="anon"
                heading={ICON_GATE_COPY.end.anon.heading}
                body={ICON_GATE_COPY.end.anon.body(ANON_ICON_CAP, packsBehindLogin)}
                action={ICON_GATE_COPY.end.anon.action}
                onAction={() => openGate('free')}
                secondary={ICON_GATE_COPY.end.anon.secondary}
                tease={teaseCells.length > 0 && (
                  <IconEndTease
                    cells={teaseCells}
                    cols={teaseCols}
                    cellH={gridCellH}
                    chip={ICON_GATE_COPY.end.anon.chip}
                    onAction={() => openGate('free')}
                  />
                )}
              />
            )}
            {endKind === 'free' && (
              <IconEndBand
                kind="free"
                heading={ICON_GATE_COPY.end.free.heading}
                body={ICON_GATE_COPY.end.free.body(packsProAddsCount, FREE_COPIES_PER_DAY)}
                action={ICON_GATE_COPY.end.free.action}
                to="/plans"
                onAction={() => reportUpgradeGate('icon-library-end')}
              />
            )}

            {/* THE LOGO.DEV USAGE HINT, which is product copy and stays
                conditional — it explains a control that only exists on this
                pack. It is no longer the only place logo.dev is credited: the
                unconditional line below carries that link in every state, which
                is what their free tier actually asks for. Both are kept; a
                second credit on the screen that is all logo.dev costs nothing,
                and removing it would be removing a working sentence. */}
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
      {/* OUTSIDE THE `isMyIcons` BRANCH, AND OUTSIDE EVERY OTHER CONDITION ON
          this surface. The saved and recently-copied grids under My Icons are
          the same third-party glyphs under another heading, the Recent rail
          sits above every state including the gated one, and the offline grid
          is Lucide, Tabler, Iconoir, Heroicons and Simple Icons. There is no
          state of this page that shows somebody else's work and owes nothing,
          so there is no condition here. */}
      <IconPackCredit packs={packsOnScreen(icons, recents)} />
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
