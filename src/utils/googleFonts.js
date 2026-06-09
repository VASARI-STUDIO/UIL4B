const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY || ''
const API_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
const CACHE_TTL = 60 * 60 * 1000

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

async function getRawFonts() {
  if (cache && Date.now() - cacheTimestamp < CACHE_TTL) return cache
  if (!API_KEY) {
    console.warn('Google Fonts API key missing — set VITE_GOOGLE_FONTS_API_KEY')
    return cache || []
  }
  try {
    const res = await fetch(API_URL)
    if (!res.ok) return cache || []
    const data = await res.json()
    cache = (data.items || []).map(transformFont)
    cacheTimestamp = Date.now()
    return cache
  } catch {
    return cache || []
  }
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
