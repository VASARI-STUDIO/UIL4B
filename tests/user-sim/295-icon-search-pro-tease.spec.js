// A SEARCH THAT MATCHES MORE THAN THE VIEWER MAY OPEN SHOWS BLURRED ICONS AND ONE WAY IN.
//
// /create/icons, a viewer below Pro searches. The matches in sets above their tier are counted with one
// extra /search (names only), and the page answers in place:
//   * nothing in the viewer's own sets: blurred rows and a band replace "No icons match";
//   * results that have run out: the same rows and band sit under the grid;
//   * any match that needs Pro: the button is a link to /plans. Signed out with only account-tier
//     matches: it opens the login popup.
// A Pro viewer gets nothing. No request ever asks for a locked pack's drawing.
//
// The fixture (tests/user-sim/fixtures/iconify/search.json) already answers these queries:
//   "apple"       logos, devicon, simple-icons                  (Pro only)
//   "github"      lucide (open) + logos, devicon, skill-icons, simple-icons (Pro)
//   "heart-bold"  solar                                         (account tier: closed signed out)
//
// HOW TO SEE EACH FAIL (src/ unless named):
//   searchTeaseBand returns null for 'empty' (utils/iconSearchTease.js)        -> "only Pro matches"
//   the 'end' variant is dropped, so the generic free band shows again          -> "matches in both"
//   probeLockedMatches loses its `tier === 'paid'` guard                        -> "Pro viewer"
//   searchTeaseNeed returns 'paid' for account-tier matches                     -> "signed out, account-tier"
//   the probe reads a glyph (a /<pack>.json?icons= or .svg for a locked pack)   -> "no request asks for a locked drawing"
//   IconEndTease loses aria-hidden or gains a tabIndex                          -> "blurred cells are hidden"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS } from './iconify-stub.js'

const PRO_PACKS = ['logos', 'devicon', 'simple-icons', 'skill-icons']

function iconifyUrls(page) {
  const urls = []
  page.on('request', (r) => {
    try {
      if (ICONIFY_HOSTS.includes(new URL(r.url()).hostname)) urls.push(decodeURIComponent(r.url()))
    } catch { /* not a URL we can read */ }
  })
  return urls
}

async function openLibrary(page, width, plan) {
  await page.setViewportSize({ width, height: 900 })
  if (plan) await signIn(page, { plan })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.ig-skel')).toHaveCount(0, { timeout: 20_000 })
}

const search = (page, q) => page.getByLabel('Search icons').first().fill(q)
const band = (page) => page.locator('.geg[data-gate="search"]')

/** No glyph request (batched or single) names any of these packs. */
function expectNoGlyphFor(urls, packs) {
  for (const pack of packs) {
    expect(urls.filter((u) => u.includes(`/${pack}.json?icons=`)), `a batched glyph request for ${pack}`).toEqual([])
    expect(urls.filter((u) => new RegExp(`/${pack}/[^/]+\\.svg`).test(u)), `a single glyph request for ${pack}`).toEqual([])
  }
}

for (const width of [390, 1440]) {
  test.describe(`${width}: free viewer`, () => {
    test('a query with only Pro matches: blurred cells and the band replace the empty message, and the button goes to /plans', async ({ page }) => {
      watch(page, 'a designer on the free plan searching for a brand')
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'free')
      await search(page, 'apple')

      const b = band(page)
      await expect(b).toBeVisible({ timeout: 20_000 })
      await expect(b.getByRole('heading', { level: 2 })).toHaveText('3 icons match “apple” in Pro sets')
      await expect(b.locator('.geg-p')).toContainText('Nothing matches in the sets you can open.')
      await expect(page.getByText(/No icons match/)).toHaveCount(0)

      const link = b.getByRole('link', { name: 'See Pro' })
      await expect(link).toHaveAttribute('href', '/plans')
      expect((await link.boundingBox()).height, 'a 44px target').toBeGreaterThanOrEqual(44)

      // As many stand-ins as the matches counted, never two full rows for three.
      await expect(b.locator('.ig-end-cell')).toHaveCount(3)
      // The whole band is announced, count and term included.
      await expect(b.getByRole('status')).toContainText('3 icons match “apple” in Pro sets')
      await page.screenshot({ path: `.claude/scratch/conv1/search-pro-only-${width}.png` })

      expectNoGlyphFor(urls, PRO_PACKS)
      const probes = urls.filter((u) => u.includes('/search?') && u.includes('prefixes=') && u.includes('simple-icons'))
      expect(probes.length, 'one count request for the locked packs').toBe(1)
      expect(probes[0], 'the probe leaves out sets this viewer opens').not.toContain('lucide')
    })

    test('a query with matches in both: the grid, then the band at the end', async ({ page }) => {
      watch(page, 'a designer on the free plan searching for github')
      const urls = iconifyUrls(page)
      await openLibrary(page, width, 'free')
      await search(page, 'github')

      const b = band(page)
      await expect(b).toBeVisible({ timeout: 20_000 })
      await expect(b.getByRole('heading', { level: 2 })).toHaveText('5 more icons match “github” in Pro sets')
      await expect(page.locator('.ig .ic:not(.ig-skel)')).toHaveCount(1)
      const [gridBox, bandBox] = await Promise.all([page.locator('.ig').boundingBox(), b.boundingBox()])
      expect(bandBox.y, 'the band comes after the grid').toBeGreaterThanOrEqual(gridBox.y + gridBox.height)
      await expect(page.locator('.geg[data-gate="free"]'), 'the generic upgrade band is not stacked under it').toHaveCount(0)
      await expect(b.getByRole('link', { name: 'See Pro' })).toHaveAttribute('href', '/plans')
      expectNoGlyphFor(urls, PRO_PACKS)
    })

    test('the blurred cells are hidden from assistive tech, unfocusable and take no pointer', async ({ page }) => {
      watch(page, 'a designer using a screen reader')
      await openLibrary(page, width, 'free')
      await search(page, 'apple')
      const tease = band(page).locator('.ig-end-tease')
      await expect(tease).toBeVisible({ timeout: 20_000 })
      await expect(tease).toHaveAttribute('aria-hidden', 'true')
      expect(await tease.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
      expect(await tease.locator('a, button, input, select, textarea, [tabindex]').count(), 'not focusable').toBe(0)
      expect(await tease.locator('title, [aria-label], [alt]').count(), 'no name or pack in the cells').toBe(0)
    })
  })
}

test('a Pro viewer gets no band for the same search', async ({ page }) => {
  watch(page, 'a designer on Pro searching for a brand')
  const urls = iconifyUrls(page)
  await openLibrary(page, 1440, 'pro')
  await search(page, 'apple')
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(800)
  await expect(page.locator('.geg')).toHaveCount(0)
  expect(urls.filter((u) => u.includes('/search?') && u.includes('prefixes=')), 'Pro sends no scoped count request').toEqual([])
})

test('signed out, with only account-tier matches, the button opens the login popup', async ({ page }) => {
  watch(page, 'a visitor who has not signed up searching for a set a free account opens')
  const urls = iconifyUrls(page)
  await openLibrary(page, 1440)
  await search(page, 'heart-bold')

  const b = band(page)
  await expect(b).toBeVisible({ timeout: 20_000 })
  await expect(b.getByRole('heading', { level: 2 })).toHaveText('1 icon matches “heart-bold” in sets a free account opens')
  await expect(b.getByRole('link'), 'a login, not a link to /plans').toHaveCount(0)
  await b.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('dialog').filter({ has: page.locator('#ui-login-title') })).toBeVisible()
  expectNoGlyphFor(urls, ['solar', ...PRO_PACKS])
})

test('signed out, with results, the existing band carries the count instead of a second band', async ({ page }) => {
  watch(page, 'a visitor searching for github')
  await openLibrary(page, 1440)
  await search(page, 'github')
  const anon = page.locator('.geg[data-gate="anon"]')
  await expect(anon.locator('.geg-p')).toContainText('more icons match “github”', { timeout: 20_000 })
  await expect(page.locator('.geg')).toHaveCount(1)
})
