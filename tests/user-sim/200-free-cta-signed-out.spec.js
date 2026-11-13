// A signed-out visitor who clicks a free tool's call to action lands in the
// tool and is never shown the sign-in wall.
//
// The tool list is the registry's own (createTools), live tools only. Every one
// is free to open, so each is entered from the two places a visitor meets them
// — the /tools index and the Create menu in the app header — and each landing
// must be the tool's own route, rendered, with no sign-in dialog and no
// account gate over it. The tool's primary action is then pressed where it has
// one, and the wall must still be absent.
//
// MUTATION: make a tool's index link or menu link open the sign-in dialog
// (login intent on its onClick), or wrap a tool in <AuthGate> — the landing
// check fails on the dialog or the gate.
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'
import { createTools } from '../../src/data/toolTree.js'

const FREE_TOOLS = createTools().filter((t) => !t.soon)
const WALL = '.ui-login, #ui-login-title, .auth-gate-prompt, .ui-pro'

const NO_TOOLBAR_PRIMARY = new Set(['3d-converter', 'emoji', 'file-converter', 'font-gallery', 'icons'])

const trim = (route) => route.replace(/\/$/, '')

async function assertOpened(page, tool, how) {
  const label = `${tool.label} via ${how}`
  await expect(page, `${label} did not land on the tool`).toHaveURL((url) => trim(url.pathname) === tool.route)
  await expectRendered(page, label)
  await expect(page.locator('main h1').first(), `${label} rendered no heading`).toBeAttached()
  await expect(page.locator('.coming-wrap'), `${label} landed on the unbuilt placeholder`).toHaveCount(0)
  await page.waitForTimeout(400)
  await expect(page.locator(WALL), `${label} showed the sign-in wall`).toHaveCount(0)
}

async function pressPrimary(page, tool) {
  const primary = page.locator('.tl-primary, [data-tl-dock]').getByRole('button').first()
  if (!(await primary.count())) return false
  await expect(primary, `${tool.label}'s primary action is not usable`).toBeEnabled()
  page.once('filechooser', () => {})
  await primary.click()
  await page.waitForTimeout(400)
  await expect(page.locator(WALL), `${tool.label}'s primary action showed the sign-in wall`).toHaveCount(0)
  return true
}

test.describe('registry', () => {
  test('there are free tools to cover, and none of them is a placeholder', () => {
    expect(FREE_TOOLS.length).toBeGreaterThanOrEqual(10)
    expect(FREE_TOOLS.every((t) => t.route.startsWith('/create/'))).toBe(true)
  })
})

test.describe('the sign-in wall can be seen when it should be', () => {
  test('the header Log in button opens the dialog this spec looks for', async ({ page }) => {
    watch(page, 'a visitor choosing to log in')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.locator('.pnav-pop-item').filter({ hasText: /^Log in$/ }).click()
    await expect(page.locator(WALL).first()).toBeVisible()
  })
})

test.describe('the /tools index opens each free tool', () => {
  for (const tool of FREE_TOOLS) {
    test(`${tool.label}: card or row, then its primary action`, async ({ page }) => {
      watch(page, `a visitor with no account opening ${tool.label} from the tool index`)
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, '/tools')
      const link = page.locator(`main a[href="${tool.route}"]`).filter({ visible: true }).first()
      await expect(link, `${tool.label} has no link on /tools`).toBeVisible()
      await link.scrollIntoViewIfNeeded()
      await link.click()
      await assertOpened(page, tool, 'the /tools index')
      const pressed = await pressPrimary(page, tool)
      expect(pressed, `${tool.label}: primary action ${NO_TOOLBAR_PRIMARY.has(tool.id) ? 'appeared' : 'was not found'} on the toolbar`).toBe(!NO_TOOLBAR_PRIMARY.has(tool.id))
    })
  }
})

test.describe('the Create menu opens each free tool', () => {
  for (const tool of FREE_TOOLS) {
    test(`${tool.label}: menu link`, async ({ page }) => {
      watch(page, `a visitor with no account opening ${tool.label} from the Create menu`)
      await page.setViewportSize({ width: 1440, height: 900 })
      await go(page, '/learn/help')
      await page.locator('.pnav-trigger', { hasText: 'Create' }).click()
      const link = page.locator(`.pnav-menu a.pnav-tool[href="${tool.route}"]`)
      await expect(link, `${tool.label} is not in the Create menu`).toBeVisible()
      await link.click()
      await assertOpened(page, tool, 'the Create menu')
    })
  }
})

test.describe('a phone opens the tool and its dock action without the wall', () => {
  for (const tool of FREE_TOOLS) {
    test(`${tool.label} at 390px`, async ({ page }) => {
      watch(page, `a visitor with no account on a phone opening ${tool.label}`)
      await page.setViewportSize({ width: 390, height: 844 })
      await go(page, '/tools')
      const link = page.locator(`main a[href="${tool.route}"]`).filter({ visible: true }).first()
      await expect(link, `${tool.label} has no link on /tools`).toBeVisible()
      await link.scrollIntoViewIfNeeded()
      await link.click()
      await assertOpened(page, tool, 'the /tools index on a phone')
      await pressPrimary(page, tool)
    })
  }
})
