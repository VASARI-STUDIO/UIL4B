// The live preview shows what the download contains. For a project that has written nothing (no identity, no copy), every
// field gets the same placeholder in the preview and in the downloaded file; it is never a sample brand's copy, and a field is
// never dropped on one side only. (Rule: export-systems/briefs/formats-pilot.md, which replaces "fill from the theme's sample brand".)
//
// What is pinned here, and the change that makes each fail:
//  1. THE BOOK PREVIEW IS IN THE BOOK DOWNLOAD, in every theme that has a book row: the visible text of renderThemePage({ kind: 'book' })
//     appears in the visible text of renderThemeExport({ row: 'book', format: 'pdf' }).
//     Break: in renderThemePage (api/_lib/exportThemeRoute.js) build the book preview from a different brand than renderThemeExport does, or
//     in projectToBrand (brandFromProject.js) return different text when a second argument is given.
//  2. EACH GUIDELINES PAGE THE DIALOG ASKS FOR IS IN THE SLIDES PDF DOWNLOAD, in every theme: cover and palette.
//     Break: in brandFromProject.js skeleton(), write a field only when the caller is a preview, or have a theme's cover.js read a copy
//     field the download's ctx lacks.
//  3. THE SAME PAGES ARE IN brand-guidelines.html INSIDE THE SLIDES HTML ZIP, in every theme with no guideSite (the single-file document).
//     Break: in renderThemeExport's slides branch, pass a different brand to makeCtx for the zip than for the pdf.
//  4. NO SAMPLE BRAND'S NAME IS IN ANY PREVIEW'S TEXT.
//     Break: in brandFromProject.js skeleton(), set name or the wordmark fallback to a name from brands/*/brand.js (e.g. 'Margin').
//  5. THE PREVIEW PAGES ARE MAPPED: previewPagesFor(theme, 'guidelines') names exactly the pages this file checks, so a page added to
//     the dialog without a check here fails loudly.
//     Break: add a page to the guidelines KINDS entry in src/config/exportPreviewData.js.
//  Known gap (test.todo below): premium-site themes (T.guideSite) print "Your name" through siteBrand in the zip, where the preview and
//  the print document say "Your brand". Owned by the export lane; this file does not change the route.
import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { renderThemeExport, renderThemePage } from '../../api/_lib/exportThemeRoute.js'
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js'
import { EXPORT_THEMES, themeHasRow } from '../../src/data/exportThemes.js'
import { previewPagesFor } from '../../src/config/exportPreviewData.js'

// The dialog's page key -> the engine's page id (api/_lib/exportLivePreview.js PAGES).
const GUIDE_PREVIEW = { guideCover: 'cover', guidePalette: 'palette' }

const THEMES = {}
for (const { id } of EXPORT_THEMES) THEMES[id] = await import(`../../api/_lib/exportThemes/themes/${id}/index.js`)

// An empty project: no design, no name.
const EMPTY = {}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&nbsp;': ' ', '&apos;': "'" }
// The text a person sees: the head, styles and scripts are not content, every tag is a break, whitespace collapses.
function visibleText(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<(style|script|title)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim()
}

// Say which words are missing, not just that a match failed.
function assertContained(small, big, what) {
  assert.ok(small.length > 40, `${what}: the preview has text to compare`)
  if (big.includes(small)) return
  const words = small.split(' ')
  const at = words.findIndex((_, i) => !big.includes(words.slice(0, i + 1).join(' ')))
  assert.fail(`${what}: the preview text is not in the download, near: "${words.slice(Math.max(0, at - 6), at + 6).join(' ')}"`)
}

// One download per theme and kind, built once and shared by the checks that read it.
const memo = new Map()
const once = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key) }
const slidesPdf = (theme) => once(`pdf:${theme}`, async () => visibleText((await renderThemeExport({ theme, row: 'slides', format: 'pdf', ...EMPTY })).html))
const bookPdf = (theme) => once(`book:${theme}`, async () => visibleText((await renderThemeExport({ theme, row: 'book', format: 'pdf', ...EMPTY })).html))
const guideZipDoc = (theme) => once(`zip:${theme}`, async () => {
  const { zip } = await renderThemeExport({ theme, row: 'slides', format: 'html', ...EMPTY })
  const files = await JSZip.loadAsync(zip)
  const name = Object.keys(files.files).find((n) => /(^|\/)brand-guidelines\.html$/.test(n))
  assert.ok(name, `${theme}: the slides zip holds brand-guidelines.html`)
  return visibleText(await files.files[name].async('string'))
})
const preview = (theme, kind, page) => once(`prev:${theme}:${kind}:${page}`, async () => visibleText((await renderThemePage({ theme, kind, page, ...EMPTY })).html))

// Every sample brand's own name, from the brand files.
const SAMPLE_NAMES = Object.values(BRANDS).map((b) => b.data.name)
// "Margin 56 px" is the grid's own label on the layout pages, not the sample brand called Margin, so a number after a name is let through.
const hasWord = (text, word) => new RegExp(`(^|[^A-Za-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?! \\d)([^A-Za-z]|$)`).test(text)

for (const { id: theme } of EXPORT_THEMES) {
  const T = THEMES[theme]
  const premium = Boolean(T.guideSite)

  if (themeHasRow(theme, 'book')) {
    test(`${theme}: the book preview is in the book download`, async () => {
      assertContained(await preview(theme, 'book'), await bookPdf(theme), `${theme} book`)
    })
    test(`${theme}: the book preview names no sample brand`, async () => {
      const text = await preview(theme, 'book')
      for (const name of SAMPLE_NAMES) assert.ok(!hasWord(text, name), `${theme} book preview says "${name}"`)
    })
  }

  if (themeHasRow(theme, 'slides')) {
    test(`${theme}: the dialog's guidelines pages are the ones this file checks`, () => {
      assert.deepEqual(previewPagesFor(theme, 'guidelines').map((p) => p.id).sort(), Object.keys(GUIDE_PREVIEW).sort())
    })

    for (const page of Object.values(GUIDE_PREVIEW)) {
      test(`${theme}: the ${page} preview is in the slides PDF download`, async () => {
        assertContained(await preview(theme, 'guidelines', page), await slidesPdf(theme), `${theme} ${page}`)
      })
      test(`${theme}: the ${page} preview names no sample brand`, async () => {
        const text = await preview(theme, 'guidelines', page)
        for (const name of SAMPLE_NAMES) assert.ok(!hasWord(text, name), `${theme} ${page} preview says "${name}"`)
      })
      if (!premium) {
        test(`${theme}: the ${page} preview is in brand-guidelines.html in the slides zip`, async () => {
          assertContained(await preview(theme, 'guidelines', page), await guideZipDoc(theme), `${theme} ${page} (zip)`)
        })
      }
    }
  }

  // KNOWN GAP, owned by the export lane: a premium-site theme's zip is drawn through siteBrand() in renderThemeExport, which swaps the
  // unwritten name "Your brand" for "Your name" in the site's titles, stylesheet comments, README and logo. The preview and the print
  // PDF keep "Your brand", so the zip's text is not the preview's. Make it pass by giving the site the same placeholder (route change).
  if (premium) test.todo(`${theme}: the guidelines preview is in the slides zip (the site prints "Your name" through siteBrand)`)
}
