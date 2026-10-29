// The Export popup keeps what a finished export said in its dock, right beside
// the button. That line belongs to the file that produced it: once someone
// picks another file, "Your UI kit downloaded." must not sit beside an
// "Export CSS" button that has not been pressed.
import { chooseFormat, exportPanel, primaryButton, dockStatus, fileGroup, typeRadio } from './export-rows.js'
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
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  // The header Export opens on the Brand book, so the kit is a pick like any other.
  await chooseFormat(panel, 'kit')
  await expect(typeRadio(panel, 'UI kit')).toHaveAttribute('aria-checked', 'true')

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    primaryButton(panel).click(),
  ])
  expect(download.suggestedFilename()).toBe('uil4b-ui-kit.html')
  await expect(dockStatus(panel)).toContainText('Your UI kit downloaded.')
  await expect(dockStatus(panel).locator('strong')).toHaveText('Your UI kit downloaded.')
  // With the message on screen the button offers another go.
  await expect(primaryButton(panel)).toHaveText('Export again')

  await chooseFormat(panel, 'css')

  await expect(fileGroup(panel, 'Code').getByRole('radio', { name: 'CSS stylesheet', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(primaryButton(panel), 'the button is back to naming the new file').toHaveText('Export CSS')
  await expect(primaryButton(panel)).toBeEnabled()
  await expect(dockStatus(panel), 'the kit confirmation is gone once another file is chosen').not.toContainText('Your UI kit downloaded.')
  await expect(dockStatus(panel).locator('strong'), 'and the dock now speaks for the CSS pick').toHaveText('Free.')
})
