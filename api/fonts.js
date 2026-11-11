// Google Fonts catalog proxy.
//
// The client-side WebFonts API requires an API key (VITE_GOOGLE_FONTS_API_KEY).
// When that key is missing or invalid, this endpoint supplies the catalog
// instead: it first tries the keyed WebFonts API with a server-side key, then
// falls back to fonts.google.com/metadata/fonts — which needs no key at all
// but blocks browser requests via CORS, so it must be fetched server-side.

import { refuseUnexpectedQuery } from './_lib/http.js'
import {
  METADATA_URL,
  fontsFromMetadataList,
  fontsFromWebfontsItems,
  hasXssiGuard,
  parseMetadataText,
} from './_lib/fontCatalogue.js'

// The parsed catalogue, kept for an hour per warm instance. A CDN miss otherwise
// downloads and parses the whole Google catalogue again. Only a catalogue that
// was actually built is kept, so a failed fetch is retried on the next request.
// Once the hour is up the entry is dropped, never served stale: if the refresh
// then fails the request gets the same 502 an uncached one would.
//
// The WebFonts API answer is the thinner catalogue (no designers, dates or
// axes), which only appears while the metadata endpoint is failing. It is kept
// for five minutes, so the richer catalogue is back as soon as upstream is.
const CATALOGUE_TTL_MS = 60 * 60 * 1000
const THIN_CATALOGUE_TTL_MS = 5 * 60 * 1000
let catalogue = null
let catalogueAt = 0
let catalogueTtl = CATALOGUE_TTL_MS

const API_KEY =
  process.env.GOOGLE_FONTS_API_KEY ||
  process.env.VITE_GOOGLE_FONTS_API_KEY ||
  ''

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
  const fonts = fontsFromWebfontsItems(data.items)
  // A 200 that yields nothing usable is a shape change, not an outage, and it
  // would otherwise look identical to a network failure in the log.
  return fonts.length ? fonts : degraded('WebFonts API', `answered 200 with ${(data.items || []).length} items, none of which had usable variants`)
}

async function fromMetadataEndpoint() {
  const res = await fetch(METADATA_URL)
  if (!res.ok) return degraded('Google Fonts metadata', `HTTP ${res.status} ${res.statusText}`)
  // Response is JSON prefixed with the anti-XSSI guard )]}'
  const text = await res.text()
  // Reported separately from any other parse failure, because the guard
  // disappearing (or changing) is a specific, fixable upstream change and the
  // generic "Unexpected token" it would otherwise produce buries that.
  if (!hasXssiGuard(text)) {
    console.error('[api/fonts] Google Fonts metadata: the anti-XSSI guard did not match; '
      + `the body now starts ${JSON.stringify(text.slice(0, 24))}`)
  }
  const list = parseMetadataText(text).familyMetadataList || []
  const fonts = fontsFromMetadataList(list)
  return fonts.length ? fonts : degraded('Google Fonts metadata', `answered 200 with ${list.length} families, none of which had usable variants`)
}

// Fetches the catalogue from the upstream sources, or null when both fail.
async function loadCatalogue() {
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
  let ttl = CATALOGUE_TTL_MS
  if (!fonts) {
    ttl = THIN_CATALOGUE_TTL_MS
    try {
      fonts = await fromWebfontsApi()
    } catch (err) {
      console.error('[api/fonts] WebFonts API threw:', String(err?.message || err).slice(0, 300))
    }
  }
  return fonts ? { fonts, ttl } : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // The route reads no query keys. Each distinct query string is its own CDN
  // cache entry, so an unused key is a way to force a fresh upstream fetch.
  if (refuseUnexpectedQuery(req, res, [])) return

  const now = Date.now()
  let fonts = catalogue && now - catalogueAt < catalogueTtl ? catalogue : null
  if (!fonts) {
    const loaded = await loadCatalogue()
    fonts = loaded ? loaded.fonts : null
    if (loaded) {
      catalogue = loaded.fonts
      catalogueAt = now
      catalogueTtl = loaded.ttl
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
