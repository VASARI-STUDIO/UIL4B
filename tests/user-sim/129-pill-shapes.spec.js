// EVERY SEARCH BAR AND EVERY PILL TOOLBAR IS A FULL PILL, AT ONE SHARED HEIGHT.
//
// The shape is --radius-pill (999px), the token the buttons already use. This
// spec measures it on the rendered pages, which is what the stylesheet sweep in
// tests/unit/pill-shapes-source.test.js cannot do: a rule can name the token and
// still lose the cascade to a later one.
//
// "Full" means the computed radius is at least half the box height, so the end
// caps are semicircles. One carve-out is deliberate: a library toolbar that has
// wrapped onto a second row (a phone) steps down to a 26px pill-ended box,
// because a 999px capsule that tall would cut its corners into the search field
// and chips inset inside it. The palette and gradient bars always did this.
//
// Each route lists the selectors it must still have, so a renamed class fails
// the count instead of silently measuring nothing.
//
// Height: the library search field is one height on every page, and every
// bordered search carries the same 1px hairline.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Painted search bars and pill toolbars, by route.
const SURFACES = [
  ['/', ['.pnav-search-field', '.hcmd-bar', '.sp-seg', '.sp-seeds']],
  ['/discover/palettes', ['.pnav-search-field', '.lbry-search', '.lbry-toolbar']],
  ['/discover/gradients', ['.lbry-search', '.lbry-toolbar']],
  ['/discover/prompts', ['.lbry-search', '.lbry-toolbar']],
  ['/create/emoji', ['.lbry-search', '.lbry-toolbar', '.lib-switch-btn']],
  ['/create/icons', ['.lbry-search', '.lbry-toolbar', '.lib-switch-btn']],
  ['/create/font-gallery', ['.lbry-search']],
  ['/learn', ['.lbry-search']],
  ['/mobile', ['.spm-ic-search']],
  ['/create/contrast', ['.tl-pill']],
  ['/plans', ['.pr-billing']],
  ['/seo', ['.seo-seg']],
]

// The bordered search fields: one hairline treatment.
const SEARCH = new Set(['.pnav-search-field', '.hcmd-bar', '.lbry-search', '.spm-ic-search'])
// The toolbar that may step down when it wraps.
const WRAPS = '.lbry-toolbar'
const WRAPPED_RADIUS = 26

const measure = (els, selector) => els
  .filter((el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width >= 24 && r.height >= 16 && cs.display !== 'none' && cs.visibility !== 'hidden'
  })
  .map((el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    // A percentage radius (50%) resolves against the box, not the pixel value.
    const corner = (v) => (v.endsWith('%') ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v))
    return {
      selector,
      radius: Math.min(
        corner(cs.borderTopLeftRadius), corner(cs.borderTopRightRadius),
        corner(cs.borderBottomRightRadius), corner(cs.borderBottomLeftRadius),
      ),
      height: Math.round(r.height * 10) / 10,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
    }
  })

for (const width of [1440, 390]) {
  test(`${width}px: search bars and pill toolbars are full pills`, async ({ page }) => {
    test.setTimeout(120000)
    watch(page, 'someone looking at the search bars and toolbars')
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })

    const off = []
    const missing = []
    const searchHeights = new Map()
    const searchBorders = new Set()

    for (const [route, selectors] of SURFACES) {
      await go(page, route)
      for (const selector of selectors) {
        const found = await page.locator(selector).evaluateAll(measure, selector)
        if (!found.length) { missing.push(`${route} ${selector}`); continue }
        for (const f of found) {
          const need = selector === WRAPS && f.height > 80 ? WRAPPED_RADIUS : f.height / 2
          if (f.radius + 0.5 < need) off.push(`${route} ${selector}: radius ${f.radius}px on a ${f.height}px box (needs ${need}px)`)
          if (selector === '.lbry-search') searchHeights.set(route, f.height)
          if (SEARCH.has(selector)) searchBorders.add(f.border)
        }
      }
    }

    expect(missing, 'selectors that no longer match anything, so nothing was measured').toEqual([])
    expect(off, 'not a full pill').toEqual([])
    expect([...new Set(searchHeights.values())], `library search heights by route: ${JSON.stringify([...searchHeights])}`).toHaveLength(1)
    expect([...searchBorders], 'every bordered search carries the same hairline').toEqual(['1px solid'])
  })
}
