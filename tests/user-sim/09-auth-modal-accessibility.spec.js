import { test, expect } from './base.js'
import { go, watch, openChosenDialog } from './helpers.js'

const PERSONA = 'keyboard account access'

test('login dialog focuses, traps keyboard navigation, labels fields and restores scroll', async ({ page }) => {
  watch(page, PERSONA)
  await openChosenDialog(page, 'Log in')

  const dialog = page.getByRole('dialog', { name: /log in to uil4b/i })
  await expect(dialog).toBeVisible()
  const google = dialog.getByRole('button', { name: /continue with google/i })
  await expect(google).toBeFocused()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByLabel('Password')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')

  const close = dialog.getByRole('button', { name: 'Close' })
  await close.focus()
  // Shift+Tab off the first control wraps to the LAST one, which is now the
  // "Not now" way out below the form; "Forgot password?" is the one before it.
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Not now' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: /forgot password/i })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Not now' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('')
})

test('dismissing an in-place auth prompt restores its persistent opener', async ({ page }) => {
  watch(page, PERSONA)
  await go(page, '/palette')

  // THE GATE MOVED OFF THE MENU ONTO SAVE, 2026-09-15. The menu also holds
  // Copy link, Copy CSS variables and Copy hex values, and copying is free
  // forever — gating the menu gated those too. What this test is about is
  // unchanged: dismissing an in-place prompt returns focus to the control that
  // raised it. That control is now the Save button inside the menu.
  const opener = page.getByRole('button', { name: 'Save or share' })
  await expect(opener).toBeVisible()
  await opener.click()
  const save = page.locator('.plb-savemenu').getByRole('button', { name: 'Save', exact: true })
  await expect(save, 'the save menu did not open').toBeVisible()
  await save.click()
  const dialog = page.getByRole('dialog', { name: /create your free account/i })
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

  // CREATE AN ACCOUNT, NOT "LOG IN TO CONTINUE". This gate only runs when
  // there is no uid, so everybody who reaches it has no account and was being
  // shown a form for one they have never made. Corrected 2026-09-18 with the
  // Type Scale save and the Gradient submit, which have the same shape. The
  // dialog's toggle still reads "Already have an account? Sign in".
  const dialog = page.getByRole('dialog', { name: /create your free account/i })
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
  // An app-header page (PillNav's "Menu"). /plans is the design's Pricing
  // screen, with the marketing nav, so it cannot serve here.
  await go(page, '/learn/help')

  const more = page.getByRole('button', { name: 'Menu', exact: true })
  await more.click()
  const menuLogin = page.locator('.pnav-pop-item').filter({ hasText: /^Log in$/ })
  await menuLogin.click()

  const dialog = page.getByRole('dialog', { name: /log in to uil4b/i })
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
  await openChosenDialog(page, 'Create a free account')

  const dialog = page.getByRole('dialog', { name: /create your free account/i })
  await expect(dialog).toBeVisible()
  // Every "Start for Free" control opens this popup with signup:true and NO
  // reason, so the pane used to be suppressed on the four highest-traffic paths
  // into the product: a bare three-field form and nothing saying what for.
  await expect(dialog).toContainText('Save palettes, type scales and gradients')
  // No default unlock list: the pane's height goes to the Terms/Privacy line.
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

    // Same move as above: the opener opens the menu, Save raises the gate.
    const opener = page.getByRole('button', { name: 'Save or share' })
    await opener.waitFor({ state: 'visible' })
    await opener.tap()
    const save = page.locator('.plb-savemenu').getByRole('button', { name: 'Save', exact: true })
    await expect(save, 'the save menu did not open').toBeVisible()
    await save.tap()

    const dialog = page.getByRole('dialog', { name: /create your free account/i })
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
    await dialog.getByRole('button', { name: 'Close' }).tap()
    await expect(dialog).toBeHidden()
    await openChosenDialog(page, 'Create a free account')
    const signup = page.getByRole('dialog', { name: /create your free account/i })
    await expect(signup).toBeVisible()
    await expect.poll(
      () => signup.evaluate(el => el.scrollHeight - el.clientHeight),
      'the tallest variant of this dialog must fit at 390px too',
    ).toBe(0)
  })

  test('the close control has a visible boundary without a hover', async ({ page }) => {
    watch(page, PERSONA)
    await openChosenDialog(page, 'Log in')

    const dialog = page.getByRole('dialog', { name: /log in to uil4b/i })
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
// THE TITLE'S LEVEL FOLLOWS WHAT IT SITS ON.
//
// /login is a page of its own, so its title is the document's one h1 and it
// lives in <main>. The same form inside the dialog is an h2, because the dialog
// opens over a page that already has an h1. Both halves are asserted here
// because fixing one by breaking the other is the easy mistake: promoting the
// dialog title would put a SECOND h1 on every page the popup opens over, and
// demoting the page title would leave /login with no h1 at all.
test.describe('the sign-in form titles itself for the context it appears in', () => {
  test('on /login it is the page h1, inside main, with no dialog', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/login')
    await page.waitForSelector('main #ui-login-title', { timeout: 10000 })

    const seen = await page.evaluate(() => ({
      h1s: [...document.querySelectorAll('h1')].map((h) => (h.textContent || '').trim()),
      titleTag: document.querySelector('#ui-login-title')?.tagName,
      titleInMain: !!document.querySelector('main #ui-login-title'),
      dialogs: document.querySelectorAll('[role="dialog"], [aria-modal="true"]').length,
      canSignIn: !!document.querySelector('main .auth-google-btn'),
    }))

    // POSITIVE CONTROL: a route that failed to render its form has no title
    // element and no sign-in control, and every assertion about headings below
    // would then be measuring an empty page.
    expect(seen.canSignIn, 'the sign-in control never rendered, so this test is '
      + 'measuring a page that did not draw its form').toBe(true)

    expect(seen.titleTag, 'the form title on /login is not an h1').toBe('H1')
    expect(seen.titleInMain, 'the h1 is not inside main').toBe(true)
    expect(seen.h1s, 'exactly one h1, and it is the form title').toEqual(['Log in to UIL4B'])
    expect(seen.dialogs, 'the page is not a dialog').toBe(0)
  })

  test('opened over a page it stays an h2, so that page keeps one h1', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/palette')
    await page.waitForTimeout(400)
    const before = await page.evaluate(() => document.querySelectorAll('h1').length)
    expect(before, '/create/palette should have its own single h1 before we start').toBe(1)

    const opened = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button, a')]
        .find((n) => /log in|sign in|start for free/i.test(n.textContent || ''))
      if (!el) return false
      el.click()
      return true
    })
    expect(opened, 'no control on /create/palette offered to open the sign-in dialog, '
      + 'so the assertion below would pass without the dialog ever appearing').toBe(true)
    await page.waitForSelector('#ui-login-title', { timeout: 10000 })

    const seen = await page.evaluate(() => ({
      h1Count: document.querySelectorAll('h1').length,
      titleTag: document.querySelector('#ui-login-title')?.tagName,
    }))
    expect(seen.titleTag, 'the dialog title is an h1 while open OVER a page. A dialog '
      + 'title is not a second page title; only the /login page carries an h1')
      .toBe('H2')
    expect(seen.h1Count, 'the page now has more than one h1 because the dialog promoted '
      + 'its own title').toBe(1)
  })
})
