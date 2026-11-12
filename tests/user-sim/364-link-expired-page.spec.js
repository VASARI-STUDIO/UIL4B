// THE LINK-EXPIRED PAGE: where a password-reset link lands when it can no longer
// be used. The reset itself is hosted by the sign-in provider; this page is the
// app's own answer for a link that was used already or has run out.
//
// A person arriving here wants three things: to be told the link is dead in
// plain words, to get a new one without hunting for the form, and a way out to
// somewhere else. Signed out, "Reset your password" opens the sign-in dialog
// over the page on its reset form, with the cursor already in the email field,
// so they are never left on a dead end. Signed in there is no reset to ask for:
// the password is changed in Settings, and the page links there instead.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In LinkExpired.jsx call openLogin() without `{ reset: true }`: the dialog
// tests fail (the form is log-in, and focus is on Google). Make the button
// navigate instead of calling openLogin(), or change the document.title: the
// popup tests and the title test fail. Show the signed-out button to a
// signed-in visitor: the Settings test fails. Delete the /reset-password route
// in App.jsx: every test lands on the 404 heading instead.
import { test, expect } from './base.js'
import { go, goRaw, signIn, watch } from './helpers.js'

const TITLE = 'That reset link doesn’t work now'
const PATH = '/reset-password?mode=resetPassword&oobCode=expired-code.test'
const ADDRESS = 'someone@example.test'

const heading = (page) => page.getByRole('heading', { level: 1, name: TITLE })
const resetButton = (page) => page.getByRole('button', { name: 'Reset your password' })
const settingsLink = (page) => page.getByRole('link', { name: 'Change your password in Settings' })
const back = (page) => page.getByRole('link', { name: 'Back to the homepage' })
const help = (page) => page.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Help centre' })
const resetDialog = (page) => page.getByRole('dialog', { name: 'Reset your password' })

/** The provider's reset-email call, answered as it answers a real one. */
async function answerResetEmail(page) {
  const asked = { count: 0, body: null }
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
    const request = route.request()
    if (request.method() === 'POST' && /sendOobCode/.test(request.url())) {
      asked.count += 1
      asked.body = request.postDataJSON()
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: ADDRESS }) })
  })
  return asked
}

for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
  test.describe(`the link-expired page at ${label}`, () => {
    test.use({ viewport: size })

    test('lands on the heading, says why in plain words, and has its own title', async ({ page }) => {
      watch(page, 'someone opening an old password-reset email')
      await goRaw(page, PATH)

      await expect(heading(page)).toBeVisible()
      await expect(heading(page), 'a screen reader should start at the problem').toBeFocused()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page).toHaveTitle('UI L4B | Link expired')
      await expect(page.getByText('Reset links work once and expire after a short time.')).toBeVisible()
      await expect(page, 'the page keeps the address in the email').toHaveURL(/\/reset-password\?/)
      await expect(resetButton(page)).toBeEnabled()
      await expect(settingsLink(page), 'a signed-out visitor has no Settings to go to').toHaveCount(0)
      await expect(back(page)).toHaveAttribute('href', '/')
      await expect(help(page)).toHaveAttribute('href', '/learn/help')
      await expect(page.locator('meta[name="robots"]'), 'a reset address must not be indexed').toHaveAttribute('content', /noindex/)

      const text = await page.locator('.ed').innerText()
      expect(text, 'the page must not echo the code in the link').not.toContain('expired-code')
    })

    test('Reset your password opens the sign-in dialog on the reset form, and closing it leaves the page', async ({ page }) => {
      watch(page, 'someone asking for a fresh reset link')
      await goRaw(page, PATH)
      await expect(heading(page)).toBeVisible()

      await resetButton(page).click()
      const dialog = resetDialog(page)
      await expect(dialog, 'the dialog opens on the reset form, not on log in').toBeVisible()
      await expect(page.getByRole('dialog', { name: /log in to ui l4b/i })).toHaveCount(0)
      await expect(dialog.getByRole('button', { name: 'Send reset link' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /continue with google/i }), 'the reset form has no Google button').toHaveCount(0)
      await expect(page, 'the popup opens over the page, it does not navigate').toHaveURL(/\/reset-password\?/)

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(heading(page)).toBeVisible()
    })

    test('the reset dialog starts with the cursor in the email field, and sending a link reaches the sent step', async ({ page }) => {
      watch(page, 'someone getting a new reset link from an expired one')
      const asked = await answerResetEmail(page)
      await goRaw(page, PATH)
      await expect(heading(page)).toBeVisible()

      await resetButton(page).click()
      const dialog = resetDialog(page)
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel('Email'), 'a person can type their address straight away').toBeFocused()

      await page.keyboard.type(ADDRESS)
      await dialog.getByRole('button', { name: 'Send reset link' }).click()

      const sent = page.getByRole('dialog', { name: 'Check your email' })
      await expect(sent, 'the dialog moves on to the sent step').toBeVisible()
      await expect(sent).toContainText(ADDRESS)
      await expect(sent.getByRole('button', { name: /send again/i })).toBeDisabled()
      expect(asked.count, 'exactly one reset email was requested').toBe(1)
      expect(asked.body.email, 'the address typed is the one asked for').toBe(ADDRESS)
      expect(asked.body.requestType).toBe('PASSWORD_RESET')
      await expect(page, 'the whole journey stays on the page').toHaveURL(/\/reset-password\?/)
    })

    test('Back to the homepage goes home and the Help centre goes to help', async ({ page }) => {
      watch(page, 'someone leaving the expired-link page')
      await goRaw(page, PATH)
      await expect(heading(page)).toBeVisible()
      await back(page).click()
      await expect(page).toHaveURL(/\/$/)
      await expect(heading(page)).toHaveCount(0)

      await goRaw(page, PATH)
      await expect(heading(page)).toBeVisible()
      await help(page).click()
      await expect(page).toHaveURL(/\/learn\/help$/)
      await expect(heading(page)).toHaveCount(0)
    })

    test('signed in, the page links to Settings instead of the reset form', async ({ page }) => {
      watch(page, 'a signed-in person opening an old password-reset email')
      await signIn(page, { plan: 'free' })
      await go(page, PATH)

      await expect(heading(page)).toBeVisible()
      await expect(settingsLink(page)).toHaveAttribute('href', '/settings')
      await expect(resetButton(page), 'a signed-in person has no reset form to open').toHaveCount(0)
      await expect(back(page)).toHaveAttribute('href', '/')

      await settingsLink(page).click()
      await expect(page).toHaveURL(/\/settings$/)
      await expect(heading(page)).toHaveCount(0)
    })
  })
}

test('the keyboard walks from the heading to every way on, and Enter on Reset your password opens the reset form', async ({ page }) => {
  watch(page, 'a keyboard user with an expired reset link')
  await goRaw(page, PATH)
  await expect(heading(page)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(resetButton(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(back(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(help(page)).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(resetButton(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(resetDialog(page)).toBeVisible()
  await expect(page.getByLabel('Email')).toBeFocused()
})

test('/reset-password with no query still shows the expired-link page, not the 404', async ({ page }) => {
  watch(page, 'someone typing the reset address by hand')
  await goRaw(page, '/reset-password')
  await expect(heading(page)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /doesn’t exist/ })).toHaveCount(0)
})
