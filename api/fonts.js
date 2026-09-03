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
  const fonts = list.map((f, i) => {
    const cuts = Object.keys(f.fonts || {})
    return {
      family: f.family,
      // Metadata uses 'Sans Serif'; the WebFonts API uses 'sans-serif'.
      category: (f.category || 'Sans Serif').toLowerCase().replace(/\s+/g, '-'),
      variants: cuts
        .filter(v => !v.endsWith('i'))
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b),
      subsets: f.subsets || ['latin'],
      popularity: i,
      // ── The About-tab fields ──────────────────────────────────────────────
      // Everything below is carried STRAIGHT THROUGH from Google's own family
      // metadata. None of it is inferred, and none of it is written by us: the
      // About tab states facts about a typeface, so every one of them has to be
      // traceable to a source, or it does not get shown at all.
      //
      // `dateAdded` is the day the family landed ON GOOGLE FONTS. It is NOT the
      // year the typeface was designed or released, and the two differ by
      // decades for any revival. The UI labels it as what it is for that reason.
      designers: Array.isArray(f.designers) ? f.designers.filter(Boolean) : [],
      dateAdded: typeof f.dateAdded === 'string' ? f.dateAdded : '',
      // Italic availability is otherwise lost: the weight list drops the 'i'
      // cuts, so a family that ships twelve italics looked identical to one
      // that ships none.
      italics: cuts.some(v => v.endsWith('i')),
      // Axis TAGS only. The ranges are real too, but "wght 100–900" is a
      // control the tools do not offer, and printing a range you cannot use is
      // a spec sheet rather than an answer.
      axes: (f.axes || []).map(a => a && a.tag).filter(Boolean),
      openSource: f.isOpenSource === true,
      // ── The two fields the Examples tab picks its scenes from ─────────────
      //
      // Both were being dropped, and dropping them is why every family got the
      // same four examples. `category` — the only descriptor that survived —
      // CANNOT do this job on its own:
      //
      //   `classifications` disagrees with `category` for 351 families. Playfair
      //   Display is category "Serif" with classifications ["Display"], and so
      //   are Anton, Bebas Neue, Archivo Black and DM Serif Display. It is also
      //   the ONLY field that identifies the 22 SYMBOL families (Libre Barcode,
      //   Noto Music, Yarndings), where setting a paragraph is not a weak
      //   example, it is nonsense.
      //
      //   `stroke` recovers Slab Serif, a distinction `category` erases by
      //   folding it into Serif.
      //
      // Carried straight through and NEVER defaulted: an absent field must stay
      // absent so src/utils/fontScenes.js can tell "this family is not a
      // display face" apart from "this catalogue does not say", and degrade to
      // `category` on the second. Guessing a value here would make the degraded
      // path invisible at exactly the point it matters.
      classifications: Array.isArray(f.classifications) ? f.classifications.filter(Boolean) : [],
      stroke: typeof f.stroke === 'string' ? f.stroke : '',
    }
  }).filter(f => f.variants.length)
  return fonts.length ? fonts : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // METADATA FIRST, WebFonts second. This order is the reverse of what shipped,
  // and the reason is data rather than reliability: the WebFonts API answers
  // with family/category/variants/subsets and nothing else, while the metadata
  // endpoint answers with all of that PLUS the designer, the date the family
  // was added, its italic cuts and its variable axes — the entire factual basis
  // of the About tab. Preferring the keyed API meant that on any deployment
  // with GOOGLE_FONTS_API_KEY set, About would have had nothing to show.
  //
  // The metadata endpoint also needs no key at all, so this is the path more
  // deployments can actually use. It stays behind the server because it sends
  // no CORS headers, and it is parsed defensively (the )]}' guard, and a
  // `variants.length` filter) — if its shape ever changes, the WebFonts API
  // below still answers and the tools degrade to the thinner catalogue rather
  // than to nothing.
  let fonts = null
  try { fonts = await fromMetadataEndpoint() } catch {}
  if (!fonts) {
    try { fonts = await fromWebfontsApi() } catch {}
  }

  if (!fonts) {
    return res.status(502).json({ error: 'Unable to load font catalog' })
  }

  // Catalog changes rarely — let Vercel's edge cache serve it for a day.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).json({ fonts })
}
