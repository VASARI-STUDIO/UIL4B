// THE ICON SEARCH BOX, AUDITED: THREE BUGS, EACH WITH A TEST THAT FAILS ON THE OLD CODE.
//
//   1. With the icon service refused, the built-in fallback matched the whole query as one
//      phrase, so "arrow up" found nothing although the built-ins hold "arrow-up".
//   2. The Clear button unmounts when the field empties, so keyboard focus fell to the page.
//   3. A search typed while the page was scrolled down put its results at the same scroll
//      offset, with the first rows of the answer above the screen.
//
// SHOULD FAIL ON origin/main: all three. Each is a single-line revert away:
//   - test 1: restore `i.n.indexOf(q) !== -1` in renderLocal;
//   - test 2: drop `inputRef.current?.focus()` from LibrarySearch;
//   - test 3: drop `scrollOnLand.current = true` from handleQueryChange.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { refuseIconify, isLiveIconify } from './iconify-stub.js'

const REAL_CELL = '.ig .ic:not(.ig-skel)'
const LIVE = 'the live API decides what it serves; this spec pins the fixture'
const searchBox = (page) => page.getByRole('searchbox', { name: /search icons/i })

test('with the icon service refused, a two-word query finds the hyphenated built-in', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a visitor whose network blocks the icon service')
  await page.setViewportSize({ width: 1440, height: 900 })
  await refuseIconify(page)
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first(), 'POSITIVE CONTROL: the built-in grid is up').toBeVisible({ timeout: 20_000 })

  await searchBox(page).fill('arrow')
  await expect.poll(() => page.locator(REAL_CELL).count(), { timeout: 20_000, message: 'one word finds arrows' }).toBeGreaterThan(0)
  const oneWord = await page.locator(REAL_CELL).count()

  await searchBox(page).fill('arrow up')
  await expect.poll(async () => (await page.locator(REAL_CELL).evaluateAll((cells) => cells.map((c) => c.getAttribute('aria-label') || ''))).some((l) => /arrow-up/.test(l)), {
    timeout: 20_000,
    message: '"arrow up" finds arrow-up in the built-in set',
  }).toBe(true)
  // Two words narrow the answer; they do not widen it.
  expect(await page.locator(REAL_CELL).count()).toBeLessThanOrEqual(oneWord)
})

test('clearing the search with the button keeps focus in the field', async ({ page }) => {
  watch(page, 'a keyboard user clearing the icon search')
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  const box = searchBox(page)
  await box.fill('arrow')
  await page.getByRole('button', { name: 'Clear search' }).focus()
  await page.keyboard.press('Enter')
  await expect(box).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(0)
  await expect(box, 'focus is back in the field, not on the page').toBeFocused()
})

test('a search typed while scrolled down brings the first result into view', async ({ page }) => {
  test.skip(isLiveIconify(), LIVE)
  watch(page, 'a designer searching from halfway down the icon library')
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/icons')
  const box = searchBox(page)
  await expect(page.locator(REAL_CELL).first()).toBeVisible({ timeout: 20_000 })
  // A long first answer, so there is a long way to scroll.
  await box.fill('ar')
  await expect.poll(() => page.locator(REAL_CELL).count(), { timeout: 20_000 }).toBeGreaterThan(100)
  await page.evaluate(() => window.scrollTo(0, 2200))
  await expect.poll(() => page.evaluate(() => window.scrollY), { message: 'POSITIVE CONTROL: the page really is scrolled down' }).toBeGreaterThan(1500)

  // A shorter answer, typed from where the page now is.
  await box.fill('arrow')
  await expect.poll(() => page.locator(REAL_CELL).count(), { timeout: 20_000 }).toBeLessThan(100)
  await expect.poll(async () => {
    const top = await page.locator(REAL_CELL).first().evaluate((el) => el.getBoundingClientRect().top)
    return top >= 0 && top < 844
  }, { timeout: 5000, message: 'the first result is on screen' }).toBe(true)
})
