// REPORTING COMMUNITY CONTENT.
//
// Anyone can report a community design or prompt: there is a "Report <name>"
// button on every card (and in the prompt modal), it opens one form, and the
// form posts to /api/support as type 'report'. This file holds the promises
// that are easy to break without a build error:
//
//   - every card has the control, named for its item, with a 44x44 target at
//     phone, tablet and desktop widths, and it does not sit on the monogram;
//   - the form refuses an incomplete report INLINE and moves focus to the first
//     field that is wrong, in the order it is read;
//   - a signed-out reporter must leave an email, except for "Illegal content"
//     (the one reason that may be sent without an address);
//   - a valid report reaches /api/support with the item's id, kind and page;
//   - Escape closes the form and gives focus back to the Report button;
//   - the prompt modal's Report closes the modal and opens the form;
//   - the Help Centre offers the no-account email route.
//
// /api/support is ALWAYS intercepted. Nothing here reaches a real endpoint, and
// a test that expects no request asserts the ledger is empty.
//
// MUTATIONS this file was seen to fail under (one each, restored after):
//   src/utils/contentReport.js  `reason.id !== 'illegal'` -> `true` in the email
//        rule            fails "illegal content may be sent without an email".
//   src/components/ContentReportDialog.jsx  drop the `.focus()` call in the
//        `!check.ok` branch      fails the three "focus lands on ..." tests.
//   src/styles/global.css  `.report-btn--icon{min-width:44px;min-height:44px}`
//        -> 28px                 fails "every design card's Report button is a
//        44px target" at all three widths.
//   src/components/prompt/PromptModal.jsx  remove `beforeOpen={onClose}`
//        fails "the prompt modal's Report closes the modal ...".
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'
import { COMMUNITY_DESIGNS } from '../../src/data/communityDesigns.js'
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
  await expect(page.locator('.ch-card').first()).toBeVisible({ timeout: 20000 })
}

/** The first design card's Report button, and the design it belongs to. */
async function firstDesign(page) {
  const name = (await page.locator('.ch-card .ch-card-name').first().textContent()).trim()
  const design = COMMUNITY_DESIGNS.find((d) => d.name === name)
  expect(design, `"${name}" on /community is not in the curated list - the id lookup would be a guess`).toBeTruthy()
  return { design, button: page.getByRole('button', { name: `Report ${name}`, exact: true }) }
}

test.describe('every community design card has a Report control', () => {
  for (const vp of WIDTHS) {
    test(`/community at ${vp.width}px: each card has "Report <name>", a 44px target clear of the monogram`, async ({ page }) => {
      watch(page, `someone browsing community designs at ${vp.width}px`)
      await page.setViewportSize(vp)
      await gotoCommunity(page)

      const cards = await page.evaluate(() => [...document.querySelectorAll('.ch-card')].map((card) => {
        const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }
        const btn = card.querySelector('.report-btn')
        const mono = card.querySelector('.ch-thumb-mono')
        return {
          name: card.querySelector('.ch-card-name')?.textContent.trim(),
          label: btn?.getAttribute('aria-label') || null,
          btn: btn ? box(btn) : null,
          chip: btn ? box(btn.querySelector('.report-btn-chip')) : null,
          mono: mono ? box(mono) : null,
        }
      }))

      // Positive control: an empty grid would make every check below vacuous.
      expect(cards.length, 'no community card rendered - nothing below would be tested').toBeGreaterThan(0)

      for (const c of cards) {
        expect(c.label, `the card "${c.name}" has no Report button`).toBe(`Report ${c.name}`)
        expect(c.btn.w, `Report ${c.name} is ${c.btn.w}px wide`).toBeGreaterThanOrEqual(44)
        expect(c.btn.h, `Report ${c.name} is ${c.btn.h}px tall`).toBeGreaterThanOrEqual(44)
        // The visible chip is smaller than its target; it must not cover the monogram.
        if (c.mono) {
          const overlaps = c.chip.x < c.mono.x + c.mono.w && c.chip.x + c.chip.w > c.mono.x
            && c.chip.y < c.mono.y + c.mono.h && c.chip.y + c.chip.h > c.mono.y
          expect(overlaps, `the Report chip on "${c.name}" covers its monogram`).toBe(false)
        }
      }
    })
  }
})

test.describe('the content-report form', () => {
  test('with nothing chosen, Send shows an inline error and focuses the first reason', async ({ page }) => {
    watch(page, 'a signed-out visitor sending an empty report')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await button.click()
    await expect(formDialog(page)).toBeVisible()

    await sendButton(page).click()

    await expect(formDialog(page).getByText('Choose why you are reporting this.')).toBeVisible()
    await expect(reasonRadio(page, 'Illegal content')).toBeFocused()
    expect(posts, 'a refused submit must not reach /api/support').toEqual([])
  })

  test('a reason and an email without the good-faith box: inline error, focus on the box', async ({ page }) => {
    watch(page, 'a signed-out visitor forgetting the confirmation')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    await (await firstDesign(page)).button.click()

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
      await button.click()
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
    await button.click()

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
    await (await firstDesign(page)).button.click()
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
    await button.click()

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
    expect(sent.message).toContain(`Link: ${design.url}`)
    expect(sent.message).toContain(DETAILS)
  })

  test('signed in, the form asks for no email and sends the account address', async ({ page }) => {
    watch(page, 'a member reporting a design')
    const me = await signIn(page)
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    await (await firstDesign(page)).button.click()

    await expect(formDialog(page)).toContainText(`If we need more, we may write to ${me.email}.`)
    await expect(formDialog(page).getByLabel(/^Your email/)).toHaveCount(0)
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByRole('checkbox').check()
    await sendButton(page).click()
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ type: 'report', email: me.email })
  })

  test('Escape closes the form and focus returns to the Report button', async ({ page }) => {
    watch(page, 'a keyboard user backing out of a report')
    const posts = await interceptSupport(page)
    await gotoCommunity(page)
    const { button } = await firstDesign(page)
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(formDialog(page)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(formDialog(page)).toBeHidden()
    await expect(button).toBeFocused()
    expect(posts).toEqual([])
  })

  test('a second report starts blank, not from the first one\'s words', async ({ page }) => {
    watch(page, 'a visitor reporting two designs')
    await interceptSupport(page)
    await gotoCommunity(page)
    const cards = page.locator('.ch-card')
    await expect(cards.nth(1)).toBeVisible()

    await cards.nth(0).locator('.report-btn').click()
    await reasonRadio(page, 'Spam or a scam').check()
    await formDialog(page).getByLabel(/^Your email/).fill(EMAIL)
    await page.keyboard.press('Escape')
    await expect(formDialog(page)).toBeHidden()

    await cards.nth(1).locator('.report-btn').click()
    await expect(reasonRadio(page, 'Spam or a scam')).not.toBeChecked()
    await expect(formDialog(page).getByLabel(/^Your email/)).toHaveValue('')
  })
})

test.describe('community prompts', () => {
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
    await go(page, '/learn/help')
    const link = page.getByRole('link', { name: 'support@uil4b.com' })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^mailto:support@uil4b\.com\?subject=/)
    await expect(page.getByText('You do not need an account.')).toBeVisible()
  })
})
