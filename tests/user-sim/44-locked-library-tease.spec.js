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
// The tiers (GALLERY_TIER_LIMITS: a cap signed out, a larger one with a free
// account, everything with Pro) mean the withheld set is no longer "the paid
// brands". It is now "everything past this viewer's cap", which at the bottom
// rung is most of the library and at the free rung is all but the free cap. Every
// assertion below is therefore derived PER RUNG rather than from the brand flag,
// and the file covers two rungs instead of one: signed out, where the next step
// is a free account, and signed in free, where it is Pro. The Palette Builder's
// brands panel is unchanged and still gates on the flag alone, so its block is
// untouched.
//
// ── WHAT CHANGED WITH THE V3 TILES AND LibraryGate ─────────────
//
// The open results are `.lib-results .vpt` tiles (VerticalPanelTile): stacked
// `.vpt-band` spans painted by an inline style, a name and a meta line, and one
// "Preview {name}" button. There are no hex chips, no "Copy #xxxxxx" labels and no
// hex text any more, so:
//   - the markup sweep looks for each hex in both spellings, "#RRGGBB" and the
//     "rgb(r, g, b)" a browser writes back for an inline style (outerHTML never
//     shows the hex a style was set from);
//   - the accessibility-tree positive control is the open rows' "Preview {name}"
//     names, not a hex.
// The gate under the results is LibraryGate (components/library/LibraryGate.jsx):
// `.geg[data-gate="anon"|"free"]`, "Create a free account" and "Log in" buttons
// signed out (no plans link), "Upgrade to Pro" for a free account. Its faded tiles
// (`[data-gate-fade]`) are the next free rows, real and stamped "Free account",
// then locked stand-ins that wear the ramp (never a Pro row's colours) and are
// stamped "Pro". Signed out the primary is a button, so the fade is a click
// shortcut to it and is not `inert`; for a free account the primary is a link and
// the fade is `inert`.
//
// MUTATIONS this file goes red on:
//   - paint a withheld row's real colours into a faded stand-in (standinFromStub
//     in utils/gateStandins.js): the fade and whole-page sweeps go red;
//   - render a locked row as an open tile in the results (drop `locked` handling
//     in the page's grid): the "no locked tile" tests go red;
//   - let the cap in utils/lockedPreview.js drift from what the page lists: the
//     rung count tests go red;
//   - stamp a faded tile with the wrong tier (a next free row as "Pro", or a
//     withheld row as "Free account", in LibraryGate's fadeItemsFor): the stamp test
//     goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'
import { BRAND_PALETTES } from '../../api/_lib/library/brandPalettes.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'
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
// A colour is "in the markup" if the page's HTML (upper-cased by `surfaces`) holds
// it as hex, as bare hex digits, or as the rgb() an inline style serialises to.
const inMarkup = (html, hex) => html.includes(hex) || html.includes(hex.slice(1)) || html.includes(rgbOf(hex).toUpperCase())
// The open tiles of the results; the end gate's faded tiles sit outside `.lib-results`.
const OPEN = '.lib-results .vpt'
const FADE = '[data-gate-fade]'

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

// The colours the signed-out gate's faded tiles may show: the free-tier palettes
// a free account opens next. They are real, so they sit in the fade (aria-hidden)
// and nowhere else. Chromatic and not in an open row, so each one discriminates.
const FADE_TAIL = [...hexesOf(RUNGS.free)].filter((hex) => !achromatic(hex) && !hexesOf(RUNGS.anonymous).has(hex))
// The next free rows a signed-out visitor is shown faded, in library order, and the
// names of the rows already open to them.
const FREE_NEXT = ELIGIBLE.slice(GALLERY_TIER_LIMITS.anonymous, GALLERY_TIER_LIMITS.free)
const FREE_NEXT_NAMES = new Set(FREE_NEXT.map((p) => p.name))
const ANON_OPEN_NAMES = new Set(RUNGS.anonymous.map((p) => p.name))

// The end gate's faded tiles are decoration: hidden from assistive tech, and
// nothing in them takes focus (a locked tile renders no button or link). The
// positive control is the tiles themselves: with none, "no control" is vacuous.
// Whether the fade is also `inert` depends on the gate's primary control: a button
// makes it a click shortcut (signed out), a link leaves it inert (free account).
async function expectFadeUnreachable(fade, { inert }) {
  await expect(fade).toHaveAttribute('aria-hidden', 'true')
  expect(await fade.locator('.vpt--locked').count(), 'the faded tiles are missing - the focus check would be vacuous').toBeGreaterThan(3)
  expect(await fade.locator('a, button, input, select, textarea, [tabindex]').count(), 'a faded tile holds a control').toBe(0)
  if (inert) {
    await expect(fade).toHaveAttribute('inert', '')
    await expect(fade).toHaveCSS('pointer-events', 'none')
  }
}

// What the page hands over. `skipFade` leaves the end gate's faded tiles out,
// leaving the live gallery and the rest of the page (text, markup and paint alike).
async function surfaces(page, { skipFade = false } = {}) {
  return page.evaluate((skip) => {
    const root = document.documentElement.cloneNode(true)
    const fades = skip ? [...document.querySelectorAll('[data-gate-fade]')] : []
    if (skip) root.querySelectorAll('[data-gate-fade]').forEach((n) => n.remove())
    const shown = fades.map((f) => f.style.display)
    fades.forEach((f) => { f.style.display = 'none' })
    const text = document.body.innerText.toUpperCase()
    fades.forEach((f, i) => { f.style.display = shown[i] })
    return {
      text,
      html: root.outerHTML.toUpperCase(),
      paint: [...document.querySelectorAll('*')].filter((el) => !skip || !el.closest('[data-gate-fade]')).map((el) => getComputedStyle(el).backgroundColor),
    }
  }, skipFade)
}

test.describe('a locked library row hands nothing over — signed out', () => {
  // A fixed desktop width, so the fade is two full rows of the grid's own columns:
  // the next free rows first, then locked stand-ins (a narrower grid can end the
  // fade before the first stand-in, and the stamp test needs both kinds).
  test.use({ viewport: { width: 1440, height: 900 } })
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor browsing for a palette')
    await go(page, ROUTE)
    await expect(page.locator(OPEN).first()).toBeVisible()
  })

  test('the fixture discriminates and the page rendered — controls first', async ({ page }) => {
    // If any of these ever fails, every assertion in this block is vacuous.
    expect(ANON_WITHHELD.length, 'no telltale withheld hexes to look for').toBeGreaterThan(19)
    const { text, html, paint } = await surfaces(page)
    expect(inMarkup(html, ANON_CONTROL), 'the open control is missing — the gallery did not render').toBe(true)
    expect(paint, 'no open swatch is painted — the gallery did not render').toContain(rgbOf(ANON_CONTROL))
    expect(text.length, 'the page rendered no text').toBeGreaterThan(500)
  })

  test('the signed-out rung shows its capped palettes and says so', async ({ page }) => {
    // The signed-out cap, checked on the page rather than in a unit test. The count
    // line is the honesty check: a page showing only the cap may not claim the size
    // of the whole library, in the masthead or anywhere in it.
    await expect(page.locator(OPEN)).toHaveCount(GALLERY_TIER_LIMITS.anonymous)
    await expect(page.locator('.drh-head p')).toHaveText(`${LIBRARY_PALETTES.length} palettes · ${GALLERY_TIER_LIMITS.anonymous} shown`)
    await expect(page.locator('.dgh-hero')).not.toContainText(String(LIBRARY_PALETTES.length))
    await expect(page.locator('.dgh-hero')).not.toContainText(/\d+\s+palettes/i)
  })

  test('no withheld palette colour appears in the text, the markup or the paint', async ({ page }) => {
    // Two sweeps. The page outside the end gate's faded tiles holds none of the
    // capped tail. And the page as a whole, faded tiles included, holds nothing
    // past the free rung: the fade may show the free-tier palettes a free account
    // opens next, and no Pro palette's colour.
    const live = await surfaces(page, { skipFade: true })
    const livePainted = new Set(live.paint)
    expect(ANON_WITHHELD.filter((hex) => live.text.includes(hex) || live.text.includes(hex.slice(1))),
      'a withheld hex is readable as text').toEqual([])
    expect(ANON_WITHHELD.filter((hex) => inMarkup(live.html, hex)),
      'a withheld hex is in the markup — devtools and CSS-off both read it').toEqual([])
    expect(ANON_WITHHELD.filter((hex) => livePainted.has(rgbOf(hex))),
      'a withheld colour is painted on an element — an eyedropper lifts it').toEqual([])
    const all = await surfaces(page)
    const allPainted = new Set(all.paint)
    expect(FREE_WITHHELD.filter((hex) => all.text.includes(hex) || all.text.includes(hex.slice(1))),
      'a Pro hex is readable as text').toEqual([])
    expect(FREE_WITHHELD.filter((hex) => inMarkup(all.html, hex)),
      'a Pro hex is in the markup').toEqual([])
    expect(FREE_WITHHELD.filter((hex) => allPainted.has(rgbOf(hex))), 'a Pro colour is painted on an element').toEqual([])
    // Positive control: the fade really carries free-tier colours, so "none outside
    // it" is a statement about where they are, not about their absence.
    expect(FADE_TAIL.length, 'no free-tier tail hexes to look for').toBeGreaterThan(3)
    expect(FADE_TAIL.filter((hex) => inMarkup(all.html, hex)).length, 'the fade carries no free-tier colour').toBeGreaterThan(0)
  })

  test('no withheld palette colour reaches the accessibility tree', async ({ page }) => {
    // The route a blur cannot close: a screen reader reads the DOM, not the
    // filter. Accessible names are collected rather than the raw tree so the
    // assertion covers aria-label, title and text content together.
    // The faded tiles are aria-hidden, so they are not in the tree a screen
    // reader reads (checked below); they are left out of the sweep.
    const names = await page.evaluate(() => [...document.querySelectorAll('[aria-label],[title],button,a')]
      .filter((el) => !el.closest('[aria-hidden="true"]'))
      .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
      .join(' | ').toUpperCase())
    const leaked = ANON_WITHHELD.filter((hex) => names.includes(hex) || names.includes(hex.slice(1)))
    expect(leaked, 'a withheld hex is in an accessible name').toEqual([])
    // Positive control: the OPEN tiles are in there by name, because each one's
    // button is labelled "Preview {name}" (a tile carries no hex of its own any
    // more). So the sweep above ran over the real controls.
    const openNames = RUNGS.anonymous.map((p) => `PREVIEW ${p.name.toUpperCase()}`)
    expect(openNames.filter((n) => !names.includes(n)), 'an open tile has no Preview control — this assertion is vacuous').toEqual([])
  })

  test('the signed-out gate offers the free account, and offers it honestly', async ({ page }) => {
    // THE RUNG MISMATCH THIS PREVENTS: selling a purchase to somebody whose
    // next step costs nothing. Some of the withheld palettes (the gain between
    // the two caps) arrive with a free account, so "another N with Pro" would be
    // false here even though every number in it is real. The gate is LibraryGate's
    // account variant: "Log in to access N palettes", where N is what a free
    // account opens in all, a "Create a free account" button and a "Log in"
    // button, and no plans link (Pro is the rung after the free account).
    const gate = page.locator('.geg[data-gate="anon"]')
    await expect(gate).toBeVisible()
    const cta = gate.getByRole('button', { name: 'Create a free account', exact: true })
    await expect(cta).toBeVisible()
    await expect(gate.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
    await expect(gate.getByRole('link'), 'the account gate offers no plans link').toHaveCount(0)
    // Read as NUMBERS rather than as substrings: `toContain('7')` is satisfied
    // by "Another 98 palettes" — the Pro remainder — which is precisely the
    // wrong answer this assertion exists to catch.
    const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number)
    const heading = await gate.getByRole('heading').innerText()
    expect(heading).toBe(`Log in to access ${GALLERY_TIER_LIMITS.free} palettes`)
    expect(numbersIn(heading), 'the heading must name what an ACCOUNT opens in all').toContain(GALLERY_TIER_LIMITS.free)
    expect(numbersIn(heading), 'the heading must not price the Pro remainder').not.toContain(LIBRARY_PALETTES.length)
    const body = await gate.locator('.geg-p').innerText()
    expect(numbersIn(body), 'the gate must state what this viewer has now')
      .toContain(GALLERY_TIER_LIMITS.anonymous)
    expect(numbersIn(body), 'the gate must state the size of the library it is metering')
      .toContain(LIBRARY_PALETTES.length)
    expect(numbersIn(body), 'the gate must state what the next rung actually opens')
      .toContain(GALLERY_TIER_LIMITS.free)
    expect(ANON_GAIN, 'the rung gain is the gap between the two caps').toBe(GALLERY_TIER_LIMITS.free - GALLERY_TIER_LIMITS.anonymous)
    // Keyboard reachable, and it opens the app's own sign-in dialog rather
    // than a checkout — the same gate the export flow uses.
    await cta.focus()
    await expect(cta).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test('no placeholder is stamped with a price the row does not carry', async ({ page }) => {
    // The faded tiles under the gate are the next free-tier palettes (a free
    // account opens them, so they are stamped "Free account") followed by locked
    // stand-ins for rows past the free cap (stamped "Pro"). They carry text, so the
    // guard is that the subtree is hidden from assistive tech and unfocusable, and
    // that each stamp is true of its row: a next free row is never stamped Pro, and
    // a withheld row is never stamped "Free account". No locked tile is among the
    // open results.
    await expect(page.locator('.lib-results .vpt--locked')).toHaveCount(0)
    const fade = page.locator(`.geg[data-gate="anon"] ${FADE}`)
    // A button primary leaves the fade a click shortcut to it, so it is not inert.
    await expectFadeUnreachable(fade, { inert: false })
    const tiles = await fade.locator('.vpt').evaluateAll((els) => els.map((el) => ({
      name: el.querySelector('.vpt-name').textContent.trim(),
      meta: el.querySelector('.vpt-meta').textContent.trim(),
    })))
    const stampedFree = tiles.filter((t) => t.meta.startsWith('Free account'))
    const stampedPro = tiles.filter((t) => t.meta.startsWith('Pro'))
    expect(stampedFree.length, 'no tile is stamped Free account — the stamp check would be vacuous').toBeGreaterThan(0)
    expect(stampedPro.length, 'no tile is stamped Pro — the stamp check would be vacuous').toBeGreaterThan(0)
    expect(stampedFree.length + stampedPro.length, 'a faded tile carries neither stamp').toBe(tiles.length)
    expect(stampedFree.filter((t) => !FREE_NEXT_NAMES.has(t.name)), 'a tile is stamped Free account but a free account does not open it next').toEqual([])
    expect(stampedPro.filter((t) => FREE_NEXT_NAMES.has(t.name) || ANON_OPEN_NAMES.has(t.name)), 'an open or next-free row is stamped Pro').toEqual([])
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
    await expect(page.locator(OPEN).nth(GALLERY_TIER_LIMITS.free - 1)).toBeVisible()
  })

  test('the free rung shows its capped palettes and says so', async ({ page }) => {
    await expect(page.locator(OPEN)).toHaveCount(GALLERY_TIER_LIMITS.free)
    await expect(page.locator('.drh-head p')).toHaveText(`${LIBRARY_PALETTES.length} palettes · ${GALLERY_TIER_LIMITS.free} shown`)
    // The masthead is held to the same honesty: only the cap shown, so no library total.
    await expect(page.locator('.dgh-hero')).not.toContainText(String(LIBRARY_PALETTES.length))
    await expect(page.locator('.dgh-hero')).not.toContainText(/\d+\s+palettes/i)
  })

  test('no withheld palette colour appears in the text, the markup or the paint', async ({ page }) => {
    expect(FREE_WITHHELD.length, 'no telltale withheld hexes to look for').toBeGreaterThan(19)
    const { text, html, paint } = await surfaces(page)
    const painted = new Set(paint)
    expect(inMarkup(html, FREE_CONTROL), 'the open control is missing — the gallery did not render').toBe(true)
    expect(painted.has(rgbOf(FREE_CONTROL)), 'no open swatch is painted — the gallery did not render').toBe(true)
    expect(FREE_WITHHELD.filter((hex) => text.includes(hex) || text.includes(hex.slice(1))),
      'a withheld hex is readable as text').toEqual([])
    expect(FREE_WITHHELD.filter((hex) => inMarkup(html, hex)),
      'a withheld hex is in the markup').toEqual([])
    expect(FREE_WITHHELD.filter((hex) => painted.has(rgbOf(hex))),
      'a withheld colour is painted on an element').toEqual([])
  })

  test('the faded rows copy and open nothing — the one control is the way to Pro', async ({ page }) => {
    // The faded tiles under the gate are the gallery's own locked tiles over
    // neutral stand-ins (a withheld row's name, never its colours). They are hidden
    // from assistive tech, inert, click-through and unfocusable. The gate holds the
    // single way on, a link to /plans.
    const gate = page.locator('.geg[data-gate="free"]')
    await expect(gate).toBeVisible()
    const fade = gate.locator(FADE)
    await expectFadeUnreachable(fade, { inert: true })
    // Blurred, not greyed: the first row a little, the second a lot.
    expect(await fade.locator('.geg-row[data-row="0"]').evaluate((e) => getComputedStyle(e).filter)).toMatch(/blur/)
    expect(await fade.locator('.geg-row[data-row="1"]').evaluate((e) => getComputedStyle(e).filter)).toMatch(/blur/)
    // No Pro value: not a withheld hex, in the markup or the paint.
    const html = (await fade.evaluate((el) => el.outerHTML)).toUpperCase()
    expect(FREE_WITHHELD.filter((hex) => inMarkup(html, hex)), 'a Pro hex is in the fade').toEqual([])
    const painted = new Set(await fade.locator('*').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor)))
    expect(FREE_WITHHELD.filter((hex) => painted.has(rgbOf(hex))), 'a Pro colour is painted in the fade').toEqual([])
    // Positive control: the fade IS painted (in the ramp), so "no Pro colour" is not
    // true only because nothing was drawn.
    expect(await fade.locator('.vpt-band').count(), 'the faded tiles have no colour bands - the paint check is vacuous').toBeGreaterThan(0)
    const controls = gate.locator('.geg-band a, .geg-band button')
    expect(await controls.count(), 'the gate has exactly one way on at this rung').toBe(1)
    await expect(controls.first()).toHaveAttribute('href', '/plans')
  })

  test('the gate is keyboard reachable, named, and goes to the plans', async ({ page }) => {
    // The failure a recent PR shipped: a card whose only CTA could not be
    // reached by Tab in either direction. So this focuses it the way a keyboard
    // user would rather than clicking it.
    const gate = page.locator('.geg[data-gate="free"]')
    const cta = gate.getByRole('link', { name: 'Upgrade to Pro', exact: true })
    await expect(cta).toBeVisible()
    await cta.focus()
    await expect(cta).toBeFocused()
    await page.keyboard.press('Enter')
    // /plans — not a modal.
    await expect(page).toHaveURL(/\/plans$/)
  })

  test('the gate states the true remaining count, not a rounded boast', async ({ page }) => {
    const gate = page.locator('.geg[data-gate="free"]')
    const heading = await gate.getByRole('heading').innerText()
    expect(heading).toBe(`${FREE_REMAINING} more palettes with Pro`)
    const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number)
    expect(numbersIn(heading), 'the gate must name how many rows are locked').toContain(FREE_REMAINING)
  })
})

test.describe('the masthead count — signed in, Pro', () => {
  test('the Pro rung names the full library size in the hero', async ({ page }) => {
    watch(page, 'a Pro member browsing for a palette')
    await signIn(page, { plan: 'pro' })
    await go(page, ROUTE)
    await expect(page.locator(OPEN).first()).toBeVisible()
    // Pro sees every palette, so the masthead may state the whole library.
    await expect(page.locator('.dgh-hero')).toContainText(`${LIBRARY_PALETTES.length} palettes`)
    // And nothing is locked for them: no locked tiles, no wall.
    await expect(page.locator('.vpt--locked')).toHaveCount(0)
    await expect(page.locator('.geg')).toHaveCount(0)
  })
})

test.describe('the same gate in the Palette Builder Explore Brands tab', () => {
  // The second surface. Its rows paint their swatches through a ref rather than
  // an inline style attribute, so a leak here would be invisible to a markup
  // check and has to be caught in the computed paint.
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor looking for a brand palette')
    await go(page, '/create/palette')
    await clickPaletteAction(page, 'Explore palettes and brands')
    await page.locator('button[role="tab"]', { hasText: 'Brands' }).click()
    await expect(page.locator('.plb-sx-body .plb-sw-row').first()).toBeVisible()
  })

  test('the panel lists the free brands, three placeholders and one wall', async ({ page }) => {
    const body = page.locator('.plb-sx')
    // Free brands are real, loadable rows; the locked tail is placeholders.
    await expect(body.locator('.plb-sw-row.is-static')).toHaveCount(3)
    await expect(body.locator('.plb-sw-problock a.tl-btn')).toHaveCount(1)
    expect(await body.locator('button.plb-sw-row:not(.is-locked)').count(),
      'the free brand rows are missing — the panel did not render').toBe(FREE.length)
  })

  test('no locked brand colour is painted into the panel', async ({ page }) => {
    const painted = new Set(await page.locator('.plb-sx-body *').evaluateAll(
      (els) => els.map((el) => getComputedStyle(el).backgroundColor)))
    const inPaint = TELLTALE.filter((hex) => painted.has(rgbOf(hex)))
    expect(inPaint, 'a locked brand colour is painted in the builder panel').toEqual([])
    // Positive control: the free brands ARE painted, so the check is real.
    expect([...painted], 'no free brand swatch is painted — the panel did not render')
      .toContain(rgbOf(CONTROL_HEX))
  })

  test('a locked placeholder row cannot be activated', async ({ page }) => {
    const rows = page.locator('.plb-sx .plb-sw-row.is-static')
    // Positive control: the locked rows are really there, so "no controls" means something.
    await expect(rows).toHaveCount(3)
    // The row itself counts too: the placeholder is the element a click or Tab would land on.
    const CONTROL_SEL = 'button, a, [tabindex]'
    expect(await rows.evaluateAll((els, sel) => els.filter((el) => el.matches(sel) || el.querySelector(sel)).length, CONTROL_SEL),
      'a locked row carries a control that would load a brand').toBe(0)
  })

  test('the panel wall goes to /plans', async ({ page }) => {
    // The panel's Pro block is a link to /plans; it raises no modal here.
    await page.locator('.plb-sw-problock a.tl-btn').click()
    await expect(page).toHaveURL(/\/plans$/)
  })
})

test.describe('the locked rows in the dark theme', () => {
  // The dark theme is reachable, so both themes are real surfaces.
  // colorScheme on the context, not setAttribute — setting the attribute by
  // hand does not re-render React and the assertion would pass against a light
  // page wearing a dark attribute.
  test('placeholders are visible and still leak nothing', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    // Signed in free, the rung whose gate offers Pro.
    await signIn(page, { plan: 'free' })
    await go(page, ROUTE)
    await expect(page.locator(OPEN).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
    expect(await page.locator(`${FADE} .vpt`).count(), 'the faded rows are missing').toBeGreaterThan(3)
    // The faded tiles must actually be painted, not left transparent — a row
    // that vanishes in dark is not a tease, it is a hole in the page. A stand-in's
    // colour band is the first thing to paint.
    const band = await page.locator(`${FADE} .vpt-band`).first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(band, 'the faded tile has no ground in dark').not.toBe('rgba(0, 0, 0, 0)')
    const { text, html } = await surfaces(page)
    expect(TELLTALE.filter((hex) => text.includes(hex) || inMarkup(html, hex)),
      'a locked brand hex surfaced in the dark theme').toEqual([])
    await ctx.close()
  })
})
