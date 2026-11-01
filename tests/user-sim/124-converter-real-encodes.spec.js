// FILE CONVERTER, VIDEO TAB: REAL ENCODES.
//
// The other converter specs read the screen and pin the ffmpeg argument lists
// as data. This one runs the wasm engine (served from node_modules in place of
// the CDN, the way 57-converter-engine-cdn does) on a clip recorded in the page,
// then opens the file that came out and measures it: its size, its frame count,
// and the colour of chosen pixels.
//
// THE CLIP: 160 x 100, red on the left half, blue on the right half, about a
// second long at 10 fps. Colours are fixed so that a crop, a cut-out or a bar
// shows up as a known colour in a known place.
//
// MUTATIONS (each makes a test below go red):
//   - mediaEncode.js, cutoutFilter(): return '' -> the circle and rounded tests go red.
//   - mediaEncode.js, freeCrop(): return null -> the Custom crop test goes red.
//   - mediaEncode.js, padRect(): return null -> the Fit test goes red.
//   - mediaEncode.js, scaleFilter(): return the width as a constant 100 -> the sizes in every test go red.
//   - FileConverter.jsx, convert(): zip only the first PNG -> the frames test and the
//     "count the page promises" test go red.
//   - mediaEncode.js, the Circle and Rounded `cover` expressions set to '1' -> only the
//     two cut-out tests go red; the default GIF and sprite tests stay green.
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import { test, expect } from './base.js'
import { chooseMenuOption, go, watch } from './helpers.js'

const CORE_PKG = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core')
const CORE_DIR = path.join(CORE_PKG, 'dist', 'esm')
const CORE_VERSION = JSON.parse(fs.readFileSync(path.join(CORE_PKG, 'package.json'), 'utf8')).version
const CDN_PREFIX = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm/`
const BODY = {
  'ffmpeg-core.js': { file: path.join(CORE_DIR, 'ffmpeg-core.js'), type: 'text/javascript' },
  'ffmpeg-core.wasm': { file: path.join(CORE_DIR, 'ffmpeg-core.wasm'), type: 'application/wasm' },
}
const PERSONA = 'someone saving a cropped, cut-out clip and checking the file that comes out'
const SRC = { w: 160, h: 100 }
const RED = '#f24040'
const BLUE = '#1c40f2'

async function serveCoreFromDisk(page) {
  await page.route((url) => url.href.startsWith('https://cdn.jsdelivr.net/'), async (route) => {
    const url = route.request().url()
    const known = url.startsWith(CDN_PREFIX) ? BODY[url.slice(CDN_PREFIX.length)] : null
    if (!known) return route.fulfill({ status: 404, body: '' })
    await route.fulfill({ status: 200, headers: { 'content-type': known.type, 'access-control-allow-origin': '*' }, body: fs.readFileSync(known.file) })
  })
}

/** Remember every blob the page turns into a URL, so a result with no element (the ZIP) can still be read. */
async function rememberBlobs(page) {
  await page.addInitScript(() => {
    const real = URL.createObjectURL.bind(URL)
    window.__blobs = []
    URL.createObjectURL = (obj) => {
      const url = real(obj)
      if (obj instanceof Blob) window.__blobs.push({ url, type: obj.type, size: obj.size })
      return url
    }
  })
}

async function openWithClip(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Video', exact: true }).click()
  const clip = await page.evaluate(async ({ w, h, red, blue }) => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const c = canvas.getContext('2d')
    const rec = new MediaRecorder(canvas.captureStream(10)); const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((r) => { rec.onstop = r })
    const draw = (i) => {
      c.fillStyle = red; c.fillRect(0, 0, w / 2, h)
      c.fillStyle = blue; c.fillRect(w / 2, 0, w / 2, h)
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, 10) // a white stripe across the top, outside the Custom box below
      c.fillStyle = '#000000'; c.fillRect(0, h - 6, 4 + i * 4, 6) // a bar along the bottom that grows, so the frames differ
    }
    draw(0)
    rec.start()
    for (let i = 0; i < 12; i++) { draw(i); await new Promise((r) => setTimeout(r, 100)) }
    rec.stop(); await stopped
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  }, { ...SRC, red: RED, blue: BLUE })
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) })
  await expect(page.getByLabel('Width (px)'), 'the clip never loaded').toBeVisible({ timeout: 15000 })
}

const radio = (page, group, name) => page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true })
/** Press the main button and wait for the Result section; resolves with its Download button's name. */
async function convert(page, buttonName) {
  await page.getByRole('button', { name: buttonName, exact: true }).click()
  await expect(page.locator('section.fc-result'), 'no result came out of the engine').toBeVisible({ timeout: 90_000 })
}

/** The bytes behind a blob: URL held by the page. */
async function bytesOf(page, url) {
  const arr = await page.evaluate(async (u) => Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())), url)
  return Buffer.from(arr)
}
const resultUrl = (page, sel) => page.locator(sel).getAttribute('src')

/**
 * Open an image file (GIF, WebP, PNG) the way the browser does and report its
 * size, how many frames it has and the colour of the first frame at each point.
 */
async function inspectImage(page, bytes, type, points) {
  return page.evaluate(async ({ data, type: mime, pts }) => {
    const dec = new ImageDecoder({ data: new Uint8Array(data), type: mime })
    await dec.tracks.ready
    const { image } = await dec.decode({ frameIndex: 0 })
    const w = image.displayWidth; const h = image.displayHeight
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image, 0, 0)
    const px = {}
    for (const [name, x, y] of pts) px[name] = Array.from(ctx.getImageData(x, y, 1, 1).data)
    return { w, h, frames: dec.tracks.selectedTrack.frameCount, px }
  }, { data: Array.from(bytes), type, pts: points })
}

const isRed = ([r, g, b]) => r > 190 && g < 110 && b < 110
const isBlue = ([r, g, b]) => b > 190 && r < 90 && g < 120
const isBlack = ([r, g, b]) => r < 40 && g < 40 && b < 40

/** The width and height an MP4 declares for its first video track (tkhd, 16.16 fixed point). */
function mp4Size(buf) {
  const at = buf.indexOf('tkhd')
  if (at < 0) return null
  const version = buf[at + 4]
  // After the 'tkhd' tag: version + flags (4), created, modified, track id, reserved, duration
  // (v0: 4 each; v1: 8, 8, 4, 4, 8), then reserved (8), layer, group, volume, reserved (2 each), matrix (36).
  const head = version === 1 ? 4 + 8 + 8 + 4 + 4 + 8 : 4 + 4 + 4 + 4 + 4 + 4
  const o = at + 4 + head + 8 + 2 + 2 + 2 + 2 + 36
  return { w: buf.readUInt32BE(o) >> 16, h: buf.readUInt32BE(o + 4) >> 16 }
}

/** Whether this browser can decode H.264 at all. Open-source Chromium builds
 *  ship without it; there the MP4 is still checked by its header, and the
 *  pixel and round-trip checks are skipped rather than failed. */
async function playsH264(page) {
  return page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"') !== '')
}

/** An MP4's first frame, decoded by the browser's own player, with the colour at each point. */
async function inspectMp4(page, url, points) {
  return page.evaluate(async ({ u, pts }) => {
    const v = document.createElement('video'); v.muted = true; v.src = u
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('this browser cannot play the MP4')) })
    v.currentTime = 0.05
    await new Promise((r) => { v.onseeked = r })
    const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(v, 0, 0)
    const px = {}
    for (const [name, x, y] of pts) px[name] = Array.from(ctx.getImageData(x, y, 1, 1).data)
    return { w: v.videoWidth, h: v.videoHeight, px }
  }, { u: url, pts: points })
}

test.describe('Video tab: what the engine writes', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000)
    watch(page, PERSONA)
    await page.setViewportSize({ width: 1280, height: 900 })
    await rememberBlobs(page)
    await serveCoreFromDisk(page)
    await openWithClip(page)
  })

  test('default settings: a GIF at the set width, with the whole picture and a frame for every tenth of a second', async ({ page }) => {
    await convert(page, 'Convert to GIF')
    const bytes = await bytesOf(page, await resultUrl(page, 'img[alt="GIF result"]'))
    if (process.env.CONVERTER_DUMP_DIR) fs.writeFileSync(path.join(process.env.CONVERTER_DUMP_DIR, 'default.gif'), bytes)
    const g = await inspectImage(page, bytes, 'image/gif', [['left', 40, 150], ['right', 440, 150]])
    // 480 wide is the default Width; the 160 x 100 clip scales to 480 x 300.
    expect([g.w, g.h], 'the default GIF is the wrong size').toEqual([480, 300])
    expect(g.frames, 'the default GIF lost frames').toBeGreaterThanOrEqual(8)
    expect(g.frames).toBeLessThanOrEqual(14)
    expect(isRed(g.px.left), `left half is ${g.px.left}`).toBe(true)
    expect(isBlue(g.px.right), `right half is ${g.px.right}`).toBe(true)
  })

  test('Custom crop: the GIF is the box, and its two halves keep their colours', async ({ page }) => {
    await radio(page, 'Shape', 'Custom').click()
    // Width is also the name of the output-width field, so the box fields are reached by id.
    for (const [id, value] of [['x', 40], ['y', 20], ['w', 80], ['h', 60]]) {
      await page.locator(`#fc-vid-box-${id}`).fill(String(value))
      await page.locator(`#fc-vid-box-${id}`).blur()
    }
    await expect(page.locator('#fc-vid-box-w')).toHaveValue('80')
    await expect(page.locator('#fc-vid-box-h')).toHaveValue('60')
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await convert(page, 'Convert to GIF')
    const bytes = await bytesOf(page, await resultUrl(page, 'img[alt="GIF result"]'))
    // The box takes x 40..120, y 20..80 of the clip. The colour change is at x 80, so at x 40 of the result.
    const g = await inspectImage(page, bytes, 'image/gif', [['left', 10, 30], ['right', 70, 30], ['top-left', 2, 2]])
    expect([g.w, g.h], 'the GIF is not the size of the box').toEqual([80, 60])
    expect(isRed(g.px.left), `left of the cut is ${g.px.left}`).toBe(true)
    expect(isBlue(g.px.right), `right of the cut is ${g.px.right}`).toBe(true)
    // The white stripe is the top 10 rows of the clip, above the box: it must not be in the result.
    expect(isRed(g.px['top-left']), `the corner is ${g.px['top-left']}, the white stripe leaked in`).toBe(true)
  })

  test('Circle cut-out in WebP: transparent outside, opaque inside', async ({ page }) => {
    await radio(page, 'Cut-out', 'Circle').click()
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'Animated WebP' })
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await convert(page, 'Convert to Animated WebP')
    const bytes = await bytesOf(page, await resultUrl(page, 'img[alt="Animated WebP result"]'))
    const g = await inspectImage(page, bytes, 'image/webp', [['corner', 2, 2], ['edge', 2, 25], ['left', 30, 25], ['right', 50, 25]])
    expect([g.w, g.h]).toEqual([80, 50])
    expect(g.px.corner[3], 'the corner is not clear').toBe(0)
    expect(g.px.edge[3], 'the edge outside the circle is not clear').toBe(0)
    expect(g.px.left[3]).toBe(255)
    expect(g.px.right[3]).toBe(255)
    expect(isRed(g.px.left), `inside, left is ${g.px.left}`).toBe(true)
    expect(isBlue(g.px.right), `inside, right is ${g.px.right}`).toBe(true)
  })

  test('Rounded cut-out in MP4: the corners are filled, because MP4 holds no transparency', async ({ page }) => {
    await radio(page, 'Cut-out', 'Rounded').click()
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'MP4 (H.264)' })
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await convert(page, 'Convert to MP4 (H.264)')
    const url = await resultUrl(page, 'video[aria-label="MP4 (H.264) result"]')
    expect(mp4Size(await bytesOf(page, url)), 'the MP4 declares the wrong size').toEqual({ w: 80, h: 50 })
    test.skip(!(await playsH264(page)), 'this browser cannot decode H.264, so the pixels are not read')
    const v = await inspectMp4(page, url, [['corner', 1, 1], ['left', 30, 25], ['right', 50, 25]])
    expect([v.w, v.h]).toEqual([80, 50])
    expect(isBlack(v.px.corner), `the corner is ${v.px.corner}, not the fill`).toBe(true)
    expect(isRed(v.px.left), `inside, left is ${v.px.left}`).toBe(true)
    expect(isBlue(v.px.right), `inside, right is ${v.px.right}`).toBe(true)
  })

  test('Fit to 16:9 in MP4: the whole picture stays and bars fill the sides', async ({ page }) => {
    await radio(page, 'Shape', '16:9').click()
    await radio(page, 'Crop or fit', 'Fit').click()
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'MP4 (H.264)' })
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await convert(page, 'Convert to MP4 (H.264)')
    const url = await resultUrl(page, 'video[aria-label="MP4 (H.264) result"]')
    // 160 x 100 is narrower than 16:9, so it sits on a 178 x 100 canvas: bars left and right.
    expect(mp4Size(await bytesOf(page, url)), 'the MP4 declares the wrong size').toEqual({ w: 80, h: 44 })
    test.skip(!(await playsH264(page)), 'this browser cannot decode H.264, so the pixels are not read')
    const v = await inspectMp4(page, url, [['bar-left', 1, 22], ['bar-right', 78, 22], ['left', 22, 22], ['right', 58, 22]])
    expect(isBlack(v.px['bar-left']), `the left bar is ${v.px['bar-left']}`).toBe(true)
    expect(isBlack(v.px['bar-right']), `the right bar is ${v.px['bar-right']}`).toBe(true)
    expect(isRed(v.px.left), `the picture, left, is ${v.px.left}`).toBe(true)
    expect(isBlue(v.px.right), `the picture, right, is ${v.px.right}`).toBe(true)
  })

  test('Frames (ZIP of PNGs): every frame is a numbered PNG of the output size', async ({ page }) => {
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'Frames (ZIP of PNGs)' })
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await convert(page, 'Make frames ZIP')
    const note = await page.locator('section.fc-result .fc-note').first().innerText()
    const said = /(\d+) numbered PNG files?, (\d+) × (\d+) px each/.exec(note)
    expect(said, `the result note reads "${note}"`).not.toBeNull()
    const blob = await page.evaluate(() => window.__blobs.filter((b) => b.type === 'application/zip').pop())
    expect(blob, 'no ZIP came out').toBeTruthy()
    const zip = await JSZip.loadAsync(await bytesOf(page, blob.url))
    const names = Object.keys(zip.files).sort()
    expect(names.length, 'the ZIP holds a different number of files than the page says').toBe(Number(said[1]))
    expect(names.length).toBeGreaterThanOrEqual(8)
    expect(names.every((n) => /^clip-\d{4}\.png$/.test(n)), `names: ${names.slice(0, 3)}`).toBe(true)
    expect(names[0]).toBe('clip-0001.png')
    const first = await zip.file(names[0]).async('nodebuffer')
    expect(first.subarray(1, 4).toString(), 'the first file is not a PNG').toBe('PNG')
    expect([first.readUInt32BE(16), first.readUInt32BE(20)], 'the PNG is not the output size').toEqual([80, 50])
    const last = await zip.file(names[names.length - 1]).async('nodebuffer')
    expect([last.readUInt32BE(16), last.readUInt32BE(20)]).toEqual([80, 50])
  })

  test('Sprite sheet (PNG): the sheet is the frame grid, columns by width and rows by height', async ({ page }) => {
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'Sprite sheet (PNG)' })
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await convert(page, 'Make sprite sheet')
    const note = await page.locator('section.fc-result .fc-note').first().innerText()
    const said = /(\d+) across, (\d+) down\. Each frame is (\d+) × (\d+) px/.exec(note)
    expect(said, `the result note reads "${note}"`).not.toBeNull()
    const [cols, rows, w, h] = said.slice(1).map(Number)
    expect([w, h]).toEqual([80, 50])
    const bytes = await bytesOf(page, await resultUrl(page, 'img[alt="Sprite sheet (PNG) result"]'))
    const sheet = await inspectImage(page, bytes, 'image/png', [['first-left', 20, 25], ['first-right', 60, 25]])
    expect([sheet.w, sheet.h], 'the sheet is not columns x width by rows x height').toEqual([cols * w, rows * h])
    expect(cols * rows).toBeGreaterThanOrEqual(8)
    expect(isRed(sheet.px['first-left']), `first cell, left, is ${sheet.px['first-left']}`).toBe(true)
    expect(isBlue(sheet.px['first-right']), `first cell, right, is ${sheet.px['first-right']}`).toBe(true)
  })

  test('the frame count the page promises is the count in the ZIP, for a clip whose length is known', async ({ page }) => {
    // The recorded webm has no length in its header, so the browser and the engine can
    // differ by a frame on it. An MP4 made by the converter has the length in its header.
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'MP4 (H.264)' })
    await convert(page, 'Convert to MP4 (H.264)')
    const mp4 = await bytesOf(page, await resultUrl(page, 'video[aria-label="MP4 (H.264) result"]'))
    test.skip(!(await playsH264(page)), 'this browser cannot play H.264, so an MP4 cannot be loaded back in')
    await page.getByRole('button', { name: 'Choose different file' }).click()
    await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'known.mp4', mimeType: 'video/mp4', buffer: mp4 })
    await expect(page.getByLabel('Width (px)'), 'the MP4 never loaded').toBeVisible({ timeout: 15000 })
    await chooseMenuOption(page, page.locator('#fc-vid-format'), { label: 'Frames (ZIP of PNGs)' })
    await page.locator('#fc-vid-width').fill('80')
    await page.locator('#fc-vid-width').blur()
    await expect(page.locator('.fc-consequence')).toContainText(/\d+ PNGs · 80 × 50 px each/)
    const promised = Number(/(\d+) PNGs/.exec(await page.locator('.fc-consequence').innerText())[1])
    await convert(page, 'Make frames ZIP')
    const blob = await page.evaluate(() => window.__blobs.filter((b) => b.type === 'application/zip').pop())
    const zip = await JSZip.loadAsync(await bytesOf(page, blob.url))
    expect(Object.keys(zip.files).length, 'the page promised a different number of frames than the ZIP holds').toBe(promised)
    expect(promised).toBeGreaterThanOrEqual(10)
  })
})
