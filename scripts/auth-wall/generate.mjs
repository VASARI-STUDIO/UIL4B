// Build the art for the log-in wall by driving the real tools.
//
//   npm run auth-wall:generate                 build in test mode, then preview and drive it
//   npm run auth-wall:generate -- --dist=dist-x   drive a build that already exists (no build)
//
// Every tile on the wall is a file a UIL4B tool exported, produced through that
// tool's own buttons in a Chromium window. The only processing is crop, resize
// and WebP encode (plus the specimen div for font pairs, see specimen() below).
// Run by hand; not part of CI. The outputs are committed.
//
// Writes
//   public/auth-wall/*.webp          the 11 raster tiles (palettes, pair specimens, style guide)
//   src/data/authWall.generated.js   icon SVGs, tint ramps, CSS excerpts, hashes, size floors
//
// Re-running on the same build, the same Chromium and a warm .cache/auth-wall/
// gives the same bytes. Icon SVGs come from the live Iconify API (jsDelivr as
// fallback) and font faces from Google Fonts, so a cold cache can pull newer
// upstream glyphs; compare the hashes in the generated file after such a run.
//
// Exits 1 when a download does not arrive within 15s, a pair's body face is not
// among the tool's own suggestions, a size is not the one expected, or a tile's
// text would be under the 11px floor at 217px.

import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import JSZip from 'jszip'
import { signIn, go } from '../../tests/user-sim/helpers.js'
import { AUTH_WALL, WALL_ICON_COUNT } from '../../src/data/authWall.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { groupFileNames } from '../../src/utils/iconGroupSvg.js'
import { parseIconRef, PREMADE_ICON_GROUPS } from '../../src/data/iconGroups.js'
import { buildStyleGuideLayout } from '../../src/utils/styleGuideRaster.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = path.join(root, '.cache', 'auth-wall')
const RAW = path.join(CACHE, 'raw')
const OUT_DIR = path.join(root, 'public', 'auth-wall')
const OUT_DATA = path.join(root, 'src', 'data', 'authWall.generated.js')

// Everything that decides the pixels, in one place.
const FIXED_TIME = new Date('2026-10-24T00:00:00Z')
const VIEWPORT = { width: 1440, height: 900 }
const DPR = 2
const DOWNLOAD_MS = 15000
const WEBP_QUALITY = 0.9
// Tile art is 300 CSS px wide at most and stored at 2x.
const ART_W = 600
const ART_H = 270 // palette crop 1200x540 at 600 wide; the style-guide crop uses the same aspect
const PALETTE_CROP_H = 540 // the PNG is 630 tall; the last 90px carry the hex labels
const PALETTE_EXPECT = { w: 1200, h: 630 }
const GUIDE_EXPECT = { w: 1588, h: 2246 }
const NARROWEST = 217 // the narrowest tile, in CSS px
const FLOOR = 11 // smallest text in tile art at the narrowest tile, in CSS px
const PAPER = '#FFFFFF' // the style guide's own paper colour (styleGuideRaster.js)
const GUIDE_PAD_LEFT = 24 // CSS px of paper left of the ladder crop, so the type does not touch the edge
const GUIDE_PAD_RIGHT = 24 // and the same to its right

// Inputs the manifest does not carry.
const SCALE_INPUTS = {
  's-major-third': { base: null, ratioLabel: null, mobileBase: null },
  's-perfect-fourth': { base: 18, ratioLabel: 'Perfect fourth', mobileBase: 16 },
}
const GUIDE_FONTS = { heading: { family: 'Space Grotesk', weight: 700, category: 'sans-serif' }, body: { family: 'Inter', weight: 400, category: 'sans-serif' } }
// Each specimen's body line names its own body face and weight, set in that face,
// so no two tiles print the same sentence and the line is true by construction.
const specimenLine = (family, weight) => `${family} ${weight} for body text.`

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const fail = (msg) => { throw new Error(msg) }
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))

// ── Server ──────────────────────────────────────────────────────────────────

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

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

// ── Iconify: the real API, then the package it serves, cached on disk ──────

const ICONIFY_HOSTS = ['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com']
const iconifySources = new Map()

async function readJson(file) { try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch { return null } }

async function packageData(pack) {
  const file = path.join(CACHE, 'iconify', `${pack}-package.json`)
  const cached = await readJson(file)
  if (cached) return cached
  const meta = await (await fetch(`https://cdn.jsdelivr.net/npm/@iconify-json/${pack}/package.json`, { signal: AbortSignal.timeout(30000) })).json()
  const r = await fetch(`https://cdn.jsdelivr.net/npm/@iconify-json/${pack}@${meta.version}/icons.json`, { signal: AbortSignal.timeout(60000) })
  if (!r.ok) fail(`@iconify-json/${pack} answered ${r.status}`)
  const data = await r.json()
  data.__version = meta.version
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data))
  return data
}

// What /{pack}.json?icons=a,b answers, cut from the package: each icon, its
// aliases' parents, and the pack's default size.
function subset(data, names) {
  const out = { prefix: data.prefix, icons: {}, aliases: {}, width: data.width, height: data.height }
  for (const n of names) {
    let cur = n
    for (let hop = 0; hop < 8; hop += 1) {
      if (data.icons?.[cur]) { out.icons[cur] = data.icons[cur]; break }
      const alias = data.aliases?.[cur]
      if (!alias) break
      out.aliases[cur] = alias
      cur = alias.parent
    }
  }
  return out
}

async function iconifyBody(url) {
  const u = new URL(url)
  const m = /^\/([a-z0-9-]+)\.json$/.exec(u.pathname)
  const names = (u.searchParams.get('icons') || '').split(',').filter(Boolean)
  if (!m || !names.length) return null
  const pack = m[1]
  const key = createHash('sha1').update(`${pack}:${[...names].sort().join(',')}`).digest('hex').slice(0, 12)
  const file = path.join(CACHE, 'iconify', `${pack}-${key}.json`)
  const cached = await readJson(file)
  if (cached) { iconifySources.set(pack, cached.__source); return cached.body }
  let body
  let source
  try {
    const r = await fetch(`https://api.iconify.design/${pack}.json?icons=${names.map(encodeURIComponent).join(',')}`, { signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(`answered ${r.status}`)
    body = await r.json()
    source = 'api.iconify.design'
  } catch (err) {
    console.warn(`iconify ${pack}: ${err.message}; reading @iconify-json/${pack} from jsdelivr`)
    const data = await packageData(pack)
    body = subset(data, names)
    source = `@iconify-json/${pack}@${data.__version}`
  }
  iconifySources.set(pack, source)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify({ __source: source, body }))
  return body
}

// ── Browser plumbing ────────────────────────────────────────────────────────

let browser
let util // a blank page: canvas work only, no app on it
let baseURL

// A fresh context per tool run: Font Pair writes its choice into the project
// kit, and a later tool would open on it.
async function withPage(opts, fn) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-AU', timezoneId: 'UTC', acceptDownloads: true, baseURL })
  try {
    // One Tap's script is answered empty, as tests/user-sim/base.js does.
    await ctx.route(/accounts\.google\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    // The font catalogue is pinned to the bundled list; the faces themselves still load from Google.
    await ctx.route(/\/api\/fonts/, (r) => r.abort())
    await ctx.route(/googleapis\.com\/webfonts\/v1\/webfonts/, (r) => r.abort())
    for (const host of ICONIFY_HOSTS) {
      await ctx.route(new RegExp(`^https://${host.replace(/\./g, '\\.')}/`), async (route) => {
        const body = await iconifyBody(route.request().url()).catch(() => null)
        await route.fulfill({
          status: body ? 200 : 404,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(body || {}),
        })
      })
    }
    const page = await ctx.newPage()
    await page.clock.setFixedTime(FIXED_TIME)
    await signIn(page, { plan: 'pro', ...opts })
    return await fn(page)
  } finally {
    await ctx.close()
  }
}

async function capture(page, label, trigger) {
  let dl
  try {
    ;[dl] = await Promise.all([page.waitForEvent('download', { timeout: DOWNLOAD_MS }), trigger()])
  } catch (err) {
    fail(`${label}: no download within ${DOWNLOAD_MS / 1000}s (${err.message.split('\n')[0]})`)
  }
  const file = path.join(RAW, dl.suggestedFilename())
  await dl.saveAs(file)
  return { file, name: dl.suggestedFilename(), bytes: await fs.readFile(file) }
}

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) fail('not a PNG')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

// Crop (in source pixels), optionally pad the left with paper, resize to
// outW x outH and encode as WebP. Also reports what the crop holds: the flat
// colour runs along its middle row, and whether every pixel of each run's
// inner area matches (a card with no text in it).
async function toWebp(png, { sx, sy, sw, sh, outW, outH, padLeft = 0, paper = PAPER, probeColumns = false }) {
  const res = await util.evaluate(async (p) => {
    const bin = atob(p.b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    let runs = null
    if (p.probeColumns) {
      const probe = document.createElement('canvas')
      probe.width = p.sw
      probe.height = p.sh
      const pc = probe.getContext('2d', { willReadFrequently: true })
      pc.drawImage(bmp, p.sx, p.sy, p.sw, p.sh, 0, 0, p.sw, p.sh)
      const mid = Math.floor(p.sh / 2)
      const row = pc.getImageData(0, mid, p.sw, 1).data
      const hex = (i) => '#' + [row[i * 4], row[i * 4 + 1], row[i * 4 + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
      runs = []
      for (let x = 0; x < p.sw; x += 1) {
        const h = hex(x)
        if (runs.length && runs[runs.length - 1].hex === h) runs[runs.length - 1].x1 = x + 1
        else runs.push({ hex: h, x0: x, x1: x + 1 })
      }
      const all = pc.getImageData(0, 0, p.sw, p.sh).data
      for (const run of runs) {
        if (run.x1 - run.x0 < 8) continue
        const want = run.hex
        for (let y = 0; y < p.sh && !run.dirty; y += 1) {
          for (let x = run.x0 + 2; x < run.x1 - 2; x += 1) {
            const o = (y * p.sw + x) * 4
            const h = '#' + [all[o], all[o + 1], all[o + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
            if (h !== want) { run.dirty = true; break }
          }
        }
      }
      runs = runs.filter((r) => r.x1 - r.x0 >= 8).map((r) => ({ hex: r.hex, width: r.x1 - r.x0, uniform: !r.dirty }))
    }
    const c = document.createElement('canvas')
    c.width = p.outW
    c.height = p.outH
    const g = c.getContext('2d')
    g.fillStyle = p.paper
    g.fillRect(0, 0, p.outW, p.outH)
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    const k = p.outW / (p.sw + p.padLeft)
    g.drawImage(bmp, p.sx, p.sy, p.sw, p.sh, p.padLeft * k, 0, p.sw * k, p.sh * k)
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', p.q))
    const back = await createImageBitmap(blob)
    const out = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000))
    return { b64: btoa(s), width: back.width, height: back.height, type: blob.type, runs }
  }, { b64: png.toString('base64'), q: WEBP_QUALITY, sx, sy, sw, sh, outW, outH, padLeft, paper, probeColumns })
  if (res.type !== 'image/webp') fail(`browser encoded ${res.type}, not WebP`)
  if (res.width !== outW || res.height !== outH) fail(`WebP is ${res.width}x${res.height}, expected ${outW}x${outH}`)
  return { buf: Buffer.from(res.b64, 'base64'), width: res.width, height: res.height, runs: res.runs }
}

// Fail unless every face is really loaded: a canvas silently falls back otherwise.
async function fontsLoaded(page, faces, sample) {
  const missing = await page.evaluate(async ({ faces: list, text }) => {
    await Promise.all(list.map((f) => document.fonts.load(`${f.weight} 24px "${f.family}"`, text)))
    await document.fonts.ready
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => ({ family: f.family.replace(/["']/g, ''), range: String(f.weight).split(' ').map(Number) }))
    const covers = (l, w) => l.range.length === 2 ? l.range[0] <= w && w <= l.range[1] : l.range[0] === w
    const absent = list.filter((f) => !loaded.some((l) => l.family === f.family && covers(l, f.weight))).map((f) => `${f.weight} ${f.family}`)
    return absent.length ? [...absent, `(loaded: ${[...new Set(loaded.map((l) => `${l.family} ${l.range.join('-')}`))].slice(0, 8).join('; ')})`] : absent
  }, { faces, text: sample })
  if (missing.length) fail(`fonts did not load in the page (the canvas would fall back): ${missing.join(', ')}`)
}

const outputs = { webp: new Map(), palettes: {}, pairs: {}, icons: {}, tints: {}, code: {}, floors: {} }

const saveWebp = (file, result) => outputs.webp.set(file, result)

// ── Palette ─────────────────────────────────────────────────────────────────

async function palette(row) {
  const want = row.colors.map((c) => c.toUpperCase())
  const dl = await withPage({}, async (page) => {
    await go(page, `/create/palette?c=${want.map((c) => c.replace('#', '')).join(',')}`)
    await page.getByRole('button', { name: /^Save or share/ }).first().click()
    return capture(page, row.id, () => page.locator('.plb-menu-item', { hasText: 'Download PNG card' }).click())
  })
  const { w, h } = pngSize(dl.bytes)
  if (w !== PALETTE_EXPECT.w || h !== PALETTE_EXPECT.h) fail(`${row.id}: palette PNG is ${w}x${h}, expected ${PALETTE_EXPECT.w}x${PALETTE_EXPECT.h}`)
  const out = await toWebp(dl.bytes, { sx: 0, sy: 0, sw: w, sh: PALETTE_CROP_H, outW: ART_W, outH: ART_H, probeColumns: true })
  const got = out.runs.map((r) => r.hex)
  if (out.runs.some((r) => !r.uniform)) fail(`${row.id}: the cropped card is not flat colour (text or shading inside the crop)`)
  if (got.join() !== want.join()) fail(`${row.id}: the card's columns are ${got.join(', ')}, the row says ${want.join(', ')}`)
  outputs.webp.set(`${row.id}.webp`, out)
  outputs.palettes[row.id] = { colors: got, colorsSha256: sha256(want.join(',')), rawSha256: sha256(dl.bytes), rawName: dl.name }
  outputs.floors[row.id] = { text: false }
}

// ── Font pair ───────────────────────────────────────────────────────────────

const cssVar = (css, name) => {
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(css)
  if (!m) fail(`exported CSS has no ${name}`)
  return m[1].trim()
}

// The specimen div: the exported CSS's four values applied verbatim, painted
// on the app's own card ground and ink, at 300 x 200 CSS px.
async function specimen(page, id, heading, css) {
  const vars = {
    '--font-heading': cssVar(css, '--font-heading'),
    '--weight-heading': cssVar(css, '--weight-heading'),
    '--font-body': cssVar(css, '--font-body'),
    '--weight-body': cssVar(css, '--weight-body'),
  }
  const shots = {}
  const bodyFamily = cssVar(css, '--font-body').split(',')[0].replace(/['"]/g, '').trim()
  const line = specimenLine(bodyFamily, vars['--weight-body'])
  // The export's own @import brings the two faces in, as it would in a user's page.
  const importUrl = /@import url\('([^']+)'\)/.exec(css)?.[1] || fail(`${id}: the export has no @import`)
  await page.addStyleTag({ url: importUrl })
  await page.evaluate(({ v, name, line }) => {
    const el = document.createElement('div')
    el.id = 'auth-wall-specimen'
    for (const [k, val] of Object.entries(v)) el.style.setProperty(k, val)
    el.style.cssText += ';position:fixed;left:0;top:0;width:300px;height:200px;box-sizing:border-box;padding:20px;overflow:hidden;z-index:2147483000;display:flex;flex-direction:column;background:var(--card);color:var(--t0);'
    el.innerHTML = '<div id="aws-aa" style="font:var(--weight-heading) 64px/1 var(--font-heading);margin:0">Aa</div>'
      + '<div id="aws-name" style="font:var(--weight-heading) 18px/24px var(--font-heading);margin:4px 0 0"></div>'
      + '<div id="aws-line" style="font:var(--weight-body) 16px/1.5 var(--font-body);margin:auto 0 0"></div>'
    el.querySelector('#aws-name').textContent = name
    el.querySelector('#aws-line').textContent = line
    document.body.appendChild(el)
  }, { v: vars, name: heading, line })
  const faces = [
    { family: heading, weight: Number(vars['--weight-heading']) },
    { family: bodyFamily, weight: Number(vars['--weight-body']) },
  ]
  await fontsLoaded(page, faces, `Aa ${heading} ${line}`)
  const fit = await page.evaluate(() => {
    const box = document.getElementById('auth-wall-specimen')
    const r = box.getBoundingClientRect()
    const kids = ['aws-aa', 'aws-name', 'aws-line'].map((i) => document.getElementById(i).getBoundingClientRect())
    return { w: r.width, h: r.height, top: Math.min(...kids.map((k) => k.top)) - r.top, bottom: r.bottom - Math.max(...kids.map((k) => k.bottom)), scrollH: box.scrollHeight, lineH: kids[2].height, nameW: document.getElementById('aws-name').scrollWidth }
  })
  if (fit.scrollH > 200 || fit.bottom < 0) fail(`${id}: the specimen overflows its 300x200 box (${JSON.stringify(fit)})`)
  if (fit.nameW > 260) fail(`${id}: the family name is wider than the box (${fit.nameW}px)`)
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t) }, theme)
    await page.evaluate(() => document.fonts.ready)
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 200 }, type: 'png', animations: 'disabled', caret: 'hide' })
    const { w, h } = pngSize(png)
    if (w !== 600 || h !== 400) fail(`${id}: ${theme} screenshot is ${w}x${h}, expected 600x400`)
    shots[theme] = await toWebp(png, { sx: 0, sy: 0, sw: w, sh: h, outW: 600, outH: 400 })
  }
  return { shots, fit, line }
}

async function pair(row) {
  const [heading, body] = row.sourceId.split(' + ')
  const result = await withPage({}, async (page) => {
    await go(page, '/create/font-pair')
    await page.waitForSelector('#fpr-export')
    if (heading !== 'Playfair Display') {
      await page.getByRole('button', { name: /Heading family/ }).click()
      await page.getByLabel('Search font families').fill(heading)
      await page.locator(`button.fbd-tile[aria-label^="Use ${heading} "]`).click()
    }
    await page.getByRole('heading', { name: `Body faces that work under ${heading}` }).waitFor()
    await page.locator('.fpr-suggest-grid .fpr-card').first().waitFor()
    const suggestions = (await page.locator('.fpr-card-name').allInnerTexts()).map((t) => t.split('\n')[0].trim())
    if (!suggestions.includes(body)) {
      fail(`${row.id}: ${body} is not among the tool's suggestions for ${heading}: ${suggestions.join(', ')}`)
    }
    await page.locator('.fpr-card', { has: page.locator('.fpr-card-name', { hasText: body }) }).getByRole('button', { name: /Use this pair/ }).click()
    await page.getByRole('button', { name: 'Copy CSS' }).first().waitFor()
    const css = (await page.locator('#fpr-export').innerText()).replace(/\r/g, '')
    if (cssVar(css, '--weight-heading') !== '700' || cssVar(css, '--weight-body') !== '400') fail(`${row.id}: weights are not 700 / 400`)
    if (!cssVar(css, '--font-heading').startsWith(`'${heading}'`) || !cssVar(css, '--font-body').startsWith(`'${body}'`)) fail(`${row.id}: the export names other families:\n${css}`)
    const made = await specimen(page, row.id, heading, css)
    return { css, suggestions, ...made }
  })
  await saveWebp(`${row.id}-light.webp`, result.shots.light)
  await saveWebp(`${row.id}-dark.webp`, result.shots.dark)
  outputs.pairs[row.id] = {
    heading: { family: heading, stack: cssVar(result.css, '--font-heading'), weight: 700 },
    body: { family: body, stack: cssVar(result.css, '--font-body'), weight: 400 },
    suggestions: result.suggestions,
    specimenLine: result.line,
    cssSha256: sha256(result.css),
  }
  outputs.floors[row.id] = { text: true, minTextCssPx: 16, artCssWidth: 300, fit: result.fit }
}

// ── Icons ───────────────────────────────────────────────────────────────────

async function icons(row) {
  const group = row.sourceId
  const zipFile = await withPage({}, async (page) => {
    await go(page, `/create/icons/groups?group=${group}`)
    const exportBtn = page.getByRole('button', { name: 'Export group' })
    await exportBtn.waitFor()
    await page.waitForFunction(() => !document.querySelector('.igp-export')?.disabled, null, { timeout: 30000 })
    return capture(page, row.id, () => exportBtn.click())
  })
  if (zipFile.name !== `${group}-icons.zip`) fail(`${row.id}: downloaded ${zipFile.name}`)
  const zip = await JSZip.loadAsync(zipFile.bytes)
  const names = groupFileNames(PREMADE_ICON_GROUPS.find((g) => g.id === group).icons)
  const items = []
  for (let i = 0; i < WALL_ICON_COUNT; i += 1) {
    const ref = row.refs[i]
    const entry = zip.file(`${group}-icons/svg/${names[i]}.svg`)
    if (!entry) fail(`${row.id}: the zip has no svg/${names[i]}.svg`)
    const svg = (await entry.async('string')).replace(/\r/g, '')
    if (!/currentColor/.test(svg) || !/stroke-width="2"/.test(svg)) fail(`${row.id}: ${names[i]} is not currentColor at stroke 2`)
    items.push({ ref, name: names[i], svg })
  }
  const packs = [...new Set(items.map((it) => parseIconRef(it.ref).pack))]
  outputs.icons[row.id] = { group, pack: packs[0], stroke: 2, items, sha256: sha256(items.map((it) => it.svg).join('\n')) }
}

// ── Tint ────────────────────────────────────────────────────────────────────

const TINT_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

async function tint(row) {
  const hex = row.sourceId.toUpperCase()
  const file = await withPage({}, async (page) => {
    await go(page, '/create/tint')
    const input = page.getByLabel('Base colour 1 hex')
    if ((await input.inputValue()).toUpperCase() !== hex) {
      await input.fill(hex)
      await input.blur()
    }
    await page.getByRole('button', { name: 'Copy or save' }).click()
    return capture(page, row.id, () => page.locator('[role=menu]').getByText('Download', { exact: true }).click())
  })
  const want = `tint-${hex.replace('#', '').toLowerCase()}.css`
  if (file.name !== want) fail(`${row.id}: downloaded ${file.name}, expected ${want}`)
  const css = file.bytes.toString('utf8').replace(/\r/g, '')
  const steps = [...css.matchAll(/--tint-(\d+):\s*(#[0-9a-fA-F]{6});/g)].map((m) => ({ step: m[1], hex: m[2].toUpperCase() }))
  if (steps.map((s) => s.step).join() !== TINT_STEPS.join()) fail(`${row.id}: tint steps are ${steps.map((s) => s.step).join()}`)
  if (new Set(steps.map((x) => x.hex)).size !== TINT_STEPS.length) fail(`${row.id}: the ramp repeats a colour`)
  outputs.tints[row.id] = { source: hex, steps, cssSha256: sha256(css) }
}

// ── Type scale ──────────────────────────────────────────────────────────────

async function scale(row) {
  const inputs = SCALE_INPUTS[row.id] || fail(`${row.id}: no scale inputs recorded`)
  const text = await withPage({}, async (page) => {
    await go(page, '/create/type-scale')
    if (inputs.base) {
      await page.locator('.snapv-value').first().click()
      const field = page.locator('.snapv-input').first()
      await field.fill(String(inputs.base))
      await field.press('Enter')
    }
    if (inputs.ratioLabel) {
      await page.locator('#tsc-ratio').click()
      await page.getByRole('option', { name: new RegExp(inputs.ratioLabel) }).click()
    }
    if (inputs.mobileBase) {
      await page.getByRole('button', { name: 'Fine tuning' }).click()
      await page.locator('#tsc-mbase').locator('xpath=..').locator('.snapv-value').click()
      const field = page.locator('#tsc-mbase').locator('xpath=..').locator('.snapv-input')
      await field.fill(String(inputs.mobileBase))
      await field.press('Enter')
    }
    await page.getByRole('tab', { name: 'Developer handoff' }).click()
    return (await page.locator('#tsc-export').innerText()).replace(/\r/g, '')
  })
  const lines = text.split('\n')
  const at = lines.indexOf(':root {')
  if (at < 0) fail(`${row.id}: the export has no ":root {" line`)
  const excerpt = lines.slice(at, at + 7)
  const wantBase = inputs.base || 16
  const wantMobile = inputs.mobileBase || 15
  const baseLine = lines.find((l) => l.includes('--text-base:')) || ''
  if (!baseLine.includes(`${wantMobile}px → ${wantBase}px`)) fail(`${row.id}: --text-base reads "${baseLine.trim()}", expected ${wantMobile}px → ${wantBase}px`)
  if (excerpt.length !== 7 || excerpt.slice(1).some((l) => !/^\s+--text-/.test(l))) fail(`${row.id}: the 7 lines after :root are not 6 size tokens`)
  outputs.code[row.id] = { lines: excerpt, cssSha256: sha256(text), base: wantBase, mobileBase: wantMobile }
}

// ── Style guide ─────────────────────────────────────────────────────────────

function sizeOf(op) { return Number(/(\d+(?:\.\d+)?)px/.exec(op.font)[1]) }

// Which part of the sheet is kept: the biggest run of the type ladder, from the
// top, whose smallest text stays at or over the floor once the crop is shrunk to
// the narrowest tile. The tile holds the type with the same paper on both sides,
// so a crop is as wide as the widest kept row plus both margins (never narrower
// than the tile's aspect gives for the rows' own height) and grows taller, rows
// centred, to keep that aspect. `boxes` are the measured text boxes, one per
// text op. Derived from the layout, not typed in.
function guideCrop(texts, boxes) {
  const ladder = texts.filter((o) => o.text === 'The quick brown fox')
  let keep = null
  for (let n = 1; n <= ladder.length; n += 1) {
    const set = ladder.slice(0, n)
    const inSet = new Set(set)
    const top = Math.floor(Math.min(...set.map((o) => o.y - sizeOf(o)))) - 2
    const bottom = Math.ceil(Math.max(...set.map((o) => o.y + sizeOf(o) * 0.28)))
    const labelRight = Math.max(0, ...boxes.filter((bx, i) => !inSet.has(texts[i]) && bx.bottom > top && bx.top < bottom && bx.left < 152).map((bx) => bx.right))
    const x0 = Math.max(150, labelRight + 0.25)
    const typeRight = Math.max(...boxes.filter((bx, i) => inSet.has(texts[i])).map((bx) => bx.right))
    const w = Math.max((bottom - top) * ART_W / ART_H, GUIDE_PAD_LEFT + (typeRight - x0) + GUIDE_PAD_RIGHT)
    const h = w * ART_H / ART_W
    const y0 = top - (h - (bottom - top)) / 2
    const min = Math.min(...set.map(sizeOf))
    // Taller than the rows need, so no other text may sit in the extra paper.
    const intruder = boxes.some((bx, i) => !inSet.has(texts[i]) && bx.right > x0 + 0.5 && bx.left < x0 + w - GUIDE_PAD_LEFT && bx.bottom > y0 && bx.top < y0 + h)
    if (!intruder && min * NARROWEST / w >= FLOOR + 0.3) keep = { n, set, x0, y0, h, w, min }
  }
  return keep || fail('no part of the type ladder stays over the floor')
}

async function guide(row) {
  const design = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
  const colours = AUTH_WALL.find((r) => r.id === 'p-ocean-deep').colors
  design.palette = { ...design.palette, base: colours[0], colors: [...colours] }
  design.fonts = JSON.parse(JSON.stringify(GUIDE_FONTS))
  design.name = row.name // the export panel titles the sheet from design.name
  const project = { id: 'ocean-deep-kit', name: row.name, design, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }
  const ops = buildStyleGuideLayout({ ...design, name: row.name }, { projectName: row.name, watermark: false, date: FIXED_TIME })
  const texts = ops.filter((o) => o.op === 'text')

  const result = await withPage({ projects: [project] }, async (page) => {
    await go(page, `/projects/${project.id}`)
    await page.addStyleTag({ url: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;600&display=swap` })
    await fontsLoaded(page, [{ family: 'Space Grotesk', weight: 700 }, { family: 'Inter', weight: 400 }, { family: 'Inter', weight: 600 }], 'The quick brown fox Ocean Deep kit 0123456789')
    // Which text the crop touches, measured with the loaded faces.
    const boxes = await page.evaluate((list) => {
      const c = document.createElement('canvas').getContext('2d')
      return list.map((o) => {
        c.font = o.font
        const size = Number(/(\d+(?:\.\d+)?)px/.exec(o.font)[1])
        let w = c.measureText(o.text).width + (o.letterSpacing || 0) * o.text.length
        if (o.maxWidth && w > o.maxWidth) w = o.maxWidth
        const left = o.align === 'right' ? o.x - w : o.x
        return { text: o.text, left, right: left + w, top: o.y - size, bottom: o.y + size * 0.28, size }
      })
    }, texts)
    await page.getByRole('button', { name: /^Export/ }).first().click()
    const dlg = page.getByRole('dialog')
    // The panel lists formats, then the file type of the one chosen.
    await dlg.getByText('Style guide', { exact: true }).click()
    await dlg.getByText('PNG', { exact: true }).click()
    const dl = await capture(page, row.id, () => dlg.getByRole('button', { name: 'Export style guide (PNG)' }).click())
    return { dl, boxes }
  })
  const plan = guideCrop(texts, result.boxes)
  const crop = { x0: plan.x0, y0: plan.y0, w: plan.w - GUIDE_PAD_LEFT, h: plan.h }
  const kept = new Set(plan.set)
  const { w, h } = pngSize(result.dl.bytes)
  if (w !== GUIDE_EXPECT.w || h !== GUIDE_EXPECT.h) fail(`${row.id}: style guide PNG is ${w}x${h}, expected ${GUIDE_EXPECT.w}x${GUIDE_EXPECT.h}`)
  if (result.dl.name !== 'ocean-deep-kit-style-guide.png') fail(`${row.id}: downloaded ${result.dl.name}`)

  // The floor, asserted from the layout: every piece of text the crop touches is
  // a kept ladder row, lies wholly inside, and is big enough once shrunk.
  // The row labels end just short of the type; start the crop right after the widest of them.
  const labelRight = Math.max(0, ...result.boxes.filter((b, i) => !kept.has(texts[i]) && b.bottom > crop.y0 && b.top < crop.y0 + crop.h && b.left < 152).map((b) => b.right))
  if (labelRight + 0.25 >= Math.min(...plan.set.map((o) => o.x))) fail(`${row.id}: the row labels run into the type (${labelRight.toFixed(2)})`)
  crop.x0 = Math.max(crop.x0, labelRight + 0.25)
  const x1 = crop.x0 + crop.w
  const y1 = crop.y0 + crop.h
  let minInside = Infinity
  let widest = 0
  result.boxes.forEach((b, i) => {
    const touches = b.right > crop.x0 + 0.5 && b.left < x1 && b.bottom > crop.y0 && b.top < y1
    if (!touches) return
    if (!kept.has(texts[i])) fail(`${row.id}: "${b.text}" (${b.size}px) falls inside the crop`)
    if (b.left < crop.x0 || b.right > x1 - GUIDE_PAD_RIGHT || b.top < crop.y0 || b.bottom > y1) fail(`${row.id}: "${b.text}" is clipped by the crop (${JSON.stringify(b)} vs ${JSON.stringify(crop)})`)
    minInside = Math.min(minInside, b.size)
    widest = Math.max(widest, b.right - b.left)
  })
  const cropWidth = crop.w + GUIDE_PAD_LEFT
  const at217 = minInside * NARROWEST / cropWidth
  if (!(at217 >= FLOOR)) fail(`${row.id}: smallest text is ${at217.toFixed(2)}px at ${NARROWEST}px, under the ${FLOOR}px floor`)

  const out = await toWebp(result.dl.bytes, { sx: crop.x0 * DPR, sy: crop.y0 * DPR, sw: Math.round(crop.w * DPR), sh: Math.round(crop.h * DPR), outW: ART_W, outH: ART_H, padLeft: GUIDE_PAD_LEFT * DPR })
  await saveWebp(`${row.id}.webp`, out)
  outputs.floors[row.id] = { text: true, minTextCssPx: minInside, artCssWidth: Math.round(cropWidth * 100) / 100, at217: Math.round(at217 * 100) / 100, widestRow: Math.round(widest) }
  outputs.guide = { project: row.name, fonts: GUIDE_FONTS, rawSha256: sha256(result.dl.bytes), crop: { x: crop.x0, y: crop.y0, w: Math.round(crop.w * 100) / 100, h: crop.h, padLeft: GUIDE_PAD_LEFT, padRight: GUIDE_PAD_RIGHT, ladderRows: plan.n } }
}

// ── Main ────────────────────────────────────────────────────────────────────

function finishFloors() {
  for (const [id, f] of Object.entries(outputs.floors)) {
    if (!f.text) continue
    f.at217 = Math.round((f.minTextCssPx * NARROWEST / f.artCssWidth) * 100) / 100
    if (f.at217 < FLOOR) fail(`${id}: smallest text is ${f.at217}px at ${NARROWEST}px, under the ${FLOOR}px floor`)
  }
}

async function writeOutputs() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const f of await fs.readdir(OUT_DIR)) if (f.endsWith('.webp')) await fs.rm(path.join(OUT_DIR, f))
  const assets = {}
  for (const [file, r] of [...outputs.webp].sort(([a], [b]) => a.localeCompare(b))) {
    await fs.writeFile(path.join(OUT_DIR, file), r.buf)
    assets[file] = { width: r.width, height: r.height, bytes: r.buf.length, sha256: sha256(r.buf) }
  }
  const order = AUTH_WALL.map((r) => r.id)
  const byRow = (obj) => Object.fromEntries(order.filter((id) => obj[id]).map((id) => [id, obj[id]]))
  const data = {
    floor: FLOOR,
    narrowest: NARROWEST,
    assets,
    palettes: byRow(outputs.palettes),
    pairs: byRow(outputs.pairs),
    icons: byRow(outputs.icons),
    tints: byRow(outputs.tints),
    code: byRow(outputs.code),
    guide: outputs.guide,
    floors: byRow(outputs.floors),
  }
  const header = '// Written by scripts/auth-wall/generate.mjs from the tools\' own exports. Do not edit by hand:\n'
    + '// run `npm run auth-wall:generate`. The icon SVGs, tint ramps and CSS excerpts here are drawn by\n'
    + '// the wall component; the sha256 values pin the WebPs in public/auth-wall/ and the exports they came from.\n\n'
  await fs.writeFile(OUT_DATA, `${header}export const AUTH_WALL_GENERATED = ${JSON.stringify(data, null, 2)}\n`)
  return assets
}

async function main() {
  await fs.mkdir(RAW, { recursive: true })
  let dist = args.dist
  if (!dist) {
    dist = 'dist-auth-wall'
    console.log('building in test mode...')
    execFileSync(process.execPath, [viteBin, 'build', '--mode', 'test', '--outDir', dist], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
  }
  const server = await startPreview(dist)
  baseURL = server.base
  try {
    browser = await chromium.launch()
    util = await browser.newPage()
    for (const row of AUTH_WALL) {
      console.log(`${row.id} ...`)
      if (row.kind === 'palette') await palette(row)
      else if (row.kind === 'pair') await pair(row)
      else if (row.kind === 'icons') await icons(row)
      else if (row.kind === 'tint') await tint(row)
      else if (row.kind === 'scale') await scale(row)
      else if (row.kind === 'guide') await guide(row)
      else fail(`${row.id}: unknown kind ${row.kind}`)
    }
    finishFloors()
    const assets = await writeOutputs()
    const total = Object.values(assets).reduce((n, a) => n + a.bytes, 0)
    console.log(`wrote ${Object.keys(assets).length} WebPs (${total} bytes) and ${path.relative(root, OUT_DATA)}`)
    for (const [pack, source] of iconifySources) console.log(`icons: ${pack} from ${source}`)
  } finally {
    await browser?.close()
    server.child.kill()
  }
}

main().catch((err) => {
  console.error(`auth-wall: ${err.message}`)
  process.exit(1)
})
