// PALETTE BUILDER: SUGGEST AND EXPLORE ARE TWO DIALOGS, AND THE COLOUR SYSTEM
// OPTIONS EXPLAIN THEMSELVES.
//
// The old "Colour gallery" popup is split in two:
//   · Suggest (button "Suggest variations and brands"): a dialog named "Suggest"
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
//
// MUTATIONS (what to break to see each go red):
//   1. In PaletteBuilder.jsx openGallery('variations'), open on 'brands'; or drop onSuggestTabKey.
//   2. Close the panel in pickVariation; or drop aria-pressed from the .plb-sg-main button;
//      or make backToMine skip setColors.
//   3. Render the tablist for the exploring panel too.
//   4. Drop aria-describedby from the option row in MenuSelect.jsx, or render the desc empty.
//   5. Let the head wrap (flex-wrap: wrap on .plb-galpopup--suggest .plb-galpopup-head).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// A fixed five-colour board, so "the original hexes" is a known thing.
const BOARD = '/create/palette?c=14224A,249EAF,F2C14E,2563EB,C0392B'
const hexes = (page) => page.locator('.plb-col .plb-hex').allTextContents()

const suggestDialog = (page) => page.getByRole('dialog', { name: 'Suggest', exact: true })

async function openSuggest(page) {
  await go(page, BOARD)
  await expect(page.locator('.plb-col')).toHaveCount(5)
  await page.getByRole('button', { name: 'Suggest variations and brands', exact: true }).click()
  const dialog = suggestDialog(page)
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Suggest and Explore, on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Suggest opens on Variations, and the arrow keys move to Brands and back', async ({ page }) => {
    watch(page, 'a designer opening Suggest')
    const dialog = await openSuggest(page)
    const tabs = dialog.getByRole('tablist', { name: 'Suggest sections' })
    const variations = tabs.getByRole('tab', { name: 'Variations' })
    const brands = tabs.getByRole('tab', { name: 'Brands' })

    await expect(tabs.getByRole('tab')).toHaveCount(2)
    await expect(variations).toHaveAttribute('aria-selected', 'true')
    await expect(brands).toHaveAttribute('aria-selected', 'false')
    // The open tab's panel is the variations; the brand cards are not on the page.
    await expect(dialog.getByRole('tabpanel')).toHaveCount(1)
    await expect(dialog.getByRole('tabpanel')).toHaveAttribute('id', 'plb-sg-panel-variations')
    await expect(dialog.locator('.plb-sg-card--brand')).toHaveCount(0)
    await expect(dialog.locator('.plb-sg-card').first()).toBeVisible()

    // Focus is on the selected tab on open; ArrowRight moves selection and focus.
    await expect(variations).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(brands).toHaveAttribute('aria-selected', 'true')
    await expect(brands).toBeFocused()
    await expect(variations).toHaveAttribute('aria-selected', 'false')
    await expect(dialog.getByRole('tabpanel')).toHaveAttribute('id', 'plb-sg-panel-brands')
    await expect(dialog.locator('.plb-sg-card--brand').first()).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(variations).toHaveAttribute('aria-selected', 'true')
    await expect(variations).toBeFocused()
    await expect(dialog.locator('.plb-sg-card--brand')).toHaveCount(0)
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
    await expect(dialog.getByRole('tab', { name: 'Variations' })).toHaveAttribute('aria-selected', 'true')
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

  test('Explore has community palettes and no tabs', async ({ page }) => {
    watch(page, 'a designer opening Explore')
    await go(page, BOARD)
    await page.getByRole('button', { name: 'Explore palettes', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Explore palettes', exact: true })
    await expect(dialog).toBeVisible()
    // Positive control: the palettes are there, so "no tabs" is about a real panel.
    await expect(dialog.locator('.pgal-card').first()).toBeVisible()
    await expect(dialog.getByRole('tablist')).toHaveCount(0)
    await expect(dialog.getByRole('tab')).toHaveCount(0)
    await expect(dialog.getByRole('tabpanel')).toHaveCount(0)
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

test.describe('Suggest on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

  test('the Suggest sheet head is one row: the close button is level with the tabs', async ({ page }) => {
    watch(page, 'someone opening Suggest on a phone')
    const dialog = await openSuggest(page)
    const head = dialog.locator('.plb-galpopup-head')
    const tabs = dialog.getByRole('tablist', { name: 'Suggest sections' })
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
})
