// Homepage Discover tabs open their own galleries and sample-card destinations.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TABS = [
  { label: 'Palettes', route: '/discover/palettes', heading: 'Palette Library', cardsAreTabRoute: true },
  { label: 'Gradients', route: '/discover/gradients', heading: 'Gradient Library', cardsAreTabRoute: true },
  { label: 'Icon sets', route: '/create/icons/groups', heading: 'Icon Groups', cardsAreTabRoute: false },
]

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`home Discover tabs at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    for (const tab of TABS) {
      test(`${tab.label}: gallery CTA and first card reach their destinations`, async ({ page }) => {
        watch(page, 'a signed-out visitor choosing a library on the homepage')
        await go(page, '/')
        const section = page.locator('section#discover')
        await section.getByRole('button', { name: tab.label, exact: true }).click()

        await section.locator('a.sp-disc-cta').click()
        await expect(page).toHaveURL((url) => `${url.pathname}${url.search}${url.hash}` === tab.route)
        await expect(page.getByRole('heading', { level: 1, name: tab.heading, exact: true })).toBeVisible()

        await go(page, '/')
        await section.getByRole('button', { name: tab.label, exact: true }).click()
        const card = section.locator('a.sp-disc-card').first()
        const cardRoute = tab.cardsAreTabRoute ? tab.route : await card.getAttribute('href')
        expect(cardRoute).toBeTruthy()
        expect(cardRoute).not.toBe('/discover')

        await card.click()
        await expect(page).toHaveURL((url) => `${url.pathname}${url.search}${url.hash}` === cardRoute)
        await expect(page.getByRole('heading', { level: 1, name: tab.heading, exact: true })).toBeVisible()
      })
    }
  })
}
