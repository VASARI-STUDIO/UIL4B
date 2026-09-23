// THE CONVERTER ENGINE, AND WHERE THE BROWSER ACTUALLY GOES TO GET IT.
//
// src/pages/FileConverter.jsx used to import `@ffmpeg/core` through Vite, which
// put a 32,129,114-byte wasm into dist/assets — 91% of everything we deploy,
// re-hashed on every deploy, and the reason the project hit Vercel's 10 GB
// Fast Origin Transfer limit. It now loads from a pinned jsDelivr URL.
//
// tests/unit/ffmpeg-core-off-origin.test.js proves the file is gone from the
// build. That is the easy half, and on its own it is the classic trap: the
// engine could be gone from dist AND the converter could be broken, and both
// tests would be green. So this file asserts the OTHER half — that the app
// really asks the CDN for the core, and that a real clip really converts with
// what comes back.
//
// ── WHY THE CDN IS FULFILLED LOCALLY ────────────────────────────────────────
// The route handler answers the jsDelivr URLs from node_modules/@ffmpeg/core,
// which is the same package at the same pinned version. That is deliberate on
// three counts: the suite must not pull 32 MB over the internet per test, it
// must not fail when jsDelivr is slow or a runner is offline, and the thing
// worth asserting is OUR wiring — the exact URL the app asks for — not
// jsDelivr's uptime. The handler is therefore also the assertion: if the app
// asks for anything else, nothing is served, the engine fails to load, and the
// conversion never produces a GIF.
//
// ── THE CLIP IS REAL, AND MADE HERE ─────────────────────────────────────────
// The input is recorded in the page with MediaRecorder over a canvas stream,
// so it is a genuine WebM the browser encoded, not a fixture blob whose
// provenance nobody can check. ffmpeg then has to demux and decode it before it
// can encode a GIF, which is the whole engine doing real work.
//
// ── SCOPE NOTE FOR THE BUILD-ASSET GUARD ────────────────────────────────────
// base.js watches requests under `/assets/` and voids a run where one fails to
// arrive. The CDN URL is not under /assets/ and is not same-origin, so it is
// out of that guard's scope by design; the `no same-origin core` assertion
// below is what covers our own paths.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const CORE_PKG = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core')
const CORE_DIR = path.join(CORE_PKG, 'dist', 'esm')
const CORE_VERSION = JSON.parse(fs.readFileSync(path.join(CORE_PKG, 'package.json'), 'utf8')).version
const CDN_PREFIX = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm/`

const BODY = {
  'ffmpeg-core.js': { file: path.join(CORE_DIR, 'ffmpeg-core.js'), type: 'text/javascript' },
  'ffmpeg-core.wasm': { file: path.join(CORE_DIR, 'ffmpeg-core.wasm'), type: 'application/wasm' },
}

/**
 * Serve the pinned CDN URLs from the installed package, and record every URL
 * the page asked that host for. Anything under the prefix that is not one of
 * the two core files is answered 404 rather than quietly ignored, so a typo in
 * a filename shows up as a failed conversion instead of a hang.
 */
async function serveCoreFromDisk(page, asked) {
  await page.route((url) => url.href.startsWith('https://cdn.jsdelivr.net/'), async (route) => {
    const url = route.request().url()
    asked.push(url)
    const known = url.startsWith(CDN_PREFIX) ? BODY[url.slice(CDN_PREFIX.length)] : null
    if (!known) return route.fulfill({ status: 404, body: '' })
    await route.fulfill({
      status: 200,
      // Cross-origin fetch: without the CORS header the renderer rejects the
      // response even though we produced it, exactly as a misconfigured host
      // would. Keeping it explicit means this asserts the real contract.
      headers: { 'content-type': known.type, 'access-control-allow-origin': '*' },
      body: fs.readFileSync(known.file),
    })
  })
}

/** Every request the page made for something that looks like an ffmpeg core. */
function watchCoreRequests(page) {
  const seen = { cdn: [], sameOrigin: [] }
  page.on('request', (req) => {
    const url = req.url()
    if (!/ffmpeg[-/]?core/i.test(url)) return
    if (url.startsWith('https://cdn.jsdelivr.net/')) seen.cdn.push(url)
    else seen.sameOrigin.push(url)
  })
  return seen
}

/**
 * Record a short clip in the page and hand back its bytes. Two colours over
 * about half a second at 10fps, 64x64 — small enough to convert quickly, long
 * enough that there is more than one frame to encode.
 */
async function recordClip(page) {
  const bytes = await page.evaluate(async () => {
    if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is unavailable in this browser')
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1c40f2'
    ctx.fillRect(0, 0, 64, 64)
    const stream = canvas.captureStream(10)
    const rec = new MediaRecorder(stream)
    const chunks = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const stopped = new Promise((resolve) => { rec.onstop = resolve })
    rec.start()
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#1c40f2' : '#f24040'
      ctx.fillRect(0, 0, 64, 64)
      await new Promise((r) => setTimeout(r, 60))
    }
    rec.stop()
    await stopped
    const blob = new Blob(chunks, { type: 'video/webm' })
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  expect(bytes.length, 'the recorded clip has no bytes — MediaRecorder produced nothing').toBeGreaterThan(500)
  return Buffer.from(bytes)
}

async function openVideoToGif(page) {
  await go(page, '/create/file-converter')
  await page.getByRole('tab', { name: 'Video', exact: true }).click()
  await expect(page.locator('.fc-drop')).toBeVisible()
}

const VIEWPORTS = [
  ['a phone at 390', { width: 390, height: 844 }],
  ['a desktop at 1280', { width: 1280, height: 900 }],
]

test.describe('the converter engine loads from the CDN and still converts', () => {
  for (const [where, viewport] of VIEWPORTS) {
    test(`${where}: a recorded clip becomes a GIF, with the engine fetched from jsDelivr`, async ({ page }) => {
      // 32 MB to hand over, a wasm module to compile and a real transcode to
      // run. The suite default of 30s is for pages, not for this.
      test.setTimeout(180_000)
      watch(page, 'someone turning a screen recording into a GIF')
      await page.setViewportSize(viewport)

      const asked = []
      const seen = watchCoreRequests(page)
      await serveCoreFromDisk(page, asked)

      await openVideoToGif(page)
      const clip = await recordClip(page)
      await page.locator('.fc-drop input[type="file"]')
        .setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: clip })

      await expect(page.getByRole('button', { name: 'Convert to GIF' })).toBeVisible()
      await page.getByRole('button', { name: 'Convert to GIF' }).click()

      // The engine banner is the app admitting what it is about to download.
      await expect(page.locator('.fc-status')).toContainText(/Loading converter engine/i)

      const result = page.locator('img[alt="GIF result"]')
      await expect(result, 'no GIF came out of the converter').toBeVisible({ timeout: 150_000 })
      await expect(page.getByRole('button', { name: 'Download GIF' })).toBeVisible()

      // A rendered <img> with a blob src proves the browser decoded the bytes
      // ffmpeg produced. An <img> that failed to decode still exists and is
      // still "visible"; naturalWidth is the part that cannot be faked.
      const decoded = await result.evaluate((img) => ({
        src: img.currentSrc || img.src,
        w: img.naturalWidth,
        h: img.naturalHeight,
      }))
      expect(decoded.src.startsWith('blob:'), 'the result is not a locally produced blob').toBe(true)
      expect(decoded.w, 'the GIF did not decode to any pixels').toBeGreaterThan(0)
      expect(decoded.h).toBeGreaterThan(0)

      // Both halves of the wiring, stated as facts about requests rather than
      // about code: the two core files came from the pinned CDN URL...
      expect(asked.sort()).toEqual([`${CDN_PREFIX}ffmpeg-core.js`, `${CDN_PREFIX}ffmpeg-core.wasm`])
      // ...and nothing resembling a core was ever asked of uil4b.com.
      expect(seen.sameOrigin, 'the page asked our own origin for an ffmpeg core').toEqual([])
      expect(seen.cdn.length).toBe(2)
    })
  }

  test('opening the converter and its video tab downloads no engine at all', async ({ page }) => {
    // The defect this rules out is the expensive one: a visitor who opens the
    // page, converts nothing and leaves must cost zero engine bytes. It was
    // already true with the bundled core — `?url` yields a string, not a fetch
    // — and it has to stay true now the string points at someone else's host.
    watch(page, 'someone who opened the converter and left')
    const asked = []
    const seen = watchCoreRequests(page)
    await serveCoreFromDisk(page, asked)

    await openVideoToGif(page)
    // Give anything eager a real chance to fire before declaring silence.
    await page.waitForTimeout(1500)

    expect(asked, 'something fetched the engine before anyone pressed Convert').toEqual([])
    expect(seen.cdn).toEqual([])
    expect(seen.sameOrigin).toEqual([])

    // Positive control for the two silences above: the page did load, and the
    // listener does see requests. Without this, a page that never rendered
    // would pass all three assertions.
    await expect(page.getByRole('tab', { name: 'Video', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.fc-drop-hint')).toContainText(/Drop a video/i)
  })

  test('offline, it says the engine needs a connection and asks for nothing', async ({ page }) => {
    // The honest offline story for this one mode. The rest of the app keeps its
    // own offline guarantees (33-offline-state.spec.js); image conversion is
    // pure canvas and needs no network. Video → GIF genuinely cannot work on a
    // cold cache without one, and says so rather than failing silently.
    watch(page, 'someone on a train with no signal')
    const asked = []
    await serveCoreFromDisk(page, asked)
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true })
    })

    await openVideoToGif(page)
    const clip = await recordClip(page)
    await page.locator('.fc-drop input[type="file"]')
      .setInputFiles({ name: 'clip.webm', mimeType: 'video/webm', buffer: clip })
    await page.getByRole('button', { name: 'Convert to GIF' }).click()

    await expect(page.locator('.toast.show .toast-msg')).toContainText(/offline/i)
    expect(asked, 'it tried to download the engine anyway').toEqual([])
  })
})
