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
import { go, watch } from './helpers.js'

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
    await go(page, '/create/gradient')
    const random = page.getByRole('button', { name: 'Random', exact: true })
    await expect(random).toBeVisible()

    const seen = { Linear: 0, Radial: 0, Conic: 0 }
    for (let i = 0; i < 60; i++) {
      await random.click()
      const type = await page.evaluate(() => {
        const on = document.querySelector('[aria-label="Gradient type"] .tl-pill.is-on')
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
// NOT the homepage. `.pnav--sales .pnav-search-field{display:none}` hides the
// field on desktop sales routes — the bar there leads with the three menus and
// Get Pro — so a nav-search test pointed at /home measures a hidden element and
// fails for the wrong reason. A Create route is where the field actually lives.
const ROUTE = '/create/palette'

// The FIELD, not the wrapper. The wrapper is a reserved slot that holds the
// expanded width at all times (see global.css, `.pnav-search`); the field is the
// box a visitor sees grow, so it is the one measured.
async function fieldWidth(page) {
  return page.locator(FIELD).evaluate(el => el.getBoundingClientRect().width)
}

test.describe('nav search hover', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'first-time visitor scanning the nav') })

  // THE FIELD DOES NOT WIDEN ON HOVER: the App file (line 103) draws it at flex 1 1 240px
  // up to 380px with a hover wash and nothing else, and the file is the spec.
  // What is held is the typing placeholder (the test below) and that nothing moves.
  test('hovering keeps the field at its drawn width, and leaving leaves it there', async ({ page }) => {
    await go(page, ROUTE)
    await expect(page.locator(FIELD)).toBeVisible()
    const rest = await fieldWidth(page)
    expect(rest, 'the field is the file\'s 380px at 1440').toBeGreaterThan(370)

    await page.locator(FIELD).hover()
    await expect(page.locator('.pnav-search.is-hot')).toHaveCount(1)
    expect(Math.abs(await fieldWidth(page) - rest)).toBeLessThan(1)

    // Somewhere that is not the field, and not a menu trigger.
    await page.mouse.move(4, 300)
    await expect.poll(() => fieldWidth(page)).toBeLessThan(rest + 5)
  })

  // THE WHOLE EXPANSION IS WATCHED, NOT ONE READ AFTER THE HOVER. This used to
  // hover, poll `width > 0` — true before anything had happened — and read the
  // menus once. On a fast machine that read landed before React had even
  // applied `.is-hot`, so it passed while the menus were being shoved 90px to
  // the right; CI's slower runner read them 73px into the slide. So: every
  // frame from the hover until the field's own width transition has finished
  // (the animation layer, not a stopwatch), the largest drift of the menus AND
  // of the theme cycle beside them — and the expansion is proven to have
  // happened, or "nothing moved" would be true of a hover that did nothing.
  test('the three centre menus do not move when it expands', async ({ page }) => {
    await go(page, ROUTE)
    await expect(page.locator('.pnav-items')).toBeVisible()
    const rest = await fieldWidth(page)

    const watching = page.evaluate(() => new Promise((done) => {
      const x = (sel) => document.querySelector(sel).getBoundingClientRect().x
      const field = document.querySelector('.pnav-search-field')
      const start = { items: x('.pnav-items'), theme: x('.pnav-theme') }
      const drift = { items: 0, theme: 0 }
      let frames = 0
      const t0 = performance.now()
      const tick = () => {
        frames += 1
        drift.items = Math.max(drift.items, Math.abs(x('.pnav-items') - start.items))
        drift.theme = Math.max(drift.theme, Math.abs(x('.pnav-theme') - start.theme))
        const hot = !!document.querySelector('.pnav-search.is-hot')
        const moving = field.getAnimations().some((a) => a.playState === 'running')
        if ((hot && !moving) || performance.now() - t0 > 5000) {
          return done({ drift, frames, hot, width: field.getBoundingClientRect().width })
        }
        return requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }))
    await page.locator(FIELD).hover()
    const seen = await watching

    expect(seen.hot, 'the hover never reached the field, so nothing was measured').toBe(true)
    expect(Math.abs(seen.width - rest), 'the field changed width on hover').toBeLessThan(1)
    expect(seen.drift.items, `the section menus slid ${seen.drift.items}px while the search expanded`).toBeLessThan(1)
    expect(seen.drift.theme, `the theme cycle slid ${seen.drift.theme}px while the search expanded`).toBeLessThan(1)
  })

  // Sampled inside the page rather than round-tripped: two Playwright reads a
  // beat apart can both land on a completed word (the animation holds for over
  // a second at the end of each term) and read as "no progress", which is a
  // flake, not a finding.
  test('hovering types terms a character at a time, and cycles through them', async ({ page }) => {
    await go(page, ROUTE)
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
    await go(page, ROUTE)
    const field = page.locator(FIELD)
    await expect(field).toHaveAttribute('aria-label', 'Search UIL4B')
    await field.hover()
    await expect(page.locator('.pnav-search-ph--typing')).toHaveAttribute('aria-hidden', 'true')
    await expect(field).toHaveAttribute('aria-label', 'Search UIL4B')
  })

  test('reduced motion gets the static label and no timer at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await go(page, ROUTE)
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
    await go(page, ROUTE)
    await expect(page.locator(FIELD)).toBeVisible()
    await page.waitForTimeout(400)
    await expect(page.locator('.pnav-search-ph--typing')).toHaveCount(0)
  })
})
