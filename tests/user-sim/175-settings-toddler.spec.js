// /settings under a toddler's hands: junk in every field, a button hit five
// times, keys that should work and did nothing.
//
// Held here:
//   · a 3,000-character name with no spaces wraps inside its column: the page
//     has no sideways scroll and the header name neither overflows its own box
//     nor runs under Sign out, at 390 and at 1440; the Display name row keeps its
//     Edit button inside the card;
//   · five rapid presses of Update password make ONE call, the button and fields
//     are disabled while it runs, and the page says "updated" once;
//   · in the email edit flow Enter advances and submits, and a malformed
//     address is turned away at Next with an inline message;
//   · in Delete account Escape closes the panel and returns focus to the button
//     that opened it; in Clear data Escape backs out of Confirm clear;
//   · `javascript:` is refused as a website, inline, and nothing is saved; a
//     plain https address still saves;
//   · an emoji-only display name shows the first letter of the email as the
//     avatar initial, not half an emoji.
//
// No screenshots: positions and scroll widths are read from the layout.
// The password call is counted through the auth double's `calls` list, and held
// open with `delays.updatePassword` (tests/user-sim/fixtures/firebase-auth.js).
//
// MUTATIONS (each turns the tests named red):
//   `overflow-wrap: anywhere` dropped from `.settings-profile-name`  -> "a 3,000-character name wraps ..." (both widths)
//   the `busyRef` guard in PasswordChange.handleSave removed         -> "five rapid presses ..." (five calls)
//   `<form onSubmit>` around the email steps removed                 -> "Enter in the email flow ..."
//   EMAIL_SHAPE check removed from handleNext                        -> "Enter in the email flow ..." (the typo reaches the password step)
//   the Escape handler on the DeleteAccount form removed             -> "Escape closes Delete account ..."
//   `.settings-row--field` nowrap/flex-start rules dropped          -> "a 3,000-character name wraps ..." at 390 (Edit drops below the value)
//   `currentRef.current?.focus()` removed from PasswordChange        -> "after a wrong current password the focus is on that field ..."
//   the cleared-name toast text changed                              -> "clearing the display name says ..."
//   the Escape handler on the email forms removed                    -> "Enter in the email flow ..." (Escape step)
//   the Escape handler on the Confirm clear pair removed             -> "Escape backs out of Confirm clear"
//   `checkWebsite` removed from saveWebsite                          -> "javascript: is refused ..."
//   `initialOf` back to `(name || email || 'U')[0]` in Settings      -> "an emoji-only name ..."
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

async function openSection(page, id) {
  await page.locator(`#settab-${id}`).click()
  await expect(page.locator(`#set-${id}`)).toBeVisible()
}

async function openAccount(page, opts = {}) {
  await signIn(page, { plan: 'free', ...opts })
  await go(page, '/settings')
  await openSection(page, 'account')
  return page.locator('#set-account')
}

const LONG_NAME = 'W'.repeat(3000)

for (const width of [390, 1440]) {
  test.describe(`settings, a very long name at ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } })

    test(`a 3,000-character name wraps inside its column at ${width}`, async ({ page }) => {
      watch(page, 'a person who pasted 3,000 characters into their name')
      const section = await openAccount(page, { displayName: LONG_NAME })

      const header = section.locator('.settings-profile')
      const name = header.locator('.settings-profile-name')
      await expect(name).toContainText('WWWW')

      // No sideways scroll on the page.
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0)

      // The name's text stays inside the name's own box (an unbreakable run
      // spills past it when it cannot wrap), and the box stays inside the card.
      const spill = await name.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(spill, 'the header name runs past its own box').toBeLessThanOrEqual(1)
      const card = await section.locator('.settings-card').boundingBox()
      const nameBox = await name.boundingBox()
      expect(nameBox.x + nameBox.width).toBeLessThanOrEqual(card.x + card.width + 0.5)
      // Two lines is the most the header gives it.
      expect(nameBox.height, 'the header name is taller than two lines').toBeLessThan(60)

      // And it never shares space with Sign out.
      const out = await header.getByRole('button', { name: 'Sign out' }).boundingBox()
      const apart = nameBox.x + nameBox.width <= out.x + 0.5
        || out.x + out.width <= nameBox.x + 0.5
        || nameBox.y + nameBox.height <= out.y + 0.5
        || out.y + out.height <= nameBox.y + 0.5
      expect(apart, 'the name runs under Sign out').toBe(true)

      // The Display name row shows the whole value, wrapped, with Edit in the card.
      const row = section.locator('.settings-row').first()
      const value = row.locator('.settings-row-value')
      expect(await value.evaluate((el) => el.textContent.length)).toBe(3000)
      const rowSpill = await value.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(rowSpill, 'the Display name value runs past its box').toBeLessThanOrEqual(1)
      const edit = await row.getByRole('button', { name: 'Edit', exact: true }).boundingBox()
      expect(edit.x + edit.width).toBeLessThanOrEqual(card.x + card.width + 0.5)
      // Edit stays top-right beside the label, at every width: level with the
      // label row and to the right of the value, not dropped below it.
      const label = await row.locator('.settings-row-label').boundingBox()
      expect(Math.abs(edit.y - label.y), 'Edit is not level with the label row').toBeLessThan(12)
      expect(edit.x, 'Edit is not to the right of the value').toBeGreaterThanOrEqual(label.x + label.width - 0.5)
      const valueBox = await value.boundingBox()
      expect(edit.x).toBeGreaterThanOrEqual(valueBox.x + valueBox.width - 0.5)
    })
  })
}

test.describe('settings, password change', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('five rapid presses of Update password make one call, and the page says so once', async ({ page }) => {
    watch(page, 'a person hammering Update password')
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Change', exact: true }).last().click()
    await section.getByLabel('Current password').fill('old-pass-1')
    await section.getByLabel('New password', { exact: true }).fill('new-pass-22')
    await section.getByLabel('Confirm new password').fill('new-pass-22')
    // Hold the answer back so the other four presses land while it is pending.
    await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.delays.updatePassword = 2000 })

    // Five clicks inside one task: no render sits between them, so only a
    // guard that is not React state can stop the extra four.
    await section.getByRole('button', { name: 'Update password' }).evaluate((btn) => { for (let i = 0; i < 5; i += 1) btn.click() })

    // While it runs the form says so and cannot be pressed again.
    await expect(section.getByRole('button', { name: 'Updating…' })).toBeDisabled()
    await expect(section.getByLabel('New password', { exact: true })).toHaveAttribute('aria-disabled', 'true')
    await expect(section.getByLabel('New password', { exact: true })).toHaveJSProperty('readOnly', true)

    await expect(section.locator('.settings-field-ok')).toHaveCount(1)
    await expect(section.locator('.settings-field-ok')).toContainText('Password updated successfully')
    await expect(section.locator('.settings-field-err')).toHaveCount(0)
    const calls = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.calls.filter((c) => c === 'updatePassword').length)
    expect(calls, 'Firebase was asked to change the password more than once').toBe(1)
  })
})

test.describe('settings, errors and focus', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('after a wrong current password the focus is on that field and the error is linked to it', async ({ page }) => {
    watch(page, 'a person who mistyped their current password')
    const section = await openAccount(page, { authFail: { updatePassword: 'auth/wrong-password' } })
    await section.getByRole('button', { name: 'Change', exact: true }).last().click()
    const current = section.getByLabel('Current password')
    await current.fill('wrong-one')
    await section.getByLabel('New password', { exact: true }).fill('new-pass-22')
    await section.getByLabel('Confirm new password').fill('new-pass-22')
    await section.getByRole('button', { name: 'Update password' }).click()
    const alert = section.getByRole('alert')
    await expect(alert).toContainText('Current password is incorrect')
    await expect(current, 'focus fell away from the form').toBeFocused()
    await expect(current).toHaveAttribute('aria-invalid', 'true')
    const id = await alert.getAttribute('id')
    await expect(current).toHaveAttribute('aria-describedby', id)
  })

  test('clearing the display name says the start of the email shows instead', async ({ page }) => {
    watch(page, 'a person blanking their display name')
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Edit', exact: true }).first().click()
    const field = section.getByPlaceholder('Enter your display name')
    await field.fill('')
    await field.press('Enter')
    await expect(page.getByText('Display name cleared. The start of your email shows instead.')).toBeVisible()
  })
})

test.describe('settings, keys', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Enter in the email flow advances and submits, and a typo is turned away at Next', async ({ page }) => {
    watch(page, 'a keyboard user changing their email')
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Edit', exact: true }).nth(1).click()
    const email = section.getByPlaceholder('Enter new email')

    await email.fill('not-an-email')
    await email.press('Enter')
    await expect(section.getByRole('alert')).toContainText('not a valid email')
    await expect(email, 'a typo got past Next').toBeVisible()

    await email.press('Escape')
    await expect(section.getByRole('button', { name: 'Edit', exact: true }).nth(1), 'Escape did not return focus to Edit').toBeFocused()
    await section.getByRole('button', { name: 'Edit', exact: true }).nth(1).click()
    await email.fill('new.address@uil4b.test')
    await email.press('Enter')
    const password = section.getByPlaceholder('Enter your password to confirm')
    await expect(password, 'Enter did not advance to the password step').toBeFocused()
    await expect(section.getByRole('alert')).toHaveCount(0)

    await password.fill('hunter22')
    await password.press('Enter')
    await expect(section.getByRole('status')).toContainText('Confirmation link sent to new.address@uil4b.test')
    const mail = await page.evaluate(() => window.__UIL4B_TEST_AUTH__.mail)
    expect(mail).toEqual([{ kind: 'change-email', to: 'new.address@uil4b.test' }])
  })

  test('Escape closes Delete account and gives focus back to the button that opened it', async ({ page }) => {
    watch(page, 'a keyboard user backing out of deleting their account')
    const section = await openAccount(page)
    await section.getByRole('button', { name: 'Delete account' }).click()
    const password = section.locator('#del-confirm-pw')
    await expect(password).toBeFocused()
    await password.fill('not-my-password')
    await password.press('Escape')
    await expect(section.locator('.danger-confirm'), 'Escape left the panel open').toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Delete account' })).toBeFocused()
    // Reopening starts clean: the typed password is not kept.
    await section.getByRole('button', { name: 'Delete account' }).click()
    await expect(section.locator('#del-confirm-pw')).toHaveValue('')
  })

  test('Escape backs out of Confirm clear', async ({ page }) => {
    watch(page, 'a keyboard user backing out of clearing their data')
    await signIn(page, { plan: 'free' })
    await go(page, '/settings')
    await openSection(page, 'data')
    const section = page.locator('#set-data')
    await section.getByRole('button', { name: 'Clear data' }).click()
    await expect(section.getByRole('button', { name: 'Confirm clear' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(section.getByRole('button', { name: 'Confirm clear' }), 'Escape left Confirm clear armed').toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Clear data' })).toBeFocused()
  })
})

test.describe('settings, website and avatar', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('javascript: is refused as a website, inline, and a plain https address still saves', async ({ page }) => {
    watch(page, 'a person pasting a script URL into their website')
    const section = await openAccount(page)
    const row = section.locator('.settings-row', { has: page.getByText('Website', { exact: true }) })
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    const field = row.getByPlaceholder('https://yoursite.com')

    await field.fill('javascript:alert(1)')
    await field.press('Enter')
    await expect(row.getByRole('alert')).toContainText('Enter a web address, like https://yoursite.com.')
    await expect(page.getByText('Website updated'), 'a script URL was saved').toHaveCount(0)
    await expect(field, 'the field closed on a refused value').toBeVisible()

    await field.fill('https://yoursite.example')
    await field.press('Enter')
    await expect(page.getByText('Website updated')).toBeVisible()
    await expect(row.locator('.settings-row-value')).toHaveText('https://yoursite.example')
  })

  test('an emoji-only name shows the first letter of the email as the avatar initial, not half an emoji', async ({ page }) => {
    watch(page, 'a person whose name is an emoji')
    const section = await openAccount(page, { displayName: '\u{1F600}' })
    const initial = section.locator('.settings-profile-avatar span').first()
    await expect(initial).toHaveText('F')
  })
})
