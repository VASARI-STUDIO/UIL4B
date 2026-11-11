// Keeps the static font catalogue out of the acceptance suite by default.
//
// The font tools load /data/font-catalogue.json first and /api/fonts second
// (src/utils/googleFonts.js). `vite preview` serves the real 1,900-family file,
// so without this every spec that mocks /api/fonts, or that relies on the
// 84-family bundled list, would silently get the full catalogue instead.
//
// Installed on every browser context by tests/user-sim/base.js, as a 200 with
// `{"fonts":[]}`. The loader (fetchCatalogueFrom) counts an empty list as a miss
// and goes straight on to /api/fonts, and nothing is logged to the console. A
// 404 did the same job but made Chromium print "Failed to load resource: 404"
// on every font page, which the feedback loop reported as an ERROR finding for
// each persona. A page route takes precedence over a context route, so a spec
// that wants the static file (or wants it to fail) calls
// `page.route('**/data/font-catalogue.json', ...)` itself.
export const FONT_CATALOGUE_STATIC_GLOB = '**/data/font-catalogue.json'

export async function stubFontCatalogueStatic(context) {
  await context.route(FONT_CATALOGUE_STATIC_GLOB, (route) => route.fulfill({
    json: { fonts: [] },
  }))
  return context
}
