import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

const PERSONA = 'keyboard account access'

test('login dialog focuses, traps keyboard navigation, labels fields and restores scroll', async ({ page }) => {
  watch(page, PERSONA)
  await go(page, '/login')

  const dialog = page.getByRole('dialog', { name: /welcome back|log in to continue/i })
  await expect(dialog).toBeVisible()
  const google = dialog.getByRole('button', { name: /continue with google/i })
  await expect(google).toBeFocused()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByLabel('Password')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')

  const close = dialog.getByRole('button', { name: 'Close' })
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: /forgot password/i })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('dismissing an in-place auth prompt restores its persistent opener', async ({ page }) => {
  watch(page, PERSONA)
  await go(page, '/palette')

  const save = page.getByTitle('Save, share or export this palette')
  await expect(save).toBeVisible()
  await save.click()
  const dialog = page.getByRole('dialog', { name: /log in to continue/i })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(save).toBeFocused()
})
