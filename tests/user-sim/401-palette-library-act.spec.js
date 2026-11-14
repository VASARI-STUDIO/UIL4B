// V3 Libraries, palettes: doing something with a palette you found. A tile has
// no action buttons of its own any more: you open its preview and act in the
// dialog's Actions section, on a desktop and on a phone alike. Every route ends
// in the same places: a copy with its toast, a new project, and the Gradient
// Generator holding the palette's colours.
//
// MUTATIONS this file goes red on:
//   - in src/components/discover/PaletteGalleryGrid.jsx `openInGradient`, drop the
//     `setGradientDraft` call: the "Gradient action stages the palette"
//     assertions go red (both tests);
//   - in `actionsOf` (same file) drop the `hex` or `css` entry: the desktop copy
//     assertions and the phone CSS assertions go red;
//   - drop `aria-haspopup`/the `onOpen` handler on the tile's open button in
//     src/components/library/VerticalPanelTile.jsx: the dialog never opens and both tests go red;
//   - in src/components/library/GalleryPreviewDialog.jsx drop the focus restore on close: the phone
//     test's "Close returns focus to the tile" assertion goes red;
//   - make `.gpd-action` shorter than 44px in library-v3.css: the phone test's
//     action height assertion goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'

const PICK = LIBRARY_PALETTES.find((p) => p.pro !== true && new Set(p.colors.map((c) => c.toLowerCase())).size >= 2)

/**
 * Open the page as a Pro member, search down to the one palette and open its
 * preview. Returns the tile's open button (focus goes back to it on close) and the dialog.
 */
async function openPick(page) {
  await signIn(page, { plan: 'pro' })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  await go(page, '/discover/palettes')
  await page.getByLabel('Search palettes').fill(PICK.name)
  const opener = page.getByRole('button', { name: `Preview ${PICK.name}`, exact: true }).first()
  await expect(opener).toBeVisible()
  return { opener, dialog: () => page.getByRole('dialog', { name: PICK.name }) }
}

/** The Gradient Generator has the palette's colours: they appear in a field or in the text. */
async function expectStaged(page) {
  await expect(page).toHaveURL(/\/create\/gradient/)
  const first = PICK.colors[0].replace('#', '')
  await expect.poll(
    () => page.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.value).join(' ') + ' ' + document.body.innerText),
    { timeout: 10000, message: `the generator holds ${first}` },
  ).toMatch(new RegExp(first, 'i'))
}

test.describe('acting on a palette, desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Copy all hex copies every colour with a toast, and the Gradient action stages the palette', async ({ page }) => {
    watch(page, 'a Pro member copying a palette and taking it to the Gradient Generator')
    const { opener, dialog } = await openPick(page)
    await opener.click()
    await expect(dialog()).toBeVisible()

    await dialog().getByRole('button', { name: `Copy all ${PICK.colors.length} hex codes from ${PICK.name}` }).click()
    await expect(page.getByText(`Copied ${PICK.colors.length} hex codes`)).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied.toLowerCase()).toBe(PICK.colors.join(', ').toLowerCase())

    // The dialog stays open after a copy, so the next action is one click away.
    await expect(dialog()).toBeVisible()
    // Gradient is a button now (it stages the draft, then navigates), not a link.
    await expect(dialog().getByRole('link', { name: `Gradient from ${PICK.name}` })).toHaveCount(0)
    await dialog().getByRole('button', { name: `Gradient from ${PICK.name}` }).click()
    await expectStaged(page)
  })
})

test.describe('acting on a palette, phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the preview sheet holds four thumb-sized actions; Close returns focus to the tile; CSS, Project and Gradient each do their job', async ({ page }) => {
    watch(page, 'a Pro member on a phone acting on a palette')
    const { opener, dialog } = await openPick(page)

    const box = await opener.boundingBox()
    expect(Math.round(box.width), 'the tile opens from a target at least 44px wide').toBeGreaterThanOrEqual(44)
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(44)
    await expect(opener).toHaveAttribute('aria-haspopup', 'dialog')

    await opener.tap()
    await expect(dialog()).toBeVisible()
    const actions = dialog().locator('.gpd-action')
    for (const label of [
      `Save ${PICK.name} to a project`,
      `Gradient from ${PICK.name}`,
      `Copy ${PICK.name} as CSS custom properties`,
      `Copy all ${PICK.colors.length} hex codes from ${PICK.name}`,
    ]) {
      await expect(dialog().getByRole('button', { name: label })).toHaveCount(1)
    }
    const heights = await actions.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights, 'the four actions').toHaveLength(4)
    for (const h of heights) expect(h, 'each action is at least 44px tall').toBeGreaterThanOrEqual(44)

    await dialog().getByRole('button', { name: 'Close' }).tap()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(opener).toBeFocused()

    await opener.tap()
    await dialog().getByRole('button', { name: `Copy ${PICK.name} as CSS custom properties` }).tap()
    await expect(page.getByText(`Copied ${PICK.name} as CSS`)).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('--')

    // The sheet is still open; a toast may sit over the bottom of it for a moment,
    // and a tap retries until it clears.
    await dialog().getByRole('button', { name: `Save ${PICK.name} to a project` }).tap()
    await expect(page.getByText(`Saved ${PICK.name} to a new project`)).toBeVisible()

    await dialog().getByRole('button', { name: `Gradient from ${PICK.name}` }).tap()
    await expectStaged(page)
  })
})
