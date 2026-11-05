// PALETTE BUILDER: SAVE ONE COLOUR TO A PROJECT.
//
// A swatch's Colour actions menu has "Save to project". It opens a picker of the
// person's projects (newest first), and the choice adds that one colour to the
// project's saved colours, which the project page shows as a row of swatches that
// copy their hex. Saving into a project that is already there never takes a
// project slot, so it works on a free account that is at its project cap.
// Signed out, the action opens the sign-in prompt instead.
//
// The three projects below are the free plan's whole allowance, and the palette
// is seeded by hand, so the colour saved is known before the page is read.
//
// MUTATIONS (each turns the tests named red):
//   the menu item left out of Colour actions                     -> every test
//   saveColourToProject goes through saveProject                  -> "at the project cap"
//   addSavedColour always appends                                 -> "the same colour twice"
//   the picker lists projects oldest first                        -> "newest first"
//   the project page does not read savedColors                    -> "appears on the project page"
//   the toast text gains an exclamation mark                      -> "appears on the project page"
//   the signed-out branch skips requireLogin                      -> "signed out"
//   closeSaveColour does not set ctxReturnRef                     -> "focus returns to the swatch"
//   the empty state's button is left out, or saves without the menu -> "every project archived"
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const PALETTE = ['#1E3A8A', '#F59E0B', '#0F766E', '#F7F7F4', '#0B1220']

const project = (id, name, updatedAt) => ({
  id,
  name,
  design: structuredClone(DEFAULT_DESIGN),
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt,
})
// Orchard was edited last, so it is offered first.
const PROJECTS = [
  project('p-harbour', 'Harbour', '2026-10-01T09:00:00.000Z'),
  project('p-orchard', 'Orchard', '2026-10-20T09:00:00.000Z'),
  project('p-quarry', 'Quarry', '2026-10-10T09:00:00.000Z'),
]

const seedBoard = (page) => page.addInitScript((colors) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: colors[0], harmony: 'auto', extraColors: [], locked: [], activeIdx: 0, colors },
  }))
}, PALETTE)

const menuFor = (page) => page.getByRole('menu', { name: 'Colour actions', exact: true })
const pickerFor = (page) => page.getByRole('dialog', { name: 'Save to a project', exact: true })

/** Open a swatch's Colour actions menu, the way the screen allows: a tap on the
 *  swatch first where there is no hover, a hover where there is. */
async function openActions(page, touch, index = 0) {
  const col = page.locator('.plb-col').nth(index)
  await expect(col).toBeVisible()
  const more = col.getByRole('button', { name: /^More actions for / })
  if (touch) {
    await col.locator('.plb-name').tap()
    await more.tap()
  } else {
    await col.hover()
    await more.click()
  }
  const menu = menuFor(page)
  await expect(menu).toBeVisible()
  return { col, more, menu }
}

async function saveSwatchTo(page, touch, projectName, index = 0) {
  const { col, more, menu } = await openActions(page, touch, index)
  const hex = (await col.locator('.plb-hex').textContent()).trim()
  await menu.getByRole('menuitem', { name: 'Save to project', exact: true }).click()
  const picker = pickerFor(page)
  await expect(picker).toBeVisible()
  await picker.getByRole('button', { name: new RegExp(`^${projectName}`) }).click()
  await expect(picker).toHaveCount(0)
  return { col, more, hex }
}

const storedProject = (page, email, id) => page.evaluate(([e, i]) => {
  const all = JSON.parse(localStorage.getItem('vs-projects') || '{}')
  return (all[e] || []).find((p) => p.id === i)
}, [email, id])

const toastText = (page) => page.locator('.toast-msg')

for (const width of [390, 1440]) {
  const touch = width < 768

  test.describe(`save one colour at ${width}px`, () => {
    test.use(touch
      ? { viewport: { width, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width, height: 900 } })

    test(`a signed-in save appears on the project page, at the project cap`, async ({ page }) => {
      watch(page, `palette designer saving one colour at ${width}px`)
      const account = await signIn(page, { plan: 'free', projects: PROJECTS })
      await seedBoard(page)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)

      const { col, more, menu } = await openActions(page, touch)
      const hex = (await col.locator('.plb-hex').textContent()).trim()
      expect(hex).toBe(PALETTE[0])
      await menu.getByRole('menuitem', { name: 'Save to project', exact: true }).click()

      const picker = pickerFor(page)
      await expect(picker).toBeVisible()
      await expect(picker.getByText(hex, { exact: true })).toBeVisible()
      const rows = picker.locator('.plb-sc-list').getByRole('button')
      await expect(rows, 'newest first').toHaveText([/^Orchard/, /^Quarry/, /^Harbour/])
      // Measured once the dialog has finished its entry scale, which shrinks it a little.
      await picker.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
      for (const row of await rows.all()) {
        const box = await row.boundingBox()
        expect(box.height, 'each row is a 44px target').toBeGreaterThanOrEqual(44)
      }

      await rows.filter({ hasText: /^Orchard/ }).click()
      await expect(picker).toHaveCount(0)
      await expect(toastText(page)).toHaveText(`Saved ${hex} to Orchard.`)
      expect(await toastText(page).textContent()).not.toContain('!')
      await expect(more, 'focus returns to the swatch').toBeFocused()

      // The record keeps the colour beside the design, and no project was added.
      const stored = await storedProject(page, account.email, 'p-orchard')
      expect(stored.savedColors).toHaveLength(1)
      expect(stored.savedColors[0]).toMatchObject({ hex, at: expect.any(String) })
      expect(stored.design).toEqual(PROJECTS[1].design)
      const all = await page.evaluate((e) => JSON.parse(localStorage.getItem('vs-projects'))[e].length, account.email)
      expect(all).toBe(PROJECTS.length)

      await go(page, '/projects/p-orchard')
      const section = page.getByRole('region', { name: 'Saved colours' })
      await expect(section).toBeVisible()
      const swatches = section.getByRole('button')
      await expect(swatches).toHaveCount(1)
      await expect(swatches.first()).toHaveText(hex)
      const box = await swatches.first().boundingBox()
      expect(box.height, 'the swatch is a 44px target').toBeGreaterThanOrEqual(44)

      // A project with no saved colours shows no empty row.
      await go(page, '/projects/p-harbour')
      await expect(page.getByRole('heading', { level: 1, name: 'Harbour' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Saved colours' })).toHaveCount(0)
    })

    test(`the same colour twice is kept once`, async ({ page }) => {
      watch(page, `palette designer saving a colour twice at ${width}px`)
      const account = await signIn(page, { plan: 'free', projects: PROJECTS })
      await seedBoard(page)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)

      const { hex } = await saveSwatchTo(page, touch, 'Quarry')
      await expect(toastText(page)).toHaveText(`Saved ${hex} to Quarry.`)

      // The second time the picker says so, and pressing the row changes nothing.
      const { menu } = await openActions(page, touch)
      await menu.getByRole('menuitem', { name: 'Save to project', exact: true }).click()
      const picker = pickerFor(page)
      await expect(picker.getByRole('button', { name: /^Quarry/ })).toContainText('Already saved')
      await expect(picker.getByRole('button', { name: /^Harbour/ })).not.toContainText('Already saved')
      await picker.getByRole('button', { name: /^Quarry/ }).click()
      await expect(picker).toHaveCount(0)
      await expect(toastText(page)).toHaveText(`${hex} is already in Quarry.`)

      const stored = await storedProject(page, account.email, 'p-quarry')
      expect(stored.savedColors.map((c) => c.hex)).toEqual([hex])

      await go(page, '/projects/p-quarry')
      await expect(page.getByRole('region', { name: 'Saved colours' }).getByRole('button')).toHaveCount(1)
    })

    test(`a second colour joins the first, and a saved swatch copies its hex`, async ({ page, context }) => {
      watch(page, `palette designer saving two colours at ${width}px`)
      await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
      const account = await signIn(page, { plan: 'free', projects: PROJECTS })
      await seedBoard(page)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)

      await saveSwatchTo(page, touch, 'Harbour')
      const { hex } = await saveSwatchTo(page, touch, 'Harbour', 1)
      expect(hex).toBe(PALETTE[1])

      const stored = await storedProject(page, account.email, 'p-harbour')
      expect(stored.savedColors.map((c) => c.hex)).toEqual([PALETTE[0], PALETTE[1]])

      await go(page, '/projects/p-harbour')
      const swatches = page.getByRole('region', { name: 'Saved colours' }).getByRole('button')
      await expect(swatches).toHaveCount(2)
      await swatches.nth(1).click()
      await expect(toastText(page)).toHaveText(`Copied ${PALETTE[1]}`)
    })

    test(`with every project archived, the picker offers to save the palette instead`, async ({ page }) => {
      watch(page, `palette designer with only archived projects at ${width}px`)
      const archived = PROJECTS.map((p) => ({ ...p, archived: true }))
      await signIn(page, { plan: 'pro', projects: archived })
      await seedBoard(page)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)

      const { menu } = await openActions(page, touch)
      await menu.getByRole('menuitem', { name: 'Save to project', exact: true }).click()
      const picker = pickerFor(page)
      await expect(picker.getByText('Your projects are all archived.', { exact: false })).toBeVisible()
      await expect(picker.locator('.plb-sc-list')).toHaveCount(0)
      const way = picker.getByRole('button', { name: 'Save this palette as a project', exact: true })
      await picker.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
      expect((await way.boundingBox()).height, 'a 44px target').toBeGreaterThanOrEqual(44)

      // It opens the page's own Save menu, named and ready, not a save with no name.
      await way.click()
      await expect(picker).toHaveCount(0)
      const save = page.getByRole('dialog', { name: 'Save, share and export this palette', exact: true })
      await expect(save).toBeVisible()
      const field = save.getByRole('textbox', { name: 'Project name', exact: true })
      // Focus moves in: to the field, or on a touch screen to the menu, so no keyboard opens uninvited.
      await expect(touch ? save : field).toBeFocused()
      await expect(field).not.toHaveValue('')
    })

    test(`signed out, it opens the sign-in prompt and saves nothing`, async ({ page }) => {
      watch(page, `signed-out palette visitor saving one colour at ${width}px`)
      await seedBoard(page)
      await go(page, '/create/palette')
      await expect(page.locator('.plb-col')).toHaveCount(PALETTE.length)

      const { menu } = await openActions(page, touch)
      await menu.getByRole('menuitem', { name: 'Save to project', exact: true }).click()
      await expect(page.locator('#ui-login-title'), 'the sign-in prompt opens').toBeVisible()
      await expect(pickerFor(page), 'no picker before there is an account').toHaveCount(0)
      const kept = await page.evaluate(() => localStorage.getItem('vs-projects'))
      expect(kept === null || kept === '{}', 'no project record was written').toBe(true)

      // Closing the prompt leaves the swatch where it was and still signed out.
      await page.keyboard.press('Escape')
      await expect(page.locator('#ui-login-title')).toHaveCount(0)
      await expect(pickerFor(page)).toHaveCount(0)
    })
  })
}
