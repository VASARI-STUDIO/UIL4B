// Before anything is uploaded to the Alt Text tool, the page says the image
// goes to Google Gemini and that Google may use it.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'

for (const width of [390, 1440]) {
  test(`${width}px: the Gemini notice is visible above the dropzone and describes it`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await signIn(page, { plan: 'free' })
    await go(page, '/create/alt-text')

    const notice = page.locator('#alt-ai-consent')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('sent to Google Gemini')
    await expect(notice).toContainText('Google may use them to improve its products')

    const zone = page.locator('.alt-dropzone')
    await expect(zone).toHaveAttribute('aria-describedby', 'alt-ai-consent')
    const [n, z] = [await notice.boundingBox(), await zone.boundingBox()]
    expect(n.y + n.height, 'the notice sits above the dropzone').toBeLessThanOrEqual(z.y + 1)
  })
}
