// THE ONBOARDING KIT BUILDER at /onboarding: three beats (colour, fonts, name) on one page.
//
// The test seam is the route itself: signIn() with an un-onboarded account, then go('/onboarding').
// Save writes a project and lands on /create/palette; Skip lands on /projects.
//
//   Desktop (1440) and phone (390, with 320 for the narrow sweeps), one test() per journey.
//   Assertions are focus, route, aria, copy and geometry. No screenshots are compared.
//
// A failed save is reached through the free-plan project cap: an account already holding the
// allowance makes saveProject throw, which is the one way a save fails on the page.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }
const NARROW = { width: 320, height: 640 }

/** A context at a real device width: touch and a coarse pointer under 768. */
async function open(browser, size, extra = {}, account = {}) {
  const mobile = size.width < 768
  const context = await browser.newContext({
    viewport: size, isMobile: mobile, hasTouch: mobile, ...extra,
  })
  const page = await context.newPage()
  await signIn(page, { onboarded: false, ...account })
  await go(page, '/onboarding')
  await page.locator('[data-h1]').waitFor()
  return { context, page, mobile }
}

const h1 = (page) => page.locator('[data-h1]')
const go1 = (page) => page.locator('[data-go]')
const hex = (page) => page.locator('#onb-hex')
const nameField = (page) => page.locator('#onb-name')
const press = (page, mobile) => (mobile ? go1(page).tap() : go1(page).click())
const isFocused = (page, selector) => page.evaluate((s) => document.activeElement === document.querySelector(s), selector)

/** An un-onboarded free account that already holds the whole project allowance. */
const AT_CAP = { projects: FREE_SAVE_LIMITS.projects }

const BEATS = ['Start with your brand colour', 'Pick your fonts', 'Name your kit']

/** Press the pill forward from wherever the page is until it is on beat `n`. */
async function toBeat(page, n, mobile = false) {
  for (;;) {
    const at = Number(await page.locator('.ob').getAttribute('data-beat'))
    if (at >= n) break
    await press(page, mobile)
    await expect(h1(page)).toHaveText(BEATS[at])
  }
}

/** No sideways scroll, and the pill is inside the viewport. */
async function fitsViewport(page) {
  const m = await page.evaluate(() => {
    const r = document.querySelector('[data-go]').getBoundingClientRect()
    return {
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bottom: r.bottom, top: r.top, left: r.left, right: r.right,
      vw: window.innerWidth, vh: window.innerHeight,
    }
  })
  expect(m.over, 'sideways scroll').toBeLessThanOrEqual(0)
  expect(m.bottom, 'pill bottom inside the viewport').toBeLessThanOrEqual(m.vh)
  expect(m.left).toBeGreaterThanOrEqual(0)
  expect(m.right).toBeLessThanOrEqual(m.vw)
}

/**
 * Every animation the move to the next beat starts, as the properties it animates.
 * Under reduced motion the app collapses every transition to a hundredth of a millisecond:
 * that is an instant change, not motion, so anything under 1 ms is left out.
 */
async function momentProps(page, mobile) {
  await press(page, mobile)
  await expect(h1(page)).toHaveText(BEATS[1])
  return page.evaluate(() => {
    const props = new Set()
    for (const a of document.getAnimations()) {
      if (Number(a.effect?.getComputedTiming?.().activeDuration) < 1) continue
      for (const k of a.effect?.getKeyframes?.() || []) {
        for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p)
      }
    }
    return [...props]
  })
}

// ───────────────────────────── Desktop, 1440 ─────────────────────────────
test.describe('onboarding kit, desktop 1440', () => {
  test('1 happy path: typed colour, a font pair, a name, Save lands in the builder', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await expect(h1(page)).toHaveText(BEATS[0])
    await hex(page).fill('#02677D')
    await toBeat(page, 2)
    await page.locator('[data-pair=p2]').click()
    await expect(page.locator('[data-pair=p2]')).toHaveAttribute('aria-checked', 'true')
    await toBeat(page, 3)
    expect(await isFocused(page, '#onb-name')).toBe(true)
    await nameField(page).fill('Northside Bakery')
    await expect(page.locator('.ob-cap')).toContainText('Northside Bakery')
    await press(page, false)
    await expect(page).toHaveURL(/\/create\/palette/)
    expect(await page.evaluate(() => localStorage.getItem('vs-onboarded'))).toBe('1')
    await context.close()
  })

  test('2 a sample brand: its colours, its own pair first, its export, the kit it started from', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await page.locator('[data-sw=shallow-end]').click()
    await expect(page.locator('.ob-col')).toHaveCount(5)
    await expect(hex(page)).toHaveValue(/0E5C4A/i)
    await expect(page.locator('.ob-cap')).toContainText('Shallow End, a sample brand')
    expect(await isFocused(page, '[data-go]')).toBe(true)
    await toBeat(page, 2)
    const pairs = page.locator('[data-pair]')
    await expect(pairs).toHaveCount(4)
    await expect(pairs.first()).toHaveAttribute('data-pair', 'own')
    await expect(pairs.first()).toHaveAttribute('aria-checked', 'true')
    // The sample export strip belongs to the name beat.
    await expect(page.locator('.ob-exp')).toHaveCount(0)
    await toBeat(page, 3)
    await expect(page.locator('.ob-exp img').first()).toBeVisible()
    await expect(page.locator('.ob-exp-c')).toContainText('the kit you started from')
    await page.locator('[data-back]').click()
    await page.locator('[data-pair=p1]').click()
    await expect(page.locator('[data-pair=p1]')).toHaveAttribute('aria-checked', 'true')
    await toBeat(page, 3)
    await expect(page.locator('.ob-exp-c')).not.toContainText('the kit you started from')
    await expect(page.locator('.ob-exp-c')).toContainText('Sample export from Shallow End.')
    await context.close()
  })

  test('3 invalid hex: the fix is named, focus goes to the field, it recovers', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await hex(page).fill('#FF5A1')
    await press(page, false)
    await expect(h1(page)).toHaveText(BEATS[0])
    await expect(page.locator('#onb-help')).toHaveText('Enter 6 hex digits, like #FF5A1F.')
    await expect(hex(page)).toBeFocused()
    await hex(page).fill('ff5a1f')
    await press(page, false)
    await expect(h1(page)).toHaveText(BEATS[1])
    await context.close()
  })

  test('4 fonts: a pair that cannot load says so in plain words', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    // The stylesheet for this pair is refused, whatever the runner's network does.
    await page.route(/fonts\.googleapis\.com\/css2\?family=Playfair/, (route) => route.abort())
    await toBeat(page, 2)
    await page.locator('[data-pair=p2]').click()
    await expect(page.getByText(/didn.t load, so it.s shown in a fallback font/)).toBeVisible()
    await context.close()
  })

  test('5 Back keeps the colour, the pair and the name in both directions', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await hex(page).fill('#02677D')
    await toBeat(page, 2)
    await page.locator('[data-pair=p3]').click()
    await toBeat(page, 3)
    await nameField(page).fill('Kept name')
    await page.locator('[data-back]').click()
    await expect(h1(page)).toHaveText(BEATS[1])
    await expect(page.locator('[data-pair=p3]')).toHaveAttribute('aria-checked', 'true')
    expect(await isFocused(page, '[data-go]')).toBe(true)
    await page.locator('[data-back]').click()
    await expect(hex(page)).toHaveValue(/02677D/i)
    await toBeat(page, 3)
    await expect(nameField(page)).toHaveValue('Kept name')
    await context.close()
  })

  test('6 Skip and leave: the link is clickable where it is drawn, the other starts are beat 1 only', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await expect(page.locator('a[data-start][data-first-win]')).toHaveCount(2)
    const skip = page.locator('a[data-skip]')
    await expect(skip).toHaveText('Not now, take me to my projects')
    const hit = await skip.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return el === top || el.contains(top)
    })
    expect(hit, 'nothing sits on top of the Skip link').toBe(true)
    await toBeat(page, 2)
    await expect(page.locator('a[data-start][data-first-win]')).toHaveCount(0)
    await expect(skip).toBeVisible()
    await skip.click()
    await expect(page).toHaveURL(/\/projects/)
    await context.close()
  })

  test('7 fastest path: three presses of the pill save the defaults', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await press(page, false)
    await press(page, false)
    await expect(go1(page)).toHaveText(/Save to my projects/)
    await press(page, false)
    await expect(page).toHaveURL(/\/create\/palette/)
    await context.close()
  })

  test('8 keyboard only: heading focus, arrows move and select the pairs, Escape goes back', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    expect(await isFocused(page, '[data-h1]')).toBe(true)
    await go1(page).focus()
    await page.keyboard.press('Enter')
    await expect(h1(page)).toHaveText(BEATS[1])
    expect(await isFocused(page, '[data-h1]')).toBe(true)
    await page.locator('[data-pair=p1]').focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-pair=p2]')).toHaveAttribute('aria-checked', 'true')
    expect(await isFocused(page, '[data-pair=p2]')).toBe(true)
    await page.keyboard.press('End')
    await expect(page.locator('[data-pair=p3]')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-pair=p1]')).toHaveAttribute('aria-checked', 'true')
    await go1(page).focus()
    await page.keyboard.press('Enter')
    await expect(h1(page)).toHaveText(BEATS[2])
    await page.keyboard.press('Escape')
    await expect(h1(page)).toHaveText(BEATS[1])
    await context.close()
  })

  test('9 back out: Escape and Back each return one beat, nothing is saved', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP)
    await toBeat(page, 3)
    await page.locator('[data-back]').click()
    await expect(h1(page)).toHaveText(BEATS[1])
    await press(page, false)
    await page.keyboard.press('Escape')
    await expect(h1(page)).toHaveText(BEATS[1])
    await expect(page).toHaveURL(/\/onboarding/)
    expect(await page.evaluate(() => localStorage.getItem('vs-onboarded'))).not.toBe('1')
    await context.close()
  })

  test('10 failed save: the alert names the fix and keeps the kit', async ({ browser }) => {
    const { context, page } = await open(browser, DESKTOP, {}, AT_CAP)
    await hex(page).fill('#02677D')
    await toBeat(page, 3)
    await nameField(page).fill('Northside Bakery')
    await press(page, false)
    const alert = page.getByRole('alert').filter({ hasText: 'didn’t save' })
    await expect(alert).toHaveText('Your kit didn’t save. Check your connection and try again. Everything you picked is still here.')
    await expect(alert.locator('svg')).toHaveCount(1)
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(go1(page)).toHaveText(/Save to my projects/)
    await expect(go1(page)).toHaveAttribute('aria-busy', 'false')
    await expect(nameField(page)).toHaveValue('Northside Bakery')
    await expect(nameField(page)).toBeEnabled()
    await page.locator('[data-back]').click()
    await page.locator('[data-back]').click()
    await expect(hex(page)).toHaveValue('#02677D')
    await context.close()
  })

  test('11 the moment: transform and opacity only; reduced motion is opacity only', async ({ browser }) => {
    const normal = await open(browser, DESKTOP)
    const props = await momentProps(normal.page, false)
    expect(props, 'the moment moves nothing').toContain('transform')
    for (const p of props) expect(['transform', 'opacity'], `animated ${p}`).toContain(p)
    await normal.context.close()
    // The design keeps a 200ms cross-fade under reduced motion, so something must still fade.
    const reduced = await open(browser, DESKTOP, { reducedMotion: 'reduce' })
    const rprops = await momentProps(reduced.page, false)
    expect(rprops, 'no cross-fade under reduced motion').toEqual(['opacity'])
    await reduced.context.close()
  })
})

// ───────────────────────────── Phone, 390 and 320 ─────────────────────────────
test.describe('onboarding kit, phone', () => {
  test('1 happy path by tap: the pill stays on screen, no target under 44, Save lands in the builder', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    await hex(page).fill('#02677D')
    for (let n = 1; n <= 3; n += 1) {
      await fitsViewport(page)
      const sizes = await page.evaluate(() => [...document.querySelectorAll('[data-go],[data-back],a[data-skip],[data-pair],a[data-start]')]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => ({ n: el.getAttribute('data-pair') || el.className, h: el.getBoundingClientRect().height })))
      for (const s of sizes) expect(s.h, `target ${s.n}`).toBeGreaterThanOrEqual(44)
      if (n < 3) await toBeat(page, n + 1, true)
    }
    await nameField(page).fill('Northside Bakery')
    await press(page, true)
    await expect(page).toHaveURL(/\/create\/palette/)
    await context.close()
  })

  test('2 narrow: no sideways scroll and the pill on screen on all three beats at 390 and 320', async ({ browser }) => {
    for (const size of [PHONE, NARROW]) {
      const { context, page } = await open(browser, size)
      for (let n = 1; n <= 3; n += 1) {
        await fitsViewport(page)
        if (n < 3) await toBeat(page, n + 1, true)
      }
      await context.close()
    }
  })

  test('3 invalid hex: the fix is named, focus goes to the field, it recovers', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    await hex(page).fill('#FF5A1')
    await press(page, true)
    await expect(page.locator('#onb-help')).toHaveText('Enter 6 hex digits, like #FF5A1F.')
    await expect(hex(page)).toBeFocused()
    await hex(page).fill('#FF5A1F')
    await press(page, true)
    await expect(h1(page)).toHaveText(BEATS[1])
    await context.close()
  })

  test('4 Back (44px) keeps the colour and the pair', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    await hex(page).fill('#02677D')
    await toBeat(page, 2, true)
    await page.locator('[data-pair=p3]').tap()
    await toBeat(page, 3, true)
    const back = page.locator('[data-back]')
    expect((await back.boundingBox()).height).toBeGreaterThanOrEqual(44)
    await back.tap()
    await expect(page.locator('[data-pair=p3]')).toHaveAttribute('aria-checked', 'true')
    await page.locator('[data-back]').tap()
    await expect(hex(page)).toHaveValue(/02677D/i)
    await context.close()
  })

  test('5 keyboard: arrows select a pair and keep focus, Enter on the pill moves on', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    await go1(page).focus()
    await page.keyboard.press('Enter')
    await expect(h1(page)).toHaveText(BEATS[1])
    await page.locator('[data-pair=p1]').focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[data-pair=p2]')).toHaveAttribute('aria-checked', 'true')
    expect(await isFocused(page, '[data-pair=p2]')).toBe(true)
    await context.close()
  })

  test('6 back out: Escape and Back each return one beat and nothing is saved', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    await toBeat(page, 3, true)
    await page.keyboard.press('Escape')
    await expect(h1(page)).toHaveText(BEATS[1])
    await press(page, true)
    await page.locator('[data-back]').tap()
    await expect(h1(page)).toHaveText(BEATS[1])
    await expect(page).toHaveURL(/\/onboarding/)
    await context.close()
  })

  test('7 failed save at 390 and 320: role=alert, kit kept, nothing clipped', async ({ browser }) => {
    for (const size of [PHONE, NARROW]) {
      const { context, page } = await open(browser, size, {}, AT_CAP)
      await hex(page).fill('#02677D')
      await toBeat(page, 3, true)
      await nameField(page).fill('Northside Bakery')
      await press(page, true)
      const alert = page.getByRole('alert').filter({ hasText: 'didn’t save' })
      await expect(alert).toHaveText('Your kit didn’t save. Check your connection and try again. Everything you picked is still here.')
      await expect(go1(page)).toHaveText(/Save to my projects/)
      await expect(nameField(page)).toHaveValue('Northside Bakery')
      const m = await page.evaluate(() => {
        const a = document.querySelector('.ob-status.is-err').getBoundingClientRect()
        return { l: a.left, r: a.right, b: a.bottom, vw: window.innerWidth, vh: window.innerHeight }
      })
      expect(m.l, 'alert left edge').toBeGreaterThanOrEqual(0)
      expect(m.r, 'alert right edge').toBeLessThanOrEqual(m.vw)
      expect(m.b, 'alert bottom').toBeLessThanOrEqual(m.vh)
      await fitsViewport(page)
      await context.close()
    }
  })

  test('8 starters: five radios, arrows wrap, typing a hex clears the starter and its own pair', async ({ browser }) => {
    const { context, page } = await open(browser, PHONE)
    const radios = page.locator('[data-sw]')
    await expect(radios).toHaveCount(5)
    await page.locator('[data-sw=shallow-end]').tap()
    await expect(page.locator('[data-sw=shallow-end]')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.ob-cap')).toContainText('Shallow End, a sample brand')
    await page.locator('[data-sw=kerbside]').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[data-sw=two-shores]')).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-sw=kerbside]')).toHaveAttribute('aria-checked', 'true')
    await page.locator('[data-sw=shallow-end]').tap()
    await hex(page).fill('#02677D')
    await expect(page.locator('[data-sw][aria-checked=true]')).toHaveCount(0)
    await toBeat(page, 2, true)
    await expect(page.locator('[data-pair=own]')).toHaveCount(0)
    await context.close()
  })

  test('9 sweep at 320: a 60-character name and the invalid-hex line stay on screen', async ({ browser }) => {
    const { context, page } = await open(browser, NARROW)
    await hex(page).fill('#FF5A1')
    await press(page, true)
    await fitsViewport(page)
    await hex(page).fill('#FF5A1F')
    await toBeat(page, 3, true)
    await nameField(page).fill('N'.repeat(60))
    await fitsViewport(page)
    const clipped = await page.evaluate(() => [...document.querySelectorAll('.ob *')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > window.innerWidth + 1) && getComputedStyle(el).position !== 'fixed' && !el.closest('.ob-exp,.ob-rail-g') })
      .length)
    expect(clipped, 'elements past either edge').toBe(0)
    await context.close()
  })

  test('10 leave: the type scale link opens its tool, Skip goes to the projects', async ({ browser }) => {
    const first = await open(browser, PHONE)
    const link = first.page.locator('a[data-start][data-first-win]').first()
    await expect(link).toBeVisible()
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44)
    await link.tap()
    await expect(first.page).not.toHaveURL(/\/onboarding/)
    await first.context.close()
    const second = await open(browser, PHONE)
    await second.page.locator('a[data-skip]').tap()
    await expect(second.page).toHaveURL(/\/projects/)
    await second.context.close()
  })

  test('11 the moment: transform and opacity only; reduced motion is opacity only', async ({ browser }) => {
    const normal = await open(browser, PHONE)
    const props = await momentProps(normal.page, true)
    expect(props, 'the moment moves nothing').toContain('transform')
    for (const p of props) expect(['transform', 'opacity'], `animated ${p}`).toContain(p)
    await normal.context.close()
    const reduced = await open(browser, PHONE, { reducedMotion: 'reduce' })
    expect(await momentProps(reduced.page, true), 'no cross-fade under reduced motion').toEqual(['opacity'])
    await reduced.context.close()
  })
})
