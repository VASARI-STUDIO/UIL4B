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
// Needs Playwright's Chromium. A picture is never kept if its page printed a missing value or a left-over placeholder; the
// script says so and exits 1 (the files are still written, so look at them).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'public/export-themes')
const ET = path.join(ROOT, 'api/_lib/exportThemes')
const href = (p) => pathToFileURL(p).href

const THUMB_H = 80
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
async function shrink({ b64, width, height, quality }) {
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
  const blob = await out.convertToBlob({ type: 'image/webp', quality })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

// The engine renderThemeExport takes, with the three swaps named in the header.
async function loadEngine(state) {
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
  const { EXPORT_THEMES } = await import(href(path.join(ROOT, 'src/data/exportThemes.js')))
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
      const hasKit = !entry.rows
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
          for (const [key, pageId] of Object.entries(shots)) {
            const el = pg.locator(`.pg[data-page="${pageId}"]`)
            if (await el.count() !== 1) { problems.push(`${id} ${key}: page "${pageId}" is not in the ${kind} document (the theme left it out)`); continue }
            const box = await el.boundingBox()
            if (Math.abs(box.width / box.height - size.w / size.h) > 0.01) problems.push(`${id} ${key}: page "${pageId}" is ${Math.round(box.width)}x${Math.round(box.height)}, not the theme's page shape; the picture is stretched`)
            const w = key === 'thumb' ? Math.round(THUMB_H * size.w / size.h) : size.w
            const h = key === 'thumb' ? THUMB_H : size.h
            await save(await el.screenshot({ type: 'png' }), `${id}-${key}.webp`, w, h)
          }
        } finally { await pg.close() }
      }

      // The guidelines: cover, palette, and the thumb is the cover small.
      const guides = await filesOf(renderThemeExport, engine, state, id, 'slides', 'html')
      await shootPages(guides, 'brand-guidelines.html', 'guidelines', { ...GUIDE_PAGE, thumb: 'cover' }, 'guidelines')

      if (hasKit) {
        const kit = await filesOf(renderThemeExport, engine, state, id, 'ui-kit', 'zip')
        await shootPages(kit, 'ui-kit.html', 'uikit', KIT_PAGE, 'UI kit')
      }

      // The brand book: its first screen at 1424 x 606, light.
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
  const ids = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')))
  if (!ids.length) { console.error('usage: node scripts/library/exportThemePreviews.mjs <themeId> [...] [--tmp <dir>] [--quality 0.8]'); process.exit(2) }
  const { written, problems } = await writePreviews(ids, { tmp: opt('tmp'), quality: Number(opt('quality', 0.8)) })
  for (const w of written) console.log(`wrote ${w}`)
  for (const p of problems) console.error(`problem: ${p}`)
  if (problems.length) process.exit(1)
}
