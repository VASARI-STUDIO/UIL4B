// Starting something new, or opening something else, never throws away work
// nobody has saved.
//
// The working design (`vs-current-design`) used to be overwritten with no
// question asked by a new project, by opening a project and by a shared palette
// link. Each of those now puts the old design aside first, in one slot of its own
// (`vs-previous-design`, this browser only), and the toast that says so carries a
// button that brings it back exactly.
//
// One test per path. Each one fails on the code that overwrote the design.
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const CURRENT = 'vs-current-design'
const PARKED = 'vs-previous-design'

// Unsaved work: a palette nobody has saved, in the shape the app writes it back
// in (the defaults first), so the stored text can be compared as text.
const WORK = {
  ...DEFAULT_DESIGN,
  palette: {
    ...DEFAULT_DESIGN.palette,
    base: '#E4572E',
    colors: ['#E4572E', '#17BEBB', '#FFC914', '#2E294E', '#76B041'],
  },
}

/** Put the unsaved work in storage once per tab, before the app reads it. */
async function seedWork(page, design = WORK) {
  await page.addInitScript(({ key, value }) => {
    try {
      if (sessionStorage.getItem('__t289_seeded') === '1') return
      sessionStorage.setItem('__t289_seeded', '1')
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* a blocked store is the app's problem */ }
  }, { key: CURRENT, value: design })
}

const read = (page, key) => page.evaluate((k) => localStorage.getItem(k), key)
const readJson = async (page, key) => JSON.parse((await read(page, key)) || 'null')
const toast = (page) => page.locator('.toast.show')

/** Press the toast's action, and read the working design in the same turn, before
 *  the palette board's own debounced write (200ms) can restate it. */
const pressActionAndReadWorking = (page) => page.evaluate(async (key) => {
  document.querySelector('.toast.show .toast-action').click()
  await new Promise((r) => setTimeout(r, 0))
  return localStorage.getItem(key)
}, CURRENT)

/** The working design as the app stores it, once the page has settled on it. */
async function settledWorking(page, design) {
  await expect.poll(async () => (await readJson(page, CURRENT))?.palette?.colors).toEqual(design.palette.colors)
  return read(page, CURRENT)
}

test.describe('Unsaved work is put aside, not lost', () => {
  test('New project on /projects parks the unsaved design, and Undo brings it back byte for byte', async ({ page }) => {
    watch(page, 'a designer with unsaved work pressing New project')
    await signIn(page, { plan: 'free', projects: 1 })
    await seedWork(page)
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    const before = await settledWorking(page, WORK)
    expect(await read(page, PARKED), 'nothing is parked before anything is replaced').toBeNull()

    await page.getByRole('button', { name: 'New project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)

    // The old design is in the slot, whole, with the time it was put aside.
    const slot = await readJson(page, PARKED)
    expect(slot?.design, 'the parked design is the unsaved one').toEqual(WORK)
    expect(typeof slot.parkedAt).toBe('number')
    await expect(toast(page)).toContainText('Your last one is in Your workspace.')
    await expect(toast(page).getByRole('button', { name: 'Undo' })).toBeVisible()

    // Undo gives back exactly what was there, and empties the slot.
    expect(await pressActionAndReadWorking(page)).toBe(before)
    expect(await read(page, PARKED)).toBeNull()
    await expect.poll(async () => (await readJson(page, CURRENT))?.palette?.colors).toEqual(WORK.palette.colors)
  })

  test('Continue building on a project parks the unsaved design, names the project, and Undo restores it', async ({ page }) => {
    watch(page, 'a designer opening another project over changed work')
    const at = '2026-09-01T09:00:00.000Z'
    const record = (id, name) => ({ id, name, design: JSON.parse(JSON.stringify(DEFAULT_DESIGN)), createdAt: at, updatedAt: at })
    // The working design was opened from project A and then changed.
    const changedA = { ...WORK, source: { projectId: 'proj-a' } }
    await signIn(page, { plan: 'free', projects: [record('proj-a', 'Alpha'), record('proj-b', 'Bravo')] })
    await seedWork(page, changedA)
    await go(page, '/projects/proj-b')
    const before = await settledWorking(page, WORK)

    await page.getByRole('button', { name: 'Continue building' }).first().click()
    await expect(page).toHaveURL(/\/create\//)

    expect((await readJson(page, PARKED))?.design, 'A\'s changes are in the slot').toEqual(changedA)
    expect((await readJson(page, CURRENT))?.source).toEqual({ projectId: 'proj-b' })
    await expect(toast(page)).toContainText('Opened Bravo. Your unsaved brand kit is in Your workspace.')

    expect(await pressActionAndReadWorking(page)).toBe(before)
    expect(await read(page, PARKED)).toBeNull()
  })

  test('a shared ?c= link parks the unsaved design before writing its palette, and Go back to it restores it', async ({ page }) => {
    watch(page, 'a designer with unsaved work opening a shared palette link')
    await seedWork(page)
    await page.addInitScript(() => { try { localStorage.setItem('vs-uikit-guide', '1') } catch { /* blocked */ } })
    await go(page, '/create/palette?c=4338E0,7C6CF0,A5B4FC,1E1B4B,F5F3FF')
    await expectRendered(page, '/create/palette')

    // The link's palette is on the board and in the working design; the old one is in the slot.
    await expect.poll(async () => (await readJson(page, CURRENT))?.palette?.colors?.[0]?.toUpperCase()).toBe('#4338E0')
    expect((await readJson(page, PARKED))?.design, 'the parked design is the unsaved one').toEqual(WORK)
    await expect(toast(page)).toContainText('Your last one is in Your workspace.')
    await expect(toast(page).getByRole('button', { name: 'Go back to it' })).toBeVisible()

    expect(await pressActionAndReadWorking(page)).toBe(JSON.stringify(WORK))
    expect(await read(page, PARKED)).toBeNull()
    expect(new URL(page.url()).search, 'the link\'s colours are off the address').toBe('')
  })

  test('finishing the walkthrough on an opened project saves to it and keeps the project count', async ({ page }) => {
    watch(page, 'a designer finishing the walkthrough on a project they opened')
    await page.setViewportSize({ width: 1440, height: 900 })
    const at = '2026-09-01T09:00:00.000Z'
    const alpha = { id: 'proj-a', name: 'Alpha', design: JSON.parse(JSON.stringify(WORK)), createdAt: at, updatedAt: at }
    await signIn(page, { plan: 'free', projects: [alpha] })
    await seedWork(page, { ...WORK, source: { projectId: 'proj-a' } })
    await page.addInitScript(() => { try { localStorage.setItem('vs-uikit-guide', '1') } catch { /* blocked */ } })
    await go(page, '/create/icons')
    await expectRendered(page, '/create/icons')

    await page.getByRole('region', { name: 'Brand kit walkthrough' }).getByRole('button', { name: /^Name your project/ }).click()
    const form = page.getByRole('dialog', { name: 'Name your project' })
    await expect(form.getByRole('button', { name: 'Save to Alpha' })).toBeVisible()
    await expect(form.getByRole('button', { name: 'Save as a new project' })).toBeVisible()
    await form.getByRole('textbox', { name: 'Project name' }).fill('Alpha kit')
    await form.getByRole('button', { name: 'Save to Alpha' }).click()

    await expect(page).toHaveURL(/\/projects\/proj-a\/export$/)
    const saved = Object.values(await readJson(page, 'vs-projects')).flat()
    expect(saved.map((p) => p.id), 'no second project, no slot spent').toEqual(['proj-a'])
    expect(saved[0].design.identity?.name).toBe('Alpha kit')
    expect('source' in saved[0].design, 'the working copy\'s source stays out of the project').toBe(false)
  })
})
