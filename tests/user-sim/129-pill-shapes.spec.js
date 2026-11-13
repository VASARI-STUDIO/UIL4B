// EVERY SEARCH BAR AND EVERY PILL TOOLBAR IS A FULL PILL, AT ONE SHARED HEIGHT.
//
// The shape is --radius-pill (999px), the token the buttons already use. This
// spec measures it on the rendered pages, which is what the stylesheet sweep in
// tests/unit/pill-shapes-source.test.js cannot do: a rule can name the token and
// still lose the cascade to a later one.
//
// "Full" means the computed radius is at least half the box height, so the end
// caps are semicircles. Two carve-outs are deliberate. A library toolbar that has
// wrapped onto a second row (a phone) steps down to a 24px-radius raised card,
// because a 999px capsule that tall would cut its corners into the search field
// and chips inset inside it (library-v3.css, the 640px phone tray). And the V3
// Learn index draws its search as a 12px-radius plate with an inset hairline, not
// a pill (surface.css, .srf .lidx-tools .lbry-search); that one is held to 12px
// and 44px high here, and is left out of the border, colour and fill match.
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
// fill. The header search is the exception: a borderless 36px pill at 1440 that
// collapses to a 44px circle (44 by 44) on the phone header. The home command bar is the one hero exception: it shares the 1px
// hairline but not the height or the colour.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// Painted search bars and pill toolbars, by route. The home page is the one
// route that carries no PillNav (it has its own command bar), so the nav's
// search field is measured on the library pages, which all mount it.
const SURFACES = [
  ['/', ['.hcmd-bar']],
  ['/discover/palettes', ['.pnav-search-field', '.lbry-search', '.lbry-toolbar']],
  ['/discover/gradients', ['.lbry-search', '.lbry-toolbar']],
  ['/create/emoji', ['.lbry-search', '.lbry-toolbar', '.lib-switch-btn']],
  ['/create/icons', ['.lbry-search', '.lbry-toolbar', '.lib-switch-btn']],
  ['/create/font-gallery', ['.lbry-search']],
  ['/learn', ['.lbry-search']],
  ['/create/contrast', ['.tl-pill']],
  ['/plans', ['.pl-switch']],
  ['/seo', ['.seo-seg']],
]

// The bordered search fields: one hairline width and style.
const SEARCH = new Set(['.hcmd-bar', '.lbry-search', '.pl-search input'])
// The search bars proper: one height, one border colour, one fill. .hcmd-bar is
// the hero input and is left out on purpose. The V3 header search
// (.pnav-search-field) is left out too: it is a borderless L2 pill, 36px at 1440
// and a 44px circle on the phone header, measured on its own below.
const FAMILY = new Set(['.lbry-search', '.pl-search input'])
const HEADER_SEARCH = '.pnav-search-field'
const HEADER_SEARCH_H = 36
const SEARCH_H = 44
// A search that sits ON a tool toolbar (the Font Gallery's, at 1440) is one of the
// toolbar's controls, so it takes the toolbar control height, not the page search's.
const TOOLBAR_SEARCH_H = 36
const CIRCLE = 44
// The toolbar that may step down when it wraps.
const WRAPS = '.lbry-toolbar'
const WRAPPED_RADIUS = 24
// The Learn index search: a plate, not a pill.
const PLATE_ROUTE = '/learn'
const PLATE_RADIUS = 12
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
      inToolbar: !!el.closest('[data-tool-toolbar]'),
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
    const toolbarSearchHeights = new Map()
    const circles = []
    const headerHeights = new Set()
    const headerBorders = new Set()
    const searchBorders = new Set()
    const familyColours = new Map()
    const familyFills = new Map()

    for (const [route, listed] of SURFACES) {
      // The marketing bar's search is a pill from 768px and a round icon button below; the other is not drawn.
      const selectors = route === '/' ? [...listed, width >= 768 ? '.spnav-search' : '.spnav-icon'] : listed
      await go(page, route)
      for (const selector of selectors) {
        await page.locator(selector).first().waitFor({ state: 'attached', timeout: APPEAR_MS }).catch(() => {})
        const found = await page.locator(selector).evaluateAll(measure, selector)
        if (!found.length) { missing.push(`${route} ${selector}`); continue }
        for (const f of found) {
          // One carve-out: a library toolbar that has wrapped onto a second row steps down to a 26px pill-ended box.
          const plate = route === PLATE_ROUTE && selector === '.lbry-search'
          const need = plate ? PLATE_RADIUS : selector === WRAPS && f.height > 80 ? WRAPPED_RADIUS : f.height / 2
          if (f.radius + 0.5 < need || (plate && f.radius - 0.5 > need)) off.push(`${route} ${selector}: radius ${f.radius}px on a ${f.height}px box (needs ${need}px)`)
          if (plate) { searchHeights.set(`${route} ${selector}`, f.height); continue }
          if (SEARCH.has(selector)) searchBorders.add(f.border)
          if (selector === HEADER_SEARCH) {
            // A header search narrower than it is tall is the collapsed icon button.
            if (f.width <= f.height + 1) circles.push(`${route}: ${f.width}x${f.height}`)
            else headerHeights.add(f.height)
            headerBorders.add(f.border)
          }
          if (FAMILY.has(selector)) {
            if (f.inToolbar) toolbarSearchHeights.set(`${route} ${selector}`, f.height)
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
    // POSITIVE CONTROL for the carve-out: only the gallery at 1440 may use it, and at 36px.
    expect([...toolbarSearchHeights], 'searches that sit on a tool toolbar')
      .toEqual(width === 1440 ? [['/create/font-gallery .lbry-search', TOOLBAR_SEARCH_H]] : [])
    expect(circles.filter((c) => c.split(': ')[1] !== `${CIRCLE}x${CIRCLE}`), 'the collapsed header search is a 44px circle').toEqual([])
    // The header search: a 36px pill at 1440 (collapsed to the 44px circle at 390), no border.
    expect([...headerHeights], 'the open header search height').toEqual(width === 1440 ? [HEADER_SEARCH_H] : [])
    expect(circles.length > 0, 'the header search is the circle exactly when the page is the phone width').toBe(width === 390)
    expect([...headerBorders], 'the header search wears no hairline').toEqual(['0px none'])
    expect([...searchBorders], 'every bordered search carries the same hairline').toEqual(['1px solid'])
    expect([...new Set(familyColours.values())], `search border colours: ${JSON.stringify([...familyColours])}`).toHaveLength(1)
    expect([...new Set(familyFills.values())], `search fills: ${JSON.stringify([...familyFills])}`).toHaveLength(1)
  })
}
