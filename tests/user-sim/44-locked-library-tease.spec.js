// Can a signed-out visitor get a paid brand's colours off the rendered page?
//
// This is the deliverable, not the placeholder. Before this change the answer
// was YES, trivially: /discover/palettes printed every Pro brand's five hex
// codes as visible text on the swatch, and each swatch was a button that copied
// its hex to the clipboard. The "gate" removed the bulk actions and the deep
// link and left the product itself lying on the page.
//
// A blurred version of that would have been WORSE, not better — the values
// would still be in the DOM for devtools, for the accessibility tree and for
// anyone who switches CSS off, while looking to everyone else like a working
// paywall. So the values are withheld upstream (src/utils/lockedPreview.js) and
// this file goes looking for them along every route the browser offers:
//
//   text        document.body.innerText
//   markup      outerHTML — attributes, titles, aria-labels, inline styles
//   paint       every element's computed background-color, as rgb()
//   names       the accessible name of every control on the page
//
// Every assertion is paired with a POSITIVE CONTROL over the free brands. If
// the gallery ever fails to render, "no paid hexes found" would be true and
// meaningless, and that is exactly how this suite would start lying.
// ── WHAT CHANGED WHEN THE GATE GREW A THIRD RUNG ───────────────
//
// The founder's tiers — 3 signed out, 10 with a free account, everything with
// Pro — mean the withheld set is no longer "the paid brands". It is now
// "everything past this viewer's cap", which at the bottom rung is 98 of the
// 101 palettes and at the free rung is 91. Every assertion below is therefore
// derived PER RUNG rather than from the brand flag, and the file covers two
// rungs instead of one: signed out, where the next step is a free account, and
// signed in free, where it is Pro. The Palette Builder's brands panel is
// unchanged and still gates on the flag alone, so its block is untouched.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { openPaletteTools } from './palette-helpers.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'
import { LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTE = '/discover/palettes'

const PAID = BRAND_PALETTES.filter((b) => b.free !== true)
const FREE = BRAND_PALETTES.filter((b) => b.free === true)

// Only the hexes that discriminate. #000000 and #FFFFFF are half the
// stylesheet, so they would fail for reasons unrelated to the gate; what is
// left is every withheld colour that is chromatic and appears in no open row.
const achromatic = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return Math.max(r, g, b) - Math.min(r, g, b) < 24
}
const FREE_HEXES = new Set(FREE.flatMap((b) => b.colors.map((c) => c.toUpperCase())))
const TELLTALE = [...new Set(
  PAID.flatMap((b) => b.colors.map((c) => c.toUpperCase()))
    .filter((hex) => !achromatic(hex) && !FREE_HEXES.has(hex)),
)]
const rgbOf = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`

// A free brand that must be present, to prove the BUILDER panel rendered.
const CONTROL = FREE.find((b) => !b.colors.every(achromatic))
const CONTROL_HEX = CONTROL.colors.find((c) => !achromatic(c)).toUpperCase()

// ── The gallery's two non-Pro rungs, derived the way the page derives them ──
//
// The eligible rows in LIBRARY ORDER, capped. Order matters and is the point:
// the cap counts down the data file, not down whatever the search box built.
const ELIGIBLE = LIBRARY_PALETTES.filter((p) => p.pro !== true)
const RUNGS = {
  anonymous: ELIGIBLE.slice(0, GALLERY_TIER_LIMITS.anonymous),
  free: ELIGIBLE.slice(0, GALLERY_TIER_LIMITS.free),
}
const hexesOf = (list) => new Set(list.flatMap((p) => p.colors.map((c) => c.toUpperCase())))
// Everything this rung may NOT have — the capped tail AND the paid brands.
const withheldHexes = (rung) => {
  const open = hexesOf(RUNGS[rung])
  return [...hexesOf(LIBRARY_PALETTES.filter((p) => !RUNGS[rung].includes(p)))]
    .filter((hex) => !achromatic(hex) && !open.has(hex))
}
// And the positive control: a colour this rung certainly HAS, so "no withheld
// hex found" cannot pass because the gallery failed to render.
const openControl = (rung) => [...hexesOf(RUNGS[rung])].filter((hex) => !achromatic(hex))[0]
const ANON_WITHHELD = withheldHexes('anonymous')
const FREE_WITHHELD = withheldHexes('free')
const ANON_CONTROL = openControl('anonymous')
const FREE_CONTROL = openControl('free')
// What the two walls must say, computed from the data rather than typed.
const ANON_GAIN = RUNGS.free.length - RUNGS.anonymous.length
const FREE_REMAINING = LIBRARY_PALETTES.length - RUNGS.free.length

async function surfaces(page) {
  return page.evaluate(() => ({
    text: document.body.innerText.toUpperCase(),
    html: document.documentElement.outerHTML.toUpperCase(),
    paint: [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).backgroundColor),
  }))
}

test.describe('a locked library row hands nothing over — signed out', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor browsing for a palette')
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card').first()).toBeVisible()
  })

  test('the fixture discriminates and the page rendered — controls first', async ({ page }) => {
    // If any of these ever fails, every assertion in this block is vacuous.
    expect(ANON_WITHHELD.length, 'no telltale withheld hexes to look for').toBeGreaterThan(19)
    const { text, html, paint } = await surfaces(page)
    expect(html, 'the open control is missing — the gallery did not render').toContain(ANON_CONTROL)
    expect(paint, 'no open swatch is painted — the gallery did not render').toContain(rgbOf(ANON_CONTROL))
    expect(text.length, 'the page rendered no text').toBeGreaterThan(500)
  })

  test('the signed-out rung shows three palettes and says so', async ({ page }) => {
    // The founder's number, on the page rather than in a unit test. The count
    // line is the honesty check: a page showing three may not claim 101.
    await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
    await expect(page.locator('.drh-head p')).toHaveText(`${GALLERY_TIER_LIMITS.anonymous} palettes`)
  })

  test('no withheld palette colour appears in the text, the markup or the paint', async ({ page }) => {
    const { text, html, paint } = await surfaces(page)
    const painted = new Set(paint)
    const inText = ANON_WITHHELD.filter((hex) => text.includes(hex) || text.includes(hex.slice(1)))
    const inHtml = ANON_WITHHELD.filter((hex) => html.includes(hex) || html.includes(hex.slice(1)))
    const inPaint = ANON_WITHHELD.filter((hex) => painted.has(rgbOf(hex)))
    expect(inText, 'a withheld hex is readable as text').toEqual([])
    expect(inHtml, 'a withheld hex is in the markup — devtools and CSS-off both read it').toEqual([])
    expect(inPaint, 'a withheld colour is painted on an element — an eyedropper lifts it').toEqual([])
  })

  test('no withheld palette colour reaches the accessibility tree', async ({ page }) => {
    // The route a blur cannot close: a screen reader reads the DOM, not the
    // filter. Accessible names are collected rather than the raw tree so the
    // assertion covers aria-label, title and text content together.
    const names = await page.evaluate(() => [...document.querySelectorAll('[aria-label],[title],button,a')]
      .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
      .join(' | ').toUpperCase())
    const leaked = ANON_WITHHELD.filter((hex) => names.includes(hex) || names.includes(hex.slice(1)))
    expect(leaked, 'a withheld hex is in an accessible name').toEqual([])
    // Positive control: the OPEN palettes' hexes are in there, because their
    // swatches carry a "Copy #xxxxxx" label. So the check above is real.
    expect(names, 'no open hex in any accessible name — this assertion is vacuous').toContain(ANON_CONTROL)
  })

  test('the signed-out wall offers the free account, and offers it honestly', async ({ page }) => {
    // THE RUNG MISMATCH THIS PREVENTS: selling a purchase to somebody whose
    // next step costs nothing. Seven of the ninety-eight withheld palettes
    // arrive with a free account, so "another 98 with Pro" would be false here
    // even though every number in it is real.
    const cta = page.locator('.lockt-cta-btn')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveText(/Create your free account/)
    // Read as NUMBERS rather than as substrings: `toContain('7')` is satisfied
    // by "Another 98 palettes" — the Pro remainder — which is precisely the
    // wrong answer this assertion exists to catch.
    const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number)
    const heading = await page.locator('.lockt-cta-head').first().innerText()
    expect(numbersIn(heading), 'the wall must name how many more an ACCOUNT opens').toContain(ANON_GAIN)
    const body = await page.locator('.lockt-cta-body').first().innerText()
    expect(numbersIn(body), 'the wall must state the size of the library it is metering')
      .toContain(LIBRARY_PALETTES.length)
    expect(numbersIn(body), 'the wall must state what the next rung actually opens')
      .toContain(GALLERY_TIER_LIMITS.free)
    // Keyboard reachable, and it opens the app's own sign-in dialog rather
    // than a checkout — the same gate the export flow uses.
    await cta.focus()
    await expect(cta).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test('no placeholder is stamped with a price the row does not carry', async ({ page }) => {
    // LockedPaletteCard hard-codes a "Pro" pill. At this rung the next rows are
    // not Pro's — they come with a free account — so the page renders the wall
    // alone. If that card ever takes a tier-aware label, this is the assertion
    // to come back and relax.
    await expect(page.locator('.lockt-card')).toHaveCount(0)
  })
})

test.describe('a locked library row hands nothing over — signed in, free', () => {
  // The rung where the next step really is Pro, and where the placeholders are
  // rendered. Everything the old signed-out block asserted about the tease
  // lives here now.
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-in free visitor browsing for a palette')
    await signIn(page, { plan: 'free' })
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card').nth(GALLERY_TIER_LIMITS.free - 1)).toBeVisible()
  })

  test('the free rung shows ten palettes and says so', async ({ page }) => {
    await expect(page.locator('.pgal-card')).toHaveCount(GALLERY_TIER_LIMITS.free)
    await expect(page.locator('.drh-head p')).toHaveText(`${GALLERY_TIER_LIMITS.free} palettes`)
  })

  test('no withheld palette colour appears in the text, the markup or the paint', async ({ page }) => {
    expect(FREE_WITHHELD.length, 'no telltale withheld hexes to look for').toBeGreaterThan(19)
    const { text, html, paint } = await surfaces(page)
    const painted = new Set(paint)
    expect(html, 'the open control is missing — the gallery did not render').toContain(FREE_CONTROL)
    expect(FREE_WITHHELD.filter((hex) => text.includes(hex) || text.includes(hex.slice(1))),
      'a withheld hex is readable as text').toEqual([])
    expect(FREE_WITHHELD.filter((hex) => html.includes(hex) || html.includes(hex.slice(1))),
      'a withheld hex is in the markup').toEqual([])
    expect(FREE_WITHHELD.filter((hex) => painted.has(rgbOf(hex))),
      'a withheld colour is painted on an element').toEqual([])
  })

  test('a locked card copies and opens nothing — its one control is the way to Pro', async ({ page }) => {
    const cards = page.locator('.lockt-card')
    await expect(cards).toHaveCount(3)
    // a locked card is blurred
    // and shows "Upgrade to Pro" on hover or focus, going to /plans. So each
    // card carries exactly ONE control, and it is that link — never a button
    // that copies, opens or hands off the item it stands for.
    const controls = cards.locator('button, a, [tabindex]')
    expect(await controls.count(), 'each locked card carries exactly one control').toBe(3)
    for (let i = 0; i < 3; i++) {
      await expect(controls.nth(i)).toHaveAttribute('href', '/plans')
      await expect(controls.nth(i)).toHaveAccessibleName(/^Upgrade to Pro/)
    }
    // Hidden at rest on a mouse, shown on hover — the card is blurred, not greyed.
    const first = cards.first()
    expect(await first.locator('.lockt-stripes').evaluate((e) => getComputedStyle(e).filter)).toMatch(/blur/)
    await first.hover()
    await expect(first.locator('.lockt-upgrade')).toHaveCSS('opacity', '1')
  })

  test('the wall is keyboard reachable, named, and opens the real Pro gate', async ({ page }) => {
    // The failure a recent PR shipped: a card whose only CTA could not be
    // reached by Tab in either direction. So this focuses it the way a keyboard
    // user would rather than clicking it.
    const cta = page.locator('.lockt-cta-btn')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveText(/See what Pro includes/)
    await cta.focus()
    await expect(cta).toBeFocused()
    await page.keyboard.press('Enter')
    // /plans — not a modal.
    await expect(page).toHaveURL(/\/plans$/)
  })

  test('the wall states the true remaining count, not a rounded boast', async ({ page }) => {
    const heading = await page.locator('.lockt-cta-head').first().innerText()
    const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number)
    expect(numbersIn(heading), 'the CTA must name how many rows are locked').toContain(FREE_REMAINING)
  })
})

test.describe('the same gate in the Palette Builder brands panel', () => {
  // The second surface. Its rows paint their swatches through a ref rather than
  // an inline style attribute, so a leak here would be invisible to a markup
  // check and has to be caught in the computed paint.
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor looking for a brand palette')
    await go(page, '/create/palette')
    await (await openPaletteTools(page)).getByRole('button', { name: 'Explore palettes' }).click()
    await page.locator('button[role="tab"]', { hasText: 'Brands' }).click()
    await expect(page.locator('.plb-galpopup-body .plb-varrow').first()).toBeVisible()
  })

  test('the panel lists the free brands, three placeholders and one wall', async ({ page }) => {
    const body = page.locator('.plb-galpopup-body')
    // Free brands are real, loadable rows; the locked tail is placeholders.
    await expect(body.locator('.lockt-row')).toHaveCount(3)
    await expect(body.locator('.lockt-cta-btn')).toHaveCount(1)
    expect(await body.locator('.plb-varrow:not(.lockt-row)').count(),
      'the free brand rows are missing — the panel did not render').toBe(FREE.length)
  })

  test('no locked brand colour is painted into the panel', async ({ page }) => {
    const painted = new Set(await page.locator('.plb-galpopup-body *').evaluateAll(
      (els) => els.map((el) => getComputedStyle(el).backgroundColor)))
    const inPaint = TELLTALE.filter((hex) => painted.has(rgbOf(hex)))
    expect(inPaint, 'a locked brand colour is painted in the builder panel').toEqual([])
    // Positive control: the free brands ARE painted, so the check is real.
    expect([...painted], 'no free brand swatch is painted — the panel did not render')
      .toContain(rgbOf(CONTROL_HEX))
  })

  test('a locked placeholder row cannot be activated', async ({ page }) => {
    const rows = page.locator('.lockt-row')
    expect(await rows.locator('button, a, [tabindex]').count(),
      'a locked row carries a control that would load a brand').toBe(0)
  })

  test('the panel wall goes to /plans', async ({ page }) => {
    // The shared LockedTeaseCta links to /plans; it raises no modal here.
    await page.locator('.plb-galpopup-body .lockt-cta-btn').click()
    await expect(page).toHaveURL(/\/plans$/)
  })
})

test.describe('the locked rows in the dark theme', () => {
  // #343 made the dark theme reachable, so both themes are real surfaces now.
  // colorScheme on the context, not setAttribute — setting the attribute by
  // hand does not re-render React and the assertion would pass against a light
  // page wearing a dark attribute.
  test('placeholders are visible and still leak nothing', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    // Signed in free, because that is the rung the placeholders belong to now:
    // a signed-out visitor gets the wall alone (see the note on the "Pro" pill).
    await signIn(page, { plan: 'free' })
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
    await expect(page.locator('.lockt-card')).toHaveCount(3)
    // The placeholder must actually be painted, not left transparent — a card
    // that vanishes in dark is not a tease, it is a hole in the grid.
    const band = await page.locator('.lockt-stripe').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(band, 'the placeholder band has no ground in dark').not.toBe('rgba(0, 0, 0, 0)')
    const { text, html } = await surfaces(page)
    expect(TELLTALE.filter((hex) => text.includes(hex) || html.includes(hex)),
      'a locked brand hex surfaced in the dark theme').toEqual([])
    await ctx.close()
  })
})
