// SETTINGS TELLS THE TRUTH ABOUT WHAT HAPPENED, AND ASKS BEFORE IT DESTROYS.
//
// Held here, at a phone (390) and a desktop (1440):
//   1. the upgrade link starts at /plans, never at /checkout;
//   2. while the plan is unknown the page says so, and Delete waits;
//   3. a profile save the server refuses keeps the field open and says so;
//   4. deleting needs the "I understand" box on every account type;
//   5. a network failure while deleting says nothing was deleted;
//   6. Clear local data says which copy it touches;
//   7. an export that could not read a part names it;
//   8. Privacy names the AI providers and links to the AI terms;
//   9. sign-out with unsynced changes asks first, and stays signed in.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { withAvailability } from './price-payload.js'

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
]

async function openSection(page, id) {
  // On a phone the sections are a list you open and come back from.
  const tab = page.locator(`#settab-${id}`)
  if (!(await tab.isVisible())) await page.getByRole('button', { name: 'All settings' }).click()
  await tab.click()
  await expect(page.locator(`#set-${id}`)).toBeVisible()
}

for (const vp of VIEWPORTS) {
  test.describe(`settings truth and safety at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('a free account\'s upgrade link goes to /plans and nothing here goes straight to /checkout', async ({ page }) => {
      watch(page, 'a free account choosing to upgrade from Settings')
      await page.route('**/api/get-prices*', (r) => r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(withAvailability({ monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } })),
      }))
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await openSection(page, 'support')
      const section = page.locator('#set-support')
      const upgrade = section.getByRole('link', { name: 'Upgrade to Pro' })
      await expect(upgrade).toBeVisible()
      expect(await upgrade.getAttribute('href')).toMatch(/^\/plans\?billing=/)
      const hrefs = await section.locator('a[href]').evaluateAll((els) => els.map((el) => el.getAttribute('href')))
      expect(hrefs.filter((h) => h.includes('/checkout')), 'links in Subscription that skip /plans').toEqual([])
    })

    test('while the plan is unknown the page says "Checking your plan", names no plan and will not delete', async ({ page }) => {
      watch(page, 'a Pro subscriber opening Settings before the plan has answered')
      const uid = 'test-uid-pro'
      await signIn(page, { plan: 'pro', uid, slowReads: [{ path: `users/${uid}`, hold: true }] })
      await go(page, '/settings')
      await openSection(page, 'support')
      const section = page.locator('#set-support')
      await expect(section.getByText('Checking your plan')).toBeVisible()
      await expect(section.locator('.sub-checking')).toHaveAttribute('aria-busy', 'true')
      await expect(page.getByText('Your current plan')).toHaveCount(0)

      await openSection(page, 'account')
      await expect(page.locator('#set-account').getByRole('button', { name: 'Delete account' })).toBeDisabled()

      // Once the plan answers, the placeholder goes and Delete is available.
      await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
      await expect(page.locator('#set-account').getByRole('button', { name: 'Delete account' })).toBeEnabled()
      await openSection(page, 'support')
      await expect(section.getByText('Checking your plan')).toHaveCount(0)
    })

    for (const field of [
      { label: 'Location', fill: 'Perth, Australia', toast: 'Location updated', what: 'location' },
      { label: 'Bio', fill: 'I draw type for a living.', toast: 'Bio updated', what: 'bio' },
    ]) {
      test(`a refused ${field.what} save keeps the field open and never says it was updated`, async ({ page }) => {
        watch(page, `a person saving their ${field.what} while the server refuses the write`)
        const { uid } = await signIn(page, { plan: 'free', deny: [{ path: 'users/test-uid-free', ops: ['set'] }] })
        expect(uid).toBe('test-uid-free')
        await go(page, '/settings')
        await openSection(page, 'account')
        const section = page.locator('#set-account')
        const row = section.locator('.settings-row', { has: page.locator('.settings-row-label', { hasText: new RegExp(`^${field.label}$`) }) })
        await row.getByRole('button', { name: 'Edit' }).click()
        const input = row.locator('input, textarea').first()
        await input.fill(field.fill)
        await row.getByRole('button', { name: 'Save' }).click()
        await expect(row.getByRole('alert')).toContainText(`Your ${field.what} could not be saved`)
        await expect(row.getByRole('alert')).toContainText('Nothing was changed')
        await expect(input, 'the field stays open').toBeVisible()
        await expect(page.getByText(field.toast)).toHaveCount(0)
      })
    }

    test('a refused flair save keeps the picker open and never says it was updated', async ({ page }) => {
      watch(page, 'a person choosing a flair while the server refuses the write')
      await signIn(page, { plan: 'free', deny: [{ path: 'users/test-uid-free', ops: ['set'] }] })
      await go(page, '/settings')
      await openSection(page, 'account')
      const section = page.locator('#set-account')
      const row = section.locator('.settings-row', { has: page.locator('.settings-row-label', { hasText: /^Flair$/ }) })
      await row.getByRole('button', { name: 'Add' }).click()
      await row.locator('.flairpick-chip').first().click()
      await expect(row.getByRole('alert')).toContainText('Your flair could not be saved')
      await expect(row.locator('.flairpick-grid').first()).toBeVisible()
      await expect(page.getByText(/Flair (updated|cleared)/)).toHaveCount(0)
    })

    test('a Google-only account must tick the box before it can delete', async ({ page }) => {
      watch(page, 'a person with a Google-only account starting to delete it')
      await signIn(page, { plan: 'free', provider: 'google.com' })
      await go(page, '/settings')
      await openSection(page, 'account')
      const section = page.locator('#set-account')
      await section.getByRole('button', { name: 'Delete account' }).click()
      const go1 = section.getByRole('button', { name: 'Permanently delete' })
      await expect(section.getByLabel('Confirm your password')).toHaveCount(0)
      await expect(go1).toBeDisabled()
      await section.getByLabel(/I understand/).check()
      await expect(go1).toBeEnabled()
      await section.getByLabel(/I understand/).uncheck()
      await expect(go1).toBeDisabled()
    })

    test('a password account needs both the password and the box before it can delete', async ({ page }) => {
      watch(page, 'a person with a password account starting to delete it')
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await openSection(page, 'account')
      const section = page.locator('#set-account')
      await section.getByRole('button', { name: 'Delete account' }).click()
      const go1 = section.getByRole('button', { name: 'Permanently delete' })
      await expect(go1).toBeDisabled()
      await section.getByLabel(/I understand/).check()
      await expect(go1, 'box alone is not enough').toBeDisabled()
      await section.getByLabel('Confirm your password').fill('hunter22')
      await expect(go1).toBeEnabled()
      await section.getByLabel(/I understand/).uncheck()
      await expect(go1, 'password alone is not enough').toBeDisabled()
    })

    test('a network failure while confirming the delete says nothing was deleted', async ({ page }) => {
      watch(page, 'a person deleting their account while the connection drops')
      await signIn(page, { plan: 'free', authFail: { reauthenticateWithCredential: 'auth/network-request-failed' } })
      await go(page, '/settings')
      await openSection(page, 'account')
      const section = page.locator('#set-account')
      await section.getByRole('button', { name: 'Delete account' }).click()
      await section.getByLabel(/I understand/).check()
      await section.getByLabel('Confirm your password').fill('hunter22')
      await section.getByRole('button', { name: 'Permanently delete' }).click()
      await expect(section.getByRole('alert')).toContainText('Nothing was deleted')
      // Still signed in, with the account's own details on the page.
      await expect(section).toContainText('free.user@uil4b.test')
    })

    test('signed out, Clear local data says this browser holds the only copy, then that it is for good', async ({ page }) => {
      watch(page, 'a signed-out visitor clearing their local data')
      await go(page, '/settings')
      await openSection(page, 'data')
      const section = page.locator('#set-data')
      const row = section.locator('.settings-row', { has: page.locator('.settings-row-label', { hasText: 'Clear local data' }) })
      await expect(row).toContainText('only copy')
      await row.getByRole('button', { name: 'Clear data' }).click()
      await expect(row.getByRole('status')).toContainText('for good')
      await expect(row.getByRole('button', { name: 'Cancel' })).toBeFocused()
    })

    test('signed in, Clear local data says the account copy is not affected', async ({ page }) => {
      watch(page, 'a signed-in person clearing this browser\'s copy')
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await openSection(page, 'data')
      const row = page.locator('#set-data .settings-row', { has: page.locator('.settings-row-label', { hasText: 'Clear local data' }) })
      await row.getByRole('button', { name: 'Clear data' }).click()
      await expect(row.getByRole('status')).toContainText('Your account copy is not affected')
      await expect(row.getByRole('status')).not.toContainText('for good')
    })

    test('an export that could not read the projects says so', async ({ page }) => {
      watch(page, 'a person exporting while their saved projects cannot be read')
      await signIn(page, { plan: 'free', deny: [{ path: 'sync/projects', ops: ['get'] }] })
      await go(page, '/settings')
      await openSection(page, 'data')
      const section = page.locator('#set-data')
      const download = page.waitForEvent('download')
      await section.getByRole('button', { name: 'Export JSON' }).click()
      await download
      await expect(section.getByRole('status').filter({ hasText: 'could not be read' })).toContainText('projects could not be read')
    })

    test('Privacy names Google Gemini and OpenRouter, links to the AI terms, and never says "optionally"', async ({ page }) => {
      watch(page, 'a visitor reading what Settings says about privacy')
      await go(page, '/settings')
      await openSection(page, 'privacy')
      const section = page.locator('#set-privacy')
      await expect(section).toContainText('Google Gemini')
      await expect(section).toContainText('OpenRouter')
      await expect(section).not.toContainText(/optionally/i)
      await expect(section.getByRole('link', { name: 'Read the Terms' })).toHaveAttribute('href', '/terms#terms-s4')
    })

    test('with unsynced changes, Sign out warns and stays signed in; Sign out anyway signs out', async ({ page }) => {
      watch(page, 'a person signing out while their preferences cannot reach the account')
      await signIn(page, { plan: 'free', deny: [{ path: 'sync/data', ops: ['set'] }] })
      await go(page, '/settings')
      await openSection(page, 'accessibility')
      await page.locator('#set-accessibility').getByRole('button', { name: 'Dark theme' }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

      await openSection(page, 'account')
      const section = page.locator('#set-account')
      await section.getByRole('button', { name: 'Sign out', exact: true }).click()
      const alert = section.getByRole('alert').filter({ hasText: 'haven’t reached your account' })
      await expect(alert).toBeVisible()
      await expect(section.getByRole('button', { name: 'Try again' })).toBeVisible()
      // Still signed in: the account details are still on the page.
      await expect(section).toContainText('free.user@uil4b.test')

      await alert.getByRole('button', { name: 'Sign out anyway' }).click()
      await expect(page.locator('#set-account')).toHaveCount(0)
    })
  })
}
