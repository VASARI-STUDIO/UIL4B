// THE EXPORT CARDS SHOW, AND COPY, WHAT THE PRODUCT REALLY PRODUCES.
//
// Section "Studio quality exports" on the landing (SpectrumExports.jsx) has three
// cards. Card 1 is a live panel that builds and copies a real file (palette, type
// scale, compressed files, icons); this file pins it to the product: the contrast
// verdict, the copied icon files, the compressed-files total. Cards 2 and 3 show
// pictures of real exports (public/home-exports/, listed in homeExports.generated.js
// and checked by home-exports-assets.test.js), so there is no drawn document left to
// differ from the thing; what remains to pin there is the copy around them, which
// used to name a PDF and a version history the product does not have. The kit's
// five colour role names are still pinned below against the real kit.
import test from 'node:test'
import assert from 'node:assert/strict'
import { SLOT_COPY, SLOT_ORDER } from '../../src/utils/uiKitExport.js'
import { PH_REGULAR } from '../../src/components/spectrum/phosphorRegular.js'
import {
  BASES,
  EX_FILES,
  EX_FILES_AFTER_KB,
  EX_PIECES,
  GLYPHS,
  ICON_FORMATS,
  KIT_ROLES,
  exFileIcon,
  exFileOf,
  formatBytes,
  inkOn,
  rampOf,
  ratio,
} from '../../src/components/spectrum/spectrumKit.js'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'

const EXPORTS_SRC = stripComments(read('src/components/spectrum/SpectrumExports.jsx'))
const CSS = read('src/styles/pages/spectrum.css').replace(/\/\*[\s\S]*?\*\//g, '')

test('the stripper still works, so the source reads below can be trusted', () => {
  assertStripperWorks(assert)
})

test('the kit colour roles kept in spectrumKit.js match the real kit', () => {
  // spectrumKit.js keeps a copy (importing uiKitExport.js would pull the colour
  // and token code into the home chunk). The copy has to match the original,
  // role and note, in the kit's own order.
  assert.equal(KIT_ROLES.length, SLOT_ORDER.length)
  KIT_ROLES.forEach((r, i) => {
    assert.equal(r.id, SLOT_ORDER[i], `slot ${i} is not the kit's ${SLOT_ORDER[i]}`)
    assert.equal(r.role, SLOT_COPY[r.id].role)
    assert.equal(r.note, SLOT_COPY[r.id].note)
  })
  assert.deepEqual(KIT_ROLES.map((r) => r.role),
    ['Signature accent', 'Primary brand', 'Supporting colour', 'Canvas', 'Text and detail'])
  for (const old of ['Anchor', 'Support']) {
    assert.ok(!new RegExp(`'${old}'`).test(EXPORTS_SRC), `the card still names a swatch "${old}"`)
  }
})

test('every step is graded against the ink that reads on it', () => {
  for (const base of BASES) {
    for (const r of rampOf(base)) {
      assert.equal(r.ink, inkOn(r.hex))
      assert.equal(r.cr, Math.round(ratio(r.hex, r.ink) * 10) / 10, 'graded on the printed one-decimal ratio')
      const want = r.cr >= 7 ? 'AAA' : r.cr >= 4.5 ? 'AA' : 'Fails'
      assert.equal(r.aa, want, `${base.label} ${r.step}`)
      assert.notEqual(r.aa, 'LOW', 'the old verdict against near-black is back')
    }
  }
  // The deepest navy used to read LOW; white text on it passes comfortably.
  const deepest = rampOf(BASES[0]).at(-1)
  assert.equal(deepest.aa, 'AAA')
})

test('Copy file copies a real file for every piece that has one', () => {
  for (let fmt = 0; fmt < 3; fmt += 1) {
    for (const piece of [0, 1, 3]) {
      const f = exFileOf(piece, fmt, BASES[0])
      assert.ok(f.text.length > 0, `piece ${piece}, format ${fmt} copies nothing`)
      assert.ok(!/kb;/.test(f.text) && !f.text.includes('--icon-'), `piece ${piece} copies the old made-up CSS`)
      assert.ok(f.name && /\d/.test(f.kb))
    }
  }
  // Palette and Type scale: the three real syntaxes.
  assert.match(exFileOf(0, 0, BASES[0]).text, /^:root \{\n {2}--color-50: +#[0-9A-F]{6};/)
  for (const piece of [0, 1]) {
    const json = JSON.parse(exFileOf(piece, 2, BASES[0]).text)
    assert.ok(Object.values(json).every((t) => typeof t.$value === 'string'), `piece ${piece} JSON is not a token map`)
  }
  // Icons: twelve standalone SVGs, a JSX import plus twelve calls, a sprite of twelve symbols.
  const svg = exFileOf(3, 0, BASES[0])
  assert.equal(svg.name, 'icons.svg')
  assert.equal((svg.text.match(/<svg /g) || []).length, GLYPHS.length)
  assert.equal(svg.kb, `${(svg.text.length / 1024).toFixed(1)} KB`)
  const jsx = exFileOf(3, 1, BASES[0])
  assert.equal(jsx.name, 'Icons.jsx')
  assert.match(jsx.text, /^import \{ Palette, Swatches, .*, Crop \} from '@phosphor-icons\/react'\n/)
  assert.equal((jsx.text.match(/<\w+ size=\{24\} weight="regular" \/>/g) || []).length, GLYPHS.length)
  const sprite = exFileOf(3, 2, BASES[0])
  assert.equal(sprite.name, 'icons-sprite.svg')
  assert.equal((sprite.text.match(/<symbol /g) || []).length, GLYPHS.length)
  assert.equal((sprite.text.match(/<svg /g) || []).length, 1)
  for (const [slug] of GLYPHS) assert.ok(svg.text.includes(PH_REGULAR[slug]), `icons.svg lacks the real ${slug} path`)
  assert.equal(ICON_FORMATS.length, 3)
})

test('Compressed files copies nothing and shows the true total', () => {
  const f = exFileOf(2, 0, BASES[0])
  assert.equal(f.text, '')
  assert.equal(f.name, 'compressed-images.zip')
  assert.equal(EX_FILES_AFTER_KB, EX_FILES.reduce((n, row) => n + row[3], 0))
  assert.equal(f.kb, formatBytes(EX_FILES_AFTER_KB * 1024))
  assert.equal(EX_PIECES[2], 'Compressed files')
  assert.match(EXPORTS_SRC, /route\('file-converter'\)/, 'the card no longer links to the File Converter')
})

test('every glyph the file bar can ask for is one the page ships', () => {
  for (let piece = 0; piece < EX_PIECES.length; piece += 1) {
    for (let fmt = 0; fmt < 3; fmt += 1) {
      const name = exFileIcon(piece, fmt)
      assert.ok(PH_REGULAR[name], `exFileIcon(${piece}, ${fmt}) is "${name}", which phosphorRegular.js does not carry`)
    }
  }
})

test('the cards say nothing the product does not do', () => {
  assert.ok(!/\bPDF\b/.test(EXPORTS_SRC), 'the exports section names a PDF; the kit has no PDF export')
  assert.ok(!/exact version/i.test(EXPORTS_SRC), 'card 3 claims the exact version you shipped; a project keeps none')
  assert.ok(!EXPORTS_SRC.includes('sp-kitchips') && !EXPORTS_SRC.includes('sp-kit-ed'),
    'the chip row or the "Free edition" tab label is back')
  assert.ok(!CSS.includes('.sp-kitchips') && !CSS.includes('.sp-kit-ed'), 'spectrum.css still styles the removed chips or label')
  assert.ok(EXPORTS_SRC.includes('Example projects') && EXPORTS_SRC.includes('Example sizes'),
    'sample projects or sample sizes are no longer labelled as examples')
})

test('the stack settles in 240ms, not .4s', () => {
  assert.match(CSS, /\.sp-stack-card\s*\{[^}]*transition:\s*transform 240ms[^}]*filter 240ms/)
})
