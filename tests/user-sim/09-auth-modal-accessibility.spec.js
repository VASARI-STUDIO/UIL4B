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

test('community submission entry points explain sign-in before showing a form', async ({ page }) => {
  watch(page, 'signed-out creator trying to contribute')
  await go(page, '/community')

  const submit = page.getByRole('button', { name: 'Submit design' })
  await submit.click()

  const dialog = page.getByRole('dialog', { name: /log in to continue/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Why we ask first')).toBeVisible()
  await expect(dialog).toContainText('credited to you')
  await expect(dialog).toContainText('reviewed before it appears')
  await expect(dialog).toContainText('withdraw anything')
  await expect(page.getByRole('dialog', { name: 'Submit a design' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(submit).toBeFocused()
})
