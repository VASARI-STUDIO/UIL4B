// What a viewer who cannot export a template is handed for its pages (src/components/export/exportPages.js, ExportPreview.jsx).
//
// Pinned here, and the change that makes each fail:
//  1. Every page of every theme, the UI kit's included, has a stand-in on disk, and pageImage(page, true) points at it: a tiny
//     picture, no srcset, never the real address.
//     Break: leave the kit pages out of THEME_KEYS in scripts/library/lockedStandins.mjs and regenerate (the kit stand-ins go missing).
//  2. pageImage(page, false) still gives the real picture (and its srcset), so Pro and the free default are unchanged.
//     Break: make pageImage return the stand-in for everyone.
//  3. ExportPreview decides the stand-in from the template's tier and the server's refusal alone, for every document.
//     Break: put a `kind !== 'kit'` back on the `standin` line.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pageImage, pagesOf } from '../../src/components/export/exportPages.js'
import { PICKER_THEMES } from '../../src/config/exportThemePicker.js'

const KINDS = ['kit', 'guidelines', 'book']

test('1. every page of every theme, the UI kit included, is drawn from a stand-in for a viewer who cannot export it', () => {
  let kitPages = 0
  for (const theme of PICKER_THEMES) {
    for (const kind of KINDS) {
      for (const page of pagesOf(theme.id, kind)) {
        const image = pageImage(page, true)
        assert.match(image.src, /^\/locked-images\/export-themes\/[\w-]+\.webp$/, `${page.src1x} has no stand-in address`)
        assert.notEqual(image.src, page.src1x)
        assert.equal(image.srcSet, undefined, `${page.src1x}: a stand-in has no srcset`)
        assert.ok(fs.existsSync(`public${image.src}`), `${image.src} is not on disk: run node scripts/library/lockedStandins.mjs`)
        if (kind === 'kit') kitPages += 1
      }
    }
  }
  assert.ok(kitPages >= 2, 'the themes have kit pages to check')
})

test('2. a viewer who can export it still gets the real picture', () => {
  const [kit] = pagesOf('04-standards', 'kit')
  assert.ok(kit, 'Standards has a kit page')
  const image = pageImage(kit, false)
  assert.equal(image.src, kit.src1x)
  assert.ok(!image.src.startsWith('/locked-images/'))
})

test('3. the stand-in is chosen from the template tier and the server refusal, not from the kind of document', () => {
  const source = fs.readFileSync('src/components/export/ExportPreview.jsx', 'utf8')
  const line = source.split('\n').find((l) => /^\s*const standin\s*=/.test(l))
  assert.ok(line, 'ExportPreview computes `standin`')
  assert.match(line, /proTemplate/)
  assert.match(line, /refused/)
  assert.doesNotMatch(line, /kind/, `the stand-in is switched off for a kind: ${line.trim()}`)
})
