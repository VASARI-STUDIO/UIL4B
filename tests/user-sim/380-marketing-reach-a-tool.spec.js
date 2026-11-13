// The marketing pages' main job: a signed-out visitor gets from the page they
// landed on to a working tool without making an account.
//
//   · home: the hero search finds a tool and Enter opens it; the nav's Tools
//     link scrolls to the page's try-the-tools section
//   · /tools: a featured card's button and a bench row both open their tool,
//     and the tool renders for a signed-out visitor (no login wall, no 404)
//   · /tools: the hero "Open the toolkit" button lands on /projects
import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

const PERSONA = 'a first-time visitor looking for a tool'

const onToolPage = async (page, route) => {
  await expect(page).toHaveURL(new RegExp(`${route}$`))
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Page not found')).toHaveCount(0)
}

test.describe('from the home page', () => {
  test('typing a tool name in the hero search and pressing Enter opens that tool', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')
    const input = page.locator('.hh-search input.hcmd-input')
    await input.fill('contrast')
    await expect(page.locator('.hh-search .hcmd-row').first()).toContainText(/contrast/i)
    await input.press('Enter')
    await onToolPage(page, '/create/contrast')
  })

  test('the nav Tools link brings the try-the-tools section into view', async ({ page }) => {
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')
    await page.locator('.spnav-quiet-link', { hasText: /^Tools$/ }).click()
    await expect(page).toHaveURL(/#try$/)
    await expect(page.locator('#try')).toBeInViewport()
  })
})

test.describe('from the tools page', () => {
  test('the Palette card button opens the Palette Builder signed out', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/tools')
    await page.locator('.mk-card[data-tool="palette"]').getByRole('link', { name: 'Open Palette' }).click()
    await onToolPage(page, '/create/palette')
    await expectRendered(page, 'the Palette Builder')
  })

  test('a row on the bench opens that tool signed out', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/tools')
    const row = page.locator('.mk-row').first()
    const href = await row.getAttribute('href')
    expect(href, 'the first bench row links somewhere real').toMatch(/^\/[a-z]/)
    await row.click()
    await expect(page).toHaveURL(new RegExp(`${href.split('?')[0]}`))
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Page not found')).toHaveCount(0)
  })

  test('"Open the toolkit" in the hero lands on the projects page', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/tools')
    await page.locator('.mk-intro').getByRole('link', { name: 'Open the toolkit' }).click()
    await expect(page).toHaveURL(/\/projects$/)
  })
})
