// THE HOMEPAGE ON A PHONE AND A TABLET.
//
// Each of these is a measurement of the page as a visitor meets it, in a real
// coarse-pointer context where the point is touch:
//
//   1. THE HERO CALL TO ACTION is the only "Open the toolkit" in the page's
//      first screen, and the header carries none at any width.
//   2. THE FOOTER'S LINK COLUMNS: two across on a phone, four on a tablet. The
//      legal links are a column on the homepage and are not repeated in the
//      baseline row.
//   3. NO SIDEWAYS SCROLL once every section has arrived, from a 320px phone to
//      a desktop.
import { test, expect } from './base.js'
import { go, homeSectionsLoaded, watch } from './helpers.js'

/** A real phone or tablet: a coarse primary pointer, not a narrow window with a mouse. */
async function touchPage(browser, width, height = 844, who = 'a visitor on a touch screen') {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, who)
  return { ctx, page }
}

// ── the hero call to action ───────────────────────────────────────────────────

for (const width of [390, 1440]) {
  test(`${width}px: the header has no toolkit call to action, and the hero's is on the first screen`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } })
    const page = await ctx.newPage()
    watch(page, 'a visitor looking at the top of the homepage')
    await go(page, '/')
    const hero = page.locator('#top .hh-go')
    await expect(hero, 'the hero call to action is not on the first screen').toBeInViewport()
    await expect(hero).toHaveText('Open the toolkit')
    await expect(hero).toHaveAttribute('href', '/projects')
    await expect(page.locator('header').getByRole('link', { name: /open the toolkit/i }), 'the header repeats the hero call to action').toHaveCount(0)
    await ctx.close()
  })
}

// ── the footer's link columns ──────────────────────────────────────────────────

/** How many columns the footer's link groups sit in: the distinct left edges of the groups that are drawn. */
const footerColumns = (page) => page.locator('.sp-footer .sp-footer-col').evaluateAll((all) => {
  const cols = all.filter((c) => c.getClientRects().length > 0)
  const lefts = new Set(cols.map((c) => Math.round(c.getBoundingClientRect().left)))
  return { columns: lefts.size, groups: cols.map((c) => c.querySelector('h3').textContent.trim()) }
})

test('390px: the footer links sit in two columns, and there is no curtain on a coarse pointer', async ({ browser }) => {
  const { ctx, page } = await touchPage(browser, 390, 844, 'a phone visitor at the foot of the page')
  await go(page, '/')
  const footer = page.locator('footer.sp-footer')
  await footer.scrollIntoViewIfNeeded()
  const m = await footerColumns(page)
  // Legal is a column here: the homepage's baseline row does not repeat it.
  expect(m.groups, 'the footer link groups changed').toEqual(['Tools', 'This page', 'Explore', 'Legal'])
  expect(m.columns, 'the footer links are not in two columns').toBe(2)
  await expect(footer.locator('.sp-footer-legal-links'), 'the legal links are repeated in the baseline row').toHaveCount(0)
  for (const name of ['Privacy', 'Terms', 'Credits']) {
    const box = await footer.locator('.sp-footer-col--legal').getByRole('link', { name, exact: true }).boundingBox()
    expect(box.height, `${name} is under a 44px target`).toBeGreaterThanOrEqual(44)
  }
  await page.waitForTimeout(500)
  await expect(footer, 'a coarse pointer got the curtain').not.toHaveAttribute('data-curtain', /.*/)
  await ctx.close()
})

test('800px: the footer links sit in four columns', async ({ browser }) => {
  const { ctx, page } = await touchPage(browser, 800, 1000, 'a tablet visitor at the foot of the page')
  await go(page, '/')
  await page.locator('footer.sp-footer').scrollIntoViewIfNeeded()
  const m = await footerColumns(page)
  expect(m.groups.length, 'the footer lost link groups').toBeGreaterThanOrEqual(4)
  expect(m.columns, 'the footer links are not in four columns').toBe(4)
  await ctx.close()
})

// ── nothing scrolls sideways ───────────────────────────────────────────────────

for (const width of [320, 390, 768, 1200, 1440]) {
  test(`${width}px: the homepage does not scroll sideways once every section has arrived`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'a visitor reading the whole homepage')
    await go(page, '/')
    await homeSectionsLoaded(page)
    const m = await page.evaluate(() => {
      const root = document.documentElement
      const wide = [...document.querySelectorAll('main *')]
        .filter((el) => el.getBoundingClientRect().right > root.clientWidth + 1 && !el.closest('[data-overflow-ok], .hsc-rail, [data-hsc-rail]'))
        .slice(0, 3)
        .map((el) => `${el.tagName}.${el.className}`)
      return { over: root.scrollWidth - root.clientWidth, wide }
    })
    expect(m.over, `the page scrolls sideways (e.g. ${m.wide.join(', ')})`).toBeLessThanOrEqual(0)
    await ctx.close()
  })
}
