// THE LISTING ENDPOINT CAN BE REFUSED WHILE EVERYTHING ELSE ANSWERS.
//
// Measured against the live API: about the sixth /collection request inside a
// few seconds was answered 429 (Cloudflare error 1015, Retry-After about an
// hour) for every prefix, while /collections, /search and the batched
// /{prefix}.json?icons= stayed 200. The page used to ask /collection for every
// pack it listed on load, so a visit tripped the limit itself and showed the
// "Couldn't reach the icon service" fallback over a service that was fine.
//
// refuseIconifyCollections (iconify-stub.js) reproduces that refusal on the page.
//
// MUTATIONS (each turns a test red):
//   - in IconLibrary.jsx browseAll, list packs through getCollectionNames again
//     instead of defaultPackNames -> the first test (requests to /collection
//     are no longer zero, and the grid falls back to the built-in set).
//   - drop the lastResort option of getPublicCollectionNames -> the second test
//     (the pack shows the built-in notice instead of its first icons).
//   - drop the setSoftNotice('partial') in browseGroup -> the third test.
import { test, expect } from './base.js'
import { go, signIn, watch, chooseMenuOption } from './helpers.js'
import { isLiveIconify, refuseIconifyCollections, withholdSnapshots } from './iconify-stub.js'

const LIVE = 'the live API decides what it serves; this spec pins the refused shape'
const BUILT_IN = /couldn.t reach the icon service/i

const collectionRequests = (page) => {
  const urls = []
  page.on('request', (r) => { if (new URL(r.url()).pathname === '/collection') urls.push(r.url()) })
  return urls
}

test('signed out, with /collection refused, the default grid is live and says nothing is wrong', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a visitor on a connection whose icon API listing endpoint is rate-limited')
  await refuseIconifyCollections(page)
  const asked = collectionRequests(page)
  await go(page, '/create/icons')
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20_000 }).toBeGreaterThan(20)

  await expect(page.getByText(BUILT_IN)).toHaveCount(0)
  await expect(page.locator('.ig-notice')).toHaveCount(0)
  expect(asked, 'the default listing must not spend the /collection allowance').toEqual([])
  // Live glyphs composed from the batched answer (a symbol in the page's sprite, or a
  // data: URI for the packs kept as images), not the built-in set.
  const live = await page.evaluate(() => [...document.querySelectorAll('.ig .ic :is(img, svg.ig-sym)')].filter((c) => (
    c.matches('svg') ? !!document.querySelector(`#ig-sprite ${c.querySelector('use').getAttribute('href')}`) : c.src.startsWith('data:') && c.naturalWidth > 0
  )).length)
  expect(live, 'the cells are catalogue glyphs').toBeGreaterThan(20)
})

test('one pack whose listing is refused still shows its first icons, with a quiet line and no built-in notice', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a designer picking a pack while /collection is refused')
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page, { plan: 'pro' })
  await refuseIconifyCollections(page)
  // The site's own pack lists would answer a picked pack before /collection is asked; this test is about the
  // pack whose list the site does not hold, so they are taken away.
  await withholdSnapshots(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })
  await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'tabler')

  const quiet = page.getByRole('status').filter({ hasText: /showing its first icons/ })
  await expect(quiet).toBeVisible({ timeout: 15_000 })
  await expect(quiet.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByText(BUILT_IN)).toHaveCount(0)
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20_000 }).toBeGreaterThan(20)
})

test('a group with three of its four listings refused shows what loaded and says some sets did not', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a designer opening Flags while /collection is mostly refused')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await refuseIconifyCollections(page, { except: ['circle-flags'] })
  await withholdSnapshots(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })

  const flags = page.getByRole('button', { name: 'Flags', exact: true })
  const groupMenu = page.getByRole('button', { name: /^Group\b/ })
  await expect(flags.or(groupMenu).first()).toBeVisible()
  if (!await flags.isVisible()) await groupMenu.click()
  await flags.click()

  const quiet = page.getByRole('status').filter({ hasText: /Some icon sets couldn.t load/ })
  await expect(quiet).toBeVisible({ timeout: 15_000 })
  await expect(quiet.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.getByText(BUILT_IN)).toHaveCount(0)
  expect(await page.locator('.ig .ic').count(), 'the packs that loaded are on screen').toBeGreaterThan(4)
})

test('with /collection refused, a picked pack and a group still list in full from the site\'s own copy, with no notice', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a designer picking packs while /collection is refused')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await refuseIconifyCollections(page)
  const asked = collectionRequests(page)
  await go(page, '/create/icons')
  await expect(page.locator('.ic').first()).toBeVisible({ timeout: 20_000 })

  await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'tabler')
  await expect(page.getByRole('button', { name: 'Icon pack' })).toContainText('Tabler')
  // The site's tabler list is the fixture's 20 names; the regular weight leaves out the two "-filled" ones.
  // Wait for THAT list: until it lands the grid is still the "All packs" one, which is hundreds of cells, so
  // a bare "more than 20 cells" is true of the page being left rather than of the pack picked.
  await expect(page.locator('#ig-result-count')).toHaveText('18 icons', { timeout: 20_000 })
  await expect.poll(() => page.locator('.ig .ic :is(img, svg.ig-sym)').count(), { timeout: 20_000, message: 'every cell of the list is drawn' }).toBe(18)
  await expect(page.locator('.ig-notice')).toHaveCount(0)

  // A group chip with a pack picked only narrows that pack (tabler has no flags, so nothing would move), so
  // go back to every pack before asking for the group.
  const listed = async () => Number((await page.locator('#ig-result-count').textContent()).replace(/\D/g, ''))
  await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'all')
  await expect.poll(listed, { timeout: 20_000, message: 'every pack is listed again' }).toBeGreaterThan(1000)
  const flags = page.getByRole('button', { name: 'Flags', exact: true })
  const groupMenu = page.getByRole('button', { name: /^Group\b/ })
  await expect(flags.or(groupMenu).first()).toBeVisible()
  if (!await flags.isVisible()) await groupMenu.click()
  await flags.click()
  // The "All packs" list is still on screen until the four flag lists land, so wait for the figure to drop.
  await expect.poll(listed, { timeout: 20_000, message: 'the Flags group replaced the full listing' }).toBeLessThan(1000)
  expect(await listed(), 'the group lists more than the one pack picked before it').toBeGreaterThan(18)
  await expect.poll(async () => (await page.locator('.ig .ic :is(img, svg.ig-sym)').count()) - (await listed()), { timeout: 20_000, message: 'every listed flag is drawn' }).toBe(0)
  await expect(page.locator('.ig-notice')).toHaveCount(0)
  await expect(page.getByText(BUILT_IN)).toHaveCount(0)
  expect(asked, 'the lists came from the site, so /collection was never asked').toEqual([])
})
