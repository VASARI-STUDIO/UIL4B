// Render the homepage share image. `npm run og:home` after a build, or
//
//   node scripts/render-home-og.mjs --dist=dist-x --out=public/og/home.jpg
//
// GENERATED AND COMMITTED, like the section cards in scripts/og-cards.mjs, and
// for the same reason: Chromium stays off the deploy path. The picture is the
// app's own: the built `/` is opened with motion off, which parks the hero loop
// on its finished Export frame (src/components/spectrum/reducedMotion.js feeds
// useLoop's `settleK`), and the headline and that panel are captured from the
// page and set on the ground colour at 1200x630. Nothing is drawn by hand, so a
// change to the hero shows up the next time this runs.
//
// The panel is cropped by the bottom edge on purpose: at 1200 wide a whole
// 1296x600 panel under a two-line headline would leave neither readable.
import { chromium } from '@playwright/test'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const dist = path.resolve(root, args.dist || 'dist')
const out = path.resolve(root, args.out || 'public/og/home.jpg')
const QUALITY = Number(args.quality || 92)

// Every unfurler crops to 1200x630.
const W = 1200
const H = 630
// The hero's own ground (index.html's critical dark block), which the page
// paints behind the headline and which the panel sits on.
const GROUND = '#060607'
// Where the headline sits, how wide the panel is drawn, and where its top edge
// starts, in card pixels.
const H1_TOP = 52
const H1_WIDTH = 700
const PANEL_WIDTH = 1080
const PANEL_TOP = 196

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.txt': 'text/plain', '.ico': 'image/x-icon',
}

// A static server over the build. Anything that is not a file is answered with
// the shell, the way the host's catch-all does for the client router.
function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(dir, rel)
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(dir, 'index.html')
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function main() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error(`render-home-og: ${dist} has no index.html. Build first.`)
  }
  const server = await serve(dist)
  const browser = await chromium.launch()
  try {
    // Captured at twice the card's scale so the browser's downscale, not a
    // blurry upscale, is what the card shows.
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' })

    const panel = page.locator('.hh-loop')
    await panel.waitFor()
    // The loop is a lazy chunk: the panel exists before the loop does.
    await page.locator('.lp-root').waitFor()
    // Page art out of the way, so each capture sits on the flat ground.
    await page.addStyleTag({ content: '.hh-glow, .sp-grain { display: none !important }' })
    await page.evaluate(() => document.fonts.ready)
    // Every image in the panel decoded: a half-loaded preview is a blank card.
    await page.waitForFunction(() => [...document.querySelectorAll('.hh-loop img')]
      .every((img) => img.complete && img.naturalWidth > 0))
    await page.waitForTimeout(1500)

    const h1 = await page.locator('h1.hh-h1').screenshot()
    const loop = await panel.screenshot()

    // Composed in a blank page so the downscale and the JPEG encode are the
    // browser's. The headline is centred; the panel is centred and cut off by
    // the bottom edge.
    // A context of its own at 1x, so the file is the card's size and not twice it.
    const cardContext = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
    const card = await cardContext.newPage()
    const url = (buf) => `data:image/png;base64,${buf.toString('base64')}`
    await card.setContent(`<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; background: ${GROUND}; overflow: hidden }
  img { position: absolute; left: 50%; transform: translateX(-50%); display: block }
  .h1 { top: ${H1_TOP}px; width: ${H1_WIDTH}px }
  .loop { top: ${PANEL_TOP}px; width: ${PANEL_WIDTH}px }
</style>
<img class="h1" src="${url(h1)}" alt="">
<img class="loop" src="${url(loop)}" alt="">`)
    await card.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))

    fs.mkdirSync(path.dirname(out), { recursive: true })
    await card.screenshot({ path: out, type: 'jpeg', quality: QUALITY, clip: { x: 0, y: 0, width: W, height: H } })
    const kb = (fs.statSync(out).size / 1024).toFixed(1)
    console.log(`render-home-og: wrote ${path.relative(root, out)} (${W}x${H}, ${kb} KB)`)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
