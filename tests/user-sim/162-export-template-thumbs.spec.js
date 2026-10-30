// THE TEMPLATE PICTURES: the tiles and the page strip.
//
// Each tile in the picker draws a real render of its template's cover (generated files in
// public/export-templates/), and the strip under the book and guidelines rows draws the
// chosen template from the person's own design. This spec checks, as a person sees it:
//
//   1. Every tile of every row has a picture, its srcset names the 240, 480 and 720 wide
//      files, and each of those URLs is served as a real webp (a missing file would still
//      answer 200 with the app's page, so the content type and the first bytes are read).
//   2. Choosing Monograph, Atlas, Poster or Grid changes the caption under the strip and
//      draws the strip again: the pictures' bytes change, and going back to the default
//      brings the default's own pictures back.
//   3. For Free the strip stays blurred in the pixels, with the lock, whichever template
//      is chosen. Pro gets the same pictures sharp.
//   4. At 390 neither the tiles nor the strip push the page or the panel sideways; the
//      strip may scroll inside its own box.
//   5. The strip leads the column: the template picker sits at least 24px under the pictures
//      (book and guidelines, 1440 and 390). The popup draws no visible caption of its own (the
//      step labels and the lock say what is shown); the strip's aria-label still names the template.
//   6. A draw that beat the fonts (document.fonts.load held back past the 800ms wait) is
//      shown, is not kept in the cache, and is drawn again once the faces arrive.
//   7. The radiogroup is named by the Template label and sits under a visible Layout heading.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Each was applied to the source, built, and turned the named tests red:
//   - exportTemplateThumb.js: srcSet drops the largest file            -> the srcset test (all rows)
//   - exportTemplateThumbs.generated.js: dir points at a folder with no files
//                                                                      -> the files-are-webp test
//   - ExportProPreview: template is not passed to renderProPreviews    -> the redraw test
//   - proPreviewKey: the caption's "in" becomes "on"                   -> the caption test
//   - ExportSteps (Preview): blurred={false}                                   -> the Free-stays-blurred test
//   - overlay.css: .exp-preview-strip overflow-x:visible               -> the 390 test
//   - proPreviews.js: the `stale` flag is never set (the `!fonts.settled` line removed)
//                                                                      -> the redraw test and the not-kept test
//   - ExportProPreview: the stale draw never schedules its redraw      -> the redraw test
//   - export-dialog.css: the step gap (--s-6) removed between Preview and Layout -> the gap test
//   - overlay.css: `.exp-preview` laid out column-reverse              -> the heading-above test (all four)
//   - ExportTemplatePicker: aria-labelledby swapped back to aria-label -> the label test (all rows)
//   - ExportTemplatePicker: the visible "Template" paragraph removed   -> the label test (all rows)
//   The gap test stays green at 390 with the margin rule deleted (the gap there is still over
//   24px), so that rule is only guarded at 1440.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { chooseFormat, exportPanel } from './export-rows.js'
import { liveTemplates, defaultTemplate } from '../../src/config/exportTemplates.js'

const BOARD = '/create/palette?c=1F4B8E,2E7BB8,3FA9A0'
const WIDTHS = [240, 480, 720]
// The hardest edge (see stripSharpness) on the 3-colour board, for every template of both
// rows: blurred pictures measured 12 to 40 since the baked blur went from 6px to 3px
// (commit 355eeb9a; they were 7 to 24 before), sharp ones 114 to 237. The limits sit between.
const BLUR_CEILING = 60
const SHARP_FLOOR = 80

async function openProject(page, plan = 'free') {
  await signIn(page, { plan })
  await go(page, BOARD)
  await page.getByRole('button', { name: 'Export', exact: true }).first().click()
  await expect(exportPanel(page)).toBeVisible()
}

const group = (page) => exportPanel(page).getByRole('radiogroup', { name: 'Template' })
const caption = (page) => exportPanel(page).locator('.exp-preview-caption')
const strip = (page) => exportPanel(page).locator('.exp-preview-strip')
const stripImgs = (page) => strip(page).locator('img.exp-thumb')

/** Choose a template by the name on its tile, and wait until the strip has been drawn for it. */
async function pick(page, kind, name) {
  await group(page).getByRole('radio', { name: new RegExp(`^${name}\\b`) }).click()
  await expect(caption(page)).toContainText(` in ${name}, `)
  await expect(strip(page), `the ${kind} strip is drawn in ${name}`).toHaveAttribute('data-state', 'ready')
  await expect(stripImgs(page)).toHaveCount(3)
}

const stripFlags = (page) => stripImgs(page).evaluateAll((imgs) => imgs.map((i) => i.dataset.blurred))

/** A fingerprint of each picture's bytes. A new blob URL alone would not prove a redraw. */
const stripBytes = (page) => stripImgs(page).evaluateAll((imgs) => Promise.all(imgs.map(async (img) => {
  const buf = await (await fetch(img.src)).arrayBuffer()
  const sum = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(sum)].map((b) => b.toString(16).padStart(2, '0')).join('')
})))

/**
 * The hardest edge in each picture: the largest brightness step between two neighbouring
 * pixels, 0 to 255, at the picture's own size. A crisp rule or letter steps by a lot in one
 * pixel; the same picture blurred spreads that step over many pixels, so the score drops.
 */
const stripSharpness = (page) => stripImgs(page).evaluateAll((imgs) => Promise.all(imgs.map(async (img) => {
  const bitmap = await createImageBitmap(await (await fetch(img.src)).blob())
  const w = bitmap.width
  const h = bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, w, h)
  const luma = (x, y) => { const i = (y * w + x) * 4; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] }
  let hardest = 0
  for (let y = 1; y < h; y += 1) {
    for (let x = 1; x < w; x += 1) {
      hardest = Math.max(hardest, Math.abs(luma(x, y) - luma(x - 1, y)), Math.abs(luma(x, y) - luma(x, y - 1)))
    }
  }
  return Math.round(hardest)
})))

/* ── 1. the tile pictures ─────────────────────────────────────────────────── */

for (const row of ['kit', 'book', 'guidelines']) {
  test(`every ${row} tile has a picture whose srcset lists the 240, 480 and 720 wide webp files`, async ({ page }) => {
    watch(page, `a designer looking at the ${row} template tiles`)
    await openProject(page)
    await chooseFormat(page, row)
    const templates = liveTemplates(row)
    const tiles = group(page).getByRole('radio')
    await expect(tiles).toHaveCount(templates.length)

    for (const [i, t] of templates.entries()) {
      const img = tiles.nth(i).locator('.exp-tpl-frame img')
      await expect(img, `${t.name} has a picture`).toHaveCount(1)
      const srcset = await img.getAttribute('srcset')
      const entries = srcset.split(',').map((s) => s.trim().split(/\s+/))
      expect(entries.map(([, w]) => w), `${t.name}: the widths in the srcset`).toEqual(WIDTHS.map((w) => `${w}w`))
      expect(entries.map(([url]) => url), `${t.name}: the files in the srcset`).toEqual(WIDTHS.map((w) => `/export-templates/${row}-${t.id}-${w}.webp`))
      expect(await img.getAttribute('sizes'), `${t.name}: the tile says how wide it draws`).toBeTruthy()
      expect(await img.getAttribute('alt'), 'the name under the tile is the label, so the picture is decoration').toBe('')
    }
  })

  test(`the ${row} tile files are served as webp images, at three widths each`, async ({ page }) => {
    watch(page, `a designer on the ${row} template tiles`)
    await openProject(page)
    await chooseFormat(page, row)
    const srcsets = await group(page).locator('.exp-tpl-frame img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('srcset')))
    expect(srcsets).toHaveLength(liveTemplates(row).length)
    const sizes = []
    for (const srcset of srcsets) {
      const urls = srcset.split(',').map((s) => s.trim().split(/\s+/)[0])
      const bytes = []
      for (const url of urls) {
        const res = await page.request.get(url)
        expect(res.status(), `${url} is there`).toBe(200)
        expect(res.headers()['content-type'], `${url} is an image, not the app's page`).toBe('image/webp')
        const body = await res.body()
        expect(body.subarray(0, 4).toString('latin1'), `${url} is a RIFF file`).toBe('RIFF')
        expect(body.subarray(8, 12).toString('latin1'), `${url} holds webp`).toBe('WEBP')
        bytes.push(body.length)
      }
      expect(bytes[0], 'the larger the width, the larger the file').toBeLessThan(bytes[1])
      expect(bytes[1]).toBeLessThan(bytes[2])
      sizes.push(bytes.join('/'))
    }
    expect(new Set(sizes).size, 'each template has its own render').toBe(sizes.length)
  })

  test(`the ${row} tile pictures load and draw inside their tiles`, async ({ page }) => {
    watch(page, `a designer scrolling the ${row} template tiles`)
    await openProject(page)
    await chooseFormat(page, row)
    const imgs = group(page).locator('.exp-tpl-frame img')
    for (let i = 0; i < await imgs.count(); i += 1) {
      await imgs.nth(i).scrollIntoViewIfNeeded()
      await expect.poll(() => imgs.nth(i).evaluate((el) => el.complete && el.naturalWidth), `picture ${i + 1} has loaded`).toBeGreaterThan(0)
      const drawn = await imgs.nth(i).evaluate((el) => {
        const tile = el.closest('.exp-tpl-tile').getBoundingClientRect()
        const b = el.getBoundingClientRect()
        return { inside: b.left >= tile.left - 0.5 && b.right <= tile.right + 0.5 && b.top >= tile.top - 0.5 && b.bottom <= tile.bottom + 0.5, w: b.width, h: b.height, src: new URL(el.currentSrc).pathname, srcset: el.getAttribute('srcset') }
      })
      expect(drawn.inside, `picture ${i + 1} sits inside its tile`).toBe(true)
      expect(drawn.w).toBeGreaterThan(40)
      expect(drawn.h).toBeGreaterThan(40)
      expect(drawn.srcset, 'the browser picked one of the listed files').toContain(drawn.src)
    }
  })
}

/* ── 2. the strip follows the tile ────────────────────────────────────────── */

const STRIP_ROWS = [
  ['book', { Specification: 'pages', Monograph: 'pages', Atlas: 'pages' }, 'book'],
  ['guidelines', { Presentation: 'slides', Poster: 'slides', Grid: 'slides' }, 'guidelines'],
]

for (const plan of ['free', 'pro']) {
  for (const [row, names, noun] of STRIP_ROWS) {
    test(`${plan}: choosing a ${row} template changes the strip caption and draws the strip again`, async ({ page }) => {
      watch(page, `a ${plan} account choosing a ${row} template`)
      await openProject(page, plan)
      await chooseFormat(page, row)
      const first = Object.keys(names)[0]
      expect(liveTemplates(row).find((t) => t.name === first).id, 'the first tile is the default').toBe(defaultTemplate(row))
      await expect(caption(page)).toHaveText(`Your ${noun} in ${first}, ${names[first]} 1 to 3`)
      await expect(strip(page)).toHaveAttribute('data-state', 'ready')
      const seen = { [first]: await stripBytes(page) }
      expect(new Set(seen[first]).size, 'the three pages of the default differ from each other').toBe(3)

      for (const name of Object.keys(names).slice(1)) {
        await pick(page, row, name)
        await expect(caption(page)).toHaveText(`Your ${noun} in ${name}, ${names[name]} 1 to 3`)
        await expect(strip(page), 'the strip says which template it shows').toHaveAttribute('aria-label', `Pages of your ${row === 'book' ? 'design system book' : 'brand guidelines'} in ${name}`)
        seen[name] = await stripBytes(page)
        expect(new Set(seen[name]).size, `${name}: three different pages`).toBe(3)
      }
      const all = Object.values(seen).flat()
      expect(new Set(all).size, 'no template draws a page another template drew').toBe(all.length)

      await pick(page, row, first)
      await expect(caption(page)).toHaveText(`Your ${noun} in ${first}, ${names[first]} 1 to 3`)
      expect(await stripBytes(page), 'back on the default, the default pictures return').toEqual(seen[first])
    })
  }
}

/* ── 3. Free stays blurred ────────────────────────────────────────────────── */

for (const [row, names] of STRIP_ROWS) {
  const others = Object.keys(names).slice(1)

  test(`Free: the ${row} strip is blurred in the pixels and locked for the default and for ${others.join(' and ')}`, async ({ page }) => {
    watch(page, `a free account looking at the ${row} strip`)
    await openProject(page, 'free')
    await chooseFormat(page, row)
    for (const name of Object.keys(names)) {
      await pick(page, row, name)
      expect(await stripFlags(page), `${name}: every picture is marked blurred`).toEqual(['true', 'true', 'true'])
      for (const alt of await stripImgs(page).evaluateAll((imgs) => imgs.map((i) => i.alt))) expect(alt).toMatch(/^Blurred preview of your /)
      await expect(exportPanel(page).locator('.xd-lock'), `${name}: the lock is over the strip`).toBeVisible()
      for (const score of await stripSharpness(page)) {
        expect(score, `${name}: the pixels are soft, not a sharp picture behind a CSS filter`).toBeLessThan(BLUR_CEILING)
      }
    }
  })

  test(`CONTROL: Pro sees the ${row} strip sharp for ${others.join(' and ')}, with no lock`, async ({ page }) => {
    watch(page, `a Pro account looking at the ${row} strip`)
    await openProject(page, 'pro')
    await chooseFormat(page, row)
    for (const name of others) {
      await pick(page, row, name)
      expect(await stripFlags(page), `${name}: no picture is marked blurred`).toEqual(['false', 'false', 'false'])
      await expect(exportPanel(page).locator('.xd-lock')).toHaveCount(0)
      for (const score of await stripSharpness(page)) {
        expect(score, `${name}: the pixels are sharp, so the Free ceiling really separates the two`).toBeGreaterThan(SHARP_FLOOR)
      }
    }
  })
}

/* ── 4. nothing spills at 390 ─────────────────────────────────────────────── */

test('at 390 the tiles and the strip stay inside the panel; only the strip scrolls, inside its own box', async ({ page }) => {
  watch(page, 'a designer choosing a template on a phone')
  await page.setViewportSize({ width: 390, height: 844 })
  await openProject(page, 'pro')

  for (const row of ['kit', 'book', 'guidelines']) {
    await chooseFormat(page, row)
    await expect(group(page).getByRole('radio')).toHaveCount(3)
    if (row !== 'kit') {
      await pick(page, row, row === 'book' ? 'Monograph' : 'Grid')
      await expect(stripImgs(page)).toHaveCount(3)
    }
    const fit = await page.evaluate(() => {
      const panel = document.querySelector('.xd-card')
      const p = panel.getBoundingClientRect()
      const within = (b, box) => b.left >= box.left - 0.5 && b.right <= box.right + 0.5
      const tiles = [...document.querySelectorAll('.exp-tpl-tile')]
      const stripEl = document.querySelector('.exp-preview-strip')
      const stage = document.querySelector('.exp-preview-stage')
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panel: panel.scrollWidth - panel.clientWidth,
        row: document.querySelector('.exp-tpl-row').scrollWidth - document.querySelector('.exp-tpl-row').clientWidth,
        tilesInPanel: tiles.every((t) => within(t.getBoundingClientRect(), p)),
        tilePictures: tiles.every((t) => {
          const f = t.querySelector('.exp-tpl-frame')?.getBoundingClientRect()
          return !f || within(f, t.getBoundingClientRect())
        }),
        hasStrip: Boolean(stripEl),
        stageInPanel: stage ? within(stage.getBoundingClientRect(), p) : true,
        stripInPanel: stripEl ? within(stripEl.getBoundingClientRect(), p) : true,
        stripScrolls: stripEl ? stripEl.scrollWidth > stripEl.clientWidth : false,
        stripOverflowX: stripEl ? getComputedStyle(stripEl).overflowX : null,
        stripInView: stripEl ? stripEl.getBoundingClientRect().right <= innerWidth + 0.5 : true,
      }
    })
    const where = `${row} at 390: ${JSON.stringify(fit)}`
    expect(fit.page, `the page scrolls sideways, ${where}`).toBeLessThanOrEqual(0)
    expect(fit.panel, `the panel scrolls sideways, ${where}`).toBeLessThanOrEqual(0)
    expect(fit.row, `the tile row scrolls sideways, ${where}`).toBeLessThanOrEqual(0)
    expect(fit.tilesInPanel, `a tile leaves the panel, ${where}`).toBe(true)
    expect(fit.tilePictures, `a picture leaves its tile, ${where}`).toBe(true)
    expect(fit.hasStrip, where).toBe(row !== 'kit')
    expect(fit.stageInPanel, `the strip's stage leaves the panel, ${where}`).toBe(true)
    expect(fit.stripInPanel, `the strip leaves the panel, ${where}`).toBe(true)
    expect(fit.stripInView, where).toBe(true)
    if (fit.stripScrolls) expect(['auto', 'scroll'], `a strip wider than its box must scroll inside it, ${where}`).toContain(fit.stripOverflowX)
  }
})

/* ── 5. the strip reads as a result, under its own heading ─────────────────── */

const MIN_GAP = 24

for (const [row, noun] of [['book', 'book'], ['guidelines', 'guidelines']]) {
  for (const width of [1440, 390]) {
    test(`${row} at ${width}: the strip leads the column, and the template picker starts at least ${MIN_GAP}px under it`, async ({ page }) => {
      watch(page, `a designer reading the ${row} strip at ${width}px`)
      await page.setViewportSize({ width, height: 1100 })
      await openProject(page, 'pro')
      await chooseFormat(page, row)
      await expect(strip(page)).toHaveAttribute('data-state', 'ready')
      await expect(stripImgs(page)).toHaveCount(3)
      await expect(caption(page)).toContainText(`Your ${noun} in `)
      await expect(strip(page)).toHaveAttribute('aria-label', /^Pages of your /)

      const box = async (locator) => (await locator.boundingBox())
      const picker = await box(group(page))
      const pictures = await box(strip(page))
      const where = `${row} at ${width}: ${JSON.stringify({ picker, pictures })}`

      // The popup shows the result first and the choices under it.
      expect(picker.y, `the tiles start under the pictures, ${where}`).toBeGreaterThanOrEqual(pictures.y + pictures.height)
      expect(picker.y - (pictures.y + pictures.height), `the tiles are set apart from the pictures, ${where}`).toBeGreaterThanOrEqual(MIN_GAP)
    })
  }
}

/* ── 6. a draw that beat the fonts is shown, not kept, and drawn again ─────── */

/**
 * Make every document.fonts.load hang until the test lets go, and log each call. The strip waits
 * 800ms for the system's faces and then draws in the fallback; this holds them back for as long
 * as the test needs, whatever the machine's font cache holds.
 */
async function holdFonts(page) {
  await page.addInitScript(() => {
    if (!document.fonts?.load) return
    const real = document.fonts.load.bind(document.fonts)
    const held = []
    window.__fontLoads = 0
    window.__holdFonts = false
    window.__releaseFonts = () => { window.__holdFonts = false; held.splice(0).forEach((go) => go()) }
    document.fonts.load = (...args) => {
      window.__fontLoads += 1
      if (!window.__holdFonts) return real(...args)
      return new Promise((resolve, reject) => { held.push(() => real(...args).then(resolve, reject)) })
    }
  })
}
const fontLoads = (page) => page.evaluate(() => window.__fontLoads)
const stripSrcs = (page) => stripImgs(page).evaluateAll((imgs) => imgs.map((i) => i.src))

test('a strip drawn before the fonts arrived is shown, then drawn again once they have', async ({ page }) => {
  watch(page, 'a designer whose fonts are slow')
  await holdFonts(page)
  await openProject(page, 'pro')
  await page.evaluate(() => { window.__holdFonts = true; window.__fontLoads = 0 })

  await chooseFormat(page, 'guidelines')
  await expect(strip(page), 'the strip is shown without waiting for the fonts forever').toHaveAttribute('data-state', 'ready', { timeout: 10_000 })
  await expect(stripImgs(page)).toHaveCount(3)
  const oneDraw = await fontLoads(page)
  expect(oneDraw, 'the draw asked for the system\'s faces').toBeGreaterThan(0)
  const shown = await stripSrcs(page)

  await page.evaluate(() => window.__releaseFonts())
  await expect.poll(() => fontLoads(page), 'the strip is drawn once more when the faces are in').toBe(oneDraw * 2)
  await expect.poll(async () => (await stripSrcs(page)).every((src, i) => src !== shown[i]), 'the pictures are the new draw').toBe(true)
  await expect(strip(page)).toHaveAttribute('data-state', 'ready')
  await expect(stripImgs(page)).toHaveCount(3)
})

test('a strip drawn before the fonts arrived is not kept: coming back to its template draws it afresh', async ({ page }) => {
  watch(page, 'a designer whose fonts are slow, trying templates')
  await holdFonts(page)
  await openProject(page, 'pro')
  await page.evaluate(() => { window.__holdFonts = true; window.__fontLoads = 0 })

  await chooseFormat(page, 'guidelines')
  await expect(strip(page)).toHaveAttribute('data-state', 'ready', { timeout: 10_000 })
  const oneDraw = await fontLoads(page)
  expect(oneDraw).toBeGreaterThan(0)

  await pick(page, 'guidelines', 'Poster')
  await expect.poll(() => fontLoads(page), 'a second template is a second draw').toBe(oneDraw * 2)
  await pick(page, 'guidelines', 'Presentation')
  await expect.poll(() => fontLoads(page), 'the first template, drawn in the fallback, was not served from the cache').toBe(oneDraw * 3)
})

test('CONTROL: a strip drawn after the fonts arrived is kept: coming back to its template does not draw it again', async ({ page }) => {
  watch(page, 'a designer with fonts ready, trying templates')
  await holdFonts(page)
  await openProject(page, 'pro')
  // Counted, but not held back.
  await page.evaluate(() => { window.__fontLoads = 0 })

  await chooseFormat(page, 'guidelines')
  await expect(strip(page)).toHaveAttribute('data-state', 'ready')
  await pick(page, 'guidelines', 'Poster')
  const afterTwo = await fontLoads(page)
  expect(afterTwo).toBeGreaterThan(0)
  await pick(page, 'guidelines', 'Presentation')
  expect(await fontLoads(page), 'a settled draw is cached').toBe(afterTwo)
})

/* ── 7. the picker has a visible name ──────────────────────────────────────── */

for (const row of ['kit', 'book', 'guidelines']) {
  test(`${row}: the template picker is named by its label and sits under a visible Layout heading`, async ({ page }) => {
    watch(page, `a designer looking at the ${row} template picker`)
    await openProject(page, 'free')
    await chooseFormat(page, row)
    const tiles = group(page)
    await expect(tiles).toBeVisible()

    const labelId = await tiles.getAttribute('aria-labelledby')
    expect(labelId, 'the group points at a label').toBeTruthy()
    expect(await tiles.getAttribute('aria-label'), 'the name comes from the label, not a second hidden copy').toBeNull()
    const label = exportPanel(page).locator(`[id="${labelId}"]`)
    await expect(label, 'the accessible name is still the Template label').toHaveText('Template')
    // The popup shows its "Layout" step heading above the tiles instead of a second visible label.
    const heading = exportPanel(page).getByRole('heading', { level: 3, name: 'Layout' })
    await expect(heading, 'a visible step heading names the choice').toBeVisible()
    const [l, g] = [await heading.boundingBox(), await tiles.boundingBox()]
    expect(l.y + l.height, 'the heading sits above the tiles').toBeLessThanOrEqual(g.y)
  })
}
