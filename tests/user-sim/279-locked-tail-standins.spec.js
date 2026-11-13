// SPEC 279: WHAT A FREE ACCOUNT SEES PAST ITS OPEN CARDS IS NEUTRAL, NEVER A PREVIEW OF A PRO ROW.
//
// History: this spec used to pin "each locked card shows its own soft preview"
// (blurred build-time images under /locked-previews/). The shared end gate
// (components/library/GalleryEndGate, drawn for these two libraries by
// components/library/LibraryGate) replaced the three locked cards on both
// libraries on purpose, and #989 made the rule stricter: a Pro item's picture or
// values never reach the page, blurred or not. The tail is now the gate over two
// faded rows of the gallery's own locked tiles (`.vpt--locked`, from
// VerticalPanelTile), drawn from stubs through standinFromStub (utils/gateStandins):
// they share one fixed grey ramp and carry nothing of any real row's colours.
//
// Changed with the V3 tiles: a faded tile now prints the withheld row's own NAME
// (its stub carries `id`, `name` and a size, and a name is already public: it is
// in the search, see utils/galleryCounts.js), where the old cards printed only
// the generic noun. So the name test asks that every name be a real library name
// (nothing invented, nothing from a Pro row's colours) and the colour and text
// tests carry the "no Pro value" rule: ramp colours only, no hex in the text.
//
// What it pins, for a free account on the Palette and Gradient Libraries, at 390
// and 1440:
//   - no locked tile among the open results, and no /locked-previews/ picture is
//     on the page or asked for;
//   - the Pro gate is there (data-gate="free"), and its heading counts the withheld
//     rows from the data ("N more palettes with Pro");
//   - the faded tiles are inert and hidden from assistive tech, offer no button or
//     link, and are coloured only from the stand-in ramp (a fixed list, written
//     out below, not read back from gateStandins.js).
//
// MUTATIONS (each should turn a test here red):
//   - make `standinFromStub` in utils/gateStandins.js return a real row's colours
//     (or any colour outside the ramp): the colour test fails on that library;
//   - render a made-up name or a Pro row's hex in the faded tiles: the name and
//     "no hex text" assertions fail;
//   - draw open tiles for locked rows in the results (`locked` off in the page's
//     grid): the "no locked tile" test fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const RAMP = ['#e4e4e7', '#c9c9ce', '#a1a1aa', '#7b7b84', '#5b5b64', '#3f3f46', '#2a2a30']

// The open tiles of the results; the fade sits outside `.lib-results`.
const OPEN = '.lib-results .vpt'

const LIBRARIES = [
  {
    name: 'Palette Library', route: '/discover/palettes', plural: 'palettes', total: LIBRARY_PALETTES.length,
    names: new Set(LIBRARY_PALETTES.map((p) => p.name)),
  },
  {
    name: 'Gradient Library', route: '/discover/gradients', plural: 'gradients', total: GALLERY_GRADIENTS.length,
    names: new Set(GALLERY_GRADIENTS.map((g) => g.name)),
  },
]

/** Every colour written in a piece of markup, as lower-case #rrggbb. */
function coloursIn(html) {
  const out = new Set()
  for (const h of html.match(/#[0-9a-f]{6}\b/gi) || []) out.add(h.toLowerCase())
  for (const m of html.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) {
    out.add(`#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`)
  }
  return [...out]
}

for (const [width, touch] of [[390, true], [1440, false]]) {
  test.describe(`The locked tail at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch })

    for (const lib of LIBRARIES) {
      test(`${lib.name}: no locked card or preview picture, and the Pro gate counts what is withheld`, async ({ page }) => {
        watch(page, `a free designer at the end of the ${lib.name} at ${width}px`)
        const urls = []
        page.on('request', (req) => urls.push(new URL(req.url()).pathname))
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        await expect(page.locator(OPEN)).toHaveCount(GALLERY_TIER_LIMITS.free)
        const gate = page.locator('.geg[data-gate="free"]')
        await gate.scrollIntoViewIfNeeded()
        await expect(gate).toBeVisible()
        await page.waitForLoadState('networkidle')
        const withheld = lib.total - GALLERY_TIER_LIMITS.free
        expect((await gate.locator('.geg-h').innerText()).replace(/,/g, '').match(/\d+/g).map(Number), 'the gate counts the withheld rows').toEqual([withheld])
        await expect(gate.locator('.geg-h')).toHaveText(`${withheld} more ${lib.plural} with Pro`)
        // No locked tile among the results themselves (the old `.lockt-card` tease
        // is gone; the faded stand-ins live in the gate, outside `.lib-results`).
        await expect(page.locator('.lib-results .vpt--locked')).toHaveCount(0)
        await expect(page.locator('img.lockt-thumb')).toHaveCount(0)
        expect(urls.filter((u) => u.startsWith('/locked-previews/')), 'a locked preview picture was asked for').toEqual([])
      })

      test(`${lib.name}: the faded cards are inert, generic and grey`, async ({ page }) => {
        watch(page, `a free designer reading the faded cards on the ${lib.name} at ${width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        await expect(page.locator(OPEN)).toHaveCount(GALLERY_TIER_LIMITS.free)
        const fade = page.locator('.geg[data-gate="free"] [data-gate-fade]')
        await fade.scrollIntoViewIfNeeded()
        await expect(fade).toHaveAttribute('aria-hidden', 'true')
        await expect(fade).toHaveAttribute('inert', '')
        const tiles = fade.locator('.vpt--locked')
        expect(await tiles.count(), 'no faded tiles - this check would be vacuous').toBeGreaterThan(1)
        expect(await fade.locator('.vpt').count(), 'every faded tile is a locked one').toBe(await tiles.count())
        expect(await fade.locator('button, a').count(), 'a faded tile offers nothing to focus or follow').toBe(0)
        const names = (await fade.locator('.vpt-name').allInnerTexts()).map((n) => n.trim())
        expect(names.length, 'no faded names - this check would be vacuous').toBeGreaterThan(1)
        expect(names.filter((n) => !lib.names.has(n)), 'a faded tile carries a name that is not in the library').toEqual([])
        expect(await fade.innerText(), 'a hex value in the faded text').not.toMatch(/#[0-9a-f]{3,8}\b/i)
        const html = await fade.evaluate((el) => el.outerHTML)
        const colours = coloursIn(html)
        expect(colours.length, 'no colour in the faded cards - this check would be vacuous').toBeGreaterThan(0)
        expect(colours.filter((c) => !RAMP.includes(c)), 'a colour that is not a stand-in').toEqual([])
        expect(html, 'a picture in the faded cards').not.toMatch(/<img|<canvas/i)
      })
    }
  })
}
