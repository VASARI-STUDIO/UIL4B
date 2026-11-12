// V3 app shell: the bar, the account and "..." popovers, the phone header, tab
// bar and sheet, and the footer. Written as people use them: open, click, press
// keys, change width, change theme. Test seam: the rendered header at /create/palette
// (selectors: .pnav, .pnav-trigger, .pnav-act, .pnav-upgrade, .pnav-avatar-btn,
// .pnav-more, .pnav-mobile, .pnav-tab, .pnav-sheet, .app-footer).
//
// Run: LANE=shell PLAYWRIGHT_PORT=4310 npx playwright test -c pw-lane.config.js tests/user-sim/v3-shell.spec.js
//
// MUTATIONS (each should fail the named test, then be put back):
//   · In v3-shell.css change `.pnav{...height` / the bar's `--chrome-h` read: "the bar is 64px" fails.
//   · Delete `.pnav-upgrade::before{...}`: "Upgrade draws the chroma ring" fails.
//   · Change the `@media(min-width:1140px)` keycap rule to 1100px: "search ladder" fails at 1139.
//   · Change the 999px symbol-wordmark query to 939px: "wordmark" fails at 960.
//   · Remove the `.skip-link` focus rule that brings it on screen: "skip link" fails.
//   · Remove `aria-current` from the current phone tab (PhoneTabBar.jsx): "phone tab bar" fails.
//   · Make the "..." menu's Escape handler a no-op (usePopover): "popover back out" fails.
//   · Delete `[data-theme="dark"]{--v3-ground:...}` in v3-shell.css: "theme" fails (bar stays light).
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const FREE = { plan: 'free', projects: 1 }
const WIDE = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

async function open(browser, size, { theme = 'light', who = FREE, url = '/create/palette', touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  watch(page, `shell ${size.width} ${theme}`)
  await page.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* blocked */ } }, theme)
  if (who) await signIn(page, who)
  await go(page, url)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  return { ctx, page }
}

const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } })

test.describe('desktop bar at 1440', () => {
  test('the bar is 64px, one row, with the nav, actions and account in order', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const bar = await box(page.locator('nav.pnav, .pnav').first())
    expect(Math.round(bar.h)).toBe(64)
    const xs = []
    for (const sel of ['.pnav-logo', '.pnav-search-field', '.pnav-trigger >> nth=0', '.pnav-export', '.pnav-act--dash', '.pnav-upgrade', '.pnav-avatar-btn']) {
      xs.push((await box(page.locator(sel).first())).x)
    }
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    for (const sel of ['.pnav-logo', '.pnav-search-field', '.pnav-upgrade']) {
      const b = await box(page.locator(sel).first())
      expect(b.y).toBeGreaterThanOrEqual(bar.y)
      expect(b.bottom).toBeLessThanOrEqual(bar.bottom + 0.5)
    }
    await ctx.close()
  })

  test('search by mouse opens the palette, Escape returns focus to the field', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const field = page.locator('.pnav-search-field')
    await field.click()
    const dialog = page.getByRole('dialog', { name: /search/i })
    await expect(dialog).toBeVisible()
    await page.keyboard.type('contrast')
    await expect(page.getByRole('option').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(field).toBeFocused()
    await ctx.close()
  })

  test('search by keyboard: slash opens it, Enter goes to the active result', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await page.locator('main, body').first().click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('/')
    const dialog = page.getByRole('dialog', { name: /search/i })
    await expect(dialog).toBeVisible()
    await page.keyboard.type('contrast')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/create\/contrast/)
    await ctx.close()
  })

  test('the three menus open by click, show their rows, and Escape closes them', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    for (const name of ['Create', 'Discover', 'Learn']) {
      const trigger = page.locator('.pnav-trigger', { hasText: name })
      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator('#pnav-mega')).toBeVisible()
      expect(await page.locator('#pnav-mega .pnav-tool').count()).toBeGreaterThan(2)
      await page.keyboard.press('Escape')
      await expect(page.locator('#pnav-mega')).toBeHidden()
      await expect(trigger).toBeFocused()
    }
    await ctx.close()
  })

  test('theme: the theme button flips the page and the bar follows', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE, { theme: 'light' })
    const bg = () => page.locator('.pnav').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    const light = await bg()
    await page.locator('.pnav-theme').click()
    await expect.poll(() => page.locator('html').getAttribute('data-theme')).not.toBe('light')
    expect(await bg()).not.toBe(light)
    await ctx.close()
  })

  test('keyboard bar: the skip link is first, off screen at rest, and Enter lands on #main', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const skip = page.locator('a.skip-link')
    expect((await box(skip)).bottom).toBeLessThanOrEqual(0)
    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()
    // The link slides in over 180ms: wait for it to land rather than read mid-slide.
    await expect.poll(async () => (await box(skip)).y).toBeGreaterThanOrEqual(0)
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
    await ctx.close()
  })

  test('keyboard bar: Tab walks the logo, search and the three triggers in order with a visible ring', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await page.keyboard.press('Tab') // skip link
    const order = []
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      order.push(await page.evaluate(() => {
        const el = document.activeElement
        const cs = getComputedStyle(el)
        return { name: el.getAttribute('aria-label') || el.textContent.trim(), ring: parseFloat(cs.outlineWidth) >= 2 && cs.outlineStyle !== 'none' }
      }))
    }
    expect(order.map((o) => o.name)).toEqual([expect.stringMatching(/UIL4B/), 'Search UIL4B', 'Create', 'Discover', 'Learn'])
    for (const o of order) expect(o.ring).toBe(true)
    await ctx.close()
  })

  test('back out: Escape and an outside click close the account popover and the "..." menu', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const avatar = page.locator('.pnav-avatar-btn')
    await avatar.click()
    await expect(avatar).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(avatar).toHaveAttribute('aria-expanded', 'false')
    await expect(avatar).toBeFocused()
    await avatar.click()
    await page.mouse.click(300, 600)
    await expect(avatar).toHaveAttribute('aria-expanded', 'false')
    await ctx.close()
  })

  test('signed out: Log in and the "..." menu rows go somewhere', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE, { who: null })
    await expect(page.locator('.pnav-login')).toBeVisible()
    const more = page.locator('.pnav-more')
    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('link', { name: 'Help centre' }).click()
    await expect(page).toHaveURL(/\/learn\/help/)
    await ctx.close()
  })

  test('account menu: identity, links, and Sign out is reachable', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await page.locator('.pnav-avatar-btn').click()
    const pop = page.getByRole('dialog', { name: 'Account and settings' }).or(page.locator('.pnav-pop').first())
    await expect(pop).toBeVisible()
    for (const name of ['Account and settings', 'Help centre', 'Send feedback']) {
      await expect(pop.getByRole('link', { name })).toBeVisible()
    }
    await expect(pop.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await ctx.close()
  })

  test('widths: nothing wraps or leaves the bar at 1440, 1200, 1100, 940, 820 and 768', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    for (const w of [1440, 1200, 1139, 1100, 999, 940, 820, 768]) {
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(120)
      const m = await page.evaluate(() => {
        const bar = document.querySelector('.pnav').getBoundingClientRect()
        const kids = [...document.querySelectorAll('.pnav-inner > *')].map((e) => e.getBoundingClientRect())
        return { h: bar.height, right: Math.max(...kids.map((k) => k.right)), vw: innerWidth, sw: document.documentElement.scrollWidth }
      })
      expect(Math.round(m.h), `bar height at ${w}`).toBe(64)
      expect(m.right, `content inside the bar at ${w}`).toBeLessThanOrEqual(m.vw + 0.5)
      expect(m.sw, `no sideways scroll at ${w}`).toBeLessThanOrEqual(m.vw)
    }
    await ctx.close()
  })

  test('search ladder: keycap from 1140, text-only 1100 to 1139, icon below 1100', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const read = async (w) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(120)
      return page.evaluate(() => {
        const f = document.querySelector('.pnav-search-field').getBoundingClientRect()
        const k = document.querySelector('.pnav-search-kbd')
        return { w: f.width, kbd: k && getComputedStyle(k).display !== 'none' }
      })
    }
    const a = await read(1140); expect(a.w).toBeGreaterThanOrEqual(163.5); expect(a.kbd).toBe(true)
    const b = await read(1139); expect(b.w).toBeGreaterThanOrEqual(127.5); expect(b.kbd).toBe(false)
    const c = await read(1099); expect(Math.round(c.w)).toBe(36)
    await ctx.close()
  })

  test('wordmark: the symbol shows from 768 to 999, the full lockup from 1000', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const shown = async (w) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(120)
      return page.evaluate(() => ({
        wide: getComputedStyle(document.querySelector('.pnav-word .brand-logo-wide')).display !== 'none',
        narrow: getComputedStyle(document.querySelector('.pnav-word .brand-logo-narrow')).display !== 'none',
      }))
    }
    expect(await shown(960)).toEqual({ wide: false, narrow: true })
    expect(await shown(1000)).toEqual({ wide: true, narrow: false })
    await ctx.close()
  })

  test('Upgrade draws the chroma ring, and a keyboard focus turns it', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const up = page.locator('.pnav-upgrade')
    const ring = () => up.evaluate((el) => {
      const cs = getComputedStyle(el, '::before')
      return { content: cs.content, bg: cs.backgroundImage, a: cs.getPropertyValue('--mi-a').trim() }
    })
    const rest = await ring()
    expect(rest.content).not.toBe('none')
    expect(rest.bg).toContain('conic-gradient')
    await up.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(up).toBeFocused()
    await page.waitForTimeout(700)
    expect((await ring()).a).not.toBe(rest.a)
    await ctx.close()
  })

  test('the footer links go to real pages', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE, { url: '/projects' })
    const footer = page.locator('.app-footer')
    await footer.scrollIntoViewIfNeeded()
    const hrefs = await footer.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(hrefs.length).toBeGreaterThan(5)
    await footer.locator('a[href^="/"]').first().click()
    await expect(page.locator('.pnav')).toBeVisible()
    await ctx.close()
  })
})

for (const theme of ['light', 'dark']) {
  test(`the bar's ground and hairline come from the role tokens in ${theme}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE, { theme })
    const v = await page.evaluate(() => {
      const bar = getComputedStyle(document.querySelector('.pnav'))
      const root = getComputedStyle(document.documentElement)
      return { bg: bar.backgroundColor, ground: root.getPropertyValue('--v3-ground').trim(), blur: bar.backdropFilter }
    })
    expect(v.ground).not.toBe('')
    expect(v.blur === 'none' || v.blur === '').toBe(true)
    expect(v.bg).not.toMatch(/rgba\(.*,\s*0\.\d+\)/)
    await ctx.close()
  })
}

test.describe('phone at 390 (touch)', () => {
  test('header: wordmark, search, export, avatar and menu are 44px targets that fit the width', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true })
    for (const sel of ['.pnav-search-field', '.pnav-export', '.pnav-avatar-btn', '.pnav-mobile']) {
      const b = await box(page.locator(sel).first())
      expect(b.w, sel).toBeGreaterThanOrEqual(43.5)
      expect(b.h, sel).toBeGreaterThanOrEqual(43.5)
      expect(b.right, sel).toBeLessThanOrEqual(390)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await ctx.close()
  })

  test('tab bar: four tabs, the current one is marked, and it sits on the bottom edge', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true })
    const tabs = page.locator('.pnav-tab')
    await expect(tabs).toHaveCount(4)
    await expect(page.locator('.pnav-tab[aria-current="page"]')).toHaveCount(1)
    await expect(page.locator('.pnav-tab[aria-current="page"]')).toContainText('Create')
    const b = await box(page.locator('.pnav-tabs'))
    expect(Math.round(b.bottom)).toBe(844)
    expect(b.h).toBeGreaterThanOrEqual(63)
    await ctx.close()
  })

  test('menu sheet: the Create tab opens it, a row routes, and Close menu closes it', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, url: '/projects' })
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    await expect(page.locator('.pnav-mobile')).toHaveAccessibleName('Close menu')
    await page.locator('.pnav-mobile').tap()
    await expect(sheet).toBeHidden()
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    await page.locator('.pnav-acc-link', { hasText: 'Font Pair' }).tap()
    await expect(page).toHaveURL(/\/create\/font-pair/)
    await expect(sheet).toBeHidden()
    await ctx.close()
  })

  test('search sheet: the header search opens the palette', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true })
    await page.locator('.pnav-search-field').tap()
    await expect(page.getByRole('dialog', { name: /search/i })).toBeVisible()
    await ctx.close()
  })

  test('You tab: signed in it opens the account sheet with Sign out', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true })
    await page.locator('.pnav-tab', { hasText: 'You' }).tap()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await ctx.close()
  })

  test('keyboard back out: Escape closes the sheet and focus returns to the tab', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true })
    const tab = page.locator('.pnav-tab', { hasText: 'Create' })
    await tab.tap()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.pnav-sheet')).toBeHidden()
    await ctx.close()
  })

  test('theme: the sheet carries the theme switch and the page changes with it', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, theme: 'light' })
    await page.locator('.pnav-tab', { hasText: 'You' }).tap()
    const dark = page.locator('.pnav-sheet').getByText('Dark', { exact: true }).first()
    await dark.tap()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await ctx.close()
  })

  test('widths: nothing leaves the screen at 390 and 320, light and dark', async ({ browser }) => {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await open(browser, PHONE, { touch: true, theme })
      for (const w of [390, 320]) {
        await page.setViewportSize({ width: w, height: 700 })
        await page.waitForTimeout(150)
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${theme} ${w}`).toBeLessThanOrEqual(w)
        const right = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.pnav-inner > *')].map((e) => e.getBoundingClientRect().right)))
        expect(right, `${theme} ${w} header`).toBeLessThanOrEqual(w + 0.5)
      }
      await ctx.close()
    }
  })

  test('footer: two columns of links, every link a 44px target', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, url: '/projects' })
    const footer = page.locator('.app-footer')
    await footer.scrollIntoViewIfNeeded()
    const hs = await footer.locator('.app-footer-links a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height))
    expect(hs.length).toBeGreaterThan(5)
    for (const h of hs) expect(h).toBeGreaterThanOrEqual(43.5)
    await ctx.close()
  })
})
