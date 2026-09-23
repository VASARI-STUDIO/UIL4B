// A FAILURE IS NOT ANNOUNCED WITH A SUCCESS TICK.
//
// When /api/verify-admin refuses, Admin.jsx raises a toast. It called
// toast('Admin verification failed') with no kind, so the failure arrived in
// the SUCCESS toast: a green tick, role="status", and the short success clock —
// the one message on the page that says something is wrong, dressed as the
// one that says everything is fine. Seen on /admin in dark, 2026-09-23.
//
// The server is refused explicitly here rather than left to 404 in the preview,
// so the test does not depend on /api being absent.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'

test('a refused admin verification raises an ERROR toast, announced as an alert', async ({ page }) => {
  await page.route('**/api/verify-admin', (r) => r.fulfill({
    status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Forbidden' }),
  }))
  await signIn(page, { admin: true, plan: 'pro' })
  await go(page, '/admin')

  const toast = page.locator('.toast.show', { hasText: 'Admin verification failed' })
  await expect(toast).toBeVisible({ timeout: 10000 })
  await expect(toast).toHaveClass(/toast-error/)
  await expect(toast).not.toHaveClass(/toast-success/)
  await expect(toast).toHaveAttribute('role', 'alert')
  // The page's own diagnostic still renders beside it; the toast is not the
  // only place the reason is stated.
  await expect(page.locator('.adm-verify-error')).toContainText('Forbidden')
})
