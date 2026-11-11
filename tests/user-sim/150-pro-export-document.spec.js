// The Pro documents (the design system book and the brand guidelines, which the route calls the
// slides) are built by the server in the open theme: the panel POSTs to /api/ai?export=document
// and prints what comes back.
// The preview server has no /api, so each test answers that one route itself. The
// server's own rules (401, 403, 200, 400, 413) are pinned in
// tests/unit/export-document.test.js; what is checked HERE is what a person sees:
//
//   - a Pro export asks the server once, with their token, and the document opens;
//   - a refusal (403) says so in the panel, leaves the page where it is, and does
//     not send anyone to /plans, and no blank window is left behind;
//   - a session the server will not accept (401, twice) asks them to sign in;
//   - a Free account never reaches the server at all.
//
// Each refusal test also has a control: the same steps against a 200 do open the
// document, so "no document" is the answer and not a button that never worked.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel, actionLabel } from './export-rows.js'
import { mockThemeApi, cleanHtml } from './export-theme-mock.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'

const DOCS = {
  book: { row: 'book', html: () => cleanHtml('Stub book') },
  guidelines: { row: 'slides', html: () => cleanHtml('Stub guidelines') },
}

async function open(browser, plan) {
  const context = await browser.newContext()
  // A real print dialog would hold a worker.
  await context.addInitScript(() => { window.print = () => {} })
  const page = await context.newPage()
  await signIn(page, { plan })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  await expect(exportPanel(page)).toBeVisible()
  return { context, page }
}

/** Answer the export route, recording every request the panel makes. */
async function answerWith(page, reply) {
  return mockThemeApi(page, (body, calls) => {
    const { status, body: json, html } = reply(calls.length, body)
    return html !== undefined ? { html } : { status, body: json }
  })
}

const ok = (id) => () => ({ html: DOCS[id].html() })

for (const id of ['book', 'guidelines']) {
  test.describe(`the Pro ${id} is built by the server`, () => {
    test(`a Pro account asks the server once, with their token, and the ${id} opens`, async ({ browser }) => {
      const { context, page } = await open(browser, 'pro')
      watch(page, `a Pro subscriber exporting the ${id}`)
      const asked = await answerWith(page, ok(id))
      await chooseFormat(page, id)

      const [doc] = await Promise.all([
        context.waitForEvent('page'),
        exportPanel(page).getByRole('button', { name: actionLabel(id), exact: true }).click(),
      ])
      // The window is reserved inside the click, so it exists before the answer
      // arrives: the document itself is what proves the round trip finished.
      await expect(doc.locator('#printed-doc')).toBeVisible()

      expect(asked, 'the panel must ask the server exactly once').toHaveLength(1)
      expect(asked[0].method).toBe('POST')
      expect(asked[0].auth).toMatch(/^Bearer .+/)
      expect(asked[0].body).toEqual(expect.objectContaining({ theme: expect.any(String), row: DOCS[id].row, format: 'pdf' }))
      await context.close()
    })

    test(`a 403 says so in the panel, stays on the page and leaves no blank window (${id})`, async ({ browser }) => {
      const { context, page } = await open(browser, 'pro')
      watch(page, `a subscriber whose plan the server cannot find, exporting the ${id}`)
      const asked = await answerWith(page, () => ({ status: 403, body: { error: 'Pro plan required', code: 'pro_required', format: id } }))
      await chooseFormat(page, id)
      const before = page.url()

      await exportPanel(page).getByRole('button', { name: actionLabel(id), exact: true }).click()

      const alert = exportPanel(page).getByRole('alert')
      await expect(alert).toHaveText('We couldn’t find a Pro plan on this account, so this file wasn’t made.')
      expect(page.url(), 'a refusal must not send anyone to the pricing page').toBe(before)
      expect(page.url()).not.toMatch(/\/plans/)
      await expect(exportPanel(page), 'the panel stays open to carry the message').toBeVisible()
      // The window reserved for the document is closed again.
      await expect.poll(() => context.pages().filter((p) => !p.isClosed()).length, 'a blank window was left open').toBe(1)
      expect(asked).toHaveLength(1)
      await context.close()
    })

    test(`a 401 on both tries asks the person to sign in, and tries a fresh token once (${id})`, async ({ browser }) => {
      const { context, page } = await open(browser, 'pro')
      watch(page, `a subscriber whose session the server refuses, exporting the ${id}`)
      const asked = await answerWith(page, () => ({ status: 401, body: { error: 'Invalid or expired session', code: 'auth_required' } }))
      await chooseFormat(page, id)
      const before = page.url()

      await exportPanel(page).getByRole('button', { name: actionLabel(id), exact: true }).click()

      await expect(exportPanel(page).getByRole('alert'))
        .toHaveText('You’re signed out. Sign in again, then export.')
      expect(page.url()).toBe(before)
      expect(asked, 'one try, then one more on a fresh token, then stop').toHaveLength(2)
      await expect.poll(() => context.pages().filter((p) => !p.isClosed()).length, 'a blank window was left open').toBe(1)
      await context.close()
    })
  })
}

test('a 401 on a stale token is retried once and the document still opens', async ({ browser }) => {
  const { context, page } = await open(browser, 'pro')
  watch(page, 'a subscriber whose cached token had just expired')
  const asked = await answerWith(page, (n) => (n === 1
    ? { status: 401, body: { error: 'Invalid or expired session', code: 'auth_required' } }
    : ok('book')()))
  await chooseFormat(page, 'book')

  const [doc] = await Promise.all([
    context.waitForEvent('page'),
    exportPanel(page).getByRole('button', { name: actionLabel('book'), exact: true }).click(),
  ])
  await expect(doc.locator('#printed-doc')).toBeVisible()
  expect(asked).toHaveLength(2)
  await context.close()
})

test('a server fault is a plain "try again", not a sign-in or a pricing page', async ({ browser }) => {
  const { context, page } = await open(browser, 'pro')
  watch(page, 'a subscriber exporting while the server is down')
  await answerWith(page, () => ({ status: 503, body: { error: 'Could not check your session', code: 'auth_unavailable' } }))
  await chooseFormat(page, 'book')
  const before = page.url()

  await exportPanel(page).getByRole('button', { name: actionLabel('book'), exact: true }).click()

  await expect(exportPanel(page).getByRole('alert')).toHaveText('That file didn’t build. Try again.')
  expect(page.url()).toBe(before)
  await context.close()
})

test('a Free account is sent to /plans and the server is never asked', async ({ browser }) => {
  const { context, page } = await open(browser, 'free')
  watch(page, 'a free account trying the design system book')
  const asked = await answerWith(page, ok('book'))
  await chooseFormat(page, 'book')
  const popups = []
  context.on('page', (p) => popups.push(p))

  await exportPanel(page).getByRole('button', { name: /Unlock with Pro/i }).click()

  await expect(page).toHaveURL(/\/plans(\?|$)/)
  expect(asked, 'a Free account must not even reach the endpoint').toHaveLength(0)
  expect(popups, 'and must not get a window').toHaveLength(0)
  await context.close()
})
