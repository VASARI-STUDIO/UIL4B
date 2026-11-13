// The palette preview dialog at 320 wide: no sideways scroll, every control still reachable and 44px tall.
//
// Seen to fail (make each break, watch the named test fail, restore):
//   1  in palette-preview-dialog.css give `.pvd-scenes-btn` `min-width:400px` (and `flex:none`): "nothing in the dialog is wider than the screen" fails
//   2  in palette-preview-dialog.css set `.pvd-colours{height:30px}`: "the phone controls are 44px tall" fails
//   3  in palette-preview-dialog.css set `.pvd-scenes-sheet .pvd-opt{height:30px}`: "the Previews sheet reaches the last scene..." fails
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

test.use({ viewport: { width: 320, height: 640 }, hasTouch: true })

const COLORS = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']

async function open(page) {
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
  await signIn(page, { plan: 'pro' })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('the preview at 320', () => {
  test('nothing in the dialog is wider than the screen', async ({ page }) => {
    watch(page, 'phone designer at 320')
    const dialog = await open(page)
    const card = await dialog.locator('.plb-modal-card--preview').boundingBox()
    expect(Math.round(card.width)).toBeLessThanOrEqual(320)
    const wide = await dialog.evaluate((el) => {
      const out = []
      for (const n of el.querySelectorAll('.pvd-head, .pvd-dock, .pvd-scenes-btn, .pvd-legend, .pvd-colours')) {
        const r = n.getBoundingClientRect()
        if (r.right > 320.5 || r.left < -0.5) out.push(`${n.className} ${Math.round(r.left)}..${Math.round(r.right)}`)
      }
      return out
    })
    expect(wide, 'elements outside the 320px screen').toEqual([])
  })

  test('the phone controls are 44px tall', async ({ page }) => {
    const dialog = await open(page)
    const colours = await dialog.locator('.pvd-colours').boundingBox()
    expect(Math.round(colours.height), 'Colours button').toBeGreaterThanOrEqual(44)
    const dock = await dialog.locator('.pvd-scenes-btn').boundingBox()
    expect(Math.round(dock.height), 'Previews button').toBeGreaterThanOrEqual(44)
    const close = await dialog.getByRole('button', { name: 'Close preview' }).boundingBox()
    expect(Math.round(close.height), 'close button').toBeGreaterThanOrEqual(40)
  })

  test('the Previews sheet reaches the last scene, every row is 44px tall, and a tap selects it', async ({ page }) => {
    const dialog = await open(page)
    await dialog.locator('.pvd-scenes-btn').tap()
    const sheet = dialog.getByRole('dialog', { name: 'Previews' })
    await expect(sheet).toBeVisible()
    const box = await sheet.boundingBox()
    expect(Math.round(box.x), 'the sheet starts inside the screen').toBeGreaterThanOrEqual(0)
    expect(Math.round(box.x + box.width), 'the sheet ends inside the screen').toBeLessThanOrEqual(320)
    const options = sheet.getByRole('listbox', { name: 'Previews' }).locator('[data-scene-id]')
    const last = options.last()
    await last.scrollIntoViewIfNeeded()
    const row = await last.boundingBox()
    expect(Math.round(row.height), 'scene row').toBeGreaterThanOrEqual(44)
    await expect(sheet.getByRole('button', { name: 'Close previews' })).toBeVisible()
    const name = (await last.locator('.pvd-opt-name').textContent()).trim()
    await last.tap()
    await expect(dialog.locator('.pvd-scenes-name'), 'the dock names the scene just picked').toHaveText(name)
    await expect(last).toHaveAttribute('aria-selected', 'true')
    await expect(dialog, 'the dialog is still open').toBeVisible()
  })
})
