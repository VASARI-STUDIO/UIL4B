// ICON LIBRARY: FOUR SMALL PROMISES THAT HAVE TO KEEP HOLDING.
//
//   1. There is no Emoji group chip. The Emoji tab owns emoji; the sets stay in the pack menu.
//   2. Try again after a failed search sends one /search request. Typing after a failure
//      answers from the built-in set without asking, but Try again is the visitor asking on purpose.
//   3. A saved custom icon is cleaned with the allow-list sanitiser when it opens, so a saved
//      <animate> or <foreignObject> never reaches the customiser's stage.
//   4. The Filters badge counts a weight only when the current scope can draw it: Bold stored
//      and Flags chosen reads 1 (Flags), not 2.
//
// MUTATIONS (each turns its test red):
//   - put `emoji: { label: 'Emoji', packs: [...] }` back in ICON_GROUPS / GROUP_ORDER -> test 1.
//   - drop `&& !manualRetry` from the cdnOk check in doSearch -> test 2 (no request goes out).
//   - build localBase for a saved icon from the raw svg again -> test 3.
//   - drop `&& weightState(weight).ok` from activeFilters -> test 4 (the badge reads 2).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, REFUSED_VALUE, isLiveIconify } from './iconify-stub.js'

const LIVE = 'the live API decides what it serves; this spec pins the refused shape'
const REFUSED = 'visitor whose icon catalogue is refused'

test('the group chips are Coloured, Brand logos and Flags, with no Emoji chip, and the emoji sets stay in the pack menu', async ({ page }) => {
  watch(page, 'a designer looking for the icon group chips')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('.ig-toolbar')).toBeVisible({ timeout: 20_000 })
  const trigger = page.locator('.ig-toolbar .lbry-filtertrig', { hasText: 'Group' })
  if (await trigger.count()) await trigger.click()
  const tray = page.getByRole('group', { name: 'Filter by icon group' }).first()
  await expect(tray).toBeVisible({ timeout: 20_000 })
  const names = await tray.locator('.lbry-filter').allTextContents()
  expect(names.map((n) => n.replace(/\s+/g, ' ').trim()), 'PRESENCE: the three chips are there').toEqual([
    expect.stringMatching(/^Coloured/), expect.stringMatching(/^Brand logos/), expect.stringMatching(/^Flags/),
  ])
  await expect(tray.getByRole('button', { name: /^Emoji/ })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // The sets are not gone: they are still in the pack menu.
  await page.getByRole('button', { name: 'Icon pack' }).click()
  const list = page.locator('.menu-select-list[role="listbox"]')
  for (const pack of ['twemoji', 'noto', 'openmoji']) {
    await expect(list.locator(`[role="option"][data-value="${pack}"]`), `${pack} is in the pack menu`).toHaveCount(1)
  }
})

test('Try again after a failed search sends exactly one /search request', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, REFUSED)
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE, 'access-control-allow-origin': '*' }
  const isSearch = (u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/search'
  let searches = 0
  let refusing = true
  await page.route(isSearch, (route) => {
    searches += 1
    if (!refusing) return route.fallback()
    return route.fulfill({ status: 503, contentType: 'text/plain', headers, body: 'Service Unavailable' })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

  await page.locator('.lbry-search input').first().fill('arrow')
  const notice = page.getByRole('status').filter({ hasText: /Couldn.t reach the icon service/ })
  await expect(notice).toBeVisible({ timeout: 20_000 })
  const afterFailure = searches
  expect(afterFailure, 'POSITIVE CONTROL: the search did go out and was refused').toBeGreaterThan(0)

  refusing = false
  await notice.getByRole('button', { name: 'Try again' }).click()
  await expect(notice).toHaveCount(0, { timeout: 20_000 })
  // The request leaves a tick after the notice clears (the cache is read first), so wait for it,
  // then wait out a second look to show it is one and not a burst.
  await expect.poll(() => searches - afterFailure, { message: 'Try again sent a /search request' }).toBe(1)
  await page.waitForTimeout(1500)
  expect(searches - afterFailure, 'Try again sent exactly one /search request').toBe(1)
})

test('a saved custom icon with <animate> and <foreignObject> opens in the customiser without them', async ({ page }) => {
  watch(page, 'a Pro designer opening a saved icon that carries script-adjacent markup')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  const dirty = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">'
    + '<path fill="#000" d="M13 2 3 14h9l-1 8 10-12h-9z"><animate attributeName="opacity" from="0" to="1" dur="1s"/></path>'
    + '<foreignObject x="0" y="0" width="24" height="24"><div xmlns="http://www.w3.org/1999/xhtml">hello</div></foreignObject></svg>'
  const record = {
    key: 'vs-custom-icons:1:dirty', ts: 1, base: 'pasted', iteration: 1, projectId: null, name: 'Custom (pasted 1)', custom: true,
    pack: 'custom', cdn: false, size: 24, stroke: 2, absStroke: true, cap: 'round', join: 'round', isStroke: false, strokeUnit: 'px',
    color: '#000000', colored: true, svg: dirty,
  }
  await page.evaluate((list) => localStorage.setItem('vs-custom-icons', JSON.stringify(list)), [record])
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await page.locator('.ig-toolbar button.ig-mine').click()
  await page.locator('.ig .ic', { hasText: 'Custom (pasted 1)' }).click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })
  // Everything the stage draws: the inline host's markup and any image it shows as a data: URI.
  const drawn = async () => page.locator('.icust-stage').evaluate((el) => (
    el.innerHTML + [...el.querySelectorAll('img')].map((i) => decodeURIComponent(i.getAttribute('src') || '')).join('\n')
  ))
  await expect.poll(async () => /<path/i.test(await drawn()), { message: 'POSITIVE CONTROL: the icon is drawn' }).toBe(true)
  const markup = await drawn()
  expect(markup).not.toMatch(/<animate/i)
  expect(markup).not.toMatch(/foreignObject/i)
})

test('the Filters badge reads 1 with Bold stored and Flags chosen, because Flags cannot draw Bold', async ({ page }) => {
  watch(page, 'someone who chose Bold and then Flags')
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const count = filters.locator('.lbry-filtersbtn-count')
  await page.locator('.lbry-toolbar-quick .ig-weight').getByRole('button', { name: /^Bold/ }).click()
  await expect(count, 'POSITIVE CONTROL: Bold alone counts').toHaveText('1')

  await filters.click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await sheet.getByRole('button', { name: 'Flags', exact: true }).click()
  await sheet.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })
  await expect(count, 'Flags counts, the Bold it cannot draw does not').toHaveText('1')
})
