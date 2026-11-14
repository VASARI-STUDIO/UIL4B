// Where the library data comes from, decided once per process.
//
// In order:
//   'pro'       api/_lib/pro/library/*.js, fetched at build time from the
//               private data repository by scripts/fetch-pro-data.mjs.
//   'in-tree'   the copies beside this file, until they move out.
//   'fixtures'  fixtures.js, fake values built from the public stubs. Never in
//               production.
// If none is present the source is 'missing' and every list is empty; the
// endpoints answer 503 rather than serve nothing as if it were the library.
//
// Each import() names its file literally so Vercel's file tracer bundles every
// candidate that exists at build time. A source is skipped only when its own
// file is absent; any other error (a syntax error, a bad export) is thrown.
//
// No top-level await: the API imports this module on every cold start and
// awaits loadLibrary() inside a request.

const SOURCES = {
  pro: () => Promise.all([
    import('../pro/library/paletteGallery.js'),
    import('../pro/library/brandPalettes.js'),
    import('../pro/library/paletteLibrary.js'),
    import('../pro/library/gradientGallery.js'),
    import('../pro/library/communityPrompts.js'),
  ]),
  'in-tree': () => Promise.all([
    import('./paletteGallery.js'),
    import('./brandPalettes.js'),
    import('./paletteLibrary.js'),
    import('./gradientGallery.js'),
    import('./communityPrompts.js'),
  ]),
  fixtures: () => import('./fixtures.js').then((m) => [m, m, m, m, m]),
}

const isProduction = (env) => env.VERCEL_ENV === 'production'

function sourceOrder(env) {
  const order = ['pro', 'in-tree']
  if (!isProduction(env)) order.push('fixtures')
  // Tests may pin one source. Production ignores the override.
  const forced = env.UIL4B_LIBRARY_SOURCE
  if (forced && !isProduction(env)) {
    if (!order.includes(forced)) throw new Error(`UIL4B_LIBRARY_SOURCE: unknown source "${forced}"`)
    return [forced]
  }
  return order
}

const isMissingModule = (err) => err?.code === 'ERR_MODULE_NOT_FOUND' || err?.code === 'MODULE_NOT_FOUND'

function shape(source, [gallery, brands, library, gradients, prompts]) {
  const lib = {
    source,
    GALLERY_PALETTES: gallery.GALLERY_PALETTES,
    BRAND_PALETTES: brands.BRAND_PALETTES,
    CURATED_LIBRARY_PALETTES: library.CURATED_LIBRARY_PALETTES,
    BRAND_LIBRARY_PALETTES: library.BRAND_LIBRARY_PALETTES,
    LIBRARY_PALETTES: library.LIBRARY_PALETTES,
    GALLERY_GRADIENTS: gradients.GALLERY_GRADIENTS,
    COMMUNITY_PROMPTS: prompts.COMMUNITY_PROMPTS,
  }
  for (const [name, value] of Object.entries(lib)) {
    if (name !== 'source' && !Array.isArray(value)) throw new Error(`library source "${source}" has no ${name} array`)
  }
  lib.LIBRARIES = Object.freeze({
    palettes: lib.LIBRARY_PALETTES,
    gradients: lib.GALLERY_GRADIENTS,
    prompts: lib.COMMUNITY_PROMPTS,
  })
  return Object.freeze(lib)
}

const EMPTY = shape('missing', Array.from({ length: 5 }, () => ({
  GALLERY_PALETTES: [],
  BRAND_PALETTES: [],
  CURATED_LIBRARY_PALETTES: [],
  BRAND_LIBRARY_PALETTES: [],
  LIBRARY_PALETTES: [],
  GALLERY_GRADIENTS: [],
  COMMUNITY_PROMPTS: [],
})))

export async function resolveLibrary(env = process.env) {
  for (const source of sourceOrder(env)) {
    try {
      return shape(source, await SOURCES[source]())
    } catch (err) {
      if (!isMissingModule(err)) throw err
    }
  }
  return EMPTY
}

let pending = null

/** The library data for this process. Memoised; a failed load is retried. */
export function loadLibrary() {
  if (!pending) {
    pending = resolveLibrary().catch((err) => {
      pending = null
      throw err
    })
  }
  return pending
}
