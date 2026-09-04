// The image → palette picker, measured as geometry.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FAULT
// ─────────────────────────────────────────────────────────────────────────────
// The founder reported that the popup was "too small and not centred, so you
// can't see where the sample markers are being placed on the image". The size
// was real. Underneath it was a worse fault that the size was hiding:
//
// Every picker point is stored as a NORMALISED COORDINATE IN THE SOURCE IMAGE
// (`dominantSwatches` divides its centroid by the source width/height), and
// rendered as a PERCENTAGE OF THE STAGE BOX. Those two describe the same place
// only while the two shapes match. The stage was a hard `aspect-ratio: 16/10`
// with `object-fit: cover`, so any image that was not 16/10 was cropped — and
// the markers then sat over pixels they had never sampled. Dragging one was
// worse still: `moveImagePoint` takes the cursor's fraction of the BOX and
// samples the SOURCE at that fraction, so on a 4:1 image dropping a marker at
// 12.5% across sampled the source at 12.5% while the pixel actually under the
// cursor was at 35%.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE ORACLE IS A RE-DERIVED `cover` MAPPING AND NOT AN APP CONSTANT
// ─────────────────────────────────────────────────────────────────────────────
// Asserting "the marker's x equals the point's x" would be tautological — both
// come from the same `p.x`. So the check below goes the other way round: it
// measures the stage box and the image's natural size, works out from the CSS
// `object-fit: cover` rules WHICH SOURCE PIXEL IS PAINTED UNDER THE MARKER'S
// CENTRE, reads that pixel off a canvas, and compares it to the colour the
// marker claims to have sampled. Nothing in that chain reads app code, and it
// is red on the old stage (a marker on the red band reports red while sitting
// over the green one) and green on the fixed one.
import zlib from 'node:zlib'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// ── A four-band 4:1 test image ───────────────────────────────────────────────
// 4:1 is chosen so the old fixed 16/10 stage cropped hard (it showed only the
// middle 40% of the width), and four flat bands mean every marker has an
// unambiguous right answer.
const BANDS = ['#E02020', '#20A020', '#2040E0', '#E0C020']
const IMG_W = 400
const IMG_H = 100

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** A minimal truecolour PNG of vertical bands — there is no image library here. */
function bandedPng() {
  const raw = Buffer.alloc(IMG_H * (1 + IMG_W * 3))
  for (let y = 0; y < IMG_H; y++) {
    const row = y * (1 + IMG_W * 3)
    raw[row] = 0 // filter: none
    for (let x = 0; x < IMG_W; x++) {
      const hex = BANDS[Math.floor((x / IMG_W) * BANDS.length)]
      const o = row + 1 + x * 3
      raw[o] = parseInt(hex.slice(1, 3), 16)
      raw[o + 1] = parseInt(hex.slice(3, 5), 16)
      raw[o + 2] = parseInt(hex.slice(5, 7), 16)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(IMG_W, 0); ihdr.writeUInt32BE(IMG_H, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const STAGE = '.plb-imgstage'
const MARKER = '.plb-imgpoint'
const DIALOG = 'Pull colours from an image'

async function openPickerWithImage(page) {
  await go(page, '/create/palette')
  await page.getByRole('button', { name: 'Image', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await expect(dialog).toBeVisible()
  await page.locator('.plb-file').setInputFiles({
    name: 'bands.png', mimeType: 'image/png', buffer: bandedPng(),
  })
  await expect(page.locator(STAGE)).toBeVisible()
  await expect(page.locator(MARKER).first()).toBeVisible()
  return dialog
}

/**
 * For every marker: the colour it CLAIMS, and the colour actually painted
 * under it — derived from the box, the image's natural size and the CSS
 * `object-fit: cover` rules, then read off a canvas.
 */
async function markerTruth(page) {
  return page.evaluate(async ({ stageSel, markerSel }) => {
    const stage = document.querySelector(stageSel)
    const img = stage.querySelector('img')
    const box = stage.getBoundingClientRect()

    // `cover`: scale until both axes are filled, centre, and let the overflow
    // hang off both ends of the longer axis. Straight from the spec, not from
    // anything the app computes.
    const nW = img.naturalWidth
    const nH = img.naturalHeight
    const scale = Math.max(box.width / nW, box.height / nH)
    const offX = (box.width - nW * scale) / 2
    const offY = (box.height - nH * scale) / 2

    const canvas = document.createElement('canvas')
    canvas.width = nW; canvas.height = nH
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const px = ctx.getImageData(0, 0, nW, nH)
    const at = (x, y) => {
      const cx = Math.min(nW - 1, Math.max(0, Math.round(x)))
      const cy = Math.min(nH - 1, Math.max(0, Math.round(y)))
      const i = (cy * nW + cx) * 4
      return [px.data[i], px.data[i + 1], px.data[i + 2]]
    }

    return [...document.querySelectorAll(markerSel)].map((m) => {
      const r = m.getBoundingClientRect()
      const cx = r.left + r.width / 2 - box.left
      const cy = r.top + r.height / 2 - box.top
      return {
        claims: m.dataset.hex.toUpperCase(),
        painted: at((cx - offX) / scale, (cy - offY) / scale),
        // Kept for the failure message: where in the box the marker sits.
        at: [Number((cx / box.width).toFixed(3)), Number((cy / box.height).toFixed(3))],
      }
    })
  }, { stageSel: STAGE, markerSel: MARKER })
}

/** Per-channel distance between a marker's claimed hex and a painted pixel. */
function drift(m) {
  const c = [1, 3, 5].map(i => parseInt(m.claims.slice(i, i + 2), 16))
  return Math.max(...c.map((v, i) => Math.abs(v - m.painted[i])))
}

// The app's own sampling canvas downscales the source to 320px wide, so a hex
// read back from it drifts a little from the exact band colour. Every point
// measured here sits mid-band, well clear of an edge.
const TOLERANCE = 20

test.describe('image to palette picker', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'designer pulling colours from a photo') })

  test('the picker opens centred, and large enough to aim in', async ({ page }) => {
    const dialog = await openPickerWithImage(page)
    const card = dialog.locator('.plb-imgcard')
    const box = await card.boundingBox()
    const view = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))
    // Centred on both axes, not hanging off a toolbar button.
    expect(Math.abs((box.x + box.width / 2) - view.w / 2)).toBeLessThan(2)
    expect(Math.abs((box.y + box.height / 2) - view.h / 2)).toBeLessThan(2)
    // The old dropdown was min-width:300px. Anything near that is the bug.
    expect(box.width).toBeGreaterThan(600)
  })

  test('the stage takes the shape of the image, not a fixed 16/10 box', async ({ page }) => {
    await openPickerWithImage(page)
    const ratio = await page.locator(STAGE).evaluate((el) => {
      const r = el.getBoundingClientRect()
      return r.width / r.height
    })
    expect(ratio).toBeGreaterThan((IMG_W / IMG_H) * 0.98)
    expect(ratio).toBeLessThan((IMG_W / IMG_H) * 1.02)
  })

  test('every marker sits on the colour it says it sampled', async ({ page }) => {
    await openPickerWithImage(page)
    const markers = await markerTruth(page)
    expect(markers.length).toBeGreaterThanOrEqual(BANDS.length)
    for (const m of markers) {
      expect(drift(m), 'marker claiming ' + m.claims + ' at ' + m.at + ' is painted rgb(' + m.painted + ')').toBeLessThanOrEqual(TOLERANCE)
    }
  })

  // The drag path has its own mapping (`moveImagePoint` divides the cursor by
  // the box rect), so it can be wrong independently of where the markers render.
  test('dragging a marker samples the pixel under the cursor', async ({ page }) => {
    await openPickerWithImage(page)
    const box = await page.locator(STAGE).boundingBox()
    const marker = page.locator(MARKER).first()
    const from = await marker.boundingBox()

    // 12.5% across — the middle of the FIRST band on the fixed stage, and inside
    // the SECOND band on the old cropped one. The two answers differ, which is
    // the point of choosing it.
    const targetX = box.x + box.width * 0.125
    const targetY = box.y + box.height * 0.5
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetX, targetY, { steps: 8 })
    await page.mouse.up()

    const dragged = (await markerTruth(page)).find(m => Math.abs(m.at[0] - 0.125) < 0.02)
    expect(dragged, 'the dragged marker did not land where it was dropped').toBeTruthy()
    expect(drift(dragged), 'dropped on band 1 but reported ' + dragged.claims).toBeLessThanOrEqual(TOLERANCE)
  })

  // The picker moved out of the toolbar's dismiss layer (which closes anything
  // whose pointerdown misses a .plb-menuwrap — i.e. every press inside this
  // dialog, dragging included). What replaced it has to actually work.
  test('Escape closes it and a press on the scrim closes it', async ({ page }) => {
    await openPickerWithImage(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: DIALOG })).toHaveCount(0)

    await page.getByRole('button', { name: 'Image', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: DIALOG })
    await expect(dialog).toBeVisible()
    // Left edge, vertically centred: the card is 720px wide on a 1440px
    // viewport, so this is scrim. NOT the top-left corner — the nav sits above
    // the modal there and swallows the press.
    const view = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))
    await page.mouse.click(10, Math.round(view.h / 2))
    await expect(dialog).toHaveCount(0)
  })
})
