// THE HOMEPAGE'S SECTION ORDER AND FOOTER, IN A REAL BROWSER.
//
// 1. The sections run in the page's order, in the DOM and on screen: the
//    below-the-fold ones arrive after the first screen, and must land in place.
// 2. The footer does not move: on `/` it is in normal flow after <main> at every
//    width, with no curtain, so it scrolls with the page and nothing ever
//    covers it. Keyboard focus landing in the footer ends on screen and on top.
import { test, expect } from './base.js'
import { go, homeSectionsLoaded, watch } from './helpers.js'

async function open(browser, { width, height, theme = 'dark', reducedMotion = 'no-preference', touch = false }) {
  // `touch` is a real phone: a coarse primary pointer (hasTouch + isMobile). A narrow
  // window with a mouse is not one.
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion, ...(touch ? { hasTouch: true, isMobile: true } : {}) })
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('vs-t', t) } catch { /* private mode */ }
  }, theme)
  const page = await ctx.newPage()
  watch(page, 'a visitor on the homepage')
  return { ctx, page }
}

// The page's sections, top to bottom. `start` (the final call) sits in <main> or just after it.
const SECTION_ORDER = ['top', 'bookmarks', 'try', 'exports', 'examples', 'proof', 'plans', 'start']

for (const width of [390, 1440]) {
  test(`the sections run top, bookmarks, try, exports, examples, proof, plans, start (${width})`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height: 900 })
    await go(page, '/')
    await homeSectionsLoaded(page)
    const ids = await page.locator('section[id]').evaluateAll((els, wanted) => els.map((el) => el.id).filter((id) => wanted.includes(id)), SECTION_ORDER)
    expect(ids, `section order in the DOM is ${ids.join(', ')}`).toEqual(SECTION_ORDER)
    // Drawn in the same order: each section starts below the one before it.
    const tops = await page.evaluate((order) => order.map((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY), SECTION_ORDER)
    tops.forEach((t, i) => { if (i) expect(t, `#${SECTION_ORDER[i]} is drawn above #${SECTION_ORDER[i - 1]}`).toBeGreaterThan(tops[i - 1]) })
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
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    test(`the footer does not move: it scrolls with the page and nothing covers it (${theme}, ${width}x${height})`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height, theme })
      await go(page, '/')
      // The page only has its final height once every section has replaced its stand-in.
      await homeSectionsLoaded(page)
      const footer = page.locator('footer.sp-footer')
      await expect(footer, 'the footer has a curtain again').not.toHaveAttribute('data-curtain', /.*/)
      expect(await footer.evaluate((el) => getComputedStyle(el).position), 'the footer is pinned instead of in normal flow').toBe('relative')
      const footerH = await footer.evaluate((el) => el.offsetHeight)
      const endY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)

      // Its place on the page is the same wherever the page is scrolled, and
      // <main> ends exactly where it begins: nothing parks under the page.
      const placeOnPage = () => footer.evaluate((el) => {
        const main = document.querySelector('.spectrum > main').getBoundingClientRect()
        return { top: Math.round(el.getBoundingClientRect().top + window.scrollY), mainEnd: Math.round(main.bottom + window.scrollY) }
      })
      await scrollToY(page, 0)
      const rest = await placeOnPage()
      expect(rest.mainEnd, 'the page does not end where the footer begins').toBe(rest.top)
      for (const share of [0.6, 0.3, 0]) {
        const y = Math.max(0, endY - Math.round(footerH * share))
        await scrollToY(page, y)
        expect(await placeOnPage(), `the footer moved against the page at scroll ${y}`).toEqual(rest)
        // What is at the footer's top edge, once that edge is on screen, is the footer.
        const g = await footerGeometry(page)
        if (g.top >= 0 && g.top + 4 < height) expect(g.atTop, 'the top of the footer is covered').toBe('footer')
      }

      // AT THE END: every drawn control in view is the thing under its own centre.
      // Links CSS hides at this width are not drawn, so they cannot be covered.
      const covered = await footer.locator('a, button').evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).filter((el) => {
        const r = el.getBoundingClientRect()
        return r.top >= 0 && r.bottom <= window.innerHeight
      }).filter((el) => {
        const r = el.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !(hit && (hit === el || el.contains(hit)))
      }).map((el) => el.textContent.trim()))
      expect(covered, 'footer controls covered at the bottom of the page').toEqual([])
      await ctx.close()
    })
  }
}

test('keyboard focus entering the footer lands on screen and on top', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 1440, height: 900 })
  await go(page, '/')
  await expect(page.locator('footer.sp-footer'), 'the footer has a curtain again').not.toHaveAttribute('data-curtain', /.*/)
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
  // With the footer partly on screen, the controls in view are plainly visible.
  // A pointer press focuses the control; if that scrolled the page, the release
  // would land on whatever moved under the pointer and the click would be lost.
  const { ctx, page } = await open(browser, { width: 1440, height: 900 })
  await go(page, '/')
  await homeSectionsLoaded(page)
  const footer = page.locator('footer.sp-footer')
  await expect(footer, 'the footer has a curtain again').not.toHaveAttribute('data-curtain', /.*/)
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
  // The footer is in normal flow, so from the top it is plainly off screen and
  // the click finds it uncovered once scrolled to.
  const { ctx, page } = await open(browser, { width: 1440, height: 900 })
  await go(page, '/')
  await expect(page.locator('footer.sp-footer'), 'the footer has a curtain again').not.toHaveAttribute('data-curtain', /.*/)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Sitemap', exact: true }).click({ timeout: 10000 })
  await expect(page).toHaveURL(/\/sitemap$/)
  await ctx.close()
})

for (const [label, opts] of [
  ['a phone, where the pointer is coarse', { width: 390, height: 844, touch: true }],
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

// The "About this project" panel is portalled to <body>, so opening it with the
// footer partly on screen leaves the footer's position and layer alone. (The
// scroll lock is on <html>, so it does not move the footer either; the last test
// in this file holds it to that.)
for (const [width, height] of [[390, 844], [1440, 900]]) {
  test(`the About panel opens and closes with the footer part-way up without changing its layering (${width}x${height})`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height })
    await go(page, '/')
    // Every section in first, so none arrives while the panel is open and moves the page.
    await homeSectionsLoaded(page)
    const footer = page.locator('footer.sp-footer')
    const footerH = await footer.evaluate((el) => el.offsetHeight)
    const endY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
    // With about a third of the footer still below the window.
    const y = Math.max(0, endY - Math.round(footerH * 0.3))
    await scrollToY(page, y)

    const state = () => page.evaluate(() => {
      const f = document.querySelector('footer.sp-footer')
      const r = f.getBoundingClientRect()
      return { position: getComputedStyle(f).position, zIndex: getComputedStyle(f).zIndex, top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY) }
    })
    // Focusing a footer control scrolls the page to uncover it (see the
    // keyboard test above), so take the starting state after that settles.
    const trigger = page.locator('.app-footer-note')
    await trigger.focus()
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await expect.poll(async () => (await state()).scrollY, { timeout: 5000 }).toBe((await state()).scrollY)
    const before = await state()
    await page.keyboard.press('Enter')
    const dialog = page.locator('.fnote')
    await expect(dialog).toBeVisible()
    const during = await page.evaluate(() => {
      const overlay = document.querySelector('.fnote-overlay')
      const d = document.querySelector('.fnote')
      const r = d.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        overlayInBody: overlay.parentElement === document.body,
        insideFooter: !!overlay.closest('footer'),
        topmost: !!hit && !!hit.closest('.fnote'),
        focusInside: !!document.activeElement?.closest('.fnote'),
      }
    })
    expect(during, 'the panel is not a top-level, topmost, focused dialog').toEqual({ overlayInBody: true, insideFooter: false, topmost: true, focusInside: true })
    const shown = await state()
    expect(shown.position, 'the footer changed position while the panel was open').toBe(before.position)
    expect(shown.zIndex, 'the footer changed layer while the panel was open').toBe(before.zIndex)
    expect(shown.scrollY, 'the page scrolled while the panel was open').toBe(before.scrollY)
    expect(before.position, 'the footer is pinned instead of in normal flow').toBe('relative')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    expect(await page.evaluate(() => document.activeElement === document.querySelector('.app-footer-note')), 'focus did not return to the trigger').toBe(true)
    expect(await state(), 'the footer is not where it started once the panel closed').toEqual(before)
    await ctx.close()
  })
}

// THE FOOTER MUST NOT MOVE WHEN A DIALOG LOCKS THE PAGE.
//
// The root sets overflow-x: clip, so a body overflow no longer reaches the
// viewport. A lock put on <body> turned body into its own scroll box and moved
// the page under the footer. The lock goes on <html>, so the footer's top is the
// same with the panel open as before it opened and after it closed.
//
// Half the footer is on screen on purpose: at the very end of the page a moved
// and an unmoved footer can sit in the same place, so only a part-way offset can
// tell them apart. The trigger is clicked from script rather than with the
// pointer because a real click would first scroll the page, which is the
// position this test is trying to hold.
for (const [label, opts] of [
  ['1440x900', { width: 1440, height: 900 }],
  ['768x1024', { width: 768, height: 1024 }],
  ['1440x900, reduced motion', { width: 1440, height: 900, reducedMotion: 'reduce' }],
]) {
  test(`the footer stays put while the About panel locks the page, half of it on screen (${label})`, async ({ browser }) => {
    const { ctx, page } = await open(browser, opts)
    await go(page, '/')
    await homeSectionsLoaded(page)
    const footer = page.locator('footer.sp-footer')
    await expect(footer, 'the footer has a curtain again').not.toHaveAttribute('data-curtain', /.*/)
    const footerH = await footer.evaluate((el) => el.offsetHeight)
    const endY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
    await scrollToY(page, Math.max(0, endY - Math.round(footerH / 2)))

    const top = () => footer.evaluate((el) => el.getBoundingClientRect().top)
    const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    const before = await top()

    await page.evaluate(() => document.querySelector('.app-footer-note').click())
    const dialog = page.locator('.fnote')
    await expect(dialog).toBeVisible()
    await frames()
    expect(Math.abs((await top()) - before), `the footer moved while the panel was open (${before} -> ${await top()})`).toBeLessThanOrEqual(1)
    // Under reduced motion the footer is in normal flow and does not move even
    // with the broken lock, so this is what guards that case: the lock is on the root.
    expect(await page.evaluate(() => document.documentElement.style.overflow), 'the page is not locked on the root').toBe('hidden')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await frames()
    expect(await page.evaluate(() => document.documentElement.style.overflow), 'the root lock was not released').toBe('')
    expect(Math.abs((await top()) - before), `the footer is not where it started once the panel closed (${before} -> ${await top()})`).toBeLessThanOrEqual(1)
    await ctx.close()
  })
}
