// /login — the full-screen page, and the strip the chosen sign-in dialog shows.
//
// /login is a page of its own: one h1 in <main>, the form first and the wall of
// exports second in the document, no nav, no footer, no dialog. The same form
// opens in a dialog over every other page, and at 768 and up the dialog's
// "chosen" variant (a visitor asked to log in or sign up, no reason given)
// carries a still strip of the wall.
//
//   * structure: one h1, form before wall in the DOM, no nav, no footer, no dialog
//   * layout by width: split at 1024 and up (2 wall columns below 1280, 3 from
//     1280), a band below 1024 (120px at 390, 200px at 768)
//   * a phone: sign-up fits 390x844 without scrolling; log-in puts Google high
//   * reduced motion: nothing animates and there is no pause button
//   * motion: the drift runs, the pause button stops it and remembers
//   * a signed-in visitor leaves; the resume stash survives; the mode toggle and
//     the address stay in step
//   * the modal's strip is there at 768 and up and not below, and not on an
//     interruption
//
// Expected sizes are written out by hand from the layout rules (5/12 of 1440 is
// 600, and so on), never read back from the page. Each test carries the
// mutation that turns it red; each was applied to the source, built into a
// separate folder, watched go red, and restored.
import { test, expect } from './base.js'
import { go, watch, signIn, openChosenDialog } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const PAUSE_KEY = 'uil4b-auth-wall-paused'
const RESUME_KEY = 'vs-resume-after-onboarding'
const GATED = '/checkout/return?session_id=cs_test_resume' // behind RequireAuth, with a query to carry

/** A phone with real touch metrics, which is what makes pointer:coarse true. */
async function phone(browser, width = 390, height = 844, extra = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA, ...extra,
  })
  return { ctx, page: await ctx.newPage() }
}

const rect = (page, selector) => page.locator(selector).first().evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
})

/** Playing states of the wall's drift animations (not the one-off settle). */
const driftStates = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => /^auth-drift/.test(a.animationName || ''))
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
    expect(seen.h1s, 'exactly one h1, inside main').toEqual([{ text: 'Log in to UIL4B', inMain: true }])
    expect(seen.dialogs, 'the page is not a dialog').toBe(0)
  })

  // MUTATION: in src/pages/LoginPage.jsx move <AuthWall ... /> above the
  //   <section className="auth-page-form">. The order check goes red.
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
      const form = document.querySelector('.auth-page-form')
      const wall = document.querySelector('.aw')
      return {
        formBeforeWall: !!(form && wall && (form.compareDocumentPosition(wall) & Node.DOCUMENT_POSITION_FOLLOWING)),
        navs: document.querySelectorAll('nav').length,
        footers: document.querySelectorAll('footer').length,
        wallLabelled: wall?.getAttribute('aria-labelledby') && document.getElementById(wall.getAttribute('aria-labelledby'))?.textContent?.trim(),
      }
    })
    expect(seen.formBeforeWall, 'the wall comes before the form in the document').toBe(true)
    expect(seen.navs, 'the page carries a nav').toBe(0)
    expect(seen.footers, 'the page carries a footer').toBe(0)
    expect(seen.wallLabelled, 'the wall is a named region').toBe("Made with UIL4B's own tools")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Layout by width
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the /login layout follows the width', () => {
  // [viewport width, expected wall columns, expected form column width (±2)]
  //   1024: the 440px floor beats 5/12 x 1024 = 427
  //   1279: 2 columns, one pixel under the 3-column breakpoint; 5/12 x 1279 = 533
  //   1280: 3 columns
  //   1440: 5/12 x 1440 = 600
  const SPLITS = [[1024, 2, 440], [1279, 2, 533], [1280, 3, 533], [1440, 3, 600]]
  for (const [width, columns, formWidth] of SPLITS) {
    // MUTATION: in src/components/auth/AuthWall.jsx change
    //   useMediaQuery('(min-width:1280px)') to '(min-width:1500px)'. The 1280
    //   and 1440 cells go red. In src/styles/pages/auth-page.css change
    //   minmax(440px,5fr) to minmax(300px,4fr): the form widths go red.
    test(`at ${width} it is a split with ${columns} wall columns and a ${formWidth}px form column`, async ({ page }) => {
      watch(page, `visitor on a ${width}px screen`)
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/login')
      await expect(page.locator('.aw--page .aw-col').first()).toBeAttached()

      const m = await page.evaluate(() => {
        const cols = [...document.querySelectorAll('.aw--page .aw-col')]
        const form = document.querySelector('.auth-page-form').getBoundingClientRect()
        const wall = document.querySelector('.aw--page').getBoundingClientRect()
        return {
          columns: cols.length,
          lefts: new Set(cols.map((c) => Math.round(c.getBoundingClientRect().left))).size,
          formWidth: form.width,
          wallLeft: wall.left,
          bands: document.querySelectorAll('.aw--band').length,
        }
      })
      expect(m.bands, 'a split page also drew the band').toBe(0)
      expect(m.columns, `${width}: wall columns`).toBe(columns)
      expect(m.lefts, `${width}: the columns sit side by side`).toBe(columns)
      expect(Math.abs(m.formWidth - formWidth), `${width}: form column is ${m.formWidth}px, wanted ${formWidth}`).toBeLessThanOrEqual(2)
      expect(Math.abs(m.wallLeft - m.formWidth), 'the wall starts where the form column ends').toBeLessThanOrEqual(2)
    })
  }

  // Hand arithmetic: 1440 gives a form of 600 and a wall of 840; a tile is
  // (840 - 64 padding - 2 x 16 gaps) / 3 = 248. At 1024 the wall is 584 and a
  // tile is (584 - 64 - 16) / 2 = 252.
  // MUTATION: in auth-page.css change the .aw-cols gap:16px to gap:32px.
  for (const [width, tile] of [[1440, 248], [1024, 252]]) {
    test(`at ${width} a wall tile is ${tile}px wide`, async ({ page }) => {
      watch(page, `visitor on a ${width}px screen`)
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/login')
      const w = await page.locator('.aw--page .aw-tile').first().evaluate((el) => el.getBoundingClientRect().width)
      expect(Math.abs(w - tile), `a tile is ${w}px`).toBeLessThanOrEqual(2)
    })
  }

  // MUTATION: in auth-page.css change the @media(min-width:1680px) rule's
  //   minmax(440px,640px) to minmax(440px,900px).
  test('at 1920 the form column stays at 640px or less', async ({ page }) => {
    watch(page, 'visitor on a wide monitor')
    await page.setViewportSize({ width: 1920, height: 1000 })
    await go(page, '/login')
    await expect(page.locator('.aw--page .aw-col').first()).toBeAttached()
    const m = await rect(page, '.auth-page-form')
    expect(m.width, `the form column is ${m.width}px`).toBeLessThanOrEqual(641)
    expect(m.width, 'and not collapsed').toBeGreaterThanOrEqual(440)
    expect(await page.locator('.aw--page .aw-col').count(), '1920 keeps 3 columns').toBe(3)
  })

  // MUTATION: in auth-page.css change .aw--band{...height:120px} to 100px (390),
  //   and the 768 rule .aw--band{height:200px} to 180px.
  test('at 390 the band is 120px tall, above the form', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    watch(page, 'visitor on a phone')
    await go(page, '/login')
    await expect(page.locator('.aw--band')).toBeVisible()
    const band = await rect(page, '.aw--band')
    const form = await rect(page, '.auth-page-form')
    expect(Math.abs(band.height - 120), `the band is ${band.height}px`).toBeLessThanOrEqual(1)
    expect(band.width, 'full bleed').toBeGreaterThanOrEqual(389)
    expect(band.bottom, 'the band sits above the form').toBeLessThanOrEqual(form.top + 1)
    expect(await page.locator('.aw--page').count(), 'a phone also drew the split wall').toBe(0)
    await ctx.close()
  })

  test('at 768 the band is 200px tall and the form is centred at 400px', async ({ browser }) => {
    const { ctx, page } = await phone(browser, 768, 1024)
    watch(page, 'visitor on a tablet')
    await go(page, '/login')
    await expect(page.locator('.aw--band')).toBeVisible()
    const band = await rect(page, '.aw--band')
    const form = await rect(page, '.auth-page-form')
    expect(Math.abs(band.height - 200), `the band is ${band.height}px`).toBeLessThanOrEqual(1)
    expect(Math.abs(form.width - 400), `the form is ${form.width}px`).toBeLessThanOrEqual(1)
    expect(Math.abs((form.left + form.right) / 2 - 384), 'the form is centred').toBeLessThanOrEqual(1)
    await ctx.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A phone, heights
// ─────────────────────────────────────────────────────────────────────────────

test.describe('on a 390x844 phone', () => {
  // MUTATION: in auth-page.css delete the @media(max-width:767px) rule that
  //   makes the sign-up band 72px (or set its height to 200px). The page then
  //   scrolls and this goes red.
  test('sign-up does not scroll, and the submit and the legal line are on screen', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    watch(page, 'visitor on a phone creating an account')
    await go(page, '/login?signup=1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
    // POSITIVE CONTROL: this really is a touch device, so this is the phone
    // layout and not a narrow desktop.
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)

    const m = await page.evaluate(() => {
      const root = document.scrollingElement
      const bottom = (sel) => document.querySelector(sel)?.getBoundingClientRect().bottom
      window.scrollTo(0, 400)
      return {
        overflow: root.scrollHeight - window.innerHeight,
        scrolledTo: window.scrollY,
        submit: bottom('.auth-submit'),
        legal: bottom('.auth-legal'),
        band: document.querySelector('.aw--band').getBoundingClientRect().height,
        height: window.innerHeight,
      }
    })
    expect(m.submit, 'the submit button is not on the page').toBeGreaterThan(0)
    expect(m.legal, 'the legal line is not on the page').toBeGreaterThan(0)
    expect(m.submit, 'the submit button is below the fold').toBeLessThanOrEqual(m.height)
    expect(m.legal, 'the legal line is below the fold').toBeLessThanOrEqual(m.height)
    expect(m.overflow, `the page is ${m.overflow}px taller than the screen`).toBeLessThanOrEqual(0)
    expect(m.scrolledTo, 'the page scrolled when asked to').toBe(0)
    expect(Math.abs(m.band - 72), `the sign-up band is ${m.band}px`).toBeLessThanOrEqual(1)
    await ctx.close()
  })

  // MUTATION: as above, on the log-in side, change .aw--band height:120px to
  //   200px: Google's top moves past 310.
  test('log-in puts the top of the Google button at 310px or higher', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    watch(page, 'visitor on a phone logging in')
    await go(page, '/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UIL4B')
    const google = await rect(page, '.auth-google-btn')
    expect(google.top, `the Google button starts ${google.top}px down`).toBeLessThanOrEqual(310)
    expect(google.top, 'and it is on the page').toBeGreaterThan(150)
    expect(google.bottom, 'and is whole on screen').toBeLessThanOrEqual(844)
    await ctx.close()
  })

  // MUTATION: in LoginPage.jsx change `phone && mode === 'signup'` to `false`.
  //   Opening the sign-up form no longer swaps the band to its short, still form.
  test('switching to sign-up shortens the band to 72px and back to 120px on log-in', async ({ browser }) => {
    const { ctx, page } = await phone(browser)
    watch(page, 'visitor on a phone switching form')
    await go(page, '/login')
    expect(Math.abs((await rect(page, '.aw--band')).height - 120)).toBeLessThanOrEqual(1)
    await page.getByRole('button', { name: /Create one$/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your free account')
    await expect.poll(async () => Math.round((await rect(page, '.aw--band')).height)).toBe(72)
    // The sign-up band is a still strip: no pause button, nothing drifting.
    expect(await page.locator('.aw-pause').count(), 'a still band carries a pause button').toBe(0)
    expect(await driftStates(page), 'the sign-up band drifts').toEqual([])
    await page.getByRole('button', { name: /Log in$/ }).click()
    await expect.poll(async () => Math.round((await rect(page, '.aw--band')).height)).toBe(120)
    await ctx.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Motion
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the wall moves slowly and can be stopped', () => {
  // MUTATION: in AuthWall.jsx change `const animated = variant !== 'strip' && !reduced && !still`
  //   to `const animated = variant !== 'strip' && !still`. Reduced motion then
  //   gets a pause button and a drift.
  for (const [label, width] of [['desktop', 1440], ['phone', 390]]) {
    test(`with reduced motion nothing is animated and there is no pause button (${label})`, async ({ browser }) => {
      const make = width < 700
        ? () => phone(browser, width, 844, { reducedMotion: 'reduce' })
        : async () => { const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }); return { ctx, page: await ctx.newPage() } }
      const { ctx, page } = await make()
      watch(page, `visitor who asked for less motion, on ${label}`)
      await go(page, '/login')
      await expect(page.locator('main .auth-google-btn')).toBeVisible()
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        'the context lost its reduced-motion setting').toBe(true)
      // Let any entrance that was going to start have started.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

      const seen = await page.evaluate(() => ({
        running: document.getAnimations().map((a) => a.animationName || a.transitionProperty || 'unnamed'),
        pause: document.querySelectorAll('.aw-pause').length,
        copies: document.querySelectorAll('.aw-set--copy').length,
        motion: document.querySelector('.aw').getAttribute('data-motion'),
      }))
      expect(seen.running, 'something is still animating').toEqual([])
      expect(seen.pause, 'a pause button for a wall that does not move').toBe(0)
      expect(seen.copies, 'the second copy of the loop is rendered').toBe(0)
      expect(seen.motion).toBe('false')
      await ctx.close()
    })
  }

  // POSITIVE CONTROL for the above and the tests below: without the setting,
  // the same page does drift and does have the button.
  test('without it the wall drifts and the pause button is there', async ({ page }) => {
    watch(page, 'visitor on the log-in page')
    await go(page, '/login')
    await expect(page.locator('.aw')).toHaveAttribute('data-run', 'true')
    await expect.poll(() => driftStates(page)).toEqual(['running', 'running', 'running'])
    const btn = page.locator('.aw-pause')
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAccessibleName('Pause the moving wall')
    await expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  // MUTATION: in AuthWall.jsx change data-paused={paused ? 'true' : 'false'} to
  //   data-paused="false". Pressing the button stops nothing.
  test('pressing pause stops every column, and pressing again resumes them', async ({ page }) => {
    watch(page, 'visitor who finds the wall distracting')
    await go(page, '/login')
    await expect(page.locator('.aw')).toHaveAttribute('data-run', 'true')
    await expect.poll(() => driftStates(page), 'the drift never started').toEqual(['running', 'running', 'running'])

    const btn = page.locator('.aw-pause')
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.aw'), 'the wall did not take the paused state').toHaveAttribute('data-paused', 'true')
    await expect.poll(() => driftStates(page), 'the wall is marked paused but keeps moving').toEqual(['paused', 'paused', 'paused'])
    await expect(btn).toHaveAccessibleName('Play the moving wall')

    await btn.click()
    await expect.poll(() => driftStates(page)).toEqual(['running', 'running', 'running'])
    await expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  // MUTATION: in AuthWall.jsx delete the sessionStorage.setItem(WALL_PAUSED_KEY, '1')
  //   call in togglePause. The key is never written and a reload runs again.
  test('a pause is remembered for the session, and cleared by playing again', async ({ page }) => {
    watch(page, 'visitor who paused the wall and came back')
    await go(page, '/login')
    await expect(page.locator('.aw')).toHaveAttribute('data-run', 'true')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), PAUSE_KEY), 'it starts unpaused').toBeNull()

    await page.locator('.aw-pause').click()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), PAUSE_KEY)).toBe('1')

    await page.reload()
    await expect(page.locator('.aw-pause')).toBeVisible()
    await expect(page.locator('.aw-pause'), 'the pause did not survive a reload').toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), PAUSE_KEY)).toBe('1')

    await page.locator('.aw-pause').click()
    expect(await page.evaluate((k) => sessionStorage.getItem(k), PAUSE_KEY), 'playing again leaves the key behind').toBeNull()
  })

  // MUTATION: in auth-page.css delete `,.auth-page-form:focus-within ~ .aw .aw-track`
  //   from the paused-state selector list.
  test('the drift holds still while a form field has focus', async ({ page }) => {
    watch(page, 'visitor typing their email')
    await go(page, '/login')
    await expect(page.locator('.aw')).toHaveAttribute('data-run', 'true')
    await expect.poll(() => driftStates(page)).toEqual(['running', 'running', 'running'])

    await page.getByLabel('Email').focus()
    await expect.poll(() => driftStates(page)).toEqual(['paused', 'paused', 'paused'])
    await page.getByLabel('Email').blur()
    await expect.poll(() => driftStates(page)).toEqual(['running', 'running', 'running'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Leaving, resuming, and the mode toggle
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the /login page hands the visitor on', () => {
  // MUTATION: in LoginPage.jsx delete the effect that calls
  //   navigate(from, { replace: true }) once the user is set
  test('a signed-in visitor is sent away from /login', async ({ page }) => {
    watch(page, 'signed-in visitor opening an old log-in bookmark')
    await signIn(page, { plan: 'free' })
    await go(page, '/login')
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).not.toBe('/login')
    // Retries: the URL leaves /login before the page does (see the test below).
    await expect(page.getByRole('heading', { level: 1, name: 'Log in to UIL4B' }), 'the log-in form is still showing').toHaveCount(0)
  })

  // MUTATION: same effect as above. The page then sits on /login after sign-in.
  test('signing in on the page returns the visitor to the page they were turned away from', async ({ page }) => {
    watch(page, 'visitor sent to log in from a protected page')
    await signIn(page, { plan: 'free', lateSignIn: true })
    await go(page, GATED)
    await expect.poll(() => new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UIL4B')

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow())
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe('/checkout/return')
    // The URL changes before the page does: /checkout/return is a lazy route, and
    // until its chunk arrives the log-in form is still on screen. A one-shot
    // count() read it in that gap (13 of 15 runs at 8x CPU throttling), so wait
    // for the form to be gone.
    await expect(page.getByRole('heading', { level: 1, name: 'Log in to UIL4B' }), 'the log-in form is still showing').toHaveCount(0)
  })

  // MUTATION: in LoginPage.jsx delete `useEffect(() => { stashResumeTarget(from) }, [from])`.
  test('the page stashes where the visitor was headed for a new account to resume', async ({ page }) => {
    watch(page, 'visitor sent to log in from a protected page')
    await go(page, GATED)
    await expect.poll(() => new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UIL4B')
    expect(await page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY)).toBe(GATED)

    // A bare visit is not a destination, and clears an earlier one. (Arrive from
    // another page: loading the address the tab is already on keeps its history
    // state, and with it the old destination.)
    await go(page, '/plans')
    await go(page, '/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in to UIL4B')
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
    await expect(h1).toHaveText('Log in to UIL4B')
    expect(search()).toBe('')
    await expect.poll(() => page.title()).toBe('UI L4B | Log in')

    await page.getByRole('button', { name: /Create one$/ }).click()
    await expect(h1).toHaveText('Create your free account')
    await expect.poll(search).toBe('?signup=1')
    await expect.poll(() => page.title()).toBe('UI L4B | Create your free account')

    await page.getByRole('button', { name: /Log in$/ }).click()
    await expect(h1).toHaveText('Log in to UIL4B')
    await expect.poll(search).toBe('')
    await expect.poll(() => page.title()).toBe('UI L4B | Log in')

    // Reset is not a URL of its own: it leaves the address alone.
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
// The dialog's strip
// ─────────────────────────────────────────────────────────────────────────────

test.describe('the chosen sign-in dialog shows a still strip of the wall from 768 up', () => {
  // MUTATION: in LoginPopup.jsx change useMediaQuery('(min-width:768px)') to
  //   '(min-width:1100px)': the 768 cell goes red. Change it to '(min-width:300px)':
  //   the 767 and 390 cells go red.
  for (const [width, strip] of [[1280, true], [768, true], [767, false], [390, false]]) {
    test(`at ${width} the chosen dialog ${strip ? 'has' : 'has no'} strip`, async ({ browser }) => {
      const ctx = await browser.newContext(width < 700
        ? { viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS_UA }
        : { viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `visitor choosing to log in at ${width}`)
      await openChosenDialog(page, 'Log in')
      const dialog = page.getByRole('dialog', { name: /log in to uil4b/i })
      await expect(dialog).toBeVisible()
      // The dialog settles on its width after opening.
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity))

      if (!strip) {
        await expect(page.locator('.ui-login-strip')).toHaveCount(0)
        await expect(page.locator('.ui-login--strip')).toHaveCount(0)
      } else {
        const strips = page.locator('.ui-login-strip')
        await expect(strips).toHaveCount(1)
        // The wall loads as its own chunk; its box holds the space until then.
        await expect(page.locator('.ui-login-strip .aw-tile')).toHaveCount(5)
        await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().endTime === Infinity))
        const m = await page.evaluate(() => {
          const s = document.querySelector('.ui-login-strip')
          const pane = document.querySelector('.ui-login-pane')
          return {
            hidden: s.getAttribute('aria-hidden'),
            tiles: s.querySelectorAll('.aw-tile').length,
            pause: s.querySelectorAll('.aw-pause').length,
            copies: s.querySelectorAll('.aw-set--copy').length,
            moving: document.getAnimations().filter((a) => /^auth-drift/.test(a.animationName || '')).length,
            stripWidth: s.getBoundingClientRect().width,
            stripRight: s.getBoundingClientRect().right,
            paneLeft: pane.getBoundingClientRect().left,
          }
        })
        expect(m.hidden, 'the strip is decoration and is hidden from assistive tech').toBe('true')
        expect(m.tiles, 'the first five exports').toBe(5)
        expect(m.pause, 'a still strip carries a pause button').toBe(0)
        expect(m.copies, 'a still strip carries a second copy').toBe(0)
        expect(m.moving, 'the strip drifts').toBe(0)
        expect(Math.abs(m.stripWidth - 300), `the strip is ${m.stripWidth}px`).toBeLessThanOrEqual(2)
        expect(m.stripRight, 'the strip sits left of the form').toBeLessThanOrEqual(m.paneLeft + 1)
      }
      await ctx.close()
    })
  }

  // MUTATION: in LoginPopup.jsx change `useState(() => !reason && !passwordOnly)`
  //   to `useState(() => true)`. An interruption then gets the strip.
  test('an interruption stays plain: the thing they were doing is the reason', async ({ page }) => {
    watch(page, 'visitor interrupted at Save')
    await go(page, '/palette')
    await page.getByRole('button', { name: 'Save or share' }).click()
    await page.locator('.plb-savemenu').getByRole('button', { name: 'Save', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: /create your free account/i })
    await expect(dialog).toBeVisible()
    // POSITIVE CONTROL: it is the interruption, not a plain sign-up.
    await expect(dialog).toContainText('You were about to')
    await expect(page.locator('.ui-login-strip'), 'an interruption drew the wall').toHaveCount(0)
    await expect(page.locator('.ui-login--strip')).toHaveCount(0)
  })
})
