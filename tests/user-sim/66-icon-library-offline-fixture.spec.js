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
import { go, watch } from './helpers.js'
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
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20000 })

  const packs = fixturePacks()
  // The page's own summary line counts the sets that answered. Every pack in
  // the fixture answered, so it must say so — this is the page consuming the
  // fixture, not the stub counting itself.
  await expect(page.getByText(new RegExp(`All packs · [\\d,]+ icons · ${packs.length} sets`)))
    .toBeVisible({ timeout: 20000 })

  expect(await page.locator('.ic').count(), 'the grid is populated from the fixture').toBeGreaterThan(20)

  const tally = iconifyRequests(ctx)
  expect(tally, 'the stub is installed on this context').not.toBeNull()
  expect(tally.collection, 'one /collection request per pack the page browses on first paint').toBe(packs.length)
  expect(tally.missing, 'every request had an answer in the fixture').toEqual([])
  expect(tally.escaped, 'no response came from a real Iconify host').toEqual([])
  expect(tally.svg, 'the visible cells fetched their glyphs through the fixture too').toBeGreaterThan(0)
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
      answered: !!document.querySelector('.pl-empty'),
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
