// A DIALOG OPENED OVER ANOTHER ANSWERS ESCAPE ALONE, AND NO DIALOG TAKES FOCUS BACK FROM A FIELD.
//
// useModalDialog is under every modal in the app (21 callers). Two faults lived in it:
//   1. its effect was keyed on onClose, so a caller passing an inline arrow re-ran it on every parent
//      render. A toast, a timer tick or a keystroke in a parent-owned field then re-took focus and
//      pulled the caret out of the field being typed in;
//   2. every open dialog listened for Escape on `document` in the capture phase, and stopPropagation
//      does not stop a second listener on the SAME node, so a dialog over a dialog closed both.
// The icon customiser's "Save to a project" picker is the dialog that was stacked with no hook at all:
// no focus move, no Tab trap, and Escape closed the customiser underneath it.
//
// What a person relies on, and what this file pins (expected values written out, not read from src):
//   (a) Icon library, customiser, "Save to a project": focus lands inside the picker, twelve Tabs stay
//       in it, Escape closes the picker and nothing else, focus is on Save, a second Escape closes the
//       customiser. At 1440 and at 390 on a touch phone.
//   (b) Signed out, the sign-in popup over the customiser: Escape closes the popup only.
//   (c) A dialog with a text field keeps focus, caret and text while the page re-renders around it (a
//       toast): the search palette, and the picker's "New project name" field.
//   (d) Palette Builder: the sign-in popup over the open Save menu. Escape closes the popup, the Builder's
//       own window-level Escape handler leaves the menu and the palette alone, a second Escape closes the menu.
//
// HOW TO SEE EACH FAIL (src/ unless named; each was mutated and watched go red):
//   hooks/useModalDialog.js deps back to [onClose, enabled, initialFocus]  -> (c) the picker's name field
//   hooks/useModalDialog.js drops the `openDialogs` top-of-stack check     -> (b) the prompt modal test
//   pages/IconLibrary.jsx drops the useModalDialog call for the picker     -> (a) "focus moves into the picker"
// WHAT IS NOT PINNED, and why: dropping IconLibrary's savePickerOpenRef early return stays green. The hook
// stops the key in the capture phase, before the panel's bubble-phase listener runs, so the guard is belt and
// braces today; no browser behaviour tells it from its absence. The search-palette test in (c) pins the caret,
// but the palette also names its own initialFocus, so a re-run lands on the same field: it cannot see fault 1.
// (b)'s customiser test cannot see the stack either, since the customiser is not a hook dialog; the prompt
// modal test is the one that has two hook listeners on the same node.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

const PERSONA = 'someone saving an icon and answering dialogs with the keyboard'
const SHOTS = '.claude/scratch/dialogs1'

const picker = (page) => page.locator('[aria-labelledby="icust-pick-title"]')
const login = (page) => page.locator('[aria-labelledby="ui-login-title"]')
const customiser = (page) => page.locator('.icust-panel')

/** Open the customiser on the grid's first icon and wait until Save is live. */
async function openCustomiser(page) {
  await go(page, '/create/icons')
  const cell = page.locator('.ig .ic').first()
  await expect(cell).toBeVisible({ timeout: 20_000 })
  await cell.click()
  await expect(customiser(page)).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-stage-host svg')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.icust-save')).toBeEnabled({ timeout: 20_000 })
}

/** Is the focused element inside the node? */
const focusInside = (locator) => locator.evaluate((el) => el.contains(document.activeElement))

/** Let the dialog's entrance animation finish, so a screenshot shows it at rest. */
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))

const toast = (page, message) => page.evaluate((m) => window.dispatchEvent(new CustomEvent('uil4b:toast', { detail: { message: m, type: 'info' } })), message)

for (const [width, ctx] of [
  [1440, { viewport: { width: 1440, height: 900 } }],
  [390, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
]) {
  test.describe(`at ${width}`, () => {
    test.use(ctx)

    test('(a) the save picker traps focus, and Escape closes only the picker', async ({ page }) => {
      watch(page, PERSONA)
      await signIn(page, { plan: 'free', projects: 2 })
      await openCustomiser(page)

      await page.locator('.icust-save').click()
      const dialog = picker(page)
      await expect(dialog, 'the picker opens').toBeVisible()
      await expect(dialog.locator('.icust-proj-btn').first(), 'the seeded projects are listed').toBeVisible()
      await expect.poll(() => focusInside(dialog), 'focus moves into the picker when it opens').toBe(true)
      await settled(page)
      await page.screenshot({ path: `${SHOTS}/picker-${width}.png` })

      for (let i = 1; i <= 12; i++) {
        await page.keyboard.press('Tab')
        expect(await focusInside(dialog), `Tab ${i} stays inside the picker`).toBe(true)
      }
      for (let i = 1; i <= 12; i++) {
        await page.keyboard.press('Shift+Tab')
        expect(await focusInside(dialog), `Shift+Tab ${i} stays inside the picker`).toBe(true)
      }

      await page.keyboard.press('Escape')
      await expect(dialog, 'the first Escape closes the picker').toHaveCount(0)
      await expect(customiser(page), 'and leaves the customiser open').toBeVisible()
      await expect(page.locator('.icust-save'), 'focus goes back to the button that opened the picker').toBeFocused()

      await page.keyboard.press('Escape')
      await expect(customiser(page), 'the second Escape closes the customiser').toHaveCount(0)
    })

    test('(a) Cancel closes the picker, returns focus to Save, and the picker opens again', async ({ page }) => {
      watch(page, PERSONA)
      await signIn(page, { plan: 'free', projects: 1 })
      await openCustomiser(page)

      await page.locator('.icust-save').click()
      await expect(picker(page)).toBeVisible()
      await picker(page).getByRole('button', { name: 'Cancel' }).click()
      await expect(picker(page)).toHaveCount(0)
      await expect(customiser(page), 'Cancel leaves the customiser open').toBeVisible()
      await expect(page.locator('.icust-save')).toBeFocused()

      // The picker can be opened again afterwards: the stack was emptied, not left holding a dead entry.
      await page.locator('.icust-save').click()
      await expect(picker(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(picker(page)).toHaveCount(0)
      await expect(customiser(page)).toBeVisible()
    })

    test('(b) signed out, Escape closes only the sign-in popup over the customiser', async ({ page }) => {
      watch(page, PERSONA)
      await openCustomiser(page)

      await page.locator('.icust-save').click()
      const popup = login(page)
      await expect(popup, 'Save asks a signed-out visitor to sign in').toBeVisible()
      await expect.poll(() => focusInside(popup), 'focus is in the popup').toBe(true)
      await settled(page)
      await page.screenshot({ path: `${SHOTS}/login-${width}.png` })

      await page.keyboard.press('Escape')
      await expect(popup, 'the first Escape closes the popup').toHaveCount(0)
      await expect(customiser(page), 'and the customiser is still there').toBeVisible()
      await expect(page.locator('.icust-save'), 'focus is back on Save').toBeFocused()

      await page.keyboard.press('Escape')
      await expect(customiser(page), 'the second Escape closes the customiser').toHaveCount(0)
    })
  })
}

test.describe('a sign-in popup over another hook dialog', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // The customiser is not a hook dialog, so (b) cannot tell the stack apart from a stopPropagation that
  // happens to work. A prompt's modal IS one, and Save in it raises the sign-in popup: two hook listeners
  // on the same node, which is the case the stack exists for.
  test('(b) signed out, Escape closes the sign-in popup and not the prompt modal under it', async ({ page }) => {
    watch(page, 'a visitor saving a community prompt')
    await go(page, '/discover/prompts')
    const card = page.getByRole('button', { name: /^Open prompt:/ }).first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    const modal = page.locator('[aria-labelledby="pl-modal-title"]')
    await expect(modal).toBeVisible()
    await modal.locator('.pl-save').click()
    const popup = login(page)
    await expect(popup, 'Save asks a signed-out visitor to sign in').toBeVisible()
    await expect(modal, 'the prompt is still open under the popup').toBeVisible()

    await page.keyboard.press('Escape')
    await expect(popup, 'the first Escape closes the popup').toHaveCount(0)
    await expect(modal, 'and the prompt modal is still there').toBeVisible()
    // Focus goes back to the Save it came from before the next key. The hook restores it a frame after the
    // popup closes; a person's second press is never inside that frame, so the test waits for it as they would.
    await expect(modal.locator('.pl-save'), 'focus is back on the Save in the prompt').toBeFocused()

    await page.keyboard.press('Escape')
    await expect(modal, 'the second Escape closes the prompt modal').toHaveCount(0)
    await expect(card, 'focus goes back to the card that opened it').toBeFocused()
  })
})

test.describe('a dialog with a text field keeps the caret while the page re-renders around it', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('(c) the search palette: typing, a toast, more typing', async ({ page }) => {
    watch(page, 'someone searching while the page announces something')
    await go(page, '/')
    // The palette opens on its shortcut key; its caller hands it an inline onClose.
    await page.keyboard.press('/')
    const dialog = page.getByRole('dialog', { name: /search/i })
    await expect(dialog).toBeVisible()
    const field = dialog.getByRole('combobox')
    await expect(field, 'focus starts in the search field').toBeFocused()

    await field.pressSequentially('palet')
    // The toast re-renders the app root, and with it the palette's parent.
    await toast(page, 'Copied: #123456')
    await expect(page.getByText('Copied: #123456').first()).toBeVisible()
    await expect(field, 'the toast did not take focus from the field').toBeFocused()
    // Narrowing the window across the nav's 899px breakpoint re-renders the nav, which owns the palette's
    // inline onClose: a toast alone does not always reach it.
    await page.setViewportSize({ width: 880, height: 900 })
    await expect(field, 'a window resize did not take focus from the field').toBeFocused()
    // Typing carries on from the caret, at the end of what was typed.
    await field.pressSequentially('te')
    await expect(field).toHaveValue('palette')

    // The caret is where it was left: a middle insert lands in the middle, not at the start or the end.
    await field.evaluate((el) => el.setSelectionRange(3, 3))
    await toast(page, 'Another notice')
    await expect(page.getByText('Another notice').first()).toBeVisible()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(field).toBeFocused()
    await page.keyboard.type('-')
    await expect(field, 'the caret stayed at position 3 across the re-render').toHaveValue('pal-ette')
  })

  test('(c) the picker\'s new-project name: each keystroke re-renders the owner and the text survives', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'free', projects: 1 })
    await openCustomiser(page)
    await page.locator('.icust-save').click()
    await expect(picker(page)).toBeVisible()
    await picker(page).getByRole('button', { name: /New project/ }).click()

    const field = picker(page).getByLabel('New project name')
    await expect(field).toBeFocused()
    // Typed one key at a time: the field is controlled by the customiser, which passes the hook a new
    // onClose on each of these renders.
    await field.pressSequentially('Brand kit', { delay: 20 })
    await expect(field).toHaveValue('Brand kit')
    await expect(field, 'typing did not lose focus').toBeFocused()

    await toast(page, 'Saved something else')
    await expect(page.getByText('Saved something else').first()).toBeVisible()
    await expect(field, 'a toast did not take focus').toBeFocused()
    await field.evaluate((el) => el.setSelectionRange(5, 5))
    await toast(page, 'And another')
    await page.keyboard.type('X')
    await expect(field, 'the caret stayed after "Brand"').toHaveValue('BrandX kit')
  })
})

test.describe('the Palette Builder under a dialog', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('(d) Escape on the sign-in popup leaves the open Save menu and the palette alone', async ({ page }) => {
    watch(page, 'a signed-out visitor saving a palette')
    await go(page, '/palette')
    const colours = () => page.locator('.plb-seedchip-hex').textContent()
    const before = await colours()

    await page.getByRole('button', { name: 'Save or share' }).click()
    const menu = page.locator('.plb-savemenu')
    await expect(menu, 'the save menu opens').toBeVisible()
    await menu.getByRole('button', { name: 'Save', exact: true }).click()
    const popup = login(page)
    await expect(popup).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(popup, 'the first Escape closes the popup').toHaveCount(0)
    // The Builder listens for Escape on window to close its menus and its preview. That listener must not
    // see an Escape a dialog already took.
    await expect(menu, 'and the Save menu underneath is still open').toBeVisible()
    expect(await colours(), 'the palette did not change').toBe(before)

    await page.keyboard.press('Escape')
    await expect(menu, 'the second Escape closes the menu').toHaveCount(0)
    expect(await colours(), 'the palette still did not change').toBe(before)
  })

  test('(d) Escape on the From image dialog closes it and nothing else', async ({ page }) => {
    watch(page, 'someone pulling colours from a photo')
    await go(page, '/palette')
    const before = await page.locator('.plb-seedchip-hex').textContent()

    await clickPaletteAction(page, 'Pull colours from an image', 'From image')
    const dialog = page.getByRole('dialog', { name: 'From image' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect(await page.locator('.plb-seedchip-hex').textContent(), 'the palette did not change').toBe(before)
  })
})
