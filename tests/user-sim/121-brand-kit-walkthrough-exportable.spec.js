// The walkthrough, walked the way a person walks it, ends in a project that can
// be exported.
//
// Nothing is seeded: the palette board is the random draw it opens on, every
// step is passed with Next, and the project is saved under a name. The project
// has to keep the five colours the board was showing, read every part as done,
// and offer "Export project" instead of "Fill the gaps". The sibling specs seed
// a design or stop at the naming card, so none of them reached this page.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const rail = (page) => page.getByRole('region', { name: 'Brand kit walkthrough' })
// The closing step is one panel at every width: a sheet on a phone, a popover above the bar from 768px.
const nameForm = (page) => page.getByRole('dialog', { name: 'Name your project' })
const nameField = (page) => nameForm(page).getByRole('textbox', { name: 'Project name' })

/** The hexes the palette board is showing, in board order. */
const boardColours = (page) => page.locator('.plb-col').evaluateAll(
  (cols) => cols.map((c) => (c.innerText.match(/#[0-9A-F]{6}/i) || [])[0]?.toUpperCase()),
)

async function walk(page) {
  await signIn(page, { plan: 'free', projects: 0 })
  // The guide is switched on the way the mega menu does it; the walk itself is
  // the real one. A phone has no mega menu bar, so its flag is set up front.
  await page.addInitScript(() => {
    try { if (window.innerWidth < 900 && !localStorage.getItem('vs-uikit-guide')) localStorage.setItem('vs-uikit-guide', '1') } catch { /* blocked */ }
  })
  await go(page, '/create/palette')
  if (!(await rail(page).count())) {
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await page.locator('.pnav-editorial-cta').click()
  }
  await expect(rail(page)).toBeVisible()
  await expect(page.locator('.plb-col')).toHaveCount(5)
  const board = await boardColours(page)

  for (const [button, url] of [
    [/^Next: Fonts/, /\/create\/font-pair$/],
    [/^Next: Type scale/, /\/create\/type-scale$/],
    [/^Next: Icons/, /\/create\/icons$/],
  ]) {
    await rail(page).getByRole('button', { name: button }).click()
    await expect(page).toHaveURL(url)
  }
  await rail(page).getByRole('button', { name: /^Name your project/ }).click()
  await nameField(page).fill('Walkthrough kit')
  await nameForm(page).getByRole('button', { name: 'Save project' }).click()
  // The walkthrough ends on the export gallery; "Not now" opens the project itself.
  await expect(page).toHaveURL(/\/projects\/[^/]+\/export$/)
  await page.getByRole('link', { name: /^Not now/ }).click()
  await expect(page).toHaveURL(/\/projects\/[^/]+$/)
  return board
}

test.describe('Brand kit walkthrough: the saved project can be exported', () => {
  for (const width of [1440, 390]) {
    test(`${width}px: all four parts filled, the palette intact, Export project offered`, async ({ page }) => {
      watch(page, 'designer finishing the walkthrough and heading for export')
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
      const board = await walk(page)

      await expect(page.getByText('4 of 4 parts')).toBeVisible()
      await expect(page.getByText('Fill the gaps')).toHaveCount(0)
      await expect(page.locator('.pjd-head-actions').getByText('Export project', { exact: true })).toBeVisible()
      await expect(page.getByText('5 colours')).toBeVisible()
      await expect(page.getByText('11 steps, made from your colours')).toBeVisible()

      const saved = await page.evaluate(() => {
        const all = Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat()
        return all[0]?.design?.palette?.colors || []
      })
      expect(saved.map((c) => c.toUpperCase())).toEqual(board)
    })
  }
})
