// Creating an account shows what the person is agreeing to, with the Terms
// and Privacy pages one click away (in a new tab, so the form survives).
import { test, expect } from './base.js'
import { go } from './helpers.js'

test('the sign-up form links Terms and Privacy; the sign-in form does not repeat it', async ({ page }) => {
  await go(page, '/login')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.auth-legal'), 'sign-in is not account creation').toHaveCount(0)

  await dialog.getByRole('button', { name: /Sign up$/i }).click()
  const legal = dialog.locator('.auth-legal')
  await expect(legal).toBeVisible()
  const terms = legal.getByRole('link', { name: 'Terms' })
  const privacy = legal.getByRole('link', { name: 'Privacy' })
  await expect(terms).toHaveAttribute('href', '/terms')
  await expect(privacy).toHaveAttribute('href', '/privacy')
  await expect(terms).toHaveAttribute('target', '_blank')
  await expect(privacy).toHaveAttribute('target', '_blank')
})
