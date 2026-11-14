// The Gradient Library's rungs, measured in a browser.
//
// The tiers (GALLERY_TIER_LIMITS: a cap for signed-out users, a larger one for
// logged-in users and everything for paid) reach this surface here, and it is
// the one of the three gated galleries that had NO gate before: every gradient
// was open, so nothing here was ever asserted. 44 covers the palettes and 45 the
// prompts; without this file the gradient gate is proved only by a source
// assertion, and a source assertion cannot see a page.
//
// WHAT THE PAYLOAD IS HERE. A gradient's product is its STOPS, the hex values
// the preview dialog's "Copy CSS" hands over. So a withheld gradient may not
// appear:
//
//   as text          the tile prints "Linear · 2 stops"
//   in the markup    inline `background-image: linear-gradient(...)` carries the
//                    hexes in an attribute, which is where a "blurred" gate
//                    would leave them
//   in the paint     the tile's picture is painted FROM that gradient, so an
//                    eyedropper would lift the colour even if the markup were clean
//   through search   the haystack indexes every stop's hex, so a search box over
//                    the full collection would confirm a withheld gradient's
//                    colours to anyone who typed them, and name it in the result
//
// WHAT THE REDESIGN CHANGED (and what this file now holds instead). The faded
// tiles under the gate are the gallery's own locked panel tiles. A Pro row's NAME
// is deliberately shown there (the tease), painted from the neutral ramp in
// utils/gateStandins.js and carrying no value of the real gradient; so the line
// this file holds is "no Pro stop anywhere on the page, and a name only on a tile
// that has no way in", not "no Pro name anywhere". The tiles carry no control at
// all, so the old "the fade's controls cannot be focused" check is now "the fade
// holds no control to focus".
//
// Every rung is paired with a POSITIVE CONTROL over the gradients it does open:
// "no withheld hex found" is true and meaningless on a page that rendered
// nothing, which is exactly how this file would start lying.
//
// MUTATIONS this file goes red on:
//   - render a Pro stub's real stops in a faded tile (LibraryGate.jsx fadeTile /
//     gateStandins.js standinFromStub): the page-wide hex sweep and the
//     fade-paint assertions go red;
//   - let the page hand the full Pro rows to a free or signed-out viewer
//     (api/_lib/library): the hex sweep and the open-tile count go red;
//   - draw a button or link in a faded tile, or drop `aria-hidden`/`inert` from
//     the fade (GalleryEndGate.jsx): the fade assertions go red;
//   - state the wrong number in the gate (src/data/galleryGateCopy.js
//     libraryGateCopy): the "own, true number" assertions go red;
//   - stop searching the full collection through the cap (GradientGallery.jsx):
//     the search-oracle assertions go red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { loginDialog, hexesIn } from './gallery-filter-helpers.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'
import { STANDIN_COLOURS } from '../../src/utils/gateStandins.js'

const ROUTE = '/discover/gradients'
// An open panel tile, never one of the locked tiles the gate fades in below the grid.
const CARD = '.vpt:not(.vpt--locked):not([data-gate-fade] *)'
const NAME = `${CARD} .vpt-name`
const FADE = '[data-gate-fade]'

// Nothing in this collection carries a paid flag — the cap IS the gate — so the
// open set at a rung is simply the first n in the data file's own order.
const openAt = (cap) => GALLERY_GRADIENTS.slice(0, cap)
const hexesOf = (list) => [...new Set(list.flatMap((g) => g.stops.map((s) => s.color.toUpperCase())))]

// The hexes that discriminate. Achromatic values are half the stylesheet, and a
// hex an open gradient also uses proves nothing about a withheld one.
const achromatic = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.max(r, g, b) - Math.min(r, g, b) < 24
}
const withheldHexes = (cap) => {
  const open = new Set(hexesOf(openAt(cap)))
  return hexesOf(GALLERY_GRADIENTS.slice(cap)).filter((hex) => !achromatic(hex) && !open.has(hex))
}
const rgbOf = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`

const RUNGS = [
  { name: 'signed out', plan: null, cap: GALLERY_TIER_LIMITS.anonymous, wall: 'account' },
  { name: 'signed in, free', plan: 'free', cap: GALLERY_TIER_LIMITS.free, wall: 'pro' },
]

// A hex is found when it stands alone, or as rgb(). It is NOT found inside a longer
// hex run: the build minifies the boot skeleton's `rgba(15,23,42,.1)` to the
// 8-digit `#0f172a1a`, whose first six digits are a withheld stop's value by
// coincidence and are not a gradient handing its stops over.
const inHay = (hay, hex) => new RegExp(`(?<![0-9A-F])${hex.slice(1)}(?![0-9A-F])`).test(hay) || hay.includes(rgbOf(hex).toUpperCase())

// The gate prints thousands with a comma ("1,000"), so a number is a run of
// digits and commas, read back with the commas taken out.
const numbersIn = (s) => (s.match(/\d[\d,]*/g) || []).map((m) => Number(m.replace(/,/g, '')))

// `skipFade` leaves the end gate's faded tiles out: the live gallery and the rest
// of the page, text, markup, gradient CSS, paint and names alike.
async function surfaces(page, { skipFade = false } = {}) {
  return page.evaluate(({ skip, fadeSel }) => {
    const root = document.documentElement.cloneNode(true)
    if (skip) root.querySelectorAll(fadeSel).forEach((n) => n.remove())
    const fades = skip ? [...document.querySelectorAll(fadeSel)] : []
    const shown = fades.map((f) => f.style.display)
    fades.forEach((f) => { f.style.display = 'none' })
    const text = document.body.innerText.toUpperCase()
    fades.forEach((f, i) => { f.style.display = shown[i] })
    const els = [...document.querySelectorAll('*')].filter((el) => !skip || !el.closest(fadeSel))
    return {
      text,
      html: root.outerHTML.toUpperCase(),
      // Every gradient on the page is painted through background-image, so the
      // computed value of THAT is the surface a stop actually reaches.
      images: els.map((el) => getComputedStyle(el).backgroundImage).join(' ').toUpperCase(),
      paint: els.map((el) => getComputedStyle(el).backgroundColor),
      // The faded tiles are aria-hidden, so a screen reader never reads their names.
      names: [...document.querySelectorAll('[aria-label],[title],button,a')]
        .filter((el) => !el.closest('[aria-hidden="true"]') && (!skip || !el.closest(fadeSel)))
        .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
        .join(' | ').toUpperCase(),
    }
  }, { skip: skipFade, fadeSel: FADE })
}

for (const rung of RUNGS) {
  const OPEN = openAt(rung.cap)
  const WITHHELD = GALLERY_GRADIENTS.slice(rung.cap)
  const TELLTALE = withheldHexes(rung.cap)
  const PRO_TELLTALE = withheldHexes(GALLERY_TIER_LIMITS.free)
  const CONTROL = hexesOf(OPEN).find((hex) => !achromatic(hex))
  const GATE = `[data-gate="${rung.wall === 'account' ? 'anon' : 'free'}"]`

  test.describe(`the gradient library's tier holds — ${rung.name}`, () => {
    test.beforeEach(async ({ page }) => {
      watch(page, `a ${rung.name} visitor browsing for a gradient`)
      if (rung.plan) await signIn(page, { plan: rung.plan })
      await go(page, ROUTE)
      await expect(page.locator(CARD).first()).toBeVisible()
    })

    test('the fixture discriminates and the page rendered — controls first', async ({ page }) => {
      expect(TELLTALE.length, 'no telltale withheld hexes to look for').toBeGreaterThan(19)
      expect(WITHHELD.length, 'nothing is withheld at this rung — there is no gate to test').toBeGreaterThan(0)
      // THE FORM THE VALUE TAKES ON THE PAGE IS rgb(), NOT HEX, and finding that
      // out is the whole job of this control. A gradient is painted through an
      // inline `background`, and both the serialised style attribute and the
      // computed backgroundImage come back as `linear-gradient(135deg, rgb(255,
      // 81, 47) 0%, …)`. A leak check written in hex alone would therefore
      // never match anything and would pass on a page printing every stop it
      // owns. Both forms are searched below; this proves at least one of them
      // can be found when the value really is there.
      const { html, images } = await surfaces(page)
      const found = inHay
      expect(found(html, CONTROL), `the open control ${CONTROL} is missing — the gallery did not render`).toBe(true)
      expect(found(images, CONTROL), 'no gradient is painted — the gallery did not render').toBe(true)
    })

    test('the rung opens exactly what it promises, and the count line agrees', async ({ page }) => {
      // The honesty half: a page showing a handful may not say a hundred. The count
      // line is the one number a visitor reads before deciding the library is
      // small rather than metered.
      await expect(page.locator(CARD)).toHaveCount(rung.cap)
      await expect(page.locator('.drh-head p')).toHaveText(`${GALLERY_GRADIENTS.length} gradients · ${rung.cap} shown`)
      const names = await page.locator(NAME).allInnerTexts()
      expect(names.map((n) => n.trim()).sort()).toEqual(OPEN.map((g) => g.name).sort())
    })

    test('a withheld gradient reaches no text, markup, paint, gradient CSS or accessible name', async ({ page }) => {
      // Searched in BOTH forms everywhere. See the control above: the page
      // writes its gradients as rgb(), so hex alone would be a check that
      // cannot fail.
      const hit = inHay
      const sweep = (s, telltale) => {
        const painted = new Set(s.paint)
        return [
          ...telltale.filter((hex) => hit(s.text, hex)).map((h) => `text:${h}`),
          ...telltale.filter((hex) => hit(s.html, hex)).map((h) => `markup:${h}`),
          ...telltale.filter((hex) => hit(s.images, hex)).map((h) => `gradient-css:${h}`),
          ...telltale.filter((hex) => painted.has(rgbOf(hex))).map((h) => `paint:${h}`),
          ...telltale.filter((hex) => hit(s.names, hex)).map((h) => `name:${h}`),
        ]
      }
      // The page outside the end gate's faded tiles hands over nothing past the rung.
      expect(sweep(await surfaces(page, { skipFade: true }), TELLTALE), 'a withheld gradient handed its stops over').toEqual([])
      // The faded tiles are the next free-tier gradients (signed out) or neutral
      // stand-ins (free), so the whole page, fade included, holds nothing past the
      // free rung: no Pro gradient's stop is anywhere in the DOM.
      expect(sweep(await surfaces(page), PRO_TELLTALE), 'a Pro gradient\'s stop is in the page').toEqual([])
      // The open tiles name only the open gradients.
      //
      // Read off the TILES rather than swept for in the page text, and that is
      // a correctness point rather than a tidiness one: a sweep for the string
      // "Combi" matches the toolbar's own hint, "Shift-click to combine types",
      // and reports a leak that is not there.
      const rendered = (await page.locator(NAME).allInnerTexts()).map((n) => n.trim())
      const allowed = OPEN.map((g) => g.name)
      expect(rendered.filter((name) => !allowed.includes(name)),
        'a withheld gradient is named on an open tile').toEqual([])
      expect(rendered.length, 'nothing is named at all — this assertion is vacuous').toBeGreaterThan(0)
      // The faded tiles DO name the rows behind the gate (the tease: a locked
      // tile with no way in), so the check on them is that they name only rows
      // the viewer has not been given: none of the open ones, and nothing the
      // library does not hold.
      const beyond = WITHHELD.map((g) => g.name)
      const fadedNames = (await page.locator(`${FADE} .vpt-name`).allInnerTexts()).map((n) => n.trim())
      expect(fadedNames.length, 'the faded tiles carry no names - this assertion is vacuous').toBeGreaterThan(0)
      expect(fadedNames.filter((name) => !beyond.includes(name)),
        'a faded tile is named for something that is not a withheld gradient').toEqual([])
    })

    test('the search box cannot pull a withheld gradient into an open position', async ({ page }) => {
      // THE ORACLE. The haystack indexes name, type, tags and every stop's hex,
      // so a search over the full collection answers "what colour is the one I
      // cannot see" for anyone willing to type it.
      const search = page.getByLabel('Search gradients')
      const probe = WITHHELD[WITHHELD.length - 1]
      for (const term of [probe.name, probe.stops[0].color, probe.stops[0].color.replace('#', '')]) {
        await search.fill(term)
        await expect(page.locator(CARD), `searching "${term}" surfaced a withheld gradient`).toHaveCount(0)
        // The result is read off the OPEN TILES, not off the page text: the empty
        // state quotes the query back — "No gradients match “Bourbon”" — which
        // is the visitor's own word returning, not the library answering, and the
        // gate's faded tiles may name the withheld match on purpose.
        const named = await page.locator(NAME).allInnerTexts()
        expect(named, `searching "${term}" surfaced ${probe.id}`).toEqual([])
      }
      // Positive control: the search is not simply broken.
      await search.fill(OPEN[0].name)
      await expect(page.locator(CARD)).toHaveCount(1)
    })

    test('the gate offers this rung its own next step, with its own true number', async ({ page }) => {
      // From the bottom rung the next step is a free account and the honest
      // number is what THAT opens in all; from the free rung it is Pro and
      // the number is everything still withheld. Selling Pro to somebody whose
      // next gradients are free is the untruth this pins shut.
      const gate = page.locator(GATE)
      await expect(gate).toBeVisible()
      const head = gate.getByRole('heading')
      const expected = rung.wall === 'account'
        ? GALLERY_TIER_LIMITS.free
        : GALLERY_GRADIENTS.length - rung.cap
      await expect(head).toHaveText(rung.wall === 'account'
        ? `Log in to access ${expected} gradients`
        : `${expected} more gradients with Pro`)
      // THE NUMBERS ARE READ AS NUMBERS, not as substrings. `toContainText('7')`
      // is satisfied by "Another 97 gradients", which is the exact wrong answer
      // this assertion exists to catch — the Pro remainder printed on the
      // account gate. Verified: that mutation survives a substring check.
      const headNumbers = numbersIn(await head.innerText())
      expect(headNumbers, 'the gate does not state this rung\'s own number').toContain(expected)
      if (rung.wall === 'account') {
        expect(headNumbers, 'the account gate prices the Pro remainder').not.toContain(GALLERY_GRADIENTS.length)
      }

      // And the body states the arithmetic behind it: what this viewer has now,
      // out of how many exist. Without both, "access 10" is a number with
      // nothing to measure it against.
      const bodyNumbers = numbersIn(await gate.locator('.geg-p').innerText())
      expect(bodyNumbers, 'the gate does not say how big the library is').toContain(GALLERY_GRADIENTS.length)
      expect(bodyNumbers, 'the gate does not say what the viewer has now').toContain(rung.cap)
      if (rung.wall === 'account') {
        expect(bodyNumbers, 'the gate does not say how much the free account opens').toContain(GALLERY_TIER_LIMITS.free)
      } else {
        expect(bodyNumbers, 'the gate does not say how many Pro opens beyond this viewer').toContain(expected)
      }

      if (rung.wall === 'account') {
        // The redesign dropped the signed-out "See the plans" link: the step from
        // here is the account, so the gate's two controls are both ways in to it.
        const create = gate.getByRole('button', { name: 'Create a free account' })
        const login = gate.getByRole('button', { name: 'Log in' })
        await expect(create).toBeVisible()
        await expect(login).toBeVisible()
        await expect(gate.getByRole('link', { name: /plans|Pro/i }), 'a signed-out visitor is sent to an account first, not to Pro').toHaveCount(0)
        // Keyboard reachable, and it opens the canonical login dialog rather than
        // a second one built for this surface.
        await create.focus()
        await expect(create).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(loginDialog(page)).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(loginDialog(page)).toHaveCount(0)
        await login.click()
        await expect(loginDialog(page)).toBeVisible()
      } else {
        const cta = gate.getByRole('link', { name: 'Upgrade to Pro' })
        await expect(cta).toBeVisible()
        await expect(cta).toHaveAttribute('href', '/plans')
        await cta.focus()
        await expect(cta).toBeFocused()
        await page.keyboard.press('Enter')
        // The Pro step goes to /plans.
        await expect(page).toHaveURL(/\/plans$/)
      }
    })

    test('the faded tiles are hidden from assistive tech, offer nothing to focus and carry no payload or wrong price', async ({ page }) => {
      // The faded tiles are the gallery's own locked tile: a name, a one-line
      // meta and a picture, with neither the open nor the Like button. So the
      // guard is the subtree: aria-hidden, nothing in it takes focus, and no Pro
      // gradient's stop is painted in it. (The page-wide hex sweep is the test above.)
      const fade = page.locator(FADE)
      const tiles = fade.locator('.vpt')
      await expect(fade).toHaveCount(1)
      // The tiles stand in for rows the viewer cannot open, so none of them is
      // drawn as an open tile among the real ones.
      await expect(page.locator('.vpt--locked:not([data-gate-fade] *)')).toHaveCount(0)
      expect(await tiles.count(), 'the faded tiles are missing - this check would be vacuous').toBeGreaterThan(3)
      expect(await fade.locator('.vpt:not(.vpt--locked)').count(), 'a faded tile is drawn as an open one').toBe(0)
      await expect(fade).toHaveAttribute('aria-hidden', 'true')
      expect(await fade.locator('a, button, input, [tabindex]').count(),
        'a faded tile offers something to focus or follow').toBe(0)

      if (rung.wall === 'account') {
        // The primary here is a button, so a click on the fade does what it does:
        // open the login dialog. The keyboard has the button itself.
        await tiles.first().click({ force: true })
        await expect(loginDialog(page), 'a click on the fade opens the sign-up flow').toBeVisible()
      } else {
        // The primary is a link, so the fade takes no pointer at all.
        await expect(fade).toHaveAttribute('inert', '')
        await expect(fade).toHaveCSS('pointer-events', 'none')
      }

      // What each tile says it is, and what it is painted from.
      const drawn = await tiles.evaluateAll((els) => els.map((tile) => ({
        meta: tile.querySelector('.vpt-meta')?.textContent.trim() || '',
        paint: [tile, ...tile.querySelectorAll('*')]
          .map((el) => `${getComputedStyle(el).backgroundImage} ${getComputedStyle(el).backgroundColor}`).join(' '),
        // The picture alone: the frame round it is the theme's surface token
        // (--v3-raised, white in the light theme), which is chrome, not a colour
        // of the gradient.
        media: [...tile.querySelectorAll('.vpt-media, .vpt-media *')]
          .map((el) => `${getComputedStyle(el).backgroundImage} ${getComputedStyle(el).backgroundColor}`).join(' '),
      })))
      for (const t of drawn) {
        expect(t.meta, 'a faded tile says what it is: a row a free account opens, or Pro').toMatch(/^(Free account|Pro( · \d+ stops?)?)$/)
      }
      const painted = drawn.map((t) => t.paint).join(' ').toUpperCase()
      expect(painted.length, 'the fade is not painted').toBeGreaterThan(0)
      expect(PRO_TELLTALE.filter((hex) => painted.includes(hex) || painted.includes(rgbOf(hex).toUpperCase())),
        'a faded tile is painted from a Pro gradient').toEqual([])
      // A Pro tile is drawn from the neutral ramp and nothing else. (Signed out,
      // the first tiles are the real rows a free account opens, whose colours are
      // theirs to show.)
      const proTiles = drawn.filter((t) => t.meta.startsWith('Pro'))
      if (rung.wall === 'pro') expect(proTiles.length, 'every faded tile is a Pro row at the free rung').toBe(drawn.length)
      const allowed = new Set(STANDIN_COLOURS.map((h) => h.toUpperCase()))
      for (const t of proTiles) {
        const found = hexesIn(t.media)
        expect(found.length, 'a Pro tile is not painted').toBeGreaterThan(0)
        expect(found.filter((h) => !allowed.has(h)), 'a Pro tile carries a colour that is not a stand-in').toEqual([])
      }
      if (rung.wall === 'account') {
        expect(drawn[0].meta, 'signed out, the fade continues with the rows a free account opens').toBe('Free account')
      }
    })

    test('the gate stays for a narrower question that still leaves rows withheld, and goes when nothing is', async ({ page }) => {
      // The old page stepped the wall aside whenever a search was typed. The
      // redesign counts the filter over the whole library instead: the gate shows
      // while any match is behind the tier, and goes only when every match is on
      // screen. A search for an open gradient's own name matches that gradient
      // alone, so nothing is withheld from it and the wall steps aside; a search
      // for a withheld gradient's name has only locked matches, and the gate, not
      // an empty state, answers it.
      const search = page.getByLabel('Search gradients')
      const only = (name) => GALLERY_GRADIENTS.filter((g) => g.name.toLowerCase().includes(name.toLowerCase())).length
      const open = OPEN[0].name
      const probe = WITHHELD[WITHHELD.length - 1].name
      expect(only(open), 'the open gradient\'s name matches only itself, so no match is withheld').toBe(1)
      expect(only(probe), 'the withheld gradient\'s name matches only itself').toBe(1)

      await expect(page.locator(GATE)).toBeVisible()
      await search.fill(open)
      await expect(page.locator(CARD)).toHaveCount(1)
      await expect(page.locator('.geg')).toHaveCount(0)
      await search.fill(probe)
      await expect(page.locator(CARD)).toHaveCount(0)
      await expect(page.locator('.geg')).toHaveCount(1)
      await expect(page.getByText('Nothing open to you')).toHaveCount(0)
      await expect(page.getByRole('status').filter({ hasText: 'No gradients match' })).toHaveCount(0)
      await search.fill('')
      await expect(page.locator(GATE)).toBeVisible()
    })
  })
}

test.describe('the gradient library at the top rung', () => {
  test('a subscriber gets the whole collection and no wall', async ({ page }) => {
    // The other end of the ladder, and the control for every count above: if
    // the cap were also reaching Pro, the numbers below would not be these.
    watch(page, 'a subscriber browsing for a gradient')
    await signIn(page, { plan: 'pro' })
    await go(page, ROUTE)
    await expect(page.locator(CARD)).toHaveCount(GALLERY_GRADIENTS.length)
    await expect(page.locator('.drh-head p')).toHaveText(`${GALLERY_GRADIENTS.length} gradients`)
    await expect(page.locator('.geg')).toHaveCount(0)
    await expect(page.locator('.vpt--locked')).toHaveCount(0)
  })
})
