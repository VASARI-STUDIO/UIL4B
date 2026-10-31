// SENDING FEEDBACK FROM INSIDE A TOOL.
//
// Every tool toolbar's More menu ends with "Send feedback". It opens the app's
// one feedback dialog, filled in with the page and tool the person is on, and
// closing it gives focus back to the More button. A signed-out sender can leave
// an optional reply address; a signed-in sender cannot (the account's address is
// used). The browser's own copy of what was sent never holds an address.
//
// Checked on five tools, on a touch phone at 390 (bottom sheet) and on a desktop
// at 1440 (popover):
//   - the menu ends with the feedback row, and choosing it opens the dialog on
//     "Feedback" with this page and tool in the attached context;
//   - Escape closes the dialog and focus lands on the More button;
//   - signed out: a mistyped address is named inline and focus goes to the
//     field with nothing sent; no address sends and says it is one-way; a
//     valid address sends and says a reply can reach it;
//   - signed in: no address field; the request carries the account address, the
//     chosen area and severity;
//   - vs-feedback holds no address afterwards, including one written by an older
//     build.
//
// /api/support is ALWAYS intercepted; nothing here reaches a real endpoint.
//
// MUTATIONS this file was seen to fail under (one each, restored after):
//   src/utils/analytics.js  delete `feedback.forEach(f => { delete f.email })`
//        fails the "browser copy" checks in the signed-out test at both widths.
//   src/components/tool/ToolLayout.jsx  remove the `data-tl-menu-item="feedback"`
//        row            fails every test in this file.
import { test, expect } from './base.js'
import { go, watch, signIn, chooseMenuOption } from './helpers.js'

const VIEWS = [
  { name: '390 touch', phone: true, context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  { name: '1440 desktop', phone: false, context: { viewport: { width: 1440, height: 900 } } },
]

const TOOLS = [
  { id: 'palette', route: '/create/palette', label: 'Palette' },
  { id: 'gradient', route: '/create/gradient', label: 'Gradient' },
  { id: 'tint', route: '/create/tint', label: 'Tint' },
  { id: 'converter', route: '/create/file-converter', label: 'File Converter' },
  { id: 'type scale', route: '/create/type-scale', label: 'Type Scale' },
]

const OLD_ENTRY = { id: 'old-1', type: 'bug', subject: 'Older', message: 'Written by an older build.', email: 'older.sender@example.com', status: 'new' }

/** Record every POST to /api/support and answer it ok. Returns the ledger. */
async function interceptSupport(page) {
  const seen = []
  await page.route('**/api/support', (route) => {
    seen.push(JSON.parse(route.request().postData() || '{}'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return seen
}

const dialog = (page) => page.locator('.fb-modal')

/** Press with a tap on the touch phone and a click on the desktop. */
const press = (view, locator) => (view.phone ? locator.tap() : locator.click())

async function newPage(browser, view, persona) {
  const ctx = await browser.newContext(view.context)
  const page = await ctx.newPage()
  watch(page, persona)
  return { ctx, page }
}

/** More -> Send feedback, the way a person does it. */
async function sendFeedbackFromMore(page, view) {
  await press(view, page.locator('.tl-more-btn').first())
  const row = page.locator('[data-tl-menu-item="feedback"]')
  await expect(row).toBeVisible()
  await press(view, row)
  await expect(dialog(page)).toBeVisible()
}

for (const view of VIEWS) {
  for (const tool of TOOLS) {
    test.describe(`${tool.id} at ${view.name}`, () => {
      test('More ends with Send feedback, which opens the dialog for this tool; Escape returns focus to More', async ({ browser }) => {
        const { ctx, page } = await newPage(browser, view, `someone on the ${tool.id} tool who wants to say something`)
        await go(page, tool.route)

        await press(view, page.locator('.tl-more-btn').first())
        const row = page.locator('[data-tl-menu-item="feedback"]')
        await expect(row).toBeVisible()
        await expect(row).toContainText('Send feedback')
        await expect(page.locator('.tl-menu-list > :last-child'), 'the feedback row is the last thing in the menu').toHaveAttribute('data-tl-menu-item', 'feedback')
        if (view.phone) {
          const box = await row.boundingBox()
          expect(box.height, 'a touch target of at least 44px').toBeGreaterThanOrEqual(44)
        }

        await press(view, row)
        await expect(dialog(page)).toBeVisible()
        await expect(page.locator('[data-tl-menu-item="feedback"]'), 'the menu closed behind the dialog').toHaveCount(0)
        await expect(dialog(page).locator('.fb-type.on')).toContainText('Feedback')
        const context = dialog(page).locator('.fb-cap-row')
        await expect(context.filter({ hasText: 'Page you were on' })).toContainText(tool.route)
        await expect(context.filter({ hasText: 'Tool' }).first()).toContainText(tool.label)
        expect(await page.evaluate(() => document.querySelector('.fb-modal').contains(document.activeElement)), 'focus moved into the dialog').toBe(true)

        // Viewport-only capture of the open dialog, kept with the test result.
        await test.info().attach(`dialog-${tool.id}-${view.name}`, { body: await page.screenshot(), contentType: 'image/png' })

        await page.keyboard.press('Escape')
        await expect(dialog(page)).toHaveCount(0)
        await expect(page.locator('.tl-more-btn').first(), 'focus returns to the More button').toBeFocused()
        await ctx.close()
      })

      test('signed out: a mistyped address is named inline, no address says one-way, a good one says a reply can reach it', async ({ browser }) => {
        const { ctx, page } = await newPage(browser, view, `a signed-out visitor sending feedback from ${tool.id}`)
        await page.addInitScript((old) => {
          if (!localStorage.getItem('vs-feedback')) localStorage.setItem('vs-feedback', JSON.stringify([old]))
        }, OLD_ENTRY)
        const seen = await interceptSupport(page)
        await go(page, tool.route)
        await sendFeedbackFromMore(page, view)

        const contact = page.locator('#fb-contact')
        const message = page.locator('#fb-message')
        await expect(contact).toBeVisible()

        // A mistyped address: named on the field, focus goes there, nothing is sent.
        await message.fill(`Typed on ${tool.id}.`)
        await contact.fill('bob@')
        await dialog(page).getByRole('button', { name: 'Submit' }).click()
        const error = page.locator('#fb-contact-error')
        await expect(error).toBeVisible()
        await expect(error).toHaveAttribute('role', 'alert')
        await expect(contact).toHaveAttribute('aria-invalid', 'true')
        await expect(contact).toHaveAttribute('aria-describedby', 'fb-contact-error')
        await expect(contact, 'focus moves to the field that needs fixing').toBeFocused()
        expect(seen, 'nothing is sent with a bad address').toHaveLength(0)

        // Clearing the field sends without one, and the success screen says so.
        await contact.fill('')
        await dialog(page).getByRole('button', { name: 'Submit' }).click()
        await expect(page.locator('.fb-success-reply')).toContainText('one-way')
        expect(seen).toHaveLength(1)
        expect(seen[0].email).toBe('')
        expect(seen[0].message).toContain(tool.route)
        await dialog(page).locator('.fb-success-actions').getByRole('button', { name: 'Close', exact: true }).click()
        await expect(dialog(page)).toHaveCount(0)

        // Opened again, the field starts empty; a valid address is sent and named.
        await sendFeedbackFromMore(page, view)
        await expect(contact, 'the last address is not carried to the next dialog').toHaveValue('')
        await message.fill(`Second note on ${tool.id}.`)
        await contact.fill('reply.me@example.com')
        await dialog(page).getByRole('button', { name: 'Submit' }).click()
        await expect(page.locator('.fb-success-reply')).toContainText('reply.me@example.com')
        expect(seen).toHaveLength(2)
        expect(seen[1].email).toBe('reply.me@example.com')

        // The browser's copy keeps the messages and no address, old entry included.
        const raw = await page.evaluate(() => localStorage.getItem('vs-feedback'))
        const stored = JSON.parse(raw)
        expect(stored.length, 'the older entry and the two just sent').toBe(3)
        expect(stored.some((f) => 'email' in f), 'an entry still carries an email field').toBe(false)
        expect(raw).not.toContain('reply.me@example.com')
        expect(raw).not.toContain('older.sender@example.com')
        expect(stored.find((f) => f.id === 'old-1').message, 'the older entry is kept, only its address goes').toBe(OLD_ENTRY.message)
        await ctx.close()
      })

      test('signed in: no address field; the request carries the account, area and severity; the browser copy has no address', async ({ browser }) => {
        const { ctx, page } = await newPage(browser, view, `a signed-in user reporting a bug from ${tool.id}`)
        const seen = await interceptSupport(page)
        const account = await signIn(page)
        await go(page, tool.route)
        await sendFeedbackFromMore(page, view)

        await expect(page.locator('#fb-contact')).toHaveCount(0)
        await expect(dialog(page).locator('.fb-sending-as')).toContainText(account.email)

        await dialog(page).locator('.fb-type', { hasText: 'Bug' }).click()
        await chooseMenuOption(page, page.locator('#fb-category'), { label: 'Icons' })
        await chooseMenuOption(page, page.locator('#fb-severity'), { label: 'Major — feature broken' })
        await page.locator('#fb-message').fill(`Something broke on ${tool.id}.`)
        await dialog(page).getByRole('button', { name: 'Submit' }).click()

        await expect(page.locator('.fb-success-reply')).toContainText(account.email)
        expect(seen).toHaveLength(1)
        expect(seen[0]).toMatchObject({ type: 'bug', category: 'Icons', severity: 'Major — feature broken', email: account.email, source: 'inline' })
        expect(seen[0].message).toContain(tool.route)

        const raw = await page.evaluate(() => localStorage.getItem('vs-feedback'))
        const stored = JSON.parse(raw)
        expect(stored).toHaveLength(1)
        expect(stored[0].message).toContain(`Something broke on ${tool.id}.`)
        expect('email' in stored[0]).toBe(false)
        expect(raw).not.toContain(account.email)
        await ctx.close()
      })
    })
  }
}
