// A CLEAR WAY TO CONTACT SUPPORT.
//
// A visitor who wants a person has one labelled path, and it opens the feedback
// form set up for a help request:
//   - /feedback?type=help shows "Contact support" copy with Help request
//     selected; choosing another type swaps the copy, and back again;
//   - the Help centre has a "Contact support" link near the top, at 390 and 1440;
//   - the Info centre's Troubleshooting section ends with "Still stuck? Contact
//     support";
//   - /contact lands on the form with Help request selected;
//   - on a phone, the menu sheet's "Send feedback" row sits above the tab bar
//     once the sheet is scrolled to it.
//
// Nothing here sends a message; /api/support is never reached.
//
// To see a test go red, break one of these:
//   src/utils/feedbackCopy.js          return FEEDBACK_KEYS for help
//                                      fails the two /feedback?type=help tests
//   src/data/legacyRoutes.js           delete the '/contact' pair
//                                      fails "/contact lands on the form"
//   src/pages/HelpCentre.jsx           delete the .hlp-contact line
//                                      fails both Help centre tests
//   src/pages/InfoCentre.jsx           delete the .ic-still-stuck line
//                                      fails the Info centre test
//   src/styles/global.css              set `.pnav-sheet{bottom:0}` on a phone
//                                      fails the phone sheet test
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const CONTACT_URL = '/feedback?type=help'
const helpRadio = (page) => page.getByRole('radio', { name: 'Help request' })
const message = (page) => page.getByLabel('Message')

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
const DESKTOP = { viewport: { width: 1440, height: 900 } }

/** The help copy is on screen and Help request is the one chosen type. */
async function expectHelpCopy(page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Contact support' })).toBeVisible()
  await expect(helpRadio(page)).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
  await expect(message(page)).toHaveAttribute('placeholder', /what were you trying to do/i)
}

test.describe('the feedback form opened for help', () => {
  test.beforeEach(({ page }) => { watch(page, 'a visitor who wants to contact support') })

  test('/feedback?type=help shows the support copy with Help request selected', async ({ page }) => {
    await go(page, CONTACT_URL)
    await expectHelpCopy(page)
    // Not the feedback copy.
    await expect(page.getByRole('heading', { level: 1, name: 'Feedback', exact: true })).toHaveCount(0)
    await expect(message(page)).not.toHaveAttribute('placeholder', /what you think/i)
  })

  test('switching the type swaps the copy, and switching back restores it', async ({ page }) => {
    await go(page, CONTACT_URL)
    await expectHelpCopy(page)

    await page.getByRole('radio', { name: 'Feature request' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Feedback', exact: true })).toBeVisible()
    await expect(message(page)).toHaveAttribute('placeholder', /what you think/i)
    await expect(page.getByRole('heading', { level: 1, name: 'Contact support' })).toHaveCount(0)

    await helpRadio(page).click()
    await expectHelpCopy(page)
  })

  test('plain /feedback still opens as feedback, and choosing Help request changes the copy', async ({ page }) => {
    await go(page, '/feedback')
    await expect(page.getByRole('heading', { level: 1, name: 'Feedback', exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Feature request' })).toHaveAttribute('aria-checked', 'true')
    await helpRadio(page).click()
    await expectHelpCopy(page)
  })

  test('a draft typed under Help request survives switching types', async ({ page }) => {
    await go(page, CONTACT_URL)
    await message(page).fill('I could not export my palette.')
    await page.getByRole('radio', { name: 'Bug report' }).click()
    await expect(message(page)).toHaveValue('I could not export my palette.')
  })

  test('/contact lands on the form with Help request selected', async ({ page }) => {
    await go(page, '/contact')
    await expect(page).toHaveURL(/\/feedback\?type=help$/)
    await expectHelpCopy(page)
  })

  test('/contact keeps a query the visitor arrived with', async ({ page }) => {
    await go(page, '/contact?utm_source=mail')
    await expect(page).toHaveURL(/\/feedback\?(?=.*type=help)(?=.*utm_source=mail)/)
    await expectHelpCopy(page)
  })
})

for (const [name, context] of [['390 phone', PHONE], ['1440 desktop', DESKTOP]]) {
  test.describe(`the Help centre, ${name}`, () => {
    test.use(context)

    test('has a Contact support link near the top that opens the form on Help request', async ({ page }) => {
      watch(page, 'a visitor looking for a person on the Help centre')
      await go(page, '/help')
      const link = page.locator('.hlf').getByRole('link', { name: 'Contact support', exact: true })
      await expect(link).toHaveCount(1)
      await expect(link).toHaveAttribute('href', CONTACT_URL)
      await expect(link).toBeVisible()

      // On the first screen, with no scrolling. A phone (coarse pointer) gets a 44px target; from 768 with a
      // pointer the board's pill is 36px high (help-router.css), still above WCAG 2.2's 24px floor.
      const box = await link.boundingBox()
      expect(box.y + box.height, 'the link is below the first screen').toBeLessThanOrEqual(context.viewport.height)
      const floor = context.viewport.width < 768 ? 44 : 36
      expect(box.height, `the link is under ${floor}px high`).toBeGreaterThanOrEqual(floor)

      await link.click()
      await expect(page).toHaveURL(/\/feedback\?type=help$/)
      await expectHelpCopy(page)
    })

    test('keeps the content-report email under "Report something broken"', async ({ page }) => {
      watch(page, 'a visitor reporting content')
      await go(page, '/learn/help#contact')
      const report = page.locator('#contact')
      await expect(report.getByRole('link', { name: 'support@uil4b.com' })).toHaveAttribute('href', /^mailto:support@uil4b\.com\?subject=Content%20report/)
    })
  })
}

for (const [name, context] of [['390 phone', PHONE], ['1440 desktop', DESKTOP]]) {
  test.describe(`the Info centre, ${name}`, () => {
    test.use(context)

    test('Troubleshooting ends with a Still stuck? Contact support link', async ({ page }) => {
      watch(page, 'a visitor whose tool is not working')
      await go(page, '/info')
      const head = page.locator('#ic-head-troubleshooting')
      if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
      await expect(head).toHaveAttribute('aria-expanded', 'true')

      const section = page.locator('#troubleshooting')
      const line = section.locator('.ic-still-stuck')
      await expect(line).toContainText('Still stuck?')
      const link = line.getByRole('link', { name: 'Contact support', exact: true })
      await expect(link).toHaveAttribute('href', CONTACT_URL)
      await link.scrollIntoViewIfNeeded()
      expect((await link.boundingBox()).height, 'the link is under 44px high').toBeGreaterThanOrEqual(44)

      // It is the last thing in the section, after the four tips.
      const tips = await section.locator('ul > li').count()
      expect(tips).toBe(4)
      const lastIsLine = await section.evaluate((el) => {
        const body = el.querySelector('.ic-acc-body-inner')
        return body.lastElementChild.classList.contains('ic-still-stuck')
      })
      expect(lastIsLine, 'Still stuck? is not the last line of Troubleshooting').toBe(true)

      await link.click()
      await expect(page).toHaveURL(/\/feedback\?type=help$/)
      await expectHelpCopy(page)
    })
  })
}

test.describe('the phone menu sheet', () => {
  test.use(PHONE)

  test('Send feedback sits above the tab bar once the sheet is scrolled to it', async ({ page }) => {
    watch(page, 'a phone visitor looking for feedback from a tool page')
    await go(page, '/create/palette')
    await page.getByRole('button', { name: 'Open menu' }).tap()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    await sheet.locator('.pnav-acc-trigger', { hasText: 'Learn' }).tap()
    await expect(sheet.locator('.pnav-acc-trigger[aria-expanded="true"]')).toHaveText('Learn')

    const row = sheet.getByRole('link', { name: 'Send feedback' })
    await expect(row).toHaveCount(1)
    // Scrolled the way a thumb would: to the end of the sheet.
    await sheet.evaluate((el) => { el.scrollTop = el.scrollHeight })

    const tabs = page.locator('.pnav-tabs')
    await expect(tabs).toBeVisible()
    await expect.poll(async () => {
      const r = await row.boundingBox()
      const t = await tabs.boundingBox()
      return r.y + r.height <= t.y
    }, { message: 'the Send feedback row runs under the tab bar' }).toBe(true)

    // The whole sheet ends at the bar, not under it, and the row is a 44px target.
    const sheetBox = await sheet.boundingBox()
    const tabBox = await tabs.boundingBox()
    expect(sheetBox.y + sheetBox.height, 'the sheet runs under the tab bar').toBeLessThanOrEqual(tabBox.y + 1)
    expect((await row.boundingBox()).height).toBeGreaterThanOrEqual(44)

    // And it still goes to the form.
    await row.tap()
    await expect(page).toHaveURL(/\/feedback$/)
  })
})
