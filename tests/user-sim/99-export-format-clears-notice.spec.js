// The Export panel keeps what a finished export said in the footer, right above
// the buttons. That line belongs to the format that produced it: once someone
// picks another format, "Your UI kit downloaded." must not sit beside an
// "Export CSS tokens" button that has not been pressed.
import fs from 'node:fs'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const FONT_FILE = 'https://fonts.gstatic.com/s/kitfixture/latin.woff2'
const CSS2 = `/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400 700; font-display: swap; src: url(${FONT_FILE}) format('woff2'); unicode-range: U+0000-00FF; }`
const WOFF2 = fs.readFileSync('public/fonts/geist-latin.woff2')

// The kit export fetches its fonts; answer those from fixtures so the run does
// not depend on Google.
async function fontFixtures(page) {
  await page.route(/fonts\.googleapis\.com\/css2/, (route) => (route.request().resourceType() === 'fetch'
    ? route.fulfill({ status: 200, contentType: 'text/css', body: CSS2 })
    : route.continue()))
  await page.route(FONT_FILE, (route) => route.fulfill({ status: 200, contentType: 'font/woff2', body: WOFF2 }))
  await page.route(/cdn\.jsdelivr\.net\/gh\/google\/fonts/, (route) => route.fulfill({ status: 404, body: '' }))
}

test('choosing another format clears the finished-export notice', async ({ page }) => {
  watch(page, 'a free account who exported the UI kit and then looks at the token formats')
  await fontFixtures(page)
  await signIn(page, { plan: 'free' })
  await go(page, BOARD)

  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  const panel = page.getByRole('dialog', { name: /Export your design system/i })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('radio', { name: /^UI kit/ })).toHaveAttribute('aria-checked', 'true')

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    panel.getByRole('button', { name: 'Export UI kit', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toBe('uil4b-ui-kit.html')
  await expect(panel.getByRole('status')).toContainText('Your UI kit downloaded.')
  await expect(panel.locator('.exp-notice-lead')).toHaveText('Your UI kit downloaded.')
  // With the message on screen the left button closes the panel.
  await expect(panel.getByRole('button', { name: 'Close', exact: true })).toBeVisible()

  await panel.getByRole('radio', { name: /^CSS tokens/ }).click()

  await expect(panel.getByRole('radio', { name: /^CSS tokens/ })).toHaveAttribute('aria-checked', 'true')
  await expect(panel.getByRole('button', { name: 'Export CSS', exact: true })).toBeEnabled()
  // The status region is always mounted (a screen reader needs it present before
  // the text arrives), so the check is on the words, not on the region.
  await expect(panel.locator('.exp-notice'), 'the kit confirmation is gone once another format is chosen').toHaveCount(0)
  await expect(panel.getByRole('status')).not.toContainText('Your UI kit downloaded.')
  // With nothing finished on screen there is something to cancel again.
  await expect(panel.getByRole('button', { name: 'Cancel', exact: true }), 'the left button goes back to Cancel after a format change').toBeVisible()
  await expect(panel.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0)
})
