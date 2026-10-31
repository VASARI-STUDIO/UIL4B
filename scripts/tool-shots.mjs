// Measures the real File Converter for the drawn plate on /tools.
//
//   npm run tools:shots                       build in test mode, then preview and measure
//   npm run tools:shots -- --dist=dist-x      measure a build that already exists (no build)
//
// Opens /create/file-converter in Chromium, adds the sample photo as a lossless PNG
// (decoded from the WebP in the browser, so no second copy is committed), converts
// it to WebP and reads the result line the tool prints ("2.41 MB → 120.3 KB").
// Writes src/components/spectrum/toolMeasured.json, which ToolArt imports for the
// saving and the bar lengths. Nothing reaches the network; the browser runs signed
// out. Run by hand; not part of CI. The output is committed.
//
// Exits 1 when the page is still loading or the result line is not the shape expected.

import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(root, 'src', 'components', 'spectrum', 'toolMeasured.json')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const SAMPLE_IMAGE = path.join(root, 'public', 'spectrum', 'tasmanian-sunset.webp')
const QUALITY = 80
const SOURCE_FORMAT = 'PNG' // what the tool is given: the photo saved losslessly, as a PNG export would be
const OUTPUT_FORMAT = 'WebP'

const fail = (msg) => { throw new Error(msg) }
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
  })
}

async function startPreview(dist) {
  const port = await freePort()
  const child = spawn(process.execPath, [viteBin, 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${base}/`)).ok) return { child, base } } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  child.kill()
  return fail('vite preview did not answer within 30s')
}

async function measure(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 864 }, locale: 'en-AU', baseURL: base, reducedMotion: 'reduce' })
  try {
    // Anything off-site would make a measurement depend on the network.
    await ctx.route((u) => !['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol.startsWith('http'), (r) => r.abort())
    const page = await ctx.newPage()
    await page.goto('/create/file-converter', { waitUntil: 'domcontentloaded' })
    const webp = (await fs.readFile(SAMPLE_IMAGE)).toString('base64')
    const png = await page.evaluate(async (b64) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/webp;base64,${b64}`)).blob())
      const c = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height })
      c.getContext('2d').drawImage(bmp, 0, 0)
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    }, webp)
    await page.locator('input[type=file]').first().setInputFiles({ name: 'tasmanian-sunset.png', mimeType: 'image/png', buffer: Buffer.from(png) })
    await page.locator('input[type=range]').first().fill(String(QUALITY))
    await page.getByRole('button', { name: /^Convert 1 image/ }).click()
    const line = page.locator('.fc-card .fc-meta', { hasText: '→' })
    await line.waitFor({ timeout: 30000 })
    const text = (await line.first().innerText()).replace(/\s+/g, ' ')
    const m = /([\d.]+) (KB|MB) → ([\d.]+) (KB|MB)/.exec(text)
    if (!m) fail(`the result line is not "<n> KB|MB → <n> KB|MB": ${text}`)
    const kb = (n, unit) => Math.round(Number(n) * (unit === 'MB' ? 1024 : 1) * 10) / 10
    return { before: kb(m[1], m[2]), after: kb(m[3], m[4]) }
  } finally {
    await ctx.close()
  }
}

async function main() {
  let dist = args.dist
  if (!dist) {
    dist = 'dist-tool-shots'
    console.log('building in test mode...')
    execFileSync(process.execPath, [viteBin, 'build', '--mode', 'test', '--outDir', dist], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
  }
  const server = await startPreview(dist)
  let browser
  try {
    browser = await chromium.launch()
    const { before, after } = await measure(browser, server.base)
    if (!(after > 0 && after < before)) fail(`no saving measured: ${before} KB -> ${after} KB`)
    const json = { fileConverter: { source: { format: SOURCE_FORMAT, kb: before }, output: { format: OUTPUT_FORMAT, quality: QUALITY, kb: after } } }
    await fs.writeFile(OUT, `${JSON.stringify(json, null, 2)}\n`)
    console.log(`wrote ${path.relative(root, OUT)}: ${before} KB -> ${after} KB`)
  } finally {
    await browser?.close()
    server.child.kill()
  }
}

main().catch((err) => {
  console.error(`tool-shots: ${err.message}`)
  process.exit(1)
})
