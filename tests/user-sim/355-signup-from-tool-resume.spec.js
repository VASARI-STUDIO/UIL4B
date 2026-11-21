// A SIGN-UP THAT STARTS IN A TOOL GOES BACK TO THAT TOOL AFTER ONBOARDING.
//
// The nav's "Log in" opens the login popup, which stashes the page it was opened on
// (vs-resume-after-onboarding). A new account lands on /onboarding; the skip link
// names the tool it came from and takes the person back there, address and all,
// instead of to /projects. A checkout stash keeps its own words (spec 352), and a
// sign-up with nothing stashed still ends on /projects (spec 352).
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Onboarding.jsx: return L6 from skipLabel for a tool (the link name fails), or
// point the skip href at FIRST_RUN_DESTINATION when resumeTool is set and drop the
// resume from skipFirstWin (the person lands on /projects).
import { test, expect } from './base.js'
import { go, signIn, watch, continueWithEmail } from './helpers.js'

const NEW_UID = 'test-uid-new'
const RESUME_KEY = 'vs-resume-after-onboarding'

const here = (page) => {
  const u = new URL(page.url())
  return u.pathname + u.search
}
const record = (page) => page.evaluate((uid) => window.__UIL4B_TEST_STORE__.get(`users/${uid}`)?.onboarding ?? null, NEW_UID)

const TOOLS = [
  { start: '/create/palette?c=1F4B8E,2E7BB8,3FA9A0', name: 'Palette' },
  { start: '/create/type-scale', name: 'Type Scale' },
]

for (const tool of TOOLS) {
  test(`a sign-up from ${tool.name} goes back to ${tool.name} after onboarding`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    watch(page, `a visitor who signs up from ${tool.name}`)
    await signIn(page, { plan: 'free', lateSignIn: true, returning: false })
    await go(page, tool.start)

    const login = page.locator('.pnav-login:visible').first()
    await expect(login).toBeVisible({ timeout: 15000 })
    await login.click()
    await expect(page.locator('#ui-login-title')).toBeVisible()
    await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY), { message: 'the popup stashed the tool it was opened in' }).toBe(tool.start)

    await page.getByRole('button', { name: /Create one$/ }).click()
    await page.locator('#ui-login-email').fill(`new.${tool.name.replace(/\s/g, '').toLowerCase()}@uil4b.test`)
    await continueWithEmail(page)
    await page.locator('#ui-login-password').fill('a-long-test-password')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect.poll(() => new URL(page.url()).pathname, { message: 'a new account goes to onboarding', timeout: 15000 }).toBe('/onboarding')
    await expect.poll(async () => (await record(page))?.openedAt).toEqual(expect.any(Number))
    // The status line ("After this, you’ll go back to …") sits under Save on the last step;
    // here, on the first, the header link carries the promise.

    const skip = page.getByRole('link', { name: `Not now, back to ${tool.name}` })
    await expect(skip).toHaveAttribute('href', tool.start)
    await skip.click()
    await expect.poll(() => here(page), { message: 'back in the tool the sign-up began in, not on /projects' }).toBe(tool.start)
    await expect.poll(async () => (await record(page))?.completedAt, { message: 'onboarding is recorded as finished' }).toEqual(expect.any(Number))
    expect(await page.evaluate((k) => sessionStorage.getItem(k), RESUME_KEY), 'the stash is used up').toBeNull()
  })
}
