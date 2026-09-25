// The AI allowance at the wall: when it resets, said truthfully, and where
// Free goes from there.
//
// Before: "It resets at midnight." The server's day is UTC (api/ai.js keys the
// bucket on the function's clock), so that was 10 am in Brisbane. And the wall
// offered no way to the plans page, the one moment someone on Free wants it.
//
// The daily count is seeded in this browser's usage tracker, which the meter
// reads until the first server response, so no /api/ai call is needed.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'
import { AI_LIMITS } from '../../src/config/plans.js'

async function exhaustToday(page, used) {
  await page.addInitScript((n) => {
    const d = new Date()
    const key = `vs-usage-alt-text-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem(key, String(n))
  }, used)
}

test('Free at the daily wall: the reset in UTC, and a way to the plans', async ({ page }) => {
  await signIn(page, { plan: 'free' })
  await exhaustToday(page, AI_LIMITS.free.daily)
  await go(page, '/create/alt-text')

  const msg = page.locator('.quota-msg')
  await expect(msg).toContainText(`You've used all ${AI_LIMITS.free.daily} AI generations today.`)
  await expect(msg).toContainText('It resets at 00:00 UTC')
  await expect(msg).not.toContainText('midnight')
  await expect(page.getByRole('link', { name: 'See all plans' })).toHaveAttribute('href', '/plans')
})

test('Pro at the wall is told when it resets, and is not sold the plan they have', async ({ page }) => {
  await signIn(page, { plan: 'pro' })
  await exhaustToday(page, AI_LIMITS.pro.daily)
  await go(page, '/create/alt-text')

  await expect(page.locator('.quota-msg')).toContainText('It resets at 00:00 UTC')
  await expect(page.getByRole('link', { name: 'See all plans' })).toHaveCount(0)
})
