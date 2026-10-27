// Both log-in and sign-up show what the person is agreeing to (Google from
// log-in can create an account), with the Terms and Privacy pages one click
// away in a new tab so the form survives. Reset and switch never show it.
import { test, expect } from './base.js'
import { go } from './helpers.js'

const LEGAL = 'By continuing, you agree to the Terms and Privacy Policy. You must be 16 or older to create an account.'

test('the log-in and sign-up forms link Terms and Privacy; reset does not', async ({ page }) => {
  await go(page, '/login')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.auth-legal'), 'log-in can create an account through Google').toHaveText(LEGAL)

  await dialog.getByRole('button', { name: /Create one$/i }).click()
  const legal = dialog.locator('.auth-legal')
  await expect(legal).toHaveText(LEGAL)
  const terms = legal.getByRole('link', { name: 'Terms' })
  const privacy = legal.getByRole('link', { name: 'Privacy Policy' })
  await expect(terms).toHaveAttribute('href', '/terms')
  await expect(privacy).toHaveAttribute('href', '/privacy')
  await expect(terms).toHaveAttribute('target', '_blank')
  await expect(privacy).toHaveAttribute('target', '_blank')

  await dialog.getByRole('button', { name: /Log in$/ }).click()
  await dialog.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(dialog.locator('.auth-legal')).toHaveCount(0)
})
