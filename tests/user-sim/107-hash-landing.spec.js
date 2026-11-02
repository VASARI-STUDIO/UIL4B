import { test, expect } from './base.js'
import { go, ready, watch } from './helpers.js'

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

test('a fresh sales hash still lands below its nav', async ({ page }) => {
  watch(page, 'a visitor opening the sales bench section')
  await go(page, '/home#bench')
  await expectLanding(page, 'bench', '.spnav')
})

test('a section link from another route lands on the sales page', async ({ page }) => {
  watch(page, 'a visitor following The bench from the footer on the mobile page')
  await go(page, '/mobile')
  await page.locator('.sp-footer a[href="/home#bench"]').first().click()
  await ready(page, '/home')
  await expectLanding(page, 'bench', '.spnav')
})

for (const [route, id] of [['/faq', 'faq'], ['/about', 'about']]) {
  test(`${route} redirects and lands on its help section`, async ({ page }) => {
    watch(page, 'a visitor following a legacy help URL')
    await go(page, route)
    await expectLanding(page, id, '.pnav')
  })
}
