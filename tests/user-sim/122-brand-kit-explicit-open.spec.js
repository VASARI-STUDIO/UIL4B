import { test, expect } from './base.js'
import { go, watch, overlaysSettled } from './helpers.js'

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
const card = (page) => page.getByRole('dialog', { name: /^Step [1-4] of 4: / })

async function pressEntry(page, width, label) {
  if (width === 390) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const create = page.locator('.pnav-acc-trigger').filter({ hasText: 'Create' })
    if (await create.getAttribute('aria-expanded') !== 'true') await create.click()
  } else {
    await page.getByRole('button', { name: 'Create', exact: true }).click()
  }
  const cta = page.locator(width === 390 ? '.pnav-acc-cta' : '.pnav-editorial-cta')
  await expect(cta).toHaveText(label)
  await cta.click()
}

for (const width of [390, 1440]) {
  test.describe(`Brand kit explicit opening at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } })

    test.beforeEach(async ({ page }) => {
      watch(page, 'returning visitor opening the brand kit card')
      await page.addInitScript(() => localStorage.setItem('vs-uikit-guide-seen', '1'))
    })

    test('start opens the seen card once, without reopening it on reload', async ({ page }) => {
      await go(page, '/create/palette')
      await pressEntry(page, width, 'Build a brand kit')
      await expect(rail(page)).toBeVisible()
      await expect(card(page)).toBeVisible()

      expect(await page.evaluate(() => localStorage.getItem('vs-uikit-guide-seen'))).toBe('1')

      // At 390 the card opens from the menu sheet. Its route link pushes past the
      // sheet's history entry, so nothing is handed back; the wait is a guard in
      // case that ever changes, since a reload during a back-traversal is cancelled.
      await overlaysSettled(page, 'the menu sheet')
      await page.reload()
      await expect(page).toHaveURL(/\/create\/palette$/)
      await expect(rail(page)).toBeVisible()
      await expect(card(page)).toHaveCount(0)
    })
  })
}
