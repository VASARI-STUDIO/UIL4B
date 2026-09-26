// The selected fonts, as files, for the UI kit to embed.
//
// The kit has to open offline, so each selected family is fetched at export
// time and handed to the renderer as base64. Where the file comes from:
//
//   1. A family the app already serves from /fonts is read from our own origin,
//      with the licence file that sits beside it.
//   2. Anything else is a Google Fonts family. The css2 stylesheet names the
//      files (fonts.googleapis.com); the latin and latin-ext faces are fetched
//      from fonts.gstatic.com, and the licence text from the Google Fonts
//      source repository through cdn.jsdelivr.net.
//
// A family is embedded only with its licence: SIL OFL and Apache both require
// the notice to travel with the file. When either half cannot be fetched the
// family is left out, the kit states which fallback it is shown in, and the
// export still completes.
//
// `fetch` is injected so the whole path runs in unit tests without a network.

// Families served from /fonts, their weight axis, and their licence file.
export const SELF_HOSTED = Object.freeze({
  Geist: { axis: '300 700', files: [['geist-latin.woff2', 'latin'], ['geist-latin-ext.woff2', 'latin-ext']], license: 'GEIST-OFL.txt' },
  'Geist Mono': { axis: '300 600', files: [['geist-mono-latin.woff2', 'latin'], ['geist-mono-latin-ext.woff2', 'latin-ext']], license: 'GEIST-MONO-OFL.txt' },
  Caveat: { axis: '500', files: [['caveat-latin.woff2', 'latin'], ['caveat-latin-ext.woff2', 'latin-ext']], license: 'CAVEAT-OFL.txt' },
  'Schibsted Grotesk': { axis: '400 900', files: [['schibsted-grotesk-latin.woff2', 'latin']], license: 'SCHIBSTED-GROTESK-OFL.txt' },
  Literata: { axis: '200 900', files: [['literata-latin.woff2', 'latin']], license: 'LITERATA-OFL.txt' },
  'Martian Mono': { axis: '100 800', files: [['martian-mono-latin.woff2', 'latin']], license: 'MARTIAN-MONO-OFL.txt' },
  'Big Shoulders Display': { axis: '100 900', files: [['big-shoulders-display-latin.woff2', 'latin']], license: 'BIG-SHOULDERS-DISPLAY-OFL.txt' },
  'Hanken Grotesk': { axis: '100 900', files: [['hanken-grotesk-latin.woff2', 'latin']], license: 'HANKEN-GROTESK-OFL.txt' },
  'Instrument Sans': { axis: '400 700', files: [['instrument-sans-latin.woff2', 'latin']], license: 'INSTRUMENT-SANS-OFL.txt' },
})

export const SUBSET_RANGES = Object.freeze({
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
})

const KEEP_SUBSETS = new Set(['latin', 'latin-ext'])
const FILE_TIMEOUT_MS = 10000
const LICENSES = [
  ['ofl', 'OFL.txt', 'SIL Open Font License'],
  ['apache', 'LICENSE.txt', 'Apache License, Version 2.0'],
  ['ufl', 'UFL.txt', 'Ubuntu Font Licence'],
]

/** Only plain family names are ever put into a URL or a stylesheet. */
export const safeFamily = (family) => /^[A-Za-z0-9 ]{1,64}$/.test(String(family ?? '')) ? String(family) : null

/** The css2 URL for a family at the given weights (none: the family's default face). */
export function googleCssUrl(family, weights = []) {
  const name = encodeURIComponent(family).replace(/%20/g, '+')
  const axis = weights.length ? `:wght@${weights.join(';')}` : ''
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`
}

/** The Google Fonts source-repository directory name: lower case, no spaces. */
export const repoId = (family) => String(family).toLowerCase().replace(/[^a-z0-9]/g, '')

/** Where a Google family's licence text may live, in the order to try. */
export function licenseUrls(family) {
  const id = repoId(family)
  return LICENSES.map(([dir, file, name]) => ({ url: `https://cdn.jsdelivr.net/gh/google/fonts@main/${dir}/${id}/${file}`, name }))
}

/**
 * The latin and latin-ext faces of a css2 stylesheet. Google labels each
 * @font-face with its subset in a comment; other subsets are skipped, which
 * keeps the kit to the scripts its specimens use.
 * Returns [{ subset, weight, url, unicodeRange }].
 */
export function parseGoogleFontCss(css) {
  const faces = []
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/gi
  let m
  while ((m = re.exec(String(css ?? '')))) {
    const subset = m[1].toLowerCase()
    if (!KEEP_SUBSETS.has(subset)) continue
    const body = m[2]
    const url = /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)\s]+\.woff2)\)/.exec(body)?.[1]
    const weight = /font-weight:\s*(\d{3}(?:\s+\d{3})?)\s*;/.exec(body)?.[1]
    const style = /font-style:\s*(\w+)/.exec(body)?.[1] || 'normal'
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim()
    if (url && weight && style === 'normal') faces.push({ subset, weight, url, unicodeRange })
  }
  return faces
}

/** ArrayBuffer → base64, in chunks so a large font never overflows the call stack. */
export function bufferToBase64(buffer) {
  if (globalThis.Buffer) return globalThis.Buffer.from(buffer).toString('base64')
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function withTimeout(fetchImpl, signal) {
  return async (url) => {
    const controller = new AbortController()
    const stop = () => controller.abort()
    signal?.addEventListener('abort', stop, { once: true })
    const timer = setTimeout(stop, FILE_TIMEOUT_MS)
    try {
      const res = await fetchImpl(url, { signal: controller.signal })
      return res && res.ok ? res : null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', stop)
    }
  }
}

async function selfHosted(get, family) {
  const entry = SELF_HOSTED[family]
  const license = await get(`/fonts/${entry.license}`)
  const text = license ? await license.text() : ''
  if (!text) return null
  const faces = []
  for (const [file, subset] of entry.files) {
    const res = await get(`/fonts/${file}`)
    if (!res) return null
    faces.push({ base64: bufferToBase64(await res.arrayBuffer()), format: 'woff2', weight: entry.axis, unicodeRange: SUBSET_RANGES[subset] })
  }
  return { faces, license: { name: 'SIL Open Font License', text } }
}

async function google(get, family, weights, available) {
  // Asking css2 for a weight the family does not have fails the whole request,
  // so the list is narrowed to the catalogue's weights when it knows them.
  const known = Array.isArray(available) && available.length ? weights.filter((w) => available.includes(w)) : weights
  let css = null
  for (const ask of [known, []]) {
    const res = await get(googleCssUrl(family, ask))
    if (res) { css = await res.text(); break }
  }
  const parsed = parseGoogleFontCss(css)
  if (!parsed.length) return null

  let license = null
  for (const candidate of licenseUrls(family)) {
    const res = await get(candidate.url)
    const text = res ? await res.text() : ''
    if (text) { license = { name: candidate.name, text }; break }
  }
  if (!license) return null

  // A variable family answers every weight with the same file. Each file is
  // fetched and embedded once, declared across the weights it was served for.
  const byUrl = new Map()
  for (const face of parsed) {
    const seen = byUrl.get(face.url)
    const weights = face.weight.split(/\s+/).map(Number)
    if (seen) seen.weights.push(...weights)
    else byUrl.set(face.url, { ...face, weights })
  }
  const faces = []
  for (const face of byUrl.values()) {
    const res = await get(face.url)
    if (!res) return null
    const lo = Math.min(...face.weights)
    const hi = Math.max(...face.weights)
    faces.push({ base64: bufferToBase64(await res.arrayBuffer()), format: 'woff2', weight: lo === hi ? String(lo) : `${lo} ${hi}`, unicodeRange: face.unicodeRange })
  }
  return { faces, license }
}

/**
 * Fetch every requested family. Never rejects.
 * @param requests  [{ family, weights }] — kitFontRequests(design)
 * @param options   { fetch, signal, catalog: [{ family, variants }] }
 * @returns { [family]: { faces, license } } — only the families that embedded
 */
export async function loadKitFonts(requests, { fetch: fetchImpl = globalThis.fetch, signal, catalog = [] } = {}) {
  const get = withTimeout(fetchImpl, signal)
  const out = {}
  await Promise.all((requests || []).map(async ({ family, weights }) => {
    const name = safeFamily(family)
    if (!name) return
    try {
      const got = SELF_HOSTED[name]
        ? await selfHosted(get, name)
        : await google(get, name, weights || [], catalog.find((f) => f.family === name)?.variants)
      if (got) out[name] = got
    } catch { /* a family that cannot be fetched is shown in its fallback */ }
  }))
  return out
}

/** The publisher's own faces, Geist and Geist Mono, from our origin. */
export async function loadPublisherFonts({ fetch: fetchImpl = globalThis.fetch, signal } = {}) {
  const get = withTimeout(fetchImpl, signal)
  const fonts = []
  for (const family of ['Geist', 'Geist Mono']) {
    const entry = SELF_HOSTED[family]
    const faces = []
    for (const [file, subset] of entry.files) {
      const res = await get(`/fonts/${file}`)
      if (res) faces.push({ subset, base64: bufferToBase64(await res.arrayBuffer()) })
    }
    fonts.push({ family, axis: entry.axis, faces })
  }
  const texts = []
  for (const family of ['Geist', 'Geist Mono']) {
    const res = await get(`/fonts/${SELF_HOSTED[family].license}`)
    if (res) texts.push(await res.text())
  }
  return { publisherFonts: fonts, publisherLicense: texts.join('\n') }
}
