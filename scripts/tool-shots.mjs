// Screenshots of the real tools for the /tools page.
//
//   npm run tools:shots                       build in test mode, then preview and capture
//   npm run tools:shots -- --dist=dist-x      capture a build that already exists (no build)
//   npm run tools:shots -- --only=tint,emoji  capture some of the tools
//
// Each tool is opened in a Chromium window at its own route, put in the state its
// alt text names, and photographed in light and dark. The only processing is a
// crop, a resize and a WebP encode. Nothing is retouched or composited.
//
// Writes public/tools/<id>-<light|dark>-<640|1280>.webp, each 16:10, which is the
// box the page gives it (a card preview or a row thumbnail).
//
// Nothing reaches the network. The Iconify catalogue comes from
// tests/user-sim/fixtures/iconify, answered the way tests/user-sim/iconify-stub.js
// does. That fixture draws one glyph for every icon, so the glyph request is
// answered with the real drawing from public/icons-data.js instead, and the
// catalogue is cut to the icons that have one; every cell on the grid is then
// the pack's own art. Font faces come from public/fonts, the font catalogue from
// the bundled list, and the One Tap script is answered empty as base.js does.
// Everything else off-site is refused.
//
// Run by hand; not part of CI. The outputs are committed. The browser runs
// signed out, with a fixed clock and fixed fonts, so a second run on the same
// build and Chromium gives the same bytes. Nothing about a person is on a page
// that is photographed, and the encoder writes no metadata: the script checks
// the files for an address-shaped string anyway.
//
// Exits 1 when a tool's page is still loading, shows an alert or a cookie
// notice, or a file is over the size ceiling.

import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { answerIconify, ICONIFY_HOSTS, ICONIFY_STUB_HEADER } from '../tests/user-sim/iconify-stub.js'
import { FALLBACK_FONTS } from '../src/data/fallbackFonts.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(root, 'public', 'tools')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

// Everything that decides the pixels, in one place.
const FIXED_TIME = new Date('2026-10-24T00:00:00Z')
const NAV_H = 64 // the app's own header, left out of every shot
const SHOT = { w: 1280, h: 800 } // the region kept, in CSS px: 16:10
const VIEWPORT = { width: SHOT.w, height: NAV_H + SHOT.h }
const DPR = 2
const WIDTHS = [1280, 640]
const QUALITIES = [0.82, 0.76, 0.7, 0.64, 0.58] // tried in order, the first that fits wins
const CEILING = 60 * 1024
const THEMES = ['light', 'dark']

const SAMPLE_IMAGE = path.join(root, 'public', 'spectrum', 'tasmanian-sunset.webp')

const fail = (msg) => { throw new Error(msg) }
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))

// ── Server ──────────────────────────────────────────────────────────────────

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

// ── Icons: the fixture's catalogue, the real drawing for each glyph ─────────

// public/icons-data.js is a classic script (`const icons=[{n,c,p,d}, ...]`): the
// name, the pack letter and the path. Read it as text, the way a browser would.
const PACK_LETTER = { lucide: 'L', tabler: 'T', iconoir: 'I' }
const glyphs = new Map() // `${pack}:${name}` -> path data

async function loadGlyphs() {
  const src = await fs.readFile(path.join(root, 'public', 'icons-data.js'), 'utf8')
  const letters = Object.fromEntries(Object.entries(PACK_LETTER).map(([pack, l]) => [l, pack]))
  for (const m of src.matchAll(/\{n:'([^']+)',c:'[a-z]+',p:'([A-Z])',d:'([^']+)'\}/g)) {
    if (letters[m[2]]) glyphs.set(`${letters[m[2]]}:${m[1]}`, m[3])
  }
  if (glyphs.size < 100) fail(`icons-data.js gave ${glyphs.size} glyphs; its format has changed`)
}

const hasGlyph = (pack, name) => glyphs.has(`${pack}:${name}`)
const glyphBody = (d) => `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/>`

// The fixture's answer, with the glyphs swapped for the real drawings and the
// catalogue cut to the icons that have one.
function iconify(url) {
  const answer = answerIconify(url)
  const u = new URL(url)
  if (answer.status !== 200) return answer
  const json = (body) => ({ ...answer, body: JSON.stringify(body) })
  const batch = /^\/([^/]+)\.json$/.exec(u.pathname)
  if (batch && u.searchParams.has('icons')) {
    const pack = batch[1]
    const icons = {}
    for (const n of (u.searchParams.get('icons') || '').split(',').filter(Boolean)) {
      if (hasGlyph(pack, n)) icons[n] = { body: glyphBody(glyphs.get(`${pack}:${n}`)) }
    }
    return json({ prefix: pack, width: 24, height: 24, icons, aliases: {} })
  }
  if (u.pathname === '/collection') {
    const data = JSON.parse(answer.body)
    const pack = u.searchParams.get('prefix')
    const keep = (list) => list.filter((n) => hasGlyph(pack, n))
    if (data.categories) data.categories = Object.fromEntries(Object.entries(data.categories).map(([k, v]) => [k, keep(v)]).filter(([, v]) => v.length))
    if (data.uncategorized) data.uncategorized = keep(data.uncategorized)
    data.total = Object.values(data.categories || {}).flat().length + (data.uncategorized?.length || 0)
    return json(data)
  }
  if (u.pathname === '/search') {
    const data = JSON.parse(answer.body)
    data.icons = data.icons.filter((id) => hasGlyph(...id.split(':')))
    data.total = data.icons.length
    return json(data)
  }
  return answer
}

// ── Fonts: local files for the two faces on show, the bundled list for the rest ─

const LOCAL_FACES = {
  'Schibsted Grotesk': { file: 'schibsted-grotesk-latin.woff2', weights: '400 900' },
  Literata: { file: 'literata-latin.woff2', weights: '200 900' },
}
const CATALOGUE = [
  ...FALLBACK_FONTS,
  { family: 'Schibsted Grotesk', category: 'sans-serif', variants: [400, 500, 600, 700, 800, 900], subsets: ['latin'] },
  { family: 'Literata', category: 'serif', variants: [200, 300, 400, 500, 600, 700, 800, 900], subsets: ['latin'] },
]

function fontCss(url) {
  const families = new URL(url).searchParams.getAll('family').map((f) => f.split(':')[0])
  return families.map((f) => {
    const face = LOCAL_FACES[f]
    return face ? `@font-face{font-family:'${f}';font-style:normal;font-weight:${face.weights};font-display:swap;src:url('/fonts/${face.file}') format('woff2')}` : ''
  }).join('\n')
}

// ── Browser plumbing ────────────────────────────────────────────────────────

let browser
let util // a blank page: canvas work only, no app on it
let baseURL

async function route(ctx) {
  await ctx.route(/accounts\.google\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await ctx.route(/\/api\/fonts/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fonts: CATALOGUE }) }))
  await ctx.route(/fonts\.googleapis\.com\/css2/, (r) => r.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: fontCss(r.request().url()) }))
  await ctx.route((u) => ICONIFY_HOSTS.includes(u.hostname), (r) => {
    const a = iconify(r.request().url())
    return r.fulfill({ status: a.status, contentType: a.contentType, headers: { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }, body: a.body })
  })
  // Anything else off-site would make a capture depend on the network.
  await ctx.route((u) => !['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol.startsWith('http'), (r) => {
    const host = new URL(r.request().url()).hostname
    if (ICONIFY_HOSTS.includes(host) || host === 'accounts.google.com' || host === 'fonts.googleapis.com') return r.fallback()
    return r.abort()
  })
}

async function withPage(theme, fn) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-AU', timezoneId: 'UTC', colorScheme: theme, reducedMotion: 'reduce', baseURL })
  try {
    await route(ctx)
    await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
    const page = await ctx.newPage()
    await page.clock.setFixedTime(FIXED_TIME)
    return await fn(page)
  } finally {
    await ctx.close()
  }
}

async function open(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const root = document.getElementById('root')
    return !!(root && root.firstElementChild) && !document.getElementById('boot-shell') && !document.querySelector('.page-loading') && !document.querySelector('.typ-loading > .fg-loader')
  }, null, { timeout: 30000 })
}

// WebP through the browser's own canvas (sharp is not installed): `png` is the
// 2x capture, resized to outW x outH.
async function toWebp(png, outW, outH, quality) {
  const res = await util.evaluate(async (p) => {
    const bin = atob(p.b64)
    const bmp = await createImageBitmap(new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: 'image/png' }))
    const c = document.createElement('canvas')
    c.width = p.outW
    c.height = p.outH
    const g = c.getContext('2d')
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(bmp, 0, 0, p.outW, p.outH)
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', p.q))
    const out = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000))
    return { b64: btoa(s), type: blob.type }
  }, { b64: png.toString('base64'), outW, outH, q: quality })
  if (res.type !== 'image/webp') fail(`browser encoded ${res.type}, not WebP`)
  return Buffer.from(res.b64, 'base64')
}

// The page is a finished tool: nothing loading, no alert, toast or cookie notice.
async function assertClean(page, id) {
  await page.evaluate(() => document.fonts.ready)
  const seen = await page.evaluate(({ top, h }) => {
    const inShot = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > top && r.top < top + h }
    const shown = (sel) => [...document.querySelectorAll(sel)].filter((el) => inShot(el) && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[aria-hidden="true"]'))
    return {
      loading: shown('.page-loading, .fg-loader, [aria-busy="true"], progress, [role="progressbar"]').length,
      alerts: shown('[role="alert"], .toast.show').map((el) => (el.textContent || '').trim().slice(0, 80)),
      cookie: shown('[class*="cookie" i], [id*="cookie" i], [aria-label*="cookie" i]').length,
    }
  }, { top: NAV_H, h: SHOT.h })
  if (seen.loading) fail(`${id}: ${seen.loading} loading element(s) in the shot`)
  if (seen.alerts.length) fail(`${id}: alert in the shot: ${seen.alerts.join(' | ')}`)
  if (seen.cookie) fail(`${id}: a cookie notice is in the shot`)
}

// ── The tools ───────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'icons',
    async prepare(page) {
      await open(page, '/create/icons')
      // One pack, Lucide, so every cell is that pack's own drawing.
      await page.getByRole('button', { name: /All packs/ }).click()
      await page.locator('[data-pop-scrim], [role=listbox], [role=menu]').getByText('Lucide', { exact: true }).last().click()
      await page.waitForFunction(({ top, h }) => {
        const mode = document.body.innerText
        const cells = [...document.querySelectorAll('svg')].filter((el) => { const r = el.getBoundingClientRect(); return r.top > top + 200 && r.top < top + h && r.width >= 20 && r.width <= 40 })
        return /Lucide/.test(mode) && cells.length >= 40
      }, { top: NAV_H, h: SHOT.h }, { timeout: 30000 })
    },
  },
  {
    id: 'file-converter',
    async prepare(page) {
      await open(page, '/create/file-converter')
      await page.locator('input[type=file]').first().setInputFiles(SAMPLE_IMAGE)
    },
  },
  { id: 'semantic', async prepare(page) { await open(page, '/create/semantic-color') } },
  { id: 'tint', async prepare(page) { await open(page, '/create/tint') } },
  {
    id: 'font-pair',
    async prepare(page) {
      await open(page, '/create/font-pair')
      await page.waitForSelector('#fpr-export')
    },
  },
  {
    id: 'emoji',
    async prepare(page) {
      await open(page, '/create/emoji')
      // The grid paints its cells a few at a time; wait until every cell in the shot has its picture.
      await page.waitForFunction(({ top, h }) => {
        const cells = [...document.querySelectorAll('.emoji-cell')].filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > top && r.top < top + h })
        return cells.length > 100 && cells.every((el) => el.classList.contains('has-bitmap'))
      }, { top: NAV_H, h: SHOT.h }, { timeout: 30000 })
    },
  },
  { id: 'ratio', async prepare(page) { await open(page, '/create/aspect-ratio') } },
  { id: 'alt-text', async prepare(page) { await open(page, '/create/alt-text') } },
]

async function shoot(tool, theme) {
  const png = await withPage(theme, async (page) => {
    await tool.prepare(page, theme)
    await page.waitForTimeout(600)
    await assertClean(page, tool.id)
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    if (attr !== theme) fail(`${tool.id}: page is ${attr}, wanted ${theme}`)
    return page.screenshot({ clip: { x: 0, y: NAV_H, width: SHOT.w, height: SHOT.h }, type: 'png', animations: 'disabled', caret: 'hide' })
  })
  const files = []
  for (const w of WIDTHS) {
    const h = (w * SHOT.h) / SHOT.w
    let buf
    for (const q of QUALITIES) {
      buf = await toWebp(png, w, h, q)
      if (buf.length <= CEILING) break
    }
    if (buf.length > CEILING) fail(`${tool.id}-${theme}-${w}: ${buf.length} bytes is over ${CEILING}`)
    // An address-shaped string in the bytes would be read by tests/unit/owner-email-not-public.test.js.
    const hit = /[A-Za-z0-9._+-]{3,}@[A-Za-z0-9-]{3,}\.[A-Za-z]{2,}/.exec(buf.toString('latin1'))
    if (hit) fail(`${tool.id}-${theme}-${w}: an address-shaped string is in the file: ${hit[0]}`)
    files.push({ name: `${tool.id}-${theme}-${w}.webp`, buf })
  }
  return files
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  await loadGlyphs()
  let dist = args.dist
  if (!dist) {
    dist = 'dist-tool-shots'
    console.log('building in test mode...')
    execFileSync(process.execPath, [viteBin, 'build', '--mode', 'test', '--outDir', dist], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
  }
  const only = typeof args.only === 'string' ? args.only.split(',') : null
  const tools = TOOLS.filter((t) => !only || only.includes(t.id))
  if (only && tools.length !== only.length) fail(`unknown tool in --only=${only.join(',')}`)
  const server = await startPreview(dist)
  baseURL = server.base
  let total = 0
  let count = 0
  try {
    browser = await chromium.launch()
    util = await browser.newPage()
    for (const tool of tools) {
      for (const theme of THEMES) {
        for (const f of await shoot(tool, theme)) {
          await fs.writeFile(path.join(OUT_DIR, f.name), f.buf)
          total += f.buf.length
          count += 1
          console.log(`${f.name} ${(f.buf.length / 1024).toFixed(1)} KB`)
        }
      }
    }
    console.log(`wrote ${count} WebPs, ${(total / 1024).toFixed(1)} KB in all`)
  } finally {
    await browser?.close()
    server.child.kill()
  }
}

main().catch((err) => {
  console.error(`tool-shots: ${err.message}`)
  process.exit(1)
})
