// /plans answers the three questions a buyer asks before paying: when am I
// charged, how do I cancel, can I get a refund. Both layouts read one FAQ array.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

test.use({ locale: 'en-AU' })

const LIVE = {
  source: { monthly: 'live', yearly: 'live' },
  monthly: { aud: 10 }, yearly: { aud: 75 },
}
const stub = (page) => page.route('**/api/get-prices*', (route) => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(withAvailability(LIVE)),
}))

for (const width of [1440, 390]) {
  test(`at ${width} the FAQ covers charges, cancelling and refunds, and the retired words are gone`, async ({ page }) => {
    watch(page, 'someone checking the billing terms before paying')
    await page.setViewportSize({ width, height: 900 })
    await stub(page)
    await go(page, '/plans')
    const faq = page.locator('.pr-faq-sec')
    await expect(faq).toContainText(/charged/i)
    await expect(faq).toContainText(/cancel/i)
    await expect(faq).toContainText(/refund/i)
    await expect(faq.getByText('When am I charged?')).toBeVisible()
    const text = await page.locator('main').innerText()
    expect(text).not.toMatch(/cost us nothing/i)
    // The Free note belongs to the ledger's Free column.
    if (width >= 1024) expect(text).toContain('Free because most tools run in your browser.')
  })
}
