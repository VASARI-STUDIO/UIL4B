// The Gradient Library's rungs, measured in a browser.
//
// The tiers — 3 for signed-out users, 10 for logged-in users and everything for
// paid — reach this surface here, and it is the one of
// the three gated galleries that had NO gate before: every gradient was open,
// so nothing here was ever asserted. 44 covers the palettes and 45 the prompts;
// without this file the gradient gate is proved only by a source assertion, and
// a source assertion cannot see a page.
//
// WHAT THE PAYLOAD IS HERE. A gradient's product is its STOPS — the hex values
// the "Copy CSS" button hands over — and its name is the tease, exactly as a
// brand palette's name is. So a withheld gradient may not appear:
//
//   as text          the card prints "Linear · 2 stops", the copy button the CSS
//   in the markup    inline `background-image: linear-gradient(...)` carries the
//                    hexes in an attribute, which is where a "blurred" gate
//                    would leave them
//   in the paint     the swatch is painted FROM that gradient, so an eyedropper
//                    would lift the colour even if the markup were clean
//   through search   the haystack indexes every stop's hex, so a search box over
//                    the full collection would confirm a withheld gradient's
//                    colours to anyone who typed them, and name it in the result
//
// Every rung is paired with a POSITIVE CONTROL over the gradients it does open:
// "no withheld hex found" is true and meaningless on a page that rendered
// nothing, which is exactly how this file would start lying.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { GALLERY_GRADIENTS } from '../../api/_lib/library/gradientGallery.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTE = '/discover/gradients'
const CARD = '.grg-card:not(.geg-fade *)'

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

// `skipFade` leaves the end gate's faded cards out: the live gallery and the rest
// of the page, text, markup, gradient CSS, paint and names alike.
async function surfaces(page, { skipFade = false } = {}) {
  return page.evaluate((skip) => {
    const root = document.documentElement.cloneNode(true)
    if (skip) root.querySelectorAll('.geg-fade').forEach((n) => n.remove())
    const fades = skip ? [...document.querySelectorAll('.geg-fade')] : []
    const shown = fades.map((f) => f.style.display)
    fades.forEach((f) => { f.style.display = 'none' })
    const text = document.body.innerText.toUpperCase()
    fades.forEach((f, i) => { f.style.display = shown[i] })
    const els = [...document.querySelectorAll('*')].filter((el) => !skip || !el.closest('.geg-fade'))
    return {
      text,
      html: root.outerHTML.toUpperCase(),
      // Every gradient on the page is painted through background-image, so the
      // computed value of THAT is the surface a stop actually reaches.
      images: els.map((el) => getComputedStyle(el).backgroundImage).join(' ').toUpperCase(),
      paint: els.map((el) => getComputedStyle(el).backgroundColor),
      // The faded cards are aria-hidden, so a screen reader never reads their names.
      names: [...document.querySelectorAll('[aria-label],[title],button,a')]
        .filter((el) => !el.closest('[aria-hidden="true"]') && (!skip || !el.closest('.geg-fade')))
        .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
        .join(' | ').toUpperCase(),
    }
  }, skipFade)
}

for (const rung of RUNGS) {
  const OPEN = openAt(rung.cap)
  const WITHHELD = GALLERY_GRADIENTS.slice(rung.cap)
  const TELLTALE = withheldHexes(rung.cap)
  const PRO_TELLTALE = withheldHexes(GALLERY_TIER_LIMITS.free)
  const CONTROL = hexesOf(OPEN).find((hex) => !achromatic(hex))

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
      // The honesty half: a page showing three may not say a hundred. The count
      // line is the one number a visitor reads before deciding the library is
      // small rather than metered.
      await expect(page.locator(CARD)).toHaveCount(rung.cap)
      await expect(page.locator('.drh-head p')).toHaveText(`${GALLERY_GRADIENTS.length} gradients · ${rung.cap} shown`)
      const names = await page.locator(`${CARD} .lbry-card-name, ${CARD} h3`).allInnerTexts()
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
      // The page outside the end gate's faded cards hands over nothing past the rung.
      expect(sweep(await surfaces(page, { skipFade: true }), TELLTALE), 'a withheld gradient handed its stops over').toEqual([])
      // The faded cards are the next free-tier gradients (signed out) or neutral
      // stand-ins (free), so the whole page, fade included, holds nothing past the
      // free rung: no Pro gradient's stop is anywhere in the DOM.
      expect(sweep(await surfaces(page), PRO_TELLTALE), 'a Pro gradient\'s stop is in the page').toEqual([])
      // And not by name either: the name is the tease, but only on a row the
      // page is allowed to tease.
      //
      // Read off the CARDS rather than swept for in the page text, and that is
      // a correctness point rather than a tidiness one: a sweep for the string
      // "Combi" matches the toolbar's own hint, "Shift-click to combine types",
      // and reports a leak that is not there. What the gate actually promises
      // is that the named rows on the page are the open ones plus, at most, the
      // three it is allowed to tease.
      const rendered = (await page.locator('.grg-card:not(.geg-fade *) .lbry-card-name').allInnerTexts())
        .map((n) => n.trim())
      // The faded rows under the gate are neutral shapes now, so the only named
      // rows are the open ones: no withheld name is teased at any rung.
      const allowed = OPEN.map((g) => g.name)
      expect(rendered.filter((name) => !allowed.includes(name)),
        'a withheld gradient is named on the page').toEqual([])
      // The faded rows under the gate are the gallery's own cards: the next
      // free-tier gradients signed out, neutral stand-ins named "Gradient" for a
      // free account. So the only names in them are the next rows a free account
      // opens, or the stand-in's own: no Pro gradient is named anywhere.
      const freeNames = openAt(GALLERY_TIER_LIMITS.free).map((g) => g.name)
      const fadedNames = (await page.locator('.geg-fade .lbry-card-name').allInnerTexts()).map((n) => n.trim())
      expect(fadedNames.length, 'the faded cards carry no names - this assertion is vacuous').toBeGreaterThan(0)
      expect(fadedNames.filter((name) => name !== 'Gradient' && !freeNames.includes(name)),
        'a Pro gradient is named in the fade').toEqual([])
      expect(rendered.length, 'nothing is named at all — this assertion is vacuous').toBeGreaterThan(0)
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
        // The result is read off the CARDS, not off the page text: the empty
        // state quotes the query back — "No gradients match “Bourbon”" — which
        // is the visitor's own word returning, not the library answering.
        const named = await page.locator(`${CARD} .lbry-card-name`).allInnerTexts()
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
      // next seven gradients are free is the untruth this pins shut.
      const gate = page.locator(`.geg[data-gate="${rung.wall === 'account' ? 'anon' : 'pro'}"]`)
      await expect(gate).toBeVisible()
      const head = gate.getByRole('heading')
      const expected = rung.wall === 'account'
        ? GALLERY_TIER_LIMITS.free
        : GALLERY_GRADIENTS.length - rung.cap
      expect(await head.innerText()).toBe(rung.wall === 'account'
        ? `Log in to access ${expected} gradients`
        : `Pro opens ${expected} more gradients`)
      // THE NUMBERS ARE READ AS NUMBERS, not as substrings. `toContainText('7')`
      // is satisfied by "Another 97 gradients", which is the exact wrong answer
      // this assertion exists to catch — the Pro remainder printed on the
      // account gate. Verified: that mutation survives a substring check.
      const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number)
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
        await expect(gate.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '/plans')
      }
      const cta = rung.wall === 'account'
        ? gate.getByRole('button', { name: 'Log in' })
        : gate.getByRole('link', { name: 'See what Pro includes' })
      await expect(cta).toBeVisible()
      // Keyboard reachable, and it opens the canonical dialog for that step
      // rather than a second one built for this surface.
      await cta.focus()
      await expect(cta).toBeFocused()
      await page.keyboard.press('Enter')
      // The Pro step goes to /plans.
      if (rung.wall === 'account') await expect(page.locator('[role="dialog"]')).toBeVisible()
      else await expect(page).toHaveURL(/\/plans$/)
    })

    test('the faded rows are inert, hidden from assistive tech and carry no payload or wrong price', async ({ page }) => {
      // The faded cards are the gallery's own card. They carry text and controls
      // (a name, a type, Copy CSS), so the guard is the subtree: aria-hidden,
      // inert, click-through, nothing in it takes focus, and no Pro gradient's
      // stop is painted in it. (The page-wide hex sweep is the test above.)
      const fade = page.locator('.geg-fade')
      const cells = fade.locator('.grg-card')
      // No old locked-card markup at either rung: the next gradients are not
      // all Pro's (a free account opens more), so none is stamped "Pro".
      await expect(page.locator('.lockt-card')).toHaveCount(0)
      expect(await cells.count(), 'the faded rows are missing - this check would be vacuous').toBeGreaterThan(3)
      await expect(fade).toHaveAttribute('aria-hidden', 'true')
      await expect(fade).toHaveAttribute('inert', '')
      await expect(fade).toHaveCSS('pointer-events', 'none')
      const { tried, reached } = await fade.evaluate((el) => {
        const controls = [...el.querySelectorAll('a, button, input, [tabindex]')]
        return { tried: controls.length, reached: controls.filter((c) => { c.focus(); return document.activeElement === c }).length }
      })
      expect(tried, 'the fade holds no control to try - the focus check would be vacuous').toBeGreaterThan(0)
      expect(reached, 'a faded control took focus').toBe(0)
      expect(await fade.innerText(), 'a faded card is stamped Pro').not.toMatch(/\bPro\b/)
      const painted = await cells.locator('xpath=descendant-or-self::*').evaluateAll(
        (els) => els.map((el) => `${getComputedStyle(el).backgroundImage} ${getComputedStyle(el).backgroundColor}`).join(' ').toUpperCase())
      expect(PRO_TELLTALE.filter((hex) => painted.includes(hex) || painted.includes(rgbOf(hex).toUpperCase())),
        'a faded card is painted from a Pro gradient').toEqual([])
    })

    test('the wall steps aside while the visitor is searching or filtering', async ({ page }) => {
      // Under a narrower question the visitor has already said what they want,
      // and answering it with a wall is an interruption rather than an offer —
      // the same rule the palette and prompt libraries follow.
      await expect(page.locator('.geg')).toBeVisible()
      await page.getByLabel('Search gradients').fill(OPEN[0].name)
      await expect(page.locator('.geg')).toHaveCount(0)
      await page.getByLabel('Search gradients').fill('')
      await expect(page.locator('.geg')).toBeVisible()
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
    await expect(page.locator('.lockt-card')).toHaveCount(0)
  })
})
