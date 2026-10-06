// Capture a poster still AND an animated WebP for every community-prompt demo
// page, and write the manifest the Prompt Library reads.
//
// Regenerate everything (the one command to run after any demo page changes):
//
//   node scripts/prompt-posters.mjs
//
// Options:
//   --only=c-3,c-16    just these pages (the manifest still lists every page on disk)
//   --no-anim          posters only
//   --public=<dir>     capture the pages of another checkout's `public` folder
//   --out=<dir>        write the images there instead, and leave the manifest alone
//                      (a trial run: nothing in this repository changes)
//   --tmp=<dir>        where frames are staged (default: OS temp)
//   --keep-frames      leave each page's recorded frames in --tmp to inspect
//
// Needs Playwright's Chromium and ffmpeg with libwebp_anim on PATH (or FFMPEG
// set to its path). Exits non-zero if any page reports a problem.
//
// Outputs:
//   public/previews/prompts/poster/<id>.webp  still, 960 wide
//   public/previews/prompts/anim/<id>.webp    looping animation, ANIM_WIDTH wide
//   src/data/promptPreviewAssets.js           generated manifest
//
// ─────────────────────────────────────────────────────────────────────────────
// SERVED, NOT OPENED FROM DISK
// ─────────────────────────────────────────────────────────────────────────────
// The pages are captured over http from a local server rooted at `public/`,
// the same transport and paths the product uses, so fonts and shared files
// under /previews/vendor/ resolve as they do live. Any request that leaves the
// local server is blocked and reported.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE POSTER: REDUCED MOTION, THEN A SETTLE
// ─────────────────────────────────────────────────────────────────────────────
// Every demo presents its finished state under reduced motion, so the poster
// is taken with motion reduced (the state the page is designed to hold, and
// what a reduced-motion reader sees) after a settle for canvases that seed
// over their first frames. Scroll-driven pages are captured at scroll 0.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ANIMATION: THE PAGE RUNNING, MOTION ON
// ─────────────────────────────────────────────────────────────────────────────
// Frames come from Chromium's screencast (real time, one frame per paint,
// each with a timestamp) and are resampled to a fixed rate by ffmpeg. The
// last CROSSFADE_S seconds are blended into the first ones, so the loop has
// no visible seam whatever the page does.
//
// A page may carry a capture hint:
//   <meta name="uil4b-capture" content='{"mode":"run","ms":5000}'>
//     record the page running for `ms` after it settles (e.g. a 3D scene).
//     "pointer": [[x,y], …] glides the mouse through these points (fractions
//     of the viewport) over the recording, for pieces that answer the cursor.
//   <meta name="uil4b-capture" content='{"mode":"scroll","stops":[0,0.5,"#pricing"],"ms":6000}'>
//     script-scroll smoothly through the stops while recording, then back to
//     the first. A stop is a fraction of the scroll height (0–1), a pixel
//     offset (> 1), a CSS selector, or { "y": n } / { "sel": "…" }; an
//     object may add "hold" (ms to pause there), and a top-level "hold" is the
//     pause at every stop that does not set its own.
//     "input": "wheel" drives the tour with real wheel events instead of
//     scrollTo, for a page that moves on wheel input rather than on scroll.
//   Optional on either: "settle" (ms to wait after load before recording).
// Without a hint the page is recorded from load for DEFAULT_MS, which shows
// its entrance and any ambient motion; a page that barely repaints in that
// time is recorded as a short scroll tour instead (TOUR, below).
//
// WebGL renders through SwiftShader in headless Chromium (the launch flags
// below). A capture whose frames are a flat colour is reported as a problem,
// so a black canvas cannot ship silently, and so is a page that paints a
// canvas but reaches the recording as a handful of frames (a stalled capture,
// not a still page).
//
// ─────────────────────────────────────────────────────────────────────────────
// SIZE BUDGET
// ─────────────────────────────────────────────────────────────────────────────
// A card is at most ~480 CSS px wide, so the animation is ANIM_WIDTH (2x that)
// wide. Each file must come in under BUDGET_BYTES: the encoder steps down the
// ladder below (quality, then frame rate, then width) until it does, and the
// run fails if the last rung is still over.
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readCaptureHint } from './prompt-capture-hint.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const at = a.indexOf('=')
  const k = (at === -1 ? a : a.slice(0, at)).replace(/^--/, '')
  return [k, at === -1 ? true : a.slice(at + 1)]
}))
const ONLY = typeof args.only === 'string' ? new Set(args.only.split(',').map((s) => s.trim())) : null
const WITH_ANIM = !args['no-anim']
const KEEP_FRAMES = !!args['keep-frames']
const FFMPEG = process.env.FFMPEG || 'ffmpeg'

// The served root, and where the pages sit under it (their URL path too).
const PUBLIC = path.resolve(typeof args.public === 'string' ? args.public : path.join(ROOT, 'public'))
const PAGES_URL = '/previews/prompts/'
const PAGES = path.join(PUBLIC, 'previews', 'prompts')
// A trial run (--out) writes its images elsewhere and never the manifest.
const TRIAL = typeof args.out === 'string'
const OUT = TRIAL ? path.resolve(args.out) : path.join(ROOT, 'public', 'previews', 'prompts')
const POSTER_OUT = path.join(OUT, 'poster')
const ANIM_OUT = path.join(OUT, 'anim')
const MANIFEST = path.join(ROOT, 'src/data/promptPreviewAssets.js')

// Composition is laid out at 1280x800 (these pages are desktop designs); the
// files are drawn down from it.
const WIDTH = 1280
const HEIGHT = 800
const POSTER_WIDTH = 960
const POSTER_QUALITY = 0.72
const SETTLE_MS = 900

const ANIM_WIDTH = 960
const DEFAULT_MS = 4000
const CROSSFADE_S = 0.6
const BUDGET_BYTES = 400 * 1024
// Tried in order until a file fits the budget. Quality stays high and the
// ladder gives up frame rate and width instead: libwebp's animation encoder
// keeps a pixel from the previous frame wherever the new one is within a
// quality-dependent distance of it (about 10 levels per channel at quality
// 48, 5 at 75), and below ~70 that shows as blocky residue on dark pages.
const LADDER = [
  { fps: 12, width: ANIM_WIDTH, quality: 78 },
  { fps: 10, width: ANIM_WIDTH, quality: 75 },
  { fps: 10, width: 800, quality: 75 },
  { fps: 8, width: 800, quality: 72 },
  { fps: 8, width: 720, quality: 72 },
  { fps: 6, width: 720, quality: 70 },
  { fps: 6, width: 640, quality: 68 },
  // A scene that changes everywhere on every frame (a canvas or WebGL piece)
  // leaves nothing for the encoder to reuse, so it can need these.
  { fps: 6, width: 560, quality: 64 },
  { fps: 5, width: 480, quality: 60 },
]

// ── helpers ──────────────────────────────────────────────────────────────────

// WebP still without a new dependency: Chromium encodes it through a canvas,
// and the downscale comes free in the same draw.
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

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.json': 'application/json' }

function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel
      try { rel = decodeURIComponent(req.url.split('?')[0]) } catch { rel = '' }
      const file = path.join(dir, rel)
      if (!rel || !file.startsWith(dir + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('not found')
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

async function guardNetwork(page, port, problems) {
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  await page.route('**/*', (route) => {
    const u = route.request().url()
    if (u.startsWith(`http://127.0.0.1:${port}`) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue()
    problems.push(`BLOCKED external: ${u}`)
    return route.abort()
  })
}

function ffmpeg(argv) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'buffer', maxBuffer: 1 << 28 })
  if (r.error) throw new Error(`ffmpeg could not run (${r.error.message}); install it or set FFMPEG`)
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.toString().slice(-600)}`)
  return r.stdout
}

// Runs inside the page: resolve every stop to a scroll offset.
async function resolveStops(page, stops, defaultHold) {
  return page.evaluate(({ stops, defaultHold }) => {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight)
    return stops.map((s) => {
      const stop = typeof s === 'object' && s !== null ? s : { v: s }
      const v = stop.sel ?? stop.y ?? stop.v
      let y = 0
      if (typeof v === 'string') {
        const el = document.querySelector(v)
        y = el ? el.getBoundingClientRect().top + scrollY : 0
      } else if (typeof v === 'number') {
        y = v <= 1 ? v * max : v
      }
      const hold = Number(stop.hold ?? defaultHold) || 0
      return { y: Math.min(max, Math.max(0, y)), hold }
    })
  }, { stops, defaultHold })
}

// Drives the tour with wheel events: each leg is sent as small notches, spread
// over the leg's time, so the page's own wheel handling does the moving.
async function wheelTour(page, pts, legMs) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].hold) await page.waitForTimeout(pts[i].hold)
    const dy = pts[i + 1].y - pts[i].y
    const notches = Math.max(1, Math.round(Math.abs(dy) / 60))
    const each = dy / notches
    const wait = Math.max(8, legMs / notches)
    for (let n = 0; n < notches; n++) {
      await page.mouse.wheel(0, each)
      await page.waitForTimeout(wait)
    }
  }
}

// Glides the mouse through the hint's points, evenly over `totalMs`.
async function pointerPath(page, points, totalMs) {
  const pts = points
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map(([x, y]) => [Math.round(Number(x) * WIDTH), Math.round(Number(y) * HEIGHT)])
  if (!pts.length) return page.waitForTimeout(totalMs)
  await page.mouse.move(pts[0][0], pts[0][1])
  const legMs = totalMs / Math.max(1, pts.length - 1)
  for (let i = 1; i < pts.length; i++) {
    const steps = Math.max(1, Math.round(legMs / 16))
    const started = Date.now()
    await page.mouse.move(pts[i][0], pts[i][1], { steps })
    const left = legMs - (Date.now() - started)
    if (left > 0) await page.waitForTimeout(left)
  }
  return undefined
}

// Runs inside the page: ease through the stops, then back to the first.
async function scriptedScroll(page, hint, totalMs) {
  const pts = await resolveStops(page, [...hint.stops, hint.stops[0]], hint.hold)
  // The return to the first stop ends the loop, so its hold is never taken.
  const holds = pts.slice(0, -1).reduce((a, p) => a + p.hold, 0)
  const legMs = Math.max(300, (totalMs - holds) / Math.max(1, pts.length - 1))
  if (hint.input === 'wheel') {
    await page.mouse.move(WIDTH / 2, HEIGHT / 2)
    return wheelTour(page, pts, legMs)
  }
  return page.evaluate(async ({ pts, legMs }) => {
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const tween = (from, to, ms) => new Promise((done) => {
      const t0 = performance.now()
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms)
        scrollTo(0, from + (to - from) * ease(t))
        if (t < 1) requestAnimationFrame(step); else done()
      }
      requestAnimationFrame(step)
    })
    scrollTo(0, pts[0].y)
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i].hold) await new Promise((r) => setTimeout(r, pts[i].hold))
      await tween(pts[i].y, pts[i + 1].y, legMs)
    }
  }, { pts, legMs })
}

// Records the page through CDP screencast while `during` runs.
async function screencast(page, dir, during) {
  const cdp = await page.context().newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    try { await cdp.send('Page.screencastFrameAck', { sessionId }) } catch { /* page closing */ }
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 })
  const started = Date.now() / 1000
  await during()
  const ended = Date.now() / 1000
  await cdp.send('Page.stopScreencast')
  await cdp.detach().catch(() => {})
  return { frames, started, ended }
}

// A still page emits no screencast frames, so the list is resampled on the
// frames' own timestamps: each frame lasts until the next one arrived.
function concatList(frames, endAt, file) {
  const lines = ['ffconcat version 1.0']
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i + 1].t : endAt
    const dur = Math.max(0.001, next - frames[i].t)
    lines.push(`file '${frames[i].file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`, `duration ${dur.toFixed(4)}`)
  }
  lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
  fs.writeFileSync(file, lines.join('\n'))
}

function encodeLoop(list, seconds, rung, out) {
  const X = Math.min(CROSSFADE_S, seconds / 4)
  const D = seconds - X
  const graph = [
    `[0:v]fps=${rung.fps},scale=${rung.width}:-2:flags=lanczos,split[a][b]`,
    `[a]trim=start=${X.toFixed(3)}:end=${(D + X).toFixed(3)},setpts=PTS-STARTPTS[main]`,
    `[b]trim=start=0:end=${X.toFixed(3)},setpts=PTS-STARTPTS[head]`,
    `[main][head]xfade=transition=fade:duration=${X.toFixed(3)}:offset=${(D - X).toFixed(3)},format=yuv420p[v]`,
  ].join(';')
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-filter_complex', graph, '-map', '[v]',
    '-c:v', 'libwebp_anim', '-lossless', '0', '-quality', String(rung.quality), '-compression_level', '6',
    '-preset', 'picture', '-loop', '0', '-an', out])
  return fs.statSync(out).size
}

// Median per-frame luminance spread of the capture, sampled small. A flat
// frame (a blank canvas, a black WebGL surface) spreads near zero; the median
// ignores the dark first frames of a page that fades in.
function frameSpread(list, seconds) {
  const raw = ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-t', String(seconds), '-vf', 'fps=2,scale=32:20,format=gray', '-f', 'rawvideo', '-'])
  const px = 32 * 20
  const n = Math.floor(raw.length / px)
  const spreads = []
  for (let f = 0; f < n; f++) {
    let sum = 0; let sq = 0
    for (let i = 0; i < px; i++) { const v = raw[f * px + i]; sum += v; sq += v * v }
    const mean = sum / px
    spreads.push(Math.sqrt(Math.max(0, sq / px - mean * mean)))
  }
  spreads.sort((a, b) => a - b)
  return n ? spreads[Math.floor(n / 2)] : 0
}

// The largest share of the frame that changes between two samples a quarter
// of a second apart. Frame COUNT alone cannot tell a still page from a moving
// one: a blinking caret or a one-line ticker repaints every frame while the
// rest of the page stands still.
function changedArea(list, seconds) {
  const w = 64; const h = 40; const px = w * h
  const raw = ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-t', String(seconds), '-vf', `fps=4,scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-'])
  const n = Math.floor(raw.length / px)
  let most = 0
  for (let f = 1; f < n; f++) {
    let moved = 0
    for (let i = 0; i < px; i++) if (Math.abs(raw[f * px + i] - raw[(f - 1) * px + i]) > 12) moved += 1
    most = Math.max(most, moved / px)
  }
  return most
}

// The largest mean change, in grey levels per pixel, between two samples a
// quarter of a second apart. Unlike changedArea it also sees motion that is
// faint everywhere (a slow canvas field), so it is the test for "any motion
// at all" rather than for "enough of the page moves to be worth showing".
function frameMotion(list, seconds) {
  const w = 64; const h = 40; const px = w * h
  const raw = ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-t', String(seconds), '-vf', `fps=4,scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-'])
  const n = Math.floor(raw.length / px)
  let most = 0
  for (let f = 1; f < n; f++) {
    let sum = 0
    for (let i = 0; i < px; i++) sum += Math.abs(raw[f * px + i] - raw[(f - 1) * px + i])
    most = Math.max(most, sum / px)
  }
  return most
}

// A page with no hint that barely changes in DEFAULT_MS has nothing running
// on its own (its motion is scroll-driven or on hover), so it is recorded as a
// scroll tour instead: down through its first screens and back to the top.
// "Barely changes" is either few frames at all, or no sample pair in which
// more than STILL_AREA of the frame moved.
const STILL_FRAMES = 12
const STILL_AREA = 0.04
//
// The tour pauses at each stop and glides between them. A frame that repeats
// the one before costs almost nothing in an animated WebP, while a frame of a
// page in motion costs nearly a full picture, so long holds and short legs
// spend the size budget on sharpness instead of on the travel.
const TOUR = { mode: 'scroll', ms: 5000, stops: [{ y: 0, hold: 1200 }, { y: 760, hold: 1000 }, { y: 1500, hold: 1000 }] }

async function captureAnim(context, port, file, id, tmpRoot) {
  const problems = []
  const html = fs.readFileSync(path.join(PAGES, file), 'utf8')
  const hint = readCaptureHint(html)
  if (hint.invalid) problems.push(`capture hint is not valid JSON with mode run|scroll (scroll needs stops): ${hint.invalid}`)
  const dir = fs.mkdtempSync(path.join(tmpRoot, `${id}-`))
  const page = await context.newPage()
  await guardNetwork(page, port, problems)
  try {
    const url = `http://127.0.0.1:${port}${PAGES_URL}${file}`
    const record = async (h) => {
      const ms = Number(h.ms) || DEFAULT_MS
      if (h.mode === 'default') {
        // Recorded from DOMContentLoaded, so the entrance is in the loop and
        // the blank document before it is not.
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        return { ms, rec: await screencast(page, dir, () => page.waitForTimeout(ms)) }
      }
      await page.goto(url, { waitUntil: 'load' })
      await page.waitForTimeout(Number(h.settle) || SETTLE_MS)
      // A scroll tour ends back at its first stop and rests there for the
      // length of the loop's crossfade, so the blend joins two still frames
      // of the same view instead of ghosting the last glide over the first.
      const rest = h.mode === 'scroll' ? Math.round(CROSSFADE_S * 1000) + 100 : 0
      const rec = await screencast(page, dir, async () => {
        if (h.mode === 'scroll' && Array.isArray(h.stops) && h.stops.length) {
          await scriptedScroll(page, h, ms)
          await page.waitForTimeout(rest)
        } else if (h.mode === 'run' && Array.isArray(h.pointer) && h.pointer.length) {
          await pointerPath(page, h.pointer, ms)
        } else {
          await page.waitForTimeout(ms)
        }
      })
      // A tour that ran long keeps its end: the rest is what closes the loop.
      return { ms: rest ? Math.max(ms + rest, (rec.ended - rec.started) * 1000) : ms, rec }
    }
    let mode = hint.mode
    let { ms, rec } = await record(hint)
    const still = () => {
      if (rec.frames.length < STILL_FRAMES) return true
      const probe = path.join(dir, 'probe.txt')
      concatList(rec.frames, rec.ended, probe)
      return changedArea(probe, Math.min(ms / 1000, rec.ended - rec.frames[0].t)) < STILL_AREA
    }
    if (hint.mode === 'default' && still()) {
      for (const f of rec.frames) fs.rmSync(f.file, { force: true })
      mode = 'tour'
      ;({ ms, rec } = await record(TOUR))
    }
    const seconds = ms / 1000
    if (!rec.frames.length) throw new Error('no frames captured')
    // Even a page with nothing running repaints on every step of a scroll
    // tour, so a recording this short is a stalled capture or a page that
    // cannot move at all; either way the "animation" would be a still.
    if (rec.frames.length < STILL_FRAMES) {
      problems.push(`only ${rec.frames.length} frame(s) recorded (${mode}): the capture stalled or the page cannot scroll; give it a "run" hint if it animates`)
    }
    // Trim to the recorded window, measured from the first frame.
    const first = rec.frames[0].t
    const length = Math.min(seconds, rec.ended - first)
    const list = path.join(dir, 'list.txt')
    concatList(rec.frames, first + length + 0.05, list)

    const gl = await page.evaluate(() => window.__captureGL || { asked: 0, failed: 0 })
    if (gl.failed) problems.push(`WebGL: ${gl.failed} of ${gl.asked} context request(s) failed in the capture browser`)
    const spread = frameSpread(list, length)
    if (spread < 2) problems.push(`frames look blank (median luminance spread ${spread.toFixed(2)}): check WebGL/canvas rendering`)
    // A note, not a failure: the file is valid, it just shows little.
    const notes = []
    if (frameMotion(list, length) < 1) notes.push(`barely moves at card size (${mode}): the loop will read as a still; a capture hint can show more`)

    const out = path.join(ANIM_OUT, `${id}.webp`)
    let bytes = 0; let used = null
    for (const rung of LADDER) {
      bytes = encodeLoop(list, length, rung, out)
      used = rung
      if (bytes <= BUDGET_BYTES) break
    }
    if (bytes > BUDGET_BYTES) problems.push(`over budget: ${(bytes / 1024).toFixed(0)} KB > ${BUDGET_BYTES / 1024} KB at the last rung`)
    return { bytes, rung: used, mode, seconds: length, frames: rec.frames.length, problems, notes }
  } finally {
    await page.close()
    if (!KEEP_FRAMES) fs.rmSync(dir, { recursive: true, force: true })
  }
}

// ── run ──────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(PAGES)
  .filter((f) => /^c-\d+\.html$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
const selected = ONLY ? files.filter((f) => ONLY.has(f.replace('.html', ''))) : files

if (!selected.length) {
  console.error(`prompt-posters: no preview pages found in ${PAGES}`)
  process.exit(1)
}

fs.mkdirSync(POSTER_OUT, { recursive: true })
fs.mkdirSync(ANIM_OUT, { recursive: true })
const tmpRoot = fs.mkdtempSync(path.join(typeof args.tmp === 'string' ? args.tmp : os.tmpdir(), 'prompt-anim-'))

const { server, port } = await serve(PUBLIC)
const browser = await chromium.launch({
  // WebGL in headless Chromium: its software fallback (SwiftShader) must be
  // allowed explicitly. Do NOT force it with --use-angle=swiftshader: that
  // route stops the screencast from receiving any frame of a canvas, 2D or
  // WebGL, so a running scene records as one still.
  args: ['--enable-unsafe-swiftshader'],
})
const posterCtx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const animCtx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
// Records every WebGL context a page asks for and whether it got one, so a
// page whose 3D failed to start is reported rather than recorded as a black box.
await animCtx.addInitScript(() => {
  const probe = { asked: 0, failed: 0 }
  Object.defineProperty(window, '__captureGL', { value: probe })
  const real = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = real.call(this, type, ...rest)
    if (/^(webgl|webgl2|experimental-webgl)$/.test(String(type))) {
      probe.asked += 1
      if (!ctx) probe.failed += 1
    }
    return ctx
  }
})

const report = []
try {
  for (const file of selected) {
    const id = file.replace('.html', '')
    const problems = []
    const page = await posterCtx.newPage()
    await guardNetwork(page, port, problems)
    await page.goto(`http://127.0.0.1:${port}${PAGES_URL}${file}`, { waitUntil: 'load' })
    await page.waitForTimeout(SETTLE_MS)
    const png = await page.screenshot({ type: 'png', scale: 'css' })
    await page.close()
    const webp = await toWebp(posterCtx, png, POSTER_WIDTH, POSTER_QUALITY)
    fs.writeFileSync(path.join(POSTER_OUT, `${id}.webp`), webp)
    const row = { id, posterBytes: webp.length, problems }
    if (WITH_ANIM) {
      try {
        const a = await captureAnim(animCtx, port, file, id, tmpRoot)
        Object.assign(row, { anim: a })
        problems.push(...a.problems)
      } catch (e) {
        problems.push(`animation: ${e.message}`)
      }
    }
    report.push(row)
    const a = row.anim
    console.log(`  ${id.padEnd(5)} poster ${(row.posterBytes / 1024).toFixed(1).padStart(6)} KB`
      + (a ? `  anim ${(a.bytes / 1024).toFixed(1).padStart(6)} KB  ${a.mode} ${a.seconds.toFixed(1)}s ${a.rung.width}w ${a.rung.fps}fps q${a.rung.quality} (${a.frames} frames)` : '')
      + (problems.length ? `  ⚠ ${problems.join(' | ')}` : '')
      + (a?.notes?.length ? `  (note: ${a.notes.join(' | ')})` : ''))
  }
} finally {
  await browser.close()
  server.close()
  if (KEEP_FRAMES) console.log(`prompt-posters: frames kept in ${tmpRoot}`)
  else fs.rmSync(tmpRoot, { recursive: true, force: true })
}

// ── THE MANIFEST ─────────────────────────────────────────────────────────────
// Written from what is on disk, not from this run alone, so an --only run keeps
// the other pages listed. A page is listed when its poster exists; it is in
// PROMPT_ANIM_IDS when its animation exists too. A trial run (--out) leaves it
// alone. tests/unit/prompt-preview-assets.test.js checks it against the disk.
const allIds = files.map((f) => f.replace('.html', ''))
const ids = allIds.filter((id) => fs.existsSync(path.join(POSTER_OUT, `${id}.webp`)))
const animIds = ids.filter((id) => fs.existsSync(path.join(ANIM_OUT, `${id}.webp`)))
if (TRIAL) console.log(`prompt-posters: trial run, images in ${OUT}; manifest not written`)
const lines = TRIAL ? null : [
  '// GENERATED by scripts/prompt-posters.mjs. Do not edit by hand.',
  '//',
  '// Which community prompts have a built output preview: a self-contained page',
  '// at /previews/prompts/<id>.html, a poster still at',
  '// /previews/prompts/poster/<id>.webp and, where captured, a looping animation',
  '// at /previews/prompts/anim/<id>.webp.',
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
  'export const PROMPT_ANIM_IDS = Object.freeze([',
  ...animIds.map((id) => `  '${id}',`),
  '])',
  '',
  'export const promptPosterSrc = (id) => `/previews/prompts/poster/${id}.webp`',
  'export const promptAnimSrc = (id) => `/previews/prompts/anim/${id}.webp`',
  'export const promptPageSrc = (id) => `/previews/prompts/${id}.html`',
  'export const hasPromptPreview = (id) => PROMPT_PREVIEW_IDS.includes(id)',
  'export const hasPromptAnim = (id) => PROMPT_ANIM_IDS.includes(id)',
  '',
]
if (lines) fs.writeFileSync(MANIFEST, lines.join('\n'))

const posterTotal = report.reduce((a, r) => a + r.posterBytes, 0)
const animTotal = report.reduce((a, r) => a + (r.anim?.bytes || 0), 0)
const biggest = report.reduce((m, r) => Math.max(m, r.anim?.bytes || 0), 0)
console.log(`prompt-posters: manifest lists ${ids.length} previews, ${animIds.length} animated`)
console.log(`prompt-posters: this run wrote ${report.length} posters (${(posterTotal / 1024).toFixed(0)} KB)`
  + (WITH_ANIM ? ` and animations totalling ${(animTotal / 1024).toFixed(0)} KB, largest ${(biggest / 1024).toFixed(0)} KB (budget ${BUDGET_BYTES / 1024} KB each)` : ''))
const anyProblem = report.filter((r) => r.problems.length)
if (anyProblem.length) {
  console.error(`\nprompt-posters: ${anyProblem.length} page(s) reported a problem — see above`)
  process.exit(1)
}
