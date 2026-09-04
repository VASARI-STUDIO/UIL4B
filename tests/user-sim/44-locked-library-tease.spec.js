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
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { BRAND_PALETTES } from '../../src/data/brandPalettes.js'

const ROUTE = '/discover/palettes'

const PAID = BRAND_PALETTES.filter((b) => b.free !== true)
const FREE = BRAND_PALETTES.filter((b) => b.free === true)

// Only the hexes that discriminate. #000000 and #FFFFFF are half the
// stylesheet, so they would fail for reasons unrelated to the gate; what is
// left is every paid colour that is chromatic and appears in no free row.
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

// A free brand that must be present, to prove the page actually rendered.
const CONTROL = FREE.find((b) => !b.colors.every(achromatic))
const CONTROL_HEX = CONTROL.colors.find((c) => !achromatic(c)).toUpperCase()

async function surfaces(page) {
  return page.evaluate(() => ({
    text: document.body.innerText.toUpperCase(),
    html: document.documentElement.outerHTML.toUpperCase(),
    paint: [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).backgroundColor),
  }))
}

test.describe('a locked library row hands nothing over', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor browsing for a palette')
    await go(page, ROUTE)
    await expect(page.locator('.pgal-card').first()).toBeVisible()
  })

  test('the fixture discriminates and the page rendered — controls first', async ({ page }) => {
    // If either of these ever fails, every assertion in this file is vacuous.
    expect(TELLTALE.length, 'no telltale paid hexes to look for').toBeGreaterThan(19)
    const { text, html, paint } = await surfaces(page)
    expect(html, 'the free brand control is missing — the gallery did not render').toContain(CONTROL_HEX)
    expect(paint, 'no free swatch is painted — the gallery did not render').toContain(rgbOf(CONTROL_HEX))
    expect(text.length, 'the page rendered no text').toBeGreaterThan(500)
  })

  test('no paid brand colour appears in the text, the markup or the paint', async ({ page }) => {
    const { text, html, paint } = await surfaces(page)
    const painted = new Set(paint)
    const inText = TELLTALE.filter((hex) => text.includes(hex) || text.includes(hex.slice(1)))
    const inHtml = TELLTALE.filter((hex) => html.includes(hex) || html.includes(hex.slice(1)))
    const inPaint = TELLTALE.filter((hex) => painted.has(rgbOf(hex)))
    expect(inText, 'a locked brand hex is readable as text').toEqual([])
    expect(inHtml, 'a locked brand hex is in the markup — devtools and CSS-off both read it').toEqual([])
    expect(inPaint, 'a locked brand colour is painted on an element — an eyedropper lifts it').toEqual([])
  })

  test('no locked brand colour reaches the accessibility tree', async ({ page }) => {
    // The route a blur cannot close: a screen reader reads the DOM, not the
    // filter. Accessible names are collected rather than the raw tree so the
    // assertion covers aria-label, title and text content together.
    const names = await page.evaluate(() => [...document.querySelectorAll('[aria-label],[title],button,a')]
      .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
      .join(' | ').toUpperCase())
    const leaked = TELLTALE.filter((hex) => names.includes(hex) || names.includes(hex.slice(1)))
    expect(leaked, 'a locked brand hex is in an accessible name').toEqual([])
    // Positive control: the FREE brands' hexes are in there, because their
    // swatches carry a "Copy #xxxxxx" label. So the check above is real.
    expect(names, 'no free hex in any accessible name — this assertion is vacuous').toContain(CONTROL_HEX)
  })

  test('nothing on a locked card can be clicked, copied or tabbed into', async ({ page }) => {
    const cards = page.locator('.lockt-card')
    await expect(cards).toHaveCount(3)
    // A locked card holds no control at all — no button, no link, no tabindex.
    // A disabled-looking control that copies an empty string is still a control
    // a keyboard user has to walk past.
    expect(await cards.locator('button, a, [tabindex]').count(),
      'a locked placeholder carries a focusable control').toBe(0)
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
    // The canonical upgrade modal, not a second one built for this surface.
    await expect(page.locator('[role="dialog"]').filter({ hasText: 'The full brand library' })).toBeVisible()
  })

  test('the wall states the true remaining count, not a rounded boast', async ({ page }) => {
    const heading = await page.locator('.lockt-cta-head').first().textContent()
    expect(heading, 'the CTA must name how many rows are locked').toContain(String(PAID.length))
  })
})

test.describe('the same gate in the Palette Builder brands panel', () => {
  // The second surface. Its rows paint their swatches through a ref rather than
  // an inline style attribute, so a leak here would be invisible to a markup
  // check and has to be caught in the computed paint.
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor looking for a brand palette')
    await go(page, '/create/palette')
    await page.locator('button[aria-label="Explore"]').click()
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

  test('the panel wall opens the canonical Pro modal under its own gate id', async ({ page }) => {
    await page.locator('.plb-galpopup-body .lockt-cta-btn').click()
    await expect(page.locator('[role="dialog"]').filter({ hasText: 'Load any brand system' })).toBeVisible()
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
