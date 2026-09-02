import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'keyboard account access'

test('login dialog focuses, traps keyboard navigation, labels fields and restores scroll', async ({ page }) => {
  watch(page, PERSONA)
  await go(page, '/login')

  const dialog = page.getByRole('dialog', { name: /welcome back|log in to continue/i })
  await expect(dialog).toBeVisible()
  const google = dialog.getByRole('button', { name: /continue with google/i })
  await expect(google).toBeFocused()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByLabel('Password')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')

  const close = dialog.getByRole('button', { name: 'Close' })
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: /forgot password/i })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('dismissing an in-place auth prompt restores its persistent opener', async ({ page }) => {
  watch(page, PERSONA)
  await go(page, '/palette')

  const save = page.getByTitle('Save, share or export this palette')
  await expect(save).toBeVisible()
  await save.click()
  const dialog = page.getByRole('dialog', { name: /log in to continue/i })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(save).toBeFocused()
})

test('community submission entry points explain sign-in before showing a form', async ({ page }) => {
  watch(page, 'signed-out creator trying to contribute')
  await go(page, '/community')

  const submit = page.getByRole('button', { name: 'Submit design' })
  await submit.click()

  const dialog = page.getByRole('dialog', { name: /log in to continue/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Why we ask first')).toBeVisible()
  await expect(dialog).toContainText('credited to you')
  await expect(dialog).toContainText('reviewed before it appears')
  await expect(dialog).toContainText('withdraw anything')
  await expect(page.getByRole('dialog', { name: 'Submit a design' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(submit).toBeFocused()
})

/* The opener that is GONE by the time the dialog closes.
 *
 * The test above covers a persistent opener — the palette save button is still
 * on screen the whole time, so restoring focus to the exact node captured at
 * open time works. The nav is the other half, and it is the commonest way into
 * this dialog: PillNav's startLogin() calls closeAll() BEFORE openLogin(), so
 * the menu holding the button that was clicked is torn down on the way in.
 * .focus() on a detached node does nothing and reports nothing, which left a
 * keyboard user on <body> behind code that looked correct. */
test('closing the dialog restores focus even when its opener was in a menu that closed', async ({ page }) => {
  watch(page, PERSONA)
  await go(page, '/plans')

  const more = page.getByRole('button', { name: 'Menu', exact: true })
  await more.click()
  const menuLogin = page.locator('.pnav-pop-item').filter({ hasText: /^Log in$/ })
  await menuLogin.click()

  const dialog = page.getByRole('dialog', { name: /welcome back/i })
  await expect(dialog).toBeVisible()
  await expect(menuLogin, 'the opener really is gone — otherwise this proves nothing').toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await expect.poll(() => page.evaluate(() => {
    const a = document.activeElement
    if (!a || a === document.body) return 'body'
    return a.closest('nav') ? 'nav' : a.tagName.toLowerCase()
  }), 'focus must land on something still in the nav, not on <body>').toBe('nav')
})

test('a reason-less sign-up says what the account is for before asking for one', async ({ page }) => {
  watch(page, 'a first-time visitor clicking the primary call to action')
  await go(page, '/login?signup=1')

  const dialog = page.getByRole('dialog', { name: /create your free account/i })
  await expect(dialog).toBeVisible()
  // Every "Start for Free" control opens this popup with signup:true and NO
  // reason, so the pane used to be suppressed on the four highest-traffic paths
  // into the product: a bare three-field form and nothing saying what for.
  await expect(dialog).toContainText('What a free account gets you')
  await expect(dialog).toContainText('An account is where your saved work lives')
  await expect(dialog.locator('.ui-login-gets li')).toHaveCount(3)
})

/* Phone, with REAL device metrics. isMobile + hasTouch are what make
   hover:none and pointer:coarse true — a desktop Chromium narrowed to 390px
   still reports a fine pointer that hovers, so a touch assertion made in one
   would pass no matter what the stylesheet said. Same reasoning, and the same
   guard assertion, as 24-mobile-overhaul.spec.js. */
test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the reason pane names the action and leaves nothing below the fold', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/palette')

    const save = page.getByTitle('Save, share or export this palette')
    await save.waitFor({ state: 'visible' })
    await save.tap()

    const dialog = page.getByRole('dialog', { name: /log in to continue/i })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('You were about to')
    await expect(dialog).toContainText('save this palette')

    // The whole point of an interruption pane is that the way OUT of the
    // interruption is still reachable. The V1 stack of tinted cards pushed
    // "Continue with Google" ~300px down a dialog capped at 100dvh-32px.
    // scrollHeight/clientHeight are layout values, so this is not racing the
    // entrance transform.
    await expect.poll(
      () => dialog.evaluate(el => el.scrollHeight - el.clientHeight),
      'nothing in this dialog may sit below the fold at 390px',
    ).toBe(0)
    await expect(dialog.getByRole('button', { name: /continue with google/i })).toBeVisible()

    // And the TALL variant, which is the one that was actually over: the
    // sign-up form carries a name field on top of everything else, and 53px of
    // it — including 'Already have an account? Sign in' — sat below the fold
    // at 390x844 before the pane was reworked.
    await go(page, '/login?signup=1')
    const signup = page.getByRole('dialog', { name: /create your free account/i })
    await expect(signup).toBeVisible()
    await expect.poll(
      () => signup.evaluate(el => el.scrollHeight - el.clientHeight),
      'the tallest variant of this dialog must fit at 390px too',
    ).toBe(0)
  })

  test('the close control has a visible boundary without a hover', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/login')

    const dialog = page.getByRole('dialog', { name: /welcome back/i })
    await expect(dialog).toBeVisible()

    const caps = await page.evaluate(() => ({
      hover: matchMedia('(hover: hover)').matches,
      coarse: matchMedia('(pointer: coarse)').matches,
    }))
    expect(caps, 'device emulation lost — this test is meaningless without hover:none').toEqual({ hover: false, coarse: true })

    // A bare glyph on a transparent ground whose only affordance is
    // :hover{background} is invisible as a control on touch. Founder direction,
    // 2026-09-02: anything only discoverable on hover needs a persistent form.
    const close = dialog.getByRole('button', { name: 'Close' })
    const paint = await close.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { bg: cs.backgroundColor, border: cs.borderTopColor }
    })
    expect(paint.bg, 'the close button needs a ground of its own on touch').not.toBe('rgba(0, 0, 0, 0)')
    expect(paint.border, 'and a border that is actually drawn').not.toBe('rgba(0, 0, 0, 0)')
  })
})
