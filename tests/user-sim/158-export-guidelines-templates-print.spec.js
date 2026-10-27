// THE BRAND GUIDELINES' THREE TEMPLATES, RENDERED AND PRINTED (export templates, slice 3).
//
// For each of Presentation, Poster and Grid, with each of the five test names (the ones
// tests/unit/fit-title.test.js pins) and palettes of 3, 5, 8 and 13 colours, and then
// with a logo, this builds the real document with the real generator and the server's own
// chrome-font reader, loads it in Chromium and measures it. It does not go through the
// app: the document is the same string the Pro route returns, so what is checked is the
// deck a person gets, not the panel that asks for it. Spec 157 does the same for the book.
// Each case is its own group of tests, so a red result names the template, the name, the
// palette (or logo) and the check.
//
//   1. Every box stays inside its slide: no descendant's box passes its `.sl` box by more
//      than 0.5 px, on screen and in print.
//   2. Nothing that clips is hiding content: an element with overflow hidden or a line
//      clamp (the slide itself clips) has no more content than it shows.
//   3. No text is under 7 pt.
//   4. The slide count is the one the deck's structure gives, worked out here by hand from
//      the palette size and whether there is a logo (the formulas are beside SLIDES).
//   5. Printed to PDF, there is one PDF page per slide and every page is 297 x 167 mm,
//      landscape (read from its MediaBox).
//   6. Slide numbers are true: Poster's and Grid's printed numbers are their slide's own,
//      Grid's contents entries name the slide that carries their title, Presentation's
//      folios are each slide's place in the PDF, with none on the cover or the openings.
//   7. Grid only: a slide holds one to three topics and two text sizes outside the
//      masthead. The scale's specimens (`td.sp`) are set at the sizes they show and are
//      excluded, and a control checks that they would break the rule if they were not.
//   8. A name cut on the cover is printed whole somewhere that does not cut it.
//   9. Logo slides exist only when there is a logo: the mark, grounds and clear-space
//      slides, and every <img>, are absent from a deck with none, and all present with one.
//
// THE FIXTURE. The user's own faces are linked from Google Fonts in a real export. This
// suite makes no live call, so the Google Fonts stylesheet and files are answered from
// public/fonts: the project's faces are Outfit (headings) and Manrope (body), which are
// in that folder, so the measured text is set in a real face and not a fallback. Any
// other request off the machine is refused, and a test fails if one was made. The
// server's chrome faces (Instrument Sans, Big Shoulders Display, Schibsted Grotesk) are
// embedded as base64 by the server's own reader, as api/_lib/exportDocument.js does it.
//
// TWO RULINGS THE CHECKS MAKE (the same as spec 157).
//   - A name that cannot fit its last step is clamped on the cover with an ellipsis and
//     printed whole elsewhere. So for the 120-character name only, the cover title may
//     hide height, and the whole name must then be printed on the deck. Any other name
//     that is cut is a failure.
//   - scrollHeight and clientHeight are whole numbers, so a line box with a fractional
//     height reads 1 px apart with nothing hidden. A clipper that is 1 to 3 px over is
//     settled by pixels: the slide is shot with its overflow hidden and again with it
//     visible, and the two must be identical. Over 3 px fails outright.
//
// WHAT THIS DOES NOT COVER: a project face wider than Outfit or Manrope (their real
// Google files are not in the repo), an SVG logo that the browser cannot draw, or a
// printer that is not Chromium.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Each of these was applied to the source (and restored), and turned the named test red.
// The table with the results is in the lane report. Test names are the titles below.
//   - "every box stays inside its slide"    poster.js `.pn-facts` margin-left:260mm
//   - "nothing that clips hides content"    presentation.js `.sw` (swatch, overflow hidden) gains max-height:12mm,
//                                           and grid.js `.stage` (logo stage, overflow hidden) height 62mm -> 10mm
//   - "no text is under 7 pt"               presentation.js `.sw-role` 7pt -> 6pt
//   - "the slide count"                     poster.js the closing slide left out
//   - "printed to PDF"                      grid.js `@page` 297mm 167mm -> 297mm 210mm
//   - "slide numbers are true"              poster.js `pad(n)` in slide() -> `pad(n + 1)`
//   - "Grid: a slide holds ... two sizes"   grid.js `.kv dt` 9pt and `.kv dd` 10pt
//   - "a cut name is printed whole"         grid.js the cover's `cv-full` line left out
//   - "logo slides exist only with a logo"  brandGuidelines.js guidelineSections `if (d.logo)` -> `if (d.logo || d.palette)`
//                                           and the build's `if (section.id === 'logo')` -> `... && d.logo` (a Logo opening
//                                           with no logo, and no page behind it)
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { chromeFont } from '../../api/_lib/exportDocument.js'

const FONTS = path.resolve('public', 'fonts')
const FIXED_DATE = new Date('2026-03-04T00:00:00Z')

// The five test names, as in tests/unit/fit-title.test.js (section 2.4 of the spec).
const NAMES = [
  'Ink',
  'Harbour & Co',
  'Northside Community Legal Centre',
  'Lorem '.repeat(20).trim().slice(0, 119) + 'x',
  'A'.repeat(40),
]
const COLOURS = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540', '#B4552D', '#F5EDE3', '#E8B04A', '#7A3E9D', '#2B2B2B', '#F2F2F2', '#5C8A3A', '#D94F70']
const SIZES = [3, 5, 8, 13]
const TEMPLATES = { presentation: 'Instrument Sans', poster: 'Big Shoulders Display', grid: 'Schibsted Grotesk' }
const LONG = 100 // a name over this is the one spec 2.4 lets the cover clamp

// A slide is 297 x 167 mm: 841.89 x 473.39 pt.
const SLIDE_PT = { w: 297 / 25.4 * 72, h: 167 / 25.4 * 72 }

// The logos: wide, tall and square marks, as the uploader stores them (a data URI and its size).
const markSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#222222"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="#E8B04A"/></svg>`
const logoOf = (w, h) => ({ src: `data:image/svg+xml;base64,${Buffer.from(markSvg(w, h), 'utf8').toString('base64')}`, width: w, height: h, type: 'image/svg+xml', name: 'mark.svg' })
const LOGOS = { wide: logoOf(240, 60), tall: logoOf(60, 180), square: logoOf(100, 100) }
// Logo cases: [logo, palette size]. The palette size moves Poster's ground slides and Presentation's palette pages.
const LOGO_CASES = [['wide', 3], ['wide', 13], ['tall', 5], ['square', 8]]

const design = (n, logo) => ({
  palette: { base: COLOURS[0], harmony: 'auto', colors: COLOURS.slice(0, n) },
  fonts: { heading: { family: 'Outfit', weight: 700 }, body: { family: 'Manrope', weight: 400 } },
  ...(logo ? { logo: LOGOS[logo] } : {}),
})

/**
 * The slides each deck has, from its structure (heading face and body face differ here).
 * Presentation: cover, a Colour opening, the palette, one "in use" page per six of the first 13
 * colours, a Typography opening, two face pages, the scale, the scope; a logo adds its opening,
 * the mark, the grounds and the clear-space rule.
 * Poster: cover, one slide per colour, the summary, [mark, paper + ink + up to four brand
 * grounds, clear space], two face slides, the scale, the scope.
 * Grid: cover, colour and type, [logo], the scale, usage notes, scope.
 */
const SLIDES = {
  presentation: (n, logo) => 8 + Math.ceil(Math.min(n, 13) / 6) + (logo ? 4 : 0),
  poster: (n, logo) => 1 + n + 1 + (logo ? 1 + (2 + Math.min(4, n)) + 1 : 0) + 2 + 1 + 1,
  grid: (n, logo) => 5 + (logo ? 1 : 0),
}

// Where each template prints its own slide number, and what it calls a slide's section.
const NUMBER = { presentation: '.rail-folio', poster: '.pn-num', grid: '.mh-num, .mh-line .num' }
const HEADS = { presentation: '.hd-title, .op-head', poster: '.pn-sec', grid: '.tp-h, .mh-sec' }

// The Google Fonts answers: one stylesheet naming the two project faces, and the files.
const FACE_FILES = { Outfit: 'outfit-latin.woff2', Manrope: 'manrope-latin.woff2' }
const FONT_CSS = Object.keys(FACE_FILES).map((family) =>
  `@font-face{font-family:'${family}';font-style:normal;font-weight:100 900;font-display:block;src:url(https://fonts.gstatic.com/s/${family.toLowerCase()}.woff2) format('woff2')}`).join('\n')

async function stubNetwork(context) {
  const strays = []
  await context.route(/^https?:/, async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === 'fonts.googleapis.com') {
      return route.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: FONT_CSS })
    }
    if (url.hostname === 'fonts.gstatic.com') {
      const family = Object.keys(FACE_FILES).find((f) => url.pathname.includes(f.toLowerCase()))
      if (family) {
        return route.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(FONTS, FACE_FILES[family])) })
      }
    }
    strays.push(route.request().url())
    return route.abort()
  })
  return strays
}

/**
 * Everything measured in the page, in one pass. Runs in the browser, so it takes and
 * returns plain data only. Each list holds a short description of every offender.
 * Elements that clip by 1 to 3 px are marked `data-clip` so the test can settle them by pixels.
 */
function measure({ media, name, number, heads }) {
  const PX_PER_PT = 96 / 72
  const tag = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
  const flat = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const sls = [...document.querySelectorAll('.sl')]
  const out = {
    media, slides: sls.length, outside: [], clipped: [], doubtful: [], clampedTitles: 0, small: [], containers: 0, textNodes: 0,
    numbers: [], headings: [], images: document.querySelectorAll('.sl img').length, nameWhole: false,
    topics: [], sizes: [], specimenSizes: [], contents: [],
  }
  if (media === 'screen') document.querySelectorAll('[data-clip]').forEach((el) => el.removeAttribute('data-clip'))
  const long = name.length > 100
  const wholeName = flat(name)

  sls.forEach((sl, si) => {
    const box = sl.getBoundingClientRect()
    for (const el of [sl, ...sl.querySelectorAll('*')]) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') continue
      const r = el.getBoundingClientRect()
      if ((r.width > 0 || r.height > 0) && el !== sl) {
        const over = { left: box.left - r.left, right: r.right - box.right, top: box.top - r.top, bottom: r.bottom - box.bottom }
        const worst = Object.entries(over).sort((a, b) => b[1] - a[1])[0]
        if (worst[1] > 0.5) out.outside.push(`slide ${si + 1} ${tag(el)} passes the ${worst[0]} edge by ${worst[1].toFixed(1)}px`)
      }
      // Something that clips must not be hiding content.
      const clips = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY)
        || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')
      if (clips) {
        out.containers += 1
        const high = el.scrollHeight - el.clientHeight
        const wide = el.scrollWidth - el.clientWidth
        const isTitle = si === 0 && /(^|\s)(cv|mh)-title(\s|$)/.test(el.className)
        // A title cut at a whole word by the generator ends in an ellipsis and does not overflow.
        const cutInText = el.textContent.trim().endsWith('…')
        if (isTitle && long && (high > 0 || cutInText)) {
          out.clampedTitles += 1 // the 120-character name is cut on the cover, and must be printed whole elsewhere
        } else if (high > 3) {
          out.clipped.push(`slide ${si + 1} ${tag(el)} hides ${high}px of height (${el.scrollHeight} in ${el.clientHeight})`)
        } else if (high > 0 && media === 'screen' && !(cs.textOverflow === 'ellipsis' && wide > 0)) {
          // (A line that is cut with an ellipsis on purpose cannot be settled by pixels, because letting it
          // overflow shows the cut text too. Its 1 px of height is the same box as the short names', which are settled.)
          el.setAttribute('data-clip', String(out.doubtful.length))
          out.doubtful.push(`slide ${si + 1} ${tag(el)} reads ${high}px over`)
        }
        if (wide > 3 && cs.textOverflow !== 'ellipsis') out.clipped.push(`slide ${si + 1} ${tag(el)} hides ${wide}px of width (${el.scrollWidth} in ${el.clientWidth})`)
      }
    }
    // Text under 7 pt, by the element each piece of text sits in. Also the sizes Grid's two-size rule reads.
    const sizes = new Set()
    const specimen = new Set()
    const walker = document.createTreeWalker(sl, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue.trim()) continue
      const el = node.parentElement
      if (!el || !el.getClientRects().length || ['STYLE', 'SCRIPT', 'TITLE'].includes(el.tagName)) continue
      out.textNodes += 1
      const px = parseFloat(getComputedStyle(el).fontSize)
      if (px < 7 * PX_PER_PT - 0.01) out.small.push(`slide ${si + 1} ${tag(el)} "${node.nodeValue.trim().slice(0, 24)}" is ${(px / PX_PER_PT).toFixed(2)}pt`)
      const pt = Math.round(px / PX_PER_PT * 100) / 100
      if (!el.closest('.mh')) (el.closest('td.sp') ? specimen : sizes).add(pt)
      // The whole name printed where nothing cuts it: not the cover title, and not an ellipsised line.
      if (long && flat(node.nodeValue).includes(wholeName) && !el.closest('.cv-title, .mh-title') && getComputedStyle(el).textOverflow !== 'ellipsis') {
        out.nameWhole = true
      }
    }
    out.sizes.push([...sizes].sort((a, b) => a - b))
    out.specimenSizes.push([...specimen])
    out.topics.push(sl.querySelectorAll('.gd-body > .tp').length)
    out.numbers.push(((sl.querySelector(number) || {}).textContent || '').trim())
    out.headings.push([...sl.querySelectorAll(heads)].map((h) => h.textContent.trim().replace(/^\d+\s+/, '')))
  })

  // Grid's contents list: each entry names the slide that carries its title in the masthead.
  for (const li of document.querySelectorAll('.cv-toc li')) {
    const spans = li.querySelectorAll('span')
    const title = spans[0]?.textContent.trim() ?? ''
    const n = Number(spans[spans.length - 1]?.textContent)
    const target = sls[n - 1]
    out.contents.push({ title, n, exists: Boolean(target), sec: target?.querySelector('.mh-sec')?.textContent.trim() ?? '' })
  }
  return out
}

/** The pages of a PDF as the sizes in their MediaBox (points). */
function pdfPages(buffer) {
  const text = buffer.toString('latin1')
  const sizes = []
  for (const m of text.matchAll(/\/Type\s*\/Page\b(?!s)/g)) {
    const object = text.slice(m.index, text.indexOf('endobj', m.index))
    const box = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(object)
    sizes.push(box ? { w: Number(box[3]) - Number(box[1]), h: Number(box[4]) - Number(box[2]) } : null)
  }
  return sizes
}

/** Whether hiding the overflow changes a single pixel of an element's neighbourhood. */
async function clipsInk(page, index) {
  const el = page.locator(`[data-clip="${index}"]`)
  await el.scrollIntoViewIfNeeded()
  const box = await el.boundingBox()
  const view = page.viewportSize()
  const x = Math.max(0, Math.floor(box.x - 6))
  const y = Math.max(0, Math.floor(box.y - 8))
  const clip = { x, y, width: Math.min(view.width - x, Math.ceil(box.width + 12)), height: Math.min(view.height - y, Math.ceil(box.height + 16)) }
  const hidden = await page.screenshot({ clip })
  await el.evaluate((e) => { e.dataset.was = e.style.overflow; e.style.overflow = 'visible' })
  const visible = await page.screenshot({ clip })
  await el.evaluate((e) => { e.style.overflow = e.dataset.was })
  return Buffer.compare(hidden, visible) !== 0
}

const LOGO_HEADS = ['The mark', 'On grounds', 'Clear space']
const shortName = (name) => (name.length > 24 ? name.slice(0, 21) + '...' : name)

// Every case is [template, name, palette size, logo key or null].
const CASES = []
for (const template of Object.keys(TEMPLATES)) {
  for (const name of NAMES) for (const n of SIZES) CASES.push([template, name, n, null])
  for (const [logo, n] of LOGO_CASES) CASES.push([template, 'Harbour & Co', n, logo])
}

for (const [template, name, n, logo] of CASES) {
  const chromeFamily = TEMPLATES[template]
  const label = `${template}: "${shortName(name)}" (${name.length} chars) with ${n} colours${logo ? ` and a ${logo} logo` : ''}`
  test.describe(label, () => {
    test.describe.configure({ mode: 'default' }) // one worker per case, so the page is built once; unlike serial, a red test does not skip the rest
    let context
    let page
    let strays
    let screen
    let print
    let pdf
    let loaded // the faces that were loaded while the page was measured, on screen and in print

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext({ locale: 'en-AU', timezoneId: 'UTC' })
      strays = await stubNetwork(context)
      page = await context.newPage()
      const html = buildBrandGuidelines(design(n, logo), { projectName: name, date: FIXED_DATE, template, fontData: chromeFont })
      await page.setContent(html, { waitUntil: 'load' })
      // Ask for each face by name: `fonts.ready` alone can resolve before the first request has been made,
      // and a change of media makes Chromium rebuild the font faces, so each pass settles them again
      // and records which were loaded while it measured.
      const settle = async () => {
        await page.evaluate(async (families) => {
          await Promise.all(families.map((f) => document.fonts.load(`16px "${f}"`)))
          await document.fonts.ready
        }, [chromeFamily, 'Outfit', 'Manrope'])
        return page.evaluate(() => [...document.fonts].filter((x) => x.status === 'loaded').map((x) => x.family.replace(/["']/g, '')))
      }
      const args = { name, template, number: NUMBER[template], heads: HEADS[template] }
      await page.emulateMedia({ media: 'screen' })
      const onScreen = await settle()
      screen = await page.evaluate(measure, { media: 'screen', ...args })
      await page.emulateMedia({ media: 'print' })
      const inPrint = await settle()
      print = await page.evaluate(measure, { media: 'print', ...args })
      loaded = { screen: onScreen, print: inPrint }
      pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
      await page.emulateMedia({ media: 'screen' })
      await settle() // the pixel check below runs on screen, on the real faces
    })
    test.afterAll(async () => { await context?.close() })

    test('the faces measured are the real ones, and nothing came from off the machine', async () => {
      expect(loaded.screen, 'screen: the numbers would be for a fallback face').toEqual(expect.arrayContaining([chromeFamily, 'Outfit', 'Manrope']))
      expect(loaded.print, 'print: the numbers would be for a fallback face').toEqual(expect.arrayContaining([chromeFamily, 'Outfit', 'Manrope']))
      expect(strays, 'the document asked for something off the machine').toEqual([])
    })

    test('the slide count is the one the deck structure gives', async () => {
      expect(screen.slides, `${template} with ${n} colours${logo ? ' and a logo' : ''}`).toBe(SLIDES[template](n, Boolean(logo)))
      expect(print.slides, 'print shows the same slides').toBe(screen.slides)
    })

    test('every box stays inside its slide, on screen and in print', async () => {
      expect(screen.outside, 'screen: an element leaves its slide').toEqual([])
      expect(print.outside, 'print: an element leaves its slide').toEqual([])
    })

    test('nothing that clips hides content', async () => {
      // The check has teeth only if there was something that clips to measure: every slide clips.
      expect(screen.containers, 'fewer clipping elements than slides, so this measured nothing').toBeGreaterThanOrEqual(screen.slides)
      expect(screen.clipped, 'screen: a clipping element hides content').toEqual([])
      expect(print.clipped, 'print: a clipping element hides content').toEqual([])
      const inked = []
      for (let i = 0; i < screen.doubtful.length; i += 1) {
        if (await clipsInk(page, i)) inked.push(screen.doubtful[i])
      }
      expect(inked, 'an element one to three pixels over cuts off ink (a descender, a rule)').toEqual([])
      if (name.length > LONG) {
        expect(screen.clampedTitles, 'the long name is meant to be clamped on the cover').toBeGreaterThan(0)
      } else {
        expect(screen.clampedTitles, 'a name that fits was clamped').toBe(0)
      }
    })

    test('no text is under 7 pt', async () => {
      expect(screen.textNodes, 'no text was measured').toBeGreaterThan(30)
      expect(screen.small, 'screen: text under 7 pt').toEqual([])
      expect(print.small, 'print: text under 7 pt').toEqual([])
    })

    test('a cut name is printed whole', async () => {
      test.skip(name.length <= LONG, 'only the 120-character name is cut on the cover')
      expect(screen.nameWhole, 'the name is clamped on the cover and printed whole nowhere that does not cut it (spec 2.4)').toBe(true)
    })

    test('slide numbers are true', async () => {
      const nums = screen.numbers
      if (template === 'presentation') {
        // The folio is the slide's place in the PDF (the cover is 1). The cover and the openings carry none.
        expect(nums.filter(Boolean).length, 'most content slides print a folio').toBeGreaterThanOrEqual(4)
        expect(nums.map((t, i) => (t ? `${i + 1}:${t}` : '')).filter(Boolean).filter((x) => x.split(':')[0].padStart(2, '0') !== x.split(':')[1]), 'a slide prints a folio that is not its own place in the PDF').toEqual([])
      } else {
        // The cover prints the year in the same place; every slide after it prints its own number.
        expect(nums[0], 'the cover prints the year').toBe('2026')
        expect(nums.slice(1), 'a slide prints a number that is not its own').toEqual(nums.slice(1).map((_, i) => String(i + 2).padStart(2, '0')))
      }
      if (template === 'grid') {
        expect(screen.contents.length, 'the cover lists the slides after it').toBe(screen.slides - 1)
        expect(screen.contents.filter((c) => !c.exists).map((c) => `${c.title} -> ${c.n}`), 'a contents entry names a slide past the end').toEqual([])
        expect(screen.contents.filter((c) => c.title !== c.sec).map((c) => `${c.title} -> slide ${c.n} is "${c.sec}"`), 'a contents entry names a slide with another section').toEqual([])
        expect(screen.contents.map((c) => c.n), 'contents numbers run 02, 03, 04').toEqual(screen.contents.map((_, i) => i + 2))
      }
    })

    if (template === 'grid') {
      test('Grid: a slide holds one to three topics and two text sizes outside the masthead', async () => {
        expect(screen.topics.filter((t) => t < 1 || t > 3).length, `topics per slide: ${screen.topics.join(', ')}`).toBe(0)
        const tooMany = screen.sizes.map((s, i) => ({ s, i })).filter(({ s }) => s.length > 2)
        expect(tooMany.map(({ s, i }) => `slide ${i + 1} sets ${s.join(', ')} pt`), 'a slide uses more than two text sizes').toEqual([])
        expect(screen.sizes.every((s) => s.length >= 1), 'a slide has no text').toBe(true)
        // CONTROL: the rule leaves out the scale's specimens, so they must be what would break it.
        const scale = screen.specimenSizes.findIndex((s) => s.length > 0)
        expect(scale, 'no scale specimens (td.sp) were found, so the exclusion is untested').toBeGreaterThan(0)
        expect(screen.specimenSizes[scale].length + screen.sizes[scale].length, 'the specimens add sizes, so the exclusion is what lets the scale slide pass').toBeGreaterThan(2)
      })
    }

    test('printed to PDF: one page per slide, every page 297 x 167 mm landscape', async () => {
      const sizes = pdfPages(pdf)
      expect(sizes.length, `PDF pages for ${screen.slides} slides`).toBe(screen.slides)
      const off = sizes.map((s, i) => ({ s, i })).filter(({ s }) => !s || Math.abs(s.w - SLIDE_PT.w) > 1 || Math.abs(s.h - SLIDE_PT.h) > 1)
      expect(off.map(({ s, i }) => `PDF page ${i + 1} is ${s ? `${s.w.toFixed(1)} x ${s.h.toFixed(1)}` : 'unreadable'}`), `every PDF page is ${SLIDE_PT.w.toFixed(1)} x ${SLIDE_PT.h.toFixed(1)} pt, wider than tall`).toEqual([])
    })

    test('logo slides exist only with a logo', async () => {
      const heads = screen.headings.flat()
      if (logo) {
        expect(screen.images, 'a deck with a logo draws the mark').toBeGreaterThan(2)
        for (const h of LOGO_HEADS) expect(heads, `the logo deck has no "${h}" slide`).toContain(h)
      } else {
        expect(screen.images, 'a deck with no logo has an image on a slide').toBe(0)
        const found = heads.filter((h) => [...LOGO_HEADS, 'Logo'].includes(h))
        expect(found, 'a deck with no logo has a logo slide or section').toEqual([])
      }
    })
  })
}
