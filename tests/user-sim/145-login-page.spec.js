// /login — the full-screen page, and the popup the chosen sign-in dialog opens.
//
// /login is a page of its own: one h1 in <main>, the form first and a wall of
// sample exports second in the document, a slim bar with the wordmark and a
// way back to the plans, and no site nav, footer or dialog. The same form opens
// in a dialog over every other page. The form is two steps: Google and the
// email, then the password after "Continue with email".
//
//   * structure: one h1, form before wall in the DOM, no nav, no footer, no dialog
//   * layout by width: a split with the wall from 1024, a centred column from
//     768, a short strip of the wall above the form below 768
//   * the wall is still decoration: hidden from assistive tech, labelled as
//     samples, nothing drifts and there is no pause button
//   * a phone: the Google button and Continue are on screen without scrolling
//   * a signed-in visitor leaves; the resume stash survives; the mode toggle and
//     the address stay in step
//   * the popup carries a picture pane from 768 up and not below, and its gate
//     follows what the visitor was doing
//
// Expected sizes are written out by hand from the layout rules (a 1fr 1fr split
// of 1440 is 720, and so on), never read back from the page. The mutation that
// turns each test red is named above it.
import { test, expect } from './base.js'
import { go, watch, signIn, openChosenDialog, continueWithEmail } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const RESUME_KEY = 'vs-resume-after-onboarding'
const GATED = '/checkout/return?session_id=cs_test_resume' // behind RequireAuth, with a query to carry

/** A phone with real touch metrics, which is what makes pointer:coarse true. */
async function phone(browser, width = 390, height = 844, extra = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA, ...extra,
  })
  return { ctx, page: await ctx.newPage() }
}

/** The box of the first match, or null when it is not drawn (display:none has no box). */
const box = (page, selector) => page.locator(selector).first().evaluate((el) => {
  if (!el.getClientRects().length) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
})

/** Playing states of any running CSS animation that is a slow drift (none should be). */
const driftStates = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => /drift/.test(a.animationName || ''))
  .map((a) => a.playState))

// ─────────────────────────────────────────────────────────────────────────────
// Structure
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the /login page is a page, not a dialog', () => {
  // MUTATION: in src/pages/LoginPage.jsx change headingLevel={1} to
  //   headingLevel={2}. The h1 count goes to 0.
  test('has exactly one h1, in main, and no dialog', async ({ page }) => {
    watch(page, 'visitor opening a bookmarked log-in address')
    await go(page, '/login')
    await expect(page.locator('main .auth-google-btn')).toBeVisible()

    const seen = await page.evaluate(() => ({
      h1s: [...document.querySelectorAll('h1')].map((h) => ({ text: (h.textContent || '').trim(), inMain: !!h.closest('main') })),
      dialogs: document.querySelectorAll('[role="dialog"], [aria-modal="true"]').length,
    }))
    expect(seen.h1s, 'exactly one h1, inside main').toEqual([{ text: 'Log in to UI L4B', inMain: true }])
    expect(seen.dialogs, 'the page is not a dialog').toBe(0)
  })

  // MUTATION: in src/pages/LoginPage.jsx move the <aside className="pf-wall"> above
  //   the <div className="pf-main">. The order check goes red.
  test('puts the form before the wall in the document, with no nav and no footer', async ({ page }) => {
    watch(page, 'screen reader user on the log-in page')

    // POSITIVE CONTROL: a page with the app shell does carry both landmarks, so
    // the zero counts below are about /login and not about the selectors.
    await go(page, '/learn/help')
    expect(await page.locator('nav').count(), 'the control page has no nav, so "no nav" proves nothing').toBeGreaterThan(0)
    expect(await page.locator('footer').count(), 'the control page has no footer, so "no footer" proves nothing').toBeGreaterThan(0)

    await go(page, '/login')
    await expect(page.locator('main .auth-google-btn')).toBeVisible()
    const seen = await page.evaluate(() => {
      const form = document.querySelector('main .pf-col')
      const wall = document.querySelector('aside.pf-wall')
      return {
        formBeforeWall: !!(form && wall && (form.compareDocumentPosition(wall) & Node.DOCUMENT_POSITION_FOLLOWING)),
        navs: document.querySelectorAll('nav').length,
        footers: document.querySelectorAll('footer').length,
        wallHidden: wall?.querySelector('[data-pro-wall]')?.getAttribute('aria-hidden'),
        wallLabel: wall?.querySelector('.pw-label')?.textContent?.trim(),
        back: (() => { const a = document.querySelector('header.pf-bar .pf-back'); return a && { text: a.textContent.trim(), href: a.getAttribute('href') } })(),
      }
    })
    expect(seen.formBeforeWall, 'the form comes before the wall in the document').toBe(true)
    expect(seen.navs, 'the page carries a nav').toBe(0)
    expect(seen.footers, 'the page carries a footer').toBe(0)
    expect(seen.wallHidden, 'the wall is decoration and is hidden from assistive tech').toBe('true')
    expect(seen.wallLabel, 'the wall says its exports are samples').toBe('Sample exports')
    expect(seen.back, 'the bar has a way back to the plans').toEqual({ text: 'Back to plans', href: '/plans' })
  })

  // MUTATION: in LoginPage.jsx point the .pf-back Link at "/" instead of "/plans".
  test('"Back to plans" leaves for /plans', async ({ page }) => {
    watch(page, 'visitor who came for a price and wants to go back')
    await go(page, '/login')
    await page.getByRole('link', { name: 'Back to plans' }).click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/plans')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Layout by width
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the /login layout follows the width', () => {
  // Below 1024 the wall is not drawn at all; from 1024 the page is two equal
  // halves (1fr 1fr) with the wall in the right one.
  // MUTATION: in v3-pro-auth.css change the wall's @media(min-width:1024px) to 1100px.
  //   The 1024 cell goes red. Change grid-template-columns:1fr 1fr to 2fr 1fr: all go red.
  for (const [width, half] of [[1024, 512], [1440, 720], [1920, 960]]) {
    test(`at ${width} the page is a split: the form half on the left, the wall half on the right`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `visitor at ${width}`)
      await go(page, '/login')
      await expect(page.locator('main .auth-google-btn')).toBeVisible()
      const wall = await box(page, 'aside.pf-wall')
      const col = await box(page, 'main .pf-col')
      expect(wall, 'the wall is not drawn').not.toBeNull()
      expect(Math.abs(wall.left - half), `the wall starts at ${wall.left}`).toBeLessThanOrEqual(1)
      expect(Math.abs(wall.width - half), `the wall is ${wall.width}px wide`).toBeLessThanOrEqual(1)
      expect(col.right, 'the form column is in the left half').toBeLessThanOrEqual(half + 1)
      expect(await box(page, '.pf-strip'), 'the strip is a phone thing').toBeNull()
      await ctx.close()
    })
  }

  // MUTATION: in v3-pro-auth.css delete `.pf-col{... max-width:360px`. The column grows to the half.
  test('the form column never grows past 360px, at 1440 or 1920', async ({ browser }) => {
    for (const width of [1440, 1920]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await go(page, '/login')
      await expect(page.locator('main .auth-google-btn')).toBeVisible()
      const col = await box(page, 'main .pf-col')
      expect(col.width, `at ${width} the column is ${col.width}px`).toBeLessThanOrEqual(360)
      expect(col.width, 'the column collapsed').toBeGreaterThan(300)
      await ctx.close()
    }
  })

  // MUTATION: in v3-pro-auth.css delete `.pf-strip{display:none}` from the 768 query: the strip shows at 768.
  test('at 768 there is one centred column, with neither the wall nor the strip', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } })
    const page = await ctx.newPage()
    watch(page, 'visitor on a tablet')
    await go(page, '/login')
    await expect(page.locator('main .auth-google-btn')).toBeVisible()
    expect(await box(page, 'aside.pf-wall'), 'the wall is drawn below 1024').toBeNull()
    expect(await box(page, '.pf-strip'), 'the strip is drawn at 768').toBeNull()
    const col = await box(page, 'main .pf-col')
    expect(Math.abs((col.left + col.right) / 2 - 384), 'the column is not centred').toBeLessThanOrEqual(1)
    expect(col.width).toBeLessThanOrEqual(360)
    await ctx.close()
  })

  // MUTATION: in v3-pro-auth.css change `.pf-strip{...height:88px` to 120px.
  test('at 390 an 88px strip of the wall sits above the form, under the bar', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    watch(page, 'visitor on a phone')
    await go(page, '/login')
    await expect(page.locator('main .auth-google-btn')).toBeVisible()
    const bar = await box(page, 'header.pf-bar')
    const strip = await box(page, '.pf-strip')
    const col = await box(page, 'main .pf-col')
    expect(strip, 'the strip is not drawn on a phone').not.toBeNull()
    expect(Math.abs(strip.height - 88), `the strip is ${strip.height}px tall`).toBeLessThanOrEqual(1)
    expect(strip.top, 'the strip sits under the bar').toBeGreaterThanOrEqual(bar.bottom - 1)
    expect(col.top, 'the form sits under the strip').toBeGreaterThanOrEqual(strip.bottom - 1)
    expect(await box(page, 'aside.pf-wall'), 'the full wall is drawn on a phone').toBeNull()
    await ctx.close()
  })
})

test.describe('on a 390x844 phone', () => {
  // MUTATION: in v3-pro-auth.css give `.pf-main` a padding-top of 400px. Continue is pushed off the screen.
  test('the Google button and Continue are on screen without scrolling, on log-in and on sign-up', async ({ browser }) => {
    for (const path of ['/login', '/login?signup=1']) {
      const { ctx, page } = await phone(browser)
      watch(page, `visitor on a phone opening ${path}`)
      await go(page, path)
      const google = page.locator('main .auth-google-btn')
      await expect(google).toBeVisible()
      const g = await box(page, 'main .auth-google-btn')
      const c = await box(page, 'main .auth-continue')
      expect(g.top, `${path}: the Google button starts at ${g.top}`).toBeLessThan(500)
      expect(c.bottom, `${path}: Continue ends at ${c.bottom} of 844`).toBeLessThanOrEqual(844)
      expect(await ctx.pages()[0].evaluate(() => document.scrollingElement.scrollHeight - innerHeight), `${path}: the page scrolls`).toBeLessThanOrEqual(1)
      await ctx.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The wall is still
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the wall of samples holds still', () => {
  // MUTATION: give .pw-col in auth.css or v3-pro-auth.css an `animation: auth-drift 40s linear infinite`.
  //   The drift count goes above 0.
  test('nothing drifts, there is no pause button, and the tiles are real pictures', async ({ page }) => {
    watch(page, 'visitor on a wide screen who dislikes motion')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/login')
    await expect(page.locator('aside.pf-wall .pw-tile').first()).toBeVisible()
    expect(await page.locator('aside.pf-wall .pw-tile').count(), 'the wall has tiles').toBeGreaterThanOrEqual(10)
    expect(await driftStates(page), 'a column drifts').toEqual([])
    await expect(page.locator('.aw-pause, aside.pf-wall button'), 'the still wall carries a control').toHaveCount(0)
    await expect(page.locator('aside.pf-wall [data-pro-wall]')).toHaveAttribute('aria-hidden', 'true')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Handing the visitor on
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the /login page hands the visitor on', () => {
  // MUTATION: in LoginPage.jsx delete the effect that calls
  //   navigate(from, { replace: true }) once the user is set, or change the
  //   fallback back to '/home' (the sales page)
  test('a signed-in visitor is sent away from /login to their workspace', async ({ page }) => {
    watch(page, 'signed-in visitor opening an old log-in bookmark')
    await signIn(page, { plan: 'free' })
    await go(page, '/login')
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/projects')
    // Retries: the URL leaves /login before the page does (see the test below).
    await expect(page.getByRole('heading', { level: 1, name: 'Log in to UI L4B' }), 'the log-in form is still showing').toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
  })

  // MUTATION: as above. Signing in on a bare /login then lands on /home.
  test('signing in on a bare /login lands in the workspace, not on the sales page', async ({ page }) => {
    watch(page, 'visitor who opened /login directly and signed in')
    await signIn(page, { plan: 'free', lateSignIn: true })
    await go(page, '/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow())
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/projects')
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspace' })).toBeVisible()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY), 'the workspace was stashed as a resume target').toBeNull()
  })

  // MUTATION: in LoginPage.jsx make `from` the bare '/projects' again, ignoring
  //   the account's record. An account that still owes onboarding then lands in the workspace.
  test('an account that still owes onboarding is sent there from a bare /login, not to the workspace', async ({ page }) => {
    watch(page, 'existing account that has not finished onboarding opening /login')
    await signIn(page, { plan: 'free', onboarded: false })
    await go(page, '/login')
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/onboarding')
    await expect(page.getByTestId('onboarding-first-win')).toBeVisible()
  })

  // MUTATION: same effect as above. The page then sits on /login after sign-in.
  test('signing in on the page returns the visitor to the page they were turned away from', async ({ page }) => {
    watch(page, 'visitor sent to log in from a protected page')
    await signIn(page, { plan: 'free', lateSignIn: true })
    await go(page, GATED)
    await expect.poll(() => new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow())
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/checkout/return')
    // The URL changes before the page does: /checkout/return is a lazy route, and
    // until its chunk arrives the log-in form is still on screen. A one-shot
    // count() read it in that gap (13 of 15 runs at 8x CPU throttling), so wait
    // for the form to be gone.
    await expect(page.getByRole('heading', { level: 1, name: 'Log in to UI L4B' }), 'the log-in form is still showing').toHaveCount(0)
  })

  // MUTATION: in LoginPage.jsx delete `useEffect(() => { stashResumeTarget(from) }, [from])`.
  test('the page stashes where the visitor was headed for a new account to resume', async ({ page }) => {
    watch(page, 'visitor sent to log in from a protected page')
    await go(page, GATED)
    await expect.poll(() => new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY)).toBe(GATED)

    // A bare visit is not a destination, and clears an earlier one. (Arrive from
    // another page: loading the address the tab is already on keeps its history
    // state, and with it the old destination.)
    await go(page, '/plans')
    await go(page, '/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UI L4B')
    expect(await page.evaluate((k) => sessionStorage.getItem(k)
      , RESUME_KEY), 'a bare /login left an old destination behind').toBeNull()
  })

  // MUTATION: in LoginPage.jsx delete the `navigate({ search: ... })` call in
  //   changeMode. The address stops following the form.
  test('the mode toggle keeps ?signup=1 and the title in step with the form', async ({ page }) => {
    watch(page, 'visitor switching between log in and sign up')
    await go(page, '/login')
    const search = () => new URL(page.url()).search
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveText('Log in to UI L4B')
    expect(search()).toBe('')
    await expect.poll(() => page.title()).toBe('UI L4B | Log in')

    await page.getByRole('button', { name: /Create one$/ }).click()
    await expect(h1).toHaveText('Create your free account')
    await expect.poll(search).toBe('?signup=1')
    await expect.poll(() => page.title()).toBe('UI L4B | Create your free account')

    await page.getByRole('button', { name: /Log in$/ }).click()
    await expect(h1).toHaveText('Log in to UI L4B')
    await expect.poll(search).toBe('')
    await expect.poll(() => page.title()).toBe('UI L4B | Log in')

    // Reset is not a URL of its own: it leaves the address alone. "Forgot password?" sits
    // on the password step, so go there first.
    await continueWithEmail(page)
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect.poll(search).toBe('')
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  test('a link with ?signup=1 opens on the sign-up form', async ({ page }) => {
    watch(page, 'visitor following a Start free link')
    await go(page, '/login?signup=1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
    await expect.poll(() => page.title()).toBe('UI L4B | Create your free account')
    expect(new URL(page.url()).search).toBe('?signup=1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The popup
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the sign-in popup carries a picture pane from 768 up', () => {
  // MUTATION: in v3-pro-auth.css delete the `.pp-left{display:none}` line in the
  //   max-width:767px block: the 767 and 390 cells go red. Hide .pp-left at every
  //   width: the 1280 and 768 cells go red.
  for (const [width, picture] of [[1280, true], [768, true], [767, false], [390, false]]) {
    test(`at ${width} the dialog ${picture ? 'has' : 'has no'} picture pane`, async ({ browser }) => {
      const ctx = await browser.newContext(width < 700
        ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
        : { viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `visitor choosing to log in at ${width}`)
      await openChosenDialog(page, 'Log in')
      const dialog = page.getByRole('dialog', { name: /log in to ui l4b/i })
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveClass(/\bpp\b/)
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      await expect(dialog.locator('.pp-offer .ui-login-x')).toBeVisible()
      // The old strip of the wall is gone at every width.
      await expect(page.locator('.ui-login-strip, .ui-login--strip')).toHaveCount(0)

      const left = dialog.locator('.pp-left')
      await expect(left).toHaveAttribute('aria-hidden', 'true')
      if (picture) {
        await expect(left).toBeVisible()
        const l = await box(page, '.pp-left')
        const o = await box(page, '.pp-offer')
        expect(l.right, 'the picture sits left of the form').toBeLessThanOrEqual(o.left + 1)
      } else {
        await expect(left).toBeHidden()
      }
      await ctx.close()
    })
  }

  // MUTATION: in LoginPopup.jsx stop passing the gate (data-gate={gate}) or infer
  //   'save' from the wrong reason. The attribute goes red.
  test('an interruption sets the gate from what they were doing, and still names the reason', async ({ page }) => {
    watch(page, 'visitor interrupted at Save')
    await go(page, '/palette')
    await page.getByRole('button', { name: 'Save or share' }).click()
    await page.locator('.plb-savemenu').getByRole('button', { name: 'Save', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: /create your free account/i })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('data-gate', 'save')
    // POSITIVE CONTROL: a plain "Log in" from the menu is not that gate.
    await expect(dialog).toContainText('You were about to')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await openChosenDialog(page, 'Log in')
    await expect(page.getByRole('dialog', { name: /log in to ui l4b/i })).not.toHaveAttribute('data-gate', 'save')
  })

  // MUTATION: in AuthForm.jsx show the password field on step 1. The count goes to 1.
  test('the popup opens on step 1: no password field until Continue', async ({ page }) => {
    watch(page, 'visitor logging in from the header')
    await openChosenDialog(page, 'Log in')
    const dialog = page.getByRole('dialog', { name: /log in to ui l4b/i })
    await expect(dialog).toHaveAttribute('data-step', '1')
    await expect(dialog.locator('#ui-login-password')).toHaveCount(0)
    await dialog.locator('#ui-login-email').fill('someone@example.test')
    await dialog.locator('.auth-continue').click()
    await expect(dialog).toHaveAttribute('data-step', '2')
    await expect(dialog.locator('#ui-login-password')).toBeVisible()
  })
})
