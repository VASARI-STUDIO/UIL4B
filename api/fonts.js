// Google Fonts catalog proxy.
//
// The client-side WebFonts API requires an API key (VITE_GOOGLE_FONTS_API_KEY).
// When that key is missing or invalid, this endpoint supplies the catalog
// instead: it first tries the keyed WebFonts API with a server-side key, then
// falls back to fonts.google.com/metadata/fonts — which needs no key at all
// but blocks browser requests via CORS, so it must be fetched server-side.

const API_KEY =
  process.env.GOOGLE_FONTS_API_KEY ||
  process.env.VITE_GOOGLE_FONTS_API_KEY ||
  ''

// '100', 'regular', '700italic' → numeric weights, italics dropped.
function weightsFromVariants(variants) {
  return variants
    .map(v => {
      if (v === 'regular') return 400
      if (v.includes('italic')) return null
      const n = parseInt(v, 10)
      return Number.isFinite(n) ? n : null
    })
    .filter(w => w !== null)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .sort((a, b) => a - b)
}

async function fromWebfontsApi() {
  if (!API_KEY) return null
  const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`)
  if (!res.ok) return null
  const data = await res.json()
  const fonts = (data.items || []).map((item, i) => ({
    family: item.family,
    category: item.category,
    variants: weightsFromVariants(item.variants || []),
    subsets: item.subsets || ['latin'],
    popularity: i,
  })).filter(f => f.variants.length)
  return fonts.length ? fonts : null
}

async function fromMetadataEndpoint() {
  const res = await fetch('https://fonts.google.com/metadata/fonts')
  if (!res.ok) return null
  // Response is JSON prefixed with the anti-XSSI guard )]}'
  const text = await res.text()
  const json = JSON.parse(text.replace(/^\)\]\}'/, ''))
  const list = json.familyMetadataList || []
  list.sort((a, b) => (a.popularity || 1e9) - (b.popularity || 1e9))
  const fonts = list.map((f, i) => ({
    family: f.family,
    // Metadata uses 'Sans Serif'; the WebFonts API uses 'sans-serif'.
    category: (f.category || 'Sans Serif').toLowerCase().replace(/\s+/g, '-'),
    variants: Object.keys(f.fonts || {})
      .filter(v => !v.endsWith('i'))
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b),
    subsets: f.subsets || ['latin'],
    popularity: i,
  })).filter(f => f.variants.length)
  return fonts.length ? fonts : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let fonts = null
  try { fonts = await fromWebfontsApi() } catch {}
  if (!fonts) {
    try { fonts = await fromMetadataEndpoint() } catch {}
  }

  if (!fonts) {
    return res.status(502).json({ error: 'Unable to load font catalog' })
  }

  // Catalog changes rarely — let Vercel's edge cache serve it for a day.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).json({ fonts })
}
