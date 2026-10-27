// Render the cover of every live export template, for the picker's tiles.
//
//   node scripts/export-templates/generate.mjs                      render everything, write the assets
//   node scripts/export-templates/generate.mjs --only=book-atlas    render some tiles (check mode: writes nothing)
//
// Every tile is a page the product's own export code produced: the UI kit
// (renderUiKit over the kit layout), the design system book (buildDesignSystemBook)
// and the brand guidelines deck (buildBrandGuidelines), once for each live id in
// src/config/exportTemplates.js, for the one example project the homepage exports
// use (the Ferrule cover). The tile is the cover and nothing else. There is no
// processing beyond scaling down and WebP encoding. Run by hand; not part of CI.
// The outputs are committed.
//
// Writes
//   public/export-templates/<format>-<template>-<w>.webp   at 240, 480 and 720 w
//   src/data/exportTemplateThumbs.generated.js             the manifest (shape written at its top)
//   .cache/export-templates/master/*.png                   the 1600px masters (gitignored, never committed)
//
// How it stays deterministic
//   - The builders are pure string functions, so they run in Node here; the page is
//     the export HTML and nothing else.
//   - One Chromium context per capture, locale en-AU, timezone UTC, the clock held
//     at FIXED_TIME (the "Issued" lines read it).
//   - Google Fonts is asked once with a fixed user agent and answered from a disk
//     cache (.cache/export-templates/fonts/) after that. The documents' own chrome
//     faces and the kit's faces are read from public/fonts. No font file is written
//     to the repo by this script.
//   - Masters are 1600px wide and only ever scaled down.
//
// A re-run on the same Chromium, the same operating system fonts and a warm cache
// gives the same bytes. The sha256 values in the manifest show any drift.
//
// Exits 1 when a live template has no output, a page selector finds nothing, a font
// face used on the cover does not load, a cover title would be under 12 CSS px at
// the tile's narrowest display, an output is off its ratio or wider than its master,
// or a 240w file is over its byte budget.

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { renderUiKit, kitFontRequests, KIT_CHROME } from '../../src/utils/uiKitExport.js'
import { loadKitFonts, loadPublisherFonts } from '../../src/utils/kitFonts.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { EXPORT_TEMPLATES } from '../../src/config/exportTemplates.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { BASES, rolesOf } from '../../src/components/spectrum/spectrumKit.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = path.join(root, '.cache', 'export-templates')
const FONT_CACHE = path.join(CACHE, 'fonts')
const MASTER_DIR = path.join(CACHE, 'master')
const OUT_DIR = path.join(root, 'public', 'export-templates')
const OUT_DATA = path.join(root, 'src', 'data', 'exportTemplateThumbs.generated.js')
const PUBLIC = path.join(root, 'public')
const PUBLIC_DIR = '/export-templates/'

// Everything that decides the pixels, in one place.
const FIXED_TIME = new Date('2026-10-24T00:00:00Z')
const FONT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const WEBP_QUALITY = 0.86
const MASTER_W = 1600
const WIDTHS = [240, 480, 720]
const KB = 1000
const TILE_BUDGET = 14 * KB // the 240w file
const ASPECT_TOLERANCE = 0.005

// The tile's frame per format, as width over height (the picker's own ratios).
const RATIO = { book: 1 / Math.SQRT2, guidelines: 16 / 9, kit: 4 / 5 }
// The narrowest a tile is drawn: 114 CSS px at a 390 phone (the picker's sizes value).
const TILE_MIN_W = 114
const TITLE_FLOOR = 12
// Measured and kept: these layouts set the sample's cover title smaller than the floor
// at the tile's width. Each value is the size recorded when it was accepted, and a
// title that shrinks below it still fails the run. The name is a template's own
// cover size, so reaching the floor takes a larger cover title in that template.
const TITLE_WAIVED = Object.freeze({
  'book-specification': 10.0,
  'book-monograph': 7.7,
  'book-atlas': 4.2,
  'guidelines-presentation': 8.1,
  'guidelines-grid': 9.7,
  'kit-manual': 9.8,
})

// Page boxes in CSS px: the A4 page and the 297 by 167 mm slide.
const PAGE_W = { book: 793.7008, guidelines: 1122.5197 }
// The kit is a scrolling page, so its tile is the top of it at a phone's width, cut to 4:5.
// Manual stacks its contents index above the cover at that width, so its tile starts at the cover.
const KIT_VIEW_W = 360
const KIT_FROM = { manual: 'main' }

// Where each layout's cover and its title sit: [the cover's class, the title's selector inside it].
// The cover is the document's first page.
const COVER = {
  book: { specification: ['pg-cover', '.cv-title'], monograph: ['pg-cover', '.cv-title'], atlas: ['pg-cover', '.at-title'] },
  guidelines: { presentation: ['sl-cover', '.cv-title'], poster: ['sl-cover', '.cv-title'], grid: ['gd-cover', '.mh-title'] },
  kit: { studio: ['cover', '.cover-title'], manual: ['cover', '.cover-title'], showcase: ['cover', '.cover-family'] },
}
const PAGE_SELECTOR = { book: '.pg', guidelines: '.sl' }

// The example project: the homepage's default (its cover is cover-ferrule).
const SEED_INDEX = 4 // BASES: Signal
const HEADING = { family: 'Schibsted Grotesk', weight: 700, category: 'sans-serif' }
const BODY = { family: 'Literata', weight: 400, category: 'serif' }
const HARMONY = 'analogous'
const HARMONY_INDEX = 1 // HARMONIES in spectrumKit.js: Mono, Analogous, Complement, Triad
const PROJECT = 'Ferrule'

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const fail = (msg) => { throw new Error(msg) }
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))
const only = typeof args.only === 'string' ? new Set(args.only.split(',')) : null

// ── The example design and the documents ────────────────────────────────────

function exampleDesign() {
  const base = BASES[SEED_INDEX]
  const colors = rolesOf(base, HARMONY_INDEX, 0).map((r) => r.hex)
  const design = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
  design.palette = { ...design.palette, base: colors[0], harmony: HARMONY, extraColors: [], activeIdx: 0, colors }
  design.fonts = { heading: { ...HEADING }, body: { ...BODY } }
  design.name = PROJECT
  return { design, seed: base.label, colors }
}

// A file in public/, as the app's own loaders ask for it.
async function localFetch(url) {
  if (!String(url).startsWith('/fonts/')) return new Response(null, { status: 404 })
  try { return new Response(await fs.readFile(path.join(PUBLIC, url))) } catch { return new Response(null, { status: 404 }) }
}

// The server's chrome-face reader (api/_lib/exportDocument.js): one woff2 in public/fonts, as base64.
const chromeCache = new Map()
const FONT_FILE = /^[a-z0-9-]+\.woff2$/
async function chromeFont(file) {
  if (typeof file !== 'string' || !FONT_FILE.test(file)) return null
  if (!chromeCache.has(file)) {
    try { chromeCache.set(file, (await fs.readFile(path.join(PUBLIC, 'fonts', file))).toString('base64')) } catch { chromeCache.set(file, null) }
  }
  return chromeCache.get(file)
}

// The builders call fontData synchronously, so read every chrome face up front.
async function warmChromeFonts() {
  for (const file of await fs.readdir(path.join(PUBLIC, 'fonts'))) if (file.endsWith('.woff2')) await chromeFont(file)
  return (file) => chromeCache.get(file) ?? null
}

async function buildHtml(format, id, design, fontData) {
  if (format === 'book') return buildDesignSystemBook(design, { projectName: PROJECT, date: FIXED_TIME, template: id, fontData })
  if (format === 'guidelines') return buildBrandGuidelines(design, { projectName: PROJECT, date: FIXED_TIME, template: id, fontData })
  const template = await fs.readFile(path.join(root, 'src', 'templates', 'kit', `${id}.html`), 'utf8')
  const fonts = await loadKitFonts(kitFontRequests(design), { fetch: localFetch })
  const publisher = await loadPublisherFonts({ fetch: localFetch, families: KIT_CHROME[id] })
  const missing = [HEADING.family, BODY.family].filter((f) => !fonts[f])
  if (missing.length) fail(`kit-${id}: could not embed ${missing.join(', ')} from public/fonts`)
  if (publisher.publisherFonts.some((p) => !p.faces.length)) fail(`kit-${id}: the chrome faces did not load from public/fonts`)
  const out = renderUiKit(design, { tier: 'free', template, fonts, ...publisher, logo: null, date: FIXED_TIME })
  if (out.missing.length) fail(`kit-${id}: the kit reports missing fonts: ${out.missing.join(', ')}`)
  return out.html
}

// ── Browser plumbing ────────────────────────────────────────────────────────

let browser
let util // a blank page: canvas work only

async function cachedFont(route) {
  const url = route.request().url()
  const key = sha256(url).slice(0, 24)
  const meta = path.join(FONT_CACHE, `${key}.json`)
  const bin = path.join(FONT_CACHE, `${key}.bin`)
  let type
  let body
  try {
    type = JSON.parse(await fs.readFile(meta, 'utf8')).contentType
    body = await fs.readFile(bin)
  } catch {
    const res = await fetch(url, { headers: { 'user-agent': FONT_UA }, signal: AbortSignal.timeout(30000) })
    if (!res.ok) return route.abort()
    type = res.headers.get('content-type') || 'application/octet-stream'
    body = Buffer.from(await res.arrayBuffer())
    await fs.mkdir(FONT_CACHE, { recursive: true })
    await fs.writeFile(bin, body)
    await fs.writeFile(meta, JSON.stringify({ url, contentType: type }))
  }
  return route.fulfill({ status: 200, contentType: type, headers: { 'access-control-allow-origin': '*' }, body })
}

// A page holding one document, in a fresh context at one device scale factor.
async function withDocument(html, { viewport, dsf }, fn) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, locale: 'en-AU', timezoneId: 'UTC' })
  try {
    await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, cachedFont)
    const page = await ctx.newPage()
    await page.clock.setFixedTime(FIXED_TIME)
    await page.setContent(html, { waitUntil: 'networkidle' })
    return await fn(page)
  } finally {
    await ctx.close()
  }
}

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) fail('not a PNG')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

// What the cover shows, read in the page: the title's text and size, and every
// (family, weight) pair of visible text inside `root`. Then every one of those
// faces is loaded and must be a face the page really has.
async function readCover(page, rootLocator, titleSelector, label) {
  if (await rootLocator.count() < 1) fail(`${label}: the page selector found nothing`)
  const el = rootLocator.first()
  const info = await el.evaluate(async (node, sel) => {
    const title = node.querySelector(sel)
    if (!title) return { error: `no title element ${sel}` }
    const r = node.getBoundingClientRect()
    const pairs = new Map()
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const host = n.parentElement
      if (!n.textContent.trim() || !host || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(host.tagName)) continue
      const cs = getComputedStyle(host)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const box = host.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      const family = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')
      const weight = Number(cs.fontWeight) || (cs.fontWeight === 'bold' ? 700 : 400)
      const k = `${weight}|${family}`
      if (!pairs.has(k)) pairs.set(k, { family, weight, text: n.textContent.trim().slice(0, 40) })
    }
    const generic = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'ui-monospace', 'ui-sans-serif', 'ui-serif', 'cursive', 'fantasy', 'math', 'emoji'])
    const list = [...pairs.values()].filter((p) => !generic.has(p.family))
    await Promise.all(list.map((p) => document.fonts.load(`${p.weight} 24px "${p.family}"`, p.text)))
    await document.fonts.ready
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => {
      const w = String(f.weight).split(' ').map((x) => (x === 'normal' ? 400 : x === 'bold' ? 700 : Number(x)))
      return { family: f.family.replace(/["']/g, ''), lo: w[0], hi: w[w.length - 1] }
    })
    const missing = list.filter((p) => !loaded.some((l) => l.family === p.family && l.lo <= p.weight && p.weight <= l.hi)).map((p) => `${p.weight} ${p.family} ("${p.text}")`)
    return { w: r.width, h: r.height, title: { text: title.textContent.trim(), px: parseFloat(getComputedStyle(title).fontSize) }, missing, faces: list.map((p) => `${p.weight} ${p.family}`) }
  }, titleSelector)
  if (info.error) fail(`${label}: ${info.error}`)
  if (info.missing.length) fail(`${label}: a font face the cover uses did not load: ${info.missing.join(', ')}`)
  return info
}

// ── Compose, downscale, encode ──────────────────────────────────────────────

// Draw one screenshot onto a canvas of the exact master size, so a rounding error
// of a pixel in the screenshot never reaches the aspect check.
async function fitMaster(png, W, H) {
  const b64 = await util.evaluate(async ({ b64: src, W: cw, H: ch }) => {
    const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(src), (c) => c.charCodeAt(0))], { type: 'image/png' }))
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const g = c.getContext('2d')
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(bmp, 0, 0, cw, ch)
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    const out = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000))
    return btoa(s)
  }, { b64: png.toString('base64'), W, H })
  const buf = Buffer.from(b64, 'base64')
  const got = pngSize(buf)
  if (got.w !== W || got.h !== H) fail(`master is ${got.w}x${got.h}, expected ${W}x${H}`)
  return buf
}

// Downscale a master to each width (halving while more than twice the target,
// then a final step) and encode as WebP. Never scales up.
async function derive(master, widths) {
  const { w: mw } = pngSize(master)
  for (const w of widths) if (w > mw) fail(`output ${w}w is wider than its ${mw}w master`)
  const res = await util.evaluate(async ({ b64, list, q }) => {
    const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }))
    const out = []
    for (const w of list) {
      const h = Math.round(bmp.height * w / bmp.width)
      let src = bmp
      let sw = bmp.width
      let sh = bmp.height
      while (sw / 2 > w) {
        const nw = Math.round(sw / 2)
        const nh = Math.round(sh / 2)
        const step = document.createElement('canvas')
        step.width = nw
        step.height = nh
        const sg = step.getContext('2d')
        sg.imageSmoothingEnabled = true
        sg.imageSmoothingQuality = 'high'
        sg.drawImage(src, 0, 0, nw, nh)
        src = step
        sw = nw
        sh = nh
      }
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d')
      g.imageSmoothingEnabled = true
      g.imageSmoothingQuality = 'high'
      g.drawImage(src, 0, 0, w, h)
      const blob = await new Promise((r) => c.toBlob(r, 'image/webp', q))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      out.push({ w, h, type: blob.type, b64: btoa(s) })
    }
    return out
  }, { b64: master.toString('base64'), list: widths, q: WEBP_QUALITY })
  return res.map((r) => {
    if (r.type !== 'image/webp') fail(`browser encoded ${r.type}, not WebP`)
    return { w: r.w, h: r.h, buf: Buffer.from(r.b64, 'base64') }
  })
}

// ── One tile ────────────────────────────────────────────────────────────────

async function capture(format, id, html) {
  const label = `${format}-${id}`
  const [coverClass, titleSel] = COVER[format]?.[id] || fail(`${label}: no cover selectors are listed for this template`)
  const masterH = Math.round(MASTER_W / RATIO[format])

  if (format === 'kit') {
    // A full-page capture, clipped to 4:5, so the page's fixed corner notice sits at the
    // foot of the page and not over the picture.
    const viewW = KIT_VIEW_W
    const cropH = Math.round(viewW / RATIO.kit)
    return withDocument(html, { viewport: { width: viewW, height: cropH }, dsf: MASTER_W / viewW }, async (page) => {
      const info = await readCover(page, page.locator(`.${coverClass}`), titleSel, label)
      const from = KIT_FROM[id]
      const top = from ? await page.locator(from).first().evaluate((n) => Math.round(n.getBoundingClientRect().top + window.scrollY)) : 0
      const png = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', fullPage: true, clip: { x: 0, y: top, width: viewW, height: cropH } })
      return { png, cssW: viewW, info, masterH }
    })
  }

  const pageW = PAGE_W[format]
  const viewport = format === 'book' ? { width: 1000, height: 1300 } : { width: 1300, height: 800 }
  return withDocument(html, { viewport, dsf: MASTER_W / pageW }, async (page) => {
    const pages = page.locator(PAGE_SELECTOR[format])
    const first = pages.first()
    const cls = await first.getAttribute('class')
    if (!cls?.split(/\s+/).includes(coverClass)) fail(`${label}: the first page is not the cover (${cls})`)
    const info = await readCover(page, first, titleSel, label)
    if (Math.abs(info.w - pageW) > 1) fail(`${label}: the page is ${info.w.toFixed(1)} CSS px wide, expected ${pageW.toFixed(1)}`)
    const ratio = info.w / info.h
    if (Math.abs(ratio - RATIO[format]) / RATIO[format] > ASPECT_TOLERANCE) fail(`${label}: the page is ${ratio.toFixed(4)}:1, expected ${RATIO[format].toFixed(4)}:1`)
    const png = await first.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' })
    return { png, cssW: info.w, info, masterH }
  })
}

// ── Main ────────────────────────────────────────────────────────────────────

const kbOf = (n) => `${(n / KB).toFixed(1)} KB`

async function main() {
  await fs.mkdir(MASTER_DIR, { recursive: true })
  await fs.mkdir(FONT_CACHE, { recursive: true })
  const fontData = await warmChromeFonts()
  const { design, seed, colors } = exampleDesign()

  // Every live template id in the config has to come out the other end.
  const live = Object.entries(EXPORT_TEMPLATES).flatMap(([format, list]) => list.filter((t) => t.live).map((t) => ({ format, id: t.id })))
  const errors = []
  const tiles = []
  browser = await chromium.launch()
  try {
    util = await browser.newPage()
    for (const { format, id } of live) {
      const label = `${format}-${id}`
      if (only && !only.has(label)) continue
      try {
        const html = await buildHtml(format, id, design, fontData)
        const shot = await capture(format, id, html)
        const master = await fitMaster(shot.png, MASTER_W, shot.masterH)
        await fs.writeFile(path.join(MASTER_DIR, `${label}-master.png`), master)
        const files = await derive(master, WIDTHS)
        const titlePx = shot.info.title.px * (TILE_MIN_W / shot.cssW)
        if (titlePx < TITLE_FLOOR) {
          const kept = TITLE_WAIVED[label]
          const note = `${label}: the cover title "${shot.info.title.text}" is ${titlePx.toFixed(1)} CSS px at ${TILE_MIN_W}px wide, under ${TITLE_FLOOR}`
          if (kept !== undefined && titlePx >= kept - 0.05) console.warn(`WAIVED: ${note}`)
          else errors.push(kept === undefined ? note : `${note} (it was waived at ${kept})`)
        }
        for (const f of files) {
          const want = RATIO[format]
          if (Math.abs(f.w / f.h - want) / want > ASPECT_TOLERANCE) errors.push(`${label} ${f.w}w: aspect ${(f.w / f.h).toFixed(4)}, the frame wants ${want.toFixed(4)}`)
        }
        const small = files.find((f) => f.w === WIDTHS[0])
        if (small.buf.length > TILE_BUDGET) errors.push(`${label} ${small.w}w is ${kbOf(small.buf.length)}, over its ${kbOf(TILE_BUDGET)} budget`)
        tiles.push({ format, id, files, title: shot.info.title, titlePx, faces: shot.info.faces, sourceSha256: sha256(html) })
      } catch (err) {
        errors.push(err.message)
      }
    }
  } finally {
    await browser?.close()
  }

  for (const t of tiles) {
    for (const f of t.files) console.log(`${`${t.format}-${t.id}-${f.w}.webp`.padEnd(34)} ${String(f.w).padStart(4)}x${String(f.h).padEnd(4)} ${kbOf(f.buf.length).padStart(9)}  ${sha256(f.buf).slice(0, 12)}`)
    console.log(`title ${t.format}-${t.id}: "${t.title.text}" ${t.titlePx.toFixed(1)} CSS px at ${TILE_MIN_W}px wide; faces ${t.faces.join(', ')}`)
  }
  if (!only) {
    for (const { format, id } of live) if (!tiles.some((t) => t.format === format && t.id === id)) errors.push(`${format}-${id} is live in the config and has no output`)
  }
  if (errors.length) fail(`${errors.length} check(s) failed:\n  ${[...new Set(errors)].join('\n  ')}`)
  if (only) { console.log('--only: checked, nothing written'); return }

  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const f of await fs.readdir(OUT_DIR)) if (f.endsWith('.webp')) await fs.rm(path.join(OUT_DIR, f))
  const byFormat = {}
  for (const t of tiles) {
    const files = []
    for (const f of t.files) {
      const file = `${t.format}-${t.id}-${f.w}.webp`
      await fs.writeFile(path.join(OUT_DIR, file), f.buf)
      files.push({ file, width: f.w, height: f.h, bytes: f.buf.length, sha256: sha256(f.buf) })
    }
    byFormat[t.format] ??= {}
    byFormat[t.format][t.id] = { sourceSha256: t.sourceSha256, files }
  }
  const data = {
    version: 1,
    dir: PUBLIC_DIR,
    sample: { project: PROJECT, seed, harmony: HARMONY, colors, heading: { family: HEADING.family, weight: HEADING.weight }, body: { family: BODY.family, weight: BODY.weight } },
    widths: WIDTHS,
    tiles: byFormat,
  }
  const header = `// Written by scripts/export-templates/generate.mjs from the real export code. Do not edit by hand:
// regenerate with \`node scripts/export-templates/generate.mjs\`. The files named here are in public/export-templates/.
//
// SHAPE
//   EXPORT_TEMPLATE_THUMBS = {
//     version: 1,
//     dir: '/export-templates/',     public path prefix
//     sample: { project, seed, harmony, colors[], heading, body },   the one example project every tile is drawn from
//     widths: [240, 480, 720],
//     tiles: { <format>: { <template id>: { sourceSha256, files: [Thumb] } } },   one entry for each live template
//   }
//   Thumb = { file, width, height, bytes, sha256 }   smallest to largest; file is relative to dir
//   Every file of a format shares its ratio: book 1:1.414, guidelines 16:9, kit 4:5.

`
  await fs.writeFile(OUT_DATA, `${header}export const EXPORT_TEMPLATE_THUMBS = ${JSON.stringify(data, null, 2)}\n`)
  console.log(`wrote ${path.relative(root, OUT_DIR)}/ and ${path.relative(root, OUT_DATA)}`)
}

main().catch((err) => {
  console.error(`export-templates: ${err.message}`)
  process.exit(1)
})
