// EMAIL VERIFICATION — an address the account claims is one it can prove.
//
// Held here:
//   · a password account whose address is unproved is told so in Settings and
//     can send itself a link, which goes to that address;
//   · a link that could not be sent says so, in words;
//   · opening the link elsewhere clears the note when the person comes back to
//     the tab, because the account is re-read rather than remembered;
//   · a verified account is never asked (control);
//   · everywhere else an unverified password account sees a "Verify your email"
//     bar with Resend, which stays out of onboarding and Settings, clears itself
//     when the account is verified, and is never shown to Google or verified
//     accounts;
//   · the link brings the person back to /settings?verified=1, which says so
//     only to a signed-in account that the re-read shows verified.
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

const bar = (page) => page.getByTestId('verify-notice')

test.describe('the "Verify your email" bar', () => {
  test('an unverified password account sees it on an ordinary page, with its address', async ({ page }) => {
    watch(page, 'a person who signed up with a password and went straight to their projects')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    await expect(bar(page)).toContainText('Verify your email.')
    await expect(bar(page)).toContainText(account.email)
    await expect(bar(page).getByRole('button', { name: 'Resend link' })).toBeVisible()
  })

  test('Resend sends a link to its own address, then says so and drops the button', async ({ page }) => {
    watch(page, 'a person who lost the first email')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Resend link' }).click()
    await expect(bar(page)).toContainText(`Link sent to ${account.email}. Check your inbox and spam folder.`)
    await expect(bar(page).getByRole('button', { name: 'Resend link' })).toHaveCount(0)
    const mail = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.mail)
    expect(mail).toEqual([{ kind: 'verify-email', to: account.email }])
  })

  test('a link that could not be sent says why and keeps the button', async ({ page }) => {
    watch(page, 'a person who asked for too many links')
    await signIn(page, { plan: 'free', emailVerified: false, authFail: { sendEmailVerification: 'auth/too-many-requests' } })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Resend link' }).click()
    await expect(bar(page).getByRole('alert')).toContainText('Too many links sent')
    await expect(bar(page).getByRole('button', { name: 'Resend link' })).toBeVisible()
  })

  test('dismissing hides it for the visit and returns on the next one', async ({ page }) => {
    watch(page, 'a person who is not ready to deal with it')
    const account = await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await bar(page).getByRole('button', { name: 'Dismiss verification reminder' }).click()
    await expect(bar(page)).toHaveCount(0)
    const key = `vs-verify-dismissed:${account.uid}`
    expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBe('1')
    // Focus is handed to the page, not dropped.
    await expect(page.locator('#main')).toBeFocused()
    // Same visit: it stays away. A new visit has no session storage: it is back.
    await go(page, '/projects')
    await expect(bar(page)).toHaveCount(0)
    await page.evaluate((k) => sessionStorage.removeItem(k), key)
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
  })

  test('it stays out of Settings, where the Email row already offers the link', async ({ page }) => {
    watch(page, 'a person looking at their account')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/settings')
    await expect(page.locator('#settab-account')).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
  })

  test('it stays out of onboarding, and onboarding does not claim a link it did not send', async ({ page }) => {
    watch(page, 'a person resuming onboarding they had left')
    await signIn(page, { plan: 'free', emailVerified: false, onboarded: false })
    await go(page, '/onboarding')
    await expect(page.getByTestId('onboarding-first-win')).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
    // The "check your inbox" line belongs to the session that signed up.
    await expect(page.getByTestId('onboarding-verify-line')).toHaveCount(0)
  })

  test('a verified account never sees it (control)', async ({ page }) => {
    watch(page, 'a person whose address is already verified')
    await signIn(page, { plan: 'free' })
    await go(page, '/projects')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
  })

  test('a Google account never sees it, whatever its flag says', async ({ page }) => {
    watch(page, 'a person who signed in with Google')
    await signIn(page, { plan: 'free', emailVerified: false })
    // The declaration is re-read on every load; this one runs after signIn's.
    await page.addInitScript(() => {
      window.__UIL4B_TEST_SESSION__ = { ...window.__UIL4B_TEST_SESSION__, provider: 'google.com' }
    })
    await go(page, '/projects')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(bar(page)).toHaveCount(0)
  })

  test('verifying elsewhere clears it when the person comes back to the tab', async ({ page }) => {
    watch(page, 'a person who opened the link in their inbox and returned')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/projects')
    await expect(bar(page)).toBeVisible()
    await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.account.emailVerified = true })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(bar(page)).toContainText('Email verified.')
    await expect(bar(page)).toHaveCount(0, { timeout: 8000 })
  })
})

test.describe('coming back from the link', () => {
  const toast = (page) => page.locator('.toast.show')
  // "No toast" must be read once, now. `toHaveCount(0)` retries until the count
  // IS zero, and a toast hides itself after a few seconds, so it would pass on
  // a toast that did appear (seen: the unverified-account mutation stayed green).
  const expectNoToast = async (page) => {
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    expect(await toast(page).count()).toBe(0)
  }

  test('a verified account lands on its Account section with a toast, and the address is tidied', async ({ page }) => {
    watch(page, 'a person who clicked the link in the same browser')
    await signIn(page, { plan: 'free', emailVerified: true })
    await go(page, '/settings?verified=1')
    await expect(page.locator('#set-account')).toBeVisible()
    await expect(toast(page)).toContainText('Email verified')
    await expect(page).toHaveURL(/\/settings\/?$/)
  })

  test('the parameter is removed, so a reload does not say it twice', async ({ page }) => {
    watch(page, 'a person who reloaded after the link')
    await signIn(page, { plan: 'free', emailVerified: true })
    await go(page, '/settings?verified=1')
    await expect(toast(page)).toContainText('Email verified')
    await expect(page).toHaveURL(/\/settings\/?$/)
    await go(page, '/settings')
    await expect(page.locator('#settab-account')).toBeVisible()
    await expectNoToast(page)
  })

  test('signed out, it claims nothing: the parameter is anyone\'s to type', async ({ page }) => {
    watch(page, 'a person who opened the link in a browser they are not signed in on')
    await go(page, '/settings?verified=1')
    await expect(page).toHaveURL(/\/settings\/?$/)
    await expectNoToast(page)
    await expect(page.getByText('Email verified')).toHaveCount(0)
  })

  test('an account the link did not verify gets no toast', async ({ page }) => {
    watch(page, 'a person signed in as a different, still unverified account')
    await signIn(page, { plan: 'free', emailVerified: false })
    await go(page, '/settings?verified=1')
    await expect(page.locator('#set-account')).toBeVisible()
    await expect(page).toHaveURL(/\/settings\/?$/)
    await expect(page.locator('#set-account').getByText('Not verified')).toBeVisible()
    // Zero is only evidence once the account has been re-read and the toast had
    // its chance: wait for the re-read, then read the count without retrying.
    await expect.poll(() => page.evaluate(() => window.__UIL4B_TEST_AUTH__.reloads)).toBeGreaterThan(0)
    await expectNoToast(page)
  })
})
