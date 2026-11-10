// A visitor with no account opens Export on a free file, can browse the formats and
// the themes, and is asked to sign in only when they press Export, in the dialog's
// own dock. After signing in the export they asked for goes ahead.
import { chooseFormat, exportPanel, primaryButton, dockStatus } from './export-rows.js'
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
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

const SIZES = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 700 },
]

for (const size of SIZES) {
  test.describe(`signed out at ${size.width}px`, () => {
    test.use({ viewport: size })

    test('opens on the UI kit in Standards with the preview and Theme row in view', async ({ page }) => {
      watch(page, 'a visitor opening Export before making an account')
      await go(page, BOARD)
      const panel = await openFromHeader(page)
      await expect(panel.getByRole('radio', { name: /^UI kit/ }), 'the dialog opened on a Pro document').toHaveAttribute('aria-checked', 'true')
      await expect(primaryButton(panel)).toHaveText('Export UI kit')
      await expect(panel.getByRole('button', { name: 'Change theme, current Standards' })).toBeVisible()
      await expect(panel.locator('.xd-theme-stage img').first()).toBeVisible()
      await expect(dockStatus(panel)).toHaveText(/Free with an account\. Sign in to export\./)
      await expect(panel.locator('#ui-login-title'), 'the sign-in is not asked for until Export is pressed').toHaveCount(0)
    })

    test('Export opens the sign-in inside the dialog; Escape closes only the panel and keeps the choices', async ({ page }) => {
      watch(page, 'a visitor who presses Export and changes their mind')
      const calls = await mockThemeApi(page)
      await go(page, BOARD)
      const panel = await openFromHeader(page)
      await primaryButton(panel).click()

      const form = panel.locator('.xd-signin')
      await expect(form, 'the sign-in is not inside the dialog').toBeVisible()
      await expect(page.locator('.ui-modal-overlay'), 'a second modal opened over the dialog').toHaveCount(0)
      await expect(panel.locator('#ui-login-email'), 'focus goes to the first field').toBeFocused()
      expect(calls, 'nothing is asked of the server before sign-in').toEqual([])

      await page.keyboard.press('Escape')
      await expect(form).toHaveCount(0)
      await expect(panel, 'Escape closed the whole dialog').toBeVisible()
      await expect(primaryButton(panel), 'focus returns to Export').toBeFocused()
      await expect(panel.getByRole('radio', { name: /^UI kit/ }), 'the choice is kept').toHaveAttribute('aria-checked', 'true')
    })
  })
}

test.describe('signed out, signing in from the dialog', () => {
  test('browsing keeps working, and after a mocked sign-in the export goes ahead', async ({ page }) => {
    watch(page, 'a visitor who signs in to finish an export')
    const calls = await mockThemeApi(page)
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, BOARD)
    const panel = await openFromHeader(page)
    // The Theme row and the formats are usable before any sign-in.
    await chooseFormat(panel, 'css')
    await chooseFormat(panel, 'kit')
    await primaryButton(panel).click()
    await expect(panel.locator('.xd-signin')).toBeVisible()

    await page.waitForFunction(() => !!window.__UIL4B_TEST_AUTH__)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow()),
    ])
    expect(download.suggestedFilename()).toBe('untitled-ui-kit-04-standards.zip')
    expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ theme: '04-standards', row: 'ui-kit', format: 'zip' })])
    await expect(panel.locator('.xd-signin')).toHaveCount(0)
  })
})
