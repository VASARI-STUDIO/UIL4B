// PALETTE BUILDER: SUGGEST AND EXPLORE ARE TWO DIALOGS, AND THE COLOUR SYSTEM
// OPTIONS EXPLAIN THEMSELVES.
//
// The old "Colour gallery" popup is split in two:
//   · Suggest (button "Suggest variations"): a dialog named "Suggest"
//     with a Variations tab and a Brands tab.
//   · Explore (button "Explore palettes"): a dialog named "Explore palettes" with
//     community palettes only, and no tabs.
//
// What this pins:
//   1. Suggest opens on Variations; the arrow keys move to Brands and back.
//   2. Applying a variation keeps the panel open and marks the card pressed;
//      "Back to my palette" puts the original hexes back.
//   3. Explore has no tabs.
//   4. Every colour system option carries a description, linked by
//      aria-describedby to text that is not empty.
//   5. At 390 on a touch screen the Suggest sheet's head is one row: the close
//      button sits on the same row as the tabs.
//   6. An Explore import after an apply ends the Suggest session: Back is off,
//      nothing is ticked, and unticking the Explore card returns to the user's
//      own palette (and own colour system), not to the variation or brand.
//   7. A real colour edit after an apply turns Back off and rebuilds the
//      variations from the edited board; Undo does the same and restores the
//      pre-apply hexes.
//   8. Focus goes to the selected tab after Back; the "?" is a toggle with a
//      visible explanation; Tab order is tabs, Back, Close; aria-controls is on
//      the selected tab only.
//   9. Toolbar: Undo and Redo share the row at 768 with no keycap; the divider is
//      on the row at 1440.
//  10. At 390 on touch the first card sits 16px in and the next one peeks. At 1440
//      the body carries data-more until it is scrolled to the end.
//
// MUTATIONS (what to break to see each go red):
//   1. In PaletteBuilder.jsx openGallery('variations'), open on 'brands'; or drop onSuggestTabKey.
//   2. Close the panel in pickVariation; or drop aria-pressed from the .plb-sg-main button;
//      or make backToMine skip setColors.
//   3. Render the tablist for the exploring panel too.
//   4. Drop aria-describedby from the option row in MenuSelect.jsx, or render the desc empty.
//   5. Let the head wrap (flex-wrap: wrap on .plb-galpopup--suggest .plb-galpopup-head).
//   6. In importGalleryPalette take `original` from the live board instead of the
//      Suggest snapshot; or drop `harmony: mine.harmony` from it (brand case).
//   7. Remove setPanelApplied(null) from the [colors, adjust] invalidation effect
//      (Back stays on, Undo test too); or remove setVarBase(null) (stale list).
//   8. Remove the focus() call at the end of backToMine; hidden={!open} to
//      hidden={false} on #plb-sg-score-help; aria-controls on every tab.
//   9. Delete the `.tl-kbd { display: none }` rule below 1024; give the divider
//      priority 0.
//  10. Set the phone card width to 100%; drop ref={scrollCue} from a body.
import { test, expect } from './base.js'
import { chooseMenuOption, go, watch } from './helpers.js'

// A fixed five-colour board, so "the original hexes" is a known thing.
const BOARD = '/create/palette?c=14224A,249EAF,F2C14E,2563EB,C0392B'
const hexes = (page) => page.locator('.plb-col .plb-hex').allTextContents()

// Every card in the dialog as its name and the colours painted on its strip, so
// one list can be compared with another.
// The list fills in a moment after the dialog opens, so it waits for cards first.
async function cardList(dialog) {
  await expect(dialog.locator('.plb-sg-card').nth(3), 'the list has cards').toBeVisible()
  return dialog.locator('.plb-sg-card').evaluateAll((cards) => cards.map((card) => {
    const cells = [...card.querySelectorAll('.plb-sg-cell')].map((cell) => cell.style.getPropertyValue('--plb-rc').trim().toUpperCase())
    return `${card.querySelector('.plb-sg-name')?.textContent || ''}: ${cells.join(' ')}`
  }))
}

const suggestDialog = (page) => page.getByRole('dialog', { name: 'Suggest', exact: true })

const suggestButton = (page) => page.getByRole('button', { name: 'Suggest variations', exact: true })
const exploreDialog = (page) => page.getByRole('dialog', { name: 'Explore palettes and brands', exact: true })
const systemSelect = (page) => page.getByRole('button', { name: /^Colour system/ })

async function openSuggest(page, url = BOARD) {
  await go(page, url)
  await expect(page.locator('.plb-col')).toHaveCount(5)
  await suggestButton(page).click()
  const dialog = suggestDialog(page)
  await expect(dialog).toBeVisible()
  return dialog
}

// Close whichever dialog is open and open Suggest again, on the tab asked for.
async function reopenSuggest(page, tab = 'Variations') {
  await page.keyboard.press('Escape')
  await expect(suggestDialog(page)).toHaveCount(0)
  await suggestButton(page).click()
  const dialog = suggestDialog(page)
  await expect(dialog).toBeVisible()
  if (tab !== 'Variations') await dialog.getByRole('tab', { name: tab }).click()
  return dialog
}

// A free variation: a locked one has no aria-pressed and opens Pro plans.
const freeVariation = (dialog) => dialog.locator('.plb-sg-card:not(.plb-sg-card--locked) .plb-sg-main[aria-pressed]').first()

// Open Explore and press the first stripe of the first card (or of the ticked
// one), which imports it or, when ticked, puts the board back.
async function pressExploreCard(page, { ticked = false } = {}) {
  await page.getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
  const dialog = exploreDialog(page)
  await expect(dialog).toBeVisible()
  const card = ticked ? dialog.locator('.pgal-card:has(.pgal-tick)') : dialog.locator('.pgal-card').first()
  await expect(card).toHaveCount(1)
  await card.locator('.pgal-stripe').first().click()
  return { dialog, card }
}

// Swap the second and third colours from the board, the way a person does: the
// quick tools appear on hover.
async function swapSecondAndThird(page) {
  const before = (await hexes(page)).join()
  const col = page.locator('.plb-col').nth(1)
  await col.hover()
  await col.getByRole('button', { name: /^Choose a direction to swap / }).click()
  await page.getByRole('menu', { name: /^Swap / }).getByRole('menuitem', { name: /Swap right/ }).click()
  await expect(page.getByRole('menu', { name: /^Swap / })).toHaveCount(0)
  await expect.poll(async () => (await hexes(page)).join(), { message: 'the swap moved two colours' }).not.toBe(before)
}

test.describe('Suggest and Explore, on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Suggest holds variations only: no tabs, no brand cards', async ({ page }) => {
    watch(page, 'a designer opening Suggest')
    const dialog = await openSuggest(page)
    await expect(dialog.locator('.plb-sg-card').first()).toBeVisible()
    await expect(dialog.getByRole('tablist')).toHaveCount(0)
    await expect(dialog.getByRole('tab')).toHaveCount(0)
    await expect(dialog.locator('.plb-sg-card--brand')).toHaveCount(0)
    await expect(dialog.locator('.plb-sg-main[aria-pressed]').first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('applying a variation keeps the panel open, marks the card pressed, and Back to my palette restores the hexes', async ({ page }) => {
    watch(page, 'a designer trying a variation and then going back')
    const dialog = await openSuggest(page)
    const original = await hexes(page)
    expect(original, 'the board is the fixed five-colour one').toEqual(['#14224A', '#249EAF', '#F2C14E', '#2563EB', '#C0392B'])

    const back = dialog.getByRole('button', { name: 'Back to my palette' })
    await expect(back, 'nothing applied yet, so there is nothing to go back to').toBeDisabled()

    // A free variation: a locked one has no aria-pressed and opens Pro plans.
    const card = dialog.locator('.plb-sg-card:not(.plb-sg-card--locked) .plb-sg-main[aria-pressed]').first()
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await card.click()

    await expect(card, 'the card is marked as applied').toHaveAttribute('aria-pressed', 'true')
    await expect(dialog, 'the panel stays open after applying').toBeVisible()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'the board took the variation' }).not.toBe(original.join())
    await expect(back).toBeEnabled()
    // Exactly one card is pressed.
    await expect(dialog.locator('.plb-sg-main[aria-pressed="true"]')).toHaveCount(1)

    await back.click()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'the original hexes are back' }).toBe(original.join())
    await expect(dialog, 'the panel stays open after going back').toBeVisible()
    await expect(dialog.locator('.plb-sg-main[aria-pressed="true"]')).toHaveCount(0)
    await expect(back).toBeDisabled()
  })

  test('Explore has community palettes on a Palettes tab, and a Brands tab', async ({ page }) => {
    watch(page, 'a designer opening Explore')
    await go(page, BOARD)
    await page.getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Explore palettes and brands', exact: true })
    await expect(dialog).toBeVisible()
    // Positive control: the palettes are there, so "no tabs" is about a real panel.
    await expect(dialog.locator('.pgal-card').first()).toBeVisible()
    await expect(dialog.getByRole('tab')).toHaveText(['Palettes', 'Brands'])
    await expect(dialog.getByRole('tabpanel')).toHaveCount(1)
    await expect(dialog.locator('.plb-sg-card')).toHaveCount(0)
    // The two are separate dialogs: Suggest is not open behind it.
    await expect(suggestDialog(page)).toHaveCount(0)
  })

  test('every colour system option has a description the screen reader gets', async ({ page }) => {
    watch(page, 'a screen-reader user choosing a colour system')
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    await page.getByRole('button', { name: /^Colour system/ }).click()
    const list = page.locator('.menu-select-list[role="listbox"]')
    await expect(list).toBeVisible()

    const options = list.getByRole('option')
    const count = await options.count()
    expect(count, 'the list has the harmony options').toBeGreaterThan(3)

    const report = await options.evaluateAll((rows) => rows.map((row) => {
      const ids = (row.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
      const text = ids.map((id) => document.getElementById(id)?.textContent?.trim() || '').join(' ').trim()
      return { value: row.dataset.value, ids: ids.length, text }
    }))
    const bad = report.filter((r) => !r.ids || !r.text)
    expect(bad, `options with no description linked by aria-describedby: ${JSON.stringify(bad)}`).toEqual([])
    // A description is a sentence, not a repeat of the label.
    for (const r of report) expect(r.text.length, `${r.value}: description is too short to explain anything`).toBeGreaterThan(10)
    // The description is read once, as the description: the option's name
    // must not also contain it.
    for (let i = 0; i < count; i++) {
      const row = options.nth(i)
      const desc = report[i].text
      const name = await row.evaluate((el) => el.getAttribute('aria-label') || el.textContent || '')
      expect(name.includes(desc), `${report[i].value}: the description is also in the option's name`).toBe(false)
    }
  })
})

test.describe('The Suggest session, on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('an Explore import after a variation ends the session, and unticking returns to the user\'s own hexes', async ({ page }) => {
    watch(page, 'a designer trying a variation, then a community palette, then backing out of it')
    const dialog = await openSuggest(page)
    const original = await hexes(page)
    await freeVariation(dialog).click()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'the variation is on the board' }).not.toBe(original.join())
    const withVariation = await hexes(page)
    await expect(dialog.getByRole('button', { name: 'Back to my palette' })).toBeEnabled()

    const { card } = await pressExploreCard(page)
    await expect(card.locator('.pgal-tick'), 'the Explore card is ticked').toBeVisible()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'the Explore palette is on the board' }).not.toBe(withVariation.join())

    // Back in Suggest the session is over: nothing to go back to, nothing ticked.
    const again = await reopenSuggest(page)
    await expect(again.getByRole('button', { name: 'Back to my palette' }), 'the import ended the Suggest session').toBeDisabled()
    await expect(again.locator('.plb-sg-main[aria-pressed="true"]'), 'no variation is ticked').toHaveCount(0)

    // Unticking the Explore card puts back the user's palette, not the variation's.
    await page.keyboard.press('Escape')
    await pressExploreCard(page, { ticked: true })
    await expect.poll(async () => (await hexes(page)).join(), { message: 'unticking restored the hexes the user had' }).toBe(original.join())
    await expect(exploreDialog(page).locator('.pgal-tick'), 'the tick is gone').toHaveCount(0)
  })

  test('an Explore import after a brand: unticking returns to the user\'s own hexes and colour system', async ({ page }) => {
    watch(page, 'a designer on a free system trying a brand, then a community palette, then backing out of it')
    await go(page, BOARD)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    // Start on a free system that is not the one a brand collapses to for a free
    // viewer ('auto'), so a system that came back is a system that was restored.
    await chooseMenuOption(page, systemSelect(page), 'monochromatic')
    await expect(systemSelect(page)).toContainText(/Monochromatic/i)
    await expect(page.locator('.plb-col')).toHaveCount(5)
    const original = await hexes(page)
    // The brand is applied from Explore's Brands tab.
    await page.getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
    const dialog = exploreDialog(page)
    await expect(dialog).toBeVisible()
    await dialog.getByRole('tab', { name: 'Brands' }).click()
    const brand = dialog.locator('.plb-sg-card--brand:not(.plb-sg-card--locked) .plb-sg-main[aria-pressed]').first()
    await brand.click()
    await expect(brand).toHaveAttribute('aria-pressed', 'true')
    await expect(systemSelect(page), 'the brand moved the system off Monochromatic').not.toContainText(/Monochromatic/i)
    const withBrand = await hexes(page)
    expect(withBrand.join()).not.toBe(original.join())

    // Pressing the ticked brand again is Explore's own undo: the user's hexes and system are back.
    await brand.click()
    await expect(brand).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => (await hexes(page)).join(), { message: 'untick restored the user\'s hexes' }).toBe(original.join())
    await expect(systemSelect(page), 'and the user\'s colour system').toContainText(/Monochromatic/i)

    // A brand, then a community palette, then unticking that one: still the user's own board.
    await brand.click()
    await expect(brand).toHaveAttribute('aria-pressed', 'true')
    await dialog.getByRole('tab', { name: 'Palettes' }).click()
    await dialog.locator('.pgal-card').first().locator('.pgal-stripe').first().click()
    await expect.poll(async () => (await hexes(page)).join()).not.toBe(withBrand.join())
    await dialog.locator('.pgal-card:has(.pgal-tick)').locator('.pgal-stripe').first().click()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'unticking restored the user\'s hexes' }).toBe(original.join())
    await expect(systemSelect(page), 'and the user\'s colour system').toContainText(/Monochromatic/i)
    await dialog.getByRole('tab', { name: 'Brands' }).click()
    await expect(dialog.locator('.plb-sg-main[aria-pressed="true"]'), 'no brand is ticked').toHaveCount(0)
  })

  test('a brand from Explore after a variation ends the Suggest session', async ({ page }) => {
    watch(page, 'a designer trying a variation, then a brand')
    const dialog = await openSuggest(page)
    await freeVariation(dialog).click()
    await expect(dialog.getByRole('button', { name: 'Back to my palette' })).toBeEnabled()
    await page.keyboard.press('Escape')
    await expect(suggestDialog(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
    const explore = exploreDialog(page)
    await explore.getByRole('tab', { name: 'Brands' }).click()
    await explore.locator('.plb-sg-card--brand:not(.plb-sg-card--locked) .plb-sg-main[aria-pressed]').first().click()

    const again = await reopenSuggest(page)
    await expect(again.getByRole('button', { name: 'Back to my palette' }), 'the brand ended the Suggest session').toBeDisabled()
    await expect(again.locator('.plb-sg-main[aria-pressed="true"]'), 'no variation is ticked').toHaveCount(0)
  })

  test('a real colour edit after an apply turns Back off', async ({ page }) => {
    watch(page, 'a designer editing a colour after trying a variation')
    const dialog = await openSuggest(page)
    await freeVariation(dialog).click()
    await expect(dialog.getByRole('button', { name: 'Back to my palette' })).toBeEnabled()

    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(suggestDialog(page)).toHaveCount(0)
    await swapSecondAndThird(page)

    await suggestButton(page).click()
    const again = suggestDialog(page)
    await expect(again).toBeVisible()
    await expect(again.getByRole('button', { name: 'Back to my palette' }), 'the board is the user\'s again, so there is nothing to go back to').toBeDisabled()
    await expect(again.locator('.plb-sg-main[aria-pressed="true"]'), 'and no card is ticked').toHaveCount(0)
  })

  test('after a real colour edit, reopening Variations builds the list from the edited board', async ({ page, context }) => {
    watch(page, 'a designer editing a colour after trying a variation, then asking for variations again')
    const dialog = await openSuggest(page)
    await freeVariation(dialog).click()
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await swapSecondAndThird(page)
    const edited = (await hexes(page)).map((h) => h.replace('#', ''))

    await suggestButton(page).click()
    const again = suggestDialog(page)
    await expect(again).toBeVisible()
    const got = await cardList(again)
    expect(got.length, 'the list has cards').toBeGreaterThan(3)

    // The expected list is the one a fresh visit to the edited board gets.
    const other = await context.newPage()
    await other.setViewportSize({ width: 1440, height: 900 })
    const fresh = await openSuggest(other, `/create/palette?c=${edited.join(',')}`)
    expect(await cardList(fresh), 'the list was built from the edited board').toEqual(got)
    // And it is not the list the original board gets.
    const base = await context.newPage()
    await base.setViewportSize({ width: 1440, height: 900 })
    const plain = await openSuggest(base)
    expect(await cardList(plain), 'and it is not the original board\'s list').not.toEqual(got)
  })

  test('Undo after an apply restores the hexes from before it, and clears Back and the tick', async ({ page }) => {
    watch(page, 'a designer undoing a variation')
    const dialog = await openSuggest(page)
    const original = await hexes(page)
    // The board is written to history after a short pause, so wait until the
    // original is in it; applying sooner would leave Undo nothing to go back to.
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vs-palette-history') || '[]').length), { message: 'the original board is in history' }).toBeGreaterThan(0)
    await freeVariation(dialog).click()
    await expect.poll(async () => (await hexes(page)).join()).not.toBe(original.join())

    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'Undo put the pre-apply hexes back' }).toBe(original.join())

    const again = await reopenSuggest(page)
    await expect(again.getByRole('button', { name: 'Back to my palette' })).toBeDisabled()
    await expect(again.locator('.plb-sg-main[aria-pressed="true"]')).toHaveCount(0)
  })

  test('focus is on the card that was applied after Back to my palette', async ({ page }) => {
    watch(page, 'a keyboard user pressing Back to my palette')
    const dialog = await openSuggest(page)
    const back = dialog.getByRole('button', { name: 'Back to my palette' })

    const card = freeVariation(dialog)
    await card.click()
    await back.focus()
    await page.keyboard.press('Enter')
    await expect(back).toBeDisabled()
    await expect(card, 'focus did not fall to the page when Back turned itself off').toBeFocused()
  })

  test('pressing the applied card again puts the palette back, keeps focus on it and says so', async ({ page }) => {
    watch(page, 'a designer toggling a variation off again')
    const dialog = await openSuggest(page)
    const original = await hexes(page)
    const card = freeVariation(dialog)
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await hexes(page)).join(), { message: 'the variation is on the board' }).not.toBe(original.join())

    await card.click()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'the original hexes are back' }).toBe(original.join())
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await expect(card, 'focus stays on the card').toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Back to my palette' })).toBeDisabled()
    await expect(page.locator('p.sr-only[aria-live="polite"]')).toHaveText('Back to your palette')
    await expect(dialog, 'the panel stays open').toBeVisible()

    // Another card after that still applies, and Back lands on the original, not on the first card.
    await card.click()
    const second = dialog.locator('.plb-sg-card:not(.plb-sg-card--locked) .plb-sg-main[aria-pressed]').nth(1)
    await second.click()
    await expect(second).toHaveAttribute('aria-pressed', 'true')
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await second.click()
    await expect.poll(async () => (await hexes(page)).join(), { message: 'toggling the second card off returns to the original, not the first card' }).toBe(original.join())
  })

  test('the "?" toggles a visible explanation of the balance score', async ({ page }) => {
    watch(page, 'someone wondering what the balance score is')
    const dialog = await openSuggest(page)
    await freeVariation(dialog).click()
    const help = dialog.locator('#plb-sg-score-help')
    const info = dialog.getByRole('button', { name: 'What the balance score measures' })
    await expect(info).toBeVisible()

    await expect(info).toHaveAttribute('aria-expanded', 'false')
    await expect(help, 'the explanation starts hidden').toBeHidden()
    await info.click()
    await expect(info).toHaveAttribute('aria-expanded', 'true')
    await expect(help).toBeVisible()
    await expect(help).toContainText(/tone range/i)
    await info.click()
    await expect(info).toHaveAttribute('aria-expanded', 'false')
    await expect(help).toBeHidden()
  })

  test('Suggest has no tabs; Tab goes Back, then Close', async ({ page }) => {
    watch(page, 'a keyboard user moving through the Suggest head')
    const dialog = await openSuggest(page)
    await expect(dialog.getByRole('tablist')).toHaveCount(0)
    // Back has to be enabled to be a tab stop at all.
    await freeVariation(dialog).click()
    const back = dialog.getByRole('button', { name: 'Back to my palette' })
    await expect(back).toBeEnabled()

    await back.focus()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Close', exact: true }), 'Tab from Back lands on Close').toBeFocused()
  })

  test('Explore tabs: Palettes is selected on open, aria-controls is on the selected tab only, and the arrow keys move between them', async ({ page }) => {
    watch(page, 'a keyboard user moving through the Explore head')
    await go(page, BOARD)
    await page.getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
    const dialog = exploreDialog(page)
    await expect(dialog).toBeVisible()
    const tabs = dialog.getByRole('tablist', { name: 'Explore sections' })
    const palettes = tabs.getByRole('tab', { name: 'Palettes' })
    const brands = tabs.getByRole('tab', { name: 'Brands' })
    await expect(tabs.getByRole('tab')).toHaveCount(2)
    await expect(palettes).toHaveAttribute('aria-selected', 'true')
    await expect(palettes, 'focus is on the selected tab on open').toBeFocused()
    await expect(palettes).toHaveAttribute('aria-controls', 'plb-ex-panel-community')
    await expect(brands, 'a tab that is not selected controls a panel that is not there').not.toHaveAttribute('aria-controls', /.+/)
    await expect(dialog.getByRole('tabpanel')).toHaveAttribute('id', 'plb-ex-panel-community')
    await expect(dialog.locator('.pgal-card').first()).toBeVisible()
    await expect(dialog.locator('.plb-sg-card--brand')).toHaveCount(0)

    // Only the selected tab is a tab stop: Tab goes on to Close.
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
    await palettes.focus()

    await page.keyboard.press('ArrowRight')
    await expect(brands).toHaveAttribute('aria-selected', 'true')
    await expect(brands).toBeFocused()
    await expect(brands).toHaveAttribute('aria-controls', 'plb-ex-panel-brands')
    await expect(palettes).not.toHaveAttribute('aria-controls', /.+/)
    await expect(dialog.getByRole('tabpanel')).toHaveAttribute('id', 'plb-ex-panel-brands')
    await expect(dialog.locator('.plb-sg-card--brand').first()).toBeVisible()
    await expect(dialog.locator('.pgal-card')).toHaveCount(0)

    await page.keyboard.press('ArrowLeft')
    await expect(palettes).toHaveAttribute('aria-selected', 'true')
    await expect(palettes).toBeFocused()
    await page.keyboard.press('End')
    await expect(brands).toBeFocused()
    await page.keyboard.press('Home')
    await expect(palettes).toBeFocused()
  })

  test('the divider is on the toolbar row, and so is the keycap that the narrower widths drop', async ({ page }) => {
    watch(page, 'a designer looking at the toolbar')
    await go(page, BOARD)
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)
    await expect(bar.locator('.tl-divider')).toBeVisible()
    // Positive control for the 768 test: above 1024 the keycap is shown.
    await expect(bar.locator('.tl-kbd').first()).toBeVisible()
  })

  test('the Suggest body fades while there is more to scroll, and stops at the end', async ({ page }) => {
    watch(page, 'someone scrolling the Suggest list')
    const dialog = await openSuggest(page)
    const body = dialog.locator('.plb-galpopup-body')
    const room = () => body.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(await room(), 'positive control: the list is taller than its box').toBeGreaterThan(40)
    await expect(body).toHaveAttribute('data-more', 'true')

    await body.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect(body).toHaveAttribute('data-more', 'false')
    await body.evaluate((el) => { el.scrollTop = 0 })
    await expect(body, 'and it comes back when scrolled up').toHaveAttribute('data-more', 'true')
  })
})

test.describe('The toolbar row at 768', () => {
  test.use({ viewport: { width: 768, height: 900 } })

  test('Undo and Redo are both on the row, and no keycap is showing', async ({ page }) => {
    watch(page, 'someone on a tablet')
    await go(page, BOARD)
    const bar = page.locator('.plb [data-tool-toolbar]')
    await expect(bar).not.toHaveClass(/is-measuring/)
    await expect(bar.getByRole('button', { name: 'Undo', exact: true })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Redo', exact: true })).toBeVisible()
    const shown = await bar.locator('.tl-kbd').evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none').length)
    expect(shown, 'no .tl-kbd keycap is visible below 1024').toBe(0)
  })
})

test.describe('Suggest on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

  test('the Explore sheet head is one row: the tabs and the close button are level', async ({ page }) => {
    watch(page, 'someone opening Explore on a phone')
    await go(page, BOARD)
    await page.getByRole('button', { name: 'Extra tools' }).click()
    await page.getByRole('dialog', { name: 'Extra tools' }).getByRole('button', { name: 'Explore palettes and brands', exact: true }).click()
    const dialog = exploreDialog(page)
    await expect(dialog).toBeVisible()
    const tabs = dialog.getByRole('tablist', { name: 'Explore sections' })
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    await expect(tabs).toBeVisible()
    const top = (loc) => loc.evaluate((el) => el.getBoundingClientRect().top)
    await expect.poll(async () => { const a = await top(close); await page.waitForTimeout(120); return a === await top(close) }, { message: 'the sheet has settled' }).toBe(true)
    const [t, c, h] = [await tabs.boundingBox(), await close.boundingBox(), await dialog.locator('.plb-galpopup-head').boundingBox()]
    expect(Math.abs(c.y - t.y), `close top ${c.y} vs tabs top ${t.y}: the head is two rows`).toBeLessThanOrEqual(4)
    expect(h.height, `the head is ${h.height}px tall: it wrapped onto a second row`).toBeLessThan(c.height + 24)
  })
  test('the Suggest sheet head is one row: the close button is level with the title', async ({ page }) => {
    watch(page, 'someone opening Suggest on a phone')
    const dialog = await openSuggest(page)
    const head = dialog.locator('.plb-galpopup-head')
    const tabs = dialog.locator('.plb-menu-title')
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    await expect(tabs).toBeVisible()
    await expect(close).toBeVisible()

    // Wait for the sheet to stop sliding in before measuring.
    const top = (loc) => loc.evaluate((el) => el.getBoundingClientRect().top)
    await expect.poll(async () => { const a = await top(close); await page.waitForTimeout(120); return a === await top(close) }, { message: 'the sheet has settled' }).toBe(true)

    const [t, c, h] = [await tabs.boundingBox(), await close.boundingBox(), await head.boundingBox()]
    expect(Math.abs(c.y - t.y), `close top ${c.y} vs tabs top ${t.y}: the head is two rows`).toBeLessThanOrEqual(4)
    // One row: the head is no taller than the close button plus its padding.
    expect(h.height, `the head is ${h.height}px tall: it wrapped onto a second row`).toBeLessThan(c.height + 24)
    // And nothing runs past the screen.
    expect(c.x + c.width, 'the close button is on screen').toBeLessThanOrEqual(390 + 1)
  })
  test('the first card sits 16px in and the second one peeks', async ({ page }) => {
    watch(page, 'someone opening Suggest on a phone')
    const dialog = await openSuggest(page)
    const cards = dialog.locator('.plb-sg-card')
    await expect(cards.nth(1)).toBeVisible()
    // Wait for the sheet to stop sliding in before measuring.
    const left = (i) => cards.nth(i).evaluate((el) => el.getBoundingClientRect().left)
    await expect.poll(async () => { const a = await left(0); await page.waitForTimeout(120); return a === await left(0) }, { message: 'the sheet has settled' }).toBe(true)

    const first = await left(0)
    const second = await left(1)
    // A card is clamp(104px, 28vw, 120px) wide: 109px at 390, so the row is
    // narrow enough for the next card to show.
    const width = await cards.first().evaluate((el) => el.getBoundingClientRect().width)
    expect(Math.abs(width - 0.28 * 390), `a card is ${width}px wide, not about 109`).toBeLessThanOrEqual(2)
    expect(Math.abs(first - 16), `the first card's left edge is ${first}px, not about 16`).toBeLessThanOrEqual(2)
    expect(second, `the second card starts at ${second}px: it does not peek in from the right`).toBeLessThan(390 - 16)
    expect(second, 'and it is a different card, to the right of the first').toBeGreaterThan(first + 80)
  })
})
