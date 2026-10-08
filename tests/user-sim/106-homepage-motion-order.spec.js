// THE HOMEPAGE'S HERO GHOST, SECTION ORDER AND FOOTER CURTAIN, IN A REAL BROWSER.
//
// 1. The hero search's ghost phrase types itself: it holds a phrase, erases it
//    and types the next. Under reduced motion it never moves; once the visitor
//    takes the bar it stops for good. The field's own name and placeholder never
//    change while the ghost does, and the ghost is aria-hidden.
// 2. The exports section (#specimens) comes before the community library
//    (#discover), in the DOM and on screen.
// 3. The footer curtain: where the whole footer fits the window, the footer sits
//    still under <main> and the page scrolls up off it. Where it does not fit, or
//    under reduced motion, the footer is in normal flow. Keyboard focus landing
//    in the footer always ends on screen and on top.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const RESTING = 'a contrast ratio'
const NEXT = 'a tint and shade ramp'

async function open(browser, { width, height, theme = 'dark', reducedMotion = 'no-preference' }) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
  }, theme)
  const page = await ctx.newPage()
  watch(page, 'a visitor on the homepage')
  return { ctx, page }
}

/** Record every text the ghost phrase shows, from now on. */
const recordGhost = (page) => page.locator('.sp-search-rot').evaluate((el) => {
  window.__ghost = [el.textContent]
  new MutationObserver(() => window.__ghost.push(el.textContent))
    .observe(el, { subtree: true, childList: true, characterData: true })
})
const ghostFrames = (page) => page.evaluate(() => window.__ghost)

/** The field's accessible name and placeholder, which must never move. */
const fieldIdentity = (page) => page.locator('.sp-search input.hcmd-input').evaluate((input) => ({
  labelledBy: input.getAttribute('aria-labelledby'),
  label: input.getAttribute('aria-label'),
  placeholder: input.getAttribute('placeholder'),
}))

test.describe('hero ghost phrase', () => {
  test('types, holds, erases and types the next phrase, with the field name fixed', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    await go(page, '/')
    const ghost = page.locator('.sp-search-ghost')
    await expect(ghost).toHaveAttribute('aria-hidden', 'true')
    const before = await fieldIdentity(page)
    const barBefore = await page.locator('.sp-search .hcmd-bar').boundingBox()
    await recordGhost(page)

    await expect(page.locator('.sp-search-rot'), 'the ghost never typed the second phrase').toHaveText(NEXT, { timeout: 12000 })
    const frames = await ghostFrames(page)
    // Erasing the resting phrase passes through its own prefixes, shortest last,
    // and typing the next passes through its prefixes, longest last.
    const erasedTo = frames.findIndex((t) => t.length <= 2)
    expect(erasedTo, `the resting phrase was never erased: ${JSON.stringify(frames.slice(0, 12))}`).toBeGreaterThan(0)
    expect(frames.slice(0, erasedTo).some((t) => RESTING.startsWith(t) && t.length < RESTING.length),
      'the resting phrase vanished at once instead of being erased a character at a time').toBe(true)
    expect(frames.slice(erasedTo).some((t) => NEXT.startsWith(t) && t.length > 2 && t.length < NEXT.length),
      'the next phrase appeared at once instead of being typed').toBe(true)

    expect(await fieldIdentity(page), 'the search field\'s name or placeholder changed while the ghost moved').toEqual(before)
    expect(await page.locator('.sp-search .hcmd-bar').boundingBox(), 'the search bar moved or resized while the ghost typed').toEqual(barBefore)
    await ctx.close()
  })

  test('stops for good once the visitor takes the bar', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900 })
    await go(page, '/')
    await page.locator('.sp-search input.hcmd-input').focus()
    await recordGhost(page)
    await page.waitForTimeout(2500)
    await page.locator('.sp-search input.hcmd-input').blur()
    await page.waitForTimeout(2500)
    const frames = await ghostFrames(page)
    expect(new Set(frames), `the ghost kept moving after the bar was taken: ${JSON.stringify(frames.slice(0, 12))}`).toEqual(new Set([RESTING]))
    await ctx.close()
  })

  test('never moves under reduced motion', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1440, height: 900, reducedMotion: 'reduce' })
    await go(page, '/')
    await recordGhost(page)
    await page.waitForTimeout(5000)
    const frames = await ghostFrames(page)
    expect(new Set(frames), `the ghost moved under reduced motion: ${JSON.stringify(frames.slice(0, 12))}`).toEqual(new Set([RESTING]))
    await expect(page.locator('.sp-search-ghost')).not.toHaveAttribute('data-typing', /.*/)
    await ctx.close()
  })
})

for (const width of [390, 1440]) {
  test(`the exports section comes before the community library (${width})`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height: 900 })
    await go(page, '/')
    const ids = await page.locator('main section[id]').evaluateAll((els) => els.map((el) => el.id))
    expect(ids.indexOf('specimens'), `section order is ${ids.join(', ')}`).toBeGreaterThan(-1)
    expect(ids.indexOf('specimens'), `section order is ${ids.join(', ')}`).toBeLessThan(ids.indexOf('discover'))
    const top = (sel) => page.locator(sel).evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    expect(await top('#specimens'), 'the exports section is drawn below the library').toBeLessThan(await top('#discover'))
    await ctx.close()
  })
}

/** Scroll the window to y and wait until the page is really there. */
async function scrollToY(page, y) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 }).toBe(Math.round(y))
  // One more frame so sticky positions are painted for the new offset.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

const footerGeometry = (page) => page.evaluate(() => {
  const footer = document.querySelector('.sp-footer')
  const r = footer.getBoundingClientRect()
  const x = window.innerWidth / 2
  const at = (y) => {
    const hit = document.elementFromPoint(x, y)
    return hit?.closest('.sp-footer') ? 'footer' : hit?.closest('main') ? 'main' : hit?.tagName || 'nothing'
  }
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), atTop: at(r.top + 4), atBottom: at(window.innerHeight - 4) }
})

for (const theme of ['light', 'dark']) {
  for (const [width, height] of [[768, 1024], [1440, 900]]) {
    test(`the footer is uncovered by the page scrolling off it (${theme}, ${width}x${height})`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, theme })
      await go(page, '/')
      const footer = page.locator('footer.sp-footer')
      await expect(footer, 'the curtain did not switch on for a footer that fits the window').toHaveAttribute('data-curtain', 'true')
      const footerH = await footer.evaluate((el) => el.offsetHeight)
      const endY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)

      // MID-REVEAL, at two scroll positions: the footer is parked at the bottom
      // of the window and does not move; <main> still covers its top, and the
      // part already uncovered is the footer.
      await scrollToY(page, endY - Math.round(footerH * 0.6))
      const a = await footerGeometry(page)
      await scrollToY(page, endY - Math.round(footerH * 0.3))
      const b = await footerGeometry(page)
      expect(a.bottom, 'the footer is not parked at the bottom of the window').toBe(height)
      expect(b.top, 'the footer moved while the page scrolled off it').toBe(a.top)
      expect([a.atTop, b.atTop], 'the footer\'s top is not under the page mid-reveal').toEqual(['main', 'main'])
      expect([a.atBottom, b.atBottom], 'the uncovered part of the window is not the footer').toEqual(['footer', 'footer'])
      // Hit-testing finds a transparent <main> too, so the footer showing
      // through it is caught by its painted background instead.
      const mainBg = await page.locator('.spectrum > main').evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(mainBg, 'the page over the footer is see-through').toMatch(/^rgb\(/)

      // AT THE END: the whole footer is on screen and every link in it is the
      // thing under its own centre.
      await scrollToY(page, endY)
      const covered = await footer.locator('a, button').evaluateAll((els) => els.filter((el) => {
        const r = el.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !(hit && (hit === el || el.contains(hit)))
      }).map((el) => el.textContent.trim()))
      expect(covered, 'footer controls still covered at the bottom of the page').toEqual([])
      await ctx.close()
    })
  }
}

test('keyboard focus entering the footer uncovers it', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 1440, height: 900 })
  await go(page, '/')
  await expect(page.locator('footer.sp-footer')).toHaveAttribute('data-curtain', 'true')
  // Give focus to the last control in <main> without scrolling, then Tab on,
  // the way a keyboard user reaches the footer.
  await page.evaluate(() => {
    const focusable = [...document.querySelectorAll('.spectrum > main :is(a[href], button, input, [tabindex]:not([tabindex="-1"]))')]
      .filter((el) => !el.disabled && el.getClientRects().length > 0)
    focusable.at(-1).focus({ preventScroll: true })
  })
  await page.keyboard.press('Tab')
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const where = await page.evaluate(() => {
    const el = document.activeElement
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { inFooter: !!el.closest('.sp-footer'), onScreen: r.top >= 0 && r.bottom <= window.innerHeight, onTop: !!hit && (hit === el || el.contains(hit)) }
  })
  expect(where, 'Tab from the page into the footer left the focused link hidden under the page').toEqual({ inFooter: true, onScreen: true, onTop: true })
  await ctx.close()
})

test('pressing a footer control that is already in view does not move the page', async ({ browser }) => {
  // Mid-reveal the page still covers the top of the footer, but the controls
  // lower down are plainly visible. A pointer press focuses the control; if
  // that scrolled the page, the release would land on whatever moved under the
  // pointer and the click would be lost.
  const { ctx, page } = await open(browser, { width: 1440, height: 900 })
  await go(page, '/')
  const footer = page.locator('footer.sp-footer')
  await expect(footer).toHaveAttribute('data-curtain', 'true')
  const footerH = await footer.evaluate((el) => el.offsetHeight)
  const endY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  const y = endY - Math.round(footerH * 0.3)
  await scrollToY(page, y)
  const button = footer.locator('.app-footer-note')
  const covered = await button.evaluate((el) => el.getBoundingClientRect().top < document.querySelector('.spectrum > main').getBoundingClientRect().bottom)
  expect(covered, 'the control is under the page, so this position does not test a visible control').toBe(false)
  await button.click()
  await expect(page.locator('.fnote')).toBeVisible()
  expect(await page.evaluate(() => Math.round(window.scrollY)), 'the press scrolled the page').toBe(Math.round(y))
  await ctx.close()
})

test('a click on a footer link from the top of the page scrolls to it and lands', async ({ browser }) => {
  // A script or an assistive tool that clicks a link scrolls it into view first.
  // The footer is only pinned under the page once it is near, so from the top
  // it is plainly off screen and the click finds it uncovered.
  const { ctx, page } = await open(browser, { width: 1440, height: 900 })
  await go(page, '/')
  await expect(page.locator('footer.sp-footer')).toHaveAttribute('data-curtain', 'true')
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Sitemap', exact: true }).click({ timeout: 10000 })
  await expect(page).toHaveURL(/\/sitemap$/)
  await ctx.close()
})

for (const [label, opts] of [
  ['a phone, where the footer is taller than the window', { width: 390, height: 844 }],
  ['a short laptop window, where the footer is taller than it', { width: 1280, height: 720 }],
  ['reduced motion', { width: 1440, height: 900, reducedMotion: 'reduce' }],
]) {
  test(`the footer stays in normal flow on ${label}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, opts)
    await go(page, '/')
    const footer = page.locator('footer.sp-footer')
    // Give the measurement every chance to switch the curtain on before checking it did not.
    await page.waitForTimeout(500)
    await expect(footer).not.toHaveAttribute('data-curtain', /.*/)
    expect(await footer.evaluate((el) => getComputedStyle(el).position), 'the footer is not in normal flow').not.toBe('sticky')
    // Scrolled so the footer's top is halfway down the window (clear of the
    // fixed nav), its top is the footer, not hidden under anything.
    const footerTop = await footer.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    const endY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
    await scrollToY(page, Math.min(footerTop - Math.round(opts.height / 2), endY))
    const g = await footerGeometry(page)
    expect(g.atTop, 'the top of the footer is hidden').toBe('footer')
    await ctx.close()
  })
}
