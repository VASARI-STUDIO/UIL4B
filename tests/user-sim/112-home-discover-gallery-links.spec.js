// THE HOMEPAGE'S DISCOVER SECTION: EACH TAB OPENS ITS OWN GALLERY.
//
// "Open the gallery" and the sample cards on the Palettes and Gradients tabs go
// to that tab's own page, not to the Discover hub. The Icon sets tab goes to the
// icon groups page.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TABS = [
  { label: 'Palettes', route: '/discover/palettes', cardsAreTabRoute: true },
  { label: 'Gradients', route: '/discover/gradients', cardsAreTabRoute: true },
  { label: 'Icon sets', route: '/create/icons/groups', cardsAreTabRoute: false },
]

test.describe('home Discover tabs', () => {
  for (const tab of TABS) {
    test(`${tab.label}: "Open the gallery" goes to ${tab.route}`, async ({ page }) => {
      watch(page, 'a signed-out visitor choosing a library on the homepage')
      await go(page, '/')
      const section = page.locator('section#discover')
      await section.getByRole('button', { name: tab.label, exact: true }).click()

      const cta = section.locator('a.sp-disc-cta')
      await expect(cta).toHaveAttribute('href', tab.route)

      const cards = section.locator('a.sp-disc-card')
      expect(await cards.count()).toBeGreaterThan(0)
      const hrefs = await cards.evaluateAll((els) => els.map((el) => el.getAttribute('href')))
      for (const href of hrefs) {
        expect(href).not.toBe('/discover')
        if (tab.cardsAreTabRoute) expect(href).toBe(tab.route)
      }
    })
  }
})
