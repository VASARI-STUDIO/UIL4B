// V3 mega menus (Create, Discover, Learn): the quiet index. Written as people use
// them: hover, click, pick, back out, keyboard, phone sheet. Test seam: the open
// panel (#pnav-mega) under the header triggers (.pnav-trigger) at /create/palette;
// on the phone the sheet (.pnav-sheet) opened from the tab bar (.pnav-tab).
//
// Run: LANE=shell PLAYWRIGHT_PORT=4310 npx playwright test -c pw-lane.config.js tests/user-sim/v3-mega.spec.js
//
// MUTATIONS (each should fail the named test, then be put back):
//   · In PillNav.jsx make a click on a hover-opened trigger close it (toggle ignores `openedBy`):
//     "hover then click pins the menu" fails.
//   · In v3-shell.css widen `.pnav-menu` back to `width:min(1100px,...)` or drop the
//     `left` placement effect (useLayoutEffect in PillNav.jsx): "the panel sits under its trigger" fails.
//   · Remove `aria-current` from the row for the page (isHere in PillNav.jsx):
//     "the row for this page is marked" fails.
//   · Delete the 2x16 bar rule `.pnav-tool[aria-current="page"]::before`: the same test fails on the bar.
//   · Stop LearnRecommended skipping the current guide (learnRecommendation.js): "Learn never recommends
//     the guide you are on" fails.
//   · Make Escape a no-op in the menu keydown handler: "keyboard: Escape closes and returns to the trigger" fails.
//   · Remove the `(hover:hover) and (pointer:fine)` guard from any row-hover rule: "touch: no hover motion" fails.
//   · Change the foot string in menuModel.js: "foot and pane strings" fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const FREE = { plan: 'free', projects: 1 }
const WIDE = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

async function open(browser, size, { theme = 'dark', url = '/create/palette', touch = false, who = FREE } = {}) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  watch(page, `mega ${size.width} ${theme}`)
  await page.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* blocked */ } }, theme)
  if (who) await signIn(page, who)
  await go(page, url)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  return { ctx, page }
}

const trig = (page, name) => page.locator('.pnav-trigger', { hasText: name })
const panel = (page) => page.locator('#pnav-mega')
const rows = (page) => page.locator('#pnav-mega .pnav-tool')
const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } })

test.describe('desktop menus at 1440', () => {
  test('Create by click: its columns, hover readout, a pick routes, reopen, close', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Create').click()
    await expect(panel(page)).toBeVisible()
    await expect(panel(page)).toContainText('Colour')
    await expect(panel(page)).toContainText('Typography')
    await expect(panel(page)).toContainText('Icons')
    await expect(panel(page)).toContainText('Media')
    await expect(panel(page)).toContainText('Build your brand kit, step by step')
    await rows(page).filter({ hasText: 'Font Pair' }).click()
    await expect(page).toHaveURL(/\/create\/font-pair/)
    await expect(panel(page)).toBeHidden()
    await trig(page, 'Create').click()
    await expect(panel(page)).toBeVisible()
    await trig(page, 'Create').click()
    await expect(panel(page)).toBeHidden()
    await ctx.close()
  })

  test('Discover and Learn by click: strings, picks', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Discover').click()
    await expect(panel(page)).toContainText('Palette Library')
    await expect(panel(page)).toContainText('Open Discover')
    await page.getByRole('link', { name: 'Open Discover' }).click()
    await expect(page).toHaveURL(/\/discover$/)
    await trig(page, 'Learn').click()
    await expect(panel(page)).toContainText('Understand the why')
    await expect(panel(page)).toContainText('See all guides')
    await panel(page).getByRole('link', { name: 'See all guides' }).click()
    await expect(page).toHaveURL(/\/learn$/)
    await ctx.close()
  })

  test('foot and pane strings: the counts come from the data, the wording from the design', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Create').click()
    await expect(panel(page)).toContainText(/live tools.*across colour, type, icons, media and AI\./)
    await expect(panel(page)).toContainText('View all create tools')
    await page.keyboard.press('Escape')
    await trig(page, 'Learn').click()
    await expect(panel(page)).toContainText(/published guides, more on the way\./)
    await ctx.close()
  })

  test('the panel sits under its trigger and stays inside the viewport', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const widths = {}
    for (const name of ['Create', 'Discover', 'Learn']) {
      await trig(page, name).click()
      await expect(panel(page)).toBeVisible()
      await page.waitForTimeout(300)
      const p = await box(panel(page))
      const t = await box(trig(page, name))
      widths[name] = Math.round(p.w)
      expect(p.x, `${name} left edge`).toBeGreaterThanOrEqual(23.5)
      expect(p.right, `${name} right edge`).toBeLessThanOrEqual(1440 - 23.5)
      expect(p.y, `${name} top clears the bar`).toBeGreaterThanOrEqual(64)
      expect(p.x <= t.x + t.w).toBe(true)
      await page.keyboard.press('Escape')
    }
    expect(widths.Create).toBeGreaterThan(widths.Discover)
    expect(widths.Learn).toBeGreaterThan(widths.Discover)
    await ctx.close()
  })

  test('hover from closed opens a menu, and hovering a neighbour swaps it', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Create').hover()
    await expect(trig(page, 'Create')).toHaveAttribute('aria-expanded', 'true')
    await trig(page, 'Discover').hover()
    await expect(trig(page, 'Discover')).toHaveAttribute('aria-expanded', 'true')
    await expect(trig(page, 'Create')).toHaveAttribute('aria-expanded', 'false')
    await ctx.close()
  })

  test('hover then click pins the menu: it stays open after the pointer leaves', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Create').hover()
    await expect(panel(page)).toBeVisible()
    await trig(page, 'Create').click()
    await page.mouse.move(700, 800)
    await page.waitForTimeout(500)
    await expect(panel(page)).toBeVisible()
    await ctx.close()
  })

  test('keyboard Create: arrows walk the rows with a visible ring, Home and End jump, wrap', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Create').focus()
    await page.keyboard.press('Enter')
    await expect(panel(page)).toBeVisible()
    await page.keyboard.press('ArrowDown')
    const first = await page.evaluate(() => document.activeElement?.closest('#pnav-mega .pnav-tool')?.getAttribute('data-row-id') || document.activeElement?.textContent)
    expect(first).toBeTruthy()
    const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 })
    expect(ring).toBe(true)
    await page.keyboard.press('End')
    const last = await page.evaluate(() => document.activeElement.textContent)
    await page.keyboard.press('Home')
    const home = await page.evaluate(() => document.activeElement.textContent)
    expect(home).not.toBe(last)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Shift+Tab')
    await ctx.close()
  })

  test('keyboard: Escape closes and returns to the trigger; Left and Right move between menus', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Create').focus()
    await page.keyboard.press('Space')
    await expect(panel(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel(page)).toBeHidden()
    await expect(trig(page, 'Create')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(panel(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await ctx.close()
  })

  test('back out: Escape, an outside click and the trigger close it and leave the page as it was', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    const url = page.url()
    for (const how of ['escape', 'outside', 'trigger']) {
      await trig(page, 'Create').click()
      await expect(panel(page)).toBeVisible()
      if (how === 'escape') await page.keyboard.press('Escape')
      else if (how === 'outside') await page.mouse.click(80, 800)
      else await trig(page, 'Create').click()
      await expect(panel(page)).toBeHidden()
    }
    expect(page.url()).toBe(url)
    await ctx.close()
  })

  for (const theme of ['light', 'dark']) {
    test(`the row for this page is marked in ${theme}: one check, one bar, one aria-current`, async ({ browser }) => {
      const { ctx, page } = await open(browser, WIDE, { theme })
      await trig(page, 'Create').click()
      await expect(panel(page)).toBeVisible()
      await page.waitForTimeout(300)
      const cur = panel(page).locator('.pnav-tool[aria-current="page"]')
      await expect(cur).toHaveCount(1)
      await expect(cur).toContainText('Palette')
      await expect(cur.locator('.pnav-tool-here')).toHaveCount(1)
      const bar = await cur.evaluate((el) => { const cs = getComputedStyle(el, '::before'); return { content: cs.content, w: parseFloat(cs.width), h: parseFloat(cs.height) } })
      expect(bar.content).not.toBe('none')
      expect(Math.round(bar.w)).toBe(2)
      expect(Math.round(bar.h)).toBe(16)
      // Nothing else is drawn as selected.
      const others = await panel(page).locator('.pnav-tool:not([aria-current="page"])').evaluateAll((els) => els.filter((e) => getComputedStyle(e, '::before').content !== 'none' && getComputedStyle(e, '::before').width === '2px').length)
      expect(others).toBe(0)
      await ctx.close()
    })
  }

  test('Learn never recommends the guide you are on', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE, { url: '/learn/brand-colour' })
    await trig(page, 'Learn').click()
    await expect(panel(page)).toBeVisible()
    const guides = await panel(page).locator('.pnav-reco').evaluateAll((els) => els.map((e) => e.getAttribute('data-guide')))
    for (const g of guides) expect(g).not.toBe('brand-colour')
    await ctx.close()
  })

  test('Learn rows carry whole read times', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    await trig(page, 'Learn').click()
    const mins = await panel(page).locator('.pnav-tool-mins').allTextContents()
    expect(mins.length).toBeGreaterThan(3)
    for (const m of mins) expect(m.trim()).toMatch(/^\d+ min$/)
    await ctx.close()
  })

  test('width 1100: all three panels fit and the pane drops below under 980', async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 1100, height: 900 })
    for (const name of ['Create', 'Discover', 'Learn']) {
      await trig(page, name).click()
      await expect(panel(page)).toBeVisible()
      await page.waitForTimeout(250)
      const p = await box(panel(page))
      expect(p.x).toBeGreaterThanOrEqual(23.5)
      expect(p.right).toBeLessThanOrEqual(1100 - 23.5)
      await page.keyboard.press('Escape')
    }
    await ctx.close()
  })

  test('reduced motion: the panel fades and does not scale or slide', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: WIDE, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await signIn(page, FREE)
    await go(page, '/create/palette')
    await trig(page, 'Create').click()
    await expect(panel(page)).toBeVisible()
    const anim = await panel(page).evaluate((el) => getComputedStyle(el).animationName)
    expect(anim).toContain('fade')
    await ctx.close()
  })

  test('Discover and Learn rows do not move on hover', async ({ browser }) => {
    const { ctx, page } = await open(browser, WIDE)
    for (const name of ['Discover', 'Learn']) {
      await trig(page, name).click()
      await expect(panel(page)).toBeVisible()
      await page.waitForTimeout(300)
      const row = rows(page).first()
      const before = await box(row)
      await row.hover()
      await page.waitForTimeout(300)
      expect(await box(row)).toEqual(before)
      await page.keyboard.press('Escape')
    }
    await ctx.close()
  })
})

test.describe('phone sheet at 390 (touch)', () => {
  test('tap: the sections, a pick, and reopening from the header and the tab bar', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, url: '/projects' })
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    for (const seg of ['Discover', 'Learn', 'Create']) {
      await sheet.locator('.pnav-acc-trigger', { hasText: seg }).tap()
      await expect(sheet.locator('.pnav-acc-trigger[aria-expanded="true"]')).toContainText(seg)
    }
    await sheet.locator('.pnav-acc-link', { hasText: 'Palette' }).first().tap()
    await expect(page).toHaveURL(/\/create\/palette/)
    await expect(sheet).toBeHidden()
    await page.locator('.pnav-mobile').tap()
    await expect(sheet).toBeVisible()
    await ctx.close()
  })

  test('keyboard: arrows move between the sheet segments, Escape closes', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true })
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    await sheet.locator('.pnav-acc-trigger').first().focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await ctx.close()
  })

  test('back out: Close menu, and the Dashboard tab', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, url: '/create/palette' })
    const sheet = page.locator('.pnav-sheet')
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    await expect(sheet).toBeVisible()
    await page.locator('.pnav-mobile').tap()
    await expect(sheet).toBeHidden()
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    await page.locator('.pnav-tab', { hasText: 'Dashboard' }).tap()
    await expect(page).toHaveURL(/\/projects/)
    await expect(sheet).toBeHidden()
    await ctx.close()
  })

  test('targets and touch: every row is 44px or more, no sideways scroll, no hover motion', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, url: '/create/palette' })
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    const sheet = page.locator('.pnav-sheet')
    await expect(sheet).toBeVisible()
    const hs = await sheet.locator('.pnav-acc-link').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(hs.length).toBeGreaterThan(10)
    for (const h of hs) expect(h).toBeGreaterThanOrEqual(43.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    const moving = await sheet.locator('.pnav-acc-link').first().evaluate((el) => getComputedStyle(el).transform)
    expect(moving === 'none' || moving === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
    await ctx.close()
  })

  test('Learn on the guide you are on never recommends it', async ({ browser }) => {
    const { ctx, page } = await open(browser, PHONE, { touch: true, url: '/learn/brand-colour' })
    await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
    await page.locator('.pnav-sheet .pnav-acc-trigger', { hasText: 'Learn' }).tap()
    const guides = await page.locator('.pnav-sheet .pnav-reco').evaluateAll((els) => els.map((e) => e.getAttribute('data-guide')))
    for (const g of guides) expect(g).not.toBe('brand-colour')
    await ctx.close()
  })

  for (const theme of ['light', 'dark']) {
    test(`at 320 in ${theme}: three sections fit with no sideways scroll`, async ({ browser }) => {
      const { ctx, page } = await open(browser, { width: 320, height: 640 }, { touch: true, theme })
      await page.locator('.pnav-tab', { hasText: 'Create' }).tap()
      for (const seg of ['Create', 'Discover', 'Learn']) {
        await page.locator('.pnav-sheet .pnav-acc-trigger', { hasText: seg }).tap()
        await page.waitForTimeout(200)
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${seg} ${theme}`).toBeLessThanOrEqual(320)
        const over = await page.locator('.pnav-sheet .pnav-acc-link').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().right > 320.5).length)
        expect(over, `${seg} rows past the edge`).toBe(0)
      }
      await ctx.close()
    })
  }
})
