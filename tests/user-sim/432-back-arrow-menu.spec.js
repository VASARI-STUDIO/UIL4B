// The tool back arrow and its right-click menu.
//   · a click steps back to the page the person was on when the app has one behind
//   · with nothing behind it (a fresh load, a shared link) it goes to the dashboard
//   · right-click, Shift+F10 and the Menu key open a menu with "Go to dashboard"
//   · Escape closes it and hands focus back to the arrow; an outside press and a
//     scroll close it too; Shift+right-click leaves the browser's own menu alone
//   · at 390 the menu is the shared bottom sheet
//
// MUTATIONS (each should turn the named test red):
//   · backTarget.js: make hasAppHistory() return false      -> "a click steps back"
//   · backTarget.js: change DASHBOARD_PATH to '/tools'        -> "a fresh load goes to the dashboard", "Go to dashboard"
//   · ToolBack: drop onContextMenu                            -> "right-click opens the menu"
//   · ToolBack: drop onKeyDown                                -> "Shift+F10 opens it"
//   · ToolBack: drop the `event.shiftKey` return in onContextMenu -> "Shift+right-click"
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const BAR = '[data-tool-toolbar]'
const DASHBOARD = /\/projects$/

/** Palette -> Tint through the app's own link, so the palette is behind the page. */
async function paletteThenTint(page) {
  await go(page, '/create/palette')
  await page.locator('.plb-ramp').first().click()
  await expect(page.locator('.plb-tintpop')).toBeVisible()
  await page.getByRole('button', { name: 'Open in Tint Generator' }).click()
  await expect(page).toHaveURL(/\/create\/tint$/)
}

const arrow = (page, name) => page.locator(BAR).getByRole('link', { name, exact: true })
const menuOf = (page) => page.getByRole('menu', { name: 'Back button options' })
const settled = (menu) => menu.evaluate((el) => new Promise((resolve) => {
  let last = ''
  let still = 0
  const tick = () => {
    const box = el.getBoundingClientRect()
    const now = `${box.left},${box.top},${box.width},${box.height}`
    still = now === last ? still + 1 : 0
    last = now
    if (still >= 3) resolve(true)
    else requestAnimationFrame(tick)
  }
  tick()
}))

test.describe('1440 · the back arrow', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a click steps back to the page the person was on', async ({ page }) => {
    watch(page, 'designer going from the palette to tint and back')
    await paletteThenTint(page)
    await arrow(page, 'Back to previous page').click()
    await expect(page).toHaveURL(/\/create\/palette$/)
  })

  test('a fresh load goes to the dashboard', async ({ page }) => {
    watch(page, 'designer opening a tool from a bookmark')
    await go(page, '/create/tint')
    const back = arrow(page, 'Back to dashboard')
    await expect(back).toHaveAttribute('href', '/projects')
    await back.click()
    await expect(page).toHaveURL(DASHBOARD)
  })

  test('right-click opens the menu with Go to dashboard, and the row goes there', async ({ page }) => {
    watch(page, 'designer right-clicking the back arrow')
    await paletteThenTint(page)
    await arrow(page, 'Back to previous page').click({ button: 'right' })
    const menu = menuOf(page)
    await expect(menu).toBeVisible()
    const item = menu.getByRole('menuitem', { name: 'Go to dashboard' })
    await expect(item).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveCount(1)
    // The menu is placed at the pointer, inside the viewport.
    await settled(menu)
    const box = await menu.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    await item.click()
    // The dashboard even though the palette is behind this page.
    await expect(page).toHaveURL(DASHBOARD)
  })

  test('Shift+F10 opens it, arrows stay in it, Escape closes it and focus returns', async ({ page }) => {
    watch(page, 'keyboard user on the back arrow')
    await go(page, '/create/tint')
    const back = arrow(page, 'Back to dashboard')
    await back.focus()
    await page.keyboard.press('Shift+F10')
    const menu = menuOf(page)
    await expect(menu).toBeVisible()
    const item = menu.getByRole('menuitem', { name: 'Go to dashboard' })
    await expect(item).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(item).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(back).toBeFocused()
    // The Menu key opens it again, and Enter runs the row.
    await page.keyboard.press('ContextMenu')
    await expect(menuOf(page)).toBeVisible()
    await expect(menuOf(page).getByRole('menuitem', { name: 'Go to dashboard' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(DASHBOARD)
  })

  test('an outside press closes it', async ({ page }) => {
    watch(page, 'designer dismissing the back menu')
    await go(page, '/create/tint')
    await arrow(page, 'Back to dashboard').click({ button: 'right' })
    await expect(menuOf(page)).toBeVisible()
    await page.mouse.click(700, 500)
    await expect(menuOf(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/create\/tint$/)
  })

  test('a scroll closes it', async ({ page }) => {
    watch(page, 'designer scrolling with the back menu open')
    await go(page, '/create/tint')
    await arrow(page, 'Back to dashboard').click({ button: 'right' })
    await expect(menuOf(page)).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
    await expect(menuOf(page)).toHaveCount(0)
  })

  test('Shift+right-click leaves the browser menu alone', async ({ page }) => {
    watch(page, 'designer wanting the browser menu on the back arrow')
    await go(page, '/create/tint')
    const prevented = await arrow(page, 'Back to dashboard').evaluate((node) => !node.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 60, clientY: 60, shiftKey: true }),
    ))
    expect(prevented).toBe(false)
    await expect(menuOf(page)).toHaveCount(0)
  })
})

test.describe('390 · the back arrow menu is the sheet', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('right-click opens the bottom sheet and the row goes to the dashboard', async ({ page }) => {
    watch(page, 'phone designer on the back arrow')
    await go(page, '/create/tint')
    await arrow(page, 'Back to dashboard').click({ button: 'right' })
    const menu = menuOf(page)
    await expect(menu).toBeVisible()
    await settled(menu)
    const box = await menu.boundingBox()
    expect(box.width).toBeLessThanOrEqual(390)
    expect(box.y + box.height).toBeLessThanOrEqual(844 + 1)
    await menu.getByRole('menuitem', { name: 'Go to dashboard' }).click()
    await expect(page).toHaveURL(DASHBOARD)
  })
})
