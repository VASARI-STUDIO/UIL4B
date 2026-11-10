// TWO SMALL GAPS ON THE WAY TO HELP.
//
//   - The 404 page offers the Help centre beside its other routes back, as a
//     48px row like the others.
//   - On a phone, typing a long message on /feedback never puts the box's last
//     line under the sticky Send bar: while the message has focus the bar drops
//     back under the box, and sticks again once focus moves on.
//
// Nothing here sends a message; /api/support is never reached.
//
// To see a test go red, break one of these:
//   src/pages/NotFound.jsx            delete the '/learn/help' trail item
//                                     fails the 404 test
//   src/styles/pages/feedback.css     delete the `:has(#fb-message:focus)` rule
//                                     fails both typing tests
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PHONE = { hasTouch: true, isMobile: true }
const LINES = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n')

test.describe('the 404 page', () => {
  test.use({ ...PHONE, viewport: { width: 390, height: 844 } })

  test('links to the Help centre with a full-height row', async ({ page }) => {
    watch(page, 'a visitor on a dead link who needs help')
    await go(page, '/nope-help-xyz')
    await expect(page.getByRole('heading', { level: 1, name: 'That page doesn’t exist' })).toBeVisible()
    const help = page.locator('.nf-more').getByRole('link', { name: 'Help centre' })
    await expect(help).toHaveAttribute('href', '/learn/help')
    const box = await help.boundingBox()
    expect(box.height, 'the Help centre row is a 44px+ target').toBeGreaterThanOrEqual(44)
  })
})

for (const height of [844, 640]) {
  test.describe(`typing a message at 390x${height}`, () => {
    test.use({ ...PHONE, viewport: { width: 390, height } })

    test('the message box stays clear of the Send bar, which sticks again after', async ({ page }) => {
      watch(page, 'a phone visitor typing a long help message')
      await page.route('**/api/support', (route) => route.abort())
      await go(page, '/feedback?type=help')
      const message = page.getByLabel('Message')
      const send = page.locator('.fb-page .fb-submit')
      await message.tap()
      await message.pressSequentially(LINES)

      const boxBottom = await message.evaluate((el) => el.getBoundingClientRect().bottom)
      const sendTop = await send.evaluate((el) => el.getBoundingClientRect().top)
      expect(boxBottom, 'the Send bar sits below the box while typing').toBeLessThanOrEqual(sendTop)
      expect(await send.evaluate((el) => getComputedStyle(el).position)).toBe('static')

      await page.getByLabel('Subject').tap()
      await expect.poll(() => send.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
    })
  })
}
