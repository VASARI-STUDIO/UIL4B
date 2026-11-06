// HOME "TRY THE TOOLS": THE PALETTE FRAME KEEPS WHAT IS LOCKED, ITS LINK FOLLOWS THE COLOURS,
// ESCAPE GOES BACK TO THE TOOL'S NAME, AND A REFUSED ICON SERVICE SAYS SO.
//
//   1. Randomise with one colour locked: the locked hex stays, the others change.
//   2. The "Open in Palette Builder" href carries the five colours as ?c=. It changes after a
//      Randomise and after an Adjust slider move, and always lists five hexes.
//   3. Escape inside a tool puts focus on that tool's name in the pinned list.
//   4. With Iconify refusing every request, a search that is not held locally shows the error copy and
//      a Try again button.
//
//   5. Desktop: the Converter's Size row resizes the output and the output line reports the new size.
//   6. Desktop: the Fonts "Side by side" chip shows as pressed and swaps the list for the comparison.
//   7. Phone (390): Icons, Fonts and Converter each show a three-way choice with one control under it.
//
// MUTATIONS (each turns a test red):
//   - make `mix` in paletteLogic.js return the fresh colours for locked ones -> test 1.
//   - stop moved() / the href memo from reading `adjusted` in PaletteTool.jsx -> the slider check in test 2.
//   - drop the Escape branch in HomeTry.jsx onStageKey -> test 3.
//   - change the failed message in IconTool.jsx, or never set `failed` -> test 4.
//   - ignore `limit` in useTryMeasure.js -> test 5 (no arrow, size stays 1600).
//   - drop aria-pressed from the chip in FontTool.jsx -> test 6.
//   - render every phone control at once in IconTool.jsx's Well (drop the `mode ===` guards) -> test 7.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { refuseIconify } from './iconify-stub.js'

const HEXES = /^\/create\/palette\?c=([0-9A-F]{6},){4}[0-9A-F]{6}$/

/** Bring the section's tool `i` to the middle of the window through its name, as a visitor does. */
async function openTool(page, i) {
  await page.locator('#try').scrollIntoViewIfNeeded()
  await page.locator(`#ht-n-${i}`).click()
  await expect(page.locator(`#ht-n-${i}`)).toHaveAttribute('aria-current', 'true')
  await expect(page.locator(`#ht-s-${i}`)).toBeVisible()
}

const hexes = (page) => page.locator('#ht-s-0 .ht-pal-hex').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').split(' ').pop()))
const href = (page) => page.locator('#ht-s-0 .ht-go').getAttribute('href')

test.describe('home Try the tools', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Randomise keeps a locked colour and changes the rest', async ({ page }) => {
    watch(page, 'visitor')
    await go(page, '/')
    await openTool(page, 0)
    const before = await hexes(page)
    await page.locator('#ht-s-0 .ht-lock').first().click()
    await expect(page.locator('#ht-s-0 .ht-lock').first()).toHaveAttribute('aria-pressed', 'true')
    await page.locator('#ht-s-0 .ht-pal-tb .ht-btn').click()
    // Mutation: mix() keeps nothing -> the first hex changes. Skipping the rebuild -> the rest do not.
    await expect.poll(async () => (await hexes(page)).slice(1).join()).not.toBe(before.slice(1).join())
    const after = await hexes(page)
    expect(after[0]).toBe(before[0])
    expect(after.slice(1).every((h, i) => h !== before[i + 1])).toBe(true)
  })

  test('the Open link carries the five colours and follows a Randomise and a slider move', async ({ page }) => {
    watch(page, 'visitor')
    await go(page, '/')
    await openTool(page, 0)
    const start = await href(page)
    expect(start).toMatch(HEXES)

    await page.locator('#ht-s-0 .ht-pal-tb .ht-btn').click()
    await expect.poll(() => href(page)).not.toBe(start)
    const afterRandomise = await href(page)
    expect(afterRandomise).toMatch(HEXES)

    // Mutation: build the href from `base` instead of the adjusted colours and this stays put.
    await page.locator('#ht-adj-h').fill('30')
    await expect.poll(() => href(page)).not.toBe(afterRandomise)
    expect(await href(page)).toMatch(HEXES)
  })

  test('Escape inside a tool returns focus to its name', async ({ page }) => {
    watch(page, 'visitor')
    await go(page, '/')
    await openTool(page, 0)
    await page.locator('#ht-s-0 .ht-lock').nth(1).focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('#ht-n-0')).toBeFocused()

    await openTool(page, 1)
    await page.locator('#ht-s-1 .ht-input').focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('#ht-n-1')).toBeFocused()
  })

  test('with Iconify refusing, a search the frame does not hold shows the error copy', async ({ page }) => {
    watch(page, 'visitor')
    await refuseIconify(page)
    await go(page, '/')
    await openTool(page, 1)
    await page.locator('#ht-s-1 .ht-input').fill('zebra')
    // Mutation: change the message, or never set `failed` in IconTool.jsx, and this times out.
    await expect(page.locator('#ht-s-1 .ht-msg')).toHaveText('Icons didn’t load. Check your connection, then try again.')
    await expect(page.locator('#ht-s-1').getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('the Converter Size row resizes the output and the output line says so', async ({ page }) => {
    watch(page, 'visitor')
    await go(page, '/')
    await openTool(page, 3)
    const line = page.locator('#ht-s-3 .ht-cv-line')
    await expect(line).toHaveText(/^Output WebP, quality 90, \d+×\d+ px$/, { timeout: 15000 })
    await page.locator('#ht-s-3 .ht-cv-set').getByRole('radio', { name: '640 px' }).click()
    // Mutation: pass no limit to the encode and the line never gains the arrow.
    await expect(line).toHaveText(/^Output WebP, quality 90, \d+×\d+ → 640×\d+ px$/, { timeout: 15000 })
  })

  test('the Fonts Side by side chip is pressed when the comparison is showing', async ({ page }) => {
    watch(page, 'visitor')
    await go(page, '/')
    await openTool(page, 2)
    const chip = page.locator('#ht-s-2 .ht-fn-tray .ht-chip')
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('#ht-s-2 .ht-fn-list')).toBeVisible()
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#ht-s-2 .ht-fn-cmp')).toBeVisible()
    await expect(page.locator('#ht-s-2 .ht-fn-list')).toHaveCount(0)
  })
})

test.describe('home Try the tools on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Icons, Fonts and Converter keep one control under a three-way choice', async ({ page }) => {
    watch(page, 'visitor')
    await go(page, '/')

    await openTool(page, 1)
    const icons = page.locator('#ht-s-1')
    await expect(icons.locator('.ht-ab').getByRole('radio')).toHaveText(['Search', 'Weight', 'Colour'])
    await expect(icons.locator('.ht-ctl .ht-pin')).toBeVisible()
    await expect(icons.locator('.ht-ic-cols')).toBeHidden()
    await icons.locator('.ht-ab').getByRole('radio', { name: 'Weight' }).click()
    await expect(icons.locator('.ht-ctl .ht-pin')).toHaveCount(0)
    await icons.locator('.ht-ctl').getByRole('radio', { name: 'Bold' }).click()
    // Mutation: render every control at once in the well and the search field is still there above.
    await expect(icons.locator('.ht-ic-meta')).toHaveText('Phosphor · Bold')

    await openTool(page, 2)
    const fonts = page.locator('#ht-s-2')
    await expect(fonts.locator('.ht-ab').getByRole('radio')).toHaveText(['Words', 'Size', 'Side by side'])
    await fonts.locator('.ht-ctl .ht-pin').fill('Hello there')
    await expect(fonts.locator('.ht-fn-spec').first()).toHaveText('Hello there')
    await fonts.locator('.ht-ab').getByRole('radio', { name: 'Side by side' }).click()
    await fonts.locator('.ht-ctl .ht-chip').click()
    await expect(fonts.locator('.ht-fn-cmp')).toBeVisible()

    await openTool(page, 3)
    const conv = page.locator('#ht-s-3')
    await expect(conv.locator('.ht-ab').getByRole('radio')).toHaveText(['Format', 'Quality', 'Size'])
    await expect(conv.locator('.ht-cv-set')).toBeHidden()
    await conv.locator('.ht-ctl').getByRole('radio', { name: 'PNG' }).click()
    await conv.locator('.ht-ab').getByRole('radio', { name: 'Quality' }).click()
    await expect(conv.locator('.ht-ctl').getByRole('radio', { name: '25' })).toBeDisabled()
  })
})
