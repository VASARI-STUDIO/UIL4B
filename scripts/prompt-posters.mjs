// Capture one poster image per community-prompt preview page.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY POSTERS AND NOT TWENTY LIVE IFRAMES
// ─────────────────────────────────────────────────────────────────────────────
// The founder asked for the card to show the OUTPUT rather than the prompt
// text, and "even better" for a click to open the real thing running. Twenty
// live iframes on one page is not that — it is twenty documents, twenty style
// recalcs and, for c-16, twenty canvases running a particle simulation. So the
// grid gets a still and the click gets the running page.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE PAGES ARE SERVED RATHER THAN OPENED FROM DISK
// ─────────────────────────────────────────────────────────────────────────────
// Chromium treats every file:// document as its own opaque origin, which is
// fine here, but the preview iframe in the product will load these over http
// and a poster taken under a different protocol can differ (fonts, gradients
// with relative references). Same transport as production, so the still matches
// what the click opens.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE SETTLE, WHICH IS THE WHOLE DIFFICULTY
// ─────────────────────────────────────────────────────────────────────────────
// These pages animate on entry. A screenshot at load catches c-13's product
// mid-rise and c-18's shimmer at its blank end of the sweep. Two things
// together fix it and neither alone does:
//
//   1. REDUCED MOTION IS EMULATED. Every page in this set was built so that
//      with motion reduced it presents its FINISHED state — that was a hard
//      requirement in the brief, verified per page in a browser. So the poster
//      is taken of the state the page is designed to hold, not of a frame
//      caught mid-transition. It also means the poster matches what a reader
//      with motion reduced actually sees when they open it.
//   2. A SETTLE WAIT afterwards, because `animation: none` does not rewind a
//      canvas that has already been asked to draw, and c-16 seeds its field
//      over the first few frames.
//
// Scroll-driven pages (c-15 is 230vh, c-19 ~4600px) are captured at scroll 0
// deliberately: their hero at rest is a composed image by design, and it is
// what the reader meets first.
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const PAGES = path.join(ROOT, 'public/previews/prompts')
const OUT = path.join(ROOT, 'public/previews/prompts/poster')

// The COMPOSITION is captured at 1280 — these pages lay out for a desktop and
// a narrow capture would be a different design, not a smaller picture of the
// same one. The FILE is then drawn down to 960 wide, which is 2x a 480px card
// slot: sharp on a retina screen, and a third of the pixels.
const WIDTH = 1280
const HEIGHT = 800
const OUT_WIDTH = 960
const QUALITY = 0.72
const SETTLE_MS = 900

// WEBP WITHOUT A NEW DEPENDENCY. Playwright only emits png or jpeg, and there
// is no sharp in this project. Chromium itself encodes WebP through a canvas —
// the same route src/pages/FileConverter.jsx takes in the browser — so the PNG
// is handed back into a blank page, drawn down to OUT_WIDTH and read out as
// WebP. One extra page for the whole run, no install, and the downscale comes
// free in the same draw.
async function toWebp(ctx, pngBuffer, outWidth, quality) {
  const page = await ctx.newPage()
  try {
    await page.goto('about:blank')
    const b64 = await page.evaluate(async ({ src, w, q }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const scale = w / img.naturalWidth
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const g = canvas.getContext('2d')
      g.imageSmoothingEnabled = true
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, 0, 0, canvas.width, canvas.height)
      const url = canvas.toDataURL('image/webp', q)
      if (!url.startsWith('data:image/webp')) throw new Error('this Chromium did not encode WebP')
      return url.slice(url.indexOf(',') + 1)
    }, { src: `data:image/png;base64,${pngBuffer.toString('base64')}`, w: outWidth, q: quality })
    return Buffer.from(b64, 'base64')
  } finally {
    await page.close()
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' }

function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0])
      const file = path.join(dir, rel)
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('not found')
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

const files = fs.readdirSync(PAGES)
  .filter((f) => /^c-\d+\.html$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

if (!files.length) {
  console.error('prompt-posters: no preview pages found in public/previews/prompts')
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })

const { server, port } = await serve(PAGES)
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  // See the header: the finished state is the one worth photographing.
  reducedMotion: 'reduce',
})

let total = 0
const report = []
try {
  for (const file of files) {
    const id = file.replace('.html', '')
    const page = await context.newPage()
    const problems = []
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('requestfailed', (r) => {
      const u = r.url()
      if (!u.startsWith(`http://127.0.0.1:${port}`)) problems.push(`external request: ${u}`)
    })
    // Nothing in this set may reach the network. If one ever does, the poster
    // run is where it shows up, because every other check reads source.
    await page.route('**/*', (route) => {
      const u = route.request().url()
      if (u.startsWith(`http://127.0.0.1:${port}`) || u.startsWith('data:')) return route.continue()
      problems.push(`BLOCKED external: ${u}`)
      return route.abort()
    })

    await page.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'load' })
    await page.waitForTimeout(SETTLE_MS)

    const png = await page.screenshot({ type: 'png', scale: 'css' })
    await page.close()
    const webp = await toWebp(context, png, OUT_WIDTH, QUALITY)
    const out = path.join(OUT, `${id}.webp`)
    fs.writeFileSync(out, webp)
    const bytes = webp.length
    total += bytes
    report.push({ id, kb: bytes / 1024, problems })
  }
} finally {
  await browser.close()
  server.close()
}

// ── THE MANIFEST ─────────────────────────────────────────────────────────────
// Which prompts have a preview is written HERE rather than typed into src/,
// because a hand-kept list goes stale the first time somebody adds a prompt and
// does not remember there is a second place to edit. The UI imports this file;
// tests/unit/prompt-preview-assets.test.js fails if it disagrees with the files
// on disk or with the prompt ids in communityPrompts.js.
//
// A prompt that is NOT listed has no preview, and the card falls back to
// showing the prompt text — which is what every user-submitted prompt does.
const ids = report.map((r) => r.id)
const lines = [
  '// GENERATED by scripts/prompt-posters.mjs. Do not edit by hand.',
  '//',
  '// Which community prompts have a built output preview: a self-contained page',
  '// at /previews/prompts/<id>.html and a poster still at',
  '// /previews/prompts/poster/<id>.webp.',
  '//',
  '// Regenerate with: node scripts/prompt-posters.mjs',
  '//',
  '// A prompt not listed here has no preview and its card shows the prompt text',
  '// instead, which is also what every user-submitted prompt does.',
  '',
  'export const PROMPT_PREVIEW_IDS = Object.freeze([',
  ...ids.map((id) => `  '${id}',`),
  '])',
  '',
  'export const promptPosterSrc = (id) => `/previews/prompts/poster/${id}.webp`',
  'export const promptPageSrc = (id) => `/previews/prompts/${id}.html`',
  'export const hasPromptPreview = (id) => PROMPT_PREVIEW_IDS.includes(id)',
  '',
]
fs.writeFileSync(path.join(ROOT, 'src/data/promptPreviewAssets.js'), lines.join('\n'))
console.log(`prompt-posters: manifest lists ${ids.length} previews`)

console.log(`prompt-posters: wrote ${report.length} posters, composed at ${WIDTH}x${HEIGHT}, emitted ${OUT_WIDTH} wide, ${(total / 1024).toFixed(0)} KB total`)
for (const r of report) {
  const flag = r.problems.length ? `  ⚠ ${r.problems.join(' | ')}` : ''
  console.log(`  ${r.id.padEnd(5)} ${r.kb.toFixed(1).padStart(6)} KB${flag}`)
}
const anyProblem = report.filter((r) => r.problems.length)
if (anyProblem.length) {
  console.error(`\nprompt-posters: ${anyProblem.length} page(s) reported a problem — see above`)
  process.exit(1)
}
