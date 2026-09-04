// The app-level offline signal.
//
// Offline used to be handled only per-surface: the font catalogue fell back to
// its bundled list, the emoji index refused to load, the Discover cards showed
// their own notice, the icon tabs and the file converter each kept their own
// pair of listeners. Every one of those was correct, and none of them told the
// user the thing that actually helps — that the NETWORK is the problem, that
// nothing they did caused it, and which parts of the product still work.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS DOES NOT USE `context.setOffline()`
// ─────────────────────────────────────────────────────────────────────────────
// #189 spent two attempts on a flaky offline test before recording the reason:
// **Playwright's setOffline does not reliably flip `navigator.onLine`**, so a
// component reading it back sees `true` and the assertion fails on timing
// rather than on behaviour. It also made the old test depend on when a lazy
// chunk finished loading.
//
// So the state is set the way the browser sets it — `navigator.onLine`
// overridden on the page before any script runs, plus the real event — and the
// assertions are about the banner, not about a chunk. Nothing here polls a
// network.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const BANNER = '.offline-banner'

/** Make `navigator.onLine` answer `value` from the very first script on. */
async function pinOnLine(page, value) {
  await page.addInitScript((v) => {
    Object.defineProperty(window.navigator, 'onLine', { get: () => v, configurable: true })
  }, value)
}

/** Flip the live page, the way losing a connection mid-session does. */
async function goOffline(page) {
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true })
    window.dispatchEvent(new Event('offline'))
  })
}

async function goOnline(page) {
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', { get: () => true, configurable: true })
    window.dispatchEvent(new Event('online'))
  })
}

test.describe('offline state', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone whose wifi dropped') })

  test('nothing is shown while the connection is fine', async ({ page }) => {
    await go(page, '/create/palette')
    await expect(page.locator('.plb-toolbar').first()).toBeVisible()
    await expect(page.locator(BANNER)).toHaveCount(0)
  })

  test('losing the connection mid-session raises one app-level notice', async ({ page }) => {
    await go(page, '/create/palette')
    await expect(page.locator('.plb-toolbar').first()).toBeVisible()

    await goOffline(page)
    await expect(page.locator(BANNER)).toBeVisible()
    // One signal, not one per surface — that is the whole point of the slice.
    await expect(page.locator(BANNER)).toHaveCount(1)

    await goOnline(page)
    await expect(page.locator(BANNER)).toHaveCount(0)
  })

  // The case the old flaky test could not reach. A route opened while ALREADY
  // offline must start in the right state — the component never heard an event,
  // so it has to read the live value at mount.
  test('a page opened while already offline says so without waiting for an event', async ({ page }) => {
    await pinOnLine(page, false)
    await go(page, '/create/palette')
    await expect(page.locator(BANNER)).toBeVisible()
  })

  test('it reaches the chromeless Create tools too', async ({ page }) => {
    // These take an early return past the app shell, and they are exactly the
    // pages where a dropped connection is about to be felt.
    await pinOnLine(page, false)
    await go(page, '/create/gradient')
    await expect(page.locator(BANNER)).toBeVisible()
  })

  test('it names what still works rather than only what broke', async ({ page }) => {
    await pinOnLine(page, false)
    await go(page, '/create/palette')
    const text = await page.locator(BANNER).innerText()
    // Most of this product is local. A bare "you are offline" sends someone
    // away from something still almost entirely usable.
    expect(text).toMatch(/offline/i)
    expect(text).toMatch(/keep working|still work/i)
  })

  // It sits under the nav on purpose: the nav is how someone leaves a page that
  // is not working, and a notice covering it makes things worse.
  test('it never covers the navigation', async ({ page }) => {
    await pinOnLine(page, false)
    await go(page, '/create/palette')
    const banner = page.locator(BANNER)
    await expect(banner).toBeVisible()

    const [nav, box] = await Promise.all([
      page.locator('nav.pnav').boundingBox(),
      banner.boundingBox(),
    ])
    expect(box.y, 'the banner starts above the bottom of the nav').toBeGreaterThanOrEqual(nav.y + nav.height - 1)

    // …and hit-testing agrees, which the geometry alone would not prove if the
    // banner were somehow stretched behind it.
    const onTop = await page.evaluate(([nx, ny]) => {
      const el = document.elementFromPoint(nx, ny)
      return el?.closest('.offline-banner') === null || el?.closest('.offline-banner') === undefined
    }, [nav.x + nav.width / 2, nav.y + nav.height / 2])
    expect(onTop, 'the offline banner is on top of the nav').toBe(true)
  })

  test('it announces itself politely rather than interrupting', async ({ page }) => {
    await pinOnLine(page, false)
    await go(page, '/create/palette')
    const banner = page.locator(BANNER)
    // Losing a connection is worth announcing; it is not worth cutting across
    // whatever a screen-reader user is in the middle of.
    await expect(banner).toHaveAttribute('role', 'status')
    await expect(banner).toHaveAttribute('aria-live', 'polite')
  })

  // The prerendered shells are generated with no `navigator` at all. If the
  // hook defaulted to offline there, every route would ship with the banner
  // baked into its HTML.
  test('no prerendered shell carries the banner', async ({ page }) => {
    const html = await page.request.get('/create/palette').then(r => r.text())
    expect(html).not.toContain('offline-banner')
  })
})
