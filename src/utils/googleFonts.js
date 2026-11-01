import { FALLBACK_FONTS } from '../data/fallbackFonts'
import { detectCanvasFontRendered } from './fontDetection'
import { rankPairings, headingWeight, bodyWeight } from './fontPairing'
import { buildFontImportUrl, familyAxis } from './fontImport'

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY || ''
const API_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
const CACHE_TTL = 24 * 60 * 60 * 1000
// A saved catalogue older than CACHE_TTL is refreshed in the background but
// still answers instantly, until it is this old.
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const LS_KEY = 'vs-gf-catalog'
const STATIC_CATALOGUE_URL = '/data/font-catalogue.json'
const API_PROXY_URL = '/api/fonts'
// How long one request may wait for its response headers, then for its body.
export const FONT_CATALOG_SOURCE_TIMEOUT_MS = 8000
export const FONT_CATALOG_BODY_TIMEOUT_MS = 15000
const FONT_CATALOG_RETRY_DELAY_MS = 1500

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
//   1. A fresh or stale localStorage copy. A stale one is served at once and
//      refreshed from /api/fonts in the background.
//   2. /data/font-catalogue.json: the same catalogue as a static, CDN-cached
//      file, so a cold serverless function can't decide the outcome. Once it
//      has answered, /api/fonts refreshes the cache in the background.
//   3. /api/fonts serverless proxy, with one automatic retry.
//   4. Google WebFonts API directly (needs VITE_GOOGLE_FONTS_API_KEY)
//   5. Bundled FALLBACK_FONTS so the font tools never render empty
// Successful fetches are cached in localStorage; a copy up to
// CACHE_MAX_AGE_MS old is still served rather than the bundled list.
function throwIfAborted(signal) {
  if (!signal?.aborted) return
  const error = new Error('Font catalogue request cancelled')
  error.name = 'AbortError'
  throw error
}

// Why a catalogue request failed. `kind` is what a console reader needs to
// tell the causes apart: timeout, status (non-2xx), blocked (the request never
// got an answer: a blocker, an offline browser or a refused connection),
// malformed (a body that isn't JSON) or empty (JSON with no families).
class CatalogueError extends Error {
  constructor(kind, detail, status = 0) {
    super(detail ? `${kind}: ${detail}` : kind)
    this.kind = kind
    // Worth a second try: a server error or a request that got no answer. A 404,
    // a body that is not JSON or an empty list will not change on its own, and a
    // timeout already cost a full wait.
    this.retryable = kind === 'blocked' || (kind === 'status' && status >= 500)
  }
}

// The timeout covers waiting for the response headers; the body gets its own,
// longer bound once headers are in. A slow first byte (a cold function) and a
// slow download are different problems and shouldn't share one short clock.
async function requestCatalogJson(url, { signal } = {}) {
  throwIfAborted(signal)
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  let expired = null
  const arm = (ms, phase) => setTimeout(() => { expired = `${phase} after ${ms} ms`; cancel() }, ms)
  let timer = arm(FONT_CATALOG_SOURCE_TIMEOUT_MS, 'no response')
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) throw new CatalogueError('status', `HTTP ${response.status}`, response.status)
    timer = arm(FONT_CATALOG_BODY_TIMEOUT_MS, 'body incomplete')
    return await response.json()
  } catch (err) {
    throwIfAborted(signal)
    if (err instanceof CatalogueError) throw err
    if (expired) throw new CatalogueError('timeout', expired)
    if (err?.name === 'SyntaxError') throw new CatalogueError('malformed', 'the body is not JSON')
    throw new CatalogueError('blocked', `the request got no answer (${err?.message || err?.name || 'unknown'})`)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}

function wait(ms, signal) {
  return new Promise(resolve => {
    const done = () => { clearTimeout(id); signal?.removeEventListener('abort', done); resolve() }
    const id = setTimeout(done, ms)
    signal?.addEventListener('abort', done, { once: true })
  })
}

// One catalogue endpoint, retried up to `retries` times after a retryable
// failure (and never after a caller-side abort). Resolves to `{ fonts }` or
// `{ failure }`; it doesn't log, because only the caller knows whether a
// failure matters.
async function fetchCatalogueFrom(url, { signal, retries = 0 } = {}) {
  let failure = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await wait(FONT_CATALOG_RETRY_DELAY_MS, signal)
      throwIfAborted(signal)
    }
    try {
      const data = await requestCatalogJson(url, { signal })
      if (Array.isArray(data?.fonts) && data.fonts.length) return { fonts: data.fonts }
      failure = new CatalogueError('empty', 'the answer had no font families')
    } catch (err) {
      throwIfAborted(signal)
      failure = err instanceof CatalogueError ? err : new CatalogueError('blocked', String(err?.message || err))
    }
    if (!failure.retryable) break
  }
  return { failure }
}

function readStoredCatalog() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (stored && Array.isArray(stored.fonts) && stored.fonts.length
      && Number.isFinite(stored.t) && Date.now() - stored.t < CACHE_MAX_AGE_MS) return stored
  } catch {}
  return null
}

function adoptCatalog(fonts, source) {
  cache = fonts
  cacheTimestamp = Date.now()
  cacheSource = source
  try { localStorage.setItem(LS_KEY, JSON.stringify({ t: cacheTimestamp, fonts })) } catch {}
}

// Only the metadata-backed catalogue carries designers and dates. The proxy
// answers with the thinner WebFonts list while Google's metadata endpoint is
// down, and that must not replace a richer copy already in hand.
const hasMetadata = fonts => Array.isArray(fonts?.[0]?.designers)

// Replaces the cached catalogue with the proxy's answer without touching what
// the tool on screen is already showing. Shared, so several tools mounting
// together make one request. A failure is only noted: a usable copy is in hand.
let refreshing = null
function refreshInBackground() {
  if (!refreshing) {
    refreshing = fetchCatalogueFrom(API_PROXY_URL, { retries: 1 })
      .then(({ fonts, failure }) => {
        if (fonts) {
          if (hasMetadata(fonts) || !hasMetadata(cache)) adoptCatalog(fonts, 'live')
        } else console.debug(`[font catalogue] background refresh from ${API_PROXY_URL} failed, keeping the copy in use: ${failure.message}`)
      })
      .catch(() => {})
      .finally(() => { refreshing = null })
  }
  return refreshing
}

async function getRawFonts({ force = false, signal } = {}) {
  throwIfAborted(signal)
  if (force) {
    // A retry must genuinely re-fetch: a cached copy would answer instantly and
    // make the Retry button look broken. The stored copy is kept, though, as the
    // answer of last resort before the bundled list.
    cache = null
    cacheTimestamp = 0
    cacheSource = 'fallback'
  }
  if (cache && Date.now() - cacheTimestamp < CACHE_TTL) return cache

  const stored = readStoredCatalog()
  if (stored && !force) {
    cache = stored.fonts
    cacheTimestamp = stored.t
    cacheSource = 'cache'
    // Stale-while-revalidate: past the TTL the copy still answers immediately.
    if (Date.now() - stored.t >= CACHE_TTL) refreshInBackground()
    return cache
  }

  const failures = []

  const fromStatic = await fetchCatalogueFrom(STATIC_CATALOGUE_URL, { signal })
  if (fromStatic.fonts) {
    adoptCatalog(fromStatic.fonts, 'live')
    refreshInBackground()
    return cache
  }
  failures.push(`${STATIC_CATALOGUE_URL} ${fromStatic.failure.message}`)

  const fromProxy = await fetchCatalogueFrom(API_PROXY_URL, { signal, retries: 1 })
  if (fromProxy.fonts) {
    adoptCatalog(fromProxy.fonts, 'live')
    return cache
  }
  failures.push(`${API_PROXY_URL} ${fromProxy.failure.message}`)

  if (API_KEY) {
    try {
      const data = await requestCatalogJson(API_URL, { signal })
      const items = (data?.items || []).map(transformFont)
      if (items.length) {
        adoptCatalog(items, 'live')
        return cache
      }
      failures.push('Google WebFonts API: the answer had no font families')
    } catch (err) {
      throwIfAborted(signal)
      failures.push(`Google WebFonts API ${err.message}`)
    }
  }

  if (stored) {
    console.warn(`[font catalogue] using the saved copy from ${new Date(stored.t).toISOString()}; ${failures.join('; ')}`)
    cache = stored.fonts
    cacheTimestamp = stored.t
    cacheSource = 'cache'
    return cache
  }

  console.warn(`[font catalogue] showing the bundled list of ${FALLBACK_FONTS.length} families; ${failures.join('; ')}`)
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
// whole of Google Fonts loaded. `force: true` drops the in-memory copy so the
// retry is a real network attempt. Never rejects: the bundled list is always a
// valid answer, and `source` is what tells the caller the difference.
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
function injectFontLink(family, weights, nonce, italics = []) {
  // CSS2 API wants the axis tag ONCE: family=Name:wght@400;700 — NOT
  // wght@400;wght@700 (which Google rejects, leaving the font unloaded).
  // Italic cuts switch it to ital,wght@0,400;1,400 (see fontImport.js).
  let url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${familyAxis(weights, italics)}&display=swap`
  if (nonce) url += `&_r=${nonce}`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.dataset.fontFamily = family

  const entry = { link, weights: new Set(weights), italics: new Set(italics), status: 'pending', ready: null }
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

export function loadFont(family, weights = [400], italics = []) {
  const requested = [...new Set(weights)]
    .filter(w => Number.isFinite(w))
    .sort((a, b) => a - b)
  if (!requested.length) requested.push(400)

  const existing = loadedFonts.get(family)
  if (existing) {
    // Already covers everything we need — nothing to do.
    if (requested.every(w => existing.weights.has(w)) && italics.every(w => existing.italics.has(w))) {
      return existing.ready.then(() => existing.status)
    }
    // Otherwise upgrade the link to the union of weights so previews aren't
    // forced to synthesise (faux-bold) a weight that was never downloaded.
    requested.forEach(w => existing.weights.add(w))
    italics.forEach(w => existing.italics.add(w))
    const all = [...existing.weights].sort((a, b) => a - b)
    const allItalics = [...existing.italics].sort((a, b) => a - b)
    existing.link.remove()
    const upgraded = injectFontLink(family, all, null, allItalics)
    return upgraded.ready.then(() => upgraded.status)
  }

  const entry = injectFontLink(family, requested, null, [...new Set(italics)].sort((a, b) => a - b))
  return entry.ready.then(() => entry.status)
}

// Force a fresh fetch of a family's stylesheet, bypassing the HTTP cache, and
// resolve once it settles. Backs the detail-modal Retry so a font that failed
// transiently — or after the user pauses a blocker — actually re-downloads.
export async function reloadFont(family) {
  const existing = loadedFonts.get(family)
  const weights = existing ? [...existing.weights].sort((a, b) => a - b) : [400]
  if (existing) existing.link.remove()
  const italics = existing ? [...existing.italics].sort((a, b) => a - b) : []
  const entry = injectFontLink(family, weights, Date.now(), italics)
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

export async function suggestPairings(font, { limit = 6 } = {}) {
  return rankPairings(await getRawFonts(), font, { limit })
}

// `families`: [{ family, weights?, italics? }]. Italic cuts are optional.
export function getFontImportUrl(families) {
  return buildFontImportUrl(families)
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

// The default heading and body weights live in fontPairing.js (pure, so the
// shuffle and swap rules can be tested); re-exported for the other tools.
export { headingWeight, bodyWeight }
