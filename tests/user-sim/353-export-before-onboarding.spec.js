// A VISITOR WHO MAKES AN ACCOUNT INSIDE THE EXPORT DIALOG GETS THE FILE, THEN ONBOARDING.
//
// A new account raises the onboarding flag, and AppInner routes every new account
// to /onboarding. Routing at once unmounted the Export dialog while its export was
// still waiting on the new account's plan, so no file was saved. The export now
// holds that route (src/utils/exportHold.js) until it has finished.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// App.jsx: drop `|| onboardingHeldForExport` from the onboarding effect (the
// download never arrives). useExportRunner.js: release the hold before
// runExport (same).
import { test, expect } from './base.js'
import { go, signIn, watch, continueWithEmail } from './helpers.js'
import { chooseFormat, exportPanel, primaryButton } from './export-rows.js'
import { mockThemeApi } from './export-theme-mock.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'

async function openFromHeader(page) {
  const opener = page.locator('.pnav-export:visible, .pnav-mobile:visible').first()
  await expect(opener).toBeVisible({ timeout: 15000 })
  if (await opener.evaluate((el) => el.classList.contains('pnav-export'))) {
    await opener.click()
  } else {
    await opener.click()
    await page.locator('.pnav-sheet-row', { hasText: 'Export' }).click()
  }
  const panel = exportPanel(page)
  await expect(panel).toBeVisible({ timeout: 15000 })
  return panel
}

for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`a new account made in the export dialog saves the file before onboarding at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    watch(page, 'a visitor who signs up to finish an export')
    const calls = await mockThemeApi(page)
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, BOARD)
    const panel = await openFromHeader(page)
    await chooseFormat(panel, 'kit')
    await primaryButton(panel).click()

    const form = panel.locator('.xd-signin')
    await expect(form).toBeVisible()
    await form.getByRole('button', { name: /Create one$/ }).click()
    await panel.locator('#ui-login-email').fill('new.exporter@uil4b.test')
    await continueWithEmail(page, panel)
    await panel.locator('#ui-login-password').fill('a-long-test-password')

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      form.getByRole('button', { name: 'Create account' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('untitled-ui-kit-04-standards.zip')
    expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ theme: '04-standards', row: 'ui-kit', format: 'zip' })])

    await expect.poll(() => new URL(page.url()).pathname, { message: 'the new account still reaches onboarding', timeout: 15000 }).toBe('/onboarding')
  })
}
