// LIKES AND SAVES BELONG TO AN ACCOUNT.
//
// Signed out, pressing a like or save button on any gallery opens the sign-in
// prompt, and nothing is liked or saved if it is dismissed. Signed in, the same
// press toggles straight away with no prompt.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const loginDialog = (page) => page.getByRole('dialog').filter({ has: page.locator('#ui-login-title') })

const SURFACES = [
  { route: '/discover/palettes', button: (page) => page.locator('.pgal-like').first(), pressed: 'aria-pressed' },
  { route: '/discover/gradients', button: (page) => page.locator('.grg-like').first(), pressed: 'aria-pressed' },
  { route: '/community', button: (page) => page.locator('.ch-heart').first(), pressed: 'aria-pressed' },
  { route: '/discover/prompts', button: (page) => page.locator('.pl-save').first(), pressed: 'aria-pressed' },
]

test.describe('signed-out likes and saves ask to sign in', () => {
  for (const s of SURFACES) {
    test(`${s.route}: signed out, a like or save opens the sign-in prompt and changes nothing`, async ({ page }) => {
      watch(page, `a visitor liking something on ${s.route}`)
      await go(page, s.route)
      const btn = s.button(page)
      await expect(btn).toBeVisible({ timeout: 20000 })
      const before = await btn.getAttribute(s.pressed)
      await btn.click()
      await expect(loginDialog(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(loginDialog(page)).toBeHidden()
      await expect(btn).toHaveAttribute(s.pressed, before ?? 'false')
    })

    test(`${s.route}: signed in, a like or save toggles with no prompt`, async ({ page }) => {
      watch(page, `a member liking something on ${s.route}`)
      await signIn(page)
      await go(page, s.route)
      const btn = s.button(page)
      await expect(btn).toBeVisible({ timeout: 20000 })
      await expect(btn).toHaveAttribute(s.pressed, 'false')
      await btn.click()
      await expect(btn).toHaveAttribute(s.pressed, 'true')
      await expect(loginDialog(page)).toHaveCount(0)
    })
  }

  test('Palette Builder gallery: a press inside the sign-in dialog keeps the gallery open', async ({ page }) => {
    watch(page, 'a visitor liking a palette from the builder gallery')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    await page.getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
    const gallery = page.getByRole('dialog', { name: 'Explore palettes and brands', exact: true })
    await expect(gallery).toBeVisible()
    await gallery.locator('.pgal-like').first().click()
    const login = loginDialog(page)
    await expect(login).toBeVisible()
    await login.locator('#ui-login-title').click()
    await expect(gallery, 'the gallery closed under the sign-in dialog').toBeVisible()
  })
})
