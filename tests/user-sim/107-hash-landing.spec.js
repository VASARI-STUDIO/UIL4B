import { test, expect } from './base.js'
import { go, homeSectionsLoaded, ready, watch } from './helpers.js'

async function navigateInRouter(page, to) {
  await page.evaluate((to) => {
    // Use BrowserRouter's navigator so this is a PUSH, with no native anchor action.
    const element = document.querySelector('.app-shell a')
    const key = Object.keys(element).find((key) => key.startsWith('__reactFiber$'))
    for (let fiber = element[key]; fiber; fiber = fiber.return) {
      const navigator = fiber.memoizedProps?.value?.navigator
      if (navigator?.push) {
        navigator.push(to)
        return
      }
    }
    throw new Error('BrowserRouter navigator not found')
  }, to)
}

async function expectLanding(page, id, navSelector) {
  await expect(page.locator(`#${id}`)).toBeAttached()
  await expect.poll(() => page.evaluate(({ id, navSelector }) => {
    const target = document.getElementById(id)
    const nav = document.querySelector(navSelector)
    const top = target.getBoundingClientRect().top
    const navBottom = nav.getBoundingClientRect().bottom
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
    // The CSS margin includes the nav height; its remainder is the visible gap.
    const gap = margin + padding - navBottom
    const expectedTop = navBottom + gap
    return Math.abs(top - expectedTop) <= 8 && top >= navBottom - 8 && scrollY > 0
  }, { id, navSelector }), { timeout: 3000 }).toBe(true)
}

for (const reducedMotion of ['reduce', 'no-preference']) {
  test(`back/forward preserves saved scroll positions with motion ${reducedMotion}`, async ({ page }) => {
    watch(page, 'a visitor using back and forward between Learn pages')
    await page.emulateMedia({ reducedMotion })
    await go(page, '/learn/help#faq')
    await expectLanding(page, 'faq', '.pnav')
    const landingY = await page.evaluate(() => scrollY)
    // Scroll on past the landing by up to 600px, but never past the end of a
    // page shorter than that (the router page is about one screen tall at
    // desktop widths). Half the room left keeps the target reachable, and the
    // room check stops this passing without moving.
    const room = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)
    expect(room, 'the page needs room to scroll past the landing').toBeGreaterThan(100)
    const helpTarget = landingY + Math.min(600, Math.floor(room / 2))
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), helpTarget)
    await page.waitForFunction((top) => Math.abs(scrollY - top) <= 2, helpTarget)
    const helpY = await page.evaluate(() => scrollY)

    await navigateInRouter(page, '/learn/principles')
    await ready(page, '/learn/principles')
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
    await page.waitForFunction(() => Math.abs(scrollY - 600) <= 2)
    const principlesY = await page.evaluate(() => scrollY)

    for (const [direction, route, savedY] of [
      ['goBack', '/learn/help#faq', helpY],
      ['goForward', '/learn/principles', principlesY],
    ]) {
      await page[direction]()
      await expect(page).toHaveURL(new RegExp(`${route}$`))
      await ready(page, route)
      if (route.includes('#faq')) {
        // Fragment navigation can restore the saved position or land at the anchor.
        await expect.poll(async () => {
          const firstY = await page.evaluate(() => scrollY)
          await page.waitForTimeout(100)
          return await page.evaluate(() => scrollY) === firstY
        }).toBe(true)
        const restoredY = await page.evaluate(() => scrollY)
        // Observe another half second so a delayed scroll cannot pass.
        await page.waitForTimeout(500)
        const laterY = await page.evaluate(() => scrollY)
        expect(Math.abs(laterY - restoredY)).toBeLessThanOrEqual(2)
        expect(Math.abs(laterY - savedY) <= 2 || Math.abs(laterY - landingY) <= 8).toBe(true)
      } else {
        await page.waitForFunction((savedY) => Math.abs(scrollY - savedY) <= 2, savedY)
        const restoredY = await page.evaluate(() => scrollY)
        // Observe another half second so a delayed scroll cannot pass.
        await page.waitForTimeout(500)
        const laterY = await page.evaluate(() => scrollY)
        expect(Math.abs(laterY - restoredY)).toBeLessThanOrEqual(2)
        expect(Math.abs(laterY - savedY)).toBeLessThanOrEqual(2)
      }
    }
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test.describe(`hash landing at ${viewport.width}px`, () => {
    test.use({ viewport })
    test.beforeEach(({ page }) => { watch(page, 'a visitor opening a section URL') })

    test('a fresh help URL lands below the fixed nav', async ({ page }) => {
      await go(page, '/learn/help#faq')
      await expectLanding(page, 'faq', '.pnav')
    })

    test('a fresh help URL also lands with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await go(page, '/learn/help#faq')
      await expectLanding(page, 'faq', '.pnav')
    })

    test('a same-page router hash lands with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await go(page, '/learn/help')
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
      // #contact is the last job's answer. It is hidden until the hash opens it,
      // and on a phone its row starts well below the first screen, so the router
      // has to open it AND scroll to it.
      await expect(page.locator('#contact')).toBeHidden()
      if (viewport.width < 960) {
        expect(await page.locator('#help-job-report').evaluate((row) => row.getBoundingClientRect().top))
          .toBeGreaterThan(viewport.height)
      }
      await navigateInRouter(page, '/learn/help#contact')
      await expect(page).toHaveURL(/\/learn\/help#contact$/)
      await expect(page.locator('#contact')).toBeVisible()
      await expectLanding(page, 'contact', '.pnav')
    })
  })
}

// The homepage's nav bar slides away on the way down, so its height is read off
// the bar itself rather than from where it is sitting at the moment of landing.
async function homeLanding(page, id) {
  await expect(page.locator(`#${id} h2`)).toBeAttached({ timeout: 20000 })
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBeGreaterThan(0)
  // Wait for the jump to stop moving before reading where it landed.
  await expect.poll(async () => {
    const first = await page.evaluate(() => scrollY)
    await page.waitForTimeout(150)
    return (await page.evaluate(() => scrollY)) === first
  }).toBe(true)
  return page.evaluate((id) => ({
    top: document.getElementById(id).getBoundingClientRect().top,
    bar: document.querySelector('.spnav-bar').getBoundingClientRect().height,
  }), id)
}

test('a fresh sales hash lands its section below the nav bar', async ({ page }) => {
  watch(page, 'a visitor opening a homepage section URL')
  await go(page, '/#plans')
  const { top, bar } = await homeLanding(page, 'plans')
  expect(top, 'the section must start below the nav bar').toBeGreaterThanOrEqual(bar)
})

test('a fresh sales hash lands its section 104px from the top', async ({ page }) => {
  watch(page, 'a visitor opening a homepage section URL')
  await go(page, '/#plans')
  const { top } = await homeLanding(page, 'plans')
  expect(Math.abs(top - 104)).toBeLessThanOrEqual(8)
})

test('a section link from another route lands on the sales page', async ({ page }) => {
  watch(page, 'a visitor following Plans from the footer on the sitemap page')
  await go(page, '/sitemap')
  await page.locator('.sp-footer a[href="/home#plans"]').first().click()
  await ready(page, '/home')
  await expect(page).toHaveURL(/\/home#plans$/)
  const { top, bar } = await homeLanding(page, 'plans')
  expect(top, 'the section must start below the nav bar').toBeGreaterThanOrEqual(bar)
})

test('a footer section link from another route puts focus on the section heading', async ({ page }) => {
  watch(page, 'a keyboard visitor following Plans from the footer on the sitemap page')
  await go(page, '/sitemap')
  await page.locator('.sp-footer a[href="/home#plans"]').first().click()
  await ready(page, '/home')
  await homeLanding(page, 'plans')
  await expect(page.locator('#plans-h')).toBeFocused()
})

test('a section that arrives after the landing deadline still takes focus on its heading', async ({ page }) => {
  watch(page, 'a keyboard visitor following Plans from the footer on a slow connection')
  // Hold the Plans chunk past the 3s landing deadline, so the jump meets the loading stand-in first.
  // Red if the landing focuses the stand-in and lets focus fall to the page when the real section replaces it.
  let held = 0
  await page.route(/\/assets\/HomePlans-[\w-]+\.js(\?.*)?$/, async (route) => {
    held += 1
    await new Promise((resolve) => setTimeout(resolve, 4500))
    await route.continue()
  })
  await go(page, '/sitemap')
  await page.locator('.sp-footer a[href="/home#plans"]').first().click()
  await ready(page, '/home')
  await homeLanding(page, 'plans')
  expect(held, 'the Plans chunk was never requested, so nothing was held').toBeGreaterThan(0)
  await expect(page.locator('#plans-h')).toBeFocused()
})

test('an in-page section link lands below the nav bar and moves focus to the heading', async ({ page }) => {
  watch(page, 'a visitor following Plans from the footer of the homepage')
  await go(page, '/')
  await homeSectionsLoaded(page)
  await page.locator('.sp-footer a[href="#plans"]').click()
  const { top, bar } = await homeLanding(page, 'plans')
  expect(top, 'the section must start below the nav bar').toBeGreaterThanOrEqual(bar)
  await expect(page.locator('#plans-h')).toBeFocused()
})

for (const [old, current] of [['bench', 'bookmarks'], ['specimens', 'exports'], ['index', 'proof']]) {
  test(`the old #${old} link resolves to #${current}`, async ({ page }) => {
    watch(page, 'a visitor following an old homepage link')
    await go(page, `/home#${old}`)
    await expect(page).toHaveURL(new RegExp(`/home#${current}$`))
    const { top, bar } = await homeLanding(page, current)
    expect(top, 'the section must start below the nav bar').toBeGreaterThanOrEqual(bar)
  })
}

for (const [route, id] of [['/faq', 'faq'], ['/about', 'about']]) {
  test(`${route} redirects and lands on its help section`, async ({ page }) => {
    watch(page, 'a visitor following a legacy help URL')
    await go(page, route)
    await expectLanding(page, id, '.pnav')
  })
}

// WCAG 2.2 SC 2.4.11 (Focus Not Obscured): tabbing down the sales page must never leave the
// focused control behind the fixed nav bar. Nothing on the root scrolls it clear any more, so
// this reads where focus really lands. Run read in the page: the focused control, the nav
// bar's visible box, and what the browser paints at the control's centre. It reads after the
// control and the bar have stopped moving: the skip link slides in and the bar slides out.
const READ_FOCUS = async () => {
  const el = document.activeElement
  if (!el || el === document.body || el === document.documentElement) return null
  const nav = document.querySelector('.spnav')
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const pos = () => `${el.getBoundingClientRect().top}|${nav.getBoundingClientRect().top}`
  let last = pos()
  for (let still = 0, i = 0; still < 3 && i < 60; i++) {
    await frame()
    const now = pos()
    still = now === last ? still + 1 : 0
    last = now
  }
  const r = el.getBoundingClientRect()
  const n = nav.getBoundingClientRect()
  const ns = getComputedStyle(nav)
  const navShown = ns.visibility !== 'hidden' && Number(ns.opacity) > 0.01 && n.bottom > 0 && n.top < innerHeight
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const hit = document.elementFromPoint(cx, cy)
  const inNavBox = navShown && cx >= n.left && cx <= n.right && cy >= n.top && cy <= n.bottom
  const painted = !!hit && (el.contains(hit) || hit.contains(el))
  return {
    first: !(window.__tabSeen ??= new WeakSet()).has(el) && !!window.__tabSeen.add(el),
    name: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('href') ? `[href="${el.getAttribute('href')}"]` : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`,
    top: Math.round(r.top), bottom: Math.round(r.bottom), navBottom: Math.round(n.bottom),
    navShown, inFooter: !!el.closest('.sp-footer'), inNav: !!el.closest('.spnav'),
    onScreen: r.bottom > 0 && r.top < innerHeight,
    obscured: inNavBox && !painted,
  }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const navPinned of [false, true]) {
    test(`tabbing down the sales page never puts focus under the nav bar at ${viewport.width}px${navPinned ? ' with the bar showing' : ''}`, async ({ page }) => {
      test.setTimeout(90000)
      watch(page, 'a keyboard visitor tabbing through the homepage')
      await page.setViewportSize(viewport)
      // Reduced motion turns off the skip link's and the bar's slide, so each stop is read at rest
      // and not part-way through a transition that happens to be crossing the control.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await go(page, '/')
      await homeSectionsLoaded(page)
      // The bar slides away on the way down; a visitor who scrolls back up has it showing
      // while they tab, which is the harder case, so pin it open for one of the two runs.
      if (navPinned) await page.addStyleTag({ content: '.spnav,.spnav[data-nav-hidden="1"]{transform:none !important;opacity:1 !important;visibility:visible !important}' })
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await page.waitForFunction(() => scrollY === 0)

      const stops = []
      for (let i = 0; i < 600; i++) {
        await page.keyboard.press('Tab')
        const stop = await page.evaluate(READ_FOCUS)
        // Focus leaving the document, or coming back round to a control already visited, ends the walk.
        if (!stop || !stop.first) { if (stops.length) break; continue }
        stops.push(stop)
      }

      // Without these the loop could pass by visiting a handful of controls at the top.
      expect(stops.length, 'the Tab walk visited almost nothing').toBeGreaterThan(25)
      expect(stops.some((s) => s.inFooter), 'the Tab walk never reached the footer').toBe(true)
      expect(stops.some((s) => !s.inNav && s.navShown), 'the nav bar was never showing while a page control had focus').toBe(true)
      expect(stops.filter((s) => !s.onScreen).map((s) => s.name), 'focus moved to a control that is off screen').toEqual([])
      expect(stops.filter((s) => s.obscured).map((s) => `${s.name} top ${s.top}..${s.bottom}, nav bottom ${s.navBottom}`), 'focus landed under the nav bar').toEqual([])
    })
  }
}

test('the focus-under-the-nav check sees a control sitting behind the bar', async ({ page }) => {
  watch(page, 'a check of the keyboard focus detector')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await go(page, '/')
  await homeSectionsLoaded(page)
  await page.addStyleTag({ content: '.spnav,.spnav[data-nav-hidden="1"]{transform:none !important;opacity:1 !important;visibility:visible !important}' })
  // Park a page link at y=30 (inside the bar) and focus it without letting the browser scroll it clear.
  const stop = await page.evaluate(() => {
    const link = [...document.querySelectorAll('main a[href], #root a[href]')].find((a) => !a.closest('.spnav, .sp-footer, .skip-link') && a.className !== 'skip-link' && a.getBoundingClientRect().top > 120 && a.getBoundingClientRect().width > 0)
    window.scrollTo({ top: scrollY + link.getBoundingClientRect().top + link.getBoundingClientRect().height / 2 - 30, behavior: 'instant' })
    link.focus({ preventScroll: true })
    return null
  }).then(() => page.evaluate(READ_FOCUS))
  expect(stop.obscured, `a control at ${stop.top}..${stop.bottom} behind a bar ending at ${stop.navBottom} was not flagged`).toBe(true)
})
