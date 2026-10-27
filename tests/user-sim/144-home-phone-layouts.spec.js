// THE HOMEPAGE ON A PHONE AND A TABLET.
//
// At 1000px and below the bench is a tool switcher: a real tablist (Palette,
// Icons, Fonts, Converter) over four tabpanels that share one grid cell. This
// file holds what that layout must keep true, each as a measurement of the page
// as a visitor meets it:
//
//   1. THE TABLIST KEYBOARD. Arrows wrap, Home and End jump, exactly one tab is
//      aria-selected and in the tab order, the selected tab's panel is live and
//      the other three are inert (out of the tab order and the accessibility tree).
//   2. THE PAGE DOES NOT MOVE when the tab changes. The document is the same
//      height on all four, in a real coarse-pointer context. Read from
//      document.scrollingElement.scrollHeight: a fullPage screenshot resizes the
//      window and drops touch emulation, so it cannot say this.
//   3. THE ICON DEMO HAS NO SCROLL BAR at any width: its content fits its frame.
//   4. THE NAV CTA steps aside while the hero's own "Open the toolkit" row is on
//      screen, and comes back once it has scrolled away (phones only).
//   5. THE FOOTER'S LINK COLUMNS: two across on a phone, four on a tablet.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

/** A real phone or tablet: a coarse primary pointer, not a narrow window with a mouse. */
async function touchPage(browser, width, height = 844, who = 'a visitor on a touch screen') {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  watch(page, who)
  return { ctx, page }
}

const tabsOf = (page) => page.locator('.sp-rail--tabs [role="tab"]')

/** Which tab is selected, and the state of every tabpanel, read from the DOM. */
const benchState = (page) => page.evaluate(() => {
  const tabs = [...document.querySelectorAll('.sp-rail--tabs [role="tab"]')]
  const panels = [...document.querySelectorAll('.sp-steps > [role="tabpanel"]')]
  return {
    selected: tabs.map((t, i) => (t.getAttribute('aria-selected') === 'true' ? i : -1)).filter((i) => i > -1),
    tabbable: tabs.map((t, i) => (t.tabIndex === 0 ? i : -1)).filter((i) => i > -1),
    focused: tabs.findIndex((t) => t === document.activeElement),
    inert: panels.map((p) => p.inert),
    controls: tabs.map((t) => t.getAttribute('aria-controls')),
    panelIds: panels.map((p) => p.id),
    labelledBy: panels.map((p) => p.getAttribute('aria-labelledby')),
    tabIds: tabs.map((t) => t.id),
  }
})

async function expectTab(page, i, where) {
  const s = await benchState(page)
  expect(s.selected, `${where}: the selected tab`).toEqual([i])
  expect(s.tabbable, `${where}: only the selected tab is in the tab order`).toEqual([i])
  expect(s.focused, `${where}: focus is on the selected tab`).toBe(i)
  expect(s.inert, `${where}: exactly the unselected panels are inert`).toEqual([0, 1, 2, 3].map((n) => n !== i))
}

for (const width of [390, 768]) {
  test.describe(`the bench tablist at ${width}px`, () => {
    test('is a labelled tablist of four tabs wired to four tabpanels', async ({ browser }) => {
      const { ctx, page } = await touchPage(browser, width)
      await go(page, '/')
      await expect(page.getByRole('tablist', { name: 'Tools' })).toBeVisible()
      const names = await tabsOf(page).evaluateAll((els) => els.map((el) => el.textContent.trim()))
      expect(names, 'the switcher labels').toEqual(['Palette', 'Icons', 'Fonts', 'Converter'])
      const s = await benchState(page)
      expect(s.selected, 'the first tab starts selected').toEqual([0])
      expect(s.controls, 'each tab controls its own panel').toEqual(s.panelIds)
      expect(s.labelledBy, 'each panel is named by its own tab').toEqual(s.tabIds)
      expect(s.inert, 'three panels start inert').toEqual([false, true, true, true])
      await ctx.close()
    })

    test('arrows wrap round, Home and End jump, and selection follows focus', async ({ browser }) => {
      const { ctx, page } = await touchPage(browser, width)
      await go(page, '/')
      await tabsOf(page).nth(0).focus()
      await expectTab(page, 0, 'at rest')

      await page.keyboard.press('ArrowRight')
      await expectTab(page, 1, 'ArrowRight from Palette')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await expectTab(page, 3, 'ArrowRight twice more')
      await page.keyboard.press('ArrowRight')
      await expectTab(page, 0, 'ArrowRight from the last tab wraps to the first')
      await page.keyboard.press('ArrowLeft')
      await expectTab(page, 3, 'ArrowLeft from the first tab wraps to the last')
      await page.keyboard.press('ArrowLeft')
      await expectTab(page, 2, 'ArrowLeft from Converter')
      await page.keyboard.press('Home')
      await expectTab(page, 0, 'Home')
      await page.keyboard.press('End')
      await expectTab(page, 3, 'End')
      await ctx.close()
    })

    test('a click selects, and Tab leaves the tab for the selected panel, never an inert one', async ({ browser }) => {
      const { ctx, page } = await touchPage(browser, width)
      await go(page, '/')
      await tabsOf(page).nth(2).click()
      const s = await benchState(page)
      expect(s.selected, 'clicking Fonts selects it').toEqual([2])
      expect(s.inert, 'Fonts is the live panel').toEqual([true, true, false, true])
      await tabsOf(page).nth(2).focus()
      for (let n = 0; n < 6; n += 1) {
        await page.keyboard.press('Tab')
        const where = await page.evaluate(() => {
          const el = document.activeElement
          return el?.closest('[role="tabpanel"]')?.id || (el?.closest('.sp-rail--tabs') ? 'tabs' : 'outside')
        })
        expect(where, `Tab ${n + 1} landed in a panel that is not the selected one`).toMatch(/^(sp-tabpanel-2|outside)$/)
      }
      await ctx.close()
    })
  })
}

test('on a wide window the bench is a jump rail, not a tablist', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'a visitor on a laptop')
  await go(page, '/')
  await expect(page.getByRole('tablist', { name: 'Tools' })).toHaveCount(0)
  await expect(page.locator('ol.sp-rail .sp-rail-row')).toHaveCount(4)
  expect(await page.evaluate(() => document.querySelectorAll('.sp-steps > .sp-step[inert]').length), 'a wide bench has inert windows').toBe(0)
  await ctx.close()
})

// ── the page is as tall on every tab ───────────────────────────────────────────

/** scrollHeight once two reads, a frame apart, agree (fonts and images land late). */
async function settledHeight(page) {
  let last = -1
  await expect.poll(async () => {
    const h = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(document.scrollingElement.scrollHeight))))
    const same = h === last
    last = h
    return same
  }, { message: 'the page height never settled', timeout: 8000, intervals: [150] }).toBe(true)
  return last
}

for (const width of [390, 768]) {
  test(`${width}px, coarse pointer: the page is the same height on all four tabs`, async ({ browser }) => {
    const { ctx, page } = await touchPage(browser, width, width === 390 ? 844 : 1024)
    await go(page, '/')
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context is not a coarse pointer').toBe(true)
    const heights = []
    for (let i = 0; i < 4; i += 1) {
      await tabsOf(page).nth(i).click()
      await expect(tabsOf(page).nth(i)).toHaveAttribute('aria-selected', 'true')
      heights.push(await settledHeight(page))
    }
    // Back to the first tab: the same page again, not merely four equal guesses.
    await tabsOf(page).nth(0).click()
    heights.push(await settledHeight(page))
    expect(heights[0], 'the page is implausibly short').toBeGreaterThan(3000)
    expect(heights, 'switching tabs changed the height of the page').toEqual(Array(5).fill(heights[0]))
    await ctx.close()
  })
}

// ── the icon demo never scrolls ────────────────────────────────────────────────

for (const width of [390, 768, 1440]) {
  test(`${width}px: the icon demo fits its frame with no scroll bar`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 1000 } })
    const page = await ctx.newPage()
    watch(page, 'a visitor looking at the icon demo')
    await go(page, '/')
    // Scoped to the bench: card 1 of the exports section has an Icons tab of its own.
    if (width <= 1000) await page.getByRole('tablist', { name: 'Tools' }).getByRole('tab', { name: 'Icons', exact: true }).click()
    const grid = page.locator('.sp-icogrid')
    await grid.scrollIntoViewIfNeeded()
    await expect.poll(() => grid.locator('.sp-ico').count(), { message: 'the icon demo is empty' }).toBeGreaterThan(8)
    const m = await grid.evaluate((el) => ({
      sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth,
      last: el.lastElementChild.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 0.5,
    }))
    expect(m.ch, 'the icon frame has no height').toBeGreaterThan(100)
    expect(m.sh, `the icon demo scrolls vertically (content ${m.sh}px in a ${m.ch}px frame)`).toBe(m.ch)
    expect(m.sw, 'the icon demo scrolls sideways').toBe(m.cw)
    expect(m.last, 'the last icon is cut off').toBe(true)
    await ctx.close()
  })
}

// ── the nav CTA while the hero CTA is on screen ────────────────────────────────

async function scrollToY(page, y) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 }).toBe(Math.round(y))
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

test('390px: the nav CTA is hidden while the hero CTA is in view, and back once it has scrolled away', async ({ browser }) => {
  const { ctx, page } = await touchPage(browser, 390, 844, 'a phone visitor scrolling the hero')
  await go(page, '/')
  const hero = page.locator('.sp-hero-cta')
  const nav = page.locator('.spnav-cta')
  await expect(hero, 'the hero CTA row is not on the first screen').toBeInViewport()
  await expect(nav, 'the nav CTA repeats the hero CTA').toBeHidden()
  expect(await nav.evaluate((el) => el.getBoundingClientRect().width), 'the pill must keep its width so the mark does not move').toBeGreaterThan(40)

  // Past the hero: its bottom edge above the top of the window.
  const past = await hero.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY + 40)
  await scrollToY(page, past)
  await expect(hero).not.toBeInViewport()
  await expect(nav, 'the nav CTA did not come back after the hero CTA scrolled away').toBeVisible()

  await scrollToY(page, 0)
  await expect(nav, 'the nav CTA did not step aside again on the way back up').toBeHidden()
  await ctx.close()
})

test('1440px: the nav CTA stays in the bar while the hero CTA is in view', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'a visitor on a desktop')
  await go(page, '/')
  await expect(page.locator('.sp-hero-cta')).toBeInViewport()
  await expect(page.locator('.spnav-cta')).toBeVisible()
  await ctx.close()
})

// ── the footer's link columns ──────────────────────────────────────────────────

/** How many columns the footer's link groups sit in: the distinct left edges of its groups. */
const footerColumns = (page) => page.locator('.sp-footer .sp-footer-col').evaluateAll((cols) => {
  const lefts = new Set(cols.map((c) => Math.round(c.getBoundingClientRect().left)))
  return { columns: lefts.size, groups: cols.length }
})

test('390px: the footer links sit in two columns, and there is no curtain on a coarse pointer', async ({ browser }) => {
  const { ctx, page } = await touchPage(browser, 390, 844, 'a phone visitor at the foot of the page')
  await go(page, '/')
  const footer = page.locator('footer.sp-footer')
  await footer.scrollIntoViewIfNeeded()
  const m = await footerColumns(page)
  // Tools, Project and Explore are columns; Privacy, Terms and Credits sit in the baseline row.
  expect(m.groups, 'the footer lost link groups').toBe(3)
  expect(m.columns, 'the footer links are not in two columns').toBe(2)
  const legal = footer.locator('.sp-footer-legal').getByRole('link')
  await expect(legal.filter({ hasText: /^(Privacy|Terms|Credits)$/ }), 'the legal links left the baseline row').toHaveCount(3)
  for (const name of ['Privacy', 'Terms', 'Credits']) {
    const box = await footer.locator('.sp-footer-legal').getByRole('link', { name, exact: true }).boundingBox()
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
  expect(m.groups, 'the footer lost link groups').toBeGreaterThanOrEqual(4)
  expect(m.columns, 'the footer links are not in four columns').toBe(4)
  await ctx.close()
})
