// WHERE A PERSON LANDS AFTER SIGNING OUT, FROM THE THREE PAGES THAT NEED AN ACCOUNT.
//
// 221 and 57 prove the Sign out control works. They stop at "the session is gone".
// This is the destination, which is what the person sees next:
//   /settings         stays on /settings, in its signed-out state (no Account section,
//                     a sign-in prompt for plan and billing)
//   /projects/:id     the project needs the account, so it goes to the workspace
//   /checkout/return  behind the auth gate, so it goes to /login
//
// The session is ended in place (the double is re-declared on every load, so a
// reload would sign the person straight back in); what is read is the live swap.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// ProjectDetail.jsx: drop `!canSaveProjects ||` from the <Navigate to="/projects"> guard
//   (the signed-out view then renders a project it has no account for).
// App.jsx RequireAuth: render `children` when there is no user (the return page stays).
// Settings.jsx: render the Account section without `user`.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const SIZES = [
  { name: '1440', width: 1440, height: 900, touch: false },
  { name: '390', width: 390, height: 844, touch: true },
]

const RETURN_URL = '/checkout/return?session_id=cs_test_signout'

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

const pathOf = (page) => new URL(page.url()).pathname
const signedIn = (page) => page.evaluate(() => window.__UIL4B_TEST_AUTH__.signedIn)

async function openAccountMenu(page, size) {
  if (size.touch) {
    await page.locator('.pnav-tab', { hasText: 'You' }).click()
    const sheet = page.locator('#pnav-sheet-account')
    await expect(sheet).toBeVisible()
    return sheet
  }
  await page.getByRole('button', { name: 'Account and settings' }).click()
  const pop = page.locator('#pnav-account-pop')
  await expect(pop).toBeVisible()
  return pop
}

async function signOutFromNav(page, size) {
  const menu = await openAccountMenu(page, size)
  await menu.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect.poll(() => signedIn(page), 'the session ended').toBe(false)
}

const section = (page, name) => page.getByRole('tab', { name }).or(
  page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name, exact: true }),
)

async function showSectionList(page) {
  const back = page.getByRole('button', { name: 'All settings' })
  if (await back.isVisible()) await back.click()
}

async function openSection(page, name) {
  await showSectionList(page)
  await section(page, name).click()
}

async function stubPaidCheckout(page) {
  await page.route('**/api/checkout-status*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'complete', mode: 'subscription', subscriptionActive: true }),
  }))
}

for (const size of SIZES) {
  test.describe(`signing out at ${size.name}`, () => {
    test('from /settings the person stays on /settings and it turns to its signed-out view', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a Pro member signing out of settings')
      await signIn(page, { plan: 'pro' })
      await go(page, '/settings')
      await expect(section(page, 'Account'), 'signed in, the Account section is there').toBeVisible()

      await openSection(page, 'Plan and billing')
      await expect(page.getByText(/You.re on UI L4B Pro/i)).toBeVisible()
      await openSection(page, 'Account')
      await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      await expect.poll(() => signedIn(page)).toBe(false)

      await showSectionList(page)
      await expect(section(page, 'Plan and billing'), 'the list is on screen').toBeVisible()
      await expect(section(page, 'Account'), 'the Account section goes with the session').toHaveCount(0)
      expect(pathOf(page), 'still on settings').toBe('/settings')
      await openSection(page, 'Plan and billing')
      await expect(page.getByText(/to see your plan and billing/i), 'a way back in is offered').toBeVisible()
      await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login')
      await expect(page.getByText(/You.re on UI L4B Pro/i), 'Pro goes with the session').toHaveCount(0)
      await ctx.close()
    })

    test('from /settings by the account menu it is the same signed-out settings page', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a Free member signing out from the nav on settings')
      await signIn(page, { plan: 'free' })
      await go(page, '/settings')
      await expect(section(page, 'Account')).toBeVisible()
      await signOutFromNav(page, size)
      await expect(section(page, 'Plan and billing'), 'the list is on screen').toBeVisible()
      await expect(section(page, 'Account')).toHaveCount(0)
      expect(pathOf(page)).toBe('/settings')
      await ctx.close()
    })

    test('from a project the person lands on the workspace, not on a project they cannot open', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member signing out inside a project')
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/projects/seed-1')
      expect(pathOf(page)).toBe('/projects/seed-1')
      await expect(page.getByText('Seeded Project 1').first()).toBeVisible()

      await signOutFromNav(page, size)
      await expect.poll(() => pathOf(page), 'sent to the workspace').toBe('/projects')
      await expect(page.getByText('Seeded Project 1'), 'the project is not on show to a signed-out visitor').toHaveCount(0)
      await expect(page.locator('main h1').first()).toBeVisible()
      await ctx.close()
    })

    test('from the checkout return page the person is sent to /login', async ({ browser }) => {
      const { ctx, page } = await open(browser, size, 'a member signing out on the checkout return page')
      await signIn(page, { plan: 'free' })
      await stubPaidCheckout(page)
      await go(page, RETURN_URL)
      await expect(page.locator('.ck-ret h1'), 'the confirmed return page is on screen').toHaveText(/on UI L4B Pro/)

      await signOutFromNav(page, size)
      await expect.poll(() => pathOf(page), 'the gated page sends a signed-out visitor to log in').toBe('/login')
      await expect(page.getByRole('heading', { level: 1, name: 'Log in to UI L4B' })).toBeVisible()
      await expect(page.locator('.ck-ret'), 'the confirmation is not left on screen').toHaveCount(0)
      await ctx.close()
    })
  })
}
