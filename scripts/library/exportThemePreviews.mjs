// Writes the preview pictures the Export dialog's theme picker shows for an export theme.
//
//   node scripts/library/exportThemePreviews.mjs <themeId> [<themeId> ...] [--tmp <dir>] [--quality 0.8]
//   node scripts/library/exportThemePreviews.mjs 24-standards 29-blueprint 30-fluted 32-dieline
//
// Run it when a theme is added or its pages change, then run lockedStandins.mjs: the locked stand-ins are made from the
// book and guide pictures this writes.
//
// Writes  public/export-themes/<themeId>-<key>.webp, the keys src/config/exportThemePicker.js reads (themeShots, themeThumb):
//   thumb        the guidelines cover, 80 px tall
//   thumb@2x     the same cover for a 2x screen (themeThumb2x): 284 px wide, the height of the cover's own shape. The picker
//                draws a card's picture about 155 px wide whatever the shape, so a narrow cover needs the width as much as a wide one
//   kitScreen    the UI kit page "screen-light"          (themes with a UI kit only)
//   kitButtons   the UI kit page "buttons"               (themes with a UI kit only)
//   book         the top of the brand book's index.html, 1424 x 606 at 1x, light
//   guideCover   the guidelines page "cover"
//   guidePalette the guidelines page "palette"
// A guidelines-only theme (a `rows` field in src/data/exportThemes.js) gets thumb, guideCover and guidePalette.
//
// The pages come from renderThemeExport (api/_lib/exportThemeRoute.js), the code the server runs, so a picture is the page a
// download holds. Two things differ from a request, both passed in through the route's `engine` argument: the brand is the
// theme's own sample brand (the one the picker names) instead of a project's design, and the edition is the showcase one, so
// the pages carry the sample brand's own words and no slot placeholder. The route's zip step is swapped for one that keeps
// the file map, so the pages can be opened from a folder; nothing is zipped.
//
// Sizes follow the pictures already in the folder, by the page shape: 16:9 is 840 wide, A4 landscape 720 wide, and the
// squarer or taller shapes (5:4, 1:1, 4:5, A4 portrait) 600 wide; the thumb is 80 tall. Each is shot at 2x and shrunk in
// Chromium's canvas in halving steps, then encoded as WebP.
//
// --pages mode (every page, for the Export dialog's gallery; see writePagePreviews below):
//   node scripts/library/exportThemePreviews.mjs --pages [<themeId> ...] [--max-pages 9] [--quality 0.82]
// With no ids it draws every theme. Per theme and row (slides, ui-kit, book) it shoots each page and writes, by the Free or Pro
// verdict of src/data/exportThemes.js (isThemeExportPro):
//   Free pair   public/export-themes/pages/<id>/<row>/<n>.webp and <n>@2x.webp
//   Pro pair    public/export-themes/pages/<id>/<row>/<n>.webp   1x, with a tiled "UIL4B Pro preview" watermark baked in
//               api/_lib/pro/export-previews/<id>/<row>/<n>.webp   the clean 2x (gitignored; publish to the private data repository), never under public/ (api/_lib/exportPreview.js serves it)
// and src/config/exportPreviewPages.js, the ordered pages per theme and row. A page is a .pg[data-page] section of a document, the
// first screen of each page of a theme's multi-page site, or a section of the brand book.
//
// Needs Playwright's Chromium. A picture is never kept if its page printed a missing value or a left-over placeholder; the
// script says so and exits 1 (the files are still written, so look at them).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'public/export-themes')
const ET_DEFAULT = path.join(ROOT, 'api/_lib/exportThemes')
const ET = ET_DEFAULT
const href = (p) => pathToFileURL(p).href

const THUMB_H = 80
const THUMB_2X_W = 284
const BOOK = { w: 1424, h: 606 }
// Page id each picture is cut from.
const GUIDE_PAGE = { guideCover: 'cover', guidePalette: 'palette' }
const KIT_PAGE = { kitScreen: 'screen-light', kitButtons: 'buttons' }
// Text a page prints when a value is missing, or a slot placeholder (private-use characters) was left behind.
const BAD = /\[object Object\]|\bundefined\b|\bNaN\b|Photo: \.|[-]/

// The pictures already in the folder, by page shape: [ratio, width, height]. A shape not listed takes the width of its nearest
// class (see the header) and the height its own ratio gives.
const SIZES = [[16 / 9, 840, 472], [1123 / 794, 720, 508], [5 / 4, 600, 480], [794 / 1123, 600, 850]]

/** { w, h } a theme's pictures are drawn at, from its page size. */
export function pictureSize(page) {
  const r = page.w / page.h
  const hit = SIZES.find(([sr]) => Math.abs(sr - r) < 0.01)
  if (hit) return { w: hit[1], h: hit[2] }
  const w = r >= 1.7 ? 840 : r >= 1.35 ? 720 : 600
  return { w, h: Math.round(w / r) }
}

// Runs in the page: halve until close to the target (one big step aliases), draw at the target size, encode.
async function shrink({ b64, width, height, quality, watermark }) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const bmp = await createImageBitmap(new Blob([bin], { type: 'image/png' }))
  let from = bmp
  let fw = bmp.width
  let fh = bmp.height
  while (fw / 2 > width) {
    fw = Math.round(fw / 2)
    fh = Math.round(fh / 2)
    const step = new OffscreenCanvas(fw, fh)
    const c = step.getContext('2d')
    c.imageSmoothingQuality = 'high'
    c.drawImage(from, 0, 0, fw, fh)
    from = step
  }
  const out = new OffscreenCanvas(width, height)
  const oc = out.getContext('2d')
  oc.imageSmoothingQuality = 'high'
  oc.drawImage(from, 0, 0, width, height)
  if (watermark) {
    // Tiled and diagonal, one light and one dark pass 1px apart at 12%, so it reads on a pale page and on a dark one.
    const size = Math.max(10, Math.round(width / 38))
    const reach = Math.hypot(width, height)
    oc.save()
    oc.translate(width / 2, height / 2)
    oc.rotate(-Math.PI / 7)
    oc.font = `600 ${size}px system-ui, sans-serif`
    oc.textAlign = 'center'
    oc.textBaseline = 'middle'
    for (let y = -reach, r = 0; y < reach; y += size * 4.2, r += 1) {
      for (let x = -reach + (r % 2) * size * 5.5; x < reach; x += size * 11) {
        oc.fillStyle = 'rgba(0,0,0,0.12)'
        oc.fillText('UIL4B Pro preview', x + 1, y + 1)
        oc.fillStyle = 'rgba(255,255,255,0.12)'
        oc.fillText('UIL4B Pro preview', x, y)
      }
    }
    oc.restore()
  }
  const blob = await out.convertToBlob({ type: 'image/webp', quality })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

// The engine renderThemeExport takes, with the three swaps named in the header.
async function loadEngine(state, ET = ET_DEFAULT) {
  const [brandMod, pages, doc, files, book, loaders, validate, brands] = await Promise.all([
    import(href(path.join(ET, 'brandFromProject.js'))),
    import(href(path.join(ET, 'engine/pages.js'))),
    import(href(path.join(ET, 'engine/doc.js'))),
    import(href(path.join(ET, 'engine/files.js'))),
    import(href(path.join(ET, 'engine/book.js'))),
    import(href(path.join(ET, 'node-loaders.js'))),
    import(href(path.join(ET, 'engine/validate.js'))),
    import(href(path.join(ET, 'brands/index.js'))),
  ])
  return {
    ...brandMod, ...pages, ...doc, ...files, ...book,
    loaders: loaders.default,
    BrandInputError: validate.BrandInputError,
    BRANDS: brands.BRANDS,
    projectToBrand: () => state.sample,
    makeCtx: (T, _edition, kind, ld, data) => pages.makeCtx(T, 'showcase', kind, ld, data),
    // The route lists no PNG or PDF in a book (its zip has none). The showcase book draws a logo set with both, and the brand book of
    // theme 06 reads their sizes, so a showcase book is built as if they were there.
    bookFiles: (ctx, T, o) => book.bookFiles(ctx, T, { ...o, outside: true }),
    zipFiles: async (map, top) => { state.kept = { map, top }; return Buffer.alloc(0) },
  }
}

// The files of one export, as { 'name': string | Buffer }, from the route.
async function filesOf(render, engine, state, theme, row, format) {
  state.kept = null
  await render({ theme, row, format, design: {}, projectName: 'sample' }, engine)
  if (!state.kept) throw new Error(`${theme} ${row}: the route kept no files`)
  return state.kept.map
}

function writeFolder(dir, map) {
  for (const [name, v] of Object.entries(map)) {
    const dest = path.join(dir, name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, v)
  }
}

export async function writePreviews(themeIds, { tmp, quality = 0.8 } = {}) {
  const { EXPORT_THEMES, entryHasRow } = await import(href(path.join(ROOT, 'src/data/exportThemes.js')))
  const { renderThemeExport } = await import(href(path.join(ROOT, 'api/_lib/exportThemeRoute.js')))
  const { pickerTheme } = await import(href(path.join(ROOT, 'src/config/exportThemePicker.js')))
  const state = { sample: null, kept: null }
  const engine = await loadEngine(state)
  const work = fs.mkdtempSync(path.join(tmp || os.tmpdir(), 'export-previews-'))
  const problems = []
  const written = []
  const browser = await chromium.launch()
  try {
    const codec = await browser.newPage()
    await codec.goto('about:blank')
    // PNG buffer -> WebP file, `width` wide, with the height of the picture's own shape.
    const save = async (png, name, width, height) => {
      const out = await codec.evaluate(`(${shrink.toString()})(${JSON.stringify({ b64: png.toString('base64'), width, height, quality })})`)
      fs.mkdirSync(OUT, { recursive: true })
      fs.writeFileSync(path.join(OUT, name), Buffer.from(out, 'base64'))
      written.push(`${name} ${width}x${height}`)
    }

    for (const id of themeIds) {
      const entry = EXPORT_THEMES.find((t) => t.id === id)
      if (!entry) throw new Error(`${id} is not in src/data/exportThemes.js`)
      const T = await import(href(path.join(ET, 'themes', id, 'index.js')))
      state.sample = engine.BRANDS[T.meta.brand].data
      if (state.sample.name !== pickerTheme(id).brand) problems.push(`${id}: the picker names the sample brand ${pickerTheme(id).brand}, the theme draws ${state.sample.name}`)
      const hasKit = entryHasRow(entry, 'ui-kit')
      const dir = path.join(work, id)
      const size = pictureSize(T.meta.guidelinesPage)
      const scan = (label, text) => { const m = BAD.exec(text); if (m) problems.push(`${id} ${label}: prints ${JSON.stringify(m[0])} near ${JSON.stringify(text.slice(Math.max(0, m.index - 40), m.index + 40))}`) }

      // Every page of one document is a .pg section carrying its page id; each is shot at the theme's own page size.
      const shootPages = async (map, htmlName, folder, shots, kind) => {
        writeFolder(path.join(dir, folder), map)
        scan(`${kind} document`, String(map[htmlName]))
        const pg = await browser.newPage({ viewport: { width: Math.ceil(T.meta.guidelinesPage.w), height: 900 }, deviceScaleFactor: 2 })
        try {
          await pg.goto(href(path.join(dir, folder, htmlName)))
          await pg.evaluate(() => document.fonts.ready)
          for (const [key, shot] of Object.entries(shots)) {
            // A theme that names a page differently says so in its previewId map.
            const pageId = T.previewId?.[shot] ?? shot
            const el = pg.locator(`.pg[data-page="${pageId}"]`)
            if (await el.count() !== 1) { problems.push(`${id} ${key}: page "${pageId}" is not in the ${kind} document (the theme left it out)`); continue }
            const box = await el.boundingBox()
            if (Math.abs(box.width / box.height - size.w / size.h) > 0.01) problems.push(`${id} ${key}: page "${pageId}" is ${Math.round(box.width)}x${Math.round(box.height)}, not the theme's page shape; the picture is stretched`)
            const w = key === 'thumb' ? Math.round(THUMB_H * size.w / size.h) : key === 'thumb@2x' ? THUMB_2X_W : size.w
            const h = key === 'thumb' ? THUMB_H : key === 'thumb@2x' ? Math.round(THUMB_2X_W * size.h / size.w) : size.h
            await save(await el.screenshot({ type: 'png' }), `${id}-${key}.webp`, w, h)
          }
        } finally { await pg.close() }
      }

      // The guidelines: cover, palette, and the thumb is the cover small.
      const guides = await filesOf(renderThemeExport, engine, state, id, 'slides', 'html')
      await shootPages(guides, 'brand-guidelines.html', 'guidelines', { ...GUIDE_PAGE, thumb: 'cover', 'thumb@2x': 'cover' }, 'guidelines')

      if (hasKit) {
        const kit = await filesOf(renderThemeExport, engine, state, id, 'ui-kit', 'zip')
        await shootPages(kit, 'ui-kit.html', 'uikit', KIT_PAGE, 'UI kit')
      }

      // The brand book: its first screen at 1424 x 606, light. A theme without a book row has none.
      if (!entryHasRow(entry, 'book')) continue
      const book = await filesOf(renderThemeExport, engine, state, id, 'book', 'html')
      writeFolder(path.join(dir, 'book'), book)
      scan('book', String(book['index.html']))
      const bp = await browser.newPage({ viewport: { width: BOOK.w, height: BOOK.h },deviceScaleFactor: 1, colorScheme: 'light' })
      try {
        await bp.goto(href(path.join(dir, 'book', 'index.html')))
        await bp.evaluate(() => document.fonts.ready)
        await save(await bp.screenshot({ type: 'png' }), `${id}-book.webp`, BOOK.w, BOOK.h)
      } finally { await bp.close() }
    }
  } finally {
    await browser.close()
    fs.rmSync(work, { recursive: true, force: true })
  }
  return { written, problems }
}

// ---- --pages mode ----------------------------------------------------------------------------------------------------------------
// One WebP at most this big. A page that is over is re-encoded at a lower quality until it fits.
const MAX_BYTES = 120 * 1024
const ROW_FORMAT = { slides: 'html', 'ui-kit': 'zip', book: 'html' }
// A site page is shot as its first screen at this size; a book section the same as the book picture above.
const SITE = { w: 1440, h: 900 }

const decode = (t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/g, "'")

// The label of a site page: its <title> without the ": <Brand> brand guidelines" or " · <Brand> UI kit" tail the builders add.
const siteLabel = (title, file) => {
  if (file === 'index.html') return 'Cover'
  const t = decode(title).replace(/\s*[:·]\s*[^:·]*(brand guidelines|UI kit)\s*$/i, '').trim()
  return t || file.replace(/\.html$/, '')
}

// A site's pages in reading order: index first, then the order index.html links them, then any left over by name.
const sitePages = (map) => {
  const all = Object.keys(map).filter((k) => /^[^/]+\.html$/.test(k))
  const linked = [...String(map['index.html']).matchAll(/href="([^"#?/]+\.html)(?:[#?][^"]*)?"/g)].map((m) => m[1]).filter((f) => all.includes(f))
  return [...new Set(['index.html', ...linked, ...all.sort()])].filter((f) => all.includes(f))
}

// The pages file is a module (`export default {...}`) so includeFiles' `src/config/export*s.js` glob carries it; its body is plain JSON.
const PAGES_HEAD = "// The page pictures of every export theme, row by row: { n, id, label, w, h } per page, w and h the 1x display size.\n// Written by `node scripts/library/exportThemePreviews.mjs --pages`; do not edit by hand. A module, not JSON, so the\n// `src/config/export*s.js` glob in vercel.json includeFiles carries it into the function with no new entry.\n"
const PAGES_PREFIX = 'export default '
const readPages = (text) => JSON.parse(text.slice(text.indexOf(PAGES_PREFIX) + PAGES_PREFIX.length))

const pagesJson = (themes) => {
  const lines = ['{', '  "version": 1,', '  "themes": {']
  const ids = Object.keys(themes)
  ids.forEach((id, i) => {
    lines.push(`    ${JSON.stringify(id)}: {`)
    const rows = Object.keys(themes[id])
    rows.forEach((row, j) => {
      lines.push(`      ${JSON.stringify(row)}: [`)
      themes[id][row].forEach((p, k) => lines.push(`        ${JSON.stringify(p)}${k < themes[id][row].length - 1 ? ',' : ''}`))
      lines.push(`      ]${j < rows.length - 1 ? ',' : ''}`)
    })
    lines.push(`    }${i < ids.length - 1 ? ',' : ''}`)
  })
  lines.push('  }', '}', '')
  return lines.join('\n')
}

/**
 * Every page of every theme and row, as display-size WebPs (see the header). Pictures are 1x at pictureSize() and 2x at double that,
 * shot once at 2x and shrunk. `engineRoot` is the tree the theme code and route are read from (a checkout of another branch, to
 * try a site theme that is not on this one); Free or Pro always comes from this checkout's src/data/exportThemes.js.
 */
export async function writePagePreviews(themeIds, opts = {}) {
  const {
    tmp, quality = 0.82, maxPages = 9, engineRoot = ROOT,
    outPublic = path.join(OUT, 'pages'),
    outServer = path.join(ROOT, 'api/_lib/pro/export-previews'),
    manifestPath = path.join(ROOT, 'src/config/exportPreviewPages.js'),
  } = opts
  const et = path.join(engineRoot, 'api/_lib/exportThemes')
  const { EXPORT_THEMES, entryHasRow, isThemeExportPro } = await import(href(path.join(ROOT, 'src/data/exportThemes.js')))
  const { renderThemeExport } = await import(href(path.join(engineRoot, 'api/_lib/exportThemeRoute.js')))
  const state = { sample: null, kept: null }
  const engine = await loadEngine(state, et)
  const work = fs.mkdtempSync(path.join(tmp || os.tmpdir(), 'export-pages-'))
  const problems = []
  const tally = { files: 0, publicBytes: 0, serverBytes: 0, lowered: 0 }
  let manifest = {}
  try { manifest = readPages(fs.readFileSync(manifestPath, 'utf8')).themes || {} } catch { /* a first run */ }
  const browser = await chromium.launch()
  try {
    const codec = await browser.newPage()
    await codec.goto('about:blank')
    // PNG -> WebP bytes, w x h, under MAX_BYTES (the quality steps down 0.1 at a time until it is).
    const encode = async (png, w, h, watermark, label) => {
      const b64 = png.toString('base64')
      for (let q = quality; ; q = Math.round((q - 0.1) * 100) / 100) {
        const buf = Buffer.from(await codec.evaluate(`(${shrink.toString()})(${JSON.stringify({ b64, width: w, height: h, quality: q, watermark })})`), 'base64')
        if (buf.length <= MAX_BYTES) { if (q < quality) tally.lowered += 1; return buf }
        if (q < 0.5) { problems.push(`${label}: ${Math.round(buf.length / 1024)} KB at quality ${q}, over ${MAX_BYTES / 1024} KB`); return buf }
      }
    }
    const put = (dir, name, buf, kind) => {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, name), buf)
      tally.files += 1
      tally[kind] += buf.length
    }

    for (const id of themeIds) {
      const entry = EXPORT_THEMES.find((t) => t.id === id)
      if (!entry) throw new Error(`${id} is not in src/data/exportThemes.js`)
      const T = await import(href(path.join(et, 'themes', id, 'index.js')))
      state.sample = engine.BRANDS[T.meta.brand].data
      fs.rmSync(path.join(outPublic, id), { recursive: true, force: true })
      fs.rmSync(path.join(outServer, id), { recursive: true, force: true })
      const sizes = Object.values(T.meta.pageSizes || {}).map((v) => (Array.isArray(v) ? v[0] : v.w))
      const docW = Math.ceil(Math.max(T.meta.guidelinesPage.w, T.meta.uikitPage?.w || 0, ...sizes))
      const scan = (label, text) => { const m = BAD.exec(text); if (m) problems.push(`${id} ${label}: prints ${JSON.stringify(m[0])} near ${JSON.stringify(text.slice(Math.max(0, m.index - 40), m.index + 40))}`) }
      manifest[id] = {}

      // One row: `shots` is [{ id, label, png, w, h }] with w and h the page's own size in CSS px, in reading order.
      const store = async (row, shots) => {
        const pro = isThemeExportPro(row, id)
        const pages = []
        for (const [i, s] of shots.entries()) {
          const n = i + 1
          const one = pictureSize({ w: s.w, h: s.h })
          const where = `${id} ${row} ${n} (${s.id})`
          const pub = path.join(outPublic, id, row)
          if (pro) {
            put(pub, `${n}.webp`, await encode(s.png, one.w, one.h, true, `${where} 1x`), 'publicBytes')
            put(path.join(outServer, id, row), `${n}.webp`, await encode(s.png, one.w * 2, one.h * 2, false, `${where} 2x`), 'serverBytes')
          } else {
            put(pub, `${n}.webp`, await encode(s.png, one.w, one.h, false, `${where} 1x`), 'publicBytes')
            put(pub, `${n}@2x.webp`, await encode(s.png, one.w * 2, one.h * 2, false, `${where} 2x`), 'publicBytes')
          }
          pages.push({ n, id: s.id, label: s.label, w: one.w, h: one.h })
        }
        if (!pages.length) problems.push(`${id} ${row}: no page was shot`)
        manifest[id][row] = pages
      }

      // A document: every .pg section is a page, each at its own size.
      const doc = async (row, map, htmlName, list, kind) => {
        const dir = path.join(work, id, row)
        writeFolder(dir, map)
        scan(`${kind} document`, String(map[htmlName]))
        const titles = new Map(list.map((p) => [p.id, p.title]))
        const pg = await browser.newPage({ viewport: { width: docW, height: 900 }, deviceScaleFactor: 2 })
        const shots = []
        try {
          await pg.goto(href(path.join(dir, htmlName)))
          await pg.evaluate(() => document.fonts.ready)
          const pages = pg.locator('.pg[data-page]')
          const count = Math.min(await pages.count(), maxPages)
          for (let i = 0; i < count; i++) {
            const el = pages.nth(i)
            const pid = await el.getAttribute('data-page')
            const box = await el.boundingBox()
            shots.push({ id: pid, label: titles.get(pid) || pid, w: box.width, h: box.height, png: await el.screenshot({ type: 'png' }) })
          }
        } finally { await pg.close() }
        await store(row, shots)
      }

      // A site: the first screen of each page file.
      const site = async (row, map, kind) => {
        const dir = path.join(work, id, row)
        writeFolder(dir, map)
        const shots = []
        for (const file of sitePages(map).slice(0, maxPages)) {
          scan(`${kind} site ${file}`, String(map[file]))
          const pg = await browser.newPage({ viewport: { width: SITE.w, height: SITE.h }, deviceScaleFactor: 2 })
          try {
            await pg.goto(href(path.join(dir, file)))
            await pg.evaluate(() => document.fonts.ready)
            await pg.waitForTimeout(150)
            const label = siteLabel(await pg.title(), file)
            shots.push({ id: file.replace(/\.html$/, ''), label, ...SITE, png: await pg.screenshot({ type: 'png' }) })
          } finally { await pg.close() }
        }
        await store(row, shots)
      }

      // The rows this walk draws (ROW_FORMAT's), that the theme has. The style guide has no preview pictures yet, so it is not among them.
      for (const row of Object.keys(ROW_FORMAT).filter((r) => entryHasRow(entry, r))) {
        const map = await filesOf(renderThemeExport, engine, state, id, row, ROW_FORMAT[row])
        if (row === 'book') {
          const dir = path.join(work, id, row)
          writeFolder(dir, map)
          scan('book', String(map['index.html']))
          const bp = await browser.newPage({ viewport: { width: BOOK.w, height: BOOK.h }, deviceScaleFactor: 2, colorScheme: 'light' })
          const shots = []
          try {
            await bp.goto(href(path.join(dir, 'index.html')))
            await bp.evaluate(() => document.fonts.ready)
            for (const [i, sec] of engine.BOOK_SECTIONS.slice(0, maxPages).entries()) {
              if (!await bp.locator(`section#${sec.id}`).count()) { problems.push(`${id} book: section "${sec.id}" is missing`); continue }
              await bp.evaluate(({ sid, first }) => {
                if (first) window.scrollTo({ top: 0, behavior: 'instant' })
                else document.getElementById(sid).scrollIntoView({ block: 'start', behavior: 'instant' })
              }, { sid: sec.id, first: i === 0 })
              await bp.waitForTimeout(350)
              shots.push({ id: sec.id, label: sec.title, ...BOOK, png: await bp.screenshot({ type: 'png' }) })
            }
          } finally { await bp.close() }
          await store(row, shots)
        } else if (map['index.html'] && !map[row === 'slides' ? 'brand-guidelines.html' : 'ui-kit.html']) {
          await site(row, map, row === 'slides' ? 'guidelines' : 'UI kit')
        } else if (row === 'slides') {
          await doc(row, map, 'brand-guidelines.html', engine.GUIDE_PAGES, 'guidelines')
        } else {
          await doc(row, map, 'ui-kit.html', engine.UIKIT_PAGES, 'UI kit')
        }
        console.log(`${id} ${row}: ${manifest[id][row].length} pages`)
      }
    }
  } finally {
    await browser.close()
    fs.rmSync(work, { recursive: true, force: true })
  }
  const ordered = {}
  for (const t of EXPORT_THEMES) if (manifest[t.id]) ordered[t.id] = manifest[t.id]
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, PAGES_HEAD + PAGES_PREFIX + pagesJson(ordered))
  return { tally, problems }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pagesMode = process.argv.includes('--pages')
  const argv = process.argv.slice(2).filter((a) => a !== '--pages')
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
  if (pagesMode) {
    const { EXPORT_THEMES } = await import(href(path.join(ROOT, 'src/data/exportThemes.js')))
    const given = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')))
    const abs = (n) => (opt(n) ? path.resolve(opt(n)) : undefined)
    const { tally, problems } = await writePagePreviews(given.length ? given : EXPORT_THEMES.map((t) => t.id), {
      tmp: opt('tmp'), quality: Number(opt('quality', 0.82)), maxPages: Number(opt('max-pages', 9)),
      engineRoot: abs('engine-root'), outPublic: abs('out-public'), outServer: abs('out-server'), manifestPath: abs('manifest'),
    })
    console.log(`${tally.files} files: public ${(tally.publicBytes / 1048576).toFixed(2)} MB, server-only ${(tally.serverBytes / 1048576).toFixed(2)} MB, ${tally.lowered} re-encoded at a lower quality`)
    for (const p of problems) console.error(`problem: ${p}`)
    process.exit(problems.length ? 1 : 0)
  }
  const ids = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')))
  if (!ids.length) { console.error('usage: node scripts/library/exportThemePreviews.mjs <themeId> [...] [--tmp <dir>] [--quality 0.8]'); process.exit(2) }
  const { written, problems } = await writePreviews(ids, { tmp: opt('tmp'), quality: Number(opt('quality', 0.8)) })
  for (const w of written) console.log(`wrote ${w}`)
  for (const p of problems) console.error(`problem: ${p}`)
  if (problems.length) process.exit(1)
}
