// Encode the shared film-grain tile. `node scripts/make-grain-tile.mjs`.
//
// GENERATED AND COMMITTED, like scripts/og-cards.mjs: the output
// public/textures/grain-256.webp is a checked-in artefact and this script is
// its source of truth. Chromium lives here and nowhere else, so nothing on the
// build path needs a browser.
//
// The pixels come from makeGrainTile() in src/utils/gradientStyles.js, the same
// function the image painter reads, so the tile on screen (this WebP) and the
// tile in an exported image are one noise field. The browser's canvas does the
// WebP encode. The search below keeps the highest quality that fits the byte
// budget, then decodes the result and compares its spread to the source: lossy
// compression softens noise, and the CSS grain opacity assumes the source's
// spread.
//
//   node scripts/make-grain-tile.mjs            write the file
//   node scripts/make-grain-tile.mjs --check    measure only, write nothing
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GRAIN_SIZE, GRAIN_TILE_SIGMA, makeGrainTile, grainSigma } from '../src/utils/gradientStyles.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(root, 'public', 'textures', 'grain-256.webp')
const BUDGET = 48 * 1024
const checkOnly = process.argv.includes('--check')

const stats = (px) => {
  const n = px.length
  const mean = px.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(px.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  return { mean, sd }
}

const tile = makeGrainTile()
const source = Array.from(tile.data)

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const result = await page.evaluate(async ({ size, grey, budget }) => {
    const rgba = new Uint8ClampedArray(size * size * 4)
    for (let i = 0; i < grey.length; i++) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = grey[i]
      rgba[i * 4 + 3] = 255
    }
    const canvas = new OffscreenCanvas(size, size)
    canvas.getContext('2d').putImageData(new ImageData(rgba, size, size), 0, 0)
    const encode = async (q) => new Uint8Array(await (await canvas.convertToBlob({ type: 'image/webp', quality: q })).arrayBuffer())
    // Largest quality (in 0.01 steps) whose file fits the budget.
    let lo = 0
    let hi = 100
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if ((await encode(mid / 100)).length <= budget) lo = mid
      else hi = mid - 1
    }
    const bytes = await encode(lo / 100)
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/webp' }))
    const back = new OffscreenCanvas(size, size)
    const c = back.getContext('2d')
    c.drawImage(bmp, 0, 0)
    const data = c.getImageData(0, 0, size, size).data
    const decoded = []
    for (let i = 0; i < size * size; i++) decoded.push(data[i * 4])
    return { quality: lo / 100, bytes: Array.from(bytes), decoded }
  }, { size: GRAIN_SIZE, grey: source, budget: BUDGET })

  const src = stats(source)
  const dec = stats(result.decoded)
  const buf = Buffer.from(result.bytes)
  const decodedTile = { size: GRAIN_SIZE, data: Uint8ClampedArray.from(result.decoded) }
  console.log(`quality ${result.quality}  ${buf.length} bytes (budget ${BUDGET})`)
  console.log(`source   mean ${src.mean.toFixed(2)}  sd ${src.sd.toFixed(2)}  (GRAIN_TILE_SIGMA ${GRAIN_TILE_SIGMA} x 255 = ${(GRAIN_TILE_SIGMA * 255).toFixed(2)})`)
  console.log(`decoded  mean ${dec.mean.toFixed(2)}  sd ${dec.sd.toFixed(2)}  ratio ${(dec.sd / src.sd).toFixed(3)}`)
  console.log(`soft-light swing on #808080: source ${grainSigma({ ...tile, sigma: 0 }).toFixed(5)}  decoded ${grainSigma(decodedTile).toFixed(5)}`)
  const swingOf = grainSigma({ ...tile, sigma: 0 })
  console.log(`opacity for 10% grain: ${(0.1 / swingOf).toFixed(3)} from the source tile, ${(0.1 / grainSigma(decodedTile)).toFixed(3)} from the decoded file (must stay at or under 1)`)
  if (0.1 / swingOf > 1) console.log('10% grain would clamp: raise GRAIN_TILE_SIGMA.')
  if (result.quality < 0.05) console.log('Quality is very low: lower GRAIN_TILE_SIGMA or raise GRAIN_TILE_SOFTEN.')
  if (!checkOnly) {
    await mkdir(path.dirname(OUT), { recursive: true })
    await writeFile(OUT, buf)
    console.log(`wrote ${path.relative(root, OUT)}`)
  }
} finally {
  await browser.close()
}
