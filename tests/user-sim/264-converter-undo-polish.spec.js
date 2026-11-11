// SPEC 264: THE FILE CONVERTER TAKES BACK ITS EDITS, AND THE ROUGH EDGES ARE GONE.
//
// Someone editing a GIF on the Video tab can step back and forward through
// their edits by button and by keyboard, and sees what they have done as one
// line. On the Image tab the size picker shows its whole label, Convert stays
// put when the "held to the size limit" note arrives, and a screen reader hears
// "to" between the two sizes. On a phone the toast sits above the pinned
// Convert bar, and the 3D converter's hint names touch gestures.
//
// MUTATIONS (each should turn the named test red):
//   - delete the `record(...)` effect in useEditHistory.js: "Undo and Redo by
//     button" fails (the line never lists an edit);
//   - make `record` keep `future` instead of emptying it: "a new edit empties
//     Redo" fails;
//   - drop the `isTyping` check in useEditHistory.js: "shortcuts do nothing
//     while a number field has the focus" fails;
//   - delete `.fc .fc-pair--size` in file-converter.css: "Size limit shows its
//     whole label" fails at 1440;
//   - render the `.fc-outsize-cap` span only when capped: "Convert does not move"
//     fails;
//   - delete the `sr-only` " to " in FileConverter.jsx: "a screen reader hears
//     both sizes joined by to" fails;
//   - delete the `html.fc-has-bar.has-tabbar .toast` rule: "the toast sits above
//     the Convert bar" fails at 390;
//   - return the desktop sentence from ModelConverter.jsx on touch: "the 3D hint
//     names touch gestures" fails.
import { test, expect } from './base.js'
import { chooseMenuOption, go, watch } from './helpers.js'

const ROUTE = '/create/file-converter'
// A 32×24 two-colour GIF: the Custom crop box needs a picture of at least 2×2 pixels.
const GIF = { name: 'loop.gif', mimeType: 'image/gif', buffer: Buffer.from('R0lGODdhIAAYAIEAADNmzP///wAAAAAAACwAAAAAIAAYAEAILwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJjQEBADs=', 'base64') }

/** A PNG larger than the Full HD limit, drawn in the page so nothing binary is committed. */
async function bigPng(page) {
  const bytes = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 3000
    c.height = 2000
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#3366cc'
    ctx.fillRect(0, 0, 3000, 2000)
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return { name: 'big.png', mimeType: 'image/png', buffer: Buffer.from(bytes) }
}

async function openVideoTab(page) {
  await go(page, ROUTE)
  await page.getByRole('tab', { name: 'Video' }).click()
  await page.locator('.fc-drop input[type="file"]').setInputFiles(GIF)
  await expect(page.locator('.fc-editbar')).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Turn' })).toBeVisible()
  // The picture has to have said how big it is before the shapes unlock.
  await expect(page.getByRole('radio', { name: '1:1', exact: true })).not.toHaveAttribute('aria-disabled', 'true')
}

const line = (page) => page.locator('.fc-editline')
const undoBtn = (page) => page.locator('.fc-editbar [data-edit="undo"]')
const redoBtn = (page) => page.locator('.fc-editbar [data-edit="redo"]')
// The history notes an edit in an effect after the controls render, so a shortcut
// pressed in the same instant as the click can meet a history one step behind.
// Two frames is long enough for it to catch up; a person is never that quick.
const settled = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
const edit = async (page, click) => { await click; await settled(page) }
const turn90 = (page) => edit(page, page.getByRole('radiogroup', { name: 'Turn' }).getByRole('radio', { name: '90° right' }).click())
const flipH = (page) => edit(page, page.getByRole('button', { name: 'Flip horizontal' }).click())
const double = (page) => edit(page, page.getByRole('radio', { name: 'Double speed' }).click())

test.describe('Undo and Redo on the Video tab', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Undo and Redo by button, across turn, flip and speed', async ({ page }) => {
    watch(page, 'someone editing a GIF who changes their mind')
    await openVideoTab(page)
    await expect(line(page)).toContainText('No edits yet')
    await expect(undoBtn(page)).toHaveAttribute('aria-disabled', 'true')

    await turn90(page)
    await flipH(page)
    await double(page)
    await expect(line(page)).toContainText('Turned 90° right · Flipped horizontally · Double speed')
    await expect(undoBtn(page)).toHaveAttribute('aria-disabled', 'false')

    await undoBtn(page).click()
    await expect(line(page)).not.toContainText('Double speed')
    await expect(page.getByRole('radio', { name: 'Normal speed' })).toHaveAttribute('aria-checked', 'true')
    await undoBtn(page).click()
    await expect(page.getByRole('button', { name: 'Flip horizontal' })).toHaveAttribute('aria-pressed', 'false')
    await expect(line(page)).toContainText('Turned 90° right')
    await undoBtn(page).click()
    await expect(line(page)).toContainText('No edits yet')
    await expect(undoBtn(page)).toHaveAttribute('aria-disabled', 'true')
    // The button that ran out of steps still holds the focus.
    await expect(undoBtn(page)).toBeFocused()

    await redoBtn(page).click()
    await expect(line(page)).toContainText('Turned 90° right')
    await expect(line(page)).not.toContainText('Flipped')
    await redoBtn(page).click()
    await redoBtn(page).click()
    await expect(line(page)).toContainText('Double speed')
    await expect(redoBtn(page)).toHaveAttribute('aria-disabled', 'true')
  })

  test('Undo and Redo by keyboard: Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y and Cmd+Z', async ({ page }) => {
    await openVideoTab(page)
    await turn90(page)
    await double(page)
    await expect(line(page)).toContainText('Double speed')

    await page.keyboard.press('Control+z')
    await expect(line(page)).not.toContainText('Double speed')
    await page.keyboard.press('Control+Shift+z')
    await expect(line(page)).toContainText('Double speed')
    await page.keyboard.press('Control+z')
    await expect(line(page)).not.toContainText('Double speed')
    await page.keyboard.press('Control+y')
    await expect(line(page)).toContainText('Double speed')
    await page.keyboard.press('Meta+z')
    await expect(line(page)).not.toContainText('Double speed')
    await page.keyboard.press('Meta+Shift+z')
    await expect(line(page)).toContainText('Double speed')
  })

  test('a new edit empties Redo', async ({ page }) => {
    await openVideoTab(page)
    await turn90(page)
    await double(page)
    await undoBtn(page).click()
    await expect(redoBtn(page)).toHaveAttribute('aria-disabled', 'false')
    await edit(page, page.getByRole('button', { name: 'Flip vertical' }).click())
    await expect(redoBtn(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(line(page)).toContainText('Flipped vertically')
    await expect(line(page)).not.toContainText('Double speed')
  })

  test('shortcuts do nothing while a number field has the focus', async ({ page }) => {
    await openVideoTab(page)
    await turn90(page)
    await edit(page, page.getByRole('radio', { name: 'Custom', exact: true }).click())
    await flipH(page)
    await expect(line(page)).toContainText('Custom crop · Turned 90° right · Flipped horizontally')
    // One step back, so a Redo is waiting for the shortcuts to (wrongly) use.
    await undoBtn(page).click()
    await expect(redoBtn(page)).toHaveAttribute('aria-disabled', 'false')
    const field = page.locator('#fc-vid-box-x')
    await field.focus()
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+Shift+z')
    await page.keyboard.press('Control+y')
    await settled(page)
    await expect(line(page)).toHaveText(/Custom crop · Turned 90° right$/)
    await expect(field).toBeVisible()
    await expect(redoBtn(page)).toHaveAttribute('aria-disabled', 'false')
  })

  test('each file has its own history', async ({ page }) => {
    await openVideoTab(page)
    await turn90(page)
    await expect(undoBtn(page)).toHaveAttribute('aria-disabled', 'false')
    await page.getByRole('button', { name: 'Choose different file' }).click()
    await page.locator('.fc-drop input[type="file"]').setInputFiles(GIF)
    await expect(page.locator('.fc-editbar')).toBeVisible()
    await expect(undoBtn(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(redoBtn(page)).toHaveAttribute('aria-disabled', 'true')
  })
})

test.describe('the edit row on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('Undo, Redo and the line stay on one row, with 44px buttons', async ({ page }) => {
    await openVideoTab(page)
    await turn90(page)
    await flipH(page)
    await double(page)
    const row = await page.evaluate(() => {
      const bar = document.querySelector('.fc-editbar')
      const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, h: r.height, w: r.width, l: r.left, r: r.right } }
      return {
        bar: box(bar),
        kids: [...bar.querySelectorAll('.fc-editbtn, .fc-editline')].map(box),
        vw: window.innerWidth,
        line: document.querySelector('.fc-editline').getBoundingClientRect().height,
      }
    })
    const mids = row.kids.map((k) => k.top + k.h / 2)
    expect(Math.max(...mids) - Math.min(...mids), 'one row').toBeLessThan(4)
    for (const b of row.kids.slice(0, 2)) {
      expect(b.w).toBeGreaterThanOrEqual(43.5)
      expect(b.h).toBeGreaterThanOrEqual(43.5)
    }
    expect(row.bar.r).toBeLessThanOrEqual(row.vw)
    expect(row.line, 'a single line of text').toBeLessThan(24)
    await expect(undoBtn(page)).toHaveAccessibleName('Undo')
    await undoBtn(page).tap()
    await expect(line(page)).not.toContainText('Double speed')
  })
})

test.describe('Image tab polish at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Size limit shows its whole label, and Convert does not move when the note arrives', async ({ page }) => {
    watch(page, 'someone shrinking a big photo')
    await go(page, ROUTE)
    await page.locator('.fc-drop input[type="file"]').setInputFiles(await bigPng(page))
    await expect(page.locator('.fc-outsize')).toBeVisible()
    const size = page.locator('#fc-img-size')
    const convert = page.getByRole('button', { name: /^Convert 1 image/ })

    await chooseMenuOption(page, size, 1920)
    await expect(page.locator('.fc-outsize-cap')).toHaveText('held to the size limit')
    const cut = await size.evaluate((el) => [...el.querySelectorAll('*'), el].filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.className))
    expect(cut, 'nothing inside the Size limit button is cut off').toEqual([])
    expect(await size.textContent()).toContain('Full HD — 1920 px')

    await chooseMenuOption(page, size, 0)
    await expect(page.locator('.fc-outsize-cap')).toHaveText('')
    const before = (await convert.boundingBox()).y
    await chooseMenuOption(page, size, 2560)
    await expect(page.locator('.fc-outsize-cap')).toHaveText('held to the size limit')
    const after = (await convert.boundingBox()).y
    expect(Math.abs(after - before), 'Convert stayed put').toBeLessThan(0.6)
  })

  test('a screen reader hears both sizes joined by to', async ({ page }) => {
    await go(page, ROUTE)
    await page.locator('.fc-drop input[type="file"]').setInputFiles(await bigPng(page))
    await expect(page.locator('.fc-outsize-v')).toBeVisible()
    const spoken = await page.locator('.fc-outsize-v').evaluate((el) => {
      const copy = el.cloneNode(true)
      copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
      return copy.textContent.replace(/\s+/g, ' ').trim()
    })
    expect(spoken).toBe('3000×2000 to 3000×2000 px')
  })
})

test.describe('phone, 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the toast sits above the Convert bar', async ({ page }) => {
    watch(page, 'someone converting a photo on a phone')
    await go(page, ROUTE)
    await page.locator('.fc-drop input[type="file"]').setInputFiles(await bigPng(page))
    const convert = page.getByRole('button', { name: /^Convert 1 image/ })
    await expect(convert).toBeVisible()
    await convert.tap()
    const toast = page.locator('.toast.show')
    await expect(toast).toContainText('Converted 1 image')
    await page.waitForTimeout(400)
    const gap = await page.evaluate(() => {
      const t = document.querySelector('.toast.show').getBoundingClientRect()
      const b = document.querySelector('.fc-actionbar').getBoundingClientRect()
      return b.top - t.bottom
    })
    expect(gap, 'the toast ends above the bar').toBeGreaterThanOrEqual(0)
  })

  test('the 3D hint names touch gestures', async ({ page }) => {
    await go(page, '/create/3d-converter')
    const hint = page.locator('.v3d-hint')
    await expect(hint).toContainText('pinch to zoom')
    await expect(hint).toContainText('two fingers')
    await expect(hint).not.toContainText('right-drag')
    await expect(hint).not.toContainText('arrow keys')
  })
})

test.describe('3D hint with a mouse', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('still names the right button and the arrow keys', async ({ page }) => {
    await go(page, '/create/3d-converter')
    await expect(page.locator('.v3d-hint')).toContainText('right-drag to pan')
    await expect(page.locator('.v3d-hint')).toContainText('arrow keys')
  })
})
