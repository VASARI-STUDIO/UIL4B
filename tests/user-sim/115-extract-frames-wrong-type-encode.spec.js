// EXTRACT FRAMES: A FRAME ENCODED AS THE WRONG TYPE STOPS THE RUN.
//
// canvas.toBlob(cb, 'image/webp') is not an error in a browser that cannot
// encode WebP (or AVIF): it quietly hands back a PNG. Saved as frame-0001.webp
// that is a file whose name lies about its contents. Extract frames must treat
// a blob of another type exactly like a null blob: stop the run, say
// "<Format> export not supported by this browser", and list no frames.
//
// HOW THE BROWSER IS MADE TO LIE
// An init script wraps HTMLCanvasElement.toBlob. For the types in
// window.__lie.types it encodes a PNG and returns that PNG blob (type
// image/png) to the caller, which is what such a browser does. The AVIF
// capability probe (a 2x2 canvas asking for image/avif) is answered with an
// image/avif-typed blob, so the page believes AVIF encoding works; the real
// frame canvases, which are bigger, get the PNG. Every other type is encoded
// by the real browser.
//
// The clip is a real, decodable 1-second webm recorded in the page, so upload,
// metadata, seek and canvas paths are the real ones. Seeking is the real
// seeking too: a 1 s clip at the default 2 fps is a handful of frames.
//
// MUTATIONS (each makes a test below go red):
//   - FileConverter.jsx, VideoFrames extract(): change
//     `!blobMatches(blob, fmt.id)` back to `!blob`
//     -> "WebP frames that come back as a PNG" goes red (frames are listed,
//     named .webp, and the run reports success).
//   - FileConverter.jsx: add AVIF to FRAME_FORMATS
//     -> "AVIF is not offered for frames" goes red.
import { test, expect } from './base.js'
import { go, watch, chooseMenuOption } from './helpers.js'

// A 1x1 transparent PNG: the still-image converter shows its format list only once it has a file.
const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==', 'base64')
const PERSONA = 'someone pulling frames out of a clip in a browser that cannot encode every format'

/** Make toBlob return a PNG for `types`, and let the AVIF probe pass when `probePasses`. */
async function lieAboutEncoding(page, { types, probePasses }) {
  await page.addInitScript(({ types: lieTypes, probePasses: probeOk }) => {
    const realToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (cb, type, quality) {
      const isProbe = this.width === 2 && this.height === 2 && type === 'image/avif'
      if (isProbe && probeOk) {
        return realToBlob.call(this, (png) => cb(new Blob([png], { type: 'image/avif' })), 'image/png')
      }
      if (lieTypes.includes(type)) return realToBlob.call(this, cb, 'image/png')
      return realToBlob.call(this, cb, type, quality)
    }
  }, { types, probePasses })
}

/** Open Extract frames and upload a real 1 s webm; resolves when Extract Frames is enabled. */
async function openWithClip(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Extract frames', exact: true }).click()
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
  await expect(page.getByRole('button', { name: 'Extract Frames' }), 'the clip never loaded its metadata').toBeEnabled({ timeout: 15000 })
}

const extractBtn = (page) => page.locator('.fc-actions .fc-btn--primary')
const formatTrigger = (page) => page.getByLabel('Output format')
const frameNames = (page) => page.locator('.fc-grid .fc-name').allTextContents()

test.describe('Extract frames: a frame encoded as the wrong type', () => {
  test('WebP frames that come back as a PNG stop the run with the not-supported error and list no frames', async ({ page }) => {
    watch(page, PERSONA)
    await lieAboutEncoding(page, { types: ['image/webp'], probePasses: false })
    await openWithClip(page)
    await chooseMenuOption(page, formatTrigger(page), { label: 'WebP' })
    await extractBtn(page).click()

    const toast = page.locator('.toast.show')
    await expect(toast).toContainText('WebP export not supported by this browser', { timeout: 15000 })
    await expect(toast, 'a wrong-type frame is an error, not a partial success').toHaveClass(/toast-error/)
    await expect(toast).not.toContainText(/Extracted \d+ frames/)
    await expect(page.locator('.fc-frames-head'), 'frames were listed from a run that should have stopped').toHaveCount(0)
    await expect(page.locator('.fc-name', { hasText: /\.webp$/ }), 'a PNG was saved under a .webp name').toHaveCount(0)
    await expect(extractBtn(page), 'the controls did not come back after the stop').toBeEnabled()
  })

  test('AVIF is not offered for frames even when the AVIF probe passes, so no .avif frame can be made', async ({ page }) => {
    watch(page, PERSONA)
    await lieAboutEncoding(page, { types: ['image/avif'], probePasses: true })
    // The still-image converter offers AVIF once the probe passes, so the stub
    // really did make the browser look AVIF-capable.
    await go(page, '/create/file-converter')
    await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: ONE_PIXEL_PNG })
    await formatTrigger(page).click()
    await expect(
      page.locator('.menu-select-list[role="listbox"]').getByRole('option', { name: 'AVIF', exact: true }),
      'the probe stub did not make AVIF available, so this test proves nothing',
    ).toBeVisible()
    await page.keyboard.press('Escape')

    // Extract frames keeps AVIF out of its list, so a run can never be asked for it.
    await openWithClip(page)
    await formatTrigger(page).click()
    const list = page.locator('.menu-select-list[role="listbox"]')
    await expect(list.getByRole('option', { name: 'WebP', exact: true }), 'the frame format list never opened').toBeVisible()
    await expect(list.getByRole('option', { name: 'AVIF', exact: true }), 'AVIF is offered for frames').toHaveCount(0)
    await page.keyboard.press('Escape')

    await extractBtn(page).click()
    await expect(page.locator('.toast.show')).toContainText(/Extracted \d+ frames/, { timeout: 15000 })
    expect(await frameNames(page), 'no frame may be named .avif').not.toContainEqual(expect.stringMatching(/\.avif$/))
  })

  test('control: WebP frames the browser really encodes are listed under .webp names', async ({ page }) => {
    watch(page, PERSONA)
    await lieAboutEncoding(page, { types: [], probePasses: false })
    await openWithClip(page)
    await chooseMenuOption(page, formatTrigger(page), { label: 'WebP' })
    await extractBtn(page).click()

    await expect(page.locator('.toast.show')).toContainText(/Extracted \d+ frames/, { timeout: 15000 })
    const names = await frameNames(page)
    expect(names.length, 'the control run made no frames').toBeGreaterThan(0)
    for (const n of names) expect(n).toMatch(/^frame-\d{4}\.webp$/)
  })
})
