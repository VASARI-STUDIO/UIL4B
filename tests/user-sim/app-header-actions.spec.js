// THE APP HEADER'S TOP-RIGHT ACTIONS AND THE LOGO.
//
//   1. Export and Dashboard are labelled pills at the height of Upgrade, in that
//      order, from 900 up. There is no Back to the site anywhere.
//   2. With nothing to export, Export stays in the tab order, opens no dialog and
//      says why (a hint under the button; Escape hides it, focus stays).
//   3. The logo goes to the dashboard from an app page, and to the sales home
//      page from the dashboard, and its name says which.
//   4. The header never wraps from 320 to 1920.
//
// MUTATION: point the logo back at '/projects' on the dashboard, or put the Back
// to the site link back into PillNav.jsx, or drop aria-disabled from the empty
// Export: the matching test below goes red.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

test.describe('app header actions', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone using the app header') })

  for (const width of [900, 1100, 1440, 1920]) {
    test(`at ${width} the top right reads Export, Dashboard, Upgrade, avatar, labelled, and nothing says Back to the site`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/create/palette')
      const actions = page.locator('.pnav-actions')
      const exportBtn = actions.getByRole('button', { name: 'Export' })
      const dashboard = actions.getByRole('link', { name: 'Dashboard' })
      await expect(exportBtn).toBeVisible()
      await expect(dashboard).toBeVisible()
      await expect(exportBtn.locator('.pnav-act-label')).toBeVisible()
      await expect(dashboard.locator('.pnav-act-label')).toBeVisible()
      const order = await actions.evaluate((el) => [...el.querySelectorAll('.pnav-export, .pnav-act--dash, .pnav-upgrade, .pnav-avatar-btn')]
        .map((n) => n.className.split(' ').find((c) => /^pnav-(export|act--dash|upgrade|avatar-btn)$/.test(c))))
      expect(order).toEqual(['pnav-export', 'pnav-act--dash', 'pnav-upgrade', 'pnav-avatar-btn'])
      const heights = await page.evaluate(() => ['.pnav-export', '.pnav-act--dash', '.pnav-inner .pnav-upgrade']
        .map((s) => document.querySelector(s).getBoundingClientRect().height))
      expect(Math.abs(heights[0] - heights[2]), 'Export is as tall as Upgrade').toBeLessThanOrEqual(0.5)
      expect(Math.abs(heights[1] - heights[2]), 'Dashboard is as tall as Upgrade').toBeLessThanOrEqual(0.5)
      await expect(page.getByText('Back to the site')).toHaveCount(0)
      await page.getByRole('button', { name: 'Account and settings' }).click()
      await expect(page.locator('#pnav-account-pop').getByText('Back to the site')).toHaveCount(0)
    })
  }

  test('with nothing to export, Export is focusable, opens no dialog and shows its hint', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const exportBtn = page.getByRole('button', { name: 'Export' })
    await expect(exportBtn).toHaveAttribute('aria-disabled', 'true')
    await expect(exportBtn).toHaveAttribute('aria-describedby', 'pnav-export-hint')
    await exportBtn.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[role="dialog"][aria-labelledby="exp-title"]')).toHaveCount(0)
    const hint = page.locator('#pnav-export-hint')
    await expect(hint).toBeVisible()
    await expect(hint).toHaveText('Nothing to export yet')
    await page.keyboard.press('Escape')
    await expect(hint).toBeHidden()
    await expect(exportBtn, 'focus stays on Export after Escape').toBeFocused()
  })

  test('on the dashboard Dashboard is the current page and the logo goes to the home page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/projects')
    await expect(page.locator('.pnav-act--dash')).toHaveAttribute('aria-current', 'page')
    const logo = page.locator('.pnav-logo')
    await expect(logo).toHaveAttribute('href', '/home')
    await expect(logo).toHaveAttribute('aria-label', 'UIL4B, go to the home page')
  })

  test('from an app page the logo goes to the dashboard, and from there to the home page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const logo = page.locator('.pnav-logo')
    await expect(logo).toHaveAttribute('aria-label', 'UIL4B, go to your dashboard')
    await logo.click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(logo).toHaveAttribute('aria-label', 'UIL4B, go to the home page')
    await logo.click()
    await expect(page).toHaveURL(/\/home$/)
  })

  for (const signed of [true, false]) {
    test(`the header never wraps from 320 to 1920 (${signed ? 'signed in' : 'signed out'})`, async ({ page }) => {
      if (signed) await signIn(page, { plan: 'free', projects: 1 })
      for (const width of [320, 390, 768, 899, 900, 940, 961, 999, 1099, 1100, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 })
        await go(page, '/create/palette')
        const overflow = await page.locator('.pnav-inner').evaluate((el) => el.scrollWidth - el.clientWidth)
        expect(overflow, `header overflows by ${overflow}px at ${width}`).toBeLessThanOrEqual(0)
      }
    })
  }
})
