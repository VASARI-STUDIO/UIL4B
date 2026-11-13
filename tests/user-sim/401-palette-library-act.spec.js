// V3 Libraries, palettes: doing something with a palette you found. On a
// desktop the card's hover actions; on a phone the visible "More actions"
// button and the sheet it opens. Both end in the same places: a copy with its
// toast, a new project, and the Gradient Generator holding the palette's colours.
//
// MUTATIONS this file goes red on:
//   - in PaletteGalleryGrid.jsx `openInGradient`, drop the `setGradientDraft`
//     call: the "Gradient link stages the palette" assertions go red (both tests);
//   - drop `aria-expanded` from the `.pgal-more` button: the phone test's
//     expanded assertion goes red;
//   - make `.lbry-act-row` shorter than 52px in library-v3.css: the phone test's
//     row height assertion goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'

const PICK = LIBRARY_PALETTES.find((p) => p.pro !== true && new Set(p.colors.map((c) => c.toLowerCase())).size >= 2)
const CARD = '.pgal-card:not(.geg-fade *)'

/** Open the page as a Pro member with the library narrowed to the one palette. */
async function openPick(page) {
  await signIn(page, { plan: 'pro' })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  await go(page, '/discover/palettes')
  await page.getByLabel('Search palettes').fill(PICK.name)
  const card = page.locator(CARD).filter({ has: page.locator('.pgal-name', { hasText: PICK.name }) }).first()
  await expect(card).toBeVisible()
  return card
}

/**
 * Hover the card and wait for its action layer to finish arriving (150ms fade plus a 4px
 * rise). Clicking while it is still moving makes Playwright's stability check fail, and its
 * retry scrolls the page, which takes the card from under the pointer and hides the layer
 * again, so the click never lands. Waiting on the observable end state is the fix.
 */
async function revealActions(card) {
  await card.hover()
  const layer = card.locator('.lbry-card-actions')
  await expect(layer).toHaveCSS('opacity', '1')
  await expect(layer).toHaveCSS('transform', 'none')
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

  test('Hex copies every colour with a toast, and the Gradient link stages the palette', async ({ page }) => {
    watch(page, 'a Pro member copying a palette and taking it to the Gradient Generator')
    const card = await openPick(page)
    await revealActions(card)
    await card.getByRole('button', { name: `Copy all ${PICK.colors.length} hex codes from ${PICK.name}` }).click()
    await expect(page.getByText(`Copied ${PICK.colors.length} hex codes`)).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied.toLowerCase()).toBe(PICK.colors.join(', ').toLowerCase())

    await revealActions(card)
    const link = card.getByRole('link', { name: `Gradient from ${PICK.name}` })
    await expect(link).toHaveAttribute('href', '/create/gradient')
    await link.click()
    await expectStaged(page)
  })
})

test.describe('acting on a palette, phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the More button opens a sheet of 52px rows; Close returns focus; CSS, Project and Gradient each do their job', async ({ page }) => {
    watch(page, 'a Pro member on a phone acting on a palette')
    const card = await openPick(page)
    const more = card.getByRole('button', { name: `More actions for ${PICK.name}` })
    await expect(more).toBeVisible()
    const box = await more.boundingBox()
    expect(Math.round(box.width), 'More is a 44px target').toBeGreaterThanOrEqual(44)
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(44)
    await expect(more).toHaveAttribute('aria-expanded', 'false')

    await more.tap()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    const sheet = page.getByRole('dialog', { name: PICK.name })
    await expect(sheet).toBeVisible()
    for (const name of ['Project', 'Gradient', 'CSS', 'Hex']) {
      await expect(sheet.locator('.lbry-act-row', { hasText: new RegExp(`^${name}$`) })).toHaveCount(1)
    }
    const heights = await sheet.locator('.lbry-act-row').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights).toHaveLength(4)
    for (const h of heights) expect(h, 'each row is 52px').toBeGreaterThanOrEqual(52)

    await sheet.getByRole('button', { name: 'Close' }).tap()
    await expect(sheet).toHaveCount(0)
    await expect(more).toBeFocused()
    await expect(more).toHaveAttribute('aria-expanded', 'false')

    await more.tap()
    await page.getByRole('dialog', { name: PICK.name }).getByRole('button', { name: `Copy ${PICK.name} as CSS custom properties` }).tap()
    await expect(page.getByText(`Copied ${PICK.name} as CSS`)).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('--')

    await more.tap()
    await page.getByRole('dialog', { name: PICK.name }).getByRole('button', { name: `Save ${PICK.name} to a project` }).tap()
    await expect(page.getByText(`Saved ${PICK.name} to a new project`)).toBeVisible()

    await more.tap()
    await page.getByRole('dialog', { name: PICK.name }).getByRole('link', { name: `Gradient from ${PICK.name}` }).tap()
    await expectStaged(page)
  })
})
