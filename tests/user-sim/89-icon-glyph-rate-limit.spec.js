// A 429 FROM ICONIFY, AND WHAT IT MUST AND MUST NOT TAKE DOWN WITH IT.
//
// src/utils/iconifyFetch.js keeps its back-off per kind of request (pack list,
// glyph file, icon file, search). Two promises follow, and a request answered
// locally while a back-off runs carries a "held" marker so the glyph loader can
// tell "wait" from "refused":
//
//   1. A refused PACK LIST does not stop the glyph files of packs whose lists
//      the page already has. (It used to: one 429 on /collection blanked the
//      whole grid.)
//   2. A glyph batch held by a running back-off is not a failed try. It uses up
//      none of the pack's retries, is asked again when the back-off ends, and
//      only a pass in which EVERY batch was held raises the outage notice.
//
// 89-icon-glyph-refusal.spec.js keeps the 503 shape (one pack failing on its
// own, which the page's bounded retry is for). This file is the 429 shape.
//
// The 429s here carry Access-Control-Allow-Origin, as the live API's do: without
// it the browser hides the response and the page sees a rejected fetch, which
// is a different path (a short pause after three rejections), not a 429.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, REFUSED_VALUE, iconifyRequests, isLiveIconify } from './iconify-stub.js'

const PERSONA = 'visitor whose icon catalogue is refused'
const NOTICE = /couldn.t reach the icon service/i
// iconifyFetch.js: localStorage key and the shape it saves, per kind of request.
const COOLDOWN_KEY = 'uil4b-iconify-cooldown'
const CACHE_NAME = 'uil4b-iconify-v1'

const REFUSAL = {
  status: 429,
  contentType: 'text/plain',
  body: 'Too Many Requests',
  headers: { [ICONIFY_STUB_HEADER]: REFUSED_VALUE, 'access-control-allow-origin': '*' },
}
const isBatch = (u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons=')
const packOf = (url) => new URL(url).pathname.slice(1, -'.json'.length)

/** Every glyph batch this page asks an Iconify host for: { pack, at } in order. */
function batchLog(page) {
  const log = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (isBatch(u)) log.push({ pack: packOf(r.url()), at: Date.now() })
  })
  return log
}

/** Start the page with a glyph-file back-off already running, as a reload would inherit it. */
async function seedGlyphBackoff(page, ms) {
  await page.addInitScript(({ key, ms }) => {
    localStorage.setItem(key, JSON.stringify({ scopes: { glyph: { until: Date.now() + ms, strikes: 1 } } }))
  }, { key: COOLDOWN_KEY, ms })
}

// A glyph is a loaded image (the coloured packs) or a sprite symbol (every other pack).
const painted = (page) => page.evaluate(() => [...document.querySelectorAll('.ig .ic :is(img, svg.ig-sym)')].filter((c) => (c.matches('img') ? c.complete && c.naturalWidth > 0 : !!document.querySelector(`#ig-sprite ${c.querySelector('use').getAttribute('href')}`))).length)
const blank = (page) => page.evaluate(() => document.querySelectorAll('.ig .ic:not(:has(img)):not(:has(svg))').length)

test.describe('a 429 from Iconify', () => {
  test.skip(isLiveIconify(), 'the live API decides what it serves; this spec pins the refused shape')
  test.setTimeout(90_000)

  test('a refused pack list does not stop the glyph files of the packs the site lists', async ({ page }) => {
    // Pro picks fluent-emoji, the one pack with no list on the site, so its
    // /collection is the one live pack-list request of the visit. Refuse it.
    // The default listing names its packs from the committed heads and never
    // asks /collection, so the refusal only meets the pack that needs the list.
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    let lists = 0
    await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection', (route) => {
      lists += 1
      return route.fulfill(REFUSAL)
    })
    const batches = batchLog(page)
    await go(page, '/create/icons')

    await expect.poll(() => painted(page), { timeout: 20_000, message: 'the default grid drew no glyphs' }).toBeGreaterThan(20)
    expect(lists, 'the default listing asked /collection').toBe(0)

    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'fluent-emoji')
    await expect.poll(() => lists, { timeout: 20_000, message: 'POSITIVE CONTROL: the live pack list was asked for and refused' }).toBe(1)
    await expect(page.getByText(NOTICE), 'one refused pack list is not an outage').toHaveCount(0)

    // The pack list is cooling down, but a pack the site lists still opens, asks for its
    // glyph files and paints them.
    const before = batches.length
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'mdi')
    await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('Material Design', { timeout: 20_000 })
    await expect.poll(() => batches.length, { timeout: 20_000, message: 'glyph files were not requested after the pack list was refused' }).toBeGreaterThan(before)
    await expect.poll(() => painted(page), { timeout: 20_000, message: 'the grid drew no glyphs after a pack list was refused' }).toBeGreaterThan(20)
    await expect(page.getByText(NOTICE), 'one refused pack list is not an outage').toHaveCount(0)
    expect(lists, 'a pack the site lists went to /collection').toBe(1)
    expect(iconifyRequests(page.context()).escaped).toEqual([])
  })

  test('with a glyph back-off running at load, every batch is held: nothing is sent, the notice says so, and Try again recovers', async ({ page }) => {
    watch(page, PERSONA)
    await seedGlyphBackoff(page, 15 * 60 * 1000)
    const batches = batchLog(page)
    await go(page, '/create/icons')

    const notice = page.getByRole('status').filter({ hasText: NOTICE })
    await expect(notice, 'a first pass with every batch held said nothing').toBeVisible({ timeout: 15_000 })
    await expect(notice.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(batches, 'a request left the page during the back-off').toEqual([])
    expect(await page.locator('.ic').count(), 'the built-in set is on screen, not an empty grid').toBeGreaterThan(20)

    // Try again is the visitor asking on purpose: it ends the back-off and asks.
    await notice.getByRole('button', { name: 'Try again' }).click()
    await expect(notice).toHaveCount(0, { timeout: 20_000 })
    await expect.poll(() => painted(page), { timeout: 20_000, message: 'Try again did not bring the catalogue glyphs back' }).toBeGreaterThan(8)
    expect(batches.length, 'Try again sent no glyph request').toBeGreaterThan(0)
  })

  test('a mixed pass paints what it has, holds the rest without a notice, and loads them once the back-off ends', async ({ page }) => {
    const HOLD_MS = 9_000
    watch(page, PERSONA)
    const batches = batchLog(page)

    // Visit 1: a normal load, so the glyph files are kept across a reload.
    await go(page, '/create/icons')
    await expect.poll(() => painted(page), { timeout: 20_000 }).toBeGreaterThan(8)
    await page.waitForTimeout(2_000)
    const packs = [...new Set(batches.map((b) => b.pack))]
    expect(packs.length, 'POSITIVE CONTROL: the grid is more than one pack, so a pass can be mixed').toBeGreaterThan(1)

    // Forget ONE pack's glyph files, so after a reload it is the only batch that
    // needs the network. The others come from the kept answers and are not held.
    const victim = packs[0]
    const dropped = await page.evaluate(async ({ name, pack }) => {
      const cache = await caches.open(name)
      let n = 0
      for (const req of await cache.keys()) {
        if (new URL(req.url).pathname === `/${pack}.json`) { await cache.delete(req); n += 1 }
      }
      return n
    }, { name: CACHE_NAME, pack: victim })
    expect(dropped, `POSITIVE CONTROL: ${victim} had glyph files kept to drop`).toBeGreaterThan(0)

    // Visit 2: reload with a glyph back-off that outlives the first pass.
    batches.length = 0
    await seedGlyphBackoff(page, HOLD_MS)
    await go(page, '/create/icons')
    const until = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).scopes.glyph.until, COOLDOWN_KEY)

    await expect.poll(() => painted(page), { timeout: 10_000, message: 'the packs with kept glyph files did not paint during the back-off' }).toBeGreaterThan(8)
    expect(await blank(page), 'POSITIVE CONTROL: the held pack is still blank, so there is something to recover').toBeGreaterThan(0)
    await expect(page.getByText(NOTICE), 'a mixed pass is not an outage').toHaveCount(0)
    expect(batches.filter((b) => b.pack === victim), `${victim} was asked for during the back-off`).toEqual([])

    // The back-off ends: the held pack is asked for, on its own, and paints.
    await expect.poll(() => blank(page), { timeout: 25_000, message: 'the held pack never loaded after the back-off ended' }).toBe(0)
    const late = batches.filter((b) => b.pack === victim)
    expect(late.length, `${victim} was never asked for after the back-off`).toBeGreaterThan(0)
    expect(late[0].at, `${victim} was asked for before the back-off ended`).toBeGreaterThanOrEqual(until - 250)
    await expect(page.getByText(NOTICE)).toHaveCount(0)
  })

  test('one pack answered 429 is not asked again during the back-off, and the packs that answered still paint', async ({ page }) => {
    watch(page, PERSONA)
    const seen = { pack: null, requests: 0 }
    await page.route(isBatch, (route) => {
      const pack = packOf(route.request().url())
      if (!seen.pack) seen.pack = pack
      if (pack !== seen.pack) return route.fallback()
      seen.requests += 1
      return route.fulfill(REFUSAL)
    })
    await go(page, '/create/icons')

    await expect.poll(() => seen.requests, { timeout: 20_000 }).toBe(1)
    await expect.poll(() => painted(page), { timeout: 15_000, message: 'the packs that answered did not paint' }).toBeGreaterThan(8)
    expect(await blank(page), 'POSITIVE CONTROL: the refused pack left blank cells').toBeGreaterThan(0)
    // The page retries a failed pack after 3 seconds. That retry meets the
    // back-off the 429 started, so it is held at the page and never sent.
    await page.waitForTimeout(6_000)
    expect(seen.requests, 'the refused pack was asked again while the back-off ran').toBe(1)
    await expect(page.getByText(NOTICE), 'one refused pack is not an outage').toHaveCount(0)
    expect(await painted(page)).toBeGreaterThan(8)
  })
})
