// The export gallery that ends the brand-kit walkthrough, /projects/:id/export.
//
//   - Save at the end of the walkthrough lands on the gallery;
//   - the default pick is the book as a PDF, and a free account sees the trial button;
//   - that button goes to /checkout?plan=yearly&from=kit-gallery;
//   - a free pick (the UI kit) downloads at once;
//   - "Not now" opens the project;
//   - a free account is sent only blurred raster previews and never asks for a Pro file;
//   - at the free cap the walkthrough keeps its cap message and never opens the gallery;
//   - the fixed bar never covers the last line at 320, 390, 768 and 1440;
//   - the keyboard reaches design, file, "Not now" and the button, in that order;
//   - the trial line always carries the cancel-before promise, Rename is there and a second "Open project" is not;
//   - at 1440 the three frames are one height and the cards start where the bar's content starts;
//   - "Back to your export" on the checkout return page is only for the account and project that made the pick;
//   - a Pro account's default pick exports through the server.
//
// MUTATION (each break must fail the test named after it):
//   - Point the walkthrough's navigate() back at /projects/:id: "the walkthrough ends on the gallery" fails.
//   - Change the default in utils/kitGalleryPick.js: "the default pick" fails.
//   - Draw the previews with blurred={false} for a free account: "a free account is sent only blurred
//     previews" fails.
//   - Drop the bottom padding on .pxg: "the fixed bar never covers" fails at the width it overflows.
//   - Remove `.app-page:has(>.pxg){max-width:none;padding-inline:0}`: the 1440 test fails (cards start at x=182).
//   - Drop the uid or project check in CheckoutReturn.jsx: "Back to your export" test fails.
//   - Move reservePrintWindow back after the gate: nothing here sees it (Safari only); see utils/exportDocument.js.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
const nameForm = (page) => page.getByRole('dialog', { name: 'Name your project' })
const GALLERY = '/projects/seed-1/export'
const SIZES = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

async function walkToSave(page) {
  await page.addInitScript(() => {
    try { if (window.innerWidth < 900 && !localStorage.getItem('vs-uikit-guide')) localStorage.setItem('vs-uikit-guide', '1') } catch { /* blocked */ }
  })
  await go(page, '/create/palette')
  if (!(await rail(page).count())) {
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.locator('.pnav-editorial-cta').click()
  }
  await expect(rail(page)).toBeVisible()
  for (const [button, url] of [
    [/^Next: Fonts/, /\/create\/font-pair$/],
    [/^Next: Type scale/, /\/create\/type-scale$/],
    [/^Next: Icons/, /\/create\/icons$/],
  ]) {
    await rail(page).getByRole('button', { name: button }).click()
    await expect(page).toHaveURL(url)
  }
  await rail(page).getByRole('button', { name: /^Name your project/ }).click()
  await nameForm(page).getByRole('textbox', { name: 'Project name' }).fill('Harbour Studio')
  await nameForm(page).getByRole('button', { name: 'Save project' }).click()
}

const cta = (page) => page.locator('.pxg-cta')

test.describe('the export gallery', () => {
  test('the walkthrough ends on the gallery, with the project already saved', async ({ page }) => {
    watch(page, 'a free designer finishing the brand kit')
    await signIn(page, { plan: 'free', projects: 0 })
    await walkToSave(page)
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+\/export$/)
    await expect(page.getByRole('heading', { name: 'Choose a design for Harbour Studio' })).toBeVisible()
    const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat())
    expect(saved).toHaveLength(1)
  })

  test('the default pick is the book as a PDF and a free account sees the trial button', async ({ page }) => {
    watch(page, 'a free designer on the gallery')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(page.getByRole('radio', { name: /Design system book/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: /PDF/ })).toBeChecked()
    await expect(cta(page)).toHaveText('Continue for 7-day free trial')
  })

  test('the trial line always carries the cancel-before promise; Rename is there and a second "Open project" is not', async ({ page }) => {
    watch(page, 'a free designer reading the trial terms')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toBeEnabled()
    await expect(page.locator('.pxg-price')).toContainText(/Cancel before .+ and you pay nothing\./)
    await expect(page.locator('.pxg-saved').getByRole('button', { name: 'Rename' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Open project$/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Not now/ })).toBeVisible()
  })

  test('Rename changes the project name in place', async ({ page }) => {
    watch(page, 'a free designer renaming from the gallery')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await page.locator('.pxg-saved').getByRole('button', { name: 'Rename' }).click()
    await page.getByRole('textbox', { name: /^Rename / }).fill('Renamed Studio')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose a design for Renamed Studio' })).toBeVisible()
  })

  test('1440px: the three frames are one height and the cards start where the bar content starts', async ({ page }) => {
    watch(page, 'a designer at 1440px')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toBeEnabled()
    const m = await page.evaluate(() => {
      const heights = [...document.querySelectorAll('.pxg-frame')].map((f) => f.getBoundingClientRect().height)
      const card = document.querySelector('.pxg-card').getBoundingClientRect()
      const bar = document.querySelector('.pxg-bar')
      const barLeft = bar.getBoundingClientRect().left + parseFloat(getComputedStyle(bar).paddingLeft)
      return { heights, card: card.left, barLeft }
    })
    expect(m.heights).toHaveLength(3)
    expect(Math.max(...m.heights) - Math.min(...m.heights), `frame heights ${m.heights}`).toBeLessThanOrEqual(1)
    expect(Math.abs(m.card - m.barLeft), `card left ${m.card}, bar content left ${m.barLeft}`).toBeLessThanOrEqual(2)
  })

  test('the trial button goes to checkout on the yearly plan, marked as from the gallery', async ({ page }) => {
    watch(page, 'a free designer choosing a Pro file')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toBeEnabled()
    await cta(page).click()
    await expect(page).toHaveURL(/\/checkout\?plan=yearly&from=kit-gallery$/)
    await expect(page.getByRole('link', { name: /Back to Plans/ })).toBeVisible()
  })

  test('a free pick exports straight away', async ({ page }) => {
    watch(page, 'a free designer exporting the UI kit')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await page.getByRole('radio', { name: /UI kit/ }).check({ force: true })
    await expect(cta(page)).toHaveText('Export HTML')
    const [file] = await Promise.all([page.waitForEvent('download'), cta(page).click()])
    expect(file.suggestedFilename()).toMatch(/\.(html|zip)$/)
    await expect(cta(page)).toHaveText('Export again')
  })

  test('"Not now" opens the project', async ({ page }) => {
    watch(page, 'a free designer leaving the gallery')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await page.getByRole('link', { name: /^Not now/ }).click()
    await expect(page).toHaveURL(/\/projects\/seed-1$/)
  })

  test('a free account is sent only blurred previews and never asks for a Pro file', async ({ page }) => {
    watch(page, 'a free account looking at Pro designs')
    const asked = []
    await page.route('**/api/ai?export=document', (route) => { asked.push(route.request().url()); route.abort() })
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    const thumbs = page.locator('.pxg-card--book .exp-thumb[data-blurred]')
    await expect(thumbs).toHaveCount(3)
    for (const img of await page.locator('.pxg-card--book img, .pxg-card--guidelines img').all()) {
      await expect(img).toHaveAttribute('data-blurred', 'true')
      expect(await img.getAttribute('src')).toMatch(/^blob:/)
      expect(await img.evaluate((el) => el.naturalWidth)).toBeLessThanOrEqual(400)
    }
    await cta(page).click()
    // The click's only effect is the trip to checkout; wait for it, then look at what was asked.
    await expect(page).toHaveURL(/\/checkout\?plan=yearly&from=kit-gallery$/)
    expect(asked, 'a free account asked the server for a Pro file').toHaveLength(0)
  })

  test('a Pro account on the default pick exports through the server', async ({ page }) => {
    watch(page, 'a Pro subscriber exporting the book from the gallery')
    await page.addInitScript(() => { window.print = () => {} })
    const asked = []
    await page.route('**/api/ai?export=document', async (route) => {
      const req = route.request()
      asked.push({ method: req.method(), auth: req.headers().authorization, body: req.postDataJSON() })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, format: 'book', html: buildDesignSystemBook({ palette: { base: '#1F4B8E', colors: ['#1F4B8E', '#3FA9A0'] } }, { projectName: 'Stub' }) }),
      })
    })
    await signIn(page, { plan: 'pro', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toHaveText('Export PDF')
    await expect(cta(page)).toBeEnabled()
    const [doc] = await Promise.all([page.context().waitForEvent('page'), cta(page).click()])
    await expect(doc.locator('.cv-title')).toBeVisible()
    expect(asked, 'the gallery must ask the server exactly once').toHaveLength(1)
    expect(asked[0].method).toBe('POST')
    expect(asked[0].auth).toMatch(/^Bearer .+/)
    expect(asked[0].body.format).toBe('book')
  })

  test('"Back to your export" is only for the account and project that made the pick', async ({ browser }) => {
    const PAID = JSON.stringify({ status: 'complete', mode: 'subscription', customerEmail: 'free.user@uil4b.test', subscriptionActive: true })
    const visit = async (pickFor) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      watch(page, 'a buyer returning from checkout')
      await page.route('**/api/checkout-status**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: PAID }))
      const session = await signIn(page, { plan: 'free', projects: 1 })
      const pick = pickFor(session.uid)
      await page.addInitScript((value) => { sessionStorage.setItem('uil4b.kitGalleryPick', JSON.stringify({ ...value, at: Date.now() })) }, pick)
      await go(page, '/checkout/return?session_id=cs_test_paid')
      await expect(page.locator('main h1')).toContainText('You’re on UIL4B Pro')
      return { context, page }
    }
    const back = (page) => page.getByRole('link', { name: 'Back to your export' })

    // Control: the same account, a project it has. The link is there, so "absent" below means something.
    const own = await visit((uid) => ({ projectId: 'seed-1', design: 'book', format: 'pdf', uid }))
    await expect(back(own.page)).toBeVisible()
    await expect(back(own.page)).toHaveAttribute('href', '/projects/seed-1/export')
    await own.context.close()

    const foreign = await visit(() => ({ projectId: 'seed-1', design: 'book', format: 'pdf', uid: 'someone-else' }))
    await expect(foreign.page.getByRole('link', { name: 'Start building' })).toBeVisible()
    await expect(back(foreign.page)).toHaveCount(0)
    await foreign.context.close()

    const gone = await visit((uid) => ({ projectId: 'deleted-project', design: 'book', format: 'pdf', uid }))
    await expect(gone.page.getByRole('link', { name: 'Start building' })).toBeVisible()
    await expect(back(gone.page)).toHaveCount(0)
    await gone.context.close()
  })

  test('at the free cap the walkthrough shows the cap message and never opens the gallery', async ({ page }) => {
    watch(page, 'a free designer with three projects')
    await signIn(page, { plan: 'free', projects: 3 })
    await walkToSave(page)
    const refusal = page.getByTestId('brand-kit-save-refusal')
    await expect(refusal).toContainText('Free plan saves up to 3 projects')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(page).not.toHaveURL(/\/export$/)
  })

  for (const size of SIZES) {
    test(`${size.width}px: the fixed bar never covers the last line`, async ({ page }) => {
      watch(page, `a designer at ${size.width}px`)
      await page.setViewportSize(size)
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, GALLERY)
      await expect(cta(page)).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const gap = await page.evaluate(() => {
        const note = document.querySelector('.pxg-note').getBoundingClientRect()
        const bar = document.querySelector('.pxg-bar').getBoundingClientRect()
        return bar.top - note.bottom
      })
      expect(gap, 'the note sits under the bar').toBeGreaterThanOrEqual(0)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
      await page.screenshot({ path: `.claude/scratch/kitgallery/gallery-${size.width}.png` })
    })
  }

  test('the keyboard reaches design, file, Not now and the button in order', async ({ page }) => {
    watch(page, 'a keyboard user on the gallery')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, GALLERY)
    await expect(cta(page)).toBeEnabled()
    await page.locator('.pxg-saved button').focus()
    const order = []
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      order.push(await page.evaluate(() => {
        const el = document.activeElement
        return el.name === 'pxg-design' ? 'design' : el.name === 'pxg-format' ? 'file' : el.classList.contains('pxg-not') ? 'not-now' : el.classList.contains('pxg-cta') ? 'cta' : el.className || el.tagName
      }))
    }
    const seq = order.filter((s) => ['design', 'file', 'not-now', 'cta'].includes(s))
    expect(seq.slice(0, 1)).toEqual(['design'])
    expect(seq.indexOf('file')).toBeGreaterThan(seq.indexOf('design'))
    expect(order.indexOf('not-now')).toBeGreaterThan(order.indexOf('file'))
    expect(order.indexOf('cta')).toBeGreaterThan(order.indexOf('not-now'))
  })
})
