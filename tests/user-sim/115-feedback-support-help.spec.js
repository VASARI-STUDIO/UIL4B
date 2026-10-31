// The /feedback form when a visitor arrives for help with a failed payment.
//
// A link from outside the app (the /support alias, a payment email) lands on
// /feedback?from=support&ref=payment_failed, or carries `reason=` instead of
// `ref=`. tests/unit/support-route.test.js holds the source of the form to that
// contract; this file renders it, because a regex over source cannot see a form
// that read the wrong parameter, or a link that shows to the wrong visitor.
//
//   signed out  Help request selected, a "Get help" heading, the payment
//               subject, and an email that is required: submitting without one
//               puts an alert beside the field, moves focus to it and sends
//               nothing.
//   signed in   the same, plus an "Update your card" link to /settings. The
//               account's address is already known, so there is no email field.
//   plain       /feedback is the ordinary suggestion form.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const PAYMENT_URLS = [
  '/feedback?from=support&ref=payment_failed',
  '/feedback?from=support&reason=payment_failed',
]

// A request to the support endpoint is a failure of these tests: a submit that
// is refused for a missing email must not leave the page. Answered with a 200
// so a request that did go out would still be counted rather than error.
async function countSupportPosts(page) {
  const seen = []
  await page.route('**/api/support', (route) => {
    seen.push(route.request().postData())
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return seen
}

const helpRadio = (page) => page.getByRole('radio', { name: 'Help request' })

test.describe('the feedback form for a failed payment', () => {
  for (const url of PAYMENT_URLS) {
    test(`signed out, ${url} opens as a payment help request`, async ({ page }) => {
      watch(page, 'a signed-out visitor following a failed-payment link')
      await go(page, url)

      await expect(page.getByRole('heading', { level: 1, name: 'Get help' })).toBeVisible()
      await expect(page.getByText("Payment didn't go through?")).toBeVisible()
      await expect(helpRadio(page)).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
      await expect(page.getByLabel('Subject')).toHaveValue('Payment failed')
      await expect(page.getByLabel('Message')).toHaveAttribute('placeholder', 'What happened when you tried to pay?')

      const email = page.getByLabel('Email')
      await expect(email).toBeVisible()
      await expect(email).toHaveAttribute('required', '')
      await expect(email).toHaveAttribute('aria-required', 'true')
      await expect(page.getByText('Required — we need your email to reply.')).toBeVisible()

      // Signed out there is no account to bill from, so no card link.
      await expect(page.getByRole('link', { name: 'Update your card' })).toHaveCount(0)
    })
  }

  test('signed out, submitting with no email shows an inline alert, focuses the field and sends nothing', async ({ page }) => {
    watch(page, 'a signed-out visitor who forgot the email')
    const posts = await countSupportPosts(page)
    await go(page, '/feedback?from=support&ref=payment_failed')

    await page.getByLabel('Message').fill('My card was declined twice.')
    await page.getByRole('button', { name: 'Send' }).click()

    const email = page.getByLabel('Email')
    const alert = page.getByRole('alert')
    await expect(alert).toHaveText('Add your email so we can reply about your payment.')
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    // The alert is the field's own description, not a free-floating message.
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBe(await alert.getAttribute('id'))
    // Still the form: nothing was sent and no confirmation replaced it.
    await expect(page.locator('.fb-done')).toHaveCount(0)
    expect(posts, 'a refused submit must not reach /api/support').toEqual([])

    // A real address clears the alert and the submit goes through.
    await email.fill('shopper@example.com')
    await expect(alert).toHaveCount(0)
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('.fb-done')).toContainText('A reply can reach you at shopper@example.com')
    // The send runs in the background, after the confirmation is up.
    await expect.poll(() => posts.length).toBe(1)
    const sent = JSON.parse(posts[0])
    expect(sent).toMatchObject({
      type: 'help',
      subject: 'Payment failed',
      email: 'shopper@example.com',
    })
  })

  test('signed in, the same link shows an Update your card link to /settings and no email field', async ({ page }) => {
    watch(page, 'a signed-in subscriber following a failed-payment link')
    const account = await signIn(page)
    await go(page, '/feedback?from=support&ref=payment_failed')

    await expect(page.getByRole('heading', { level: 1, name: 'Get help' })).toBeVisible()
    await expect(helpRadio(page)).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByLabel('Subject')).toHaveValue('Payment failed')

    const card = page.getByRole('link', { name: 'Update your card' })
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('href', '/settings')

    await expect(page.getByLabel('Email')).toHaveCount(0)
    await expect(page.getByText(`Sending as ${account.email}`)).toBeVisible()
  })

  test('the card link goes to the signed-in visitor\'s settings', async ({ page }) => {
    watch(page, 'a signed-in subscriber updating a card')
    await signIn(page)
    await go(page, '/feedback?from=support&ref=payment_failed')

    await page.getByRole('link', { name: 'Update your card' }).click()
    await expect(page).toHaveURL(/\/settings(\?|#|$)/)
    // It opens on the Plan and billing section (id `support`), not the last one used.
    await expect(page.locator('#settab-support')).toHaveClass(/(^| )active( |$)/)
    await expect(page.locator('#settab-support')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#set-support')).toBeVisible()
  })
})

test.describe('the other ways into the feedback form', () => {
  test('a ref that is not a payment failure preselects Help request without the payment copy', async ({ page }) => {
    watch(page, 'a visitor following a link with some other reason')
    await go(page, '/feedback?ref=billing_question')

    await expect(helpRadio(page)).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('heading', { level: 1, name: 'Get help' })).toHaveCount(0)
    await expect(page.getByLabel('Subject')).toHaveValue('')
    await expect(page.getByLabel('Email')).not.toHaveAttribute('required', '')
  })

  test('a bare /support arrival preselects Help request with the ordinary heading', async ({ page }) => {
    watch(page, 'a visitor from the /support link')
    await go(page, '/feedback?from=support')

    await expect(helpRadio(page)).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('heading', { level: 1, name: 'Get help' })).toHaveCount(0)
    await expect(page.getByLabel('Subject')).toHaveValue('')
  })

  test('plain /feedback is unchanged: Feature Request, the ordinary heading, an optional email, no card link', async ({ page }) => {
    watch(page, 'a visitor opening the feedback form directly')
    await go(page, '/feedback')

    await expect(page.getByRole('radio', { name: 'Feature Request' })).toHaveAttribute('aria-checked', 'true')
    await expect(helpRadio(page)).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Get help')
    await expect(page.getByLabel('Subject')).toHaveValue('')

    const email = page.getByLabel('Email')
    await expect(email).not.toHaveAttribute('required', '')
    await expect(email).toHaveAttribute('placeholder', /optional/)
    await expect(page.getByRole('link', { name: 'Update your card' })).toHaveCount(0)
  })

  test('plain /feedback, signed in, has no card link', async ({ page }) => {
    watch(page, 'a signed-in visitor opening the feedback form directly')
    await signIn(page)
    await go(page, '/feedback')

    await expect(page.getByRole('radio', { name: 'Feature Request' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('link', { name: 'Update your card' })).toHaveCount(0)
  })
})
