// WHEN /api/ai REFUSES AN ATTEMPT, THE TOOL SAYS SO ON THE CARD.
//
// Besides the plan allowance, /api/ai now answers 429 when an account makes too
// many attempts, when a network has used its free allowance for the day, or when
// the site-wide breaker is open (api/_lib/aiLimits.js). Those refusals carry
// { error, rateLimited } and no `usage`, and the long waits send no `retryAfter`
// in the body, so the Alt Text page shows the sentence as it is and does not
// sleep on it. The page must show the server's sentence, leave the image in
// place with a Retry button, and not mark the attempt as spent.
//
// MUTATION: make the page treat any 429 as retryable (retry on a body without
// retryAfter) and the second request below appears; drop the `error` text from
// the card and the sentence assertion fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const REFUSALS = [
  { scope: 'hour', error: 'You have made a lot of AI requests this hour. Try again in about 40 minutes.' },
  { scope: 'ip', error: 'Free AI use from this network has reached its daily limit. Try again in about 20 hours, or upgrade to Pro.' },
  { scope: 'site', error: 'The AI tools have reached their limit for today. Try again in about 3 hours.' },
]

async function pngBytes(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200
    const x = c.getContext('2d'); x.fillStyle = '#1c40f2'; x.fillRect(0, 0, 320, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  return Buffer.from(b64, 'base64')
}

for (const width of [390, 1440]) {
  for (const { scope, error } of REFUSALS) {
    test(`${width}px · Alt Text: a ${scope} refusal is shown as written, once, and the image stays`, async ({ page }) => {
      watch(page, `a signed-in free user refused by the ${scope} limit on a ${width}px screen`)
      await page.setViewportSize({ width, height: 844 })
      await signIn(page, { plan: 'free' })
      const calls = []
      await page.route('**/api/ai', (route) => {
        calls.push(route.request().postData())
        return route.fulfill({
          status: 429,
          headers: { 'Retry-After': '1200' },
          contentType: 'application/json',
          body: JSON.stringify({ error, rateLimited: scope }),
        })
      })
      await go(page, '/create/alt-text')
      await page.locator('.alt-dropzone input[type="file"]')
        .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: await pngBytes(page) })
      await expect(page.locator('.alt-card-ready')).toHaveCount(1, { timeout: 10000 })

      const generateHome = width < 768 ? '[data-tl-dock]' : '[data-tool-toolbar]'
      await page.locator(generateHome).getByRole('button', { name: /^Generate/ }).click()

      await expect(page.locator('.alt-card-error-msg')).toHaveText(error)
      await expect(page.locator('.alt-card')).toHaveCount(1)
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
      expect(calls, 'a refusal without retryAfter must not be retried automatically').toHaveLength(1)
    })
  }
}
