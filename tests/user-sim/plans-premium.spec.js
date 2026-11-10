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
    const faq = page.getByRole('region', { name: 'Common questions' }).or(page.locator('section[aria-labelledby="pl-faq-h"]'))
    await expect(faq.first()).toContainText(/charged/i)
    await expect(faq.first()).toContainText(/cancel/i)
    await expect(faq.first()).toContainText(/refund/i)
    for (const q of ['When am I charged?', 'How do I cancel?', 'Can I get a refund?']) {
      const button = page.getByRole('button', { name: q })
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      await expect(page.getByRole('region', { name: q })).toBeVisible()
    }
    const text = await page.locator('main').innerText()
    expect(text).not.toMatch(/cost us nothing/i)
    // The Free card keeps its own reassurance line without the retired wording.
    expect(text).toContain('there’s no time limit')
  })
}
