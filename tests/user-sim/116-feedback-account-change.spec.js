// A feedback message sent in the background, and what an account change does to it.
//
// "Sent" shows the moment the form is submitted; delivery carries on after the
// person has left the page. Two things follow, and both live above any one route:
//
//   1. If delivery then fails, the failure toast must show wherever the person
//      is now, once. The toast host used to sit inside the shell and inside
//      CreateTool, so a route that returns early (a Create tool, the marketing
//      pages) hid or doubled it.
//   2. The message, its retry, its draft and the sender's address belong to the
//      account that wrote them. Signing out, or a different account signing in,
//      drops them: nothing is retried and nothing carries over. A signed-out
//      visitor who signs in keeps what they typed.
//
// Account changes happen inside the mounted page through
// window.__UIL4B_TEST_AUTH__ (tests/user-sim/fixtures/test-session.js), so the
// router and the in-memory feedback holders are not reset by a reload.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const TEXT = 'The export button does nothing on my phone.'
const FAILED = "Your message didn't send."
// Longer than the 1500 ms pause before the automatic retry, so a retry that
// wrongly goes ahead has arrived by the time it is counted.
const PAST_RETRY_MS = 2200

async function standIn(page, reply) {
  const posted = []
  const gates = []
  await page.route('**/api/support', async route => {
    posted.push(JSON.parse(route.request().postData() || '{}'))
    const verdict = reply(posted.length)
    if (verdict.hold) await new Promise(resolve => gates.push(resolve))
    await route.fulfill({ status: verdict.status ?? 200, contentType: 'application/json', body: '{}' })
  })
  return { posted, release: () => gates.splice(0).forEach(resolve => resolve()) }
}

// Client-side navigation, so the feedback holders (module state) survive it.
const navigate = (page, path) => page.evaluate(to => {
  history.pushState({}, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
}, path)

async function submitAndLeave(page, server, path) {
  await go(page, '/feedback')
  await page.locator('#fb-message').fill(TEXT)
  await page.locator('.fb-page button[type="submit"]').click()
  await expect(page.locator('.fb-page').getByRole('heading', { name: 'Sent', exact: true })).toBeVisible()
  await navigate(page, path)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect(page.locator('.fb-page')).toHaveCount(0)
  await expect.poll(() => server.posted.length).toBe(1)
}

const failureToasts = page => page.locator('.toast', { hasText: FAILED })

test.describe('a background send that fails, on every kind of route', () => {
  for (const path of ['/discover', '/learn', '/plans', '/create/palette']) {
    test(`the failure toast shows exactly once on ${path}`, async ({ page }) => {
      watch(page, 'a visitor whose message fails after they have moved on')
      await signIn(page, { plan: 'free' })
      const server = await standIn(page, n => (n <= 2 ? { hold: true, status: 502 } : { status: 200 }))
      await submitAndLeave(page, server, path)
      server.release()
      await expect.poll(() => server.posted.length).toBe(2)
      server.release()

      const toast = page.locator('.toast.show')
      await expect(toast).toHaveCount(1)
      await expect(toast).toContainText(FAILED)
      await expect(toast.getByRole('button', { name: 'Try again' })).toBeVisible()
      // One host in the document: a second mount would repeat the message.
      await expect(failureToasts(page)).toHaveCount(1)
      await expect(page.locator('.toast')).toHaveCount(1)
    })
  }
})

test.describe('an account change under a send', () => {
  test('a retry offered to a signed-out account is taken down and sends nothing', async ({ page }) => {
    watch(page, 'a person who signs out while a retry is on offer')
    await signIn(page, { plan: 'free' })
    const server = await standIn(page, n => (n <= 2 ? { hold: true, status: 502 } : { status: 200 }))
    await submitAndLeave(page, server, '/discover')
    server.release()
    await expect.poll(() => server.posted.length).toBe(2)
    server.release()
    await expect(page.locator('.toast.show').getByRole('button', { name: 'Try again' })).toBeVisible()

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signOutNow())

    await expect(page.locator('.toast.show')).toHaveCount(0)
    await page.waitForTimeout(PAST_RETRY_MS)
    expect(server.posted, 'nothing more reached the server after sign-out').toHaveLength(2)
  })

  test('a send still in flight at sign-out makes no automatic retry and raises no toast', async ({ page }) => {
    watch(page, 'a person who signs out while their message is still sending')
    await signIn(page, { plan: 'free' })
    const server = await standIn(page, () => ({ hold: true, status: 502 }))
    await submitAndLeave(page, server, '/discover')

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signOutNow())
    server.release()

    await page.waitForTimeout(PAST_RETRY_MS)
    expect(server.posted, 'the 502 was not retried').toHaveLength(1)
    await expect(page.locator('.toast.show')).toHaveCount(0)
  })

  test('a different account signing in clears what was typed on /feedback', async ({ page }) => {
    watch(page, 'a second person using the same browser')
    await signIn(page, { plan: 'free' })
    await go(page, '/feedback')
    await page.locator('#fb-subject').fill('Export is broken')
    await page.locator('#fb-message').fill(TEXT)
    await page.getByRole('radio', { name: 'Bug Report' }).click()
    await expect(page.locator('#fb-message')).toHaveValue(TEXT)

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.switchTo({ uid: 'test-uid-other', email: 'other.user@uil4b.test' }))

    await expect(page.locator('#fb-message')).toHaveValue('')
    await expect(page.locator('#fb-subject')).toHaveValue('')
    await expect(page.locator('[role="radio"][aria-checked="true"]')).not.toHaveText('Bug Report')
  })

  test('signing out clears what was typed on /feedback', async ({ page }) => {
    watch(page, 'a person signing out of a shared computer')
    await signIn(page, { plan: 'free' })
    await go(page, '/feedback')
    await page.locator('#fb-message').fill(TEXT)
    await expect(page.locator('#fb-message')).toHaveValue(TEXT)

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signOutNow())

    await expect(page.locator('#fb-message')).toHaveValue('')
  })

  test('a signed-out visitor who signs in keeps their draft', async ({ page }) => {
    watch(page, 'a visitor who signs in part-way through writing')
    const { email } = await signIn(page, { plan: 'free', lateSignIn: true })
    await go(page, '/feedback')
    await page.locator('#fb-subject').fill('Export is broken')
    await page.locator('#fb-message').fill(TEXT)
    await expect(page.getByText(`Sending as ${email}`)).toHaveCount(0)

    await page.evaluate(() => window.__UIL4B_TEST_AUTH__.signInNow())
    // The page now knows the account: the draft is judged against that state.
    await expect(page.getByText(`Sending as ${email}`)).toBeVisible()

    await expect(page.locator('#fb-message')).toHaveValue(TEXT)
    await expect(page.locator('#fb-subject')).toHaveValue('Export is broken')
  })
})
