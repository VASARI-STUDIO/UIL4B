// THE LINK-EXPIRED PAGE: where a password-reset link lands when it can no longer
// be used. The reset itself is hosted by the sign-in provider; this page is the
// app's own answer for a link that was used already or has run out.
//
// A person arriving here wants three things: to be told the link is dead in
// plain words, to get a new one without hunting for the form, and a way out to
// somewhere else. "Send a new link" opens the log-in popup over the page (the
// reset is requested from there), so they are never left on a dead end.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// In LinkExpired.jsx make "Send a new link" navigate instead of calling
// openLogin(), or change the document.title: the popup tests and the title
// test fail. Delete the /reset-password route in App.jsx: every test lands on
// the 404 heading instead.
import { test, expect } from './base.js'
import { goRaw, watch } from './helpers.js'

const TITLE = 'That reset link doesn’t work now'
const PATH = '/reset-password?mode=resetPassword&oobCode=expired-code.test'

const heading = (page) => page.getByRole('heading', { level: 1, name: TITLE })
const sendNew = (page) => page.getByRole('button', { name: 'Send a new link' })
const back = (page) => page.getByRole('link', { name: 'Back to the homepage' })
const help = (page) => page.getByRole('navigation', { name: 'More ways back' }).getByRole('link', { name: 'Help centre' })
const loginDialog = (page) => page.getByRole('dialog', { name: /log in to ui l4b/i })

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
      await expect(sendNew(page)).toBeEnabled()
      await expect(back(page)).toHaveAttribute('href', '/')
      await expect(help(page)).toHaveAttribute('href', '/learn/help')
      await expect(page.locator('meta[name="robots"]'), 'a reset address must not be indexed').toHaveAttribute('content', /noindex/)

      const text = await page.locator('.ed').innerText()
      expect(text, 'the page must not echo the code in the link').not.toContain('expired-code')
    })

    test('Send a new link opens the log-in popup over the page, and closing it leaves the page', async ({ page }) => {
      watch(page, 'someone asking for a fresh reset link')
      await goRaw(page, PATH)
      await expect(heading(page)).toBeVisible()

      await sendNew(page).click()
      const dialog = loginDialog(page)
      await expect(dialog).toBeVisible()
      await expect(page, 'the popup opens over the page, it does not navigate').toHaveURL(/\/reset-password\?/)

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(heading(page)).toBeVisible()
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
  })
}

test('the keyboard walks from the heading to every way on, and Enter on Send a new link opens the popup', async ({ page }) => {
  watch(page, 'a keyboard user with an expired reset link')
  await goRaw(page, PATH)
  await expect(heading(page)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(sendNew(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(back(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(help(page)).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(sendNew(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(loginDialog(page)).toBeVisible()
})

test('/reset-password with no query still shows the expired-link page, not the 404', async ({ page }) => {
  watch(page, 'someone typing the reset address by hand')
  await goRaw(page, '/reset-password')
  await expect(heading(page)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /doesn’t exist/ })).toHaveCount(0)
})
