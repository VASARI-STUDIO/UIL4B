// V3 Libraries, palettes and gradients: the row a Pro member sees when the
// server refuses the library. It says what failed and what to do, Retry asks
// the server again every time, and no free gate or empty state stands in for it.
//
// Network: the library endpoint is answered by the test (403, then the real
// handler); the session is the Firebase double from helpers.js.
//
// MUTATIONS this file goes red on:
//   - change the refusal sentence in src/components/library/ProLibraryStatus.jsx:
//     the message assertion goes red;
//   - drop `setAttempt((n) => n + 1)` from retry in src/hooks/useProLibrary.js:
//     the "Retry asked the server again" assertions go red;
//   - draw the gate (LibraryGate.jsx) while the library is refused: the `.geg`
//     count goes red;
//   - leave the tiles out once the set arrives (PaletteGallery.jsx /
//     GradientGallery.jsx): the final tile-count assertion goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

// An open panel tile (VerticalPanelTile.jsx), never one of the locked stand-ins
// the gate fades in below the grid.
const TILE = '.vpt:not(.vpt--locked):not([data-gate-fade] *)'

const LIBS = [
  { key: 'palettes', route: '/discover/palettes', status: 'palette library', card: TILE },
  { key: 'gradients', route: '/discover/gradients', status: 'gradient library', card: TILE },
]

const VIEWPORTS = [
  { name: '1440', use: { viewport: { width: 1440, height: 900 } } },
  { name: '390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

for (const vp of VIEWPORTS) {
  test.describe(`refused library at ${vp.name}`, () => {
    test.use(vp.use)

    for (const lib of LIBS) {
      test(`${lib.key}: the row says what failed, Retry asks again, and the set arrives once allowed`, async ({ page }) => {
        watch(page, `a Pro member refused the ${lib.key} library`)
        await signIn(page, { plan: 'pro' })
        let refusing = true
        let calls = 0
        await page.route(/\/api\/ai\?library=/, async (route) => {
          if (!route.request().url().includes(`library=${lib.key}`)) return route.fallback()
          calls += 1
          if (refusing) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'forbidden' }) })
          return route.fallback()
        })
        await go(page, lib.route)

        const row = page.locator('.lockt-status')
        await expect(row).toContainText(`We couldn’t confirm your Pro access for the ${lib.status}. Retry, or reload the page.`)
        await expect(page.locator('.geg')).toHaveCount(0)
        const retry = row.getByRole('button', { name: 'Retry' })
        await expect(retry).toBeVisible()
        const box = await retry.boundingBox()
        expect(Math.round(box.height), 'Retry is a comfortable target').toBeGreaterThanOrEqual(vp.name === '390' ? 44 : 32)
        expect(calls, 'one request so far').toBe(1)

        await retry.click()
        await expect.poll(() => calls, { message: 'Retry asked the server again' }).toBe(2)
        await expect(row).toContainText('couldn’t confirm your Pro access')

        refusing = false
        await retry.click()
        await expect.poll(() => calls, { message: 'the next Retry asked again' }).toBe(3)
        await expect(row).toHaveCount(0)
        await expect.poll(() => page.locator(lib.card).count()).toBeGreaterThan(10)
      })
    }
  })
}
