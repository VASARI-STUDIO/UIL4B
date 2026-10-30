// The page strip under a Pro row follows the chosen template: its cache key, its
// caption and its pictures. The key, the caption and the layouts are plain functions
// (utils/proPreviewKey.js, utils/proPreviewTemplates.js), so they run here without a
// browser; the component is only checked for using them.
//
// To see these fail: in src/utils/proPreviewKey.js drop `previewTemplate(kind, template)`
// from previewKey (the key tests fail), or change the caption's `in` (the caption tests fail).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EXPORT_TEMPLATES, defaultTemplate } from '../../src/config/exportTemplates.js'
import { PREVIEW_PAGE_COUNT, previewCaption, previewKey, previewTemplate } from '../../src/utils/proPreviewKey.js'
import { buildBookPreviewPages, buildGuidelinesPreviewPages, BOOK_PAGE, GUIDELINES_PAGE } from '../../src/utils/proPreviews.js'
import { buildTemplatePreviewPages } from '../../src/utils/proPreviewTemplates.js'

const design = {
  palette: { colors: ['#1F6FEB', '#F2B134', '#E5484D', '#F7F5F0', '#16181D'], base: '#1F6FEB' },
  fonts: { heading: { family: 'Fraunces' }, body: { family: 'Inter' } },
  typeScale: { headingWeight: 600 },
}
const base = { design, projectName: 'Northside Community Legal Centre', blurred: true }
const rows = Object.keys(EXPORT_TEMPLATES).filter((kind) => kind === 'book' || kind === 'guidelines')
const sizeOf = { book: BOOK_PAGE, guidelines: GUIDELINES_PAGE }
const live = (kind) => EXPORT_TEMPLATES[kind].filter((t) => t.live)

test('the cache key changes with the template, for every template of both rows', () => {
  for (const kind of rows) {
    const keys = live(kind).map((t) => previewKey({ ...base, kind, template: t.id }))
    assert.equal(new Set(keys).size, keys.length, `${kind}: each template needs its own cache entry`)
    keys.forEach((key, i) => assert.ok(key.includes(`|${live(kind)[i].id}|`), `${kind}: the key names ${live(kind)[i].id}`))
  }
})

test('the key still follows the blur and the design, and is steady for the same inputs', () => {
  const a = previewKey({ ...base, kind: 'book', template: 'monograph' })
  assert.equal(previewKey({ ...base, kind: 'book', template: 'monograph' }), a)
  assert.notEqual(previewKey({ ...base, kind: 'book', template: 'monograph', blurred: false }), a, 'a Pro account never reads a Free entry')
  assert.notEqual(previewKey({ ...base, kind: 'book', template: 'monograph', projectName: 'Other' }), a)
  const recoloured = { ...design, palette: { ...design.palette, colors: ['#000000', ...design.palette.colors.slice(1)] } }
  assert.notEqual(previewKey({ ...base, kind: 'book', template: 'monograph', design: recoloured }), a)
  const g = previewKey({ ...base, kind: 'guidelines', template: 'grid' })
  for (const typeScale of [{ ...design.typeScale, base: 18 }, { ...design.typeScale, ratio: 1.5 }]) {
    assert.notEqual(previewKey({ ...base, kind: 'guidelines', template: 'grid', design: { ...design, typeScale } }), g, 'the type ladder is drawn, so the scale is in the key')
  }
  const logo = (src) => previewKey({ ...base, kind: 'guidelines', template: 'poster', design: { ...design, logo: { src } } })
  assert.notEqual(logo('data:image/png;base64,AAAA'), logo('data:image/png;base64,BBBB'), 'two logos of one length are two entries')
})

test('no template, or one the row does not offer, is the row\'s default and shares its entry', () => {
  for (const kind of rows) {
    const def = previewKey({ ...base, kind, template: defaultTemplate(kind) })
    for (const bad of [undefined, null, '', 'nope', 7, {}, ['atlas'], 'studio']) {
      assert.equal(previewKey({ ...base, kind, template: bad }), def, `${kind}: ${JSON.stringify(bad)} draws the default`)
    }
  }
  assert.equal(previewTemplate('book', 'poster'), 'specification', 'a guidelines template is not a book template')
  assert.equal(previewTemplate('guidelines', 'atlas'), 'presentation')
})

test('the caption names the template and the unit: pages for the book, slides for the deck', () => {
  assert.equal(previewCaption('book', 'monograph'), 'Your book in Monograph, pages 1 to 3')
  assert.equal(previewCaption('book', 'atlas'), 'Your book in Atlas, pages 1 to 3')
  assert.equal(previewCaption('book', 'specification'), 'Your book in Specification, pages 1 to 3')
  assert.equal(previewCaption('guidelines', 'poster'), 'Your guidelines in Poster, slides 1 to 3')
  assert.equal(previewCaption('guidelines', 'grid'), 'Your guidelines in Grid, slides 1 to 3')
  assert.equal(previewCaption('guidelines', undefined), 'Your guidelines in Presentation, slides 1 to 3', 'no choice reads as the default')
  assert.equal(PREVIEW_PAGE_COUNT, 3)
})

test('every live template of both rows has a caption with its own name', () => {
  for (const kind of rows) {
    for (const t of live(kind)) assert.match(previewCaption(kind, t.id), new RegExp(` in ${t.name}, `))
  }
})

/* ── the pictures ─────────────────────────────────────────────────────────── */

const texts = (pages) => pages.flatMap((p) => p.ops.filter((o) => o.op === 'text').map((o) => o.text))
const fills = (page) => new Set(page.ops.filter((o) => o.op === 'rect').map((o) => o.fill))
const boxOf = (o) => (o.op === 'line' ? [o.x1, o.y1, o.x2, o.y2] : [o.x, o.y, o.x + (o.w || 0), o.y + (o.h || 0)])

for (const kind of rows) {
  for (const t of live(kind).filter((x) => !x.default)) {
    test(`${kind} ${t.id}: three pages at the row's size, from the user's own colours and name`, () => {
      const size = sizeOf[kind]
      const pages = buildTemplatePreviewPages(kind, t.id, design, { projectName: 'Harbour', size })
      assert.equal(pages.length, PREVIEW_PAGE_COUNT)
      for (const p of pages) {
        assert.equal(p.width, size.width)
        assert.equal(p.height, size.height)
        assert.ok(p.id && p.title, 'each page is named for its alt text')
        // A cover is a ground, the name and (Monograph) a square of the seed colour: three
        // operations is a whole page, so the floor is three, not "more than three".
        assert.ok(p.ops.length >= 3, `${p.id} has content`)
        assert.ok(p.ops.some((o) => o.op === 'text'), `${p.id} sets some text`)
        // The first operation is the ground: one rect over the page, or (Atlas's cover) the
        // first full-height band, with the bands together reaching the right edge.
        const ground = p.ops[0]
        const rects = p.ops.filter((o) => o.op === 'rect')
        assert.ok(ground.op === 'rect' && ground.x === 0 && ground.y === 0 && ground.h === size.height, `${p.id} starts with a ground at the top left, page high`)
        assert.ok(Math.max(...rects.map((o) => o.x + o.w)) >= size.width, `${p.id}: the ground reaches the right edge`)
      }
      assert.ok(texts(pages).includes('Harbour'), 'the name is set on the cover')
      const seed = new Set(pages.flatMap((p) => [...fills(p)]))
      assert.ok(seed.has('#1F6FEB'), 'the seed colour is painted')
      assert.ok(pages.some((p) => p.ops.some((o) => o.op === 'text' && /Fraunces/.test(o.font))), 'the heading face is the user\'s own')
    })

    test(`${kind} ${t.id}: nothing is drawn outside its page, with 1 and 13 colours and a long name`, () => {
      const size = sizeOf[kind]
      const long = 'Northside Community Legal Centre and Family Mediation Service of Greater Western Sydney'
      const many = Array.from({ length: 13 }, (_, i) => `#${(0x1f6feb + i * 0x0a0b0c).toString(16).padStart(6, '0').toUpperCase().slice(-6)}`)
      for (const colors of [['#1F6FEB'], many, []]) {
        const d = { ...design, palette: { colors, base: colors[0] } }
        const pages = buildTemplatePreviewPages(kind, t.id, d, { projectName: long, size })
        assert.equal(pages.length, PREVIEW_PAGE_COUNT)
        for (const p of pages) {
          for (const o of p.ops.filter((x) => x.op !== 'text' && x.op !== 'image')) {
            const [x0, y0, x1, y1] = boxOf(o)
            assert.ok(x0 >= -1 && y0 >= -1 && x1 <= size.width + 2 && y1 <= size.height + 2, `${t.id} ${p.id}: ${o.op} ${[x0, y0, x1, y1].map(Math.round)} leaves the ${size.width}x${size.height} page`)
          }
        }
      }
    })
  }
}

test('the two templates of a row look different from each other and from the default', () => {
  for (const kind of rows) {
    const make = {
      book: (id) => (id === 'specification' ? buildBookPreviewPages(design, { projectName: 'Harbour' }) : buildTemplatePreviewPages(kind, id, design, { projectName: 'Harbour', size: BOOK_PAGE })),
      guidelines: (id) => (id === 'presentation' ? buildGuidelinesPreviewPages(design, { projectName: 'Harbour' }) : buildTemplatePreviewPages(kind, id, design, { projectName: 'Harbour', size: GUIDELINES_PAGE })),
    }[kind]
    const covers = live(kind).map((t) => JSON.stringify(make(t.id)[0].ops))
    assert.equal(new Set(covers).size, covers.length, `${kind}: every template has its own cover`)
  }
})

test('the default templates, and any id that is not a template, are left to proPreviews.js', () => {
  const size = BOOK_PAGE
  assert.equal(buildTemplatePreviewPages('book', 'specification', design, { size }), null)
  assert.equal(buildTemplatePreviewPages('guidelines', 'presentation', design, { size: GUIDELINES_PAGE }), null)
  assert.equal(buildTemplatePreviewPages('book', 'poster', design, { size }), null)
  assert.equal(buildTemplatePreviewPages('kit', 'studio', design, { size }), null)
  assert.equal(buildTemplatePreviewPages('book', 'monograph', design, {}), null, 'no page box, nothing to draw')
})

test('a name that only exists on Object.prototype is not a template or a row', () => {
  for (const kind of ['__proto__', 'constructor', 'toString']) {
    assert.equal(buildTemplatePreviewPages(kind, 'monograph', design, { size: BOOK_PAGE }), null, `row ${kind}`)
  }
  for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(buildTemplatePreviewPages('book', id, design, { size: BOOK_PAGE }), null, `book template ${id}`)
    assert.equal(buildTemplatePreviewPages('guidelines', id, design, { size: GUIDELINES_PAGE }), null, `guidelines template ${id}`)
  }
})

test('the logo is drawn on the guidelines covers that carry one, and a book never asks for it', () => {
  const logo = { src: 'data:image/svg+xml;base64,AAAA' }
  for (const id of ['poster', 'grid']) {
    const withLogo = buildTemplatePreviewPages('guidelines', id, design, { projectName: 'Harbour', logo, size: GUIDELINES_PAGE })
    assert.ok(withLogo[0].ops.some((o) => o.op === 'image'), `${id}: the cover holds the mark`)
    const without = buildTemplatePreviewPages('guidelines', id, design, { projectName: 'Harbour', size: GUIDELINES_PAGE })
    assert.ok(!without[0].ops.some((o) => o.op === 'image'), `${id}: no mark, no picture slot`)
  }
})

/* ── the component and the panel ──────────────────────────────────────────── */

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('the strip is drawn for every template: the dialog passes the chosen one and keeps no default-only gate', () => {
  const steps = read('src/components/export/ExportSteps.jsx')
  // The one default is the book as PNG pages, which has a single layout (the
  // Layout step says so); every other file passes the template picked for its list.
  assert.equal(steps.match(/defaultTemplate\(/g)?.length, 1, 'the strip no longer hides for a non-default template')
  assert.match(steps, /const template = file === 'book-png' \? defaultTemplate\('book'\) : chosen\[cat\.layouts\]/)
  assert.match(steps, /<ExportProPreview[^>]*\btemplate=\{template\}/s)
  assert.doesNotMatch(steps, /template === defaultTemplate|=== defaultTemplate\(/, 'the strip is gated on the default template')
})

test('the strip component keys its cache and writes its caption through the shared functions', () => {
  const src = read('src/components/ExportProPreview.jsx')
  assert.match(src, /previewKey\(\{[^}]*\btemplate\b/)
  assert.match(src, /previewCaption\(kind, template\)/)
  assert.match(src, /renderProPreviews\(design, kind, \{[^}]*\btemplate\b/)
})
