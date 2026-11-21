// The receipt on /feedback: once a message is sent the left column stops being
// the type picker and becomes a record of what went out (its type, its subject,
// the start of the message), so the person can see what was sent while the
// panel on the right says it was. "Submit another" puts the picker back and
// empties the form. A failed send keeps the receipt, labelled as not sent yet.
//
// The request is stood in for at /api/support, as 22 and 116 do, so nothing
// leaves the machine.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const SUBJECT = 'Export button does nothing'
const MESSAGE = 'I press Export on my phone and nothing happens.'

async function standIn(page, status = 200) {
  const posted = []
  await page.route('**/api/support', async route => {
    posted.push(JSON.parse(route.request().postData() || '{}'))
    await route.fulfill({ status, contentType: 'application/json', body: '{}' })
  })
  return posted
}

async function fillAndSend(page) {
  await page.locator('.fb-page [role="radio"]').filter({ hasText: 'Bug report' }).click()
  await page.locator('#fb-subject').fill(SUBJECT)
  await page.locator('#fb-email').fill('visitor@uil4b.test')
  await page.locator('#fb-message').fill(MESSAGE)
  await page.locator('.fb-page button[type="submit"]').click()
}

test.describe('the receipt of what was sent', () => {
  // MUTATION: Feedback.jsx renders the type picker after a send instead of the receipt -> "What you sent" never appears, all three fail.
  // MUTATION: Feedback.jsx shows the typed label instead of the subject in the receipt -> the subject assertion fails.
  test('after a send the left column shows the type and subject that went out', async ({ page }) => {
    watch(page, 'a visitor who has just sent a bug report')
    const posted = await standIn(page)
    await go(page, '/feedback')
    await fillAndSend(page)

    const receipt = page.locator('.fb-page .fb-receipt')
    await expect(receipt).toBeVisible()
    await expect(receipt.getByText('What you sent', { exact: true })).toBeVisible()
    await expect(receipt).toContainText('Bug report')
    await expect(receipt).toContainText(SUBJECT)
    await expect(receipt).toContainText(MESSAGE)
    await expect(page.locator('.fb-page').getByRole('heading', { name: 'Sent', exact: true })).toBeVisible()
    await expect(page.locator('.fb-page [role="radiogroup"]'), 'the picker is replaced, not kept beside it').toHaveCount(0)

    await expect.poll(() => posted.length).toBe(1)
    expect(posted[0].subject, 'the receipt shows what the request carried').toBe(SUBJECT)
  })

  test('a message with no subject shows the [type] Submission fallback', async ({ page }) => {
    watch(page, 'a visitor who sent a message without a subject')
    await standIn(page)
    await go(page, '/feedback')
    await page.locator('#fb-email').fill('visitor@uil4b.test')
    await page.locator('#fb-message').fill(MESSAGE)
    await page.locator('.fb-page button[type="submit"]').click()
    await expect(page.locator('.fb-page .fb-receipt')).toContainText('[feature] Submission')
  })

  test('Submit another brings the picker back and empties the form', async ({ page }) => {
    watch(page, 'a visitor who sends a second message')
    await standIn(page)
    await go(page, '/feedback')
    await fillAndSend(page)
    await expect(page.locator('.fb-page .fb-receipt')).toBeVisible()

    await page.getByRole('button', { name: 'Submit another' }).click()
    await expect(page.locator('.fb-page .fb-receipt')).toHaveCount(0)
    await expect(page.locator('.fb-page [role="radiogroup"] [role="radio"]')).toHaveCount(4)
    await expect(page.locator('#fb-subject')).toHaveValue('')
    await expect(page.locator('#fb-message')).toHaveValue('')
  })

  test('a failed send keeps the receipt and says it has not been sent', async ({ page }) => {
    watch(page, 'a visitor whose message fails')
    await standIn(page, 400)
    await go(page, '/feedback')
    await fillAndSend(page)

    const receipt = page.locator('.fb-page .fb-receipt')
    await expect(receipt.getByText('Not sent yet', { exact: true })).toBeVisible()
    await expect(receipt).toContainText(SUBJECT)
    await expect(page.locator('.fb-page .fb-error[role="alert"]')).toBeVisible()
  })
})
