// THE DESIGN SYSTEM BOOK'S THREE TEMPLATES, RENDERED AND PRINTED (export templates, slice 2).
//
// For each of Specification, Monograph and Atlas, with each of the five test names (the
// ones tests/unit/fit-title.test.js pins) and palettes of 3, 5, 8 and 13 colours, this
// builds the real document with the real generator and the server's own chrome-font
// reader, loads it in Chromium and measures it. It does not go through the app: the
// document is the same string the Pro route returns, so what is checked is the page a
// person gets, not the panel that asks for it. Each case is its own group of tests, so a
// red result names the template, the name, the palette and the check.
//
//   1. Every box stays inside its page: no descendant's box passes its `.pg` box by more
//      than 0.5 px, on screen and in print.
//   2. Nothing that clips is hiding content: an element with overflow hidden or a line
//      clamp has no more content than it shows (scrollHeight against clientHeight).
//   3. No text is under 7 pt.
//   4. Monograph's chrome serif (Literata) is never above 11 pt.
//   5. Folios are true: each contents entry names the page its title is on, and each
//      printed folio is its own page's number.
//   6. `page.pdf({ preferCSSPageSize: true })` gives one PDF page per `.pg`, and every PDF
//      page is A4 portrait (read from its MediaBox).
//
// THE FIXTURE. The user's own faces are linked from Google Fonts in a real export. This
// suite makes no live call, so the Google Fonts stylesheet and files are answered from
// public/fonts: the project's faces are Outfit (headings) and Manrope (body), which are
// in that folder, so the measured text is set in a real face and not a fallback. Any
// other request off the machine is refused, and a test fails if one was made. The
// server's chrome faces (Hanken Grotesk, Literata, Martian Mono) are embedded as base64
// by the server's own reader, exactly as api/_lib/exportDocument.js does it.
//
// TWO RULINGS THE CHECKS MAKE.
//   - Spec 2.4 says a name that cannot fit its last step is clamped on the cover with an
//     ellipsis and printed whole elsewhere. So for the 120-character name only, the cover
//     and half-title title may hide height, and the test then requires the whole name on a
//     later page. Any other name that is cut is a failure.
//   - scrollHeight and clientHeight are whole numbers, so a line box with a fractional
//     height reads 1 px apart with nothing hidden. A clipper that is 1 to 3 px over is
//     therefore settled by pixels: the page is shot with its overflow hidden and again
//     with it visible, and the two must be identical. Over 3 px fails outright.
//
// WHAT THIS DOES NOT COVER: a project with a logo, a project face wider than Outfit or
// Manrope (their real Google files are not in the repo), or a printer that is not Chromium.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Each of these was applied to the source (and restored), and turned the named test red.
// The edits and their results are in the lane report. Test names are the titles below.
//   - "every box stays inside its page"   atlas.js `.pl-vals` margin-top:260mm
//   - "nothing that clips hides content"  specification.js `.cv-title` -webkit-line-clamp:3 -> 1
//   - "no text is under 7 pt"             atlas.js `.lbl` 7pt -> 6pt
//   - "no Literata text is above 11 pt"   monograph.js `.rh` 8pt -> 12pt
//   - "contents entries name their page"  designSystemBook.js addOpening contents folio + 1
//   - "printed folios are the page's own" monograph.js the frame's printed folio + 1
//   - "printed to PDF"                     monograph.js `@page` 210mm 297mm -> 297mm 210mm
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
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
const TEMPLATES = { specification: 'Hanken Grotesk', monograph: 'Literata', atlas: 'Martian Mono' }
const LONG = 100 // a name over this is the one spec 2.4 lets the cover clamp

const design = (n) => ({
  palette: { base: COLOURS[0], harmony: 'auto', colors: COLOURS.slice(0, n) },
  fonts: { heading: { family: 'Outfit', weight: 700 }, body: { family: 'Manrope', weight: 400 } },
})

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
function measure({ media, name }) {
  const PX_PER_PT = 96 / 72
  const tag = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
  const family = (cs) => cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')
  const flat = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const pgs = [...document.querySelectorAll('.pg')]
  const out = { media, pages: pgs.length, outside: [], clipped: [], doubtful: [], clampedTitles: 0, small: [], literata: [], folios: [], contents: [], containers: 0, textNodes: 0 }
  if (media === 'screen') document.querySelectorAll('[data-clip]').forEach((el) => el.removeAttribute('data-clip'))
  const long = name.length > 100

  pgs.forEach((pg, pi) => {
    const box = pg.getBoundingClientRect()
    for (const el of [pg, ...pg.querySelectorAll('*')]) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') continue
      const r = el.getBoundingClientRect()
      if ((r.width > 0 || r.height > 0) && el !== pg) {
        const over = { left: box.left - r.left, right: r.right - box.right, top: box.top - r.top, bottom: r.bottom - box.bottom }
        const worst = Object.entries(over).sort((a, b) => b[1] - a[1])[0]
        if (worst[1] > 0.5) out.outside.push(`page ${pi + 1} ${tag(el)} passes the ${worst[0]} edge by ${worst[1].toFixed(1)}px`)
      }
      // Something that clips must not be hiding content.
      const clips = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY)
        || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')
      if (clips) {
        out.containers += 1
        const high = el.scrollHeight - el.clientHeight
        const wide = el.scrollWidth - el.clientWidth
        const isTitle = pi < 2 && /(^|\s)(cv|at)-title(\s|$)/.test(el.className)
        if (high > 0 && isTitle && long) {
          out.clampedTitles += 1 // spec 2.4: the 120-character name is cut on the cover, and printed whole later
        } else if (high > 3) {
          out.clipped.push(`page ${pi + 1} ${tag(el)} hides ${high}px of height (${el.scrollHeight} in ${el.clientHeight})`)
        } else if (high > 0 && media === 'screen') {
          el.setAttribute('data-clip', String(out.doubtful.length))
          out.doubtful.push(`page ${pi + 1} ${tag(el)} reads ${high}px over`)
        } else if (high > 0) {
          // the same element is judged by its pixels on screen; print only repeats the big ones
        }
        if (wide > 3 && cs.textOverflow !== 'ellipsis') out.clipped.push(`page ${pi + 1} ${tag(el)} hides ${wide}px of width (${el.scrollWidth} in ${el.clientWidth})`)
      }
      if (family(cs).startsWith('Literata') && parseFloat(cs.fontSize) > 11 * PX_PER_PT + 0.01) {
        out.literata.push(`page ${pi + 1} ${tag(el)} is ${(parseFloat(cs.fontSize) / PX_PER_PT).toFixed(2)}pt in Literata`)
      }
    }
    // Text under 7 pt, by the element each piece of text sits in.
    const walker = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue.trim()) continue
      const el = node.parentElement
      if (!el || !el.getClientRects().length || ['STYLE', 'SCRIPT', 'TITLE'].includes(el.tagName)) continue
      out.textNodes += 1
      const px = parseFloat(getComputedStyle(el).fontSize)
      if (px < 7 * PX_PER_PT - 0.01) out.small.push(`page ${pi + 1} ${tag(el)} "${node.nodeValue.trim().slice(0, 24)}" is ${(px / PX_PER_PT).toFixed(2)}pt`)
    }
    // Printed folios: the text of every .folio on the page.
    for (const f of pg.querySelectorAll('.folio')) out.folios.push({ index: pi, text: f.textContent.trim() })
  })

  // The whole name, printed on some page after the cover and half-title.
  out.nameOnLaterPage = pgs.slice(2).some((pg) => flat(pg.textContent).includes(flat(name)))

  const firstPlate = pgs.findIndex((pg) => pg.classList.contains('pl'))
  for (const li of document.querySelectorAll('.pg-contents .ct-list li')) {
    const title = li.querySelector('.ct-title')?.textContent ?? ''
    const folio = Number(li.querySelector('.ct-folio')?.textContent)
    const target = pgs[folio - 1]
    // A page carries a title if it prints it; "Name · #hex" entries print the name and the hex apart.
    const head = flat(title.split(' · ')[0])
    out.contents.push({
      title, folio, exists: Boolean(target),
      // Atlas opens Colour on its first plate, which has no heading of its own.
      onPage: Boolean(target) && (flat(target.textContent).includes(head) || (title === 'Colour' && firstPlate === folio - 1)),
    })
  }
  out.contentsPages = document.querySelectorAll('.pg-contents').length
  return out
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }
const folioNumber = (text) => (/^\d+$/.test(text) ? Number(text) : ROMAN[text.toLowerCase()])

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
const A4 = { w: 595.28, h: 841.89 }

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

for (const [template, chromeFamily] of Object.entries(TEMPLATES)) {
  for (const name of NAMES) {
    for (const n of SIZES) {
      const label = `${template}: "${name.length > 24 ? name.slice(0, 21) + '...' : name}" (${name.length} chars) with ${n} colours`
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
          const html = buildDesignSystemBook(design(n), { projectName: name, date: FIXED_DATE, template, fontData: chromeFont })
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
          await page.emulateMedia({ media: 'screen' })
          const onScreen = await settle()
          screen = await page.evaluate(measure, { media: 'screen', name })
          await page.emulateMedia({ media: 'print' })
          const inPrint = await settle()
          print = await page.evaluate(measure, { media: 'print', name })
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
          expect(screen.pages, 'a document with fewer than 8 pages is not a book').toBeGreaterThanOrEqual(8)
        })

        test('every box stays inside its page, on screen and in print', async () => {
          expect(screen.outside, 'screen: an element leaves its page').toEqual([])
          expect(print.outside, 'print: an element leaves its page').toEqual([])
        })

        test('nothing that clips hides content', async () => {
          // The check has teeth only if there was something that clips to measure.
          expect(screen.containers, 'no clipping element was found, so this measured nothing').toBeGreaterThan(5)
          expect(screen.clipped, 'screen: a clipping element hides content').toEqual([])
          expect(print.clipped, 'print: a clipping element hides content').toEqual([])
          const inked = []
          for (let i = 0; i < screen.doubtful.length; i += 1) {
            if (await clipsInk(page, i)) inked.push(screen.doubtful[i])
          }
          expect(inked, 'an element one to three pixels over cuts off ink (a descender, a rule)').toEqual([])
          if (name.length > LONG) {
            expect(screen.clampedTitles, 'the long name is meant to be clamped on the cover').toBeGreaterThan(0)
            expect(screen.nameOnLaterPage, 'a clamped name must be printed whole on a later page (spec 2.4)').toBe(true)
          } else {
            expect(screen.clampedTitles, 'a name that fits was clamped').toBe(0)
          }
        })

        test('no text is under 7 pt', async () => {
          expect(screen.textNodes, 'no text was measured').toBeGreaterThan(40)
          expect(screen.small, 'screen: text under 7 pt').toEqual([])
          expect(print.small, 'print: text under 7 pt').toEqual([])
        })

        if (template === 'monograph') {
          test('no Literata text is above 11 pt', async () => {
            expect(screen.literata, 'screen: Literata above 11 pt').toEqual([])
            expect(print.literata, 'print: Literata above 11 pt').toEqual([])
          })
        }

        test('contents entries name their page', async () => {
          expect(screen.contentsPages, 'a book has one contents page').toBe(1)
          expect(screen.contents.length, 'the contents lists the sections').toBeGreaterThanOrEqual(4)
          expect(screen.contents.filter((c) => !c.exists).map((c) => `${c.title} -> ${c.folio}`), 'an entry names a page past the end').toEqual([])
          expect(screen.contents.filter((c) => !c.onPage).map((c) => `${c.title} -> page ${c.folio}`), 'an entry names a page that does not carry its title').toEqual([])
          const folios = screen.contents.map((c) => c.folio)
          expect(folios, 'contents folios run forward').toEqual([...folios].sort((a, b) => a - b))
        })

        test("printed folios are the page's own", async () => {
          const printed = screen.folios.map((f) => ({ ...f, number: folioNumber(f.text) }))
          expect(printed.filter((f) => f.number === undefined).map((f) => f.text), 'a folio that is neither a number nor a roman numeral').toEqual([])
          expect(printed.filter((f) => f.number !== f.index + 1).map((f) => `page ${f.index + 1} prints folio "${f.text}"`), 'a page prints a folio that is not its own').toEqual([])
          expect(printed.length, 'most pages print a folio').toBeGreaterThanOrEqual(Math.floor(screen.pages / 2))
        })

        test('printed to PDF: one page per .pg, every page A4 portrait', async () => {
          const sizes = pdfPages(pdf)
          expect(sizes.length, `PDF pages for ${screen.pages} .pg elements`).toBe(screen.pages)
          const notA4 = sizes.map((s, i) => ({ s, i })).filter(({ s }) => !s || Math.abs(s.w - A4.w) > 1 || Math.abs(s.h - A4.h) > 1)
          expect(notA4.map(({ s, i }) => `PDF page ${i + 1} is ${s ? `${s.w.toFixed(1)} x ${s.h.toFixed(1)}` : 'unreadable'}`), 'every PDF page is A4 portrait (595.3 x 841.9 pt)').toEqual([])
        })
      })
    }
  }
}
