// ICON LIBRARY RELIABILITY: FOUR PROMISES FOR A VISITOR WHOSE ICON SERVICE IS REFUSED, WHO PICKS AN ODD SCOPE, OR WHOSE ICON FILE FAILS ONCE.
//
//   1. With Iconify refused, the built-in grid stays filled: the notice shows, and the grid is
//      still there well after the 2.5 s first-page timer has fired (on the first visit and on a
//      reload inside the stored cool-down).
//   2. With Logo.dev picked, the Flags chip leaves the pack and shows flags (it used to light
//      and change nothing).
//   3. An outline-only built-in in the Recent rail is drawn as its outline, not a filled wedge,
//      even when the entry was saved with a stale `filled` flag.
//   4. When an icon's own file fails (a 500, or a 200 that is a portal page), the customiser's
//      stage says so with a Try again button (a 44px target on a phone), and pressing it, once
//      the service is back, draws the icon.
//
// SEEN TO FAIL (src restored byte for byte after each; see the report for the runs):
//   - IconLibrary.jsx at HEAD (none of the fixes)                  -> tests 2, 3 and all four of 4 red.
//   - drop the logodev line from handleGroupToggle (scopePack = pack) -> test 2 (the pack stays Logo.dev).
//   - make recentIsFilled return `!!entry.filled` only                -> test 3 (the tick has a fill).
//   - drop `setLoadTry(n => n + 1)` from retryLoad                    -> all four of test 4 (nothing asks again).
//   - return `text` unchecked in fetchSvgText, drop the evict in the fetch effect AND in retryLoad
//                                                                     -> the two "portal page" cases of test 4. Either evict alone
//                                                                        is enough to keep them green: the stage is guarded twice.
//
// NOT SEEN TO FAIL: test 1. Dropping `|| !holding` from reveal in browseAll leaves it green, and so
// does IconLibrary.jsx at HEAD. The wipe needs every pack to settle before the page has armed its
// first-page timer; with a stubbed service the responses always arrive after the arm (tried: a
// reload inside the cool-down, and 4x and 10x CPU throttling). Test 1 pins the outcome a visitor
// sees; the guard itself is held only by tests/unit/icon-library-reliability.test.js, which reads source.
import { test, expect } from './base.js'
import { go, watch, chooseMenuOption, signIn } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, REFUSED_VALUE, isLiveIconify, refuseIconify } from './iconify-stub.js'

// A real cell, not the loading skeleton.
const REAL_CELL = '.ig .ic:not(.ig-skel)'
const FLAG_PACK_LABEL = /, (Circle Flags|Flag Icons|Flagpack|Currency Flags)$/
const LIVE = 'the live API decides what it serves; this spec pins the refused shape'

test('with the icon service refused, the built-in grid stays filled after the first-page timer', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a visitor whose network blocks the icon service')
  await page.setViewportSize({ width: 390, height: 844 })
  await refuseIconify(page)
  const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
  const builtIns = () => page.locator(REAL_CELL).count()
  // Two visits: the first meets the refusal over the network. The second is the reload, which
  // meets the stored cool-down, so every pack fails before the page has armed its 2.5 s
  // first-page timer; the timer then fires over a grid that is already showing.
  for (const visit of ['first visit', 'reload inside the cool-down']) {
    await go(page, '/create/icons')
    await expect(notice, `${visit}: the notice shows`).toBeVisible({ timeout: 20_000 })
    await expect.poll(builtIns, { timeout: 20_000, message: `${visit}: POSITIVE CONTROL, built-in icons are shown` }).toBeGreaterThan(0)
    // The first-page timer is 2.5 s; look again after it has certainly fired.
    await page.waitForTimeout(4000)
    expect(await builtIns(), `${visit}: the late timer did not wipe the built-in grid`).toBeGreaterThan(0)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(500)
    expect(await builtIns(), `${visit}: still filled at 1440`).toBeGreaterThan(0)
    await page.setViewportSize({ width: 390, height: 844 })
  }
})

test('the Flags chip leaves the Logo.dev pack and shows flags', async ({ page }) => {
  watch(page, 'a Pro designer on the Logo.dev pack who taps Flags')
  await page.setViewportSize({ width: 1440, height: 900 })
  // Logo.dev is a Pro pack, and so is the Flags group.
  await signIn(page, { plan: 'pro' })
  await page.route('https://img.logo.dev/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path fill="#0078d4" d="M4 4h20v20H4z"/></svg>',
  }))
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  const pack = page.getByRole('button', { name: 'Icon pack' })
  await chooseMenuOption(page, pack, 'logodev')
  await expect(pack).toContainText(/Logo\.dev/)
  await expect(page.locator('.ig .ic img[src*="img.logo.dev"]').first(), 'POSITIVE CONTROL: Logo.dev logos are in the grid').toBeVisible({ timeout: 20_000 })

  const flags = page.getByRole('button', { name: 'Flags', exact: true })
  const groupMenu = page.getByRole('button', { name: /^Group\b/ })
  await expect(flags.or(groupMenu).first()).toBeVisible()
  if (!await flags.isVisible()) await groupMenu.click()
  await flags.click()

  await expect(pack, 'the pack menu went back to All packs').not.toContainText(/Logo\.dev/)
  await expect(page.locator('.ig .ic img[src*="img.logo.dev"]'), 'no Logo.dev logos are left in the grid').toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  // Every cell is labelled "Customise <name>, <pack>"; all of them are from a flag set.
  await expect.poll(async () => {
    const labels = await page.locator(REAL_CELL).evaluateAll(cells => cells.map(c => c.getAttribute('aria-label') || ''))
    return labels.length > 0 && labels.every(l => FLAG_PACK_LABEL.test(l))
  }, { timeout: 20_000, message: 'the grid holds only flag-set icons' }).toBe(true)
})

test('an outline-only built-in in the Recent rail is not drawn as a filled wedge', async ({ page }) => {
  watch(page, 'a returning designer whose Recent rail holds a tick')
  await page.setViewportSize({ width: 390, height: 844 })
  // A recent saved with a stale `filled: true`; `check` is a single open stroke in the Lucide built-ins.
  await page.addInitScript(() => {
    localStorage.setItem('vs-recent-icons', JSON.stringify([
      { key: 'local:check', action: 'copy', ts: Date.now(), cdn: false, name: 'check', d: 'M20 6L9 17l-5-5', filled: true },
    ]))
  })
  await go(page, '/create/icons')
  const tick = page.locator('.ig-rail-item svg').first()
  await expect(tick).toBeVisible({ timeout: 20_000 })
  expect(await tick.getAttribute('fill'), 'drawn as an outline').toBe('none')
  expect(await tick.getAttribute('stroke')).toBe('currentColor')
})

// Every glyph file the page can draw an icon from: the .svg of one icon, and the batched
// /<pack>.json?icons=... the grid and the Recent rail fill from. The customiser paints at once
// from a glyph the grid already holds, so a failed stage needs both refused (the catalogue and
// search still answer, as in the 2026-09-15 outage). While `refusing.on` the answer is `answer`;
// the page route outranks the fixture, and the REFUSED_VALUE stamp lets the context audit read it
// as deliberate. `refusing.hits` counts the asks for an icon's own .svg.
async function refuseGlyphFiles(page, answer) {
  const refusing = { on: true, hits: 0 }
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route(
    (u) => ICONIFY_HOSTS.includes(u.hostname)
      && (u.pathname.endsWith('.svg') || (/^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons='))),
    (route) => {
      if (!refusing.on) return route.fallback()
      if (new URL(route.request().url()).pathname.endsWith('.svg')) refusing.hits += 1
      return route.fulfill({ ...answer, headers })
    },
  )
  return refusing
}

const REFUSALS = {
  'a server error': { status: 500, contentType: 'text/plain', body: 'Internal Server Error' },
  'a portal page served as a 200': { status: 200, contentType: 'text/html', body: '<html><body>Sign in to the guest network</body></html>' },
}

for (const [shape, answer] of Object.entries(REFUSALS)) {
  for (const view of [{ width: 390, height: 844, touch: true }, { width: 1440, height: 900, touch: false }]) {
    test(`Try again on the customiser's failed stage draws the icon (${shape}, ${view.width}px)`, async ({ browser }) => {
      test.skip(isLiveIconify(), LIVE)
      const ctx = await browser.newContext({
        colorScheme: 'dark', viewport: { width: view.width, height: view.height }, hasTouch: view.touch, isMobile: view.touch,
      })
      const page = await ctx.newPage()
      watch(page, 'a designer whose icon file failed to load once')
      await signIn(page, { plan: 'pro' })
      const refusing = await refuseGlyphFiles(page, answer)
      // The customiser is opened from the Recent rail, from a Lucide entry that is a CDN icon by
      // construction. Going through the grid would not do: while the icon service is refused the
      // grid first shows Lucide cells waiting on their glyphs and then swaps to the built-in set,
      // which has an `arrow-right` of its own drawn from embedded markup. A click that lands after
      // the swap opens that icon, which cannot fail, and the test then waits for a message that
      // can never come. The rail does not swap, and Lucide is drawn inline from the icon's own
      // markup, which is the file refused here.
      await page.addInitScript(() => {
        localStorage.setItem('vs-recent-icons', JSON.stringify([
          { key: 'lucide:arrow-right', action: 'copy', ts: Date.now(), cdn: true, pack: 'lucide', name: 'arrow-right' },
        ]))
      })
      await go(page, '/create/icons')
      await page.getByRole('button', { name: 'Copied arrow-right — open to customise' }).click({ timeout: 20_000 })

      const stage = page.locator('.ied-ground')
      await expect(stage).toBeVisible({ timeout: 20_000 })
      await expect(stage.getByRole('status').filter({ hasText: /Couldn.t load this icon/ })).toBeVisible({ timeout: 20_000 })
      const retry = stage.getByRole('button', { name: 'Try again' })
      await expect(retry, 'the failed stage offers Try again').toBeVisible()
      await expect(stage.locator('.ied-stage-host svg'), 'POSITIVE CONTROL: nothing is drawn while the file is refused').toHaveCount(0)
      expect(refusing.hits, 'POSITIVE CONTROL: the refusal was hit').toBeGreaterThan(0)
      if (view.touch) expect(Math.round((await retry.boundingBox()).height), 'a thumb-sized target').toBeGreaterThanOrEqual(44)

      // The service recovers; one press asks again.
      refusing.on = false
      const hitsBefore = refusing.hits
      await retry.click()
      await expect(stage.locator('.ied-stage-host svg'), 'the icon is drawn after Try again').toBeVisible({ timeout: 20_000 })
      await expect(retry).toBeHidden()
      expect(refusing.hits, 'the retry did not reach the refusal again').toBe(hitsBefore)
      await ctx.close()
    })
  }
}
