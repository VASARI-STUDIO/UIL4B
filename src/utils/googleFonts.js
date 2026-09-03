import { FALLBACK_FONTS } from '../data/fallbackFonts'
import { detectCanvasFontRendered } from './fontDetection'

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY || ''
const API_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
const CACHE_TTL = 24 * 60 * 60 * 1000
const LS_KEY = 'vs-gf-catalog'
export const FONT_CATALOG_SOURCE_TIMEOUT_MS = 2000

let cache = null
let cacheTimestamp = 0
// Where the catalog currently in `cache` actually came from. The typography
// tools surface this verbatim, so a degraded catalog is never presented as the
// real one: 'live' (Google or the /api/fonts proxy answered this session),
// 'cache' (a fresh localStorage copy from an earlier session) or 'fallback'
// (the bundled list — the tool still works, but the catalog is short and stale).
let cacheSource = 'fallback'

function transformFont(item, index) {
  const numericWeights = item.variants
    .map(v => {
      if (v === 'regular') return 400
      if (v === 'italic') return null
      const n = parseInt(v, 10)
      return isNaN(n) ? null : n
    })
    .filter(w => w !== null)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .sort((a, b) => a - b)

  return {
    family: item.family,
    category: item.category,
    variants: numericWeights,
    subsets: item.subsets,
    popularity: index,
    // The WebFonts API cannot supply the designer or the date a family was
    // added — only /api/fonts (the metadata endpoint) can, and the About tab
    // renders every one of those fields conditionally for exactly this reason.
    // Italic availability IS derivable here, and was being thrown away with the
    // rest of the variant strings, so a family shipping twelve italics looked
    // identical to one shipping none.
    italics: (item.variants || []).some(v => String(v).includes('italic')),
  }
}

// Catalog sources, in order of preference:
//   1. Google WebFonts API directly (needs VITE_GOOGLE_FONTS_API_KEY)
//   2. /api/fonts serverless proxy (works without any client key)
//   3. Bundled FALLBACK_FONTS so the font tools never render empty
// Successful fetches are cached in localStorage for a day.
function throwIfAborted(signal) {
  if (!signal?.aborted) return
  const error = new Error('Font catalogue request cancelled')
  error.name = 'AbortError'
  throw error
}

// Bound each upstream independently. A proxy or API endpoint that accepts the
// connection but never answers must not leave every typography tool loading.
async function requestCatalogJson(url, { signal, timeout = FONT_CATALOG_SOURCE_TIMEOUT_MS } = {}) {
  throwIfAborted(signal)
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(cancel, timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}

async function getRawFonts({ force = false, signal } = {}) {
  throwIfAborted(signal)
  if (force) {
    cache = null
    cacheTimestamp = 0
    cacheSource = 'fallback'
    // A retry must genuinely re-fetch: a stale localStorage copy would answer
    // instantly and make the Retry button look broken.
    try { localStorage.removeItem(LS_KEY) } catch {}
  }
  if (cache && Date.now() - cacheTimestamp < CACHE_TTL) return cache

  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (stored && Array.isArray(stored.fonts) && stored.fonts.length && Date.now() - stored.t < CACHE_TTL) {
      cache = stored.fonts
      cacheTimestamp = stored.t
      cacheSource = 'cache'
      return cache
    }
  } catch {}

  let fonts = null

  if (API_KEY) {
    try {
      const data = await requestCatalogJson(API_URL, { signal })
      if (data) {
        const items = (data.items || []).map(transformFont)
        if (items.length) fonts = items
      }
    } catch {
      throwIfAborted(signal)
    }
  }

  if (!fonts) {
    try {
      const data = await requestCatalogJson('/api/fonts', { signal })
      if (data) {
        if (Array.isArray(data.fonts) && data.fonts.length) fonts = data.fonts
      }
    } catch {
      throwIfAborted(signal)
    }
  }

  if (fonts) {
    cache = fonts
    cacheTimestamp = Date.now()
    cacheSource = 'live'
    try { localStorage.setItem(LS_KEY, JSON.stringify({ t: cacheTimestamp, fonts })) } catch {}
    return cache
  }

  if (import.meta.env.DEV) console.warn('Google Fonts catalog unavailable — using bundled fallback list')
  // Don't poison the long-lived cache with the fallback: keep it for 5 minutes
  // so a transient network failure recovers quickly.
  cache = FALLBACK_FONTS
  cacheTimestamp = Date.now() - CACHE_TTL + 5 * 60 * 1000
  cacheSource = 'fallback'
  return cache
}

// The catalog PLUS an honest account of where it came from — the three
// typography tools all render this, so a degraded (bundled-fallback) catalog
// shows a visible notice and a working Retry instead of quietly pretending the
// whole of Google Fonts loaded. `force: true` drops both caches so the retry is
// a real network attempt. Never rejects: the bundled list is always a valid
// answer, and `source` is what tells the caller the difference.
export async function fetchFontCatalog({ force = false, signal } = {}) {
  try {
    const fonts = await getRawFonts({ force, signal })
    return { fonts, source: cacheSource }
  } catch {
    // getRawFonts already swallows fetch failures, so reaching here means
    // something genuinely unexpected broke (a hostile localStorage shim, say).
    return { fonts: FALLBACK_FONTS, source: 'fallback' }
  }
}

// family -> { link, weights:Set<number>, status:'pending'|'loaded'|'error', ready:Promise<void> }
// `status`/`ready` make detection event-driven: verifyFontLoaded can wait for the
// actual stylesheet request to settle and, crucially, tell a genuine
// network/extension block (the <link> firing `error`) apart from "the face just
// hasn't arrived yet". A real `error` is authoritative; a settled link alone is
// never accepted as proof that the requested binary face became usable.
const loadedFonts = new Map()

// Build and inject the css2 <link> for a family at the given weights, wiring its
// load/error events into a per-family status. `nonce` busts the HTTP cache on a
// manual retry so a transiently-failed request is genuinely re-attempted rather
// than served from cache.
function injectFontLink(family, weights, nonce) {
  // CSS2 API wants the axis tag ONCE: family=Name:wght@400;700 — NOT
  // wght@400;wght@700 (which Google rejects, leaving the font unloaded).
  const weightStr = `wght@${weights.join(';')}`
  let url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${weightStr}&display=swap`
  if (nonce) url += `&_r=${nonce}`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.dataset.fontFamily = family

  const entry = { link, weights: new Set(weights), status: 'pending', ready: null }
  entry.ready = new Promise(resolve => {
    link.onload = () => {
      // Only the latest link for this family owns the status — a superseded
      // link (weight upgrade / retry) resolving late must not clobber it.
      if (loadedFonts.get(family)?.link === link) entry.status = 'loaded'
      resolve()
    }
    link.onerror = () => {
      // A real network failure or a content/privacy blocker intercepting
      // fonts.googleapis.com fires `error`. This is the only signal we trust
      // enough to tell the user a font was actually blocked.
      if (loadedFonts.get(family)?.link === link) entry.status = 'error'
      resolve()
    }
  })

  document.head.appendChild(link)
  loadedFonts.set(family, entry)
  return entry
}

export function loadFont(family, weights = [400]) {
  const requested = [...new Set(weights)]
    .filter(w => Number.isFinite(w))
    .sort((a, b) => a - b)
  if (!requested.length) requested.push(400)

  const existing = loadedFonts.get(family)
  if (existing) {
    // Already covers everything we need — nothing to do.
    if (requested.every(w => existing.weights.has(w))) {
      return existing.ready.then(() => existing.status)
    }
    // Otherwise upgrade the link to the union of weights so previews aren't
    // forced to synthesise (faux-bold) a weight that was never downloaded.
    requested.forEach(w => existing.weights.add(w))
    const all = [...existing.weights].sort((a, b) => a - b)
    existing.link.remove()
    const upgraded = injectFontLink(family, all, null)
    return upgraded.ready.then(() => upgraded.status)
  }

  const entry = injectFontLink(family, requested, null)
  return entry.ready.then(() => entry.status)
}

// Force a fresh fetch of a family's stylesheet, bypassing the HTTP cache, and
// resolve once it settles. Backs the detail-modal Retry so a font that failed
// transiently — or after the user pauses a blocker — actually re-downloads.
export async function reloadFont(family) {
  const existing = loadedFonts.get(family)
  const weights = existing ? [...existing.weights].sort((a, b) => a - b) : [400]
  if (existing) existing.link.remove()
  const entry = injectFontLink(family, weights, Date.now())
  await entry.ready
}

// Has the css2 <link> for this family fired a genuine `error` (network failure
// or a content/privacy blocker intercepting fonts.googleapis.com)? Returns true
// ONLY on that real signal — never on "not arrived yet".
function linkErrored(family) {
  return loadedFonts.get(family)?.status === 'error'
}

// Multi-baseline font detection: compare `"Target", generic` with that same
// generic for monospace, serif and sans-serif. A loaded target differs from
// all three. An unloaded target falls through and matches all three. Mixed
// evidence is inconclusive and must not reveal fallback text as a real face.
function canvasFontRendered(family, weight) {
  if (typeof document === 'undefined' || !document.createElement) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext && canvas.getContext('2d')
  if (!ctx) return null // No 2D context — can't measure; let caller decide.
  return detectCanvasFontRendered(ctx, family, weight)
}

// Verify a font actually rendered rather than silently falling back to a system
// face. Returns a Promise resolving to one of:
//   'ok'      — the family is confirmed rendering by FontFaceSet or unanimous
//               multi-baseline canvas evidence.
//   'failed'  — the stylesheet errored, or it settled without any confirmed
//               usable face. The caller should show an honest fallback + retry.
//   'unknown' — rendering cannot be inspected because there is no browser DOM
//               (SSR). Caller must not claim either success or failure.
//
// Detection is event-driven (it leans on the <link>'s load/error events via
// loadedFonts) and ALWAYS awaits document.fonts.ready before any negative
// verdict — including the timeout branch — so a slow-but-successful load is
// never mistaken for a failure. Verify at the REQUESTED base weight (default
// 400), not a heading weight: document.fonts.check('700 …') is false for a
// synthesised bold even when the regular face loaded fine.
export async function verifyFontLoaded(family, weight = 400, { timeout = 6000 } = {}) {
  if (typeof document === 'undefined') return 'unknown'
  const entry = loadedFonts.get(family)
  if (entry?.status === 'pending') {
    await Promise.race([
      entry.ready,
      new Promise(resolve => setTimeout(resolve, timeout)),
    ])
  }
  if (linkErrored(family)) return 'failed'

  if (!document.fonts || !document.fonts.load) {
    // A settled stylesheet is not proof that its binary face arrived. Canvas
    // is the only remaining positive; false or inconclusive evidence must keep
    // fallback text from masquerading as the requested family.
    const rendered = canvasFontRendered(family, weight)
    return rendered === true && !linkErrored(family) ? 'ok' : 'failed'
  }
  const spec = `${weight} 16px "${family}"`
  try {
    // Kick off the load, then race it against a timeout so we never hang.
    const loadPromise = document.fonts.load(spec).catch(() => null)
    const timed = new Promise(resolve => setTimeout(() => resolve('timeout'), timeout))
    const result = await Promise.race([loadPromise, timed])

    // A genuine stylesheet error wins even if FontFaceSet retained a stale face
    // with the same family name from an earlier request.
    if (linkErrored(family)) return 'failed'

    // Positive FontFaceSet signals are trusted immediately.
    if (Array.isArray(result) && result.length > 0) return 'ok'
    if (document.fonts.check(spec)) return 'ok'

    // Always let pending faces settle before any negative verdict — this is the
    // core race fix and runs for BOTH the resolved-empty and 'timeout' branches.
    if (document.fonts.ready) {
      await Promise.race([
        document.fonts.ready.catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 500)),
      ])
      if (linkErrored(family)) return 'failed'
      if (document.fonts.check(spec)) return 'ok'
    }

    // Confident positive from canvas → rendering.
    if (linkErrored(family)) return 'failed'
    const rendered = canvasFontRendered(family, weight)
    if (rendered === true && !linkErrored(family)) return 'ok'

    // Negative or inconclusive evidence after the bounded wait is a truthful
    // fallback/error state, never permission to reveal the generic fallback.
    if (linkErrored(family)) return 'failed'
    return 'failed'
  } catch {
    // Unexpected API failures still require a positive rendering signal.
    try {
      if (!linkErrored(family) && document.fonts.check(spec)) return 'ok'
    } catch {}
    if (linkErrored(family)) return 'failed'
    const rendered = canvasFontRendered(family, weight)
    return rendered === true && !linkErrored(family) ? 'ok' : 'failed'
  }
}

// Which body categories earn a look under a heading of each category, and WHY.
// The reason is shown next to every suggestion — a pairing tool that can't say
// why it suggested something is a random-font button with extra steps.
const PAIRING_RULES = {
  serif: [
    ['sans-serif', 'A neutral sans under a serif headline is the classic editorial split — maximum contrast, zero competition.'],
    ['monospace', 'Mono body copy keeps a serif headline literary while signalling something technical underneath.'],
  ],
  'sans-serif': [
    ['serif', 'A serif body warms up a geometric headline and makes long-form reading easier.'],
    ['sans-serif', 'Same-genre pairing — lean on a clear weight and size jump to keep the hierarchy obvious.'],
  ],
  display: [
    ['sans-serif', 'Display faces carry the personality; a plain sans body keeps the page readable.'],
    ['serif', 'A restrained serif body gives an expressive display headline somewhere calm to land.'],
  ],
  handwriting: [
    ['sans-serif', 'Script headlines need a completely neutral body or the page starts shouting.'],
    ['serif', 'A quiet serif body steadies a handwritten headline without flattening it.'],
  ],
  monospace: [
    ['sans-serif', 'A humanist sans body offsets the fixed rhythm of a mono headline.'],
    ['serif', 'A serif body adds warmth beneath the mechanical feel of monospace.'],
  ],
}

// Rank body candidates for a heading face. Returns
// `[{ font, reason, score }]`, best first, so callers can show the suggestion
// AND its rationale. Scored on popularity (a well-known face is a safer body
// choice) plus variant richness (a body face needs weights to build hierarchy).
export async function suggestPairings(font, { limit = 6 } = {}) {
  const fonts = await getRawFonts()
  const rules = PAIRING_RULES[font?.category] || PAIRING_RULES['sans-serif']
  const reasonFor = Object.fromEntries(rules)
  const targets = rules.map(([cat]) => cat)

  const scored = fonts
    .filter(f => f.family !== font?.family && targets.includes(f.category))
    .map(f => ({
      font: f,
      reason: reasonFor[f.category],
      // Category order is a preference, not a hard filter — the first listed
      // target keeps a small edge so the canonical pairing leads the list.
      score: (1 / (f.popularity + 1)) + (f.variants.length / 20)
        + (f.category === targets[0] ? 0.05 : 0),
    }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

export function getFontImportUrl(families) {
  const params = families
    .map(({ family, weights = [400] }) => {
      const wStr = weights.sort((a, b) => a - b).join(';')
      return `family=${encodeURIComponent(family)}:wght@${wStr}`
    })
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

export function getFontCSSRule(family, fallback = 'sans-serif') {
  return `'${family}', ${fallback}`
}

// The generic family a Google category should degrade to. Shared so the gallery,
// the pairing tool and the type scale all fall back to the same shape of letter
// while a face is still in flight.
const GENERIC_FOR = {
  serif: 'serif',
  'sans-serif': 'sans-serif',
  display: 'cursive',
  handwriting: 'cursive',
  monospace: 'monospace',
}

/** Full CSS font stack for a catalog entry, e.g. `'Lora', serif`. */
export function fontStack(font) {
  if (!font?.family) return 'var(--font)'
  return getFontCSSRule(font.family, GENERIC_FOR[font.category] || 'sans-serif')
}

/** The weight a catalog entry should use for headings — 700 when it ships one. */
export function headingWeight(font) {
  if (!font?.variants?.length) return 700
  return font.variants.includes(700) ? 700 : font.variants[font.variants.length - 1]
}

/** The weight a catalog entry should use for body copy — 400 when it ships one. */
export function bodyWeight(font) {
  if (!font?.variants?.length) return 400
  return font.variants.includes(400) ? 400 : font.variants[0]
}
