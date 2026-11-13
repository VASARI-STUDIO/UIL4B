// V3 Libraries, palettes: finding a palette by searching and by mood, what the
// page says when nothing matches, and the Mood sheet a phone gets instead of
// the mood row.
//
// Each test is a journey a person walks (search for one, narrow by mood, come
// back from an empty result). Signed in as Pro so the whole set arrives and the
// counts are the library's, not the signed-out three.
//
// MUTATIONS this file goes red on:
//   - in PaletteGallery.jsx `clear`, drop `.focus()` on the search field: the
//     "Clear returns focus to the search" assertion goes red;
//   - drop `sheetTitle="Mood"` from the toolbar in PaletteGallery.jsx: the phone
//     test's dialog name ("Mood") goes red;
//   - make the `.lbry-sheet` rows shorter than 48px in library-v3.css: the row
//     height assertion goes red.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { LIBRARY_PALETTES } from '../../api/_lib/library/paletteLibrary.js'

const FIRST_NAME = LIBRARY_PALETTES.find((p) => p.pro !== true).name
const CARD = '.pgal-card:not(.geg-fade *)'

/** The Pro library has arrived: more cards than a free account opens. */
const arrived = (page) => expect.poll(() => page.locator(CARD).count(), { timeout: 10000 }).toBeGreaterThan(10)

test.describe('palette library, desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('search narrows to the palette, an unmatched search says so, and Clear returns focus to the search', async ({ page }) => {
    watch(page, 'a Pro member searching the palette library')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')
    await arrived(page)
    const all = await page.locator(CARD).count()

    const search = page.getByLabel('Search palettes')
    await search.fill(FIRST_NAME)
    await expect.poll(() => page.locator(CARD).count()).toBeLessThan(all)
    await expect(page.locator(`${CARD} .pgal-name`).first()).toContainText(FIRST_NAME)

    await search.fill('zzzz no such palette')
    await expect(page.locator(CARD)).toHaveCount(0)
    const empty = page.getByRole('status').filter({ hasText: 'No palettes match that combination.' })
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('Try a broader search, or reset the mood and collection filters.')

    // Focus is somewhere else before Clear, so landing in the search is Clear's doing.
    await page.locator('body').click({ position: { x: 4, y: 4 } })
    await empty.getByRole('button').click()
    await expect(search).toBeFocused()
    await expect(search).toHaveValue('')
    await arrived(page)
  })

  test('choosing a mood narrows the grid and All brings every palette back', async ({ page }) => {
    watch(page, 'a Pro member filtering palettes by mood')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')
    await arrived(page)
    const all = await page.locator(CARD).count()

    // On desktop Mood is a labelled control that opens a menu (LibraryFilterGroup
    // `alwaysCollapsed`; the board's "Mood listbox"): the options exist only while it
    // is open, and choosing one closes it and returns focus to the trigger.
    const trigger = page.locator('.lbry-filtertrig')
    const mood = page.getByRole('group', { name: 'Filter palettes by mood' })
    const options = mood.getByRole('button')
    await expect(mood, 'the options are not on the page until Mood is opened').toHaveCount(0)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(options.first()).toHaveAccessibleName('All')
    await expect(options.first()).toHaveAttribute('aria-pressed', 'true')

    const pickName = await options.nth(1).innerText()
    await options.nth(1).click()
    await expect(mood, 'choosing a mood closes the menu').toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger, 'the trigger states the chosen mood').toContainText(pickName.trim())
    await expect.poll(() => page.locator(CARD).count()).toBeLessThan(all)

    await trigger.click()
    await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(options.first()).toHaveAttribute('aria-pressed', 'false')
    await options.first().click()
    await expect.poll(() => page.locator(CARD).count()).toBe(all)
  })
})

test.describe('palette library, phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('Mood opens as a sheet with 48px rows; Done and Escape both close it and return focus to the button', async ({ page }) => {
    watch(page, 'a Pro member on a phone choosing a mood')
    await signIn(page, { plan: 'pro' })
    await go(page, '/discover/palettes')
    await arrived(page)
    const all = await page.locator(CARD).count()

    const opener = page.locator('.lbry-filtersbtn')
    await opener.tap()
    const sheet = page.getByRole('dialog', { name: 'Mood' })
    await expect(sheet).toBeVisible()
    const heights = await sheet.locator('.lbry-filter').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights.length, 'a row for All and each mood').toBeGreaterThan(2)
    for (const h of heights) expect(h, 'every Mood row is at least 48px').toBeGreaterThanOrEqual(48)

    await sheet.locator('.lbry-filter').nth(1).tap()
    await expect(sheet.locator('.lbry-filter').nth(1)).toHaveAttribute('aria-pressed', 'true')
    await sheet.getByRole('button', { name: 'Done' }).tap()
    await expect(sheet).toHaveCount(0)
    await expect(opener).toBeFocused()
    await expect.poll(() => page.locator(CARD).count()).toBeLessThan(all)

    await opener.tap()
    await expect(page.getByRole('dialog', { name: 'Mood' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Mood' })).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
})
