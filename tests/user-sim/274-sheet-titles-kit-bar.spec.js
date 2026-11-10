// SPEC 274: PHONE DROPDOWN SHEETS HAVE A TITLE AND A CLOSE; THE KIT BAR IS 60px.
//
// On a phone a styled dropdown opens as a bottom sheet. The sheet names itself
// with the dropdown's own label and carries a 44px Close, and Escape, the dim
// area and the Close all give focus back to the trigger. The brand kit
// walkthrough bar is one 60px row on a phone and on a tablet (the tab bar hidden
// on a phone), with the steps and help behind one tap on a phone.
//
// MUTATIONS (each should turn the named test red):
//   - delete the `phone && <div ... menu-select-sheet-head>` block in
//     MenuSelect.jsx: "a phone dropdown sheet is titled" fails at 390;
//   - render the header on every width: "a tablet dropdown stays a popover with
//     no header" fails at 768;
//   - take `min-height:44px` off `.menu-select-sheet-close` in global.css, or
//     the `padding-top:76px` off `.menu-select-list--titled`: "a phone dropdown
//     sheet is titled ..." fails (a short Close, or the first option behind the header);
//   - drop `data-pop-scrim` from the header: closing with Close fails, because
//     the press counts as outside and focus does not return to the trigger.
//
// The kit bar tests (cards 881e31abe7 and 6da96d62e0) are not written yet; see
// the lane report.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/type-scale'
const NAME = 'Scale ratio'

const head = (page) => page.locator('.menu-select-sheet-head')
const trigger = (page) => page.locator('#tsc-ratio')

async function openPage(page) {
  await go(page, ROUTE)
  // On a phone the ratio menu is in the settings sheet the dock opens.
  if (page.viewportSize().width < 768) await page.locator('.tl-dock .tsc-dock-ratio').click()
  await expect(trigger(page)).toBeVisible()
}

test.describe('Phone dropdown sheets', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a phone dropdown sheet is titled with the dropdown\'s own label and has a 44px Close', async ({ page }) => {
    watch(page, 'phone user opening the Scale ratio dropdown')
    await openPage(page)
    await trigger(page).click()
    const list = page.getByRole('listbox', { name: NAME })
    await expect(list).toBeVisible()

    // The title is the listbox's own name, drawn in full and inside the sheet.
    await expect(head(page).locator('.menu-select-sheet-title')).toHaveText(NAME)
    const geo = await page.evaluate(() => {
      const h = document.querySelector('.menu-select-sheet-head').getBoundingClientRect()
      const l = document.querySelector('.menu-select-list').getBoundingClientRect()
      const t = document.querySelector('.menu-select-sheet-title')
      const c = document.querySelector('.menu-select-sheet-close').getBoundingClientRect()
      // The list opens scrolled to the chosen row; that row, and the first row
      // once scrolled back to the top, must sit below the header.
      const listEl = document.querySelector('.menu-select-list')
      const chosen = listEl.querySelector('[role="option"][aria-selected="true"]').getBoundingClientRect()
      listEl.scrollTop = 0
      const firstRow = listEl.querySelector('[role="option"]').getBoundingClientRect()
      return {
        headInsideSheet: h.top >= l.top && h.bottom <= l.bottom && h.left >= l.left && h.right <= l.right,
        titleClipped: t.scrollWidth > t.clientWidth,
        closeW: c.width,
        closeH: c.height,
        closeRightGap: Math.round(h.right - c.right),
        rowsBelowHead: firstRow.top >= h.bottom - 0.5,
        chosenBelowHead: chosen.top >= h.bottom - 0.5,
      }
    })
    expect(geo.headInsideSheet, 'the header sits inside the sheet').toBe(true)
    expect(geo.titleClipped, 'the title is cut off').toBe(false)
    expect(geo.closeH, 'the Close is 44px tall').toBeGreaterThanOrEqual(44)
    expect(geo.closeW, 'the Close is 44px wide').toBeGreaterThanOrEqual(44)
    expect(geo.closeRightGap, 'the Close sits at the trailing edge').toBeLessThanOrEqual(20)
    expect(geo.chosenBelowHead, 'the chosen option opens in view, not behind the header').toBe(true)
    expect(geo.rowsBelowHead, 'scrolled to the top, the first option sits under the header, not behind it').toBe(true)
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline).map((a) => a.finished.catch(() => {}))))
    await page.screenshot({ path: '.claude/scratch/misc4/sheet-390.png' })
  })

  for (const way of ['Escape', 'Close', 'the dim area']) {
    test(`closing a phone dropdown sheet with ${way} puts focus back on the trigger`, async ({ page }) => {
      watch(page, `phone user dismissing the sheet with ${way}`)
      await openPage(page)
      await trigger(page).click()
      const list = page.locator('.menu-select-list[role="listbox"]')
      await expect(list).toBeVisible()
      if (way === 'Escape') await page.keyboard.press('Escape')
      else if (way === 'Close') await head(page).getByRole('button', { name: 'Close' }).click()
      else await page.mouse.click(195, 60)
      await expect(list).toBeHidden()
      await expect(head(page)).toHaveCount(0)
      await expect(trigger(page)).toBeFocused()
    })
  }

  test('choosing an option still works and leaves no header behind', async ({ page }) => {
    watch(page, 'phone user choosing a scale ratio')
    await openPage(page)
    const before = await trigger(page).getAttribute('aria-label')
    await trigger(page).click()
    await page.locator('.menu-select-list [role="option"][aria-selected="false"]').first().click()
    await expect(head(page)).toHaveCount(0)
    expect(await trigger(page).getAttribute('aria-label')).not.toBe(before)
  })
})

test.describe('A tablet dropdown stays a popover', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('a tablet dropdown stays a popover with no header', async ({ page }) => {
    watch(page, 'tablet user opening the Scale ratio dropdown')
    await openPage(page)
    await trigger(page).click()
    await expect(page.getByRole('listbox', { name: NAME })).toBeVisible()
    await expect(head(page)).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(trigger(page)).toBeFocused()
  })
})
