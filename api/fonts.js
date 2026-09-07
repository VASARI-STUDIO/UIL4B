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

/* WHY THIS FILE LOGS AT ALL.
 *
 * Both catalogue sources used to degrade in silence: two `catch {}` bodies and
 * two bare `return null` on a non-ok response. When both failed, the only thing
 * that reached anyone was the 502 at the foot of the handler — "Unable to load
 * font catalog" — which does not say WHICH host refused, with WHAT status, or
 * whether the )]}' anti-XSSI guard simply stopped matching and the parse threw.
 * Every one of those has a different fix, and the function log distinguished
 * none of them.
 *
 * The pattern is not hypothetical here: an empty catch in the feedback queue
 * hid a permissions refusal for a week this month. The other empty catches
 * under api/ (ai.js, verify-admin.js, firebase-admin.js, get-prices.js) each
 * carry a comment saying why the failure is genuinely uninteresting. These two
 * did not, because nobody had decided — so they are given words rather than a
 * comment excusing them.
 *
 * Degrading is still correct: a dead metadata endpoint should fall through to
 * the WebFonts API, and a dead pair should give the client one clean 502. What
 * changes is that the fall-through is now audible. `console.error` is the
 * convention in api/ai.js and reaches the Vercel function log.
 */
const degraded = (source, reason) => {
  console.error(`[api/fonts] ${source} did not answer with a catalogue: ${reason}`)
  return null
}

async function fromWebfontsApi() {
  // Not a failure: this endpoint needs a key, and most deployments run without
  // one. Said out loud anyway, because "no catalogue" with no line in the log
  // is the state this whole comment exists to remove — and an operator reading
  // a 502 needs to know the fallback was never configured, not that it broke.
  if (!API_KEY) return degraded('WebFonts API', 'no GOOGLE_FONTS_API_KEY / VITE_GOOGLE_FONTS_API_KEY is set')
  const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`)
  // The key is never logged, only whether one existed. A 403 here is usually a
  // restricted or expired key and a 429 is quota, so the status is the whole
  // diagnosis.
  if (!res.ok) return degraded('WebFonts API', `HTTP ${res.status} ${res.statusText}`)
  const data = await res.json()
  const fonts = (data.items || []).map((item, i) => ({
    family: item.family,
    category: item.category,
    variants: weightsFromVariants(item.variants || []),
    subsets: item.subsets || ['latin'],
    popularity: i,
  })).filter(f => f.variants.length)
  // A 200 that yields nothing usable is a shape change, not an outage, and it
  // would otherwise look identical to a network failure in the log.
  return fonts.length ? fonts : degraded('WebFonts API', `answered 200 with ${(data.items || []).length} items, none of which had usable variants`)
}

async function fromMetadataEndpoint() {
  const res = await fetch('https://fonts.google.com/metadata/fonts')
  if (!res.ok) return degraded('Google Fonts metadata', `HTTP ${res.status} ${res.statusText}`)
  // Response is JSON prefixed with the anti-XSSI guard )]}'
  const text = await res.text()
  // Reported separately from any other parse failure, because the guard
  // disappearing (or changing) is a specific, fixable upstream change and the
  // generic "Unexpected token" it would otherwise produce buries that.
  if (!text.startsWith(')]}')) {
    console.error('[api/fonts] Google Fonts metadata: the anti-XSSI guard did not match; '
      + `the body now starts ${JSON.stringify(text.slice(0, 24))}`)
  }
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
  return fonts.length ? fonts : degraded('Google Fonts metadata', `answered 200 with ${list.length} families, none of which had usable variants`)
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
  //
  // THE TWO CATCHES BELOW USED TO BE EMPTY. Each source is still allowed to
  // fail — the whole point of having two is that either can — but a thrown
  // error now says which one threw and what it said. A rejected fetch, a DNS
  // failure and a JSON.parse on a changed response shape all arrive here, and
  // they had been indistinguishable from each other and from a clean 404.
  let fonts = null
  try {
    fonts = await fromMetadataEndpoint()
  } catch (err) {
    console.error('[api/fonts] Google Fonts metadata threw:', String(err?.message || err).slice(0, 300))
  }
  if (!fonts) {
    try {
      fonts = await fromWebfontsApi()
    } catch (err) {
      console.error('[api/fonts] WebFonts API threw:', String(err?.message || err).slice(0, 300))
    }
  }

  if (!fonts) {
    // Both sources are gone. Every line above says which and why; this one says
    // that the client is being told so, which is the fact the log was missing.
    console.error('[api/fonts] both catalogue sources failed — answering 502')
    return res.status(502).json({ error: 'Unable to load font catalog' })
  }

  // Catalog changes rarely — let Vercel's edge cache serve it for a day.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).json({ fonts })
}
