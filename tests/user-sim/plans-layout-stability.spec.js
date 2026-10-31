// The Pro price never breaks mid-number, the Pro button does not jump between
// Monthly and Yearly, and nothing moves at 320 while the prices load.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-AU' })

const LIVE = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { aud: 10 }, yearly: { aud: 75 },
}
const stub = (page, delay) => page.route('**/api/get-prices*', async (route) => {
  if (delay) await delay
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(LIVE)) })
})
const cta = (page) => page.locator('.pr-head--pro .pr-cta').first()
const top = async (page) => Math.round((await cta(page).boundingBox()).y + await page.evaluate(() => window.scrollY))

for (const width of [1024, 1090, 1359]) {
  test(`at ${width} the price has one line and the button holds still across cadences`, async ({ page }) => {
    watch(page, 'someone comparing Monthly and Yearly')
    await page.setViewportSize({ width, height: 900 })
    await stub(page)
    await go(page, '/plans')
    const amt = page.locator('.pr-head--pro .pr-amt')
    await expect(amt).toHaveText(/A\$/)
    const oneLine = () => amt.evaluate((el) => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) + 1)
    const yearly = await top(page)
    expect(await oneLine(), 'Yearly price wraps').toBe(true)
    await page.locator('.pr-billing-opt', { hasText: /^Monthly/ }).click()
    await expect(amt).toHaveText('A$10')
    expect(await oneLine(), 'Monthly price wraps').toBe(true)
    expect(await top(page), 'the Pro button jumped between cadences').toBe(yearly)
  })
}

test('at 320 the Pro button is where it was while the prices load, and nothing scrolls sideways', async ({ page }) => {
  watch(page, 'someone on a small phone while prices load')
  await page.setViewportSize({ width: 320, height: 640 })
  let release
  const held = new Promise((resolve) => { release = resolve })
  await stub(page, held)
  await go(page, '/plans')
  await expect(page.locator('.pr-head--pro .pr-amt')).toHaveText('—')
  const loading = await top(page)
  release()
  await expect(page.locator('.pr-head--pro .pr-amt')).toHaveText(/A\$/)
  expect(await top(page), 'the Pro button moved when the prices landed').toBe(loading)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
