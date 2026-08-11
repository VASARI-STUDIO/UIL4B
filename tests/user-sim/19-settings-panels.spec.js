// Settings is a tablist, and it must never open blank.
//
// REGRESSION GUARD. `active` initialised to 'subscription' while the section id
// was 'support' — a mismatch that was invisible for as long as every section
// rendered at once, because `active` only drove the nav highlight. The moment
// the sections became real panels it meant the page opened showing NOTHING.
// That is the class of bug this file exists to catch: a default that matches no
// panel is a blank page, and a blank page is indistinguishable from a crash.
import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

test.describe('settings panels', () => {
  test('opens on a real panel, never blank', async ({ page }) => {
    watch(page, 'a visitor opening settings')
    await go(page, '/settings')

    const visible = page.locator('.settings-section:not([hidden])')
    await expect(visible, 'exactly one panel is showing').toHaveCount(1)
    await expect(visible.locator('h2')).toBeVisible()
    // The selected tab and the visible panel must be the same thing.
    const selected = page.getByRole('tab', { selected: true })
    await expect(selected).toHaveCount(1)
    await expect(selected).toHaveAttribute('aria-controls', await visible.getAttribute('id'))
  })

  test('choosing a section swaps the panel rather than scrolling', async ({ page }) => {
    watch(page, 'a visitor changing their language')
    await go(page, '/settings')

    const before = await page.evaluate(() => window.scrollY)
    await page.getByRole('tab', { name: /Language/ }).click()

    const visible = page.locator('.settings-section:not([hidden])')
    await expect(visible).toHaveCount(1)
    await expect(visible).toHaveAttribute('id', 'set-language')
    // A panel swap must not move the page under the user.
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })

  test('arrow keys move between tabs, and only the active one is tabbable', async ({ page }) => {
    watch(page, 'a keyboard-only visitor')
    await go(page, '/settings')

    const first = page.getByRole('tab').first()
    await first.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('tab', { selected: true })).toBeFocused()

    // Roving tabindex: one stop for the whole list, not one per tab.
    const tabbable = await page.locator('[role="tab"][tabindex="0"]').count()
    expect(tabbable, 'exactly one tab is in the tab order').toBe(1)
  })

  test('signed out, Settings does not render a trial button it cannot honour', async ({ page }) => {
    // It used to show the ENTIRE pricing comparison — both tiers, a billing
    // toggle and "Start 7-day free trial" — under a small "sign in to upgrade"
    // note. A trial CTA you cannot use, beneath a line telling you that.
    watch(page, 'a signed-out visitor landing on settings')
    await go(page, '/settings')

    await expect(page.getByRole('button', { name: /free trial/i })).toHaveCount(0)
    await expect(page.locator('.sub-billing-toggle')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /See Free and Pro/ })).toBeVisible()
  })
})
