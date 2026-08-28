// The two founder requests of 2026-08-08, measured in a browser.
//
//   1. "a 2-stop linear gradient should come up slightly more often than the
//      rest — a weighting, not an exclusion"
//   2. "the nav search bar expands on hover and shows a typing animation
//      cycling common search terms" (respecting reduced motion, and without
//      regressing the homepage CLS/LCP budgets)
//
// The weighting's arithmetic is asserted exactly, without a browser, in
// tests/unit/gradient-random.test.js. What is left for here is the part a unit
// test cannot see: that the tool is actually WIRED to it, and that pressing
// Random still reaches every type rather than getting stuck on linear.
import { test, expect } from './base.js'
import { watch } from './helpers.js'

// ── 1 · the gradient randomiser ──────────────────────────────────────────────

test.describe('gradient randomiser weighting', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'designer hitting Random') })

  // 60 presses is enough to be decisive about "excludes nothing" without being
  // a coin-flip test: at the shipped 25% per non-linear type, the chance of
  // never seeing one of them in 60 draws is about 1 in 5 million.
  //
  // THIS TEST USED TO ALSO ASSERT "AND LINEAR MOST OFTEN". That was a mistake,
  // and CI caught it: 60 draws at 50/25/25 produced linear 24, radial 24, and
  // the run went red on a tie. The expected counts are 30 and 15, so a tie is
  // rare — and "rare" is not a property a build gate may depend on.
  //
  // Sampling a random source can only ever be probably-right. The distribution
  // is asserted EXACTLY, over a 100,000-point grid of the roll space, in
  // tests/unit/gradient-random.test.js, and the unit suite additionally pins
  // that this page calls the weighted pickers rather than rolling its own. What
  // is left here is the one claim a browser is needed for and that no draw can
  // flip: every type is still reachable.
  test('Random reaches every type', async ({ page }) => {
    await page.goto('/create/gradient')
    const random = page.getByRole('button', { name: 'Random', exact: true })
    await expect(random).toBeVisible()

    const seen = { Linear: 0, Radial: 0, Conic: 0 }
    for (let i = 0; i < 60; i++) {
      await random.click()
      const type = await page.evaluate(() => {
        const on = document.querySelector('.ggn-seg-btn.is-on')
        return on?.textContent?.trim() || null
      })
      if (type && type in seen) seen[type]++
    }

    // The toggle was actually readable — without this, a selector that stopped
    // matching would make the exclusion check below vacuously true.
    expect(Object.values(seen).reduce((a, b) => a + b, 0), 'no type could be read from the toggle').toBeGreaterThan(50)
    for (const [type, n] of Object.entries(seen)) {
      expect(n, `${type} never came up in 60 presses — that is an exclusion, not a weighting`).toBeGreaterThan(0)
    }
  })
})

// ── 2 · the nav search field ─────────────────────────────────────────────────

const FIELD = '.pnav-search-field'
const WRAP = '.pnav-search'
// NOT the homepage. `.pnav--sales .pnav-search-field{display:none}` hides the
// field on desktop sales routes — the bar there leads with the three menus and
// Get Pro — so a nav-search test pointed at /home measures a hidden element and
// fails for the wrong reason. A Create route is where the field actually lives.
const ROUTE = '/create/palette'

async function fieldWidth(page) {
  return page.locator(WRAP).evaluate(el => el.getBoundingClientRect().width)
}

test.describe('nav search hover', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'first-time visitor scanning the nav') })

  test('hovering widens the field, and leaving puts it back', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.locator(FIELD)).toBeVisible()
    const rest = await fieldWidth(page)

    await page.locator(FIELD).hover()
    await expect.poll(() => fieldWidth(page)).toBeGreaterThan(rest + 40)

    // Somewhere that is not the field, and not a menu trigger.
    await page.mouse.move(4, 300)
    await expect.poll(() => fieldWidth(page)).toBeLessThan(rest + 5)
  })

  test('the three centre menus do not move when it expands', async ({ page }) => {
    await page.goto(ROUTE)
    const items = page.locator('.pnav-items')
    await expect(items).toBeVisible()
    const before = await items.boundingBox()
    await page.locator(FIELD).hover()
    await expect.poll(() => fieldWidth(page)).toBeGreaterThan(0)
    const after = await items.boundingBox()
    // `1fr auto 1fr` is what guarantees this; the assertion is here because a
    // later change to those tracks would silently make the nav jump on hover.
    expect(Math.abs(after.x - before.x)).toBeLessThan(1)
  })

  // Sampled inside the page rather than round-tripped: two Playwright reads a
  // beat apart can both land on a completed word (the animation holds for over
  // a second at the end of each term) and read as "no progress", which is a
  // flake, not a finding.
  test('hovering types terms a character at a time, and cycles through them', async ({ page }) => {
    await page.goto(ROUTE)
    await page.locator(FIELD).hover()
    await expect(page.locator('.pnav-search-ph--typing')).toBeVisible()

    const samples = await page.evaluate(async () => {
      const seen = []
      for (let i = 0; i < 200; i++) {
        seen.push(document.querySelector('.pnav-search-ph--typing')?.textContent ?? null)
        await new Promise(r => setTimeout(r, 30))
      }
      return seen
    })

    const words = [...new Set(samples.filter(Boolean))]
    // Character-by-character: many distinct lengths, not a word appearing whole.
    const lengths = new Set(words.map(w => w.length))
    expect(lengths.size, `only saw lengths ${[...lengths]}`).toBeGreaterThan(5)

    // Cycling: a "term" is a sample no other sample extends. Two of those in one
    // window means it finished one word and started a different one. Nothing
    // here pins the copy — the terms themselves are free to change.
    const terms = words.filter(w => !words.some(other => other !== w && other.startsWith(w)))
    expect(terms.length, `only ever typed ${terms}`).toBeGreaterThan(1)
  })

  // The button's accessible name has to stay fixed. A screen reader following a
  // half-typed word character by character is noise, not information.
  test('the typing is invisible to assistive technology', async ({ page }) => {
    await page.goto(ROUTE)
    const field = page.locator(FIELD)
    await expect(field).toHaveAttribute('aria-label', 'Search UIL4B')
    await field.hover()
    await expect(page.locator('.pnav-search-ph--typing')).toHaveAttribute('aria-hidden', 'true')
    await expect(field).toHaveAttribute('aria-label', 'Search UIL4B')
  })

  test('reduced motion gets the static label and no timer at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(ROUTE)
    await page.locator(FIELD).hover()
    // The static placeholder stays put; nothing types.
    await expect(page.locator('.pnav-search-ph--typing')).toHaveCount(0)
    await expect(page.locator('.pnav-search-ph')).toHaveText(/Search tools/)
  })

  // The budget guard on `homepage-field-metrics`: this must cost nothing until
  // the pointer arrives. (On desktop the homepage does not render the field at
  // all, so the budget is doubly safe there; this asserts the general property
  // on the route that does render it.)
  test('nothing runs before the pointer arrives', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.locator(FIELD)).toBeVisible()
    await page.waitForTimeout(400)
    await expect(page.locator('.pnav-search-ph--typing')).toHaveCount(0)
  })
})
