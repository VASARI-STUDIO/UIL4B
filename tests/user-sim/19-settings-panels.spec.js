// Settings is a tablist, and it must never open blank.
//
// REGRESSION GUARD. `active` initialised to 'subscription' while the section id
// was 'support' — a mismatch that was invisible for as long as every section
// rendered at once, because `active` only drove the nav highlight. The moment
// the sections became real panels it meant the page opened showing NOTHING.
// That is the class of bug this file exists to catch: a default that matches no
// panel is a blank page, and a blank page is indistinguishable from a crash.
import { test, expect } from './base.js'
import { go, restingScrollY, signIn, watch } from './helpers.js'

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

    const before = await restingScrollY(page, 'settings, before the section swap')
    await page.getByRole('tab', { name: /Language/ }).click()

    const visible = page.locator('.settings-section:not([hidden])')
    await expect(visible).toHaveCount(1)
    await expect(visible).toHaveAttribute('id', 'set-language')
    // A panel swap must not move the page under the user. Read at rest rather
    // than the instant after the click: this page is under Lenis, so a smooth
    // scroll that had not started yet would read as no scroll at all, and the
    // assertion would be one that cannot go red.
    expect(await restingScrollY(page, 'settings, after the section swap')).toBe(before)
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

  // AN UNREACHABLE PRICE SERVICE IS A STATE THIS PANEL HAS TO RENDER. With
  // /api/get-prices down, `loaded` is true (the fetch SETTLED) and the amount
  // is null, so the Pro tier printed a blank where the price goes — which
  // reads as free — over the line "USD · null/mo". /plans and /checkout
  // already answer this outage; Settings now says what they say.
  test('signed in, the Pro tier never prints a blank price or "null" when pricing is down', async ({ page }) => {
    watch(page, 'a free account comparing plans while the price service is down')
    await page.route('**/api/get-prices*', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.addInitScript(() => { try { localStorage.setItem('vs-settings-section', 'support') } catch { /* private mode */ } })
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    const pro = page.locator('.sub-tier-pro')
    await expect(pro).toBeVisible()
    for (const billing of ['Yearly', 'Monthly']) {
      await page.getByRole('tab', { name: new RegExp(billing) }).click()
      const amount = (await pro.locator('.sub-tier-amount').innerText()).trim()
      expect(amount, `${billing}: the Pro price is blank`).not.toBe('')
      await expect(pro.locator('.sub-tier-sub'), `${billing}: the price line prints "null"`).not.toContainText('null')
      await expect(pro.locator('.sub-tier-sub'), `${billing}: the outage is not said`).toContainText('Live pricing is unreachable')
    }
  })

  // THE SERVICE ANSWERS, BUT NOT FOR THIS CURRENCY. `serviceAvailable` is true
  // and the amount is still null (usePrices only formats a number), and the
  // yearly line printed "AUD · null/mo" under "Unavailable". The monthly one
  // claimed "billed monthly" for a price it could not show.
  test('signed in, a live price list without this currency never prints "null"', async ({ page }) => {
    watch(page, 'a free account whose currency the price service does not list')
    await page.route('**/api/get-prices*', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ monthly: {}, quarterly: {}, yearly: {} }),
    }))
    await page.addInitScript(() => { try { localStorage.setItem('vs-settings-section', 'support') } catch { /* private mode */ } })
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')

    const pro = page.locator('.sub-tier-pro')
    await expect(pro).toBeVisible()
    for (const billing of ['Yearly', 'Monthly']) {
      await page.getByRole('tab', { name: new RegExp(billing) }).click()
      // POSITIVE CONTROL: this is the no-amount state, not a loaded price.
      await expect(pro.locator('.sub-tier-amount'), `${billing}: a price was found after all`).toHaveText('Unavailable')
      await expect(pro.locator('.sub-tier-sub'), `${billing}: the price line prints "null"`).not.toContainText('null')
      await expect(pro.locator('.sub-tier-sub'), `${billing}: the missing price is not said`).toContainText('price for this billing period')
    }
  })
})
