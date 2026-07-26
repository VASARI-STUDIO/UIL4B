// Persona: FRESH USER — on a phone, impatient, types the wrong things,
// presses the wrong keys. This file covers mobile usability, keyboard
// behaviour, and garbage-input resilience (Murphy's-law states).
import { test, expect } from '@playwright/test'
import { watch, expectRendered, go } from './helpers.js'

const PERSONA = 'fresh user (mobile & edge cases)'

test.describe('mobile (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('landing renders and navigation is reachable on a phone', async ({ page }) => {
    const fb = watch(page, PERSONA)
    await go(page, '/')
    expect(await expectRendered(page)).toBe(true)
    // Some form of nav affordance must be visible: mobile burger or the pill
    // triggers. NB: `.first()` on a comma selector returns first-in-DOM (which
    // may be a hidden desktop trigger) — count the VISIBLE matches instead.
    const visibleNav = await page
      .locator('.pnav-mobile:visible, .pnav-trigger:visible')
      .count()
      .catch(() => 0)
    if (!visibleNav) {
      fb.note('critical', 'No visible navigation affordance on mobile landing (no burger, no triggers).')
    }
    expect(visibleNav).toBeGreaterThan(0)
  })

  test('ratio tool: tabs fit, dropdown opens inside the viewport', async ({ page }) => {
    const fb = watch(page, PERSONA)
    await go(page, '/ratio')
    for (const t of ['Devices', 'Screens', 'Social', 'Ratios']) {
      await expect(page.getByRole('button', { name: t, exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: 'Devices', exact: true }).click()
    await page.getByRole('button', { name: /Pick a device/ }).click()
    const pop = page.getByRole('listbox', { name: /Pick a device/ })
    await expect(pop).toBeVisible()
    const box = await pop.boundingBox()
    if (box && (box.x < 0 || box.x + box.width > 390)) {
      fb.note('error', `Device dropdown overflows the 390px viewport (x=${box.x}, w=${box.width}).`)
    }
    expect(box.x >= 0 && box.x + box.width <= 390).toBe(true)

    // No horizontal page scroll — the classic mobile paper cut.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    if (overflow > 1) fb.note('error', `Page scrolls horizontally by ${overflow}px on mobile.`)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('keyboard behaviour', () => {
  test('Escape closes the preset dropdown', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/ratio')
    await page.getByRole('button', { name: 'Devices', exact: true }).click()
    await page.getByRole('button', { name: /Pick a device/ }).click()
    await expect(page.getByRole('listbox', { name: /Pick a device/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox', { name: /Pick a device/ })).toHaveCount(0)
  })

  test('dropdown trigger is reachable and operable by keyboard', async ({ page }) => {
    const fb = watch(page, PERSONA)
    await go(page, '/ratio')
    await page.getByRole('button', { name: 'Devices', exact: true }).click()
    const btn = page.getByRole('button', { name: /Pick a device/ })
    await btn.focus()
    await page.keyboard.press('Enter')
    const opened = await page.locator('.arc-select-pop').isVisible().catch(() => false)
    if (!opened) fb.note('improve', 'Preset dropdown does not open with Enter when focused — keyboard users are locked out.')
    expect(opened).toBe(true)
  })
})

test.describe('garbage input never breaks the calculator', () => {
  const CASES = [
    { name: 'zeros', w: '0', h: '0' },
    { name: 'empty height', w: '1920', h: '' },
    { name: 'absurdly large', w: '999999999', h: '1' },
    { name: 'negative', w: '-100', h: '50' },
  ]
  for (const c of CASES) {
    test(`ratio inputs: ${c.name}`, async ({ page }) => {
      const fb = watch(page, PERSONA)
      await go(page, '/ratio')
      await page.getByRole('spinbutton', { name: 'Ratio width' }).fill(c.w)
      await page.getByRole('spinbutton', { name: 'Ratio height' }).fill(c.h)
      // The tool may show a placeholder/empty result — it must never show
      // NaN/Infinity or throw (pageerror is caught by watch()).
      const body = await page.locator('body').innerText()
      if (/NaN|Infinity/.test(body)) {
        fb.note('error', `Input (${c.w} × ${c.h}) leaks "${body.match(/NaN|Infinity/)[0]}" into the UI.`)
      }
      expect(body).not.toMatch(/NaN|Infinity/)
    })
  }
})

test.describe('route sweep — every public page loads clean', () => {
  const ROUTES = [
    '/', '/ratio', '/color', '/icons', '/emoji', '/file-converter',
    '/discover', '/learn', '/plans', '/community', '/help', '/info',
    '/sitemap', '/privacy', '/terms', '/feedback', '/seo', '/login', '/settings',
  ]
  for (const url of ROUTES) {
    test(`sweep ${url}`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, url)
      // Live tools lazy-load their chunk; poll for rendered text instead of
      // 'networkidle', which never settles here (blocked external hosts).
      await expect
        .poll(() => expectRendered(page), {
          message: `${url} should render visible content`,
          timeout: 10000,
        })
        .toBe(true)
    })
  }
})
