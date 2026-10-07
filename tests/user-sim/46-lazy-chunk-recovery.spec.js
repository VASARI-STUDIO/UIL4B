// A lazy page file (or its stylesheet) that fails to download.
//
// main.jsx answers the first failure with one reload, which fetches the current
// index.html and its chunk set. Swallowing the error for that reload makes
// Vite's preload helper resolve the import with `undefined`, and plain React
// lazy() then throws "reading 'default'" and files it as a crash in the moment
// before the reload lands. src/utils/lazyRoute.js keeps the page on its loading
// fallback instead. These tests fail the chunk on purpose, during an in-app
// navigation, which is how a tab open across a redeploy meets a missing file.
//
// The chunk is failed with route.abort(): the page's import rejects with the
// same "Failed to fetch dynamically imported module" a 404 gives, and the app
// code cannot tell them apart. Outside production the crash reporter writes to
// the console instead of posting, so the console line is what is read here,
// and /api/support is watched as well.
import { test, expect } from './base.js'
import { go, ready, expectRendered } from './helpers.js'

const CREDITS_CHUNK = '**/assets/Credits-*.js'
const SURFACE_CSS = '**/assets/SurfaceIndex-*.css'
const SURFACE_CHUNK = '**/assets/SurfaceIndex-*.js'
const GRADIENT_CHUNK = '**/assets/GradientGenerator-*.js'
const ICON_LIBRARY_CHUNK = '**/assets/IconLibrary-*.js'
const PALETTE_CHUNK = '**/assets/CommandPalette-*.js'
const REPORT_LINE = '[crash report, not sent outside production]'
// React's production wording, then its development wording, for the same throw.
const DEFAULT_THROW = /reading 'default'|'default' in undefined/

const PROBE = '[chunk-probe]'

/** What the page reported, threw and posted, for the whole test. */
function watchReports(page) {
  const seen = { reports: [], defaultThrows: [], posted: [], probe: [] }
  page.on('console', (m) => {
    const text = m.text()
    if (text.includes(REPORT_LINE)) seen.reports.push(text)
    if (DEFAULT_THROW.test(text)) seen.defaultThrows.push(text)
    if (text.startsWith(PROBE)) seen.probe.push(text.slice(PROBE.length + 1))
  })
  page.on('pageerror', (e) => {
    if (DEFAULT_THROW.test(String(e && e.message))) seen.defaultThrows.push(String(e.message))
  })
  page.on('request', (r) => { if (r.url().includes('/api/support')) seen.posted.push(r.url()) })
  return seen
}

/** Hold every document request for `pathname`: the reload is asked for, never served. */
async function holdReloads(page, pathname) {
  const held = []
  await page.route((url) => url.pathname === pathname, (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    held.push(route)
    return undefined
  })
  return held
}

/** Navigate the way a click on an in-app link does, without a page load. */
async function navigateInApp(page, pathname) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
  }, pathname)
}

/**
 * Report the document's state over the console. While a reload is held the old
 * document keeps running, but Playwright will not evaluate in it until the
 * navigation settles, so the page has to say what it shows by itself: the
 * moment the reload starts, then 800ms later, and whenever a crash card mounts.
 * With `crash`, the page also throws an error of its own once the reload has
 * started: a code crash that has nothing to do with the failed download.
 */
async function probeDocument(page, { crash = null } = {}) {
  await page.evaluate(({ tag, crash }) => {
    const state = () => `loading=${!!document.querySelector('.page-loading')} `
      + `crashed=${!!document.querySelector('.error-boundary')}`
    const say = (what) => console.log(`${tag} ${what}`)
    let crashed = false
    new MutationObserver(() => {
      if (!crashed && document.querySelector('.error-boundary')) { crashed = true; say('crash card mounted') }
    }).observe(document.documentElement, { childList: true, subtree: true })
    window.addEventListener('beforeunload', () => {
      say(`reload started ${state()}`)
      setTimeout(() => say(`reload pending ${state()}`), 800)
      if (crash) setTimeout(() => { throw new Error(crash) }, 100)
    })
  }, { tag: PROBE, crash })
}

/** Answer every document request for `pathname` with 204, which the browser
 *  treats as "no new page": the reload is asked for and the old document stays. */
async function cancelReloads(page, pathname) {
  const asked = []
  await page.route((url) => url.pathname === pathname, (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    asked.push(route.request().url())
    return route.fulfill({ status: 204, body: '' })
  })
  return asked
}

/** Fail every request matching `glob`, and count them. */
async function failRequests(page, glob) {
  const failed = { count: 0 }
  await page.route(glob, (route) => { failed.count += 1; return route.abort() })
  return failed
}

async function expectWaitingForReload(page, seen, held, { fallback = true } = {}) {
  await expect.poll(() => held.length, {
    message: 'the failed download should have asked for exactly one reload',
  }).toBe(1)
  await expect.poll(() => seen.probe.find((p) => p.startsWith('reload pending')), {
    message: 'the in-page probe never reported, so this test read nothing',
  }).toBeTruthy()
  expect(seen.defaultThrows, "React threw on the missing module's .default").toEqual([])
  expect(seen.probe, 'the error boundary was shown for a page that is reloading')
    .not.toContain('crash card mounted')
  if (fallback) {
    expect(seen.probe.find((p) => p.startsWith('reload pending')),
      'the loading fallback should stay up until the reload lands')
      .toBe('reload pending loading=true crashed=false')
  }
  expect(seen.reports, 'a crash was reported for a page that is reloading').toEqual([])
  expect(seen.posted).toEqual([])
}

/** The card a page shows when its code did not arrive after the one reload. */
async function expectLoadFailedCard(page) {
  const card = page.locator('.error-boundary')
  await expect(card).toBeVisible()
  await expect(card.getByRole('heading', { name: "This page didn't load" })).toBeVisible()
  return card
}

test.describe('a lazy page that fails to download', () => {
  test('its JS file: the page waits for the reload instead of crashing, and nothing is reported', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    await page.route(CREDITS_CHUNK, (route) => route.abort())
    const held = await holdReloads(page, '/credits')
    await navigateInApp(page, '/credits')
    await expectWaitingForReload(page, seen, held)
  })

  test('its stylesheet: the page reloads once and nothing is reported', async ({ page }) => {
    // Vite's preload helper goes on to import the page's JS when the CSS
    // error is taken over, so the page itself may paint unstyled until the
    // reload lands. What must not happen is a crash or a report.
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    let failedCss = 0
    await page.route(SURFACE_CSS, (route) => { failedCss += 1; return route.abort() })
    const held = await holdReloads(page, '/learn')
    await navigateInApp(page, '/learn')
    await expectWaitingForReload(page, seen, held, { fallback: false })
    expect(failedCss, 'the stylesheet request must actually have been failed').toBeGreaterThan(0)
  })

  test('its stylesheet, again after the reload: the page says it did not load, and reports it as a load failure', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await page.evaluate(() => sessionStorage.setItem('vs-chunk-reload', String(Date.now())))
    await page.route(SURFACE_CSS, (route) => route.abort())
    const held = await holdReloads(page, '/learn')
    await navigateInApp(page, '/learn')

    const card = await expectLoadFailedCard(page)
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(held.length, 'reloaded again inside the guard window: a reload loop').toBe(0)
    await expect.poll(() => seen.reports.length).toBe(1)
    expect(seen.reports[0]).toMatch(/Chunk load failed on \/learn: Unable to preload CSS for \/assets\/SurfaceIndex-/)
    expect(seen.posted).toEqual([])
  })

  test('the reload fetches the page and it renders, with no crash in between', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    let requests = 0
    await page.route(CREDITS_CHUNK, (route) => {
      requests += 1
      return requests === 1 ? route.abort() : route.continue()
    })
    // Held until the old document has had its chance to crash, then let
    // through: an unheld reload can win the race and hide the crash.
    const held = await holdReloads(page, '/credits')
    await navigateInApp(page, '/credits')
    await expectWaitingForReload(page, seen, held)
    const reloaded = page.waitForEvent('domcontentloaded')
    await held[0].continue()
    await reloaded
    await ready(page, '/credits')
    await expectRendered(page, '/credits')
    expect(requests, 'the chunk should have failed once and then been fetched by the reload').toBe(2)
    expect(seen.defaultThrows).toEqual([])
    expect(seen.reports, 'the recovered page filed a report on the way').toEqual([])
    expect(seen.posted).toEqual([])
  })

  test('if the reload does not fix it, the page says it did not load, offers a retry, and reports it once as a load failure', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    // The state right after the one automatic reload: a second failure now
    // must not reload again.
    await page.evaluate(() => sessionStorage.setItem('vs-chunk-reload', String(Date.now())))
    await page.route(CREDITS_CHUNK, (route) => route.abort())
    const held = await holdReloads(page, '/credits')
    await navigateInApp(page, '/credits')

    const card = await expectLoadFailedCard(page)
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(held.length, 'reloaded again inside the guard window: a reload loop').toBe(0)

    await expect.poll(() => seen.reports.length).toBe(1)
    expect(seen.reports[0]).toMatch(/Chunk load failed on \/credits: .*Failed to fetch dynamically imported module/)
    expect(seen.reports[0]).not.toMatch(/Crash on/)
    expect(seen.defaultThrows).toEqual([])
    expect(seen.posted).toEqual([])

    // Try again is a real reload, and the guard does not stop a person asking.
    // The reload is held, so the click must not wait for it to commit.
    await card.getByRole('button', { name: 'Try again' }).click({ noWaitAfter: true })
    await expect.poll(() => held.length).toBe(1)
  })

  test('offline, the page says the connection is down, does not reload, and offers the retry once back online', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await page.route(CREDITS_CHUNK, (route) => route.abort())
    const held = await holdReloads(page, '/credits')
    // navigator.onLine is pinned rather than left to context.setOffline, which
    // does not reliably flip it (see 07-public-shell-library-palette.spec.js).
    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
      window.dispatchEvent(new Event('offline'))
    })
    await navigateInApp(page, '/credits')

    const card = await expectLoadFailedCard(page)
    await expect(card).toContainText("You're offline")
    await expect(card.getByRole('button', { name: 'Try again' })).toHaveCount(0)
    expect(held.length, 'reloaded while offline').toBe(0)

    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true })
      window.dispatchEvent(new Event('online'))
    })
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(seen.reports, 'an offline download failure is not the site\'s fault').toEqual([])
    expect(seen.defaultThrows).toEqual([])
    expect(seen.posted).toEqual([])
  })

  test('its stylesheet and its JS file both: the page still waits for the one reload', async ({ page }) => {
    // Vite raises one preload error per missing file. The second meets the
    // reload guard and rejects the import while the reload is in flight.
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    const css = await failRequests(page, SURFACE_CSS)
    const js = await failRequests(page, SURFACE_CHUNK)
    const held = await holdReloads(page, '/learn')
    await navigateInApp(page, '/learn')
    await expectWaitingForReload(page, seen, held)
    expect(css.count, 'the stylesheet request must actually have been failed').toBeGreaterThan(0)
    expect(js.count, 'the JS request must actually have been failed').toBeGreaterThan(0)
  })

  test('a code crash while the reload is in flight is still reported', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page, { crash: 'probe crash while the page reloads' })
    await page.route(CREDITS_CHUNK, (route) => route.abort())
    const held = await holdReloads(page, '/credits')
    await navigateInApp(page, '/credits')
    await expect.poll(() => held.length).toBe(1)
    await expect.poll(() => seen.reports.length, {
      message: 'a crash that is not a download failure was held back because a reload was in flight',
    }).toBe(1)
    expect(seen.reports[0]).toMatch(/Crash on \/credits: probe crash while the page reloads/)
    expect(seen.defaultThrows).toEqual([])
    expect(seen.posted).toEqual([])
  })

  test('a reload that does not replace the page: after the wait, it says it did not load and reports it once', async ({ page }) => {
    // The page waits RELOAD_GRACE_MS (15 s) for its reload before giving up.
    test.setTimeout(60000)
    const seen = watchReports(page)
    await go(page, '/privacy')
    await page.route(CREDITS_CHUNK, (route) => route.abort())
    const asked = await cancelReloads(page, '/credits')
    await navigateInApp(page, '/credits')
    await expect.poll(() => asked.length, { message: 'the failed download should have asked for one reload' }).toBe(1)
    await expect(page.locator('.page-loading'), 'the page should wait for its reload first').toBeVisible()

    const card = page.locator('.error-boundary')
    await expect(card.getByRole('heading', { name: "This page didn't load" })).toBeVisible({ timeout: 25000 })
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect.poll(() => seen.reports.length, {
      message: 'the failure that outlived its reload was never reported',
    }).toBe(1)
    expect(seen.reports[0]).toMatch(/Chunk load failed on \/credits: Unable to load this page/)
    expect(asked.length, 'reloaded again inside the guard window: a reload loop').toBe(1)
    expect(seen.defaultThrows).toEqual([])
    expect(seen.posted).toEqual([])
  })

  test('a Create tool file: the tool waits for the reload instead of crashing', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    const failed = await failRequests(page, GRADIENT_CHUNK)
    const held = await holdReloads(page, '/create/gradient')
    await navigateInApp(page, '/create/gradient')
    await expectWaitingForReload(page, seen, held)
    expect(failed.count, 'the tool file request must actually have been failed').toBeGreaterThan(0)
  })

  test('a library tab inside a page: the tab waits for the reload instead of crashing', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    const failed = await failRequests(page, ICON_LIBRARY_CHUNK)
    const held = await holdReloads(page, '/create/icons')
    await navigateInApp(page, '/create/icons')
    // The tab's own fallback is not the route's loading state, so only the
    // absence of a crash and a report is read here.
    await expectWaitingForReload(page, seen, held, { fallback: false })
    expect(failed.count, 'the tab file request must actually have been failed').toBeGreaterThan(0)
  })

  test('an overlay: the command palette waits for the reload instead of crashing the page', async ({ page }) => {
    const seen = watchReports(page)
    await go(page, '/privacy')
    await probeDocument(page)
    const failed = await failRequests(page, PALETTE_CHUNK)
    const held = await holdReloads(page, '/privacy')
    // The reload is held, so the key press must not wait for a navigation.
    await page.keyboard.press('/')
    await expectWaitingForReload(page, seen, held, { fallback: false })
    expect(failed.count, 'the palette file request must actually have been failed').toBeGreaterThan(0)
  })
})
