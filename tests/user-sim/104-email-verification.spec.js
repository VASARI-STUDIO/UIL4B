// EMAIL VERIFICATION — an address the account claims is one it can prove.
//
// Held here:
//   · a password account whose address is unproved is told so in Settings and
//     can send itself a link, which goes to that address;
//   · a link that could not be sent says so, in words;
//   · opening the link elsewhere clears the note when the person comes back to
//     the tab, because the account is re-read rather than remembered;
//   · a verified account is never asked (control).
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

async function openAccount(page) {
  await go(page, '/settings')
  await page.locator('#settab-account').click()
  const section = page.locator('#set-account')
  await expect(section).toBeVisible()
  return section
}

test.describe('settings — email verification', () => {
  test('an unverified account can send itself a link, and it goes to its own address', async ({ page }) => {
    watch(page, 'a person who signed up with a password and has not verified yet')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    const section = await openAccount(page)
    await expect(section.getByText('Not verified')).toBeVisible()
    await section.getByRole('button', { name: 'Send verification link' }).click()
    await expect(section.getByRole('status')).toContainText(`Link sent to ${account.email}`)
    const mail = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.mail)
    expect(mail).toEqual([{ kind: 'verify-email', to: account.email }])
  })

  test('a verification link that could not be sent says so', async ({ page }) => {
    watch(page, 'a person who asked for too many links')
    await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerification: 'auth/too-many-requests' } })
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Send verification link' }).click()
    await expect(section.getByRole('alert')).toContainText('Too many links sent')
    await expect(section.getByRole('status')).toHaveCount(0)
  })

  test('opening the link clears the note when the person comes back to the tab', async ({ page }) => {
    watch(page, 'a person who verified in their inbox and came back')
    await signIn(page, { plan: 'free', emailVerified: false })
    const section = await openAccount(page)
    await expect(section.getByText('Not verified')).toBeVisible()
    // The link is opened on the auth server's side; this tab has not seen it.
    await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.account.emailVerified = true })
    await expect(section.getByText('Not verified')).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(section.getByText('Not verified')).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Send verification link' })).toHaveCount(0)
  })

  test('a verified account is never asked (control)', async ({ page }) => {
    watch(page, 'a person whose address is already verified')
    await signIn(page, { plan: 'free' })
    const section = await openAccount(page)
    await expect(section.getByText('Email address')).toBeVisible()
    await expect(section.getByText('Not verified')).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Send verification link' })).toHaveCount(0)
  })
})
