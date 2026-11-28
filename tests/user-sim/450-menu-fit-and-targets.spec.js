// Menus and dropdowns stay inside the screen and keep touch-sized rows.
//
// MUTATIONS (each turns the test named red):
//   usePopover: `roomBelow` back to `vh - anchor.bottom`      -> "the contrast picker stays above the tab bar at 390"
//   usePopover: the `--pop-max-h` write removed (both paths)   -> "the gradient stop picker stays inside the viewport at 1440x900"
//                                                                 and "the contrast picker stays above the tab bar at 390"
//   global.css: `.pnav-sheet .pnav-reco-link{min-height:44px}` removed -> "every link in the phone menu is at least 44px tall"
//   save-share-menu.css: the `.plb-savemenu .plb-menu-item` min-height removed -> "Save or share rows meet the row floor"
//   type.css: `.svt-summary` back to `font-size:11.5px`        -> "the Save to a project menu text is at least 12px"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

// A full Recent list makes the colour picker as tall as it gets.
const seedRecents = (page) => page.addInitScript(() => {
  localStorage.setItem('vs-recent-colors', JSON.stringify([
    '#112233', '#223344', '#334455', '#445566', '#556677', '#667788',
    '#778899', '#8899aa', '#99aabb', '#aabbcc', '#bbccdd', '#ccddee',
  ]))
})

// The line the picker must stay above: the fixed tab bar when one is showing,
// else the bottom of the viewport.
const floorOf = (page) => page.evaluate(() => {
  const tabs = document.querySelector('.pnav-tabs')
  const box = tabs && getComputedStyle(tabs).position === 'fixed' ? tabs.getBoundingClientRect() : null
  return box && box.height > 0 ? Math.min(innerHeight, box.top) : innerHeight
})

test('the gradient stop picker stays inside the viewport at 1440x900', async ({ page }) => {
  watch(page, 'a designer opening a gradient stop colour picker on a laptop')
  await seedRecents(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/create/gradient')
  await page.getByRole('button', { name: 'Pick stop 1 colour', exact: true }).click()
  const pop = page.getByRole('dialog', { name: 'Pick stop 1 colour' })
  await expect(pop).toBeVisible()
  await page.waitForTimeout(400)
  const box = await pop.boundingBox()
  expect(box.y, 'the picker starts above the viewport').toBeGreaterThanOrEqual(0)
  expect(box.y + box.height, `the picker ends at ${box.y + box.height}px on a 900px screen`).toBeLessThanOrEqual(900)
})

test('the contrast picker stays above the tab bar at 390', async ({ page }) => {
  watch(page, 'a designer opening the contrast colour picker on a phone')
  await seedRecents(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/create/contrast')
  await page.getByRole('button', { name: 'Pick text colour', exact: true }).click()
  const pop = page.getByRole('dialog', { name: 'Pick text colour' })
  await expect(pop).toBeVisible()
  await page.waitForTimeout(400)
  const box = await pop.boundingBox()
  const floor = await floorOf(page)
  expect(box.y + box.height, `the picker ends at ${box.y + box.height}px; the tab bar starts at ${floor}px`).toBeLessThanOrEqual(floor)
})

test('every link in the phone menu is at least 44px tall', async ({ page }) => {
  watch(page, 'a visitor opening the phone menu')
  await page.setViewportSize({ width: 390, height: 844 })
  // The app nav (the marketing pages have their own).
  await go(page, '/create/palette')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const sheet = page.locator('.pnav-sheet')
  await expect(sheet).toBeVisible()
  for (const tab of ['Create', 'Discover', 'Learn']) {
    await sheet.locator('.pnav-acc-trigger', { hasText: tab }).click()
    await expect(sheet.locator('.pnav-acc-panel a').first()).toBeVisible()
    // Let the lazy recommended rows arrive before measuring.
    await page.waitForTimeout(600)
    const heights = await sheet.locator('a').evaluateAll((els) => els
      .map((el) => ({ text: el.textContent.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h > 0))
    const short = heights.filter((x) => x.h < 43.5)
    expect(short, `links under 44px in the ${tab} panel`).toEqual([])
  }
})

for (const [width, height, floor] of [[1440, 900, 36], [390, 844, 44]]) {
  test(`Save or share rows meet the row floor at ${width}px (${floor}px)`, async ({ page }) => {
    watch(page, `a designer opening Save or share at ${width}px`)
    await page.setViewportSize({ width, height })
    for (const route of ['/create/palette', '/create/gradient']) {
      await go(page, route)
      await page.getByRole('button', { name: 'Save or share' }).first().click()
      const menu = page.locator('.plb-savemenu')
      await expect(menu).toBeVisible()
      await page.waitForTimeout(400)
      const heights = await menu.locator('.plb-menu-item').evaluateAll((els) => els
        .map((el) => ({ text: el.textContent.trim().slice(0, 30), h: el.getBoundingClientRect().height })))
      expect(heights.length, `no rows in Save or share on ${route}`).toBeGreaterThan(0)
      expect(heights.filter((x) => x.h < floor - 0.5), `rows under ${floor}px on ${route}`).toEqual([])
    }
  })
}

test('the Save to a project menu text is at least 12px', async ({ page }) => {
  watch(page, 'a signed-in designer opening Save to a project')
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await go(page, '/create/type-scale')
  await page.getByRole('button', { name: 'Save to a project' }).first().click()
  const menu = page.locator('.svt-menu')
  await expect(menu).toBeVisible()
  const sizes = await menu.evaluate((root) => [...root.querySelectorAll('*')]
    .filter((el) => el.children.length === 0 && el.textContent.trim())
    .map((el) => ({ text: el.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(el).fontSize) })))
  expect(sizes.length, 'the menu showed no text').toBeGreaterThan(0)
  expect(sizes.filter((x) => x.px < 12), 'text under 12px in the menu').toEqual([])
})
