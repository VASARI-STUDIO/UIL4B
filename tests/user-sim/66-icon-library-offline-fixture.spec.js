// THE ICON CATALOGUE COMES FROM A FIXTURE, AND THE PAGE IS PROVEN TO USE IT.
//
// WHAT WAS HAPPENING
// /create/icons fetched the Iconify catalogue live on every visit — twenty-five
// /collection requests on first paint, a /search per query, an .svg per cell —
// and nothing in the suite stood between those requests and the network. After
// a day of full-suite runs from one machine, api.iconify.design answered 429
// and both fallbacks 403 without CORS headers (measured 2026-09-08 with curl
// and the suite's own Origin). 25-defect-sweep's pack-label test then failed
// with "one pack name under every cell", every visit logged ~100 CORS findings,
// and the gate for unrelated PRs was decided by a third party's rate limit.
//
// tests/user-sim/iconify-stub.js now serves those hosts from
// tests/user-sim/fixtures/iconify/ on every browser context. This spec is the
// POSITIVE CONTROL for that: it counts the requests the page made through the
// fixture, so a grid that renders nothing — or a stub that quietly stopped
// covering the page — cannot pass. "No request escaped" is trivially true of a
// page that never asked.
//
// The last two tests answer the product question the outage raised: what a
// visitor sees when every host refuses. Rendered on 2026-09-08 with all three
// hosts routed to 429/403 the page was NOT an empty grid: within a second it
// showed "Couldn't reach the icon service — showing built-in icons." with a
// Try again button and the 259 built-in icons underneath, at 1280 and at 390
// in both themes. Two things were missing and are asserted below: the notice
// was not a status region (nothing announced it), and the mode line said
// "Offline" while the browser was online.
//
// MUTATIONS (each seen red before this landed):
//   - empty the `uncategorized` list in fixtures/iconify/collection/logos.json,
//     devicon.json and skill-icons.json → 25-defect-sweep's pack-label test
//     fails on "a mixed-pack result set must still name each cell's pack";
//   - cut search.json to one prefix → "a search resolves against the fixture"
//     fails on the label count;
//   - drop role="status" from .ig-notice → the refusal tests fail on getByRole.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { fixturePacks, iconifyRequests, isLiveIconify, ICONIFY_STUB_HEADER, REFUSED_VALUE } from './iconify-stub.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'

// The persona name is load-bearing: helpers.js drops the console lines Chromium
// logs for the 75 refused responses ONLY for this persona and these hosts.
const REFUSED = 'visitor whose icon catalogue is refused'

/**
 * Answer every Iconify host the way the network did on 2026-09-08. Fulfilled,
 * not aborted, and stamped so the context's audit counts it as a deliberate
 * refusal rather than a response that reached the real API.
 */
async function refuseIconify(page) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route((u) => u.hostname === 'api.iconify.design',
    (route) => route.fulfill({ status: 429, contentType: 'text/plain', headers, body: 'Too Many Requests' }))
  await page.route((u) => u.hostname === 'api.simplesvg.com' || u.hostname === 'api.unisvg.com',
    (route) => route.fulfill({ status: 403, contentType: 'text/plain', headers, body: 'Forbidden' }))
}

/** Relative luminance of a computed colour: `rgb(r, g, b)` or `color(srgb r g b)`. */
function luminance(css) {
  let c
  const rgb = css.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/)
  const srgb = css.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (rgb) c = rgb.slice(1, 4).map((v) => Number(v) / 255)
  else if (srgb) c = srgb.slice(1, 4).map(Number)
  else throw new Error(`unparseable colour: ${css}`)
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}
const contrast = (fg, bg) => {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/** Tab from the top of the document until the focused element is `locator`, or give up. */
async function tabTo(page, locator, budget = 60) {
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0) })
  for (let i = 0; i < budget; i++) {
    await page.keyboard.press('Tab')
    if (await locator.evaluate((el) => el === document.activeElement)) return true
  }
  return false
}

test('the default grid is fetched through the fixture, one answer per pack', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'designer opening the icon library')
  // SIGNED IN AS PRO, BECAUSE THE SUBJECT IS THE FIXTURE AND NOT THE PAYWALL.
  // /create/icons is tiered as of 2026-09-18 (src/data/iconPackTiers.js): a
  // signed-out visitor browses five packs, not twenty-five, so "one /collection
  // per pack the page browses on first paint" would be measuring the gate here
  // rather than the stub. Pro is the tier that browses everything, which is the
  // state this test has always been written against. The tiers are measured in
  // their own tests at the bottom of this file.
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })

  const packs = fixturePacks()
  // The page's own summary line counts the sets that answered. Every pack in
  // the fixture answered, so it must say so — this is the page consuming the
  // fixture, not the stub counting itself.
  await expect(page.getByText(new RegExp(`All packs · [\\d,]+ icons · ${packs.length} sets`)))
    .toBeVisible({ timeout: 20000 })

  expect(await page.locator('.ic').count(), 'the grid is populated from the fixture').toBeGreaterThan(20)

  // WAIT FOR THE GLYPHS, NOT JUST THE CATALOGUE. The summary line above says
  // every pack ANSWERED; it says nothing about the markup, which now arrives in
  // a second round of requests a beat after the catalogue settles. Reading the
  // tally straight after the summary raced that round and measured zero batched
  // requests on a page that was about to make them. The condition the assertion
  // below is really about is cells having painted, so wait for that.
  await expect
    .poll(() => page.locator('.ig .ic img').count(), { timeout: 20000 })
    .toBeGreaterThan(20)

  const tally = iconifyRequests(ctx)
  expect(tally, 'the stub is installed on this context').not.toBeNull()
  expect(tally.collection, 'one /collection request per pack the page browses on first paint').toBe(packs.length)
  expect(tally.missing, 'every request had an answer in the fixture').toEqual([])
  expect(tally.escaped, 'no response came from a real Iconify host').toEqual([])
  // THE GRID'S GLYPHS, WHICH ARE NO LONGER ONE REQUEST EACH. This read
  // `tally.svg > 0` when every cell fetched its own .svg — 120 of them on first
  // paint, which is the request storm that rate-limited the page into a grid of
  // blank cells. The markup now arrives batched, one request per pack, so the
  // fixture is consumed through `batch` instead.
  expect(tally.batch, 'the visible cells fetched their glyphs through the fixture too').toBeGreaterThan(0)
  // And the storm has not come back: a batched grid must never need a request
  // per cell, so the per-icon endpoint stays far below the number of cells on
  // screen. It is not asserted at zero — hovering a cell legitimately prefetches
  // one glyph's own markup for the customizer.
  const cells = await page.locator('.ic').count()
  expect(tally.svg, `${tally.svg} per-icon glyph requests for ${cells} cells — the grid has stopped batching`)
    .toBeLessThan(cells)
  await ctx.close()
})

test('a search resolves against the fixture and mixes packs', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'designer searching the icon library')
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })

  await page.locator('.lbry-search input').first().fill('arrow')
  await expect(page.getByText(/[\d,]+ matches/)).toBeVisible({ timeout: 15000 })

  const words = await page.evaluate(() => [...new Set(
    [...document.querySelectorAll('.ic .ic-pack')]
      .filter((n) => getComputedStyle(n).display !== 'none')
      .map((n) => n.textContent.trim()),
  )])
  expect(words.length, 'a search across packs labels each cell with its pack').toBeGreaterThan(1)
  expect(iconifyRequests(ctx).search, 'the query went to the fixture, not the network').toBeGreaterThan(0)
  expect(iconifyRequests(ctx).escaped).toEqual([])
  await ctx.close()
})

test('when every Iconify host refuses, the page says so, shows the built-in set, and Try again recovers', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  watch(page, REFUSED)
  // Pro, so the recovery below is measured against the whole catalogue — see
  // the note on the first test in this file.
  await signIn(page, { plan: 'pro' })
  await refuseIconify(page)
  await go(page, '/create/icons')

  // The state is a STATUS REGION with a plain sentence: what happened and what
  // is being shown instead. getByRole is the assertion that the announcement
  // exists at all.
  const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
  await expect(notice).toBeVisible({ timeout: 15000 })
  await expect(notice).toContainText('showing built-in icons')
  expect(await page.locator('.ic').count(), 'the built-in set is on screen, not an empty grid').toBeGreaterThan(20)
  await expect(page.getByText(/Showing \d+ of \d+ · Built-in icons/)).toBeVisible()
  await expect(page.getByText(/· Offline/)).toHaveCount(0)

  // Keyboard: Tab reaches the control, and it is a real target.
  const retry = notice.getByRole('button', { name: 'Try again' })
  expect(await tabTo(page, retry), 'Try again is reachable from the keyboard').toBe(true)
  const box = await retry.boundingBox()
  expect(box.width, 'Try again is at least a 24px target').toBeGreaterThanOrEqual(24)
  expect(box.height).toBeGreaterThanOrEqual(24)

  // Recovery: the hosts answer again (the fixture takes over from the page-
  // level refusal) and Enter on the focused button re-runs the browse. The
  // notice goes, the catalogue comes back, and it came through the fixture.
  await page.unrouteAll()
  await page.keyboard.press('Enter')
  await expect(notice).toHaveCount(0, { timeout: 20000 })
  await expect(page.getByText(new RegExp(`All packs · [\\d,]+ icons · ${fixturePacks().length} sets`)))
    .toBeVisible({ timeout: 20000 })
  expect(iconifyRequests(ctx).collection, 'Try again fetched the catalogue again').toBe(fixturePacks().length)
  await ctx.close()
})

// NARROWING TO A PACK THE FALLBACK DOES NOT COVER USED TO SAY NOTHING AT ALL.
//
// When the catalogue is unreachable the surface falls back to its built-in set
// and says so in the notice above. That set does not cover every pack the
// control offers, and until 2026-09-15 the empty state was suppressed for the
// whole of a load error unless the visitor had typed something — so choosing
// one of the uncovered packs emptied the grid and announced nothing.
//
// Measured at 1280 through all 24 selectable packs with the service refused:
// 18 rendered an empty grid with NO message — ph, mdi, material-symbols, solar,
// fa6-solid, bxs, logos, devicon, skill-icons, circle-flags, flag, flagpack,
// cif, flat-color-icons, twemoji, noto, fluent-emoji, openmoji. Only all,
// lucide, tabler, iconoir, heroicons and simple-icons drew anything. Three
// quarters of that menu looked like a control that does nothing, under a banner
// about a different problem.
//
// That is the same silence the search half of this defect was fixed for on
// 2026-09-13, reached by a different route. Narrowing to a pack is a user
// action like typing, so an empty result is an answer to it.
test('choosing a pack the built-in set does not cover answers instead of emptying', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  // This walks every pack in the control, and the settle below is a bounded
  // WAIT rather than an assertion — so the run that takes longest is the broken
  // one, where no pack ever resolves and each pays the full timeout. The
  // default 30s budget is not enough for that, and a test that dies on the
  // clock reports "Target page closed" instead of naming the packs. Verified by
  // mutation: at the default budget the regression failed here rather than at
  // the assertion written for it.
  test.setTimeout(120_000)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  watch(page, REFUSED)
  // Pro. The subject here is which packs the BUILT-IN SET covers, and signed
  // out eighteen of these twenty-four are gated — they would answer with the
  // Pro wall, which is a correct answer to a different question and would make
  // this sweep vacuous.
  await signIn(page, { plan: 'pro' })
  await refuseIconify(page)
  await go(page, '/create/icons')

  // Wait for the fallback to have settled, so what follows is measured against
  // the built-in set rather than a grid still loading.
  await expect(page.getByText(/Showing \d+ of \d+ · Built-in icons/)).toBeVisible({ timeout: 15000 })

  const select = page.locator('select').first()
  const packs = await select.locator('option').evaluateAll((os) => os.map((o) => o.value))
  const selectable = packs.filter((p) => p && p !== 'custom' && p !== 'logodev' && p !== 'all')

  // POSITIVE CONTROL. Everything below is per-pack, so an empty or broken pack
  // control satisfies it while measuring nothing.
  expect(selectable.length, 'the pack control offered almost nothing to choose from')
    .toBeGreaterThan(10)

  const silent = []
  let emptied = 0
  for (const pack of selectable) {
    await select.selectOption(pack)
    // The browse is debounced and then swaps the grid, so wait for it to settle
    // into EITHER cells or an empty state — but do not assert on that wait.
    //
    // It was an expect.poll first, and that was wrong in a way worth recording:
    // the defect under test is a pack that produces NEITHER, so the poll timed
    // out and the test failed with "Received: 0" instead of reaching the
    // assertion below and naming the packs. Verified by mutation — the failure
    // was real, and told the reader nothing about what broke. A timeout here is
    // now a measurement, not a verdict.
    await page.waitForFunction(
      () => document.querySelectorAll('.ic').length > 0 || !!document.querySelector('.pl-empty'),
      null, { timeout: 1500 },
    ).catch(() => {})
    const seen = await page.evaluate(() => ({
      cells: document.querySelectorAll('.ic').length,
      // `.ig-gate` counts as an answer too. It cannot appear in THIS test — the
      // session is Pro — but a tier regression that let a wall through here
      // would otherwise be reported as silence, which is the one thing this
      // test exists to distinguish.
      answered: !!document.querySelector('.pl-empty') || !!document.querySelector('.ig-gate'),
    }))
    if (seen.cells === 0) {
      emptied += 1
      if (!seen.answered) silent.push(pack)
    }
  }

  // POSITIVE CONTROL FOR THE ASSERTION ITSELF. If the built-in set covered every
  // pack, nothing would ever empty and the check below would be vacuous — which
  // is also what a fixture that started answering would look like.
  expect(emptied, 'no pack came back empty, so this test is guarding nothing. Either the '
    + 'built-in set now covers every pack, or the refusal did not take.')
    .toBeGreaterThan(0)

  expect(silent, `${silent.length} pack(s) emptied the grid and said nothing. With the `
    + 'catalogue unreachable the empty state is suppressed unless the visitor has acted; '
    + 'choosing a pack IS acting — see the note on searchEmpty in IconLibrary.jsx.')
    .toEqual([])

  // And it is announced, not merely painted.
  const empty = page.locator('.pl-empty')
  await expect(empty).toHaveAttribute('aria-live', 'polite')
  await expect(empty).toContainText('No icons to show')

  // The cause is still on screen: this sentence explains the pack, the notice
  // above explains the service, and neither has replaced the other.
  await expect(page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ }))
    .toBeVisible()
  await ctx.close()
})

for (const theme of ['light', 'dark']) {
  test(`the refused state reads at 390px in ${theme}`, async ({ browser }) => {
    test.skip(isLiveIconify(), LIVE)
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme })
    const page = await ctx.newPage()
    await page.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
    watch(page, REFUSED)
    await refuseIconify(page)
    await go(page, '/create/icons')

    const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
    await expect(notice).toBeVisible({ timeout: 15000 })
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme)
    await notice.scrollIntoViewIfNeeded()

    const m = await notice.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const btn = el.querySelector('button')
      const bs = getComputedStyle(btn)
      return {
        left: r.left, right: r.right, fontPx: parseFloat(cs.fontSize),
        color: cs.color, bg: cs.backgroundColor,
        btnColor: bs.color, btnBg: bs.backgroundColor, btnH: btn.getBoundingClientRect().height,
        scrollW: document.documentElement.scrollWidth,
      }
    })
    expect(m.scrollW, 'no horizontal scroll at 390').toBeLessThanOrEqual(390)
    expect(m.left, 'the notice sits inside the viewport').toBeGreaterThanOrEqual(0)
    expect(m.right).toBeLessThanOrEqual(390)
    expect(m.fontPx, 'body-size text, not a caption').toBeGreaterThanOrEqual(13)
    expect(contrast(m.color, m.bg), `sentence contrast in ${theme}`).toBeGreaterThanOrEqual(4.5)
    expect(contrast(m.btnColor, m.btnBg), `Try again contrast in ${theme}`).toBeGreaterThanOrEqual(4.5)
    expect(m.btnH, 'Try again keeps its height on a phone').toBeGreaterThanOrEqual(40)
    expect(await page.locator('.ic').count()).toBeGreaterThan(20)
    await ctx.close()
  })
}

/* ── WHO THE CATALOGUE IS FETCHED FOR ───────────────────────────────────────

   The pack tiers, measured the only way that proves them: by counting what
   /create/icons ASKS api.iconify.design for. This file already counts that, so
   the tiers belong here rather than in a file of their own — a gate that is
   checked by reading the DOM is a gate that has already been walked through.

   src/utils/lockedPreview.js sets the standard these assertions are written to:
   a locked thing's payload never reaches the browser. For a pack that means it
   is never REQUESTED — not requested and hidden, not requested and dimmed. So
   every test here asserts on the URL list, and the DOM is used only to say
   which state the visitor is looking at.

   EVERY ABSENCE IS PAIRED WITH A PRESENCE. "No brand pack was fetched" is
   trivially true of a page that fetched nothing, so each test also names the
   packs that MUST have been fetched at that tier. */

const OUTLINED = ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph']
const NEEDS_ACCOUNT = ['mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs']
const NEEDS_PRO = ['simple-icons', 'logos', 'devicon', 'skill-icons', 'twemoji', 'noto',
  'openmoji', 'fluent-emoji', 'circle-flags', 'flag', 'flagpack', 'cif', 'flat-color-icons',
  'vscode-icons', 'token-branded']

/** The pack a request to api.iconify.design is about, or null for /search. */
function packInUrl(raw) {
  const url = new URL(raw)
  if (url.pathname === '/collection') return url.searchParams.get('prefix')
  const batch = url.pathname.match(/^\/([^/]+)\.json$/)
  if (batch) return batch[1]
  const svg = url.pathname.match(/^\/([^/]+)\/[^/]+\.svg$/)
  return svg ? svg[1] : null
}

/** Collect every Iconify and Logo.dev URL this page asks for. */
function iconifyUrlLog(page) {
  const urls = []
  page.on('request', (r) => {
    if (/api\.iconify\.design|img\.logo\.dev/.test(r.url())) urls.push(r.url())
  })
  return urls
}

const packsIn = (urls) => [...new Set(urls.map(packInUrl).filter(Boolean))]

test('signed out: the grid is capped, and only the outlined packs are ever requested', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'visitor who has not signed in')
  const urls = iconifyUrlLog(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await expect.poll(() => page.locator('.ig .ic img').count(), { timeout: 20000 }).toBeGreaterThan(20)

  const fetched = packsIn(urls)
  // PRESENCE, so a page that fetched nothing at all cannot pass this.
  for (const pack of OUTLINED) {
    expect(fetched, `${pack} is the signed-out sample and must be fetched`).toContain(pack)
  }
  // ABSENCE, which is the gate.
  for (const pack of [...NEEDS_ACCOUNT, ...NEEDS_PRO]) {
    expect(fetched, `${pack} is gated signed out and must never appear in a URL`).not.toContain(pack)
  }

  // The cap is enforced on the DATA rather than on the scroll, so nothing the
  // visitor does can walk past it. Asserted by trying.
  const cells = await page.locator('.ig .ic').count()
  expect(cells, 'the signed-out grid is capped').toBeLessThanOrEqual(60)
  expect(cells, 'and it is a real sample, not a stub').toBeGreaterThanOrEqual(24)
  await page.mouse.wheel(0, 20000)
  await page.waitForTimeout(1500)
  expect(await page.locator('.ig .ic').count(), 'scrolling must not reveal more than the cap').toBe(cells)

  // The cap is SAID, not only done — a count with no explanation is what makes
  // a limit feel punitive rather than deliberate.
  await expect(page.locator('.ig-gate')).toBeVisible()
  await expect(page.locator('.ig-gate')).toContainText(String(cells))
  // And it is not the outage state: nothing refused anything here.
  await expect(page.locator('.ig-notice')).toHaveCount(0)
  await ctx.close()
})

test('signed in free: the solid packs open, the brand, flag and emoji packs are not fetched', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'designer on the free plan')
  const urls = iconifyUrlLog(page)
  await signIn(page, { plan: 'free' })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await expect.poll(() => page.locator('.ig .ic img').count(), { timeout: 20000 }).toBeGreaterThan(20)

  const fetched = packsIn(urls)
  for (const pack of [...OUTLINED, ...NEEDS_ACCOUNT]) {
    expect(fetched, `${pack} has a free official browser, so an account opens it`).toContain(pack)
  }
  for (const pack of NEEDS_PRO) {
    expect(fetched, `${pack} is Pro and must never appear in a URL for a free account`).not.toContain(pack)
  }
  // NO STANDING BANNER for a free account. The markers on the pack menu and the
  // group tray are the whole of it until they reach for something.
  await expect(page.locator('.ig-gate')).toHaveCount(0)
  await ctx.close()
})

test('choosing a Pro pack costs nothing, and says so in its own words', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'designer on the free plan')
  await signIn(page, { plan: 'free' })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await page.waitForTimeout(1500)

  // Counted from the moment of the click, so the default browse is not in the way.
  const after = iconifyUrlLog(page)
  await page.locator('.lbry-select').selectOption('simple-icons')
  await page.waitForTimeout(2500)

  expect(after, `picking a Pro pack made ${after.length} request(s): ${after.slice(0, 3).join(' ')}`).toEqual([])
  const wall = page.locator('.ig-gate')
  await expect(wall).toBeVisible()
  await expect(wall, 'the wall names the pack that was picked').toContainText('Simple Icons')
  await expect(wall.getByRole('button')).toBeVisible()
  // THE THREE REFUSALS STAY APART. The product saying no must not wear the
  // network's words, and must not wear the catalogue's either.
  await expect(page.locator('.ig-notice'), 'a gated pack is not an outage').toHaveCount(0)
  await expect(page.locator('.pl-empty'), 'a gated pack is not an empty search').toHaveCount(0)
  await ctx.close()
})

test('My Icons is never gated, and the Logo.dev pack is', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'visitor who has not signed in')

  // A RECENT FROM A PACK THIS VISITOR CAN NO LONGER BROWSE.
  //
  // vs-recent-icons outlives a sign-out and a lapsed subscription, and it is a
  // list of REFERENCES — pack plus name — not of markup. So a browser that was
  // Pro yesterday asks the Recent rail to draw `simple-icons:github` today, and
  // that rail is fetched by a different code path from the grid. It is the one
  // route by which a gated pack could still reach api.iconify.design with every
  // browse function behaving perfectly.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('vs-recent-icons', JSON.stringify([
        { key: 'simple-icons:github', action: 'copy', ts: Date.now(), cdn: true, pack: 'simple-icons', name: 'github' },
        { key: 'lucide:zap', action: 'copy', ts: Date.now() - 1000, cdn: true, pack: 'lucide', name: 'zap' },
      ]))
    } catch { /* a blocked store is the app's problem to survive, not ours */ }
  })

  const early = []
  page.on('request', (r) => { if (r.url().includes('api.iconify.design')) early.push(r.url()) })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await page.waitForTimeout(2500)

  // POSITIVE CONTROL FIRST: the rail is real and its allowed entry did paint.
  await expect(page.locator('.ig-rail'), 'the Recent rail is on screen').toBeVisible()
  expect(early.some((u) => u.includes('lucide')), 'the allowed recent was fetched').toBe(true)
  expect(early.filter((u) => u.includes('simple-icons')),
    'the Recent rail fetched a pack this visitor may not browse').toEqual([])
  expect(await page.locator('.ig-rail-item').count(),
    'only the recent the visitor may still have is drawn').toBe(1)

  // The visitor's own icons, at the narrowest tier there is.
  await page.locator('.lbry-select').selectOption('custom')
  await page.waitForTimeout(1500)
  await expect(page.locator('.ig-gate'), 'My Icons carries no wall at any tier').toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently copied' })).toBeVisible()

  // Logo.dev is a paid pack that makes no Iconify request at all — it resolves
  // 48 images from a commercial API on our own publishable token. The gate has
  // to stand in front of that too, or the one pack whose cost is ours is the
  // one left open.
  const logos = []
  page.on('request', (r) => { if (r.url().includes('img.logo.dev')) logos.push(r.url()) })
  await page.locator('.lbry-select').selectOption('logodev')
  await page.waitForTimeout(2500)
  expect(logos, 'a gated Logo.dev must not resolve a single brand image').toEqual([])
  await expect(page.locator('.ig-gate')).toBeVisible()
  await ctx.close()
})
