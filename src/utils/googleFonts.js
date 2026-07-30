import { FALLBACK_FONTS } from '../data/fallbackFonts'

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY || ''
const API_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
const CACHE_TTL = 24 * 60 * 60 * 1000
const LS_KEY = 'vs-gf-catalog'

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
    popularity: index
  }
}

// Catalog sources, in order of preference:
//   1. Google WebFonts API directly (needs VITE_GOOGLE_FONTS_API_KEY)
//   2. /api/fonts serverless proxy (works without any client key)
//   3. Bundled FALLBACK_FONTS so the font tools never render empty
// Successful fetches are cached in localStorage for a day.
async function getRawFonts({ force = false } = {}) {
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
      const res = await fetch(API_URL)
      if (res.ok) {
        const data = await res.json()
        const items = (data.items || []).map(transformFont)
        if (items.length) fonts = items
      }
    } catch {}
  }

  if (!fonts) {
    try {
      const res = await fetch('/api/fonts')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.fonts) && data.fonts.length) fonts = data.fonts
      }
    } catch {}
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
export async function fetchFontCatalog({ force = false } = {}) {
  try {
    const fonts = await getRawFonts({ force })
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
// hasn't arrived yet". A real `error` is the ONLY reliable "actually failed" signal.
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
    if (requested.every(w => existing.weights.has(w))) return
    // Otherwise upgrade the link to the union of weights so previews aren't
    // forced to synthesise (faux-bold) a weight that was never downloaded.
    requested.forEach(w => existing.weights.add(w))
    const all = [...existing.weights].sort((a, b) => a - b)
    existing.link.remove()
    injectFontLink(family, all, null)
    return
  }

  injectFontLink(family, requested, null)
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

// Canvas text-width comparison — the authoritative FOUT/font-load detection
// technique. Measures a probe string in the TARGET family ALONE against each
// generic baseline measured separately. If the target's width differs from a
// baseline, the web font is genuinely rendering; if it matches every generic
// baseline, the face never loaded. Measuring the family alone (not a
// "family, generic" list) matters: Canvas `ctx.font` is the CSS `font`
// shorthand, which rejects a multi-family value outright — so a list value
// silently keeps the previous font and makes the measurement meaningless.
const FONT_PROBE = 'mmmmmwwwwwlli0O'
const GENERIC_BASELINES = ['monospace', 'serif', 'sans-serif']

function canvasFontRendered(family, weight) {
  if (typeof document === 'undefined' || !document.createElement) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext && canvas.getContext('2d')
  if (!ctx) return null // No 2D context — can't measure; let caller decide.
  const size = '72px'

  // Width of the target family rendered on its own. If the assignment is
  // rejected (e.g. an exotic family name), ctx.font won't reflect it; the
  // baseline comparison below still holds because a non-applied family falls
  // back to whatever ctx.font was, which won't match all three generics.
  ctx.font = `${weight} ${size} "${family}"`
  const familyWidth = ctx.measureText(FONT_PROBE).width

  for (const generic of GENERIC_BASELINES) {
    ctx.font = `${weight} ${size} ${generic}`
    const baselineWidth = ctx.measureText(FONT_PROBE).width
    // A meaningful difference (>0.5px guards sub-pixel rounding) against ANY
    // baseline means the target family is the one being painted.
    if (Math.abs(familyWidth - baselineWidth) > 0.5) return true
  }
  // Identical to every generic baseline → the web font did not load.
  return false
}

// Verify a font actually rendered rather than silently falling back to a system
// face. Returns a Promise resolving to one of:
//   'ok'      — the family is rendering (or the environment can't tell us
//               otherwise: no Font Loading API, no canvas, an unexpected error).
//   'failed'  — the css2 <link> fired a genuine `error` (network failure or a
//               content/privacy blocker intercepting fonts.googleapis.com). The
//               ONLY status that should ever surface a "blocked" message.
//   'unknown' — the face isn't measurable yet but nothing actually errored
//               (slow network / first paint). Caller should show a neutral
//               "still loading" state, NEVER accuse a blocker.
//
// Detection is event-driven (it leans on the <link>'s load/error events via
// loadedFonts) and ALWAYS awaits document.fonts.ready before any negative
// verdict — including the timeout branch — so a slow-but-successful load is
// never mistaken for a failure. Verify at the REQUESTED base weight (default
// 400), not a heading weight: document.fonts.check('700 …') is false for a
// synthesised bold even when the regular face loaded fine.
export async function verifyFontLoaded(family, weight = 400, { timeout = 6000 } = {}) {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
    // No Font Loading API — assume success and let the browser fall back.
    return 'ok'
  }
  const spec = `${weight} 16px "${family}"`
  try {
    // Kick off the load, then race it against a timeout so we never hang.
    const loadPromise = document.fonts.load(spec).catch(() => null)
    const timed = new Promise(resolve => setTimeout(() => resolve('timeout'), timeout))
    const result = await Promise.race([loadPromise, timed])

    // Positive signals are trusted immediately — don't fall through to negate.
    if (Array.isArray(result) && result.length > 0) return 'ok'
    if (document.fonts.check(spec)) return 'ok'

    // Always let pending faces settle before any negative verdict — this is the
    // core race fix and runs for BOTH the resolved-empty and 'timeout' branches.
    if (document.fonts.ready) {
      await Promise.race([
        document.fonts.ready.catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 500)),
      ])
      if (document.fonts.check(spec)) return 'ok'
    }

    // Confident positive from canvas → rendering.
    const rendered = canvasFontRendered(family, weight)
    if (rendered === true) return 'ok'

    // Negative or unknowable. Only call it a failure if the <link> ACTUALLY
    // errored (a real block); otherwise it's just not here yet → 'unknown'.
    if (linkErrored(family)) return 'failed'
    return rendered === false ? 'unknown' : 'ok'
  } catch {
    // On any unexpected error, bias away from accusing a blocker.
    if (document.fonts.check(spec)) return 'ok'
    return linkErrored(family) ? 'failed' : 'ok'
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
