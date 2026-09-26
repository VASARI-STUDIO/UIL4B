// Every free call to action opens the thing itself for a visitor with no
// account: "Open the toolkit", "Use for free", "Start for free", the landing's
// "Open …" tool pills, and the app header's sheet and tab bar links. Each one
// is clicked, signed out, and the page it lands on must render its own h1
// (a tool or the workspace) with no sign-in dialog in the way.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const FREE = /^(Open the toolkit|Use for free|Start for free|Start free|Open [A-Z][\w ]+)$/
const LOGIN = '#ui-login-title'

async function freeLinks(page, scope) {
  return page.locator(scope).locator('a[href]').evaluateAll((els, src) => {
    const re = new RegExp(src)
    return els
      .filter((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden')
      .map((el, i) => ({ i, text: (el.textContent || '').replace(/[↗\s]+/g, ' ').trim(), href: el.getAttribute('href') }))
      .filter((l) => re.test(l.text))
  }, FREE.source)
}

async function assertOpened(page, label) {
  await expect(page).toHaveURL(/\/(projects|create|discover)(\/|$|\?)/)
  await expect(page.locator('h1').first(), `${label} landed on a page with no heading`).toBeAttached()
  await page.waitForTimeout(400)
  await expect(page.locator(LOGIN), `${label} asked a visitor to sign in`).toHaveCount(0)
}

const SALES = [
  ['/', 390], ['/', 1440], ['/plans', 390], ['/plans', 1440], ['/mobile', 390], ['/mobile', 1440],
]

for (const [route, width] of SALES) {
  test(`${route} at ${width}: every free CTA opens without an account`, async ({ browser }) => {
    test.setTimeout(180000)
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    watch(page, `a visitor with no account on ${route} (${width}px)`)
    await go(page, route)
    const links = await freeLinks(page, 'body')
    expect(links.length, `no free CTA found on ${route}`).toBeGreaterThan(0)
    for (const l of links) {
      await go(page, route)
      const target = page.locator('body').locator('a[href]').filter({ hasText: l.text }).filter({ visible: true })
        .and(page.locator(`a[href="${l.href}"]`)).first()
      await target.scrollIntoViewIfNeeded()
      await target.click()
      await assertOpened(page, `"${l.text}" on ${route}`)
    }
    // The phone menu's own free CTAs.
    if (width < 768) {
      await go(page, route)
      await page.getByRole('button', { name: 'Open menu' }).click()
      const menu = page.getByRole('dialog', { name: 'Menu' })
      await expect(menu).toBeVisible()
      await menu.getByRole('link', { name: /Open the toolkit/ }).click()
      await assertOpened(page, `the ${route} menu's toolkit link`)
    }
    await context.close()
  })
}

test('the app header: the phone sheet\'s "Start for free" and the tab bar open without an account', async ({ browser }) => {
  test.setTimeout(120000)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  watch(page, 'a visitor with no account in the app on a phone')
  await go(page, '/help')
  await page.locator('.pnav-mobile').click()
  const sheet = page.locator('.pnav-sheet')
  await expect(sheet).toBeVisible()
  await sheet.getByRole('link', { name: 'Start for free' }).click()
  await assertOpened(page, 'the sheet\'s "Start for free"')

  await go(page, '/help')
  const tabs = await page.locator('.pnav-tabs a[href]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
  const free = tabs.filter((h) => /^\/(projects|create|discover)/.test(h))
  expect(free.length, 'the tab bar has no link into the app').toBeGreaterThan(0)
  for (const href of free) {
    await go(page, '/help')
    await page.locator(`.pnav-tabs a[href="${href}"]`).first().click()
    await assertOpened(page, `the tab bar's ${href}`)
  }
  await context.close()
})

test('the app header at 1440: the Create menu opens a tool without an account', async ({ page }) => {
  watch(page, 'a visitor with no account picking a tool from the header')
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/help')
  await page.locator('.pnav-trigger', { hasText: 'Create' }).click()
  const tool = page.locator('.pnav-menu a[href^="/create/"]').first()
  await expect(tool).toBeVisible()
  await tool.click()
  await assertOpened(page, 'the Create menu\'s first tool')
})
