// The palette preview dialog at desktop width: the rail on the right, nested states, the Pro lock and the legend trace.
//
// Seen to fail (run each, watch the named test fail, restore):
//   1  in PalettePreviewDialog.jsx drop the `{on && states && stateRows()}` line: "a scene's states sit under it" fails
//   2  in palette-preview-dialog.css remove `grid-column:2` from `.pvd-rail`: "the rail sits on the right" fails
//   3  in Stage, make the Unlock button's onClick a no-op: "a Pro preview is locked" fails
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { clickPaletteAction } from './palette-helpers.js'

test.use({ viewport: { width: 1440, height: 900 } })

const COLORS = ['#20838d', '#2994c7', '#5b89d7', '#8a9fea', '#c5c1f6']

async function seed(page) {
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
}

async function open(page, plan) {
  await seed(page)
  await signIn(page, { plan })
  await go(page, '/create/palette')
  await clickPaletteAction(page, 'Preview')
  const dialog = page.getByRole('dialog', { name: 'Palette preview' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('the preview rail', () => {
  test('the rail sits on the right, 336px wide, with the title, close and theme control in it', async ({ page }) => {
    watch(page, 'designer opening the preview at 1440')
    const dialog = await open(page, 'pro')
    const rail = dialog.locator('.pvd-rail')
    const box = await rail.boundingBox()
    // The card has a 1px border; the rail fills the padding box inside it, so "flush" is the card's inner right edge.
    const inner = await dialog.locator('.plb-modal-card--preview').evaluate((el) => {
      const b = el.getBoundingClientRect()
      return b.left + el.clientLeft + el.clientWidth
    })
    expect(Math.round(box.width), 'rail width').toBe(336)
    expect(Math.round(box.x + box.width), 'rail is flush with the card right edge').toBe(Math.round(inner))
    await expect(rail.getByRole('heading', { name: 'Preview' })).toBeVisible()
    await expect(rail.getByRole('button', { name: 'Close preview' })).toBeVisible()
    await expect(rail.getByRole('group', { name: 'Preview theme' }).getByRole('button', { name: 'Dark' })).toBeVisible()
  })

  test('a scene\'s states sit under it, one is selected, and a pick changes the scene', async ({ page }) => {
    const dialog = await open(page, 'pro')
    await dialog.getByRole('option', { name: /^Spending card/ }).click()
    const states = dialog.getByRole('group', { name: 'State' })
    await expect(states.getByRole('option')).toHaveCount(4)
    await expect(states.getByRole('option', { selected: true })).toHaveText('Overview')
    await states.getByRole('option', { name: 'Limits', exact: true }).click()
    await expect(states.getByRole('option', { selected: true })).toHaveText('Limits')
    await expect(dialog.locator('.pvs[data-preview-scene="Spending card"] .ty-limits')).toBeVisible()
  })

  test('the keyboard walks the states with the arrow keys', async ({ page }) => {
    const dialog = await open(page, 'pro')
    await dialog.getByRole('option', { name: /^Spending card/ }).click()
    const states = dialog.getByRole('group', { name: 'State' })
    await states.getByRole('option', { selected: true }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(states.getByRole('option', { selected: true })).toHaveText('Card frozen')
    await page.keyboard.press('End')
    await expect(states.getByRole('option', { selected: true })).toHaveText('Declined payment')
    await page.keyboard.press('Home')
    await expect(states.getByRole('option', { selected: true })).toHaveText('Overview')
  })

  test('a Pro preview is locked for a free account and Unlock opens the upgrade', async ({ page }) => {
    const dialog = await open(page, null)
    await dialog.getByRole('option', { name: /^Spending card/ }).click()
    await expect(dialog.locator('.pvd-legend')).toContainText('Your colours show once this preview is unlocked.')
    await dialog.getByRole('button', { name: 'Unlock preview' }).click()
    await expect(page.getByRole('link', { name: /See all plans/i }).first()).toHaveAttribute('href', '/plans')
  })

  test('a chip in the legend traces its colour, and Clear lifts it', async ({ page }) => {
    const dialog = await open(page, 'pro')
    const chip = dialog.getByRole('button', { name: /^Primary/ })
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    const showing = dialog.getByText('Showing:')
    await expect(showing).toBeVisible()
    await dialog.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await expect(showing).toHaveCount(0)
  })

  test('the dark theme control restyles the scene without closing the dialog', async ({ page }) => {
    const dialog = await open(page, 'pro')
    const scene = dialog.locator('.pvs').first()
    const before = await scene.evaluate((el) => getComputedStyle(el).backgroundColor)
    await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect.poll(() => scene.evaluate((el) => getComputedStyle(el).backgroundColor), 'the scene ground changed').not.toBe(before)
    await expect(dialog).toBeVisible()
  })
})
