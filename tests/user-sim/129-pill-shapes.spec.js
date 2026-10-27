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
// The emoji and icon libraries mount their search and toolbar only after their
// data has loaded (the emoji index, the icon registry), which is after go()
// has seen the route arrive. So each selector is waited for, by presence, up to
// a limit before it is counted: a slow load is waited out, a renamed class is
// still reported as missing once the limit passes.
//
// Height, hairline and fill: every search bar is --search-h (44px) tall on
// every page, carries the same 1px hairline in the same colour, and the same
// fill. The header search collapses to a 36px icon button below 1100px, which is
// measured as a circle (36 by 36) and must still wear the same hairline and
// fill. The home command bar is the one hero exception: it shares the 1px
// hairline but not the height or the colour.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Painted search bars and pill toolbars, by route. The home page is the one
// route that carries no PillNav (it has its own command bar), so the nav's
// search field is measured on the library pages, which all mount it.
const SURFACES = [
  ['/', ['.hcmd-bar', '.sp-seg', '.sp-seeds']],
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

// The bordered search fields: one hairline width and style.
const SEARCH = new Set(['.pnav-search-field', '.hcmd-bar', '.lbry-search', '.spm-ic-search'])
// The search bars proper: one height, one border colour, one fill. .hcmd-bar is
// the hero input and is left out on purpose.
const FAMILY = new Set(['.pnav-search-field', '.lbry-search', '.spm-ic-search'])
const SEARCH_H = 44
const CIRCLE = 36
// The toolbar that may step down when it wraps.
const WRAPS = '.lbry-toolbar'
const WRAPPED_RADIUS = 26
// The home bench's harmony segment once it is a 2 x 2 grid (see spectrum.css, .sp-harm at 480).
const WRAPPED_SEG_RADIUS = 24
// How long a surface may take to mount after its route has arrived.
const APPEAR_MS = 15000

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
      width: Math.round(r.width * 10) / 10,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
      borderColor: cs.borderTopColor,
      fill: cs.backgroundColor,
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
    const circles = []
    const searchBorders = new Set()
    const familyColours = new Map()
    const familyFills = new Map()

    for (const [route, selectors] of SURFACES) {
      await go(page, route)
      for (const selector of selectors) {
        await page.locator(selector).first().waitFor({ state: 'attached', timeout: APPEAR_MS }).catch(() => {})
        const found = await page.locator(selector).evaluateAll(measure, selector)
        if (!found.length) { missing.push(`${route} ${selector}`); continue }
        for (const f of found) {
          // Two carve-outs, each a segment that has wrapped into rows: a library toolbar
          // (26px) and the home bench's harmony segment, which is a 2 x 2 grid at 480
          // and below (24px, 96px tall: two 44px rows). A one-row .sp-seg is still a
          // full pill, so it is only excused when it is tall enough to be two rows.
          const need = selector === WRAPS && f.height > 80 ? WRAPPED_RADIUS
            : selector === '.sp-seg' && f.height > 80 ? WRAPPED_SEG_RADIUS
              : f.height / 2
          if (f.radius + 0.5 < need) off.push(`${route} ${selector}: radius ${f.radius}px on a ${f.height}px box (needs ${need}px)`)
          if (SEARCH.has(selector)) searchBorders.add(f.border)
          if (FAMILY.has(selector)) {
            // A header search narrower than it is tall is the collapsed icon button.
            if (selector === '.pnav-search-field' && f.width <= f.height + 1) circles.push(`${route}: ${f.width}x${f.height}`)
            else searchHeights.set(`${route} ${selector}`, f.height)
            familyColours.set(`${route} ${selector}`, f.borderColor)
            familyFills.set(`${route} ${selector}`, f.fill)
          }
        }
      }
    }

    expect(missing, 'selectors that no longer match anything, so nothing was measured').toEqual([])
    expect(off, 'not a full pill').toEqual([])
    expect([...new Set(searchHeights.values())], `search heights by route and selector: ${JSON.stringify([...searchHeights])}`).toEqual([SEARCH_H])
    expect(circles.filter((c) => c.split(': ')[1] !== `${CIRCLE}x${CIRCLE}`), 'the collapsed header search is a 36px circle').toEqual([])
    expect([...searchBorders], 'every bordered search carries the same hairline').toEqual(['1px solid'])
    expect([...new Set(familyColours.values())], `search border colours: ${JSON.stringify([...familyColours])}`).toHaveLength(1)
    expect([...new Set(familyFills.values())], `search fills: ${JSON.stringify([...familyFills])}`).toHaveLength(1)
  })
}
