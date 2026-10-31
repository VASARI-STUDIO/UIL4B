// Slice 5: type specimens are built from the user's system, not from an alphabet.
// Every document that sets a face sets a sentence of this system's facts in it, and
// the character set survives only as a glyph strip at 8pt or smaller. To see these
// fail, put the alphabet back into any `.fm-set` in src/utils/exportTemplates/book/atlas.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderAll } from '../helpers/export-golden.js'
import { SAMPLES, FIXED_DATE } from '../helpers/export-samples.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { renderUiKit, kitSelections } from '../../src/utils/uiKitExport.js'
import { systemSentence, glyphStrip, GLYPH_STRIP, GLYPH_STRIP_PT } from '../../src/utils/exportTemplates/shared.js'
import { contrast } from '../../src/utils/styleGuideExport.js'
import { readKitTemplate } from '../helpers/export-golden.js'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const STRIP = /<p class="glyph-strip"[^>]*>[^<]*<\/p>/g

test('the sentence names the family and weight, so a different font prints different words', () => {
  const a = systemSentence({ heading: 'Fraunces', headingWeight: 700, ratio: 1.25 }, 'heading')
  const b = systemSentence({ heading: 'Inter', headingWeight: 700, ratio: 1.25 }, 'heading')
  assert.equal(a, 'Fraunces 700 sets the headings, each step 1.25 times the one below.')
  assert.notEqual(a, b)
  assert.equal(systemSentence({ body: 'Inter', bodyWeight: 400, baseSize: 16, lineHeight: 1.5 }, 'body'), 'Inter 400 sets the text at 16px with 1.5 leading.')
})

test('the glyph strip is the character set at no more than 9pt', () => {
  assert.ok(GLYPH_STRIP_PT <= 9)
  const html = glyphStrip("font-family:'Inter'")
  assert.ok(html.includes(UPPER))
  assert.match(html, /font-size:8pt/)
})

test('no document holds the alphabet outside a glyph strip', () => {
  const docs = renderAll()
  for (const [key, html] of Object.entries(docs)) {
    const rest = html.replace(STRIP, '')
    assert.ok(!rest.includes(UPPER), `${key} sets the alphabet outside a glyph strip`)
    assert.ok(!rest.includes('abcdefghijklmnopqrstuvwxyz'), `${key} sets the lowercase alphabet outside a glyph strip`)
  }
})

test('every strip in every document is 9pt or smaller', () => {
  for (const [key, html] of Object.entries(renderAll())) {
    for (const strip of html.match(STRIP) || []) {
      const pt = Number(/font-size:([\d.]+)pt/.exec(strip)?.[1])
      assert.ok(pt > 0 && pt <= 9, `${key} has a strip at ${pt}pt`)
    }
  }
})

test('two projects with different fonts get different specimen text, in the book, the deck and the kit', () => {
  const north = SAMPLES.northbeam
  const other = { ...north.design, fonts: { heading: { family: 'Fraunces', weight: 600 }, body: { family: 'Work Sans', weight: 400 } } }
  const build = (design) => ({
    book: buildDesignSystemBook(design, { projectName: 'Lumen', date: FIXED_DATE }),
    deck: buildBrandGuidelines(design, { projectName: 'Lumen', date: FIXED_DATE }),
    kit: renderUiKit(design, { tier: 'free', template: readKitTemplate(), date: FIXED_DATE }).html,
  })
  const one = build(north.design)
  const two = build(other)
  assert.ok(one.book.includes('Space Grotesk 700 sets the headings'))
  assert.ok(two.book.includes('Fraunces 600 sets the headings'))
  assert.ok(one.deck.includes('Space Grotesk 700 sets the headings'))
  assert.ok(two.deck.includes('Work Sans 400 sets the text'))
  assert.ok(two.kit.includes('Fraunces 600 sets the headings'))
  assert.ok(!two.kit.includes('The everyday deserves a little extra thought'))
})

test('the layouts keep their specimens: Monograph, Atlas, Presentation, Poster and Grid all carry the sentence', () => {
  const design = SAMPLES.northbeam.design
  for (const template of ['monograph', 'atlas']) {
    const html = buildDesignSystemBook(design, { projectName: 'Northbeam', date: FIXED_DATE, template })
    assert.ok(html.includes('Space Grotesk 700 sets the headings'), `${template} book`)
  }
  for (const template of ['presentation', 'poster', 'grid']) {
    const html = buildBrandGuidelines(design, { projectName: 'Northbeam', date: FIXED_DATE, template })
    assert.ok(html.includes('Space Grotesk 700 sets the headings'), `${template} guidelines`)
  }
})

test('the UI kit specimen sets its wordmark in a pair at 4.5:1 or above', () => {
  const pale = { palette: { base: '#F2E8A0', colors: ['#F2E8A0', '#E8C1D9', '#D9E8A0', '#F4F1EA', '#2A2A2E'] } }
  for (const design of [SAMPLES.northbeam.design, pale]) {
    const sel = kitSelections(design, { tier: 'free', projectName: 'Lumen' })
    const slot = Object.fromEntries(sel.palette.map((p) => [p.id, p]))
    const html = renderUiKit(design, { tier: 'free', template: readKitTemplate(), date: FIXED_DATE }).html
    const nav = /\.website-nav \.wordmark\{color:([^}]+)\}/.exec(html)[1]
    const art = /\.website-art \.wordmark\{color:([^}]+)\}/.exec(html)[1]
    const navInk = nav === 'var(--color-pine)' ? slot.pine.hex : slot.ink.hex
    const artInk = art === 'var(--color-pine)' ? slot.pine.hex : sel.palette.find((p) => p.id === 'citron').hex
    assert.ok(contrast(navInk, slot.chalk.hex) >= 4.5, 'the nav wordmark reads on the canvas')
    if (art === 'var(--color-pine)') assert.ok(contrast(artInk, slot.citron.hex) >= 4.5, 'the art wordmark reads on the accent')
    else assert.equal(art, 'var(--on-citron)')
  }
})

// renderAll() builds each document's default layout only. The alphabet guard has to hold
// for every layout a person can choose, or putting it back into Monograph, Atlas, Poster,
// Grid or a kit layout would pass unseen.
function everyLayout() {
  const design = SAMPLES.northbeam.design
  const out = {}
  for (const template of ['specification', 'monograph', 'atlas']) {
    out[`book/${template}`] = buildDesignSystemBook(design, { projectName: 'Northbeam', date: FIXED_DATE, template })
  }
  for (const template of ['presentation', 'poster', 'grid']) {
    out[`guidelines/${template}`] = buildBrandGuidelines(design, { projectName: 'Northbeam', date: FIXED_DATE, template })
  }
  for (const layout of ['studio', 'manual', 'showcase']) {
    out[`kit/${layout}`] = renderUiKit(design, { tier: 'free', template: readKitTemplate(`src/templates/kit/${layout}.html`), date: FIXED_DATE }).html
  }
  return out
}

test('no layout of any document holds the alphabet outside a glyph strip', () => {
  const docs = everyLayout()
  assert.equal(Object.keys(docs).length, 9)
  for (const [key, html] of Object.entries(docs)) {
    const rest = html.replace(STRIP, '')
    assert.ok(!rest.includes(UPPER), `${key} sets the alphabet outside a glyph strip`)
    assert.ok(!rest.includes('abcdefghijklmnopqrstuvwxyz'), `${key} sets the lowercase alphabet outside a glyph strip`)
  }
})

test('every layout that sets a face prints its glyph strip, and each strip is 9pt or smaller', () => {
  for (const [key, html] of Object.entries(everyLayout())) {
    // The manual kit layout has no strip slot at all (src/templates/kit/manual.html): it prints no alphabet either, which the test above proves.
    if (key === 'kit/manual') continue
    const strips = html.match(STRIP) || []
    assert.ok(strips.length >= 1, `${key} has no glyph strip`)
    for (const strip of strips) {
      const pt = Number(/font-size:([\d.]+)pt/.exec(strip)?.[1])
      assert.ok(pt > 0 && pt <= 9, `${key} has a strip at ${pt}pt`)
    }
  }
})
