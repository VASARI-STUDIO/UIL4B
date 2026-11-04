// THE UI KIT'S THREE LAYOUTS, RENDERED, RESIZED AND PRINTED (export templates, the kit).
//
// For each of Studio, Manual and Showcase, with four designs and with both tiers, this builds
// the real kit with the real generator (tests/helpers/kit-measure.js: the same renderUiKit the
// export panel calls, with every font read from public/fonts), loads it in Chromium at 1440,
// 768 and 390 px wide, and in print, and measures it. It does not go through the app: the
// document is the same file the panel hands over, so what is checked is the kit a person gets.
// Specs 157 and 158 do the same for the book and the guidelines. Each case is its own group of
// tests, so a red result names the layout, the tier, the design and the check.
//
// The four designs: 3 colours with a short name and no logo; 5 colours, "Harbour & Co" and a
// wide logo; 15 colours (the kit shows 13) and no logo; 15 colours, a 100-character name and a
// square logo. A Free kit carries neither the name nor the logo, so its four differ only in
// colours.
//
//   1. Nothing makes the page wider than the window: the document is no wider than the window
//      at 1440, 768 and 390, and no box reaches past the window outside a scroll container.
//   2. A table that scrolls sideways says so: it is followed by a visible "Scroll sideways"
//      hint. A control checks that the narrow layouts do have tables that scroll.
//   3. No text is under the floor: 10 px on screen, 7 pt in print. A type specimen is set at
//      the size it shows and is not held to it.
//   4. No tracked capitals: nothing is text-transform uppercase with more than .04em of
//      letter-spacing.
//   5. Text reads: every piece of text on a flat background is at least 4.5:1 on it, except the
//      labelled demonstrations of a colour pair (Studio's contrast tiles, Manual's body-text
//      sample) and disabled controls.
//   6. Printed to PDF the kit is A4 portrait, no page is blank, and the page count does not
//      depend on how wide the window was.
//   7. A name the cover has to cut is printed whole somewhere that does not cut it. Studio
//      clamps the 100-character name on its cover (a control checks it does); the other two
//      print it whole on the cover.
//
// THE FLOORS are these two constants. They are this suite's ruling, taken from the 7 pt that
// specs 157 and 158 hold the book and the decks to, and 10 px for a screen; the kit's own
// templates set their smallest text at 7 px in Studio's print, 8.67 px in Manual's.
//
// WHAT THIS DOES NOT COVER: a project face wider than Outfit or Manrope, a printer that is not
// Chromium, text over an image or gradient (no flat colour to measure), and a window narrower
// than 390 px.
//
// KIT_TEMPLATES_DIR points the kit at a scratch copy of src/templates/kit, which is how the
// mutations below were run without touching the source.
//
// ── MUTATION ────────────────────────────────────────────────────────────────
// Each of these was applied to a scratch copy of the template (and the one in the source
// restored, byte for byte) and turned the named test red. Test names are the titles below.
//   - "no page-level horizontal overflow"   all three: `body{min-width:900px}` appended to the stylesheet
//   - "a table that scrolls sideways"        manual and showcase: the script's `wrap.after(hint)` removed
//   - "no text is under the floor"          all three: `code{font-size:8px!important}`; print: `@media print{code{font-size:5pt!important}}`
//   - "no tracked capitals"                 all three: `h4,small{text-transform:uppercase;letter-spacing:.1em}`
//   - "text reads"                          all three: `p,small{color:#bbb!important}`
//   - "printed to PDF"                      blank page: two empty `break-before:page` blocks before the footer;
//                                           width-dependent: a resize handler that appends 2000 px at under 500 px
//   - "a cut name is printed whole"         studio: `.pro-title,.identity-name{...ellipsis, 60px}`
//   - "the faces measured"                  a stylesheet `<link>` to https://example.com
import { test, expect } from './base.js'
import { KIT_CHROME } from '../../src/utils/uiKitExport.js'
import { buildKit, measureKit, pdfPages, LAYOUTS } from '../helpers/kit-measure.js'

const SCREEN_FLOOR_PX = 10
const PRINT_FLOOR_PT = 7
const PRINT_FLOOR_PX = PRINT_FLOOR_PT * 96 / 72
const VIEWPORTS = [[1440, 900], [768, 1024], [390, 844]]
// A4 less each layout's @page margins (13, 14 and 18 mm), in CSS px: the width the print layout has.
const PRINT_WIDTH = { studio: 695, manual: 688, showcase: 657 }
const A4_PT = { w: 595.28, h: 841.89 }

const COLOURS = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540', '#B4552D', '#F5EDE3', '#E8B04A', '#7A3E9D', '#2B2B2B', '#F2F2F2', '#5C8A3A', '#D94F70', '#0F766E', '#9A3412']
const NAME_100 = 'Northside Community Legal Centre and Tenants Advice Service for the Greater Western Region of Victoria'.slice(0, 100)
if (NAME_100.length !== 100) throw new Error('the long name must be exactly 100 characters')
const DESIGNS = [
  { key: 'three colours, "Ink", no logo', colours: COLOURS.slice(0, 3), name: 'Ink', logo: null },
  { key: 'five colours, "Harbour & Co", wide logo', colours: COLOURS.slice(0, 5), name: 'Harbour & Co', logo: 'wide' },
  { key: '15 colours, "Harbour", no logo', colours: COLOURS, name: 'Harbour', logo: null },
  { key: '15 colours, a 100-character name, square logo', colours: COLOURS, name: NAME_100, logo: 'square' },
]

const CASES = []
for (const layout of LAYOUTS) for (const tier of ['free', 'pro']) for (const design of DESIGNS) CASES.push([layout, tier, design])

const some = (list, n = 5) => (list.length ? `${list.length}: ${[...new Set(list)].slice(0, n).join(' | ')}` : '')

for (const [layout, tier, design] of CASES) {
  const pro = tier === 'pro'
  const whole = pro ? design.name : ''
  const chrome = KIT_CHROME[layout].map((f) => `Publisher ${f}`)
  test.describe(`${layout} / ${tier} / ${design.key}`, () => {
    test.describe.configure({ mode: 'default' }) // one worker per case, so the page is built once; unlike serial, a red test does not skip the rest
    let context
    let strays
    let loaded
    let seen // the measurements, keyed by window width, and 'print'
    let pdfs // the PDF pages, keyed by the window width it was printed from

    test.beforeAll(async ({ browser }, testInfo) => {
      testInfo.setTimeout(180000)
      context = await browser.newContext({ locale: 'en-AU', timezoneId: 'UTC' })
      strays = []
      await context.route(/^https?:/, (route) => { strays.push(route.request().url()); return route.abort() })
      const page = await context.newPage()
      const html = await buildKit({ layout, tier, colours: design.colours, name: design.name, logo: design.logo })
      await page.setContent(html, { waitUntil: 'load' })
      // Ask for each face by name: `fonts.ready` alone can resolve before the first request is made.
      const settle = async () => {
        await page.evaluate(async (families) => {
          await Promise.all(families.map((f) => document.fonts.load(`16px "${f}"`)))
          await document.fonts.ready
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        }, [...chrome, 'Outfit', 'Manrope'])
        return page.evaluate(() => [...document.fonts].filter((x) => x.status === 'loaded').map((x) => x.family.replace(/["']/g, '')))
      }
      seen = {}
      pdfs = {}
      loaded = []
      // Screen first: the page measures its tables when the window resizes, and printing in between would leave that stale.
      await page.emulateMedia({ media: 'screen' })
      for (const [width, height] of VIEWPORTS) {
        await page.setViewportSize({ width, height })
        loaded = await settle()
        seen[width] = await page.evaluate(measureKit, { floor: SCREEN_FLOOR_PX, name: whole })
      }
      // Then the PDF from each window width, which is how the page count is shown to be the same at all of them.
      await page.emulateMedia({ media: 'print' })
      for (const [width, height] of [...VIEWPORTS].reverse()) {
        await page.setViewportSize({ width, height })
        pdfs[width] = pdfPages(await page.pdf({ preferCSSPageSize: true, printBackground: true }))
      }
      await page.setViewportSize({ width: PRINT_WIDTH[layout], height: 900 })
      await page.emulateMedia({ media: 'print' })
      await settle()
      seen.print = await page.evaluate(measureKit, { floor: PRINT_FLOOR_PX, name: whole })
      await page.close()
    })
    test.afterAll(async () => { await context?.close() })

    const screens = () => VIEWPORTS.map(([w]) => [w, seen[w]])

    test('the faces measured are the real ones, and nothing came from off the machine', async () => {
      expect(loaded, 'the numbers would be for a fallback face').toEqual(expect.arrayContaining([...chrome, 'Outfit', 'Manrope']))
      expect(strays, 'the document asked for something off the machine').toEqual([])
    })

    test('no page-level horizontal overflow at 1440, 768 and 390, or in print', async () => {
      for (const [w, m] of [...screens(), ['print', seen.print]]) {
        expect(m.docWidth, `${w}: the document is wider than its ${m.innerWidth} px window`).toBeLessThanOrEqual(m.innerWidth + 1)
        expect(m.outside, `${w}: a box reaches past the window outside a scroll container`).toEqual([])
      }
    })

    test('a table that scrolls sideways shows the scroll hint', async () => {
      for (const [w, m] of screens()) {
        expect(m.tables.length, `${w}: no tables were found, so this measured nothing`).toBeGreaterThan(0)
        const bare = m.tables.filter((t) => t.scrolls && !t.hint).map((t) => t.label)
        expect(bare, `${w}: a table scrolls sideways with no hint`).toEqual([])
      }
      // CONTROL: at 390 the Manual and Showcase tables do overflow, so the check above had something to judge.
      if (layout !== 'studio') {
        expect(seen[390].tables.filter((t) => t.scrolls).length, 'no table scrolled at 390, so the hint was never tested').toBeGreaterThan(0)
        expect(seen[390].tables.filter((t) => t.scrolls && t.hint).length, 'a scrolling table has its hint showing').toBeGreaterThan(0)
      }
    })

    test(`no text is under the floor: ${SCREEN_FLOOR_PX} px on screen, ${PRINT_FLOOR_PT} pt in print`, async () => {
      for (const [w, m] of screens()) {
        expect(m.textNodes, `${w}: no text was measured`).toBeGreaterThan(150)
        expect(some(m.small), `${w}: text under ${SCREEN_FLOOR_PX} px`).toBe('')
      }
      expect(seen.print.textNodes, 'print: no text was measured').toBeGreaterThan(150)
      expect(some(seen.print.small), `print: text under ${PRINT_FLOOR_PT} pt`).toBe('')
    })

    test('no tracked capitals: nothing is uppercase with more than .04em of letter-spacing', async () => {
      for (const [w, m] of [...screens(), ['print', seen.print]]) expect(some(m.tracked), `${w}: tracked capitals`).toBe('')
    })

    test('text reads: 4.5:1 on its own background, outside the labelled demonstration rows', async () => {
      for (const [w, m] of [...screens(), ['print', seen.print]]) {
        expect(m.judged, `${w}: too little text was judged`).toBeGreaterThan(100)
        expect(some(m.weak), `${w}: text under 4.5:1`).toBe('')
      }
    })

    test('printed to PDF: A4 portrait, no blank page, and the same pages at every window width', async () => {
      const base = pdfs[1440]
      expect(base.length, 'the PDF has no pages, or too many for a kit').toBeGreaterThanOrEqual(4)
      expect(base.length).toBeLessThanOrEqual(16)
      const off = base.map((p, i) => ({ p, i })).filter(({ p }) => !p.w || Math.abs(p.w - A4_PT.w) > 1 || Math.abs(p.h - A4_PT.h) > 1)
      expect(off.map(({ p, i }) => `PDF page ${i + 1} is ${p.w} x ${p.h}`), 'every PDF page is A4 portrait').toEqual([])
      for (const [w] of VIEWPORTS) {
        expect(pdfs[w].map((p, i) => (p.blank ? `page ${i + 1} (${p.bytes} bytes)` : '')).filter(Boolean), `${w}: a PDF page holds nothing but its footer`).toEqual([])
        expect(pdfs[w].length, `${w} px window: the page count differs from the 1440 px window's ${base.length}`).toBe(base.length)
      }
    })

    if (pro) {
      test('a cut name is printed whole where nothing cuts it', async () => {
        for (const [w, m] of [...screens(), ['print', seen.print]]) {
          if (layout === 'studio' && design.name === NAME_100) {
            expect(m.cutTitle, `${w}: the 100-character name is meant to be cut on Studio's cover`).toBe(true)
          } else {
            expect(m.cutTitle, `${w}: a name that fits was cut on the cover`).toBe(false)
          }
          expect(m.wholeName, `${w}: the name "${design.name.slice(0, 30)}" is printed whole nowhere that does not cut it`).toBe(true)
        }
      })
    }
  })
}
