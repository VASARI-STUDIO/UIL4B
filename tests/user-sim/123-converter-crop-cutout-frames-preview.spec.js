// FILE CONVERTER, VIDEO TAB: FREE CROP BOX, FIT, CUT-OUTS, FRAME EXPORTS, AFTER PREVIEW.
//
// Each test drives a control a visitor sees and reads what the screen then says.
// No encode is run: the argument lists are pinned in tests/unit/media-encode.test.js.
//
// MUTATIONS (each makes a test below go red):
//   - CropBox.jsx: make onPointerMove do nothing -> "dragging the box" goes red.
//   - FileConverter.jsx, setBoxField: ignore `raw` (call setBox(box)) -> "typed numbers" goes red.
//   - FileConverter.jsx: drop `isOptionDisabled` from the Outside row -> "MP4 has no transparency" goes red.
//   - FileConverter.jsx: remove the FRAME_EXPORTS optgroup -> "frames ZIP and sprite sheet" goes red.
//   - FileConverter.jsx: never mount ResultPreview -> "After shows the saved picture" goes red.
import { test, expect } from './base.js'
import { chooseMenuOption, go, watch } from './helpers.js'

const PERSONA = 'someone cropping a clip to an exact box before saving it'

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
  await expect(page.getByLabel('Width (px)'), 'the clip never loaded').toBeVisible({ timeout: 15000 })
}

const shape = (page, name) => page.getByRole('radiogroup', { name: 'Shape' }).getByRole('radio', { name, exact: true })

for (const width of [390, 1440]) {
  test.describe(`at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
      await openVideoWithClip(page)
    })

    test('typed numbers set the crop box, and the box on the preview follows them', async ({ page }) => {
      await shape(page, 'Custom').click()
      const box = page.locator('.fc-crop-box')
      await expect(box, 'Custom drew no crop box').toBeVisible()
      await page.getByLabel('Left (px)').fill('10')
      await page.getByLabel('Left (px)').blur()
      await page.getByLabel('Width (px)', { exact: true }).first().fill('32')
      await page.getByLabel('Width (px)', { exact: true }).first().blur()
      await expect(box).toHaveAttribute('style', /left: 15\.625%/)
      await expect(box).toHaveAttribute('style', /width: 50%/)
    })

    test('dragging the box moves it, and the Left field reads the same number the box shows', async ({ page }) => {
      await shape(page, 'Custom').click()
      const box = page.locator('.fc-crop-box')
      await box.scrollIntoViewIfNeeded() // at 390 the click on the shape scrolls the stage out of the viewport
      const before = await box.boundingBox()
      await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
      await page.mouse.down()
      await page.mouse.move(before.x + before.width / 2 - 10, before.y + before.height / 2, { steps: 4 })
      await page.mouse.up()
      const after = await box.boundingBox()
      expect(after.x, 'the box did not move left with the drag').toBeLessThan(before.x - 4)
      const left = Number(await page.getByLabel('Left (px)').inputValue())
      const stage = await page.locator('.fc-vstage').boundingBox()
      expect(Math.abs(left - ((after.x - stage.x) / stage.width) * 64), 'the field and the box disagree').toBeLessThan(3)
    })

    test('each corner handle has a 44 px hit area', async ({ page }) => {
      await shape(page, 'Custom').click()
      for (const c of ['nw', 'ne', 'sw', 'se']) {
        const b = await page.locator(`.fc-crop-dot--${c}`).boundingBox()
        expect(b.width, `${c} handle is too small to touch`).toBeGreaterThanOrEqual(44)
        expect(b.height).toBeGreaterThanOrEqual(44)
      }
    })

    test('Fit adds the Outside colour row; MP4 has no transparency and says so', async ({ page }) => {
      await shape(page, '16:9').click()
      await expect(page.getByRole('radiogroup', { name: 'Outside' }), 'Outside shows before any bars exist').toHaveCount(0)
      await page.getByRole('radiogroup', { name: 'Crop or fit' }).getByRole('radio', { name: 'Fit' }).click()
      const outside = page.getByRole('radiogroup', { name: 'Outside' })
      await expect(outside).toBeVisible()
      await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'MP4 (H.264)' })
      await expect(outside.getByRole('radio', { name: 'Transparent' })).toHaveAttribute('aria-disabled', 'true')
      await expect(page.getByText(/has no transparency, so the outside is filled/)).toBeVisible()
    })

    test('a cut-out shows its corner radius and the Outside row', async ({ page }) => {
      await page.getByRole('radiogroup', { name: 'Cut-out' }).getByRole('radio', { name: 'Rounded' }).click()
      await expect(page.getByLabel('Corner radius (%)')).toHaveValue('20')
      await expect(page.getByRole('radiogroup', { name: 'Outside' })).toBeVisible()
    })

    test('frames ZIP and sprite sheet are output choices, and the sprite states its grid', async ({ page }) => {
      await page.locator('#fc-vid-format').click()
      const list = page.locator('.menu-select-list[role="listbox"]')
      await expect(list.getByRole('option', { name: 'Frames (ZIP of PNGs)' })).toBeVisible()
      await expect(list.getByRole('option', { name: 'Sprite sheet (PNG)' })).toBeVisible()
      await list.getByRole('option', { name: 'Sprite sheet (PNG)' }).click()
      await expect(page.locator('.fc-consequence')).toContainText(/\d+ × \d+ sheet/)
      await expect(page.getByRole('button', { name: 'Make sprite sheet' })).toBeVisible()
    })

    test('After shows the saved picture with Play and a scrubber; Before brings the player back', async ({ page }) => {
      await page.getByRole('radiogroup', { name: 'Preview' }).getByRole('radio', { name: 'After' }).click()
      await expect(page.locator('canvas.fc-stage-canvas'), 'After drew no preview').toBeVisible()
      await expect(page.getByRole('slider', { name: 'Preview position' })).toBeVisible()
      await expect(page.getByRole('button', { name: /^(Play|Pause)$/ })).toBeVisible()
      await page.getByRole('radiogroup', { name: 'Preview' }).getByRole('radio', { name: 'Before' }).click()
      await expect(page.locator('canvas.fc-stage-canvas')).toHaveCount(0)
      await expect(page.getByLabel('Video preview')).toBeVisible()
    })
  })
}

// The new rows on a touch screen, a phone and a tablet. Mouse widths above do not
// switch on the 44 px sizes, which belong to a coarse pointer.
for (const width of [390, 768]) {
  test.describe(`on a touch screen at ${width}px`, () => {
    test.use({ hasTouch: true, isMobile: true })
    test.beforeEach(async ({ page }) => {
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: 844 })
      await openVideoWithClip(page)
      await shape(page, '16:9').click()
      await page.getByRole('radiogroup', { name: 'Crop or fit' }).getByRole('radio', { name: 'Fit' }).click()
      await page.getByRole('radiogroup', { name: 'Cut-out' }).getByRole('radio', { name: 'Rounded' }).click()
    })

    const rows = ['Shape', 'Crop or fit', 'Position', 'Cut-out', 'Outside']

    test('Shape, Crop or fit, Position, Cut-out and Outside each stay on one line inside the screen', async ({ page }) => {
      for (const name of rows) {
        const opts = await page.getByRole('radiogroup', { name }).getByRole('radio').evaluateAll((els) => els.map((e) => {
          const r = e.getBoundingClientRect()
          return { top: Math.round(r.top), right: Math.round(r.right), left: Math.round(r.left) }
        }))
        expect(opts.length, `${name} has no options`).toBeGreaterThan(1)
        expect(new Set(opts.map((o) => o.top)).size, `${name} wraps onto a second line`).toBe(1)
        expect(Math.max(...opts.map((o) => o.right)), `${name} runs off the right edge`).toBeLessThanOrEqual(width)
        expect(Math.min(...opts.map((o) => o.left)), `${name} runs off the left edge`).toBeGreaterThanOrEqual(0)
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    })

    test('every option in those rows is at least 44 px tall and wide', async ({ page }) => {
      for (const name of rows) {
        const sizes = await page.getByRole('radiogroup', { name }).getByRole('radio').evaluateAll((els) => els.map((e) => {
          const r = e.getBoundingClientRect()
          return { h: r.height, w: r.width }
        }))
        for (const s of sizes) {
          expect(s.h, `an option in ${name} is ${s.h} px tall`).toBeGreaterThanOrEqual(44)
          expect(s.w, `an option in ${name} is ${s.w} px wide`).toBeGreaterThanOrEqual(44)
        }
      }
    })
  })
}
