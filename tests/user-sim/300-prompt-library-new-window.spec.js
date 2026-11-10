// PROMPT LIBRARY: OPEN IN NEW WINDOW, AND THE FULL-SCREEN VIEW IT OPENS.
//
// The toolbar carries one 44px icon button, "Open in new window". It calls
// window.open(url, '_blank', 'noopener') on the same page with `?view=full`
// (and the list the visitor is reading, the hash). That address renders the same
// library with no site nav and no footer, filling the window. In it the button is
// replaced by a link back to the normal page. The admin-only gate is unchanged:
// anyone the route turns away still gets the not-found page, with the nav.
//
// The list state lives in the hash and the flag in the query, so every hash move
// (View more, a chip, Back to overview, the first keystroke of a search) has to
// carry the query along or entering a list would quietly bring the nav back. That
// is what the "stays full-screen" test pins.
//
// Only an admin can open /discover/prompts, so every library page here signs in as the admin.
// The admin plan is Pro, so this file says nothing about Free or signed-out gating of the prompts.
//
// MUTATIONS (each one turns a test below red):
//   drop the button from PromptFilters' search row (windowAction)  -> "the button is in the toolbar"
//   the button loses its aria-label                                -> "the button is in the toolbar"
//   .pl-win-btn width/min-height under 44px                        -> "the button is in the toolbar"
//   .pl-win-btn drops align-self / the row wraps (flex-wrap)       -> "the button is in the toolbar"
//   the toolbar wraps at 390 (button given a label)                -> "the button is in the toolbar"
//   window.open(url, '_blank') without 'noopener'                   -> "opens the full-screen view" (both)
//   fullViewHref drops the hash or the query                       -> "opens the full-screen view" (both)
//   PromptWindowButton opens in the same window (location.assign)  -> "a real window opens"
//   App.jsx keeps <PillNav /> or <AppFooter /> when fullScreen     -> "no nav, no footer"
//   drop `.app-page--full{max-width:none}` from global.css         -> "no nav, no footer" (1440 width)
//   drop `html[data-view="full"]{--nav-h:0px}` from global.css     -> "no nav, no footer" (top padding)
//   PromptLibrary navigates with { hash } alone (no toHash search) -> "stays full-screen"
//   the full view keeps the open button                            -> "the way back"
//   the back link keeps ?view=full, or drops the hash              -> "the way back"
//   the full view lets a non-admin past RequireAdmin               -> "the gate"
//   wantsFullView ignores the path                                 -> "the gate" (palettes keep their nav)
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const ROUTE = '/discover/prompts'
const FULL = `${ROUTE}?view=full`
const OPEN_NAME = 'Open in new window'
const BACK_NAME = 'Back to the normal page'

const WIDTHS = [
  { width: 1440, height: 900, where: 'top' },
  { width: 768, height: 1024, where: 'top' },
  { width: 390, height: 844, where: 'bottom' },
]

// A fresh admin page at a width, so no state leaks between widths.
async function adminAt(browser, { width, height }, who) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  await signIn(page, { admin: true })
  watch(page, who)
  return { context, page }
}

const toolbar = (page) => page.locator('#pl-toolbar')
const openButton = (page) => toolbar(page).getByRole('button', { name: OPEN_NAME, exact: true })
const backLink = (page) => toolbar(page).getByRole('link', { name: BACK_NAME, exact: true })
const urlOf = (page) => new URL(page.url())

// The View more that is displayed at this width (top right above 640px, at the
// foot of the section at 640 and below).
const viewMore = (page, slug, where) => page.locator(`#pl-shelf-${slug} .pl-viewmore--${where}`)

for (const { width, height, where } of WIDTHS) {
  test(`the button is in the toolbar: named, 44px, on the one row — ${width}px`, async ({ browser }) => {
    const { context, page } = await adminAt(browser, { width, height }, `an admin looking for a way to open the prompt library in its own window at ${width}px`)
    await go(page, ROUTE)
    await expect(page.locator('.pl-overview')).toBeVisible()

    // Overview state: the toolbar is the search row and the button.
    const button = openButton(page)
    await expect(button, 'no Open in new window button in the toolbar').toBeVisible()
    await expect(button).toHaveAttribute('aria-label', OPEN_NAME)
    const b = await button.boundingBox()
    expect(b.width, 'target width').toBeGreaterThanOrEqual(44)
    expect(b.height, 'target height').toBeGreaterThanOrEqual(44)

    const search = await toolbar(page).locator('.pl-search').boundingBox()
    expect(b.x, 'the button sits after the search field, not over it').toBeGreaterThanOrEqual(search.x + search.width - 1)
    // One row: the two share a band of the page.
    expect(b.y, 'the button is on the search row').toBeLessThan(search.y + search.height)
    expect(b.y + b.height).toBeGreaterThan(search.y)
    const row = await toolbar(page).locator('.pl-tb-search').boundingBox()
    expect(row.height, 'the search row grew a second line').toBeLessThanOrEqual(52)

    // The list state adds Filters at 640 and below: three controls, still one row.
    await viewMore(page, 'website', where).click()
    await expect(page.locator('#pl-results-h')).toHaveText('Website')
    await expect(button).toBeVisible()
    const listRow = await toolbar(page).locator('.pl-tb-search').boundingBox()
    expect(listRow.height, 'the search row grew a second line in the list').toBeLessThanOrEqual(52)
    if (width <= 640) {
      // Read together, in one frame: the list move scrolls the page, and two separate
      // reads can straddle that scroll.
      const gap = await toolbar(page).evaluate((bar) => {
        const f = bar.querySelector('.pl-filters-btn').getBoundingClientRect()
        const b = bar.querySelector('.pl-win-btn').getBoundingClientRect()
        return { dy: Math.abs(b.top - f.top), overlap: f.right - 1 - b.left }
      })
      expect(gap.dy, 'Filters and the button are on one row').toBeLessThanOrEqual(8)
      expect(gap.overlap, 'the button does not overlap Filters').toBeLessThanOrEqual(0)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    await context.close()
  })
}

test('the button opens the full-screen view with window.open(url, "_blank", "noopener")', async ({ browser }) => {
  const { context, page } = await adminAt(browser, WIDTHS[0], 'an admin opening the prompt library in a new window')
  // Record the call instead of opening anything, so the arguments themselves are the assertion.
  await page.addInitScript(() => {
    window.__opened = []
    window.open = (...args) => { window.__opened.push(args); return null }
  })
  await go(page, ROUTE)
  await expect(page.locator('.pl-overview')).toBeVisible()

  await openButton(page).click()
  let calls = await page.evaluate(() => window.__opened)
  expect(calls, 'one click, one window').toHaveLength(1)
  expect(calls[0][1], 'target').toBe('_blank')
  expect(calls[0][2], 'features: no opener handle back on this window').toBe('noopener')
  let opened = new URL(calls[0][0], page.url())
  expect(opened.pathname).toBe(ROUTE)
  expect(opened.searchParams.get('view'), 'the full-screen flag').toBe('full')
  expect(opened.hash, 'the overview has no hash').toBe('')
  expect(urlOf(page).search, 'this window did not move').toBe('')

  // Inside a list the new window opens on the same list.
  await viewMore(page, 'website', 'top').click()
  await expect(page.locator('#pl-results-h')).toHaveText('Website')
  await page.evaluate(() => { window.__opened = [] })
  await openButton(page).click()
  calls = await page.evaluate(() => window.__opened)
  expect(calls).toHaveLength(1)
  expect(calls[0].slice(1)).toEqual(['_blank', 'noopener'])
  opened = new URL(calls[0][0], page.url())
  expect(opened.pathname + opened.search + opened.hash, 'the list the visitor is reading comes along').toBe(`${FULL}#website`)
  await context.close()
})

test('a real window opens on the full-screen address and has no opener', async ({ browser }) => {
  const { context, page } = await adminAt(browser, WIDTHS[0], 'an admin opening the prompt library in a real second window')
  await go(page, ROUTE)
  await expect(page.locator('.pl-overview')).toBeVisible()
  const before = page.url()

  const [popup] = await Promise.all([context.waitForEvent('page'), openButton(page).click()])
  // The window is a second page; it is not signed in (the double is per page), so
  // only its address and its opener are asserted here. Its content is the next tests.
  await popup.waitForLoadState('domcontentloaded')
  const u = new URL(popup.url())
  expect(u.pathname).toBe(ROUTE)
  expect(u.search).toBe('?view=full')
  expect(await popup.evaluate(() => window.opener), 'noopener: no handle back on the first window').toBeNull()
  expect(page.url(), 'the first window stayed where it was').toBe(before)
  await popup.close()
  await context.close()
})

for (const { width, height } of WIDTHS) {
  test(`the full-screen view: no nav, no footer, the same library, the window filled — ${width}px`, async ({ browser }) => {
    const { context, page } = await adminAt(browser, { width, height }, `an admin in the full-screen prompt library at ${width}px`)

    // The normal page first, as the control: the nav and footer exist and the shelves are these.
    await go(page, ROUTE)
    await expect(page.locator('.pl-overview')).toBeVisible()
    await expect(page.locator('.pnav'), 'the normal page has its nav').toHaveCount(1)
    const shelvesNormal = await page.locator('[id^="pl-shelf-"]').evaluateAll((els) => els.map((e) => e.id))
    expect(shelvesNormal.length, 'the control page has shelves to compare').toBeGreaterThan(3)
    const normalPad = await page.locator('main#main').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))

    await go(page, FULL)
    await expect(page.locator('.plib-page h1'), 'the library masthead').toBeVisible()
    await expect(page.locator('.pl-overview')).toBeVisible()
    await expect(page.locator('.pnav'), 'no nav').toHaveCount(0)
    await expect(page.locator('.app-footer'), 'no footer').toHaveCount(0)
    await expect(page.locator('html'), 'no phone tab bar').not.toHaveClass(/has-tabbar/)

    // Same library, not a fork: the same shelves in the same order.
    const shelvesFull = await page.locator('[id^="pl-shelf-"]').evaluateAll((els) => els.map((e) => e.id))
    expect(shelvesFull, 'the full-screen view shows the same library').toEqual(shelvesNormal)

    // Filling the window: no nav gap above the page, and no 1240px column.
    const main = page.locator('main#main')
    const pad = await main.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))
    expect(pad, 'the 64px nav gap is gone from the top of the page').toBeLessThanOrEqual(normalPad - 60)
    const m = await main.boundingBox()
    expect(m.y).toBeLessThanOrEqual(1)
    if (width >= 1440) expect(m.width, 'the page fills the window, not a 1240px column').toBeGreaterThan(1300)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    await context.close()
  })
}

for (const { width, height, where } of WIDTHS.filter((w) => w.width !== 768)) {
  test(`the full-screen view stays full-screen through the library's own moves — ${width}px`, async ({ browser }) => {
    const { context, page } = await adminAt(browser, { width, height }, `an admin browsing lists inside the full-screen prompt library at ${width}px`)
    await go(page, FULL)
    await expect(page.locator('.pl-overview')).toBeVisible()

    // View more: into a list. The flag survives; so does the missing nav.
    await viewMore(page, 'website', where).click()
    await expect(page.locator('#pl-results-h')).toHaveText('Website')
    expect(urlOf(page).search, 'View more dropped ?view=full').toBe('?view=full')
    expect(urlOf(page).hash).toBe('#website')
    await expect(page.locator('.pnav'), 'View more brought the nav back').toHaveCount(0)

    // A category chip (behind Filters on a phone).
    if (width <= 640) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByRole('radio', { name: /^UI Components( \d+ prompts?)?$/ }).click()
    await expect(page.locator('#pl-results-h')).toHaveText('UI Components')
    expect(urlOf(page).search, 'a chip dropped ?view=full').toBe('?view=full')
    expect(urlOf(page).hash).toBe('#ui-components')
    await expect(page.locator('.pnav')).toHaveCount(0)

    // Back to overview.
    await page.getByRole('button', { name: 'Back to overview' }).click()
    await expect(page.locator('.pl-overview')).toBeVisible()
    expect(urlOf(page).search, 'Back to overview dropped ?view=full').toBe('?view=full')
    expect(urlOf(page).hash).toBe('')
    await expect(page.locator('.pnav')).toHaveCount(0)

    // The first keystroke of a search enters the full list.
    await page.getByRole('searchbox', { name: 'Search community prompts' }).fill('logo')
    await expect(page.locator('#pl-results-h')).toContainText('logo')
    expect(urlOf(page).search, 'a search dropped ?view=full').toBe('?view=full')
    expect(urlOf(page).hash).toBe('#all')
    await expect(page.locator('.pnav')).toHaveCount(0)
    await expect(page.locator('.app-footer')).toHaveCount(0)
    await context.close()
  })
}

for (const { width, height } of WIDTHS.filter((w) => w.width !== 768)) {
  test(`the way back: a link in the button's place, to the normal page, on the same list — ${width}px`, async ({ browser }) => {
    const { context, page } = await adminAt(browser, { width, height }, `an admin leaving the full-screen prompt library at ${width}px`)
    await go(page, `${FULL}#website`)
    await expect(page.locator('#pl-results-h')).toHaveText('Website')

    // In place of the button, not beside it.
    await expect(openButton(page), 'the open button is still offered inside the full-screen view').toHaveCount(0)
    const back = backLink(page)
    await expect(back).toBeVisible()
    await expect(back).toHaveAttribute('aria-label', BACK_NAME)
    const bb = await back.boundingBox()
    expect(bb.width).toBeGreaterThanOrEqual(44)
    expect(bb.height).toBeGreaterThanOrEqual(44)
    const row = await toolbar(page).locator('.pl-tb-search').boundingBox()
    expect(row.height, 'the search row grew a second line').toBeLessThanOrEqual(52)
    // On a phone the way back sits beside Filters, on the same row.
    if (width <= 640) {
      const filters = await toolbar(page).locator('.pl-filters-btn').boundingBox()
      expect(Math.abs(bb.y - filters.y), 'Filters and the way back are on one row').toBeLessThanOrEqual(8)
    }

    await back.click()
    await expect(page.locator('.pnav'), 'the nav is back').toHaveCount(1)
    // The discover pages close without the app footer (footerRoutes.js), so only the nav comes back.
    await expect(page.locator('#pl-results-h'), 'the same list is still open').toHaveText('Website')
    expect(urlOf(page).search, 'the normal address carries no flag').toBe('')
    expect(urlOf(page).pathname + urlOf(page).hash).toBe(`${ROUTE}#website`)
    await expect(openButton(page), 'the open button is back').toBeVisible()
    await expect(backLink(page)).toHaveCount(0)
    await context.close()
  })
}

test('the way back is still there at 320 where the open button gives up its room', async ({ browser }) => {
  const { context, page } = await adminAt(browser, { width: 320, height: 640 }, 'an admin on the narrowest phone')
  await go(page, ROUTE)
  await expect(page.locator('.pl-overview')).toBeVisible()
  await expect(openButton(page), 'the open button needs room the 320 search field cannot spare').toBeHidden()
  await go(page, FULL)
  await expect(backLink(page), 'no nav and no way back would be a dead end').toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
  await context.close()
})

test.describe('the gate', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a non-admin is turned away from the full-screen address as from the normal one, with the nav', async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    watch(page, 'a Pro subscriber who is not an admin opening the full-screen prompt library address')
    for (const url of [ROUTE, FULL]) {
      await go(page, url)
      await expect(page.locator('.plib-page'), `${url} showed the library to a non-admin`).toHaveCount(0)
      await expect(page.getByRole('heading', { name: /doesn.t exist/ }), `${url} is the not-found page`).toBeVisible()
      await expect(page.locator('.pnav'), `${url} left a turned-away visitor with no nav`).toHaveCount(1)
      expect(urlOf(page).pathname, 'the address does not move').toBe(ROUTE)
    }
  })

  test('signed out, the full-screen address is turned away like the normal one, with the nav', async ({ page }) => {
    watch(page, 'a signed-out visitor opening the full-screen prompt library address')
    for (const url of [ROUTE, FULL]) {
      await go(page, url)
      await expect(page.locator('.plib-page'), `${url} showed the library signed out`).toHaveCount(0)
      await expect(page.locator('.pnav'), `${url} left a signed-out visitor with no nav`).toHaveCount(1)
      await expect(page.locator('html'), 'the full view never took the page').not.toHaveAttribute('data-view', 'full')
    }
  })

  test('the flag does nothing on any other page', async ({ page }) => {
    await signIn(page, { admin: true })
    watch(page, 'an admin adding ?view=full to the palette library')
    await go(page, '/discover/palettes?view=full')
    await expect(page.locator('.pnav'), 'another page lost its nav to the flag').toHaveCount(1)
  })
})
