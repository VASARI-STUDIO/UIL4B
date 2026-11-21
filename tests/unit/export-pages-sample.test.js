// What a viewer who cannot export a template is handed for its pages (src/components/export/exportPages.js, ExportPreview.jsx,
// ExportStage.jsx, ExportPageGallery.jsx, src/styles/pages/export-dialog.css).
//
// A sample is the real page at display size: the 1x picture only (the resolution cap), under a tiled "Pro sample" mark, never blurred.
//
// Pinned here, and the change that makes each fail:
//  1. pageImage(page, true) gives the 1x picture and no srcset, even for a page that has a 2x picture.
//     Break: return pageSrcSet(page) for a sample.
//  2. pageImage(page, false) keeps the retina srcset, so Pro and the free default are unchanged.
//     Break: drop the srcset for everyone.
//  3. ExportPreview decides the sample from the template's tier and the server's refusal alone, for every document.
//     Break: put a `kind !== 'kit'` on the `sample` line.
//  4. The stage and the gallery draw the mark over a sample, as a real element the assistive tech skips.
//     Break: leave the .xd-mark span out of either component.
//  5. The mark takes no clicks and nothing in the dialog stylesheet blurs a locked picture.
//     Break: drop pointer-events:none from .xd-mark, or put a blur back on .xd-box.is-locked.
//  6. Every kit page of every theme is a real picture for a sample, and no kit blur stand-in is left on disk.
//     Break: add a kit file back under public/locked-images/export-themes.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pageImage, pagesOf } from '../../src/components/export/exportPages.js'
import { PICKER_THEMES } from '../../src/config/exportThemePicker.js'

const KINDS = ['kit', 'guidelines', 'book']
const read = (p) => fs.readFileSync(p, 'utf8')

test('1. a sample is the 1x picture with no retina version', () => {
  const retina = { src1x: '/export-themes/x-book.webp', src2x: '/export-themes/x-book@2x.webp' }
  assert.deepEqual(pageImage(retina, true), { src: retina.src1x, srcSet: undefined })
  let pages = 0
  for (const theme of PICKER_THEMES) {
    for (const kind of KINDS) {
      for (const page of pagesOf(theme.id, kind)) {
        const image = pageImage(page, true)
        assert.equal(image.src, page.src1x)
        assert.doesNotMatch(image.src, /locked-images/, `${page.src1x} is not drawn from a stand-in`)
        assert.equal(image.srcSet, undefined, `${page.src1x}: a sample has no srcset`)
        pages += 1
      }
    }
  }
  assert.ok(pages > 0, 'the themes have pages to check')
})

test('2. a viewer who can export it still gets the retina srcset when the page has one', () => {
  const retina = { src1x: '/export-themes/x-book.webp', src2x: '/export-themes/x-book@2x.webp' }
  const image = pageImage(retina, false)
  assert.equal(image.src, retina.src1x)
  assert.equal(image.srcSet, `${retina.src1x} 1x, ${retina.src2x} 2x`)
  const [kit] = pagesOf('04-standards', 'kit')
  assert.ok(kit, 'Standards has a kit page')
  assert.equal(pageImage(kit, false).src, kit.src1x)
})

test('3. the sample is chosen from the template tier and the server refusal, not from the kind of document', () => {
  const line = read('src/components/export/ExportPreview.jsx').split('\n').find((l) => /^\s*const sample\s*=/.test(l))
  assert.ok(line, 'ExportPreview computes `sample`')
  assert.match(line, /proTemplate/)
  assert.match(line, /refused/)
  assert.doesNotMatch(line, /kind/, `the sample is switched off for a kind: ${line.trim()}`)
})

test('4. the stage and the gallery draw the mark over a sample', () => {
  const stage = read('src/components/export/ExportStage.jsx')
  assert.match(stage, /\{sample && <span className="xd-mark" aria-hidden="true" \/>\}/)
  const gallery = read('src/components/export/ExportPageGallery.jsx')
  assert.match(gallery, /\{sample && <span className="xd-mark xd-mark--thumb" aria-hidden="true" \/>\}/)
})

test('5. the mark takes no clicks and a locked picture is never blurred', () => {
  const css = read('src/styles/pages/export-dialog.css')
  const mark = css.split('\n').find((l) => /^\.xd-mark\{/.test(l))
  assert.ok(mark, 'the stylesheet has a .xd-mark rule')
  assert.match(mark, /pointer-events:none/)
  assert.doesNotMatch(css, /is-locked[^{]*\{[^}]*blur\(/, 'no blur on a locked picture')
  assert.doesNotMatch(mark, /blur\(/)
})

test('6. no kit blur stand-in is left on disk', () => {
  const dir = 'public/locked-images/export-themes'
  const kit = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /-kit(Screen|Buttons)\.webp$/.test(n)) : []
  assert.deepEqual(kit, [])
})
