// A visitor with no account opens Export on a free file, can browse the formats and
// the themes, and is asked to sign in only when they press Export, in the dialog's
// own dock. After signing in the export they asked for goes ahead.
import { chooseFormat, chooseTemplate, expectTemplate, exportPanel, primaryButton, dockStatus, categoryRadio, fileGroup } from './export-rows.js'
import { test, expect } from './base.js'
import { go, watch, signIn, continueWithEmail } from './helpers.js'
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

/** The template in use: read from the pressed card in the templates grid. */
async function expectTheme(panel, name) {
  await expectTemplate(panel, name)
}

/** Pick a template the way Flow B offers it: View templates, then the card. */
async function chooseTheme(page, panel, name) {
  await chooseTemplate(panel, name)
  await expectTheme(panel, name)
}

/** The free start: the Guidelines tab on the PDF file. */
async function expectFreeStart(panel, why) {
  await expect(categoryRadio(panel, 'Guidelines'), why).toHaveAttribute('aria-selected', 'true')
  await expect(fileGroup(panel, 'Guidelines').getByRole('radio', { name: /^PDF/ }), why).toHaveAttribute('aria-checked', 'true')
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

    test('opens on the guidelines in Label, a file it may export, with the preview and the theme in view', async ({ page }) => {
      watch(page, 'a visitor opening Export before making an account')
      await go(page, BOARD)
      const panel = await openFromHeader(page)
      await expectFreeStart(panel, 'the dialog did not open on the free guidelines')
      await expect(primaryButton(panel)).toHaveText('Export PDF')
      await expectTheme(panel, 'Label')
      await expect(panel.locator('.xd-box img').first()).toBeVisible()
      await expect(dockStatus(panel)).toHaveText(/Free with an account\. Log in to export\. The file carries a small ‘Made with UI L4B’ mark\./)
      await expect(panel.locator('#ui-login-title'), 'the sign-in is not asked for until Export is pressed').toHaveCount(0)
    })

    test('can move between the free guidelines themes, and a Pro theme shows the lock and the way to Pro', async ({ page }) => {
      watch(page, 'a visitor trying the guidelines themes before making an account')
      await go(page, BOARD)
      const panel = await openFromHeader(page)
      await expectFreeStart(panel, 'the dialog did not open on the free guidelines')

      // Label and Swiss Field are the free guidelines themes: either one exports free, with the mark.
      for (const name of ['Swiss Field', 'Label']) {
        await chooseTheme(page, panel, name)
        await expect(primaryButton(panel), name).toHaveText('Export PDF')
        await expect(dockStatus(panel), name).toHaveText(/Free with an account. Log in to export. The file carries a small ‘Made with UI L4B’ mark./)
        await expect(panel.locator('.xd-stage-pro'), name).toHaveCount(0)
      }

      // A Pro theme is still listed, but its preview is locked and the button is the way to Pro, not a download.
      await chooseTheme(page, panel, 'Presentation')
      await expect(panel.locator('.xd-box')).toHaveClass(/is-locked/)
      await expect(panel.locator('.xd-stage-pro')).toHaveText('Pro template')
      await expect(dockStatus(panel)).toHaveText(/^Pro theme. The guidelines are free in Label and Swiss Field./)
      await expect(primaryButton(panel)).toHaveText('Upgrade to Pro')
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
      await expectFreeStart(panel, 'the choice is kept')
      await expectTheme(panel, 'Label')
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
    // The templates and the formats are usable before any sign-in.
    await chooseFormat(panel, 'css')
    await chooseFormat(panel, 'kit')
    await primaryButton(panel).click()
    await expect(panel.locator('.xd-signin')).toBeVisible()

    // The panel hands the export on when the form reports success, so the sign-in goes through the form
    // (the test double completes the late sign-in on submit), not around it.
    await panel.locator('#ui-login-email').fill('visitor@example.com')
    await continueWithEmail(page, panel)
    await panel.locator('#ui-login-password').fill('correct-horse-battery')
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      panel.locator('.xd-signin').getByRole('button', { name: 'Log in', exact: true }).click(),
    ])
    expect(download.suggestedFilename()).toBe('untitled-ui-kit-04-standards.zip')
    expect(calls.map((c) => c.body)).toEqual([expect.objectContaining({ theme: '04-standards', row: 'ui-kit', format: 'zip' })])
    await expect(panel.locator('.xd-signin')).toHaveCount(0)
  })
})
