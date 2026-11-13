// The palette preview dialog on a phone (390 wide, touch): the dock's Previews button and sheet, the colours sheet and the Pro lock.
//
// Seen to fail (make each break, watch the named test fail, restore):
//   1  in palette-preview-dialog.css change the strip breakpoint so `data-layout="strip"` never applies: "the dock opens a Previews sheet" fails
//   2  in PalettePreviewDialog.jsx make the `.pvd-colours` button's onClick a no-op: "the Colours button opens the colour sheet" fails
//   3  in Stage, drop the LOCKED_NOTE paragraph from the lock card: "a Pro scene shows the lock, its note and Unlock" fails
//   4  in PalettePreviewDialog.jsx drop `closeScenes()` from the sheet's `onState`: "the Previews sheet lists the states of the open scene and a pick closes it" fails
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

const COLORS = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']

/** Open the Previews sheet from the dock button and return it. */
async function openScenes(dialog) {
  await dialog.locator('.pvd-scenes-btn').tap()
  const sheet = dialog.getByRole('dialog', { name: 'Previews' })
  await expect(sheet).toBeVisible()
  return sheet
}

/**
 * The Previews sheet, open however the last pick left it. A scene pick does not close it in the
 * current build (see "a scene pick closes the sheet" below), so this closes it when it is still up
 * and then opens it fresh from the dock, which is what a person does next.
 */
async function reopenScenes(dialog) {
  const sheet = dialog.getByRole('dialog', { name: 'Previews' })
  if (await sheet.count()) {
    await sheet.getByRole('button', { name: 'Close previews' }).tap()
    await expect(sheet).toHaveCount(0)
  }
  return openScenes(dialog)
}

async function open(page, plan) {
  await page.addInitScript((cols) => {
    const raw = localStorage.getItem('vs-current-design')
    const design = raw ? JSON.parse(raw) : {}
    design.palette = {
      ...(design.palette || {}),
      base: cols[0], harmony: 'auto', extraColors: [], activeIdx: 0,
      colors: cols, baseColors: cols,
      globalAdjust: { h: 0, s: 0, b: 0, temp: 0 }, locked: [],
    }
    localStorage.setItem('vs-current-design', JSON.stringify(design))
  }, COLORS)
  await signIn(page, { plan })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('the preview on a phone', () => {
  test('the dock opens a Previews sheet, the dialog fills the screen, and a tap swaps the scene', async ({ page }) => {
    watch(page, 'phone designer opening the preview')
    const dialog = await open(page, 'pro')
    await expect(dialog.locator('.pvd-rail'), 'no rail on a phone').toHaveCount(0)
    await expect(dialog.locator('.pvd-strip .pvd-opt'), 'no scene strip on a phone').toHaveCount(0)
    await expect(dialog.getByRole('listbox', { name: 'Previews' }), 'the scene list stays shut until asked for').toHaveCount(0)
    const box = await dialog.locator('.plb-modal-card--preview').boundingBox()
    expect(Math.round(box.width), 'full width').toBe(390)
    const dock = dialog.locator('.pvd-scenes-btn')
    await expect(dock).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(dock).toHaveAttribute('aria-expanded', 'false')
    await expect(dock.locator('.pvd-scenes-name'), 'the button names the open scene').toHaveText('Editorial hero')
    await expect(dock, 'its accessible name is the scene').toHaveAccessibleName(/^Editorial hero/)

    const sheet = await openScenes(dialog)
    await expect(dock).toHaveAttribute('aria-expanded', 'true')
    const list = sheet.getByRole('listbox', { name: 'Previews' })
    await expect(list.getByRole('option', { name: /^Editorial hero/ })).toHaveAttribute('aria-selected', 'true')
    await list.getByRole('option', { name: /^Trail run app/ }).tap()
    await expect(dialog.locator('.pvs[data-preview-scene="Trail run app"]')).toBeVisible()
    await expect(dock.locator('.pvd-scenes-name')).toHaveText('Trail run app')
    await expect(list.getByRole('option', { name: /^Trail run app/ })).toHaveAttribute('aria-selected', 'true')
  })

  // Spec 3.5 A: picking a preview keeps the sheet open so a state can be picked next; picking a state closes it.
  test('a scene pick keeps the sheet open and swaps the scene behind it', async ({ page }) => {
    const dialog = await open(page, 'pro')
    const sheet = await openScenes(dialog)
    await sheet.getByRole('option', { name: /^Trail run app/ }).tap()
    await expect(sheet.getByRole('option', { name: /^Trail run app/ })).toHaveAttribute('aria-selected', 'true')
    await expect(sheet, 'the sheet stays open for a state pick').toBeVisible()
    await expect(dialog.locator('.pvs[data-preview-scene="Trail run app"]')).toHaveCount(1)
    await expect(dialog.locator('.pvd-scenes-btn')).toHaveAttribute('aria-expanded', 'true')
  })

  test('the Previews sheet closes on its own close button and hands focus back', async ({ page }) => {
    const dialog = await open(page, 'pro')
    const sheet = await openScenes(dialog)
    await sheet.getByRole('button', { name: 'Close previews' }).tap()
    await expect(sheet).toHaveCount(0)
    await expect(dialog.locator('.pvd-scenes-btn')).toBeFocused()
    await expect(dialog.locator('.pvs[data-preview-scene="Editorial hero"]'), 'the scene did not change').toBeVisible()
    await expect(dialog, 'the preview stays open').toBeVisible()
  })

  test('the Colours button opens the colour sheet and its close button shuts it', async ({ page }) => {
    const dialog = await open(page, 'pro')
    await dialog.locator('.pvd-colours').tap()
    const sheet = dialog.getByRole('dialog', { name: 'Where each colour lands' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Close colours' }).tap()
    await expect(sheet).toHaveCount(0)
    await expect(dialog, 'the preview stays open').toBeVisible()
  })

  test('the Previews sheet lists the states of the open scene and a pick closes it', async ({ page }) => {
    const dialog = await open(page, 'pro')
    let sheet = await openScenes(dialog)
    await sheet.getByRole('option', { name: /^Spending card/ }).tap()
    await expect(dialog.locator('.pvs[data-preview-scene="Spending card"]')).toBeVisible()
    await expect(dialog.locator('.pvs[data-preview-scene="Spending card"] .ty-limits'), 'Limits is not the first state').toHaveCount(0)

    sheet = await reopenScenes(dialog)
    const states = sheet.getByRole('group', { name: 'State' })
    await expect(states.getByRole('option'), 'the Spending card has four states').toHaveCount(4)
    await states.getByRole('option', { name: 'Limits', exact: true }).tap()
    await expect(sheet).toHaveCount(0)
    await expect(dialog.locator('.pvd-scenes-btn'), 'focus returns to the dock button').toBeFocused()
    await expect(dialog.locator('.pvs[data-preview-scene="Spending card"] .ty-limits')).toBeVisible()

    sheet = await reopenScenes(dialog)
    await expect(sheet.getByRole('group', { name: 'State' }).getByRole('option', { name: 'Limits', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  test('a Pro scene shows the lock, its note and Unlock for a free account', async ({ page }) => {
    const dialog = await open(page, null)
    const sheet = await openScenes(dialog)
    await sheet.getByRole('option', { name: /^Spending card/ }).tap()
    await sheet.getByRole('button', { name: 'Close previews' }).tap()
    await expect(sheet).toHaveCount(0)
    await expect(dialog.getByText('Spending card is a Pro preview')).toBeVisible()
    await expect(dialog.getByText('Your colours show once this preview is unlocked.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Unlock preview' })).toBeVisible()
  })

  test('nothing scrolls sideways', async ({ page }) => {
    const dialog = await open(page, 'pro')
    const over = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(over, 'dialog overflow in px').toBeLessThanOrEqual(0)
  })
})
