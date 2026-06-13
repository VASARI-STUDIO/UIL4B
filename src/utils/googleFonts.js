import { FALLBACK_FONTS } from '../data/fallbackFonts'

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY || ''
const API_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
const CACHE_TTL = 24 * 60 * 60 * 1000
const LS_KEY = 'vs-gf-catalog'

let cache = null
let cacheTimestamp = 0

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
async function getRawFonts() {
  if (cache && Date.now() - cacheTimestamp < CACHE_TTL) return cache

  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (stored && Array.isArray(stored.fonts) && stored.fonts.length && Date.now() - stored.t < CACHE_TTL) {
      cache = stored.fonts
      cacheTimestamp = stored.t
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
    try { localStorage.setItem(LS_KEY, JSON.stringify({ t: cacheTimestamp, fonts })) } catch {}
    return cache
  }

  console.warn('Google Fonts catalog unavailable — using bundled fallback list')
  // Don't poison the long-lived cache with the fallback: keep it for 5 minutes
  // so a transient network failure recovers quickly.
  cache = FALLBACK_FONTS
  cacheTimestamp = Date.now() - CACHE_TTL + 5 * 60 * 1000
  return cache
}

export async function fetchFonts() {
  return getRawFonts()
}

export async function searchFonts(query = '', opts = {}) {
  const { category, sort = 'popularity', limit } = opts
  let fonts = await getRawFonts()

  if (query) {
    const q = query.toLowerCase()
    fonts = fonts.filter(f => f.family.toLowerCase().includes(q))
  }

  if (category) {
    const cat = category.toLowerCase()
    fonts = fonts.filter(f => f.category === cat)
  }

  if (sort === 'alphabetical') {
    fonts = [...fonts].sort((a, b) => a.family.localeCompare(b.family))
  } else if (sort === 'trending') {
    // Trending approximation: popular fonts with many variants suggest active maintenance
    fonts = [...fonts].sort((a, b) => {
      const scoreA = (1 / (a.popularity + 1)) * (a.variants.length / 10)
      const scoreB = (1 / (b.popularity + 1)) * (b.variants.length / 10)
      return scoreB - scoreA
    })
  }

  if (limit) fonts = fonts.slice(0, limit)
  return fonts
}

export async function getFontCategories() {
  const fonts = await getRawFonts()
  return [...new Set(fonts.map(f => f.category))]
}

const loadedFonts = new Map() // family -> { link, weights:Set<number> }

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
    existing.link.remove()
  }

  const all = existing ? [...existing.weights].sort((a, b) => a - b) : requested
  // CSS2 API wants the axis tag ONCE: family=Name:wght@400;700 — NOT
  // wght@400;wght@700 (which Google rejects, leaving the font unloaded).
  const weightStr = `wght@${all.join(';')}`
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${weightStr}&display=swap`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.dataset.fontFamily = family
  document.head.appendChild(link)
  loadedFonts.set(family, { link, weights: new Set(all) })
}

export function unloadFont(family) {
  const entry = loadedFonts.get(family)
  if (!entry) return
  entry.link.remove()
  loadedFonts.delete(family)
}

// Verify a font actually rendered rather than silently falling back to a system
// face. Uses the CSS Font Loading API: document.fonts.load() resolves with the
// matching FontFace objects once the file is fetched and parsed. A network
// failure or a content blocker that intercepts fonts.googleapis.com leaves the
// set empty, which is how we detect "this font could not load".
//
// Returns a Promise<boolean>: true if at least one face for the family loaded.
export async function verifyFontLoaded(family, weight = 400, { timeout = 6000 } = {}) {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
    // No Font Loading API — assume success and let the browser fall back.
    return true
  }
  const spec = `${weight} 16px "${family}"`
  try {
    const loadPromise = document.fonts.load(spec)
    const timed = new Promise(resolve => setTimeout(() => resolve(null), timeout))
    const faces = await Promise.race([loadPromise, timed])
    if (faces === null) {
      // Timed out — fall back to a synchronous check.
      return document.fonts.check(spec)
    }
    return Array.isArray(faces) ? faces.length > 0 : document.fonts.check(spec)
  } catch {
    return false
  }
}

const PAIRING_RULES = {
  serif: ['sans-serif'],
  'sans-serif': ['serif', 'display'],
  display: ['sans-serif'],
  handwriting: ['sans-serif', 'serif'],
  monospace: ['sans-serif']
}

export async function generatePairings(font) {
  const fonts = await getRawFonts()
  const targets = PAIRING_RULES[font.category] || ['sans-serif']

  const candidates = fonts.filter(
    f => f.family !== font.family && targets.includes(f.category)
  )

  // Score by popularity and variant richness for versatility
  const scored = candidates.map(f => ({
    font: f,
    score: (1 / (f.popularity + 1)) + (f.variants.length / 20)
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 6).map(s => s.font)
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
