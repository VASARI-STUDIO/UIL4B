// Every "Start your 7-day free trial" button opens the one Pro sign-up layer
// (`?up=1..3`) instead of leaving for /plans or /checkout.
//
//   1  home plans CTA, signed out: layer at step 1, close keeps the scroll, Back closes it
//   2  /plans signed in: the Pro button opens the plan step (step 3)
//   3  a Pro account clicking the home CTA goes to /projects, no layer
//   4  the gate popup's trial pill closes the popup and opens the layer
//   5  the cadence rides in the URL: a reload of ?up=2&upplan=monthly keeps Monthly
//   6  only one layer node is ever in the document
import { test, expect } from './base.js'
import { chooseMenuOption, go, homeSectionsLoaded, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'
import { openPaletteTools } from './palette-helpers.js'

test.use({ locale: 'en-US' })

const LIVE = withAvailability({ source: { monthly: 'live', yearly: 'live' }, monthly: { usd: 7 }, yearly: { usd: 48 } })
const layerOf = (page) => page.locator('[data-pro-layer]')
const stubPrices = (page) => page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LIVE) }))
const homeCta = (page) => page.locator('.hpl-go')
const billing = (layer) => layer.getByRole('radiogroup', { name: 'Billing' })

// A signed-in account is sent from `/` to its dashboard; `/home` renders the sales page for it.
async function reachHomeCta(page, path = '/') {
  await stubPrices(page)
  await go(page, path)
  // The plans section is lazy: a stand-in holds its place until the page is nudged.
  await homeSectionsLoaded(page)
  const cta = homeCta(page)
  await cta.scrollIntoViewIfNeeded()
  await expect(cta, 'the home button never got its trial wording').toHaveText('Start your 7-day free trial')
  return cta
}

for (const size of [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 780 }]) {
  test.describe(`trial buttons at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('1 home CTA signed out opens step 1, close keeps the scroll, Back closes it', async ({ page }) => {
      watch(page, 'a visitor starting the trial from the home page')
      const cta = await reachHomeCta(page)
      await expect(cta).toHaveAttribute('href', '/plans')
      const before = await page.evaluate(() => window.scrollY)
      await cta.click()
      await expect(layerOf(page)).toBeVisible()
      await expect(page).toHaveURL(/\/\?up=1$/)
      await expect(layerOf(page)).toHaveCount(1)

      await page.keyboard.press('Escape')
      await expect(layerOf(page)).toHaveCount(0)
      await expect(page).toHaveURL(/\/$/)
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - before), 'the page jumped').toBeLessThan(4)

      await cta.click()
      await expect(layerOf(page)).toBeVisible()
      await page.goBack()
      await expect(layerOf(page)).toHaveCount(0)
      await expect(page).toHaveURL(/\/$/)
    })

    test('2 /plans signed in: the Pro button opens the plan step', async ({ page }) => {
      watch(page, 'a free account starting the trial')
      await signIn(page, { plan: 'free' })
      await stubPrices(page)
      await go(page, '/plans')
      const cta = page.locator('.hpl-pro .pa-cta').locator('a, button').first()
      await expect(cta).toHaveText('Start 7-day free trial')
      await cta.click()
      await expect(layerOf(page)).toHaveAttribute('data-step', '3')
      await expect(page).toHaveURL(/\/plans\?up=3$/)
      await expect(layerOf(page)).toHaveCount(1)
    })

    test('3 a Pro account clicking the home CTA lands on /projects with no layer', async ({ page }) => {
      watch(page, 'a Pro account on the home page')
      await signIn(page, { plan: 'pro' })
      const cta = await reachHomeCta(page, '/home')
      await cta.click()
      await expect(page).toHaveURL(/\/projects/)
      await expect(layerOf(page)).toHaveCount(0)
    })

    test('4 the gate popup trial pill opens the layer', async ({ page }) => {
      watch(page, 'a free account at a Pro gate')
      await signIn(page, { plan: 'free' })
      await stubPrices(page)
      await go(page, '/create/palette')
      if (size.width < 768) {
        const tools = await openPaletteTools(page)
        await chooseMenuOption(page, tools.getByRole('button', { name: 'Colour system' }), 'analogous')
      } else {
        const system = page.getByRole('button', { name: 'Colour system' }).first()
        if (!(await system.isVisible())) await page.getByRole('button', { name: /^Extra tools/ }).click()
        await chooseMenuOption(page, system, { label: 'Analogous, Pro' })
      }
      const dialog = page.getByRole('dialog', { name: /Unlock every colour system/i })
      await expect(dialog).toBeVisible()
      await dialog.locator('.pg-go').click()
      await expect(layerOf(page)).toBeVisible()
      await expect(page).toHaveURL(/\/create\/palette\?up=\d/)
      await expect(dialog).toHaveCount(0)
      await expect(page.getByRole('dialog', { name: /Unlock every colour system/i })).toHaveCount(0)
    })

    test('5 the cadence survives a reload of the layer URL', async ({ page }) => {
      watch(page, 'a visitor who reloads mid sign-up')
      await signIn(page, { plan: 'free' })
      await stubPrices(page)
      await go(page, '/plans?up=2&upplan=monthly')
      await expect(layerOf(page)).toBeVisible()
      await expect(page).toHaveURL(/up=2&upplan=monthly$/)
      await expect(billing(layerOf(page)).getByRole('radio', { name: /^Monthly/ })).toHaveAttribute('aria-checked', 'true')
      await page.reload()
      await expect(billing(layerOf(page)).getByRole('radio', { name: /^Monthly/ })).toHaveAttribute('aria-checked', 'true')
      await expect(layerOf(page)).toHaveCount(1)
    })
  })
}
