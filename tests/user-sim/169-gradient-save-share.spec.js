// /create/gradient: Save or share, the shared SaveShareMenu, the gallery's
// "Your submissions", and the code well's Copy button (gradient slice S4).
//
// What this file pins:
//   1. The menu opens from the toolbar's "Save or share" and closes on Escape,
//      on a press outside and on the trigger, handing focus back to the trigger
//      for the keyboard and button routes.
//   2. A visitor who signs in AT the Save gate, with no reload, ends up with the
//      named project saved exactly once, on the gradient AND on the palette (the
//      stale-closure fix: the save runs from an effect, not from the closure
//      that was made before the account existed).
//   3. An empty name is refused in words under the field, on both tools.
//   4. Copy link writes the share URL (no `gn` while the gradient is unnamed);
//      Copy CSS and Copy Tailwind write the snippet; Download SVG is
//      aria-disabled with its reason for Conic and works for Linear.
//   5. "Submit for review" is gone (see also spec 14).
//   6. The gallery: a signed-out visitor with gradients left in this browser by
//      an earlier visit gets one note, not a list; a signed-in member sees the
//      account's own pending gradients and can withdraw one; browser-held
//      gradients are moved to the account once.
//   7. The code well's Copy button: its label follows the tab, "Copied" swaps in
//      without moving the button, Ctrl/Cmd+C with nothing selected copies the
//      whole snippet and with a selection leaves the browser's own copy alone.
//   8. The page does not change height (0px) while any of that happens, at 1440
//      and at 390 on a touch screen.
//
// Every expected string is written out by hand from the design (the share URL
// from the hand-off the test loads, the CSS from the stops it loads), not read
// back from the code that produces it.
//
// MUTATIONS (each is made in a THROWAWAY copy of src, never in the lane; the
// test named must go red):
//   GradientGenerator.jsx doSave: replace `setPendingSave(name)` with
//     `saveProject(name); closeSave('item'); toast?.('Project saved'); return`
//       -> "a visitor who signs in at the gate gets the gradient saved once, with no reload"
//   PaletteBuilder.jsx doSave: replace `setPendingSave(name)` with
//     `saveProject(name); setSaveOpen(false); toast?.('Project saved'); return`
//       -> "... saves the palette once, with no reload"
//   GradientGenerator.jsx doSave: drop the `if (!name) {...}` line
//       -> "an empty name on the gradient is refused ..."
//   PaletteBuilder.jsx doSave: drop the `if (!name) {...}` line
//       -> "an empty name on the palette is refused ..."
//   GradientGenerator.jsx copyLink: add `, name: 'x'` to the gradientToolUrl argument
//       -> "Copy link writes the share URL, and leaves gn off while the gradient has no name"
//   SaveShareMenu.jsx: remove `aria-disabled={disabled || undefined}`
//       -> "Download SVG is aria-disabled with its reason on a Conic gradient"
//   GradientGenerator.jsx downloadSvg: remove the `if (type === 'Conic') return` line AND
//     the `disabled`/`reason` props on its row -> same test
//   SaveShareMenu.jsx: `closeRef.current?.('escape')` -> `closeRef.current?.('outside')`
//       -> "Escape closes the menu and focus goes back to the trigger"
//   GradientGallery.jsx: make the signed-out note render `readLegacyGradientSubmissions()`
//     as a list, or drop the `!user &&` check -> the signed-out and signed-in gallery tests
//   GradientGenerator.jsx copyCode: `clearTimeout(...); setCopied(true)` removed
//       -> "Copy swaps to Copied ..."
//   GradientGenerator.jsx onCodeKeyDown: delete the `window.getSelection()?.toString()` guard
//       -> "Ctrl+C with a selection leaves the browser's own copy alone"
//   gradient.css `.grd .grd-copy-size { visibility: hidden }` -> `display: none`
//       -> "the Copy button keeps one width ..." and the height test
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const ROUTE = '/create/gradient'
// Two stops, linear, 135deg: the hand-off the tool decodes into its starting gradient.
const HANDOFF = `${ROUTE}?gs=1F4B8E-0_3FA9A0-100&gt=linear&ga=135&gi=srgb`
const HANDOFF_CONIC = `${ROUTE}?gs=1F4B8E-0_3FA9A0-100&gt=conic&ga=90`
const CSS_SNIPPET = 'background: linear-gradient(135deg, #1F4B8E 0%, #3FA9A0 100%);'
const TAILWIND_SNIPPET = 'bg-[linear-gradient(135deg,_#1F4B8E_0%,_#3FA9A0_100%)]'

const MENU_NAME = 'Save, share and export this gradient'
const saveButton = (page) => page.getByRole('button', { name: 'Save or share' })
const menuOf = (page) => page.getByRole('dialog', { name: MENU_NAME })
const toastOf = (page) => page.locator('.toast.show')
const storedProjects = (page) => page.evaluate(
  () => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat(),
)
const readClipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const grantClipboard = (page) => page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

// The fixture cannot mint an account from the create-account form, so the
// visitor logs in instead (the same step spec 137 takes at the export gate).
async function logInAtTheGate(page) {
  await expect(page.locator('#ui-login-title')).toBeVisible()
  await page.getByRole('button', { name: /Have an account?/ }).click()
  await page.locator('#ui-login-email').fill('someone@uil4b.test')
  await page.locator('#ui-login-password').fill('a-long-password')
  await page.locator('form.auth-form button[type="submit"]').click()
  await expect(page.locator('#ui-login-title')).toHaveCount(0)
}

/* ── 1 · The menu opens and closes ───────────────────────────────────────── */

test.describe('Save or share menu on the gradient', () => {
  test('the toolbar primary opens a dialog with Save, Share and Export, and no Submit for review', async ({ page }) => {
    watch(page, 'designer opening Save or share on a gradient')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await expect(saveButton(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(menuOf(page)).toHaveCount(0)

    await saveButton(page).click()
    const menu = menuOf(page)
    await expect(menu).toBeVisible()
    await expect(saveButton(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(menu.getByLabel('Project name')).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Copy link to this gradient' })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Copy CSS', exact: true })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Copy Tailwind class' })).toBeVisible()
    await expect(menu.getByRole('button', { name: /Download SVG/ })).toBeVisible()
    await expect(menu.getByText(/submit/i)).toHaveCount(0)
  })

  test('the name starts as "<type> gradient" and is selected, so typing replaces it', async ({ page }) => {
    watch(page, 'designer naming a gradient')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    const field = menuOf(page).getByLabel('Project name')
    await expect(field).toHaveValue('Linear gradient')
    await expect(field).toBeFocused()
    await page.keyboard.type('Harbour dusk')
    await expect(field).toHaveValue('Harbour dusk')
  })

  test('Escape closes the menu and focus goes back to the trigger', async ({ page }) => {
    watch(page, 'keyboard designer dismissing Save or share')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await expect(menuOf(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menuOf(page)).toHaveCount(0)
    await expect(saveButton(page)).toBeFocused()
    await expect(saveButton(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('a press outside closes the menu without pulling focus back to the trigger', async ({ page }) => {
    watch(page, 'designer clicking away from Save or share')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await expect(menuOf(page)).toBeVisible()
    await page.locator('.grd-stage').click({ position: { x: 20, y: 20 } })
    await expect(menuOf(page)).toHaveCount(0)
    await expect(saveButton(page), 'focus belongs where the press landed').not.toBeFocused()
  })

  test('pressing the trigger again closes the menu and keeps focus on it', async ({ page }) => {
    watch(page, 'designer toggling Save or share')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await expect(menuOf(page)).toBeVisible()
    await saveButton(page).click()
    await expect(menuOf(page)).toHaveCount(0)
    await expect(saveButton(page)).toBeFocused()
  })

  test('the Close button closes the menu and focus goes back to the trigger', async ({ page }) => {
    watch(page, 'designer closing Save or share with its X')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Close' }).click()
    await expect(menuOf(page)).toHaveCount(0)
    await expect(saveButton(page)).toBeFocused()
  })
})

/* ── 2 · Saving ──────────────────────────────────────────────────────────── */

test.describe('saving a gradient to the account', () => {
  test('a signed-in member saves under the name in the field, the menu closes and a toast says so', async ({ page }) => {
    watch(page, 'member saving a gradient')
    const account = await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('Harbour dusk')
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()

    await expect(toastOf(page)).toContainText('Project saved')
    await expect(menuOf(page)).toHaveCount(0)
    await expect(saveButton(page)).toBeFocused()
    const saved = await storedProjects(page)
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Harbour dusk')
    expect(saved[0].design.gradient.stops.map((s) => s.color)).toEqual(['#1F4B8E', '#3FA9A0'])
    expect(account.email).toBeTruthy()
  })

  test('Enter in the name field saves too', async ({ page }) => {
    watch(page, 'member pressing Enter to save a gradient')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('Enter saves')
    await page.keyboard.press('Enter')
    await expect(toastOf(page)).toContainText('Project saved')
    expect((await storedProjects(page)).map((p) => p.name)).toEqual(['Enter saves'])
  })

  test('a free account at the cap is refused under the field, with the way forward, and nothing is written', async ({ page }) => {
    watch(page, 'free member at the project cap saving a gradient')
    // The free plan saves up to 3 projects (spec 72 reads the same number from the app).
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('One too many')
    await page.keyboard.press('Enter')

    const refusal = page.getByTestId('gradient-save-refusal')
    await expect(refusal).toContainText('Free plan saves up to 3 projects')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(menuOf(page), 'the menu stays open over its own refusal').toBeVisible()
    await expect(page.locator('.toast-success.show')).toHaveCount(0)
    expect(await storedProjects(page)).toHaveLength(3)

    // Closing clears it, so a stale refusal cannot greet the next attempt.
    await page.keyboard.press('Escape')
    await saveButton(page).click()
    await expect(page.getByTestId('gradient-save-refusal')).toHaveCount(0)
  })

  test('Overwrite existing replaces that project instead of adding one', async ({ page }) => {
    watch(page, 'member overwriting a saved project with a gradient')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, HANDOFF)
    await saveButton(page).click()
    const before = await storedProjects(page)
    expect(before).toHaveLength(1)
    await menuOf(page).locator('.plb-scrolllist .plb-menu-item').first().click()

    await expect(toastOf(page)).toContainText('Updated: Seeded Project 1')
    await expect(menuOf(page)).toHaveCount(0)
    const after = await storedProjects(page)
    expect(after, 'overwriting must not add a project').toHaveLength(1)
    expect(after[0].id).toBe(before[0].id)
    expect(after[0].design.gradient.stops.map((s) => s.color)).toEqual(['#1F4B8E', '#3FA9A0'])
  })

  // MUTATION: see the header ("doSave ... saveProject(name)").
  test('a visitor who signs in at the gate gets the gradient saved once, with no reload', async ({ page }) => {
    watch(page, 'visitor signing in part-way through saving a gradient')
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('Late gradient')
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
    await logInAtTheGate(page)

    await expect(toastOf(page), 'the save that was waiting on the account never ran').toContainText('Project saved')
    await expect(page.getByTestId('gradient-save-refusal')).toHaveCount(0)
    await expect(menuOf(page)).toHaveCount(0)
    // The toast is up: the effect has run. Let one more frame land so a second,
    // late save would have shown itself before the count.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    const saved = await storedProjects(page)
    expect(saved, 'the hand-off saved other than exactly once').toHaveLength(1)
    expect(saved[0].name).toBe('Late gradient')
  })

  test('a visitor who closes the sign-in gate saves nothing', async ({ page }) => {
    watch(page, 'visitor dismissing the sign-in gate at Save')
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
    expect(await storedProjects(page)).toHaveLength(0)
    // Escape on the sign-in took only the dialog: the menu is still there.
    await expect(menuOf(page)).toBeVisible()
  })

  // MUTATION: see the header ("drop the `if (!name)` line").
  test('an empty name on the gradient is refused in words under the field, and nothing is saved', async ({ page }) => {
    watch(page, 'member saving a gradient with no name')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    const field = menuOf(page).getByLabel('Project name')
    await field.fill('   ')
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()

    await expect(menuOf(page).getByRole('alert')).toHaveText('Name the project to save it.')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(menuOf(page)).toBeVisible()
    expect(await storedProjects(page)).toHaveLength(0)
    await expect(page.locator('.toast-success.show')).toHaveCount(0)

    // Typing clears the refusal.
    await field.fill('Named now')
    await expect(menuOf(page).getByRole('alert')).toHaveCount(0)
    await expect(field).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('a signed-out visitor with an empty name meets the sign-in first, not a complaint about the name', async ({ page }) => {
    watch(page, 'visitor pressing Save with no name')
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('')
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await expect(menuOf(page).getByRole('alert')).toHaveCount(0)
  })
})

/* ── 2b · The palette shares the menu and the fixes ──────────────────────── */

test.describe('Save or share on the palette (same component)', () => {
  const PALETTE = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
  const paletteMenu = (page) => page.getByRole('dialog', { name: 'Save, share and export this palette' })

  // MUTATION: see the header ("PaletteBuilder.jsx doSave ... saveProject(name)").
  test('a visitor who signs in at the gate gets the palette saved once, with no reload', async ({ page }) => {
    watch(page, 'visitor signing in part-way through saving a palette')
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, PALETTE)
    await saveButton(page).click()
    await paletteMenu(page).getByLabel('Project name').fill('Late palette')
    await paletteMenu(page).getByRole('button', { name: 'Save', exact: true }).click()
    await logInAtTheGate(page)

    await expect(toastOf(page), 'the save that was waiting on the account never ran').toContainText('Project saved')
    await expect(page.getByTestId('palette-save-refusal')).toHaveCount(0)
    await expect(paletteMenu(page)).toHaveCount(0)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    const saved = await storedProjects(page)
    expect(saved, 'the hand-off saved other than exactly once').toHaveLength(1)
    expect(saved[0].name).toBe('Late palette')
    expect(saved[0].design.palette.colors.slice(0, 3)).toEqual(['#1F4B8E', '#2E7BB8', '#3FA9A0'])
  })

  // MUTATION: see the header ("PaletteBuilder.jsx doSave: drop the `if (!name)` line").
  test('an empty name on the palette is refused in words under the field, and nothing is saved', async ({ page }) => {
    watch(page, 'member saving a palette with no name')
    await signIn(page, { plan: 'free' })
    await go(page, PALETTE)
    await saveButton(page).click()
    const field = paletteMenu(page).getByLabel('Project name')
    await field.fill('')
    await paletteMenu(page).getByRole('button', { name: 'Save', exact: true }).click()

    await expect(paletteMenu(page).getByRole('alert')).toHaveText('Name the project to save it.')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(paletteMenu(page)).toBeVisible()
    expect(await storedProjects(page)).toHaveLength(0)

    await field.fill('Named now')
    await expect(paletteMenu(page).getByRole('alert')).toHaveCount(0)
  })

  test('the palette menu still opens, names a project and saves for a signed-in member', async ({ page }) => {
    watch(page, 'member saving a palette')
    await signIn(page, { plan: 'free' })
    await go(page, PALETTE)
    await saveButton(page).click()
    await paletteMenu(page).getByLabel('Project name').fill('Harbour palette')
    await page.keyboard.press('Enter')
    await expect(toastOf(page)).toContainText('Project saved')
    expect((await storedProjects(page)).map((p) => p.name)).toEqual(['Harbour palette'])
  })
})

/* ── 3 · Share and export rows ───────────────────────────────────────────── */

test.describe('share and export rows on the gradient', () => {
  // MUTATION: see the header ("copyLink ... name: 'x'").
  test('Copy link writes the share URL, and leaves gn off while the gradient has no name', async ({ page }) => {
    watch(page, 'designer copying a link to an unnamed gradient')
    await grantClipboard(page)
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy link to this gradient' }).click()

    await expect(toastOf(page)).toContainText('Link copied')
    const origin = new URL(page.url()).origin
    const link = await readClipboard(page)
    expect(link).toBe(`${origin}/create/gradient?gs=1F4B8E-0_3FA9A0-100&gt=linear&ga=135&gi=srgb`)
    expect(link).not.toContain('gn=')
    await expect(menuOf(page)).toHaveCount(0)
    await expect(saveButton(page)).toBeFocused()
  })

  test('Copy link works for a signed-out visitor (a link is not an export)', async ({ page }) => {
    watch(page, 'visitor copying a gradient link')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy link to this gradient' }).click()
    await expect(toastOf(page)).toContainText('Link copied')
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
    expect(await readClipboard(page)).toContain('gs=1F4B8E-0_3FA9A0-100')
  })

  test('Copy link says so when the browser refuses the clipboard', async ({ page }) => {
    watch(page, 'designer whose clipboard is blocked')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')), readText: () => Promise.resolve('') },
      })
    })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy link to this gradient' }).click()
    await expect(page.locator('.toast-error.show')).toContainText('Couldn’t copy the link')
    await expect(page.locator('.toast-success.show')).toHaveCount(0)
  })

  test('Copy CSS writes the declaration, as a free visitor needs no account', async ({ page }) => {
    watch(page, 'visitor copying CSS from Save or share')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy CSS', exact: true }).click()
    await expect(menuOf(page)).toHaveCount(0)
    await expect(page.locator('#ui-login-title')).toHaveCount(0)
    expect(await readClipboard(page)).toBe(CSS_SNIPPET)
  })

  test('Copy Tailwind class writes the arbitrary-value class', async ({ page }) => {
    watch(page, 'visitor copying a Tailwind class from Save or share')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy Tailwind class' }).click()
    await expect(menuOf(page)).toHaveCount(0)
    expect(await readClipboard(page)).toBe(TAILWIND_SNIPPET)
  })

  // MUTATION: see the header ("SaveShareMenu.jsx: remove aria-disabled").
  test('Download SVG is aria-disabled with its reason on a Conic gradient, and pressing it does nothing', async ({ page }) => {
    watch(page, 'visitor on a conic gradient looking at Download SVG')
    const downloads = []
    page.on('download', (d) => downloads.push(d))
    await go(page, HANDOFF_CONIC)
    await saveButton(page).click()
    const row = menuOf(page).getByRole('button', { name: /Download SVG/ })
    await expect(row).toHaveAttribute('aria-disabled', 'true')
    // The reason is text on the page and the row points at it, not a tooltip alone.
    const reasonId = await row.getAttribute('aria-describedby')
    expect(reasonId).toBeTruthy()
    await expect(page.locator(`#${reasonId}`)).toHaveText("SVG can't draw a conic gradient")
    await expect(row).toHaveAccessibleDescription("SVG can't draw a conic gradient")
    // Still reachable by keyboard: aria-disabled, not the disabled attribute.
    expect(await row.evaluate((el) => el.disabled), 'the disabled attribute would drop the row from the tab order').toBe(false)

    await row.click({ force: true }) // Playwright treats aria-disabled as unclickable; a real press still lands
    await expect(menuOf(page), 'a disabled row must not close the menu').toBeVisible()
    await expect(page.locator('#ui-login-title'), 'a disabled row must not ask for an account').toHaveCount(0)
    expect(downloads).toHaveLength(0)
  })

  test('Download SVG on a Linear gradient is not disabled and a signed-in member gets the file', async ({ page }) => {
    watch(page, 'member downloading a gradient as SVG')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    const row = menuOf(page).getByRole('button', { name: /Download SVG/ })
    await expect(row).not.toHaveAttribute('aria-disabled', 'true')
    const waiting = page.waitForEvent('download')
    await row.click()
    expect((await waiting).suggestedFilename()).toBe('uil4b-gradient.svg')
  })

  test('Download SVG asks a signed-out visitor for an account first and downloads nothing', async ({ page }) => {
    watch(page, 'visitor trying to download an SVG')
    const downloads = []
    page.on('download', (d) => downloads.push(d))
    await go(page, HANDOFF)
    await saveButton(page).click()
    const row = menuOf(page).getByRole('button', { name: /Download SVG/ })
    // Signed out, the row says up front that a file needs a free account.
    await expect(row).toContainText('Needs a free account')
    await row.click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await expect(page.getByRole('dialog', { name: /create your free account/i })).toContainText('download this gradient as an SVG')
    expect(downloads).toHaveLength(0)
  })

  test('there is no Submit for review anywhere on the page', async ({ page }) => {
    watch(page, 'designer looking for the old submit button')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await expect(saveButton(page)).toBeVisible()
    await expect(page.getByRole('button', { name: /submit/i })).toHaveCount(0)
    await saveButton(page).click()
    await expect(page.getByRole('button', { name: /submit/i })).toHaveCount(0)
    await expect(page.getByRole('menuitem', { name: /submit/i })).toHaveCount(0)
  })
})

/* ── 4 · The gallery's "Your submissions" ─────────────────────────────────── */

const LEGACY_KEY = 'vs-gradient-submissions'
const legacyEntry = {
  id: 'g-old-ocean',
  name: 'Old ocean',
  author: 'Freya Free',
  type: 'Linear',
  angle: 45,
  stops: [{ color: '#0B3C5D', position: 0 }, { color: '#328CC1', position: 100 }],
  status: 'pending',
  submittedAt: 1760000000000,
}
const seedLegacy = (page) => page.addInitScript(([key, entry]) => {
  localStorage.setItem(key, JSON.stringify([entry]))
}, [LEGACY_KEY, legacyEntry])
const queueDoc = (id, over) => ({
  [`community-submissions/${id}`]: {
    kind: 'gradient',
    name: 'Harbour fade',
    authorUid: 'test-uid-free',
    authorName: 'Freya Free',
    status: 'pending',
    payload: { type: 'Linear', angle: 90, stops: [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }] },
    createdAt: '2026-10-20T09:00:00.000Z',
    ...over,
  },
})
const submissionsOf = (page) => page.locator('section.grg-queue')

test.describe('gradient gallery · Your submissions', () => {
  // MUTATION: see the header ("GradientGallery.jsx ... legacy").
  test('signed out, gradients left in this browser get one note and a sign-in, not a list', async ({ page }) => {
    watch(page, 'visitor with gradients left from an earlier visit')
    await seedLegacy(page)
    await go(page, '/discover/gradients')

    const section = submissionsOf(page)
    await expect(section.getByRole('heading', { name: 'Your submissions' })).toBeVisible()
    await expect(section).toContainText('1 gradient from this browser is waiting. Sign in to keep it with your account.')
    await expect(section.getByRole('button', { name: 'Sign in' })).toBeVisible()
    // Not listed, and not in the browse grid either: they were never published.
    await expect(page.getByText('Old ocean')).toHaveCount(0)
    await expect(section.locator('.grg-queue-item')).toHaveCount(0)
    // Looking at the page never changes what the browser holds.
    const kept = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LEGACY_KEY)
    expect(kept).toEqual([legacyEntry])

    await section.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
  })

  test('signed out with nothing left in the browser, there is no Your submissions section', async ({ page }) => {
    watch(page, 'visitor with a clean browser')
    await go(page, '/discover/gradients')
    await expect(page.getByRole('heading', { name: /gradient/i }).first()).toBeVisible()
    await expect(submissionsOf(page)).toHaveCount(0)
    await expect(page.getByText(/from this browser (is|are) waiting/)).toHaveCount(0)
  })

  // MUTATION: see the header ("GradientGallery.jsx ... listMySubmissions").
  test('signed in, the list is the account’s own pending gradients, and Withdraw removes one', async ({ page }) => {
    watch(page, 'member checking their submitted gradients')
    await signIn(page, {
      plan: 'free',
      docs: {
        ...queueDoc('mine-1', {}),
        ...queueDoc('mine-2', { name: 'Dune glow', createdAt: '2026-10-21T09:00:00.000Z', payload: { type: 'Radial', angle: 0, stops: [{ color: '#C1440E', position: 0 }, { color: '#F2C078', position: 100 }] } }),
        ...queueDoc('not-mine', { name: 'Someone else’s', authorUid: 'test-uid-stranger', authorName: 'A Stranger' }),
        ...queueDoc('withdrawn-one', { name: 'Already withdrawn', status: 'withdrawn' }),
        ...queueDoc('a-palette', { name: 'A palette entry', kind: 'palette' }),
      },
    })
    await go(page, '/discover/gradients')

    const section = submissionsOf(page)
    await expect(section.getByRole('heading', { name: 'Your submissions' })).toBeVisible()
    await expect(section.locator('.grg-queue-item')).toHaveCount(2)
    await expect(section).toContainText('Harbour fade')
    await expect(section).toContainText('Dune glow')
    await expect(section).toContainText('Pending review')
    await expect(section).not.toContainText('Someone else’s')
    await expect(section).not.toContainText('Already withdrawn')
    await expect(section).not.toContainText('A palette entry')
    // Signed in, the legacy sign-in note does not show.
    await expect(page.getByText(/from this browser (is|are) waiting/)).toHaveCount(0)

    const harbour = section.locator('.grg-queue-item').filter({ hasText: 'Harbour fade' })
    await expect(harbour.getByRole('link', { name: 'Open' }))
      .toHaveAttribute('href', '/create/gradient?gs=1F4B8E-0_3FA9A0-100&gt=linear&ga=90&gn=Harbour%20fade&src=link')
    await harbour.getByRole('button', { name: 'Withdraw' }).click()
    await expect(toastOf(page)).toContainText('Submission withdrawn')
    await expect(section.locator('.grg-queue-item')).toHaveCount(1)
    await expect(section).not.toContainText('Harbour fade')
    await expect(section).toContainText('Dune glow')
  })

  test('signed in with gradients left in the browser, nothing moves until the member presses Keep', async ({ page }) => {
    watch(page, 'member whose old browser-held gradient is asked about')
    await seedLegacy(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/gradients')

    const ask = page.getByRole('group', { name: 'Gradients from this browser' })
    await expect(ask).toContainText('1 gradient from this browser is waiting. Keep it with this account?')
    // The question has its own heading; "Your submissions" is for what the account holds.
    await expect(page.getByRole('heading', { name: 'Left in this browser' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Your submissions' })).toHaveCount(0)
    // Asked, not moved: the account holds nothing yet and the browser still has it.
    await expect(submissionsOf(page).locator('.grg-queue-item')).toHaveCount(0)
    await expect(toastOf(page)).toHaveCount(0)
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LEGACY_KEY)).toEqual([legacyEntry])

    await ask.getByRole('button', { name: 'Keep' }).click()
    await expect(toastOf(page)).toContainText('Kept 1 gradient from this browser with your account')
    const section = submissionsOf(page)
    await expect(section.locator('.grg-queue-item')).toHaveCount(1)
    await expect(section).toContainText('Old ocean')
    await expect(section).toContainText('Pending review')
    await expect(ask).toHaveCount(0)
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), LEGACY_KEY)).toBeNull()
  })

  // MUTATION: useGradientSubmissionMigration.js drop `|| inFlight.has(user.uid)` AND the
  // button's `disabled={busy}`: the second press starts a second run.
  test('a double press on Keep keeps the gradient once and says so once', async ({ page }) => {
    watch(page, 'member double-pressing Keep')
    await seedLegacy(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/gradients')
    const ask = page.getByRole('group', { name: 'Gradients from this browser' })
    await ask.getByRole('button', { name: 'Keep' }).dblclick()
    await expect(toastOf(page)).toContainText('Kept 1 gradient from this browser with your account')
    await expect(submissionsOf(page).locator('.grg-queue-item')).toHaveCount(1)
    // A second run would end in "already with your account" and replace the toast.
    await page.waitForTimeout(600) // negative check: nothing further may happen, so there is nothing to wait for
    await expect(toastOf(page)).not.toContainText('already')
    await expect(submissionsOf(page).locator('.grg-queue-item')).toHaveCount(1)
  })

  test('"Not mine" moves nothing and puts the question away', async ({ page }) => {
    watch(page, 'member who does not own the browser-held gradient')
    await seedLegacy(page)
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/gradients')

    const ask = page.getByRole('group', { name: 'Gradients from this browser' })
    await ask.getByRole('button', { name: 'Not mine' }).click()
    await expect(ask).toHaveCount(0)
    await expect(submissionsOf(page).locator('.grg-queue-item')).toHaveCount(0)
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LEGACY_KEY), 'nothing may be removed').toEqual([legacyEntry])
  })

  // The gallery's "Make your own" call to action is for Pro viewers only, so it
  // is held in 57-palette-moods-and-gallery-cta.spec.js, which signs in as Pro.
})

/* ── 5 · The code well's Copy button ─────────────────────────────────────── */

test.describe('the code well Copy button', () => {
  const well = (page) => page.locator('.grd-code')
  const copyBtn = (page) => well(page).locator('.grd-copy')
  const tab = (page, name) => well(page).getByRole('tab', { name, exact: true })
  const widthOf = async (loc) => Math.round((await loc.boundingBox()).width * 100) / 100

  test('its label names the tab that is showing', async ({ page }) => {
    watch(page, 'designer switching code tabs')
    await go(page, HANDOFF)
    await expect(copyBtn(page)).toHaveAccessibleName('Copy CSS')
    await tab(page, 'Tailwind').click()
    await expect(copyBtn(page)).toHaveAccessibleName('Copy Tailwind')
    await tab(page, 'SVG').click()
    await expect(copyBtn(page)).toHaveAccessibleName('Copy SVG')
    await tab(page, 'CSS').click()
    await expect(copyBtn(page)).toHaveAccessibleName('Copy CSS')
  })

  // MUTATION: see the header ("copyCode ... setCopied(true)" and ".grd-copy-size").
  test('Copy writes the snippet on each tab, swaps to Copied, goes back, and never changes width', async ({ page }) => {
    watch(page, 'designer copying from the code well')
    await grantClipboard(page)
    await go(page, HANDOFF)
    const idleWidths = {}
    const expected = { CSS: CSS_SNIPPET, Tailwind: TAILWIND_SNIPPET }
    for (const name of ['CSS', 'Tailwind', 'SVG']) {
      await tab(page, name).click()
      await expect(copyBtn(page)).toHaveAccessibleName(`Copy ${name}`)
      idleWidths[name] = await widthOf(copyBtn(page))

      await copyBtn(page).click()
      await expect(copyBtn(page)).toHaveAccessibleName('Copied')
      await expect(copyBtn(page)).toHaveClass(/is-copied/)
      expect(await widthOf(copyBtn(page)), `${name}: the button moved when it said Copied`).toBe(idleWidths[name])

      const clip = await readClipboard(page)
      if (expected[name]) expect(clip).toBe(expected[name])
      else {
        expect(clip.startsWith('<svg')).toBe(true)
        expect(clip.trimEnd().endsWith('</svg>')).toBe(true)
        expect(clip).toContain('linearGradient')
        expect(clip).toContain('#1F4B8E')
        expect(clip).toContain('#3FA9A0')
      }
      // The swap is a beat, not a state: it goes back by itself.
      await expect(copyBtn(page)).toHaveAccessibleName(`Copy ${name}`)
    }
    // One width at every label, so the row never reflows as the tab changes.
    expect(new Set(Object.values(idleWidths)).size, `widths by tab: ${JSON.stringify(idleWidths)}`).toBe(1)
  })

  test('the Copied face never reaches a screen reader as a second button name', async ({ page }) => {
    watch(page, 'screen reader user in the code well')
    await go(page, HANDOFF)
    await expect(well(page).getByRole('button', { name: /^Copy/ })).toHaveCount(1)
    await expect(well(page).locator('.grd-copy-stack')).toHaveAttribute('aria-hidden', 'true')
  })

  test('a refused clipboard shows the error toast and does not claim it copied', async ({ page }) => {
    watch(page, 'designer whose clipboard is blocked')
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')), readText: () => Promise.resolve('') },
      })
    })
    await go(page, HANDOFF)
    await copyBtn(page).click()
    await expect(page.getByText(/Failed to copy|Copy failed/)).toBeVisible()
    await expect(copyBtn(page)).toHaveAccessibleName('Copy CSS')
    await expect(copyBtn(page)).not.toHaveClass(/is-copied/)
  })

  // MUTATION: see the header ("onCodeKeyDown").
  test('Ctrl+C with nothing selected copies the whole snippet', async ({ page }) => {
    watch(page, 'keyboard designer copying the snippet')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'))
    await well(page).locator('pre.grd-code-text').focus()
    await page.evaluate(() => window.getSelection().removeAllRanges())
    await page.keyboard.press('Control+c')

    await expect.poll(() => readClipboard(page)).toBe(CSS_SNIPPET)
    await expect(copyBtn(page)).toHaveAccessibleName('Copied')
  })

  test('Cmd+C (Meta) with nothing selected copies the whole snippet too', async ({ page }) => {
    watch(page, 'Mac designer copying the snippet')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await tab(page, 'Tailwind').click()
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'))
    await well(page).locator('pre.grd-code-text').focus()
    await page.evaluate(() => window.getSelection().removeAllRanges())
    await page.keyboard.press('Meta+c')
    await expect.poll(() => readClipboard(page)).toBe(TAILWIND_SNIPPET)
  })

  test('Ctrl+C with the Copy button focused copies the snippet as well', async ({ page }) => {
    watch(page, 'keyboard designer on the Copy button')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'))
    await copyBtn(page).focus()
    await page.keyboard.press('Control+c')
    await expect.poll(() => readClipboard(page)).toBe(CSS_SNIPPET)
  })

  test('Ctrl+C with a selection leaves the browser’s own copy alone', async ({ page }) => {
    watch(page, 'designer copying part of the snippet')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'))
    const pre = well(page).locator('pre.grd-code-text')
    await pre.focus()
    // Select the word "linear-gradient" inside the snippet.
    await page.evaluate(() => {
      const node = document.querySelector('.grd-code-text code').firstChild
      const text = node.textContent
      const start = text.indexOf('linear-gradient')
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, start + 'linear-gradient'.length)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    })
    expect(await page.evaluate(() => window.getSelection().toString())).toBe('linear-gradient')
    // Watch what the keydown ends up as: a handler that took the key would have
    // called preventDefault, which also stops the browser's own copy.
    await page.evaluate(() => {
      window.__ctrlC = []
      window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'c') window.__ctrlC.push(e.defaultPrevented) })
    })
    await page.keyboard.press('Control+c')

    expect(await page.evaluate(() => window.__ctrlC)).toEqual([false])
    await expect.poll(() => readClipboard(page), 'the browser copied the selection').toBe('linear-gradient')
    await expect(copyBtn(page), 'the code well must not claim it copied the snippet').toHaveAccessibleName('Copy CSS')
  })

  test('Ctrl+Shift+C and Ctrl+Alt+C are not the copy shortcut', async ({ page }) => {
    watch(page, 'designer pressing other chords')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'))
    await well(page).locator('pre.grd-code-text').focus()
    await page.evaluate(() => window.getSelection().removeAllRanges())
    await page.keyboard.press('Control+Shift+C')
    await page.keyboard.press('Control+Alt+c')
    await expect(copyBtn(page)).toHaveAccessibleName('Copy CSS')
    expect(await readClipboard(page)).toBe('sentinel')
  })

  test('Ctrl+C outside the code well is left alone', async ({ page }) => {
    watch(page, 'designer pressing Ctrl+C on the canvas')
    await grantClipboard(page)
    await go(page, HANDOFF)
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'))
    await saveButton(page).focus()
    await page.keyboard.press('Control+c')
    await expect(copyBtn(page)).toHaveAccessibleName('Copy CSS')
    expect(await readClipboard(page)).toBe('sentinel')
  })
})

/* ── 6 · The page does not change height ─────────────────────────────────── */

const SCREENS = [
  { w: 1440, h: 900, touch: false },
  { w: 390, h: 844, touch: true },
]

async function shapeOf(page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  return page.evaluate(() => {
    const h = (sel) => {
      const el = document.querySelector(sel)
      return el ? Math.round(el.getBoundingClientRect().height * 100) / 100 : null
    }
    return {
      page: document.documentElement.scrollHeight,
      panel: h('.tl-panel'),
      main: h('.tl-main'),
      code: h('.grd-code'),
    }
  })
}

for (const screen of SCREENS) {
  test.describe(`the page keeps its height at ${screen.w}px${screen.touch ? ' (touch)' : ''}`, () => {
    test.use({
      viewport: { width: screen.w, height: screen.h },
      hasTouch: screen.touch,
      isMobile: screen.touch,
    })

    // MUTATION: see the header (".grd-copy-size { display: none }" widens nothing but a
    // Copied face that is not held at the widest label moves the row).
    test('switching tabs, copying, opening the menu and its refusals change nothing (0px)', async ({ page }, testInfo) => {
      watch(page, `designer using Save or share and Copy at ${screen.w}px`)
      await grantClipboard(page)
      await signIn(page, { plan: 'free' })
      await go(page, HANDOFF)
      // The touch pass is only meaningful if the page really is coarse.
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(screen.touch)

      const first = await shapeOf(page)
      expect(first.page).toBeGreaterThan(0)
      const rows = []
      const mark = async (step) => rows.push({ step, ...(await shapeOf(page)) })

      for (const name of ['Tailwind', 'SVG', 'CSS']) {
        await page.locator('.grd-code').getByRole('tab', { name, exact: true }).click()
        await mark(`tab ${name}`)
      }
      await page.locator('.grd-copy').click()
      await expect(page.locator('.grd-copy')).toHaveAccessibleName('Copied')
      await mark('Copied showing')
      await expect(page.locator('.grd-copy')).toHaveAccessibleName('Copy CSS')
      await mark('Copied gone')

      await saveButton(page).click()
      await expect(menuOf(page)).toBeVisible()
      await mark('menu open')
      await menuOf(page).getByLabel('Project name').fill('')
      await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
      await expect(menuOf(page).getByRole('alert')).toBeVisible()
      await mark('name refused')
      await menuOf(page).getByLabel('Project name').fill('Height check')
      await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
      await expect(menuOf(page)).toHaveCount(0)
      await mark('saved and closed')

      // A viewport screenshot only: a fullPage capture switches pointer:coarse
      // off for the touch pass and would measure a different page.
      await testInfo.attach(`viewport-${screen.w}`, { body: await page.screenshot(), contentType: 'image/png' })

      const drift = []
      for (const r of rows) {
        for (const k of ['page', 'panel', 'main', 'code']) {
          if (r[k] !== first[k]) drift.push(`${r.step}: ${k} is ${r[k]}px, was ${first[k]}px`)
        }
      }
      expect(drift, drift.join('\n')).toEqual([])
    })

    test('a Conic gradient with the menu open does not move the page either', async ({ page }) => {
      watch(page, `designer on a conic gradient at ${screen.w}px`)
      await go(page, HANDOFF_CONIC)
      const first = await shapeOf(page)
      await saveButton(page).click()
      await expect(menuOf(page)).toBeVisible()
      expect(await shapeOf(page)).toEqual(first)
    })
  })
}

/* ── 7 · The menu's size on touch, and where it becomes a sheet ───────────── */

test.describe('Save or share menu geometry on the gradient', () => {
  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('the name field, Save and the rows are 44px tall on a coarse pointer', async ({ page }) => {
      watch(page, 'phone designer opening Save or share')
      await signIn(page, { plan: 'free' })
      await go(page, HANDOFF)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      await saveButton(page).click()
      const menu = menuOf(page)
      await expect(menu).toBeVisible()
      const heights = {}
      for (const [label, loc] of [
        ['name field', menu.getByLabel('Project name')],
        ['Save', menu.getByRole('button', { name: 'Save', exact: true })],
        ['Copy link', menu.getByRole('button', { name: 'Copy link to this gradient' })],
        ['Copy CSS', menu.getByRole('button', { name: 'Copy CSS', exact: true })],
      ]) heights[label] = Math.round((await loc.boundingBox()).height * 10) / 10
      for (const [label, h] of Object.entries(heights)) expect(h, `${label} is ${h}px tall`).toBeGreaterThanOrEqual(44)
      // The trigger is a touch target too.
      expect((await saveButton(page).boundingBox()).height).toBeGreaterThanOrEqual(44)
    })
  })

  for (const { width, sheet } of [{ width: 767, sheet: true }, { width: 768, sheet: false }]) {
    test(`${width}px: the menu is ${sheet ? 'a sheet on the bottom edge' : 'a popover, not a sheet'}`, async ({ page }) => {
      watch(page, `designer at ${width}px opening Save or share`)
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free' })
      await go(page, HANDOFF)
      await saveButton(page).click()
      await expect(menuOf(page)).toBeVisible()
      // The sheet slides up; measure it once it has landed, not in flight.
      await menuOf(page).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
      const box = await menuOf(page).boundingBox()
      if (sheet) {
        expect(Math.round(box.x), 'a sheet starts at the left edge').toBe(0)
        expect(Math.round(box.x + box.width), 'a sheet runs to the right edge').toBe(width)
        expect(Math.round(box.y + box.height), 'a sheet sits on the bottom edge').toBe(900)
      } else {
        expect(box.width, 'a popover is narrower than the screen').toBeLessThan(width - 24)
        expect(Math.round(box.y + box.height), 'a popover floats clear of the bottom edge').toBeLessThan(900)
      }
    })
  }
})

/* ── 8 · Fix round 2 ─────────────────────────────────────────────────────── */

// A free account sees the lock note and the Pro prompt on a library hand-off;
// a Pro one never does, so these run as a free member and as a signed-out visitor.
const LOCK_NOTE = '.grd-note'
const STOP_SWATCH = '.grd-stop-swatch'
const PRO_PROMPT = 'Editing gallery gradients is Pro'
const PALETTE_URL = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const paletteMenuOf = (page) => page.getByRole('dialog', { name: 'Save, share and export this palette' })

test.describe('copied links open editable, library hand-offs stay locked', () => {
  // MUTATION: GradientGenerator.jsx `setFromLibrary(!incoming.link)` -> `setFromLibrary(true)`
  //   -> "opening a copied link (src=link) gets an editable gradient" (the lock note comes back)
  for (const who of ['a free member', 'a signed-out visitor']) {
    test(`${who} opening a copied link (src=link) gets an editable gradient with no lock note`, async ({ page }) => {
      watch(page, `${who} opening a gradient link someone copied`)
      if (who === 'a free member') await signIn(page, { plan: 'free' })
      await go(page, `${HANDOFF}&src=link`)
      await expect(page.locator('.grd-canvas')).toBeVisible()
      await expect(page.locator(LOCK_NOTE)).toHaveCount(0)
      // Behaviour, not just the note: touching a stop does not raise the Pro prompt.
      await page.locator(STOP_SWATCH).first().click()
      await expect(page.getByText(PRO_PROMPT)).toHaveCount(0)
      // The hand-off keys are tidied out of the address bar, src included.
      await expect.poll(() => new URL(page.url()).search).toBe('')
    })

    test(`${who} opening a library hand-off (no src) still gets the lock note and the Pro prompt`, async ({ page }) => {
      watch(page, `${who} opening a gradient from the library`)
      if (who === 'a free member') await signIn(page, { plan: 'free' })
      await go(page, HANDOFF)
      await expect(page.locator(LOCK_NOTE)).toContainText('Gallery gradient')
      // A locked swatch is aria-disabled (Playwright will not click it) but still answers a press with the Pro prompt.
      await page.locator(STOP_SWATCH).first().click({ force: true })
      await expect(page.getByText(PRO_PROMPT)).toBeVisible()
    })
  }

  test('a src that is not "link" is a library hand-off and stays locked', async ({ page }) => {
    watch(page, 'visitor opening a hand-off with a src that is not link')
    await signIn(page, { plan: 'free' })
    await go(page, `${HANDOFF}&src=gallery`)
    await expect(page.locator(LOCK_NOTE)).toContainText('Gallery gradient')
  })

  // MUTATION: GradientGenerator.jsx copyLink `src: fromLibrary ? undefined : 'link'` -> `src: undefined`
  //   -> "a link copied from the person's own gradient carries src=link and opens editable"
  test('a link copied from the person’s own gradient carries src=link and opens editable', async ({ page }) => {
    watch(page, 'member copying a link to a gradient they made')
    await grantClipboard(page)
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await expect(page.locator(LOCK_NOTE)).toHaveCount(1)
    // Random starts an editable gradient of their own and lifts the lock.
    await page.getByRole('button', { name: /^Random/ }).first().click()
    await expect(page.locator(LOCK_NOTE)).toHaveCount(0)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy link to this gradient' }).click()
    await expect(toastOf(page)).toContainText('Link copied')
    const link = await readClipboard(page)
    expect(new URL(link).searchParams.get('src')).toBe('link')

    // Opening that link, as someone else would, is editable.
    await go(page, link)
    await expect(page.locator(LOCK_NOTE)).toHaveCount(0)
    await page.locator(STOP_SWATCH).first().click()
    await expect(page.getByText(PRO_PROMPT)).toHaveCount(0)
  })

  test('a link copied while the gradient is still the library’s carries no src', async ({ page }) => {
    watch(page, 'member copying a link to an unchanged library gradient')
    await grantClipboard(page)
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByRole('button', { name: 'Copy link to this gradient' }).click()
    await expect(toastOf(page)).toContainText('Link copied')
    expect(await readClipboard(page)).not.toContain('src=')
  })
})

test.describe('the legacy-gradients prompt does not move the editor', () => {
  // MUTATION: GradientGenerator.jsx: move the `.grd-keep` block back above `{editLocked && ...}`
  //   inside <ToolMain>. The canvas then drops by the prompt's height.
  for (const screen of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
    test(`at ${screen.w}px the canvas and code well stay put when the prompt mounts after the account answers`, async ({ page }) => {
      watch(page, `member with browser-held gradients at ${screen.w}px`)
      await page.setViewportSize({ width: screen.w, height: screen.h })
      await seedLegacy(page)
      await signIn(page, { plan: 'free', authDelay: 2500 })
      await go(page, HANDOFF)

      const top = (sel) => page.locator(sel).first().evaluate((el) => Math.round((el.getBoundingClientRect().top + scrollY) * 10) / 10)
      const SPOTS = ['.grd-canvas', '.grd-code', '.grd-stage']
      const before = {}
      for (const s of SPOTS) before[s] = await top(s)
      // POSITIVE CONTROL: this really is the window before the account is known.
      await expect(page.locator('.grd-keep')).toHaveCount(0)

      await expect(page.locator('.grd-keep')).toBeVisible({ timeout: 10000 })
      const after = {}
      for (const s of SPOTS) after[s] = await top(s)
      expect(after, 'something above the prompt moved when it mounted').toEqual(before)

      // It sits after the editor and before the presets, as its own strip.
      const keep = await page.locator('.grd-keep').boundingBox()
      const code = await page.locator('.grd-code').boundingBox()
      const presets = await page.locator('.grd-presets').boundingBox()
      expect(keep.y, 'below the code well').toBeGreaterThan(code.y + code.height - 1)
      expect(keep.y + keep.height, 'above the presets').toBeLessThanOrEqual(presets.y + 1)
      await expect(page.locator('.grd-keep').getByRole('group', { name: 'Gradients from this browser' })).toBeVisible()
    })
  }
})

test.describe('Save waits for the account', () => {
  const tools = [
    { tool: 'gradient', url: HANDOFF, dialog: menuOf },
    { tool: 'palette', url: PALETTE_URL, dialog: paletteMenuOf },
  ]
  for (const t of tools) {
    // MUTATION: SaveShareMenu.jsx remove `disabled={busy}` and the `if (busy) return`
    test(`on the ${t.tool}, Save is disabled and busy until the signed-in account answers, and a press before then does nothing`, async ({ page }) => {
      watch(page, `member pressing Save on the ${t.tool} before the account has answered`)
      await signIn(page, { plan: 'free', authDelay: 2500 })
      await go(page, t.url)
      await saveButton(page).click()
      const menu = t.dialog(page)
      const save = menu.getByRole('button', { name: 'Save', exact: true })
      await expect(save).toBeVisible()
      await expect(save, 'still checking the account').toBeDisabled()
      await expect(save).toHaveAttribute('aria-busy', 'true')

      // Enter in the field is the other way to press Save; it must not reach the
      // sign-in prompt a signed-in person would never have met.
      await menu.getByLabel('Project name').fill('Too early')
      await page.keyboard.press('Enter')
      await expect(page.locator('#ui-login-title')).toHaveCount(0)
      expect(await storedProjects(page)).toHaveLength(0)

      // The account answers: Save is live and saves without any sign-in.
      await expect(save).toBeEnabled({ timeout: 10000 })
      await expect(save).not.toHaveAttribute('aria-busy', /.*/)
      await save.click()
      await expect(toastOf(page)).toContainText('Project saved')
      await expect(page.locator('#ui-login-title')).toHaveCount(0)
      expect((await storedProjects(page)).map((p) => p.name)).toEqual(['Too early'])
    })
  }

  test('a visitor who is really signed out is not held: Save is enabled and goes to the sign-in', async ({ page }) => {
    watch(page, 'signed-out visitor pressing Save')
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, HANDOFF)
    await saveButton(page).click()
    const save = menuOf(page).getByRole('button', { name: 'Save', exact: true })
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
  })
})

test.describe('a repeat Save with an empty name', () => {
  // MUTATION: SaveShareMenu.jsx remove the `if (nameError) { inputRef...focus(); setPressed(...) }` block
  //   -> focus stays on the Save button, and the alert node is the same one
  for (const t of [
    { tool: 'gradient', url: HANDOFF, dialog: menuOf },
    { tool: 'palette', url: PALETTE_URL, dialog: paletteMenuOf },
  ]) {
    test(`on the ${t.tool}, pressing Save again returns focus to the field and announces the refusal again`, async ({ page }) => {
      watch(page, `member pressing Save twice with no name on the ${t.tool}`)
      await signIn(page, { plan: 'free' })
      await go(page, t.url)
      await saveButton(page).click()
      const menu = t.dialog(page)
      const field = menu.getByLabel('Project name')
      const save = menu.getByRole('button', { name: 'Save', exact: true })
      await field.fill('')
      await save.click()
      const alert = menu.getByRole('alert')
      await expect(alert).toHaveText('Name the project to save it.')
      await expect(field, 'the first refusal sends focus to the field').toBeFocused()

      // Keep a handle on this very alert: a screen reader reads a NEW one.
      const first = await alert.elementHandle()
      // The person moves on to the button again; the same refusal is already showing.
      await save.click()
      await expect(field, 'the repeat press sends focus back to the field').toBeFocused()
      await expect(alert).toHaveText('Name the project to save it.')
      expect(await first.evaluate((n) => n.isConnected), 'the old alert was replaced by a new one').toBe(false)
      expect(await storedProjects(page)).toHaveLength(0)

      // And again by keyboard: Enter in the field remounts it too.
      const second = await alert.elementHandle()
      await page.keyboard.press('Enter')
      await expect.poll(() => second.evaluate((n) => n.isConnected)).toBe(false)
      await expect(alert).toHaveCount(1)
    })
  }
})

test.describe('the save sheet on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  // MUTATION: save-share-menu.css remove both `box-shadow: 0 -8px 40px ...` lines in the sheet rules
  test('the bottom sheet casts its shadow upward', async ({ page }) => {
    watch(page, 'phone designer opening the Save sheet')
    await signIn(page, { plan: 'free' })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await expect(menuOf(page)).toBeVisible()
    await menuOf(page).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
    const shadow = await menuOf(page).evaluate((el) => getComputedStyle(el).boxShadow)
    // rgba(0, 0, 0, 0.28) 0px -8px 40px 0px: a negative y offset, so it falls above the sheet.
    expect(shadow).toMatch(/0px -8px 40px/)
  })
})

test.describe('the sign-up stash', () => {
  const stash = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('vs-pending-save') || 'null'))
  for (const t of [
    { tool: 'gradient', url: HANDOFF, dialog: menuOf },
    { tool: 'palette', url: PALETTE_URL, dialog: paletteMenuOf },
  ]) {
    // MUTATION: drop `clearPendingSave()` from the waiting-save effect (or from the cancelled-sign-in line).
    test(`on the ${t.tool}, the typed name is held while the sign-in is open and gone once it is saved or cancelled`, async ({ page }) => {
      watch(page, `visitor signing in part-way through saving a ${t.tool}`)
      await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
      await go(page, t.url)
      await saveButton(page).click()
      await t.dialog(page).getByLabel('Project name').fill('Held name')
      await t.dialog(page).getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.locator('#ui-login-title')).toBeVisible()
      expect(await stash(page), 'the name is stashed before the account is asked for').toMatchObject({ tool: t.tool, name: 'Held name' })

      // Cancelled: nothing may be left to reopen a menu the person walked away from.
      await page.keyboard.press('Escape')
      await expect(page.locator('#ui-login-title')).toHaveCount(0)
      expect(await stash(page), 'a cancelled sign-in drops it').toBeNull()

      // Signed in at the gate: the save runs, and the stash goes with it.
      await t.dialog(page).getByRole('button', { name: 'Save', exact: true }).click()
      await logInAtTheGate(page)
      await expect(toastOf(page)).toContainText('Project saved')
      expect(await stash(page), 'a save that ran leaves nothing to reopen').toBeNull()
    })
  }
})

test.describe('the sign-up stash when the save is refused', () => {
  // MUTATION: drop `clearPendingSave()` from the waiting-save effect in GradientGenerator.jsx. A refused
  // save keeps the menu open, so closeSave never runs and only the effect can drop the stash.
  test('a save refused at the free cap still leaves nothing stashed', async ({ page }) => {
    watch(page, 'visitor at the free cap signing in part-way through saving a gradient')
    await signIn(page, { plan: 'free', projects: 3, lateSignIn: true, returning: false })
    await go(page, HANDOFF)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('One too many')
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
    await logInAtTheGate(page)
    await expect(page.getByTestId('gradient-save-refusal')).toContainText('Free plan saves up to 3 projects')
    await expect(menuOf(page), 'the refusal keeps the menu open').toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('vs-pending-save'))).toBeNull()
  })
})
