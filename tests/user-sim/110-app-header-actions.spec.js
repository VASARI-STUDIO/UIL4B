// THE APP HEADER'S TOP-RIGHT ACTIONS AND THE LOGO.
//
//   1. Export and Dashboard are labelled pills at the height of Upgrade, in that
//      order, from 900 up. There is no Back to the site anywhere.
//   2. With nothing to export, Export stays in the tab order, opens no dialog and
//      says why (a hint beside the button; Escape hides it, focus stays).
//   3. The logo goes to the dashboard from an app page, and to the sales home
//      page from the dashboard, and its name says which.
//   4. The header never wraps from 320 to 1920.
//
// MUTATION: point the logo back at '/projects' on the dashboard, or put the Back
// to the site link back into PillNav.jsx, or drop aria-disabled from the empty
// Export: the matching test below goes red.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { readFile } from 'node:fs/promises'

test('a fresh palette exports the colours on screen without saving the random draw', async ({ page }) => {
  await signIn(page, { plan: 'free', projects: 0 })
  await go(page, '/create/palette')
  const colours = await page.locator('.plb-hex').allTextContents()
  expect(colours.length).toBeGreaterThan(1)
  const savedBefore = await page.evaluate(() => localStorage.getItem('vs-current-design'))
  await expect(page.locator('.pnav-export')).not.toHaveAttribute('aria-disabled', 'true')
  await page.locator('.pnav-export').click()
  await page.getByRole('radio', { name: /^JSON tokens/ }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click()
  const tokens = JSON.parse(await readFile(await (await downloaded).path(), 'utf8'))
  const exported = Object.values(tokens.color).filter((token) => token.$root)
    .map((token) => token.$root.$value.hex.toUpperCase())
  expect(exported).toEqual(colours)
  expect(await page.evaluate(() => localStorage.getItem('vs-current-design'))).toBe(savedBefore)
})

test.describe('app header actions', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'someone using the app header') })

  for (const width of [900, 1100, 1440, 1920]) {
    test(`at ${width} the top right reads Export, Dashboard, Upgrade, avatar, labelled, and nothing says Back to the site`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/create/palette')
      const actions = page.locator('.pnav-actions')
      const exportBtn = actions.getByRole('button', { name: 'Export' })
      const dashboard = actions.getByRole('link', { name: 'Dashboard' })
      await expect(exportBtn).toBeVisible()
      await expect(dashboard).toBeVisible()
      await expect(exportBtn.locator('.pnav-act-label')).toBeVisible()
      await expect(dashboard.locator('.pnav-act-label')).toBeVisible()
      const order = await actions.evaluate((el) => [...el.querySelectorAll('.pnav-export, .pnav-act--dash, .pnav-upgrade, .pnav-avatar-btn')]
        .map((n) => n.className.split(' ').find((c) => /^pnav-(export|act--dash|upgrade|avatar-btn)$/.test(c))))
      expect(order).toEqual(['pnav-export', 'pnav-act--dash', 'pnav-upgrade', 'pnav-avatar-btn'])
      const heights = await page.evaluate(() => ['.pnav-export', '.pnav-act--dash', '.pnav-inner .pnav-upgrade']
        .map((s) => document.querySelector(s).getBoundingClientRect().height))
      expect(Math.abs(heights[0] - heights[2]), 'Export is as tall as Upgrade').toBeLessThanOrEqual(0.5)
      expect(Math.abs(heights[1] - heights[2]), 'Dashboard is as tall as Upgrade').toBeLessThanOrEqual(0.5)
      await expect(page.getByText('Back to the site')).toHaveCount(0)
      await page.getByRole('button', { name: 'Account and settings' }).click()
      await expect(page.locator('#pnav-account-pop').getByText('Back to the site')).toHaveCount(0)
    })
  }

  test('with nothing to export, Export is focusable, opens no dialog and shows its hint', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/projects')
    const exportBtn = page.getByRole('button', { name: 'Export' })
    await expect(exportBtn).toHaveAttribute('aria-disabled', 'true')
    await expect(exportBtn).toHaveAttribute('aria-describedby', 'pnav-export-hint')
    await exportBtn.focus()
    for (const key of ['Space', 'Enter']) {
      await page.keyboard.press(key)
      await expect(page.locator('[role="dialog"][aria-labelledby="exp-title"]')).toHaveCount(0)
      await expect(exportBtn).toBeFocused()
    }
    const hint = page.locator('#pnav-export-hint')
    await expect(hint).toBeVisible()
    await expect(hint).toHaveText('Open a project to export it')
    await page.keyboard.press('Escape')
    await expect(hint).toBeHidden()
    await expect(exportBtn, 'focus stays on Export after Escape').toBeFocused()
  })

  test('Export opens the dialog after making a palette', async ({ page }) => {
    await go(page, '/create/palette')
    await page.getByRole('button', { name: /Randomise/ }).click()
    const exportBtn = page.locator('.pnav-export')
    await expect(exportBtn).not.toHaveAttribute('aria-disabled', 'true')
    await exportBtn.click()
    await expect(page.getByRole('dialog', { name: 'Export your design system' })).toBeVisible()
  })

  test('a fresh empty converter explains why Export is unavailable', async ({ page }) => {
    await go(page, '/create/file-converter')
    await expect(page.locator('.pnav-export')).toHaveAttribute('aria-disabled', 'true')
    await page.locator('.pnav-export').focus()
    await expect(page.locator('#pnav-export-hint')).toHaveText('Nothing to export yet')
  })

  for (const width of [900, 1100, 1280, 1440]) {
    test(`at ${width} the dashboard hint stays beside Export when space allows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/projects')
      await page.locator('.pnav-export').focus()
      const tip = page.locator('#pnav-export-hint')
      await expect(tip).toBeVisible()
      const geometry = await tip.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const button = el.parentElement.getBoundingClientRect()
        return { right: r.right, centre: r.top + r.height / 2,
          buttonLeft: button.left, buttonCentre: button.top + button.height / 2,
          below: el.classList.contains('pnav-tip--below') }
      })
      if (width === 1440 || !geometry.below) {
        expect(geometry.right).toBeLessThanOrEqual(geometry.buttonLeft - 7)
        expect(Math.abs(geometry.centre - geometry.buttonCentre)).toBeLessThan(1)
      }
    })
  }

  test('Export on a saved project opens that project rather than the working palette', async ({ page }) => {
    const account = await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/create/palette')
    await page.getByRole('button', { name: /Randomise/ }).click()
    await expect(page.locator('.pnav-export')).not.toHaveAttribute('aria-disabled', 'true')
    const savedDesign = await page.evaluate((email) =>
      JSON.parse(localStorage.getItem('vs-projects'))[email].find((p) => p.id === 'seed-2').design, account.email)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design'))))
      .not.toEqual(savedDesign)
    await go(page, '/projects/seed-2')
    await expect(page.getByRole('heading', { level: 1, name: 'Seeded Project 2' })).toBeVisible()
    const exportBtn = page.locator('.pnav-export')
    await expect(exportBtn).not.toHaveAttribute('aria-disabled', 'true')
    await exportBtn.click()
    await expect(page.getByRole('dialog', { name: 'Export your design system' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design'))))
      .toEqual(savedDesign)
  })

  test('on the dashboard Dashboard is the current page and the logo goes to the home page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/projects')
    await expect(page.locator('.pnav-act--dash')).toHaveAttribute('aria-current', 'page')
    const logo = page.locator('.pnav-logo')
    await expect(logo).toHaveAttribute('href', '/home')
    await expect(logo).toHaveAttribute('aria-label', 'UIL4B, go to the home page')
  })

  test('from an app page the logo goes to the dashboard, and from there to the home page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    const logo = page.locator('.pnav-logo')
    await expect(logo).toHaveAttribute('aria-label', 'UIL4B, go to your dashboard')
    await logo.click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(logo).toHaveAttribute('aria-label', 'UIL4B, go to the home page')
    await logo.click()
    await expect(page).toHaveURL(/\/home$/)
  })

  for (const signed of [true, false]) {
    test(`the header never wraps from 320 to 1920 (${signed ? 'signed in' : 'signed out'})`, async ({ page }) => {
      if (signed) await signIn(page, { plan: 'free', projects: 1 })
      for (const width of [320, 390, 768, 899, 900, 940, 961, 999, 1099, 1100, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 })
        await go(page, '/create/palette')
        const overflow = await page.locator('.pnav-inner').evaluate((el) => el.scrollWidth - el.clientWidth)
        expect(overflow, `header overflows by ${overflow}px at ${width}`).toBeLessThanOrEqual(0)
      }
    })
  }
})

test.describe('app header touch actions', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test.beforeEach(async ({ page }) => { watch(page, 'someone tapping the app header') })

  test('coarse-pointer synthetic clicks are guarded through 599ms and work at 700ms', async ({ page }) => {
    const start = new Date('2026-10-09T00:00:00Z')
    await page.clock.setFixedTime(start)
    await go(page, '/create/palette')
    await page.clock.setFixedTime(new Date(+start + 1000))
    await page.locator('.pnav-logo').click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.locator('.pnav-act--dash')).toHaveAttribute('aria-current', 'page')
    await page.clock.setFixedTime(new Date(+start + 1599))
    await page.locator('.pnav-logo').click()
    await expect(page).toHaveURL(/\/projects$/)
    await page.clock.setFixedTime(new Date(+start + 1700))
    await page.locator('.pnav-logo').click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('two logo taps 150ms apart from a tool stay on the dashboard', async ({ page }) => {
    // Warm the destination chunk before measuring the interval between taps.
    await go(page, '/projects')
    await go(page, '/create/palette')
    await page.waitForTimeout(650)
    const logo = page.locator('.pnav-logo')
    await logo.tap()
    await page.waitForTimeout(150)
    await expect(logo).toHaveAttribute('href', '/home', { timeout: 300 })
    await logo.tap({ timeout: 300 })
    await expect(page).toHaveURL(/\/projects$/)
    await page.waitForTimeout(650)
    await logo.tap()
    await expect(page).toHaveURL(/\/home$/)
  })

  for (const width of [320, 360, 390]) {
    test(`at ${width} touch targets reach 44px and circles stay 36px without wrapping`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await signIn(page, { plan: 'free', projects: 1 })
      await go(page, '/create/palette')
      const targets = await page.locator('.pnav-inner').evaluate((el) => {
        const selectors = ['.pnav-export', '.pnav-search-field', '.pnav-avatar-btn', '.pnav-mobile', '.pnav-logo']
        return selectors.map((selector) => {
          const button = el.querySelector(selector)
          const rect = button.getBoundingClientRect()
          const hit = getComputedStyle(button, '::after')
          // Probe outside the visible circle but inside the 44px target.
          const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2
          const receivesTouch = [[0, -21.5], [0, 21.5], [-21.5, 0], [21.5, 0]].every(([dx, dy]) => {
            const reached = document.elementFromPoint(cx + dx, cy + dy)
            return reached === button || button.contains(reached)
          })
          return { selector, width: rect.width, height: rect.height,
            hitWidth: parseFloat(hit.width), hitHeight: parseFloat(hit.height),
            content: hit.content, receivesTouch }
        })
      })
      for (const target of targets) {
        if (target.selector !== '.pnav-logo') {
          expect(target.width, target.selector).toBe(36)
          expect(target.height, target.selector).toBe(36)
        }
        expect(target.content, target.selector).toBe('""')
        expect(target.hitWidth, target.selector).toBeGreaterThanOrEqual(44)
        expect(target.hitHeight, target.selector).toBeGreaterThanOrEqual(44)
        expect(target.receivesTouch, target.selector).toBe(true)
      }
      const overflow = await page.locator('.pnav-inner').evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
