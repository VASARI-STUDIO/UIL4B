// SPEC 279: WHAT A FREE ACCOUNT SEES PAST ITS OPEN CARDS IS NEUTRAL, NEVER A PREVIEW OF A PRO ROW.
//
// History: this spec used to pin "each locked card shows its own soft preview"
// (blurred build-time images under /locked-previews/). The shared end gate
// (components/library/GalleryEndGate) replaced the three locked cards on both
// libraries on purpose, and #989 made the rule stricter: a Pro item's picture or
// values never reach the page, blurred or not. The tail is now the gate over two
// faded rows of the gallery's own cards, drawn from stand-ins (utils/gateStandins)
// that share one fixed grey ramp and carry nothing of any real row.
//
// What it pins, for a free account on the Palette and Gradient Libraries, at 390
// and 1440:
//   - no locked-card tease and no /locked-previews/ picture is on the page or asked for;
//   - the Pro gate is there, and its heading counts the withheld rows from the data;
//   - the faded cards are inert and hidden from assistive tech, named only with the
//     generic noun, and coloured only from the stand-in ramp (a fixed list, written
//     out below, not read back from gateStandins.js).
//
// MUTATIONS (each should turn a test here red):
//   - make `standinPalettes` / `standinGradients` in utils/gateStandins.js return real
//     rows (or any colour outside the ramp): the colour test fails on that library;
//   - render a real row's name in the faded cards: the name test fails;
//   - draw LockedPaletteCard (components/library/LockedTease.jsx) in the gallery again:
//     the "no locked card" test fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/data.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/data.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const RAMP = ['#e4e4e7', '#c9c9ce', '#a1a1aa', '#7b7b84', '#5b5b64', '#3f3f46', '#2a2a30']

const LIBRARIES = [
  { name: 'Palette Library', route: '/discover/palettes', card: '.pgal-card', noun: 'Palette', total: LIBRARY_PALETTES.length },
  { name: 'Gradient Library', route: '/discover/gradients', card: '.grg-card', noun: 'Gradient', total: GALLERY_GRADIENTS.length },
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
        await expect(page.locator(`${lib.card}:not(.geg-fade *)`)).toHaveCount(GALLERY_TIER_LIMITS.free)
        const gate = page.locator('.geg[data-gate="pro"]')
        await gate.scrollIntoViewIfNeeded()
        await expect(gate).toBeVisible()
        await page.waitForLoadState('networkidle')
        const withheld = lib.total - GALLERY_TIER_LIMITS.free
        expect((await gate.locator('.geg-h').innerText()).replace(/,/g, '').match(/\d+/g).map(Number), 'the gate counts the withheld rows').toEqual([withheld])
        await expect(page.locator('.lockt-card')).toHaveCount(0)
        await expect(page.locator('img.lockt-thumb')).toHaveCount(0)
        expect(urls.filter((u) => u.startsWith('/locked-previews/')), 'a locked preview picture was asked for').toEqual([])
      })

      test(`${lib.name}: the faded cards are inert, generic and grey`, async ({ page }) => {
        watch(page, `a free designer reading the faded cards on the ${lib.name} at ${width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        await expect(page.locator(`${lib.card}:not(.geg-fade *)`)).toHaveCount(GALLERY_TIER_LIMITS.free)
        const fade = page.locator('.geg[data-gate="pro"] .geg-fade')
        await fade.scrollIntoViewIfNeeded()
        await expect(fade).toHaveAttribute('aria-hidden', 'true')
        await expect(fade).toHaveAttribute('inert', '')
        const names = (await fade.locator('.lbry-card-name').allInnerTexts()).map((n) => n.trim())
        expect(names.length, 'no faded cards - this check would be vacuous').toBeGreaterThan(1)
        expect(names.filter((n) => n !== lib.noun), 'a faded card carries a name').toEqual([])
        const html = await fade.evaluate((el) => el.outerHTML)
        const colours = coloursIn(html)
        expect(colours.length, 'no colour in the faded cards - this check would be vacuous').toBeGreaterThan(0)
        expect(colours.filter((c) => !RAMP.includes(c)), 'a colour that is not a stand-in').toEqual([])
        expect(html, 'a picture in the faded cards').not.toMatch(/<img|<canvas/i)
      })
    }
  })
}
