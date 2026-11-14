// THE OVERLAY SYSTEM, AS A PERSON USES IT.
//
// Thirteen journeys across the dialog, sheet, toast and palette parts: six at
// desktop width and seven at 390 (with one sweep at 320). Each is a sequence a
// person actually performs, and each asserts what they would notice: what has
// focus, what the screen says, whether a stray click loses their work, whether a
// phone target is big enough to hit.
//
// Seams: the project's own page (⋯ menu, then Delete…), the floating Feedback
// button (desktop) and the "Report a problem" link on the sign-in form (phone,
// where the floating button is hidden by design), the Report button on a
// community card, and the toast event (`uil4b:toast` with an Undo action).
// Nothing reaches a real endpoint: /api/support is intercepted.
//
// NOT CONVERTED: the two journeys about the Save popover (desktop 4, phone 5).
// That popover is a menu, and menus are their own surface; the sweep at 320
// still opens the confirm, the form, the report and the palette.
//
// MUTATIONS this file was seen to fail under (one each, restored after) are
// listed beside each test as `BREAK:`.
import { test, expect } from './base.js'
import { go, watch, signIn, openProjectFromDashboard, expectRendered } from './helpers.js'

const NAME = 'Seeded Project 1'

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

const confirmDialog = (page) => page.getByRole('dialog', { name: `Delete ${NAME}?` })
const nameField = (page) => page.getByRole('textbox', { name: new RegExp(`Type the project name to confirm deleting ${NAME}`, 'i') })
const toastEl = (page) => page.locator('.toast.show')

/** Open a project, its ⋯ menu, and the typed-name confirm. */
async function openConfirm(page) {
  await signIn(page, { plan: 'free', projects: 2 })
  await go(page, '/projects')
  await openProjectFromDashboard(page, NAME)
  await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
  const trigger = page.getByRole('button', { name: `Actions for ${NAME}` })
  await trigger.click()
  await expect(page.getByRole('menu', { name: `Actions for ${NAME}` })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Delete…', exact: true }).click()
  await expect(confirmDialog(page)).toBeVisible()
  return trigger
}

async function interceptSupport(page) {
  const seen = []
  await page.route('**/api/support', (route) => {
    seen.push(JSON.parse(route.request().postData() || '{}'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return seen
}

/** Raise a toast with an Undo, the way the app does. */
async function raiseUndoToast(page, message = 'Colour removed') {
  await page.evaluate((msg) => {
    window.__undone = 0
    window.dispatchEvent(new CustomEvent('uil4b:toast', {
      detail: { message: msg, type: 'success', action: { label: 'Undo', onAction: () => { window.__undone += 1 } } },
    }))
  }, message)
  await expect(toastEl(page)).toBeVisible()
}

const box = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom }
})

/** Wait for an element's entrance animation to finish, so its box is where it rests. */
const settled = (locator) => locator.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)).then(() => true))

const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// ── Shared journey bodies (desktop and phone differ only in width and in what
//    they additionally assert) ────────────────────────────────────────────────

/**
 * Open the feedback dialog the way each width reaches it. The floating
 * "Share feedback" button is hidden on a phone, so a phone opens it from the
 * "Report a problem" link on the sign-in form, which shows only where the
 * floating button is hidden. Returns the control that opened it.
 */
async function openFeedback(page, { phone }) {
  await go(page, '/community')
  if (!phone) {
    const opener = page.getByRole('button', { name: 'Share feedback' })
    await opener.click()
    return opener
  }
  await expect(page.getByRole('button', { name: 'Share feedback' }), 'the floating button is hidden on a phone').toBeHidden()
  await go(page, '/login')
  const opener = page.getByRole('button', { name: 'Report a problem' })
  await opener.tap()
  return opener
}

async function feedbackFormJourney(page, { phone = false } = {}) {
  const posts = await interceptSupport(page)
  const opener = await openFeedback(page, { phone })
  const dialog = page.getByRole('dialog', { name: /feedback/i })
  await expect(dialog).toBeVisible()

  // Submit is never disabled: an empty one explains itself, on the field.
  const submit = dialog.locator('.fb-submit')
  await expect(submit).toBeEnabled()
  // BREAK: `disabled={sending}` -> `disabled={sending || !message.trim()}` on the Submit in FeedbackModal.jsx
  await submit.click()
  // The label differs by type (the sign-in link seeds a bug report), the id does not.
  const message = dialog.locator('#fb-message')
  await expect(message).toHaveAttribute('aria-invalid', 'true')
  await expect(message).toHaveAttribute('aria-describedby', 'fb-message-error')
  await expect(dialog.locator('#fb-message-error')).toHaveText('Write a message first.')
  await expect(dialog.getByRole('alert').first()).toBeVisible()
  await expect(message).toBeFocused()
  expect(posts, 'an empty submit must not send').toEqual([])

  // Recover: typing clears the error, then it sends.
  await message.fill('The tint scale rounds the last step.')
  await expect(message).not.toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.locator('#fb-message-error')).toHaveCount(0)
  await submit.click()
  await expect.poll(() => posts.length).toBe(1)

  // Close, and focus goes back to the button that opened it.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
}

async function reportJourney(page) {
  const posts = await interceptSupport(page)
  await go(page, '/community')
  await expectRendered(page)
  await expect(page.locator('.ch-card').first()).toBeVisible({ timeout: 20000 })
  const name = (await page.locator('.ch-card .ch-card-name').first().textContent()).trim()
  const opener = page.getByRole('button', { name: `Report ${name}`, exact: true })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Report content' })
  await expect(dialog).toBeVisible()

  // Nothing is pre-chosen, and the box is empty.
  await expect(dialog.getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()

  await dialog.getByRole('button', { name: 'Send report' }).click()
  await expect(dialog.getByText('Choose why you are reporting this.')).toBeVisible()
  expect(posts).toEqual([])

  await dialog.getByRole('radio', { name: /^Spam or a scam/ }).check()
  await dialog.getByLabel(/^Your email/).fill('reporter@example.com')
  await dialog.getByRole('button', { name: 'Send report' }).click()
  await expect(dialog.getByText('Confirm the report is accurate before sending it.')).toBeVisible()
  await expect(dialog.getByRole('checkbox')).toBeFocused()

  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Send report' }).click()
  await expect.poll(() => posts.length).toBe(1)
  await expect(page.getByRole('dialog', { name: 'Report sent' })).toBeVisible()
  return { opener }
}

// ── Desktop, 1440 ───────────────────────────────────────────────────────────

test.describe('overlays at 1440', () => {
  test.use({ viewport: DESKTOP })

  test('1. delete a project: the name arms it, the verb and object are on the button, a toast follows', async ({ page }) => {
    watch(page, 'a designer deleting a project for good')
    const account = await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await openProjectFromDashboard(page, NAME)
    await page.getByRole('button', { name: `Actions for ${NAME}` }).click()
    await page.getByRole('menuitem', { name: 'Delete…', exact: true }).click()

    const dialog = confirmDialog(page)
    await expect(dialog, 'the title names the object').toBeVisible()
    const act = dialog.getByRole('button', { name: 'Permanently delete' })
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(act, 'refused until the name is typed').toBeDisabled()

    await nameField(page).fill('Seeded Project')
    await expect(act, 'a near miss does not arm it').toBeDisabled()
    await nameField(page).fill(NAME)
    await expect(act).toBeEnabled()
    // BREAK: `const armed = typed === name` -> `true` in ConfirmDialog.jsx
    await act.click()

    await expect(toastEl(page)).toContainText('Project deleted')
    await expect.poll(() => page.evaluate(
      (e) => (JSON.parse(localStorage.getItem('vs-projects') || '{}')[e] || []).some((p) => p.name === 'Seeded Project 1'),
      account.email,
    )).toBe(false)
  })

  test('2. delete confirm by keyboard: focus goes in, Tab stays inside, the scrim is ignored, Escape returns to the trigger', async ({ page }) => {
    watch(page, 'a keyboard user backing out of a delete')
    const trigger = await openConfirm(page)
    const dialog = confirmDialog(page)

    await expect(nameField(page), 'focus lands on the field').toBeFocused()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
      expect(inside, `Tab ${i + 1} left the dialog`).toBe(true)
    }

    await page.mouse.click(8, 8) // the scrim
    await expect(dialog, 'a stray click on the scrim must not close a confirm').toBeVisible()
    // BREAK: pass closeOnScrim to the Dialog in ConfirmDialog.jsx

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger, 'focus returns to the ⋯ that opened it').toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('2b. Enter that picks an input-method candidate does not confirm a delete; a real Enter does', async ({ page }) => {
    watch(page, 'someone typing a project name through an input method')
    await openConfirm(page)
    const dialog = confirmDialog(page)
    await nameField(page).fill(NAME)
    await expect(dialog.getByRole('button', { name: 'Permanently delete' })).toBeEnabled()

    // The key an input method sends to accept a candidate: Enter, flagged as composing.
    await nameField(page).evaluate((el) => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }))
    })
    await expect(dialog, 'a composing Enter must not delete the project').toBeVisible()
    await expect(toastEl(page)).toHaveCount(0)
    // BREAK: drop `&& !e.nativeEvent.isComposing` from the input's onKeyDown in ConfirmDialog.jsx

    await page.keyboard.press('Enter')
    await expect(toastEl(page), 'a plain Enter still confirms once the name is typed').toContainText('Project deleted')
  })

  test('2c. a confirm for something with no name never arms, by button or by Enter', async ({ page }) => {
    watch(page, 'someone deleting a project whose name is empty')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('vs-projects') || '{}')
      for (const email of Object.keys(all)) all[email] = all[email].map((p) => (p.id === 'seed-1' ? { ...p, name: '' } : p))
      localStorage.setItem('vs-projects', JSON.stringify(all))
    })
    await go(page, '/projects/seed-1')
    await page.getByRole('button', { name: /^Actions for\s*$/ }).click()
    await page.getByRole('menuitem', { name: 'Delete…', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: /^Delete\s*\?$/ })
    await expect(dialog).toBeVisible()
    const act = dialog.getByRole('button', { name: 'Permanently delete' })
    await expect(act, 'an empty field must not match an empty name').toBeDisabled()
    // BREAK: `const armed = !!name && typed === name` -> `const armed = typed === name` in ConfirmDialog.jsx

    await dialog.getByRole('textbox').press('Enter')
    await expect(dialog, 'Enter on an empty field must not delete').toBeVisible()
    await expect(toastEl(page)).toHaveCount(0)
  })

  test('3. the feedback form: an empty send explains itself, recovers, sends, and focus returns', async ({ page }) => {
    watch(page, 'a visitor sending feedback')
    await feedbackFormJourney(page)
  })

  test('5. report content: nothing pre-chosen, errors in order, sent, a confirmation dialog', async ({ page }) => {
    watch(page, 'a visitor reporting a design')
    await reportJourney(page)
  })

  test('6. a toast with Undo: a status region, no focus taken, Undo reached by Tab and run', async ({ page }) => {
    watch(page, 'a designer who removes something by mistake')
    await go(page, '/community')
    const before = await page.evaluate(() => document.activeElement?.tagName)
    await raiseUndoToast(page)

    await expect(toastEl(page)).toHaveAttribute('role', 'status')
    expect(await page.evaluate(() => document.activeElement?.tagName), 'a toast must not take focus').toBe(before)

    const undo = toastEl(page).getByRole('button', { name: 'Undo' })
    for (let i = 0; i < 150; i++) {
      if (await undo.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(undo, 'Undo must be reachable by Tab').toBeFocused()
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => window.__undone), 'Undo must run').toBe(1)
    // BREAK: drop the onAction call in Toast.jsx's action button
    await expect(toastEl(page)).toBeHidden()
  })

  test('palette: a search with no hit says so, offers Clear search, and Enter does nothing until you move', async ({ page }) => {
    watch(page, 'someone searching for a tool that is not there')
    await go(page, '/community')
    await page.keyboard.press('/')
    const palette = page.getByRole('dialog', { name: /Search/ })
    await expect(palette).toBeVisible()
    await expect(palette.getByText('Try', { exact: true })).toBeVisible()

    const input = palette.getByRole('combobox')
    await input.fill('qzxqzx')
    await expect(palette.getByRole('status')).toContainText('No results for "qzxqzx"')
    await expect(palette.getByRole('option').first(), 'every tool is still listed below').toBeVisible()
    await expect(palette.getByRole('option', { selected: true }), 'no row is armed after a miss').toHaveCount(0)

    const url = page.url()
    await page.keyboard.press('Enter')
    await expect(palette, 'Enter must not jump to an arbitrary tool').toBeVisible()
    expect(page.url()).toBe(url)

    await palette.getByRole('button', { name: 'Clear search' }).click()
    await expect(input).toHaveValue('')
    await expect(input, 'Clear search keeps focus in the field').toBeFocused()
    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden()
  })

  test('palette: a pointer that only rests over a row after a miss does not arm it; real movement does', async ({ page }) => {
    watch(page, 'someone whose mouse sits over the list while they type')
    await go(page, '/community')
    await page.keyboard.press('/')
    const palette = page.getByRole('dialog', { name: /Search/ })
    await expect(palette).toBeVisible()
    const input = palette.getByRole('combobox')
    await input.fill('qzxqzx')
    await expect(palette.getByRole('status')).toContainText('No results for "qzxqzx"')

    // A list that re-lays out under a resting pointer makes the browser send the
    // boundary event (mouseover) and no mousemove. That alone must not arm a row.
    const row = palette.getByRole('option').nth(2)
    await row.evaluate((el) => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    await expect(palette.getByRole('option', { selected: true }), 'a resting pointer must not arm a row').toHaveCount(0)
    const url = page.url()
    await page.keyboard.press('Enter')
    await expect(palette, 'Enter after a resting pointer chooses nothing').toBeVisible()
    expect(page.url()).toBe(url)
    // BREAK: change the row's `onMouseMove` back to `onMouseEnter` in CommandPalette.jsx

    await row.evaluate((el) => el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })))
    await expect(palette.getByRole('option', { selected: true }), 'real movement arms the row under the pointer').toHaveCount(1)
    await expect(row).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expect(palette, 'Enter now chooses the row the pointer is on').toBeHidden()
  })

  test('palette: the focused input shows no halo or border of its own, and the Esc chip is 12px', async ({ page }) => {
    watch(page, 'someone opening search')
    await go(page, '/community')
    await page.keyboard.press('/')
    const palette = page.getByRole('dialog', { name: /Search/ })
    await expect(palette).toBeVisible()
    const input = palette.getByRole('combobox')
    await expect(input).toBeFocused()
    const s = await input.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { shadow: cs.boxShadow, border: cs.borderTopColor, matches: el.matches(':focus') }
    })
    expect(s.matches, 'positive control: the input really is focused').toBe(true)
    expect(s.shadow, 'no global focus halo').toBe('none')
    expect(s.border, 'no accent border').toBe('rgba(0, 0, 0, 0)')
    // BREAK: delete the `:root .cp-panel .cp-input.cp-input:focus` rule in v3-palette.css

    const chip = await palette.locator('.cp-input-wrap .cp-kbd').evaluate((el) => getComputedStyle(el).fontSize)
    expect(chip).toBe('12px')
    // BREAK: set `.cp-input-wrap .cp-kbd` font-size back to 11px in v3-palette.css
  })

  test('a disabled Permanently delete is dimmed to 0.7, and armed it is not', async ({ page }) => {
    watch(page, 'someone looking at an unarmed delete')
    await openConfirm(page)
    const act = confirmDialog(page).getByRole('button', { name: 'Permanently delete' })
    await expect(act).toBeDisabled()
    await expect.poll(() => act.evaluate((el) => getComputedStyle(el).opacity), { message: 'dimmed while unarmed' }).toBe('0.7')
    // BREAK: change `.ov-act-danger:disabled` opacity from .7 back to .5 in v3-overlays.css
    await nameField(page).fill(NAME)
    await expect(act).toBeEnabled()
    await expect.poll(() => act.evaluate((el) => getComputedStyle(el).opacity), { message: 'full strength once armed' }).toBe('1')
  })
})

// ── Phone, 390 ──────────────────────────────────────────────────────────────

test.describe('overlays at 390', () => {
  test.use({ viewport: PHONE, hasTouch: true })

  test('1. delete confirm by tap: a sheet on the bottom edge, 44px buttons, the delete, a toast', async ({ page }) => {
    watch(page, 'a designer deleting a project on a phone')
    await openConfirm(page)
    const dialog = confirmDialog(page)

    await settled(dialog) // the sheet slides in over 240ms; measure it at rest
    const d = await box(dialog)
    const vh = await page.evaluate(() => window.innerHeight)
    expect(Math.abs(d.b - vh), `the sheet is ${vh - d.b}px off the bottom edge`).toBeLessThanOrEqual(1)

    const act = dialog.getByRole('button', { name: 'Permanently delete' })
    const cancel = dialog.getByRole('button', { name: 'Cancel' })
    for (const [label, b] of [['Permanently delete', await box(act)], ['Cancel', await box(cancel)]]) {
      expect(b.h, `${label} is ${b.h}px tall`).toBeGreaterThanOrEqual(44)
    }
    expect((await box(act)).y, 'the action sits above Cancel').toBeLessThan((await box(cancel)).y)

    await nameField(page).fill(NAME)
    await act.tap()
    await expect(toastEl(page)).toContainText('Project deleted')
    // BREAK: min-height 44 -> 36 on `.ov-dialog-foot .ui-pill` in v3-overlays.css
  })

  test('2. backing out: the backdrop is ignored by a confirm; Cancel and Escape close it', async ({ page }) => {
    watch(page, 'a phone user changing their mind')
    const trigger = await openConfirm(page)
    const dialog = confirmDialog(page)

    await page.touchscreen.tap(195, 40) // the backdrop above the sheet
    await expect(dialog, 'the backdrop must not close a confirm').toBeVisible()

    await dialog.getByRole('button', { name: 'Cancel' }).tap()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.tap()
    await page.getByRole('menuitem', { name: 'Delete…', exact: true }).tap()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('3. the feedback form as a sheet: an empty send explains itself, recovers, sends, focus returns', async ({ page }) => {
    watch(page, 'a phone visitor sending feedback')
    await feedbackFormJourney(page, { phone: true })
  })

  test('4. the report sheet: nothing pre-chosen, errors, send, and the sheet fits the width', async ({ page }) => {
    watch(page, 'a phone visitor reporting a design')
    await reportJourney(page)
    expect(await noSideways(page), 'the report sheet scrolls sideways').toBe(true)
  })

  test('6. at 320 no overlay scrolls sideways: confirm, feedback, report and palette', async ({ page }) => {
    watch(page, 'someone on the narrowest phone')
    await page.setViewportSize({ width: 320, height: 640 })

    // Feedback first: its phone entry is the sign-in form's link, which a signed-in visitor never sees.
    await openFeedback(page, { phone: true })
    await expect(page.getByRole('dialog', { name: /feedback/i })).toBeVisible()
    expect(await noSideways(page), 'the feedback sheet scrolls sideways at 320').toBe(true)
    await page.keyboard.press('Escape')

    await openConfirm(page)
    expect(await noSideways(page), 'the confirm scrolls sideways at 320').toBe(true)
    await page.keyboard.press('Escape')

    await go(page, '/community')
    await expect(page.locator('.ch-card').first()).toBeVisible({ timeout: 20000 })
    await page.locator('.ch-card .report-btn').first().tap()
    await expect(page.getByRole('dialog', { name: 'Report content' })).toBeVisible()
    expect(await noSideways(page), 'the report sheet scrolls sideways at 320').toBe(true)
    await page.keyboard.press('Escape')

    await go(page, '/community')
    await page.keyboard.press('/')
    const palette = page.getByRole('dialog', { name: /Search/ })
    await expect(palette).toBeVisible()
    expect(await noSideways(page), 'the palette scrolls sideways at 320').toBe(true)
    const close = palette.getByRole('button', { name: 'Close' }).first()
    const c = await box(close)
    expect(c.w, 'Close is under 44 wide').toBeGreaterThanOrEqual(44)
    expect(c.h, 'Close is under 44 tall').toBeGreaterThanOrEqual(44)
  })

  test('palette: the Try suggestions are 44px targets on a phone', async ({ page }) => {
    watch(page, 'a phone visitor opening search')
    await go(page, '/community')
    await page.keyboard.press('/')
    const palette = page.getByRole('dialog', { name: /Search/ })
    await expect(palette).toBeVisible()
    const chips = palette.locator('.cp-try-btn')
    expect(await chips.count(), 'positive control: there are suggestions to measure').toBeGreaterThan(0)
    const heights = await chips.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
    for (const h of heights) expect(h, `a suggestion is ${h}px tall`).toBeGreaterThanOrEqual(44)
    // BREAK: delete `:root .cp-try-btn { min-height: 44px; }` from the 767px block of v3-palette.css
  })

  test('7. a toast with Undo on a phone: 48px tall, inside the width, Undo runs by key', async ({ page }) => {
    watch(page, 'a phone user who removes something by mistake')
    await go(page, '/community')
    await raiseUndoToast(page)

    const t = await box(toastEl(page))
    expect(t.h, `the toast is ${t.h}px tall`).toBeGreaterThanOrEqual(48)
    expect(t.x, 'the toast starts off the left edge').toBeGreaterThanOrEqual(0)
    expect(t.x + t.w, 'the toast runs off the right edge').toBeLessThanOrEqual(390)

    const undo = toastEl(page).getByRole('button', { name: 'Undo' })
    for (let i = 0; i < 150; i++) {
      if (await undo.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(undo).toBeFocused()
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => window.__undone)).toBe(1)
  })
})
