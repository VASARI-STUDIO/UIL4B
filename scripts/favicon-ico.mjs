// Draw public/favicon.ico from public/favicon.svg. `npm run icons:ico`.
//
// GENERATED AND COMMITTED, like the share cards: Chromium lives here, never on
// the build path. The ICO holds four PNG images (16, 32, 48 and 64px), each a
// render of the SVG at that size on a transparent ground, in brand blue. An ICO
// cannot follow the browser's colour scheme, and the SVG's near-black light ink
// all but vanishes on a dark tab strip, so the ICO takes a colour that reads on
// both light and dark tab strips.
//
// The SVG places the mark on a 4-unit grid at 16px (translate 8 16, scale .16
// in a 64 viewBox), so every straight edge lands on a whole pixel at 16, 32, 48
// and 64. Rendering from it keeps the ICO as sharp as the SVG. Moving the mark
// off that grid brings back the soft half-pixel edges a tab icon shows as blur.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BRAND_BLUE = '#2A60E8'
const LIGHT_INK = '#0f0f10'
// Swap the SVG's light-scheme ink for brand blue; the throw catches a favicon.svg edit that moves it.
const source = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8')
if (!source.includes(`.f{fill:${LIGHT_INK}}`)) throw new Error('favicon.svg no longer sets its light ink as .f{fill:#0f0f10}')
const svg = source.replace(`.f{fill:${LIGHT_INK}}`, `.f{fill:${BRAND_BLUE}}`)
const SIZES = [16, 32, 48, 64]

const browser = await chromium.launch()
const pngs = []
try {
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, colorScheme: 'light' })
    const src = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
    await page.setContent(`<body style="margin:0;background:transparent"><img src="${src}" width="${size}" height="${size}" style="display:block"></body>`)
    await page.locator('img').evaluate((img) => img.decode())
    pngs.push(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }))
    await page.close()
  }
} finally {
  await browser.close()
}

// ICONDIR, one ICONDIRENTRY per image, then the PNG bytes in order.
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)
let offset = 6 + 16 * pngs.length
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(SIZES[i] % 256, 0)
  e.writeUInt8(SIZES[i] % 256, 1)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(png.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += png.length
  return e
})
fs.writeFileSync(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...entries, ...pngs]))
console.log(`favicon.ico: ${SIZES.join(', ')}px, ${offset} bytes`)
