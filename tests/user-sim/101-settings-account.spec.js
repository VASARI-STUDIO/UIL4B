// SETTINGS AND ACCOUNT — every section says what actually happened.
//
// Held here:
//   · changing your email says "Email updated" only when Firebase accepts it;
//   · "Manage billing" / "Cancel plan" say so when the Stripe portal errors;
//   · Settings names the real billing cadence, not "Billed monthly" for all;
//   · at 390 the section tabs never wrap into a grid.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

async function openSection(page, id) {
  await page.locator(`#settab-${id}`).click()
  await expect(page.locator(`#set-${id}`)).toBeVisible()
}

test.describe('settings — account', () => {
  test('a refused email change says so, and never says "Email updated"', async ({ page }) => {
    watch(page, 'a person changing their email on a project that refuses direct changes')
    await signIn(page, { plan: 'free', authFail: { updateEmail: 'auth/operation-not-allowed' } })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Edit' }).nth(1).click()
    await section.getByPlaceholder('Enter new email').fill('new.address@uil4b.test')
    await section.getByRole('button', { name: 'Next' }).click()
    await section.getByPlaceholder('Enter your password to confirm').fill('hunter22')
    await section.getByRole('button', { name: 'Save' }).click()

    await expect(section.getByRole('alert')).toContainText('could not be changed')
    await expect(page.getByText('Email updated')).toHaveCount(0)
    // Nothing changed, and the page still says the old address.
    await expect(section).toContainText('free.user@uil4b.test')
  })

  test('an accepted email change says so (positive control)', async ({ page }) => {
    watch(page, 'a person changing their email')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Edit' }).nth(1).click()
    await section.getByPlaceholder('Enter new email').fill('new.address@uil4b.test')
    await section.getByRole('button', { name: 'Next' }).click()
    await section.getByPlaceholder('Enter your password to confirm').fill('hunter22')
    await section.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Email updated')).toBeVisible()
    await expect(section.getByRole('alert')).toHaveCount(0)
  })

  test('cancelling account deletion puts focus back on the button that opened it', async ({ page }) => {
    // It dropped to <body>, so the next Tab started from the top of the page.
    watch(page, 'a keyboard user backing out of deleting their account')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Delete account' }).click()
    await section.getByRole('button', { name: 'Cancel' }).last().click()
    await expect(section.getByRole('button', { name: 'Delete account' })).toBeFocused()
  })

  test('a password reset link that could not be sent says so', async ({ page }) => {
    // The double refuses sendPasswordResetEmail, which is exactly the state a
    // person must not be left waiting in.
    watch(page, 'a person who forgot their current password')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'account')
    const section = page.locator('#set-account')
    await section.getByRole('button', { name: 'Change' }).last().click()
    await section.getByRole('button', { name: 'Email me a password reset link' }).click()
    await expect(section.getByRole('alert')).toContainText('could not be sent')
  })
})

test.describe('settings — billing', () => {
  test('a billing portal that errors says so, with the reference', async ({ page }) => {
    watch(page, 'a Pro subscriber opening billing while the portal is down')
    await page.route('**/api/create-portal', (r) => r.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Portal failed', correlationId: 'ref-7f3a' }),
    }))
    await signIn(page, { plan: 'pro', subscription: { status: 'active', interval: 'year', currentPeriodEnd: Date.now() + 90 * 86400e3, cancelAtPeriodEnd: false } })
    await go(page, '/settings')
    await openSection(page, 'support')
    const section = page.locator('#set-support')
    await section.getByRole('button', { name: 'Manage billing' }).click()
    const alert = section.getByRole('alert')
    await expect(alert).toContainText('Billing could not be opened')
    await expect(alert).toContainText('ref-7f3a')
    // Cancel goes through the same honest path.
    await section.getByRole('button', { name: 'Cancel plan' }).click()
    await expect(alert).toContainText('nothing about your plan has changed')
  })

  test('checkout never prints "null" when the price list lacks this currency', async ({ page }) => {
    watch(page, 'a buyer whose currency the price service does not list')
    await page.route('**/api/get-prices*', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ monthly: {}, quarterly: {}, yearly: {} }),
    }))
    await signIn(page, { plan: 'free' })
    await go(page, '/checkout?plan=yearly')
    const note = page.locator('.checkout-plan-note')
    await expect(note).toBeVisible()
    await expect(note).not.toContainText('null')
    await expect(note).toContainText('price for this billing period')
  })

  test('a quarterly-or-monthly subscription is never called "Billed monthly" on a guess', async ({ page }) => {
    watch(page, 'a subscriber on a three-month plan')
    await signIn(page, { plan: 'pro', subscription: { status: 'active', interval: 'month', currentPeriodEnd: Date.now() + 60 * 86400e3, cancelAtPeriodEnd: false } })
    await go(page, '/settings')
    await openSection(page, 'support')
    const meta = page.locator('#set-support .sub-active-meta')
    await expect(meta).toContainText('Renews')
    await expect(meta).not.toContainText('Billed monthly')
  })

  test('a subscription that records its count names the cadence', async ({ page }) => {
    watch(page, 'a quarterly subscriber whose record carries its interval count')
    await signIn(page, { plan: 'pro', subscription: { status: 'active', interval: 'month', intervalCount: 3, currentPeriodEnd: Date.now() + 60 * 86400e3, cancelAtPeriodEnd: false } })
    await go(page, '/settings')
    await openSection(page, 'support')
    await expect(page.locator('#set-support .sub-active-meta')).toContainText('Billed every three months')
  })
})

test.describe('settings — mobile first', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('on a phone the sections are a list you open and come back from', async ({ page }) => {
    watch(page, 'a person opening settings on their phone')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    const nav = page.locator('.settings-nav')
    await expect(nav).toBeVisible()
    await expect(page.locator('.settings-content')).toBeHidden()

    // Every row is one full-width row: no two share a line (nothing wraps).
    const tops = await nav.locator('.settings-nav-item').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(new Set(tops).size, 'two section rows share a line').toBe(tops.length)

    for (const id of ['support', 'accessibility', 'language', 'account', 'data', 'privacy']) {
      await page.locator(`#settab-${id}`).click()
      await expect(page.locator(`#set-${id}`)).toBeVisible()
      await expect(nav).toBeHidden()
      await page.getByRole('button', { name: 'All settings' }).click()
      await expect(nav).toBeVisible()
    }
  })

  test('the billing cadence row never wraps, even at 320', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    watch(page, 'a free account comparing cadences on a small phone')
    await page.route('**/api/get-prices*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ monthly: { usd: 7 }, quarterly: { usd: 18 }, yearly: { usd: 48 } }) }))
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'support')
    const tabs = page.locator('#set-support .sub-billing-toggle [role="tab"]')
    await expect(tabs.first()).toBeVisible()
    const tops = await tabs.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(new Set(tops).size, 'the cadence tabs wrapped onto two lines').toBe(1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
  })
})
