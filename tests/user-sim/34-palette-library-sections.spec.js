// The Palette Library browses in categories.
//
// Founder request (2026-08-08): "trending/popular first, then brand palettes,
// then community". Two of those three do not exist and neither is faked —
// trending has no usage signal in the product (`upgrade-activation-events`) and
// community publishing is not built (`community-backend`). What ships is the
// ordering and the sectioning over the two categories that hold real palettes,
// and this file asserts that the missing two are ABSENT rather than stubbed:
// an empty "Community" heading would be a promise the product cannot keep, and
// a "Trending" heading over an unranked list would be an invention dressed as a
// measurement.
import { test, expect } from './base.js'
import { watch } from './helpers.js'

const ROUTE = '/discover/palettes'
const HEAD = '.pgl-section-head'
const TRAY = '[aria-label^="Filter palettes"]'

const headings = (page) => page.locator(`${HEAD} h3`).allTextContents()

test.describe('palette library sections', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'someone browsing for a palette')
    await page.goto(ROUTE)
    await expect(page.locator('.pgal-card').first()).toBeVisible()
  })

  test('browsing shows the categories in order', async ({ page }) => {
    expect(await headings(page)).toEqual(['Curated collection', 'Brand systems'])
  })

  test('nothing is promised that does not exist', async ({ page }) => {
    const all = (await headings(page)).join(' | ')
    expect(all, 'a Trending heading over an unranked list').not.toMatch(/trending|popular/i)
    expect(all, 'a Community heading with no community backend').not.toMatch(/community/i)
  })

  test('every palette on the page is inside a section, and the counts add up', async ({ page }) => {
    const counts = await page.locator('.pgl-section-count').allTextContents()
    const total = counts.reduce((sum, n) => sum + Number(n), 0)
    expect(counts.length).toBe(2)
    expect(total).toBe(await page.locator('.pgal-card').count())
  })

  // The reason to section a long list rather than filter it: the answer to
  // "what am I looking at" has to survive scrolling past a hundred cards.
  test('a section heading stays on screen while its own grid scrolls past', async ({ page }) => {
    const first = page.locator(HEAD).first()
    const nav = await page.locator('nav.pnav').boundingBox()
    const before = await first.boundingBox()

    // Far enough that an unpinned heading would be well off the top: it starts
    // below the hero, so a small scroll only spends the travel it has BEFORE it
    // reaches the pin. Measuring the delta over a short scroll therefore proves
    // nothing — the first version of this test asserted exactly that and failed
    // on a heading that was sticking correctly.
    await page.evaluate(() => window.scrollTo(0, 2200))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1500)

    const after = await first.boundingBox()
    expect(after, 'the first heading scrolled out of the viewport entirely').toBeTruthy()
    expect(after.y, 'the heading travelled with the page instead of pinning').toBeLessThan(before.y)
    // Pinned just under the nav, not merely somewhere on screen.
    expect(Math.abs(after.y - (nav.y + nav.height + 8))).toBeLessThan(12)
  })

  test('a heading never hides under the fixed nav', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 900))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400)
    const [nav, head] = await Promise.all([
      page.locator('nav.pnav').boundingBox(),
      page.locator(HEAD).first().boundingBox(),
    ])
    expect(head.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1)
  })

  // A filter is already an answer to "which subset". Splitting that answer back
  // into headed groups — one of them usually empty — buries it.
  test('filtering collapses back to one flat grid', async ({ page }) => {
    await page.locator(TRAY).getByRole('button', { name: 'Brand', exact: true }).click()
    await expect(page.locator(HEAD)).toHaveCount(0)
    await expect(page.locator('.pgal-card').first()).toBeVisible()

    await page.locator(TRAY).getByRole('button', { name: 'All palettes', exact: true }).click()
    await expect(page.locator(HEAD)).toHaveCount(2)
  })

  test('searching collapses back to one flat grid too', async ({ page }) => {
    await page.getByRole('searchbox', { name: /Search palettes/i }).fill('blue')
    await expect(page.locator(HEAD)).toHaveCount(0)
  })

  test('each section grid names itself to assistive technology', async ({ page }) => {
    const labelled = await page.locator('.pgl-section .lbry-grid').evaluateAll(
      (grids) => grids.map((g) => {
        const id = g.getAttribute('aria-labelledby')
        return id ? document.getElementById(id)?.textContent?.trim() : null
      }),
    )
    expect(labelled).toEqual(['Curated collection', 'Brand systems'])
  })
})
