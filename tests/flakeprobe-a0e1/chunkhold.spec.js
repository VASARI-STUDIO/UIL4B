// Probe: hold the INNER lazy chunk (FontGallery) back while leaving the entry
// bundle and CreateTool alone. Does go()/ready() return before the route's own
// content is on screen?
import { test, expect } from '../user-sim/base.js'
import { go, renderState } from '../user-sim/helpers.js'

const DELAYS = [0, 500, 1500, 3000, 6000, 9000]

for (const delay of DELAYS) {
  test(`font-gallery, inner chunk held ${delay}ms`, async ({ page }) => {
    await page.route('**/assets/FontGallery-*.js', async (route) => {
      await new Promise((r) => setTimeout(r, delay))
      await route.continue()
    })

    const t0 = Date.now()
    let readyErr = null
    try {
      await go(page, '/create/font-gallery')
    } catch (e) {
      readyErr = String(e.message).slice(0, 160)
    }
    const readyMs = Date.now() - t0

    // What is on screen the INSTANT go() came back.
    const s = await renderState(page).catch(() => null)
    const h1Now = await page.evaluate(
      () => document.querySelectorAll('h1').length,
    ).catch(() => -1)

    let assertErr = null
    const t1 = Date.now()
    try {
      await expect(page.getByRole('heading', { level: 1, name: 'Font Gallery' }))
        .toBeVisible({ timeout: 5000 })
    } catch (e) {
      assertErr = String(e.message).split('\n')[0].slice(0, 140)
    }

    console.log(`\n### delay=${delay} readyMs=${readyMs} h1AtReady=${h1Now} readyErr=${readyErr}`)
    console.log(`### state=${JSON.stringify(s)}`)
    console.log(`### assertMs=${Date.now() - t1} assertErr=${assertErr}`)
  })
}
