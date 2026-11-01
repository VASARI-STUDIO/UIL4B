// FILE CONVERTER: THE HEADER CARRIES NO STATUS TAG, AND THE VIDEO WIDTH FIELD
// CAN BE RETYPED.
//
// 1. THE HEADER
// The tool toolbar on /create/file-converter holds the page name and the way to
// the 3D Model Converter. A mono "Alpha" tag used to sit beside the name; the
// converter is a finished tool, so the tag was wrong, and it is gone.
//
// 2. THE VIDEO WIDTH FIELD
// The Width field keeps what is typed (empty allowed) and settles on blur or
// Enter: over 1920 caps at 1920, under 16 floors to 16, empty goes back to the
// last real width. The helper line states the 1920 px limit.
//
// MUTATIONS (each makes a test below go red):
//   - FileConverter.jsx: put
//     `{ id: 'alpha', menu: false, render: () => <span className="fc-alpha">Alpha</span> }`
//     back at the top of the ToolLayout `items`
//     -> "no Alpha tag" goes red at 1440 (the tag is on screen).
//   - FileConverter.jsx, VideoConvert: make the Width field's `onCommit` call
//     `setWidth(480)` whatever was typed
//     -> the settle test goes red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone opening the file converter to change a file'

test.describe('File converter: the header', () => {
  for (const width of [1440, 390]) {
    test(`no Alpha tag sits in the header at ${width}px, and the name and 3D link are still there`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
      await go(page, '/create/file-converter')
      await expect(page.getByRole('heading', { name: 'File Converter', level: 1 }), 'the page name is missing').toBeVisible()

      const alphaTags = await page.locator('.fc').evaluate((root) => ({
        byClass: root.querySelectorAll('.fc-alpha').length,
        byText: [...root.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^alpha$/i.test(el.textContent.trim())).length,
      }))
      expect(alphaTags, 'an Alpha tag is on the converter').toEqual({ byClass: 0, byText: 0 })

      // The 3D Model Converter link is the header's one action; losing the tag must not take it.
      // It stays on the bar at 390 too (measured), so it is asserted at both widths.
      await expect(page.getByRole('link', { name: 'Open the 3D Model Converter' }), 'the 3D Model Converter link is gone').toBeVisible()
    })
  }
})

/** Open the Video tab with a real 1 s webm recorded in the page, and return the Width field. */
async function openVideoWithClip(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Video', exact: true }).click()
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const c = canvas.getContext('2d')
    const rec = new MediaRecorder(canvas.captureStream(10)); const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((r) => { rec.onstop = r })
    rec.start()
    for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#1c40f2' : '#f24040'; c.fillRect(0, 0, 64, 64); await new Promise((r) => setTimeout(r, 100)) }
    rec.stop(); await stopped
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  })
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) })
  const field = page.getByLabel('Width (px)')
  await expect(field, 'the clip never loaded, so the settings never showed').toBeVisible({ timeout: 15000 })
  return field
}

test.describe('File converter: the Video width field', () => {
  for (const width of [1440, 390]) {
    test(`clearing the field leaves it empty, and typing into it keeps what is typed, at ${width}px`, async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
      const field = await openVideoWithClip(page)
      await expect(field).toHaveValue('480')

      await field.click()
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.press('Backspace')
      await expect(field, 'the emptied field snapped back to a number').toHaveValue('')

      await page.keyboard.type('1280')
      await expect(field, 'typing into the emptied field did not keep what was typed').toHaveValue('1280')
    })
  }

  test('a value over 1920 caps and one under 16 floors to 16 on blur, and an empty field returns to the last real width', async ({ page }) => {
    watch(page, PERSONA)
    const field = await openVideoWithClip(page)

    await field.fill('')
    await page.keyboard.type('99999')
    await field.blur()
    await expect(field, 'the field took a width above the 1920 px limit').toHaveValue('1920')

    await field.fill('1')
    await expect(field, 'the floor applied while typing, before blur').toHaveValue('1')
    await field.blur()
    await expect(field, 'a value under 16 did not floor to 16 on blur').toHaveValue('16')

    await field.fill('720')
    await field.blur()
    await field.fill('')
    await field.blur()
    await expect(field, 'an empty field did not return to the last real width').toHaveValue('720')

    await field.fill('0')
    await field.blur()
    await expect(field, 'a zero width was kept').toHaveValue('16')
  })

  test('the field asks for a numeric keypad and the helper line states the 1920 px limit', async ({ page }) => {
    watch(page, PERSONA)
    const field = await openVideoWithClip(page)
    await expect(field).toHaveAttribute('inputmode', 'numeric')
    await expect(page.getByText(/Up to 1920 px/)).toBeVisible()
  })
})
