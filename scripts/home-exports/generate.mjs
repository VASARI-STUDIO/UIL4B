// Render the real export pages the homepage "Studio quality exports" section shows.
//
//   node scripts/home-exports/generate.mjs              render everything, write the assets
//   node scripts/home-exports/generate.mjs --only=kit-colour,cover-ferrule   render some ids (check mode: writes nothing)
//
// Every plate is a page the product's own export code produced: the UI kit
// (renderUiKit, over src/templates/kit/studio.html, the Free tier with its mark), the
// Design system book (buildDesignSystemBook) and the Brand guidelines deck
// (buildBrandGuidelines). The three project plates are the book's own cover page
// for each example project: the A4 cover on its own (phones) and the cover beside
// its contents page as a facing spread (wider screens). The only processing is
// crop, compose onto a transparent ground with a thin page outline, downscale and
// WebP encode. Run by hand; not part of CI. The outputs are committed.
//
// Writes
//   public/home-exports/<id>-<w>.webp        landscape plates (>= 761px wide screens)
//   public/home-exports/<id>-p-<w>.webp      portrait plates (<= 760px)
//   public/home-exports/cover-<name>-<w>.webp         the three book covers, A4 on its own (<= 760px)
//   public/home-exports/cover-<name>-spread-<w>.webp  cover + contents page, facing (>= 761px)
//   src/data/homeExports.generated.js        the manifest (shape written at its top)
//   .cache/home-exports/master/*.png         the 3840px masters (gitignored, never committed)
//
// How it stays deterministic
//   - The builders are pure string functions, so they run in Node here. There is
//     no app build and no preview server, so no test-mode bundle is involved; the
//     page is the export HTML and nothing else.
//   - One Chromium context per capture, locale en-AU, timezone UTC, the clock held
//     at FIXED_TIME (the "Issued" lines on the pages read it).
//   - Fonts come from a disk cache (.cache/home-exports/fonts/): Google Fonts is
//     asked once with a fixed user agent and answered from disk after that. The
//     UI kit embeds its faces itself, read from public/fonts by the app's own
//     loader. No font file is written to the repo by this script.
//   - Masters are rendered at 3840px wide (covers 1600) and only ever scaled down.
//
// A re-run on the same Chromium, the same operating system fonts (the pages set
// their code in the system monospace) and a warm cache gives the same bytes.
// The sha256 values in the manifest show any drift.
//
// Exits 1 when a page selector finds nothing or the wrong thing, a font face does
// not load, a page title would be under 12 CSS px at its narrowest display, an
// output is wider than its master, off its aspect, or over its byte budget.

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { renderUiKit, kitFontRequests } from '../../src/utils/uiKitExport.js'
import { loadKitFonts, loadPublisherFonts } from '../../src/utils/kitFonts.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { BASES, rolesOf } from '../../src/components/spectrum/spectrumKit.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = path.join(root, '.cache', 'home-exports')
const FONT_CACHE = path.join(CACHE, 'fonts')
const MASTER_DIR = path.join(CACHE, 'master')
const OUT_DIR = path.join(root, 'public', 'home-exports')
const OUT_DATA = path.join(root, 'src', 'data', 'homeExports.generated.js')
const TEMPLATE = path.join(root, 'src', 'templates', 'kit', 'studio.html')
const PUBLIC = path.join(root, 'public')
const PUBLIC_DIR = '/home-exports/'

// Everything that decides the pixels, in one place.
const FIXED_TIME = new Date('2026-10-24T00:00:00Z')
const FONT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const WEBP_QUALITY = 0.86
const SQRT2 = Math.SQRT2

const MASTER_W = 3840 // plates
const COVER_MASTER_W = 1600
const LAND = { ratio: SQRT2, masterH: 2715, widths: [800, 1600, 2400] } // 3840 / sqrt2
const PORT = { ratio: 4 / 5, masterH: 4800, widths: [400, 800, 1200] } // 4:5, tall
const COVER = { ratio: 1 / SQRT2, masterH: 2263, widths: [360, 720, 1080] } // A4 portrait at 1600
const ASPECT_TOLERANCE = 0.005
// A thin outline baked into every page of every plate, inset on the page's own
// edge. The pages are light paper (or a pale web page) on the stage's wash, and a
// CSS ring cannot hug an object-fit picture, so the edge is part of the render:
// 6px at the 3840 master is about one CSS pixel at the widest display.
const EDGE_PX = 6
const EDGE_COLOUR = 'rgba(17, 17, 20, 0.2)'

// The most a page title may be small at: CSS px at the narrowest display. The
// plate sits in a box with 4% padding either side (the spec's .sp-plate img), so
// the picture itself is 92% of the stage width. Landscape shows from the 768
// band (650 wide stage); portrait plates and covers from the 390 band (318 wide).
const TITLE_FLOOR = 12
// Measured and kept: a whole A4 page, or two stacked 16:9 slides, cannot show its
// title at 12px in a 318px stage. Listed by name so any new miss still fails the run.
const TITLE_WAIVED = new Set(['book-colour portrait', 'guide-palette portrait'])
const DISPLAY = {
  landscape: 650 * 0.92,
  portrait: 318 * 0.92,
  cover: Math.min(318 * 0.92, (398 - 318 * 0.08) / SQRT2), // A4 portrait is height-limited in the 4:5 plate
}

// Byte budgets, per file, and for the folder. Kilobytes are 1000 bytes.
const KB = 1000
const BUDGET = {
  landscape: { 800: 70 * KB, 1600: 180 * KB, 2400: 320 * KB },
  portrait: { 400: 40 * KB, 800: 110 * KB, 1200: 200 * KB },
  cover: { 360: 25 * KB, 720: 70 * KB, 1080: 130 * KB },
  total: 2.4 * 1000 * KB,
}

// The one design every plate is made from, and the covers' three seeds.
const SEED_INDEX = { northbeam: 0, halcyon: 1, ferrule: 4 } // BASES: Cobalt, Cyan, Signal
const HEADING = { family: 'Schibsted Grotesk', weight: 700, category: 'sans-serif' }
const BODY = { family: 'Literata', weight: 400, category: 'serif' }
const HARMONY = 'analogous'
const HARMONY_INDEX = 1 // HARMONIES in spectrumKit.js: Mono, Analogous, Complement, Triad
const PROJECT = { northbeam: 'Northbeam', halcyon: 'Halcyon', ferrule: 'Ferrule' }

// Page positions in each document, checked against the page's own text.
const BOOK_PAGES = { cover: 0, contents: 1, opening: 2, palette: 3 } // .pg
const DECK_PAGES = { cover: 0, palette: 2, inUse: 3 } // .sl

// The kit crops. The kit is a scrolling web page, so a crop is a rectangle of it.
const KIT_LAND = { viewport: { width: 1280, height: 900 }, crop: { w: 1280, h: 905 }, dsf: 3 } // 3840 x 2715
const KIT_PORT = { viewport: { width: 800, height: 1000 }, crop: { w: 800, h: 1000 }, dsf: 4.8 } // 3840 x 4800

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const fail = (msg) => { throw new Error(msg) }
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))
const only = typeof args.only === 'string' ? new Set(args.only.split(',')) : null
const wanted = (id) => !only || only.has(id)

// ── Designs and documents ───────────────────────────────────────────────────

function designFor(name) {
  const base = BASES[SEED_INDEX[name]]
  const colors = rolesOf(base, HARMONY_INDEX, 0).map((r) => r.hex)
  const design = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
  design.palette = { ...design.palette, base: colors[0], harmony: HARMONY, extraColors: [], activeIdx: 0, colors }
  design.fonts = { heading: { ...HEADING }, body: { ...BODY } }
  design.name = PROJECT[name]
  return { design, seed: base.label, colors }
}

// The app's own font loader, with a fetch that reads /fonts/* from public/.
async function localFetch(url) {
  if (!String(url).startsWith('/fonts/')) return new Response(null, { status: 404 })
  try { return new Response(await fs.readFile(path.join(PUBLIC, url))) } catch { return new Response(null, { status: 404 }) }
}

async function buildKit(design) {
  const template = await fs.readFile(TEMPLATE, 'utf8')
  const fonts = await loadKitFonts(kitFontRequests(design), { fetch: localFetch })
  const publisher = await loadPublisherFonts({ fetch: localFetch })
  const wantFamilies = [HEADING.family, BODY.family]
  const missing = wantFamilies.filter((f) => !fonts[f])
  if (missing.length) fail(`the UI kit could not embed ${missing.join(', ')} from public/fonts`)
  if (publisher.publisherFonts.some((p) => !p.faces.length)) fail('the UI kit publisher faces did not load from public/fonts')
  const out = renderUiKit(design, { tier: 'free', template, fonts, ...publisher, logo: null, date: FIXED_TIME })
  if (out.missing.length) fail(`the UI kit reports missing fonts: ${out.missing.join(', ')}`)
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

// Fail unless every face is really loaded: a screenshot silently falls back otherwise.
async function fontsLoaded(page, faces, sample) {
  const missing = await page.evaluate(async ({ faces: list, text }) => {
    await Promise.all(list.map((f) => document.fonts.load(`${f.weight} 24px "${f.family}"`, text)))
    await document.fonts.ready
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => ({ family: f.family.replace(/["']/g, ''), range: String(f.weight).split(' ').map(Number) }))
    const covers = (l, w) => l.range.length === 2 ? l.range[0] <= w && w <= l.range[1] : l.range[0] === w
    const absent = list.filter((f) => !loaded.some((l) => l.family === f.family && covers(l, f.weight))).map((f) => `${f.weight} ${f.family}`)
    return absent.length ? [...absent, `(loaded: ${[...new Set(loaded.map((l) => `${l.family} ${l.range.join('-')}`))].slice(0, 8).join('; ')})`] : absent
  }, { faces, text: sample })
  if (missing.length) fail(`fonts did not load in the page (the screenshot would fall back): ${missing.join(', ')}`)
}

const FACES = [
  { family: HEADING.family, weight: 400 }, { family: HEADING.family, weight: 500 }, { family: HEADING.family, weight: HEADING.weight },
  { family: BODY.family, weight: BODY.weight }, { family: BODY.family, weight: 500 }, { family: BODY.family, weight: 700 },
]
const SAMPLE = 'Northbeam Halcyon Ferrule Colour The palette 0123456789'

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) fail('not a PNG')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

// One element's PNG, plus the size of the title text inside it in CSS px.
async function shootElement(page, { locator, title, label }) {
  if (await locator.count() < 1) fail(`${label}: the page selector found nothing`)
  const el = locator.first()
  const info = await el.evaluate((node, sel) => {
    const r = node.getBoundingClientRect()
    const t = node.querySelector(sel)
    return { w: r.width, h: r.height, title: t ? { text: t.textContent.trim(), px: parseFloat(getComputedStyle(t).fontSize) } : null }
  }, title.selector)
  if (!info.title) fail(`${label}: no title element ${title.selector}`)
  if (title.text && !info.title.text.includes(title.text)) fail(`${label}: the title reads "${info.title.text}", expected "${title.text}"`)
  const png = await el.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' })
  return { png, cssW: info.w, cssH: info.h, titlePx: info.title.px, titleText: info.title.text }
}

// ── Compose, downscale, encode ──────────────────────────────────────────────

// Draw layers onto a transparent canvas and return the PNG. A layer is
// { png, x, y, w, h } in canvas pixels; each gets the thin page outline, inside its
// own edge, scaled to the canvas width (EDGE_PX is for a 3840 master).
async function compose(W, H, layers) {
  const edge = Math.max(1, Math.round(EDGE_PX * W / MASTER_W))
  const b64 = await util.evaluate(async ({ W: cw, H: ch, list, edge: ew, colour }) => {
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const g = c.getContext('2d')
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    for (const l of list) {
      const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(l.b64), (ch2) => ch2.charCodeAt(0))], { type: 'image/png' }))
      g.drawImage(bmp, l.x, l.y, l.w, l.h)
      g.strokeStyle = colour
      g.lineWidth = ew
      g.strokeRect(l.x + ew / 2, l.y + ew / 2, l.w - ew, l.h - ew)
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
    const out = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000))
    return btoa(s)
  }, { W, H, edge, colour: EDGE_COLOUR, list: layers.map((l) => ({ b64: l.png.toString('base64'), x: l.x, y: l.y, w: l.w, h: l.h })) })
  const buf = Buffer.from(b64, 'base64')
  const got = pngSize(buf)
  if (got.w !== W || got.h !== H) fail(`composed ${got.w}x${got.h}, expected ${W}x${H}`)
  return buf
}

// Downscale a master to each width (halving while more than twice the target,
// then a final step) and encode as WebP. Never scales up.
async function derive(master, widths) {
  const { w: mw, h: mh } = pngSize(master)
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
    return { w: r.w, h: r.h, buf: Buffer.from(r.b64, 'base64'), masterW: mw, masterH: mh }
  })
}

// ── What each id is ─────────────────────────────────────────────────────────

const outputs = [] // { id, kind, tab, tabName, alt, sourceSha256, variants: { landscape?, portrait? } }
const titles = [] // for the floor check
const sources = new Map()

function noteTitle(id, shape, shot, masterW, destW, primary = true) {
  // CSS px of the title at its narrowest display: its px, times the master's
  // pixels per CSS px, times the display width over the master width.
  const scale = destW / shot.cssW
  const px = shot.titlePx * scale * DISPLAY[shape] / masterW
  titles.push({ id, shape, text: shot.titleText, px, primary })
}

async function saveMaster(name, buf) {
  await fs.mkdir(MASTER_DIR, { recursive: true })
  await fs.writeFile(path.join(MASTER_DIR, `${name}.png`), buf)
}

async function finish({ id, kind, tab, tabName, alt, html, variants }) {
  const made = {}
  for (const [orient, v] of Object.entries(variants)) {
    await saveMaster(v.name, v.master)
    const spec = v.spec
    const files = await derive(v.master, spec.widths)
    made[orient] = { spec, files, name: v.name, masterW: files[0].masterW, masterH: files[0].masterH }
  }
  outputs.push({ id, kind, tab, tabName, alt, sourceSha256: sha256(html), made })
}

// ── Book: the colour opening beside the first colour page, and the covers ───

async function bookPlates(name) {
  const { design, seed } = designFor(name)
  const html = buildDesignSystemBook(design, { projectName: PROJECT[name], date: FIXED_TIME })
  sources.set(`book-${name}`, html)
  const ids = { spread: 'book-colour', cover: `cover-${name}` }
  const need = (name === 'northbeam' && wanted(ids.spread)) || wanted(ids.cover)
  if (!need) return { html, design, seed }
  const result = { html, design, seed }

  const openingTitle = { selector: '.open-title', text: 'Colour' }
  const paletteTitle = { selector: '.pg-head h3', text: 'The palette' }
  const coverTitle = { selector: '.cv-title', text: PROJECT[name] }

  // The book's page positions, checked against what is on them.
  const check = async (page) => {
    await fontsLoaded(page, FACES, SAMPLE)
    const found = await page.evaluate(() => [...document.querySelectorAll('.pg')].map((p) => ({
      cls: p.className, text: (p.querySelector('.open-title, .pg-head h3, .cv-title')?.textContent || '').trim(), band: Boolean(p.querySelector('.bands')),
    })))
    const at = (i) => found[i] || fail(`the book has no page ${i}`)
    if (!at(BOOK_PAGES.cover).cls.includes('pg-cover')) fail(`book page ${BOOK_PAGES.cover} is not the cover`)
    if (!at(BOOK_PAGES.contents).cls.includes('pg-contents')) fail(`book page ${BOOK_PAGES.contents} is not the contents page`)
    if (!at(BOOK_PAGES.opening).cls.includes('pg-open') || at(BOOK_PAGES.opening).text !== 'Colour') fail(`book page ${BOOK_PAGES.opening} is not the Colour opening`)
    if (!at(BOOK_PAGES.palette).band || at(BOOK_PAGES.palette).text !== 'The palette') fail(`book page ${BOOK_PAGES.palette} is not The palette`)
  }

  if (name === 'northbeam' && wanted(ids.spread)) {
    // Landscape: the opening and the palette page, facing, 1920 wide each.
    const pageW = 793.7008
    const spread = await withDocument(html, { viewport: { width: 1000, height: 1300 }, dsf: (MASTER_W / 2) / pageW }, async (page) => {
      await check(page)
      const pages = page.locator('.pg')
      const a = await shootElement(page, { locator: pages.nth(BOOK_PAGES.opening), title: openingTitle, label: 'book opening' })
      const b = await shootElement(page, { locator: pages.nth(BOOK_PAGES.palette), title: paletteTitle, label: 'book palette' })
      return { a, b }
    })
    const half = MASTER_W / 2
    const masterL = await compose(MASTER_W, LAND.masterH, [
      { png: spread.a.png, x: 0, y: 0, w: half, h: LAND.masterH },
      { png: spread.b.png, x: half, y: 0, w: half, h: LAND.masterH },
    ])
    noteTitle(ids.spread, 'landscape', spread.a, MASTER_W, half)
    noteTitle(ids.spread, 'landscape', spread.b, MASTER_W, half, false) // the facing page's own title: reported, not the plate's title

    // Portrait: the palette page alone, as tall as the 4:5 box.
    const pageH = 1122.5197
    const alone = await withDocument(html, { viewport: { width: 1000, height: 1300 }, dsf: PORT.masterH / pageH }, async (page) => {
      await check(page)
      return shootElement(page, { locator: page.locator('.pg').nth(BOOK_PAGES.palette), title: paletteTitle, label: 'book palette (tall)' })
    })
    const pw = Math.round(PORT.masterH / SQRT2)
    const masterP = await compose(MASTER_W, PORT.masterH, [{ png: alone.png, x: Math.round((MASTER_W - pw) / 2), y: 0, w: pw, h: PORT.masterH }])
    noteTitle(ids.spread, 'portrait', alone, MASTER_W, pw)

    await finish({
      id: ids.spread, kind: 'plate', tab: 'Book', tabName: 'Design system book, Pro',
      alt: 'Design system book, colour opening and palette bands, Cobalt palette.', html,
      variants: { landscape: { name: `${ids.spread}-master`, master: masterL, spec: LAND }, portrait: { name: `${ids.spread}-p-master`, master: masterP, spec: PORT } },
    })
  }

  if (wanted(ids.cover)) {
    const pageW = 793.7008

    // Landscape: the cover and its contents page, facing, 1920 wide each.
    const contentsTitle = { selector: '.lbl', text: 'Contents' }
    const facing = await withDocument(html, { viewport: { width: 1000, height: 1300 }, dsf: (MASTER_W / 2) / pageW }, async (page) => {
      await check(page)
      const pages = page.locator('.pg')
      const a = await shootElement(page, { locator: pages.nth(BOOK_PAGES.cover), title: coverTitle, label: `${name} cover (spread)` })
      const b = await shootElement(page, { locator: pages.nth(BOOK_PAGES.contents), title: contentsTitle, label: `${name} contents` })
      return { a, b }
    })
    const half = MASTER_W / 2
    const masterS = await compose(MASTER_W, LAND.masterH, [
      { png: facing.a.png, x: 0, y: 0, w: half, h: LAND.masterH },
      { png: facing.b.png, x: half, y: 0, w: half, h: LAND.masterH },
    ])
    noteTitle(ids.cover, 'landscape', facing.a, MASTER_W, half)
    noteTitle(ids.cover, 'landscape', facing.b, MASTER_W, half, false) // the contents page's own label: reported, not the plate's title

    // Portrait: the cover on its own.
    const shot = await withDocument(html, { viewport: { width: 1000, height: 1300 }, dsf: COVER_MASTER_W / pageW }, async (page) => {
      await check(page)
      return shootElement(page, { locator: page.locator('.pg').nth(BOOK_PAGES.cover), title: coverTitle, label: `${name} cover` })
    })
    const masterC = await compose(COVER_MASTER_W, COVER.masterH, [{ png: shot.png, x: 0, y: 0, w: COVER_MASTER_W, h: COVER.masterH }])
    noteTitle(ids.cover, 'cover', shot, COVER_MASTER_W, COVER_MASTER_W)
    await finish({
      id: ids.cover, kind: 'cover', tab: PROJECT[name], tabName: `${PROJECT[name]} book cover and contents`,
      alt: `Design system book for ${PROJECT[name]}, the cover and the contents page.`, html,
      variants: {
        landscape: { name: `${ids.cover}-spread-master`, master: masterS, spec: LAND },
        portrait: { name: `${ids.cover}-master`, master: masterC, spec: COVER },
      },
    })
  }
  return result
}

// ── Brand guidelines: the palette slide, and the palette over "In use" ──────

async function guidePlates() {
  const id = 'guide-palette'
  if (!wanted(id)) return
  const { design } = designFor('northbeam')
  const html = buildBrandGuidelines(design, { projectName: PROJECT.northbeam, date: FIXED_TIME })
  sources.set('guide', html)
  const slideW = 1122.5197
  const dsf = MASTER_W / slideW
  const palTitle = { selector: '.hd-title', text: 'The palette' }
  const useTitle = { selector: '.hd-title', text: 'In use' }
  const shots = await withDocument(html, { viewport: { width: 1300, height: 800 }, dsf }, async (page) => {
    await fontsLoaded(page, FACES, SAMPLE)
    const found = await page.evaluate(() => [...document.querySelectorAll('.sl')].map((s) => ({ cls: s.className, text: (s.querySelector('.hd-title, .cv-title')?.textContent || '').trim() })))
    const at = (i) => found[i] || fail(`the deck has no slide ${i}`)
    if (!at(DECK_PAGES.cover).cls.includes('sl-cover')) fail(`deck slide ${DECK_PAGES.cover} is not the cover`)
    if (at(DECK_PAGES.palette).text !== 'The palette') fail(`deck slide ${DECK_PAGES.palette} is not The palette (${at(DECK_PAGES.palette).text})`)
    if (at(DECK_PAGES.inUse).text !== 'In use') fail(`deck slide ${DECK_PAGES.inUse} is not In use (${at(DECK_PAGES.inUse).text})`)
    const slides = page.locator('.sl')
    const pal = await shootElement(page, { locator: slides.nth(DECK_PAGES.palette), title: palTitle, label: 'deck palette' })
    const use = await shootElement(page, { locator: slides.nth(DECK_PAGES.inUse), title: useTitle, label: 'deck in use' })
    return { pal, use }
  })
  const sh = Math.round(MASTER_W * shots.pal.cssH / shots.pal.cssW) // slide height at 3840 wide

  // Landscape: the slide at full width, ground above and below.
  const masterL = await compose(MASTER_W, LAND.masterH, [{ png: shots.pal.png, x: 0, y: Math.round((LAND.masterH - sh) / 2), w: MASTER_W, h: sh }])
  noteTitle(id, 'landscape', shots.pal, MASTER_W, MASTER_W)

  // Portrait: the palette slide over the "In use" slide, 3% of the height apart.
  const gap = Math.round(PORT.masterH * 0.03)
  const top = Math.round((PORT.masterH - (sh * 2 + gap)) / 2)
  const masterP = await compose(MASTER_W, PORT.masterH, [
    { png: shots.pal.png, x: 0, y: top, w: MASTER_W, h: sh },
    { png: shots.use.png, x: 0, y: top + sh + gap, w: MASTER_W, h: sh },
  ])
  noteTitle(id, 'portrait', shots.pal, MASTER_W, MASTER_W)
  noteTitle(id, 'portrait', shots.use, MASTER_W, MASTER_W, false)

  await finish({
    id, kind: 'plate', tab: 'Brand deck', tabName: 'Brand guidelines deck, Pro',
    alt: 'Brand guidelines deck, palette page with five named colours.', html,
    variants: { landscape: { name: `${id}-master`, master: masterL, spec: LAND }, portrait: { name: `${id}-p-master`, master: masterP, spec: PORT } },
  })
}

// ── UI kit: the colour section ──────────────────────────────────────────────

async function kitPlates() {
  const id = 'kit-colour'
  if (!wanted(id)) return
  const { design } = designFor('northbeam')
  const html = await buildKit(design)
  sources.set('kit', html)
  const title = { selector: '#colour-title', text: 'A palette with purpose.' }

  const crop = async (shape) => withDocument(html, { viewport: shape.viewport, dsf: shape.dsf }, async (page) => {
    await fontsLoaded(page, FACES, SAMPLE)
    const sec = page.locator('#colour')
    if (await sec.count() < 1) fail('kit: no #colour section')
    const box = await sec.evaluate((n) => {
      const r = n.getBoundingClientRect()
      const t = document.querySelector('#colour-title')
      const ex = document.querySelector('.tint-explainer').getBoundingClientRect()
      const guideEnd = document.querySelector('#guide').getBoundingClientRect().bottom + window.scrollY
      return { top: r.top + window.scrollY, explainerEnd: ex.bottom + window.scrollY, guideEnd, titlePx: parseFloat(getComputedStyle(t).fontSize), titleText: t.textContent.trim() }
    })
    // End the crop just under the tint paragraph so no line is cut, and start
    // it no higher than the colour section's own top padding allows.
    const cropTop = Math.round(box.explainerEnd + 28 - shape.crop.h)
    box.top = Math.max(cropTop, box.guideEnd)
    if (box.explainerEnd > box.top + shape.crop.h) fail('kit: the crop cuts through the tint paragraph')
    if (!box.titleText.includes(title.text)) fail(`kit: the colour title reads "${box.titleText}"`)
    // Hide the sticky section nav so no crop can carry it, and everything that
    // comes after the tint paragraph (the next row is only half in the crop, so
    // it would be a line of text cut through). The paragraph and all above it
    // stay. Nothing else changes.
    await page.addStyleTag({ content: '.nav-wrap{position:static!important}' })
    await page.evaluate(() => {
      for (let n = document.querySelector('.tint-explainer'); n && n !== document.body; n = n.parentElement) {
        for (let s = n.nextElementSibling; s; s = s.nextElementSibling) s.style.visibility = 'hidden'
      }
    })
    // Exit 1 if any text still showing is cut by the crop's edge, or lies in it
    // only in part.
    const cut = await page.evaluate(({ top, h, w }) => {
      const out = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.trim()
        const host = node.parentElement
        if (!text || !host || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(host.tagName)) continue
        const cs = getComputedStyle(host)
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue
        // Visually hidden text (a one-pixel clipped box, as in .sr-only) is not on the picture.
        let clipped = false
        for (let el = host; el && el !== document.body; el = el.parentElement) {
          const er = el.getBoundingClientRect()
          if ((er.width <= 1 || er.height <= 1) && getComputedStyle(el).overflow !== 'visible') clipped = true
        }
        if (clipped) continue
        range.selectNodeContents(node)
        for (const r of range.getClientRects()) {
          if (r.width < 1 || r.height < 1) continue
          const t = r.top + window.scrollY
          const b = r.bottom + window.scrollY
          const inside = t >= top && b <= top + h && r.left >= 0 && r.right <= w
          const apart = b <= top || t >= top + h
          if (!inside && !apart) out.push(`"${text.slice(0, 40)}" (${host.tagName.toLowerCase()}.${host.className} at ${Math.round(t)}-${Math.round(b)}, crop ${Math.round(top)}-${Math.round(top + h)})`)
        }
      }
      return out
    }, { top: box.top, h: shape.crop.h, w: shape.crop.w })
    if (cut.length) fail(`kit: the ${shape.crop.w}x${shape.crop.h} crop cuts through text: ${[...new Set(cut)].join(', ')}`)
    const png = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', fullPage: true, clip: { x: 0, y: box.top, width: shape.crop.w, height: shape.crop.h } })
    return { png, cssW: shape.crop.w, cssH: shape.crop.h, titlePx: box.titlePx, titleText: box.titleText }
  })

  const land = await crop(KIT_LAND)
  const masterL = await compose(MASTER_W, LAND.masterH, [{ png: land.png, x: 0, y: 0, w: MASTER_W, h: LAND.masterH }])
  noteTitle(id, 'landscape', land, MASTER_W, MASTER_W)
  const port = await crop(KIT_PORT)
  const masterP = await compose(MASTER_W, PORT.masterH, [{ png: port.png, x: 0, y: 0, w: MASTER_W, h: PORT.masterH }])
  noteTitle(id, 'portrait', port, MASTER_W, MASTER_W)

  await finish({
    id, kind: 'plate', tab: 'UI kit', tabName: 'UI kit, Free',
    alt: 'UI kit export, colour page, Cobalt palette.', html,
    variants: { landscape: { name: `${id}-master`, master: masterL, spec: LAND }, portrait: { name: `${id}-p-master`, master: masterP, spec: PORT } },
  })
}

// ── Checks and writes ───────────────────────────────────────────────────────

const kbOf = (n) => `${(n / KB).toFixed(1)} KB`

function checks() {
  const errors = []
  for (const t of titles) {
    if (t.px < TITLE_FLOOR && t.primary && TITLE_WAIVED.has(`${t.id} ${t.shape}`)) console.warn(`WAIVED: ${t.id} ${t.shape} title "${t.text}" is ${t.px.toFixed(1)} CSS px at display`)
    else if (t.px < TITLE_FLOOR && t.primary) errors.push(`${t.id} (${t.shape}): the title "${t.text}" is ${t.px.toFixed(1)} CSS px at its narrowest display, under ${TITLE_FLOOR}`)
  }
  let total = 0
  for (const o of outputs) {
    for (const [orient, m] of Object.entries(o.made)) {
      const shape = o.kind === 'cover' && orient === 'portrait' ? 'cover' : orient // a cover's spread is a landscape plate
      const budget = BUDGET[shape]
      const plate = m.spec
      for (const f of m.files) {
        total += f.buf.length
        if (f.w > m.masterW) errors.push(`${o.id} ${orient} ${f.w}w is wider than its ${m.masterW}w master`)
        const want = plate.ratio
        const got = f.w / f.h
        if (Math.abs(got - want) / want > ASPECT_TOLERANCE) errors.push(`${o.id} ${orient} ${f.w}w: aspect ${got.toFixed(4)}, plate wants ${want.toFixed(4)}`)
        const cap = budget[f.w]
        if (cap === undefined) errors.push(`${o.id} ${orient} ${f.w}w is not one of the budgeted widths`)
        else if (f.buf.length > cap) errors.push(`${o.id} ${orient} ${f.w}w is ${kbOf(f.buf.length)}, over its ${kbOf(cap)} budget`)
      }
    }
  }
  if (!only && total > BUDGET.total) errors.push(`the folder is ${kbOf(total)}, over its ${kbOf(BUDGET.total)} budget`)
  return { errors, total }
}

function fileName(o, orient, w) {
  if (o.kind === 'cover') return orient === 'portrait' ? `${o.id}-${w}.webp` : `${o.id}-spread-${w}.webp`
  return orient === 'portrait' ? `${o.id}-p-${w}.webp` : `${o.id}-${w}.webp`
}

// Tab order of the export card: the two Pro pages first, the free kit last.
const ORDER = ['book-colour', 'guide-palette', 'kit-colour', 'cover-northbeam', 'cover-halcyon', 'cover-ferrule']

async function writeOutputs(total) {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const f of await fs.readdir(OUT_DIR)) if (f.endsWith('.webp')) await fs.rm(path.join(OUT_DIR, f))
  const items = []
  for (const o of [...outputs].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))) {
    const variants = { landscape: null, portrait: null }
    for (const [orient, m] of Object.entries(o.made)) {
      const files = []
      for (const f of m.files) {
        const file = fileName(o, orient, f.w)
        await fs.writeFile(path.join(OUT_DIR, file), f.buf)
        files.push({ file, w: f.w, h: f.h, bytes: f.buf.length, sha256: sha256(f.buf) })
      }
      const mid = files[1]
      variants[orient] = {
        master: { w: m.masterW, h: m.masterH },
        aspect: Number((m.spec.ratio).toFixed(4)),
        src: PUBLIC_DIR + mid.file,
        width: mid.w,
        height: mid.h,
        srcset: files.map((f) => `${PUBLIC_DIR}${f.file} ${f.w}w`).join(', '),
        files,
      }
    }
    items.push({ id: o.id, kind: o.kind, tab: o.tab, tabName: o.tabName, alt: o.alt, sourceSha256: o.sourceSha256, landscape: variants.landscape, portrait: variants.portrait })
  }
  const { seed, colors } = designFor('northbeam')
  const data = {
    version: 1,
    dir: PUBLIC_DIR,
    design: { seed, harmony: HARMONY, colors, heading: { family: HEADING.family, weight: HEADING.weight }, body: { family: BODY.family, weight: BODY.weight } },
    totalBytes: total,
    plates: items.filter((i) => i.kind === 'plate'),
    covers: items.filter((i) => i.kind === 'cover'),
  }
  const header = `// Written by scripts/home-exports/generate.mjs from the real export code. Do not edit by hand:
// regenerate with \`node scripts/home-exports/generate.mjs\`. The files named here are in public/home-exports/.
//
// SHAPE
//   HOME_EXPORTS = {
//     version: 1,
//     dir: '/home-exports/',                       public path prefix
//     design: { seed, harmony, colors[5], heading: { family, weight }, body: { family, weight } },
//     totalBytes,                                  all 36 files together
//     plates: [Item, Item, Item],                  tab order: Book, Brand deck, UI kit
//     covers: [Item, Item, Item],                  Northbeam, Halcyon, Ferrule (one tab each)
//   }
//   Item = {
//     id,            'kit-colour' | 'book-colour' | 'guide-palette' | 'cover-northbeam' | 'cover-halcyon' | 'cover-ferrule'
//     kind,          'plate' | 'cover'
//     tab,           the short tab label: 'UI kit' | 'Book' | 'Brand deck', or the project name for a cover
//     tabName,       the tab's full accessible name
//     alt,           the image's alt text
//     sourceSha256,  sha256 of the export HTML the image was rendered from
//     landscape,     Variant for screens 761px and wider; a cover's is the cover beside its contents page, facing
//     portrait,      Variant for screens 760px and narrower; for a cover this is the A4 cover on its own
//   }
//   Variant = {
//     master: { w, h },   the uncommitted master this was downscaled from
//     aspect,             width / height of every file in files
//     src, width, height, the default <img> (the middle file)
//     srcset,             'path 800w, path 1600w, path 2400w', ready for an <img srcset> or <source srcset>
//     files: [{ file, w, h, bytes, sha256 }],   smallest to largest; file is relative to public/home-exports/
//   }
//   Plates are drawn on a transparent ground (the page supplies it), each page with a thin outline baked in.
//   File names: landscape <id>-<w>.webp, portrait <id>-p-<w>.webp, covers <id>-<w>.webp, cover spreads <id>-spread-<w>.webp.

`
  await fs.writeFile(OUT_DATA, `${header}export const HOME_EXPORTS = ${JSON.stringify(data, null, 2)}\n`)
}

async function main() {
  await fs.mkdir(MASTER_DIR, { recursive: true })
  await fs.mkdir(FONT_CACHE, { recursive: true })
  browser = await chromium.launch()
  try {
    util = await browser.newPage()
    await kitPlates()
    for (const name of Object.keys(SEED_INDEX)) await bookPlates(name)
    await guidePlates()
    if (!outputs.length) fail('nothing was rendered (check --only)')
    const { errors, total } = checks()
    for (const o of outputs) {
      for (const [orient, m] of Object.entries(o.made)) {
        for (const f of m.files) console.log(`${fileName(o, orient, f.w).padEnd(34)} ${String(f.w).padStart(4)}x${String(f.h).padEnd(4)} ${kbOf(f.buf.length).padStart(9)}  ${sha256(f.buf).slice(0, 12)}`)
      }
    }
    for (const t of titles) console.log(`title ${t.id} ${t.shape}: "${t.text}" ${t.px.toFixed(1)} CSS px at display`)
    console.log(`folder total ${kbOf(total)} of ${kbOf(BUDGET.total)}`)
    if (errors.length) fail(`${errors.length} check(s) failed:\n  ${errors.join('\n  ')}`)
    if (only) { console.log('--only: checked, nothing written'); return }
    if (outputs.length !== ORDER.length) fail(`rendered ${outputs.length} of ${ORDER.length} exports`)
    await writeOutputs(total)
    console.log(`wrote ${path.relative(root, OUT_DIR)}/ and ${path.relative(root, OUT_DATA)}`)
  } finally {
    await browser?.close()
  }
}

main().catch((err) => {
  console.error(`home-exports: ${err.message}`)
  process.exit(1)
})
