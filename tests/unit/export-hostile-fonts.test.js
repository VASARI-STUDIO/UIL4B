// A font weight or family is printed raw into style attributes, <dd> cells and
// <style> blocks of the Pro documents, and the panel opens those documents as
// same-origin blobs. So a hostile value must never come out as markup.
//
// The strongest statement available: a design carrying hostile fonts must produce
// the SAME document as a design with no fonts at all (the defaults), because every
// hostile value is refused and replaced. If a payload leaked anywhere, the two
// documents would differ.
//
// To see each fail: remove the safeWeight() calls in readDesign() in
// src/utils/styleGuideExport.js (weights leak), loosen the family pattern in
// safeFamily() (families leak), or remove pickFont() from pickDesign() in
// api/_lib/exportDocument.js (the server-boundary test fails).
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { safeWeight, safeFamily } from '../../src/utils/styleGuideExport.js'
import { serveExportDocument } from '../../api/_lib/exportDocument.js'

const COLOURS = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540']
const WHEN = new Date('2026-01-01T00:00:00Z')
const OPTS = { projectName: 'Acme', date: WHEN }

const BAD_WEIGHT = '700"><img src=x onerror=alert(1)>'
const BAD_FAMILY = "X';}</style><script>alert(1)</script><style>a{--x:'"

const designWith = (fonts, typeScale = {}) => ({
  palette: { base: COLOURS[0], colors: COLOURS },
  fonts,
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5, ...typeScale },
})

const HOSTILE = designWith(
  { heading: { family: BAD_FAMILY, weight: BAD_WEIGHT }, body: { family: BAD_FAMILY, weight: BAD_WEIGHT } },
  { headingWeight: BAD_WEIGHT },
)
const PLAIN = designWith({})

const GENERATORS = [
  ['book', buildDesignSystemBook],
  ['guidelines', buildBrandGuidelines],
]

for (const [name, build] of GENERATORS) {
  test(`${name}: a hostile weight and family come out as the defaults, never as markup`, () => {
    const html = build(HOSTILE, OPTS)
    assert.ok(!/<img/i.test(html), 'a raw <img leaked')
    assert.ok(!/<script/i.test(html), 'a raw <script leaked')
    assert.ok(!/onerror/i.test(html), 'an event handler leaked')
    assert.ok(!html.includes('alert(1)'), 'the payload text leaked')
    assert.equal(build(PLAIN, OPTS), html, 'the hostile design did not collapse to the default document')
    const styleCloses = (h) => (h.match(/<\/style>/gi) || []).length
    assert.equal(styleCloses(html), styleCloses(build(PLAIN, OPTS)), 'an extra </style> appeared')
    const quotes = (h) => (h.match(/'/g) || []).length
    assert.equal(quotes(html), quotes(build(PLAIN, OPTS)), 'the quote balance changed')
  })

  test(`${name}: a valid weight of 600 survives`, () => {
    const html = build(designWith({ heading: { family: 'Space Grotesk', weight: 600 }, body: { family: 'Inter', weight: 300 } }), OPTS)
    assert.match(html, /font-weight:600/)
    assert.match(html, /font-weight:300/)
    assert.match(html, /Space Grotesk/)
  })

  test(`${name}: the type scale's own heading weight is coerced too`, () => {
    const html = build(designWith({}, { headingWeight: BAD_WEIGHT }), OPTS)
    assert.equal(html, build(PLAIN, OPTS))
    assert.match(build(designWith({}, { headingWeight: '500' }), OPTS), /font-weight:500/)
  })
}

test('safeWeight keeps only 100 to 900 in steps of 100', () => {
  for (const ok of [100, 400, '600', 900]) assert.equal(safeWeight(ok), Number(ok))
  for (const bad of [0, 50, 650, 1000, -400, 400.5, NaN, null, undefined, '', 'bold', BAD_WEIGHT, {}]) {
    assert.equal(safeWeight(bad), null, `accepted ${String(bad)}`)
  }
})

test('safeFamily keeps letters, digits, space, hyphen, underscore and period up to 80 characters', () => {
  for (const ok of ['Inter', 'Space Grotesk', 'IBM Plex Sans-2', 'a_b.c', 'x'.repeat(80)]) assert.equal(safeFamily(ok), ok)
  for (const bad of ['', "O'Neil", 'a"b', 'a;b', 'a<b', 'a\\b', 'a/b', 'x'.repeat(81), null, 7, {}, BAD_FAMILY]) {
    assert.equal(safeFamily(bad), null, `accepted ${String(bad)}`)
  }
})

test('the server boundary cleans the fonts before any generator sees them', async () => {
  let seen
  const builders = { book: async () => (design) => { seen = design; return '<html></html>' } }
  const res = {
    headers: {},
    setHeader(k, v) { res.headers[k] = v },
    status(code) { res.code = code; return res },
    json(body) { res.body = body; return res },
  }
  await serveExportDocument(
    { headers: { authorization: 'Bearer t' }, body: { format: 'book', projectName: 'Acme', design: HOSTILE } },
    res,
    {
      verifyIdToken: async () => ({ uid: 'p' }),
      readUser: async () => ({ subscription: { status: 'active', currentPeriodEnd: Date.now() + 86_400_000 } }),
      builders,
    },
  )
  assert.equal(res.code, 200, JSON.stringify(res.body))
  const text = JSON.stringify(seen)
  assert.ok(!text.includes('onerror') && !text.includes('<script') && !text.includes('<img'), 'a payload crossed the boundary')
  assert.equal(seen.fonts.heading.weight, undefined)
  assert.equal(seen.fonts.heading.family, undefined)
  assert.equal(seen.typeScale.headingWeight, undefined)
})
