// The app header's account states, as a person meets them.
//
// What this pins, at 390 (touch, the phone sheet) and 1440 (the account popover):
//   · Sign out from the account menu keeps the menu open and says "Signing out…"
//     while it runs. When pending changes cannot be sent, an alert in the menu
//     offers Try again and Sign out anyway, and focus moves into it. When the
//     sign-out call itself fails, the alert offers Try again only.
//   · A cancelled account switch is told as a toast that names the account that
//     is still signed in.
//   · While the account loads for a browser whose last session was signed in, the
//     header holds an empty avatar-sized slot: no "Log in", no Upgrade, no plan
//     row until the plan is known, and the You tab waits (aria-disabled, dimmed).
//   · A browser with no session hint shows the signed-out controls at once and
//     nothing in the header moves when auth answers.
//   · Manage plan (Pro) and Upgrade to Pro (Free) are in the account surfaces,
//     and none of them links to /checkout.
//   · Offline, the sign-in rows are aria-disabled and described by an offline
//     note; the theme still switches.
//
// Sampling for "never appeared" is a MutationObserver started before the page's
// own script, so a state that lasts one commit is still seen.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SIZES = [
  { name: '390 touch', width: 390, height: 844, touch: true },
  { name: '1440', width: 1440, height: 900, touch: false },
]

const OTHER = { uid: 'other-uid', email: 'otto.other@uil4b.test', displayName: 'Otto Other', photoURL: '', providerIds: ['password'], provider: 'password' }

async function open(browser, size, persona) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await ctx.newPage()
  watch(page, `${persona} at ${size.name}`)
  return { ctx, page }
}

async function remember(page) {
  await page.addInitScript((acct) => {
    try {
      const list = JSON.parse(localStorage.getItem('vs-accounts') || '[]')
      if (!list.some((a) => a.uid === acct.uid)) localStorage.setItem('vs-accounts', JSON.stringify([...list, acct]))
    } catch { /* storage blocked */ }
  }, OTHER)
}

// Records, from before the app's script, whether these ever existed in the header.
async function watchHeader(page) {
  await page.addInitScript(() => {
    const seen = { login: false, upgrade: false, slot: false, planRow: false }
    window.__navSeen = seen
    const look = () => {
      const nav = document.querySelector('.pnav')
      const sheet = document.querySelector('.pnav-sheet')
      if (nav) {
        if (nav.querySelector('.pnav-login') || [...nav.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Log in')) seen.login = true
        if (nav.querySelector('.pnav-upgrade')) seen.upgrade = true
        if (nav.querySelector('.pnav-avatar-slot')) seen.slot = true
      }
      if (sheet && [...sheet.querySelectorAll('a')].some((a) => /^(Upgrade to Pro|Manage plan)$/.test(a.textContent.trim()))) seen.planRow = true
    }
    new MutationObserver(look).observe(document, { childList: true, subtree: true, attributes: true })
  })
}

const seen = (page) => page.evaluate(() => ({ ...window.__navSeen }))
const authAnswered = (page) => page.evaluate(() => window.__UIL4B_TEST_AUTH__?.answered === true)
const signedIn = (page) => page.evaluate(() => window.__UIL4B_TEST_AUTH__.signedIn)
const frames = (page) => page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
)
const inside = (scope) => scope.evaluate((el) => el.contains(document.activeElement))

// The account menu: the You tab's sheet on a phone, the avatar's popover on desktop.
async function openAccount(page, size) {
  if (size.touch) {
    await page.locator('.pnav-tab', { hasText: 'You' }).click()
    const scope = page.locator('#pnav-sheet-account')
    await expect(scope).toBeVisible()
    return scope
  }
  await page.getByRole('button', { name: 'Account and settings' }).click()
  const scope = page.locator('#pnav-account-pop')
  await expect(scope).toBeVisible()
  return scope
}

const NO_FLUSH = { deny: ['sync/'] }
// The sign-in dialog; the phone sheet is a dialog too.
const loginDialog = (page) => page.locator('[role="dialog"]:not(.pnav-sheet)')
const unsentAlert = (page) => page.locator('.pnav-signout-alert[role="alert"]')

for (const size of SIZES) {
  test.describe(`sign-out from the account menu at ${size.name}`, () => {
    test('shows Signing out… while it runs, keeps the menu open, then signs out', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a signed-in member signing out')
      await signIn(page, { projects: 1 })
      await go(page, '/discover')
      const menu = await openAccount(page, size)
      await page.evaluate(() => { window.__UIL4B_TEST_AUTH__.delays.signOut = 1500 })
      const row = menu.getByRole('button', { name: 'Sign out', exact: true })
      await row.click()
      const busy = menu.getByRole('button', { name: 'Signing out…' })
      await expect(busy).toHaveAttribute('aria-disabled', 'true')
      await expect(menu, 'the menu is still open while it runs').toBeVisible()
      expect(await signedIn(page), 'still signed in while the call is in flight').toBe(true)
      await expect.poll(() => signedIn(page)).toBe(false)
      await ctx.close()
    })

    test('unsent changes: the alert names them, the account stays signed in, focus moves into it', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member whose changes cannot be sent')
      await signIn(page, { projects: 1, ...NO_FLUSH })
      await go(page, '/discover')
      await expect(page.getByText(/Your account refused the sync/).first()).toBeVisible()
      const menu = await openAccount(page, size)
      await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
      const alert = unsentAlert(page)
      await expect(alert).toContainText(/haven.t reached your account/)
      await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible()
      await expect(alert.getByRole('button', { name: 'Sign out anyway' })).toBeVisible()
      expect(await signedIn(page), 'the person is still signed in').toBe(true)
      await expect(menu.locator('.pnav-pop-id-email')).toBeVisible()
      expect(await inside(menu), 'focus is inside the menu').toBe(true)
      expect(await inside(alert), 'focus is inside the alert').toBe(true)
      await ctx.close()
    })

    test('Try again asks again, and the alert comes back while the changes still cannot be sent', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member retrying a sign-out')
      await signIn(page, { projects: 1, ...NO_FLUSH })
      await go(page, '/discover')
      await expect(page.getByText(/Your account refused the sync/).first()).toBeVisible()
      const menu = await openAccount(page, size)
      await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
      const alert = unsentAlert(page)
      await expect(alert).toBeVisible()
      // The alert is replaced, not reused: tag this one, then look for an untagged one.
      await alert.evaluate((el) => { el.dataset.first = '1' })
      await alert.getByRole('button', { name: 'Try again' }).click()
      await expect(page.locator('.pnav-signout-alert:not([data-first])')).toBeVisible()
      expect(await inside(unsentAlert(page)), 'focus returns to the new alert').toBe(true)
      expect(await signedIn(page)).toBe(true)
      await ctx.close()
    })

    test('Sign out anyway signs out', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member signing out anyway')
      await signIn(page, { projects: 1, ...NO_FLUSH })
      await go(page, '/discover')
      await expect(page.getByText(/Your account refused the sync/).first()).toBeVisible()
      const menu = await openAccount(page, size)
      await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
      await unsentAlert(page).getByRole('button', { name: 'Sign out anyway' }).click()
      await expect.poll(() => signedIn(page)).toBe(false)
      await expect(unsentAlert(page)).toHaveCount(0)
      await ctx.close()
    })

    test('a sign-out call that fails: the alert says so with Try again only, and Try again signs out once it works', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member whose sign-out call fails')
      await signIn(page, { projects: 1, authFail: { signOut: 'auth/network-request-failed' } })
      await go(page, '/discover')
      const menu = await openAccount(page, size)
      await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
      const alert = unsentAlert(page)
      await expect(alert).toContainText(/Signing out didn.t finish/)
      await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible()
      await expect(alert.getByRole('button', { name: 'Sign out anyway' })).toHaveCount(0)
      expect(await signedIn(page), 'still signed in').toBe(true)
      expect(await inside(alert), 'focus is inside the alert').toBe(true)
      // The connection is back: the next attempt goes through.
      await page.evaluate(() => { window.__UIL4B_TEST_SESSION__.authFail = null })
      await alert.getByRole('button', { name: 'Try again' }).click()
      await expect.poll(() => signedIn(page)).toBe(false)
      await ctx.close()
    })
  })

  test.describe(`switching accounts at ${size.name}`, () => {
    test('cancelling the password dialog toasts and names the account still signed in', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member cancelling an account switch')
      await remember(page)
      const me = await signIn(page, { projects: 1 })
      await go(page, '/discover')
      const menu = await openAccount(page, size)
      await menu.getByRole('button', { name: /Switch to Otto Other/ }).click()
      const dialog = loginDialog(page)
      await expect(dialog.locator('input[type="email"]')).toHaveValue(OTHER.email)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      const toast = page.locator('.toast.show .toast-msg')
      await expect(toast).toContainText('Account switch cancelled')
      await expect(toast).toContainText(me.email)
      await expect(page.locator('.pnav-switch-status', { hasText: 'cancelled' }), 'not a line in a closed menu').toHaveCount(0)
      expect(await signedIn(page)).toBe(true)
      await ctx.close()
    })
  })

  test.describe(`the account loading at ${size.name}`, () => {
    test('a returning Pro member sees an empty avatar slot, no Log in and no Upgrade, and the slot becomes the avatar in place', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a returning Pro member while auth is pending')
      await watchHeader(page)
      await signIn(page, { plan: 'pro', authDelay: 4000 })
      await go(page, '/discover')
      const slot = page.locator('.pnav-avatar-slot')
      await expect(slot).toBeVisible()
      expect(await authAnswered(page), 'precondition: auth has not answered').toBe(false)
      await expect(slot).toHaveAttribute('aria-hidden', 'true')
      await expect(page.locator('.pnav-actions')).toHaveAttribute('aria-busy', 'true')
      await expect(page.locator('.pnav .pnav-login')).toHaveCount(0)
      await expect(page.locator('.pnav').getByRole('button', { name: 'Log in' })).toHaveCount(0)
      await expect(page.locator('.pnav-upgrade')).toHaveCount(0)
      await expect(page.locator('.pnav-more'), 'the signed-out menu button waits too').toHaveCount(0)
      const rect = (sel) => page.locator(sel).evaluate((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      })
      const before = await rect('.pnav-avatar-slot')

      await expect.poll(() => authAnswered(page)).toBe(true)
      await expect(page.locator('.pnav-avatar-btn')).toBeVisible()
      await frames(page)
      await expect(page.locator('.pnav-avatar-slot')).toHaveCount(0)
      await expect(page.locator('.pnav-actions')).not.toHaveAttribute('aria-busy', 'true')
      expect(await rect('.pnav-avatar-btn'), 'the avatar sits exactly where the slot was').toEqual(before)
      const s = await seen(page)
      expect(s.login, '"Log in" was never in the header').toBe(false)
      expect(s.upgrade, 'Upgrade was never in the header for a Pro member').toBe(false)
      await ctx.close()
    })

    test('a Pro member whose plan is still loading never sees Upgrade or a plan row', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a Pro member while the plan is held')
      await watchHeader(page)
      await signIn(page, { plan: 'pro', slowReads: [{ path: 'users/test-uid-pro', hold: true }] })
      await go(page, '/discover')
      await expect.poll(() => authAnswered(page)).toBe(true)
      await expect(page.locator('.pnav-avatar-btn')).toBeVisible()
      await frames(page)
      await expect(page.locator('.pnav-upgrade')).toHaveCount(0)
      const menu = await openAccount(page, size)
      await expect(menu.getByRole('link', { name: /^(Manage plan|Upgrade to Pro)$/ }), 'no plan row before the plan is known').toHaveCount(0)
      expect((await seen(page)).planRow || (await seen(page)).upgrade).toBe(false)

      await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
      await expect(menu.getByRole('link', { name: 'Manage plan' })).toBeVisible()
      await expect(page.locator('.pnav-upgrade')).toHaveCount(0)
      expect((await seen(page)).upgrade, 'Upgrade never appeared for a Pro member').toBe(false)
      await ctx.close()
    })

    test('a Free member whose plan is still loading gets Upgrade only once the plan is known', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a Free member while the plan is held')
      await watchHeader(page)
      await signIn(page, { plan: 'free', slowReads: [{ path: 'users/test-uid-free', hold: true }] })
      await go(page, '/discover')
      await expect.poll(() => authAnswered(page)).toBe(true)
      await expect(page.locator('.pnav-avatar-btn')).toBeVisible()
      await frames(page)
      expect((await seen(page)).upgrade, 'no Upgrade before the plan is known').toBe(false)
      await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
      await expect.poll(async () => (await seen(page)).upgrade).toBe(true)
      await ctx.close()
    })

    test('with no session hint the signed-out controls show at once and nothing moves when auth answers', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a first-time visitor while auth is pending')
      await watchHeader(page)
      await signIn(page, { returning: false, lateSignIn: true, authDelay: 4000 })
      await go(page, '/discover')
      const first = size.touch ? page.locator('.pnav-mobile') : page.locator('.pnav-login')
      await expect(first).toBeVisible()
      const measure = () => page.evaluate(() => ({
        answered: window.__UIL4B_TEST_AUTH__.answered,
        slot: document.querySelectorAll('.pnav-avatar-slot').length,
        busy: document.querySelector('.pnav-actions')?.hasAttribute('aria-busy'),
        boxes: [...document.querySelectorAll('.pnav-actions, .pnav-actions > *, .pnav-actions > * > *, .pnav-mobile')].map((el) => {
          const r = el.getBoundingClientRect()
          return `${el.className}|${r.x}|${r.y}|${r.width}|${r.height}`
        }),
      }))
      const before = await measure()
      expect(before.answered, 'precondition: auth has not answered yet').toBe(false)
      expect(before.slot).toBe(0)
      expect(before.busy).toBe(false)
      expect(before.boxes.length).toBeGreaterThan(4)

      await expect.poll(() => authAnswered(page), { timeout: 10000 }).toBe(true)
      await frames(page)
      const after = await measure()
      expect(after.boxes, 'every header control keeps its box').toEqual(before.boxes)
      expect((await seen(page)).slot, 'no placeholder slot was ever drawn').toBe(false)
      await ctx.close()
    })
  })

  test.describe(`plan rows at ${size.name}`, () => {
    for (const [plan, label, href] of [['pro', 'Manage plan', '/settings'], ['free', 'Upgrade to Pro', '/plans']]) {
      test(`${plan}: the account menu has "${label}" to ${href} and no link goes to checkout`, async ({ browser }) => {
        const { ctx, page } = await open(browser, size, `a ${plan} member reading the plan row`)
        await signIn(page, { plan })
        await go(page, '/discover')
        const menu = await openAccount(page, size)
        const row = menu.getByRole('link', { name: label, exact: true })
        await expect(row).toBeVisible()
        await expect(row).toHaveAttribute('href', href)
        expect(await page.locator('.pnav a[href*="/checkout"], .pnav-sheet a[href*="/checkout"], #pnav-account-pop a[href*="/checkout"]').count()).toBe(0)
        await ctx.close()
      })
    }
  })

  test.describe(`the waiting You tab at ${size.name}`, () => {
    test('is aria-disabled and dimmed while auth loads, does nothing when pressed, and works once it answers', async ({ browser }) => {
      test.skip(!size.touch, 'the tab bar is the phone layout')
      const { ctx, page } = await open(browser, size, 'a returning member pressing You early')
      await signIn(page, { plan: 'pro', authDelay: 4000 })
      await go(page, '/discover')
      const you = page.locator('.pnav-tab', { hasText: 'You' })
      await expect(you).toHaveAttribute('aria-disabled', 'true')
      expect(await authAnswered(page), 'precondition: auth has not answered').toBe(false)
      expect(await you.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.55')
      await you.click({ force: true })
      await expect(page.locator('.pnav-sheet'), 'pressing the waiting tab opens nothing').toHaveCount(0)
      // The sheet opened by the menu button has no account group yet either.
      await page.locator('.pnav-mobile').click()
      await expect(page.locator('.pnav-sheet')).toBeVisible()
      await expect(page.locator('#pnav-sheet-account')).toHaveCount(0)
      await expect(page.locator('.pnav-sheet-cta')).toHaveCount(0)
      await expect(page.locator('.pnav-sheet').getByRole('button', { name: 'Log in' })).toHaveCount(0)
      await page.locator('.pnav-mobile').click()

      await expect.poll(() => authAnswered(page)).toBe(true)
      await expect(you).not.toHaveAttribute('aria-disabled', 'true')
      expect(await you.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      await ctx.close()
    })
  })

  test.describe(`offline at ${size.name}`, () => {
    async function goOffline(page, context) {
      // navigator.onLine is pinned first (see 07-public-shell-library-palette), then the network drops.
      await page.evaluate(() => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
      })
      await context.setOffline(true)
      await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    }

    test('signed in: Add account and Switch are aria-disabled with an offline note, and the theme still switches', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member who is offline')
      await remember(page)
      await signIn(page, { projects: 1 })
      await go(page, '/discover')
      await goOffline(page, ctx)
      const menu = await openAccount(page, size)
      for (const name of ['Add account', /Switch to Otto Other/]) {
        const row = menu.getByRole('button', { name })
        await expect(row).toHaveAttribute('aria-disabled', 'true')
        const noteId = await row.getAttribute('aria-describedby')
        expect(noteId, 'the row points at a note').toBeTruthy()
        const note = await page.evaluate((id) => document.getElementById(id)?.textContent || '', noteId)
        expect(note).toMatch(/offline/i)
      }
      await menu.getByRole('button', { name: 'Add account' }).click({ force: true })
      await expect(loginDialog(page), 'pressing a disabled row opens nothing').toHaveCount(0)
      await page.locator('.pnav-sheet, #pnav-account-pop').locator('[data-theme-choice="dark"]').click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await ctx.close()
    })

    test('signed out: Log in and Create a free account are aria-disabled with an offline note', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a visitor who is offline')
      await go(page, '/discover')
      await goOffline(page, ctx)
      let scope
      if (size.touch) {
        await page.locator('.pnav-mobile').click()
        scope = page.locator('.pnav-sheet')
      } else {
        await page.locator('.pnav-more').click()
        scope = page.locator('#pnav-account-pop')
      }
      await expect(scope).toBeVisible()
      const rows = size.touch
        ? [scope.locator('.pnav-sheet-login'), scope.locator('.pnav-sheet-signup')]
        : [scope.getByRole('button', { name: 'Log in' }), scope.getByRole('button', { name: 'Create a free account' })]
      for (const row of rows) {
        await expect(row).toHaveAttribute('aria-disabled', 'true')
        const noteId = await row.getAttribute('aria-describedby')
        expect(noteId).toBeTruthy()
        expect(await page.evaluate((id) => document.getElementById(id)?.textContent || '', noteId)).toMatch(/offline/i)
      }
      await rows[0].click({ force: true })
      await expect(loginDialog(page)).toHaveCount(0)
      await ctx.close()
    })
  })
}
