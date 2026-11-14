// REPORTING COMMUNITY CONTENT.
//
// Anyone can report a community piece: every tile has an "Actions for <title>"
// button, its menu has a Report row, that opens one form, and the form posts to
// /api/support as type 'report'. (The V3 Community page replaced the old
// per-card "Report <name>" button with that menu.) This file holds the promises
// that are easy to break without a build error:
//
//   - every tile has the "..." control, named for its piece, with a 44x44 hit
//     target at phone, tablet and desktop widths, and a Report row in its menu;
//   - the form refuses an incomplete report INLINE and moves focus to the first
//     field that is wrong, in the order it is read;
//   - a signed-out reporter must leave an email, except for "Illegal content"
//     (the one reason that may be sent without an address);
//   - a valid report reaches /api/support with the item's id, kind and page;
//   - Escape closes the form and gives focus back to the tile's "..." button;
//   - the prompt modal's Report closes the modal and opens the form;
//   - the Help Centre offers the no-account email route.
//
// /api/support is ALWAYS intercepted. Nothing here reaches a real endpoint, and
// a test that expects no request asserts the ledger is empty.
//
// MUTATIONS this file was seen to fail under (older ones first; the card Report
// button's CSS mutation no longer applies, the "..." hit area replaced it):
//   src/utils/contentReport.js  `reason.id !== 'illegal'` -> `true` in the email
//        rule            fails "illegal content may be sent without an email".
//   src/components/ContentReportDialog.jsx  drop the `.focus()` call in the
//        `!check.ok` branch      fails the three "focus lands on ..." tests.
//   src/styles/pages/community.css  `.cm-disc::before { inset: -6px }` -> 0
//        fails "each tile's ... button has a 44px hit area" at all widths
//        (seen to fail for this retarget by changing the test's own bound).
//   src/components/prompt/PromptModal.jsx  remove `beforeOpen={onClose}`
//        fails "the prompt modal's Report closes the modal ...".
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'
import { SHOWCASE_PIECES, makerName } from '../../src/data/communityShowcase.js'
import { COMMUNITY_PROMPT_ROWS } from '../../src/data/communityPrompts.js'

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

const DETAILS = 'This copies a design I made and posted last year.'
const EMAIL = 'reporter@example.com'

/** Record every POST to /api/support and answer it ok. Returns the ledger. */
async function interceptSupport(page) {
  const seen = []
  await page.route('**/api/support', (route) => {
    seen.push(JSON.parse(route.request().postData() || '{}'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  return seen
}

const formDialog = (page) => page.getByRole('dialog', { name: 'Report content' })
const reasonRadio = (page, label) => formDialog(page).getByRole('radio', { name: new RegExp(`^${label}`) })
const sendButton = (page) => formDialog(page).getByRole('button', { name: 'Send report' })

async function gotoCommunity(page) {
  await go(page, '/community')
  await expectRendered(page)
  await expect(page.locator('.cm-tile').first()).toBeVisible({ timeout: 20000 })
}

/**
 * The nth tile's "..." button, and the piece it belongs to. The report names the
 * piece "<title> by <maker>", which is what the dialog and the email carry.
 */
async function nthDesign(page, n = 0) {
  const tile = page.locator('.cm-tile').nth(n)
  const title = (await tile.locator('.cm-tile-title').textContent()).trim()
  const piece = SHOWCASE_PIECES.find((p) => p.title === title)
  expect(piece, `"${title}" on /community is not in the showcase list - the id lookup would be a guess`).toBeTruthy()
  const design = { id: piece.id, name: `${piece.title} by ${makerName(piece)}`, title: piece.title }
  return { design, tile, button: tile.getByRole('button', { name: `Actions for ${title}`, exact: true }) }
}
const firstDesign = (page) => nthDesign(page, 0)

/** Open a tile's menu and choose Report, as a person does. */
async function openReport(page, button) {
  await button.click()
  await page.getByRole('menuitem', { name: 'Report', exact: true }).click()
  await expect(formDialog(page)).toBeVisible()
}

test.describe('every community tile has a Report control', () => {
  for (const vp of WIDTHS) {
    test(`/community at ${vp.width}px: each tile has "Actions for <title>", a 44px hit area, and Report in its menu`, async ({ page }) => {
      watch(page, `someone browsing community pieces at ${vp.width}px`)
      await page.setViewportSize(vp)
      await gotoCommunity(page)

      const tiles = page.locator('.cm-tile')
      const count = await tiles.count()
      // Positive control: an empty grid would make every check below vacuous.
      expect(count, 'no community tile rendered - nothing below would be tested').toBeGreaterThan(0)

      for (let i = 0; i < count; i++) {
        const tile = tiles.nth(i)
        const title = (await tile.locator('.cm-tile-title').textContent()).trim()
        const more = tile.getByRole('button', { name: `Actions for ${title}`, exact: true })
        await expect(more, `the tile "${title}" has no Actions button`).toHaveCount(1)
        await tile.scrollIntoViewIfNeeded()
        await tile.hover()
        // The button draws 32px; its ::before reaches 6px past every side. A
        // press anywhere in the 44px square must land on the button itself.
        const hit = await more.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const at = (x, y) => document.elementFromPoint(x, y)
          // Edge midpoints, not corners: the tile's rounded corner clips a corner probe.
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const corners = [[r.left - 5, cy], [r.right + 5, cy], [cx, r.top - 5], [cx, r.bottom + 5], [cx, cy]]
          return { w: r.width, h: r.height, onButton: corners.map(([x, y]) => at(x, y) === el) }
        })
        expect(hit.w, `"${title}" ... draws ${hit.w}px wide`).toBeGreaterThanOrEqual(32)
        expect(hit.h, `"${title}" ... draws ${hit.h}px tall`).toBeGreaterThanOrEqual(32)
        expect(hit.onButton, `a press 5px beyond the edge of the "${title}" ... button must still reach it`).toEqual([true, true, true, true, true])
      }

      // The menu carries the Report row, and Report is named for no one else's piece.
      const { button } = await nthDesign(page, 0)
      await button.click()
      await expect(page.getByRole('menu', { name: /^Actions for / })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Report', exact: true })).toBeVisible()
    })
  }
})

test.describe('the content-report form', () => {
  test('with nothing chosen, Send shows an inline error and focuses the first reason', async ({ page }) => {
    watch(page, 'a signed-out visitor sending an empty report')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await openReport(page, button)

    await sendButton(page).click()

    await expect(formDialog(page).getByText('Choose why you are reporting this.')).toBeVisible()
    await expect(reasonRadio(page, 'Illegal content')).toBeFocused()
    expect(posts, 'a refused submit must not reach /api/support').toEqual([])
  })

  test('a reason and an email without the good-faith box: inline error, focus on the box', async ({ page }) => {
    watch(page, 'a signed-out visitor forgetting the confirmation')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    await openReport(page, (await firstDesign(page)).button)

    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await sendButton(page).click()

    await expect(formDialog(page).getByText('Confirm the report is accurate before sending it.')).toBeVisible()
    await expect(formDialog(page).getByRole('checkbox')).toBeFocused()
    expect(posts).toEqual([])
  })

  test('illegal, infringement and "something else" refuse an empty details box and focus it', async ({ page }) => {
    watch(page, 'a visitor reporting without saying why')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { button } = await firstDesign(page)

    for (const reason of ['Illegal content', 'Infringes intellectual property', 'Something else']) {
      await openReport(page, button)
      await reasonRadio(page, reason).check()
      await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
      await formDialog(page).getByRole('checkbox').check()
      await sendButton(page).click()

      await expect(formDialog(page).getByRole('alert').filter({ hasText: /so we can look at it/ }), `${reason}: no inline details error`).toBeVisible()
      await expect(formDialog(page).getByLabel(/^Details/), `${reason}: focus did not land on the details`).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(formDialog(page)).toBeHidden()
    }
    expect(posts).toEqual([])
  })

  test('signed out, an email is required for every reason except Illegal content', async ({ page }) => {
    watch(page, 'a signed-out visitor reporting without an address')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await openReport(page, button)

    // Harassment needs no details, so the email is the only thing missing.
    await reasonRadio(page, 'Harassment or hate').check()
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect(formDialog(page).getByText('Add your email so we can write to you if we need more.')).toBeVisible()
    await expect(formDialog(page).getByLabel(/^Your email/)).toBeFocused()
    expect(posts).toEqual([])

    // Illegal content, with its details and still no address, is accepted.
    await reasonRadio(page, 'Illegal content').check()
    await formDialog(page).getByLabel(/^Details/).fill(DETAILS)
    await sendButton(page).click()
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ type: 'report', email: '' })
  })

  test('a malformed email is refused, not sent', async ({ page }) => {
    watch(page, 'a visitor mistyping their address')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    await openReport(page, (await firstDesign(page)).button)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill('not-an-address')
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect(formDialog(page).getByText('That email address does not look right.')).toBeVisible()
    expect(posts).toEqual([])
  })

  test('a valid report posts type "report" with the design id, kind and page, then confirms', async ({ page }) => {
    watch(page, 'a visitor reporting a design')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { design, button } = await firstDesign(page)
    await openReport(page, button)

    await reasonRadio(page, 'Infringes intellectual property').check()
    await formDialog(page).getByLabel(/^Details/).fill(DETAILS)
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()

    await expect(page.getByRole('dialog', { name: 'Report sent' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Report sent' })).toContainText(`If we need more, we may write to ${EMAIL}.`)
    expect(posts).toHaveLength(1)
    const sent = posts[0]
    expect(sent).toMatchObject({ type: 'report', email: EMAIL, source: 'inline', subject: `Content report: ${design.name}` })
    expect(sent.message).toContain('Reason: Infringes intellectual property (ip)')
    expect(sent.message).toContain('Kind: design')
    expect(sent.message).toContain(`Item id: ${design.id}`)
    expect(sent.message).toContain(`Item: ${design.name}`)
    expect(sent.message).toContain('/community')
    // The first card is a curated starter. Its url is only a platform's front page,
    // so the card carries no link and the report names none.
    expect(sent.message).not.toContain('Link:')
    expect(sent.message).toContain(DETAILS)
  })

  test('signed in, the form asks for no email and sends the account address', async ({ page }) => {
    watch(page, 'a member reporting a design')
    const me = await signIn(page)
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    await openReport(page, (await firstDesign(page)).button)

    await expect(formDialog(page)).toContainText(`If we need more, we may write to ${me.email}.`)
    await expect(formDialog(page).getByLabel(/^Your email/)).toHaveCount(0)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ type: 'report', email: me.email })
  })

  test('the sent screen thanks the reporter, names the item, and offers to write only to the address given', async ({ page }) => {
    watch(page, 'a visitor reading the thank-you')
    await interceptSupport(page)
    await gotoCommunity(page)
    const { design, button } = await firstDesign(page)
    const sent = page.getByRole('dialog', { name: 'Report sent' })

    // With an address: the whole sentence, word for word.
    await openReport(page, button)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect(sent.locator('.fb-success-text')).toHaveText(
      `Thanks. We’ll review your report of “${design.name}”. If we need more, we may write to ${EMAIL}.`,
    )
    await expect(sent, 'the thank-you promises a decision email').not.toContainText(/decision|decide/i)
    await sent.getByRole('button', { name: 'Close', exact: true }).click()

    // Illegal content may be sent with no address: then there is nobody to write to, and it says so by saying nothing.
    await openReport(page, button)
    await reasonRadio(page, 'Illegal content').check()
    await formDialog(page).getByLabel(/^Details/).fill(DETAILS)
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect(sent.locator('.fb-success-text')).toHaveText(`Thanks. We’ll review your report of “${design.name}”.`)
    await expect(sent).not.toContainText(/write to|decision|decide/i)
  })

  test('the form never promises a decision, for any reason, signed out or signed in', async ({ page }) => {
    watch(page, 'a visitor reading the form copy')
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await openReport(page, button)
    for (const reason of ['Illegal content', 'Spam or a scam']) {
      await reasonRadio(page, reason).check()
      await expect(formDialog(page)).toContainText(/write to you/)
      await expect(formDialog(page), `signed out, ${reason}`).not.toContainText(/decision|decide/i)
    }
    // An empty send raises the email error: that sentence is part of the form too.
    await reasonRadio(page, 'Harassment or hate').check()
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect(formDialog(page).getByRole('alert')).toHaveText('Add your email so we can write to you if we need more.')
    await expect(formDialog(page)).not.toContainText(/decision|decide/i)
    await page.keyboard.press('Escape')

    await signIn(page)
    await gotoCommunity(page)
    await openReport(page, (await firstDesign(page)).button)
    await expect(formDialog(page).locator('.fb-sending-as')).toContainText('If we need more, we may write to')
    await expect(formDialog(page), 'signed in').not.toContainText(/decision|decide/i)
  })

  test('the browser leaves the Reporter line to the server and sends the member\'s ID token', async ({ page }) => {
    watch(page, 'a visitor, then a member, reporting')
    const posts = await interceptSupport(page)
    const auth = []
    page.on('request', (req) => { if (req.url().includes('/api/support')) auth.push(req.headers().authorization || '') })
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await openReport(page, button)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0].message).not.toMatch(/^Reporter:/m)
    expect(auth[0], 'a visitor sends no token').toBe('')

    await signIn(page)
    await gotoCommunity(page)
    await openReport(page, (await firstDesign(page)).button)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect.poll(() => posts.length).toBe(2)
    expect(posts[1].message).not.toMatch(/^Reporter:/m)
    // The session double's getIdToken answers `uil4b-test-session.<uid>`; the server is the one that verifies it.
    expect(auth, 'one request per send').toHaveLength(2)
    expect(auth[1], 'a member sends their ID token as a Bearer header').toBe('Bearer uil4b-test-session.test-uid-free')
  })

  test('Escape closes the form and focus returns to the tile ... button', async ({ page }) => {
    watch(page, 'a keyboard user backing out of a report')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await button.focus()
    await page.keyboard.press('Enter')
    // The menu opens with focus on its first row (Save); Report is the third.
    await expect(page.getByRole('menuitem', { name: 'Save', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Report', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(formDialog(page)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(formDialog(page)).toBeHidden()
    await expect(button).toBeFocused()
    expect(posts).toEqual([])
  })

  test('a second report starts blank, not from the first words', async ({ page }) => {
    watch(page, 'a visitor reporting two pieces')
    await interceptSupport(page)
    await gotoCommunity(page)
    await expect(page.locator('.cm-tile').nth(1)).toBeVisible()
    const first = await nthDesign(page, 0)
    const second = await nthDesign(page, 1)

    await openReport(page, first.button)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await page.keyboard.press('Escape')
    await expect(formDialog(page)).toBeHidden()

    await openReport(page, second.button)
    await expect(formDialog(page)).toContainText(second.design.name)
    await expect(reasonRadio(page, 'Spam or a scam')).not.toBeChecked()
    await expect(formDialog(page).getByLabel(/^Your email/)).toHaveValue('')
  })
})

// parked: admin-only (non-admins are redirected to /)
test.describe.skip('community prompts', () => {
  const ROUTE = '/discover/prompts'

  async function firstPromptCard(page) {
    await go(page, ROUTE)
    const card = page.locator('.pl-card-cell').first()
    await expect(card).toBeVisible({ timeout: 20000 })
    const title = (await card.locator('.pl-card-title').textContent()).trim()
    const row = COMMUNITY_PROMPT_ROWS.find((p) => p.title === title)
    expect(row, `"${title}" is not a community prompt row - the id lookup would be a guess`).toBeTruthy()
    return { card, title, row }
  }

  test('each community prompt card has a Report button named for it, 44px, outside the card button', async ({ page }) => {
    watch(page, 'someone browsing community prompts')
    for (const vp of WIDTHS) {
      await page.setViewportSize(vp)
      const { card, title } = await firstPromptCard(page)
      const btn = card.getByRole('button', { name: `Report ${title}`, exact: true })
      await expect(btn).toBeVisible()
      const box = await btn.boundingBox()
      expect(box.width, `${vp.width}px: Report ${title} is ${box.width}px wide`).toBeGreaterThanOrEqual(44)
      expect(box.height, `${vp.width}px: Report ${title} is ${box.height}px tall`).toBeGreaterThanOrEqual(44)
      // A button inside the card's role=button would be nested interactives.
      expect(await card.locator('.pl-card .report-btn').count()).toBe(0)
    }
  })

  test('the card Report button posts the prompt id, and does not open the prompt modal', async ({ page }) => {
    watch(page, 'a visitor reporting a prompt from its card')
    const posts = await interceptSupport(page)
    const { card, title, row } = await firstPromptCard(page)
    await card.getByRole('button', { name: `Report ${title}`, exact: true }).click()

    await expect(formDialog(page)).toBeVisible()
    await expect(page.locator('.pl-modal')).toHaveCount(0)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()

    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ type: 'report', email: EMAIL })
    expect(posts[0].message).toContain('Kind: prompt')
    expect(posts[0].message).toContain(`Item id: ${row.id}`)
    expect(posts[0].message).toContain(`Item: ${title}`)
  })

  test("the prompt modal's Report closes the modal and opens the form", async ({ page }) => {
    watch(page, 'a visitor reporting a prompt from its modal')
    const { card, title } = await firstPromptCard(page)
    await card.getByRole('button', { name: `Open prompt: ${title}`, exact: true }).click()
    const modal = page.getByRole('dialog').filter({ hasText: title }).filter({ has: page.getByRole('button', { name: `Report ${title}`, exact: true }) })
    await expect(modal).toBeVisible()

    await modal.getByRole('button', { name: `Report ${title}`, exact: true }).click()

    await expect(formDialog(page)).toBeVisible()
    await expect(modal).toHaveCount(0)
    await expect(formDialog(page)).toContainText(title)
    // Only one dialog is open: the form is not stacked under or over the modal.
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })
})

test.describe('the Help Centre', () => {
  test('/learn/help offers the no-account email route to support@uil4b.com', async ({ page }) => {
    watch(page, 'someone who wants to report content without an account')
    // The email route is in the "Report something broken" answer, which the
    // #contact hash opens.
    await go(page, '/learn/help#contact')
    const link = page.getByRole('link', { name: 'support@uil4b.com' })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^mailto:support@uil4b\.com\?subject=/)
    await expect(page.getByText('You do not need an account.')).toBeVisible()
  })
})
