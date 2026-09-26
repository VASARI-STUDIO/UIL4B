// THE APP CHROME, BUILT TO `UIL4B App.dc.html`.
//
// What this file holds:
//   · the header is one 64px row that never wraps, at any width from 768 up
// — it folds controls into the account popover instead;
//   · each mega menu is ONE surface, with its counts derived;
//   · below 768 it is the phone header plus the bottom tab bar, and Back
//     closes the menu sheet instead of leaving;
//   · the site footer is gone from app pages and stays on reading pages
//;
//   · "Create a free account" sits directly below "Log in" in the signed-out
//     menu and in the phone sheet, and opens the sign-up form.
import { test, expect } from './base.js'
import { go, signIn } from './helpers.js'

const WIDTHS = [768, 820, 900, 1024, 1180, 1280, 1440]

async function headerFits(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.pnav')
    const inner = document.querySelector('.pnav-inner')
    const kids = [...inner.children].filter((c) => c.getBoundingClientRect().width > 0)
    const bottoms = kids.map((c) => c.getBoundingClientRect().bottom)
    return {
      height: Math.round(nav.getBoundingClientRect().height),
      overflow: inner.scrollWidth - inner.clientWidth,
      lowest: Math.max(...bottoms),
    }
  })
}

test.describe('the app header', () => {
  for (const signed of [true, false]) {
    test(`is one 64px row that never wraps from 768 up (${signed ? 'signed in' : 'signed out'})`, async ({ page }) => {
      if (signed) await signIn(page, { projects: 1 })
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 800 })
        await go(page, '/projects')
        const m = await headerFits(page)
        expect(m.height, `header height at ${w}`).toBe(64)
        expect(m.overflow, `header overflows by ${m.overflow}px at ${w}`).toBeLessThanOrEqual(0)
        expect(m.lowest, `a header control sits below the row at ${w}`).toBeLessThanOrEqual(64)
      }
    })
  }

  test('the wordmark goes to the workspace and Back to the site goes to /home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/discover/palettes')
    await expect(page.locator('.pnav-logo')).toHaveAttribute('href', '/projects')
    await expect(page.getByRole('link', { name: 'Back to the site' })).toHaveAttribute('href', '/home')
    await expect(page.getByRole('link', { name: 'Palette library' })).toHaveAttribute('href', '/discover/palettes')
  })

  test('"Create a free account" is directly below "Log in" and opens the sign-up form', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await go(page, '/projects')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const items = page.locator('#pnav-account-pop .pnav-pop-item:visible')
    const labels = (await items.allInnerTexts()).map((s) => s.trim())
    const login = labels.indexOf('Log in')
    expect(login, `popover rows: ${labels.join(' | ')}`).toBeGreaterThan(-1)
    expect(labels[login + 1]).toBe('Create a free account')
    await page.locator('#pnav-account-pop').getByRole('button', { name: 'Create a free account' }).click()
    await expect(page.getByRole('dialog').getByText('Create your free account').first()).toBeVisible()
  })
})

test.describe('the mega menus', () => {
  test('each is one surface, with derived counts and no descriptions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/projects')
    const expectFoot = { Create: /^\w+ live tools across colour, type, icons, media and AI\.$/, Discover: /^\w+ libraries, free to browse\.$/, Learn: /^\w+ published guides, more on the way\.$/ }
    for (const name of ['Create', 'Discover', 'Learn']) {
      await page.locator('.pnav-trigger', { hasText: name }).click()
      const menu = page.locator('#pnav-mega')
      await expect(menu).toBeVisible()
      // One surface: nothing inside the tray paints its own box.
      const boxes = await menu.evaluate((m) => [...m.querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return r.width > 200 && r.height > 120 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && !el.closest('.pnav-prev')
      }).map((el) => el.className))
      expect(boxes, `${name}: a panel inside the panel`).toEqual([])
      await expect(menu.locator('.pnav-menu-foot-note')).toHaveText(expectFoot[name])
      await expect(menu.locator('.pnav-menu-foot-link')).toHaveText(`View all ${name.toLowerCase()} tools`)
      await expect(menu.locator('.pnav-tool-desc')).toHaveCount(0)
      await page.keyboard.press('Escape')
    }
    // Truth, not the file's numbers: 13 live tools today (not Soon, not Beta).
    await page.locator('.pnav-trigger', { hasText: 'Create' }).click()
    await expect(page.locator('.pnav-menu-foot-note')).toHaveText(/^Thirteen live tools/)
  })
})

test.describe('the phone chrome', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('compact header, tab bar, and Back closes the sheet without leaving', async ({ page }) => {
    await signIn(page, { projects: 1 })
    await go(page, '/projects')
    await expect(page.locator('.pnav-trigger').first()).toBeHidden()
    await expect(page.locator('.pnav-tabs')).toBeVisible()
    await expect(page.locator('.pnav-tab', { hasText: 'Projects' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.locator('.pnav-sheet')).toBeVisible()
    await expect(page.locator('#main')).toHaveAttribute('inert', '')
    await page.goBack()
    await expect(page.locator('.pnav-sheet')).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe('/projects')
  })

  test('signed out, the sheet puts "Create a free account" right after "Log in"', async ({ page }) => {
    await go(page, '/projects')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const sheet = page.locator('.pnav-sheet')
    const order = await sheet.locator('button, a').allInnerTexts()
    const i = order.map((s) => s.trim()).indexOf('Log in')
    expect(i).toBeGreaterThan(-1)
    expect(order[i + 1].trim()).toBe('Create a free account')
    await sheet.getByRole('button', { name: 'Create a free account' }).click()
    await expect(page.getByRole('dialog').getByText('Create your free account').first()).toBeVisible()
  })
})

test.describe('the site footer', () => {
  test('is gone from app pages and stays on reading pages', async ({ page }) => {
    await go(page, '/projects')
    await expect(page.locator('.app-footer')).toHaveCount(0)
    await go(page, '/discover/palettes')
    await expect(page.locator('.app-footer')).toHaveCount(0)
    await go(page, '/privacy')
    await expect(page.locator('.app-footer')).toHaveCount(1)
    await go(page, '/learn/colour-contrast')
    await expect(page.locator('.app-footer')).toHaveCount(1)
  })
})

test.describe('the open-menu hook other surfaces use', () => {
  const fire = (page, section) => page.evaluate((s) => {
    const ev = new CustomEvent('uil4b:open-menu', { detail: { section: s }, cancelable: true })
    window.dispatchEvent(ev)
    return ev.defaultPrevented
  }, section)

  test('opens the mega menu on a desktop and says it did', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/projects')
    expect(await fire(page, 'create')).toBe(true)
    await expect(page.locator('#pnav-mega[data-menu="create"]')).toBeVisible()
    expect(await fire(page, 'nonsense')).toBe(false)
  })

  test('opens the sheet on that section on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/projects')
    expect(await fire(page, 'discover')).toBe(true)
    await expect(page.locator('.pnav-sheet .pnav-acc-trigger[aria-expanded="true"]')).toHaveText(/Discover/)
  })
})

test.describe('the account switcher', () => {
  const OTHER = { uid: 'other-uid', email: 'otto.other@uil4b.test', displayName: 'Otto Other', photoURL: '', providerIds: ['password'], provider: 'password' }

  async function withRemembered(page) {
    await page.addInitScript((acct) => {
      try {
        const list = JSON.parse(localStorage.getItem('vs-accounts') || '[]')
        if (!list.some((a) => a.uid === acct.uid)) localStorage.setItem('vs-accounts', JSON.stringify([...list, acct]))
      } catch { /* storage blocked */ }
    }, OTHER)
    await signIn(page, { projects: 1 })
  }

  test('lists this account, the others remembered here, Add account, then the sign-outs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await withRemembered(page)
    await go(page, '/projects')
    await page.getByRole('button', { name: 'Account and settings' }).click()
    const pop = page.locator('#pnav-account-pop')
    await expect(pop.locator('.pnav-pop-id-email')).toHaveText('free.user@uil4b.test')
    // A switcher row reads initials, name and email on separate lines, so rows
    // are matched on their whole text, not their first line.
    const texts = (await pop.locator('button:visible, a:visible').allInnerTexts()).map((t) => t.trim())
    const at = (label) => texts.findIndex((t) => t.split('\n')[0].trim() === label)
    const other = texts.findIndex((t) => t.includes('Otto Other') && t.includes(OTHER.email))
    expect(other, texts.join(' | ')).toBeGreaterThan(-1)
    expect(at('Add account')).toBe(other + 1)
    expect(at('Sign out of all accounts')).toBe(at('Sign out') + 1)
    expect(at('Sign out')).toBe(texts.length - 2)
  })

  test('switching to an email account asks for its password, locked to its address', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await withRemembered(page)
    await go(page, '/projects')
    await page.getByRole('button', { name: 'Account and settings' }).click()
    await page.getByRole('button', { name: /Switch to Otto Other/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('input[type="email"]')).toHaveValue(OTHER.email)
    await expect(dialog.locator('input[type="password"]')).toBeVisible()
  })

  test('the phone You tab opens the same switcher', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await withRemembered(page)
    await go(page, '/projects')
    await page.locator('.pnav-tab', { hasText: 'You' }).click()
    const acct = page.locator('#pnav-sheet-account')
    await expect(acct).toBeVisible()
    await expect(acct.getByRole('button', { name: /Switch to Otto Other/ })).toBeVisible()
    await expect(acct.getByRole('button', { name: 'Add account' })).toBeVisible()
  })
})
