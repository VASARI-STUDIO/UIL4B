// The "From image" studio in the Palette Builder, driven the way a person uses it:
// choose a sample photo, read the markers and the strip, change the mood and the
// count, then put the result on the board (Replace palette, Add N of M) or undo
// the work inside the dialog (Reset points, Remove photo).
//
// What each check compares against is something other than the code under test:
//   - the number of markers against the number the stepper shows on screen
//   - the strip's hexes against the board's hexes after "Replace palette"
//   - a locked colour against the hex it had before the dialog was opened
//   - marker positions against positions read before the drag
// The sample photos are real files from public/samples/from-image/, so the colours
// come out of the real extraction, not a stub.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

const DIALOG = 'From image'
const MARKER = '.plb-imgpoint'
const SLOT = '.plb-imgslot'

const dialogOf = (page) => page.getByRole('dialog', { name: DIALOG })
const upper = (list) => list.map((h) => h.trim().toUpperCase())

async function openDialog(page) {
  await clickPaletteAction(page, 'Pull colours from an image', 'From image')
  const dialog = dialogOf(page)
  await expect(dialog).toBeVisible()
  return dialog
}

/** Open the dialog and load one of the four sample photos by the name on its tile. */
async function openWithSample(page, label = 'Market stall') {
  const dialog = await openDialog(page)
  await dialog.getByRole('button', { name: label, exact: true }).click()
  await expect(page.locator('.plb-imgcard')).toHaveAttribute('data-state', 'loaded')
  await expect(page.locator(MARKER).first()).toBeVisible()
  await expect(page.locator(SLOT).first()).toBeVisible()
  return dialog
}

/** The count the stepper shows, as a number. */
const shownCount = async (page) => Number((await page.locator('.plb-imgcount-n').textContent()).trim())
/** The hexes on the strip, in order. */
const stripHexes = async (page) => upper(await page.locator('.plb-imgslot-hex').allTextContents())
/** Each marker's style position, in order (the percentages the marker is drawn at). */
const markerPlaces = (page) => page.locator(MARKER).evaluateAll((els) => els.map((el) => `${el.style.left} ${el.style.top}`))
/** The board's hexes, read off each column's group label ("PRIMARY #8B5000"). */
const boardHexes = async (page) => upper(await page.locator('.plb-col').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label').split(' ').pop())))

test.describe('From image studio', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'designer building a palette from a sample photo')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col').first()).toBeVisible()
  })

  test('a sample photo shows one marker and one swatch for every colour the stepper counts', async ({ page }) => {
    await openWithSample(page)
    const n = await shownCount(page)
    expect(n, 'the stepper starts at a usable count').toBeGreaterThanOrEqual(3)
    await expect(page.locator(MARKER)).toHaveCount(n)
    await expect(page.locator(SLOT)).toHaveCount(n)
    const hexes = await stripHexes(page)
    expect(hexes).toHaveLength(n)
    for (const h of hexes) expect(h, 'every swatch carries a real hex').toMatch(/^#[0-9A-F]{6}$/)
    // each marker says the same colour its swatch does
    const marked = upper(await page.locator(MARKER).evaluateAll((els) => els.map((el) => el.dataset.hex)))
    expect(marked).toEqual(hexes)
  })

  test('changing the mood changes at least one colour on the strip', async ({ page }) => {
    const dialog = await openWithSample(page)
    const balanced = await stripHexes(page)
    // the radio itself is drawn as a dot; a person clicks the row
    await dialog.locator('label.plb-imgmood').filter({ hasText: /^Dark/ }).click()
    await expect(dialog.getByRole('radio', { name: /^Dark/ })).toBeChecked()
    await expect.poll(() => stripHexes(page), { message: 'Dark picks other colours than Balanced' }).not.toEqual(balanced)
    const dark = await stripHexes(page)
    expect(dark, 'the count is unchanged by a mood').toHaveLength(balanced.length)
    // and the marker pins follow the strip
    const marked = upper(await page.locator(MARKER).evaluateAll((els) => els.map((el) => el.dataset.hex)))
    expect(marked).toEqual(dark)
  })

  test('Colours + adds a marker and a swatch, and the count follows', async ({ page }) => {
    const dialog = await openWithSample(page)
    const n = await shownCount(page)
    await dialog.getByRole('button', { name: 'More colours' }).click()
    await expect(page.locator('.plb-imgcount-n')).toHaveText(String(n + 1))
    await expect(page.locator(MARKER)).toHaveCount(n + 1)
    await expect(page.locator(SLOT)).toHaveCount(n + 1)
    await dialog.getByRole('button', { name: 'Fewer colours' }).click()
    await expect(page.locator(MARKER)).toHaveCount(n)
  })

  test('Replace palette puts the strip on the board and keeps a locked colour where it was', async ({ page }) => {
    const before = await boardHexes(page)
    const lockedAt = 1
    await page.locator('.plb-col').nth(lockedAt).getByRole('button', { name: /^Lock / }).click()
    await expect(page.locator('.plb-col').nth(lockedAt).getByRole('button', { name: /^Unlock / })).toBeVisible()

    const dialog = await openWithSample(page)
    await expect(dialog.getByText('1 locked colour stays where it is.')).toBeVisible()
    const strip = await stripHexes(page)
    await dialog.getByRole('button', { name: 'Replace palette', exact: true }).click()
    await expect(dialogOf(page)).toHaveCount(0)

    const after = await boardHexes(page)
    expect(after[lockedAt], 'the locked colour did not move').toBe(before[lockedAt])
    await expect(page.locator('.plb-col').nth(lockedAt).getByRole('button', { name: /^Unlock / })).toBeVisible()
    const unlocked = after.filter((_, i) => i !== lockedAt)
    expect(unlocked.length, 'the other columns are still there').toBeGreaterThanOrEqual(2)
    for (const h of unlocked) expect(strip, `${h} on the board came from the photo`).toContain(h)
    const stale = before.filter((_, i) => i !== lockedAt).filter((h) => unlocked.includes(h) && !strip.includes(h))
    expect(stale, 'no old unlocked colour was left behind').toEqual([])
  })

  test('Add N of M appends only the colours that fit and leaves the board in place', async ({ page }) => {
    const before = await boardHexes(page)
    const dialog = await openWithSample(page)
    const picks = await shownCount(page)
    const room = 8 - before.length            // a signed-out palette holds up to 8
    expect(room, 'the default board leaves room for some but not all of the picks').toBeGreaterThan(0)
    expect(room).toBeLessThan(picks)
    const add = dialog.getByRole('button', { name: `Add ${room} of ${picks}`, exact: true })
    await expect(add).toBeEnabled()
    const strip = await stripHexes(page)
    await add.click()
    await expect(dialogOf(page)).toHaveCount(0)

    const after = await boardHexes(page)
    expect(after).toHaveLength(before.length + room)
    expect(after.slice(0, before.length), 'the existing colours kept their places').toEqual(before)
    for (const h of after.slice(before.length)) expect(strip, `${h} was one of the picks`).toContain(h)
  })

  test('Reset points puts a dragged marker back where the photo suggested', async ({ page }) => {
    await openWithSample(page)
    // let the one-time fade-in finish so the marker is where it will stay
    await expect(page.locator('.plb-imgstage')).toHaveAttribute('data-intro', 'false')
    const original = await markerPlaces(page)

    const stage = await page.locator('.plb-imgstage').boundingBox()
    const marker = await page.locator(MARKER).first().boundingBox()
    const from = { x: marker.x + marker.width / 2, y: marker.y + marker.height / 2 }
    // Drag across the photo, to the point on the far side of the stage's centre.
    const to = { x: stage.x + stage.width * (from.x - stage.x < stage.width / 2 ? 0.85 : 0.15), y: stage.y + stage.height * 0.5 }
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 })
    await page.mouse.move(to.x, to.y, { steps: 4 })
    await page.mouse.up()

    const moved = await markerPlaces(page)
    expect(moved[0], 'the drag moved marker 1').not.toBe(original[0])
    expect(moved.slice(1), 'the other markers stayed put').toEqual(original.slice(1))

    await dialogOf(page).getByRole('button', { name: 'Reset points', exact: true }).click()
    await expect.poll(() => markerPlaces(page)).toEqual(original)
  })

  test('Remove photo returns to the empty state with the samples on offer', async ({ page }) => {
    const dialog = await openWithSample(page)
    await dialog.getByRole('button', { name: 'Remove photo', exact: true }).click()
    await expect(page.locator('.plb-imgcard')).toHaveAttribute('data-state', 'empty')
    await expect(page.locator(MARKER)).toHaveCount(0)
    await expect(page.locator(SLOT)).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Choose a photo' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Market stall', exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Replace palette' })).toHaveCount(0)
  })
})

test.describe('From image studio at 390', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'designer on a phone building a palette from a sample photo')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/palette')
    await expect(page.locator('.plb-col').first()).toBeVisible()
  })

  const noSideways = (page, what) => page.evaluate(() => ({
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    card: (() => { const c = document.querySelector('.plb-imgcard'); return c ? c.scrollWidth - c.clientWidth : null })(),
    cardRight: (() => { const c = document.querySelector('.plb-imgcard'); return c ? Math.round(c.getBoundingClientRect().right) : null })(),
    inner: window.innerWidth,
  })).then((m) => {
    expect(m.page, `${what}: the page scrolls sideways`).toBeLessThanOrEqual(0)
    expect(m.card, `${what}: the dialog card is wider than itself`).toBeLessThanOrEqual(0)
    expect(m.cardRight, `${what}: the dialog runs off the right edge`).toBeLessThanOrEqual(m.inner)
  })

  test('the mood sheet button opens a sheet and choosing a mood changes the strip', async ({ page }) => {
    const dialog = await openDialog(page)
    await noSideways(page, 'empty state')
    await dialog.getByRole('button', { name: 'Market stall', exact: true }).click()
    await expect(page.locator(MARKER).first()).toBeVisible()
    await noSideways(page, 'loaded state')

    await expect(dialog.getByRole('radiogroup')).toHaveCount(0)   // the list is a sheet below 900px
    const balanced = await stripHexes(page)
    const button = dialog.getByRole('button', { name: /^Mood/ })
    await expect(button).toContainText('Balanced')
    await button.click()
    const sheet = dialog.getByRole('listbox', { name: 'Mood' })
    await expect(sheet).toBeVisible()
    await noSideways(page, 'mood sheet open')
    await sheet.getByRole('option', { name: /^Dark/ }).click()

    await expect(sheet).toHaveCount(0)
    await expect(button).toContainText('Dark')
    await expect.poll(() => stripHexes(page), { message: 'the Dark mood changes the strip' }).not.toEqual(balanced)
    await expect(dialog.getByRole('button', { name: /^Add|Replace palette/ }).first()).toBeVisible()
    await noSideways(page, 'after choosing a mood')
  })
})
