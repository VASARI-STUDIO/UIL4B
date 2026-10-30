// The font catalogue loads from a static file first, so a slow or failing
// /api/fonts no longer decides whether the tools see the full catalogue.
// (src/utils/googleFonts.js; public/data/font-catalogue.json)
//
// base.js answers /data/font-catalogue.json with an empty list on every context
// (a quiet miss the loader skips past) so the other specs keep the catalogue they were written against. These tests
// register their own page route for it, which takes precedence.
//
// MUTATIONS (each should turn exactly one test red):
//   static first   in getRawFonts, fetch API_PROXY_URL before STATIC_CATALOGUE_URL
//                  (the held-API test then waits out the 8s bound and shows the banner)
//   stale copy     drop the `stored && !force` branch, or lower CACHE_MAX_AGE_MS
//                  below a day (the stale-copy test then shows the banner)
//   refresh        remove the refreshInBackground() call after a static answer
//                  (the refresh test then keeps the static family)
//   reason logged  delete the console.warn before the bundled list is returned
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const STATIC_GLOB = '**/data/font-catalogue.json'
const fam = (family, popularity) => ({
  family, category: 'sans-serif', variants: [400, 700], subsets: ['latin'], popularity, designers: ['Someone'],
})
const STATIC_CATALOGUE = { fonts: [fam('Static Sans', 0), fam('Static Serif', 1), fam('Static Mono', 2)] }
const API_CATALOGUE = { fonts: [fam('Api Sans', 0), fam('Api Serif', 1), fam('Api Mono', 2)] }

const stored = (page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('vs-gf-catalog')) } catch { return null }
})

test.describe('font catalogue: static file first', () => {
  test('a held /api/fonts does not delay the full catalogue or raise the banner', async ({ page }) => {
    watch(page, 'visitor while the font API is cold')
    await page.route(STATIC_GLOB, (route) => route.fulfill({ json: STATIC_CATALOGUE }))
    await page.route('**/api/fonts', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 12000))
      await route.abort().catch(() => {})
    })

    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-card').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.typ-notice')).toHaveCount(0)
    expect((await stored(page)).fonts.map((f) => f.family)).toEqual(['Static Sans', 'Static Serif', 'Static Mono'])
  })

  test('the API answer refreshes the saved catalogue in the background', async ({ page }) => {
    watch(page, 'visitor on a first visit')
    await page.route(STATIC_GLOB, (route) => route.fulfill({ json: STATIC_CATALOGUE }))
    await page.route('**/api/fonts', (route) => route.fulfill({ json: API_CATALOGUE }))

    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-card').first()).toBeVisible()
    await expect.poll(async () => (await stored(page))?.fonts?.[0]?.family).toBe('Api Sans')
    await expect(page.locator('.typ-notice')).toHaveCount(0)
  })

  test('a saved copy older than a day still answers when both sources fail', async ({ page }) => {
    watch(page, 'returning visitor behind a blocker')
    await page.addInitScript((fonts) => {
      try {
        // Only the first load seeds the copy, so a reload sees what the app saved.
        if (!localStorage.getItem('vs-gf-catalog')) {
          localStorage.setItem('vs-gf-catalog', JSON.stringify({ t: Date.now() - 25 * 3600 * 1000, fonts }))
        }
      } catch { /* private mode */ }
    }, [fam('Saved Sans', 0), fam('Saved Serif', 1)])
    await page.route(STATIC_GLOB, (route) => route.abort())
    await page.route('**/api/fonts', (route) => route.abort())

    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-card').first()).toBeVisible()
    await expect(page.locator('.typ-notice')).toHaveCount(0)
    // A card's visible name only paints once its Google stylesheet has loaded
    // (it stays a skeleton here, where fonts.googleapis.com is blocked), so the
    // family is read from the card's button name, which is always there.
    await expect(page.getByRole('button', { name: /^Open the Saved Sans specimen/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Open the Saved Serif specimen/ })).toBeVisible()
    await expect(page.locator('.fg-card')).toHaveCount(2)
  })

  test('when both sources fail the banner says what happened and the console says why', async ({ page }) => {
    watch(page, 'first-time visitor behind a blocker')
    const warnings = []
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()) })
    await page.route(STATIC_GLOB, (route) => route.abort())
    await page.route('**/api/fonts', (route) => route.abort())

    await go(page, '/create/font-gallery')
    const notice = page.locator('.typ-notice')
    await expect(notice).toContainText('bundled list')
    await expect(notice).not.toContainText(/ad-?block|extension/i)
    await expect(notice.getByRole('button', { name: /Try the full catalogue again/ })).toBeEnabled()
    await expect.poll(() => warnings.find((w) => w.includes('[font catalogue]'))).toContain('blocked')
  })
})
