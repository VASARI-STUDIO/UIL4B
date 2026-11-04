// THE ICON CATALOGUE COMES FROM A FIXTURE, AND THE PAGE IS PROVEN TO USE IT.
//
// WHAT WAS HAPPENING
// /create/icons fetched the Iconify catalogue live on every visit — twenty-five
// /collection requests on first paint, a /search per query, an .svg per cell —
// and nothing in the suite stood between those requests and the network. After
// a day of full-suite runs from one machine, api.iconify.design answered 429
// and both fallbacks 403 without CORS headers (measured with curl
// and the suite's own Origin). 25-layout-target-sweep's pack-label test then failed
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
// visitor sees when every host refuses. Rendered with all three
// hosts routed to 429/403 the page was NOT an empty grid: within a second it
// showed "Couldn't reach the icon service — showing built-in icons." with a
// Try again button and the 259 built-in icons underneath, at 1280 and at 390
// in both themes. Two things were missing and are asserted below: the notice
// was not a status region (nothing announced it), and the mode line said
// "Offline" while the browser was online.
//
// MUTATIONS (each seen red before this landed):
//   - empty the `uncategorized` list in fixtures/iconify/collection/logos.json,
//     devicon.json and skill-icons.json → 25-layout-target-sweep's pack-label test
//     fails on "a mixed-pack result set must still name each cell's pack";
//   - cut search.json to one prefix → "a search resolves against the fixture"
//     fails on the label count;
//   - drop role="status" from .ig-notice → the refusal tests fail on getByRole.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { answerIconify, headPackOfUrl, iconifyRequests, isLiveIconify, withholdSnapshots, ICONIFY_STUB_HEADER, REFUSED_VALUE, SNAPSHOT_PATH_RE } from './iconify-stub.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'

// The persona name is load-bearing: helpers.js drops the console lines Chromium
// logs for the 75 refused responses ONLY for this persona and these hosts.
const REFUSED = 'visitor whose icon catalogue is refused'

/**
 * Answer every Iconify host the way the network did in the outage. Fulfilled,
 * not aborted, and stamped so the context's audit counts it as a deliberate
 * refusal rather than a response that reached the real API.
 */
async function refuseIconify(page) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route((u) => u.hostname === 'api.iconify.design',
    (route) => route.fulfill({ status: 429, contentType: 'text/plain', headers, body: 'Too Many Requests' }))
  await page.route((u) => u.hostname === 'api.simplesvg.com' || u.hostname === 'api.unisvg.com',
    (route) => route.fulfill({ status: 403, contentType: 'text/plain', headers, body: 'Forbidden' }))
  // The site's own copy of each pack list is part of the catalogue too. Left
  // answering, the page would draw a healthy grid over a refused service.
  await page.route((u) => SNAPSHOT_PATH_RE.test(u.pathname),
    (route) => route.fulfill({ status: 404, contentType: 'text/plain', headers, body: 'Not found' }))
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
  // /create/icons is tiered (src/data/iconPackTiers.js): a
  // signed-out visitor browses five packs, not twenty-seven, so "one /collection
  // per pack the page browses on first paint" would be measuring the gate here
  // rather than the stub. Pro is the tier that browses everything, which is the
  // state this test has always been written against. The tiers are measured in
  // their own tests at the bottom of this file.
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })

  // The "N sets" text is gone with the result line; the toolbar count says the listing landed, and the
  // one-answer-per-pack behaviour is asserted on the requests below.
  await expect(page.locator('#ig-result-count')).toHaveText(/^[\d,]+ icons$/, { timeout: 20000 })

  expect(await page.locator('.ic').count(), 'the grid is populated from the fixture').toBeGreaterThan(20)

  // WAIT FOR THE GLYPHS, NOT JUST THE CATALOGUE. The summary line above says
  // every pack ANSWERED; it says nothing about the markup, which now arrives in
  // a second round of requests a beat after the catalogue settles. Reading the
  // tally straight after the summary raced that round and measured zero batched
  // requests on a page that was about to make them. The condition the assertion
  // below is really about is cells having painted, so wait for that.
  await expect
    .poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20000 })
    .toBeGreaterThan(20)

  const tally = iconifyRequests(ctx)
  expect(tally, 'the stub is installed on this context').not.toBeNull()
  // The default listing names its packs from the committed heads, so a first paint spends none of the rate-limited /collection allowance.
  expect(tally.collection, 'the default grid must not request /collection per pack').toBe(0)
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
  // Signed out there is no count; the results have landed when every cell on screen is an arrow icon.
  await expect.poll(() => page.locator('.ig .ic').evaluateAll((els) => els.length > 0 && els.every((e) => /arrow/i.test(e.getAttribute('aria-label') || ''))), { timeout: 15000 }).toBe(true)

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
  // The fallback's count is in the toolbar now (the "Built-in icons" label has no text of its own: the notice above says it).
  await expect(page.locator('#ig-result-count')).toHaveText(/^[\d,]+ icons$/)
  const held = Number((await page.locator('#ig-result-count').textContent()).replace(/[^\d]/g, ''))
  expect(held, 'the count is the built-in set, at least the cells drawn').toBeGreaterThanOrEqual(await page.locator('.ig .ic').count())
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
  await expect(page.locator('#ig-result-count')).toHaveText(/^[\d,]+ icons$/, { timeout: 20000 })
  // The summary line is up once the packs are named; the glyphs are a second round
  // of requests a beat later, so wait for cells to paint before counting them.
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20000 }).toBeGreaterThan(20)
  expect(iconifyRequests(ctx).collection, 'Try again lists from the heads, not /collection').toBe(0)
  expect(iconifyRequests(ctx).batch, 'Try again fetched the glyphs again').toBeGreaterThan(0)
  await ctx.close()
})

// NARROWING TO A PACK THE FALLBACK DOES NOT COVER USED TO SAY NOTHING AT ALL.
//
// When the catalogue is unreachable the surface falls back to its built-in set
// and says so in the notice above. That set does not cover every pack the
// control offers, and the empty state used to be suppressed for the
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
// That is the same silence the search half of this defect was fixed for, reached by a different route. Narrowing to a pack is a user
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
  await expect(page.locator('#ig-result-count')).toHaveText(/^[\d,]+ icons$/, { timeout: 15000 })

  const select = page.getByRole('button', { name: 'Icon pack' })
  await select.click()
  const packs = await page.getByRole('listbox').getByRole('option').evaluateAll(rows => rows.map(row => row.dataset.value))
  await page.keyboard.press('Escape')
  // My icons is a toggle beside the menu now, so the menu must not offer it as a pack.
  expect(packs, 'My icons is no longer a pack-menu entry').not.toContain('custom')
  const selectable = packs.filter((p) => p && p !== 'logodev' && p !== 'all')

  // POSITIVE CONTROL. Everything below is per-pack, so an empty or broken pack
  // control satisfies it while measuring nothing.
  expect(selectable.length, 'the pack control offered almost nothing to choose from')
    .toBeGreaterThan(10)

  const silent = []
  let emptied = 0
  for (const pack of selectable) {
    await chooseMenuOption(page, select, pack)
    // The browse is debounced and then swaps the grid, so wait for it to settle
    // into EITHER cells or an empty state — but do not assert on that wait.
    //
    // It was an expect.poll first, and that was wrong in a way worth recording:
    // the defect under test is a pack that produces NEITHER, so the poll timed
    // out and the test failed with "Received: 0" instead of reaching the
    // assertion below and naming the packs. Verified by mutation — the failure
    // was real, and told the reader nothing about what broke. A timeout here is
    // now a measurement, not a verdict.
    // Skeleton cells are `.ic` too (`.ic.ig-skel`). A pack click now re-asks the service, so
    // for a moment the grid is skeleton; only real icons count as cells, or the wait ends on it.
    await page.waitForFunction(
      () => document.querySelectorAll('.ic:not(.ig-skel)').length > 0 || !!document.querySelector('.pl-empty'),
      null, { timeout: 1500 },
    ).catch(() => {})
    const seen = await page.evaluate(() => ({
      cells: document.querySelectorAll('.ic:not(.ig-skel)').length,
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
const NEEDS_ACCOUNT = ['mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs', 'mingcute', 'carbon']
const NEEDS_PRO = ['simple-icons', 'logos', 'devicon', 'skill-icons', 'twemoji', 'noto',
  'openmoji', 'fluent-emoji', 'circle-flags', 'flag', 'flagpack', 'cif', 'flat-color-icons',
  'vscode-icons', 'token-branded']

/** The pack a request to api.iconify.design (or the site's own copy of a pack list) is about, or null for /search. */
function packInUrl(raw) {
  const url = new URL(raw)
  // The pack list is read from this site now, so the gate is measured on that
  // read as well as on the Iconify requests: a gated pack's list must not be
  // fetched from anywhere.
  const snapshot = url.pathname.match(SNAPSHOT_PATH_RE)
  if (snapshot) return decodeURIComponent(snapshot[1])
  if (url.pathname === '/collection') return url.searchParams.get('prefix')
  const batch = url.pathname.match(/^\/([^/]+)\.json$/)
  if (batch) return batch[1]
  const svg = url.pathname.match(/^\/([^/]+)\/[^/]+\.svg$/)
  return svg ? svg[1] : null
}

/** Every pack whose head file (the default listing's source of names) this page asks for. */
function headPacksAsked(page) {
  const packs = new Set()
  page.on('request', (r) => { const pack = headPackOfUrl(r.url()); if (pack) packs.add(pack) })
  return packs
}

/** Collect every Iconify and Logo.dev URL this page asks for, and every read of the site's own pack lists. */
function iconifyUrlLog(page) {
  const urls = []
  page.on('request', (r) => {
    if (/api\.iconify\.design|img\.logo\.dev/.test(r.url()) || SNAPSHOT_PATH_RE.test(new URL(r.url()).pathname)) urls.push(r.url())
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
  const listed = headPacksAsked(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20000 }).toBeGreaterThan(20)

  const fetched = packsIn(urls)
  // PRESENCE, so a page that fetched nothing at all cannot pass this. The default
  // listing names each pack from its head file and draws its glyphs from the batch
  // endpoint, so the five packs are listed and the first of them has drawn.
  for (const pack of OUTLINED) {
    expect([...listed], `${pack} is the signed-out sample and must be listed`).toContain(pack)
  }
  expect(fetched, 'the first pack of the sample drew its glyphs from the API').toContain(OUTLINED[0])
  // ABSENCE, which is the gate: no gated pack is named in a URL or has its head loaded.
  for (const pack of [...NEEDS_ACCOUNT, ...NEEDS_PRO]) {
    expect(fetched, `${pack} is gated signed out and must never appear in a URL`).not.toContain(pack)
    expect([...listed], `${pack} is gated signed out and must not be listed`).not.toContain(pack)
  }

  // The cap is enforced on the DATA rather than on the scroll, so nothing the
  // visitor does can walk past it. Asserted by trying.
  const cells = await page.locator('.ig .ic').count()
  expect(cells, 'the signed-out grid is capped').toBeLessThanOrEqual(72)
  expect(cells, 'and it is a real sample, not a stub').toBeGreaterThanOrEqual(24)
  await page.mouse.wheel(0, 20000)
  await page.waitForTimeout(1500)
  expect(await page.locator('.ig .ic').count(), 'scrolling must not reveal more than the cap').toBe(cells)

  // The cap is SAID, not only done — a count with no explanation is what makes
  // a limit feel punitive rather than deliberate.
  await expect(page.locator('.ig-end[data-gate="anon"]')).toBeVisible()
  await expect(page.locator('.ig-end[data-gate="anon"]')).toContainText(String(cells))
  // And it is not the outage state: nothing refused anything here.
  await expect(page.locator('.ig-notice')).toHaveCount(0)
  await ctx.close()
})

test('signed in free: the account packs open, the brand, flag and emoji packs are not fetched', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  watch(page, 'designer on the free plan')
  const urls = iconifyUrlLog(page)
  const listed = headPacksAsked(page)
  await signIn(page, { plan: 'free' })
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20000 }).toBeGreaterThan(20)

  // The listing names every pack the account opens from its head, and the grid
  // draws the first of them from the API; the later packs' glyphs are asked for as
  // the visitor scrolls, so the packs that are LISTED are the presence to measure.
  const open = [...OUTLINED, ...NEEDS_ACCOUNT]
  await expect(page.locator('#ig-result-count')).toHaveText(/^[\d,]+ icons$/)
  const fetched = packsIn(urls)
  for (const pack of open) {
    expect([...listed], `${pack} has a free official browser, so an account lists it`).toContain(pack)
  }
  expect(fetched, 'the first pack drew its glyphs from the API').toContain(OUTLINED[0])
  for (const pack of NEEDS_PRO) {
    expect(fetched, `${pack} is Pro and must never appear in a URL for a free account`).not.toContain(pack)
    expect([...listed], `${pack} is Pro and must not be listed for a free account`).not.toContain(pack)
  }
  // NO STANDING BANNER for a free account. The markers on the pack menu and the
  // group tray are the whole of it until the results run out; browsing every
  // pack never runs out, so neither the wall nor the end band is on screen.
  await expect(page.locator('.ig-gate')).toHaveCount(0)
  await expect(page.locator('.ig-end')).toHaveCount(0)
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
  await chooseMenuOption(page, page.locator('.lbry-select'), 'simple-icons')
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
  await page.locator('button.ig-mine').click()
  await expect(page.locator('button.ig-mine')).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(1500)
  await expect(page.locator('.ig-gate'), 'My Icons carries no wall at any tier').toHaveCount(0)
  await expect(page.locator('.ig-end'), 'My Icons carries no end band at any tier').toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently copied' })).toBeVisible()

  // Logo.dev is a paid pack that makes no Iconify request at all — it resolves
  // 48 images from a commercial API on our own publishable token. The gate has
  // to stand in front of that too, or the one pack whose cost is ours is the
  // one left open.
  const logos = []
  page.on('request', (r) => { if (r.url().includes('img.logo.dev')) logos.push(r.url()) })
  await chooseMenuOption(page, page.locator('.lbry-select'), 'logodev')
  await page.waitForTimeout(2500)
  expect(logos, 'a gated Logo.dev must not resolve a single brand image').toEqual([])
  await expect(page.locator('.ig-gate')).toBeVisible()
  await ctx.close()
})

// THE GROUP CHIPS ANNOUNCE THE GATE BEFORE IT IS CLICKED.
//
// The locked group chips need a marker, because otherwise the gate is
// discovered by clicking rather than announced. The marker is a padlock badge
// POSITIONED on the chip (no width) with the tier word in the accessible name.
//
// Three things are held, one per rung, and the last is the reason the marker
// is a badge at all: the tray is the SAME WIDTH for a gated viewer as for a
// Pro one, so the gate never reshapes the toolbar for the people it gates.
//
// MUTATION: drop `lock` from groupOptions in IconLibrary.jsx — the signed-out
// rung fails on "at least one chip carries the lock". Render the lock inline
// (position:static) in library.css — the width comparison fails.
// The group chips are read in whichever form the toolbar gives them. The
// toolbar row never wraps and the icon
// row also carries the weight segment, so at 1440 the group is its one-line
// trigger and the chips are read from the menu it opens. `form` says which.
async function groupChips(page) {
  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  const trigger = page.locator('.ig-toolbar .lbry-filtertrig', { hasText: 'Group' })
  const form = (await trigger.count()) ? 'menu' : 'tray'
  if (form === 'menu') await trigger.click()
  const tray = page.getByRole('group', { name: 'Filter by icon group' }).first()
  await expect(tray).toBeVisible({ timeout: 20000 })
  return tray.evaluate((el, f) => ({
    form: f,
    width: (() => { const p = el.style.flexWrap; el.style.flexWrap = 'nowrap'; const w = el.scrollWidth; el.style.flexWrap = p; return w })(),
    chips: [...el.querySelectorAll('.lbry-filter')].map((b) => ({
      name: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim(),
      badge: !!b.querySelector('.lbry-filter-lock svg') && b.querySelector('.lbry-filter-lock').getBoundingClientRect().width > 0,
    })),
  }), form)
}

test('the group chips mark a locked group before it is clicked, at no cost in width', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const read = async (plan) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
    const page = await ctx.newPage()
    watch(page, plan ? `designer on the ${plan} plan` : 'visitor who has not signed in')
    if (plan) await signIn(page, { plan })
    await go(page, '/create/icons')
    const r = await groupChips(page)
    await ctx.close()
    return r
  }
  const anon = await read(null)
  const free = await read('free')
  const pro = await read('pro')

  const locked = (r) => r.chips.filter((c) => c.badge)
  // PRESENCE first, so a tray that rendered no chips cannot pass the rest.
  expect(anon.chips.length, 'the group tray rendered: Coloured, Brand logos and Flags, with no Emoji chip').toBe(3)
  expect(locked(anon).length, 'signed out, at least one chip carries the lock').toBeGreaterThan(0)
  for (const c of anon.chips) {
    expect(c.badge, `${c.name}: the padlock and the tier word travel together`)
      .toBe(/ · (Pro|Log in)$/.test(c.name))
  }
  expect(anon.chips.map((c) => c.name).filter((n) => /^My icons/i.test(n)), 'My icons is a toggle, not a group chip').toEqual([])
  expect(locked(anon).map((c) => c.name), 'signed out, every group is locked and asks for Pro').toEqual(
    ['Coloured · Pro', 'Brand logos · Pro', 'Flags · Pro'],
  )
  expect(locked(free).map((c) => c.name), 'a free account opens no group, so the same three stay locked').toEqual(locked(anon).map((c) => c.name))
  expect(free.chips.filter((c) => / · Log in$/.test(c.name)), 'a signed-in viewer is never told to log in').toEqual([])
  expect(locked(pro), 'Pro sees no locks at all').toEqual([])
  // The width half only means something for the TRAY: it is what the toolbar's
  // fit decision measures. In the menu form the row is not being fitted.
  expect(anon.form).toBe(pro.form)
  if (anon.form === 'tray') {
    expect(Math.abs(anon.width - pro.width), `the tray is ${anon.width}px signed out and ${pro.width}px for Pro`).toBeLessThanOrEqual(1)
  }
})

const refusedNotice = page => page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })

test('reloading retains all five packs, and listing them never asks /collection', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  try {
    const page = await ctx.newPage()
    // These three tests are about the live /collection path (its stored answers
    // and its back-off), which a page that can read the site's own pack lists
    // never takes. Withholding the lists puts the page on that path; the 404s
    // are deliberate, so the persona is the one whose refusals are not reported.
    watch(page, REFUSED)
    await withholdSnapshots(page)
    await go(page, '/create/icons')
    await expect(page.locator('.ig-end[data-gate="anon"] .ig-end-p')).toContainText('from 5 sets', { timeout: 20000 })
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible()
    // The default listing names its packs from the committed heads, so there is nothing to ask /collection.
    expect(iconifyRequests(ctx).collection).toBe(0)
    const packs = await page.locator('.ic .ic-pack').allTextContents()
    expect(new Set(packs).size).toBe(5)

    await page.reload()
    await expect(page.locator('.ig-end[data-gate="anon"] .ig-end-p')).toContainText('from 5 sets', { timeout: 20000 })
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible()
    expect(await page.locator('.ic .ic-pack').allTextContents()).toEqual(packs)
    expect(iconifyRequests(ctx).collection).toBe(0)
    await expect(refusedNotice(page)).toHaveCount(0)
    expect(iconifyRequests(ctx).escaped).toEqual([])
  } finally { await ctx.close() }
})

test('a pack listed once is not listed again after a reload', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  try {
    const page = await ctx.newPage()
    watch(page, 'visitor reloading a cached icon collection')
    const pack = page.getByRole('button', { name: 'Icon pack' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20000 })
    await chooseMenuOption(page, pack, 'lucide')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('Lucide', { timeout: 20000 })
    // One pack's full listing is read from the site's own copy, once, and never asked of Iconify.
    expect(iconifyRequests(ctx).snapshot, 'opening a pack reads its listing once').toBe(1)
    expect(iconifyRequests(ctx).collection, 'a pack the site holds a list for is not asked of Iconify').toBe(0)

    await page.reload()
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20000 })
    await chooseMenuOption(page, pack, 'lucide')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('Lucide', { timeout: 20000 })
    expect(iconifyRequests(ctx).snapshot, 'the saved listing answers after a reload').toBe(1)
    expect(iconifyRequests(ctx).collection, 'a reload still asks Iconify for no list').toBe(0)
    expect(iconifyRequests(ctx).escaped).toEqual([])
  } finally { await ctx.close() }
})

test('an expired collection keeps its pack available when collection requests fail', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  try {
    const page = await ctx.newPage()
    watch(page, 'visitor whose icon catalogue is refused')
    const collection = JSON.parse(answerIconify('https://api.iconify.design/collection?prefix=lucide&info=1').body)
    const names = [...new Set([...(collection.uncategorized || []), ...Object.values(collection.categories || {}).flat()])]
    const at = Date.now() - 8 * 24 * 60 * 60 * 1000
    await page.addInitScript(({ names, title, at }) => {
      localStorage.setItem('uil4b:iconify:collection:lucide', JSON.stringify({ v: 1, at, data: { names, title, credit: null } }))
    }, { names, title: collection.title, at })
    let requests = 0
    await withholdSnapshots(page)
    await page.route(url => url.hostname === 'api.iconify.design' && url.pathname === '/collection', route => {
      requests++
      return route.fulfill({ status: 429, contentType: 'text/plain', headers: { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }, body: 'Too Many Requests' })
    })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20000 })
    // The default listing does not ask /collection at all, so the stale copy is not touched.
    expect(requests).toBe(0)
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'lucide')
    // The pack's full listing is requested, refused, and the copy saved on this device stands in for it.
    await expect.poll(() => requests).toBeGreaterThan(0)
    const quiet = page.getByRole('status').filter({ hasText: /showing the copy saved on this device/ })
    await expect(quiet).toBeVisible({ timeout: 20000 })
    await expect(quiet.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20000 })
    const shown = await page.locator('.ig .ic > span').allTextContents()
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.every(name => names.includes(name))).toBe(true)
    await expect(refusedNotice(page)).toHaveCount(0)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('uil4b:iconify:collection:lucide')).at)).toBe(at)
    expect(iconifyRequests(ctx).escaped).toEqual([])
  } finally { await ctx.close() }
})

test('Try again sends at most one collection request per pack on each click', async ({ browser }) => {
  test.skip(isLiveIconify(), LIVE)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  try {
    const page = await ctx.newPage()
    watch(page, 'visitor whose icon catalogue is refused')
    const requests = []
    let refusing = true
    await withholdSnapshots(page)
    await page.route(url => url.hostname === 'api.iconify.design' && url.pathname === '/collection', route => {
      requests.push(new URL(route.request().url()).searchParams.get('prefix'))
      if (!refusing) return route.fallback()
      return route.fulfill({ status: 429, contentType: 'text/plain', headers: { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }, body: 'Too Many Requests' })
    })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic :is(img, svg.ig-sym)').first()).toBeVisible({ timeout: 20000 })
    expect(requests, 'the default listing asks nothing of /collection').toHaveLength(0)

    // One pack's full listing is refused: its first icons stand in, with a quiet line.
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'tabler')
    const notice = page.getByRole('status').filter({ hasText: /showing its first icons/ })
    await expect(notice).toBeVisible({ timeout: 20000 })
    expect(requests).toEqual(['tabler'])
    await notice.getByRole('button', { name: 'Try again' }).click()
    await expect.poll(() => requests.length).toBe(2)
    await expect(notice).toBeVisible()
    await notice.getByRole('button', { name: 'Try again' }).click()
    await expect.poll(() => requests.length).toBe(3)
    await expect(notice).toBeVisible()
    expect(new Set(requests), 'every click asked for the one pack on screen, once').toEqual(new Set(['tabler']))
    refusing = false
    await notice.getByRole('button', { name: 'Try again' }).click()
    await expect.poll(() => requests.length).toBe(4)
    await expect(notice).toHaveCount(0, { timeout: 20000 })
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('Tabler')
    await expect(refusedNotice(page)).toHaveCount(0)
    expect(requests).toHaveLength(4)
    expect(iconifyRequests(ctx).escaped).toEqual([])
  } finally { await ctx.close() }
})
