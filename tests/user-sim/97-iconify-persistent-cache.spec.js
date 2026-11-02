// THE ICON LIBRARY ASKS THE API ONCE, NOT ONCE PER RELOAD.
//
// WHAT WAS HAPPENING
// api.iconify.design answered one IP with HTTP 429 (Retry-After 3555 seconds)
// after about two loads of /create/icons, roughly twenty requests, and the page
// sat on "Couldn't reach the icon service" for the hour. Every cache the page
// had lived in memory, so each reload re-sent the catalogue, and an office
// behind one address hit the limit together.
//
// src/utils/iconifyFetch.js is now the one door to the API: answers are kept in
// Cache Storage (a day for the catalogue, tranches and SVGs; an hour for a
// search), concurrent identical requests share one round trip, and a 429 starts
// a cool-down that a reload honours, during which cached answers (even expired
// ones) keep the page working.
//
// THE COUNT IS TAKEN AT THE STUB. 66-icon-library-offline-fixture counts what
// the page asked the fixture for; this does the same across reloads, so "the
// second load sent nothing" is read off the requests, not inferred from a grid
// that happens to be full.
//
// MUTATIONS (each seen red before this landed):
//   - make readEntry() in iconifyFetch.js return null: every reload test fails
//     on a non-zero count and the cool-down test on the first reload's ledger;
//   - make cooling() return false: the "different query" step sends a request;
//   - drop the clearIconifyCooldown() call from the Try again handler in
//     IconLibrary.jsx: the third test never recovers (and so does 66's);
//   - make getCollectionNames() in IconLibrary.jsx skip the site's pack lists
//     and always ask Iconify: the first test and the Groups test fail on a
//     non-zero /collection count.
//
// THE PACK LISTS ARE THE SITE'S OWN. A first visit reads each pack's list from
// /iconify/collections/<pack>.json on this origin and sends Iconify no
// /collection request. The tests that exercise the live /collection path (the
// cool-down and Try again) take the site's lists away first with
// withholdSnapshots, which is a pack with no usable snapshot.
import { test, expect } from './base.js'
import { go, ready, signIn, watch } from './helpers.js'
import { iconifyRequests, isIconifyUrl, isLiveIconify, limitIconify, withholdSnapshots } from './iconify-stub.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'
// helpers.js drops the console lines Chromium logs for deliberate 429s for this
// persona and these hosts only.
const REFUSED = 'visitor whose icon catalogue is refused'

const GROUPS = '/create/icons/groups'

/** The icon grid has drawn its glyphs, not only its cells. */
async function paint(page) {
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20000 }).toBeGreaterThan(20)
}

/** Let the debounced glyph tranches and any prefetch land before a count is read. */
const settle = (page) => page.waitForTimeout(2000)

/** Every request this page makes to an Iconify host, in order. */
function iconifyUrlLog(page) {
  const urls = []
  page.on('request', (r) => { if (isIconifyUrl(r.url())) urls.push(r.url()) })
  return urls
}

/** The tally as plain numbers, so a before/after difference can be taken. */
function mark(ctx) {
  const { collection, snapshot, batch, search, svg } = iconifyRequests(ctx)
  return { collection, snapshot, batch, search, svg }
}
function since(ctx, before) {
  const now = mark(ctx)
  return Object.fromEntries(Object.keys(now).map((k) => [k, now[k] - before[k]]))
}
const NOTHING = { collection: 0, snapshot: 0, batch: 0, search: 0, svg: 0 }
/** Glyph tranches a reload may send: none. A tranche is a fixed slice of its pack (glyphChunkPlan), so a cache load and a network load ask for the same URLs. */
const MAX_NEW_TRANCHES = 0

async function reload(page, route) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await ready(page, route)
}

/**
 * Choose a pack without the pointer ever leaving the toolbar. The menu option
 * sits over the grid, so a real click on it leaves the pointer there; when the
 * menu closes a glyph cell is under the stationary pointer, the browser fires a
 * synthetic mouseenter on it, and the page's hover warm-up (IconLibrary.jsx,
 * warmSoon) asks for that one icon's /<pack>/<name>.svg 150 ms later. That file
 * is a different kind of request with its own cool-down, so a search being
 * refused does not hold it. It is the customizer's head start, not part of a
 * pack switch, and whether it fires depends on which cell the pointer lands on
 * when the layout settles, so it failed one CI run in 2128. Dispatching the
 * option's click keeps the pointer on the select, which is not over any cell,
 * and the count below then depends only on what a pack switch asks for.
 */
async function pickPack(page, select, pack) {
  await select.click()
  const option = page.locator(`.menu-select-list[role="listbox"] [role="option"][data-value="${pack}"]`)
  await option.waitFor({ state: 'visible' })
  await option.dispatchEvent('click')
  await expect(page.locator('.menu-select-list[role="listbox"]')).toHaveCount(0)
}

/** Pack switches that revisit packs: the second time round must be free. */
const SWITCHES = ['tabler', 'mdi', 'lucide', 'tabler', 'all']
async function switchPacks(page) {
  const select = page.locator('.lbry-select')
  for (const pack of SWITCHES) {
    await pickPack(page, select, pack)
    await page.waitForTimeout(1000)
    await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 15000 }).toBeGreaterThan(0)
  }
}

/** The cells the grid reveals on its own: four pages of 120, then it shows a "Show more icons" button. */
const REVEAL_DEPTH = 480

/**
 * Bring the default grid to the same depth on every load. A tranche is a fixed
 * slice of its pack, but WHICH slices a load asks for follows how many cells
 * the grid has revealed (it looks one page ahead of them). That depth is not
 * the same on every load: when a pack's list lands while the first page is
 * still being revealed, the reveal stops at 160 or 200 cells and waits for a
 * scroll, and the packs land in a different order on the network load than on
 * a cached one. So each load scrolls the sentinel in until the grid is at the
 * automatic limit; the tranches asked for then depend on the catalogue and not
 * on the timing of the load. The pointer is parked in the page's corner first:
 * scrolling slides cells under a resting pointer, and each one it passes over
 * would be warmed with a single-icon request (see pickPack).
 */
async function revealToDepth(page) {
  await page.mouse.move(0, 0)
  await expect.poll(async () => {
    const count = await page.locator('.ig .ic').count()
    if (count < REVEAL_DEPTH) {
      await page.locator('.ig-sentinel').scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {})
    }
    return count
  }, { timeout: 20000, intervals: [250] }).toBeGreaterThanOrEqual(REVEAL_DEPTH)
  await page.evaluate(() => window.scrollTo(0, 0))
}

test('reloading /create/icons twice and switching packs sends the catalogue once', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  test.setTimeout(120_000)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'designer reloading the icon library')  // Pro, so "All packs" is the full twenty-five-pack listing that rate-limited the page.
  await signIn(page, { plan: 'pro' })
  const urls = iconifyUrlLog(page)

  await go(page, '/create/icons')
  await paint(page)
  await revealToDepth(page)
  await settle(page)
  await switchPacks(page)
  await settle(page)

  // POSITIVE CONTROL: the first visit did go to the fixture. Without it, "the
  // reloads sent nothing" is true of a page that never asked.
  const first = mark(ctx)
  // The default listing names its packs from the heads committed with the page, so
  // it reads no pack list at all. Only a pack the visitor opens is listed in full,
  // from the site's own copy: tabler, mdi and lucide, once each (SWITCHES revisits
  // tabler, and the second visit comes from the saved list).
  expect(first.snapshot, 'load 1 read one pack list from the site for each pack it opened').toBe(3)
  expect(first.collection, 'load 1 asked Iconify for a list the site serves').toBe(0)
  expect(first.batch, 'load 1 fetched its glyph tranches').toBeGreaterThan(0)
  const afterFirst = urls.length

  for (const n of [2, 3]) {
    const before = mark(ctx)
    const seen = urls.length
    await reload(page, '/create/icons')
    await paint(page)
    await revealToDepth(page)
    await settle(page)
    await switchPacks(page)
    await settle(page)
    const { batch, ...catalogue } = since(ctx, before)
    const asked = urls.slice(seen).join(' ')
    expect(catalogue, `load ${n} went back to the API for something load 1 already had: ${asked}`)
      .toEqual({ collection: 0, snapshot: 0, search: 0, svg: 0 })
    // A tranche's URL used to be the exact list of names on screen when the
    // debounce fired, which depends on the order the packs landed (the network
    // decides it on load 1, the cache on load 2), so a reload could ask for a
    // tranche load 1 never did (3 failures in 7 runs, one solar.json each time).
    // Tranches are now fixed slices of their pack, so the count is exactly zero.
    expect(batch, `load ${n} sent glyph tranches load 1 already had: ${asked}`).toBeLessThanOrEqual(MAX_NEW_TRANCHES)
  }
  expect(urls.length - afterFirst, 'across both reloads, nothing at all')
    .toBeLessThanOrEqual(2 * MAX_NEW_TRANCHES)
  expect(new Set(urls).size, 'no URL was asked for twice, a tranche included, across reloads and pack switches')
    .toBe(urls.length)
  await ctx.close()
})

test('a 429 starts a cool-down: cached packs stay up, nothing is sent, and a total failure still says so', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  test.setTimeout(120_000)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, REFUSED)
  const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
  const select = page.locator('.lbry-select')

  // The site's pack lists are taken away for the whole test, so the catalogue
  // goes through iconifyFetch (its cache and its cool-down) and not around it.
  await withholdSnapshots(page)

  // Warm the cache with a visit that includes a second pack.
  await go(page, '/create/icons')
  await paint(page)
  for (const pack of ['tabler', 'lucide', 'all']) {
    await pickPack(page, select, pack)
    await page.waitForTimeout(1000)
  }
  await paint(page)
  await settle(page)

  // From here the API refuses every request, with Retry-After 3555 like the live one.
  const ledger = await limitIconify(page, { after: 0, retryAfter: 3555 })

  // 1. A reload while the API is refusing: everything is in the cache, so the
  //    page neither asks nor shows a banner.
  await reload(page, '/create/icons')
  await paint(page)
  await settle(page)
  await expect(notice).toHaveCount(0)
  expect(ledger.urls, 'a reload with everything cached asked the API').toEqual([])

  // 2. Something never fetched does meet the API, is refused, and says so: a
  //    total failure stays visible.
  await page.locator('.lbry-search input').first().fill('arrow')
  await expect(notice).toBeVisible({ timeout: 15000 })
  expect(ledger.refused, 'the search was the request that met the 429').toBeGreaterThan(0)
  const sent = ledger.urls.length

  // 3. Reload: the cool-down is remembered across the page load. The cached
  //    packs are on screen and there is no banner.
  await reload(page, '/create/icons')
  await paint(page)
  await settle(page)
  await expect(notice).toHaveCount(0)
  expect(ledger.urls.length, `the reload sent a request during the cool-down: ${ledger.urls.slice(sent).join(' ')}`).toBe(sent)

  // 4. A query that is not cached cannot be answered, and does not leave the
  //    building: the page says so instead of retrying into the limit.
  await page.locator('.lbry-search input').first().fill('home')
  await expect(notice).toBeVisible({ timeout: 15000 })
  expect(ledger.urls.length, `a new search was sent during the cool-down: ${ledger.urls.slice(sent).join(' ')}`).toBe(sent)

  // 5. Clearing the search and moving between cached packs is free and clean.
  await page.locator('.lbry-search input').first().fill('')
  await expect(notice).toHaveCount(0, { timeout: 15000 })
  for (const pack of ['tabler', 'lucide', 'all']) {
    await pickPack(page, select, pack)
    await page.waitForTimeout(1000)
    await expect(notice, `switching to cached ${pack} raised the banner`).toHaveCount(0)
    await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 15000 }).toBeGreaterThan(0)
  }
  expect(ledger.urls.length, `a cached pack switch was sent during the cool-down: ${ledger.urls.slice(sent).join(' ')}`).toBe(sent)

  // Try again is NOT exercised here on purpose. After a failed SEARCH the page
  // sets cdnOk=false, and doSearch then answers from the built-in set without
  // asking (IconLibrary.jsx, `if (cdnOk.current === false)`), so a Try again on
  // a search failure never reaches iconifyFetch. The next test drives it from a
  // failed browse, which is the path that does retry.
  await ctx.close()
})

test('after a total failure a reload stays quiet, and Try again clears the cool-down and recovers', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  test.setTimeout(120_000)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, REFUSED)
  const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })

  // A first visit with nothing cached while the API refuses everything, the way
  // the live API did (Retry-After 3555, not readable by the page). The site's
  // own pack lists are withheld too, so nothing but the refusing API can answer.
  await withholdSnapshots(page)
  const ledger = await limitIconify(page, { after: 0, retryAfter: 3555 })
  await go(page, '/create/icons')
  await expect(notice).toBeVisible({ timeout: 15000 })
  expect(ledger.refused, 'POSITIVE CONTROL: the first visit did meet the 429').toBeGreaterThan(0)
  const sent = ledger.urls.length

  // The cool-down outlives the page: a reload asks nobody and says the same thing.
  await reload(page, '/create/icons')
  await expect(notice).toBeVisible({ timeout: 15000 })
  await settle(page)
  expect(ledger.urls.length, 'the reload went back to a refusing API during the cool-down').toBe(sent)

  // The API is healthy again, but the page does not know and is still cooling.
  // Try again is the visitor asking on purpose: it must clear the cool-down.
  await page.unrouteAll()
  await withholdSnapshots(page)
  await notice.getByRole('button', { name: 'Try again' }).click()
  await expect(notice).toHaveCount(0, { timeout: 20000 })
  // Signed out: the grid is the five-set sample, and the page says so under it.
  await expect(page.locator('.ig-end[data-gate="anon"] .ig-end-p')).toContainText('from 5 sets', { timeout: 20000 })
  await paint(page)
  await expect(page.getByText(/Built-in icons/)).toHaveCount(0)
  // The default listing names its packs from the committed heads, so the glyph
  // files are what Try again fetched, and the refusal that raised the notice was theirs.
  expect(iconifyRequests(ctx).batch, 'Try again fetched the glyph files').toBeGreaterThan(0)
  await ctx.close()
})

test('/create/icons-emoji and its Groups tab load from the cache on a reload', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  test.setTimeout(120_000)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'designer opening the icons and emoji page')

  // The page at /create/icons-emoji forwards to its first tab; the Groups tab
  // draws from the same API through a different module (iconGroupGlyphs.js).
  const open = async () => {
    await go(page, '/create/icons-emoji')
    await paint(page)
    await settle(page)
    await page.locator('#lib-tab-groups').click()
    await expect(page).toHaveURL(new RegExp(`${GROUPS}$`))
    // The Groups INDEX: a card per group, each previewing its first glyphs
    // (the group's own grid, `.igp-grid`, only exists once a group is opened).
    await expect.poll(() => page.locator('.igp-card img').count(), { timeout: 20000 }).toBeGreaterThan(0)
    await settle(page)
    // The emoji tab is built in and asks the API for nothing.
    await page.locator('#lib-tab-emoji').click()
    await page.waitForTimeout(500)
  }

  await open()
  const first = mark(ctx)
  // The Icons tab and the Groups index name their icons from the heads committed with
  // the page, so neither reads a full pack list, from the site or from Iconify.
  expect(first.snapshot, 'load 1 read a full pack list from the site for a default view').toBe(0)
  expect(first.collection, 'load 1 asked Iconify for a pack list').toBe(0)
  expect(first.batch, 'load 1 fetched glyph tranches').toBeGreaterThan(0)

  for (const n of [2, 3]) {
    const before = mark(ctx)
    await open()
    expect(since(ctx, before), `load ${n} of /create/icons-emoji went back to the API`).toEqual(NOTHING)
  }

  // And a reload that lands directly on the Groups tab.
  const before = mark(ctx)
  await go(page, GROUPS)
  await expect.poll(() => page.locator('.igp-card img').count(), { timeout: 20000 }).toBeGreaterThan(0)
  await settle(page)
  expect(since(ctx, before), 'a direct load of the Groups tab went back to the API').toEqual(NOTHING)
  await ctx.close()
})
