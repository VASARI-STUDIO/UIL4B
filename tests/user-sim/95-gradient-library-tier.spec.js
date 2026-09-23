// The Gradient Library's rungs, measured in a browser.
//
// The founder's tiers — "non logged in users get 3 free ones logged in get 10
// and paid get full" — reached this surface on 2026-09-18, and it is the one of
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
import { GALLERY_GRADIENTS } from '../../src/data/gradientGallery.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTE = '/discover/gradients'
const CARD = '.grg-card'

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
  { name: 'signed out', plan: null, cap: GALLERY_TIER_LIMITS.anonymous, placeholders: 0, wall: 'account' },
  { name: 'signed in, free', plan: 'free', cap: GALLERY_TIER_LIMITS.free, placeholders: 3, wall: 'pro' },
]

async function surfaces(page) {
  return page.evaluate(() => ({
    text: document.body.innerText.toUpperCase(),
    html: document.documentElement.outerHTML.toUpperCase(),
    // Every gradient on the page is painted through background-image, so the
    // computed value of THAT is the surface a stop actually reaches.
    images: [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).backgroundImage).join(' ').toUpperCase(),
    paint: [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).backgroundColor),
    names: [...document.querySelectorAll('[aria-label],[title],button,a')]
      .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
      .join(' | ').toUpperCase(),
  }))
}

for (const rung of RUNGS) {
  const OPEN = openAt(rung.cap)
  const WITHHELD = GALLERY_GRADIENTS.slice(rung.cap)
  const TELLTALE = withheldHexes(rung.cap)
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
      const found = (hay, hex) => hay.includes(hex) || hay.includes(hex.slice(1)) || hay.includes(rgbOf(hex).toUpperCase())
      expect(found(html, CONTROL), `the open control ${CONTROL} is missing — the gallery did not render`).toBe(true)
      expect(found(images, CONTROL), 'no gradient is painted — the gallery did not render').toBe(true)
    })

    test('the rung opens exactly what it promises, and the count line agrees', async ({ page }) => {
      // The honesty half: a page showing three may not say a hundred. The count
      // line is the one number a visitor reads before deciding the library is
      // small rather than metered.
      await expect(page.locator(CARD)).toHaveCount(rung.cap)
      await expect(page.locator('.drh-head p')).toHaveText(`${rung.cap} gradients`)
      const names = await page.locator('.grg-card .lbry-card-name, .grg-card h3').allInnerTexts()
      expect(names.map((n) => n.trim()).sort()).toEqual(OPEN.map((g) => g.name).sort())
    })

    test('a withheld gradient reaches no text, markup, paint, gradient CSS or accessible name', async ({ page }) => {
      const { text, html, images, paint, names } = await surfaces(page)
      const painted = new Set(paint)
      // Searched in BOTH forms everywhere. See the control above: the page
      // writes its gradients as rgb(), so hex alone would be a check that
      // cannot fail.
      const hit = (hay, hex) => hay.includes(hex) || hay.includes(hex.slice(1)) || hay.includes(rgbOf(hex).toUpperCase())
      const leaks = [
        ...TELLTALE.filter((hex) => hit(text, hex)).map((h) => `text:${h}`),
        ...TELLTALE.filter((hex) => hit(html, hex)).map((h) => `markup:${h}`),
        ...TELLTALE.filter((hex) => hit(images, hex)).map((h) => `gradient-css:${h}`),
        ...TELLTALE.filter((hex) => painted.has(rgbOf(hex))).map((h) => `paint:${h}`),
        ...TELLTALE.filter((hex) => hit(names, hex)).map((h) => `name:${h}`),
      ]
      expect(leaks, 'a withheld gradient handed its stops over').toEqual([])
      // And not by name either: the name is the tease, but only on a row the
      // page is allowed to tease.
      //
      // Read off the CARDS rather than swept for in the page text, and that is
      // a correctness point rather than a tidiness one: a sweep for the string
      // "Combi" matches the toolbar's own hint, "Shift-click to combine types",
      // and reports a leak that is not there. What the gate actually promises
      // is that the named rows on the page are the open ones plus, at most, the
      // three it is allowed to tease.
      const rendered = (await page.locator('.grg-card .lbry-card-name, .lockt-card .lockt-name').allInnerTexts())
        .map((n) => n.trim())
      const allowed = [...OPEN, ...WITHHELD.slice(0, rung.placeholders)].map((g) => g.name)
      expect(rendered.filter((name) => !allowed.includes(name)),
        'a withheld gradient is named on the page').toEqual([])
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

    test('the wall offers this rung its own next step, with its own true number', async ({ page }) => {
      // From the bottom rung the next step is a free account and the honest
      // number is how many more THAT opens; from the free rung it is Pro and
      // the number is everything still withheld. Selling Pro to somebody whose
      // next seven gradients are free is the untruth this pins shut.
      const head = page.locator('.lockt-cta-head')
      const expected = rung.wall === 'account'
        ? GALLERY_TIER_LIMITS.free - rung.cap
        : GALLERY_GRADIENTS.length - rung.cap
      // THE NUMBERS ARE READ AS NUMBERS, not as substrings. `toContainText('7')`
      // is satisfied by "Another 97 gradients", which is the exact wrong answer
      // this assertion exists to catch — the Pro remainder printed on the
      // account wall. Verified: that mutation survives a substring check.
      const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number)
      expect(numbersIn(await head.innerText()), 'the wall does not state this rung\'s own number')
        .toContain(expected)

      // And the body states the arithmetic behind it: how many this rung's next
      // step opens, out of how many exist. Without both, "another 7" is a
      // number with nothing to measure it against.
      const bodyNumbers = numbersIn(await page.locator('.lockt-cta-body').innerText())
      expect(bodyNumbers, 'the wall does not say how big the library is').toContain(GALLERY_GRADIENTS.length)
      expect(bodyNumbers, 'the wall does not say how much the next rung opens')
        .toContain(rung.wall === 'account' ? GALLERY_TIER_LIMITS.free : rung.cap)
      const cta = page.locator('.lockt-cta-btn')
      await expect(cta).toHaveText(rung.wall === 'account' ? /Create your free account/ : /See what Pro includes/)
      // Keyboard reachable, and it opens the canonical dialog for that step
      // rather than a second one built for this surface.
      await cta.focus()
      await expect(cta).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(rung.wall === 'account'
        ? page.locator('[role="dialog"]')
        : page.locator('[role="dialog"]').filter({ hasText: 'The full gradient library' })).toBeVisible()
    })

    test('the placeholders carry no payload, no control and no wrong price', async ({ page }) => {
      const cards = page.locator('.lockt-card')
      // Zero at the bottom rung: LockedPaletteCard stamps every placeholder
      // "Pro", and the next gradients are not Pro's — they come with a free
      // account. At the free rung the pill is true and the three are back.
      await expect(cards).toHaveCount(rung.placeholders)
      expect(await cards.locator('button, a, [tabindex]').count(),
        'a placeholder carries a focusable control').toBe(0)
      const painted = await cards.locator('*').evaluateAll(
        (els) => els.map((el) => getComputedStyle(el).backgroundImage).join(' ').toUpperCase())
      expect(TELLTALE.filter((hex) => painted.includes(hex)),
        'a placeholder is painted from the gradient it stands for').toEqual([])
    })

    test('the wall steps aside while the visitor is searching or filtering', async ({ page }) => {
      // Under a narrower question the visitor has already said what they want,
      // and answering it with a wall is an interruption rather than an offer —
      // the same rule the palette and prompt libraries follow.
      await expect(page.locator('.lockt-cta')).toBeVisible()
      await page.getByLabel('Search gradients').fill(OPEN[0].name)
      await expect(page.locator('.lockt-cta')).toHaveCount(0)
      await expect(page.locator('.lockt-card')).toHaveCount(0)
      await page.getByLabel('Search gradients').fill('')
      await expect(page.locator('.lockt-cta')).toBeVisible()
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
    await expect(page.locator('.lockt-cta')).toHaveCount(0)
    await expect(page.locator('.lockt-card')).toHaveCount(0)
  })
})
