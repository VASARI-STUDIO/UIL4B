// The Palette Builder's Preview is a labelled toolbar button where there is
// room, just left of Save or share, and an Extra tools row on a phone.
//
// It has priority 3, under Redo (4), Undo, Randomise and Suggest (5), so it
// leaves the row before any of them. Under 768px it is overflow-only
// (`inline: false`), so a phone's row is Undo, Randomise, Suggest and More; Save
// or share has moved to the dock at the foot of the screen (`[data-tl-dock]`).
//
// Measured with the Switzer build at 900px tall: Preview joins the row from about
// 1050px and Explore from about 1240px, so Preview is in Extra tools at 768 and
// 1024, and a labelled button on the row at 1280 and 1440. Undo, Redo, Randomise
// and Suggest variations are on the row at every width from 768 up, and Preview
// is in exactly one place at every width.
//
// To make it fail: set `priority: 3` on the `preview` item in
// src/pages/PaletteBuilder.jsx to 6 (Redo, Undo or Randomise leave the row
// before it at 768 and 390); drop `inline: !phone` from it (Preview is on the
// phone row, or the row spills); set it to priority 0 (it is off the row at 1280).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { paletteToolbar } from './palette-helpers.js'

const PHONES = [320, 390, 640, 767]
const TABLETS = [768, 1024]
const LAPTOPS = [1280, 1440]
const LAPTOP = 1440

const settle = async (page) => {
  await expect(paletteToolbar(page)).not.toHaveClass(/is-measuring/)
  await page.waitForTimeout(120)
}

/** Every painted child of the toolbar row, left to right, with its box. */
const rowBoxes = (page) => paletteToolbar(page).evaluate((bar) => [...bar.children]
  .filter((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).position !== 'absolute')
  .map((el) => {
    const r = el.getBoundingClientRect()
    return {
      id: el.getAttribute('data-tl-item') || (el.hasAttribute('data-tl-more') ? 'more' : el.classList.contains('tl-primary') ? 'primary' : el.tagName.toLowerCase()),
      top: r.top, mid: r.top + r.height / 2, left: r.left, right: r.right, width: r.width,
    }
  }))

test.describe('Preview is a main toolbar button', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a designer who wants to see the palette on a real design') })

  for (const width of [...PHONES, ...TABLETS, ...LAPTOPS]) {
    test(`${width}px: one row, and Preview is in one place only`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/create/palette')
      await settle(page)

      const bar = paletteToolbar(page)
      const preview = bar.locator('.plb-preview-btn')
      const onRow = (await preview.count()) > 0
      expect(onRow, `${width}px: Preview ${LAPTOPS.includes(width) ? 'is' : 'is not'} on the row`).toBe(LAPTOPS.includes(width))

      // Never doubled: on the row, or in Extra tools.
      await bar.getByRole('button', { name: 'Extra tools' }).click()
      const panel = page.getByRole('dialog', { name: 'Extra tools' })
      await expect(panel.getByRole('button', { name: 'Preview', exact: true }), `${width}px: Preview is in Extra tools exactly when it is off the row`).toHaveCount(onRow ? 0 : 1)
      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await settle(page)

      // Preview leaves the row before these four do, so from 768 up they are all here.
      if (!PHONES.includes(width)) {
        for (const name of ['Undo', 'Redo', 'Randomise', 'Suggest variations']) {
          await expect(bar.getByRole('button', { name, exact: true }), `${width}px: ${name} stays on the row`).toBeVisible()
        }
      }
      if (onRow) {
        await expect(preview).toBeVisible()
        await expect(preview).toHaveAccessibleName('Preview')
        // The word shows: it is never an icon on its own.
        await expect(preview.locator('.tl-btn-label')).toBeVisible()
      }

      const boxes = await rowBoxes(page)
      // On a phone the primary is in the dock, not on the row.
      if (PHONES.includes(width)) {
        expect(boxes.map((b) => b.id), `${width}px: Save or share is in the dock, not on the row`).not.toContain('primary')
        await expect(page.locator('[data-tl-dock] button').first(), `${width}px: the dock holds Save or share`).toHaveAccessibleName(/^Save or share/)
      }
      // Centre lines, not tops: the seed chip is 37px tall, the buttons 36px and the divider 24px,
      // and the row centres them, so their tops differ by up to 7px on one line. A wrapped item
      // would sit a whole row (36px or more) off the centre.
      const mids = boxes.map((b) => b.mid)
      expect(Math.max(...mids) - Math.min(...mids), `${width}px: every item on the row shares one line (${boxes.map((b) => b.id).join(', ')})`).toBeLessThanOrEqual(2)
      expect(await bar.evaluate((el) => el.scrollWidth > el.clientWidth + 1), `${width}px: the toolbar does not scroll`).toBe(false)

      // Left to right: Preview comes after every other action and before the primary.
      if (onRow) {
        const ids = boxes.map((b) => b.id)
        const at = ids.indexOf('preview')
        expect(at, `${width}px: order on the row is ${ids.join(' > ')}`).toBeGreaterThan(-1)
        expect(ids.at(-1), 'the primary ends the row').toBe('primary')
        expect(ids.slice(at + 1).filter((id) => id !== 'more' && id !== 'primary'), 'nothing but More and Save sits to the right of Preview').toEqual([])
      }
    })
  }

  test('on a phone Preview is an Extra tools row and opens the dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/palette')
    await settle(page)
    const bar = paletteToolbar(page)
    await expect(bar.locator('.plb-preview-btn')).toHaveCount(0)
    await bar.getByRole('button', { name: 'Extra tools' }).click()
    const panel = page.getByRole('dialog', { name: 'Extra tools' })
    await expect(panel).toBeVisible()
    // Explore and From image have left the row too, and Preview is named like its row.
    await expect(panel.getByRole('button', { name: 'Explore palettes and brands', exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(page.locator('[role=dialog][aria-label="Palette preview"]')).toBeVisible()
  })

  test('on a laptop a click on the row button opens the dialog and the button says so', async ({ page }) => {
    await page.setViewportSize({ width: LAPTOP, height: 900 })
    await go(page, '/create/palette')
    await settle(page)
    const preview = paletteToolbar(page).locator('.plb-preview-btn')
    await expect(preview).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(preview).toHaveAttribute('aria-expanded', 'false')
    await preview.click()
    await expect(page.locator('[role=dialog][aria-label="Palette preview"]')).toBeVisible()
  })

  test('reopens on the last preview viewed, and never on a locked one for a free account', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/create/palette')
    await settle(page)
    const dialog = page.getByRole('dialog', { name: 'Palette preview' })
    const options = dialog.getByRole('listbox', { name: 'Previews' }).getByRole('option')
    const open = () => paletteToolbar(page).locator('.plb-preview-btn').click()

    await open()
    await expect(options.filter({ hasText: /^Editorial hero/ })).toHaveAttribute('aria-selected', 'true')
    await options.filter({ hasText: /^Trail run app/ }).click()
    await page.getByRole('button', { name: 'Close preview' }).click()
    await open()
    await expect(options.filter({ hasText: /^Trail run app/ }), 'a free preview is where it reopens').toHaveAttribute('aria-selected', 'true')

    await options.filter({ hasText: /^Spending card/ }).click()
    await expect(page.getByRole('button', { name: 'Unlock preview' })).toBeVisible()
    await page.getByRole('button', { name: 'Close preview' }).click()
    await open()
    await expect(options.filter({ hasText: /^Editorial hero/ }), 'a locked preview is not where a free account lands').toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: 'Unlock preview' })).toHaveCount(0)
  })

  test('on a phone the system Back button closes the viewer and leaves the page where it was', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/palette')
    await settle(page)
    const before = page.url()
    // On a phone Preview is an Extra tools row.
    const openPreview = async () => {
      await paletteToolbar(page).getByRole('button', { name: 'Extra tools' }).click()
      await page.getByRole('dialog', { name: 'Extra tools' }).getByRole('button', { name: 'Preview', exact: true }).click()
    }
    await openPreview()
    const dialog = page.getByRole('dialog', { name: 'Palette preview' })
    await expect(dialog).toBeVisible()
    await page.goBack()
    await expect(dialog).toHaveCount(0)
    expect(page.url()).toBe(before)

    // Closing with the X takes its history entry off again: Back then leaves the builder, not a dead entry.
    await openPreview()
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: 'Close preview' }).click()
    await expect(dialog).toHaveCount(0)
    await page.waitForTimeout(150)
    expect(await page.evaluate(() => Boolean(window.history.state && window.history.state.dialogBack))).toBe(false)
  })
})
