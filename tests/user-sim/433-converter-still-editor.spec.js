// FILE CONVERTER, IMAGE TAB: THE STILL EDITOR.
//
// Someone with a 1024 x 768 picture wants a 400 x 400 icon with rounded corners,
// and a photo under a size limit. Downloads are behind the account gate, so this
// reads the file the page made: every blob the page turns into a URL is kept, and
// the last one after Convert is the output, which is opened and measured.
//
// THE PICTURE: 1024 x 768, red on the left half, blue on the right half, with a
// fixed pseudo-random speckle so a lossy encode has real work to do.
//
// MUTATIONS (each makes a test below go red):
//   - stillEdit.js, drawStill(): skip the `ctx.clip()` for the rounded rectangle -> the corner
//     alpha is 255 and the corners test goes red.
//   - stillEdit.js, planStill(): treat 'fill' like 'fit' -> the Fill test sees bars (alpha 0 at the
//     middle of an edge) instead of picture and goes red.
//   - fitUnderBytes.js, largestUnder(): return the highest value without testing it -> the
//     fit-under-KB test sees a file over the limit and goes red.
//   - FileConverter.jsx, the `format` line: drop `roundedForcesPng` -> the JPEG test gets a
//     JPEG with opaque corners and goes red.
import { test, expect } from './base.js'
import { chooseMenuOption, go, watch } from './helpers.js'

const PERSONA = 'someone making a rounded 400 x 400 icon and a photo under a size limit'
const SRC = { w: 1024, h: 768 }

/** Remember every blob the page turns into a URL; the last one after Convert is the output. */
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

/** The fixture as PNG bytes, drawn in the page so no binary file lives in the repo. */
async function makePicture(page, { w, h }) {
  const bytes = await page.evaluate(async ({ w, h }) => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const c = canvas.getContext('2d')
    c.fillStyle = '#f24040'; c.fillRect(0, 0, w / 2, h)
    c.fillStyle = '#1c40f2'; c.fillRect(w / 2, 0, w / 2, h)
    const img = c.getImageData(0, 0, w, h)
    let seed = 7
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const n = ((seed >> 16) & 63) - 32
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + n))
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n))
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n))
    }
    c.putImageData(img, 0, 0)
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }, { w, h })
  return Buffer.from(bytes)
}

async function openWithPicture(page) {
  await go(page, '/create/file-converter')
  const buffer = await makePicture(page, SRC)
  await page.locator('.fc-drop input[type="file"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer })
  await expect(page.getByRole('button', { name: 'Convert 1 image', exact: true }), 'the picture never loaded').toBeVisible({ timeout: 15000 })
  // The size readout appears once the picture's own size is read.
  await expect(page.locator('.fc-outsize-v')).toContainText('1024×768', { timeout: 15000 })
}

/** A typed number is taken on blur. */
async function type(page, id, value) {
  const field = page.locator(id)
  await field.fill(String(value))
  await field.blur()
  await expect(field).toHaveValue(String(value))
}

async function convert(page) {
  await page.getByRole('button', { name: 'Convert 1 image', exact: true }).click()
  await expect(page.locator('.fc-card .fc-dl'), 'no result came out').toBeVisible({ timeout: 60_000 })
}

/** Open the last blob the page made and report its type, size and the pixels at the points. */
async function inspectOutput(page, points) {
  return page.evaluate(async (pts) => {
    const last = window.__blobs.at(-1)
    const blob = await (await fetch(last.url)).blob()
    const bmp = await createImageBitmap(blob)
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bmp, 0, 0)
    const px = {}
    for (const [name, x, y] of pts) px[name] = Array.from(ctx.getImageData(x, y, 1, 1).data)
    return { type: blob.type, bytes: blob.size, w: bmp.width, h: bmp.height, px }
  }, points)
}

const isRed = ([r, g, b, a]) => a === 255 && r > 150 && g < 120 && b < 120
const isBlue = ([r, g, b, a]) => a === 255 && b > 150 && r < 120 && g < 140

for (const width of [390, 1440]) {
  test.describe(`Image tab, still editor at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(120_000)
      watch(page, PERSONA)
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
      await rememberBlobs(page)
      await openWithPicture(page)
    })

    test('1024 x 768 saves as 400 x 400, filled, with 24 px rounded corners and nothing outside them', async ({ page }) => {
      await chooseMenuOption(page, page.getByLabel('Output format'), { label: 'PNG' })
      await type(page, '#fc-img-out-w', 400)
      await type(page, '#fc-img-out-h', 400)
      await expect(page.getByRole('radiogroup', { name: 'Fit to size' }).getByRole('radio', { name: 'Fill', exact: true })).toBeChecked()
      await type(page, '#fc-img-radius', 24)
      await expect(page.locator('.fc-outsize-v')).toContainText('400×400')
      await convert(page)
      const o = await inspectOutput(page, [['corner', 0, 0], ['corner-far', 399, 399], ['edge', 200, 0], ['left', 60, 200], ['right', 340, 200], ['centre', 200, 200]])
      expect(o.type).toBe('image/png')
      expect([o.w, o.h], 'the output is the wrong size').toEqual([400, 400])
      expect(o.px.corner[3], 'the corner is not transparent').toBe(0)
      expect(o.px['corner-far'][3], 'the far corner is not transparent').toBe(0)
      expect(o.px.edge[3], 'the middle of the top edge should be picture').toBe(255)
      expect(o.px.centre[3], 'the centre is not opaque').toBe(255)
      // Fill trims the sides of a wide picture, so both halves still show.
      expect(isRed(o.px.left), `left is ${o.px.left}`).toBe(true)
      expect(isBlue(o.px.right), `right is ${o.px.right}`).toBe(true)
      await expect(page.locator('.fc-card .fc-meta').first()).toContainText('400×400')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
    })

    test('rounded corners on a JPEG choice are said to save as PNG, and do', async ({ page }) => {
      await chooseMenuOption(page, page.getByLabel('Output format'), { label: 'JPEG' })
      await type(page, '#fc-img-radius', 24)
      await expect(page.getByText('Rounded corners need transparency, so this saves as PNG.')).toBeVisible()
      await convert(page)
      const o = await inspectOutput(page, [['corner', 0, 0], ['centre', 512, 384]])
      expect(o.type).toBe('image/png')
      expect(o.px.corner[3], 'the corner is not transparent').toBe(0)
      expect(o.px.centre[3]).toBe(255)
    })

    test('Fit under a size: a WebP comes out at or under the limit, and the card says by how much', async ({ page }) => {
      await chooseMenuOption(page, page.getByLabel('Output format'), { label: 'WebP' })
      await page.locator('#fc-img-fit-on').click()
      await expect(page.locator('#fc-img-fit-on')).toHaveAttribute('aria-pressed', 'true')
      await type(page, '#fc-img-fit-kb', 60)
      await convert(page)
      const o = await inspectOutput(page, [['centre', 512, 384]])
      expect(o.type).toBe('image/webp')
      expect(o.bytes, `the file is ${o.bytes} bytes`).toBeLessThanOrEqual(60 * 1024)
      expect([o.w, o.h]).toEqual([SRC.w, SRC.h])
      await expect(page.locator('.fc-card')).toContainText('Under 60.0 KB')
    })

    test('Fit under a size that cannot be reached says so and gives the smallest result', async ({ page }) => {
      await chooseMenuOption(page, page.getByLabel('Output format'), { label: 'WebP' })
      await page.locator('#fc-img-fit-on').click()
      await type(page, '#fc-img-fit-kb', 1)
      await convert(page)
      await expect(page.locator('.fc-card')).toContainText('Couldn’t reach 1.0 KB. Smallest was')
    })
  })
}
