// Can a visitor actually reach the dark theme, and does it stay reached?
//
// For two months a complete dark theme shipped to every visitor with no way to
// turn it on: the boot script force-reset the stored theme to light once per
// profile and never consulted prefers-color-scheme, and the only control that
// existed lived in a nav popover that `.pnav-more-wrap{display:none}` hides
// below 768px. Two comments in the codebase — the one on that media query and
// the Settings > Accessibility blurb — both pointed at a control that was not
// where they said it was, which is how it stayed unnoticed.
//
// So this spec is deliberately about REACHABILITY, not about the token values.
// It drives the control the way a person does, at the widths where each of its
// three homes is the only one available, and it checks the state that survives
// a reload rather than the state immediately after the click — persistence is
// the half that a fabricated storage write breaks.
//
// The pure resolution logic (explicit beats OS, both directions; system follows
// the OS live) is asserted without a browser in
// tests/unit/theme-resolution.test.js. This file does not duplicate it.
//
// IT DOES ASSERT FIRST PAINT, and that is not redundant. Every other test here
// reads the SETTLED attribute, by which time React has hydrated — so a boot
// script that resolved the theme wrongly and was corrected 120ms later would
// pass all of them while every visitor watched the page change colour. Measured:
// reverting the boot script to the shipped `t='light'` left all eight of the
// other tests green. Only the pre-paint probe below sees it.
import { test, expect } from './base.js'

const SEG = '.theme-seg'
const btn = (v) => `${SEG} [data-theme-choice="${v}"]`

const themeOf = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'))
const storedOf = (page) => page.evaluate(() => {
  try { return localStorage.getItem('vs-t') } catch { return 'THREW' }
})

/** Every control the visitor can actually see, whatever the width. */
async function visibleSegments(page) {
  return page.evaluate((sel) => Array.from(document.querySelectorAll(sel))
    .filter((el) => el.getBoundingClientRect().width > 0).length, SEG)
}

/**
 * Record html[data-theme] from before the page's own scripts run until well
 * after hydration.
 *
 * addInitScript runs on document creation — before index.html's boot script and
 * before <html> itself exists, so nothing here may touch document.documentElement
 * eagerly (an earlier version did, threw, and silently recorded nothing). The
 * MutationObserver is rooted on `document`, which does exist that early, and the
 * first requestAnimationFrame callback runs before the first paint is committed,
 * so its reading is the theme the visitor's first frame is painted with.
 */
const PRE_PAINT_PROBE = () => {
  window.__themeLog = []
  const push = (when) => {
    const r = document.documentElement
    window.__themeLog.push({ when, theme: r ? r.getAttribute('data-theme') : null })
  }
  new MutationObserver((records) => {
    for (const r of records) if (r.attributeName === 'data-theme') push('attr-set')
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] })
  requestAnimationFrame(() => {
    push('first-raf')
    window.__firstPaintBg = getComputedStyle(document.body).backgroundColor
  })
  window.addEventListener('load', () => push('load'))
}

test.describe('the dark theme is reachable', () => {
  test('a visitor on a dark device gets dark, with no stored choice at all', async ({ browser }) => {
    // The exact state the audit measured landing in light: fresh profile, OS
    // dark, nothing in storage.
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()

    expect(await themeOf(page), 'a dark device was served the light theme').toBe('dark')
    // The page must actually be painted dark, not merely carry the attribute.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg, 'html[data-theme=dark] was set but the dark tokens did not apply').toBe('rgb(16, 16, 18)')
    await ctx.close()
  })

  test('a visitor on a light device still gets light', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
    expect(await themeOf(page)).toBe('light')
    await ctx.close()
  })

  test('the signed-out nav popover switches the theme and the choice survives a reload', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
    expect(await themeOf(page)).toBe('light')

    await page.click('.pnav-more')
    await expect(page.locator(btn('dark'))).toBeVisible()
    // System is the state a visitor who has never chosen is in, and the control
    // has to SAY so — otherwise there is no way to tell it from an explicit
    // choice, and no way back to it.
    await expect(page.locator(btn('system'))).toHaveAttribute('aria-pressed', 'true')

    await page.click(btn('dark'))
    await expect.poll(() => themeOf(page), { message: 'clicking Dark did not switch the theme' }).toBe('dark')
    expect(await storedOf(page)).toBe('dark')

    // The half that a fabricated write breaks: does it survive the next visit?
    await page.reload()
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
    expect(await themeOf(page), 'the chosen theme did not survive a reload').toBe('dark')
    await ctx.close()
  })

  test('System hands the decision back to the device, and is reachable from an explicit choice', async ({ browser }) => {
    // The reason three states beat two: without System there is no way to undo
    // a choice, and the device preference is unreachable forever after the
    // first click.
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()

    await page.click('.pnav-more')
    await page.click(btn('light'))
    await expect.poll(() => themeOf(page)).toBe('light')
    expect(await themeOf(page), 'an explicit light must beat a dark device').toBe('light')

    await page.click(btn('system'))
    await expect.poll(() => themeOf(page), { message: 'System did not hand the theme back to the device' }).toBe('dark')
    expect(await storedOf(page)).toBe('system')

    await page.reload()
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
    expect(await themeOf(page), 'System did not survive a reload').toBe('dark')
    await ctx.close()
  })

  test('the control is reachable on a phone, where the popover does not exist', async ({ browser }) => {
    // `.pnav-more-wrap{display:none}` below 768px is what made a finished theme
    // unreachable on a phone. The sheet is the only route there, so this asserts
    // the popover is genuinely gone AND the sheet control genuinely works.
    const ctx = await browser.newContext({
      colorScheme: 'light', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()

    expect(await page.locator('.pnav-more').isVisible().catch(() => false),
      'the meatball is visible at 390 — this test is no longer measuring the phone case').toBe(false)
    expect(await visibleSegments(page), 'a theme control was on screen before the sheet was opened').toBe(0)

    await page.click('[aria-label="Open menu"]')
    await expect(page.locator(`.pnav-sheet-theme ${SEG}`)).toBeVisible()
    await page.locator(`.pnav-sheet-theme ${btn('dark')}`).click()
    await expect.poll(() => themeOf(page), { message: 'the sheet control did not switch the theme' }).toBe('dark')

    await page.reload()
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
    expect(await themeOf(page)).toBe('dark')
    await ctx.close()
  })

  test('/settings offers the theme beside reduced motion', async ({ browser }) => {
    // Settings said "your light or dark theme lives in the top-nav settings
    // menu" while offering exactly one appearance control. It offers two now.
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/settings')
    await page.click('#settab-accessibility')

    const panel = page.locator('#set-accessibility')
    await expect(panel.locator(SEG)).toBeVisible()
    await expect(panel.locator('[aria-label="Toggle reduced motion"]')).toBeVisible()

    await panel.locator(btn('dark')).click()
    await expect.poll(() => themeOf(page), { message: '/settings could not switch the theme' }).toBe('dark')
    await ctx.close()
  })

  test('all three states are offered, and exactly one reads as chosen', async ({ page }) => {
    await page.goto('/')
    await page.click('.pnav-more')
    const seg = page.locator(SEG).first()
    await expect(seg.locator('button')).toHaveCount(3)
    await expect(seg).toHaveAttribute('aria-label', 'Theme')

    for (const v of ['light', 'dark', 'system']) {
      await seg.locator(`[data-theme-choice="${v}"]`).click()
      const pressed = await seg.locator('[aria-pressed="true"]').count()
      expect(pressed, `${pressed} buttons read as pressed after choosing ${v}; exactly one must`).toBe(1)
      await expect(seg.locator(`[data-theme-choice="${v}"]`)).toHaveAttribute('aria-pressed', 'true')
    }
  })

  for (const [scheme, expected, bg] of [['dark', 'dark', 'rgb(16, 16, 18)'], ['light', 'light', 'rgb(239, 238, 233)']]) {
    test(`on a ${scheme} device the FIRST painted frame is already ${expected}`, async ({ browser }) => {
      // The whole reason the theme is resolved in a synchronous boot script
      // rather than left to React. If the boot script and ThemeContext ever
      // disagree, this is where it shows up as a visible colour change.
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } })
      await ctx.addInitScript(PRE_PAINT_PROBE)
      const page = await ctx.newPage()
      await page.goto('/', { waitUntil: 'load' })
      await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
      // Long enough for hydration to have had every chance to disagree.
      await page.waitForTimeout(1200)

      const seen = await page.evaluate(() => ({
        log: window.__themeLog,
        firstPaintBg: window.__firstPaintBg,
        settledBg: getComputedStyle(document.body).backgroundColor,
      }))
      const values = [...new Set(seen.log.map((e) => e.theme).filter(Boolean))]
      const timeline = seen.log.map((e) => `${e.when}=${e.theme}`).join(' -> ')

      expect(seen.log.length, 'the pre-paint probe recorded nothing, so this test proved nothing')
        .toBeGreaterThan(0)
      expect(values, `html[data-theme] changed during load (${timeline}) — that is a visible flash`)
        .toEqual([expected])
      expect(seen.firstPaintBg, `the first frame was painted ${seen.firstPaintBg} and settled at ${seen.settledBg}`)
        .toBe(bg)
      expect(seen.firstPaintBg).toBe(seen.settledBg)
      await ctx.close()
    })
  }

  test('nothing writes the retired vs-t-lightreset key any more', async ({ browser }) => {
    // While that flag was being written, the first load of every fresh profile
    // force-reset the stored theme to light — so the control above would have
    // been a no-op for exactly one visit, which is the hardest kind of bug to
    // believe a report of.
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('main, .landing, #root > *').first()).toBeVisible()
    const keys = await page.evaluate(() => {
      try { return Object.keys(localStorage) } catch { return ['THREW'] }
    })
    expect(keys, `localStorage holds ${JSON.stringify(keys)}`).not.toContain('vs-t-lightreset')
    await ctx.close()
  })
})
