// "Build a brand kit" pressed on the page the walkthrough begins on.
//
// The guide on each tool reads the flow flag once, when it mounts. Pressing the
// menu's button on /create/palette writes the flag and navigates to
// /create/palette, which is where the visitor already is: the route does not
// change, nothing remounts, and the button appeared to do nothing. Every other
// spec in the walkthrough family starts from /discover, so none of them ever
// pressed it from here.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const GUIDE_KEY = 'vs-uikit-guide'

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
const card = (page) => page.getByRole('dialog', { name: /^Step [1-4] of 4: / })

async function pressBrandKit(page) {
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const cta = page.locator('.pnav-editorial-cta')
  await expect(cta).toBeVisible()
  await cta.click()
}

test.describe('Brand kit: starting from the page it begins on', () => {
  test('the button on /create/palette turns the walkthrough on in place', async ({ page }) => {
    watch(page, 'designer pressing Build a brand kit from the palette page')
    await go(page, '/create/palette')
    await expect(rail(page)).toHaveCount(0)

    await pressBrandKit(page)

    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(rail(page)).toBeVisible()
    await expect(rail(page)).toContainText('Step 1 of 4')
    await expect(card(page)).toBeVisible()
    expect(await page.evaluate((key) => localStorage.getItem(key), GUIDE_KEY)).toBe('1')
  })

  test('after the card was seen, the button still brings the bar up on the same page', async ({ page }) => {
    watch(page, 'returning designer starting a second walkthrough from the palette page')
    await go(page, '/create/palette')
    await pressBrandKit(page)
    await card(page).getByRole('button', { name: 'Start with colours' }).click()
    await rail(page).getByRole('button', { name: 'Leave the walkthrough' }).click()
    await expect(rail(page)).toHaveCount(0)

    await pressBrandKit(page)

    await expect(rail(page)).toBeVisible()
    // An explicit start opens the card even after it has been dismissed.
    await expect(card(page)).toBeVisible()
  })

  test('from another tool the button still lands on step one', async ({ page }) => {
    watch(page, 'designer pressing Build a brand kit from the fonts page')
    await go(page, '/create/font-pair')
    await pressBrandKit(page)

    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(rail(page)).toBeVisible()
    await expect(rail(page)).toContainText('Step 1 of 4')
  })
})
